// CareAssistant — Public AI companion for individuals
// Route: /care-assistant/:linkToken
//
// Voice stack:
//   STT → Deepgram WebSocket (wss://api.deepgram.com/v1/listen)
//   TTS → Deepgram Speak API (https://api.deepgram.com/v1/speak)
//   Key → fetched from POST /care-assistant/:token/deepgram-token (validated by companion_token)
//
// UX flow:
//   1. Page loads → fetch AI greeting
//   2. Deepgram TTS speaks it aloud
//   3. Deepgram STT listens — user just talks
//   4. Transcript → API → AI response → TTS → STT → loop
//   5. Orb = pause / resume

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Phone,
  Pause,
  Play,
  Mic,
  MicOff,
} from "lucide-react";
import logo from "@/assets/casemanagement-ai-logo.png";
import { useIndividual } from "@/hooks/useIndividuals";
import SiriOrb from "@/components/ui/siri-orb";

const API_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";
// Deepgram voice — "aura-luna-en" is warm, natural, female English
const DG_VOICE = "aura-luna-en";

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
  const [dgKey, setDgKey] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dgSocketRef = useRef<WebSocket | null>(null);
  const pausedRef = useRef(false);
  const transcriptBufRef = useRef<string>("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, voiceState]);

  // ── Fetch Deepgram key from server ────────────────────────────────────────
  useEffect(() => {
    if (!linkToken) return;
    fetch(`${API_BASE}/care-assistant/${linkToken}/deepgram-token`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.key) setDgKey(d.key);
      })
      .catch(() => {
        // Fall back to browser TTS if key fetch fails
        console.warn("[Companion] Could not fetch Deepgram key — falling back to browser TTS");
      });
  }, [linkToken]);

  // ── Deepgram TTS: speak text, call onEnd when done ────────────────────────
  const dgSpeak = useCallback(
    async (text: string, onEnd?: () => void) => {
      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }

      if (!dgKey) {
        // Browser TTS fallback
        browserSpeak(text, onEnd);
        return;
      }

      try {
        const res = await fetch(`https://api.deepgram.com/v1/speak?model=${DG_VOICE}`, {
          method: "POST",
          headers: {
            Authorization: `Token ${dgKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) throw new Error(`DG TTS ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          onEnd?.();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          onEnd?.();
        };
        await audio.play();
      } catch (e) {
        console.warn("[DG TTS] error, falling back to browser TTS:", e);
        browserSpeak(text, onEnd);
      }
    },
    [dgKey]
  );

  // ── Browser TTS fallback ──────────────────────────────────────────────────
  function browserSpeak(text: string, onEnd?: () => void) {
    if (!("speechSynthesis" in window)) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95; utter.pitch = 1.05; utter.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Samantha") || v.name.includes("Karen") ||
          v.name.includes("Google US English") || v.name.includes("Female"))
    ) || voices.find((v) => v.lang.startsWith("en")) || voices[0];
    if (preferred) utter.voice = preferred;
    utter.onend = () => onEnd?.();
    utter.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utter);
  }

  // ── Stop all audio + close mic ────────────────────────────────────────────
  const stopAll = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    window.speechSynthesis?.cancel();
    if (dgSocketRef.current) {
      dgSocketRef.current.close();
      dgSocketRef.current = null;
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  // ── Deepgram STT: open WebSocket mic ─────────────────────────────────────
  const startListening = useCallback(() => {
    if (pausedRef.current || !dgKey) return;
    setVoiceState("listening");
    transcriptBufRef.current = "";

    const params = new URLSearchParams({
      model: "nova-2",
      language: "en-US",
      smart_format: "true",
      interim_results: "true",
      utterance_end_ms: "1200",
      vad_events: "true",
    });
    // Deepgram requires access_token as a query param (NOT as a WebSocket subprotocol)
    const wsUrl = `wss://api.deepgram.com/v1/listen?${params}&access_token=${encodeURIComponent(dgKey)}`;
    const ws = new WebSocket(wsUrl);
    dgSocketRef.current = ws;

    // Stream mic audio to Deepgram
    let mediaStream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;

    ws.onopen = async () => {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        recorder = new MediaRecorder(mediaStream, { mimeType: "audio/webm;codecs=opus" });
        recorder.ondataavailable = (e) => {
          if (ws.readyState === WebSocket.OPEN && e.data.size > 0) {
            ws.send(e.data);
          }
        };
        recorder.start(100); // 100ms chunks
      } catch (err) {
        console.error("[DG STT] Mic error:", err);
        setError("Microphone access denied. Please allow microphone access.");
        setVoiceState("paused");
      }
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data as string);

        // Utterance end event → send accumulated transcript
        if (data.type === "UtteranceEnd") {
          const t = transcriptBufRef.current.trim();
          if (t) {
            recorder?.stop();
            mediaStream?.getTracks().forEach((tr) => tr.stop());
            ws.close();
            dgSocketRef.current = null;
            handleVoiceInput(t);
          }
          return;
        }

        // Normal transcript
        if (data.channel?.alternatives?.[0]) {
          const alt = data.channel.alternatives[0];
          const transcript: string = alt.transcript ?? "";
          if (!transcript) return;

          if (data.is_final) {
            transcriptBufRef.current += (transcriptBufRef.current ? " " : "") + transcript;
            // Reset silence timer
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              const t = transcriptBufRef.current.trim();
              if (t) {
                recorder?.stop();
                mediaStream?.getTracks().forEach((tr) => tr.stop());
                ws.close();
                dgSocketRef.current = null;
                handleVoiceInput(t);
              }
            }, 1800); // 1.8s silence = end of utterance
          }
        }
      } catch {
        // ignore JSON parse errors
      }
    };

    ws.onerror = () => {
      recorder?.stop();
      mediaStream?.getTracks().forEach((tr) => tr.stop());
      if (!pausedRef.current) {
        // Retry after 1s
        setTimeout(() => startListening(), 1000);
      }
    };

    ws.onclose = () => {
      recorder?.stop();
      mediaStream?.getTracks().forEach((tr) => tr.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dgKey]);

  // Browser Speech Recognition fallback (when no DG key)
  const startBrowserListening = useCallback(() => {
    if (pausedRef.current) return;
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;
    setVoiceState("listening");
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRec();
    rec.continuous = false; rec.interimResults = false; rec.lang = "en-US";
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript?.trim();
      if (t) handleVoiceInput(t);
    };
    rec.onerror = () => { if (!pausedRef.current) setTimeout(() => startBrowserListening(), 1000); };
    rec.onend = () => { if (!pausedRef.current && voiceState === "listening") setTimeout(() => startBrowserListening(), 500); };
    try { rec.start(); } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listenAfterSpeak = useCallback(() => {
    if (pausedRef.current) return;
    if (dgKey) {
      startListening();
    } else {
      startBrowserListening();
    }
  }, [dgKey, startListening, startBrowserListening]);

  // ── AI speaks, then auto-listens ──────────────────────────────────────────
  const aiSpeakAndListen = useCallback(
    async (text: string) => {
      if (pausedRef.current) return;
      setVoiceState("speaking");
      await dgSpeak(text, () => {
        if (!pausedRef.current) listenAfterSpeak();
      });
    },
    [dgSpeak, listenAfterSpeak]
  );

  // ── Send message to API ───────────────────────────────────────────────────
  const sendToAPI = useCallback(
    async (text: string) => {
      setVoiceState("thinking");
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/care-assistant/${linkToken}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, session_id: sessionId }),
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        let replyText: string = data.response ?? "I'm here for you. Can you tell me more?";
        const isUrgent = replyText.startsWith("[URGENT]");
        if (isUrgent) replyText = replyText.replace("[URGENT]", "").trim();
        if (data.sessionId) setSessionId(data.sessionId);

        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: "agent", text: replyText, ts: new Date(), urgent: isUrgent },
        ]);

        await aiSpeakAndListen(replyText);
      } catch {
        setError("Couldn't reach your companion. Please check your connection.");
        setVoiceState("paused");
      }
    },
    [linkToken, sessionId, aiSpeakAndListen]
  );

  // ── Handle voice transcript ───────────────────────────────────────────────
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
    stopAll();
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text, ts: new Date() },
    ]);
    setInput("");
    sendToAPI(text);
  }, [input, voiceState, stopAll, sendToAPI]);

  // ── Orb = pause / resume ──────────────────────────────────────────────────
  const togglePause = useCallback(() => {
    if (voiceState === "paused") {
      pausedRef.current = false;
      listenAfterSpeak();
    } else {
      pausedRef.current = true;
      stopAll();
      setVoiceState("paused");
    }
  }, [voiceState, listenAfterSpeak, stopAll]);

  // ── Auto-start on page load ───────────────────────────────────────────────
  useEffect(() => {
    if (!person || started || loading) return;
    setStarted(true);
    setVoiceState("greeting");
    window.speechSynthesis?.getVoices(); // preload voices

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/care-assistant/${linkToken}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "__OPEN__", session_id: sessionId }),
        });
        const data = await res.json();
        const text = data.response ?? `Hey ${firstName}! I'm your Care Companion. How are you doing today?`;
        if (data.sessionId) setSessionId(data.sessionId);
        setMessages([{ id: `a-${Date.now()}`, role: "agent", text, ts: new Date() }]);
        await aiSpeakAndListen(text);
      } catch {
        const fallback = `Hey ${firstName}! I'm your Care Companion. I'm here for you. How are you doing today?`;
        setMessages([{ id: "welcome", role: "agent", text: fallback, ts: new Date() }]);
        await aiSpeakAndListen(fallback);
      }
    }, 800);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person, started, loading]);

  // Cleanup on unmount
  useEffect(() => () => { stopAll(); window.speechSynthesis?.cancel(); }, [stopAll]);

  // ── Derived UI values ─────────────────────────────────────────────────────
  const orbAnimDuration =
    voiceState === "listening" ? 4
    : voiceState === "speaking" ? 5
    : voiceState === "thinking" ? 7
    : 20;

  const statusLabel =
    voiceState === "greeting" || voiceState === "idle" ? "Connecting…"
    : voiceState === "speaking" ? "Speaking…"
    : voiceState === "listening" ? "Listening…"
    : voiceState === "thinking" ? "Thinking…"
    : "Paused — tap to resume";

  const statusColor =
    voiceState === "listening" ? "#34d399"
    : voiceState === "paused" ? "#94a3b8"
    : voiceState === "thinking" ? "#a78bfa"
    : "#34d399";

  const isPaused = voiceState === "paused";

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: "linear-gradient(160deg,#0d0d1a,#111827)", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <Loader2 style={{ width: 32, height: 32, color: "#6c63ff", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "#9fa8da", fontSize: "0.875rem" }}>Connecting…</p>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!person && !loading) {
    return (
      <div style={{ background: "linear-gradient(160deg,#0d0d1a,#111827)", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <img src={logo} alt="CaseManagement AI" style={{ height: 36, margin: "0 auto 1.5rem", display: "block", opacity: 0.8 }} />
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔗</div>
          <h1 style={{ color: "#e8eaf6", fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>Link not recognized</h1>
          <p style={{ color: "#9fa8da", fontSize: "0.875rem", lineHeight: 1.6 }}>
            This companion link has expired or is no longer active. Please ask your case manager for a new link.
          </p>
        </div>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: "linear-gradient(160deg, #0d0d1a 0%, #111827 50%, #0f1628 100%)",
      minHeight: "100dvh", height: "100dvh",
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: "hidden",
    }}>

      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.75rem 1.25rem",
        borderBottom: "1px solid rgba(108,99,255,0.15)",
        background: "rgba(13,13,26,0.9)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        flexShrink: 0,
      }}>
        <img src={logo} alt="CaseManagement AI" style={{ height: 22, opacity: 0.5 }} draggable={false} />
        <button
          onClick={() => {
            if (confirm("End your session? Your conversation will be saved for your care team.")) {
              stopAll();
              fetch(`${API_BASE}/care-assistant/${linkToken}/end-session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session_id: sessionId }),
              }).catch(() => {});
              window.location.reload();
            }
          }}
          style={{
            height: 30, padding: "0 0.75rem", borderRadius: "0.5rem",
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)",
            color: "#f87171", fontSize: "0.6875rem", fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem",
            fontFamily: "inherit",
          }}
        >
          <Phone style={{ width: 11, height: 11, transform: "rotate(135deg)" }} />
          End Session
        </button>
      </header>

      {/* Orb section */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "1.25rem", paddingBottom: "0.5rem", flexShrink: 0,
      }}>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.06em", marginBottom: "0.75rem", textTransform: "uppercase" }}>
          AI Case Companion
        </p>

        {/* Orb — tap to pause/resume */}
        <button
          type="button"
          onClick={togglePause}
          aria-label={isPaused ? "Resume conversation" : "Pause conversation"}
          style={{
            position: "relative", width: 220, height: 220,
            borderRadius: "50%", background: "none", border: "none",
            cursor: "pointer", padding: 0, outline: "none",
            transition: "transform 0.15s ease",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onTouchStart={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
          onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {/* Pulse ring when listening or speaking */}
          {(voiceState === "listening" || voiceState === "speaking") && (
            <span style={{
              position: "absolute", inset: -10, borderRadius: "50%",
              border: `2px solid ${voiceState === "listening" ? "rgba(52,211,153,0.4)" : "rgba(108,99,255,0.35)"}`,
              animation: "orbRing 2s ease-out infinite",
              pointerEvents: "none",
            }} />
          )}

          <SiriOrb
            size="220px"
            colors={{
              c1: isPaused ? "oklch(55% 0.06 220)" : "oklch(82% 0.18 195)",
              c2: isPaused ? "oklch(50% 0.05 260)" : "oklch(78% 0.22 330)",
              c3: isPaused ? "oklch(53% 0.07 200)" : "oklch(70% 0.18 280)",
            }}
            animationDuration={orbAnimDuration}
          />

          {isPaused && (
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
              borderRadius: "50%", background: "rgba(0,0,0,0.35)",
            }}>
              <Play style={{ width: 32, height: 32, color: "rgba(255,255,255,0.75)" }} />
            </div>
          )}
        </button>

        {/* Greeting */}
        <h1 style={{ marginTop: "1rem", fontSize: "1.375rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
          Hi {firstName} 👋
        </h1>

        {/* Status pill */}
        <div style={{
          marginTop: "0.5rem",
          display: "inline-flex", alignItems: "center", gap: "0.4rem",
          padding: "0.3rem 0.85rem", borderRadius: "9999px",
          background: "rgba(52,211,153,0.07)",
          border: `1px solid ${statusColor}33`,
          fontSize: "0.75rem", fontWeight: 600, color: statusColor,
          transition: "all 0.3s ease",
        }}>
          {!isPaused && (
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: statusColor, display: "inline-block",
              animation: (voiceState === "listening" || voiceState === "speaking") ? "pulse 1.2s ease infinite" : "none",
            }} />
          )}
          {isPaused && <Pause style={{ width: 10, height: 10 }} />}
          {statusLabel}
        </div>

        {/* Mic indicator row */}
        <div style={{ marginTop: "0.4rem", height: 18, display: "flex", alignItems: "center", gap: "0.35rem", color: "rgba(255,255,255,0.3)", fontSize: "0.6875rem" }}>
          {voiceState === "listening" ? (
            <><Mic style={{ width: 11, height: 11 }} /> Microphone active — just start speaking</>
          ) : voiceState === "speaking" ? (
            <><span style={{ fontSize: "0.7rem" }}>🔊</span> Deepgram voice</>
          ) : null}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 1rem" }}>
        <div style={{ maxWidth: 540, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18 }}
                style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}
              >
                <div style={{
                  maxWidth: "82%",
                  padding: "0.6rem 0.9rem",
                  fontSize: "0.875rem",
                  lineHeight: 1.55,
                  borderRadius: m.role === "user" ? "1.1rem 1.1rem 0.25rem 1.1rem" : "1.1rem 1.1rem 1.1rem 0.25rem",
                  background: m.role === "user" ? "#34d399" : m.urgent ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.07)",
                  border: m.urgent ? "1.5px solid rgba(245,158,11,0.4)" : m.role === "agent" ? "1px solid rgba(255,255,255,0.1)" : "none",
                  color: m.role === "user" ? "#0d1117" : "#e8eaf6",
                  fontWeight: m.role === "user" ? 500 : 400,
                }}>
                  {m.text}
                  {m.urgent && (
                    <div style={{ marginTop: "0.4rem", padding: "0.35rem 0.55rem", background: "rgba(245,158,11,0.1)", borderRadius: "0.5rem", fontSize: "0.725rem", color: "#fcd34d" }}>
                      ⚠️ Your care team has been notified. Call 911 for emergencies · Text 988 for mental health support.
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Thinking dots */}
          {voiceState === "thinking" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "0.6rem 0.9rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1.1rem 1.1rem 1.1rem 0.25rem", display: "flex", gap: 5, alignItems: "center" }}>
                {[0, 140, 280].map((d, i) => (
                  <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(108,99,255,0.7)", display: "inline-block", animation: `dotBounce 1.2s ease-in-out ${d}ms infinite` }} />
                ))}
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "0.75rem", padding: "0.55rem 0.85rem", color: "#f87171", fontSize: "0.8rem", maxWidth: "90%" }}>
                <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
                {error}
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Text input fallback */}
      <div style={{
        padding: "0.625rem 1rem 1.25rem",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(13,13,26,0.88)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <form
            onSubmit={(e) => { e.preventDefault(); handleTextSend(); }}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
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
              placeholder={voiceState === "listening" ? "Listening… or type here" : "Or type your message…"}
              disabled={voiceState === "thinking"}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#e8eaf6", fontSize: "0.875rem", fontFamily: "inherit",
              }}
            />
            <div style={{ color: voiceState === "listening" ? "#34d399" : "rgba(255,255,255,0.2)", flexShrink: 0 }}>
              {voiceState === "listening" ? <Mic style={{ width: 15, height: 15 }} /> : <MicOff style={{ width: 15, height: 15 }} />}
            </div>
            <button
              type="submit"
              disabled={!input.trim() || voiceState === "thinking"}
              style={{
                width: 34, height: 34, borderRadius: "0.6rem",
                background: "linear-gradient(135deg, #34d399, #059669)",
                border: "none", color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, opacity: !input.trim() || voiceState === "thinking" ? 0.35 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {voiceState === "thinking"
                ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                : <Send style={{ width: 14, height: 14 }} />}
            </button>
          </form>
          <p style={{ textAlign: "center", fontSize: "0.625rem", color: "rgba(255,255,255,0.2)", marginTop: "0.4rem" }}>
            <ShieldCheck style={{ width: 10, height: 10, display: "inline", marginRight: 3, opacity: 0.6 }} />
            Private &amp; secure · Emergencies: call 911 · Mental health: call or text 988
          </p>
        </div>
      </div>

      <style>{`
        @keyframes dotBounce { 0%,60%,100%{transform:translateY(0);opacity:.5} 30%{transform:translateY(-5px);opacity:1} }
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes orbRing{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.2);opacity:0}}
        div::-webkit-scrollbar{width:4px}
        div::-webkit-scrollbar-track{background:transparent}
        div::-webkit-scrollbar-thumb{background:rgba(108,99,255,.2);border-radius:2px}
      `}</style>
    </div>
  );
}
