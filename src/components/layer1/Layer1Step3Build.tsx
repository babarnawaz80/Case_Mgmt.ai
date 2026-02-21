import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, ChevronDown, ChevronRight,
  FileText, Shield, AlertTriangle, Info, BookOpen,
} from "lucide-react";
import { RulePack } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Props {
  rulePacks: RulePack[];
  onBack: () => void;
  onNext: () => void;
}

export function Layer1Step3Build({ rulePacks, onBack, onNext }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categoryColors: Record<string, string> = {
    "Meaningful Day": "bg-primary/10 text-primary border-primary/20",
    Support: "bg-[hsl(160,45%,48%)]/10 text-[hsl(160,45%,48%)] border-[hsl(160,45%,48%)]/20",
    Residential: "bg-[hsl(270,50%,58%)]/10 text-[hsl(270,50%,58%)] border-[hsl(270,50%,58%)]/20",
    Behavioral: "bg-warning/10 text-warning border-warning/20",
    Other: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 3 — Build Rule Packs</h2>
        <p className="text-sm text-muted-foreground mt-1">
          For each service, a structured Rule Pack is created with billing unit, authorization requirements, documentation, limits, conflicts, and PCP requirements.
        </p>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-foreground font-medium mb-0.5">Why this step?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">This is the conversion from "PDF text" into "system rules." Without this, you can't automate compliance — everything remains manual.</p>
        </div>
      </div>

      <div className="space-y-2">
        {rulePacks.map((rp, i) => {
          const isExpanded = expandedId === rp.id;
          return (
            <motion.div
              key={rp.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border/40 bg-card overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : rp.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{rp.service_name}</p>
                  <p className="text-[10px] text-muted-foreground">{rp.billing_unit} · {rp.citations[0]?.section}</p>
                </div>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", categoryColors[rp.service_category] || categoryColors.Other)}>
                  {rp.service_category}
                </span>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-[10px] text-destructive font-medium">{rp.hard_stops.length} stops</span>
                  <span className="text-[10px] text-warning font-medium">{rp.warnings.length} warn</span>
                </div>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-border/40 p-4">
                  <div className="grid sm:grid-cols-2 gap-3 text-[11px]">
                    <RuleSection icon={<BookOpen className="h-3.5 w-3.5" />} title="Eligibility" items={rp.eligibility_rules.map((r) => r.rule_text)} />
                    <RuleSection icon={<FileText className="h-3.5 w-3.5" />} title="PCP Requirements" items={rp.pcp_requirements.map((r) => r.rule_text)} />
                    <RuleSection icon={<Shield className="h-3.5 w-3.5" />} title="Authorization" items={rp.authorization_requirements.map((r) => r.rule_text)} />
                    <RuleSection icon={<Info className="h-3.5 w-3.5" />} title="Documentation" items={rp.documentation_requirements.map((r) => r.rule_text)} />
                    <RuleSection icon={<AlertTriangle className="h-3.5 w-3.5" />} title="Hard Stops" items={rp.hard_stops.map((r) => r.rule_text)} color="text-destructive" />
                    <RuleSection icon={<AlertTriangle className="h-3.5 w-3.5" />} title="Warnings" items={rp.warnings.map((r) => r.rule_text)} color="text-warning" />
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-semibold">Citation:</span> {rp.citations[0]?.text} ({rp.citations[0]?.page}, {rp.citations[0]?.section})
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
          Normalize & De-duplicate <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function RuleSection({ icon, title, items, color }: { icon: React.ReactNode; title: string; items: string[]; color?: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/20 border border-border/30">
      <p className={cn("text-[10px] font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1.5", color || "text-muted-foreground")}>
        {icon} {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-[11px] text-foreground">• {item}</li>
        ))}
      </ul>
    </div>
  );
}
