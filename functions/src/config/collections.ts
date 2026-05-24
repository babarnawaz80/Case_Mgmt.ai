// Firestore Collection Name Constants
// CaseManagement.AI — single source of truth for all collection names

export const COLLECTIONS = {
  CONFIG: "config",
  ORGANIZATIONS: "organizations",
  USERS: "users",
  INDIVIDUALS: "individuals",
  CONTACT_NOTES: "contact_notes",
  PROGRESS_NOTES: "progress_notes",
  VISIT_SUMMARIES: "visit_summaries",
  MONITORING_FORMS: "monitoring_forms",
  CARE_PLANS: "care_plans",
  WORKFLOW_TASKS: "workflow_tasks",
  INCIDENTS: "incidents",
  REFERRALS: "referrals",
  SERVICE_AUTHORIZATIONS: "service_authorizations",
  BILLING_CLAIMS: "billing_claims",
  AI_CHECKINS: "ai_checkins",
  AI_USAGE_LOG: "ai_usage_log",
  CREDIT_HISTORY: "credit_history",
  AUDIT_LOG: "audit_log",
  NOTIFICATIONS: "notifications",
} as const;

export const CONFIG_DOCS = {
  AI_ROUTING: "ai_routing",
  CREDIT_RATES: "credit_rates",
  CREDIT_PACKS: "credit_packs",
} as const;
