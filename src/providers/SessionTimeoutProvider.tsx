// SessionTimeoutProvider — Enforces org-configured session inactivity timeout.
//
// • Reads sessionTimeoutMinutes from organizations/{orgId}.security
// • Listens to mouse/keyboard/touch/scroll events — resets timer on activity
// • Shows a 60-second countdown warning modal before logout
// • Signs the user out via Firebase Auth on timeout

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, LogOut, RefreshCw } from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────
const FALLBACK_TIMEOUT_MS = 30 * 60_000; // 30 min if org setting missing
const WARNING_BEFORE_MS   = 60_000;       // Show warning 60s before logout
const ACTIVITY_THROTTLE   = 30_000;       // Throttle resets to once per 30s

// ── Context (optional — lets pages call resetTimer() if needed) ──────────────
interface SessionTimeoutContextValue {
  resetTimer: () => void;
}
const SessionTimeoutContext = createContext<SessionTimeoutContextValue>({ resetTimer: () => {} });
export const useSessionTimeout = () => useContext(SessionTimeoutContext);

// ── Provider ─────────────────────────────────────────────────────────────────
export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userProfile, logout } = useAuth();

  const [timeoutMs, setTimeoutMs]   = useState(FALLBACK_TIMEOUT_MS);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const mainRef      = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const warnRef      = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastResetRef = useRef<number>(0);

  // ── Load org setting ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!userProfile?.organizationId) return;
    getDoc(doc(db, "organizations", userProfile.organizationId))
      .then((snap) => {
        if (!snap.exists()) return;
        const mins = snap.data()?.security?.sessionTimeoutMinutes;
        if (typeof mins === "number" && mins > 0) {
          setTimeoutMs(mins * 60_000);
        }
      })
      .catch(() => {/* use default */});
  }, [userProfile?.organizationId]);

  // ── Clear all timers ───────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    if (mainRef.current)      clearTimeout(mainRef.current);
    if (warnRef.current)      clearTimeout(warnRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    mainRef.current = warnRef.current = countdownRef.current = null;
  }, []);

  // ── Sign out ───────────────────────────────────────────────────────────────
  const doLogout = useCallback(async () => {
    clearAll();
    setShowWarning(false);
    try { await logout(); } catch { /* ignore */ }
  }, [clearAll, logout]);

  // ── (Re)start inactivity timers ────────────────────────────────────────────
  const startTimers = useCallback(() => {
    clearAll();
    setShowWarning(false);

    // Warning fires WARNING_BEFORE_MS before the hard logout
    const warningDelay = timeoutMs - WARNING_BEFORE_MS;
    if (warningDelay > 0) {
      warnRef.current = setTimeout(() => {
        setShowWarning(true);
        let secs = Math.floor(WARNING_BEFORE_MS / 1000);
        setSecondsLeft(secs);
        countdownRef.current = setInterval(() => {
          secs -= 1;
          setSecondsLeft(secs);
          if (secs <= 0) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
        }, 1000);
      }, warningDelay);
    }

    mainRef.current = setTimeout(doLogout, timeoutMs);
  }, [clearAll, doLogout, timeoutMs]);

  // ── Start / stop based on auth state + timeout setting ────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      startTimers();
    } else {
      clearAll();
      setShowWarning(false);
    }
    return clearAll;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, timeoutMs]);

  // ── Listen for user activity (throttled) ──────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastResetRef.current > ACTIVITY_THROTTLE) {
        lastResetRef.current = now;
        startTimers();
      }
    };
    const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;
    EVENTS.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    return () => EVENTS.forEach((e) => window.removeEventListener(e, handleActivity));
  }, [isAuthenticated, startTimers]);

  return (
    <SessionTimeoutContext.Provider value={{ resetTimer: startTimers }}>
      {children}
      {showWarning && isAuthenticated && (
        <SessionWarningModal
          secondsLeft={secondsLeft}
          timeoutMinutes={Math.round(timeoutMs / 60_000)}
          onStay={() => { lastResetRef.current = Date.now(); startTimers(); }}
          onLogout={doLogout}
        />
      )}
    </SessionTimeoutContext.Provider>
  );
}

// ── Warning modal ─────────────────────────────────────────────────────────────
function SessionWarningModal({
  secondsLeft,
  timeoutMinutes,
  onStay,
  onLogout,
}: {
  secondsLeft: number;
  timeoutMinutes: number;
  onStay: () => void;
  onLogout: () => void;
}) {
  const pct = (secondsLeft / 60) * 100;
  const color = secondsLeft <= 10 ? "#ef4444" : secondsLeft <= 30 ? "#f59e0b" : "#7c3aed";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-border p-7 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          {/* Countdown ring */}
          <div className="relative w-20 h-20">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke={color}
                strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - pct / 100)}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Clock className="w-7 h-7" style={{ color }} />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-foreground">Session Expiring</h2>
            <p className="text-sm text-muted-foreground mt-1">
              No activity detected for {timeoutMinutes} {timeoutMinutes === 1 ? "minute" : "minutes"}.
              You will be signed out in:
            </p>
          </div>

          <div
            className="text-5xl font-mono font-bold tabular-nums"
            style={{ color }}
          >
            {secondsLeft}s
          </div>

          <p className="text-[11px] text-muted-foreground px-2">
            Any unsaved work will still be available after signing back in.
          </p>

          <div className="flex gap-3 w-full mt-1">
            <button
              onClick={onLogout}
              className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out now
            </button>
            <button
              onClick={onStay}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Stay logged in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
