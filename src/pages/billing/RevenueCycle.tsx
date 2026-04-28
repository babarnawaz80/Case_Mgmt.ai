import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useBillingContext, type ClaimTypeFilter } from '@/contexts/BillingContext';

import { useNavigate } from 'react-router-dom';
import IndividualsBillingHealth from '@/pages/billing/IndividualsBillingHealth';
import RunsHistory from '@/pages/billing/RunsHistory';
import AuditLog from '@/pages/billing/AuditLog';
import { Sparkles, Play, ChevronDown, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2, XCircle, Search, TrendingUp, TrendingDown, DollarSign, Loader2, CalendarIcon, FileText, Upload, Download, Info, Clock, SlidersHorizontal, ArrowRight, Zap, Shield, Eye, BarChart3, Target } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import React from 'react';
import { RealTimeAnalytics } from '@/components/ui/real-time-analytics';

// ── Mock Data ──────────────────────────────────────────────


const burnAlerts = [
  { id: '1', name: 'Katherine Bell', indId: 'ind-05', program: 'Joppa', stream: 'DDA Community Living', authExpires: 'Apr 1, 2026', unitsRemaining: 18, totalUnits: 200, pctUsed: 91, serviceLine: 'Community Living', claimType: 'IDD' as const },
  { id: '2', name: 'Robert Johnson', indId: 'ind-03', program: 'Easy Street', stream: 'DDA Day Hab', authExpires: 'Apr 14, 2026', unitsRemaining: 12, totalUnits: 200, pctUsed: 94, serviceLine: 'Day Habilitation', claimType: 'IDD' as const },
  { id: '3', name: 'Maria Garcia', indId: 'ind-clean-1', program: 'Rainbow Day', stream: 'Personal Supports', authExpires: 'Apr 22, 2026', unitsRemaining: 31, totalUnits: 200, pctUsed: 85, serviceLine: 'Personal Supports', claimType: 'IDD' as const },
  { id: '4', name: 'Sarah Mitchell', indId: 'ind-15', program: 'Article 16 Clinic', stream: 'Clinic Services', authExpires: 'Apr 10, 2026', unitsRemaining: 4, totalUnits: 24, pctUsed: 83, serviceLine: 'OT Evaluation', claimType: 'Clinic' as const },
  { id: '5', name: 'David Chen', indId: 'ind-16', program: 'Article 31 Clinic', stream: 'Clinic Services', authExpires: 'Apr 18, 2026', unitsRemaining: 2, totalUnits: 12, pctUsed: 83, serviceLine: 'PT Session', claimType: 'Clinic' as const },
];

export interface AiQueueClaim {
  id: string; individual: string; indId: string; program: string; stream: string; payer: string;
  dates: string; units: number | string; total: string; status: 'BLOCKED' | 'REVIEW' | 'CLEAN' | 'DEFERRED'; finding: string;
  claimType?: 'IDD' | 'Clinic';
  fixType?: 'auto' | 'human';
  humanFixLabel?: string;
  humanFixReason?: string;
  autoFixDescription?: string;
  autoFixDetail?: string;
  autoFixRule?: string;
}

const initialDeferredClaims: AiQueueClaim[] = [
  { id: 'CLM-2026-D01', individual: 'Susan Lewis', indId: 'ind-16', program: 'IO/Level 1 Waiver', stream: 'IO Waiver', payer: 'Ohio Medicaid', dates: 'Mar 1–31', units: '—', total: '$0.00', status: 'DEFERRED', claimType: 'IDD', finding: 'Awaiting period close — Iowa pooled minutes rule' },
  { id: 'CLM-2026-D02', individual: 'Anthony Robinson', indId: 'ind-17', program: 'DDA Waiver', stream: 'DDA Community', payer: 'Medicaid', dates: 'Mar 1–31', units: '—', total: '$0.00', status: 'DEFERRED', claimType: 'IDD', finding: 'Unit calc deferred — DAILY aggregation scope' },
  { id: 'CLM-2026-D03', individual: 'Mark Hall', indId: 'ind-19', program: 'HHSC CLASS/HCS', stream: 'HHSC HCS', payer: 'Amerigroup', dates: 'Mar 1–31', units: '—', total: '$0.00', status: 'DEFERRED', claimType: 'IDD', finding: 'Period pipeline pending — units held until month end' },
  { id: 'CLM-2026-D04', individual: 'Karen Young', indId: 'ind-20', program: 'DDA Waiver', stream: 'DDA Community', payer: 'Medicaid', dates: 'Mar 1–31', units: '—', total: '$0.00', status: 'DEFERRED', claimType: 'IDD', finding: 'Awaiting period close — Iowa pooled minutes rule' },
];

const initialBlockedClaims: AiQueueClaim[] = [
  { id: 'CLM-2026-001', individual: 'Katherine Bell', indId: 'ind-05', program: 'Joppa', stream: 'DDA Community Living', payer: 'Medicaid', dates: 'Mar 1–21', units: 0, total: '$0.00', status: 'BLOCKED', finding: 'Authorization expired 02/28 — cannot bill', claimType: 'IDD', fixType: 'human', humanFixLabel: 'Renew Authorization in iCM', humanFixReason: 'Authorization renewal requires human action in iCM' },
  { id: 'CLM-2026-002', individual: 'Patricia Anderson', indId: 'ind-10', program: 'Rainbow Day', stream: 'DDA Residential', payer: 'Medicaid', dates: 'Mar 1–21', units: 0, total: '$0.00', status: 'BLOCKED', finding: 'Progress note missing 03/04 — hard stop', claimType: 'IDD', fixType: 'human', humanFixLabel: 'Add Progress Note in iCM Care Tracker', humanFixReason: 'Progress note must be written by clinical staff in iCM Care Tracker' },
  { id: 'CLM-2026-012', individual: 'Lisa Thompson', indId: 'ind-clean-0', program: 'Easy Street', stream: 'DDA Community', payer: 'Medicaid', dates: 'Mar 1–21', units: 144, total: '$592.80', status: 'BLOCKED', finding: 'CO4 — Modifier HQ missing for group service', claimType: 'IDD', fixType: 'auto', autoFixDescription: 'Modifier HQ auto-applied for 3+ individual group service', autoFixDetail: 'Claim was missing modifier HQ required for group services with 3+ individuals. AI applied modifier HQ to procedure code H2014.', autoFixRule: 'Rule 7 — Proc & Modifier Resolve' },
];

const initialReviewClaims: AiQueueClaim[] = [
  { id: 'CLM-2026-003', individual: 'Robert Johnson', indId: 'ind-03', program: 'Easy Street', stream: 'DDA Community', payer: 'Medicaid', dates: 'Mar 1–21', units: 140, total: '$575.40', status: 'REVIEW', claimType: 'Clinic', finding: 'Auth balance below 20% — 12 units remaining' },
  { id: 'CLM-2026-004', individual: 'Michael Brown', indId: 'ind-07', program: 'Program 1', stream: 'DDA Day Hab', payer: 'Medicaid', dates: 'Mar 1–21', units: 160, total: '$659.20', status: 'REVIEW', claimType: 'Clinic', finding: 'Documentation score 78% — below 85% threshold' },
  { id: 'CLM-2026-015', individual: 'Sarah Mitchell', indId: 'ind-15', program: 'Article 16 Clinic', stream: 'Clinic Services', payer: 'Medicaid', dates: 'Mar 1–21', units: 0, total: '$420.00', status: 'REVIEW', claimType: 'Clinic', finding: 'Treatment plan expired — cannot bill', fixType: 'human', humanFixLabel: 'Renew Treatment Plan', humanFixReason: 'Treatment plan must be renewed by clinical staff' },
  { id: 'CLM-2026-016', individual: 'David Chen', indId: 'ind-16', program: 'Article 16 Clinic', stream: 'Clinic Services', payer: 'Medicaid', dates: 'Mar 1–21', units: 1, total: '$185.00', status: 'REVIEW', claimType: 'Clinic', finding: 'CPT code 99412 flagged — 99413 may apply based on note' },
  { id: 'CLM-2026-005', individual: 'Daniel White', indId: 'ind-13', program: 'HHSC CLASS', stream: 'HHSC CLASS', payer: 'Amerigroup', dates: 'Mar 1–21', units: 168, total: '$1,142.40', status: 'REVIEW', claimType: 'IDD', finding: 'Daily cap warning 03/14 — 28/32 units used' },
  { id: 'CLM-2026-006', individual: 'Lisa Thompson', indId: 'ind-clean-0', program: 'Easy Street', stream: 'DDA Community', payer: 'Medicaid', dates: 'Mar 1–21', units: 144, total: '$592.80', status: 'REVIEW', claimType: 'IDD', finding: 'Modifier HQ missing — 3+ individual group' },
];

const initialCleanClaims: AiQueueClaim[] = [
  { id: 'CLM-2026-007', individual: 'James Wilson', indId: 'ind-clean-0', program: 'Easy Street', stream: 'DDA Community', payer: 'Medicaid', dates: 'Mar 1–21', units: 168, total: '$691.44', status: 'CLEAN', claimType: 'IDD', finding: 'All checks passed' },
  { id: 'CLM-2026-008', individual: 'Maria Garcia', indId: 'ind-clean-1', program: 'Rainbow Day', stream: 'Personal Supports', payer: 'Amerigroup', dates: 'Mar 1–21', units: 128, total: '$527.36', status: 'CLEAN', claimType: 'IDD', finding: 'All checks passed' },
  { id: 'CLM-2026-009', individual: 'Sarah Chen', indId: 'ind-clean-2', program: 'Joppa', stream: 'DDA Community', payer: 'Medicaid', dates: 'Mar 1–21', units: 160, total: '$659.20', status: 'CLEAN', claimType: 'IDD', finding: 'All checks passed' },
  { id: 'CLM-2026-010', individual: 'Linda Martinez', indId: 'ind-clean-3', program: 'Easy Street', stream: 'DDA Day Hab', payer: 'Medicaid', dates: 'Mar 1–21', units: 176, total: '$725.12', status: 'CLEAN', claimType: 'IDD', finding: 'All checks passed' },
  { id: 'CLM-2026-011', individual: 'Jennifer Davis', indId: 'ind-clean-4', program: 'Program 1', stream: 'DDA Residential', payer: 'Medicaid', dates: 'Mar 1–21', units: 31, total: '$5,654.40', status: 'CLEAN', claimType: 'Clinic', finding: 'All checks passed' },
];

export interface ReadyClaim {
  id: string; individual: string; program: string; stream: string; payer: string;
  dates: string; units: number | string; total: string; aiVerified: boolean; status: string;
  claimType?: 'IDD' | 'Clinic';
}

const initialReadyClaims: ReadyClaim[] = [
  { id: 'CLM-2025-001', individual: 'Mickey Mouse', program: 'Easy Street', stream: 'AI First Funding Stream', payer: 'Medicaid', dates: '8/3–8/9/2025', units: 571.45, total: '$5,143.05', aiVerified: true, status: 'Ready', claimType: 'IDD' },
  { id: 'CLM-2025-002', individual: 'Mickey Mouse', program: 'Easy Street', stream: 'AI First Funding Stream', payer: 'Medicaid', dates: '8/3–8/9/2025', units: 70, total: '$763.00', aiVerified: true, status: 'Ready', claimType: 'IDD' },
  { id: 'CLM-2025-003', individual: 'Daisy Duck', program: 'Easy Street', stream: 'AI First Funding Stream', payer: 'Medicaid', dates: '8/3–8/9/2025', units: 7, total: '$1,050.00', aiVerified: true, status: 'Ready', claimType: 'IDD' },
  { id: 'CLM-2025-004', individual: 'Tom Cat', program: 'Easy Street', stream: 'AI First Funding Stream', payer: 'Medicaid', dates: '8/3–8/9/2025', units: 1, total: '$150.00', aiVerified: true, status: 'Ready', claimType: 'Clinic' },
  { id: 'CLM-2025-005', individual: 'John Doe', program: 'Easy Street', stream: 'AI First Funding Stream', payer: 'Medicaid', dates: '8/3–8/9/2025', units: 5, total: '$100.00', aiVerified: true, status: 'Ready', claimType: 'IDD' },
  { id: 'CLM-2025-006', individual: 'John Doe', program: 'Easy Street', stream: 'AI First Funding Stream', payer: 'New Test', dates: '8/3–8/9/2025', units: 1, total: '$1,000.00', aiVerified: true, status: 'Ready', claimType: 'Clinic' },
];

export interface TrackingClaim {
  id: string; individual: string; stream: string; program: string; payer: string;
  status: 'Submitted' | 'Accepted' | 'Rejected' | 'Paid' | 'Re-Submitted'; dates: string; units: number | string; total: string;
  claimType?: 'IDD' | 'Clinic';
  autoSubmitted?: boolean;
}

const initialTrackingClaims: TrackingClaim[] = [
  { id: 'CLM-2026-T17', individual: 'Maria Garcia', stream: 'Community Living', program: 'Sunrise House', payer: 'Medicaid', status: 'Submitted', dates: 'Apr 21, 2026', units: 8, total: '$548.00', claimType: 'IDD', autoSubmitted: true },
  { id: 'CLM-2025-T01', individual: 'Mickey Mouse', stream: 'AI First Funding Stream', program: 'Easy Street', payer: 'Medicaid', status: 'Paid', dates: '7/1–7/15/2025', units: 280, total: '$2,520.00', claimType: 'IDD' },
  { id: 'CLM-2025-T02', individual: 'Daisy Duck', stream: 'AI First Funding Stream', program: 'Easy Street', payer: 'Medicaid', status: 'Paid', dates: '7/1–7/15/2025', units: 14, total: '$2,100.00', claimType: 'IDD' },
  { id: 'CLM-2025-T03', individual: 'Tom Cat', stream: 'AI First Funding Stream', program: 'Easy Street', payer: 'Medicaid', status: 'Submitted', dates: '7/16–7/31/2025', units: 4, total: '$600.00', claimType: 'Clinic' },
  { id: 'CLM-2025-T04', individual: 'John Doe', stream: 'AI First Funding Stream', program: 'Easy Street', payer: 'Medicaid', status: 'Rejected', dates: '7/1–7/15/2025', units: 10, total: '$200.00', claimType: 'IDD' },
  { id: 'CLM-2025-T05', individual: 'Emery Aders', stream: 'AI First Funding Stream', program: 'Easy Street', payer: 'Medicaid', status: 'Paid', dates: '6/1–6/30/2025', units: 6, total: '$54.00', claimType: 'IDD' },
  { id: 'CLM-2025-T06', individual: 'Michael Barnes', stream: 'AI First Funding Stream', program: 'Easy Street', payer: 'Medicaid', status: 'Paid', dates: '6/1–6/30/2025', units: 4, total: '$36.00', claimType: 'Clinic' },
  { id: 'CLM-2025-T07', individual: 'Robert Johnson', stream: 'DDA Community', program: 'Easy Street', payer: 'Medicaid', status: 'Paid', dates: '6/15–6/30/2025', units: 140, total: '$575.40', claimType: 'IDD' },
  { id: 'CLM-2025-T08', individual: 'Katherine Bell', stream: 'DDA Community Living', program: 'Joppa', payer: 'Medicaid', status: 'Accepted', dates: '6/1–6/15/2025', units: 168, total: '$691.44', claimType: 'IDD' },
  { id: 'CLM-2025-T09', individual: 'Patricia Anderson', stream: 'DDA Residential', program: 'Rainbow Day', payer: 'Medicaid', status: 'Re-Submitted', dates: '5/1–5/15/2025', units: 120, total: '$494.40', claimType: 'IDD' },
  { id: 'CLM-2025-T10', individual: 'Michael Brown', stream: 'DDA Day Hab', program: 'Program 1', payer: 'Medicaid', status: 'Paid', dates: '5/16–5/31/2025', units: 160, total: '$659.20', claimType: 'IDD' },
  { id: 'CLM-2025-T11', individual: 'Daniel White', stream: 'HHSC CLASS', program: 'HHSC CLASS', payer: 'Amerigroup', status: 'Re-Submitted', dates: '5/1–5/15/2025', units: 168, total: '$1,142.40', claimType: 'IDD' },
  { id: 'CLM-2025-T12', individual: 'Sarah Chen', stream: 'DDA Community', program: 'Joppa', payer: 'Medicaid', status: 'Paid', dates: '5/16–5/31/2025', units: 160, total: '$659.20', claimType: 'IDD' },
  { id: 'CLM-2025-T13', individual: 'Linda Martinez', stream: 'DDA Day Hab', program: 'Easy Street', payer: 'Medicaid', status: 'Paid', dates: '5/1–5/15/2025', units: 176, total: '$725.12', claimType: 'IDD' },
  { id: 'CLM-2025-T14', individual: 'Jennifer Davis', stream: 'DDA Residential', program: 'Program 1', payer: 'Medicaid', status: 'Submitted', dates: '6/1–6/30/2025', units: 31, total: '$5,654.40', claimType: 'Clinic' },
  { id: 'CLM-2025-T15', individual: 'Sarah Mitchell', stream: 'Clinic Services', program: 'Article 16 Clinic', payer: 'Medicaid', status: 'Re-Submitted', dates: '5/1–5/31/2025', units: 8, total: '$420.00', claimType: 'Clinic' },
  { id: 'CLM-2025-T16', individual: 'Maria Garcia', stream: 'Personal Supports', program: 'Rainbow Day', payer: 'Amerigroup', status: 'Paid', dates: '6/1–6/15/2025', units: 128, total: '$527.36', claimType: 'IDD' },
];

