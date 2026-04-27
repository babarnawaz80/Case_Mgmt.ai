export type EngineStatus = 'draft' | 'published' | 'archived';
export type AgentStatus = 'active' | 'inactive';
export type ApplyMode = 'manual' | 'pre-selected' | 'supervisor-bulk';
export type RiskStatus = 'healthy' | 'watch' | 'at-risk';
export type RunResult = 'pass' | 'warning' | 'hard_stop';
export type BillingResult = 'Clean' | 'Pending' | 'Flagged' | 'Denied';
export type ClaimStatus = 'draft' | 'ready' | 'submitted' | 'denied';
export type ClaimDraftStatus = 'draft' | 'blocked' | 'ready_to_bill';
export type GenerationSource = 'agent_pipeline' | 'manual_bypass' | 'recalculated';
export type TrackingStatus = 'generated' | 'billed' | 'accepted_clearinghouse' | 'accepted_payer' | 'denied' | 'paid';
export type UserRole = 'admin' | 'billing-staff' | 'supervisor' | 'read-only';
export type ServiceCategory = 'Meaningful Day' | 'Support' | 'Residential' | 'Behavioral' | 'Employment' | 'Other';
export type TriggerStage = 'post_supervisor_review' | 'post_biller_approval';
export type PipelineStatus = 'success' | 'blocked' | 'failed';
export type AttendanceStage = 'dsp_verified' | 'supervisor_approved' | 'biller_approved';

export type AgentType =
  | 'attendance-to-units'
  | 'authorization-matching'
  | 'modifier-pos'
  | 'documentation-sufficiency'
  | 'limits-conflict'
  | 'claims-readiness';

export interface GuidelinesEngine {
  id: string;
  name: string;
  state: string;
  program: string;
  effectiveDate: string;
  version: string;
  status: EngineStatus;
  serviceCount: number;
  ruleCount: number;
  rateTableCount: number;
  hardStopCount: number;
  warningCount: number;
  createdBy: string;
  lastUpdated: string;
  publishedAt?: string;
  parentVersionId?: string;
}

export interface Modifier {
  code: string;
  description: string;
  whenRequired: string;
  autoApply: boolean;
}

export interface RateTableEntry {
  effectiveFrom: string;
  effectiveTo: string;
  unitRate: number;
  rateType: string;
  modifierMultipliers: Record<string, number>;
}

export interface ValidationRule {
  type: 'eligibility' | 'authorization' | 'documentation' | 'prerequisite';
  description: string;
  severity: 'warning' | 'hard_stop';
}

export interface LimitRule {
  type: 'daily' | 'weekly' | 'monthly' | 'annual' | 'auth-period';
  maxUnits: number;
  description: string;
}

export interface Citation {
  page: string;
  section: string;
  snippet: string;
}

export interface RulePack {
  id: string;
  engineId: string;
  serviceName: string;
  serviceCategory: ServiceCategory;
  billingCode: string;
  description: string;
  modifiers: Modifier[];
  rateEntries: RateTableEntry[];
  billingUnit: string;
  unitConversionRules: string;
  validationRules: ValidationRule[];
  limits: LimitRule[];
  conflicts: string[];
  citations: Citation[];
}

export interface RuntimeAgent {
  id: string;
  name: string;
  description: string;
  agentType: AgentType;
  engineId: string;
  engineVersion: string;
  engineName: string;
  status: AgentStatus;
  autoMonitor: boolean;
  applyMode: ApplyMode;
  triggerStage: TriggerStage;
  executionOrder: number;
  scope: string[];
  complianceRate: number;
  individualsServed: number;
  individualsAtRisk: number;
  draftsPending: number;
  lastEvaluatedAt: string;
}

export interface PipelineRun {
  id: string;
  triggerStage: TriggerStage;
  attendanceBatchId: string;
  individualsCount: number;
  startedAt: string;
  completedAt?: string;
  status: PipelineStatus;
  hardStopCount: number;
  warningCount: number;
  agentResults: { agentId: string; agentName: string; status: RunResult }[];
}

export interface IndividualBillingHealth {
  individualId: string;
  name: string;
  state: string;
  program: string;
  assignedTeam: string;
  riskStatus: RiskStatus;
  openHardStopsCount: number;
  openWarningsCount: number;
  lastRunAt: string;
  lastAgentRun: string;
  topIssues: string[];
  recommendedNextAction: string;
}

export interface StepResult {
  stepName: string;
  status: RunResult;
  findings: string[];
  hardStopReasons: string[];
}

export interface Override {
  step: string;
  justification: string;
  overriddenBy: string;
}

export interface BillingRunRecord {
  id: string;
  agentId: string;
  agentName: string;
  engineId: string;
  engineVersion: string;
  individualId: string;
  individualName: string;
  service: string;
  dateRange: string;
  status: BillingResult;
  billingCode: string;
  modifiers: string[];
  units: number;
  rate: number;
  totalAmount: number;
  stepResults: StepResult[];
  overrides: Override[];
  modulesWritten: string[];
  claimId?: string;
  createdAt: string;
}

export interface Claim {
  id: string;
  individualId: string;
  individualName: string;
  service: string;
  billingCode: string;
  modifiers: string[];
  units: number;
  rate: number;
  totalAmount: number;
  status: ClaimStatus;
  payer: string;
  state: string;
  dateOfService: string;
  submittedAt?: string;
  denialReason?: string;
  engineVersion: string;
  runId: string;
  createdAt: string;
}

export interface ClaimDraft {
  id: string;
  individualId: string;
  individualName: string;
  payer: string;
  fundingStream: string;
  program: string;
  service: string;
  billingCode: string;
  modifiers: string[];
  units: number;
  rate: number;
  totalAmount: number;
  billingDateStart: string;
  billingDateEnd: string;
  status: ClaimDraftStatus;
  generationSource: GenerationSource;
  engineName: string;
  engineVersion: string;
  pipelineRunId?: string;
  agentPipelineVersion: string;
  manuallyModified: boolean;
  agentBaseline?: { units: number; modifiers: string[]; rate: number; totalAmount: number };
  blockReasons: string[];
  taskIds: string[];
  createdAt: string;
}

export interface ClaimTracking {
  id: string;
  claimDraftId: string;
  individualName: string;
  service: string;
  billingCode: string;
  totalAmount: number;
  payer: string;
  status: TrackingStatus;
  denialReason?: string;
  timeline: { status: TrackingStatus; timestamp: string; note?: string }[];
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  individualId?: string;
  modulesUpdated: string[];
  idempotencyKey: string;
  details: string;
}

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  'attendance-to-units': 'Unit Calculator',
  'authorization-matching': 'Auth & Utilization Monitor',
  'modifier-pos': 'Code & Modifier Validator',
  'documentation-sufficiency': 'Documentation Checker',
  'limits-conflict': 'Billing Limits Guard',
  'claims-readiness': 'Claim Scrubber',
};

export const AGENT_TYPE_DESCRIPTIONS: Record<AgentType, string> = {
  'attendance-to-units': 'Converts attendance time into billable units using state rounding rules',
  'authorization-matching': 'Tracks authorization balances and alerts before units expire',
  'modifier-pos': 'Ensures correct procedure codes and modifier sequences per state guidelines',
  'documentation-sufficiency': 'Reads progress notes and scores documentation completeness',
  'limits-conflict': 'Catches daily caps, weekly limits, and same-day service conflicts',
  'claims-readiness': 'Packages clean claims and flags common denial patterns before submission',
};
