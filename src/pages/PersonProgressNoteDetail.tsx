import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft, Sparkles, Save, Send, Printer, X, AlertTriangle,
  CheckCircle2, FileText, Target, ListChecks, FileSignature, Ban, Loader2,
  Clock,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { SmartTextarea } from "@/components/ui/smart-textarea";
import { useIndividual } from "@/hooks/useIndividuals";
import {
  buildAIPreFilledProgressNote, ACTIVITY_TYPES, NON_BILLABLE_REASONS,
  type ProgressNote, type ProgressStatus, type ContactType, type GoalProgressEntry, type GoalProgressStatus,
} from "@/data/progressNotes";
import { useProgressNote, updateProgressNote, saveProgressNote } from "@/hooks/useProgressNotes";
import { writeAudit } from "@/lib/auditService";
import { AuthorCell } from "@/components/icm/AuthorCell";
import { useAuth } from "@/contexts/AuthContext";
import MentionInput from "@/components/icm/MentionInput";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createBillingRecord } from "@/hooks/useBillingRecords";

const PersonProgressNoteDetail = () => {
  const { id, noteId } = useParams<{ id: string; noteId: string }>();
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const authorName = userProfile?.displayName || currentUser?.displayName || userProfile?.email || "Unknown";
  const { individual, loading: indLoading } = useIndividual(id);
  const { data: dbRecord, loading: recordLoading } = useProgressNote(noteId);

  const isNew = noteId === "new";
  const [form, setForm] = useState<ProgressNote | undefined>(undefined);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAIBanner, setShowAIBanner] = useState(true);
  const [signOpen, setSignOpen] = useState(false);
  const [confirmReviewed, setConfirmReviewed] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  /** UIDs of staff members @-mentioned in the Next Steps field */
  const [nextStepsMentions, setNextStepsMentions] = useState<string[]>([]);

  useEffect(() => {
    if (initialized) return;
    if (isNew && individual) {
      setForm(buildAIPreFilledProgressNote(individual.id));
      setInitialized(true);
    } else if (dbRecord) {
      setForm({
        id: dbRecord.id,
        personId: dbRecord.individualId,
        date: dbRecord.progressDate,
        startTime: dbRecord.startTime,
        endTime: dbRecord.endTime,
        activityType: dbRecord.activityType,
        contactType: dbRecord.contactType as any,
        isBillable: dbRecord.isBillable,
        nonBillableReason: (dbRecord as any).nonBillableReason,
        serviceCode: (dbRecord as any).serviceCode,
        units: (dbRecord as any).units,
        authorizationId: (dbRecord as any).authorizationId,
        authorizationRemaining: (dbRecord as any).authorizationRemaining,
        purposeOfActivity: dbRecord.purposeOfActivity,
        goalProgress: dbRecord.goalsProgress ? dbRecord.goalsProgress.map(g => ({
          goalId: g.goalId,
          goalTitle: g.goalText,
          progressNotes: g.narrative,
          status: g.progressStatus === "met" ? "Goal achieved" :
                  g.progressStatus === "progressing" ? "Progressing" :
                  g.progressStatus === "no_change" ? "No change" :
                  g.progressStatus === "regressing" ? "No change" : "No change",
        })) : [],
        additionalObservations: dbRecord.additionalObservations,
        nextSteps: dbRecord.nextSteps,
        status: dbRecord.status === "signed" ? "Signed" :
                dbRecord.status === "void" ? "Void" :
                dbRecord.status === "pending_signature" ? "Pending Signature" : "Draft",
        voidReason: (dbRecord as any).voidReason,
        signedBy: (dbRecord as any).signedBy,
        signedOn: (dbRecord as any).signedOn,
        updatedBy: dbRecord.authorName,
        updatedOn: dbRecord.progressDate,
      });
      setInitialized(true);
    }
  }, [dbRecord, isNew, individual, initialized]);

  const loading = indLoading || recordLoading;

  if (loading) {
    return (
      <ICMShell title="Progress Note" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual || !form) {
    return (
      <ICMShell title="Progress Note" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Note not found.</p>
      </ICMShell>
    );
  }

  const isReadOnly = form.status === "Signed" || form.status === "Void";

  const update = <K extends keyof ProgressNote>(k: K, v: ProgressNote[K]) =>
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev));
  const updateGoal = (idx: number, patch: Partial<GoalProgressEntry>) => {
    setForm((prev) => {
      if (!prev?.goalProgress) return prev;
      const next = [...prev.goalProgress];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, goalProgress: next };
    });
  };
  const aiSourceFor = (k: keyof ProgressNote) => form.aiFields?.[k];

  // Auto-calc units from start/end (15-min increments)
  const computeUnits = () => {
    if (!form.startTime || !form.endTime) return undefined;
    const [sh, sm] = form.startTime.split(":").map(Number);
    const [eh, em] = form.endTime.split(":").map(Number);
    const minutes = (eh * 60 + em) - (sh * 60 + sm);
    if (minutes <= 0) return undefined;
    return Math.ceil(minutes / 15);
  };
  const computedUnits = computeUnits();
  const minutes = form.startTime && form.endTime
    ? ((Number(form.endTime.split(":")[0]) * 60 + Number(form.endTime.split(":")[1])) -
       (Number(form.startTime.split(":")[0]) * 60 + Number(form.startTime.split(":")[1])))
    : undefined;

  const wouldExceedAuth =
    form.isBillable && form.authorizationRemaining !== undefined && (form.units ?? 0) > form.authorizationRemaining;

  const handleSaveDraft = async () => {
    if (!form || !noteId) return;
    setSaving(true);
    try {
      const payload = {
        activityType: form.activityType,
        contactType: form.contactType ?? "In-Person",
        progressDate: form.date,
        startTime: form.startTime ?? "",
        endTime: form.endTime ?? "",
        isBillable: form.isBillable,
        purposeOfActivity: form.purposeOfActivity ?? "",
        goalsProgress: form.goalProgress ? form.goalProgress.map(g => ({
          goalId: g.goalId,
          goalText: g.goalTitle,
          narrative: g.progressNotes ?? "",
          progressStatus: g.status === "Goal achieved" ? "met" as const :
                          g.status === "Progressing" ? "progressing" as const :
                          g.status === "No change" ? "no_change" as const : "no_change" as const,
        })) : [],
        additionalObservations: form.additionalObservations ?? "",
        nextSteps: form.nextSteps ?? "",
        status: "draft" as const,
      };

      if (isNew) {
        // Create a new Firestore document
        const newId = await saveProgressNote({
          ...payload,
          individualId: id ?? "",
          organizationId: userProfile?.organizationId ?? "",
          authorId: userProfile?.uid ?? currentUser?.uid ?? "",
          authorName,
        } as any);
        await writeAudit('create_note', 'note', newId, { status: 'draft' });
        toast.success("Draft saved successfully");
        navigate(`/people/${id}/progress-note/${newId}`, { replace: true });
      } else {
        await updateProgressNote(noteId, payload);
        await writeAudit('edit_note', 'note', noteId, { status: 'draft' });
        toast.success("Draft saved successfully");
      }
    } catch (err) {
      toast.error("Failed to save draft: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    if (!form || !noteId) return;
    setSaving(true);
    try {
      const today = new Date().toLocaleDateString("en-US");
      const credential = userProfile?.credential ? `, ${userProfile.credential}` : "";
      const signedBy = `${authorName}${credential}`;
      const goalsProgress = form.goalProgress ? form.goalProgress.map(g => ({
        goalId: g.goalId,
        goalText: g.goalTitle,
        narrative: g.progressNotes ?? "",
        progressStatus: g.status === "Goal achieved" ? "met" as const :
                        g.status === "Progressing" ? "progressing" as const :
                        g.status === "No change" ? "no_change" as const : "no_change" as const,
      })) : [];

      let resolvedNoteId = noteId;

      if (isNew) {
        // Create the document first, then sign it
        resolvedNoteId = await saveProgressNote({
          activityType: form.activityType,
          contactType: form.contactType ?? "In-Person",
          progressDate: form.date,
          startTime: form.startTime ?? "",
          endTime: form.endTime ?? "",
          isBillable: form.isBillable,
          purposeOfActivity: form.purposeOfActivity ?? "",
          goalsProgress,
          additionalObservations: form.additionalObservations ?? "",
          nextSteps: form.nextSteps ?? "",
          status: "draft" as const,
          individualId: id ?? "",
          organizationId: userProfile?.organizationId ?? "",
          authorId: userProfile?.uid ?? currentUser?.uid ?? "",
          authorName,
        } as any);
      }

      await updateProgressNote(resolvedNoteId, {
        status: "signed" as const,
        signedBy,
        signedOn: today,
        goalsProgress,
      });
      await writeAudit('edit_note', 'note', resolvedNoteId, { status: 'signed' });

      // Auto-create billing record if note is billable
      if (form.isBillable && userProfile?.organizationId && id) {
        try {
          const svcCode = form.serviceCode ?? "";
          const computedUnitCount = (() => {
            if (!form.startTime || !form.endTime) return 0;
            const [sh, sm] = form.startTime.split(":").map(Number);
            const [eh, em] = form.endTime.split(":").map(Number);
            const mins = (eh * 60 + em) - (sh * 60 + sm);
            return mins > 0 ? Math.floor(mins / 15) : 0;
          })();
          const noteUnits = (form.units ?? 0) > 0 ? (form.units ?? 0) : (computedUnitCount > 0 ? computedUnitCount : 1);
          const rate = 28.5;
          const hasComplete = !!svcCode && noteUnits > 0 && !!form.authorizationId;

          // Check for existing record first (avoid duplicates if note was previously submitted)
          // If the read fails due to permissions (shouldn't happen after rules fix), we proceed anyway
          let alreadyExists = false;
          try {
            const existingSnap = await getDocs(
              query(collection(db, "billing_records"), where("source_note_id", "==", resolvedNoteId))
            );
            alreadyExists = !existingSnap.empty;
          } catch {
            // If read check fails, attempt the create anyway — Firestore will reject duplicates
            alreadyExists = false;
          }

          if (!alreadyExists) {
            await createBillingRecord({
              org_id: userProfile.organizationId,
              individual_id: id,
              individual_name: `${individual.last_name}, ${individual.first_name}`,
              case_manager_id: userProfile.uid ?? "",
              case_manager_name: authorName,
              source_note_id: resolvedNoteId,
              source_note_type: "progress_note",
              source_note_url: `/people/${id}/progress-note/${resolvedNoteId}`,
              service_code: svcCode,
              service_description: "",
              billing_unit_type: "15_min",
              units: noteUnits,
              rate_per_unit: rate,
              total_amount: noteUnits * rate,
              date_of_service: form.date ?? "",
              start_time: form.startTime ?? "",
              end_time: form.endTime ?? "",
              duration_minutes: 0,
              authorization_id: form.authorizationId ?? "",
              authorization_number: form.authorizationId ?? "",
              funding_stream_id: "",
              payer_name: "",
              payer_id: "",
              validation_status: hasComplete ? "passed" : "pending",
              billing_status: hasComplete ? "pending_scrub" : "needs_attention",
              submitted_to_iddbilling: false,
              remittance_received: false,
              signed_by: userProfile.uid ?? "",
            });
          }
        } catch (billingErr) {
          console.error("[billing] Failed to create billing record on sign:", billingErr);
          // Don't block note signing
        }
      }

      setForm({ ...form, status: "Signed", signedBy, signedOn: today });
      toast.success("Progress note signed successfully");
      if (isNew) {
        navigate(`/people/${id}/progress-note/${resolvedNoteId}`, { replace: true });
      }
    } catch (err) {
      toast.error("Failed to sign progress note: " + (err as Error).message);
    } finally {
      setSaving(false);
      setSignOpen(false);
      setConfirmReviewed(false);
    }
  };

  const handleVoid = async () => {
    if (!form || !noteId || !voidReason.trim()) return;
    setSaving(true);
    try {
      await updateProgressNote(noteId, {
        status: "void" as const,
        voidReason: voidReason,
      } as any);
      await writeAudit('edit_note', 'note', noteId, { status: 'voided', reason: voidReason });

      setForm({ ...form, status: "Void", voidReason });
      toast.success("Progress note voided successfully");
    } catch (err) {
      toast.error("Failed to void progress note: " + (err as Error).message);
    } finally {
      setSaving(false);
      setVoidOpen(false);
    }
  };

  return (
    <ICMShell title="Progress Note" showAIPanel={false}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <button onClick={() => navigate(`/people/${individual.id}/progress-note`)} className="inline-flex items-center gap-1.5 text-[14px] font-geist font-bold text-icm-text hover:text-icm-accent mb-2">
              <ChevronLeft className="w-4 h-4" />
              Progress Notes
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-icm-bg border border-icm-border text-[11px] font-mono text-icm-text">
                {form.date || "New note"}
              </span>
              <StatusPill status={form.status} />
              <span className="text-[11px] text-icm-text-faint font-geist">
                Last saved {form.updatedOn} · Autosaved
              </span>
            </div>
            <h1 className="font-manrope text-[24px] font-extrabold text-icm-text leading-tight tracking-[-0.02em] mt-2">
              {individual.last_name}, {individual.first_name}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isReadOnly && (
              <>
                <button onClick={handleSaveDraft} disabled={saving} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5 disabled:opacity-40">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save draft
                </button>
                <button onClick={() => setSignOpen(true)} className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 inline-flex items-center gap-1.5">
                  <FileSignature className="w-3.5 h-3.5" /> Sign &amp; submit
                </button>
              </>
            )}
            <button className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            {form.status === "Signed" && (
              <button onClick={() => setVoidOpen(true)} className="text-[11.5px] font-geist text-icm-red hover:underline">
                Void note
              </button>
            )}
          </div>
        </div>

        {form.status === "Signed" && (
          <div className="rounded-xl border border-icm-green/20 bg-icm-green-soft px-4 py-2.5 text-[12px] text-icm-green flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-semibold">Signed &amp; locked.</span>
            <span className="text-icm-green/80 flex items-center gap-1.5">Signed by <AuthorCell name={form.signedBy} size="sm" showName={true} /> on {form.signedOn}. Note is read-only.</span>
          </div>
        )}

        {form.status === "Void" && (
          <div className="rounded-xl border border-icm-red/20 bg-icm-red-soft px-4 py-2.5 text-[12px] text-icm-red flex items-center gap-2">
            <Ban className="w-4 h-4" />
            <span className="font-semibold">VOID</span>
            <span className="text-icm-red/80">Reason: {form.voidReason}</span>
          </div>
        )}

        {/* Approval status banners */}
        {(dbRecord as any)?.approvalStatus === "pending_review" && (
          <div className="rounded-xl border border-icm-amber/30 bg-icm-amber-soft px-4 py-3 flex items-start gap-3">
            <Clock className="w-4 h-4 text-icm-amber mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-geist font-semibold text-icm-text">
                Pending supervisor review
              </p>
              <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
                {(() => {
                  const ts = (dbRecord as any)?.submittedForReviewAt;
                  if (!ts?.toMillis) return "Submitted recently.";
                  const hours = Math.floor((Date.now() - ts.toMillis()) / 3600000);
                  return `Submitted ${hours === 0 ? "< 1 hour" : `${hours} hour${hours !== 1 ? "s" : ""}`} ago. You cannot edit this note until it is reviewed.`;
                })()}
              </p>
            </div>
          </div>
        )}

        {(dbRecord as any)?.approvalStatus === "returned_for_correction" && (() => {
          const reasons: any[] = (dbRecord as any)?.returnReasons ?? [];
          const last = reasons[reasons.length - 1];
          return (
            <div className="rounded-xl border border-icm-red/30 bg-icm-red-soft px-4 py-3 space-y-2">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-icm-red mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-geist font-semibold text-icm-red">
                    Returned for correction
                    {last?.returnedByName && ` by ${last.returnedByName}`}
                    {last?.returnedAt && ` on ${new Date(last.returnedAt).toLocaleDateString()}`}
                  </p>
                  {last?.reason && (
                    <p className="text-[11.5px] font-geist text-icm-text mt-1">
                      <span className="font-semibold">Reason:</span> {last.reason}
                    </p>
                  )}
                  {last?.comment && (
                    <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5 italic">
                      "{last.comment}"
                    </p>
                  )}
                </div>
              </div>
              {noteId && noteId !== "new" && (
                <div className="flex gap-2">
                  <button
                    className="h-8 px-3 rounded-xl border border-icm-border text-[11.5px] font-geist font-medium text-icm-text hover:bg-white"
                    onClick={() => {/* editing is handled by un-locking the form */}}
                  >
                    Edit this note
                  </button>
                  <button
                    className="h-8 px-3 rounded-xl bg-icm-text text-icm-panel text-[11.5px] font-geist font-semibold hover:opacity-90"
                    onClick={async () => {
                      if (!noteId) return;
                      try {
                        await updateDoc(doc(db, "progress_notes", noteId), {
                          approvalStatus: "pending_review",
                          submittedForReviewAt: serverTimestamp(),
                        });
                        toast.success("Note resubmitted for review");
                      } catch (err) {
                        toast.error("Failed to resubmit: " + (err as Error).message);
                      }
                    }}
                  >
                    Resubmit for Review
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {(dbRecord as any)?.approvalStatus === "approved" && (
          <div className="rounded-xl border border-icm-green/20 bg-icm-green-soft px-4 py-2.5 text-[12px] text-icm-green flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-semibold">Approved</span>
            {(dbRecord as any).reviewedByName && (
              <span className="text-icm-green/80">
                by {(dbRecord as any).reviewedByName}
                {(dbRecord as any).reviewedAt?.toDate &&
                  ` on ${(dbRecord as any).reviewedAt.toDate().toLocaleDateString()}`}
                . This note is billing-ready.
              </span>
            )}
          </div>
        )}

        {(dbRecord as any)?.approvalStatus === "approved_with_exception" && (
          <div className="rounded-xl border border-icm-amber/30 bg-icm-amber-soft px-4 py-2.5 text-[12px] text-icm-amber flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">Approved with exception</span>
              {(dbRecord as any).reviewedByName && (
                <span className="text-icm-amber/80 ml-1">by {(dbRecord as any).reviewedByName}.</span>
              )}
              {(dbRecord as any).exceptionReason && (
                <p className="mt-0.5 text-[11.5px] text-icm-text-dim">
                  Exception: {(dbRecord as any).exceptionReason}
                </p>
              )}
              <p className="mt-0.5 text-[11.5px] text-icm-text-dim">This note is billing-ready with a flag.</p>
            </div>
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
                <span className="text-icm-text-dim">Progress observations drafted for 2 of {individual.first_name}'s active goals. Review and edit before signing.</span>
              </p>
            </div>
            <button onClick={() => setShowAIBanner(false)} className="p-1 rounded hover:bg-white/50 text-icm-text-dim shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SECTION 1 — Note Details */}
        <Section title="Note Details" titleIcon={<FileText className="w-4 h-4 text-icm-text-dim" />}>
          <Grid2>
            <Field label="Person Supported" required>
              <input disabled value={`${individual.last_name}, ${individual.first_name}`} className={inputCls} />
            </Field>
            <Field label="Activity Type" required aiSource={aiSourceFor("activityType")}>
              <select disabled={isReadOnly} value={form.activityType} onChange={(e) => update("activityType", e.target.value)} className={selectCls}>
                {ACTIVITY_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Progress Date" required aiSource={aiSourceFor("date")}>
              <input type="text" disabled={isReadOnly} value={form.date} onChange={(e) => update("date", e.target.value)} placeholder="MM/DD/YYYY" className={inputCls} />
            </Field>
            <Field label="Contact Type" required aiSource={aiSourceFor("contactType")}>
              <select disabled={isReadOnly} value={form.contactType ?? ""} onChange={(e) => update("contactType", e.target.value as ContactType)} className={selectCls}>
                <option value="">Select</option>
                <option>In-person</option>
                <option>Phone</option>
                <option>Virtual</option>
                <option>Electronic</option>
                <option>Collateral</option>
              </select>
            </Field>
            <Field label="Start Time" required aiSource={aiSourceFor("startTime")}>
              <input type="time" disabled={isReadOnly} value={form.startTime ?? ""} onChange={(e) => update("startTime", e.target.value)} className={inputCls} />
            </Field>
            <Field label="End Time" required aiSource={aiSourceFor("endTime")}>
              <input type="time" disabled={isReadOnly} value={form.endTime ?? ""} onChange={(e) => update("endTime", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Is Billable" required>
              <select disabled={isReadOnly} value={form.isBillable ? "Yes" : "No"} onChange={(e) => update("isBillable", e.target.value === "Yes")} className={selectCls}>
                <option>Yes</option>
                <option>No</option>
              </select>
            </Field>
            {!form.isBillable && (
              <Field label="Non-Billable Reason">
                <select disabled={isReadOnly} value={form.nonBillableReason ?? ""} onChange={(e) => update("nonBillableReason", e.target.value)} className={selectCls}>
                  <option value="">Select reason</option>
                  {NON_BILLABLE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            )}
          </Grid2>

          {form.isBillable && (
            <div className="rounded-lg border border-icm-border bg-icm-bg/40 p-3 space-y-3">
              <p className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">Billing</p>
              <Grid2>
                <Field label="Service / Procedure Code" aiSource={aiSourceFor("serviceCode")}>
                  <input disabled={isReadOnly} value={form.serviceCode ?? ""} onChange={(e) => update("serviceCode", e.target.value)} placeholder="e.g. T2022, H2015" className={inputCls} />
                </Field>
                <Field label="Billable Units">
                  <input
                    type="number"
                    disabled={isReadOnly}
                    value={form.units ?? computedUnits ?? ""}
                    onChange={(e) => update("units", Number(e.target.value))}
                    className={inputCls}
                  />
                  {minutes !== undefined && computedUnits !== undefined && (
                    <p className="text-[10.5px] text-icm-text-faint mt-1 font-geist">
                      {minutes} minutes = {computedUnits} units (15-min increments)
                    </p>
                  )}
                </Field>
              </Grid2>
              <Field label="Service Authorization">
                <select disabled={isReadOnly} value={form.authorizationId ?? ""} onChange={(e) => update("authorizationId", e.target.value)} className={selectCls}>
                  <option value="">No authorization linked</option>
                  <option value="SA-2026-001">Authorization #SA-2026-001 · 18 of 40 units remaining</option>
                </select>
                {wouldExceedAuth && (
                  <div className="mt-2 rounded-lg border border-icm-red/20 bg-icm-red-soft px-3 py-2 text-[11.5px] text-icm-red flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>This note would use {form.units} units. Only {form.authorizationRemaining} remain on this authorization. Creating this note will exceed the authorization limit.</span>
                  </div>
                )}
              </Field>
            </div>
          )}
        </Section>

        {/* SECTION 2 — Activity Documentation */}
        <Section title="Activity Documentation">
          <Field label="Purpose of Activity" required aiSource={aiSourceFor("purposeOfActivity")}>
            <SmartTextarea disabled={isReadOnly} noSmart={isReadOnly} maxLength={4000} value={form.purposeOfActivity ?? ""} onChange={(v) => update("purposeOfActivity", v)} className={textareaCls} rows={4} placeholder="Describe the purpose and context of this activity" />
          </Field>
        </Section>

        {/* SECTION 3 — Goal Progress */}
        <Section title="Progress Toward Goals" titleIcon={<Target className="w-4 h-4 text-icm-accent" />}>
          {form.goalProgress && form.goalProgress.length > 0 ? (
            <>
              <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-3.5 py-2.5 mb-3 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-icm-accent mt-0.5 shrink-0" />
                <p className="text-[12px] font-geist text-icm-text leading-snug">
                  <span className="font-semibold">I pulled {individual.first_name}'s active goals from the Care Plan.</span>{" "}
                  <span className="text-icm-text-dim">I detected progress-relevant content in the 04/27 ambient session for 2 goals. Review below.</span>
                </p>
              </div>
              <div className="space-y-3">
                {form.goalProgress.map((g, idx) => (
                  <GoalCard key={g.goalId} goal={g} disabled={isReadOnly} onChange={(p) => updateGoal(idx, p)} />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-icm-amber/20 bg-icm-amber-soft px-4 py-3 text-[12px] text-icm-text">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-icm-amber mt-0.5 shrink-0" />
                <p>
                  <span className="font-semibold">No active goals found for {individual.first_name}.</span>{" "}
                  <span className="text-icm-text-dim">Goals are set in the Care Plan / ISP module. You can still document general progress below.</span>
                </p>
              </div>
              <textarea className={`${textareaCls} mt-3`} rows={4} placeholder="General progress notes" />
            </div>
          )}
        </Section>

        {/* SECTION 4 — Additional Documentation */}
        <Section title="Additional Documentation" titleIcon={<ListChecks className="w-4 h-4 text-icm-text-dim" />}>
          <Field label="Additional observations" aiSource={aiSourceFor("additionalObservations")}>
            <SmartTextarea disabled={isReadOnly} noSmart={isReadOnly} maxLength={4000} value={form.additionalObservations ?? ""} onChange={(v) => update("additionalObservations", v)} rows={4} className={textareaCls} placeholder="Any additional observations, concerns, or context not captured above" />
          </Field>
          <Field label="Next steps" aiSource={aiSourceFor("nextSteps")}>
            {isReadOnly ? (
              <textarea disabled maxLength={4000} value={form.nextSteps ?? ""} rows={4} className={textareaCls} placeholder="What follow-up actions are planned?" />
            ) : (
              <MentionInput
                value={form.nextSteps ?? ""}
                onChange={(val, uids) => {
                  update("nextSteps", val);
                  setNextStepsMentions(uids);
                }}
                rows={4}
                placeholder="What follow-up actions are planned? Type @ to mention a teammate"
                className={textareaCls}
              />
            )}
          </Field>
        </Section>

        {/* SECTION 5 — Signature */}
        {!isReadOnly && (
          <Section title="Signature" titleIcon={<FileSignature className="w-4 h-4 text-icm-accent" />}>
            <div className="rounded-lg border border-icm-border bg-icm-bg/40 p-4">
              <p className="text-[12px] font-geist text-icm-text">
                <span className="font-semibold">Signing as:</span> Kathy Adams, CM
              </p>
              <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">
                By signing, I certify this note is accurate and complete to the best of my knowledge.
              </p>
              <button onClick={() => setSignOpen(true)} className="mt-3 h-10 w-full rounded-xl bg-icm-text text-icm-panel text-[13px] font-medium hover:opacity-90 inline-flex items-center justify-center gap-1.5">
                <FileSignature className="w-4 h-4" /> Sign &amp; Submit Note
              </button>
            </div>
          </Section>
        )}
      </div>

      {/* Sign confirm modal */}
      {signOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSignOpen(false)}>
          <div className="bg-white rounded-2xl border border-icm-border w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-manrope font-extrabold text-[18px] text-icm-text">Sign this progress note?</h3>
            <div className="mt-3 rounded-xl bg-icm-bg border border-icm-border p-3 text-[12px] font-geist text-icm-text-dim space-y-1">
              <p><span className="font-semibold text-icm-text">Date:</span> {form.date}</p>
              <p><span className="font-semibold text-icm-text">Person:</span> {individual.last_name}, {individual.first_name}</p>
              <p><span className="font-semibold text-icm-text">Activity:</span> {form.activityType}</p>
              <p><span className="font-semibold text-icm-text">Billable:</span> {form.isBillable ? `Yes — ${form.units ?? 0} units` : "No"}</p>
            </div>
            {form.isBillable && (
              <p className="mt-3 text-[11.5px] text-icm-text-dim font-geist">
                This will create a billing record for {form.units ?? 0} units.
              </p>
            )}
            {form.aiPreFilled && (
              <label className="mt-3 flex items-start gap-2 text-[12px] font-geist text-icm-text-dim cursor-pointer">
                <input type="checkbox" checked={confirmReviewed} onChange={(e) => setConfirmReviewed(e.target.checked)} className="mt-0.5" />
                <span>I confirm I have reviewed all AI-suggested content and this note is accurate.</span>
              </label>
            )}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => setSignOpen(false)} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg">
                Cancel
              </button>
              <button onClick={handleSign} disabled={form.aiPreFilled && !confirmReviewed} className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> Sign &amp; Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void modal */}
      {voidOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setVoidOpen(false)}>
          <div className="bg-white rounded-2xl border border-icm-border w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-manrope font-extrabold text-[18px] text-icm-text">Void this note?</h3>
            <p className="text-[12px] font-geist text-icm-text-dim mt-1">
              Voiding is permanent and creates an audit record.
            </p>
            <label className="block mt-3">
              <span className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint">Reason (required)</span>
              <textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} rows={3} className={`${textareaCls} mt-1`} />
            </label>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => setVoidOpen(false)} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg">
                Cancel
              </button>
              <button onClick={handleVoid} disabled={!voidReason.trim()} className="h-9 px-3 rounded-xl bg-icm-red text-white text-[12px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5" /> Void note
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
const selectCls = inputCls;
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

function GoalCard({ goal, disabled, onChange }: { goal: GoalProgressEntry; disabled?: boolean; onChange: (p: Partial<GoalProgressEntry>) => void }) {
  return (
    <div className="rounded-lg border border-icm-border bg-icm-bg/40 p-3.5 space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-geist font-bold text-icm-text">{goal.goalTitle}</p>
            {goal.aiSuggested && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20">
                <Sparkles className="w-2.5 h-2.5" /> AI suggested
              </span>
            )}
          </div>
          {goal.goalDescription && <p className="text-[11.5px] text-icm-text-dim mt-0.5 line-clamp-2">{goal.goalDescription}</p>}
        </div>
        <button className="text-[11px] font-semibold text-icm-accent hover:underline shrink-0">View full goal →</button>
      </div>
      <Field label="Progress this session">
        <SmartTextarea
          disabled={disabled}
          noSmart={disabled}
          maxLength={2000}
          value={goal.progressNotes ?? ""}
          onChange={(v) => onChange({ progressNotes: v })}
          rows={3}
          className={textareaCls}
          placeholder="What progress was made toward this goal during this activity?"
        />
      </Field>
      <Field label="Goal status update">
        <select
          disabled={disabled}
          value={goal.status}
          onChange={(e) => onChange({ status: e.target.value as GoalProgressStatus })}
          className={selectCls}
        >
          <option>No change</option>
          <option>Progressing</option>
          <option>Goal achieved</option>
          <option>Goal discontinued</option>
          <option>On hold</option>
        </select>
      </Field>
    </div>
  );
}

function StatusPill({ status }: { status: ProgressStatus }) {
  const tone =
    status === "Signed" ? "bg-icm-green-soft text-icm-green ring-icm-green/20" :
    status === "Draft" ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20" :
    status === "Pending Signature" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20" :
    "bg-icm-bg text-icm-text-dim ring-icm-border";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 ${tone}`}>
      {status}
    </span>
  );
}

export default PersonProgressNoteDetail;
