"use strict";
// Staff User Management — Cloud Function
// CaseManagement.AI
//
// Uses Firebase Admin SDK so we can look up existing Auth accounts by email.
// This prevents the "EMAIL_EXISTS" error when re-adding staff who were
// previously deleted from Firestore but still have Firebase Auth accounts.
//
// POST /api/staff/create-or-update
// Body: { email, firstName, lastName, role, organizationId }
// Auth: Bearer <admin idToken> required
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
exports.createOrUpdateStaffUser = createOrUpdateStaffUser;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const db = admin.firestore();
/** Verify the caller is an authenticated admin of the given org */
async function verifyAdminCaller(req) {
    var _a, _b;
    const authHeader = (_a = req.headers.authorization) !== null && _a !== void 0 ? _a : "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken)
        return null;
    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        const userDoc = await db.doc(`users/${decoded.uid}`).get();
        if (!userDoc.exists)
            return null;
        const data = userDoc.data();
        const role = (_b = data.role) !== null && _b !== void 0 ? _b : "";
        if (role !== "admin" && role !== "platform_admin")
            return null;
        return { uid: decoded.uid, role };
    }
    catch (_c) {
        return null;
    }
}
/**
 * POST /api/staff/create-or-update
 *
 * Creates a new Firebase Auth + Firestore user, OR if the Firebase Auth account
 * already exists for that email, just creates/updates the Firestore profile.
 * Returns { uid, isNew, tempPassword? }
 */
async function createOrUpdateStaffUser(req, res) {
    var _a, _b;
    // CORS preflight
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
    }
    // Auth check
    const caller = await verifyAdminCaller(req);
    if (!caller) {
        res.status(401).json({ error: "Unauthorized. Admin role required." });
        return;
    }
    const { email, firstName, lastName, role, organizationId } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
    if (!email || !firstName || !lastName || !role || !organizationId) {
        res.status(400).json({ error: "Missing required fields: email, firstName, lastName, role, organizationId" });
        return;
    }
    const trimEmail = email.trim().toLowerCase();
    const trimFirst = firstName.trim();
    const trimLast = lastName.trim();
    const displayName = `${trimFirst} ${trimLast}`;
    try {
        let uid;
        let isNew = false;
        let tempPassword;
        // Try to find existing Firebase Auth account
        try {
            const existing = await admin.auth().getUserByEmail(trimEmail);
            uid = existing.uid;
            // Account exists — just reconnect to this org (no new password)
        }
        catch (notFound) {
            if (notFound.code !== "auth/user-not-found")
                throw notFound;
            // Account doesn't exist — create it
            tempPassword = generateTempPassword();
            const created = await admin.auth().createUser({
                email: trimEmail,
                password: tempPassword,
                displayName,
            });
            uid = created.uid;
            isNew = true;
        }
        // Create or overwrite the Firestore users/{uid} document
        await db.doc(`users/${uid}`).set(Object.assign({ uid, email: trimEmail, firstName: trimFirst, lastName: trimLast, displayName,
            role,
            organizationId, status: "active", isActive: true, mustChangePw: isNew, caseload: [], updatedAt: firestore_1.FieldValue.serverTimestamp() }, (isNew ? { createdAt: firestore_1.FieldValue.serverTimestamp(), lastLogin: null } : {})), { merge: true });
        res.status(200).json({ uid, isNew, tempPassword });
    }
    catch (err) {
        console.error("[createOrUpdateStaffUser] Error:", err);
        res.status(500).json({ error: (_b = err.message) !== null && _b !== void 0 ? _b : "Failed to create/update staff user" });
    }
}
/** Generate a strong temporary password */
function generateTempPassword() {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghjkmnpqrstuvwxyz";
    const digits = "23456789";
    const special = "#@!";
    const all = upper + lower + digits + special;
    const rand = (s) => s[Math.floor(Math.random() * s.length)];
    const base = [
        rand(upper), rand(upper),
        rand(lower), rand(lower), rand(lower),
        rand(digits), rand(digits),
        rand(special),
        ...Array.from({ length: 4 }, () => rand(all)),
    ];
    for (let i = base.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [base[i], base[j]] = [base[j], base[i]];
    }
    return base.join("");
}
//# sourceMappingURL=staffUsers.js.map