import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Siren, Filter, Plus, Search, X } from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import {
  getAllIncidents, globalIncidentSummary, typeBreakdown, stageBreakdown,
  type IncidentRecord, type IncidentStatus, type IncidentStageId, STAGE_LABELS,
} from "@/data/incidents";
import { people, initials, riskAvatarClass } from "@/data/people";

const IncidentsGlobal = () => {
  const navigate = useNavigate();
  const summary = globalIncidentSummary();
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "All">("All");
  const [startOpen, setStartOpen] = useState(false);

  const all = getAllIncidents();
  const filtered = useMemo(() => all.filter((i) => {
    if (statusFilter !== "All" && i.status !== statusFilter) return false;
    if (search && !i.personName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [all, statusFilter, search]);

  const types = typeBreakdown(all);
  const totalTypes = types.reduce((s, t) => s + t.count, 0) || 1;
  const stages = stageBreakdown(all.filter((i) => i.status !== "Closed" && i.status !== "Void"));
  const maxStage = Math.max(1, ...stages.map((s) => s.count));

  return (
    <ICMShell title="Incident Reporting Center" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs
          backTo="/dashboard"
          backLabel="Dashboard"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Incidents" },
          ]}
        />
        <div>
          <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">Incident Reporting Center</h1>
          <p className="text-[13px] text-icm-text-dim mt-1 font-geist">All incidents across your caseload</p>
        </div>

        {/* Summary chips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryChip label="Total open" value={summary.totalOpen} tone="red" />
          <SummaryChip label="Step 1 pending" value={summary.step1Pending} tone="amber" />
          <SummaryChip label="Overdue" value={summary.overdue} tone="red" />
          <SummaryChip label="Closed this month" value={summary.closedThisMonth} tone="green" />
        </div>

        {/* Red AI banner */}
        <div className="rounded-xl border border-icm-red/20 bg-icm-red-soft px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <Siren className="w-5 h-5 text-icm-red shrink-0" />
            <p className="text-[12.5px] font-geist text-icm-text leading-snug">
              <span className="font-semibold">You have {summary.totalOpen} open incidents requiring action.</span>{" "}
              <span className="text-icm-text-dim">{summary.overdue} are past their required follow-up deadline.</span>
            </p>
          </div>
          <button className="text-[11.5px] font-geist font-semibold text-icm-red hover:underline">Show overdue</button>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-icm-border bg-icm-panel">
          <button onClick={() => setShowFilters((s) => !s)} className="w-full flex items-center justify-between px-3 py-2.5 text-[12px] font-geist text-icm-text">
            <span className="inline-flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Filters</span>
            <span className="text-icm-text-dim">{showFilters ? "Hide" : "Show"}</span>
          </button>
          {showFilters && (
            <div className="border-t border-icm-border p-3 flex flex-wrap items-center gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by individual…" className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] text-icm-text w-[220px]" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | "All")} className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] text-icm-text">
                <option>All</option><option>Open</option><option>In Progress</option><option>Pending Review</option><option>Closed</option>
              </select>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] font-geist">
              <thead className="bg-icm-bg/60">
                <tr>{["Individual", "ID", "Date", "Type", "Classification", "Stage", "Status", ""].map((c, i) => <th key={i} className="text-left px-4 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint whitespace-nowrap">{c}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-icm-border">
                {filtered.map((inc) => (
                  <tr key={inc.id} onClick={() => navigate(`/people/${inc.personId}/incident-reporting/${inc.id}`)} className="hover:bg-icm-bg/40 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium text-icm-text">{inc.personName}</td>
                    <td className="px-4 py-3 font-mono text-icm-text-dim">{inc.id}</td>
                    <td className="px-4 py-3 font-mono text-icm-text-dim">{inc.incidentDate}</td>
                    <td className="px-4 py-3 text-icm-text-dim">{inc.incidentTypes.join(", ")}</td>
                    <td className="px-4 py-3"><ClassificationPill c={inc.classification} /></td>
                    <td className="px-4 py-3"><StagePill stage={inc.currentStage} /></td>
                    <td className="px-4 py-3"><StatusPill s={inc.status} /></td>
                    <td className="px-4 py-3 text-right"><ArrowRight className="w-3.5 h-3.5 text-icm-accent inline" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
            <h3 className="font-manrope font-bold text-[14px] text-icm-text mb-3">Incident type distribution</h3>
            <div className="flex items-center gap-4">
              <Donut segments={types.map((t, i) => ({ value: t.count, color: donutColors[i % donutColors.length] }))} total={totalTypes} />
              <ul className="text-[11.5px] font-geist text-icm-text space-y-1 flex-1">
                {types.map((t, i) => (
                  <li key={t.label} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: donutColors[i % donutColors.length] }} />
                    <span className="flex-1 truncate">{t.label}</span>
                    <span className="font-mono text-icm-text-dim">{t.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
            <h3 className="font-manrope font-bold text-[14px] text-icm-text mb-3">Open incidents by stage</h3>
            <div className="space-y-2">
              {stages.map((s) => (
                <div key={s.stage} className="flex items-center gap-3 text-[11.5px] font-geist">
                  <span className="w-28 text-icm-text-dim">Step {s.stage} · {STAGE_LABELS[s.stage as IncidentStageId]}</span>
                  <div className="flex-1 h-2 rounded-full bg-icm-bg border border-icm-border overflow-hidden">
                    <div className="h-full bg-icm-red" style={{ width: `${(s.count / maxStage) * 100}%` }} />
                  </div>
                  <span className="font-mono text-icm-text">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-icm-accent shrink-0 mt-0.5" />
            <p className="text-[12.5px] font-geist text-icm-text leading-snug">
              {types[0] && <><span className="font-semibold">{types[0].label}</span> incidents are the most common type ({types[0].count} of {all.length}). Consider reviewing behavioral support plans for affected individuals.</>}
            </p>
          </div>
        </div>
      </div>
    </ICMShell>
  );
};

const donutColors = ["hsl(var(--icm-accent))", "hsl(var(--icm-amber))", "hsl(var(--icm-red))", "hsl(var(--icm-green))", "hsl(var(--icm-text-dim))"];

function Donut({ segments, total }: { segments: Array<{ value: number; color: string }>; total: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--icm-bg))" strokeWidth="14" />
      {segments.map((s, i) => {
        const len = (s.value / total) * c;
        const dash = `${len} ${c - len}`;
        const dashOffset = -offset;
        offset += len;
        return <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={dash} strokeDashoffset={dashOffset} transform="rotate(-90 50 50)" />;
      })}
    </svg>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: number; tone: "red" | "amber" | "green" | "neutral" }) {
  const toneClass = {
    neutral: "bg-icm-panel text-icm-text border-icm-border",
    red: "bg-icm-red-soft text-icm-red border-icm-red/20",
    amber: "bg-icm-amber-soft text-icm-amber border-icm-amber/20",
    green: "bg-icm-green-soft text-icm-green border-icm-green/20",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-[10.5px] uppercase tracking-wide font-semibold opacity-80">{label}</p>
      <p className="font-manrope font-extrabold text-[24px] mt-1 leading-none">{value}</p>
    </div>
  );
}

function StagePill({ stage }: { stage: IncidentStageId }) {
  const tone = stage <= 2 ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20" : stage <= 4 ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20" : "bg-icm-green-soft text-icm-green ring-icm-green/20";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ring-1 ${tone}`}>Step {stage} of 5</span>;
}

function StatusPill({ s }: { s: IncidentStatus }) {
  const map = {
    Open: "bg-icm-red-soft text-icm-red ring-icm-red/20",
    "In Progress": "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    "Pending Review": "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    Closed: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    Void: "bg-icm-bg text-icm-text-faint ring-icm-border line-through",
  } as const;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${map[s]}`}>{s}</span>;
}

function ClassificationPill({ c }: { c: IncidentRecord["classification"] }) {
  const map = {
    Critical: "bg-icm-red-soft text-icm-red ring-icm-red/20",
    Significant: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    Minor: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    Unknown: "bg-icm-bg text-icm-text-dim ring-icm-border",
  } as const;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${map[c]}`}>{c}</span>;
}

export default IncidentsGlobal;
