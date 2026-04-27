// Compliance Agent runtime data layer.
// Agents apply published Guidelines Engines against real individual data,
// surface findings, and create tasks/drafts in iCM modules.

export type AgentStatus = "Active" | "Inactive";
export type PushMode = "Manual" | "Auto-Pass" | "Auto-Always";
export type AgentType =
  | "Guidelines Engine Agent"
  | "PCP Alignment"
  | "Billing Documentation"
  | "Monitoring / Reauthorization"
  | "ISP Generator"
  | "Ambient Meeting Copilot"
  | "Custom";
export type ColorTone = "accent" | "green" | "amber" | "purple" | "red";
export type RunStatus = "Complete" | "In Progress" | "Failed";
export type ComplianceStatus = "Pass" | "Pending" | "Flagged";
export type Severity = "Hard Stop" | "Warning" | "Info";
export type FindingStatus = "Open" | "Resolved" | "Overridden";
export type StepStatus = "pass" | "warning" | "fail" | "pending" | "idle";

export interface ComplianceAgent {
  id: string;
  name: string;
  type: AgentType;
  version: string;
  status: AgentStatus;
  autoMonitor: boolean;
  schedule: string; // e.g. "Daily"
  pushMode: PushMode;
  tone: ColorTone;
  description: string;
  engineId: string;
  engineName: string;
  engineVersion: string;
  compliancePct: number;
  individuals: number;
  draftsPending: number;
  alertCount: number;
  lastEvaluated: string; // human-friendly timestamp
  preventedThisMonth?: number;
}

export interface AgentRunStep {
  id: number;
  name: string;
  source: string;
  result: string;
  status: StepStatus;
  detail?: string[];
  pushItems?: PushItem[];
}

export interface PushItem {
  id: string;
  label: string;
  destination: string;
  defaultChecked: boolean;
}

export interface AgentRun {
  id: string;
  agentId: string;
  individualId: string;
  individualName: string;
  service: string;
  engineLabel: string;
  date: string; // MM/DD/YYYY HH:MM AM/PM
  user: string;
  status: RunStatus;
  compliance: ComplianceStatus;
  scorePct: number;
  steps: AgentRunStep[];
  applied: boolean;
}

export interface Finding {
  id: string;
  agentId: string;
  individualId: string;
  individualName: string;
  description: string;
  severity: Severity;
  detected: string;
  deadline?: string;
  daysUntilDeadline?: number;
  status: FindingStatus;
  citation: string;
  recommendedAction: string;
}

export interface AuditEntry {
  timestamp: string;
  user: string;
  action: string;
  detail: string;
}

export interface ActivityEntry {
  whenLabel: string;
  action: string;
  individual?: string;
}

// ---------- Agents ----------

