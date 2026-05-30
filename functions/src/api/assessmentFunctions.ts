/**
 * assessmentFunctions.ts
 * Assessment-related Cloud Function routes.
 * POST /api/assessments/prefill — AI pre-fill suggestions for an assessment template
 */

import { Request, Response, Router } from "express";
import * as admin from "firebase-admin";
import { generateCompletion } from "../services/ai";

const router: Router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrefillSuggestion {
  value: string | string[] | number | null;
  source: string;
  confidence: "high" | "medium" | "low";
}

// ─── POST /api/assessments/prefill ───────────────────────────────────────────

router.post("/prefill", async (req: Request, res: Response): Promise<void> => {
  try {
    const { templateId, individualId } = req.body as {
      templateId?: string;
      individualId?: string;
    };

    if (!templateId || !individualId) {
      res.status(400).json({ error: "templateId and individualId are required." });
      return;
    }

    const db = admin.firestore();

    // Load template (Firestore first, then return empty suggestions if not found)
    let templateData: admin.firestore.DocumentData | null = null;
    try {
      const templateSnap = await db
        .collection("assessment_templates")
        .doc(templateId)
        .get();
      if (templateSnap.exists) {
        templateData = templateSnap.data() ?? null;
      }
    } catch {
      // Template not in Firestore — that's ok, we still try individual data
    }

    // Load recent clinical data for the individual
    const [
      contactNotesSnap,
      visitSummariesSnap,
      progressNotesSnap,
      individualSnap,
    ] = await Promise.allSettled([
      db
        .collection("contact_notes")
        .where("individual_id", "==", individualId)
        .orderBy("date", "desc")
        .limit(20)
        .get(),
      db
        .collection("visit_summaries")
        .where("individual_id", "==", individualId)
        .orderBy("visit_date", "desc")
        .limit(10)
        .get(),
      db
        .collection("progress_notes")
        .where("individualId", "==", individualId)
        .orderBy("created_at", "desc")
        .limit(20)
        .get(),
      db.collection("individuals").doc(individualId).get(),
    ]);

    const individual =
      individualSnap.status === "fulfilled" && individualSnap.value.exists
        ? individualSnap.value.data()
        : null;

    const contactNotes =
      contactNotesSnap.status === "fulfilled"
        ? contactNotesSnap.value.docs.map((d) => d.data())
        : [];

    const visitSummaries =
      visitSummariesSnap.status === "fulfilled"
        ? visitSummariesSnap.value.docs.map((d) => d.data())
        : [];

    const progressNotes =
      progressNotesSnap.status === "fulfilled"
        ? progressNotesSnap.value.docs.map((d) => d.data())
        : [];

    if (!individual) {
      res.json({ suggestions: {}, questionsPreFilled: 0 });
      return;
    }

    // Build questions list from template (if available)
    const questions: { id: string; label: string; type: string }[] = [];
    if (templateData?.sections) {
      for (const section of templateData.sections as any[]) {
        for (const q of section.questions ?? []) {
          if (q.type !== "section_header" && q.type !== "instructions" && q.type !== "divider") {
            questions.push({ id: q.id, label: q.label, type: q.type });
          }
        }
      }
    }

    if (questions.length === 0) {
      res.json({ suggestions: {}, questionsPreFilled: 0 });
      return;
    }

    const contextStr = JSON.stringify({
      individual: {
        name: `${individual.first_name ?? ""} ${individual.last_name ?? ""}`.trim(),
        dob: individual.dob,
        diagnosis: individual.diagnosis,
        preferred_name: individual.preferred_name,
        primary_language: individual.primary_language,
      },
      recent_contact_notes: contactNotes.slice(0, 5).map((n: any) => ({
        date: n.date,
        purpose: n.purpose,
        details: n.details,
        issues: n.issues,
      })),
      recent_visit_summaries: visitSummaries.slice(0, 3).map((v: any) => ({
        date: v.visit_date ?? v.visitDate,
        what_went_well: v.what_went_well,
        what_is_not_working: v.what_is_not_working,
      })),
      recent_progress_notes: progressNotes.slice(0, 5).map((p: any) => ({
        date: p.date,
        content: p.content,
      })),
    });

    const systemPrompt = `You are a clinical documentation assistant for a case management platform.
Pre-fill assessment questions based on provided individual context.
Return ONLY valid JSON, no markdown or explanation.`;

    const userPrompt = `Based on the individual context provided, pre-fill these assessment questions.

QUESTIONS TO PRE-FILL (JSON array):
${JSON.stringify(questions, null, 2)}

Return a JSON object where each key is a questionId and each value is:
{ "value": <string|number|null>, "source": <brief source note>, "confidence": "high"|"medium"|"low" }

Only include questions you can confidently answer from the context.`;

    let aiSuggestions: Record<string, PrefillSuggestion> = {};

    try {
      const orgId: string = (req as any).user?.organizationId ?? "demo";
      const userId: string = (req as any).user?.uid ?? "system";

      const aiResult = await generateCompletion(
        systemPrompt,
        userPrompt,
        contextStr,
        "fast",
        orgId,
        userId,
        "assessment-prefill",
        { maxTokens: 2048, temperature: 0.1 }
      );

      if (aiResult?.text) {
        // Parse JSON from response
        const jsonMatch = aiResult.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiSuggestions = JSON.parse(jsonMatch[0]) as Record<string, PrefillSuggestion>;
        }
      }
    } catch (aiErr) {
      // Non-fatal — return empty suggestions
      console.warn("[assessmentPrefill] AI call failed (non-fatal):", aiErr);
    }

    res.json({
      suggestions: aiSuggestions,
      questionsPreFilled: Object.keys(aiSuggestions).length,
    });
  } catch (err) {
    console.error("[assessmentPrefill]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export const assessmentRoutes = router;
