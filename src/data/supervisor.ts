// Mock data for Supervisor dashboards. Combines static seeds with anything in localStorage.
export interface Coordinator {
  id: string;
  name: string;
  caseload: number;
  overdueContacts: number;
  pendingNotes: number;
  errors: number;
  compliancePct: number;
  productivityPct: number;
  capacityPct: number;
  highRiskCount: number;
}

export interface NoteVersion {
  versionNumber: number;
  narrative: string;
  savedAt: string;
  savedBy: string;
  reason?: string; // amendment reason
}

export interface SubmittedNote {
  id: string;
  personId: string;
  personName: string;
  coordinator: string;
  coordinatorId?: string; // Firebase UID for inbox notification
  serviceCode: string;
  units: number;
  submittedAt: string; // ISO
  agingHours: number;
  hasAttachments: boolean;
  hasPlanLink: boolean;
  authorizationOk: boolean;
  status: "Pending" | "Approved" | "Rejected" | "Returned" | "Approved with override" | "Amendment pending approval";
  narrative: string;
  startedAt: string;
  endedAt: string;
  // Rejection / return workflow
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  // Amendment workflow
  versionNumber?: number;
  versions?: NoteVersion[];
  amendmentReason?: string;
}

export interface PlanRenewal {
  personId: string; personName: string; coordinator: string; dueDate: string; daysUntil: number;
}

export interface ComplianceException {
  id: string;
  type: "Monthly contact missed" | "Plan review overdue" | "Assessment expiring" | "Note pending too long" | "Billing documentation incomplete" | "High-risk participant lacks follow-up";
  personId: string;
  personName: string;
  coordinator: string;
  daysOpen: number;
  severity: "Critical" | "High" | "Medium";
  status: "Open" | "Escalated" | "Reassigned" | "Resolved";
  detail: string;
  history?: { ts: string; action: string; by: string; note?: string }[];
}

export const COORDINATORS: Coordinator[] = [
  { id: "u1", name: "Babar Nawaz",      caseload: 38, overdueContacts: 2, pendingNotes: 4, errors: 1, compliancePct: 96, productivityPct: 91, capacityPct: 88, highRiskCount: 3 },
  { id: "u2", name: "Maria Chen",       caseload: 42, overdueContacts: 5, pendingNotes: 7, errors: 3, compliancePct: 84, productivityPct: 78, capacityPct: 102, highRiskCount: 6 },
  { id: "u3", name: "Priya Patel",      caseload: 29, overdueContacts: 0, pendingNotes: 2, errors: 0, compliancePct: 100, productivityPct: 96, capacityPct: 64, highRiskCount: 1 },
  { id: "u4", name: "Marcus Johnson",   caseload: 35, overdueContacts: 3, pendingNotes: 5, errors: 2, compliancePct: 89, productivityPct: 82, capacityPct: 86, highRiskCount: 4 },
  { id: "u5", name: "Sofia Alvarez",    caseload: 31, overdueContacts: 1, pendingNotes: 3, errors: 0, compliancePct: 94, productivityPct: 88, capacityPct: 76, highRiskCount: 2 },
];

export const SUBMITTED_NOTES_SEED: SubmittedNote[] = [
  { id: "sn-001", personId: "p1", personName: "Doe, Jane",        coordinator: "Maria Chen",     serviceCode: "T1017", units: 4, submittedAt: new Date(Date.now()-2*3600_000).toISOString(),  agingHours: 2,  hasAttachments: true,  hasPlanLink: true,  authorizationOk: true,  status: "Pending", narrative: "Met with Jane at home. Reviewed medication routine and community engagement goal progress. Jane reported attending two community events this week and is taking medications consistently.", startedAt: new Date(Date.now()-3*3600_000).toISOString(), endedAt: new Date(Date.now()-2*3600_000).toISOString() },
  { id: "sn-002", personId: "p2", personName: "Smith, Robert",    coordinator: "Babar Nawaz",    serviceCode: "T1016", units: 2, submittedAt: new Date(Date.now()-26*3600_000).toISOString(), agingHours: 26, hasAttachments: false, hasPlanLink: true,  authorizationOk: true,  status: "Pending", narrative: "Quarterly monitoring contact completed at day program. Robert demonstrated progress on independent living skills goal. Staff report no incidents.", startedAt: new Date(Date.now()-27*3600_000).toISOString(), endedAt: new Date(Date.now()-26*3600_000).toISOString() },
  { id: "sn-003", personId: "p3", personName: "Garcia, Elena",    coordinator: "Maria Chen",     serviceCode: "H0032", units: 6, submittedAt: new Date(Date.now()-50*3600_000).toISOString(), agingHours: 50, hasAttachments: true,  hasPlanLink: false, authorizationOk: false, status: "Pending", narrative: "Annual plan revision meeting. Updated goals based on new assessment findings. Authorization update pending from state.", startedAt: new Date(Date.now()-52*3600_000).toISOString(), endedAt: new Date(Date.now()-50*3600_000).toISOString() },
  { id: "sn-004", personId: "p4", personName: "Lee, Michael",     coordinator: "Marcus Johnson", serviceCode: "T1017", units: 3, submittedAt: new Date(Date.now()-5*3600_000).toISOString(),  agingHours: 5,  hasAttachments: true,  hasPlanLink: true,  authorizationOk: true,  status: "Pending", narrative: "Home visit. Reviewed safety plan after recent fall risk flag. Adjustments to environment recommended; OT referral discussed with guardian.", startedAt: new Date(Date.now()-6*3600_000).toISOString(), endedAt: new Date(Date.now()-5*3600_000).toISOString() },
  { id: "sn-005", personId: "p5", personName: "Khan, Aisha",      coordinator: "Sofia Alvarez",  serviceCode: "T1016", units: 2, submittedAt: new Date(Date.now()-12*3600_000).toISOString(), agingHours: 12, hasAttachments: false, hasPlanLink: true,  authorizationOk: true,  status: "Pending", narrative: "Telehealth check-in regarding employment goal. Aisha reports continued progress at her supported employment placement.", startedAt: new Date(Date.now()-13*3600_000).toISOString(), endedAt: new Date(Date.now()-12*3600_000).toISOString() },
];

