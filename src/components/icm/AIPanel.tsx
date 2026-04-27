import { Sparkles, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "urgent" | "insight" | "good";

interface Suggestion {
  tone: Tone;
  label: string;
  body: string;
  cta: string;
}

const suggestions: Suggestion[] = [
  {
    tone: "urgent",
    label: "Urgent",
    body: "Theo Lindqvist's ISP is overdue by 4 days. I drafted a renewal based on his last review.",
    cta: "Open draft",
  },
  {
    tone: "insight",
    label: "Insight",
    body: "3 progress notes from yesterday are pending your signature.",
    cta: "Review",
  },
  {
    tone: "good",
    label: "Good news",
    body: "PCP compliance is up 6.2% this month — strongest in your region.",
    cta: "Generate",
  },
  {
    tone: "insight",
    label: "Insight",
    body: "Daniel Okafor's fall-risk score climbed to 78. Consider adding to today's agenda.",
    cta: "Add to agenda",
  },
];

const toneStyles: Record<Tone, { wrap: string; chip: string }> = {
  urgent: { wrap: "bg-icm-red-soft border-icm-red/20", chip: "bg-icm-red text-white" },
  insight: { wrap: "bg-icm-accent-soft border-icm-accent/20", chip: "bg-icm-accent text-white" },
  good: { wrap: "bg-icm-green-soft border-icm-green/20", chip: "bg-icm-green text-white" },
};

export function AIPanel() {
  return (
    <aside className="w-[320px] shrink-0 border-l border-icm-border bg-icm-panel flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-icm-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-icm-accent flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-tight font-semibold text-[13px] text-icm-text">Case Management AI</p>
            <p className="text-[11px] flex items-center gap-1 text-icm-green font-geist">
              <span className="w-1.5 h-1.5 rounded-full bg-icm-green" />
              Active · 4 suggestions
            </p>
          </div>
        </div>
        <p className="text-[12px] text-icm-text-dim font-geist mt-3 leading-relaxed">
          I reviewed your caseload and found a few things worth your time.
        </p>
      </div>

      {/* Suggestions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {suggestions.map((s, i) => {
          const tone = toneStyles[s.tone];
          return (
            <div key={i} className={cn("rounded-[12px] border p-3", tone.wrap)}>
              <span className={cn("inline-block px-1.5 py-0.5 rounded-full text-[9px] font-geist font-semibold uppercase tracking-wide", tone.chip)}>
                {s.label}
              </span>
              <p className="text-[12px] text-icm-text font-geist mt-2 leading-relaxed">{s.body}</p>
              <button className="mt-2 text-[11px] font-geist font-semibold text-icm-text underline-offset-2 hover:underline">
                {s.cta} →
              </button>
            </div>
          );
        })}
      </div>

      {/* Sticky input */}
      <div className="p-3 border-t border-icm-border">
        <div className="flex items-center gap-2 rounded-full border border-icm-border bg-icm-bg pl-3 pr-1 py-1">
          <input
            placeholder="Ask anything about your caseload…"
            className="flex-1 bg-transparent text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint outline-none"
          />
          <button className="w-7 h-7 rounded-full bg-icm-text text-icm-panel flex items-center justify-center hover:opacity-90">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
