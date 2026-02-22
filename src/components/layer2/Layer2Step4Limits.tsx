import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Gauge, OctagonAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { RulePack } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Props {
  rulePack: RulePack | null;
  onBack: () => void;
  onNext: () => void;
}

interface CapResult {
  name: string;
  current: number;
  max: number;
  unit: string;
  status: "ok" | "warning" | "hard_stop";
}

export function Layer2Step4Limits({ rulePack, onBack, onNext }: Props) {
  const [caps, setCaps] = useState<CapResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = () => {
    setIsChecking(true);
    const items: CapResult[] = [
      { name: "Daily Cap", current: 6, max: 8, unit: "hours", status: "ok" },
      { name: "Weekly Cap", current: 36, max: 40, unit: "hours", status: "warning" },
      { name: "Plan-Year Limit", current: 1200, max: 1560, unit: "hours", status: "ok" },
      { name: "Combined Service Cap", current: 42, max: 48, unit: "hours/week", status: "warning" },
    ];
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= items.length) { clearInterval(interval); setIsChecking(false); return; }
      const current = items[idx];
      idx++;
      setCaps((prev) => [...prev, current]);
    }, 500);
  };

  const noHardStops = caps.length > 0 && !caps.some((c) => c.status === "hard_stop");
  const statusConfig = {
    ok: { icon: CheckCircle2, color: "text-primary", bg: "bg-primary/5", border: "border-primary/20", bar: "bg-primary" },
    warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/5", border: "border-warning/20", bar: "bg-warning" },
    hard_stop: { icon: OctagonAlert, color: "text-destructive", bg: "bg-destructive/5", border: "border-destructive/20", bar: "bg-destructive" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 4 — Limits & Caps Engine</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Calculates whether requested hours/units for <span className="font-medium text-foreground">{rulePack?.service_name}</span> violate daily, weekly, or plan-year caps.
        </p>
        <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Data Source:</span>
          <span className="text-[11px] text-foreground font-medium">Authorization + Utilization Records</span>
        </div>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-foreground font-medium mb-0.5">Why this step?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">Even if the service is valid, you can still get denied if you exceed caps. This step prevents over-authorizing and over-billing. <span className="italic text-muted-foreground/80">"Are we asking for too much compared to what's allowed?"</span></p>
        </div>
      </div>

      {caps.length === 0 && (
        <div className="flex justify-center">
          <button onClick={handleCheck} disabled={isChecking} className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {isChecking ? <><Loader2 className="h-4 w-4 animate-spin" /> Calculating caps...</> : <><Gauge className="h-4 w-4" /> Calculate Service Caps</>}
          </button>
        </div>
      )}

      {caps.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {caps.map((cap, i) => {
            const pct = Math.round((cap.current / cap.max) * 100);
            const cfg = statusConfig[cap.status];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn("p-4 rounded-xl border", cfg.bg, cfg.border)}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", cfg.color)} />
                    {cap.name}
                  </p>
                  <span className={cn("text-sm font-bold", cfg.color)}>{pct}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden mb-1.5">
                  <div className={cn("h-full rounded-full transition-all", cfg.bar)} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground">{cap.current} of {cap.max} {cap.unit} used</p>
                {cap.status === "warning" && <p className="text-[10px] text-warning mt-1">⚠ Approaching limit — at {pct}% utilization</p>}
                {cap.status === "hard_stop" && <p className="text-[10px] text-destructive mt-1">❌ Hard Stop — cap exceeded. Submission blocked.</p>}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {noHardStops && (
          <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            Conflict Engine <ArrowRight className="h-4 w-4" />
          </button>
        )}
        {caps.some((c) => c.status === "hard_stop") && (
          <p className="text-xs text-destructive font-medium">❌ Hard stop — reduce hours before proceeding</p>
        )}
      </div>
    </div>
  );
}
