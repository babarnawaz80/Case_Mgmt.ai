import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useBillingContext } from '@/contexts/BillingContext';
import type { GuidelinesEngine } from '@/types/billing';
import StepInputMethod from '@/components/billing/engine-wizard/StepInputMethod';
import StepRulesPreview from '@/components/billing/engine-wizard/StepRulesPreview';
import StepFundingStreams from '@/components/billing/engine-wizard/StepFundingStreams';

const steps = ['Basics', 'Input Method', 'Rules Preview', 'Link Funding Streams', 'Rate & Code Mapping', 'Review & Publish'];

const mockExtractedRules = [
  { service: 'Day Habilitation', code: 'H2014', severity: 'hard_stop', citation: 'Page 42, §3.2.1', description: 'Max 8 hours per day' },
  { service: 'Day Habilitation', code: 'H2014', severity: 'warning', citation: 'Page 45, §3.2.4', description: 'Group modifier HQ required for 3+ individuals' },
  { service: 'Personal Supports', code: 'H2016', severity: 'hard_stop', citation: 'Page 58, §4.1.2', description: 'Valid prior authorization required' },
  { service: 'Personal Supports', code: 'H2016', severity: 'warning', citation: 'Page 60, §4.1.5', description: 'Progress note within 72 hours' },
  { service: 'Supported Employment', code: 'H2023', severity: 'hard_stop', citation: 'Page 72, §5.1.1', description: 'Individual employment plan on file' },
  { service: 'Behavioral Support', code: 'H0004', severity: 'warning', citation: 'Page 88, §6.2.3', description: 'Behavioral assessment update within 365 days' },
];

const mockServiceRates = [
  { service: 'Day Habilitation', code: 'H2014', unit: '15-min', rate: 4.12, modifiers: 'HQ, U1' },
  { service: 'Personal Supports', code: 'H2016', unit: '15-min', rate: 4.58, modifiers: 'U3' },
  { service: 'Supported Employment', code: 'H2023', unit: 'hourly', rate: 21.50, modifiers: 'SE' },
  { service: 'Residential Habilitation', code: 'H2016 HI', unit: 'daily', rate: 182.40, modifiers: '' },
  { service: 'Behavioral Support', code: 'H0004', unit: '15-min', rate: 6.80, modifiers: 'HN' },
];

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia',
  'Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
  'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
  'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
  'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming',
];

