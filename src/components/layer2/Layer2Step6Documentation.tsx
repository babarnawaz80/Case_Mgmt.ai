import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, CheckCircle2, FileText, ClipboardList } from "lucide-react";
import { RulePack } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Props {
  rulePack: RulePack | null;
  onBack: () => void;
  onNext: () => void;
}

interface DocPacket {
  name: string;
  type: string;
  fields: string[];
  generated: boolean;
}

export function Layer2Step6Documentation({ rulePack, onBack, onNext }: Props) {
  const [docs, setDocs] = useState<DocPacket[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    const items: DocPacket[] = [
      { name: "Billable Activity Note", type: "Unit-based", fields: ["Date", "Start Time", "Stop Time", "Location", "Direct/Indirect", "Goal Tie-in", "Staff Signature", "Activity Description"], generated: false },
      { name: "Progress Note", type: "Monthly", fields: ["Reporting Period", "Goals Addressed", "Progress Summary", "Challenges", "Recommendations", "Next Steps"], generated: false },
      { name: "Monitoring Form", type: "Quarterly", fields: ["Review Date", "Cap Utilization", "Milestone Status", "Compliance Items", "Staffing Ratio", "Follow-up Actions"], generated: false },
      { name: "Comprehensive Assessment", type: "Annual", fields: ["Functional Assessment", "Behavioral Observations", "Communication Needs", "Environmental Factors", "Support Needs", "Risk Assessment"], generated: false },
      { name: "Employment Plan", type: "As needed", fields: ["Employment Interest", "Skills Assessment", "Job Goals", "Exploration Activities", "Timeline", "Support Needs"], generated: false },
      { name: "Milestone Deliverables Checklist", type: "Per milestone", fields: ["Milestone Name", "Due Date", "Deliverable", "Status", "Evidence", "Sign-off"], generated: false },
    ];
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= items.length) { clearInterval(interval); setIsGenerating(false); return; }
      items[idx].generated = true;
      setDocs([...items.slice(0, idx + 1)]);
      idx++;
    }, 500);
  };

  const allGenerated = docs.length > 0 && docs.every((d) => d.generated);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 6 — Documentation Packet Builder</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Creates the exact documentation checklist and generates templates for <span className="font-medium text-foreground">{rulePack?.service_name}</span>.
        </p>
        <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Data Source:</span>
          <span className="text-[11px] text-foreground font-medium">Engine Templates</span>
        </div>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-foreground font-medium mb-0.5">Why this step?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">Case managers and providers often miss required documentation elements. This step makes documentation requirements explicit and auto-prepared. <span className="italic text-muted-foreground/80">"What paperwork and notes do we need to prove the service happened correctly?"</span></p>
        </div>
      </div>

      {docs.length === 0 && (
        <div className="flex justify-center">
          <button onClick={handleGenerate} disabled={isGenerating} className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating templates...</> : <><Sparkles className="h-4 w-4" /> Generate Documentation Packet</>}
          </button>
        </div>
      )}

      {docs.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {docs.map((doc, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl border border-border/40 bg-card"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{doc.name}</p>
                  <p className="text-[10px] text-muted-foreground">{doc.type}</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-wrap gap-1">
                {doc.fields.map((f) => (
                  <span key={f} className="px-2 py-0.5 rounded bg-muted/40 text-[10px] text-muted-foreground border border-border/30">{f}</span>
                ))}
              </div>
            </motion.div>
          ))}

          {allGenerated && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs text-primary font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> All {docs.length} document templates generated
              </p>
            </div>
          )}
        </motion.div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {allGenerated && (
          <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            Push to Modules <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
