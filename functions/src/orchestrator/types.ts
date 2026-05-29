// Brain Orchestrator — TypeScript Interfaces
// CaseManagement.AI

import * as admin from "firebase-admin";

export interface RulePack {
  visit_frequency_months: number;
  monitoring_form_frequency_months: number;
  contact_frequency_months: number;
  annual_pcp_required: boolean;
  pcp_renewal_cycle_days: number;
  medicaid_redetermination_cycle_days: number;
  assessment_frequency_months: number;
  supervisor_review_required: boolean;
  billing_authorization_required: boolean;
  state?: string;
  program?: string;
  version?: string;
  source?: "guidelines_engine" | "default_fallback";
}

export interface IndividualRecord {
  id: string;
  first_name: string;
  last_name: string;
  organizationId: string;
  enrollment_status: string;
  program?: string;
  program_type?: string;
  waiver_type?: string;
  state?: string;
  assigned_case_manager_uid?: string;
  assigned_case_manager_name?: string;
  assigned_supervisor_uid?: string;
  assigned_supervisor_name?: string;
  last_visit_date?: string;
  last_monitoring_form_date?: string;
  last_assessment_date?: string;
  last_pcp_approval_date?: string;
  pcp_due_date?: string;
  isp_due_date?: string;
  ma_redetermination_date?: string;
  compliance_score?: number;
  compliance_tier?: "green" | "amber" | "red";
  risk_score?: number;
  county?: string;
}

export interface ComplianceFinding {
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  days_overdue: number;
  rule_reference: string;
  requires_task: boolean;
  requires_draft: boolean;
}

export interface OrchestratorTask {
  task_id?: string;
  org_id: string;
  individual_id: string;
  individual_name: string;
  assigned_to_user_id: string;
  assigned_to_name: string;
  task_type:
    | "visit_required"
    | "monitoring_form_due"
    | "pcp_renewal"
    | "medicaid_redetermination"
    | "assessment_due"
    | "authorization_expiring"
    | "billing_action"
    | "escalation"
    | "contact_required";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  rule_reference: string;
  due_date: admin.firestore.Timestamp;
  days_overdue: number;
  has_ai_draft: boolean;
  ai_draft_id: string | null;
  source_agent: "compliance" | "documentation" | "billing" | "escalation" | "renewal";
  run_id: string;
  status: "pending" | "acknowledged" | "in_progress" | "completed" | "dismissed";
  created_at: admin.firestore.FieldValue;
  updated_at: admin.firestore.FieldValue;
}

export interface OrchestratorRun {
  run_id?: string;
  org_id: string;
  run_type: "scheduled" | "manual";
  triggered_by: string;
  started_at: admin.firestore.Timestamp;
  completed_at?: admin.firestore.Timestamp;
  status: "running" | "completed" | "failed";
  individuals_processed: number;
  tasks_created: number;
  drafts_generated: number;
  escalations_triggered: number;
  compliance_scores_updated: number;
  errors: string[];
  summary?: string;
}

export interface OrchestratorLog {
  log_id?: string;
  org_id: string;
  run_id: string;
  individual_id: string;
  agent: "compliance" | "documentation" | "billing" | "escalation" | "renewal";
  action: string;
  rule_applied: string;
  finding: string;
  result: string;
  timestamp: admin.firestore.FieldValue;
}

export interface AgentResult {
  tasks: Omit<OrchestratorTask, "run_id" | "created_at" | "updated_at">[];
  logs: Omit<OrchestratorLog, "run_id" | "timestamp">[];
  compliance_score?: number;
  drafts_count: number;
}

export interface OrchestratorSettings {
  scheduled_run_time: string;
  escalation_thresholds: {
    supervisor_alert_days: number;
    supervisor_task_days: number;
    director_alert_days: number;
    critical_alert_days: number;
  };
  agents_enabled: {
    compliance: boolean;
    documentation: boolean;
    billing: boolean;
    escalation: boolean;
    renewal: boolean;
  };
  critical_alert_recipients: string[];
  log_retention_days: number;
}

export const DEFAULT_ORCHESTRATOR_SETTINGS: OrchestratorSettings = {
  scheduled_run_time: "02:00",
  escalation_thresholds: {
    supervisor_alert_days: 7,
    supervisor_task_days: 14,
    director_alert_days: 21,
    critical_alert_days: 30,
  },
  agents_enabled: {
    compliance: true,
    documentation: true,
    billing: true,
    escalation: true,
    renewal: true,
  },
  critical_alert_recipients: [],
  log_retention_days: 365,
};
