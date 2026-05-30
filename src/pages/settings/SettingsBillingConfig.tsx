import React, { useState, useEffect, useMemo } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, AlertTriangle, ChevronDown, ChevronRight, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "providerSetup" | "general" | "payers" | "funding" | "rates" | "iddbilling";

const TABS: { key: TabKey; label: string }[] = [
  { key: "providerSetup", label: "Provider Setup" },
  { key: "general", label: "General" },
  { key: "payers", label: "Payers" },
  { key: "funding", label: "Funding Streams" },
  { key: "rates", label: "Rate Schedules" },
  { key: "iddbilling", label: "IDD Billing.AI" },
];

interface BillingConfig {
  npi: string;
  taxId: string;
  medicaidProviderId: string;
  billingContactName: string;
  billingContactPhone: string;
  billingContactEmail: string;
  payToSameAsOrg: boolean;
  payToStreet: string;
  payToCity: string;
  payToState: string;
  payToZip: string;
  submitterId: string;
  isaSenderId: string;
  submissionFormat: string;
  defaultPayerRouting: string;
}

const DEFAULT_BILLING: BillingConfig = {
  npi: "",
  taxId: "",
  medicaidProviderId: "",
  billingContactName: "",
  billingContactPhone: "",
  billingContactEmail: "",
  payToSameAsOrg: true,
  payToStreet: "",
  payToCity: "",
  payToState: "",
  payToZip: "",
  submitterId: "",
  isaSenderId: "",
  submissionFormat: "837P",
  defaultPayerRouting: "",
};

interface StateEnrollment {
  id: string;
  state: string;
  providerId: string;
  status: "Active" | "Pending" | "Expired";
  effective: string;
  expiration: string;
}

interface Payer {
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
  notes: string;
}

const SettingsBillingConfig = () => {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const [tab, setTab] = useState<TabKey>("providerSetup");
  const [billing, setBilling] = useState<BillingConfig>(DEFAULT_BILLING);
  const [enrollments, setEnrollments] = useState<StateEnrollment[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load from Firestore
  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    getDoc(doc(db, "organizations", orgId))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const bc = d.billing ?? {};
          setBilling({
            npi: bc.npi ?? "",
            taxId: bc.taxId ?? "",
            medicaidProviderId: bc.medicaidProviderId ?? "",
            billingContactName: bc.billingContactName ?? "",
            billingContactPhone: bc.billingContactPhone ?? "",
            billingContactEmail: bc.billingContactEmail ?? "",
            payToSameAsOrg: bc.payToSameAsOrg ?? true,
            payToStreet: bc.payToStreet ?? "",
            payToCity: bc.payToCity ?? "",
            payToState: bc.payToState ?? "",
            payToZip: bc.payToZip ?? "",
            submitterId: bc.submitterId ?? "",
            isaSenderId: bc.isaSenderId ?? "",
            submissionFormat: bc.submissionFormat ?? "837P",
            defaultPayerRouting: bc.defaultPayerRouting ?? "",
          });
          setEnrollments(d.stateEnrollments ?? []);
          setPayers(d.payers ?? []);
        }
      })
      .catch((err) => {
        console.error("Failed to load billing config:", err);
        toast.error("Failed to load billing configuration");
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  const set = (key: keyof BillingConfig, value: string | boolean) =>
    setBilling((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "organizations", orgId), {
        billing,
        stateEnrollments: enrollments,
        payers,
        updatedAt: new Date(),
      });
      toast.success("Billing configuration saved", {
        description: "All billing settings updated.",
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save billing configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsLayout
      title="Billing Configuration"
      subtitle="Configure provider enrollment, billing rules, payers, and rate schedules."
      actions={
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-3 rounded-xl bg-teal-600 text-white text-[12px] font-geist font-semibold hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save configuration
        </button>
      }
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

      {loading ? (
        <BillingSkeleton />
      ) : (
        <>
          {tab === "providerSetup" && (
            <ProviderSetupTab
              billing={billing}
              set={set}
              enrollments={enrollments}
              setEnrollments={setEnrollments}
            />
          )}
          {tab === "general" && <GeneralTab />}
          {tab === "payers" && <PayersTab payers={payers} setPayers={setPayers} />}
          {tab === "funding" && <FundingTab />}
          {tab === "rates" && <RatesTab />}
          {tab === "iddbilling" && <IddBillingTab orgId={orgId ?? ""} />}
        </>
      )}

      {/* Supervisor Approval Requirements — always visible at bottom */}
      <div className="mt-4">
        <ApprovalRequirementsSection orgId={orgId ?? ""} />
      </div>
    </SettingsLayout>
  );
};

function BillingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[140, 200, 160].map((h, i) => (
        <div key={i} className="rounded-xl border border-icm-border bg-icm-panel p-4" style={{ height: h }} />
      ))}
    </div>
  );
}

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

