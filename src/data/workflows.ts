// Workflow Manager data layer.
// Event-driven, multi-step workflows attached to an individual.

export type WorkflowStatus = "Active" | "Completed" | "Terminated";
export type StepStatus = "Pending" | "In Progress" | "Completed" | "Overdue";

export interface WorkflowStep {
  id: string;
  number: number;
  title: string;
  description: string;
  status: StepStatus;
  dueDate?: string; // MM/DD/YYYY
  staffResponsible?: string;
  linkedModuleSlug?: string; // slug used by EChart to navigate
  linkedModuleLabel?: string;
  aiDraftReady?: boolean;
  aiDraftBody?: string;
  completedAt?: string;
  completionNotes?: string;
}

export interface WorkflowRecord {
  id: string;
  personId: string;
  personName: string;
  title: string;
  triggerDate: string; // MM/DD/YYYY
  dueDate?: string;
  createdOn: string; // MM/DD/YYYY HH:MM AM/PM
  status: WorkflowStatus;
  steps: WorkflowStep[];
  notes?: string;
  terminationReason?: string;
  terminationNotes?: string;
  completedDate?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  triggerEvent: string;
  defaultDueDays?: number;
  active: boolean;
  steps: Array<{
    title: string;
    description: string;
    linkedModuleSlug?: string;
    linkedModuleLabel?: string;
    defaultAssignee?: string;
    dueOffsetDays?: number;
    required: boolean;
  }>;
  linkedComplianceRule?: string; // future Engine 2 hook
}

export const WORKFLOW_TYPES = [
  "Case Management Workflow",
  "Medicaid Recertification",
  "ISP Renewal Workflow",
  "Intake / Admission Workflow",
  "Incident Follow-up Workflow",
  "Service Change Workflow",
  "Discharge / Transition Workflow",
  "Test Workflow",
] as const;

export const TERMINATION_REASONS = [
  "Duplicate workflow",
  "Individual discharged",
  "Workflow no longer applicable",
  "Error",
  "Other",
] as const;

// ----- Mock workflows -----

const josephCaseMgmt: WorkflowRecord = {
  id: "5377",
  personId: "1",
  personName: "Joseph Brown",
  title: "Case Management Workflow",
  triggerDate: "04/22/2026",
  createdOn: "04/23/2026 04:15 PM",
  status: "Active",
  notes: "Triggered after intake review meeting.",
  steps: [
    {
      id: "5377-s1",
      number: 1,
      title: "Complete initial assessment",
      description:
        "Conduct the structured intake assessment using the Monitoring Form module. Capture baseline answers across all required domains.",
      status: "Overdue",
      dueDate: "04/25/2026",
      staffResponsible: "Anyone",
      linkedModuleSlug: "monitoring-form",
      linkedModuleLabel: "Monitoring Form",
      aiDraftReady: true,
      aiDraftBody:
        "I prepared a draft monitoring form using prior records and the 04/27 ambient session. 92% of fields pre-filled.",
    },
    {
      id: "5377-s2",
      number: 2,
      title: "Set up case management plan",
      description:
        "Create or update Joseph's care management plan with goals, services, and follow-up cadence based on the assessment results.",
      status: "Pending",
      dueDate: "05/06/2026",
      staffResponsible: "Anyone",
      linkedModuleSlug: "care-plan",
      linkedModuleLabel: "Care Plan / ISP",
      aiDraftReady: true,
      aiDraftBody:
        "I drafted goals for Community Integration and Employment Exploration based on the ambient session. Review in Care Plan / ISP.",
    },
  ],
};

