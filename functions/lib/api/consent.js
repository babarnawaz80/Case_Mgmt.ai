"use strict";
/**
 * consent.ts — Cloud Functions for electronic consent management.
 *
 * Functions:
 *   sendConsentRequest   — Create encrypted token, send SMS via Twilio
 *   checkConsentToken    — Validate token without revealing consent data
 *   sendConsentOTP       — Generate & send OTP to recipient phone
 *   verifyConsentOTP     — Validate OTP, return consent data for display
 *   submitConsentSignature — Record signed consent, mark token used, send confirmation SMS
 *   cleanupExpiredConsents — Scheduled: mark expired tokens/consents daily
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
exports.cleanupExpiredConsents = exports.submitConsentSignature = exports.verifyConsentOTP = exports.sendConsentOTP = exports.checkConsentToken = exports.sendConsentRequest = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const crypto = __importStar(require("crypto"));
const db = admin.firestore();
// ─── Environment config ───────────────────────────────────────────────────────
// Set via: firebase functions:secrets:set TWILIO_ACCOUNT_SID etc. (recommended)
// OR via functions/.env for local dev
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
// ─── Helper: normalise to E.164 ───────────────────────────────────────────────
function toE164(phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10)
        return `+1${digits}`;
    if (digits.length === 11 && digits[0] === "1")
        return `+${digits}`;
    if (digits.startsWith("+"))
        return phone;
    return `+${digits}`;
}
// ─── 1. sendConsentRequest ────────────────────────────────────────────────────
exports.sendConsentRequest = (0, https_1.onCall)(async (request) => {
    const { individualId, consentId, recipientPhone, recipientName, consentType, individualName, caseManagerName, } = request.data;
    if (!individualId || !consentId || !recipientPhone) {
        throw new https_1.HttpsError("invalid-argument", "Missing required fields.");
    }
    const phone = toE164(recipientPhone);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    // Generate secure token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    // Mask phone for display (last 4 digits)
    const last4 = phone.slice(-4);
    const maskedPhone = `***-***-${last4}`;
    // Save token document
    await db.collection("consent_tokens").add({
        tokenHash,
        consentId,
        individualId,
        recipientPhone: phone,
        recipientName,
        consentType,
        maskedPhone,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        used: false,
        otpVerified: false,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const consentLink = `${APP_BASE_URL}/consent/${rawToken}`;
    // Send SMS via Twilio
    try {
        const client = getTwilioClient();
        const message = await client.messages.create({
            body: `${caseManagerName} has sent a consent request for ${individualName}. ` +
                `Consent type: ${consentType}. ` +
                `Click to review and sign: ${consentLink} ` +
                `This link expires in 48 hours. Reply STOP to opt out.`,
            from: TWILIO_FROM_NUMBER,
            to: phone,
        });
        // Update consent record
        await db
            .collection("individuals")
            .doc(individualId)
            .collection("consents")
            .doc(consentId)
            .update({
            status: "pending_signature",
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            sentVia: "sms",
            twilioMessageSid: message.sid,
            linkExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, messageSid: message.sid };
    }
    catch (err) {
        // Mark send as failed
        await db
            .collection("individuals")
            .doc(individualId)
            .collection("consents")
            .doc(consentId)
            .update({ status: "sent_failed", updated_at: admin.firestore.FieldValue.serverTimestamp() })
            .catch(() => { });
        if (err.code === 21211 || err.code === 21614) {
            return { success: false, error: "INVALID_PHONE" };
        }
        return { success: false, error: "SMS_FAILED", message: err.message };
    }
});
// ─── 2. checkConsentToken ─────────────────────────────────────────────────────
// Lightweight: validates the token without returning any consent data.
exports.checkConsentToken = (0, https_1.onCall)(async (request) => {
    var _a;
    const { token } = request.data;
    if (!token)
        throw new https_1.HttpsError("invalid-argument", "Token is required.");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const snap = await db
        .collection("consent_tokens")
        .where("tokenHash", "==", tokenHash)
        .limit(1)
        .get();
    if (snap.empty)
        return { status: "invalid" };
    const data = snap.docs[0].data();
    if (data.used)
        return { status: "used" };
    if (data.expiresAt.toDate() < new Date())
        return { status: "expired" };
    return {
        status: "valid",
        maskedPhone: (_a = data.maskedPhone) !== null && _a !== void 0 ? _a : `***-***-${data.recipientPhone.slice(-4)}`,
        recipientPhone: data.recipientPhone,
    };
});
// ─── 3. sendConsentOTP ───────────────────────────────────────────────────────
exports.sendConsentOTP = (0, https_1.onCall)(async (request) => {
    const { token, phone } = request.data;
    if (!token || !phone)
        throw new https_1.HttpsError("invalid-argument", "Token and phone are required.");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const snap = await db
        .collection("consent_tokens")
        .where("tokenHash", "==", tokenHash)
        .where("used", "==", false)
        .limit(1)
        .get();
    if (snap.empty)
        throw new https_1.HttpsError("not-found", "Invalid or expired link.");
    const tokenData = snap.docs[0].data();
    if (tokenData.expiresAt.toDate() < new Date()) {
        throw new https_1.HttpsError("deadline-exceeded", "This link has expired.");
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await snap.docs[0].ref.update({
        otpHash,
        otpExpiresAt: admin.firestore.Timestamp.fromDate(otpExpiresAt),
        otpAttempts: 0,
    });
    const client = getTwilioClient();
    await client.messages.create({
        body: `Your CaseManagement.AI verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
        from: TWILIO_FROM_NUMBER,
        to: phone,
    });
    return { success: true };
});
// ─── 4. verifyConsentOTP ─────────────────────────────────────────────────────
exports.verifyConsentOTP = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e, _f;
    const { token, otp } = request.data;
    if (!token || !otp)
        throw new https_1.HttpsError("invalid-argument", "Token and OTP are required.");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const snap = await db
        .collection("consent_tokens")
        .where("tokenHash", "==", tokenHash)
        .where("used", "==", false)
        .limit(1)
        .get();
    if (snap.empty)
        throw new https_1.HttpsError("not-found", "Invalid link.");
    const tokenDoc = snap.docs[0];
    const tokenData = tokenDoc.data();
    if (((_a = tokenData.otpAttempts) !== null && _a !== void 0 ? _a : 0) >= 3) {
        throw new https_1.HttpsError("resource-exhausted", "Too many attempts. Request a new code.");
    }
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    if (otpHash !== tokenData.otpHash) {
        await tokenDoc.ref.update({
            otpAttempts: admin.firestore.FieldValue.increment(1),
        });
        throw new https_1.HttpsError("unauthenticated", "Incorrect code.");
    }
    if (!tokenData.otpExpiresAt || tokenData.otpExpiresAt.toDate() < new Date()) {
        throw new https_1.HttpsError("deadline-exceeded", "Code expired. Request a new one.");
    }
    await tokenDoc.ref.update({
        otpVerified: true,
        otpVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Load consent and individual documents
    const consentDoc = await db
        .collection("individuals")
        .doc(tokenData.individualId)
        .collection("consents")
        .doc(tokenData.consentId)
        .get();
    const individualDoc = await db.collection("individuals").doc(tokenData.individualId).get();
    const indData = (_b = individualDoc.data()) !== null && _b !== void 0 ? _b : {};
    const indFirst = (_d = (_c = indData.first_name) !== null && _c !== void 0 ? _c : indData.firstName) !== null && _d !== void 0 ? _d : "";
    const indLast = (_f = (_e = indData.last_name) !== null && _e !== void 0 ? _e : indData.lastName) !== null && _f !== void 0 ? _f : "";
    return {
        success: true,
        consent: consentDoc.data(),
        individualName: `${indFirst} ${indLast}`.trim(),
        consentId: tokenData.consentId,
        individualId: tokenData.individualId,
        tokenDocId: tokenDoc.id,
        recipientName: tokenData.recipientName,
        recipientPhone: tokenData.recipientPhone,
    };
});
// ─── 5. submitConsentSignature ────────────────────────────────────────────────
exports.submitConsentSignature = (0, https_1.onCall)(async (request) => {
    const { token, tokenDocId, signatureData, signatureType, signerName, signerRelationship, ipAddress, userAgent, } = request.data;
    if (!token || !tokenDocId || !signatureData || !signerName) {
        throw new https_1.HttpsError("invalid-argument", "Missing required fields.");
    }
    const tokenDoc = await db.collection("consent_tokens").doc(tokenDocId).get();
    if (!tokenDoc.exists)
        throw new https_1.HttpsError("not-found", "Token not found.");
    const tokenData = tokenDoc.data();
    if (!tokenData.otpVerified || tokenData.used) {
        throw new https_1.HttpsError("permission-denied", "Unauthorized.");
    }
    // Verify token hash matches
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (tokenHash !== tokenData.tokenHash) {
        throw new https_1.HttpsError("permission-denied", "Invalid token.");
    }
    const signedAt = new Date();
    // Update consent record as signed
    await db
        .collection("individuals")
        .doc(tokenData.individualId)
        .collection("consents")
        .doc(tokenData.consentId)
        .update({
        status: "signed",
        signedAt: admin.firestore.Timestamp.fromDate(signedAt),
        signedBy: signerName,
        signerRelationship,
        signatureType,
        signatureData: signatureData.slice(0, 50000), // cap base64 size
        signerPhone: tokenData.recipientPhone,
        ipAddress,
        userAgent,
        verificationMethod: "sms_otp",
        auditTrail: {
            linkCreatedAt: tokenData.createdAt,
            otpVerifiedAt: tokenData.otpVerifiedAt,
            signedAt: admin.firestore.Timestamp.fromDate(signedAt),
            signerName,
            signerPhone: tokenData.recipientPhone,
            ipAddress,
        },
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Mark token as used
    await tokenDoc.ref.update({
        used: true,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Send confirmation SMS
    try {
        const client = getTwilioClient();
        await client.messages.create({
            body: `Thank you, ${signerName}. Your consent for "${tokenData.consentType}" has been recorded successfully. ` +
                `Signed: ${signedAt.toLocaleDateString()}. Keep this message for your records.`,
            from: TWILIO_FROM_NUMBER,
            to: tokenData.recipientPhone,
        });
    }
    catch (_a) {
        // Non-fatal — consent is already recorded
    }
    return { success: true, signedAt: signedAt.toISOString() };
});
// ─── 6. cleanupExpiredConsents (scheduled daily at midnight ET) ───────────────
exports.cleanupExpiredConsents = (0, scheduler_1.onSchedule)({ schedule: "0 0 * * *", timeZone: "America/New_York" }, async () => {
    const now = new Date();
    const expiredSnap = await db
        .collection("consent_tokens")
        .where("expiresAt", "<", admin.firestore.Timestamp.fromDate(now))
        .where("used", "==", false)
        .get();
    if (expiredSnap.empty) {
        console.log("[cleanupExpiredConsents] No expired tokens found.");
        return;
    }
    const batch = db.batch();
    for (const tokenDoc of expiredSnap.docs) {
        const td = tokenDoc.data();
        batch.update(tokenDoc.ref, { used: true, expiredCleanedUp: true });
        const consentRef = db
            .collection("individuals")
            .doc(td.individualId)
            .collection("consents")
            .doc(td.consentId);
        batch.update(consentRef, { status: "expired", updated_at: admin.firestore.FieldValue.serverTimestamp() });
    }
    await batch.commit();
    console.log(`[cleanupExpiredConsents] Cleaned up ${expiredSnap.size} expired tokens.`);
});
//# sourceMappingURL=consent.js.map