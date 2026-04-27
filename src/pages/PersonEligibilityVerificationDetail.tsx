import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Sparkles, Save, Printer, Upload, X, AlertTriangle,
  CheckCircle2, FileText, ShieldCheck, History, Plus, Trash2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { PersonAIPanel } from "@/components/icm/PersonAIPanel";
import { getPerson } from "@/data/people";
import {
  getEligibilityRecord, buildAIPreFilledEligibility, getEligibilityForPerson,
  daysUntil, complianceToneFor,
  type EligibilityVerification, type MAStatus, type MAType, type RecordStatus,
  type FundingSource,
} from "@/data/eligibility";
import type { AISuggestion } from "@/data/people";

const eligibilitySuggestions: AISuggestion[] = [
  { tone: "urgent", label: "Urgent", body: "MA redetermination is overdue. Start renewal immediately to prevent service lapse.", cta: "Start renewal" },
  { tone: "insight", label: "Insight", body: "Upload a current MA verification screenshot from the state portal to refresh the record.", cta: "Upload" },
  { tone: "insight", label: "Insight", body: "Adding an accurate redetermination date enables automatic compliance tracking.", cta: "Update field" },
  { tone: "good", label: "Good news", body: "Continuous Medicaid eligibility since 09/01/2022 — no lapses on file.", cta: "View history" },
];

const MA_STATUS_OPTIONS: MAStatus[] = [
  "MA Eligible — Active",
  "MA Eligible — Renewal Pending",
  "MA Eligible — Pending Approval",
  "MA Ineligible — Suspended",
  "MA Ineligible — Terminated",
  "MA Ineligible — Not Found",
  "Unknown — Verification Needed",
];
const MA_TYPE_OPTIONS: MAType[] = ["Waiver Related", "SSI Related", "Medicare/Medicaid Dual", "Spend-Down", "Other"];