// Mock data for other individuals on the global workflow view.
const ashleyIspRenewal: WorkflowRecord = {
  id: "5380",
  personId: "7",
  personName: "Ashley Walker",
  title: "ISP Renewal Workflow",
  triggerDate: "04/15/2026",
  dueDate: "06/15/2026",
  createdOn: "04/15/2026 09:02 AM",
  status: "Active",
  steps: [
    {
      id: "5380-s1",
      number: 1,
      title: "Review current ISP",
      description: "Review Ashley's current ISP for goals due to roll over and identify any obsolete services.",
      status: "Completed",
      dueDate: "04/22/2026",
      staffResponsible: "Babar Nawaz CM",
      linkedModuleSlug: "care-plan",
      linkedModuleLabel: "Care Plan / ISP",
      completedAt: "04/20/2026",
    },
    {
      id: "5380-s2",
      number: 2,
      title: "Schedule ISP meeting",
      description: "Schedule the annual ISP meeting with all required participants.",
      status: "In Progress",
      dueDate: "05/01/2026",
      staffResponsible: "Babar Nawaz CM",
      linkedModuleSlug: "visit-summary",
      linkedModuleLabel: "Visit Summary",
      aiDraftReady: true,
    },
    {
      id: "5380-s3",
      number: 3,
      title: "Conduct ISP meeting (ambient recommended)",
      description: "Run the ISP meeting. Use Ambient Listening to capture goals and concerns automatically.",
      status: "Pending",
      dueDate: "05/15/2026",
      staffResponsible: "Anyone",
    },
    {
      id: "5380-s4",
      number: 4,
      title: "Draft updated ISP",
      description: "Draft the updated plan from meeting outputs.",
      status: "Pending",
      dueDate: "05/30/2026",
      linkedModuleSlug: "care-plan",
      linkedModuleLabel: "Care Plan / ISP",
    },
    {
      id: "5380-s5",
      number: 5,
      title: "Obtain signatures",
      description: "Collect e-signatures from individual, guardian, and team.",
      status: "Pending",
      dueDate: "06/05/2026",
      linkedModuleSlug: "care-plan",
      linkedModuleLabel: "Care Plan / ISP",
    },
    {
      id: "5380-s6",
      number: 6,
      title: "Submit to state (if required)",
      description: "Upload to state portal where applicable.",
      status: "Pending",
      dueDate: "06/10/2026",
    },
    {
      id: "5380-s7",
      number: 7,
      title: "Update compliance status",
      description: "Mark ISP as renewed in compliance tracker.",
      status: "Pending",
      dueDate: "06/12/2026",
    },
    {
      id: "5380-s8",
      number: 8,
      title: "Schedule next annual review",
      description: "Add next annual review date to the calendar.",
      status: "Pending",
      dueDate: "06/15/2026",
    },
  ],
};

const travisRecert: WorkflowRecord = {
  id: "5381",
  personId: "2",
  personName: "Travis Langston",
  title: "Medicaid Recertification",
  triggerDate: "04/10/2026",
  dueDate: "06/10/2026",
  createdOn: "04/10/2026 11:45 AM",
  status: "Active",
  steps: [
    {
      id: "5381-s1",
      number: 1,
      title: "Verify current MA status",
      description: "Check current Medicaid eligibility and document MA number.",
      status: "Completed",
      dueDate: "04/15/2026",
      linkedModuleSlug: "eligibility",
      linkedModuleLabel: "Eligibility Verification",
      completedAt: "04/12/2026",
    },
    {
      id: "5381-s2",
      number: 2,
      title: "Gather required documents",
      description: "Collect income verification, residency, and identity documents.",
      status: "In Progress",
      dueDate: "05/01/2026",
    },
    {
      id: "5381-s3",
      number: 3,
      title: "Submit recertification application",
      description: "Submit application via state portal.",
      status: "Pending",
      dueDate: "05/15/2026",
    },
    {
      id: "5381-s4",
      number: 4,
      title: "Confirm approval and update system",
      description: "Confirm approval letter and update Eligibility Verification record.",
      status: "Pending",
      dueDate: "06/10/2026",
      linkedModuleSlug: "eligibility",
      linkedModuleLabel: "Eligibility Verification",
    },
  ],
};

