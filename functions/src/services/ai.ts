// AI Abstraction Layer — THE ONLY file that calls AI APIs (Gemini)
// CaseManagement.AI — PRD v2.0
// All features call generateCompletion() or streamCompletion() — NO EXCEPTIONS.
// Uses Gemini Developer API exclusively (via GEMINI_API_KEY env var).

import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import { COLLECTIONS } from "../config/collections";

// Gemini model IDs — gemini-1.5-flash is stable and available to all billing accounts
const MODELS = {
  companion: "gemini-1.5-flash",   // Care Companion bot
  quality:   "gemini-1.5-flash",   // Documentation & quality checks
  fast:      "gemini-1.5-flash",   // Form prefill, daily brief, scribe
} as const;


export type AITier = keyof typeof MODELS;

export interface AIResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

// Check org is allowed to use AI before making any call
async function checkOrgAIAccess(organizationId: string): Promise<void> {
  try {
    const db = admin.firestore();
    const orgSnap = await db.collection(COLLECTIONS.ORGANIZATIONS).doc(organizationId).get();

    // If org doc doesn't exist yet, allow AI calls — new orgs start with full access
    if (!orgSnap.exists) {
      console.warn(`[AI] org doc missing for ${organizationId} — allowing AI call through`);
      return;
    }

    const org = orgSnap.data()!;

    // Only block if explicitly disabled
    if (org.ai_features_enabled === false) {
      throw new Error("AI_PAUSED");
    }

    // Only block if credit_balance explicitly set to 0 or below
    if (typeof org.credit_balance === "number" && org.credit_balance <= 0) {
      throw new Error("INSUFFICIENT_CREDITS");
    }

    // Only enforce daily limit if explicitly set > 0
    if (typeof org.daily_credit_limit === "number" && org.daily_credit_limit > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const usageSnap = await db.collection(COLLECTIONS.AI_USAGE_LOG)
        .where("organizationId", "==", organizationId)
        .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(today))
        .get();
      const todayCredits = usageSnap.docs.reduce(
        (sum, d) => sum + (d.data().credits_consumed ?? 0), 0
      );
      if (todayCredits >= org.daily_credit_limit) {
        throw new Error("DAILY_LIMIT_REACHED");
      }
    }
  } catch (err: any) {
    // Re-throw known gating errors; swallow unexpected errors so AI is never blocked by infra issues
    if (["AI_PAUSED", "INSUFFICIENT_CREDITS", "DAILY_LIMIT_REACHED"].includes(err.message)) {
      throw err;
    }
    console.error("[AI] checkOrgAIAccess unexpected error — allowing through:", err.message);
  }
}

// Main generation function — called by all feature functions
export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  context: string,
  tier: AITier,
  organizationId: string,
  _userId: string,
  _feature: string,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<AIResult> {
  await checkOrgAIAccess(organizationId);

  const modelId = MODELS[tier];
  const maxTokens = options.maxTokens ?? 4096;
  const temperature = options.temperature ?? 0.3;
  const fullPrompt = context ? `${context}\n\n${userPrompt}` : userPrompt;

  // Prefer Gemini Developer API if key is available
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: maxTokens,
          temperature,
        },
      });

      const text = response.text ?? "";
      const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
      return { text, inputTokens, outputTokens };
    } catch (err: any) {
      console.error("[AI] Gemini API error, trying Vertex AI:", err.message);
    }
  }

  // Vertex AI fallback is not available on this project.
  // If we reach here, Gemini API failed — rethrow so callers can handle gracefully.
  throw new Error("AI_UNAVAILABLE");

}

// Streaming version — for Care Companion bot real-time responses
export async function* streamCompletion(
  systemPrompt: string,
  userPrompt: string,
  context: string,
  tier: AITier,
  organizationId: string,
  _userId: string,
  _feature: string
): AsyncGenerator<string> {
  await checkOrgAIAccess(organizationId);

  const modelId = MODELS[tier];
  const fullPrompt = context ? `${context}\n\n${userPrompt}` : userPrompt;

  // Prefer Gemini Developer API
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const stream = await ai.models.generateContentStream({
        model: modelId,
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 512,
          temperature: 0.7,
        },
      });

      for await (const chunk of stream) {
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (text) yield text;
      }
      return;
    } catch (err: any) {
      console.error("[AI] Gemini stream error:", err.message);
      throw err;
    }
  }

  throw new Error("AI_UNAVAILABLE");
}

