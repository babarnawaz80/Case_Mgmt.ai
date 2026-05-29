import { cn } from "@/lib/utils";
import { type OrchestratorTask } from "@/hooks/useOrchestrator";
import { type Individual } from "@/hooks/useIndividuals";

interface HealthMetricsRowProps {
  tasks: OrchestratorTask[];
  openTasksCount: number;
  draftsReadyCount: number;
  individuals: Individual[];
  individualsLoading: boolean;
}

function complianceTier(score?: number): "green" | "amber" | "red" {
  if (!score && score !== 0) return "green";
  if (score >= 90) return "green";
  if (score >= 70) return "amber";
  return "red";
}

export function HealthMetricsRow({
  tasks,
  openTasksCount,
  draftsReadyCount,
  individuals,
  individualsLoading,
}: HealthMetricsRowProps) {
  const activeCount = individuals.filter((i) => i.enrollment_status === "active").length;

  // Compute org average compliance from individuals that have compliance_score
  const scored = individuals.filter((i) => typeof i.compliance_score === "number");
  const avgScore =
    scored.length > 0
      ? Math.round(scored.reduce((s, i) => s + (i.compliance_score ?? 0), 0) / scored.length)
      : null;

  const atRiskCount = individuals.filter(
    (i) => typeof i.compliance_score === "number" && i.compliance_score < 80
  ).length;

  // Compliance distribution
  const tiers = {
    green: individuals.filter((i) => complianceTier(i.compliance_score) === "green" && typeof i.compliance_score === "number").length,
    amber: individuals.filter((i) => complianceTier(i.compliance_score) === "amber").length,
    red: individuals.filter((i) => complianceTier(i.compliance_score) === "red").length,
  };
  const total = tiers.green + tiers.amber + tiers.red;

  const scoreTone =
    avgScore === null ? "accent" : avgScore >= 90 ? "green" : avgScore >= 70 ? "amber" : "red";

  return (
    <div className="space-y-3">
      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Org compliance score"
          value={avgScore !== null ? `${avgScore}%` : "—"}
          sub={avgScore !== null ? scoreTone === "green" ? "On track" : scoreTone === "amber" ? "Needs attention" : "At risk" : "No data yet"}
          tone={scoreTone}
          loading={individualsLoading}
        />
        <MetricCard
          label="Individuals at risk"
          value={String(atRiskCount)}
          sub={`of ${activeCount} active`}
          tone={atRiskCount > 0 ? "red" : "green"}
          loading={individualsLoading}
        />
        <MetricCard
          label="Active orchestrator tasks"
          value={String(openTasksCount)}
          sub="pending / in progress"
          tone={openTasksCount > 10 ? "amber" : "accent"}
          loading={false}
        />
        <MetricCard
          label="AI drafts awaiting review"
          value={String(draftsReadyCount)}
          sub="ready for CM review"
          tone={draftsReadyCount > 0 ? "accent" : "green"}
          loading={false}
        />
      </div>

      {/* Compliance distribution bar */}
      {total > 0 && (
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
          <p className="font-manrope font-bold text-[13px] text-icm-text mb-3">
            Compliance Distribution
          </p>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-3 rounded-full overflow-hidden flex gap-0.5">
              {tiers.green > 0 && (
                <div
                  className="bg-icm-green h-full rounded-l-full"
                  style={{ width: `${(tiers.green / total) * 100}%` }}
                />
              )}
              {tiers.amber > 0 && (
                <div
                  className="bg-icm-amber h-full"
                  style={{ width: `${(tiers.amber / total) * 100}%` }}
                />
              )}
              {tiers.red > 0 && (
                <div
                  className="bg-icm-red h-full rounded-r-full"
                  style={{ width: `${(tiers.red / total) * 100}%` }}
                />
              )}
            </div>
          </div>
          <div className="flex gap-4">
            <TierLegend color="icm-green" label="90-100%" count={tiers.green} total={total} />
            <TierLegend color="icm-amber" label="70-89%" count={tiers.amber} total={total} />
            <TierLegend color="icm-red" label="Below 70%" count={tiers.red} total={total} />
            {total < activeCount && (
              <TierLegend color="icm-text-faint" label="Unscored" count={activeCount - total} total={activeCount} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  tone,
  loading,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "green" | "amber" | "red" | "accent";
  loading: boolean;
}) {
  const toneClasses: Record<typeof tone, string> = {
    green: "text-icm-green",
    amber: "text-icm-amber",
    red: "text-icm-red",
    accent: "text-icm-accent",
  };
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel px-4 py-3">
      <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
        {label}
      </p>
      {loading ? (
        <div className="mt-1 h-6 w-12 rounded bg-icm-border animate-pulse" />
      ) : (
        <p className={cn("mt-1 text-[22px] font-manrope font-extrabold leading-tight", toneClasses[tone])}>
          {value}
        </p>
      )}
      <p className="text-[10.5px] font-geist text-icm-text-faint mt-0.5">{sub}</p>
    </div>
  );
}

function TierLegend({
  color,
  label,
  count,
  total,
}: {
  color: string;
  label: string;
  count: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-2.5 h-2.5 rounded-sm", `bg-${color}`)} />
      <span className="text-[11px] font-geist text-icm-text-dim">
        {label} <span className="font-semibold text-icm-text">{count}</span>
        <span className="text-icm-text-faint"> ({Math.round((count / total) * 100)}%)</span>
      </span>
    </div>
  );
}
