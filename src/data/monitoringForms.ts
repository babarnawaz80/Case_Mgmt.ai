// Mock Monitoring Form data — structured to be replaceable by real API.

export type ReviewType = "Monthly" | "Quarterly" | "Annually";
export type FormStatus = "Draft" | "In Progress" | "Submitted" | "";

export interface YesNoAnswer {
  id: string;
  question: string;
  answer?: "Yes" | "No";
  explain?: string;
  aiSuggested?: boolean;
  aiSource?: string;
}

export interface GoalProgress {
  goalId: string;
  goalName: string;
  status: "On Track" | "Progressing" | "Needs Attention" | "Discontinued";
  notes: string;
  aiSuggested?: boolean;
  aiSource?: string;
}

export interface ContactAttempt {
  date: string;
  type: string;
  person: string;
  outcome: string;
  notes: string;
}

export interface RecommendedAction {
  id: string;
  text: string;
  createTask: boolean;
  aiSuggested?: boolean;
}

export interface MonitoringForm {
  id: string;
  personId: string;
  type: ReviewType;
  dueDate?: string;
  completeDate?: string;
  status: FormStatus;
  active: "Active" | "Inactive" | "—";
  updatedBy: string;
  updatedOn: string;
  aiPreFilled?: boolean;

  s2_circumstances: YesNoAnswer[];
  s3_satisfaction: YesNoAnswer[];
  s4_progress: GoalProgress[];
  s5_choice: YesNoAnswer[];
  s6_health: YesNoAnswer[];
  s6_riskScore?: number;
  s6_riskSource?: string;
  s7_emergency: YesNoAnswer[];
  s7_backupSummary: { value: string; aiSuggested?: boolean; aiSource?: string };
  s8_incidents: YesNoAnswer[];
  s9_recommendedActions: RecommendedAction[];
  s10_contacts: ContactAttempt[];
}

const blankCirc = (): YesNoAnswer[] => [
  { id: "c1", question: "Have there been any changes in demographics that require an update to the individual's client profile?" },
  { id: "c2", question: "Have there been any changes in the individual's living situation?" },
  { id: "c3", question: "Have there been any changes in the individual's primary caregiver?" },
  { id: "c4", question: "Have there been any changes in the individual's health status or medical needs?" },
  { id: "c5", question: "Have there been any changes in the individual's behavioral support needs?" },
  { id: "c6", question: "Are all current services still appropriate and being delivered as planned?" },
];

const blankSat = (): YesNoAnswer[] => [
  { id: "s1", question: "Is the individual satisfied with their current services?" },
  { id: "s2", question: "Does the individual want to make any changes to their current services?" },
  { id: "s3", question: "Has the individual expressed any new goals or interests since the last review?" },
  { id: "s4", question: "Is the individual's circle of support engaged and supportive?" },
];

const blankChoice = (): YesNoAnswer[] => [
  { id: "ch1", question: "Has the individual been informed of their rights?" },
  { id: "ch2", question: "Does the individual have the opportunity to make choices about their daily life?" },
  { id: "ch3", question: "Are there any concerns about the individual's ability to exercise their rights?" },
  { id: "ch4", question: "Has the individual expressed any concerns about their rights or choices?" },
];

const blankHealth = (): YesNoAnswer[] => [
  { id: "h1", question: "Is the individual's health and welfare being adequately addressed?" },
  { id: "h2", question: "Are there any new health or safety concerns since the last review?" },
  { id: "h3", question: "Has the individual had any recent medical appointments or procedures?" },
  { id: "h4", question: "Are all health-related supports in place and functioning?" },
];

const blankEmergency = (): YesNoAnswer[] => [
  { id: "e1", question: "Is the individual's back-up plan current and appropriate?" },
  { id: "e2", question: "Is the individual's emergency plan current?" },
  { id: "e3", question: "Have there been any situations requiring use of the back-up or emergency plan?" },
];

const blankIncidents = (): YesNoAnswer[] => [
  { id: "i1", question: "Have there been any incidents since the last review?" },
  { id: "i2", question: "Have any referrals been made since the last review?" },
  { id: "i3", question: "Are there any pending referrals or follow-up actions needed?" },
];

