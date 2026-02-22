import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, CheckCircle2, AlertTriangle, XCircle, FileText } from "lucide-react";
import { RulePack } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Props {
  rulePack: RulePack | null;
  onBack: () => void;
  onNext: () => void;
}

interface PCPCheck {
  requirement: string;
  status: "pass" | "warning" | "fail";
  detail: string;
  autoAction?: string;
}

export function Layer2Step3PCP({ rulePack, onBack, onNext }: Props) {
  const [checks, setChecks] = useState<PCPCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = () => {
    setIsChecking(true);
    const items: PCPCheck[] = [
      { requirement: "Service justification in PCP", status: "pass", detail: "Service justification narrative found in PCP section 4.2" },
      { requirement: "Employment interest language", status: "warning", detail: "Employment interest language not found in current PCP", autoAction: "PCP Addendum Draft generated and pushed to PCP module" },
      { requirement: "SMART goals documented", status: "pass", detail: "3 SMART goals identified — all properly formatted" },
      { requirement: "Behavioral trigger documentation", status: "pass", detail: "Behavioral triggers documented in BSP section" },
      { requirement: "Team certification current", status: "warning", detail: "1 team member certification expires in 28 days", autoAction: "Workflow task created: 'Certification Renewal Required'" },
    ];
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= items.length) { clearInterval(interval); setIsChecking(false); return; }
      const current = items[idx];
      idx++;
      setChecks((prev) => [...prev, current]);
    }, 500);
  };

  const noHardFails = checks.length > 0 && !checks.some((c) => c.status === "fail");
  const statusIcon = { pass: CheckCircle2, warning: AlertTriangle, fail: XCircle };
  const statusColor = { pass: "text-primary", warning: "text-warning", fail: "text-destructive" };
  const statusBg = { pass: "bg-primary/5 border-primary/20", warning: "bg-warning/5 border-warning/20", fail: "bg-destructive/5 border-destructive/20" };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 3 — PCP Alignment Check</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Confirms the Person-Centered Plan supports <span className="font-medium text-foreground">{rulePack?.service_name}</span>: justification, goals, and required language.
        </p>
        <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Data Source:</span>
          <span className="text-[11px] text-foreground font-medium">PCP Module</span>
        </div>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-foreground font-medium mb-0.5">Why this step?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">Many state rules require the PCP to justify the service. If the PCP doesn't support it, it can fail authorization or audit review — even if services were delivered. <span className="italic text-muted-foreground/80">"Does the plan explain why we're doing this service?"</span></p>
        </div>
      </div>

      {checks.length === 0 && (
        <div className="flex justify-center">
          <button onClick={handleCheck} disabled={isChecking} className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {isChecking ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning PCP...</> : <><Sparkles className="h-4 w-4" /> Run PCP Alignment Check</>}
          </button>
        </div>
      )}

      {checks.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {checks.map((check, i) => {
            const Icon = statusIcon[check.status];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn("p-3 rounded-xl border", statusBg[check.status])}
              >
                <div className="flex items-start gap-2.5">
                  <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", statusColor[check.status])} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">{check.requirement}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{check.detail}</p>
                    {check.autoAction && (
                      <div className="mt-2 flex items-center gap-1.5 p-2 rounded-lg bg-card border border-border/40">
                        <FileText className="h-3 w-3 text-primary shrink-0" />
                        <p className="text-[10px] text-primary font-medium">{check.autoAction}</p>
                      </div>
                    )}
                  </div>
                  <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", 
                    check.status === "pass" ? "bg-primary/10 text-primary" : check.status === "warning" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                  )}>{check.status}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {noHardFails && (
          <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            Limits & Caps <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
