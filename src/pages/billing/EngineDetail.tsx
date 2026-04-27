import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Copy, Send, Archive } from 'lucide-react';
import { mockRulePacks } from '@/mocks/billing';
import { useBillingContext } from '@/contexts/BillingContext';

const statusColors: Record<string, string> = {
  draft: 'bg-billing-warning/10 text-billing-warning border-billing-warning/30',
  published: 'bg-billing-healthy/10 text-billing-healthy border-billing-healthy/30',
  archived: 'bg-muted text-muted-foreground border-border',
};

const EngineDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, engines, publishEngine, archiveEngine, newEngineVersion } = useBillingContext();
  const engine = engines.find(e => e.id === id);
  const packs = mockRulePacks.filter(rp => rp.engineId === id);

  if (!engine) return <div className="p-8 text-muted-foreground">Engine not found.</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/billing/engines')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{engine.name}</h1>
            <Badge variant="outline" className={statusColors[engine.status]}>{engine.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{engine.state} • {engine.program} • v{engine.version} • Effective {engine.effectiveDate}</p>
        </div>
        {role === 'admin' && (
          <div className="flex gap-2">
            {engine.status === 'published' && <Button size="sm" variant="outline" onClick={() => { const ne = newEngineVersion(engine.id); navigate(`/billing/engines/${ne.id}`); }}><Copy className="h-3.5 w-3.5 mr-1" /> New Version</Button>}
            {engine.status === 'draft' && <Button size="sm" onClick={() => publishEngine(engine.id)}><Send className="h-3.5 w-3.5 mr-1" /> Publish</Button>}
            {engine.status === 'published' && <Button size="sm" variant="ghost" onClick={() => archiveEngine(engine.id)}><Archive className="h-3.5 w-3.5" /></Button>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {[
          ['Services', engine.serviceCount],
          ['Rules', engine.ruleCount],
          ['Rate Tables', engine.rateTableCount],
          ['Hard Stops', engine.hardStopCount],
          ['Warnings', engine.warningCount],
        ].map(([label, val]) => (
          <Card key={String(label)} className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{val}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      <Separator />

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Rule Packs</h2>
        {packs.length === 0 && <p className="text-muted-foreground text-sm">No rule packs configured for this engine yet.</p>}
        <div className="space-y-3">
          {packs.map(pack => (
            <Card key={pack.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{pack.serviceName}</h3>
                  <p className="text-xs text-muted-foreground">{pack.serviceCategory} • {pack.billingCode} • {pack.billingUnit}</p>
                </div>
                <Badge variant="outline">{pack.modifiers.length} modifiers</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{pack.description}</p>
              <div className="flex gap-6 text-xs text-muted-foreground">
                <span>{pack.validationRules.length} validation rules</span>
                <span>{pack.limits.length} limits</span>
                <span>{pack.conflicts.length} conflicts</span>
                <span>{pack.citations.length} citations</span>
              </div>
              {pack.citations.length > 0 && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Sample Citation:</p>
                  <p className="text-xs text-foreground">Page {pack.citations[0].page}, §{pack.citations[0].section}: "{pack.citations[0].snippet}"</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Created by {engine.createdBy} • Last updated {engine.lastUpdated}
        {engine.publishedAt && ` • Published ${engine.publishedAt}`}
      </div>
    </div>
  );
};

export default EngineDetail;
