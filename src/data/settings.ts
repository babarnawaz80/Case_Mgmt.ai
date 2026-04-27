// Settings: users, roles, permissions, integrations, AI config mocks

export type RoleKey =
  | "admin"
  | "supervisor"
  | "case_manager"
  | "billing"
  | "read_only";

export type UserStatus = "active" | "inactive" | "pending" | "locked";

export interface OrgUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  role: RoleKey;
  status: UserStatus;
  programs: string[];
  states: string[];
  lastLogin: string; // human-readable
  caseload?: number;
  caseloadCapacity?: number;
  supervisor?: string;
  department?: string;
}

export const orgUsers: OrgUser[] = [
  {
    id: "u-001",
    firstName: "Babar",
    lastName: "Nawaz",
    email: "babar@icaremanager.com",
    role: "admin",
    status: "active",
    programs: ["Carroll County CCS", "Dallas County CCS"],
    states: ["MD", "VA"],
    lastLogin: "Today, 8:42 AM",
    title: "System Administrator",
    department: "Operations",
  },
  {
    id: "u-002",
    firstName: "Kathy",
    lastName: "Adams",
    email: "kathy@icaremanager.com",
    role: "case_manager",
    status: "active",
    programs: ["Carroll County CCS"],
    states: ["MD"],
    lastLogin: "Today, 9:14 AM",
    title: "Case Manager, CCM",
    caseload: 7,
    caseloadCapacity: 12,
    supervisor: "Jennie Thollander",
    department: "Care Management",
  },
  {
    id: "u-003",
    firstName: "Jennie",
    lastName: "Thollander",
    email: "jennie@icaremanager.com",
    role: "supervisor",
    status: "active",
    programs: ["Carroll County CCS", "Dallas County CCS"],
    states: ["MD", "VA"],
    lastLogin: "Yesterday, 4:32 PM",
    title: "Care Management Supervisor",
    department: "Care Management",
  },
  {
    id: "u-004",
    firstName: "Marcy",
    lastName: "Bennett",
    email: "marcy@icaremanager.com",
    role: "case_manager",
    status: "active",
    programs: ["Dallas County CCS"],
    states: ["VA"],
    lastLogin: "3 days ago",
    title: "Case Manager",
    caseload: 9,
    caseloadCapacity: 12,
    supervisor: "Jennie Thollander",
    department: "Care Management",
  },
  {
    id: "u-005",
    firstName: "Demo",
    lastName: "Case Manager",
    email: "demo@icaremanager.com",
    role: "case_manager",
    status: "active",
    programs: ["Carroll County CCS"],
    states: ["MD"],
    lastLogin: "2 months ago",
    title: "Case Manager",
    caseload: 0,
    caseloadCapacity: 5,
    supervisor: "Jennie Thollander",
  },
];

export interface RoleDef {
  key: RoleKey;
  name: string;
  description: string;
  isDefault: true;
  userCount: number;
}

export const roles: RoleDef[] = [
  {
    key: "admin",
    name: "Admin",
    description: "Full system access including settings, billing, and platform.",
    isDefault: true,
    userCount: 1,
  },
  {
    key: "supervisor",
    name: "Supervisor",
    description: "Case management + team oversight + reports + platform access.",
    isDefault: true,
    userCount: 1,
  },
  {
    key: "case_manager",
    name: "Case Manager",
    description: "All case management modules for assigned individuals only.",
    isDefault: true,
    userCount: 3,
  },
  {
    key: "billing",
    name: "Billing",
    description: "Billing module + billing reports + read-only documentation.",
    isDefault: true,
    userCount: 0,
  },
  {
    key: "read_only",
    name: "Read Only",
    description: "View-only access to all records. No create/edit/delete.",
    isDefault: true,
    userCount: 0,
  },
];

export type PermissionLevel = "full" | "view" | "none";

export interface PermissionRow {
  module: string;
  perms: Record<RoleKey, PermissionLevel>;
}

const F: PermissionLevel = "full";
const V: PermissionLevel = "view";
const N: PermissionLevel = "none";

