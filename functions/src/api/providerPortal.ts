/**
 * providerPortal.ts — Cloud Functions for Provider Portal management.
 *
 * Functions:
 *   generateProviderPortalToken  — Create or return existing portal token (auth required)
 *   validateProviderToken        — Validate a raw token (public)
 *   sendProviderOTP              — Generate & send OTP via SMS or email (public)
 *   verifyProviderOTP            — Validate OTP, issue session token (public)
 *   validateProviderSession      — Check an active session token (public)
 *   getProviderPortalData        — Return linked individuals + recent uploads (public, session)
 *   providerPortalUpload         — Upload a document via provider portal (public, session)
 *   revokeProviderPortalToken    — Revoke an active token (auth required)
 *   getProviderPortalInfo        — Get token + recent uploads for a provider (auth required)
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as crypto from "crypto";

// ─── Environment ──────────────────────────────────────────────────────────────

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN  ?? "";
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER ?? "";
const APP_BASE_URL       = process.env.APP_BASE_URL       ?? "https://app.casemanagement.ai";

function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new HttpsError("failed-precondition", "Twilio credentials not configured.");
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const twilio = require("twilio");
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface OtpSession {
  sessionToken: string;
  verifiedAt: admin.firestore.Timestamp | Date;
  expiresAt: Date;
  userAgent: string | null;
}

interface ProviderTokenDoc {
  tenantId: string;
  orgId: string;
  providerId: string;
  providerName: string;
  providerEmail: string;
  providerPhone: string | null;
  token: string;
  tokenHash: string;
  portalUrl: string;
  status: "active" | "revoked";
  generatedAt: admin.firestore.FieldValue;
  generatedBy: string;
  revokedAt: admin.firestore.FieldValue | null;
  revokedBy: string | null;
  linkedIndividualIds: string[];
  lastAccessedAt: admin.firestore.FieldValue | null;
  lastDocumentUploadedAt: admin.firestore.FieldValue | null;
  totalDocumentsUploaded: number;
  documentsThisMonth: number;
  otpSessions: OtpSession[];
  otpHash?: string | null;
  otpExpiresAt?: Date | null;
  otpAttempts?: number;
  otpPlaintext?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const atIdx = email.indexOf("@");
  if (atIdx <= 1) return "***@***";
  return `${email[0]}***${email[atIdx - 1]}${email.slice(atIdx)}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***-***-****";
  return `***-***-${digits.slice(-4)}`;
}

/** Determine the target folder name from a document type string. */
function folderForDocumentType(documentType: string): string | null {
  switch (documentType) {
    case "Progress Note":
    case "Goal Documentation":
    case "Quarterly Report":
    case "Annual Report":
      return "Person-Centered Plans";
    case "Medical / Health Update":
      return "Medical & Health";
    case "Incident Documentation":
      return "Behavioral";
    case "Service Authorization Request":
      return "Financial & Benefits";
    default:
      return null;
  }
}

/** Validate session token and return session if valid. */
async function requireValidSession(
  db: admin.firestore.Firestore,
  tokenId: string,
  sessionToken: string
): Promise<{ tokenDoc: admin.firestore.DocumentData; tokenRef: admin.firestore.DocumentReference }> {
  const tokenRef = db.collection("provider_portal_tokens").doc(tokenId);
  const tokenSnap = await tokenRef.get();
  if (!tokenSnap.exists) {
    throw new HttpsError("not-found", "Token not found.");
  }
  const tokenDoc = tokenSnap.data()!;
  if (tokenDoc.status !== "active") {
    throw new HttpsError("permission-denied", "Token is no longer active.");
  }
  const now = Date.now();
  const sessions: OtpSession[] = Array.isArray(tokenDoc.otpSessions) ? tokenDoc.otpSessions : [];
  const validSession = sessions.find(
    (s) => s.sessionToken === sessionToken && new Date(s.expiresAt).getTime() > now
  );
  if (!validSession) {
    throw new HttpsError("unauthenticated", "Invalid or expired session.");
  }
  return { tokenDoc, tokenRef };
}

