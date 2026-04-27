// Guidelines Engine data layer.
// Engines convert state guideline PDFs into structured rule sets that the
// Compliance Agent runs against individual data. Published engines are immutable.

export type EngineStatus = "Draft" | "Published" | "Archived";
export type RuleType = "Hard Stop" | "Warning" | "Info";
export type ServiceCategory =
  | "Meaningful Day"
  | "Support"
  | "Residential"
  | "Behavioral"
  | "Other";
export type BillingUnit =
  | "15 min"
  | "Hourly"
  | "Daily"
  | "Monthly"
  | "Per Visit"
  | "Per Event";

export interface Rule {
  id: string;
  description: string;
  type: RuleType;
  citation: string;
}

export interface ServiceDefinition {
  id: string;
  name: string;
  category: ServiceCategory;
  billingUnit: BillingUnit;
  eligibilityRules: Rule[];
  authorizationRules: Rule[];
  pcpRequirements: Rule[];
  documentationRequirements: Rule[];
  limits: Rule[];
  conflicts: Rule[];
}

export interface EngineVersion {
  version: string; // e.g. "v2.0"
  publishedOn?: string; // MM/DD/YYYY
  publishedBy?: string;
  status: EngineStatus;
  servicesCount: number;
  hardStopsCount: number;
  warningsCount: number;
  changeSummary?: string;
}

export interface AuditEntry {
  timestamp: string; // MM/DD/YYYY HH:MM
  user: string;
  action: string;
  details?: string;
}

export interface LinkedAgent {
  id: string;
  name: string;
  type: string;
  status: "Active" | "Paused" | "Draft";
  lastRun?: string;
}

export interface GuidelinesEngine {
  id: string;
  name: string;
  state: string;
  program: string;
  effectiveDate: string; // MM/DD/YYYY
  version: string; // current version
  status: EngineStatus;
  updatedOn: string;
  borderTone: "green" | "amber" | "gray";
  sourceUrl?: string;
  builderInstructions?: string;
  notes?: string;
  services: ServiceDefinition[];
  linkedAgents: LinkedAgent[];
  versions: EngineVersion[];
  audit: AuditEntry[];
}

// ---------- Rule helpers ----------

export function totalHardStops(e: GuidelinesEngine): number {
  return e.services.reduce(
    (sum, s) =>
      sum +
      [
        ...s.eligibilityRules,
        ...s.authorizationRules,
        ...s.pcpRequirements,
        ...s.documentationRequirements,
        ...s.limits,
        ...s.conflicts,
      ].filter((r) => r.type === "Hard Stop").length,
    0,
  );
}

export function totalWarnings(e: GuidelinesEngine): number {
  return e.services.reduce(
    (sum, s) =>
      sum +
      [
        ...s.eligibilityRules,
        ...s.authorizationRules,
        ...s.pcpRequirements,
        ...s.documentationRequirements,
        ...s.limits,
        ...s.conflicts,
      ].filter((r) => r.type === "Warning").length,
    0,
  );
}

export function allRules(
  e: GuidelinesEngine,
): Array<Rule & { engineId: string; engineName: string; serviceId: string; serviceName: string }> {
  const out: Array<
    Rule & { engineId: string; engineName: string; serviceId: string; serviceName: string }
  > = [];
  for (const s of e.services) {
    const buckets = [
      s.eligibilityRules,
      s.authorizationRules,
      s.pcpRequirements,
      s.documentationRequirements,
      s.limits,
      s.conflicts,
    ];
    for (const bucket of buckets) {
      for (const r of bucket) {
        out.push({
          ...r,
          engineId: e.id,
          engineName: e.name,
          serviceId: s.id,
          serviceName: s.name,
        });
      }
    }
  }
  return out;
}

// ---------- Maryland DDA — full content ----------