export interface RejectedClaim {
  id: string; individual: string; indId: string; serviceCode: string; payer: string; rejectionReason: string;
  amount: string; aiDiagnosis: string; autoFix?: boolean; aiConfidence?: number;
  claimType?: 'IDD' | 'Clinic';
}

const initialRejectedClaims: RejectedClaim[] = [
  { id: 'CLM-2025-R01', individual: 'John Doe', indId: 'ind-clean-0', serviceCode: 'T2021', payer: 'Medicaid', rejectionReason: 'CO4 — Modifier mismatch', amount: '$100.00', aiDiagnosis: 'Modifier HQ missing — group service requires HQ. Auto-fix available.', aiConfidence: 98, claimType: 'IDD' },
  { id: 'CLM-2025-R02', individual: 'Emery Aders', indId: 'ind-clean-0', serviceCode: 'RPI', payer: 'Medicaid', rejectionReason: 'CO97 — Not covered', amount: '$27.00', aiDiagnosis: 'Service not covered under current authorization type. Review auth.', aiConfidence: 94, claimType: 'IDD' },
  { id: 'CLM-2025-R03', individual: 'Olivia Davis', indId: 'ind-clean-0', serviceCode: 'HCPCS', payer: 'Blue Cross', rejectionReason: 'CO16 — Missing info', amount: '$16.00', aiDiagnosis: 'NPI number missing from claim header. Auto-fix available.', aiConfidence: 76, claimType: 'Clinic' },
  { id: 'CLM-2025-R04', individual: 'Noah Wilson', indId: 'ind-clean-0', serviceCode: 'CDT', payer: 'UnitedHealthcare', rejectionReason: 'CO50 — Not medically necessary', amount: '$10.20', aiDiagnosis: 'Documentation does not support medical necessity. Progress note needs updating.', aiConfidence: 82, claimType: 'Clinic' },
  { id: 'CLM-2025-R05', individual: 'Ava Brown', indId: 'ind-clean-0', serviceCode: 'ICD-10', payer: 'Cigna', rejectionReason: 'CO4 — Modifier mismatch', amount: '$14.40', aiDiagnosis: 'Modifier U3 applied but U1 required for this service type per Cigna guidelines.', aiConfidence: 99, claimType: 'IDD' },
];

const attemptHistoryData: Record<string, { attempt: number; submittedDate: string; status: string; denialCode: string; denialReason: string; actionTaken: string }[]> = {
  'CLM-2025-R01': [
    { attempt: 1, submittedDate: '2025-07-15', status: 'Rejected', denialCode: 'CO4', denialReason: 'Modifier mismatch — HQ not applied', actionTaken: 'Original Submission' },
    { attempt: 2, submittedDate: '2025-07-22', status: 'Rejected', denialCode: 'CO4', denialReason: 'Modifier HQ applied but U1 also needed', actionTaken: 'Manual Resubmit' },
  ],
  'CLM-2025-R02': [{ attempt: 1, submittedDate: '2025-07-18', status: 'Rejected', denialCode: 'CO97', denialReason: 'Service not covered under auth type', actionTaken: 'Original Submission' }],
  'CLM-2025-R03': [{ attempt: 1, submittedDate: '2025-07-20', status: 'Rejected', denialCode: 'CO16', denialReason: 'Missing NPI in claim header', actionTaken: 'Original Submission' }],
  'CLM-2025-R04': [{ attempt: 1, submittedDate: '2025-07-22', status: 'Rejected', denialCode: 'CO50', denialReason: 'Documentation insufficient for medical necessity', actionTaken: 'Original Submission' }],
  'CLM-2025-R05': [{ attempt: 1, submittedDate: '2025-07-25', status: 'Rejected', denialCode: 'CO4', denialReason: 'Modifier U3 applied but U1 required', actionTaken: 'Original Submission' }],
};

// AR mock data
interface ARLedgerEntry {
  id: string; individual: string; fundingStream: string; payer: string; serviceDates: string;
  billedAmount: number; allowedAmount: number; paidAmount: number; adjustment: number;
  adjustmentCode: string; balanceDue: number;
  status: 'Paid' | 'Partial' | 'Outstanding' | 'Adjusted' | 'Retroactive';
  source: 'Auto — 835' | 'Manual Upload';
  dateOfService: Date;
  aiInsight?: string;
  claimType?: 'IDD' | 'Clinic';
}

const arLedgerData: ARLedgerEntry[] = [
  { id: 'AR-001', individual: 'Mickey Mouse', fundingStream: 'DDA Community', payer: 'Medicaid', serviceDates: '3/1–3/15/2026', billedAmount: 5143.05, allowedAmount: 5143.05, paidAmount: 5143.05, adjustment: 0, adjustmentCode: '', balanceDue: 0, status: 'Paid', source: 'Auto — 835', dateOfService: new Date(2026, 2, 1), aiInsight: '✅ Reconciled via AI Batch #92', claimType: 'IDD' },
  { id: 'AR-002', individual: 'Daisy Duck', fundingStream: 'DDA Day Hab', payer: 'Medicaid', serviceDates: '3/1–3/15/2026', billedAmount: 1050.00, allowedAmount: 980.00, paidAmount: 980.00, adjustment: -70.00, adjustmentCode: 'CO45', balanceDue: 0, status: 'Adjusted', source: 'Auto — 835', dateOfService: new Date(2026, 2, 1), claimType: 'IDD' },
  { id: 'AR-003', individual: 'Tom Cat', fundingStream: 'Personal Supports', payer: 'Medicaid', serviceDates: '3/1–3/15/2026', billedAmount: 150.00, allowedAmount: 150.00, paidAmount: 0, adjustment: 0, adjustmentCode: '', balanceDue: 150.00, status: 'Outstanding', source: 'Auto — 835', dateOfService: new Date(2026, 2, 1), aiInsight: '⏳ Awaiting clearinghouse response', claimType: 'Clinic' },
  { id: 'AR-004', individual: 'John Doe', fundingStream: 'DDA Community', payer: 'Medicaid', serviceDates: '2/15–2/28/2026', billedAmount: 1000.00, allowedAmount: 800.00, paidAmount: 600.00, adjustment: -200.00, adjustmentCode: 'PR2', balanceDue: 200.00, status: 'Partial', source: 'Auto — 835', dateOfService: new Date(2026, 1, 15), aiInsight: '✏️ AI Fix: Update DX Code', claimType: 'IDD' },
  { id: 'AR-005', individual: 'Michael Barnes', fundingStream: 'DDA Residential', payer: 'Medicaid', serviceDates: '2/1–2/14/2026', billedAmount: 36.00, allowedAmount: 36.00, paidAmount: 36.00, adjustment: 0, adjustmentCode: '', balanceDue: 0, status: 'Paid', source: 'Auto — 835', dateOfService: new Date(2026, 1, 1), claimType: 'IDD' },
  { id: 'AR-006', individual: 'James Wilson', fundingStream: 'DDA Community', payer: 'Medicaid', serviceDates: '1/15–1/31/2026', billedAmount: 691.44, allowedAmount: 691.44, paidAmount: 691.44, adjustment: 0, adjustmentCode: '', balanceDue: 0, status: 'Paid', source: 'Manual Upload', dateOfService: new Date(2026, 0, 15), claimType: 'IDD' },
  { id: 'AR-007', individual: 'Maria Garcia', fundingStream: 'Personal Supports', payer: 'Amerigroup', serviceDates: '1/1–1/14/2026', billedAmount: 527.36, allowedAmount: 450.00, paidAmount: 450.00, adjustment: -77.36, adjustmentCode: 'CO45', balanceDue: 0, status: 'Adjusted', source: 'Auto — 835', dateOfService: new Date(2026, 0, 1), claimType: 'IDD' },
  { id: 'AR-008', individual: 'Sarah Chen', fundingStream: 'DDA Community', payer: 'Medicaid', serviceDates: '12/1–12/15/2025', billedAmount: 659.20, allowedAmount: 659.20, paidAmount: 659.20, adjustment: 0, adjustmentCode: '', balanceDue: 0, status: 'Paid', source: 'Auto — 835', dateOfService: new Date(2025, 11, 1), claimType: 'IDD' },
  { id: 'AR-009', individual: 'Linda Martinez', fundingStream: 'DDA Day Hab', payer: 'Medicaid', serviceDates: '11/1–11/15/2025', billedAmount: 725.12, allowedAmount: 600.00, paidAmount: 400.00, adjustment: -125.12, adjustmentCode: 'CO45', balanceDue: 200.00, status: 'Retroactive', source: 'Auto — 835', dateOfService: new Date(2025, 10, 1), claimType: 'IDD' },
  { id: 'AR-010', individual: 'Jennifer Davis', fundingStream: 'DDA Residential', payer: 'Medicaid', serviceDates: '10/1–10/15/2025', billedAmount: 5654.40, allowedAmount: 5200.00, paidAmount: 5200.00, adjustment: -454.40, adjustmentCode: 'CO97', balanceDue: 0, status: 'Retroactive', source: 'Auto — 835', dateOfService: new Date(2025, 9, 1), claimType: 'Clinic' },
  { id: 'AR-011', individual: 'Robert Johnson', fundingStream: 'DDA Community', payer: 'Medicaid', serviceDates: '9/1–9/15/2025', billedAmount: 575.40, allowedAmount: 575.40, paidAmount: 0, adjustment: 0, adjustmentCode: '', balanceDue: 575.40, status: 'Retroactive', source: 'Auto — 835', dateOfService: new Date(2025, 8, 1), aiInsight: '✏️ AI Appeal Draft Ready', claimType: 'IDD' },
  { id: 'AR-012', individual: 'Katherine Bell', fundingStream: 'DDA Community Living', payer: 'Medicaid', serviceDates: '8/1–8/15/2025', billedAmount: 890.00, allowedAmount: 890.00, paidAmount: 890.00, adjustment: 0, adjustmentCode: '', balanceDue: 0, status: 'Paid', source: 'Auto — 835', dateOfService: new Date(2025, 7, 1), claimType: 'IDD' },
  { id: 'AR-013', individual: 'Patricia Anderson', fundingStream: 'DDA Residential', payer: 'Medicaid', serviceDates: '7/1–7/15/2025', billedAmount: 1243.00, allowedAmount: 1100.00, paidAmount: 1100.00, adjustment: -143.00, adjustmentCode: 'PR2', balanceDue: 0, status: 'Retroactive', source: 'Auto — 835', dateOfService: new Date(2025, 6, 1), claimType: 'IDD' },
  { id: 'AR-014', individual: 'Michael Brown', fundingStream: 'DDA Day Hab', payer: 'Medicaid', serviceDates: '3/16–3/31/2026', billedAmount: 42500.00, allowedAmount: 42500.00, paidAmount: 0, adjustment: 0, adjustmentCode: '', balanceDue: 42500.00, status: 'Outstanding', source: 'Auto — 835', dateOfService: new Date(2026, 2, 16), claimType: 'IDD' },
  { id: 'AR-015', individual: 'Emery Aders', fundingStream: 'DDA Community', payer: 'Medicaid', serviceDates: '3/1–3/15/2026', billedAmount: 746.60, allowedAmount: 600.00, paidAmount: 388.91, adjustment: -146.60, adjustmentCode: 'CO45', balanceDue: 211.09, status: 'Partial', source: 'Manual Upload', dateOfService: new Date(2026, 2, 1), claimType: 'IDD' },
  { id: 'AR-016', individual: 'Daniel White', fundingStream: 'HHSC CLASS', payer: 'Amerigroup', serviceDates: '2/1–2/14/2026', billedAmount: 1142.40, allowedAmount: 1142.40, paidAmount: 0, adjustment: 0, adjustmentCode: '', balanceDue: 1142.40, status: 'Outstanding', source: 'Auto — 835', dateOfService: new Date(2026, 1, 1), claimType: 'IDD' },
  { id: 'AR-017', individual: 'Ava Brown', fundingStream: 'DDA Community', payer: 'Cigna', serviceDates: '6/1–6/15/2025', billedAmount: 888.00, allowedAmount: 750.00, paidAmount: 0, adjustment: -138.00, adjustmentCode: 'CO16', balanceDue: 750.00, status: 'Retroactive', source: 'Auto — 835', dateOfService: new Date(2025, 5, 1), claimType: 'Clinic' },
];

// Aging Report mock data
interface AgingReportEntry {
  id: string; individual: string; claimNumber: string; payer: string; procedureCode: string;
  dateOfService: string; billedAmount: number; paidAmount: number; balanceDue: number;
  submissionDate: string; claimStatus: 'Submitted' | 'Pending' | 'Partial Pay' | 'Denied';
  lastAction: string; agingDays: number;
  claimType?: 'IDD' | 'Clinic';
}

const agingReportData: AgingReportEntry[] = [
  { id: 'AG-001', individual: 'Mickey Mouse', claimNumber: 'CLM-2026-001', payer: 'Medicaid', procedureCode: 'H2014', dateOfService: '03/01/2026', billedAmount: 5143.05, paidAmount: 0, balanceDue: 5143.05, submissionDate: '03/05/2026', claimStatus: 'Submitted', lastAction: 'Initial submission', agingDays: 26, claimType: 'IDD' },
  { id: 'AG-002', individual: 'Daisy Duck', claimNumber: 'CLM-2026-002', payer: 'Medicaid', procedureCode: 'T2021', dateOfService: '02/15/2026', billedAmount: 1050.00, paidAmount: 500.00, balanceDue: 550.00, submissionDate: '02/20/2026', claimStatus: 'Partial Pay', lastAction: 'Partial payment received', agingDays: 39, claimType: 'IDD' },
  { id: 'AG-003', individual: 'Tom Cat', claimNumber: 'CLM-2026-003', payer: 'Amerigroup', procedureCode: 'H2015', dateOfService: '02/01/2026', billedAmount: 890.00, paidAmount: 0, balanceDue: 890.00, submissionDate: '02/05/2026', claimStatus: 'Pending', lastAction: 'Awaiting payer response', agingDays: 54, claimType: 'Clinic' },
  { id: 'AG-004', individual: 'John Doe', claimNumber: 'CLM-2026-004', payer: 'Blue Cross', procedureCode: 'H2014', dateOfService: '01/10/2026', billedAmount: 1200.00, paidAmount: 0, balanceDue: 1200.00, submissionDate: '01/15/2026', claimStatus: 'Denied', lastAction: 'Appeal submitted 02/20', agingDays: 75, claimType: 'IDD' },
  { id: 'AG-005', individual: 'Robert Johnson', claimNumber: 'CLM-2025-005', payer: 'Medicaid', procedureCode: 'T2021', dateOfService: '12/01/2025', billedAmount: 575.40, paidAmount: 0, balanceDue: 575.40, submissionDate: '12/10/2025', claimStatus: 'Denied', lastAction: 'AI Appeal draft ready', agingDays: 111, claimType: 'IDD' },
  { id: 'AG-006', individual: 'Katherine Bell', claimNumber: 'CLM-2026-006', payer: 'Medicaid', procedureCode: 'H2014', dateOfService: '03/10/2026', billedAmount: 2340.00, paidAmount: 0, balanceDue: 2340.00, submissionDate: '03/15/2026', claimStatus: 'Submitted', lastAction: 'Initial submission', agingDays: 16, claimType: 'IDD' },
  { id: 'AG-007', individual: 'Maria Garcia', claimNumber: 'CLM-2026-007', payer: 'Amerigroup', procedureCode: 'H2015', dateOfService: '01/20/2026', billedAmount: 527.36, paidAmount: 200.00, balanceDue: 327.36, submissionDate: '01/25/2026', claimStatus: 'Partial Pay', lastAction: 'Balance follow-up sent', agingDays: 65, claimType: 'IDD' },
  { id: 'AG-008', individual: 'Sarah Chen', claimNumber: 'CLM-2025-008', payer: 'Cigna', procedureCode: 'T2021', dateOfService: '11/15/2025', billedAmount: 659.20, paidAmount: 0, balanceDue: 659.20, submissionDate: '11/20/2025', claimStatus: 'Denied', lastAction: 'Reconsideration requested', agingDays: 131, claimType: 'Clinic' },
  { id: 'AG-009', individual: 'Linda Martinez', claimNumber: 'CLM-2026-009', payer: 'UnitedHealthcare', procedureCode: 'H2014', dateOfService: '02/10/2026', billedAmount: 725.12, paidAmount: 0, balanceDue: 725.12, submissionDate: '02/15/2026', claimStatus: 'Pending', lastAction: 'Payer review in progress', agingDays: 44, claimType: 'IDD' },
  { id: 'AG-010', individual: 'Jennifer Davis', claimNumber: 'CLM-2026-010', payer: 'Medicaid', procedureCode: 'H2015', dateOfService: '03/20/2026', billedAmount: 1880.00, paidAmount: 0, balanceDue: 1880.00, submissionDate: '03/22/2026', claimStatus: 'Submitted', lastAction: 'Initial submission', agingDays: 9, claimType: 'Clinic' },
  { id: 'AG-011', individual: 'Patricia Anderson', claimNumber: 'CLM-2026-011', payer: 'Medicaid', procedureCode: 'T2021', dateOfService: '01/05/2026', billedAmount: 1243.00, paidAmount: 0, balanceDue: 1243.00, submissionDate: '01/10/2026', claimStatus: 'Denied', lastAction: 'Under review — CO97', agingDays: 80, claimType: 'IDD' },
  { id: 'AG-012', individual: 'Michael Brown', claimNumber: 'CLM-2026-012', payer: 'Medicaid', procedureCode: 'H2014', dateOfService: '02/25/2026', billedAmount: 3200.00, paidAmount: 1600.00, balanceDue: 1600.00, submissionDate: '03/01/2026', claimStatus: 'Partial Pay', lastAction: 'Balance billed to secondary', agingDays: 30, claimType: 'IDD' },
];