export const complianceAgents: ComplianceAgent[] = [
  {
    id: "agent-state-engine",
    name: "State Guidelines Engine Agent",
    type: "Guidelines Engine Agent",
    version: "v1.2",
    status: "Active",
    autoMonitor: true,
    schedule: "Daily",
    pushMode: "Manual",
    tone: "accent",
    description:
      "Full compliance enforcement across eligibility, PCP, limits, conflicts, and documentation.",
    engineId: "md-dda-v2",
    engineName: "Maryland DDA",
    engineVersion: "v2.0",
    compliancePct: 94,
    individuals: 24,
    draftsPending: 5,
    alertCount: 5,
    lastEvaluated: "2/22/2026, 9:30:00 AM",
    preventedThisMonth: 12,
  },
  {
    id: "agent-pcp-copilot",
    name: "PCP Alignment Copilot",
    type: "PCP Alignment",
    version: "v1.0",
    status: "Active",
    autoMonitor: true,
    schedule: "Daily",
    pushMode: "Manual",
    tone: "green",
    description:
      "Scans PCP vs guideline pack requirements, identifies missing items, drafts addendum language.",
    engineId: "md-dda-v2",
    engineName: "Maryland DDA",
    engineVersion: "v2.0",
    compliancePct: 97,
    individuals: 18,
    draftsPending: 3,
    alertCount: 3,
    lastEvaluated: "2/22/2026, 7:00:00 AM",
    preventedThisMonth: 6,
  },
  {
    id: "agent-billing",
    name: "Billing Documentation Copilot",
    type: "Billing Documentation",
    version: "v1.1",
    status: "Active",
    autoMonitor: false,
    schedule: "Manual only",
    pushMode: "Manual",
    tone: "amber",
    description:
      "Verifies billable requirements, generates compliant note templates, cross-checks conflicts and units.",
    engineId: "md-dda-v2",
    engineName: "Maryland DDA",
    engineVersion: "v2.0",
    compliancePct: 91,
    individuals: 30,
    draftsPending: 0,
    alertCount: 0,
    lastEvaluated: "2/22/2026, 7:00:00 AM",
    preventedThisMonth: 9,
  },
  {
    id: "agent-monitoring",
    name: "Monitoring & Reauth Copilot",
    type: "Monitoring / Reauthorization",
    version: "v1.0",
    status: "Active",
    autoMonitor: true,
    schedule: "Every 6 hours",
    pushMode: "Manual",
    tone: "purple",
    description:
      "Tracks monitoring deadlines, reauthorization caps, creates monitoring forms and reauth drafts automatically.",
    engineId: "md-dda-v2",
    engineName: "Maryland DDA",
    engineVersion: "v2.0",
    compliancePct: 89,
    individuals: 22,
    draftsPending: 2,
    alertCount: 4,
    lastEvaluated: "2/22/2026, 8:00:00 AM",
    preventedThisMonth: 7,
  },
  {
    id: "agent-isp",
    name: "ISP Generator",
    type: "ISP Generator",
    version: "v1.0",
    status: "Active",
    autoMonitor: false,
    schedule: "Manual only",
    pushMode: "Manual",
    tone: "red",
    description:
      "Generates Individual Service Plans from assessments, monitoring data, and state guidelines. Drafts complete ISPs for case manager review.",
    engineId: "md-dda-v2",
    engineName: "Maryland DDA",
    engineVersion: "v2.0",
    compliancePct: 88,
    individuals: 15,
    draftsPending: 0,
    alertCount: 0,
    lastEvaluated: "2/22/2026, 6:00:00 AM",
    preventedThisMonth: 3,
  },
];

export function getAgent(id: string): ComplianceAgent | undefined {
  return complianceAgents.find((a) => a.id === id);
}

// ---------- Tone tokens ----------

export const TONE_CLASSES: Record<
  ColorTone,
  { iconBg: string; runBtn: string; border: string; text: string }
> = {
  accent: {
    iconBg: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    runBtn: "bg-icm-accent hover:opacity-90 text-white",
    border: "border-l-icm-accent",
    text: "text-icm-accent",
  },
  green: {
    iconBg: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    runBtn: "bg-icm-green hover:opacity-90 text-white",
    border: "border-l-icm-green",
    text: "text-icm-green",
  },
  amber: {
    iconBg: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    runBtn: "bg-icm-amber hover:opacity-90 text-white",
    border: "border-l-icm-amber",
    text: "text-icm-amber",
  },
  purple: {
    iconBg:
      "bg-[hsl(262_83%_95%)] text-[hsl(262_83%_50%)] ring-[hsl(262_83%_50%)]/20",
    runBtn: "bg-[hsl(262_83%_55%)] hover:opacity-90 text-white",
    border: "border-l-[hsl(262_83%_55%)]",
    text: "text-[hsl(262_83%_55%)]",
  },
  red: {
    iconBg: "bg-icm-red-soft text-icm-red ring-icm-red/20",
    runBtn: "bg-icm-red hover:opacity-90 text-white",
    border: "border-l-icm-red",
    text: "text-icm-red",
  },
};

export const SEVERITY_TONE: Record<
  Severity,
  { label: string; bg: string; text: string; ring: string }
> = {
  "Hard Stop": {
    label: "HARD STOP",
    bg: "bg-icm-red-soft",
    text: "text-icm-red",
    ring: "ring-icm-red/20",
  },
  Warning: {
    label: "WARNING",
    bg: "bg-icm-amber-soft",
    text: "text-icm-amber",
    ring: "ring-icm-amber/20",
  },
  Info: {
    label: "INFO",
    bg: "bg-icm-accent-soft",
    text: "text-icm-accent",
    ring: "ring-icm-accent/20",
  },
};

// ---------- Joseph Brown 8-step run ----------

