import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import {
  Check, ChevronLeft, AlertTriangle, Plus, X,
} from "lucide-react";
import {
  saveProgram,
  addProgramPayer,
  addProgramBillingRule,
  computeEnrollmentStatus,
  type Program,
  type ProgramPayer,
  type ProgramBillingRule,
} from "@/hooks/usePrograms";

// ─── US States ────────────────────────────────────────────────────────────────

const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];

// ─── Draft types ──────────────────────────────────────────────────────────────

interface ProgramDraft {
  // Step 1
  name: string;
  abbreviation: string;
  state: string;
  stateName: string;
  fundingType: "medicaid" | "state_general" | "federal" | "private" | "other";
  description: string;
  status: "active" | "inactive";
  // Step 2
  providerEnrollment: {
    npiType2: string;
    taxIdEin: string;
    medicaidProviderId: string;
    effectiveDate: string;
    expirationDate: string;
  };
  billingContact: {
    name: string;
    phone: string;
    email: string;
    sameAsOrgAddress: boolean;
    payToAddress: string;
  };
  clearinghouse: {
    name: string;
    submitterId: string;
    claimFormat: string;
    electronicRemittance: boolean;
  };
  // Step 5
  signatureRequirements: {
    caseManager: boolean;
    supervisor: boolean;
    participant: boolean;
    guardian: boolean;
  };
  supervisorApproval: {
    required: boolean;
    progressNotes: boolean;
    contactNotes: boolean;
    visitSummaries: boolean;
    monitoringForms: boolean;
    overdueThresholdHours: number;
  };
  billingDefaults: {
    defaultBillingUnit: string;
    roundingRule: string;
    autoCalcUnitsFromTime: boolean;
  };
}

const INITIAL_DRAFT: ProgramDraft = {
  name: "",
  abbreviation: "",
  state: "",
  stateName: "",
  fundingType: "medicaid",
  description: "",
  status: "active",
  providerEnrollment: {
    npiType2: "",
    taxIdEin: "",
    medicaidProviderId: "",
    effectiveDate: "",
    expirationDate: "",
  },
  billingContact: {
    name: "",
    phone: "",
    email: "",
    sameAsOrgAddress: true,
    payToAddress: "",
  },
  clearinghouse: {
    name: "",
    submitterId: "",
    claimFormat: "837P",
    electronicRemittance: false,
  },
  signatureRequirements: {
    caseManager: true,
    supervisor: false,
    participant: false,
    guardian: false,
  },
  supervisorApproval: {
    required: false,
    progressNotes: false,
    contactNotes: false,
    visitSummaries: false,
    monitoringForms: false,
    overdueThresholdHours: 24,
  },
  billingDefaults: {
    defaultBillingUnit: "15min",
    roundingRule: "round_nearest",
    autoCalcUnitsFromTime: true,
  },
};

// ─── Shared input classes ─────────────────────────────────────────────────────

const INPUT_CLS =
  "h-9 px-3 rounded-xl border border-icm-border bg-white text-[12.5px] focus:outline-none focus:border-icm-accent w-full";
const LABEL_CLS =
  "block text-[10.5px] font-semibold uppercase tracking-wider text-icm-text-dim mb-1";
const SECTION_TITLE_CLS =
  "font-manrope font-bold text-[14px] text-icm-text mb-3";

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-9 h-5 rounded-full transition-colors shrink-0",
        checked ? "bg-teal-600" : "bg-icm-border"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
          checked && "translate-x-4"
        )}
      />
    </button>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEP_LABELS = [
  "Program basics",
  "Provider enrollment",
  "Payers",
  "Billing rules",
  "Compliance",
];

