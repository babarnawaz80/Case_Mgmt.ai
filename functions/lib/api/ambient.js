"use strict";
// Ambient AI — Deepgram Token Endpoint
// CaseManagement.AI — POST /api/ambient/deepgram-token
// Auth-protected (Firebase ID token).
// Returns the Deepgram API key so the browser can open a WebSocket to
// Deepgram's real-time transcription service.
// The key NEVER ships in the frontend bundle — only authenticated staff
// can obtain it here.
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
exports.deepgramToken = void 0;
const admin = __importStar(require("firebase-admin"));
const deepgramToken = async (req, res) => {
    var _a, _b;
    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = (_a = req.headers.authorization) !== null && _a !== void 0 ? _a : "";
    if (!authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const idToken = authHeader.slice(7);
    try {
        await admin.auth().verifyIdToken(idToken);
    }
    catch (_c) {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
    }
    // ── Return key ────────────────────────────────────────────────────────────
    const key = (_b = process.env.DEEPGRAM_API_KEY) !== null && _b !== void 0 ? _b : "";
    if (!key || key === "PASTE_YOUR_KEY_HERE") {
        res.status(503).json({
            error: "Deepgram API key not configured. Add DEEPGRAM_API_KEY to functions/.env and redeploy.",
        });
        return;
    }
    res.json({ key });
};
exports.deepgramToken = deepgramToken;
//# sourceMappingURL=ambient.js.map