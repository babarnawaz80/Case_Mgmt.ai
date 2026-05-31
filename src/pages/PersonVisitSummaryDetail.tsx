import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronLeft, Sparkles, Save, Send, Printer, X, ShieldAlert,
  CalendarClock, AlertTriangle, CheckCircle2, FileSignature, Loader2,
  CalendarCheck, Clock,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { SmartTextarea } from "@/components/ui/smart-textarea";
import { useIndividual } from "@/hooks/useIndividuals";
import { useVisitSummaries } from "@/hooks/useFirestore";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import BillingSectionFields from "@/components/billing/BillingSectionFields";
import { createBillingRecord, updateAuthorizationUnits } from "@/hooks/useBillingRecords";
import { getRateForCode } from "@/hooks/useAuthorizations";
import { calculateBillingUnits } from "@/services/billingValidation";
import { useAuth } from "@/contexts/AuthContext";
import {
  createScheduledVisit,
  type ScheduledVisit,
} from "@/hooks/useScheduledVisits";

// ── Scheduling helpers ────────────────────────────────────────────────────────

/** Normalise MM/DD/YYYY or YYYY-MM-DD → YYYY-MM-DD. Returns "" on failure. */
function parseVisitDate(raw: string): string {
  if (!raw) return "";
  // MM/DD/YYYY
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2,"0")}-${mdy[2].padStart(2,"0")}`;
  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Fallback: try Date parse
  const d = new Date(raw);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** Add 60 minutes to an HH:mm string. */
function addHour(hhmm: string): string {
  if (!hhmm) return "11:00";
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + (m || 0) + 60;
  return `${String(Math.floor(total / 60) % 24).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
}

type ComplianceTone = "green" | "amber" | "red";