// ─── 1. generateProviderPortalToken (auth required) ───────────────────────────

export const generateProviderPortalToken = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const {
      providerId,
      providerName,
      providerEmail,
      providerPhone,
      sendEmail,
    } = request.data as {
      providerId?: string;
      providerName?: string;
      providerEmail?: string;
      providerPhone?: string;
      sendEmail?: boolean;
    };

    if (!providerId || !providerName || !providerEmail) {
      throw new HttpsError("invalid-argument", "providerId, providerName, and providerEmail are required.");
    }

    const db = admin.firestore();
    const orgId = (request.auth.token.organizationId as string | undefined) ??
                  (request.auth.token.orgId as string | undefined) ?? "";

    // Check for existing active token
    const existingSnap = await db
      .collection("provider_portal_tokens")
      .where("providerId", "==", providerId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0];
      const existingData = existing.data();
      return {
        success: true,
        token: existingData.token as string,
        portalUrl: existingData.portalUrl as string,
        tokenId: existing.id,
        alreadyExisted: true,
      };
    }

    // Generate new token
    const token = crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const portalUrl = `${APP_BASE_URL}/provider-portal/${token}`;

    // Resolve linked individual IDs
    const linkedSnap = await db
      .collection("individual_providers")
      .where("providerId", "==", providerId)
      .where("status", "==", "active")
      .get();

    const linkedIndividualIds = linkedSnap.docs.map(
      (d) => d.data().individualId as string
    ).filter(Boolean);

    const tokenDocData: ProviderTokenDoc = {
      tenantId: orgId,
      orgId,
      providerId,
      providerName,
      providerEmail,
      providerPhone: providerPhone ?? null,
      token,
      tokenHash,
      portalUrl,
      status: "active",
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedBy: request.auth.uid,
      revokedAt: null,
      revokedBy: null,
      linkedIndividualIds,
      lastAccessedAt: null,
      lastDocumentUploadedAt: null,
      totalDocumentsUploaded: 0,
      documentsThisMonth: 0,
      otpSessions: [],
    };

    const tokenRef = await db.collection("provider_portal_tokens").add(tokenDocData);

    console.log(
      `[providerPortal] Token generated for provider=${providerId} by uid=${request.auth.uid}` +
      (sendEmail ? " (email requested)" : "")
    );

    return {
      success: true,
      token,
      portalUrl,
      tokenId: tokenRef.id,
      alreadyExisted: false,
    };
  }
);

// ─── 2. validateProviderToken (public) ────────────────────────────────────────

export const validateProviderToken = onCall(
  { cors: true },
  async (request) => {
    const { token } = request.data as { token?: string };

    if (!token) {
      return { valid: false, reason: "not_found" };
    }

    const db = admin.firestore();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const snap = await db
      .collection("provider_portal_tokens")
      .where("tokenHash", "==", tokenHash)
      .limit(1)
      .get();

    if (snap.empty) {
      return { valid: false, reason: "not_found" };
    }

    const doc = snap.docs[0];
    const data = doc.data();

    if (data.status !== "active") {
      return { valid: false, reason: "revoked" };
    }

    // Update lastAccessedAt
    await doc.ref.update({ lastAccessedAt: admin.firestore.FieldValue.serverTimestamp() });

    return {
      valid: true,
      providerName: data.providerName as string,
      providerEmail: data.providerEmail as string,
      providerPhone: (data.providerPhone as string | null) ?? null,
      providerId: data.providerId as string,
      tokenId: doc.id,
      linkedIndividualIds: (data.linkedIndividualIds as string[]) ?? [],
      orgId: data.orgId as string,
    };
  }
);

// ─── 3. sendProviderOTP (public) ──────────────────────────────────────────────

