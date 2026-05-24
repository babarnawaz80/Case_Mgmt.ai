// Mock task data for the My Work global view.
// Tasks come from three sources: Case Management templates,
// Workflow Manager steps, and AI-generated events.

export type TaskStatus =
  | "Pending Start"
  | "Open"
  | "In Progress"
  | "Completed"
  | "Overdue";

export type TaskSource = "Case Management" | "Workflow" | "AI";
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export interface MyWorkTask {
  id: string;
  name: string;
  description?: string;
  source: TaskSource;
  sourceDetail: string; // e.g. "Community Coordination" or "Generated from ambient session 04/27"
  individualId: string;
  individualName: string;
  individualCounty: string;
  individualInitials: string;
  startDate?: string;
  dueDate: string; // MM/DD/YYYY
  status: TaskStatus;
  daysOverdue?: number;
  staffResponsible: string; // "Anyone" or person name
  linkedModule?: {
    label: string;
    slug: string; // route slug used for navigation
  };
  aiDraftReady?: boolean;
  priority: TaskPriority;
  comments?: { author: string; date: string; body: string }[];
  createdOn: string;
  createdBy: string;
}

export const myWorkTasks: MyWorkTask[] = [
  // Joseph Brown — id "1"
  {
    id: "T-1001",
    name: "Schedule quarterly visit",
    description:
      "Outreach to Joseph and his guardian to schedule the next quarterly visit. Document call attempts in Contact Note.",
    source: "Case Management",
    sourceDetail: "Community Coordination",
    individualId: "1",
    individualName: "Joseph Brown",
    individualCounty: "Carroll County",
    individualInitials: "JB",
    startDate: "02/09/2026",
    dueDate: "02/09/2026",
    status: "Overdue",
    daysOverdue: 76,
    staffResponsible: "Kathy Adams",
    linkedModule: { label: "Contact Note", slug: "contact-note" },
    aiDraftReady: true,
    priority: "Critical",
    createdOn: "02/01/2026",
    createdBy: "Case Management template",
  },
  {
    id: "T-1002",
    name: "Complete monitoring form",
    description:
      "Complete the monthly monitoring form covering health, safety, environment, and goal progress.",
    source: "Case Management",
    sourceDetail: "Community Coordination",
    individualId: "1",
    individualName: "Joseph Brown",
    individualCounty: "Carroll County",
    individualInitials: "JB",
    startDate: "04/09/2026",
    dueDate: "04/09/2026",
    status: "Overdue",
    daysOverdue: 17,
    staffResponsible: "Kathy Adams",
    linkedModule: { label: "Monitoring Form", slug: "monitoring-form" },
    aiDraftReady: true,
    priority: "High",
    createdOn: "04/01/2026",
    createdBy: "Case Management template",
  },
  {
    id: "T-1003",
    name: "Verify MA status",
    description:
      "Confirm Joseph's Medicaid eligibility status is active. Update Eligibility Verification module.",
    source: "Case Management",
    sourceDetail: "Community Coordination",
    individualId: "1",
    individualName: "Joseph Brown",
    individualCounty: "Carroll County",
    individualInitials: "JB",
    startDate: "04/16/2026",
    dueDate: "04/16/2026",
    status: "Overdue",
    daysOverdue: 10,
    staffResponsible: "Kathy Adams",
    linkedModule: {
      label: "Eligibility Verification",
      slug: "eligibility-verification",
    },
    aiDraftReady: true,
    priority: "High",
    createdOn: "04/10/2026",
    createdBy: "Case Management template",
  },
  {
    id: "T-1004",
    name: "Quarterly visit",
    description: "Conduct in-person quarterly visit with Joseph at his residence.",
    source: "Case Management",
    sourceDetail: "Community Coordination",
    individualId: "1",
    individualName: "Joseph Brown",
    individualCounty: "Carroll County",
    individualInitials: "JB",
    startDate: "02/09/2026",
    dueDate: "05/15/2026",
    status: "Pending Start",
    staffResponsible: "Kathy Adams",
    linkedModule: { label: "Visit Summary", slug: "visit-summary" },
    priority: "Medium",
    createdOn: "02/01/2026",
    createdBy: "Case Management template",
  },
  {
    id: "T-1005",
    name: "Complete MA redetermination",
    description:
      "Submit Joseph's Medicaid redetermination application. Required annually.",
    source: "Case Management",
    sourceDetail: "Community Coordination",
    individualId: "1",
    individualName: "Joseph Brown",
    individualCounty: "Carroll County",
    individualInitials: "JB",
    dueDate: "06/30/2026",
    status: "Pending Start",
    staffResponsible: "Kathy Adams",
    linkedModule: {
      label: "Eligibility Verification",
      slug: "eligibility-verification",
    },
    priority: "Medium",
    createdOn: "04/01/2026",
    createdBy: "Case Management template",
  },
  // Mohsin Raza — id "2"
  {
    id: "T-1006",
    name: "Complete monitoring form",
    description:
      "AI detected a compliance gap during the most recent guidelines run. Complete monitoring form to close.",
    source: "AI",
    sourceDetail: "Generated from compliance check",
    individualId: "2",
    individualName: "Mohsin Raza",
    individualCounty: "Bremer County",
    individualInitials: "MR",
    dueDate: "04/27/2026",
    status: "Open",
    staffResponsible: "Kathy Adams",
    linkedModule: { label: "Monitoring Form", slug: "monitoring-form" },
    aiDraftReady: true,
    priority: "High",
    createdOn: "04/24/2026",
    createdBy: "AI · Compliance Agent",
  },
  // Ashley Walker — id "3"
  {
    id: "T-1007",
    name: "PCP renewal preparation",
    description:
      "Ashley's Person-Centered Plan is due for renewal in 14 days. Begin preparation now to allow time for signatures.",
    source: "AI",
    sourceDetail: "Generated from ISP deadline",
    individualId: "3",
    individualName: "Ashley Walker",
    individualCounty: "Polk County",
    individualInitials: "AW",
    dueDate: "05/11/2026",
    status: "Open",
    staffResponsible: "Kathy Adams",
    linkedModule: { label: "Care Plan / ISP", slug: "care-plan" },
    priority: "High",
    createdOn: "04/25/2026",
    createdBy: "AI · Daily Assistant",
  },
  // Travis Langston — id "4"
  {
    id: "T-1008",
    name: "Quarterly visit",
    description: "Conduct quarterly visit with Travis. Schedule confirmed.",
    source: "Case Management",
    sourceDetail: "Community Coordination",
    individualId: "4",
    individualName: "Travis Langston",
    individualCounty: "Story County",
    individualInitials: "TL",
    dueDate: "05/01/2026",
    status: "Open",
    staffResponsible: "Kathy Adams",
    linkedModule: { label: "Visit Summary", slug: "visit-summary" },
    priority: "Medium",
    createdOn: "04/15/2026",
    createdBy: "Case Management template",
  },
  {
    id: "T-1009",
    name: "Progress note review",
    description:
      "Travis has 2 unsigned progress notes pending. Review and sign so they can be billed.",
    source: "AI",
    sourceDetail: "Generated from unsigned notes",
    individualId: "4",
    individualName: "Travis Langston",
    individualCounty: "Story County",
    individualInitials: "TL",
    dueDate: "04/28/2026",
    status: "Open",
    staffResponsible: "Kathy Adams",
    linkedModule: { label: "Progress Note", slug: "progress-note" },
    priority: "High",
    createdOn: "04/26/2026",
    createdBy: "AI · Compliance Agent",
  },
  // ===== Additional dummy individuals for scale demo =====
  ...generateDummyTasks(),
];

