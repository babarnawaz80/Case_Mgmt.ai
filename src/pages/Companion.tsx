import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ShieldCheck, Phone, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import brandLogo from "@/assets/casemanagement-ai-logo.png";
import { useIndividual } from "@/hooks/useIndividuals";

const API_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";

/**
 * Decode a token like `cmp_<base64(personId_timestamp)>` back to the person id.
 * The token format is: cmp_ + btoa(individualId + '_' + Date.now())
 */
function decodeToken(token: string | undefined): string | null {
  if (!token) return null;
  const raw = token.startsWith("cmp_") ? token.slice(4) : token;
  try {
    const decoded = atob(raw);
    // Format: "individualId_timestamp" — extract just the ID part
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

const Companion = () => {
  const { token } = useParams<{ token: string }>();
  const personId = decodeToken(token);
  const { individual: person, loading } = useIndividual(personId ?? undefined);

  const firstName = person?.preferred_name || person?.first_name || "Friend";

  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Focus input after start
  useEffect(() => {
    if (started) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [started]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
    };

    const history = messages.map((m) => ({ role: m.role === "agent" ? "assistant" : "user", text: m.text }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/care-assistant/${token}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error ${res.status}`);
      }

      const data = await res.json();
      const replyText: string =
        data.reply ?? data.message ?? data.text ?? "I'm here to listen. Can you tell me more?";

      const agentMessage: Message = {
        id: `a-${Date.now()}`,
        role: "agent",
        text: replyText,
      };
      setMessages((prev) => [...prev, agentMessage]);
    } catch (err) {
      console.error("Care assistant error:", err);
      setError("I had trouble connecting. Please check your internet and try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEnd = () => {
    setStarted(false);
    setMessages([]);
    setInput("");
    setError(null);
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center companion-bg p-6">
        <div className="flex items-center gap-2" style={{ color: "var(--comp-muted)" }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-geist">Loading…</span>
        </div>
      </div>
    );
  }

  // ── Invalid / expired token ───────────────────────────────────────────────
  if (!person) {
    return (
      <div className="min-h-screen flex items-center justify-center companion-bg p-6">
        <div className="comp-card max-w-md w-full text-center space-y-5 p-7 rounded-3xl">
          <img src={brandLogo} alt="CaseManagement AI" className="h-9 mx-auto" />
          <h1 className="font-display text-2xl font-bold" style={{ color: "var(--comp-text)" }}>
            Link not valid
          </h1>
          <p style={{ color: "var(--comp-muted)" }} className="text-sm leading-relaxed">
            This companion link has expired or was not recognized. Please ask your case manager for a new link.
          </p>
        </div>
      </div>
    );
  }

  // ── Consent / start screen ────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center companion-bg p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="comp-card w-full max-w-md rounded-3xl p-7 text-center space-y-5"
        >
          <img src={brandLogo} alt="CaseManagement AI" className="h-9 mx-auto" />

          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full comp-avatar flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold" style={{ color: "var(--comp-text)" }}>
                Hi {firstName} 👋
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--comp-muted)" }}>
                Your AI Care Companion is ready
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed" style={{ color: "var(--comp-muted)" }}>
            Your case manager invited you to use your private AI companion. You can share how you're feeling, ask
            questions, or just check in. Your conversations help your care team support you better.
          </p>

          <div
            className="rounded-2xl p-3.5 text-left text-xs flex gap-2.5"
            style={{ background: "var(--comp-notice-bg)", color: "var(--comp-muted)" }}
          >
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--comp-accent)" }} />
            <span>
              This link is private to you. Conversations are summarized for your care team to help support you better.
              Nothing is recorded without your knowledge.
            </span>
          </div>

          <button
            onClick={() => setStarted(true)}
            className="comp-btn-primary w-full h-12 rounded-2xl font-semibold text-white transition-opacity hover:opacity-90"
          >
            Start Conversation
          </button>

          <p className="text-[11px]" style={{ color: "var(--comp-faint)" }}>
            For emergencies, call 911
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Active chat screen ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col companion-bg">
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ background: "var(--comp-header-bg)", borderColor: "var(--comp-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full comp-avatar flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-tight" style={{ color: "var(--comp-text)" }}>
              AI Care Companion
            </p>
            <p className="text-[11px] leading-none flex items-center gap-1" style={{ color: "var(--comp-muted)" }}>
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse inline-block"
                style={{ background: "var(--comp-green)" }}
              />
              Chatting with {firstName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <img src={brandLogo} alt="CaseManagement AI" className="h-5 opacity-60" />
          <button
            onClick={handleEnd}
            title="End session"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "var(--comp-end-btn-bg)", color: "var(--comp-end-btn-color)" }}
            aria-label="End session"
          >
            <Phone className="w-4 h-4 rotate-[135deg]" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 max-w-2xl w-full mx-auto">
        {/* Welcome message */}
        {messages.length === 0 && !sending && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div
              className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[85%] leading-relaxed"
              style={{ background: "var(--comp-bubble-agent)", color: "var(--comp-text)", border: "1px solid var(--comp-border)" }}
            >
              Hi {firstName}! I'm your AI Care Companion. I'm here to listen and check in with you.
              How are you feeling today?
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="rounded-2xl px-4 py-3 text-sm max-w-[85%] leading-relaxed"
                style={
                  m.role === "user"
                    ? {
                        background: "var(--comp-accent)",
                        color: "#fff",
                        borderRadius: "1rem 1rem 0.25rem 1rem",
                      }
                    : {
                        background: "var(--comp-bubble-agent)",
                        color: "var(--comp-text)",
                        border: "1px solid var(--comp-border)",
                        borderRadius: "1rem 1rem 1rem 0.25rem",
                      }
                }
              >
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Sending indicator */}
        {sending && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div
              className="rounded-2xl px-4 py-3 flex items-center gap-1.5"
              style={{ background: "var(--comp-bubble-agent)", border: "1px solid var(--comp-border)" }}
            >
              <span
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ background: "var(--comp-accent)", animationDelay: "0ms" }}
              />
              <span
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ background: "var(--comp-accent)", animationDelay: "120ms" }}
              />
              <span
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ background: "var(--comp-accent)", animationDelay: "240ms" }}
              />
            </div>
          </motion.div>
        )}

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center"
          >
            <div
              className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs max-w-[90%]"
              style={{ background: "var(--comp-error-bg)", color: "var(--comp-error-color)", border: "1px solid var(--comp-error-border)" }}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        className="px-4 pb-6 pt-3 border-t"
        style={{ background: "var(--comp-header-bg)", borderColor: "var(--comp-border)" }}
      >
        <div className="max-w-2xl mx-auto">
          <div
            className="flex items-end gap-2 rounded-2xl border px-3.5 py-2.5"
            style={{ background: "var(--comp-input-bg)", borderColor: "var(--comp-border)" }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send)"
              rows={1}
              disabled={sending}
              className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed"
              style={{
                color: "var(--comp-text)",
                maxHeight: "120px",
                overflowY: "auto",
              }}
              aria-label="Message input"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              aria-label="Send message"
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-opacity comp-btn-primary disabled:opacity-40 shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>

          {/* HIPAA disclaimer */}
          <p className="text-center text-[11px] mt-2.5" style={{ color: "var(--comp-faint)" }}>
            <ShieldCheck className="w-3 h-3 inline mr-1 opacity-70" />
            Conversations are private and secure. For emergencies, call 911.
          </p>
        </div>
      </div>

      {/* Companion CSS variables scoped to this page */}
      <style>{`
        .companion-bg {
          background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
        }
        :root {
          --comp-text: #e8eaf6;
          --comp-muted: #9fa8da;
          --comp-faint: #5c6bc0;
          --comp-accent: #6c63ff;
          --comp-green: #4caf50;
          --comp-border: rgba(108, 99, 255, 0.2);
          --comp-header-bg: rgba(15, 15, 26, 0.85);
          --comp-bubble-agent: rgba(255, 255, 255, 0.06);
          --comp-input-bg: rgba(255, 255, 255, 0.05);
          --comp-notice-bg: rgba(108, 99, 255, 0.1);
          --comp-end-btn-bg: rgba(239, 68, 68, 0.12);
          --comp-end-btn-color: #f87171;
          --comp-error-bg: rgba(239, 68, 68, 0.1);
          --comp-error-color: #f87171;
          --comp-error-border: rgba(239, 68, 68, 0.25);
        }
        .comp-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(108, 99, 255, 0.2);
          backdrop-filter: blur(24px);
        }
        .comp-avatar {
          background: linear-gradient(135deg, #6c63ff, #a855f7);
        }
        .comp-btn-primary {
          background: linear-gradient(135deg, #6c63ff, #a855f7);
        }
      `}</style>
    </div>
  );
};

export default Companion;
