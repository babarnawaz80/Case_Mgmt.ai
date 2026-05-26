"use strict";
// AI Abstraction Layer — THE ONLY file that calls AI APIs (Gemini)
// CaseManagement.AI
// Uses direct REST calls to Gemini Developer API (v1beta) — bypasses SDK path-prefix issues.
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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCompletion = generateCompletion;
exports.streamCompletion = streamCompletion;
const admin = __importStar(require("firebase-admin"));
const collections_1 = require("../config/collections");
// Verified available via REST: gemini-2.5-flash works for this API key
const MODELS = {
    companion: "gemini-2.5-flash", // Care Companion bot
    quality: "gemini-2.5-flash", // Documentation & quality checks
    fast: "gemini-2.5-flash", // Chat, form prefill, scribe
};
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// Check org is allowed to use AI before making any call
async function checkOrgAIAccess(organizationId) {
    try {
        const db = admin.firestore();
        const orgSnap = await db.collection(collections_1.COLLECTIONS.ORGANIZATIONS).doc(organizationId).get();
        // If org doc doesn't exist yet, allow AI calls — new orgs start with full access
        if (!orgSnap.exists) {
            console.warn(`[AI] org doc missing for ${organizationId} — allowing AI call through`);
            return;
        }
        const org = orgSnap.data();
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
            const usageSnap = await db.collection(collections_1.COLLECTIONS.AI_USAGE_LOG)
                .where("organizationId", "==", organizationId)
                .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(today))
                .get();
            const todayCredits = usageSnap.docs.reduce((sum, d) => { var _a; return sum + ((_a = d.data().credits_consumed) !== null && _a !== void 0 ? _a : 0); }, 0);
            if (todayCredits >= org.daily_credit_limit) {
                throw new Error("DAILY_LIMIT_REACHED");
            }
        }
    }
    catch (err) {
        // Re-throw known gating errors; swallow unexpected errors so AI is never blocked by infra issues
        if (["AI_PAUSED", "INSUFFICIENT_CREDITS", "DAILY_LIMIT_REACHED"].includes(err.message)) {
            throw err;
        }
        console.error("[AI] checkOrgAIAccess unexpected error — allowing through:", err.message);
    }
}
// Direct REST call to Gemini API (v1beta) — bypasses SDK model-path issues
async function callGeminiRest(apiKey, modelId, systemPrompt, userPrompt, maxTokens, temperature) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
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
    const data = await resp.json();
    const text = (_f = (_e = (_d = (_c = (_b = (_a = data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) !== null && _f !== void 0 ? _f : "";
    const inputTokens = (_h = (_g = data.usageMetadata) === null || _g === void 0 ? void 0 : _g.promptTokenCount) !== null && _h !== void 0 ? _h : 0;
    const outputTokens = (_k = (_j = data.usageMetadata) === null || _j === void 0 ? void 0 : _j.candidatesTokenCount) !== null && _k !== void 0 ? _k : 0;
    return { text, inputTokens, outputTokens };
}
// Main generation function — called by all feature functions
async function generateCompletion(systemPrompt, userPrompt, context, tier, organizationId, _userId, _feature, options = {}) {
    var _a, _b;
    await checkOrgAIAccess(organizationId);
    const modelId = MODELS[tier];
    const maxTokens = (_a = options.maxTokens) !== null && _a !== void 0 ? _a : 4096;
    const temperature = (_b = options.temperature) !== null && _b !== void 0 ? _b : 0.3;
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
    }
    catch (err) {
        console.error("[AI] Gemini REST failed:", err.message);
        throw new Error("AI_UNAVAILABLE");
    }
}
// Streaming version — for Care Companion bot real-time responses
function streamCompletion(systemPrompt, userPrompt, context, tier, organizationId, _userId, _feature) {
    return __asyncGenerator(this, arguments, function* streamCompletion_1() {
        var _a, _b, _c, _d, _e, _f, _g;
        yield __await(checkOrgAIAccess(organizationId));
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
        const resp = yield __await(fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }));
        if (!resp.ok || !resp.body) {
            const errText = yield __await(resp.text().catch(() => ""));
            console.error(`[AI] Stream REST error ${resp.status}:`, errText);
            throw new Error("AI_UNAVAILABLE");
        }
        // Read SSE stream
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
            while (true) {
                const { done, value } = yield __await(reader.read());
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = (_a = lines.pop()) !== null && _a !== void 0 ? _a : "";
                for (const line of lines) {
                    if (!line.startsWith("data: "))
                        continue;
                    const jsonStr = line.slice(6).trim();
                    if (jsonStr === "[DONE]")
                        return yield __await(void 0);
                    try {
                        const chunk = JSON.parse(jsonStr);
                        const text = (_g = (_f = (_e = (_d = (_c = (_b = chunk.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text) !== null && _g !== void 0 ? _g : "";
                        if (text)
                            yield yield __await(text);
                    }
                    catch (_h) {
                        // skip malformed chunk
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
        }
    });
}
//# sourceMappingURL=ai.js.map