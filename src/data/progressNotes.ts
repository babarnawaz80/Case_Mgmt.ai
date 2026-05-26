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

  // ─── Lisa Anderson (personId "46") — 8 months of notes Oct 2024–May 2025 ──
  {
    id: "pn-la-1002",
    personId: "46",
    date: "10/02/2024",
    startTime: "10:00",
    endTime: "11:00",
    activityType: "Assessment Coordination",
    contactType: "In-person",
    isBillable: true,
    serviceCode: "T2022",
    units: 4,
    purposeOfActivity: "Initial intake assessment completed with Lisa and her mother at agency office. Reviewed diagnostic history (Mild Intellectual Disability, Anxiety Disorder) and prior services. Collected emergency contacts, insurance, and consent forms.",
    goalProgress: [
      {
        goalId: "la-g1",
        goalTitle: "Independent Living Skills",
        progressNotes: "Baseline established. Lisa currently requires moderate support with meal prep and budgeting.",
        status: "No change",
      },
    ],
    additionalObservations: "Lisa was engaged and cooperative throughout intake. Mother expressed concern about Lisa's anxiety in new environments. Recommended gradual community integration approach.",
    nextSteps: "Schedule follow-up home visit within 30 days. Connect with behavioral support team.",
    status: "Signed",
    signedBy: "Kathy Martinez CM",
    signedOn: "10/05/2024",
    updatedBy: "Kathy Martinez CM",
    updatedOn: "10/05/2024",
  },
  {
    id: "pn-la-1028",
    personId: "46",
    date: "10/28/2024",
    startTime: "14:00",
    endTime: "14:45",
    activityType: "Service Coordination",
    contactType: "In-person",
    isBillable: true,
    serviceCode: "T2022",
    units: 3,
    purposeOfActivity: "Home visit to assess Lisa's living environment and identify support needs. Reviewed current daily schedule with Lisa and her mother.",
    goalProgress: [
      {
        goalId: "la-g1",
        goalTitle: "Independent Living Skills",
        progressNotes: "Lisa demonstrated ability to prepare simple meals with verbal prompting. She prefers a written schedule posted in the kitchen.",
        status: "Progressing",
      },
      {
        goalId: "la-g2",
        goalTitle: "Community Integration",
        progressNotes: "Lisa attends church with family weekly. No other community activities at this time. Plan to explore day program options.",
        status: "No change",
      },
    ],
    additionalObservations: "Home environment clean and safe. Lisa shared she enjoys art and music. Mother reports mood has been stable with current anxiety medication.",
    nextSteps: "Research day program options in Carroll County. Follow up with medication prescriber regarding current anxiety management.",
    status: "Signed",
    signedBy: "Kathy Martinez CM",
    signedOn: "10/30/2024",
    updatedBy: "Kathy Martinez CM",
    updatedOn: "10/30/2024",
  },
  {
    id: "pn-la-1119",
    personId: "46",
    date: "11/19/2024",
    startTime: "09:30",
    endTime: "10:15",
    activityType: "Team Meeting",
    contactType: "Virtual",
    isBillable: true,
    serviceCode: "T2022",
    units: 3,
    purposeOfActivity: "Person-centered team meeting to review ISP goals, service authorizations, and introduce day program coordinator. Lisa and mother attended via video call.",
    goalProgress: [
      {
        goalId: "la-g1",
        goalTitle: "Independent Living Skills",
        progressNotes: "Lisa reported she has been making breakfast independently 4–5 days per week. Good progress.",
        status: "Progressing",
      },
      {
        goalId: "la-g2",
        goalTitle: "Community Integration",
        progressNotes: "Day program referral submitted. Expecting enrollment by January 2025.",
        status: "Progressing",
      },
    ],
    additionalObservations: "Lisa was vocal and assertive during the meeting — expressed interest in art classes. Day program coordinator confirmed space available starting Jan 6, 2025.",
    nextSteps: "Finalize day program enrollment paperwork. Add art class goal to ISP at next review. Schedule December check-in.",
    status: "Signed",
    signedBy: "Kathy Martinez CM",
    signedOn: "11/20/2024",
    updatedBy: "Kathy Martinez CM",
    updatedOn: "11/20/2024",
  },
  {
    id: "pn-la-1210",
    personId: "46",
    date: "12/10/2024",
    startTime: "13:00",
    endTime: "13:40",
    activityType: "Service Coordination",
    contactType: "Phone",
    isBillable: true,
    serviceCode: "T2022",
    units: 2,
    purposeOfActivity: "Phone check-in with Lisa and mother. Reviewed holiday plans, medication adherence, and upcoming day program start. Answered questions about transportation coverage.",
    goalProgress: [
      {
        goalId: "la-g1",
        goalTitle: "Independent Living Skills",
        progressNotes: "Mother reports Lisa has been managing her weekly budget for spending money with minimal prompting. Great improvement.",
        status: "Progressing",
      },
    ],
    additionalObservations: "Lisa is excited about the day program starting in January. No health concerns reported. Family plans to travel for the holidays — confirmed emergency contacts will be local.",
    nextSteps: "Confirm day program transportation on January 3rd. Schedule home visit for late January.",
    status: "Signed",
    signedBy: "Kathy Martinez CM",
    signedOn: "12/11/2024",
    updatedBy: "Kathy Martinez CM",
    updatedOn: "12/11/2024",
  },
  {
    id: "pn-la-0114",
    personId: "46",
    date: "01/14/2025",
    startTime: "10:30",
    endTime: "11:30",
    activityType: "Person Centered Plan / POS Development",
    contactType: "In-person",
    isBillable: true,
    serviceCode: "H2015",
    units: 4,
    purposeOfActivity: "Quarterly ISP review visit at Lisa's home. Reviewed goal progress, day program satisfaction (started Jan 6), and added art class goal. Updated service plan and collected signatures.",
    goalProgress: [
      {
        goalId: "la-g1",
        goalTitle: "Independent Living Skills",
        progressNotes: "Lisa now independently prepares 3 meals per week and manages her personal budget with a written checklist. Advancing to next benchmark.",
        status: "Progressing",
      },
      {
        goalId: "la-g2",
        goalTitle: "Community Integration",
        progressNotes: "Day program attendance consistent — attended all 6 scheduled sessions so far. Enjoys cooking and craft activities.",
        status: "Progressing",
      },
      {
        goalId: "la-g3",
        goalTitle: "Art & Creative Expression",
        progressNotes: "New goal added per Lisa's self-advocacy: enroll in community art class by March 2025.",
        status: "No change",
        aiSuggested: false,
      },
    ],
    additionalObservations: "Lisa's mood noticeably more positive since day program started. Mother reports fewer anxiety episodes at home. PCP confirmed medication dosage appropriate at last appointment.",
    nextSteps: "Research community art class options. Update ISP to include art goal. Schedule February phone check-in.",
    status: "Signed",
    signedBy: "Kathy Martinez CM",
    signedOn: "01/16/2025",
    updatedBy: "Kathy Martinez CM",
    updatedOn: "01/16/2025",
  },
  {
    id: "pn-la-0211",
    personId: "46",
    date: "02/11/2025",
    startTime: "14:00",
    endTime: "14:30",
    activityType: "Service Coordination",
    contactType: "Phone",
    isBillable: true,
    serviceCode: "T2022",
    units: 2,
    purposeOfActivity: "Monthly phone check-in. Reviewed day program satisfaction, art class enrollment status, and any health or behavioral changes.",
    goalProgress: [
      {
        goalId: "la-g2",
        goalTitle: "Community Integration",
        progressNotes: "No absences from day program in January. Staff report Lisa is a positive presence in the group.",
        status: "Progressing",
      },
      {
        goalId: "la-g3",
        goalTitle: "Art & Creative Expression",
        progressNotes: "Lisa's mother found a community arts center offering Saturday classes. Registration submitted. Class starts March 8.",
        status: "Progressing",
      },
    ],
    additionalObservations: "Lisa answered the phone herself and led most of the check-in conversation — notable self-advocacy progress. No behavioral or health concerns reported.",
    nextSteps: "Confirm art class registration. Schedule March home visit to coincide with ISP signature collection.",
    status: "Signed",
    signedBy: "Kathy Martinez CM",
    signedOn: "02/12/2025",
    updatedBy: "Kathy Martinez CM",
    updatedOn: "02/12/2025",
  },
  {
    id: "pn-la-0318",
    personId: "46",
    date: "03/18/2025",
    startTime: "11:00",
    endTime: "12:00",
    activityType: "Assessment Coordination",
    contactType: "In-person",
    isBillable: true,
    serviceCode: "T2022",
    units: 4,
    purposeOfActivity: "Home visit and quarterly behavioral health check-in. Reviewed anxiety management strategies, medication side effects, and coordination with day program behavioral support staff.",
    goalProgress: [
      {
        goalId: "la-g1",
        goalTitle: "Independent Living Skills",
        progressNotes: "Lisa now independently grocery shops with a written list and handles her own laundry without prompting. Exceeding expectations.",
        status: "Progressing",
      },
      {
        goalId: "la-g3",
        goalTitle: "Art & Creative Expression",
        progressNotes: "Attended 2 Saturday art classes. Brought home a painting she made — very proud. Goal on track.",
        status: "Progressing",
      },
    ],
    additionalObservations: "Lisa showed me her artwork from the community class — watercolor painting of her garden. Behavioral support staff at day program report no anxiety episodes in the past 6 weeks. Strong progress overall.",
    nextSteps: "Continue current medication. Coordinate with day program staff to extend art-focused activities during program hours. Plan April home visit.",
    status: "Signed",
    signedBy: "Kathy Martinez CM",
    signedOn: "03/19/2025",
    updatedBy: "Kathy Martinez CM",
    updatedOn: "03/19/2025",
  },
  {
    id: "pn-la-0415",
    personId: "46",
    date: "04/15/2025",
    startTime: "10:00",
    endTime: "11:15",
    activityType: "Person Centered Plan / POS Development",
    contactType: "In-person",
    isBillable: true,
    serviceCode: "H2015",
    units: 5,
    purposeOfActivity: "Semi-annual ISP review and update. Met with Lisa, mother, day program coordinator, and behavioral support specialist. Updated goals, service units, and reviewed authorization status.",
    goalProgress: [
      {
        goalId: "la-g1",
        goalTitle: "Independent Living Skills",
        progressNotes: "Goal benchmark achieved — Lisa manages meal prep, laundry, and personal budgeting independently. Updating goal to focus on managing medical appointments.",
        status: "Goal achieved",
      },
      {
        goalId: "la-g2",
        goalTitle: "Community Integration",
        progressNotes: "Day program attendance rate 97% over 4 months. Lisa has formed friendships with 2 peers. Expanding community activities to include a monthly social outing.",
        status: "Progressing",
      },
      {
        goalId: "la-g3",
        goalTitle: "Art & Creative Expression",
        progressNotes: "Completed 6-week community art class. Enrolled in intermediate session starting May 10. Goal on track to be marked achieved by June.",
        status: "Progressing",
      },
    ],
    additionalObservations: "Excellent semi-annual review. All team members expressed positive feedback about Lisa's growth. Mother tearful with pride. Lisa self-advocated for a goal around learning to ride the bus independently.",
    nextSteps: "Add independent transportation goal to ISP. Authorize community living support hours. Schedule May check-in call. Submit annual eligibility verification before July 1.",
    status: "Pending Signature",
    updatedBy: "Kathy Martinez CM",
    updatedOn: "04/15/2025",
  },
  {
    id: "pn-la-0520",
    personId: "46",
    date: "05/20/2025",
    startTime: "13:30",
    endTime: "14:00",
    activityType: "Service Coordination",
    contactType: "Phone",
    isBillable: true,
    serviceCode: "T2022",
    units: 2,
    purposeOfActivity: "Monthly phone check-in. Reviewed art class session 2 progress, upcoming annual ISP review timeline, and any concerns heading into summer.",
    goalProgress: [
      {
        goalId: "la-g2",
        goalTitle: "Community Integration",
        progressNotes: "Lisa attended first community social outing (bowling) with 4 peers from day program. Reported she had a great time.",
        status: "Progressing",
      },
      {
        goalId: "la-g3",
        goalTitle: "Art & Creative Expression",
        progressNotes: "Intermediate art class started May 10. Lisa completed first two sessions.",
        status: "Progressing",
      },
    ],
    additionalObservations: "Lisa's communication and self-confidence continue to improve. She asked about job opportunities at the end of the call — recommended exploring supported employment services.",
    nextSteps: "Research supported employment referral options. Remind family about annual ISP review due in October. Annual eligibility verification due by July 1.",
    status: "Draft",
    updatedBy: "Kathy Martinez CM",
    updatedOn: "05/20/2025",
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
