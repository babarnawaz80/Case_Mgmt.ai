import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ShieldCheck, Phone, Loader2, AlertTriangle, Heart } from "lucide-react";
import brandLogo from "@/assets/casemanagement-ai-logo.png";

const API_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";

type Role = "agent" | "user";

interface Message {
  id: string;
  role: Role;
  text: string;
}

// ── Shared CSS for ALL companion screens ─────────────────────────────────────
const COMPANION_STYLES = `
  .companion-bg {
    background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
    min-height: 100vh;
  }
  .companion-root {
    --comp-text: #e8eaf6;
    --comp-muted: #9fa8da;
    --comp-faint: #5c6bc0;
    --comp-accent: #6c63ff;
    --comp-green: #4caf50;
    --comp-border: rgba(108, 99, 255, 0.22);
    --comp-header-bg: rgba(15, 15, 26, 0.9);
    --comp-bubble-agent: rgba(255, 255, 255, 0.07);
    --comp-input-bg: rgba(255, 255, 255, 0.05);
    --comp-notice-bg: rgba(108, 99, 255, 0.12);
    --comp-end-btn-bg: rgba(239, 68, 68, 0.12);
    --comp-end-btn-color: #f87171;
    --comp-error-bg: rgba(239, 68, 68, 0.1);
    --comp-error-color: #f87171;
    --comp-error-border: rgba(239, 68, 68, 0.25);
  }
  .comp-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(108, 99, 255, 0.22);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }
  .comp-avatar {
    background: linear-gradient(135deg, #6c63ff, #a855f7);
    box-shadow: 0 0 20px rgba(108, 99, 255, 0.35);
  }
  .comp-btn-primary {
    background: linear-gradient(135deg, #6c63ff, #a855f7);
    box-shadow: 0 4px 15px rgba(108, 99, 255, 0.35);
  }
  .comp-bubble-user {
    background: linear-gradient(135deg, #6c63ff, #a855f7);
    border-radius: 1.15rem 1.15rem 0.25rem 1.15rem;
  }
  .comp-bubble-agent {
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(108, 99, 255, 0.2);
    border-radius: 1.15rem 1.15rem 1.15rem 0.25rem;
  }
  /* Scrollbar */
  .comp-messages::-webkit-scrollbar { width: 4px; }
  .comp-messages::-webkit-scrollbar-track { background: transparent; }
  .comp-messages::-webkit-scrollbar-thumb { background: rgba(108,99,255,0.25); border-radius: 2px; }
  /* Dot animation stagger */
  .dot-1 { animation-delay: 0ms; }
  .dot-2 { animation-delay: 150ms; }
  .dot-3 { animation-delay: 300ms; }
  @keyframes dotBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
    30% { transform: translateY(-5px); opacity: 1; }
  }
  .typing-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: rgba(108,99,255,0.7);
    animation: dotBounce 1.2s infinite;
    display: inline-block;
  }
`;

