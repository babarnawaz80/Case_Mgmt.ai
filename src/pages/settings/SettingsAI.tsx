import React, { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { OrchestratorSettings } from "@/components/orchestrator/OrchestratorSettings";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { aiFeatures as DEFAULT_FEATURES, type AIFeatureDef } from "@/data/settings";
import { Loader2, Save, Cpu, BrainCircuit, Zap, Clock, BarChart2, BookOpen, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface AISettings {
  features: Record<string, boolean>;
  model: string;
  contextWindow: number;
  responseStyle: string;
  sessionTranscriptRetentionDays: number;
  auditAllSessions: boolean;
  autoSuggestPrompts: boolean;
  usageStats: {
    aiSessionsThisMonth: number;
    avgSessionDurationMin: number;
    topFeature: string;
    patientsProcessed: number;
  };
}

const MODELS = [
  "Gemini 2.0 Flash (default)",
  "Gemini 2.0 Flash Thinking",
  "Gemini 2.5 Pro",
];

const RESPONSE_STYLES = [
  { value: "concise", label: "Concise — short, direct answers" },
  { value: "detailed", label: "Detailed — thorough explanations" },
  { value: "clinical", label: "Clinical — formal, structured output" },
];

const CONTEXT_OPTIONS = [
  { value: 8, label: "8K tokens (faster)" },
  { value: 16, label: "16K tokens" },
  { value: 32, label: "32K tokens (default)" },
  { value: 128, label: "128K tokens (slower, more context)" },
];

const RETENTION_OPTIONS = [
  { value: 0, label: "Session only (do not store)" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
];

const DEFAULT_SETTINGS: AISettings = {
  features: Object.fromEntries(DEFAULT_FEATURES.map((f) => [f.key, f.enabled])),
  model: "Gemini 2.0 Flash (default)",
  contextWindow: 32,
  responseStyle: "concise",
  sessionTranscriptRetentionDays: 365,
  auditAllSessions: true,
  autoSuggestPrompts: true,
  usageStats: {
    aiSessionsThisMonth: 0,
    avgSessionDurationMin: 0,
    topFeature: "—",
    patientsProcessed: 0,
  },
};

const FEATURE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  chat: Zap,
  ambient: BrainCircuit,
  doc: BookOpen,
  prefill: Cpu,
  auto_monitor: Clock,
  dash: BarChart2,
  report: BarChart2,
  careplan: BookOpen,
};

const SettingsAI = () => {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    getDoc(doc(db, "organizations", orgId))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const ai = d.aiSettings ?? {};
          setSettings({
            features: ai.features ?? DEFAULT_SETTINGS.features,
            model: ai.model ?? DEFAULT_SETTINGS.model,
            contextWindow: ai.contextWindow ?? DEFAULT_SETTINGS.contextWindow,
            responseStyle: ai.responseStyle ?? DEFAULT_SETTINGS.responseStyle,
            sessionTranscriptRetentionDays:
              ai.sessionTranscriptRetentionDays ?? DEFAULT_SETTINGS.sessionTranscriptRetentionDays,
            auditAllSessions: ai.auditAllSessions ?? DEFAULT_SETTINGS.auditAllSessions,
            autoSuggestPrompts: ai.autoSuggestPrompts ?? DEFAULT_SETTINGS.autoSuggestPrompts,
            usageStats: ai.usageStats ?? DEFAULT_SETTINGS.usageStats,
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load AI settings:", err);
        toast.error("Failed to load AI settings");
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  const toggleFeature = (key: string) =>
    setSettings((s) => ({
      ...s,
      features: { ...s.features, [key]: !s.features[key] },
    }));

  const set = <K extends keyof Omit<AISettings, "features" | "usageStats">>(
    key: K,
    value: AISettings[K]
  ) => setSettings((s) => ({ ...s, [key]: value }));

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const { usageStats, ...rest } = settings;
      await updateDoc(doc(db, "organizations", orgId), {
        aiSettings: rest,
        updatedAt: new Date(),
      });
      toast.success("AI settings saved", {
        description: "Changes will apply to all users in your organization.",
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save AI settings");
    } finally {
      setSaving(false);
    }
  };

  const featureCount = Object.values(settings.features).filter(Boolean).length;
  const totalCount = DEFAULT_FEATURES.length;

  return (
    <SettingsLayout
      title="AI Configuration"
      subtitle="Manage AI features, model selection, and compliance settings for your organization."
      actions={
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="h-9 px-3 rounded-xl bg-teal-600 text-white text-[12px] font-geist font-semibold hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save AI settings
        </button>
      }
    >
      {loading ? (
        <AISkeleton />
      ) : (
        <div className="space-y-3">
          {/* Usage stats summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="AI sessions this month"
              value={String(settings.usageStats.aiSessionsThisMonth || "—")}
            />
            <StatCard
              label="Avg session duration"
              value={
                settings.usageStats.avgSessionDurationMin
                  ? `${settings.usageStats.avgSessionDurationMin} min`
                  : "—"
              }
            />
            <StatCard label="Most used feature" value={settings.usageStats.topFeature || "—"} />
            <StatCard
              label="Patients processed this month"
              value={String(settings.usageStats.patientsProcessed || "—")}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 space-y-3">
              {/* Feature toggles */}
              <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-manrope font-bold text-[14px] text-icm-text">AI Features</p>
                    <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
                      {featureCount} of {totalCount} features enabled for your organization.
                    </p>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1",
                      featureCount === totalCount
                        ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
                        : "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
                    )}
                  >
                    {featureCount === totalCount ? "All enabled" : `${totalCount - featureCount} disabled`}
                  </span>
                </div>
                <div className="space-y-2">
                  {DEFAULT_FEATURES.map((feat) => {
                    const Icon = FEATURE_ICONS[feat.key] ?? Zap;
                    const isOn = settings.features[feat.key] ?? feat.enabled;
                    return (
                      <div
                        key={feat.key}
                        className="flex items-start gap-3 rounded-xl border border-icm-border bg-icm-bg p-3"
                      >
                        <span
                          className={cn(
                            "w-8 h-8 rounded-lg ring-1 flex items-center justify-center shrink-0 mt-0.5",
                            isOn
                              ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20"
                              : "bg-icm-bg text-icm-text-faint ring-icm-border"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-geist font-semibold text-[12.5px] text-icm-text">{feat.name}</p>
                          <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5 leading-snug">
                            {feat.description}
                          </p>
                        </div>
                        <ToggleButton
                          on={isOn}
                          onChange={() => toggleFeature(feat.key)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Model config */}
              <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
                <p className="font-manrope font-bold text-[14px] text-icm-text">Model</p>

                <div>
                  <FieldLabel>AI model</FieldLabel>
                  <select
                    value={settings.model}
                    onChange={(e) => set("model", e.target.value)}
                    className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
                  >
                    {MODELS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel>Context window</FieldLabel>
                  <select
                    value={settings.contextWindow}
                    onChange={(e) => set("contextWindow", parseInt(e.target.value))}
                    className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
                  >
                    {CONTEXT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel>Response style</FieldLabel>
                  <div className="mt-1 space-y-1">
                    {RESPONSE_STYLES.map((s) => (
                      <label
                        key={s.value}
                        className="flex items-center gap-2 text-[12px] font-geist text-icm-text cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="responseStyle"
                          value={s.value}
                          checked={settings.responseStyle === s.value}
                          onChange={() => set("responseStyle", s.value)}
                          className="accent-icm-accent"
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Compliance */}
              <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
                <p className="font-manrope font-bold text-[14px] text-icm-text">Compliance & Audit</p>

                <div>
                  <FieldLabel>Session transcript retention</FieldLabel>
                  <select
                    value={settings.sessionTranscriptRetentionDays}
                    onChange={(e) => set("sessionTranscriptRetentionDays", parseInt(e.target.value))}
                    className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
                  >
                    {RETENTION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-geist font-semibold text-icm-text">Audit all AI sessions</p>
                    <p className="text-[10.5px] text-icm-text-dim font-geist">Log every AI interaction for compliance.</p>
                  </div>
                  <ToggleButton
                    on={settings.auditAllSessions}
                    onChange={() => set("auditAllSessions", !settings.auditAllSessions)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-geist font-semibold text-icm-text">Auto-suggest prompts</p>
                    <p className="text-[10.5px] text-icm-text-dim font-geist">Show AI-powered prompt suggestions.</p>
                  </div>
                  <ToggleButton
                    on={settings.autoSuggestPrompts}
                    onChange={() => set("autoSuggestPrompts", !settings.autoSuggestPrompts)}
                  />
                </div>

                <div className="rounded-lg border border-icm-border bg-icm-bg p-2.5 flex gap-2">
                  <Info className="w-4 h-4 text-icm-text-dim shrink-0 mt-0.5" />
                  <p className="text-[10.5px] font-geist text-icm-text-dim leading-relaxed">
                    AI-generated content is always shown with a disclaimer. Outputs are non-deterministic.
                    Train staff to review all AI suggestions before use.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Brain Orchestrator settings */}
          <OrchestratorSettings />
        </div>
      )}
    </SettingsLayout>
  );
};

function AISkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl border border-icm-border bg-icm-panel" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 h-72 rounded-xl border border-icm-border bg-icm-panel" />
        <div className="space-y-3">
          <div className="h-52 rounded-xl border border-icm-border bg-icm-panel" />
          <div className="h-40 rounded-xl border border-icm-border bg-icm-panel" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel px-4 py-3">
      <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">{label}</p>
      <p className="mt-1 text-[18px] font-manrope font-bold text-icm-text leading-tight">{value}</p>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
      {children}
    </label>
  );
}

function ToggleButton({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "relative w-9 h-5 rounded-full transition-colors shrink-0",
        on ? "bg-icm-accent" : "bg-icm-border"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
          on && "translate-x-4"
        )}
      />
    </button>
  );
}

export default SettingsAI;