const ccs: ServiceDefinition = {
  id: "md-ccs",
  name: "CCS — Coordination of Community Services",
  category: "Support",
  billingUnit: "15 min",
  eligibilityRules: [
    {
      id: "md-ccs-e1",
      description:
        "Individual must have a current DDA eligibility determination on file (not expired).",
      type: "Hard Stop",
      citation: "COMAR 10.22.12.04(A)",
    },
    {
      id: "md-ccs-e2",
      description:
        "Individual must be enrolled in an active DDA waiver (Community Pathways, Family Supports, or Community Supports).",
      type: "Hard Stop",
      citation: "COMAR 10.22.12.04(B)",
    },
    {
      id: "md-ccs-e3",
      description:
        "Active Medicaid (MA) eligibility must be verified within the past 12 months.",
      type: "Warning",
      citation: "COMAR 10.09.36.05",
    },
  ],
  authorizationRules: [
    {
      id: "md-ccs-a1",
      description:
        "Service authorization must be in effect for the date(s) of service. Billing prior to or after the auth window is not allowed.",
      type: "Hard Stop",
      citation: "DDA Provider Manual §6.2",
    },
  ],
  pcpRequirements: [
    {
      id: "md-ccs-p1",
      description:
        "CCS must be listed in the Person-Centered Plan (PCP) with a documented frequency, duration, and outcome.",
      type: "Hard Stop",
      citation: "COMAR 10.22.06.04(C)",
    },
    {
      id: "md-ccs-p2",
      description:
        "PCP must be reviewed and signed annually. Reviews more than 365 days old are out of compliance.",
      type: "Warning",
      citation: "COMAR 10.22.06.05",
    },
  ],
  documentationRequirements: [
    {
      id: "md-ccs-d1",
      description:
        "Each billable activity requires a contact note describing the contact type, location, duration, and goal addressed.",
      type: "Hard Stop",
      citation: "DDA Provider Manual §7.1",
    },
    {
      id: "md-ccs-d2",
      description:
        "Quarterly face-to-face visit required. Missing the quarterly visit window triggers a corrective action.",
      type: "Warning",
      citation: "COMAR 10.22.12.07",
    },
  ],
  limits: [
    {
      id: "md-ccs-l1",
      description:
        "Maximum of 40 units (10 hours) per individual per month under the Community Pathways waiver.",
      type: "Warning",
      citation: "DDA Fee Schedule 2023",
    },
  ],
  conflicts: [
    {
      id: "md-ccs-c1",
      description:
        "CCS cannot be billed for the same 15-minute increment as Targeted Case Management (TCM).",
      type: "Hard Stop",
      citation: "COMAR 10.09.45.06",
    },
  ],
};

const dayHab: ServiceDefinition = {
  id: "md-dayhab",
  name: "Day Habilitation",
  category: "Meaningful Day",
  billingUnit: "15 min",
  eligibilityRules: [
    {
      id: "md-dh-e1",
      description:
        "Individual must be 21 years of age or older to receive Day Habilitation under the DDA waiver.",
      type: "Hard Stop",
      citation: "COMAR 10.22.06.02(D)",
    },
    {
      id: "md-dh-e2",
      description:
        "Individual cannot simultaneously receive Day Habilitation and Supported Employment for the same time block.",
      type: "Hard Stop",
      citation: "DDA Provider Manual §4.5",
    },
  ],
  authorizationRules: [
    {
      id: "md-dh-a1",
      description:
        "Annual authorization required. Re-authorization must be submitted no later than 30 days prior to expiration.",
      type: "Warning",
      citation: "DDA Provider Manual §6.3",
    },
  ],
  pcpRequirements: [
    {
      id: "md-dh-p1",
      description:
        "PCP must include at least one community-integration goal directly served by Day Habilitation.",
      type: "Hard Stop",
      citation: "COMAR 10.22.06.04(D)",
    },
  ],
  documentationRequirements: [
    {
      id: "md-dh-d1",
      description:
        "Daily attendance log with arrival, departure, and activity narrative is required for each billable day.",
      type: "Hard Stop",
      citation: "DDA Provider Manual §7.4",
    },
    {
      id: "md-dh-d2",
      description:
        "Monthly progress note tied to PCP goals must be authored and signed by the case manager.",
      type: "Warning",
      citation: "COMAR 10.22.06.05",
    },
  ],
  limits: [
    {
      id: "md-dh-l1",
      description:
        "Maximum of 30 hours per individual per week. Hours above this threshold are not billable.",
      type: "Hard Stop",
      citation: "DDA Fee Schedule 2023",
    },
  ],
  conflicts: [
    {
      id: "md-dh-c1",
      description:
        "Day Habilitation cannot be billed on the same day as Hospitalization or any 24-hour residential service.",
      type: "Warning",
      citation: "DDA Provider Manual §4.6",
    },
  ],
};

const supEmp: ServiceDefinition = {
  id: "md-supemp",
  name: "Supported Employment",
  category: "Meaningful Day",
  billingUnit: "Hourly",
  eligibilityRules: [
    {
      id: "md-se-e1",
      description:
        "Individual must have a documented vocational assessment within the past 12 months.",
      type: "Hard Stop",
      citation: "COMAR 10.22.16.03",
    },
    {
      id: "md-se-e2",
      description:
        "Referral to DORS (Division of Rehabilitation Services) must be documented prior to long-term funding.",
      type: "Warning",
      citation: "DDA Provider Manual §5.2",
    },
  ],
  authorizationRules: [
    {
      id: "md-se-a1",
      description:
        "Job-coaching units cannot exceed authorized monthly cap. Excess units require a written exception request.",
      type: "Hard Stop",
      citation: "DDA Fee Schedule 2023",
    },
  ],
  pcpRequirements: [
    {
      id: "md-se-p1",
      description:
        "Employment outcome must be documented in the PCP with measurable hours-per-week target.",
      type: "Hard Stop",
      citation: "COMAR 10.22.06.04(E)",
    },
  ],
  documentationRequirements: [
    {
      id: "md-se-d1",
      description:
        "Each billable hour requires a job-coaching note including location, employer, and skill addressed.",
      type: "Hard Stop",
      citation: "DDA Provider Manual §7.6",
    },
  ],
  limits: [
    {
      id: "md-se-l1",
      description:
        "Long-term follow-along capped at 4 hours per individual per month after stabilization.",
      type: "Warning",
      citation: "DDA Fee Schedule 2023",
    },
  ],
  conflicts: [
    {
      id: "md-se-c1",
      description:
        "Supported Employment and Day Habilitation may not be billed for overlapping time.",
      type: "Hard Stop",
      citation: "DDA Provider Manual §4.5",
    },
  ],
};

