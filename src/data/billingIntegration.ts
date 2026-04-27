// Billing integration layer.
//
// This file is the bridge between Case Management AI and IDD Billing.AI.
// It defines:
//   - the billing event record shape that auto-creates from signed billable notes
//   - mock claim history for the eChart Billing Summary widget
//   - authorization utilization helpers (Connection 2)
//   - denial alert generator for the AI panel (Connection 4)
//   - dashboard revenue KPI seed (Connection 9)
//
// The actual billing UI/screens live untouched under /billing.
// This layer is intentionally pure data + helpers so existing host pages
// can opt-in to surfacing billing signals without coupling to billing internals.

export type BillingStatus =
  | "pending"
  | "submitted"
  | "paid"
  | "denied"
  | "resubmission";

export type NoteType = "contact_note" | "progress_note";

export interface BillingEvent {
  id: string;
  individual_id: string;
  note_id: string;
  note_type: NoteType;
  service_code: string;
  units: number;
  authorization_id: string;
  date_of_service: string; // MM/DD/YYYY
  case_manager_id: string;
  program_id: string;
  billing_status: BillingStatus;
  created_at: string;
  payment_amount?: number;
  payment_date?: string;
  denial_reason?: string;
  denial_code?: string;
  era_reference_number?: string;
  payer_name?: string;
}

export interface AuthorizationUtilization {
  individual_id: string;
  authorization_id: string;
  service_code: string;
  units_authorized: number;
  units_used: number;
  remaining_balance: number;
  used_unit_percentage: number;
  expires_on: string; // MM/DD/YYYY
  last_activity?: string;
}

export interface BillingSummary {
  submitted: number;
  paid: number;
  pending: number;
  denied: number;
  totalBilled: number;
  totalPaid: number;
}

export interface DenialAlert {
  id: string;
  individual_id: string;
  individual_name: string;
  service_code: string;
  date_of_service: string;
  denial_reason: string;
  denial_code: string;
  estimated_impact: number;
  note_id: string;
  note_type: NoteType;
}

// ---------- Joseph Brown seeded claim history ----------

export const billingEvents: BillingEvent[] = [
  {
    id: "be-001",
    individual_id: "joseph-brown",
    note_id: "pn-jb-2026-03-16",
    note_type: "progress_note",
    service_code: "T2022",
    units: 3,
    authorization_id: "auth-jb-ccs-2026",
    date_of_service: "03/16/2026",
    case_manager_id: "cm-babar",
    program_id: "ccs-md-dda",
    billing_status: "paid",
    created_at: "03/17/2026 09:12",
    payment_amount: 87.0,
    payment_date: "04/02/2026",
    era_reference_number: "ERA-2026-0402-018",
    payer_name: "Maryland Medicaid",
  },
  {
    id: "be-002",
    individual_id: "joseph-brown",
    note_id: "pn-jb-2026-01-26",
    note_type: "progress_note",
    service_code: "T2022",
    units: 2,
    authorization_id: "auth-jb-ccs-2026",
    date_of_service: "01/26/2026",
    case_manager_id: "cm-babar",
    program_id: "ccs-md-dda",
    billing_status: "paid",
    created_at: "01/27/2026 10:48",
    payment_amount: 58.0,
    payment_date: "02/12/2026",
    era_reference_number: "ERA-2026-0212-006",
    payer_name: "Maryland Medicaid",
  },
  {
    id: "be-003",
    individual_id: "joseph-brown",
    note_id: "pn-jb-2025-10-13",
    note_type: "progress_note",
    service_code: "T2022",
    units: 4,
    authorization_id: "auth-jb-ccs-2025",
    date_of_service: "10/13/2025",
    case_manager_id: "cm-babar",
    program_id: "ccs-md-dda",
    billing_status: "denied",
    created_at: "10/14/2025 14:01",
    denial_reason: "Missing prior authorization",
    denial_code: "CARC-197",
    payer_name: "Maryland Medicaid",
  },
  {
    id: "be-004",
    individual_id: "joseph-brown",
    note_id: "pn-jb-2025-10-10",
    note_type: "progress_note",
    service_code: "T2022",
    units: 3,
    authorization_id: "auth-jb-ccs-2025",
    date_of_service: "10/10/2025",
    case_manager_id: "cm-babar",
    program_id: "ccs-md-dda",
    billing_status: "paid",
    created_at: "10/11/2025 09:20",
    payment_amount: 87.0,
    payment_date: "10/28/2025",
    era_reference_number: "ERA-2025-1028-241",
    payer_name: "Maryland Medicaid",
  },
  {
    id: "be-005",
    individual_id: "joseph-brown",
    note_id: "pn-jb-2024-09-01",
    note_type: "progress_note",
    service_code: "T2022",
    units: 2,
    authorization_id: "auth-jb-ccs-2024",
    date_of_service: "09/01/2024",
    case_manager_id: "cm-babar",
    program_id: "ccs-md-dda",
    billing_status: "paid",
    created_at: "09/02/2024 11:30",
    payment_amount: 58.0,
    payment_date: "09/18/2024",
    era_reference_number: "ERA-2024-0918-094",
    payer_name: "Maryland Medicaid",
  },
];

