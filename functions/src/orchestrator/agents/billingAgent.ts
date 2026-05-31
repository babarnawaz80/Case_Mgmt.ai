// Billing Agent — Brain Orchestrator
// Finds unsigned billable notes, expiring authorizations, and service cap warnings.

import * as admin from "firebase-admin";
import { IndividualRecord, AgentResult } from "../types";

export async function runBillingAgent(
  individual: IndividualRecord,
  runId: string,
  orgId: string,
  db: admin.firestore.Firestore
): Promise<AgentResult> {
  const tasks: AgentResult["tasks"] = [];
  const logs: AgentResult["logs"] = [];

  const indName = `${individual.first_name} ${individual.last_name}`;
  const assignedTo = individual.assigned_case_manager_uid ?? "";
  const assignedName = individual.assigned_case_manager_name ?? "Unassigned";
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // ── 1. Unsigned billable progress notes older than 48 hours ─────────────────
  try {
    const unsignedSnap = await db
      .collection("progress_notes")
      .where("individualId", "==", individual.id)
      .where("billable", "==", true)
      .where("status", "in", ["draft", "pending_signature"])
      .get();

    const oldUnsigned = unsignedSnap.docs.filter((d) => {
      const data = d.data();
      const created = data.createdAt?.toDate?.() ?? data.created_at?.toDate?.();
      return created && created < twoDaysAgo;
    });

    if (oldUnsigned.length > 0) {
      tasks.push({
        org_id: orgId,
        individual_id: individual.id,
        individual_name: indName,
        assigned_to_user_id: assignedTo,
        assigned_to_name: assignedName,
        task_type: "billing_action",
        severity: "high",
        title: `${oldUnsigned.length} unsigned billable note${oldUnsigned.length > 1 ? "s" : ""} — ${indName}`,
        description: `${oldUnsigned.length} billable progress note${oldUnsigned.length > 1 ? "s" : ""} pending signature for more than 48 hours. Unsigned notes cannot be billed.`,
        rule_reference: "Billing policy: Notes must be signed within 48 hours for timely billing",
        due_date: admin.firestore.Timestamp.fromDate(now),
        days_overdue: 0,
        has_ai_draft: false,
        ai_draft_id: null,
        source_agent: "billing",
        status: "pending",
        rule_id: "BILLING_UNSIGNED_NOTES",
        task_reason: `${oldUnsigned.length} billable progress note(s) have been in draft/pending_signature status for more than 48 hours and cannot be submitted for billing.`,
        evidence_checked: "progress_notes (billable=true, status in [draft, pending_signature], createdAt)",
      });

      logs.push({
        org_id: orgId,
        individual_id: individual.id,
        agent: "billing",
        action: "UNSIGNED_BILLABLE_NOTES_FOUND",
        rule_applied: "48-hour signing policy for billable notes",
        finding: `${oldUnsigned.length} unsigned billable notes older than 48 hours`,
        result: "Task created: billing_action",
      });
    }
  } catch {
    // Non-fatal — collection may not have the required index
  }

  // ── 2. Expiring service authorizations ──────────────────────────────────────
  try {
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in30Str = in30.toISOString().split("T")[0];
    const nowStr = now.toISOString().split("T")[0];

    const authSnap = await db
      .collection("service_authorizations")
      .where("individualId", "==", individual.id)
      .where("status", "==", "active")
      .get();

    const expiringAuths = authSnap.docs.filter((d) => {
      const endDate = d.data().end_date ?? d.data().expiration_date;
      return endDate && endDate >= nowStr && endDate <= in30Str;
    });

    for (const authDoc of expiringAuths) {
      const auth = authDoc.data();
      const endDate = auth.end_date ?? auth.expiration_date;
      const daysLeft = Math.ceil(
        (new Date(endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      tasks.push({
        org_id: orgId,
        individual_id: individual.id,
        individual_name: indName,
        assigned_to_user_id: assignedTo,
        assigned_to_name: assignedName,
        task_type: "authorization_expiring",
        severity: daysLeft <= 7 ? "critical" : daysLeft <= 14 ? "high" : "medium",
        title: `Authorization expiring in ${daysLeft} days — ${indName}`,
        description: `Service authorization for ${auth.service_name ?? "services"} expires on ${endDate}. Renew to prevent service interruption.`,
        rule_reference: "Service authorization must be active for billing — renewal required before expiration",
        due_date: admin.firestore.Timestamp.fromDate(
          new Date(new Date(endDate).getTime() - 14 * 24 * 60 * 60 * 1000)
        ),
        days_overdue: 0,
        has_ai_draft: false,
        ai_draft_id: null,
        source_agent: "billing",
        status: "pending",
        rule_id: "BILLING_AUTH_EXPIRY",
        task_reason: `Service authorization for ${auth.service_name ?? "services"} (auth #${auth.auth_number ?? authDoc.id}) expires on ${endDate} — ${daysLeft} days remaining before billing becomes invalid.`,
        evidence_checked: "service_authorizations (status=active, end_date, expiration_date)",
      });

      logs.push({
        org_id: orgId,
        individual_id: individual.id,
        agent: "billing",
        action: "AUTHORIZATION_EXPIRING",
        rule_applied: "Active authorization required for billing",
        finding: `Auth #${auth.auth_number ?? authDoc.id} expires on ${endDate} (${daysLeft} days)`,
        result: `Task created: authorization_expiring — severity: ${daysLeft <= 7 ? "critical" : daysLeft <= 14 ? "high" : "medium"}`,
      });
    }
  } catch {
    // Non-fatal
  }

  return { tasks, logs, drafts_count: 0 };
}
