import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Database, CheckCircle2,
  FileText, Calendar, Users, Shield, ClipboardList,
  BarChart3, Eye, Folder, ToggleLeft, ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleConfig {
  id: string;
  name: string;
  icon: typeof FileText;
  description: string;
  enabled: boolean;
  fields: string[];
}

interface Props {
  moduleConfigs: ModuleConfig[];
  onConfigsChange: (configs: ModuleConfig[]) => void;
  onBack: () => void;
  onNext: () => void;
}

const DEFAULT_MODULES: ModuleConfig[] = [
  { id: "pcp", name: "PCP", icon: FileText, description: "Push PCP addendum drafts and missing requirement flags", enabled: true, fields: ["Addendum Draft", "Missing Requirements", "Service Justification"] },
  { id: "services", name: "Services", icon: ClipboardList, description: "Push service authorization records and billing configs", enabled: true, fields: ["Authorization Record", "Billing Unit", "Approved Units", "Compliance Status"] },
  { id: "service_plan", name: "Service Plan", icon: FileText, description: "Push service plan details and goals", enabled: true, fields: ["Plan Goals", "Objectives", "Frequency"] },
  { id: "ban", name: "Billable Activity Note", icon: FileText, description: "Push billing-safe note templates with required fields", enabled: true, fields: ["Note Template", "Required Fields", "Goal Tie-in"] },
  { id: "progress_note", name: "Progress Note", icon: FileText, description: "Push monthly progress note templates", enabled: true, fields: ["Monthly Template", "Minimum Contact Rules", "Progress Metrics"] },
  { id: "monitoring", name: "Monitoring Form", icon: Eye, description: "Push quarterly review schedules and milestone tracking", enabled: true, fields: ["Review Schedule", "Cap Alerts", "Milestone Tracking"] },
  { id: "assessment", name: "Comprehensive Assessment", icon: Shield, description: "Push assessment templates with required sections", enabled: true, fields: ["Assessment Template", "Required Sections"] },
  { id: "workflow", name: "Workflow Manager", icon: BarChart3, description: "Push compliance tasks, renewal reminders, reauth dates", enabled: true, fields: ["PCP Update Task", "Renewal Task", "Reauth Due Date"] },
  { id: "managed_docs", name: "Managed Documents", icon: Folder, description: "Push document checklists (Resume, Employment Plan, etc.)", enabled: true, fields: ["Document Checklist", "Required Uploads"] },
  { id: "attendance", name: "Attendance", icon: Calendar, description: "Push attendance-billing validation rules", enabled: false, fields: ["Attendance Validation", "Missing Attendance Warnings"] },
];

export function Layer1Step3DataMapping({ moduleConfigs, onConfigsChange, onBack, onNext }: Props) {
  const configs = moduleConfigs.length > 0 ? moduleConfigs : DEFAULT_MODULES;

  const toggleModule = (id: string) => {
    const updated = configs.map((m) => m.id === id ? { ...m, enabled: !m.enabled } : m);
    onConfigsChange(updated);
  };

  const enabledCount = configs.filter((m) => m.enabled).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">Step 3 — Default Data Mapping</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Set <span className="font-medium text-foreground">engine-level defaults</span> for how outputs push into iCareManager modules. Runtime agents may override these per-agent.
        </p>
        <div className="mt-2 p-3 rounded-xl bg-destructive/5 border border-destructive/15">
          <p className="text-xs text-destructive font-medium mb-0.5">⚠️ Critical Step — Org-Wide Defaults</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            These mappings define the default behavior for all agents using this engine. Individual agents can override mappings later. Without data mapping, agents can only give advice. With it, compliance outputs flow directly into iCM modules.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20">
        <Database className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs text-primary font-medium">
          <span className="font-bold">{enabledCount}</span> of {configs.length} modules enabled for output mapping
        </p>
      </div>

      <div className="space-y-2">
        {configs.map((mod, i) => {
          const Icon = mod.icon;
          return (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                "p-3 rounded-xl border transition-all",
                mod.enabled ? "border-primary/20 bg-primary/5" : "border-border/40 bg-card opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                  mod.enabled ? "bg-primary/15" : "bg-muted/50"
                )}>
                  <Icon className={cn("h-4 w-4", mod.enabled ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{mod.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{mod.description}</p>
                  {mod.enabled && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {mod.fields.map((field) => (
                        <span key={field} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{field}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => toggleModule(mod.id)} className="shrink-0">
                  {mod.enabled ? (
                    <ToggleRight className="h-7 w-7 text-primary" />
                  ) : (
                    <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all">
          Review & Publish <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
