// Compliance Agent — Brain Orchestrator
// Checks visit, monitoring, assessment, PCP, and MA compliance for each individual.

import * as admin from "firebase-admin";
import { IndividualRecord, RulePack, AgentResult, ComplianceFinding } from "../types";

function daysSince(dateStr?: string): number {
  if (!dateStr) return 9999;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(dateStr?: string): number {
  if (!dateStr) return -9999;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function runComplianceAgent(
  individual: IndividualRecord,
  rulePack: RulePack,
  runId: string,
  orgId: string,
  db: admin.firestore.Firestore
): Promise<AgentResult> {
  const tasks: AgentResult["tasks"] = [];
  const logs: AgentResult["logs"] = [];
  const findings: ComplianceFinding[] = [];

  const indName = `${individual.first_name} ${individual.last_name}`;
  const assignedTo = individual.assigned_case_manager_uid ?? "";
  const assignedName = individual.assigned_case_manager_name ?? "Unassigned";

  // ── 1. Visit compliance ─────────────────────────────────────────────────────
  const visitRequiredDays = rulePack.visit_frequency_months * 30;
  const daysSinceVisit = daysSince(individual.last_visit_date);
  const visitOverdue = daysSinceVisit - visitRequiredDays;

  if (visitOverdue > 0) {
    const severity = visitOverdue > 30 ? "critical" : visitOverdue > 7 ? "warning" : "info";
    findings.push({
      type: "visit_overdue",
      severity,
      title: `Visit overdue ${visitOverdue} days`,
      description: `Last visit was ${daysSinceVisit} days ago. Required every ${rulePack.visit_frequency_months} months.`,
      days_overdue: visitOverdue,
      rule_reference: `${rulePack.state ?? "State"} ${rulePack.program ?? "Program"} — Quarterly visit required`,
      requires_task: true,
      requires_draft: false,
    });

    const dueDate = admin.firestore.Timestamp.fromDate(new Date());
    tasks.push({
      org_id: orgId,
      individual_id: individual.id,
      individual_name: indName,
      assigned_to_user_id: assignedTo,
      assigned_to_name: assignedName,
      task_type: "visit_required",
      severity: visitOverdue > 30 ? "critical" : visitOverdue > 7 ? "high" : "medium",
      title: `Quarterly visit overdue — ${indName}`,
      description: `Visit required every ${rulePack.visit_frequency_months} months. Last visit ${daysSinceVisit} days ago. ${visitOverdue} days overdue.`,
      rule_reference: `${rulePack.state ?? "Indiana"} ${rulePack.program ?? "DDA Waiver"} — Section 4.2: Quarterly in-home visit required`,
      due_date: dueDate,
      days_overdue: visitOverdue,
      has_ai_draft: false,
      ai_draft_id: null,
      source_agent: "compliance",
      status: "pending",
    });

    logs.push({
      org_id: orgId,
      individual_id: individual.id,
      agent: "compliance",
      action: "VISIT_OVERDUE_DETECTED",
      rule_applied: `Visit required every ${rulePack.visit_frequency_months} months`,
      finding: `Last visit ${daysSinceVisit} days ago, overdue by ${visitOverdue} days`,
      result: "Task created: visit_required",
    });
  } else if (visitOverdue > -30) {
    // Approaching (within 30 days)
    findings.push({
      type: "visit_approaching",
      severity: "info",
      title: `Visit due in ${-visitOverdue} days`,
      description: `Next visit due in ${-visitOverdue} days based on last visit date.`,
      days_overdue: visitOverdue,
      rule_reference: `${rulePack.state ?? "State"} ${rulePack.program ?? "Program"} — Quarterly visit required`,
      requires_task: false,
      requires_draft: false,
    });
  }

  // ── 2. Monitoring form compliance ───────────────────────────────────────────
  const monitoringRequiredDays = rulePack.monitoring_form_frequency_months * 30;

  // Try to get last monitoring form date from Firestore if not on individual record
  let lastMonitoringDate = individual.last_monitoring_form_date;
  if (!lastMonitoringDate) {
    try {
      const monSnap = await db
        .collection("monitoring_forms")
        .where("individualId", "==", individual.id)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
      if (!monSnap.empty) {
        const data = monSnap.docs[0]!.data();
        lastMonitoringDate = data.date ?? data.visitDate ?? data.createdAt?.toDate?.()?.toISOString()?.split("T")[0];
      }
    } catch {
      // Index may not exist — skip
    }
  }

  const daysSinceMonitoring = daysSince(lastMonitoringDate);
  const monitoringOverdue = daysSinceMonitoring - monitoringRequiredDays;

  if (monitoringOverdue > 0) {
    findings.push({
      type: "monitoring_form_overdue",
      severity: monitoringOverdue > 14 ? "critical" : "warning",
      title: `Monitoring form overdue ${monitoringOverdue} days`,
      description: `Last monitoring form was ${daysSinceMonitoring} days ago.`,
      days_overdue: monitoringOverdue,
      rule_reference: `${rulePack.state ?? "State"} ${rulePack.program ?? "Program"} — Quarterly monitoring form required`,
      requires_task: true,
      requires_draft: true,
    });

    tasks.push({
      org_id: orgId,
      individual_id: individual.id,
      individual_name: indName,
      assigned_to_user_id: assignedTo,
      assigned_to_name: assignedName,
      task_type: "monitoring_form_due",
      severity: monitoringOverdue > 14 ? "critical" : "high",
      title: `Monitoring form overdue — ${indName}`,
      description: `Monitoring form required every ${rulePack.monitoring_form_frequency_months} months. ${monitoringOverdue} days overdue.`,
      rule_reference: `${rulePack.state ?? "Indiana"} ${rulePack.program ?? "DDA Waiver"} — Section 5.1: Quarterly monitoring documentation required`,
      due_date: admin.firestore.Timestamp.fromDate(new Date()),
      days_overdue: monitoringOverdue,
      has_ai_draft: true,
      ai_draft_id: null,
      source_agent: "compliance",
      status: "pending",
    });

    logs.push({
      org_id: orgId,
      individual_id: individual.id,
      agent: "compliance",
      action: "MONITORING_FORM_OVERDUE",
      rule_applied: `Monitoring form required every ${rulePack.monitoring_form_frequency_months} months`,
      finding: `Last monitoring form ${daysSinceMonitoring} days ago, overdue by ${monitoringOverdue} days`,
      result: "Task created: monitoring_form_due (AI draft queued)",
    });
  }

  // ── 3. PCP/ISP renewal ──────────────────────────────────────────────────────
  const pcpDueDate = individual.pcp_due_date ?? individual.isp_due_date;
  if (pcpDueDate) {
    const daysUntilPcp = daysUntil(pcpDueDate);
    if (daysUntilPcp < 0) {
      findings.push({
        type: "pcp_overdue",
        severity: "critical",
        title: `PCP expired ${Math.abs(daysUntilPcp)} days ago`,
        description: `Person-Centered Plan was due on ${pcpDueDate} and is now overdue.`,
        days_overdue: Math.abs(daysUntilPcp),
        rule_reference: `${rulePack.state ?? "State"} ${rulePack.program ?? "Program"} — Annual PCP renewal required`,
        requires_task: true,
        requires_draft: true,
      });

      tasks.push({
        org_id: orgId,
        individual_id: individual.id,
        individual_name: indName,
        assigned_to_user_id: assignedTo,
        assigned_to_name: assignedName,
        task_type: "pcp_renewal",
        severity: "critical",
        title: `PCP renewal OVERDUE — ${indName}`,
        description: `Annual Person-Centered Plan expired on ${pcpDueDate}. ${Math.abs(daysUntilPcp)} days overdue. Immediate action required.`,
        rule_reference: `${rulePack.state ?? "Indiana"} ${rulePack.program ?? "DDA Waiver"} — Annual ISP/PCP renewal required within 365 days`,
        due_date: admin.firestore.Timestamp.fromDate(new Date()),
        days_overdue: Math.abs(daysUntilPcp),
        has_ai_draft: true,
        ai_draft_id: null,
        source_agent: "compliance",
        status: "pending",
      });

      logs.push({
        org_id: orgId,
        individual_id: individual.id,
        agent: "compliance",
        action: "PCP_EXPIRED",
        rule_applied: "Annual PCP renewal required",
        finding: `PCP expired on ${pcpDueDate}, ${Math.abs(daysUntilPcp)} days overdue`,
        result: "Critical task created: pcp_renewal",
      });
    } else if (daysUntilPcp <= 90) {
      findings.push({
        type: "pcp_approaching",
        severity: daysUntilPcp <= 30 ? "warning" : "info",
        title: `PCP due in ${daysUntilPcp} days`,
        description: `Person-Centered Plan renewal due on ${pcpDueDate}.`,
        days_overdue: -daysUntilPcp,
        rule_reference: `${rulePack.state ?? "State"} ${rulePack.program ?? "Program"} — Annual PCP renewal required`,
        requires_task: daysUntilPcp <= 60,
        requires_draft: daysUntilPcp <= 60,
      });

      if (daysUntilPcp <= 60) {
        const dueDateObj = new Date(pcpDueDate);
        tasks.push({
          org_id: orgId,
          individual_id: individual.id,
          individual_name: indName,
          assigned_to_user_id: assignedTo,
          assigned_to_name: assignedName,
          task_type: "pcp_renewal",
          severity: daysUntilPcp <= 30 ? "high" : "medium",
          title: `PCP renewal approaching — ${indName} (${daysUntilPcp} days)`,
          description: `Person-Centered Plan renewal due on ${pcpDueDate}. Begin renewal process now. AI draft available.`,
          rule_reference: `${rulePack.state ?? "Indiana"} ${rulePack.program ?? "DDA Waiver"} — Annual ISP/PCP renewal required`,
          due_date: admin.firestore.Timestamp.fromDate(addDays(dueDateObj, -14)),
          days_overdue: 0,
          has_ai_draft: true,
          ai_draft_id: null,
          source_agent: "compliance",
          status: "pending",
        });

        logs.push({
          org_id: orgId,
          individual_id: individual.id,
          agent: "compliance",
          action: "PCP_RENEWAL_APPROACHING",
          rule_applied: "Annual PCP renewal required",
          finding: `PCP due in ${daysUntilPcp} days on ${pcpDueDate}`,
          result: daysUntilPcp <= 60 ? "Task created with AI draft queued" : "Logged only",
        });
      }
    }
  }

  // ── 4. Medicaid redetermination ─────────────────────────────────────────────
  if (individual.ma_redetermination_date) {
    const daysUntilMA = daysUntil(individual.ma_redetermination_date);
    if (daysUntilMA < 0) {
      findings.push({
        type: "ma_redetermination_overdue",
        severity: "critical",
        title: `MA redetermination overdue ${Math.abs(daysUntilMA)} days`,
        description: `Medicaid redetermination was due on ${individual.ma_redetermination_date}.`,
        days_overdue: Math.abs(daysUntilMA),
        rule_reference: "Annual Medicaid redetermination required",
        requires_task: true,
        requires_draft: false,
      });

      tasks.push({
        org_id: orgId,
        individual_id: individual.id,
        individual_name: indName,
        assigned_to_user_id: assignedTo,
        assigned_to_name: assignedName,
        task_type: "medicaid_redetermination",
        severity: "critical",
        title: `MA redetermination OVERDUE — ${indName}`,
        description: `Medicaid redetermination was due on ${individual.ma_redetermination_date}. Service interruption risk.`,
        rule_reference: "Annual Medicaid redetermination required — Eligibility Verification",
        due_date: admin.firestore.Timestamp.fromDate(new Date()),
        days_overdue: Math.abs(daysUntilMA),
        has_ai_draft: false,
        ai_draft_id: null,
        source_agent: "compliance",
        status: "pending",
      });
    } else if (daysUntilMA <= 60) {
      tasks.push({
        org_id: orgId,
        individual_id: individual.id,
        individual_name: indName,
        assigned_to_user_id: assignedTo,
        assigned_to_name: assignedName,
        task_type: "medicaid_redetermination",
        severity: daysUntilMA <= 30 ? "high" : "medium",
        title: `MA redetermination approaching — ${indName} (${daysUntilMA} days)`,
        description: `Medicaid redetermination due on ${individual.ma_redetermination_date}. Begin preparation.`,
        rule_reference: "Annual Medicaid redetermination required",
        due_date: admin.firestore.Timestamp.fromDate(addDays(new Date(individual.ma_redetermination_date), -14)),
        days_overdue: 0,
        has_ai_draft: false,
        ai_draft_id: null,
        source_agent: "compliance",
        status: "pending",
      });
    }
  }

  // ── 5. Calculate compliance score ───────────────────────────────────────────
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const maxPossibleDeductions = 4;
  const deductions = Math.min(criticalCount * 25 + warningCount * 10, 100);
  const complianceScore = Math.max(0, 100 - deductions);

  // Update individual's compliance score
  try {
    await db.collection("individuals").doc(individual.id).update({
      compliance_score: complianceScore,
      compliance_tier:
        complianceScore >= 90 ? "green" : complianceScore >= 70 ? "amber" : "red",
      orchestrator_last_run: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch {
    // Non-fatal if update fails
  }

  logs.push({
    org_id: orgId,
    individual_id: individual.id,
    agent: "compliance",
    action: "COMPLIANCE_SCORE_CALCULATED",
    rule_applied: "Composite compliance scoring",
    finding: `${criticalCount} critical, ${warningCount} warnings across ${maxPossibleDeductions} compliance areas`,
    result: `Score: ${complianceScore}/100 — Tier: ${complianceScore >= 90 ? "green" : complianceScore >= 70 ? "amber" : "red"}`,
  });

  return {
    tasks,
    logs,
    compliance_score: complianceScore,
    drafts_count: tasks.filter((t) => t.has_ai_draft).length,
  };
}
