// Mock Progress Note data — structured to be replaceable by real API.

export type ProgressStatus = "Draft" | "Pending Signature" | "Signed" | "Void";
export type ContactType = "In-person" | "Phone" | "Virtual" | "Electronic" | "Collateral";
export type GoalProgressStatus = "No change" | "Progressing" | "Goal achieved" | "Goal discontinued" | "On hold";

export interface GoalProgressEntry {
  goalId: string;
  goalTitle: string;
  goalDescription?: string;
  progressNotes?: string;
  status: GoalProgressStatus;
  aiSuggested?: boolean;
  aiSource?: string;
}

export interface ProgressNote {
  id: string;
  personId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  activityType: string;
  contactType?: ContactType;
  isBillable: boolean;
  nonBillableReason?: string;
  serviceCode?: string;
  units?: number;
  authorizationId?: string;
  authorizationRemaining?: number;
  purposeOfActivity?: string;
  goalProgress?: GoalProgressEntry[];
  additionalObservations?: string;
  nextSteps?: string;
  status: ProgressStatus;
  voidReason?: string;
  signedBy?: string;
  signedOn?: string;
  updatedBy: string;
  updatedOn: string;
  aiPreFilled?: boolean;
  aiFields?: Partial<Record<keyof ProgressNote, string>>;
  relatedActivities?: string[];
}

const JOSEPH = "joseph-brown";

export const progressNotes: ProgressNote[] = [
  {
    id: "pn-0316",
    personId: JOSEPH,
    date: "03/16/2026",
    startTime: "10:00",
    endTime: "10:45",
    activityType: "Assessment Coordination",
    contactType: "Phone",
    isBillable: true,
    serviceCode: "T2022",
    units: 3,
    purposeOfActivity: "Coordinated assessment scheduling with provider.",
    status: "Signed",
    signedBy: "Babar Nawaz CM",
    signedOn: "03/16/2026",
    updatedBy: "Babar Nawaz CM",
    updatedOn: "03/16/2026",
  },
  {
    id: "pn-1010",
    personId: JOSEPH,
    date: "10/10/2025",
    startTime: "13:30",
    endTime: "14:15",
    activityType: "Application Assistance",
    contactType: "In-person",
    isBillable: true,
    serviceCode: "T2022",
    units: 3,
    purposeOfActivity: "Assisted with annual benefits application paperwork.",
    status: "Signed",
    signedBy: "Babar Nawaz CM",
    signedOn: "10/13/2025",
    updatedBy: "Babar Nawaz CM",
    updatedOn: "10/13/2025",
  },
  {
    id: "pn-1001",
    personId: JOSEPH,
    date: "10/01/2025",
    startTime: "09:00",
    endTime: "10:30",
    activityType: "Person Centered Plan / POS Development",
    contactType: "In-person",
    isBillable: true,
    serviceCode: "H2015",
    units: 6,
    purposeOfActivity: "Person-centered plan development meeting.",
    status: "Signed",
    signedBy: "CindyHaberCenter Demo",
    signedOn: "10/27/2025",
    updatedBy: "CindyHaberCenter Demo",
    updatedOn: "10/27/2025",
  },
  {
    id: "pn-0613",
    personId: JOSEPH,
    date: "06/13/2024",
    startTime: "14:00",
    endTime: "14:30",
    activityType: "Documentation",
    contactType: "Electronic",
    isBillable: false,
    nonBillableReason: "Internal documentation",
    purposeOfActivity: "Internal file documentation.",
    status: "Signed",
    signedBy: "Babar Nawaz CM",
    signedOn: "06/25/2024",
    updatedBy: "Babar Nawaz CM",
    updatedOn: "06/25/2024",
  },
  // Two pending signature notes for the unsigned alert
  {
    id: "pn-0420",
    personId: JOSEPH,
    date: "04/20/2026",
    startTime: "11:00",
    endTime: "11:30",
    activityType: "Service Coordination",
    contactType: "Phone",
    isBillable: true,
    serviceCode: "T2022",
    units: 2,
    purposeOfActivity: "Coordinated day program transportation schedule.",
    status: "Pending Signature",
    updatedBy: "Babar Nawaz CM",
    updatedOn: "04/20/2026",
  },
  {
    id: "pn-0422",
    personId: JOSEPH,
    date: "04/22/2026",
    startTime: "15:00",
    endTime: "15:20",
    activityType: "Advocacy",
    contactType: "Phone",
    isBillable: true,
    serviceCode: "T2022",
    units: 1,
    purposeOfActivity: "Advocated with provider regarding satisfaction concern.",
    status: "Pending Signature",
    updatedBy: "Babar Nawaz CM",
    updatedOn: "04/22/2026",
  },
];

