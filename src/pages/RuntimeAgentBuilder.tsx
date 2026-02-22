import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, Sparkles, User, Shield, Lock, AlertTriangle, Eye, GitBranch, Info } from "lucide-react";
import { StepIndicator } from "@/components/agentbuilder/StepIndicator";
import { RuntimeAgentType, RuntimeAgent, mockComplianceEngines, runtimeAgentTypeLabels, ComplianceEngine, applyModeLabels, ApplyMode, FIXED_WORKFLOW_STEPS, monitoringCadenceLabels, MonitoringCadence } from "@/types/agent";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const STEPS = [
  { label: "Define Agent", description: "Name, type & instructions" },
  { label: "Select Guidelines Engine", description: "Choose published engine" },
  { label: "Configure Overrides", description: "Override & push settings" },
  { label: "Data Mapping", description: "Module output overrides" },
  { label: "Review & Deploy", description: "Confirm & deploy" },
];

const ICM_MODULES = [
  "PCP", "Services", "Service Plan", "Billable Activity Note",
  "Progress Note", "Monitoring Form", "Comprehensive Assessment",
  "Workflow Manager", "Managed Documents",
];

export default function RuntimeAgentBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);

  // Edit / Clone mode
  const editAgent: RuntimeAgent | undefined = location.state?.editAgent;
  const cloneAgent: RuntimeAgent | undefined = location.state?.cloneAgent;
  const sourceAgent = editAgent || cloneAgent;
  const isEditMode = !!editAgent;
  const isCloneMode = !!cloneAgent;

  // Compute next version
  const currentVersion = editAgent?.version || "1.0";
  const nextVersion = isEditMode
    ? `${parseFloat(currentVersion) + 0.1}`
    : "1.0";

  // Step 1
  const [agentName, setAgentName] = useState(sourceAgent?.name || "");
  const [agentType, setAgentType] = useState<RuntimeAgentType | "">(sourceAgent?.type || "");
  const [description, setDescription] = useState(sourceAgent?.description || "");
  const [instructions, setInstructions] = useState(sourceAgent?.instructions || "");

  // Step 2
  const [selectedEngineId, setSelectedEngineId] = useState(sourceAgent?.engineId || "");

  // Step 3
  const [allowOverrides, setAllowOverrides] = useState(sourceAgent?.allowOverrides ?? true);
  const [requireSupervisorApproval, setRequireSupervisorApproval] = useState(sourceAgent?.requireSupervisorApproval ?? false);
  const [applyMode, setApplyMode] = useState<ApplyMode>(sourceAgent?.applyMode || "manual");

  // Auto-Monitor
  const [autoMonitorEnabled, setAutoMonitorEnabled] = useState(sourceAgent?.autoMonitorEnabled ?? false);
  const [monitorCadence, setMonitorCadence] = useState<MonitoringCadence>(sourceAgent?.autoMonitorCadence || "realtime");
  const [debounceHours, setDebounceHours] = useState(sourceAgent?.autoMonitorDebounceHours ?? 6);

  // Step 4
  const [moduleToggles, setModuleToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(ICM_MODULES.map(m => [m, true]))
  );

  const selectedEngine = mockComplianceEngines.find(e => e.id === selectedEngineId);
  const publishedEngines = mockComplianceEngines.filter(e => e.status === "published");

  const goTo = (s: number) => setStep(s);

  const handleSave = () => {
    toast({
      title: isEditMode ? "New Agent Version Created" : "Agent Created Successfully",
      description: isEditMode
        ? `${agentName} v${nextVersion} created. Existing individuals remain on v${currentVersion} until upgraded.`
        : `${agentName} is now active and linked to ${selectedEngine?.name} v${selectedEngine?.version}.`,
    });
    navigate("/lifeplan");
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border glass shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/lifeplan")} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-foreground text-sm">
                {isEditMode ? `Edit: ${editAgent.name}` : isCloneMode ? `Clone: ${cloneAgent.name}` : "New Agent"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {isEditMode
                  ? `Creating v${nextVersion} · Current: v${currentVersion}`
                  : "Runtime Agent · Uses published Guidelines Engines for compliance"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/lifeplan")} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs transition-all border border-border">
            <Sparkles className="w-4 h-4" /> Platform
          </motion.button>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </header>

      <div className="px-6 py-4 border-b border-border/60 bg-card/50 overflow-x-auto">
        <div className="max-w-[1200px] mx-auto min-w-[700px]">
          <StepIndicator currentStep={step} steps={STEPS} />
        </div>
      </div>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-[800px] mx-auto">
          {/* Edit Mode Safety Banner */}
          {isEditMode && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl bg-warning/5 border border-warning/20 space-y-2">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-warning shrink-0" />
                <p className="text-sm font-semibold text-foreground">Editing creates a new version (v{nextVersion})</p>
              </div>
              <ul className="space-y-1 text-[11px] text-muted-foreground ml-6">
                <li className="flex items-center gap-1.5"><Shield className="h-3 w-3 text-primary" /> Existing individuals remain on <span className="font-semibold text-foreground">v{currentVersion}</span> until manually upgraded</li>
                <li className="flex items-center gap-1.5"><Shield className="h-3 w-3 text-primary" /> Active monitoring runs continue using the current version</li>
                <li className="flex items-center gap-1.5"><Shield className="h-3 w-3 text-primary" /> Changes only apply to <span className="font-semibold text-foreground">new runs going forward</span></li>
                <li className="flex items-center gap-1.5"><Info className="h-3 w-3 text-muted-foreground" /> Admins can upgrade individuals to the new version from the agent settings</li>
              </ul>
            </motion.div>
          )}
          {/* Step 1: Define Agent */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-lg font-display font-bold text-foreground mb-1">Define Agent</h3>
                <p className="text-sm text-muted-foreground">Set the agent name, type, and instructions.</p>
              </div>

              <div className="space-y-4 glass rounded-xl p-6">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Agent Name</label>
                  <input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="e.g. State Compliance Copilot" className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Agent Type</label>
                  <Select value={agentType} onValueChange={(v) => setAgentType(v as RuntimeAgentType)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select agent type..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {(Object.entries(runtimeAgentTypeLabels) as [RuntimeAgentType, string][]).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this agent do?" rows={3} className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Agent Instructions</label>
                  <p className="text-[11px] text-muted-foreground mb-2">Organization-level instructions. These override Compliance Engine state-level logic when conflicts occur.</p>
                  <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Custom instructions for how this agent should behave at the organization level..." rows={4} className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                </div>

                {/* Instruction hierarchy info */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Instruction Precedence</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="w-4 h-4 rounded bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">1</span>
                      <span className="text-muted-foreground">Guidelines Engine Instructions <span className="text-muted-foreground/60">(State-level logic)</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">2</span>
                      <span className="text-foreground font-medium">Agent Instructions <span className="text-muted-foreground/60">(Organization-level — you are here)</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="w-4 h-4 rounded bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">3</span>
                      <span className="text-muted-foreground">Runtime Overrides <span className="text-muted-foreground/60">(Case-specific, requires justification)</span></span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Higher numbers override lower when conflicts occur.</p>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={() => goTo(2)} disabled={!agentName || !agentType} className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Select Guidelines Engine */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-lg font-display font-bold text-foreground mb-1">Select Guidelines Engine</h3>
                <p className="text-sm text-muted-foreground">Choose a published Guidelines Engine. Only published engines can be linked to agents.</p>
              </div>

              <div className="space-y-4 glass rounded-xl p-6">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Guidelines Engine</label>
                  <Select value={selectedEngineId} onValueChange={setSelectedEngineId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a published guidelines engine..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {publishedEngines.map(engine => (
                        <SelectItem key={engine.id} value={engine.id}>
                          {engine.name} – {engine.program} – Effective {engine.effectiveDate} (v{engine.version})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Draft engines cannot be linked to agents. Only published engines appear here.</p>
                </div>

                {selectedEngine && (
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{selectedEngine.name} v{selectedEngine.version}</p>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">Published</span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{selectedEngine.serviceCount} services</span>
                      <span>{selectedEngine.hardStopCount} hard stops</span>
                      <span>{selectedEngine.warningCount} warnings</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Agent will be pinned to v{selectedEngine.version}. Upgrading requires manual action.
                    </p>
                  </div>
                )}
              </div>

              {/* Fixed workflow preview */}
              <div className="glass rounded-xl p-6 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">System Workflow (Fixed)</p>
                    <p className="text-[11px] text-muted-foreground">This workflow is system-defined and cannot be reordered or modified.</p>
                  </div>
                </div>
                {FIXED_WORKFLOW_STEPS.map((ws) => (
                  <div key={ws.step} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 border border-border/30">
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-muted-foreground">{ws.step}</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium text-foreground">{ws.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{ws.description}</span>
                    </div>
                    <Lock className="h-3 w-3 text-muted-foreground/40" />
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <button onClick={() => goTo(1)} className="px-6 py-2.5 rounded-xl bg-secondary text-foreground font-medium text-sm border border-border">Back</button>
                <button onClick={() => goTo(3)} disabled={!selectedEngineId} className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">Continue</button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Configure Overrides */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-lg font-display font-bold text-foreground mb-1">Configure Overrides</h3>
                <p className="text-sm text-muted-foreground">Set override permissions and apply-to-module behavior for this agent.</p>
              </div>

              <div className="glass rounded-xl p-6 space-y-5">
                {/* Override settings */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Override Controls</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                      <div>
                        <p className="text-sm font-medium text-foreground">Allow Overrides</p>
                        <p className="text-[11px] text-muted-foreground">Case managers can override compliance findings with written justification</p>
                      </div>
                      <Switch checked={allowOverrides} onCheckedChange={setAllowOverrides} />
                    </div>
                    <div className={cn("flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40 transition-opacity", !allowOverrides && "opacity-50 pointer-events-none")}>
                      <div>
                        <p className="text-sm font-medium text-foreground">Require Supervisor Approval</p>
                        <p className="text-[11px] text-muted-foreground">Overrides require supervisor sign-off before taking effect</p>
                      </div>
                      <Switch checked={requireSupervisorApproval} onCheckedChange={setRequireSupervisorApproval} />
                    </div>
                  </div>
                </div>

                {/* Apply mode */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Apply to Modules — Safety Control</p>
                  <p className="text-[11px] text-muted-foreground mb-3">Controls how outputs are written to iCM modules. All modes require human confirmation. Default: Manual Apply.</p>
                  <Select value={applyMode} onValueChange={(v) => setApplyMode(v as ApplyMode)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {(Object.entries(applyModeLabels) as [ApplyMode, string][]).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-2">
                    <Shield className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground">All apply modes require explicit user confirmation. No silent automation.</p>
                  </div>
                </div>

                {/* What agents CANNOT do */}
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Shield className="h-3 w-3" /> Agents Cannot
                  </p>
                  <ul className="space-y-1 text-[11px] text-muted-foreground">
                    <li className="flex items-center gap-1.5"><Lock className="h-3 w-3 text-muted-foreground/50" /> Disable conflict engine</li>
                    <li className="flex items-center gap-1.5"><Lock className="h-3 w-3 text-muted-foreground/50" /> Skip eligibility checks</li>
                    <li className="flex items-center gap-1.5"><Lock className="h-3 w-3 text-muted-foreground/50" /> Reorder workflow steps</li>
                    <li className="flex items-center gap-1.5"><Lock className="h-3 w-3 text-muted-foreground/50" /> Edit guidelines engine rules</li>
                  </ul>
                </div>

                {/* Auto-Monitor Settings */}
                <div className="border-t border-border/40 pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Eye className="h-4 w-4 text-primary" /> Auto-Monitor (Draft Mode)
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Automatically generate draft compliance runs in the background. No iCM writes.</p>
                    </div>
                    <Switch checked={autoMonitorEnabled} onCheckedChange={setAutoMonitorEnabled} />
                  </div>

                  <div className={cn("space-y-4 transition-opacity", !autoMonitorEnabled && "opacity-50 pointer-events-none")}>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Monitoring Cadence</label>
                      <Select value={monitorCadence} onValueChange={(v) => setMonitorCadence(v as MonitoringCadence)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {(Object.entries(monitoringCadenceLabels) as [MonitoringCadence, string][]).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Debounce Window (hours)</label>
                      <input
                        type="number" min={1} max={24} value={debounceHours}
                        onChange={e => setDebounceHours(Number(e.target.value))}
                        className="w-24 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Max 1 draft per individual per agent within this window (unless Hard Stop detected)</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-2">
                      <Shield className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <p className="text-[11px] text-muted-foreground">Per-individual monitoring toggles and quiet hours can be configured after deployment from the Agent Monitoring Settings page.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={() => goTo(2)} className="px-6 py-2.5 rounded-xl bg-secondary text-foreground font-medium text-sm border border-border">Back</button>
                <button onClick={() => goTo(4)} className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm">Continue</button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Data Mapping */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-lg font-display font-bold text-foreground mb-1">Data Mapping</h3>
                <p className="text-sm text-muted-foreground">Per-agent module output overrides. These can differ from the Guidelines Engine defaults.</p>
              </div>

              <div className="glass rounded-xl p-6 space-y-3">
                {ICM_MODULES.map(mod => (
                  <div key={mod} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                    <span className="text-sm font-medium text-foreground">{mod}</span>
                    <Switch checked={moduleToggles[mod]} onCheckedChange={(v) => setModuleToggles(prev => ({ ...prev, [mod]: v }))} />
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <button onClick={() => goTo(3)} className="px-6 py-2.5 rounded-xl bg-secondary text-foreground font-medium text-sm border border-border">Back</button>
                <button onClick={() => goTo(5)} className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm">Continue</button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Review & Deploy */}
          {step === 5 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-lg font-display font-bold text-foreground mb-1">
                  {isEditMode ? "Review & Create New Version" : "Review & Deploy"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isEditMode
                    ? `This will create v${nextVersion}. Existing plans on v${currentVersion} are not affected.`
                    : "Confirm your agent configuration before deploying."}
                </p>
              </div>

              <div className="glass rounded-xl p-6 space-y-4">
                <ReviewRow label="Agent Name" value={agentName} />
                {isEditMode && <ReviewRow label="Version" value={`v${currentVersion} → v${nextVersion}`} />}
                <ReviewRow label="Agent Type" value={agentType ? runtimeAgentTypeLabels[agentType] : ""} />
                <ReviewRow label="Guidelines Engine" value={selectedEngine ? `${selectedEngine.name} v${selectedEngine.version}` : ""} />
                <ReviewRow label="Engine Pinned Version" value={selectedEngine ? `v${selectedEngine.version}` : ""} />
                <ReviewRow label="Allow Overrides" value={allowOverrides ? "Yes" : "No"} />
                <ReviewRow label="Supervisor Approval" value={requireSupervisorApproval ? "Required" : "Not required"} />
                <ReviewRow label="Apply Mode" value={applyModeLabels[applyMode]} />
                <ReviewRow label="Workflow Steps" value={`${FIXED_WORKFLOW_STEPS.length} steps (fixed)`} />
                <ReviewRow label="Enabled Modules" value={`${Object.values(moduleToggles).filter(Boolean).length} of ${ICM_MODULES.length}`} />
                <ReviewRow label="Auto-Monitor" value={autoMonitorEnabled ? "ON" : "OFF"} />
                {autoMonitorEnabled && (
                  <>
                    <ReviewRow label="Monitor Cadence" value={monitoringCadenceLabels[monitorCadence]} />
                    <ReviewRow label="Debounce Window" value={`${debounceHours} hours`} />
                  </>
                )}
              </div>

              <div className="flex justify-between">
                <button onClick={() => goTo(4)} className="px-6 py-2.5 rounded-xl bg-secondary text-foreground font-medium text-sm border border-border">Back</button>
                <button onClick={handleSave} className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg">
                  {isEditMode ? `Deploy v${nextVersion}` : "Deploy Agent"}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
