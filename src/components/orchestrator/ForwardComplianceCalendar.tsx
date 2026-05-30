import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar, FileText, Shield, RefreshCw, Activity, CheckCircle2, ChevronDown, ChevronRight, AlertTriangle,
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
  | "Assessment Due"
  | "Annual Reassessment Due"
  | "Initial Assessment Due";

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

// ─── Exported helper so BrainOrchestrator can compute deadlines for the badge ─

export function buildDeadlines(individuals: Individual[]): Deadline[] {
  const today = new Date();
  const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  const items: Deadline[] = [];

  for (const ind of individuals) {
    if (ind.enrollment_status !== "active") continue;
    const name = `${ind.last_name}, ${ind.first_name}`;
    const cm = ind.assigned_case_manager_name ?? "—";

    const push = (type: DeadlineType, dueDate: Date, subtype?: string) => {
      const days = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (dueDate > ninetyDays && days >= 0) return;
      const status: Deadline["status"] = days < 0 ? "overdue" : days <= 30 ? "at_risk" : "on_track";
      items.push({ id: `${ind.id}-${type}`, type, subtype, individualId: ind.id, individualName: name, caseManager: cm, dueDate, daysUntil: days, status });
    };

    if (ind.pcp_due_date ?? ind.isp_due_date) push("PCP Renewal", new Date((ind.pcp_due_date ?? ind.isp_due_date)!));
    if (ind.ma_redetermination_date) push("MA Renewal", new Date(ind.ma_redetermination_date));
    if (ind.last_visit_date) push("Quarterly Visit Due", new Date(new Date(ind.last_visit_date).getTime() + 90 * 24 * 60 * 60 * 1000));
    // Assessment deadline from last_assessment_date (annual cycle) or next_assessment_date
    const lastAssess = (ind as any).last_assessment_date;
    const nextAssess = (ind as any).next_assessment_date;
    if (nextAssess) {
      push("Annual Reassessment Due", new Date(nextAssess));
    } else if (lastAssess) {
      push("Annual Reassessment Due", new Date(new Date(lastAssess).getTime() + 365 * 24 * 60 * 60 * 1000));
    }
  }

  return items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<DeadlineType, { icon: React.ComponentType<{className?: string}>; color: string; border: string }> = {
  "PCP Renewal":           { icon: FileText,    color: "text-blue-600",    border: "border-l-blue-500" },
  "MA Renewal":            { icon: Shield,      color: "text-purple-600",  border: "border-l-purple-500" },
  "Quarterly Visit Due":   { icon: Activity,    color: "text-icm-green",   border: "border-l-icm-green" },
  "Monitoring Form":       { icon: FileText,    color: "text-teal-600",    border: "border-l-teal-500" },
  "Service Auth Expiring": { icon: RefreshCw,   color: "text-orange-600",  border: "border-l-orange-500" },
  "Assessment Due":              { icon: Calendar,    color: "text-yellow-600",  border: "border-l-yellow-500" },
  "Annual Reassessment Due":     { icon: Calendar,    color: "text-yellow-600",  border: "border-l-yellow-500" },
  "Initial Assessment Due":      { icon: Calendar,    color: "text-red-600",     border: "border-l-red-500" },
};

// ─── Deadline Card ─────────────────────────────────────────────────────────────

function DeadlineCard({ d }: { d: Deadline }) {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[d.type];
  const Icon = cfg.icon;
  const absDays = Math.abs(d.daysUntil);
  const dayLabel = d.daysUntil < 0 ? `${absDays}d overdue` : d.daysUntil === 0 ? "Today" : `In ${absDays}d`;

  return (
    <div
      className={cn("rounded-lg border border-icm-border border-l-[3px] bg-icm-panel px-3 py-2.5 cursor-pointer hover:shadow-sm transition-shadow", cfg.border)}
      onClick={() => navigate(`/people/${d.individualId}/echart`)}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className={cn("w-3 h-3 shrink-0", cfg.color)} />
          <span className="text-[10px] font-geist font-semibold text-icm-text-dim truncate">{d.subtype ?? d.type}</span>
        </div>
        <span className={cn("text-[9.5px] font-mono font-bold shrink-0 px-1.5 py-0.5 rounded",
          d.daysUntil < 0 ? "bg-icm-red-soft text-icm-red" : d.daysUntil <= 14 ? "bg-icm-amber-soft text-icm-amber" : "bg-icm-bg text-icm-text-dim")}>
          {dayLabel}
        </span>
      </div>
      <p className="text-[12px] font-geist font-semibold text-icm-accent truncate">{d.individualName}</p>
      <p className="text-[10.5px] font-geist text-icm-text-dim">{d.caseManager}</p>
      <p className="text-[10px] font-mono text-icm-text-faint mt-0.5">
        Due {d.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}

// ─── Collapsible Group ────────────────────────────────────────────────────────

function DeadlineGroup({ type, items, defaultExpanded }: { type: DeadlineType; items: Deadline[]; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const cfg = TYPE_CONFIG[type];
  const Icon = cfg.icon;
  const hasOverdue = items.some(d => d.daysUntil < 0);
  const hasAtRisk = items.some(d => d.daysUntil >= 0 && d.daysUntil <= 14);

  return (
    <div>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 py-2 px-1 hover:bg-icm-bg/60 rounded transition-colors"
      >
        <Icon className={cn("w-3.5 h-3.5 shrink-0", cfg.color)} />
        <span className="text-[12px] font-geist font-semibold text-icm-text flex-1 text-left">{type}</span>
        <span className="text-[10px] font-mono text-icm-text-faint">{items.length}</span>
        {hasOverdue && <span className="text-[9px] font-geist font-bold px-1.5 py-0.5 rounded bg-icm-red-soft text-icm-red">OVERDUE</span>}
        {!hasOverdue && hasAtRisk && <span className="text-[9px] font-geist font-bold px-1.5 py-0.5 rounded bg-icm-amber-soft text-icm-amber">AT RISK</span>}
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-icm-text-faint shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-icm-text-faint shrink-0" />}
      </button>
      {expanded && (
        <div className="space-y-1.5 pb-2">
          {items.map(d => <DeadlineCard key={d.id} d={d} />)}
        </div>
      )}
    </div>
  );
}

// ─── Column ────────────────────────────────────────────────────────────────────

function CalendarColumn({
  title, items, tone, expandAll,
}: { title: string; items: Deadline[]; tone: "red" | "amber" | "slate"; expandAll: boolean | null }) {
  const toneClasses = {
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
  };

  const overdue = items.filter(d => d.daysUntil < 0);
  const upcoming = items.filter(d => d.daysUntil >= 0);

  // Group upcoming by type
  const grouped = upcoming.reduce<Record<string, Deadline[]>>((acc, d) => {
    if (!acc[d.type]) acc[d.type] = [];
    acc[d.type].push(d);
    return acc;
  }, {});

  const groupTypes = Object.keys(grouped) as DeadlineType[];
  const total = overdue.length + upcoming.length;

  // Column summary
  const summary = Object.entries({ ...grouped, ...(overdue.length ? { Overdue: overdue } : {}) })
    .map(([t, arr]) => `${arr.length} ${t.toLowerCase()}`)
    .slice(0, 3).join(" · ");

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-manrope font-bold text-[13px] text-icm-text">{title}</h3>
        <span className={cn("text-[10px] font-geist font-bold px-1.5 py-0.5 rounded border", toneClasses[tone])}>
          {total} item{total !== 1 ? "s" : ""}
        </span>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <CheckCircle2 className="w-7 h-7 text-icm-green mb-2" />
          <p className="text-[12px] font-geist text-icm-text-dim">No deadlines in this window.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Pinned overdue section */}
          {overdue.length > 0 && (
            <div className="rounded-lg overflow-hidden mb-3">
              <div className="bg-icm-red-soft px-3 py-2 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-icm-red shrink-0" />
                <span className="text-[11px] font-geist font-bold text-icm-red">OVERDUE — {overdue.length} items requiring immediate action</span>
              </div>
              <div className="space-y-1.5 pt-1.5">
                {overdue.map(d => <DeadlineCard key={d.id} d={d} />)}
              </div>
            </div>
          )}

          {/* Grouped upcoming */}
          {groupTypes.map(type => {
            const groupItems = grouped[type] ?? [];
            const hasOverdueInGroup = groupItems.some(d => d.daysUntil < 0);
            const hasAtRiskInGroup = groupItems.some(d => d.daysUntil >= 0 && d.daysUntil <= 14);
            const defaultExpanded = expandAll !== null ? expandAll : (hasOverdueInGroup || hasAtRiskInGroup);
            return (
              <DeadlineGroup key={type} type={type} items={groupItems} defaultExpanded={defaultExpanded} />
            );
          })}
        </div>
      )}

      {summary && (
        <p className="text-[10px] font-geist text-icm-text-faint mt-3 pt-2 border-t border-icm-border">{summary}</p>
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
  const [expandAll, setExpandAll] = useState<boolean | null>(null); // null = default per group

  const allDeadlines = useMemo(() => buildDeadlines(individuals), [individuals]);

  const filtered = useMemo(() => {
    return allDeadlines.filter(d => {
      if (cmFilter !== "all" && d.caseManager !== cmFilter) return false;
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      if (window < 90 && d.daysUntil > window && d.daysUntil >= 0) return false;
      return true;
    });
  }, [allDeadlines, cmFilter, typeFilter, window]);

  const overdue = filtered.filter(d => d.daysUntil < 0);
  const next30  = [...overdue, ...filtered.filter(d => d.daysUntil >= 0 && d.daysUntil <= 30)];
  const next60  = filtered.filter(d => d.daysUntil > 30 && d.daysUntil <= 60);
  const next90  = filtered.filter(d => d.daysUntil > 60 && d.daysUntil <= 90);

  const cms   = [...new Set(allDeadlines.map(d => d.caseManager).filter(c => c !== "—"))].sort();
  const types = [...new Set(allDeadlines.map(d => d.type))].sort();

  const lastCalc = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={cmFilter} onChange={e => setCmFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] font-geist text-icm-text">
            <option value="all">All CMs</option>
            {cms.map(cm => <option key={cm} value={cm}>{cm}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] font-geist text-icm-text">
            <option value="all">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex rounded-lg border border-icm-border overflow-hidden">
            {([30, 60, 90] as const).map(w => (
              <button key={w} onClick={() => setWindow(w)}
                className={cn("px-2.5 py-1.5 text-[11px] font-geist font-semibold transition-colors",
                  window === w ? "bg-icm-accent text-white" : "bg-white text-icm-text-dim hover:bg-icm-bg")}>
                {w}d
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setExpandAll(false)} className="text-[11px] font-geist text-icm-text-dim hover:text-icm-text">Collapse all</button>
          <span className="text-icm-border">|</span>
          <button onClick={() => setExpandAll(true)} className="text-[11px] font-geist text-icm-text-dim hover:text-icm-text">Expand all</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-6 w-24 bg-icm-bg rounded animate-pulse" />
              {[...Array(4)].map((_, j) => <div key={j} className="h-20 bg-icm-bg rounded-lg border border-icm-border animate-pulse" />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CalendarColumn title="Next 30 Days" items={next30} tone="red" expandAll={expandAll} />
          {window >= 60 && <CalendarColumn title="31–60 Days" items={next60} tone="amber" expandAll={expandAll} />}
          {window >= 90 && <CalendarColumn title="61–90 Days" items={next90} tone="slate" expandAll={expandAll} />}
        </div>
      )}

      <p className="text-[10px] font-geist text-icm-text-faint">
        Last calculated: {lastCalc} · Based on PCP due dates, MA redetermination dates, and visit history
      </p>
    </div>
  );
}
