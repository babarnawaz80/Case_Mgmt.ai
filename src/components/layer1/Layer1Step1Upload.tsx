import { useState } from "react";
import { motion } from "framer-motion";
import {
  Upload, FileText, CheckCircle2, ArrowRight, Shield,
  Loader2, Sparkles,
} from "lucide-react";
import { UploadedFile } from "@/types/rulePack";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  uploadedFiles: UploadedFile[];
  serviceCodeMapping: string;
  agentName: string;
  agentInstructions: string;
  onFilesChange: (files: UploadedFile[]) => void;
  onMappingChange: (m: string) => void;
  onAgentNameChange: (name: string) => void;
  onAgentInstructionsChange: (instructions: string) => void;
  onNext: () => void;
}

export function Layer1Step1Upload({
  uploadedFiles, serviceCodeMapping, agentName, agentInstructions,
  onFilesChange, onMappingChange, onAgentNameChange, onAgentInstructionsChange, onNext,
}: Props) {
  const [isParsing, setIsParsing] = useState(false);
  const [parseComplete, setParsComplete] = useState(false);

  const handleGuidelineDrop = () => {
    const file: UploadedFile = {
      id: `f-${Date.now()}`,
      name: "State_Waiver_Guidelines_2026.pdf",
      type: "application/pdf",
      size: 4200000,
      status: "uploading",
    };
    onFilesChange([file]);

    // Simulate: upload → parse → extract services → build compliance engine → normalize
    setIsParsing(true);
    setTimeout(() => {
      onFilesChange([{ ...file, status: "processing" }]);
    }, 800);
    setTimeout(() => {
      onFilesChange([{ ...file, status: "parsed", extractedServices: 12 }]);
      setIsParsing(false);
      setParsComplete(true);
    }, 3000);
  };

  const parsingSteps = [
    "Reading PDF structure and sections…",
    "Extracting all services from guideline…",
    "Building compliance engine rules per service…",
    "Normalizing service names and de-duplicating…",
    "Storing in compliance engine database…",
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-display font-bold text-foreground">Step 1 — Upload Guidelines</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload the state guideline PDF. The agent will automatically parse the entire document, extract every service, build the compliance engine, normalize naming, and store them in the database.
        </p>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-foreground font-medium mb-0.5">Why this step?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            This converts a PDF guideline into a structured, reusable compliance engine. Each service contains billing unit, eligibility rules, authorization requirements, PCP requirements, limits, conflicts, documentation requirements, monitoring rules, hard stops, and warnings. Once stored, case managers never need to read the PDF again.
          </p>
        </div>
      </div>

      {/* Engine Name & Instructions */}
      <div className="space-y-4 p-4 rounded-xl border border-border bg-card/50">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Compliance Engine Name <span className="text-destructive">*Required</span></label>
          <Input
            value={agentName}
            onChange={(e) => onAgentNameChange(e.target.value)}
            placeholder="e.g. Maryland DDA — DD Waiver — Effective 07/01/2023"
            className="bg-background"
          />
        </div>

        {/* Structured metadata fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wide">State</label>
            <select className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">Select state...</option>
              <option>Maryland</option>
              <option>Virginia</option>
              <option>Pennsylvania</option>
              <option>Ohio</option>
              <option>New York</option>
              <option>California</option>
              <option>Texas</option>
              <option>Florida</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Program / Waiver</label>
            <Input placeholder="e.g. DD Waiver, Consolidated Waiver" className="bg-background" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Effective Date</label>
            <Input type="date" className="bg-background" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Source URL <span className="text-muted-foreground font-normal">(Optional)</span></label>
            <Input placeholder="https://..." className="bg-background" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Engine Builder Instructions <span className="text-muted-foreground font-normal">(How to interpret these guidelines)</span></label>
          <Textarea
            value={agentInstructions}
            onChange={(e) => onAgentInstructionsChange(e.target.value)}
            placeholder="Add any notes for the AI about how to interpret this document, agency-specific assumptions, or known edge cases…"
            className="bg-background min-h-[100px]"
          />
          <p className="text-[11px] text-muted-foreground">These instructions guide rule extraction accuracy. Runtime agents use published rules, not this prompt.</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Notes <span className="text-muted-foreground font-normal">(Optional)</span></label>
          <Textarea
            placeholder="Internal notes about this engine version, known issues, etc."
            className="bg-background min-h-[60px]"
          />
        </div>
      </div>

      {/* State Guideline PDF Upload */}
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
          <div className="space-y-3">
            {uploadedFiles.map((f) => (
              <motion.div key={f.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                f.status === "parsed" ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border"
              )}>
                <FileText className={cn("h-5 w-5 shrink-0", f.status === "parsed" ? "text-primary" : "text-muted-foreground")} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(f.size / 1024 / 1024).toFixed(1)} MB
                    {f.status === "parsed" && ` · ${f.extractedServices} services extracted`}
                    {f.status === "uploading" && " · Uploading…"}
                    {f.status === "processing" && " · Processing…"}
                  </p>
                </div>
                {f.status === "parsed" ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-processing pipeline */}
      {isParsing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <p className="text-xs font-semibold text-primary">AI Processing Pipeline</p>
          </div>
          <div className="space-y-2">
            {parsingSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                {step}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Extraction complete summary */}
      {parseComplete && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-xl border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Extraction Complete</p>
              <p className="text-[11px] text-muted-foreground">12 services extracted → Compliance engine built → Stored in database</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-lg bg-card border border-border/40">
              <p className="text-lg font-bold text-foreground">12</p>
              <p className="text-[9px] text-muted-foreground uppercase">Services</p>
            </div>
            <div className="p-2 rounded-lg bg-card border border-border/40">
              <p className="text-lg font-bold text-foreground">12</p>
              <p className="text-[9px] text-muted-foreground uppercase">Rules</p>
            </div>
            <div className="p-2 rounded-lg bg-card border border-border/40">
              <p className="text-lg font-bold text-destructive">24</p>
              <p className="text-[9px] text-muted-foreground uppercase">Hard Stops</p>
            </div>
            <div className="p-2 rounded-lg bg-card border border-border/40">
              <p className="text-lg font-bold text-warning">12</p>
              <p className="text-[9px] text-muted-foreground uppercase">Warnings</p>
            </div>
          </div>
        </motion.div>
      )}

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
      {parseComplete && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end pt-2">
          <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            Upload Templates <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
