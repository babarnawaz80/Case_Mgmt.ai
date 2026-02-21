import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, CheckCircle2, XCircle, ClipboardList } from "lucide-react";
import { RulePack } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Props {
  rulePack: RulePack | null;
  onBack: () => void;
  onNext: () => void;
}

interface CheckItem {
  rule: string;
  status: "pass" | "fail";
  detail: string;
  taskCreated?: string;
}

export function Layer2Step2Eligibility({ rulePack, onBack, onNext }: Props) {
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = () => {
    setIsChecking(true);
    const items: CheckItem[] = [
      { rule: "Active HCBS waiver enrollment", status: "pass", detail: "Waiver enrollment verified — active through 12/2026" },
      { rule: "Current Level of Care assessment", status: "pass", detail: "LOC assessment dated 11/15/2025 — valid" },
      { rule: "Age eligibility criteria", status: "pass", detail: "Participant age 34 — meets adult waiver criteria" },
      { rule: "Prerequisite funding exploration", status: "pass", detail: "Funding exploration documented on 10/01/2025" },
      { rule: "School enrollment restriction check", status: "pass", detail: "Not enrolled in school — no restriction" },
      ...(rulePack?.prerequisite_requirements.map((r) => ({
        rule: r.rule_text,
        status: "pass" as const,
        detail: "Requirement verified on file",
      })) || []),
    ];
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= items.length) { clearInterval(interval); setIsChecking(false); return; }
      const current = items[idx];
      idx++;
      setChecks((prev) => [...prev, current]);
    }, 400);
  };

  const allPass = checks.length > 0 && checks.every((c) => c.status === "pass");
  const hasFail = checks.some((c) => c.status === "fail");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 2 — Eligibility & Prerequisites</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Checks if the individual qualifies for <span className="font-medium text-foreground">{rulePack?.service_name}</span> and whether required prerequisites are met.
        </p>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-foreground font-medium mb-0.5">Why this step?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">If eligibility or prerequisites aren't met, the authorization can be denied or the service billed incorrectly. This step prevents "starting off wrong." <span className="italic text-muted-foreground/80">In plain terms: "Is this person allowed to receive this service?"</span></p>
        </div>
      </div>

      {checks.length === 0 && (
        <div className="flex justify-center">
          <button onClick={handleCheck} disabled={isChecking} className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {isChecking ? <><Loader2 className="h-4 w-4 animate-spin" /> Running eligibility checks...</> : <><Sparkles className="h-4 w-4" /> Run Eligibility Check</>}
          </button>
        </div>
      )}

      {checks.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {checks.map((check, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border",
                check.status === "pass" ? "border-primary/20 bg-primary/5" : "border-destructive/20 bg-destructive/5"
              )}
            >
              {check.status === "pass" ? (
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{check.rule}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{check.detail}</p>
                {check.taskCreated && (
                  <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                    <ClipboardList className="h-3 w-3" /> Task created: {check.taskCreated}
                  </p>
                )}
              </div>
              <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", check.status === "pass" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
                {check.status}
              </span>
            </motion.div>
          ))}

          {allPass && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> All eligibility checks passed
              </p>
            </motion.div>
          )}
        </motion.div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {allPass && (
          <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            PCP Alignment <ArrowRight className="h-4 w-4" />
          </button>
        )}
        {hasFail && (
          <p className="text-xs text-destructive font-medium">❌ Hard stop — resolve failed checks before proceeding</p>
        )}
      </div>
    </div>
  );
}
