// AI Abstraction Layer — THE ONLY file that calls AI APIs (Gemini)
// CaseManagement.AI
//
// Uses @google/genai SDK with Vertex AI backend and Application Default Credentials (ADC).
// No API keys — the Cloud Functions service account authenticates automatically.
// GEMINI_API_KEY is NOT used anywhere in this file.

import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import { COLLECTIONS } from "../config/collections";

// ─── Singleton Vertex AI client ───────────────────────────────────────────────
// Created once per warm invocation. ADC auth is handled by the SDK automatically.
// Exported so companion.ts can share the same instance for multi-turn streaming.

let _genai: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (!_genai) {
    _genai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT,
      location: "us-central1",
    });
  }
  return _genai;
}

// ─── Model registry ───────────────────────────────────────────────────────────

const MODELS = {
  companion: "gemini-2.5-flash", // Care Companion bot
  quality:   "gemini-2.5-flash", // Documentation & quality checks
  fast:      "gemini-2.5-flash", // Chat, form prefill, scribe
} as const;

export type AITier = keyof typeof MODELS;

export interface AIResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

// ─── Org access gate ─────────────────────────────────────────────────────────

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

// ─── Non-streaming generation ─────────────────────────────────────────────────

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

  const modelId    = MODELS[tier];
  const maxTokens  = options.maxTokens  ?? 4096;
  const temperature = options.temperature ?? 0.3;
  const fullPrompt = context ? `${context}\n\n${userPrompt}` : userPrompt;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: maxTokens,
        temperature,
        // gemini-2.5-flash enables "thinking" by default, which silently spends
        // the entire maxOutputTokens budget on internal reasoning and returns an
        // EMPTY response (finishReason: MAX_TOKENS). These are direct
        // documentation / chat tasks — no extended reasoning needed — so disable
        // thinking to guarantee the model spends its budget on the visible answer.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const text: string         = response.text         ?? "";
    const inputTokens: number  = response.usageMetadata?.promptTokenCount     ?? 0;
    const outputTokens: number = response.usageMetadata?.candidatesTokenCount ?? 0;

    const finishReason = response.candidates?.[0]?.finishReason;
    if (!text) {
      console.warn(`[AI] EMPTY text — model=${modelId} finishReason=${finishReason} in=${inputTokens} out=${outputTokens}`);
    } else {
      console.log(`[AI] OK — model=${modelId} in=${inputTokens} out=${outputTokens}`);
    }
    return { text, inputTokens, outputTokens };
  } catch (err: any) {
    console.error("[AI] Gemini call failed:", err.message);
    throw new Error("AI_UNAVAILABLE");
  }
}

// ─── Streaming generation ─────────────────────────────────────────────────────
// Used by the Care Companion bot for real-time token streaming.

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

  const modelId    = MODELS[tier];
  const fullPrompt = context ? `${context}\n\n${userPrompt}` : userPrompt;

  const ai = getAiClient();
  const stream = await ai.models.generateContentStream({
    model: modelId,
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 2048,
      temperature: 0.7,
      // Disable thinking — streaming chat should emit visible tokens immediately,
      // not consume the budget on internal reasoning.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  for await (const chunk of stream) {
    const text: string = chunk.text ?? "";
    if (text) yield text;
  }
}