// ---------- Authorization utilization (Joseph + Travis examples) ----------

export const authorizationUtilizations: AuthorizationUtilization[] = [
  {
    individual_id: "joseph-brown",
    authorization_id: "auth-jb-ccs-2026",
    service_code: "T2022",
    units_authorized: 40,
    units_used: 0,
    remaining_balance: 40,
    used_unit_percentage: 0,
    expires_on: "06/30/2026",
    last_activity: "03/17/2026",
  },
  {
    individual_id: "travis-langston",
    authorization_id: "auth-tl-dayhab-2026",
    service_code: "T2021",
    units_authorized: 120,
    units_used: 102,
    remaining_balance: 18,
    used_unit_percentage: 85,
    expires_on: "05/31/2026",
    last_activity: "02/22/2026",
  },
];

// ---------- Helpers ----------

export function eventsForIndividual(id: string): BillingEvent[] {
  return billingEvents.filter((e) => e.individual_id === id);
}

export function summaryForIndividual(id: string): BillingSummary {
  const events = eventsForIndividual(id);
  const submitted = events.filter((e) =>
    ["submitted", "paid", "denied", "resubmission"].includes(e.billing_status),
  ).length;
  const paid = events.filter((e) => e.billing_status === "paid").length;
  const pending = events.filter((e) => e.billing_status === "pending").length;
  const denied = events.filter((e) => e.billing_status === "denied").length;
  const totalBilled = events.reduce(
    (s, e) => s + (e.units * 29 || 0), // mock $29/unit T2022 rate
    0,
  );
  const totalPaid = events.reduce((s, e) => s + (e.payment_amount ?? 0), 0);
  return { submitted, paid, pending, denied, totalBilled, totalPaid };
}

export function utilizationFor(
  individualId: string,
  authorizationId?: string,
): AuthorizationUtilization | undefined {
  return authorizationUtilizations.find(
    (u) =>
      u.individual_id === individualId &&
      (!authorizationId || u.authorization_id === authorizationId),
  );
}

export function utilizationTone(
  pct: number,
): "ok" | "info" | "warning" | "hardstop" {
  if (pct >= 100) return "hardstop";
  if (pct >= 85) return "warning";
  if (pct >= 75) return "info";
  return "ok";
}

// ---------- Denial alerts (Connection 4) ----------

export function denialAlerts(): DenialAlert[] {
  return billingEvents
    .filter((e) => e.billing_status === "denied")
    .map((e) => ({
      id: `denial-${e.id}`,
      individual_id: e.individual_id,
      individual_name:
        e.individual_id === "joseph-brown" ? "Brown, Joseph" : e.individual_id,
      service_code: e.service_code,
      date_of_service: e.date_of_service,
      denial_reason: e.denial_reason ?? "Unknown",
      denial_code: e.denial_code ?? "",
      estimated_impact: e.units * 29,
      note_id: e.note_id,
      note_type: e.note_type,
    }));
}

// ---------- Dashboard revenue KPI (Connection 9) ----------

export function revenueThisMonth() {
  const paid = billingEvents.filter((e) => e.billing_status === "paid");
  const total = paid.reduce((s, e) => s + (e.payment_amount ?? 0), 0);
  return {
    total,
    paidCount: paid.length,
    pendingCount: billingEvents.filter((e) => e.billing_status === "pending")
      .length,
    trendPct: 12,
    sparkline: [42, 55, 38, 67, 72, 58, 85],
  };
}

// ---------- Compliance Agent billing checks (Connection 7) ----------

export interface BillingComplianceCheck {
  id: string;
  type: "unsigned_billable_notes" | "unaddressed_denials";
  description: string;
  count: number;
  taskLabel: string;
  taskRoute: string;
}

export function billingComplianceChecks(): BillingComplianceCheck[] {
  const denied = billingEvents.filter(
    (e) => e.billing_status === "denied",
  ).length;
  return [
    {
      id: "bcc-unsigned",
      type: "unsigned_billable_notes",
      description:
        "3 billable notes have not been signed and submitted for billing. Unsigned notes cannot be billed.",
      count: 3,
      taskLabel: "Sign pending billable notes — 3 notes",
      taskRoute: "/people/joseph-brown/progress-note",
    },
    {
      id: "bcc-denials",
      type: "unaddressed_denials",
      description: `${denied} denied claim${
        denied === 1 ? "" : "s"
      } have not been addressed in 14+ days. Unresolved denials affect revenue.`,
      count: denied,
      taskLabel: `Address denied claims — ${denied} claim${
        denied === 1 ? "" : "s"
      }`,
      taskRoute: "/billing/claims",
    },
  ];
}