export const josephRun: AgentRun = {
  id: "RUN-2026-0227-001",
  agentId: "agent-state-engine",
  individualId: "joseph-brown",
  individualName: "Brown, Joseph",
  service: "CCS — Coordination of Community Services",
  engineLabel: "Maryland DDA v2.0",
  date: "2/22/2026 9:30 AM",
  user: "System (auto-monitor)",
  status: "Complete",
  compliance: "Flagged",
  scorePct: 78,
  applied: false,
  steps: [
    {
      id: 1,
      name: "Individual & Service",
      source: "User selection",
      result: "Brown, Joseph · CCS — Coordination of Community Services",
      status: "pass",
    },
    {
      id: 2,
      name: "Eligibility Check",
      source: "Waiver Enrollment + LOC + Demographics",
      result: "Medicaid Active · Waiver enrolled · LOC current",
      status: "pass",
      detail: [
        "Medicaid ID verified ✓",
        "Waiver enrollment active ✓",
        "Level of Care current ✓",
        "Next redetermination: 06/10/2026 ⚠️ 44 days",
      ],
    },
    {
      id: 3,
      name: "PCP Alignment",
      source: "Care Plan / ISP Module",
      result: "ISP overdue by 25 days · 2 goals missing documentation",
      status: "warning",
      detail: [
        "ISP expiration date: 04/01/2026 ⚠️",
        "Days overdue: 25",
        "Goals with no progress: 2",
        "Missing signatures: 3",
        "HARD STOP: ISP must be renewed before new service authorizations can be issued",
      ],
    },
    {
      id: 4,
      name: "Limits & Caps",
      source: "Authorization + Utilization Records",
      result: "18 of 40 units used · Utilization on track",
      status: "pass",
      detail: [
        "Monthly units authorized: 40",
        "Units used this period: 18 (45%)",
        "Units remaining: 22",
        "Projected usage at current rate: 36 (90%)",
        "Warning at 85%: not yet triggered",
      ],
    },
    {
      id: 5,
      name: "Conflict Engine",
      source: "Scheduled Services",
      result: "No service conflicts detected",
      status: "pass",
      detail: [
        "Services checked for same-day conflicts: 3",
        "Conflicts found: 0",
        "Billing overlap issues: 0",
      ],
    },
    {
      id: 6,
      name: "Documentation Check",
      source: "All documentation modules",
      result: "3 documentation gaps found",
      status: "warning",
      detail: [
        "Contact notes (last 30 days): 2 ✓",
        "Monitoring form: OVERDUE 17 days ⚠️",
        "Visit summary: OVERDUE 5 months ⚠️",
        "Progress notes (unsigned): 2 ⚠️",
      ],
    },
    {
      id: 7,
      name: "Push to Modules",
      source: "Agent findings → iCM Modules",
      result: "5 items ready to push · Awaiting case manager confirmation",
      status: "pending",
      pushItems: [
        {
          id: "p1",
          label: "Create task: Complete monitoring form",
          destination: "My Work + Case Management",
          defaultChecked: true,
        },
        {
          id: "p2",
          label: "Create task: Schedule visit",
          destination: "My Work + Case Management",
          defaultChecked: true,
        },
        {
          id: "p3",
          label: "Draft: Monitoring form pre-filled",
          destination: "Monitoring Form module",
          defaultChecked: true,
        },
        {
          id: "p4",
          label: "Draft: ISP renewal talking points",
          destination: "Care Plan / ISP module",
          defaultChecked: true,
        },
        {
          id: "p5",
          label: "Alert: Medicaid renewal in 44 days",
          destination: "AI Panel + My Work",
          defaultChecked: true,
        },
      ],
    },
    {
      id: 8,
      name: "Compliance Dashboard",
      source: "All findings compiled",
      result: "Overall: FLAGGED — 2 warnings, 0 hard stops",
      status: "warning",
      detail: [
        "Eligibility: ✓ Pass",
        "PCP Alignment: ⚠️ Warning — ISP overdue",
        "Limits & Caps: ✓ Pass",
        "Conflicts: ✓ Pass",
        "Documentation: ⚠️ Warning — 3 gaps",
      ],
    },
  ],
};

export const josephNextSteps: string[] = [
  "Renew ISP immediately (25 days overdue)",
  "Complete monitoring form (17 days overdue)",
  "Schedule quarterly visit (overdue)",
  "Sign 2 pending progress notes",
  "Plan for Medicaid renewal (44 days)",
];

