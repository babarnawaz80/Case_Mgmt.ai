// ─── Case Management Template mock data ───────────────────────────────────
// Single source of truth shared between PersonCaseManagement and SettingsTemplates.

export type Recurrence = "one-time" | "monthly" | "quarterly" | "semi-annual" | "annual";
export type OffsetFrom = "admission_date" | "annual_plan_date" | "trigger_date";
export type StaffRole = "Anyone" | "Case Manager" | "Supervisor";

export interface TemplateTask {
  id: string;
  title: string;
  description: string;
  linkedModule: string | null;
  recurrence: Recurrence;
  dueDateOffsetDays: number;
  offsetFrom: OffsetFrom;
  required: boolean;
  staffRole: StaffRole;
}

export interface CaseTemplate {
  id: string;
  name: string;
  description: string;
  applicablePrograms: string[];
  applicableStates: string[];
  version: string;
  status: "active" | "archived";
  tasks: TemplateTask[];
}

export const CASE_TEMPLATES: CaseTemplate[] = [
  {
    id: "tmpl-001",
    name: "Community Coordination",
    description: "Standard coordination template for community-based waiver individuals.",
    applicablePrograms: ["DD Waiver", "HCBS"],
    applicableStates: ["Indiana", "New Jersey"],
    version: "v2.1",
    status: "active",
    tasks: [
      {
        id: "tmpl-001-t1",
        title: "Schedule quarterly visit",
        description: "Schedule the upcoming quarterly visit with the individual.",
        linkedModule: "Visit Summary",
        recurrence: "quarterly",
        dueDateOffsetDays: 90,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-001-t2",
        title: "Complete monitoring form",
        description: "Complete the quarterly monitoring form.",
        linkedModule: "Monitoring Form",
        recurrence: "quarterly",
        dueDateOffsetDays: 90,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-001-t3",
        title: "Quarterly visit",
        description: "Conduct the in-person quarterly visit.",
        linkedModule: "Visit Summary",
        recurrence: "quarterly",
        dueDateOffsetDays: 90,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-001-t4",
        title: "Verify MA status",
        description: "Verify the individual's Medicaid status.",
        linkedModule: "Eligibility Verification",
        recurrence: "quarterly",
        dueDateOffsetDays: 90,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-001-t5",
        title: "Complete MA redetermination",
        description: "Complete the annual Medicaid redetermination process.",
        linkedModule: "Eligibility Verification",
        recurrence: "annual",
        dueDateOffsetDays: 365,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-001-t6",
        title: "Annual ISP review",
        description: "Conduct and document the annual Individual Support Plan review.",
        linkedModule: "Care Plan / ISP",
        recurrence: "annual",
        dueDateOffsetDays: 0,
        offsetFrom: "annual_plan_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-001-t7",
        title: "Medicaid Recertification (workflow)",
        description: "Auto-triggered annual Medicaid recertification workflow.",
        linkedModule: null,
        recurrence: "annual",
        dueDateOffsetDays: 365,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Anyone",
      },
    ],
  },
  {
    id: "tmpl-002",
    name: "Intensive Support Coordination",
    description: "High-frequency coordination for individuals requiring intensive monthly oversight.",
    applicablePrograms: ["DD Waiver", "ICF/IID", "HCBS"],
    applicableStates: ["Indiana"],
    version: "v1.3",
    status: "active",
    tasks: [
      {
        id: "tmpl-002-t1",
        title: "Monthly in-person visit",
        description: "Conduct required monthly in-person visit.",
        linkedModule: "Visit Summary",
        recurrence: "monthly",
        dueDateOffsetDays: 30,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-002-t2",
        title: "Monthly progress note",
        description: "Complete monthly progress note documenting individual status.",
        linkedModule: "Progress Note",
        recurrence: "monthly",
        dueDateOffsetDays: 30,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-002-t3",
        title: "Complete monitoring form",
        description: "Complete the monthly monitoring form.",
        linkedModule: "Monitoring Form",
        recurrence: "monthly",
        dueDateOffsetDays: 30,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-002-t4",
        title: "Health & safety check",
        description: "Document monthly health and safety status.",
        linkedModule: "Contact Note",
        recurrence: "monthly",
        dueDateOffsetDays: 30,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-002-t5",
        title: "Verify MA status",
        description: "Verify monthly Medicaid status.",
        linkedModule: "Eligibility Verification",
        recurrence: "monthly",
        dueDateOffsetDays: 30,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-002-t6",
        title: "Quarterly comprehensive review",
        description: "Conduct thorough quarterly review of all supports and services.",
        linkedModule: "Monitoring Form",
        recurrence: "quarterly",
        dueDateOffsetDays: 90,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Supervisor",
      },
      {
        id: "tmpl-002-t7",
        title: "Annual ISP review",
        description: "Conduct and document the annual Individual Support Plan review.",
        linkedModule: "Care Plan / ISP",
        recurrence: "annual",
        dueDateOffsetDays: 0,
        offsetFrom: "annual_plan_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-002-t8",
        title: "Crisis plan review",
        description: "Annual review and update of crisis intervention plan.",
        linkedModule: "Care Plan / ISP",
        recurrence: "annual",
        dueDateOffsetDays: 365,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Supervisor",
      },
      {
        id: "tmpl-002-t9",
        title: "Complete MA redetermination",
        description: "Complete the annual Medicaid redetermination process.",
        linkedModule: "Eligibility Verification",
        recurrence: "annual",
        dueDateOffsetDays: 365,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Case Manager",
      },
    ],
  },
  {
    id: "tmpl-003",
    name: "Waiver Support Services",
    description: "Specialized template for individuals enrolled in state waiver programs.",
    applicablePrograms: ["HCBS", "DD Waiver"],
    applicableStates: ["New Jersey"],
    version: "v1.0",
    status: "active",
    tasks: [
      {
        id: "tmpl-003-t1",
        title: "Initial assessment",
        description: "Complete comprehensive initial assessment upon admission.",
        linkedModule: "Monitoring Form",
        recurrence: "one-time",
        dueDateOffsetDays: 14,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-003-t2",
        title: "Service plan development",
        description: "Develop initial service plan based on assessment findings.",
        linkedModule: "Care Plan / ISP",
        recurrence: "one-time",
        dueDateOffsetDays: 30,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-003-t3",
        title: "Provider coordination call",
        description: "Monthly call with service providers to coordinate care.",
        linkedModule: "Contact Note",
        recurrence: "monthly",
        dueDateOffsetDays: 30,
        offsetFrom: "admission_date",
        required: false,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-003-t4",
        title: "Monthly documentation review",
        description: "Review all monthly documentation for completeness.",
        linkedModule: "Progress Note",
        recurrence: "monthly",
        dueDateOffsetDays: 30,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-003-t5",
        title: "Quarterly visit",
        description: "Conduct quarterly in-person visit.",
        linkedModule: "Visit Summary",
        recurrence: "quarterly",
        dueDateOffsetDays: 90,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-003-t6",
        title: "Semi-annual ISP review",
        description: "Conduct semi-annual review of the Individual Support Plan.",
        linkedModule: "Care Plan / ISP",
        recurrence: "semi-annual",
        dueDateOffsetDays: 180,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Supervisor",
      },
      {
        id: "tmpl-003-t7",
        title: "Annual eligibility verification",
        description: "Annual verification of waiver eligibility and Medicaid status.",
        linkedModule: "Eligibility Verification",
        recurrence: "annual",
        dueDateOffsetDays: 365,
        offsetFrom: "admission_date",
        required: true,
        staffRole: "Case Manager",
      },
      {
        id: "tmpl-003-t8",
        title: "Waiver renewal",
        description: "Complete waiver renewal 60 days before annual plan date.",
        linkedModule: "Eligibility Verification",
        recurrence: "annual",
        dueDateOffsetDays: -60,
        offsetFrom: "annual_plan_date",
        required: true,
        staffRole: "Case Manager",
      },
    ],
  },
];

// Mock: individuals currently using each template
export const TEMPLATE_USAGE: Record<string, number> = {
  "tmpl-001": 14,
  "tmpl-002": 8,
  "tmpl-003": 6,
};

// Helper: get template by id
export function getTemplate(id: string): CaseTemplate | undefined {
  return CASE_TEMPLATES.find((t) => t.id === id);
}

// Helper: calculate due date from individual dates
export function calcDueDate(
  task: TemplateTask,
  admissionDate: Date,
  annualPlanDate: Date
): string {
  let base: Date;
  if (task.offsetFrom === "annual_plan_date") {
    base = new Date(annualPlanDate);
  } else {
    base = new Date(admissionDate);
  }
  base.setDate(base.getDate() + task.dueDateOffsetDays);
  return base.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}