function generateDummyTasks(): MyWorkTask[] {
  const people: Array<{ id: string; name: string; initials: string; county: string }> = [
    { id: "5",  name: "Emily Carter",      initials: "EC", county: "Polk County" },
    { id: "6",  name: "Marcus Reed",       initials: "MR", county: "Linn County" },
    { id: "7",  name: "Sofia Martinez",    initials: "SM", county: "Story County" },
    { id: "8",  name: "Jamal Wright",      initials: "JW", county: "Carroll County" },
    { id: "9",  name: "Hannah Olsen",      initials: "HO", county: "Bremer County" },
    { id: "10", name: "Liam Thompson",     initials: "LT", county: "Polk County" },
    { id: "11", name: "Priya Patel",       initials: "PP", county: "Johnson County" },
    { id: "12", name: "Devon Brooks",      initials: "DB", county: "Linn County" },
    { id: "13", name: "Aisha Khan",        initials: "AK", county: "Johnson County" },
    { id: "14", name: "Carlos Rivera",     initials: "CR", county: "Story County" },
    { id: "15", name: "Grace Nguyen",      initials: "GN", county: "Polk County" },
    { id: "16", name: "Ethan Hughes",      initials: "EH", county: "Carroll County" },
    { id: "17", name: "Maya Goldberg",     initials: "MG", county: "Bremer County" },
    { id: "18", name: "Noah Fischer",      initials: "NF", county: "Linn County" },
    { id: "19", name: "Zara Ahmed",        initials: "ZA", county: "Johnson County" },
    { id: "20", name: "Owen Bennett",      initials: "OB", county: "Story County" },
  ];

  const templates: Array<Partial<MyWorkTask> & { name: string; module?: MyWorkTask["linkedModule"] }> = [
    { name: "Schedule quarterly visit",     source: "Case Management", sourceDetail: "Community Coordination", module: { label: "Visit Summary", slug: "visit-summary" }, priority: "High" },
    { name: "Complete monitoring form",     source: "Case Management", sourceDetail: "Community Coordination", module: { label: "Monitoring Form", slug: "monitoring-form" }, priority: "High", aiDraftReady: true },
    { name: "Verify MA status",             source: "AI", sourceDetail: "Generated from eligibility check", module: { label: "Eligibility Verification", slug: "eligibility-verification" }, priority: "Critical", aiDraftReady: true },
    { name: "Sign progress note",           source: "Workflow", sourceDetail: "Pending signature", module: { label: "Progress Note", slug: "progress-note" }, priority: "Medium" },
    { name: "Review care plan goals",       source: "Case Management", sourceDetail: "Annual review", module: { label: "Care Plan", slug: "care-plan" }, priority: "Medium" },
    { name: "Contact guardian re: incident",source: "AI", sourceDetail: "Generated from incident report", module: { label: "Contact Note", slug: "contact-note" }, priority: "Critical", aiDraftReady: true },
    { name: "Update emergency contacts",    source: "Case Management", sourceDetail: "Annual refresh", module: { label: "Face Sheet", slug: "facesheet" }, priority: "Low" },
    { name: "Schedule annual assessment",   source: "Workflow", sourceDetail: "Due window", module: { label: "Assessments", slug: "assessments" }, priority: "Medium" },
    { name: "File incident report",         source: "Case Management", sourceDetail: "Required within 24h", module: { label: "Incident Reporting", slug: "incident-reporting" }, priority: "Critical" },
    { name: "Submit referral",              source: "Workflow", sourceDetail: "Provider intake", module: { label: "Referrals", slug: "referrals" }, priority: "Medium" },
  ];

  const dueOptions = [
    { d: "04/20/2026", status: "Overdue" as const, days: 7 },
    { d: "04/24/2026", status: "Overdue" as const, days: 3 },
    { d: "04/27/2026", status: "Open" as const },
    { d: "04/28/2026", status: "Open" as const },
    { d: "04/30/2026", status: "Open" as const },
    { d: "05/04/2026", status: "Open" as const },
    { d: "05/12/2026", status: "Pending Start" as const },
    { d: "05/20/2026", status: "Pending Start" as const },
    { d: "06/03/2026", status: "In Progress" as const },
  ];

  const staff = ["Kathy Adams", "Marcus Lee", "Priya Shah", "Devon Brooks"];
  const out: MyWorkTask[] = [];
  let counter = 2000;

  people.forEach((p, pi) => {
    const taskCount = 2 + (pi % 4); // 2-5 tasks each
    for (let i = 0; i < taskCount; i++) {
      const tpl = templates[(pi * 3 + i) % templates.length];
      const due = dueOptions[(pi + i) % dueOptions.length];
      out.push({
        id: `T-${counter++}`,
        name: tpl.name,
        description: `${tpl.name} for ${p.name}. ${tpl.sourceDetail ?? ""}`.trim(),
        source: tpl.source!,
        sourceDetail: tpl.sourceDetail!,
        individualId: p.id,
        individualName: p.name,
        individualCounty: p.county,
        individualInitials: p.initials,
        startDate: due.d,
        dueDate: due.d,
        status: due.status,
        daysOverdue: (due as any).days,
        staffResponsible: staff[(pi + i) % staff.length],
        linkedModule: tpl.module,
        aiDraftReady: tpl.aiDraftReady,
        priority: tpl.priority!,
        createdOn: "04/01/2026",
        createdBy: tpl.source === "AI" ? "AI · Compliance Agent" : "Case Management template",
      });
    }
  });

  return out;
}

