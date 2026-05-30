"use strict";
/**
 * guardianPortal.ts — Cloud Functions for Guardian Portal session management.
 *
 * Functions:
 *   createGuardianPortalSession — Creates or updates a guardian portal session
 *                                  linked to a consent token hash.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGuardianPortalSession = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const crypto = __importStar(require("crypto"));
exports.createGuardianPortalSession = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b;
    const { consentId, token, individualId, guardianName, guardianPhone, tenantId, orgId, } = request.data;
    if (!token || !individualId) {
        throw new https_1.HttpsError("invalid-argument", "Missing required fields.");
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
        const updates = {
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
        guardianName: guardianName !== null && guardianName !== void 0 ? guardianName : "Guardian",
        guardianPhone: guardianPhone !== null && guardianPhone !== void 0 ? guardianPhone : "",
        tenantId: (_a = tenantId !== null && tenantId !== void 0 ? tenantId : orgId) !== null && _a !== void 0 ? _a : "",
        orgId: (_b = orgId !== null && orgId !== void 0 ? orgId : tenantId) !== null && _b !== void 0 ? _b : "",
        otpVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        sessionCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
        sessionExpiresAt: expiresAt,
        lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
        revokedAt: null,
        revokedBy: null,
        consentIds: consentId ? [consentId] : [],
    });
    return { sessionId: ref.id };
});
//# sourceMappingURL=guardianPortal.js.map