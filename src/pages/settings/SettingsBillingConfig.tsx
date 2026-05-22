import React, { useMemo, useState } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Plus, Pencil, Trash2, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { demoToast, demoSuccess } from "@/lib/demoToast";

type TabKey = "providerSetup" | "general" | "payers" | "funding" | "rates";

const TABS: { key: TabKey; label: string }[] = [
  { key: "providerSetup", label: "Provider Setup" },
  { key: "general", label: "General" },
  { key: "payers", label: "Payers" },
  { key: "funding", label: "Funding Streams" },
  { key: "rates", label: "Rate Schedules" },
];

const SettingsBillingConfig = () => {
  const [tab, setTab] = useState<TabKey>("providerSetup");

  return (
    <SettingsLayout
      title="Billing Configuration"
      subtitle="Configure provider enrollment, billing rules, payers, and rate schedules."
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-icm-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-3 py-2 text-[12px] font-geist font-semibold -mb-px border-b-2 transition-colors",
              tab === t.key
                ? "border-icm-accent text-icm-text"
                : "border-transparent text-icm-text-dim hover:text-icm-text"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "providerSetup" && <ProviderSetupTab />}
      {tab === "general" && <GeneralTab />}
      {tab === "payers" && <PayersTab />}
      {tab === "funding" && <FundingTab />}
      {tab === "rates" && <RatesTab />}
    </SettingsLayout>
  );
};

/* ---------------- PROVIDER SETUP ---------------- */

