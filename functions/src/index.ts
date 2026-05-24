// Cloud Functions Main Entry Point
// CaseManagement.AI — Firebase Cloud Functions Gen 2

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import express = require("express");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Inject Gemini API key into process environment so ai.ts can read it
// This ensures the Gemini Developer API is used instead of Vertex AI
if (!process.env.GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = "AIzaSyBTxu2T_5hNIakbwu1XRvQu_Hwkx2BxTKU";
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
import { companionGet, companionMessage, companionEndSession } from "./api/companion";
app.get("/care-assistant/:token", companionGet);
app.post("/care-assistant/:token/message", companionMessage);
app.post("/care-assistant/:token/end-session", companionEndSession);

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
