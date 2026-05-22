import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { demoSuccess } from "@/lib/demoToast";

interface StateEnrollment {
  id: string;
  state: string;
  providerId: string;
  status: "Active" | "Pending" | "Expired";
  effective: string; // MM/DD/YYYY
  expiration: string; // MM/DD/YYYY
}

const INITIAL_ENROLLMENTS: StateEnrollment[] = [
  { id: "se-1", state: "Indiana",    providerId: "IN-2024-CM-00412", status: "Active", effective: "01/01/2024", expiration: "12/31/2026" },
  { id: "se-2", state: "New Jersey", providerId: "NJ-2025-CM-00089", status: "Active", effective: "06/01/2025", expiration: "05/31/2027" },
];

function parseMDY(s: string): Date | null {
  const [m, d, y] = s.split("/").map((n) => parseInt(n, 10));
  if (!m || !d || !y) return null;
  return new Date(y, m - 1, d);
}
function daysUntil(s: string): number | null {
  const dt = parseMDY(s);
  if (!dt) return null;
  return Math.ceil((dt.getTime() - Date.now()) / 86_400_000);
}

const SettingsOrganization = () => {
  return (
    <SettingsLayout
      title="Organization Profile"
      subtitle="Configure your organization's profile, branding, and operating states"
      actions={
        <button
          onClick={() => demoSuccess("Organization profile saved", "Changes propagated to all users.")}
          className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold"
        >
          Save profile
        </button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 max-w-[1100px]">
        <div className="lg:col-span-2 space-y-3">
          <Panel title="Profile">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Organization name" defaultValue="iCareManager Demo Agency" />
              <Select
                label="Organization type"
                options={["IDD Provider", "Case Management Agency", "MCO", "State Agency", "Other"]}
                defaultValue="Case Management Agency"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Tax ID / EIN" defaultValue="00-0000000" />
              <Field label="NPI" defaultValue="0000000000" />
            </div>
            <div className="mt-3">
              <Field label="Medicaid provider number" defaultValue="MD-PROV-1234" />
            </div>
          </Panel>

          <Panel title="Address">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Street" defaultValue="100 Main Street" />
              <Field label="City" defaultValue="Westminster" />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <Field label="State" defaultValue="MD" />
              <Field label="ZIP" defaultValue="21157" />
              <Field label="County" defaultValue="Carroll" />
            </div>
          </Panel>

          <Panel title="Contacts">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary contact name" defaultValue="Babar Nawaz" />
              <Field label="Primary contact email" defaultValue="babar@icaremanager.com" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Billing contact name" defaultValue="Babar Nawaz" />
              <Field label="Billing contact email" defaultValue="billing@icaremanager.com" />
            </div>
          </Panel>

          <Panel title="System defaults">
            <div className="grid grid-cols-3 gap-3">
              <Select
                label="Fiscal year start"
                options={["January", "April", "July", "October"]}
                defaultValue="July"
              />
              <Select
                label="Timezone"
                options={["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"]}
                defaultValue="America/New_York"
              />
              <Select
                label="Date format"
                options={["MM/DD/YYYY", "DD/MM/YYYY"]}
                defaultValue="MM/DD/YYYY"
              />
            </div>
          </Panel>
        </div>

        <div className="space-y-3">
          <Panel title="Logo">
            <div className="aspect-square rounded-xl border-2 border-dashed border-icm-border bg-icm-bg flex items-center justify-center text-icm-text-faint text-[11.5px] font-geist">
              Drag logo or click to upload
            </div>
            <p className="text-[10.5px] text-icm-text-dim font-geist mt-2">
              Used in printed documents, reports, email notifications, and login page.
            </p>
          </Panel>

          <Panel title="Brand color">
            <p className="text-[11.5px] text-icm-text-dim font-geist mb-2">
              Used as accent in printed reports and exported documents. Does not change app UI.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                defaultValue="#2563eb"
                className="w-10 h-10 rounded-lg border border-icm-border cursor-pointer"
              />
              <input
                defaultValue="#2563eb"
                className="flex-1 h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-mono text-icm-text"
              />
            </div>
          </Panel>

          <Panel title="States of operation">
            <div className="space-y-2">
              {[
                { code: "MD", name: "Maryland" },
                { code: "VA", name: "Virginia" },
                { code: "TX", name: "Texas" },
                { code: "PA", name: "Pennsylvania" },
              ].map((s) => (
                <label
                  key={s.code}
                  className="flex items-center gap-2 text-[12px] font-geist text-icm-text"
                >
                  <input
                    type="checkbox"
                    defaultChecked={s.code === "MD" || s.code === "VA"}
                    className="accent-icm-accent"
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </SettingsLayout>
  );
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        defaultValue={defaultValue}
        className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
      />
    </div>
  );
}

function Select({
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
      <Label>{label}</Label>
      <select
        defaultValue={defaultValue}
        className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
      {children}
    </label>
  );
}

export default SettingsOrganization;
