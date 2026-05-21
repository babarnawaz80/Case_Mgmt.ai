import { useState } from "react";
import { Sparkles, Send, FileText, Loader2, ClipboardList, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AISuggestion, Person } from "@/data/people";
import { demoToast, demoSuccess } from "@/lib/demoToast";

const toneStyles = {
  urgent: { wrap: "bg-icm-red-soft border-icm-red/20", chip: "bg-icm-red text-white" },
  insight: { wrap: "bg-icm-accent-soft border-icm-accent/20", chip: "bg-icm-accent text-white" },
  good: { wrap: "bg-icm-green-soft border-icm-green/20", chip: "bg-icm-green text-white" },
} as const;

interface Props {
  person: Person;
  suggestions?: AISuggestion[];
  intro?: string;
}

type DocNode = {
  id: string;
  name: string;
  type: "folder" | "file";
  parentId: string | null;
  updatedAt?: string;
  size?: number;
  mime?: string;
};

type ChatMsg = { role: "user" | "ai"; content: string; sources?: string[] };

function loadDocs(personId: string): DocNode[] {
  try {
    const raw = localStorage.getItem(`cm_ai_docs_${personId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function generateSummary(person: Person): ChatMsg {
  const docs = loadDocs(person.id).filter((n) => n.type === "file");
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = docs.filter((d) => {
    const t = d.updatedAt ? new Date(d.updatedAt).getTime() : 0;
    return t >= cutoff;
  });
  // Fallback: if no timestamps qualify, pretend the seeded ones were ingested recently
  const considered = recent.length > 0 ? recent : docs.slice(0, 8);
  const sources = considered.map((d) => d.name);

  const first = person.firstName;
  const body = [
    `**30-day chart summary for ${person.firstName} ${person.lastName}**`,
    ``,
    `I reviewed **${considered.length} document${considered.length === 1 ? "" : "s"}** scanned into Managed Documents over the last 30 days, plus eChart vitals, progress notes, and active plans.`,
    ``,
    `**Clinical**`,
    `• PCP is current — annual review signed and on file.`,
    `• Medication list reconciled; no new prescriptions this period.`,
    `• Allergies and special instructions unchanged.`,
    ``,
    `**Plans & assessments**`,
    `• Person-Centered Plan on track; next ISP due in ~3 weeks.`,
    `• SIS assessment from 2025 still within reauthorization window.`,
    ``,
    `**Activity (last 30 days)**`,
    `• 3 progress notes, 1 visit summary, 0 incidents.`,
    `• Risk score steady at 22 (Low).`,
    ``,
    `**Recommended next steps for ${first}**`,
    `1. Confirm guardianship contact info before next ISP.`,
    `2. Schedule annual physical (last on file > 11 months ago).`,
    `3. Review behavior support plan with team at next meeting.`,
  ].join("\n");

  return { role: "ai", content: body, sources };
}

function renderMarkdown(text: string) {
  // very small markdown: **bold** + line breaks + bullets
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <strong key={j} className="text-icm-text font-semibold">{p.slice(2, -2)}</strong>
      ) : (
        <span key={j}>{p}</span>
      ),
    );
    return (
      <p key={i} className={cn("leading-relaxed", line === "" && "h-2")}>
        {parts}
      </p>
    );
  });
}

export function PersonAIPanel({ person, suggestions: override, intro }: Props) {
  const suggestions: AISuggestion[] = override ?? person.aiSuggestions ?? [];
  const count = suggestions.length;
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");

  function handleSummarize() {
    if (loading) return;
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Summarize this chart (last 30 days)." },
    ]);
    setTimeout(() => {
      setMessages((prev) => [...prev, generateSummary(person)]);
      setLoading(false);
    }, 1100);
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    demoSuccess("Message sent to AI");
  }

  return (
    <aside className="hidden lg:flex w-[340px] shrink-0 border-l border-icm-border bg-icm-panel flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-icm-border">
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
              {count > 0 ? `Active · ${count} suggestion${count > 1 ? "s" : ""}` : "Standing by"}
            </p>
          </div>
        </div>
        <p className="text-[12px] text-icm-text-dim font-geist mt-3 leading-relaxed">
          {intro
            ?? (messages.length > 0
              ? `Reviewing ${person.firstName}'s chart and Managed Documents.`
              : count > 0
                ? `I reviewed ${person.firstName}'s record and have a few items for you.`
                : `${person.firstName}'s record looks clean. Ask me anything about their care.`)}
        </p>

        {/* Quick actions */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            onClick={handleSummarize}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-geist font-semibold ai-gradient text-white shadow-elevated hover:opacity-95 disabled:opacity-60 transition"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Summarize chart
          </button>
          <button
            onClick={() => demoToast("Drafting visit note…")}
            className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-geist font-medium border border-icm-border bg-icm-bg text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong transition"
          >
            <ClipboardList className="w-3 h-3" />
            Draft note
          </button>
        </div>
      </div>

      {/* Body: chat messages + suggestions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-icm-text text-icm-panel px-3 py-2 text-[12px] font-geist">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="space-y-2">
              <div className="text-[12px] font-geist text-icm-text space-y-1">
                {renderMarkdown(m.content)}
              </div>
              {m.sources && m.sources.length > 0 && (
                <div className="rounded-lg border border-icm-border bg-icm-bg p-2">
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1.5">
                    Sources · Managed Documents
                  </p>
                  <ul className="space-y-1">
                    {m.sources.slice(0, 6).map((s, j) => (
                      <li key={j} className="flex items-center gap-1.5 text-[11px] text-icm-text-dim font-geist">
                        <FileText className="w-3 h-3 shrink-0 text-icm-accent" />
                        <span className="truncate">{s}</span>
                      </li>
                    ))}
                    {m.sources.length > 6 && (
                      <li className="text-[10.5px] text-icm-text-faint font-geist pl-4">
                        +{m.sources.length - 6} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ),
        )}

        {loading && (
          <div className="flex items-center gap-2 text-[11.5px] text-icm-text-faint font-geist">
            <Loader2 className="w-3 h-3 animate-spin" />
            Reading chart and last 30 days of documents…
          </div>
        )}

        {messages.length === 0 && suggestions.map((s, i) => {
          const tone = toneStyles[s.tone];
          return (
            <div key={i} className={cn("rounded-xl border p-3", tone.wrap)}>
              <span
                className={cn(
                  "inline-block px-1.5 py-0.5 rounded-full text-[9px] font-geist font-semibold uppercase tracking-wide",
                  tone.chip,
                )}
              >
                {s.label}
              </span>
              <p className="text-[12px] text-icm-text font-geist mt-2 leading-relaxed">{s.body}</p>
              <button
                onClick={() => demoToast(s.cta)}
                className="mt-2 text-[11px] font-geist font-semibold text-icm-text underline-offset-2 hover:underline"
              >
                {s.cta} →
              </button>
            </div>
          );
        })}

        {messages.length === 0 && count === 0 && (
          <div className="rounded-xl border border-dashed border-icm-border p-4 text-center">
            <p className="text-[11.5px] text-icm-text-faint font-geist">
              No active flags. Try “Summarize chart”.
            </p>
          </div>
        )}
      </div>

      {/* Sticky input */}
      <div className="p-3 border-t border-icm-border">
        <div className="flex items-center gap-2 rounded-full border border-icm-border bg-icm-bg pl-3 pr-1 py-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={`Ask about ${person.firstName}…`}
            className="flex-1 bg-transparent text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint outline-none"
          />
          <button
            onClick={handleSend}
            className="w-7 h-7 rounded-full bg-icm-text text-icm-panel flex items-center justify-center hover:opacity-90"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
