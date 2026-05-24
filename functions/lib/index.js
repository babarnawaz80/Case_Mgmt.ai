"use strict";
// Cloud Functions Main Entry Point
// CaseManagement.AI — Firebase Cloud Functions Gen 2
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
exports.dailyAuthRenewalCheck = exports.onWorkflowTaskDailyCheck = exports.onNewBillingClaim = exports.api = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const express = require("express");
// Initialize Firebase Admin SDK
admin.initializeApp();
// Silently drop undefined fields instead of throwing — prevents crashes when
// individual documents have optional fields that haven't been set yet.
admin.firestore().settings({ ignoreUndefinedProperties: true });
// Gemini Developer API key — preferred over Vertex AI
if (!process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = "AIzaSyBTxu2T_5hNIakbwu1XRvQu_Hwkx2BxTKU";
}
// Set global options for all functions
(0, v2_1.setGlobalOptions)({ region: "us-central1", memory: "512MiB", timeoutSeconds: 300 });
// ─── Express API App ───────────────────────────────────────────────────────
const app = express();
app.use(express.json());
// Health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "CaseManagement.AI Functions", ts: Date.now() });
});
// ─── AI Forms API ─────────────────────────────────────────────────────────
const ai_forms_1 = require("./api/ai-forms");
app.post("/api/ai-forms/progress-note-prefill", ai_forms_1.progressNotePrefill);
app.post("/api/ai-forms/monitoring-form-prefill", ai_forms_1.monitoringFormPrefill);
app.post("/api/ai-forms/visit-summary-prefill", ai_forms_1.visitSummaryPrefill);
app.post("/api/ai-forms/care-plan-draft", ai_forms_1.carePlanDraft);
// ─── AI Chat Panel API ────────────────────────────────────────────────────
const chat_1 = require("./api/chat");
app.post("/api/chat", chat_1.chatMessage);
// ─── Stripe & Sandbox Billing API ─────────────────────────────────────────
const billing_1 = require("./api/billing");
app.post("/api/billing/create-checkout-session", billing_1.createCheckoutSession);
app.post("/api/billing/create-portal-session", billing_1.createPortalSession);
app.post("/api/billing/webhook", billing_1.stripeWebhook);
app.post("/api/billing/simulate-webhook", billing_1.simulateWebhookPayment);
// ─── Care Companion Bot API ────────────────────────────────────────────────
const companion_1 = require("./api/companion");
app.get("/care-assistant/:token", companion_1.companionGet);
app.post("/care-assistant/:token/message", companion_1.companionMessage);
app.post("/care-assistant/:token/end-session", companion_1.companionEndSession);
// ─── Compliance Agents API ────────────────────────────────────────────────
const agents_1 = require("./api/agents");
app.post("/api/agents/pcp-renewal/run", agents_1.runPcpRenewalAgent);
// ─── Ambient / Deepgram Token API ─────────────────────────────────────────
const ambient_1 = require("./api/ambient");
app.post("/api/ambient/deepgram-token", ambient_1.deepgramToken);
// ─── Export the Express app as a single Gen 2 Cloud Function ──────────────
exports.api = (0, https_1.onRequest)({ cors: true }, app);
// ─── Firestore Triggers ───────────────────────────────────────────────────
var billing_claims_1 = require("./triggers/billing-claims");
Object.defineProperty(exports, "onNewBillingClaim", { enumerable: true, get: function () { return billing_claims_1.onNewBillingClaim; } });
Object.defineProperty(exports, "onWorkflowTaskDailyCheck", { enumerable: true, get: function () { return billing_claims_1.onWorkflowTaskDailyCheck; } });
// ─── Scheduled Functions ──────────────────────────────────────────────────
var authorizationRenewal_1 = require("./api/authorizationRenewal");
Object.defineProperty(exports, "dailyAuthRenewalCheck", { enumerable: true, get: function () { return authorizationRenewal_1.dailyAuthRenewalCheck; } });
//# sourceMappingURL=index.js.map