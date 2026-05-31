// Renewal Agent — Brain Orchestrator
// The most important agent. Tracks all renewal cycles and generates renewal packets.

import * as admin from "firebase-admin";
import { IndividualRecord, RulePack, AgentResult } from "../types";
import { generateCompletion } from "../../services/ai";

function daysUntil(dateStr?: string): number {
  if (!dateStr) return 9999;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export async function runRenewalAgent(
  individual: IndividualRecord,
  rulePack: RulePack,
  runId: string,
  orgId: string,
  db: admin.firestore.Firestore,
  customPrompt?: string
): Promise<AgentResult> {
  const tasks: AgentResult["tasks"] = [];
  const logs: AgentResult["logs"] = [];
  let draftsCount = 0;

  const indName = `${individual.first_name} ${individual.last_name}`;
  const assignedTo = individual.assigned_case_manager_uid ?? "";
  const assignedName = individual.assigned_case_manager_name ?? "Unassigned";
  const now = new Date();

  // ── 1. Annual ISP/PCP renewal tracking ─────────────────────────────────────
  const pcpDueDate = individual.pcp_due_date ?? individual.isp_due_date;
  if (pcpDueDate) {
    const daysUntilPcp = daysUntil(pcpDueDate);

    // 60 days out: generate AI renewal packet
    if (daysUntilPcp > 0 && daysUntilPcp <= 60) {
      logs.push({
        org_id: orgId,
        individual_id: individual.id,
        agent: "renewal",
        action: "PCP_RENEWAL_PACKET_GENERATION",
        rule_applied: "60-day PCP renewal preparation threshold",
        finding: `PCP due in ${daysUntilPcp} days`,
        result: "Queued AI draft renewal packet generation",
      });

      // Generate AI draft renewal packet (non-blocking — best effort)
      generateRenewalDraft(individual, runId, orgId, db, customPrompt).catch((err) => {
        console.warn(`[RenewalAgent] Draft generation failed for ${individual.id}:`, err.message);
      });

      draftsCount++;
    }

    // 90 days out: create renewal approaching task
    if (daysUntilPcp > 0 && daysUntilPcp <= 90 && daysUntilPcp > 60) {
      tasks.push({
        org_id: orgId,
        individual_id: individual.id,
        individual_name: indName,
        assigned_to_user_id: assignedTo,
        assigned_to_name: assignedName,
        task_type: "pcp_renewal",
        severity: "medium",
        title: `PCP renewal approaching — ${indName} (${daysUntilPcp} days)`,
        description: `Annual Person-Centered Plan renewal due on ${pcpDueDate}. Begin preparation in the next 30 days.`,
        rule_reference: `${rulePack.state ?? "Indiana"} ${rulePack.program ?? "DDA Waiver"} — Annual ISP/PCP renewal`,
        due_date: admin.firestore.Timestamp.fromDate(addDays(new Date(pcpDueDate), -30)),
        days_overdue: 0,
        has_ai_draft: false,
        ai_draft_id: null,
        source_agent: "renewal",
        status: "pending",
        rule_id: "RENEWAL_ISP_ANNUAL",
        task_reason: `Annual ISP/PCP renewal is due on ${pcpDueDate} — ${daysUntilPcp} days remain; renewal packet preparation should begin now.`,
        evidence_checked: "individuals (pcp_due_date, isp_due_date), rule_pack (assessment_frequency_months)",
      });

      logs.push({
        org_id: orgId,
        individual_id: individual.id,
        agent: "renewal",
        action: "PCP_RENEWAL_TASK_CREATED",
        rule_applied: "90-day PCP renewal approaching threshold",
        finding: `PCP due in ${daysUntilPcp} days on ${pcpDueDate}`,
        result: "Task created: pcp_renewal (90-day warning)",
      });
    }

    // 7 days: alert supervisor
    if (daysUntilPcp > 0 && daysUntilPcp <= 7 && individual.assigned_supervisor_uid) {
      try {
        await db.collection("notifications").add({
          uid: individual.assigned_supervisor_uid,
          organizationId: orgId,
          type: "alert",
          title: `URGENT: PCP expires in ${daysUntilPcp} days — ${indName}`,
          body: `Person-Centered Plan for ${indName} expires on ${pcpDueDate}. Immediate review required.`,
          href: `/people/${individual.id}/care-plan`,
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
        agent: "renewal",
        action: "PCP_URGENT_SUPERVISOR_ALERT",
        rule_applied: "7-day critical PCP renewal alert",
        finding: `PCP expires in ${daysUntilPcp} days`,
        result: "Supervisor notified via notification system",
      });
    }
  }

  // ── 2. Annual assessment tracking ───────────────────────────────────────────
  const assessmentDueDate = computeNextAssessmentDate(individual, rulePack);
  if (assessmentDueDate) {
    const daysUntilAssessment = daysUntil(assessmentDueDate);
    if (daysUntilAssessment < 0) {
      tasks.push({
        org_id: orgId,
        individual_id: individual.id,
        individual_name: indName,
        assigned_to_user_id: assignedTo,
        assigned_to_name: assignedName,
        task_type: "assessment_due",
        severity: "high",
        title: `Annual assessment overdue — ${indName}`,
        description: `Annual assessment was due on ${assessmentDueDate}. ${Math.abs(daysUntilAssessment)} days overdue.`,
        rule_reference: `${rulePack.state ?? "Indiana"} ${rulePack.program ?? "DDA Waiver"} — Annual assessment required every ${rulePack.assessment_frequency_months} months`,
        due_date: admin.firestore.Timestamp.fromDate(now),
        days_overdue: Math.abs(daysUntilAssessment),
        has_ai_draft: false,
        ai_draft_id: null,
        source_agent: "renewal",
        status: "pending",
        rule_id: "RENEWAL_ASSESSMENT_OVERDUE",
        task_reason: `Annual assessment was due on ${assessmentDueDate} (last completed: ${individual.last_assessment_date ?? "unknown"}) and is now ${Math.abs(daysUntilAssessment)} days overdue.`,
        evidence_checked: "individuals (last_assessment_date), rule_pack (assessment_frequency_months)",
      });

      logs.push({
        org_id: orgId,
        individual_id: individual.id,
        agent: "renewal",
        action: "ASSESSMENT_OVERDUE",
        rule_applied: `Annual assessment required every ${rulePack.assessment_frequency_months} months`,
        finding: `Assessment overdue by ${Math.abs(daysUntilAssessment)} days`,
        result: "Task created: assessment_due",
      });
    } else if (daysUntilAssessment <= 60) {
      tasks.push({
        org_id: orgId,
        individual_id: individual.id,
        individual_name: indName,
        assigned_to_user_id: assignedTo,
        assigned_to_name: assignedName,
        task_type: "assessment_due",
        severity: daysUntilAssessment <= 30 ? "high" : "medium",
        title: `Annual assessment approaching — ${indName} (${daysUntilAssessment} days)`,
        description: `Annual assessment due on ${assessmentDueDate}. Schedule within the next ${daysUntilAssessment} days.`,
        rule_reference: `${rulePack.state ?? "Indiana"} ${rulePack.program ?? "DDA Waiver"} — Annual assessment required`,
        due_date: admin.firestore.Timestamp.fromDate(addDays(new Date(assessmentDueDate), -7)),
        days_overdue: 0,
        has_ai_draft: false,
        ai_draft_id: null,
        source_agent: "renewal",
        status: "pending",
        rule_id: "RENEWAL_ASSESSMENT_APPROACHING",
        task_reason: `Annual assessment is due on ${assessmentDueDate} — only ${daysUntilAssessment} days remain; scheduling must begin immediately.`,
        evidence_checked: "individuals (last_assessment_date), rule_pack (assessment_frequency_months)",
      });

      logs.push({
        org_id: orgId,
        individual_id: individual.id,
        agent: "renewal",
        action: "ASSESSMENT_APPROACHING",
        rule_applied: `Annual assessment required every ${rulePack.assessment_frequency_months} months`,
        finding: `Assessment due in ${daysUntilAssessment} days`,
        result: "Task created: assessment_due (approaching)",
      });
    }
  }

  return { tasks, logs, drafts_count: draftsCount };
}

function computeNextAssessmentDate(individual: IndividualRecord, rulePack: RulePack): string | null {
  const baseDate = individual.last_assessment_date;
  if (!baseDate) return null;
  const d = new Date(baseDate);
  d.setMonth(d.getMonth() + rulePack.assessment_frequency_months);
  return d.toISOString().split("T")[0]!;
}

async function generateRenewalDraft(
  individual: IndividualRecord,
  runId: string,
  orgId: string,
  db: admin.firestore.Firestore,
  customPrompt?: string
): Promise<void> {
  const indName = `${individual.first_name} ${individual.last_name}`;
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const twelveMonthsAgoTs = admin.firestore.Timestamp.fromDate(twelveMonthsAgo);

  // Load recent documentation (best effort)
  const [monForms, visitSummaries, progressNotes] = await Promise.allSettled([
    db.collection("monitoring_forms")
      .where("individualId", "==", individual.id)
      .where("createdAt", ">=", twelveMonthsAgoTs)
      .limit(8)
      .get(),
    db.collection("visit_summaries")
      .where("individualId", "==", individual.id)
      .where("createdAt", ">=", twelveMonthsAgoTs)
      .limit(8)
      .get(),
    db.collection("progress_notes")
      .where("individualId", "==", individual.id)
      .where("createdAt", ">=", twelveMonthsAgoTs)
      .limit(6)
      .get(),
  ]);

  const context = JSON.stringify({
    individual: {
      name: indName,
      program: individual.program,
      county: individual.county,
      pcp_due: individual.pcp_due_date ?? individual.isp_due_date,
    },
    monitoring_forms: monForms.status === "fulfilled" ? monForms.value.docs.map((d) => d.data()) : [],
    visit_summaries: visitSummaries.status === "fulfilled" ? visitSummaries.value.docs.map((d) => d.data()) : [],
    progress_notes: progressNotes.status === "fulfilled" ? progressNotes.value.docs.map((d) => d.data()) : [],
  });

  const baseFormat = `Review this individual's 12-month documentation and create a brief renewal summary.
Return a JSON object with: goal_progress_summary (string), recommended_service_changes (string[]), key_highlights (string[]), and draft_goal_updates (string).
Keep all content concise and evidence-based from the documentation provided.
Label everything as AI DRAFT — requires CM review before submission.`;

  const systemPrompt = customPrompt
    ? `${customPrompt}\n\n${baseFormat}`
    : `You are an experienced IDD case management specialist.\n${baseFormat}`;

  const result = await generateCompletion(
    systemPrompt,
    `Analyze the 12-month documentation for ${indName} and draft a PCP renewal summary.`,
    context,
    "fast",
    orgId,
    "system",
    "brain_orchestrator_renewal",
    { maxTokens: 2048, temperature: 0.3 }
  );

  let parsedDraft: Record<string, unknown> = { raw_summary: result.text };
  try {
    const match = result.text.match(/\{[\s\S]*\}/);
    if (match) parsedDraft = JSON.parse(match[0]);
  } catch {
    // Keep raw text
  }

  await db.collection("orchestrator_drafts").add({
    individual_id: individual.id,
    individual_name: indName,
    org_id: orgId,
    run_id: runId,
    draft_type: "pcp_renewal_packet",
    status: "ai_draft",
    content: parsedDraft,
    ai_confidence: "medium",
    generated_by: "brain_orchestrator_v1",
    ai_disclaimer: "AI DRAFT — Requires review and approval before submission",
    fields_pre_filled: Object.keys(parsedDraft).length,
    fields_requiring_input: 3,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });
}
