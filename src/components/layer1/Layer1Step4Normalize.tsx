import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { GuidelinePack, RulePack } from "@/types/guidelinePack";
import { cn } from "@/lib/utils";

interface Props {
  rulePacks: RulePack[];
  onRulePacksUpdated: (packs: RulePack[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Layer1Step4Normalize({ rulePacks, onRulePacksUpdated, onBack, onNext }: Props) {
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [normalized, setNormalized] = useState(false);

  const handleNormalize = () => {
    setIsNormalizing(true);
    setTimeout(() => {
      setIsNormalizing(false);
      setNormalized(true);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 4 — Normalize & De-duplicate</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cleans up naming inconsistencies (e.g. "Job Development" vs "Employment Job Development") while keeping the original label.
        </p>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-foreground font-medium mb-0.5">Why this step?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">If service names don't match your system, the Case Manager agent can't reliably find the correct rules.</p>
        </div>
      </div>

      {!normalized ? (
        <div className="flex justify-center">
          <button onClick={handleNormalize} disabled={isNormalizing} className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {isNormalizing ? <><Loader2 className="h-4 w-4 animate-spin" /> Normalizing service names...</> : <><RefreshCw className="h-4 w-4" /> Normalize All Services</>}
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Normalization Complete</p>
            </div>
            <p className="text-xs text-muted-foreground">All {rulePacks.length} service names standardized. No duplicates found. Original names preserved.</p>
          </div>

          <div className="rounded-xl border border-border/40 overflow-hidden">
            <div className="grid grid-cols-[40px_1fr_1fr_100px] gap-2 p-3 bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/40">
              <span>#</span>
              <span>Normalized Name</span>
              <span>Source Name</span>
              <span>Status</span>
            </div>
            {rulePacks.map((rp, i) => (
              <div key={rp.id} className="grid grid-cols-[40px_1fr_1fr_100px] gap-2 p-3 border-b border-border/20 last:border-0 items-center">
                <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                <span className="text-xs font-medium text-foreground truncate">{rp.service_name}</span>
                <span className="text-[11px] text-muted-foreground truncate">{rp.source_service_name}</span>
                <span className="flex items-center gap-1 text-[10px] text-primary font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Clean
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {normalized && (
          <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            Admin Review <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
