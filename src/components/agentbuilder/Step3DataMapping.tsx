import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Briefcase,
  ClipboardList,
  Activity,
  Users,
  FolderOpen,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  Ban,
  Clock,
  MapPin,
  Target,
  Lock,
  Eye,
  Calendar,
  UserCheck,
} from "lucide-react";
import { RulePack } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Step3Props {
  rulePacks: RulePack[];
  onBack: () => void;
  onNext: () => void;
}

interface ModuleMapping {
  id: string;
  name: string;
  icon: typeof FileText;
  color: string;
  pushItems: { label: string; description: string; status: "mapped" | "pending" }[];
  enforcements?: { label: string; rule: string }[];
  expanded: boolean;
}

const initialModules: ModuleMapping[] = [
  {
    id: "pcp",
    name: "PCP Module",
    icon: FileText,
    color: "from-[hsl(200,65%,52%)] to-[hsl(210,55%,62%)]",
    pushItems: [
      { label: "Generated addendum text", description: "Auto-generated PCP addendum for missing justifications and language", status: "pending" },
      { label: "Missing justification alerts", description: "Alerts pushed when service justification narrative is absent", status: "pending" },
      { label: "Required goal updates", description: "SMART goal modifications and new goals based on rule pack requirements", status: "pending" },
    ],
    expanded: false,
  },
  {
    id: "services",
    name: "Services Module",
    icon: Briefcase,
    color: "from-[hsl(160,45%,48%)] to-[hsl(160,40%,58%)]",
    pushItems: [
      { label: "Service name", description: "Mapped from rule pack service_name field", status: "pending" },
      { label: "Billing unit", description: "15-min increments, hourly, or daily as defined", status: "pending" },
      { label: "Frequency", description: "Service delivery frequency from limits configuration", status: "pending" },
      { label: "Caps", description: "Daily, weekly, and plan-year caps from Limits Engine", status: "pending" },
      { label: "Authorization status", description: "Current authorization state synced from workflow", status: "pending" },
    ],
    expanded: false,
  },
  {
    id: "billable_note",
    name: "Billable Activity Note Module",
    icon: ClipboardList,
    color: "from-[hsl(30,70%,55%)] to-[hsl(30,60%,65%)]",
    pushItems: [],
    enforcements: [
      { label: "Start time", rule: "Required — block save if empty" },
      { label: "Stop time", rule: "Required — block save if empty" },
      { label: "Location", rule: "Required — must match approved service locations" },
      { label: "Direct vs indirect time", rule: "Required — must be categorized for billing accuracy" },
      { label: "Goal tie-in", rule: "Required — each note must reference at least one PCP goal" },
    ],
    expanded: false,
  },
  {
    id: "assessment",
    name: "Comprehensive Assessment Module",
    icon: Activity,
    color: "from-[hsl(270,50%,58%)] to-[hsl(270,45%,68%)]",
    pushItems: [
      { label: "Behavioral assessment templates", description: "Pre-built templates with antecedent, behavior, consequence fields", status: "pending" },
      { label: "Required observation checklist", description: "Observation items mandated by state guidelines", status: "pending" },
      { label: "Environmental/communication components", description: "Environmental factors and communication needs sections", status: "pending" },
    ],
    expanded: false,
  },
  {
    id: "monitoring",
    name: "Monitoring Form",
    icon: Eye,
    color: "from-[hsl(190,55%,48%)] to-[hsl(190,50%,58%)]",
    pushItems: [
      { label: "Monthly check requirement", description: "Auto-scheduled monthly compliance verification form", status: "pending" },
      { label: "Milestone tracking", description: "Milestone deliverable tracking with target dates", status: "pending" },
      { label: "Cap tracking alerts", description: "Automated alerts when approaching service utilization caps", status: "pending" },
    ],
    expanded: false,
  },
  {
    id: "workflow",
    name: "Workflow Manager",
    icon: ShieldCheck,
    color: "from-[hsl(350,55%,58%)] to-[hsl(350,50%,68%)]",
    pushItems: [
      { label: "Missing PCP language", description: "Auto-create task when required PCP sections are absent", status: "pending" },
      { label: "Missing funding exploration", description: "Task for documenting prerequisite funding review", status: "pending" },
      { label: "Reauthorization due", description: "Task triggered 30 days before authorization expiry", status: "pending" },
      { label: "Milestone incomplete", description: "Task when milestone deliverable is past due", status: "pending" },
      { label: "Conflict detected", description: "Task for resolving service scheduling conflicts", status: "pending" },
    ],
    expanded: false,
  },
  {
    id: "managed_docs",
    name: "Managed Documents",
    icon: FolderOpen,
    color: "from-[hsl(40,60%,50%)] to-[hsl(40,50%,60%)]",
    pushItems: [
      { label: "Resume", description: "Required for employment-focused services", status: "pending" },
      { label: "Employment plan", description: "Vocational goals and job matching documentation", status: "pending" },
      { label: "Assessment report", description: "Functional and behavioral assessment reports", status: "pending" },
      { label: "Observational summaries", description: "Staff observation documentation", status: "pending" },
      { label: "Attendance", description: "Cross-checked with billing unit before claim-ready status", status: "pending" },
    ],
    expanded: false,
  },
  {
    id: "care_tracker",
    name: "Care Tracker",
    icon: Users,
    color: "from-[hsl(220,55%,55%)] to-[hsl(220,50%,65%)]",
    pushItems: [
      { label: "Staffing ratios", description: "Push required staffing ratios if mandated by service rule pack", status: "pending" },
    ],
    expanded: false,
  },
];

