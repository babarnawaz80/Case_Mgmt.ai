import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, User, Sparkles } from "lucide-react";
import { StepIndicator } from "@/components/agentbuilder/StepIndicator";
import { Layer1Step1Upload } from "@/components/layer1/Layer1Step1Upload";
import { Layer1Step2Templates } from "@/components/layer1/Layer1Step2Templates";
import { Layer1Step3DataMapping } from "@/components/layer1/Layer1Step3DataMapping";
import { Layer1Step4ReviewPublish } from "@/components/layer1/Layer1Step4ReviewPublish";
import { UploadedFile, RulePack, ExtractionSummary } from "@/types/rulePack";
import { toast } from "@/hooks/use-toast";

const STEPS = [
  { label: "Upload Guidelines", description: "Parse PDF → Build Rule Packs" },
  { label: "Upload Templates", description: "Org-level doc templates" },
  { label: "Default Data Mapping", description: "Org-wide module defaults" },
  { label: "Review & Publish", description: "Admin approval & publish" },
];

interface ModuleConfig {
  id: string;
  name: string;
  icon: any;
  description: string;
  enabled: boolean;
  fields: string[];
}

export default function RuleLibraryBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [agentName, setAgentName] = useState("");
  const [agentInstructions, setAgentInstructions] = useState("");
  const [templates, setTemplates] = useState<UploadedFile[]>([]);
  const [serviceCodeMapping, setServiceCodeMapping] = useState("");
  const [moduleConfigs, setModuleConfigs] = useState<ModuleConfig[]>([]);
  const [rulePacks] = useState<RulePack[]>([]);
  const [extractionSummary, setExtractionSummary] = useState<ExtractionSummary | null>(null);

  const goTo = (s: number) => setStep(s);

  const handlePublish = () => {
    toast({
      title: "Compliance Engine Published",
      description: "Rule Packs are now frozen and available for runtime agents to use.",
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
            <div className="flex flex-col">
              <h2 className="font-display font-semibold text-foreground text-sm">Create Compliance Engine</h2>
              <p className="text-[11px] text-muted-foreground">Admin Only · Parse guidelines, build rule packs, publish for agents</p>
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
        <div className="max-w-[1000px] mx-auto">
          {step === 1 && (
            <Layer1Step1Upload
              uploadedFiles={uploadedFiles}
              serviceCodeMapping={serviceCodeMapping}
              agentName={agentName}
              agentInstructions={agentInstructions}
              onFilesChange={setUploadedFiles}
              onMappingChange={setServiceCodeMapping}
              onAgentNameChange={setAgentName}
              onAgentInstructionsChange={setAgentInstructions}
              onNext={() => goTo(2)}
            />
          )}
          {step === 2 && (
            <Layer1Step2Templates
              templates={templates}
              onTemplatesChange={setTemplates}
              onBack={() => goTo(1)}
              onNext={() => goTo(3)}
            />
          )}
          {step === 3 && (
            <Layer1Step3DataMapping
              moduleConfigs={moduleConfigs}
              onConfigsChange={setModuleConfigs}
              onBack={() => goTo(2)}
              onNext={() => goTo(4)}
            />
          )}
          {step === 4 && (
            <Layer1Step4ReviewPublish
              rulePacks={rulePacks}
              extractionSummary={extractionSummary}
              onSummaryGenerated={setExtractionSummary}
              onBack={() => goTo(3)}
              onPublish={handlePublish}
            />
          )}
        </div>
      </main>
    </div>
  );
}
