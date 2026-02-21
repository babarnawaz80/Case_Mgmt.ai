import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ArrowRight, Database, CheckCircle2, FileText } from "lucide-react";
import { RulePack } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Props {
  selectedRulePack: RulePack | null;
  onRulePackSelected: (rp: RulePack) => void;
  onNext: () => void;
}

// Published rule packs from Layer 1
const PUBLISHED_RULE_PACKS: RulePack[] = [
  "Personal Care Services (PCS)", "Day Habilitation", "Respite Care",
  "Supported Employment – Individual", "Supported Employment – Group",
  "Community Living Supports", "Behavioral Support Services",
].map((name, i) => ({
  id: `rp-${i + 1}`,
  guideline_version_date: "2026-01-15",
  state: "Example State",
  program_waiver_type: "HCBS Waiver",
  service_name: name,
  source_service_name: name,
  service_category: i < 3 ? "Support" as const : "Meaningful Day" as const,
  billing_unit: i % 2 === 0 ? "15 min" as const : "hourly" as const,
  service_description: `State-defined ${name} under HCBS waiver.`,
  eligibility_rules: [
    { rule_type: "waiver", rule_text: "Active HCBS waiver enrollment required" },
    { rule_type: "assessment", rule_text: "Current Level of Care assessment on file" },
  ],
  authorization_requirements: [{ rule_type: "prior_auth", rule_text: "Prior authorization required from MCO" }],
  pcp_requirements: [
    { rule_type: "justification", rule_text: "Service must be justified in Person-Centered Plan" },
    { rule_type: "employment", rule_text: "Employment interest language must be documented" },
    { rule_type: "goals", rule_text: "SMART goals required for service" },
  ],
  prerequisite_requirements: [{ rule_type: "funding", rule_text: "Prerequisite funding exploration completed" }],
  limits: [
    { type: "daily" as const, rule_text: "Maximum 8 hours per day", value: 8, unit: "hours" },
    { type: "weekly" as const, rule_text: "Maximum 40 hours per week", value: 40, unit: "hours" },
    { type: "plan_year" as const, rule_text: "Maximum 1,560 hours per plan year", value: 1560, unit: "hours" },
  ],
  conflicts: [
    { type: "same_time" as const, conflicting_service: "Day Habilitation", rule_text: "Cannot bill PCS and Day Hab concurrently" },
  ],
  documentation_requirements: [
    { rule_type: "ban", rule_text: "Billable Activity Note required per billing unit" },
    { rule_type: "progress", rule_text: "Monthly progress note required" },
    { rule_type: "monitoring", rule_text: "Quarterly monitoring form required" },
  ],
  self_directed_differences: [],
  monitoring_rules: [{ rule_type: "quarterly", rule_text: "Quarterly milestone review required" }],
  hard_stops: [
    { rule_type: "cap", rule_text: "Cannot exceed daily/weekly/plan-year cap" },
    { rule_type: "concurrent", rule_text: "Cannot bill concurrently with conflicting services" },
  ],
  warnings: [{ rule_type: "threshold", rule_text: "Warning at 80% cap utilization" }],
  citations: [{ page: `p.${10 + i}`, section: `§${3 + i}.1`, text: `State guideline section ${3 + i}.1` }],
  published: true,
  created_by: "Admin",
  created_at: "2026-02-20T10:00:00Z",
}));

export function Layer2Step1Service({ selectedRulePack, onRulePackSelected, onNext }: Props) {
  const [search, setSearch] = useState("");

  const filtered = PUBLISHED_RULE_PACKS.filter((rp) =>
    rp.service_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 1 — Identify Service & Context</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select a service from the published Rule Pack library. The matching rule pack will be loaded with all compliance rules.
        </p>
      </div>

      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-primary/5 border border-primary/20">
        <Database className="h-4 w-4 text-primary ml-2 shrink-0" />
        <p className="text-xs text-primary font-medium">Reading from: <span className="font-bold">StateGuidelineRulePacks</span> (published by admin)</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search services..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((rp) => {
          const isSelected = selectedRulePack?.id === rp.id;
          return (
            <motion.button
              key={rp.id}
              whileTap={{ scale: 0.99 }}
              onClick={() => onRulePackSelected(rp)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
                isSelected ? "border-primary/40 bg-primary/5 shadow-md" : "border-border/40 bg-card hover:border-primary/20 hover:bg-muted/20"
              )}
            >
              <div className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                isSelected ? "bg-primary/20" : "bg-muted/50"
              )}>
                <FileText className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{rp.service_name}</p>
                <p className="text-[10px] text-muted-foreground">{rp.billing_unit} · {rp.service_category} · {rp.limits.length} limits · {rp.hard_stops.length} hard stops</p>
              </div>
              {isSelected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
            </motion.button>
          );
        })}
      </div>

      {selectedRulePack && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
          <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            Run Eligibility Check <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
