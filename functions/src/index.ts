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

// Gemini and Deepgram keys are loaded from functions/.env (gitignored)
// Never hardcode API keys in source code.


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
import { companionGet, companionMessage, companionEndSession, companionDeepgramToken, companionAgentConfig, companionLLMProxy } from "./api/companion";
app.get("/care-assistant/:token", companionGet);
app.post("/care-assistant/:token/message", companionMessage);
app.post("/care-assistant/:token/end-session", companionEndSession);
app.post("/care-assistant/:token/deepgram-token", companionDeepgramToken);
app.post("/care-assistant/:token/agent-config", companionAgentConfig);
app.options("/care-assistant/:token/llm", companionLLMProxy);
app.post("/care-assistant/:token/llm", companionLLMProxy);

// ─── Gemini Proxy API ─────────────────────────────────────────────────────
// Auth-protected. Uses Vertex AI ADC — no API key in any file.
// Rate limit: 20 calls per authenticated user per hour (tracked in Firestore).
import { geminiProxy } from "./api/geminiProxy";
app.post("/api/gemini-proxy", geminiProxy);

// ─── Staff User Management API ────────────────────────────────────────────
// Uses Admin SDK so existing Firebase Auth accounts can be re-linked to an
// org without hitting EMAIL_EXISTS errors.
import { createOrUpdateStaffUser } from "./api/staffUsers";
app.options("/api/staff/create-or-update", createOrUpdateStaffUser);
app.post("/api/staff/create-or-update", createOrUpdateStaffUser);

// ─── Compliance Agents API ────────────────────────────────────────────────
import { runPcpRenewalAgent } from "./api/agents";
app.post("/api/agents/pcp-renewal/run", runPcpRenewalAgent);

// ─── Ambient / Deepgram Token API ─────────────────────────────────────────
import { deepgramToken } from "./api/ambient";
app.post("/api/ambient/deepgram-token", deepgramToken);

// ─── Intake Form API ──────────────────────────────────────────────────────
import { intakeRoutes } from "./api/intakeFunctions";
app.use("/api/intake", intakeRoutes);

// ─── Assessment API ────────────────────────────────────────────────────────
import { assessmentRoutes } from "./api/assessmentFunctions";
app.use("/api/assessments", assessmentRoutes);

// ─── Export the Express app as a single Gen 2 Cloud Function ──────────────
export const api = onRequest({ cors: true }, app);

// ─── Firestore Triggers ───────────────────────────────────────────────────
export { onNewBillingClaim, onWorkflowTaskDailyCheck } from "./triggers/billing-claims";
export { onAssessmentLeadTransfer } from "./triggers/assessmentTransfer";

// ─── Scheduled Functions ──────────────────────────────────────────────────
export { dailyAuthRenewalCheck } from "./api/authorizationRenewal";
export { sendVisitReminders } from "./triggers/visitReminders";

// ─── Brain Orchestrator ───────────────────────────────────────────────────────
export { scheduledOrchestrator, manualOrchestratorRun } from "./orchestrator/brainOrchestrator";
export { onIndividualEnrolled, onIncidentReported, onContactNoteSubmitted } from "./orchestrator/orchestratorTriggers";

// ─── PCP Generation ───────────────────────────────────────────────────────────
export { generatePCP } from "./api/generatePCP";
export { refinePCP } from "./api/refinePCP";
export { seedValentinaDemoData } from "./api/seedValentina";
export { generateRenewalLetter } from "./api/generateRenewalLetter";

// ─── Consent Management (callable + scheduled cleanup) ────────────────────────
export {
  sendConsentRequest,
  checkConsentToken,
  sendConsentOTP,
  verifyConsentOTP,
  submitConsentSignature,
  cleanupExpiredConsents,
} from "./api/consent";
export { checkTrainingExpirations, seedTrainingData } from "./api/trainingAlerts";

// ─── Guardian Portal (callable) ───────────────────────────────────────────────
export { createGuardianPortalSession } from "./api/guardianPortal";

// ─── Duplicate Detection ───────────────────────────────────────────────────────
export { detectDuplicatesScheduled, detectDuplicatesOnCreate, detectDuplicatesOnDemand } from "./api/duplicates";

// ─── Document AI Scanning (Firestore trigger) ──────────────────────────────────
export { scanDocumentOnCreate } from "./api/scanDocument";

// ─── One-time data migrations (callable) ──────────────────────────────────────
export { migrateIndividualStates } from "./api/migrateIndividualStates";

// ─── Voice Proxy (Gemini 2.0 Live API WebSocket proxy) ────────────────────────
export { voiceProxy } from "./api/voiceProxy";

// ─── Provider Portal (callable functions) ─────────────────────────────────────
export {
  generateProviderPortalToken,
  validateProviderToken,
  sendProviderOTP,
  verifyProviderOTP,
  validateProviderSession,
  getProviderPortalData,
  providerPortalUpload,
  revokeProviderPortalToken,
  getProviderPortalInfo,
} from "./api/providerPortal";