const mohsinIncident: WorkflowRecord = {
  id: "5382",
  personId: "4",
  personName: "Mohsin Raza",
  title: "Incident Follow-up Workflow",
  triggerDate: "04/05/2026",
  dueDate: "04/19/2026",
  createdOn: "04/05/2026 02:10 PM",
  status: "Active",
  steps: [
    {
      id: "5382-s1",
      number: 1,
      title: "Document incident details",
      description: "Capture all incident facts in the Incident Reporting module.",
      status: "Completed",
      dueDate: "04/06/2026",
      completedAt: "04/05/2026",
    },
    {
      id: "5382-s2",
      number: 2,
      title: "Notify required parties",
      description: "Notify guardian, supervisor, and state if reportable.",
      status: "Overdue",
      dueDate: "04/07/2026",
    },
    {
      id: "5382-s3",
      number: 3,
      title: "Conduct follow-up review",
      description: "Convene team to review and capture corrective actions.",
      status: "Pending",
      dueDate: "04/19/2026",
    },
  ],
};

let allWorkflows: WorkflowRecord[] = [
  josephCaseMgmt,
  ashleyIspRenewal,
  travisRecert,
  mohsinIncident,
];

export function getWorkflowsForPerson(personId: string): WorkflowRecord[] {
  return allWorkflows.filter((w) => w.personId === personId);
}

export function getAllWorkflows(): WorkflowRecord[] {
  return allWorkflows;
}

export function getWorkflow(id: string): WorkflowRecord | undefined {
  return allWorkflows.find((w) => w.id === id);
}

export function progressFraction(w: WorkflowRecord): { done: number; total: number } {
  const done = w.steps.filter((s) => s.status === "Completed").length;
  return { done, total: w.steps.length };
}

export function workflowProgressTone(w: WorkflowRecord): "green" | "amber" | "red" {
  if (w.status !== "Active") return "green";
  const overdue = w.steps.some((s) => s.status === "Overdue");
  if (overdue) return "red";
  const { done, total } = progressFraction(w);
  if (total > 0 && done === 0) return "amber";
  return "green";
}

// ----- Workflow templates -----

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "tpl-cm",
    name: "Case Management Workflow",
    description: "Standard intake-to-plan workflow for new case management episodes.",
    triggerEvent: "New case management episode",
    defaultDueDays: 14,
    active: true,
    steps: [
      {
        title: "Complete initial assessment",
        description: "Run the intake assessment in the Monitoring Form module.",
        linkedModuleSlug: "monitoring-form",
        linkedModuleLabel: "Monitoring Form",
        dueOffsetDays: 3,
        required: true,
      },
      {
        title: "Set up case management plan",
        description: "Build the care management plan with goals and services.",
        linkedModuleSlug: "care-plan",
        linkedModuleLabel: "Care Plan / ISP",
        dueOffsetDays: 14,
        required: true,
      },
    ],
  },
  {
    id: "tpl-ma",
    name: "Medicaid Recertification",
    description: "Tracks the full Medicaid recertification cycle.",
    triggerEvent: "Medicaid redetermination due in 60 days",
    defaultDueDays: 60,
    active: true,
    steps: [
      { title: "Verify current MA status", description: "Confirm current eligibility.", linkedModuleSlug: "eligibility", linkedModuleLabel: "Eligibility Verification", dueOffsetDays: 5, required: true },
      { title: "Gather required documents", description: "Collect income, ID, residency.", dueOffsetDays: 21, required: true },
      { title: "Submit recertification application", description: "File via state portal.", dueOffsetDays: 35, required: true },
      { title: "Confirm approval and update system", description: "Update Eligibility Verification record.", linkedModuleSlug: "eligibility", linkedModuleLabel: "Eligibility Verification", dueOffsetDays: 60, required: true },
    ],
  },
  {
    id: "tpl-isp",
    name: "ISP Renewal Workflow",
    description: "End-to-end ISP renewal including meeting, draft, and signatures.",
    triggerEvent: "ISP renewal approaching (60 days out)",
    defaultDueDays: 60,
    active: true,
    steps: [
      { title: "Review current ISP", description: "Audit the current ISP for changes.", linkedModuleSlug: "care-plan", linkedModuleLabel: "Care Plan / ISP", dueOffsetDays: 7, required: true },
      { title: "Schedule ISP meeting", description: "Coordinate participants and schedule.", linkedModuleSlug: "visit-summary", linkedModuleLabel: "Visit Summary", dueOffsetDays: 14, required: true },
      { title: "Conduct ISP meeting (ambient recommended)", description: "Run the meeting and capture transcript.", dueOffsetDays: 28, required: true },
      { title: "Draft updated ISP", description: "Draft the new plan from meeting outputs.", linkedModuleSlug: "care-plan", linkedModuleLabel: "Care Plan / ISP", dueOffsetDays: 40, required: true },
      { title: "Obtain signatures", description: "Collect e-signatures.", linkedModuleSlug: "care-plan", linkedModuleLabel: "Care Plan / ISP", dueOffsetDays: 50, required: true },
      { title: "Submit to state (if required)", description: "Upload to state portal.", dueOffsetDays: 55, required: false },
      { title: "Update compliance status", description: "Mark ISP as renewed in compliance tracker.", dueOffsetDays: 58, required: true },
      { title: "Schedule next annual review", description: "Place next annual review on calendar.", dueOffsetDays: 60, required: true },
    ],
  },
];

