import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Bot, Sparkles, User,
} from "lucide-react";
import { StepIndicator } from "@/components/agentbuilder/StepIndicator";
import { Layer2Step1Service } from "@/components/layer2/Layer2Step1Service";
import { Layer2Step2Eligibility } from "@/components/layer2/Layer2Step2Eligibility";
import { Layer2Step3PCP } from "@/components/layer2/Layer2Step3PCP";
import { Layer2Step4Limits } from "@/components/layer2/Layer2Step4Limits";
import { Layer2Step5Conflicts } from "@/components/layer2/Layer2Step5Conflicts";
import { Layer2Step6Documentation } from "@/components/layer2/Layer2Step6Documentation";
import { Layer2Step7Push } from "@/components/layer2/Layer2Step7Push";
import { Layer2Step8Dashboard } from "@/components/layer2/Layer2Step8Dashboard";
import { Layer2State } from "@/types/rulePack";
import { toast } from "@/hooks/use-toast";

const STEPS = [
  { label: "Individual & Service", description: "Select person + load rule pack" },
  { label: "Eligibility Check", description: "Prerequisites & qualification" },
  { label: "PCP Alignment", description: "Plan justifies service?" },
  { label: "Limits & Caps", description: "Within allowed hours/units?" },
  { label: "Conflict Engine", description: "No billing conflicts?" },
  { label: "Doc Builder", description: "Generate required docs" },
  { label: "Push to Modules", description: "Write outputs to iCM" },
  { label: "Compliance Dashboard", description: "Final status & next steps" },
];

export default function Layer2AgentBuilder() {
  const navigate = useNavigate();
  const [state, setState] = useState<Layer2State>({
    step: 1,
    selectedRulePack: null,
    moduleMapping: [],
    complianceResult: null,
    isProcessing: false,
  });

  const goTo = (step: number) => setState((s) => ({ ...s, step }));

  const handleFinish = () => {
    toast({
      title: "Compliance Check Complete",
      description: "All outputs have been pushed to iCM modules. Service authorization is ready.",
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
              <h2 className="font-display font-semibold text-foreground text-sm">Phase 2 — Agent Execution</h2>
              <p className="text-[11px] text-muted-foreground">Case Manager Runtime · Compliance enforcement using published Rule Packs</p>
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
            <Layer2Step1Service
              selectedRulePack={state.selectedRulePack}
              onRulePackSelected={(rp) => setState((s) => ({ ...s, selectedRulePack: rp }))}
              onNext={() => goTo(2)}
            />
          )}
          {state.step === 2 && (
            <Layer2Step2Eligibility
              rulePack={state.selectedRulePack}
              onBack={() => goTo(1)}
              onNext={() => goTo(3)}
            />
          )}
          {state.step === 3 && (
            <Layer2Step3PCP
              rulePack={state.selectedRulePack}
              onBack={() => goTo(2)}
              onNext={() => goTo(4)}
            />
          )}
          {state.step === 4 && (
            <Layer2Step4Limits
              rulePack={state.selectedRulePack}
              onBack={() => goTo(3)}
              onNext={() => goTo(5)}
            />
          )}
          {state.step === 5 && (
            <Layer2Step5Conflicts
              rulePack={state.selectedRulePack}
              onBack={() => goTo(4)}
              onNext={() => goTo(6)}
            />
          )}
          {state.step === 6 && (
            <Layer2Step6Documentation
              rulePack={state.selectedRulePack}
              onBack={() => goTo(5)}
              onNext={() => goTo(7)}
            />
          )}
          {state.step === 7 && (
            <Layer2Step7Push
              rulePack={state.selectedRulePack}
              onBack={() => goTo(6)}
              onFinish={() => goTo(8)}
            />
          )}
          {state.step === 8 && (
            <Layer2Step8Dashboard
              rulePack={state.selectedRulePack}
              onBack={() => goTo(7)}
              onFinish={handleFinish}
            />
          )}
        </div>
      </main>
    </div>
  );
}
