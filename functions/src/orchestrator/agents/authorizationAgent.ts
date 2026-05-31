// Authorization Agent — Orchestrator
// Scans all active service authorizations for each individual and creates
// tasks/escalations based on expiration proximity and utilization pace.

import * as admin from "firebase-admin";
import { IndividualRecord, AgentResult } from "../types";

export async function runAuthorizationAgent(
  individual: IndividualRecord,
  runId: string,
  orgId: string,
  db: admin.firestore.Firestore
): Promise<AgentResult> {
  const tasks: AgentResult["tasks"] = [];
  const logs: AgentResult["logs"] = [];

  const today = new Date();
  const indName = `${individual.first_name} ${individual.last_name}`;
  const assignedTo = individual.assigned_case_manager_uid ?? "";
  const assignedName = individual.assigned_case_manager_name ?? "Unassigned";

  try {
    // Load active authorizations for this individual
    const authSnap = await db
      .collection("service_authorizations")
      .where("individualId", "==", individual.id)
      .where("status", "==", "Active")
      .get();

    if (authSnap.empty) return { tasks, logs, drafts_count: 0 };

    for (const authDoc of authSnap.docs) {
      const auth = authDoc.data();
      const endDateRaw = auth.end_date || auth.expirationDate;
      if (!endDateRaw) continue;

      const endDate = new Date(endDateRaw);
      const daysUntil = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const serviceName = auth.service_name || auth.serviceName || "Service";
      const authNumber = auth.auth_number || auth.authorizationId || auth.authNumber || "—";

      // ── Determine severity ──────────────────────────────────────────────────
      let severity: "info" | "medium" | "high" | "critical" | null = null;
      let message = "";

      if (daysUntil < 0) {
        severity = "critical";
        message = `${serviceName} authorization ${authNumber} EXPIRED ${Math.abs(daysUntil)} days ago. Services may be unbillable.`;
      } else if (daysUntil <= 7) {
        severity = "critical";
        message = `${serviceName} authorization ${authNumber} expires in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}. IMMEDIATE ACTION REQUIRED.`;
      } else if (daysUntil <= 14) {
        severity = "critical";
        message = `${serviceName} authorization ${authNumber} expires in ${daysUntil} days. Begin reauthorization now.`;
      } else if (daysUntil <= 30) {
        severity = "high";
        message = `${serviceName} authorization ${authNumber} expires in ${daysUntil} days. Start renewal process.`;
      } else if (daysUntil <= 60) {
        severity = "medium";
        message = `${serviceName} authorization ${authNumber} expires in ${daysUntil} days. Plan renewal.`;
      } else if (daysUntil <= 90) {
        severity = "info";
        message = `${serviceName} authorization ${authNumber} expires in ${daysUntil} days.`;
      }

      // ── Utilization pace check ─────────────────────────────────────────────
      const unitsAuth = auth.units_authorized || auth.authorizedUnits || 0;
      const unitsUsed = auth.units_used || auth.unitsUsed || 0;
      const startDateRaw = auth.start_date || auth.effectiveDate;
      let paceWarning = "";

      if (unitsAuth > 0 && unitsUsed > 0 && startDateRaw && daysUntil > 0) {
        const startDate = new Date(startDateRaw);
        const daysElapsed = Math.max(1, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        if (daysElapsed >= 7) {
          const dailyRate = unitsUsed / daysElapsed;
          const daysUntilExhaustion = Math.floor((unitsAuth - unitsUsed) / dailyRate);
          if (daysUntilExhaustion < daysUntil - 7) {
            const exhaustDate = new Date(today.getTime() + daysUntilExhaustion * 24 * 60 * 60 * 1000);
            paceWarning = ` PACE WARNING: At ${dailyRate.toFixed(1)} units/day, units exhaust by ${exhaustDate.toLocaleDateString()} — ${daysUntil - daysUntilExhaustion} days before auth ends.`;
            if (!severity || severity === "info") severity = "medium";
          }
        }
      }

      if (!severity) continue;

      // ── Create task ────────────────────────────────────────────────────────
      const dueTimestamp = admin.firestore.Timestamp.fromDate(
        new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000)
      );

      tasks.push({
        org_id: orgId,
        individual_id: individual.id,
        individual_name: indName,
        assigned_to_user_id: assignedTo,
        assigned_to_name: assignedName,
        task_type: "authorization_expiring",
        severity: severity === "critical" ? "critical" : severity === "high" ? "high" : "medium",
        title: `Renew ${serviceName} authorization — ${authNumber}`,
        description: message + paceWarning,
        rule_reference: `Service Authorization Renewal — ${daysUntil < 0 ? "EXPIRED" : `${daysUntil}d until expiration`}`,
        due_date: dueTimestamp,
        days_overdue: daysUntil < 0 ? Math.abs(daysUntil) : 0,
        has_ai_draft: false,
        ai_draft_id: null,
        source_agent: "escalation" as const,
        status: "pending",
        rule_id: daysUntil < 0 ? "AUTHORIZATION_EXPIRED" : "AUTHORIZATION_EXPIRING",
        task_reason: daysUntil < 0
          ? `Service authorization ${authNumber} for ${serviceName} expired ${Math.abs(daysUntil)} days ago on ${endDateRaw} — services may not be billable.`
          : `Service authorization ${authNumber} for ${serviceName} expires on ${endDateRaw} with only ${daysUntil} days remaining — renewal must be initiated.`,
        evidence_checked: "service_authorizations (status=Active, end_date, expirationDate, units_authorized, units_used, start_date)",
      });

      logs.push({
        org_id: orgId,
        individual_id: individual.id,
        agent: "escalation" as const,
        action: daysUntil < 0 ? "AUTH_EXPIRED" : daysUntil <= 30 ? "AUTH_EXPIRING_CRITICAL" : "AUTH_EXPIRING_WARNING",
        rule_applied: `Authorization expiration threshold — ${daysUntil}d remaining`,
        finding: message + paceWarning,
        result: severity === "critical" ? "Task created — supervisor escalation triggered" : "Task created",
      });

      // ── Supervisor escalation for critical ────────────────────────────────
      if ((severity === "critical") && individual.assigned_supervisor_uid) {
        try {
          await db.collection("notifications").add({
            uid: individual.assigned_supervisor_uid,
            organizationId: orgId,
            type: "alert",
            title: `⚠ Authorization ${daysUntil < 0 ? "EXPIRED" : "Expiring Soon"} — ${indName}`,
            body: message,
            href: `/people/${individual.id}/authorizations`,
            read: false,
            dismissed: false,
            severity: "critical",
            source: "authorization_agent",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch { /* non-fatal */ }
      }
    }
  } catch (err) {
    console.warn(`[AuthorizationAgent] Error for ${individual.id}:`, err);
  }

  return { tasks, logs, drafts_count: 0 };
}