// ---------- Run history (per agent) ----------

export const runHistory: AgentRun[] = [
  josephRun,
  {
    ...josephRun,
    id: "RUN-2026-0226-014",
    individualId: "travis-langston",
    individualName: "Langston, Travis",
    service: "Day Habilitation",
    date: "2/21/2026 4:12 PM",
    user: "System (auto-monitor)",
    compliance: "Flagged",
    scorePct: 72,
    applied: true,
  },
  {
    ...josephRun,
    id: "RUN-2026-0226-013",
    individualId: "ashley-king",
    individualName: "King, Ashley",
    service: "CCS — Coordination of Community Services",
    date: "2/21/2026 11:48 AM",
    user: "Kathy Adams",
    compliance: "Pass",
    scorePct: 96,
    applied: true,
    status: "Complete",
  },
  {
    ...josephRun,
    id: "RUN-2026-0225-009",
    individualId: "mohsin-iqbal",
    individualName: "Iqbal, Mohsin",
    service: "Supported Employment",
    date: "2/20/2026 8:00 AM",
    user: "System (auto-monitor)",
    compliance: "Pass",
    scorePct: 92,
    applied: true,
  },
  {
    ...josephRun,
    id: "RUN-2026-0224-006",
    individualId: "joseph-brown",
    individualName: "Brown, Joseph",
    service: "CCS — Coordination of Community Services",
    date: "2/19/2026 9:30 AM",
    user: "System (auto-monitor)",
    compliance: "Pending",
    scorePct: 81,
    applied: true,
  },
];

export function runsForAgent(agentId: string): AgentRun[] {
  return runHistory.filter((r) => r.agentId === agentId);
}

// ---------- Findings ----------

export const findings: Finding[] = [
  {
    id: "F-1001",
    agentId: "agent-state-engine",
    individualId: "joseph-brown",
    individualName: "Brown, Joseph",
    description:
      "ISP overdue by 25 days. Service authorizations cannot be issued until renewed.",
    severity: "Hard Stop",
    detected: "02/22/2026",
    deadline: "Immediate",
    daysUntilDeadline: -25,
    status: "Open",
    citation:
      "Per Maryland DDA v2.0, Service: CCS, Rule: ISP must be renewed annually per COMAR 10.09.78.12",
    recommendedAction: "Renew ISP immediately and reissue service authorization.",
  },
  {
    id: "F-1002",
    agentId: "agent-state-engine",
    individualId: "joseph-brown",
    individualName: "Brown, Joseph",
    description: "Quarterly monitoring form overdue by 17 days.",
    severity: "Warning",
    detected: "02/22/2026",
    deadline: "02/05/2026",
    daysUntilDeadline: -17,
    status: "Open",
    citation:
      "Per Maryland DDA v2.0, Service: CCS, Rule: Quarterly face-to-face visit required (COMAR 10.22.12.07).",
    recommendedAction: "Complete monitoring form and schedule face-to-face visit.",
  },
  {
    id: "F-1003",
    agentId: "agent-state-engine",
    individualId: "joseph-brown",
    individualName: "Brown, Joseph",
    description:
      "Two progress notes from January remain unsigned by case manager.",
    severity: "Warning",
    detected: "02/22/2026",
    daysUntilDeadline: -3,
    status: "Open",
    citation:
      "Per Maryland DDA v2.0, Service: Day Hab, Rule: Monthly progress note tied to PCP goals must be authored and signed by the case manager (COMAR 10.22.06.05).",
    recommendedAction: "Review and sign pending progress notes.",
  },
  {
    id: "F-1004",
    agentId: "agent-state-engine",
    individualId: "travis-langston",
    individualName: "Langston, Travis",
    description: "Day Habilitation hours exceed weekly cap of 30 hours.",
    severity: "Hard Stop",
    detected: "02/21/2026",
    daysUntilDeadline: 0,
    status: "Open",
    citation:
      "Per Maryland DDA v2.0, Service: Day Habilitation, Rule: Maximum of 30 hours per individual per week (DDA Fee Schedule 2023).",
    recommendedAction:
      "Reduce scheduled hours or submit a service-authorization amendment.",
  },
  {
    id: "F-1005",
    agentId: "agent-state-engine",
    individualId: "ashley-king",
    individualName: "King, Ashley",
    description: "Medicaid recertification approaching in 44 days.",
    severity: "Info",
    detected: "02/22/2026",
    deadline: "04/07/2026",
    daysUntilDeadline: 44,
    status: "Open",
    citation:
      "Per Maryland DDA v2.0, Eligibility Rule: Active Medicaid (MA) eligibility must be verified within the past 12 months.",
    recommendedAction: "Begin Medicaid recertification packet.",
  },
];

