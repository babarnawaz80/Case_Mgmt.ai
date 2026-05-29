import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Layers,
  Hand,
  CheckCircle2,
  Zap,
  Bot,
  X,
  AlertTriangle,
  BookOpen,
  Database,
  ArrowRight,
} from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { AdminOnly } from "@/components/platform/AdminOnly";
import type { AgentType, PushMode } from "@/data/complianceAgents";
import { getGuidelinesEngines, getPublishedEngines, type GuidelinesEngineDoc } from "@/services/guidelinesEngineService";
import { createAgent } from "@/services/agentsService";

const AGENT_TYPES: Array<{ type: AgentType; description: string }> = [
  {
    type: "Guidelines Engine Agent",
    description:
      "Full compliance enforcement across eligibility, PCP, limits, conflicts, and documentation.",
  },
  {
    type: "PCP Alignment",
    description:
      "Scans PCP vs guideline pack requirements, identifies missing items, drafts addendum language.",
  },
  {
    type: "Billing Documentation",
    description:
      "Verifies billable requirements, generates compliant note templates, cross-checks conflicts and units.",
  },
  {
    type: "Monitoring / Reauthorization",
    description:
      "Tracks monitoring deadlines, reauthorization caps, creates monitoring forms and reauth drafts automatically.",
  },
  {
    type: "ISP Generator",
    description:
      "Generates Individual Service Plans from assessments, monitoring data, and state guidelines. Drafts complete ISPs for case manager review.",
  },
  {
    type: "Ambient Meeting Copilot",
    description:
      "Compliance overlay for ambient sessions — flags issues in real time and drafts follow-ups.",
  },
  {
    type: "Custom",
    description: "Define your own behavior with custom agent instructions.",
  },
];

const SOURCES = [
  "Face Sheet / Profile",
  "Care Plan / ISP",
  "Contact Notes",
  "Progress Notes",
  "Visit Summary",
  "Monitoring Form",
  "Eligibility Verification",
  "Incident Reports",
  "Case Management Tasks",
  "Service Authorizations",
  "Attendance / Utilization",
];

interface OutputDest {
  module: string;
  writes: string;
  background?: boolean;
}

const OUTPUTS: OutputDest[] = [
  { module: "Contact Notes", writes: "Draft contact note from session" },
  { module: "Case Management", writes: "Tasks created from findings" },
  { module: "Care Plan / ISP", writes: "Draft plan updates" },
  { module: "Monitoring Form", writes: "Pre-filled review questions" },
  { module: "Eligibility Verification", writes: "Status updates" },
  {
    module: "Workflow Manager",
    writes: "Triggered workflows",
    background: true,
  },
  { module: "My Work", writes: "Tasks and alerts" },
  { module: "AI Panel", writes: "Findings and suggestions" },
];

