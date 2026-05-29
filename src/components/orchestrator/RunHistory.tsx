import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { type OrchestratorRun } from "@/hooks/useOrchestrator";

interface RunHistoryProps {
  runs: OrchestratorRun[];
  loading: boolean;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(start: Date | null, end: Date | null): string {
  if (!start || !end) return "—";
  const ms = end.getTime() - start.getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function RunHistory({ runs, loading }: RunHistoryProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <p className="font-manrope font-bold text-[13px] text-icm-text mb-3">Run History</p>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg border border-icm-border bg-icm-bg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <p className="font-manrope font-bold text-[13px] text-icm-text mb-3">Run History</p>

      {runs.length === 0 ? (
        <p className="text-[12px] font-geist text-icm-text-dim text-center py-4">
          No runs yet. Click "Run Now" to trigger the orchestrator.
        </p>
      ) : (
        <div className="space-y-1.5">
          {runs.slice(0, 10).map((run) => (
            <div key={run.id} className="rounded-lg border border-icm-border bg-icm-bg overflow-hidden">
              <button
                className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-icm-panel transition-colors"
                onClick={() => setExpanded(expanded === run.id ? null : run.id)}
              >
                {/* Status icon */}
                {run.status === "completed" ? (
                  <CheckCircle className="w-4 h-4 text-icm-green shrink-0" />
                ) : run.status === "failed" ? (
                  <XCircle className="w-4 h-4 text-icm-red shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 text-icm-amber shrink-0 animate-spin" />
                )}

                {/* Date */}
                <span className="text-[11.5px] font-geist font-semibold text-icm-text min-w-0 flex-1">
                  {formatDate(run.started_at)}
                </span>

                {/* Type badge */}
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase",
                    run.run_type === "manual"
                      ? "bg-icm-accent-soft text-icm-accent"
                      : "bg-icm-bg text-icm-text-faint border border-icm-border"
                  )}
                >
                  {run.run_type}
                </span>

                {/* Stats summary */}
                <span className="text-[10.5px] font-mono text-icm-text-faint hidden sm:block">
                  {run.individuals_processed} indiv · {run.tasks_created} tasks
                </span>

                {/* Expand toggle */}
                {expanded === run.id ? (
                  <ChevronUp className="w-3.5 h-3.5 text-icm-text-faint shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-icm-text-faint shrink-0" />
                )}
              </button>

              {/* Expanded detail */}
              {expanded === run.id && (
                <div className="px-3 pb-3 pt-1 border-t border-icm-border space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <RunStat label="Duration" value={formatDuration(run.started_at, run.completed_at)} />
                    <RunStat label="Individuals" value={String(run.individuals_processed)} />
                    <RunStat label="Tasks created" value={String(run.tasks_created)} />
                    <RunStat label="AI drafts" value={String(run.drafts_generated)} />
                    <RunStat label="Escalations" value={String(run.escalations_triggered)} />
                    <RunStat label="Scores updated" value={String(run.compliance_scores_updated)} />
                  </div>
                  {run.summary && (
                    <p className="text-[11px] font-geist text-icm-text-dim leading-relaxed border-t border-icm-border pt-2">
                      {run.summary}
                    </p>
                  )}
                  {run.errors.length > 0 && (
                    <div className="rounded-lg bg-icm-red/5 border border-icm-red/20 p-2">
                      <p className="text-[10.5px] font-geist font-semibold text-icm-red mb-1">
                        {run.errors.length} error{run.errors.length > 1 ? "s" : ""}
                      </p>
                      {run.errors.slice(0, 3).map((e, i) => (
                        <p key={i} className="text-[10.5px] font-mono text-icm-red/80">
                          {e}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RunStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
        {label}
      </p>
      <p className="text-[12px] font-mono font-bold text-icm-text">{value}</p>
    </div>
  );
}
