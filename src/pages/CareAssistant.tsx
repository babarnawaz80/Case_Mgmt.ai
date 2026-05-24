// CareAssistant — Public AI companion for individuals
// Route: /care-assistant/:linkToken
// Voice-first UX:
//   1. Page loads → AI fetches + speaks greeting by name
//   2. Mic auto-starts after AI finishes speaking
//   3. Individual speaks → transcript → API → AI speaks → mic restarts
//   4. Orb = pause/resume toggle
//   5. Text input at bottom as fallback

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, Loader2, ShieldCheck, AlertTriangle, Phone, Pause, Play } from "lucide-react";
import logo from "@/assets/casemanagement-ai-logo.png";
import { useIndividual } from "@/hooks/useIndividuals";
import SiriOrb from "@/components/ui/siri-orb";

const API_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";

/** Decodes cmp_<base64(individualId_timestamp)> → individualId */
function decodeToken(token: string | undefined): string | null {
  if (!token) return null;
  const raw = token.startsWith("cmp_") ? token.slice(4) : token;
  try {
    const decoded = atob(raw);
    const underscoreIdx = decoded.lastIndexOf("_");
    return underscoreIdx > 0 ? decoded.slice(0, underscoreIdx) : decoded;
  } catch {
    return null;
  }
}

type Role = "agent" | "user";
interface Message {
  id: string;
  role: Role;
  text: string;
  ts: Date;
  urgent?: boolean;
}

// Siri-style TTS using Web Speech API
function speak(text: string, onEnd?: () => void): SpeechSynthesisUtterance | null {
  if (!("speechSynthesis" in window)) {
    onEnd?.();
    return null;
  }
  window.speechSynthesis.cancel(); // stop any current speech
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1.05;
  utter.volume = 1;

  // Pick the best available voice — prefer a warm female English voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      (v.name.includes("Samantha") ||
        v.name.includes("Karen") ||
        v.name.includes("Moira") ||
        v.name.includes("Tessa") ||
        v.name.includes("Google US English") ||
        v.name.includes("Female"))
  ) || voices.find((v) => v.lang.startsWith("en")) || voices[0];

  if (preferred) utter.voice = preferred;
  utter.onend = () => onEnd?.();
  utter.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utter);
  return utter;
}

// Speech recognition type shim
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

type VoiceState = "idle" | "greeting" | "speaking" | "listening" | "thinking" | "paused";

