/**
 * guardianPortal.ts — Cloud Functions for Guardian Portal session management.
 *
 * Functions:
 *   createGuardianPortalSession — Creates or updates a guardian portal session
 *                                  linked to a consent token hash.
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as crypto from "crypto";

export const createGuardianPortalSession = onCall(
  { cors: true },
  async (request) => {
    const {
      consentId,
      token,
      individualId,
      guardianName,
      guardianPhone,
      tenantId,
      orgId,
    } = request.data as {
      consentId?: string;
      token?: string;
      individualId?: string;
      guardianName?: string;
      guardianPhone?: string;
      tenantId?: string;
      orgId?: string;
    };

    if (!token || !individualId) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const db = admin.firestore();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Check if a non-revoked session already exists for this token hash
    const existingSnap = await db
      .collection("guardian_portal_sessions")
      .where("consentTokenHash", "==", tokenHash)
      .where("revokedAt", "==", null)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      // Add consent to existing session and refresh lastActiveAt
      const updates: Record<string, any> = {
        lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (consentId) {
        updates.consentIds = admin.firestore.FieldValue.arrayUnion(consentId);
      }
      await existingSnap.docs[0].ref.update(updates);
      return { sessionId: existingSnap.docs[0].id };
    }

    // Create new session — expires in 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const ref = await db.collection("guardian_portal_sessions").add({
      consentTokenHash: tokenHash,
      individualId,
      guardianName: guardianName ?? "Guardian",
      guardianPhone: guardianPhone ?? "",
      tenantId: tenantId ?? orgId ?? "",
      orgId: orgId ?? tenantId ?? "",
      otpVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      sessionCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      sessionExpiresAt: expiresAt,
      lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
      revokedAt: null,
      revokedBy: null,
      consentIds: consentId ? [consentId] : [],
    });

    return { sessionId: ref.id };
  }
);
