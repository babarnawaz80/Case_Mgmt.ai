import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, Play, Square, Clock, FileText, Paperclip, PenLine, Send, Save, Smartphone, Wifi, WifiOff, Link2, X, Camera, CheckCircle2, AlertTriangle, ShieldAlert, Loader2, Sparkles } from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual, riskAvatarClass } from "@/hooks/useIndividuals";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { addVisitSummary } from "@/hooks/useFirestore";
import { AttestationSection, EMPTY_ATTESTATION, type AttestationValue } from "@/components/icm/AttestationSection";
import { writeAudit as writeAuditFirebase } from "@/lib/auditService";

const FUNCTIONS_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";

const SERVICE_CODES = [
  { code: "T1016", label: "Case management — per 15 min", unitMinutes: 15 },
  { code: "T2022", label: "Targeted case management — per month", unitMinutes: 60 },
  { code: "H0032", label: "Service plan development — per 15 min", unitMinutes: 15 },
  { code: "T1017", label: "Targeted case management — per 15 min", unitMinutes: 15 },
  { code: "G9012", label: "Other case management service — per encounter", unitMinutes: 60 },
];

interface VisitDoc {
  id: string;
  personId: string;
  scheduledVisitId?: string;
  startedAt: string;
  endedAt?: string;
  serviceCode: string;
  units: number;
  narrative: string;
  linkedGoalId: string;
  linkedTaskId: string;
  authorizationId: string;
  attachments: { name: string; size: number; type: string }[];
  participantSignature: string;
  guardianSignature: string;
  attested: boolean;
  status: "Draft" | "Submitted for review" | "Pending sync" | "Exception — needs correction" | "Exception — supervisor override";
  createdBy: string;
  submittedAt?: string;
  exceptions?: ValidationError[];
  override?: { by: string; at: string; reason: string; codes: string[] };
}

export interface ValidationError {
  code: string;
  rule: string;
  message: string;
  severity: "block" | "warn";
  overridable: boolean;
}

const STORAGE_KEY = "icm.visits.docs";

const loadDocs = (personId: string): VisitDoc[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").filter((d: VisitDoc) => d.personId === personId);
  } catch { return []; }
};
const persistDoc = (doc: VisitDoc) => {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as VisitDoc[];
  const idx = all.findIndex(d => d.id === doc.id);
  if (idx >= 0) all[idx] = doc; else all.push(doc);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
};
const writeAudit = (entry: any) => {
  try {
    const audit = JSON.parse(localStorage.getItem("icm.audit") || "[]");
    audit.push(entry);
    localStorage.setItem("icm.audit", JSON.stringify(audit));
    
    // Also write to real Firestore HIPAA audit log!
    writeAuditFirebase(entry.action, "visit_document", entry.entity || "visit", entry).catch(err => {
      console.warn("[PersonVisitDocument] Failed to write Firestore audit log:", err);
    });
  } catch {}
};

