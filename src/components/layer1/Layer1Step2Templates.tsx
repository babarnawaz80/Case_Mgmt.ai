import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, ClipboardList, FileSpreadsheet,
  CheckCircle2, Upload,
} from "lucide-react";
import { UploadedFile } from "@/types/rulePack";

interface Props {
  templates: UploadedFile[];
  onTemplatesChange: (files: UploadedFile[]) => void;
  onBack: () => void;
  onNext: () => void;
}

const TEMPLATE_TYPES = [
  { name: "PCP Addendum Template", file: "PCP_Addendum_Template.docx" },
  { name: "Billable Activity Note Template", file: "Billable_Activity_Note.docx" },
  { name: "Progress Note Template", file: "Progress_Note_Template.docx" },
  { name: "Assessment Template", file: "Comprehensive_Assessment.docx" },
  { name: "Monitoring Template", file: "Monitoring_Form.docx" },
];

export function Layer1Step2Templates({ templates, onTemplatesChange, onBack, onNext }: Props) {
  const handleUploadAll = () => {
    const files: UploadedFile[] = TEMPLATE_TYPES.map((t, i) => ({
      id: `t-${i + 1}`,
      name: t.file,
      type: "docx",
      size: 80000 + Math.floor(Math.random() * 70000),
      status: "parsed" as const,
    }));
    onTemplatesChange(files);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 2 — Upload Templates (Optional)</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload document templates the agent will use when generating documentation for case managers.
        </p>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-foreground font-medium mb-0.5">Why this step?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Templates ensure documentation is consistent across your organization. When the agent generates a PCP addendum, billable note, or progress note, it uses your approved templates — not generic ones.
          </p>
        </div>
      </div>

      {/* Template types */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Supported Templates</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {TEMPLATE_TYPES.map((t, i) => {
            const uploaded = templates.find((f) => f.name === t.file);
            return (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${uploaded ? "border-primary/20 bg-primary/5" : "border-border/40 bg-card"}`}>
                <FileSpreadsheet className={`h-4 w-4 shrink-0 ${uploaded ? "text-primary" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{t.name}</p>
                  {uploaded && <p className="text-[10px] text-muted-foreground">{t.file}</p>}
                </div>
                {uploaded ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <span className="text-[10px] text-muted-foreground">Not uploaded</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {templates.length === 0 ? (
        <div
          onClick={handleUploadAll}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/30 hover:bg-muted/30 transition-all"
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">Click to upload templates</p>
          <p className="text-xs text-muted-foreground mt-1">PCP Addendum, BAN, Progress Note, Assessment, Monitoring</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium text-foreground">{templates.length} templates uploaded</p>
          </div>
        </motion.div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
          Configure Data Mapping <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
