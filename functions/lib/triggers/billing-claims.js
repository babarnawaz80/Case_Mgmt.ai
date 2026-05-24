"use strict";
// Firestore Triggers — Auto-process new billing claims and daily task checks
// CaseManagement.AI — Gen 2 Firebase Functions
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
exports.onWorkflowTaskDailyCheck = exports.onNewBillingClaim = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const collections_1 = require("../config/collections");
// Trigger: When a new billing_claim is created — auto-run AI scrub
exports.onNewBillingClaim = (0, firestore_1.onDocumentCreated)(`${collections_1.COLLECTIONS.BILLING_CLAIMS}/{claimId}`, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const claim = snap.data();
    const claimId = event.params.claimId;
    try {
        await snap.ref.update({
            ai_scrub_status: "pending",
            ai_scrub_run_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        const issues = [];
        if (!claim.service_code)
            issues.push("Missing service code");
        if (!claim.authorization_id)
            issues.push("Missing authorization");
        if (!claim.rendering_provider_npi)
            issues.push("Missing rendering provider NPI");
        if (!claim.units || claim.units <= 0)
            issues.push("Invalid units");
        if (claim.authorization_id) {
            const authSnap = await admin.firestore()
                .collection(collections_1.COLLECTIONS.SERVICE_AUTHORIZATIONS)
                .doc(claim.authorization_id)
                .get();
            if (authSnap.exists) {
                const auth = authSnap.data();
                const serviceDate = new Date(claim.service_date);
                const authExpiry = new Date(auth.expiration_date);
                if (serviceDate > authExpiry)
                    issues.push("Service date is after authorization expiry");
                if (auth.remaining_units < claim.units)
                    issues.push("Insufficient authorized units remaining");
            }
        }
        await snap.ref.update({
            ai_scrub_status: issues.length === 0 ? "passed" : "needs_attention",
            ai_scrub_notes: issues,
            billing_status: issues.length === 0 ? "ready" : "on_hold",
        });
    }
    catch (error) {
        console.error("[billing-claim-scrub]", claimId, error);
    }
});
// Daily scheduled trigger: Mark overdue workflow tasks
exports.onWorkflowTaskDailyCheck = (0, scheduler_1.onSchedule)({ schedule: "0 6 * * *", timeZone: "America/New_York" }, async () => {
    const db = admin.firestore();
    const now = new Date();
    const overdueSnap = await db.collection(collections_1.COLLECTIONS.WORKFLOW_TASKS)
        .where("status", "in", ["pending_start", "in_progress"])
        .where("due_date", "<", now.toISOString())
        .get();
    if (overdueSnap.empty)
        return;
    const batch = db.batch();
    overdueSnap.docs.forEach((doc) => {
        const dueDate = new Date(doc.data().due_date);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        batch.update(doc.ref, { status: "overdue", days_overdue: daysOverdue });
    });
    await batch.commit();
    console.log(`[daily-check] Marked ${overdueSnap.docs.length} tasks as overdue`);
});
//# sourceMappingURL=billing-claims.js.map