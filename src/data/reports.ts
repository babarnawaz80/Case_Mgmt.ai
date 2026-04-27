// Reports module data layer.
// Pure mock — definitions, outputs, audit log entries, and saved/scheduled reports.
// Mutable arrays so the UI can persist within a session.

export type ReportCategory =
  | "Caseload & Operations"
  | "Compliance & Plan Status"
  | "Documentation & Notes"
  | "Incidents & Risk"
  | "Billing & Financial"
  | "Outcomes & Quality"
  | "Staff & Productivity";

export type RoleScope = "case_manager" | "supervisor" | "admin" | "billing";

export interface ReportDef {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  lastRun?: string;
  rolesAllowed?: RoleScope[]; // omitted = everyone
  chartType: "bar" | "line" | "donut" | "hbar" | "table";
}

export const REPORTS: ReportDef[] = [
  // Caseload
  {
    id: "caseload-summary",
    name: "Caseload Summary",
    description:
      "Overview of all individuals by case manager, program, risk level, and compliance status.",
    category: "Caseload & Operations",
    lastRun: "04/26/2026",
    chartType: "donut",
  },
  {
    id: "task-status",
    name: "My Work / Task Status",
    description:
      "All open, overdue, and completed tasks across the caseload with aging analysis.",
    category: "Caseload & Operations",
    lastRun: "04/26/2026",
    chartType: "bar",
  },
  {
    id: "visit-frequency",
    name: "Visit Frequency Compliance",
    description:
      "Tracks required visit frequencies against actual visits completed per individual and program requirements.",
    category: "Caseload & Operations",
    chartType: "hbar",
  },
  {
    id: "workload-balance",
    name: "Caseload Workload Balance",
    description:
      "Compares caseload size and complexity across case managers for equitable distribution analysis.",
    category: "Caseload & Operations",
    rolesAllowed: ["supervisor", "admin"],
    chartType: "bar",
  },
  {
    id: "admissions-discharges",
    name: "New Admissions & Discharges",
    description:
      "Admissions, discharges, and transfers within a selected date range.",
    category: "Caseload & Operations",
    chartType: "line",
  },
  {
    id: "individuals-by-program",
    name: "Individuals by Program & State",
    description:
      "Distribution of individuals across programs, states, and service categories.",
    category: "Caseload & Operations",
    chartType: "donut",
  },

  // Compliance
  {
    id: "pcp-compliance",
    name: "PCP / ISP Compliance Dashboard",
    description:
      "Tracks PCP/ISP status across all individuals. On track, off track, overdue, and missing.",
    category: "Compliance & Plan Status",
    lastRun: "04/26/2026",
    chartType: "donut",
  },
  {
    id: "monitoring-compliance",
    name: "Monitoring Form Compliance",
    description:
      "Tracks required monitoring form completion (monthly, quarterly, annually) against actual completion dates.",
    category: "Compliance & Plan Status",
    chartType: "bar",
  },
  {
    id: "eligibility-status",
    name: "Eligibility & Medicaid Status",
    description:
      "Current Medicaid status, upcoming renewals, and redetermination deadlines.",
    category: "Compliance & Plan Status",
    chartType: "donut",
  },
  {
    id: "assessment-due",
    name: "Assessment Due Report",
    description:
      "Individuals with overdue or upcoming assessments based on template frequency requirements.",
    category: "Compliance & Plan Status",
    chartType: "bar",
  },
  {
    id: "service-auth",
    name: "Service Authorization Status",
    description:
      "Active authorizations, expiring soon, expired, and utilization rates.",
    category: "Compliance & Plan Status",
    chartType: "bar",
  },
  {
    id: "compliance-runs",
    name: "Compliance Agent Run Summary",
    description:
      "Summary of compliance agent findings across all individuals and agents.",
    category: "Compliance & Plan Status",
    chartType: "donut",
  },

  // Documentation
  {
    id: "unsigned-notes",
    name: "Unsigned Notes Report",
    description:
      "All contact notes, progress notes, and visit summaries pending signature with aging analysis.",
    category: "Documentation & Notes",
    lastRun: "04/27/2026",
    chartType: "table",
  },
  {
    id: "doc-completeness",
    name: "Documentation Completeness",
    description:
      "Measures documentation completeness per individual across all required module types. Scored as % complete per individual.",
    category: "Documentation & Notes",
    chartType: "hbar",
  },
  {
    id: "note-volume",
    name: "Note Volume by Case Manager",
    description:
      "Count of notes by type per case manager within a date range. Productivity metric.",
    category: "Documentation & Notes",
    chartType: "bar",
  },
  {
    id: "ambient-summary",
    name: "Ambient Session Summary",
    description:
      "Usage statistics for ambient listening sessions — count, duration, modules updated, AI accuracy metrics.",
    category: "Documentation & Notes",
    chartType: "line",
  },

  // Incidents
  {
    id: "incident-summary",
    name: "Incident Summary Report",
    description:
      "All incidents within a date range by type, classification, status, and individual.",
    category: "Incidents & Risk",
    lastRun: "04/26/2026",
    chartType: "donut",
  },
  {
    id: "incident-aging",
    name: "Incident Aging Report",
    description:
      "Open incidents by stage with days since last activity. Identifies stalled investigations.",
    category: "Incidents & Risk",
    chartType: "table",
  },
  {
    id: "high-risk",
    name: "High-Risk Individual Report",
    description:
      "All individuals with risk scores above threshold, open risk flags, or recent behavioral incidents.",
    category: "Incidents & Risk",
    chartType: "table",
  },
  {
    id: "hrst-tracking",
    name: "HRST Score Tracking",
    description:
      "HRST and standardized instrument scores across the caseload with trend analysis.",
    category: "Incidents & Risk",
    chartType: "line",
  },

  // Billing
  {
    id: "billing-summary",
    name: "Billing Activity Summary",
    description:
      "Claims submitted, paid, denied, and pending within a date range. By individual, case manager, and service code.",
    category: "Billing & Financial",
    lastRun: "04/27/2026",
    rolesAllowed: ["billing", "admin", "supervisor"],
    chartType: "bar",
  },
  {
    id: "denial-analysis",
    name: "Claim Denial Analysis",
    description:
      "Denial reasons ranked by frequency and dollar impact. Identifies documentation and billing process issues.",
    category: "Billing & Financial",
    rolesAllowed: ["billing", "admin", "supervisor"],
    chartType: "hbar",
  },
  {
    id: "auth-utilization",
    name: "Authorization Utilization Report",
    description:
      "Units authorized vs. used per individual and service code. Flags under-utilization and over-utilization.",
    category: "Billing & Financial",
    rolesAllowed: ["billing", "admin", "supervisor"],
    chartType: "hbar",
  },
  {
    id: "unbilled-notes",
    name: "Unbilled Signed Notes",
    description:
      "Signed billable notes that have not yet generated a billing event. Revenue leakage detection.",
    category: "Billing & Financial",
    rolesAllowed: ["billing", "admin", "supervisor"],
    chartType: "table",
  },

  // Outcomes
  {
    id: "goal-progress",
    name: "Goal Progress Summary",
    description:
      "Progress toward ISP/Care Plan goals across all individuals. By goal status, domain, and case manager.",
    category: "Outcomes & Quality",
    chartType: "donut",
  },
  {
    id: "score-trends",
    name: "Assessment Score Trends",
    description:
      "LOC and domain score changes across assessments over time. Population-level outcomes analysis.",
    category: "Outcomes & Quality",
    chartType: "line",
  },
  {
    id: "referral-outcomes",
    name: "Referral Outcomes",
    description:
      "Status of all community referrals — pending, connected, closed, unsuccessful.",
    category: "Outcomes & Quality",
    chartType: "donut",
  },
  {
    id: "satisfaction-trends",
    name: "Individual Satisfaction Trends",
    description:
      "Satisfaction responses captured in monitoring forms and visit summaries aggregated across the caseload.",
    category: "Outcomes & Quality",
    chartType: "line",
  },

  // Staff
  {
    id: "cm-productivity",
    name: "Case Manager Productivity",
    description:
      "Notes documented, visits completed, tasks finished, and compliance rate per case manager.",
    category: "Staff & Productivity",
    rolesAllowed: ["supervisor", "admin"],
    chartType: "bar",
  },
  {
    id: "training-compliance",
    name: "Training Compliance",
    description:
      "Staff training completion status and upcoming training deadlines.",
    category: "Staff & Productivity",
    rolesAllowed: ["admin"],
    chartType: "donut",
  },
];

