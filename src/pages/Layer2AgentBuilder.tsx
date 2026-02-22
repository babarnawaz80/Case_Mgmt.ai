import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Bot, User, Plus, Search, Shield, Database, Settings,
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
import { mockComplianceRuns, FIXED_WORKFLOW_STEPS } from "@/types/agent";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const STEPS = FIXED_WORKFLOW_STEPS.map(s => ({ label: s.name, description: s.description }));

export default function Layer2AgentBuilder() {
  const navigate = useNavigate();
  const [showLanding, setShowLanding] = useState(true);
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
      title: "Compliance Run Complete",
      description: "All outputs have been pushed to iCM modules. Service authorization is ready.",
    });
    navigate("/lifeplan");
  };

  const handleStartNew = () => setShowLanding(false);

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border glass shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => showLanding ? navigate("/lifeplan") : setShowLanding(true)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-foreground text-sm">Agent Execution</h2>
              <p className="text-[11px] text-muted-foreground">Case Manager Runtime · Compliance enforcement using published engines</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/lifeplan")} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs transition-all border border-border">
            <Settings className="w-3.5 h-3.5" /> Agent Settings
          </motion.button>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </header>

      {showLanding ? (
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-[1000px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">Compliance Runs</h2>
                <p className="text-sm text-muted-foreground mt-0.5">View existing compliance runs or start a new one.</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStartNew}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <Plus className="h-4 w-4" /> New Compliance Run
              </motion.button>
            </div>

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input placeholder="Search compliance runs..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide">Individual</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide">Service</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide">Engine</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground text-xs uppercase tracking-wide">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {mockComplianceRuns.map((run) => (
                    <tr key={run.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer" onClick={handleStartNew}>
                      <td className="px-4 py-3 font-medium text-foreground flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        {run.individual}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{run.service}</td>
                      <td className="px-4 py-3 text-muted-foreground">{run.date}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {run.engineName} v{run.engineVersion}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          run.status === "Complete" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"
                        )}>{run.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          run.compliance === "Pass" ? "bg-primary/10 text-primary" :
                          run.compliance === "Flagged" ? "bg-destructive/10 text-destructive" :
                          "bg-warning/10 text-warning"
                        )}>{run.compliance}</span>
                        {run.overrides.length > 0 && (
                          <span className="ml-1 text-[9px] text-warning font-medium">({run.overrides.length} override{run.overrides.length > 1 ? "s" : ""})</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      ) : (
        <>
          {/* Data source transparency banner */}
          <div className="px-6 py-2 bg-muted/30 border-b border-border/40">
            <div className="max-w-[1200px] mx-auto flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                All compliance checks pull <span className="font-medium text-foreground">real-time data from iCM modules</span>. AI does not guess — it reads structured data.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-border/60 bg-card/50 overflow-x-auto">
            <div className="max-w-[1200px] mx-auto min-w-[700px]">
              <StepIndicator currentStep={state.step} steps={STEPS} />
            </div>
          </div>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-[1000px] mx-auto">
              {state.step === 1 && <Layer2Step1Service selectedRulePack={state.selectedRulePack} onRulePackSelected={(rp) => setState((s) => ({ ...s, selectedRulePack: rp }))} onNext={() => goTo(2)} />}
              {state.step === 2 && <Layer2Step2Eligibility rulePack={state.selectedRulePack} onBack={() => goTo(1)} onNext={() => goTo(3)} />}
              {state.step === 3 && <Layer2Step3PCP rulePack={state.selectedRulePack} onBack={() => goTo(2)} onNext={() => goTo(4)} />}
              {state.step === 4 && <Layer2Step4Limits rulePack={state.selectedRulePack} onBack={() => goTo(3)} onNext={() => goTo(5)} />}
              {state.step === 5 && <Layer2Step5Conflicts rulePack={state.selectedRulePack} onBack={() => goTo(4)} onNext={() => goTo(6)} />}
              {state.step === 6 && <Layer2Step6Documentation rulePack={state.selectedRulePack} onBack={() => goTo(5)} onNext={() => goTo(7)} />}
              {state.step === 7 && <Layer2Step7Push rulePack={state.selectedRulePack} onBack={() => goTo(6)} onFinish={() => goTo(8)} />}
              {state.step === 8 && <Layer2Step8Dashboard rulePack={state.selectedRulePack} onBack={() => goTo(7)} onFinish={handleFinish} />}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
