export interface RulePack {
  id: string;
  service_name: string;
  billing_unit: string;
  eligibility_rules: string[];
  pcp_requirements: string[];
  prerequisite_requirements: string[];
  limits: string[];
  conflicts: string[];
  documentation_requirements: string[];
  monitoring_rules: string[];
}

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

export interface AgentBuilderState {
  step: number;
  agentName: string;
  agentDescription: string;
  uploadedFiles: UploadedFile[];
  rulePacks: RulePack[];
  workflowNodes: WorkflowNode[];
  isProcessing: boolean;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'processing' | 'parsed' | 'error';
  extractedServices?: number;
}
