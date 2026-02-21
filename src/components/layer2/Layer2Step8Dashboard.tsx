import { motion } from "framer-motion";
import {
  ArrowLeft, CheckCircle2, AlertTriangle, OctagonAlert,
  ArrowRight, Gauge, FileWarning, Shield, ExternalLink,
  FileText, Calendar, Users,
} from "lucide-react";
import { RulePack } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Props {
  rulePack: RulePack | null;
  onBack: () => void;
  onFinish: () => void;
}

export function Layer2Step8Dashboard({ rulePack, onBack, onFinish }: Props) {
  // Mock compliance results
  const overallStatus: "compliant" | "needs_attention" | "cannot_submit" = "needs_attention";
  const capUsage = 90;

  const statusConfig = {
    compliant: { label: "✅ Compliant", description: "All checks passed. Ready to submit.", color: "text-primary", bg: "bg-primary/10", border: "border-primary/30", icon: CheckCircle2 },
    needs_attention: { label: "⚠ Needs Attention", description: "Some items require action before submission.", color: "text-warning", bg: "bg-warning/10", border: "border-warning/30", icon: AlertTriangle },
    cannot_submit: { label: "❌ Cannot Submit", description: "Hard stops prevent submission. Must resolve first.", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", icon: OctagonAlert },
  };

  const status = statusConfig[overallStatus];
  const StatusIcon = status.icon;

  const checkResults = [
    { step: "Eligibility & Prerequisites", status: "pass" as const, detail: "All requirements met" },
    { step: "PCP Alignment", status: "warning" as const, detail: "Missing employment interest language in PCP" },
    { step: "Limits & Caps", status: "warning" as const, detail: "At 90% of weekly cap (36/40 hours)" },
    { step: "Conflict Engine", status: "pass" as const, detail: "No conflicts detected" },
    { step: "Documentation", status: "fail" as const, detail: "Functional assessment expired" },
    { step: "Module Push", status: "pass" as const, detail: "All outputs pushed to iCM" },
  ];

  const missingItems = [
    { item: "PCP Service Justification — employment interest language", action: "Edit PCP", module: "PCP" },
    { item: "Functional Assessment — expired, needs renewal", action: "Upload Assessment", module: "Managed Documents" },
    { item: "Weekly cap at 90% — request additional hours or adjust", action: "Review Limits", module: "Services" },
  ];

  const statusColors = {
    pass: "text-primary bg-primary/10 border-primary/20",
    warning: "text-warning bg-warning/10 border-warning/20",
    fail: "text-destructive bg-destructive/10 border-destructive/20",
  };

  const statusIcons = {
    pass: CheckCircle2,
    warning: AlertTriangle,
    fail: OctagonAlert,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 7 — Compliance Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Final compliance status for <span className="font-medium text-foreground">{rulePack?.service_name || "selected service"}</span>. Review results and resolve any outstanding items.
        </p>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-foreground font-medium mb-0.5">Why this step?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Case managers need clarity, not long explanations. This dashboard makes it obvious what's blocking approval/billing and provides quick links to fix issues directly in the right iCM module.
          </p>
        </div>
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

        {/* Cap usage */}
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

      {/* Step-by-Step Results */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Compliance Check Results</p>
        {checkResults.map((check, i) => {
          const Icon = statusIcons[check.status];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn("flex items-center gap-3 p-3 rounded-xl border", statusColors[check.status])}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{check.step}</p>
                <p className="text-[10px] opacity-80">{check.detail}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Missing Items with Fix Links */}
      {missingItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <FileWarning className="h-3.5 w-3.5" /> Items Requiring Action
          </p>
          {missingItems.map((item, i) => (
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

      {/* At a Glance Summary */}
      <div className="p-4 rounded-xl border border-border/40 bg-muted/20">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Shield className="h-3 w-3" /> At a Glance
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
          <div className="p-2 rounded-lg bg-card border border-border/30">
            <p className="font-semibold text-foreground">Eligibility</p>
            <p className="text-muted-foreground">"Is this person allowed to get this service?"</p>
          </div>
          <div className="p-2 rounded-lg bg-card border border-border/30">
            <p className="font-semibold text-foreground">PCP Alignment</p>
            <p className="text-muted-foreground">"Does the plan justify this service?"</p>
          </div>
          <div className="p-2 rounded-lg bg-card border border-border/30">
            <p className="font-semibold text-foreground">Limits/Caps</p>
            <p className="text-muted-foreground">"Are we within allowed hours/units?"</p>
          </div>
          <div className="p-2 rounded-lg bg-card border border-border/30">
            <p className="font-semibold text-foreground">Conflict Engine</p>
            <p className="text-muted-foreground">"Billing something we can't bill alongside?"</p>
          </div>
          <div className="p-2 rounded-lg bg-card border border-border/30">
            <p className="font-semibold text-foreground">Doc Builder</p>
            <p className="text-muted-foreground">"What proof do we need to keep?"</p>
          </div>
          <div className="p-2 rounded-lg bg-card border border-border/30">
            <p className="font-semibold text-foreground">Module Push</p>
            <p className="text-muted-foreground">"Put results into iCM automatically."</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={onFinish} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
          <CheckCircle2 className="h-4 w-4" /> Complete
        </button>
      </div>
    </div>
  );
}
