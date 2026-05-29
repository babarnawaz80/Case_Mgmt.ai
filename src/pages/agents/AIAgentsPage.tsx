import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import {
  Brain,
  Bot,
  Plus,
  BookOpen,
  Play,
  Settings as SettingsIcon,
  Circle,
  AlertTriangle,
  Loader2,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAgents, cleanupDummyAgents, seedAgents, type AgentDoc } from "@/services/agentsService";
import { useOrchestrator } from "@/hooks/useOrchestrator";
import { useRole } from "@/contexts/RoleContext";
import { AdminOnly } from "@/components/platform/AdminOnly";
import { TONE_CLASSES, type ColorTone } from "@/data/complianceAgents";

// ─── Orchestrator Hero Card ────────────────────────────────────────────────────

function OrchestratorHeroCard() {
  const navigate = useNavigate();
  const {
    runs,
    lastRun,
    running,
    runProgress,
    openTasksCount,
    draftsReadyCount,
    triggerRun,
    runsLoading,
  } = useOrchestrator();

  const lastRunText = lastRun
    ? lastRun.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "No runs yet";

  // Pull org compliance score and individuals from most recent run
  const latestRun = runs[0] ?? null;
  const individualsProcessed = latestRun?.individuals_processed ?? null;

  // Avg compliance from orchestrator runs
  const avgCompliance = useMemo(() => {
    const scored = runs.filter(r => r.compliance_scores_updated > 0);
    if (scored.length === 0) return null;
    return null; // pull from individuals collection in full impl; show — for now
  }, [runs]);

  function handleBodyClick(e: React.MouseEvent) {
    // Don't navigate if a button was clicked
    if ((e.target as HTMLElement).closest("button")) return;
    navigate("/agents/orchestrator");
  }

  return (
    <div
      onClick={handleBodyClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      }}
    >
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Glow accent */}
      <div className="absolute top-0 left-1/3 w-96 h-32 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

      <div className="relative p-6 space-y-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/20 ring-1 ring-white/10 flex items-center justify-center shrink-0">
              <Brain className="w-7 h-7 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-manrope font-extrabold text-[20px] text-white leading-tight tracking-tight">
                  AI Orchestrator
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-geist font-bold bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
                {running && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-geist font-bold bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    RUNNING {runProgress > 0 ? `${Math.round(runProgress * 100)}%` : ""}
                  </span>
                )}
              </div>
              <p className="text-[12.5px] font-geist text-slate-400 mt-1.5 leading-relaxed max-w-[560px]">
                Autonomous orchestration engine. Reads every individual's state guidelines, calculates
                what is due, overdue, or missing across your entire caseload, and coordinates all
                specialist agents. Runs nightly. Prepares everything — humans approve everything.
              </p>
            </div>
          </div>

        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 py-4 border-y border-white/10">
          <OrchestratorStat
            label="COMPLIANCE"
            value={avgCompliance !== null ? `${avgCompliance}%` : "—"}
            loading={runsLoading}
          />
          <OrchestratorStat
            label="INDIVIDUALS"
            value={individualsProcessed !== null ? String(individualsProcessed) : "—"}
            loading={runsLoading}
          />
          <OrchestratorStat
            label="DRAFTS PENDING"
            value={runsLoading ? "—" : draftsReadyCount > 0 ? String(draftsReadyCount) : "—"}
            loading={runsLoading}
            amber={draftsReadyCount > 0}
          />
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 text-[11px] font-geist text-slate-400">
            <span>Last run: <span className="text-slate-300">{lastRunText}</span></span>
            <span className="hidden sm:block">Next scheduled: <span className="text-slate-300">Tomorrow at 2:00 AM</span></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); navigate("/settings/ai"); }}
              className="h-8 px-3 rounded-xl border border-white/15 text-[12px] font-geist font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              Settings
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); triggerRun(); }}
              disabled={running}
              className="h-8 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-[12px] font-geist font-bold text-white transition-colors inline-flex items-center gap-1.5"
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {running ? "Running…" : "Run Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrchestratorStat({ label, value, loading, amber }: { label: string; value: string; loading: boolean; amber?: boolean }) {
  return (
    <div className="text-center">
      <p className={cn("font-mono font-bold text-[22px] leading-tight", amber ? "text-amber-300" : "text-white")}>
        {loading ? "—" : value}
      </p>
      <p className="text-[9px] uppercase tracking-widest font-geist text-slate-500 mt-1">{label}</p>
    </div>
  );
}