export const CATEGORIES: ReportCategory[] = [
  "Caseload & Operations",
  "Compliance & Plan Status",
  "Documentation & Notes",
  "Incidents & Risk",
  "Billing & Financial",
  "Outcomes & Quality",
  "Staff & Productivity",
];

export function getReport(id: string) {
  return REPORTS.find((r) => r.id === id);
}

// ---------- Report outputs ----------
// Each report has a deterministic mock output: stats, chart data, table rows, AI insight.

export type StatTone = "neutral" | "green" | "amber" | "red" | "blue";

export interface StatChip {
  label: string;
  value: string | number;
  tone: StatTone;
}

export interface ChartPoint {
  label: string;
  value: number;
  tone?: StatTone;
}

export interface ReportOutput {
  stats: StatChip[];
  chartTitle: string;
  chart: ChartPoint[];
  // Table.
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, string | number>[];
  insight: string;
  // For line charts, optional second-axis data (sequence of points by x label).
  trend?: { label: string; value: number }[];
}

const ROW = (r: Record<string, string | number>) => r;

const OUTPUTS: Record<string, ReportOutput> = {
  "caseload-summary": {
    stats: [
      { label: "Total individuals", value: 7, tone: "neutral" },
      { label: "Active", value: 6, tone: "green" },
      { label: "Pending", value: 1, tone: "amber" },
      { label: "High risk", value: 2, tone: "red" },
      { label: "Out of compliance", value: 1, tone: "red" },
    ],
    chartTitle: "Individuals by status",
    chart: [
      { label: "Active", value: 6, tone: "green" },
      { label: "Pending", value: 1, tone: "amber" },
      { label: "High risk", value: 2, tone: "red" },
    ],
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Individual" },
      { key: "program", label: "Program" },
      { key: "cm", label: "Case Manager" },
      { key: "risk", label: "Risk" },
      { key: "status", label: "Status" },
    ],
    rows: [
      ROW({ id: "1", name: "Joseph Brown", program: "MD DDA CO", cm: "Kathy Adams", risk: "High", status: "Out of compliance" }),
      ROW({ id: "2", name: "Travis Langston", program: "MD DDA CO", cm: "Kathy Adams", risk: "Low", status: "Active" }),
      ROW({ id: "3", name: "Dwight Doe", program: "MD DDA CO", cm: "Kathy Adams", risk: "Low", status: "Active" }),
      ROW({ id: "4", name: "Mohsin Raza", program: "MD DDA CO", cm: "Kathy Adams", risk: "Medium", status: "Active" }),
      ROW({ id: "5", name: "Ayesha Khan", program: "MD DDA CO", cm: "Kathy Adams", risk: "Low", status: "Active" }),
      ROW({ id: "6", name: "Carlos Rivera", program: "MD DDA CO", cm: "Kathy Adams", risk: "Low", status: "Active" }),
      ROW({ id: "7", name: "Sara Patel", program: "MD DDA CO", cm: "Kathy Adams", risk: "Low", status: "Pending" }),
    ],
    insight:
      "All 7 individuals are assigned to Kathy Adams. Joseph Brown is the only individual currently out of compliance — driven by overdue PCP and unsigned notes.",
  },

  "task-status": {
    stats: [
      { label: "Open", value: 14, tone: "neutral" },
      { label: "Overdue", value: 6, tone: "red" },
      { label: "Completed (30d)", value: 38, tone: "green" },
      { label: "Avg days to complete", value: "2.4", tone: "blue" },
    ],
    chartTitle: "Overdue tasks by case manager",
    chart: [
      { label: "Kathy Adams", value: 6, tone: "red" },
      { label: "Babar Nawaz", value: 0, tone: "green" },
    ],
    columns: [
      { key: "individual", label: "Individual" },
      { key: "task", label: "Task" },
      { key: "due", label: "Due" },
      { key: "days", label: "Days overdue", align: "right" },
      { key: "module", label: "Module" },
    ],
    rows: [
      ROW({ individual: "Joseph Brown", task: "Sign progress note", due: "04/19/2026", days: 8, module: "Progress Note" }),
      ROW({ individual: "Joseph Brown", task: "Complete annual reassessment", due: "09/01/2025", days: 238, module: "Assessments" }),
      ROW({ individual: "Joseph Brown", task: "Address denied claim", due: "04/13/2026", days: 14, module: "Billing" }),
      ROW({ individual: "Travis Langston", task: "Monthly visit", due: "04/22/2026", days: 5, module: "Visit Summary" }),
      ROW({ individual: "Mohsin Raza", task: "Quarterly monitoring form", due: "04/15/2026", days: 12, module: "Monitoring" }),
      ROW({ individual: "Sara Patel", task: "Eligibility verification", due: "04/20/2026", days: 7, module: "Eligibility" }),
    ],
    insight:
      "All 6 overdue tasks belong to Kathy Adams. 50% are concentrated on Joseph Brown — addressing his case clears most of the backlog.",
  },

  "visit-frequency": {
    stats: [
      { label: "On track", value: 5, tone: "green" },
      { label: "Behind", value: 1, tone: "amber" },
      { label: "Overdue", value: 1, tone: "red" },
      { label: "Never visited", value: 0, tone: "neutral" },
    ],
    chartTitle: "Visit compliance distribution",
    chart: [
      { label: "Joseph Brown", value: 60, tone: "amber" },
      { label: "Travis Langston", value: 100, tone: "green" },
      { label: "Dwight Doe", value: 100, tone: "green" },
      { label: "Mohsin Raza", value: 50, tone: "red" },
      { label: "Ayesha Khan", value: 100, tone: "green" },
      { label: "Carlos Rivera", value: 100, tone: "green" },
      { label: "Sara Patel", value: 100, tone: "green" },
    ],
    columns: [
      { key: "individual", label: "Individual" },
      { key: "required", label: "Required" },
      { key: "completed", label: "Completed", align: "right" },
      { key: "rate", label: "Rate", align: "right" },
      { key: "status", label: "Status" },
    ],
    rows: [
      ROW({ individual: "Joseph Brown", required: "Monthly", completed: 3, rate: "60%", status: "Behind" }),
      ROW({ individual: "Travis Langston", required: "Monthly", completed: 5, rate: "100%", status: "On track" }),
      ROW({ individual: "Mohsin Raza", required: "Bi-weekly", completed: 5, rate: "50%", status: "Overdue" }),
      ROW({ individual: "Sara Patel", required: "Monthly", completed: 5, rate: "100%", status: "On track" }),
    ],
    insight:
      "Mohsin Raza is overdue on bi-weekly visits — last completed visit was 03/12/2026.",
  },

  "workload-balance": {
    stats: [
      { label: "Avg caseload", value: "7.0", tone: "neutral" },
      { label: "Max caseload", value: 7, tone: "amber" },
      { label: "Min caseload", value: 7, tone: "neutral" },
      { label: "Std deviation", value: "0.0", tone: "green" },
    ],
    chartTitle: "Caseload by case manager",
    chart: [{ label: "Kathy Adams", value: 7, tone: "blue" }],
    columns: [
      { key: "cm", label: "Case Manager" },
      { key: "active", label: "Active", align: "right" },
      { key: "high", label: "High risk", align: "right" },
      { key: "compliance", label: "Compliance", align: "right" },
    ],
    rows: [ROW({ cm: "Kathy Adams", active: 7, high: 2, compliance: "84%" })],
    insight:
      "Workload is balanced because the org currently has one case manager. Add staff to enable balancing analysis.",
  },

  "admissions-discharges": {
    stats: [
      { label: "Admitted", value: 0, tone: "blue" },
      { label: "Discharged", value: 0, tone: "neutral" },
      { label: "Transferred", value: 0, tone: "neutral" },
      { label: "Net change", value: 0, tone: "green" },
    ],
    chartTitle: "Census change (last 6 months)",
    chart: [],
    trend: [
      { label: "Nov", value: 7 },
      { label: "Dec", value: 7 },
      { label: "Jan", value: 7 },
      { label: "Feb", value: 7 },
      { label: "Mar", value: 7 },
      { label: "Apr", value: 7 },
    ],
    columns: [
      { key: "date", label: "Date" },
      { key: "individual", label: "Individual" },
      { key: "type", label: "Type" },
    ],
    rows: [],
    insight: "Census has been stable at 7 individuals for the past 6 months.",
  },

  "individuals-by-program": {
    stats: [
      { label: "Programs", value: 1, tone: "neutral" },
      { label: "States", value: 1, tone: "neutral" },
      { label: "Service categories", value: 3, tone: "blue" },
      { label: "Total individuals", value: 7, tone: "green" },
    ],
    chartTitle: "Individuals by service category",
    chart: [
      { label: "Community Living", value: 4, tone: "blue" },
      { label: "Day Habilitation", value: 2, tone: "green" },
      { label: "Supported Employment", value: 1, tone: "amber" },
    ],
    columns: [
      { key: "program", label: "Program" },
      { key: "state", label: "State" },
      { key: "category", label: "Category" },
      { key: "count", label: "Count", align: "right" },
    ],
    rows: [
      ROW({ program: "MD DDA Community Options", state: "MD", category: "Community Living", count: 4 }),
      ROW({ program: "MD DDA Community Options", state: "MD", category: "Day Habilitation", count: 2 }),
      ROW({ program: "MD DDA Community Options", state: "MD", category: "Supported Employment", count: 1 }),
    ],
    insight: "All individuals are enrolled in MD DDA Community Options.",
  },

  "pcp-compliance": {
    stats: [
      { label: "On track", value: 5, tone: "green" },
      { label: "Off track", value: 0, tone: "amber" },
      { label: "Overdue", value: 1, tone: "red" },
      { label: "Not started", value: 0, tone: "neutral" },
      { label: "Expiring soon", value: 1, tone: "amber" },
    ],
    chartTitle: "PCP / ISP status",
    chart: [
      { label: "On track", value: 5, tone: "green" },
      { label: "Overdue", value: 1, tone: "red" },
      { label: "Expiring", value: 1, tone: "amber" },
    ],
    columns: [
      { key: "individual", label: "Individual" },
      { key: "plan", label: "Plan" },
      { key: "effective", label: "Effective" },
      { key: "expires", label: "Expires" },
      { key: "status", label: "Status" },
    ],
    rows: [
      ROW({ individual: "Joseph Brown", plan: "PCP-2024", effective: "10/01/2024", expires: "04/02/2026", status: "Overdue (25d)" }),
      ROW({ individual: "Travis Langston", plan: "PCP-2025", effective: "01/15/2025", expires: "01/15/2027", status: "On track" }),
      ROW({ individual: "Dwight Doe", plan: "PCP-2025", effective: "03/01/2025", expires: "03/01/2027", status: "On track" }),
      ROW({ individual: "Mohsin Raza", plan: "PCP-2025", effective: "06/01/2025", expires: "06/01/2026", status: "Expiring soon" }),
      ROW({ individual: "Ayesha Khan", plan: "PCP-2025", effective: "07/01/2025", expires: "07/01/2027", status: "On track" }),
      ROW({ individual: "Carlos Rivera", plan: "PCP-2025", effective: "08/01/2025", expires: "08/01/2027", status: "On track" }),
      ROW({ individual: "Sara Patel", plan: "PCP-2026", effective: "01/01/2026", expires: "01/01/2028", status: "On track" }),
    ],
    insight:
      "Overall PCP compliance is 84.2% — down 4.2% over the past 30 days. The decline is driven by Joseph Brown (25 days overdue). Mohsin Raza's PCP expires in 35 days.",
  },

  "monitoring-compliance": {
    stats: [
      { label: "Complete", value: 5, tone: "green" },
      { label: "Overdue", value: 1, tone: "red" },
      { label: "Missing", value: 1, tone: "amber" },
    ],
    chartTitle: "Monitoring forms by status",
    chart: [
      { label: "Complete", value: 5, tone: "green" },
      { label: "Overdue", value: 1, tone: "red" },
      { label: "Missing", value: 1, tone: "amber" },
    ],
    columns: [
      { key: "individual", label: "Individual" },
      { key: "type", label: "Type" },
      { key: "due", label: "Due" },
      { key: "completed", label: "Completed" },
      { key: "status", label: "Status" },
    ],
    rows: [
      ROW({ individual: "Joseph Brown", type: "Monthly", due: "04/01/2026", completed: "—", status: "Overdue" }),
      ROW({ individual: "Mohsin Raza", type: "Quarterly", due: "04/15/2026", completed: "—", status: "Missing" }),
    ],
    insight:
      "Joseph's monthly monitoring form is 26 days overdue. Mohsin's quarterly form has not been started.",
  },

  "eligibility-status": {
    stats: [
      { label: "Active", value: 6, tone: "green" },
      { label: "Renewal due", value: 1, tone: "amber" },
      { label: "Expired", value: 0, tone: "red" },
      { label: "Unknown", value: 0, tone: "neutral" },
    ],
    chartTitle: "Medicaid status",
    chart: [
      { label: "Active", value: 6, tone: "green" },
      { label: "Renewal due", value: 1, tone: "amber" },
    ],
    columns: [
      { key: "individual", label: "Individual" },
      { key: "ma_id", label: "MA ID" },
      { key: "status", label: "Status" },
      { key: "redet", label: "Redetermination" },
    ],
    rows: [
      ROW({ individual: "Joseph Brown", ma_id: "MA-100021", status: "Active", redet: "08/15/2026" }),
      ROW({ individual: "Sara Patel", ma_id: "MA-100027", status: "Renewal due", redet: "05/15/2026" }),
    ],
    insight: "Sara Patel's redetermination is due in 18 days.",
  },

  "assessment-due": {
    stats: [
      { label: "Overdue", value: 1, tone: "red" },
      { label: "Due this month", value: 1, tone: "amber" },
      { label: "Due next 90d", value: 2, tone: "blue" },
      { label: "Up to date", value: 3, tone: "green" },
    ],
    chartTitle: "Assessments by due window",
    chart: [
      { label: "Overdue", value: 1, tone: "red" },
      { label: "This month", value: 1, tone: "amber" },
      { label: "Next 90d", value: 2, tone: "blue" },
      { label: "Up to date", value: 3, tone: "green" },
    ],
    columns: [
      { key: "individual", label: "Individual" },
      { key: "template", label: "Template" },
      { key: "last", label: "Last completed" },
      { key: "due", label: "Due" },
    ],
    rows: [
      ROW({ individual: "Joseph Brown", template: "Annual Reassessment", last: "09/01/2022", due: "Overdue (3 yrs)" }),
      ROW({ individual: "Mohsin Raza", template: "Annual Reassessment", last: "05/01/2025", due: "05/01/2026" }),
    ],
    insight:
      "Joseph Brown's annual reassessment is 3 years overdue. AI pre-fill can complete it in ~18 minutes.",
  },

  "service-auth": {
    stats: [
      { label: "Active", value: 7, tone: "green" },
      { label: "Expiring 30d", value: 1, tone: "amber" },
      { label: "Expired", value: 0, tone: "red" },
      { label: "Over-utilized", value: 0, tone: "red" },
    ],
    chartTitle: "Authorization utilization",
    chart: [
      { label: "Joseph Brown", value: 18, tone: "green" },
      { label: "Travis Langston", value: 65, tone: "blue" },
      { label: "Mohsin Raza", value: 88, tone: "amber" },
      { label: "Sara Patel", value: 42, tone: "blue" },
    ],
    columns: [
      { key: "individual", label: "Individual" },
      { key: "service", label: "Service" },
      { key: "authorized", label: "Authorized", align: "right" },
      { key: "used", label: "Used", align: "right" },
      { key: "rate", label: "Rate", align: "right" },
    ],
    rows: [
      ROW({ individual: "Joseph Brown", service: "T2022", authorized: 40, used: 7, rate: "18%" }),
      ROW({ individual: "Mohsin Raza", service: "T2017", authorized: 80, used: 70, rate: "88%" }),
    ],
    insight: "Mohsin Raza is at 88% utilization — request authorization renewal soon.",
  },

  "compliance-runs": {
    stats: [
      { label: "Pass", value: 18, tone: "green" },
      { label: "Warning", value: 4, tone: "amber" },
      { label: "Hard stop", value: 2, tone: "red" },
      { label: "Not yet run", value: 0, tone: "neutral" },
    ],
    chartTitle: "Compliance findings",
    chart: [
      { label: "Pass", value: 18, tone: "green" },
      { label: "Warning", value: 4, tone: "amber" },
      { label: "Hard stop", value: 2, tone: "red" },
    ],
    columns: [
      { key: "individual", label: "Individual" },
      { key: "agent", label: "Agent" },
      { key: "finding", label: "Finding" },
      { key: "severity", label: "Severity" },
    ],
    rows: [
      ROW({ individual: "Joseph Brown", agent: "MD DDA Compliance v1.2", finding: "ISP overdue", severity: "Hard stop" }),
      ROW({ individual: "Joseph Brown", agent: "MD DDA Compliance v1.2", finding: "Monitoring overdue", severity: "Hard stop" }),
      ROW({ individual: "Joseph Brown", agent: "MD DDA Compliance v1.2", finding: "Unsigned progress notes", severity: "Warning" }),
    ],
    insight: "All hard stops are concentrated on Joseph Brown's case.",
  },

  "unsigned-notes": {
    stats: [
      { label: "Unsigned total", value: 2, tone: "amber" },
      { label: ">48 hours", value: 2, tone: "red" },
      { label: ">7 days", value: 1, tone: "red" },
      { label: "Case managers affected", value: 1, tone: "neutral" },
    ],
    chartTitle: "Unsigned notes by case manager",
    chart: [{ label: "Kathy Adams", value: 2, tone: "amber" }],
    columns: [
      { key: "individual", label: "Individual" },
      { key: "type", label: "Type" },
      { key: "date", label: "Date of service" },
      { key: "age", label: "Age", align: "right" },
      { key: "billable", label: "Billable" },
    ],
    rows: [
      ROW({ individual: "Joseph Brown", type: "Progress Note", date: "04/19/2026", age: "8 days", billable: "Yes" }),
      ROW({ individual: "Joseph Brown", type: "Progress Note", date: "04/22/2026", age: "5 days", billable: "Yes" }),
    ],
    insight:
      "Both unsigned notes are billable — leaving them unsigned blocks claim submission.",
  },

  "doc-completeness": {
    stats: [
      { label: "Avg completeness", value: "82%", tone: "green" },
      { label: "Below 70%", value: 1, tone: "red" },
      { label: "70-90%", value: 4, tone: "amber" },
      { label: "Above 90%", value: 2, tone: "green" },
    ],
    chartTitle: "Completeness by individual",
    chart: [
      { label: "Joseph Brown", value: 64, tone: "red" },
      { label: "Travis Langston", value: 92, tone: "green" },
      { label: "Dwight Doe", value: 88, tone: "amber" },
      { label: "Mohsin Raza", value: 78, tone: "amber" },
      { label: "Ayesha Khan", value: 95, tone: "green" },
      { label: "Carlos Rivera", value: 81, tone: "amber" },
      { label: "Sara Patel", value: 76, tone: "amber" },
    ],
    columns: [
      { key: "individual", label: "Individual" },
      { key: "complete", label: "Complete", align: "right" },
      { key: "missing", label: "Missing modules" },
    ],
    rows: [
      ROW({ individual: "Joseph Brown", complete: "64%", missing: "Annual assessment, monitoring form" }),
    ],
    insight:
      "Joseph Brown sits well below the average. Closing the assessment and monitoring gaps lifts him to ~88%.",
  },

  "note-volume": {
    stats: [
      { label: "Notes (30d)", value: 42, tone: "blue" },
      { label: "Avg per CM", value: "42", tone: "neutral" },
      { label: "Billable", value: 31, tone: "green" },
      { label: "Non-billable", value: 11, tone: "neutral" },
    ],
    chartTitle: "Notes by case manager",
    chart: [{ label: "Kathy Adams", value: 42, tone: "blue" }],
    columns: [
      { key: "cm", label: "Case Manager" },
      { key: "contact", label: "Contact", align: "right" },
      { key: "progress", label: "Progress", align: "right" },
      { key: "visit", label: "Visits", align: "right" },
    ],
    rows: [ROW({ cm: "Kathy Adams", contact: 18, progress: 16, visit: 8 })],
    insight: "Note volume is concentrated on Kathy Adams — the only active CM.",
  },

  "ambient-summary": {
    stats: [
      { label: "Sessions (30d)", value: 24, tone: "blue" },
      { label: "Avg duration", value: "14 min", tone: "neutral" },
      { label: "Modules updated", value: 73, tone: "green" },
      { label: "AI accuracy", value: "94%", tone: "green" },
    ],
    chartTitle: "Sessions per week",
    chart: [],
    trend: [
      { label: "W1", value: 4 },
      { label: "W2", value: 6 },
      { label: "W3", value: 7 },
      { label: "W4", value: 7 },
    ],
    columns: [
      { key: "week", label: "Week" },
      { key: "sessions", label: "Sessions", align: "right" },
      { key: "modules", label: "Modules updated", align: "right" },
    ],
    rows: [
      ROW({ week: "Week 1", sessions: 4, modules: 12 }),
      ROW({ week: "Week 2", sessions: 6, modules: 19 }),
      ROW({ week: "Week 3", sessions: 7, modules: 21 }),
      ROW({ week: "Week 4", sessions: 7, modules: 21 }),
    ],
    insight:
      "Ambient adoption is trending up week over week. AI extraction accuracy holding above 90%.",
  },

  "incident-summary": {
    stats: [
      { label: "Total", value: 1, tone: "neutral" },
      { label: "Open", value: 1, tone: "amber" },
      { label: "Closed", value: 0, tone: "green" },
      { label: "Reportable", value: 1, tone: "red" },
    ],
    chartTitle: "Incidents by classification",
    chart: [
      { label: "Abuse", value: 1, tone: "red" },
      { label: "Neglect", value: 0, tone: "amber" },
      { label: "Injury", value: 0, tone: "blue" },
    ],
    columns: [
      { key: "id", label: "Incident #" },
      { key: "individual", label: "Individual" },
      { key: "type", label: "Type" },
      { key: "stage", label: "Stage" },
      { key: "status", label: "Status" },
    ],
    rows: [
      ROW({ id: "INC-2026-001", individual: "Joseph Brown", type: "Abuse / Financial", stage: "Investigation", status: "Open" }),
    ],
    insight:
      "1 open incident — financial exploitation allegation for Joseph Brown. Investigation stage active.",
  },

  "incident-aging": {
    stats: [
      { label: "Open total", value: 1, tone: "amber" },
      { label: ">7 days", value: 1, tone: "red" },
      { label: ">30 days", value: 0, tone: "red" },
      { label: "Stalled", value: 0, tone: "red" },
    ],
    chartTitle: "Open incidents by age",
    chart: [{ label: "8-30 days", value: 1, tone: "amber" }],
    columns: [
      { key: "id", label: "Incident #" },
      { key: "individual", label: "Individual" },
      { key: "stage", label: "Stage" },
      { key: "days", label: "Days open", align: "right" },
      { key: "owner", label: "Owner" },
    ],
    rows: [
      ROW({ id: "INC-2026-001", individual: "Joseph Brown", stage: "Investigation", days: 9, owner: "Kathy Adams" }),
    ],
    insight: "Investigation has been open 9 days — within state expectation but should advance.",
  },

  "high-risk": {
    stats: [
      { label: "High risk", value: 2, tone: "red" },
      { label: "Open risk flags", value: 4, tone: "amber" },
      { label: "Recent incidents", value: 1, tone: "red" },
      { label: "Behavioral concerns", value: 1, tone: "amber" },
    ],
    chartTitle: "Risk score distribution",
    chart: [
      { label: "Low (0-3)", value: 5, tone: "green" },
      { label: "Med (4-6)", value: 0, tone: "amber" },
      { label: "High (7+)", value: 2, tone: "red" },
    ],
    columns: [
      { key: "individual", label: "Individual" },
      { key: "score", label: "Risk score", align: "right" },
      { key: "drivers", label: "Drivers" },
    ],
    rows: [
      ROW({ individual: "Joseph Brown", score: 8, drivers: "Open incident, overdue ISP, unsigned notes" }),
      ROW({ individual: "Mohsin Raza", score: 7, drivers: "Visit overdue, auth at 88%" }),
    ],
    insight: "Two individuals exceed the high-risk threshold. Joseph Brown is the highest risk in caseload.",
  },

  "hrst-tracking": {
    stats: [
      { label: "Tracked", value: 1, tone: "blue" },
      { label: "≥ 3 (nursing review)", value: 0, tone: "amber" },
      { label: "Annual update overdue", value: 1, tone: "red" },
      { label: "Stable", value: 1, tone: "green" },
    ],
    chartTitle: "HRST score over time — Joseph Brown",
    chart: [],
    trend: [
      { label: "2022", value: 2 },
      { label: "2023", value: 2 },
      { label: "2024", value: 2 },
      { label: "2025", value: 2 },
      { label: "2026", value: 2 },
    ],
    columns: [
      { key: "individual", label: "Individual" },
      { key: "instrument", label: "Instrument" },
      { key: "score", label: "Score", align: "right" },
      { key: "date", label: "Date" },
    ],
    rows: [
      ROW({ individual: "Joseph Brown", instrument: "HRST", score: 2, date: "09/01/2022" }),
    ],
    insight: "Joseph Brown's HRST score has been stable but the annual update is overdue.",
  },

  "billing-summary": {
    stats: [
      { label: "Submitted", value: 5, tone: "blue" },
      { label: "Paid", value: 4, tone: "green" },
      { label: "Denied", value: 1, tone: "red" },
      { label: "Pending", value: 0, tone: "neutral" },
      { label: "Total billed", value: "$290.00", tone: "neutral" },
      { label: "Total paid", value: "$203.00", tone: "green" },
    ],
    chartTitle: "Claim status breakdown",
    chart: [
      { label: "Paid", value: 4, tone: "green" },
      { label: "Denied", value: 1, tone: "red" },
    ],
    columns: [
      { key: "date", label: "Date" },
      { key: "individual", label: "Individual" },
      { key: "service", label: "Service" },
      { key: "units", label: "Units", align: "right" },
      { key: "amount", label: "Amount", align: "right" },
      { key: "status", label: "Status" },
    ],
    rows: [
      ROW({ date: "03/16/2026", individual: "Joseph Brown", service: "T2022", units: 3, amount: "$87.00", status: "Paid" }),
      ROW({ date: "01/26/2026", individual: "Joseph Brown", service: "T2022", units: 2, amount: "$58.00", status: "Paid" }),
      ROW({ date: "10/13/2025", individual: "Joseph Brown", service: "T2022", units: 4, amount: "$0.00", status: "Denied" }),
      ROW({ date: "10/10/2025", individual: "Joseph Brown", service: "T2022", units: 3, amount: "$87.00", status: "Paid" }),
      ROW({ date: "09/01/2024", individual: "Joseph Brown", service: "T2022", units: 2, amount: "$58.00", status: "Paid" }),
    ],
    insight: "Denial rate is 20% — driven by a single missing-PA denial on 10/13/2025.",
  },

  "denial-analysis": {
    stats: [
      { label: "Denied claims", value: 1, tone: "red" },
      { label: "$ impact", value: "$87.00", tone: "red" },
      { label: "Top reason", value: "Missing PA", tone: "amber" },
      { label: "Top service", value: "T2022", tone: "amber" },
    ],
    chartTitle: "Denials by reason",
    chart: [
      { label: "Missing prior authorization", value: 1, tone: "red" },
      { label: "Service not covered", value: 0, tone: "amber" },
      { label: "Timely filing exceeded", value: 0, tone: "amber" },
    ],
    columns: [
      { key: "reason", label: "Reason" },
      { key: "count", label: "Count", align: "right" },
      { key: "impact", label: "$ impact", align: "right" },
      { key: "top_service", label: "Top service" },
    ],
    rows: [
      ROW({ reason: "Missing prior authorization", count: 1, impact: "$87.00", top_service: "T2022" }),
    ],
    insight:
      "All denials trace to missing prior authorization on T2022. Tightening PA verification at note signing eliminates this category.",
  },

  "auth-utilization": {
    stats: [
      { label: "Active auths", value: 7, tone: "green" },
      { label: ">85% used", value: 1, tone: "amber" },
      { label: "100% used", value: 0, tone: "red" },
      { label: "Under-utilized (<25%)", value: 1, tone: "blue" },
    ],
    chartTitle: "Utilization rate by individual",
    chart: [
      { label: "Joseph Brown", value: 18, tone: "blue" },
      { label: "Travis Langston", value: 65, tone: "green" },
      { label: "Mohsin Raza", value: 88, tone: "amber" },
      { label: "Sara Patel", value: 42, tone: "green" },
    ],
    columns: [
      { key: "individual", label: "Individual" },
      { key: "service", label: "Service" },
      { key: "authorized", label: "Authorized", align: "right" },
      { key: "used", label: "Used", align: "right" },
      { key: "rate", label: "Rate", align: "right" },
    ],
    rows: [
      ROW({ individual: "Joseph Brown", service: "T2022", authorized: 40, used: 7, rate: "18%" }),
      ROW({ individual: "Mohsin Raza", service: "T2017", authorized: 80, used: 70, rate: "88%" }),
      ROW({ individual: "Travis Langston", service: "T2022", authorized: 40, used: 26, rate: "65%" }),
    ],
    insight:
      "Mohsin Raza will hit 100% within 14 days at current pace — submit renewal now. Joseph Brown is under-utilizing — review whether service intensity matches need.",
  },

  "unbilled-notes": {
    stats: [
      { label: "Unbilled signed notes", value: 0, tone: "green" },
      { label: "Est. revenue at risk", value: "$0", tone: "green" },
      { label: ">7 days unsubmitted", value: 0, tone: "amber" },
      { label: ">14 days", value: 0, tone: "red" },
    ],
    chartTitle: "Unbilled notes by aging",
    chart: [],
    columns: [
      { key: "date", label: "Date" },
      { key: "individual", label: "Individual" },
      { key: "service", label: "Service" },
      { key: "amount", label: "Est. amount", align: "right" },
    ],
    rows: [],
    insight: "No revenue leakage detected. All signed billable notes have generated billing events.",
  },

  "goal-progress": {
    stats: [
      { label: "Total goals", value: 32, tone: "neutral" },
      { label: "On track", value: 21, tone: "green" },
      { label: "Off track", value: 7, tone: "amber" },
      { label: "Achieved", value: 4, tone: "blue" },
    ],
    chartTitle: "Goal status",
    chart: [
      { label: "On track", value: 21, tone: "green" },
      { label: "Off track", value: 7, tone: "amber" },
      { label: "Achieved", value: 4, tone: "blue" },
    ],
    columns: [
      { key: "domain", label: "Domain" },
      { key: "total", label: "Total", align: "right" },
      { key: "ontrack", label: "On track", align: "right" },
      { key: "rate", label: "Rate", align: "right" },
    ],
    rows: [
      ROW({ domain: "Community", total: 9, ontrack: 7, rate: "78%" }),
      ROW({ domain: "Health", total: 8, ontrack: 6, rate: "75%" }),
      ROW({ domain: "Employment", total: 5, ontrack: 3, rate: "60%" }),
      ROW({ domain: "Daily Living", total: 10, ontrack: 5, rate: "50%" }),
    ],
    insight:
      "Daily Living domain is trailing other domains — consider focused review of skill-building supports.",
  },

  "score-trends": {
    stats: [
      { label: "Avg LOC", value: "Moderate", tone: "amber" },
      { label: "Improving", value: 0, tone: "green" },
      { label: "Stable", value: 1, tone: "blue" },
      { label: "Declining", value: 0, tone: "red" },
    ],
    chartTitle: "Average LOC score over time",
    chart: [],
    trend: [
      { label: "2022", value: 42 },
      { label: "2023", value: 42 },
      { label: "2024", value: 42 },
      { label: "2025", value: 42 },
      { label: "2026", value: 42 },
    ],
    columns: [
      { key: "individual", label: "Individual" },
      { key: "last_score", label: "Last score", align: "right" },
      { key: "loc", label: "LOC" },
      { key: "trend", label: "Trend" },
    ],
    rows: [ROW({ individual: "Joseph Brown", last_score: 42, loc: "Moderate", trend: "Stable" })],
    insight: "Population LOC has been stable. Limited data — only 1 individual has historical scores on file.",
  },

  "referral-outcomes": {
    stats: [
      { label: "Pending", value: 3, tone: "amber" },
      { label: "Connected", value: 8, tone: "green" },
      { label: "Closed", value: 2, tone: "neutral" },
      { label: "Unsuccessful", value: 1, tone: "red" },
    ],
    chartTitle: "Referral outcomes",
    chart: [
      { label: "Connected", value: 8, tone: "green" },
      { label: "Pending", value: 3, tone: "amber" },
      { label: "Closed", value: 2, tone: "blue" },
      { label: "Unsuccessful", value: 1, tone: "red" },
    ],
    columns: [
      { key: "individual", label: "Individual" },
      { key: "referral", label: "Referral" },
      { key: "status", label: "Status" },
    ],
    rows: [
      ROW({ individual: "Joseph Brown", referral: "Behavioral health", status: "Connected" }),
      ROW({ individual: "Mohsin Raza", referral: "Vocational rehab", status: "Pending" }),
    ],
    insight: "Connection rate 57% — above national average for IDD referrals.",
  },

  "satisfaction-trends": {
    stats: [
      { label: "Avg satisfaction", value: "4.3 / 5", tone: "green" },
      { label: "Responses (90d)", value: 22, tone: "blue" },
      { label: "Detractors", value: 1, tone: "amber" },
      { label: "Promoters", value: 14, tone: "green" },
    ],
    chartTitle: "Satisfaction trend",
    chart: [],
    trend: [
      { label: "Q1", value: 4.1 },
      { label: "Q2", value: 4.2 },
      { label: "Q3", value: 4.3 },
      { label: "Q4", value: 4.3 },
    ],
    columns: [
      { key: "quarter", label: "Quarter" },
      { key: "responses", label: "Responses", align: "right" },
      { key: "avg", label: "Avg", align: "right" },
    ],
    rows: [
      ROW({ quarter: "Q1 2026", responses: 22, avg: "4.3" }),
    ],
    insight: "Satisfaction trending up across quarters.",
  },

  "cm-productivity": {
    stats: [
      { label: "Notes (30d)", value: 42, tone: "blue" },
      { label: "Visits (30d)", value: 8, tone: "green" },
      { label: "Tasks closed", value: 38, tone: "green" },
      { label: "Compliance rate", value: "84%", tone: "amber" },
    ],
    chartTitle: "Productivity by case manager",
    chart: [{ label: "Kathy Adams", value: 88, tone: "blue" }],
    columns: [
      { key: "cm", label: "Case Manager" },
      { key: "notes", label: "Notes", align: "right" },
      { key: "visits", label: "Visits", align: "right" },
      { key: "tasks", label: "Tasks closed", align: "right" },
      { key: "compliance", label: "Compliance", align: "right" },
    ],
    rows: [
      ROW({ cm: "Kathy Adams", notes: 42, visits: 8, tasks: 38, compliance: "84%" }),
    ],
    insight: "Productivity is healthy. Compliance gap concentrated in Joseph Brown's record.",
  },

  "training-compliance": {
    stats: [
      { label: "Total staff", value: 4, tone: "neutral" },
      { label: "Up to date", value: 4, tone: "green" },
      { label: "Due 30d", value: 1, tone: "amber" },
      { label: "Overdue", value: 0, tone: "red" },
    ],
    chartTitle: "Training status",
    chart: [
      { label: "Up to date", value: 4, tone: "green" },
      { label: "Due 30d", value: 1, tone: "amber" },
    ],
    columns: [
      { key: "staff", label: "Staff" },
      { key: "course", label: "Course" },
      { key: "due", label: "Next due" },
    ],
    rows: [
      ROW({ staff: "Kathy Adams", course: "HIPAA refresher", due: "05/15/2026" }),
    ],
    insight: "All staff are current. One refresher due in 18 days.",
  },
};

