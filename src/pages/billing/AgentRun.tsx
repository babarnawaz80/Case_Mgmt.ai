import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, AlertTriangle, XCircle, Loader2, Sparkles } from 'lucide-react';
import AiBadge from '@/components/billing/AiBadge';

interface PipelineStep {
  name: string;
  ruleRef: string;
  result: string;
  status: 'pass' | 'warning' | 'hard_stop';
  aiRunningText?: string;
}

interface AgentInfo {
  name: string;
  individuals: number;
  streams: string;
  type: 'idd' | 'clinic';
}

const AGENT_MAP: Record<string, AgentInfo> = {
  'pa-1': { name: 'Maryland DDA Waiver Agent', individuals: 127, streams: 'all active funding streams', type: 'idd' },
  'pa-2': { name: 'Texas HHSC Waiver Agent', individuals: 84, streams: 'all active funding streams', type: 'idd' },
  'pa-3': { name: 'Ohio DODD Waiver Agent', individuals: 0, streams: 'all active funding streams', type: 'idd' },
  'pa-4': { name: 'Arc Lexington Clinic Agent', individuals: 43, streams: '43 clinic notes from Emergent AI', type: 'clinic' },
};

const IDD_STEPS: PipelineStep[] = [
  { name: 'Data Pull from iCM', ruleRef: 'Pre-pipeline — attendance records fetched from iCM', result: '127 individuals, 1,847 attendance records pulled', status: 'pass' },
  { name: 'EVV Check', ruleRef: 'Rule 2 — validates clock-in, clock-out, location', result: '127 active, 0 eligibility issues', status: 'pass' },
  { name: 'Auth Check', ruleRef: 'Rule 3 — verifies active auth with units remaining', result: '124 matched, 3 warnings — expiring auths', status: 'warning' },
  { name: 'Schedule Check', ruleRef: 'Rule 1 — confirms valid calendar day for service', result: '1,831 records verified, 16 flagged', status: 'warning' },
  { name: 'Proc & Modifier Resolve', ruleRef: 'Rules 7–8 — resolves procedure code and modifiers', result: 'All codes valid, modifiers auto-applied', status: 'pass' },
  { name: 'Overlap & Daily Cap Check', ruleRef: 'Rules 4–5 — detects conflicts and daily occurrence limits', result: '2 daily cap warnings detected', status: 'warning' },
  { name: 'Doc Sufficiency Check', ruleRef: 'Rule 14 — LLM scores progress note completeness', result: '119 complete, 8 below threshold', status: 'warning' },
  { name: 'Unit Calc & Claims Packaging', ruleRef: 'Rule 9 — converts minutes to units, packages claim', result: '119 clean claims ready, 8 blocked', status: 'pass' },
];

const CLINIC_STEPS: PipelineStep[] = [
  { name: 'Note Pull from Emergent AI', ruleRef: 'Pre-pipeline — signed clinical notes fetched from Emergent AI', result: '43 signed notes pulled, 43 patients', status: 'pass' },
  { name: 'Treatment Plan Check', ruleRef: 'Rule C-1 — verifies active, non-expired treatment plan exists', result: '41 matched, 2 warnings — treatment plans expiring within 14 days', status: 'warning' },
  { name: 'Insurance Eligibility Check', ruleRef: 'Rule C-2 — verifies active coverage and MCO bypass routing', result: '43 active, 0 eligibility issues — 3 routed via Medicaid bypass', status: 'pass' },
  { name: 'CPT Code Validation', ruleRef: 'Rule C-3 — confirms billed CPT matches service type and note', result: 'All codes valid for service type and provider credential', status: 'pass' },
  { name: 'CPT Optimization Check', ruleRef: 'Rule C-4 — AI scans notes for higher-supported billing codes', result: '2 revenue opportunities flagged — higher CPT code may apply', status: 'warning', aiRunningText: '✦ AI is reading note content... Checking CPT code level...' },
  { name: 'Add-On Code Validation', ruleRef: 'Rule C-5 — confirms primary code exists before add-on is allowed', result: 'All add-on codes have valid primary codes present', status: 'pass' },
  { name: 'Doc Sufficiency Check', ruleRef: 'Rule C-7 — LLM scores clinical note completeness', result: '1 note scored below 85% — flagged for review', status: 'warning', aiRunningText: '✦ AI is running this check now... Checking documentation elements...' },
  { name: 'Claims Packaging (837P)', ruleRef: 'Rule C-8 — packages validated claims for clearinghouse submission', result: '40 claims packaged and routed to AI Queue', status: 'pass' },
];

const IDD_AI_MESSAGES = [
  'Reading progress notes...',
  'Checking documentation elements...',
  'Scoring completeness...',
];

