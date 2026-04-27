import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Layers, Globe, Play, Clock } from 'lucide-react';

type RunScope = 'individual' | 'program' | 'everything';
type Pipeline = 'attendance' | 'period';

interface RunScopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  onConfirm: (scope: RunScope, selection?: string) => void;
}

const MOCK_INDIVIDUALS = [
  { id: 'ind-1', name: 'Sarah Johnson' },
  { id: 'ind-2', name: 'Michael Chen' },
  { id: 'ind-3', name: 'Maria Garcia' },
  { id: 'ind-4', name: 'David Williams' },
  { id: 'ind-5', name: 'Emily Brown' },
];

const MOCK_PROGRAMS = [
  { id: 'prog-1', name: 'Day Habilitation' },
  { id: 'prog-2', name: 'Residential Habilitation' },
  { id: 'prog-3', name: 'Supported Employment' },
  { id: 'prog-4', name: 'Personal Supports' },
];

const RunScopeDialog = ({ open, onOpenChange, agentName, onConfirm }: RunScopeDialogProps) => {
  const [pipeline, setPipeline] = useState<Pipeline>('attendance');
  const [scope, setScope] = useState<RunScope>('everything');
  const [selection, setSelection] = useState<string>('');

  const handleConfirm = () => {
    onConfirm(scope, selection || undefined);
    setPipeline('attendance');
    setScope('everything');
    setSelection('');
  };

  const isValid = scope === 'everything' || selection !== '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Run {agentName}</DialogTitle>
          <DialogDescription>Choose a pipeline and scope for this agent run.</DialogDescription>
        </DialogHeader>

        {/* Step 1 — Pipeline */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step 1 — Choose Pipeline</p>
          <RadioGroup value={pipeline} onValueChange={(v) => setPipeline(v as Pipeline)} className="gap-3">
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${pipeline === 'attendance' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
              <RadioGroupItem value="attendance" id="pipeline-attendance" className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <Label htmlFor="pipeline-attendance" className="font-medium cursor-pointer">Run Attendance Pipeline</Label>
                <p className="text-xs text-muted-foreground mt-1">Validates individual attendance records (Rules 1–9)</p>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${pipeline === 'period' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
              <RadioGroupItem value="period" id="pipeline-period" className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <Label htmlFor="pipeline-period" className="font-medium cursor-pointer">Run Period Pipeline</Label>
                <p className="text-xs text-muted-foreground mt-1">Runs period-close rules — Frequency, Day Caps, Rate Tiers, Aggregation, Doc Check (Rules 10–14)</p>
              </div>
            </label>
          </RadioGroup>

          {pipeline === 'period' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-sm text-amber-600 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs">Period still open — will run in Preview Mode. No records will be written.</span>
            </div>
          )}
        </div>

        {/* Step 2 — Scope */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step 2 — Choose Scope</p>
          <RadioGroup value={scope} onValueChange={(v) => { setScope(v as RunScope); setSelection(''); }} className="gap-3">
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${scope === 'individual' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
              <RadioGroupItem value="individual" id="individual" className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="individual" className="font-medium cursor-pointer">Run by Individual</Label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Run the agent for a specific individual only.</p>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${scope === 'program' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
              <RadioGroupItem value="program" id="program" className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="program" className="font-medium cursor-pointer">Run by Program</Label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Run the agent for all individuals in a specific program.</p>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${scope === 'everything' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
              <RadioGroupItem value="everything" id="everything" className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="everything" className="font-medium cursor-pointer">Run All</Label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Run the agent for all individuals across all programs.</p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {scope === 'individual' && (
          <Select value={selection} onValueChange={setSelection}>
            <SelectTrigger>
              <SelectValue placeholder="Select an individual..." />
            </SelectTrigger>
            <SelectContent>
              {MOCK_INDIVIDUALS.map(ind => (
                <SelectItem key={ind.id} value={ind.id}>{ind.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {scope === 'program' && (
          <Select value={selection} onValueChange={setSelection}>
            <SelectTrigger>
              <SelectValue placeholder="Select a program..." />
            </SelectTrigger>
            <SelectContent>
              {MOCK_PROGRAMS.map(prog => (
                <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            <Play className="h-3.5 w-3.5 mr-1.5" /> Run Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RunScopeDialog;