export const sendProviderOTP = onCall(
  { cors: true },
  async (request) => {
    const { tokenId, method } = request.data as {
      tokenId?: string;
      method?: "email" | "sms";
    };

    if (!tokenId || !method) {
      throw new HttpsError("invalid-argument", "tokenId and method are required.");
    }

    const db = admin.firestore();
    const tokenRef = db.collection("provider_portal_tokens").doc(tokenId);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) {
      throw new HttpsError("not-found", "Token not found.");
    }

    const tokenDoc = tokenSnap.data()!;

    if (tokenDoc.status !== "active") {
      throw new HttpsError("failed-precondition", "Token is not active.");
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // +10 minutes

    const updatePayload: Record<string, unknown> = {
      otpHash,
      otpExpiresAt,
      otpAttempts: 0,
    };

    const providerPhone = (tokenDoc.providerPhone as string | null) ?? null;
    const providerEmail = (tokenDoc.providerEmail as string) ?? "";

    if (method === "sms" && providerPhone) {
      try {
        const client = getTwilioClient();
        await client.messages.create({
          body: `Your CaseManagement.AI verification code: ${otp}. Valid 10 minutes.`,
          from: TWILIO_FROM_NUMBER,
          to: providerPhone,
        });
        console.log(`[providerPortal] OTP SMS sent to ${maskPhone(providerPhone)}`);
      } catch (twilioErr) {
        console.error("[providerPortal] Twilio SMS error:", twilioErr);
        throw new HttpsError("internal", "Failed to send SMS. Please try email instead.");
      }
    } else if (method === "email") {
      // Production: send via SendGrid. For now, store plaintext for demo purposes.
      updatePayload.otpPlaintext = otp;
      console.log(
        `[providerPortal] OTP for email demo stored (production would send via SendGrid to ${maskEmail(providerEmail)})`
      );
    }

    await tokenRef.update(updatePayload);

    return {
      success: true,
      maskedEmail: maskEmail(providerEmail),
      maskedPhone: providerPhone ? maskPhone(providerPhone) : null,
    };
  }
);

// ─── 4. verifyProviderOTP (public) ────────────────────────────────────────────

export const verifyProviderOTP = onCall(
  { cors: true },
  async (request) => {
    const { tokenId, otp } = request.data as {
      tokenId?: string;
      otp?: string;
    };

    if (!tokenId || !otp) {
      throw new HttpsError("invalid-argument", "tokenId and otp are required.");
    }

    const db = admin.firestore();
    const tokenRef = db.collection("provider_portal_tokens").doc(tokenId);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) {
      throw new HttpsError("not-found", "Token not found.");
    }

    const tokenDoc = tokenSnap.data()!;
    const attempts: number = (tokenDoc.otpAttempts as number) ?? 0;
    const expiresAt: Date | null = tokenDoc.otpExpiresAt
      ? new Date((tokenDoc.otpExpiresAt as admin.firestore.Timestamp).toDate
          ? (tokenDoc.otpExpiresAt as admin.firestore.Timestamp).toDate()
          : tokenDoc.otpExpiresAt as Date)
      : null;

    if (attempts >= 5) {
      return { success: false, error: "too_many_attempts" };
    }

    if (!expiresAt || Date.now() > expiresAt.getTime()) {
      return { success: false, error: "otp_expired" };
    }

    const submittedHash = crypto.createHash("sha256").update(otp).digest("hex");

    if (submittedHash !== tokenDoc.otpHash) {
      await tokenRef.update({
        otpAttempts: admin.firestore.FieldValue.increment(1),
      });
      return { success: false, error: "invalid_otp" };
    }

    // OTP is valid — issue a session token
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days

    const newSession: OtpSession = {
      sessionToken,
      verifiedAt: new Date(),
      expiresAt: sessionExpiresAt,
      userAgent: null,
    };

    await tokenRef.update({
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      otpPlaintext: admin.firestore.FieldValue.delete(),
      otpSessions: admin.firestore.FieldValue.arrayUnion(newSession),
    });

    return {
      success: true,
      sessionToken,
      expiresAt: sessionExpiresAt.toISOString(),
    };
  }
);

