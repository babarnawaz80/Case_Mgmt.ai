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
];

// AI-recommended focused-session order for the day.
export const focusedSessionTaskIds = ["T-1001", "T-1003", "T-1006", "T-1007"];

// Date helpers (treat 04/27/2026 as "today" for the demo).
export const DEMO_TODAY = new Date(2026, 3, 27); // month is 0-indexed

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
