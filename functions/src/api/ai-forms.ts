// AI Forms API — All form pre-fill endpoints
// CaseManagement.AI — Uses Gemini 2.0 Flash (fast tier) for all form pre-fills
// NEVER saves to Firestore — returns suggestions only. User confirms before saving.

import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { generateCompletion } from "../services/ai";
import { consumeCredits } from "../services/credits";
import { logAction } from "../services/audit";
import { COLLECTIONS } from "../config/collections";

// ─── Progress Note Pre-fill ───────────────────────────────────────────────
export async function progressNotePrefill(req: Request, res: Response): Promise<void> {
  try {
    const { individualId, organizationId, userId, userName, userRole } = req.body;

    if (!individualId || !organizationId || !userId) {
      res.status(400).json({ error: "Missing required fields." });
      return;
    }

    const db = admin.firestore();

    // Load context data
    const [individualSnap, notesSnap, monitoringSnap, carePlanSnap] = await Promise.all([
      db.collection(COLLECTIONS.INDIVIDUALS).doc(individualId).get(),
      db.collection(COLLECTIONS.CONTACT_NOTES)
        .where("individualId", "==", individualId)
        .orderBy("activity_date", "desc")
        .limit(5)
        .get(),
      db.collection(COLLECTIONS.MONITORING_FORMS)
        .where("individualId", "==", individualId)
        .orderBy("complete_date", "desc")
        .limit(3)
        .get(),
      db.collection(COLLECTIONS.CARE_PLANS)
        .where("individualId", "==", individualId)
        .where("plan_status", "==", "in_progress")
        .limit(1)
        .get(),
    ]);

    const individual = individualSnap.data();
    const notes = notesSnap.docs.map((d) => d.data());
    const monitoring = monitoringSnap.docs.map((d) => d.data());
    const carePlan = carePlanSnap.empty ? null : carePlanSnap.docs[0].data();

    const context = JSON.stringify({
      individual: {
        name: `${individual?.first_name} ${individual?.last_name}`,
        preferred_name: individual?.preferred_name,
        diagnosis: individual?.diagnosis,
        risk_score: individual?.risk_score,
      },
      recent_notes: notes.map((n) => ({
        date: n.activity_date,
        type: n.activity_type,
        purpose: n.purpose_of_activity,
        issues: n.issues_concerns,
        next_steps: n.next_steps,
      })),
      monitoring_summary: monitoring.map((m) => ({
        date: m.complete_date,
        goal_progress: m.sections?.s4_progress_toward_outcomes,
      })),
      active_goals: carePlan?.goals?.filter((g: Record<string, unknown>) => g.progress_status !== "met"),
    });

    const systemPrompt = `You are an expert IDD case management specialist helping a case manager pre-fill a progress note. 
Your suggestions should be professional, specific, and based on the documentation history provided.
Always respond with valid JSON only. No markdown, no explanation.`;

    const userPrompt = `Based on the individual's profile and recent documentation, suggest values for a new progress note.
Return JSON with these fields:
- activityType: string (e.g., "Home Visit", "Phone Contact", "Community Integration")
- contactType: string (e.g., "In-Person", "Phone", "Virtual")
- purposeOfActivity: string (2-3 sentences)
- goalProgress: array of {goal_id, goal_title, progress_text, goal_status} for each active goal
- additionalObservations: string
- nextSteps: string`;

    const result = await generateCompletion(
      systemPrompt,
      userPrompt,
      context,
      "fast",
      organizationId,
      userId,
      "progress_note_prefill"
    );

    // Consume credits
    await consumeCredits({
      organizationId,
      userId,
      userName: userName ?? "Unknown",
      userRole: userRole ?? "case_manager",
      feature: "progress_note_prefill",
      model: "gemini-flash-latest",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      individualId,
    });

    // Audit
    await logAction({
      organizationId,
      actorUid: userId,
      actorName: userName ?? "Unknown",
      actorRole: userRole ?? "case_manager",
      action: "AI_PREFILL_REQUESTED",
      collectionName: COLLECTIONS.PROGRESS_NOTES,
      recordId: "new",
      individualId,
      summary: `AI pre-fill requested for progress note`,
      source: "ai",
    });

    // Parse the JSON response
    let suggestions: Record<string, unknown>;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.text };
    } catch {
      suggestions = { raw: result.text };
    }

    res.json({ success: true, suggestions, ai_session_id: Date.now().toString() });
  } catch (error) {
    const message = (error as Error).message;
    if (["AI_PAUSED", "INSUFFICIENT_CREDITS", "DAILY_LIMIT_REACHED"].includes(message)) {
      res.status(402).json({ error: message });
    } else {
      console.error("[progress-note-prefill]", error);
      res.status(500).json({ error: "AI service temporarily unavailable." });
    }
  }
}