const AgentRun = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const agentInfo = AGENT_MAP[id || ''] || AGENT_MAP['pa-1'];
  const isClinic = agentInfo.type === 'clinic';
  const STEPS = isClinic ? CLINIC_STEPS : IDD_STEPS;
  
  // AI step indices: for IDD it's step 6, for clinic steps 4 and 6 have custom AI text
  const getAiStepIndices = () => isClinic ? [4, 6] : [6];
  const aiStepIndices = useMemo(getAiStepIndices, [isClinic]);

  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [aiMessageIndex, setAiMessageIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const startRun = useCallback(() => {
    setIsRunning(true);
    setCurrentStep(0);
    setCompletedSteps([]);
    setIsComplete(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(startRun, 500);
    return () => clearTimeout(timer);
  }, [startRun]);

  useEffect(() => {
    if (!isRunning || currentStep < 0 || currentStep >= STEPS.length) return;

    const isAIStep = aiStepIndices.includes(currentStep);
    const delay = isAIStep ? 3500 : 1200 + Math.random() * 800;

    const timer = setTimeout(() => {
      setCompletedSteps(prev => [...prev, currentStep]);
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        setIsRunning(false);
        setIsComplete(true);
        setCurrentStep(-1);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [currentStep, isRunning, STEPS.length, aiStepIndices]);

  useEffect(() => {
    if (!isClinic && currentStep !== 6) return;
    if (isClinic && !aiStepIndices.includes(currentStep)) return;
    const interval = setInterval(() => {
      setAiMessageIndex(prev => (prev + 1) % IDD_AI_MESSAGES.length);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStep, isClinic, aiStepIndices]);

  const getStepIcon = (index: number) => {
    if (completedSteps.includes(index)) {
      const step = STEPS[index];
      if (step.status === 'pass') return <Check className="h-5 w-5 text-billing-healthy" />;
      if (step.status === 'warning') return <AlertTriangle className="h-5 w-5 text-billing-warning" />;
      return <XCircle className="h-5 w-5 text-billing-at-risk" />;
    }
    if (currentStep === index) return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
    return <span className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center text-xs text-muted-foreground">{index + 1}</span>;
  };

  const summaryClaimsReady = isClinic ? 40 : 119;
  const summaryIssues = isClinic ? 3 : 8;
  const summaryAmount = isClinic ? '$18,420.00' : '$47,230.00';
  const summaryRuleCount = isClinic ? 8 : 14;

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate('/billing/agents')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Agents
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Running: {agentInfo.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Processing {agentInfo.individuals} {isClinic ? 'clinic notes from Emergent AI' : `individuals across ${agentInfo.streams}`}
        </p>
      </div>

      {/* AI Status Banner */}
      {isRunning && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-billing-warning/15 border border-billing-warning/30 animate-pulse">
          <Sparkles className="h-4 w-4 text-billing-warning shrink-0" />
          <span className="text-[13px] font-bold text-billing-warning">
            {isClinic
              ? '✦ AI Agent is running — executing clinic billing compliance checks. No human action required.'
              : '✦ AI Agent is running — automatically executing all compliance rules. No human action required.'}
          </span>
        </div>
      )}
      {isComplete && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-billing-healthy/10 border border-billing-healthy/30">
          <Check className="h-4 w-4 text-billing-healthy shrink-0" />
          <span className="text-[13px] font-bold text-billing-healthy">
            ✦ AI Agent run complete — all {summaryRuleCount} compliance rules executed automatically.
          </span>
        </div>
      )}

      {/* Pipeline steps */}
      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const isActive = currentStep === i;
          const isDone = completedSteps.includes(i);
          const isAIStep = aiStepIndices.includes(i);
          const isPending = !isActive && !isDone;

          return (
            <Card
              key={i}
              className={`p-4 transition-all duration-300 ${
                isActive
                  ? isAIStep
                    ? 'ring-2 ring-billing-warning/50 bg-billing-warning/5 shadow-md border-l-4 border-l-billing-warning'
                    : 'ring-2 ring-primary/50 shadow-md border-l-4 border-l-primary'
                  : isDone
                    ? 'opacity-100'
                    : 'opacity-40'
              }`}
            >
              <div className="flex items-center gap-3">
                {getStepIcon(i)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{step.name}</span>
                    {isDone && <AiBadge tooltip="Executed by AI Agent" />}
                    {isActive && <AiBadge tooltip="AI is running this check" />}
                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                        <Sparkles className="h-3 w-3" />
                        AI
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{step.ruleRef}</p>
                  {isActive && isAIStep && (
                    <p className="text-xs text-billing-warning mt-1 animate-pulse">
                      {step.aiRunningText || `✦ AI is running this check now... ${IDD_AI_MESSAGES[aiMessageIndex]}`}
                    </p>
                  )}
                  {isActive && !isAIStep && (
                    <p className="text-xs text-primary mt-1 animate-pulse">✦ AI is running this check now...</p>
                  )}
                  {isDone && (
                    <p className="text-xs text-muted-foreground mt-1">{step.result}</p>
                  )}
                </div>
                {isDone && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${
                      step.status === 'pass'
                        ? 'bg-billing-healthy/10 text-billing-healthy'
                        : step.status === 'warning'
                          ? 'bg-billing-warning/10 text-billing-warning'
                          : 'bg-billing-at-risk/10 text-billing-at-risk'
                    }`}
                  >
                    {step.status === 'pass' ? 'PASS' : step.status === 'warning' ? 'WARNING' : 'BLOCKED'}
                  </Badge>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Summary panel */}
      {isComplete && (
        <Card className="p-6 space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-billing-healthy/5 border border-billing-healthy/20 text-center">
              <p className="text-3xl font-bold text-billing-healthy">{summaryClaimsReady}</p>
              <p className="text-sm text-foreground font-medium">Claims Ready</p>
              <p className="text-lg font-bold text-foreground mt-1">{summaryAmount}</p>
              <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3 text-billing-warning" /> Verified by AI across all {summaryRuleCount} rules
              </p>
            </div>
            <div className="p-4 rounded-xl bg-billing-warning/5 border border-billing-warning/20 text-center">
              <p className="text-3xl font-bold text-billing-warning">{summaryIssues}</p>
              <p className="text-sm text-foreground font-medium">Issues Need Attention</p>
              <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3 text-billing-warning" /> AI flagged these — review in AI Queue
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => navigate('/billing/individuals')}>
              View Results in Individuals Screen
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate('/billing/runs')}>
              View AI Run Log
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate('/billing/claims')}>
              Go to Claims
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AgentRun;