// ----- Mutations (in-memory) -----

export function startWorkflow(args: {
  personId: string;
  personName: string;
  templateId: string;
  triggerDate: string;
  notes?: string;
}): WorkflowRecord {
  const tpl = workflowTemplates.find((t) => t.id === args.templateId)
    ?? workflowTemplates[0];
  const newId = `${5400 + allWorkflows.length}`;
  const created = new Date();
  const createdLabel = `${args.triggerDate} ${created.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  const wf: WorkflowRecord = {
    id: newId,
    personId: args.personId,
    personName: args.personName,
    title: tpl.name,
    triggerDate: args.triggerDate,
    dueDate: undefined,
    createdOn: createdLabel,
    status: "Active",
    notes: args.notes,
    steps: tpl.steps.map((s, idx) => ({
      id: `${newId}-s${idx + 1}`,
      number: idx + 1,
      title: s.title,
      description: s.description,
      status: idx === 0 ? "In Progress" : "Pending",
      dueDate: undefined,
      staffResponsible: s.defaultAssignee ?? "Anyone",
      linkedModuleSlug: s.linkedModuleSlug,
      linkedModuleLabel: s.linkedModuleLabel,
      aiDraftReady: !!s.linkedModuleSlug,
    })),
  };
  allWorkflows = [wf, ...allWorkflows];
  return wf;
}

export function completeStep(workflowId: string, stepId: string, notes?: string) {
  const wf = allWorkflows.find((w) => w.id === workflowId);
  if (!wf) return;
  const step = wf.steps.find((s) => s.id === stepId);
  if (!step) return;
  step.status = "Completed";
  step.completedAt = new Date().toLocaleDateString("en-US");
  step.completionNotes = notes;
  // Move next pending step to in-progress
  const nextPending = wf.steps.find((s) => s.status === "Pending");
  if (nextPending) nextPending.status = "In Progress";
}

export function completeWorkflow(workflowId: string) {
  const wf = allWorkflows.find((w) => w.id === workflowId);
  if (!wf) return;
  wf.status = "Completed";
  wf.completedDate = new Date().toLocaleDateString("en-US");
}

export function terminateWorkflow(workflowId: string, reason: string, notes: string) {
  const wf = allWorkflows.find((w) => w.id === workflowId);
  if (!wf) return;
  wf.status = "Terminated";
  wf.terminationReason = reason;
  wf.terminationNotes = notes;
}

// ----- Global summary helpers -----

export interface GlobalWorkflowSummary {
  totalActive: number;
  overdue: number;
  dueThisWeek: number;
  completedThisMonth: number;
}

export function globalSummary(): GlobalWorkflowSummary {
  const active = allWorkflows.filter((w) => w.status === "Active");
  const overdue = active.filter((w) => w.steps.some((s) => s.status === "Overdue")).length;
  // Mock: count workflows whose first incomplete step is due within 7 days
  const dueThisWeek = active.filter((w) => {
    const nextDue = w.steps.find((s) => s.status !== "Completed");
    return nextDue?.dueDate && /04\/(2[5-9]|3[01])|05\/0[1-2]/.test(nextDue.dueDate);
  }).length;
  return {
    totalActive: active.length,
    overdue,
    dueThisWeek,
    completedThisMonth: 0,
  };
}
