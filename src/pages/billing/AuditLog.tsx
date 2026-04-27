import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Shield, SlidersHorizontal, ChevronDown, Zap } from 'lucide-react';
import { mockAuditEntries } from '@/mocks/billing';

const autoBatchEntry = {
  id: 'aud-auto-001',
  timestamp: '2026-04-21 00:01:00',
  user: 'System (Auto-Batch)',
  action: 'Auto-Batch Submission',
  individualId: undefined as string | undefined,
  modulesUpdated: ['ClaimSubmission', 'AuditTrail'],
  idempotencyKey: 'idem-batch-2026-041',
  details: '⚡ Auto-submitted via BATCH-2026-041 · 94 claims · $52,340.00',
  isAutoBatch: true,
  status: 'Success',
};

const AuditLog = () => {
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actionFilter, setActionFilter] = useState('all');

  const allEntries = [autoBatchEntry, ...mockAuditEntries];
  const uniqueActions = [...new Set(allEntries.map(e => e.action))];

  const filtered = allEntries.filter(e => {
    if (actionFilter !== 'all' && e.action !== actionFilter) return false;
    if (!search) return true;
    return (
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.user.toLowerCase().includes(search.toLowerCase()) ||
      e.details.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="space-y-2">
        <div className="flex gap-2 items-center">
          <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-sm rounded-xl hover:bg-secondary" onClick={() => setFiltersOpen(o => !o)}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            <ChevronDown className={`h-3 w-3 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </Button>
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search audit log..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9 rounded-xl" />
          </div>
        </div>
        {filtersOpen && (
          <div className="flex gap-2 items-center flex-wrap p-3 rounded-2xl bg-card shadow-elevated animate-in fade-in-0 slide-in-from-top-1 duration-200">
            <Input type="date" className="h-9 w-36 rounded-xl" />
            <Input type="date" className="h-9 w-36 rounded-xl" />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-44 h-9 text-sm bg-card rounded-xl"><SelectValue placeholder="Action Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button className="text-sm text-muted-foreground font-medium hover:text-foreground whitespace-nowrap" onClick={() => { setActionFilter('all'); setFiltersOpen(false); }}>Clear</button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-[32px] font-extrabold font-display tracking-tight text-foreground">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Immutable record of all billing actions and system events</p>
        </div>
      </div>

      <Card className="rounded-2xl shadow-elevated overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary">
              <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Timestamp</th>
              <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">User</th>
              <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Action</th>
              <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Event</th>
              <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Status</th>
              <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Idempotency Key</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry: any) => {
              const isAuto = !!entry.isAutoBatch;
              return (
                <tr key={entry.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="p-3 text-xs font-mono text-muted-foreground">{entry.timestamp}</td>
                  <td className={`p-3 font-medium ${isAuto ? 'text-amber-700' : 'text-foreground'}`}>{entry.user}</td>
                  <td className="p-3">
                    <Badge variant="outline" className={`text-xs rounded-full ${isAuto ? 'bg-amber-50 text-amber-700 border-amber-300' : ''}`}>{entry.action}</Badge>
                  </td>
                  <td className="p-3 text-sm">
                    {isAuto ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                        <Zap className="h-3.5 w-3.5" />
                        Auto-submitted via BATCH-2026-041 · 94 claims · $52,340.00
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{entry.details}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs rounded-full bg-billing-healthy/10 text-billing-healthy border-billing-healthy/30">{entry.status || 'Success'}</Badge>
                  </td>
                  <td className="p-3 text-xs font-mono text-muted-foreground truncate max-w-[140px]">{entry.idempotencyKey}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground">Showing {filtered.length} of {allEntries.length} entries • This log is immutable and cannot be modified.</p>
    </div>
  );
};

export default AuditLog;
