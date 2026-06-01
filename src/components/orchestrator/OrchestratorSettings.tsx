import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Save, Loader2, RotateCcw } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DEFAULT_PROMPTS, AGENT_CONFIG, type AgentKey, type PromptMeta } from "./PromptStudio";

// Canonical agent order (matches AGENT_CONFIG / DEFAULT_PROMPTS — all 7 agents).
const AGENT_KEYS = Object.keys(AGENT_CONFIG) as AgentKey[];

interface OrchestratorConfig {
  scheduled_run_time: string;
  escalation_thresholds: {
    supervisor_alert_days: number;
    supervisor_task_days: number;
    director_alert_days: number;
    critical_alert_days: number;
  };
  agents_enabled: Record<AgentKey, boolean>;
  log_retention_days: number;
}

const DEFAULT_AGENTS_ENABLED = AGENT_KEYS.reduce(
  (acc, k) => ({ ...acc, [k]: true }),
  {} as Record<AgentKey, boolean>,
);

const DEFAULT_CONFIG: OrchestratorConfig = {
  scheduled_run_time: "02:00",
  escalation_thresholds: {
    supervisor_alert_days: 7,
    supervisor_task_days: 14,
    director_alert_days: 21,
    critical_alert_days: 30,
  },
  agents_enabled: { ...DEFAULT_AGENTS_ENABLED },
  log_retention_days: 365,
};

