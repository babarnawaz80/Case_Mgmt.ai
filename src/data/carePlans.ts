// Mock Care Plan / ISP data, structured to be replaceable by a real API.

export type PlanStatus = "Draft" | "In Progress" | "Submitted" | "Approved" | "Completed";

export interface PlanGoal {
  id: string;
  number: number;
  title: string;
  description: string;
  targetDate?: string;
  responsibleParty?: string;
  progress: "Not Started" | "In Progress" | "Achieved" | "Discontinued";
  aiSuggested?: boolean;
  objectives: { id: string; description: string; status: "Not Started" | "In Progress" | "Achieved"; aiSuggested?: boolean }[];
}

export interface PlanService {
  id: string;
  name: string;
  provider: string;
  startDate: string;
  endDate: string;
  units: string;
  status: "Active" | "Pending" | "Expired";
}

export interface PlanSignature {
  role: string;
  name: string;
  status: "Signed" | "Pending" | "Not required";
  signedOn?: string;
}

export interface PlanHistoryEntry {
  date: string;
  user: string;
  action: string;
}

export interface CarePlan {
  id: string;
  personId: string;
  status: PlanStatus;
  isCompleted?: boolean;
  internalDueDate?: string;
  meetingDate?: string;
  crReceivedDate?: string;
  approvalDate?: string;
  completedDate?: string;
  effectiveDate?: string;
  reviewDate?: string;
  updatedBy: string;
  updatedOn: string;
  aiDrafted?: boolean;
  goals: PlanGoal[];
  services: PlanService[];
  supportNeeds: {
    workingWell: { value: string; aiSuggested?: boolean; source?: string };
    notWorking: { value: string; aiSuggested?: boolean; source?: string };
    preferences: { value: string; aiSuggested?: boolean; source?: string };
    healthSafety: { value: string; aiSuggested?: boolean; source?: string };
  };
  team: PlanSignature[];
  history: PlanHistoryEntry[];
}

