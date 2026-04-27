// Incident Reporting data layer.
// Multi-stage incident lifecycle with strict compliance deadlines.

export type IncidentStatus = "Open" | "In Progress" | "Pending Review" | "Closed" | "Void";
export type IncidentClassification = "Critical" | "Significant" | "Minor" | "Unknown";
export type IncidentStageId = 1 | 2 | 3 | 4 | 5;
export type StageStatus = "Complete" | "Current" | "Pending" | "Overdue";

export interface NotificationRow {
  id: string;
  party: string; // "State Agency" | "Standing Committee" | "Guardian/Family" | "Supervisor" | "Other"
  contactMethod?: string;
  dateTime?: string; // MM/DD/YYYY HH:MM
  referenceNumber?: string;
  notes?: string;
  required?: boolean;
}

export interface ActionItem {
  id: string;
  action: string;
  responsibleParty?: string;
  dueDate?: string;
  status: "Pending" | "In Progress" | "Complete";
}

export interface IncidentRecord {
  id: string;
  personId: string;
  personName: string;
  incidentDate: string; // MM/DD/YYYY
  incidentTime: string; // HH:MM AM/PM
  programSite: string;
  location: string;
  incidentTypes: string[]; // e.g. ["Abuse — Financial"]
  classification: IncidentClassification;
  staffOnDuty: string[];
  personResponsible?: string;
  description: string;
  immediateActions: string;
  medicalRequired: boolean;
  medicalFacility?: string;
  hospitalized: boolean;
  hospitalName?: string;
  admissionDate?: string;
  dischargeDate?: string;
  // Reporting
  stateNotified: boolean;
  stateNotifiedAt?: string;
  stateRefNumber?: string;
  committeeNotified: boolean;
  committeeNotifiedAt?: string;
  guardianNotified: boolean;
  guardianNotifiedAt?: string;
  // Stage tracking
  currentStage: IncidentStageId;
  stageStatuses: Record<IncidentStageId, StageStatus>;
  // Stage 2
  notifications: NotificationRow[];
  // Stage 3
  investigationAssignedTo?: string;
  investigationStartDate?: string;
  investigationDueDate?: string;
  investigationFindings?: string;
  contributingFactors: string[];
  preventable?: "Yes" | "No" | "Unknown";
  correctiveActionRequired?: boolean;
  // Stage 4
  correctiveActionPlan?: string;
  actionItems: ActionItem[];
  followUpRequired?: boolean;
  followUpDate?: string;
  followUpAssignee?: string;
  reportedToExternalAgency?: boolean;
  externalAgencyName?: string;
  externalReportDate?: string;
  externalReferenceNumber?: string;
  // Stage 5
  finalDetermination?: "Substantiated" | "Unsubstantiated" | "Unable to determine" | "Withdrawn" | "Other";
  finalNarrative?: string;
  lessonsLearned?: string;
  reviewedBy?: string;
  reviewDate?: string;
  supervisorApprovedBy?: string;
  supervisorApprovalDate?: string;
  // Meta
  status: IncidentStatus;
  createdAt: string; // MM/DD/YYYY HH:MM AM/PM CDT
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  closedAt?: string;
  voided?: boolean;
}

export const INCIDENT_TYPES = [
  "Abuse — Physical",
  "Abuse — Sexual",
  "Abuse — Emotional",
  "Abuse — Financial",
  "Neglect — Active",
  "Neglect — Passive",
  "Exploitation",
  "Death",
  "Serious Injury",
  "Hospitalization",
  "Missing Person / Elopement",
  "Behavioral Incident",
  "Medication Error",
  "Environmental Hazard",
  "Rights Violation",
  "Other",
] as const;

export const CLASSIFICATIONS: IncidentClassification[] = ["Critical", "Significant", "Minor", "Unknown"];

export const PERSON_RESPONSIBLE = [
  "Unknown",
  "Staff",
  "Individual",
  "Other Individual",
  "Third Party",
  "Environmental",
] as const;

export const CONTRIBUTING_FACTORS = [
  "Staff error",
  "Policy not followed",
  "Environmental",
  "Individual behavior",
  "Unknown",
  "System failure",
  "Communication breakdown",
  "Other",
] as const;

