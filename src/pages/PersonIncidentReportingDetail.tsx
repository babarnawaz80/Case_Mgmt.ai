import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Sparkles, Check, X, AlertTriangle, FileDown, Plus, Trash2, ShieldAlert, CheckCircle2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { PersonAIPanel } from "@/components/icm/PersonAIPanel";
import { getPerson, riskAvatarClass, initials } from "@/data/people";
import {
  getIncident, createIncident, updateIncident, suggestedClassification, classificationLocked,
  INCIDENT_TYPES, CLASSIFICATIONS, PERSON_RESPONSIBLE, CONTRIBUTING_FACTORS, STAGE_LABELS,
  type IncidentRecord, type IncidentStageId, type NotificationRow, type ActionItem,
} from "@/data/incidents";
import type { AISuggestion } from "@/data/people";

const detailSuggestions: AISuggestion[] = [
  { tone: "urgent", label: "Urgent", body: "Stage 2 (Notification Log) requires Standing Committee notification. This is past the standard 72-hour window.", cta: "Add notification" },
  { tone: "insight", label: "Insight", body: "I drafted a corrective action plan based on the contributing factors selected.", cta: "Review draft" },
];

const PersonIncidentReportingDetail = () => {
  const { id, incidentId } = useParams<{ id: string; incidentId: string }>();
  const navigate = useNavigate();
  const isNew = incidentId === "new";
  const person = getPerson(id ?? "");
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);

  // Local form state for new incident (Step 1 wizard)
  const [draft, setDraft] = useState<Partial<IncidentRecord>>(() => ({
    incidentDate: new Date().toLocaleDateString("en-US"),
    incidentTime: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }),
    programSite: person?.county ?? "",
    incidentTypes: [],
    classification: "Unknown",
    staffOnDuty: [],
    description: "",
    immediateActions: "",
    medicalRequired: false,
    hospitalized: false,
    stateNotified: false,
    committeeNotified: false,
    guardianNotified: false,
  }));
  const [aiPrefilled] = useState<Set<string>>(new Set(["description", "immediateActions"])); // simulated prefill chips

  const wf = !isNew ? getIncident(incidentId ?? "") : undefined;
  const [activeStage, setActiveStage] = useState<IncidentStageId>(wf?.currentStage ?? 1);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeAck, setCloseAck] = useState(false);

  if (!person) {
    return <ICMShell title="Incident" showAIPanel={false}><p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p></ICMShell>;
  }

  if (isNew) {
    return <NewIncidentWizard person={person} draft={draft} setDraft={setDraft} aiPrefilled={aiPrefilled} onCancel={() => navigate(`/people/${person.id}/incident-reporting`)} onSubmit={() => {
      const created = createIncident({ ...draft, personId: person.id, personName: `${person.lastName}, ${person.firstName}` });
      navigate(`/people/${person.id}/incident-reporting/${created.id}`);
    }} />;
  }

  if (!wf) {
    return <ICMShell title="Incident" showAIPanel={false}><p className="text-[13px] text-icm-text-dim font-geist">Incident not found.</p></ICMShell>;
  }

  const allStagesComplete = ([1, 2, 3, 4] as IncidentStageId[]).every((s) => wf.stageStatuses[s] === "Complete") && !!wf.finalNarrative;

  return (
    <ICMShell title="Incident" rightPanel={<PersonAIPanel person={person} suggestions={detailSuggestions} intro="2 incident-related suggestions." />}>
      <div className="space-y-5">
        <button onClick={() => navigate(`/people/${person.id}/incident-reporting`)} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">
          <ChevronLeft className="w-3.5 h-3.5" /> Incident Reports
        </button>

        {wf.status === "Open" && (
          <div className="rounded-xl border border-icm-red/20 bg-icm-red-soft px-4 py-3 flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-icm-red shrink-0" />
            <p className="text-[12.5px] font-geist text-icm-text"><span className="font-semibold">This incident has open follow-up requirements.</span> <span className="text-icm-text-dim">Complete each stage to close the report.</span></p>
          </div>
        )}

        {/* Header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-icm-bg border border-icm-border font-mono text-[12px] text-icm-text font-bold">ID {wf.id}</span>
                {wf.incidentTypes.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-[10.5px] font-geist font-semibold bg-icm-red-soft text-icm-red ring-1 ring-icm-red/20">{t}</span>
                ))}
                <ClassificationPill c={wf.classification} />
                <StatusPill s={wf.status} />
              </div>
              <p className="text-[11.5px] font-mono text-icm-text-dim mt-1.5">
                Occurred {wf.incidentDate} {wf.incidentTime} · {wf.programSite} · Reported by {wf.lastUpdatedBy}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-9 px-3 rounded-xl border border-icm-border text-[12px] text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5"><FileDown className="w-3.5 h-3.5" /> Generate SC Packet</button>
              <button className="h-9 px-3 rounded-xl border border-icm-border text-[12px] text-icm-text hover:bg-icm-bg">Print</button>
              <button onClick={() => setShowVoidModal(true)} className="h-9 px-3 text-[12px] text-icm-red hover:underline">Void</button>
            </div>
          </div>

          <div className="mt-4">
            <StageProgress stages={wf.stageStatuses} currentStage={wf.currentStage} />
          </div>
        </div>

        {/* Two-column: stage nav + active stage */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
          <aside className="lg:sticky lg:top-4 self-start rounded-xl border border-icm-border bg-icm-panel p-2 space-y-1">
            {([1, 2, 3, 4, 5] as IncidentStageId[]).map((s) => {
              const status = wf.stageStatuses[s];
              const active = activeStage === s;
              return (
                <button key={s} onClick={() => setActiveStage(s)} className={`w-full text-left px-3 py-2 rounded-lg text-[12px] font-geist transition-colors ${active ? "bg-icm-accent-soft text-icm-accent" : "text-icm-text hover:bg-icm-bg"}`}>
                  <div className="flex items-center gap-2">
                    <StageDot status={status} num={s} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight">{STAGE_LABELS[s]}</p>
                      <p className="text-[10.5px] text-icm-text-faint">Step {s} of 5</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </aside>

          <div className="space-y-4">
            {activeStage === 1 && <Stage1View wf={wf} />}
            {activeStage === 2 && <Stage2View wf={wf} onChange={refresh} />}
            {activeStage === 3 && <Stage3View wf={wf} onChange={refresh} />}
            {activeStage === 4 && <Stage4View wf={wf} onChange={refresh} />}
            {activeStage === 5 && <Stage5View wf={wf} onClose={() => setShowCloseModal(true)} onChange={refresh} canClose={allStagesComplete && wf.status !== "Closed"} />}
          </div>
        </div>
      </div>

      {showVoidModal && (
        <ConfirmModal title="Void this incident?" message="Voiding is permanent and creates an audit record." confirmLabel="Void" tone="red" onClose={() => setShowVoidModal(false)} onConfirm={() => { updateIncident(wf.id, { status: "Void", voided: true }); setShowVoidModal(false); refresh(); }} />
      )}

      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-icm-text/40 flex items-center justify-center p-4" onClick={() => setShowCloseModal(false)}>
          <div className="bg-icm-panel rounded-2xl border border-icm-border w-full max-w-[440px] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-manrope font-bold text-[16px] text-icm-text mb-2">Close Incident</h3>
            <p className="text-[12.5px] text-icm-text-dim mb-3">This will permanently close incident {wf.id}. All stages must be complete.</p>
            <label className="flex items-start gap-2 text-[12px] text-icm-text mb-4">
              <input type="checkbox" checked={closeAck} onChange={(e) => setCloseAck(e.target.checked)} className="mt-0.5" />
              I confirm all documentation is complete.
            </label>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setShowCloseModal(false)} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] text-icm-text-dim hover:text-icm-text">Cancel</button>
              <button disabled={!closeAck} onClick={() => { updateIncident(wf.id, { status: "Closed", closedAt: new Date().toLocaleDateString("en-US"), stageStatuses: { 1: "Complete", 2: "Complete", 3: "Complete", 4: "Complete", 5: "Complete" } }); setShowCloseModal(false); refresh(); }} className="h-9 px-4 rounded-xl bg-icm-green text-white text-[12px] font-medium hover:opacity-90 disabled:opacity-50">Close incident</button>
            </div>
          </div>
        </div>
      )}
    </ICMShell>
  );
};

