import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, RefreshCw, Sparkles, Loader2, Send, Bot, User } from 'lucide-react';
import { toast } from 'sonner';
import { useBillingContext } from '@/contexts/BillingContext';

const STATES = [
  { value: 'Maryland', label: 'Maryland (MD)' },
  { value: 'Illinois', label: 'Illinois (IL)' },
  { value: 'Ohio', label: 'Ohio (OH)' },
  { value: 'Florida', label: 'Florida (FL)' },
  { value: 'Iowa', label: 'Iowa (IA)' },
  { value: 'New York', label: 'New York (NY)' },
  { value: 'Pennsylvania', label: 'Pennsylvania (PA)' },
];

function generatePrompt(state: string, engineName: string): string {
  const statePrompts: Record<string, string> = {
    Maryland: `You are a Maryland DDA billing compliance agent connected to iCM.

You validate attendance records against 14 rules in the following sequence:

Per-Attendance Rules (fire on every record):
1. SCHEDULE_CHECK — Block attendance on weekends and Maryland DDA holiday schedule
2. EVV_CHECK — Validate EVV clock-in, clock-out, and location verification fields
3. AUTH_CHECK — Confirm active DDA authorization with sufficient units remaining
4. OVERLAP_CHECK — Detect same-day service conflicts for the same participant
5. DAILY_OCCURRENCE_CAP — Enforce per-day service occurrence limits
6. SERVICE_CLASSIFICATION — Derive with/without day service label from hours outside home
7. PROC_RESOLVE — Resolve MD DDA procedure code from SERVICE_PROC_MAPPING
8. MODIFIER_RESOLVE — Assign required modifiers to resolved procedure code
9. UNIT_CALC — Convert minutes to billable units at 15-min intervals using FLOOR rounding

Per-Period Rules (fire at billing period close):
10. FREQUENCY_CHECK — Require minimum 2 service deliveries per month before billing unlocks
11. CONSECUTIVE_DAY_CAP — Track and cap consecutive billable day streaks
12. RATE_TIER_SELECT — Select rate tier based on days-present thresholds
13. PERIOD_BILLING_CALC — Aggregate period-level units and calculate billed amount
14. DOC_SUFFICIENCY_CHECK — Score progress note completeness via LLM. Hard stop below 60%. Warning 60–85%. Pass above 85%.

Route outcomes to AI Queue as: APPROVED (Clean), HOLD (Needs Review), REJECTED (Blocked), DEFERRED (awaiting period close).

All rule thresholds and parameters are read from the BILLING_RULE table. Do not hardcode any state-specific logic.`,

    Illinois: `You are an Illinois ROCS billing compliance agent connected to iCM.

You validate attendance records against 14 rules in the following sequence:

Per-Attendance Rules (fire on every record):
1. SCHEDULE_CHECK — Block attendance on Illinois state holidays and non-scheduled days
2. EVV_CHECK — Validate EVV clock-in, clock-out, and GPS location per HFS requirements
3. AUTH_CHECK — Confirm active ROCS authorization with sufficient units remaining
4. OVERLAP_CHECK — Detect same-day service conflicts for the same participant
5. DAILY_OCCURRENCE_CAP — Enforce per-day service occurrence limits per ROCS guidelines
6. SERVICE_CLASSIFICATION — Classify Community Day Services vs Residential support hours
7. PROC_RESOLVE — Resolve IL ROCS procedure code from SERVICE_PROC_MAPPING
8. MODIFIER_RESOLVE — Assign required modifiers including GT for telehealth
9. UNIT_CALC — Convert minutes to billable units at 15-min intervals using ROUND rounding

Per-Period Rules (fire at billing period close):
10. FREQUENCY_CHECK — Require minimum service deliveries per billing period
11. CONSECUTIVE_DAY_CAP — Track consecutive billable day streaks per IL caps
12. RATE_TIER_SELECT — Select rate tier based on acuity level and service type
13. PERIOD_BILLING_CALC — Aggregate period-level units and calculate billed amount
14. DOC_SUFFICIENCY_CHECK — Score progress note completeness via LLM. Hard stop below 60%. Warning 60–85%. Pass above 85%.

Route outcomes to AI Queue as: APPROVED (Clean), HOLD (Needs Review), REJECTED (Blocked), DEFERRED (awaiting period close).

All rule thresholds and parameters are read from the BILLING_RULE table. Do not hardcode any state-specific logic.`,

    Ohio: `You are an Ohio DODD Medicaid billing compliance agent connected to iCM.

You validate attendance records against 14 rules in the following sequence:

Per-Attendance Rules (fire on every record):
1. SCHEDULE_CHECK — Block attendance on Ohio state holidays and verify ISP-scheduled days
2. EVV_CHECK — Validate EVV clock-in, clock-out, and location per ODM requirements
3. AUTH_CHECK — Confirm active IO/Level 1 Waiver authorization with sufficient units
4. OVERLAP_CHECK — Detect same-day service conflicts for the same participant
5. DAILY_OCCURRENCE_CAP — Enforce per-day occurrence limits per Ohio Medicaid rules
6. SERVICE_CLASSIFICATION — Classify Adult Day Support vs Vocational Habilitation
7. PROC_RESOLVE — Resolve OH Medicaid procedure code from SERVICE_PROC_MAPPING
8. MODIFIER_RESOLVE — Assign required modifiers per Ohio billing manual
9. UNIT_CALC — Convert minutes to billable units at 15-min intervals using ROUND rounding

Per-Period Rules (fire at billing period close):
10. FREQUENCY_CHECK — Require minimum 2 service deliveries per month
11. CONSECUTIVE_DAY_CAP — Track and cap consecutive billable day streaks
12. RATE_TIER_SELECT — Select rate tier based on acuity and service intensity
13. PERIOD_BILLING_CALC — Aggregate period-level units and calculate billed amount
14. DOC_SUFFICIENCY_CHECK — Score progress note completeness via LLM. Hard stop below 60%. Warning 60–85%. Pass above 85%.

Route outcomes to AI Queue as: APPROVED (Clean), HOLD (Needs Review), REJECTED (Blocked), DEFERRED (awaiting period close).

All rule thresholds and parameters are read from the BILLING_RULE table. Do not hardcode any state-specific logic.`,

    Florida: `You are a Florida iBudget billing compliance agent connected to iCM.

You validate attendance records against 14 rules in the following sequence:

Per-Attendance Rules (fire on every record):
1. SCHEDULE_CHECK — Block attendance on Florida state holidays and non-ISP days
2. EVV_CHECK — Validate EVV clock-in, clock-out, and GPS location per APD requirements
3. AUTH_CHECK — Confirm active iBudget authorization with sufficient cost plan balance
4. OVERLAP_CHECK — Detect same-day service conflicts for the same participant
5. DAILY_OCCURRENCE_CAP — Enforce per-day caps per Florida iBudget cost plan limits
6. SERVICE_CLASSIFICATION — Classify Companion vs Personal Supports vs ADT
7. PROC_RESOLVE — Resolve FL procedure code from SERVICE_PROC_MAPPING
8. MODIFIER_RESOLVE — Assign required modifiers per APD billing manual
9. UNIT_CALC — Convert minutes to billable units at 15-min intervals using FLOOR rounding

Per-Period Rules (fire at billing period close):
10. FREQUENCY_CHECK — Require minimum service deliveries per cost plan period
11. CONSECUTIVE_DAY_CAP — Track and cap consecutive billable days per FL rules
12. RATE_TIER_SELECT — Select rate tier based on individual cost plan allocation
13. PERIOD_BILLING_CALC — Aggregate period-level units and calculate billed amount
14. DOC_SUFFICIENCY_CHECK — Score progress note completeness via LLM. Hard stop below 60%. Warning 60–85%. Pass above 85%.

Route outcomes to AI Queue as: APPROVED (Clean), HOLD (Needs Review), REJECTED (Blocked), DEFERRED (awaiting period close).

All rule thresholds and parameters are read from the BILLING_RULE table. Do not hardcode any state-specific logic.`,

    Iowa: `You are an Iowa HCBS billing compliance agent connected to iCM.

You validate attendance records against 14 rules in the following sequence:

Per-Attendance Rules (fire on every record):
1. SCHEDULE_CHECK — Block attendance on Iowa state holidays and non-scheduled days
2. EVV_CHECK — Validate EVV clock-in, clock-out, and location per IME requirements
3. AUTH_CHECK — Confirm active HCBS waiver authorization with sufficient units
4. OVERLAP_CHECK — Detect same-day service conflicts for the same participant
5. DAILY_OCCURRENCE_CAP — Enforce per-day occurrence limits per Iowa Medicaid
6. SERVICE_CLASSIFICATION — Classify Day Habilitation vs Supported Community Living
7. PROC_RESOLVE — Resolve IA procedure code from SERVICE_PROC_MAPPING
8. MODIFIER_RESOLVE — Assign required modifiers per Iowa billing manual
9. UNIT_CALC — Convert minutes to billable units using Iowa pooled minutes rule

Per-Period Rules (fire at billing period close):
10. FREQUENCY_CHECK — Require minimum service deliveries per month
11. CONSECUTIVE_DAY_CAP — Track and cap consecutive billable day streaks
12. RATE_TIER_SELECT — Select rate tier based on service intensity and pooled calculation
13. PERIOD_BILLING_CALC — Aggregate period-level pooled minutes and calculate billed amount
14. DOC_SUFFICIENCY_CHECK — Score progress note completeness via LLM. Hard stop below 60%. Warning 60–85%. Pass above 85%.

Route outcomes to AI Queue as: APPROVED (Clean), HOLD (Needs Review), REJECTED (Blocked), DEFERRED (awaiting period close).

All rule thresholds and parameters are read from the BILLING_RULE table. Do not hardcode any state-specific logic.`,

    'New York': `You are a New York OPWDD billing compliance agent connected to iCM.

You validate attendance records against 14 rules in the following sequence:

Per-Attendance Rules (fire on every record):
1. SCHEDULE_CHECK — Block attendance on NY state holidays and verify ISP schedule
2. EVV_CHECK — Validate EVV clock-in, clock-out, and location per OPWDD requirements
3. AUTH_CHECK — Confirm active OPWDD authorization with sufficient units remaining
4. OVERLAP_CHECK — Detect same-day service conflicts for the same participant
5. DAILY_OCCURRENCE_CAP — Enforce per-day occurrence limits per NY Medicaid rules
6. SERVICE_CLASSIFICATION — Classify Day Hab vs Community Hab vs Respite
7. PROC_RESOLVE — Resolve NY OPWDD procedure code from SERVICE_PROC_MAPPING
8. MODIFIER_RESOLVE — Assign required modifiers per OPWDD billing manual
9. UNIT_CALC — Convert minutes to billable units using NY half-month rule

Per-Period Rules (fire at billing period close):
10. FREQUENCY_CHECK — Apply NY half-month billing rule for mid-period enrollments
11. CONSECUTIVE_DAY_CAP — Track and cap consecutive billable day streaks
12. RATE_TIER_SELECT — Select rate tier based on OPWDD rate methodology
13. PERIOD_BILLING_CALC — Aggregate period-level units with half-month adjustment
14. DOC_SUFFICIENCY_CHECK — Score progress note completeness via LLM. Hard stop below 60%. Warning 60–85%. Pass above 85%.

Route outcomes to AI Queue as: APPROVED (Clean), HOLD (Needs Review), REJECTED (Blocked), DEFERRED (awaiting period close).

All rule thresholds and parameters are read from the BILLING_RULE table. Do not hardcode any state-specific logic.`,

    Pennsylvania: `You are a Pennsylvania ODP Medicaid billing compliance agent connected to iCM.

You validate attendance records against 14 rules in the following sequence:

Per-Attendance Rules (fire on every record):
1. SCHEDULE_CHECK — Block attendance on PA state holidays and non-ISP scheduled days
2. EVV_CHECK — Validate EVV clock-in, clock-out, and location per DHS requirements
3. AUTH_CHECK — Confirm active ODP Consolidated/P-FDS waiver authorization
4. OVERLAP_CHECK — Detect same-day service conflicts for the same participant
5. DAILY_OCCURRENCE_CAP — Enforce per-day occurrence limits per PA Medicaid rules
6. SERVICE_CLASSIFICATION — Classify Community Participation vs Day Hab vs Prevocational
7. PROC_RESOLVE — Resolve PA ODP procedure code from SERVICE_PROC_MAPPING
8. MODIFIER_RESOLVE — Assign required modifiers per ODP billing manual
9. UNIT_CALC — Convert minutes to billable units at 15-min intervals using ROUND rounding

Per-Period Rules (fire at billing period close):
10. FREQUENCY_CHECK — Require minimum service deliveries per authorization period
11. CONSECUTIVE_DAY_CAP — Track and cap consecutive billable day streaks per PA rules
12. RATE_TIER_SELECT — Select rate tier based on PA fee schedule and service intensity
13. PERIOD_BILLING_CALC — Aggregate period-level units and calculate billed amount
14. DOC_SUFFICIENCY_CHECK — Score progress note completeness via LLM. Hard stop below 60%. Warning 60–85%. Pass above 85%.

Route outcomes to AI Queue as: APPROVED (Clean), HOLD (Needs Review), REJECTED (Blocked), DEFERRED (awaiting period close).

All rule thresholds and parameters are read from the BILLING_RULE table. Do not hardcode any state-specific logic.`,
  };

  return statePrompts[state] || `You are a ${state} billing compliance agent connected to iCM.\n\nConfigure rules based on the selected guidelines engine: ${engineName}.`;
}