const NewAgentWizard = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState("");
  const [type, setType] = useState<AgentType>("Guidelines Engine Agent");
  const [description, setDescription] = useState(AGENT_TYPES[0].description);
  const [instructions, setInstructions] = useState("");

  // Step 2
  const [engineId, setEngineId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qEngineId = params.get("engineId");
    if (qEngineId) {
      setEngineId(qEngineId);
    }
  }, []);

  // Step 3
  const [pushMode, setPushMode] = useState<PushMode>("Manual");
  const [cmOverride, setCmOverride] = useState(true);
  const [supOverride, setSupOverride] = useState(true);
  const [secondaryApproval, setSecondaryApproval] = useState(false);
  const [requireJustification, setRequireJustification] = useState(true);
  const [autoMonitor, setAutoMonitor] = useState(true);
  const [schedule, setSchedule] = useState("Daily");
  const [notifyCM, setNotifyCM] = useState(true);
  const [notifySupervisor, setNotifySupervisor] = useState(true);
  const [dailyEmail, setDailyEmail] = useState(false);

  // Step 4
  const [sources, setSources] = useState<Set<string>>(new Set(SOURCES));
  const [outputs, setOutputs] = useState<Set<string>>(
    new Set(OUTPUTS.map((o) => o.module)),
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Step 5
  const [scope, setScope] = useState<"all" | "programs" | "cms">("all");
  const [confirmed, setConfirmed] = useState(false);
  const [deployConfirm, setDeployConfirm] = useState(false);
  const [deployed, setDeployed] = useState(false);

  const [publishedEngines, setPublishedEngines] = useState<GuidelinesEngineDoc[]>([]);
  const [draftEngines, setDraftEngines] = useState<GuidelinesEngineDoc[]>([]);
  const [newAgentId, setNewAgentId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const docs = await getGuidelinesEngines();
      // Show all engines — published ones are selectable, draft ones show a "publish first" CTA
      setPublishedEngines(docs);
      setDraftEngines([]); // handled inline now
    })();
  }, []);

  function toServiceAgentType(t: AgentType): any {
    const map: Record<AgentType, string> = {
      "Guidelines Engine Agent": 'pcp_generator',
      "PCP Alignment": 'pcp_alignment',
      "Billing Documentation": 'billing_documentation',
      "Monitoring / Reauthorization": 'monitoring_reauth',
      "ISP Generator": 'isp_generator',
      "Ambient Meeting Copilot": 'compliance_copilot',
      "Custom": 'compliance_copilot',
    };
    return map[t] || 'pcp_generator';
  }

  function toServicePushMode(p: PushMode): any {
    const map: Record<PushMode, string> = {
      "Manual": 'manual',
      "Auto-Pass": 'auto_pass',
      "Auto-Always": 'auto_always',
    };
    return map[p] || 'manual';
  }

  const selectedEngine = publishedEngines.find((e) => e.id === engineId);

  const canStep2 = !!engineId;
  const canDeploy = confirmed && !!engineId && name.trim().length > 0;

  const handleDeployConfirm = async () => {
    if (!engineId || !selectedEngine) return;
    
    const agentId = await createAgent({
      name: name || "Untitled Agent",
      type: toServiceAgentType(type),
      description: description || "No description provided.",
      guidelines_engine_id: engineId,
      guidelines_engine_name: selectedEngine.name,
      guidelines_engine_version: selectedEngine.version,
      master_prompt: instructions || "Apply state guidelines engine.",
      auto_monitor: autoMonitor,
      push_mode: toServicePushMode(pushMode),
      created_by: "Babar Nawaz",
    });
    
    setNewAgentId(agentId);
    setDeployConfirm(false);
    setDeployed(true);
  };

  if (!isAdmin) return <AdminOnly />;

  if (deployed) {
    return (
      <ICMShell title="New Agent" showAIPanel={false}>
        <div className="max-w-[640px] mx-auto mt-12 rounded-xl border border-icm-border bg-icm-panel p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20 mx-auto flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
            <Bot className="w-8 h-8" />
          </div>
          <h2 className="font-manrope font-extrabold text-[22px] text-icm-text mt-4">
            Agent Deployed
          </h2>
          <p className="text-[13px] text-icm-text-dim font-geist mt-1">
            <span className="font-semibold text-icm-text">
              {name || "Untitled agent"}
            </span>{" "}
            is now active.
          </p>
          <p className="text-[12px] text-icm-text-dim font-geist mt-1">
            First compliance run scheduled for{" "}
            <span className="font-mono">
              {schedule === "Manual only"
                ? "manual trigger"
                : "within 1 hour"}
            </span>
            .
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => navigate(`/agents/${newAgentId}`)}
              className="h-10 px-4 rounded-xl bg-icm-text text-icm-panel text-[12.5px] font-geist font-semibold hover:opacity-90"
            >
              View agent →
            </button>
            <button
              onClick={() => navigate("/agents")}
              className="h-10 px-4 rounded-xl border border-icm-border text-[12.5px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong"
            >
              Back to agents dashboard
            </button>
          </div>
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="New Agent" showAIPanel={false}>
      <div className="space-y-5 max-w-[1000px]">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/agents")}
            className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Compliance Agents
          </button>
          <button
            onClick={() => navigate("/agents")}
            className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong"
          >
            Save & exit
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="text-[11.5px] font-geist text-icm-text-dim flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          Platform
          <ChevronRight className="w-3 h-3 text-icm-text-faint" />
          <button
            onClick={() => navigate("/agents")}
            className="hover:text-icm-text"
          >
            Compliance Agents
          </button>
          <ChevronRight className="w-3 h-3 text-icm-text-faint" />
          <span className="text-icm-text">New Agent</span>
        </div>

        <Stepper step={step} />

        {step === 1 && (
          <Step1
            name={name}
            setName={setName}
            type={type}
            setType={(t) => {
              setType(t);
              const match = AGENT_TYPES.find((x) => x.type === t);
              if (match) setDescription(match.description);
            }}
            description={description}
            setDescription={setDescription}
            instructions={instructions}
            setInstructions={setInstructions}
          />
        )}
        {step === 2 && (
          <Step2
            publishedEngines={publishedEngines}
            draftEngines={draftEngines}
            engineId={engineId}
            setEngineId={setEngineId}
            navigate={navigate}
          />
        )}
        {step === 3 && (
          <Step3
            pushMode={pushMode}
            setPushMode={setPushMode}
            cmOverride={cmOverride}
            setCmOverride={setCmOverride}
            supOverride={supOverride}
            setSupOverride={setSupOverride}
            secondaryApproval={secondaryApproval}
            setSecondaryApproval={setSecondaryApproval}
            requireJustification={requireJustification}
            setRequireJustification={setRequireJustification}
            autoMonitor={autoMonitor}
            setAutoMonitor={setAutoMonitor}
            schedule={schedule}
            setSchedule={setSchedule}
            notifyCM={notifyCM}
            setNotifyCM={setNotifyCM}
            notifySupervisor={notifySupervisor}
            setNotifySupervisor={setNotifySupervisor}
            dailyEmail={dailyEmail}
            setDailyEmail={setDailyEmail}
          />
        )}
        {step === 4 && (
          <Step4
            sources={sources}
            setSources={setSources}
            outputs={outputs}
            setOutputs={setOutputs}
            advancedOpen={advancedOpen}
            setAdvancedOpen={setAdvancedOpen}
          />
        )}
        {step === 5 && (
          <Step5
            name={name}
            type={type}
            engine={selectedEngine}
            pushMode={pushMode}
            autoMonitor={autoMonitor}
            schedule={schedule}
            sourcesCount={sources.size}
            outputsCount={outputs.size}
            instructions={instructions}
            scope={scope}
            setScope={setScope}
            confirmed={confirmed}
            setConfirmed={setConfirmed}
            onDeploy={() => setDeployConfirm(true)}
            canDeploy={canDeploy}
          />
        )}

        {/* Footer nav */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="h-10 px-4 rounded-xl border border-icm-border text-[12.5px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back
          </button>
          {step < 5 && (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 1 && name.trim().length === 0) ||
                (step === 2 && !canStep2)
              }
              className="h-10 px-5 rounded-xl bg-icm-text text-icm-panel text-[12.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step === 1 && "Next: Select Guidelines Engine"}
              {step === 2 && "Next: Configure Overrides"}
              {step === 3 && "Next: Data Mapping"}
              {step === 4 && "Next: Review & Deploy"}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Deploy confirm */}
      {deployConfirm && (
        <Modal onClose={() => setDeployConfirm(false)}>
          <h3 className="font-manrope font-bold text-[16px] text-icm-text">
            Deploy {name || "Agent"}?
          </h3>
          <p className="text-[12.5px] text-icm-text-dim font-geist mt-2 leading-relaxed">
            This agent will begin running on{" "}
            <span className="font-semibold text-icm-text">{schedule}</span>. All
            findings will require case manager confirmation before any module is
            updated (Manual push mode).
          </p>
          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              onClick={() => setDeployConfirm(false)}
              className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg"
            >
              Cancel
            </button>
            <button
              onClick={handleDeployConfirm}
              className="h-9 px-4 rounded-lg bg-icm-green text-white text-[12px] font-semibold hover:opacity-90"
            >
              Confirm & Deploy
            </button>
          </div>
        </Modal>
      )}
    </ICMShell>
  );
};

