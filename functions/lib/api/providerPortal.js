"use strict";
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
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProviderPortalInfo = exports.revokeProviderPortalToken = exports.providerPortalUpload = exports.getProviderPortalData = exports.validateProviderSession = exports.verifyProviderOTP = exports.sendProviderOTP = exports.validateProviderToken = exports.generateProviderPortalToken = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const crypto = __importStar(require("crypto"));
// ─── Environment ──────────────────────────────────────────────────────────────
const TWILIO_ACCOUNT_SID = (_a = process.env.TWILIO_ACCOUNT_SID) !== null && _a !== void 0 ? _a : "";
const TWILIO_AUTH_TOKEN = (_b = process.env.TWILIO_AUTH_TOKEN) !== null && _b !== void 0 ? _b : "";
const TWILIO_FROM_NUMBER = (_c = process.env.TWILIO_FROM_NUMBER) !== null && _c !== void 0 ? _c : "";
const APP_BASE_URL = (_d = process.env.APP_BASE_URL) !== null && _d !== void 0 ? _d : "https://app.casemanagement.ai";
function getTwilioClient() {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        throw new https_1.HttpsError("failed-precondition", "Twilio credentials not configured.");
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const twilio = require("twilio");
    return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
function maskEmail(email) {
    const atIdx = email.indexOf("@");
    if (atIdx <= 1)
        return "***@***";
    return `${email[0]}***${email[atIdx - 1]}${email.slice(atIdx)}`;
}
function maskPhone(phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 4)
        return "***-***-****";
    return `***-***-${digits.slice(-4)}`;
}
/** Determine the target folder name from a document type string. */
function folderForDocumentType(documentType) {
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
async function requireValidSession(db, tokenId, sessionToken) {
    const tokenRef = db.collection("provider_portal_tokens").doc(tokenId);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) {
        throw new https_1.HttpsError("not-found", "Token not found.");
    }
    const tokenDoc = tokenSnap.data();
    if (tokenDoc.status !== "active") {
        throw new https_1.HttpsError("permission-denied", "Token is no longer active.");
    }
    const now = Date.now();
    const sessions = Array.isArray(tokenDoc.otpSessions) ? tokenDoc.otpSessions : [];
    const validSession = sessions.find((s) => s.sessionToken === sessionToken && new Date(s.expiresAt).getTime() > now);
    if (!validSession) {
        throw new https_1.HttpsError("unauthenticated", "Invalid or expired session.");
    }
    return { tokenDoc, tokenRef };
}
// ─── 1. generateProviderPortalToken (auth required) ───────────────────────────
exports.generateProviderPortalToken = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const { providerId, providerName, providerEmail, providerPhone, sendEmail, } = request.data;
    if (!providerId || !providerName || !providerEmail) {
        throw new https_1.HttpsError("invalid-argument", "providerId, providerName, and providerEmail are required.");
    }
    const db = admin.firestore();
    const orgId = (_b = (_a = request.auth.token.organizationId) !== null && _a !== void 0 ? _a : request.auth.token.orgId) !== null && _b !== void 0 ? _b : "";
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
            token: existingData.token,
            portalUrl: existingData.portalUrl,
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
    const linkedIndividualIds = linkedSnap.docs.map((d) => d.data().individualId).filter(Boolean);
    const tokenDocData = {
        tenantId: orgId,
        orgId,
        providerId,
        providerName,
        providerEmail,
        providerPhone: providerPhone !== null && providerPhone !== void 0 ? providerPhone : null,
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
    console.log(`[providerPortal] Token generated for provider=${providerId} by uid=${request.auth.uid}` +
        (sendEmail ? " (email requested)" : ""));
    return {
        success: true,
        token,
        portalUrl,
        tokenId: tokenRef.id,
        alreadyExisted: false,
    };
});
// ─── 2. validateProviderToken (public) ────────────────────────────────────────
exports.validateProviderToken = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b;
    const { token } = request.data;
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
        providerName: data.providerName,
        providerEmail: data.providerEmail,
        providerPhone: (_a = data.providerPhone) !== null && _a !== void 0 ? _a : null,
        providerId: data.providerId,
        tokenId: doc.id,
        linkedIndividualIds: (_b = data.linkedIndividualIds) !== null && _b !== void 0 ? _b : [],
        orgId: data.orgId,
    };
});
// ─── 3. sendProviderOTP (public) ──────────────────────────────────────────────
exports.sendProviderOTP = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b;
    const { tokenId, method } = request.data;
    if (!tokenId || !method) {
        throw new https_1.HttpsError("invalid-argument", "tokenId and method are required.");
    }
    const db = admin.firestore();
    const tokenRef = db.collection("provider_portal_tokens").doc(tokenId);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) {
        throw new https_1.HttpsError("not-found", "Token not found.");
    }
    const tokenDoc = tokenSnap.data();
    if (tokenDoc.status !== "active") {
        throw new https_1.HttpsError("failed-precondition", "Token is not active.");
    }
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // +10 minutes
    const updatePayload = {
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
    };
    const providerPhone = (_a = tokenDoc.providerPhone) !== null && _a !== void 0 ? _a : null;
    const providerEmail = (_b = tokenDoc.providerEmail) !== null && _b !== void 0 ? _b : "";
    if (method === "sms" && providerPhone) {
        try {
            const client = getTwilioClient();
            await client.messages.create({
                body: `Your CaseManagement.AI verification code: ${otp}. Valid 10 minutes.`,
                from: TWILIO_FROM_NUMBER,
                to: providerPhone,
            });
            console.log(`[providerPortal] OTP SMS sent to ${maskPhone(providerPhone)}`);
        }
        catch (twilioErr) {
            console.error("[providerPortal] Twilio SMS error:", twilioErr);
            throw new https_1.HttpsError("internal", "Failed to send SMS. Please try email instead.");
        }
    }
    else if (method === "email") {
        // Production: send via SendGrid. For now, store plaintext for demo purposes.
        updatePayload.otpPlaintext = otp;
        console.log(`[providerPortal] OTP for email demo stored (production would send via SendGrid to ${maskEmail(providerEmail)})`);
    }
    await tokenRef.update(updatePayload);
    return {
        success: true,
        maskedEmail: maskEmail(providerEmail),
        maskedPhone: providerPhone ? maskPhone(providerPhone) : null,
    };
});
// ─── 4. verifyProviderOTP (public) ────────────────────────────────────────────
exports.verifyProviderOTP = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a;
    const { tokenId, otp } = request.data;
    if (!tokenId || !otp) {
        throw new https_1.HttpsError("invalid-argument", "tokenId and otp are required.");
    }
    const db = admin.firestore();
    const tokenRef = db.collection("provider_portal_tokens").doc(tokenId);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) {
        throw new https_1.HttpsError("not-found", "Token not found.");
    }
    const tokenDoc = tokenSnap.data();
    const attempts = (_a = tokenDoc.otpAttempts) !== null && _a !== void 0 ? _a : 0;
    const expiresAt = tokenDoc.otpExpiresAt
        ? new Date(tokenDoc.otpExpiresAt.toDate
            ? tokenDoc.otpExpiresAt.toDate()
            : tokenDoc.otpExpiresAt)
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
    const newSession = {
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
});
// ─── 5. validateProviderSession (public) ──────────────────────────────────────
exports.validateProviderSession = (0, https_1.onCall)({ cors: true }, async (request) => {
    const { tokenId, sessionToken } = request.data;
    if (!tokenId || !sessionToken) {
        return { valid: false };
    }
    const db = admin.firestore();
    const tokenSnap = await db.collection("provider_portal_tokens").doc(tokenId).get();
    if (!tokenSnap.exists)
        return { valid: false };
    const tokenDoc = tokenSnap.data();
    if (tokenDoc.status !== "active")
        return { valid: false };
    const now = Date.now();
    const sessions = Array.isArray(tokenDoc.otpSessions) ? tokenDoc.otpSessions : [];
    const valid = sessions.some((s) => s.sessionToken === sessionToken && new Date(s.expiresAt).getTime() > now);
    return { valid };
});
// ─── 6. getProviderPortalData (public, session) ───────────────────────────────
exports.getProviderPortalData = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b, _c, _d;
    const { tokenId, sessionToken } = request.data;
    if (!tokenId || !sessionToken) {
        throw new https_1.HttpsError("invalid-argument", "tokenId and sessionToken are required.");
    }
    const db = admin.firestore();
    const { tokenDoc } = await requireValidSession(db, tokenId, sessionToken);
    const linkedIndividualIds = Array.isArray(tokenDoc.linkedIndividualIds)
        ? tokenDoc.linkedIndividualIds
        : [];
    // Load individuals
    const linkedIndividuals = [];
    if (linkedIndividualIds.length > 0) {
        // Firestore `in` supports up to 30 items; chunk if needed
        const chunks = [];
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
                    firstName: (_a = ind.firstName) !== null && _a !== void 0 ? _a : "",
                    lastName: (_b = ind.lastName) !== null && _b !== void 0 ? _b : "",
                    programName: (_d = (_c = ind.programName) !== null && _c !== void 0 ? _c : ind.program) !== null && _d !== void 0 ? _d : "",
                });
            }
        }
    }
    // Last 5 uploads by this provider
    const recentUploadsSnap = await db
        .collection("managed_documents")
        .where("providerId", "==", tokenDoc.providerId)
        .orderBy("created_at", "desc")
        .limit(5)
        .get();
    const recentUploads = recentUploadsSnap.docs.map((d) => {
        var _a, _b, _c, _d, _e, _f;
        const doc = d.data();
        return {
            id: d.id,
            name: doc.name,
            documentType: (_a = doc.documentType) !== null && _a !== void 0 ? _a : null,
            individualId: doc.individualId,
            created_at_iso: (_b = doc.created_at_iso) !== null && _b !== void 0 ? _b : null,
            size: (_c = doc.size) !== null && _c !== void 0 ? _c : 0,
            mime: (_d = doc.mime) !== null && _d !== void 0 ? _d : "",
            scanStatus: (_e = doc.scanStatus) !== null && _e !== void 0 ? _e : null,
            aiAlertCount: (_f = doc.aiAlertCount) !== null && _f !== void 0 ? _f : 0,
        };
    });
    return {
        providerName: tokenDoc.providerName,
        linkedIndividuals,
        recentUploads,
    };
});
// ─── 7. providerPortalUpload (public, session) ────────────────────────────────
exports.providerPortalUpload = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b, _c, _d, _e;
    const { tokenId, sessionToken, individualId, documentType, documentDate, providerNotes, fileName, fileData, mimeType, fileSize, } = request.data;
    if (!tokenId || !sessionToken) {
        throw new https_1.HttpsError("invalid-argument", "tokenId and sessionToken are required.");
    }
    if (!individualId || !fileName || !fileData || !mimeType) {
        throw new https_1.HttpsError("invalid-argument", "individualId, fileName, fileData, and mimeType are required.");
    }
    const db = admin.firestore();
    const { tokenDoc, tokenRef } = await requireValidSession(db, tokenId, sessionToken);
    // Validate individual is linked to this token
    const linkedIndividualIds = Array.isArray(tokenDoc.linkedIndividualIds)
        ? tokenDoc.linkedIndividualIds
        : [];
    if (!linkedIndividualIds.includes(individualId)) {
        throw new https_1.HttpsError("permission-denied", "This individual is not linked to your provider portal.");
    }
    const providerName = (_a = tokenDoc.providerName) !== null && _a !== void 0 ? _a : "Provider";
    const organizationId = (_b = tokenDoc.orgId) !== null && _b !== void 0 ? _b : "";
    const providerId = (_c = tokenDoc.providerId) !== null && _c !== void 0 ? _c : "";
    // Determine target folder
    const targetFolderName = folderForDocumentType(documentType !== null && documentType !== void 0 ? documentType : "Other");
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
        size: fileSize !== null && fileSize !== void 0 ? fileSize : 0,
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
        documentType: documentType !== null && documentType !== void 0 ? documentType : "Other",
        documentDate: documentDate !== null && documentDate !== void 0 ? documentDate : null,
        providerNotes: providerNotes !== null && providerNotes !== void 0 ? providerNotes : "",
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
    let assignedCaseManagerId = null;
    try {
        const indSnap = await db.collection("individuals").doc(individualId).get();
        if (indSnap.exists) {
            const ind = indSnap.data();
            assignedCaseManagerId =
                (_e = (_d = ind.assignedCaseManagerId) !== null && _d !== void 0 ? _d : ind.case_manager_id) !== null && _e !== void 0 ? _e : null;
        }
    }
    catch (indErr) {
        console.warn("[providerPortal] Could not load individual for notification:", indErr);
    }
    // Write in-app notification
    if (assignedCaseManagerId) {
        await db.collection("notifications").add({
            uid: assignedCaseManagerId,
            organizationId,
            type: "provider_document_uploaded",
            title: `${providerName} uploaded a document`,
            body: `${providerName} uploaded "${fileName}" for individual ${individualId}. Type: ${documentType !== null && documentType !== void 0 ? documentType : "Other"}.`,
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
    console.log(`[providerPortal] Document uploaded by provider=${providerId} for individual=${individualId} docId=${docRef.id}`);
    return { success: true, documentId: docRef.id };
});
// ─── 8. revokeProviderPortalToken (auth required) ─────────────────────────────
exports.revokeProviderPortalToken = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const { tokenId } = request.data;
    if (!tokenId) {
        throw new https_1.HttpsError("invalid-argument", "tokenId is required.");
    }
    const db = admin.firestore();
    const tokenRef = db.collection("provider_portal_tokens").doc(tokenId);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) {
        throw new https_1.HttpsError("not-found", "Token not found.");
    }
    const tokenDoc = tokenSnap.data();
    // Verify the token belongs to the caller's org
    const callerOrgId = (_b = (_a = request.auth.token.organizationId) !== null && _a !== void 0 ? _a : request.auth.token.orgId) !== null && _b !== void 0 ? _b : "";
    if (callerOrgId && tokenDoc.orgId !== callerOrgId) {
        throw new https_1.HttpsError("permission-denied", "Token does not belong to your organization.");
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
        providerId: tokenDoc.providerId,
        providerName: tokenDoc.providerName,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`[providerPortal] Token ${tokenId} revoked by uid=${request.auth.uid}`);
    return { success: true };
});
// ─── 9. getProviderPortalInfo (auth required) ─────────────────────────────────
exports.getProviderPortalInfo = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b, _c, _d, _e, _f;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const { providerId } = request.data;
    if (!providerId) {
        throw new https_1.HttpsError("invalid-argument", "providerId is required.");
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
    let tokenData = null;
    if (hasActiveToken) {
        const t = tokenSnap.docs[0].data();
        tokenData = {
            tokenId: tokenSnap.docs[0].id,
            portalUrl: t.portalUrl,
            generatedAt: t.generatedAt,
            linkedIndividualIds: (_a = t.linkedIndividualIds) !== null && _a !== void 0 ? _a : [],
            lastAccessedAt: (_b = t.lastAccessedAt) !== null && _b !== void 0 ? _b : null,
            lastDocumentUploadedAt: (_c = t.lastDocumentUploadedAt) !== null && _c !== void 0 ? _c : null,
            totalDocumentsUploaded: (_d = t.totalDocumentsUploaded) !== null && _d !== void 0 ? _d : 0,
            documentsThisMonth: (_e = t.documentsThisMonth) !== null && _e !== void 0 ? _e : 0,
            providerName: t.providerName,
            providerEmail: t.providerEmail,
            providerPhone: (_f = t.providerPhone) !== null && _f !== void 0 ? _f : null,
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
        var _a, _b, _c, _d, _e, _f, _g;
        const doc = d.data();
        return {
            id: d.id,
            name: doc.name,
            documentType: (_a = doc.documentType) !== null && _a !== void 0 ? _a : null,
            individualId: doc.individualId,
            created_at_iso: (_b = doc.created_at_iso) !== null && _b !== void 0 ? _b : null,
            size: (_c = doc.size) !== null && _c !== void 0 ? _c : 0,
            mime: (_d = doc.mime) !== null && _d !== void 0 ? _d : "",
            scanStatus: (_e = doc.scanStatus) !== null && _e !== void 0 ? _e : null,
            aiAlertCount: (_f = doc.aiAlertCount) !== null && _f !== void 0 ? _f : 0,
            providerNotes: (_g = doc.providerNotes) !== null && _g !== void 0 ? _g : "",
        };
    });
    return {
        hasActiveToken,
        tokenData,
        recentUploads,
    };
});
//# sourceMappingURL=providerPortal.js.map