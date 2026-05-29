import { Play, Loader2, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { type OrchestratorRun } from "@/hooks/useOrchestrator";

interface SystemStatusHeaderProps {
  lastRun: OrchestratorRun | null;
  nextRunDate: Date;
  running: boolean;
  runProgress: string | null;
  onRunNow: () => void;
  isAdmin: boolean;
  loading: boolean;
}

function formatRunDate(date: Date | null): string {
  if (!date) return "Never";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days === 0 && date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
  if (days === 1) return `Yesterday at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

export function SystemStatusHeader({
  lastRun,
  nextRunDate,
  running,
  runProgress,
  onRunNow,
  isAdmin,
  loading,
}: SystemStatusHeaderProps) {
  const isHealthy = !lastRun || lastRun.status === "completed";

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
      {/* Dark mission-control header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {/* Status dot */}
            <div className="relative">
              <div
                className={cn(
                  "w-3 h-3 rounded-full",
                  running
                    ? "bg-amber-400"
                    : isHealthy
                    ? "bg-emerald-400"
                    : "bg-red-400"
                )}
              />
              {(running || isHealthy) && (
                <div
                  className={cn(
                    "absolute inset-0 rounded-full animate-ping",
                    running ? "bg-amber-400/50" : "bg-emerald-400/50"
                  )}
                />
              )}
            </div>
            <div>
              <h1 className="font-manrope text-[22px] font-extrabold text-white leading-tight tracking-[-0.02em]">
                AI Orchestrator
              </h1>
              <p className="text-[12px] font-geist text-slate-400 mt-0.5">
                Autonomous AI workflow engine — prepares everything, humans approve everything
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Run Now button */}
            {isAdmin ? (
              <button
                onClick={onRunNow}
                disabled={running || loading}
                className={cn(
                  "h-9 px-4 rounded-xl text-[12px] font-geist font-semibold inline-flex items-center gap-2 transition-all",
                  running || loading
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
                )}
                title={running ? "Run in progress..." : "Trigger manual orchestrator run"}
              >
                {running ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {running ? "Running..." : "Run Now"}
              </button>
            ) : (
              <div
                title="Admin access required to trigger manual runs"
                className="h-9 px-4 rounded-xl text-[12px] font-geist font-semibold inline-flex items-center gap-2 bg-slate-700 text-slate-500 cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5" />
                Run Now
              </div>
            )}
          </div>
        </div>

        {/* Progress bar when running */}
        {running && runProgress && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="text-[11px] font-geist text-amber-300">{runProgress}</span>
            </div>
            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 animate-pulse rounded-full w-2/3" />
            </div>
          </div>
        )}

        {/* Run complete feedback */}
        {!running && runProgress && (
          <div className="mt-3 flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-geist text-emerald-300">{runProgress}</span>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-6 py-3 border-t border-icm-border bg-icm-bg flex flex-wrap items-center gap-x-6 gap-y-1">
        <StatusPill
          icon={lastRun?.status === "completed" ? CheckCircle : lastRun?.status === "failed" ? XCircle : Clock}
          tone={lastRun?.status === "completed" ? "green" : lastRun?.status === "failed" ? "red" : "amber"}
          label="Last run"
          value={
            lastRun
              ? `${formatRunDate(lastRun.started_at)} — ${lastRun.individuals_processed} individuals · ${lastRun.tasks_created} tasks · ${lastRun.drafts_generated} drafts`
              : "No runs yet"
          }
        />
        <StatusPill
          icon={Clock}
          tone="accent"
          label="Next scheduled"
          value={`Tomorrow at ${nextRunDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
        />
      </div>
    </div>
  );
}

function StatusPill({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "green" | "red" | "amber" | "accent";
  label: string;
  value: string;
}) {
  const colors: Record<typeof tone, string> = {
    green: "text-icm-green",
    red: "text-icm-red",
    amber: "text-icm-amber",
    accent: "text-icm-accent",
  };
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn("w-3 h-3 shrink-0", colors[tone])} />
      <span className="text-[11px] font-geist text-icm-text-dim">{label}:</span>
      <span className="text-[11px] font-geist font-semibold text-icm-text">{value}</span>
    </div>
  );
}