// Lightweight VA services (2 detailed)
const vaInHome: ServiceDefinition = {
  id: "va-inhome",
  name: "In-Home Support Services",
  category: "Support",
  billingUnit: "15 min",
  eligibilityRules: [
    {
      id: "va-ih-e1",
      description:
        "Individual must be enrolled in the Virginia DD Waiver and have a current ISP.",
      type: "Hard Stop",
      citation: "12VAC30-122-180",
    },
  ],
  authorizationRules: [
    {
      id: "va-ih-a1",
      description:
        "Service authorization required prior to service delivery. No back-dating allowed.",
      type: "Hard Stop",
      citation: "DBHDS Provider Manual §3.4",
    },
  ],
  pcpRequirements: [
    {
      id: "va-ih-p1",
      description:
        "ISP must specify the activities of daily living to be supported and the desired outcomes.",
      type: "Hard Stop",
      citation: "12VAC30-122-120",
    },
  ],
  documentationRequirements: [
    {
      id: "va-ih-d1",
      description:
        "Daily progress notes required for each shift, signed by the direct support professional.",
      type: "Hard Stop",
      citation: "DBHDS Provider Manual §7.2",
    },
  ],
  limits: [
    {
      id: "va-ih-l1",
      description:
        "Cannot exceed authorized weekly hours. Overage requires service-authorization amendment.",
      type: "Warning",
      citation: "DMAS Memo 2024-08",
    },
  ],
  conflicts: [],
};

const vaCommEng: ServiceDefinition = {
  id: "va-commeng",
  name: "Community Engagement",
  category: "Meaningful Day",
  billingUnit: "Hourly",
  eligibilityRules: [
    {
      id: "va-ce-e1",
      description: "Available only to individuals age 22 and older.",
      type: "Hard Stop",
      citation: "12VAC30-122-185",
    },
  ],
  authorizationRules: [
    {
      id: "va-ce-a1",
      description:
        "Service authorization must be active for the entire billed period.",
      type: "Hard Stop",
      citation: "DBHDS Provider Manual §3.4",
    },
  ],
  pcpRequirements: [
    {
      id: "va-ce-p1",
      description:
        "ISP must include a community-integration outcome with measurable goals.",
      type: "Warning",
      citation: "12VAC30-122-120",
    },
  ],
  documentationRequirements: [
    {
      id: "va-ce-d1",
      description:
        "Activity log with location, duration, and outcome required for each billable hour.",
      type: "Hard Stop",
      citation: "DBHDS Provider Manual §7.5",
    },
  ],
  limits: [
    {
      id: "va-ce-l1",
      description: "Capped at 66 hours per individual per month.",
      type: "Warning",
      citation: "DMAS Fee Schedule 2024",
    },
  ],
  conflicts: [
    {
      id: "va-ce-c1",
      description:
        "Cannot bill on the same day as Group Day Support for overlapping time.",
      type: "Hard Stop",
      citation: "DBHDS Provider Manual §4.7",
    },
  ],
};

// ---------- Engines ----------