export function getReportOutput(id: string): ReportOutput {
  return (
    OUTPUTS[id] ?? {
      stats: [],
      chartTitle: "No data",
      chart: [],
      columns: [],
      rows: [],
      insight: "No data available for this report yet.",
    }
  );
}

// ---------- Saved & scheduled reports ----------

export interface SavedReport {
  id: string;
  name: string;
  basedOn: string; // report id
  filtersSummary: string;
  lastRun: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  basedOn: string;
  frequency: "Daily" | "Weekly" | "Monthly" | "Quarterly";
  nextRun: string;
  recipients: string[];
  format: "PDF" | "CSV" | "Both";
  status: "Active" | "Paused";
}

export const savedReports: SavedReport[] = [
  {
    id: "saved-1",
    name: "Joseph Brown — Compliance & Risk",
    basedOn: "compliance-runs",
    filtersSummary: "Individual: Joseph Brown · Last 90 days",
    lastRun: "04/26/2026",
  },
];

export const scheduledReports: ScheduledReport[] = [
  {
    id: "sched-1",
    name: "Weekly PCP Compliance",
    basedOn: "pcp-compliance",
    frequency: "Weekly",
    nextRun: "Mon 04/29/2026 8:00 AM",
    recipients: ["kathy.adams@org.example", "supervisor@org.example"],
    format: "PDF",
    status: "Active",
  },
  {
    id: "sched-2",
    name: "Monthly Billing Activity",
    basedOn: "billing-summary",
    frequency: "Monthly",
    nextRun: "05/01/2026 7:00 AM",
    recipients: ["billing@org.example"],
    format: "Both",
    status: "Active",
  },
];

