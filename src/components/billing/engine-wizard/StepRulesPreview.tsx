import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, MessageSquare, Send, Loader2, FileText, CheckCircle2, AlertTriangle, Shield, Search, BarChart3, BookOpen } from 'lucide-react';
import AiBadge from '@/components/billing/AiBadge';

interface Rule {
  service: string;
  code: string;
  severity: string;
  citation: string;
  description: string;
}

interface StepRulesPreviewProps {
  rules: Rule[];
}

interface ChatMessage {
  role: 'ai' | 'user';
  text: string;
}

const mockResponses: Record<string, string> = {
  modifier: 'Group modifier HQ is required when 3 or more individuals receive Day Habilitation services simultaneously. This is specified on Page 45, §3.2.4 of the Maryland DDA billing manual. I have extracted this as a Warning-level rule in the rules table below.',
  hq: 'Group modifier HQ is required when 3 or more individuals receive Day Habilitation services simultaneously. This is specified on Page 45, §3.2.4 of the Maryland DDA billing manual. I have extracted this as a Warning-level rule in the rules table below.',
  documentation: 'Personal Supports (H2016) requires a progress note to be completed within 72 hours of service delivery. Missing or late notes trigger a Warning. This requirement is cited on Page 60, §4.1.5.',
  note: 'Personal Supports (H2016) requires a progress note to be completed within 72 hours of service delivery. Missing or late notes trigger a Warning. This requirement is cited on Page 60, §4.1.5.',
  progress: 'Personal Supports (H2016) requires a progress note to be completed within 72 hours of service delivery. Missing or late notes trigger a Warning. This requirement is cited on Page 60, §4.1.5.',
  authorization: 'Valid prior authorization is required before billing Personal Supports. This is a Hard Stop — claims without a matched authorization will be blocked automatically. Source: Page 58, §4.1.2.',
  auth: 'Valid prior authorization is required before billing Personal Supports. This is a Hard Stop — claims without a matched authorization will be blocked automatically. Source: Page 58, §4.1.2.',
  prior: 'Valid prior authorization is required before billing Personal Supports. This is a Hard Stop — claims without a matched authorization will be blocked automatically. Source: Page 58, §4.1.2.',
};

const getAiResponse = (message: string): string => {
  const lower = message.toLowerCase();
  for (const [keyword, response] of Object.entries(mockResponses)) {
    if (lower.includes(keyword)) return response;
  }
  return 'Based on my analysis of your document, I found rules related to that topic. Please review the extracted rules table below for specific details, or ask a more specific question about a service code or requirement.';
};

// ── Analysis animation steps ──
const analysisSteps = [
  { icon: FileText, label: 'Opening document...', detail: 'Maryland_DDA_Billing_Manual_2025.pdf', duration: 1200 },
  { icon: BookOpen, label: 'Reading pages...', detail: 'Scanning 142 pages across 12 sections', duration: 2000 },
  { icon: Search, label: 'Identifying billing rules...', detail: 'Matching patterns against 14-rule compliance engine', duration: 2200 },
  { icon: Shield, label: 'Classifying severity levels...', detail: 'Categorizing hard stops, warnings, and auto-pass rules', duration: 1800 },
  { icon: BarChart3, label: 'Mapping service codes...', detail: 'Linking rules to H2014, H2016, H2023, H0004, H2015...', duration: 1500 },
  { icon: CheckCircle2, label: 'Analysis complete', detail: '47 rules extracted across 8 services', duration: 800 },
];

