// PasswordExpiryProvider — Enforces org-configured password expiration policy.
//
// • Reads passwordExpirationDays from organizations/{orgId}.security
// • Reads passwordChangedAt from users/{uid} (Firestore timestamp)
// • If password is expired → renders a blocking "Change Password" modal
// • The modal cannot be dismissed — user must change password or sign out
// • After a successful change: updates passwordChangedAt in Firestore

import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, ShieldCheck, Loader2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function PasswordExpiryProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, userProfile, logout } = useAuth();
  const [expired, setExpired] = useState(false);
  const [daysOverdue, setDaysOverdue] = useState(0);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !userProfile?.uid || !userProfile?.organizationId) return;

    let cancelled = false;

    (async () => {
      try {
        // 1. Get org policy
        const orgSnap = await getDoc(doc(db, "organizations", userProfile.organizationId));
        const expirationDays = orgSnap.data()?.security?.passwordExpirationDays as number | null | undefined;
        if (!expirationDays) return; // null / undefined = never expire

        // 2. Get user's passwordChangedAt
        const userSnap = await getDoc(doc(db, "users", userProfile.uid));
        const changedAt = userSnap.data()?.passwordChangedAt;

        if (!changedAt) {
          // First time — stamp it now so the clock starts today
          await updateDoc(doc(db, "users", userProfile.uid), {
            passwordChangedAt: serverTimestamp(),
          });
          return;
        }

        // 3. Calculate days since last change
        const changedDate: Date =
          typeof changedAt?.toDate === "function"
            ? changedAt.toDate()
            : new Date(changedAt);

        const daysSince = (Date.now() - changedDate.getTime()) / (1000 * 60 * 60 * 24);

        if (!cancelled && daysSince >= expirationDays) {
          setExpired(true);
          setDaysOverdue(Math.floor(daysSince - expirationDays));
        }
      } catch (err) {
        console.error("[PasswordExpiry] check failed:", err);
      }
    })();

    return () => { cancelled = true; };
  }, [isLoading, isAuthenticated, userProfile?.uid, userProfile?.organizationId]);

  const handlePasswordChanged = async () => {
    if (!userProfile?.uid) return;
    try {
      await updateDoc(doc(db, "users", userProfile.uid), {
        passwordChangedAt: serverTimestamp(),
      });
      setExpired(false);
      toast.success("Password updated — your session is now active.");
    } catch (err) {
      console.error("[PasswordExpiry] failed to stamp passwordChangedAt:", err);
    }
  };

  return (
    <>
      {children}
      {expired && isAuthenticated && (
        <ForcePasswordChangeModal
          daysOverdue={daysOverdue}
          onChanged={handlePasswordChanged}
          onLogout={logout}
        />
      )}
    </>
  );
}

// ── Force Password Change Modal ───────────────────────────────────────────────
// Non-dismissible — user must change password or sign out.
function ForcePasswordChangeModal({
  daysOverdue,
  onChanged,
  onLogout,
}: {
  daysOverdue: number;
  onChanged: () => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const validate = (): string | null => {
    if (!currentPw) return "Please enter your current password.";
    if (newPw.length < 8) return "New password must be at least 8 characters.";
    if (newPw === currentPw) return "New password must be different from your current password.";
    if (newPw !== confirmPw) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("Session expired — please sign in again.");

      // Reauthenticate first
      const credential = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, credential);

      // Change password
      await updatePassword(user, newPw);

      // Stamp the change date in Firestore
      await onChanged();
    } catch (err: any) {
      const code: string = err?.code ?? "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Current password is incorrect. Please try again.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else if (code === "auth/requires-recent-login") {
        setError("Session is too old. Please sign out and sign back in to change your password.");
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  // Strength meter
  const strength = (() => {
    if (!newPw) return 0;
    let s = 0;
    if (newPw.length >= 8)  s++;
    if (newPw.length >= 12) s++;
    if (/[A-Z]/.test(newPw)) s++;
    if (/[0-9]/.test(newPw)) s++;
    if (/[^A-Za-z0-9]/.test(newPw)) s++;
    return s;
  })();
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"][strength] ?? "";
  const strengthColor = ["", "#ef4444", "#f59e0b", "#eab308", "#22c55e", "#16a34a"][strength] ?? "#e5e7eb";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-border p-7 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-foreground">Password Change Required</h2>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              Your password has expired
              {daysOverdue > 0 ? ` (${daysOverdue} ${daysOverdue === 1 ? "day" : "days"} overdue)` : ""}.
              Please set a new password to continue.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current password */}
          <Field
            label="Current password"
            value={currentPw}
            onChange={setCurrentPw}
            show={showCurrent}
            onToggleShow={() => setShowCurrent((v) => !v)}
            autoComplete="current-password"
          />

          {/* New password */}
          <Field
            label="New password"
            value={newPw}
            onChange={setNewPw}
            show={showNew}
            onToggleShow={() => setShowNew((v) => !v)}
            autoComplete="new-password"
          />

          {/* Strength indicator */}
          {newPw.length > 0 && (
            <div className="-mt-2">
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-colors duration-300"
                    style={{ background: i <= strength ? strengthColor : "#e5e7eb" }}
                  />
                ))}
              </div>
              <p className="text-[11px] font-medium mt-1" style={{ color: strengthColor }}>
                {strengthLabel}
              </p>
            </div>
          )}

          {/* Confirm password */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
              placeholder="Re-enter new password"
              className={cn(
                "mt-1 w-full h-10 px-3 rounded-xl border text-[13px] bg-background text-foreground outline-none transition-colors",
                confirmPw && confirmPw !== newPw
                  ? "border-red-400 focus:border-red-500"
                  : "border-border focus:border-primary"
              )}
            />
            {confirmPw && confirmPw !== newPw && (
              <p className="text-[11px] text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-[12px] text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Requirements */}
          <ul className="text-[11px] text-muted-foreground space-y-0.5 pl-1">
            {[
              ["At least 8 characters", newPw.length >= 8],
              ["Different from current password", newPw.length > 0 && newPw !== currentPw],
              ["Passwords match", confirmPw.length > 0 && newPw === confirmPw],
            ].map(([label, met]) => (
              <li key={label as string} className="flex items-center gap-1.5">
                <span style={{ color: met ? "#22c55e" : "#9ca3af" }}>
                  {met ? "✓" : "○"}
                </span>
                <span className={met ? "text-foreground" : ""}>{label as string}</span>
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
            <button
              type="submit"
              disabled={saving || !currentPw || !newPw || newPw !== confirmPw}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
              ) : (
                <><ShieldCheck className="w-4 h-4" /> Update password</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Password field with show/hide toggle ──────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className="w-full h-10 px-3 pr-10 rounded-xl border border-border bg-background text-[13px] text-foreground outline-none focus:border-primary transition-colors"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
