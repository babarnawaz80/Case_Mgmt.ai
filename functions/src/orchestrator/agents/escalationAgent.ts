// Escalation Agent — Brain Orchestrator
// Escalates overdue items to supervisors based on configured thresholds.

import * as admin from "firebase-admin";
import { IndividualRecord, AgentResult, OrchestratorSettings, DEFAULT_ORCHESTRATOR_SETTINGS } from "../types";

export async function runEscalationAgent(
  individual: IndividualRecord,
  runId: string,
  orgId: string,
  settings: OrchestratorSettings,
  db: admin.firestore.Firestore
): Promise<AgentResult> {
  const tasks: AgentResult["tasks"] = [];
  const logs: AgentResult["logs"] = [];

  const indName = `${individual.first_name} ${individual.last_name}`;
  const supervisorUid = individual.assigned_supervisor_uid ?? "";
  const supervisorName = individual.assigned_supervisor_name ?? "Supervisor";
  const now = new Date();

  const thresholds = settings.escalation_thresholds ?? DEFAULT_ORCHESTRATOR_SETTINGS.escalation_thresholds;

  // Find overdue tasks for this individual in the orchestrator_tasks collection
  interface TaskData {
    id: string;
    title?: string;
    dueDate?: string;
    source?: string;
    days_overdue?: number;
    [key: string]: unknown;
  }

  // Also check general tasks collection for overdue items
  try {
    const generalTasksSnap = await db
      .collection("tasks")
      .where("individualId", "==", individual.id)
      .where("organizationId", "==", orgId)
      .where("status", "!=", "completed")
      .get();

    const today = now.toISOString().split("T")[0]!;
    const overdueGeneral: TaskData[] = generalTasksSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as TaskData))
      .filter((t) => t.dueDate && t.dueDate < today && t.source === "brain_orchestrator");

    for (const task of overdueGeneral) {
      if (!task.dueDate) continue;
      const dueDate = new Date(task.dueDate);
      const daysOverdue = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysOverdue >= thresholds.critical_alert_days && supervisorUid) {
        // Critical: notify all supervisors
        try {
          await db.collection("notifications").add({
            uid: supervisorUid,
            organizationId: orgId,
            type: "alert",
            title: `CRITICAL: Task ${daysOverdue} days overdue — ${indName}`,
            body: `"${task.title}" for ${indName} is ${daysOverdue} days overdue. Immediate review required.`,
            href: `/people/${individual.id}/echart`,
            read: false,
            dismissed: false,
            severity: "critical",
            source: "brain_orchestrator",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch {
          // Non-fatal
        }

        tasks.push({
          org_id: orgId,
          individual_id: individual.id,
          individual_name: indName,
          assigned_to_user_id: supervisorUid,
          assigned_to_name: supervisorName,
          task_type: "escalation",
          severity: "critical",
          title: `CRITICAL ESCALATION — ${indName}: ${task.title}`,
          description: `Task "${task.title}" is ${daysOverdue} days overdue. Supervisor action required immediately.`,
          rule_reference: `Escalation policy: Tasks overdue ${thresholds.critical_alert_days}+ days require supervisor intervention`,
          due_date: admin.firestore.Timestamp.fromDate(now),
          days_overdue: daysOverdue,
          has_ai_draft: false,
          ai_draft_id: null,
          source_agent: "escalation",
          status: "pending",
          rule_id: "ESCALATION_CRITICAL_OVERDUE_TASK",
          task_reason: `Task "${task.title}" has been overdue for ${daysOverdue} days, exceeding the ${thresholds.critical_alert_days}-day critical escalation threshold — supervisor intervention required immediately.`,
          evidence_checked: "tasks (individualId, organizationId, status!=completed, source=brain_orchestrator, dueDate)",
        });

        // Queue notification for deduplication
        try {
          await db.collection("notification_queue").add({
            run_id: runId,
            recipient_id: supervisorUid,
            individual_id: individual.id,
            individual_name: indName,
            recipient_name: supervisorName,
            urgency: "CRITICAL",
            message: `CRITICAL ESCALATION: Task "${task.title}" for ${indName} is ${daysOverdue} days overdue. Immediate supervisor intervention required.`,
            agent: "escalation",
            rule_id: "ESCALATION_CRITICAL_OVERDUE_TASK",
            queued_at: admin.firestore.FieldValue.serverTimestamp(),
            status: "queued",
            org_id: orgId,
          });
        } catch {
          // Non-fatal
        }

        logs.push({
          org_id: orgId,
          individual_id: individual.id,
          agent: "escalation",
          action: "CRITICAL_ESCALATION",
          rule_applied: `${thresholds.critical_alert_days}-day critical escalation threshold`,
          finding: `Task "${task.title}" is ${daysOverdue} days overdue`,
          result: "Critical alert sent to supervisor, escalation task created",
        });

        // Flag individual as compliance risk
        try {
          await db.collection("individuals").doc(individual.id).update({
            compliance_risk_flag: true,
            compliance_risk_flagged_at: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch {
          // Non-fatal
        }

      } else if (daysOverdue >= thresholds.supervisor_task_days && supervisorUid) {
        // 14+ days: create supervisor task requiring acknowledgment
        try {
          await db.collection("notifications").add({
            uid: supervisorUid,
            organizationId: orgId,
            type: "alert",
            title: `Escalation required — ${indName} (${daysOverdue} days overdue)`,
            body: `"${task.title}" for ${indName} is ${daysOverdue} days overdue and requires supervisor acknowledgment.`,
            href: `/people/${individual.id}/echart`,
            read: false,
            dismissed: false,
            severity: "critical",
            source: "brain_orchestrator",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch {
          // Non-fatal
        }

        logs.push({
          org_id: orgId,
          individual_id: individual.id,
          agent: "escalation",
          action: "SUPERVISOR_ACKNOWLEDGMENT_REQUIRED",
          rule_applied: `${thresholds.supervisor_task_days}-day supervisor task threshold`,
          finding: `Task "${task.title}" is ${daysOverdue} days overdue`,
          result: "Supervisor notification sent",
        });

      } else if (daysOverdue >= thresholds.supervisor_alert_days && supervisorUid) {
        // 7+ days: supervisor alert only
        try {
          await db.collection("notifications").add({
            uid: supervisorUid,
            organizationId: orgId,
            type: "alert",
            title: `Overdue task alert — ${indName} (${daysOverdue} days)`,
            body: `"${task.title}" for ${indName} is ${daysOverdue} days overdue.`,
            href: `/people/${individual.id}/echart`,
            read: false,
            dismissed: false,
            severity: "warning",
            source: "brain_orchestrator",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch {
          // Non-fatal
        }

        logs.push({
          org_id: orgId,
          individual_id: individual.id,
          agent: "escalation",
          action: "SUPERVISOR_ALERT_SENT",
          rule_applied: `${thresholds.supervisor_alert_days}-day supervisor alert threshold`,
          finding: `Task "${task.title}" is ${daysOverdue} days overdue`,
          result: "Supervisor alert sent",
        });
      }
    }
  } catch {
    // Non-fatal
  }

  return { tasks, logs, drafts_count: 0 };
}