// ─── 5. validateProviderSession (public) ──────────────────────────────────────

export const validateProviderSession = onCall(
  { cors: true },
  async (request) => {
    const { tokenId, sessionToken } = request.data as {
      tokenId?: string;
      sessionToken?: string;
    };

    if (!tokenId || !sessionToken) {
      return { valid: false };
    }

    const db = admin.firestore();
    const tokenSnap = await db.collection("provider_portal_tokens").doc(tokenId).get();

    if (!tokenSnap.exists) return { valid: false };

    const tokenDoc = tokenSnap.data()!;
    if (tokenDoc.status !== "active") return { valid: false };

    const now = Date.now();
    const sessions: OtpSession[] = Array.isArray(tokenDoc.otpSessions) ? tokenDoc.otpSessions : [];
    const valid = sessions.some(
      (s) => s.sessionToken === sessionToken && new Date(s.expiresAt).getTime() > now
    );

    return { valid };
  }
);

// ─── 6. getProviderPortalData (public, session) ───────────────────────────────

export const getProviderPortalData = onCall(
  { cors: true },
  async (request) => {
    const { tokenId, sessionToken } = request.data as {
      tokenId?: string;
      sessionToken?: string;
    };

    if (!tokenId || !sessionToken) {
      throw new HttpsError("invalid-argument", "tokenId and sessionToken are required.");
    }

    const db = admin.firestore();
    const { tokenDoc } = await requireValidSession(db, tokenId, sessionToken);

    const linkedIndividualIds: string[] = Array.isArray(tokenDoc.linkedIndividualIds)
      ? tokenDoc.linkedIndividualIds
      : [];

    // Load individuals
    const linkedIndividuals: Array<{
      id: string;
      firstName: string;
      lastName: string;
      programName: string;
    }> = [];

    if (linkedIndividualIds.length > 0) {
      // Firestore `in` supports up to 30 items; chunk if needed
      const chunks: string[][] = [];
      for (let i = 0; i < linkedIndividualIds.length; i += 30) {
        chunks.push(linkedIndividualIds.slice(i, i + 30));
      }
      for (const chunk of chunks) {
        const indSnaps = await db
          .collection("individuals")
          .where(admin.firestore.FieldPath.documentId(), "in", chunk)
          .get();
        for (const d of indSnaps.docs) {
          const ind = d.data();
          linkedIndividuals.push({
            id: d.id,
            firstName: (ind.firstName as string) ?? "",
            lastName: (ind.lastName as string) ?? "",
            programName: (ind.programName as string) ?? (ind.program as string) ?? "",
          });
        }
      }
    }

    // Last 5 uploads by this provider
    const recentUploadsSnap = await db
      .collection("managed_documents")
      .where("providerId", "==", tokenDoc.providerId as string)
      .orderBy("created_at", "desc")
      .limit(5)
      .get();

    const recentUploads = recentUploadsSnap.docs.map((d) => {
      const doc = d.data();
      return {
        id: d.id,
        name: doc.name as string,
        documentType: (doc.documentType as string) ?? null,
        individualId: doc.individualId as string,
        created_at_iso: (doc.created_at_iso as string) ?? null,
        size: (doc.size as number) ?? 0,
        mime: (doc.mime as string) ?? "",
        scanStatus: (doc.scanStatus as string) ?? null,
        aiAlertCount: (doc.aiAlertCount as number) ?? 0,
      };
    });

    return {
      providerName: tokenDoc.providerName as string,
      linkedIndividuals,
      recentUploads,
    };
  }
);

// ─── 7. providerPortalUpload (public, session) ────────────────────────────────

