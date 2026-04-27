import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Database, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProgramAgentCard from '@/components/billing/ProgramAgentCard';
import type { ProgramAgent } from '@/components/billing/ProgramAgentCard';

const programAgents: ProgramAgent[] = [
  {
    id: 'pa-1',
    name: 'Maryland DDA Waiver Agent',
    state: 'Maryland',
    program: 'DDA Waiver',
    engineName: 'Maryland DDA Billing',
    engineVersion: '2.0',
    trigger: 'Nightly 2:00 AM',
    status: 'active',
    lastRun: 'Today at 2:04 AM',
    complianceRate: '94%',
    individualsProcessed: 127,
    issuesFound: '8',
    claimsReady: 119,
  },
  {
    id: 'pa-2',
    name: 'Texas HHSC Waiver Agent',
    state: 'Texas',
    program: 'HHSC CLASS/HCS',
    engineName: 'Texas HHSC Waiver Billing',
    engineVersion: '1.0',
    trigger: 'Post-Supervisor Approval',
    status: 'active',
    lastRun: 'Yesterday at 11:30 PM',
    complianceRate: '97%',
    individualsProcessed: 84,
    issuesFound: '3',
    claimsReady: 81,
  },
  {
    id: 'pa-3',
    name: 'Ohio DODD Waiver Agent',
    state: 'Ohio',
    program: 'IO/Level 1 Waiver',
    engineName: 'Ohio DODD Billing',
    engineVersion: '0.1',
    trigger: 'Manual Only',
    status: 'inactive',
    lastRun: 'Never',
    complianceRate: '—',
    individualsProcessed: 0,
    issuesFound: '—',
    claimsReady: 0,
  },
  {
    id: 'pa-4',
    name: 'Arc Lexington Clinic Agent',
    state: 'New York',
    program: 'Article 16 / Article 31 Clinic',
    engineName: 'NY DOH Article 16 Billing',
    engineVersion: '1.0',
    trigger: 'Per-Note-Sign Trigger',
    status: 'inactive',
    lastRun: 'Never',
    complianceRate: '—',
    individualsProcessed: 0,
    issuesFound: '—',
    claimsReady: 0,
    claimType: 'Clinic',
  },
];

const AgentsDashboard = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showBanner, setShowBanner] = useState(true);

  const filtered = programAgents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.state.toLowerCase().includes(search.toLowerCase()) ||
    a.program.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8">
      {/* Info Banner */}
      {showBanner && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-foreground">
              Agents run automatically based on your trigger settings and drop results into the{' '}
              <button onClick={() => navigate('/billing/rcm')} className="font-semibold underline underline-offset-2 text-primary">Revenue Cycle AI Queue</button>.
              Configure and monitor agents here. Billing staff work from Revenue Cycle and Individuals screens.
            </p>
          </div>
          <button onClick={() => setShowBanner(false)} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[32px] font-extrabold font-display tracking-tight text-foreground">Billing Agents</h1>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            Each agent is a complete billing program that runs all 8 compliance checks automatically for a state and waiver program.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="rounded-xl font-bold btn-primary-gradient text-white" onClick={() => navigate('/billing/agents/new')}>
            <Plus className="h-4 w-4 mr-1.5" /> Create Agent
          </Button>
          <Button variant="outline" className="rounded-xl font-bold" onClick={() => navigate('/billing/engines')}>
            <Database className="h-4 w-4 mr-1.5" /> Guidelines Engines
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search agents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(agent => (
          <ProgramAgentCard key={agent.id} agent={agent} />
        ))}
        {filtered.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-12">No agents found matching your search.</p>
        )}
      </div>
    </div>
  );
};

export default AgentsDashboard;
