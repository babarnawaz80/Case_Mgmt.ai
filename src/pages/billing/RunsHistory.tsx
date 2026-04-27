import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, SlidersHorizontal, ChevronDown, Zap } from 'lucide-react';
import { mockRuns } from '@/mocks/billing';
import { useBillingContext } from '@/contexts/BillingContext';
import { mockBatchSubmissions, mockBatchDetailClaims, type BatchSubmission } from '@/mocks/batchSubmissions';
import { useToast } from '@/hooks/use-toast';

const resultColors: Record<string, string> = {
  Clean: 'bg-billing-healthy/10 text-billing-healthy border-billing-healthy/30',
  Pending: 'bg-billing-warning/10 text-billing-warning border-billing-warning/30',
  Flagged: 'bg-billing-warning/10 text-billing-warning border-billing-warning/30',
  Denied: 'bg-billing-at-risk/10 text-billing-at-risk border-billing-at-risk/30',
};

interface ClinicRun {
  id: string;
  agentName: string;
  individualName: string;
  service: string;
  dateRange: string;
  status: string;
  billingCode: string;
  units: number;
  totalAmount: number;
  createdAt: string;
}

const clinicRuns: ClinicRun[] = [
  { id: 'run-C01', agentName: 'Arc Lex Clinic Agent', individualName: 'Robert Johnson', service: 'Psychiatry Visit', dateRange: '2026-04-12', status: 'Clean', billingCode: '99213', units: 1, totalAmount: 185.00, createdAt: '2026-04-12 10:02' },
  { id: 'run-C02', agentName: 'Arc Lex Clinic Agent', individualName: 'Jennifer Davis', service: 'Counseling Session', dateRange: '2026-04-11', status: 'Clean', billingCode: '90837', units: 1, totalAmount: 5654.40, createdAt: '2026-04-11 14:15' },
  { id: 'run-C03', agentName: 'Arc Lex Clinic Agent', individualName: 'Sarah Mitchell', service: 'OT Evaluation', dateRange: '2026-04-10', status: 'Flagged', billingCode: '97165', units: 1, totalAmount: 420.00, createdAt: '2026-04-10 9:30' },
  { id: 'run-C04', agentName: 'Arc Lex Clinic Agent', individualName: 'David Chen', service: 'Psychiatry Visit', dateRange: '2026-04-10', status: 'Pending', billingCode: '99412', units: 1, totalAmount: 185.00, createdAt: '2026-04-10 11:00' },
  { id: 'run-C05', agentName: 'Arc Lex Clinic Agent', individualName: 'Tom Cat', service: 'OT Session', dateRange: '2026-04-07', status: 'Clean', billingCode: '97110', units: 1, totalAmount: 600.00, createdAt: '2026-04-07 8:45' },
  { id: 'run-C06', agentName: 'Arc Lex Clinic Agent', individualName: 'Michael Brown', service: 'Counseling Session', dateRange: '2026-04-07', status: 'Pending', billingCode: '90837', units: 1, totalAmount: 659.20, createdAt: '2026-04-07 13:20' },
  { id: 'run-C07', agentName: 'Arc Lex Clinic Agent', individualName: 'Michael Barnes', service: 'Psychiatry Visit', dateRange: '2026-03-01', status: 'Clean', billingCode: '90792', units: 1, totalAmount: 36.00, createdAt: '2026-03-01 9:05' },
  { id: 'run-C08', agentName: 'Arc Lex Clinic Agent', individualName: 'Jennifer Davis', service: 'Counseling Session', dateRange: '2026-02-28', status: 'Clean', billingCode: '90837', units: 1, totalAmount: 5200.00, createdAt: '2026-02-28 15:30' },
];

