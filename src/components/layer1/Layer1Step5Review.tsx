import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Sparkles, Loader2, CheckCircle2,
  AlertTriangle, OctagonAlert, FileText, Eye,
} from "lucide-react";
import { GuidelinePack, RulePack, ExtractionSummary } from "@/types/guidelinePack";
import { cn } from "@/lib/utils";

interface Props {
  rulePacks: RulePack[];
  extractionSummary: ExtractionSummary | null;
  onSummaryGenerated: (summary: ExtractionSummary) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Layer1Step5Review({ rulePacks, extractionSummary, onSummaryGenerated, onBack, onNext }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const summary: ExtractionSummary = {
        totalServices: rulePacks.length,
        hardStopCount: rulePacks.reduce((sum, rp) => sum + rp.hard_stops.length, 0),
        warningCount: rulePacks.reduce((sum, rp) => sum + rp.warnings.length, 0),
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 5 — Admin Review</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Shows an admin summary: how many services were extracted, which rules are unclear, and whether it's "Publish Ready."
        </p>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-foreground font-medium mb-0.5">Why this step?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">This prevents mistakes from going live. Admin gets final say before rules affect authorizations and billing.</p>
        </div>
      </div>

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
            <StatCard label="Services Extracted" value={extractionSummary.totalServices.toString()} icon={<FileText className="h-5 w-5 text-primary" />} />
            <StatCard label="Hard Stops" value={extractionSummary.hardStopCount.toString()} icon={<OctagonAlert className="h-5 w-5 text-destructive" />} />
            <StatCard label="Warnings" value={extractionSummary.warningCount.toString()} icon={<AlertTriangle className="h-5 w-5 text-warning" />} />
            <StatCard label="Publish Ready" value={extractionSummary.publishReady ? "Yes" : "No"} icon={<CheckCircle2 className={cn("h-5 w-5", extractionSummary.publishReady ? "text-primary" : "text-destructive")} />} />
          </div>

          {/* Unclear sections */}
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

          {/* Service list summary */}
          <div className="p-4 rounded-xl border border-border/40 bg-card">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Services with Complex Rules</p>
            <div className="flex flex-wrap gap-1.5">
              {rulePacks.filter((rp) => rp.hard_stops.length > 0).map((rp) => (
                <span key={rp.id} className="px-2 py-0.5 rounded-full bg-destructive/5 border border-destructive/20 text-[10px] font-medium text-destructive">{rp.service_name}</span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {extractionSummary && (
          <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            Proceed to Publish <ArrowRight className="h-4 w-4" />
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