export const providerPortalUpload = onCall(
  { cors: true },
  async (request) => {
    const {
      tokenId,
      sessionToken,
      individualId,
      documentType,
      documentDate,
      providerNotes,
      fileName,
      fileData,
      mimeType,
      fileSize,
    } = request.data as {
      tokenId?: string;
      sessionToken?: string;
      individualId?: string;
      documentType?: string;
      documentDate?: string;
      providerNotes?: string;
      fileName?: string;
      fileData?: string;
      mimeType?: string;
      fileSize?: number;
    };

    if (!tokenId || !sessionToken) {
      throw new HttpsError("invalid-argument", "tokenId and sessionToken are required.");
    }
    if (!individualId || !fileName || !fileData || !mimeType) {
      throw new HttpsError("invalid-argument", "individualId, fileName, fileData, and mimeType are required.");
    }

    const db = admin.firestore();
    const { tokenDoc, tokenRef } = await requireValidSession(db, tokenId, sessionToken);

    // Validate individual is linked to this token
    const linkedIndividualIds: string[] = Array.isArray(tokenDoc.linkedIndividualIds)
      ? tokenDoc.linkedIndividualIds
      : [];

    if (!linkedIndividualIds.includes(individualId)) {
      throw new HttpsError(
        "permission-denied",
        "This individual is not linked to your provider portal."
      );
    }

    const providerName = (tokenDoc.providerName as string) ?? "Provider";
    const organizationId = (tokenDoc.orgId as string) ?? "";
    const providerId = (tokenDoc.providerId as string) ?? "";

    // Determine target folder
    const targetFolderName = folderForDocumentType(documentType ?? "Other");
    let folderId = "";

    if (targetFolderName) {
      const folderSnap = await db
        .collection("managed_documents")
        .where("name", "==", targetFolderName)
        .where("individualId", "==", individualId)
        .where("type", "==", "folder")
        .limit(1)
        .get();

      if (!folderSnap.empty) {
        folderId = folderSnap.docs[0].id;
      }
    }

    // Create document record
    const now = new Date().toISOString();
    const docRef = await db.collection("managed_documents").add({
      individualId,
      organizationId,
      name: fileName,
      type: "file",
      parent_id: folderId,
      created_at_iso: now,
      updated_at_iso: now,
      created_by: providerName,
      starred: false,
      size: fileSize ?? 0,
      mime: mimeType,
      data_url: fileData,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      // Provider upload metadata
      uploadedBy: "provider",
      uploaderName: providerName,
      uploaderType: "provider",
      providerId,
      providerPortalTokenId: tokenId,
      documentType: documentType ?? "Other",
      documentDate: documentDate ?? null,
      providerNotes: providerNotes ?? "",
      // AI scanning state — Firestore trigger picks this up automatically
      aiScanned: false,
      aiAlertCount: 0,
      aiScanSummary: null,
      scanStatus: "pending",
    });

    // Update token stats
    await tokenRef.update({
      lastDocumentUploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      totalDocumentsUploaded: admin.firestore.FieldValue.increment(1),
      documentsThisMonth: admin.firestore.FieldValue.increment(1),
    });

    // Find assigned case manager for notification
    let assignedCaseManagerId: string | null = null;
    try {
      const indSnap = await db.collection("individuals").doc(individualId).get();
      if (indSnap.exists) {
        const ind = indSnap.data()!;
        assignedCaseManagerId =
          (ind.assignedCaseManagerId as string | undefined) ??
          (ind.case_manager_id as string | undefined) ??
          null;
      }
    } catch (indErr) {
      console.warn("[providerPortal] Could not load individual for notification:", indErr);
    }

    // Write in-app notification
    if (assignedCaseManagerId) {
      await db.collection("notifications").add({
        uid: assignedCaseManagerId,
        organizationId,
        type: "provider_document_uploaded",
        title: `${providerName} uploaded a document`,
        body: `${providerName} uploaded "${fileName}" for individual ${individualId}. Type: ${documentType ?? "Other"}.`,
        href: `/people/${individualId}/documents`,
        read: false,
        dismissed: false,
        severity: "info",
        source: "provider_portal",
        documentId: docRef.id,
        providerId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    console.log(
      `[providerPortal] Document uploaded by provider=${providerId} for individual=${individualId} docId=${docRef.id}`
    );

    return { success: true, documentId: docRef.id };
  }
);

// ─── 8. revokeProviderPortalToken (auth required) ─────────────────────────────

export const revokeProviderPortalToken = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const { tokenId } = request.data as { tokenId?: string };

    if (!tokenId) {
      throw new HttpsError("invalid-argument", "tokenId is required.");
    }

    const db = admin.firestore();
    const tokenRef = db.collection("provider_portal_tokens").doc(tokenId);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) {
      throw new HttpsError("not-found", "Token not found.");
    }

    const tokenDoc = tokenSnap.data()!;

    // Verify the token belongs to the caller's org
    const callerOrgId =
      (request.auth.token.organizationId as string | undefined) ??
      (request.auth.token.orgId as string | undefined) ?? "";

    if (callerOrgId && tokenDoc.orgId !== callerOrgId) {
      throw new HttpsError("permission-denied", "Token does not belong to your organization.");
    }

    await tokenRef.update({
      status: "revoked",
      revokedAt: admin.firestore.FieldValue.serverTimestamp(),
      revokedBy: request.auth.uid,
    });

    // Write audit log
    await db.collection("audit_logs").add({
      action: "provider_portal_token_revoked",
      resourceType: "provider_portal_token",
      resourceId: tokenId,
      performedBy: request.auth.uid,
      organizationId: callerOrgId || tokenDoc.orgId,
      providerId: tokenDoc.providerId as string,
      providerName: tokenDoc.providerName as string,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `[providerPortal] Token ${tokenId} revoked by uid=${request.auth.uid}`
    );

    return { success: true };
  }
);

// ─── 9. getProviderPortalInfo (auth required) ─────────────────────────────────

export const getProviderPortalInfo = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const { providerId } = request.data as { providerId?: string };

    if (!providerId) {
      throw new HttpsError("invalid-argument", "providerId is required.");
    }

    const db = admin.firestore();

    // Get active token
    const tokenSnap = await db
      .collection("provider_portal_tokens")
      .where("providerId", "==", providerId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    const hasActiveToken = !tokenSnap.empty;
    let tokenData: Record<string, unknown> | null = null;

    if (hasActiveToken) {
      const t = tokenSnap.docs[0].data();
      tokenData = {
        tokenId: tokenSnap.docs[0].id,
        portalUrl: t.portalUrl as string,
        generatedAt: t.generatedAt,
        linkedIndividualIds: (t.linkedIndividualIds as string[]) ?? [],
        lastAccessedAt: t.lastAccessedAt ?? null,
        lastDocumentUploadedAt: t.lastDocumentUploadedAt ?? null,
        totalDocumentsUploaded: (t.totalDocumentsUploaded as number) ?? 0,
        documentsThisMonth: (t.documentsThisMonth as number) ?? 0,
        providerName: t.providerName as string,
        providerEmail: t.providerEmail as string,
        providerPhone: (t.providerPhone as string | null) ?? null,
      };
    }

    // Get recent uploads
    const uploadsSnap = await db
      .collection("managed_documents")
      .where("providerId", "==", providerId)
      .orderBy("created_at", "desc")
      .limit(10)
      .get();

    const recentUploads = uploadsSnap.docs.map((d) => {
      const doc = d.data();
      return {
        id: d.id,
        name: doc.name as string,
        documentType: (doc.documentType as string) ?? null,
        individualId: doc.individualId as string,
        created_at_iso: (doc.created_at_iso as string) ?? null,
        size: (doc.size as number) ?? 0,
        mime: (doc.mime as string) ?? "",
        scanStatus: (doc.scanStatus as string) ?? null,
        aiAlertCount: (doc.aiAlertCount as number) ?? 0,
        providerNotes: (doc.providerNotes as string) ?? "",
      };
    });

    return {
      hasActiveToken,
      tokenData,
      recentUploads,
    };
  }
);
