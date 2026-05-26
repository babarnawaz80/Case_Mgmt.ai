import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import {
  Bot,
  Plus,
  Search,
  ChevronRight,
  MoreHorizontal,
  Play,
  Settings as SettingsIcon,
  AlertTriangle,
  BookOpen,
  Layers,
  Circle,
} from "lucide-react";
import { TONE_CLASSES, type ColorTone } from "@/data/complianceAgents";
import { getAgents, type AgentDoc } from "@/services/agentsService";
import { seedPlatformData } from "@/lib/seedPlatformData";
import { useRole } from "@/contexts/RoleContext";
import { AdminOnly } from "@/components/platform/AdminOnly";

// Adapter: map AgentDoc → display-compatible shape
function toDisplayAgent(a: AgentDoc) {
  const lastRun = a.last_run_at?.toDate().toLocaleString() ?? "—";
  return {
    id: a.id,
    name: a.name,
    type: a.type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    version: a.version ?? "v1.0",
    status: a.status === "active" ? "Active" : "Inactive",
    autoMonitor: a.auto_monitor,
    schedule: a.schedule ?? "Manual only",
    pushMode: a.push_mode,
    tone: (a.tone ?? "accent") as ColorTone,
    description: a.description,
    engineId: a.guidelines_engine_id,
    engineName: a.guidelines_engine_name,
    engineVersion: a.guidelines_engine_version,
    compliancePct: a.avg_compliance,
    individuals: a.individuals_count,
    draftsPending: a.drafts_pending,
    alertCount: a.alert_count ?? 0,
    lastEvaluated: lastRun,
  };
}

const ComplianceAgentsList = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const [query, setQuery] = useState("");
  const [agents, setAgents] = useState<ReturnType<typeof toDisplayAgent>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await seedPlatformData();
      const docs = await getAgents();
      setAgents(docs.map(toDisplayAgent));
      setLoading(false);
    })();
  }, []);

  const sum = useMemo(() => {
    const activeAgents = agents.filter(a => a.status === "Active").length;
    const totalIndividuals = agents.reduce((s, a) => s + a.individuals, 0);
    const avgCompliance = agents.length
      ? Math.round(agents.reduce((s, a) => s + a.compliancePct, 0) / agents.length)
      : 0;
    const totalDrafts = agents.reduce((s, a) => s + a.draftsPending, 0);
    const totalAlerts = agents.reduce((s, a) => s + a.alertCount, 0);
    return { activeAgents, totalIndividuals, avgCompliance, totalDrafts, totalAlerts };
  }, [agents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        a.engineName.toLowerCase().includes(q),
    );
  }, [query, agents]);

  if (!isAdmin) return <AdminOnly />;

  return (
    <ICMShell title="Compliance Agents" showAIPanel={false}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <div className="text-[11.5px] font-geist text-icm-text-dim flex items-center gap-1.5">
          <button
            onClick={() => navigate("/platform")}
            className="hover:text-icm-text inline-flex items-center gap-1"
          >
            <Layers className="w-3.5 h-3.5" />
            Platform
          </button>
          <ChevronRight className="w-3 h-3 text-icm-text-faint" />
          <span className="text-icm-text">Compliance Agents</span>
        </div>

        {/* Header */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Compliance Agents
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              Runtime agents that apply Guidelines Engines to your caseload
              automatically
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/platform/guidelines-engines")}
              className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong inline-flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Guidelines Engines
            </button>
            <button
              onClick={() => navigate("/platform/agents/new")}
              className="h-9 px-3.5 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Agent
            </button>
          </div>
        </div>

        {/* Stat chips + search */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Chip label="Active Agents" value={loading ? "—" : sum.activeAgents} tone="green" />
              <Chip
                label="Individuals Served"
                value={loading ? "—" : sum.totalIndividuals}
                tone="accent"
              />
              <Chip
                label="Avg Compliance"
                value={loading ? "—" : `${sum.avgCompliance}%`}
                tone="green"
              />
              <Chip
                label="Drafts Pending"
                value={loading ? "—" : sum.totalDrafts}
                tone="amber"
              />
            </div>
            <div className="relative w-full sm:w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search agents..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-icm-panel border border-icm-border text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40"
              />
            </div>
          </div>
          <p className="text-[11.5px] text-icm-text-dim font-geist">
            Running compliance · Across all agents · Denial prevention ·
            Auto-monitor drafts
          </p>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="rounded-xl border border-icm-border bg-icm-panel p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-icm-bg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-icm-bg rounded w-3/4" />
                    <div className="h-3 bg-icm-bg rounded w-1/2" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 bg-icm-bg rounded" />
                  <div className="h-3 bg-icm-bg rounded w-4/5" />
                </div>
                <div className="mt-4 h-9 bg-icm-bg rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Agent grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((a) => (
              <AgentCard
                key={a.id}
                agent={a}
                onOpen={() => navigate(`/platform/agents/${a.id}`)}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel py-12 text-center">
            <p className="text-[13px] text-icm-text-dim font-geist">
              {agents.length === 0 ? "No agents found. Create your first agent to get started." : "No agents match your search."}
            </p>
          </div>
        )}
      </div>
    </ICMShell>
  );
};


