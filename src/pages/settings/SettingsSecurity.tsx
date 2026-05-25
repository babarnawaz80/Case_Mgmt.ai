import React, { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Lock, Shield, FileLock2, Info, Loader2, Save, Smartphone, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isMFAEnrolled, unenrollPhone } from "@/lib/mfa";
import { MFAEnrollModal } from "@/components/auth/MFAEnrollModal";

interface SecuritySettings {
  sessionTimeoutMinutes: number;
  maxSessionHours: number;
  requireMFA: boolean;
  mfaForAdmins: boolean;
  allowedMfaMethods: string[];
  minPasswordLength: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  passwordExpirationDays: number | null;
  preventReuseN: number;
  lockoutAfterAttempts: number;
  lockoutDurationMinutes: number;
  ipAllowlist: string;
  retentionSettings: Record<string, { period: string; action: string }>;
  baaDate: string;
  baaSigned: boolean;
}

const DEFAULT: SecuritySettings = {
  sessionTimeoutMinutes: 30,
  maxSessionHours: 12,
  requireMFA: false,
  mfaForAdmins: true,
  allowedMfaMethods: ["totp", "sms"],
  minPasswordLength: 12,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  passwordExpirationDays: 180,
  preventReuseN: 5,
  lockoutAfterAttempts: 5,
  lockoutDurationMinutes: 30,
  ipAllowlist: "",
  retentionSettings: {},
  baaDate: "",
  baaSigned: false,
};

const RETENTION_ROWS = [
  { name: "Clinical notes", defaultPeriod: "7 years", actions: ["Archive", "Delete"] },
  { name: "Assessments", defaultPeriod: "7 years", actions: ["Archive", "Delete"] },
  { name: "Incidents", defaultPeriod: "10 years", actions: ["Archive", "Delete"] },
  { name: "Audit logs", defaultPeriod: "Indefinitely", actions: ["Archive only"] },
  { name: "Documents", defaultPeriod: "7 years", actions: ["Archive", "Delete"] },
  { name: "Billing records", defaultPeriod: "10 years", actions: ["Archive", "Delete"] },
  { name: "AI session transcripts", defaultPeriod: "1 year", actions: ["Delete only"] },
];

