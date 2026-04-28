import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { aiFeatures } from "@/data/settings";
import { cn } from "@/lib/utils";
import { Sparkles, ShieldCheck, ArrowRight, Lock, Video } from "lucide-react";
import { demoToast } from "@/lib/demoToast";

const SettingsAI = () => {
  const navigate = useNavigate();
  const [globalOn, setGlobalOn] = useState(true);

  return (
    <SettingsLayout
      title="AI Settings"
      subtitle="Control AI features by program, state, and role. All AI features are optional and can be disabled at any time."
    >
      {/* Global toggle */}
      <div
        className={cn(
          "rounded-xl border p-4 flex items-center justify-between gap-4",
          globalOn
            ? "border-icm-green/30 bg-icm-green-soft"
            : "border-icm-border bg-icm-panel"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center ring-1",
              globalOn
                ? "bg-icm-green text-white ring-icm-green/30"
                : "bg-icm-bg text-icm-text-dim ring-icm-border"
            )}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="font-manrope font-bold text-[14px] text-icm-text">
              AI Features: {globalOn ? "ENABLED" : "DISABLED"}
            </p>
            <p className="text-[11.5px] font-geist text-icm-text-dim">
              {globalOn
                ? "All AI features are operating normally."
                : "All AI features are disabled organization-wide."}
            </p>
          </div>
        </div>
        <Toggle on={globalOn} onChange={setGlobalOn} large />
      </div>

      {/* Feature toggles */}
      <div>
        <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">
          Feature controls
        </p>
        <div className="space-y-2">
          {aiFeatures.map((f) => (
            <FeatureRow key={f.key} name={f.name} description={f.description} defaultOn={f.enabled} />
          ))}
        </div>
      </div>

      {/* Virtual Visits */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Video className="w-4 h-4 text-icm-green" />
          <p className="font-manrope font-bold text-[13.5px] text-icm-text">Virtual Visits</p>
        </div>
        <div className="space-y-2">
          <FeatureRow
            name="Enable virtual visits"
            description="Conduct video visits with individuals and guardians directly inside CaseManagement.AI."
            defaultOn={true}
          />
          <FeatureRow
            name="Ambient listening automatically enabled"
            description="Virtual visits start ambient transcription automatically. If off, must be triggered manually inside the call."
            defaultOn={true}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              Video quality
            </label>
            <select className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text">
              <option>Auto (recommended)</option>
              <option>HD</option>
              <option>Standard</option>
              <option>Low bandwidth mode</option>
            </select>
          </div>
          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              Recording storage
            </label>
            <select className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text">
              <option>Do not store video (transcript only)</option>
              <option>Store for 24 hours</option>
              <option>Store for 7 days</option>
            </select>
          </div>
          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              Maximum visit duration (minutes)
            </label>
            <input
              type="number"
              defaultValue={120}
              className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
            />
          </div>
          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              Background options
            </label>
            <div className="mt-1 space-y-1">
              <label className="flex items-center gap-2 text-[12px] font-geist text-icm-text">
                <input type="checkbox" defaultChecked /> Blur background
              </label>
              <label className="flex items-center gap-2 text-[12px] font-geist text-icm-text">
                <input type="checkbox" /> Virtual background (org logo)
              </label>
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] font-geist text-icm-text-dim italic">
          Audio transcript is always retained per your data retention policy
          regardless of video storage setting.
        </p>
      </div>

      {/* Audit settings */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-icm-accent" />
          <p className="font-manrope font-bold text-[13.5px] text-icm-text">AI audit settings</p>
        </div>
        <ul className="space-y-2 text-[12px] font-geist text-icm-text">
          <LockedToggle label="Log all AI suggestions" />
          <LockedToggle label="Log all AI pre-fills" />
          <LockedToggle label="Log user overrides of AI" />
        </ul>
        <div className="mt-3">
          <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
            Retain AI audit logs for
          </label>
          <select className="mt-1 w-full max-w-[280px] h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text">
            <option>1 year</option>
            <option>2 years</option>
            <option defaultChecked>5 years</option>
            <option>Indefinitely</option>
          </select>
        </div>
      </div>

      {/* Data usage policy */}
      <div className="rounded-xl border border-icm-amber/30 bg-icm-amber-soft p-4">
        <p className="font-manrope font-bold text-[13.5px] text-icm-text">Data usage policy</p>
        <p className="text-[12px] font-geist text-icm-text mt-1.5 leading-relaxed">
          Customer data and PHI is <strong>never</strong> used to train or fine-tune AI models
          without explicit written authorization. All AI processing uses isolated,
          customer-specific context only.
        </p>
        <button
          onClick={() => demoToast("Data Processing Agreement")}
          className="mt-2 text-[11.5px] font-geist font-semibold text-icm-accent inline-flex items-center gap-1"
        >
          View data processing agreement →
        </button>
      </div>

      <button
        onClick={() => navigate("/ai-roadmap")}
        className="rounded-xl border border-icm-border bg-icm-panel p-4 text-left hover:border-icm-border-strong transition-colors w-full flex items-center justify-between"
      >
        <div>
          <p className="font-manrope font-bold text-[13.5px] text-icm-text">View 12-month AI roadmap</p>
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
            Planned AI features with target dates
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-icm-text-faint" />
      </button>
    </SettingsLayout>
  );
};

function FeatureRow({
  name,
  description,
  defaultOn,
}: {
  name: string;
  description: string;
  defaultOn: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-manrope font-bold text-[13px] text-icm-text">{name}</p>
        <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
      <Toggle on={on} onChange={setOn} />
    </div>
  );
}

function LockedToggle({ label }: { label: string }) {
  return (
    <li className="flex items-center justify-between">
      <span>{label}</span>
      <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
        <Lock className="w-2.5 h-2.5" />
        Always on
      </span>
    </li>
  );
}

function Toggle({
  on,
  onChange,
  large,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  large?: boolean;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        "relative rounded-full transition-colors",
        large ? "w-12 h-6" : "w-9 h-5",
        on ? "bg-icm-accent" : "bg-icm-border"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 rounded-full bg-white transition-transform",
          large ? "w-5 h-5" : "w-4 h-4",
          on && (large ? "translate-x-6" : "translate-x-4")
        )}
      />
    </button>
  );
}

export default SettingsAI;