const getAgingBucketLabel = (days: number) => {
  if (days <= 30) return { label: '0–30', color: 'bg-billing-healthy/10 text-billing-healthy', dot: '🟢' };
  if (days <= 60) return { label: '31–60', color: 'bg-billing-warning/10 text-billing-warning', dot: '🟡' };
  if (days <= 90) return { label: '61–90', color: 'bg-[hsl(30,90%,50%)]/10 text-[hsl(30,90%,50%)]', dot: '🟠' };
  return { label: '90+', color: 'bg-billing-at-risk/10 text-billing-at-risk', dot: '🔴' };
};

const agingClaimStatusColors: Record<string, string> = {
  Submitted: 'bg-primary/10 text-primary',
  Pending: 'bg-billing-warning/10 text-billing-warning',
  'Partial Pay': 'bg-ai-violet/10 text-ai-violet',
  Denied: 'bg-billing-at-risk/10 text-billing-at-risk',
};

// ── Helpers ──────────────────────────────────────────────

const parseDollar = (s: string): number => parseFloat(s.replace(/[$,]/g, '')) || 0;

const statusColors: Record<string, string> = {
  CLEAN: 'bg-billing-healthy/10 text-billing-healthy',
  REVIEW: 'bg-billing-warning/10 text-billing-warning',
  BLOCKED: 'bg-billing-at-risk/10 text-billing-at-risk',
  DEFERRED: 'bg-muted text-muted-foreground',
  Ready: 'bg-billing-healthy/10 text-billing-healthy',
  Submitted: 'bg-billing-warning/10 text-billing-warning',
  Accepted: 'bg-billing-healthy/10 text-billing-healthy',
  Rejected: 'bg-billing-at-risk/10 text-billing-at-risk',
  Paid: 'bg-billing-healthy/10 text-billing-healthy',
  'Re-Submitted': 'bg-billing-warning/10 text-billing-warning',
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusColors[status] || 'bg-muted text-muted-foreground'}`}>
    {status}
  </span>
);

const Avatar = ({ name }: { name: string }) => {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
      {initials}
    </div>
  );
};

// ── Reusable Filter Bar ────────────────────────────────────

const FilterSelect = ({ placeholder, width = 'w-32', options }: { placeholder: string; width?: string; options: { value: string; label: string }[] }) => (
  <Select>
    <SelectTrigger className={`${width} h-9 text-sm bg-card rounded-xl`}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
    </SelectContent>
  </Select>
);

const programOptions = [
  { value: 'all', label: 'All Programs' },
  { value: 'easy-street', label: 'Easy Street' },
  { value: 'joppa', label: 'Joppa' },
  { value: 'rainbow-day', label: 'Rainbow Day' },
  { value: 'program-1', label: 'Program 1' },
  { value: 'hhsc-class', label: 'HHSC CLASS/HCS' },
  { value: 'io-waiver', label: 'IO/Level 1 Waiver' },
];

const streamOptions = [
  { value: 'all', label: 'All Funding Streams' },
  { value: 'dda-community', label: 'DDA Community' },
  { value: 'dda-community-living', label: 'DDA Community Living' },
  { value: 'dda-residential', label: 'DDA Residential' },
  { value: 'dda-day-hab', label: 'DDA Day Hab' },
  { value: 'personal-supports', label: 'Personal Supports' },
  { value: 'hhsc-class', label: 'HHSC CLASS' },
  { value: 'hhsc-hcs', label: 'HHSC HCS' },
  { value: 'io-waiver', label: 'IO Waiver' },
];

const payerOptions = [
  { value: 'all', label: 'All Payers' },
  { value: 'medicaid', label: 'Medicaid' },
  { value: 'amerigroup', label: 'Amerigroup' },
  { value: 'blue-cross', label: 'Blue Cross' },
  { value: 'united', label: 'UnitedHealthcare' },
  { value: 'cigna', label: 'Cigna' },
];

const FilterBar = ({ children }: { children?: React.ReactNode }) => {
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-sm rounded-xl hover:bg-secondary" onClick={() => setFiltersOpen(o => !o)}>
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          <ChevronDown className={`h-3 w-3 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
        </Button>
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search claims..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 rounded-xl bg-card" />
        </div>
      </div>
      {filtersOpen && (
        <div className="flex gap-2 items-center flex-wrap p-3 rounded-2xl bg-card shadow-elevated animate-in fade-in-0 slide-in-from-top-1 duration-200">
          <Input type="date" className="h-9 w-36 rounded-xl" />
          <Input type="date" className="h-9 w-36 rounded-xl" />
          <FilterSelect placeholder="Program" width="w-36" options={programOptions} />
          <FilterSelect placeholder="Funding Stream" width="w-44" options={streamOptions} />
          <FilterSelect placeholder="Payer" width="w-28" options={payerOptions} />
          {children}
          <button className="text-sm text-muted-foreground font-medium hover:text-foreground whitespace-nowrap" onClick={() => setFiltersOpen(false)}>Clear</button>
        </div>
      )}
    </div>
  );
};

// ── Section Header ────────────────────────────────────

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground font-body">{children}</p>
);

// ── Monthly Mock Data Generator ────────────────────────────

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const generateMonthlyData = (month: number, year: number) => {
  const seed = month + year * 12;
  const base = 40000 + ((seed * 7 + 3) % 30) * 1000;
  const growth = (month + 1) * 800 + (year - 2025) * 5000;
  const ready = base + growth + ((seed * 13) % 8000);
  const submitted = ready * (0.65 + ((seed * 3) % 15) / 100);
  const paid = submitted * (0.78 + ((seed * 7) % 12) / 100);
  const resubmitted = 1200 + ((seed * 11) % 4000);
  const rejected = 400 + ((seed * 17) % 1200);
  const readyDelta = 5000 + ((seed * 9) % 15000);
  const submittedDelta = 3000 + ((seed * 5) % 10000);
  const paidDelta = 2000 + ((seed * 3) % 9000);
  const rejectedDelta = -200 - ((seed * 7) % 800);
  const compliance = 88 + ((seed * 3) % 10);
  const clean = 90 + ((seed * 7) % 50);
  const issues = 3 + ((seed * 11) % 12);
  const rejRate = (1.5 + ((seed * 5) % 40) / 10).toFixed(1);
  const authsExpiring = 1 + ((seed * 3) % 5);
  const notesUpdating = 2 + ((seed * 9) % 12);
  const lastRanDay = 1 + ((seed * 7) % 28);
  const lastRanHour = 1 + ((seed * 3) % 6);
  const lastRanMin = ((seed * 13) % 60).toString().padStart(2, '0');
  const isCurrentMonth = month === new Date().getMonth() && year === new Date().getFullYear();
  const lastRanLabel = isCurrentMonth ? `today ${lastRanHour}:${lastRanMin} AM` : `${MONTH_NAMES[month].slice(0,3)} ${lastRanDay}, ${lastRanHour}:${lastRanMin} AM`;
  return {
    ready: ready.toFixed(2), submitted: submitted.toFixed(2), paid: paid.toFixed(2),
    resubmitted: resubmitted.toFixed(2), rejected: rejected.toFixed(2),
    readyTrend: `+$${readyDelta.toLocaleString()} from prior month`,
    submittedTrend: `+$${submittedDelta.toLocaleString()} from prior month`,
    paidTrend: `+$${paidDelta.toLocaleString()} from prior month`,
    rejectedTrend: `${rejectedDelta < 0 ? '-' : '+'}$${Math.abs(rejectedDelta)} from prior month`,
    compliance, clean, issues, rejRate, authsExpiring, notesUpdating, lastRanLabel,
  };
};

// ══════════════════════════════════════════════════════════
// ── Dashboard Tab
// ══════════════════════════════════════════════════════════

interface DashboardTabProps {
  onSwitchTab: (tab: string) => void;
  selectedMonth: number;
  selectedYear: number;
  counts: { blocked: number; review: number; clean: number; deferred: number; ready: number; submitted: number; paid: number; resubmitted: number; rejected: number; tracked: number };
  cleanTotal: string;
  readyTotal: string;
  rejectedTotal: string;
  claimTypeFilter: ClaimTypeFilter;
}

const CircularMeter = ({ percent, color, size = 56, strokeWidth = 5 }: { percent: number; color: string; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [animatedOffset, setAnimatedOffset] = React.useState(circumference);

  React.useEffect(() => {
    // Start from empty, then animate to target
    setAnimatedOffset(circumference);
    const timer = setTimeout(() => {
      setAnimatedOffset(circumference - (Math.min(percent, 100) / 100) * circumference);
    }, 100);
    return () => clearTimeout(timer);
  }, [percent, circumference]);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={animatedOffset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }} />
    </svg>
  );
};

const BentoKPI = ({ label, value, total, bg, svgElement, onClick, subtitle }: { label: string; value: string | number; total: number; bg: string; svgElement?: React.ReactNode; onClick?: () => void; subtitle?: string }) => {
  const numVal = typeof value === 'string' ? parseInt(value) || 0 : value;
  const percent = total > 0 ? Math.round((numVal / total) * 100) : 0;

  const colorMap: Record<string, string> = {
    'bg-emerald-600': '#059669',
    'bg-primary': '#004cef',
    'bg-zinc-900': '#18181b',
    'bg-amber-600': '#d97706',
    'bg-red-600': '#dc2626',
  };
  const ringColor = colorMap[bg] || '#004cef';

  return (
    <Card
      className="relative overflow-hidden rounded-2xl border shadow-elevated cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-200 group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
    >
      {svgElement && <div className="absolute inset-0 opacity-[0.04] pointer-events-none">{svgElement}</div>}
      <div className="p-6 flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <CircularMeter percent={percent} color={ringColor} size={80} strokeWidth={7} />
          <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold text-foreground" style={{ transform: 'none' }}>
            {percent}%
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground truncate">{label}</p>
          <p className="text-sm text-muted-foreground">{numVal} of {total} claims{subtitle ? ` · ${subtitle}` : ''}</p>
        </div>
      </div>
    </Card>
  );
};

// ── Attendance Intake Mock Data ──────────────────────────
interface AttendanceRecord {
  id: string; individual: string; dateOfService: string; serviceType: string; fundingStream: string;
  status: 'Received' | 'Converted' | 'Pending';
}