// ─── Agent Card ────────────────────────────────────────────────────────────────

function toDisplayAgent(a: AgentDoc) {
  const lastRun = a.last_run_at?.toDate().toLocaleString() ?? "—";
  return {
    id: a.id,
    name: a.name,
    type: a.type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    version: a.version ?? "v1.0",
    status: a.status === "active" ? "Active" : "Inactive",
    autoMonitor: a.auto_monitor,
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

type DisplayAgent = ReturnType<typeof toDisplayAgent>;

function AgentCard({ agent }: { agent: DisplayAgent }) {
  const navigate = useNavigate();
  const tone = TONE_CLASSES[agent.tone] ?? TONE_CLASSES.accent;
  const compTone =
    agent.compliancePct >= 90
      ? "text-icm-green"
      : agent.compliancePct >= 70
      ? "text-icm-amber"
      : "text-icm-red";

  return (
    <div
      onClick={() => navigate(`/agents/${agent.id}`)}
      className={cn(
        "cursor-pointer rounded-xl border border-icm-border border-l-[3px] bg-icm-panel p-4 hover:border-icm-border-strong hover:shadow-elevated transition-all",
        tone.border
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-xl ring-1 flex items-center justify-center shrink-0", tone.iconBg)}>
          <Bot className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-manrope font-bold text-[14px] text-icm-text truncate">{agent.name}</h3>
          <p className="text-[11px] font-geist text-icm-text-dim mt-0.5">{agent.type} · {agent.version}</p>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 bg-icm-green-soft text-icm-green ring-icm-green/20">
          ACTIVE
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-geist text-icm-text-dim">
          <Circle className={cn("w-2 h-2", agent.autoMonitor ? "fill-icm-accent text-icm-accent" : "fill-icm-text-faint text-icm-text-faint")} />
          {agent.autoMonitor ? "AUTO-MONITOR" : "MONITOR: OFF"}
        </span>
      </div>

      {/* Description */}
      <p className="text-[12.5px] font-geist text-icm-text-dim mt-2.5 leading-relaxed line-clamp-2">
        {agent.description}
      </p>

      {/* Powered by */}
      <button
        onClick={(e) => { e.stopPropagation(); navigate(`/agents/guidelines/${agent.engineId}`); }}
        className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-geist text-icm-text-dim hover:text-icm-accent"
      >
        <BookOpen className="w-3 h-3" />
        Powered by: <span className="font-medium text-icm-text ml-0.5">{agent.engineName} {agent.engineVersion}</span>
      </button>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-3 py-3 border-y border-icm-border text-center">
        <div>
          <p className={cn("font-mono font-bold text-[18px] leading-tight", compTone)}>{agent.compliancePct}%</p>
          <p className="text-[9px] uppercase tracking-wider text-icm-text-faint font-geist mt-0.5">COMPLIANCE</p>
        </div>
        <div>
          <p className="font-mono font-bold text-[18px] leading-tight text-icm-text">{agent.individuals}</p>
          <p className="text-[9px] uppercase tracking-wider text-icm-text-faint font-geist mt-0.5">INDIVIDUALS</p>
        </div>
        <div>
          <p className={cn("font-mono font-bold text-[18px] leading-tight", agent.draftsPending > 0 ? "text-icm-amber" : "text-icm-text")}>
            {agent.draftsPending}
          </p>
          <p className="text-[9px] uppercase tracking-wider text-icm-text-faint font-geist mt-0.5">DRAFTS</p>
        </div>
      </div>

      <p className="text-[10.5px] font-mono text-icm-text-faint mt-2">Last evaluated: {agent.lastEvaluated}</p>

      {/* Buttons */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/agents/${agent.id}`); }}
          className={cn("flex-1 h-9 rounded-xl text-[12px] font-geist font-semibold inline-flex items-center justify-center gap-1.5", tone.runBtn)}
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
          onClick={(e) => { e.stopPropagation(); navigate(`/agents/${agent.id}`); }}
          className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong inline-flex items-center gap-1.5"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
          Settings
        </button>
      </div>
    </div>
  );
}

// ─── Create Agent Card ─────────────────────────────────────────────────────────

function CreateAgentCard() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/agents/new")}
      className="rounded-xl border-2 border-dashed border-icm-border bg-icm-panel p-4 hover:border-icm-accent/40 hover:bg-icm-accent-soft/20 transition-all text-left w-full flex flex-col items-center justify-center min-h-[200px] gap-3 group"
    >
      <div className="w-10 h-10 rounded-xl border-2 border-dashed border-icm-border group-hover:border-icm-accent/40 flex items-center justify-center">
        <Plus className="w-5 h-5 text-icm-text-dim group-hover:text-icm-accent" />
      </div>
      <div className="text-center">
        <p className="text-[13px] font-manrope font-bold text-icm-text-dim group-hover:text-icm-text">Create New Agent</p>
        <p className="text-[11px] font-geist text-icm-text-faint mt-0.5">Link a Guidelines Engine and define your agent's behavior</p>
      </div>
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const AIAgentsPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const [agents, setAgents] = useState<DisplayAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Clean up old dummy agents from Firestore, seed if needed
      await cleanupDummyAgents();
      await seedAgents();
      const docs = await getAgents();
      setAgents(docs.map(toDisplayAgent));
      setLoading(false);
    })();
  }, []);

  const sum = useMemo(() => {
    const active = agents.filter(a => a.status === "Active").length;
    const individuals = agents.reduce((s, a) => s + a.individuals, 0);
    const avgCompliance = agents.length
      ? Math.round(agents.reduce((s, a) => s + a.compliancePct, 0) / agents.length)
      : null;
    const drafts = agents.reduce((s, a) => s + a.draftsPending, 0);
    return { active, individuals, avgCompliance, drafts };
  }, [agents]);

  if (!isAdmin) return <AdminOnly />;

  return (
    <ICMShell title="AI Agents" showAIPanel={false}>
      <div className="space-y-5 max-w-[1280px]">

        {/* Header */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              AI Agents
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              Intelligent agents that run compliance, generate documentation, and orchestrate your caseload automatically.
            </p>
          </div>
          <button
            onClick={() => navigate("/agents/guidelines")}
            className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong inline-flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Guidelines Engines
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap items-center gap-2">
          <StatChip label="ACTIVE AGENTS" value={loading ? "—" : String(sum.active)} tone="green" />
          <StatChip label="INDIVIDUALS SERVED" value={loading ? "—" : sum.individuals > 0 ? String(sum.individuals) : "—"} tone="accent" />
          <StatChip label="AVG COMPLIANCE" value={loading ? "—" : sum.avgCompliance !== null ? `${sum.avgCompliance}%` : "—"} tone="green" />
          <StatChip label="DRAFTS PENDING" value={loading ? "—" : sum.drafts > 0 ? String(sum.drafts) : "—"} tone="amber" />
        </div>

        {/* AI Orchestrator hero card */}
        <OrchestratorHeroCard />

        {/* Specialist agents grid */}
        <div>
          <h2 className="font-manrope text-[15px] font-bold text-icm-text mb-3">Specialist Agents</h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="rounded-xl border border-icm-border bg-icm-panel p-4 animate-pulse h-64" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {agents.map(a => <AgentCard key={a.id} agent={a} />)}
              <CreateAgentCard />
            </div>
          )}
        </div>

      </div>
    </ICMShell>
  );
};

function StatChip({ label, value, tone }: { label: string; value: string; tone: "green" | "accent" | "amber" }) {
  const cls =
    tone === "green"
      ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
      : tone === "accent"
      ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20"
      : "bg-icm-amber-soft text-icm-amber ring-icm-amber/20";
  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ring-1", cls)}>
      <span className="text-[10px] uppercase tracking-wide font-geist font-semibold opacity-80">{label}</span>
      <span className="font-mono font-bold text-[14px]">{value}</span>
    </div>
  );
}

export default AIAgentsPage;
