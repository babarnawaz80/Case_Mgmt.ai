import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Zap,
  ShieldCheck,
  ClipboardList,
  AlertTriangle,
  Play,
  ArrowLeft,
} from "lucide-react";
import { RulePack, WorkflowNode } from "@/types/rulePack";
import { cn } from "@/lib/utils";

interface Step2Props {
  rulePacks: RulePack[];
  workflowNodes: WorkflowNode[];
  onWorkflowGenerated: (nodes: WorkflowNode[]) => void;
  onBack: () => void;
  onFinish: () => void;
}

function generateWorkflowFromRulePacks(rulePacks: RulePack[]): WorkflowNode[] {
  return [
    {
      id: "wf-1",
      step: 1,
      name: "Service Intake",
      type: "intake",
      description:
        "Triggered when case manager selects a service. Identifies service type, loads corresponding rule pack, and pulls participant profile data.",
      triggers: [
        "Case manager selects service from service catalog",
        "New authorization request initiated",
      ],
      actions: [
        "Identify selected service from rule pack library",
        "Load corresponding rule pack configuration",
        "Pull participant profile data (demographics, waiver, assessments)",
        "Initialize compliance tracking record",
      ],
      validations: [
        "Service exists in rule pack library",
        "Participant has active enrollment",
        "Case manager has authorization role",
      ],
      output: [
        "Service rule pack loaded",
        "Participant profile retrieved",
        "Compliance workflow instance created",
      ],
      status: "complete",
    },
    {
      id: "wf-2",
      step: 2,
      name: "Eligibility Check",
      type: "eligibility",
      description:
        "Validates participant eligibility against rule pack criteria. Auto-creates tasks for any unmet requirements.",
      triggers: [
        "Service Intake step completed successfully",
        "Re-validation requested by case manager",
      ],
      actions: [
        "Check age requirements against DOB",
        "Verify school enrollment status if applicable",
        "Confirm waiver enrollment and type",
        "Apply EPSDT rule if participant under 21",
        "Check prerequisite funding exploration status",
        "Validate Level of Care assessment currency",
      ],
      validations: [
        ...rulePacks.flatMap((rp) =>
          rp.eligibility_rules.map((rule) => `✓ ${rule}`)
        ),
      ],
      output: [
        "Eligibility: PASS or FAIL with specific criteria results",
        "Auto-created tasks for any unmet eligibility criteria",
        "Prerequisite gap analysis report",
        "Recommended next steps for case manager",
      ],
      status: "active",
    },
    {
      id: "wf-3",
      step: 3,
      name: "PCP Validation",
      type: "pcp_validation",
      description:
        "Validates Person-Centered Plan for required justifications, employment language, behavioral triggers, SMART goals, and team certification.",
      triggers: [
        "Eligibility Check passed",
        "PCP document updated",
      ],
      actions: [
        "Scan PCP for service justification narrative",
        "Check employment interest language presence",
        "Validate behavioral trigger documentation",
        "Verify SMART goal formatting and completeness",
        "Confirm team certification currency",
      ],
      validations: [
        "Service justification present",
        "Employment interest documented",
        "Behavioral triggers identified",
        "All goals are SMART-formatted",
        "Team certifications current",
      ],
      output: [
        "PCP Compliance: PASS or FAIL per category",
        "Auto-generated PCP addendum for missing items",
        "Tasks created in Workflow Manager",
      ],
      status: "pending",
    },
    {
      id: "wf-4",
      step: 4,
      name: "Limit & Conflict Engine",
      type: "limits",
      description:
        "Calculates service caps, checks for scheduling conflicts, and enforces billing rules across all authorized services.",
      triggers: [
        "PCP Validation completed",
        "Service schedule modified",
      ],
      actions: [
        "Calculate daily/weekly/plan-year caps",
        "Cross-check against existing authorized services",
        "Validate attendance against billing units",
        "Check for concurrent billing conflicts",
      ],
      validations: [
        "Within daily service cap",
        "Within weekly service cap",
        "No concurrent billing violations",
        "No schedule overlaps detected",
      ],
      output: [
        "Cap utilization report",
        "Hard stops for violations",
        "Warnings for approaching limits",
        "Conflict resolution suggestions",
      ],
      status: "pending",
    },
    {
      id: "wf-5",
      step: 5,
      name: "Documentation Generation",
      type: "documentation",
      description:
        "Auto-generates all required documentation templates based on service type and state guidelines.",
      triggers: [
        "Limit & Conflict Engine passed",
        "Case manager requests documentation",
      ],
      actions: [
        "Generate billable activity note template",
        "Create progress note structure",
        "Build behavioral assessment form",
        "Prepare employment plan template",
        "Configure monitoring form",
      ],
      validations: [
        "All required fields included",
        "Templates match state guidelines",
        "Goal tie-ins configured",
      ],
      output: [
        "Complete documentation package",
        "Templates pushed to respective modules",
        "Missing document checklist",
      ],
      status: "pending",
    },
    {
      id: "wf-6",
      step: 6,
      name: "Authorization Output",
      type: "authorization",
      description:
        "Generates final authorization recommendation with compliance score, risk assessment, and actionable task list.",
      triggers: [
        "All prior steps completed",
        "Case manager requests authorization summary",
      ],
      actions: [
        "Calculate compliance score",
        "Assess risk level",
        "Compile missing documentation",
        "Generate task assignments",
        "Prepare authorization recommendation",
      ],
      validations: [
        "All hard stops resolved",
        "Required documentation complete",
        "PCP validation passed",
      ],
      output: [
        "Authorization recommendation summary",
        "Compliance score with breakdown",
        "Risk score with flagged items",
        "Prioritized task list",
      ],
      status: "pending",
    },
  ];
}