function StepIndicator({
  current,
  onGoTo,
}: {
  current: number;
  onGoTo: (step: number) => void;
}) {
  return (
    <div className="flex items-center gap-0 w-full max-w-3xl mx-auto mb-8">
      {STEP_LABELS.map((label, idx) => {
        const stepNum = idx + 1;
        const past = stepNum < current;
        const active = stepNum === current;
        return (
          <React.Fragment key={label}>
            {/* connector line */}
            {idx > 0 && (
              <div
                className={cn(
                  "flex-1 h-0.5 transition-colors",
                  idx < current ? "bg-teal-600" : "bg-icm-border"
                )}
              />
            )}
            <button
              type="button"
              onClick={() => past && onGoTo(stepNum)}
              disabled={!past && !active}
              className="flex flex-col items-center gap-1 shrink-0 group"
            >
              {/* circle or pill */}
              {active ? (
                <div className="h-7 px-3 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center gap-1 whitespace-nowrap">
                  {stepNum}. {label}
                </div>
              ) : past ? (
                <div
                  className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center cursor-pointer"
                  title={label}
                >
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
              ) : (
                <div
                  className="w-6 h-6 rounded-full border-2 border-icm-border flex items-center justify-center"
                  title={label}
                >
                  <span className="text-[10px] text-icm-text-dim font-semibold">{stepNum}</span>
                </div>
              )}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

function Step1({
  draft,
  onChange,
}: {
  draft: ProgramDraft;
  onChange: (d: ProgramDraft) => void;
}) {
  const set = <K extends keyof ProgramDraft>(key: K, val: ProgramDraft[K]) =>
    onChange({ ...draft, [key]: val });

  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL_CLS}>Program Name *</label>
        <input
          className={INPUT_CLS}
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Indiana HCBS Waiver"
        />
      </div>
      <div>
        <label className={LABEL_CLS}>Abbreviation *</label>
        <input
          className={INPUT_CLS}
          value={draft.abbreviation}
          onChange={(e) => set("abbreviation", e.target.value)}
          placeholder="e.g. Case MGMT"
        />
      </div>
      <div>
        <label className={LABEL_CLS}>State *</label>
        <select
          className={INPUT_CLS}
          value={draft.state}
          onChange={(e) => {
            const found = US_STATES.find((s) => s.code === e.target.value);
            onChange({ ...draft, state: e.target.value, stateName: found?.name ?? e.target.value });
          }}
        >
          <option value="">Select state…</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={LABEL_CLS}>Funding Type *</label>
        <select
          className={INPUT_CLS}
          value={draft.fundingType}
          onChange={(e) =>
            set("fundingType", e.target.value as ProgramDraft["fundingType"])
          }
        >
          <option value="medicaid">Medicaid</option>
          <option value="state_general">State General Funds</option>
          <option value="federal">Federal</option>
          <option value="private">Private</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className={LABEL_CLS}>Description</label>
        <textarea
          className="px-3 py-2 rounded-xl border border-icm-border bg-white text-[12.5px] focus:outline-none focus:border-icm-accent w-full resize-none"
          rows={3}
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Brief description of this program…"
        />
      </div>
      <div>
        <label className={LABEL_CLS}>Status</label>
        <select
          className={INPUT_CLS}
          value={draft.status}
          onChange={(e) => set("status", e.target.value as "active" | "inactive")}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

function Step2({
  draft,
  onChange,
}: {
  draft: ProgramDraft;
  onChange: (d: ProgramDraft) => void;
}) {
  const setEnroll = (k: keyof ProgramDraft["providerEnrollment"], v: string) =>
    onChange({
      ...draft,
      providerEnrollment: { ...draft.providerEnrollment, [k]: v },
    });
  const setContact = (k: keyof ProgramDraft["billingContact"], v: string | boolean) =>
    onChange({ ...draft, billingContact: { ...draft.billingContact, [k]: v } });
  const setClear = (k: keyof ProgramDraft["clearinghouse"], v: string | boolean) =>
    onChange({ ...draft, clearinghouse: { ...draft.clearinghouse, [k]: v } });

  const stateName = US_STATES.find((s) => s.code === draft.state)?.name ?? draft.state ?? "this state";

  const enrollmentStatus = computeEnrollmentStatus(
    draft.providerEnrollment.effectiveDate
      ? {
          npiType2: draft.providerEnrollment.npiType2,
          taxIdEin: draft.providerEnrollment.taxIdEin,
          medicaidProviderId: draft.providerEnrollment.medicaidProviderId,
          effectiveDate: draft.providerEnrollment.effectiveDate,
          expirationDate: draft.providerEnrollment.expirationDate || undefined,
          enrollmentStatus: "active",
        }
      : undefined
  );

  return (
    <div className="space-y-6">
      {/* Callout */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-amber-800">
          Each state requires a separate enrollment. NPI and Medicaid Provider ID here are specific to{" "}
          <strong>{stateName}</strong> — they may differ from other states.
        </p>
      </div>

      {/* Enrollment credentials */}
      <div>
        <p className={SECTION_TITLE_CLS}>Enrollment credentials</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Organization NPI (Type 2) *</label>
            <input
              className={INPUT_CLS}
              maxLength={10}
              value={draft.providerEnrollment.npiType2}
              onChange={(e) => setEnroll("npiType2", e.target.value.replace(/\D/g, ""))}
              placeholder="10 digits"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Tax ID / EIN *</label>
            <input
              className={INPUT_CLS}
              value={draft.providerEnrollment.taxIdEin}
              onChange={(e) => setEnroll("taxIdEin", e.target.value)}
              placeholder="XX-XXXXXXX"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Medicaid Provider ID *</label>
            <input
              className={INPUT_CLS}
              value={draft.providerEnrollment.medicaidProviderId}
              onChange={(e) => setEnroll("medicaidProviderId", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <label className={LABEL_CLS}>Effective Date *</label>
              <input
                type="date"
                className={INPUT_CLS}
                value={draft.providerEnrollment.effectiveDate}
                onChange={(e) => setEnroll("effectiveDate", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={LABEL_CLS}>Expiration Date</label>
            <input
              type="date"
              className={INPUT_CLS}
              value={draft.providerEnrollment.expirationDate}
              onChange={(e) => setEnroll("expirationDate", e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Enrollment Status</label>
            <div className="h-9 flex items-center">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1",
                enrollmentStatus.status === "active" && "bg-icm-green-soft text-icm-green ring-icm-green/20",
                enrollmentStatus.status === "pending" && "bg-amber-50 text-amber-700 ring-amber-200",
                enrollmentStatus.status === "expired" && "bg-red-50 text-red-600 ring-red-200",
                enrollmentStatus.status === "expiring_soon" && "bg-amber-50 text-amber-700 ring-amber-200",
                enrollmentStatus.status === "not_configured" && "bg-icm-bg text-icm-text-dim ring-icm-border",
              )}>
                {enrollmentStatus.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Billing contact */}
      <div>
        <p className={SECTION_TITLE_CLS}>Billing contact</p>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <label className={LABEL_CLS}>Contact name</label>
            <input className={INPUT_CLS} value={draft.billingContact.name}
              onChange={(e) => setContact("name", e.target.value)} />
          </div>
          <div>
            <label className={LABEL_CLS}>Contact phone</label>
            <input className={INPUT_CLS} value={draft.billingContact.phone}
              onChange={(e) => setContact("phone", e.target.value)} />
          </div>
          <div>
            <label className={LABEL_CLS}>Contact email</label>
            <input type="email" className={INPUT_CLS} value={draft.billingContact.email}
              onChange={(e) => setContact("email", e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            id="sameAddress"
            checked={draft.billingContact.sameAsOrgAddress}
            onChange={(e) => setContact("sameAsOrgAddress", e.target.checked)}
            className="rounded border-icm-border"
          />
          <label htmlFor="sameAddress" className="text-[12.5px] text-icm-text cursor-pointer">
            Same as organization address
          </label>
        </div>
        {!draft.billingContact.sameAsOrgAddress && (
          <div>
            <label className={LABEL_CLS}>Pay-to address</label>
            <input
              className={INPUT_CLS}
              placeholder="Street, City, State, ZIP"
              value={draft.billingContact.payToAddress}
              onChange={(e) => setContact("payToAddress", e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Clearinghouse */}
      <div>
        <p className={SECTION_TITLE_CLS}>Clearinghouse & submission</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Clearinghouse name</label>
            <input className={INPUT_CLS} value={draft.clearinghouse.name}
              onChange={(e) => setClear("name", e.target.value)} placeholder="e.g. Availity" />
          </div>
          <div>
            <label className={LABEL_CLS}>Submitter ID</label>
            <input className={INPUT_CLS} value={draft.clearinghouse.submitterId}
              onChange={(e) => setClear("submitterId", e.target.value)} />
          </div>
          <div>
            <label className={LABEL_CLS}>Claim format</label>
            <select className={INPUT_CLS} value={draft.clearinghouse.claimFormat}
              onChange={(e) => setClear("claimFormat", e.target.value)}>
              <option value="837P">837P</option>
              <option value="837I">837I</option>
              <option value="UB-04">UB-04</option>
              <option value="CMS-1500">CMS-1500</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-5">
            <Toggle
              checked={draft.clearinghouse.electronicRemittance}
              onChange={(v) => setClear("electronicRemittance", v)}
            />
            <label className="text-[12.5px] text-icm-text">Electronic remittance</label>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Payer inline form ────────────────────────────────────────────────────────

type PayerDraft = Omit<ProgramPayer, "id" | "createdAt">;

const EMPTY_PAYER: PayerDraft = {
  payerName: "",
  payerId: "",
  type: "state_medicaid",
  filingDeadlineDays: 90,
  status: "active",
  electronicBilling: true,
};

function Step3({
  payers,
  setPayers,
}: {
  payers: PayerDraft[];
  setPayers: React.Dispatch<React.SetStateAction<PayerDraft[]>>;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<PayerDraft>({ ...EMPTY_PAYER });

  const addPayer = () => {
    if (!form.payerName.trim() || !form.payerId.trim()) {
      toast.error("Payer name and Payer ID are required");
      return;
    }
    setPayers((prev) => [...prev, { ...form }]);
    setForm({ ...EMPTY_PAYER });
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className={SECTION_TITLE_CLS}>Payers</p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="h-9 px-4 rounded-xl bg-teal-600 text-white font-semibold text-[12px] hover:bg-teal-700 inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add payer
          </button>
        )}
      </div>

      {/* Inline add form */}
      {adding && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3">
          <p className="text-[12px] font-semibold text-teal-800">New payer</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Payer name *</label>
              <input className={INPUT_CLS} value={form.payerName}
                onChange={(e) => setForm((f) => ({ ...f, payerName: e.target.value }))} />
            </div>
            <div>
              <label className={LABEL_CLS}>Payer ID *</label>
              <input className={INPUT_CLS} value={form.payerId}
                onChange={(e) => setForm((f) => ({ ...f, payerId: e.target.value }))} />
            </div>
            <div>
              <label className={LABEL_CLS}>Type</label>
              <select className={INPUT_CLS} value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PayerDraft["type"] }))}>
                <option value="state_medicaid">State Medicaid</option>
                <option value="mco">MCO</option>
                <option value="private">Private</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Filing deadline (days)</label>
              <input type="number" className={INPUT_CLS} value={form.filingDeadlineDays}
                onChange={(e) => setForm((f) => ({ ...f, filingDeadlineDays: parseInt(e.target.value) || 90 }))} />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <Toggle
                checked={form.electronicBilling}
                onChange={(v) => setForm((f) => ({ ...f, electronicBilling: v }))}
              />
              <label className="text-[12.5px] text-icm-text">Electronic billing</label>
            </div>
            <div>
              <label className={LABEL_CLS}>Status</label>
              <select className={INPUT_CLS} value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "active" | "inactive" }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setAdding(false)}
              className="h-9 px-4 rounded-xl border border-icm-border text-[12px] font-semibold text-icm-text-dim hover:text-icm-text">
              Cancel
            </button>
            <button type="button" onClick={addPayer}
              className="h-9 px-4 rounded-xl bg-teal-600 text-white font-semibold text-[12px] hover:bg-teal-700">
              Add
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {payers.length === 0 && !adding ? (
        <div className="rounded-xl border-2 border-dashed border-icm-border p-8 text-center">
          <p className="text-[13px] text-icm-text-dim">No payers configured. Add at least one payer to enable billing.</p>
        </div>
      ) : payers.length > 0 ? (
        <div className="rounded-xl border border-icm-border overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead className="bg-icm-bg border-b border-icm-border">
              <tr>
                {["Payer name", "Payer ID", "Type", "Deadline", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-icm-text-dim">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-icm-border">
              {payers.map((p, i) => (
                <tr key={i} className="hover:bg-icm-bg/50">
                  <td className="px-3 py-2 font-semibold text-icm-text">{p.payerName}</td>
                  <td className="px-3 py-2 text-icm-text-dim font-mono">{p.payerId}</td>
                  <td className="px-3 py-2 text-icm-text-dim capitalize">{p.type.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{p.filingDeadlineDays}d</td>
                  <td className="px-3 py-2">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-semibold ring-1",
                      p.status === "active"
                        ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
                        : "bg-icm-bg text-icm-text-dim ring-icm-border"
                    )}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setPayers((prev) => prev.filter((_, j) => j !== i))}
                      className="text-icm-text-faint hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Footer note */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[12px] text-amber-800">
          You can proceed without payers, but billing rules won't be linkable until payers are added.
        </p>
      </div>
    </div>
  );
}

// ─── Step 4 ───────────────────────────────────────────────────────────────────

type RuleDraft = Omit<ProgramBillingRule, "id" | "createdAt">;

const EMPTY_RULE: RuleDraft = {
  serviceCode: "",
  description: "",
  payerId: "",
  payerName: "",
  rate: 0,
  unit: "15min",
  effectiveDate: "",
  endDate: "",
  status: "active",
};

function Step4({
  draft,
  onChange,
  payers,
  billingRules,
  setBillingRules,
}: {
  draft: ProgramDraft;
  onChange: (d: ProgramDraft) => void;
  payers: PayerDraft[];
  billingRules: RuleDraft[];
  setBillingRules: React.Dispatch<React.SetStateAction<RuleDraft[]>>;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<RuleDraft>({ ...EMPTY_RULE });

  const setBillingDefaults = (k: keyof ProgramDraft["billingDefaults"], v: string | boolean) =>
    onChange({ ...draft, billingDefaults: { ...draft.billingDefaults, [k]: v } });

  const addRule = () => {
    if (!form.serviceCode.trim() || form.rate <= 0) {
      toast.error("Service code and rate are required");
      return;
    }
    setBillingRules((prev) => [...prev, { ...form }]);
    setForm({ ...EMPTY_RULE });
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      {/* Billing defaults */}
      <div>
        <p className={SECTION_TITLE_CLS}>Billing defaults</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={LABEL_CLS}>Default billing unit</label>
            <select className={INPUT_CLS} value={draft.billingDefaults.defaultBillingUnit}
              onChange={(e) => setBillingDefaults("defaultBillingUnit", e.target.value)}>
              <option value="15min">15 min</option>
              <option value="30min">30 min</option>
              <option value="1hr">1 hour</option>
              <option value="per_visit">Per visit</option>
              <option value="per_day">Per day</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Rounding rule</label>
            <select className={INPUT_CLS} value={draft.billingDefaults.roundingRule}
              onChange={(e) => setBillingDefaults("roundingRule", e.target.value)}>
              <option value="round_nearest">Round nearest</option>
              <option value="round_up">Round up</option>
              <option value="round_down">Round down</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-5">
            <Toggle
              checked={draft.billingDefaults.autoCalcUnitsFromTime}
              onChange={(v) => setBillingDefaults("autoCalcUnitsFromTime", v)}
            />
            <label className="text-[12.5px] text-icm-text">Auto-calc units from time</label>
          </div>
        </div>
      </div>

      {/* Billing rules table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className={SECTION_TITLE_CLS}>Billing rules</p>
          {!adding && (
            <button type="button" onClick={() => setAdding(true)}
              className="h-9 px-4 rounded-xl bg-teal-600 text-white font-semibold text-[12px] hover:bg-teal-700 inline-flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add billing rule
            </button>
          )}
        </div>

        {/* Inline form */}
        {adding && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3 mb-4">
            <p className="text-[12px] font-semibold text-teal-800">New billing rule</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Service code *</label>
                <input className={INPUT_CLS} value={form.serviceCode}
                  onChange={(e) => setForm((f) => ({ ...f, serviceCode: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL_CLS}>Description</label>
                <input className={INPUT_CLS} value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL_CLS}>Payer</label>
                <select className={INPUT_CLS} value={form.payerId}
                  onChange={(e) => {
                    const p = payers.find((p) => p.payerId === e.target.value);
                    setForm((f) => ({ ...f, payerId: e.target.value, payerName: p?.payerName ?? "" }));
                  }}>
                  <option value="">No payer</option>
                  {payers.map((p) => (
                    <option key={p.payerId} value={p.payerId}>{p.payerName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Rate * ($)</label>
                <input type="number" className={INPUT_CLS} value={form.rate || ""}
                  onChange={(e) => setForm((f) => ({ ...f, rate: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className={LABEL_CLS}>Unit</label>
                <select className={INPUT_CLS} value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
                  <option value="15min">15 min</option>
                  <option value="30min">30 min</option>
                  <option value="1hr">1 hour</option>
                  <option value="per_visit">Per visit</option>
                  <option value="per_day">Per day</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Status</label>
                <select className={INPUT_CLS} value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "active" | "inactive" }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Effective date</label>
                <input type="date" className={INPUT_CLS} value={form.effectiveDate}
                  onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} />
              </div>
              <div>
                <label className={LABEL_CLS}>End date</label>
                <input type="date" className={INPUT_CLS} value={form.endDate ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setAdding(false)}
                className="h-9 px-4 rounded-xl border border-icm-border text-[12px] font-semibold text-icm-text-dim hover:text-icm-text">
                Cancel
              </button>
              <button type="button" onClick={addRule}
                className="h-9 px-4 rounded-xl bg-teal-600 text-white font-semibold text-[12px] hover:bg-teal-700">
                Add
              </button>
            </div>
          </div>
        )}

        {billingRules.length === 0 && !adding ? (
          <div className="rounded-xl border-2 border-dashed border-icm-border p-6 text-center">
            <p className="text-[13px] text-icm-text-dim">No billing rules yet. Add rules to link service codes to payers and rates.</p>
          </div>
        ) : billingRules.length > 0 ? (
          <div className="rounded-xl border border-icm-border overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead className="bg-icm-bg border-b border-icm-border">
                <tr>
                  {["Code", "Description", "Payer", "Rate", "Unit", "Status", ""].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-icm-text-dim">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-icm-border">
                {billingRules.map((r, i) => (
                  <tr key={i} className="hover:bg-icm-bg/50">
                    <td className="px-3 py-2 font-mono font-semibold text-icm-text">{r.serviceCode}</td>
                    <td className="px-3 py-2 text-icm-text-dim">{r.description || "—"}</td>
                    <td className="px-3 py-2 text-icm-text-dim">{r.payerName || "—"}</td>
                    <td className="px-3 py-2 text-icm-text">${r.rate.toFixed(2)}</td>
                    <td className="px-3 py-2 text-icm-text-dim">{r.unit}</td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-semibold ring-1",
                        r.status === "active"
                          ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
                          : "bg-icm-bg text-icm-text-dim ring-icm-border"
                      )}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button type="button"
                        onClick={() => setBillingRules((prev) => prev.filter((_, j) => j !== i))}
                        className="text-icm-text-faint hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Step 5 ───────────────────────────────────────────────────────────────────

function Step5({
  draft,
  onChange,
  payers,
  billingRules,
}: {
  draft: ProgramDraft;
  onChange: (d: ProgramDraft) => void;
  payers: PayerDraft[];
  billingRules: RuleDraft[];
}) {
  const setSig = (k: keyof ProgramDraft["signatureRequirements"], v: boolean) =>
    onChange({ ...draft, signatureRequirements: { ...draft.signatureRequirements, [k]: v } });
  const setApproval = (k: keyof ProgramDraft["supervisorApproval"], v: boolean | number) =>
    onChange({ ...draft, supervisorApproval: { ...draft.supervisorApproval, [k]: v } });

  const [reviewOpen, setReviewOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Signature requirements */}
      <div>
        <p className={SECTION_TITLE_CLS}>Signature requirements</p>
        <div className="rounded-xl border border-icm-border bg-icm-panel divide-y divide-icm-border overflow-hidden">
          {(
            [
              { key: "caseManager" as const, label: "Case Manager" },
              { key: "supervisor" as const, label: "Supervisor" },
              { key: "participant" as const, label: "Participant" },
              { key: "guardian" as const, label: "Guardian" },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3">
              <span className="text-[13px] text-icm-text">{label}</span>
              <Toggle
                checked={draft.signatureRequirements[key]}
                onChange={(v) => setSig(key, v)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Supervisor approval */}
      <div>
        <p className={SECTION_TITLE_CLS}>Supervisor approval</p>
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-icm-border">
            <div>
              <p className="text-[13px] font-semibold text-icm-text">Require supervisor approval before billing submission</p>
            </div>
            <Toggle
              checked={draft.supervisorApproval.required}
              onChange={(v) => setApproval("required", v)}
            />
          </div>
          {draft.supervisorApproval.required && (
            <>
              {(
                [
                  { key: "progressNotes" as const, label: "Progress Notes" },
                  { key: "contactNotes" as const, label: "Contact Notes" },
                  { key: "visitSummaries" as const, label: "Visit Summaries" },
                  { key: "monitoringForms" as const, label: "Monitoring Forms" },
                ] as const
              ).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between px-4 py-3 border-b border-icm-border pl-8">
                  <span className="text-[12.5px] text-icm-text">{label}</span>
                  <Toggle
                    checked={draft.supervisorApproval[key]}
                    onChange={(v) => setApproval(key, v)}
                  />
                </div>
              ))}
              <div className="flex items-center gap-3 px-4 py-3">
                <label className="text-[12.5px] text-icm-text">
                  Notes pending review longer than
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-20 h-8 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-center focus:outline-none"
                  value={draft.supervisorApproval.overdueThresholdHours}
                  onChange={(e) => setApproval("overdueThresholdHours", parseInt(e.target.value) || 24)}
                />
                <span className="text-[12.5px] text-icm-text-dim">hours are flagged overdue</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Review accordion */}
      <div className="rounded-xl border border-icm-border overflow-hidden">
        <button
          type="button"
          onClick={() => setReviewOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-icm-bg hover:bg-icm-bg/70 text-left"
        >
          <span className="text-[12.5px] font-semibold text-icm-text">Review all settings</span>
          <ChevronLeft className={cn("w-4 h-4 text-icm-text-dim transition-transform", reviewOpen ? "-rotate-90" : "rotate-180")} />
        </button>
        {reviewOpen && (
          <div className="p-4 space-y-3 text-[12px] text-icm-text-dim">
            <p><strong className="text-icm-text">Name:</strong> {draft.name || "—"}</p>
            <p><strong className="text-icm-text">Abbreviation:</strong> {draft.abbreviation || "—"}</p>
            <p><strong className="text-icm-text">State:</strong> {draft.stateName || draft.state || "—"}</p>
            <p><strong className="text-icm-text">Funding type:</strong> {draft.fundingType.replace(/_/g, " ")}</p>
            <p><strong className="text-icm-text">Status:</strong> {draft.status}</p>
            <p><strong className="text-icm-text">Payers:</strong> {payers.length} configured</p>
            <p><strong className="text-icm-text">Billing rules:</strong> {billingRules.length} configured</p>
            <p><strong className="text-icm-text">NPI (Type 2):</strong> {draft.providerEnrollment.npiType2 || "—"}</p>
            <p><strong className="text-icm-text">Clearinghouse:</strong> {draft.clearinghouse.name || "—"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProgramConfigure() {
  const { programId } = useParams<{ programId?: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId ?? "";
  const uid = userProfile?.uid ?? "";

  const isNew = !programId || programId === "new";
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ProgramDraft>({ ...INITIAL_DRAFT });
  const [payers, setPayers] = useState<PayerDraft[]>([]);
  const [billingRules, setBillingRules] = useState<RuleDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadedName, setLoadedName] = useState<string>("");

  // Load existing program on edit
  useEffect(() => {
    if (isNew || !programId) return;
    async function load() {
      const snap = await getDoc(doc(db, "programs", programId as string));
      if (!snap.exists()) return;
      const data = snap.data() as Partial<Program>;
      setLoadedName(data.name ?? "");
      setDraft({
        name: data.name ?? "",
        abbreviation: data.abbreviation ?? data.code ?? "",
        state: data.state ?? "",
        stateName: data.stateName ?? data.state ?? "",
        fundingType: data.fundingType ?? "medicaid",
        description: data.description ?? "",
        status: data.status ?? (data.active === false ? "inactive" : "active"),
        providerEnrollment: {
          npiType2: data.providerEnrollment?.npiType2 ?? "",
          taxIdEin: data.providerEnrollment?.taxIdEin ?? "",
          medicaidProviderId: data.providerEnrollment?.medicaidProviderId ?? "",
          effectiveDate: data.providerEnrollment?.effectiveDate ?? "",
          expirationDate: data.providerEnrollment?.expirationDate ?? "",
        },
        billingContact: {
          name: data.billingContact?.name ?? "",
          phone: data.billingContact?.phone ?? "",
          email: data.billingContact?.email ?? "",
          sameAsOrgAddress: data.billingContact?.sameAsOrgAddress ?? true,
          payToAddress: data.billingContact?.payToAddress ?? "",
        },
        clearinghouse: {
          name: data.clearinghouse?.name ?? "",
          submitterId: data.clearinghouse?.submitterId ?? "",
          claimFormat: data.clearinghouse?.claimFormat ?? "837P",
          electronicRemittance: data.clearinghouse?.electronicRemittance ?? false,
        },
        signatureRequirements: {
          caseManager: data.signatureRequirements?.caseManager ?? true,
          supervisor: data.signatureRequirements?.supervisor ?? false,
          participant: data.signatureRequirements?.participant ?? false,
          guardian: data.signatureRequirements?.guardian ?? false,
        },
        supervisorApproval: {
          required: data.supervisorApproval?.required ?? false,
          progressNotes: data.supervisorApproval?.progressNotes ?? false,
          contactNotes: data.supervisorApproval?.contactNotes ?? false,
          visitSummaries: data.supervisorApproval?.visitSummaries ?? false,
          monitoringForms: data.supervisorApproval?.monitoringForms ?? false,
          overdueThresholdHours: data.supervisorApproval?.overdueThresholdHours ?? 24,
        },
        billingDefaults: {
          defaultBillingUnit: data.billingRules?.defaultBillingUnit ?? "15min",
          roundingRule: data.billingRules?.roundingRule ?? "round_nearest",
          autoCalcUnitsFromTime: data.billingRules?.autoCalcUnitsFromTime ?? true,
        },
      });

      // Load payers subcollection
      const payersSnap = await getDocs(collection(db, "programs", programId as string, "payers"));
      setPayers(payersSnap.docs.map((d) => {
        const p = d.data() as ProgramPayer;
        return {
          payerName: p.payerName,
          payerId: p.payerId,
          type: p.type,
          filingDeadlineDays: p.filingDeadlineDays,
          status: p.status,
          electronicBilling: p.electronicBilling,
        };
      }));

      // Load billingRules subcollection
      const rulesSnap = await getDocs(collection(db, "programs", programId as string, "billingRules"));
      setBillingRules(rulesSnap.docs.map((d) => {
        const r = d.data() as ProgramBillingRule;
        return {
          serviceCode: r.serviceCode,
          description: r.description,
          payerId: r.payerId,
          payerName: r.payerName,
          rate: r.rate,
          unit: r.unit,
          effectiveDate: r.effectiveDate,
          endDate: r.endDate,
          status: r.status,
        };
      }));
    }
    load().catch(console.error);
  }, [isNew, programId]);

  const validateStep = useCallback(
    (s: number): string | null => {
      if (s === 1) {
        if (!draft.name.trim()) return "Program name is required";
        if (!draft.abbreviation.trim()) return "Abbreviation is required";
        if (!draft.state) return "State is required";
        if (!draft.fundingType) return "Funding type is required";
      }
      return null;
    },
    [draft]
  );

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    setStep((s) => Math.min(s + 1, 5));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSave = async () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    if (!orgId) { toast.error("No organization found"); return; }
    setSaving(true);
    try {
      const programData: Partial<Program> = {
        name: draft.name.trim(),
        abbreviation: draft.abbreviation.trim(),
        state: draft.state,
        stateName: draft.stateName,
        fundingType: draft.fundingType,
        description: draft.description,
        status: draft.status,
        active: draft.status === "active",
        providerEnrollment: {
          npiType2: draft.providerEnrollment.npiType2,
          taxIdEin: draft.providerEnrollment.taxIdEin,
          medicaidProviderId: draft.providerEnrollment.medicaidProviderId,
          effectiveDate: draft.providerEnrollment.effectiveDate,
          expirationDate: draft.providerEnrollment.expirationDate || undefined,
          enrollmentStatus: "active",
        },
        billingContact: {
          name: draft.billingContact.name,
          phone: draft.billingContact.phone,
          email: draft.billingContact.email,
          sameAsOrgAddress: draft.billingContact.sameAsOrgAddress,
          payToAddress: draft.billingContact.payToAddress || undefined,
        },
        clearinghouse: {
          name: draft.clearinghouse.name,
          submitterId: draft.clearinghouse.submitterId,
          claimFormat: draft.clearinghouse.claimFormat as Program["clearinghouse"] extends { claimFormat: infer C } ? C : never,
          electronicRemittance: draft.clearinghouse.electronicRemittance,
        },
        signatureRequirements: draft.signatureRequirements,
        supervisorApproval: draft.supervisorApproval,
        billingRules: {
          defaultBillingUnit: draft.billingDefaults.defaultBillingUnit as Program["billingRules"] extends { defaultBillingUnit: infer U } ? U : never,
          roundingRule: draft.billingDefaults.roundingRule as Program["billingRules"] extends { roundingRule: infer R } ? R : never,
          autoCalcUnitsFromTime: draft.billingDefaults.autoCalcUnitsFromTime,
        },
      };

      const savedId = await saveProgram(
        orgId,
        programData,
        isNew ? undefined : programId,
        uid
      );

      for (const p of payers) {
        await addProgramPayer(savedId, p);
      }
      for (const r of billingRules) {
        await addProgramBillingRule(savedId, r);
      }

      toast.success(`${draft.name} saved successfully.`);
      navigate("/settings/programs");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save program");
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = isNew ? "Add program" : `Configure: ${loadedName || draft.name}`;

  return (
    <ICMShell title={pageTitle}>
      <div className="pb-24">
        <div className="mb-4">
          <Breadcrumbs
            items={[
              { label: "Admin Settings", to: "/settings" },
              { label: "Programs & States", to: "/settings/programs" },
              { label: isNew ? "New Program" : (loadedName || draft.name || "Configure") },
            ]}
          />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="font-manrope font-bold text-[26px] text-icm-text">{pageTitle}</h1>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/settings/programs")}
              className="text-[12.5px] text-icm-text-dim hover:text-icm-text font-semibold"
            >
              Exit
            </button>
          </div>
        </div>

        <StepIndicator current={step} onGoTo={setStep} />

        {/* Step content */}
        <div className="max-w-3xl mx-auto">
          {step === 1 && <Step1 draft={draft} onChange={setDraft} />}
          {step === 2 && <Step2 draft={draft} onChange={setDraft} />}
          {step === 3 && <Step3 payers={payers} setPayers={setPayers} />}
          {step === 4 && (
            <Step4
              draft={draft}
              onChange={setDraft}
              payers={payers}
              billingRules={billingRules}
              setBillingRules={setBillingRules}
            />
          )}
          {step === 5 && (
            <Step5
              draft={draft}
              onChange={setDraft}
              payers={payers}
              billingRules={billingRules}
            />
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-icm-panel border-t border-icm-border px-6 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="h-9 px-4 rounded-xl border border-icm-border text-[12px] font-semibold text-icm-text-dim hover:text-icm-text disabled:opacity-30 inline-flex items-center gap-1.5"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="flex items-center gap-3">
          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="h-9 px-4 rounded-xl bg-teal-600 text-white font-semibold text-[12px] hover:bg-teal-700"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-4 rounded-xl bg-teal-600 text-white font-semibold text-[12px] hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving ? "Saving…" : "Save program"}
            </button>
          )}
        </div>
      </div>
    </ICMShell>
  );
}
