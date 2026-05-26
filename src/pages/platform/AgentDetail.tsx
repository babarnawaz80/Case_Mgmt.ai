import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import {
  ChevronLeft,
  ChevronRight,
  Bot,
  Play,
  Settings as SettingsIcon,
  BookOpen,
  Layers,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit2,
  Trash2,
  Calendar,
  User,
  Loader2,
} from "lucide-react";
import { getAgentById, updateAgent, updateMasterPrompt, type AgentDoc } from "@/services/agentsService";
import { getRunsForAgent, type AgentRunDoc } from "@/services/agentRunsService";
import { useRole } from "@/contexts/RoleContext";
import { AdminOnly } from "@/components/platform/AdminOnly";
import { AgentRunModal } from "@/components/platform/AgentRunModal";
import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<string, { border: string; iconBg: string; text: string; runBtn: string }> = {
  accent: {
    border: "border-l-icm-accent",
    iconBg: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    text: "text-icm-accent",
    runBtn: "bg-icm-accent text-white hover:opacity-90",
  },
  green: {
    border: "border-l-icm-green",
    iconBg: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    text: "text-icm-green",
    runBtn: "bg-icm-green text-white hover:opacity-90",
  },
  amber: {
    border: "border-l-icm-amber",
    iconBg: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    text: "text-icm-amber",
    runBtn: "bg-icm-amber text-white hover:opacity-90",
  },
  purple: {
    border: "border-l-purple-500",
    iconBg: "bg-purple-50 text-purple-600 ring-purple-200",
    text: "text-purple-600",
    runBtn: "bg-purple-600 text-white hover:opacity-90",
  },
  red: {
    border: "border-l-icm-red",
    iconBg: "bg-icm-red-soft text-icm-red ring-icm-red/20",
    text: "text-icm-red",
    runBtn: "bg-icm-red text-white hover:opacity-90",
  },
};

