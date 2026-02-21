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

// Mock agents data
export const mockAgents: Agent[] = [
  // Layer 1 — Admin Only
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
  // Layer 2 — Case Manager
  {
    id: "l2-1",
    name: "State Compliance Copilot",
    planType: "Compliance Copilot",
    layer: "layer2",
    description: "Guides case managers through service authorization and billing documentation using published Rule Packs. Pushes outputs to iCM modules.",
    instructions: "Uses StateGuidelineRulePacks to enforce compliance at every step.",
    status: "active",
    profileFields: [],
    createdAt: new Date("2025-12-01"),
    updatedAt: new Date("2026-02-21"),
  },
  {
    id: "l2-2",
    name: "ISP Generator",
    planType: "Life Plan",
    layer: "layer2",
    description: "Generates comprehensive Individual Service Plans based on assessments, goals, and state guidelines.",
    instructions: "Follow state-specific ISP templates and include all required domains.",
    status: "active",
    profileFields: [],
    createdAt: new Date("2025-11-15"),
    updatedAt: new Date("2026-01-20"),
  },
  {
    id: "l2-3",
    name: "Behavior Support Plan",
    planType: "Treatment Plan",
    layer: "layer2",
    description: "Creates behavior support plans with positive interventions and replacement strategies.",
    instructions: "Use person-centered language. Include antecedent strategies and teaching procedures.",
    status: "active",
    profileFields: [],
    createdAt: new Date("2025-12-01"),
    updatedAt: new Date("2026-02-10"),
  },
  {
    id: "l2-4",
    name: "Safety Plan Writer",
    planType: "Safety Plan",
    layer: "layer2",
    description: "Develops individualized safety plans for risk mitigation and emergency protocols.",
    instructions: "Address all identified risks. Include de-escalation steps and emergency contacts.",
    status: "active",
    profileFields: [],
    createdAt: new Date("2026-01-05"),
    updatedAt: new Date("2026-02-15"),
  },
  {
    id: "l2-5",
    name: "Day Program Plan",
    planType: "Care Plan",
    layer: "layer2",
    description: "Creates structured day program plans with skill-building activities and community integration goals.",
    instructions: "Focus on meaningful activities and measurable skill acquisition targets.",
    status: "active",
    profileFields: [],
    createdAt: new Date("2026-01-20"),
    updatedAt: new Date("2026-02-19"),
  },
];
