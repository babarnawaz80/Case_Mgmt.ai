import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Bot } from 'lucide-react';
import { mockAgents, mockEngines } from '@/mocks/billing';
import { AGENT_TYPE_LABELS, AGENT_TYPE_DESCRIPTIONS } from '@/types/billing';
import type { AgentType, TriggerStage } from '@/types/billing';

const agentTypes: AgentType[] = ['attendance-to-units', 'authorization-matching', 'modifier-pos', 'documentation-sufficiency', 'limits-conflict', 'claims-readiness'];
const SERVICE_CODES = ['H2014', 'H2016', 'H2023', 'H2016 HI', 'H0004', 'H2015'];

const AgentEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const agent = mockAgents.find(a => a.id === id);

  const [selectedType, setSelectedType] = useState<AgentType | ''>(agent?.agentType || '');
  const [name, setName] = useState(agent?.name || '');
  const [description, setDescription] = useState(agent?.description || '');
  const [engineId, setEngineId] = useState(agent?.engineId || '');
  const [autoMonitor, setAutoMonitor] = useState(agent?.autoMonitor ?? true);
  const [applyMode, setApplyMode] = useState<string>(agent?.applyMode || 'manual');
  const [triggerStage, setTriggerStage] = useState<TriggerStage>(agent?.triggerStage || 'post_supervisor_review');
  const [executionOrder, setExecutionOrder] = useState(agent?.executionOrder || 1);
  const [scope, setScope] = useState<string[]>(agent?.scope || []);

  const publishedEngines = mockEngines.filter(e => e.status === 'published');

  const toggleScope = (code: string) => {
    setScope(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  if (!agent) return <div className="p-8 text-muted-foreground">Agent not found.</div>;

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/billing/agents/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Edit Agent</h1>
      </div>

      <Card className="p-6 space-y-5">
        <div>
          <Label className="mb-2 block">Agent Type Template</Label>
          <div className="grid grid-cols-2 gap-3">
            {agentTypes.map(t => (
              <Card
                key={t}
                className={`p-4 cursor-pointer transition-all ${selectedType === t ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                onClick={() => setSelectedType(t)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{AGENT_TYPE_LABELS[t]}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{AGENT_TYPE_DESCRIPTIONS[t]}</p>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <Label>Agent Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div>
          <Label>Description</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div>
          <Label>Guidelines Engine (Published Only)</Label>
          <Select value={engineId} onValueChange={setEngineId}>
            <SelectTrigger><SelectValue placeholder="Select an engine" /></SelectTrigger>
            <SelectContent>
              {publishedEngines.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name} v{e.version}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Trigger Stage</Label>
            <Select value={triggerStage} onValueChange={(v) => setTriggerStage(v as TriggerStage)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="post_supervisor_review">Post-Supervisor Review</SelectItem>
                <SelectItem value="post_biller_approval">Post-Biller Approval</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Execution Order</Label>
            <Input type="number" min={1} max={99} value={executionOrder} onChange={e => setExecutionOrder(parseInt(e.target.value) || 1)} />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Scope (Service Codes)</Label>
          <div className="flex flex-wrap gap-2">
            {SERVICE_CODES.map(code => (
              <Badge
                key={code}
                variant={scope.includes(code) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleScope(code)}
              >
                {code}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Auto-Monitor</Label>
            <p className="text-xs text-muted-foreground">Automatically run when attendance reaches trigger stage</p>
          </div>
          <Switch checked={autoMonitor} onCheckedChange={setAutoMonitor} />
        </div>

        <div>
          <Label>Apply Mode</Label>
          <Select value={applyMode} onValueChange={setApplyMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual (default)</SelectItem>
              <SelectItem value="pre-selected">Pre-selected</SelectItem>
              <SelectItem value="supervisor-bulk">Supervisor Bulk Apply</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">All modes still require human confirmation before writes.</p>
        </div>

        <Button className="w-full" disabled={!selectedType || !name || !engineId} onClick={() => navigate(`/billing/agents/${id}`)}>
          Save Changes
        </Button>
      </Card>
    </div>
  );
};

export default AgentEdit;
