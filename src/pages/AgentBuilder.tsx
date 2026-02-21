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
import { AgentBuilderState } from "@/types/rulePack";
import { toast } from "@/hooks/use-toast";

const STEPS = [
  { label: "Guideline Ingestion", description: "Upload & parse documents" },
  { label: "Workflow Generator", description: "Auto-build workflow nodes" },
  { label: "Data Mapping", description: "Coming soon" },
  { label: "Module Push", description: "Coming soon" },
];

export default function AgentBuilder() {
  const navigate = useNavigate();
  const [state, setState] = useState<AgentBuilderState>({
    step: 1,
    agentName: "",
    agentDescription: "",
    uploadedFiles: [],
    rulePacks: [],
    workflowNodes: [],
    isProcessing: false,
  });

  const handleFinish = () => {
    toast({
      title: "Agent Created",
      description: `Workflow with ${state.workflowNodes.length} nodes has been saved. Steps 3-4 coming soon.`,
    });
    navigate("/lifeplan");
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-border glass shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/lifeplan")}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-foreground text-sm">
                Agent Builder
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Dynamic State Compliance Agent
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/lifeplan")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs transition-all border border-border"
          >
            <Sparkles className="w-4 h-4" />
            Life Plan
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs transition-all border border-border"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </motion.button>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="px-6 py-4 border-b border-border/60 bg-card/50">
        <div className="max-w-[1000px] mx-auto">
          <StepIndicator currentStep={state.step} steps={STEPS} />
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-[1000px] mx-auto">
          {state.step === 1 && (
            <Step1GuidelineIngestion
              uploadedFiles={state.uploadedFiles}
              rulePacks={state.rulePacks}
              isProcessing={state.isProcessing}
              onFilesUploaded={(files) =>
                setState((s) => ({ ...s, uploadedFiles: files }))
              }
              onRulePacksGenerated={(packs) =>
                setState((s) => ({ ...s, rulePacks: packs }))
              }
              onProcessingChange={(p) =>
                setState((s) => ({ ...s, isProcessing: p }))
              }
              onNext={() => setState((s) => ({ ...s, step: 2 }))}
            />
          )}

          {state.step === 2 && (
            <Step2WorkflowGenerator
              rulePacks={state.rulePacks}
              workflowNodes={state.workflowNodes}
              onWorkflowGenerated={(nodes) =>
                setState((s) => ({ ...s, workflowNodes: nodes }))
              }
              onBack={() => setState((s) => ({ ...s, step: 1 }))}
              onFinish={handleFinish}
            />
          )}
        </div>
      </main>
    </div>
  );
}
