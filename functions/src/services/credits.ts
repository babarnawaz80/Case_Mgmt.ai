// Credit Service — Deducts AI credits after every successful AI call
// CaseManagement.AI — PRD v2.0
// Called automatically by ai.ts after every generateCompletion call.
// NEVER called directly from feature code.

import * as admin from "firebase-admin";
import { COLLECTIONS, CONFIG_DOCS } from "../config/collections";

export interface CreditParams {
  organizationId: string;
  userId: string;
  userName: string;
  userRole: string;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  individualId?: string;
  sessionId?: string;
}

interface CreditRates {
  gemini_flash_per_1k_tokens: number;
  gemini_pro_per_1k_tokens: number;
}

const DEFAULT_RATES: CreditRates = {
  gemini_flash_per_1k_tokens: 2,
  gemini_pro_per_1k_tokens: 10,
};

function creditsForModel(model: string, totalTokens: number, rates: CreditRates): number {
  const isPro = model.includes("pro");
  const ratePerK = isPro ? rates.gemini_pro_per_1k_tokens : rates.gemini_flash_per_1k_tokens;
  return Math.ceil((totalTokens / 1000) * ratePerK);
}

export async function consumeCredits(params: CreditParams): Promise<{ success: boolean; remainingBalance: number }> {
  const db = admin.firestore();

  // Load credit rates
  const ratesSnap = await db.collection(COLLECTIONS.CONFIG).doc(CONFIG_DOCS.CREDIT_RATES).get();
  const rates: CreditRates = ratesSnap.exists ? { ...DEFAULT_RATES, ...ratesSnap.data() } : DEFAULT_RATES;

  const totalTokens = params.inputTokens + params.outputTokens;
  const creditsConsumed = creditsForModel(params.model, totalTokens, rates);
  const costUsd = creditsConsumed * 0.000001; // approximate

  // Firestore transaction: deduct credits atomically
  const orgRef = db.collection(COLLECTIONS.ORGANIZATIONS).doc(params.organizationId);
  let remainingBalance = 0;

  await db.runTransaction(async (tx) => {
    const orgSnap = await tx.get(orgRef);
    if (!orgSnap.exists) throw new Error("Organization not found");

    const org = orgSnap.data()!;
    const currentBalance = org.credit_balance ?? 0;
    const newBalance = Math.max(0, currentBalance - creditsConsumed);
    const totalUsed = (org.total_credits_used ?? 0) + creditsConsumed;

    tx.update(orgRef, {
      credit_balance: newBalance,
      total_credits_used: totalUsed,
    });

    remainingBalance = newBalance;

    // Check low balance alert
    const totalPurchased = org.total_credits_purchased ?? 0;
    const threshold = (org.credit_alert_threshold_pct ?? 20) / 100;
    if (
      newBalance <= totalPurchased * threshold &&
      org.low_balance_alert_sent !== true &&
      totalPurchased > 0
    ) {
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
  await db.collection(COLLECTIONS.AI_USAGE_LOG).add({
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
    individualId: params.individualId ?? null,
    session_id: params.sessionId ?? null,
    success: true,
    error_message: null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, remainingBalance };
}