export function findingsForAgent(
  agentId: string,
  individualId?: string,
): Finding[] {
  return findings.filter(
    (f) =>
      f.agentId === agentId &&
      (!individualId || f.individualId === individualId),
  );
}

// ---------- Audit ----------

export const auditLog: AuditEntry[] = [
  {
    timestamp: "04/27/2026 14:32",
    user: "System",
    action: "Auto-run completed",
    detail: "24 individuals checked · 3 flagged",
  },
  {
    timestamp: "04/27/2026 14:32",
    user: "Kathy Adams",
    action: "Finding applied",
    detail:
      "Task created: Complete monitoring form · Individual: Joseph Brown",
  },
  {
    timestamp: "04/26/2026 09:15",
    user: "Babar Nawaz",
    action: "Override recorded",
    detail:
      "Field: ISP due date · Justification: Extension approved by DDA supervisor",
  },
  {
    timestamp: "04/25/2026 08:00",
    user: "System",
    action: "Auto-run completed",
    detail: "24 individuals checked · 2 flagged",
  },
  {
    timestamp: "04/24/2026 08:00",
    user: "System",
    action: "Auto-run completed",
    detail: "24 individuals checked · 2 flagged",
  },
];

export const recentActivity: ActivityEntry[] = [
  {
    whenLabel: "2 hours ago",
    action: "Draft ISP created",
    individual: "Joseph Brown",
  },
  {
    whenLabel: "Yesterday",
    action: "Hard stop detected",
    individual: "Travis Langston",
  },
  {
    whenLabel: "2 days ago",
    action: "Compliance run completed",
    individual: "All individuals",
  },
];

// ---------- Global compliance summary ----------

export interface IndividualCompliance {
  id: string;
  name: string;
  caseManager: string;
  pct: number;
  lastRun: string;
  hardStops: number;
  warnings: number;
}