export const UPCOMING_RENEWALS: PlanRenewal[] = [
  { personId: "p2", personName: "Smith, Robert",  coordinator: "Babar Nawaz",    dueDate: "2026-06-10", daysUntil: 18 },
  { personId: "p6", personName: "Nguyen, Linh",   coordinator: "Maria Chen",     dueDate: "2026-05-29", daysUntil: 6 },
  { personId: "p4", personName: "Lee, Michael",   coordinator: "Marcus Johnson", dueDate: "2026-06-02", daysUntil: 10 },
  { personId: "p7", personName: "Brown, Andre",   coordinator: "Maria Chen",     dueDate: "2026-05-24", daysUntil: 1 },
  { personId: "p3", personName: "Garcia, Elena",  coordinator: "Maria Chen",     dueDate: "2026-06-15", daysUntil: 23 },
];

export const COMPLIANCE_EXCEPTIONS_SEED: ComplianceException[] = [
  { id: "ce-1", type: "Monthly contact missed",            personId: "p3", personName: "Garcia, Elena",   coordinator: "Maria Chen",     daysOpen: 8,  severity: "Critical", status: "Open",       detail: "No monthly contact recorded for May. Last contact 04/18/2026.", history: [{ ts: new Date(Date.now()-8*86400_000).toISOString(), action: "Detected by Compliance Agent", by: "System" }] },
  { id: "ce-2", type: "Plan review overdue",               personId: "p7", personName: "Brown, Andre",    coordinator: "Maria Chen",     daysOpen: 12, severity: "High",     status: "Open",       detail: "Annual plan review due 05/09/2026.", history: [{ ts: new Date(Date.now()-12*86400_000).toISOString(), action: "Detected by Compliance Agent", by: "System" }] },
  { id: "ce-3", type: "Assessment expiring",               personId: "p4", personName: "Lee, Michael",    coordinator: "Marcus Johnson", daysOpen: 2,  severity: "Medium",   status: "Open",       detail: "Risk assessment expires 06/01/2026.", history: [{ ts: new Date(Date.now()-2*86400_000).toISOString(), action: "Detected by Compliance Agent", by: "System" }] },
  { id: "ce-4", type: "Note pending too long",             personId: "p3", personName: "Garcia, Elena",   coordinator: "Maria Chen",     daysOpen: 3,  severity: "High",     status: "Escalated",  detail: "Note sn-003 awaiting supervisor approval > 48h.", history: [{ ts: new Date(Date.now()-3*86400_000).toISOString(), action: "Detected by Compliance Agent", by: "System" }, { ts: new Date(Date.now()-86400_000).toISOString(), action: "Auto-escalated to senior supervisor", by: "System" }] },
  { id: "ce-5", type: "Billing documentation incomplete",  personId: "p3", personName: "Garcia, Elena",   coordinator: "Maria Chen",     daysOpen: 2,  severity: "High",     status: "Open",       detail: "Authorization not linked on sn-003; 6 units at risk.", history: [{ ts: new Date(Date.now()-2*86400_000).toISOString(), action: "Detected by Compliance Agent", by: "System" }] },
  { id: "ce-6", type: "High-risk participant lacks follow-up", personId: "p4", personName: "Lee, Michael", coordinator: "Marcus Johnson", daysOpen: 5,  severity: "Critical", status: "Open",       detail: "Fall-risk flag raised 05/16/2026; no follow-up visit scheduled.", history: [{ ts: new Date(Date.now()-5*86400_000).toISOString(), action: "Detected by Compliance Agent", by: "System" }] },
];

const NOTES_KEY = "icm.supervisor.notes";
const EXC_KEY = "icm.supervisor.exceptions";

export function loadSubmittedNotes(): SubmittedNote[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(NOTES_KEY, JSON.stringify(SUBMITTED_NOTES_SEED));
  return [...SUBMITTED_NOTES_SEED];
}
export function saveSubmittedNotes(notes: SubmittedNote[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}
export function loadComplianceExceptions(): ComplianceException[] {
  try {
    const raw = localStorage.getItem(EXC_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(EXC_KEY, JSON.stringify(COMPLIANCE_EXCEPTIONS_SEED));
  return [...COMPLIANCE_EXCEPTIONS_SEED];
}
export function saveComplianceExceptions(list: ComplianceException[]) {
  localStorage.setItem(EXC_KEY, JSON.stringify(list));
}
export function writeAudit(entry: any) {
  try {
    const a = JSON.parse(localStorage.getItem("icm.audit") || "[]");
    a.push(entry);
    localStorage.setItem("icm.audit", JSON.stringify(a));
  } catch {}
}
