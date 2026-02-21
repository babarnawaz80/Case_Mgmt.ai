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
  type: 'intake' | 'eligibility' | 'authorization' | 'documentation' | 'monitoring';
  description: string;
  triggers: string[];
  actions: string[];
  validations: string[];
  output: string[];
  status: 'pending' | 'active' | 'complete';
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
