// Referrals module data layer.
// Mock provider directory + per-individual referrals + helpers.
// Mutable arrays so the UI can persist within a session.

export type ReferralType =
  | "Employment & Vocational"
  | "Housing & Independent Living"
  | "Healthcare — Primary Care"
  | "Healthcare — Specialist"
  | "Healthcare — Dental"
  | "Healthcare — Vision"
  | "Healthcare — Mental Health"
  | "Healthcare — Substance Use"
  | "Behavioral Support"
  | "Transportation"
  | "Benefits Assistance"
  | "Educational & Training"
  | "Social & Recreational"
  | "Legal Aid"
  | "Financial Counseling"
  | "Crisis Services"
  | "Respite Care"
  | "Family Support"
  | "Technology & Assistive Devices"
  | "Other";

export const REFERRAL_TYPES: ReferralType[] = [
  "Employment & Vocational",
  "Housing & Independent Living",
  "Healthcare — Primary Care",
  "Healthcare — Specialist",
  "Healthcare — Dental",
  "Healthcare — Vision",
  "Healthcare — Mental Health",
  "Healthcare — Substance Use",
  "Behavioral Support",
  "Transportation",
  "Benefits Assistance",
  "Educational & Training",
  "Social & Recreational",
  "Legal Aid",
  "Financial Counseling",
  "Crisis Services",
  "Respite Care",
  "Family Support",
  "Technology & Assistive Devices",
  "Other",
];

export type ReferralStatus =
  | "Draft"
  | "Submitted"
  | "Pending Response"
  | "Provider Contacted"
  | "Accepted"
  | "Connected"
  | "On Hold"
  | "Closed — Successful"
  | "Closed — Unsuccessful"
  | "Duplicate";

export const REFERRAL_STATUSES: ReferralStatus[] = [
  "Draft",
  "Submitted",
  "Pending Response",
  "Provider Contacted",
  "Accepted",
  "Connected",
  "On Hold",
  "Closed — Successful",
  "Closed — Unsuccessful",
  "Duplicate",
];

export type Priority = "Routine" | "Urgent" | "Critical";

export type SourceOfNeed =
  | "Individual's request"
  | "Guardian / family request"
  | "Case manager recommendation"
  | "Assessment finding"
  | "ISP / Care Plan goal"
  | "Monitoring form finding"
  | "Incident follow-up"
  | "Compliance requirement"
  | "Other";

export interface Provider {
  id: string;
  name: string;
  type: ReferralType;
  contactPerson?: string;
  phone: string;
  email?: string;
  website?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  acceptsMedicaid: boolean;
  acceptingNewClients: boolean;
  specialties?: string[];
  internalNotes?: string;
  rating?: number; // 1-5
  referralCount?: number;
  lastUpdated: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  type:
    | "created"
    | "submitted"
    | "responded"
    | "accepted"
    | "started"
    | "follow-up"
    | "status-update"
    | "declined"
    | "unavailable"
    | "closed";
  title: string;
  notes?: string;
  by: string;
}

export interface Referral {
  id: string;
  personId: string;
  date: string;
  type: ReferralType;
  priority: Priority;
  reason: string;
  sourceOfNeed: SourceOfNeed;
  linkedGoalId?: string;
  linkedGoalLabel?: string;
  urgencyDate?: string;
  // Provider
  providerId?: string;
  providerName: string;
  providerPhone?: string;
  providerAddress?: string;
  providerEmail?: string;
  acceptsMedicaid?: boolean;
  // Contact
  referralMethod?: string;
  contactDate?: string;
  contactPerson?: string;
  referenceNumber?: string;
  // Information shared
  infoShared: string[];
  consentDocumented: boolean;
  consentDate?: string;
  consentMethod?: "Verbal" | "Written";
  // Follow-up
  expectedTimeframe?: string;
  followUpDate?: string;
  assignedTo: string;
  notes?: string;
  // Status
  status: ReferralStatus;
  daysOpen: number;
  lastActivity: string;
  closeReason?: string;
  outcomeNotes?: string;
  serviceStartDate?: string;
  // AI
  aiPrefilled?: boolean;
  // Timeline
  timeline: TimelineEvent[];
}