// ---------- Stepper ----------

function Stepper({ step }: { step: number }) {
  const labels = [
    "Define Agent",
    "Select Engine",
    "Configure Overrides",
    "Data Mapping",
    "Review & Deploy",
  ];
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <div className="flex items-center gap-2">
        {labels.map((label, i) => {
          const num = i + 1;
          const isActive = step === num;
          const isDone = step > num;
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                  isActive
                    ? "bg-icm-accent text-white"
                    : isDone
                    ? "bg-icm-green text-white"
                    : "bg-icm-bg border border-icm-border text-icm-text-faint"
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : num}
              </div>
              <span
                className={`text-[11.5px] font-geist truncate ${
                  isActive
                    ? "font-semibold text-icm-text"
                    : isDone
                    ? "text-icm-text-dim"
                    : "text-icm-text-faint"
                }`}
              >
                {label}
              </span>
              {i < labels.length - 1 && (
                <span
                  className={`flex-1 h-px ${
                    isDone ? "bg-icm-green/40" : "bg-icm-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Step 1 ----------

function Step1(p: {
  name: string;
  setName: (v: string) => void;
  type: AgentType;
  setType: (t: AgentType) => void;
  description: string;
  setDescription: (v: string) => void;
  instructions: string;
  setInstructions: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-manrope font-extrabold text-[20px] text-icm-text">
          Step 1 — Define Agent
        </h2>
        <p className="text-[13px] text-icm-text-dim font-geist mt-1">
          Set the agent name, type, and instructions.
        </p>
      </div>

      <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-4">
        <Field label="Agent name" required>
          <input
            value={p.name}
            onChange={(e) => p.setName(e.target.value)}
            placeholder="e.g. State Compliance Copilot"
            className={inputCls}
          />
        </Field>

        <Field label="Agent type" required>
          <select
            value={p.type}
            onChange={(e) => p.setType(e.target.value as AgentType)}
            className={inputCls}
          >
            {AGENT_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.type}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Description">
          <textarea
            value={p.description}
            onChange={(e) => p.setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="What does this agent do?"
            className={`${inputCls} resize-y min-h-[80px]`}
          />
        </Field>

        <Field
          label="Agent instructions"
          hint="Organization-level instructions. These override Compliance Engine state-level logic when conflicts occur."
        >
          <textarea
            value={p.instructions}
            onChange={(e) => p.setInstructions(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Custom instructions for how this agent should behave at the organization level..."
            className={`${inputCls} resize-y min-h-[120px]`}
          />
        </Field>
      </div>

      <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft p-4">
        <p className="text-[10.5px] uppercase tracking-wide font-geist font-semibold text-icm-accent">
          Instruction Precedence
        </p>
        <ol className="mt-2 space-y-1 text-[12px] font-geist text-icm-text">
          <li>
            <span className="font-mono font-semibold">1.</span> Guidelines
            Engine Instructions{" "}
            <span className="text-icm-text-dim">(state-level — lowest priority)</span>
          </li>
          <li>
            <span className="font-mono font-semibold">2.</span> Agent
            Instructions{" "}
            <span className="text-icm-text-dim">(organization-level — you are here)</span>
          </li>
          <li>
            <span className="font-mono font-semibold">3.</span> Runtime
            Overrides{" "}
            <span className="text-icm-text-dim">(case-specific, requires justification)</span>
          </li>
        </ol>
        <p className="text-[10.5px] font-geist text-icm-text-dim mt-2">
          Higher numbers override lower when conflicts occur.
        </p>
      </div>
    </div>
  );
}

// ---------- Step 2 ----------

function Step2({
  publishedEngines,
  draftEngines,
  engineId,
  setEngineId,
  navigate,
}: {
  publishedEngines: GuidelinesEngineDoc[];
  draftEngines: GuidelinesEngineDoc[];
  engineId: string | null;
  setEngineId: (id: string) => void;
  navigate: (p: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-manrope font-extrabold text-[20px] text-icm-text">
          Step 2 — Select Guidelines Engine
        </h2>
        <p className="text-[13px] text-icm-text-dim font-geist mt-1">
          Choose the published engine that powers this agent's compliance rules.
        </p>
      </div>

      {publishedEngines.length === 0 && (
        <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel py-10 text-center">
          <p className="text-[13px] text-icm-text-dim font-geist">
            No guidelines engines yet.{" "}
            <button
              onClick={() => navigate("/agents/guidelines/new")}
              className="text-icm-accent hover:underline font-semibold"
            >
              Create one first →
            </button>
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {publishedEngines.map((e) => {
          const selected = engineId === e.id;
          const hs = e.hard_stop_count || 0;
          const wn = e.warning_count || 0;
          const isDraft = e.status !== "published";
          return (
            <div
              key={e.id}
              className={`w-full text-left rounded-xl border bg-icm-panel p-4 flex items-center gap-3 transition-all ${
                isDraft
                  ? "border-icm-border opacity-70"
                  : selected
                  ? "border-icm-accent ring-1 ring-icm-accent/20 cursor-pointer"
                  : "border-icm-border hover:border-icm-border-strong cursor-pointer"
              }`}
              onClick={() => { if (!isDraft) setEngineId(e.id); }}
            >
              <div className={`w-9 h-9 rounded-lg ring-1 flex items-center justify-center shrink-0 ${isDraft ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20" : "bg-icm-green-soft text-icm-green ring-icm-green/20"}`}>
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-tight font-semibold text-[14px] text-icm-text truncate">
                    {e.name}
                  </h3>
                  {isDraft ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 bg-icm-amber-soft text-icm-amber ring-icm-amber/20">
                      DRAFT
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 bg-icm-green-soft text-icm-green ring-icm-green/20">
                      PUBLISHED
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-icm-bg border border-icm-border text-icm-text-dim">
                    {e.version}
                  </span>
                </div>
                <p className="text-[11.5px] font-geist text-icm-text-dim mt-1 truncate">
                  {e.state} · {e.program} · Effective {e.effective_date}
                </p>
                {isDraft ? (
                  <p className="text-[11px] font-geist text-icm-amber mt-0.5">
                    Finish publishing this engine before linking it to an agent.{" "}
                    <button
                      onClick={(ev) => { ev.stopPropagation(); navigate(`/agents/guidelines/${e.id}`); }}
                      className="underline font-semibold hover:text-icm-amber/80"
                    >
                      Open engine →
                    </button>
                  </p>
                ) : (
                  <p className="text-[11px] font-mono text-icm-text-faint mt-0.5">
                    {e.extracted_rules?.required_sections?.length || 0} services · {hs} hard stops · {wn} warnings
                  </p>
                )}
              </div>
              {selected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-icm-accent text-white text-[11px] font-geist font-semibold shrink-0">
                  <Check className="w-3 h-3" />
                  Selected
                </span>
              ) : (
                <span className="h-8 px-3 rounded-lg border border-icm-border text-[11.5px] font-geist font-medium text-icm-text-dim inline-flex items-center shrink-0">
                  Select
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Step 3 ----------

function Step3(p: {
  pushMode: PushMode;
  setPushMode: (m: PushMode) => void;
  cmOverride: boolean;
  setCmOverride: (v: boolean) => void;
  supOverride: boolean;
  setSupOverride: (v: boolean) => void;
  secondaryApproval: boolean;
  setSecondaryApproval: (v: boolean) => void;
  requireJustification: boolean;
  setRequireJustification: (v: boolean) => void;
  autoMonitor: boolean;
  setAutoMonitor: (v: boolean) => void;
  schedule: string;
  setSchedule: (s: string) => void;
  notifyCM: boolean;
  setNotifyCM: (v: boolean) => void;
  notifySupervisor: boolean;
  setNotifySupervisor: (v: boolean) => void;
  dailyEmail: boolean;
  setDailyEmail: (v: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-manrope font-extrabold text-[20px] text-icm-text">
          Step 3 — Configure Overrides
        </h2>
        <p className="text-[13px] text-icm-text-dim font-geist mt-1">
          Set how this agent pushes outputs and handles override permissions.
        </p>
      </div>

      {/* Push mode */}
      <Section title="Push Mode" subtitle="How should this agent write to modules?">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PushOption
            icon={Hand}
            label="MANUAL"
            sub="User must confirm every write"
            description="Agent surfaces findings and drafts. Nothing writes to any module until the case manager reviews and explicitly confirms."
            badge={{ text: "Recommended", tone: "green" }}
            selected={p.pushMode === "Manual"}
            onSelect={() => p.setPushMode("Manual")}
          />
          <PushOption
            icon={CheckCircle2}
            label="AUTO-PASS"
            sub="Auto-push only when all checks pass"
            description="Agent automatically writes to modules when the compliance run is fully clean with no warnings or hard stops. Case manager is notified but does not need to act."
            note="Requires supervisor approval setting enabled."
            selected={p.pushMode === "Auto-Pass"}
            onSelect={() => p.setPushMode("Auto-Pass")}
          />
          <PushOption
            icon={Zap}
            label="AUTO-ALWAYS"
            sub="Auto-push always"
            description="Agent automatically writes all outputs regardless of compliance status."
            badge={{ text: "Use with caution", tone: "red" }}
            note="Requires admin approval and is logged for every automated action."
            selected={p.pushMode === "Auto-Always"}
            onSelect={() => p.setPushMode("Auto-Always")}
          />
        </div>
      </Section>

      {/* Override permissions */}
      <Section
        title="Override Permissions"
        subtitle="Who can override this agent's findings?"
      >
        <div className="space-y-2">
          <Checkbox
            checked={p.cmOverride}
            onChange={p.setCmOverride}
            label="Case Managers can override with justification"
          />
          <Checkbox
            checked={p.supOverride}
            onChange={p.setSupOverride}
            label="Supervisors can override without justification"
          />
          <Checkbox
            checked={p.secondaryApproval}
            onChange={p.setSecondaryApproval}
            label="Overrides require secondary approval"
          />
        </div>
        <div className="mt-3 pt-3 border-t border-icm-border flex items-center justify-between">
          <span className="text-[12px] font-geist text-icm-text">
            Require written justification for all overrides
          </span>
          <Toggle
            on={p.requireJustification}
            onChange={p.setRequireJustification}
          />
        </div>
      </Section>

      {/* Auto-monitor */}
      <Section
        title="Auto-Monitor"
        subtitle="When enabled, this agent runs automatically on a schedule and surfaces findings without manual triggering."
      >
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-geist text-icm-text">
            Enable auto-monitor
          </span>
          <Toggle on={p.autoMonitor} onChange={p.setAutoMonitor} />
        </div>
        {p.autoMonitor && (
          <Field label="Schedule">
            <select
              value={p.schedule}
              onChange={(e) => p.setSchedule(e.target.value)}
              className={inputCls}
            >
              {[
                "Every hour",
                "Every 6 hours",
                "Daily",
                "Weekly",
                "Manual only",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        )}
        <div className="mt-3 pt-3 border-t border-icm-border space-y-2">
          <p className="text-[10.5px] uppercase tracking-wide font-geist font-semibold text-icm-text-faint">
            Notification preferences
          </p>
          <Checkbox
            checked={p.notifyCM}
            onChange={p.setNotifyCM}
            label="Notify case manager when new findings surface"
          />
          <Checkbox
            checked={p.notifySupervisor}
            onChange={p.setNotifySupervisor}
            label="Notify supervisor when hard stops are detected"
          />
          <Checkbox
            checked={p.dailyEmail}
            onChange={p.setDailyEmail}
            label="Send daily compliance summary email"
          />
        </div>
      </Section>
    </div>
  );
}

// ---------- Step 4 ----------

function Step4(p: {
  sources: Set<string>;
  setSources: React.Dispatch<React.SetStateAction<Set<string>>>;
  outputs: Set<string>;
  setOutputs: React.Dispatch<React.SetStateAction<Set<string>>>;
  advancedOpen: boolean;
  setAdvancedOpen: (v: boolean) => void;
}) {
  const toggleSource = (s: string) => {
    p.setSources((set) => {
      const next = new Set(set);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };
  const toggleOutput = (o: string) => {
    p.setOutputs((set) => {
      const next = new Set(set);
      if (next.has(o)) next.delete(o);
      else next.add(o);
      return next;
    });
  };
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-manrope font-extrabold text-[20px] text-icm-text">
          Step 4 — Data Mapping
        </h2>
        <p className="text-[13px] text-icm-text-dim font-geist mt-1">
          Configure which modules this agent reads from and writes to.
        </p>
      </div>

      <Section
        title="Data Sources (Read)"
        subtitle="This agent will read from these modules:"
      >
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((s) => {
            const active = p.sources.has(s);
            return (
              <button
                key={s}
                onClick={() => toggleSource(s)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-geist transition-all ${
                  active
                    ? "bg-icm-accent text-white"
                    : "bg-icm-panel border border-icm-border text-icm-text-dim hover:border-icm-border-strong"
                }`}
              >
                <Database className="w-3 h-3" />
                {s}
              </button>
            );
          })}
        </div>
        {p.sources.size < SOURCES.length && (
          <div className="mt-3 rounded-lg border border-icm-amber/20 bg-icm-amber-soft p-3 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-icm-amber shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-icm-text font-geist">
              Disabling sources will reduce compliance check accuracy for the
              corresponding check types.
            </p>
          </div>
        )}
      </Section>

      <Section
        title="Outputs (Write)"
        subtitle="This agent will write to these modules (based on push mode configured in Step 3):"
      >
        <ul className="divide-y divide-icm-border -mx-1">
          {OUTPUTS.map((o) => {
            const active = p.outputs.has(o.module);
            return (
              <li
                key={o.module}
                className="flex items-center gap-3 py-2.5 px-1"
              >
                <ArrowRight className="w-3.5 h-3.5 text-icm-text-faint shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-geist font-semibold text-icm-text">
                    {o.module}
                  </p>
                  <p className="text-[11px] font-geist text-icm-text-dim">
                    {o.writes}
                    {o.background && (
                      <span className="ml-1 italic">
                        — Runs silently in background, surfaces in My Work and
                        AI panel
                      </span>
                    )}
                  </p>
                </div>
                <Toggle on={active} onChange={() => toggleOutput(o.module)} />
              </li>
            );
          })}
        </ul>
      </Section>

      <div className="rounded-xl border border-icm-border bg-icm-panel">
        <button
          onClick={() => p.setAdvancedOpen(!p.advancedOpen)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-icm-bg/50"
        >
          <span className="text-[13px] font-geist font-semibold text-icm-text">
            Module Output Overrides
          </span>
          <ChevronRight
            className={`w-3.5 h-3.5 text-icm-text-dim transition-transform ${
              p.advancedOpen ? "rotate-90" : ""
            }`}
          />
        </button>
        {p.advancedOpen && (
          <div className="border-t border-icm-border p-4">
            <p className="text-[12px] text-icm-text-dim font-geist">
              Override default field mappings for specific modules. Leave
              defaults for standard behavior — most organizations never need to
              edit this section.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Step 5 ----------

function Step5(p: {
  name: string;
  type: AgentType;
  engine?: GuidelinesEngineDoc;
  pushMode: PushMode;
  autoMonitor: boolean;
  schedule: string;
  sourcesCount: number;
  outputsCount: number;
  instructions: string;
  scope: "all" | "programs" | "cms";
  setScope: (s: "all" | "programs" | "cms") => void;
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
  onDeploy: () => void;
  canDeploy: boolean;
}) {
  const [showInstructions, setShowInstructions] = useState(false);
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-manrope font-extrabold text-[20px] text-icm-text">
          Step 5 — Review & Deploy
        </h2>
        <p className="text-[13px] text-icm-text-dim font-geist mt-1">
          Confirm agent configuration and deploy.
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
        <h3 className="font-manrope font-extrabold text-[18px] text-icm-text">
          {p.name || "Untitled agent"}
        </h3>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge tone="accent">{p.type}</Badge>
          <Badge tone="green">
            {p.engine
              ? `${p.engine.name} ${p.engine.version}`
              : "No engine"}
          </Badge>
          <Badge tone="amber">Push: {p.pushMode}</Badge>
          <Badge tone={p.autoMonitor ? "green" : "muted"}>
            {p.autoMonitor ? `Auto-monitor · ${p.schedule}` : "Manual only"}
          </Badge>
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-2">
        <ChecklistRow done={!!p.name} label="Agent name and type defined" />
        <ChecklistRow
          done={!!p.engine}
          label={
            p.engine
              ? `Guidelines Engine selected: ${p.engine.name} ${p.engine.version}`
              : "Guidelines Engine not selected"
          }
        />
        <ChecklistRow done label={`Push mode: ${p.pushMode} (recommended)`} />
        <ChecklistRow
          done
          label={`Auto-monitor: ${
            p.autoMonitor ? `Enabled · ${p.schedule}` : "Disabled"
          }`}
        />
        <ChecklistRow done label={`Data sources: ${p.sourcesCount} modules`} />
        <ChecklistRow
          done
          label={`Output destinations: ${p.outputsCount} modules`}
        />
      </div>

      {/* Instruction preview */}
      {p.instructions && (
        <div className="rounded-xl border border-icm-border bg-icm-panel">
          <button
            onClick={() => setShowInstructions((s) => !s)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-icm-bg/50"
          >
            <span className="text-[13px] font-geist font-semibold text-icm-text">
              Instruction preview
            </span>
            <ChevronRight
              className={`w-3.5 h-3.5 text-icm-text-dim transition-transform ${
                showInstructions ? "rotate-90" : ""
              }`}
            />
          </button>
          {showInstructions && (
            <div className="border-t border-icm-border p-4">
              <p className="text-[12px] text-icm-text font-geist whitespace-pre-wrap leading-relaxed">
                {p.instructions}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Important notice */}
      <div className="rounded-xl border border-icm-amber/20 bg-icm-amber-soft p-4 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-icm-amber shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-icm-text font-geist leading-relaxed">
          Once deployed, this agent will begin monitoring your caseload
          according to its schedule. First run will begin within{" "}
          <span className="font-semibold">{p.schedule.toLowerCase()}</span> of
          deployment. Findings will appear in the AI panel and My Work for all
          case managers assigned to individuals this agent covers.
        </p>
      </div>

      {/* Scope */}
      <Section
        title="Deployment Scope"
        subtitle="Which individuals will this agent cover?"
      >
        <div className="space-y-2">
          {(
            [
              ["all", "All individuals in my organization (default)"],
              ["programs", "Specific programs only"],
              ["cms", "Specific case managers only"],
            ] as Array<["all" | "programs" | "cms", string]>
          ).map(([k, label]) => (
            <label
              key={k}
              className="flex items-center gap-2 cursor-pointer text-[12.5px] font-geist text-icm-text"
            >
              <input
                type="radio"
                name="scope"
                checked={p.scope === k}
                onChange={() => p.setScope(k)}
                className="accent-[hsl(var(--icm-accent))]"
              />
              {label}
            </label>
          ))}
        </div>
      </Section>

      {/* Confirm + deploy */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
        <Checkbox
          checked={p.confirmed}
          onChange={p.setConfirmed}
          label="I confirm this agent is configured correctly and ready for deployment."
        />
        <button
          onClick={p.onDeploy}
          disabled={!p.canDeploy}
          className="mt-4 w-full h-11 rounded-xl bg-icm-text text-icm-panel text-[13px] font-geist font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          <Bot className="w-4 h-4" />
          Deploy Agent
        </button>
      </div>
    </div>
  );
}

// ---------- Helpers ----------

function PushOption({
  icon: Icon,
  label,
  sub,
  description,
  badge,
  note,
  selected,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  description: string;
  badge?: { text: string; tone: "green" | "red" };
  note?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left rounded-xl border bg-icm-panel p-4 transition-all ${
        selected
          ? "border-icm-accent ring-1 ring-icm-accent/20"
          : "border-icm-border hover:border-icm-border-strong"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg bg-icm-bg border border-icm-border flex items-center justify-center text-icm-text-dim">
          <Icon className="w-4 h-4" />
        </div>
        {badge && (
          <span
            className={`px-2 py-0.5 rounded-full text-[9.5px] font-geist font-semibold ring-1 ${
              badge.tone === "green"
                ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
                : "bg-icm-red-soft text-icm-red ring-icm-red/20"
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>
      <p className="font-manrope font-bold text-[13px] text-icm-text mt-2">
        {label}
      </p>
      <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
        {sub}
      </p>
      <p className="text-[11.5px] font-geist text-icm-text-dim mt-2 leading-relaxed">
        {description}
      </p>
      {note && (
        <p className="text-[10.5px] font-geist text-icm-text-faint mt-2 italic">
          {note}
        </p>
      )}
    </button>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-3">
      <div>
        <h3 className="text-[13px] font-geist font-semibold text-icm-text">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] uppercase tracking-wide font-geist font-semibold text-icm-text-faint flex items-center gap-1">
        {label}
        {required && <span className="text-icm-red">*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-[10.5px] font-geist text-icm-text-faint">{hint}</p>
      )}
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-[hsl(var(--icm-accent))]"
      />
      <span className="text-[12px] text-icm-text font-geist">{label}</span>
    </label>
  );
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 rounded-full transition-colors ${
        on ? "bg-icm-accent" : "bg-icm-border"
      }`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          on ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
          done
            ? "bg-icm-green text-white"
            : "bg-icm-bg border border-icm-border text-icm-text-faint"
        }`}
      >
        {done && <Check className="w-2.5 h-2.5" />}
      </span>
      <span className="text-[12.5px] font-geist text-icm-text">{label}</span>
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "accent" | "green" | "amber" | "muted";
  children: React.ReactNode;
}) {
  const cls =
    tone === "accent"
      ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20"
      : tone === "green"
      ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
      : tone === "amber"
      ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
      : "bg-icm-bg text-icm-text-dim ring-icm-border";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-geist font-semibold ring-1 ${cls}`}
    >
      {children}
    </span>
  );
}

function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-icm-panel rounded-2xl border border-icm-border shadow-elevated max-w-[480px] w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-lg hover:bg-icm-bg flex items-center justify-center text-icm-text-dim"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "w-full h-9 px-3 rounded-xl bg-icm-panel border border-icm-border text-[12.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40 transition-colors";

export default NewAgentWizard;
