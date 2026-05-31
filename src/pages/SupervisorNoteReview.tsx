import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, CheckCircle2, AlertTriangle, Loader2, X,
  FileText, Clock,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  doc, getDoc, updateDoc, serverTimestamp, addDoc, collection,
} from "firebase/firestore";
import { incrementAuthorizationUnits } from "@/hooks/useAuthorizations";
import { toast } from "sonner";
import { writeAudit } from "@/lib/auditService";
import { createNotification } from "@/hooks/useFirestoreNotifications";
import { createTask } from "@/hooks/useTasks";

const RETURN_REASONS = [
  "Missing required field",
  "Incorrect service code",
  "Narrative insufficient",
  "Units do not match time",
  "Authorization issue",
  "Plan goal not linked",
  "Documentation does not meet billing requirements",
  "Other",
];

const COLLECTION_LABEL: Record<string, string> = {
  progress_notes: "Progress Note",
  contact_notes: "Contact Note",
  visit_summaries: "Visit Summary",
  monitoring_forms: "Monitoring Form",
  care_plans: "Care Plan / ISP",
};

function hoursAgo(ts: any): string {
  if (!ts) return "unknown time";
  const ms = ts?.toMillis?.() ?? (ts instanceof Date ? ts.getTime() : 0);
  const hours = Math.floor((Date.now() - ms) / 3600000);
  if (hours === 0) return "< 1 hour ago";
  return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
}