const RunsHistory = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [subTab, setSubTab] = useState('runs');
  const [reviewBatch, setReviewBatch] = useState<BatchSubmission | null>(null);
  const [viewBatch, setViewBatch] = useState<BatchSubmission | null>(null);
  const { claimTypeFilter: ctf } = useBillingContext();
  const { toast } = useToast();

  const isClinic = ctf === 'Clinic';
  const patientLabel = isClinic ? 'Patient' : 'Individual';

  const filtered = isClinic
    ? clinicRuns.filter(r => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (search && !r.individualName.toLowerCase().includes(search.toLowerCase()) && !r.agentName.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
    : mockRuns.filter(r => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (search && !r.individualName.toLowerCase().includes(search.toLowerCase()) && !r.agentName.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });

  const ClaimTypeBadge = ({ type }: { type: 'IDD' | 'Clinic' }) => {
    const cls = type === 'IDD' ? 'bg-[hsl(245,58%,51%)] text-white' : 'bg-[hsl(162,63%,41%)] text-white';
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>{type}</span>;
  };

  const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[32px] font-extrabold font-display tracking-tight text-foreground">Runs History</h1>
        <p className="text-sm text-muted-foreground mt-1">All agent billing runs and automatic batch submissions</p>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="runs">Agent Runs</TabsTrigger>
          <TabsTrigger value="batches">Batch Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="space-y-4 mt-4">
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
                <Input placeholder="Search by individual or agent..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9 rounded-xl" />
              </div>
            </div>
            {filtersOpen && (
              <div className="flex gap-2 items-center flex-wrap p-3 rounded-2xl bg-card shadow-elevated animate-in fade-in-0 slide-in-from-top-1 duration-200">
                <Input type="date" className="h-9 w-36 rounded-xl" />
                <Input type="date" className="h-9 w-36 rounded-xl" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 h-9 text-sm bg-card rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Results</SelectItem>
                    <SelectItem value="Clean">Clean</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Flagged">Flagged</SelectItem>
                    <SelectItem value="Denied">Denied</SelectItem>
                  </SelectContent>
                </Select>
                <button className="text-sm text-muted-foreground font-medium hover:text-foreground whitespace-nowrap" onClick={() => { setStatusFilter('all'); setFiltersOpen(false); }}>Clear</button>
              </div>
            )}
          </div>

          <Card className="rounded-2xl shadow-elevated overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Run ID</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Agent</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{patientLabel}</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Service</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Date Range</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Result</th>
                  {ctf === 'all' && <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Type</th>}
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Code</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Units</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Amount</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {isClinic ? (
                  filtered.map((run: any) => (
                    <tr key={run.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="p-3 font-mono text-xs text-foreground">{run.id}</td>
                      <td className="p-3 text-foreground font-medium">{run.agentName}</td>
                      <td className="p-3 text-foreground">{run.individualName}</td>
                      <td className="p-3 text-muted-foreground">{run.service}</td>
                      <td className="p-3 text-xs text-muted-foreground">{run.dateRange}</td>
                      <td className="p-3"><Badge variant="outline" className={`rounded-full ${resultColors[run.status] || ''}`}>{run.status}</Badge></td>
                      <td className="p-3 font-mono text-xs">{run.billingCode}</td>
                      <td className="p-3">{run.units}</td>
                      <td className="p-3 font-bold font-display text-foreground">${run.totalAmount.toFixed(2)}</td>
                      <td className="p-3 text-xs text-muted-foreground">{run.createdAt}</td>
                    </tr>
                  ))
                ) : ctf === 'all' ? (
                  <>
                    {mockRuns.map(run => (
                      <tr key={run.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="p-3 font-mono text-xs text-foreground">{run.id}</td>
                        <td className="p-3 text-foreground font-medium">{run.agentName}</td>
                        <td className="p-3 text-foreground">{run.individualName}</td>
                        <td className="p-3 text-muted-foreground">{run.service}</td>
                        <td className="p-3 text-xs text-muted-foreground">{run.dateRange}</td>
                        <td className="p-3"><Badge variant="outline" className={`rounded-full ${resultColors[run.status]}`}>{run.status}</Badge></td>
                        <td className="p-3"><ClaimTypeBadge type="IDD" /></td>
                        <td className="p-3 font-mono text-xs">{run.billingCode} {run.modifiers.join(' ')}</td>
                        <td className="p-3">{run.units}</td>
                        <td className="p-3 font-bold font-display text-foreground">${run.totalAmount.toFixed(2)}</td>
                        <td className="p-3 text-xs text-muted-foreground">{run.createdAt}</td>
                      </tr>
                    ))}
                    {clinicRuns.map(run => (
                      <tr key={run.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="p-3 font-mono text-xs text-foreground">{run.id}</td>
                        <td className="p-3 text-foreground font-medium">{run.agentName}</td>
                        <td className="p-3 text-foreground">{run.individualName}</td>
                        <td className="p-3 text-muted-foreground">{run.service}</td>
                        <td className="p-3 text-xs text-muted-foreground">{run.dateRange}</td>
                        <td className="p-3"><Badge variant="outline" className={`rounded-full ${resultColors[run.status] || ''}`}>{run.status}</Badge></td>
                        <td className="p-3"><ClaimTypeBadge type="Clinic" /></td>
                        <td className="p-3 font-mono text-xs">{run.billingCode}</td>
                        <td className="p-3">{run.units}</td>
                        <td className="p-3 font-bold font-display text-foreground">${run.totalAmount.toFixed(2)}</td>
                        <td className="p-3 text-xs text-muted-foreground">{run.createdAt}</td>
                      </tr>
                    ))}
                  </>
                ) : (
                  filtered.map(run => (
                    <tr key={run.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="p-3 font-mono text-xs text-foreground">{run.id}</td>
                      <td className="p-3 text-foreground font-medium">{run.agentName}</td>
                      <td className="p-3 text-foreground">{run.individualName}</td>
                      <td className="p-3 text-muted-foreground">{run.service}</td>
                      <td className="p-3 text-xs text-muted-foreground">{run.dateRange}</td>
                      <td className="p-3"><Badge variant="outline" className={`rounded-full ${resultColors[run.status]}`}>{run.status}</Badge></td>
                      <td className="p-3 font-mono text-xs">{run.billingCode} {('modifiers' in run && Array.isArray((run as any).modifiers)) ? (run as any).modifiers.join(' ') : ''}</td>
                      <td className="p-3">{run.units}</td>
                      <td className="p-3 font-bold font-display text-foreground">${run.totalAmount.toFixed(2)}</td>
                      <td className="p-3 text-xs text-muted-foreground">{run.createdAt}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
          <p className="text-xs text-muted-foreground">
            Showing {isClinic ? filtered.length : ctf === 'all' ? mockRuns.length + clinicRuns.length : filtered.length} {ctf === 'all' ? `(${mockRuns.length} IDD + ${clinicRuns.length} Clinic)` : ''} runs
          </p>
        </TabsContent>

        <TabsContent value="batches" className="space-y-4 mt-4">
          <Card className="rounded-2xl shadow-elevated overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Batch ID</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Date Submitted</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Cadence</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Claims</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Total Amount</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Variance</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Status</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {mockBatchSubmissions.map(b => (
                  <tr key={b.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="p-3 font-mono text-xs text-foreground">{b.id}</td>
                    <td className="p-3 text-xs text-muted-foreground">{b.submittedAt}</td>
                    <td className="p-3 text-foreground">{b.cadence}</td>
                    <td className="p-3 text-foreground">{b.claims}</td>
                    <td className="p-3 font-bold font-display text-foreground">{fmtMoney(b.totalAmount)}</td>
                    <td className={`p-3 text-xs font-medium ${b.status === 'held' ? 'text-amber-600' : 'text-muted-foreground'}`}>+{b.variancePct}%</td>
                    <td className="p-3">
                      {b.status === 'submitted' ? (
                        <Badge variant="outline" className="rounded-full bg-billing-healthy/10 text-billing-healthy border-billing-healthy/30">Submitted</Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-full bg-amber-50 text-amber-700 border-amber-300">⚠ Held — Variance Exceeded</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      {b.status === 'held' ? (
                        <Button size="sm" variant="outline" className="text-xs h-8 rounded-xl border-amber-400 text-amber-700 hover:bg-amber-50" onClick={() => setReviewBatch(b)}>
                          Review & Release
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-xs h-8 rounded-xl" onClick={() => setViewBatch(b)}>View</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="text-xs text-muted-foreground">Showing {mockBatchSubmissions.length} batch submissions</p>
        </TabsContent>
      </Tabs>

      {/* Review & Release Modal */}
      <Dialog open={!!reviewBatch} onOpenChange={(open) => !open && setReviewBatch(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Review Held Batch — {reviewBatch?.id}</DialogTitle>
          </DialogHeader>
          {reviewBatch && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This batch was held because the total amount ({fmtMoney(reviewBatch.totalAmount)}) exceeded the {reviewBatch.thresholdPct}% variance threshold compared to the prior 4-week average ({fmtMoney(reviewBatch.priorAverage || 0)}).
              </p>
              <div className="grid grid-cols-4 gap-3 rounded-xl bg-secondary p-3 text-xs">
                <div><div className="text-muted-foreground">Claims</div><div className="font-bold font-display text-foreground text-sm mt-0.5">{reviewBatch.claims}</div></div>
                <div><div className="text-muted-foreground">Total</div><div className="font-bold font-display text-foreground text-sm mt-0.5">{fmtMoney(reviewBatch.totalAmount)}</div></div>
                <div><div className="text-muted-foreground">Threshold</div><div className="font-bold font-display text-foreground text-sm mt-0.5">{reviewBatch.thresholdPct}%</div></div>
                <div><div className="text-muted-foreground">Actual variance</div><div className="font-bold font-display text-amber-600 text-sm mt-0.5">+{reviewBatch.variancePct}%</div></div>
              </div>
              <DialogFooter className="flex-col sm:flex-col gap-2 sm:gap-2 sm:space-x-0">
                <div className="flex gap-2 w-full justify-end">
                  <Button variant="outline" className="rounded-xl border-billing-at-risk text-billing-at-risk hover:bg-billing-at-risk/10" onClick={() => { toast({ title: `${reviewBatch.id} discarded` }); setReviewBatch(null); }}>
                    Discard Batch
                  </Button>
                  <Button className="rounded-xl btn-primary-gradient text-white font-bold" onClick={() => { toast({ title: `${reviewBatch.id} released and submitted` }); setReviewBatch(null); }}>
                    Release & Submit
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground w-full text-right">Released batches are submitted immediately to the clearinghouse and cannot be recalled.</p>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Batch Detail Modal */}
      <Dialog open={!!viewBatch} onOpenChange={(open) => !open && setViewBatch(null)}>
        <DialogContent className="rounded-2xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Batch Detail — {viewBatch?.id}</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left p-2.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Individual</th>
                  <th className="text-left p-2.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Program</th>
                  <th className="text-left p-2.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Payer</th>
                  <th className="text-right p-2.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Amount</th>
                  <th className="text-left p-2.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Submission Status</th>
                </tr>
              </thead>
              <tbody>
                {mockBatchDetailClaims.map((c, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-2.5 text-foreground font-medium">{c.individual}</td>
                    <td className="p-2.5 text-muted-foreground">{c.program}</td>
                    <td className="p-2.5 text-muted-foreground">{c.payer}</td>
                    <td className="p-2.5 text-right font-semibold">{fmtMoney(c.amount)}</td>
                    <td className="p-2.5">
                      <Badge variant="outline" className="rounded-full bg-amber-50 text-amber-700 border-amber-300 gap-1 text-[10px]">
                        <Zap className="h-2.5 w-2.5" />Auto Submitted
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setViewBatch(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RunsHistory;
