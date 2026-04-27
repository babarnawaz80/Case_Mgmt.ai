import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, CheckCircle, AlertTriangle, XCircle, Play, ChevronDown, Sparkles, Info, SlidersHorizontal } from 'lucide-react';
import AiBadge from '@/components/billing/AiBadge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useBillingContext } from '@/contexts/BillingContext';

interface IndividualRow {
  id: string;
  name: string;
  program: string;
  fundingStream: string;
  billingPeriod: string;
  status: 'blocked' | 'attention' | 'clean';
  topIssue: string;
  amount?: number;
}

const mockRows: IndividualRow[] = [
  { id: 'ind-05', name: 'David Kim', status: 'blocked', program: 'DDA Waiver', fundingStream: 'DDA Community', billingPeriod: 'Mar 1–15, 2026', topIssue: 'Authorization expired 02/28', amount: 892.40 },
  { id: 'ind-10', name: 'Patricia Anderson', status: 'blocked', program: 'DDA Waiver', fundingStream: 'DDA Residential', billingPeriod: 'Mar 1–15, 2026', topIssue: 'Missing progress note for 3/04', amount: 527.36 },
  { id: 'ind-03', name: 'Robert Johnson', status: 'attention', program: 'DDA Waiver', fundingStream: 'DDA Community', billingPeriod: 'Mar 1–15, 2026', topIssue: 'Auth balance below 20% — 18 units remaining', amount: 1142.40 },
  { id: 'ind-07', name: 'Michael Brown', status: 'attention', program: 'DDA Waiver', fundingStream: 'DDA Community', billingPeriod: 'Mar 1–15, 2026', topIssue: 'Daily cap warning on 3/12 (28/32 units)', amount: 644.80 },
  { id: 'ind-13', name: 'Daniel White', status: 'attention', program: 'HHSC CLASS/HCS', fundingStream: 'HHSC CLASS', billingPeriod: 'Mar 1–15, 2026', topIssue: 'Documentation score 78% — below threshold', amount: 980.20 },
  ...Array.from({ length: 119 }, (_, i) => ({
    id: `ind-clean-${i}`,
    name: ['James Wilson', 'Maria Garcia', 'Sarah Chen', 'Linda Martinez', 'Jennifer Davis', 'William Taylor', 'Christopher Thomas', 'Elizabeth Jackson', 'Barbara Harris', 'Matthew Clark'][i % 10],
    status: 'clean' as const,
    program: i < 80 ? 'DDA Waiver' : 'HHSC CLASS/HCS',
    fundingStream: i < 80 ? 'DDA Community' : 'HHSC HCS',
    billingPeriod: 'Mar 1–15, 2026',
    topIssue: 'All checks passed',
    amount: 350 + Math.round(Math.random() * 400 * 100) / 100,
  })),
];

// Clinic-specific compliance data
const clinicBlockedRows: IndividualRow[] = [
  { id: 'ind-c-01', name: 'Sarah Mitchell', status: 'blocked', program: 'Article 16 Clinic', fundingStream: 'OT Evaluation', billingPeriod: 'Apr 1–15, 2026', topIssue: 'Treatment plan expired 03/15', amount: 420.00 },
];

const clinicAttentionRows: IndividualRow[] = [
  { id: 'ind-c-02', name: 'David Chen', status: 'attention', program: 'Article 16 Clinic', fundingStream: 'Psychiatry Visit', billingPeriod: 'Apr 1–15, 2026', topIssue: 'CPT 99412 flagged — 99413 may apply', amount: 185.00 },
  { id: 'ind-c-03', name: 'Michael Brown', status: 'attention', program: 'Article 16 Clinic', fundingStream: 'Counseling', billingPeriod: 'Apr 1–15, 2026', topIssue: 'Documentation score 78% — below 85% threshold', amount: 659.20 },
];