// ----- New incident wizard (Step 1) -----

function NewIncidentWizard({ person, draft, setDraft, aiPrefilled, onCancel, onSubmit }: {
  person: ReturnType<typeof getPerson>;
  draft: Partial<IncidentRecord>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<IncidentRecord>>>;
  aiPrefilled: Set<string>;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const navigate = useNavigate();
  if (!person) return null;
  const types = draft.incidentTypes ?? [];
  const locked = classificationLocked(types);
  const suggested = suggestedClassification(types);

  // Auto-update classification when types change (locked = forced, otherwise just suggested)
  const setTypes = (next: string[]) => {
    setDraft((d) => {
      const sug = suggestedClassification(next);
      if (classificationLocked(next)) return { ...d, incidentTypes: next, classification: sug };
      // Don't downgrade from a higher classification user picked
      return { ...d, incidentTypes: next };
    });
  };

  const canSubmit = (draft.incidentTypes?.length ?? 0) > 0 && !!draft.location && !!draft.description?.trim() && !!draft.immediateActions?.trim();

  return (
    <ICMShell title="Report Incident" showAIPanel={false}>
      <div className="space-y-5 max-w-4xl">
        <button onClick={onCancel} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">
          <ChevronLeft className="w-3.5 h-3.5" /> Incident Reports
        </button>

        <div className="rounded-xl border border-icm-red/30 bg-icm-red-soft px-4 py-3 flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-icm-red shrink-0" />
          <p className="text-[12.5px] font-geist text-icm-text"><span className="font-semibold">New Incident Report — Time sensitive.</span> <span className="text-icm-text-dim">Initial reports must be filed within 24 hours per your organization's policy.</span></p>
        </div>

        <StageProgress stages={{ 1: "Current", 2: "Pending", 3: "Pending", 4: "Pending", 5: "Pending" }} currentStage={1} />

        <SectionCard title="Incident Details">
          <Grid>
            <Field label="Person Supported" required>
              <input disabled value={`${person.lastName}, ${person.firstName}`} className="w-full h-9 px-2 rounded-lg border border-icm-border bg-icm-bg text-[12.5px] text-icm-text" />
            </Field>
            <Field label="Incident Date" required>
              <input value={draft.incidentDate ?? ""} onChange={(e) => setDraft((d) => ({ ...d, incidentDate: e.target.value }))} className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text font-mono" />
            </Field>
            <Field label="Incident Time" required>
              <input value={draft.incidentTime ?? ""} onChange={(e) => setDraft((d) => ({ ...d, incidentTime: e.target.value }))} className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text font-mono" />
            </Field>
            <Field label="Program / Site" required>
              <input value={draft.programSite ?? ""} onChange={(e) => setDraft((d) => ({ ...d, programSite: e.target.value }))} className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
            </Field>
            <Field label="Location of Incident" required>
              <input value={draft.location ?? ""} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} placeholder="Where did the incident occur?" className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
            </Field>
          </Grid>

          <Field label="Incident Type (multi-select)" required>
            <div className="flex flex-wrap gap-1.5">
              {INCIDENT_TYPES.map((t) => {
                const selected = types.includes(t);
                return (
                  <button key={t} type="button" onClick={() => setTypes(selected ? types.filter((x) => x !== t) : [...types, t])} className={`px-2 py-1 rounded-full text-[10.5px] font-geist font-medium ring-1 transition-colors ${selected ? "bg-icm-red text-white ring-icm-red" : "bg-icm-bg text-icm-text-dim ring-icm-border hover:text-icm-text"}`}>
                    {t}
                  </button>
                );
              })}
            </div>
          </Field>

          <Grid>
            <Field label="Classification">
              <select disabled={locked} value={draft.classification ?? "Unknown"} onChange={(e) => setDraft((d) => ({ ...d, classification: e.target.value as IncidentRecord["classification"] }))} className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text disabled:bg-icm-bg">
                {CLASSIFICATIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
              {locked && <p className="text-[10.5px] text-icm-red mt-1 font-geist">Locked: incident type maps to Critical and cannot be downgraded.</p>}
              {!locked && suggested !== "Unknown" && <p className="text-[10.5px] text-icm-accent mt-1 font-geist inline-flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> AI suggested: {suggested}</p>}
            </Field>
            <Field label="Person Responsible">
              <select value={draft.personResponsible ?? "Unknown"} onChange={(e) => setDraft((d) => ({ ...d, personResponsible: e.target.value }))} className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text">
                {PERSON_RESPONSIBLE.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </Grid>

          <Field label="Description of Incident" required aiPrefilled={aiPrefilled.has("description")}>
            <textarea value={draft.description ?? ""} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} rows={5} maxLength={8000} placeholder="Provide a detailed description of what occurred. Include who was present, what happened, sequence of events, and immediate response." className="w-full px-2 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
          </Field>

          <Field label="Immediate Actions Taken" required aiPrefilled={aiPrefilled.has("immediateActions")}>
            <textarea value={draft.immediateActions ?? ""} onChange={(e) => setDraft((d) => ({ ...d, immediateActions: e.target.value }))} rows={3} maxLength={4000} placeholder="What immediate steps were taken in response to this incident?" className="w-full px-2 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
          </Field>

          <Grid>
            <Field label="Was medical attention required?">
              <Toggle value={!!draft.medicalRequired} onChange={(v) => setDraft((d) => ({ ...d, medicalRequired: v }))} />
            </Field>
            <Field label="Was the individual hospitalized?">
              <Toggle value={!!draft.hospitalized} onChange={(v) => setDraft((d) => ({ ...d, hospitalized: v }))} />
            </Field>
          </Grid>
        </SectionCard>

        <SectionCard title="Reporting Requirements">
          <div className="rounded-lg border border-icm-amber/20 bg-icm-amber-soft px-3 py-2 mb-3">
            <p className="text-[11.5px] font-geist text-icm-text"><span className="font-semibold">Initial reports required within 24 hours.</span> <span className="text-icm-text-dim">Time elapsed since incident: 0 hours.</span></p>
          </div>
          <Grid>
            <Field label="State agency notified?">
              <Toggle value={!!draft.stateNotified} onChange={(v) => setDraft((d) => ({ ...d, stateNotified: v }))} />
            </Field>
            <Field label="Standing Committee notified?">
              <Toggle value={!!draft.committeeNotified} onChange={(v) => setDraft((d) => ({ ...d, committeeNotified: v }))} />
            </Field>
            <Field label="Guardian / Family notified?">
              <Toggle value={!!draft.guardianNotified} onChange={(v) => setDraft((d) => ({ ...d, guardianNotified: v }))} />
            </Field>
          </Grid>
        </SectionCard>

        <SectionCard title="Attachments">
          <UploadZone />
        </SectionCard>

        <div className="flex items-center justify-end gap-2 sticky bottom-0 bg-icm-bg/80 backdrop-blur py-3 -mx-2 px-2 rounded-xl border-t border-icm-border">
          <button onClick={onCancel} className="h-10 px-4 rounded-xl border border-icm-border text-[12.5px] text-icm-text-dim hover:text-icm-text">Cancel</button>
          <button className="h-10 px-4 rounded-xl border border-icm-border text-[12.5px] text-icm-text">Save draft</button>
          <button disabled={!canSubmit} onClick={onSubmit} className="h-10 px-4 rounded-xl bg-icm-red text-white text-[12.5px] font-medium hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" /> Submit initial report
          </button>
        </div>
      </div>
    </ICMShell>
  );
}

// ----- Stage views -----

function Stage1View({ wf }: { wf: IncidentRecord }) {
  return (
    <SectionCard title="Stage 1 · Initial Report">
      <Grid>
        <ReadField label="Incident Date">{wf.incidentDate} {wf.incidentTime}</ReadField>
        <ReadField label="Program / Site">{wf.programSite}</ReadField>
        <ReadField label="Location">{wf.location}</ReadField>
        <ReadField label="Person Responsible">{wf.personResponsible ?? "—"}</ReadField>
        <ReadField label="Classification"><ClassificationPill c={wf.classification} /></ReadField>
        <ReadField label="Staff on Duty">{wf.staffOnDuty.join(", ") || "—"}</ReadField>
      </Grid>
      <ReadField label="Incident Types">
        <div className="flex flex-wrap gap-1.5">
          {wf.incidentTypes.map((t) => <span key={t} className="px-2 py-0.5 rounded-full text-[10.5px] font-geist font-semibold bg-icm-red-soft text-icm-red ring-1 ring-icm-red/20">{t}</span>)}
        </div>
      </ReadField>
      <ReadField label="Description">{wf.description}</ReadField>
      <ReadField label="Immediate Actions Taken">{wf.immediateActions}</ReadField>
      <Grid>
        <ReadField label="Medical attention required">{wf.medicalRequired ? "Yes" : "No"}</ReadField>
        <ReadField label="Hospitalized">{wf.hospitalized ? "Yes" : "No"}</ReadField>
      </Grid>
    </SectionCard>
  );
}

function Stage2View({ wf, onChange }: { wf: IncidentRecord; onChange: () => void }) {
  const [rows, setRows] = useState<NotificationRow[]>(wf.notifications);
  const update = (next: NotificationRow[]) => { setRows(next); updateIncident(wf.id, { notifications: next }); onChange(); };

  return (
    <SectionCard title="Stage 2 · Notification Log">
      <p className="text-[12px] text-icm-text-dim mb-3">Who was notified and when. Required parties without a date show an amber dot.</p>
      <div className="overflow-x-auto rounded-lg border border-icm-border">
        <table className="w-full text-[12px] font-geist">
          <thead className="bg-icm-bg/60">
            <tr>
              {["", "Party", "Method", "Date / Time", "Reference #", "Notes", ""].map((c, i) => <th key={i} className="text-left px-3 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">{c}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-icm-border">
            {rows.map((r, idx) => {
              const incomplete = r.required && !r.dateTime;
              return (
                <tr key={r.id} className="hover:bg-icm-bg/40">
                  <td className="px-3 py-2"><span className={`w-2 h-2 rounded-full inline-block ${incomplete ? "bg-icm-amber" : "bg-icm-green"}`} /></td>
                  <td className="px-3 py-2 font-medium text-icm-text">{r.party}{r.required && <span className="text-icm-red ml-1">*</span>}</td>
                  <td className="px-3 py-2"><input value={r.contactMethod ?? ""} onChange={(e) => update(rows.map((x, i) => i === idx ? { ...x, contactMethod: e.target.value } : x))} className="h-7 w-full px-2 rounded border border-icm-border bg-white text-[11.5px]" /></td>
                  <td className="px-3 py-2"><input value={r.dateTime ?? ""} onChange={(e) => update(rows.map((x, i) => i === idx ? { ...x, dateTime: e.target.value } : x))} placeholder="MM/DD/YYYY HH:MM" className="h-7 w-full px-2 rounded border border-icm-border bg-white text-[11.5px] font-mono" /></td>
                  <td className="px-3 py-2"><input value={r.referenceNumber ?? ""} onChange={(e) => update(rows.map((x, i) => i === idx ? { ...x, referenceNumber: e.target.value } : x))} className="h-7 w-full px-2 rounded border border-icm-border bg-white text-[11.5px] font-mono" /></td>
                  <td className="px-3 py-2"><input value={r.notes ?? ""} onChange={(e) => update(rows.map((x, i) => i === idx ? { ...x, notes: e.target.value } : x))} className="h-7 w-full px-2 rounded border border-icm-border bg-white text-[11.5px]" /></td>
                  <td className="px-3 py-2 text-right"><button onClick={() => update(rows.filter((_, i) => i !== idx))} className="text-icm-text-faint hover:text-icm-red"><Trash2 className="w-3.5 h-3.5" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button onClick={() => update([...rows, { id: `n${Date.now()}`, party: "Other" }])} className="mt-3 h-8 px-3 rounded-xl border border-icm-border text-[11.5px] text-icm-text inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add notification</button>

      <StageActions wf={wf} stage={2} onChange={onChange} />
    </SectionCard>
  );
}

function Stage3View({ wf, onChange }: { wf: IncidentRecord; onChange: () => void }) {
  const [findings, setFindings] = useState(wf.investigationFindings ?? "");
  const [factors, setFactors] = useState<string[]>(wf.contributingFactors);
  const [preventable, setPreventable] = useState<IncidentRecord["preventable"]>(wf.preventable);
  const [correctiveRequired, setCorrectiveRequired] = useState(!!wf.correctiveActionRequired);

  const persist = () => { updateIncident(wf.id, { investigationFindings: findings, contributingFactors: factors, preventable, correctiveActionRequired: correctiveRequired }); onChange(); };

  return (
    <SectionCard title="Stage 3 · Investigation">
      <Grid>
        <ReadField label="Assigned to">{wf.investigationAssignedTo ?? "—"}</ReadField>
        <ReadField label="Start date">{wf.investigationStartDate ?? "—"}</ReadField>
        <ReadField label="Due date">{wf.investigationDueDate ?? "—"}</ReadField>
      </Grid>
      <Field label="Investigation findings" required>
        <textarea value={findings} onChange={(e) => setFindings(e.target.value)} onBlur={persist} rows={5} maxLength={8000} placeholder="Document the findings of the investigation including interviews conducted, evidence reviewed, and conclusions reached." className="w-full px-2 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
      </Field>
      <Field label="Contributing factors">
        <div className="flex flex-wrap gap-1.5">
          {CONTRIBUTING_FACTORS.map((f) => {
            const selected = factors.includes(f);
            return (
              <button key={f} type="button" onClick={() => { const next = selected ? factors.filter((x) => x !== f) : [...factors, f]; setFactors(next); updateIncident(wf.id, { contributingFactors: next }); onChange(); }} className={`px-2 py-1 rounded-full text-[10.5px] font-geist font-medium ring-1 transition-colors ${selected ? "bg-icm-text text-icm-panel ring-icm-text" : "bg-icm-bg text-icm-text-dim ring-icm-border hover:text-icm-text"}`}>
                {f}
              </button>
            );
          })}
        </div>
      </Field>
      <Grid>
        <Field label="Was this incident preventable?">
          <select value={preventable ?? ""} onChange={(e) => { setPreventable(e.target.value as IncidentRecord["preventable"]); persist(); }} className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text">
            <option value="">—</option>
            <option>Yes</option><option>No</option><option>Unknown</option>
          </select>
        </Field>
        <Field label="Corrective action required?">
          <Toggle value={correctiveRequired} onChange={(v) => { setCorrectiveRequired(v); updateIncident(wf.id, { correctiveActionRequired: v }); onChange(); }} />
        </Field>
      </Grid>
      <StageActions wf={wf} stage={3} onChange={onChange} disabled={!findings.trim()} />
    </SectionCard>
  );
}

function Stage4View({ wf, onChange }: { wf: IncidentRecord; onChange: () => void }) {
  const [plan, setPlan] = useState(wf.correctiveActionPlan ?? "");
  const [items, setItems] = useState<ActionItem[]>(wf.actionItems);

  const persistPlan = () => { updateIncident(wf.id, { correctiveActionPlan: plan }); onChange(); };
  const updateItems = (next: ActionItem[]) => { setItems(next); updateIncident(wf.id, { actionItems: next }); onChange(); };

  return (
    <SectionCard title="Stage 4 · Resolution / Corrective Action">
      <Field label="Corrective action plan" aiPrefilled={wf.contributingFactors.length > 0 && !plan}>
        <textarea value={plan} onChange={(e) => setPlan(e.target.value)} onBlur={persistPlan} rows={5} maxLength={8000} className="w-full px-2 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
      </Field>

      <div className="overflow-x-auto rounded-lg border border-icm-border">
        <table className="w-full text-[12px] font-geist">
          <thead className="bg-icm-bg/60">
            <tr>{["Action", "Responsible", "Due Date", "Status", ""].map((c, i) => <th key={i} className="text-left px-3 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-icm-border">
            {items.map((it, idx) => (
              <tr key={it.id}>
                <td className="px-3 py-2"><input value={it.action} onChange={(e) => updateItems(items.map((x, i) => i === idx ? { ...x, action: e.target.value } : x))} className="h-7 w-full px-2 rounded border border-icm-border bg-white text-[11.5px]" /></td>
                <td className="px-3 py-2"><input value={it.responsibleParty ?? ""} onChange={(e) => updateItems(items.map((x, i) => i === idx ? { ...x, responsibleParty: e.target.value } : x))} className="h-7 w-full px-2 rounded border border-icm-border bg-white text-[11.5px]" /></td>
                <td className="px-3 py-2"><input value={it.dueDate ?? ""} onChange={(e) => updateItems(items.map((x, i) => i === idx ? { ...x, dueDate: e.target.value } : x))} className="h-7 w-full px-2 rounded border border-icm-border bg-white text-[11.5px] font-mono" /></td>
                <td className="px-3 py-2">
                  <select value={it.status} onChange={(e) => updateItems(items.map((x, i) => i === idx ? { ...x, status: e.target.value as ActionItem["status"] } : x))} className={`h-7 px-2 rounded border border-icm-border bg-white text-[11.5px] ${it.status === "Complete" ? "text-icm-green" : "text-icm-text"}`}>
                    <option>Pending</option><option>In Progress</option><option>Complete</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-right"><button onClick={() => updateItems(items.filter((_, i) => i !== idx))} className="text-icm-text-faint hover:text-icm-red"><Trash2 className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-[11.5px] text-icm-text-dim">No action items yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <button onClick={() => updateItems([...items, { id: `a${Date.now()}`, action: "", status: "Pending" }])} className="mt-3 h-8 px-3 rounded-xl border border-icm-border text-[11.5px] text-icm-text inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add action item</button>

      <StageActions wf={wf} stage={4} onChange={onChange} />
    </SectionCard>
  );
}

function Stage5View({ wf, onClose, onChange, canClose }: { wf: IncidentRecord; onClose: () => void; onChange: () => void; canClose: boolean }) {
  const [det, setDet] = useState(wf.finalDetermination);
  const [narr, setNarr] = useState(wf.finalNarrative ?? "");
  const [lessons, setLessons] = useState(wf.lessonsLearned ?? "");
  const persist = () => { updateIncident(wf.id, { finalDetermination: det, finalNarrative: narr, lessonsLearned: lessons }); onChange(); };

  return (
    <SectionCard title="Stage 5 · Final Review">
      <Grid>
        <Field label="Final determination">
          <select value={det ?? ""} onChange={(e) => { setDet(e.target.value as IncidentRecord["finalDetermination"]); persist(); }} className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text">
            <option value="">—</option>
            <option>Substantiated</option><option>Unsubstantiated</option><option>Unable to determine</option><option>Withdrawn</option><option>Other</option>
          </select>
        </Field>
        <ReadField label="Reviewed by">{wf.reviewedBy ?? "Kathy Adams"}</ReadField>
        <ReadField label="Review date">{wf.reviewDate ?? new Date().toLocaleDateString("en-US")}</ReadField>
      </Grid>
      <Field label="Final narrative" required>
        <textarea value={narr} onChange={(e) => setNarr(e.target.value)} onBlur={persist} rows={5} maxLength={8000} placeholder="Provide a final summary of the incident, investigation, and resolution." className="w-full px-2 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
      </Field>
      <Field label="Lessons learned" aiPrefilled>
        <textarea value={lessons} onChange={(e) => setLessons(e.target.value)} onBlur={persist} rows={3} maxLength={4000} className="w-full px-2 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
      </Field>

      <div className="rounded-lg border border-icm-border bg-icm-bg p-3 mb-3">
        <p className="text-[11.5px] font-geist text-icm-text-dim">Supervisor approval: {wf.supervisorApprovedBy ? <span className="text-icm-green">Approved by {wf.supervisorApprovedBy} on {wf.supervisorApprovalDate}</span> : <span className="text-icm-amber">Pending supervisor review</span>}</p>
      </div>

      <div className="flex justify-end">
        <button disabled={!canClose} onClick={onClose} className="h-10 px-4 rounded-xl bg-icm-green text-white text-[12.5px] font-medium hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Close Incident
        </button>
      </div>
    </SectionCard>
  );
}

// ----- Shared -----

function StageActions({ wf, stage, onChange, disabled }: { wf: IncidentRecord; stage: IncidentStageId; onChange: () => void; disabled?: boolean }) {
  const isCurrent = wf.currentStage === stage && wf.stageStatuses[stage] === "Current";
  if (!isCurrent) return null;
  return (
    <div className="flex justify-end mt-4">
      <button disabled={disabled} onClick={() => {
        const nextStage = (stage + 1) as IncidentStageId;
        const nextStatuses = { ...wf.stageStatuses, [stage]: "Complete" as const };
        if (nextStage <= 5) nextStatuses[nextStage] = "Current";
        updateIncident(wf.id, { stageStatuses: nextStatuses, currentStage: nextStage <= 5 ? nextStage : 5 });
        onChange();
      }} className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1.5">
        <Check className="w-3.5 h-3.5" /> Mark stage complete
      </button>
    </div>
  );
}

function StageProgress({ stages, currentStage }: { stages: Record<IncidentStageId, "Complete" | "Current" | "Pending" | "Overdue">; currentStage: IncidentStageId }) {
  return (
    <div className="flex items-center gap-1">
      {([1, 2, 3, 4, 5] as IncidentStageId[]).map((s, i) => (
        <div key={s} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <StageDot status={stages[s]} num={s} />
            <p className={`text-[10px] font-geist text-center ${currentStage === s ? "text-icm-text font-semibold" : "text-icm-text-faint"}`}>{STAGE_LABELS[s]}</p>
          </div>
          {i < 4 && <div className={`flex-1 h-px mx-1 ${stages[s] === "Complete" ? "bg-icm-green" : "bg-icm-border"}`} />}
        </div>
      ))}
    </div>
  );
}

function StageDot({ status, num }: { status: "Complete" | "Current" | "Pending" | "Overdue"; num: number }) {
  const map = {
    Complete: "bg-icm-green text-white",
    Current: "bg-icm-accent text-white ring-4 ring-icm-accent/20",
    Pending: "bg-icm-bg border border-icm-border text-icm-text-dim",
    Overdue: "bg-icm-red text-white",
  } as const;
  return <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold ${map[status]}`}>{status === "Complete" ? <Check className="w-3.5 h-3.5" /> : num}</div>;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <h3 className="font-manrope font-bold text-[14px] text-icm-text mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, required, aiPrefilled, children }: { label: string; required?: boolean; aiPrefilled?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1.5">
        {label}{required && <span className="text-icm-red">*</span>}
        {aiPrefilled && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-icm-accent-soft text-icm-accent text-[9px] font-semibold normal-case ring-1 ring-icm-accent/20"><Sparkles className="w-2 h-2" /> AI suggested</span>}
      </label>
      {children}
    </div>
  );
}

function ReadField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1">{label}</p>
      <div className="text-[12.5px] text-icm-text font-geist whitespace-pre-line">{children}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{children}</div>;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-icm-border overflow-hidden">
      <button type="button" onClick={() => onChange(true)} className={`px-3 py-1.5 text-[11.5px] font-medium ${value ? "bg-icm-text text-icm-panel" : "bg-white text-icm-text-dim"}`}>Yes</button>
      <button type="button" onClick={() => onChange(false)} className={`px-3 py-1.5 text-[11.5px] font-medium ${!value ? "bg-icm-text text-icm-panel" : "bg-white text-icm-text-dim"}`}>No</button>
    </div>
  );
}

function UploadZone() {
  return (
    <div className="rounded-lg border-2 border-dashed border-icm-border bg-icm-bg p-6 text-center">
      <p className="text-[12px] font-geist text-icm-text-dim">Drop supporting documentation here or click to browse</p>
      <p className="text-[10.5px] text-icm-text-faint mt-1">PDF, PNG, JPG, DOC accepted · multiple files allowed</p>
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel, tone, onClose, onConfirm }: { title: string; message: string; confirmLabel: string; tone: "red" | "neutral"; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-icm-text/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-icm-panel rounded-2xl border border-icm-border w-full max-w-[440px] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-manrope font-bold text-[16px] text-icm-text mb-1">{title}</h3>
        <p className="text-[12.5px] text-icm-text-dim mb-4">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] text-icm-text-dim hover:text-icm-text">Cancel</button>
          <button onClick={onConfirm} className={`h-9 px-4 rounded-xl text-white text-[12px] font-medium hover:opacity-90 ${tone === "red" ? "bg-icm-red" : "bg-icm-text"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ s }: { s: IncidentRecord["status"] }) {
  const map = {
    Open: "bg-icm-red-soft text-icm-red ring-icm-red/20",
    "In Progress": "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    "Pending Review": "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    Closed: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    Void: "bg-icm-bg text-icm-text-faint ring-icm-border line-through",
  } as const;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${map[s]}`}>{s}</span>;
}

function ClassificationPill({ c }: { c: IncidentRecord["classification"] }) {
  const map = {
    Critical: "bg-icm-red-soft text-icm-red ring-icm-red/20",
    Significant: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    Minor: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    Unknown: "bg-icm-bg text-icm-text-dim ring-icm-border",
  } as const;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${map[c]}`}>{c}</span>;
}

export default PersonIncidentReportingDetail;