const PersonVisitDocument = () => {
  const { id } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { individual, loading } = useIndividual(id);
  const { userProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const prefillCalledRef = useRef(false);

  const [docId] = useState(() => `vd-${Date.now()}`);
  const [startedAt, setStartedAt] = useState<string>("");
  const [endedAt, setEndedAt] = useState<string>("");
  const [serviceCode, setServiceCode] = useState(SERVICE_CODES[0].code);
  const [narrative, setNarrative] = useState("");
  const [linkedGoalId, setLinkedGoalId] = useState("goal-1");
  const [linkedTaskId, setLinkedTaskId] = useState("task-monitoring");
  const [authorizationId, setAuthorizationId] = useState("AUTH-2026-00148");
  const [attachments, setAttachments] = useState<{ name: string; size: number; type: string }[]>([]);
  const [participantSignature, setParticipantSignature] = useState("");
  const [guardianSignature, setGuardianSignature] = useState("");
  const [attested, setAttested] = useState(false);
  const [participantAttestation, setParticipantAttestation] = useState<AttestationValue>(EMPTY_ATTESTATION);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [now, setNow] = useState(Date.now());
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [aiPrefilling, setAiPrefilling] = useState(false);
  const [aiPrefilled, setAiPrefilled] = useState(false);


  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { clearInterval(t); window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // AI prefill narrative on mount (non-blocking)
  useEffect(() => {
    if (!id || !individual || prefillCalledRef.current) return;
    prefillCalledRef.current = true;

    const runPrefill = async () => {
      setAiPrefilling(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`${FUNCTIONS_BASE}/api/ai-forms/visit-summary-prefill`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            individualId: id,
            organizationId: userProfile?.organizationId ?? "unknown",
            userId: auth.currentUser?.uid ?? "unknown",
            userName: userProfile?.displayName ?? "Case Manager",
            userRole: userProfile?.role ?? "case_manager",
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success || !data.suggestions) return;
        const s = data.suggestions;
        if (s.purposeOfSupport && !narrative) {
          setNarrative(`Purpose: ${s.purposeOfSupport}\n\nWhat is working: ${s.whatIsWorking}\n\nChallenges: ${s.whatIsNotWorking}\n\nNext steps: ${s.visitSummaryAndNextSteps}`);
        }
        if (s.serviceCode) {
          const validCode = SERVICE_CODES.find(c => c.code === s.serviceCode);
          if (validCode) setServiceCode(validCode.code);
        }
        setAiPrefilled(true);
      } catch (err) {
        console.warn("[PersonVisitDocument] AI prefill failed (non-fatal):", err);
      } finally {
        setAiPrefilling(false);
      }
    };

    runPrefill();
  }, [id, individual, userProfile]);


  const svc = SERVICE_CODES.find(s => s.code === serviceCode)!;
  const elapsedMin = useMemo(() => {
    if (!startedAt) return 0;
    const end = endedAt ? new Date(endedAt).getTime() : now;
    return Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 60000));
  }, [startedAt, endedAt, now]);
  const units = Math.max(1, Math.ceil(elapsedMin / svc.unitMinutes));

  if (loading) return <ICMShell title="Document Visit" showAIPanel={false}><div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-[13px] font-geist">Loading…</span></div></ICMShell>;
  if (!individual) return <ICMShell title="Document Visit" showAIPanel={false}><p className="p-6">Person not found.</p></ICMShell>;

  const start = () => { setStartedAt(new Date().toISOString()); toast.success("Visit started. Timer running."); };
  const stop = () => { setEndedAt(new Date().toISOString()); toast.success("Visit ended."); };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type }));
    setAttachments(a => [...a, ...next]);
  };

  const buildDoc = (status: VisitDoc["status"]): VisitDoc => ({
    id: docId, personId: id!, scheduledVisitId: search.get("v") || undefined,
    startedAt, endedAt, serviceCode, units: startedAt ? units : 0, narrative,
    linkedGoalId, linkedTaskId, authorizationId, attachments,
    participantSignature, guardianSignature, attested,
    status: online ? status : "Pending sync", createdBy: "Babar Nawaz",
    submittedAt: status === "Submitted for review" ? new Date().toISOString() : undefined,
  });

  const saveDraft = () => {
    const doc = buildDoc("Draft");
    persistDoc(doc);
    writeAudit({ ts: new Date().toISOString(), action: "Visit note saved as draft", entity: doc.id, personId: id, by: doc.createdBy });
    toast.success(online ? "Draft saved." : "Draft saved offline — will sync when online.");
  };

  const runValidation = (): ValidationError[] => {
    const errs: ValidationError[] = [];
    // Required fields
    if (!serviceCode) errs.push({ code: "V001", rule: "Required service code", message: "Service code is required for billing.", severity: "block", overridable: false });
    if (!narrative.trim() || narrative.trim().length < 20) errs.push({ code: "V002", rule: "Required narrative", message: "Narrative case note must be at least 20 characters.", severity: "block", overridable: false });
    if (!startedAt || !endedAt) errs.push({ code: "V003", rule: "Required time fields", message: "Both start and end time are required.", severity: "block", overridable: false });
    if (!linkedGoalId && !linkedTaskId) errs.push({ code: "V004", rule: "Plan linkage required", message: "Note must be linked to at least one plan goal or monitoring task.", severity: "block", overridable: true });

    // Authorization units (mock: AUTH-2026-00148 = 240 remaining, AUTH-2026-00077 = 88 remaining)
    const remaining = authorizationId === "AUTH-2026-00148" ? 240 : authorizationId === "AUTH-2026-00077" ? 88 : 0;
    if (authorizationId && units > remaining) errs.push({ code: "V005", rule: "Units exceed authorization", message: `Billable units (${units}) exceed remaining authorization (${remaining}).`, severity: "block", overridable: true });
    if (!authorizationId) errs.push({ code: "V006", rule: "Missing authorization", message: "No service authorization linked — note will not be billable.", severity: "warn", overridable: true });

    // Duplicate / overlap detection
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as VisitDoc[];
    const overlap = all.find(d => d.id !== docId && d.personId === id && d.startedAt && d.endedAt && startedAt && endedAt && !(new Date(endedAt) <= new Date(d.startedAt) || new Date(startedAt) >= new Date(d.endedAt)));
    if (overlap) errs.push({ code: "V007", rule: "Duplicate / overlapping note", message: `Overlaps with an existing visit note on ${new Date(overlap.startedAt).toLocaleString()}.`, severity: "block", overridable: true });

    // Billing rules: narrative must include goal progress + minimum elapsed
    if (narrative && !/goal|progress|outcome|service|support/i.test(narrative)) errs.push({ code: "V008", rule: "Billing documentation rules", message: "Narrative must reference goals, progress, or services delivered to meet billing documentation requirements.", severity: "block", overridable: true });
    if (elapsedMin > 0 && elapsedMin < 8) errs.push({ code: "V009", rule: "Billing documentation rules", message: "Encounter under 8 minutes does not meet minimum billable contact duration.", severity: "block", overridable: true });

    if (!attested) errs.push({ code: "V010", rule: "Required attestation", message: "Coordinator attestation is required.", severity: "block", overridable: false });
    return errs;
  };

  const submit = async () => {
    const errs = runValidation();
    setErrors(errs);
    const blocking = errs.filter(e => e.severity === "block");
    if (blocking.length) {
      // Send to exception queue
      const doc = buildDoc("Exception — needs correction");
      doc.exceptions = errs;
      persistDoc(doc);
      // Persist to global exceptions queue
      const queue = JSON.parse(localStorage.getItem("icm.exceptions") || "[]");
      queue.push({ id: `exc-${Date.now()}`, docId: doc.id, personId: id, personName: `${individual.last_name}, ${individual.first_name}`, createdAt: new Date().toISOString(), createdBy: doc.createdBy, errors: errs, status: "Open", serviceCode, units: doc.units });
      localStorage.setItem("icm.exceptions", JSON.stringify(queue));
      writeAudit({ ts: new Date().toISOString(), action: "Visit note FAILED validation", entity: doc.id, personId: id, by: doc.createdBy, detail: `${blocking.length} blocking error(s): ${blocking.map(e=>e.code).join(", ")}` });
      toast.error(`${blocking.length} validation error${blocking.length>1?"s":""}. Sent to Exception Queue.`);
      return;
    }
    const doc = buildDoc("Submitted for review");
    persistDoc(doc);
    writeAudit({ ts: doc.submittedAt!, action: "Visit note submitted for supervisor review", entity: doc.id, personId: id, by: doc.createdBy, detail: `${serviceCode} · ${doc.units} units` });

    // Also persist to Firestore visit_summaries collection
    try {
      await addVisitSummary({
        individual_id: id!,
        individual_name: `${individual.last_name}, ${individual.first_name}`,
        visit_date: startedAt ? new Date(startedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        start_time: startedAt,
        end_time: endedAt,
        purpose_of_support: narrative.split("\n\n")[0]?.replace("Purpose: ", "") || narrative.slice(0, 200),
        next_steps: narrative,
        status: "submitted",
        author_uid: auth.currentUser?.uid ?? "",
        author_name: userProfile?.displayName ?? "Case Manager",
      });
    } catch (err) {
      console.warn("[PersonVisitDocument] Firestore save failed (visit still saved locally):", err);
    }


    toast.success("Submitted for supervisor review.");
    setTimeout(() => navigate(`/people/${individual.id}/visit-summary`), 700);
  };


  return (
    <ICMShell title="Document Visit (Mobile)" showAIPanel={false}>
      <div className="space-y-4 max-w-3xl mx-auto">
        <button onClick={() => navigate(`/people/${individual.id}/visit-summary`)} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {individual.last_name}, {individual.first_name} · Document Visit
        </button>

        <div className="rounded-2xl border border-icm-border bg-icm-panel p-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono text-[14px] font-bold ${riskAvatarClass(individual.risk_score)}`}>{(individual.first_name[0] ?? "") + (individual.last_name[0] ?? "")}</div>
            <div className="flex-1 min-w-0">
              <div className="font-manrope font-extrabold text-[16px] text-icm-text truncate">{individual.last_name}, {individual.first_name}</div>
              <div className="text-[11.5px] text-icm-text-dim">{individual.county ?? "—"} · ID #{individual.id.slice(0, 8)}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="inline-flex items-center gap-1 px-2 h-6 rounded-md text-[11px] bg-blue-50 text-blue-700 border border-blue-200"><Smartphone className="w-3 h-3" /> Field</span>
              <span className={`inline-flex items-center gap-1 px-2 h-6 rounded-md text-[11px] border ${online ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-700"}`}>
                {online ? <><Wifi className="w-3 h-3" /> Online</> : <><WifiOff className="w-3 h-3" /> Offline</>}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-icm-border bg-icm-panel p-4">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-icm-text-dim" /><h3 className="font-manrope font-bold text-[14px]">Visit timer</h3></div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[28px] font-extrabold text-icm-text tabular-nums">{String(Math.floor(elapsedMin/60)).padStart(2,"0")}:{String(elapsedMin%60).padStart(2,"0")}</div>
              <div className="text-[11.5px] text-icm-text-dim">
                {startedAt ? `Started ${new Date(startedAt).toLocaleTimeString()}` : "Not started"}
                {endedAt && ` · Ended ${new Date(endedAt).toLocaleTimeString()}`}
              </div>
            </div>
            {!startedAt && <button onClick={start} className="h-11 px-5 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold inline-flex items-center gap-1.5"><Play className="w-4 h-4" /> Start visit</button>}
            {startedAt && !endedAt && <button onClick={stop} className="h-11 px-5 rounded-xl bg-rose-600 text-white text-[13px] font-semibold inline-flex items-center gap-1.5"><Square className="w-4 h-4" /> End visit</button>}
            {endedAt && <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[12px]"><CheckCircle2 className="w-4 h-4" /> Time captured</span>}
          </div>
        </div>

        <div className="rounded-2xl border border-icm-border bg-icm-panel p-4 space-y-3">
          <h3 className="font-manrope font-bold text-[14px]">Service & billable units</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Service code">
              <select value={serviceCode} onChange={e=>setServiceCode(e.target.value)} className="w-full h-10 rounded-md border border-icm-border bg-white px-2 text-[13px]">
                {SERVICE_CODES.map(s => <option key={s.code} value={s.code}>{s.code} — {s.label}</option>)}
              </select>
            </Field>
            <Field label="Authorization">
              <select value={authorizationId} onChange={e=>setAuthorizationId(e.target.value)} className="w-full h-10 rounded-md border border-icm-border bg-white px-2 text-[13px]">
                <option value="AUTH-2026-00148">AUTH-2026-00148 (Active · 240 units remaining)</option>
                <option value="AUTH-2026-00077">AUTH-2026-00077 (Active · 88 units remaining)</option>
                <option value="">— Not linked —</option>
              </select>
            </Field>
          </div>
          <div className="rounded-md bg-blue-50/50 border border-blue-200 p-3 text-[12px] text-icm-text">
            <div className="flex justify-between"><span className="text-icm-text-dim">Elapsed</span><span className="font-mono font-semibold">{elapsedMin} min</span></div>
            <div className="flex justify-between"><span className="text-icm-text-dim">Unit size</span><span className="font-mono">{svc.unitMinutes} min</span></div>
            <div className="flex justify-between border-t border-blue-200 mt-1 pt-1"><span className="font-semibold">Billable units</span><span className="font-mono font-extrabold text-blue-700">{startedAt ? units : 0}</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-icm-border bg-icm-panel p-4 space-y-2">
          <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-icm-text-dim" /><h3 className="font-manrope font-bold text-[14px]">Narrative case note</h3></div>
          <textarea value={narrative} onChange={e=>setNarrative(e.target.value)} rows={6} placeholder="Describe the visit: who was present, what was discussed, progress toward goals, observations, follow-ups…" className="w-full rounded-md border border-icm-border bg-white px-3 py-2 text-[13px] leading-relaxed" />
          <div className="flex justify-between text-[11px] text-icm-text-dim">
            <span>{narrative.trim().length} characters · minimum 20 required</span>
            <button
              type="button"
              onClick={() => {
                setNarrative(`Discussed quarterly service review. Robert expressed continued satisfaction with day program. Employment exploration to be added to next PCISP. Behavioral changes at home (sleeping less, evening agitation) reported by primary caregiver to be monitored. Follow-up with behavioral support team planned within 2 weeks.`);
                if (!startedAt) {
                  // Pre-fill a realistic 47-minute visit
                  const start = new Date(Date.now() - 47 * 60000).toISOString();
                  const end = new Date().toISOString();
                  setStartedAt(start);
                  setEndedAt(end);
                }
                toast.success("✨ Note narrative and billing times pre-filled from ambient session (04/27/2026)");
              }}
              className="text-blue-700 hover:underline"
            >
              ✨ Draft from ambient session
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-icm-border bg-icm-panel p-4 space-y-3">
          <div className="flex items-center gap-2"><Link2 className="w-4 h-4 text-icm-text-dim" /><h3 className="font-manrope font-bold text-[14px]">Link to plan / monitoring</h3></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Plan goal">
              <select value={linkedGoalId} onChange={e=>setLinkedGoalId(e.target.value)} className="w-full h-10 rounded-md border border-icm-border bg-white px-2 text-[13px]">
                <option value="goal-1">Improve community engagement</option>
                <option value="goal-2">Maintain medication routine</option>
                <option value="goal-3">Develop independent living skills</option>
                <option value="">— None —</option>
              </select>
            </Field>
            <Field label="Monitoring task">
              <select value={linkedTaskId} onChange={e=>setLinkedTaskId(e.target.value)} className="w-full h-10 rounded-md border border-icm-border bg-white px-2 text-[13px]">
                <option value="task-monitoring">Quarterly monitoring contact</option>
                <option value="task-followup">Risk follow-up</option>
                <option value="task-annual">Annual plan review</option>
                <option value="">— None —</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-icm-border bg-icm-panel p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Paperclip className="w-4 h-4 text-icm-text-dim" /><h3 className="font-manrope font-bold text-[14px]">Photos & attachments</h3></div>
            <div className="flex gap-2">
              <button onClick={()=>fileRef.current?.click()} className="h-9 px-3 rounded-md border border-icm-border text-[12px] inline-flex items-center gap-1.5 bg-white"><Paperclip className="w-3.5 h-3.5" /> Attach file</button>
              <button onClick={()=>fileRef.current?.click()} className="h-9 px-3 rounded-md border border-icm-border text-[12px] inline-flex items-center gap-1.5 bg-white"><Camera className="w-3.5 h-3.5" /> Take photo</button>
            </div>
          </div>
          <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" capture="environment" className="hidden" onChange={e=>onFiles(e.target.files)} />
          {attachments.length === 0 ? (
            <p className="text-[12px] text-icm-text-dim">No attachments. Photos are stored locally and uploaded when online.</p>
          ) : (
            <ul className="space-y-1">
              {attachments.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-[12px] border border-icm-border rounded-md px-2 py-1.5 bg-white">
                  <Paperclip className="w-3.5 h-3.5 text-icm-text-dim" />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-icm-text-dim">{Math.round(f.size/1024)} KB</span>
                  <button onClick={()=>setAttachments(a => a.filter((_,j)=>j!==i))}><X className="w-3.5 h-3.5 text-icm-text-dim hover:text-rose-600" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-icm-border bg-icm-panel p-4 space-y-3">
          <div className="flex items-center gap-2"><PenLine className="w-4 h-4 text-icm-text-dim" /><h3 className="font-manrope font-bold text-[14px]">Signatures & attestation</h3></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Participant signature (typed)"><input value={participantSignature} onChange={e=>setParticipantSignature(e.target.value)} placeholder="Type full name" className="w-full h-10 rounded-md border border-icm-border bg-white px-2 text-[13px]" /></Field>
            <Field label="Guardian signature (if applicable)"><input value={guardianSignature} onChange={e=>setGuardianSignature(e.target.value)} placeholder="Type full name" className="w-full h-10 rounded-md border border-icm-border bg-white px-2 text-[13px]" /></Field>
          </div>
          <label className="flex items-start gap-2 text-[12.5px] text-icm-text cursor-pointer">
            <input type="checkbox" checked={attested} onChange={e=>setAttested(e.target.checked)} className="mt-0.5" />
            <span>I attest that the information documented above is accurate and reflects the services delivered to {individual.first_name} on this date.</span>
          </label>
        </div>

        {/* Participant / Guardian attestation */}
        <AttestationSection
          value={participantAttestation}
          onChange={setParticipantAttestation}
        />

        {errors.length > 0 && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-manrope font-bold text-[14px]">
              <AlertTriangle className="w-4 h-4" /> Validation failed — {errors.filter(e=>e.severity==="block").length} blocking, {errors.filter(e=>e.severity==="warn").length} warning
            </div>
            <ul className="space-y-1.5">
              {errors.map(e => (
                <li key={e.code} className="text-[12.5px] flex gap-2 items-start">
                  <span className={`px-1.5 h-5 inline-flex items-center rounded text-[10.5px] font-mono ${e.severity==="block" ? "bg-rose-200 text-rose-800" : "bg-amber-200 text-amber-800"}`}>{e.code}</span>
                  <span><span className="font-semibold text-icm-text">{e.rule}.</span> <span className="text-icm-text-dim">{e.message}</span>{e.overridable && <span className="ml-1 text-[10.5px] text-amber-700">(supervisor-overridable)</span>}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11.5px] text-rose-700">Correct the items above or open the <button onClick={()=>navigate("/exceptions")} className="underline font-semibold">Exception Queue</button> to request a supervisor override.</p>
          </div>
        )}

        <div className="sticky bottom-0 -mx-4 sm:mx-0 bg-icm-panel/95 backdrop-blur border-t border-icm-border p-3 rounded-b-2xl flex gap-2 justify-end">
          <button onClick={saveDraft} className="h-11 px-4 rounded-xl border border-icm-border text-[13px] font-medium inline-flex items-center gap-1.5 bg-white"><Save className="w-4 h-4" /> Save draft</button>
          <button onClick={submit} className="h-11 px-5 rounded-xl bg-icm-text text-icm-panel text-[13px] font-semibold inline-flex items-center gap-1.5"><Send className="w-4 h-4" /> Submit for supervisor review</button>
        </div>

        <ExistingDocs personId={id!} />
      </div>
    </ICMShell>
  );
};

const ExistingDocs = ({ personId }: { personId: string }) => {
  const docs = loadDocs(personId);
  if (!docs.length) return null;
  return (
    <div className="rounded-2xl border border-icm-border bg-icm-panel p-4">
      <h3 className="font-manrope font-bold text-[14px] mb-2">Your recent visit notes</h3>
      <ul className="space-y-1.5">
        {docs.slice(-5).reverse().map(d => (
          <li key={d.id} className="flex items-center justify-between text-[12px] border border-icm-border rounded-md px-2 py-1.5 bg-white">
            <div>
              <div className="font-medium text-icm-text">{d.serviceCode} · {d.units} units</div>
              <div className="text-icm-text-dim">{d.startedAt ? new Date(d.startedAt).toLocaleString() : "—"}</div>
            </div>
            <span className={`px-2 h-6 inline-flex items-center rounded text-[11px] ${d.status === "Submitted for review" ? "bg-blue-50 text-blue-700" : d.status === "Pending sync" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-700"}`}>{d.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-medium text-icm-text-dim mb-1">{label}</span>
      {children}
    </label>
  );
}

export default PersonVisitDocument;
