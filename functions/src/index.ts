// Cloud Functions Main Entry Point
// CaseManagement.AI — Firebase Cloud Functions Gen 2

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import express = require("express");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Silently drop undefined fields instead of throwing — prevents crashes when
// individual documents have optional fields that haven't been set yet.
admin.firestore().settings({ ignoreUndefinedProperties: true });

// Gemini Developer API key — linked to casemanagement-ai project with billing enabled
if (!process.env.GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = "AIzaSyBxHs_ajRUqk4oTD8XQKDEZcsbPEZKp1_k";
}

// Deepgram API key — used by ambient transcription endpoint
if (!process.env.DEEPGRAM_API_KEY) {
  process.env.DEEPGRAM_API_KEY = "1ea051911af6faacbd09cacef929ab1d7189a48a";
}


// Set global options for all functions
setGlobalOptions({ region: "us-central1", memory: "512MiB", timeoutSeconds: 300 });

// ─── Express API App ───────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// Health check
app.get("/health", (_req: express.Request, res: express.Response) => {
  res.json({ status: "ok", service: "CaseManagement.AI Functions", ts: Date.now() });
});

// ─── AI Forms API ─────────────────────────────────────────────────────────
import { progressNotePrefill, monitoringFormPrefill, visitSummaryPrefill, carePlanDraft } from "./api/ai-forms";
app.post("/api/ai-forms/progress-note-prefill", progressNotePrefill);
app.post("/api/ai-forms/monitoring-form-prefill", monitoringFormPrefill);
app.post("/api/ai-forms/visit-summary-prefill", visitSummaryPrefill);
app.post("/api/ai-forms/care-plan-draft", carePlanDraft);

// ─── AI Chat Panel API ────────────────────────────────────────────────────
import { chatMessage } from "./api/chat";
app.post("/api/chat", chatMessage);

// ─── Stripe & Sandbox Billing API ─────────────────────────────────────────
import { createCheckoutSession, createPortalSession, stripeWebhook, simulateWebhookPayment } from "./api/billing";
app.post("/api/billing/create-checkout-session", createCheckoutSession);
app.post("/api/billing/create-portal-session", createPortalSession);
app.post("/api/billing/webhook", stripeWebhook);
app.post("/api/billing/simulate-webhook", simulateWebhookPayment);

// ─── Care Companion Bot API ────────────────────────────────────────────────
import { companionGet, companionMessage, companionEndSession, companionDeepgramToken } from "./api/companion";
app.get("/care-assistant/:token", companionGet);
app.post("/care-assistant/:token/message", companionMessage);
app.post("/care-assistant/:token/end-session", companionEndSession);
app.post("/care-assistant/:token/deepgram-token", companionDeepgramToken);

// ─── Compliance Agents API ────────────────────────────────────────────────
import { runPcpRenewalAgent } from "./api/agents";
app.post("/api/agents/pcp-renewal/run", runPcpRenewalAgent);

// ─── Ambient / Deepgram Token API ─────────────────────────────────────────
import { deepgramToken } from "./api/ambient";
app.post("/api/ambient/deepgram-token", deepgramToken);

// ─── Export the Express app as a single Gen 2 Cloud Function ──────────────
export const api = onRequest({ cors: true }, app);

// ─── Firestore Triggers ───────────────────────────────────────────────────
export { onNewBillingClaim, onWorkflowTaskDailyCheck } from "./triggers/billing-claims";

// ─── Scheduled Functions ──────────────────────────────────────────────────
export { dailyAuthRenewalCheck } from "./api/authorizationRenewal";
