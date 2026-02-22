import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Sparkles, ArrowLeft, ArrowRight, FileText, CheckCircle2 } from "lucide-react";
import { RulePack } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Props {
  rulePacks: RulePack[];
  onRulePacksGenerated: (packs: RulePack[]) => void;
  onBack: () => void;
  onNext: () => void;
}

const MOCK_SERVICES = [
  "Personal Care Services (PCS)", "Day Habilitation", "Respite Care",
  "Supported Employment – Individual", "Supported Employment – Group",
  "Community Living Supports", "Behavioral Support Services",
  "Environmental Modifications", "Assistive Technology",
  "Specialized Medical Equipment", "Transportation", "Fiscal Management Services",
];

export function Layer1Step2Extract({ rulePacks, onRulePacksGenerated, onBack, onNext }: Props) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedNames, setExtractedNames] = useState<string[]>([]);

  const handleExtract = () => {
    setIsExtracting(true);
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= MOCK_SERVICES.length) {
        clearInterval(interval);
        setIsExtracting(false);
        // Generate minimal rule packs
        const packs: RulePack[] = MOCK_SERVICES.map((name, i) => ({
          id: `rp-${i + 1}`,
          guideline_version_date: "2026-01-15",
          state: "Example State",
          program_waiver_type: "Home & Community-Based Services",
          service_name: name,
          source_service_name: name,
          service_category: i < 3 ? "Support" as const : i < 6 ? "Meaningful Day" as const : "Other" as const,
          billing_unit: i % 3 === 0 ? "15 min" as const : i % 3 === 1 ? "hourly" as const : "daily" as const,
          service_description: `State-defined ${name} under HCBS waiver program.`,
          eligibility_rules: [{ rule_type: "age", rule_text: "Participant must be enrolled in HCBS waiver" }],
          authorization_requirements: [{ rule_type: "prior_auth", rule_text: "Prior authorization required" }],
          pcp_requirements: [{ rule_type: "justification", rule_text: "Service must be justified in PCP" }],
          prerequisite_requirements: [{ rule_type: "assessment", rule_text: "Current Level of Care assessment required" }],
          limits: [{ type: "daily" as const, rule_text: `Daily cap applies per state guideline`, value: 8, unit: "hours" }],
          conflicts: [{ type: "same_time" as const, conflicting_service: "N/A", rule_text: "Cannot bill concurrently with overlapping services" }],
          documentation_requirements: [{ rule_type: "note", rule_text: "Billable activity note required per unit" }],
          self_directed_differences: [],
          monitoring_rules: [{ rule_type: "quarterly", rule_text: "Quarterly review required" }],
          hard_stops: [{ rule_type: "cap", rule_text: "Cannot exceed authorized cap" }],
          warnings: [{ rule_type: "threshold", rule_text: "Warning at 80% cap utilization" }],
          citations: [{ page: `p.${10 + i}`, section: `§${3 + i}.1`, text: `See guideline section ${3 + i}.1` }],
          published: false,
          created_by: "Admin",
          created_at: new Date().toISOString(),
        }));
        onRulePacksGenerated(packs);
        return;
      }
      setExtractedNames((prev) => [...prev, MOCK_SERVICES[idx]]);
      idx++;
    }, 300);
  };

  const displayList = extractedNames.length > 0 ? extractedNames : rulePacks.map((rp) => rp.service_name);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 2 — Extract Services</h2>
        <p className="text-sm text-muted-foreground mt-1">Finds every service described in the guideline (one by one) and lists them.</p>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-foreground font-medium mb-0.5">Why this step?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">The guideline is organized by service. If we miss a service, we miss rules — and that creates billing denials or audit risk.</p>
        </div>
      </div>

      {displayList.length === 0 && (
        <div className="flex justify-center">
          <button onClick={handleExtract} disabled={isExtracting} className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {isExtracting ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning guideline PDF...</> : <><Sparkles className="h-4 w-4" /> Extract All Services</>}
          </button>
        </div>
      )}

      {displayList.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{displayList.length} Services Found</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {displayList.map((name, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/40"
              >
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{i + 1}</div>
                <p className="text-xs font-medium text-foreground truncate">{name}</p>
                <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto shrink-0" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {rulePacks.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            Build Compliance Engine <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