export const guidelinesEngines: GuidelinesEngine[] = [
  {
    id: "md-dda-v2",
    name: "Maryland DDA — DD Waiver",
    state: "Maryland",
    program: "DD Waiver — Community Pathways",
    effectiveDate: "07/01/2023",
    version: "v2.0",
    status: "Published",
    updatedOn: "02/10/2026",
    borderTone: "green",
    sourceUrl: "https://health.maryland.gov/dda/Pages/waiver.aspx",
    builderInstructions:
      "For CCS services, billing unit is 15 minutes. Ignore Part III — not applicable to our waiver type. Treat any reference to 'Targeted Case Management' as billing-conflict with CCS.",
    services: [ccs, dayHab, supEmp],
    linkedAgents: [
      {
        id: "agent-md-1",
        name: "Maryland DDA Compliance Agent",
        type: "Compliance",
        status: "Active",
        lastRun: "04/27/2026",
      },
      {
        id: "agent-md-2",
        name: "MD CCS Quarterly Reviewer",
        type: "Monitoring",
        status: "Active",
        lastRun: "04/26/2026",
      },
      {
        id: "agent-md-3",
        name: "MD Day Hab Auth Watcher",
        type: "Eligibility",
        status: "Active",
        lastRun: "04/27/2026",
      },
      {
        id: "agent-md-4",
        name: "MD Documentation Auditor",
        type: "Documentation",
        status: "Paused",
        lastRun: "03/15/2026",
      },
    ],
    versions: [
      {
        version: "v2.0",
        publishedOn: "02/10/2026",
        publishedBy: "Babar Nawaz",
        status: "Published",
        servicesCount: 14,
        hardStopsCount: 8,
        warningsCount: 12,
        changeSummary:
          "+2 services, +2 hard stops, +2 warnings vs v1.0. Added Supported Employment caps; revised CCS conflict rule.",
      },
      {
        version: "v1.0",
        publishedOn: "01/01/2023",
        publishedBy: "Babar Nawaz",
        status: "Archived",
        servicesCount: 12,
        hardStopsCount: 6,
        warningsCount: 10,
        changeSummary: "Initial publication based on COMAR 10.22 effective 2023.",
      },
    ],
    audit: [
      {
        timestamp: "02/10/2026 09:14",
        user: "Babar Nawaz",
        action: "Engine published",
        details: "v2.0 published. 14 services, 8 hard stops, 12 warnings.",
      },
      {
        timestamp: "01/15/2026 15:42",
        user: "Babar Nawaz",
        action: "Draft created",
        details: "New version drafted from v1.0",
      },
      {
        timestamp: "01/10/2026 11:08",
        user: "System",
        action: "Document uploaded",
        details: "MD-DDA-Waiver-2023.pdf (47 pages)",
      },
    ],
  },
  {
    id: "va-dbhds-v1",
    name: "Virginia DBHDS — DD Waiver",
    state: "Virginia",
    program: "DD Waiver",
    effectiveDate: "01/01/2024",
    version: "v1.0",
    status: "Published",
    updatedOn: "02/18/2026",
    borderTone: "green",
    sourceUrl: "https://dbhds.virginia.gov/developmental-services/",
    services: [vaInHome, vaCommEng],
    linkedAgents: [
      {
        id: "agent-va-1",
        name: "Virginia Compliance Agent",
        type: "Compliance",
        status: "Active",
        lastRun: "04/26/2026",
      },
    ],
    versions: [
      {
        version: "v1.0",
        publishedOn: "02/18/2026",
        publishedBy: "Babar Nawaz",
        status: "Published",
        servicesCount: 11,
        hardStopsCount: 5,
        warningsCount: 9,
        changeSummary: "Initial publication.",
      },
    ],
    audit: [
      {
        timestamp: "02/18/2026 10:22",
        user: "Babar Nawaz",
        action: "Engine published",
        details: "v1.0 published.",
      },
    ],
  },
  {
    id: "pa-odp-draft",
    name: "Pennsylvania ODP — Consolidated Waiver",
    state: "Pennsylvania",
    program: "Consolidated Waiver",
    effectiveDate: "07/01/2024",
    version: "v1.0",
    status: "Draft",
    updatedOn: "02/20/2026",
    borderTone: "amber",
    services: [],
    linkedAgents: [],
    versions: [
      {
        version: "v1.0",
        status: "Draft",
        servicesCount: 0,
        hardStopsCount: 0,
        warningsCount: 0,
      },
    ],
    audit: [
      {
        timestamp: "02/20/2026 14:05",
        user: "Babar Nawaz",
        action: "Engine drafted",
        details: "Awaiting PDF upload.",
      },
    ],
  },
];

export function getEngine(id: string): GuidelinesEngine | undefined {
  return guidelinesEngines.find((e) => e.id === id);
}

export function engineSummary() {
  return {
    total: guidelinesEngines.length,
    published: guidelinesEngines.filter((e) => e.status === "Published").length,
    draft: guidelinesEngines.filter((e) => e.status === "Draft").length,
    archived: guidelinesEngines.filter((e) => e.status === "Archived").length,
    linkedAgents: guidelinesEngines.reduce(
      (s, e) => s + e.linkedAgents.length,
      0,
    ),
  };
}

export const RULE_TYPE_TONE: Record<RuleType, { bg: string; text: string; ring: string }> = {
  "Hard Stop": {
    bg: "bg-icm-red-soft",
    text: "text-icm-red",
    ring: "ring-icm-red/20",
  },
  Warning: {
    bg: "bg-icm-amber-soft",
    text: "text-icm-amber",
    ring: "ring-icm-amber/20",
  },
  Info: {
    bg: "bg-icm-accent-soft",
    text: "text-icm-accent",
    ring: "ring-icm-accent/20",
  },
};
