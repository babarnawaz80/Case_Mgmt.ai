import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  UploadCloud,
  FileText,
  X,
  Info,
  Sparkles,
  Database,
  ShieldCheck,
  Plus,
  Layers,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { AdminOnly } from "@/components/platform/AdminOnly";
import { RULE_TYPE_TONE, type RuleType } from "@/data/guidelinesEngines";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","DC","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana",
  "Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts",
  "Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

interface ExtractedService {
  name: string;
  category: string;
  billingUnit: string;
  hardStops: number;
  warnings: number;
  rules: Array<{
    section: string;
    description: string;
    type: RuleType;
    citation: string;
  }>;
}

const EXTRACTED: ExtractedService[] = [
  {
    name: "CCS — Coordination of Community Services",
    category: "Support",
    billingUnit: "15 min",
    hardStops: 4,
    warnings: 2,
    rules: [
      {
        section: "Eligibility",
        description: "Individual must have a current DDA eligibility determination on file (not expired).",
        type: "Hard Stop",
        citation: "COMAR 10.22.12.04(A)",
      },
      {
        section: "PCP",
        description: "CCS must be listed in the Person-Centered Plan with documented frequency, duration, and outcome.",
        type: "Hard Stop",
        citation: "COMAR 10.22.06.04(C)",
      },
      {
        section: "Documentation",
        description: "Each billable activity requires a contact note describing the contact type, location, duration, and goal addressed.",
        type: "Hard Stop",
        citation: "DDA Provider Manual §7.1",
      },
      {
        section: "Conflicts",
        description: "CCS cannot be billed for the same 15-minute increment as Targeted Case Management (TCM).",
        type: "Hard Stop",
        citation: "COMAR 10.09.45.06",
      },
      {
        section: "Limits",
        description: "Maximum of 40 units (10 hours) per individual per month under Community Pathways.",
        type: "Warning",
        citation: "DDA Fee Schedule 2023",
      },
      {
        section: "Documentation",
        description: "Quarterly face-to-face visit required.",
        type: "Warning",
        citation: "COMAR 10.22.12.07",
      },
    ],
  },
  {
    name: "Day Habilitation",
    category: "Meaningful Day",
    billingUnit: "15 min",
    hardStops: 3,
    warnings: 2,
    rules: [
      {
        section: "Eligibility",
        description: "Individual must be 21 years of age or older.",
        type: "Hard Stop",
        citation: "COMAR 10.22.06.02(D)",
      },
      {
        section: "PCP",
        description: "PCP must include at least one community-integration goal directly served by Day Habilitation.",
        type: "Hard Stop",
        citation: "COMAR 10.22.06.04(D)",
      },
      {
        section: "Limits",
        description: "Maximum of 30 hours per individual per week.",
        type: "Hard Stop",
        citation: "DDA Fee Schedule 2023",
      },
    ],
  },
  {
    name: "Supported Employment",
    category: "Meaningful Day",
    billingUnit: "Hourly",
    hardStops: 3,
    warnings: 2,
    rules: [
      {
        section: "Eligibility",
        description: "Individual must have a documented vocational assessment within the past 12 months.",
        type: "Hard Stop",
        citation: "COMAR 10.22.16.03",
      },
      {
        section: "Conflicts",
        description: "Supported Employment and Day Habilitation may not be billed for overlapping time.",
        type: "Hard Stop",
        citation: "DDA Provider Manual §4.5",
      },
    ],
  },
];

const PROCESSING_STEPS = [
  "Document received (47 pages)",
  "Identifying service definitions...",
  "Extracting eligibility rules...",
  "Mapping billing requirements...",
  "Identifying hard stops and warnings...",
  "Building rule structures...",
  "Complete — 14 services extracted",
];

interface TemplateUpload {
  id: string;
  type: string;
  name: string;
  notes?: string;
  fileName?: string;
}