// ---------- Audit log ----------

export type AuditAction =
  | "View"
  | "Create"
  | "Edit"
  | "Delete"
  | "Sign"
  | "Submit"
  | "Export"
  | "Print"
  | "Login"
  | "Logout"
  | "Override"
  | "Permission change"
  | "Config change";

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: AuditAction;
  module: string;
  record: string;
  individual?: string;
  ip: string;
  details?: string;
}

export const auditLog: AuditEntry[] = [
  {
    id: "a-1",
    timestamp: "04/27/2026 08:14:02",
    user: "Kathy Adams",
    action: "Login",
    module: "Auth",
    record: "—",
    ip: "10.0.4.21",
  },
  {
    id: "a-2",
    timestamp: "04/27/2026 08:18:44",
    user: "Kathy Adams",
    action: "View",
    module: "eChart",
    record: "Person #1",
    individual: "Joseph Brown",
    ip: "10.0.4.21",
    details: "Viewed Profile, Care Plan, Progress Notes",
  },
  {
    id: "a-3",
    timestamp: "04/27/2026 08:24:11",
    user: "Kathy Adams",
    action: "Create",
    module: "Progress Note",
    record: "PN-2026-118",
    individual: "Joseph Brown",
    ip: "10.0.4.21",
    details: "Created billable progress note · Service T2022 · 3 units",
  },
  {
    id: "a-4",
    timestamp: "04/26/2026 16:02:55",
    user: "Kathy Adams",
    action: "Sign",
    module: "Visit Summary",
    record: "VS-2026-042",
    individual: "Travis Langston",
    ip: "10.0.4.21",
  },
  {
    id: "a-5",
    timestamp: "04/26/2026 14:11:09",
    user: "Kathy Adams",
    action: "Edit",
    module: "Profile",
    record: "Person #4",
    individual: "Mohsin Raza",
    ip: "10.0.4.21",
    details: "phone: '555-0140' → '555-0188'",
  },
  {
    id: "a-6",
    timestamp: "04/26/2026 11:48:30",
    user: "Babar Nawaz",
    action: "Submit",
    module: "Assessment",
    record: "A-001",
    individual: "Joseph Brown",
    ip: "10.0.4.45",
    details: "Annual Reassessment submitted · Score 42 · LOC Moderate",
  },
  {
    id: "a-7",
    timestamp: "04/25/2026 09:22:18",
    user: "Admin User",
    action: "Permission change",
    module: "Settings",
    record: "User: Babar Nawaz",
    ip: "10.0.4.10",
    details: "Role changed: case_manager → supervisor",
  },
  {
    id: "a-8",
    timestamp: "04/24/2026 17:30:01",
    user: "Kathy Adams",
    action: "Export",
    module: "Reports",
    record: "PCP Compliance Dashboard",
    ip: "10.0.4.21",
    details: "CSV export · 7 rows",
  },
  {
    id: "a-9",
    timestamp: "04/24/2026 15:05:44",
    user: "Admin User",
    action: "Override",
    module: "Compliance Agent",
    record: "Run R-2026-204",
    individual: "Joseph Brown",
    ip: "10.0.4.10",
    details: "Hard stop overridden · Justification: 'Awaiting state response'",
  },
  {
    id: "a-10",
    timestamp: "04/24/2026 09:00:12",
    user: "Kathy Adams",
    action: "Login",
    module: "Auth",
    record: "—",
    ip: "10.0.4.21",
  },
];

