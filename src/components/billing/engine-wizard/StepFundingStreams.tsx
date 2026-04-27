import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { X, Search, Info } from 'lucide-react';

const MOCK_FUNDING_STREAMS = [
  { id: 'fs-1', payer: 'Amerigroup', service: 'Day Habilitation (H2014)', state: 'Maryland' },
  { id: 'fs-2', payer: 'Amerigroup', service: 'Personal Supports (H2016)', state: 'Maryland' },
  { id: 'fs-3', payer: 'Amerigroup', service: 'Supported Employment (H2023)', state: 'Maryland' },
  { id: 'fs-4', payer: 'Amerigroup', service: 'Residential Habilitation (H2015)', state: 'Maryland' },
  { id: 'fs-5', payer: 'Amerigroup', service: 'Behavioral Support (H0004)', state: 'Maryland' },
  { id: 'fs-6', payer: 'Medicaid', service: 'Day Habilitation (H2014)', state: 'Maryland' },
  { id: 'fs-7', payer: 'Medicaid', service: 'Personal Supports (H2016)', state: 'Maryland' },
  { id: 'fs-8', payer: 'MassHealth', service: 'Personal Supports', state: 'Massachusetts' },
  { id: 'fs-9', payer: 'Commercial', service: 'Day Habilitation', state: 'Maryland' },
];

interface StepFundingStreamsProps {
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
  engineName: string;
}

const StepFundingStreams = ({ selected, onSelectedChange, engineName }: StepFundingStreamsProps) => {
  const [search, setSearch] = useState('');

  const filtered = MOCK_FUNDING_STREAMS.filter(fs => {
    const text = `${fs.payer} ${fs.service} ${fs.state}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const toggleStream = (id: string) => {
    onSelectedChange(
      selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]
    );
  };

  const removeStream = (id: string) => {
    onSelectedChange(selected.filter(s => s !== id));
  };

  const selectedStreams = MOCK_FUNDING_STREAMS.filter(fs => selected.includes(fs.id));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Link funding streams to this engine</h2>
      <p className="text-sm text-muted-foreground">
        Select which funding streams from iCM this guidelines engine will govern. The AI agent will apply these rules when processing attendance for the selected funding streams.
      </p>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/15">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-foreground/80">
          Funding streams are configured in iCM. This step links them to your guidelines engine so the AI agent knows which compliance rules to apply.
        </p>
      </div>

      {/* Selected chips */}
      {selectedStreams.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedStreams.map(fs => (
            <Badge key={fs.id} variant="secondary" className="gap-1 pr-1">
              {fs.payer} | {fs.service}
              <button onClick={() => removeStream(fs.id)} className="ml-1 hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search funding streams..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Checkbox list */}
      <Card className="max-h-[280px] overflow-y-auto divide-y divide-border">
        {filtered.map(fs => (
          <label
            key={fs.id}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              checked={selected.includes(fs.id)}
              onCheckedChange={() => toggleStream(fs.id)}
            />
            <span className="text-sm text-foreground">
              {fs.payer} | {fs.service} — <span className="text-muted-foreground">{fs.state}</span>
            </span>
          </label>
        ))}
      </Card>

      {/* Summary */}
      {selected.length > 0 && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{selected.length} funding stream{selected.length !== 1 ? 's' : ''} selected</span> — the AI agent will apply {engineName || 'this engine\'s'} rules when processing these streams.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Funding streams not linked to any guidelines engine will show a warning in the agent dashboard. You can link more funding streams later from the engine detail screen.
      </p>
    </div>
  );
};

export default StepFundingStreams;
export { MOCK_FUNDING_STREAMS };
