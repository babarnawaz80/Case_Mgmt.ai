import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import {
  ChevronLeft, CheckCircle2, XCircle, RotateCcw, ShieldAlert, Lock,
  Paperclip, Link2, Clock, User2, FileText, History, AlertTriangle, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { loadSubmittedNotes, saveSubmittedNotes, writeAudit, type SubmittedNote } from "@/data/supervisor";
import { AuthorCell } from "@/components/icm/AuthorCell";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { writeAudit as writeAuditFirestore } from "@/lib/auditService";
import { useAuth } from "@/contexts/AuthContext";

type Action = "approve" | "reject" | "return" | "override";

interface ReviewEvent { ts: string; action: string; by: string; note?: string; }

const HISTORY_KEY = "icm.supervisor.notes.history";
function loadHistory(noteId: string): ReviewEvent[] {
  try { return (JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}")[noteId] || []) as ReviewEvent[]; } catch { return []; }
}
function pushHistory(noteId: string, ev: ReviewEvent) {
  const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}");
  all[noteId] = [...(all[noteId] || []), ev];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
}

/** Write a real Firestore inbox notification for the coordinator */
async function sendInboxNotification(opts: {
  coordinatorId: string | undefined;
  organizationId: string;
  noteId: string;
  personName: string;
  action: string;
  reason: string;
  supervisorName: string;
}) {
  try {
    await addDoc(collection(db, "notifications"), {
      userId: opts.coordinatorId ?? "unassigned",
      organizationId: opts.organizationId,
      title: `Note ${opts.action}: ${opts.personName}`,
      body: `${opts.supervisorName}: "${opts.reason.slice(0, 120)}"`,
      href: `/supervisor/review/${opts.noteId}`,
      severity: opts.action === "Rejected" ? "critical" : "warning",
      read: false,
      dismissed: false,
      relatedId: opts.noteId,
      relatedType: "progress_note",
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Non-fatal — note rejection still works without the notification
    console.warn("[SupervisorReviewNote] Failed to send inbox notification:", err);
  }
}

const SupervisorReviewNote = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [notes, setNotes] = useState<SubmittedNote[]>([]);
  const [history, setHistory] = useState<ReviewEvent[]>([]);
  const [actionOpen, setActionOpen] = useState<Action | null>(null);
  const [comment, setComment] = useState("");

  // Amendment state
  const [amendOpen, setAmendOpen] = useState(false);
  const [amendReason, setAmendReason] = useState("");
  const [amendNarrative, setAmendNarrative] = useState("");
  const [amendSaving, setAmendSaving] = useState(false);

  useEffect(() => {
    setNotes(loadSubmittedNotes());
    if (docId) setHistory(loadHistory(docId));
  }, [docId]);

  const note = useMemo(() => notes.find(n => n.id === docId) || null, [notes, docId]);

  if (!note) return (
    <ICMShell title="Review Note" showAIPanel={false}>
      <div className="p-6 text-[13px]">Note not found. <button onClick={() => navigate("/supervisor")} className="underline">Back to dashboard</button></div>
    </ICMShell>
  );

  const locked = note.status === "Approved" || note.status === "Approved with override";
  const supervisor = userProfile?.displayName ?? "Supervisor";
  const orgId = userProfile?.organizationId ?? "";

  const apply = async (action: Action) => {
    if ((action === "reject" || action === "return" || action === "override") && comment.trim().length < 20) {
      toast.error("Comment is required (minimum 20 characters).");
      return;
    }
    const ts = new Date().toISOString();
    let newStatus: SubmittedNote["status"] = note.status;
    let label = "";
    if (action === "approve")  { newStatus = "Approved";                 label = "Approved"; }
    if (action === "reject")   { newStatus = "Rejected";                 label = "Rejected"; }
    if (action === "return")   { newStatus = "Returned";                 label = "Returned"; }
    if (action === "override") { newStatus = "Approved with override";   label = "Approved with override"; }

    // Build patch with rejection metadata
    const patch: Partial<SubmittedNote> = { status: newStatus };
    if (action === "reject" || action === "return") {
      patch.rejectionReason = comment.trim();
      patch.rejectedBy = supervisor;
      patch.rejectedAt = ts;
    }

    const updated = notes.map(n => n.id === note.id ? { ...n, ...patch } : n);
    setNotes(updated);
    saveSubmittedNotes(updated);

    const ev: ReviewEvent = { ts, action: label, by: supervisor, note: comment.trim() || undefined };
    pushHistory(note.id, ev);
    setHistory(h => [...h, ev]);

    // Local audit trail
    writeAudit({ ts, action: `Note ${label}`, entity: note.id, personId: note.personId, by: supervisor, detail: comment.trim() || `${note.serviceCode} · ${note.units}u` });

    // Real Firestore audit event
    writeAuditFirestore(
      action === "approve" ? "create_note" : "edit_note",
      "progress_note", note.id,
      { action: label, supervisorId: userProfile?.uid, supervisorName: supervisor, reason: comment.trim(), individualId: note.personId }
    ).catch(() => {});

    // Real Firestore inbox notification for reject / return
    if (action === "reject" || action === "return") {
      await sendInboxNotification({
        coordinatorId: note.coordinatorId,
        organizationId: orgId,
        noteId: note.id,
        personName: note.personName,
        action: label,
        reason: comment.trim(),
        supervisorName: supervisor,
      });
    }

    toast.success(`${label}. ${note.coordinator} notified.`);
    setActionOpen(null);
    setComment("");
  };

  const handleAmend = async () => {
    if (amendReason.trim().length < 10) {
      toast.error("Amendment reason is required (min 10 characters).");
      return;
    }
    setAmendSaving(true);
    const ts = new Date().toISOString();
    const currentVersion: NonNullable<SubmittedNote["versions"]>[number] = {
      versionNumber: note.versionNumber ?? 1,
      narrative: note.narrative,
      savedAt: ts,
      savedBy: supervisor,
      reason: amendReason.trim(),
    };

    const patch: Partial<SubmittedNote> = {
      status: "Amendment pending approval",
      narrative: amendNarrative.trim() || note.narrative,
      versionNumber: (note.versionNumber ?? 1) + 1,
      versions: [...(note.versions ?? []), currentVersion],
      amendmentReason: amendReason.trim(),
    };

    const updated = notes.map(n => n.id === note.id ? { ...n, ...patch } : n);
    setNotes(updated);
    saveSubmittedNotes(updated);

    const ev: ReviewEvent = { ts, action: "Amendment opened", by: supervisor, note: amendReason.trim() };
    pushHistory(note.id, ev);
    setHistory(h => [...h, ev]);

    // Audit trail
    writeAudit({ ts, action: "Note Amendment opened", entity: note.id, personId: note.personId, by: supervisor, detail: `v${patch.versionNumber} — ${amendReason.trim()}` });
    writeAuditFirestore("edit_note", "progress_note", note.id, {
      action: "amendment_opened",
      version: patch.versionNumber,
      reason: amendReason.trim(),
      amendedBy: supervisor,
    }).catch(() => {});

    toast.success("Amendment created. Note sent for re-approval.");
    setAmendOpen(false);
    setAmendReason("");
    setAmendNarrative("");
    setAmendSaving(false);
  };

  return (
    <ICMShell title="Review Submitted Note" showAIPanel={false}>
      <div className="space-y-4 max-w-5xl">
        <button onClick={() => navigate("/supervisor")} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">
          <ChevronLeft className="w-3.5 h-3.5" /> Supervisor Dashboard
        </button>

        {/* Rejection / return banner — shown to supervisor viewing the returned note */}
        {(note.status === "Returned" || note.status === "Rejected") && note.rejectionReason && (
          <div className={`rounded-xl border-2 px-4 py-3 flex items-start gap-2.5 ${note.status === "Rejected" ? "border-icm-red/40 bg-icm-red-soft" : "border-icm-amber/40 bg-icm-amber-soft"}`}>
            <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${note.status === "Rejected" ? "text-icm-red" : "text-icm-amber"}`} />
            <div>
              <p className={`text-[12.5px] font-semibold font-geist ${note.status === "Rejected" ? "text-icm-red" : "text-icm-text"}`}>
                {note.status === "Rejected" ? "Note rejected" : "Note returned for correction"} by {note.rejectedBy}
              </p>
              <p className="text-[12px] text-icm-text-dim font-geist mt-0.5 italic">"{note.rejectionReason}"</p>
            </div>
          </div>
        )}

        {/* Version badge for amendments */}
        {(note.versionNumber ?? 1) > 1 && (
          <div className="rounded-lg border border-icm-accent/20 bg-icm-accent-soft px-3 py-2 text-[12px] font-geist text-icm-text">
            <span className="font-semibold">Version {note.versionNumber}</span>
            {note.amendmentReason && <span className="text-icm-text-dim"> · Amendment reason: {note.amendmentReason}</span>}
          </div>
        )}

        {/* Header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[11.5px] text-icm-text-dim font-mono">
              <User2 className="w-3.5 h-3.5" /> {note.personName} · ID #{note.personId} · note {note.id}
              {(note.versionNumber ?? 1) > 1 && <span className="ml-1 px-1.5 py-0.5 rounded bg-icm-accent-soft text-icm-accent text-[10px] font-bold">v{note.versionNumber}</span>}
            </div>
            <h1 className="font-manrope text-[22px] font-extrabold text-icm-text mt-0.5">{note.serviceCode} — {note.units} billable units</h1>
            <div className="text-[12px] text-icm-text-dim flex items-center gap-1.5 mt-0.5">
              Submitted by <AuthorCell name={note.coordinator} size="sm" showName={true} /> · {new Date(note.submittedAt).toLocaleString()}
              <span className={`ml-2 px-1.5 h-5 inline-flex items-center rounded text-[10.5px] ${note.agingHours >= 48 ? "bg-rose-100 text-rose-700" : note.agingHours >= 24 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                {note.agingHours}h pending
              </span>
            </div>
          </div>
          <span className={`px-2 h-7 inline-flex items-center rounded-md text-[12px] font-medium ${locked ? "bg-emerald-100 text-emerald-800" : note.status === "Rejected" ? "bg-rose-100 text-rose-700" : note.status === "Returned" ? "bg-amber-100 text-amber-800" : note.status === "Amendment pending approval" ? "bg-blue-100 text-blue-700" : "bg-blue-100 text-blue-700"}`}>
            {locked && <Lock className="w-3.5 h-3.5 mr-1" />}{note.status}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: review fields */}
          <div className="lg:col-span-2 space-y-3">
            <Section icon={<FileText className="w-4 h-4" />} title="Narrative">
              <p className="text-[13px] leading-relaxed text-icm-text whitespace-pre-wrap">{note.narrative}</p>
              <div className="text-[11px] text-icm-text-dim mt-2">{note.narrative.length} characters</div>
            </Section>
            <Section icon={<Clock className="w-4 h-4" />} title="Time, units & service code">
              <div className="grid grid-cols-2 gap-3 text-[12.5px]">
                <Row label="Service code">{note.serviceCode}</Row>
                <Row label="Billable units">{note.units}</Row>
                <Row label="Start time">{new Date(note.startedAt).toLocaleString()}</Row>
                <Row label="End time">{new Date(note.endedAt).toLocaleString()}</Row>
                <Row label="Elapsed">{Math.round((new Date(note.endedAt).getTime() - new Date(note.startedAt).getTime()) / 60000)} min</Row>
              </div>
            </Section>
            <Section icon={<Link2 className="w-4 h-4" />} title="Plan & authorization linkage">
              <div className="grid grid-cols-2 gap-3 text-[12.5px]">
                <Row label="Plan goal link">{note.hasPlanLink ? <Ok>Linked to active goal</Ok> : <Bad>Not linked</Bad>}</Row>
                <Row label="Authorization">{note.authorizationOk ? <Ok>Active · units available</Ok> : <Bad>Missing or exhausted</Bad>}</Row>
                <Row label="Billing eligible">{note.hasPlanLink && note.authorizationOk ? <Ok>Yes</Ok> : <Bad>No — needs correction or override</Bad>}</Row>
              </div>
            </Section>
            <Section icon={<Paperclip className="w-4 h-4" />} title="Attachments">
              {note.hasAttachments ? (
                <ul className="text-[12.5px] space-y-1">
                  <li className="flex items-center gap-2 border border-icm-border rounded px-2 py-1.5 bg-white"><Paperclip className="w-3.5 h-3.5 text-icm-text-dim" /> consent-signature.png <span className="ml-auto text-icm-text-dim">124 KB</span></li>
                </ul>
              ) : <p className="text-[12.5px] text-icm-text-dim">No attachments included.</p>}
            </Section>

            {/* Version history */}
            {note.versions && note.versions.length > 0 && (
              <Section icon={<History className="w-4 h-4" />} title={`Amendment History (${note.versions.length} version${note.versions.length > 1 ? "s" : ""})`}>
                <ol className="space-y-3">
                  {note.versions.map((v) => (
                    <li key={v.versionNumber} className="rounded-lg border border-icm-border bg-icm-bg p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-icm-accent-soft text-icm-accent text-[10px] font-bold font-mono">v{v.versionNumber}</span>
                        <span className="text-[11.5px] font-geist font-semibold text-icm-text">{v.savedBy}</span>
                        <span className="text-[11px] font-mono text-icm-text-faint ml-auto">{new Date(v.savedAt).toLocaleString()}</span>
                      </div>
                      {v.reason && <p className="text-[11.5px] text-icm-text-dim italic mb-1.5">Amendment reason: "{v.reason}"</p>}
                      <p className="text-[12px] text-icm-text leading-relaxed line-clamp-3">{v.narrative}</p>
                    </li>
                  ))}
                </ol>
              </Section>
            )}
          </div>

          {/* Right: actions & history */}
          <div className="space-y-3">
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
              <h3 className="font-manrope font-bold text-[14px] mb-2">Review actions</h3>
              {locked ? (
                <div className="text-[12px] text-icm-text-dim space-y-2">
                  <p className="inline-flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Approved and locked. Use Amend to make changes — original is permanently preserved.
                  </p>
                  <button
                    onClick={() => { setAmendNarrative(note.narrative); setAmendOpen(true); }}
                    className="w-full h-9 rounded-md border border-icm-border bg-white text-[12.5px] inline-flex items-center justify-center gap-1.5 hover:bg-icm-bg"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Amend note
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button onClick={() => apply("approve")} className="w-full h-10 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                  <button onClick={() => { setActionOpen("return"); setComment(""); }} className="w-full h-10 rounded-xl border border-icm-border bg-white text-[13px] font-medium inline-flex items-center justify-center gap-1.5">
                    <RotateCcw className="w-4 h-4" /> Return for correction
                  </button>
                  <button onClick={() => { setActionOpen("reject"); setComment(""); }} className="w-full h-10 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 text-[13px] font-medium inline-flex items-center justify-center gap-1.5">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                  {(!note.hasPlanLink || !note.authorizationOk) && (
                    <button onClick={() => { setActionOpen("override"); setComment(""); }} className="w-full h-10 rounded-xl bg-amber-600 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" /> Approve with override
                    </button>
                  )}
                  {(note.status === "Amendment pending approval") && (
                    <button onClick={() => { setAmendNarrative(note.narrative); setAmendOpen(true); }}
                      className="w-full h-9 rounded-md border border-icm-accent/30 bg-icm-accent-soft text-icm-accent text-[12.5px] inline-flex items-center justify-center gap-1.5 hover:opacity-90"
                    >
                      <Pencil className="w-3.5 h-3.5" /> View amendment
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
              <h3 className="font-manrope font-bold text-[14px] mb-2 inline-flex items-center gap-2"><History className="w-4 h-4" /> Approval audit trail</h3>
              {history.length === 0 ? <p className="text-[12px] text-icm-text-dim">No supervisor actions yet.</p> : (
                <ol className="space-y-2">
                  {history.map((h, i) => (
                    <li key={i} className="text-[12px] border-l-2 border-blue-300 pl-2">
                      <div className="font-semibold text-icm-text">{h.action}</div>
                      <div className="text-icm-text-dim">{h.by} · {new Date(h.ts).toLocaleString()}</div>
                      {h.note && <div className="italic text-icm-text-dim mt-0.5">"{h.note}"</div>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action modal (reject / return / override) */}
      {actionOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setActionOpen(null)}>
          <div className="bg-icm-panel rounded-2xl border border-icm-border max-w-lg w-full p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              {actionOpen === "reject"   && <XCircle className="w-5 h-5 text-rose-600" />}
              {actionOpen === "return"   && <RotateCcw className="w-5 h-5 text-amber-600" />}
              {actionOpen === "override" && <ShieldAlert className="w-5 h-5 text-amber-600" />}
              <h3 className="font-manrope font-extrabold text-[16px]">
                {actionOpen === "reject"   && "Reject note"}
                {actionOpen === "return"   && "Return for correction"}
                {actionOpen === "override" && "Approve with override"}
              </h3>
            </div>
            <p className="text-[12.5px] text-icm-text-dim">
              {actionOpen === "reject"   && "Rejection is final. The note will not be billable. The coordinator will receive an Inbox notification with your reason."}
              {actionOpen === "return"   && "Returning sends the note back to the coordinator for correction. They will see your reason in a banner on the note and can edit and resubmit."}
              {actionOpen === "override" && "Override bypasses billing validation. A written justification is required and is permanently logged."}
            </p>
            {actionOpen === "override" && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11.5px] text-amber-900 inline-flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5" />
                Findings being overridden: {!note.hasPlanLink && "no plan link"}{!note.hasPlanLink && !note.authorizationOk ? ", " : ""}{!note.authorizationOk && "missing/exhausted authorization"}.
              </div>
            )}
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={5}
              placeholder="Reason (required, min 20 characters)"
              className="w-full rounded-md border border-icm-border bg-white px-2 py-1.5 text-[13px]"
            />
            <div className="text-[10.5px] text-icm-text-dim">{comment.trim().length} / 20 minimum</div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setActionOpen(null)} className="h-9 px-3 rounded-md border border-icm-border text-[12.5px] bg-white">Cancel</button>
              <button
                onClick={() => apply(actionOpen!)}
                className={`h-9 px-3 rounded-md text-[12.5px] font-medium text-white ${actionOpen === "reject" ? "bg-rose-600" : "bg-amber-600"}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Amendment modal */}
      {amendOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setAmendOpen(false)}>
          <div className="bg-icm-panel rounded-2xl border border-icm-border max-w-2xl w-full p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-icm-accent" />
              <h3 className="font-manrope font-extrabold text-[16px]">Amend Approved Note</h3>
              <span className="ml-auto text-[11px] font-mono text-icm-text-faint">v{(note.versionNumber ?? 1) + 1} will be created</span>
            </div>
            <div className="rounded-lg border border-icm-amber/30 bg-icm-amber-soft px-3 py-2 text-[12px] font-geist text-icm-text">
              <span className="font-semibold">The original approved version (v{note.versionNumber ?? 1}) is permanently preserved.</span>{" "}
              This amendment creates a new version that requires supervisor re-approval.
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1 block">
                Reason for Amendment (required)
              </label>
              <input
                value={amendReason}
                onChange={e => setAmendReason(e.target.value)}
                placeholder="Describe why this note is being amended…"
                className="w-full h-10 px-3 rounded-lg border border-icm-border bg-white text-[13px]"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1 block">
                Amended Narrative
              </label>
              <textarea
                value={amendNarrative}
                onChange={e => setAmendNarrative(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 rounded-lg border border-icm-border bg-white text-[13px] leading-relaxed"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAmendOpen(false)} className="h-9 px-3 rounded-md border border-icm-border text-[12.5px] bg-white">Cancel</button>
              <button
                onClick={handleAmend}
                disabled={amendSaving}
                className="h-9 px-4 rounded-md bg-icm-accent text-white text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {amendSaving ? "Saving…" : "Save Amendment →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ICMShell>
  );
};

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
    <h3 className="font-manrope font-bold text-[14px] mb-2 inline-flex items-center gap-2">{icon} {title}</h3>
    {children}
  </div>
);
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><div className="text-[10.5px] uppercase tracking-wide text-icm-text-dim mb-0.5">{label}</div><div>{children}</div></div>
);
const Ok = ({ children }: { children: React.ReactNode }) => <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> {children}</span>;
const Bad = ({ children }: { children: React.ReactNode }) => <span className="inline-flex items-center gap-1 text-rose-700"><XCircle className="w-3.5 h-3.5" /> {children}</span>;

export default SupervisorReviewNote;