const NewEngineWizard = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [program, setProgram] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [builderInstructions, setBuilderInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [pdfFile, setPdfFile] = useState<{ name: string; size: string } | null>(
    null,
  );
  const [processing, setProcessing] = useState(false);
  const [processedSteps, setProcessedSteps] = useState(0);
  const [processed, setProcessed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Step 2 state
  const [templates, setTemplates] = useState<TemplateUpload[]>([]);

  // Step 4 state
  const [confirmReviewed, setConfirmReviewed] = useState(false);
  const [confirmFrozen, setConfirmFrozen] = useState(false);
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!processing) return;
    if (processedSteps >= PROCESSING_STEPS.length) {
      setProcessing(false);
      setProcessed(true);
      return;
    }
    const t = setTimeout(() => setProcessedSteps((s) => s + 1), 550);
    return () => clearTimeout(t);
  }, [processing, processedSteps]);

  if (!isAdmin) return <AdminOnly />;

  const handlePdfUpload = () => {
    setPdfFile({ name: "MD-DDA-Waiver-2023.pdf", size: "4.2 MB" });
    setProcessing(true);
    setProcessedSteps(0);
    setProcessed(false);
  };

  const canStep2 = pdfFile && processed && name && state;

  if (published) {
    return (
      <ICMShell title="New Engine" showAIPanel={false}>
        <div className="max-w-[640px] mx-auto mt-12 rounded-xl border border-icm-border bg-icm-panel p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="font-manrope font-extrabold text-[22px] text-icm-text mt-4">
            Engine Published
          </h2>
          <p className="text-[13px] text-icm-text-dim font-geist mt-1">
            {name || "Maryland DDA"} {effectiveDate ? `· Effective ${effectiveDate}` : ""} is now live.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-[12px] font-geist">
            <span className="text-icm-text">{EXTRACTED.length * 5} services</span>
            <span className="text-icm-text-faint">·</span>
            <span className="text-icm-red">8 hard stops</span>
            <span className="text-icm-text-faint">·</span>
            <span className="text-icm-amber">12 warnings</span>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => navigate("/lifeplan/agent/new")}
              className="h-10 px-4 rounded-xl bg-icm-text text-icm-panel text-[12.5px] font-geist font-semibold hover:opacity-90"
            >
              Create an agent →
            </button>
            <button
              onClick={() => navigate("/platform/guidelines-engines")}
              className="h-10 px-4 rounded-xl border border-icm-border text-[12.5px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong"
            >
              View engine
            </button>
          </div>
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="New Engine" showAIPanel={false}>
      <div className="space-y-5 max-w-[1000px]">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/platform/guidelines-engines")}
            className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Guidelines Engines
          </button>
          <button
            onClick={() => navigate("/platform/guidelines-engines")}
            className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong"
          >
            Save & exit
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="text-[11.5px] font-geist text-icm-text-dim flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          Platform
          <ChevronRight className="w-3 h-3 text-icm-text-faint" />
          <button
            onClick={() => navigate("/platform/guidelines-engines")}
            className="hover:text-icm-text"
          >
            Guidelines Engines
          </button>
          <ChevronRight className="w-3 h-3 text-icm-text-faint" />
          <span className="text-icm-text">New Engine</span>
        </div>

        {/* Step indicator */}
        <StepIndicator step={step} />

        {step === 1 && (
          <Step1
            name={name}
            setName={setName}
            state={state}
            setState={setState}
            program={program}
            setProgram={setProgram}
            effectiveDate={effectiveDate}
            setEffectiveDate={setEffectiveDate}
            sourceUrl={sourceUrl}
            setSourceUrl={setSourceUrl}
            builderInstructions={builderInstructions}
            setBuilderInstructions={setBuilderInstructions}
            notes={notes}
            setNotes={setNotes}
            pdfFile={pdfFile}
            onUpload={handlePdfUpload}
            onRemove={() => {
              setPdfFile(null);
              setProcessing(false);
              setProcessed(false);
              setProcessedSteps(0);
            }}
            processing={processing}
            processedSteps={processedSteps}
            processed={processed}
            previewOpen={previewOpen}
            setPreviewOpen={setPreviewOpen}
          />
        )}

        {step === 2 && (
          <Step2 templates={templates} setTemplates={setTemplates} />
        )}

        {step === 3 && <Step3 />}

        {step === 4 && (
          <Step4
            name={name}
            state={state}
            program={program}
            effectiveDate={effectiveDate}
            confirmReviewed={confirmReviewed}
            setConfirmReviewed={setConfirmReviewed}
            confirmFrozen={confirmFrozen}
            setConfirmFrozen={setConfirmFrozen}
            onPublish={() => setPublishConfirm(true)}
          />
        )}

        {/* Footer nav */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="h-10 px-4 rounded-xl border border-icm-border text-[12.5px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back
          </button>
          {step < 4 && (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !canStep2}
              className="h-10 px-5 rounded-xl bg-icm-text text-icm-panel text-[12.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step === 1 && "Next: Upload Templates"}
              {step === 2 && "Next: Default Data Mapping"}
              {step === 3 && "Next: Review & Publish"}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Publish confirm modal */}
      {publishConfirm && (
        <Modal onClose={() => setPublishConfirm(false)}>
          <h3 className="font-manrope font-bold text-[16px] text-icm-text">
            Publish {name || "Engine"} {""}
            <span className="font-mono text-icm-text-dim">v1.0</span>?
          </h3>
          <p className="text-[12.5px] text-icm-text-dim font-geist mt-2 leading-relaxed">
            This engine will be immediately available for agent creation and
            compliance runs. It cannot be modified after publishing.
          </p>
          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              onClick={() => setPublishConfirm(false)}
              className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setPublishConfirm(false);
                setPublished(true);
              }}
              className="h-9 px-4 rounded-lg bg-icm-green text-white text-[12px] font-semibold hover:opacity-90"
            >
              Confirm & Publish
            </button>
          </div>
        </Modal>
      )}
    </ICMShell>
  );
};