const SupervisorNoteReview = () => {
  const { collectionName, noteId } = useParams<{ collectionName: string; noteId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [noteData, setNoteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Return form
  const [returnReason, setReturnReason] = useState("");
  const [returnComment, setReturnComment] = useState("");

  // Exception form
  const [exceptionReason, setExceptionReason] = useState("");

  const isCarePlan = collectionName === "care_plans";
  const noteType = COLLECTION_LABEL[collectionName ?? ""] ?? "Note";
  const reviewerName =
    userProfile?.displayName ||
    `${userProfile?.firstName ?? ""} ${userProfile?.lastName ?? ""}`.trim() ||
    "Supervisor";

  useEffect(() => {
    if (!collectionName || !noteId) return;
    setLoading(true);
    getDoc(doc(db, collectionName, noteId))
      .then((snap) => {
        if (snap.exists()) {
          setNoteData({ id: snap.id, ...snap.data() });
        } else {
          toast.error("Note not found");
        }
      })
      .catch((err) => {
        console.error("[SupervisorNoteReview] load:", err);
        toast.error("Failed to load note");
      })
      .finally(() => setLoading(false));
  }, [collectionName, noteId]);

  if (loading) {
    return (
      <ICMShell title="Supervisor Review" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading note…</span>
        </div>
      </ICMShell>
    );
  }

  if (!noteData) {
    return (
      <ICMShell title="Supervisor Review" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Note not found.</p>
      </ICMShell>
    );
  }

  const individualName =
    noteData.individualName ||
    noteData.individual_name ||
    `${noteData.firstName ?? ""} ${noteData.lastName ?? ""}`.trim() ||
    "Unknown";

  const submittedByName =
    noteData.submittedByName ||
    noteData.authorName ||
    noteData.author_name ||
    "Unknown";

  const submittedBy =
    noteData.submittedForReviewBy ||
    noteData.authorId ||
    noteData.author_uid ||
    "";

  const submittedAt = noteData.submittedForReviewAt || noteData.createdAt;

  const orgId = noteData.organizationId || userProfile?.organizationId || "";

  // ── Helpers ──────────────────────────────────────────────────────────────────

  async function doApprove() {
    if (!collectionName || !noteId) return;
    setSaving(true);
    try {
      if (isCarePlan) {
        await updateDoc(doc(db, collectionName, noteId), {
          approvalStatus: "supervisor_approved",
          supervisorApprovedAt: serverTimestamp(),
          supervisorApprovedBy: userProfile?.uid ?? "",
          supervisorApprovedByName: reviewerName,
        });
        await writeAudit("care_plan_supervisor_approved", "care_plan", noteId, {
          reviewedBy: userProfile?.uid,
          reviewedByName: reviewerName,
        });
      } else {
        await updateDoc(doc(db, collectionName, noteId), {
          approvalStatus: "approved",
          isBillingReady: true,
          reviewedAt: serverTimestamp(),
          reviewedBy: userProfile?.uid ?? "",
          reviewedByName: reviewerName,
        });
        await writeAudit("note_approved", "note", noteId, {
          collection: collectionName,
          reviewedBy: userProfile?.uid,
          reviewedByName: reviewerName,
        });

        // Increment used units on the linked authorization
        const authId = noteData.authorizationId ?? noteData.authorization_id;
        const billedUnits = noteData.billingUnits ?? noteData.units ?? noteData.billed_units ?? 0;
        if (authId && billedUnits > 0) {
          incrementAuthorizationUnits(authId, Number(billedUnits)).catch((err) => {
            console.warn("[SupervisorNoteReview] Failed to update auth units (non-fatal):", err);
          });
        }
      }
      if (submittedBy) {
        await createNotification({
          uid: submittedBy,
          organizationId: orgId,
          type: "info",
          severity: "info",
          title: `${noteType} Approved`,
          body: isCarePlan
            ? `Your Care Plan / ISP for ${individualName} has been approved by ${reviewerName}. Collecting signatures.`
            : `Your ${noteType} for ${individualName} has been approved by ${reviewerName}.`,
          href: isCarePlan
            ? `/people/${noteData.individualId || noteData.individual_id}/care-plan/${noteId}`
            : `/${collectionName.replace("_", "-")}/${noteId}`,
          read: false,
          dismissed: false,
        });
      }
      toast.success(isCarePlan ? "Care Plan approved" : "Note approved", { description: `${noteType} for ${individualName}` });
      setShowApproveModal(false);
      navigate(-1);
    } catch (err) {
      toast.error("Failed to approve", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function doReturn() {
    if (!collectionName || !noteId || !returnReason || !returnComment) return;
    setSaving(true);
    try {
      const returnEntry = {
        returnedAt: new Date().toISOString(),
        returnedBy: userProfile?.uid ?? "",
        returnedByName: reviewerName,
        reason: returnReason,
        comment: returnComment,
      };
      const existing = noteData.returnReasons ?? [];
      await updateDoc(doc(db, collectionName, noteId), {
        approvalStatus: "returned_for_correction",
        ...(!isCarePlan && { isBillingReady: false }),
        returnReasons: [...existing, returnEntry],
        returnedAt: serverTimestamp(),
        returnedBy: userProfile?.uid ?? "",
        returnedByName: reviewerName,
      });
      await writeAudit(isCarePlan ? "care_plan_returned" : "note_returned", isCarePlan ? "care_plan" : "note", noteId, {
        collection: collectionName,
        reason: returnReason,
        returnedBy: userProfile?.uid,
      });
      if (submittedBy) {
        await createNotification({
          uid: submittedBy,
          organizationId: orgId,
          type: "alert",
          severity: "warning",
          title: `${noteType} Returned for Correction`,
          body: `Your ${noteType} for ${individualName} was returned by ${reviewerName}. Reason: ${returnReason}.`,
          href: isCarePlan
            ? `/people/${noteData.individualId || noteData.individual_id}/care-plan/${noteId}`
            : `/${collectionName.replace("_", "-")}/${noteId}`,
          read: false,
          dismissed: false,
        });
        // Create a task for the case manager
        await createTask({
          title: `Correct and resubmit: ${noteType} for ${individualName}`,
          description: `Returned by ${reviewerName}. Reason: ${returnReason}. Comment: ${returnComment}`,
          status: "open",
          priority: "high",
          type: "Document Review",
          individualId: noteData.individualId || noteData.individual_id || "",
          individualName,
          assignedTo: submittedBy,
          dueDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 10),
          organizationId: orgId,
        } as any);
      }
      toast.success(isCarePlan ? "Care Plan returned for correction" : "Note returned for correction");
      setShowReturnModal(false);
      navigate(-1);
    } catch (err) {
      toast.error("Failed to return", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function doApproveWithException() {
    if (!collectionName || !noteId || !exceptionReason) return;
    setSaving(true);
    try {
      if (isCarePlan) {
        await updateDoc(doc(db, collectionName, noteId), {
          approvalStatus: "supervisor_approved",
          exceptionReason,
          supervisorApprovedAt: serverTimestamp(),
          supervisorApprovedBy: userProfile?.uid ?? "",
          supervisorApprovedByName: reviewerName,
        });
        await writeAudit("care_plan_supervisor_approved_with_exception", "care_plan", noteId, {
          exceptionReason,
          reviewedBy: userProfile?.uid,
          reviewedByName: reviewerName,
        });
      } else {
        await updateDoc(doc(db, collectionName, noteId), {
          approvalStatus: "approved_with_exception",
          isBillingReady: true,
          exceptionReason,
          reviewedAt: serverTimestamp(),
          reviewedBy: userProfile?.uid ?? "",
          reviewedByName: reviewerName,
        });
        await writeAudit("note_approved_with_exception", "note", noteId, {
          collection: collectionName,
          exceptionReason,
          reviewedBy: userProfile?.uid,
          reviewedByName: reviewerName,
        });
      }
      if (submittedBy) {
        await createNotification({
          uid: submittedBy,
          organizationId: orgId,
          type: "info",
          severity: "warning",
          title: `${noteType} Approved with Exception`,
          body: `Your ${noteType} for ${individualName} was approved with exception by ${reviewerName}.`,
          href: isCarePlan
            ? `/people/${noteData.individualId || noteData.individual_id}/care-plan/${noteId}`
            : `/${collectionName.replace("_", "-")}/${noteId}`,
          read: false,
          dismissed: false,
        });
      }
      toast.success(isCarePlan ? "Care Plan approved with exception" : "Note approved with exception");
      setShowExceptionModal(false);
      navigate(-1);
    } catch (err) {
      toast.error("Failed to approve", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  // Derive note date
  const noteDate =
    noteData.progressDate ||
    noteData.visitDate ||
    noteData.visit_date ||
    noteData.dueDate ||
    noteData.date ||
    "";

  return (
    <ICMShell title="Supervisor Review" showAIPanel={false}>
      <div className="space-y-5">
        {/* Review panel */}
        <div className="rounded-xl border border-icm-amber/40 bg-icm-amber-soft p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-geist font-bold uppercase tracking-widest text-icm-amber mb-0.5">
                Supervisor Review
              </p>
              <h2 className="font-manrope font-bold text-[15px] text-icm-text">
                {isCarePlan ? `Care Plan / ISP — ${individualName}` : `${noteType} — ${individualName}`}
              </h2>
              <p className="text-[12px] text-icm-text-dim font-geist">
                Submitted by {submittedByName} · {hoursAgo(submittedAt)}
                {!isCarePlan && noteDate && ` · Note date: ${noteDate}`}
                {isCarePlan && noteData.effective_date && ` · Effective: ${noteData.effective_date || noteData.effectiveDate}`}
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-white inline-flex items-center gap-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to queue
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowApproveModal(true)}
              className="h-9 px-4 rounded-xl bg-icm-green text-white text-[12.5px] font-geist font-semibold hover:opacity-90 inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </button>
            <button
              onClick={() => setShowReturnModal(true)}
              className="h-9 px-4 rounded-xl border border-red-300 text-red-700 text-[12.5px] font-geist font-semibold hover:bg-red-50 inline-flex items-center gap-1.5"
            >
              Return for Correction
            </button>
            <button
              onClick={() => setShowExceptionModal(true)}
              className="h-9 px-4 rounded-xl border border-icm-amber text-icm-amber text-[12.5px] font-geist font-semibold hover:bg-icm-amber-soft inline-flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Approve with Exception
            </button>
          </div>
        </div>

        {/* Content display — care plan vs note */}
        {isCarePlan ? (
          <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-icm-text-dim" />
              <h3 className="font-manrope font-bold text-[15px] text-icm-text">Care Plan Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12.5px]">
              <NoteField label="Individual" value={individualName} />
              <NoteField label="Plan Type" value={noteData.type || "Person-Centered ISP"} />
              <NoteField label="Version" value={`Version ${noteData.version ?? 1}`} />
              <NoteField label="Effective Date" value={noteData.effective_date || noteData.effectiveDate || "—"} />
              <NoteField label="Submitted By" value={submittedByName} />
              <NoteField label="Goals" value={`${(noteData.goals ?? []).length} goal(s)`} />
              <NoteField label="Services" value={`${(noteData.services ?? []).length} service(s)`} />
              <NoteField label="Status" value={noteData.approvalStatus?.replace(/_/g, " ") ?? "—"} />
            </div>

            {/* Goals read-only */}
            {(noteData.goals ?? []).length > 0 && (
              <div>
                <p className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint font-geist mb-2">Goals</p>
                <ul className="space-y-2">
                  {(noteData.goals as any[]).map((g: any, i: number) => (
                    <li key={g.id ?? i} className="rounded-lg border border-icm-border bg-icm-bg/40 px-3 py-2 text-[12.5px] font-geist text-icm-text">
                      <span className="font-semibold">G{i + 1}:</span> {g.goal || g.title || g.description || "Goal"}
                      {g.target_date && <span className="ml-2 text-icm-text-dim text-[11px]">· Target: {g.target_date}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Services read-only */}
            {(noteData.services ?? []).length > 0 && (
              <div>
                <p className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint font-geist mb-2">Services</p>
                <ul className="space-y-1.5">
                  {(noteData.services as any[]).map((s: any, i: number) => (
                    <li key={s.id ?? i} className="rounded-lg border border-icm-border bg-icm-bg/40 px-3 py-2 text-[12.5px] font-geist text-icm-text">
                      {s.name ?? s.serviceName ?? "Service"}
                      {s.provider && <span className="text-icm-text-dim ml-2">· {s.provider}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Team members read-only */}
            {(noteData.team ?? []).length > 0 && (
              <div>
                <p className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint font-geist mb-2">Team Members</p>
                <ul className="space-y-1.5">
                  {(noteData.team as any[]).map((t: any, i: number) => (
                    <li key={i} className="rounded-lg border border-icm-border bg-icm-bg/40 px-3 py-2 text-[12.5px] font-geist text-icm-text flex items-center justify-between">
                      <span>{t.name}</span>
                      <span className="text-icm-text-dim text-[11px]">{t.role}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-icm-text-dim" />
              <h3 className="font-manrope font-bold text-[15px] text-icm-text">Note Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12.5px]">
              <NoteField label="Individual" value={individualName} />
              <NoteField label="Note Type" value={noteType} />
              {noteDate && <NoteField label="Date" value={noteDate} />}
              {noteData.activityType && <NoteField label="Activity Type" value={noteData.activityType} />}
              {noteData.contactType && <NoteField label="Contact Type" value={noteData.contactType} />}
              {(noteData.serviceCode || noteData.service_code) && (
                <NoteField label="Service Code" value={noteData.serviceCode || noteData.service_code} />
              )}
              {(noteData.billingUnits || noteData.units) && (
                <NoteField label="Units" value={String(noteData.billingUnits || noteData.units)} />
              )}
              {(noteData.startTime || noteData.start_time) && (
                <NoteField label="Start Time" value={noteData.startTime || noteData.start_time} />
              )}
              {(noteData.endTime || noteData.end_time) && (
                <NoteField label="End Time" value={noteData.endTime || noteData.end_time} />
              )}
              <NoteField label="Submitted By" value={submittedByName} />
              <NoteField
                label="Current Status"
                value={noteData.approvalStatus?.replace(/_/g, " ") ?? noteData.status ?? "pending_review"}
              />
            </div>

            {/* Narrative fields */}
            {(noteData.purposeOfActivity || noteData.purpose_of_support) && (
              <NoteTextBlock
                label="Purpose of Activity / Support"
                value={noteData.purposeOfActivity || noteData.purpose_of_support}
              />
            )}
            {(noteData.additionalObservations || noteData.what_went_well) && (
              <NoteTextBlock
                label="Observations / What Went Well"
                value={noteData.additionalObservations || noteData.what_went_well}
              />
            )}
            {(noteData.nextSteps || noteData.next_steps) && (
              <NoteTextBlock
                label="Next Steps"
                value={noteData.nextSteps || noteData.next_steps}
              />
            )}
            {(noteData.whatIsNotWorking || noteData.what_is_not_working) && (
              <NoteTextBlock
                label="What Is Not Working"
                value={noteData.whatIsNotWorking || noteData.what_is_not_working}
              />
            )}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <Modal onClose={() => setShowApproveModal(false)}>
          <h3 className="font-manrope font-extrabold text-[18px] text-icm-text">{isCarePlan ? "Approve this Care Plan?" : "Approve this note?"}</h3>
          <div className="mt-3 rounded-xl bg-icm-green-soft border border-icm-green/20 p-3 text-[12px] font-geist text-icm-green space-y-1">
            <p><span className="font-semibold">{isCarePlan ? "Plan:" : "Note:"}</span> {noteType} for {individualName}</p>
            {!isCarePlan && noteDate && <p><span className="font-semibold">Date:</span> {noteDate}</p>}
            {isCarePlan && <p><span className="font-semibold">Version:</span> {noteData.version ?? 1} · Effective: {noteData.effective_date || noteData.effectiveDate || "—"}</p>}
            <p><span className="font-semibold">Submitted by:</span> {submittedByName}</p>
          </div>
          <p className="mt-3 text-[11.5px] text-icm-text-dim font-geist">
            {isCarePlan
              ? "This Care Plan will be marked as supervisor-approved and sent for signatures. The case manager will be notified."
              : "This note will be marked as approved and billing-ready. The case manager will be notified."}
          </p>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              onClick={() => setShowApproveModal(false)}
              className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg"
            >
              Cancel
            </button>
            <button
              onClick={doApprove}
              disabled={saving}
              className="h-9 px-4 rounded-xl bg-icm-green text-white text-[12px] font-semibold hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Approve
            </button>
          </div>
        </Modal>
      )}

      {/* Return for Correction Modal */}
      {showReturnModal && (
        <Modal onClose={() => setShowReturnModal(false)}>
          <h3 className="font-manrope font-extrabold text-[18px] text-icm-text">Return for Correction</h3>
          <p className="mt-1 text-[12px] font-geist text-icm-text-dim">
            The case manager will be notified and a task will be created for them to correct and resubmit.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1">
                Reason <span className="text-icm-red">*</span>
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text font-geist focus:outline-none focus:border-icm-accent"
              >
                <option value="">Select a reason…</option>
                {RETURN_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1">
                Comment <span className="text-icm-red">*</span>
              </label>
              <textarea
                value={returnComment}
                onChange={(e) => setReturnComment(e.target.value)}
                rows={3}
                placeholder="Provide specific guidance on what needs to be corrected…"
                className="w-full px-3 py-2.5 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text font-geist focus:outline-none focus:border-icm-accent resize-none"
              />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              onClick={() => setShowReturnModal(false)}
              className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg"
            >
              Cancel
            </button>
            <button
              onClick={doReturn}
              disabled={saving || !returnReason || !returnComment.trim()}
              className="h-9 px-4 rounded-xl bg-red-600 text-white text-[12px] font-semibold hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Return for Correction
            </button>
          </div>
        </Modal>
      )}

      {/* Approve with Exception Modal */}
      {showExceptionModal && (
        <Modal onClose={() => setShowExceptionModal(false)}>
          <h3 className="font-manrope font-extrabold text-[18px] text-icm-text">Approve with Exception</h3>
          <p className="mt-1 text-[12px] font-geist text-icm-text-dim">
            The note will be marked billing-ready but flagged with an exception for tracking purposes.
          </p>
          <div className="mt-4">
            <label className="block text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1">
              Exception Reason <span className="text-icm-red">*</span>
            </label>
            <textarea
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
              rows={3}
              placeholder="Describe why an exception is being made…"
              className="w-full px-3 py-2.5 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text font-geist focus:outline-none focus:border-icm-accent resize-none"
            />
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              onClick={() => setShowExceptionModal(false)}
              className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg"
            >
              Cancel
            </button>
            <button
              onClick={doApproveWithException}
              disabled={saving || !exceptionReason.trim()}
              className="h-9 px-4 rounded-xl border border-icm-amber bg-icm-amber-soft text-icm-amber text-[12px] font-semibold hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              Approve with Exception
            </button>
          </div>
        </Modal>
      )}
    </ICMShell>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-icm-border w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function NoteField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint font-geist mb-0.5">
        {label}
      </p>
      <p className="text-[12.5px] font-geist text-icm-text">{value || "—"}</p>
    </div>
  );
}

function NoteTextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint font-geist mb-1">
        {label}
      </p>
      <div className="rounded-lg border border-icm-border bg-icm-bg/40 px-3 py-2.5 text-[12.5px] font-geist text-icm-text leading-relaxed whitespace-pre-wrap">
        {value || "—"}
      </div>
    </div>
  );
}

export default SupervisorNoteReview;
