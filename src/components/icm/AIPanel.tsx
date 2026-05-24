import { useRef, useState, useCallback, useEffect } from "react";
import { Sparkles, Send, Loader2, ChevronDown, X, RotateCcw, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { auth } from "@/lib/firebase";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tone = "urgent" | "insight" | "good";

interface Suggestion {
  tone: Tone;
  label: string;
  body: string;
  prompt: string; // what to send when clicked
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: number;
  error?: boolean;
}

// Context passed to the AI — derived from URL / props
interface ChatContext {
  page?: string;
  personId?: string;
  personName?: string;
  personRisk?: string;
  personProgram?: string;
  personCounty?: string;
  module?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FUNCTIONS_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";

const STARTER_SUGGESTIONS: Suggestion[] = [
  {
    tone: "urgent",
    label: "Urgent",
    body: "ISP renewals are coming up. Shall I draft an update checklist?",
    prompt: "Which participants have ISP renewals coming up in the next 30 days? Draft a renewal checklist.",
  },
  {
    tone: "insight",
    label: "Insight",
    body: "Help me draft a progress note for a home visit.",
    prompt: "Help me draft a professional progress note for a home visit. Ask me for the key details.",
  },
  {
    tone: "good",
    label: "Billing",
    body: "What are the most common billing codes for HCBS waiver services?",
    prompt: "What are the most commonly used Indiana Medicaid billing codes for HCBS waiver case management services? Include T-codes and unit billing.",
  },
  {
    tone: "insight",
    label: "Compliance",
    body: "What documentation do I need for a high-risk participant?",
    prompt: "What documentation is required for high-risk participants under the Indiana HCBS waiver program? List all required forms and timelines.",
  },
];

const toneStyles: Record<Tone, { wrap: string; chip: string }> = {
  urgent: { wrap: "bg-icm-red-soft border-icm-red/20", chip: "bg-icm-red text-white" },
  insight: { wrap: "bg-icm-accent-soft border-icm-accent/20", chip: "bg-icm-accent text-white" },
  good: { wrap: "bg-icm-green-soft border-icm-green/20", chip: "bg-icm-green text-white" },
};

// ── Hook: call the Cloud Function ─────────────────────────────────────────────

async function callChatAPI(
  message: string,
  history: ChatMessage[],
  context: ChatContext
): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${FUNCTIONS_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      history: history.slice(-10).map((m) => ({ role: m.role, text: m.text })),
      context,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err.error === "AI_PAUSED") throw new Error("AI features are currently paused.");
    if (err.error === "INSUFFICIENT_CREDITS") throw new Error("AI credits exhausted. Contact your admin.");
    if (err.error === "DAILY_LIMIT_REACHED") throw new Error("Daily AI limit reached. Try again tomorrow.");
    throw new Error(err.message ?? `AI error (${res.status})`);
  }

  const data = await res.json();
  return data.reply ?? "";
}

// ── Markdown renderer (lightweight — no external lib) ─────────────────────────

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-icm-bg px-1 rounded text-[11px] font-mono">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<p class="font-geist font-bold text-[12px] text-icm-text mt-3 mb-1">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="font-geist font-bold text-[13px] text-icm-text mt-3 mb-1">$1</p>')
    // Bullets
    .replace(/^- (.+)$/gm, '<li class="ml-3 list-disc">$1</li>')
    .replace(/^• (.+)$/gm, '<li class="ml-3 list-disc">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AIPanelProps {
  personId?: string;
  personName?: string;
  personRisk?: string;
  personProgram?: string;
  personCounty?: string;
  module?: string;
}

