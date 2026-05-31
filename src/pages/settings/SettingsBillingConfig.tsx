import React, { useState, useEffect, useMemo, useRef } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { doc, getDoc, updateDoc, collection, addDoc, deleteDoc, onSnapshot, query, where, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, AlertTriangle, ChevronDown, ChevronRight, Loader2, Save, MoreHorizontal, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "providerSetup" | "general" | "payers" | "billing_rules" | "iddbilling";

const TABS: { key: TabKey; label: string }[] = [
  { key: "providerSetup", label: "Provider Setup" },
  { key: "general", label: "General" },
  { key: "payers", label: "Payers" },
  { key: "billing_rules", label: "Rates & billing rules" },
  { key: "iddbilling", label: "IDD Billing.AI" },
];

// ─── Billing Rules types ───────────────────────────────────────────────────────

interface BillingRule {
  id: string;
  serviceCode: string;
  description: string;
  program: string;
  payer: string;
  state: string;
  billingUnit: string;
  rate: number;
  effectiveDate: string;
  endDate: string | null;
  status: "active" | "inactive";
  organizationId: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

type BillingRuleForm = Omit<BillingRule, "id" | "organizationId" | "createdAt" | "updatedAt">;

const EMPTY_RULE: BillingRuleForm = {
  serviceCode: "", description: "", program: "", payer: "",
  state: "", billingUnit: "15 min", rate: 0,
  effectiveDate: "", endDate: null, status: "active", createdBy: "",
};

const BILLING_UNIT_OPTIONS = ["15 min", "30 min", "1 hour", "Per visit", "Per day", "Per month"];
const STATE_ABBREVS = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

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
          {tab === "billing_rules" && <BillingRulesTab orgId={orgId ?? ""} />}
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

// ─── Funding Stream types ─────────────────────────────────────────────────────

interface FundingStream {
  id: string;
  name: string;
  program: string;
  payer: string;
  codes: string;      // comma-separated service codes
  unit: string;
  state: string;
  status: "Active" | "Inactive";
  organizationId: string;
}

type FundingStreamForm = Omit<FundingStream, "id" | "organizationId">;

const EMPTY_FORM: FundingStreamForm = {
  name: "", program: "", payer: "", codes: "", unit: "15 min", state: "", status: "Active",
};

const BILLING_UNITS = ["15 min", "30 min", "1 hour", "Half day", "Full day", "Per visit", "Per month", "Per unit"];
const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

// ─── Add / Edit Modal ──────────────────────────────────────────────────────────

function FundingStreamModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: FundingStream;
  onClose: () => void;
  onSave: (form: FundingStreamForm) => Promise<void>;
}) {
  const [form, setForm] = useState<FundingStreamForm>(
    initial ? { name: initial.name, program: initial.program, payer: initial.payer, codes: initial.codes, unit: initial.unit, state: initial.state, status: initial.status } : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  const set = (k: keyof FundingStreamForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Stream name is required."); return; }
    if (!form.payer.trim()) { toast.error("Payer is required."); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (err: any) { toast.error("Failed to save: " + (err?.message ?? err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-icm-panel rounded-2xl border border-icm-border shadow-xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-manrope font-bold text-[15px] text-icm-text">
            {initial ? "Edit Funding Stream" : "Add Funding Stream"}
          </h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-icm-bg text-icm-text-dim">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <label className="text-[10.5px] uppercase tracking-wide font-geist font-semibold text-icm-text-dim">Stream Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Indiana HCBS — CIH Waiver" className="w-full h-9 px-3 rounded-lg border border-icm-border bg-icm-bg text-[12.5px] font-geist focus:outline-none focus:border-icm-accent" />
          </div>
          <div className="space-y-1">
            <label className="text-[10.5px] uppercase tracking-wide font-geist font-semibold text-icm-text-dim">Program</label>
            <input value={form.program} onChange={e => set("program", e.target.value)} placeholder="e.g. Community Integration" className="w-full h-9 px-3 rounded-lg border border-icm-border bg-icm-bg text-[12.5px] font-geist focus:outline-none focus:border-icm-accent" />
          </div>
          <div className="space-y-1">
            <label className="text-[10.5px] uppercase tracking-wide font-geist font-semibold text-icm-text-dim">Payer *</label>
            <input value={form.payer} onChange={e => set("payer", e.target.value)} placeholder="e.g. IHCP, NJ DDD" className="w-full h-9 px-3 rounded-lg border border-icm-border bg-icm-bg text-[12.5px] font-geist focus:outline-none focus:border-icm-accent" />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[10.5px] uppercase tracking-wide font-geist font-semibold text-icm-text-dim">Valid Service Codes <span className="normal-case">(comma-separated)</span></label>
            <input value={form.codes} onChange={e => set("codes", e.target.value)} placeholder="e.g. T2022, T2023, H0038" className="w-full h-9 px-3 rounded-lg border border-icm-border bg-icm-bg text-[12.5px] font-geist font-mono focus:outline-none focus:border-icm-accent" />
          </div>
          <div className="space-y-1">
            <label className="text-[10.5px] uppercase tracking-wide font-geist font-semibold text-icm-text-dim">Billing Unit</label>
            <select value={form.unit} onChange={e => set("unit", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-icm-border bg-icm-bg text-[12.5px] font-geist focus:outline-none focus:border-icm-accent">
              {BILLING_UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10.5px] uppercase tracking-wide font-geist font-semibold text-icm-text-dim">State</label>
            <select value={form.state} onChange={e => set("state", e.target.value)} className="w-full h-9 px-3 rounded-lg border border-icm-border bg-icm-bg text-[12.5px] font-geist focus:outline-none focus:border-icm-accent">
              <option value="">— Select —</option>
              {US_STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10.5px] uppercase tracking-wide font-geist font-semibold text-icm-text-dim">Status</label>
            <select value={form.status} onChange={e => set("status", e.target.value as "Active" | "Inactive")} className="w-full h-9 px-3 rounded-lg border border-icm-border bg-icm-bg text-[12.5px] font-geist focus:outline-none focus:border-icm-accent">
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="h-8 px-4 rounded-lg border border-icm-border text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="h-8 px-4 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-semibold hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1.5">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {initial ? "Save Changes" : "Add Stream"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BillingRulesTab ──────────────────────────────────────────────────────────

function BillingRulesTab({ orgId }: { orgId: string }) {
  const { userProfile } = useAuth();
  const [rules, setRules] = useState<BillingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<BillingRule | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const q = query(collection(db, "billingRules"), where("organizationId", "==", orgId));
    const unsub = onSnapshot(q, snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<BillingRule, "id">) }));
      // Sort: active first, then by serviceCode alphabetically
      rows.sort((a, b) => {
        if (a.status !== b.status) return a.status === "active" ? -1 : 1;
        return a.serviceCode.localeCompare(b.serviceCode);
      });
      setRules(rows);
      setLoading(false);
    }, err => { console.error("[billingRules]", err); setLoading(false); });
    return unsub;
  }, [orgId]);

  const displayed = rules.filter(r => {
    if (filterState !== "All" && r.state !== filterState) return false;
    if (filterStatus !== "All" && r.status !== filterStatus) return false;
    return true;
  });

  const handleAdd = async (form: BillingRuleForm) => {
    await addDoc(collection(db, "billingRules"), {
      ...form, organizationId: orgId,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      createdBy: userProfile?.uid ?? "",
    });
    toast.success("Billing rule added.");
  };

  const handleEdit = async (form: BillingRuleForm) => {
    if (!editing) return;
    await updateDoc(doc(db, "billingRules", editing.id), { ...form, updatedAt: serverTimestamp() });
    toast.success("Billing rule updated.");
    setEditing(null);
  };

  const handleDeactivate = async (id: string) => {
    await updateDoc(doc(db, "billingRules", id), { status: "inactive", updatedAt: serverTimestamp() });
    toast.success("Billing rule deactivated.");
    setOpenMenuId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this billing rule? This cannot be undone.")) return;
    await deleteDoc(doc(db, "billingRules", id));
    toast.success("Billing rule deleted.");
    setOpenMenuId(null);
  };

  const uniqueStates = Array.from(new Set(rules.map(r => r.state).filter(Boolean))).sort();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-manrope font-bold text-[16px] text-icm-text">Rates & billing rules</p>
          <p className="text-[12px] font-geist text-icm-text-dim mt-0.5">Define which services are billable, under which programs, at what rate.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="h-8 px-3 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist font-semibold text-icm-text-dim inline-flex items-center gap-1.5 hover:text-icm-text hover:border-icm-border-strong"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Import from CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="h-8 px-3 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:bg-teal-700"
          >
            <Plus className="w-3.5 h-3.5" /> Add billing rule
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <select value={filterState} onChange={e => setFilterState(e.target.value)}
          className="h-8 px-2 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none">
          <option value="All">All States</option>
          {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="h-8 px-2 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none">
          <option value="All">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {(filterState !== "All" || filterStatus !== "All") && (
          <button onClick={() => { setFilterState("All"); setFilterStatus("All"); }}
            className="text-[11.5px] font-geist text-icm-accent hover:underline">Clear filters</button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-icm-text-dim text-[12px] font-geist justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-icm-border py-10 text-center">
          <p className="text-[13px] font-geist text-icm-text-dim">No billing rules configured yet.</p>
          <button onClick={() => setShowAdd(true)} className="mt-2 text-[12.5px] font-geist font-semibold text-icm-accent hover:underline">
            + Add your first billing rule
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-icm-border overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
              <tr>
                {["Service Code","Description","Program","Payer","Rate","Unit","Effective Date","State","Status",""].map((h, i) => (
                  <th key={i} className={cn("text-left px-3 py-2 font-semibold", i === 9 && "w-8")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(r => {
                const isInactive = r.status === "inactive";
                return (
                  <tr key={r.id} className={cn("border-t border-icm-border hover:bg-icm-bg/40", isInactive && "opacity-60")}>
                    <td className="px-3 py-2.5 font-mono font-bold text-icm-text">{r.serviceCode}</td>
                    <td className="px-3 py-2.5 text-icm-text">{r.description || "—"}</td>
                    <td className="px-3 py-2.5 text-icm-text-dim text-[11.5px]">{r.program || "—"}</td>
                    <td className="px-3 py-2.5 text-icm-text">{r.payer}</td>
                    <td className="px-3 py-2.5 text-icm-text">${typeof r.rate === "number" ? r.rate.toFixed(2) : r.rate}</td>
                    <td className="px-3 py-2.5 text-icm-text-dim">{r.billingUnit}</td>
                    <td className="px-3 py-2.5 text-icm-text-dim">{r.effectiveDate || "—"}</td>
                    <td className="px-3 py-2.5 text-icm-text-dim">{r.state}</td>
                    <td className="px-3 py-2.5">
                      {isInactive
                        ? <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-bg text-icm-text-dim ring-1 ring-icm-border">Inactive</span>
                        : <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">Current</span>
                      }
                    </td>
                    <td className="px-3 py-2.5 relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-icm-bg text-icm-text-dim"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {openMenuId === r.id && (
                        <div className="absolute right-2 top-8 z-20 w-40 rounded-xl border border-icm-border bg-icm-panel shadow-elevated py-1"
                          onMouseLeave={() => setOpenMenuId(null)}>
                          <button onClick={() => { setEditing(r); setOpenMenuId(null); }}
                            className="w-full text-left px-3 py-1.5 text-[12px] font-geist text-icm-text hover:bg-icm-bg flex items-center gap-2">
                            <Pencil className="w-3.5 h-3.5 text-icm-text-dim" /> Edit
                          </button>
                          {!isInactive && (
                            <button onClick={() => handleDeactivate(r.id)}
                              className="w-full text-left px-3 py-1.5 text-[12px] font-geist text-icm-text hover:bg-icm-bg flex items-center gap-2">
                              <svg className="w-3.5 h-3.5 text-icm-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                              Deactivate
                            </button>
                          )}
                          <button onClick={() => handleDelete(r.id)}
                            className="w-full text-left px-3 py-1.5 text-[12px] font-geist text-icm-red hover:bg-icm-bg flex items-center gap-2">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <BillingRuleModal orgId={orgId} onClose={() => setShowAdd(false)} onSave={handleAdd} existingRules={rules} />}
      {editing && <BillingRuleModal orgId={orgId} initial={editing} onClose={() => setEditing(null)} onSave={handleEdit} existingRules={rules} />}
      {showImport && <BillingRulesImportModal orgId={orgId} onClose={() => setShowImport(false)} onImportComplete={() => {}} />}
    </div>
  );
}

// ─── BillingRuleModal ─────────────────────────────────────────────────────────

function BillingRuleModal({
  orgId, initial, onClose, onSave, existingRules,
}: {
  orgId: string;
  initial?: BillingRule;
  onClose: () => void;
  onSave: (form: BillingRuleForm) => Promise<void>;
  existingRules: BillingRule[];
}) {
  const [form, setForm] = useState<BillingRuleForm>(
    initial
      ? { serviceCode: initial.serviceCode, description: initial.description, program: initial.program, payer: initial.payer, rate: initial.rate, billingUnit: initial.billingUnit, effectiveDate: initial.effectiveDate, endDate: initial.endDate, state: initial.state, status: initial.status, createdBy: initial.createdBy ?? "" }
      : { ...EMPTY_RULE }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof BillingRuleForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [dupWarning, setDupWarning] = useState(false);

  const set = (k: keyof BillingRuleForm, v: string | number | null) =>
    setForm(f => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: Partial<Record<keyof BillingRuleForm, string>> = {};
    if (!form.serviceCode.trim()) e.serviceCode = "Service code is required.";
    if (!form.payer.trim()) e.payer = "Payer is required.";
    if (!form.program.trim()) e.program = "Program is required.";
    if (!form.state) e.state = "State is required.";
    if (!form.rate || Number(form.rate) <= 0) e.rate = "Rate must be a positive number.";
    if (form.effectiveDate && form.endDate && form.endDate < form.effectiveDate) e.endDate = "End date must be after effective date.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    // Duplicate check: warn but don't block
    if (!initial) {
      const dup = existingRules.find(r =>
        r.serviceCode.trim().toUpperCase() === form.serviceCode.trim().toUpperCase() &&
        r.payer.trim().toLowerCase() === form.payer.trim().toLowerCase() &&
        r.state === form.state &&
        r.status === "active"
      );
      if (dup && !dupWarning) { setDupWarning(true); return; }
    }
    setSaving(true);
    try {
      await onSave({ ...form, rate: Number(form.rate) });
      onClose();
    } catch (err: any) { toast.error("Failed to save: " + (err?.message ?? err)); }
    finally { setSaving(false); }
  };

  const Label = ({ text, required }: { text: string; required?: boolean }) => (
    <label className="block text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-1">
      {text}{required && <span className="text-icm-red ml-0.5">*</span>}
    </label>
  );
  const Err = ({ field }: { field: keyof BillingRuleForm }) =>
    errors[field] ? <p className="text-[10.5px] text-icm-red mt-0.5">{errors[field]}</p> : null;
  const SectionDivider = ({ title }: { title: string }) => (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim">{title}</span>
      <div className="flex-1 h-px bg-icm-border" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-icm-panel rounded-2xl border border-icm-border shadow-xl overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-manrope font-bold text-[15px] text-icm-text">
                {initial ? "Edit billing rule" : "Add billing rule"}
              </h3>
              <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">Defines eligibility + rate for a service code.</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-icm-bg text-icm-text-dim text-[16px]">✕</button>
          </div>

          {/* Info callout */}
          <div className="rounded-lg bg-icm-bg border border-icm-border px-3 py-2.5 flex items-start gap-2">
            <Info className="w-4 h-4 text-icm-text-dim shrink-0 mt-0.5" />
            <p className="text-[11.5px] font-geist text-icm-text-dim leading-relaxed">
              Program &amp; payer confirm who can bill. Rate &amp; unit determine how much. Both are required for claim validation.
            </p>
          </div>

          {dupWarning && (
            <div className="rounded-lg bg-icm-amber-soft border border-icm-amber/30 px-3 py-2.5 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-icm-amber shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-geist font-semibold text-icm-text">Possible duplicate</p>
                <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
                  An active rule with this service code, payer, and state already exists. Save anyway?
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Service */}
          <div className="space-y-3">
            <div>
              <Label text="Service code" required />
              <input value={form.serviceCode} onChange={e => set("serviceCode", e.target.value)} placeholder="e.g. T2022"
                className={cn("w-full h-9 px-3 rounded-lg border bg-icm-bg text-[12.5px] font-geist font-mono focus:outline-none focus:border-icm-accent", errors.serviceCode ? "border-icm-red" : "border-icm-border")} />
              <Err field="serviceCode" />
            </div>
            <div>
              <Label text="Description" />
              <input value={form.description} onChange={e => set("description", e.target.value)} placeholder="e.g. Case management"
                className="w-full h-9 px-3 rounded-lg border border-icm-border bg-icm-bg text-[12.5px] font-geist focus:outline-none focus:border-icm-accent" />
            </div>
          </div>

          {/* Section 2: Eligibility */}
          <SectionDivider title="Eligibility" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label text="Program" required />
              <input value={form.program} onChange={e => set("program", e.target.value)} placeholder="e.g. Community Integration"
                className={cn("w-full h-9 px-3 rounded-lg border bg-icm-bg text-[12.5px] font-geist focus:outline-none focus:border-icm-accent", errors.program ? "border-icm-red" : "border-icm-border")} />
              <Err field="program" />
            </div>
            <div>
              <Label text="Payer" required />
              <input value={form.payer} onChange={e => set("payer", e.target.value)} placeholder="e.g. IHCP, NJ DDD"
                className={cn("w-full h-9 px-3 rounded-lg border bg-icm-bg text-[12.5px] font-geist focus:outline-none focus:border-icm-accent", errors.payer ? "border-icm-red" : "border-icm-border")} />
              <Err field="payer" />
            </div>
            <div>
              <Label text="State" required />
              <select value={form.state} onChange={e => set("state", e.target.value)}
                className={cn("w-full h-9 px-2 rounded-lg border bg-icm-bg text-[12.5px] font-geist focus:outline-none focus:border-icm-accent", errors.state ? "border-icm-red" : "border-icm-border")}>
                <option value="">— Select —</option>
                {STATE_ABBREVS.map(s => <option key={s}>{s}</option>)}
              </select>
              <Err field="state" />
            </div>
            <div>
              <Label text="Billing unit" />
              <select value={form.billingUnit} onChange={e => set("billingUnit", e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-icm-border bg-icm-bg text-[12.5px] font-geist focus:outline-none focus:border-icm-accent">
                {BILLING_UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Section 3: Rate */}
          <SectionDivider title="Rate" />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label text="Rate" required />
              <input type="number" min="0" step="0.01" value={form.rate || ""} onChange={e => set("rate", e.target.value)}
                placeholder="$0.00"
                className={cn("w-full h-9 px-3 rounded-lg border bg-icm-bg text-[12.5px] font-geist font-mono focus:outline-none focus:border-icm-accent", errors.rate ? "border-icm-red" : "border-icm-border")} />
              <Err field="rate" />
            </div>
            <div>
              <Label text="Effective date" />
              <input type="date" value={form.effectiveDate} onChange={e => set("effectiveDate", e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-icm-border bg-icm-bg text-[12.5px] font-geist focus:outline-none focus:border-icm-accent" />
            </div>
            <div>
              <Label text="End date" />
              <input type="date" value={form.endDate ?? ""} onChange={e => set("endDate", e.target.value || null)}
                className={cn("w-full h-9 px-2 rounded-lg border bg-icm-bg text-[12.5px] font-geist focus:outline-none focus:border-icm-accent", errors.endDate ? "border-icm-red" : "border-icm-border")} />
              <Err field="endDate" />
            </div>
          </div>

          {/* Section 4: Status */}
          <div>
            <Label text="Status" />
            <select value={form.status} onChange={e => set("status", e.target.value as "active" | "inactive")}
              className="w-full h-9 px-2 rounded-lg border border-icm-border bg-icm-bg text-[12.5px] font-geist focus:outline-none focus:border-icm-accent">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={onClose} className="h-8 px-4 rounded-lg border border-icm-border text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="h-8 px-4 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-semibold hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1.5">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {dupWarning ? "Save anyway" : initial ? "Save changes" : "Save billing rule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BillingRulesImportModal ──────────────────────────────────────────────────

type ImportStep = 1 | 2 | 3 | 4;

interface CsvRow { [key: string]: string }

const FIELD_OPTIONS = [
  { key: "serviceCode",    label: "Service code" },
  { key: "description",   label: "Description" },
  { key: "program",       label: "Program" },
  { key: "payer",         label: "Payer" },
  { key: "rate",          label: "Rate" },
  { key: "billingUnit",   label: "Billing unit" },
  { key: "effectiveDate", label: "Effective date" },
  { key: "endDate",       label: "End date" },
  { key: "state",         label: "State" },
  { key: "status",        label: "Status" },
];

const AUTO_MAP: Record<string, string> = {
  service_code: "serviceCode", code: "serviceCode", proc_code: "serviceCode", procedure: "serviceCode",
  description: "description", desc: "description", service_name: "description", name: "description",
  program: "program", waiver: "program", program_name: "program",
  payer: "payer", payer_name: "payer", insurance: "payer",
  rate: "rate", amount: "rate", price: "rate", reimbursement: "rate",
  unit: "billingUnit", billing_unit: "billingUnit", increment: "billingUnit",
  effective_date: "effectiveDate", start_date: "effectiveDate", date: "effectiveDate",
  end_date: "endDate", expiry: "endDate", expiration: "endDate",
  state: "state", state_code: "state",
  status: "status", active: "status",
};

function autoMatch(col: string): string | null {
  const normalized = col.toLowerCase().trim().replace(/\s+/g, "_");
  return AUTO_MAP[normalized] ?? null;
}

interface DupEntry {
  rowIndex: number;
  importRow: CsvRow;
  existing: BillingRule;
  action: "skip" | "replace" | "import_new";
}

const TEMPLATE_CSV = `service_code,description,program,payer,rate,unit,effective_date,end_date,state,status
T2022,Case management,Community Integration,IHCP,28.50,15 min,2024-01-01,,IN,active
`;

function BillingRulesImportModal({
  orgId, onClose, onImportComplete,
}: {
  orgId: string;
  onClose: () => void;
  onImportComplete: () => void;
}) {
  const [step, setStep] = useState<ImportStep>(1);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [dupEntries, setDupEntries] = useState<DupEntry[]>([]);
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const autoMapped = Object.values(mapping).filter(Boolean).length;
  const unmapped = headers.filter(h => !mapping[h]).length;

  const parseCsv = (text: string): { headers: string[]; rows: CsvRow[] } => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const hdrs = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const dataRows: CsvRow[] = lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      return Object.fromEntries(hdrs.map((h, i) => [h, vals[i] ?? ""]));
    });
    return { headers: hdrs, rows: dataRows };
  };

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const { headers: hdrs, rows: dataRows } = parseCsv(text);
      setHeaders(hdrs);
      setRows(dataRows);
      const autoMapping: Record<string, string | null> = {};
      hdrs.forEach(h => { autoMapping[h] = autoMatch(h); });
      setMapping(autoMapping);
    };
    reader.readAsText(f);
  };

  const resolveRow = (row: CsvRow): Partial<BillingRuleForm> => {
    const result: any = {};
    headers.forEach(h => {
      const field = mapping[h];
      if (field) result[field] = row[h];
    });
    if (result.rate) result.rate = parseFloat(result.rate) || 0;
    if (!result.status) result.status = "active";
    if (!result.billingUnit) result.billingUnit = "15 min";
    return result;
  };

  const runDuplicateCheck = async () => {
    const q = query(collection(db, "billingRules"), where("organizationId", "==", orgId));
    const snap = await getDocs(q);
    const existing = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<BillingRule, "id">) }));
    const dups: DupEntry[] = [];
    rows.forEach((row, i) => {
      const resolved = resolveRow(row);
      const match = existing.find(r =>
        r.serviceCode?.toUpperCase() === (resolved.serviceCode ?? "").toUpperCase() &&
        r.payer?.toLowerCase() === (resolved.payer ?? "").toLowerCase() &&
        r.state === resolved.state &&
        r.status === "active"
      );
      if (match) dups.push({ rowIndex: i, importRow: row, existing: match, action: "skip" });
    });
    setDupEntries(dups);
    setStep(3);
  };

  const getDupsMap = () => new Map(dupEntries.map(d => [d.rowIndex, d]));

  const rowsToImport = rows.filter((_, i) => {
    const dup = getDupsMap().get(i);
    return !dup || dup.action !== "skip";
  });

  const handleImport = async () => {
    setImporting(true);
    const dupsMap = getDupsMap();
    let count = 0;
    try {
      for (let i = 0; i < rows.length; i++) {
        const dup = dupsMap.get(i);
        if (dup?.action === "skip") continue;
        const resolved = resolveRow(rows[i]);
        const data = {
          ...resolved, organizationId: orgId,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        };
        if (dup?.action === "replace") {
          await updateDoc(doc(db, "billingRules", dup.existing.id), { ...resolved, updatedAt: serverTimestamp() });
        } else {
          await addDoc(collection(db, "billingRules"), data);
        }
        count++;
        if (count % 50 === 0) setImportCount(count);
      }
      setImportCount(count);
      toast.success(`${count} billing rules imported successfully.`);
      onImportComplete();
      onClose();
    } catch (err: any) {
      toast.error("Import failed: " + (err?.message ?? err));
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "billing_rules_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // Step indicator styles
  const StepIndicator = () => (
    <div className="flex items-center gap-1 mb-5">
      {[1,2,3,4].map((s, i) => {
        const labels = ["Upload file","Map fields","Duplicate check","Review & import"];
        const done = step > s;
        const active = step === s;
        return (
          <React.Fragment key={s}>
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                done ? "bg-icm-green text-white" : active ? "bg-teal-600 text-white" : "border-2 border-icm-border text-icm-text-dim"
              )}>
                {done ? "✓" : s}
              </div>
              <span className={cn("text-[11px] font-geist whitespace-nowrap", active ? "text-icm-text font-semibold" : "text-icm-text-dim")}>
                {labels[i]}
              </span>
            </div>
            {i < 3 && <div className="flex-1 h-px bg-icm-border min-w-[8px]" />}
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-icm-panel rounded-2xl border border-icm-border shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-icm-border shrink-0">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-manrope font-bold text-[15px] text-icm-text">Import billing rules</h3>
              <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">Handles large files · Detects duplicates · Batch writes to Firestore</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-icm-bg text-icm-text-dim text-[16px]">✕</button>
          </div>
          <StepIndicator />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── STEP 1: Upload ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-icm-border rounded-xl py-12 flex flex-col items-center gap-3 cursor-pointer hover:border-icm-accent/50 hover:bg-icm-bg/30 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              >
                <svg className="w-10 h-10 text-icm-text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div className="text-center">
                  <p className="font-manrope font-semibold text-[14px] text-icm-text">Drop your CSV file here</p>
                  <p className="text-[12px] font-geist text-icm-text-dim mt-0.5">or click to browse — CSV files only, up to 10MB</p>
                </div>
                {file && (
                  <div className="flex items-center gap-2 bg-icm-bg border border-icm-border rounded-lg px-3 py-1.5">
                    <span className="text-[12px] font-geist font-semibold text-icm-text">{file.name}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">{rows.length} rows</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="sr-only"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              <button onClick={downloadTemplate} className="text-[12px] font-geist font-semibold text-icm-accent hover:underline flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download CSV template
              </button>
            </div>
          )}

          {/* ── STEP 2: Map fields ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] font-geist text-icm-text">File: <strong>{file?.name}</strong></span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">{rows.length} rows</span>
                <span className="text-[11px] font-geist text-icm-green">✓ {autoMapped} auto-matched</span>
                {unmapped > 0 && <span className="text-[11px] font-geist text-icm-text-dim">⊗ {unmapped} unmapped</span>}
              </div>
              <div className="rounded-xl border border-icm-border overflow-hidden">
                <table className="w-full text-[12px] font-geist">
                  <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Excel Column</th>
                      <th className="w-6" />
                      <th className="text-left px-3 py-2 font-semibold">System Field</th>
                      <th className="text-left px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map(h => {
                      const example = rows[0]?.[h] ?? "";
                      const matched = !!mapping[h];
                      return (
                        <tr key={h} className="border-t border-icm-border hover:bg-icm-bg/30">
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-icm-text">{h}</div>
                            {example && <div className="text-[10.5px] text-icm-text-faint mt-0.5">e.g. {example}</div>}
                          </td>
                          <td className="text-center text-icm-text-faint">→</td>
                          <td className="px-3 py-2.5">
                            <select value={mapping[h] ?? ""} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value || null }))}
                              className="w-full h-8 px-2 rounded-lg border border-icm-border bg-icm-bg text-[12px] font-geist focus:outline-none focus:border-icm-accent">
                              <option value="">— Skip this column —</option>
                              {FIELD_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2.5">
                            {matched
                              ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">✓ Auto-matched</span>
                              : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-icm-bg text-icm-text-dim ring-1 ring-icm-border">⊗ No match</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── STEP 3: Duplicate check ── */}
          {step === 3 && (
            <div className="space-y-4">
              {dupEntries.length === 0 ? (
                <div className="rounded-xl border border-icm-green/30 bg-icm-green-soft/30 py-8 text-center">
                  <p className="text-[22px] mb-1">✓</p>
                  <p className="font-manrope font-semibold text-[14px] text-icm-green">No duplicates found.</p>
                  <p className="text-[12px] font-geist text-icm-text-dim mt-1">Ready to import {rows.length} rules.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg bg-icm-amber-soft border border-icm-amber/30 px-3 py-2.5 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-icm-amber shrink-0" />
                    <p className="text-[12px] font-geist text-icm-text font-semibold">{dupEntries.length} duplicates found. Choose how to handle each.</p>
                  </div>
                  <div className="rounded-xl border border-icm-border overflow-hidden">
                    <table className="w-full text-[12px] font-geist">
                      <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold">Import Row</th>
                          <th className="text-left px-3 py-2 font-semibold">Existing Record</th>
                          <th className="text-left px-3 py-2 font-semibold">Conflict</th>
                          <th className="text-left px-3 py-2 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dupEntries.map((dup, di) => {
                          const resolved = resolveRow(dup.importRow);
                          const rateChanged = Number(resolved.rate) !== dup.existing.rate;
                          return (
                            <tr key={di} className="border-t border-icm-border hover:bg-icm-bg/30">
                              <td className="px-3 py-2.5">
                                <div className="font-mono font-bold text-icm-text">{resolved.serviceCode} · {resolved.payer} · {resolved.state}</div>
                                <div className="text-[10.5px] text-icm-text-dim">${resolved.rate} / {resolved.billingUnit}</div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="font-mono font-bold text-icm-text">{dup.existing.serviceCode} · {dup.existing.payer} · {dup.existing.state}</div>
                                <div className="text-[10.5px] text-icm-text-dim">${dup.existing.rate} / {dup.existing.billingUnit}</div>
                              </td>
                              <td className="px-3 py-2.5">
                                {rateChanged
                                  ? <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-icm-amber-soft text-icm-amber ring-1 ring-icm-amber/20">Rate differs</span>
                                  : <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-icm-bg text-icm-text-dim ring-1 ring-icm-border">Identical</span>
                                }
                              </td>
                              <td className="px-3 py-2.5">
                                <select value={dup.action}
                                  onChange={e => setDupEntries(prev => prev.map((d, i) => i === di ? { ...d, action: e.target.value as DupEntry["action"] } : d))}
                                  className="h-8 px-2 rounded-lg border border-icm-border bg-icm-bg text-[11.5px] font-geist focus:outline-none">
                                  <option value="skip">Skip (keep existing)</option>
                                  <option value="replace">Replace existing</option>
                                  <option value="import_new">Import as new</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP 4: Review & Import ── */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-icm-border bg-icm-panel px-4 py-3 text-center">
                  <p className="font-manrope font-bold text-[26px] text-icm-green">{rowsToImport.length}</p>
                  <p className="text-[11px] font-geist text-icm-text-dim mt-0.5">Rules to import</p>
                </div>
                <div className="rounded-xl border border-icm-border bg-icm-panel px-4 py-3 text-center">
                  <p className="font-manrope font-bold text-[26px] text-icm-text-dim">{dupEntries.filter(d => d.action === "skip").length}</p>
                  <p className="text-[11px] font-geist text-icm-text-dim mt-0.5">Skipped (identical)</p>
                </div>
                <div className="rounded-xl border border-icm-border bg-icm-panel px-4 py-3 text-center">
                  <p className="font-manrope font-bold text-[26px] text-icm-amber">{dupEntries.filter(d => d.action === "replace").length}</p>
                  <p className="text-[11px] font-geist text-icm-text-dim mt-0.5">Duplicates to replace</p>
                </div>
              </div>

              {/* Preview table */}
              <div className="rounded-xl border border-icm-border overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-[12px] font-geist">
                  <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider sticky top-0">
                    <tr>
                      {["Code","Program","Payer","Rate","State"].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rowsToImport.map((row, i) => {
                      const r = resolveRow(row);
                      const missingRequired = !r.serviceCode || !r.payer || !r.rate;
                      return (
                        <tr key={i} className={cn("border-t border-icm-border", missingRequired && "bg-icm-red-soft/30")}>
                          <td className="px-3 py-2 font-mono font-bold text-icm-text">{r.serviceCode || <span className="text-icm-red">Missing!</span>}</td>
                          <td className="px-3 py-2 text-icm-text-dim text-[11.5px]">{r.program || "—"}</td>
                          <td className="px-3 py-2">{r.payer || <span className="text-icm-red">Missing!</span>}</td>
                          <td className="px-3 py-2 font-mono">{r.rate ? `$${Number(r.rate).toFixed(2)}` : <span className="text-icm-red">Missing!</span>}</td>
                          <td className="px-3 py-2 text-icm-text-dim">{r.state || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {importing && (
                <div className="flex items-center gap-2 text-[12px] font-geist text-icm-text-dim justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                  Importing… {importCount > 0 && `${importCount} written so far`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-icm-border flex items-center justify-between shrink-0">
          <button
            onClick={() => { if (step === 1) onClose(); else setStep((step - 1) as ImportStep); }}
            className="h-8 px-4 rounded-lg border border-icm-border text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text flex items-center gap-1.5"
          >
            {step === 1 ? "Cancel" : "‹ Back"}
          </button>

          {step === 1 && (
            <button disabled={!file || rows.length === 0} onClick={() => setStep(2)}
              className="h-8 px-4 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-semibold hover:bg-teal-700 disabled:opacity-40">
              Map fields ›
            </button>
          )}
          {step === 2 && (
            <button
              disabled={!Object.values(mapping).some(v => v === "serviceCode") || !Object.values(mapping).some(v => v === "payer")}
              onClick={runDuplicateCheck}
              className="h-8 px-4 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-semibold hover:bg-teal-700 disabled:opacity-40">
              Check for duplicates ›
            </button>
          )}
          {step === 3 && (
            <button onClick={() => setStep(4)}
              className="h-8 px-4 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-semibold hover:bg-teal-700">
              Review & import ›
            </button>
          )}
          {step === 4 && (
            <button onClick={handleImport} disabled={importing || rowsToImport.length === 0}
              className="h-8 px-4 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-semibold hover:bg-teal-700 disabled:opacity-40 flex items-center gap-1.5">
              {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Import {rowsToImport.length} billing rules
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FundingTab ────────────────────────────────────────────────────────────────

function FundingTab() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const [streams, setStreams] = useState<FundingStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<FundingStream | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load from Firestore
  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const q = query(collection(db, "funding_streams"), where("organizationId", "==", orgId));
    const unsub = onSnapshot(q, snap => {
      setStreams(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<FundingStream, "id">) })));
      setLoading(false);
    }, err => { console.error("[funding_streams]", err); setLoading(false); });
    return unsub;
  }, [orgId]);

  const handleAdd = async (form: FundingStreamForm) => {
    await addDoc(collection(db, "funding_streams"), { ...form, organizationId: orgId, createdAt: serverTimestamp() });
    toast.success("Funding stream added.");
  };

  const handleEdit = async (form: FundingStreamForm) => {
    if (!editing) return;
    await updateDoc(doc(db, "funding_streams", editing.id), { ...form, updatedAt: serverTimestamp() });
    toast.success("Funding stream updated.");
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this funding stream? This cannot be undone.")) return;
    setDeleting(id);
    try { await deleteDoc(doc(db, "funding_streams", id)); toast.success("Deleted."); }
    catch (err: any) { toast.error("Failed to delete: " + (err?.message ?? err)); }
    finally { setDeleting(null); }
  };

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-manrope font-bold text-[14px] text-icm-text">Funding Streams</p>
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">Define which service codes are valid under which programs and payers.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="h-8 px-2.5 rounded-lg bg-teal-600 text-white text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:bg-teal-700">
          <Plus className="w-3.5 h-3.5" /> Add Funding Stream
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-icm-text-dim text-[12px] font-geist justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : streams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-icm-border py-8 text-center">
          <p className="text-[12.5px] font-geist text-icm-text-dim">No funding streams configured yet.</p>
          <button onClick={() => setShowAdd(true)} className="mt-2 text-[12px] font-geist font-semibold text-icm-accent hover:underline">
            + Add your first funding stream
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-icm-border overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
              <tr>
                {["Stream Name", "Program", "Payer", "Valid Service Codes", "Billing Unit", "State", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {streams.map(r => (
                <tr key={r.id} className="border-t border-icm-border hover:bg-icm-bg/40">
                  <td className="px-3 py-2 text-icm-text font-semibold">{r.name}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{r.program || "—"}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{r.payer}</td>
                  <td className="px-3 py-2 text-icm-text-dim font-mono">{r.codes || "—"}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{r.unit}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{r.state || "—"}</td>
                  <td className="px-3 py-2">
                    <StatusPill label={r.status} tone={r.status === "Active" ? "green" : "neutral"} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditing(r)} className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline">Edit</button>
                      <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id} className="text-[11.5px] font-geist font-semibold text-icm-red hover:underline disabled:opacity-50">
                        {deleting === r.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <FundingStreamModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {editing && <FundingStreamModal initial={editing} onClose={() => setEditing(null)} onSave={handleEdit} />}
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
