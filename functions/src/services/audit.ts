// Audit Service (Cloud Functions) — Append-only HIPAA audit logging
// CaseManagement.AI — called after EVERY Firestore write. No exceptions.

import * as admin from "firebase-admin";
import { COLLECTIONS } from "../config/collections";

export interface AuditParams {
  organizationId: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  action: string;
  collectionName: string;
  recordId: string;
  individualId?: string | null;
  summary: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  source?: "user" | "system" | "ai" | "trigger";
}

export async function logAction(params: AuditParams): Promise<void> {
  try {
    const db = admin.firestore();
    await db.collection(COLLECTIONS.AUDIT_LOG).add({
      organizationId: params.organizationId,
      actor_uid: params.actorUid,
      actor_name: params.actorName,
      actor_role: params.actorRole,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      action: params.action,
      collection_name: params.collectionName,
      record_id: params.recordId,
      individual_id: params.individualId ?? null,
      summary: params.summary,
      before_state: params.beforeState ?? null,
      after_state: params.afterState ?? null,
      source: params.source ?? "user",
    });
  } catch (err) {
    // Audit failures must never crash the parent operation — log only
    console.error("[AUDIT FAILURE]", params.action, params.collectionName, params.recordId, err);
  }
}