// ---------- Provider directory ----------

export const providers: Provider[] = [
  {
    id: "P-001",
    name: "Carroll County Employment Services",
    type: "Employment & Vocational",
    contactPerson: "Maria Lopez, Intake Coordinator",
    phone: "(410) 555-0142",
    email: "intake@carrollemployment.org",
    website: "carrollemployment.org",
    address: "215 N Center St",
    city: "Westminster",
    state: "MD",
    zip: "21157",
    county: "Carroll",
    acceptsMedicaid: true,
    acceptingNewClients: true,
    specialties: ["Job coaching", "Customized employment", "Discovery"],
    rating: 4.8,
    referralCount: 8,
    lastUpdated: "03/12/2026",
  },
  {
    id: "P-002",
    name: "BridgeWorks Vocational Training",
    type: "Employment & Vocational",
    contactPerson: "James Patel",
    phone: "(410) 555-0188",
    email: "referrals@bridgeworks.org",
    address: "44 Liberty Rd",
    city: "Sykesville",
    state: "MD",
    zip: "21784",
    county: "Carroll",
    acceptsMedicaid: true,
    acceptingNewClients: true,
    specialties: ["Vocational training", "Workplace readiness"],
    rating: 4.4,
    referralCount: 3,
    lastUpdated: "02/28/2026",
  },
  {
    id: "P-003",
    name: "Mid-Maryland SE Partners",
    type: "Employment & Vocational",
    contactPerson: "Dana Whitfield",
    phone: "(443) 555-0220",
    email: "info@mmsepartners.org",
    address: "100 Industrial Park Dr",
    city: "Eldersburg",
    state: "MD",
    zip: "21784",
    county: "Carroll",
    acceptsMedicaid: true,
    acceptingNewClients: false,
    specialties: ["Supported employment", "Group employment"],
    rating: 4.1,
    referralCount: 2,
    lastUpdated: "01/15/2026",
  },
  {
    id: "P-004",
    name: "Carroll Transit System",
    type: "Transportation",
    phone: "(410) 555-0301",
    email: "rides@carrolltransit.gov",
    address: "10 Distillery Dr",
    city: "Westminster",
    state: "MD",
    zip: "21157",
    county: "Carroll",
    acceptsMedicaid: true,
    acceptingNewClients: true,
    specialties: ["Medical transport", "Demand-response paratransit"],
    rating: 4.0,
    referralCount: 6,
    lastUpdated: "03/01/2026",
  },
  {
    id: "P-005",
    name: "Way Station Behavioral Health",
    type: "Healthcare — Mental Health",
    phone: "(301) 555-0411",
    address: "230 W Patrick St",
    city: "Frederick",
    state: "MD",
    zip: "21701",
    county: "Frederick",
    acceptsMedicaid: true,
    acceptingNewClients: true,
    specialties: ["Outpatient therapy", "Psychiatric services"],
    rating: 4.6,
    referralCount: 5,
    lastUpdated: "02/12/2026",
  },
  {
    id: "P-006",
    name: "Carroll County SSA Office",
    type: "Benefits Assistance",
    phone: "(800) 555-0772",
    address: "11 Aileron Ct",
    city: "Westminster",
    state: "MD",
    zip: "21157",
    county: "Carroll",
    acceptsMedicaid: true,
    acceptingNewClients: true,
    specialties: ["SSI / SSDI applications", "Benefits redetermination"],
    rating: 3.9,
    referralCount: 4,
    lastUpdated: "12/01/2025",
  },
];

export function getProvider(id: string) {
  return providers.find((p) => p.id === id);
}

