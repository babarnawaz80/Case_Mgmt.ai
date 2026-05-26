// AI Abstraction Layer — THE ONLY file that calls AI APIs (Gemini)
// CaseManagement.AI
// Uses direct REST calls to Gemini Developer API (v1beta) — bypasses SDK path-prefix issues.

import * as admin from "firebase-admin";
import { COLLECTIONS } from "../config/collections";

// Verified available via REST: gemini-2.5-flash works for this API key
const MODELS = {
  companion: "gemini-2.5-flash", // Care Companion bot
  quality:   "gemini-2.5-flash", // Documentation & quality checks
  fast:      "gemini-2.5-flash", // Chat, form prefill, scribe
} as const;

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

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

// Direct REST call to Gemini API (v1beta) — bypasses SDK model-path issues
async function callGeminiRest(
  apiKey: string,
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  temperature: number
): Promise<AIResult> {
  const url = `${GEMINI_BASE}/${modelId}:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      { role: "user", parts: [{ text: userPrompt }] },
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.error(`[AI] REST error ${resp.status}:`, errText);
    throw new Error(`Gemini REST ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const data = await resp.json() as any;
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const inputTokens: number = data.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens: number = data.usageMetadata?.candidatesTokenCount ?? 0;

  return { text, inputTokens, outputTokens };
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

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error("[AI] GEMINI_API_KEY not set");
    throw new Error("AI_UNAVAILABLE");
  }

  try {
    const result = await callGeminiRest(geminiApiKey, modelId, systemPrompt, fullPrompt, maxTokens, temperature);
    console.log(`[AI] OK — model=${modelId} in=${result.inputTokens} out=${result.outputTokens}`);
    return result;
  } catch (err: any) {
    console.error("[AI] Gemini REST failed:", err.message);
    throw new Error("AI_UNAVAILABLE");
  }
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

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("AI_UNAVAILABLE");
  }

  // Use streaming REST endpoint
  const url = `${GEMINI_BASE}/${modelId}:streamGenerateContent?alt=sse&key=${geminiApiKey}`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok || !resp.body) {
    const errText = await resp.text().catch(() => "");
    console.error(`[AI] Stream REST error ${resp.status}:`, errText);
    throw new Error("AI_UNAVAILABLE");
  }

  // Read SSE stream
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") return;
        try {
          const chunk = JSON.parse(jsonStr);
          const text: string = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (text) yield text;
        } catch {
          // skip malformed chunk
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
