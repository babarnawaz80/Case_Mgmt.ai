// Audit Service — HIPAA-Compliant Immutable Audit Trail
// CaseManagement.AI
// CRITICAL: Never log raw PHI. Reference entities by ID only.

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'view_individual'
  | 'create_note'
  | 'edit_note'
  | 'apply_ambient'
  | 'generate_pcp'
  | 'send_pcp'
  | 'download_pcp'
  | 'override_compliance'
  | 'export_data'
  | 'settings_change'
  | 'user_created'
  | 'user_role_changed'
  | 'engine_published'
  | 'compliance_run'
  | 'draft_saved'
  | 'draft_applied'
  | 'draft_discarded'
  | 'care_plan_created'
  | 'care_plan_updated'
  | 'care_plan_completed'
  | 'plan_shared'
  | 'visit_summary_created'
  | 'visit_summary_signed'
  | 'monitoring_form_submitted'
  | 'incident_created'
  | 'incident_stage_updated'
  | 'referral_created'
  | 'workflow_task_updated'
  | 'eligibility_verified';

export interface AuditEntry {
  actorUserId: string;
  action: AuditAction;
  targetType: string;       // e.g., 'individual', 'note', 'care_plan'
  targetId: string;         // ID of the record — never the record content
  sessionId?: string;
  engineVersion?: string;
  sourceIp?: string;
  metadata?: Record<string, string | number | boolean>; // Non-PHI only
  occurredAt: ReturnType<typeof serverTimestamp>;
}

// Write an audit log entry — append only, never update or delete
export async function writeAudit(
  action: AuditAction,
  targetType: string,
  targetId: string,
  metadata?: Record<string, string | number | boolean>
): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) return; // Cannot audit unauthenticated actions

    const entry: Omit<AuditEntry, 'occurredAt'> & { occurredAt: ReturnType<typeof serverTimestamp> } = {
      actorUserId: user.uid,
      action,
      targetType,
      targetId,
      metadata: metadata ?? {},
      occurredAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'audit_log'), entry);
  } catch (error) {
    // Audit failures must never silently fail — log to console (not the PHI, just the failure)
    console.error('[AUDIT FAILURE] Failed to write audit entry:', action, targetType, targetId);
  }
}

// Convenience wrappers for common audit events
export const audit = {
  login: (userId: string) =>
    writeAudit('login', 'user', userId),

  viewIndividual: (individualId: string) =>
    writeAudit('view_individual', 'individual', individualId),

  createNote: (noteId: string, individualId: string, noteType: string) =>
    writeAudit('create_note', 'note', noteId, { individualId, noteType }),

  applyAmbient: (sessionId: string, individualId: string, modulesApplied: string) =>
    writeAudit('apply_ambient', 'ai_session', sessionId, { individualId, modulesApplied }),

  generatePCP: (carePlanId: string, individualId: string) =>
    writeAudit('generate_pcp', 'care_plan', carePlanId, { individualId }),

  sendPCP: (carePlanId: string, individualId: string, deliveryMethod: string) =>
    writeAudit('send_pcp', 'care_plan', carePlanId, { individualId, deliveryMethod }),

  downloadPCP: (carePlanId: string, individualId: string) =>
    writeAudit('download_pcp', 'care_plan', carePlanId, { individualId }),

  complianceRun: (runId: string, agentId: string, individualId: string) =>
    writeAudit('compliance_run', 'compliance_run', runId, { agentId, individualId }),

  overrideCompliance: (runId: string, ruleId: string, justificationLength: number) =>
    writeAudit('override_compliance', 'compliance_run', runId, { ruleId, justificationLength }),

  exportData: (exportType: string, recordCount: number) =>
    writeAudit('export_data', 'export', exportType, { recordCount }),
};
