import { useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Sparkles,
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  OctagonAlert,
} from "lucide-react";
import { CapLimit, RulePack } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Step4Props {
  rulePacks: RulePack[];
  onBack: () => void;
  onNext: () => void;
}

const mockCaps: CapLimit[] = [
  { id: "cap-1", name: "Daily Service Cap", type: "daily", currentValue: 6, maxValue: 8, unit: "hours", status: "ok" },
  { id: "cap-2", name: "Weekly Service Cap", type: "weekly", currentValue: 36, maxValue: 40, unit: "hours", status: "warning" },
  { id: "cap-3", name: "Combined Service Cap", type: "combined", currentValue: 42, maxValue: 40, unit: "hours", status: "hard_stop" },
  { id: "cap-4", name: "Plan-Year Limit", type: "plan_year", currentValue: 1200, maxValue: 1560, unit: "hours", status: "ok" },
  { id: "cap-5", name: "Milestone Frequency", type: "milestone", currentValue: 2, maxValue: 4, unit: "reviews/quarter", status: "ok" },
];

export function Step4LimitsEngine({ rulePacks, onBack, onNext }: Step4Props) {
  const [caps, setCaps] = useState<CapLimit[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = () => {
    setIsCalculating(true);
    setTimeout(() => {
      setCaps(mockCaps);
      setIsCalculating(false);
    }, 2500);
  };

  const getPercent = (c: CapLimit) => Math.min(100, (c.currentValue / c.maxValue) * 100);

  const statusConfig = {
    ok: { color: "bg-primary", label: "Within Limits", icon: CheckCircle2, textColor: "text-primary" },
    warning: { color: "bg-warning", label: "Approaching Limit", icon: AlertTriangle, textColor: "text-warning" },
    hard_stop: { color: "bg-destructive", label: "HARD STOP — Over Limit", icon: OctagonAlert, textColor: "text-destructive" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 4 — Limits & Cap Engine</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Calculates daily, weekly, combined service, plan-year, and milestone frequency caps. Violations trigger hard stops; approaching limits show warnings.
        </p>
      </div>

      {caps.length === 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60"
          >
            {isCalculating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Calculating service caps...</>
            ) : (
              <><Gauge className="h-4 w-4" /> Calculate Limits & Caps</>
            )}
          </button>
        </div>
      )}

      {caps.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {caps.map((cap, i) => {
            const cfg = statusConfig[cap.status];
            const StatusIcon = cfg.icon;
            const pct = getPercent(cap);
            return (
              <motion.div
                key={cap.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "rounded-xl border bg-card p-4",
                  cap.status === "hard_stop" && "border-destructive/30 bg-destructive/5",
                  cap.status === "warning" && "border-warning/30 bg-warning/5",
                  cap.status === "ok" && "border-border/60"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{cap.name}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase font-medium">{cap.type.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon className={cn("h-4 w-4", cfg.textColor)} />
                    <span className={cn("text-[11px] font-semibold", cfg.textColor)}>{cfg.label}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className={cn("h-full rounded-full", cfg.color)}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                    {cap.currentValue} / {cap.maxValue} {cap.unit}
                  </span>
                </div>
                {cap.status === "hard_stop" && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-[11px] text-destructive font-medium flex items-center gap-1.5"
                  >
                    <ShieldAlert className="h-3 w-3" />
                    Submission blocked — combined service hours exceed authorized cap. Reduce allocation or request exception.
                  </motion.p>
                )}
                {cap.status === "warning" && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-[11px] text-warning font-medium flex items-center gap-1.5"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    90% of weekly cap utilized. Review before additional authorizations.
                  </motion.p>
                )}
              </motion.div>
            );
          })}

          <div className="flex items-center justify-between pt-4">
            <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
              Continue to Conflict Engine <span className="text-lg">→</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
