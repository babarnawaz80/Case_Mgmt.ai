import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, CheckCircle2, Rocket, Shield, ToggleLeft, ToggleRight,
  Database, FileText,
} from "lucide-react";
import { RulePack, ExtractionSummary } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Props {
  rulePacks: RulePack[];
  extractionSummary: ExtractionSummary | null;
  onBack: () => void;
  onPublish: () => void;
}

export function Layer1Step6Publish({ rulePacks, extractionSummary, onBack, onPublish }: Props) {
  const [publishToggle, setPublishToggle] = useState(false);
  const [published, setPublished] = useState(false);

  const handlePublish = () => {
    setPublished(true);
    setTimeout(onPublish, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 6 — Publish Rule Packs</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Marks the rule packs as "approved" so case managers can use them.
        </p>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-foreground font-medium mb-0.5">Why this step?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">Your compliance rules should never change without oversight — this protects you legally and operationally. Admin gets final say.</p>
        </div>
      </div>

      {/* Summary card */}
      <div className="p-5 rounded-xl border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3 mb-3">
          <Database className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Rule Pack Extraction Summary</h3>
            <p className="text-[11px] text-muted-foreground">StateGuidelineRulePacks collection</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-card border border-border/40">
            <p className="text-xl font-display font-bold text-foreground">{rulePacks.length}</p>
            <p className="text-[10px] text-muted-foreground">Rule Packs</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-card border border-border/40">
            <p className="text-xl font-display font-bold text-primary">
              {extractionSummary?.publishReady ? "Yes" : "No"}
            </p>
            <p className="text-[10px] text-muted-foreground">Publish Ready</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-card border border-border/40">
            <p className="text-xl font-display font-bold text-foreground">{extractionSummary?.unclearSections.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Flagged Items</p>
          </div>
        </div>
      </div>

      {/* List of services to publish */}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        <div className="p-3 bg-muted/30 border-b border-border/40">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Services to Publish</p>
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {rulePacks.map((rp, i) => (
            <div key={rp.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/20 last:border-0">
              <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className="text-xs font-medium text-foreground flex-1 truncate">{rp.service_name}</p>
              <span className="text-[10px] text-muted-foreground">{rp.billing_unit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Publish toggle */}
      {!published && (
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-foreground">Publish Rule Packs</p>
                <p className="text-xs text-muted-foreground">Enable toggle to confirm, then click Publish.</p>
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
            <CheckCircle2 className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">{rulePacks.length} Rule Packs Published</p>
              <p className="text-xs text-muted-foreground">Available to all Case Manager Compliance Agents.</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {publishToggle && !published && (
          <button onClick={handlePublish} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            <Rocket className="h-4 w-4" /> Publish {rulePacks.length} Rule Packs
          </button>
        )}
      </div>
    </div>
  );
}
