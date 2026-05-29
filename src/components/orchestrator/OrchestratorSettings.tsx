import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Save, Loader2 } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OrchestratorConfig {
  scheduled_run_time: string;
  escalation_thresholds: {
    supervisor_alert_days: number;
    supervisor_task_days: number;
    director_alert_days: number;
    critical_alert_days: number;
  };
  agents_enabled: {
    compliance: boolean;
    documentation: boolean;
    billing: boolean;
    escalation: boolean;
    renewal: boolean;
  };
  log_retention_days: number;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  scheduled_run_time: "02:00",
  escalation_thresholds: {
    supervisor_alert_days: 7,
    supervisor_task_days: 14,
    director_alert_days: 21,
    critical_alert_days: 30,
  },
  agents_enabled: {
    compliance: true,
    documentation: true,
    billing: true,
    escalation: true,
    renewal: true,
  },
  log_retention_days: 365,
};

const AGENT_LABELS: Record<keyof OrchestratorConfig["agents_enabled"], { name: string; desc: string }> = {
  compliance: {
    name: "Compliance Agent",
    desc: "Checks visit, monitoring form, PCP, and MA compliance for each individual.",
  },
  documentation: {
    name: "Documentation Agent",
    desc: "Pre-fills forms and generates AI drafts for overdue documentation.",
  },
  billing: {
    name: "Billing Agent",
    desc: "Finds unsigned billable notes and expiring service authorizations.",
  },
  escalation: {
    name: "Escalation Agent",
    desc: "Escalates overdue items to supervisors based on configured thresholds.",
  },
  renewal: {
    name: "Renewal Agent",
    desc: "Tracks all renewal cycles and generates AI renewal packets at 60 days.",
  },
};

export function OrchestratorSettings() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState<OrchestratorConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId || !expanded) return;
    setLoading(true);
    getDoc(doc(db, "organizations", orgId, "settings", "orchestrator"))
      .then((snap) => {
        if (snap.exists()) {
          setConfig({ ...DEFAULT_CONFIG, ...snap.data() } as OrchestratorConfig);
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

  const setThreshold = (key: keyof OrchestratorConfig["escalation_thresholds"], value: number) => {
    setConfig((c) => ({
      ...c,
      escalation_thresholds: { ...c.escalation_thresholds, [key]: value },
    }));
  };

  const toggleAgent = (key: keyof OrchestratorConfig["agents_enabled"]) => {
    setConfig((c) => ({
      ...c,
      agents_enabled: { ...c.agents_enabled, [key]: !c.agents_enabled[key] },
    }));
  };

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
      {/* Collapsible header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-icm-bg transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div>
          <p className="font-manrope font-bold text-[14px] text-icm-text">Brain Orchestrator</p>
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
            Configure the autonomous AI orchestrator — agent toggles, escalation thresholds, and schedule.
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
                  <ThresholdInput
                    label="Supervisor alert"
                    value={config.escalation_thresholds.supervisor_alert_days}
                    onChange={(v) => setThreshold("supervisor_alert_days", v)}
                  />
                  <ThresholdInput
                    label="Supervisor task required"
                    value={config.escalation_thresholds.supervisor_task_days}
                    onChange={(v) => setThreshold("supervisor_task_days", v)}
                  />
                  <ThresholdInput
                    label="Director alert"
                    value={config.escalation_thresholds.director_alert_days}
                    onChange={(v) => setThreshold("director_alert_days", v)}
                  />
                  <ThresholdInput
                    label="Critical alert (all supervisors)"
                    value={config.escalation_thresholds.critical_alert_days}
                    onChange={(v) => setThreshold("critical_alert_days", v)}
                  />
                </div>
              </div>

              {/* Agent toggles */}
              <div className="rounded-xl border border-icm-border bg-icm-bg p-3">
                <p className="text-[11px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-3">
                  Agent Enable/Disable
                </p>
                <div className="space-y-2">
                  {(Object.keys(AGENT_LABELS) as (keyof OrchestratorConfig["agents_enabled"])[]).map(
                    (key) => (
                      <div
                        key={key}
                        className="flex items-start gap-3 rounded-xl border border-icm-border bg-icm-panel p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-geist font-semibold text-icm-text">
                            {AGENT_LABELS[key].name}
                          </p>
                          <p className="text-[11px] font-geist text-icm-text-dim mt-0.5 leading-snug">
                            {AGENT_LABELS[key].desc}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleAgent(key)}
                          className={cn(
                            "relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5",
                            config.agents_enabled[key] ? "bg-icm-accent" : "bg-icm-border"
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                              config.agents_enabled[key] && "translate-x-4"
                            )}
                          />
                        </button>
                      </div>
                    )
                  )}
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
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, log_retention_days: parseInt(e.target.value) }))
                    }
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

function ThresholdInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim block mb-1">
        {label}
      </label>
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
