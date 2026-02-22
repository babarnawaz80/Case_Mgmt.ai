import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  FileUp,
  File,
  Sparkles,
} from "lucide-react";
import { GuidelinePack, RulePack, UploadedFile } from "@/types/guidelinePack";
import { cn } from "@/lib/utils";

interface Step1Props {
  uploadedFiles: UploadedFile[];
  rulePacks: RulePack[];
  isProcessing: boolean;
  onFilesUploaded: (files: UploadedFile[]) => void;
  onRulePacksGenerated: (packs: RulePack[]) => void;
  onProcessingChange: (processing: boolean) => void;
  onNext: () => void;
}

// Simulated rule pack generation from uploaded files
function generateMockRulePacks(files: UploadedFile[]): RulePack[] {
  const toRuleItems = (items: string[]) => items.map((t) => ({ rule_type: "rule", rule_text: t }));
  const toLimitRules = (items: string[]) => items.map((t) => ({ type: "daily" as const, rule_text: t }));
  const toConflictRules = (items: string[]) => items.map((t) => ({ type: "same_time" as const, conflicting_service: "N/A", rule_text: t }));

  const base = {
    guideline_version_date: "2026-01-15",
    state: "Example State",
    program_waiver_type: "HCBS",
    source_service_name: "",
    service_category: "Support" as const,
    service_description: "",
    authorization_requirements: [] as { rule_type: string; rule_text: string }[],
    self_directed_differences: [] as { rule_type: string; rule_text: string }[],
    hard_stops: [{ rule_type: "cap", rule_text: "Cannot exceed authorized cap" }],
    warnings: [{ rule_type: "threshold", rule_text: "Warning at 80% utilization" }],
    citations: [{ page: "p.10", section: "§3.1", text: "See guideline" }],
    published: false,
    created_by: "Admin",
    created_at: new Date().toISOString(),
  };

  const services: RulePack[] = [
    {
      ...base, id: "rp-1", service_name: "Personal Care Services (PCS)", source_service_name: "Personal Care Services (PCS)",
      billing_unit: "15 min",
      eligibility_rules: toRuleItems(["Must be enrolled in applicable Medicaid waiver", "Age 21+ unless EPSDT exception applies", "Documented need for assistance with ADLs"]),
      pcp_requirements: toRuleItems(["Person-Centered Plan must be completed annually", "Goals must be measurable and time-bound", "Individual must participate in plan development"]),
      prerequisite_requirements: toRuleItems(["Level of Care assessment completed", "Functional assessment within 90 days", "Natural supports exploration documented"]),
      limits: toLimitRules(["Maximum 40 hours per week", "Cannot exceed authorized units per plan year", "Daily cap of 8 hours unless exception granted"]),
      conflicts: toConflictRules(["Cannot bill concurrently with Day Habilitation", "Cannot overlap with Residential Habilitation hours"]),
      documentation_requirements: toRuleItems(["Daily service notes required within 24 hours", "Monthly progress summaries", "Incident reports within 4 hours"]),
      monitoring_rules: toRuleItems(["Quarterly review by case manager", "Annual recertification required", "Random documentation audits monthly"]),
    },
    {
      ...base, id: "rp-2", service_name: "Day Habilitation Services", source_service_name: "Day Habilitation Services",
      billing_unit: "hourly", service_category: "Meaningful Day",
      eligibility_rules: toRuleItems(["Enrolled in HCBS waiver", "Requires skill-building support", "Not enrolled in school full-time if under 21"]),
      pcp_requirements: toRuleItems(["Community integration goals required", "Skill acquisition targets documented", "Preferences and interests incorporated"]),
      prerequisite_requirements: toRuleItems(["Vocational assessment completed", "Transportation plan in place"]),
      limits: toLimitRules(["Maximum 6 hours per day", "5 days per week maximum", "Plan year cap of 1,560 hours"]),
      conflicts: toConflictRules(["Cannot bill with PCS during same hours", "Cannot bill during school hours for minors"]),
      documentation_requirements: toRuleItems(["Attendance logs daily", "Skill acquisition data tracking", "Monthly progress notes to case manager"]),
      monitoring_rules: toRuleItems(["Semi-annual quality reviews", "Staff ratio compliance checks", "Community integration percentage tracking"]),
    },
    {
      ...base, id: "rp-3", service_name: "Respite Care Services", source_service_name: "Respite Care Services",
      billing_unit: "15 min",
      eligibility_rules: toRuleItems(["Primary caregiver identified", "Waiver enrolled participant", "Documented caregiver stress or need for relief"]),
      pcp_requirements: toRuleItems(["Respite schedule in PCP", "Emergency protocols documented", "Caregiver training plan included"]),
      prerequisite_requirements: toRuleItems(["Caregiver assessment completed", "Background check for respite provider"]),
      limits: toLimitRules(["Maximum 720 hours per plan year", "Daily cap of 24 hours for in-home", "Facility respite limited to 30 consecutive days"]),
      conflicts: toConflictRules(["Cannot bill with PCS simultaneously", "Cannot bill during Day Hab hours"]),
      documentation_requirements: toRuleItems(["Service delivery logs", "Caregiver sign-off sheets", "Incident reporting same as PCS"]),
      monitoring_rules: toRuleItems(["Quarterly utilization reviews", "Caregiver satisfaction surveys annually"]),
    },
  ];

  return services.slice(0, Math.max(2, files.length + 1));
}