// Joseph Brown — In progress AI-drafted plan
export const plans: CarePlan[] = [
  {
    id: "6080",
    personId: "1",
    status: "In Progress",
    internalDueDate: "08/01/2026",
    updatedBy: "Nawaz CM, Babar",
    updatedOn: "01/26/2026",
    effectiveDate: "08/01/2026",
    reviewDate: "08/01/2027",
    aiDrafted: true,
    goals: [
      {
        id: "g1",
        number: 1,
        title: "Explore part-time employment opportunities",
        description:
          "Joseph has expressed interest in pursuing part-time employment. Connect with Supported Employment provider to assess vocational interests, identify community-based work opportunities aligned with his skills, and arrange job shadowing within 90 days.",
        targetDate: "10/31/2026",
        responsibleParty: "Babar Nawaz CM + Supported Employment provider",
        progress: "Not Started",
        aiSuggested: true,
        objectives: [
          { id: "g1o1", description: "Complete vocational interest assessment", status: "Not Started", aiSuggested: true },
          { id: "g1o2", description: "Schedule 2 job shadowing visits", status: "Not Started", aiSuggested: true },
        ],
      },
      {
        id: "g2",
        number: 2,
        title: "Maintain community integration through Day Habilitation",
        description:
          "Continue attendance at current Day Habilitation program with the goal of participating in at least 2 community outings per month. Track participation and satisfaction quarterly.",
        targetDate: "Ongoing",
        responsibleParty: "Day Hab provider + Babar Nawaz CM",
        progress: "In Progress",
        aiSuggested: true,
        objectives: [
          { id: "g2o1", description: "Attend Day Hab at least 4 days per week", status: "In Progress" },
          { id: "g2o2", description: "Participate in 2+ community outings monthly", status: "In Progress" },
        ],
      },
      {
        id: "g3",
        number: 3,
        title: "Behavioral support coordination",
        description:
          "Mother reported recent behavioral changes at home (withdrawn behavior). Coordinate with behavioral support team to assess, identify triggers, and implement supports as needed within 2 weeks.",
        targetDate: "05/15/2026",
        responsibleParty: "Behavioral support team + Babar Nawaz CM",
        progress: "Not Started",
        aiSuggested: true,
        objectives: [
          { id: "g3o1", description: "Behavioral assessment scheduled", status: "Not Started", aiSuggested: true },
          { id: "g3o2", description: "Family/caregiver consultation completed", status: "Not Started", aiSuggested: true },
        ],
      },
    ],
    services: [
      {
        id: "s1",
        name: "Day Habilitation (T2021)",
        provider: "Carroll Community Services",
        startDate: "08/01/2025",
        endDate: "07/31/2026",
        units: "5 days/week",
        status: "Active",
      },
      {
        id: "s2",
        name: "Personal Care Services (H2015)",
        provider: "Carroll Home Care",
        startDate: "08/01/2025",
        endDate: "07/31/2026",
        units: "20 hrs/week",
        status: "Active",
      },
    ],
    supportNeeds: {
      workingWell: {
        value:
          "Joseph is consistently attending Day Habilitation 4-5 days per week and reports satisfaction with current program. Strong relationship with PCS aide. Mother is engaged and supportive.",
        aiSuggested: true,
        source: "Monitoring forms 10/2025, 01/2026",
      },
      notWorking: {
        value:
          "Recent withdrawn behavior reported by mother (last 2 weeks). Quarterly visit was 76 days overdue at time of last contact.",
        aiSuggested: true,
        source: "Ambient session 04/27/2026",
      },
      preferences: {
        value:
          "Joseph has expressed clear interest in exploring part-time employment opportunities. Wants to continue Day Habilitation. Enjoys community outings.",
        aiSuggested: true,
        source: "Contact note 04/27/2026, visit summary 02/2026",
      },
      healthSafety: {
        value:
          "Behavioral changes at home flagged Low-Medium severity for monitoring. No medication changes. No recent hospitalizations or ER visits.",
        aiSuggested: true,
        source: "Risk flag 04/27/2026",
      },
    },
    team: [
      { role: "Individual", name: "Joseph Brown", status: "Pending" },
      { role: "Guardian / Representative", name: "Linda Brown (mother)", status: "Pending" },
      { role: "Case Manager", name: "Babar Nawaz CM", status: "Pending" },
      { role: "Support Coordinator", name: "Jennie Thollander", status: "Pending" },
      { role: "Day Hab Provider", name: "Carroll Community Services", status: "Not required" },
    ],
    history: [
      { date: "04/27/2026", user: "Babar Nawaz CM", action: "AI draft generated from ambient session" },
      { date: "04/26/2026", user: "Babar Nawaz CM", action: "Plan created" },
      { date: "01/12/2026", user: "Babar Nawaz CM", action: "Previous plan (5909) marked complete" },
    ],
  },
  // Completed prior year plan
  {
    id: "5909",
    personId: "1",
    status: "Completed",
    isCompleted: true,
    internalDueDate: "08/01/2025",
    approvalDate: "01/12/2026",
    completedDate: "01/12/2026",
    updatedBy: "Nawaz CM, Babar",
    updatedOn: "06/13/2025",
    effectiveDate: "08/01/2024",
    reviewDate: "07/31/2025",
    goals: [
      {
        id: "g1",
        number: 1,
        title: "Maintain stable Day Habilitation attendance",
        description: "Goal achieved. Joseph attended Day Hab regularly throughout the plan year.",
        targetDate: "07/31/2025",
        responsibleParty: "Day Hab provider",
        progress: "Achieved",
        objectives: [{ id: "p1g1o1", description: "Attend at least 4 days/week", status: "Achieved" }],
      },
    ],
    services: [],
    supportNeeds: {
      workingWell: { value: "Day Hab attendance stable. PCS supports working effectively." },
      notWorking: { value: "Some transportation barriers identified mid-year, resolved by Q3." },
      preferences: { value: "Continued interest in community participation." },
      healthSafety: { value: "No safety incidents reported." },
    },
    team: [
      { role: "Individual", name: "Joseph Brown", status: "Signed", signedOn: "01/10/2026" },
      { role: "Guardian / Representative", name: "Linda Brown (mother)", status: "Signed", signedOn: "01/10/2026" },
      { role: "Case Manager", name: "Babar Nawaz CM", status: "Signed", signedOn: "01/12/2026" },
    ],
    history: [
      { date: "01/12/2026", user: "Babar Nawaz CM", action: "Plan marked complete" },
      { date: "01/10/2026", user: "Joseph Brown", action: "Plan signed" },
      { date: "08/01/2024", user: "Babar Nawaz CM", action: "Plan effective" },
    ],
  },
];