export default function CareAssistant() {
  const { linkToken } = useParams<{ linkToken: string }>();
  const personId = decodeToken(linkToken);
  const { individual: person, loading } = useIndividual(personId ?? undefined);
  const firstName = person?.preferred_name || person?.first_name || "Friend";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(`session_${Date.now()}`);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [started, setStarted] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const pausedRef = useRef(false); // track pause state without re-render loops

  const hasSpeechSynth = "speechSynthesis" in window;
  const hasSpeechRec =
    "webkitSpeechRecognition" in window || "SpeechRecognition" in window;

  // Scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, voiceState]);

  // ── Start mic listening ────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!hasSpeechRec || pausedRef.current) return;
    const SpeechRec =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.maxAlternatives = 1;

    rec.onstart = () => setVoiceState("listening");

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript.trim();
      if (transcript) {
        handleVoiceInput(transcript);
      }
    };

    rec.onerror = () => {
      // On error just restart listening unless paused
      if (!pausedRef.current) {
        setTimeout(() => startListening(), 1000);
      }
    };

    rec.onend = () => {
      // If listening ended without a result and not paused, restart
      if (!pausedRef.current && voiceState === "listening") {
        setTimeout(() => startListening(), 500);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      // already started — ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSpeechRec]);

  // ── AI speaks, then auto-listens ───────────────────────────────────────────
  const aiSpeakAndListen = useCallback(
    (text: string, urgent?: boolean) => {
      setVoiceState("speaking");
      if (hasSpeechSynth && !pausedRef.current) {
        speak(text, () => {
          if (!pausedRef.current) {
            startListening();
          }
        });
      } else {
        // No TTS — just auto-listen
        if (!pausedRef.current) startListening();
      }
      if (urgent) {
        // Don't auto-listen on urgent — wait for user
      }
    },
    [hasSpeechSynth, startListening]
  );

  // ── Send a message to API ──────────────────────────────────────────────────
  const sendToAPI = useCallback(
    async (text: string) => {
      setVoiceState("thinking");
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE}/care-assistant/${linkToken}/message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, session_id: sessionId }),
          }
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        let replyText: string =
          data.response ?? "I'm here for you. Can you tell me more?";
        const isUrgent = replyText.startsWith("[URGENT]");
        if (isUrgent) replyText = replyText.replace("[URGENT]", "").trim();

        if (data.sessionId) setSessionId(data.sessionId);

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "agent",
            text: replyText,
            ts: new Date(),
            urgent: isUrgent,
          },
        ]);

        aiSpeakAndListen(replyText, isUrgent);
      } catch {
        setError(
          "Couldn't reach your companion right now. Please check your connection."
        );
        setVoiceState("paused");
      }
    },
    [linkToken, sessionId, aiSpeakAndListen]
  );

  // ── Handle voice transcript from mic ──────────────────────────────────────
  const handleVoiceInput = useCallback(
    (transcript: string) => {
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", text: transcript, ts: new Date() },
      ]);
      sendToAPI(transcript);
    },
    [sendToAPI]
  );

  // ── Handle text submit ────────────────────────────────────────────────────
  const handleTextSend = useCallback(() => {
    const text = input.trim();
    if (!text || voiceState === "thinking") return;
    window.speechSynthesis.cancel();
    recognitionRef.current?.stop();
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text, ts: new Date() },
    ]);
    setInput("");
    sendToAPI(text);
  }, [input, voiceState, sendToAPI]);

  // ── Orb click = toggle pause / resume ─────────────────────────────────────
  const togglePause = useCallback(() => {
    if (voiceState === "paused") {
      // Resume
      pausedRef.current = false;
      setVoiceState("listening");
      window.speechSynthesis.cancel();
      startListening();
    } else {
      // Pause
      pausedRef.current = true;
      window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
      setVoiceState("paused");
    }
  }, [voiceState, startListening]);

  // ── Auto-start: fetch greeting as soon as person loads ────────────────────
  useEffect(() => {
    if (!person || started || loading) return;
    setStarted(true);
    setVoiceState("greeting");

    // Preload voices (Chrome needs a kick)
    if (hasSpeechSynth) {
      window.speechSynthesis.getVoices();
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/care-assistant/${linkToken}/message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: "__OPEN__",
              session_id: sessionId,
            }),
          }
        );
        const data = await res.json();
        const text =
          data.response ??
          `Hey ${firstName}! 😊 So great to connect with you today. How are you feeling?`;
        if (data.sessionId) setSessionId(data.sessionId);
        setMessages([
          { id: `a-${Date.now()}`, role: "agent", text, ts: new Date() },
        ]);
        aiSpeakAndListen(text);
      } catch {
        // Fallback greeting — still speak + listen
        const fallback = `Hey ${firstName}! I'm your Care Companion. I'm here for you. How are you doing today?`;
        setMessages([
          { id: "welcome", role: "agent", text: fallback, ts: new Date() },
        ]);
        aiSpeakAndListen(fallback);
      }
    }, 600);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person, started, loading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  // ── Derived display state ─────────────────────────────────────────────────
  const orbAnimDuration =
    voiceState === "listening" ? 4
    : voiceState === "speaking" ? 5
    : voiceState === "thinking" ? 7
    : voiceState === "paused" ? 25
    : 16;

  const statusLabel =
    voiceState === "greeting" ? "Connecting…"
    : voiceState === "speaking" ? "Speaking…"
    : voiceState === "listening" ? "Listening…"
    : voiceState === "thinking" ? "Thinking…"
    : voiceState === "paused" ? "Paused — tap to resume"
    : "Starting…";

  const statusColor =
    voiceState === "listening" ? "#34d399"
    : voiceState === "paused" ? "#94a3b8"
    : voiceState === "thinking" ? "#a78bfa"
    : "#34d399";

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          background: "linear-gradient(160deg,#0d0d1a,#111827)",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <Loader2 style={{ width: 32, height: 32, color: "#6c63ff", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "#9fa8da", fontSize: "0.875rem" }}>Connecting to your companion…</p>
        </div>
        <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
      </div>
    );
  }

  // ── Invalid token ─────────────────────────────────────────────────────────
  if (!person && !loading) {
    return (
      <div
        style={{
          background: "linear-gradient(160deg,#0d0d1a,#111827)",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <img src={logo} alt="CaseManagement AI" style={{ height: 36, margin: "0 auto 1.5rem", display: "block", opacity: 0.8 }} />
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔗</div>
          <h1 style={{ color: "#e8eaf6", fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Link not recognized
          </h1>
          <p style={{ color: "#9fa8da", fontSize: "0.875rem", lineHeight: 1.6 }}>
            This companion link has expired or is no longer active. Please ask your case manager for a new link.
          </p>
        </div>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        background: "linear-gradient(160deg, #0d0d1a 0%, #111827 50%, #0f1628 100%)",
        minHeight: "100dvh",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1.25rem",
          borderBottom: "1px solid rgba(108,99,255,0.15)",
          background: "rgba(13,13,26,0.9)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <img src={logo} alt="CaseManagement AI" style={{ height: 22, opacity: 0.55 }} draggable={false} />
        </div>
        <button
          onClick={() => {
            if (confirm("End your session? Your conversation will be saved for your care team.")) {
              window.speechSynthesis?.cancel();
              recognitionRef.current?.stop();
              fetch(`${API_BASE}/care-assistant/${linkToken}/end-session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session_id: sessionId }),
              }).catch(() => {});
              window.location.reload();
            }
          }}
          style={{
            height: 30,
            padding: "0 0.75rem",
            borderRadius: "0.5rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.22)",
            color: "#f87171",
            fontSize: "0.6875rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            fontFamily: "inherit",
          }}
        >
          <Phone style={{ width: 11, height: 11, transform: "rotate(135deg)" }} />
          End Session
        </button>
      </header>

      {/* ── Orb section ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "1.5rem",
          paddingBottom: "0.75rem",
          flexShrink: 0,
        }}
      >
        {/* Greeting name */}
        <p
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: "0.8125rem",
            fontWeight: 500,
            letterSpacing: "0.04em",
            marginBottom: "0.75rem",
          }}
        >
          AI Case Companion
        </p>

        {/* Orb button — tap to pause/resume */}
        <button
          type="button"
          onClick={togglePause}
          aria-label={voiceState === "paused" ? "Resume conversation" : "Pause conversation"}
          style={{
            position: "relative",
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            outline: "none",
            transition: "transform 0.15s ease",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onTouchStart={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
          onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {/* Pulse ring when listening or speaking */}
          {(voiceState === "listening" || voiceState === "speaking") && (
            <span
              style={{
                position: "absolute",
                inset: -12,
                borderRadius: "50%",
                border: `2px solid ${voiceState === "listening" ? "rgba(52,211,153,0.35)" : "rgba(108,99,255,0.3)"}`,
                animation: "orbRing 1.8s ease-out infinite",
                pointerEvents: "none",
              }}
            />
          )}

          <SiriOrb
            size="240px"
            colors={{
              c1: voiceState === "paused" ? "oklch(60% 0.06 220)" : "oklch(82% 0.18 195)",
              c2: voiceState === "paused" ? "oklch(55% 0.05 260)" : "oklch(78% 0.22 330)",
              c3: voiceState === "paused" ? "oklch(58% 0.07 200)" : "oklch(70% 0.18 280)",
            }}
            animationDuration={orbAnimDuration}
          />

          {/* Pause/Play overlay icon */}
          {voiceState === "paused" ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.3)",
              }}
            >
              <Play style={{ width: 36, height: 36, color: "rgba(255,255,255,0.7)" }} />
            </div>
          ) : null}
        </button>

        {/* Name greeting */}
        <h1
          style={{
            marginTop: "1.25rem",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.02em",
          }}
        >
          Hi {firstName} 👋
        </h1>

        {/* Status pill */}
        <div
          style={{
            marginTop: "0.625rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.35rem 0.9rem",
            borderRadius: "9999px",
            background: "rgba(52,211,153,0.08)",
            border: `1px solid ${statusColor}33`,
            fontSize: "0.75rem",
            fontWeight: 600,
            color: statusColor,
            transition: "all 0.3s ease",
          }}
        >
          {voiceState !== "paused" && (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: statusColor,
                display: "inline-block",
                animation: voiceState === "listening" || voiceState === "speaking" ? "pulse 1.2s ease infinite" : "none",
              }}
            />
          )}
          {voiceState === "paused" && <Pause style={{ width: 10, height: 10 }} />}
          {statusLabel}
        </div>

        {/* Mic indicator */}
        {voiceState === "listening" && hasSpeechRec && (
          <div
            style={{
              marginTop: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              color: "rgba(255,255,255,0.35)",
              fontSize: "0.6875rem",
            }}
          >
            <Mic style={{ width: 11, height: 11 }} />
            Microphone active — just start speaking
          </div>
        )}
      </div>

      {/* ── Messages ────────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.5rem 1rem 0.5rem",
        }}
      >
        <div style={{ maxWidth: 560, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "0.65rem 1rem",
                    fontSize: "0.875rem",
                    lineHeight: 1.55,
                    borderRadius:
                      m.role === "user"
                        ? "1.1rem 1.1rem 0.25rem 1.1rem"
                        : "1.1rem 1.1rem 1.1rem 0.25rem",
                    background:
                      m.role === "user"
                        ? "#34d399"
                        : m.urgent
                        ? "rgba(245,158,11,0.12)"
                        : "rgba(255,255,255,0.07)",
                    border:
                      m.urgent
                        ? "1.5px solid rgba(245,158,11,0.4)"
                        : m.role === "agent"
                        ? "1px solid rgba(255,255,255,0.1)"
                        : "none",
                    color: m.role === "user" ? "#0d1117" : "#e8eaf6",
                    fontWeight: m.role === "user" ? 500 : 400,
                  }}
                >
                  {m.text}
                  {m.urgent && (
                    <div
                      style={{
                        marginTop: "0.5rem",
                        padding: "0.4rem 0.6rem",
                        background: "rgba(245,158,11,0.1)",
                        borderRadius: "0.5rem",
                        fontSize: "0.75rem",
                        color: "#fcd34d",
                      }}
                    >
                      ⚠️ Your care team has been notified. Call 911 for emergencies · Text 988 for mental health support.
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Thinking dots */}
          {voiceState === "thinking" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", justifyContent: "flex-start" }}
            >
              <div
                style={{
                  padding: "0.65rem 1rem",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "1.1rem 1.1rem 1.1rem 0.25rem",
                  display: "flex",
                  gap: 5,
                  alignItems: "center",
                }}
              >
                {[0, 140, 280].map((d, i) => (
                  <span
                    key={i}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "rgba(108,99,255,0.7)",
                      display: "inline-block",
                      animation: `dotBounce 1.2s ease-in-out ${d}ms infinite`,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: "0.75rem",
                  padding: "0.6rem 0.9rem",
                  color: "#f87171",
                  fontSize: "0.8rem",
                  maxWidth: "90%",
                }}
              >
                <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
                {error}
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Text input (fallback) ────────────────────────────────────────────── */}
      <div
        style={{
          padding: "0.625rem 1rem 1.25rem",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(13,13,26,0.88)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          flexShrink: 0,
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTextSend();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "1rem",
              padding: "0.5rem 0.6rem 0.5rem 1rem",
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                voiceState === "listening"
                  ? "Listening… or type here"
                  : "Or type your message…"
              }
              disabled={voiceState === "thinking"}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#e8eaf6",
                fontSize: "0.875rem",
                fontFamily: "inherit",
              }}
            />
            {/* Mic status */}
            {hasSpeechRec && (
              <div style={{ color: voiceState === "listening" ? "#34d399" : "rgba(255,255,255,0.25)", flexShrink: 0 }}>
                {voiceState === "listening" ? (
                  <Mic style={{ width: 15, height: 15 }} />
                ) : (
                  <MicOff style={{ width: 15, height: 15 }} />
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={!input.trim() || voiceState === "thinking"}
              style={{
                width: 34,
                height: 34,
                borderRadius: "0.6rem",
                background: "linear-gradient(135deg, #34d399, #059669)",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                opacity: !input.trim() || voiceState === "thinking" ? 0.35 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {voiceState === "thinking" ? (
                <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
              ) : (
                <Send style={{ width: 14, height: 14 }} />
              )}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "0.625rem", color: "rgba(255,255,255,0.2)", marginTop: "0.4rem" }}>
            <ShieldCheck style={{ width: 10, height: 10, display: "inline", marginRight: 3, opacity: 0.6 }} />
            Private &amp; secure · Emergencies: call 911 · Mental health: call or text 988
          </p>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes dotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes orbRing {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.18); opacity: 0; }
        }
        div::-webkit-scrollbar { width: 4px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: rgba(108,99,255,0.2); border-radius: 2px; }
      `}</style>
    </div>
  );
}
