"use strict";
// AI Abstraction Layer — THE ONLY file that calls AI APIs (Gemini)
// CaseManagement.AI — PRD v2.0
// All features call generateCompletion() or streamCompletion() — NO EXCEPTIONS.
// Supports:
//   1. Gemini Developer API (via GEMINI_API_KEY env var) — preferred
//   2. Vertex AI (via GCP service account) — fallback if no API key
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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
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
const vertexai_1 = require("@google-cloud/vertexai");
const genai_1 = require("@google/genai");
const collections_1 = require("../config/collections");
const PROJECT_ID = process.env.GCLOUD_PROJECT || "casemanagement-ai";
const LOCATION = "us-central1";
// Gemini model IDs
// Gemini Developer API (via API key) uses the short name.
// Vertex AI uses the full publisher model path format.
const MODELS = {
    companion: "gemini-1.5-flash", // Care Companion bot
    quality: "gemini-1.5-flash", // Documentation & quality checks
    fast: "gemini-1.5-flash", // Form prefill, daily brief, scribe
};
// Vertex AI model names (different naming convention from Gemini Developer API)
const VERTEX_MODELS = {
    companion: "gemini-1.5-flash-001",
    quality: "gemini-1.5-flash-001",
    fast: "gemini-1.5-flash-001",
};
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
// Main generation function — called by all feature functions
async function generateCompletion(systemPrompt, userPrompt, context, tier, organizationId, _userId, _feature, options = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    await checkOrgAIAccess(organizationId);
    const modelId = MODELS[tier];
    const maxTokens = (_a = options.maxTokens) !== null && _a !== void 0 ? _a : 4096;
    const temperature = (_b = options.temperature) !== null && _b !== void 0 ? _b : 0.3;
    const fullPrompt = context ? `${context}\n\n${userPrompt}` : userPrompt;
    // Prefer Gemini Developer API if key is available
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
        try {
            const ai = new genai_1.GoogleGenAI({ apiKey: geminiApiKey });
            const response = await ai.models.generateContent({
                model: modelId,
                contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
                config: {
                    systemInstruction: systemPrompt,
                    maxOutputTokens: maxTokens,
                    temperature,
                },
            });
            const text = (_c = response.text) !== null && _c !== void 0 ? _c : "";
            const inputTokens = (_e = (_d = response.usageMetadata) === null || _d === void 0 ? void 0 : _d.promptTokenCount) !== null && _e !== void 0 ? _e : 0;
            const outputTokens = (_g = (_f = response.usageMetadata) === null || _f === void 0 ? void 0 : _f.candidatesTokenCount) !== null && _g !== void 0 ? _g : 0;
            return { text, inputTokens, outputTokens };
        }
        catch (err) {
            console.error("[AI] Gemini API error, trying Vertex AI:", err.message);
        }
    }
    // Fall back to Vertex AI (uses Cloud Run service account — no API key needed)
    try {
        const vertexModelId = VERTEX_MODELS[tier];
        const vertexAI = new vertexai_1.VertexAI({ project: PROJECT_ID, location: LOCATION });
        const model = vertexAI.getGenerativeModel({
            model: vertexModelId,
            generationConfig: { maxOutputTokens: maxTokens, temperature },
            systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
        });
        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        const text = (_o = (_m = (_l = (_k = (_j = (_h = response.candidates) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.content) === null || _k === void 0 ? void 0 : _k.parts) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.text) !== null && _o !== void 0 ? _o : "";
        const inputTokens = (_q = (_p = response.usageMetadata) === null || _p === void 0 ? void 0 : _p.promptTokenCount) !== null && _q !== void 0 ? _q : 0;
        const outputTokens = (_s = (_r = response.usageMetadata) === null || _r === void 0 ? void 0 : _r.candidatesTokenCount) !== null && _s !== void 0 ? _s : 0;
        return { text, inputTokens, outputTokens };
    }
    catch (err) {
        console.error("[AI] Vertex AI also failed:", (_t = err.message) !== null && _t !== void 0 ? _t : err);
        throw err;
    }
}
// Streaming version — for Care Companion bot real-time responses
function streamCompletion(systemPrompt, userPrompt, context, tier, organizationId, _userId, _feature) {
    return __asyncGenerator(this, arguments, function* streamCompletion_1() {
        var _a, e_1, _b, _c, _d, e_2, _e, _f;
        var _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
        yield __await(checkOrgAIAccess(organizationId));
        const modelId = MODELS[tier];
        const fullPrompt = context ? `${context}\n\n${userPrompt}` : userPrompt;
        // Prefer Gemini Developer API
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (geminiApiKey) {
            try {
                const ai = new genai_1.GoogleGenAI({ apiKey: geminiApiKey });
                const stream = yield __await(ai.models.generateContentStream({
                    model: modelId,
                    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
                    config: {
                        systemInstruction: systemPrompt,
                        maxOutputTokens: 512,
                        temperature: 0.7,
                    },
                }));
                try {
                    for (var _v = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield __await(stream_1.next()), _a = stream_1_1.done, !_a; _v = true) {
                        _c = stream_1_1.value;
                        _v = false;
                        const chunk = _c;
                        const text = (_m = (_l = (_k = (_j = (_h = (_g = chunk.candidates) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.content) === null || _j === void 0 ? void 0 : _j.parts) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.text) !== null && _m !== void 0 ? _m : "";
                        if (text)
                            yield yield __await(text);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_v && !_a && (_b = stream_1.return)) yield __await(_b.call(stream_1));
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                return yield __await(void 0);
            }
            catch (err) {
                console.error("[AI] Gemini stream error, trying Vertex AI:", err.message);
            }
        }
        // Fall back to Vertex AI streaming
        try {
            const vertexModelId = VERTEX_MODELS[tier];
            const vertexAI = new vertexai_1.VertexAI({ project: PROJECT_ID, location: LOCATION });
            const model = vertexAI.getGenerativeModel({
                model: vertexModelId,
                generationConfig: { maxOutputTokens: 512, temperature: 0.7 },
                systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
            });
            const stream = yield __await(model.generateContentStream(fullPrompt));
            try {
                for (var _w = true, _x = __asyncValues(stream.stream), _y; _y = yield __await(_x.next()), _d = _y.done, !_d; _w = true) {
                    _f = _y.value;
                    _w = false;
                    const chunk = _f;
                    const text = (_t = (_s = (_r = (_q = (_p = (_o = chunk.candidates) === null || _o === void 0 ? void 0 : _o[0]) === null || _p === void 0 ? void 0 : _p.content) === null || _q === void 0 ? void 0 : _q.parts) === null || _r === void 0 ? void 0 : _r[0]) === null || _s === void 0 ? void 0 : _s.text) !== null && _t !== void 0 ? _t : "";
                    if (text)
                        yield yield __await(text);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_w && !_d && (_e = _x.return)) yield __await(_e.call(_x));
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        catch (err) {
            console.error("[AI] Vertex AI stream also failed:", (_u = err.message) !== null && _u !== void 0 ? _u : err);
            throw err;
        }
    });
}
//# sourceMappingURL=ai.js.map