export function Step3DataMapping({ rulePacks, onBack, onNext }: Step3Props) {
  const [modules, setModules] = useState<ModuleMapping[]>(initialModules);
  const [isMapping, setIsMapping] = useState(false);
  const [mapped, setMapped] = useState(false);

  const toggleExpand = (id: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, expanded: !m.expanded } : m))
    );
  };

  const handleAutoMap = () => {
    setIsMapping(true);
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= modules.length) {
        clearInterval(interval);
        setIsMapping(false);
        setMapped(true);
        // Expand all
        setModules((prev) => prev.map((m) => ({ ...m, expanded: true })));
        return;
      }
      setModules((prev) =>
        prev.map((m, i) =>
          i === idx
            ? {
                ...m,
                expanded: true,
                pushItems: m.pushItems.map((p) => ({ ...p, status: "mapped" as const })),
              }
            : m
        )
      );
      idx++;
    }, 500);
  };

  const totalItems = modules.reduce((sum, m) => sum + m.pushItems.length + (m.enforcements?.length || 0), 0);
  const mappedItems = modules.reduce(
    (sum, m) => sum + m.pushItems.filter((p) => p.status === "mapped").length + (mapped && m.enforcements ? m.enforcements.length : 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">
          Step 3 — Data Mapping Configuration
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Automatically maps rule pack categories to iCareManager modules. Each module receives push data, enforcements, and compliance tasks from the extracted guidelines.
        </p>
      </div>

      {/* Source rule packs */}
      <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Mapping from {rulePacks.length} Rule Packs → {modules.length} iCM Modules
        </p>
        <div className="flex flex-wrap gap-2">
          {rulePacks.map((rp) => (
            <span key={rp.id} className="px-3 py-1.5 rounded-lg bg-card border border-border/60 text-xs font-medium text-foreground">
              {rp.service_name}
            </span>
          ))}
        </div>
      </div>

      {/* Auto-map button */}
      {!mapped && (
        <div className="flex justify-center">
          <button
            onClick={handleAutoMap}
            disabled={isMapping}
            className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60"
          >
            {isMapping ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Mapping to iCM modules...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Auto-Map to iCM Modules</>
            )}
          </button>
        </div>
      )}

      {/* Progress */}
      {(isMapping || mapped) && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full gradient-primary"
              animate={{ width: `${(mappedItems / totalItems) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {mappedItems}/{totalItems} mapped
          </span>
        </div>
      )}

      {/* Module cards */}
      <div className="space-y-3">
        {modules.map((mod, i) => {
          const Icon = mod.icon;
          const hasMappedItems = mod.pushItems.some((p) => p.status === "mapped") || (mapped && mod.enforcements);
          return (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border/60 bg-card overflow-hidden"
            >
              {/* Module header */}
              <button
                onClick={() => toggleExpand(mod.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors text-left"
              >
                <div className={cn("h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0", mod.color)}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground">{mod.name}</h4>
                  <p className="text-[11px] text-muted-foreground">
                    {mod.pushItems.length} push items
                    {mod.enforcements && ` · ${mod.enforcements.length} enforcements`}
                  </p>
                </div>
                {hasMappedItems && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Mapped
                  </span>
                )}
                {mod.expanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Expanded content */}
              <AnimatePresence>
                {mod.expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {/* Push items */}
                      {mod.pushItems.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Push Data
                          </p>
                          <div className="space-y-1.5">
                            {mod.pushItems.map((item, j) => (
                              <div
                                key={j}
                                className={cn(
                                  "flex items-start gap-2.5 p-2.5 rounded-lg border transition-all",
                                  item.status === "mapped"
                                    ? "bg-primary/5 border-primary/20"
                                    : "bg-muted/20 border-border/40"
                                )}
                              >
                                {item.status === "mapped" ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                ) : (
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                                  <p className="text-[10px] text-muted-foreground">{item.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Enforcements */}
                      {mod.enforcements && mod.enforcements.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Lock className="h-3 w-3" /> Enforcements
                          </p>
                          <div className="space-y-1.5">
                            {mod.enforcements.map((enf, j) => (
                              <div
                                key={j}
                                className={cn(
                                  "flex items-start gap-2.5 p-2.5 rounded-lg border",
                                  mapped ? "bg-destructive/5 border-destructive/20" : "bg-muted/20 border-border/40"
                                )}
                              >
                                {mapped ? (
                                  <Ban className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                                ) : (
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-foreground">{enf.label}</p>
                                  <p className="text-[10px] text-muted-foreground">{enf.rule}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Special note for managed docs */}
                      {mod.id === "managed_docs" && mapped && (
                        <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                          <p className="text-[11px] text-warning font-medium flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3" />
                            Attendance cross-check enabled
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Attendance records will be cross-checked with billing units before allowing claim-ready status.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Navigation */}
      {mapped && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between pt-4"
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all"
          >
            Continue to PCP Validation <span className="text-lg">→</span>
          </button>
        </motion.div>
      )}
    </div>
  );
}