// Incident types that lock to Critical classification.
const CRITICAL_TYPES = new Set([
  "Death",
  "Serious Injury",
  "Abuse — Physical",
  "Abuse — Sexual",
  "Abuse — Emotional",
  "Abuse — Financial",
]);

export function suggestedClassification(types: string[]): IncidentClassification {
  if (types.some((t) => CRITICAL_TYPES.has(t))) return "Critical";
  if (types.some((t) => t.startsWith("Behavioral") || t === "Medication Error" || t === "Hospitalization")) return "Significant";
  if (types.length === 0) return "Unknown";
  return "Minor";
}

export function classificationLocked(types: string[]): boolean {
  return types.some((t) => CRITICAL_TYPES.has(t));
}

// ----- Mock data -----

const josephIncident: IncidentRecord = {
  id: "99225",
  personId: "1",
  personName: "Brown, Joseph",
  incidentDate: "08/01/2023",
  incidentTime: "09:09 AM",
  programSite: "Dallas County",
  location: "Day program — common room",
  incidentTypes: ["Abuse — Financial"],
  classification: "Critical",
  staffOnDuty: ["Samara Johnson"],
  personResponsible: "Third Party",
  description:
    "Reports were received that Joseph's debit card had been used without authorization for purchases totaling $112 over the prior week. Joseph reported the charges to his case manager during a routine visit.",
  immediateActions:
    "Card frozen with the issuing bank. Bank fraud unit notified. Joseph reassured and incident initial report opened.",
  medicalRequired: false,
  hospitalized: false,
  stateNotified: true,
  stateNotifiedAt: "08/01/2023 10:45 AM",
  stateRefNumber: "AIR-2023-09812",
  committeeNotified: false,
  guardianNotified: true,
  guardianNotifiedAt: "08/01/2023 11:00 AM",
  currentStage: 2,
  stageStatuses: { 1: "Complete", 2: "Current", 3: "Pending", 4: "Pending", 5: "Pending" },
  notifications: [
    { id: "n1", party: "State Agency", contactMethod: "Online portal", dateTime: "08/01/2023 10:45 AM", referenceNumber: "AIR-2023-09812", required: true },
    { id: "n2", party: "Standing Committee", required: true },
    { id: "n3", party: "Guardian/Family", contactMethod: "Phone", dateTime: "08/01/2023 11:00 AM", required: true },
    { id: "n4", party: "Supervisor", contactMethod: "Phone", dateTime: "08/01/2023 09:30 AM", required: true },
  ],
  contributingFactors: [],
  actionItems: [],
  status: "Open",
  createdAt: "08/01/2023 11:10 AM CDT",
  lastUpdatedBy: "Samara Johnson",
  lastUpdatedAt: "08/01/2023 11:10 AM CDT",
};

const ashleyIncident: IncidentRecord = {
  id: "99226",
  personId: "7",
  personName: "Walker, Ashley",
  incidentDate: "04/15/2026",
  incidentTime: "02:30 PM",
  programSite: "Travis County",
  location: "Residential setting",
  incidentTypes: ["Behavioral Incident"],
  classification: "Significant",
  staffOnDuty: ["Babar Nawaz"],
  personResponsible: "Individual",
  description: "Ashley exhibited aggressive behavior during a transition activity. Staff implemented behavioral support plan techniques.",
  immediateActions: "De-escalation followed. No injuries reported. Behavior support team notified.",
  medicalRequired: false,
  hospitalized: false,
  stateNotified: false,
  committeeNotified: false,
  guardianNotified: true,
  guardianNotifiedAt: "04/15/2026 03:00 PM",
  currentStage: 3,
  stageStatuses: { 1: "Complete", 2: "Complete", 3: "Current", 4: "Pending", 5: "Pending" },
  notifications: [
    { id: "n1", party: "Guardian/Family", contactMethod: "Phone", dateTime: "04/15/2026 03:00 PM", required: true },
    { id: "n2", party: "Supervisor", contactMethod: "Email", dateTime: "04/15/2026 02:45 PM", required: true },
  ],
  investigationAssignedTo: "Babar Nawaz",
  investigationStartDate: "04/16/2026",
  investigationDueDate: "04/30/2026",
  contributingFactors: [],
  actionItems: [],
  status: "In Progress",
  createdAt: "04/15/2026 03:15 PM CDT",
  lastUpdatedBy: "Babar Nawaz",
  lastUpdatedAt: "04/16/2026 09:00 AM CDT",
};

