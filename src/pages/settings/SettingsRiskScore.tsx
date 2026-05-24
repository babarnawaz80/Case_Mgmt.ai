// Settings — Risk Score Configuration
// Route: /settings/risk-score
// Admin-only. Lets org configure factor weights, enable/disable factors,
// and set the Low / Moderate / High score thresholds.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { useRole } from "@/contexts/RoleContext";
import { AdminOnly } from "@/components/platform/AdminOnly";
import {
  ShieldAlert,
  Save,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
  Info,
  CheckCircle2,
} from "lucide-react";
import {
  loadRiskSettings,
  saveRiskSettings,
  buildDefaultSettings,
  publishSettingsChange,
  scoreLevel,
  riskBg,
  type RiskSettings,
  type FactorConfig,
  type RiskThresholds,
} from "@/lib/riskEngine";

export default function SettingsRiskScore() {
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  if (!isAdmin) return <AdminOnly />;

  return <SettingsRiskScoreInner navigate={navigate} />;
}

function SettingsRiskScoreInner({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const [settings, setSettings] = useState<RiskSettings>(loadRiskSettings);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const markDirty = (updated: RiskSettings) => {
    setSettings(updated);
    setDirty(true);
    setSaved(false);
  };

  const handleSave = () => {
    saveRiskSettings(settings);
    publishSettingsChange();
    setSaved(true);
    setDirty(false);
  };

  const handleReset = () => {
    if (!confirm("Reset all risk score settings to defaults?")) return;
    const defaults = buildDefaultSettings();
    setSettings(defaults);
    saveRiskSettings(defaults);
    publishSettingsChange();
    setDirty(false);
    setSaved(true);
  };

  const updateFactor = (factorId: string, patch: Partial<FactorConfig>) => {
    markDirty({
      ...settings,
      factors: settings.factors.map((f) =>
        f.factorId === factorId ? { ...f, ...patch } : f
      ),
    });
  };

  const updateThresholds = (patch: Partial<RiskThresholds>) => {
    markDirty({ ...settings, thresholds: { ...settings.thresholds, ...patch } });
  };

  const t = settings.thresholds;
  const lowWidth      = (t.lowMax / 100) * 100;
  const moderateWidth = ((t.moderateMax - t.lowMax) / 100) * 100;
  const highWidth     = ((100 - t.moderateMax) / 100) * 100;

  const totalMaxPoints = settings.factors
    .filter((f) => f.enabled)
    .reduce((s, f) => s + f.points, 0);

  return (
    <ICMShell title="Risk Score Settings" showAIPanel={false}>
      <div className="space-y-5 max-w-[860px]">
        <Breadcrumbs
          backTo="/settings"
          backLabel="Admin Settings"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Admin Settings", to: "/settings" },
            { label: "Risk Score" },
          ]}
        />

        {/* Page title */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-5 h-5 text-icm-accent" />
              <h1 className="font-manrope text-[22px] font-extrabold text-icm-text tracking-tight">
                Risk Score Configuration
              </h1>
            </div>
            <p className="text-[12.5px] text-icm-text-dim font-geist max-w-[560px]">
              Customize the factors, point values, and thresholds used to calculate each individual's live risk score. Changes take effect immediately across all views.
            </p>
          </div>
          {dirty && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-icm-amber-soft text-icm-amber ring-1 ring-icm-amber/20 font-geist">
              Unsaved changes
            </span>
          )}
          {saved && !dirty && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20 font-geist flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Saved
            </span>
          )}
        </div>

        {/* ── Section 1: Thresholds ── */}
        <section className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <div className="px-5 py-3.5 border-b border-icm-border flex items-center justify-between">
            <div>
              <h2 className="font-manrope font-bold text-[13.5px] text-icm-text">Score Thresholds</h2>
              <p className="text-[11.5px] text-icm-text-dim font-geist mt-0.5">Define the cutoffs between Low, Moderate, and High risk levels.</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Live threshold bar preview */}
            <div>
              <p className="text-[11px] text-icm-text-faint font-geist uppercase tracking-wide font-semibold mb-2">Preview</p>
              <div className="relative h-5 rounded-full overflow-hidden flex">
                <div style={{ width: `${lowWidth}%` }} className="bg-icm-green flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white font-geist truncate px-1">LOW</span>
                </div>
                <div style={{ width: `${moderateWidth}%` }} className="bg-icm-amber flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white font-geist truncate px-1">MOD</span>
                </div>
                <div style={{ width: `${highWidth}%` }} className="bg-icm-red flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white font-geist truncate px-1">HIGH</span>
                </div>
              </div>
              <div className="flex justify-between text-[9.5px] font-mono text-icm-text-faint mt-1">
                <span>0</span>
                <span>{t.lowMax}</span>
                <span>{t.moderateMax}</span>
                <span>100</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ThresholdField
                label="Low max (≤)"
                color="icm-green"
                value={t.lowMax}
                min={5}
                max={t.moderateMax - 5}
                onChange={(v) => updateThresholds({ lowMax: v })}
              />
              <ThresholdField
                label="Moderate max (≤)"
                color="icm-amber"
                value={t.moderateMax}
                min={t.lowMax + 5}
                max={94}
                onChange={(v) => updateThresholds({ moderateMax: v })}
              />
              <div className="rounded-lg border border-icm-border bg-icm-red/5 p-3">
                <p className="text-[11px] font-geist text-icm-red font-semibold uppercase tracking-wide mb-1">High</p>
                <p className="font-mono font-bold text-[20px] text-icm-red leading-none">
                  {t.moderateMax + 1}–100
                </p>
                <p className="text-[10.5px] text-icm-text-faint font-geist mt-1">Auto-calculated</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 2: Factors ── */}
        <section className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <div className="px-5 py-3.5 border-b border-icm-border flex items-center justify-between">
            <div>
              <h2 className="font-manrope font-bold text-[13.5px] text-icm-text">Scoring Factors</h2>
              <p className="text-[11.5px] text-icm-text-dim font-geist mt-0.5">
                Enable/disable factors and set their point values. Max enabled: {totalMaxPoints} pts.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[10.5px] text-icm-text-faint font-geist">
              <Info className="w-3 h-3" />
              Scores are capped at 100
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12px] font-geist">
              <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-2.5 text-left font-semibold w-8">On</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Factor</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Source</th>
                  <th className="px-4 py-2.5 text-right font-semibold w-28">Points</th>
                </tr>
              </thead>
              <tbody>
                {settings.factors.map((f, i) => (
                  <FactorRow
                    key={f.factorId}
                    factor={f}
                    index={i}
                    onToggle={(enabled) => updateFactor(f.factorId, { enabled })}
                    onPointsChange={(points) => updateFactor(f.factorId, { points })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section 3: Display settings ── */}
        <section className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-3">
          <h2 className="font-manrope font-bold text-[13.5px] text-icm-text mb-3">Display Settings</h2>
          <ToggleRow
            label="Show risk score on People Supported list"
            checked={settings.display.showOnPeopleList}
            onChange={(v) => markDirty({ ...settings, display: { ...settings.display, showOnPeopleList: v } })}
          />
          <ToggleRow
            label="Show risk score on eChart header"
            checked={settings.display.showOnEChartHeader}
            onChange={(v) => markDirty({ ...settings, display: { ...settings.display, showOnEChartHeader: v } })}
          />
          <ToggleRow
            label="Show Low-risk scores (scores in the Low range are shown; when off, only Moderate/High are displayed)"
            checked={settings.display.showLowRisk}
            onChange={(v) => markDirty({ ...settings, display: { ...settings.display, showLowRisk: v } })}
          />
        </section>

        {/* ── Sticky footer ── */}
        <div className="sticky bottom-0 z-10 -mx-1 px-1 pb-2 pt-3 bg-gradient-to-t from-icm-bg to-transparent pointer-events-none">
          <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex items-center justify-between gap-3 shadow-elevated pointer-events-auto">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-icm-border bg-icm-bg text-icm-text-dim text-[12px] font-semibold hover:border-icm-border-strong hover:text-icm-text transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to defaults
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSettings(loadRiskSettings()); setDirty(false); setSaved(false); }}
                className="h-9 px-4 rounded-lg border border-icm-border bg-icm-bg text-icm-text-dim text-[12px] font-semibold hover:text-icm-text transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty}
                className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-icm-accent text-white text-[12px] font-semibold hover:opacity-90 transition-all disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                Save changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </ICMShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ThresholdField({
  label,
  color,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  color: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-lg border border-icm-border bg-icm-bg p-3">
      <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 font-geist text-${color}`}>{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n) && n >= min && n <= max) onChange(n);
          }}
          className="w-full h-9 rounded-lg border border-icm-border bg-icm-panel text-icm-text font-mono font-bold text-[18px] text-center focus:outline-none focus:border-icm-accent/60 transition-colors"
        />
      </div>
    </div>
  );
}

function FactorRow({
  factor,
  index,
  onToggle,
  onPointsChange,
}: {
  factor: FactorConfig;
  index: number;
  onToggle: (v: boolean) => void;
  onPointsChange: (v: number) => void;
}) {
  return (
    <tr className={`border-t border-icm-border ${!factor.enabled ? "opacity-45" : ""} hover:bg-icm-bg/40 transition-colors`}>
      <td className="px-5 py-2.5">
        <button
          onClick={() => onToggle(!factor.enabled)}
          className="text-icm-accent"
          title={factor.enabled ? "Disable factor" : "Enable factor"}
        >
          {factor.enabled
            ? <ToggleRight className="w-5 h-5 text-icm-accent" />
            : <ToggleLeft className="w-5 h-5 text-icm-text-faint" />}
        </button>
      </td>
      <td className="px-4 py-2.5">
        <p className="font-semibold text-icm-text text-[12px] leading-snug">{factor.label}</p>
      </td>
      <td className="px-4 py-2.5">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20 whitespace-nowrap">
          {factor.source}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right">
        <input
          type="number"
          value={factor.points}
          min={1}
          max={50}
          disabled={!factor.enabled}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n) && n >= 1 && n <= 50) onPointsChange(n);
          }}
          className="w-16 h-7 rounded-lg border border-icm-border bg-icm-bg text-icm-text font-mono font-bold text-[13px] text-center focus:outline-none focus:border-icm-accent/60 transition-colors disabled:opacity-40"
        />
        <span className="ml-1 text-icm-text-faint text-[11px]">pts</span>
      </td>
    </tr>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-icm-border last:border-0">
      <p className="text-[12.5px] font-geist text-icm-text leading-relaxed">{label}</p>
      <button
        onClick={() => onChange(!checked)}
        className="shrink-0 mt-0.5"
        aria-pressed={checked}
      >
        {checked
          ? <ToggleRight className="w-6 h-6 text-icm-accent" />
          : <ToggleLeft className="w-6 h-6 text-icm-text-faint" />}
      </button>
    </div>
  );
}
