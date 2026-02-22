import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, CheckCircle2, OctagonAlert, AlertTriangle, Calendar } from "lucide-react";
import { RulePack } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Props {
  rulePack: RulePack | null;
  onBack: () => void;
  onNext: () => void;
}

interface ConflictResult {
  service: string;
  conflictWith: string;
  type: string;
  severity: "clear" | "warning" | "block";
  suggestion: string;
}

export function Layer2Step5Conflicts({ rulePack, onBack, onNext }: Props) {
  const [results, setResults] = useState<ConflictResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = () => {
    setIsChecking(true);
    const items: ConflictResult[] = [
      { service: rulePack?.service_name || "PCS", conflictWith: "Day Habilitation", type: "Schedule Overlap", severity: "clear", suggestion: "No overlap — Day Hab scheduled Mon–Fri 9am–2pm, PCS evenings" },
      { service: rulePack?.service_name || "PCS", conflictWith: "Respite Care", type: "Concurrent Billing", severity: "clear", suggestion: "Respite scheduled on different days — no concurrent billing" },
      { service: rulePack?.service_name || "PCS", conflictWith: "Community Living", type: "Attendance Validation", severity: "clear", suggestion: "Attendance records match — all billing units have attendance on file" },
    ];
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= items.length) { clearInterval(interval); setIsChecking(false); return; }
      const current = items[idx];
      idx++;
      setResults((prev) => [...prev, current]);
    }, 600);
  };

  const allClear = results.length > 0 && results.every((r) => r.severity === "clear");
  const hasBlock = results.some((r) => r.severity === "block");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 5 — Conflict Engine</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Checks if <span className="font-medium text-foreground">{rulePack?.service_name}</span> conflicts with another service (same-time or same-day billing restrictions).
        </p>
        <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Data Source:</span>
          <span className="text-[11px] text-foreground font-medium">Scheduled Services</span>
        </div>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-foreground font-medium mb-0.5">Why this step?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">Many guidelines prohibit billing two specific services at the same time or same day. This is one of the biggest causes of billing denials. <span className="italic text-muted-foreground/80">"You can't bill Service A at the same time as Service B — this catches that before it becomes a problem."</span></p>
        </div>
      </div>

      {results.length === 0 && (
        <div className="flex justify-center">
          <button onClick={handleCheck} disabled={isChecking} className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {isChecking ? <><Loader2 className="h-4 w-4 animate-spin" /> Running conflict checks...</> : <><Calendar className="h-4 w-4" /> Run Conflict Check</>}
          </button>
        </div>
      )}

      {results.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {results.map((result, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "p-4 rounded-xl border",
                result.severity === "clear" ? "bg-primary/5 border-primary/20" :
                result.severity === "warning" ? "bg-warning/5 border-warning/20" :
                "bg-destructive/5 border-destructive/20"
              )}
            >
              <div className="flex items-start gap-3">
                {result.severity === "clear" ? <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> :
                 result.severity === "warning" ? <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" /> :
                 <OctagonAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">{result.service} ↔ {result.conflictWith}</p>
                  <p className="text-[10px] text-muted-foreground">{result.type}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{result.suggestion}</p>
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                  result.severity === "clear" ? "bg-primary/10 text-primary" :
                  result.severity === "warning" ? "bg-warning/10 text-warning" :
                  "bg-destructive/10 text-destructive"
                )}>{result.severity === "clear" ? "Clear" : result.severity}</span>
              </div>
            </motion.div>
          ))}

          {allClear && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs text-primary font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> No conflicts detected
              </p>
            </div>
          )}
        </motion.div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {allClear && (
          <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            Documentation Builder <ArrowRight className="h-4 w-4" />
          </button>
        )}
        {hasBlock && <p className="text-xs text-destructive font-medium">❌ Conflict blocks submission</p>}
      </div>
    </div>
  );
}
