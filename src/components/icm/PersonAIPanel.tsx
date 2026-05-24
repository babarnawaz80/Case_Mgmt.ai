import { useRef, useState, useCallback, useEffect } from "react";
import {
  Sparkles, Send, Loader2, ClipboardList,
  Maximize2, Minimize2, RotateCcw, Copy, Check, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import type { Individual } from "@/hooks/useIndividuals";

// ── Types ─────────────────────────────────────────────────────────────────────

type ChatMsg = {
  id: string;
  role: "user" | "ai";
  content: string;
  error?: boolean;
};

interface ChatContext {
  page: string;
  personId: string;
  personName: string;
  personRisk?: string;
  personProgram?: string;
  personCounty?: string;
  module?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FUNCTIONS_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";

const QUICK_PROMPTS = [
  { label: "Summarize chart", icon: Sparkles, prompt: "Summarize this person's chart for the last 30 days including any open tasks, risks, and recommended next steps." },
  { label: "Draft note", icon: ClipboardList, prompt: "Help me draft a professional progress note for a home visit with this participant. Ask me for the key details." },
];

// ── Lightweight markdown renderer ─────────────────────────────────────────────

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="bg-icm-bg px-1 rounded text-[11px] font-mono">$1</code>')
    .replace(/^### (.+)$/gm, '<p class="font-bold text-[12px] text-icm-text mt-3 mb-1">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="font-bold text-[13px] text-icm-text mt-3 mb-1">$1</p>')
    .replace(/^[-•] (.+)$/gm, '<li class="ml-3 list-disc text-[12px]">$1</li>')
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

// ── API call ──────────────────────────────────────────────────────────────────

async function callChatAPI(
  message: string,
  history: ChatMsg[],
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
      history: history.slice(-10).map((m) => ({
        role: m.role === "ai" ? "assistant" : "user",
        text: m.content,
      })),
      context,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err.error === "AI_PAUSED") throw new Error("AI features paused for your organization.");
    if (err.error === "INSUFFICIENT_CREDITS") throw new Error("AI credits exhausted. Contact your admin.");
    if (err.error === "DAILY_LIMIT_REACHED") throw new Error("Daily AI limit reached. Try again tomorrow.");
    throw new Error(err.message ?? `AI error (${res.status})`);
  }

  const data = await res.json();
  return data.reply ?? "";
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  individual: Individual;
  module?: string;
}

export function PersonAIPanel({ individual, module }: Props) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const firstName = individual.first_name ?? "this person";
  const fullName = `${individual.first_name ?? ""} ${individual.last_name ?? ""}`.trim();

  const context: ChatContext = {
    page: "/people/echart",
    personId: individual.id,
    personName: fullName,
    personRisk: individual.risk_level,
    personProgram: individual.program,
    personCounty: individual.county,
    module,
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading || !currentUser) return;

      const userMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const reply = await callChatAPI(text.trim(), messages, context);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "ai", content: reply },
        ]);
      } catch (err) {
        const errText = err instanceof Error ? err.message : "Something went wrong";
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "ai", content: errText, error: true },
        ]);
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [loading, currentUser, messages, context]
  );

  const copyMsg = async (msg: ChatMsg) => {
    await navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
    setInput("");
  };

  const hasMessages = messages.length > 0;

  return (
    <aside
      className={cn(
        "hidden lg:flex shrink-0 border-l border-icm-border bg-icm-panel flex-col h-full transition-all duration-300 ease-out overflow-hidden",
        expanded ? "w-[520px]" : "w-[340px]"
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-icm-border shrink-0">
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
              {firstName}'s chart · Gemini 2.0
            </p>
          </div>
          <div className="flex items-center gap-1">
            {hasMessages && (
              <button
                onClick={clearChat}
                title="Clear chat"
                className="h-7 w-7 flex items-center justify-center rounded-lg text-icm-text-faint hover:text-icm-text hover:bg-icm-bg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-7 h-7 rounded-lg border border-icm-border bg-icm-bg flex items-center justify-center text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong transition"
              title={expanded ? "Collapse panel" : "Expand panel"}
            >
              {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Context pill */}
        <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-icm-accent-soft border border-icm-accent/20 flex items-center gap-2">
          <FileText className="w-3 h-3 text-icm-accent shrink-0" />
          <span className="text-[11px] font-geist text-icm-text flex-1 truncate">
            {fullName}
            {individual.program ? ` · ${individual.program}` : ""}
          </span>
          {individual.risk_level && (
            <span className={cn(
              "text-[9px] font-geist font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0",
              individual.risk_level === "High" ? "bg-icm-red text-white" :
              individual.risk_level === "Medium" ? "bg-icm-amber text-white" :
              "bg-icm-green text-white"
            )}>
              {individual.risk_level}
            </span>
          )}
        </div>

        {/* Quick-action buttons */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map(({ label, icon: Icon, prompt }) => (
            <button
              key={label}
              onClick={() => sendMessage(prompt)}
              disabled={loading || !currentUser}
              className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-geist font-semibold border border-icm-border bg-icm-bg text-icm-text-dim hover:text-icm-text hover:border-icm-accent/50 hover:bg-icm-accent-soft disabled:opacity-40 transition"
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {!hasMessages && (
          <div className="rounded-xl border border-dashed border-icm-border p-4 text-center mt-2">
            <Sparkles className="w-5 h-5 text-icm-accent mx-auto mb-2 opacity-60" />
            <p className="text-[12px] text-icm-text font-geist font-medium">
              AI ready for {firstName}
            </p>
            <p className="text-[11px] text-icm-text-faint mt-1 font-geist leading-relaxed">
              Ask me to summarize their chart, draft a note, explain a billing code, or help with compliance.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "ai" && (
              <div className="w-5 h-5 rounded-full ai-gradient flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[88%] rounded-[12px] px-3 py-2 text-[12px] font-geist leading-relaxed relative group",
                msg.role === "user"
                  ? "bg-icm-text text-icm-panel rounded-tr-[4px]"
                  : msg.error
                  ? "bg-icm-red-soft border border-icm-red/20 text-icm-red rounded-tl-[4px]"
                  : "bg-icm-bg border border-icm-border text-icm-text rounded-tl-[4px]"
              )}
            >
              {msg.role === "ai" && !msg.error ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              ) : (
                <p>{msg.content}</p>
              )}
              {msg.role === "ai" && !msg.error && (
                <button
                  onClick={() => copyMsg(msg)}
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded-md bg-icm-panel border border-icm-border text-icm-text-faint hover:text-icm-text transition-all"
                  title="Copy"
                >
                  {copiedId === msg.id
                    ? <Check className="w-2.5 h-2.5 text-icm-green" />
                    : <Copy className="w-2.5 h-2.5" />}
                </button>
              )}
            </div>
          </div>
        ))}

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

        <div ref={endRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────────────────── */}
      <div className="p-3 border-t border-icm-border shrink-0">
        <div className={cn(
          "flex items-center gap-2 rounded-full border bg-icm-bg pl-3 pr-1 py-1 transition-colors",
          loading ? "border-icm-accent/40" : "border-icm-border focus-within:border-icm-accent/60"
        )}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={`Ask about ${firstName}…`}
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
          Review AI output before using in documentation
        </p>
      </div>
    </aside>
  );
}
