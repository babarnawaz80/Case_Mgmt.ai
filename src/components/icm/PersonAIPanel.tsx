import { Sparkles, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AISuggestion, Person } from "@/data/people";

const toneStyles = {
  urgent: { wrap: "bg-icm-red-soft border-icm-red/20", chip: "bg-icm-red text-white" },
  insight: { wrap: "bg-icm-accent-soft border-icm-accent/20", chip: "bg-icm-accent text-white" },
  good: { wrap: "bg-icm-green-soft border-icm-green/20", chip: "bg-icm-green text-white" },
} as const;

interface Props {
  person: Person;
  /** Override the person-level AI suggestions (e.g. module-specific). */
  suggestions?: AISuggestion[];
  /** Optional intro line shown above suggestions. */
  intro?: string;
}

export function PersonAIPanel({ person, suggestions: override, intro }: Props) {
  const suggestions: AISuggestion[] = override ?? person.aiSuggestions ?? [];
  const count = suggestions.length;

  return (
    <aside className="w-[320px] shrink-0 border-l border-icm-border bg-icm-panel flex flex-col h-full">
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
            ?? (count > 0
              ? `I reviewed ${person.firstName}'s record and have a few items for you.`
              : `${person.firstName}'s record looks clean. Ask me anything about their care.`)}
        </p>
      </div>

      {/* Suggestions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {suggestions.map((s, i) => {
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
              <button className="mt-2 text-[11px] font-geist font-semibold text-icm-text underline-offset-2 hover:underline">
                {s.cta} →
              </button>
            </div>
          );
        })}
        {count === 0 && (
          <div className="rounded-xl border border-dashed border-icm-border p-4 text-center">
            <p className="text-[11.5px] text-icm-text-faint font-geist">No active flags.</p>
          </div>
        )}
      </div>

      {/* Sticky input */}
      <div className="p-3 border-t border-icm-border">
        <div className="flex items-center gap-2 rounded-full border border-icm-border bg-icm-bg pl-3 pr-1 py-1">
          <input
            placeholder={`Ask about ${person.firstName}…`}
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
