import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, CheckCircle2, Loader2, Sparkles, Rocket,
  ClipboardList, FileText, Calendar, Users, Shield,
  AlertTriangle, Eye, BarChart3,
} from "lucide-react";
import { GuidelinePack, RulePack } from "@/types/guidelinePack";
import { cn } from "@/lib/utils";

interface Props {
  rulePack: RulePack | null;
  onBack: () => void;
  onFinish: () => void;
}

interface ModulePush {
  module: string;
  icon: typeof FileText;
  status: "pending" | "pushed";
  items: string[];
}

const MODULE_PUSHES: Omit<ModulePush, "status">[] = [
  { module: "Services Module", icon: ClipboardList, items: ["Service Authorization Record", "Billing unit config", "Approved units", "Compliance status", "Caps summary"] },
  { module: "Workflow Manager", icon: BarChart3, items: ["PCP update task", "Certification renewal task", "Reauthorization due date task"] },
  { module: "PCP Module", icon: FileText, items: ["PCP Addendum Draft (employment interest)", "Missing PCP requirements list"] },
  { module: "Billable Activity Note", icon: FileText, items: ["Billing-safe note template", "Required field enforcement", "Goal tie-in configuration"] },
  { module: "Progress Note", icon: FileText, items: ["Monthly progress note template", "Minimum contact rules"] },
  { module: "Monitoring Form", icon: Eye, items: ["Quarterly review schedule", "Cap threshold alerts", "Milestone tracking entries"] },
  { module: "Comprehensive Assessment", icon: Shield, items: ["Assessment template with required sections"] },
  { module: "Managed Documents", icon: FileText, items: ["Document checklist (Resume, Employment Plan, Attendance, Assessment Report)"] },
  { module: "Attendance", icon: Calendar, items: ["Attendance-billing validation rule", "Warn if attendance missing for billed day"] },
];

export function Layer2Step7Push({ rulePack, onBack, onFinish }: Props) {
  const [modules, setModules] = useState<ModulePush[]>([]);
  const [isPushing, setIsPushing] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const handlePush = () => {
    setIsPushing(true);
    const items: ModulePush[] = MODULE_PUSHES.map((m) => ({ ...m, status: "pending" as const }));
    setModules(items);

    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= items.length) {
        clearInterval(interval);
        setIsPushing(false);
        setAllDone(true);
        return;
      }
      const currentIdx = idx;
      idx++;
      setModules((prev) => prev.map((m, i) => i === currentIdx ? { ...m, status: "pushed" } : m));
    }, 400);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 7 — Push Outputs to iCM Modules</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Automatically writes the agent's outputs into the correct iCM modules for <span className="font-medium text-foreground">{rulePack?.service_name}</span>.
        </p>
        <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Data Source:</span>
          <span className="text-[11px] text-foreground font-medium">Writes to iCM Modules</span>
        </div>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-foreground font-medium mb-0.5">Why this step?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">This is what turns the agent into real automation. Without pushing data into modules, the agent is just "advice." With this, it becomes workflow execution. <span className="italic text-muted-foreground/80">"Don't just tell me what to do — put it where it belongs in iCM."</span></p>
        </div>
      </div>

      {modules.length === 0 && (
        <div className="flex justify-center">
          <button onClick={handlePush} disabled={isPushing} className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {isPushing ? <><Loader2 className="h-4 w-4 animate-spin" /> Pushing to modules...</> : <><Rocket className="h-4 w-4" /> Push All Outputs</>}
          </button>
        </div>
      )}

      {modules.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {modules.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "p-3 rounded-xl border transition-all",
                  mod.status === "pushed" ? "border-primary/20 bg-primary/5" : "border-border/40 bg-card"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                    mod.status === "pushed" ? "bg-primary/15" : "bg-muted/50"
                  )}>
                    <Icon className={cn("h-4 w-4", mod.status === "pushed" ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{mod.module}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {mod.items.map((item) => (
                        <span key={item} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">{item}</span>
                      ))}
                    </div>
                  </div>
                  {mod.status === "pushed" ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
                  )}
                </div>
              </motion.div>
            );
          })}

          {allDone && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 mt-4">
              {/* Done state */}
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">All Compliance Checks Complete</p>
                    <p className="text-xs text-muted-foreground">Ready state achieved for {rulePack?.service_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded-lg bg-card border border-border/40">
                    <CheckCircle2 className="h-4 w-4 text-primary mx-auto mb-0.5" />
                    <p className="text-[10px] text-primary font-semibold">Auth Ready</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-card border border-border/40">
                    <CheckCircle2 className="h-4 w-4 text-primary mx-auto mb-0.5" />
                    <p className="text-[10px] text-primary font-semibold">Docs Ready</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-card border border-border/40">
                    <CheckCircle2 className="h-4 w-4 text-primary mx-auto mb-0.5" />
                    <p className="text-[10px] text-primary font-semibold">Billing Ready</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {allDone && (
          <button onClick={onFinish} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            <CheckCircle2 className="h-4 w-4" /> View Compliance Dashboard
          </button>
        )}
      </div>
    </div>
  );
}
