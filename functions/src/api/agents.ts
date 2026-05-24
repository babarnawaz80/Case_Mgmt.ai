// Compliance Agents API — PCP Renewal and other compliance agents
// CaseManagement.AI — Uses Gemini 2.5 Pro (quality tier)

import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { generateCompletion } from "../services/ai";
import { consumeCredits } from "../services/credits";
import { logAction } from "../services/audit";
import { COLLECTIONS } from "../config/collections";

// POST /api/agents/pcp-renewal/run
export async function runPcpRenewalAgent(req: Request, res: Response): Promise<void> {
  try {
    const { individualId, organizationId, userId, userName, userRole } = req.body;

    if (!individualId || !organizationId || !userId) {
      res.status(400).json({ error: "Missing required fields." });
      return;
    }

    const db = admin.firestore();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const twelveMonthsAgoTs = admin.firestore.Timestamp.fromDate(twelveMonthsAgo);

    // Step 1 — Load 12 months of data
    const [
      individual,
      monitoringForms,
      visitSummaries,
      progressNotes,
      contactNotes,
      incidents,
      currentPlan,
      authorizations,
    ] = await Promise.all([
      db.collection(COLLECTIONS.INDIVIDUALS).doc(individualId).get(),
      db.collection(COLLECTIONS.MONITORING_FORMS)
        .where("individualId", "==", individualId)
        .where("createdAt", ">=", twelveMonthsAgoTs)
        .get(),
      db.collection(COLLECTIONS.VISIT_SUMMARIES)
        .where("individualId", "==", individualId)
        .where("createdAt", ">=", twelveMonthsAgoTs)
        .get(),
      db.collection(COLLECTIONS.PROGRESS_NOTES)
        .where("individualId", "==", individualId)
        .where("createdAt", ">=", twelveMonthsAgoTs)
        .limit(10)
        .get(),
      db.collection(COLLECTIONS.CONTACT_NOTES)
        .where("individualId", "==", individualId)
        .where("createdAt", ">=", twelveMonthsAgoTs)
        .limit(10)
        .get(),
      db.collection(COLLECTIONS.INCIDENTS)
        .where("individualId", "==", individualId)
        .where("createdAt", ">=", twelveMonthsAgoTs)
        .get(),
      db.collection(COLLECTIONS.CARE_PLANS)
        .where("individualId", "==", individualId)
        .where("plan_status", "in", ["in_progress", "approved"])
        .limit(1)
        .get(),
      db.collection(COLLECTIONS.SERVICE_AUTHORIZATIONS)
        .where("individualId", "==", individualId)
        .where("status", "==", "active")
        .get(),
    ]);

    if (!individual.exists) {
      res.status(404).json({ error: "Individual not found." });
      return;
    }

    const sourceDocIds = [
      ...monitoringForms.docs.map((d) => d.id),
      ...visitSummaries.docs.map((d) => d.id),
      ...progressNotes.docs.map((d) => d.id),
      ...contactNotes.docs.map((d) => d.id),
    ];

    const context = JSON.stringify({
      individual: individual.data(),
      monitoring_forms: monitoringForms.docs.map((d) => d.data()),
      visit_summaries: visitSummaries.docs.map((d) => d.data()),
      progress_notes: progressNotes.docs.map((d) => d.data()),
      contact_notes: contactNotes.docs.map((d) => d.data()),
      incidents: incidents.docs.map((d) => d.data()),
      current_plan: currentPlan.empty ? null : currentPlan.docs[0].data(),
      service_authorizations: authorizations.docs.map((d) => d.data()),
    });

    // Step 2 — AI Analysis with Gemini 2.5 Pro
    const systemPrompt = `Act as an experienced IDD case management specialist. Review the year's documentation and draft an updated Person-Centered Plan. 
Return a detailed JSON structure with: individual_profile_summary, goals (with objectives), services, and key_recommendations.
The plan should reflect actual progress documented, identify met goals, new needs, and service gaps.`;

    const result = await generateCompletion(
      systemPrompt,
      `Please analyze this 12-month documentation history and draft a complete updated PCP for this individual.`,
      context,
      "quality",
      organizationId,
      userId,
      "pcp_renewal_agent",
      { maxTokens: 8192 }
    );

    // Parse AI response
    let aiDraft: Record<string, unknown>;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      aiDraft = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw_draft: result.text };
    } catch {
      aiDraft = { raw_draft: result.text };
    }

    // Step 3 — Create draft care plan
    const now = new Date();
    const nextYear = new Date(now);
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const newPlanRef = await db.collection(COLLECTIONS.CARE_PLANS).add({
      individualId,
      organizationId,
      plan_type: "person_centered_plan",
      plan_status: "in_progress",
      effective_date: now.toISOString().split("T")[0],
      review_expiration: nextYear.toISOString().split("T")[0],
      ai_drafted: true,
      ai_drafted_from: sourceDocIds,
      ai_draft_summary: `AI-drafted from 12-month data analysis. ${now.toLocaleDateString()}`,
      ...aiDraft,
      created_by: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const indData = individual.data()!;
    const indName = `${indData.first_name} ${indData.last_name}`;

    // Step 4 — Notify case manager
    const cmUid = indData.assigned_case_manager as string;
    if (cmUid) {
      await Promise.all([
        db.collection(COLLECTIONS.NOTIFICATIONS).add({
          organizationId,
          user_id: cmUid,
          type: "pcp_drafted",
          title: `Annual PCP for ${indName} has been AI-drafted`,
          body: "Please review and edit to begin the approval process.",
          linked_route: `/people/${individualId}/care-plan`,
          linked_record_id: newPlanRef.id,
          read: false,
          priority: "high",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
        db.collection(COLLECTIONS.WORKFLOW_TASKS).add({
          individualId,
          organizationId,
          assigned_to: cmUid,
          created_by: "system",
          title: `Review AI-drafted Annual PCP — ${indName}`,
          description: "AI has drafted an updated Person-Centered Plan from 12 months of documentation. Please review, edit, and submit.",
          task_type: "pcp_review",
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "pending_start",
          priority: "high",
          ai_generated: true,
          linked_module: "care_plan",
          linked_record_id: newPlanRef.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
      ]);
    }

    // Consume credits
    await consumeCredits({
      organizationId,
      userId,
      userName: userName ?? "Unknown",
      userRole: userRole ?? "admin",
      feature: "pcp_renewal_agent",
      model: "gemini-pro-latest",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      individualId,
    });

    await logAction({
      organizationId,
      actorUid: userId,
      actorName: userName ?? "Unknown",
      actorRole: userRole ?? "admin",
      action: "COMPLIANCE_AGENT_RUN",
      collectionName: COLLECTIONS.CARE_PLANS,
      recordId: newPlanRef.id,
      individualId,
      summary: `PCP Renewal Agent ran for ${indName}. Draft plan created.`,
      source: "ai",
    });

    res.json({
      success: true,
      planId: newPlanRef.id,
      message: `Annual PCP draft created for ${indName}. Case manager has been notified.`,
    });
  } catch (error) {
    const message = (error as Error).message;
    if (["AI_PAUSED", "INSUFFICIENT_CREDITS", "DAILY_LIMIT_REACHED"].includes(message)) {
      res.status(402).json({ error: message });
    } else {
      console.error("[pcp-renewal-agent]", error);
      res.status(500).json({ error: "Agent failed. Please try again." });
    }
  }
}