interface StateEnrollment {
  id: string;
  state: string;
  providerId: string;
  status: "Active" | "Pending" | "Expired";
  effective: string;
  expiration: string;
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

function ProviderSetupTab() {
  const [enrollments, setEnrollments] = useState<StateEnrollment[]>(INITIAL_ENROLLMENTS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sameAsOrg, setSameAsOrg] = useState(true);

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
    <div className="space-y-3 max-w-[1100px]">
      {/* Section 1: Provider Identity */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <p className="font-manrope font-bold text-[14px] text-icm-text mb-1">Provider Identity</p>
        <p className="text-[11.5px] font-geist text-icm-text-dim mb-3">
          Identifiers that appear on every claim your organization submits.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PField
            label="Organization NPI (Type 2)"
            placeholder="Enter 10-digit NPI"
            helper="Your organization's 10-digit NPI for billing purposes."
          />
          <PField
            label="Tax ID / EIN"
            placeholder="XX-XXXXXXX"
            helper="Federal Employer Identification Number as it appears on claims."
          />
          <PField
            label="Medicaid Provider Number"
            placeholder="MD-PROV-1234"
            helper="Your primary state Medicaid provider ID."
          />
        </div>
      </div>

      {/* Section 2: Billing Contact & Address */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <p className="font-manrope font-bold text-[14px] text-icm-text mb-1">Billing Contact & Address</p>
        <p className="text-[11.5px] font-geist text-icm-text-dim mb-3">
          Where payers and clearinghouses send remittances and billing inquiries.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PField label="Billing Contact Name" placeholder="Babar Nawaz" />
          <PField label="Billing Contact Phone" placeholder="(555) 555-5555" />
          <PField label="Billing Contact Email" placeholder="billing@example.com" />
        </div>

        <div className="mt-4">
          <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">Pay-to Address</p>
          <label className="flex items-center gap-2 text-[12px] font-geist text-icm-text mb-2">
            <input
              type="checkbox"
              checked={sameAsOrg}
              onChange={(e) => setSameAsOrg(e.target.checked)}
              className="accent-icm-accent"
            />
            Same as organization address
          </label>
          {!sameAsOrg && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <PField label="Street" placeholder="100 Main Street" />
                <PField label="City" placeholder="Westminster" />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <PField label="State" placeholder="MD" />
                <PField label="ZIP" placeholder="21157" />
                <div />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section 3: Medicaid Provider Enrollment by State */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <p className="font-manrope font-bold text-[14px] text-icm-text mb-1">Medicaid Provider Enrollment by State</p>
        <p className="text-[11.5px] font-geist text-icm-text-dim mb-3">
          Each state where you bill Medicaid requires a separate provider enrollment. Add one row per state.
        </p>

        {expiringSoon.length > 0 && (
          <div className="mb-3 rounded-xl border border-icm-amber/20 bg-icm-amber-soft px-3 py-2 flex items-start gap-2">
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
                          <EnrollmentStatusBadge status={row.status} />
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
          className="mt-2 h-8 px-3 rounded-xl bg-teal-600 text-white text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:bg-teal-700"
        >
          <Plus className="w-3.5 h-3.5" /> Add State Enrollment
        </button>
      </div>

      {/* Section 4: Clearinghouse & Submission */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <p className="font-manrope font-bold text-[14px] text-icm-text mb-1">Clearinghouse & Submission</p>
        <p className="text-[11.5px] font-geist text-icm-text-dim mb-3">
          EDI identifiers and routing used when claims are transmitted to payers.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PField label="Submitter ID" placeholder="e.g. SUB123456" />
          <PField label="ISA Sender ID" placeholder="e.g. 1234567890" />
          <SelectField label="Submission Format" options={["837P", "837I", "Both"]} defaultValue="837P" />
          <PField label="Default Payer ID Routing" placeholder="e.g. SKMD0" />
        </div>
      </div>
    </div>
  );
}

function PField({ label, placeholder, helper, defaultValue }: { label: string; placeholder?: string; helper?: string; defaultValue?: string }) {
  return (
    <div>
      <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">{label}</label>
      <input
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
      />
      {helper && <p className="mt-1 text-[10.5px] text-icm-text-faint font-geist">{helper}</p>}
    </div>
  );
}

const cellInput =
  "w-full h-7 px-2 rounded-md border border-icm-border bg-icm-panel text-[11.5px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong";

function EnrollmentStatusBadge({ status }: { status: StateEnrollment["status"] }) {
  const map = {
    Active: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    Pending: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    Expired: "bg-icm-red-soft text-icm-red ring-icm-red/20",
  } as const;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${map[status]}`}>
      {status}
    </span>
  );
}


function GeneralTab() {
  return (
    <>
      {/* Supervisor approval */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-manrope font-bold text-[14px] text-icm-text">Supervisor approval</p>
            <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">
              Require supervisor approval before billing submission.
            </p>
          </div>
          <Toggle />
        </div>
      </div>

      {/* Billing rules */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
        <p className="font-manrope font-bold text-[14px] text-icm-text">Billing rules</p>
        <div className="grid grid-cols-3 gap-3">
          <SelectField
            label="Default billing unit"
            options={["15 minutes", "30 minutes", "1 hour"]}
            defaultValue="15 minutes"
          />
          <SelectField
            label="Rounding rule"
            options={["Round up", "Round down", "Round nearest"]}
            defaultValue="Round nearest"
          />
          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              Auto-calc units from time
            </label>
            <div className="mt-2">
              <Toggle defaultOn />
            </div>
          </div>
        </div>
      </div>

      {/* Service codes */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-manrope font-bold text-[14px] text-icm-text">Service codes</p>
          <button
            onClick={() => demoToast("Add service code")}
            className="h-8 px-2.5 rounded-lg bg-teal-600 text-white text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:bg-teal-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Add code
          </button>
        </div>
        <div className="rounded-xl border border-icm-border overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Code</th>
                <th className="text-left px-3 py-2 font-semibold">Description</th>
                <th className="text-left px-3 py-2 font-semibold">Rate</th>
                <th className="text-left px-3 py-2 font-semibold">Unit</th>
                <th className="text-left px-3 py-2 font-semibold">Program</th>
                <th className="text-left px-3 py-2 font-semibold">Active</th>
              </tr>
            </thead>
            <tbody>
              {[
                { code: "T2022", desc: "Case management", rate: "$28.50", unit: "15 min", prog: "Carroll County CCS" },
                { code: "T2023", desc: "Targeted case management", rate: "$30.00", unit: "15 min", prog: "Carroll County CCS" },
                { code: "T1019", desc: "Personal care services", rate: "$5.25", unit: "15 min", prog: "Dallas County CCS" },
              ].map((r) => (
                <tr key={r.code} className="border-t border-icm-border">
                  <td className="px-3 py-2 text-icm-text font-mono font-semibold">{r.code}</td>
                  <td className="px-3 py-2 text-icm-text">{r.desc}</td>
                  <td className="px-3 py-2 text-icm-text-dim font-mono">{r.rate}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{r.unit}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{r.prog}</td>
                  <td className="px-3 py-2">
                    <Toggle defaultOn />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clearinghouse */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
        <p className="font-manrope font-bold text-[14px] text-icm-text">Clearinghouse</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              Connected clearinghouse
            </label>
            <p className="mt-1 text-[12px] font-geist text-icm-text">
              IDD Billing.AI{" "}
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20 ml-1">
                Connected
              </span>
            </p>
          </div>
          <SelectField
            label="Submission frequency"
            options={["Real-time", "Daily", "Weekly", "Manual"]}
            defaultValue="Daily"
          />
        </div>
      </div>
    </>
  );
}

/* ---------------- PAYERS ---------------- */

type Payer = {
  id: string;
  name: string;
  payerId: string;
  type: string;
  state: string;
  deadline: string;
  status: "Active" | "Inactive";
  electronicId: string;
  claimFormat: string;
  remitFormat: string;
  routing: string;
  npiType: string;
  copay: boolean;
  notes: string;
};

const INITIAL_PAYERS: Payer[] = [
  { id: "p1", name: "Indiana Health Coverage Programs (IHCP)", payerId: "00120", type: "State Medicaid", state: "Indiana", deadline: "365 days", status: "Active", electronicId: "INMCD", claimFormat: "837P", remitFormat: "835", routing: "IDD Billing.AI", npiType: "Type 2", copay: false, notes: "Primary Medicaid payer for Indiana." },
  { id: "p2", name: "Anthem Indiana", payerId: "00090", type: "MCO", state: "Indiana", deadline: "180 days", status: "Active", electronicId: "ANTHEM-IN", claimFormat: "837P", remitFormat: "835", routing: "IDD Billing.AI", npiType: "Type 2", copay: false, notes: "" },
  { id: "p3", name: "Managed Health Services", payerId: "00115", type: "MCO", state: "Indiana", deadline: "180 days", status: "Active", electronicId: "MHS-IN", claimFormat: "837P", remitFormat: "835", routing: "IDD Billing.AI", npiType: "Type 2", copay: false, notes: "" },
  { id: "p4", name: "MDwise", payerId: "00116", type: "MCO", state: "Indiana", deadline: "180 days", status: "Active", electronicId: "MDWISE", claimFormat: "837P", remitFormat: "835", routing: "IDD Billing.AI", npiType: "Type 2", copay: false, notes: "" },
  { id: "p5", name: "New Jersey DDD", payerId: "00201", type: "State Medicaid", state: "New Jersey", deadline: "365 days", status: "Active", electronicId: "NJDDD", claimFormat: "837P", remitFormat: "835", routing: "IDD Billing.AI", npiType: "Type 2", copay: false, notes: "" },
];

function PayersTab() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-manrope font-bold text-[14px] text-icm-text">Payers</p>
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">
            Configure each payer your organization bills. Each payer's rules apply automatically when claims are generated.
          </p>
        </div>
        <button
          onClick={() => demoToast("Add payer")}
          className="h-8 px-2.5 rounded-lg bg-teal-600 text-white text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:bg-teal-700"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Payer
        </button>
      </div>

      <div className="rounded-xl border border-icm-border overflow-hidden">
        <table className="w-full text-[12px] font-geist">
          <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2 font-semibold w-6"></th>
              <th className="text-left px-3 py-2 font-semibold">Payer Name</th>
              <th className="text-left px-3 py-2 font-semibold">Payer ID</th>
              <th className="text-left px-3 py-2 font-semibold">Type</th>
              <th className="text-left px-3 py-2 font-semibold">State</th>
              <th className="text-left px-3 py-2 font-semibold">Filing Deadline</th>
              <th className="text-left px-3 py-2 font-semibold">Status</th>
              <th className="text-left px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {INITIAL_PAYERS.map((p) => {
              const isOpen = expanded === p.id;
              return (
                <React.Fragment key={p.id}>

                  <tr
                    key={p.id}
                    className="border-t border-icm-border cursor-pointer hover:bg-icm-bg/40"
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                  >
                    <td className="px-3 py-2 text-icm-text-dim">
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </td>
                    <td className="px-3 py-2 text-icm-text font-semibold">{p.name}</td>
                    <td className="px-3 py-2 text-icm-text-dim font-mono">{p.payerId}</td>
                    <td className="px-3 py-2 text-icm-text-dim">{p.type}</td>
                    <td className="px-3 py-2 text-icm-text-dim">{p.state}</td>
                    <td className="px-3 py-2 text-icm-text-dim">{p.deadline}</td>
                    <td className="px-3 py-2">
                      <StatusPill label={p.status} tone={p.status === "Active" ? "green" : "dim"} />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); demoToast("Edit payer"); }}
                        className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={p.id + "-x"} className="border-t border-icm-border bg-icm-bg/30">
                      <td></td>
                      <td colSpan={7} className="px-3 py-3">
                        <div className="grid grid-cols-3 gap-3">
                          <KV label="Electronic Payer ID" value={p.electronicId} />
                          <KV label="Claim format" value={p.claimFormat} />
                          <KV label="Remittance format" value={p.remitFormat} />
                          <KV label="Clearinghouse routing" value={p.routing} />
                          <KV label="Required NPI type" value={p.npiType} />
                          <div>
                            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">Co-pay rules</label>
                            <div className="mt-2"><Toggle defaultOn={p.copay} /></div>
                          </div>
                          <div className="col-span-3">
                            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">Notes</label>
                            <textarea
                              defaultValue={p.notes}
                              rows={2}
                              className="mt-1 w-full px-2 py-1.5 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>

              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- FUNDING STREAMS ---------------- */

function FundingTab() {
  const rows = [
    { name: "Indiana HCBS — CIH Waiver", program: "Community Integration and Habilitation", payer: "IHCP", codes: "T2022, T2023", unit: "15 min", state: "Indiana" },
    { name: "Indiana HCBS — Family Supports", program: "Family Supports Waiver", payer: "IHCP", codes: "T2022", unit: "15 min", state: "Indiana" },
    { name: "Indiana Managed Care — Anthem", program: "HCBS", payer: "Anthem Indiana", codes: "T2022, T2023", unit: "15 min", state: "Indiana" },
    { name: "NJ DDD Community Care", program: "DDD Community Care Waiver", payer: "NJ DDD", codes: "T1016, T2022", unit: "15 min", state: "New Jersey" },
  ];

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-manrope font-bold text-[14px] text-icm-text">Funding Streams</p>
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">
            Define which service codes are valid under which programs and payers. These rules apply automatically when a case manager selects a service code on a note.
          </p>
        </div>
        <button
          onClick={() => demoToast("Add funding stream")}
          className="h-8 px-2.5 rounded-lg bg-teal-600 text-white text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:bg-teal-700"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Funding Stream
        </button>
      </div>

      <div className="rounded-xl border border-icm-border overflow-hidden">
        <table className="w-full text-[12px] font-geist">
          <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Stream Name</th>
              <th className="text-left px-3 py-2 font-semibold">Program</th>
              <th className="text-left px-3 py-2 font-semibold">Payer</th>
              <th className="text-left px-3 py-2 font-semibold">Valid Service Codes</th>
              <th className="text-left px-3 py-2 font-semibold">Billing Unit</th>
              <th className="text-left px-3 py-2 font-semibold">State</th>
              <th className="text-left px-3 py-2 font-semibold">Status</th>
              <th className="text-left px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-icm-border">
                <td className="px-3 py-2 text-icm-text font-semibold">{r.name}</td>
                <td className="px-3 py-2 text-icm-text-dim">{r.program}</td>
                <td className="px-3 py-2 text-icm-text-dim">{r.payer}</td>
                <td className="px-3 py-2 text-icm-text-dim font-mono">{r.codes}</td>
                <td className="px-3 py-2 text-icm-text-dim">{r.unit}</td>
                <td className="px-3 py-2 text-icm-text-dim">{r.state}</td>
                <td className="px-3 py-2"><StatusPill label="Active" tone="green" /></td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => demoToast("Edit funding stream")}
                    className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- RATE SCHEDULES ---------------- */

function RatesTab() {
  const rows = [
    { code: "T2022", desc: "Case management", payer: "IHCP", rate: "$28.50", unit: "15 min", eff: "01/01/2024", end: "—" },
    { code: "T2022", desc: "Case management", payer: "Anthem Indiana", rate: "$29.10", unit: "15 min", eff: "01/01/2024", end: "—" },
    { code: "T2022", desc: "Case management", payer: "MHS", rate: "$28.75", unit: "15 min", eff: "01/01/2024", end: "—" },
    { code: "T2023", desc: "Targeted case management", payer: "IHCP", rate: "$30.00", unit: "15 min", eff: "01/01/2024", end: "—" },
    { code: "T1019", desc: "Personal care", payer: "IHCP", rate: "$5.25", unit: "15 min", eff: "01/01/2024", end: "—" },
  ];

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-manrope font-bold text-[14px] text-icm-text">Rate Schedules</p>
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">
            Effective-dated rates per service code per payer. When rates change, add a new effective date — history is preserved.
          </p>
        </div>
        <button
          onClick={() => demoToast("Add rate")}
          className="h-8 px-2.5 rounded-lg bg-teal-600 text-white text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:bg-teal-700"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Rate
        </button>
      </div>

      <div className="rounded-xl border border-icm-border overflow-hidden">
        <table className="w-full text-[12px] font-geist">
          <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Service Code</th>
              <th className="text-left px-3 py-2 font-semibold">Description</th>
              <th className="text-left px-3 py-2 font-semibold">Payer</th>
              <th className="text-left px-3 py-2 font-semibold">Rate</th>
              <th className="text-left px-3 py-2 font-semibold">Unit</th>
              <th className="text-left px-3 py-2 font-semibold">Effective Date</th>
              <th className="text-left px-3 py-2 font-semibold">End Date</th>
              <th className="text-left px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-icm-border">
                <td className="px-3 py-2 text-icm-text font-mono font-semibold">{r.code}</td>
                <td className="px-3 py-2 text-icm-text">{r.desc}</td>
                <td className="px-3 py-2 text-icm-text-dim">{r.payer}</td>
                <td className="px-3 py-2 text-icm-text-dim font-mono">{r.rate}</td>
                <td className="px-3 py-2 text-icm-text-dim">{r.unit}</td>
                <td className="px-3 py-2 text-icm-text-dim">{r.eff}</td>
                <td className="px-3 py-2 text-icm-text-dim">{r.end}</td>
                <td className="px-3 py-2"><StatusPill label="Current" tone="green" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Shared ---------------- */

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">{label}</label>
      <p className="mt-1 text-[12px] font-geist text-icm-text">{value}</p>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "green" | "dim" }) {
  if (tone === "green") {
    return (
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
        {label}
      </span>
    );
  }
  return (
    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-bg text-icm-text-dim ring-1 ring-icm-border">
      {label}
    </span>
  );
}

function SelectField({
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

function Toggle({ defaultOn }: { defaultOn?: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-block w-9 h-5 rounded-full",
        defaultOn ? "bg-icm-accent" : "bg-icm-border"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
          defaultOn && "translate-x-4"
        )}
      />
    </span>
  );
}

export default SettingsBillingConfig;
