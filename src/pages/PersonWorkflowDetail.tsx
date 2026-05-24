import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Sparkles, Check, ArrowRight, X, AlertTriangle, CheckCircle2, Loader2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import {
  progressFraction, TERMINATION_REASONS,
  type StepStatus,
} from "@/data/workflows";
import { useWorkflow, updateWorkflow, type WorkflowRecord, type WorkflowStep } from "@/hooks/useFirestore";
import { writeAudit } from "@/lib/auditService";

const moduleRoute = (personId: string, slug?: string) => {
  if (!slug) return "";
  const map: Record<string, string> = {
    "monitoring-form": "monitoring-form",
    "care-plan": "care-plan",
    "visit-summary": "visit-summary",
    "eligibility": "eligibility-verification",
    "progress-note": "progress-note",
    "contact-note": "contact-note",
    "case-management": "case-management",
  };
  const path = map[slug];
  return path ? `/people/${personId}/${path}` : `/people/${personId}/module/${slug}`;
};

const PersonWorkflowDetail = () => {
  const { id, workflowId } = useParams<{ id: string; workflowId: string }>();
  const navigate = useNavigate();
  const { individual, loading } = useIndividual(id);
  const { data: wf, loading: workflowLoading } = useWorkflow(workflowId);

  const [completing, setCompleting] = useState<WorkflowStep | null>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmCompleteAck, setConfirmCompleteAck] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const allDone = useMemo(() => wf ? wf.steps.every((s) => s.status === "Completed") : false, [wf]);

  if (loading || workflowLoading) {
    return (
      <ICMShell title="Workflow" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual || !wf) {
    return <ICMShell title="Workflow" showAIPanel={false}><p className="text-[13px] text-icm-text-dim font-geist">Workflow not found.</p></ICMShell>;
  }

  const { done, total } = progressFraction(wf);
  const pct = total === 0 ? 0 : (done / total) * 100;

  return (
    <ICMShell title="Workflow" showAIPanel={false}>
      <div className="space-y-5">
        <button onClick={() => navigate(`/people/${individual.id}/workflow-manager`)} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">
          <ChevronLeft className="w-3.5 h-3.5" />
          Workflow Manager
        </button>

        {/* Person mini-header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex items-center gap-3 flex-wrap">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-mono text-[12px] font-bold ${riskAvatarClass(individual.risk_score)}`}>{initials(individual)}</div>
          <div className="min-w-0 flex-1">
            <p className="font-manrope font-bold text-[13.5px] text-icm-text">{individual.last_name}, {individual.first_name}</p>
            <p className="text-[11px] font-mono text-icm-text-dim">ID #{individual.id.slice(0,8)} · {individual.county ?? "—"}</p>
          </div>
        </div>

        {/* Header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-manrope font-extrabold text-[20px] text-icm-text leading-tight tracking-tight">{wf.title}</h1>
                <StatusPill status={wf.status} />
              </div>
              <p className="text-[11.5px] font-mono text-icm-text-dim mt-1">
                Triggered {wf.triggerDate}
                {wf.dueDate && <> · Due <span className={isOverdue(wf.dueDate) ? "text-icm-red" : ""}>{wf.dueDate}</span></>}
                {" · ID "}{wf.id}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {wf.status === "Active" && (
                <>
                  <button onClick={() => setConfirmComplete(true)} disabled={!allDone} className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 disabled:opacity-40">Complete workflow</button>
                  <button onClick={() => setTerminating(true)} className="h-9 px-3 text-[12px] text-icm-red hover:underline">Terminate</button>
                </>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-geist text-icm-text-dim">Completion progress</span>
              <span className="text-[11.5px] font-mono text-icm-text">{done} of {total} steps complete</span>
            </div>
            <div className="h-2 rounded-full bg-icm-bg border border-icm-border overflow-hidden">
              <div className="h-full bg-icm-accent" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* AI banner */}
        {!bannerDismissed && wf.status === "Active" && (
          <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
              <p className="text-[12.5px] font-geist text-icm-text leading-snug">
                <span className="font-semibold">This workflow has {total} steps.</span>{" "}
                <span className="text-icm-text-dim">I can help you complete each one faster — I've pre-staged content for steps that link to other modules.</span>
              </p>
            </div>
            <button onClick={() => setBannerDismissed(true)} className="text-icm-text-faint hover:text-icm-text"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* All-complete banner */}
        {allDone && wf.status === "Active" && (
          <div className="rounded-xl border border-icm-green/20 bg-icm-green-soft px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-icm-green shrink-0" />
              <p className="text-[12.5px] font-geist text-icm-text">
                <span className="font-semibold">All steps complete.</span> <span className="text-icm-text-dim">Ready to close this workflow?</span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setConfirmComplete(true)} className="h-8 px-3 rounded-xl bg-icm-green text-white text-[11.5px] font-medium hover:opacity-90">Complete workflow</button>
              <button className="h-8 px-3 rounded-xl border border-icm-border text-[11.5px] text-icm-text-dim hover:text-icm-text">Keep open</button>
            </div>
          </div>
        )}

        {/* Termination notice */}
        {wf.status === "Terminated" && (
          <div className="rounded-xl border border-icm-red/20 bg-icm-red-soft px-4 py-3">
            <p className="text-[12.5px] font-geist text-icm-text"><span className="font-semibold">Workflow terminated.</span> Reason: {wf.terminationReason}</p>
            {wf.terminationNotes && <p className="text-[11.5px] text-icm-text-dim mt-1">{wf.terminationNotes}</p>}
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3">
          {wf.steps.map((s) => (
            <StepCard key={s.id} step={s} personId={individual.id} disabled={wf.status !== "Active"} onComplete={() => setCompleting(s)} />
          ))}
        </div>
      </div>

      {/* Step completion modal */}
      {completing && (
        <StepCompletionModal
          step={completing}
          personId={individual.id}
          onClose={() => setCompleting(null)}
          onConfirm={async (notes) => {
            if (!wf) return;
            const updatedSteps = wf.steps.map((s) => {
              if (s.id === completing.id) {
                return {
                  ...s,
                  status: "Completed" as const,
                  completedAt: new Date().toLocaleDateString("en-US"),
                  completionNotes: notes,
                };
              }
              return s;
            });
            const firstPendingIdx = updatedSteps.findIndex((s) => s.status === "Pending");
            if (firstPendingIdx !== -1) {
              updatedSteps[firstPendingIdx] = {
                ...updatedSteps[firstPendingIdx],
                status: "In Progress" as const,
              };
            }
            await updateWorkflow(wf.id, { steps: updatedSteps });
            await writeAudit('workflow_task_updated', 'workflow', wf.id, {
              individualId: id ?? '',
              action: 'step_completed',
              stepTitle: completing.title,
              stepNotes: notes ?? ''
            });
            setCompleting(null);
          }}
        />
      )}

      {/* Complete workflow confirmation */}
      {confirmComplete && (
        <div className="fixed inset-0 z-50 bg-icm-text/40 flex items-center justify-center p-4" onClick={() => setConfirmComplete(false)}>
          <div className="bg-icm-panel rounded-2xl border border-icm-border w-full max-w-[440px] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-manrope font-bold text-[16px] text-icm-text mb-2">Mark this workflow as complete?</h3>
            <div className="rounded-xl bg-icm-bg border border-icm-border p-3 text-[12px] font-geist space-y-1 mb-3">
              <p className="text-icm-text-dim">Completed date: <span className="font-mono text-icm-text">{new Date().toLocaleDateString("en-US")}</span></p>
              <p className="text-icm-text-dim">This workflow will move to the Completed tab.</p>
            </div>
            <label className="flex items-start gap-2 text-[12px] text-icm-text mb-4">
              <input type="checkbox" checked={confirmCompleteAck} onChange={(e) => setConfirmCompleteAck(e.target.checked)} className="mt-0.5" />
              I confirm all steps have been properly documented.
            </label>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmComplete(false)} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] text-icm-text-dim hover:text-icm-text">Cancel</button>
              <button disabled={!confirmCompleteAck} onClick={async () => {
                if (!wf) return;
                await updateWorkflow(wf.id, {
                  status: "Completed",
                  completedDate: new Date().toLocaleDateString("en-US"),
                });
                await writeAudit('workflow_task_updated', 'workflow', wf.id, {
                  individualId: id ?? '',
                  action: 'workflow_completed'
                });
                setConfirmComplete(false);
              }} className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 disabled:opacity-50">Complete</button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate modal */}
      {terminating && (
        <TerminateModal
          onClose={() => setTerminating(false)}
          onConfirm={async (reason, notes) => {
            if (!wf) return;
            await updateWorkflow(wf.id, {
              status: "Terminated",
              terminationReason: reason,
              terminationNotes: notes,
            });
            await writeAudit('workflow_task_updated', 'workflow', wf.id, {
              individualId: id ?? '',
              action: 'workflow_terminated',
              reason
            });
            setTerminating(false);
          }}
        />
      )}
    </ICMShell>
  );
};

function StepCard({ step, personId, disabled, onComplete }: { step: WorkflowStep; personId: string; disabled: boolean; onComplete: () => void }) {
  const navigate = useNavigate();
  const tone = stepTone(step.status);
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <div className="flex items-start gap-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${tone.badge}`}>
          {step.status === "Completed" ? <Check className="w-3.5 h-3.5" /> : step.number}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-manrope font-bold text-[13.5px] text-icm-text leading-tight">{step.title}</p>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-geist font-semibold ring-1 ${tone.pill}`}>{step.status}</span>
              </div>
              <p className="text-[12px] text-icm-text-dim leading-relaxed mt-1">{step.description}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {step.dueDate && (
                  <span className={`text-[11px] font-mono ${isOverdue(step.dueDate) && step.status !== "Completed" ? "text-icm-red" : "text-icm-text-dim"}`}>
                    Due {step.dueDate}
                  </span>
                )}
                <span className="text-[11px] font-geist text-icm-text-dim">Staff: {step.staffResponsible ?? "Anyone"}</span>
                {step.linkedModuleLabel && step.linkedModuleSlug && (
                  <button onClick={() => navigate(moduleRoute(personId, step.linkedModuleSlug))} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-geist font-medium bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20 hover:brightness-95">
                    → {step.linkedModuleLabel}
                  </button>
                )}
                {step.aiDraftReady && step.status !== "Completed" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-geist font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20">
                    <Sparkles className="w-2.5 h-2.5" /> AI draft ready
                  </span>
                )}
              </div>
              {step.completedAt && (
                <p className="text-[11px] font-mono text-icm-green mt-1.5">Completed {step.completedAt}</p>
              )}
            </div>
            <div className="shrink-0">
              {step.status === "Completed" ? (
                <button className="h-8 px-3 rounded-xl border border-icm-border text-[11.5px] text-icm-text-dim hover:text-icm-text">View</button>
              ) : (
                <button disabled={disabled} onClick={onComplete} className="h-8 px-3 rounded-xl bg-icm-text text-icm-panel text-[11.5px] font-medium hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1">
                  Complete step <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCompletionModal({ step, personId, onClose, onConfirm }: {
  step: WorkflowStep; personId: string; onClose: () => void; onConfirm: (notes?: string) => void;
}) {
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-icm-text/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-icm-panel rounded-2xl border border-icm-border w-full max-w-[480px] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-manrope font-bold text-[16px] text-icm-text">Complete: {step.title}</h3>
          <button onClick={onClose} className="text-icm-text-faint hover:text-icm-text"><X className="w-4 h-4" /></button>
        </div>

        {step.linkedModuleLabel ? (
          <>
            <p className="text-[12.5px] text-icm-text-dim mb-3">This step requires action in <span className="text-icm-text font-medium">{step.linkedModuleLabel}</span>.</p>
            {step.aiDraftReady && (
              <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-3 py-2.5 mb-3 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-icm-accent shrink-0 mt-0.5" />
                <p className="text-[12px] font-geist text-icm-text leading-snug">
                  <span className="font-semibold">AI has pre-staged content in {step.linkedModuleLabel}.</span> <span className="text-icm-text-dim">Review before saving.</span>
                </p>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 mt-4 flex-wrap">
              <button onClick={onClose} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] text-icm-text-dim hover:text-icm-text">Cancel</button>
              <button onClick={() => onConfirm(notes)} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] text-icm-text">Mark complete without documentation</button>
              <button onClick={() => navigate(moduleRoute(personId, step.linkedModuleSlug))} className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 inline-flex items-center gap-1">
                Go to {step.linkedModuleLabel} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[12.5px] text-icm-text mb-2">Mark this step as complete?</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Add any notes about completion" className="w-full px-2 py-1.5 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text mb-3" />
            <div className="flex items-center justify-end gap-2">
              <button onClick={onClose} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] text-icm-text-dim hover:text-icm-text">Cancel</button>
              <button onClick={() => onConfirm(notes)} className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90">Mark complete</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TerminateModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string, notes: string) => void }) {
  const [reason, setReason] = useState<string>(TERMINATION_REASONS[0]);
  const [notes, setNotes] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-icm-text/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-icm-panel rounded-2xl border border-icm-border w-full max-w-[480px] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-icm-red shrink-0 mt-0.5" />
          <div>
            <h3 className="font-manrope font-bold text-[16px] text-icm-text">Terminate this workflow?</h3>
            <p className="text-[12px] text-icm-text-dim mt-1">Terminating is permanent. The workflow will move to the Terminated tab with an audit record.</p>
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1.5">Reason for termination *</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text">
            {TERMINATION_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="block text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1.5">Notes *</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-2 py-1.5 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] text-icm-text-dim hover:text-icm-text">Cancel</button>
          <button disabled={!notes.trim()} onClick={() => onConfirm(reason, notes)} className="h-9 px-4 rounded-xl bg-icm-red text-white text-[12px] font-medium hover:opacity-90 disabled:opacity-50">Terminate workflow</button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "Active" | "Completed" | "Terminated" }) {
  const map = {
    Active: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    Completed: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    Terminated: "bg-icm-red-soft text-icm-red ring-icm-red/20",
  } as const;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${map[status]}`}>{status}</span>;
}

function stepTone(status: StepStatus) {
  switch (status) {
    case "Completed":
      return { badge: "bg-icm-green text-white", pill: "bg-icm-green-soft text-icm-green ring-icm-green/20" };
    case "In Progress":
      return { badge: "bg-icm-accent text-white", pill: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20" };
    case "Overdue":
      return { badge: "bg-icm-red text-white", pill: "bg-icm-red-soft text-icm-red ring-icm-red/20" };
    default:
      return { badge: "bg-icm-bg border border-icm-border text-icm-text-dim", pill: "bg-icm-bg text-icm-text-dim ring-icm-border" };
  }
}

function isOverdue(date: string): boolean {
  // "MM/DD/YYYY"
  const [m, d, y] = date.split("/").map(Number);
  if (!m || !d || !y) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getTime() < Date.now();
}

export default PersonWorkflowDetail;
