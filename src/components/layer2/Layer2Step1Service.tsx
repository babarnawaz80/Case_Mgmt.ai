import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ArrowRight, Database, CheckCircle2, FileText, Users, User, ChevronDown } from "lucide-react";
import { GuidelinePack, RulePack } from "@/types/guidelinePack";
import { cn } from "@/lib/utils";

interface Props {
  selectedRulePack: RulePack | null;
  onRulePackSelected: (rp: RulePack) => void;
  onNext: () => void;
}

const INDIVIDUALS = [
  { id: "ind-1", name: "James Williams", dob: "1992-03-15", waiver: "HCBS Waiver", status: "Active" },
  { id: "ind-2", name: "Maria Garcia", dob: "1988-07-22", waiver: "HCBS Waiver", status: "Active" },
  { id: "ind-3", name: "David Johnson", dob: "1995-11-08", waiver: "HCBS Waiver", status: "Active" },
  { id: "ind-4", name: "Sarah Thompson", dob: "1990-01-30", waiver: "HCBS Waiver", status: "Active" },
  { id: "ind-5", name: "Robert Davis", dob: "1985-09-12", waiver: "HCBS Waiver", status: "Active" },
];

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

function SearchableDropdown<T extends { id: string }>({
  label,
  icon: Icon,
  placeholder,
  items,
  selectedId,
  onSelect,
  renderItem,
  renderSelected,
  searchFilter,
}: {
  label: string;
  icon: React.ElementType;
  placeholder: string;
  items: T[];
  selectedId: string | null;
  onSelect: (item: T) => void;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  renderSelected: (item: T) => React.ReactNode;
  searchFilter: (item: T, query: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = items.filter((item) => searchFilter(item, query));
  const selectedItem = items.find((i) => i.id === selectedId);

  return (
    <div className="flex-1 min-w-0" ref={ref}>
      <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}
      </p>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-left transition-all text-sm",
            selectedItem
              ? "border-primary/40 bg-primary/5"
              : "border-border bg-card hover:border-primary/20"
          )}
        >
          {selectedItem ? renderSelected(selectedItem) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl bg-popover border border-border shadow-xl max-h-72 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted/50 border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">No results found</p>
              ) : (
                filtered.map((item) => {
                  const isSelected = item.id === selectedId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { onSelect(item); setOpen(false); setQuery(""); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                      )}
                    >
                      {renderItem(item, isSelected)}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Layer2Step1Service({ selectedRulePack, onRulePackSelected, onNext }: Props) {
  const [selectedIndividual, setSelectedIndividual] = useState<string | null>(null);

  const canProceed = selectedIndividual && selectedRulePack;

  const selectedPerson = INDIVIDUALS.find((i) => i.id === selectedIndividual);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Select Individual & Service</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select the individual and the service you're working on. The agent loads the matching compliance engine and begins compliance checks.
        </p>
      </div>

      {/* Two dropdowns side by side */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchableDropdown
          label="Individual"
          icon={Users}
          placeholder="Select an individual..."
          items={INDIVIDUALS}
          selectedId={selectedIndividual}
          onSelect={(ind) => setSelectedIndividual(ind.id)}
          searchFilter={(ind, q) => ind.name.toLowerCase().includes(q.toLowerCase())}
          renderSelected={(ind) => (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{ind.name}</p>
                <p className="text-[10px] text-muted-foreground">DOB: {ind.dob}</p>
              </div>
            </div>
          )}
          renderItem={(ind, isSelected) => (
            <>
              <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0", isSelected ? "bg-primary/20" : "bg-muted/50")}>
                <User className={cn("h-3.5 w-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{ind.name}</p>
                <p className="text-[10px] text-muted-foreground">DOB: {ind.dob} · {ind.waiver}</p>
              </div>
              {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
            </>
          )}
        />

        <SearchableDropdown
          label="Service"
          icon={FileText}
          placeholder="Select a service..."
          items={PUBLISHED_RULE_PACKS}
          selectedId={selectedRulePack?.id || null}
          onSelect={onRulePackSelected}
          searchFilter={(rp, q) => rp.service_name.toLowerCase().includes(q.toLowerCase())}
          renderSelected={(rp) => (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <FileText className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{rp.service_name}</p>
                <p className="text-[10px] text-muted-foreground">{rp.billing_unit} · {rp.service_category}</p>
              </div>
            </div>
          )}
          renderItem={(rp, isSelected) => (
            <>
              <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", isSelected ? "bg-primary/20" : "bg-muted/50")}>
                <FileText className={cn("h-3.5 w-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{rp.service_name}</p>
                <p className="text-[10px] text-muted-foreground">{rp.billing_unit} · {rp.service_category}</p>
              </div>
              {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
            </>
          )}
        />
      </div>

      {/* Selection summary */}
      {canProceed && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20">
            <Database className="h-4 w-4 text-primary ml-1 shrink-0" />
            <p className="text-xs text-primary font-medium">
              Loading compliance engine for <span className="font-bold">{selectedRulePack.service_name}</span> · Individual: <span className="font-bold">{selectedPerson?.name}</span>
            </p>
          </div>
          <div className="flex justify-end">
            <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
              Run Eligibility Check <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
