import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Sparkles, Save, FileSignature, Printer, FileText,
  Search, Check, ChevronDown, ListChecks, Target, Loader2, AlertCircle,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividuals, useIndividual, calcAge } from "@/hooks/useIndividuals";
import { useAuth } from "@/contexts/AuthContext";
import {
  saveProgressNote, fetchAIPrefill,
  ACTIVITY_TYPES, CONTACT_TYPES,
} from "@/hooks/useProgressNotes";
import { toast } from "sonner";

/**
 * New Progress Note — wired to real Firestore.
 * If :id is in the URL, the individual is pre-selected.
 * If accessed from /progress-note/new, user picks from their caseload.
 */
const ProgressNoteNew = () => {
  const navigate = useNavigate();
  // id may come from /people/:id/progress-note/new
  const { id: paramId } = useParams<{ id?: string }>();
  const { userProfile } = useAuth();
  const { individuals } = useIndividuals();
  const { individual: preloaded } = useIndividual(paramId);

  const today = new Date().toISOString().split("T")[0];

  // ── Form state ────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string>(paramId ?? "");
  const [activityType, setActivityType] = useState("");
  const [contactType, setContactType] = useState("In-Person");
  const [progressDate, setProgressDate] = useState(today);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [purposeOfActivity, setPurpose] = useState("");
  const [additionalObservations, setObservations] = useState("");
  const [nextSteps, setNextSteps] = useState("");

  // ── AI state ──────────────────────────────────────────────────────────────
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);

  // ── Save state ────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  // Resolved individual (could be from param or user selection)
  const individual = preloaded ?? individuals.find(i => i.id === selectedId) ?? null;

  const inputCls = "w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text font-geist focus:outline-none focus:border-icm-accent transition-colors";
  const textareaCls = "w-full px-3 py-2.5 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text font-geist focus:outline-none focus:border-icm-accent transition-colors resize-none";

  // ── AI prefill ─────────────────────────────────────────────────────────
  const handleAIPrefill = async () => {
    if (!individual) {
      toast.error("Select an individual first.");
      return;
    }
    setAiLoading(true);
    try {
      const result = await fetchAIPrefill({
        individualName: `${individual.first_name} ${individual.last_name}`,
        diagnosis: individual.diagnosis ?? "",
        lastVisitDate: individual.last_visit_date,
        riskScore: individual.risk_score,
        county: individual.county,
      });
      setPurpose(result.purposeOfActivity);
      setObservations(result.additionalObservations);
      setNextSteps(result.nextSteps);
      if (result.activityType && !activityType) setActivityType(result.activityType);
      setIsBillable(result.isBillable);
      setAiUsed(true);
      toast.success("AI draft ready", { description: "Review and edit before saving." });
    } catch {
      toast.error("AI prefill failed", { description: "You can still fill in the note manually." });
    } finally {
      setAiLoading(false);
    }
  };

  // ── Save draft ────────────────────────────────────────────────────────────
  const handleSave = async (status: "draft" | "pending_signature" = "draft") => {
    if (!selectedId && !paramId) { toast.error("Select an individual first."); return; }
    if (!activityType) { toast.error("Select an activity type."); return; }
    if (!progressDate) { toast.error("Enter a progress date."); return; }
    if (!purposeOfActivity.trim()) { toast.error("Enter purpose of activity."); return; }

    const indId = paramId ?? selectedId;
    const ind = individual ?? individuals.find(i => i.id === indId);
    if (!ind) { toast.error("Individual not found."); return; }

    setSaving(true);
    try {
      const noteId = await saveProgressNote({
        individualId: indId,
        organizationId: userProfile?.organizationId ?? "",
        authorId: userProfile?.uid ?? "",
        authorName: `${userProfile?.firstName ?? ""} ${userProfile?.lastName ?? ""}`.trim() || "Unknown",
        activityType,
        contactType,
        progressDate,
        startTime,
        endTime,
        isBillable,
        purposeOfActivity,
        goalsProgress: [],
        additionalObservations,
        nextSteps,
        status,
        aiDrafted: aiUsed,
      });
      toast.success(status === "draft" ? "Draft saved" : "Submitted for signature", {
        description: `Progress note for ${ind.first_name} ${ind.last_name}`,
      });
      navigate(`/people/${indId}/progress-note/${noteId}`);
    } catch (err) {
      toast.error("Save failed", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const hasIndividual = !!individual;
  const isReady = hasIndividual && !!activityType && !!progressDate && !!purposeOfActivity.trim();

  return (
    <ICMShell title="Progress Note" showAIPanel={false}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <button
              onClick={() => navigate(paramId ? `/people/${paramId}/progress-note` : "/progress-note")}
              className="inline-flex items-center gap-1.5 text-[14px] font-geist font-bold text-icm-text hover:text-icm-accent mb-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Progress Notes
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-icm-bg border border-icm-border text-[11px] font-mono text-icm-text">
                {progressDate || "—"}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 bg-icm-accent-soft text-icm-accent ring-icm-accent/20">
                Draft
              </span>
              {aiUsed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-violet-50 text-violet-600 ring-1 ring-violet-200">
                  <Sparkles className="w-3 h-3" /> AI-assisted
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleSave("draft")}
              disabled={!isReady || saving}
              className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text hover:bg-icm-bg disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save draft
            </button>
            <button
              onClick={() => handleSave("pending_signature")}
              disabled={!isReady || saving}
              className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              <FileSignature className="w-3.5 h-3.5" /> Sign & submit
            </button>
          </div>
        </div>

        {/* AI Banner */}
        <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-[12.5px] font-geist text-icm-text leading-snug">
              <span className="font-semibold">AI Assist.</span>{" "}
              <span className="text-icm-text-dim">
                {hasIndividual
                  ? `Click to generate a draft for ${individual.first_name} ${individual.last_name} based on their profile and diagnosis.`
                  : "Select an individual below, then click to generate a draft."}
              </span>
            </p>
          </div>
          <button
            onClick={handleAIPrefill}
            disabled={!hasIndividual || aiLoading}
            className="h-8 px-3 rounded-lg bg-white border border-icm-accent/30 text-[12px] font-geist font-semibold text-icm-accent hover:bg-icm-accent hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5 shrink-0"
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {aiUsed ? "Re-generate draft" : "Generate draft"}
          </button>
        </div>

        {/* Note Details */}
        <Section title="Note Details" titleIcon={<FileText className="w-4 h-4 text-icm-text-dim" />}>
          <Grid2>
            {/* Individual selector — only show if not pre-selected from URL */}
            {!paramId && (
              <Field label="Person Supported" required>
                <PersonSearchSelect
                  individuals={individuals}
                  value={selectedId}
                  onSelect={setSelectedId}
                />
              </Field>
            )}
            {paramId && individual && (
              <Field label="Person Supported">
                <div className={inputCls + " flex items-center text-icm-text cursor-default"}>
                  {individual.last_name}, {individual.first_name}
                  {individual.dob && <span className="ml-2 text-icm-text-dim">· {calcAge(individual.dob)}y</span>}
                </div>
              </Field>
            )}

            <Field label="Activity Type" required>
              <select
                value={activityType}
                onChange={e => setActivityType(e.target.value)}
                className={inputCls}
              >
                <option value="">Select activity type…</option>
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            <Field label="Progress Date" required>
              <input
                type="date"
                value={progressDate}
                onChange={e => setProgressDate(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Contact Type" required>
              <select
                value={contactType}
                onChange={e => setContactType(e.target.value)}
                className={inputCls}
              >
                {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            <Field label="Start Time">
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="End Time">
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Is Billable" required>
              <select
                value={isBillable ? "yes" : "no"}
                onChange={e => setIsBillable(e.target.value === "yes")}
                className={inputCls}
              >
                <option value="yes">Yes — Billable</option>
                <option value="no">No — Non-Billable</option>
              </select>
            </Field>
          </Grid2>
        </Section>

        {/* Activity Documentation */}
        <Section title="Activity Documentation">
          <Field label="Purpose of Activity" required>
            <textarea
              rows={4}
              value={purposeOfActivity}
              onChange={e => setPurpose(e.target.value)}
              placeholder="Describe the purpose and context of this activity…"
              className={textareaCls}
            />
            <p className="text-[10.5px] text-icm-text-faint font-geist mt-1">
              {purposeOfActivity.length} characters
            </p>
          </Field>
        </Section>

        {/* Goals */}
        <Section title="Progress Toward Goals" titleIcon={<Target className="w-4 h-4 text-icm-accent" />}>
          <div className="rounded-lg border border-dashed border-icm-border bg-icm-bg/40 px-4 py-6 text-center text-[12px] text-icm-text-faint italic font-geist">
            {hasIndividual
              ? "Goal-by-goal tracking coming soon — save note first, then add goal progress."
              : "Goals will load after an individual is selected."}
          </div>
        </Section>

        {/* Additional */}
        <Section title="Additional Documentation" titleIcon={<ListChecks className="w-4 h-4 text-icm-text-dim" />}>
          <Field label="Additional observations">
            <textarea
              rows={3}
              value={additionalObservations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Any additional observations, concerns, or context not captured above…"
              className={textareaCls}
            />
          </Field>
          <Field label="Next steps">
            <textarea
              rows={3}
              value={nextSteps}
              onChange={e => setNextSteps(e.target.value)}
              placeholder="What follow-up actions are planned?"
              className={textareaCls}
            />
          </Field>
        </Section>

        {/* Save reminder */}
        {!isReady && (
          <div className="rounded-xl border border-icm-border bg-icm-bg/40 px-4 py-3 flex items-center gap-2 text-[12px] font-geist text-icm-text-dim">
            <AlertCircle className="w-4 h-4 shrink-0" />
            To save: select an individual, choose an activity type, set a date, and fill in the purpose.
          </div>
        )}
      </div>
    </ICMShell>
  );
};

// ── Sub-components ──────────────────────────────────────────────────────────

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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint font-geist mb-1">
        {label}{required && <span className="text-icm-red ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function PersonSearchSelect({
  individuals, value, onSelect
}: {
  individuals: import("@/hooks/useIndividuals").Individual[];
  value: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = individuals.find(i => i.id === value);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const filtered = q.trim()
    ? individuals.filter(i => `${i.last_name} ${i.first_name}`.toLowerCase().includes(q.toLowerCase()))
    : individuals;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist focus:outline-none focus:border-icm-accent flex items-center justify-between text-left"
      >
        <span className={selected ? "text-icm-text" : "text-icm-text-faint"}>
          {selected ? `${selected.last_name}, ${selected.first_name}` : "Select individual…"}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-icm-text-faint shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-icm-border bg-white shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 h-9 border-b border-icm-border">
            <Search className="w-3.5 h-3.5 text-icm-text-faint" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search…"
              className="flex-1 bg-transparent text-[12.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none"
            />
          </div>
          <div className="max-h-[260px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-icm-text-faint">No matches.</div>
            ) : (
              filtered.map(i => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => { onSelect(i.id); setOpen(false); setQ(""); }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-[12.5px] font-geist text-icm-text hover:bg-icm-bg"
                >
                  <span className="truncate">
                    {i.last_name}, {i.first_name}
                    <span className="text-icm-text-faint ml-1.5">· {i.county}</span>
                  </span>
                  {value === i.id && <Check className="w-3.5 h-3.5 text-icm-accent shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgressNoteNew;