function ProviderSetupTab({
  billing,
  set,
  enrollments,
  setEnrollments,
}: {
  billing: BillingConfig;
  set: (k: keyof BillingConfig, v: string | boolean) => void;
  enrollments: StateEnrollment[];
  setEnrollments: React.Dispatch<React.SetStateAction<StateEnrollment[]>>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

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
    toast.success("State enrollment removed");
  };

  return (
    <div className="space-y-3 max-w-[1100px]">
      {/* Provider Identity */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <p className="font-manrope font-bold text-[14px] text-icm-text mb-1">Provider Identity</p>
        <p className="text-[11.5px] font-geist text-icm-text-dim mb-3">
          Identifiers that appear on every claim your organization submits.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PField
            label="Organization NPI (Type 2)"
            placeholder="Enter 10-digit NPI"
            value={billing.npi}
            onChange={(v) => set("npi", v)}
            helper="Your organization's 10-digit NPI for billing purposes."
          />
          <PField
            label="Tax ID / EIN"
            placeholder="XX-XXXXXXX"
            value={billing.taxId}
            onChange={(v) => set("taxId", v)}
            helper="Federal Employer Identification Number as it appears on claims."
          />
          <PField
            label="Medicaid Provider Number"
            placeholder="MD-PROV-1234"
            value={billing.medicaidProviderId}
            onChange={(v) => set("medicaidProviderId", v)}
            helper="Your primary state Medicaid provider ID."
          />
        </div>
      </div>

      {/* Billing Contact */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <p className="font-manrope font-bold text-[14px] text-icm-text mb-1">Billing Contact & Address</p>
        <p className="text-[11.5px] font-geist text-icm-text-dim mb-3">
          Where payers and clearinghouses send remittances and billing inquiries.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PField
            label="Billing Contact Name"
            placeholder="Full Name"
            value={billing.billingContactName}
            onChange={(v) => set("billingContactName", v)}
          />
          <PField
            label="Billing Contact Phone"
            placeholder="(555) 555-5555"
            value={billing.billingContactPhone}
            onChange={(v) => set("billingContactPhone", v)}
          />
          <PField
            label="Billing Contact Email"
            placeholder="billing@example.com"
            value={billing.billingContactEmail}
            onChange={(v) => set("billingContactEmail", v)}
          />
        </div>

        <div className="mt-4">
          <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">Pay-to Address</p>
          <label className="flex items-center gap-2 text-[12px] font-geist text-icm-text mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={billing.payToSameAsOrg}
              onChange={(e) => set("payToSameAsOrg", e.target.checked)}
              className="accent-icm-accent"
            />
            Same as organization address
          </label>
          {!billing.payToSameAsOrg && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <PField label="Street" placeholder="100 Main Street" value={billing.payToStreet} onChange={(v) => set("payToStreet", v)} />
                <PField label="City" placeholder="Westminster" value={billing.payToCity} onChange={(v) => set("payToCity", v)} />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <PField label="State" placeholder="MD" value={billing.payToState} onChange={(v) => set("payToState", v)} />
                <PField label="ZIP" placeholder="21157" value={billing.payToZip} onChange={(v) => set("payToZip", v)} />
                <div />
              </div>
            </>
          )}
        </div>
      </div>

      {/* State Enrollments */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <p className="font-manrope font-bold text-[14px] text-icm-text mb-1">Medicaid Provider Enrollment by State</p>
        <p className="text-[11.5px] font-geist text-icm-text-dim mb-3">
          Each state where you bill Medicaid requires a separate provider enrollment.
        </p>

        {expiringSoon.length > 0 && (
          <div className="mb-3 rounded-xl border border-icm-amber/20 bg-icm-amber-soft px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-icm-amber shrink-0 mt-0.5" />
            <p className="text-[12px] font-geist text-icm-text leading-snug">
              <span className="font-semibold">{expiringSoon.length} state enrollment{expiringSoon.length > 1 ? "s" : ""} expiring soon</span>
              {" — "}
              {expiringSoon.map((x, i) => (
                <span key={x.e.id}>{i > 0 ? "; " : ""}{x.e.state} expires in {x.days} days</span>
              ))}
              . Renew before expiration to avoid claim rejections.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-icm-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] font-geist">
              <thead className="bg-icm-bg/60">
                <tr>
                  {["State", "Medicaid Provider ID", "Status", "Effective", "Expiration", ""].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint whitespace-nowrap">{h}</th>
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
                            onClick={() => setEditingId(null)}
                            className="h-7 px-2.5 rounded-lg bg-icm-text text-icm-panel text-[11px] font-geist font-semibold"
                          >
                            Done
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => setEditingId(row.id)}
                              className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-icm-border hover:bg-icm-bg text-icm-text-dim"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeEnrollment(row.id)}
                              className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-icm-border hover:bg-icm-red-soft text-icm-red"
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

      {/* Clearinghouse */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <p className="font-manrope font-bold text-[14px] text-icm-text mb-1">Clearinghouse & Submission</p>
        <p className="text-[11.5px] font-geist text-icm-text-dim mb-3">
          EDI identifiers and routing used when claims are transmitted to payers.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PField label="Submitter ID" placeholder="e.g. SUB123456" value={billing.submitterId} onChange={(v) => set("submitterId", v)} />
          <PField label="ISA Sender ID" placeholder="e.g. 1234567890" value={billing.isaSenderId} onChange={(v) => set("isaSenderId", v)} />
          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">Submission Format</label>
            <select
              value={billing.submissionFormat}
              onChange={(e) => set("submissionFormat", e.target.value)}
              className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
            >
              {["837P", "837I", "Both"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <PField label="Default Payer ID Routing" placeholder="e.g. SKMD0" value={billing.defaultPayerRouting} onChange={(v) => set("defaultPayerRouting", v)} />
        </div>
      </div>
    </div>
  );
}

function PField({
  label,
  placeholder,
  helper,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  helper?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
  const [supervisorApproval, setSupervisorApproval] = useState(false);
  const [autoCalcUnits, setAutoCalcUnits] = useState(true);

  return (
    <>
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-manrope font-bold text-[14px] text-icm-text">Supervisor approval</p>
            <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">
              Require supervisor approval before billing submission.
            </p>
          </div>
          <Toggle on={supervisorApproval} onChange={setSupervisorApproval} />
        </div>
      </div>

      <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
        <p className="font-manrope font-bold text-[14px] text-icm-text">Billing rules</p>
        <div className="grid grid-cols-3 gap-3">
          <SelectFieldSimple label="Default billing unit" options={["15 minutes", "30 minutes", "1 hour"]} defaultValue="15 minutes" />
          <SelectFieldSimple label="Rounding rule" options={["Round up", "Round down", "Round nearest"]} defaultValue="Round nearest" />
          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">Auto-calc units from time</label>
            <div className="mt-2"><Toggle on={autoCalcUnits} onChange={setAutoCalcUnits} /></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-manrope font-bold text-[14px] text-icm-text">Service codes</p>
          <button
            onClick={() => toast("Add service code")}
            className="h-8 px-2.5 rounded-lg bg-teal-600 text-white text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:bg-teal-700"
          >
            <Plus className="w-3.5 h-3.5" />Add code
          </button>
        </div>
        <div className="rounded-xl border border-icm-border overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
              <tr>
                {["Code", "Description", "Rate", "Unit", "Program", "Active"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold">{h}</th>
                ))}
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
                  <td className="px-3 py-2"><Toggle on defaultOn /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function PayersTab({
  payers,
  setPayers,
}: {
  payers: Payer[];
  setPayers: React.Dispatch<React.SetStateAction<Payer[]>>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const INITIAL_PAYERS_DEMO: Payer[] = [
    { id: "p1", name: "Indiana Health Coverage Programs (IHCP)", payerId: "00120", type: "State Medicaid", state: "Indiana", deadline: "365 days", status: "Active", electronicId: "INMCD", claimFormat: "837P", remitFormat: "835", routing: "IDD Billing.AI", npiType: "Type 2", notes: "Primary Medicaid payer for Indiana." },
    { id: "p2", name: "Anthem Indiana", payerId: "00090", type: "MCO", state: "Indiana", deadline: "180 days", status: "Active", electronicId: "ANTHEM-IN", claimFormat: "837P", remitFormat: "835", routing: "IDD Billing.AI", npiType: "Type 2", notes: "" },
  ];

  const displayPayers = payers.length > 0 ? payers : INITIAL_PAYERS_DEMO;

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-manrope font-bold text-[14px] text-icm-text">Payers</p>
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">
            Configure each payer your organization bills.
          </p>
        </div>
        <button
          onClick={() => toast("Add payer")}
          className="h-8 px-2.5 rounded-lg bg-teal-600 text-white text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:bg-teal-700"
        >
          <Plus className="w-3.5 h-3.5" />Add Payer
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
            {displayPayers.map((p) => {
              const isOpen = expanded === p.id;
              return (
                <React.Fragment key={p.id}>
                  <tr
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
                    <td className="px-3 py-2"><StatusPill label={p.status} tone={p.status === "Active" ? "green" : "dim"} /></td>
                    <td className="px-3 py-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); toast("Edit payer"); }}
                        className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t border-icm-border bg-icm-bg/30">
                      <td></td>
                      <td colSpan={7} className="px-3 py-3">
                        <div className="grid grid-cols-3 gap-3">
                          <KV label="Electronic Payer ID" value={p.electronicId} />
                          <KV label="Claim format" value={p.claimFormat} />
                          <KV label="Remittance format" value={p.remitFormat} />
                          <KV label="Clearinghouse routing" value={p.routing} />
                          <KV label="Required NPI type" value={p.npiType} />
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

function FundingTab() {
  const rows = [
    { name: "Indiana HCBS — CIH Waiver", program: "Community Integration and Habilitation", payer: "IHCP", codes: "T2022, T2023", unit: "15 min", state: "Indiana" },
    { name: "NJ DDD Community Care", program: "DDD Community Care Waiver", payer: "NJ DDD", codes: "T1016, T2022", unit: "15 min", state: "New Jersey" },
  ];

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-manrope font-bold text-[14px] text-icm-text">Funding Streams</p>
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">Define which service codes are valid under which programs and payers.</p>
        </div>
        <button onClick={() => toast("Add funding stream")} className="h-8 px-2.5 rounded-lg bg-teal-600 text-white text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:bg-teal-700">
          <Plus className="w-3.5 h-3.5" />Add Funding Stream
        </button>
      </div>
      <div className="rounded-xl border border-icm-border overflow-hidden">
        <table className="w-full text-[12px] font-geist">
          <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
            <tr>
              {["Stream Name", "Program", "Payer", "Valid Service Codes", "Billing Unit", "State", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold">{h}</th>
              ))}
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
                  <button onClick={() => toast("Edit funding stream")} className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RatesTab() {
  const rows = [
    { code: "T2022", desc: "Case management", payer: "IHCP", rate: "$28.50", unit: "15 min", eff: "01/01/2024", end: "—" },
    { code: "T2023", desc: "Targeted case management", payer: "IHCP", rate: "$30.00", unit: "15 min", eff: "01/01/2024", end: "—" },
    { code: "T1019", desc: "Personal care", payer: "IHCP", rate: "$5.25", unit: "15 min", eff: "01/01/2024", end: "—" },
  ];

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-manrope font-bold text-[14px] text-icm-text">Rate Schedules</p>
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">Effective-dated rates per service code per payer.</p>
        </div>
        <button onClick={() => toast("Add rate")} className="h-8 px-2.5 rounded-lg bg-teal-600 text-white text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:bg-teal-700">
          <Plus className="w-3.5 h-3.5" />Add Rate
        </button>
      </div>
      <div className="rounded-xl border border-icm-border overflow-hidden">
        <table className="w-full text-[12px] font-geist">
          <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
            <tr>
              {["Service Code", "Description", "Payer", "Rate", "Unit", "Effective Date", "End Date", "Status"].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold">{h}</th>
              ))}
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

/* Shared */

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
    return <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">{label}</span>;
  }
  return <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-bg text-icm-text-dim ring-1 ring-icm-border">{label}</span>;
}

function SelectFieldSimple({ label, options, defaultValue }: { label: string; options: string[]; defaultValue?: string }) {
  return (
    <div>
      <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">{label}</label>
      <select defaultValue={defaultValue} className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Toggle({ on, onChange, defaultOn }: { on?: boolean; onChange?: (v: boolean) => void; defaultOn?: boolean }) {
  const [localOn, setLocalOn] = useState(defaultOn ?? false);
  const isOn = on !== undefined ? on : localOn;
  const handleClick = () => {
    if (onChange) onChange(!isOn);
    else setLocalOn(!localOn);
  };
  return (
    <button
      onClick={handleClick}
      className={cn("relative inline-block w-9 h-5 rounded-full transition-colors", isOn ? "bg-icm-accent" : "bg-icm-border")}
    >
      <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform", isOn && "translate-x-4")} />
    </button>
  );
}

export default SettingsBillingConfig;

// ── Approval Requirements Section ─────────────────────────────────────────────

interface ApprovalConfig {
  requireProgressNotes: boolean;
  requireContactNotes: boolean;
  requireVisitSummaries: boolean;
  requireMonitoringForms: boolean;
  overdueThresholdHours: number;
}

const DEFAULT_APPROVAL: ApprovalConfig = {
  requireProgressNotes: true,
  requireContactNotes: true,
  requireVisitSummaries: true,
  requireMonitoringForms: true,
  overdueThresholdHours: 48,
};

function ApprovalRequirementsSection({ orgId }: { orgId: string }) {
  const [config, setConfig] = React.useState<ApprovalConfig>(DEFAULT_APPROVAL);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!orgId) return;
    getDoc(doc(db, "org_approval_config", orgId))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setConfig({
            requireProgressNotes: d.requireProgressNotes ?? true,
            requireContactNotes: d.requireContactNotes ?? true,
            requireVisitSummaries: d.requireVisitSummaries ?? true,
            requireMonitoringForms: d.requireMonitoringForms ?? true,
            overdueThresholdHours: d.overdueThresholdHours ?? 48,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "org_approval_config", orgId), {
        ...config,
        updatedAt: new Date(),
      });
      toast.success("Approval requirements saved");
    } catch {
      toast.error("Failed to save approval requirements");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-4 max-w-[1100px]">
      <div>
        <p className="font-manrope font-bold text-[14px] text-icm-text">
          Supervisor Approval Requirements
        </p>
        <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
          Configure which note types require supervisor approval before becoming billing-ready.
          Case managers who submit notes will enter "Pending Review" status until a supervisor approves.
        </p>
      </div>

      <div className="space-y-3">
        {[
          { key: "requireProgressNotes" as const, label: "Progress Notes", desc: "Case manager progress notes require supervisor approval" },
          { key: "requireContactNotes" as const, label: "Contact Notes", desc: "Contact notes require supervisor approval" },
          { key: "requireVisitSummaries" as const, label: "Visit Summaries", desc: "Visit summaries require supervisor approval" },
          { key: "requireMonitoringForms" as const, label: "Monitoring Forms", desc: "Monitoring forms require supervisor approval" },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-geist font-medium text-icm-text">{label}</p>
              <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">{desc}</p>
            </div>
            <Toggle on={config[key]} onChange={(v) => setConfig((prev) => ({ ...prev, [key]: v }))} />
          </div>
        ))}
      </div>

      <div className="h-px bg-icm-border" />

      <div className="flex items-center gap-3">
        <div>
          <p className="text-[13px] font-geist font-medium text-icm-text">Overdue review threshold</p>
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
            Notes pending review longer than this are flagged as overdue in the supervisor queue.
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <input
            type="number"
            min={1}
            max={720}
            value={config.overdueThresholdHours}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                overdueThresholdHours: Math.max(1, Number(e.target.value)),
              }))
            }
            className="w-20 h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text text-center focus:outline-none focus:border-icm-border-strong"
          />
          <span className="text-[12px] font-geist text-icm-text-dim">hours</span>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Save approval settings
      </button>
    </div>
  );
}

// ── IDD Billing.AI Tab ───────────────────────────────────────────────────────────────────────────────

function IddBillingTab({ orgId }: { orgId: string }) {
  const [apiKey, setApiKey] = useState("");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState("https://api.iddbilling.ai/v1");
  const [placeOfService, setPlaceOfService] = useState("11");
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [autoScrub, setAutoScrub] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!orgId) return;
    getDoc(doc(db, "organizations", orgId)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        const idd = d.iddBilling ?? {};
        setApiKey(idd.apiKey ?? "");
        setApiEndpoint(idd.apiEndpoint ?? "https://api.iddbilling.ai/v1");
        setPlaceOfService(idd.placeOfService ?? "11");
        setAutoSubmit(idd.autoSubmit ?? false);
        setAutoScrub(idd.autoScrub ?? true);
      }
    }).finally(() => setLoading(false));
  }, [orgId]);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "organizations", orgId), {
        iddBillingApiKey: apiKey,
        "billing.iddBillingApiKey": apiKey,
        iddBilling: { apiKey, apiEndpoint, placeOfService, autoSubmit, autoScrub },
        updatedAt: new Date(),
      });
      toast.success("IDD Billing.AI configuration saved");
    } catch {
      toast.error("Failed to save IDD Billing.AI configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey) { toast.error("Enter an API key first."); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(`${apiEndpoint}/ping`, {
        headers: { "Authorization": `Bearer ${apiKey}`, "X-Source": "CaseManagement.AI" },
      });
      if (response.ok) {
        setTestResult({ success: true, message: "Connected to IDD Billing.AI successfully" });
        toast.success("Connection successful");
      } else {
        setTestResult({ success: false, message: `HTTP ${response.status}: ${response.statusText}` });
      }
    } catch {
      setTestResult({ success: false, message: "Cannot reach IDD Billing.AI. Check API key and network." });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <BillingSkeleton />;

  return (
    <div className="space-y-3 max-w-[1100px]">
      {/* Connection */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <p className="font-manrope font-bold text-[14px] text-icm-text mb-1">IDD Billing.AI Connection</p>
        <p className="text-[11.5px] font-geist text-icm-text-dim mb-3">
          Connect to IDD Billing.AI to auto-submit 837P claims and receive 835 remittances.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">API Key</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type={apiKeyVisible ? "text" : "password"}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Enter your IDD Billing.AI API key"
                className="flex-1 h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-mono text-icm-text focus:outline-none focus:border-icm-border-strong"
              />
              <button
                onClick={() => setApiKeyVisible(v => !v)}
                className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-geist text-icm-text-dim hover:bg-icm-bg"
              >
                {apiKeyVisible ? "Hide" : "Reveal"}
              </button>
              <button
                onClick={handleTestConnection}
                disabled={testing || !apiKey}
                className="h-9 px-3 rounded-xl border border-teal-600 text-[12px] font-geist font-semibold text-teal-600 hover:bg-teal-50 disabled:opacity-40 inline-flex items-center gap-1.5"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {testing ? "Testing…" : "Test Connection"}
              </button>
            </div>
            {testResult && (
              <p className={`mt-1.5 text-[11.5px] font-geist font-medium ${testResult.success ? "text-icm-green" : "text-icm-red"}`}>
                {testResult.success ? "✓" : "✗"} {testResult.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">API Endpoint URL</label>
              <input
                value={apiEndpoint}
                onChange={e => setApiEndpoint(e.target.value)}
                className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-mono text-icm-text focus:outline-none focus:border-icm-border-strong"
              />
            </div>
            <div>
              <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">Default Place of Service</label>
              <select
                value={placeOfService}
                onChange={e => setPlaceOfService(e.target.value)}
                className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
              >
                {[
                  { code: "11", label: "11 — Office" },
                  { code: "12", label: "12 — Home" },
                  { code: "21", label: "21 — Inpatient Hospital" },
                  { code: "99", label: "99 — Other" },
                ].map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Automation */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
        <p className="font-manrope font-bold text-[14px] text-icm-text mb-1">Automation Settings</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-geist font-medium text-icm-text">Auto-scrub on note completion</p>
            <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">Automatically run AI billing validation when a note is signed.</p>
          </div>
          <Toggle on={autoScrub} onChange={setAutoScrub} />
        </div>
        <div className="h-px bg-icm-border" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-geist font-medium text-icm-text">Auto-submit to IDD Billing.AI</p>
            <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">Automatically submit claims that pass scrub to IDD Billing.AI (no manual review).</p>
          </div>
          <Toggle on={autoSubmit} onChange={setAutoSubmit} />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="h-9 px-3 rounded-xl bg-teal-600 text-white text-[12px] font-geist font-semibold hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-1.5"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Save IDD Billing.AI settings
      </button>
    </div>
  );
}
