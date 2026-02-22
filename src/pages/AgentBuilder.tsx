import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  LayoutDashboard,
  User,
  Bot,
} from "lucide-react";
import { StepIndicator } from "@/components/agentbuilder/StepIndicator";
import { Step1GuidelineIngestion } from "@/components/agentbuilder/Step1GuidelineIngestion";
import { Step2WorkflowGenerator } from "@/components/agentbuilder/Step2WorkflowGenerator";
import { Step3DataMapping } from "@/components/agentbuilder/Step3DataMapping";
import { Step4ComplianceLogic } from "@/components/agentbuilder/Step4ComplianceLogic";
import { Step3PCPValidation } from "@/components/agentbuilder/Step3PCPValidation";
import { Step4LimitsEngine } from "@/components/agentbuilder/Step4LimitsEngine";
import { Step5ConflictEngine } from "@/components/agentbuilder/Step5ConflictEngine";
import { Step6DocumentationGenerator } from "@/components/agentbuilder/Step6DocumentationGenerator";
import { Step7AuthorizationOutput } from "@/components/agentbuilder/Step7AuthorizationOutput";
import { StepVersionControl } from "@/components/agentbuilder/StepVersionControl";
import { AgentBuilderState } from "@/types/guidelinePack";
import { toast } from "@/hooks/use-toast";

const STEPS = [
  { label: "Guideline Ingestion", description: "Upload & parse documents" },
  { label: "Workflow Generator", description: "Regulatory-driven nodes" },
  { label: "Data Mapping", description: "Map to iCM modules" },
  { label: "Compliance Logic", description: "Classify rule types" },
  { label: "PCP Validation", description: "Validate plan compliance" },
  { label: "Limits & Caps", description: "Calculate service caps" },
  { label: "Conflict Engine", description: "Cross-check services" },
  { label: "Doc Generator", description: "Auto-generate templates" },
  { label: "Authorization", description: "Final output & tasks" },
  { label: "Version Control", description: "Track & approve changes" },
];

export default function AgentBuilder() {
  const navigate = useNavigate();
  const [state, setState] = useState<AgentBuilderState>({
    step: 1,
    agentName: "",
    agentDescription: "",
    uploadedFiles: [],
    rulePacks: [],
    guidelinePacks: [],
    workflowNodes: [],
    isProcessing: false,
  });

  const handleFinish = () => {
    toast({
      title: "Agent Deployed Successfully",
      description: "Compliance agent is now active — a denial-prevention engine enforcing regulation-driven workflows across all iCM modules.",
    });
    navigate("/lifeplan");
  };

  const goTo = (step: number) => setState((s) => ({ ...s, step }));

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
              <h2 className="font-display font-semibold text-foreground text-sm">Agent Builder</h2>
              <p className="text-[11px] text-muted-foreground">Dynamic State Compliance Agent</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/lifeplan")} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs transition-all border border-border">
            <Sparkles className="w-4 h-4" /> Compliance Agent
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/dashboard")} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs transition-all border border-border">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </motion.button>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </header>

      <div className="px-6 py-4 border-b border-border/60 bg-card/50 overflow-x-auto">
        <div className="max-w-[1400px] mx-auto min-w-[800px]">
          <StepIndicator currentStep={state.step} steps={STEPS} />
        </div>
      </div>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-[1000px] mx-auto">
          {state.step === 1 && (
            <Step1GuidelineIngestion
              uploadedFiles={state.uploadedFiles} rulePacks={state.rulePacks} isProcessing={state.isProcessing}
              onFilesUploaded={(files) => setState((s) => ({ ...s, uploadedFiles: files }))}
              onRulePacksGenerated={(packs) => setState((s) => ({ ...s, rulePacks: packs }))}
              onProcessingChange={(p) => setState((s) => ({ ...s, isProcessing: p }))}
              onNext={() => goTo(2)}
            />
          )}
          {state.step === 2 && (
            <Step2WorkflowGenerator
              rulePacks={state.rulePacks} workflowNodes={state.workflowNodes}
              onWorkflowGenerated={(nodes) => setState((s) => ({ ...s, workflowNodes: nodes }))}
              onBack={() => goTo(1)} onFinish={() => goTo(3)}
            />
          )}
          {state.step === 3 && <Step3DataMapping rulePacks={state.rulePacks} onBack={() => goTo(2)} onNext={() => goTo(4)} />}
          {state.step === 4 && <Step4ComplianceLogic rulePacks={state.rulePacks} onBack={() => goTo(3)} onNext={() => goTo(5)} />}
          {state.step === 5 && <Step3PCPValidation rulePacks={state.rulePacks} onBack={() => goTo(4)} onNext={() => goTo(6)} />}
          {state.step === 6 && <Step4LimitsEngine rulePacks={state.rulePacks} onBack={() => goTo(5)} onNext={() => goTo(7)} />}
          {state.step === 7 && <Step5ConflictEngine onBack={() => goTo(6)} onNext={() => goTo(8)} />}
          {state.step === 8 && <Step6DocumentationGenerator onBack={() => goTo(7)} onNext={() => goTo(9)} />}
          {state.step === 9 && <Step7AuthorizationOutput onBack={() => goTo(8)} onFinish={() => goTo(10)} />}
          {state.step === 10 && <StepVersionControl onBack={() => goTo(9)} onFinish={handleFinish} />}
        </div>
      </main>
    </div>
  );
}
