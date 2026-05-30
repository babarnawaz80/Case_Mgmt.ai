// Assessment Compliance Agent — Orchestrator
// Checks assessment deadlines against program-configured schedule rules.
// Creates tasks for overdue or upcoming assessments.

import * as admin from "firebase-admin";
import { IndividualRecord, AgentResult } from "../types";

interface AssessmentScheduleRule {
  id?: string;
  templateId: string;
  templateName: string;
  requirementType: "initial" | "recurring";
  initialDueDays?: number;
  recurringEveryDays?: number;
  countFromEnrollment?: boolean;
  alertDaysBefore?: number[];
  alertOnOverdue?: boolean;
}

export async function runAssessmentAgent(
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
    // ── Load program assessment schedule rules ────────────────────────────────
    let scheduleRules: AssessmentScheduleRule[] = [];

    // Get the individual's program ID
    const indDoc = await db.collection("individuals").doc(individual.id).get().catch(() => null);
    const programId = indDoc?.data()?.programId;

    if (programId) {
      const programDoc = await db.collection("programs").doc(programId).get().catch(() => null);
      const programData = programDoc?.data();
      if (programData?.assessmentSchedule && Array.isArray(programData.assessmentSchedule)) {
        scheduleRules = programData.assessmentSchedule;
      }
    }

    // If no program rules, use sensible defaults: check for any assessments > 13 months old
    if (scheduleRules.length === 0) {
      // Default rule: assessments should not be older than 13 months
      scheduleRules = [{
        templateId: "__any__",
        templateName: "Annual Reassessment",
        requirementType: "recurring",
        recurringEveryDays: 365,
        countFromEnrollment: false,
        alertDaysBefore: [30, 14],
        alertOnOverdue: true,
      }];
    }

    // ── Check each rule against actual assessments ────────────────────────────
    for (const rule of scheduleRules) {
      // Load matching assessments
      let snap: admin.firestore.QuerySnapshot;
      try {
        const q = rule.templateId === "__any__"
          ? db.collection("assessments")
              .where("individualId", "==", individual.id)
              .where("status", "==", "completed")
              .orderBy("completedAt", "desc")
              .limit(1)
          : db.collection("assessments")
              .where("individualId", "==", individual.id)
              .where("templateId", "==", rule.templateId)
              .where("status", "==", "completed")
              .orderBy("completedAt", "desc")
              .limit(1);
        snap = await q.get();
      } catch {
        try {
          // Fallback without ordering
          snap = await db.collection("assessments")
            .where("individualId", "==", individual.id)
            .where("status", "==", "completed")
            .limit(5)
            .get();
        } catch { continue; }
      }

      const lastAssessment = !snap.empty ? snap.docs[0].data() : null;
      const lastCompleted = lastAssessment
        ? (lastAssessment.completedAt?.toDate?.() || new Date(lastAssessment.date || 0))
        : null;

      let daysUntil: number;
      let overdue = false;

      if (rule.requirementType === "initial") {
        const dueDays = rule.initialDueDays ?? 30;
        if (!lastCompleted) {
          // Never completed — check enrollment window
          const enrollDate = indDoc?.data()?.admissionDate || indDoc?.data()?.enrollmentDate;
          if (enrollDate) {
            const enrolled = new Date(enrollDate);
            const daysEnrolled = Math.floor((today.getTime() - enrolled.getTime()) / (1000 * 60 * 60 * 24));
            daysUntil = dueDays - daysEnrolled;
            overdue = daysUntil < 0;
          } else {
            continue; // can't compute without enrollment date
          }
        } else {
          continue; // initial already done
        }
      } else {
        // Recurring
        const freqDays = rule.recurringEveryDays ?? 365;
        const baseDate = lastCompleted || (indDoc?.data()?.admissionDate ? new Date(indDoc.data()!.admissionDate) : null);
        if (!baseDate) continue;
        const nextDue = new Date(baseDate.getTime() + freqDays * 24 * 60 * 60 * 1000);
        daysUntil = Math.floor((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        overdue = daysUntil < 0;
      }

      // Determine if we should fire
      const alertThresholds = rule.alertDaysBefore ?? [30, 14];
      const shouldAlert = overdue
        ? (rule.alertOnOverdue !== false)
        : alertThresholds.some(t => daysUntil <= t);

      if (!shouldAlert) continue;

      const severity = overdue ? "critical" : daysUntil <= 14 ? "high" : "medium";
      const message = overdue
        ? `${rule.templateName} is overdue by ${Math.abs(daysUntil)} days for ${indName}.${lastCompleted ? ` Last completed: ${lastCompleted.toLocaleDateString()}.` : " Never completed."}`
        : `${rule.templateName} for ${indName} is due in ${daysUntil} days.${lastCompleted ? ` Last completed: ${lastCompleted.toLocaleDateString()}.` : ""}`;

      tasks.push({
        org_id: orgId,
        individual_id: individual.id,
        individual_name: indName,
        assigned_to_user_id: assignedTo,
        assigned_to_name: assignedName,
        task_type: "assessment_due",
        severity,
        title: overdue
          ? `Assessment overdue: ${rule.templateName} — ${indName}`
          : `Assessment due in ${daysUntil}d: ${rule.templateName} — ${indName}`,
        description: message,
        rule_reference: `Assessment Compliance — ${rule.requirementType} requirement`,
        due_date: admin.firestore.Timestamp.fromDate(today),
        days_overdue: overdue ? Math.abs(daysUntil) : 0,
        has_ai_draft: false,
        ai_draft_id: null,
        source_agent: "compliance" as const,
        status: "pending",
      });

      logs.push({
        org_id: orgId,
        individual_id: individual.id,
        agent: "compliance" as const,
        action: overdue ? "ASSESSMENT_OVERDUE" : "ASSESSMENT_DUE_SOON",
        rule_applied: `Assessment schedule: ${rule.templateName} every ${rule.recurringEveryDays || rule.initialDueDays} days`,
        finding: message,
        result: "Task created for case manager review",
      });

      // Escalate critical to supervisor
      if (severity === "critical" && individual.assigned_supervisor_uid) {
        try {
          await db.collection("notifications").add({
            uid: individual.assigned_supervisor_uid,
            organizationId: orgId,
            type: "alert",
            title: `Assessment Overdue — ${indName}`,
            body: message,
            href: `/people/${individual.id}/assessments`,
            read: false,
            dismissed: false,
            severity: "critical",
            source: "assessment_agent",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch { /* non-fatal */ }
      }
    }
  } catch (err) {
    console.warn(`[AssessmentAgent] Error for ${individual.id}:`, err);
  }

  return { tasks, logs, drafts_count: 0 };
}
