import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ArrowRight, Database, CheckCircle2, FileText, Users, User } from "lucide-react";
import { RulePack } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Props {
  selectedRulePack: RulePack | null;
  onRulePackSelected: (rp: RulePack) => void;
  onNext: () => void;
}

// Mock individuals
const INDIVIDUALS = [
  { id: "ind-1", name: "James Williams", dob: "1992-03-15", waiver: "HCBS Waiver", status: "Active" },
  { id: "ind-2", name: "Maria Garcia", dob: "1988-07-22", waiver: "HCBS Waiver", status: "Active" },
  { id: "ind-3", name: "David Johnson", dob: "1995-11-08", waiver: "HCBS Waiver", status: "Active" },
  { id: "ind-4", name: "Sarah Thompson", dob: "1990-01-30", waiver: "HCBS Waiver", status: "Active" },
  { id: "ind-5", name: "Robert Davis", dob: "1985-09-12", waiver: "HCBS Waiver", status: "Active" },
];

// Published services from compliance engine
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
  const [selectedIndividual, setSelectedIndividual] = useState<string | null>(null);
  const [searchIndividual, setSearchIndividual] = useState("");
  const [searchService, setSearchService] = useState("");

  const filteredIndividuals = INDIVIDUALS.filter((ind) =>
    ind.name.toLowerCase().includes(searchIndividual.toLowerCase())
  );

  const filteredServices = PUBLISHED_RULE_PACKS.filter((rp) =>
    rp.service_name.toLowerCase().includes(searchService.toLowerCase())
  );

  const canProceed = selectedIndividual && selectedRulePack;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Select Individual & Service</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select the individual and the service you're working on. The agent loads the matching compliance engine and begins compliance checks.
        </p>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-xs text-foreground font-medium mb-0.5">Why this step?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Compliance is always person-specific and service-specific. The agent must know who the individual is and which service is being authorized before it can apply the correct rules from the compliance engine.
          </p>
        </div>
      </div>

      {/* 1. Select Individual */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" /> 1. Select Individual
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchIndividual}
            onChange={(e) => setSearchIndividual(e.target.value)}
            placeholder="Search individuals..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {filteredIndividuals.map((ind) => {
            const isSelected = selectedIndividual === ind.id;
            return (
              <motion.button
                key={ind.id}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedIndividual(ind.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                  isSelected ? "border-primary/40 bg-primary/5 shadow-md" : "border-border/40 bg-card hover:border-primary/20 hover:bg-muted/20"
                )}
              >
                <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0", isSelected ? "bg-primary/20" : "bg-muted/50")}>
                  <User className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{ind.name}</p>
                  <p className="text-[10px] text-muted-foreground">DOB: {ind.dob} · {ind.waiver}</p>
                </div>
                {isSelected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 2. Select Service */}
      {selectedIndividual && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" /> 2. Select Service
          </p>
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-primary/5 border border-primary/20">
            <Database className="h-4 w-4 text-primary ml-2 shrink-0" />
            <p className="text-xs text-primary font-medium">Reading from: <span className="font-bold">Compliance Engine</span> (published by admin)</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={searchService}
              onChange={(e) => setSearchService(e.target.value)}
              placeholder="Search services..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            {filteredServices.map((rp) => {
              const isSelected = selectedRulePack?.id === rp.id;
              return (
                <motion.button
                  key={rp.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onRulePackSelected(rp)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                    isSelected ? "border-primary/40 bg-primary/5 shadow-md" : "border-border/40 bg-card hover:border-primary/20 hover:bg-muted/20"
                  )}
                >
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", isSelected ? "bg-primary/20" : "bg-muted/50")}>
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
        </motion.div>
      )}

      {/* Proceed */}
      {canProceed && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
          <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
            Run Eligibility Check <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