const travisIncident: IncidentRecord = {
  id: "99227",
  personId: "2",
  personName: "Langston, Travis",
  incidentDate: "03/22/2026",
  incidentTime: "07:15 AM",
  programSite: "Dallas County",
  location: "Residential setting — kitchen",
  incidentTypes: ["Medication Error"],
  classification: "Significant",
  staffOnDuty: ["Cindy Haber"],
  personResponsible: "Staff",
  description: "Morning medication administered 90 minutes late due to staff oversight. No adverse effects observed.",
  immediateActions: "Medication administered as soon as error identified. Nurse consulted. Logged in MAR.",
  medicalRequired: false,
  hospitalized: false,
  stateNotified: true,
  stateNotifiedAt: "03/22/2026 10:00 AM",
  stateRefNumber: "AIR-2026-00488",
  committeeNotified: true,
  committeeNotifiedAt: "03/22/2026 11:00 AM",
  guardianNotified: true,
  guardianNotifiedAt: "03/22/2026 09:30 AM",
  currentStage: 5,
  stageStatuses: { 1: "Complete", 2: "Complete", 3: "Complete", 4: "Complete", 5: "Complete" },
  notifications: [
    { id: "n1", party: "State Agency", contactMethod: "Online portal", dateTime: "03/22/2026 10:00 AM", referenceNumber: "AIR-2026-00488", required: true },
    { id: "n2", party: "Standing Committee", contactMethod: "Email", dateTime: "03/22/2026 11:00 AM", required: true },
    { id: "n3", party: "Guardian/Family", contactMethod: "Phone", dateTime: "03/22/2026 09:30 AM", required: true },
  ],
  investigationAssignedTo: "Cindy Haber",
  investigationStartDate: "03/22/2026",
  investigationDueDate: "04/05/2026",
  investigationFindings: "Staff member missed scheduled medication administration window due to a shift handoff gap. No clinical impact observed.",
  contributingFactors: ["Staff error", "Communication breakdown"],
  preventable: "Yes",
  correctiveActionRequired: true,
  correctiveActionPlan: "Updated shift handoff checklist. Re-trained all residential staff on medication timing protocol.",
  actionItems: [
    { id: "a1", action: "Re-train staff on MAR protocol", responsibleParty: "Cindy Haber", dueDate: "04/01/2026", status: "Complete" },
    { id: "a2", action: "Update shift handoff checklist", responsibleParty: "Site Director", dueDate: "04/05/2026", status: "Complete" },
  ],
  finalDetermination: "Substantiated",
  finalNarrative: "Medication error confirmed as staff oversight. Corrective actions implemented and verified.",
  lessonsLearned: "Shift handoffs are a high-risk window for medication timing errors. New checklist reduces this risk.",
  reviewedBy: "Site Director",
  reviewDate: "04/08/2026",
  supervisorApprovedBy: "Site Director",
  supervisorApprovalDate: "04/08/2026",
  status: "Closed",
  createdAt: "03/22/2026 08:00 AM CDT",
  lastUpdatedBy: "Site Director",
  lastUpdatedAt: "04/08/2026 04:30 PM CDT",
  closedAt: "04/08/2026",
};

let incidents: IncidentRecord[] = [josephIncident, ashleyIncident, travisIncident];

export function getIncident(id: string): IncidentRecord | undefined {
  return incidents.find((i) => i.id === id);
}

export function getIncidentsForPerson(personId: string): IncidentRecord[] {
  return incidents.filter((i) => i.personId === personId);
}

export function getAllIncidents(): IncidentRecord[] {
  return incidents;
}