// ---------- Bulk export presets ----------

export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  formats: ("CSV" | "JSON")[];
  filters: string[];
  adminOnly?: boolean;
}

export const exportPresets: ExportPreset[] = [
  {
    id: "exp-caseload",
    name: "Full Caseload Export",
    description: "All individuals with profile data.",
    formats: ["CSV", "JSON"],
    filters: ["Program", "Status", "Date range"],
  },
  {
    id: "exp-notes",
    name: "Notes & Documentation Export",
    description: "All notes by type within date range.",
    formats: ["CSV"],
    filters: ["Note type", "Case manager", "Date range", "Billable status"],
  },
  {
    id: "exp-assessments",
    name: "Assessment Data Export",
    description: "All completed assessments with scores.",
    formats: ["CSV", "JSON"],
    filters: ["Template", "Date range", "LOC level"],
  },
  {
    id: "exp-compliance",
    name: "Compliance Data Export",
    description: "All compliance runs and findings.",
    formats: ["CSV"],
    filters: ["Agent", "Date range", "Status"],
  },
  {
    id: "exp-billing",
    name: "Billing Data Export",
    description: "All billing events and claim statuses for BI tools.",
    formats: ["CSV"],
    filters: ["Date range", "Status", "Service code"],
  },
  {
    id: "exp-full",
    name: "Full System Export",
    description: "All data across all modules. Requires admin approval.",
    formats: ["JSON"],
    filters: [],
    adminOnly: true,
  },
];