export function Step1GuidelineIngestion({
  uploadedFiles,
  rulePacks,
  isProcessing,
  onFilesUploaded,
  onRulePacksGenerated,
  onProcessingChange,
  onNext,
}: Step1Props) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const newFiles: UploadedFile[] = Array.from(fileList).map((f) => ({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: f.name,
        type: f.type,
        size: f.size,
        status: "uploading" as const,
      }));

      onFilesUploaded([...uploadedFiles, ...newFiles]);

      // Simulate upload + processing
      setTimeout(() => {
        const processed = newFiles.map((f) => ({
          ...f,
          status: "processing" as const,
        }));
        onFilesUploaded([
          ...uploadedFiles.filter((uf) => !newFiles.find((nf) => nf.id === uf.id)),
          ...processed,
        ]);
      }, 800);

      setTimeout(() => {
        const parsed = newFiles.map((f) => ({
          ...f,
          status: "parsed" as const,
          extractedServices: Math.floor(Math.random() * 3) + 2,
        }));
        const allFiles = [
          ...uploadedFiles.filter((uf) => !newFiles.find((nf) => nf.id === uf.id)),
          ...parsed,
        ];
        onFilesUploaded(allFiles);
      }, 2500);
    },
    [uploadedFiles, onFilesUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const removeFile = (fileId: string) => {
    onFilesUploaded(uploadedFiles.filter((f) => f.id !== fileId));
  };

  const handleGenerateRulePacks = () => {
    onProcessingChange(true);
    setTimeout(() => {
      const packs = generateMockRulePacks(uploadedFiles);
      onRulePacksGenerated(packs);
      onProcessingChange(false);
    }, 3000);
  };

  const allFilesParsed =
    uploadedFiles.length > 0 &&
    uploadedFiles.every((f) => f.status === "parsed");

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">
          Step 1 — Guideline Ingestion Engine
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload state guideline PDFs, templates, sample notes, or authorization
          packets. The AI will parse and extract regulatory structure automatically.
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200",
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/40 hover:bg-muted/30"
        )}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileUp className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, DOCX, TXT, CSV, XLSX — State guidelines, templates, sample
              notes, authorization packets
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Files */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-2"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Uploaded Documents ({uploadedFiles.length})
            </p>
            {uploadedFiles.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/60"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <File className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatFileSize(file.size)}
                    {file.extractedServices &&
                      ` · ${file.extractedServices} services extracted`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {file.status === "uploading" && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading
                    </span>
                  )}
                  {file.status === "processing" && (
                    <span className="flex items-center gap-1.5 text-xs text-primary">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Parsing
                    </span>
                  )}
                  {file.status === "parsed" && (
                    <span className="flex items-center gap-1.5 text-xs text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Parsed
                    </span>
                  )}
                  {file.status === "error" && (
                    <span className="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Error
                    </span>
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate Rule Packs */}
      {allFilesParsed && rulePacks.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <button
            onClick={handleGenerateRulePacks}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                AI is extracting rule packs...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Rule Packs
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Rule Packs Display */}
      {rulePacks.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Extracted Rule Packs
              </p>
              <p className="text-xs text-muted-foreground">
                {rulePacks.length} services identified from uploaded guidelines
              </p>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              AI Extracted
            </span>
          </div>

          <div className="grid gap-3">
            {rulePacks.map((pack, i) => (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border border-border/60 bg-card overflow-hidden"
              >
                <div className="p-4 border-b border-border/40 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {pack.service_name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Billing: {pack.billing_unit}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <RuleSection
                    title="Eligibility"
                    items={pack.eligibility_rules.map((r) => r.rule_text)}
                  />
                  <RuleSection
                    title="PCP Requirements"
                    items={pack.pcp_requirements.map((r) => r.rule_text)}
                  />
                  <RuleSection title="Limits" items={pack.limits.map((r) => r.rule_text)} />
                  <RuleSection
                    title="Documentation"
                    items={pack.documentation_requirements.map((r) => r.rule_text)}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Continue to Workflow Generator
              <span className="text-lg">→</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function RuleSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
        {title}
      </p>
      <ul className="space-y-1">
        {items.slice(0, 3).map((item, i) => (
          <li
            key={i}
            className="text-[11px] text-foreground/80 leading-snug flex items-start gap-1.5"
          >
            <span className="h-1 w-1 rounded-full bg-primary mt-1.5 shrink-0" />
            {item}
          </li>
        ))}
        {items.length > 3 && (
          <li className="text-[10px] text-muted-foreground">
            +{items.length - 3} more
          </li>
        )}
      </ul>
    </div>
  );
}
