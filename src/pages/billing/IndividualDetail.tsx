import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Check, AlertTriangle, XCircle, ChevronDown, RefreshCw, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import AiBadge from '@/components/billing/AiBadge';
import { useToast } from '@/hooks/use-toast';

interface ComplianceStep {
  name: string;
  ruleLabel?: string;
  status: 'pass' | 'warning' | 'blocked';
  result: string;
  fixExplanation?: string;
  citation?: string;
  isAI?: boolean;
}

// Mock detail for any individual
const getMockDetail = (id: string) => {
  const isBlocked = id === 'ind-05' || id === 'ind-10';
  const isAttention = id === 'ind-03' || id === 'ind-07' || id === 'ind-13';

  const names: Record<string, string> = {
    'ind-05': 'David Kim', 'ind-10': 'Patricia Anderson',
    'ind-03': 'Robert Johnson', 'ind-07': 'Michael Brown', 'ind-13': 'Daniel White',
  };

  return {
    name: names[id] || 'James Wilson',
    program: id === 'ind-13' ? 'HHSC CLASS/HCS' : 'DDA Waiver',
    fundingStream: id === 'ind-13' ? 'HHSC CLASS' : 'DDA Community',
    billingPeriod: 'Mar 1–15, 2026',
    authUsed: 120,
    authTotal: 200,
    authExpires: '2026-06-30',
    totalBillable: isBlocked ? 0 : isAttention ? 1142.40 : 527.36,
    status: isBlocked ? 'blocked' : isAttention ? 'attention' : 'clean',
    hardStopCount: isBlocked ? 1 : 0,
    steps: [
      { name: 'Data Pull from iCM', ruleLabel: 'Pre-pipeline', status: 'pass', result: 'Attendance records pulled successfully', isAI: true },
      { name: 'EVV Check', ruleLabel: 'Rule 2', status: 'pass', result: 'Validates clock-in, clock-out, and location verification', isAI: true },
      { name: 'Auth Check', ruleLabel: 'Rule 3', status: isBlocked && id === 'ind-05' ? 'blocked' : isAttention && id === 'ind-03' ? 'warning' : 'pass',
        result: isBlocked && id === 'ind-05' ? 'Authorization expired 02/28/2026' : isAttention && id === 'ind-03' ? 'Auth balance below 20% — 18 units remaining' : 'Auth PA-2026-0042 matched, 60% utilized',
        fixExplanation: isBlocked && id === 'ind-05' ? 'The authorization for this individual expired on 02/28/2026. A new authorization must be obtained before claims can be submitted.' : isAttention && id === 'ind-03' ? 'Only 18 of 200 authorized units remain. Consider requesting a new authorization before the remaining units are exhausted.' : undefined,
        citation: isBlocked && id === 'ind-05' ? 'Maryland DDA Manual, Section 2.4.1 — "Services rendered without a valid authorization on file shall not be reimbursed."' : undefined,
        isAI: true,
      },
      { name: 'Schedule Check', ruleLabel: 'Rule 1', status: 'pass', result: 'Confirms service delivered on a valid calendar day', isAI: true },
      { name: 'Proc & Modifier Resolve', ruleLabel: 'Rules 7–8', status: 'pass', result: 'Resolves correct procedure code and modifiers from service mapping', isAI: true },
      { name: 'Overlap & Daily Cap Check', ruleLabel: 'Rules 4–5', status: isAttention && id === 'ind-07' ? 'warning' : 'pass',
        result: isAttention && id === 'ind-07' ? 'Daily cap warning on 3/12 (28/32 units)' : 'Within all daily and weekly limits',
        fixExplanation: isAttention && id === 'ind-07' ? 'On 3/12, the individual received 28 of 32 maximum daily units. This is within limits but approaching the cap.' : undefined,
        citation: isAttention && id === 'ind-07' ? 'Maryland DDA Manual, Section 3.2.1 — "Day habilitation services shall not exceed 8 hours (32 units) per day."' : undefined,
        isAI: true,
      },
      { name: 'Doc Sufficiency Check', ruleLabel: 'Rule 14 — AI', status: isBlocked && id === 'ind-10' ? 'blocked' : isAttention && id === 'ind-13' ? 'warning' : 'pass',
        result: isBlocked && id === 'ind-10' ? 'Missing progress note for 3/04' : isAttention && id === 'ind-13' ? 'Documentation score 78% — below 85% threshold' : 'All notes complete, score 95%',
        fixExplanation: isBlocked && id === 'ind-10' ? 'No progress note was found for the service date of 3/04/2026. A complete progress note must be entered in iCM Care Tracker before this claim can proceed.' : isAttention && id === 'ind-13' ? 'The progress notes are missing 2 required elements: "Individual Response" and "Progress Toward Goal". Update notes in iCM.' : undefined,
        citation: isBlocked && id === 'ind-10' ? 'Maryland DDA Manual, Section 5.1 — "A daily progress note must be completed within 72 hours of service delivery."' : undefined,
        isAI: true,
      },
      { name: 'Unit Calc & Claims Packaging', ruleLabel: 'Rule 9', status: isBlocked ? 'blocked' : 'pass',
        result: isBlocked ? 'Cannot package — upstream hard stop' : 'Claim draft assembled: 128 units @ $4.12 = $527.36',
        isAI: true,
      },
    ] as ComplianceStep[],
    // Calendar mock - service days in March 2026
    serviceDays: [2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 23, 24, 25, 26, 27, 30],
    flaggedDays: isBlocked && id === 'ind-10' ? [4] : [],
    calendarStats: { serviceDays: 21, units: 168, billable: 1142.40 },
  };
};

const IndividualDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const detail = getMockDetail(id || '');
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);
  const [rerunning, setRerunning] = useState(false);
  const [rerunStep, setRerunStep] = useState(-1);
  const [rerunDone, setRerunDone] = useState<number[]>([]);

  const handleRerun = () => {
    if (rerunning) return;
    setRerunning(true);
    setRerunStep(0);
    setRerunDone([]);
    let step = 0;
    const runNext = () => {
      setRerunStep(step);
      setTimeout(() => {
        setRerunDone(prev => [...prev, step]);
        step++;
        if (step < detail.steps.length) {
          runNext();
        } else {
          setRerunning(false);
          setRerunStep(-1);
          toast({ title: `Compliance check complete for ${detail.name}` });
        }
      }, 300);
    };
    runNext();
  };

  const toggleStep = (i: number) => {
    setExpandedSteps(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const statusBadge = (status: string) => {
    const cls = status === 'blocked' ? 'bg-billing-at-risk/10 text-billing-at-risk' :
      status === 'attention' ? 'bg-billing-warning/10 text-billing-warning' : 'bg-billing-healthy/10 text-billing-healthy';
    const label = status === 'blocked' ? 'BLOCKED' : status === 'attention' ? 'NEEDS ATTENTION' : 'CLEAN';
    return <Badge variant="outline" className={cls}>{label}</Badge>;
  };

  const stepIcon = (s: string) => {
    if (s === 'pass') return <Check className="h-4 w-4 text-billing-healthy" />;
    if (s === 'warning') return <AlertTriangle className="h-4 w-4 text-billing-warning" />;
    return <XCircle className="h-4 w-4 text-billing-at-risk" />;
  };

  // Calendar generation for March 2026
  const daysInMonth = 31;
  const firstDayOfWeek = 6; // March 1, 2026 is Sunday=0, actually let's use 0-indexed: Sun
  // March 1, 2026 is a Sunday
  const startDay = 0; // Sunday
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate('/billing/individuals')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Individuals
      </Button>

      {/* Section A: Summary */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">{detail.name}</h1>
              {statusBadge(detail.status)}
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{detail.program}</span>
              <span>{detail.fundingStream}</span>
              <span>{detail.billingPeriod}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRerun} disabled={rerunning}>
              {rerunning ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />} Re-run Check
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast({ title: `Opening ${detail.name}'s profile in iCM...` })}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Go to iCM Profile
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Authorization</p>
            <Progress value={(detail.authUsed / detail.authTotal) * 100} className="h-2 mb-1" />
            <p className="text-xs text-muted-foreground">
              {detail.authUsed}/{detail.authTotal} units ({Math.round((detail.authUsed / detail.authTotal) * 100)}%) • Expires {detail.authExpires}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Billable</p>
            <p className="text-2xl font-bold text-foreground">${detail.totalBillable.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            {statusBadge(detail.status)}
          </div>
        </div>
      </Card>

      {/* Section B: Compliance Check Results */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          AI Compliance Check Results — <span className="text-sm font-normal text-muted-foreground">Last run today at 2:04 AM</span>
        </h2>

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-billing-warning/10 border border-billing-warning/25">
          <Sparkles className="h-4 w-4 text-billing-warning shrink-0 mt-0.5" />
          <p className="text-xs text-foreground leading-relaxed">
            All steps below are executed automatically by the AI Agent. No manual action is required. The agent reads attendance data from iCM, runs all compliance rules in sequence, and routes results to the AI Queue.
          </p>
        </div>

        {detail.hardStopCount > 0 && (
          <div className="p-4 rounded-xl bg-billing-at-risk/5 border border-billing-at-risk/30">
            <p className="text-sm text-billing-at-risk font-semibold">
              ⛔ This individual has {detail.hardStopCount} hard stop. Claims cannot be submitted until resolved.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Fix in <span className="font-semibold">iCM Care Tracker</span> → then Re-run Check
            </p>
          </div>
        )}

        {detail.steps.map((step, i) => {
          const hasDetails = step.fixExplanation || step.citation;
          return (
            <Collapsible key={i} open={expandedSteps.includes(i)} onOpenChange={() => hasDetails && toggleStep(i)}>
              <Card className={`p-4 ${step.isAI ? 'border-billing-warning/20 bg-billing-warning/[0.02]' : ''}`}>
                <CollapsibleTrigger className="w-full" disabled={!hasDetails}>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">{i + 1}</span>
                    {rerunning && rerunStep === i ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    ) : stepIcon(step.status)}
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{step.name}</span>
                        {step.isAI && <AiBadge tooltip="AI-powered analysis" />}
                      </div>
                      {step.ruleLabel && <p className="text-[10px] text-muted-foreground mt-0.5">{step.ruleLabel}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">{step.result}</p>
                    </div>
                    {hasDetails && <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedSteps.includes(i) ? 'rotate-180' : ''}`} />}
                  </div>
                </CollapsibleTrigger>
                {hasDetails && (
                  <CollapsibleContent className="mt-3 pt-3 border-t border-border space-y-2">
                    {step.fixExplanation && (
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs font-semibold text-foreground mb-1">What needs fixing</p>
                        <p className="text-xs text-muted-foreground">{step.fixExplanation}</p>
                      </div>
                    )}
                    {step.citation && (
                      <p className="text-xs text-muted-foreground italic">📖 {step.citation}</p>
                    )}
                  </CollapsibleContent>
                )}
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Section C: Attendance Calendar */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Attendance — March 2026</h2>
        <div className="grid grid-cols-7 gap-1">
          {weekdays.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
          {calendarCells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const isService = detail.serviceDays.includes(day);
            const isFlagged = detail.flaggedDays.includes(day);
            const isWeekend = (i % 7 === 0 || i % 7 === 6);
            const isFuture = day > 27;

            let bg = 'bg-muted/30';
            if (isFlagged) bg = 'bg-billing-at-risk/20 text-billing-at-risk border border-billing-at-risk/30';
            else if (isService) bg = 'bg-accent/10 text-accent border border-accent/20';
            else if (isWeekend) bg = 'bg-muted/50 text-muted-foreground';
            else if (isFuture) bg = 'bg-background text-muted-foreground/40';

            return (
              <div key={i} className={`text-center py-2 rounded-md text-xs font-medium ${bg}`}>
                {day}
              </div>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          {detail.calendarStats.serviceDays} service days | {detail.calendarStats.units} units | ${detail.calendarStats.billable.toFixed(2)} billable
        </p>
      </Card>
    </div>
  );
};

export default IndividualDetail;