export function getProgressNotesForPerson(personId: string): ProgressNote[] {
  return progressNotes.filter(n => n.personId === personId);
}

export function getProgressNote(id: string): ProgressNote | undefined {
  return progressNotes.find(n => n.id === id);
}

export function getUnsignedNotesForPerson(personId: string): ProgressNote[] {
  return progressNotes.filter(n => n.personId === personId && (n.status === "Draft" || n.status === "Pending Signature"));
}

export const ACTIVITY_TYPES = [
  "Assessment Coordination",
  "Application Assistance",
  "Person Centered Plan / POS Development",
  "Service Coordination",
  "Crisis Intervention",
  "Advocacy",
  "Documentation",
  "Team Meeting",
  "Training / Education",
  "Transportation Coordination",
  "Other",
] as const;

export const NON_BILLABLE_REASONS = [
  "Supervisor consultation",
  "Internal documentation",
  "Training",
  "Travel (non-billable)",
  "Administrative",
  "Other",
] as const;

// AI pre-filled draft for a new note based on the 04/27/2026 ambient session.
export function buildAIPreFilledProgressNote(personId: string): ProgressNote {
  return {
    id: "new",
    personId,
    date: "04/27/2026",
    startTime: "14:00",
    endTime: "14:47",
    activityType: "Service Coordination",
    contactType: "In-person",
    isBillable: true,
    serviceCode: "T2022",
    units: 3,
    authorizationId: "SA-2026-001",
    authorizationRemaining: 18,
    purposeOfActivity:
      "Quarterly check-in and service review with Joseph at his residence. Discussed satisfaction with current day program, employment interest, and behavioral changes reported by mother.",
    goalProgress: [
      {
        goalId: "g1",
        goalTitle: "Community Integration",
        goalDescription: "Joseph will participate in community activities aligned with his interests at least monthly.",
        progressNotes:
          "Attended 3 community events this quarter per discussion during visit. On track.",
        status: "Progressing",
        aiSuggested: true,
        aiSource: "Ambient session 04/27/2026",
      },
      {
        goalId: "g2",
        goalTitle: "Employment Exploration",
        goalDescription: "Joseph will explore part-time employment options aligned with his interests and abilities.",
        progressNotes:
          "Joseph expressed strong interest in part-time employment during visit. No concrete steps taken yet. Recommended adding employment support service to ISP.",
        status: "No change",
        aiSuggested: true,
        aiSource: "Ambient session 04/27/2026",
      },
    ],
    additionalObservations:
      "Mother reported behavioral changes at home. Recommend monitoring and follow-up with behavioral support team.",
    nextSteps:
      "Follow up with behavioral support team. Add employment support to ISP. Schedule next quarterly visit by 07/27/2026.",
    status: "Draft",
    updatedBy: "Babar Nawaz CM",
    updatedOn: "04/27/2026",
    aiPreFilled: true,
    aiFields: {
      date: "Ambient session 04/27/2026",
      startTime: "Ambient session 04/27/2026",
      endTime: "Ambient session 04/27/2026",
      activityType: "Ambient session 04/27/2026",
      contactType: "Ambient session 04/27/2026",
      serviceCode: "Activity type mapping",
      purposeOfActivity: "Ambient session 04/27/2026",
      additionalObservations: "Ambient session 04/27/2026",
      nextSteps: "Ambient session 04/27/2026",
    },
  };
}

// 6-month mock trends data for the Trends tab.
export interface TrendMonth {
  label: string;
  // count per goal
  goal1: number;
  goal2: number;
  // total notes
  total: number;
}

export const trendsMonths: TrendMonth[] = [
  { label: "Nov", goal1: 2, goal2: 1, total: 3 },
  { label: "Dec", goal1: 1, goal2: 1, total: 2 },
  { label: "Jan", goal1: 2, goal2: 0, total: 3 },
  { label: "Feb", goal1: 3, goal2: 0, total: 4 },
  { label: "Mar", goal1: 2, goal2: 0, total: 3 },
  { label: "Apr", goal1: 1, goal2: 0, total: 2 },
];

export interface ActivityBreakdown {
  label: string;
  count: number;
  color: string;
}

export const activityBreakdown: ActivityBreakdown[] = [
  { label: "Assessment Coordination", count: 8, color: "hsl(var(--icm-accent))" },
  { label: "Service Coordination", count: 5, color: "hsl(var(--icm-green))" },
  { label: "Application Assistance", count: 3, color: "hsl(var(--icm-amber))" },
  { label: "Documentation", count: 2, color: "hsl(var(--icm-text-faint))" },
  { label: "Other", count: 1, color: "hsl(var(--icm-red))" },
];
