import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Sparkles, Plus, X, ArrowRight, AlertTriangle, GitBranch, Loader2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import {
  progressFraction, workflowProgressTone, workflowTemplates, TERMINATION_REASONS,
} from "@/data/workflows";
import { useWorkflows, addWorkflow, updateWorkflow, type WorkflowRecord } from "@/hooks/useFirestore";
import { writeAudit } from "@/lib/auditService";



type Tab = "Active" | "Completed" | "Terminated";

const PersonWorkflowManager = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading } = useIndividual(id);
  const { data: allWorkflows, loading: workflowsLoading } = useWorkflows(id);
  const [tab, setTab] = useState<Tab>("Active");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  const [showStart, setShowStart] = useState(false);
  const [terminating, setTerminating] = useState<WorkflowRecord | null>(null);

  const all = useMemo(() => allWorkflows || [], [allWorkflows]);
  const filtered = useMemo(() => {
    return all.filter((w) => w.status === tab && (typeFilter === "All" || w.title === typeFilter));
  }, [all, tab, typeFilter]);

  if (loading || workflowsLoading) {
    return (
      <ICMShell title="Workflow Manager" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return <ICMShell title="Workflow Manager" showAIPanel={false}><p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p></ICMShell>;
  }

  const open = (wfId: string) => navigate(`/people/${id}/workflow-manager/${wfId}`);

  return (
    <ICMShell title="Workflow Manager" showAIPanel={false}>
      <div className="space-y-5">
        <button onClick={() => navigate(`/people/${individual.id}/echart`)} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {individual.last_name}, {individual.first_name} · Workflow Manager
        </button>

        {/* Person header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3 flex-wrap">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono text-[14px] font-bold ${riskAvatarClass(individual.risk_score)}`}>{initials(individual)}</div>
          <div className="min-w-0 flex-1">
            <h2 className="font-manrope font-extrabold text-[16px] text-icm-text tracking-tight">{individual.last_name}, {individual.first_name}</h2>
            <p className="text-[11.5px] font-mono text-icm-text-dim">{individual.gender ?? "—"} · {individual.county ?? "—"} · ID #{individual.id.slice(0, 8)}</p>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
            <span className="w-1.5 h-1.5 rounded-full bg-icm-green" />{individual.enrollment_status}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">Workflow Manager</h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">Event-driven compliance workflows</p>
          </div>
          <button onClick={() => setShowStart(true)} className="h-9 px-3 rounded-xl bg-teal-600 text-white text-[12px] font-geist font-medium hover:bg-teal-700 inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Start Workflow
          </button>
        </div>

        {/* AI ribbon */}
        <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
            <p className="text-[12.5px] font-geist text-icm-text leading-snug">
              <span className="font-semibold">I detected compliance events that may require a workflow:</span>{" "}
              <span className="text-icm-text-dim">{individual.first_name}'s ISP and Medicaid recertification may need action. Want me to trigger the relevant workflows?</span>
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => setShowStart(true)} className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline">Review suggestions →</button>
            <button className="text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">Dismiss</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-icm-border">
          {(["Active", "Completed", "Terminated"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 -mb-px border-b-2 text-[12.5px] font-geist font-medium transition-colors ${tab === t ? "border-icm-accent text-icm-text" : "border-transparent text-icm-text-dim hover:text-icm-text"}`}>
              {t} <span className="ml-1 text-[10.5px] font-mono text-icm-text-faint">{all.filter((w) => w.status === t).length}</span>
            </button>
          ))}
        </div>

        {tab === "Active" && (
          <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex flex-wrap items-center gap-2">
            <label className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">Type</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] text-icm-text">
              <option>All</option>
              {Array.from(new Set(all.map((w) => w.title))).map((t) => <option key={t}>{t}</option>)}
            </select>
            <button onClick={() => navigate("/admin/workflow-templates")} className="ml-auto text-[11px] font-geist text-icm-accent hover:underline">Manage templates →</button>
          </div>
        )}

        {/* Table or empty */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-icm-bg border border-icm-border flex items-center justify-center mb-4"><GitBranch className="w-7 h-7 text-icm-text-faint" /></div>
            <h2 className="font-manrope font-extrabold text-[20px] text-icm-text mb-1">No {tab.toLowerCase()} workflows</h2>
            <p className="text-[13px] text-icm-text-dim max-w-md mb-6">Trigger a workflow when a compliance event requires structured follow-through.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowStart(true)} className="h-10 px-4 rounded-xl border border-icm-border text-[13px] font-medium text-icm-text hover:bg-icm-bg">Start workflow</button>
              <button onClick={() => setShowStart(true)} className="h-10 px-4 rounded-xl bg-icm-text text-icm-panel text-[13px] font-medium hover:opacity-90 inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> AI suggests a workflow</button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] font-geist">
                <thead className="bg-icm-bg/60">
                  <tr>
                    {["ID", "Workflow Title", "Trigger Date", "Due Date", "Progress", "Created On", ""].map((c, i) => (
                      <th key={i} className="text-left px-4 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-icm-border">
                  {filtered.map((w) => (
                    <tr key={w.id} onClick={() => open(w.id)} className="hover:bg-icm-bg/40 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-mono text-icm-text-dim">{w.id}</td>
                      <td className="px-4 py-3 font-medium text-icm-text">{w.title}</td>
                      <td className="px-4 py-3 font-mono text-icm-text-dim">{w.triggerDate}</td>
                      <td className="px-4 py-3 font-mono text-icm-text-dim">{w.dueDate ?? "—"}</td>
                      <td className="px-4 py-3 min-w-[160px]"><ProgressBar w={w} /></td>
                      <td className="px-4 py-3 font-mono text-icm-text-dim">{w.createdOn}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => open(w.id)} className="p-1.5 rounded hover:bg-icm-bg text-icm-accent" title="Open"><ArrowRight className="w-3.5 h-3.5" /></button>
                          {w.status === "Active" && (
                            <button onClick={() => setTerminating(w)} className="p-1.5 rounded hover:bg-icm-bg text-icm-text-faint hover:text-icm-red" title="Terminate"><X className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Start modal */}
      {showStart && (
        <StartWorkflowModal
          personName={`${individual.first_name} ${individual.last_name}`}
          onClose={() => setShowStart(false)}
          onTriggered={(wfId) => { setShowStart(false); open(wfId); }}
          personId={individual.id}
        />
      )}

      {/* Terminate modal */}
      {terminating && (
        <TerminateModal
          workflow={terminating}
          onClose={() => setTerminating(null)}
          onConfirm={async (reason, notes) => {
            await updateWorkflow(terminating.id, {
              status: "Terminated",
              terminationReason: reason,
              terminationNotes: notes
            });
            await writeAudit('workflow_task_updated', 'workflow', terminating.id, {
              individualId: id ?? '',
              action: 'workflow_terminated',
              reason
            });
            setTerminating(null);
          }}
        />
      )}
    </ICMShell>
  );
};

function ProgressBar({ w }: { w: WorkflowRecord }) {
  const { done, total } = progressFraction(w);
  const pct = total === 0 ? 0 : (done / total) * 100;
  const tone = workflowProgressTone(w);
  const fill = tone === "red" ? "bg-icm-red" : tone === "amber" ? "bg-icm-amber" : "bg-icm-accent";
  const label = tone === "red" ? "text-icm-red" : tone === "amber" ? "text-icm-amber" : "text-icm-green";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-icm-bg border border-icm-border overflow-hidden">
        <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-mono text-[11px] ${label}`}>{done}/{total}</span>
    </div>
  );
}

function StartWorkflowModal({ personId, personName, onClose, onTriggered }: {
  personId: string; personName: string; onClose: () => void; onTriggered: (id: string) => void;
}) {
  // AI suggests ISP renewal for Joseph
  const aiSuggestedId = personId === "1" ? "tpl-isp" : "tpl-cm";
  const [templateId, setTemplateId] = useState(aiSuggestedId);
  const [triggerDate, setTriggerDate] = useState(new Date().toLocaleDateString("en-US"));
  const [notes, setNotes] = useState("");
  const [triggering, setTriggering] = useState(false);

  const handleTrigger = async () => {
    try {
      setTriggering(true);
      const tpl = workflowTemplates.find((t) => t.id === templateId) || workflowTemplates[0];
      const created = new Date();
      const createdLabel = `${triggerDate} ${created.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;

      const newWorkflowData = {
        individual_id: personId,
        individual_name: personName,
        personId,
        personName,
        title: tpl.name,
        triggerDate,
        createdOn: createdLabel,
        status: "Active" as const,
        notes,
        steps: tpl.steps.map((s, idx) => ({
          id: `step-${idx + 1}-${Math.random().toString(36).substring(2, 9)}`,
          number: idx + 1,
          title: s.title,
          description: s.description,
          status: idx === 0 ? ("In Progress" as const) : ("Pending" as const),
          staffResponsible: s.defaultAssignee ?? "Anyone",
          linkedModuleSlug: s.linkedModuleSlug,
          linkedModuleLabel: s.linkedModuleLabel,
          aiDraftReady: !!s.linkedModuleSlug,
        })),
      };

      const docRef = await addWorkflow(newWorkflowData);
      await writeAudit('settings_change', 'workflow', docRef.id, {
        individualId: personId,
        workflowTitle: tpl.name,
        action: 'workflow_created'
      });
      onTriggered(docRef.id);
    } catch (err) {
      console.error("Failed to start workflow:", err);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-icm-text/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-icm-panel rounded-2xl border border-icm-border w-full max-w-[480px] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-manrope font-bold text-[16px] text-icm-text">Start Workflow</h3>
          <button onClick={onClose} className="text-icm-text-faint hover:text-icm-text" disabled={triggering}><X className="w-4 h-4" /></button>
        </div>

        {personId === "1" && (
          <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-3 py-2.5 mb-4 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-icm-accent shrink-0 mt-0.5" />
            <p className="text-[12px] font-geist text-icm-text leading-snug">
              <span className="font-semibold">Based on Joseph's overdue ISP,</span>{" "}
              <span className="text-icm-text-dim">I recommend triggering the ISP Renewal Workflow. I've pre-selected it below.</span>
            </p>
          </div>
        )}

        <Field label="Select Workflow" required>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={triggering} className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text">
            {workflowTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>

        <Field label="Trigger Date">
          <input type="text" value={triggerDate} onChange={(e) => setTriggerDate(e.target.value)} disabled={triggering} className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text font-mono" />
        </Field>

        <Field label="Notes (optional)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={triggering} rows={3} placeholder="Why is this workflow being triggered?" className="w-full px-2 py-1.5 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
        </Field>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onClose} disabled={triggering} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] text-icm-text-dim hover:text-icm-text">Cancel</button>
          <button onClick={handleTrigger} disabled={triggering} className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 inline-flex items-center gap-1.5">
            {triggering && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Trigger
          </button>
        </div>
      </div>
    </div>
  );
}

function TerminateModal({ workflow, onClose, onConfirm }: { workflow: WorkflowRecord; onClose: () => void; onConfirm: (reason: string, notes: string) => void }) {
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
        <Field label="Reason for termination" required>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text">
            {TERMINATION_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Notes" required>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-2 py-1.5 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
        </Field>
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onClose} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] text-icm-text-dim hover:text-icm-text">Cancel</button>
          <button disabled={!notes.trim()} onClick={() => onConfirm(reason, notes)} className="h-9 px-4 rounded-xl bg-icm-red text-white text-[12px] font-medium hover:opacity-90 disabled:opacity-50">Terminate workflow</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1.5">
        {label}{required && <span className="text-icm-red ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default PersonWorkflowManager;