export function suggestProviders(type: ReferralType, county = "Carroll"): Provider[] {
  return providers
    .filter((p) => p.type === type)
    .sort((a, b) => {
      const aLocal = a.county === county ? 0 : 1;
      const bLocal = b.county === county ? 0 : 1;
      if (aLocal !== bLocal) return aLocal - bLocal;
      const aOpen = a.acceptingNewClients ? 0 : 1;
      const bOpen = b.acceptingNewClients ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;
      return (b.rating ?? 0) - (a.rating ?? 0);
    })
    .slice(0, 3);
}

// ---------- Referrals (per person) ----------

export const referrals: Referral[] = [
  {
    id: "R-001",
    personId: "1", // Joseph Brown
    date: "04/27/2026",
    type: "Employment & Vocational",
    priority: "Routine",
    reason:
      "Joseph expressed interest in part-time employment during the 04/27/2026 ambient session. He has prior warehouse experience and prefers structured, predictable tasks. Looking for supported employment to build skills and earn income.",
    sourceOfNeed: "Individual's request",
    linkedGoalId: "g-2",
    linkedGoalLabel: "Goal 2 — Employment Exploration",
    urgencyDate: "06/01/2026",
    providerId: "P-001",
    providerName: "Carroll County Employment Services",
    providerPhone: "(410) 555-0142",
    providerAddress: "215 N Center St, Westminster, MD 21157",
    providerEmail: "intake@carrollemployment.org",
    acceptsMedicaid: true,
    referralMethod: "Online portal",
    contactDate: "04/27/2026",
    contactPerson: "Maria Lopez, Intake Coordinator",
    referenceNumber: "CCES-2026-1188",
    infoShared: [
      "Name and contact information",
      "Date of birth",
      "Medicaid / insurance information",
      "Assessment summary",
    ],
    consentDocumented: true,
    consentDate: "04/27/2026",
    consentMethod: "Verbal",
    expectedTimeframe: "1 week",
    followUpDate: "05/04/2026",
    assignedTo: "Kathy Adams",
    notes:
      "Provider confirmed receipt of intake. Awaiting eligibility review and orientation scheduling.",
    status: "Pending Response",
    daysOpen: 0,
    lastActivity: "04/27/2026",
    aiPrefilled: true,
    timeline: [
      {
        id: "t1",
        date: "04/27/2026 09:14",
        type: "created",
        title: "Referral created from ambient session",
        notes: "AI detected employment interest with 91% confidence and pre-filled the referral.",
        by: "Kathy Adams (AI-assisted)",
      },
      {
        id: "t2",
        date: "04/27/2026 09:32",
        type: "submitted",
        title: "Submitted to Carroll County Employment Services",
        notes: "Submitted via online portal. Reference: CCES-2026-1188.",
        by: "Kathy Adams",
      },
    ],
  },
  {
    id: "R-002",
    personId: "1",
    date: "08/14/2023",
    type: "Benefits Assistance",
    priority: "Urgent",
    reason: "Initial SSI enrollment after 18th birthday. Coordinate with SSA and DDA.",
    sourceOfNeed: "Case manager recommendation",
    providerId: "P-006",
    providerName: "Carroll County SSA Office",
    providerPhone: "(800) 555-0772",
    providerAddress: "11 Aileron Ct, Westminster, MD 21157",
    acceptsMedicaid: true,
    referralMethod: "In person",
    contactDate: "08/14/2023",
    infoShared: [
      "Name and contact information",
      "Date of birth",
      "Medicaid / insurance information",
      "Diagnosis",
    ],
    consentDocumented: true,
    consentDate: "08/12/2023",
    consentMethod: "Written",
    expectedTimeframe: "30 days",
    followUpDate: "09/13/2023",
    assignedTo: "Kathy Adams",
    status: "Closed — Successful",
    daysOpen: 0,
    lastActivity: "10/02/2023",
    serviceStartDate: "10/01/2023",
    outcomeNotes:
      "SSI enrollment approved. Joseph receives monthly payment and continuous Medicaid eligibility maintained.",
    timeline: [
      { id: "t1", date: "08/14/2023", type: "created", title: "Referral created", by: "Kathy Adams" },
      { id: "t2", date: "08/14/2023", type: "submitted", title: "Submitted to SSA", by: "Kathy Adams" },
      { id: "t3", date: "09/05/2023", type: "responded", title: "Provider responded — under review", by: "SSA Office" },
      { id: "t4", date: "10/01/2023", type: "started", title: "Service started — SSI active", by: "SSA Office" },
      {
        id: "t5",
        date: "10/02/2023",
        type: "closed",
        title: "Closed — Successful",
        notes: "SSI enrollment approved. Continuous Medicaid maintained.",
        by: "Kathy Adams",
      },
    ],
  },
  {
    id: "R-003",
    personId: "1",
    date: "01/18/2024",
    type: "Healthcare — Mental Health",
    priority: "Routine",
    reason: "Counseling support during family transition.",
    sourceOfNeed: "Guardian / family request",
    providerId: "P-005",
    providerName: "Way Station Behavioral Health",
    providerPhone: "(301) 555-0411",
    providerAddress: "230 W Patrick St, Frederick, MD 21701",
    acceptsMedicaid: true,
    referralMethod: "Phone call",
    contactDate: "01/18/2024",
    infoShared: ["Name and contact information", "Diagnosis", "Care Plan / ISP summary"],
    consentDocumented: true,
    consentDate: "01/15/2024",
    consentMethod: "Written",
    expectedTimeframe: "2 weeks",
    followUpDate: "02/01/2024",
    assignedTo: "Kathy Adams",
    status: "Closed — Successful",
    daysOpen: 0,
    lastActivity: "02/14/2024",
    serviceStartDate: "02/05/2024",
    outcomeNotes: "Joseph attended 6 sessions and reported reduced anxiety. Discharged with self-management plan.",
    timeline: [
      { id: "t1", date: "01/18/2024", type: "created", title: "Referral created", by: "Kathy Adams" },
      { id: "t2", date: "01/18/2024", type: "submitted", title: "Submitted to Way Station", by: "Kathy Adams" },
      { id: "t3", date: "01/29/2024", type: "responded", title: "Intake scheduled", by: "Way Station" },
      { id: "t4", date: "02/05/2024", type: "started", title: "Service started", by: "Way Station" },
      { id: "t5", date: "02/14/2024", type: "closed", title: "Closed — Successful", by: "Kathy Adams" },
    ],
  },
];

