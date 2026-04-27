import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Play, Settings, MoreVertical, Copy, Power, Activity, FileText } from 'lucide-react';
import { AGENT_TYPE_LABELS, AGENT_TYPE_DESCRIPTIONS } from '@/types/billing';
import type { RuntimeAgent } from '@/types/billing';
import { useNavigate } from 'react-router-dom';
import AiBadge from '@/components/billing/AiBadge';

interface AgentCardProps {
  agent: RuntimeAgent;
}

const TRIGGER_LABELS: Record<string, string> = {
  'post_supervisor_review': 'Post-Supervisor',
  'post_biller_approval': 'Post-Biller',
};

const CARD_COLORS = [
  'from-blue-500 to-indigo-500',
  'from-orange-400 to-amber-500',
  'from-emerald-400 to-teal-500',
  'from-purple-500 to-violet-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-sky-500',
];

const AgentCard = ({ agent }: AgentCardProps) => {
  const navigate = useNavigate();
  const colorIndex = Math.abs(agent.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % CARD_COLORS.length;
  const isDocChecker = agent.agentType === 'documentation-sufficiency';

  return (
    <Card className="p-5 pt-0 flex flex-col gap-3 hover:shadow-md transition-shadow overflow-hidden">
      <div className={`h-1 -mx-5 mb-2 bg-gradient-to-r ${CARD_COLORS[colorIndex]}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate">{agent.name}</h3>
          <p className="text-xs text-muted-foreground">{AGENT_TYPE_LABELS[agent.agentType]}</p>
        </div>
        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
          {isDocChecker && <AiBadge tooltip="Uses AI to analyze documentation" />}
          <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
            {agent.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
          </Badge>
          {agent.autoMonitor && (
            <Badge variant="outline" className="text-[10px] text-accent border-accent">AUTO-MONITOR</Badge>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground/80 italic">{AGENT_TYPE_DESCRIPTIONS[agent.agentType]}</p>

      <div className="flex gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-[10px]">{TRIGGER_LABELS[agent.triggerStage]}</Badge>
        <Badge variant="outline" className="text-[10px]">Order: {agent.executionOrder}</Badge>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
      <p className="text-xs text-muted-foreground">
        Powered by: <span className="font-medium text-foreground">{agent.engineName} v{agent.engineVersion}</span>
      </p>
      <div className="grid grid-cols-3 gap-2 py-3 border-t border-border">
        <div>
          <p className="text-lg font-bold text-foreground">{agent.complianceRate}%</p>
          <p className="text-[10px] text-muted-foreground">Compliance</p>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{agent.individualsServed}</p>
          <p className="text-[10px] text-muted-foreground">Individuals</p>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{agent.draftsPending}</p>
          <p className="text-[10px] text-muted-foreground">Drafts</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">Last evaluated: {agent.lastEvaluatedAt}</p>
      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border">
        <Button size="sm" onClick={() => navigate(`/billing/agents/${agent.id}/run`)}>
          <Play className="h-3.5 w-3.5 mr-1.5" /> Run Agent
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate(`/billing/agents/${agent.id}`)}>
          <Settings className="h-3.5 w-3.5 mr-1.5" /> Settings
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="ml-auto px-2">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/billing/claims?tab=drafts`)}>
              <FileText className="h-4 w-4 mr-2" />View Drafts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/billing/runs`)}>
              <Activity className="h-4 w-4 mr-2" />View Runs
            </DropdownMenuItem>
            <DropdownMenuItem><Copy className="h-4 w-4 mr-2" />Duplicate</DropdownMenuItem>
            <DropdownMenuItem><Power className="h-4 w-4 mr-2" />Deactivate</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
};

export default AgentCard;