const SettingsSecurity = () => {
  const { userProfile, isAdmin } = useAuth();
  const orgId = userProfile?.organizationId;

  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Per-user MFA enrollment state
  const [enrolled, setEnrolled] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);

  useEffect(() => {
    setEnrolled(isMFAEnrolled());
  }, []);

  const handleUnenroll = async () => {
    if (!window.confirm("Remove SMS authentication from your account? You will no longer be required to enter a code when signing in.")) return;
    setUnenrolling(true);
    try {
      await unenrollPhone();
      setEnrolled(false);
      toast.success("SMS MFA removed from your account.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to remove MFA.");
    } finally {
      setUnenrolling(false);
    }
  };

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    getDoc(doc(db, "organizations", orgId))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const sec = d.security ?? {};
          setSettings({
            sessionTimeoutMinutes: sec.sessionTimeoutMinutes ?? DEFAULT.sessionTimeoutMinutes,
            maxSessionHours: sec.maxSessionHours ?? DEFAULT.maxSessionHours,
            requireMFA: sec.requireMFA ?? DEFAULT.requireMFA,
            mfaForAdmins: sec.mfaForAdmins ?? DEFAULT.mfaForAdmins,
            allowedMfaMethods: sec.allowedMfaMethods ?? DEFAULT.allowedMfaMethods,
            minPasswordLength: sec.minPasswordLength ?? DEFAULT.minPasswordLength,
            requireUppercase: sec.requireUppercase ?? DEFAULT.requireUppercase,
            requireNumbers: sec.requireNumbers ?? DEFAULT.requireNumbers,
            requireSpecialChars: sec.requireSpecialChars ?? DEFAULT.requireSpecialChars,
            passwordExpirationDays: sec.passwordExpirationDays ?? DEFAULT.passwordExpirationDays,
            preventReuseN: sec.preventReuseN ?? DEFAULT.preventReuseN,
            lockoutAfterAttempts: sec.lockoutAfterAttempts ?? DEFAULT.lockoutAfterAttempts,
            lockoutDurationMinutes: sec.lockoutDurationMinutes ?? DEFAULT.lockoutDurationMinutes,
            ipAllowlist: sec.ipAllowlist ?? DEFAULT.ipAllowlist,
            retentionSettings: sec.retentionSettings ?? DEFAULT.retentionSettings,
            baaDate: sec.baaDate ?? DEFAULT.baaDate,
            baaSigned: sec.baaSigned ?? DEFAULT.baaSigned,
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load security settings:", err);
        toast.error("Failed to load security settings");
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  const set = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const toggleMfaMethod = (method: string) => {
    setSettings((prev) => ({
      ...prev,
      allowedMfaMethods: prev.allowedMfaMethods.includes(method)
        ? prev.allowedMfaMethods.filter((m) => m !== method)
        : [...prev.allowedMfaMethods, method],
    }));
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "organizations", orgId), {
        security: settings,
        updatedAt: new Date(),
      });
      toast.success("Security settings saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save security settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <SettingsLayout title="Security & Audit" subtitle="Password policy, MFA, sessions, data retention, and compliance posture">
      <SecuritySkeleton />
    </SettingsLayout>
  );

  return (
    <>
    <SettingsLayout
      title="Security & Audit"
      subtitle="Password policy, MFA, sessions, data retention, and compliance posture"
      actions={
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-3 rounded-xl bg-teal-600 text-white text-[12px] font-geist font-semibold hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save security settings
        </button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Password Policy */}
        <Panel title="Password policy" icon={Lock}>
          <NumberField
            label="Minimum length"
            value={settings.minPasswordLength}
            onChange={(v) => set("minPasswordLength", v)}
            min={8}
            max={32}
          />
          <ToggleRow
            label="Require uppercase"
            on={settings.requireUppercase}
            onChange={(v) => set("requireUppercase", v)}
          />
          <ToggleRow
            label="Require numbers"
            on={settings.requireNumbers}
            onChange={(v) => set("requireNumbers", v)}
          />
          <ToggleRow
            label="Require special characters"
            on={settings.requireSpecialChars}
            onChange={(v) => set("requireSpecialChars", v)}
          />
          <SelectRow
            label="Password expiration"
            value={settings.passwordExpirationDays?.toString() ?? "never"}
            onChange={(v) => set("passwordExpirationDays", v === "never" ? null : parseInt(v))}
            options={[
              { value: "never", label: "Never" },
              { value: "90", label: "90 days" },
              { value: "180", label: "180 days" },
              { value: "365", label: "1 year" },
            ]}
          />
          <NumberField
            label="Prevent reuse of last N passwords"
            value={settings.preventReuseN}
            onChange={(v) => set("preventReuseN", v)}
            min={0}
            max={24}
          />
          <p className="text-[10.5px] text-icm-text-faint font-geist italic mt-1">
            Displayed only. Actual enforcement requires backend integration.
          </p>
        </Panel>

        {/* MFA Settings */}
        <Panel title="Multi-Factor Authentication" icon={Shield}>
          {/* Org-wide policy — admin only */}
          {isAdmin && (
            <>
              <ToggleRow
                label="Require SMS MFA for all users"
                on={settings.requireMFA}
                onChange={(v) => {
                  set("requireMFA", v);
                  if (v) toast.info("Users without MFA will be prompted to enroll on next login.");
                }}
              />
              <p className="text-[11px] text-icm-text-faint font-geist ml-0 mb-3 leading-relaxed">
                When enabled, every staff member must enroll their phone number for SMS verification before accessing the system. Powered by Firebase SMS MFA.
              </p>
              <ToggleRow
                label="Always require MFA for Admin role"
                on={settings.mfaForAdmins}
                onChange={(v) => set("mfaForAdmins", v)}
                locked
              />
              <div className="h-px bg-icm-border my-4" />
            </>
          )}

          {/* Per-user MFA enrollment status */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-icm-bg border border-icm-border">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-icm-text-dim" />
              <div>
                <p className="text-[13px] font-semibold text-icm-text">SMS Authentication</p>
                <p className="text-[11px] text-icm-text-faint">
                  {enrolled ? "Your account is protected with SMS 2FA" : "Not yet enrolled"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {enrolled ? (
                <>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                  </span>
                  <button
                    onClick={handleUnenroll}
                    disabled={unenrolling}
                    className="px-3 h-7 rounded-lg text-[11.5px] font-semibold border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                  >
                    {unenrolling ? <Loader2 className="w-3 h-3 animate-spin" /> : "Remove"}
                  </button>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                    <XCircle className="w-3.5 h-3.5" /> Not enrolled
                  </span>
                  <button
                    onClick={() => setShowEnrollModal(true)}
                    className="px-3 h-7 rounded-lg text-[11.5px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    Enroll Now
                  </button>
                </>
              )}
            </div>
          </div>
        </Panel>

        {/* Session Settings */}
        <Panel title="Session settings">
          <SelectRow
            label="Session timeout (idle)"
            value={settings.sessionTimeoutMinutes.toString()}
            onChange={(v) => set("sessionTimeoutMinutes", parseInt(v))}
            options={[
              { value: "15", label: "15 min" },
              { value: "30", label: "30 min" },
              { value: "60", label: "1 hour" },
              { value: "120", label: "2 hours" },
              { value: "240", label: "4 hours" },
              { value: "480", label: "8 hours" },
            ]}
          />
          <SelectRow
            label="Maximum session length"
            value={settings.maxSessionHours.toString()}
            onChange={(v) => set("maxSessionHours", parseInt(v))}
            options={[
              { value: "8", label: "8 hours" },
              { value: "12", label: "12 hours" },
              { value: "24", label: "24 hours" },
              { value: "0", label: "No limit" },
            ]}
          />
        </Panel>

        {/* Login Security */}
        <Panel title="Login security">
          <NumberField
            label="Lockout after failed attempts"
            value={settings.lockoutAfterAttempts}
            onChange={(v) => set("lockoutAfterAttempts", v)}
            min={3}
            max={20}
          />
          <SelectRow
            label="Lockout duration"
            value={settings.lockoutDurationMinutes.toString()}
            onChange={(v) => set("lockoutDurationMinutes", parseInt(v))}
            options={[
              { value: "15", label: "15 min" },
              { value: "30", label: "30 min" },
              { value: "60", label: "1 hour" },
              { value: "-1", label: "Admin unlock only" },
            ]}
          />
          <div>
            <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mt-2 mb-1">
              IP allowlist
            </p>
            <textarea
              rows={3}
              value={settings.ipAllowlist}
              onChange={(e) => set("ipAllowlist", e.target.value)}
              placeholder="One IP or CIDR range per line"
              className="w-full px-3 py-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text resize-none focus:outline-none focus:border-icm-border-strong"
            />
          </div>
        </Panel>
      </div>

      {/* Data retention */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <p className="font-manrope font-bold text-[14px] text-icm-text mb-3">Data retention</p>
        <div className="rounded-xl border border-icm-border overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Record type</th>
                <th className="text-left px-3 py-2 font-semibold">Retention period</th>
                <th className="text-left px-3 py-2 font-semibold">After retention</th>
              </tr>
            </thead>
            <tbody>
              {RETENTION_ROWS.map((r) => {
                const saved: { period: string; action: string } = settings.retentionSettings[r.name] ?? { period: r.defaultPeriod, action: r.actions[0] };
                return (
                  <tr key={r.name} className="border-t border-icm-border">
                    <td className="px-3 py-2 text-icm-text font-medium">{r.name}</td>
                    <td className="px-3 py-2">
                      <select
                        value={saved.period ?? r.defaultPeriod}
                        onChange={(e) =>
                          set("retentionSettings", {
                            ...settings.retentionSettings,
                            [r.name]: { ...saved, period: e.target.value },
                          })
                        }
                        className="h-7 px-2 rounded-lg border border-icm-border bg-icm-panel text-[11px] font-geist text-icm-text"
                      >
                        {["1 year", "3 years", "5 years", "7 years", "10 years", "Indefinitely"].map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={saved.action ?? r.actions[0]}
                        onChange={(e) =>
                          set("retentionSettings", {
                            ...settings.retentionSettings,
                            [r.name]: { ...saved, action: e.target.value },
                          })
                        }
                        className="h-7 px-2 rounded-lg border border-icm-border bg-icm-panel text-[11px] font-geist text-icm-text"
                      >
                        {r.actions.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* HIPAA & Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Panel title="HIPAA compliance" icon={FileLock2}>
          <ToggleRow
            label="BAA signed"
            on={settings.baaSigned}
            onChange={(v) => set("baaSigned", v)}
          />
          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">BAA date</label>
            <input
              type="date"
              value={settings.baaDate}
              onChange={(e) => set("baaDate", e.target.value)}
              className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
            />
          </div>
          <button
            onClick={() => toast("BAA template download")}
            className="mt-2 h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-geist font-semibold hover:border-icm-border-strong"
          >
            Download BAA template
          </button>
        </Panel>

        <Panel title="Encryption" icon={Shield}>
          <StatusRow label="Data in transit" value="TLS 1.3" />
          <StatusRow label="Data at rest" value="AES-256" />
        </Panel>

        <Panel title="Compliance posture" icon={Info}>
          <div className="space-y-2 text-[11.5px] font-geist text-icm-text">
            <div>
              <p className="font-semibold">SOC 2 Type II</p>
              <p className="text-icm-text-dim">In progress — target Q4 2026</p>
            </div>
            <div>
              <p className="font-semibold">HITRUST i1</p>
              <p className="text-icm-text-dim">Alignment in progress — target Q2 2027</p>
            </div>
          </div>
        </Panel>
      </div>
    </SettingsLayout>
    {showEnrollModal && (
      <MFAEnrollModal
        optional
        onEnrolled={() => {
          setEnrolled(true);
          setShowEnrollModal(false);
          toast.success("SMS MFA is now active on your account.");
        }}
        onSkip={() => setShowEnrollModal(false)}
      />
    )}
  </>
  );
};

function SecuritySkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {[180, 200, 160, 180].map((h, i) => (
          <div key={i} className="rounded-xl border border-icm-border bg-icm-panel p-4" style={{ height: h }} />
        ))}
      </div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-4 h-4 text-icm-text-dim" />}
        <p className="font-manrope font-bold text-[13.5px] text-icm-text">{title}</p>
      </div>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
      />
    </div>
  );
}

function SelectRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({
  label,
  on,
  onChange,
  locked,
}: {
  label: string;
  on: boolean;
  onChange?: (v: boolean) => void;
  locked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[12px] font-geist text-icm-text py-1">
      <span>{label}</span>
      <button
        onClick={() => !locked && onChange?.(!on)}
        disabled={locked}
        className={cn(
          "relative w-9 h-5 rounded-full transition-colors",
          on ? "bg-icm-accent" : "bg-icm-border",
          locked && "opacity-70 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
            on && "translate-x-4"
          )}
        />
      </button>
    </div>
  );
}

function Checkbox({ label, on, onChange }: { label: string; on: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 text-[12px] font-geist text-icm-text py-0.5 cursor-pointer">
      <input type="checkbox" checked={on} onChange={onChange} className="accent-icm-accent" />
      {label}
    </label>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[12px] font-geist text-icm-text">
      <span className="text-icm-text-dim">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-icm-green font-mono text-[11px] font-semibold">
        {value} ✓
      </span>
    </div>
  );
}

export default SettingsSecurity;
