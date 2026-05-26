// CareAssistant — Public AI Care Companion
// Route: /care-assistant/:linkToken
//
// ⚠️  DELIBERATELY SELF-CONTAINED — no custom component imports.
//     This page is PUBLIC (no Firebase auth). Any import that touches
//     useAuth / Firestore will crash for unauthenticated visitors.
//     All icons are inline SVGs. No framer-motion. No lucide-react.
//     No SiriOrb. Just React + fetch.

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";

const API_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";
const DG_VOICE = "aura-luna-en";

type Role = "agent" | "user";
interface Message {
  id: string;
  role: Role;
  text: string;
  urgent?: boolean;
}
type VoiceState = "idle" | "greeting" | "speaking" | "listening" | "thinking" | "paused";

// ── Inline SVG icons (no lucide-react import needed) ─────────────────────────
const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: "100%", height: "100%" }}>
    <polygon points="5,3 19,12 5,21" />
  </svg>
);
const IconPause = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: "100%", height: "100%" }}>
    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
  </svg>
);
const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: "100%", height: "100%" }}>
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
  </svg>
);
const IconMic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: "100%", height: "100%" }}>
    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);
const IconMicOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: "100%", height: "100%" }}>
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);
const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: "100%", height: "100%" }}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l1.28-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z" />
  </svg>
);
const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: "100%", height: "100%" }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: "100%", height: "100%" }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9,12 11,14 15,10" />
  </svg>
);
const IconLoader = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: "100%", height: "100%", animation: "ca-spin 1s linear infinite" }}>
    <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

