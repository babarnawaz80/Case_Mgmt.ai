/**
 * PCPCreationModal.tsx
 * 5-step PCP creation wizard:
 *   Step 1 – Upload Documents
 *   Step 2 – AI Reading
 *   Step 3 – Review What AI Found
 *   Step 4A – Navigate to full-page Section-by-Section builder
 *   Step 4B – Full-screen AI Draft overlay (handled by PCPOrbAnimation)
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, Upload, FileText, ChevronRight, CheckCircle2, Loader2,
  Sparkles, AlertTriangle, Plus, Trash2, ChevronDown,
} from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PCPOrbAnimation } from "./PCPOrbAnimation";
import { extractPcpDataFromPdfs, ExtractedPcpData } from "@/services/pcpAiService";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type PCPMode = "blank" | "ai";

interface UploadedFile {
  id: string;
  file: File;
  label: string;
  preview: string;
}

interface PCPCreationModalProps {
  mode: PCPMode;
  individualId: string;
  individualName: string;
  annualPlanDate?: string; // e.g. "08/31/2026"
  onClose: () => void;
}

type WizardStep = 1 | 2 | 3;

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { key: 1, label: "Upload" },
  { key: 2, label: "Reading" },
  { key: 3, label: "Review" },
  { key: 4, label: "Build" },
  { key: 5, label: "Complete" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 w-full mb-6">
      {STEPS.map((s, i) => {
        const done = s.key < current;
        const active = s.key === current;
        return (
          <div key={s.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
                  done
                    ? "bg-teal-600 text-white"
                    : active
                    ? "bg-indigo-600 text-white ring-4 ring-indigo-600/20"
                    : "bg-icm-bg border-2 border-icm-border text-icm-text-faint"
                }`}
              >
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.key}
              </div>
              <span
                className={`text-[9.5px] mt-1 font-semibold tracking-wide uppercase ${
                  active ? "text-indigo-600" : done ? "text-teal-600" : "text-icm-text-faint"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-1 rounded transition-all duration-500 ${
                  s.key < current ? "bg-teal-600" : "bg-icm-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Document type suggestion chips ──────────────────────────────────────────

const DOC_CHIPS = [
  "SIS / Needs Assessment",
  "HRST / Health Risk Report",
  "Prior Year PCP / ISP",
  "DSAT / Service Authorization",
  "Nursing Care Plan",
  "Behavior Support Plan",
  "Court / Legal Documents",
  "Other",
];

const DOC_LABEL_OPTIONS = [
  "SIS Report",
  "HRST",
  "Prior Year PCP",
  "DSAT",
  "Nursing Care Plan",
  "BSP",
  "Legal Document",
  "Other",
];

// ─── Step 1: Upload Documents ─────────────────────────────────────────────────

function Step1Upload({
  mode,
  files,
  onFilesChange,
  planType,
  onPlanTypeChange,
  effectiveDate,
  onEffectiveDateChange,
  annualPlanDate,
  onAnnualPlanDateChange,
  defaultAnnualPlanDate,
  revisionReason,
  onRevisionReasonChange,
  onClose,
  onContinue,
}: {
  mode: PCPMode;
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  planType: string;
  onPlanTypeChange: (v: string) => void;
  effectiveDate: string;
  onEffectiveDateChange: (v: string) => void;
  annualPlanDate: string;
  onAnnualPlanDateChange: (v: string) => void;
  defaultAnnualPlanDate: string;
  revisionReason: string;
  onRevisionReasonChange: (v: string) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return;
      const added: UploadedFile[] = Array.from(newFiles).map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: f,
        label: "",
        preview: f.name,
      }));
      onFilesChange([...files, ...added]);
    },
    [files, onFilesChange]
  );

  const removeFile = (id: string) => onFilesChange(files.filter((f) => f.id !== id));
  const updateLabel = (id: string, label: string) =>
    onFilesChange(files.map((f) => (f.id === id ? { ...f, label } : f)));

  return (
    <div className="space-y-5">
      {/* Plan Type */}
      <div>
        <label className="block text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-2">
          Plan Type
        </label>
        <div className="flex gap-4">
          {["Annual Plan", "Initial Plan", "Revised Plan"].map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="planType"
                value={opt}
                checked={planType === opt}
                onChange={(e) => onPlanTypeChange(e.target.value)}
                className="accent-indigo-600"
              />
              <span className="text-[13px] text-icm-text">{opt}</span>
            </label>
          ))}
        </div>
        {planType === "Revised Plan" && (
          <div className="mt-3">
            <label className="block text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1">
              Reason for revision (required)
            </label>
            <input
              type="text"
              value={revisionReason}
              onChange={(e) => onRevisionReasonChange(e.target.value)}
              placeholder="Describe the reason for revision..."
              className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[13px] text-icm-text focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        )}
      </div>

      {/* Plan Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1">
            Effective Date
          </label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => onEffectiveDateChange(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[13px] text-icm-text focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1">
            Annual Plan Date
          </label>
          <input
            type="date"
            value={annualPlanDate}
            onChange={(e) => onAnnualPlanDateChange(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[13px] text-icm-text focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <p className="text-[10.5px] text-icm-text-dim mt-1">
            Individual's annual plan date: {defaultAnnualPlanDate || "August 31, 2026"}
          </p>
        </div>
      </div>

      <div className="border-t border-icm-border" />

      {/* Document Upload */}
      <div>
        <div className="mb-2">
          <label className="block text-[12.5px] font-semibold text-icm-text mb-0.5">
            Upload State Documents
          </label>
          <p className="text-[11.5px] text-icm-text-dim">
            Upload any documents provided by the state, your team, or providers. The AI will read all
            uploaded files to help build the plan.
          </p>
        </div>

        {/* Drop zone */}
        {files.length === 0 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-indigo-400 bg-indigo-50"
                : "border-icm-border hover:border-indigo-300 hover:bg-indigo-50/30"
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-icm-bg border border-icm-border flex items-center justify-center mx-auto mb-3">
              <Upload className="w-5 h-5 text-icm-text-dim" />
            </div>
            <p className="text-[13px] font-medium text-icm-text mb-1">
              Drop files here or click to browse
            </p>
            <p className="text-[11.5px] text-icm-text-dim">
              PDF, DOC, DOCX accepted · No limit on files
            </p>
          </div>
        )}

        {/* Suggestion chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {DOC_CHIPS.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-icm-border bg-icm-bg text-[10.5px] text-icm-text-dim font-medium"
            >
              <FileText className="w-3 h-3" /> {chip}
            </span>
          ))}
        </div>

        {/* Uploaded files list */}
        {files.length > 0 && (
          <div className="mt-3 space-y-2">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-icm-border bg-icm-bg/50"
              >
                <FileText className="w-4 h-4 text-icm-text-dim shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] text-icm-text font-medium truncate">{f.file.name}</p>
                  <p className="text-[11px] text-icm-text-faint">
                    {(f.file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <select
                  value={f.label}
                  onChange={(e) => updateLabel(f.id, e.target.value)}
                  className="h-8 px-2 rounded-md border border-icm-border bg-white text-[11.5px] text-icm-text-dim"
                >
                  <option value="">Label this document (optional)</option>
                  {DOC_LABEL_OPTIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeFile(f.id)}
                  className="p-1 rounded hover:bg-icm-bg text-icm-text-faint hover:text-icm-red"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[12px] text-indigo-600 hover:underline inline-flex items-center gap-1 mt-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add more files
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Skip notice */}
      {files.length === 0 && (
        <p className="text-[11.5px] text-icm-text-faint text-center">
          Don't have documents yet?{" "}
          <button onClick={onContinue} className="text-icm-accent hover:underline">
            You can still start the plan →
          </button>
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-icm-border">
        <button
          onClick={onClose}
          className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg"
        >
          Cancel
        </button>
        <button
          onClick={onContinue}
          className="h-9 px-5 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-700 inline-flex items-center gap-1.5 transition-colors"
        >
          {files.length > 0 ? `Continue with ${files.length} file${files.length > 1 ? "s" : ""} →` : "Continue"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: AI Reading ───────────────────────────────────────────────────────

const CHART_ITEMS = [
  "Profile data loaded — Carroll County, Male, 36y, Community Pathways",
  "Active goals loaded — 3 goals found",
  "Services loaded — 2 active authorizations",
  "Team members loaded — 4 contacts found",
  "Recent monitoring forms — 6 records found",
  "Contact notes — 42 records in range",
  "Incidents — 2 open incidents found",
  "Eligibility — MA Active, renewal May 2026",
];

function Step2Reading({
  files,
  planType,
  onComplete,
}: {
  files: UploadedFile[];
  planType: string;
  onComplete: (data: ExtractedPcpData | null) => void;
}) {
  const [fileStatuses, setFileStatuses] = useState<
    { name: string; status: "reading" | "done"; detail: string }[]
  >(
    files.map((f) => ({ name: f.file.name, status: "reading", detail: "" }))
  );
  const [chartItems, setChartItems] = useState<{ text: string; done: boolean }[]>([]);
  const [progress, setProgress] = useState(0);
  const ranRef = useRef(false);

  // Run animation sequence on mount
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let isSubscribed = true;

    async function processFiles() {
      try {
        const fileDataArray = [];
        for (let i = 0; i < files.length; i++) {
          setProgress(Math.floor(((i + 1) / files.length) * 30));
          const base64 = await fileToBase64(files[i].file);
          fileDataArray.push({ name: files[i].file.name, base64 });

          if (isSubscribed) {
            setFileStatuses((prev) =>
              prev.map((s, idx) =>
                idx === i ? { ...s, status: "done", detail: "Parsed successfully" } : s
              )
            );
          }
        }

        setProgress(40);

        if (fileDataArray.length > 0) {
          const data = await extractPcpDataFromPdfs(fileDataArray, planType);
          setProgress(90);

          if (isSubscribed) {
            setChartItems(data.chartItems.map((text) => ({ text, done: true })));
            setProgress(100);
            setTimeout(() => onComplete(data), 1500);
          }
        } else {
          setProgress(100);
          const dummyData = await extractPcpDataFromPdfs([], planType);
          if (isSubscribed) {
            setChartItems(dummyData.chartItems.map((text) => ({ text, done: true })));
            setTimeout(() => onComplete(dummyData), 1500);
          }
        }
      } catch (err) {
        console.error("AI extraction error", err);
        toast.error("Failed to extract data using AI.");
        if (isSubscribed) onComplete(null);
      }
    }

    processFiles();

    return () => {
      isSubscribed = false;
    };
  }, [files, planType, onComplete]);

  return (
    <div className="space-y-5">
      {/* Animated orb */}
      <div className="flex flex-col items-center py-4">
        <div className="w-16 h-16 rounded-full ai-gradient flex items-center justify-center mb-4 animate-pulse shadow-lg shadow-indigo-500/30">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h3 className="font-manrope font-bold text-[16px] text-icm-text">
          AI is reading your documents...
        </h3>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-icm-border rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-teal-500 transition-all duration-300 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* File processing */}
      {files.length > 0 && (
        <div className="space-y-2">
          {fileStatuses.map((fs, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px]">
              {fs.status === "reading" ? (
                <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 mt-0.5 shrink-0" />
              )}
              <span className="text-icm-text">
                {fs.status === "reading"
                  ? `Reading "${fs.name}"...`
                  : `"${fs.name}" — ${fs.detail}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      {files.length > 0 && chartItems.length > 0 && (
        <div className="border-t border-icm-border" />
      )}

      {/* Chart items */}
      <div className="space-y-1.5">
        {chartItems.map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-[12px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 mt-0.5 shrink-0" />
            <span className="text-icm-text-dim">{item.text}</span>
          </div>
        ))}
      </div>

      {files.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-center gap-2 text-[12px] text-amber-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          No state documents uploaded. AI suggestions will be based on chart data only.
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Review What AI Found ────────────────────────────────────────────

const PCP_SECTIONS = [
  "Individual Profile Summary",
  "Personally Defined Good Life",
  "Important To / Important For",
  "Focus Area Exploration (6 domains)",
  "Goals & Outcomes",
  "Health & Safety / Risk Mitigation",
  "Services & Supports",
  "Rights & Responsibilities",
  "Team Members & Signatures",
  "Behavior Support Plan Reference",
];

function CollapsibleRow({
  label,
  summary,
  detail,
}: {
  label: string;
  summary: string;
  detail?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-icm-border last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-2.5 px-1 text-left hover:bg-icm-bg/40 rounded"
      >
        <div>
          <span className="text-[12.5px] font-medium text-icm-text">{label}</span>
          <span className="ml-2 text-[11.5px] text-icm-text-dim">{summary}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-icm-text-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && detail && (
        <p className="px-1 pb-2.5 text-[11.5px] text-icm-text-dim leading-relaxed">{detail}</p>
      )}
    </div>
  );
}

function Step3Review({
  mode,
  hasFiles,
  extractedData,
  onBack,
  onBuild,
}: {
  mode: PCPMode;
  hasFiles: boolean;
  extractedData: ExtractedPcpData | null;
  onBack: () => void;
  onBuild: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-manrope font-bold text-[17px] text-icm-text">Here's what I found</h3>
        <p className="text-[12.5px] text-icm-text-dim mt-0.5">Review before we start building the plan</p>
      </div>

      {/* Card 1 — From documents */}
      <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
        <div className="px-4 py-2.5 border-b border-icm-border bg-icm-bg/60">
          <span className="text-[11.5px] font-semibold text-icm-text">Extracted from your documents</span>
        </div>
        {hasFiles && extractedData ? (
          <div className="px-4 py-1">
            <CollapsibleRow
              label="Support Domains"
              summary={`${Object.keys(extractedData.focusValues).length} support areas identified`}
              detail={Object.entries(extractedData.focusValues).map(([k, v]) => `${k}: ${v}`).join(" · ")}
            />
            <CollapsibleRow
              label="Goals"
              summary={`${extractedData.goals.length} goals found`}
              detail={extractedData.goals.map((g) => g.title).join(" · ")}
            />
            <CollapsibleRow
              label="Services"
              summary="Services found"
              detail={extractedData.servicesNotes}
            />
            <CollapsibleRow
              label="Team Members"
              summary="Team members found"
              detail={extractedData.teamNotes}
            />
          </div>
        ) : (
          <div className="px-4 py-4 flex items-center gap-2.5 text-[12.5px] text-icm-text-dim">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            No documents uploaded — building from chart data only
          </div>
        )}
      </div>

      {/* Card 2 — From chart */}
      <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
        <div className="px-4 py-2.5 border-b border-icm-border bg-icm-bg/60">
          <span className="text-[11.5px] font-semibold text-icm-text">Pulled from Joe's chart</span>
        </div>
        <div className="px-4 py-1">
          <CollapsibleRow label="Goals & Outcomes" summary="3 active goals" />
          <CollapsibleRow label="Services" summary="2 active authorizations" />
          <CollapsibleRow label="Contacts / Team" summary="4 contacts on file" />
          <CollapsibleRow label="Monitoring History" summary="6 forms, last: Jan 2026" />
          <CollapsibleRow label="Risk Score" summary="70 — High (3 active risk factors)" />
          <CollapsibleRow label="MA Status" summary="Active — renewal due May 2026" />
          <CollapsibleRow label="Incidents" summary="2 open (1 Critical)" />
        </div>
      </div>

      {/* Card 3 — What we'll build */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-indigo-100">
          <span className="text-[11.5px] font-semibold text-indigo-700">Plan sections we'll complete together</span>
        </div>
        <div className="px-4 py-3 space-y-1.5">
          {PCP_SECTIONS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px] text-icm-text">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              {s}
            </div>
          ))}
          <p className="text-[11.5px] text-icm-text-dim mt-2 pt-2 border-t border-indigo-100">
            {mode === "ai"
              ? "AI will complete all sections and present the full draft for your review."
              : "AI will pre-fill what it can. You review and confirm each section."}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-icm-border">
        <button
          onClick={onBack}
          className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg inline-flex items-center gap-1.5"
        >
          ← Back
        </button>
        <button
          onClick={onBuild}
          className="h-9 px-5 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-700 inline-flex items-center gap-1.5 transition-colors"
        >
          {mode === "ai" ? (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Generate Full Draft →
            </>
          ) : (
            <>
              Build Section by Section
              <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

export function PCPCreationModal({
  mode,
  individualId,
  individualName,
  annualPlanDate = "08/31/2026",
  onClose,
}: PCPCreationModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [planType, setPlanType] = useState("Annual Plan");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [annualDate, setAnnualDate] = useState("2026-08-31");
  const [revisionReason, setRevisionReason] = useState("");
  const [showOrbAnimation, setShowOrbAnimation] = useState(false);
  const [createdPcpId, setCreatedPcpId] = useState<string | null>(null);

  const [extractedData, setExtractedData] = useState<ExtractedPcpData | null>(null);

  const title =
    mode === "blank" ? "Start New Person-Centered Plan" : "Draft PCP with AI";

  const stepLabel: Record<number, string> = {
    1: "Upload Supporting Documents",
    2: "Reading Documents",
    3: "Review What AI Found",
  };

  const handleContinueFromStep1 = () => setStep(2);

  const handleStep2Complete = (data: ExtractedPcpData | null) => {
    setExtractedData(data);
    setStep(3);
  };

  const handleBuild = async () => {
    // Create PCP in Firestore
    try {
      const pcpData = {
        individual_id: individualId,
        plan_type: planType.toLowerCase().replace(" plan", "").replace(" ", "_"),
        plan_format: "pcp_v2",
        effective_date: effectiveDate,
        annual_plan_date: annualDate,
        status: "draft",
        created_by: "kathy-adams",
        ai_generated: mode === "ai",
        ai_draft_path: mode === "ai",
        source_documents: files.map((f) => ({ name: f.file.name, label: f.label })),
        revision_reason: planType === "Revised Plan" ? revisionReason : undefined,
        sections: extractedData ? {
          good_life: extractedData.goodLife,
          important_to: extractedData.importantTo,
          important_for: extractedData.importantFor,
          goals: extractedData.goals,
          focus_areas: extractedData.focusValues,
          emergency_plan: extractedData.emergencyPlan,
          services_notes: extractedData.servicesNotes,
          rights_notes: extractedData.rightsNotes,
          team_notes: extractedData.teamNotes,
          bsp_notes: extractedData.bspNotes,
        } : {},
        compliance_check: { hard_stops: 0, review_items: 2 },
        signatures: [],
      };

      const docRef = await addDoc(collection(db, "pcps"), {
        ...pcpData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      setCreatedPcpId(docRef.id);

      if (mode === "ai") {
        // Show orb animation
        setShowOrbAnimation(true);
      } else {
        // Navigate to section builder
        onClose();
        navigate(`/people/${individualId}/care-plan/new?pcpId=${docRef.id}&planType=${encodeURIComponent(planType)}&effectiveDate=${effectiveDate}&annualDate=${annualDate}`);
      }
    } catch (err) {
      console.error("[PCP] Failed to create:", err);
      // Even on error, navigate to builder with a local ID
      const localId = `pcp-${Date.now()}`;
      setCreatedPcpId(localId);
      if (mode === "ai") {
        setShowOrbAnimation(true);
      } else {
        onClose();
        navigate(`/people/${individualId}/care-plan/new?planType=${encodeURIComponent(planType)}&effectiveDate=${effectiveDate}&annualDate=${annualDate}`);
      }
    }
  };

  const handleOrbComplete = () => {
    onClose();
    const pcpId = createdPcpId || "pcp-brown-2026-001";
    navigate(`/people/${individualId}/care-plan/${pcpId}?ai=true`);
  };

  const handleOrbLater = () => {
    onClose();
  };

  // If showing orb animation, render that instead
  if (showOrbAnimation) {
    return (
      <PCPOrbAnimation
        individualName={individualName}
        planType={planType}
        effectiveDate={effectiveDate}
        annualDate={annualDate}
        onComplete={handleOrbComplete}
        onLater={handleOrbLater}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="px-6 pt-6 pb-4 border-b border-icm-border">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="font-manrope font-extrabold text-[18px] text-icm-text">
                {title}
                <span className="sr-only">Mode: {mode === "blank" ? "Start blank plan" : "Draft with AI"}</span>
              </h2>
              <p className="text-[12px] text-icm-text-dim mt-0.5">
                Step {step} of 5 — {stepLabel[step]}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-icm-bg text-icm-text-dim mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4">
            <StepIndicator current={step} />
          </div>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* No docs warning banner (shown throughout if no files) */}
          {step > 1 && files.length === 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-center gap-2 text-[12px] text-amber-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>No state documents uploaded.</strong> AI suggestions will be based on chart data only.
              </span>
            </div>
          )}

          {step === 1 && (
            <Step1Upload
              mode={mode}
              files={files}
              onFilesChange={setFiles}
              planType={planType}
              onPlanTypeChange={setPlanType}
              effectiveDate={effectiveDate}
              onEffectiveDateChange={setEffectiveDate}
              annualPlanDate={annualDate}
              onAnnualPlanDateChange={setAnnualDate}
              defaultAnnualPlanDate={annualPlanDate}
              revisionReason={revisionReason}
              onRevisionReasonChange={setRevisionReason}
              onClose={onClose}
              onContinue={handleContinueFromStep1}
            />
          )}

          {step === 2 && (
            <Step2Reading
              files={files}
              planType={planType}
              onComplete={handleStep2Complete}
            />
          )}
          {step === 3 && (
            <Step3Review
              mode={mode}
              hasFiles={files.length > 0}
              extractedData={extractedData}
              onBack={() => setStep(1)}
              onBuild={handleBuild}
            />
          )}
        </div>
      </div>
    </div>
  );
}