function generateDescription(state: string, engineName: string): string {
  const stateDescs: Record<string, string> = {
    Maryland: `Validates Maryland DDA attendance records through 14 billing rules and routes outcomes to the AI Queue.`,
    Illinois: `Validates Illinois ROCS attendance records through 14 billing rules and routes outcomes to the AI Queue.`,
    Ohio: `Validates Ohio DODD Medicaid attendance records through 14 billing rules and routes outcomes to the AI Queue.`,
    Florida: `Validates Florida iBudget attendance records through 14 billing rules and routes outcomes to the AI Queue.`,
    Iowa: `Validates Iowa HCBS attendance records through 14 billing rules and routes outcomes to the AI Queue.`,
    'New York': `Validates New York OPWDD attendance records through 14 billing rules and routes outcomes to the AI Queue.`,
    Pennsylvania: `Validates Pennsylvania ODP Medicaid attendance records through 14 billing rules and routes outcomes to the AI Queue.`,
  };
  return stateDescs[state] || `Validates ${state} attendance records through billing rules and routes outcomes to the AI Queue.`;
}

function generateAgentName(state: string, engineName: string): string {
  const year = new Date().getFullYear();
  const stateNames: Record<string, string> = {
    Maryland: 'Maryland DDA',
    Illinois: 'Illinois ROCS',
    Ohio: 'Ohio Medicaid',
    Florida: 'Florida iBudget',
    Iowa: 'Iowa HCBS',
    'New York': 'New York OPWDD',
    Pennsylvania: 'Pennsylvania ODP',
  };
  return `${stateNames[state] || state} ${year} Agent`;
}