// ---------- Field catalog for the Report Builder ----------

export interface BuilderField {
  source: string;
  fields: string[];
}

export const BUILDER_FIELDS: BuilderField[] = [
  {
    source: "Individual / Profile",
    fields: ["Individual ID", "First Name", "Last Name", "DOB", "Age", "Gender", "County", "Program", "Service Category", "Case Manager", "Admission Date", "Status", "Risk Score", "Medicaid ID", "MA Status"],
  },
  {
    source: "Contact Notes",
    fields: ["Note Date", "Activity Type", "Is Billable", "Units", "Duration", "Contact Type", "Status", "Case Manager", "Service Code"],
  },
  {
    source: "Progress Notes",
    fields: ["Note Date", "Activity Type", "Is Billable", "Units", "Goal Linked", "Status", "Case Manager"],
  },
  {
    source: "Visit Summaries",
    fields: ["Visit Date", "Location", "Duration", "Next Visit Date", "Status", "Case Manager"],
  },
  {
    source: "Monitoring Forms",
    fields: ["Review Type", "Due Date", "Complete Date", "Status", "Form Score", "Case Manager"],
  },
  {
    source: "Care Plan / ISP",
    fields: ["Plan ID", "Status", "Effective Date", "Expiration Date", "Days Overdue", "Goals Count", "Goals On Track", "Goals Off Track"],
  },
  {
    source: "Assessments",
    fields: ["Assessment Date", "Template", "Type", "Overall Score", "LOC", "Completed By"],
  },
  {
    source: "Eligibility Verification",
    fields: ["MA Status", "Verification Date", "Redetermination Date", "Days Until Renewal"],
  },
  {
    source: "Incidents",
    fields: ["Incident Date", "Type", "Classification", "Stage", "Status", "Days Open", "Person Responsible"],
  },
  {
    source: "Tasks / My Work",
    fields: ["Task Name", "Source", "Due Date", "Status", "Days Overdue", "Staff"],
  },
  {
    source: "Billing",
    fields: ["Claim Date", "Service Code", "Units", "Amount Billed", "Amount Paid", "Status", "Denial Reason"],
  },
  {
    source: "Workflow",
    fields: ["Workflow Name", "Trigger Date", "Completion %", "Status", "Days Active"],
  },
];
