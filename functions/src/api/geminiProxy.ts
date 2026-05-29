// Gemini Proxy — POST /api/gemini-proxy
// CaseManagement.AI — Firebase Cloud Function
//
// Accepts a prompt from authenticated frontend callers and forwards it to
// Gemini via the Vertex AI backend using Application Default Credentials (ADC).
// No API key is required — the Cloud Functions service account authenticates
// automatically. The browser never receives any credentials.
//
// Rate limit: 20 calls per authenticated user per rolling hour window,
// tracked in Firestore collection `geminiRateLimits`.

import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { generateCompletion } from "../services/ai";
import { COLLECTIONS } from "../config/collections";

// ─── Constants ────────────────────────────────────────────────────────────────

const RATE_LIMIT_MAX = 20;            // calls per window
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour in ms
const RATE_LIMIT_COLLECTION = "geminiRateLimits";

const MAX_PROMPT_LENGTH = 8_000;      // chars
const MAX_SYSTEM_PROMPT_LENGTH = 2_000;
const DEFAULT_MAX_TOKENS = 2_048;
const DEFAULT_TEMPERATURE = 0.3;

// ─── Rate limiter (Firestore transaction) ─────────────────────────────────────
//
// Document ID: `{uid}_{hourBucket}` where hourBucket = "YYYY-MM-DD-HH" (UTC).
// One document per user per hour — naturally expires as new hours roll over.
// No TTL cleanup needed; old docs are tiny and harmless until pruned.

function hourBucket(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const mo = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const h = String(now.getUTCHours()).padStart(2, "0");
  return `${y}-${mo}-${d}-${h}`;
}

interface RateLimitResult {
  allowed: boolean;
  count: number;       // calls made in this window (after increment)
  remaining: number;   // calls remaining after this one
}

async function checkAndIncrementRateLimit(uid: string): Promise<RateLimitResult> {
  const db = admin.firestore();
  const docId = `${uid}_${hourBucket()}`;
  const ref = db.collection(RATE_LIMIT_COLLECTION).doc(docId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      // First call in this window — create the document
      tx.set(ref, {
        uid,
        count: 1,
        windowStart: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { allowed: true, count: 1, remaining: RATE_LIMIT_MAX - 1 };
    }

    const current = snap.data()!.count as number ?? 0;

    if (current >= RATE_LIMIT_MAX) {
      // Already at limit — do not increment
      return { allowed: false, count: current, remaining: 0 };
    }

    // Increment and allow
    const newCount = current + 1;
    tx.update(ref, {
      count: newCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { allowed: true, count: newCount, remaining: RATE_LIMIT_MAX - newCount };
  });
}

// ─── Request body shape ───────────────────────────────────────────────────────

interface GeminiProxyBody {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function geminiProxy(req: Request, res: Response): Promise<void> {
  // ── 1. Auth: verify Firebase ID token ─────────────────────────────────────
  const authHeader = req.headers.authorization ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized — Bearer token required" });
    return;
  }

  const idToken = authHeader.slice(7);
  let decodedToken: admin.auth.DecodedIdToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch {
    res.status(401).json({ error: "Invalid or expired auth token" });
    return;
  }

  const uid = decodedToken.uid;

  // ── 2. Load user profile to get organizationId ─────────────────────────────
  const db = admin.firestore();
  const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!userSnap.exists) {
    res.status(403).json({ error: "User profile not found" });
    return;
  }

  const userProfile = userSnap.data()!;
  const organizationId = userProfile.organizationId as string | undefined;
  if (!organizationId) {
    res.status(403).json({ error: "User has no associated organization" });
    return;
  }

  // ── 3. Validate request body ───────────────────────────────────────────────
  const { prompt, systemPrompt, maxTokens, temperature } = req.body as GeminiProxyBody;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    res.status(400).json({ error: "prompt is required and must be a non-empty string" });
    return;
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    res.status(400).json({ error: `prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters` });
    return;
  }
  if (systemPrompt !== undefined && typeof systemPrompt !== "string") {
    res.status(400).json({ error: "systemPrompt must be a string" });
    return;
  }
  if (systemPrompt && systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
    res.status(400).json({ error: `systemPrompt exceeds maximum length of ${MAX_SYSTEM_PROMPT_LENGTH} characters` });
    return;
  }

  const resolvedMaxTokens = typeof maxTokens === "number" && maxTokens > 0 && maxTokens <= 8192
    ? maxTokens
    : DEFAULT_MAX_TOKENS;

  const resolvedTemperature = typeof temperature === "number" && temperature >= 0 && temperature <= 2
    ? temperature
    : DEFAULT_TEMPERATURE;

  // ── 4. Rate limit check ────────────────────────────────────────────────────
  let rateLimit: RateLimitResult;
  try {
    rateLimit = await checkAndIncrementRateLimit(uid);
  } catch (err) {
    console.error("[geminiProxy] rate limit Firestore error:", err);
    // Fail open — don't block users due to infra issues
    rateLimit = { allowed: true, count: 0, remaining: RATE_LIMIT_MAX };
  }

  if (!rateLimit.allowed) {
    res.status(429).json({
      error: "Rate limit exceeded",
      detail: `Maximum ${RATE_LIMIT_MAX} requests per hour. Try again next hour.`,
      rateLimitMax: RATE_LIMIT_MAX,
      rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
      rateLimitRemaining: 0,
    });
    return;
  }

  // ── 5. Call Gemini via the server-side AI abstraction layer ────────────────
  //    generateCompletion uses Vertex AI + ADC — no API key anywhere.
  try {
    const result = await generateCompletion(
      systemPrompt?.trim() || "You are a helpful AI assistant for a healthcare case management platform.",
      prompt.trim(),
      "",                 // no additional context prefix
      "fast",            // use the standard fast model (gemini-2.5-flash)
      organizationId,
      uid,
      "gemini_proxy",
      { maxTokens: resolvedMaxTokens, temperature: resolvedTemperature }
    );

    res.status(200).json({
      text: result.text,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      rateLimitMax: RATE_LIMIT_MAX,
      rateLimitRemaining: rateLimit.remaining,
      rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
    });
  } catch (err: any) {
    const code = err.message ?? "";

    if (code === "AI_PAUSED") {
      res.status(403).json({ error: "AI features are currently paused for your organization" });
      return;
    }
    if (code === "INSUFFICIENT_CREDITS") {
      res.status(402).json({ error: "Your organization has insufficient AI credits" });
      return;
    }
    if (code === "DAILY_LIMIT_REACHED") {
      res.status(429).json({ error: "Your organization has reached its daily AI limit" });
      return;
    }

    console.error("[geminiProxy] Gemini call failed:", err);
    res.status(502).json({ error: "AI request failed — please try again" });
  }
}
