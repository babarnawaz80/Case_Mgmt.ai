import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye, Copy, Archive, Send, AlertTriangle, Link } from 'lucide-react';
import { useBillingContext } from '@/contexts/BillingContext';

const statusColors: Record<string, string> = {
  draft: 'bg-billing-warning/10 text-billing-warning border-billing-warning/30',
  published: 'bg-billing-healthy/10 text-billing-healthy border-billing-healthy/30',
  archived: 'bg-muted text-muted-foreground border-border',
};

const UNLINKED_STREAMS = [
  { id: 'ul-1', label: 'Commercial | Day Habilitation — Maryland' },
  { id: 'ul-2', label: 'MassHealth | Community Living — Massachusetts' },
];

const Engines = () => {
  const navigate = useNavigate();
  const { role, engines: mockEngines, publishEngine, archiveEngine, newEngineVersion } = useBillingContext();
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dismissedStreams, setDismissedStreams] = useState<string[]>([]);

  const states = [...new Set(mockEngines.map(e => e.state))];

  const filtered = mockEngines.filter(e => {
    if (stateFilter !== 'all' && e.state !== stateFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const visibleUnlinked = UNLINKED_STREAMS.filter(s => !dismissedStreams.includes(s.id));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-extrabold font-display tracking-tight text-foreground">Guidelines Engines</h1>
          <p className="text-sm text-muted-foreground mt-1">State/program billing rule packs for compliance automation</p>
        </div>
        {role === 'admin' && (
          <Button className="rounded-xl font-bold btn-primary-gradient text-white" onClick={() => navigate('/billing/engines/new')}>
            <Plus className="h-4 w-4 mr-1.5" /> Create Engine
          </Button>
        )}
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search engines..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="State" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map(engine => (
          <Card key={engine.id} className="p-5 flex items-center justify-between rounded-2xl shadow-elevated hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-6 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold font-display text-foreground">{engine.name}</h3>
                  <Badge variant="outline" className={`rounded-full ${statusColors[engine.status]}`}>{engine.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{engine.state} • {engine.program} • v{engine.version}</p>
              </div>
              <div className="flex gap-6 text-xs text-muted-foreground shrink-0">
                <div><span className="font-bold font-display text-foreground">{engine.serviceCount}</span> services</div>
                <div><span className="font-bold font-display text-foreground">{engine.ruleCount}</span> rules</div>
                <div><span className="font-bold font-display text-foreground">{engine.hardStopCount}</span> hard stops</div>
                <div><span className="font-bold font-display text-foreground">{engine.warningCount}</span> warnings</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" className="rounded-xl font-bold" onClick={() => navigate(`/billing/engines/${engine.id}`)}>
                <Eye className="h-3.5 w-3.5 mr-1" /> View
              </Button>
              {role === 'admin' && engine.status === 'published' && (
                <Button size="sm" variant="outline" className="rounded-xl font-bold" onClick={() => { const ne = newEngineVersion(engine.id); navigate(`/billing/engines/${ne.id}`); }}><Copy className="h-3.5 w-3.5 mr-1" /> New Version</Button>
              )}
              {role === 'admin' && engine.status === 'draft' && (
                <Button size="sm" className="rounded-xl font-bold btn-primary-gradient text-white" onClick={() => publishEngine(engine.id)}><Send className="h-3.5 w-3.5 mr-1" /> Publish</Button>
              )}
              {role === 'admin' && engine.status === 'published' && (
                <Button size="sm" variant="ghost" onClick={() => archiveEngine(engine.id)}><Archive className="h-3.5 w-3.5" /></Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Unlinked Funding Streams Warning */}
      {visibleUnlinked.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold font-display text-foreground">Unlinked funding streams</h2>
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-billing-warning/5 border-l-4 border-billing-warning">
            <AlertTriangle className="h-4 w-4 text-billing-warning mt-0.5 shrink-0" />
            <p className="text-sm text-foreground/80">
              The following funding streams are not linked to any guidelines engine. The AI agent cannot perform compliance checking on these streams until they are linked.
            </p>
          </div>
          <div className="space-y-2">
            {visibleUnlinked.map(stream => (
              <Card key={stream.id} className="p-4 flex items-center justify-between rounded-2xl shadow-elevated">
                <span className="text-sm font-medium text-foreground">{stream.label}</span>
                <Button size="sm" variant="outline" className="rounded-xl font-bold" onClick={() => navigate('/billing/engines/new?step=3')}>
                  <Link className="h-3.5 w-3.5 mr-1" /> Link now
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Engines;