export function AIPanel({
  personId,
  personName,
  personRisk,
  personProgram,
  personCounty,
  module,
}: AIPanelProps = {}) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const context: ChatContext = {
    page: location.pathname,
    personId,
    personName,
    personRisk,
    personProgram,
    personCounty,
    module,
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading || !currentUser) return;
      setError(null);
      setShowSuggestions(false);

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: text.trim(),
        ts: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const reply = await callChatAPI(text.trim(), messages, context);
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: reply,
          ts: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errText = err instanceof Error ? err.message : "Something went wrong";
        setError(errText);
        // Add error message to chat
        const errMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: errText,
          ts: Date.now(),
          error: true,
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [loading, currentUser, messages, context]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyMessage = async (msg: ChatMessage) => {
    await navigator.clipboard.writeText(msg.text);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
    setShowSuggestions(true);
    setError(null);
    setInput("");
  };

  const hasMessages = messages.length > 0;

  return (
    <aside className="hidden lg:flex w-[320px] shrink-0 border-l border-icm-border bg-icm-panel flex-col h-full overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-icm-border shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl ai-gradient flex items-center justify-center shadow-elevated">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-manrope font-bold text-[13px] text-icm-text tracking-tight">
                Case Management AI
              </p>
              <p className="text-[11px] flex items-center gap-1 text-icm-green font-geist">
                <span className="w-1.5 h-1.5 rounded-full bg-icm-green animate-pulse" />
                {personName ? `Context: ${personName.split(" ")[0]}` : "Ready · Gemini 2.0"}
              </p>
            </div>
          </div>
          {hasMessages && (
            <button
              onClick={clearChat}
              title="Clear chat"
              className="h-7 w-7 flex items-center justify-center rounded-lg text-icm-text-faint hover:text-icm-text hover:bg-icm-bg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {personName && (
          <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-icm-accent-soft border border-icm-accent/20 flex items-center gap-1.5">
            <span className="text-[10px] font-geist font-semibold text-icm-accent uppercase tracking-wide">Context</span>
            <span className="text-[11px] font-geist text-icm-text">{personName}</span>
            {personRisk && (
              <span className={cn(
                "ml-auto text-[9px] font-geist font-bold px-1.5 py-0.5 rounded-full uppercase",
                personRisk === "High" ? "bg-icm-red text-white" :
                personRisk === "Medium" ? "bg-icm-amber text-white" :
                "bg-icm-green text-white"
              )}>
                {personRisk} Risk
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {/* Starter suggestions */}
        {showSuggestions && !hasMessages && (
          <div className="space-y-2">
            <p className="text-[11px] text-icm-text-faint font-geist px-1 mb-3">
              Ask me anything about your caseload, documentation, billing, or compliance.
            </p>
            {STARTER_SUGGESTIONS.map((s, i) => {
              const tone = toneStyles[s.tone];
              return (
                <button
                  key={i}
                  onClick={() => sendMessage(s.prompt)}
                  className={cn(
                    "w-full text-left rounded-[10px] border p-2.5 hover:brightness-95 transition-all group",
                    tone.wrap
                  )}
                >
                  <span className={cn(
                    "inline-block px-1.5 py-0.5 rounded-full text-[9px] font-geist font-semibold uppercase tracking-wide mb-1",
                    tone.chip
                  )}>
                    {s.label}
                  </span>
                  <p className="text-[11.5px] text-icm-text font-geist leading-relaxed">
                    {s.body}
                  </p>
                  <p className="text-[10px] text-icm-text-faint font-geist mt-1 group-hover:text-icm-text-dim">
                    Click to ask →
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-2",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-5 h-5 rounded-full ai-gradient flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-[12px] px-3 py-2 text-[12px] font-geist leading-relaxed relative group",
                msg.role === "user"
                  ? "bg-icm-accent text-white rounded-tr-[4px]"
                  : msg.error
                  ? "bg-icm-red-soft border border-icm-red/20 text-icm-red rounded-tl-[4px]"
                  : "bg-icm-bg border border-icm-border text-icm-text rounded-tl-[4px]"
              )}
            >
              {msg.role === "assistant" && !msg.error ? (
                <div
                  className="prose-sm"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                />
              ) : (
                <p>{msg.text}</p>
              )}
              {msg.role === "assistant" && !msg.error && (
                <button
                  onClick={() => copyMessage(msg)}
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded-md bg-icm-panel border border-icm-border text-icm-text-faint hover:text-icm-text transition-all"
                  title="Copy response"
                >
                  {copiedId === msg.id
                    ? <Check className="w-2.5 h-2.5 text-icm-green" />
                    : <Copy className="w-2.5 h-2.5" />}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-5 h-5 rounded-full ai-gradient flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
            <div className="bg-icm-bg border border-icm-border rounded-[12px] rounded-tl-[4px] px-3 py-2">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-icm-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-icm-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-icm-accent animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <div className="p-3 border-t border-icm-border shrink-0">
        {hasMessages && (
          <button
            onClick={() => setShowSuggestions((v) => !v)}
            className="w-full flex items-center justify-center gap-1 text-[10px] font-geist text-icm-text-faint hover:text-icm-text-dim mb-2 transition-colors"
          >
            <ChevronDown className={cn("w-3 h-3 transition-transform", showSuggestions && "rotate-180")} />
            {showSuggestions ? "Hide" : "Show"} quick prompts
          </button>
        )}
        {hasMessages && showSuggestions && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {["Draft progress note", "Billing help", "ISP renewal", "Compliance check"].map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                disabled={loading}
                className="px-2 py-1 text-[10px] font-geist rounded-full border border-icm-border bg-icm-bg text-icm-text-dim hover:text-icm-text hover:border-icm-accent/40 transition-colors disabled:opacity-40"
              >
                {p}
              </button>
            ))}
          </div>
        )}
        <div className={cn(
          "flex items-center gap-2 rounded-full border bg-icm-bg pl-3 pr-1 py-1 transition-colors",
          loading ? "border-icm-accent/40" : "border-icm-border focus-within:border-icm-accent/60"
        )}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={personName ? `Ask about ${personName.split(" ")[0]}…` : "Ask anything about your caseload…"}
            disabled={loading || !currentUser}
            className="flex-1 bg-transparent text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint outline-none disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading || !currentUser}
            className="w-7 h-7 rounded-full bg-icm-text text-icm-panel flex items-center justify-center hover:opacity-90 disabled:opacity-30 transition-opacity"
          >
            {loading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[9.5px] text-icm-text-faint font-geist text-center mt-1.5">
          AI responses may need review before use · Powered by Gemini
        </p>
      </div>
    </aside>
  );
}