const EngineBuilder = () => {
  const navigate = useNavigate();
  const { addEngine } = useBillingContext();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', state: '', program: '', effectiveDate: '', inputMethod: 'pdf', url: '', pasteText: '' });
  const [selectedFundingStreams, setSelectedFundingStreams] = useState<string[]>([]);

  const handlePublish = () => {
    const newEngine: GuidelinesEngine = {
      id: `eng-${Date.now()}`,
      name: form.name || 'Untitled Engine',
      state: form.state || 'Unknown',
      program: form.program || 'Unknown',
      effectiveDate: form.effectiveDate || new Date().toISOString().slice(0, 10),
      version: '1.0',
      status: 'draft',
      serviceCount: mockServiceRates.length,
      ruleCount: mockExtractedRules.length,
      rateTableCount: mockServiceRates.length,
      hardStopCount: mockExtractedRules.filter(r => r.severity === 'hard_stop').length,
      warningCount: mockExtractedRules.filter(r => r.severity === 'warning').length,
      createdBy: 'Admin User',
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
    addEngine(newEngine);
    navigate('/billing/engines');
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/billing/engines')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Create Guidelines Engine</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${
              i < step ? 'bg-billing-healthy/10 text-billing-healthy' :
              i === step ? 'bg-primary text-primary-foreground' :
              'bg-muted text-muted-foreground'
            }`}>
              {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
              <span className="hidden md:inline">{s}</span>
            </div>
            {i < steps.length - 1 && <div className="w-6 h-px bg-border" />}
          </div>
        ))}
      </div>

      <Card className="p-6">
        {/* Step 0: Basics */}
        {step === 0 && (
          <div className="space-y-4 max-w-lg">
            <h2 className="text-lg font-semibold">Engine Basics</h2>
            <div className="space-y-3">
              <div>
                <Label>Engine Name</Label>
                <Input placeholder="e.g., Maryland DDA Billing" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <Label>State</Label>
                <Select value={form.state} onValueChange={v => setForm({...form, state: v})}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {US_STATES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Program</Label>
                <Input placeholder="e.g., DDA Waiver" value={form.program} onChange={e => setForm({...form, program: e.target.value})} />
              </div>
              <div>
                <Label>Effective Date</Label>
                <Input type="date" value={form.effectiveDate} onChange={e => setForm({...form, effectiveDate: e.target.value})} />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Input Method */}
        {step === 1 && (
          <StepInputMethod
            inputMethod={form.inputMethod}
            urlValue={form.url}
            pasteValue={form.pasteText}
            onInputMethodChange={method => setForm({...form, inputMethod: method})}
            onUrlChange={url => setForm({...form, url})}
            onPasteChange={pasteText => setForm({...form, pasteText})}
          />
        )}

        {/* Step 2: Rules Preview */}
        {step === 2 && (
          <StepRulesPreview rules={mockExtractedRules} />
        )}

        {/* Step 3: Link Funding Streams */}
        {step === 3 && (
          <StepFundingStreams
            selected={selectedFundingStreams}
            onSelectedChange={setSelectedFundingStreams}
            engineName={form.name ? `${form.name} v1.0` : 'this engine'}
          />
        )}

        {/* Step 4: Rate & Code Mapping */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Rate & Code Mapping</h2>
            <p className="text-sm text-muted-foreground">Configure billing codes, rates, and modifiers for each service.</p>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Service</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Code</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Unit</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Rate</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Modifiers</th>
                  </tr>
                </thead>
                <tbody>
                  {mockServiceRates.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-3 text-foreground">{r.service}</td>
                      <td className="p-3 font-mono text-xs">{r.code}</td>
                      <td className="p-3 text-muted-foreground">{r.unit}</td>
                      <td className="p-3 font-semibold text-foreground">${r.rate.toFixed(2)}</td>
                      <td className="p-3 text-xs text-muted-foreground">{r.modifiers || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step 5: Review & Publish */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review & Publish</h2>
            <Card className="p-4 bg-muted/50 space-y-2 text-sm max-w-lg">
              <div className="flex justify-between"><span className="text-muted-foreground">Name:</span><span className="font-medium text-foreground">{form.name || 'Untitled Engine'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">State:</span><span className="font-medium text-foreground">{form.state || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Program:</span><span className="font-medium text-foreground">{form.program || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Effective Date:</span><span className="font-medium text-foreground">{form.effectiveDate || '—'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Rules:</span><span className="font-medium text-foreground">{mockExtractedRules.length} rules extracted</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Services:</span><span className="font-medium text-foreground">{mockServiceRates.length} services mapped</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Linked funding streams:</span><span className="font-medium text-foreground">{selectedFundingStreams.length} stream{selectedFundingStreams.length !== 1 ? 's' : ''}</span></div>
            </Card>

            {/* Rules Preview with Source Traceability */}
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Rule</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Parameters</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {mockExtractedRules.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-3 text-foreground">{r.description}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">
                        {r.severity === 'hard_stop' ? 'HARD_STOP' : 'WARNING'}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{r.code} — {r.service}</td>
                      <td className="p-3 text-xs text-muted-foreground">{form.name || 'Billing Manual'} 2026.pdf — {r.citation.split(',')[0]}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-border">
                    <td className="p-3 text-foreground">Weekend block</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">SCHEDULE_CHECK</td>
                    <td className="p-3 text-xs text-muted-foreground">blocked: SAT, SUN</td>
                    <td className="p-3 text-xs text-muted-foreground">{form.state || 'MD'} Billing Manual 2026.pdf — Page 14</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3 text-foreground">Min 2x/month</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">FREQUENCY_CHECK</td>
                    <td className="p-3 text-xs text-muted-foreground">min_occurrences: 2</td>
                    <td className="p-3 text-xs text-muted-foreground">{form.state || 'MD'} Billing Manual 2026.pdf — Page 22</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* BILLING_RULE write confirmation */}
            <Card className="p-4 bg-billing-healthy/5 border-billing-healthy/20 space-y-1">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-billing-healthy mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">
                  Clicking <strong>Publish</strong> will write these rules to the <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">BILLING_RULE</span> table. Each rule will be traceable back to its source document and page number. Nothing is written until you confirm.
                </p>
              </div>
            </Card>

            <p className="text-xs text-muted-foreground">Publishing will lock this version. To make changes, create a new version from the published engine.</p>
            <Button onClick={handlePublish} className="w-full">Save Engine as Draft</Button>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        {step < steps.length - 1 && (
          <Button onClick={() => setStep(s => s + 1)}>
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default EngineBuilder;
