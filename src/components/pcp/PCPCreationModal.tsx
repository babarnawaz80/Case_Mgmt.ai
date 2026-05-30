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
  Sparkles, AlertTriangle, Plus, Trash2, ChevronDown, Edit2,
  Save, RotateCcw, Brain, ArrowRight,
} from "lucide-react";
import { addDoc, collection, serverTimestamp, getDocs, query, where, limit, updateDoc, doc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
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
  // Optional: pre-loaded agent data (required for ai mode)
  agentId?: string;
  agentMasterPrompt?: string;
  linkedGuidelinesEngineName?: string;
  individualProgram?: string;
  individualState?: string;
}

type WizardStep = 1 | 2 | 3 | 4;

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { key: 1, label: "Upload" },
  { key: 2, label: "Processing" },
  { key: 3, label: "Review" },
  { key: 4, label: "Complete" },
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
  specialInstructions,
  onSpecialInstructionsChange,
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
  specialInstructions: string;
  onSpecialInstructionsChange: (v: string) => void;
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

      {/* Special Instructions */}
      <div>
        <label className="block text-[12.5px] font-semibold text-icm-text mb-0.5">
          Special Instructions for This Plan{" "}
          <span className="font-normal text-icm-text-dim">(optional)</span>
        </label>
        <p className="text-[11.5px] text-icm-text-dim mb-2">
          Add anything specific you want the AI to focus on, include, or prioritize for this individual's plan.
        </p>
        <textarea
          value={specialInstructions}
          onChange={(e) => {
            if (e.target.value.length <= 2000) onSpecialInstructionsChange(e.target.value);
          }}
          placeholder="e.g. Joseph wants to explore employment this year. Focus on vocational goals. His mother Linda has concerns about behavioral support..."
          style={{ minHeight: "120px" }}
          className="w-full px-3 py-2.5 rounded-lg border border-icm-border bg-white text-[13px] text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-y"
        />
        <p className="text-[10.5px] text-icm-text-faint mt-1 text-right">
          {specialInstructions.length}/2000
        </p>
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
          // No files — skip API call entirely, show chart items and complete
          const staticItems = [
            "Profile data loaded from chart",
            "Active goals and services loaded",
            "Contact notes reviewed",
            "Monitoring history loaded",
            "Eligibility and MA status checked",
          ];
          setProgress(100);
          if (isSubscribed) {
            setChartItems(staticItems.map((text) => ({ text, done: true })));
            setTimeout(() => onComplete(null), 1200);
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

// ─── Step 2 (AI Mode): Animated Processing Feed ──────────────────────────────

interface ProcessingStep {
  id: string;
  label: string;
  status: "waiting" | "processing" | "done";
}

function Step2AI({
  individualId,
  individualName,
  individualProgram,
  individualState,
  files,
  planType,
  effectiveDate,
  annualPlanDate,
  specialInstructions,
  agentId,
  linkedGuidelinesEngineName,
  onComplete,
  onError,
}: {
  individualId: string;
  individualName: string;
  individualProgram?: string;
  individualState?: string;
  files: UploadedFile[];
  planType: string;
  effectiveDate: string;
  annualPlanDate: string;
  specialInstructions: string;
  agentId?: string;
  linkedGuidelinesEngineName?: string;
  onComplete: (plan: Record<string, unknown>, planId: string) => void;
  onError: (msg: string) => void;
}) {
  const [steps, setSteps] = useState<ProcessingStep[]>([]);
  const [progress, setProgress] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const ranRef = useRef(false);

  const initials = individualName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Build step list
  const buildSteps = (c: Record<string, number>): ProcessingStep[] => {
    const list: ProcessingStep[] = [
      { id: "load", label: `Loading ${individualName.split(" ")[0]}'s full record…`, status: "waiting" },
    ];
    if (files.length > 0) {
      list.push({ id: "docs", label: `Reading ${files.length} uploaded document${files.length > 1 ? "s" : ""}…`, status: "waiting" });
    }
    list.push({ id: "contact", label: `Scanning contact notes (${c.contact ?? "…"} from past 12 months)…`, status: "waiting" });
    list.push({ id: "visits", label: `Reviewing visit summaries (${c.visits ?? "…"} visits)…`, status: "waiting" });
    list.push({ id: "ambient", label: `Reading ambient listening sessions (${c.ambient ?? 0} sessions)…`, status: "waiting" });
    list.push({ id: "monitoring", label: `Reviewing monitoring forms (${c.monitoring ?? "…"} forms)…`, status: "waiting" });
    list.push({ id: "auth", label: "Checking service authorizations…", status: "waiting" });
    list.push({ id: "progress", label: "Reading progress notes…", status: "waiting" });
    list.push({ id: "incidents", label: "Reviewing incident reports…", status: "waiting" });
    list.push({ id: "assess", label: "Pulling assessment data…", status: "waiting" });
    list.push({ id: "guidelines", label: `Reviewing ${linkedGuidelinesEngineName || "state guidelines"}…`, status: "waiting" });
    list.push({ id: "agency", label: "Applying agency instructions…", status: "waiting" });
    if (specialInstructions.trim()) {
      list.push({ id: "cm", label: "Applying case manager instructions…", status: "waiting" });
    }
    list.push({ id: "evidence", label: "Researching evidence-based practices for this profile…", status: "waiting" });
    list.push({ id: "build", label: "Building Person-Centered Plan…", status: "waiting" });
    return list;
  };

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    // Load counts from Firestore in the background
    const loadCounts = async () => {
      const newCounts: Record<string, number> = {};
      try {
        const [cn, vs, mf, pn, amb] = await Promise.allSettled([
          getDocs(query(collection(db, "contact_notes"), where("individualId", "==", individualId), limit(100))),
          getDocs(query(collection(db, "visit_summaries"), where("individualId", "==", individualId), limit(100))),
          getDocs(query(collection(db, "monitoring_forms"), where("individualId", "==", individualId), limit(100))),
          getDocs(query(collection(db, "progress_notes"), where("individualId", "==", individualId), limit(100))),
          getDocs(query(collection(db, "ai_checkins"), where("individualId", "==", individualId), limit(100))),
        ]);
        newCounts.contact = cn.status === "fulfilled" ? cn.value.size : 0;
        newCounts.visits = vs.status === "fulfilled" ? vs.value.size : 0;
        newCounts.monitoring = mf.status === "fulfilled" ? mf.value.size : 0;
        newCounts.progress = pn.status === "fulfilled" ? pn.value.size : 0;
        newCounts.ambient = amb.status === "fulfilled" ? amb.value.size : 0;
      } catch { /* non-fatal */ }
      setCounts(newCounts);
      return newCounts;
    };

    const countsPromise = loadCounts();

    // Animate steps sequentially
    const runAnimation = async () => {
      const c = await countsPromise;
      const allSteps = buildSteps(c);
      setSteps(allSteps);

      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const totalPreBuild = allSteps.length - 1; // all except last "build" step

      for (let i = 0; i < totalPreBuild; i++) {
        // Start this step
        setSteps((prev) =>
          prev.map((s, idx) => idx === i ? { ...s, status: "processing" } : s)
        );
        setProgress(Math.floor(((i + 0.5) / allSteps.length) * 88));
        await delay(i === 0 ? 600 : 700);

        // Complete this step
        setSteps((prev) =>
          prev.map((s, idx) => idx === i ? { ...s, status: "done" } : s)
        );
        setProgress(Math.floor(((i + 1) / allSteps.length) * 88));
        await delay(200);
      }

      // Final step — start it, then call the Cloud Function
      const lastIdx = allSteps.length - 1;
      setSteps((prev) =>
        prev.map((s, idx) => idx === lastIdx ? { ...s, status: "processing" } : s)
      );
      setProgress(90);

      try {
        const fns = getFunctions();
        const callGenerate = httpsCallable(fns, "generatePCP");
        const result = await callGenerate({
          individualId,
          planType: planType.toLowerCase().replace(" plan", ""),
          effectiveDate,
          annualPlanDate,
          specialInstructions,
          agentId: agentId || "",
        }) as any;

        const data = result.data;

        if (!data.success) {
          onError(data.message || "Generation failed.");
          return;
        }

        // Complete last step
        setSteps((prev) =>
          prev.map((s, idx) => idx === lastIdx ? { ...s, label: "Plan draft complete.", status: "done" } : s)
        );
        setProgress(100);

        await delay(1200);
        onComplete(data.plan, data.planId);
      } catch (err: any) {
        onError(err.message || "Failed to generate plan.");
      }
    };

    runAnimation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)", minHeight: "480px" }}>
      {/* Grid texture */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <div className="relative p-6 space-y-5">
        {/* Individual identity card */}
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[12px] font-bold shrink-0">
            {initials}
          </div>
          <p className="text-[12.5px] font-geist text-slate-300">
            <span className="font-semibold text-white">{individualName}</span>
            {individualProgram && <> · {individualProgram}</>}
            {individualState && <> · {individualState}</>}
          </p>
        </div>

        {/* Activity feed */}
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {steps.map((s) => (
            <div key={s.id} className="flex items-center gap-2.5">
              {s.status === "done" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : s.status === "processing" ? (
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
              )}
              <span className={`text-[12px] font-geist transition-colors ${
                s.status === "done" ? "text-slate-300" : s.status === "processing" ? "text-white font-semibold" : "text-slate-600"
              }`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10.5px] font-geist text-slate-500 mt-2 text-center">
            This usually takes 20–40 seconds depending on chart size.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3 (AI Mode): Review Generated Plan ─────────────────────────────────

function EditableSection({ title, content, onSave }: { title: string; content: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-icm-bg/60 border-b border-icm-border">
        <span className="text-[12px] font-semibold text-icm-text">{title}</span>
        {editing ? (
          <div className="flex items-center gap-2">
            <button onClick={() => { onSave(draft); setEditing(false); }} className="h-6 px-2 rounded text-[11px] font-geist font-semibold bg-icm-accent text-white inline-flex items-center gap-1">
              <Save className="w-3 h-3" /> Save
            </button>
            <button onClick={() => { setDraft(content); setEditing(false); }} className="h-6 px-2 rounded text-[11px] font-geist text-icm-text-dim border border-icm-border inline-flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="h-6 px-2 rounded text-[11px] font-geist text-icm-accent border border-icm-accent/30 inline-flex items-center gap-1 hover:bg-icm-accent-soft">
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        )}
      </div>
      <div className="px-4 py-3">
        {editing ? (
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5}
            className="w-full text-[12.5px] font-geist text-icm-text border border-icm-border rounded-lg p-2.5 focus:outline-none focus:border-icm-accent/40 resize-y bg-white" />
        ) : (
          <p className="text-[12.5px] font-geist text-icm-text leading-relaxed whitespace-pre-wrap">{content}</p>
        )}
      </div>
    </div>
  );
}

function Step3GeneratedPlan({
  plan: initialPlan,
  planId,
  individualName,
  onBack,
  onContinue,
  onSaveDraft,
  onPlanUpdate,
}: {
  plan: Record<string, unknown>;
  planId: string;
  individualName: string;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft: () => void;
  onPlanUpdate: (updated: Record<string, unknown>) => void;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [refineText, setRefineText] = useState("");
  const [refining, setRefining] = useState(false);

  const pd = (plan.planDetails as any) ?? {};
  const summary = (plan.individualSummary as any) ?? {};
  const goals: any[] = Array.isArray(plan.goals) ? plan.goals : [];
  const services: any[] = Array.isArray(plan.services) ? plan.services : [];
  const hn = (plan.healthAndSafety as any) ?? {};
  const sn = (plan.supportNeeds as any) ?? {};
  const flags: any[] = Array.isArray(plan.complianceFlags) ? plan.complianceFlags : [];
  const ds = pd.dataSources ?? {};
  const totalSources = Object.values(ds).reduce((a, b) => (a as number) + (b as number), 0) as number;
  const confidence = pd.aiConfidence === "high" ? "High" : "Medium";

  function updateSection(field: string, val: string) {
    const updated = { ...plan, [field]: val };
    setPlan(updated);
    onPlanUpdate(updated);
  }

  async function handleRefine(full: boolean) {
    if (!refineText.trim()) return;
    setRefining(true);
    try {
      const fns = getFunctions();
      const call = httpsCallable(fns, "refinePCP");
      const result = await call({
        planId,
        individualId: pd.individualId || "",
        currentPlan: plan,
        refinementInstructions: refineText,
        regenerateFull: full,
      }) as any;
      if (result.data.success) {
        setPlan(result.data.plan);
        onPlanUpdate(result.data.plan);
        setRefineText("");
        toast.success("Plan updated.");
      } else {
        toast.error(result.data.message || "Refinement failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "Refinement failed.");
    } finally {
      setRefining(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="font-manrope font-bold text-[17px] text-icm-text">Review Your Plan Draft</h3>
        <p className="text-[12px] text-icm-text-dim mt-0.5">
          AI generated this plan based on {totalSources} data sources. Review all sections before proceeding.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-geist font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
            <Sparkles className="w-3 h-3" /> AI confidence: {confidence}
          </span>
          <span className="text-[11px] font-geist text-icm-text-faint">· Based on {totalSources} data sources</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main plan content */}
        <div className="lg:col-span-2 space-y-3">
          {/* Individual Summary */}
          {summary.strengths?.length > 0 && (
            <EditableSection
              title="Strengths & Interests"
              content={[...summary.strengths, ...summary.interests].join("\n• ")}
              onSave={(v) => updateSection("individualSummary", { ...summary, strengths: v.split("\n• ").filter(Boolean) } as any)}
            />
          )}

          {/* Goals */}
          {goals.length > 0 && (
            <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
              <div className="px-4 py-2.5 bg-icm-bg/60 border-b border-icm-border">
                <span className="text-[12px] font-semibold text-icm-text">Goals & Outcomes ({goals.length} goals)</span>
              </div>
              <div className="divide-y divide-icm-border">
                {goals.map((g: any, i: number) => (
                  <div key={i} className="px-4 py-3 space-y-1">
                    <p className="text-[13px] font-semibold text-icm-text">{g.title || `Goal ${i + 1}`}</p>
                    <p className="text-[12px] text-icm-text-dim leading-relaxed">{g.description}</p>
                    {g.objectives?.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {g.objectives.map((obj: any, j: number) => (
                          <li key={j} className="text-[11.5px] text-icm-text-dim flex items-start gap-1.5">
                            <span className="text-icm-accent mt-0.5">•</span> {obj.description}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10.5px] font-mono text-icm-text-faint">
                      {g.targetDate && <span>Target: {g.targetDate}</span>}
                      {g.responsibleParty && <span>Responsible: {g.responsibleParty}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          {services.length > 0 && (
            <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
              <div className="px-4 py-2.5 bg-icm-bg/60 border-b border-icm-border">
                <span className="text-[12px] font-semibold text-icm-text">Services & Supports ({services.length})</span>
              </div>
              <div className="divide-y divide-icm-border">
                {services.map((s: any, i: number) => (
                  <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[12.5px] font-semibold text-icm-text">{s.serviceName}</p>
                      {s.provider && <p className="text-[11px] text-icm-text-dim">{s.provider} · {s.frequency}</p>}
                    </div>
                    {s.authorizationId && <span className="text-[10px] font-mono text-icm-text-faint">{s.authorizationId}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Health & Safety */}
          {(hn.safetyPlan || hn.riskFactors?.length > 0) && (
            <EditableSection
              title="Health & Safety"
              content={[
                hn.safetyPlan,
                hn.riskFactors?.length > 0 ? `Risk factors:\n• ${hn.riskFactors.join("\n• ")}` : null,
              ].filter(Boolean).join("\n\n")}
              onSave={(v) => updateSection("healthAndSafety", { ...hn, safetyPlan: v } as any)}
            />
          )}

          {/* Support Needs */}
          {Object.values(sn).some(Boolean) && (
            <EditableSection
              title="Support Needs & Preferences"
              content={Object.entries(sn)
                .filter(([, v]) => v)
                .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
                .join("\n")}
              onSave={(v) => updateSection("supportNeeds", v as any)}
            />
          )}

          {/* Compliance Flags */}
          {flags.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[12px] font-semibold text-amber-800 mb-2">⚠ {flags.length} Compliance Flag{flags.length > 1 ? "s" : ""}</p>
              {flags.map((f: any, i: number) => (
                <p key={i} className="text-[11.5px] text-amber-700 mt-1">
                  <strong>{f.type === "hard_stop" ? "HARD STOP" : "Warning"}:</strong> {f.description}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Refinement panel */}
        <div className="space-y-3">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3 sticky top-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <p className="text-[13px] font-semibold text-indigo-900">Refine This Plan</p>
            </div>
            <textarea
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              rows={4}
              placeholder="e.g. Add a vocational goal. Make language more person-first. Remove the section about..."
              className="w-full px-3 py-2 rounded-lg border border-indigo-200 bg-white text-[12.5px] text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:ring-2 focus:ring-indigo-400/40 resize-y"
            />
            <button
              onClick={() => handleRefine(false)}
              disabled={refining || !refineText.trim()}
              className="w-full h-9 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
            >
              {refining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Apply Changes
            </button>
            <button
              onClick={() => handleRefine(true)}
              disabled={refining || !refineText.trim()}
              className="w-full h-8 rounded-lg border border-indigo-200 text-indigo-700 text-[12px] font-medium hover:bg-indigo-100/60 disabled:opacity-50"
            >
              Regenerate Full Plan
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-icm-border">
        <button onClick={onBack} className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg">← Back</button>
        <div className="flex items-center gap-2">
          <button onClick={onSaveDraft} className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg">Save as Draft</button>
          <button onClick={onContinue} className="h-9 px-5 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-700 inline-flex items-center gap-1.5">
            Continue <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Finalize Plan Details ────────────────────────────────────────────

function Step4Finalize({
  individualName,
  effectiveDate,
  annualPlanDate,
  onBack,
  onSaveDraft,
  onComplete,
}: {
  individualName: string;
  effectiveDate: string;
  annualPlanDate: string;
  onBack: () => void;
  onSaveDraft: () => void;
  onComplete: (data: Record<string, string>) => void;
}) {
  const [planStatus, setPlanStatus] = useState("In Progress");
  const [effDate, setEffDate] = useState(effectiveDate);
  const [dueDate, setDueDate] = useState(annualPlanDate);
  const [meetingDate, setMeetingDate] = useState("");
  const [crReceived, setCrReceived] = useState("");
  const [approvalDate, setApprovalDate] = useState("");
  const [teamNote, setTeamNote] = useState("");

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-manrope font-bold text-[17px] text-icm-text">Finalize Plan Details</h3>
        <p className="text-[12px] text-icm-text-dim mt-0.5">Review and complete the required fields before saving.</p>
      </div>

      <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
        <p className="text-[11px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">Plan Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint block mb-1">Plan Status</label>
            <select value={planStatus} onChange={(e) => setPlanStatus(e.target.value)}
              className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text">
              <option>In Progress</option>
              <option>Ready for Review</option>
              <option>Approved</option>
            </select>
          </div>
          <div>
            <label className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint block mb-1">Effective Date</label>
            <input type="date" value={effDate} onChange={(e) => setEffDate(e.target.value)}
              className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
          </div>
          <div>
            <label className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint block mb-1">Internal Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
          </div>
          <div>
            <label className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint block mb-1">Meeting Date</label>
            <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
          </div>
          <div>
            <label className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint block mb-1">CR Received Date</label>
            <input type="date" value={crReceived} onChange={(e) => setCrReceived(e.target.value)}
              className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
          </div>
          <div>
            <label className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint block mb-1">Plan Approval Date</label>
            <input type="date" value={approvalDate} onChange={(e) => setApprovalDate(e.target.value)}
              className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
        <p className="text-[11px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">Team & Signatures</p>
        <textarea value={teamNote} onChange={(e) => setTeamNote(e.target.value)} rows={3}
          placeholder="Add team members who participated in this plan (names, roles)..."
          className="w-full px-3 py-2.5 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text placeholder:text-icm-text-faint focus:outline-none resize-y" />
        <p className="text-[10.5px] font-geist text-icm-text-faint">
          Signatures will be collected via e-signature after the plan is saved.
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-icm-border">
        <button onClick={onBack} className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg">← Back</button>
        <div className="flex items-center gap-2">
          <button onClick={onSaveDraft} className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg">Save as Draft</button>
          <button
            onClick={() => onComplete({ planStatus, effectiveDate: effDate, internalDueDate: dueDate, meetingDate, crReceivedDate: crReceived, approvalDate, teamNote })}
            className="h-9 px-5 rounded-lg bg-teal-600 text-white text-[12px] font-semibold hover:bg-teal-700 inline-flex items-center gap-1.5"
          >
            Save & Complete <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Complete ─────────────────────────────────────────────────────────

function Step5Complete({
  individualName,
  planId,
  goalsCount,
  servicesCount,
  totalSources,
  onOpenPlan,
  onReturnToEchart,
}: {
  individualName: string;
  planId: string;
  goalsCount: number;
  servicesCount: number;
  totalSources: number;
  onOpenPlan: () => void;
  onReturnToEchart: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-6 space-y-5 text-center">
      <div className="w-16 h-16 rounded-full bg-teal-50 border-2 border-teal-200 flex items-center justify-center animate-[scale-in_0.4s_ease-out]">
        <CheckCircle2 className="w-8 h-8 text-teal-600" />
      </div>
      <div>
        <h3 className="font-manrope font-extrabold text-[20px] text-icm-text">Plan Draft Saved</h3>
        <p className="text-[13px] text-icm-text-dim mt-1">
          {individualName}'s Person-Centered Plan has been saved as a draft.
        </p>
      </div>
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <span className="px-3 py-1.5 rounded-full bg-icm-green-soft text-icm-green text-[11px] font-semibold ring-1 ring-icm-green/20">
          {goalsCount} goal{goalsCount !== 1 ? "s" : ""} created
        </span>
        <span className="px-3 py-1.5 rounded-full bg-icm-accent-soft text-icm-accent text-[11px] font-semibold ring-1 ring-icm-accent/20">
          {servicesCount} service{servicesCount !== 1 ? "s" : ""} documented
        </span>
        {totalSources > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-icm-bg text-icm-text-dim text-[11px] font-semibold ring-1 ring-icm-border">
            {totalSources} data sources reviewed
          </span>
        )}
      </div>
      <p className="text-[12.5px] font-geist text-icm-text-dim font-semibold">What would you like to do next?</p>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button onClick={onOpenPlan}
          className="h-10 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 inline-flex items-center justify-center gap-2">
          <FileText className="w-4 h-4" /> Open Plan & Review
        </button>
        <button onClick={onReturnToEchart}
          className="h-10 rounded-xl border border-icm-border text-[13px] font-medium text-icm-text-dim hover:bg-icm-bg inline-flex items-center justify-center gap-2">
          Return to eChart
        </button>
      </div>
    </div>
  );
}

// ─── Step 3 (AI Mode): Review Summary ────────────────────────────────────────

function Step3AIReview({
  plan,
  planId,
  individualName,
  individualId,
  onOpenPlan,
}: {
  plan: Record<string, unknown>;
  planId: string;
  individualName: string;
  individualId: string;
  onOpenPlan: () => void;
}) {
  const pd = (plan.planDetails as any) ?? {};
  const ds = pd.dataSources ?? {};
  const goals: any[] = Array.isArray(plan.goals) ? plan.goals : [];
  const services: any[] = Array.isArray(plan.services) ? plan.services : [];
  const flags: any[] = Array.isArray(plan.complianceFlags) ? plan.complianceFlags : [];
  const totalSources = Object.values(ds).reduce((a: number, b) => a + Number(b), 0);
  const engineName = (plan as any).guidelinesEngineName || pd.guidelinesEngineName || "";

  const chips = [
    { label: "Goals created", value: goals.length, color: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20" },
    { label: "Services identified", value: services.length, color: "bg-icm-green-soft text-icm-green ring-icm-green/20" },
    { label: "Data sources reviewed", value: totalSources, color: "bg-icm-bg text-icm-text-dim ring-icm-border" },
  ];

  const dataSummary = [
    ds.contactNotes   > 0 && `${ds.contactNotes} contact notes`,
    ds.visitSummaries > 0 && `${ds.visitSummaries} visit summaries`,
    ds.monitoringForms > 0 && `${ds.monitoringForms} monitoring forms`,
    ds.progressNotes  > 0 && `${ds.progressNotes} progress notes`,
    ds.incidents      > 0 && `${ds.incidents} incident reports`,
    ds.authorizations > 0 && `${ds.authorizations} service authorizations`,
    ds.assessments    > 0 && `${ds.assessments} assessments`,
    ds.uploadedDocuments > 0 && `${ds.uploadedDocuments} uploaded documents`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      {/* Success header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6 text-teal-600" />
        </div>
        <div>
          <h3 className="font-manrope font-bold text-[17px] text-icm-text">
            {individualName.split(" ")[0]}'s plan is ready
          </h3>
          <p className="text-[12.5px] text-icm-text-dim mt-0.5">
            AI reviewed {totalSources} data sources and built a complete draft.{engineName ? ` Applied ${engineName} guidelines.` : ""}
          </p>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {chips.map(c => (
          <div key={c.label} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ring-1 ${c.color}`}>
            <span className="text-[10px] uppercase tracking-wide font-geist font-semibold opacity-80">{c.label}</span>
            <span className="font-mono font-bold text-[16px]">{c.value}</span>
          </div>
        ))}
      </div>

      {/* Data reviewed */}
      {dataSummary.length > 0 && (
        <div className="rounded-xl border border-icm-border bg-icm-bg p-4">
          <p className="text-[11px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">Data reviewed from {individualName.split(" ")[0]}'s chart</p>
          <div className="flex flex-wrap gap-1.5">
            {dataSummary.map(s => (
              <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-icm-panel border border-icm-border text-[11px] font-geist text-icm-text-dim">
                <CheckCircle2 className="w-3 h-3 text-teal-500" /> {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Goals preview */}
      {goals.length > 0 && (
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
          <p className="text-[11px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">{goals.length} goals drafted</p>
          <ul className="space-y-1.5">
            {goals.map((g: any, i: number) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px]">
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-icm-accent-soft text-icm-accent shrink-0 mt-0.5">G{i + 1}</span>
                <span className="text-icm-text">{g.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Compliance flags */}
      {flags.length > 0 && (
        <div className="rounded-xl border border-icm-amber/30 bg-amber-50 p-4">
          <p className="text-[11px] font-geist font-semibold uppercase tracking-wider text-amber-700 mb-2">{flags.length} compliance item{flags.length > 1 ? "s" : ""} to review</p>
          {flags.slice(0, 3).map((f: any, i: number) => (
            <p key={i} className="text-[12px] text-amber-700">
              <strong>{f.type === "hard_stop" ? "HARD STOP" : "Warning"}:</strong> {f.description}
            </p>
          ))}
        </div>
      )}

      <div className="text-[11.5px] text-icm-text-dim font-geist bg-icm-bg rounded-lg px-3 py-2 border border-icm-border">
        <Sparkles className="w-3.5 h-3.5 inline text-icm-accent mr-1.5" />
        All AI-generated content is labeled "AI drafted" — review and edit each section before finalizing.
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-icm-border">
        <p className="text-[11px] text-icm-text-faint font-geist">Plan ID: {planId.slice(0, 8)}</p>
        <button
          onClick={onOpenPlan}
          className="h-10 px-5 rounded-xl bg-icm-text text-icm-panel text-[13px] font-geist font-bold hover:opacity-90 inline-flex items-center gap-2 transition-opacity"
        >
          <CheckCircle2 className="w-4 h-4" />
          Open Complete Plan →
        </button>
      </div>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function GenerationErrorState({ message, onRetry, onStartBlank }: { message: string; onRetry: () => void; onStartBlank: () => void }) {
  return (
    <div className="flex flex-col items-center py-8 space-y-4 text-center">
      <AlertTriangle className="w-10 h-10 text-red-500" />
      <div>
        <p className="text-[14px] font-semibold text-icm-text">Something went wrong generating the plan.</p>
        <p className="text-[12px] text-icm-text-dim mt-1 max-w-sm">{message}</p>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onRetry} className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-700">Try Again</button>
        <button onClick={onStartBlank} className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg">Start from Blank</button>
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
  agentId,
  agentMasterPrompt: _agentMasterPrompt,
  linkedGuidelinesEngineName,
  individualProgram,
  individualState,
}: PCPCreationModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [planType, setPlanType] = useState("Annual Plan");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [annualDate, setAnnualDate] = useState("2026-08-31");
  const [revisionReason, setRevisionReason] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [showOrbAnimation, setShowOrbAnimation] = useState(false);
  const [createdPcpId, setCreatedPcpId] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedPcpData | null>(null);
  // AI mode state
  const [generatedPlan, setGeneratedPlan] = useState<Record<string, unknown> | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [step2Key, setStep2Key] = useState(0); // increment to remount Step2AI (retry)

  const isAiMode = mode === "ai";
  const title = isAiMode ? "Draft PCP with AI" : "Start New Person-Centered Plan";

  const stepLabel: Record<number, string> = {
    1: "Upload Supporting Documents",
    2: isAiMode ? "AI Processing" : "Reading Documents",
    3: "Review",
    4: "Complete",
  };

  // ── Blank mode: handleBuild (unchanged) ──────────────────────────────────────
  const handleBuild = async () => {
    try {
      const pcpData = {
        individual_id: individualId,
        plan_type: planType.toLowerCase().replace(" plan", "").replace(" ", "_"),
        plan_format: "pcp_v2",
        effective_date: effectiveDate,
        annual_plan_date: annualDate,
        status: "draft",
        created_by: "case-manager",
        ai_generated: false,
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
      onClose();
      navigate(`/people/${individualId}/care-plan/new?pcpId=${docRef.id}&planType=${encodeURIComponent(planType)}&effectiveDate=${effectiveDate}&annualDate=${annualDate}`);
    } catch {
      onClose();
      navigate(`/people/${individualId}/care-plan/new?planType=${encodeURIComponent(planType)}&effectiveDate=${effectiveDate}&annualDate=${annualDate}`);
    }
  };

  // ── AI mode handlers ──────────────────────────────────────────────────────────
  const handleGenerationComplete = (plan: Record<string, unknown>, planId: string) => {
    setGeneratedPlan(plan);
    setCreatedPcpId(planId);
    setGenerationError(null);
    setStep(3);
  };

  const handleGenerationError = (msg: string) => {
    setGenerationError(msg);
  };

  const handleSaveDraft = () => {
    toast.success("Plan draft saved. You can return to it from the PCP module.");
    onClose();
  };

  const handleFinalizeComplete = async (data: Record<string, string>) => {
    if (createdPcpId) {
      try {
        await updateDoc(doc(db, "care_plans", createdPcpId), {
          ...data,
          status: data.planStatus || "In Progress",
        });
      } catch { /* non-fatal */ }
    }
    setStep(5);
  };

  // Orb animation (blank mode)
  const handleOrbComplete = () => {
    onClose();
    const pcpId = createdPcpId || "pcp-draft";
    navigate(`/people/${individualId}/care-plan/${pcpId}?ai=true`);
  };

  if (showOrbAnimation) {
    return (
      <PCPOrbAnimation
        individualName={individualName}
        planType={planType}
        effectiveDate={effectiveDate}
        annualDate={annualDate}
        onComplete={handleOrbComplete}
        onLater={onClose}
      />
    );
  }

  const isWide = false; // Keep modal standard size throughout

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={step === 2 && isAiMode ? undefined : onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden transition-all duration-300 ${isWide ? "max-w-[900px] max-h-[95vh]" : "max-w-2xl max-h-[90vh]"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header — hidden during AI Step 2 (dark mode) */}
        {!(isAiMode && step === 2) && (
          <div className="px-6 pt-6 pb-4 border-b border-icm-border">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="font-manrope font-extrabold text-[18px] text-icm-text">{title}</h2>
                <p className="text-[12px] text-icm-text-dim mt-0.5">
                  Step {step} of 4 — {stepLabel[step]}
                </p>
              </div>
              {step !== 2 && (
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-icm-bg text-icm-text-dim mt-0.5">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="mt-4">
              <StepIndicator current={step} />
            </div>
          </div>
        )}

        {/* Modal body */}
        <div className={`flex-1 overflow-y-auto ${isAiMode && step === 2 ? "" : "px-6 py-5"}`}>
          {/* No docs warning (steps 2+ in blank mode) */}
          {!isAiMode && step > 1 && files.length === 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-center gap-2 text-[12px] text-amber-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span><strong>No state documents uploaded.</strong> AI suggestions will be based on chart data only.</span>
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
              specialInstructions={specialInstructions}
              onSpecialInstructionsChange={setSpecialInstructions}
              onClose={onClose}
              onContinue={() => setStep(2)}
            />
          )}

          {/* AI mode Step 2 */}
          {isAiMode && step === 2 && !generationError && (
            <Step2AI
              key={step2Key}
              individualId={individualId}
              individualName={individualName}
              individualProgram={individualProgram}
              individualState={individualState}
              files={files}
              planType={planType}
              effectiveDate={effectiveDate}
              annualPlanDate={annualDate}
              specialInstructions={specialInstructions}
              agentId={agentId}
              linkedGuidelinesEngineName={linkedGuidelinesEngineName}
              onComplete={handleGenerationComplete}
              onError={handleGenerationError}
            />
          )}

          {/* AI mode Step 2 — error state */}
          {isAiMode && step === 2 && generationError && (
            <div className="px-6 py-5">
              <GenerationErrorState
                message={generationError}
                onRetry={() => { setGenerationError(null); setStep2Key((k) => k + 1); }}
                onStartBlank={() => { onClose(); }}
              />
            </div>
          )}

          {/* Blank mode Step 2 */}
          {!isAiMode && step === 2 && (
            <Step2Reading
              files={files}
              planType={planType}
              onComplete={(data) => { setExtractedData(data); setStep(3); }}
            />
          )}

          {/* AI mode Step 3 — Review Summary */}
          {isAiMode && step === 3 && generatedPlan && (
            <div className="px-6 py-5">
              <Step3AIReview
                plan={generatedPlan}
                planId={createdPcpId || ""}
                individualName={individualName}
                individualId={individualId}
                onOpenPlan={() => {
                  onClose();
                  navigate(`/people/${individualId}/care-plan/${createdPcpId || ""}`);
                }}
              />
            </div>
          )}

          {/* Blank mode Step 3 */}
          {!isAiMode && step === 3 && (
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
