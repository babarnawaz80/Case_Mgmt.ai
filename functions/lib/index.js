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
exports.getProviderPortalInfo = exports.revokeProviderPortalToken = exports.providerPortalUpload = exports.getProviderPortalData = exports.validateProviderSession = exports.verifyProviderOTP = exports.sendProviderOTP = exports.validateProviderToken = exports.generateProviderPortalToken = exports.migrateIndividualStates = exports.scanDocumentOnCreate = exports.detectDuplicatesOnDemand = exports.detectDuplicatesOnCreate = exports.detectDuplicatesScheduled = exports.createGuardianPortalSession = exports.seedTrainingData = exports.checkTrainingExpirations = exports.cleanupExpiredConsents = exports.submitConsentSignature = exports.verifyConsentOTP = exports.sendConsentOTP = exports.checkConsentToken = exports.sendConsentRequest = exports.generateRenewalLetter = exports.seedValentinaDemoData = exports.refinePCP = exports.generatePCP = exports.onContactNoteSubmitted = exports.onIncidentReported = exports.onIndividualEnrolled = exports.manualOrchestratorRun = exports.scheduledOrchestrator = exports.sendVisitReminders = exports.dailyAuthRenewalCheck = exports.onAssessmentLeadTransfer = exports.onWorkflowTaskDailyCheck = exports.onNewBillingClaim = exports.api = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const express = require("express");
// Initialize Firebase Admin SDK
admin.initializeApp();
// Silently drop undefined fields instead of throwing — prevents crashes when
// individual documents have optional fields that haven't been set yet.
admin.firestore().settings({ ignoreUndefinedProperties: true });
// Gemini and Deepgram keys are loaded from functions/.env (gitignored)
// Never hardcode API keys in source code.
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
app.post("/care-assistant/:token/deepgram-token", companion_1.companionDeepgramToken);
app.post("/care-assistant/:token/agent-config", companion_1.companionAgentConfig);
app.options("/care-assistant/:token/llm", companion_1.companionLLMProxy);
app.post("/care-assistant/:token/llm", companion_1.companionLLMProxy);
// ─── Gemini Proxy API ─────────────────────────────────────────────────────
// Auth-protected. Uses Vertex AI ADC — no API key in any file.
// Rate limit: 20 calls per authenticated user per hour (tracked in Firestore).
const geminiProxy_1 = require("./api/geminiProxy");
app.post("/api/gemini-proxy", geminiProxy_1.geminiProxy);
// ─── Staff User Management API ────────────────────────────────────────────
// Uses Admin SDK so existing Firebase Auth accounts can be re-linked to an
// org without hitting EMAIL_EXISTS errors.
const staffUsers_1 = require("./api/staffUsers");
app.options("/api/staff/create-or-update", staffUsers_1.createOrUpdateStaffUser);
app.post("/api/staff/create-or-update", staffUsers_1.createOrUpdateStaffUser);
// ─── Compliance Agents API ────────────────────────────────────────────────
const agents_1 = require("./api/agents");
app.post("/api/agents/pcp-renewal/run", agents_1.runPcpRenewalAgent);
// ─── Ambient / Deepgram Token API ─────────────────────────────────────────
const ambient_1 = require("./api/ambient");
app.post("/api/ambient/deepgram-token", ambient_1.deepgramToken);
// ─── Intake Form API ──────────────────────────────────────────────────────
const intakeFunctions_1 = require("./api/intakeFunctions");
app.use("/api/intake", intakeFunctions_1.intakeRoutes);
// ─── Assessment API ────────────────────────────────────────────────────────
const assessmentFunctions_1 = require("./api/assessmentFunctions");
app.use("/api/assessments", assessmentFunctions_1.assessmentRoutes);
// ─── Export the Express app as a single Gen 2 Cloud Function ──────────────
exports.api = (0, https_1.onRequest)({ cors: true }, app);
// ─── Firestore Triggers ───────────────────────────────────────────────────
var billing_claims_1 = require("./triggers/billing-claims");
Object.defineProperty(exports, "onNewBillingClaim", { enumerable: true, get: function () { return billing_claims_1.onNewBillingClaim; } });
Object.defineProperty(exports, "onWorkflowTaskDailyCheck", { enumerable: true, get: function () { return billing_claims_1.onWorkflowTaskDailyCheck; } });
var assessmentTransfer_1 = require("./triggers/assessmentTransfer");
Object.defineProperty(exports, "onAssessmentLeadTransfer", { enumerable: true, get: function () { return assessmentTransfer_1.onAssessmentLeadTransfer; } });
// ─── Scheduled Functions ──────────────────────────────────────────────────
var authorizationRenewal_1 = require("./api/authorizationRenewal");
Object.defineProperty(exports, "dailyAuthRenewalCheck", { enumerable: true, get: function () { return authorizationRenewal_1.dailyAuthRenewalCheck; } });
var visitReminders_1 = require("./triggers/visitReminders");
Object.defineProperty(exports, "sendVisitReminders", { enumerable: true, get: function () { return visitReminders_1.sendVisitReminders; } });
// ─── Brain Orchestrator ───────────────────────────────────────────────────────
var brainOrchestrator_1 = require("./orchestrator/brainOrchestrator");
Object.defineProperty(exports, "scheduledOrchestrator", { enumerable: true, get: function () { return brainOrchestrator_1.scheduledOrchestrator; } });
Object.defineProperty(exports, "manualOrchestratorRun", { enumerable: true, get: function () { return brainOrchestrator_1.manualOrchestratorRun; } });
var orchestratorTriggers_1 = require("./orchestrator/orchestratorTriggers");
Object.defineProperty(exports, "onIndividualEnrolled", { enumerable: true, get: function () { return orchestratorTriggers_1.onIndividualEnrolled; } });
Object.defineProperty(exports, "onIncidentReported", { enumerable: true, get: function () { return orchestratorTriggers_1.onIncidentReported; } });
Object.defineProperty(exports, "onContactNoteSubmitted", { enumerable: true, get: function () { return orchestratorTriggers_1.onContactNoteSubmitted; } });
// ─── PCP Generation ───────────────────────────────────────────────────────────
var generatePCP_1 = require("./api/generatePCP");
Object.defineProperty(exports, "generatePCP", { enumerable: true, get: function () { return generatePCP_1.generatePCP; } });
var refinePCP_1 = require("./api/refinePCP");
Object.defineProperty(exports, "refinePCP", { enumerable: true, get: function () { return refinePCP_1.refinePCP; } });
var seedValentina_1 = require("./api/seedValentina");
Object.defineProperty(exports, "seedValentinaDemoData", { enumerable: true, get: function () { return seedValentina_1.seedValentinaDemoData; } });
var generateRenewalLetter_1 = require("./api/generateRenewalLetter");
Object.defineProperty(exports, "generateRenewalLetter", { enumerable: true, get: function () { return generateRenewalLetter_1.generateRenewalLetter; } });
// ─── Consent Management (callable + scheduled cleanup) ────────────────────────
var consent_1 = require("./api/consent");
Object.defineProperty(exports, "sendConsentRequest", { enumerable: true, get: function () { return consent_1.sendConsentRequest; } });
Object.defineProperty(exports, "checkConsentToken", { enumerable: true, get: function () { return consent_1.checkConsentToken; } });
Object.defineProperty(exports, "sendConsentOTP", { enumerable: true, get: function () { return consent_1.sendConsentOTP; } });
Object.defineProperty(exports, "verifyConsentOTP", { enumerable: true, get: function () { return consent_1.verifyConsentOTP; } });
Object.defineProperty(exports, "submitConsentSignature", { enumerable: true, get: function () { return consent_1.submitConsentSignature; } });
Object.defineProperty(exports, "cleanupExpiredConsents", { enumerable: true, get: function () { return consent_1.cleanupExpiredConsents; } });
var trainingAlerts_1 = require("./api/trainingAlerts");
Object.defineProperty(exports, "checkTrainingExpirations", { enumerable: true, get: function () { return trainingAlerts_1.checkTrainingExpirations; } });
Object.defineProperty(exports, "seedTrainingData", { enumerable: true, get: function () { return trainingAlerts_1.seedTrainingData; } });
// ─── Guardian Portal (callable) ───────────────────────────────────────────────
var guardianPortal_1 = require("./api/guardianPortal");
Object.defineProperty(exports, "createGuardianPortalSession", { enumerable: true, get: function () { return guardianPortal_1.createGuardianPortalSession; } });
// ─── Duplicate Detection ───────────────────────────────────────────────────────
var duplicates_1 = require("./api/duplicates");
Object.defineProperty(exports, "detectDuplicatesScheduled", { enumerable: true, get: function () { return duplicates_1.detectDuplicatesScheduled; } });
Object.defineProperty(exports, "detectDuplicatesOnCreate", { enumerable: true, get: function () { return duplicates_1.detectDuplicatesOnCreate; } });
Object.defineProperty(exports, "detectDuplicatesOnDemand", { enumerable: true, get: function () { return duplicates_1.detectDuplicatesOnDemand; } });
// ─── Document AI Scanning (Firestore trigger) ──────────────────────────────────
var scanDocument_1 = require("./api/scanDocument");
Object.defineProperty(exports, "scanDocumentOnCreate", { enumerable: true, get: function () { return scanDocument_1.scanDocumentOnCreate; } });
// ─── One-time data migrations (callable) ──────────────────────────────────────
var migrateIndividualStates_1 = require("./api/migrateIndividualStates");
Object.defineProperty(exports, "migrateIndividualStates", { enumerable: true, get: function () { return migrateIndividualStates_1.migrateIndividualStates; } });
// ─── Provider Portal (callable functions) ─────────────────────────────────────
var providerPortal_1 = require("./api/providerPortal");
Object.defineProperty(exports, "generateProviderPortalToken", { enumerable: true, get: function () { return providerPortal_1.generateProviderPortalToken; } });
Object.defineProperty(exports, "validateProviderToken", { enumerable: true, get: function () { return providerPortal_1.validateProviderToken; } });
Object.defineProperty(exports, "sendProviderOTP", { enumerable: true, get: function () { return providerPortal_1.sendProviderOTP; } });
Object.defineProperty(exports, "verifyProviderOTP", { enumerable: true, get: function () { return providerPortal_1.verifyProviderOTP; } });
Object.defineProperty(exports, "validateProviderSession", { enumerable: true, get: function () { return providerPortal_1.validateProviderSession; } });
Object.defineProperty(exports, "getProviderPortalData", { enumerable: true, get: function () { return providerPortal_1.getProviderPortalData; } });
Object.defineProperty(exports, "providerPortalUpload", { enumerable: true, get: function () { return providerPortal_1.providerPortalUpload; } });
Object.defineProperty(exports, "revokeProviderPortalToken", { enumerable: true, get: function () { return providerPortal_1.revokeProviderPortalToken; } });
Object.defineProperty(exports, "getProviderPortalInfo", { enumerable: true, get: function () { return providerPortal_1.getProviderPortalInfo; } });
//# sourceMappingURL=index.js.map