// Joseph Brown — pre-filled draft (for /new)
export const aiPrefilledDraft = (personId: string): MonitoringForm => ({
  id: "new",
  personId,
  type: "Quarterly",
  dueDate: "05/04/2026",
  status: "Draft",
  active: "Active",
  updatedBy: "Babar Nawaz CM",
  updatedOn: "04/27/2026",
  aiPreFilled: true,
  s2_circumstances: [
    { ...blankCirc()[0], answer: "No", aiSuggested: true, aiSource: "Face sheet 01/2026" },
    { ...blankCirc()[1], answer: "No", aiSuggested: true, aiSource: "Face sheet 01/2026" },
    { ...blankCirc()[2], answer: "No", aiSuggested: true, aiSource: "Contact note 04/27/2026" },
    {
      ...blankCirc()[3], answer: "Yes",
      explain: "Mother reported behavioral changes at home during 04/27 visit.",
      aiSuggested: true, aiSource: "Ambient session 04/27/2026",
    },
    {
      ...blankCirc()[4], answer: "Yes",
      explain: "Behavioral changes noted by primary caregiver. Recommend behavioral support team consult.",
      aiSuggested: true, aiSource: "Contact note 04/27/2026",
    },
    { ...blankCirc()[5], answer: "Yes", aiSuggested: true, aiSource: "Visit summary 02/2026" },
  ],
  s3_satisfaction: [
    { ...blankSat()[0], answer: "Yes", aiSuggested: true, aiSource: "Contact note 04/27/2026" },
    { ...blankSat()[1], answer: "No", aiSuggested: true, aiSource: "Contact note 04/27/2026" },
    {
      ...blankSat()[2], answer: "Yes",
      explain: "Joseph expressed interest in part-time employment during 04/27 visit.",
      aiSuggested: true, aiSource: "Ambient session 04/27/2026",
    },
    { ...blankSat()[3], answer: "Yes", aiSuggested: true, aiSource: "Contact note 04/27/2026" },
  ],
  s4_progress: [
    {
      goalId: "g2", goalName: "Community Integration",
      status: "On Track",
      notes: "Attended 3 community events per recent contact notes.",
      aiSuggested: true, aiSource: "Contact notes 02–04/2026",
    },
    {
      goalId: "g1", goalName: "Employment Exploration",
      status: "Needs Attention",
      notes: "Interest expressed but no action taken yet. Recommend connecting with Supported Employment provider.",
      aiSuggested: true, aiSource: "Ambient session 04/27/2026",
    },
  ],
  s5_choice: blankChoice(),
  s6_health: blankHealth(),
  s6_riskScore: 2,
  s6_riskSource: "Manual entry",
  s7_emergency: blankEmergency(),
  s7_backupSummary: { value: "Primary back-up: mother Linda Brown (lives in same household). Emergency contact: Carroll Community Services on-call line.", aiSuggested: true, aiSource: "Prior monitoring form 01/26/2026" },
  s8_incidents: blankIncidents(),
  s9_recommendedActions: [
    { id: "r1", text: "Follow up with behavioral support team regarding changes reported by mother.", createTask: true, aiSuggested: true },
    { id: "r2", text: "Explore employment support services — add to ISP.", createTask: true, aiSuggested: true },
    { id: "r3", text: "Complete MA redetermination process by May 10.", createTask: true, aiSuggested: true },
    { id: "r4", text: "Schedule next quarterly visit by May 15.", createTask: true, aiSuggested: true },
  ],
  s10_contacts: [],
});

// Submitted historical record (read-only)
const submittedQuarterly = (personId: string, id: string, completeDate: string, dueDate: string): MonitoringForm => ({
  id, personId, type: "Quarterly", completeDate, dueDate,
  status: "Submitted", active: "Active",
  updatedBy: "Babar Nawaz CM", updatedOn: completeDate,
  s2_circumstances: blankCirc().map(q => ({ ...q, answer: "No" as const })),
  s3_satisfaction: blankSat().map(q => ({ ...q, answer: q.id === "s2" ? "No" as const : "Yes" as const })),
  s4_progress: [
    { goalId: "g2", goalName: "Community Integration", status: "On Track", notes: "Continued participation in Day Hab program." },
  ],
  s5_choice: blankChoice().map(q => ({ ...q, answer: q.id === "ch3" || q.id === "ch4" ? "No" as const : "Yes" as const })),
  s6_health: blankHealth().map(q => ({ ...q, answer: q.id === "h2" ? "No" as const : "Yes" as const })),
  s6_riskScore: 1, s6_riskSource: "Manual entry",
  s7_emergency: blankEmergency().map(q => ({ ...q, answer: q.id === "e3" ? "No" as const : "Yes" as const })),
  s7_backupSummary: { value: "Primary back-up: mother. Emergency: provider on-call." },
  s8_incidents: blankIncidents().map(q => ({ ...q, answer: "No" as const })),
  s9_recommendedActions: [
    { id: "r1", text: "Continue current service plan.", createTask: false },
  ],
  s10_contacts: [],
});

export const monitoringForms: MonitoringForm[] = [
  submittedQuarterly("1", "mf-1", "01/26/2026", "01/26/2026"),
  submittedQuarterly("1", "mf-2", "01/12/2026", "01/12/2026"),
  {
    ...submittedQuarterly("1", "mf-3", "11/14/2025", ""),
    status: "", dueDate: undefined, completeDate: undefined, active: "—", updatedOn: "11/14/2025",
  },
  {
    ...submittedQuarterly("1", "mf-4", "09/19/2023", "09/19/2023"),
    type: "Annually", status: "In Progress",
  },
  { ...submittedQuarterly("1", "mf-5", "08/07/2023", "08/07/2023"), type: "Monthly" },
  { ...submittedQuarterly("1", "mf-6", "08/01/2023", "08/01/2023"), type: "Monthly" },
];

export function getFormsForPerson(personId: string): MonitoringForm[] {
  return monitoringForms.filter(f => f.personId === personId);
}

export function getForm(formId: string): MonitoringForm | undefined {
  return monitoringForms.find(f => f.id === formId);
}