// AI-recommended focused-session order for the day.
export const focusedSessionTaskIds = ["T-1001", "T-1003", "T-1006", "T-1007"];

// Date helpers (treat current date as today dynamically)
export const DEMO_TODAY = new Date();

export function parseMDY(s?: string): Date | null {
  if (!s) return null;
  const [m, d, y] = s.split("/").map(Number);
  if (!m || !d || !y) return null;
  return new Date(y, m - 1, d);
}

export function daysBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function bucketForTask(task: MyWorkTask) {
  const due = parseMDY(task.dueDate);
  if (!due) return "later" as const;
  const diff = daysBetween(DEMO_TODAY, due);
  if (task.status === "Completed") return "later" as const;
  if (diff < 0) return "overdue" as const;
  if (diff === 0) return "today" as const;
  if (diff === 1) return "tomorrow" as const;
  if (diff <= 7) return "thisWeek" as const;
  if (diff <= 14) return "nextWeek" as const;
  return "later" as const;
}

export function isDueToday(task: MyWorkTask) {
  return bucketForTask(task) === "today";
}
export function isOverdue(task: MyWorkTask) {
  return bucketForTask(task) === "overdue";
}
export function isThisWeek(task: MyWorkTask) {
  const b = bucketForTask(task);
  return b === "today" || b === "tomorrow" || b === "thisWeek";
}