const Companion = () => {
  const { token } = useParams<{ token: string }>();

  // PUBLIC page — no Firebase auth. Backend validates via companion_token.
  const [firstName, setFirstName] = useState("Friend");

  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (started) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [started]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMessage: Message = { id: `u-${Date.now()}`, role: "user", text };
    const history = messages.map((m) => ({ role: m.role === "agent" ? "assistant" : "user", text: m.text }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/care-assistant/${token}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data = await res.json();
      const replyText: string = data.reply ?? data.message ?? data.text ?? "I'm here to listen. Can you tell me more?";
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "agent", text: replyText }]);
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

  // ── Always inject styles ───────────────────────────────────────────────────
  const styles = <style>{COMPANION_STYLES}</style>;

  // ── Consent / welcome screen ───────────────────────────────────────────────
  if (!started) {
    return (
      <div className="companion-root companion-bg flex items-center justify-center p-6">
        {styles}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="comp-card w-full max-w-md rounded-3xl p-7 text-center space-y-5"
        >
          <img src={brandLogo} alt="CaseManagement AI" className="h-8 mx-auto opacity-90" />

          {/* Avatar */}
          <div className="flex flex-col items-center gap-3 pt-1">
            <div className="w-20 h-20 rounded-full comp-avatar flex items-center justify-center relative">
              <Heart className="w-9 h-9 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#4caf50] border-2 border-[#0f0f1a]" />
            </div>
            <div>
              <h1 className="font-display text-[26px] font-bold leading-tight" style={{ color: "var(--comp-text)" }}>
                Hi {firstName} 👋
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--comp-muted)" }}>
                Your AI Care Companion is ready
              </p>
            </div>
          </div>

          <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--comp-muted)" }}>
            Your case manager invited you to use your private AI companion. You can share how you're feeling,
            ask questions, or just check in. Your conversations help your care team support you better.
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
            onClick={() => {
              setStarted(true);
              // Add the opening welcome message
              setMessages([{ id: "welcome", role: "agent", text: `Hi ${firstName}! I'm your Care Companion. I'm here whenever you want to check in. How are you doing today?` }]);
            }}
            className="comp-btn-primary w-full h-12 rounded-2xl font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
          >
            Start Conversation
          </button>

          <p className="text-[11px]" style={{ color: "var(--comp-faint)" }}>
            🔒 Private & secure · For emergencies, call 911
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Active chat ────────────────────────────────────────────────────────────
  return (
    <div className="companion-root companion-bg flex flex-col" style={{ minHeight: "100dvh" }}>
      {styles}

      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-3 border-b shrink-0"
        style={{ background: "var(--comp-header-bg)", borderColor: "var(--comp-border)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full comp-avatar flex items-center justify-center shrink-0 relative">
            <Heart className="w-4 h-4 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#4caf50] border-2 border-[#0f0f1a]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-tight" style={{ color: "var(--comp-text)" }}>
              AI Care Companion
            </p>
            <p className="text-[11px] leading-none flex items-center gap-1.5" style={{ color: "var(--comp-muted)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: "var(--comp-green)" }} />
              Chatting with {firstName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <img src={brandLogo} alt="CaseManagement AI" className="h-5 opacity-50" />
          <button
            onClick={handleEnd}
            title="End session"
            className="h-8 px-3 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:opacity-90"
            style={{ background: "var(--comp-end-btn-bg)", color: "var(--comp-end-btn-color)", border: "1px solid rgba(239,68,68,0.2)" }}
            aria-label="End session"
          >
            <Phone className="w-3.5 h-3.5 rotate-[135deg]" /> End
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 comp-messages" style={{ overscrollBehavior: "contain" }}>
        <div className="max-w-2xl w-full mx-auto space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* Agent avatar */}
                {m.role === "agent" && (
                  <div className="w-8 h-8 rounded-full comp-avatar flex items-center justify-center shrink-0 mt-0.5">
                    <Heart className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`px-4 py-3 text-[13.5px] max-w-[82%] leading-relaxed ${m.role === "user" ? "comp-bubble-user text-white" : "comp-bubble-agent"}`}
                  style={{ color: m.role === "user" ? "#fff" : "var(--comp-text)" }}
                >
                  {m.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {sending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2 justify-start"
            >
              <div className="w-8 h-8 rounded-full comp-avatar flex items-center justify-center shrink-0">
                <Heart className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="comp-bubble-agent px-4 py-3 flex items-center gap-1.5">
                <span className="typing-dot dot-1" />
                <span className="typing-dot dot-2" />
                <span className="typing-dot dot-3" />
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
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
      </div>

      {/* Input area */}
      <div
        className="px-4 pb-6 pt-3 border-t shrink-0"
        style={{ background: "var(--comp-header-bg)", borderColor: "var(--comp-border)", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-2xl mx-auto">
          <div
            className="flex items-end gap-2.5 rounded-2xl border px-4 py-3 transition-all focus-within:border-[rgba(108,99,255,0.5)]"
            style={{ background: "var(--comp-input-bg)", borderColor: "var(--comp-border)" }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type your message… (Enter to send)"
              rows={1}
              disabled={sending}
              className="flex-1 resize-none bg-transparent text-[13px] outline-none leading-relaxed placeholder:opacity-40"
              style={{ color: "var(--comp-text)", maxHeight: "120px", overflowY: "auto" }}
              aria-label="Message input"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              aria-label="Send message"
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all comp-btn-primary disabled:opacity-30 disabled:cursor-not-allowed shrink-0 hover:-translate-y-0.5 active:translate-y-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>

          <p className="text-center text-[11px] mt-2.5" style={{ color: "var(--comp-faint)" }}>
            <ShieldCheck className="w-3 h-3 inline mr-1 opacity-70" />
            Conversations are private and secure · For emergencies, call 911
          </p>
        </div>
      </div>
    </div>
  );
};

export default Companion;
