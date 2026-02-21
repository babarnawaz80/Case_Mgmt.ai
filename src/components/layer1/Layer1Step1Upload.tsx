import { useState } from "react";
import { motion } from "framer-motion";
import {
  Upload, FileText, FileSpreadsheet, ClipboardList,
  CheckCircle2, AlertCircle, X, ArrowRight, Shield,
} from "lucide-react";
import { UploadedFile } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Props {
  uploadedFiles: UploadedFile[];
  optionalTemplates: UploadedFile[];
  serviceCodeMapping: string;
  onFilesChange: (files: UploadedFile[]) => void;
  onTemplatesChange: (files: UploadedFile[]) => void;
  onMappingChange: (m: string) => void;
  onNext: () => void;
}

export function Layer1Step1Upload({
  uploadedFiles, optionalTemplates, serviceCodeMapping,
  onFilesChange, onTemplatesChange, onMappingChange, onNext,
}: Props) {
  const handleGuidelineDrop = () => {
    const file: UploadedFile = {
      id: `f-${Date.now()}`,
      name: "State_Waiver_Guidelines_2026.pdf",
      type: "application/pdf",
      size: 4200000,
      status: "parsed",
      extractedServices: 12,
    };
    onFilesChange([...uploadedFiles, file]);
  };

  const handleTemplateDrop = () => {
    const templates: UploadedFile[] = [
      { id: `t-1`, name: "PCP_Addendum_Template.docx", type: "docx", size: 120000, status: "parsed" },
      { id: `t-2`, name: "Billable_Activity_Note.docx", type: "docx", size: 95000, status: "parsed" },
      { id: `t-3`, name: "Progress_Note_Template.docx", type: "docx", size: 88000, status: "parsed" },
      { id: `t-4`, name: "Monitoring_Form.docx", type: "docx", size: 76000, status: "parsed" },
      { id: `t-5`, name: "Comprehensive_Assessment.docx", type: "docx", size: 145000, status: "parsed" },
    ];
    onTemplatesChange(templates);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-display font-bold text-foreground">Step 1 — Ingest Guidelines</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload the state guideline PDF (required). Optionally add templates, service lists, and billing code mappings.
        </p>
      </div>

      {/* Required: State Guideline PDF */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">State Guideline PDF <span className="text-destructive">*Required</span></p>
        {uploadedFiles.length === 0 ? (
          <div
            onClick={handleGuidelineDrop}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">Drop PDF here or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">State waiver guidelines, program manuals, service definitions</p>
          </div>
        ) : (
          <div className="space-y-2">
            {uploadedFiles.map((f) => (
              <motion.div key={f.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                  <p className="text-[11px] text-muted-foreground">{(f.size / 1024 / 1024).toFixed(1)} MB · {f.extractedServices} services identified</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Optional: Templates */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Templates & Documents <span className="text-muted-foreground font-normal">(Optional)</span></p>
        {optionalTemplates.length === 0 ? (
          <div
            onClick={handleTemplateDrop}
            className="border border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/30 hover:bg-muted/30 transition-all"
          >
            <ClipboardList className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs font-medium text-foreground">Upload PCP Addendum, BAN, Progress Note, Monitoring, Assessment templates</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {optionalTemplates.map((t) => (
              <div key={t.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/40">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-[11px] font-medium text-foreground truncate">{t.name}</p>
                <CheckCircle2 className="h-3 w-3 text-primary ml-auto shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Optional: Service Code Mapping */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Service Code / Billing Unit Mapping <span className="text-muted-foreground font-normal">(Optional)</span></p>
        <textarea
          value={serviceCodeMapping}
          onChange={(e) => onMappingChange(e.target.value)}
          placeholder="Paste service name → billing unit → internal code mapping (CSV or freeform text)"
          className="w-full min-h-[80px] p-3 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>

      {/* Continue */}
      {uploadedFiles.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end pt-2">
          <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            Extract Services <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