export const individualCompliance: IndividualCompliance[] = [
  { id: "joseph-brown", name: "Brown, Joseph", caseManager: "Babar Nawaz", pct: 78, lastRun: "02/22/2026", hardStops: 1, warnings: 2 },
  { id: "travis-langston", name: "Langston, Travis", caseManager: "Kathy Adams", pct: 72, lastRun: "02/21/2026", hardStops: 1, warnings: 1 },
  { id: "ashley-king", name: "King, Ashley", caseManager: "Kathy Adams", pct: 96, lastRun: "02/21/2026", hardStops: 0, warnings: 0 },
  { id: "mohsin-iqbal", name: "Iqbal, Mohsin", caseManager: "Babar Nawaz", pct: 92, lastRun: "02/20/2026", hardStops: 0, warnings: 1 },
  { id: "linda-park", name: "Park, Linda", caseManager: "Kathy Adams", pct: 98, lastRun: "02/22/2026", hardStops: 0, warnings: 0 },
  { id: "marcus-hill", name: "Hill, Marcus", caseManager: "Babar Nawaz", pct: 95, lastRun: "02/22/2026", hardStops: 0, warnings: 0 },
  { id: "renee-shah", name: "Shah, Renee", caseManager: "Kathy Adams", pct: 91, lastRun: "02/22/2026", hardStops: 0, warnings: 1 },
  { id: "darius-okonkwo", name: "Okonkwo, Darius", caseManager: "Kathy Adams", pct: 87, lastRun: "02/22/2026", hardStops: 0, warnings: 2 },
  { id: "sara-evans", name: "Evans, Sara", caseManager: "Babar Nawaz", pct: 99, lastRun: "02/22/2026", hardStops: 0, warnings: 0 },
  { id: "henry-cho", name: "Cho, Henry", caseManager: "Babar Nawaz", pct: 94, lastRun: "02/22/2026", hardStops: 0, warnings: 0 },
  { id: "tasha-bell", name: "Bell, Tasha", caseManager: "Kathy Adams", pct: 93, lastRun: "02/22/2026", hardStops: 0, warnings: 1 },
  { id: "elias-ng", name: "Ng, Elias", caseManager: "Babar Nawaz", pct: 90, lastRun: "02/22/2026", hardStops: 0, warnings: 1 },
  { id: "olivia-dean", name: "Dean, Olivia", caseManager: "Kathy Adams", pct: 97, lastRun: "02/22/2026", hardStops: 0, warnings: 0 },
  { id: "andre-lopez", name: "Lopez, Andre", caseManager: "Babar Nawaz", pct: 88, lastRun: "02/22/2026", hardStops: 0, warnings: 2 },
  { id: "kathryn-poole", name: "Poole, Kathryn", caseManager: "Kathy Adams", pct: 99, lastRun: "02/22/2026", hardStops: 0, warnings: 0 },
  { id: "luke-fischer", name: "Fischer, Luke", caseManager: "Kathy Adams", pct: 96, lastRun: "02/22/2026", hardStops: 0, warnings: 0 },
  { id: "imani-rivera", name: "Rivera, Imani", caseManager: "Babar Nawaz", pct: 94, lastRun: "02/22/2026", hardStops: 0, warnings: 0 },
  { id: "petra-vance", name: "Vance, Petra", caseManager: "Kathy Adams", pct: 91, lastRun: "02/22/2026", hardStops: 0, warnings: 1 },
  { id: "noah-park", name: "Park, Noah", caseManager: "Babar Nawaz", pct: 100, lastRun: "02/22/2026", hardStops: 0, warnings: 0 },
  { id: "kira-mendez", name: "Mendez, Kira", caseManager: "Kathy Adams", pct: 95, lastRun: "02/22/2026", hardStops: 0, warnings: 0 },
  { id: "victor-hale", name: "Hale, Victor", caseManager: "Babar Nawaz", pct: 92, lastRun: "02/22/2026", hardStops: 0, warnings: 1 },
  { id: "naomi-greer", name: "Greer, Naomi", caseManager: "Kathy Adams", pct: 96, lastRun: "02/22/2026", hardStops: 0, warnings: 0 },
  { id: "owen-shaw", name: "Shaw, Owen", caseManager: "Babar Nawaz", pct: 93, lastRun: "02/22/2026", hardStops: 0, warnings: 0 },
  { id: "amelia-yates", name: "Yates, Amelia", caseManager: "Kathy Adams", pct: 98, lastRun: "02/22/2026", hardStops: 0, warnings: 0 },
];

export const complianceTrend = [
  { month: "Sep", pct: 89 },
  { month: "Oct", pct: 90 },
  { month: "Nov", pct: 91 },
  { month: "Dec", pct: 92 },
  { month: "Jan", pct: 93 },
  { month: "Feb", pct: 94 },
];

export const topFindings = [
  { label: "Documentation gaps", count: 32 },
  { label: "ISP overdue", count: 18 },
  { label: "Monitoring form overdue", count: 14 },
  { label: "Unsigned progress notes", count: 11 },
  { label: "Authorization renewal needed", count: 7 },
];

export function complianceSummary() {
  const total = individualCompliance.length;
  const compliant = individualCompliance.filter((i) => i.pct >= 90).length;
  const hardStops = individualCompliance.reduce(
    (s, i) => s + i.hardStops,
    0,
  );
  const avg = Math.round(
    individualCompliance.reduce((s, i) => s + i.pct, 0) / total,
  );
  return {
    total,
    compliant,
    hardStops,
    agentsRunning: complianceAgents.filter((a) => a.status === "Active")
      .length,
    avg,
  };
}

export function agentsSummary() {
  const totalAlerts = complianceAgents.reduce((s, a) => s + a.alertCount, 0);
  const totalDrafts = complianceAgents.reduce(
    (s, a) => s + a.draftsPending,
    0,
  );
  const avgCompliance = Math.round(
    complianceAgents.reduce((s, a) => s + a.compliancePct, 0) /
      complianceAgents.length,
  );
  const totalIndividuals = complianceAgents.reduce(
    (s, a) => s + a.individuals,
    0,
  );
  return {
    activeAgents: complianceAgents.filter((a) => a.status === "Active").length,
    totalIndividuals,
    avgCompliance,
    totalDrafts,
    totalAlerts,
  };
}
