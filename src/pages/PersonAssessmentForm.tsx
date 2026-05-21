import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  Sparkles,
  Save,
  Send,
  CheckCircle2,
  ClipboardList,
  AlertTriangle,
  Paperclip,
  PenLine,
  History,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getPerson } from "@/data/people";
import {
  AssessmentAnswer,
  AssessmentTemplate,
  INDEPENDENCE_LEVELS,
  Question,
  aiPrefillFor,
  assessments,
  getAssessment,
  getTemplate,
} from "@/data/assessments";

export default function PersonAssessmentForm() {
  const { id, assessmentId } = useParams<{ id: string; assessmentId: string }>();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const person = getPerson(id ?? "");

  // Existing read-only assessment vs new draft.
  const existing = assessmentId && assessmentId !== "new" ? getAssessment(assessmentId) : null;
  const templateId = existing?.templateId ?? search.get("template") ?? "";
  const template = getTemplate(templateId);
  const usePrefill = search.get("prefill") === "1";

  const initialAnswers: AssessmentAnswer[] = useMemo(() => {
    if (existing) return existing.answers;
    if (template && usePrefill) return aiPrefillFor(template.id, id ?? "");
    return [];
  }, [existing, template, usePrefill, id]);

  const [answers, setAnswers] = useState<AssessmentAnswer[]>(initialAnswers);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    template?.sections[0]?.id ?? null,
  );
  const [submitted, setSubmitted] = useState(false);

  // 7.1 — Signatures / attestation, attachments, validation errors
  const [signCM, setSignCM] = useState("");
  const [signCMDate, setSignCMDate] = useState(new Date().toISOString().slice(0, 10));
  const [signParticipant, setSignParticipant] = useState("");
  const [attest, setAttest] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; size: number; type: string }[]>([]);
  const [missingIds, setMissingIds] = useState<string[]>([]);
  const [generatedTasks, setGeneratedTasks] = useState<{ title: string; due: string }[]>([]);
  const [historyCount, setHistoryCount] = useState<number>(() => {
    try {
      const h = JSON.parse(localStorage.getItem(`icm.assessments.history.${id}`) ?? "[]");
      return Array.isArray(h) ? h.length : 0;
    } catch { return 0; }
  });
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!person || !template) {
    return (
      <div className="p-10 text-center text-[13px] text-icm-text-dim">
        Assessment template not found.{" "}
        <button
          onClick={() => navigate(`/people/${id}/assessments`)}
          className="text-icm-accent hover:underline"
        >
          Back
        </button>
      </div>
    );
  }

  const readonly = !!existing;
  const aiCount = answers.filter((a) => a.aiSuggested).length;

  function getAnswer(qid: string) {
    return answers.find((a) => a.questionId === qid);
  }
  function setAnswer(qid: string, value: AssessmentAnswer["value"]) {
    setAnswers((prev) => {
      const idx = prev.findIndex((a) => a.questionId === qid);
      if (idx === -1) return [...prev, { questionId: qid, value }];
      const next = [...prev];
      // Manually editing clears the AI flag.
      next[idx] = { questionId: qid, value };
      return next;
    });
  }

  function calcScore() {
    let total = 0;
    for (const sec of template!.sections) {
      for (const q of sec.questions) {
        const a = getAnswer(q.id);
        if (!a || a.value == null) continue;
        if (q.type === "scored_choice") {
          const opt = q.options?.find((o) => o.label === a.value);
          if (opt?.score) total += opt.score;
        } else if (q.type === "independence_level") {
          const lvl = INDEPENDENCE_LEVELS.find((l) => l.label === a.value);
          if (lvl && lvl.score != null) total += lvl.score;
        }
      }
    }
    return total;
  }

  const score = calcScore();
  const loc =
    score <= template.loc.low
      ? "Low"
      : score <= template.loc.moderate
        ? "Moderate"
        : score <= template.loc.high
          ? "High"
          : "Critical";
  const locTone =
    loc === "Low"
      ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
      : loc === "Moderate"
        ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
        : "bg-icm-red-soft text-icm-red ring-icm-red/20";

  const totalQuestions = template.sections.reduce(
    (acc, s) => acc + s.questions.filter((q) => q.type !== "section_header" && q.type !== "divider" && q.type !== "instructions").length,
    0,
  );
  const answered = answers.filter((a) => a.value != null && a.value !== "").length;

  // Required-field validation across all visible questions
  function computeMissing(): string[] {
    const missing: string[] = [];
    for (const sec of template!.sections) {
      for (const q of sec.questions) {
        if (!q.required) continue;
        if (["section_header", "divider", "instructions"].includes(q.type)) continue;
        const a = getAnswer(q.id);
        const v = a?.value;
        const empty = v == null || v === "" || (Array.isArray(v) && v.length === 0);
        if (empty) missing.push(q.id);
      }
    }
    return missing;
  }

  // Detect risk-flagged answers (yes on a "risk"-labeled question, or high-score option)
  function detectRiskFindings() {
    const findings: { label: string; severity: "warning" | "critical" }[] = [];
    for (const sec of template!.sections) {
      for (const q of sec.questions) {
        const a = getAnswer(q.id);
        if (!a) continue;
        const labelLc = (q.label || "").toLowerCase();
        const looksRisky = labelLc.includes("risk") || labelLc.includes("fall") || labelLc.includes("self-harm") || labelLc.includes("suicid") || labelLc.includes("elopement") || labelLc.includes("aggress");
        if ((q.type === "yes_no" || q.type === "yes_no_na") && a.value === "Yes" && looksRisky) {
          findings.push({ label: q.label, severity: "critical" });
        }
        if (q.type === "scored_choice") {
          const opt = q.options?.find((o) => o.label === a.value);
          if (opt?.score != null && opt.score >= 3) findings.push({ label: q.label, severity: "warning" });
        }
      }
    }
    if (loc === "High") findings.push({ label: `Overall LOC: High (score ${score})`, severity: "warning" });
    if (loc === "Critical") findings.push({ label: `Overall LOC: Critical (score ${score})`, severity: "critical" });
    return findings;
  }

  function submit() {
    // Block on missing required
    const missing = computeMissing();
    setMissingIds(missing);
    if (missing.length > 0) {
      toast.error(`${missing.length} required field${missing.length > 1 ? "s" : ""} missing`, {
        description: "Scroll up — missing fields are outlined in red.",
      });
      const first = document.getElementById(`q-${missing[0]}`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // Block on attestation/signature
    if (!attest || !signCM.trim()) {
      toast.error("Attestation & care manager signature required");
      document.getElementById("attestation-block")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const newId = search.get("aid") ?? `A-${Date.now().toString().slice(-4)}`;
    const findings = detectRiskFindings();
    const record = {
      id: newId,
      individualId: id!,
      templateId: template!.id,
      templateVersion: template!.version,
      date: new Date().toLocaleDateString("en-US"),
      status: "Completed" as const,
      completedBy: signCM || "Kathy Adams, CM",
      totalScore: score,
      loc: loc as any,
      answers,
      signatures: { careManager: signCM, careManagerDate: signCMDate, participant: signParticipant, attested: attest },
      attachments,
      riskFindings: findings,
    };
    assessments.push(record);

    // Persist a versioned snapshot for historical retention (7.1)
    const histKey = `icm.assessments.history.${id}`;
    const hist = JSON.parse(localStorage.getItem(histKey) ?? "[]");
    hist.unshift({
      ...record,
      capturedAt: new Date().toISOString(),
      version: `v${hist.length + 1}.0`,
    });
    localStorage.setItem(histKey, JSON.stringify(hist));

    // Audit entries
    const audit = JSON.parse(localStorage.getItem("icm.audit") ?? "[]");
    audit.unshift({
      id: `aud-${Date.now()}`,
      ts: new Date().toISOString(),
      actor: signCM || "Care Manager",
      action: `Completed assessment: ${template!.name} ${template!.version}`,
      target: `${person!.firstName} ${person!.lastName}`,
      category: "assessment",
      details: `Score ${score} · LOC ${loc} · ${findings.length} risk finding(s) · ${attachments.length} attachment(s)`,
    });
    if (findings.length > 0) {
      audit.unshift({
        id: `aud-${Date.now() + 1}`,
        ts: new Date().toISOString(),
        actor: "System",
        action: `Risk findings flagged for review`,
        target: `${person!.firstName} ${person!.lastName}`,
        category: "ai",
        details: findings.map(f => `[${f.severity}] ${f.label}`).join("; "),
      });
    }
    localStorage.setItem("icm.audit", JSON.stringify(audit));

    // Auto-generate downstream tasks from findings (links assessment → tasks/plan)
    const newTasks: { id: string; title: string; dueDate: string; owner: string; supervisor: string; participantId: string; participantName: string; status: string; category: string; escalationDays: number; reminders: string[]; source: string }[] = [];
    const today = new Date();
    const due = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    if (findings.some(f => f.severity === "critical")) {
      newTasks.push({
        id: `task-${Date.now()}-a1`, title: `Update person-centered plan: address critical risk findings`,
        dueDate: due(3), owner: signCM || "Care Manager", supervisor: "Diane Carter (Supervisor)",
        participantId: id!, participantName: `${person!.firstName} ${person!.lastName}`,
        status: "open", category: "Planning", escalationDays: 1, reminders: ["1 day before due"],
        source: `Assessment ${newId} ${template!.version}`,
      });
    }
    if (findings.length > 0) {
      newTasks.push({
        id: `task-${Date.now()}-a2`, title: `Supervisor review: assessment risk findings`,
        dueDate: due(2), owner: "Diane Carter (Supervisor)", supervisor: "Diane Carter (Supervisor)",
        participantId: id!, participantName: `${person!.firstName} ${person!.lastName}`,
        status: "open", category: "Supervisor Review", escalationDays: 1, reminders: ["same day"],
        source: `Assessment ${newId} ${template!.version}`,
      });
    }
    if (loc === "High" || loc === "Critical") {
      newTasks.push({
        id: `task-${Date.now()}-a3`, title: `Increase monitoring frequency (LOC ${loc})`,
        dueDate: due(7), owner: signCM || "Care Manager", supervisor: "Diane Carter (Supervisor)",
        participantId: id!, participantName: `${person!.firstName} ${person!.lastName}`,
        status: "open", category: "Monitoring", escalationDays: 3, reminders: ["3 days before due"],
        source: `Assessment ${newId} ${template!.version}`,
      });
    }
    if (newTasks.length > 0) {
      const existing = JSON.parse(localStorage.getItem("icm.tasks") ?? "[]");
      localStorage.setItem("icm.tasks", JSON.stringify([...newTasks, ...existing]));
      setGeneratedTasks(newTasks.map(t => ({ title: t.title, due: t.dueDate })));
    }

    setHistoryCount((c) => c + 1);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-icm-bg flex items-center justify-center p-6">
        <div className="max-w-[520px] w-full rounded-xl border border-icm-border bg-icm-panel p-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-icm-green-soft text-icm-green mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h1 className="font-manrope font-extrabold text-[20px] text-icm-text mt-4">
              Assessment Completed & Signed
            </h1>
            <p className="text-[12.5px] text-icm-text-dim mt-2">
              {template.name} {template.version} · Score {score} · LOC {loc}
            </p>
            <p className="text-[11px] text-icm-text-faint mt-1">
              Snapshot retained as version v{historyCount}.0 · audit entry written
            </p>
          </div>

          {generatedTasks.length > 0 && (
            <div className="mt-5 rounded-lg bg-icm-amber-soft/40 border border-icm-amber/30 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <ClipboardList className="w-3.5 h-3.5 text-icm-amber" />
                <p className="text-[11.5px] font-semibold text-icm-text">
                  {generatedTasks.length} task{generatedTasks.length > 1 ? "s" : ""} auto-created from findings
                </p>
              </div>
              <ul className="space-y-1">
                {generatedTasks.map((t, i) => (
                  <li key={i} className="text-[11.5px] text-icm-text-dim flex justify-between gap-2">
                    <span className="truncate">• {t.title}</span>
                    <span className="font-mono text-[10.5px] text-icm-text-faint shrink-0">due {t.due}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 space-y-2">
            <button
              onClick={() => navigate(`/people/${id}/care-plan`)}
              className="w-full h-10 rounded-xl bg-icm-text text-icm-panel text-[12.5px] font-semibold hover:opacity-90"
            >
              Connect to Care Plan →
            </button>
            <button
              onClick={() => navigate(`/people/${id}/assessments`)}
              className="w-full h-10 rounded-xl border border-icm-border text-[12.5px] font-semibold text-icm-text-dim hover:text-icm-text"
            >
              Back to assessments
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-icm-bg font-geist text-icm-text">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-icm-bg/95 backdrop-blur-sm border-b border-icm-border px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(`/people/${id}/assessments`)}
          className="inline-flex items-center gap-1 text-[11.5px] text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Assessments
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-manrope font-extrabold text-[16px] text-icm-text leading-tight">
            {template.name}{" "}
            <span className="text-icm-text-dim font-medium text-[12px]">
              {template.version} · {person.firstName} {person.lastName}
            </span>
          </p>
          <p className="text-[11px] text-icm-text-dim">
            {answered} of {totalQuestions} answered ·{" "}
            {Math.round((answered / Math.max(totalQuestions, 1)) * 100)}% complete
          </p>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 uppercase ${readonly ? "bg-icm-green-soft text-icm-green ring-icm-green/20" : "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"}`}
        >
          {readonly ? "Completed" : "In Progress"}
        </span>
        {!readonly && (
          <>
            <button className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-medium text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" />
              Save draft
            </button>
            <button
              onClick={submit}
              className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-semibold inline-flex items-center gap-1.5 hover:opacity-90"
            >
              <Send className="w-3.5 h-3.5" />
              Submit
            </button>
          </>
        )}
      </div>

      <div className="max-w-[1200px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-[220px_1fr_240px] gap-5">
        {/* Section nav */}
        <aside className="lg:sticky lg:top-[72px] lg:self-start space-y-1">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-icm-text-faint mb-2">
            Sections
          </p>
          {template.sections.map((s, i) => {
            const sQs = s.questions.filter(
              (q) => q.type !== "section_header" && q.type !== "instructions" && q.type !== "divider",
            );
            const sAnswered = sQs.filter((q) => {
              const a = getAnswer(q.id);
              return a && a.value != null && a.value !== "";
            }).length;
            const dot =
              sAnswered === 0
                ? "bg-icm-text-faint"
                : sAnswered === sQs.length
                  ? "bg-icm-green"
                  : "bg-icm-amber";
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSectionId(s.id);
                  document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] ${activeSectionId === s.id ? "bg-icm-accent-soft text-icm-accent" : "hover:bg-icm-bg text-icm-text-dim"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                <span className="truncate">{i + 1}. {s.name}</span>
              </button>
            );
          })}
        </aside>

        {/* Form */}
        <div className="space-y-4 min-w-0">
          {!readonly && aiCount > 0 && (
            <div className="rounded-xl bg-icm-accent-soft border border-icm-accent/20 p-3 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-icm-accent mt-0.5" />
              <p className="text-[12px] font-geist text-icm-text">
                <span className="font-semibold">I pre-filled {aiCount} questions</span>{" "}
                <span className="text-icm-text-dim">
                  from {person.firstName}'s profile, prior assessment, and recent notes.
                  All pre-filled answers are labeled — review each one.
                </span>
              </p>
            </div>
          )}

          {missingIds.length > 0 && (
            <div className="rounded-xl bg-icm-red-soft border border-icm-red/30 p-3 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-icm-red mt-0.5" />
              <p className="text-[12px] text-icm-text">
                <span className="font-semibold text-icm-red">{missingIds.length} required field{missingIds.length > 1 ? "s" : ""} missing.</span>{" "}
                <span className="text-icm-text-dim">Submission is blocked until all required fields are answered.</span>
              </p>
            </div>
          )}

          {template.sections.map((s, i) => (
            <SectionCard
              key={s.id}
              id={`sec-${s.id}`}
              section={s}
              index={i + 1}
              answers={answers}
              setAnswer={setAnswer}
              readonly={readonly}
              missingIds={missingIds}
            />
          ))}

          {/* Document attachments */}
          {!readonly && (
            <section className="rounded-xl border border-icm-border bg-icm-panel p-5">
              <div className="flex items-center gap-2 mb-3">
                <Paperclip className="w-4 h-4 text-icm-text-dim" />
                <h2 className="font-manrope font-bold text-[15px] text-icm-text">Document Attachments</h2>
                <span className="text-[10px] text-icm-text-faint">({attachments.length})</span>
              </div>
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.docx"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setAttachments((prev) => [...prev, ...files.map((f) => ({ name: f.name, size: f.size, type: f.type }))]);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="h-9 px-3 rounded-lg border border-dashed border-icm-border text-[12px] text-icm-text-dim hover:border-icm-accent hover:text-icm-accent"
              >
                + Attach supporting documents
              </button>
              {attachments.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {attachments.map((a, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-icm-bg border border-icm-border text-[11.5px]">
                      <span className="truncate">{a.name}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-icm-text-faint font-mono">{(a.size / 1024).toFixed(1)} KB</span>
                        <button onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))} className="text-icm-text-faint hover:text-icm-red">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Signature & attestation */}
          {!readonly && (
            <section id="attestation-block" className="rounded-xl border border-icm-border bg-icm-panel p-5">
              <div className="flex items-center gap-2 mb-3">
                <PenLine className="w-4 h-4 text-icm-text-dim" />
                <h2 className="font-manrope font-bold text-[15px] text-icm-text">Attestation & Signatures</h2>
              </div>
              <label className="flex items-start gap-2 mb-4">
                <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-0.5" />
                <span className="text-[12px] text-icm-text">
                  I attest that the information recorded in this assessment is accurate to the best of my knowledge
                  and was completed in accordance with applicable program requirements.
                  <span className="text-icm-red"> *</span>
                </span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-icm-text-dim mb-1">Care Manager Signature <span className="text-icm-red">*</span></p>
                  <input
                    value={signCM}
                    onChange={(e) => setSignCM(e.target.value)}
                    placeholder="Type full name as signature"
                    className="h-9 w-full px-3 rounded-lg border border-icm-border bg-icm-panel text-[12.5px] italic focus:outline-none focus:border-icm-accent"
                  />
                  <input
                    type="date"
                    value={signCMDate}
                    onChange={(e) => setSignCMDate(e.target.value)}
                    className="mt-2 h-8 w-full px-3 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] focus:outline-none focus:border-icm-accent"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-icm-text-dim mb-1">Participant / Guardian Signature</p>
                  <input
                    value={signParticipant}
                    onChange={(e) => setSignParticipant(e.target.value)}
                    placeholder="Type full name as signature"
                    className="h-9 w-full px-3 rounded-lg border border-icm-border bg-icm-panel text-[12.5px] italic focus:outline-none focus:border-icm-accent"
                  />
                  <p className="mt-2 text-[10.5px] text-icm-text-faint">
                    Optional — capture in person or via secure link.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Score */}
        <aside className="lg:sticky lg:top-[72px] lg:self-start space-y-3">
          <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
            <p className="text-[10px] uppercase tracking-wide text-icm-text-faint font-semibold">
              Current score
            </p>
            <p className="font-manrope font-extrabold text-[28px] text-icm-text leading-none mt-1">
              {score}
              <span className="text-[14px] font-medium text-icm-text-faint"> / {template.loc.high + 30}</span>
            </p>
            <span
              className={`mt-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 uppercase ${locTone}`}
            >
              LOC: {loc}
            </span>
            <p className="text-[10.5px] text-icm-text-faint mt-3 leading-relaxed">
              Low ≤{template.loc.low} · Moderate ≤{template.loc.moderate} · High ≤{template.loc.high} · Critical &gt;
              {template.loc.high}
            </p>
          </div>

          {/* Risk findings preview */}
          {(() => {
            const findings = detectRiskFindings();
            if (findings.length === 0) return null;
            return (
              <div className="rounded-xl border border-icm-amber/40 bg-icm-amber-soft/40 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-icm-amber" />
                  <p className="text-[11px] font-semibold text-icm-text uppercase tracking-wide">
                    Risk findings ({findings.length})
                  </p>
                </div>
                <ul className="space-y-1">
                  {findings.slice(0, 5).map((f, i) => (
                    <li key={i} className="text-[11px] text-icm-text-dim flex gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${f.severity === "critical" ? "bg-icm-red" : "bg-icm-amber"}`} />
                      <span>{f.label}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] text-icm-text-faint">
                  Tasks will be auto-created on submit and routed to the supervisor.
                </p>
              </div>
            );
          })()}

          {/* Version history badge */}
          <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-icm-text-dim" />
            <div className="text-[11px]">
              <p className="font-semibold text-icm-text">Version history</p>
              <p className="text-icm-text-faint">
                {historyCount === 0 ? "No prior completed versions" : `${historyCount} prior version${historyCount > 1 ? "s" : ""} retained`}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}


function SectionCard({
  id,
  section,
  index,
  answers,
  setAnswer,
  readonly,
}: {
  id: string;
  section: AssessmentTemplate["sections"][number];
  index: number;
  answers: AssessmentAnswer[];
  setAnswer: (qid: string, value: AssessmentAnswer["value"]) => void;
  readonly: boolean;
}) {
  const aiInSec = section.questions.some((q) =>
    answers.find((a) => a.questionId === q.id && a.aiSuggested),
  );
  return (
    <section id={id} className="rounded-xl border border-icm-border bg-icm-panel p-5 scroll-mt-20">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-6 h-6 rounded-full bg-icm-accent text-icm-panel text-[11px] font-mono font-bold flex items-center justify-center">
          {index}
        </span>
        <h2 className="font-manrope font-bold text-[16px] text-icm-text">{section.name}</h2>
        {aiInSec && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-geist font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20">
            <Sparkles className="w-2.5 h-2.5" />
            AI assist
          </span>
        )}
      </div>

      <div className="space-y-4">
        {section.questions.map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            answer={answers.find((a) => a.questionId === q.id)}
            onChange={(v) => setAnswer(q.id, v)}
            readonly={readonly}
          />
        ))}
      </div>
    </section>
  );
}