export function getReferralsForPerson(personId: string) {
  const existing = referrals.filter((r) => r.personId === personId);
  if (existing.length > 0) return existing;
  return generateReferralsFor(personId);
}

// ---- Synthetic fallback so every individual has referral history ----
function rh(seed: string, n: number): number {
  let x = 0;
  for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;
  return x % n;
}
function generateReferralsFor(personId: string): Referral[] {
  const cm = ["Kathy Adams", "Babar Nawaz CM", "Jennie Thollander"][rh(personId, 3)];
  const provider = providers[rh(personId + "p", providers.length)];
  const types: ReferralType[] = ["Employment & Vocational", "Healthcare — Primary Care", "Behavioral Support", "Transportation", "Benefits Assistance"];
  const t1 = types[rh(personId + "t1", types.length)];
  const t2 = types[rh(personId + "t2", types.length)];
  return [
    {
      id: `R-gen-${personId}-1`,
      personId, date: "03/15/2026", type: t1, priority: "Routine",
      reason: `Routine ${t1.toLowerCase()} referral to support active ISP goals.`,
      sourceOfNeed: "Case manager recommendation",
      providerId: provider.id, providerName: provider.name, providerPhone: provider.phone, providerAddress: provider.address,
      acceptsMedicaid: provider.acceptsMedicaid,
      referralMethod: "Online portal", contactDate: "03/15/2026",
      infoShared: ["Name and contact information", "Diagnosis", "Medicaid / insurance information"],
      consentDocumented: true, consentDate: "03/14/2026", consentMethod: "Written",
      expectedTimeframe: "2 weeks", followUpDate: "03/29/2026", assignedTo: cm,
      status: "Pending Response", daysOpen: 30, lastActivity: "03/15/2026",
      timeline: [
        { id: "t1", date: "03/15/2026", type: "created", title: "Referral created", by: cm },
        { id: "t2", date: "03/15/2026", type: "submitted", title: `Submitted to ${provider.name}`, by: cm },
      ],
    },
    {
      id: `R-gen-${personId}-2`,
      personId, date: "11/02/2025", type: t2, priority: "Routine",
      reason: `Closed — successfully connected to provider.`,
      sourceOfNeed: "Individual's request",
      providerId: provider.id, providerName: provider.name, providerPhone: provider.phone, providerAddress: provider.address,
      acceptsMedicaid: provider.acceptsMedicaid,
      referralMethod: "Phone call", contactDate: "11/02/2025",
      infoShared: ["Name and contact information"],
      consentDocumented: true, consentDate: "11/01/2025", consentMethod: "Verbal",
      expectedTimeframe: "1 week", followUpDate: "11/09/2025", assignedTo: cm,
      status: "Closed — Successful", daysOpen: 0, lastActivity: "11/20/2025",
      serviceStartDate: "11/15/2025",
      outcomeNotes: "Provider connection established. Service ongoing.",
      timeline: [
        { id: "t1", date: "11/02/2025", type: "created", title: "Referral created", by: cm },
        { id: "t2", date: "11/15/2025", type: "started", title: "Service started", by: provider.name },
        { id: "t3", date: "11/20/2025", type: "closed", title: "Closed — Successful", by: cm },
      ],
    },
  ];
}