const CLINIC_PROMPT = `You are a clinic billing compliance agent for an Article 16 / Article 31 clinic. You validate claims generated from signed clinical notes in Emergent AI and route outcomes to the AI Queue.

Run the following checks in order for every clinic claim:

C-1. TREATMENT_PLAN_CHECK — Verify that an active, non-expired treatment plan exists for this patient. Treatment plan must be dated within the last 90 days. If missing or expired: BLOCK the claim. This is a hard stop — no exceptions.

C-2. INSURANCE_ELIGIBILITY_CHECK — Verify the patient has active insurance coverage on the date of service. Check primary insurance first. If a managed care plan (MCO) is on the zero-fill bypass list, route directly to Medicaid — do not submit to the MCO.

C-3. CPT_CODE_VALIDATION — Confirm the billed CPT code matches the service type, provider credential, and session length documented in the signed note. If the code does not match: BLOCK.

C-4. CPT_OPTIMIZATION_CHECK — Read the content of the signed note and compare it against the billed CPT code level. If the note supports a higher-level CPT code than the one selected (e.g. note supports 99413 but 99412 was billed), flag as REVENUE OPPORTUNITY in the AI Queue. Do not block — flag for billing coordinator review.

C-5. ADDON_CODE_VALIDATION — If an add-on CPT code is present on the claim, verify that the required primary procedure code is also present. If the primary code is missing: BLOCK.

C-6. PRIMARY_TO_SECONDARY_CHECK — If a primary private insurance is on file, confirm the claim is routed to primary first. If a prior denial from primary exists on record, queue the claim for Medicaid secondary submission.

C-7. DOC_SUFFICIENCY_CHECK — Score the signed clinical note for completeness and medical necessity documentation using LLM. Below 60%: BLOCK. 60–85%: HOLD (Needs Review). Above 85%: PASS.

C-8. CLAIMS_PACKAGING — Package the validated claim as an 837P with the correct procedure codes, modifiers, rendering provider NPI, place of service code, and diagnosis pointers. Route to AI Queue.

Route all outcomes to AI Queue as: APPROVED (Clean), HOLD (Needs Review), REJECTED (Blocked).

All rule thresholds and parameters are read from the BILLING_RULE table tagged claim_type = clinic. Do not apply IDD waiver rules to clinic claims.`;

