import { useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Sparkles,
  ArrowLeft,
  FileText,
  FileCheck,
  ClipboardList,
  Briefcase,
  Activity,
  CheckCircle2,
  Download,
  Eye,
} from "lucide-react";
import { DocumentTemplate } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Step6Props {
  onBack: () => void;
  onNext: () => void;
}

const mockTemplates: DocumentTemplate[] = [
  { id: "doc-1", name: "Billable Activity Note", type: "billable_note", fields: ["Service Date", "Start/End Time", "Activity Description", "Units Billed", "Provider Signature"], generated: false },
  { id: "doc-2", name: "Progress Note", type: "progress_note", fields: ["Goal Reference", "Progress Description", "Data Points Collected", "Barriers Identified", "Next Steps"], generated: false },
  { id: "doc-3", name: "Behavioral Assessment", type: "behavioral_assessment", fields: ["Antecedent Analysis", "Behavior Description", "Consequence Mapping", "Frequency Data", "Replacement Strategy"], generated: false },
  { id: "doc-4", name: "Employment Plan", type: "employment_plan", fields: ["Vocational Goals", "Skill Inventory", "Job Matching Criteria", "Support Needs", "Timeline"], generated: false },
  { id: "doc-5", name: "Monitoring Form", type: "monitoring_form", fields: ["Review Date", "Compliance Checklist", "Risk Indicators", "Corrective Actions", "Follow-Up Date"], generated: false },
  { id: "doc-6", name: "Milestone Deliverables", type: "milestone", fields: ["Milestone Name", "Target Date", "Evidence Required", "Status", "Reviewer Sign-Off"], generated: false },
];

const typeIcons: Record<string, typeof FileText> = {
  billable_note: FileCheck,
  progress_note: ClipboardList,
  behavioral_assessment: Activity,
  employment_plan: Briefcase,
  monitoring_form: Eye,
  milestone: CheckCircle2,
};

export function Step6DocumentationGenerator({ onBack, onNext }: Step6Props) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= mockTemplates.length) {
        clearInterval(interval);
        setIsGenerating(false);
        return;
      }
      setTemplates((prev) => [...prev, { ...mockTemplates[idx], generated: true }]);
      idx++;
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 6 — Documentation Generator</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Auto-generates structured templates for all required documentation — billable notes, progress notes, assessments, employment plans, monitoring forms, and milestone deliverables.
        </p>
      </div>

      {templates.length === 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating templates...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate All Templates</>
            )}
          </button>
        </div>
      )}

      {templates.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Generated Templates ({templates.length}/{mockTemplates.length})
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {templates.map((tmpl, i) => {
              const Icon = typeIcons[tmpl.type] || FileText;
              return (
                <motion.div
                  key={tmpl.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border/60 bg-card p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">{tmpl.name}</h4>
                      <p className="text-[10px] text-primary font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Template Ready
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {tmpl.fields.map((field, j) => (
                      <span key={j} className="px-2 py-0.5 rounded bg-muted/50 border border-border/40 text-[10px] text-foreground/70">
                        {field}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-medium text-foreground border border-border transition-all">
                      <Eye className="h-3 w-3" /> Preview
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-xs font-medium text-primary transition-all">
                      <Download className="h-3 w-3" /> Export
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {templates.length === mockTemplates.length && (
            <div className="flex items-center justify-between pt-4">
              <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
                Continue to Authorization <span className="text-lg">→</span>
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