export const permissionsMatrix: PermissionRow[] = [
  { module: "Dashboard", perms: { admin: F, supervisor: F, case_manager: F, billing: V, read_only: V } },
  { module: "People Supported", perms: { admin: F, supervisor: F, case_manager: F, billing: V, read_only: V } },
  { module: "My Work", perms: { admin: F, supervisor: F, case_manager: F, billing: F, read_only: V } },
  { module: "Contact Notes", perms: { admin: F, supervisor: F, case_manager: F, billing: V, read_only: V } },
  { module: "Progress Notes", perms: { admin: F, supervisor: F, case_manager: F, billing: V, read_only: V } },
  { module: "Visit Summary", perms: { admin: F, supervisor: F, case_manager: F, billing: V, read_only: V } },
  { module: "Monitoring Form", perms: { admin: F, supervisor: F, case_manager: F, billing: N, read_only: V } },
  { module: "Care Plan / ISP", perms: { admin: F, supervisor: F, case_manager: F, billing: V, read_only: V } },
  { module: "Assessments", perms: { admin: F, supervisor: F, case_manager: F, billing: N, read_only: V } },
  { module: "Eligibility Verification", perms: { admin: F, supervisor: F, case_manager: F, billing: V, read_only: V } },
  { module: "Incident Reporting", perms: { admin: F, supervisor: F, case_manager: F, billing: N, read_only: V } },
  { module: "Case Management", perms: { admin: F, supervisor: F, case_manager: F, billing: N, read_only: V } },
  { module: "Referrals", perms: { admin: F, supervisor: F, case_manager: F, billing: N, read_only: V } },
  { module: "Documents", perms: { admin: F, supervisor: F, case_manager: F, billing: V, read_only: V } },
  { module: "Reports", perms: { admin: F, supervisor: F, case_manager: V, billing: V, read_only: V } },
  { module: "Compliance Agents", perms: { admin: F, supervisor: V, case_manager: N, billing: N, read_only: N } },
  { module: "Guidelines Engines", perms: { admin: F, supervisor: V, case_manager: N, billing: N, read_only: N } },
  { module: "Assessment Builder", perms: { admin: F, supervisor: N, case_manager: N, billing: N, read_only: N } },
  { module: "Billing", perms: { admin: F, supervisor: V, case_manager: N, billing: F, read_only: N } },
  { module: "Settings", perms: { admin: F, supervisor: N, case_manager: N, billing: N, read_only: N } },
  { module: "User Management", perms: { admin: F, supervisor: N, case_manager: N, billing: N, read_only: N } },
  { module: "Audit Log", perms: { admin: F, supervisor: V, case_manager: N, billing: V, read_only: N } },
];

export interface IntegrationDef {
  id: string;
  name: string;
  category: "billing" | "clinical" | "interop" | "comm" | "sso" | "state";
  description: string;
  status: "connected" | "not_connected" | "error" | "coming_soon";
  iconKey: string;
}

export const integrations: IntegrationDef[] = [
  {
    id: "idd-billing",
    name: "IDD Billing.AI",
    category: "billing",
    description: "Full revenue cycle management. Billable notes auto-submit to billing queue.",
    status: "connected",
    iconKey: "credit-card",
  },
  {
    id: "intellectability",
    name: "Intellectability (HRST)",
    category: "clinical",
    description: "Automatic HRST score sync. Triggers compliance alerts when score ≥ 3.",
    status: "not_connected",
    iconKey: "activity",
  },
  {
    id: "fhir",
    name: "HL7 / FHIR R4",
    category: "interop",
    description: "FHIR R4 data exchange for interoperability with state systems and providers.",
    status: "connected",
    iconKey: "share-2",
  },
  {
    id: "evv",
    name: "Electronic Visit Verification",
    category: "clinical",
    description: "Visit verification for Medicaid compliance under the 21st Century Cures Act.",
    status: "coming_soon",
    iconKey: "map-pin",
  },
  {
    id: "ltss",
    name: "State Systems (LTSS, Prism/Pega)",
    category: "state",
    description: "Direct data exchange with state case management systems.",
    status: "not_connected",
    iconKey: "landmark",
  },
  {
    id: "sms",
    name: "SMS / Text Messaging",
    category: "comm",
    description: "Send SMS reminders and alerts via Twilio.",
    status: "not_connected",
    iconKey: "message-square",
  },
  {
    id: "telehealth",
    name: "Telehealth",
    category: "comm",
    description: "Connect Zoom or Teams for telehealth visits.",
    status: "not_connected",
    iconKey: "video",
  },
];