function AnalysisAnimation({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [rulesCount, setRulesCount] = useState(0);
  const [hardStopCount, setHardStopCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);

  useEffect(() => {
    let totalElapsed = 0;
    const totalDuration = analysisSteps.reduce((s, step) => s + step.duration, 0);

    const timers: NodeJS.Timeout[] = [];

    analysisSteps.forEach((step, i) => {
      // Start this step
      timers.push(setTimeout(() => {
        setCurrentStep(i);
      }, totalElapsed));

      // Complete this step
      totalElapsed += step.duration;
      timers.push(setTimeout(() => {
        setCompletedSteps(prev => [...prev, i]);
      }, totalElapsed));
    });

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + (100 / (totalDuration / 50));
      });
    }, 50);

    // Show results after all steps
    timers.push(setTimeout(() => {
      setShowResults(true);
      // Animate counters
      const rulesInterval = setInterval(() => {
        setRulesCount(prev => { if (prev >= 47) { clearInterval(rulesInterval); return 47; } return prev + 3; });
      }, 40);
      const hardInterval = setInterval(() => {
        setHardStopCount(prev => { if (prev >= 6) { clearInterval(hardInterval); return 6; } return prev + 1; });
      }, 120);
      const warnInterval = setInterval(() => {
        setWarningCount(prev => { if (prev >= 14) { clearInterval(warnInterval); return 14; } return prev + 1; });
      }, 80);
    }, totalElapsed + 300));

    // Auto-complete after results shown
    timers.push(setTimeout(() => {
      onComplete();
    }, totalElapsed + 2500));

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  return (
    <div className="space-y-6">
      {/* Main analysis card */}
      <Card className="overflow-hidden border-0 shadow-elevated">
        {/* Header with animated gradient */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-[hsl(265,85%,55%)]/10 via-[hsl(330,70%,55%)]/5 to-[hsl(265,85%,55%)]/10">
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(265,85%,55%)]/5 to-[hsl(330,70%,55%)]/5 animate-pulse" />
          <div className="relative flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[hsl(265,85%,55%)] to-[hsl(330,70%,55%)] flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-foreground font-display">AI is analyzing your document</h3>
              <p className="text-sm text-muted-foreground">Extracting billing rules, service codes, and compliance requirements...</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[hsl(265,85%,55%)] to-[hsl(330,70%,55%)] transition-all duration-100 ease-linear"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">{Math.min(Math.round(progress), 100)}% complete</p>
        </div>

        {/* Chat-like analysis steps */}
        <div className="px-6 py-4 space-y-3">
          {analysisSteps.map((step, i) => {
            const isActive = currentStep === i && !completedSteps.includes(i);
            const isCompleted = completedSteps.includes(i);
            const isVisible = i <= currentStep;

            if (!isVisible) return null;

            return (
              <div
                key={i}
                className={`flex items-start gap-3 transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${
                  isCompleted
                    ? 'bg-billing-healthy/15'
                    : isActive
                      ? 'bg-[hsl(265,85%,55%)]/15'
                      : 'bg-muted'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-billing-healthy" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 text-[hsl(265,85%,55%)] animate-spin" />
                  ) : (
                    <step.icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold transition-colors ${
                    isCompleted ? 'text-billing-healthy' : isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                </div>
                {isActive && (
                  <div className="flex gap-1 items-center pt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(265,85%,55%)] animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(265,85%,55%)] animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(265,85%,55%)] animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Results counters — appear after animation */}
        {showResults && (
          <div className="px-6 pb-5 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-billing-healthy/10 border border-billing-healthy/20 px-4 py-3 text-center animate-scale-in">
                <p className="text-3xl font-extrabold font-display text-billing-healthy">{rulesCount}</p>
                <p className="text-xs font-medium text-billing-healthy/80 mt-0.5">Rules Extracted</p>
              </div>
              <div className="rounded-xl bg-billing-at-risk/10 border border-billing-at-risk/20 px-4 py-3 text-center animate-scale-in" style={{ animationDelay: '0.1s' }}>
                <p className="text-3xl font-extrabold font-display text-billing-at-risk">{hardStopCount}</p>
                <p className="text-xs font-medium text-billing-at-risk/80 mt-0.5">Hard Stops</p>
              </div>
              <div className="rounded-xl bg-billing-warning/10 border border-billing-warning/20 px-4 py-3 text-center animate-scale-in" style={{ animationDelay: '0.2s' }}>
                <p className="text-3xl font-extrabold font-display text-billing-warning">{warningCount}</p>
                <p className="text-xs font-medium text-billing-warning/80 mt-0.5">Warnings</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Main component ──
const StepRulesPreview = ({ rules }: StepRulesPreviewProps) => {
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: "I've analyzed your billing manual. Ask me anything about the rules I found — for example: 'What are the documentation requirements for Personal Supports?' or 'What modifiers are required for group services?'" },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const handleSend = () => {
    if (!chatInput.trim() || isTyping) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsTyping(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'ai', text: getAiResponse(userMsg) }]);
      setIsTyping(false);
    }, 1500);
  };

  // Show animation first
  if (!analysisComplete) {
    return <AnalysisAnimation onComplete={() => setAnalysisComplete(true)} />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* AI Summary Card */}
      <Card className="p-5 bg-billing-warning/5 border-billing-warning/20">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-billing-warning mt-0.5 shrink-0" />
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">AI document analysis</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">
              I analyzed your uploaded document and found 47 billing rules across 8 services. This appears to be the Maryland DDA Waiver billing manual effective July 1, 2025. I identified 6 hard stops that will block claims and 14 warnings that will flag issues for review. Services covered: Day Habilitation (H2014), Personal Supports (H2016), Supported Employment (H2023), Residential Habilitation (H2015), Behavioral Support (H0004), and 3 additional services. Review the extracted rules below before publishing this engine.
            </p>
            <div className="flex gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-billing-healthy/15 text-billing-healthy">47 rules extracted</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-billing-at-risk/15 text-billing-at-risk">6 hard stops</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-billing-warning/15 text-billing-warning">14 warnings</span>
            </div>
          </div>
        </div>
      </Card>

      {/* AI Chat Interface */}
      {!chatOpen ? (
        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setChatOpen(true)}>
          <MessageSquare className="h-4 w-4" />
          Ask AI about this document
        </Button>
      ) : (
        <Card className="border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
            <span className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Ask AI about this document
            </span>
            <button onClick={() => setChatOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">Collapse</button>
          </div>
          <div className="h-[200px] overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  {msg.role === 'ai' && <AiBadge className="mb-1" />}
                  <p className="mt-1">{msg.text}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex items-center gap-2 p-3 border-t border-border">
            <Input
              placeholder="Ask a question about this document..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="flex-1"
            />
            <Button size="sm" onClick={handleSend} disabled={!chatInput.trim() || isTyping}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Existing Rules Table */}
      <h2 className="text-lg font-semibold">Extracted Rules Preview</h2>
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <AiBadge /> AI extracted these rules from your uploaded document
      </p>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Service</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Code</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Severity</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Citation</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-3 text-foreground">{r.service}</td>
                <td className="p-3 font-mono text-xs">{r.code}</td>
                <td className="p-3">
                  <Badge variant="outline" className={r.severity === 'hard_stop' ? 'text-billing-at-risk border-billing-at-risk/30' : 'text-billing-warning border-billing-warning/30'}>
                    {r.severity === 'hard_stop' ? 'Hard Stop' : 'Warning'}
                  </Badge>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{r.citation}</td>
                <td className="p-3 text-foreground">{r.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StepRulesPreview;
