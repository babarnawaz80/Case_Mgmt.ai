import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, Sparkles, User, LayoutDashboard } from "lucide-react";
import { StepIndicator } from "@/components/agentbuilder/StepIndicator";
import { RuntimeAgentType, mockRuleLibraries, runtimeAgentTypeLabels, RuleLibrary } from "@/types/agent";
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
  { label: "Define Agent", description: "Name, type & description" },
  { label: "Select Rule Source", description: "Choose published library" },
  { label: "Configure Workflow", description: "Agent-type workflow" },
  { label: "Data Mapping", description: "Module output overrides" },
  { label: "Review & Save", description: "Confirm & deploy" },
];

const workflowTemplates: Record<RuntimeAgentType, string[]> = {
  compliance_copilot: [
    "Select Individual",
    "Select Service",
    "Eligibility / Prerequisites Check",
    "PCP Alignment Check",
    "Limits & Caps Check",
    "Conflict Check",
    "Documentation Packet Builder",
    "Push Outputs to Modules",
    "Final Compliance Summary",
  ],
  pcp_alignment: [
    "Select Individual",
    "Scan PCP vs Rule Pack Requirements",
    "Identify Missing Items",
    "Draft Addendum Language",
    "Push to PCP Module + Tasks",
  ],
  billing_documentation: [
    "Select Individual + Service + Date Range",
    "Verify Billable Requirements",
    "Generate Compliant Note Templates",
    "Cross-check Conflicts / Units",
    "Push to Billable Activity Note + Progress Note",
  ],
  monitoring_reauth: [
    "Select Individual + Service",
    "Track Caps + Deadlines + Required Monthly Elements",
    "Create Monitoring Form Templates + Tasks",
  ],
  isp_generator: [
    "Select Individual",
    "Pull Assessments & Goals",
    "Map to State ISP Template",
    "Generate ISP Draft",
    "Review & Finalize",
  ],
  ambient_meeting: [
    "Start Meeting Recording",
    "Transcribe & Summarize",
    "Map to Progress Note Fields",
    "Generate Billable Note Draft",
    "Push to Activity Notes",
  ],
};

const ICM_MODULES = [
  "PCP", "Services", "Service Plan", "Billable Activity Note",
  "Progress Note", "Monitoring Form", "Comprehensive Assessment",
  "Workflow Manager", "Managed Documents",
];

export default function RuntimeAgentBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1
  const [agentName, setAgentName] = useState("");
  const [agentType, setAgentType] = useState<RuntimeAgentType | "">("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");

  // Step 2
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [serviceScope, setServiceScope] = useState("all");

  // Step 4
  const [moduleToggles, setModuleToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(ICM_MODULES.map(m => [m, true]))
  );

  const selectedLibrary = mockRuleLibraries.find(l => l.id === selectedLibraryId);
  const publishedLibraries = mockRuleLibraries.filter(l => l.status === "published");
  const workflowSteps = agentType ? workflowTemplates[agentType] : [];

  const goTo = (s: number) => setStep(s);

  const handleSave = () => {
    toast({
      title: "Agent Created Successfully",
      description: `${agentName} is now active and linked to ${selectedLibrary?.name} v${selectedLibrary?.version}.`,
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
              <h2 className="font-display font-semibold text-foreground text-sm">Create New Agent</h2>
              <p className="text-[11px] text-muted-foreground">Runtime Agent · Uses published Rule Libraries for compliance</p>
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
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Instructions / Prompt</label>
                  <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Custom instructions for how this agent should behave..." rows={4} className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={() => goTo(2)} disabled={!agentName || !agentType} className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Select Rule Source */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-lg font-display font-bold text-foreground mb-1">Select Rule Source</h3>
                <p className="text-sm text-muted-foreground">Choose a published Rule Library for this agent to use.</p>
              </div>

              <div className="space-y-4 glass rounded-xl p-6">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Rule Library</label>
                  <Select value={selectedLibraryId} onValueChange={setSelectedLibraryId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a published rule library..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {publishedLibraries.map(lib => (
                        <SelectItem key={lib.id} value={lib.id}>
                          {lib.name} – Effective {lib.effectiveDate} – v{lib.version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedLibrary && (
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                    <p className="text-sm font-medium text-foreground">{selectedLibrary.name} v{selectedLibrary.version}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{selectedLibrary.serviceCount} services</span>
                      <span>{selectedLibrary.hardStopCount} hard stops</span>
                      <span>{selectedLibrary.warningCount} warnings</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Service Scope</label>
                  <Select value={serviceScope} onValueChange={setServiceScope}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">All Services</SelectItem>
                      <SelectItem value="employment">Employment Only</SelectItem>
                      <SelectItem value="behavioral">Behavioral Only</SelectItem>
                      <SelectItem value="residential">Residential Only</SelectItem>
                      <SelectItem value="day">Meaningful Day Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={() => goTo(1)} className="px-6 py-2.5 rounded-xl bg-secondary text-foreground font-medium text-sm border border-border">Back</button>
                <button onClick={() => goTo(3)} disabled={!selectedLibraryId} className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">Continue</button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Configure Workflow */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-lg font-display font-bold text-foreground mb-1">Configure Workflow</h3>
                <p className="text-sm text-muted-foreground">Auto-generated workflow for <span className="font-medium text-foreground">{agentType ? runtimeAgentTypeLabels[agentType] : ""}</span>.</p>
              </div>

              <div className="glass rounded-xl p-6 space-y-3">
                {workflowSteps.map((ws, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary-foreground">{i + 1}</span>
                    </div>
                    <span className="text-sm text-foreground">{ws}</span>
                  </div>
                ))}
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
                <p className="text-sm text-muted-foreground">Per-agent module output overrides. These can differ from the Rule Library defaults.</p>
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

          {/* Step 5: Review & Save */}
          {step === 5 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h3 className="text-lg font-display font-bold text-foreground mb-1">Review & Save</h3>
                <p className="text-sm text-muted-foreground">Confirm your agent configuration before saving.</p>
              </div>

              <div className="glass rounded-xl p-6 space-y-4">
                <ReviewRow label="Agent Name" value={agentName} />
                <ReviewRow label="Agent Type" value={agentType ? runtimeAgentTypeLabels[agentType] : ""} />
                <ReviewRow label="Rule Library" value={selectedLibrary ? `${selectedLibrary.name} v${selectedLibrary.version}` : ""} />
                <ReviewRow label="Service Scope" value={serviceScope === "all" ? "All Services" : serviceScope} />
                <ReviewRow label="Workflow Steps" value={`${workflowSteps.length} steps`} />
                <ReviewRow label="Enabled Modules" value={`${Object.values(moduleToggles).filter(Boolean).length} of ${ICM_MODULES.length}`} />
              </div>

              <div className="flex justify-between">
                <button onClick={() => goTo(4)} className="px-6 py-2.5 rounded-xl bg-secondary text-foreground font-medium text-sm border border-border">Back</button>
                <button onClick={handleSave} className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg">
                  Save & Deploy Agent
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