export interface AIFeatureDef {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

export const aiFeatures: AIFeatureDef[] = [
  { key: "chat", name: "AI Chat Assistant", description: "AI chat interface and suggested prompts on the main screen.", enabled: true },
  { key: "ambient", name: "Ambient Listening", description: "Record sessions and auto-populate documentation.", enabled: true },
  { key: "doc", name: "AI Document Processing", description: "AI reads uploaded documents and extracts information automatically.", enabled: true },
  { key: "prefill", name: "AI Pre-fill (Forms)", description: "AI pre-fills form fields from existing records and sessions.", enabled: true },
  { key: "auto_monitor", name: "Compliance Agent Auto-Monitor", description: "Agents run automatically on a schedule without manual triggering.", enabled: true },
  { key: "dash", name: "AI Dashboard Suggestions", description: "AI suggestions panel on dashboard and eChart.", enabled: true },
  { key: "report", name: "AI Report Insights", description: "AI-generated narrative insights in reports.", enabled: true },
  { key: "careplan", name: "Care Plan AI Drafting", description: "AI drafts care plan sections from existing records.", enabled: true },
];

export interface ProgramDef {
  id: string;
  name: string;
  state: string;
  type: string;
  fundingSource: string;
  billingUnit: string;
  individuals: number;
  active: boolean;
}

export const programs: ProgramDef[] = [
  {
    id: "prg-001",
    name: "Carroll County CCS",
    state: "Maryland",
    type: "IDD Waiver",
    fundingSource: "Medicaid",
    billingUnit: "15 minutes",
    individuals: 64,
    active: true,
  },
  {
    id: "prg-002",
    name: "Dallas County CCS",
    state: "Virginia",
    type: "DD Waiver",
    fundingSource: "Medicaid",
    billingUnit: "15 minutes",
    individuals: 35,
    active: true,
  },
];

export const operatingStates = [
  { code: "MD", name: "Maryland" },
  { code: "VA", name: "Virginia" },
];

// ---- Helpers ---------------------------------------------------------------

export function roleLabel(r: RoleKey): string {
  const m: Record<RoleKey, string> = {
    admin: "Admin",
    supervisor: "Supervisor",
    case_manager: "Case Manager",
    billing: "Billing",
    read_only: "Read Only",
  };
  return m[r];
}

export function roleAvatarTone(r: RoleKey): string {
  const map: Record<RoleKey, string> = {
    admin: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    supervisor: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    case_manager: "bg-purple-50 text-purple-600 ring-purple-200",
    billing: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    read_only: "bg-icm-bg text-icm-text-dim ring-icm-border",
  };
  return map[r];
}

export function roleBadgeTone(r: RoleKey): string {
  return roleAvatarTone(r);
}

export function statusTone(s: UserStatus): string {
  const m: Record<UserStatus, string> = {
    active: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    inactive: "bg-icm-bg text-icm-text-dim ring-icm-border",
    pending: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    locked: "bg-icm-red-soft text-icm-red ring-icm-red/20",
  };
  return m[s];
}

export function permTone(p: PermissionLevel): string {
  const m: Record<PermissionLevel, string> = {
    full: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    view: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    none: "bg-icm-bg text-icm-text-faint ring-icm-border",
  };
  return m[p];
}

export function permLabel(p: PermissionLevel): string {
  return p === "full" ? "Full" : p === "view" ? "View" : "—";
}

export function getInitials(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function getUser(id: string): OrgUser | undefined {
  return orgUsers.find((u) => u.id === id);
}

export function userCounts() {
  return {
    total: orgUsers.length,
    active: orgUsers.filter((u) => u.status === "active").length,
    inactive: orgUsers.filter((u) => u.status === "inactive").length,
    pending: orgUsers.filter((u) => u.status === "pending").length,
    admins: orgUsers.filter((u) => u.role === "admin").length,
  };
}
