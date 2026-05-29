import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, FileText, CreditCard, AlertTriangle, RefreshCw, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { type OrchestratorLog } from "@/hooks/useOrchestrator";

type AgentFilter = "all" | "compliance" | "documentation" | "billing" | "escalation" | "renewal";

const AGENT_CONFIG: Record<
  Exclude<AgentFilter, "all">,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }
> = {
  compliance: { icon: Shield, color: "text-icm-accent", bg: "bg-icm-accent-soft", label: "Compliance" },
  documentation: { icon: FileText, color: "text-icm-green", bg: "bg-icm-green-soft", label: "Documentation" },
  billing: { icon: CreditCard, color: "text-icm-amber", bg: "bg-icm-amber-soft", label: "Billing" },
  escalation: { icon: AlertTriangle, color: "text-icm-red", bg: "bg-icm-red-soft", label: "Escalation" },
  renewal: { icon: RefreshCw, color: "text-purple-600", bg: "bg-purple-50", label: "Renewal" },
};

const OUTCOME_BADGES: Record<string, { label: string; cls: string }> = {
  task: { label: "Task Created", cls: "bg-icm-accent-soft text-icm-accent" },
  draft: { label: "Draft Generated", cls: "bg-icm-green-soft text-icm-green" },
  escalat: { label: "Escalated", cls: "bg-icm-red-soft text-icm-red" },
  alert: { label: "Alert Sent", cls: "bg-icm-amber-soft text-icm-amber" },
  score: { label: "Score Updated", cls: "bg-purple-50 text-purple-600" },
  skipped: { label: "No Action", cls: "bg-icm-bg text-icm-text-faint border border-icm-border" },
};

function getOutcomeBadge(result: string): { label: string; cls: string } {
  const r = result.toLowerCase();
  if (r.includes("task created")) return OUTCOME_BADGES.task!;
  if (r.includes("draft") || r.includes("generated")) return OUTCOME_BADGES.draft!;
  if (r.includes("escalat")) return OUTCOME_BADGES.escalat!;
  if (r.includes("alert") || r.includes("notif")) return OUTCOME_BADGES.alert!;
  if (r.includes("score")) return OUTCOME_BADGES.score!;
  return OUTCOME_BADGES.skipped!;
}

function formatTs(date: Date | null): string {
  if (!date) return "";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

interface AgentActivityFeedProps {
  logs: OrchestratorLog[];
  loading: boolean;
}

export function AgentActivityFeed({ logs, loading }: AgentActivityFeedProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<AgentFilter>("all");
  const [visibleCount, setVisibleCount] = useState(20);

  const filtered = filter === "all" ? logs : logs.filter((l) => l.agent === filter);
  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="font-manrope font-bold text-[13px] text-icm-text">Agent Activity Feed</p>
        <span className="text-[10.5px] font-geist text-icm-text-faint">
          {filtered.length} actions
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap mb-3">
        {(["all", "compliance", "documentation", "billing", "escalation", "renewal"] as AgentFilter[]).map(
          (f) => {
            const cfg = f !== "all" ? AGENT_CONFIG[f] : null;
            return (
              <button
                key={f}
                onClick={() => { setFilter(f); setVisibleCount(20); }}
                className={cn(
                  "px-2 py-1 rounded-lg text-[10.5px] font-geist font-semibold transition-colors",
                  filter === f
                    ? "bg-icm-accent-soft text-icm-accent"
                    : "text-icm-text-dim hover:bg-icm-bg"
                )}
              >
                {cfg ? cfg.label : "All"}
              </button>
            );
          }
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg border border-icm-border bg-icm-bg animate-pulse" />
          ))
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-[12px] font-geist text-icm-text-dim">No activity yet.</p>
            <p className="text-[11px] font-geist text-icm-text-faint mt-1">
              Trigger a run to see agent activity here.
            </p>
          </div>
        ) : (
          visible.map((log) => {
            const cfg = AGENT_CONFIG[log.agent] ?? AGENT_CONFIG.compliance!;
            const badge = getOutcomeBadge(log.result);
            return (
              <div
                key={log.id}
                className="rounded-lg border border-icm-border bg-icm-bg px-3 py-2 flex gap-2.5 items-start group"
              >
                {/* Agent icon */}
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                  <cfg.icon className={cn("w-3.5 h-3.5", cfg.color)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Individual name */}
                      {log.individual_id && (
                        <button
                          onClick={() => navigate(`/people/${log.individual_id}/echart`)}
                          className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline truncate block max-w-full text-left"
                        >
                          {log.individual_name ?? log.individual_id}
                        </button>
                      )}
                      {/* Finding */}
                      <p className="text-[11px] font-geist text-icm-text leading-snug mt-0.5 line-clamp-2">
                        {log.finding}
                      </p>
                      {/* Rule reference */}
                      <p className="text-[10px] font-mono text-icm-text-faint mt-0.5 truncate">
                        {log.rule_applied}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {/* Outcome badge */}
                      <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-geist font-bold", badge.cls)}>
                        {badge.label}
                      </span>
                      {/* Timestamp */}
                      <span className="text-[9.5px] font-geist text-icm-text-faint">
                        {formatTs(log.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load more */}
      {visible.length < filtered.length && (
        <button
          onClick={() => setVisibleCount((n) => n + 20)}
          className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-geist text-icm-text-dim hover:text-icm-text transition-colors py-1"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          Load more ({filtered.length - visible.length} remaining)
        </button>
      )}
    </div>
  );
}
