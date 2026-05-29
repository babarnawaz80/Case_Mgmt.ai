// refinePCP — Firebase Callable Cloud Function
// CaseManagement.AI
//
// Refines an existing AI-generated PCP based on case manager instructions.
// Can do targeted section updates or full regeneration.

import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { generateCompletion } from "../services/ai";

interface RefinePCPRequest {
  planId: string;
  individualId: string;
  currentPlan: Record<string, unknown>;
  refinementInstructions: string;
  regenerateFull: boolean;
}

export const refinePCP = onCall(
  { cors: true, memory: "512MiB", timeoutSeconds: 180 },
  async (request) => {
    const db = admin.firestore();

    if (!request.auth) {
      return { success: false, error: "AUTH_REQUIRED", message: "Authentication required." };
    }

    const uid = request.auth.uid;
    const {
      planId,
      individualId,
      currentPlan = {},
      refinementInstructions = "",
      regenerateFull = false,
    } = (request.data as RefinePCPRequest) ?? {};

    if (!planId || !individualId || !refinementInstructions) {
      return { success: false, error: "MISSING_PARAMS", message: "planId, individualId, and refinementInstructions are required." };
    }

    try {
      // Load individual for context
      let indName = "Individual";
      let orgId = "unknown";
      try {
        const indSnap = await db.collection("individuals").doc(individualId).get();
        if (indSnap.exists) {
          const data = indSnap.data()!;
          indName = `${data.first_name || ""} ${data.last_name || ""}`.trim() || indName;
          orgId = data.organizationId || "unknown";
        }
      } catch { /* non-fatal */ }

      const planJson = JSON.stringify(currentPlan, null, 2).slice(0, 12000);

      let systemPrompt: string;
      let userPrompt: string;

      if (regenerateFull) {
        systemPrompt = `You are an expert Person-Centered Plan writer. You will update an existing PCP based on case manager instructions. Maintain person-first language and all required structure. Return ONLY valid JSON matching the original structure exactly.`;
        userPrompt = `Here is the current PCP for ${indName}:\n${planJson}\n\nCase manager instructions:\n${refinementInstructions}\n\nUpdate the plan accordingly and return the complete updated plan JSON only. No markdown, no backticks.`;
      } else {
        systemPrompt = `You are an expert Person-Centered Plan writer. The case manager has specific targeted changes to make. Apply only the requested changes and return the complete updated JSON. Return ONLY valid JSON. No markdown, no backticks.`;
        userPrompt = `Here is the current PCP for ${indName}:\n${planJson}\n\nApply these targeted changes:\n${refinementInstructions}\n\nReturn the complete updated plan JSON only, with your changes applied.`;
      }

      let rawText: string;
      try {
        const result = await generateCompletion(
          systemPrompt,
          userPrompt,
          "",
          "quality",
          orgId,
          uid,
          "refine_pcp",
          { maxTokens: 8000, temperature: 0.2 }
        );
        rawText = result.text;
      } catch (err: any) {
        return { success: false, error: "GENERATION_FAILED", message: err.message || "Gemini call failed." };
      }

      // Parse JSON
      let updatedPlan: Record<string, unknown>;
      try {
        const cleaned = rawText
          .replace(/^```json\s*/im, "")
          .replace(/^```\s*/im, "")
          .replace(/```\s*$/im, "")
          .trim();
        updatedPlan = JSON.parse(cleaned);
      } catch {
        try {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (!match) throw new Error("No JSON");
          updatedPlan = JSON.parse(match[0]);
        } catch {
          return { success: false, error: "PARSE_FAILED", message: "Could not parse refined plan as JSON." };
        }
      }

      // Save back to Firestore
      try {
        await db.collection("care_plans").doc(planId).update({
          ...updatedPlan,
          individual_id: individualId,
          goals: (updatedPlan.goals as any[]) || [],
          services: (updatedPlan.services as any[]) || [],
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          last_refined_by: uid,
          refinement_instructions: refinementInstructions,
        });
      } catch (err: any) {
        return { success: false, error: "SAVE_FAILED", message: err.message || "Failed to save refined plan." };
      }

      return { success: true, plan: updatedPlan };
    } catch (err: any) {
      return { success: false, error: "UNEXPECTED", message: err.message || "Unexpected error." };
    }
  }
);
