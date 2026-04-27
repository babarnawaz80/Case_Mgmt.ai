import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Play, Settings } from 'lucide-react';
import { mockAgents, mockRuns } from '@/mocks/billing';
import { AGENT_TYPE_LABELS } from '@/types/billing';

const resultColors: Record<string, string> = {
  Clean: 'bg-billing-healthy/10 text-billing-healthy border-billing-healthy/30',
  Pending: 'bg-billing-warning/10 text-billing-warning border-billing-warning/30',
  Flagged: 'bg-billing-warning/10 text-billing-warning border-billing-warning/30',
  Denied: 'bg-billing-at-risk/10 text-billing-at-risk border-billing-at-risk/30',
};

const AgentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const agent = mockAgents.find(a => a.id === id);
  const runs = mockRuns.filter(r => r.agentId === id).slice(0, 10);

  if (!agent) return <div className="p-8 text-muted-foreground">Agent not found.</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/billing/agents')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{agent.name}</h1>
            <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>{agent.status}</Badge>
            {agent.autoMonitor && <Badge variant="outline" className="text-accent border-accent">AUTO-MONITOR</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{AGENT_TYPE_LABELS[agent.agentType]} • Powered by {agent.engineName} v{agent.engineVersion}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/billing/agents/${agent.id}/run`)}>
            <Play className="h-4 w-4 mr-1.5" /> Run Agent
          </Button>
          <Button variant="outline" onClick={() => navigate(`/billing/agents/${agent.id}/edit`)}><Settings className="h-4 w-4 mr-1.5" /> Edit</Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{agent.description}</p>

      <div className="grid grid-cols-4 gap-4">
        {[
          ['Compliance Rate', `${agent.complianceRate}%`],
          ['Individuals Served', agent.individualsServed],
          ['At Risk', agent.individualsAtRisk],
          ['Drafts Pending', agent.draftsPending],
        ].map(([label, val]) => (
          <Card key={String(label)} className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{val}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      <Separator />

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Runs</h2>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Individual</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Service</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Date Range</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Result</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id} className="border-t border-border hover:bg-muted/50">
                  <td className="p-3 text-foreground">{run.individualName}</td>
                  <td className="p-3 text-muted-foreground">{run.service}</td>
                  <td className="p-3 text-muted-foreground text-xs">{run.dateRange}</td>
                  <td className="p-3"><Badge variant="outline" className={resultColors[run.status]}>{run.status}</Badge></td>
                  <td className="p-3 font-medium text-foreground">${run.totalAmount.toFixed(2)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{run.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AgentDetail;
