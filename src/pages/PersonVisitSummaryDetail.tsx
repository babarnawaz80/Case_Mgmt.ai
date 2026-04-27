import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Sparkles, Save, Send, Printer, X, ShieldAlert,
  CalendarClock, AlertTriangle, CheckCircle2, FileSignature,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { PersonAIPanel } from "@/components/icm/PersonAIPanel";
import { getPerson } from "@/data/people";
import {
  getVisitSummary,
  buildAIPreFilledVisit,
  type VisitSummary,
  type VisitStatus,
} from "@/data/visitSummaries";
import type { AISuggestion } from "@/data/people";

const visitSuggestions: AISuggestion[] = [
  { tone: "urgent", label: "Urgent", body: "Last visit was 5 months ago. I pre-filled this visit summary from the 04/27 ambient session. 3 minutes to complete.", cta: "Review fields" },
  { tone: "insight", label: "Insight", body: "Next visit must be scheduled by 07/27/2026 to remain compliant.", cta: "Confirm date" },
  { tone: "insight", label: "Insight", body: "Behavioral changes were flagged in 2 recent sessions — already noted in What is Not Working.", cta: "Review section" },
  { tone: "good", label: "Good news", body: "Compliance rate: 100% for in-person visits over the past 8 months.", cta: "View history" },
];

type ComplianceTone = "green" | "amber" | "red";