export function nextIncidentId(): string {
  const max = incidents.reduce((m, i) => Math.max(m, parseInt(i.id, 10) || 0), 99000);
  return String(max + 1);
}

export function createIncident(partial: Partial<IncidentRecord> & { personId: string; personName: string }): IncidentRecord {
  const now = new Date();
  const date = now.toLocaleDateString("en-US");
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  const types = partial.incidentTypes ?? [];
  const wf: IncidentRecord = {
    id: nextIncidentId(),
    personId: partial.personId,
    personName: partial.personName,
    incidentDate: partial.incidentDate ?? date,
    incidentTime: partial.incidentTime ?? time,
    programSite: partial.programSite ?? "—",
    location: partial.location ?? "",
    incidentTypes: types,
    classification: partial.classification ?? suggestedClassification(types),
    staffOnDuty: partial.staffOnDuty ?? [],
    personResponsible: partial.personResponsible,
    description: partial.description ?? "",
    immediateActions: partial.immediateActions ?? "",
    medicalRequired: !!partial.medicalRequired,
    hospitalized: !!partial.hospitalized,
    stateNotified: !!partial.stateNotified,
    committeeNotified: !!partial.committeeNotified,
    guardianNotified: !!partial.guardianNotified,
    currentStage: 2,
    stageStatuses: { 1: "Complete", 2: "Current", 3: "Pending", 4: "Pending", 5: "Pending" },
    notifications: [
      { id: "n1", party: "State Agency", required: true },
      { id: "n2", party: "Standing Committee", required: true },
      { id: "n3", party: "Guardian/Family", required: true },
      { id: "n4", party: "Supervisor", required: true },
    ],
    contributingFactors: [],
    actionItems: [],
    status: "Open",
    createdAt: `${date} ${time} CDT`,
    lastUpdatedBy: "Kathy Adams",
    lastUpdatedAt: `${date} ${time} CDT`,
  };
  incidents = [wf, ...incidents];
  return wf;
}

export function updateIncident(id: string, patch: Partial<IncidentRecord>) {
  const idx = incidents.findIndex((i) => i.id === id);
  if (idx === -1) return;
  incidents[idx] = { ...incidents[idx], ...patch, lastUpdatedAt: new Date().toLocaleString("en-US") + " CDT", lastUpdatedBy: "Kathy Adams" };
}

export interface IncidentSummary {
  totalOpen: number;
  step1Pending: number;
  overdue: number;
  closedThisMonth: number;
}

export function globalIncidentSummary(): IncidentSummary {
  const open = incidents.filter((i) => i.status !== "Closed" && i.status !== "Void");
  const step1Pending = open.filter((i) => i.currentStage === 1 || (i.currentStage === 2 && i.stageStatuses[2] === "Current")).length;
  // Mark anything older than 14 days from incidentDate as overdue when still open.
  const overdue = open.filter((i) => {
    const [m, d, y] = i.incidentDate.split("/").map(Number);
    if (!m) return false;
    const dt = new Date(y, m - 1, d);
    const days = (Date.now() - dt.getTime()) / 86400000;
    return days > 14;
  }).length;
  return {
    totalOpen: open.length,
    step1Pending,
    overdue,
    closedThisMonth: incidents.filter((i) => i.status === "Closed").length,
  };
}

export function typeBreakdown(records: IncidentRecord[]): Array<{ label: string; count: number }> {
  const map = new Map<string, number>();
  records.forEach((r) => r.incidentTypes.forEach((t) => map.set(t, (map.get(t) ?? 0) + 1)));
  return Array.from(map.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export function stageBreakdown(records: IncidentRecord[]): Array<{ stage: IncidentStageId; count: number }> {
  const counts: Record<IncidentStageId, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  records.forEach((r) => { counts[r.currentStage] += 1; });
  return ([1, 2, 3, 4, 5] as IncidentStageId[]).map((stage) => ({ stage, count: counts[stage] }));
}

export const STAGE_LABELS: Record<IncidentStageId, string> = {
  1: "Initial Report",
  2: "Notification Log",
  3: "Investigation",
  4: "Resolution",
  5: "Final Review",
};