export function getReferral(id: string) {
  return referrals.find((r) => r.id === id);
}

export function addReferral(r: Referral) {
  referrals.unshift(r);
}

export function updateReferralStatus(
  id: string,
  status: ReferralStatus,
  event: TimelineEvent,
  extras: Partial<Referral> = {},
) {
  const ref = referrals.find((r) => r.id === id);
  if (!ref) return;
  ref.status = status;
  ref.lastActivity = event.date.split(" ")[0];
  ref.timeline = [...ref.timeline, event];
  Object.assign(ref, extras);
}

// ---------- Summary helpers ----------

export interface ReferralSummary {
  total: number;
  pending: number;
  connected: number;
  unsuccessful: number;
  stalled: number;
}

export function summarize(items: Referral[]): ReferralSummary {
  return {
    total: items.length,
    pending: items.filter((r) =>
      ["Submitted", "Pending Response", "Provider Contacted", "Accepted"].includes(r.status),
    ).length,
    connected: items.filter((r) =>
      ["Connected", "Closed — Successful"].includes(r.status),
    ).length,
    unsuccessful: items.filter((r) => r.status === "Closed — Unsuccessful").length,
    stalled: items.filter((r) => r.daysOpen >= 14 && !r.status.startsWith("Closed")).length,
  };
}

export function daysOpenTone(days: number): "neutral" | "amber" | "red" {
  if (days >= 30) return "red";
  if (days >= 14) return "amber";
  return "neutral";
}

export function statusTone(status: ReferralStatus): "neutral" | "blue" | "amber" | "green" | "red" {
  if (status === "Connected" || status === "Closed — Successful") return "green";
  if (status === "Closed — Unsuccessful") return "red";
  if (status === "Pending Response") return "amber";
  if (status === "Submitted" || status === "Provider Contacted" || status === "Accepted") return "blue";
  return "neutral";
}