export function AgentDetail() {
  const navigate = useNavigate();
  const { agentId } = useParams<{ agentId: string }>();
  const { isAdmin } = useRole();

  const [agent, setAgent] = useState<AgentDoc | null>(null);
  const [runs, setRuns] = useState<AgentRunDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings / Edit State
  const [promptInput, setPromptInput] = useState("");
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);

  const [autoMonitor, setAutoMonitor] = useState(false);
  const [pushMode, setPushMode] = useState<AgentDoc['push_mode']>("manual");
  const [savingSettings, setSavingSettings] = useState(false);

  const [isRunModalOpen, setIsRunModalOpen] = useState(false);

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      const docData = await getAgentById(agentId);
      if (docData) {
        setAgent(docData);
        setPromptInput(docData.master_prompt);
        setAutoMonitor(docData.auto_monitor);
        setPushMode(docData.push_mode);
      }
      const runsData = await getRunsForAgent(agentId);
      setRuns(runsData);
      setLoading(false);
    })();
  }, [agentId, isRunModalOpen]);

  const handleSavePrompt = async () => {
    if (!agentId) return;
    setSavingPrompt(true);
    await updateMasterPrompt(agentId, promptInput, "Babar Nawaz");
    setAgent((p) => p ? { ...p, master_prompt: promptInput } : null);
    setIsEditingPrompt(false);
    setSavingPrompt(false);
  };

  const handleSaveSettings = async (monitorVal: boolean, modeVal: AgentDoc['push_mode']) => {
    if (!agentId) return;
    setSavingSettings(true);
    await updateAgent(agentId, { auto_monitor: monitorVal, push_mode: modeVal });
    setAutoMonitor(monitorVal);
    setPushMode(modeVal);
    setAgent((p) => p ? { ...p, auto_monitor: monitorVal, push_mode: modeVal } : null);
    setSavingSettings(false);
  };

  if (!isAdmin) return <AdminOnly />;

  if (loading) {
    return (
      <ICMShell title="Loading Agent..." showAIPanel={false}>
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-icm-accent animate-spin" />
          <p className="text-[12px] text-icm-text-dim mt-2 font-geist">Retrieving agent context...</p>
        </div>
      </ICMShell>
    );
  }

  if (!agent) {
    return (
      <ICMShell title="Agent Not Found" showAIPanel={false}>
        <div className="max-w-[480px] mx-auto mt-12 rounded-xl border border-icm-border bg-icm-panel p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-icm-amber mx-auto mb-3" />
          <h2 className="font-manrope font-extrabold text-[18px] text-icm-text">Agent Context Missing</h2>
          <p className="text-[13px] text-icm-text-dim mt-1 font-geist">This agent may have been removed or does not exist in this database.</p>
          <button
            onClick={() => navigate("/platform/agents")}
            className="mt-5 h-9 px-4 rounded-xl border border-icm-border text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text"
          >
            Back to dashboard
          </button>
        </div>
      </ICMShell>
    );
  }

  const tone = TONE_CLASSES[agent.tone ?? "accent"] || TONE_CLASSES.accent;

  return (
    <ICMShell title={agent.name} showAIPanel={false}>
      <div className="space-y-5 max-w-[1100px]">
        {/* Breadcrumb */}
        <div className="text-[11.5px] font-geist text-icm-text-dim flex items-center gap-1.5 flex-wrap">
          <button onClick={() => navigate("/platform")} className="hover:text-icm-text inline-flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Platform
          </button>
          <ChevronRight className="w-3 h-3 text-icm-text-faint" />
          <button onClick={() => navigate("/platform/agents")} className="hover:text-icm-text">
            Compliance Agents
          </button>
          <ChevronRight className="w-3 h-3 text-icm-text-faint" />
          <span className="text-icm-text">{agent.name}</span>
        </div>

        <button
          onClick={() => navigate("/platform/agents")}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Compliance Agents
        </button>

        {/* Header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ring-1", tone.iconBg)}>
                <Bot className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-manrope font-extrabold text-[22px] text-icm-text leading-tight tracking-tight">
                    {agent.name}
                  </h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
                    ACTIVE
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-icm-bg border border-icm-border text-icm-text-dim">
                    {agent.version ?? "v1.0"}
                  </span>
                </div>
                <p className="text-[12.5px] font-geist text-icm-text-dim mt-1 max-w-[580px] leading-relaxed">
                  {agent.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsRunModalOpen(true)}
                className="h-10 px-4 rounded-xl bg-icm-text text-icm-panel text-[13px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Agent
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Avg Compliance"
            value={`${agent.avg_compliance}%`}
            desc="Across caseload runs"
            color="text-icm-green"
          />
          <StatCard
            label="Individuals Served"
            value={agent.individuals_count}
            desc="Active cases monitored"
            color="text-icm-accent"
          />
          <StatCard
            label="Drafts Pending"
            value={agent.drafts_pending}
            desc="Awaiting CM approval"
            color={agent.drafts_pending > 0 ? "text-icm-amber" : "text-icm-text"}
          />
          <StatCard
            label="Last run"
            value={agent.last_run_at ? agent.last_run_at.toDate().toLocaleDateString() : "Never"}
            desc={agent.last_run_at ? agent.last_run_at.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
            color="text-icm-text-dim"
          />
        </div>

        {/* Main Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Left Column (66%) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Guidelines engine card */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-4 text-left">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-icm-text-dim" />
                <h3 className="text-[12px] uppercase tracking-wide font-geist font-semibold text-icm-text-faint">
                  Linked Guidelines Engine
                </h3>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-icm-border bg-icm-bg hover:border-icm-border-strong cursor-pointer transition-colors"
                   onClick={() => navigate(`/platform/guidelines-engines/${agent.guidelines_engine_id}`)}>
                <div>
                  <h4 className="text-[13.5px] font-geist font-semibold text-icm-text">{agent.guidelines_engine_name}</h4>
                  <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">Guidelines Version: {agent.guidelines_engine_version}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-icm-text-faint" />
              </div>
            </div>

            {/* Master Prompt card */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-3 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-icm-accent" />
                  <h3 className="text-[12px] uppercase tracking-wide font-geist font-semibold text-icm-text-faint">
                    Agent Master Prompt
                  </h3>
                </div>
                {!isEditingPrompt && (
                  <button
                    onClick={() => setIsEditingPrompt(true)}
                    className="h-8 px-2.5 rounded-lg hover:bg-icm-bg text-[11px] font-geist font-medium text-icm-accent flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit Prompt
                  </button>
                )}
              </div>

              {isEditingPrompt ? (
                <div className="space-y-3">
                  <textarea
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    rows={6}
                    className="w-full p-3 rounded-xl bg-icm-bg border border-icm-border text-[12.5px] font-geist text-icm-text focus:outline-none focus:border-icm-accent/40 resize-y"
                    placeholder="Instructions guiding how this agent writes generated notes..."
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSavePrompt}
                      disabled={savingPrompt}
                      className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-geist font-semibold hover:opacity-90 inline-flex items-center gap-1.5"
                    >
                      {savingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save
                    </button>
                    <button
                      onClick={() => { setPromptInput(agent.master_prompt); setIsEditingPrompt(false); }}
                      className="h-8 px-3 rounded-lg border border-icm-border text-[11.5px] font-geist font-medium text-icm-text-dim hover:text-icm-text"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-icm-bg border border-icm-border border-l-[3px] border-l-icm-accent">
                  <p className="text-[12.5px] font-geist text-icm-text leading-relaxed whitespace-pre-wrap">
                    {agent.master_prompt}
                  </p>
                </div>
              )}
            </div>

            {/* Recent runs table */}
            <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden text-left">
              <div className="p-4 border-b border-icm-border">
                <h3 className="font-manrope font-extrabold text-[14px] text-icm-text">
                  Recent Runs
                </h3>
              </div>
              {runs.length === 0 ? (
                <div className="p-8 text-center text-[12.5px] font-geist text-icm-text-dim">
                  No active runs in the log. Execute the agent to begin monitoring caseloads.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12.5px] font-geist">
                    <thead>
                      <tr className="border-b border-icm-border bg-icm-bg">
                        <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-icm-text-dim">Date / Time</th>
                        <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-icm-text-dim">Individual</th>
                        <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-icm-text-dim">Type</th>
                        <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-icm-text-dim">Compliance</th>
                        <th className="text-right px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-icm-text-dim">HS / W</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-icm-border">
                      {runs.map((r) => {
                        const dateStr = r.started_at
                          ? r.started_at.toDate().toLocaleString()
                          : "—";
                        return (
                          <tr key={r.id} className="hover:bg-icm-bg/50">
                            <td className="px-4 py-3 font-mono text-[11px] text-icm-text-dim">{dateStr}</td>
                            <td className="px-4 py-3 font-semibold text-icm-text">{r.individual_name}</td>
                            <td className="px-4 py-3 text-icm-text-dim capitalize">
                              {r.run_type.replace(/_/g, " ")}
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold font-geist ring-1",
                                r.result?.compliance === "pass"
                                  ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
                                  : "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
                              )}>
                                {r.result?.compliance.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-[11px]">
                              <span className="text-icm-red font-semibold">{r.result?.hard_stops}</span>
                              <span className="text-icm-text-faint mx-1">/</span>
                              <span className="text-icm-amber font-semibold">{r.result?.warnings}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Right Column (33%) */}
          <div className="space-y-4">
            
            {/* Settings controls */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-4 text-left">
              <div className="flex items-center gap-2 pb-2 border-b border-icm-border">
                <SettingsIcon className="w-4 h-4 text-icm-text-dim" />
                <h3 className="text-[12px] uppercase tracking-wide font-geist font-semibold text-icm-text-faint">
                  Agent Controls
                </h3>
              </div>

              {/* Auto-Monitor */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoMonitor}
                  disabled={savingSettings}
                  onChange={(e) => handleSaveSettings(e.target.checked, pushMode)}
                  className="mt-0.5 w-4 h-4 accent-icm-accent rounded border-icm-border"
                />
                <div>
                  <p className="text-[12.5px] font-geist font-semibold text-icm-text">Auto-Monitor Caseload</p>
                  <p className="text-[11px] text-icm-text-dim leading-snug font-geist mt-0.5">Executes automatically in the background on scheduled frequency.</p>
                </div>
              </label>

              {/* Push Mode */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wider">
                  Push Mode
                </label>
                <select
                  value={pushMode}
                  disabled={savingSettings}
                  onChange={(e) => handleSaveSettings(autoMonitor, e.target.value as AgentDoc['push_mode'])}
                  className="w-full h-9 px-3 rounded-xl bg-icm-bg border border-icm-border text-[12.5px] font-geist text-icm-text focus:outline-none"
                >
                  <option value="manual">Manual Push</option>
                  <option value="auto_pass">Auto-Pass Compliant Notes</option>
                  <option value="auto_always">Auto-Always Push notes</option>
                </select>
                <p className="text-[10px] font-geist text-icm-text-faint leading-normal pt-0.5">
                  Controls whether findings are pushed directly to iCM modules automatically or require case manager review.
                </p>
              </div>

              {/* Schedule Display */}
              <div className="pt-3 border-t border-icm-border space-y-1">
                <span className="text-[10px] font-geist font-semibold text-icm-text-dim uppercase tracking-wider">Background Schedule</span>
                <p className="text-[12px] font-mono text-icm-text">{agent.schedule ?? "Manual only"}</p>
              </div>
            </div>

            {/* Quick stats info */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-5 text-left space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-icm-text-dim" />
                <h3 className="text-[12px] uppercase tracking-wide font-geist font-semibold text-icm-text-faint">
                  Agent Telemetry
                </h3>
              </div>
              <div className="space-y-2.5 pt-1 text-[12px] font-geist">
                <div className="flex justify-between">
                  <span className="text-icm-text-dim">Created By:</span>
                  <span className="text-icm-text font-semibold">{agent.created_by}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-icm-text-dim">Created On:</span>
                  <span className="text-icm-text font-mono">
                    {agent.created_at ? agent.created_at.toDate().toLocaleDateString() : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-icm-text-dim">Auto-Monitor Status:</span>
                  <span className={cn(
                    "font-semibold",
                    autoMonitor ? "text-icm-accent" : "text-icm-text-dim"
                  )}>
                    {autoMonitor ? "RUNNING" : "PAUSED"}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Execution Modal */}
      <AgentRunModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        agentId={agent.id}
        agentName={agent.name}
        runType={
          agent.type === 'pcp_generator'
            ? 'pcp_generation'
            : agent.type === 'monitoring_reauth'
            ? 'monitoring_review'
            : 'compliance_check'
        }
      />
    </ICMShell>
  );
}

function StatCard({ label, value, desc, color }: { label: string; value: string | number; desc: string; color: string }) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 text-left">
      <p className="text-[10px] font-geist font-semibold text-icm-text-dim uppercase tracking-wider">{label}</p>
      <p className={cn("font-manrope font-extrabold text-[24px] tracking-tight mt-1 leading-none", color)}>
        {value}
      </p>
      <p className="text-[11px] font-geist text-icm-text-faint mt-1.5 truncate">{desc}</p>
    </div>
  );
}

export default AgentDetail;
