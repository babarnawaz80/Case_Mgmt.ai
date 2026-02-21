import { useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  FileWarning,
  ShieldCheck,
  AlertTriangle,
  ClipboardList,
  TrendingUp,
  Flag,
} from "lucide-react";
import { AuthorizationOutput } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Step7Props {
  onBack: () => void;
  onFinish: () => void;
}

const mockOutput: AuthorizationOutput = {
  summary:
    "Authorization review completed for Personal Care Services, Day Habilitation, and Respite Care. 2 conflict blocks identified requiring resolution before submission. PCP addendum needed for service justification and team certification. Combined service cap exceeded — reduce weekly PCS hours by 2 to comply.",
  complianceScore: 72,
  riskScore: 35,
  missingDocs: [
    "PCP Addendum — Service Justification Narrative",
    "Team Certification Renewal — 2 staff members expired",
    "Functional Assessment Update — older than 90 days",
    "Employment Interest Documentation — not found in PCP",
  ],
  tasks: [
    { id: "t-1", title: "Resolve PCS/Day Hab billing overlap conflict", priority: "high", assignee: "Case Manager" },
    { id: "t-2", title: "Generate PCP addendum for service justification", priority: "high", assignee: "AI Auto-Draft" },
    { id: "t-3", title: "Renew team certifications (2 staff)", priority: "high", assignee: "Program Supervisor" },
    { id: "t-4", title: "Update functional assessment (expired >90 days)", priority: "medium", assignee: "Assessment Team" },
    { id: "t-5", title: "Add employment interest language to PCP", priority: "medium", assignee: "Case Manager" },
    { id: "t-6", title: "Reduce weekly PCS allocation by 2 hours", priority: "medium", assignee: "Authorization Coordinator" },
    { id: "t-7", title: "Review respite/PCS Wednesday overlap", priority: "low", assignee: "Scheduling Coordinator" },
  ],
};

const priorityConfig = {
  high: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: Flag },
  medium: { color: "bg-warning/10 text-warning border-warning/20", icon: AlertTriangle },
  low: { color: "bg-muted text-muted-foreground border-border", icon: ClipboardList },
};

export function Step7AuthorizationOutput({ onBack, onFinish }: Step7Props) {
  const [output, setOutput] = useState<AuthorizationOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setOutput(mockOutput);
      setIsGenerating(false);
    }, 3000);
  };

  const getScoreColor = (score: number, invert = false) => {
    const effective = invert ? score : 100 - score;
    if (effective > 60) return "text-destructive";
    if (effective > 30) return "text-warning";
    return "text-primary";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 7 — Authorization Output</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Final output including authorization recommendation summary, missing documentation checklist, compliance & risk scores, and auto-generated task list.
        </p>
      </div>

      {!output && (
        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating authorization output...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate Authorization Output</>
            )}
          </button>
        </div>
      )}

      {output && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Summary */}
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Authorization Recommendation
            </p>
            <p className="text-sm text-foreground leading-relaxed">{output.summary}</p>
          </div>

          {/* Scores */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/60 bg-card p-5 text-center">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Compliance Score</p>
              <div className="relative inline-flex items-center justify-center">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
                  <motion.circle
                    cx="50" cy="50" r="42"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8" fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${output.complianceScore * 2.64} 264`}
                    initial={{ strokeDasharray: "0 264" }}
                    animate={{ strokeDasharray: `${output.complianceScore * 2.64} 264` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <span className={cn("absolute text-2xl font-display font-bold", getScoreColor(output.complianceScore))}>
                  {output.complianceScore}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Needs improvement before submission</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-5 text-center">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Risk Score</p>
              <div className="relative inline-flex items-center justify-center">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
                  <motion.circle
                    cx="50" cy="50" r="42"
                    stroke="hsl(var(--warning))"
                    strokeWidth="8" fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${output.riskScore * 2.64} 264`}
                    initial={{ strokeDasharray: "0 264" }}
                    animate={{ strokeDasharray: `${output.riskScore * 2.64} 264` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <span className={cn("absolute text-2xl font-display font-bold", getScoreColor(output.riskScore, true))}>
                  {output.riskScore}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Moderate risk — review flagged items</p>
            </div>
          </div>

          {/* Missing Docs */}
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <FileWarning className="h-3.5 w-3.5 text-warning" />
              Missing Documentation ({output.missingDocs.length})
            </p>
            <ul className="space-y-2">
              {output.missingDocs.map((doc, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2 text-sm text-foreground/80"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                  {doc}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Task List */}
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5 text-primary" />
              Auto-Generated Tasks ({output.tasks.length})
            </p>
            <div className="space-y-2">
              {output.tasks.map((task, i) => {
                const cfg = priorityConfig[task.priority];
                const PriorityIcon = cfg.icon;
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40"
                  >
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold uppercase border", cfg.color)}>
                      {task.priority}
                    </span>
                    <p className="flex-1 text-sm text-foreground">{task.title}</p>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">{task.assignee}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={onFinish} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
              <CheckCircle2 className="h-4 w-4" /> Save & Deploy Agent
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
