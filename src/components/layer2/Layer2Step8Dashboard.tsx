import { motion } from "framer-motion";
import {
  ArrowLeft, CheckCircle2, AlertTriangle, OctagonAlert,
  ArrowRight, Gauge, Shield,
} from "lucide-react";
import { RulePack } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Props {
  rulePack: RulePack | null;
  onBack: () => void;
  onFinish: () => void;
}

export function Layer2Step8Dashboard({ rulePack, onBack, onFinish }: Props) {
  const overallStatus: "compliant" | "needs_attention" | "cannot_submit" = "needs_attention";
  const capUsage = 90;

  const statusConfig = {
    compliant: { label: "✅ Compliant", description: "All checks passed. Ready to submit.", color: "text-primary", bg: "bg-primary/10", border: "border-primary/30", icon: CheckCircle2 },
    needs_attention: { label: "⚠ Needs Attention", description: "Some items require action before submission.", color: "text-warning", bg: "bg-warning/10", border: "border-warning/30", icon: AlertTriangle },
    cannot_submit: { label: "❌ Cannot Submit", description: "Hard stops prevent submission. Must resolve first.", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", icon: OctagonAlert },
  };

  const status = statusConfig[overallStatus];
  const StatusIcon = status.icon;

  // Summarized status only — detailed findings shown in individual steps
  const checkSummary = [
    { step: "Eligibility & Prerequisites", status: "pass" as const },
    { step: "PCP Alignment", status: "warning" as const },
    { step: "Limits & Caps", status: "warning" as const },
    { step: "Conflict Engine", status: "pass" as const },
    { step: "Documentation", status: "fail" as const },
    { step: "Module Push", status: "pass" as const },
  ];

  // Actionable items only — no duplicated warnings
  const actionableItems = [
    { item: "PCP Service Justification — employment interest language", action: "Edit PCP", module: "PCP" },
    { item: "Functional Assessment — expired, needs renewal", action: "Upload Assessment", module: "Managed Documents" },
  ];

  const statusIcons = {
    pass: CheckCircle2,
    warning: AlertTriangle,
    fail: OctagonAlert,
  };

  const statusColors = {
    pass: "text-primary",
    warning: "text-warning",
    fail: "text-destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 8 — Compliance Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Final compliance summary for <span className="font-medium text-foreground">{rulePack?.service_name || "selected service"}</span>. Detailed findings are available in each step above.
        </p>
      </div>

      {/* Overall Status */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={cn("p-5 rounded-xl border", status.bg, status.border)}>
        <div className="flex items-center gap-3 mb-3">
          <StatusIcon className={cn("h-7 w-7", status.color)} />
          <div>
            <p className={cn("text-lg font-display font-bold", status.color)}>{status.label}</p>
            <p className="text-xs text-muted-foreground">{status.description}</p>
          </div>
        </div>

        {/* Cap usage — shown here only, not duplicated */}
        <div className="mt-3 p-3 rounded-lg bg-card border border-border/40">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-muted-foreground" /> Cap Usage
            </p>
            <span className={cn("text-xs font-bold", capUsage > 85 ? "text-warning" : "text-primary")}>{capUsage}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", capUsage > 85 ? "bg-warning" : "bg-primary")} style={{ width: `${capUsage}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">36 of 40 weekly hours used</p>
        </div>
      </motion.div>

      {/* Summarized Check Results — no detail duplication */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summary</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {checkSummary.map((check, i) => {
            const Icon = statusIcons[check.status];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2 p-3 rounded-xl border border-border/40 bg-card"
              >
                <Icon className={cn("h-4 w-4 shrink-0", statusColors[check.status])} />
                <p className="text-xs font-medium text-foreground">{check.step}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Actionable Items Only — no warnings duplicated from steps */}
      {actionableItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Action Required
          </p>
          {actionableItems.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-warning/20 bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{item.item}</p>
                <p className="text-[10px] text-muted-foreground">Module: {item.module}</p>
              </div>
              <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warning/10 hover:bg-warning/20 text-xs font-medium text-warning transition-all shrink-0">
                {item.action} <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={onFinish} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
          <CheckCircle2 className="h-4 w-4" /> Complete Run
        </button>
      </div>
    </div>
  );
}
