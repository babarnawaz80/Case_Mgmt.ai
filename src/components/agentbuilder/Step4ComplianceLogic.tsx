import { useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  OctagonAlert,
  AlertTriangle,
  Info,
  Eye,
  GitBranch,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { GuidelinePack, RulePack } from "@/types/guidelinePack";
import { cn } from "@/lib/utils";

interface Step4Props {
  rulePacks: RulePack[];
  onBack: () => void;
  onNext: () => void;
}

type ComplianceType = "hard_stop" | "warning" | "informational" | "monitoring" | "conditional";

interface ComplianceRule {
  id: string;
  rule: string;
  source: string;
  type: ComplianceType;
  explanation: string;
}

const typeConfig: Record<ComplianceType, { label: string; icon: typeof OctagonAlert; color: string; bgColor: string; borderColor: string; description: string }> = {
  hard_stop: {
    label: "Hard Stop",
    icon: OctagonAlert,
    color: "text-destructive",
    bgColor: "bg-destructive/5",
    borderColor: "border-destructive/20",
    description: "Blocks submission entirely. Must be resolved before proceeding. Agent will cite specific regulation.",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    color: "text-warning",
    bgColor: "bg-warning/5",
    borderColor: "border-warning/20",
    description: "Allows submission but flags for review. Case manager must acknowledge before continuing.",
  },
  informational: {
    label: "Informational",
    icon: Info,
    color: "text-info",
    bgColor: "bg-info/5",
    borderColor: "border-info/20",
    description: "No action required. Provides context about applicable regulations for awareness.",
  },
  monitoring: {
    label: "Monitoring Required",
    icon: Eye,
    color: "text-primary",
    bgColor: "bg-primary/5",
    borderColor: "border-primary/20",
    description: "Creates recurring check tasks. Agent monitors ongoing compliance and alerts on drift.",
  },
  conditional: {
    label: "Conditional",
    icon: GitBranch,
    color: "text-muted-foreground",
    bgColor: "bg-muted/30",
    borderColor: "border-border",
    description: "Applies only when specific conditions are met (age, waiver type, service combination).",
  },
};

const mockRules: ComplianceRule[] = [
  { id: "cr-1", rule: "Combined service hours exceed authorized cap", source: "Limits Engine", type: "hard_stop", explanation: "State regulation §4.3.2 prohibits billing beyond authorized combined service cap. Submission is blocked until hours are reduced or exception is granted by authorization coordinator." },
  { id: "cr-2", rule: "Concurrent billing detected: PCS overlaps Day Hab", source: "Conflict Engine", type: "hard_stop", explanation: "Per billing guidelines §7.1, Personal Care Services and Day Habilitation cannot be billed during the same time period. One service must be rescheduled." },
  { id: "cr-3", rule: "Weekly service cap at 90% utilization", source: "Limits Engine", type: "warning", explanation: "Weekly hours approaching maximum. Current utilization is 36 of 40 authorized hours. Additional authorizations should be reviewed carefully." },
  { id: "cr-4", rule: "PCP missing employment interest language", source: "PCP Validation", type: "warning", explanation: "State guidelines require documentation of employment preferences. PCP addendum has been auto-generated and pushed to PCP module draft." },
  { id: "cr-5", rule: "Team certification renewal due in 30 days", source: "PCP Validation", type: "warning", explanation: "Two staff certifications expire within 30 days. Workflow task created for Program Supervisor." },
  { id: "cr-6", rule: "Service follows HCBS waiver final rule", source: "Eligibility", type: "informational", explanation: "This service is governed by the HCBS Settings Final Rule, requiring community integration and individual choice documentation." },
  { id: "cr-7", rule: "Plan-year utilization tracking active", source: "Monitoring Form", type: "informational", explanation: "Plan-year hours are being tracked. Current utilization: 1,200 of 1,560 authorized hours (77%)." },
  { id: "cr-8", rule: "Quarterly milestone review required", source: "Monitoring Form", type: "monitoring", explanation: "State requires quarterly milestone reviews. Next review scheduled based on plan start date. Agent will alert 14 days before due date." },
  { id: "cr-9", rule: "Monthly compliance check scheduled", source: "Monitoring Form", type: "monitoring", explanation: "Monthly compliance verification form will be auto-generated and assigned to case manager on the 1st of each month." },
  { id: "cr-10", rule: "EPSDT applies if participant under 21", source: "Eligibility", type: "conditional", explanation: "Early and Periodic Screening, Diagnostic, and Treatment rule expands service eligibility for participants under age 21. Additional services may be authorized." },
  { id: "cr-11", rule: "School enrollment restricts Day Hab hours", source: "Conflict Engine", type: "conditional", explanation: "If participant is enrolled in school, Day Habilitation cannot be billed during school hours. Condition checked against participant profile." },
];

export function Step4ComplianceLogic({ rulePacks, onBack, onNext }: Step4Props) {
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [expandedType, setExpandedType] = useState<ComplianceType | null>(null);

  const handleClassify = () => {
    setIsClassifying(true);
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= mockRules.length) {
        clearInterval(interval);
        setIsClassifying(false);
        return;
      }
      setRules((prev) => [...prev, mockRules[idx]]);
      idx++;
    }, 350);
  };

  const groupedRules = rules.reduce<Record<ComplianceType, ComplianceRule[]>>((acc, rule) => {
    if (!acc[rule.type]) acc[rule.type] = [];
    acc[rule.type].push(rule);
    return acc;
  }, {} as Record<ComplianceType, ComplianceRule[]>);

  const typeOrder: ComplianceType[] = ["hard_stop", "warning", "informational", "monitoring", "conditional"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 4 — Compliance Logic Types</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Every rule is categorized by enforcement type. The agent explains and cites the rule category when triggered — no guessing, always compliance-focused.
        </p>
      </div>

      {/* Type legend */}
      <div className="grid sm:grid-cols-5 gap-2">
        {typeOrder.map((type) => {
          const cfg = typeConfig[type];
          const Icon = cfg.icon;
          const count = groupedRules[type]?.length || 0;
          return (
            <div key={type} className={cn("p-3 rounded-xl border text-center", cfg.borderColor, cfg.bgColor)}>
              <Icon className={cn("h-5 w-5 mx-auto mb-1", cfg.color)} />
              <p className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</p>
              {count > 0 && <p className="text-lg font-display font-bold text-foreground mt-1">{count}</p>}
            </div>
          );
        })}
      </div>

      {rules.length === 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleClassify}
            disabled={isClassifying}
            className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60"
          >
            {isClassifying ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Classifying compliance rules...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Classify All Rules</>
            )}
          </button>
        </div>
      )}

      {rules.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {typeOrder.map((type) => {
            const items = groupedRules[type];
            if (!items || items.length === 0) return null;
            const cfg = typeConfig[type];
            const Icon = cfg.icon;
            const isExpanded = expandedType === type;

            return (
              <div key={type} className={cn("rounded-xl border overflow-hidden", cfg.borderColor)}>
                <button
                  onClick={() => setExpandedType(isExpanded ? null : type)}
                  className={cn("w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted/10", cfg.bgColor)}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", cfg.color)} />
                  <div className="flex-1">
                    <p className={cn("text-sm font-semibold", cfg.color)}>{cfg.label}</p>
                    <p className="text-[10px] text-muted-foreground">{cfg.description}</p>
                  </div>
                  <span className={cn("text-sm font-bold", cfg.color)}>{items.length}</span>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="border-t border-border/40"
                  >
                    <div className="p-4 space-y-2">
                      {items.map((rule, j) => (
                        <motion.div
                          key={rule.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: j * 0.05 }}
                          className="p-3 rounded-lg bg-card border border-border/40"
                        >
                          <div className="flex items-start gap-2 mb-1">
                            <p className="text-xs font-semibold text-foreground flex-1">{rule.rule}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">{rule.source}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{rule.explanation}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </motion.div>
      )}

      {rules.length === mockRules.length && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Agent personality note */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Agent Personality</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Professional · Compliance-focused · Clear · No guessing · Always cites rule category when blocking action
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
              Continue to PCP Validation <span className="text-lg">→</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