// ---------- Step Indicator ----------

function StepIndicator({ step }: { step: number }) {
  const steps = [
    "Upload Guidelines",
    "Upload Templates",
    "Default Data Mapping",
    "Review & Publish",
  ];
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <div className="flex items-center gap-2">
        {steps.map((label, i) => {
          const num = i + 1;
          const isActive = step === num;
          const isDone = step > num;
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                  isActive
                    ? "bg-icm-accent text-white"
                    : isDone
                    ? "bg-icm-green text-white"
                    : "bg-icm-bg border border-icm-border text-icm-text-faint"
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : num}
              </div>
              <span
                className={`text-[11.5px] font-geist truncate ${
                  isActive
                    ? "font-semibold text-icm-text"
                    : isDone
                    ? "text-icm-text-dim"
                    : "text-icm-text-faint"
                }`}
              >
                {label}
              </span>
              {i < steps.length - 1 && (
                <span
                  className={`flex-1 h-px ${
                    isDone ? "bg-icm-green/40" : "bg-icm-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Step 1 ----------

function Step1(props: {
  name: string;
  setName: (v: string) => void;
  state: string;
  setState: (v: string) => void;
  program: string;
  setProgram: (v: string) => void;
  effectiveDate: string;
  setEffectiveDate: (v: string) => void;
  sourceUrl: string;
  setSourceUrl: (v: string) => void;
  builderInstructions: string;
  setBuilderInstructions: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  pdfFile: { name: string; size: string } | null;
  onUpload: () => void;
  onRemove: () => void;
  processing: boolean;
  processedSteps: number;
  processed: boolean;
  previewOpen: boolean;
  setPreviewOpen: (v: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-manrope font-extrabold text-[20px] text-icm-text">
          Step 1 — Upload Guidelines
        </h2>
        <p className="text-[13px] text-icm-text-dim font-geist mt-1">
          Upload the state guideline PDF. AI will automatically parse the
          document, extract every service, and build the compliance engine.
        </p>
      </div>

      <div className="rounded-xl bg-icm-bg border border-icm-border p-4 flex gap-3">
        <Info className="w-4 h-4 text-icm-text-dim shrink-0 mt-0.5" />
        <p className="text-[12px] text-icm-text-dim font-geist leading-relaxed">
          This converts a PDF guideline into a structured, reusable compliance
          engine. Each service contains billing unit, eligibility rules,
          authorization requirements, plan requirements, limits, conflicts,
          documentation requirements, monitoring rules, hard stops, and warnings.
          Once stored, case managers never need to read the PDF again.
        </p>
      </div>

      <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-4">
        <Field label="Compliance engine name" required>
          <input
            value={props.name}
            onChange={(e) => props.setName(e.target.value)}
            placeholder="e.g. Maryland DDA — DD Waiver — Effective 07/01/2023"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="State" required>
            <select
              value={props.state}
              onChange={(e) => props.setState(e.target.value)}
              className={inputCls}
            >
              <option value="">Select state...</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Program / Waiver">
            <input
              value={props.program}
              onChange={(e) => props.setProgram(e.target.value)}
              placeholder="e.g. DD Waiver, HCBS Waiver"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Effective date" hint="Date these guidelines take effect">
            <input
              type="date"
              value={props.effectiveDate}
              onChange={(e) => props.setEffectiveDate(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Source URL" hint="Link to official state guideline document">
            <input
              value={props.sourceUrl}
              onChange={(e) => props.setSourceUrl(e.target.value)}
              placeholder="https://..."
              className={inputCls}
            />
          </Field>
        </div>

        <Field
          label="Engine builder instructions"
          hint="These instructions guide rule extraction accuracy. Runtime agents use published rules, not this prompt."
        >
          <textarea
            value={props.builderInstructions}
            onChange={(e) => props.setBuilderInstructions(e.target.value)}
            rows={4}
            placeholder="Add any notes for AI about how to interpret this document, agency-specific assumptions, or known edge cases. Example: 'For CCS services, billing unit is 15 minutes. Ignore Part III — not applicable to our waiver type.'"
            className={`${inputCls} resize-y min-h-[100px]`}
          />
        </Field>

        <Field label="Notes (optional)">
          <textarea
            value={props.notes}
            onChange={(e) => props.setNotes(e.target.value)}
            rows={2}
            placeholder="Internal notes about this engine version, known issues, etc."
            className={`${inputCls} resize-y min-h-[60px]`}
          />
        </Field>

        <Field label="State guideline PDF" required>
          {!props.pdfFile ? (
            <button
              onClick={props.onUpload}
              className="w-full rounded-xl border-2 border-dashed border-icm-border bg-icm-bg hover:border-icm-accent/40 hover:bg-icm-accent-soft/40 transition-all py-10 flex flex-col items-center gap-2"
            >
              <UploadCloud className="w-8 h-8 text-icm-text-faint" />
              <p className="text-[13px] text-icm-text font-geist font-medium">
                Drop state guideline PDF here or click to browse
              </p>
              <p className="text-[11px] text-icm-text-faint font-geist">
                Accepted: PDF only · Max size: 50MB
              </p>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-icm-red-soft text-icm-red ring-1 ring-icm-red/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-geist font-semibold text-icm-text truncate">
                    {props.pdfFile.name}
                  </p>
                  <p className="text-[11px] font-mono text-icm-text-dim">
                    {props.pdfFile.size} · uploaded just now
                  </p>
                </div>
                <button
                  onClick={props.onRemove}
                  className="text-[11.5px] font-geist text-icm-text-dim hover:text-icm-red"
                >
                  Remove
                </button>
              </div>

              {props.processing && (
                <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-icm-accent animate-pulse" />
                    <p className="text-[12px] font-geist font-semibold text-icm-text">
                      AI is reading your document...
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {PROCESSING_STEPS.slice(0, props.processedSteps).map(
                      (s, i) => (
                        <li
                          key={i}
                          className="text-[11.5px] font-mono text-icm-text-dim flex items-center gap-1.5"
                        >
                          <Check className="w-3 h-3 text-icm-green" />
                          {s}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

              {props.processed && (
                <div className="rounded-xl border border-icm-green/20 bg-icm-green-soft p-4">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-icm-green shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-geist font-semibold text-icm-text">
                        Document processed successfully.
                      </p>
                      <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
                        14 services identified · 8 potential hard stops · 12
                        warnings · Ready for review in Step 4
                      </p>
                      <button
                        onClick={() =>
                          props.setPreviewOpen(!props.previewOpen)
                        }
                        className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline mt-2"
                      >
                        {props.previewOpen
                          ? "Hide extracted rules ↑"
                          : "Preview extracted rules →"}
                      </button>
                    </div>
                  </div>
                  {props.previewOpen && (
                    <div className="mt-3 rounded-lg border border-icm-border bg-icm-panel overflow-hidden">
                      <table className="w-full text-[11.5px] font-geist">
                        <thead className="bg-icm-bg">
                          <tr className="text-left text-icm-text-faint">
                            <th className="px-3 py-2">Service</th>
                            <th className="px-3 py-2">Category</th>
                            <th className="px-3 py-2">Billing</th>
                            <th className="px-3 py-2 text-right">Hard Stops</th>
                            <th className="px-3 py-2 text-right">Warnings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-icm-border">
                          {EXTRACTED.map((s) => (
                            <tr key={s.name}>
                              <td className="px-3 py-2 text-icm-text">
                                {s.name}
                              </td>
                              <td className="px-3 py-2 text-icm-text-dim">
                                {s.category}
                              </td>
                              <td className="px-3 py-2 font-mono text-icm-text-dim">
                                {s.billingUnit}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-icm-red">
                                {s.hardStops}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-icm-amber">
                                {s.warnings}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Field>
      </div>
    </div>
  );
}

// ---------- Step 2 ----------

const TEMPLATE_TYPES = [
  "Billable Activity Note",
  "Progress Note",
  "Monitoring Form",
  "Visit Summary",
  "Care Plan",
  "ISP",
  "Service Authorization",
  "Other",
];

function Step2({
  templates,
  setTemplates,
}: {
  templates: TemplateUpload[];
  setTemplates: React.Dispatch<React.SetStateAction<TemplateUpload[]>>;
}) {
  const addTemplate = () =>
    setTemplates((t) => [
      ...t,
      { id: `tpl-${Date.now()}`, type: TEMPLATE_TYPES[0], name: "" },
    ]);
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-manrope font-extrabold text-[20px] text-icm-text">
          Step 2 — Upload Templates
        </h2>
        <p className="text-[13px] text-icm-text-dim font-geist mt-1">
          Upload organization-level document templates. These will be used by the
          compliance agent to generate compliant documentation.
        </p>
      </div>

      <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft p-4 flex items-start justify-between gap-3">
        <p className="text-[12px] text-icm-text font-geist leading-relaxed">
          Templates already configured in your system are available
          automatically. Upload additional templates here for this specific
          engine.
        </p>
        <button className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline shrink-0">
          Skip — use existing
        </button>
      </div>

      <div className="space-y-3">
        {templates.map((t, idx) => (
          <div
            key={t.id}
            className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-icm-text-faint font-geist font-semibold">
                Template {idx + 1}
              </span>
              <button
                onClick={() =>
                  setTemplates((arr) => arr.filter((x) => x.id !== t.id))
                }
                className="text-[11px] font-geist text-icm-text-dim hover:text-icm-red"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Template type">
                <select
                  value={t.type}
                  onChange={(e) =>
                    setTemplates((arr) =>
                      arr.map((x) =>
                        x.id === t.id ? { ...x, type: e.target.value } : x,
                      ),
                    )
                  }
                  className={inputCls}
                >
                  {TEMPLATE_TYPES.map((tp) => (
                    <option key={tp}>{tp}</option>
                  ))}
                </select>
              </Field>
              <Field label="Template name">
                <input
                  value={t.name}
                  onChange={(e) =>
                    setTemplates((arr) =>
                      arr.map((x) =>
                        x.id === t.id ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="e.g. CCS Billable Activity Note 2026"
                  className={inputCls}
                />
              </Field>
            </div>
            <button
              onClick={() =>
                setTemplates((arr) =>
                  arr.map((x) =>
                    x.id === t.id
                      ? { ...x, fileName: "template.docx" }
                      : x,
                  ),
                )
              }
              className="w-full rounded-xl border-2 border-dashed border-icm-border bg-icm-bg hover:border-icm-accent/40 transition-all py-6 flex flex-col items-center gap-1.5"
            >
              <UploadCloud className="w-5 h-5 text-icm-text-faint" />
              <p className="text-[12px] text-icm-text font-geist">
                {t.fileName ?? "Drop template file or click to upload"}
              </p>
            </button>
          </div>
        ))}
        <button
          onClick={addTemplate}
          className="w-full h-10 rounded-xl border border-dashed border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong inline-flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add template
        </button>
      </div>
    </div>
  );
}

// ---------- Step 3 ----------

const SOURCES = [
  "Face Sheet / Profile",
  "Care Plan / ISP",
  "Contact Notes",
  "Progress Notes",
  "Visit Summary",
  "Monitoring Form",
  "Eligibility Verification",
  "Incident Reports",
  "Case Management Tasks",
  "Service Authorizations",
];

const CHECKS = [
  "Eligibility verification",
  "PCP / ISP alignment",
  "Service authorization limits",
  "Documentation completeness",
  "Visit frequency compliance",
  "Monitoring form completion",
  "Incident reporting compliance",
  "Goal progress documentation",
];

const DEFAULT_MAPPINGS = [
  {
    check: "Eligibility verification",
    sources: ["Profile (Medicaid ID)", "Eligibility Verification (MA Status)", "Program (Waiver Enrollment)"],
  },
  {
    check: "PCP / ISP alignment",
    sources: ["Care Plan / ISP (Goals)", "Profile (Diagnoses)", "Service Authorizations"],
  },
  {
    check: "Visit frequency compliance",
    sources: ["Contact Notes (Date)", "Visit Summary (Type)", "Case Management Tasks"],
  },
  {
    check: "Documentation completeness",
    sources: ["Progress Notes", "Contact Notes", "Monitoring Form"],
  },
];

function Step3() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-manrope font-extrabold text-[20px] text-icm-text">
          Step 3 — Default Data Mapping
        </h2>
        <p className="text-[13px] text-icm-text-dim font-geist mt-1">
          Map organization-wide module defaults. This tells the compliance
          agent where to find and write data across iCM modules.
        </p>
      </div>

      <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-3.5 h-3.5 text-icm-text-dim" />
              <h3 className="text-[12px] uppercase tracking-wide font-geist font-semibold text-icm-text-faint">
                Data Sources
              </h3>
            </div>
            <ul className="space-y-1.5">
              {SOURCES.map((s) => (
                <li
                  key={s}
                  className="px-3 py-2 rounded-lg bg-icm-bg border border-icm-border text-[12px] font-geist text-icm-text"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden md:flex flex-col items-center justify-center pt-8 text-icm-text-faint">
            <ChevronRight className="w-5 h-5" />
            <span className="text-[10px] font-geist mt-1">feeds</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-icm-text-dim" />
              <h3 className="text-[12px] uppercase tracking-wide font-geist font-semibold text-icm-text-faint">
                Compliance Checks
              </h3>
            </div>
            <ul className="space-y-1.5">
              {CHECKS.map((c) => (
                <li
                  key={c}
                  className="px-3 py-2 rounded-lg bg-icm-accent-soft border border-icm-accent/20 text-[12px] font-geist text-icm-text"
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-icm-border bg-icm-bg">
          <h3 className="text-[13px] font-geist font-semibold text-icm-text">
            Default field mappings
          </h3>
          <p className="text-[11.5px] text-icm-text-dim font-geist mt-0.5">
            Click any row to override the source fields for a specific check.
          </p>
        </div>
        <table className="w-full text-[12px] font-geist">
          <thead className="bg-icm-bg">
            <tr className="text-left text-icm-text-faint">
              <th className="px-4 py-2 w-[260px]">Compliance Check</th>
              <th className="px-4 py-2">Reads from</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-icm-border">
            {DEFAULT_MAPPINGS.map((m) => (
              <tr key={m.check} className="hover:bg-icm-bg/60 cursor-pointer">
                <td className="px-4 py-3 font-medium text-icm-text">
                  {m.check}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {m.sources.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center px-2 py-0.5 rounded-md bg-icm-bg border border-icm-border text-[11px] font-mono text-icm-text-dim"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Step 4 ----------

function Step4(props: {
  name: string;
  state: string;
  program: string;
  effectiveDate: string;
  confirmReviewed: boolean;
  setConfirmReviewed: (v: boolean) => void;
  confirmFrozen: boolean;
  setConfirmFrozen: (v: boolean) => void;
  onPublish: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-manrope font-extrabold text-[20px] text-icm-text">
          Step 4 — Review & Publish
        </h2>
        <p className="text-[13px] text-icm-text-dim font-geist mt-1">
          Review the extracted rules and publish the engine. Published engines
          are frozen and cannot be modified.
        </p>
      </div>

      <div className="rounded-xl border border-icm-amber/20 bg-icm-amber-soft p-4 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-icm-amber shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-icm-text font-geist leading-relaxed">
          <span className="font-semibold">
            Publishing is permanent for this version.
          </span>{" "}
          Once published, this engine cannot be edited. To make changes, create
          a new version.
        </p>
      </div>

      {/* Engine summary card */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-manrope font-extrabold text-[18px] text-icm-text">
              {props.name || "Untitled engine"}
            </h3>
            <p className="text-[12px] text-icm-text-dim font-geist mt-1">
              {props.state || "—"} · {props.program || "—"} · Effective{" "}
              {props.effectiveDate || "—"} · v1.0
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-amber-soft text-icm-amber ring-1 ring-icm-amber/20">
            DRAFT → WILL BECOME PUBLISHED
          </span>
        </div>
        <div className="flex items-center gap-5 mt-3 text-[12px] font-geist">
          <span>
            Services: <span className="font-mono font-bold text-icm-accent">14</span>
          </span>
          <span>
            Hard stops:{" "}
            <span className="font-mono font-bold text-icm-red">8</span>
          </span>
          <span>
            Warnings:{" "}
            <span className="font-mono font-bold text-icm-amber">12</span>
          </span>
        </div>
      </div>

      {/* Extracted services */}
      <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-icm-border bg-icm-bg">
          <h3 className="text-[13px] font-geist font-semibold text-icm-text">
            Extracted services
          </h3>
        </div>
        <ul className="divide-y divide-icm-border">
          {EXTRACTED.map((s) => (
            <ServiceReviewRow key={s.name} service={s} />
          ))}
        </ul>
      </div>

      {/* Approval */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-3">
        <h3 className="text-[13px] font-geist font-semibold text-icm-text">
          Admin approval
        </h3>
        <p className="text-[12px] text-icm-text-dim font-geist">
          By publishing this engine, I confirm that the extracted rules have
          been reviewed and are accurate for{" "}
          <span className="font-semibold text-icm-text">
            {props.name || "this engine"}
          </span>
          .
        </p>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={props.confirmReviewed}
            onChange={(e) => props.setConfirmReviewed(e.target.checked)}
            className="mt-0.5 accent-[hsl(var(--icm-accent))]"
          />
          <span className="text-[12px] text-icm-text font-geist">
            I confirm this engine is ready for production use.
          </span>
        </label>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={props.confirmFrozen}
            onChange={(e) => props.setConfirmFrozen(e.target.checked)}
            className="mt-0.5 accent-[hsl(var(--icm-accent))]"
          />
          <span className="text-[12px] text-icm-text font-geist">
            I understand this version will be frozen upon publishing.
          </span>
        </label>
        <div className="flex items-center justify-between text-[11.5px] font-geist text-icm-text-dim border-t border-icm-border pt-3">
          <span>
            Approver:{" "}
            <span className="font-semibold text-icm-text">Babar Nawaz</span>{" "}
            (Admin)
          </span>
          <span className="font-mono">
            {new Date().toLocaleDateString("en-US")}
          </span>
        </div>
        <button
          onClick={props.onPublish}
          disabled={!props.confirmReviewed || !props.confirmFrozen}
          className="w-full h-11 rounded-xl bg-icm-text text-icm-panel text-[13px] font-geist font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          Publish Engine
        </button>
      </div>
    </div>
  );
}

function ServiceReviewRow({ service }: { service: ExtractedService }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-icm-bg/60 text-left"
      >
        <ChevronRight
          className={`w-3.5 h-3.5 text-icm-text-dim transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-geist font-semibold text-icm-text truncate">
            {service.name}
          </p>
          <p className="text-[11px] font-geist text-icm-text-dim">
            {service.category} · {service.billingUnit}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono">
          <span className="text-icm-red">{service.hardStops} HS</span>
          <span className="text-icm-amber">{service.warnings} W</span>
        </div>
      </button>
      {open && (
        <ul className="px-12 pb-4 space-y-2">
          {service.rules.map((r, i) => {
            const tone = RULE_TYPE_TONE[r.type];
            return (
              <li
                key={i}
                className="rounded-lg border border-icm-border bg-icm-bg p-3"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-geist font-semibold ring-1 ${tone.bg} ${tone.text} ${tone.ring} shrink-0`}
                  >
                    {r.type}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-icm-panel border border-icm-border text-icm-text-dim shrink-0">
                    {r.section}
                  </span>
                  <p className="text-[12px] text-icm-text font-geist leading-snug flex-1">
                    {r.description}
                  </p>
                </div>
                <p className="text-[10.5px] font-mono text-icm-text-faint mt-1.5 ml-1">
                  {r.citation}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

// ---------- Helpers ----------

const inputCls =
  "w-full h-9 px-3 rounded-xl bg-icm-panel border border-icm-border text-[12.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40 transition-colors";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] uppercase tracking-wide font-geist font-semibold text-icm-text-faint flex items-center gap-1">
        {label}
        {required && <span className="text-icm-red">*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-[10.5px] font-geist text-icm-text-faint">{hint}</p>
      )}
    </div>
  );
}

function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-icm-panel rounded-2xl border border-icm-border shadow-elevated max-w-[480px] w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-lg hover:bg-icm-bg flex items-center justify-center text-icm-text-dim"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        {children}
      </div>
    </div>
  );
}

export default NewEngineWizard;