// ── Animated orb — pure CSS, no external dependencies ────────────────────────
function Orb({ state, onClick }: { state: VoiceState; onClick: () => void; awaitingStart: boolean }) {
  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const isThinking = state === "thinking";
  const isPaused = state === "paused";
  const isAwait = state === "idle";

  const gradient = isPaused
    ? "radial-gradient(circle at 40% 40%, #334155, #1e293b, #0f172a)"
    : isListening
    ? "radial-gradient(circle at 35% 35%, #065f46, #047857, #064e3b, #0d1117)"
    : isThinking
    ? "radial-gradient(circle at 35% 35%, #4c1d95, #6d28d9, #7c3aed, #0d1117)"
    : "radial-gradient(circle at 35% 35%, #1d4ed8, #6c63ff, #a855f7, #0d1117)";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPaused ? "Resume conversation" : isAwait ? "Start conversation" : "Pause conversation"}
      style={{
        position: "relative",
        width: 200,
        height: 200,
        borderRadius: "50%",
        background: gradient,
        border: "none",
        cursor: "pointer",
        padding: 0,
        outline: "none",
        boxShadow: isPaused
          ? "0 0 40px rgba(100,116,139,0.25)"
          : isListening
          ? "0 0 60px rgba(52,211,153,0.4), 0 0 120px rgba(52,211,153,0.15)"
          : isThinking
          ? "0 0 60px rgba(139,92,246,0.5), 0 0 120px rgba(139,92,246,0.2)"
          : "0 0 60px rgba(108,99,255,0.5), 0 0 120px rgba(108,99,255,0.2)",
        transition: "box-shadow 0.4s ease, background 0.4s ease",
        animation: (isListening || isSpeaking) ? "ca-orb-pulse 2s ease-in-out infinite" : "none",
      }}
      onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.95)"; }}
      onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      onTouchStart={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.95)"; }}
      onTouchEnd={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
    >
      {/* Pulse rings */}
      {(isListening || isSpeaking) && (
        <>
          <span style={{
            position: "absolute", inset: -16, borderRadius: "50%",
            border: `2px solid ${isListening ? "rgba(52,211,153,0.35)" : "rgba(108,99,255,0.35)"}`,
            animation: "ca-ring 2s ease-out infinite",
            pointerEvents: "none",
          }} />
          <span style={{
            position: "absolute", inset: -32, borderRadius: "50%",
            border: `1px solid ${isListening ? "rgba(52,211,153,0.15)" : "rgba(108,99,255,0.15)"}`,
            animation: "ca-ring 2s ease-out 0.4s infinite",
            pointerEvents: "none",
          }} />
        </>
      )}

      {/* Inner shimmer */}
      <span style={{
        position: "absolute", inset: 8, borderRadius: "50%",
        background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), transparent 60%)",
        pointerEvents: "none",
      }} />

      {/* Icon overlay */}
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 6,
        background: isPaused ? "rgba(0,0,0,0.3)" : isAwait ? "rgba(0,0,0,0.15)" : "transparent",
      }}>
        {isAwait && (
          <>
            <span style={{ color: "rgba(255,255,255,0.9)", width: 32, height: 32 }}><IconPlay /></span>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Tap to begin</span>
          </>
        )}
        {isPaused && (
          <>
            <span style={{ color: "rgba(255,255,255,0.85)", width: 28, height: 28 }}><IconPlay /></span>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Resume</span>
          </>
        )}
        {isThinking && (
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {[0, 150, 300].map((d, i) => (
              <span key={i} style={{
                width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.85)",
                display: "inline-block", animation: `ca-dot 1.2s ease-in-out ${d}ms infinite`,
              }} />
            ))}
          </span>
        )}
      </span>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CareAssistant() {
  const { linkToken } = useParams<{ linkToken: string }>();

  const [firstName, setFirstName] = useState("Friend");
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
  const dgKeyRef = useRef<string | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, voiceState]);

  // Fetch Deepgram key (best-effort — falls back to browser TTS if absent)
  useEffect(() => {
    if (!linkToken) return;
    fetch(`${API_BASE}/care-assistant/${linkToken}/deepgram-token`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.key) { setDgKey(d.key); dgKeyRef.current = d.key; }
      })
      .catch(() => { /* silent — browser TTS fallback */ });
  }, [linkToken]);

  // ── Browser TTS fallback ──────────────────────────────────────────────────
  const browserSpeak = useCallback((text: string, onEnd?: () => void) => {
    if (!("speechSynthesis" in window)) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.92; utter.pitch = 1.05; utter.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith("en") && (v.name.includes("Samantha") || v.name.includes("Google US English") || v.name.includes("Female"))
    ) || voices.find((v) => v.lang.startsWith("en")) || voices[0];
    if (preferred) utter.voice = preferred;
    utter.onend = () => onEnd?.();
    utter.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utter);
  }, []);

  // ── Deepgram TTS ──────────────────────────────────────────────────────────
  const dgSpeak = useCallback(async (text: string, onEnd?: () => void) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    const key = dgKeyRef.current;
    if (!key) { browserSpeak(text, onEnd); return; }
    try {
      const res = await fetch(`https://api.deepgram.com/v1/speak?model=${DG_VOICE}`, {
        method: "POST",
        headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`DG TTS ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); onEnd?.(); };
      audio.onerror = () => { URL.revokeObjectURL(url); onEnd?.(); };
      await audio.play();
    } catch {
      browserSpeak(text, onEnd);
    }
  }, [browserSpeak]);

  // ── Stop everything ───────────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    window.speechSynthesis?.cancel();
    if (dgSocketRef.current) { dgSocketRef.current.close(); dgSocketRef.current = null; }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  // ── Browser speech recognition fallback ──────────────────────────────────
  // MUST be declared before startListening (which has it in its dep array)
  const startBrowserListening = useCallback(() => {
    if (pausedRef.current) return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;
    setVoiceState("listening");
    const rec = new SpeechRec();
    rec.continuous = false; rec.interimResults = false; rec.lang = "en-US";
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript?.trim();
      if (t) handleVoiceInput(t);
    };
    rec.onerror = () => { if (!pausedRef.current) setTimeout(() => startBrowserListening(), 1000); };
    rec.onend = () => { if (!pausedRef.current) setTimeout(() => startBrowserListening(), 500); };
    try { rec.start(); } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Deepgram STT ──────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (pausedRef.current) return;
    const key = dgKeyRef.current;
    if (!key) { startBrowserListening(); return; }
    setVoiceState("listening");
    transcriptBufRef.current = "";

    const params = new URLSearchParams({
      model: "nova-2", language: "en-US", smart_format: "true",
      interim_results: "true", utterance_end_ms: "1200", vad_events: "true",
    });
    // Subprotocol auth is the ONLY method that works in browsers (access_token URL returns 401)
    const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ["token", key]);
    dgSocketRef.current = ws;

    let mediaStream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;

    const finish = (transcript: string) => {
      recorder?.stop();
      mediaStream?.getTracks().forEach((t) => t.stop());
      ws.close();
      dgSocketRef.current = null;
      handleVoiceInput(transcript);
    };

    ws.onopen = async () => {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

        // Pick the first MIME type supported by this browser/OS
        // iOS Safari: audio/mp4  |  Chrome: audio/webm;codecs=opus  |  Firefox: audio/ogg
        const MIME_CANDIDATES = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/mp4;codecs=mp4a.40.2",
          "audio/mp4",
          "", // browser default — last resort
        ];
        const mimeType = MIME_CANDIDATES.find(
          (m) => m === "" || (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m))
        ) ?? "";

        try {
          recorder = mimeType
            ? new MediaRecorder(mediaStream, { mimeType })
            : new MediaRecorder(mediaStream);
        } catch {
          // If MediaRecorder itself fails, fall back to browser STT
          mediaStream.getTracks().forEach((t) => t.stop());
          ws.close();
          dgSocketRef.current = null;
          if (!pausedRef.current) startBrowserListening();
          return;
        }

        recorder.ondataavailable = (e) => {
          if (ws.readyState === WebSocket.OPEN && e.data.size > 0) ws.send(e.data);
        };
        recorder.start(100);
      } catch {
        // getUserMedia failed (permission denied or device unavailable)
        ws.close();
        dgSocketRef.current = null;
        setError("Microphone access denied. Please allow microphone access or type your message below.");
        setVoiceState("paused");
      }
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data as string);
        if (data.type === "UtteranceEnd") {
          const t = transcriptBufRef.current.trim();
          if (t) finish(t);
          return;
        }
        if (data.channel?.alternatives?.[0]) {
          const tr: string = data.channel.alternatives[0].transcript ?? "";
          if (!tr) return;
          if (data.is_final) {
            transcriptBufRef.current += (transcriptBufRef.current ? " " : "") + tr;
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              const t = transcriptBufRef.current.trim();
              if (t) finish(t);
            }, 1800);
          }
        }
      } catch { /* ignore */ }
    };
    ws.onerror = () => {
      recorder?.stop();
      mediaStream?.getTracks().forEach((t) => t.stop());
      // WebSocket failed — fall back to browser STT
      if (!pausedRef.current) startBrowserListening();
    };
    ws.onclose = () => {
      recorder?.stop();
      mediaStream?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startBrowserListening]);

  const listenAfterSpeak = useCallback(() => {
    if (pausedRef.current) return;
    if (dgKeyRef.current) startListening();
    else startBrowserListening();
  }, [startListening, startBrowserListening]);

  const aiSpeakAndListen = useCallback(async (text: string) => {
    if (pausedRef.current) return;
    setVoiceState("speaking");
    await dgSpeak(text, () => { if (!pausedRef.current) listenAfterSpeak(); });
  }, [dgSpeak, listenAfterSpeak]);

  // ── Send message to backend ───────────────────────────────────────────────
  const sendToAPI = useCallback(async (text: string) => {
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
      const isUrgent = replyText.includes("[URGENT]");
      if (isUrgent) replyText = replyText.replace(/\[URGENT\]/g, "").trim();
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "agent", text: replyText, urgent: isUrgent }]);
      await aiSpeakAndListen(replyText);
    } catch {
      setError("Couldn't reach your companion. Please check your connection.");
      setVoiceState("paused");
    }
  }, [linkToken, sessionId, aiSpeakAndListen]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleVoiceInput = useCallback((transcript: string) => {
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: transcript }]);
    sendToAPI(transcript);
  }, [sendToAPI]);

  // ── Begin session on first orb tap ───────────────────────────────────────
  const beginSession = useCallback(async () => {
    if (started || !linkToken) return;
    setStarted(true);
    setVoiceState("greeting");
    window.speechSynthesis?.getVoices?.();
    try {
      const res = await fetch(`${API_BASE}/care-assistant/${linkToken}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "__OPEN__", session_id: sessionId }),
      });
      const data = await res.json();
      const text = data.response ?? "Hey there! I'm your AI Care Companion. How are you doing today?";
      if (data.sessionId) setSessionId(data.sessionId);
      if (data.firstName) setFirstName(data.firstName);
      setMessages([{ id: `a-${Date.now()}`, role: "agent", text }]);
      await aiSpeakAndListen(text);
    } catch {
      const fallback = "Hey there! I'm your AI Care Companion. I'm here for you. How are you doing today?";
      setMessages([{ id: "welcome", role: "agent", text: fallback }]);
      await aiSpeakAndListen(fallback);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, linkToken, sessionId, aiSpeakAndListen]);

  // ── Orb tap handler ───────────────────────────────────────────────────────
  const handleOrbTap = useCallback(() => {
    if (!started) { beginSession(); return; }
    if (voiceState === "paused") {
      pausedRef.current = false;
      listenAfterSpeak();
    } else {
      pausedRef.current = true;
      stopAll();
      setVoiceState("paused");
    }
  }, [started, beginSession, voiceState, listenAfterSpeak, stopAll]);

  // ── Text send ─────────────────────────────────────────────────────────────
  const handleTextSend = useCallback(() => {
    const text = input.trim();
    if (!text || voiceState === "thinking") return;
    if (!started) { beginSession(); return; }
    stopAll();
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);
    setInput("");
    sendToAPI(text);
  }, [input, voiceState, started, beginSession, stopAll, sendToAPI]);

  // Cleanup
  useEffect(() => () => { stopAll(); window.speechSynthesis?.cancel?.(); }, [stopAll]);

  // ── Status labels ─────────────────────────────────────────────────────────
  const statusLabel = !started ? "Tap to begin"
    : voiceState === "greeting" || voiceState === "idle" ? "Connecting…"
    : voiceState === "speaking" ? "Speaking…"
    : voiceState === "listening" ? "Listening…"
    : voiceState === "thinking" ? "Thinking…"
    : "Paused — tap to resume";

  const statusColor = voiceState === "listening" ? "#34d399"
    : voiceState === "paused" ? "#94a3b8"
    : voiceState === "thinking" ? "#a78bfa"
    : "#34d399";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: "linear-gradient(160deg, #0d0d1a 0%, #111827 50%, #0f1628 100%)",
      minHeight: "100dvh", height: "100dvh",
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: "hidden",
      color: "#e8eaf6",
    }}>
      {/* ── Global styles ── */}
      <style>{`
        @keyframes ca-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ca-dot { 0%,60%,100%{transform:translateY(0);opacity:.5} 30%{transform:translateY(-6px);opacity:1} }
        @keyframes ca-ring { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(1.25);opacity:0} }
        @keyframes ca-orb-pulse { 0%,100%{box-shadow:0 0 60px rgba(108,99,255,.5),0 0 120px rgba(108,99,255,.2)} 50%{box-shadow:0 0 80px rgba(108,99,255,.7),0 0 160px rgba(108,99,255,.3)} }
        @keyframes ca-fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .ca-msg { animation: ca-fadein 0.18s ease; }
        .ca-input:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(108,99,255,.25); border-radius: 2px; }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.75rem 1.25rem",
        borderBottom: "1px solid rgba(108,99,255,0.15)",
        background: "rgba(13,13,26,0.92)",
        backdropFilter: "blur(16px)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "linear-gradient(135deg, #6c63ff, #a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.75rem",
          }}>❤️</div>
          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
            AI Care Companion
          </span>
        </div>
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
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
            color: "#f87171", fontSize: "0.6875rem", fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem",
            fontFamily: "inherit",
          }}
        >
          <span style={{ width: 12, height: 12, display: "inline-block", transform: "rotate(135deg)" }}>
            <IconPhone />
          </span>
          End Session
        </button>
      </header>

      {/* ── Orb section ── */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: "1.5rem", paddingBottom: "0.75rem", flexShrink: 0,
      }}>
        <Orb state={started ? voiceState : "idle"} onClick={handleOrbTap} awaitingStart={!started} />

        <h1 style={{ marginTop: "1.25rem", fontSize: "1.375rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
          Hi {firstName} 👋
        </h1>

        {/* Status pill */}
        <div style={{
          marginTop: "0.5rem",
          display: "inline-flex", alignItems: "center", gap: "0.4rem",
          padding: "0.3rem 0.9rem", borderRadius: "9999px",
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${statusColor}44`,
          fontSize: "0.75rem", fontWeight: 600, color: statusColor,
          transition: "all 0.3s ease",
        }}>
          {voiceState !== "paused" && (
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: statusColor, display: "inline-block",
              animation: (voiceState === "listening" || voiceState === "speaking") ? "ca-dot 1.2s ease infinite" : "none",
            }} />
          )}
          {voiceState === "paused" && <span style={{ width: 10, height: 10, display: "inline-block" }}><IconPause /></span>}
          {statusLabel}
        </div>

        {/* Mic hint */}
        <div style={{ marginTop: "0.35rem", height: 16, display: "flex", alignItems: "center", gap: "0.35rem", color: "rgba(255,255,255,0.3)", fontSize: "0.6875rem" }}>
          {voiceState === "listening" && (
            <><span style={{ width: 11, height: 11, display: "inline-block" }}><IconMic /></span> Listening — just speak</>
          )}
          {voiceState === "speaking" && <><span>🔊</span> Speaking…</>}
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 1rem" }}>
        <div style={{ maxWidth: 540, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {messages.map((m) => (
            <div
              key={m.id}
              className="ca-msg"
              style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}
            >
              <div style={{
                maxWidth: "82%",
                padding: "0.6rem 0.9rem",
                fontSize: "0.875rem",
                lineHeight: 1.55,
                borderRadius: m.role === "user" ? "1.1rem 1.1rem 0.25rem 1.1rem" : "1.1rem 1.1rem 1.1rem 0.25rem",
                background: m.role === "user" ? "#34d399" : m.urgent ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.08)",
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
            </div>
          ))}

          {/* Thinking dots */}
          {voiceState === "thinking" && (
            <div className="ca-msg" style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "0.6rem 0.9rem", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1.1rem 1.1rem 1.1rem 0.25rem", display: "flex", gap: 5, alignItems: "center" }}>
                {[0, 140, 280].map((d, i) => (
                  <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(108,99,255,0.8)", display: "inline-block", animation: `ca-dot 1.2s ease-in-out ${d}ms infinite` }} />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="ca-msg" style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "0.75rem", padding: "0.55rem 0.85rem", color: "#f87171", fontSize: "0.8rem", maxWidth: "90%" }}>
                <span style={{ width: 14, height: 14, display: "inline-block", flexShrink: 0 }}><IconAlert /></span>
                {error}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Text input ── */}
      <div style={{
        padding: "0.625rem 1rem 1.25rem",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(13,13,26,0.9)",
        backdropFilter: "blur(16px)",
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
              className="ca-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={voiceState === "listening" ? "Listening… or type here" : "Or type your message…"}
              disabled={voiceState === "thinking"}
              style={{
                flex: 1, background: "transparent", border: "none",
                color: "#e8eaf6", fontSize: "0.875rem", fontFamily: "inherit",
              }}
            />
            <span style={{ color: voiceState === "listening" ? "#34d399" : "rgba(255,255,255,0.2)", flexShrink: 0, width: 15, height: 15, display: "inline-block" }}>
              {voiceState === "listening" ? <IconMic /> : <IconMicOff />}
            </span>
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
                padding: "0.55rem",
              }}
            >
              {voiceState === "thinking"
                ? <span style={{ width: "100%", height: "100%" }}><IconLoader /></span>
                : <span style={{ width: "100%", height: "100%" }}><IconSend /></span>}
            </button>
          </form>
          <p style={{ textAlign: "center", fontSize: "0.625rem", color: "rgba(255,255,255,0.2)", marginTop: "0.4rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
            <span style={{ width: 10, height: 10, display: "inline-block", opacity: 0.6 }}><IconShield /></span>
            Private &amp; secure · Emergencies: call 911 · Mental health: call or text 988
          </p>
        </div>
      </div>
    </div>
  );
}