const attendanceRecords: AttendanceRecord[] = [
  { id: 'ATT-001', individual: 'Mickey Mouse', dateOfService: '03/01/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-002', individual: 'Daisy Duck', dateOfService: '03/01/2026', serviceType: 'Day Habilitation', fundingStream: 'DDA Day Hab', status: 'Converted' },
  { id: 'ATT-003', individual: 'Tom Cat', dateOfService: '03/02/2026', serviceType: 'Personal Supports', fundingStream: 'Personal Supports', status: 'Converted' },
  { id: 'ATT-004', individual: 'John Doe', dateOfService: '03/02/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Pending' },
  { id: 'ATT-005', individual: 'Robert Johnson', dateOfService: '03/03/2026', serviceType: 'Day Habilitation', fundingStream: 'DDA Day Hab', status: 'Converted' },
  { id: 'ATT-006', individual: 'Katherine Bell', dateOfService: '03/03/2026', serviceType: 'Community Living', fundingStream: 'DDA Community Living', status: 'Converted' },
  { id: 'ATT-007', individual: 'Patricia Anderson', dateOfService: '03/04/2026', serviceType: 'Residential', fundingStream: 'DDA Residential', status: 'Pending' },
  { id: 'ATT-008', individual: 'Michael Brown', dateOfService: '03/04/2026', serviceType: 'Day Habilitation', fundingStream: 'DDA Day Hab', status: 'Converted' },
  { id: 'ATT-009', individual: 'Daniel White', dateOfService: '03/05/2026', serviceType: 'Community Living', fundingStream: 'HHSC CLASS', status: 'Pending' },
  { id: 'ATT-010', individual: 'Lisa Thompson', dateOfService: '03/05/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-011', individual: 'Maria Garcia', dateOfService: '03/06/2026', serviceType: 'Personal Supports', fundingStream: 'Personal Supports', status: 'Converted' },
  { id: 'ATT-012', individual: 'Sarah Chen', dateOfService: '03/06/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-013', individual: 'Linda Martinez', dateOfService: '03/07/2026', serviceType: 'Day Habilitation', fundingStream: 'DDA Day Hab', status: 'Converted' },
  { id: 'ATT-014', individual: 'Jennifer Davis', dateOfService: '03/07/2026', serviceType: 'Residential', fundingStream: 'DDA Residential', status: 'Converted' },
  { id: 'ATT-015', individual: 'James Wilson', dateOfService: '03/08/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-016', individual: 'Emery Aders', dateOfService: '03/08/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Pending' },
  { id: 'ATT-017', individual: 'Michael Barnes', dateOfService: '03/09/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-018', individual: 'Susan Lewis', dateOfService: '03/09/2026', serviceType: 'Community Living', fundingStream: 'IO Waiver', status: 'Pending' },
  { id: 'ATT-019', individual: 'Anthony Robinson', dateOfService: '03/10/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-020', individual: 'Mark Hall', dateOfService: '03/10/2026', serviceType: 'Community Living', fundingStream: 'HHSC HCS', status: 'Pending' },
  { id: 'ATT-021', individual: 'Karen Young', dateOfService: '03/11/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-022', individual: 'Olivia Davis', dateOfService: '03/11/2026', serviceType: 'Day Habilitation', fundingStream: 'DDA Day Hab', status: 'Converted' },
  { id: 'ATT-023', individual: 'Noah Wilson', dateOfService: '03/12/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-024', individual: 'Ava Brown', dateOfService: '03/12/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-025', individual: 'Mickey Mouse', dateOfService: '03/13/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-026', individual: 'Daisy Duck', dateOfService: '03/13/2026', serviceType: 'Day Habilitation', fundingStream: 'DDA Day Hab', status: 'Converted' },
  { id: 'ATT-027', individual: 'Tom Cat', dateOfService: '03/14/2026', serviceType: 'Personal Supports', fundingStream: 'Personal Supports', status: 'Converted' },
  { id: 'ATT-028', individual: 'John Doe', dateOfService: '03/14/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Pending' },
  { id: 'ATT-029', individual: 'Robert Johnson', dateOfService: '03/15/2026', serviceType: 'Day Habilitation', fundingStream: 'DDA Day Hab', status: 'Converted' },
  { id: 'ATT-030', individual: 'Katherine Bell', dateOfService: '03/15/2026', serviceType: 'Community Living', fundingStream: 'DDA Community Living', status: 'Converted' },
  { id: 'ATT-031', individual: 'Patricia Anderson', dateOfService: '03/16/2026', serviceType: 'Residential', fundingStream: 'DDA Residential', status: 'Pending' },
  { id: 'ATT-032', individual: 'Michael Brown', dateOfService: '03/16/2026', serviceType: 'Day Habilitation', fundingStream: 'DDA Day Hab', status: 'Converted' },
  { id: 'ATT-033', individual: 'Daniel White', dateOfService: '03/17/2026', serviceType: 'Community Living', fundingStream: 'HHSC CLASS', status: 'Pending' },
  { id: 'ATT-034', individual: 'Lisa Thompson', dateOfService: '03/17/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-035', individual: 'Maria Garcia', dateOfService: '03/18/2026', serviceType: 'Personal Supports', fundingStream: 'Personal Supports', status: 'Converted' },
  { id: 'ATT-036', individual: 'Sarah Chen', dateOfService: '03/18/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-037', individual: 'Linda Martinez', dateOfService: '03/19/2026', serviceType: 'Day Habilitation', fundingStream: 'DDA Day Hab', status: 'Converted' },
  { id: 'ATT-038', individual: 'Jennifer Davis', dateOfService: '03/19/2026', serviceType: 'Residential', fundingStream: 'DDA Residential', status: 'Converted' },
  { id: 'ATT-039', individual: 'James Wilson', dateOfService: '03/20/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-040', individual: 'Emery Aders', dateOfService: '03/20/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-041', individual: 'Michael Barnes', dateOfService: '03/21/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-042', individual: 'Susan Lewis', dateOfService: '03/21/2026', serviceType: 'Community Living', fundingStream: 'IO Waiver', status: 'Converted' },
  { id: 'ATT-043', individual: 'Anthony Robinson', dateOfService: '03/22/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-044', individual: 'Mark Hall', dateOfService: '03/22/2026', serviceType: 'Community Living', fundingStream: 'HHSC HCS', status: 'Converted' },
  { id: 'ATT-045', individual: 'Karen Young', dateOfService: '03/23/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
  { id: 'ATT-046', individual: 'Olivia Davis', dateOfService: '03/23/2026', serviceType: 'Day Habilitation', fundingStream: 'DDA Day Hab', status: 'Pending' },
  { id: 'ATT-047', individual: 'Noah Wilson', dateOfService: '03/24/2026', serviceType: 'Community Living', fundingStream: 'DDA Community', status: 'Converted' },
];

const ATTENDANCE_RECEIVED = attendanceRecords.length;
const ATTENDANCE_CONVERTED = attendanceRecords.filter(r => r.status === 'Converted').length;
const ATTENDANCE_PENDING = attendanceRecords.filter(r => r.status === 'Pending').length;

// ── Attendance Intake Slide-out Panel ──────────────────
const AttendancePanel = ({ open, onOpenChange, title, records }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; records: AttendanceRecord[] }) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (dateFrom) {
        const from = new Date(dateFrom);
        const dos = new Date(r.dateOfService);
        if (dos < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        const dos = new Date(r.dateOfService);
        if (dos > to) return false;
      }
      return true;
    });
  }, [records, dateFrom, dateTo]);

  const statusColor: Record<string, string> = {
    Received: 'bg-primary/10 text-primary',
    Converted: 'bg-billing-healthy/10 text-billing-healthy',
    Pending: 'bg-billing-warning/10 text-billing-warning',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-display text-lg">{title}</SheetTitle>
        </SheetHeader>
        <div className="flex gap-2 mb-4">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 rounded-xl" placeholder="From" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 rounded-xl" placeholder="To" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Individual</TableHead>
              <TableHead className="text-xs">Date of Service</TableHead>
              <TableHead className="text-xs">Service Type</TableHead>
              <TableHead className="text-xs">Funding Stream</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-sm font-medium">{r.individual}</TableCell>
                <TableCell className="text-sm">{r.dateOfService}</TableCell>
                <TableCell className="text-sm">{r.serviceType}</TableCell>
                <TableCell className="text-sm">{r.fundingStream}</TableCell>
                <TableCell><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusColor[r.status] || 'bg-muted text-muted-foreground'}`}>{r.status}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No records match the selected date range.</p>}
      </SheetContent>
    </Sheet>
  );
};

const DashboardTab = ({ onSwitchTab, selectedMonth, selectedYear, counts, cleanTotal, readyTotal, rejectedTotal, claimTypeFilter: ctFilter }: DashboardTabProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const data = generateMonthlyData(selectedMonth, selectedYear);

  const [attendancePanel, setAttendancePanel] = useState<{ open: boolean; title: string; records: AttendanceRecord[] }>({ open: false, title: '', records: [] });

  const openPanel = useCallback((category: 'all' | 'converted' | 'pending') => {
    const map = {
      all: { title: 'Attendance Received', records: attendanceRecords },
      converted: { title: 'Converted to Claims', records: attendanceRecords.filter(r => r.status === 'Converted') },
      pending: { title: 'Pending Processing', records: attendanceRecords.filter(r => r.status === 'Pending') },
    };
    setAttendancePanel({ open: true, ...map[category] });
  }, []);

  const totalIssues = counts.blocked + counts.review;
  const complianceRate = counts.clean + counts.blocked + counts.review > 0
    ? Math.round((counts.clean / (counts.clean + counts.blocked + counts.review)) * 100) : 100;

  return (
    <div className="space-y-8">
      <FilterBar />

      {/* Bento KPI Row */}
      <div className="grid grid-cols-6 gap-4">
        <BentoKPI label="Ready" value={counts.ready} total={counts.ready + counts.blocked + counts.review + counts.deferred} bg="bg-emerald-600" onClick={() => onSwitchTab('ready')} />
        <BentoKPI label="Submitted" value={counts.submitted} total={counts.tracked} bg="bg-primary" onClick={() => onSwitchTab('tracking')} />
        <BentoKPI label="Paid" value={counts.paid} total={counts.tracked} bg="bg-zinc-900" onClick={() => onSwitchTab('tracking')} />
        <BentoKPI label="Re-submitted" value={counts.resubmitted} total={counts.tracked} bg="bg-amber-600" onClick={() => onSwitchTab('tracking')} />
        <BentoKPI label="Rejected" value={counts.rejected} total={counts.rejected + counts.ready + counts.blocked + counts.review} bg="bg-red-600" onClick={() => onSwitchTab('rejected')} />
        <div
          className="relative overflow-hidden rounded-2xl ai-gradient text-white cursor-pointer hover:opacity-90 hover:scale-[1.01] transition-all duration-200 shadow-elevated"
          onClick={() => onSwitchTab('ai-queue')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSwitchTab('ai-queue'); }}
        >
          <div className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">AI Intelligence</p>
              <p className="text-xs opacity-80">{totalIssues} issues · {data.authsExpiring} auths</p>
            </div>
          </div>
        </div>
      </div>

      {/* Claims Intake Widget */}
      <Card className="px-5 py-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 ai-gradient" />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-ai-violet/10 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-ai-violet" />
            </div>
            <p className="text-sm font-semibold font-display text-foreground">Claims Intake</p>
          </div>
          <p className="text-xs text-muted-foreground">Two intake sources feeding the AI Queue</p>
        </div>
        <div className="grid grid-cols-2 gap-0">
          {/* Left — IDD Attendance */}
          <div className={`pr-5 border-r border-border transition-all ${ctFilter === 'IDD' ? 'ring-1 ring-[hsl(245,58%,51%)]/30 rounded-lg bg-[hsl(245,58%,51%)]/5 p-2 -m-2 mr-3' : ctFilter === 'Clinic' ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">IDD Attendance</p>
              <Badge variant="secondary" className="text-[9px] bg-ai-violet/10 text-ai-violet border-0 px-1.5 py-0">from iCM</Badge>
            </div>
            <div className="flex items-baseline gap-4">
              <p className="text-sm"><span className="text-lg font-extrabold font-display text-foreground">47</span> <span className="text-muted-foreground">Records received</span></p>
              <p className="text-sm"><span className="text-lg font-extrabold font-display text-billing-healthy">37</span> <span className="text-muted-foreground">Claims</span></p>
              <p className="text-sm"><span className="text-lg font-extrabold font-display text-billing-warning">10</span> <span className="text-muted-foreground">Pending</span></p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">Pulled nightly from approved attendance in iCM</p>
          </div>
          {/* Right — Clinic Notes */}
          <div className={`pl-5 transition-all ${ctFilter === 'Clinic' ? 'ring-1 ring-[hsl(162,63%,41%)]/30 rounded-lg bg-[hsl(162,63%,41%)]/5 p-2 -m-2 ml-3' : ctFilter === 'IDD' ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Clinic Notes</p>
              <Badge variant="secondary" className="text-[9px] bg-[hsl(162,63%,41%)]/10 text-[hsl(162,63%,41%)] border-0 px-1.5 py-0">from Emergent AI</Badge>
            </div>
            <div className="flex items-baseline gap-4">
              <p className="text-sm"><span className="text-lg font-extrabold font-display text-foreground">12</span> <span className="text-muted-foreground">Notes signed</span></p>
              <p className="text-sm"><span className="text-lg font-extrabold font-display text-billing-healthy">9</span> <span className="text-muted-foreground">Claims</span></p>
              <p className="text-sm"><span className="text-lg font-extrabold font-display text-billing-warning">3</span> <span className="text-muted-foreground">Pending</span></p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">Auto-queued when a note is signed and saved in Emergent AI</p>
          </div>
        </div>
      </Card>

      <AttendancePanel open={attendancePanel.open} onOpenChange={(o) => setAttendancePanel(prev => ({ ...prev, open: o }))} title={attendancePanel.title} records={attendancePanel.records} />


      {/* Live Claim Volume Chart */}
      <RealTimeAnalytics />
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// ── AI Queue Tab — Two Column Bento
// ══════════════════════════════════════════════════════════

interface AiQueueTabProps {
  blocked: AiQueueClaim[];
  review: AiQueueClaim[];
  clean: AiQueueClaim[];
  deferred: AiQueueClaim[];
  previewMode: boolean;
  onFixAuto: (claim: AiQueueClaim) => void;
  onMoveToReady: (ids: string[]) => void;
}

const AiQueueTab = ({ blocked, review, clean, deferred, previewMode, onFixAuto, onMoveToReady }: AiQueueTabProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showAllClean, setShowAllClean] = useState(false);
  const [selectedCleanIds, setSelectedCleanIds] = useState<string[]>([]);
  const [fixStates, setFixStates] = useState<Record<string, 'idle' | 'fixing' | 'fixed' | 'failed'>>({});
  const [fixDetailsOpen, setFixDetailsOpen] = useState<Record<string, boolean>>({});
  const getFixState = (id: string) => fixStates[id] || 'idle';

  const fBlocked = blocked;
  const fReview = review;
  const fClean = clean;
  const fDeferred = deferred;

  const handleAiFix = (claim: AiQueueClaim) => {
    setFixStates(prev => ({ ...prev, [claim.id]: 'fixing' }));
    setTimeout(() => {
      if (claim.fixType === 'auto') {
        setFixStates(prev => ({ ...prev, [claim.id]: 'fixed' }));
        toast({ title: `AI auto-fixed ${claim.individual}'s claim`, description: claim.autoFixDescription });
        onFixAuto(claim);
      } else {
        setFixStates(prev => ({ ...prev, [claim.id]: 'failed' }));
      }
    }, 1800);
  };

  const handleMoveOne = (claim: AiQueueClaim) => {
    onMoveToReady([claim.id]);
    toast({ title: `Claim ${claim.id} moved to Ready queue` });
  };

  const handleMoveAllClean = () => {
    const ids = fClean.map(c => c.id);
    onMoveToReady(ids);
    toast({ title: `${ids.length} clean claims moved to Ready queue` });
  };

  const handleMoveSelected = () => {
    onMoveToReady(selectedCleanIds);
    toast({ title: `${selectedCleanIds.length} claims moved to Ready queue` });
    setSelectedCleanIds([]);
  };

  const displayClean = showAllClean ? fClean : fClean.slice(0, 5);
  const cleanTotal = fClean.reduce((s, c) => s + parseDollar(c.total), 0);
  const recoverableRevenue = fBlocked.reduce((s, c) => s + parseDollar(c.total), 0) + fReview.reduce((s, c) => s + parseDollar(c.total), 0);

  const ClaimTypeBadge = ({ type }: { type?: 'IDD' | 'Clinic' }) => {
    if (!type) return null;
    const cls = type === 'IDD' ? 'bg-[hsl(245,58%,51%)] text-white' : 'bg-[hsl(162,63%,41%)] text-white';
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>{type}</span>;
  };

  const FindingPill = ({ finding, status }: { finding: string; status: string }) => {
    const color = status === 'BLOCKED' ? 'bg-billing-at-risk/10 text-billing-at-risk' : status === 'REVIEW' ? 'bg-billing-warning/10 text-billing-warning' : 'bg-billing-healthy/10 text-billing-healthy';
    const icon = status === 'BLOCKED' ? '🔴' : status === 'REVIEW' ? '🟡' : '🟢';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>
        {icon} {finding.length > 35 ? finding.slice(0, 35) + '…' : finding}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <FilterBar>
        <FilterSelect placeholder="Status" width="w-32" options={[
          { value: 'all', label: 'All' },
          { value: 'blocked', label: 'Blocked' },
          { value: 'review', label: 'Needs Review' },
          { value: 'clean', label: 'Clean' },
          { value: 'deferred', label: 'Deferred' },
        ]} />
        {/* Claim type filter now controlled by global bar above tabs */}
      </FilterBar>


      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-extrabold font-display text-foreground">Queue Intelligence</h2>
          <p className="text-sm text-muted-foreground mt-1">AI-driven prioritization for revenue optimization. Review flagged claims or move verified entries to the processing stage.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl font-semibold" onClick={() => toast({ title: 'Exported to CSV' })}>
            <Download className="h-4 w-4 mr-1.5" />Export List
          </Button>
          {fClean.length > 0 && (
            <Button size="sm" className="rounded-xl font-bold btn-primary-gradient text-white" onClick={handleMoveAllClean}>
              <Sparkles className="h-4 w-4 mr-1.5" />Move All Clean to Ready
            </Button>
          )}
        </div>
      </div>

      {previewMode && (
        <div className="p-3 bg-billing-warning/10 rounded-2xl flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-billing-warning shrink-0" />
          <span className="text-foreground"><strong>Preview Mode</strong> — Billing period is still open. These are projected outcomes only.</span>
        </div>
      )}

      {/* Status Counters */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-billing-at-risk/10 flex items-center justify-center">
            <XCircle className="h-5 w-5 text-billing-at-risk" />
          </div>
          <div>
            <SectionLabel>BLOCKED</SectionLabel>
            <p className="text-2xl font-extrabold font-display">{fBlocked.length}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-billing-warning/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-billing-warning" />
          </div>
          <div>
            <SectionLabel>REVIEW REQUIRED</SectionLabel>
            <p className="text-2xl font-extrabold font-display">{fReview.length}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-billing-healthy/10 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-billing-healthy" />
          </div>
          <div>
            <SectionLabel>READY TO MOVE</SectionLabel>
            <p className="text-2xl font-extrabold font-display">{fClean.length}</p>
          </div>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-[1fr_340px] gap-6">
        {/* Left: Claims Table */}
        <div className="space-y-0">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3">
              <h3 className="text-base font-bold font-display">Active Claims Queue</h3>
              <span className="text-xs text-muted-foreground">Last sync: 2m ago</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-8"></TableHead>
                  <TableHead>PATIENT & ID</TableHead>
                  <TableHead>CLAIM TYPE</TableHead>
                  <TableHead>FINDING TAG</TableHead>
                  <TableHead className="text-right">VALUE</TableHead>
                  <TableHead>ACTION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Blocked */}
                {fBlocked.map(c => {
                  const state = getFixState(c.id);
                  return (
                    <React.Fragment key={c.id}>
                      <TableRow className="hover:bg-surface-low">
                        <TableCell><Avatar name={c.individual} /></TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-sm">{c.individual}</p>
                            <p className="text-[11px] text-muted-foreground">#{c.id}</p>
                          </div>
                        </TableCell>
                        <TableCell><ClaimTypeBadge type={c.claimType} /></TableCell>
                        <TableCell><FindingPill finding={c.finding} status={c.status} /></TableCell>
                        <TableCell className="text-right">
                          <p className="font-semibold">{c.total}</p>
                          <p className="text-[10px] text-muted-foreground">PROJECTED</p>
                        </TableCell>
                        <TableCell>
                          {state === 'idle' && (
                            <Button size="sm" className="text-xs h-8 rounded-xl bg-billing-at-risk hover:bg-billing-at-risk/90 text-white font-bold" onClick={() => handleAiFix(c)}>Fix Now</Button>
                          )}
                          {state === 'fixing' && (
                            <Button size="sm" variant="outline" className="text-xs h-8 rounded-xl text-billing-warning gap-1" disabled>
                              <Loader2 className="h-3 w-3 animate-spin" /> AI Fixing…
                            </Button>
                          )}
                          {state === 'fixed' && (
                            <Badge className="bg-billing-healthy/10 text-billing-healthy text-[10px]">✓ Fixed</Badge>
                          )}
                          {state === 'failed' && (
                            <Button size="sm" variant="outline" className="text-xs h-8 rounded-xl text-primary" onClick={() => toast({ title: `Opening iCM...`, description: c.humanFixLabel })}>
                              → {c.humanFixLabel?.split(' ').slice(0, 3).join(' ')}…
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {state === 'fixed' && fixDetailsOpen[c.id] && (
                        <TableRow><TableCell colSpan={6} className="bg-billing-healthy/5 px-8 py-3">
                          <div className="text-xs space-y-1 text-muted-foreground">
                            <p><strong className="text-foreground">Problem:</strong> {c.finding}</p>
                            <p><strong className="text-foreground">AI Changed:</strong> {c.autoFixDetail}</p>
                            <p><strong className="text-foreground">Rule:</strong> {c.autoFixRule}</p>
                          </div>
                        </TableCell></TableRow>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Review */}
                {fReview.map(c => (
                  <TableRow key={c.id} className="hover:bg-surface-low">
                    <TableCell><Avatar name={c.individual} /></TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm">{c.individual}</p>
                        <p className="text-[11px] text-muted-foreground">#{c.id}</p>
                      </div>
                    </TableCell>
                    <TableCell><ClaimTypeBadge type={c.claimType} /></TableCell>
                    <TableCell><FindingPill finding={c.finding} status={c.status} /></TableCell>
                    <TableCell className="text-right">
                      <p className="font-semibold">{c.total}</p>
                      <p className="text-[10px] text-muted-foreground">PROJECTED</p>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="text-xs h-8 rounded-xl text-billing-warning font-bold" onClick={() => navigate(`/billing/individuals/${c.indId}`)}>Review</Button>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Clean */}
                {displayClean.map(c => (
                  <TableRow key={c.id} className="hover:bg-surface-low">
                    <TableCell>
                      <Checkbox checked={selectedCleanIds.includes(c.id)} onCheckedChange={(v) => setSelectedCleanIds(prev => v ? [...prev, c.id] : prev.filter(x => x !== c.id))} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar name={c.individual} />
                        <div>
                          <p className="font-semibold text-sm">{c.individual}</p>
                          <p className="text-[11px] text-muted-foreground">#{c.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><ClaimTypeBadge type={c.claimType} /></TableCell>
                    <TableCell><FindingPill finding={c.finding} status={c.status} /></TableCell>
                    <TableCell className="text-right font-semibold">{c.total}</TableCell>
                    <TableCell>
                      <Button size="sm" className="text-xs h-8 rounded-xl bg-billing-healthy hover:bg-billing-healthy/90 text-white font-bold" onClick={() => handleMoveOne(c)}>Move</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!showAllClean && fClean.length > 5 && (
              <div className="px-5 py-3">
                <button className="text-sm text-primary font-semibold hover:underline" onClick={() => setShowAllClean(true)}>Show all {fClean.length} →</button>
              </div>
            )}
            {fClean.length > 0 && selectedCleanIds.length > 0 && (
              <div className="flex items-center gap-3 px-5 py-3 bg-secondary/50">
                <p className="text-sm text-muted-foreground">{selectedCleanIds.length} selected</p>
                <Button size="sm" className="ml-auto bg-billing-healthy hover:bg-billing-healthy/90 text-white h-8 rounded-xl font-bold" onClick={handleMoveSelected}>
                  Move Selected ({selectedCleanIds.length})
                </Button>
              </div>
            )}
            {fBlocked.length === 0 && fReview.length === 0 && fClean.length === 0 && fDeferred.length === 0 && (
              <div className="p-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-billing-healthy mx-auto mb-3" />
                <p className="text-lg font-bold font-display text-foreground">All clear!</p>
                <p className="text-sm text-muted-foreground">All claims have been processed.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right: AI Intelligence Panel */}
        <div className="space-y-4">
          <Card className="p-5 border-l-4 border-l-ai-violet">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold font-display">Predictive Audit</h3>
              <Sparkles className="h-4 w-4 text-ai-violet" />
            </div>
            <SectionLabel>RECOVERABLE REVENUE</SectionLabel>
            <p className="text-4xl font-extrabold font-display text-foreground mt-1">${recoverableRevenue > 1000 ? (recoverableRevenue / 1000).toFixed(1) + 'k' : recoverableRevenue.toLocaleString()}</p>
            <p className="text-xs text-billing-healthy font-medium mt-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +12% from last week
            </p>

            <div className="mt-6">
              <SectionLabel>AI KEY FINDINGS</SectionLabel>
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-ai-violet mt-1.5 shrink-0" />
                  <p className="text-xs text-foreground"><strong>Authorization Lag:</strong> {fBlocked.filter(c => c.finding.includes('Auth')).length + 14} claims are pending payer confirmation for procedures within 48 hours.</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-ai-violet mt-1.5 shrink-0" />
                  <p className="text-xs text-foreground"><strong>DRG Mismatch:</strong> Potential revenue leakage detected in Orthopedic surgical coding.</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <SectionLabel>RESOLUTION HEALTH</SectionLabel>
                <span className="text-xs font-bold text-billing-healthy">84%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-billing-healthy" style={{ width: '84%' }} />
              </div>
            </div>

            <Button className="w-full mt-5 rounded-xl bg-ai-violet hover:bg-ai-violet/90 text-white font-bold" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />Detailed AI Report
            </Button>
          </Card>

          {/* Top Denial Patterns */}
          <Card className="p-5">
            <SectionLabel>TOP DENIAL PATTERNS</SectionLabel>
            <div className="mt-3 space-y-3">
              {[
                { label: 'Missing Auth', severity: 'Severe', color: 'bg-billing-at-risk/10 text-billing-at-risk' },
                { label: 'Out of Network', severity: 'High', color: 'bg-billing-warning/10 text-billing-warning' },
                { label: 'Timely Filing', severity: 'Medium', color: 'bg-muted text-muted-foreground' },
              ].map(p => (
                <div key={p.label} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{p.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.color}`}>{p.severity}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// ── Ready Tab
// ══════════════════════════════════════════════════════════

interface ReadyTabProps {
  claims: ReadyClaim[];
  onSubmit: (ids: string[]) => void;
  claimTypeFilter: ClaimTypeFilter;
}

const ReadyTab = ({ claims, onSubmit, claimTypeFilter: ctFilter }: ReadyTabProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [submitModal, setSubmitModal] = useState<{ open: boolean; claim?: ReadyClaim; bulk?: boolean }>({ open: false });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const readyOnlyBase = claims.filter(c => c.status === 'Ready');
  const allSelected = readyOnlyBase.length > 0 && selectedIds.length === readyOnlyBase.length;

  const confirmSubmit = () => {
    if (submitModal.bulk) {
      const ids = readyOnly.map(c => c.id);
      onSubmit(ids);
      toast({ title: `${ids.length} claims submitted successfully` });
    } else if (submitModal.claim) {
      onSubmit([submitModal.claim.id]);
      toast({ title: `Claim ${submitModal.claim.id} submitted to ${submitModal.claim.payer}` });
    }
    setSubmitModal({ open: false });
    setSelectedIds([]);
  };

  const handleSubmitSelected = () => {
    onSubmit(selectedIds);
    toast({ title: `${selectedIds.length} claims submitted` });
    setSelectedIds([]);
  };

  const isClinic = ctFilter === 'Clinic';

  // Clinic-specific demo ready claims
  const clinicReadyClaims: ReadyClaim[] = [
    { id: 'CLM-C-R01', individual: 'Robert Johnson', program: 'Dr. A. Chen', stream: '99213', payer: 'Medicaid', dates: 'Apr 12, 2026', units: 1, total: '$185.00', aiVerified: true, status: 'Ready', claimType: 'Clinic' },
    { id: 'CLM-C-R02', individual: 'Jennifer Davis', program: 'Dr. R. Patel', stream: '90837', payer: 'BlueCross Primary', dates: 'Apr 11, 2026', units: 1, total: '$5,654.40', aiVerified: true, status: 'Ready', claimType: 'Clinic' },
  ];

  const displayClaims = isClinic ? clinicReadyClaims : claims;
  const readyOnly = displayClaims.filter(c => c.status === 'Ready');

  return (
    <div className="space-y-4">
      <FilterBar />

      {/* Auto-Submission Status Banner */}
      <div className="flex items-center justify-between gap-4 rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-2.5 dark:bg-amber-950/30">
        <div className="flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
          <Zap className="h-4 w-4 text-amber-600" />
          <span><span className="font-semibold">Auto-Submission Active</span> — Clean claims will be submitted automatically tonight at 12:00 AM</span>
        </div>
        <button
          onClick={() => navigate('/billing/agents/agt-1/settings#auto-submission')}
          className="text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap"
        >
          Change schedule
        </button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-extrabold font-display text-foreground">Ready for Submission</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isClinic
              ? 'Claims that passed all 8 clinic compliance checks — ready to submit to insurance'
              : 'Claims that passed all 14 AI compliance rules — ready to submit to Medicaid'}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button size="sm" className="rounded-xl font-bold btn-primary-gradient text-white" onClick={handleSubmitSelected}>
              Submit Selected ({selectedIds.length})
            </Button>
          )}
          <Button size="sm" className="rounded-xl font-bold btn-primary-gradient text-white" onClick={() => setSubmitModal({ open: true, bulk: true })} disabled={readyOnly.length === 0}>
            Submit All ({readyOnly.length})
          </Button>
        </div>
      </div>

      {displayClaims.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg font-bold font-display text-foreground">No claims in Ready queue</p>
          <p className="text-sm text-muted-foreground mt-1">Move clean claims from AI Queue to get started.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8"><Checkbox checked={allSelected} onCheckedChange={(v) => setSelectedIds(v ? readyOnly.map(c => c.id) : [])} /></TableHead>
                <TableHead className="w-8"></TableHead>
                <TableHead>{isClinic ? 'Patient' : 'Individual'}</TableHead>
                <TableHead>{isClinic ? 'Provider' : 'Program'}</TableHead>
                <TableHead>{isClinic ? 'CPT Code' : 'Funding Stream'}</TableHead>
                <TableHead>{isClinic ? 'Insurance' : 'Payer'}</TableHead>
                <TableHead>{isClinic ? 'Date of Service' : 'Billing Dates'}</TableHead>
                {!isClinic && <TableHead className="text-right">Units</TableHead>}
                <TableHead className="text-right">Total Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayClaims.map(c => (
                <React.Fragment key={c.id}>
                  <TableRow className="hover:bg-surface-low">
                    <TableCell><Checkbox checked={selectedIds.includes(c.id)} onCheckedChange={(v) => setSelectedIds(prev => v ? [...prev, c.id] : prev.filter(x => x !== c.id))} /></TableCell>
                    <TableCell>
                      <button onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                        {expanded === c.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar name={c.individual} />
                        <span className="font-semibold">{c.individual}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{c.program}</TableCell>
                    <TableCell className="text-sm">{c.stream}</TableCell>
                    <TableCell className="text-sm">{c.payer}</TableCell>
                    <TableCell className="text-sm">{c.dates}</TableCell>
                    {!isClinic && <TableCell className="text-right">{c.units}</TableCell>}
                    <TableCell className="text-right font-semibold">{c.total}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={c.status} />
                        {c.aiVerified && <Badge className="bg-ai-violet/10 text-ai-violet text-[9px] gap-0.5"><Sparkles className="h-2.5 w-2.5" />AI</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.status === 'Ready' && (
                        <Button size="sm" className="text-xs h-8 rounded-xl btn-primary-gradient text-white font-bold" onClick={() => setSubmitModal({ open: true, claim: c })}>Submit</Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expanded === c.id && (
                    <TableRow><TableCell colSpan={11} className="bg-secondary/50 p-4">
                      <div className="text-xs space-y-1 text-muted-foreground grid grid-cols-5 gap-2">
                        <div><span className="font-semibold text-foreground">Rate:</span> $9.01</div>
                        <div><span className="font-semibold text-foreground">Units:</span> {c.units}</div>
                        <div><span className="font-semibold text-foreground">Date:</span> {c.dates}</div>
                        <div><span className="font-semibold text-foreground">Code:</span> H2014</div>
                        <div><span className="font-semibold text-foreground">Status:</span> {c.status}</div>
                      </div>
                    </TableCell></TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={submitModal.open} onOpenChange={(open) => !open && setSubmitModal({ open: false })}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {submitModal.bulk ? `Submit all ${readyOnly.length} ready claims?` : `Submit claim ${submitModal.claim?.id}?`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will mark the claims as submitted and move them to the Claim Lifecycle tab.</p>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setSubmitModal({ open: false })}>Cancel</Button>
            <Button className="rounded-xl btn-primary-gradient text-white font-bold" onClick={confirmSubmit}>Confirm Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// ── Tracking Tab (Claim Lifecycle)
// ══════════════════════════════════════════════════════════

interface TrackingTabProps {
  claims: TrackingClaim[];
  onSwitchTab: (tab: string) => void;
  claimTypeFilter: ClaimTypeFilter;
}

const TrackingTab = ({ claims, onSwitchTab, claimTypeFilter: ctFilter }: TrackingTabProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [quickFixModal, setQuickFixModal] = useState<{ open: boolean; claim?: TrackingClaim }>({ open: false });
  const [fixOption, setFixOption] = useState('resubmit');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [billType, setBillType] = useState('837P');

  const generate835PDF = (claim: TrackingClaim) => {
    const html = `<html><head><title>835 Remittance Advice</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#2d3337}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}th{background:#f1f4f6;padding:8px;text-align:left}td{padding:8px;border-bottom:1px solid #eee}.total{font-weight:bold;background:#f9f9f9}</style></head><body><h1>Electronic Remittance Advice (835)</h1><p><strong>Payer:</strong> ${claim.payer}</p><p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p><table><thead><tr><th>Claim ID</th><th>Individual</th><th>Dates</th><th>Billed</th><th>Paid</th></tr></thead><tbody><tr><td>${claim.id}</td><td>${claim.individual}</td><td>${claim.dates}</td><td>${claim.total}</td><td>${claim.total}</td></tr><tr class="total"><td colspan="3">Total Payment</td><td colspan="2">${claim.total}</td></tr></tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };
  const isClinic = ctFilter === 'Clinic';

  // Clinic-specific tracking demo data
  const clinicTrackingClaims: TrackingClaim[] = [
    { id: 'CLM-C-T01', individual: 'Tom Cat', stream: 'OT Evaluation / 97165', program: 'Dr. A. Chen', payer: 'BlueCross Primary', status: 'Submitted', dates: 'Apr 7–Apr 7, 2026', units: 1, total: '$600.00', claimType: 'Clinic' },
    { id: 'CLM-C-T02', individual: 'Michael Barnes', stream: 'Psychiatry Visit / 90792', program: 'Dr. R. Patel', payer: 'Medicaid', status: 'Paid', dates: 'Mar 1–Mar 1, 2026', units: 1, total: '$36.00', claimType: 'Clinic' },
  ];

  const displayClaims = isClinic ? clinicTrackingClaims : claims;

  return (
    <div className="space-y-4">
      <FilterBar>
        <FilterSelect placeholder="Status" width="w-32" options={[
          { value: 'all', label: 'All' },
          { value: 'submitted', label: 'Submitted' },
          { value: 'accepted', label: 'Accepted' },
          { value: 'paid', label: 'Paid' },
          { value: 're-submitted', label: 'Re-submitted' },
          { value: 'rejected', label: 'Rejected' },
        ]} />
      </FilterBar>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-extrabold font-display text-foreground">Claim Lifecycle</h2>
          <p className="text-sm text-muted-foreground mt-1">Full submission history — Submitted, Accepted, Paid, Re-submitted.{' '}
            <button onClick={() => onSwitchTab('rejected')} className="text-primary hover:underline font-medium">View rejected claims →</button>
          </p>
        </div>
      </div>

      {claims.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg font-bold font-display">No claims in lifecycle tracking yet</p>
          <p className="text-sm text-muted-foreground mt-1">Submit claims from the Ready tab to see them here.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8"></TableHead>
                <TableHead>{isClinic ? 'Patient' : 'Individual'}</TableHead>
                <TableHead>{isClinic ? 'Service / CPT' : 'Funding Stream'}</TableHead>
                <TableHead>{isClinic ? 'Provider' : 'Program'}</TableHead>
                <TableHead>{isClinic ? 'Insurance' : 'Payer'}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Billing Dates</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Total Pay</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayClaims.map(c => (
                <React.Fragment key={c.id}>
                  <TableRow className="hover:bg-surface-low">
                    <TableCell>
                      <button onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                        {expanded === c.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar name={c.individual} />
                        <span className="font-semibold">{c.individual}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{c.stream}</TableCell>
                    <TableCell className="text-sm">{c.program}</TableCell>
                    <TableCell className="text-sm">{c.payer}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={c.status} />
                        {c.autoSubmitted && (
                          <Badge variant="outline" className="rounded-full bg-amber-50 text-amber-700 border-amber-300 gap-0.5 text-[10px] px-2 py-0">
                            <Zap className="h-2.5 w-2.5" />Auto
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{c.dates}</TableCell>
                    <TableCell className="text-right">{c.units}</TableCell>
                    <TableCell className="text-right font-semibold">{c.total}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {c.status === 'Rejected' && (
                          <>
                            <Button size="sm" variant="outline" className="text-xs h-7 rounded-xl" onClick={() => { setBillType('837P'); setQuickFixModal({ open: true, claim: c }); }}>Quick Fix</Button>
                            <Button size="sm" className="text-xs h-7 rounded-xl bg-ai-violet hover:bg-ai-violet/90 text-white font-bold" onClick={() => { setBillType('837P'); setQuickFixModal({ open: true, claim: c }); }}>
                              <Sparkles className="h-3 w-3 mr-1" />AI Fix
                            </Button>
                          </>
                        )}
                        {(c.status === 'Accepted' || c.status === 'Paid') && (
                          <Button size="sm" variant="ghost" className="text-xs h-7 text-primary font-medium" onClick={() => generate835PDF(c)}>
                            <FileText className="h-3 w-3 mr-1" />835 PDF
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded === c.id && (
                    <TableRow><TableCell colSpan={10} className="bg-secondary/50 p-4">
                      <div className="text-xs space-y-1 text-muted-foreground grid grid-cols-5 gap-2">
                        <div><span className="font-semibold text-foreground">Rate:</span> $9.01</div>
                        <div><span className="font-semibold text-foreground">Units:</span> {c.units}</div>
                        <div><span className="font-semibold text-foreground">Date:</span> {c.dates}</div>
                        <div><span className="font-semibold text-foreground">Code:</span> H2014</div>
                        <div><span className="font-semibold text-foreground">Status:</span> {c.status}</div>
                      </div>
                    </TableCell></TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={quickFixModal.open} onOpenChange={(open) => !open && setQuickFixModal({ open: false })}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Quick Fix — {quickFixModal.claim?.id}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Rejection reason: <strong className="text-billing-at-risk">CO4 Modifier mismatch</strong></p>
            <RadioGroup value={fixOption} onValueChange={setFixOption}>
              <div className="flex items-center space-x-2"><RadioGroupItem value="writeoff" id="writeoff" /><Label htmlFor="writeoff">Write off this claim</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="resubmit" id="resubmit" /><Label htmlFor="resubmit">Resubmit with correction</Label></div>
            </RadioGroup>
            {fixOption === 'resubmit' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Bill Type</Label>
                  <Select value={billType} onValueChange={setBillType}>
                    <SelectTrigger className="w-full rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="837P">837P</SelectItem>
                      <SelectItem value="837I">837I</SelectItem>
                      <SelectItem value="767">767 (Replacement)</SelectItem>
                      <SelectItem value="777">777 (Void)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Correction notes</Label>
                  <Textarea placeholder="Describe the correction..." value={correctionNotes} onChange={e => setCorrectionNotes(e.target.value)} className="mt-1 rounded-xl" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setQuickFixModal({ open: false })}>Cancel</Button>
            <Button className="rounded-xl btn-primary-gradient text-white font-bold" onClick={() => {
              setQuickFixModal({ open: false });
              toast({ title: fixOption === 'writeoff' ? 'Claim written off' : `Claim queued for resubmission (${billType})` });
              setCorrectionNotes('');
            }}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// ── Rejected & Fix Tab — Two Column Bento
// ══════════════════════════════════════════════════════════

interface RejectedTabProps {
  claims: RejectedClaim[];
  onResubmit: (ids: string[]) => void;
  claimTypeFilter: ClaimTypeFilter;
}

const RejectedTab = ({ claims, onResubmit, claimTypeFilter: ctFilter }: RejectedTabProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [diagnosisRunning, setDiagnosisRunning] = useState(false);
  const [autoFixIds, setAutoFixIds] = useState<string[]>([]);
  const [quickFixModal, setQuickFixModal] = useState<{ open: boolean; claim?: RejectedClaim }>({ open: false });
  const [fixOption, setFixOption] = useState('resubmit');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [billType, setBillType] = useState('837P');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const allSelected = claims.length > 0 && selectedIds.length === claims.length;

  const handleBulkResubmit = () => {
    onResubmit(selectedIds);
    toast({ title: `${selectedIds.length} claims resubmitted`, description: 'Moved to Claim Lifecycle tab with status Re-Submitted.' });
    setSelectedIds([]);
  };

  const handleRunDiagnosis = () => {
    setDiagnosisRunning(true);
    setTimeout(() => {
      setDiagnosisRunning(false);
      setAutoFixIds(claims.slice(0, 3).map(c => c.id));
      toast({ title: `AI diagnosis complete. ${claims.length} claims analyzed.` });
    }, 2000);
  };

  const handleQuickFixSubmit = () => {
    if (quickFixModal.claim) {
      onResubmit([quickFixModal.claim.id]);
      toast({ title: fixOption === 'writeoff' ? `Claim written off` : `Claim ${quickFixModal.claim.id} resubmitted (${billType})` });
    }
    setQuickFixModal({ open: false });
    setCorrectionNotes('');
  };

  const totalAtRisk = claims.reduce((s, c) => s + parseDollar(c.amount), 0);
  const autoFixable = claims.filter(c => c.aiDiagnosis.includes('Auto-fix')).length;

  return (
    <div className="space-y-4">
      <FilterBar>
        <FilterSelect placeholder="Status" width="w-36" options={[{ value: 'all', label: 'All' }, { value: 'rejected', label: 'Rejected' }]} />
        <FilterSelect placeholder="Denial Code" width="w-32" options={[{ value: 'all', label: 'All' }, { value: 'co4', label: 'CO4' }, { value: 'co16', label: 'CO16' }, { value: 'co50', label: 'CO50' }, { value: 'co97', label: 'CO97' }]} />
      </FilterBar>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-extrabold font-display text-foreground">Revenue Intelligence Layer</h2>
          <p className="text-sm text-muted-foreground mt-1">Predictive analysis and automated recovery for denial management.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl font-semibold" onClick={() => toast({ title: 'Report exported' })}>
            <Download className="h-4 w-4 mr-1.5" />Export Report
          </Button>
          <Button size="sm" className="rounded-xl font-bold bg-ai-violet hover:bg-ai-violet/90 text-white" onClick={handleRunDiagnosis} disabled={diagnosisRunning || claims.length === 0}>
            {diagnosisRunning ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
            {diagnosisRunning ? 'Analyzing...' : 'Run AI Diagnosis'}
          </Button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-[1fr_340px] gap-6">
        {/* Left */}
        <div className="space-y-4">
          {/* KPI Row */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <SectionLabel>TOTAL REJECTIONS</SectionLabel>
                <AlertTriangle className="h-4 w-4 text-billing-at-risk" />
              </div>
              <p className="text-3xl font-extrabold font-display mt-2">{claims.length.toLocaleString()}</p>
              <p className="text-xs text-billing-healthy font-medium mt-2">↗ 12% increase vs LY</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <SectionLabel>POTENTIAL RECOVERY</SectionLabel>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-3xl font-extrabold font-display mt-2">${totalAtRisk.toFixed(0)}</p>
              <p className="text-xs text-billing-healthy font-medium mt-2">✓ ${(totalAtRisk * 0.73).toFixed(0)} AI-Resolvable</p>
            </Card>
            {/* AI Recommendation Card */}
            <Card className="p-5 ai-gradient text-white relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 opacity-90"><Zap className="h-3 w-3" /> AI RECOMMENDATION</p>
                <p className="text-base font-bold font-display mt-2">Batch Fix: Missing Modifier-25</p>
                <p className="text-xs opacity-90 mt-1">{autoFixable} claims with auto-fix available — ${(totalAtRisk * 0.6).toFixed(0)} recoverable</p>
                <Button size="sm" className="mt-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold border-0" onClick={() => {
                  const fixableIds = claims.filter(c => c.aiDiagnosis.includes('Auto-fix')).map(c => c.id);
                  if (fixableIds.length) { onResubmit(fixableIds); toast({ title: `Batch fix applied to ${fixableIds.length} claims` }); }
                }}>
                  Apply Batch Fix ({autoFixable} Claims)
                </Button>
              </div>
              <Sparkles className="absolute right-4 top-4 h-16 w-16 text-white/10" />
            </Card>
          </div>

          {/* Table */}
          {claims.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-billing-healthy mx-auto mb-3" />
              <p className="text-lg font-bold font-display">No rejected claims!</p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-8"><Checkbox checked={allSelected} onCheckedChange={(v) => setSelectedIds(v ? claims.map(c => c.id) : [])} /></TableHead>
                    <TableHead>CLAIM ID & PATIENT</TableHead>
                    <TableHead>DENIAL REASON</TableHead>
                    <TableHead className="text-right">VALUE</TableHead>
                    <TableHead>AI CONFIDENCE</TableHead>
                    <TableHead>ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map(c => (
                    <React.Fragment key={c.id}>
                      <TableRow className="hover:bg-surface-low">
                        <TableCell><Checkbox checked={selectedIds.includes(c.id)} onCheckedChange={(v) => setSelectedIds(prev => v ? [...prev, c.id] : prev.filter(x => x !== c.id))} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar name={c.individual} />
                            <div>
                              <p className="font-semibold text-sm">#{c.id.replace('CLM-2025-', 'CL-')}</p>
                              <p className="text-[11px] text-muted-foreground">{c.individual} · {c.payer}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-billing-at-risk shrink-0" />
                            <span className="text-sm">{c.rejectionReason.split(' — ')[1] || c.rejectionReason}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{c.amount}</TableCell>
                        <TableCell>
                          {c.aiConfidence && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              c.aiConfidence >= 90 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            }`}>
                              <CheckCircle2 className="h-3 w-3" /> {c.aiConfidence}% Match
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" className="text-xs h-8 rounded-xl bg-ai-violet hover:bg-ai-violet/90 text-white font-bold" onClick={() => {
                            onResubmit([c.id]);
                            toast({ title: `AI fixed and resubmitted ${c.id}` });
                          }}>
                            <Sparkles className="h-3 w-3 mr-1" />AI Fix
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedId === c.id && (
                        <TableRow><TableCell colSpan={6} className="bg-secondary/50 px-6 py-4">
                          <p className="text-xs font-semibold mb-2">Attempt History</p>
                          <div className="space-y-1">
                            {(attemptHistoryData[c.id] || []).map((h, i) => (
                              <div key={i} className="flex gap-4 text-xs text-muted-foreground">
                                <span>#{h.attempt}</span><span>{h.submittedDate}</span><span className={h.status === 'Rejected' ? 'text-billing-at-risk' : 'text-billing-healthy'}>{h.status}</span><span>{h.denialCode}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell></TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-3 px-5 py-3 bg-secondary/50">
                  <p className="text-sm text-muted-foreground">{selectedIds.length} selected</p>
                  <Button size="sm" className="ml-auto rounded-xl btn-primary-gradient text-white font-bold" onClick={handleBulkResubmit}>
                    Resubmit Selected ({selectedIds.length})
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right: AI Diagnosis Hub */}
        <div className="space-y-4">
          <Card className="p-5 border-l-4 border-l-ai-violet">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-ai-violet" />
              <h3 className="text-base font-bold font-display">AI Diagnosis Hub</h3>
            </div>
            <p className="text-xs text-muted-foreground">Real-time intelligence feed</p>

            <div className="mt-4 space-y-4">
              {(ctFilter === 'Clinic' ? [
                { priority: 'TOP PRIORITY FIX', priColor: 'text-primary', time: '32m ago', title: 'Duplicate Submission Detected', desc: '42 claims flagged as duplicate. AI suggests removing suffix \'-A\' from secondary identifiers.', potential: '$4.2k' },
                { priority: 'PATTERN ALERT', priColor: 'text-ai-violet', time: '1h ago', title: 'Medical Necessity Denials', desc: '2 clinic claims denied for insufficient documentation. Note scoring below threshold.', potential: '$1.8k' },
                { priority: 'ROUTINE TASK', priColor: 'text-muted-foreground', time: '3h ago', title: 'Insurance Eligibility Lapse', desc: '1 claim submitted after coverage end date. Resubmit with corrected dates.', potential: '$185' },
              ] : ctFilter === 'IDD' ? [
                { priority: 'TOP PRIORITY FIX', priColor: 'text-primary', time: '32m ago', title: 'Duplicate Submission Detected', desc: '42 claims flagged as duplicate. AI suggests removing suffix \'-A\' from secondary identifiers.', potential: '$4.2k' },
                { priority: 'PATTERN ALERT', priColor: 'text-ai-violet', time: '1h ago', title: 'Missing Modifier Pattern', desc: '3 claims rejected for missing HQ modifier on group services. $141 recoverable.', potential: '$141' },
                { priority: 'ROUTINE TASK', priColor: 'text-muted-foreground', time: '3h ago', title: 'Auth Unit Mismatch', desc: '2 claims submitted with incorrect unit counts. Manual correction required.', potential: '$200' },
              ] : [
                { priority: 'TOP PRIORITY FIX', priColor: 'text-primary', time: '32m ago', title: 'Duplicate Submission Detected', desc: '42 claims flagged as duplicate. AI suggests removing suffix \'-A\' from secondary identifiers.', potential: '$4.2k' },
                { priority: 'PATTERN ALERT', priColor: 'text-ai-violet', time: '1h ago', title: 'Missing Modifier Pattern', desc: '3 claims rejected for missing HQ modifier on group services. $141 recoverable.', potential: '$141' },
                { priority: 'ROUTINE TASK', priColor: 'text-muted-foreground', time: '3h ago', title: 'Invalid Eligibility Info', desc: '201 claims requiring RTE verification check.', potential: '$12.5k' },
              ]).map((insight, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${insight.priColor}`}>{insight.priority}</span>
                    <span className="text-[10px] text-muted-foreground">{insight.time}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                  <p className="text-xs text-muted-foreground">{insight.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{insight.potential} potential</span>
                    <ArrowRight className="h-3.5 w-3.5 text-primary" />
                  </div>
                  {i < 2 && <div className="border-t border-secondary mt-2" />}
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full mt-4 rounded-xl font-semibold" size="sm" onClick={() => window.dispatchEvent(new CustomEvent('open-ai-chat'))}>View All AI Insights</Button>
          </Card>
        </div>
      </div>

      <Dialog open={quickFixModal.open} onOpenChange={(open) => !open && setQuickFixModal({ open: false })}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Quick Fix — {quickFixModal.claim?.id}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Rejection: <strong className="text-billing-at-risk">{quickFixModal.claim?.rejectionReason}</strong></p>
            <RadioGroup value={fixOption} onValueChange={setFixOption}>
              <div className="flex items-center space-x-2"><RadioGroupItem value="writeoff" id="d-writeoff" /><Label htmlFor="d-writeoff">Write off</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="resubmit" id="d-resubmit" /><Label htmlFor="d-resubmit">Resubmit with correction</Label></div>
            </RadioGroup>
            {fixOption === 'resubmit' && (
              <div className="space-y-3">
                <div><Label className="text-sm">Bill Type</Label>
                  <Select value={billType} onValueChange={setBillType}><SelectTrigger className="w-full rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="837P">837P</SelectItem><SelectItem value="837I">837I</SelectItem><SelectItem value="767">767 (Replacement)</SelectItem><SelectItem value="777">777 (Void)</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-sm">Correction notes</Label><Textarea placeholder="Describe..." value={correctionNotes} onChange={e => setCorrectionNotes(e.target.value)} className="mt-1 rounded-xl" /></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setQuickFixModal({ open: false })}>Cancel</Button>
            <Button className="rounded-xl btn-primary-gradient text-white font-bold" onClick={handleQuickFixSubmit}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// ── Auth Burn Rate Tab — Two Column Bento
// ══════════════════════════════════════════════════════════

const AuthBurnTab = ({ claimTypeFilter: ctFilter }: { claimTypeFilter: ClaimTypeFilter }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const filteredBurnAlerts = ctFilter === 'all' ? burnAlerts : burnAlerts.filter(a => a.claimType === ctFilter);
  const burnDistribution = [
    { day: 'MON', value: 42 }, { day: 'TUE', value: 38 }, { day: 'WED', value: 55 },
    { day: 'THU', value: 48 }, { day: 'FRI', value: 30 }, { day: 'SAT', value: 12 },
  ];

  return (
    <div className="space-y-4">
      <FilterBar>
        <FilterSelect placeholder="Expiry Range" width="w-44" options={[
          { value: 'all', label: 'All' }, { value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' }, { value: 'expired', label: 'Expired' },
        ]} />
        <FilterSelect placeholder="Usage" width="w-32" options={[
          { value: 'all', label: 'All' }, { value: '80', label: 'Above 80%' }, { value: '90', label: 'Above 90%' }, { value: '95', label: 'Above 95%' },
        ]} />
      </FilterBar>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">ANALYTICS › REVENUE CYCLE</p>
          <h2 className="text-2xl font-extrabold font-display text-foreground mt-1">Authorization Velocity</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time monitoring of clinical authorization consumption and renewal cycles across the care network.</p>
        </div>
        <Card className="px-5 py-3 flex items-center gap-6">
          <div>
            <SectionLabel>ACTIVE TREND</SectionLabel>
            <p className="text-lg font-bold text-billing-healthy">+12.4% <TrendingUp className="h-3.5 w-3.5 inline" /></p>
          </div>
          <div>
            <SectionLabel>VELOCITY INDEX</SectionLabel>
            <p className="text-lg font-bold text-foreground">0.82 <span className="text-xs font-normal text-muted-foreground">v/d</span></p>
          </div>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-[1fr_340px] gap-6">
        {/* Left */}
        <div className="space-y-4">
          {/* KPI Row */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <SectionLabel>HIGH EXHAUSTION RISK</SectionLabel>
                <AlertTriangle className="h-4 w-4 text-billing-at-risk" />
              </div>
              <p className="text-3xl font-extrabold font-display text-foreground mt-2">42</p>
              <p className="text-xs text-billing-at-risk font-medium mt-2">Requires action within 48h</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <SectionLabel>AVG. TURNAROUND</SectionLabel>
                <Info className="h-4 w-4 text-primary" />
              </div>
              <p className="text-3xl font-extrabold font-display text-foreground mt-2">3.2 <span className="text-base font-normal">Days</span></p>
              <p className="text-xs text-billing-healthy font-medium mt-2">Improved by 0.5d this week</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <SectionLabel>RENEWAL RATE</SectionLabel>
                <Sparkles className="h-4 w-4 text-ai-violet" />
              </div>
              <p className="text-3xl font-extrabold font-display text-foreground mt-2">94.8%</p>
              <p className="text-xs text-muted-foreground mt-2">Auto-submission active</p>
            </Card>
          </div>

          {/* Individuals Table */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3">
              <h3 className="text-base font-bold font-display">Individuals Nearing Exhaustion</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-primary font-medium">Filter: Highest Burn</span>
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>PATIENT & ID</TableHead>
                  <TableHead>SERVICE LINE</TableHead>
                  <TableHead>REMAINING / TOTAL</TableHead>
                  <TableHead>BURN STATUS</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBurnAlerts.map(a => {
                  const daysRemaining = a.pctUsed >= 90 ? (a.pctUsed >= 94 ? 5 : 8) : 14;
                  const isCritical = a.pctUsed >= 90;
                  return (
                    <TableRow key={a.id} className="hover:bg-surface-low">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar name={a.name} />
                          <div>
                            <p className="font-semibold text-sm">{a.name}</p>
                            <p className="text-[11px] text-muted-foreground">ID: {a.indId}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{a.serviceLine}</TableCell>
                      <TableCell>
                        <p className="text-sm">
                          <span className={`font-bold ${isCritical ? 'text-billing-at-risk' : 'text-billing-warning'}`}>{a.unitsRemaining}</span>
                          <span className="text-muted-foreground"> / {a.totalUnits} Units</span>
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[160px]">
                          <div className="h-2 rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full rounded-full ${isCritical ? 'bg-billing-at-risk' : 'bg-billing-warning'}`} style={{ width: `${a.pctUsed}%` }} />
                          </div>
                          <p className={`text-[10px] font-bold uppercase ${isCritical ? 'text-billing-at-risk' : 'text-billing-warning'}`}>
                            {isCritical ? 'CRITICAL' : 'WARNING'}: {daysRemaining} DAYS REMAINING
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" className="text-xs h-8 rounded-xl btn-primary-gradient text-white font-bold" onClick={() => toast({ title: `Opening authorization renewal for ${a.name}...` })}>
                          Renew Auth
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Right: AI Insights Panel */}
        <div className="space-y-4">
          <Card className="p-5 border-l-4 border-l-ai-violet">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-ai-violet" />
              <h3 className="text-base font-bold font-display">AI Insights</h3>
            </div>

            <Card className="p-4 bg-ai-violet/5">
              <p className="text-sm font-semibold text-ai-violet flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Actionable Renewals</p>
              <p className="text-xs text-foreground mt-1">Lumina identified <strong>3 renewals</strong> ready for 1-click submission. All clinical documentation is matched and validated.</p>
              <Button size="sm" className="mt-3 w-full rounded-xl bg-ai-violet hover:bg-ai-violet/90 text-white font-bold" onClick={() => { toast({ title: '3 auth renewals submitted successfully.' }); }}>
                <Sparkles className="h-3.5 w-3.5 mr-1" />Submit 3 Renewals Now
              </Button>
            </Card>

            <div className="mt-4">
              <SectionLabel>RECENT OPTIMIZATION</SectionLabel>
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-billing-healthy mt-0.5 shrink-0" />
                  <div><p className="text-xs font-semibold">Prior Auth #992-12 Auto-linked</p><p className="text-[11px] text-muted-foreground">Reduced manual review by 12 mins.</p></div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-billing-healthy mt-0.5 shrink-0" />
                  <div><p className="text-xs font-semibold">Cross-Payer Validation</p><p className="text-[11px] text-muted-foreground">Verified requirements for BCBS North.</p></div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-base font-bold font-display mb-3">Burn Distribution</h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={burnDistribution}>
                <Bar dataKey="value" fill="hsl(222, 100%, 47%)" radius={[4, 4, 0, 0]} />
                <XAxis dataKey="day" className="text-[10px]" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">Projected Exhaustion</span>
              <span className="text-xs font-bold text-foreground">Next 4 Days</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// ── AR Tab — Full Width with Sections
// ══════════════════════════════════════════════════════════

const arStatusColors: Record<string, string> = {
  Paid: 'bg-billing-healthy/10 text-billing-healthy',
  Partial: 'bg-billing-warning/10 text-billing-warning',
  Outstanding: 'bg-billing-warning/10 text-billing-warning',
  Adjusted: 'bg-primary/10 text-primary',
  Retroactive: 'bg-ai-violet/10 text-ai-violet',
};

const ARTab = ({ claimTypeFilter: ctFilter }: { claimTypeFilter: ClaimTypeFilter }) => {
  const [arSubTab, setArSubTab] = useState('ledger');

  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
        {[
          { value: 'ledger', label: 'Ledger & Reconciliation' },
          { value: 'aging', label: 'Aging Report' },
        ].map(t => (
          <button key={t.value} className={`px-4 py-2 rounded-lg text-xs font-semibold font-display transition-colors ${arSubTab === t.value ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setArSubTab(t.value)}>{t.label}</button>
        ))}
      </div>
      {arSubTab === 'ledger' ? <ARLedgerSubTab claimTypeFilter={ctFilter} /> : <ARAgingSubTab claimTypeFilter={ctFilter} />}
    </div>
  );
};

// ── AR Aging Sub-Tab ──────────────────────────────────────

const ARAgingSubTab = ({ claimTypeFilter: ctFilter }: { claimTypeFilter: ClaimTypeFilter }) => {
  const { toast } = useToast();
  const [agingBucketFilter, setAgingBucketFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [payerFilter, setPayerFilter] = useState('all');
  const [nameSearch, setNameSearch] = useState('');

  const baseData = ctFilter === 'all' ? agingReportData : agingReportData.filter(e => e.claimType === ctFilter);

  const filtered = useMemo(() => {
    return baseData.filter(e => {
      if (agingBucketFilter !== 'all') {
        const bucket = getAgingBucketLabel(e.agingDays).label;
        if (agingBucketFilter === '0-30' && bucket !== '0–30') return false;
        if (agingBucketFilter === '31-60' && bucket !== '31–60') return false;
        if (agingBucketFilter === '61-90' && bucket !== '61–90') return false;
        if (agingBucketFilter === '90+' && bucket !== '90+') return false;
      }
      if (statusFilter !== 'all' && e.claimStatus.toLowerCase().replace(' ', '-') !== statusFilter) return false;
      if (payerFilter !== 'all' && e.payer.toLowerCase().replace(/\s/g, '-') !== payerFilter) return false;
      if (nameSearch && !e.individual.toLowerCase().includes(nameSearch.toLowerCase())) return false;
      return true;
    });
  }, [baseData, agingBucketFilter, statusFilter, payerFilter, nameSearch]);

  const bucket030 = agingReportData.filter(e => e.agingDays <= 30).reduce((s, e) => s + e.balanceDue, 0);
  const bucket3160 = agingReportData.filter(e => e.agingDays > 30 && e.agingDays <= 60).reduce((s, e) => s + e.balanceDue, 0);
  const bucket6190 = agingReportData.filter(e => e.agingDays > 60 && e.agingDays <= 90).reduce((s, e) => s + e.balanceDue, 0);
  const bucket90plus = agingReportData.filter(e => e.agingDays > 90).reduce((s, e) => s + e.balanceDue, 0);

  const handleExport = () => {
    const headers = ['Individual Name', 'Claim #', 'Payer', 'Procedure Code', 'Date of Service', 'Billed Amount', 'Paid Amount', 'Balance Due', 'Submission Date', 'Claim Status', 'Last Action', 'Aging Days', 'Aging Bucket'];
    const rows = filtered.map(e => [e.individual, e.claimNumber, e.payer, e.procedureCode, e.dateOfService, e.billedAmount.toFixed(2), e.paidAmount.toFixed(2), e.balanceDue.toFixed(2), e.submissionDate, e.claimStatus, e.lastAction, e.agingDays, getAgingBucketLabel(e.agingDays).label]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'aging-report.csv'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Aging report exported to CSV' });
  };

  const bucketCards = [
    { label: '0–30 Days', amount: bucket030, color: 'text-billing-healthy', bgColor: 'bg-billing-healthy/10', icon: '🟢' },
    { label: '31–60 Days', amount: bucket3160, color: 'text-billing-warning', bgColor: 'bg-billing-warning/10', icon: '🟡' },
    { label: '61–90 Days', amount: bucket6190, color: 'text-[hsl(30,90%,50%)]', bgColor: 'bg-[hsl(30,90%,50%)]/10', icon: '🟠' },
    { label: '90+ Days', amount: bucket90plus, color: 'text-billing-at-risk', bgColor: 'bg-billing-at-risk/10', icon: '🔴' },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex gap-2 items-center flex-wrap">
        <FilterSelect placeholder="Payer" width="w-36" options={payerOptions} />
        <Input type="date" className="h-9 w-36 rounded-xl" />
        <Input type="date" className="h-9 w-36 rounded-xl" />
        <FilterSelect placeholder="Aging Bucket" width="w-36" options={[
          { value: 'all', label: 'All Buckets' }, { value: '0-30', label: '0–30 Days' }, { value: '31-60', label: '31–60 Days' }, { value: '61-90', label: '61–90 Days' }, { value: '90+', label: '90+ Days' },
        ]} />
        <FilterSelect placeholder="Claim Status" width="w-36" options={[
          { value: 'all', label: 'All Statuses' }, { value: 'submitted', label: 'Submitted' }, { value: 'pending', label: 'Pending' }, { value: 'partial-pay', label: 'Partial Pay' }, { value: 'denied', label: 'Denied' },
        ]} />
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search individual..." value={nameSearch} onChange={e => setNameSearch(e.target.value)} className="pl-9 h-9 rounded-xl bg-card" />
        </div>
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={handleExport}>
          <Download className="h-4 w-4" />Export to CSV
        </Button>
      </div>

      {/* Aging Bucket Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {bucketCards.map(b => (
          <Card key={b.label} className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground font-body">{b.icon} {b.label}</p>
                <p className="text-3xl font-extrabold font-display text-foreground tracking-tight">${b.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                <p className="text-xs text-muted-foreground">{agingReportData.filter(e => {
                  if (b.label === '0–30 Days') return e.agingDays <= 30;
                  if (b.label === '31–60 Days') return e.agingDays > 30 && e.agingDays <= 60;
                  if (b.label === '61–90 Days') return e.agingDays > 60 && e.agingDays <= 90;
                  return e.agingDays > 90;
                }).length} claims</p>
              </div>
              <div className={`rounded-xl ${b.bgColor} p-3`}>
                <DollarSign className={`h-5 w-5 ${b.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Aging Report Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Individual</TableHead>
              <TableHead>Claim #</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Proc Code</TableHead>
              <TableHead>Date of Service</TableHead>
              <TableHead className="text-right">Billed</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance Due</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Action</TableHead>
              <TableHead>Aging</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(e => {
              const aging = getAgingBucketLabel(e.agingDays);
              return (
                <TableRow key={e.id} className="hover:bg-surface-low">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar name={e.individual} />
                      <span className="font-semibold text-sm">{e.individual}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{e.claimNumber}</TableCell>
                  <TableCell className="text-sm">{e.payer}</TableCell>
                  <TableCell className="text-sm font-mono">{e.procedureCode}</TableCell>
                  <TableCell className="text-sm">{e.dateOfService}</TableCell>
                  <TableCell className="text-right font-semibold">${e.billedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">${e.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-semibold">${e.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-sm">{e.submissionDate}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${agingClaimStatusColors[e.claimStatus] || 'bg-muted text-muted-foreground'}`}>{e.claimStatus}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{e.lastAction}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${aging.color}`}>
                      {aging.dot} {aging.label}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-5 py-3 text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {agingReportData.length} claims</span>
        </div>
      </Card>
    </div>
  );
};

// ── AR Ledger Sub-Tab ─────────────────────────────────────

const ARLedgerSubTab = ({ claimTypeFilter: ctFilter }: { claimTypeFilter: ClaimTypeFilter }) => {
  const { toast } = useToast();
  const [showRetroOnly, setShowRetroOnly] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const [reconciledIds, setReconciledIds] = useState<string[]>([]);
  const [manualForm, setManualForm] = useState({ payer: '', checkNumber: '', paymentDate: '', totalPayment: '', notes: '' });
  const [arPeriod, setArPeriod] = useState('mtd');

  // Clinic-specific ledger data
  const clinicLedgerData: ARLedgerEntry[] = [
    { id: 'AR-C01', individual: 'Tom Cat', fundingStream: 'Clinic Services', payer: 'BlueCross Primary', serviceDates: '4/7/2026', billedAmount: 600.00, allowedAmount: 600.00, paidAmount: 0, adjustment: 0, adjustmentCode: '', balanceDue: 600.00, status: 'Outstanding', source: 'Auto — 835', dateOfService: new Date(2026, 3, 7), aiInsight: '⏳ Awaiting clearinghouse response', claimType: 'Clinic' },
    { id: 'AR-C02', individual: 'Jennifer Davis', fundingStream: 'Clinic Services', payer: 'Medicaid', serviceDates: '4/11/2026', billedAmount: 5654.40, allowedAmount: 5200.00, paidAmount: 5200.00, adjustment: -454.40, adjustmentCode: 'CO97', balanceDue: 0, status: 'Retroactive', source: 'Auto — 835', dateOfService: new Date(2026, 3, 11), claimType: 'Clinic' },
    { id: 'AR-C03', individual: 'Robert Johnson', fundingStream: 'Clinic Services', payer: 'Medicaid', serviceDates: '4/12/2026', billedAmount: 185.00, allowedAmount: 185.00, paidAmount: 0, adjustment: 0, adjustmentCode: '', balanceDue: 185.00, status: 'Outstanding', source: 'Auto — 835', dateOfService: new Date(2026, 3, 12), aiInsight: '⏳ Awaiting payer confirmation', claimType: 'Clinic' },
  ];

  const isClinicFilter = ctFilter === 'Clinic';
  const baseData = isClinicFilter ? clinicLedgerData : (ctFilter === 'all' ? arLedgerData : arLedgerData.filter(e => e.claimType === ctFilter));
  const filtered = showRetroOnly ? baseData.filter(e => e.status === 'Retroactive') : baseData;
  const totalBilled = baseData.reduce((s, e) => s + e.billedAmount, 0);
  const totalPaid = baseData.reduce((s, e) => s + e.paidAmount, 0);
  const totalOutstanding = baseData.reduce((s, e) => s + e.balanceDue, 0);
  const totalAdjustments = Math.abs(baseData.reduce((s, e) => s + e.adjustment, 0));
  const collectionRate = totalBilled > 0 ? ((totalPaid / totalBilled) * 100).toFixed(1) : '0';

  const handlePostRemittance = () => {
    setUploadModal(false); setManualEntry(false);
    setManualForm({ payer: '', checkNumber: '', paymentDate: '', totalPayment: '', notes: '' });
    toast({ title: 'Remittance posted' });
  };

  const handleReconcile = (action: string) => {
    if (reconcileId) {
      setReconciledIds(prev => [...prev, reconcileId]);
      toast({ title: `Claim ${reconcileId} marked as ${action}` });
      setReconcileId(null);
    }
  };

  const agingBuckets = [
    { label: '0-30 DAYS', amount: '$640K', pct: 64 },
    { label: '31-60 DAYS', amount: '$180K', pct: 18 },
    { label: '61-90 DAYS', amount: '$120K', pct: 12 },
    { label: '90+ DAYS', amount: '$60K', pct: 6 },
  ];

  return (
    <div className="space-y-6">
      <FilterBar>
        <FilterSelect placeholder="Status" width="w-32" options={[
          { value: 'all', label: 'All' }, { value: 'paid', label: 'Paid' }, { value: 'partial', label: 'Partial' },
          { value: 'outstanding', label: 'Outstanding' }, { value: 'adjusted', label: 'Adjusted' }, { value: 'retroactive', label: 'Retroactive' },
        ]} />
        <FilterSelect placeholder="Source" width="w-36" options={[
          { value: 'all', label: 'All' }, { value: 'auto', label: 'Auto — 835' }, { value: 'manual', label: 'Manual Upload' },
        ]} />
      </FilterBar>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-extrabold font-display text-foreground">AR Tracking & Reconciliation</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time revenue cycle performance and AI-driven recovery insights.</p>
        </div>
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {['MTD', 'Q3 2023', 'Custom Range'].map(p => (
            <button key={p} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${arPeriod === p.toLowerCase().replace(' ', '-') ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setArPeriod(p.toLowerCase().replace(' ', '-'))}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-5">
          <SectionLabel>TOTAL BILLED</SectionLabel>
          <p className="text-3xl font-extrabold font-display text-foreground mt-2">${(totalBilled / 1000).toFixed(1)}K</p>
          <p className="text-xs text-billing-healthy font-medium mt-2">↗ +12.4% vs last month</p>
        </Card>
        <Card className="p-5">
          <SectionLabel>TOTAL PAID</SectionLabel>
          <p className="text-3xl font-extrabold font-display text-foreground mt-2">${(totalPaid / 1000).toFixed(1)}K</p>
          <p className="text-xs text-billing-healthy font-medium mt-2">✓ {collectionRate}% Collection Rate</p>
        </Card>
        <Card className="p-5">
          <SectionLabel>TOTAL OUTSTANDING</SectionLabel>
          <p className="text-3xl font-extrabold font-display text-foreground mt-2">${(totalOutstanding / 1000).toFixed(1)}K</p>
          <p className="text-xs text-billing-warning font-medium mt-2">⚠ ${(totalOutstanding * 0.55 / 1000).toFixed(0)}k over 90 days</p>
        </Card>
        <Card className="p-5 ai-gradient text-white relative overflow-hidden">
          <div className="relative z-10">
            <SectionLabel><span className="text-white/80">RECOVERABLE ADJUSTMENTS</span></SectionLabel>
            <p className="text-3xl font-extrabold font-display mt-2">${(totalAdjustments / 1000).toFixed(0)}k</p>
            <Button size="sm" className="mt-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold border-0">
              <Sparkles className="h-3.5 w-3.5 mr-1" />Recover Now
            </Button>
          </div>
        </Card>
      </div>

      {/* Smart Reconciliation Agent */}
      <div className="grid grid-cols-[1fr_340px] gap-6">
        <Card className="p-5 border-l-4 border-l-ai-violet">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-ai-violet/10 flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-ai-violet" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-display">Smart Reconciliation Agent</h3>
                <Badge className="bg-billing-healthy/10 text-billing-healthy text-[10px] font-bold">ACTIVE INTELLIGENCE</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">AI detected 14 mismatches in the Blue Shield ledger.</p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Card className="p-4 bg-secondary/50">
                  <p className="text-[10px] font-bold text-billing-healthy flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Likely Recovery</p>
                  <p className="text-2xl font-extrabold font-display mt-1">$42,150</p>
                  <p className="text-[11px] text-muted-foreground">Across 86 Claims</p>
                </Card>
                <Card className="p-4 bg-secondary/50">
                  <p className="text-sm font-semibold flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-ai-violet" /> Auto-Fix Action</p>
                  <p className="text-xs text-muted-foreground mt-1">AI identifies incorrect NPI mappings for pediatric services. One-click update available.</p>
                  <Button size="sm" className="mt-2 w-full rounded-xl bg-ai-violet hover:bg-ai-violet/90 text-white font-bold">Execute Fixes</Button>
                </Card>
              </div>
            </div>
          </div>
        </Card>

        {/* AR Aging Bucket */}
        <Card className="p-5">
          <h3 className="text-base font-bold font-display mb-4">AR Aging Bucket</h3>
          <div className="space-y-4">
            {agingBuckets.map(b => (
              <div key={b.label}>
                <div className="flex items-center justify-between mb-1">
                  <SectionLabel>{b.label}</SectionLabel>
                  <span className="text-xs font-bold">{b.amount}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full rounded-full ${b.pct > 50 ? 'bg-primary' : b.pct > 15 ? 'bg-primary/60' : 'bg-billing-at-risk'}`} style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Billing Ledger */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold font-display">Billing Ledger</h3>
          <Badge className="bg-ai-violet/10 text-ai-violet text-[10px] font-bold gap-1"><Sparkles className="h-3 w-3" /> AI RECONCILIATION ENABLED</Badge>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2">
            <Switch checked={showRetroOnly} onCheckedChange={setShowRetroOnly} id="retro-toggle" />
            <Label htmlFor="retro-toggle" className="text-xs text-muted-foreground">Retroactive Only</Label>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setUploadModal(true)}><Upload className="h-4 w-4 mr-1.5" />Upload 835</Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => toast({ title: 'Ledger exported' })}><Download className="h-4 w-4 mr-1.5" />Export</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Individual</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Service Dates</TableHead>
              <TableHead className="text-right">Billed</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>AI Insights</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 8).map(e => (
              <React.Fragment key={e.id}>
                <TableRow className="hover:bg-surface-low">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar name={e.individual} />
                      <div>
                        <p className="font-semibold text-sm">{e.individual}</p>
                        <p className="text-[11px] text-muted-foreground">{e.fundingStream}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{e.payer}</TableCell>
                  <TableCell className="text-sm">{e.serviceDates}</TableCell>
                  <TableCell className="text-right font-semibold">${e.billedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">${e.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${arStatusColors[e.status] || 'bg-muted text-muted-foreground'}`}>{e.status}</span>
                  </TableCell>
                  <TableCell>
                    {e.aiInsight && <span className="text-xs text-ai-violet">{e.aiInsight}</span>}
                  </TableCell>
                  <TableCell>
                    {e.aiInsight?.includes('Fix') && (
                      <Button size="sm" className="text-xs h-7 rounded-xl bg-ai-violet hover:bg-ai-violet/90 text-white font-bold">Apply Fix</Button>
                    )}
                    {e.aiInsight?.includes('Appeal') && (
                      <Button size="sm" className="text-xs h-7 rounded-xl bg-ai-violet hover:bg-ai-violet/90 text-white font-bold">Send Appeal</Button>
                    )}
                    {(e.status === 'Outstanding' || e.status === 'Partial') && !reconciledIds.includes(e.id) && !e.aiInsight?.includes('Fix') && (
                      <Button size="sm" variant="outline" className="text-xs h-7 rounded-xl" onClick={() => setReconcileId(e.id)}>Reconcile</Button>
                    )}
                  </TableCell>
                </TableRow>
                {reconcileId === e.id && (
                  <TableRow><TableCell colSpan={8} className="bg-secondary/50 p-4">
                    <div className="space-y-3 max-w-md">
                      <p className="text-xs font-semibold">Reconciliation — {e.id}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Billed:</span> <span className="font-medium">${e.billedAmount.toFixed(2)}</span></div>
                        <div><span className="text-muted-foreground">Paid:</span> <span className="font-medium">${e.paidAmount.toFixed(2)}</span></div>
                        <div><span className="text-muted-foreground">Balance:</span> <span className="font-medium">${e.balanceDue.toFixed(2)}</span></div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="text-xs h-7 rounded-xl bg-billing-healthy hover:bg-billing-healthy/90 text-white font-bold" onClick={() => handleReconcile('Fully Reconciled')}>Fully Reconciled</Button>
                        <Button size="sm" variant="outline" className="text-xs h-7 rounded-xl" onClick={() => handleReconcile('Write Off')}>Write Off</Button>
                        <Button size="sm" variant="outline" className="text-xs h-7 rounded-xl text-billing-at-risk" onClick={() => handleReconcile('Dispute')}>Dispute</Button>
                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setReconcileId(null)}>Cancel</Button>
                      </div>
                    </div>
                  </TableCell></TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-5 py-3 text-xs text-muted-foreground">
          <span>Showing 1-{Math.min(8, filtered.length)} of {filtered.length} claims</span>
          <div className="flex gap-1">
            {[1, 2, 3].map(p => (
              <button
                key={p}
                onClick={() => {/* demo pagination */}}
                className={`w-7 h-7 rounded-lg text-xs font-semibold ${p === 1 ? 'bg-primary text-white' : 'hover:bg-secondary'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Upload Modal */}
      <Dialog open={uploadModal} onOpenChange={setUploadModal}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Upload Remittance</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-secondary rounded-2xl p-8 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Drop your 835 EDI, PDF, or Excel remittance file here</p>
              <p className="text-xs text-muted-foreground mt-1">Accepts .edi, .835, .pdf, .xlsx, .csv</p>
            </div>
            <button className="text-sm text-primary font-semibold hover:underline" onClick={() => setManualEntry(!manualEntry)}>
              {manualEntry ? 'Hide manual entry' : 'Or enter manually →'}
            </button>
            {manualEntry && (
              <div className="space-y-3 p-4 bg-secondary/50 rounded-xl">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Payer</Label><Input className="mt-1 rounded-xl" value={manualForm.payer} onChange={e => setManualForm(p => ({ ...p, payer: e.target.value }))} /></div>
                  <div><Label className="text-xs">Check/EFT #</Label><Input className="mt-1 rounded-xl" value={manualForm.checkNumber} onChange={e => setManualForm(p => ({ ...p, checkNumber: e.target.value }))} /></div>
                  <div><Label className="text-xs">Payment Date</Label><Input type="date" className="mt-1 rounded-xl" value={manualForm.paymentDate} onChange={e => setManualForm(p => ({ ...p, paymentDate: e.target.value }))} /></div>
                  <div><Label className="text-xs">Total Payment</Label><Input className="mt-1 rounded-xl" placeholder="$0.00" value={manualForm.totalPayment} onChange={e => setManualForm(p => ({ ...p, totalPayment: e.target.value }))} /></div>
                </div>
                <div><Label className="text-xs">Notes</Label><Textarea className="mt-1 rounded-xl" value={manualForm.notes} onChange={e => setManualForm(p => ({ ...p, notes: e.target.value }))} /></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setUploadModal(false)}>Cancel</Button>
            <Button className="rounded-xl btn-primary-gradient text-white font-bold" onClick={handlePostRemittance}>Post Remittance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// ── Period Picker
// ══════════════════════════════════════════════════════════

const PeriodPicker = ({ selectedMonth, selectedYear, onChange }: { selectedMonth: number; selectedYear: number; onChange: (m: number, y: number) => void }) => {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selectedYear);
  const now = new Date();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 rounded-xl gap-1.5 font-semibold">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          {MONTH_NAMES[selectedMonth].slice(0, 3)} {selectedYear}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3 rounded-2xl" align="end">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewYear(y => y - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-bold font-display">{viewYear}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewYear(y => y + 1)} disabled={viewYear >= now.getFullYear()}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_NAMES.map((name, i) => {
            const isFuture = viewYear > now.getFullYear() || (viewYear === now.getFullYear() && i > now.getMonth());
            const isSelected = i === selectedMonth && viewYear === selectedYear;
            return (
              <Button key={name} variant={isSelected ? 'default' : 'ghost'} size="sm" className="h-8 text-xs rounded-lg" disabled={isFuture}
                onClick={() => { onChange(i, viewYear); setOpen(false); }}>
                {name.slice(0, 3)}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ══════════════════════════════════════════════════════════
// ── MAIN COMPONENT
// ══════════════════════════════════════════════════════════

const RevenueCycle = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { claimTypeFilter, setClaimTypeFilter } = useBillingContext();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [previewMode, setPreviewMode] = useState(false);
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // ── Shared Claim State
  const [blockedClaims, setBlockedClaims] = useState<AiQueueClaim[]>([...initialBlockedClaims]);
  const [reviewClaims, setReviewClaims] = useState<AiQueueClaim[]>([...initialReviewClaims]);
  const [cleanClaims, setCleanClaims] = useState<AiQueueClaim[]>([...initialCleanClaims]);
  const [deferredClaims] = useState<AiQueueClaim[]>([...initialDeferredClaims]);
  const [readyClaims, setReadyClaims] = useState<ReadyClaim[]>([...initialReadyClaims]);
  const [trackingClaims, setTrackingClaims] = useState<TrackingClaim[]>([...initialTrackingClaims]);
  const [rejectedClaims, setRejectedClaims] = useState<RejectedClaim[]>([...initialRejectedClaims]);

  // ── Transition Handlers
  const handleFixAuto = (claim: AiQueueClaim) => {
    setBlockedClaims(prev => prev.filter(c => c.id !== claim.id));
    setReviewClaims(prev => [...prev, { ...claim, status: 'REVIEW' as const, finding: `AI auto-fixed: ${claim.autoFixDescription}` }]);
  };

  const handleMoveToReady = (ids: string[]) => {
    const moved = cleanClaims.filter(c => ids.includes(c.id));
    setCleanClaims(prev => prev.filter(c => !ids.includes(c.id)));
    const newReady: ReadyClaim[] = moved.map(c => ({
      id: c.id, individual: c.individual, program: c.program, stream: c.stream,
      payer: c.payer, dates: c.dates, units: c.units, total: c.total, aiVerified: true, status: 'Ready',
    }));
    setReadyClaims(prev => [...prev, ...newReady]);
  };

  const handleSubmitClaims = (ids: string[]) => {
    const submitted = readyClaims.filter(c => ids.includes(c.id));
    setReadyClaims(prev => prev.filter(c => !ids.includes(c.id)));
    const newTracking: TrackingClaim[] = submitted.map(c => ({
      id: c.id, individual: c.individual, stream: c.stream, program: c.program,
      payer: c.payer, status: 'Submitted' as const, dates: c.dates, units: c.units, total: c.total,
    }));
    setTrackingClaims(prev => [...newTracking, ...prev]);
  };

  const handleResubmitRejected = (ids: string[]) => {
    const resubmitted = rejectedClaims.filter(c => ids.includes(c.id));
    setRejectedClaims(prev => prev.filter(c => !ids.includes(c.id)));
    const newTracking: TrackingClaim[] = resubmitted.map(c => ({
      id: c.id, individual: c.individual, stream: 'Re-submitted', program: 'Corrected',
      payer: c.payer, status: 'Re-Submitted' as const, dates: new Date().toLocaleDateString(), units: '—', total: c.amount,
    }));
    setTrackingClaims(prev => [...newTracking, ...prev]);
  };

  // ── Computed Values (filter-aware)
  const ctf = claimTypeFilter;
  const filterAiQueue = (claims: AiQueueClaim[]) => ctf === 'all' ? claims : claims.filter(c => c.claimType === ctf);
  const filterReady = (claims: ReadyClaim[]) => ctf === 'all' ? claims : claims.filter(c => c.claimType === ctf);
  const filterTracking = (claims: TrackingClaim[]) => ctf === 'all' ? claims : claims.filter(c => c.claimType === ctf);
  const filterRejected = (claims: RejectedClaim[]) => ctf === 'all' ? claims : claims.filter(c => c.claimType === ctf);

  const fBlockedClaims = filterAiQueue(blockedClaims);
  const fReviewClaims = filterAiQueue(reviewClaims);
  const fCleanClaims = filterAiQueue(cleanClaims);
  const fDeferredClaims = filterAiQueue(deferredClaims);
  const fReadyClaims = filterReady(readyClaims);
  const fTrackingClaims = filterTracking(trackingClaims);
  const fRejectedClaims = filterRejected(rejectedClaims);

  const aiQueueTotal = fBlockedClaims.length + fReviewClaims.length + fCleanClaims.length + fDeferredClaims.length;
  const blockedTotal = fBlockedClaims.reduce((s, c) => s + parseDollar(c.total), 0);
  const readyTotal = fReadyClaims.filter(c => c.status === 'Ready').reduce((s, c) => s + parseDollar(c.total), 0);
  const rejectedTotal = fRejectedClaims.reduce((s, c) => s + parseDollar(c.amount), 0);
  const revenueToRecover = blockedTotal + rejectedTotal;

  const counts = useMemo(() => ({
    blocked: fBlockedClaims.length, review: fReviewClaims.length, clean: fCleanClaims.length,
    deferred: fDeferredClaims.length, ready: fReadyClaims.filter(c => c.status === 'Ready').length,
    submitted: fTrackingClaims.filter(c => c.status === 'Submitted').length,
    paid: fTrackingClaims.filter(c => c.status === 'Paid').length,
    resubmitted: fTrackingClaims.filter(c => c.status === 'Re-Submitted').length,
    rejected: fRejectedClaims.length, tracked: fTrackingClaims.length,
  }), [fBlockedClaims, fReviewClaims, fCleanClaims, fDeferredClaims, fReadyClaims, fTrackingClaims, fRejectedClaims]);

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month); setSelectedYear(year);
    toast({ title: 'Period Updated', description: `Showing data for ${MONTH_NAMES[month]} ${year}` });
  };

  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold font-display text-foreground tracking-tight">Claims Management</h1>
          <p className="text-sm text-muted-foreground mt-1">End-to-end claim lifecycle and revenue integrity monitoring.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveTab('ai-queue')}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-billing-at-risk/5 hover:bg-billing-at-risk/10 transition-colors shadow-elevated">
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-billing-at-risk">Revenue to Recover</span>
              <span className="text-xl font-extrabold font-display text-foreground">${revenueToRecover.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(210, 18%, 93%)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(222, 100%, 47%)" strokeWidth="3"
                  strokeDasharray={`${revenueToRecover > 0 ? ((1 - (revenueToRecover / (blockedTotal + rejectedTotal + readyTotal + 0.01))) * 97.4) : 97.4} 97.4`}
                  strokeLinecap="round" className="transition-all duration-700" />
              </svg>
              <DollarSign className="h-3.5 w-3.5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </button>
          <a href="/billing/agents"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[13px] font-bold text-white bg-primary hover:bg-primary/90 transition-colors shadow-md">
            <span className="text-sm">✦</span>
            AI Agent
          </a>
        </div>
      </div>

      {/* ── Global Claim Type Filter Bar ── */}
      <div className="flex items-center justify-between h-10 px-1 mb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground font-medium">Viewing:</span>
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
            {([
              { value: 'all' as ClaimTypeFilter, label: 'All Claims', activeClass: 'bg-card shadow-sm text-foreground' },
              { value: 'IDD' as ClaimTypeFilter, label: 'IDD', activeClass: 'bg-[hsl(245,58%,51%)] text-white shadow-sm' },
              { value: 'Clinic' as ClaimTypeFilter, label: 'Clinic', activeClass: 'bg-[hsl(162,63%,41%)] text-white shadow-sm' },
            ]).map(opt => (
              <button key={opt.value} onClick={() => setClaimTypeFilter(opt.value)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${ctf === opt.value ? opt.activeClass : 'text-muted-foreground hover:text-foreground'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {ctf !== 'all' && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Filtered:</span>
            <span className={`font-semibold ${ctf === 'IDD' ? 'text-[hsl(245,58%,51%)]' : 'text-[hsl(162,63%,41%)]'}`}>{ctf} only</span>
            <button onClick={() => setClaimTypeFilter('all')} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">✕</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-0 bg-transparent gap-0 p-0">
          {[
            { value: 'dashboard', label: 'Dashboard' },
            { value: 'ai-queue', label: 'AI Queue', count: aiQueueTotal },
            { value: 'ready', label: 'Ready', count: counts.ready },
            { value: 'rejected', label: 'Rejected', count: counts.rejected },
            { value: 'tracking', label: 'Tracking', count: counts.tracked },
            { value: 'auth-burn', label: 'Auth Burn Rate' },
            { value: 'ar', label: 'AR Tracking' },
            { value: 'compliance', label: 'Compliance Center' },
            { value: 'runs', label: 'Runs' },
            { value: 'audit', label: 'Audit Log' },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="font-display font-semibold text-[13px] rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5">
              {tab.label}
              {tab.count !== undefined && tab.count > 0 ? (
                <Badge variant="secondary" className={`ml-1.5 h-5 px-1.5 text-[10px] rounded-full ${ctf !== 'all' ? 'ring-1 ring-primary/30' : ''}`}>
                  {tab.count}{ctf !== 'all' ? '*' : ''}
                </Badge>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab onSwitchTab={setActiveTab} selectedMonth={selectedMonth} selectedYear={selectedYear} counts={counts}
            cleanTotal={`$${fCleanClaims.reduce((s, c) => s + parseDollar(c.total), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            readyTotal={`$${readyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            rejectedTotal={`$${rejectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            claimTypeFilter={ctf} />
        </TabsContent>
        <TabsContent value="ai-queue">
          <AiQueueTab blocked={fBlockedClaims} review={fReviewClaims} clean={fCleanClaims} deferred={fDeferredClaims}
            previewMode={previewMode} onFixAuto={handleFixAuto} onMoveToReady={handleMoveToReady} />
        </TabsContent>
        <TabsContent value="ready"><ReadyTab claims={fReadyClaims} onSubmit={handleSubmitClaims} claimTypeFilter={ctf} /></TabsContent>
        <TabsContent value="tracking"><TrackingTab claims={fTrackingClaims} onSwitchTab={setActiveTab} claimTypeFilter={ctf} /></TabsContent>
        <TabsContent value="rejected"><RejectedTab claims={fRejectedClaims} onResubmit={handleResubmitRejected} claimTypeFilter={ctf} /></TabsContent>
        <TabsContent value="auth-burn"><AuthBurnTab claimTypeFilter={ctf} /></TabsContent>
        <TabsContent value="ar"><ARTab claimTypeFilter={ctf} /></TabsContent>
        <TabsContent value="compliance"><IndividualsBillingHealth /></TabsContent>
        <TabsContent value="runs"><RunsHistory /></TabsContent>
        <TabsContent value="audit"><AuditLog /></TabsContent>
      </Tabs>

    </div>
  );
};

export default RevenueCycle;
