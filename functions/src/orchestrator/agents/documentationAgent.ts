// Documentation Agent — Brain Orchestrator
// Pre-fills forms and drafts documentation for overdue/due-soon compliance items.

import * as admin from "firebase-admin";
import { IndividualRecord, AgentResult, ComplianceFinding } from "../types";
import { generateCompletion } from "../../services/ai";

export async function runDocumentationAgent(
  individual: IndividualRecord,
  complianceFindings: ComplianceFinding[],
  runId: string,
  orgId: string,
  db: admin.firestore.Firestore
): Promise<AgentResult> {
  const tasks: AgentResult["tasks"] = [];
  const logs: AgentResult["logs"] = [];
  let draftsCount = 0;

  const indName = `${individual.first_name} ${individual.last_name}`;

  // Only act on findings that need a draft
  const draftsNeeded = complianceFindings.filter((f) => f.requires_draft);
  if (draftsNeeded.length === 0) {
    return { tasks, logs, drafts_count: 0 };
  }

  // Load recent documentation context once
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgoTs = admin.firestore.Timestamp.fromDate(sixtyDaysAgo);

  let recentNotes: unknown[] = [];
  let recentVisits: unknown[] = [];

  try {
    const [notesSnap, visitsSnap] = await Promise.allSettled([
      db.collection("contact_notes")
        .where("individualId", "==", individual.id)
        .where("createdAt", ">=", sixtyDaysAgoTs)
        .orderBy("createdAt", "desc")
        .limit(5)
        .get(),
      db.collection("visit_summaries")
        .where("individualId", "==", individual.id)
        .where("createdAt", ">=", sixtyDaysAgoTs)
        .orderBy("createdAt", "desc")
        .limit(3)
        .get(),
    ]);

    if (notesSnap.status === "fulfilled") {
      recentNotes = notesSnap.value.docs.map((d) => d.data());
    }
    if (visitsSnap.status === "fulfilled") {
      recentVisits = visitsSnap.value.docs.map((d) => d.data());
    }
  } catch {
    // Non-fatal — proceed with empty context
  }

  for (const finding of draftsNeeded) {
    try {
      if (finding.type === "monitoring_form_overdue") {
        await generateMonitoringFormDraft(individual, indName, runId, orgId, recentNotes, recentVisits, db);
        draftsCount++;

        logs.push({
          org_id: orgId,
          individual_id: individual.id,
          agent: "documentation",
          action: "MONITORING_FORM_DRAFT_GENERATED",
          rule_applied: "Pre-fill monitoring form from recent contact notes and visits",
          finding: "Monitoring form overdue — draft generated from recent documentation",
          result: "AI draft saved to orchestrator_drafts (status: ai_draft)",
        });
      }

      if (finding.type === "pcp_overdue" || finding.type === "pcp_approaching") {
        await generatePcpSummaryDraft(individual, indName, runId, orgId, db);
        draftsCount++;

        logs.push({
          org_id: orgId,
          individual_id: individual.id,
          agent: "documentation",
          action: "PCP_RENEWAL_DRAFT_GENERATED",
          rule_applied: "Pre-generate PCP renewal summary from documentation history",
          finding: "PCP renewal due — draft renewal summary generated",
          result: "AI draft saved to orchestrator_drafts (status: ai_draft)",
        });
      }
    } catch (err: any) {
      logs.push({
        org_id: orgId,
        individual_id: individual.id,
        agent: "documentation",
        action: "DRAFT_GENERATION_FAILED",
        rule_applied: finding.rule_reference,
        finding: `Draft needed for: ${finding.type}`,
        result: `Error: ${err.message ?? "Unknown error"}`,
      });
    }
  }

  return { tasks, logs, drafts_count: draftsCount };
}

async function generateMonitoringFormDraft(
  individual: IndividualRecord,
  indName: string,
  runId: string,
  orgId: string,
  recentNotes: unknown[],
  recentVisits: unknown[],
  db: admin.firestore.Firestore
): Promise<void> {
  const context = JSON.stringify({
    individual_name: indName,
    program: individual.program,
    recent_contact_notes: recentNotes.slice(0, 3),
    recent_visits: recentVisits.slice(0, 2),
  });

  const systemPrompt = `You are an IDD case management specialist.
Pre-fill a quarterly monitoring form based on the recent contact notes and visit summaries provided.
Return a JSON object with: health_status_summary (string), safety_status_summary (string), environment_summary (string), goal_progress (string), concerns_identified (string[]), recommended_follow_ups (string[]).
Base all answers on the actual documentation provided. Label as AI DRAFT.`;

  const result = await generateCompletion(
    systemPrompt,
    `Pre-fill the quarterly monitoring form for ${indName} from recent documentation.`,
    context,
    "fast",
    orgId,
    "system",
    "brain_orchestrator_doc",
    { maxTokens: 1024, temperature: 0.2 }
  );

  let parsedDraft: Record<string, unknown> = { raw_content: result.text };
  try {
    const match = result.text.match(/\{[\s\S]*\}/);
    if (match) parsedDraft = JSON.parse(match[0]);
  } catch {
    // Keep raw
  }

  await db.collection("orchestrator_drafts").add({
    individual_id: individual.id,
    individual_name: indName,
    org_id: orgId,
    run_id: runId,
    draft_type: "monitoring_form",
    status: "ai_draft",
    content: parsedDraft,
    ai_confidence: recentNotes.length > 0 ? "medium" : "low",
    source_records: [],
    generated_by: "brain_orchestrator_v1",
    ai_disclaimer: "AI DRAFT — Requires review and approval before submission",
    fields_pre_filled: Object.keys(parsedDraft).length,
    fields_requiring_input: 2,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function generatePcpSummaryDraft(
  individual: IndividualRecord,
  indName: string,
  runId: string,
  orgId: string,
  db: admin.firestore.Firestore
): Promise<void> {
  await db.collection("orchestrator_drafts").add({
    individual_id: individual.id,
    individual_name: indName,
    org_id: orgId,
    run_id: runId,
    draft_type: "pcp_renewal_summary",
    status: "ai_draft",
    content: {
      note: "PCP renewal summary requires 12-month documentation review.",
      instructions: "Use the PCP Renewal Agent from the individual's eChart to generate a full draft.",
    },
    ai_confidence: "low",
    generated_by: "brain_orchestrator_v1",
    ai_disclaimer: "AI DRAFT — Requires review and approval before submission",
    fields_pre_filled: 0,
    fields_requiring_input: 5,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });
}
