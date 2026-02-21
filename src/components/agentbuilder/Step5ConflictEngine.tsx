import { useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Sparkles,
  ArrowLeft,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  GitCompare,
  Ban,
  Lightbulb,
} from "lucide-react";
import { ConflictCheck } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Step5Props {
  onBack: () => void;
  onNext: () => void;
}

const mockConflicts: ConflictCheck[] = [
  {
    id: "cf-1",
    service: "Personal Care Services",
    conflictWith: "Day Habilitation",
    type: "concurrent_billing",
    severity: "block",
    suggestion: "Reschedule PCS to non-overlapping hours (before 9 AM or after 3 PM)",
  },
  {
    id: "cf-2",
    service: "Day Habilitation",
    conflictWith: "School Enrollment (Under 21)",
    type: "schedule_overlap",
    severity: "block",
    suggestion: "Verify school schedule; Day Hab cannot bill during enrolled school hours",
  },
  {
    id: "cf-3",
    service: "Respite Care",
    conflictWith: "PCS Evening Shift",
    type: "attendance_conflict",
    severity: "warning",
    suggestion: "Confirm caregiver availability. Respite and PCS may overlap on Wednesdays 6-8 PM",
  },
];

export function Step5ConflictEngine({ onBack, onNext }: Step5Props) {
  const [conflicts, setConflicts] = useState<ConflictCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = () => {
    setIsChecking(true);
    setTimeout(() => {
      setConflicts(mockConflicts);
      setIsChecking(false);
    }, 2500);
  };

  const blockCount = conflicts.filter((c) => c.severity === "block").length;
  const warnCount = conflicts.filter((c) => c.severity === "warning").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 5 — Conflict Engine</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cross-checks against existing authorized services, scheduled services, and attendance records. Blocking conflicts prevent submission; warnings suggest corrections.
        </p>
      </div>

      {conflicts.length === 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleCheck}
            disabled={isChecking}
            className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60"
          >
            {isChecking ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Cross-checking services...</>
            ) : (
              <><GitCompare className="h-4 w-4" /> Run Conflict Detection</>
            )}
          </button>
        </div>
      )}

      {conflicts.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-2 text-sm">
              <Ban className="h-4 w-4 text-destructive" />
              <span className="font-medium text-foreground">{blockCount} Blocked</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="font-medium text-foreground">{warnCount} Warnings</span>
            </div>
          </div>

          {conflicts.map((conflict, i) => (
            <motion.div
              key={conflict.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "rounded-xl border bg-card overflow-hidden",
                conflict.severity === "block" ? "border-destructive/30" : "border-warning/30"
              )}
            >
              <div className={cn(
                "px-4 py-3 flex items-center gap-3",
                conflict.severity === "block" ? "bg-destructive/5" : "bg-warning/5"
              )}>
                {conflict.severity === "block" ? (
                  <ShieldX className="h-5 w-5 text-destructive shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {conflict.service} ↔ {conflict.conflictWith}
                  </p>
                  <p className="text-[11px] text-muted-foreground capitalize">{conflict.type.replace(/_/g, " ")}</p>
                </div>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase",
                  conflict.severity === "block" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                )}>
                  {conflict.severity === "block" ? "Submission Blocked" : "Warning"}
                </span>
              </div>
              <div className="px-4 py-3 flex items-start gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">{conflict.suggestion}</p>
              </div>
            </motion.div>
          ))}

          <div className="flex items-center justify-between pt-4">
            <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
              Continue to Doc Generator <span className="text-lg">→</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
