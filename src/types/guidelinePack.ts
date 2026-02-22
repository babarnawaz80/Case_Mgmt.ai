// ============= GUIDELINE PACK TYPES =============

export interface GuidelinePack {
  id: string;
  guideline_version_date: string;
  state: string;
  program_waiver_type: string;
  service_name: string;
  source_service_name: string;
  service_category: 'Meaningful Day' | 'Support' | 'Residential' | 'Behavioral' | 'Other';
  billing_unit: '15 min' | 'hourly' | 'daily' | 'monthly' | 'milestone' | 'other';
  service_description: string;
  eligibility_rules: GuidelineItem[];
  authorization_requirements: GuidelineItem[];
  pcp_requirements: GuidelineItem[];
  prerequisite_requirements: GuidelineItem[];
  limits: LimitGuideline[];
  conflicts: ConflictGuideline[];
  documentation_requirements: GuidelineItem[];
  self_directed_differences: GuidelineItem[];
  monitoring_rules: GuidelineItem[];
  hard_stops: GuidelineItem[];
  warnings: GuidelineItem[];
  citations: Citation[];
  published: boolean;
  created_by: string;
  created_at: string;
}

// Backward compat alias
export type RulePack = GuidelinePack;

export interface GuidelineItem {
  rule_type: string;
  rule_text: string;
}

// Backward compat alias
export type RuleItem = GuidelineItem;

export interface LimitGuideline {
  type: 'daily' | 'weekly' | 'yearly' | 'frequency' | 'plan_year';
  rule_text: string;
  value?: number;
  unit?: string;
}

// Backward compat alias
export type LimitRule = LimitGuideline;

export interface ConflictGuideline {
  type: 'same_time' | 'same_day';
  conflicting_service: string;
  rule_text: string;
}

// Backward compat alias
export type ConflictRule = ConflictGuideline;

export interface Citation {
  page: string;
  section: string;
  text: string;
}

// ============= WORKFLOW TYPES =============

export interface WorkflowNode {
  id: string;
  step: number;
  name: string;
  type: 'intake' | 'eligibility' | 'pcp_validation' | 'limits' | 'conflict' | 'documentation' | 'authorization' | 'monitoring';
  description: string;
  triggers: string[];
  actions: string[];
  validations: string[];
  output: string[];
  status: 'pending' | 'active' | 'complete';
}

// ============= LAYER 1 ADMIN AGENT STATE =============

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'processing' | 'parsed' | 'error';
  extractedServices?: number;
}

export interface ExtractionSummary {
  totalServices: number;
  hardStopCount: number;
  warningCount: number;
  unclearSections: string[];
  publishReady: boolean;
}

export interface Layer1State {
  step: number;
  uploadedFiles: UploadedFile[];
  optionalTemplates: UploadedFile[];
  serviceCodeMapping: string;
  guidelinePacks: GuidelinePack[];
  /** @deprecated Use guidelinePacks */
  rulePacks?: GuidelinePack[];
  extractionSummary: ExtractionSummary | null;
  isProcessing: boolean;
}

// Backward compat
/** @deprecated Use Layer1State.guidelinePacks */
export type { Layer1State as Layer1StateCompat };

// ============= LAYER 2 CM AGENT STATE =============

export interface ModuleMapping {
  module: string;
  enabled: boolean;
  fields: string[];
}

export interface ComplianceCheckResult {
  service: string;
  eligibility: 'pass' | 'fail' | 'pending';
  pcpAlignment: 'pass' | 'fail' | 'warning' | 'pending';
  limitsStatus: 'ok' | 'warning' | 'hard_stop' | 'pending';
  conflictStatus: 'clear' | 'conflict' | 'pending';
  documentationReady: boolean;
  overallStatus: 'compliant' | 'needs_attention' | 'cannot_submit';
}

export interface Layer2State {
  step: number;
  selectedGuidelinePack: GuidelinePack | null;
  /** @deprecated Use selectedGuidelinePack */
  selectedRulePack?: GuidelinePack | null;
  moduleMapping: ModuleMapping[];
  complianceResult: ComplianceCheckResult | null;
  isProcessing: boolean;
}

// ============= LEGACY COMPAT (used by existing steps) =============

export interface PCPValidationItem {
  id: string;
  label: string;
  description: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  autoAction?: string;
}

export interface CapLimit {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'combined' | 'plan_year' | 'milestone';
  currentValue: number;
  maxValue: number;
  unit: string;
  status: 'ok' | 'warning' | 'hard_stop';
}

export interface ConflictCheck {
  id: string;
  service: string;
  conflictWith: string;
  type: 'schedule_overlap' | 'concurrent_billing' | 'attendance_conflict';
  severity: 'block' | 'warning';
  suggestion: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  type: 'billable_note' | 'progress_note' | 'behavioral_assessment' | 'employment_plan' | 'monitoring_form' | 'milestone';
  fields: string[];
  generated: boolean;
}

export interface AuthorizationOutput {
  summary: string;
  complianceScore: number;
  riskScore: number;
  missingDocs: string[];
  tasks: { id: string; title: string; priority: 'high' | 'medium' | 'low'; assignee: string }[];
}

// Keep for backward compat
export interface AgentBuilderState {
  step: number;
  agentName: string;
  agentDescription: string;
  uploadedFiles: UploadedFile[];
  guidelinePacks: GuidelinePack[];
  /** @deprecated Use guidelinePacks */
  rulePacks?: GuidelinePack[];
  workflowNodes: WorkflowNode[];
  isProcessing: boolean;
}
