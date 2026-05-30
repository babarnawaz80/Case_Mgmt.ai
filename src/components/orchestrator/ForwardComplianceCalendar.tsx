import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar, FileText, Shield, RefreshCw, Activity, CheckCircle2, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Individual } from "@/hooks/useIndividuals";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeadlineType =
  | "PCP Renewal"
  | "MA Renewal"
  | "Quarterly Visit Due"
  | "Monitoring Form"
  | "Service Auth Expiring"
  | "Assessment Due";

export interface Deadline {
  id: string;
  type: DeadlineType;
  subtype?: string;
  individualId: string;
  individualName: string;
  caseManager: string;
  dueDate: Date;
  daysUntil: number;
  status: "overdue" | "at_risk" | "on_track";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<DeadlineType, { border: string; bg: string; icon: React.ComponentType<{className?:string}>; color: string }> = {
  "PCP Renewal":           { border: "border-l-blue-500",   bg: "bg-blue-50",   icon: FileText,    color: "text-blue-600" },
  "MA Renewal":            { border: "border-l-purple-500", bg: "bg-purple-50", icon: Shield,      color: "text-purple-600" },
  "Quarterly Visit Due":   { border: "border-l-icm-green",  bg: "bg-icm-green-soft", icon: Activity, color: "text-icm-green" },
  "Monitoring Form":       { border: "border-l-teal-500",   bg: "bg-teal-50",   icon: FileText,    color: "text-teal-600" },
  "Service Auth Expiring": { border: "border-l-orange-500", bg: "bg-orange-50", icon: RefreshCw,   color: "text-orange-600" },
  "Assessment Due":        { border: "border-l-yellow-500", bg: "bg-yellow-50", icon: Calendar,    color: "text-yellow-600" },
};

function buildDeadlines(individuals: Individual[]): Deadline[] {
  const today = new Date();
  const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  const items: Deadline[] = [];

  for (const ind of individuals) {
    if (ind.enrollment_status !== "active") continue;
    const name = `${ind.last_name}, ${ind.first_name}`;
    const cm = ind.assigned_case_manager_name ?? "—";
    const push = (type: DeadlineType, dueDate: Date, subtype?: string) => {
      const days = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (dueDate > ninetyDays && days >= 0) return; // beyond window
      const status: Deadline["status"] =
        days < 0 ? "overdue" : days <= 30 ? "at_risk" : "on_track";
      items.push({
        id: `${ind.id}-${type}-${dueDate.toISOString()}`,
        type, subtype,
        individualId: ind.id,
        individualName: name,
        caseManager: cm,
        dueDate,
        daysUntil: days,
        status,
      });
    };

    // 1. PCP / ISP Renewal
    const pcpDate = ind.pcp_due_date ?? ind.isp_due_date;
    if (pcpDate) push("PCP Renewal", new Date(pcpDate));

    // 2. MA Renewal
    if (ind.ma_redetermination_date) push("MA Renewal", new Date(ind.ma_redetermination_date));

    // 3. Quarterly Visit (due 90 days from last visit)
    if (ind.last_visit_date) {
      const lastVisit = new Date(ind.last_visit_date);
      const nextVisit = new Date(lastVisit.getTime() + 90 * 24 * 60 * 60 * 1000);
      push("Quarterly Visit Due", nextVisit);
    }
  }

  return items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

// ─── Deadline Card ─────────────────────────────────────────────────────────────

function DeadlineCard({ d }: { d: Deadline }) {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[d.type];
  const Icon = cfg.icon;
  const absDays = Math.abs(d.daysUntil);
  const dayLabel =
    d.daysUntil < 0 ? `${absDays}d overdue` : d.daysUntil === 0 ? "Today" : `In ${absDays}d`;

  return (
    <div
      className={cn(
        "rounded-lg border border-icm-border border-l-[3px] bg-icm-panel p-3 cursor-pointer hover:shadow-sm transition-shadow",
        cfg.border
      )}
      onClick={() => navigate(`/people/${d.individualId}/echart`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Icon className={cn("w-3.5 h-3.5 shrink-0", cfg.color)} />
          <span className="text-[10.5px] font-geist font-semibold text-icm-text-dim truncate">
            {d.subtype ?? d.type}
          </span>
        </div>
        <span className={cn(
          "text-[10px] font-mono font-bold shrink-0 px-1.5 py-0.5 rounded",
          d.daysUntil < 0
            ? "bg-icm-red-soft text-icm-red"
            : d.daysUntil <= 14
            ? "bg-icm-amber-soft text-icm-amber"
            : "bg-icm-bg text-icm-text-dim"
        )}>
          {dayLabel}
        </span>
      </div>
      <p className="text-[12.5px] font-geist font-semibold text-icm-accent hover:underline mt-1 truncate">
        {d.individualName}
      </p>
      <p className="text-[11px] font-geist text-icm-text-dim truncate">{d.caseManager}</p>
      <p className="text-[10.5px] font-mono text-icm-text-faint mt-1">
        Due {d.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
      {d.status === "overdue" && (
        <span className="inline-flex items-center mt-1.5 px-1.5 py-0.5 rounded text-[9.5px] font-geist font-bold bg-icm-red-soft text-icm-red">
          OVERDUE
        </span>
      )}
    </div>
  );
}

// ─── Column ────────────────────────────────────────────────────────────────────

function CalendarColumn({
  title, items, tone,
}: { title: string; items: Deadline[]; tone: "red" | "amber" | "slate" }) {
  const toneClasses = {
    red:   "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
  };

  // Summarise by type
  const typeCounts = items.reduce<Record<string, number>>((acc, d) => {
    acc[d.type] = (acc[d.type] ?? 0) + 1;
    return acc;
  }, {});
  const summary = Object.entries(typeCounts)
    .map(([t, c]) => `${c} ${t.toLowerCase()}${c > 1 ? "s" : ""}`)
    .join(" · ");

  return (
    <div className="flex flex-col min-h-[300px]">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-manrope font-bold text-[13px] text-icm-text">{title}</h3>
        <span className={cn("text-[10px] font-geist font-bold px-1.5 py-0.5 rounded border", toneClasses[tone])}>
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-icm-green mb-2" />
          <p className="text-[12px] font-geist text-icm-text-dim">No deadlines in this window.</p>
          <p className="text-[11px] font-geist text-icm-text-faint mt-0.5">All individuals on track.</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1">
          {items.map(d => <DeadlineCard key={d.id} d={d} />)}
        </div>
      )}

      {summary && (
        <p className="text-[10.5px] font-geist text-icm-text-faint mt-3 pt-3 border-t border-icm-border">
          {summary}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface ForwardComplianceCalendarProps {
  individuals: Individual[];
  loading: boolean;
}

export function ForwardComplianceCalendar({ individuals, loading }: ForwardComplianceCalendarProps) {
  const [window, setWindow] = useState<30 | 60 | 90>(90);
  const [cmFilter, setCmFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const allDeadlines = useMemo(() => buildDeadlines(individuals), [individuals]);

  // Filter
  const filtered = useMemo(() => {
    return allDeadlines.filter(d => {
      if (cmFilter !== "all" && d.caseManager !== cmFilter) return false;
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      if (window < 90 && d.daysUntil > window) return false;
      return true;
    });
  }, [allDeadlines, cmFilter, typeFilter, window]);

  const overdue = filtered.filter(d => d.daysUntil < 0);
  const next30  = [...overdue, ...filtered.filter(d => d.daysUntil >= 0 && d.daysUntil <= 30)];
  const next60  = filtered.filter(d => d.daysUntil > 30 && d.daysUntil <= 60);
  const next90  = filtered.filter(d => d.daysUntil > 60 && d.daysUntil <= 90);

  const cms   = [...new Set(allDeadlines.map(d => d.caseManager).filter(c => c !== "—"))].sort();
  const types = [...new Set(allDeadlines.map(d => d.type))].sort();

  const now = new Date();
  const lastCalc = `${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
      <div className="px-4 py-3 border-b border-icm-border bg-icm-bg/60 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-manrope font-bold text-[14px] text-icm-text">Upcoming Compliance Deadlines</p>
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
            What the orchestrator is tracking across your caseload.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={cmFilter}
            onChange={e => setCmFilter(e.target.value)}
            className="h-7 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] font-geist text-icm-text"
          >
            <option value="all">All CMs</option>
            {cms.map(cm => <option key={cm} value={cm}>{cm}</option>)}
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="h-7 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] font-geist text-icm-text"
          >
            <option value="all">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <div className="flex rounded-lg border border-icm-border overflow-hidden">
            {([30, 60, 90] as const).map(w => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-geist font-semibold transition-colors",
                  window === w
                    ? "bg-icm-accent text-white"
                    : "bg-white text-icm-text-dim hover:bg-icm-bg"
                )}
              >
                {w}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-6">
          <p className="text-[12px] font-geist text-icm-text-dim text-center mb-4">
            Calculating compliance deadlines across {individuals.length} individuals…
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[0,1,2].map(i => (
              <div key={i} className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-20 rounded-lg bg-icm-bg border border-icm-border animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CalendarColumn title="Next 30 Days" items={next30} tone="red" />
            {window >= 60 && <CalendarColumn title="31–60 Days" items={next60} tone="amber" />}
            {window >= 90 && <CalendarColumn title="61–90 Days" items={next90} tone="slate" />}
          </div>
          <p className="text-[10.5px] font-geist text-icm-text-faint mt-4">
            Last calculated: {lastCalc} · Based on PCP due dates, MA redetermination dates, and visit history
          </p>
        </div>
      )}
    </div>
  );
}
