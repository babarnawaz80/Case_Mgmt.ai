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

// ============= RULE LIBRARY TYPES =============

export interface RuleLibrary {
  id: string;
  name: string;
  state: string;
  program: string;
  effectiveDate: string;
  version: string;
  status: 'draft' | 'published' | 'archived';
  serviceCount: number;
  hardStopCount: number;
  warningCount: number;
  createdBy: string;
  publishedAt: string | null;
  lastUpdated: string;
}

// ============= RUNTIME AGENT TYPES =============

export interface RuntimeAgent {
  id: string;
  name: string;
  type: RuntimeAgentType;
  description: string;
  ruleLibraryId: string;
  ruleLibraryName: string;
  ruleLibraryVersion: string;
  status: AgentStatus;
  createdAt: string;
  lastUsed: string | null;
  individualsServed: number;
  complianceRate: number;
}

// ============= MOCK DATA =============

export const mockRuleLibraries: RuleLibrary[] = [
  {
    id: "rl-1",
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
    id: "rl-2",
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
    id: "rl-3",
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
    ruleLibraryId: "rl-1",
    ruleLibraryName: "Maryland DDA",
    ruleLibraryVersion: "2.0",
    status: "active",
    createdAt: "2026-01-20",
    lastUsed: "2026-02-22",
    individualsServed: 24,
    complianceRate: 94,
  },
  {
    id: "ra-2",
    name: "PCP Alignment Copilot",
    type: "pcp_alignment",
    description: "Scans PCP vs rule pack requirements, identifies missing items, drafts addendum language.",
    ruleLibraryId: "rl-1",
    ruleLibraryName: "Maryland DDA",
    ruleLibraryVersion: "2.0",
    status: "active",
    createdAt: "2026-02-01",
    lastUsed: "2026-02-21",
    individualsServed: 18,
    complianceRate: 97,
  },
  {
    id: "ra-3",
    name: "Billing Documentation Copilot",
    type: "billing_documentation",
    description: "Verifies billable requirements, generates compliant note templates, cross-checks conflicts/units.",
    ruleLibraryId: "rl-1",
    ruleLibraryName: "Maryland DDA",
    ruleLibraryVersion: "2.0",
    status: "active",
    createdAt: "2026-02-05",
    lastUsed: "2026-02-22",
    individualsServed: 30,
    complianceRate: 91,
  },
  {
    id: "ra-4",
    name: "Monitoring & Reauth Copilot",
    type: "monitoring_reauth",
    description: "Tracks caps, deadlines, and required monthly elements. Creates monitoring forms and tasks.",
    ruleLibraryId: "rl-2",
    ruleLibraryName: "Virginia DBHDS",
    ruleLibraryVersion: "1.0",
    status: "active",
    createdAt: "2026-02-10",
    lastUsed: "2026-02-20",
    individualsServed: 12,
    complianceRate: 96,
  },
  {
    id: "ra-5",
    name: "ISP Generator",
    type: "isp_generator",
    description: "Generates comprehensive Individual Service Plans based on assessments, goals, and state guidelines.",
    ruleLibraryId: "rl-1",
    ruleLibraryName: "Maryland DDA",
    ruleLibraryVersion: "2.0",
    status: "active",
    createdAt: "2026-01-25",
    lastUsed: "2026-02-19",
    individualsServed: 15,
    complianceRate: 93,
  },
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
    description: "Guides case managers through service authorization and billing documentation using published Rule Packs.",
    instructions: "Uses StateGuidelineRulePacks to enforce compliance at every step.",
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
