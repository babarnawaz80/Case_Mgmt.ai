// CareAssistant — Public companion chat for participants
// Route: /care-assistant/:linkToken
// Opens immediately into a live chat. AI sends the first greeting on load.
// Designed for individuals on their phone — simple, warm, no friction.

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, Loader2, ShieldCheck, AlertTriangle, Phone, Heart } from "lucide-react";
import logo from "@/assets/casemanagement-ai-logo.png";
import { useIndividual } from "@/hooks/useIndividuals";

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

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Speech recognition type shim
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function CareAssistant() {
  const { linkToken } = useParams<{ linkToken: string }>();
  const personId = decodeToken(linkToken);
  const { individual: person, loading } = useIndividual(personId ?? undefined);

  const firstName = person?.preferred_name || person?.first_name || "Friend";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string>(`session_${Date.now()}`);
  const [hasSpeech, setHasSpeech] = useState(false);
  const [greeted, setGreeted] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Check speech recognition support
  useEffect(() => {
    setHasSpeech("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  }, []);

  // Send the AI's opening greeting as soon as the person loads
  useEffect(() => {
    if (!person || greeted || loading) return;
    setGreeted(true);

    // Small delay so the UI renders first, then AI "types"
    setSending(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/care-assistant/${linkToken}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "__OPEN__",   // special signal: AI sends the opening greeting
            session_id: sessionId,
          }),
        });
        const data = await res.json();
        const text = data.response ?? `Hi ${firstName}! 😊 I'm your Care Companion. I'm here whenever you need me. How are you doing today?`;
        const sid = data.sessionId ?? sessionId;
        setSessionId(sid);
        setMessages([{ id: `a-${Date.now()}`, role: "agent", text, ts: new Date() }]);
      } catch {
        // Fallback welcome if network fails
        setMessages([{
          id: "welcome",
          role: "agent",
          text: `Hi ${firstName}! 😊 I'm your Care Companion — I'm here for you whenever you want to talk. How are you doing today?`,
          ts: new Date(),
        }]);
      } finally {
        setSending(false);
        setTimeout(() => inputRef.current?.focus(), 200);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [person, greeted, loading, firstName, linkToken, sessionId]);

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text, ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setError(null);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

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
    } catch {
      setError("Couldn't reach your companion right now. Please check your connection and try again.");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, sending, linkToken, sessionId]);

  const toggleMic = () => {
    if (!hasSpeech) return;

    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);

    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: "linear-gradient(160deg,#0d0d1a,#111827)", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <Loader2 style={{ width: 32, height: 32, color: "#6c63ff", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "#9fa8da", fontSize: "0.875rem" }}>Loading your companion…</p>
        </div>
      </div>
    );
  }

  // ── Invalid token ──────────────────────────────────────────────────────────
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

  // ── Main chat UI ───────────────────────────────────────────────────────────
  return (
    <div style={{
      background: "linear-gradient(160deg, #0d0d1a 0%, #111827 50%, #0f1628 100%)",
      minHeight: "100dvh",
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: "hidden",
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.75rem 1.25rem",
        borderBottom: "1px solid rgba(108,99,255,0.18)",
        background: "rgba(13,13,26,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        flexShrink: 0,
      }}>
        {/* Left: avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "linear-gradient(135deg, #6c63ff, #a855f7)",
            boxShadow: "0 0 18px rgba(108,99,255,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", flexShrink: 0,
          }}>
            <Heart style={{ width: 16, height: 16, color: "#fff" }} />
            <span style={{
              position: "absolute", bottom: -1, right: -1,
              width: 12, height: 12, borderRadius: "50%",
              background: "#4caf50",
              border: "2px solid #0d0d1a",
            }} />
          </div>
          <div>
            <div style={{ color: "#e8eaf6", fontSize: "0.8125rem", fontWeight: 600, lineHeight: 1.2 }}>
              AI Care Companion
            </div>
            <div style={{ color: "#9fa8da", fontSize: "0.6875rem", display: "flex", alignItems: "center", gap: "0.35rem", marginTop: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4caf50", display: "inline-block", animation: "pulse 2s infinite" }} />
              Chatting with {firstName}
            </div>
          </div>
        </div>

        {/* Right: logo + end button */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <img src={logo} alt="CaseManagement AI" style={{ height: 20, opacity: 0.45 }} />
          <button
            onClick={() => {
              if (confirm("End your session? Your conversation will be saved for your care team.")) {
                fetch(`${API_BASE}/care-assistant/${linkToken}/end-session`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ session_id: sessionId }),
                }).catch(() => {});
                setMessages([]);
                setGreeted(false);
                window.location.reload();
              }
            }}
            style={{
              height: 30, padding: "0 0.75rem", borderRadius: "0.5rem",
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.22)",
              color: "#f87171", fontSize: "0.6875rem", fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem",
              fontFamily: "inherit",
            }}
          >
            <Phone style={{ width: 12, height: 12, transform: "rotate(135deg)" }} />
            End
          </button>
        </div>
      </header>

      {/* ── Messages ────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "1.25rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        scrollBehavior: "smooth",
      }}>
        <div style={{ maxWidth: 640, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "0.875rem" }}>

          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", flexDirection: m.role === "user" ? "row-reverse" : "row" }}
              >
                {/* Agent avatar */}
                {m.role === "agent" && (
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "linear-gradient(135deg, #6c63ff, #a855f7)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Heart style={{ width: 13, height: 13, color: "#fff" }} />
                  </div>
                )}

                {/* Bubble + timestamp */}
                <div style={{ display: "flex", flexDirection: "column", maxWidth: "82%", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    padding: "0.75rem 1rem",
                    fontSize: "0.9rem",
                    lineHeight: 1.55,
                    borderRadius: m.role === "user" ? "1.15rem 1.15rem 0.25rem 1.15rem" : "1.15rem 1.15rem 1.15rem 0.25rem",
                    background: m.role === "user"
                      ? "linear-gradient(135deg, #6c63ff, #a855f7)"
                      : m.urgent
                        ? "rgba(245,158,11,0.12)"
                        : "rgba(255,255,255,0.07)",
                    border: m.urgent
                      ? "1.5px solid rgba(245,158,11,0.45)"
                      : m.role === "agent"
                        ? "1px solid rgba(108,99,255,0.2)"
                        : "none",
                    color: m.role === "user" ? "#fff" : "#e8eaf6",
                  }}>
                    {m.text}
                  </div>
                  {m.urgent && (
                    <div style={{
                      marginTop: "0.4rem",
                      background: "rgba(245,158,11,0.1)",
                      border: "1px solid rgba(245,158,11,0.3)",
                      borderRadius: "0.6rem",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.75rem",
                      color: "#fcd34d",
                    }}>
                      ⚠️ Your case manager has been notified. Call 911 for emergencies · Text or call 988 anytime.
                    </div>
                  )}
                  <span style={{ fontSize: "0.65rem", color: "#5c6bc0", marginTop: "0.2rem", paddingInline: "0.25rem" }}>
                    {formatTime(m.ts)}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {sending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "linear-gradient(135deg, #6c63ff, #a855f7)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Heart style={{ width: 13, height: 13, color: "#fff" }} />
              </div>
              <div style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(108,99,255,0.2)",
                borderRadius: "1.15rem 1.15rem 1.15rem 0.25rem",
                padding: "0.75rem 1rem",
                display: "flex", gap: 5, alignItems: "center",
              }}>
                {[0, 150, 300].map((delay, i) => (
                  <span key={i} style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: "rgba(108,99,255,0.7)",
                    display: "inline-block",
                    animation: `dotBounce 1.2s ease-in-out ${delay}ms infinite`,
                  }} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", justifyContent: "center" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: "0.75rem", padding: "0.6rem 0.9rem",
                color: "#f87171", fontSize: "0.8rem", maxWidth: "90%",
              }}>
                <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
                {error}
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input bar ───────────────────────────────────────────────────────── */}
      <div style={{
        padding: "0.75rem 1rem 1.25rem",
        borderTop: "1px solid rgba(108,99,255,0.15)",
        background: "rgba(13,13,26,0.9)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{
            display: "flex", alignItems: "flex-end", gap: "0.5rem",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(108,99,255,0.22)",
            borderRadius: "1rem",
            padding: "0.6rem 0.65rem 0.6rem 1rem",
            transition: "border-color 0.15s",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              rows={1}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder={recording ? "Listening…" : "Type your message… (Enter to send)"}
              disabled={sending}
              aria-label="Message input"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#e8eaf6",
                fontSize: "0.9rem",
                fontFamily: "inherit",
                resize: "none",
                maxHeight: 120,
                lineHeight: 1.5,
                overflow: "hidden",
                padding: 0,
              }}
            />

            {/* Mic button */}
            {hasSpeech && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label={recording ? "Stop listening" : "Voice input"}
                style={{
                  width: 36, height: 36, borderRadius: "0.6rem",
                  background: recording ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
                  border: recording ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(108,99,255,0.18)",
                  color: recording ? "#f87171" : "#9fa8da",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "all 0.15s", fontFamily: "inherit",
                }}
              >
                {recording ? <MicOff style={{ width: 15, height: 15 }} /> : <Mic style={{ width: 15, height: 15 }} />}
              </button>
            )}

            {/* Send button */}
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={!input.trim() || sending}
              aria-label="Send message"
              style={{
                width: 36, height: 36, borderRadius: "0.6rem",
                background: "linear-gradient(135deg, #6c63ff, #a855f7)",
                boxShadow: "0 2px 10px rgba(108,99,255,0.35)",
                border: "none", color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all 0.15s", opacity: (!input.trim() || sending) ? 0.35 : 1,
              }}
            >
              {sending
                ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />
                : <Send style={{ width: 15, height: 15 }} />
              }
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: "0.65rem", color: "#5c6bc0", marginTop: "0.5rem" }}>
            <ShieldCheck style={{ width: 11, height: 11, display: "inline", marginRight: 4, opacity: 0.7 }} />
            Private &amp; secure · For emergencies, call 911 · Mental health support: call or text 988
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
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        div::-webkit-scrollbar { width: 4px; }
        div::-webkit-scrollbar-track { background: transparent; }
        div::-webkit-scrollbar-thumb { background: rgba(108,99,255,0.25); border-radius: 2px; }
      `}</style>
    </div>
  );
}
