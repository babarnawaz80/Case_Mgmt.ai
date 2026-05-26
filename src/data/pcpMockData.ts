/**
 * pcpMockData.ts
 * Mock PCP record for Joseph Brown (ind-001).
 * Used to pre-populate the care plan board and document viewer.
 */

export interface PCPRecord {
  id: string;
  individual_id: string;
  plan_type: "annual" | "initial" | "revised";
  plan_format: "pcp_v2";
  effective_date: string;
  annual_plan_date: string;
  status: "draft" | "pending_signatures" | "submitted" | "approved";
  created_by: string;
  ai_generated: boolean;
  ai_draft_path: boolean;
  sections: PCPSections;
  compliance_check: {
    hard_stops: number;
    review_items: number;
  };
  signatures: SignatureEntry[];
  source_documents?: SourceDocument[];
}

export interface PCPSections {
  profile?: {
    name?: string;
    preferred_name?: string;
    dob?: string;
    age?: string;
    gender?: string;
    county?: string;
    medicaid_id?: string;
    program?: string;
    waiver?: string;
    ccs_name?: string;
    ccs_agency?: string;
    ccs_phone?: string;
  };
  good_life?: string;
  important_to?: string[];
  important_for?: string[];
  focus_areas?: Record<string, string>;
  goals?: PCPGoal[];
  health_safety?: {
    hrst_score?: number;
    risks?: PCPRisk[];
    emergency_plan?: string;
  };
  services?: PCPService[];
  rights?: {
    informed: boolean;
    informed_date?: string;
    method?: string;
    notes?: string;
  };
  team?: PCPTeamMember[];
  bsp?: {
    has_bsp: boolean;
    provider?: string;
    date?: string;
    summary?: string;
    has_ncp: boolean;
    has_court: boolean;
  };
}

export interface PCPGoal {
  number: number;
  title: string;
  description: string;
  status: "New" | "Continued" | "Modified" | "Completed — not renewing";
  targetDate: string;
  responsible: string;
  aiSuggested?: boolean;
  objectives?: { description: string; status: string }[];
}

export interface PCPRisk {
  category: string;
  description: string;
  mitigation: string;
  documentRef: string;
}

export interface PCPService {
  name: string;
  provider: string;
  units: string;
  start: string;
  end: string;
  status: "Active" | "Proposed" | "Discontinued";
  authNumber?: string;
}

export interface PCPTeamMember {
  name: string;
  role: string;
  agency: string;
  phone?: string;
  email?: string;
  present: boolean;
  sig: "Signed" | "Pending" | "Not requested";
}

export interface SignatureEntry {
  name: string;
  role: string;
  signed: boolean;
  signedOn?: string;
}

export interface SourceDocument {
  name: string;
  label: string;
  uploadedAt?: string;
}

/**
 * Pre-built mock PCP for Joseph Brown — ind-001
 * Annual Plan 2026 | AI Generated | Draft status
 */