const PersonVisitSummaryDetail = () => {
  const { id, visitId } = useParams<{ id: string; visitId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { individual: person, loading: individualLoading } = useIndividual(id);
  const { data: allVisits, loading: visitsLoading } = useVisitSummaries(id);

  // ── Pre-fill from scheduled visit ────────────────────────────────────────
  const fromScheduledId = searchParams.get("from_scheduled");
  const [scheduledVisit, setScheduledVisit] = useState<ScheduledVisit | null>(null);
  const [prefillBannerDismissed, setPrefillBannerDismissed] = useState(false);

  useEffect(() => {
    if (!fromScheduledId) return;
    getDoc(doc(db, "scheduled_visits", fromScheduledId))
      .then((snap) => {
        if (snap.exists()) {
          setScheduledVisit({ id: snap.id, ...(snap.data() as Omit<ScheduledVisit, "id">) });
        }
      })
      .catch(() => {});
  }, [fromScheduledId]);

  const isNew = visitId === "new";
  const initial = useMemo<any>(() => {
    if (!person) return undefined;
    if (isNew) {
      // Base defaults
      const base = {
        id: "new",
        personId: person.id,
        visitDate: new Date().toISOString().split("T")[0],
        startTime: "10:00",
        endTime: "11:00",
        location: "In-Home",
        purposeOfSupport: "",
        visitSummary: "",
        nextVisitDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        status: "draft",
      };
      // Merge pre-fill from scheduled visit (Part 3 requirement)
      if (scheduledVisit) {
        return {
          ...base,
          visitDate: scheduledVisit.visit_date ?? base.visitDate,
          startTime: scheduledVisit.start_time ?? base.startTime,
          endTime:   scheduledVisit.end_time   ?? base.endTime,
          location:  scheduledVisit.location   ?? base.location,
          purposeOfSupport: scheduledVisit.visit_type ?? base.purposeOfSupport,
          linkedGoalId: scheduledVisit.linked_goal_id ?? "",
        };
      }
      return base;
    }
    return allVisits.find((v: any) => v.id === visitId);
  }, [person, isNew, visitId, allVisits, scheduledVisit]);

  const [form, setForm] = useState<any>(undefined);
  const [showSubmit, setShowSubmit] = useState(false);
  const [reviewedAI, setReviewedAI] = useState(false);
  const [showAIBanner, setShowAIBanner] = useState(true);

  // ── Billing state ─────────────────────────────────────────────────
  const [isBillable, setIsBillable] = useState(true);
  const [vsServiceCode, setVsServiceCode] = useState("");
  const [vsUnits, setVsUnits] = useState(0);
  const [vsAuthId, setVsAuthId] = useState("");
  const [vsAuthNumber, setVsAuthNumber] = useState("");

  const { userProfile } = useAuth();
  const isSupervisorOrAdmin =
    userProfile?.role === "supervisor" || userProfile?.role === "admin";

  useEffect(() => {
    if (initial && !form) {
      setForm(initial);
    }
  }, [initial, form]);

  const loading = individualLoading || visitsLoading;

  if (loading) {
    return (
      <ICMShell title="Visit Summary" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!person || !form) {
    return (
      <ICMShell title="Visit Summary" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Visit not found.</p>
      </ICMShell>

    );
  }

  const isReadOnly = form.status?.toLowerCase() === "submitted" || form.status?.toLowerCase() === "signed" || form.status === "Submitted" || form.status === "Signed";
  const update = (k: string, v: any) =>
    setForm((prev: any) => (prev ? { ...prev, [k]: v } : prev));
  const aiSourceFor = (k: string) => form.aiFields?.[k];

  let complianceTone: ComplianceTone = "green";

  const handleSave = async (status: string = "draft") => {
    if (!form || !person) return;
    try {
      const isSubmitting = status === "submitted";
      const approvalStatus = isSubmitting
        ? (isSupervisorOrAdmin ? "approved" : "pending_review")
        : undefined;

      const visitData: any = {
        individual_id: person.id,
        individual_name: `${person.last_name}, ${person.first_name}`,
        individualName: `${person.last_name}, ${person.first_name}`,
        visit_date: form.visitDate || form.visit_date || new Date().toISOString().split("T")[0],
        start_time: form.startTime || form.start_time || "",
        end_time: form.endTime || form.end_time || "",
        location: form.location || "",
        purpose_of_support: form.purposeOfSupport || form.purpose_of_support || "",
        what_went_well: form.whatWentWell || form.what_went_well || "",
        what_is_not_working: form.whatIsNotWorking || form.what_is_not_working || "",
        next_steps: form.nextSteps || form.next_steps || "",
        status,
        author_uid: userProfile?.uid ?? "",
        author_name: userProfile?.displayName ?? "",
        updated_by: userProfile?.displayName ?? "",
        updated_on: new Date().toLocaleDateString(),
        organizationId: userProfile?.organizationId ?? "",
        ...(approvalStatus !== undefined ? {
          approvalStatus,
          isBillingReady: isSupervisorOrAdmin ? true : false,
          returnReasons: [],
        } : {}),
      };
      if (isNew) {
        const docRef = await addDoc(collection(db, "visit_summaries"), visitData);
        toast.success("Visit summary created!");
        navigate(`/people/${person.id}/visit-summary/${docRef.id}`);
      } else {
        await updateDoc(doc(db, "visit_summaries", visitId), visitData);
        toast.success("Visit summary draft saved!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save visit summary");
    }
  };

  const handleSignAndSubmit = async () => {
    if (!form || !person) return;
    try {
      await handleSave("submitted");

      // ── Link back to scheduled visit (Part 3) ───────────────────────────
      if (fromScheduledId) {
        try {
          await updateDoc(doc(db, "scheduled_visits", fromScheduledId), {
            status: "completed",
            visit_summary_id: visitId === "new" ? undefined : visitId,
            updated_at: new Date(),
          });
        } catch (svErr) {
          console.warn("[scheduled_visit] Could not update status:", svErr);
        }
      }

      // Auto-create billing record if billable
      if (isBillable && vsServiceCode && userProfile?.organizationId) {
        const { rate, unitType } = getRateForCode(vsServiceCode);
        const startTime = form.startTime || form.start_time || "";
        const endTime = form.endTime || form.end_time || "";
        const unitCalc = calculateBillingUnits(startTime, endTime, unitType as any, rate);
        const finalUnits = vsUnits > 0 ? vsUnits : unitCalc.units;
        if (finalUnits > 0) {
          try {
            await createBillingRecord({
              org_id: userProfile.organizationId,
              individual_id: person.id,
              individual_name: `${person.first_name} ${person.last_name}`,
              case_manager_id: userProfile.uid ?? "",
              case_manager_name: userProfile.displayName ?? "",
              source_note_id: id || "",
              source_note_type: "visit_summary",
              source_note_url: `/people/${person.id}/visit-summary/${visitId}`,
              service_code: vsServiceCode,
              service_description: "",
              billing_unit_type: unitType as any,
              units: finalUnits,
              rate_per_unit: rate,
              total_amount: finalUnits * rate,
              date_of_service: form.visitDate || form.visit_date || "",
              start_time: startTime,
              end_time: endTime,
              duration_minutes: unitCalc.durationMinutes,
              authorization_id: vsAuthId,
              authorization_number: vsAuthNumber,
              funding_stream_id: "",
              payer_name: "",
              payer_id: "",
              validation_status: "passed",
              billing_status: "scrub_passed",
              submitted_to_iddbilling: false,
              remittance_received: false,
              signed_by: userProfile.uid ?? "",
            });
            if (vsAuthId) await updateAuthorizationUnits(vsAuthId, finalUnits, "add");
          } catch (billingErr) {
            console.error("[billing] visit summary billing record error:", billingErr);
          }
        }
      }

      // ── Auto-schedule next visit from "Next Visit Date" field ───────────────
      // If the case manager filled in the Next Visit Date, create a
      // scheduled_visits record so it appears on the dashboard calendar.
      const rawNextDate = form.nextVisitDate || form.next_visit_date || "";
      if (rawNextDate && userProfile?.organizationId && person) {
        try {
          const nextVisitDateYMD = parseVisitDate(rawNextDate);
          if (nextVisitDateYMD) {
            const rawTime   = form.nextVisitTime   || form.next_visit_time   || "10:00";
            const rawLoc    = form.nextVisitLocation || form.next_visit_location || (form.location || "TBD");
            // Derive a sensible visit type from purpose-of-support
            const purpose   = (form.purposeOfSupport || form.purpose_of_support || "").toLowerCase();
            const visitType =
              purpose.includes("phone")    ? "Phone Contact"  :
              purpose.includes("virtual")  ? "Virtual Visit"  :
              purpose.includes("office")   ? "Office Visit"   :
              purpose.includes("community")? "Community Visit" :
              "In-Home Visit";
            const individualName = `${person.last_name}, ${person.first_name}`;
            await createScheduledVisit({
              organizationId:  userProfile.organizationId,
              individual_id:   person.id,
              individual_name: individualName,
              visit_type:      visitType as any,
              visit_date:      nextVisitDateYMD,
              start_time:      rawTime,
              end_time:        addHour(rawTime),
              location:        rawLoc,
              assigned_to:     userProfile.uid ?? "",
              assigned_to_name: userProfile.displayName ?? "",
              notes:           `Follow-up from visit summary signed on ${new Date().toLocaleDateString()}.`,
              reminder:        true,
              reminder_timing: "1d",
              reminder_sent:   false,
              status:          "scheduled",
              created_by:      userProfile.uid ?? "",
            });
            toast.success("Next visit scheduled and added to your calendar.");
          }
        } catch (svErr) {
          console.warn("[scheduled_visit] Auto-schedule next visit failed (non-fatal):", svErr);
        }
      }

      setShowSubmit(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit");
    }
  };

  const requiredOK =
    !!(form.visitDate || form.visit_date) && !!(form.startTime || form.start_time) && !!(form.endTime || form.end_time) &&
    !!form.location && !!(form.purposeOfSupport || form.purpose_of_support);

  return (
    <ICMShell title="Visit Summary" showAIPanel={false}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <button onClick={() => navigate(`/people/${person.id}/visit-summary`)} className="inline-flex items-center gap-1.5 text-[14px] font-geist font-bold text-icm-text hover:text-icm-accent mb-2">
              <ChevronLeft className="w-4 h-4" />
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
              {person.last_name}, {person.first_name}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isReadOnly && (
              <>
                <button onClick={() => handleSave("draft")} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Save draft
                </button>
                <button onClick={() => setShowSubmit(true)} disabled={!requiredOK} className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Send className="w-3.5 h-3.5" />
                  {isSupervisorOrAdmin ? "Submit" : "Submit for Review"}
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

        {/* Approval status banners */}
        {form.approvalStatus === "pending_review" && (
          <div className="rounded-xl border border-icm-amber/30 bg-icm-amber-soft px-4 py-3 flex items-center gap-3">
            <Clock className="w-4 h-4 text-icm-amber shrink-0" />
            <div>
              <p className="text-[12.5px] font-geist font-semibold text-icm-text">Pending supervisor review</p>
              <p className="text-[11.5px] font-geist text-icm-text-dim">This visit summary is awaiting review. You cannot edit it until reviewed.</p>
            </div>
          </div>
        )}
        {form.approvalStatus === "returned_for_correction" && (() => {
          const reasons: any[] = form.returnReasons ?? [];
          const last = reasons[reasons.length - 1];
          return (
            <div className="rounded-xl border border-icm-red/30 bg-icm-red-soft px-4 py-3 space-y-1">
              <p className="text-[12.5px] font-geist font-semibold text-icm-red">
                Returned for correction{last?.returnedByName ? ` by ${last.returnedByName}` : ""}
              </p>
              {last?.reason && <p className="text-[11.5px] font-geist text-icm-text"><span className="font-semibold">Reason:</span> {last.reason}</p>}
              {last?.comment && <p className="text-[11.5px] font-geist text-icm-text-dim italic">"{last.comment}"</p>}
            </div>
          );
        })()}
        {form.approvalStatus === "approved" && (
          <div className="rounded-xl border border-icm-green/20 bg-icm-green-soft px-4 py-2.5 text-[12px] text-icm-green flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-semibold">Approved{form.reviewedByName ? ` by ${form.reviewedByName}` : ""}.</span>
            <span className="text-icm-green/80">This visit summary is billing-ready.</span>
          </div>
        )}
        {form.approvalStatus === "approved_with_exception" && (
          <div className="rounded-xl border border-icm-amber/30 bg-icm-amber-soft px-4 py-2.5 text-[12px] text-icm-amber flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">Approved with exception{form.reviewedByName ? ` by ${form.reviewedByName}` : ""}.</span>
              {form.exceptionReason && <p className="mt-0.5 text-[11.5px] text-icm-text-dim">Exception: {form.exceptionReason}</p>}
            </div>
          </div>
        )}

        {/* ── Pre-fill from scheduled visit banner (Part 3) ───────────────────── */}
        {scheduledVisit && !prefillBannerDismissed && isNew && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <CalendarCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <p className="text-[12.5px] font-geist text-teal-800 leading-snug">
                <span className="font-semibold">
                  Pre-filled from scheduled visit on{" "}
                  {scheduledVisit.visit_date
                    ? new Date(scheduledVisit.visit_date + "T12:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    : "N/A"}.
                </span>{" "}
                <span className="text-teal-700">
                  Review and complete before submitting.
                </span>
              </p>
            </div>
            <button
              onClick={() => setPrefillBannerDismissed(true)}
              className="p-1 rounded hover:bg-teal-100 text-teal-500 shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
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
              <input disabled value={`${person.last_name}, ${person.first_name}`} className={inputCls} />
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

        {/* Billing Section */}
        <section className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-manrope font-bold text-[15px] text-icm-text tracking-tight">Billing</h2>
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-geist text-icm-text-dim">Billable?</span>
              <button
                onClick={() => setIsBillable(true)}
                disabled={isReadOnly}
                className={`px-3 h-7 rounded-lg text-[11.5px] font-medium border transition-colors ${isBillable ? "bg-icm-green-soft border-icm-green text-icm-green" : "border-icm-border text-icm-text-dim"}`}
              >Yes</button>
              <button
                onClick={() => setIsBillable(false)}
                disabled={isReadOnly}
                className={`px-3 h-7 rounded-lg text-[11.5px] font-medium border transition-colors ${!isBillable ? "bg-icm-bg border-icm-border-strong text-icm-text" : "border-icm-border text-icm-text-dim"}`}
              >No</button>
            </div>
          </div>
          {isBillable && (
            <BillingSectionFields
              individualId={id || ""}
              serviceCode={vsServiceCode}
              onServiceCodeChange={setVsServiceCode}
              units={vsUnits}
              onUnitsChange={setVsUnits}
              authorizationId={vsAuthId}
              authorizationNumber={vsAuthNumber}
              onAuthorizationChange={(aid, anum) => { setVsAuthId(aid); setVsAuthNumber(anum); }}
              startTime={form.startTime || form.start_time || ""}
              endTime={form.endTime || form.end_time || ""}
            />
          )}
        </section>

        {/* VISIT CONTENT */}
        <Section title="Visit Content">
          <Field label="Purpose of Support" required aiSource={aiSourceFor("purposeOfSupport")}>
            <SmartTextarea disabled={isReadOnly} noSmart={isReadOnly} maxLength={8000} value={form.purposeOfSupport ?? ""} onChange={(v) => update("purposeOfSupport", v)} className={textareaCls} rows={3} />
          </Field>
          <Field label="What is Working?" aiSource={aiSourceFor("whatIsWorking")} hint="AI pulled this from last monitoring form and recent notes">
            <SmartTextarea disabled={isReadOnly} noSmart={isReadOnly} maxLength={8000} value={form.whatIsWorking ?? ""} onChange={(v) => update("whatIsWorking", v)} className={textareaCls} rows={4} />
          </Field>
          <Field label="What is Not Working?" aiSource={aiSourceFor("whatIsNotWorking")} hint="AI pulled this from recent notes and risk flags">
            <SmartTextarea disabled={isReadOnly} noSmart={isReadOnly} maxLength={8000} value={form.whatIsNotWorking ?? ""} onChange={(v) => update("whatIsNotWorking", v)} className={textareaCls} rows={4} />
          </Field>
        </Section>

        {/* HEALTH AND SAFETY */}
        <Section title="Health & Safety" titleIcon={<ShieldAlert className="w-4 h-4 text-icm-amber" />}>
          <div className="rounded-xl border border-icm-amber/20 bg-icm-amber-soft px-3.5 py-2.5 mb-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-icm-amber shrink-0" />
              <p className="text-[12px] font-geist text-icm-text leading-snug">
                <span className="font-semibold">AI found 1 open risk flag for {person.first_name}:</span>{" "}
                <span className="text-icm-text-dim">Behavioral changes reported by caregiver (04/27/2026, Low-Medium severity). Consider documenting here.</span>
              </p>
            </div>
            <button onClick={() => navigate(`/people/${id}/echart`)} className="text-[11.5px] font-geist font-semibold text-icm-amber hover:underline shrink-0">View flag →</button>
          </div>
          <Field label="Immediate Action Needed" aiSource={aiSourceFor("immediateAction")}>
            <SmartTextarea disabled={isReadOnly} noSmart={isReadOnly} maxLength={8000} value={form.immediateAction ?? ""} onChange={(v) => update("immediateAction", v)} className={textareaCls} rows={3} placeholder="Document any immediate health or safety concerns observed during this visit." />
          </Field>
          <Field label="Visit Summary and Next Steps" required aiSource={aiSourceFor("visitSummary")}>
            <SmartTextarea disabled={isReadOnly} noSmart={isReadOnly} maxLength={8000} value={form.visitSummary ?? ""} onChange={(v) => update("visitSummary", v)} className={textareaCls} rows={5} />
          </Field>
        </Section>

        {/* NEXT VISIT */}
        <Section title="Schedule Next Visit" titleIcon={<CalendarClock className="w-4 h-4 text-icm-accent" />}>
          <ComplianceBanner tone={complianceTone} firstName={person.first_name} />
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
              <p><span className="font-semibold text-icm-text">Person:</span> {person.last_name}, {person.first_name}</p>
              <p><span className="font-semibold text-icm-text">Next visit:</span> {form.nextVisitDate}</p>
            </div>
            {(complianceTone as string) === "red" && (
              <div className="mt-3 rounded-xl border border-icm-red/20 bg-icm-red-soft px-3 py-2.5 text-[12px] text-icm-red flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>This date is after the required visit window. Submitting will flag {person.first_name} as Out of Compliance.</span>
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
              <button onClick={handleSignAndSubmit} disabled={form.aiPreFilled && !reviewedAI} className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
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
