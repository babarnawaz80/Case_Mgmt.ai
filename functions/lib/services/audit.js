"use strict";
// Audit Service (Cloud Functions) — Append-only HIPAA audit logging
// CaseManagement.AI — called after EVERY Firestore write. No exceptions.
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
exports.logAction = logAction;
const admin = __importStar(require("firebase-admin"));
const collections_1 = require("../config/collections");
async function logAction(params) {
    var _a, _b, _c, _d;
    try {
        const db = admin.firestore();
        await db.collection(collections_1.COLLECTIONS.AUDIT_LOG).add({
            organizationId: params.organizationId,
            actor_uid: params.actorUid,
            actor_name: params.actorName,
            actor_role: params.actorRole,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            action: params.action,
            collection_name: params.collectionName,
            record_id: params.recordId,
            individual_id: (_a = params.individualId) !== null && _a !== void 0 ? _a : null,
            summary: params.summary,
            before_state: (_b = params.beforeState) !== null && _b !== void 0 ? _b : null,
            after_state: (_c = params.afterState) !== null && _c !== void 0 ? _c : null,
            source: (_d = params.source) !== null && _d !== void 0 ? _d : "user",
        });
    }
    catch (err) {
        // Audit failures must never crash the parent operation — log only
        console.error("[AUDIT FAILURE]", params.action, params.collectionName, params.recordId, err);
    }
}
//# sourceMappingURL=audit.js.map