export const MOCK_PCP_BROWN_2026: PCPRecord = {
  id: "pcp-brown-2026-001",
  individual_id: "ind-001",
  plan_type: "annual",
  plan_format: "pcp_v2",
  effective_date: "05/25/2026",
  annual_plan_date: "08/31/2026",
  status: "draft",
  created_by: "kathy-adams",
  ai_generated: true,
  ai_draft_path: true,
  compliance_check: {
    hard_stops: 0,
    review_items: 2,
  },
  signatures: [
    { name: "Kathy Adams", role: "CCS", signed: true, signedOn: "05/24/2026" },
    { name: "Linda Brown", role: "Guardian", signed: false },
    { name: "Joseph Brown", role: "Individual", signed: false },
  ],
  source_documents: [
    { name: "SIS_Report_JBrown_2026.pdf", label: "SIS Report" },
    { name: "Prior_Year_PCP_2025.pdf", label: "Prior Year PCP" },
    { name: "HRST_JBrown_Jan2026.pdf", label: "HRST" },
  ],
  sections: {
    profile: {
      name: "Joseph Brown",
      preferred_name: "Joe",
      dob: "03/15/1990",
      age: "36",
      gender: "Male",
      county: "Carroll County",
      medicaid_id: "MA-7842301",
      program: "Maryland DDA — Community Pathways",
      waiver: "DD Waiver",
      ccs_name: "Kathy Adams",
      ccs_agency: "Carroll County Case Management",
      ccs_phone: "(410) 555-0102",
    },

    good_life:
      "Joe wants to work part-time at a job where he can do structured tasks like sorting or " +
      "stocking. He loves going to community events and seeing his friends from Day Hab. He " +
      "wants to stay close to his mom and have his own space someday. Joe says a good life " +
      "means having a job, going places in the community, and feeling safe at home.",

    important_to: [
      "Spending time with his mother",
      "Attending Day Habilitation program",
      "Community events and outings",
      "Part-time employment",
      "Seeing friends from Day Hab",
    ],

    important_for: [
      "Consistent medication management",
      "Behavioral support monitoring",
      "Regular health check-ins",
      "MA eligibility maintenance",
      "Safe and predictable daily routine",
    ],

    focus_areas: {
      employment:
        "Joe is currently seeking employment. Goals include exploring part-time warehouse or " +
        "retail work in a structured environment. Employment FAE not yet completed. Supported " +
        "Employment referral initiated 05/2026.",
      community:
        "Joe attends Day Habilitation 4-5 days/week at Carroll Community Services. Participates " +
        "in community outings monthly. Goal: increase independent community access with natural supports.",
      health:
        "Current health status: stable. Ongoing behavioral health monitoring. Medical appointments: " +
        "quarterly PCP, annual dental. Medications managed with support from mother.",
      housing:
        "Currently lives at home with mother (Linda Brown). Long-term goal: supported independent " +
        "living within 3-5 years. No immediate housing changes planned this plan year.",
      relationships:
        "Strong relationship with mother Linda Brown and brother David Brown. Peer relationships " +
        "through Day Hab program. Goal: expand natural support network in the community.",
      education:
        "Completed vocational training program in 2024. Goal this year: explore on-the-job training " +
        "through supported employment. No formal education plans at this time.",
    },

    goals: [
      {
        number: 1,
        title: "Explore part-time employment opportunities",
        description:
          "Joseph has expressed interest in pursuing part-time employment. Connect with Supported " +
          "Employment provider to assess vocational interests, identify community-based work opportunities " +
          "aligned with his skills, and arrange job shadowing within 90 days.",
        status: "New",
        targetDate: "10/31/2026",
        responsible: "Kathy Adams + Supported Employment Provider",
        aiSuggested: true,
        objectives: [
          { description: "Complete vocational interest assessment", status: "Not Started" },
          { description: "Schedule 2 job shadowing visits", status: "Not Started" },
          { description: "Submit supported employment referral", status: "In Progress" },
        ],
      },
      {
        number: 2,
        title: "Maintain community integration through Day Hab and outings",
        description:
          "Continue attending Day Habilitation 4-5 days/week at Carroll Community Services. " +
          "Participate in at least 2 organized community outings per month. Track progress " +
          "through monthly monitoring forms.",
        status: "Continued",
        targetDate: "08/31/2026",
        responsible: "Carroll Community Services + Linda Brown",
        objectives: [
          { description: "Attend Day Hab ≥4 days/week", status: "In Progress" },
          { description: "2 community outings per month", status: "In Progress" },
        ],
      },
      {
        number: 3,
        title: "Behavioral support coordination and monitoring",
        description:
          "Address behavioral escalation patterns flagged in 2 recent monitoring sessions. " +
          "Coordinate with BSP provider to review and update behavior support strategies. " +
          "Monthly check-ins with care team to monitor progress.",
        status: "New",
        targetDate: "07/31/2026",
        responsible: "Kathy Adams + BSP Provider (Regional Support Team)",
        aiSuggested: true,
        objectives: [
          { description: "Schedule BSP review meeting within 30 days", status: "Not Started" },
          { description: "Update BSP strategies based on monitoring data", status: "Not Started" },
        ],
      },
    ],

    health_safety: {
      hrst_score: 3.2,
      risks: [
        {
          category: "Behavioral escalation",
          description:
            "Patterns of withdrawal and behavioral escalation reported by caregiver over last 2 months.",
          mitigation:
            "BSP updated quarterly, crisis contact protocols in place. Monthly monitoring by CCS.",
          documentRef: "BSP",
        },
        {
          category: "Medication management",
          description: "3 active prescriptions require consistent administration schedule.",
          mitigation:
            "Blister pack system implemented. Mother manages daily administration. Pharmacy review quarterly.",
          documentRef: "NCP",
        },
      ],
      emergency_plan:
        "In case of emergency, contact Linda Brown (mother) at (410) 555-0101. " +
        "Secondary contact: David Brown (brother) at (410) 555-0103. " +
        "Backup placement: respite care through Carroll Community Services. " +
        "Mental health crisis: 988 Lifeline + Carroll County Crisis Team (410) 555-0199.",
    },

    services: [
      { name: "Day Habilitation (T2021)", provider: "Carroll Community Services", units: "20 days/mo", start: "08/01/2025", end: "07/31/2026", status: "Active", authNumber: "AUTH-2026-0124" },
      { name: "Targeted Case Management", provider: "Carroll County Case Management", units: "120 units/mo", start: "08/01/2025", end: "07/31/2026", status: "Active", authNumber: "AUTH-2026-0123" },
      { name: "Community Habilitation", provider: "Carroll Community Services", units: "60 hrs/mo", start: "08/01/2025", end: "07/31/2026", status: "Active", authNumber: "AUTH-2026-0125" },
      { name: "Supported Employment", provider: "TBD — referral pending", units: "40 hrs/mo", start: "09/01/2026", end: "07/31/2027", status: "Proposed" },
      { name: "Respite Care", provider: "Linda Brown (Family)", units: "24 hrs/mo", start: "08/01/2025", end: "07/31/2026", status: "Active" },
      { name: "Behavior Support Plan Services", provider: "Regional Support Team", units: "8 hrs/mo", start: "08/01/2025", end: "07/31/2026", status: "Active" },
    ],

    rights: {
      informed: true,
      informed_date: "05/24/2026",
      method: "In-person discussion",
      notes: "Rights reviewed during PCP meeting. Joe acknowledged understanding.",
    },

    team: [
      { name: "Joseph Brown", role: "Individual", agency: "—", present: true, sig: "Not requested" },
      { name: "Kathy Adams", role: "CCS", agency: "Carroll County CM", phone: "(410) 555-0102", email: "kadams@ccm.md.gov", present: true, sig: "Signed" },
      { name: "Linda Brown", role: "Family Member / Guardian", agency: "—", phone: "(410) 555-0101", present: true, sig: "Pending" },
      { name: "Dr. R. Patel", role: "Provider", agency: "Carroll Health Group", phone: "(410) 555-0200", present: false, sig: "Not requested" },
    ],

    bsp: {
      has_bsp: true,
      provider: "Regional Support Team",
      date: "01/15/2026",
      summary:
        "BSP addresses behavioral escalation in transition environments. " +
        "Strategies include scheduled previewing of activities, sensory supports (noise-canceling headphones), " +
        "and visual schedule boards. Full BSP on file with Carroll County CM.",
      has_ncp: false,
      has_court: false,
    },
  },
};