function QuestionField({
  question,
  answer,
  onChange,
  readonly,
}: {
  question: Question;
  answer?: AssessmentAnswer;
  onChange: (v: AssessmentAnswer["value"]) => void;
  readonly: boolean;
}) {
  const aiTint = answer?.aiSuggested ? "bg-icm-accent-soft/40" : "";

  if (question.type === "section_header") {
    return <h3 className="font-manrope font-bold text-[14px] text-icm-text">{question.label}</h3>;
  }
  if (question.type === "divider") {
    return <hr className="border-icm-border" />;
  }
  if (question.type === "instructions") {
    return (
      <div className="rounded-lg bg-icm-bg border border-icm-border p-2.5 text-[11.5px] text-icm-text-dim">
        {question.body || question.label}
      </div>
    );
  }

  const Label = (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="text-[12.5px] font-geist font-semibold text-icm-text">
        {question.label}
        {question.required && <span className="text-icm-red ml-0.5">*</span>}
      </span>
      {answer?.aiSuggested && (
        <span
          title={answer.aiSource}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-geist font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20"
        >
          <Sparkles className="w-2.5 h-2.5" />
          AI suggested
        </span>
      )}
    </div>
  );

  if (question.type === "short_text" || question.type === "date" || question.type === "date_initials") {
    return (
      <div>
        {Label}
        <input
          disabled={readonly}
          type={question.type === "date" ? "date" : "text"}
          value={(answer?.value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={`h-9 w-full px-3 rounded-lg border border-icm-border bg-icm-panel text-[12.5px] focus:outline-none focus:border-icm-accent ${aiTint}`}
        />
      </div>
    );
  }
  if (question.type === "long_text") {
    return (
      <div>
        {Label}
        <textarea
          disabled={readonly}
          rows={3}
          value={(answer?.value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full p-2.5 rounded-lg border border-icm-border bg-icm-panel text-[12.5px] focus:outline-none focus:border-icm-accent ${aiTint}`}
        />
      </div>
    );
  }
  if (question.type === "number") {
    return (
      <div>
        {Label}
        <div className="flex items-center gap-2">
          <input
            disabled={readonly}
            type="number"
            value={(answer?.value as number) ?? ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className={`h-9 w-32 px-3 rounded-lg border border-icm-border bg-icm-panel text-[12.5px] font-mono focus:outline-none focus:border-icm-accent ${aiTint}`}
          />
          {question.unit && <span className="text-[11.5px] text-icm-text-dim">{question.unit}</span>}
        </div>
      </div>
    );
  }
  if (question.type === "yes_no" || question.type === "yes_no_na") {
    const opts = question.type === "yes_no" ? ["Yes", "No"] : ["Yes", "No", "N/A"];
    return (
      <div>
        {Label}
        <div className="flex gap-2 flex-wrap">
          {opts.map((o) => {
            const sel = answer?.value === o;
            return (
              <button
                key={o}
                disabled={readonly}
                onClick={() => onChange(o)}
                className={`h-8 px-3 rounded-full text-[11.5px] font-semibold border ${sel ? "bg-icm-accent text-white border-icm-accent" : "bg-icm-panel text-icm-text-dim border-icm-border hover:border-icm-border-strong"}`}
              >
                {o}
              </button>
            );
          })}
        </div>
        {answer?.value === "Yes" && question.followUpIfYes && (
          <textarea
            placeholder={question.followUpIfYes.placeholder}
            rows={2}
            disabled={readonly}
            className="mt-2 w-full p-2.5 rounded-lg border border-icm-border bg-icm-panel text-[12.5px] focus:outline-none focus:border-icm-accent"
          />
        )}
      </div>
    );
  }
  if (question.type === "single_radio" || question.type === "single_select") {
    return (
      <div>
        {Label}
        <div className="flex flex-wrap gap-2">
          {(question.options ?? []).map((o) => {
            const sel = answer?.value === o.label;
            return (
              <button
                key={o.label}
                disabled={readonly}
                onClick={() => onChange(o.label)}
                className={`h-8 px-3 rounded-full text-[11.5px] border ${sel ? "bg-icm-accent text-white border-icm-accent" : "bg-icm-panel text-icm-text-dim border-icm-border hover:border-icm-border-strong"}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (question.type === "multi_select") {
    const arr = (answer?.value as string[]) ?? [];
    return (
      <div>
        {Label}
        <div className="flex flex-wrap gap-2">
          {(question.options ?? []).map((o) => {
            const sel = arr.includes(o.label);
            return (
              <button
                key={o.label}
                disabled={readonly}
                onClick={() =>
                  onChange(sel ? arr.filter((x) => x !== o.label) : [...arr, o.label])
                }
                className={`h-8 px-3 rounded-full text-[11.5px] border ${sel ? "bg-icm-accent text-white border-icm-accent" : "bg-icm-panel text-icm-text-dim border-icm-border hover:border-icm-border-strong"}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (question.type === "scored_choice") {
    return (
      <div>
        {Label}
        <div className="flex flex-wrap gap-2">
          {(question.options ?? []).map((o) => {
            const sel = answer?.value === o.label;
            return (
              <button
                key={o.label}
                disabled={readonly}
                onClick={() => onChange(o.label)}
                className={`h-8 px-3 rounded-full text-[11.5px] border inline-flex items-center gap-1.5 ${sel ? "bg-icm-accent text-white border-icm-accent" : "bg-icm-panel text-icm-text-dim border-icm-border hover:border-icm-border-strong"}`}
              >
                {o.label}
                <span className={`text-[10px] font-mono px-1 rounded ${sel ? "bg-white/20" : "bg-icm-bg text-icm-text-faint"}`}>
                  {o.score}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (question.type === "independence_level") {
    return (
      <div>
        {Label}
        <div className="flex flex-wrap gap-1.5">
          {INDEPENDENCE_LEVELS.map((l) => {
            const sel = answer?.value === l.label;
            const tone =
              l.tone === "green"
                ? "bg-icm-green text-white border-icm-green"
                : l.tone === "blue"
                  ? "bg-icm-accent text-white border-icm-accent"
                  : l.tone === "amber"
                    ? "bg-icm-amber text-white border-icm-amber"
                    : l.tone === "red"
                      ? "bg-icm-red text-white border-icm-red"
                      : "bg-icm-bg text-icm-text-dim border-icm-border";
            return (
              <button
                key={l.label}
                disabled={readonly}
                onClick={() => onChange(l.label)}
                className={`h-8 px-2.5 rounded-full text-[10.5px] font-semibold border ${sel ? tone : "bg-icm-panel text-icm-text-dim border-icm-border hover:border-icm-border-strong"}`}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (question.type === "likert") {
    const pts = question.likertPoints ?? 5;
    return (
      <div>
        {Label}
        <div className="flex gap-1.5">
          {Array.from({ length: pts }).map((_, i) => {
            const v = String(i + 1);
            const sel = answer?.value === v;
            return (
              <button
                key={i}
                disabled={readonly}
                onClick={() => onChange(v)}
                className={`h-8 w-10 rounded-full text-[12px] font-semibold border ${sel ? "bg-icm-accent text-white border-icm-accent" : "bg-icm-panel text-icm-text-dim border-icm-border hover:border-icm-border-strong"}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (question.type === "rating") {
    return (
      <div>
        {Label}
        <input
          type="range"
          min={question.min ?? 1}
          max={question.max ?? 10}
          disabled={readonly}
          value={(answer?.value as number) ?? question.min ?? 1}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-icm-accent"
        />
        <p className="text-[11px] font-mono text-icm-text-dim mt-0.5">
          Value: {(answer?.value as number) ?? "—"}
        </p>
      </div>
    );
  }

  return (
    <div>
      {Label}
      <p className="text-[11px] text-icm-text-faint italic">
        Field type "{question.type}" preview not yet rendered.
      </p>
    </div>
  );
}