type DisplayAgent = ReturnType<typeof toDisplayAgent>;

function AgentCard({
  agent,
  onOpen,
}: {
  agent: DisplayAgent;
  onOpen: () => void;
}) {
  const navigate = useNavigate();
  const tone = TONE_CLASSES[agent.tone];
  const compTone =
    agent.compliancePct >= 90
      ? "text-icm-green"
      : agent.compliancePct >= 70
      ? "text-icm-amber"
      : "text-icm-red";
  return (
    <div
      onClick={onOpen}
      className={`cursor-pointer text-left rounded-xl border border-icm-border border-l-[3px] ${tone.border} bg-icm-panel p-4 hover:border-icm-border-strong hover:shadow-elevated transition-all`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl ring-1 flex items-center justify-center shrink-0 ${tone.iconBg}`}
          >
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-tight font-semibold text-[14px] text-icm-text truncate">
              {agent.name}
            </h3>
            <p className="text-[11px] font-geist text-icm-text-dim mt-0.5">
              {agent.type} · {agent.version}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-1 shrink-0">
          <button
            onClick={(e) => e.stopPropagation()}
            className="h-7 w-7 rounded-lg hover:bg-icm-bg flex items-center justify-center text-icm-text-dim"
            title="More"
            aria-label="More"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${
            agent.status === "Active"
              ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
              : "bg-icm-bg text-icm-text-dim ring-icm-border"
          }`}
        >
          {agent.status === "Active" ? "ACTIVE" : "INACTIVE"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-geist text-icm-text-dim">
          <Circle
            className={`w-2 h-2 ${
              agent.autoMonitor
                ? "fill-icm-accent text-icm-accent"
                : "fill-icm-text-faint text-icm-text-faint"
            }`}
          />
          {agent.autoMonitor ? "AUTO-MONITOR" : "MONITOR: OFF"}
        </span>
      </div>

      {/* Description */}
      <p className="text-[12.5px] font-geist text-icm-text-dim mt-2.5 leading-relaxed line-clamp-2">
        {agent.description}
      </p>

      {/* Powered by */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/platform/guidelines-engines/${agent.engineId}`);
        }}
        className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-geist text-icm-text-dim hover:text-icm-accent"
      >
        <BookOpen className="w-3 h-3" />
        Powered by:{" "}
        <span className="font-medium text-icm-text">
          {agent.engineName} {agent.engineVersion}
        </span>
      </button>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mt-3 py-3 border-y border-icm-border">
        <Stat label="COMPLIANCE" value={`${agent.compliancePct}%`} tone={compTone} />
        <Stat label="INDIVIDUALS" value={agent.individuals} tone="text-icm-text" />
        <Stat
          label="DRAFTS"
          value={agent.draftsPending}
          tone={agent.draftsPending > 0 ? "text-icm-amber" : "text-icm-text"}
        />
      </div>

      <p className="text-[10.5px] font-mono text-icm-text-faint mt-2">
        Last evaluated: {agent.lastEvaluated}
      </p>

      {/* Footer buttons */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/platform/agents/${agent.id}`);
          }}
          className={`flex-1 h-9 rounded-xl text-[12px] font-geist font-semibold inline-flex items-center justify-center gap-1.5 ${tone.runBtn}`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Run Agent
          {agent.alertCount > 0 && (
            <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono font-bold">
              <AlertTriangle className="w-2.5 h-2.5" />
              {agent.alertCount}
            </span>
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/platform/agents/${agent.id}`);
          }}
          className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong inline-flex items-center gap-1.5"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
          Settings
        </button>
      </div>
    </div>
  );
}

function Chip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "green" | "accent" | "amber";
}) {
  const cls =
    tone === "green"
      ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
      : tone === "accent"
      ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20"
      : "bg-icm-amber-soft text-icm-amber ring-icm-amber/20";
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ring-1 ${cls}`}
    >
      <span className="text-[10px] uppercase tracking-wide font-geist font-semibold opacity-80">
        {label}
      </span>
      <span className="font-mono font-bold text-[14px]">{value}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className="text-center">
      <p className={`font-mono font-bold text-[18px] leading-tight ${tone}`}>
        {value}
      </p>
      <p className="text-[9px] uppercase tracking-wider text-icm-text-faint font-geist mt-0.5">
        {label}
      </p>
    </div>
  );
}

export default ComplianceAgentsList;
