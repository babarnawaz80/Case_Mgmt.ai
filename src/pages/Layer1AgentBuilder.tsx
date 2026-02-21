import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Shield, Bot, LayoutDashboard, User, Sparkles,
} from "lucide-react";
import { StepIndicator } from "@/components/agentbuilder/StepIndicator";
import { Layer1Step1Upload } from "@/components/layer1/Layer1Step1Upload";
import { Layer1Step2Extract } from "@/components/layer1/Layer1Step2Extract";
import { Layer1Step3Build } from "@/components/layer1/Layer1Step3Build";
import { Layer1Step4Normalize } from "@/components/layer1/Layer1Step4Normalize";
import { Layer1Step5Review } from "@/components/layer1/Layer1Step5Review";
import { Layer1Step6Publish } from "@/components/layer1/Layer1Step6Publish";
import { Layer1State, RulePack, UploadedFile } from "@/types/rulePack";
import { toast } from "@/hooks/use-toast";

const STEPS = [
  { label: "Ingest Guidelines", description: "Upload PDF & optional docs" },
  { label: "Extract Services", description: "Identify all services" },
  { label: "Build Rule Packs", description: "Structure per service" },
  { label: "Normalize & De-dup", description: "Clean service naming" },
  { label: "Admin Review", description: "Review & flag issues" },
  { label: "Publish", description: "Activate rule packs" },
];

export default function Layer1AgentBuilder() {
  const navigate = useNavigate();
  const [state, setState] = useState<Layer1State>({
    step: 1,
    uploadedFiles: [],
    optionalTemplates: [],
    serviceCodeMapping: "",
    rulePacks: [],
    extractionSummary: null,
    isProcessing: false,
  });

  const goTo = (step: number) => setState((s) => ({ ...s, step }));

  const handlePublish = () => {
    toast({
      title: "Rule Packs Published",
      description: `${state.rulePacks.length} rule packs are now available for Case Manager Compliance Agents.`,
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(var(--destructive))] to-[hsl(30,70%,55%)] flex items-center justify-center">
              <Shield className="w-4 h-4 text-destructive-foreground" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-foreground text-sm">Layer 1 — Guideline Parsing Agent</h2>
              <p className="text-[11px] text-muted-foreground">Admin Only · Converts PDFs → Structured Rule Packs</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/lifeplan")} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs transition-all border border-border">
            <Sparkles className="w-4 h-4" /> Life Plan
          </motion.button>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </header>

      <div className="px-6 py-4 border-b border-border/60 bg-card/50 overflow-x-auto">
        <div className="max-w-[1200px] mx-auto min-w-[700px]">
          <StepIndicator currentStep={state.step} steps={STEPS} />
        </div>
      </div>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-[1000px] mx-auto">
          {state.step === 1 && (
            <Layer1Step1Upload
              uploadedFiles={state.uploadedFiles}
              optionalTemplates={state.optionalTemplates}
              serviceCodeMapping={state.serviceCodeMapping}
              onFilesChange={(files) => setState((s) => ({ ...s, uploadedFiles: files }))}
              onTemplatesChange={(files) => setState((s) => ({ ...s, optionalTemplates: files }))}
              onMappingChange={(m) => setState((s) => ({ ...s, serviceCodeMapping: m }))}
              onNext={() => goTo(2)}
            />
          )}
          {state.step === 2 && (
            <Layer1Step2Extract
              rulePacks={state.rulePacks}
              onRulePacksGenerated={(packs) => setState((s) => ({ ...s, rulePacks: packs }))}
              onBack={() => goTo(1)}
              onNext={() => goTo(3)}
            />
          )}
          {state.step === 3 && (
            <Layer1Step3Build
              rulePacks={state.rulePacks}
              onBack={() => goTo(2)}
              onNext={() => goTo(4)}
            />
          )}
          {state.step === 4 && (
            <Layer1Step4Normalize
              rulePacks={state.rulePacks}
              onRulePacksUpdated={(packs) => setState((s) => ({ ...s, rulePacks: packs }))}
              onBack={() => goTo(3)}
              onNext={() => goTo(5)}
            />
          )}
          {state.step === 5 && (
            <Layer1Step5Review
              rulePacks={state.rulePacks}
              onSummaryGenerated={(summary) => setState((s) => ({ ...s, extractionSummary: summary }))}
              extractionSummary={state.extractionSummary}
              onBack={() => goTo(4)}
              onNext={() => goTo(6)}
            />
          )}
          {state.step === 6 && (
            <Layer1Step6Publish
              rulePacks={state.rulePacks}
              extractionSummary={state.extractionSummary}
              onBack={() => goTo(5)}
              onPublish={handlePublish}
            />
          )}
        </div>
      </main>
    </div>
  );
}
