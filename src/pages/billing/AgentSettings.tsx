import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Lock, CheckCircle2, AlertTriangle, Circle, Sparkles, Info, Zap } from 'lucide-react';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

const FUNDING_STREAMS = ['DDA Community', 'DDA Residential', 'HHSC CLASS', 'HHSC HCS', 'IO Waiver', 'Level 1'];

const AGENT_NAMES: Record<string, string> = {
  'pa-1': 'Maryland DDA Waiver Agent',
  'pa-2': 'Texas HHSC Waiver Agent',
  'pa-3': 'Ohio DODD Waiver Agent',
};

const DEFAULT_CUSTOM_INSTRUCTIONS = `For clinic claims (Article 16), verify that an active treatment plan exists before allowing any claim to proceed. If expired, block the claim.

If a managed care plan is on the zero-fill bypass list, route the claim directly to Medicaid — do not submit to the MCO.

If a patient has a primary private insurance on file, bill primary first. Only queue for Medicaid secondary after a denial is received.

Flag any clinic claim where the billed CPT code may be supported at a higher level based on note content. Surface as a Revenue Opportunity in the AI Queue.

If authorization units remaining fall below 15%, send an alert before the claim is submitted — do not auto-submit.`;

const AgentSettings = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const agentName = AGENT_NAMES[id || ''] || 'Agent';

  const [triggerType, setTriggerType] = useState('nightly');
  const [scheduleTime, setScheduleTime] = useState('02:00');
  const [selectedStreams, setSelectedStreams] = useState<string[]>(['DDA Community', 'DDA Residential']);
  const [processAll, setProcessAll] = useState(true);

  const [autoModifiers, setAutoModifiers] = useState(true);
  const [autoUnits, setAutoUnits] = useState(true);
  const [autoAuth, setAutoAuth] = useState(true);
  const [flagDocs] = useState(true);
  const [flagExpiredAuth] = useState(true);

  const [notifyComplete, setNotifyComplete] = useState(true);
  const [alertHardStop, setAlertHardStop] = useState(true);
  const [alertLowAuth, setAlertLowAuth] = useState(true);

  // Attendance Pipeline state
  const [attAutoRun, setAttAutoRun] = useState(true);
  const [attFrequency, setAttFrequency] = useState('nightly');
  const [attRunTime, setAttRunTime] = useState('02:00');
  const [attApplyMode, setAttApplyMode] = useState('semi-automatic');

  // Auto-Submission state
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [submitCadence, setSubmitCadence] = useState('nightly');
  const [submitTime, setSubmitTime] = useState('00:00');
  const [varianceThreshold, setVarianceThreshold] = useState(10);
  const [varianceAction, setVarianceAction] = useState('hold');

  // Period Pipeline state
  const [perAutoRun, setPerAutoRun] = useState(true);
  const [perTrigger, setPerTrigger] = useState('auto-detect');
  const [perFixedDay, setPerFixedDay] = useState(1);
  const [perPreview, setPerPreview] = useState(true);
  const [perApplyMode, setPerApplyMode] = useState('manual');

  const toggleStream = (stream: string) => {
    setSelectedStreams(prev =>
      prev.includes(stream) ? prev.filter(s => s !== stream) : [...prev, stream]
    );
  };

  const bothOn = attAutoRun && perAutoRun;
  const bothOff = !attAutoRun && !perAutoRun;

  return (
    <div className="p-8 space-y-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate('/billing/agents')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Agents
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{agentName} — Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure trigger, scope, auto-fix behavior, and notifications</p>
      </div>

      {/* Trigger Settings */}
      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Trigger Settings</h2>
        <div>
          <Label>Trigger Type</Label>
          <Select value={triggerType} onValueChange={setTriggerType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nightly">Nightly Schedule</SelectItem>
              <SelectItem value="post_supervisor">Post-Supervisor Approval</SelectItem>
              <SelectItem value="post_biller">Post-Biller Approval</SelectItem>
              <SelectItem value="manual">Manual Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {triggerType === 'nightly' && (
          <div>
            <Label>Run Time</Label>
            <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="w-40" />
          </div>
        )}

        {(triggerType === 'post_supervisor' || triggerType === 'post_biller') && (
          <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            Agent will run automatically when attendance reaches this approval stage in iCM.
          </p>
        )}
      </Card>

      {/* Scope Settings */}
      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Scope Settings</h2>
        <div>
          <Label className="mb-2 block">Funding Streams</Label>
          <div className="flex flex-wrap gap-2">
            {FUNDING_STREAMS.map(stream => (
              <Badge
                key={stream}
                variant={selectedStreams.includes(stream) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleStream(stream)}
              >
                {stream}
              </Badge>
            ))}
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label>Process all active individuals</Label>
            <p className="text-xs text-muted-foreground">Turn off to select specific individuals</p>
          </div>
          <Switch checked={processAll} onCheckedChange={setProcessAll} />
        </div>
      </Card>

      {/* Auto-Fix Settings */}
      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Auto-Fix Settings</h2>
        <p className="text-xs text-muted-foreground">What the agent fixes automatically</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Auto-apply correct modifiers</Label>
            <Switch checked={autoModifiers} onCheckedChange={setAutoModifiers} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Auto-calculate billable units with rounding</Label>
            <Switch checked={autoUnits} onCheckedChange={setAutoUnits} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Auto-match authorization to service</Label>
            <Switch checked={autoAuth} onCheckedChange={setAutoAuth} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Flag missing documentation for human review</Label>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <Switch checked={flagDocs} disabled />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Flag expired authorizations for human review</Label>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <Switch checked={flagExpiredAuth} disabled />
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Notification Settings</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Notify billing staff when run completes</Label>
            <Switch checked={notifyComplete} onCheckedChange={setNotifyComplete} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Alert when hard stop detected</Label>
            <Switch checked={alertHardStop} onCheckedChange={setAlertHardStop} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Alert when authorization below 20% remaining</Label>
            <Switch checked={alertLowAuth} onCheckedChange={setAlertLowAuth} />
          </div>
        </div>
      </Card>

      {/* Automation & Scheduling */}
      <Card className="p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">Automation & Scheduling</h2>
          <p className="text-xs text-muted-foreground mt-1">Configure when each pipeline runs automatically. Both pipelines can run on autopilot once set up.</p>
        </div>

        {/* Autopilot Status Banner */}
        {bothOn && (
          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>✓ Autopilot is active. Both pipelines are scheduled and will run automatically. You will be notified of any issues requiring attention.</span>
          </div>
        )}
        {!bothOn && !bothOff && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>⚠️ Autopilot is partially off. One or more pipelines require manual triggering. Turn on Auto-Run for both pipelines to enable full autopilot.</span>
          </div>
        )}
        {bothOff && (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
            <Circle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>○ Autopilot is off. All pipeline runs must be triggered manually from the agent card.</span>
          </div>
        )}

        {/* Attendance Pipeline */}
        <div className="space-y-4 rounded-lg border border-border p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Attendance Pipeline</h3>
            <p className="text-xs text-muted-foreground">Validates individual attendance records as they are submitted (Rules 1–9). Recommended to run nightly or multiple times daily.</p>
          </div>

          <div className="flex items-center justify-between">
            <Label>Enable Auto-Run</Label>
            <Switch checked={attAutoRun} onCheckedChange={setAttAutoRun} />
          </div>

          <div className={`space-y-4 ${!attAutoRun ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <Label className="mb-1.5 block">Run Frequency</Label>
              <Select value={attFrequency} onValueChange={setAttFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="every-6h">Every 6 hours</SelectItem>
                  <SelectItem value="every-12h">Every 12 hours</SelectItem>
                  <SelectItem value="nightly">Nightly (once per day)</SelectItem>
                  <SelectItem value="custom">Custom time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(attFrequency === 'nightly' || attFrequency === 'custom') && (
              <div>
                <Label className="mb-1.5 block">Run Time</Label>
                <Input type="time" value={attRunTime} onChange={e => setAttRunTime(e.target.value)} className="w-40" />
              </div>
            )}

            <div>
              <Label className="mb-1.5 block">Apply Mode</Label>
              <Select value={attApplyMode} onValueChange={setAttApplyMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual — flag issues, require human review</SelectItem>
                  <SelectItem value="semi-automatic">Semi-Automatic — auto-approve clean, flag issues</SelectItem>
                  <SelectItem value="fully-automatic">Fully Automatic — auto-approve and auto-fix</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">All modes still require human confirmation before claim submission.</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground bg-muted rounded-md p-2.5">
            Last run: Today at 2:04 AM — 127 records processed, 8 issues flagged
          </p>
        </div>

        {/* Period Pipeline */}
        <div className="space-y-4 rounded-lg border border-border p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Period Pipeline</h3>
            <p className="text-xs text-muted-foreground">Runs period-close rules at billing period end (Rules 10–14). Fires once per billing period per participant and service.</p>
          </div>

          <div className="flex items-center justify-between">
            <Label>Enable Auto-Run</Label>
            <Switch checked={perAutoRun} onCheckedChange={setPerAutoRun} />
          </div>

          <div className={`space-y-4 ${!perAutoRun ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <Label className="mb-1.5 block">Trigger</Label>
              <Select value={perTrigger} onValueChange={setPerTrigger}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto-detect">Auto-detect period close</SelectItem>
                  <SelectItem value="fixed-date">Fixed date</SelectItem>
                  <SelectItem value="manual-only">Manual only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {perTrigger === 'fixed-date' && (
              <div>
                <Label className="mb-1.5 block">Run on Day</Label>
                <Input type="number" min={1} max={28} value={perFixedDay} onChange={e => setPerFixedDay(parseInt(e.target.value) || 1)} className="w-24" />
                <p className="text-xs text-muted-foreground mt-1">Agent will run at 12:01 AM on this day each month.</p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Always Preview Before Committing</Label>
                  <p className="text-xs text-muted-foreground">When enabled, the period pipeline will show projected outcomes first and require human approval before writing final records. Recommended.</p>
                </div>
                <Switch checked={perPreview} onCheckedChange={setPerPreview} />
              </div>

              {perPreview ? (
                <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                  <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>Preview Mode is on. The period pipeline will run and show results in the AI Queue as projected outcomes. A billing specialist must click "Commit Results" before any records are written.</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>⚠️ Preview Mode is off. Period pipeline results will be written automatically without human review. Use with caution.</span>
                </div>
              )}
            </div>

            <div>
              <Label className="mb-1.5 block">Apply Mode</Label>
              <Select value={perApplyMode} onValueChange={setPerApplyMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual — flag issues, require human review</SelectItem>
                  <SelectItem value="semi-automatic">Semi-Automatic — auto-approve clean, flag issues</SelectItem>
                  <SelectItem value="fully-automatic">Fully Automatic — auto-approve and auto-fix</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Period pipeline results affect final claim amounts. Manual review is recommended.</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground bg-muted rounded-md p-2.5">
            Last run: March 1, 2026 at 12:01 AM — Period close for February 2026 — 84 records committed
          </p>
        </div>
      </Card>

      {/* Custom Billing Instructions */}
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Custom Billing Instructions</h2>
          <p className="text-xs text-muted-foreground mt-1">Describe your organization's specific billing policies in plain English. The agent checks every claim against these instructions on every run.</p>
        </div>
        <Textarea
          rows={8}
          defaultValue={DEFAULT_CUSTOM_INSTRUCTIONS}
          placeholder={'Example: "Never bill H2023 and T2021 for the same individual on the same day." or "If authorization units remaining fall below 15%, flag the claim for review before submission." or "For clinic claims, always confirm that a treatment plan is active and dated within the last 90 days before allowing billing."'}
          className="text-sm"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Instructions are appended to the agent's system prompt and applied on every pipeline run.</p>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold" onClick={() => toast({ title: 'Custom instructions saved', description: 'Instructions will be applied on the next pipeline run.' })}>
            Save Instructions
          </Button>
        </div>
      </Card>

      {/* Auto-Submission */}
      <Card id="auto-submission" className="p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">Auto-Submission</h2>
          <p className="text-xs text-muted-foreground mt-1">Configure automatic claim submission to the clearinghouse after AI scrubbing is complete. Claims must pass all rules before auto-submission is eligible.</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Enable Auto-Batch Submission</Label>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-md">When ON, clean claims in the Ready queue are automatically submitted to the clearinghouse on the schedule below. No manual Submit click required.</p>
          </div>
          <Switch checked={autoSubmit} onCheckedChange={setAutoSubmit} />
        </div>

        <div className={`space-y-4 ${!autoSubmit ? 'opacity-50 pointer-events-none' : ''}`}>
          <div>
            <Label className="mb-1.5 block">Submission Cadence</Label>
            <Select value={submitCadence} onValueChange={setSubmitCadence}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nightly">Nightly (auto-submit once per night)</SelectItem>
                <SelectItem value="weekly">Weekly (auto-submit once per week)</SelectItem>
                <SelectItem value="twice-weekly">Twice Weekly</SelectItem>
                <SelectItem value="custom">Custom schedule</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block">Submission Time</Label>
            <Input type="time" value={submitTime} onChange={e => setSubmitTime(e.target.value)} className="w-40" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Label>Batch Variance Alert Threshold</Label>
              <TooltipProvider>
                <UiTooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground"><Info className="h-3.5 w-3.5" /></button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">Variance is calculated by comparing the current batch total against the rolling 4-week average for the same program and payer.</p>
                  </TooltipContent>
                </UiTooltip>
              </TooltipProvider>
            </div>
            <div className="relative w-32">
              <Input type="number" value={varianceThreshold} onChange={e => setVarianceThreshold(parseInt(e.target.value) || 0)} className="pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-lg">If the total units or dollar amount in a batch varies by more than this percentage from the prior batch, auto-submission is paused and the batch is held for manual review.</p>
          </div>

          <div>
            <Label className="mb-1.5 block">When Variance Threshold is Exceeded</Label>
            <Select value={varianceAction} onValueChange={setVarianceAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hold">Hold batch for manual review (recommended)</SelectItem>
                <SelectItem value="submit-flag">Submit anyway and flag for review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Variance Alerts Sent To</Label>
            <p className="text-sm text-foreground mt-1">Billing team + Admin</p>
            <p className="text-xs text-muted-foreground">(configured in Organization Settings)</p>
          </div>
        </div>
      </Card>

      <Button className="w-full" onClick={() => navigate('/billing/agents')}>
        Save Settings
      </Button>
    </div>
  );
};

export default AgentSettings;