const nodeIcons: Record<string, typeof Zap> = {
  intake: ClipboardList,
  eligibility: ShieldCheck,
  pcp_validation: ClipboardList,
  limits: AlertTriangle,
  documentation: ClipboardList,
  authorization: Zap,
  monitoring: AlertTriangle,
};

const nodeColors: Record<string, string> = {
  intake: "from-[hsl(200,65%,52%)] to-[hsl(210,55%,62%)]",
  eligibility: "from-[hsl(160,45%,48%)] to-[hsl(160,40%,58%)]",
  pcp_validation: "from-[hsl(270,50%,58%)] to-[hsl(270,45%,68%)]",
  limits: "from-[hsl(30,70%,55%)] to-[hsl(30,60%,65%)]",
  documentation: "from-[hsl(190,55%,48%)] to-[hsl(190,50%,58%)]",
  authorization: "from-[hsl(350,55%,58%)] to-[hsl(350,50%,68%)]",
  monitoring: "from-[hsl(40,60%,50%)] to-[hsl(40,50%,60%)]",
};

export function Step2WorkflowGenerator({
  rulePacks,
  workflowNodes,
  onWorkflowGenerated,
  onBack,
  onFinish,
}: Step2Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    const interval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 400);

    setTimeout(() => {
      clearInterval(interval);
      setGenerationProgress(100);
      const nodes = generateWorkflowFromRulePacks(rulePacks);
      onWorkflowGenerated(nodes);
      setIsGenerating(false);
    }, 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-display font-bold text-foreground">
          Step 2 — Auto Workflow Generator
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          The AI converts your rule packs into executable workflow nodes with
          intake triggers, eligibility validation, and task auto-creation.
        </p>
      </div>

      {/* Rule pack summary */}
      <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Source Rule Packs ({rulePacks.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {rulePacks.map((rp) => (
            <span
              key={rp.id}
              className="px-3 py-1.5 rounded-lg bg-card border border-border/60 text-xs font-medium text-foreground"
            >
              {rp.service_name}
            </span>
          ))}
        </div>
      </div>

      {/* Generate button */}
      {workflowNodes.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4"
        >
          {isGenerating && (
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Generating workflow nodes...</span>
                <span>{Math.min(100, Math.round(generationProgress))}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full gradient-primary"
                  style={{ width: `${Math.min(100, generationProgress)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="mt-3 space-y-1.5">
                {generationProgress > 10 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    Analyzing rule pack structures...
                  </motion.p>
                )}
                {generationProgress > 35 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    Mapping eligibility validations...
                  </motion.p>
                )}
                {generationProgress > 60 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    Building workflow node connections...
                  </motion.p>
                )}
                {generationProgress > 85 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground flex items-center gap-2"
                  >
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    Finalizing task auto-creation logic...
                  </motion.p>
                )}
              </div>
            </div>
          )}

          {!isGenerating && (
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              Generate Workflow from Rule Packs
            </button>
          )}
        </motion.div>
      )}

      {/* Workflow Visualization */}
      {workflowNodes.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              Generated Workflow
            </p>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {workflowNodes.length} Nodes Generated
            </span>
          </div>

          <div className="space-y-3">
            {workflowNodes.map((node, i) => {
              const Icon = nodeIcons[node.type] || Zap;
              const color = nodeColors[node.type] || nodeColors.intake;

              return (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="rounded-xl border border-border/60 bg-card overflow-hidden"
                >
                  {/* Node Header */}
                  <div
                    className={cn(
                      "bg-gradient-to-r px-5 py-3 flex items-center gap-3",
                      color
                    )}
                  >
                    <div className="h-9 w-9 rounded-lg bg-white/20 border border-white/15 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        Step {node.step} — {node.name}
                      </h4>
                      <p className="text-[11px] text-white/70 capitalize">
                        {node.type} Node
                      </p>
                    </div>
                    <div className="ml-auto">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-medium",
                          node.status === "complete"
                            ? "bg-white/20 text-white"
                            : node.status === "active"
                            ? "bg-white/30 text-white"
                            : "bg-white/10 text-white/60"
                        )}
                      >
                        {node.status === "complete"
                          ? "✓ Complete"
                          : node.status === "active"
                          ? "● Active"
                          : "○ Pending"}
                      </span>
                    </div>
                  </div>

                  {/* Node Body */}
                  <div className="p-5 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {node.description}
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Triggers */}
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Play className="h-3 w-3" /> Triggers
                        </p>
                        <ul className="space-y-1">
                          {node.triggers.map((t, j) => (
                            <li
                              key={j}
                              className="text-[11px] text-foreground/80 flex items-start gap-1.5"
                            >
                              <ArrowRight className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Actions */}
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Zap className="h-3 w-3" /> Actions
                        </p>
                        <ul className="space-y-1">
                          {node.actions.map((a, j) => (
                            <li
                              key={j}
                              className="text-[11px] text-foreground/80 flex items-start gap-1.5"
                            >
                              <span className="h-1 w-1 rounded-full bg-primary mt-1.5 shrink-0" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Validations */}
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <ShieldCheck className="h-3 w-3" /> Validations
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {node.validations.slice(0, 6).map((v, j) => (
                          <span
                            key={j}
                            className="px-2.5 py-1 rounded-lg bg-muted/50 border border-border/40 text-[10px] text-foreground/70"
                          >
                            {v}
                          </span>
                        ))}
                        {node.validations.length > 6 && (
                          <span className="px-2.5 py-1 rounded-lg bg-muted/30 text-[10px] text-muted-foreground">
                            +{node.validations.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Output */}
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-1.5">
                        Output
                      </p>
                      <ul className="space-y-1">
                        {node.output.map((o, j) => (
                          <li
                            key={j}
                            className="text-[11px] text-foreground/80 flex items-start gap-1.5"
                          >
                            <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                            {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Connector line */}
                  {i < workflowNodes.length - 1 && (
                    <div className="flex justify-center pb-2">
                      <div className="w-px h-4 bg-border" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm border border-border transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Rule Packs
            </button>
            <button
              onClick={onFinish}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              Save Agent
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
