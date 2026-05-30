"use strict";
// Intake Form Cloud Functions
// CaseManagement.AI — External Referral Intake System
//
// Routes:
//   POST /api/intake/validate-token   — public, validate orgToken
//   POST /api/intake/submit           — public, submit intake form
//   POST /api/intake/generate-token   — admin auth required
//   GET  /api/intake/tokens           — admin auth required
//   PATCH /api/intake/tokens/:id/deactivate — admin auth required
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
exports.intakeRoutes = void 0;
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const express_1 = require("express");
const firestore_1 = require("firebase-admin/firestore");
const db = admin.firestore();
const router = (0, express_1.Router)();
exports.intakeRoutes = router;
// ─── Helpers ──────────────────────────────────────────────────────────────────
function sha256(input) {
    return crypto.createHash("sha256").update(input).digest("hex");
}
async function verifyAdminToken(req) {
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
        if (data.role !== "admin" && data.role !== "platform_admin")
            return null;
        return { uid: decoded.uid, organizationId: (_b = data.organizationId) !== null && _b !== void 0 ? _b : "" };
    }
    catch (_c) {
        return null;
    }
}
// ─── POST /api/intake/validate-token ─────────────────────────────────────────
router.post("/validate-token", async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const { orgToken } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        if (!orgToken || typeof orgToken !== "string") {
            res.json({ valid: false });
            return;
        }
        const tokenHash = sha256(orgToken);
        const snap = await db
            .collection("intake_tokens")
            .where("tokenHash", "==", tokenHash)
            .where("isActive", "==", true)
            .limit(1)
            .get();
        if (snap.empty) {
            res.json({ valid: false });
            return;
        }
        const tokenDoc = snap.docs[0];
        const tokenData = tokenDoc.data();
        const orgId = (_b = tokenData.orgId) !== null && _b !== void 0 ? _b : "";
        let organizationName = "";
        let organizationLogo = null;
        let organizationPhone = null;
        let defaultState = "";
        if (orgId) {
            const orgDoc = await db.doc(`organizations/${orgId}`).get();
            if (orgDoc.exists) {
                const orgData = orgDoc.data();
                organizationName = (_d = (_c = orgData.name) !== null && _c !== void 0 ? _c : orgData.organizationName) !== null && _d !== void 0 ? _d : "";
                organizationLogo = (_e = orgData.logoUrl) !== null && _e !== void 0 ? _e : null;
                organizationPhone = (_f = orgData.phone) !== null && _f !== void 0 ? _f : null;
                defaultState = (_g = orgData.primaryState) !== null && _g !== void 0 ? _g : "";
            }
        }
        res.json({
            valid: true,
            organizationName,
            organizationLogo,
            organizationPhone,
            defaultState,
            formLabel: tokenData.label || "Referral Intake Form",
        });
    }
    catch (err) {
        console.error("validate-token error:", err);
        res.status(500).json({ valid: false, error: "Server error" });
    }
});
// ─── POST /api/intake/submit ──────────────────────────────────────────────────
router.post("/submit", async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        // Rate limiting by IP
        const ip = (_d = (_c = (_b = (_a = req.headers["x-forwarded-for"]) === null || _a === void 0 ? void 0 : _a.split(",")[0]) === null || _b === void 0 ? void 0 : _b.trim()) !== null && _c !== void 0 ? _c : req.socket.remoteAddress) !== null && _d !== void 0 ? _d : "unknown";
        const rateLimitId = `ip_${sha256(ip).slice(0, 16)}`;
        const rateLimitRef = db.doc(`rate_limits/${rateLimitId}`);
        const rateLimitDoc = await rateLimitRef.get();
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;
        if (rateLimitDoc.exists) {
            const data = rateLimitDoc.data();
            const timestamps = ((_e = data.timestamps) !== null && _e !== void 0 ? _e : []).filter((t) => t > oneHourAgo);
            if (timestamps.length >= 10) {
                res.status(429).json({ error: "Rate limit exceeded. Max 10 submissions per hour." });
                return;
            }
        }
        const { orgToken, formData, uploadedFileUrls } = (_f = req.body) !== null && _f !== void 0 ? _f : {};
        if (!orgToken || typeof orgToken !== "string") {
            res.status(400).json({ error: "Missing orgToken" });
            return;
        }
        // Validate token
        const tokenHash = sha256(orgToken);
        const snap = await db
            .collection("intake_tokens")
            .where("tokenHash", "==", tokenHash)
            .where("isActive", "==", true)
            .limit(1)
            .get();
        if (snap.empty) {
            res.status(403).json({ error: "Invalid or inactive intake token" });
            return;
        }
        const tokenDoc = snap.docs[0];
        const tokenData = tokenDoc.data();
        // Validate required fields
        const fd = formData !== null && formData !== void 0 ? formData : {};
        const required = [
            "firstName", "lastName", "dateOfBirth", "primaryPhone",
            "primaryDiagnosis", "reasonForReferral",
            "referrerName", "referrerOrganization", "referrerPhone", "referrerEmail",
            "urgencyLevel", "confirmAuthorization",
        ];
        const missing = required.filter((f) => !fd[f]);
        if (missing.length > 0) {
            res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
            return;
        }
        // Generate reference number
        const year = new Date().getFullYear();
        const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
        const referenceNumber = `REF-${year}-${randomHex}`;
        const orgId = (_g = tokenData.orgId) !== null && _g !== void 0 ? _g : "";
        // Write to pending_leads
        const leadRef = await db.collection("pending_leads").add(Object.assign(Object.assign({}, fd), { source: "external_intake_form", intakeTokenId: tokenDoc.id, intakeLinkLabel: (_h = tokenData.label) !== null && _h !== void 0 ? _h : "", referenceNumber,
            orgId, status: "pending_review", submittedAt: firestore_1.FieldValue.serverTimestamp(), uploadedFileUrls: uploadedFileUrls !== null && uploadedFileUrls !== void 0 ? uploadedFileUrls : [] }));
        // Update rate limit
        const existingTimestamps = rateLimitDoc.exists
            ? ((_j = rateLimitDoc.data().timestamps) !== null && _j !== void 0 ? _j : []).filter((t) => t > oneHourAgo)
            : [];
        await rateLimitRef.set({ timestamps: [...existingTimestamps, now], ip: ip.slice(0, 64) });
        // Create notification
        const urgency = (_k = fd.urgencyLevel) !== null && _k !== void 0 ? _k : "routine";
        await db.collection("notifications").add({
            type: "new_intake_submission",
            title: `New ${urgency.charAt(0).toUpperCase() + urgency.slice(1)} Referral`,
            message: `${fd.firstName} ${fd.lastName} referred by ${fd.referrerName} (${fd.referrerOrganization})`,
            referenceNumber,
            leadId: leadRef.id,
            orgId,
            urgencyLevel: urgency,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            read: false,
        });
        // Update token stats
        await tokenDoc.ref.update({
            submissionCount: firestore_1.FieldValue.increment(1),
            lastSubmissionAt: firestore_1.FieldValue.serverTimestamp(),
        });
        res.json({ success: true, referenceNumber, leadId: leadRef.id });
    }
    catch (err) {
        console.error("submit error:", err);
        res.status(500).json({ error: "Server error" });
    }
});
// ─── POST /api/intake/generate-token ─────────────────────────────────────────
router.post("/generate-token", async (req, res) => {
    var _a;
    try {
        const caller = await verifyAdminToken(req);
        if (!caller) {
            res.status(401).json({ error: "Unauthorized. Admin role required." });
            return;
        }
        const { label } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        if (!label) {
            res.status(400).json({ error: "label is required" });
            return;
        }
        // Use the caller's org from their Firestore profile
        const orgId = caller.organizationId;
        if (!orgId) {
            res.status(400).json({ error: "Admin user has no organizationId" });
            return;
        }
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = sha256(rawToken);
        const tokenRef = await db.collection("intake_tokens").add({
            label,
            orgId,
            tokenHash,
            isActive: true,
            submissionCount: 0,
            lastSubmissionAt: null,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            createdBy: caller.uid,
        });
        const intakeUrl = `https://app.casemanagement.ai/intake/${rawToken}`;
        res.json({ success: true, intakeUrl, tokenId: tokenRef.id });
    }
    catch (err) {
        console.error("generate-token error:", err);
        res.status(500).json({ error: "Server error" });
    }
});
// ─── GET /api/intake/tokens ───────────────────────────────────────────────────
router.get("/tokens", async (req, res) => {
    try {
        const caller = await verifyAdminToken(req);
        if (!caller) {
            res.status(401).json({ error: "Unauthorized. Admin role required." });
            return;
        }
        const snap = await db
            .collection("intake_tokens")
            .where("orgId", "==", caller.organizationId)
            .orderBy("createdAt", "desc")
            .get();
        const tokens = snap.docs.map((doc) => {
            var _a;
            const d = doc.data();
            return {
                id: doc.id,
                label: d.label,
                isActive: d.isActive,
                submissionCount: (_a = d.submissionCount) !== null && _a !== void 0 ? _a : 0,
                lastSubmissionAt: d.lastSubmissionAt,
                createdAt: d.createdAt,
                createdBy: d.createdBy,
                orgId: d.orgId,
            };
        });
        res.json({ tokens });
    }
    catch (err) {
        console.error("tokens list error:", err);
        res.status(500).json({ error: "Server error" });
    }
});
// ─── PATCH /api/intake/tokens/:id/deactivate ─────────────────────────────────
router.patch("/tokens/:id/deactivate", async (req, res) => {
    try {
        const caller = await verifyAdminToken(req);
        if (!caller) {
            res.status(401).json({ error: "Unauthorized. Admin role required." });
            return;
        }
        const { id } = req.params;
        await db.doc(`intake_tokens/${id}`).update({ isActive: false });
        res.json({ success: true });
    }
    catch (err) {
        console.error("deactivate token error:", err);
        res.status(500).json({ error: "Server error" });
    }
});
//# sourceMappingURL=intakeFunctions.js.map