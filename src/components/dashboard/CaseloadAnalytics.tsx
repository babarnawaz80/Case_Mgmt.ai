import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useIndividuals, riskTier } from "@/hooks/useIndividuals";
import { ArrowRight, TrendingUp, MapPin, Activity, Shield } from "lucide-react";

function SkeletonBar({ w }: { w: string }) {
  return <div className={`h-2 rounded-full bg-icm-border animate-pulse ${w}`} />;
}

function StatBar({
  label,
  value,
  max,
  color,
  sublabel,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  sublabel?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-geist text-icm-text truncate max-w-[160px]">{label}</span>
        <div className="flex items-center gap-2 shrink-0">
          {sublabel && <span className="text-[10px] text-icm-text-faint">{sublabel}</span>}
          <span className="text-[12px] font-mono font-bold text-icm-text">{value}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-icm-bg overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AnalyticsCard({
  icon,
  title,
  to,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  to?: string;
  children: React.ReactNode;
}) {
  const inner = (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-icm-accent">{icon}</span>
        <h3 className="font-manrope font-bold text-[13px] text-icm-text flex-1">{title}</h3>
        {to && (
          <span className="text-[10.5px] font-geist font-semibold text-icm-accent inline-flex items-center gap-0.5">
            View <ArrowRight className="w-3 h-3" />
          </span>
        )}
      </div>
      <div className="flex-1 space-y-2.5">{children}</div>
    </div>
  );
  if (to)
    return (
      <NavLink to={to} className="block hover:shadow-elevated transition-shadow rounded-xl">
        {inner}
      </NavLink>
    );
  return inner;
}

export function CaseloadAnalytics() {
  const { individuals, loading } = useIndividuals();

  const stats = useMemo(() => {
    if (loading || !individuals.length) return null;

    // Risk distribution — riskTier returns "high" | "review" | "standard"
    const risk = { high: 0, review: 0, standard: 0 };
    individuals.forEach((p) => {
      const tier = riskTier(p.risk_score);
      if (tier === "high") risk.high++;
      else if (tier === "review") risk.review++;
      else risk.standard++;
    });

    // Programs
    const programMap = new Map<string, number>();
    individuals.forEach((p) => {
      const prog = p.program || "Unassigned";
      programMap.set(prog, (programMap.get(prog) ?? 0) + 1);
    });
    const programs = Array.from(programMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Counties
    const countyMap = new Map<string, number>();
    individuals.forEach((p) => {
      const county = p.county || "Unknown";
      countyMap.set(county, (countyMap.get(county) ?? 0) + 1);
    });
    const counties = Array.from(countyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Activity recency
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 86400000);
    const d30 = new Date(now.getTime() - 30 * 86400000);
    const d60 = new Date(now.getTime() - 60 * 86400000);
    let recent7 = 0,
      recent30 = 0,
      recent60 = 0,
      older = 0;
    individuals.forEach((p) => {
      if (!p.last_visit_date) {
        older++;
        return;
      }
      const d = new Date(p.last_visit_date);
      if (d >= d7) recent7++;
      else if (d >= d30) recent30++;
      else if (d >= d60) recent60++;
      else older++;
    });

    const total = individuals.length;
    return {
      risk,
      programs,
      counties,
      activity: { recent7, recent30, recent60, older },
      total,
    };
  }, [individuals, loading]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-icm-border bg-icm-panel p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 rounded bg-icm-border animate-pulse" />
              <div className="h-3 rounded bg-icm-border animate-pulse w-24" />
            </div>
            <div className="space-y-3">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="space-y-1">
                  <div className="flex justify-between">
                    <SkeletonBar w="w-20" />
                    <SkeletonBar w="w-6" />
                  </div>
                  <SkeletonBar w="w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const maxProgram = Math.max(...stats.programs.map((p) => p[1]), 1);
  const maxCounty = Math.max(...stats.counties.map((c) => c[1]), 1);
  const maxActivity = Math.max(
    stats.activity.recent7,
    stats.activity.recent30,
    stats.activity.recent60,
    stats.activity.older,
    1
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Risk Distribution */}
      <AnalyticsCard icon={<Shield className="w-4 h-4" />} title="Risk Distribution" to="/people">
        <StatBar
          label="High Risk"
          value={stats.risk.high}
          max={stats.total}
          color="bg-icm-red"
          sublabel={`${Math.round((stats.risk.high / stats.total) * 100)}%`}
        />
        <StatBar
          label="Needs Review"
          value={stats.risk.review}
          max={stats.total}
          color="bg-icm-amber"
          sublabel={`${Math.round((stats.risk.review / stats.total) * 100)}%`}
        />
        <StatBar
          label="Stable"
          value={stats.risk.standard}
          max={stats.total}
          color="bg-icm-green"
          sublabel={`${Math.round((stats.risk.standard / stats.total) * 100)}%`}
        />
        <p className="text-[10px] text-icm-text-faint font-mono pt-1">
          {stats.total} total individuals
        </p>
      </AnalyticsCard>

      {/* Program Breakdown */}
      <AnalyticsCard icon={<TrendingUp className="w-4 h-4" />} title="By Program" to="/people">
        {stats.programs.map(([prog, count]) => (
          <StatBar key={prog} label={prog} value={count} max={maxProgram} color="bg-icm-accent" />
        ))}
      </AnalyticsCard>

      {/* County Coverage */}
      <AnalyticsCard icon={<MapPin className="w-4 h-4" />} title="County Coverage">
        {stats.counties.map(([county, count]) => (
          <StatBar
            key={county}
            label={county}
            value={count}
            max={maxCounty}
            color="bg-[hsl(270,55%,58%)]"
          />
        ))}
      </AnalyticsCard>

      {/* Recent Activity */}
      <AnalyticsCard icon={<Activity className="w-4 h-4" />} title="Visit Recency" to="/people">
        <StatBar
          label="Last 7 days"
          value={stats.activity.recent7}
          max={maxActivity}
          color="bg-icm-green"
        />
        <StatBar
          label="8–30 days"
          value={stats.activity.recent30}
          max={maxActivity}
          color="bg-icm-accent"
        />
        <StatBar
          label="31–60 days"
          value={stats.activity.recent60}
          max={maxActivity}
          color="bg-icm-amber"
        />
        <StatBar
          label="60+ days / none"
          value={stats.activity.older}
          max={maxActivity}
          color="bg-icm-red"
        />
      </AnalyticsCard>
    </div>
  );
}