const clinicCleanRows: IndividualRow[] = Array.from({ length: 40 }, (_, i) => ({
  id: `ind-clinic-clean-${i}`,
  name: ['Robert Johnson', 'Jennifer Davis', 'Tom Cat', 'Michael Barnes', 'David Chen', 'Sarah Mitchell', 'Lisa Thompson', 'James Wilson', 'Maria Garcia', 'Linda Martinez'][i % 10],
  status: 'clean' as const,
  program: 'Article 16 Clinic',
  fundingStream: 'Clinic Services',
  billingPeriod: 'Apr 1–15, 2026',
  topIssue: 'All checks passed',
  amount: 150 + Math.round(Math.random() * 500 * 100) / 100,
}));

const IndividualsBillingHealth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { claimTypeFilter: ctf } = useBillingContext();
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAllClean, setShowAllClean] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [submitModal, setSubmitModal] = useState(false);

  const isClinic = ctf === 'Clinic';

  const activeRows = isClinic ? [...clinicBlockedRows, ...clinicAttentionRows, ...clinicCleanRows] : mockRows;

  const blocked = activeRows.filter(r => r.status === 'blocked');
  const attention = activeRows.filter(r => r.status === 'attention');
  const clean = activeRows.filter(r => r.status === 'clean');
  const cleanTotal = clean.reduce((s, r) => s + (r.amount || 0), 0);

  const filtered = activeRows.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (programFilter !== 'all' && r.program !== programFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const filteredBlocked = filtered.filter(r => r.status === 'blocked');
  const filteredAttention = filtered.filter(r => r.status === 'attention');
  const filteredClean = filtered.filter(r => r.status === 'clean');

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  const colPatientLabel = isClinic ? 'Patient' : 'Individual';
  const colProgramLabel = isClinic ? 'Clinic Type' : 'Program';
  const colStreamLabel = isClinic ? 'Service' : 'Funding Stream';
  const colPeriodLabel = isClinic ? 'Service Period' : 'Billing Period';

  const renderRow = (row: IndividualRow) => (
    <tr
      key={row.id}
      className="hover:bg-secondary/50 cursor-pointer transition-colors"
      onClick={() => navigate(`/billing/individuals/${row.id}`)}
    >
      <td className="p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
            {getInitials(row.name)}
          </div>
          <span className="font-medium text-foreground">{row.name}</span>
        </div>
      </td>
      <td className="p-3 text-sm text-muted-foreground">{row.program}</td>
      <td className="p-3 text-sm text-muted-foreground">{row.fundingStream}</td>
      <td className="p-3 text-xs text-muted-foreground">{row.billingPeriod}</td>
      <td className="p-3">
        <Badge variant="outline" className={`text-[10px] rounded-full ${
          row.status === 'blocked' ? 'bg-billing-at-risk/10 text-billing-at-risk border-billing-at-risk/30' :
          row.status === 'attention' ? 'bg-billing-warning/10 text-billing-warning border-billing-warning/30' :
          'bg-billing-healthy/10 text-billing-healthy border-billing-healthy/30'
        }`}>
          {row.status === 'blocked' ? 'BLOCKED' : row.status === 'attention' ? 'REVIEW' : 'CLEAN'}
        </Badge>
      </td>
      <td className="p-3 text-xs text-muted-foreground">{row.topIssue}</td>
      <td className="p-3">
        {row.status !== 'clean' && (
          <Button size="sm" variant="outline" className="rounded-xl font-bold text-xs" onClick={e => { e.stopPropagation(); navigate(`/billing/individuals/${row.id}`); }}>
            <Play className="h-3 w-3 mr-1" /> {row.status === 'attention' ? 'Review' : 'Fix'}
          </Button>
        )}
      </td>
    </tr>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2 items-center">
          <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-sm rounded-xl hover:bg-secondary" onClick={() => setFiltersOpen(o => !o)}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            <ChevronDown className={`h-3 w-3 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </Button>
          <div className="relative flex-1 max-w-xs ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9 rounded-xl" />
          </div>
        </div>
        {filtersOpen && (
          <div className="flex gap-2 items-center flex-wrap p-3 rounded-2xl bg-card shadow-elevated animate-in fade-in-0 slide-in-from-top-1 duration-200">
            <Input type="date" className="h-9 w-36 rounded-xl" />
            <Input type="date" className="h-9 w-36 rounded-xl" />
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger className="w-36 h-9 text-sm bg-card rounded-xl"><SelectValue placeholder="Program" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {isClinic ? (
                  <>
                    <SelectItem value="Article 16 Clinic">Article 16 Clinic</SelectItem>
                    <SelectItem value="Article 31 Clinic">Article 31 Clinic</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="DDA Waiver">DDA Waiver</SelectItem>
                    <SelectItem value="HHSC CLASS/HCS">HHSC CLASS/HCS</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9 text-sm bg-card rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="attention">Needs Attention</SelectItem>
                <SelectItem value="clean">Clean</SelectItem>
              </SelectContent>
            </Select>
            <button className="text-sm text-muted-foreground font-medium hover:text-foreground whitespace-nowrap" onClick={() => { setProgramFilter('all'); setStatusFilter('all'); setFiltersOpen(false); }}>Clear</button>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[32px] font-extrabold font-display tracking-tight text-foreground">Billing Compliance Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isClinic
              ? 'Arc Lexington Clinic Agent last ran today at 9:12 AM — 43 clinic notes evaluated'
              : 'Maryland DDA Waiver Agent last ran today at 2:04 AM — 127 individuals evaluated'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-billing-healthy animate-pulse" />
            <span className="text-xs text-billing-healthy font-medium">
              {isClinic ? 'Auto-running on note-sign trigger from Emergent AI' : 'Auto-running nightly at 2:00 AM'}
            </span>
          </div>
        </div>
        <Button className="rounded-xl font-bold bg-billing-healthy hover:bg-billing-healthy/90 text-white" onClick={() => setSubmitModal(true)}>
          Submit All Clean ({clean.length})
        </Button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-5">
        <Card className="p-6 rounded-2xl shadow-elevated">
          <div className="flex items-center gap-2 text-billing-at-risk mb-3"><XCircle className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wider">Blocked</span></div>
          <p className="text-3xl font-extrabold font-display text-foreground">{blocked.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Hard stops detected</p>
        </Card>
        <Card className="p-6 rounded-2xl shadow-elevated">
          <div className="flex items-center gap-2 text-billing-warning mb-3"><AlertTriangle className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wider">Needs Attention</span></div>
          <p className="text-3xl font-extrabold font-display text-foreground">{attention.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Review before submitting</p>
        </Card>
        <Card className="p-6 rounded-2xl shadow-elevated">
          <div className="flex items-center gap-2 text-billing-healthy mb-3"><CheckCircle className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wider">Clean & Ready</span></div>
          <p className="text-3xl font-extrabold font-display text-foreground">{clean.length}</p>
          <p className="text-sm text-muted-foreground mt-1">${cleanTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ready revenue</p>
        </Card>
      </div>

      {/* AI Narrative */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-ai-violet/5 border-l-4 border-ai-violet">
        <AiBadge />
        <span className="text-sm text-foreground">
          {isClinic
            ? '2 patients have treatment plans expiring within 14 days — $605.00 at risk. 1 clinic note scored below documentation threshold.'
            : '3 individuals have authorizations expiring within 14 days — $4,200 at risk of being left unbilled. 8 progress notes need updating in iCM before claims can be submitted.'}
        </span>
      </div>

      {/* Table */}
      <Card className="rounded-2xl shadow-elevated overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary">
              <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{colPatientLabel}</th>
              <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{colProgramLabel}</th>
              <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{colStreamLabel}</th>
              <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{colPeriodLabel}</th>
              <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Status</th>
              <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Top Issue</th>
              <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredBlocked.length > 0 && (
              <>
                <tr>
                  <td colSpan={7} className="px-3 py-2 bg-billing-at-risk/5 text-billing-at-risk text-xs font-bold uppercase tracking-wider">
                    Blocked — {filteredBlocked.length} {isClinic ? 'patient' : 'individual'}{filteredBlocked.length !== 1 ? 's' : ''}
                  </td>
                </tr>
                {filteredBlocked.map(renderRow)}
              </>
            )}

            {filteredAttention.length > 0 && (
              <>
                <tr>
                  <td colSpan={7} className="px-3 py-2 bg-billing-warning/5 text-billing-warning text-xs font-bold uppercase tracking-wider">
                    Needs Attention — {filteredAttention.length} {isClinic ? 'patient' : 'individual'}{filteredAttention.length !== 1 ? 's' : ''}
                  </td>
                </tr>
                {filteredAttention.map(renderRow)}
              </>
            )}

            {filteredClean.length > 0 && (
              <>
                <tr>
                  <td colSpan={7} className="px-3 py-2 bg-billing-healthy/5 text-billing-healthy text-xs font-bold uppercase tracking-wider">
                    Clean & Ready — {filteredClean.length} {isClinic ? 'patients' : 'individuals'}, ${cleanTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} total
                  </td>
                </tr>
                {(showAllClean ? filteredClean : filteredClean.slice(0, 5)).map(renderRow)}
                {!showAllClean && filteredClean.length > 5 && (
                  <tr>
                    <td colSpan={7} className="text-center py-3">
                      <button
                        onClick={() => setShowAllClean(true)}
                        className="text-sm text-primary font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <ChevronDown className="h-4 w-4" /> Show all {filteredClean.length}
                      </button>
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </Card>

      {/* Rule 14 */}
      <Separator className="my-4" />
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-display text-foreground">Billing Rules Configuration</h2>
        <Card className="p-6 space-y-4 rounded-2xl shadow-elevated">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">Rule 14 — Documentation Sufficiency Check</span>
            <Badge className="bg-ai-violet/10 text-ai-violet border-ai-violet/20 text-[10px] gap-1 rounded-full" variant="outline">
              <Sparkles className="h-3 w-3" /> AI
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Rule Type:</span><span className="font-mono text-xs text-foreground">DOC_SUFFICIENCY_CHECK</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Handler:</span><span className="font-mono text-xs text-foreground">handle_doc_sufficiency_check</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pipeline:</span><span className="text-foreground">Per-Attendance (fires after EVV, before code resolution)</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Source:</span><span className="text-foreground">iCM Care Tracker — progress note content</span></div>
          </div>

          <Card className="rounded-xl overflow-hidden shadow-none bg-secondary/30">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Threshold</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Default</th>
                  <th className="text-left p-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Behavior</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-secondary/50 transition-colors">
                  <td className="p-3 font-medium text-billing-at-risk">Hard Stop Below</td>
                  <td className="p-3 font-bold font-display">60%</td>
                  <td className="p-3 text-xs"><Badge variant="outline" className="bg-billing-at-risk/10 text-billing-at-risk border-billing-at-risk/20 text-[10px] rounded-full">REJECTED</Badge> — claim is blocked</td>
                </tr>
                <tr className="hover:bg-secondary/50 transition-colors">
                  <td className="p-3 font-medium text-billing-warning">Warning Zone</td>
                  <td className="p-3 font-bold font-display">60–85%</td>
                  <td className="p-3 text-xs"><Badge variant="outline" className="bg-billing-warning/10 text-billing-warning border-billing-warning/20 text-[10px] rounded-full">HOLD</Badge> — flagged for billing specialist review</td>
                </tr>
                <tr className="hover:bg-secondary/50 transition-colors">
                  <td className="p-3 font-medium text-billing-healthy">Auto-Pass Above</td>
                  <td className="p-3 font-bold font-display">85%</td>
                  <td className="p-3 text-xs"><Badge variant="outline" className="bg-billing-healthy/10 text-billing-healthy border-billing-healthy/20 text-[10px] rounded-full">APPROVED</Badge> — claim proceeds</td>
                </tr>
              </tbody>
            </table>
          </Card>

          <p className="text-xs text-muted-foreground italic">
            Thresholds are configurable per state and per service. Changes write to the BILLING_RULE table.
          </p>
        </Card>
      </div>

      {/* Submit All Modal */}
      <Dialog open={submitModal} onOpenChange={setSubmitModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit {clean.length} clean claims totaling ${cleanTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} to their respective payers?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setSubmitModal(false)}>Cancel</Button>
            <Button className="rounded-xl font-bold btn-primary-gradient text-white" onClick={() => {
              setSubmitModal(false);
              toast({ title: `${clean.length} claims submitted successfully` });
              navigate('/billing/rcm');
            }}>Confirm Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IndividualsBillingHealth;