const PersonVisitSummaryDetail = () => {
  const { id, visitId } = useParams<{ id: string; visitId: string }>();
  const navigate = useNavigate();
  const person = getPerson(id ?? "");

  const isNew = visitId === "new";
  const initial = useMemo<VisitSummary | undefined>(() => {
    if (!person) return undefined;
    if (isNew) return buildAIPreFilledVisit(person.id);
    return getVisitSummary(visitId ?? "");
  }, [person, isNew, visitId]);

  const [form, setForm] = useState<VisitSummary | undefined>(initial);
  const [showSubmit, setShowSubmit] = useState(false);
  const [reviewedAI, setReviewedAI] = useState(false);
  const [showAIBanner, setShowAIBanner] = useState(true);

  if (!person || !form) {
    return (
      <ICMShell title="Visit Summary" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Visit not found.</p>
      </ICMShell>
    );
  }

  const isReadOnly = form.status === "Submitted" || form.status === "Signed";
  const update = <K extends keyof VisitSummary>(k: K, v: VisitSummary[K]) =>
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev));
  const aiSourceFor = (k: keyof VisitSummary) => form.aiFields?.[k];

  // Compliance window for next visit (mock: quarterly = 90 days)
  const complianceTone: ComplianceTone = (() => {
    if (!form.nextVisitDate) return "red";
    // crude check using mock dates from the seed data
    return form.nextVisitDate === "07/27/2026" ? "green" : "amber";
  })();

  const handleSubmit = () => {
    if (!form) return;
    setForm({ ...form, status: "Submitted" });
    setShowSubmit(false);
  };

  const requiredOK =
    !!form.visitDate && !!form.startTime && !!form.endTime &&
    !!form.location && !!form.purposeOfSupport && !!form.visitSummary &&
    !!form.nextVisitDate;

  return (
    <ICMShell title="Visit Summary" rightPanel={<PersonAIPanel person={person} suggestions={visitSuggestions} intro={`${visitSuggestions.length} suggestions for ${person.firstName}.`} />}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <button onClick={() => navigate(`/people/${person.id}/visit-summary`)} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text mb-2">
              <ChevronLeft className="w-3.5 h-3.5" />
              Visit Summaries
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-icm-bg border border-icm-border text-[11px] font-mono text-icm-text">
                {form.visitDate || "New visit"}
              </span>
              <StatusPill status={form.status} />
              <span className="text-[11px] text-icm-text-faint font-geist">
                Last saved {form.updatedOn} · Autosaved
              </span>
            </div>
            <h1 className="font-manrope text-[24px] font-extrabold text-icm-text leading-tight tracking-[-0.02em] mt-2">
              {person.lastName}, {person.firstName}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isReadOnly && (
              <>
                <button className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Save draft
                </button>
                <button onClick={() => setShowSubmit(true)} disabled={!requiredOK} className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Send className="w-3.5 h-3.5" /> Submit
                </button>
              </>
            )}
            <button className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
              <FileSignature className="w-3.5 h-3.5" /> Request signature
            </button>
          </div>
        </div>

        {isReadOnly && (
          <div className="rounded-xl border border-icm-green/20 bg-icm-green-soft px-4 py-2.5 text-[12px] text-icm-green flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-semibold">Submitted &amp; locked.</span>
            <span className="text-icm-green/80">This visit summary is read-only. Corrections require an addendum note.</span>
          </div>
        )}

        {form.aiPreFilled && showAIBanner && !isReadOnly && (
          <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-[12.5px] font-geist text-icm-text leading-snug">
                <span className="font-semibold">Pre-filled from ambient session 04/27/2026.</span>{" "}
                <span className="text-icm-text-dim">All AI content is labeled. Review and edit before submitting.</span>
              </p>
            </div>
            <button onClick={() => setShowAIBanner(false)} className="p-1 rounded hover:bg-white/50 text-icm-text-dim shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* DETAIL SECTION */}
        <Section title="Visit Details">
          <Grid2>
            <Field label="Person Supported" required>
              <input disabled value={`${person.lastName}, ${person.firstName}`} className={inputCls} />
            </Field>
            <Field label="Case Manager">
              <input disabled value={form.caseManager} className={inputCls} />
            </Field>
            <Field label="Visit Date" required aiSource={aiSourceFor("visitDate")}>
              <input type="text" disabled={isReadOnly} value={form.visitDate ?? ""} onChange={(e) => update("visitDate", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Annual Plan Date" aiSource={aiSourceFor("annualPlanDate")}>
              <input type="text" disabled={isReadOnly} value={form.annualPlanDate ?? ""} onChange={(e) => update("annualPlanDate", e.target.value)} className={inputCls} placeholder="Annual plan renewal date" />
            </Field>
            <Field label="Start Time" required aiSource={aiSourceFor("startTime")}>
              <input type="time" disabled={isReadOnly} value={form.startTime ?? ""} onChange={(e) => update("startTime", e.target.value)} className={inputCls} />
            </Field>
            <Field label="End Time" required aiSource={aiSourceFor("endTime")}>
              <input type="time" disabled={isReadOnly} value={form.endTime ?? ""} onChange={(e) => update("endTime", e.target.value)} className={inputCls} />
            </Field>
          </Grid2>
          <Field label="Location" required aiSource={aiSourceFor("location")}>
            <textarea disabled={isReadOnly} maxLength={8000} value={form.location ?? ""} onChange={(e) => update("location", e.target.value)} className={textareaCls} rows={2} placeholder="Where did this visit take place?" />
          </Field>
          <Field label="Others Present" aiSource={aiSourceFor("othersPresent")}>
            <textarea disabled={isReadOnly} maxLength={8000} value={form.othersPresent ?? ""} onChange={(e) => update("othersPresent", e.target.value)} className={textareaCls} rows={2} placeholder="List all individuals present during the visit" />
          </Field>
        </Section>

        {/* VISIT CONTENT */}
        <Section title="Visit Content">
          <Field label="Purpose of Support" required aiSource={aiSourceFor("purposeOfSupport")}>
            <textarea disabled={isReadOnly} maxLength={8000} value={form.purposeOfSupport ?? ""} onChange={(e) => update("purposeOfSupport", e.target.value)} className={textareaCls} rows={3} />
          </Field>
          <Field label="What is Working?" aiSource={aiSourceFor("whatIsWorking")} hint="AI pulled this from last monitoring form and recent notes">
            <textarea disabled={isReadOnly} maxLength={8000} value={form.whatIsWorking ?? ""} onChange={(e) => update("whatIsWorking", e.target.value)} className={textareaCls} rows={4} />
          </Field>
          <Field label="What is Not Working?" aiSource={aiSourceFor("whatIsNotWorking")} hint="AI pulled this from recent notes and risk flags">
            <textarea disabled={isReadOnly} maxLength={8000} value={form.whatIsNotWorking ?? ""} onChange={(e) => update("whatIsNotWorking", e.target.value)} className={textareaCls} rows={4} />
          </Field>
        </Section>

        {/* HEALTH AND SAFETY */}
        <Section title="Health & Safety" titleIcon={<ShieldAlert className="w-4 h-4 text-icm-amber" />}>
          <div className="rounded-xl border border-icm-amber/20 bg-icm-amber-soft px-3.5 py-2.5 mb-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-icm-amber shrink-0" />
              <p className="text-[12px] font-geist text-icm-text leading-snug">
                <span className="font-semibold">AI found 1 open risk flag for {person.firstName}:</span>{" "}
                <span className="text-icm-text-dim">Behavioral changes reported by caregiver (04/27/2026, Low-Medium severity). Consider documenting here.</span>
              </p>
            </div>
            <button className="text-[11.5px] font-geist font-semibold text-icm-amber hover:underline shrink-0">View flag →</button>
          </div>
          <Field label="Immediate Action Needed" aiSource={aiSourceFor("immediateAction")}>
            <textarea disabled={isReadOnly} maxLength={8000} value={form.immediateAction ?? ""} onChange={(e) => update("immediateAction", e.target.value)} className={textareaCls} rows={3} placeholder="Document any immediate health or safety concerns observed during this visit." />
          </Field>
          <Field label="Visit Summary and Next Steps" required aiSource={aiSourceFor("visitSummary")}>
            <textarea disabled={isReadOnly} maxLength={8000} value={form.visitSummary ?? ""} onChange={(e) => update("visitSummary", e.target.value)} className={textareaCls} rows={5} />
          </Field>
        </Section>

        {/* NEXT VISIT */}
        <Section title="Schedule Next Visit" titleIcon={<CalendarClock className="w-4 h-4 text-icm-accent" />}>
          <ComplianceBanner tone={complianceTone} firstName={person.firstName} />
          <Grid2>
            <Field label="Next Visit Date" required aiSource={aiSourceFor("nextVisitDate")}>
              <input type="text" disabled={isReadOnly} value={form.nextVisitDate ?? ""} onChange={(e) => update("nextVisitDate", e.target.value)} className={inputCls} />
              {form.nextVisitDate === "07/27/2026" && (
                <p className="text-[10.5px] text-icm-text-faint mt-1 font-geist">
                  AI suggests 07/27/2026 (90 days from today — quarterly requirement)
                </p>
              )}
            </Field>
            <Field label="Next Visit Time">
              <input type="time" disabled={isReadOnly} value={form.nextVisitTime ?? ""} onChange={(e) => update("nextVisitTime", e.target.value)} className={inputCls} />
            </Field>
          </Grid2>
          <Field label="Next Visit Location">
            <input type="text" disabled={isReadOnly} value={form.nextVisitLocation ?? ""} onChange={(e) => update("nextVisitLocation", e.target.value)} className={inputCls} placeholder="Where will the next visit take place?" />
          </Field>
          <ToggleRow
            checked={form.addToCalendar ?? true}
            disabled={isReadOnly}
            onChange={(v) => update("addToCalendar", v)}
            title="Add next visit to case manager calendar"
            note="A reminder task will be created in My Work 7 days before this date."
          />
          <ToggleRow
            checked={form.createFollowupTask ?? true}
            disabled={isReadOnly}
            onChange={(v) => update("createFollowupTask", v)}
            title="Create task: Schedule next visit in Case Management"
            note="Auto-created on save pointing to this date."
          />
        </Section>

        {/* SIGNATURES (only after submission) */}
        {(isReadOnly || form.signatures) && (
          <Section title="Signatures">
            <div className="rounded-xl border border-icm-border overflow-hidden">
              <table className="w-full text-[12px] font-geist">
                <thead className="bg-icm-bg/60">
                  <tr>
                    {["Role", "Name", "Status", "Date", ""].map((c) => (
                      <th key={c} className="text-left px-4 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-icm-border">
                  {(form.signatures ?? []).map((s) => (
                    <tr key={s.role}>
                      <td className="px-4 py-2.5 text-icm-text">{s.role}</td>
                      <td className="px-4 py-2.5 text-icm-text-dim">{s.name}</td>
                      <td className="px-4 py-2.5"><SigPill status={s.status} /></td>
                      <td className="px-4 py-2.5 font-mono text-icm-text-dim">{s.signedDate ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right">
                        {s.status === "Pending" && (
                          <button className="text-[11.5px] font-semibold text-icm-accent hover:underline">Request signature</button>
                        )}
                        {s.status === "Not required" && (
                          <button className="text-[11.5px] text-icm-text-dim hover:text-icm-text">Mark as required</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </div>

      {/* Submit modal */}
      {showSubmit && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowSubmit(false)}>
          <div className="bg-white rounded-2xl border border-icm-border w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-manrope font-extrabold text-[18px] text-icm-text">Submit this visit summary?</h3>
            <div className="mt-3 rounded-xl bg-icm-bg border border-icm-border p-3 text-[12px] font-geist text-icm-text-dim space-y-1">
              <p><span className="font-semibold text-icm-text">Visit:</span> {form.visitDate}</p>
              <p><span className="font-semibold text-icm-text">Person:</span> {person.lastName}, {person.firstName}</p>
              <p><span className="font-semibold text-icm-text">Next visit:</span> {form.nextVisitDate}</p>
            </div>
            {complianceTone === "red" && (
              <div className="mt-3 rounded-xl border border-icm-red/20 bg-icm-red-soft px-3 py-2.5 text-[12px] text-icm-red flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>This date is after the required visit window. Submitting will flag {person.firstName} as Out of Compliance.</span>
              </div>
            )}
            {form.aiPreFilled && (
              <label className="mt-3 flex items-start gap-2 text-[12px] font-geist text-icm-text-dim cursor-pointer">
                <input type="checkbox" checked={reviewedAI} onChange={(e) => setReviewedAI(e.target.checked)} className="mt-0.5" />
                <span>I confirm I have reviewed all AI-suggested content.</span>
              </label>
            )}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => setShowSubmit(false)} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg">
                Go back
              </button>
              <button onClick={handleSubmit} disabled={form.aiPreFilled && !reviewedAI} className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </ICMShell>
  );
};

const inputCls =
  "w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text font-geist focus:outline-none focus:border-icm-accent disabled:bg-icm-bg disabled:text-icm-text-dim";
const textareaCls =
  "w-full px-3 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text font-geist leading-relaxed focus:outline-none focus:border-icm-accent disabled:bg-icm-bg disabled:text-icm-text-dim";

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

function Field({
  label, required, aiSource, hint, children,
}: {
  label: string; required?: boolean; aiSource?: string; hint?: string; children: React.ReactNode;
}) {
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
      {hint && <p className="text-[10.5px] text-icm-text-faint mt-1 font-geist">{hint}</p>}
    </div>
  );
}

function ToggleRow({ checked, onChange, disabled, title, note }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; title: string; note?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-icm-border bg-icm-bg/50 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[12px] font-geist text-icm-text font-medium">{title}</p>
        {note && <p className="text-[10.5px] text-icm-text-dim mt-0.5">{note}</p>}
      </div>
      <button
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`shrink-0 w-10 h-5 rounded-full transition-colors relative ${checked ? "bg-icm-accent" : "bg-icm-border"} ${disabled ? "opacity-50" : ""}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? "left-5" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function StatusPill({ status }: { status: VisitStatus }) {
  const tone =
    status === "Submitted" || status === "Signed" ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
    : "bg-icm-accent-soft text-icm-accent ring-icm-accent/20";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 ${tone}`}>
      {status}
    </span>
  );
}

function SigPill({ status }: { status: "Signed" | "Pending" | "Not required" }) {
  const tone =
    status === "Signed" ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
    : status === "Pending" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
    : "bg-icm-bg text-icm-text-dim ring-icm-border";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 ${tone}`}>{status}</span>;
}

function ComplianceBanner({ tone, firstName }: { tone: ComplianceTone; firstName: string }) {
  if (tone === "green") {
    return (
      <div className="rounded-xl border border-icm-green/20 bg-icm-green-soft px-3.5 py-2.5 text-[12px] text-icm-green flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" />
        <span>{firstName}'s service category requires quarterly visits. Schedule by 07/27/2026 to remain compliant.</span>
      </div>
    );
  }
  if (tone === "amber") {
    return (
      <div className="rounded-xl border border-icm-amber/20 bg-icm-amber-soft px-3.5 py-2.5 text-[12px] text-icm-amber flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        <span>Next visit must be scheduled within 30 days to remain in compliance.</span>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-icm-red/20 bg-icm-red-soft px-3.5 py-2.5 text-[12px] text-icm-red flex items-center gap-2">
      <AlertTriangle className="w-4 h-4" />
      <span>{firstName}'s last visit was over 90 days ago. Scheduling next visit is required immediately.</span>
    </div>
  );
}

export default PersonVisitSummaryDetail;
