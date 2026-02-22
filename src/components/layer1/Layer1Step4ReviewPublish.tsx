import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, CheckCircle2, Rocket, Shield, ToggleLeft, ToggleRight,
  Database, FileText, OctagonAlert, AlertTriangle, Eye, Loader2,
  Sparkles,
} from "lucide-react";
import { GuidelinePack, RulePack, ExtractionSummary } from "@/types/guidelinePack";
import { cn } from "@/lib/utils";

interface Props {
  rulePacks: RulePack[];
  extractionSummary: ExtractionSummary | null;
  onSummaryGenerated: (summary: ExtractionSummary) => void;
  onBack: () => void;
  onPublish: () => void;
}

export function Layer1Step4ReviewPublish({ rulePacks, extractionSummary, onSummaryGenerated, onBack, onPublish }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [publishToggle, setPublishToggle] = useState(false);
  const [published, setPublished] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const summary: ExtractionSummary = {
        totalServices: rulePacks.length || 12,
        hardStopCount: rulePacks.reduce((sum, rp) => sum + rp.hard_stops.length, 0) || 24,
        warningCount: rulePacks.reduce((sum, rp) => sum + rp.warnings.length, 0) || 12,
        unclearSections: [
          "Transportation — billing unit unclear between per-trip vs. mileage-based",
          "Fiscal Management Services — self-directed differences not fully specified",
        ],
        publishReady: true,
      };
      onSummaryGenerated(summary);
      setIsGenerating(false);
    }, 2000);
  };

  const handlePublish = () => {
    setPublished(true);
    setTimeout(onPublish, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 4 — Review & Publish</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review the extraction results and publish the compliance engine so case managers can use it.
        </p>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-foreground font-medium mb-0.5">Why this step?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Compliance rules should never change without oversight. Admin reviews what was extracted, flags unclear sections, and has final say before rules affect authorizations and billing.
          </p>
        </div>
        <div className="mt-2 p-3 rounded-xl bg-warning/5 border border-warning/15">
          <p className="text-xs text-warning font-medium mb-0.5">⚠️ Governance Notice</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Publishing locks this engine version. Published engines are <span className="font-semibold text-foreground">read-only and immutable</span>. To make changes, create a new version by cloning this engine.
          </p>
        </div>
      </div>

      {/* Generate Review */}
      {!extractionSummary ? (
        <div className="flex justify-center">
          <button onClick={handleGenerate} disabled={isGenerating} className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating review summary...</> : <><Eye className="h-4 w-4" /> Generate Review Summary</>}
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Services" value={extractionSummary.totalServices.toString()} icon={<FileText className="h-5 w-5 text-primary" />} />
            <StatCard label="Hard Stops" value={extractionSummary.hardStopCount.toString()} icon={<OctagonAlert className="h-5 w-5 text-destructive" />} />
            <StatCard label="Warnings" value={extractionSummary.warningCount.toString()} icon={<AlertTriangle className="h-5 w-5 text-warning" />} />
            <StatCard label="Publish Ready" value={extractionSummary.publishReady ? "Yes" : "No"} icon={<CheckCircle2 className={cn("h-5 w-5", extractionSummary.publishReady ? "text-primary" : "text-destructive")} />} />
          </div>

          {/* Flagged sections */}
          {extractionSummary.unclearSections.length > 0 && (
            <div className="p-4 rounded-xl border border-warning/20 bg-warning/5">
              <p className="text-xs font-semibold text-warning uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Sections Flagged for Admin Review
              </p>
              <ul className="space-y-1.5">
                {extractionSummary.unclearSections.map((section, i) => (
                  <li key={i} className="text-[11px] text-foreground flex items-start gap-2">
                    <span className="h-4 w-4 rounded bg-warning/10 flex items-center justify-center text-[9px] font-bold text-warning shrink-0 mt-0.5">{i + 1}</span>
                    {section}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground mt-2 italic">These sections were flagged rather than guessed. Admin should verify before publishing.</p>
            </div>
          )}

          {/* Services list */}
          {rulePacks.length > 0 && (
            <div className="rounded-xl border border-border/40 overflow-hidden">
              <div className="p-3 bg-muted/30 border-b border-border/40">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Services to Publish</p>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {rulePacks.map((rp) => (
                  <div key={rp.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/20 last:border-0">
                    <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                    <p className="text-xs font-medium text-foreground flex-1 truncate">{rp.service_name}</p>
                    <span className="text-[10px] text-muted-foreground">{rp.billing_unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Publish toggle */}
          {!published && (
            <div className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Publish Compliance Engine</p>
                    <p className="text-xs text-muted-foreground">Publishing creates an immutable engine version. Once published, you cannot edit — only create a new version.</p>
                  </div>
                </div>
                <button onClick={() => setPublishToggle(!publishToggle)} className="text-primary">
                  {publishToggle ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                </button>
              </div>
            </div>
          )}

          {published && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-xl border border-primary/30 bg-primary/5">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Compliance Engine Ready</p>
                  <p className="text-xs text-muted-foreground">{extractionSummary.totalServices} services published. Compliance Engine agents can now use this engine.</p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {publishToggle && !published && (
          <button onClick={handlePublish} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            <Rocket className="h-4 w-4" /> Publish Compliance Engine
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="p-3 rounded-xl bg-card border border-border/40 text-center">
      <div className="mx-auto mb-1">{icon}</div>
      <p className="text-xl font-display font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}
