import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Search, FileDown, Send, AlertTriangle, DollarSign, Clock,
  CheckCircle2, XCircle, RotateCcw, Eye, PenLine, ArrowRight, CalendarIcon, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { mockClaimDrafts, mockClaimTracking, mockPipelineRuns } from '@/mocks/billing';
import { useBillingContext } from '@/contexts/BillingContext';
import { useToast } from '@/hooks/use-toast';
import type { ClaimDraft, ClaimTracking, TrackingStatus } from '@/types/billing';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const MonthYearPicker = ({ selectedMonth, selectedYear, onChange }: { selectedMonth: number; selectedYear: number; onChange: (month: number, year: number) => void }) => {
  const [viewYear, setViewYear] = useState(selectedYear);
  const [open, setOpen] = useState(false);
  const now = new Date();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarIcon className="h-4 w-4" />
          {MONTH_NAMES[selectedMonth]} {selectedYear}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewYear(y => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground">{viewYear}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewYear(y => y + 1)} disabled={viewYear >= now.getFullYear()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_NAMES.map((name, i) => {
            const isFuture = viewYear > now.getFullYear() || (viewYear === now.getFullYear() && i > now.getMonth());
            const isSelected = i === selectedMonth && viewYear === selectedYear;
            return (
              <Button
                key={name}
                variant={isSelected ? 'default' : 'ghost'}
                size="sm"
                className="h-8 text-xs"
                disabled={isFuture}
                onClick={() => { onChange(i, viewYear); setOpen(false); }}
              >
                {name.slice(0, 3)}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ─── Status helpers ───
const draftStatusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  blocked: 'bg-billing-at-risk/10 text-billing-at-risk border-billing-at-risk/30',
  ready_to_bill: 'bg-billing-healthy/10 text-billing-healthy border-billing-healthy/30',
};
const draftStatusLabel: Record<string, string> = { draft: 'Draft', blocked: 'Blocked', ready_to_bill: 'Ready to Bill' };
const sourceLabel: Record<string, string> = { agent_pipeline: 'Agent Pipeline', manual_bypass: 'Manual Bypass', recalculated: 'Recalculated' };
const trackingStatusLabel: Record<string, string> = { generated: 'Generated', billed: 'Billed', accepted_clearinghouse: 'Accepted (CH)', accepted_payer: 'Accepted (Payer)', denied: 'Denied', paid: 'Paid' };
const trackingStatusColor: Record<string, string> = {
  generated: 'bg-muted text-muted-foreground',
  billed: 'bg-primary/10 text-primary border-primary/30',
  accepted_clearinghouse: 'bg-primary/10 text-primary border-primary/30',
  accepted_payer: 'bg-billing-healthy/10 text-billing-healthy border-billing-healthy/30',
  denied: 'bg-billing-at-risk/10 text-billing-at-risk border-billing-at-risk/30',
  paid: 'bg-billing-healthy/10 text-billing-healthy border-billing-healthy/30',
};

const ClaimsManagement = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'dashboard';
  const [tab, setTab] = useState(initialTab);
  const { toast } = useToast();
  const { role } = useBillingContext();
  const navigate = useNavigate();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    toast({ title: 'Period Updated', description: `Showing data for ${MONTH_NAMES[month]} ${year}` });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Claims Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage claim drafts from agent pipeline through submission and tracking</p>
        </div>
        <div className="flex gap-2">
          <MonthYearPicker selectedMonth={selectedMonth} selectedYear={selectedYear} onChange={handleMonthChange} />
          <Button variant="outline" size="sm" onClick={() => toast({ title: 'Export 837 Batch', description: 'Mock 837 batch file generated.' })}>
            <FileDown className="h-4 w-4 mr-1.5" /> Export 837
          </Button>
          <Button size="sm" onClick={() => toast({ title: 'Submit via Stedi', description: 'Mock submission initiated.' })}>
            <Send className="h-4 w-4 mr-1.5" /> Submit via Stedi
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="drafts">Draft Queue</TabsTrigger>
          <TabsTrigger value="ready">Ready to Bill</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab selectedMonth={selectedMonth} selectedYear={selectedYear} /></TabsContent>
        <TabsContent value="drafts"><DraftQueueTab navigate={navigate} role={role} toast={toast} /></TabsContent>
        <TabsContent value="ready"><ReadyToBillTab toast={toast} /></TabsContent>
        <TabsContent value="tracking"><TrackingTab /></TabsContent>
      </Tabs>
    </div>
  );
};

