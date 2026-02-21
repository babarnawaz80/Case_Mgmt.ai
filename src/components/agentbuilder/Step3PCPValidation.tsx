import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  ArrowLeft,
  FileText,
  ClipboardCheck,
  Target,
  Users,
  Briefcase,
  Shield,
} from "lucide-react";
import { PCPValidationItem, RulePack } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Step3Props {
  rulePacks: RulePack[];
  onBack: () => void;
  onNext: () => void;
}

const initialChecks: PCPValidationItem[] = [
  { id: "pcp-1", label: "Service Justification", description: "Required narrative justifying the need for each authorized service", status: "pending" },
  { id: "pcp-2", label: "Employment Interest Language", description: "Must include individual's employment preferences and vocational goals", status: "pending" },
  { id: "pcp-3", label: "Behavioral Trigger Documentation", description: "Known triggers, de-escalation strategies, and behavioral patterns documented", status: "pending" },
  { id: "pcp-4", label: "SMART Goal Presence", description: "All goals must be Specific, Measurable, Achievable, Relevant, and Time-bound", status: "pending" },
  { id: "pcp-5", label: "Team Certification Requirement", description: "All team members must have current certification documented in PCP", status: "pending" },
];

const statusIcons = {
  pass: <CheckCircle2 className="h-4 w-4 text-primary" />,
  fail: <XCircle className="h-4 w-4 text-destructive" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning" />,
  pending: <div className="h-4 w-4 rounded-full border-2 border-border" />,
};

const statusLabels = {
  pass: "Passed",
  fail: "Failed — Auto-action created",
  warning: "Warning — Review needed",
  pending: "Not checked",
};

const checkIcons = [Target, Briefcase, Shield, ClipboardCheck, Users];

export function Step3PCPValidation({ rulePacks, onBack, onNext }: Step3Props) {
  const [checks, setChecks] = useState<PCPValidationItem[]>(initialChecks);
  const [isValidating, setIsValidating] = useState(false);
  const [validated, setValidated] = useState(false);

  const handleValidate = () => {
    setIsValidating(true);
    // Simulate sequential validation
    const results: Array<PCPValidationItem["status"]> = ["pass", "fail", "pass", "warning", "fail"];
    const autoActions = [
      undefined,
      "Auto-generate PCP addendum for service justification → Push to PCP module draft",
      undefined,
      undefined,
      "Create Workflow Manager task: Team certification renewal required",
    ];

    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= checks.length) {
        clearInterval(interval);
        setIsValidating(false);
        setValidated(true);
        return;
      }
      setChecks((prev) =>
        prev.map((c, i) =>
          i === idx ? { ...c, status: results[i], autoAction: autoActions[i] } : c
        )
      );
      idx++;
    }, 700);
  };

  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warning").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 3 — PCP Validation</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Validates Person-Centered Plan compliance. Missing items trigger auto-generated addendum text, PCP module drafts, and Workflow Manager tasks.
        </p>
      </div>

      {/* Validation checklist */}
      <div className="space-y-3">
        {checks.map((check, i) => {
          const Icon = checkIcons[i % checkIcons.length];
          return (
            <motion.div
              key={check.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "rounded-xl border bg-card p-4 transition-all",
                check.status === "fail" && "border-destructive/30 bg-destructive/5",
                check.status === "warning" && "border-warning/30 bg-warning/5",
                check.status === "pass" && "border-primary/30 bg-primary/5",
                check.status === "pending" && "border-border/60"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">{check.label}</h4>
                    <div className="flex items-center gap-1.5">
                      {statusIcons[check.status]}
                      <span className={cn(
                        "text-[11px] font-medium",
                        check.status === "pass" && "text-primary",
                        check.status === "fail" && "text-destructive",
                        check.status === "warning" && "text-warning",
                        check.status === "pending" && "text-muted-foreground"
                      )}>
                        {statusLabels[check.status]}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{check.description}</p>
                  {check.autoAction && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-2 p-2.5 rounded-lg bg-card border border-border/60"
                    >
                      <p className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-primary" />
                        Auto-Action
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{check.autoAction}</p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Run validation */}
      {!validated && (
        <div className="flex justify-center">
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60"
          >
            {isValidating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Validating PCP requirements...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Run PCP Validation</>
            )}
          </button>
        </div>
      )}

      {/* Summary + navigation */}
      {validated && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">{passCount} Passed</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-foreground">{failCount} Failed</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="font-medium text-foreground">{warnCount} Warnings</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
              Continue to Limits Engine <span className="text-lg">→</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
