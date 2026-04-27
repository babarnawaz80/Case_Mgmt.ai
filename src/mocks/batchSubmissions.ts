export interface BatchSubmission {
  id: string;
  submittedAt: string;
  cadence: string;
  claims: number;
  totalAmount: number;
  variancePct: number;
  status: 'submitted' | 'held';
  priorAverage?: number;
  thresholdPct?: number;
}

export const mockBatchSubmissions: BatchSubmission[] = [
  { id: 'BATCH-2026-041', submittedAt: 'Apr 21, 2026 — 12:00 AM', cadence: 'Nightly', claims: 94, totalAmount: 52340.00, variancePct: 2.1, status: 'submitted' },
  { id: 'BATCH-2026-040', submittedAt: 'Apr 20, 2026 — 12:00 AM', cadence: 'Nightly', claims: 91, totalAmount: 51180.00, variancePct: 0.8, status: 'submitted' },
  { id: 'BATCH-2026-039', submittedAt: 'Apr 17, 2026 — 12:00 AM', cadence: 'Nightly', claims: 107, totalAmount: 61450.00, variancePct: 14.3, status: 'held', priorAverage: 53200.00, thresholdPct: 10 },
  { id: 'BATCH-2026-038', submittedAt: 'Apr 16, 2026 — 12:00 AM', cadence: 'Nightly', claims: 88, totalAmount: 49210.00, variancePct: 1.2, status: 'submitted' },
];

export interface BatchClaimDetail {
  individual: string;
  program: string;
  payer: string;
  amount: number;
}

export const mockBatchDetailClaims: BatchClaimDetail[] = [
  { individual: 'Maria Garcia', program: 'Sunrise House', payer: 'Medicaid', amount: 548.00 },
  { individual: 'James Wilson', program: 'Sunrise House', payer: 'Medicaid', amount: 612.00 },
  { individual: 'David R.', program: 'Sunrise House', payer: 'Medicaid', amount: 488.00 },
];