const AgentCreate = () => {
  const navigate = useNavigate();
  const { engines } = useBillingContext();

  const [agentType, setAgentType] = useState<'idd' | 'clinic'>('idd');
  const [selectedState, setSelectedState] = useState('');
  const [engineId, setEngineId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerPipeline, setTriggerPipeline] = useState('per-attendance');
  const [autoMonitor, setAutoMonitor] = useState(true);
  const [applyMode, setApplyMode] = useState('manual');
  const [agentPrompt, setAgentPrompt] = useState('');
  
  // Reset fields when agent type changes
  useEffect(() => {
    setSelectedState('');
    setEngineId('');
    setName('');
    setDescription('');
    setAgentPrompt('');
    setChatMessages([]);
    setTriggerPipeline(agentType === 'clinic' ? 'per-note-sign' : 'per-attendance');
  }, [agentType]);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const publishedEngines = useMemo(
    () => engines.filter(e => e.status === 'published' && (!selectedState || e.state === selectedState)),
    [engines, selectedState]
  );

  const selectedEngine = useMemo(
    () => engines.find(e => e.id === engineId),
    [engines, engineId]
  );

  // Reset engine when state changes
  useEffect(() => {
    setEngineId('');
    setName('');
    setDescription('');
    setAgentPrompt('');
    setChatMessages([]);
  }, [selectedState]);

  // Auto-fill when engine is selected
  useEffect(() => {
    if (selectedEngine && selectedState) {
      if (agentType === 'clinic') {
        const clinicPrompt = CLINIC_PROMPT;
        setName('Arc Lexington Clinic Agent');
        setDescription('Validates clinic claims generated from signed clinical notes in Emergent AI and routes outcomes to the AI Queue.');
        setAgentPrompt(clinicPrompt);
        setChatMessages([{ role: 'ai', content: clinicPrompt }]);
      } else {
        const prompt = generatePrompt(selectedState, selectedEngine.name);
        setName(generateAgentName(selectedState, selectedEngine.name));
        setDescription(generateDescription(selectedState, selectedEngine.name));
        setAgentPrompt(prompt);
        setChatMessages([{ role: 'ai', content: prompt }]);
      }
    }
  }, [selectedEngine, selectedState, agentType]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, aiTyping]);

  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = () => {
    if (selectedEngine && selectedState) {
      setRegenerating(true);
      setTimeout(() => {
        const prompt = generatePrompt(selectedState, selectedEngine.name);
        setAgentPrompt(prompt);
        setDescription(generateDescription(selectedState, selectedEngine.name));
        setChatMessages([{ role: 'ai', content: prompt }]);
        setRegenerating(false);
        toast.success('Prompt regenerated from guidelines.');
      }, 400);
    }
  };

  const handleChatSend = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setAiTyping(true);

    // Mock AI response — simulates updating the prompt based on user instruction
    setTimeout(() => {
      let updatedPrompt = agentPrompt;

      // Simple mock: append the user's instruction as a new rule/modification
      if (msg.toLowerCase().includes('remove') || msg.toLowerCase().includes('delete')) {
        updatedPrompt += `\n\n[Modified]: Removed per user request — "${msg}"`;
      } else if (msg.toLowerCase().includes('add') || msg.toLowerCase().includes('include')) {
        updatedPrompt += `\n\n[Added]: ${msg}`;
      } else if (msg.toLowerCase().includes('change') || msg.toLowerCase().includes('update')) {
        updatedPrompt += `\n\n[Updated]: ${msg}`;
      } else {
        updatedPrompt += `\n\n[Instruction Applied]: ${msg}`;
      }

      setAgentPrompt(updatedPrompt);
      const aiResponse = `✓ Done. I've updated the agent prompt based on your instruction: "${msg}"\n\nThe prompt now reflects this change. You can continue refining or click Create Agent when ready.`;
      setChatMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
      setAiTyping(false);
    }, 800);
  };

  const canSave = selectedState && engineId && name.trim();

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Button variant="ghost" size="sm" onClick={() => navigate('/billing/agents')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Create Agent</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-[72px]">Configure a state billing compliance agent powered by your published guidelines</p>
      </div>

      {/* Section 0 — Agent Type */}
      <Card className="p-6">
        <Label className="mb-3 block">Agent Type</Label>
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
          <button
            onClick={() => setAgentType('idd')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              agentType === 'idd'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            IDD / Waiver
          </button>
          <button
            onClick={() => setAgentType('clinic')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              agentType === 'clinic'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Clinic
          </button>
        </div>
      </Card>

      {/* Section 1 — State Selection */}
      <Card className="p-6">
        <Label className="mb-2 block">{agentType === 'clinic' ? 'State / Program Type' : 'State'}</Label>
        <Select value={selectedState} onValueChange={setSelectedState}>
          <SelectTrigger><SelectValue placeholder="Select a state..." /></SelectTrigger>
          <SelectContent>
            {STATES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Section 2 — Guidelines Engine */}
      {selectedState && (
        <Card className="p-6">
          <Label className="mb-2 block">Guidelines Engine (Published Only)</Label>
          <Select value={engineId} onValueChange={setEngineId}>
            <SelectTrigger>
              <SelectValue placeholder={agentType === 'clinic' ? 'Select a published clinic billing guideline (e.g. Article 16, Article 31)' : 'Select published guidelines...'} />
            </SelectTrigger>
            <SelectContent>
              {publishedEngines.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name} v{e.version}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1.5">Only published guideline sets are available. Go to Compliance Center to publish a draft.</p>
        </Card>
      )}

      {/* Section 3 — Agent Configuration */}
      {engineId && (
        <Card className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Agent Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Maryland DDA 2026 Agent" />
            </div>
            <div>
              <Label className="mb-1.5 block">Trigger Pipeline</Label>
              <Select value={triggerPipeline} onValueChange={setTriggerPipeline}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {agentType === 'clinic' ? (
                    <>
                      <SelectItem value="per-note-sign">Per-Note-Sign Trigger</SelectItem>
                      <SelectItem value="manual-only">Manual Only</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="per-attendance">Per-Attendance Pipeline</SelectItem>
                      <SelectItem value="per-period">Per-Period Pipeline</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Description</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what this agent does..."
              className="min-h-[60px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between col-span-1 border border-border rounded-md p-3">
              <div>
                <Label>Auto-Monitor</Label>
                <p className="text-xs text-muted-foreground">
                  {agentType === 'clinic'
                    ? 'Automatically run when a note is signed and saved in Emergent AI'
                    : 'Automatically run when attendance reaches trigger stage'}
                </p>
              </div>
              <Switch checked={autoMonitor} onCheckedChange={setAutoMonitor} />
            </div>
            <div>
              <Label className="mb-1.5 block">Apply Mode</Label>
              <Select value={applyMode} onValueChange={setApplyMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (default)</SelectItem>
                  <SelectItem value="semi-automatic">Semi-Automatic</SelectItem>
                  <SelectItem value="fully-automatic">Fully Automatic</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">All modes still require human confirmation before writes.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Section 4 — Agent Prompt Chat */}
      {engineId && (
        <Card className="overflow-hidden">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <Label className="block">Agent Prompt</Label>
              <Badge variant="secondary" className="text-xs gap-1 ml-1">
                <Sparkles className="h-3 w-3" /> AI Generated
              </Badge>
              {agentType === 'clinic' && (
                <span className="text-[10px] text-muted-foreground ml-1">Generated from your published clinic billing guidelines</span>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRegenerate} disabled={regenerating}>
                    {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Regenerate prompt from guidelines</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="h-[400px] px-5 py-4">
            <div className="space-y-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : agentType === 'clinic'
                        ? 'text-foreground'
                        : 'text-foreground'
                  }`} style={msg.role === 'ai' ? { backgroundColor: agentType === 'clinic' ? '#F0FDFA' : '#EEF2FF' } : undefined}>
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {aiTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="bg-accent/40 rounded-lg px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="border-t border-border px-4 py-3">
            <form
              onSubmit={e => { e.preventDefault(); handleChatSend(); }}
              className="flex items-center gap-2"
            >
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder={agentType === 'clinic' ? "Type to refine the prompt... e.g. 'Add a telehealth modifier rule' or 'Require prior auth for psychiatry visits'" : "Type to refine the prompt... e.g. 'Add a telehealth modifier rule'"}
                className="flex-1"
                disabled={aiTyping}
              />
              <Button type="submit" size="icon" disabled={!chatInput.trim() || aiTyping}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">Chat to refine the prompt. It's saved with the agent and can be updated anytime from agent settings.</p>
          </div>
        </Card>
      )}

      {/* Section 5 — Create Button */}
      {engineId && (
        <Button className="w-full" disabled={!canSave} onClick={() => navigate('/billing/agents')}>
          Create Agent
        </Button>
      )}
    </div>
  );
};

export default AgentCreate;
