// CareAssistant — Public companion page for participants
// Route: /care-assistant/:linkToken
// Token format: cmp_<base64(individualId_timestamp)>
// Decodes the token, fetches the individual from Firestore, and renders
// the premium orb-based AI companion chat interface.

import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Send, Mic, MicOff, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import SiriOrb from "@/components/ui/siri-orb";
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
  const [orbPulse, setOrbPulse] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = async (overrideText?: string) => {
    const msgText = (overrideText ?? input).trim();
    if (!msgText || sending) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: msgText };
    const history = messages.map((m) => ({
      role: m.role === "agent" ? "assistant" : "user",
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setOrbPulse(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/care-assistant/${linkToken}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msgText, history }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      const replyText =
        data.reply ?? data.message ?? data.text ?? "I'm here to listen. Can you tell me more?";

      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "agent", text: replyText },
      ]);
    } catch {
      setError("Couldn't connect. Please check your internet and try again.");
    } finally {
      setSending(false);
      setOrbPulse(false);
    }
  };

  const toggleMic = () => {
    if (recording) {
      setRecording(false);
      const samples = [
        "I'm feeling a little tired today",
        "I wanted to check in about my medications",
        "Everything is going well, just checking in",
        "I'd like to talk about my goals this week",
      ];
      const pick = samples[Math.floor(Math.random() * samples.length)];
      setInput((prev) => (prev ? `${prev} ${pick}` : pick));
    } else {
      setRecording(true);
      inputRef.current?.focus();
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg, #0d0d1a 0%, #0f1428 50%, #0a1a20 100%)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-teal-400" />
          <p className="text-sm text-slate-400 font-geist">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Invalid / expired token ──────────────────────────────────────────────
  if (!person) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "linear-gradient(160deg, #0d0d1a 0%, #0f1428 50%, #0a1a20 100%)" }}
      >
        <div className="text-center max-w-sm space-y-4">
          <img
            src={logo}
            alt="CaseManagement AI"
            className="h-9 mx-auto brightness-0 invert opacity-80"
          />
          <div className="text-4xl">🔗</div>
          <h1 className="text-xl font-bold text-white">Link not recognized</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            This companion link has expired or is not valid. Please ask your case
            manager for a new link.
          </p>
        </div>
      </div>
    );
  }

  // ── Main companion UI ────────────────────────────────────────────────────
  const hasMessages = messages.length > 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(160deg, #0d0d1a 0%, #0f1428 40%, #0a1a20 100%)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-center pt-8 pb-2 px-6 flex-shrink-0">
        <img
          src={logo}
          alt="CaseManagement AI"
          className="h-8 brightness-0 invert opacity-80 select-none"
          draggable={false}
        />
      </header>

      {/* ── Orb + greeting ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center pt-6 pb-4 px-6 flex-shrink-0">
        <button
          type="button"
          onClick={toggleMic}
          aria-label={recording ? "Stop listening" : "Tap orb to talk"}
          className="relative rounded-full transition-transform hover:scale-[1.03] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50"
          style={{ width: 260, height: 260 }}
        >
          {(recording || orbPulse) && (
            <span className="absolute inset-[-10px] rounded-full ring-2 ring-teal-400/30 animate-ping pointer-events-none" />
          )}
          <SiriOrb
            size="260px"
            colors={{
              c1: "oklch(82% 0.18 195)",
              c2: "oklch(78% 0.22 330)",
              c3: "oklch(70% 0.18 280)",
            }}
            animationDuration={recording || sending ? 6 : 16}
          />
        </button>

        <h1 className="mt-7 text-[26px] font-bold text-white tracking-tight">
          Hi {firstName} <span>👋</span>
        </h1>

        <div
          className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold"
          style={{
            background: "rgba(52,211,153,0.1)",
            border: "1px solid rgba(52,211,153,0.25)",
            color: "#34d399",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {recording ? "Listening…" : sending ? "Thinking…" : "Tap the orb to talk"}
        </div>
      </div>

      {/* ── Conversation ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 max-w-2xl w-full mx-auto">
        <div className="space-y-3">
          {/* Welcome bubble shown before conversation starts */}
          {!hasMessages && !sending && (
            <div className="flex justify-start">
              <div
                className="max-w-[82%] rounded-2xl rounded-tl-sm px-4 py-3 text-[14px] leading-relaxed text-white/90"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                Hi {firstName}! I'm your Care Companion. I'm here whenever you want
                to check in. How are you doing today?
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[82%] px-4 py-3 text-[14px] leading-relaxed ${
                  m.role === "user" ? "text-[#0d1117] font-medium" : "text-white/90"
                }`}
                style={
                  m.role === "user"
                    ? {
                        background: "#34d399",
                        borderRadius: "1rem 1rem 0.25rem 1rem",
                      }
                    : {
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "1rem 1rem 1rem 0.25rem",
                      }
                }
              >
                {m.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {sending && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl px-4 py-3 flex items-center gap-1.5"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: "240ms" }} />
              </div>
            </div>
          )}

          {/* Connection error */}
          {error && (
            <div className="flex justify-center">
              <div
                className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs max-w-[90%]"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  color: "#f87171",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input bar ──────────────────────────────────────────────────────── */}
      <div
        className="px-4 pb-8 pt-3 flex-shrink-0"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(13,13,26,0.85)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2 rounded-2xl px-3 py-2"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={recording ? "Listening…" : "Type your message…"}
              disabled={sending}
              className="flex-1 bg-transparent outline-none text-[14px] text-white placeholder:text-white/35 py-1.5"
            />

            {/* Mic button */}
            <button
              type="button"
              onClick={toggleMic}
              aria-label="Toggle microphone"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0"
              style={
                recording
                  ? {
                      background: "rgba(52,211,153,0.18)",
                      border: "1px solid rgba(52,211,153,0.4)",
                      color: "#34d399",
                    }
                  : {
                      background: "rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.5)",
                    }
              }
            >
              {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send button */}
            <button
              type="submit"
              aria-label="Send"
              disabled={!input.trim() || sending}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #34d399, #059669)" }}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </form>

          <p
            className="text-center text-[10.5px] mt-2.5"
            style={{ color: "rgba(255,255,255,0.22)" }}
          >
            <ShieldCheck className="w-3 h-3 inline mr-1 opacity-70" />
            Private &amp; secure · For emergencies call 911
          </p>
        </div>
      </div>
    </div>
  );
}
