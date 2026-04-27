import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Settings, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RunScopeDialog from './RunScopeDialog';

export interface ProgramAgent {
  id: string;
  name: string;
  state: string;
  program: string;
  engineName: string;
  engineVersion: string;
  trigger: string;
  status: 'active' | 'inactive';
  lastRun: string;
  complianceRate: string;
  individualsProcessed: number;
  issuesFound: string;
  claimsReady: number;
  claimType?: 'IDD' | 'Clinic';
}

const ProgramAgentCard = ({ agent }: { agent: ProgramAgent }) => {
  const navigate = useNavigate();
  const [runDialogOpen, setRunDialogOpen] = useState(false);

  const handleRunConfirm = (_scope: string, _selection?: string) => {
    setRunDialogOpen(false);
    navigate(`/billing/agents/${agent.id}/run`);
  };

  return (
    <>
      <Card className="p-6 flex flex-col gap-4 rounded-2xl shadow-elevated hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold font-display text-foreground truncate text-base">{agent.name}</h3>
              {agent.claimType === 'Clinic' && (
                <Badge variant="outline" className="text-[10px] shrink-0 rounded-full bg-teal-500/10 text-teal-700 border-teal-500/30">
                  Clinic
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{agent.state} • {agent.program}</p>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] shrink-0 rounded-full ${
              agent.status === 'active'
                ? 'bg-billing-healthy/10 text-billing-healthy border-billing-healthy/30'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {agent.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          Powered by <span className="font-semibold text-foreground">{agent.engineName} v{agent.engineVersion}</span>
        </p>

        <Badge variant="outline" className="text-[10px] gap-1 w-fit rounded-full">
          <Clock className="h-3 w-3" />
          {agent.trigger}
        </Badge>

        <p className="text-[11px] text-muted-foreground">
          Last run: <span className="text-foreground font-medium">{agent.lastRun}</span>
        </p>

        <div className="grid grid-cols-4 gap-2 py-4 border-t border-secondary">
          <div className="text-center">
            <p className="text-lg font-extrabold font-display text-foreground">{agent.complianceRate}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Compliance</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-extrabold font-display text-foreground">{agent.individualsProcessed}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Individuals</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-extrabold font-display text-foreground">{agent.issuesFound}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Issues</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-extrabold font-display text-foreground">{agent.claimsReady}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Claims Ready</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-secondary">
          <Button size="sm" className="rounded-xl font-bold btn-primary-gradient text-white" onClick={() => setRunDialogOpen(true)}>
            <Play className="h-3.5 w-3.5 mr-1.5" /> Run Now
          </Button>
          <Button size="sm" variant="outline" className="rounded-xl font-bold" onClick={() => navigate(`/billing/agents/${agent.id}/settings`)}>
            <Settings className="h-3.5 w-3.5 mr-1.5" /> Settings
          </Button>
        </div>
      </Card>

      <RunScopeDialog
        open={runDialogOpen}
        onOpenChange={setRunDialogOpen}
        agentName={agent.name}
        onConfirm={handleRunConfirm}
      />
    </>
  );
};

export default ProgramAgentCard;