export function OrchestratorSettings() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState<OrchestratorConfig>(DEFAULT_CONFIG);
  const [prompts, setPrompts] = useState<typeof DEFAULT_PROMPTS>({ ...DEFAULT_PROMPTS });
  const [metas, setMetas] = useState<Record<AgentKey, PromptMeta>>(
    () => AGENT_KEYS.reduce((a, k) => ({ ...a, [k]: {} }), {} as Record<AgentKey, PromptMeta>),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId || !expanded) return;
    setLoading(true);
    Promise.all([
      getDoc(doc(db, "organizations", orgId, "settings", "orchestrator")),
      getDoc(doc(db, "organizations", orgId, "settings", "orchestrator_prompts")),
    ])
      .then(([cfgSnap, promptSnap]) => {
        if (cfgSnap.exists()) {
          const data = cfgSnap.data() as Partial<OrchestratorConfig>;
          setConfig({
            ...DEFAULT_CONFIG,
            ...data,
            // Merge agent toggles so newly-added agents (authorization, assessment)
            // default to enabled even on configs saved before they existed.
            agents_enabled: { ...DEFAULT_AGENTS_ENABLED, ...(data.agents_enabled || {}) },
          });
        }
        if (promptSnap.exists()) {
          const data = promptSnap.data();
          const nextPrompts = { ...DEFAULT_PROMPTS };
          const nextMetas = AGENT_KEYS.reduce((a, k) => ({ ...a, [k]: {} }), {} as Record<AgentKey, PromptMeta>);
          for (const key of AGENT_KEYS) {
            if (data[key]) nextPrompts[key] = data[key];
            if (data[`${key}_updated_at`]) {
              nextMetas[key] = {
                updated_at: new Date(data[`${key}_updated_at`].toDate()).toLocaleDateString(),
                updated_by: data[`${key}_updated_by`],
              };
            }
          }
          setPrompts(nextPrompts);
          setMetas(nextMetas);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orgId, expanded]);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "organizations", orgId, "settings", "orchestrator"), config);
      toast.success("Orchestrator settings saved");
    } catch {
      toast.error("Failed to save orchestrator settings");
    } finally {
      setSaving(false);
    }
  };

  const savePrompt = async (key: AgentKey, value: string) => {
    if (!orgId) return;
    const now = new Date();
    const by = userProfile?.displayName || userProfile?.email || "Admin";
    try {
      await setDoc(
        doc(db, "organizations", orgId, "settings", "orchestrator_prompts"),
        { [key]: value, [`${key}_updated_at`]: now, [`${key}_updated_by`]: by, updated_at: now },
        { merge: true },
      );
      setPrompts((p) => ({ ...p, [key]: value }));
      setMetas((m) => ({ ...m, [key]: { updated_at: now.toLocaleDateString(), updated_by: by } }));
      toast.success(`${AGENT_CONFIG[key].label} prompt saved`);
    } catch {
      toast.error("Failed to save prompt");
    }
  };

  const setThreshold = (key: keyof OrchestratorConfig["escalation_thresholds"], value: number) => {
    setConfig((c) => ({ ...c, escalation_thresholds: { ...c.escalation_thresholds, [key]: value } }));
  };

  const toggleAgent = (key: AgentKey) => {
    setConfig((c) => ({ ...c, agents_enabled: { ...c.agents_enabled, [key]: !c.agents_enabled[key] } }));
  };

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
      {/* Collapsible header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-icm-bg transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div>
          <p className="font-manrope font-bold text-[14px] text-icm-text">AI Orchestrator</p>
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
            Enable agents and set their prompts, escalation thresholds, and schedule — all in one place.
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-icm-text-faint shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-icm-text-faint shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-icm-border p-4 space-y-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 rounded-xl bg-icm-bg animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Scheduled run time */}
              <div className="rounded-xl border border-icm-border bg-icm-bg p-3">
                <p className="text-[11px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">
                  Scheduled Run Time
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={config.scheduled_run_time}
                    onChange={(e) => setConfig((c) => ({ ...c, scheduled_run_time: e.target.value }))}
                    className="h-8 px-2 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
                  />
                  <p className="text-[11.5px] font-geist text-icm-text-dim">
                    Daily scheduled run (ET). Takes effect on next deployment.
                  </p>
                </div>
              </div>

              {/* Escalation thresholds */}
              <div className="rounded-xl border border-icm-border bg-icm-bg p-3">
                <p className="text-[11px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-3">
                  Escalation Thresholds (days overdue)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <ThresholdInput label="Supervisor alert" value={config.escalation_thresholds.supervisor_alert_days} onChange={(v) => setThreshold("supervisor_alert_days", v)} />
                  <ThresholdInput label="Supervisor task required" value={config.escalation_thresholds.supervisor_task_days} onChange={(v) => setThreshold("supervisor_task_days", v)} />
                  <ThresholdInput label="Director alert" value={config.escalation_thresholds.director_alert_days} onChange={(v) => setThreshold("director_alert_days", v)} />
                  <ThresholdInput label="Critical alert (all supervisors)" value={config.escalation_thresholds.critical_alert_days} onChange={(v) => setThreshold("critical_alert_days", v)} />
                </div>
              </div>

              {/* Agents — toggle + prompt, together */}
              <div className="rounded-xl border border-icm-border bg-icm-bg p-3">
                <p className="text-[11px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-1">
                  Agents
                </p>
                <p className="text-[11px] font-geist text-icm-text-dim mb-3 leading-snug">
                  Turn each agent on or off, and edit the prompt that controls how it thinks and writes. Toggle
                  changes save with “Save orchestrator settings”; prompt edits save per agent. Prompt changes take
                  effect on the next run — no deployment needed.
                </p>
                <div className="space-y-2">
                  {AGENT_KEYS.map((key) => (
                    <AgentCard
                      key={key}
                      agentKey={key}
                      enabled={config.agents_enabled[key]}
                      onToggle={() => toggleAgent(key)}
                      prompt={prompts[key]}
                      meta={metas[key]}
                      onSavePrompt={savePrompt}
                    />
                  ))}
                </div>
              </div>

              {/* Log retention */}
              <div className="rounded-xl border border-icm-border bg-icm-bg p-3">
                <p className="text-[11px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">
                  Log Retention
                </p>
                <div className="flex items-center gap-3">
                  <select
                    value={config.log_retention_days}
                    onChange={(e) => setConfig((c) => ({ ...c, log_retention_days: parseInt(e.target.value) }))}
                    className="h-8 px-2 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
                  >
                    <option value={90}>90 days</option>
                    <option value={180}>180 days</option>
                    <option value={365}>1 year (default)</option>
                    <option value={730}>2 years</option>
                  </select>
                  <p className="text-[11.5px] font-geist text-icm-text-dim">
                    How long to keep orchestrator logs in Firestore.
                  </p>
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-8 px-3 rounded-xl bg-icm-accent text-white text-[12px] font-geist font-semibold hover:bg-icm-accent/90 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save orchestrator settings
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Unified agent card: enable toggle + prompt editor ────────────────────────

