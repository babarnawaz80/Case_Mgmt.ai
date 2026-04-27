import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Search, FileDown, Send } from 'lucide-react';
import { mockClaims } from '@/mocks/billing';
import { useToast } from '@/hooks/use-toast';
import type { Claim, ClaimStatus } from '@/types/billing';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  ready: 'bg-billing-healthy/10 text-billing-healthy border-billing-healthy/30',
  submitted: 'bg-primary/10 text-primary border-primary/30',
  denied: 'bg-billing-at-risk/10 text-billing-at-risk border-billing-at-risk/30',
};

const ClaimsQueue = () => {
  const [tab, setTab] = useState<string>('draft');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Claim | null>(null);
  const { toast } = useToast();

  const filtered = mockClaims.filter(c => {
    if (c.status !== tab) return false;
    if (search && !c.individualName.toLowerCase().includes(search.toLowerCase()) && !c.billingCode.includes(search)) return false;
    return true;
  });

  const counts = (s: ClaimStatus) => mockClaims.filter(c => c.status === s).length;

  const handleExport837 = () => {
    toast({ title: 'Export 837 Batch', description: 'Mock 837 batch file generated and logged to audit.' });
  };

  const handleSubmitStedi = () => {
    toast({ title: 'Submit via Stedi', description: 'Mock submission initiated. Logged to audit trail.' });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Claims Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and manage billing claims across all statuses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport837}>
            <FileDown className="h-4 w-4 mr-1.5" /> Export 837 Batch
          </Button>
          <Button size="sm" onClick={handleSubmitStedi}>
            <Send className="h-4 w-4 mr-1.5" /> Submit via Stedi
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="draft">Draft ({counts('draft')})</TabsTrigger>
          <TabsTrigger value="ready">Ready ({counts('ready')})</TabsTrigger>
          <TabsTrigger value="submitted">Submitted ({counts('submitted')})</TabsTrigger>
          <TabsTrigger value="denied">Denied ({counts('denied')})</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <div className="relative max-w-sm mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search claims..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>

          {['draft', 'ready', 'submitted', 'denied'].map(s => (
            <TabsContent key={s} value={s}>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground">Claim ID</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Individual</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Service</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Code</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Units</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Payer</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">DOS</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(claim => (
                      <tr key={claim.id} className="border-t border-border hover:bg-muted/50 cursor-pointer" onClick={() => setSelected(claim)}>
                        <td className="p-3 font-mono text-xs text-foreground">{claim.id}</td>
                        <td className="p-3 text-foreground">{claim.individualName}</td>
                        <td className="p-3 text-muted-foreground">{claim.service}</td>
                        <td className="p-3 font-mono text-xs">{claim.billingCode}</td>
                        <td className="p-3">{claim.units}</td>
                        <td className="p-3 font-medium text-foreground">${claim.totalAmount.toFixed(2)}</td>
                        <td className="p-3 text-xs text-muted-foreground">{claim.payer}</td>
                        <td className="p-3 text-xs text-muted-foreground">{claim.dateOfService}</td>
                        <td className="p-3"><Badge variant="outline" className={statusColors[claim.status]}>{claim.status}</Badge></td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No claims in this status</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-[440px] overflow-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Claim {selected.id}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Individual:</span><span className="font-medium">{selected.individualName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Service:</span><span className="font-medium">{selected.service}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Code:</span><span className="font-mono">{selected.billingCode} {selected.modifiers.join(' ')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Units:</span><span className="font-medium">{selected.units}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Rate:</span><span className="font-medium">${selected.rate.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total:</span><span className="font-bold">${selected.totalAmount.toFixed(2)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Payer:</span><span>{selected.payer}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">State:</span><span>{selected.state}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">DOS:</span><span>{selected.dateOfService}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Engine:</span><span>v{selected.engineVersion}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Run:</span><span className="font-mono text-xs">{selected.runId}</span></div>
                {selected.denialReason && (
                  <>
                    <Separator />
                    <div className="p-3 bg-billing-at-risk/5 border border-billing-at-risk/30 rounded-lg">
                      <p className="text-xs font-medium text-billing-at-risk mb-1">Denial Reason</p>
                      <p className="text-sm text-foreground">{selected.denialReason}</p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ClaimsQueue;