// ─── A) Dashboard Tab ───
const DashboardTab = ({ selectedMonth, selectedYear }: { selectedMonth: number; selectedYear: number }) => {
  const readyCount = mockClaimDrafts.filter(d => d.status === 'ready_to_bill').length;
  const readyTotal = mockClaimDrafts.filter(d => d.status === 'ready_to_bill').reduce((s, d) => s + d.totalAmount, 0);
  const submittedCount = mockClaimTracking.filter(t => t.status === 'billed' || t.status === 'accepted_clearinghouse').length;
  const paidCount = mockClaimTracking.filter(t => t.status === 'paid').length;
  const paidTotal = mockClaimTracking.filter(t => t.status === 'paid').reduce((s, t) => s + t.totalAmount, 0);
  const deniedCount = mockClaimTracking.filter(t => t.status === 'denied').length;
  const rejectedRecords = mockClaimTracking.filter(t => t.status === 'denied');

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><DollarSign className="h-4 w-4 text-billing-healthy" /><span className="text-xs text-muted-foreground">Ready to Bill</span></div>
          <p className="text-2xl font-bold text-foreground">{readyCount}</p>
          <p className="text-xs text-muted-foreground">${readyTotal.toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Send className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Submitted</span></div>
          <p className="text-2xl font-bold text-foreground">{submittedCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="h-4 w-4 text-billing-healthy" /><span className="text-xs text-muted-foreground">Paid</span></div>
          <p className="text-2xl font-bold text-foreground">{paidCount}</p>
          <p className="text-xs text-muted-foreground">${paidTotal.toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><RotateCcw className="h-4 w-4 text-billing-warning" /><span className="text-xs text-muted-foreground">Re-Submitted</span></div>
          <p className="text-2xl font-bold text-foreground">0</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><XCircle className="h-4 w-4 text-billing-at-risk" /><span className="text-xs text-muted-foreground">Rejected</span></div>
          <p className="text-2xl font-bold text-foreground">{deniedCount}</p>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">Showing: {MONTH_NAMES[selectedMonth]} {selectedYear} · Data Current As Of: {new Date().toLocaleString()}</p>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Rejected Records</h3>
        {rejectedRecords.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rejected records.</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Individual</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Service</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Reason</th>
                </tr>
              </thead>
              <tbody>
                {rejectedRecords.map(r => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3 font-mono text-xs">{r.id}</td>
                    <td className="p-3">{r.individualName}</td>
                    <td className="p-3 text-muted-foreground">{r.service}</td>
                    <td className="p-3 font-medium">${r.totalAmount.toFixed(2)}</td>
                    <td className="p-3 text-xs text-billing-at-risk">{r.denialReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── B) Draft Queue Tab ───
const DraftQueueTab = ({ navigate, role, toast }: { navigate: ReturnType<typeof useNavigate>; role: string; toast: ReturnType<typeof useToast>['toast'] }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<ClaimDraft | null>(null);
  const [editDraft, setEditDraft] = useState<ClaimDraft | null>(null);

  const hasAutoMonitor = true; // mock: active auto-monitor agents exist
  const isAdmin = role === 'admin' || role === 'supervisor';

  const filtered = mockClaimDrafts.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (search && !d.individualName.toLowerCase().includes(search.toLowerCase()) && !d.billingCode.includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-4 mt-4">
      {/* Warn banner for manual bypass */}
      {filtered.some(d => d.generationSource === 'manual_bypass') && (
        <div className="p-3 bg-billing-warning/10 border border-billing-warning/30 rounded-lg flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-billing-warning shrink-0" />
          <span className="text-foreground">Some drafts were generated via Manual Bypass and did not pass through guideline agents.</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or code..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="ready_to_bill">Ready to Bill</SelectItem>
          </SelectContent>
        </Select>
        {hasAutoMonitor && isAdmin ? (
          <Button size="sm" onClick={() => toast({ title: 'Re-Run Pipeline', description: 'Pipeline re-run triggered for all pending attendance.' })}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Re-Run Pipeline
          </Button>
        ) : (
          <Button size="sm" onClick={() => toast({ title: 'Manual Generate', description: 'Claims generated bypassing agents.' })}>
            Generate Claims
          </Button>
        )}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Individual</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Service</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Code</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Units</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Dates</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Source</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(draft => (
              <tr key={draft.id} className="border-t border-border hover:bg-muted/50">
                <td className="p-3 font-mono text-xs">{draft.id}</td>
                <td className="p-3 text-foreground">
                  {draft.individualName}
                  {draft.manuallyModified && <Badge variant="outline" className="ml-1.5 text-[9px] text-billing-warning border-billing-warning/30">Modified</Badge>}
                </td>
                <td className="p-3 text-muted-foreground">{draft.service}</td>
                <td className="p-3 font-mono text-xs">{draft.billingCode} {draft.modifiers.join(' ')}</td>
                <td className="p-3">{draft.units}</td>
                <td className="p-3 font-medium">${draft.totalAmount.toFixed(2)}</td>
                <td className="p-3 text-xs text-muted-foreground">{draft.billingDateStart} – {draft.billingDateEnd}</td>
                <td className="p-3"><Badge variant="outline" className={draftStatusColors[draft.status]}>{draftStatusLabel[draft.status]}</Badge></td>
                <td className="p-3"><Badge variant="secondary" className="text-[10px]">{sourceLabel[draft.generationSource]}</Badge></td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSelected(draft)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditDraft(draft)}>
                      <PenLine className="h-3.5 w-3.5" />
                    </Button>
                    {draft.pipelineRunId && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => navigate(`/billing/runs`)}>
                        Pipeline
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No claim drafts found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-[480px] overflow-auto">
          {selected && (
            <>
              <SheetHeader><SheetTitle>Claim Draft {selected.id}</SheetTitle></SheetHeader>
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Individual:</span><span className="font-medium">{selected.individualName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payer:</span><span>{selected.payer}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Funding Stream:</span><span>{selected.fundingStream}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Program:</span><span>{selected.program}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Service:</span><span>{selected.service}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Code:</span><span className="font-mono">{selected.billingCode} {selected.modifiers.join(' ')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Units:</span><span>{selected.units}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Rate:</span><span>${selected.rate.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total:</span><span className="font-bold">${selected.totalAmount.toFixed(2)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Engine:</span><span>{selected.engineName} v{selected.engineVersion}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Source:</span><Badge variant="secondary" className="text-[10px]">{sourceLabel[selected.generationSource]}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pipeline:</span><span className="font-mono text-xs">{selected.pipelineRunId || '—'}</span></div>
                {selected.manuallyModified && selected.agentBaseline && (
                  <>
                    <Separator />
                    <div className="p-3 bg-billing-warning/5 border border-billing-warning/30 rounded-lg space-y-2">
                      <p className="text-xs font-medium text-billing-warning">Manually Modified — Diff from Agent Baseline</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Baseline Units:</span> {selected.agentBaseline.units}</div>
                        <div><span className="text-muted-foreground">Current Units:</span> {selected.units}</div>
                        <div><span className="text-muted-foreground">Baseline Total:</span> ${selected.agentBaseline.totalAmount.toFixed(2)}</div>
                        <div><span className="text-muted-foreground">Current Total:</span> ${selected.totalAmount.toFixed(2)}</div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Manual edits override agent output. Pipeline will not auto re-run.</p>
                    </div>
                  </>
                )}
                {selected.status === 'blocked' && (
                  <>
                    <Separator />
                    <div className="p-3 bg-billing-at-risk/5 border border-billing-at-risk/30 rounded-lg">
                      <p className="text-xs font-medium text-billing-at-risk mb-1">Block Reasons</p>
                      <ul className="text-xs space-y-1">{selected.blockReasons.map((r, i) => <li key={i}>• {r}</li>)}</ul>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Modal */}
      <EditDraftModal draft={editDraft} onClose={() => setEditDraft(null)} />
    </div>
  );
};

// ─── Edit Draft Modal ───
const EditDraftModal = ({ draft, onClose }: { draft: ClaimDraft | null; onClose: () => void }) => {
  const [units, setUnits] = useState(draft?.units || 0);
  const [mods, setMods] = useState(draft?.modifiers.join(', ') || '');
  const { toast } = useToast();

  if (!draft) return null;

  return (
    <Dialog open={!!draft} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Claim Draft {draft.id}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium">Units</label>
            <Input type="number" value={units} onChange={e => setUnits(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className="text-sm font-medium">Modifiers</label>
            <Input value={mods} onChange={e => setMods(e.target.value)} placeholder="e.g., HQ, U1" />
          </div>
          <p className="text-xs text-muted-foreground">
            ⚠️ Manual edits will mark this draft as "Manually Modified" and override agent output.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { toast({ title: 'Draft Updated', description: `Draft ${draft.id} marked as Manually Modified.` }); onClose(); }}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── C) Ready to Bill Tab ───
const ReadyToBillTab = ({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const ready = mockClaimDrafts.filter(d => d.status === 'ready_to_bill');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    if (selectedIds.size === ready.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(ready.map(d => d.id)));
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{ready.length} claims ready to bill • {selectedIds.size} selected</p>
        <Button size="sm" disabled={selectedIds.size === 0} onClick={() => toast({ title: 'Claims Submitted', description: `${selectedIds.size} claims submitted for billing.` })}>
          <Send className="h-4 w-4 mr-1.5" /> Submit Selected ({selectedIds.size})
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 w-10"><Checkbox checked={selectedIds.size === ready.length && ready.length > 0} onCheckedChange={toggleAll} /></th>
              <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Individual</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Service</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Code</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Units</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Payer</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Billing Dates</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {ready.map(d => (
              <tr key={d.id} className="border-t border-border hover:bg-muted/50">
                <td className="p-3"><Checkbox checked={selectedIds.has(d.id)} onCheckedChange={() => toggleSelect(d.id)} /></td>
                <td className="p-3 font-mono text-xs">{d.id}</td>
                <td className="p-3">{d.individualName}</td>
                <td className="p-3 text-muted-foreground">{d.service}</td>
                <td className="p-3 font-mono text-xs">{d.billingCode} {d.modifiers.join(' ')}</td>
                <td className="p-3">{d.units}</td>
                <td className="p-3 font-medium">${d.totalAmount.toFixed(2)}</td>
                <td className="p-3 text-xs text-muted-foreground">{d.payer}</td>
                <td className="p-3 text-xs text-muted-foreground">{d.billingDateStart} – {d.billingDateEnd}</td>
                <td className="p-3"><Badge variant="outline" className={draftStatusColors.ready_to_bill}>Ready to Bill</Badge></td>
              </tr>
            ))}
            {ready.length === 0 && (
              <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No claims ready to bill</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── D) Tracking Tab ───
const TrackingTab = () => {
  const [selected, setSelected] = useState<ClaimTracking | null>(null);
  const [quickFix, setQuickFix] = useState<ClaimTracking | null>(null);
  const { toast } = useToast();

  return (
    <div className="space-y-4 mt-4">
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Individual</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Service</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Payer</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockClaimTracking.map(ct => (
              <tr key={ct.id} className="border-t border-border hover:bg-muted/50">
                <td className="p-3 font-mono text-xs">{ct.id}</td>
                <td className="p-3">{ct.individualName}</td>
                <td className="p-3 text-muted-foreground">{ct.service}</td>
                <td className="p-3 font-medium">${ct.totalAmount.toFixed(2)}</td>
                <td className="p-3 text-xs text-muted-foreground">{ct.payer}</td>
                <td className="p-3"><Badge variant="outline" className={trackingStatusColor[ct.status]}>{trackingStatusLabel[ct.status]}</Badge></td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSelected(ct)}>
                      <Clock className="h-3.5 w-3.5" />
                    </Button>
                    {ct.status === 'denied' && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-billing-at-risk" onClick={() => setQuickFix(ct)}>
                        Quick Fix
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Timeline Drawer */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-[440px] overflow-auto">
          {selected && (
            <>
              <SheetHeader><SheetTitle>Claim Timeline — {selected.id}</SheetTitle></SheetHeader>
              <div className="mt-6 space-y-1">
                {selected.timeline.map((t, i) => (
                  <div key={i} className="flex gap-3 py-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${t.status === 'denied' ? 'bg-billing-at-risk' : t.status === 'paid' ? 'bg-billing-healthy' : 'bg-primary'}`} />
                      {i < selected.timeline.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                    </div>
                    <div className="pb-2">
                      <p className="text-sm font-medium text-foreground">{trackingStatusLabel[t.status]}</p>
                      <p className="text-xs text-muted-foreground">{t.timestamp}</p>
                      {t.note && <p className="text-xs text-muted-foreground mt-0.5">{t.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Quick Fix Modal */}
      <Dialog open={!!quickFix} onOpenChange={() => setQuickFix(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Quick Fix — {quickFix?.id}</DialogTitle></DialogHeader>
          {quickFix && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-billing-at-risk/5 border border-billing-at-risk/30 rounded-lg">
                <p className="text-xs font-medium text-billing-at-risk mb-1">Denial Reason</p>
                <p className="text-sm">{quickFix.denialReason}</p>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" variant="outline" onClick={() => { toast({ title: 'Write Off', description: `Claim ${quickFix.id} written off.` }); setQuickFix(null); }}>
                  Write Off
                </Button>
                <Button className="flex-1" onClick={() => { toast({ title: 'Resubmit', description: `Claim ${quickFix.id} queued for resubmission.` }); setQuickFix(null); }}>
                  <RotateCcw className="h-4 w-4 mr-1.5" /> Resubmit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClaimsManagement;