export function getPlansForPerson(personId: string): CarePlan[] {
  const existing = plans.filter((p) => p.personId === personId);
  if (existing.length > 0) return existing;
  return [generatePlanFor(personId)];
}

// ---- Synthetic fallback so every individual has an ISP / Care Plan ----
function ph(seed: string, n: number): number {
  let x = 0;
  for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;
  return x % n;
}
function generatePlanFor(personId: string): CarePlan {
  const cm = ["Babar Nawaz CM", "Jennie Thollander", "Brenda Smith"][ph(personId, 3)];
  const goalSets = [
    { title: "Increase community participation", obj: "Attend 1 community event per month" },
    { title: "Build independent living skills", obj: "Practice meal prep with staff support weekly" },
    { title: "Maintain stable health management", obj: "Attend all scheduled medical appointments" },
    { title: "Develop employment readiness", obj: "Complete job-readiness workshop" },
  ];
  const pickGoal = (salt: string) => goalSets[ph(personId + salt, goalSets.length)];
  const g1 = pickGoal("g1"); const g2 = pickGoal("g2x");
  return {
    id: `plan-gen-${personId}`,
    personId,
    status: "In Progress",
    internalDueDate: "08/01/2026",
    updatedBy: cm,
    updatedOn: "04/01/2026",
    effectiveDate: "08/01/2025",
    reviewDate: "08/01/2026",
    aiDrafted: false,
    goals: [
      { id: "g1", number: 1, title: g1.title, description: `Plan objective: ${g1.obj}.`, targetDate: "07/31/2026", responsibleParty: cm, progress: "In Progress", objectives: [{ id: "g1o1", description: g1.obj, status: "In Progress" }] },
      { id: "g2", number: 2, title: g2.title, description: `Plan objective: ${g2.obj}.`, targetDate: "07/31/2026", responsibleParty: cm, progress: "Not Started", objectives: [{ id: "g2o1", description: g2.obj, status: "Not Started" }] },
    ],
    services: [
      { id: "s1", name: "Case Management", provider: "Iowa CM Services", startDate: "08/01/2025", endDate: "07/31/2026", units: "4 hrs/mo", status: "Active" },
      { id: "s2", name: "Day Habilitation", provider: "Community Day Programs", startDate: "08/01/2025", endDate: "07/31/2026", units: "20 hrs/wk", status: "Active" },
    ],
    supportNeeds: {
      workingWell: { value: "Routine and predictability help engagement; family communication is consistent." },
      notWorking: { value: "Occasional transportation gaps to community events." },
      preferences: { value: "Prefers structured group activities over unstructured social time." },
      healthSafety: { value: "No active safety concerns. Standard supervision protocols in place." },
    },
    team: [
      { role: "Individual", name: "—", status: "Pending" },
      { role: "Guardian / Representative", name: "—", status: "Pending" },
      { role: "Case Manager", name: cm, status: "Signed", signedOn: "04/01/2026" },
    ],
    history: [
      { date: "04/01/2026", user: cm, action: "Plan updated" },
      { date: "08/01/2025", user: cm, action: "Plan effective" },
    ],
  };
}

export function getPlan(planId: string): CarePlan | undefined {
  return plans.find((p) => p.id === planId);
}
