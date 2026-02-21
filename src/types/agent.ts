export type AgentStatus = 'active' | 'draft' | 'inactive';

export type PlanType =
  | 'Treatment Plan'
  | 'Life Plan'
  | 'Care Plan'
  | 'Safety Plan'
  | 'Discharge Plan'
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
  {
    id: "1",
    name: "ISP Generator",
    planType: "Life Plan",
    description: "Generates comprehensive Individual Service Plans based on assessments, goals, and state guidelines.",
    instructions: "Follow state-specific ISP templates and include all required domains.",
    status: "active",
    profileFields: [],
    createdAt: new Date("2025-11-15"),
    updatedAt: new Date("2026-01-20"),
  },
  {
    id: "2",
    name: "Behavior Support Plan",
    planType: "Treatment Plan",
    description: "Creates behavior support plans with positive interventions and replacement strategies.",
    instructions: "Use person-centered language. Include antecedent strategies and teaching procedures.",
    status: "active",
    profileFields: [],
    createdAt: new Date("2025-12-01"),
    updatedAt: new Date("2026-02-10"),
  },
  {
    id: "3",
    name: "Safety Plan Writer",
    planType: "Safety Plan",
    description: "Develops individualized safety plans for risk mitigation and emergency protocols.",
    instructions: "Address all identified risks. Include de-escalation steps and emergency contacts.",
    status: "active",
    profileFields: [],
    createdAt: new Date("2026-01-05"),
    updatedAt: new Date("2026-02-15"),
  },
  {
    id: "4",
    name: "Discharge Summary",
    planType: "Discharge Plan",
    description: "Prepares discharge summaries with transition plans and community resource referrals.",
    instructions: "Include progress summary, remaining needs, and follow-up recommendations.",
    status: "draft",
    profileFields: [],
    createdAt: new Date("2026-02-01"),
    updatedAt: new Date("2026-02-18"),
  },
  {
    id: "5",
    name: "Day Program Plan",
    planType: "Care Plan",
    description: "Creates structured day program plans with skill-building activities and community integration goals.",
    instructions: "Focus on meaningful activities and measurable skill acquisition targets.",
    status: "active",
    profileFields: [],
    createdAt: new Date("2026-01-20"),
    updatedAt: new Date("2026-02-19"),
  },
];
