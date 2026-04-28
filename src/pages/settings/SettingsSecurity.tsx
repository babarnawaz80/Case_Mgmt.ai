import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Lock, Shield, FileLock2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { demoToast } from "@/lib/demoToast";

const SettingsSecurity = () => {
  return (
    <SettingsLayout
      title="Security & Audit"
      subtitle="Password policy, MFA, sessions, data retention, and compliance posture"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Panel title="Password policy" icon={Lock}>
          <Field label="Minimum length" defaultValue="12" />
          <ToggleRow label="Require uppercase" defaultOn />
          <ToggleRow label="Require numbers" defaultOn />
          <ToggleRow label="Require special characters" defaultOn />
          <SelectRow
            label="Password expiration"
            options={["Never", "90 days", "180 days", "1 year"]}
            defaultValue="180 days"
          />
          <Field label="Prevent reuse of last N passwords" defaultValue="5" />
        </Panel>

        <Panel title="MFA settings" icon={Shield}>
          <ToggleRow label="Require MFA for all users" />
          <ToggleRow label="Require MFA for Admin role" defaultOn locked />
          <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mt-3 mb-2">
            Allowed methods
          </p>
          <Checkbox label="Authenticator app (TOTP)" defaultOn />
          <Checkbox label="SMS (requires phone on file)" defaultOn />
          <Checkbox label="Hardware key (FIDO2)" />
        </Panel>

        <Panel title="Session settings">
          <SelectRow
            label="Session timeout (idle)"
            options={["15 min", "30 min", "1 hour", "4 hours", "8 hours"]}
            defaultValue="30 min"
          />
          <SelectRow
            label="Maximum session length"
            options={["8 hours", "12 hours", "24 hours", "No limit"]}
            defaultValue="12 hours"
          />
          <SelectRow
            label="Concurrent sessions"
            options={["1 session only", "2", "Unlimited"]}
            defaultValue="2"
          />
        </Panel>

        <Panel title="Login security">
          <Field label="Lockout after failed attempts" defaultValue="5" />
          <SelectRow
            label="Lockout duration"
            options={["15 min", "30 min", "1 hour", "Admin unlock only"]}
            defaultValue="30 min"
          />
          <div>
            <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mt-2 mb-1">
              IP allowlist
            </p>
            <textarea
              rows={3}
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
              {[
                { name: "Clinical notes", def: "7 years", action: ["Archive", "Delete"] },
                { name: "Assessments", def: "7 years", action: ["Archive", "Delete"] },
                { name: "Incidents", def: "10 years", action: ["Archive", "Delete"] },
                { name: "Audit logs", def: "Indefinitely", action: ["Archive only"] },
                { name: "Documents", def: "7 years", action: ["Archive", "Delete"] },
                { name: "Billing records", def: "10 years", action: ["Archive", "Delete"] },
                { name: "AI session transcripts", def: "1 year", action: ["Delete only"] },
              ].map((r) => (
                <tr key={r.name} className="border-t border-icm-border">
                  <td className="px-3 py-2 text-icm-text font-medium">{r.name}</td>
                  <td className="px-3 py-2">
                    <select
                      defaultValue={r.def}
                      className="h-7 px-2 rounded-lg border border-icm-border bg-icm-panel text-[11px] font-geist text-icm-text"
                    >
                      {["1 year", "3 years", "5 years", "7 years", "10 years", "Indefinitely"].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select className="h-7 px-2 rounded-lg border border-icm-border bg-icm-panel text-[11px] font-geist text-icm-text">
                      {r.action.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* HIPAA & compliance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Panel title="HIPAA compliance" icon={FileLock2}>
          <ToggleRow label="BAA signed" defaultOn />
          <Field label="BAA date" defaultValue="01/15/2025" />
          <button
            onClick={() => demoToast("BAA template download")}
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
  );
};

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

function Field({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <div>
      <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
        {label}
      </label>
      <input
        defaultValue={defaultValue}
        className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
      />
    </div>
  );
}

function SelectRow({
  label,
  options,
  defaultValue,
}: {
  label: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
        {label}
      </label>
      <select
        defaultValue={defaultValue}
        className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({
  label,
  defaultOn,
  locked,
}: {
  label: string;
  defaultOn?: boolean;
  locked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[12px] font-geist text-icm-text py-1">
      <span>{label}</span>
      <span
        className={cn(
          "relative w-9 h-5 rounded-full",
          defaultOn ? "bg-icm-accent" : "bg-icm-border",
          locked && "opacity-70"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
            defaultOn && "translate-x-4"
          )}
        />
      </span>
    </div>
  );
}

function Checkbox({ label, defaultOn }: { label: string; defaultOn?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-[12px] font-geist text-icm-text py-0.5">
      <input type="checkbox" defaultChecked={defaultOn} className="accent-icm-accent" />
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
