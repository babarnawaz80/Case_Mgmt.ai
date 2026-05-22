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
  const [enrollments, setEnrollments] = useState<StateEnrollment[]>(INITIAL_ENROLLMENTS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sameAsBilling, setSameAsBilling] = useState(true);

  const expiringSoon = useMemo(
    () =>
      enrollments
        .map((e) => ({ e, days: daysUntil(e.expiration) }))
        .filter((x) => x.days !== null && x.days >= 0 && x.days <= 90),
    [enrollments]
  );

  const addEnrollment = () => {
    const id = `se-${Date.now()}`;
    setEnrollments((rows) => [
      ...rows,
      { id, state: "", providerId: "", status: "Pending", effective: "", expiration: "" },
    ]);
    setEditingId(id);
  };
  const updateEnrollment = (id: string, patch: Partial<StateEnrollment>) =>
    setEnrollments((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeEnrollment = (id: string) => {
    setEnrollments((rows) => rows.filter((r) => r.id !== id));
    demoSuccess("State enrollment removed");
  };

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
      <div className="space-y-3 max-w-[1100px]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
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

      <Panel title="Provider Enrollment & Billing Identity">
        <div className="flex items-center justify-between mb-3 -mt-1">
          <p className="text-[11.5px] text-icm-text-dim font-geist">
            Identifiers, addresses, and state Medicaid enrollments used on claims.
          </p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
            <CheckCircle2 className="w-3 h-3" /> Connected — IDD Billing.AI
          </span>
        </div>

        {expiringSoon.length > 0 && (
          <div className="mb-4 rounded-xl border border-icm-amber/20 bg-icm-amber-soft px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-icm-amber shrink-0 mt-0.5" />
            <p className="text-[12px] font-geist text-icm-text leading-snug">
              <span className="font-semibold">{expiringSoon.length} state enrollment{expiringSoon.length > 1 ? "s" : ""} expiring soon</span>
              {" — "}
              {expiringSoon.map((x, i) => (
                <span key={x.e.id}>
                  {i > 0 ? "; " : ""}
                  {x.e.state} expires in {x.days} days
                </span>
              ))}
              . Renew before expiration to avoid claim rejections.
            </p>
          </div>
        )}

        {/* Organization identifiers */}
        <SubHeading>Organization identifiers</SubHeading>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Organization NPI (Type 2)" placeholder="Enter 10-digit NPI" />
          <Field label="Tax ID / EIN" placeholder="XX-XXXXXXX" />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Taxonomy code" placeholder="e.g. 251B00000X — Case Management" />
          <Field label="Organization name (as on claims)" defaultValue="iCareManager Demo Agency" />
        </div>

        {/* Billing address */}
        <SubHeading className="mt-5">Billing address</SubHeading>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Street" placeholder="100 Main Street" />
          <Field label="City" placeholder="Westminster" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <Field label="State" placeholder="MD" />
          <Field label="ZIP" placeholder="21157" />
          <div />
        </div>

        {/* Pay-To address */}
        <SubHeading className="mt-5">Pay-to address</SubHeading>
        <label className="flex items-center gap-2 text-[12px] font-geist text-icm-text mb-2">
          <input
            type="checkbox"
            checked={sameAsBilling}
            onChange={(e) => setSameAsBilling(e.target.checked)}
            className="accent-icm-accent"
          />
          Same as billing address
        </label>
        {!sameAsBilling && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Street" placeholder="Pay-to street" />
              <Field label="City" placeholder="City" />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <Field label="State" placeholder="State" />
              <Field label="ZIP" placeholder="ZIP" />
              <div />
            </div>
          </>
        )}

        {/* Billing contact */}
        <SubHeading className="mt-5">Billing contact</SubHeading>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Name" placeholder="Babar Nawaz" />
          <Field label="Phone" placeholder="(555) 555-5555" />
          <Field label="Email" placeholder="billing@example.com" />
        </div>

        {/* State Medicaid Enrollment table */}
        <SubHeading className="mt-5">Medicaid Provider Enrollment by State</SubHeading>
        <p className="text-[11.5px] text-icm-text-dim font-geist mb-2">
          Each state where you bill Medicaid requires a separate provider enrollment. Add one row per state.
        </p>
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] font-geist">
              <thead className="bg-icm-bg/60">
                <tr>
                  {["State", "Medicaid Provider ID", "Status", "Effective", "Expiration", ""].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-icm-border">
                {enrollments.map((row) => {
                  const isEditing = editingId === row.id;
                  return (
                    <tr key={row.id} className="hover:bg-icm-bg/40">
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input value={row.state} onChange={(e) => updateEnrollment(row.id, { state: e.target.value })} className={cellInput} placeholder="State" />
                        ) : (
                          <span className="font-medium text-icm-text">{row.state || "—"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {isEditing ? (
                          <input value={row.providerId} onChange={(e) => updateEnrollment(row.id, { providerId: e.target.value })} className={cellInput} placeholder="Provider ID" />
                        ) : (
                          <span className="text-icm-text-dim">{row.providerId || "—"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <select
                            value={row.status}
                            onChange={(e) => updateEnrollment(row.id, { status: e.target.value as StateEnrollment["status"] })}
                            className={cellInput}
                          >
                            <option>Active</option>
                            <option>Pending</option>
                            <option>Expired</option>
                          </select>
                        ) : (
                          <StatusBadge status={row.status} />
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-icm-text-dim">
                        {isEditing ? (
                          <input value={row.effective} onChange={(e) => updateEnrollment(row.id, { effective: e.target.value })} className={cellInput} placeholder="MM/DD/YYYY" />
                        ) : (
                          row.effective || "—"
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-icm-text-dim">
                        {isEditing ? (
                          <input value={row.expiration} onChange={(e) => updateEnrollment(row.id, { expiration: e.target.value })} className={cellInput} placeholder="MM/DD/YYYY" />
                        ) : (
                          row.expiration || "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {isEditing ? (
                          <button
                            onClick={() => { setEditingId(null); demoSuccess("Enrollment saved"); }}
                            className="h-7 px-2.5 rounded-lg bg-icm-text text-icm-panel text-[11px] font-geist font-semibold"
                          >
                            Save
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => setEditingId(row.id)}
                              className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-icm-border hover:bg-icm-bg text-icm-text-dim"
                              aria-label="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeEnrollment(row.id)}
                              className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-icm-border hover:bg-icm-red-soft text-icm-red"
                              aria-label="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {enrollments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-icm-text-dim text-[12px]">
                      No state enrollments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <button
          onClick={addEnrollment}
          className="mt-2 h-8 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-semibold text-icm-text inline-flex items-center gap-1.5 hover:bg-icm-bg"
        >
          <Plus className="w-3.5 h-3.5" /> Add State Enrollment
        </button>

        {/* Clearinghouse */}
        <SubHeading className="mt-5">Clearinghouse & submission</SubHeading>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Submitter ID" placeholder="e.g. SUB123456" />
          <Field label="ISA Sender ID" placeholder="e.g. 1234567890" />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Select label="Submission format" options={["837P", "837I", "Both"]} defaultValue="837P" />
          <Field label="Default payer ID routing" placeholder="e.g. SKMD0" />
        </div>
      </Panel>
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
