export type AgentStatus = 'active' | 'draft' | 'inactive';
export type AgentLayer = 'layer1' | 'layer2';

export type PlanType =
  | 'Treatment Plan'
  | 'Life Plan'
  | 'Care Plan'
  | 'Safety Plan'
  | 'Discharge Plan'
  | 'Guideline Parsing'
  | 'Compliance Copilot'
  | 'Custom';

export type RuntimeAgentType =
  | 'compliance_copilot'
  | 'pcp_alignment'
  | 'billing_documentation'
  | 'monitoring_reauth'
  | 'isp_generator'
  | 'ambient_meeting';

export type EngineStatus = 'draft' | 'published' | 'archived';

export type PushMode = 'manual' | 'auto_pass' | 'auto_always';

export interface ProfileField {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface OutputField {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface Agent {
  id: string;
  name: string;
  planType: PlanType;
  layer: AgentLayer;
  description: string;
  instructions: string;
  status: AgentStatus;
  profileFields: ProfileField[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentFormData {
  name: string;
  planType: PlanType;
  description: string;
  instructions: string;
}

// ============= COMPLIANCE ENGINE TYPES =============

export interface ComplianceEngine {
  id: string;
  name: string;
  state: string;
  program: string;
  effectiveDate: string;
  version: string;
  status: EngineStatus;
  serviceCount: number;
  hardStopCount: number;
  warningCount: number;
  createdBy: string;
  publishedAt: string | null;
  lastUpdated: string;
}

// ============= COMPLIANCE RUN TYPES =============

export interface ComplianceRun {
  id: string;
  individual: string;
  service: string;
  status: 'Complete' | 'In Progress';
  date: string;
  compliance: 'Pass' | 'Pending' | 'Flagged';
  engineName: string;
  engineVersion: string;
  agentName: string;
  agentVersion: string;
  user: string;
  overrides: OverrideRecord[];
  modulesWritten: string[];
}

export interface OverrideRecord {
  id: string;
  user: string;
  timestamp: string;
  field: string;
  originalResult: string;
  newResult: string;
  justification: string;
}

// ============= RUNTIME AGENT TYPES =============

export interface RuntimeAgent {
  id: string;
  name: string;
  type: RuntimeAgentType;
  description: string;
  engineId: string;
  engineName: string;
  engineVersion: string;
  status: AgentStatus;
  createdAt: string;
  lastUsed: string | null;
  individualsServed: number;
  complianceRate: number;
  allowOverrides: boolean;
  requireSupervisorApproval: boolean;
  pushMode: PushMode;
}

// ============= INSTRUCTION HIERARCHY =============
// Level 1: Compliance Engine Instructions (State-level logic)
// Level 2: Agent Instructions (Organization-level overrides)
// Level 3: Runtime Overrides (Case-specific, requires justification)
// If conflicts occur, higher level number overrides lower.

// ============= FIXED WORKFLOW =============
// The workflow is system-defined and locked. Agents configure behavior, not structure.
export const FIXED_WORKFLOW_STEPS = [
  { step: 1, name: "Individual & Service", description: "Select person + load compliance engine" },
  { step: 2, name: "Eligibility Check", description: "Prerequisites & qualification" },
  { step: 3, name: "PCP Alignment", description: "Plan justifies service?" },
  { step: 4, name: "Limits & Caps", description: "Within allowed hours/units?" },
  { step: 5, name: "Conflict Engine", description: "No billing conflicts?" },
  { step: 6, name: "Doc Builder", description: "Generate required docs" },
  { step: 7, name: "Push to Modules", description: "Write outputs to iCM" },
  { step: 8, name: "Compliance Dashboard", description: "Final status & next steps" },
] as const;

// ============= DATA SOURCE MAP =============
export const DATA_SOURCES: Record<string, string> = {
  "Eligibility Check": "Pulls from Waiver Enrollment + LOC + Demographics",
  "PCP Alignment": "Pulls from PCP Module",
  "Limits & Caps": "Pulls from Authorization + Utilization Records",
  "Conflict Engine": "Pulls from Scheduled Services",
  "Doc Builder": "Uses Engine Templates",
  "Push to Modules": "Writes to ICM",
};

// ============= MOCK DATA =============

export const mockComplianceEngines: ComplianceEngine[] = [
  {
    id: "ce-1",
    name: "Maryland DDA",
    state: "Maryland",
    program: "DDA Waiver",
    effectiveDate: "07/01/2023",
    version: "2.0",
    status: "published",
    serviceCount: 14,
    hardStopCount: 8,
    warningCount: 12,
    createdBy: "Admin",
    publishedAt: "2026-01-15",
    lastUpdated: "2026-02-10",
  },
  {
    id: "ce-2",
    name: "Virginia DBHDS",
    state: "Virginia",
    program: "DD Waiver",
    effectiveDate: "01/01/2024",
    version: "1.0",
    status: "published",
    serviceCount: 11,
    hardStopCount: 5,
    warningCount: 9,
    createdBy: "Admin",
    publishedAt: "2026-02-01",
    lastUpdated: "2026-02-18",
  },
  {
    id: "ce-3",
    name: "Pennsylvania ODP",
    state: "Pennsylvania",
    program: "Consolidated Waiver",
    effectiveDate: "07/01/2024",
    version: "1.0",
    status: "draft",
    serviceCount: 0,
    hardStopCount: 0,
    warningCount: 0,
    createdBy: "Admin",
    publishedAt: null,
    lastUpdated: "2026-02-20",
  },
];

export const mockRuntimeAgents: RuntimeAgent[] = [
  {
    id: "ra-1",
    name: "State Compliance Copilot",
    type: "compliance_copilot",
    description: "Full compliance enforcement across eligibility, PCP, limits, conflicts, and documentation.",
    engineId: "ce-1",
    engineName: "Maryland DDA",
    engineVersion: "2.0",
    status: "active",
    createdAt: "2026-01-20",
    lastUsed: "2026-02-22",
    individualsServed: 24,
    complianceRate: 94,
    allowOverrides: true,
    requireSupervisorApproval: false,
    pushMode: "manual",
  },
  {
    id: "ra-2",
    name: "PCP Alignment Copilot",
    type: "pcp_alignment",
    description: "Scans PCP vs rule pack requirements, identifies missing items, drafts addendum language.",
    engineId: "ce-1",
    engineName: "Maryland DDA",
    engineVersion: "2.0",
    status: "active",
    createdAt: "2026-02-01",
    lastUsed: "2026-02-21",
    individualsServed: 18,
    complianceRate: 97,
    allowOverrides: true,
    requireSupervisorApproval: true,
    pushMode: "auto_pass",
  },
  {
    id: "ra-3",
    name: "Billing Documentation Copilot",
    type: "billing_documentation",
    description: "Verifies billable requirements, generates compliant note templates, cross-checks conflicts/units.",
    engineId: "ce-1",
    engineName: "Maryland DDA",
    engineVersion: "2.0",
    status: "active",
    createdAt: "2026-02-05",
    lastUsed: "2026-02-22",
    individualsServed: 30,
    complianceRate: 91,
    allowOverrides: false,
    requireSupervisorApproval: false,
    pushMode: "manual",
  },
  {
    id: "ra-4",
    name: "Monitoring & Reauth Copilot",
    type: "monitoring_reauth",
    description: "Tracks caps, deadlines, and required monthly elements. Creates monitoring forms and tasks.",
    engineId: "ce-2",
    engineName: "Virginia DBHDS",
    engineVersion: "1.0",
    status: "active",
    createdAt: "2026-02-10",
    lastUsed: "2026-02-20",
    individualsServed: 12,
    complianceRate: 96,
    allowOverrides: true,
    requireSupervisorApproval: true,
    pushMode: "auto_pass",
  },
  {
    id: "ra-5",
    name: "ISP Generator",
    type: "isp_generator",
    description: "Generates comprehensive Individual Service Plans based on assessments, goals, and state guidelines.",
    engineId: "ce-1",
    engineName: "Maryland DDA",
    engineVersion: "2.0",
    status: "active",
    createdAt: "2026-01-25",
    lastUsed: "2026-02-19",
    individualsServed: 15,
    complianceRate: 93,
    allowOverrides: true,
    requireSupervisorApproval: false,
    pushMode: "manual",
  },
];

export const mockComplianceRuns: ComplianceRun[] = [
  { id: "cr-1", individual: "James Williams", service: "Personal Care Services (PCS)", status: "Complete", date: "2026-02-18", compliance: "Pass", engineName: "Maryland DDA", engineVersion: "2.0", agentName: "State Compliance Copilot", agentVersion: "1.0", user: "Jane Doe", overrides: [], modulesWritten: ["Services", "PCP", "BAN", "Workflow Manager"] },
  { id: "cr-2", individual: "Maria Garcia", service: "Day Habilitation", status: "Complete", date: "2026-02-15", compliance: "Pass", engineName: "Maryland DDA", engineVersion: "2.0", agentName: "State Compliance Copilot", agentVersion: "1.0", user: "Jane Doe", overrides: [], modulesWritten: ["Services", "PCP", "Progress Note"] },
  { id: "cr-3", individual: "David Johnson", service: "Respite Care", status: "In Progress", date: "2026-02-20", compliance: "Pending", engineName: "Maryland DDA", engineVersion: "2.0", agentName: "Billing Documentation Copilot", agentVersion: "1.0", user: "John Smith", overrides: [], modulesWritten: [] },
  { id: "cr-4", individual: "Sarah Thompson", service: "Supported Employment – Individual", status: "Complete", date: "2026-02-10", compliance: "Pass", engineName: "Maryland DDA", engineVersion: "2.0", agentName: "PCP Alignment Copilot", agentVersion: "1.0", user: "Jane Doe", overrides: [], modulesWritten: ["PCP", "Services"] },
  { id: "cr-5", individual: "Robert Davis", service: "Community Living Supports", status: "Complete", date: "2026-02-05", compliance: "Flagged", engineName: "Virginia DBHDS", engineVersion: "1.0", agentName: "Monitoring & Reauth Copilot", agentVersion: "1.0", user: "John Smith", overrides: [{ id: "ov-1", user: "John Smith", timestamp: "2026-02-05T14:30:00Z", field: "Weekly Cap", originalResult: "hard_stop", newResult: "warning", justification: "Temporary exception approved by supervisor — additional hours authorized by MCO." }], modulesWritten: ["Services", "Monitoring"] },
  { id: "cr-6", individual: "James Williams", service: "Behavioral Support Services", status: "In Progress", date: "2026-02-21", compliance: "Pending", engineName: "Maryland DDA", engineVersion: "2.0", agentName: "State Compliance Copilot", agentVersion: "1.0", user: "Jane Doe", overrides: [], modulesWritten: [] },
];

// Legacy mock agents (kept for backward compat)
export const mockAgents: Agent[] = [
  {
    id: "l1-1",
    name: "Guideline Parsing Agent",
    planType: "Guideline Parsing",
    layer: "layer1",
    description: "Admin-only agent that converts uploaded state guideline PDFs into structured Rule Packs for downstream compliance agents.",
    instructions: "Upload state guideline PDF. Optionally provide service list, templates, and service code mappings.",
    status: "active",
    profileFields: [],
    createdAt: new Date("2025-11-01"),
    updatedAt: new Date("2026-02-20"),
  },
  {
    id: "l2-1",
    name: "State Compliance Copilot",
    planType: "Compliance Copilot",
    layer: "layer2",
    description: "Guides case managers through service authorization and billing documentation using published Compliance Engines.",
    instructions: "Uses Compliance Engine rule packs to enforce compliance at every step.",
    status: "active",
    profileFields: [],
    createdAt: new Date("2025-12-01"),
    updatedAt: new Date("2026-02-21"),
  },
];

export const runtimeAgentTypeLabels: Record<RuntimeAgentType, string> = {
  compliance_copilot: "Compliance Copilot",
  pcp_alignment: "PCP Alignment",
  billing_documentation: "Billing Documentation",
  monitoring_reauth: "Monitoring / Reauthorization",
  isp_generator: "ISP Generator",
  ambient_meeting: "Ambient Meeting Copilot",
};

export const pushModeLabels: Record<PushMode, string> = {
  manual: "Manual Confirmation Required",
  auto_pass: "Auto-Push on Pass Only",
  auto_always: "Auto-Push Always",
};