function AgentCard({
  agentKey,
  enabled,
  onToggle,
  prompt,
  meta,
  onSavePrompt,
}: {
  agentKey: AgentKey;
  enabled: boolean;
  onToggle: () => void;
  prompt: string;
  meta: PromptMeta;
  onSavePrompt: (key: AgentKey, value: string) => Promise<void>;
}) {
  const cfg = AGENT_CONFIG[agentKey];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(prompt);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const isDirty = draft !== prompt;
  const isDefault = draft === DEFAULT_PROMPTS[agentKey];

  useEffect(() => { setDraft(prompt); }, [prompt]);

  async function handleSavePrompt() {
    setSavingPrompt(true);
    await onSavePrompt(agentKey, draft);
    setSavingPrompt(false);
  }

  return (
    <div className={cn("rounded-xl border border-icm-border border-l-[3px] bg-icm-panel overflow-hidden", cfg.border)}>
      {/* Header row: icon · name · toggle · expand */}
      <div className="flex items-center gap-3 px-3 py-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
          <cfg.icon className={cn("w-4 h-4", cfg.color)} />
        </div>
        <button className="flex-1 min-w-0 text-left" onClick={() => setOpen((v) => !v)}>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-manrope font-bold text-[13px] text-icm-text">{cfg.label}</p>
            {isDirty && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-geist font-bold bg-icm-amber-soft text-icm-amber">UNSAVED</span>
            )}
            {!enabled && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-geist font-bold bg-icm-border text-icm-text-faint">OFF</span>
            )}
          </div>
          <p className="text-[11px] font-geist text-icm-text-dim mt-0.5 leading-snug line-clamp-1">{cfg.description}</p>
        </button>

        {/* Enable toggle */}
        <button
          onClick={onToggle}
          aria-label={`${enabled ? "Disable" : "Enable"} ${cfg.label}`}
          className={cn("relative w-9 h-5 rounded-full transition-colors shrink-0", enabled ? "bg-icm-accent" : "bg-icm-border")}
        >
          <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform", enabled && "translate-x-4")} />
        </button>

        <button onClick={() => setOpen((v) => !v)} className="shrink-0 text-icm-text-faint" aria-label={open ? "Collapse prompt" : "Edit prompt"}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded prompt editor */}
      {open && (
        <div className="border-t border-icm-border p-3.5 space-y-3 bg-icm-bg">
          <p className="text-[11.5px] font-geist text-icm-text-dim leading-relaxed">
            {cfg.description} Edit this prompt to change how the AI reasons, what it prioritizes, and how it writes.
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            className="w-full p-3 rounded-xl bg-icm-panel border border-icm-border text-[12.5px] font-geist text-icm-text leading-relaxed focus:outline-none focus:border-icm-accent/40 resize-y"
            placeholder="Enter instructions for this agent..."
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              {!isDefault && (
                <button onClick={() => setDraft(DEFAULT_PROMPTS[agentKey])} className="inline-flex items-center gap-1.5 text-[11px] font-geist text-icm-text-dim hover:text-icm-text">
                  <RotateCcw className="w-3 h-3" />
                  Restore default
                </button>
              )}
              {meta.updated_at && (
                <span className="text-[10.5px] font-geist text-icm-text-faint">
                  Saved {meta.updated_at}{meta.updated_by ? ` by ${meta.updated_by}` : ""}
                </span>
              )}
            </div>
            <button
              onClick={handleSavePrompt}
              disabled={savingPrompt || !isDirty}
              className={cn(
                "h-8 px-3 rounded-xl text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 transition-colors",
                isDirty ? "bg-icm-accent text-white hover:bg-icm-accent/90" : "bg-icm-bg border border-icm-border text-icm-text-faint cursor-not-allowed",
              )}
            >
              {savingPrompt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {savingPrompt ? "Saving…" : "Save prompt"}
            </button>
          </div>
          <p className="text-[10px] font-geist text-icm-text-faint">
            {draft.length} characters · Changes take effect on the next orchestrator run
          </p>
        </div>
      )}
    </div>
  );
}

function ThresholdInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void; }) {
  return (
    <div>
      <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={90}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 1)}
          className="w-16 h-7 px-2 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text text-center"
        />
        <span className="text-[11px] font-geist text-icm-text-dim">days</span>
      </div>
    </div>
  );
}
