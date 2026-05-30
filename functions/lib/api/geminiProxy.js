"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiProxy = geminiProxy;
const admin = __importStar(require("firebase-admin"));
const ai_1 = require("../services/ai");
const collections_1 = require("../config/collections");
const productKnowledge_1 = require("../config/productKnowledge");
// ─── Constants ────────────────────────────────────────────────────────────────
const RATE_LIMIT_MAX = 20; // calls per window
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour in ms
const RATE_LIMIT_COLLECTION = "geminiRateLimits";
const MAX_PROMPT_LENGTH = 8000; // chars
const MAX_SYSTEM_PROMPT_LENGTH = 2000;
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.3;
// ─── Rate limiter (Firestore transaction) ─────────────────────────────────────
//
// Document ID: `{uid}_{hourBucket}` where hourBucket = "YYYY-MM-DD-HH" (UTC).
// One document per user per hour — naturally expires as new hours roll over.
// No TTL cleanup needed; old docs are tiny and harmless until pruned.
function hourBucket() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const mo = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    const h = String(now.getUTCHours()).padStart(2, "0");
    return `${y}-${mo}-${d}-${h}`;
}
async function checkAndIncrementRateLimit(uid) {
    const db = admin.firestore();
    const docId = `${uid}_${hourBucket()}`;
    const ref = db.collection(RATE_LIMIT_COLLECTION).doc(docId);
    return db.runTransaction(async (tx) => {
        var _a;
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
        const current = (_a = snap.data().count) !== null && _a !== void 0 ? _a : 0;
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
// ─── Handler ──────────────────────────────────────────────────────────────────
async function geminiProxy(req, res) {
    var _a, _b, _c, _d, _e, _f, _g;
    // ── 1. Auth: verify Firebase ID token ─────────────────────────────────────
    const authHeader = (_a = req.headers.authorization) !== null && _a !== void 0 ? _a : "";
    if (!authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized — Bearer token required" });
        return;
    }
    const idToken = authHeader.slice(7);
    let decodedToken;
    try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
    }
    catch (_h) {
        res.status(401).json({ error: "Invalid or expired auth token" });
        return;
    }
    const uid = decodedToken.uid;
    // ── 2. Load user profile to get organizationId ─────────────────────────────
    const db = admin.firestore();
    const userSnap = await db.collection(collections_1.COLLECTIONS.USERS).doc(uid).get();
    if (!userSnap.exists) {
        res.status(403).json({ error: "User profile not found" });
        return;
    }
    const userProfile = userSnap.data();
    const organizationId = userProfile.organizationId;
    if (!organizationId) {
        res.status(403).json({ error: "User has no associated organization" });
        return;
    }
    // ── 3. Validate request body ───────────────────────────────────────────────
    const { prompt, systemPrompt, maxTokens, temperature, inlineData } = req.body;
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
    let rateLimit;
    try {
        rateLimit = await checkAndIncrementRateLimit(uid);
    }
    catch (err) {
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
        const basePrompt = (systemPrompt === null || systemPrompt === void 0 ? void 0 : systemPrompt.trim())
            || "You are CaseAI Assistant, a helpful AI for a healthcare case management platform.";
        const fullSystemPrompt = inlineData
            ? basePrompt // Skip PRODUCT_KNOWLEDGE for document reads to save tokens
            : `${productKnowledge_1.PRODUCT_KNOWLEDGE}\n\n---\n\n${basePrompt}`;
        let result;
        if ((inlineData === null || inlineData === void 0 ? void 0 : inlineData.data) && (inlineData === null || inlineData === void 0 ? void 0 : inlineData.mimeType)) {
            // ── Inline document path (PDF read) ─────────────────────────────────────
            // Bypasses generateCompletion to pass the file as an inline data part.
            const ai = (0, ai_1.getAiClient)();
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{
                        role: "user",
                        parts: [
                            { inlineData: { mimeType: inlineData.mimeType, data: inlineData.data } },
                            { text: prompt.trim() },
                        ],
                    }],
                config: {
                    systemInstruction: fullSystemPrompt,
                    maxOutputTokens: resolvedMaxTokens,
                    temperature: resolvedTemperature,
                },
            });
            const text = (_b = response.text) !== null && _b !== void 0 ? _b : "";
            result = {
                text,
                inputTokens: (_d = (_c = response.usageMetadata) === null || _c === void 0 ? void 0 : _c.promptTokenCount) !== null && _d !== void 0 ? _d : 0,
                outputTokens: (_f = (_e = response.usageMetadata) === null || _e === void 0 ? void 0 : _e.candidatesTokenCount) !== null && _f !== void 0 ? _f : 0,
            };
        }
        else {
            // ── Standard text-only path ──────────────────────────────────────────────
            result = await (0, ai_1.generateCompletion)(fullSystemPrompt, prompt.trim(), "", "fast", organizationId, uid, "gemini_proxy", { maxTokens: resolvedMaxTokens, temperature: resolvedTemperature });
        }
        res.status(200).json({
            text: result.text,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            rateLimitMax: RATE_LIMIT_MAX,
            rateLimitRemaining: rateLimit.remaining,
            rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
        });
    }
    catch (err) {
        const code = (_g = err.message) !== null && _g !== void 0 ? _g : "";
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
//# sourceMappingURL=geminiProxy.js.map