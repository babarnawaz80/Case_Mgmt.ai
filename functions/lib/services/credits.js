"use strict";
// Credit Service — Deducts AI credits after every successful AI call
// CaseManagement.AI — PRD v2.0
// Called automatically by ai.ts after every generateCompletion call.
// NEVER called directly from feature code.
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
exports.consumeCredits = consumeCredits;
const admin = __importStar(require("firebase-admin"));
const collections_1 = require("../config/collections");
const DEFAULT_RATES = {
    gemini_flash_per_1k_tokens: 2,
    gemini_pro_per_1k_tokens: 10,
};
function creditsForModel(model, totalTokens, rates) {
    const isPro = model.includes("pro");
    const ratePerK = isPro ? rates.gemini_pro_per_1k_tokens : rates.gemini_flash_per_1k_tokens;
    return Math.ceil((totalTokens / 1000) * ratePerK);
}
async function consumeCredits(params) {
    var _a, _b;
    const db = admin.firestore();
    // Load credit rates
    const ratesSnap = await db.collection(collections_1.COLLECTIONS.CONFIG).doc(collections_1.CONFIG_DOCS.CREDIT_RATES).get();
    const rates = ratesSnap.exists ? Object.assign(Object.assign({}, DEFAULT_RATES), ratesSnap.data()) : DEFAULT_RATES;
    const totalTokens = params.inputTokens + params.outputTokens;
    const creditsConsumed = creditsForModel(params.model, totalTokens, rates);
    const costUsd = creditsConsumed * 0.000001; // approximate
    // Firestore transaction: deduct credits atomically
    const orgRef = db.collection(collections_1.COLLECTIONS.ORGANIZATIONS).doc(params.organizationId);
    let remainingBalance = 0;
    await db.runTransaction(async (tx) => {
        var _a, _b, _c, _d;
        const orgSnap = await tx.get(orgRef);
        if (!orgSnap.exists)
            throw new Error("Organization not found");
        const org = orgSnap.data();
        const currentBalance = (_a = org.credit_balance) !== null && _a !== void 0 ? _a : 0;
        const newBalance = Math.max(0, currentBalance - creditsConsumed);
        const totalUsed = ((_b = org.total_credits_used) !== null && _b !== void 0 ? _b : 0) + creditsConsumed;
        tx.update(orgRef, {
            credit_balance: newBalance,
            total_credits_used: totalUsed,
        });
        remainingBalance = newBalance;
        // Check low balance alert
        const totalPurchased = (_c = org.total_credits_purchased) !== null && _c !== void 0 ? _c : 0;
        const threshold = ((_d = org.credit_alert_threshold_pct) !== null && _d !== void 0 ? _d : 20) / 100;
        if (newBalance <= totalPurchased * threshold &&
            org.low_balance_alert_sent !== true &&
            totalPurchased > 0) {
            tx.update(orgRef, { low_balance_alert_sent: true });
            // TODO: Create admin notifications in a separate write after transaction
        }
        // Check zero balance
        if (newBalance <= 0) {
            tx.update(orgRef, {
                ai_features_enabled: false,
                ai_paused_at: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });
    // Log usage (outside transaction — append-only)
    await db.collection(collections_1.COLLECTIONS.AI_USAGE_LOG).add({
        organizationId: params.organizationId,
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole,
        feature: params.feature,
        model: params.model,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
        total_tokens: totalTokens,
        credits_consumed: creditsConsumed,
        cost_usd: costUsd,
        individualId: (_a = params.individualId) !== null && _a !== void 0 ? _a : null,
        session_id: (_b = params.sessionId) !== null && _b !== void 0 ? _b : null,
        success: true,
        error_message: null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, remainingBalance };
}
//# sourceMappingURL=credits.js.map