const PersonEligibilityVerificationDetail = () => {
  const { id, verificationId } = useParams<{ id: string; verificationId: string }>();
  const navigate = useNavigate();
  const person = getPerson(id ?? "");

  const isNew = verificationId === "new";
  const initial = useMemo<EligibilityVerification | undefined>(() => {
    if (!person) return undefined;
    if (isNew) return buildAIPreFilledEligibility(person.id);
    return getEligibilityRecord(verificationId ?? "");
  }, [person, isNew, verificationId]);

  const [form, setForm] = useState<EligibilityVerification | undefined>(initial);
  const [showAIBanner, setShowAIBanner] = useState(true);
  const [docProcessing, setDocProcessing] = useState<"idle" | "processing" | "done">("idle");
  const [reminderCreated, setReminderCreated] = useState(false);
  const [showFundingForm, setShowFundingForm] = useState(false);

  if (!person || !form) {
    return (
      <ICMShell title="Eligibility Verification" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Record not found.</p>
      </ICMShell>
    );
  }

  const update = <K extends keyof EligibilityVerification>(k: K, v: EligibilityVerification[K]) =>
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev));
  const aiSourceFor = (k: keyof EligibilityVerification) => form.aiFields?.[k];

  const days = daysUntil(form.redeterminationDate);
  const overdue = days !== undefined && days < 0;
  const tone = complianceToneFor(days);

  const simulateUpload = () => {
    update("documentName", "MA_Verification_Upload.pdf");
    update("documentUploadedOn", new Date().toLocaleDateString("en-US"));
    setDocProcessing("processing");
    setTimeout(() => setDocProcessing("done"), 2000);
  };

  const fillFromDocument = () => {
    setForm((prev) => prev ? {
      ...prev,
      maStatus: "MA Eligible — Active",
      effectiveDate: "08/01/2023",
      redeterminationDate: "08/01/2024",
      aiFields: {
        ...(prev.aiFields ?? {}),
        maStatus: "Uploaded document",
        effectiveDate: "Uploaded document",
        redeterminationDate: "Uploaded document",
      },
    } : prev);
    setDocProcessing("idle");
  };

  return (
    <ICMShell title="Eligibility Verification" rightPanel={<PersonAIPanel person={person} suggestions={eligibilitySuggestions} intro={`${eligibilitySuggestions.length} suggestions for ${person.firstName}.`} />}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <button onClick={() => navigate(`/people/${person.id}/eligibility-verification`)} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text mb-2">
              <ChevronLeft className="w-3.5 h-3.5" />
              Eligibility Verifications
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              {!isNew && (
                <span className="px-2 py-0.5 rounded-md bg-icm-bg border border-icm-border text-[11px] font-mono text-icm-text">
                  ID #{form.id}
                </span>
              )}
              <RecordStatusPill status={form.recordStatus} />
              <span className="text-[11px] text-icm-text-faint font-geist">
                Last saved {form.updatedOn} · Autosaved
              </span>
            </div>
            <h1 className="font-manrope text-[24px] font-extrabold text-icm-text leading-tight tracking-[-0.02em] mt-2">
              {person.lastName}, {person.firstName}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 inline-flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> Save
            </button>
            <button className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={simulateUpload} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Upload document
            </button>
          </div>
        </div>

        {showAIBanner && (
          <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-[12.5px] font-geist text-icm-text leading-snug">
                <span className="font-semibold">
                  {overdue ? "Medicaid renewal is overdue." : "Medicaid tracking active."}
                </span>{" "}
                <span className="text-icm-text-dim">
                  I've pre-filled known fields from {person.firstName}'s profile. Upload the verification document when available.
                </span>
              </p>
            </div>
            <button onClick={() => setShowAIBanner(false)} className="p-1 rounded hover:bg-white/50 text-icm-text-dim shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SECTION 1: Eligibility Status */}
        <Section title="Current Eligibility Status" titleIcon={<ShieldCheck className="w-4 h-4 text-icm-accent" />}>
          <Grid2>
            <Field label="MA Status" required>
              <select value={form.maStatus} onChange={(e) => update("maStatus", e.target.value as MAStatus)} className={selectCls}>
                {MA_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="MA Type">
              <select value={form.maType ?? ""} onChange={(e) => update("maType", e.target.value as MAType)} className={selectCls}>
                <option value="">Select type</option>
                {MA_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Medical Assistance / Medicaid ID Number" aiSource={aiSourceFor("maNumber")}>
              <input type="text" maxLength={11} value={form.maNumber ?? ""} onChange={(e) => update("maNumber", e.target.value)} placeholder="e.g. 12345678978" className={inputCls} />
            </Field>
            <Field label="Has SSI and/or Redetermination not applicable?">
              <div className="flex items-center gap-3 h-9">
                <ToggleInline checked={form.ssiOrNoRedetermination ?? false} onChange={(v) => update("ssiOrNoRedetermination", v)} />
                {form.ssiOrNoRedetermination && (
                  <span className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">Not applicable</span>
                )}
              </div>
            </Field>
          </Grid2>
        </Section>

        {/* SECTION 2: Verification Dates */}
        <Section title="Verification Dates">
          <Grid2>
            <Field label="MA Status Verification Date" required aiSource={aiSourceFor("verificationDate")}>
              <input type="text" value={form.verificationDate ?? ""} onChange={(e) => update("verificationDate", e.target.value)} placeholder="MM/DD/YYYY" className={inputCls} />
            </Field>
            <Field label="Effective Date" aiSource={aiSourceFor("effectiveDate")}>
              <input type="text" value={form.effectiveDate ?? ""} onChange={(e) => update("effectiveDate", e.target.value)} placeholder="MM/DD/YYYY" className={inputCls} />
            </Field>
            <Field label="Application Date">
              <input type="text" value={form.applicationDate ?? ""} onChange={(e) => update("applicationDate", e.target.value)} placeholder="MM/DD/YYYY" className={inputCls} />
            </Field>
            <Field label="Renewal Date">
              <input type="text" value={form.renewalDate ?? ""} onChange={(e) => update("renewalDate", e.target.value)} placeholder="MM/DD/YYYY" className={inputCls} />
            </Field>
          </Grid2>
          <Field label="Redetermination Date" aiSource={aiSourceFor("redeterminationDate")}>
            <input type="text" value={form.redeterminationDate ?? ""} onChange={(e) => update("redeterminationDate", e.target.value)} placeholder="MM/DD/YYYY" className={inputCls} />
            {form.redeterminationDate && <ComplianceIndicator days={days} overdue={overdue} tone={tone} />}
            {form.redeterminationDate && !reminderCreated && (
              <div className="mt-2 rounded-lg border border-icm-accent/20 bg-icm-accent-soft px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[11.5px] font-geist text-icm-text">
                  <Sparkles className="w-3 h-3 text-icm-accent inline mr-1" />
                  Want me to create a reminder task 30 days before this date?
                </p>
                <button onClick={() => setReminderCreated(true)} className="text-[11.5px] font-semibold text-icm-accent hover:underline">
                  Yes, create task
                </button>
              </div>
            )}
            {reminderCreated && (
              <div className="mt-2 rounded-lg border border-icm-green/20 bg-icm-green-soft px-3 py-2 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-icm-green" />
                <p className="text-[11.5px] font-geist text-icm-green">Reminder task created in Case Management.</p>
              </div>
            )}
          </Field>
        </Section>

        {/* SECTION 3: Document Upload */}
        <Section title="Verification Document" titleIcon={<FileText className="w-4 h-4 text-icm-text-dim" />}>
          <Field label="Upload Document Type">
            <select value={form.documentType ?? ""} onChange={(e) => update("documentType", e.target.value)} className={selectCls}>
              <option value="">Select type</option>
              <option>MA Verification Letter</option>
              <option>MMIS Screenshot</option>
              <option>Online Verification Screenshot</option>
              <option>State Portal Export</option>
              <option>Other</option>
            </select>
          </Field>
          {!form.documentName ? (
            <button
              onClick={simulateUpload}
              className="w-full rounded-xl border-2 border-dashed border-icm-border hover:border-icm-accent hover:bg-icm-accent-soft/30 px-6 py-8 flex flex-col items-center gap-2 transition-colors"
            >
              <Upload className="w-7 h-7 text-icm-text-faint" />
              <p className="text-[12.5px] font-geist text-icm-text font-medium">Drop verification document here or click to browse</p>
              <p className="text-[11px] text-icm-text-dim">PDF, PNG, JPG accepted</p>
            </button>
          ) : (
            <div className="rounded-xl border border-icm-border bg-icm-bg/40 px-3.5 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-icm-accent shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-geist text-icm-text font-medium truncate">{form.documentName}</p>
                  <p className="text-[11px] text-icm-text-dim font-mono">Uploaded {form.documentUploadedOn}</p>
                </div>
              </div>
              <button className="text-[11.5px] font-semibold text-icm-accent hover:underline shrink-0">View document</button>
            </div>
          )}
          {docProcessing === "processing" && (
            <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-3.5 py-2.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-icm-accent animate-pulse" />
              <p className="text-[12px] font-geist text-icm-text">
                I'm reading this document. I'll extract the eligibility status, effective dates, and redetermination date automatically.
              </p>
            </div>
          )}
          {docProcessing === "done" && (
            <div className="rounded-xl border border-icm-green/20 bg-icm-green-soft px-3.5 py-3">
              <div className="flex items-start gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-icm-green mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12.5px] font-geist text-icm-text font-semibold">Document processed. I found:</p>
                  <ul className="text-[12px] font-geist text-icm-text-dim mt-1 space-y-0.5">
                    <li>· Status: MA Eligible — Active</li>
                    <li>· Effective Date: 08/01/2023</li>
                    <li>· Redetermination Date: 08/01/2024</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button onClick={fillFromDocument} className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-medium hover:opacity-90">
                  Yes, fill fields
                </button>
                <button onClick={() => setDocProcessing("idle")} className="h-8 px-3 rounded-lg border border-icm-border text-[11.5px] font-medium text-icm-text-dim hover:text-icm-text">
                  No thanks
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* SECTION 4: Notes */}
        <Section title="Notes">
          <Field label="Additional notes">
            <textarea value={form.notes ?? ""} onChange={(e) => update("notes", e.target.value)} maxLength={4000} rows={4} className={textareaCls} placeholder="Any additional context about this verification or the individual's eligibility status" />
          </Field>
        </Section>

        {/* SECTION 5: Multi-funding sources */}
        <Section title="Additional Funding Sources">
          {(form.fundingSources ?? []).length === 0 && !showFundingForm && (
            <p className="text-[12px] font-geist text-icm-text-dim">No additional funding sources recorded.</p>
          )}
          {(form.fundingSources ?? []).map((f) => (
            <div key={f.id} className="rounded-lg border border-icm-border bg-icm-bg/40 px-3 py-2 flex items-center justify-between">
              <div className="text-[12px] font-geist text-icm-text">
                <span className="font-semibold">{f.type}</span>
                {f.policyNumber && <span className="text-icm-text-dim font-mono"> · {f.policyNumber}</span>}
                {f.renewalDate && <span className="text-icm-text-dim"> · Renewal {f.renewalDate}</span>}
              </div>
              <button onClick={() => update("fundingSources", (form.fundingSources ?? []).filter(x => x.id !== f.id))} className="p-1 text-icm-text-faint hover:text-icm-red">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {!showFundingForm ? (
            <button onClick={() => setShowFundingForm(true)} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add funding source
            </button>
          ) : (
            <FundingSourceForm
              onAdd={(fs) => {
                update("fundingSources", [...(form.fundingSources ?? []), fs]);
                setShowFundingForm(false);
              }}
              onCancel={() => setShowFundingForm(false)}
            />
          )}
        </Section>

        {/* HISTORY TIMELINE */}
        <Section title="Eligibility History" titleIcon={<History className="w-4 h-4 text-icm-text-dim" />}>
          <Timeline personId={person.id} />
        </Section>
      </div>
    </ICMShell>
  );
};

const inputCls =
  "w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text font-geist focus:outline-none focus:border-icm-accent disabled:bg-icm-bg disabled:text-icm-text-dim";
const selectCls = inputCls;
const textareaCls =
  "w-full px-3 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text font-geist leading-relaxed focus:outline-none focus:border-icm-accent";

function Section({ title, titleIcon, children }: { title: string; titleIcon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        {titleIcon}
        <h2 className="font-manrope font-bold text-[15px] text-icm-text tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, required, aiSource, children }: { label: string; required?: boolean; aiSource?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint font-geist">
          {label}{required && <span className="text-icm-red">*</span>}
        </label>
        {aiSource && (
          <span title={`From ${aiSource}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-geist font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20">
            <Sparkles className="w-2.5 h-2.5" /> AI suggested
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function ToggleInline({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`shrink-0 w-10 h-5 rounded-full transition-colors relative ${checked ? "bg-icm-accent" : "bg-icm-border"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? "left-5" : "left-0.5"}`} />
    </button>
  );
}

function RecordStatusPill({ status }: { status: RecordStatus }) {
  const tone =
    status === "Active" ? "bg-icm-green-soft text-icm-green ring-icm-green/20" :
    status === "Pending" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20" :
    status === "Inactive" ? "bg-icm-red-soft text-icm-red ring-icm-red/20" :
    "bg-icm-accent-soft text-icm-accent ring-icm-accent/20";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 ${tone}`}>{status}</span>;
}

function ComplianceIndicator({ days, overdue, tone }: { days?: number; overdue: boolean; tone: "green" | "amber" | "red" }) {
  if (days === undefined) return null;
  const cls =
    overdue ? "text-icm-red animate-pulse" :
    tone === "red" ? "text-icm-red" :
    tone === "amber" ? "text-icm-amber" :
    "text-icm-green";
  const Icon = overdue || tone === "red" ? AlertTriangle : tone === "amber" ? AlertTriangle : CheckCircle2;
  const message =
    overdue ? `OVERDUE by ${Math.abs(days)} days — action required now` :
    days < 30 ? `Due in ${days} days — immediate action needed` :
    days < 60 ? `Due in ${days} days — start process soon` :
    `Redetermination due in ${days} days — on track`;
  return (
    <p className={`mt-2 text-[11.5px] font-geist font-medium inline-flex items-center gap-1.5 ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {message}
    </p>
  );
}

function FundingSourceForm({ onAdd, onCancel }: { onAdd: (fs: FundingSource) => void; onCancel: () => void }) {
  const [type, setType] = useState<FundingSource["type"]>("Medicare");
  const [policyNumber, setPolicyNumber] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");

  return (
    <div className="rounded-lg border border-icm-border bg-icm-bg/40 p-3 space-y-2">
      <Grid2>
        <Field label="Funding Type">
          <select value={type} onChange={(e) => setType(e.target.value as FundingSource["type"])} className={selectCls}>
            <option>Medicare</option>
            <option>State funding</option>
            <option>County funding</option>
            <option>Private insurance</option>
            <option>Self-pay</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="Policy / ID Number">
          <input value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Effective Date">
          <input value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} placeholder="MM/DD/YYYY" className={inputCls} />
        </Field>
        <Field label="Renewal Date">
          <input value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} placeholder="MM/DD/YYYY" className={inputCls} />
        </Field>
      </Grid2>
      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} className="h-8 px-3 rounded-lg border border-icm-border text-[11.5px] font-medium text-icm-text-dim hover:text-icm-text">Cancel</button>
        <button
          onClick={() => onAdd({ id: `fs-${Date.now()}`, type, policyNumber, effectiveDate, renewalDate })}
          className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-medium hover:opacity-90"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function Timeline({ personId }: { personId: string }) {
  const records = getEligibilityForPerson(personId);
  if (records.length === 0) {
    return <p className="text-[12px] font-geist text-icm-text-dim">No history yet.</p>;
  }
  return (
    <ol className="space-y-3">
      {records.map((r) => (
        <li key={r.id} className="flex items-start gap-3">
          <div className="mt-1 w-2 h-2 rounded-full bg-icm-green ring-4 ring-icm-green/15" />
          <div className="min-w-0 flex-1 rounded-lg border border-icm-border bg-icm-bg/40 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-mono text-[12px] font-bold text-icm-text">{r.verificationDate}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
                {r.maStatus}
              </span>
            </div>
            <div className="text-[11.5px] font-geist text-icm-text-dim mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-mono">MA #{r.maNumber}</span>
              <span>·</span>
              <span>Verified by {r.updatedBy}</span>
              {r.documentName && (
                <>
                  <span>·</span>
                  <button className="inline-flex items-center gap-1 text-icm-accent hover:underline">
                    <FileText className="w-3 h-3" /> Document uploaded
                  </button>
                </>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default PersonEligibilityVerificationDetail;
