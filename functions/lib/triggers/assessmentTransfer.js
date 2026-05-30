"use strict";
/**
 * assessmentTransfer.ts
 * Firestore trigger: when a lead is converted, copy leadId assessments
 * to the new individual by setting individualId = convertedToPersonId.
 *
 * Trigger: onDocumentUpdated on `leads/{leadId}` (Firestore-based leads).
 *
 * Since this app currently uses localStorage for lead data, this trigger
 * targets the `assessments` collection: if an assessment has a `leadId`
 * but no `individual_id`, and a matching individual is found, transfer it.
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
exports.onAssessmentLeadTransfer = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
exports.onAssessmentLeadTransfer = (0, firestore_1.onDocumentWritten)("assessments/{assessmentId}", async (event) => {
    var _a;
    const after = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after;
    if (!(after === null || after === void 0 ? void 0 : after.exists))
        return;
    const data = after.data();
    // Only act when the assessment has a leadId but no individual_id
    const leadId = data.leadId;
    const individualId = data.individual_id;
    if (!leadId || individualId)
        return;
    try {
        const db = admin.firestore();
        // Look for a matching lead in the individuals collection that was
        // created from a lead conversion (stored with leadId field)
        const individualsSnap = await db
            .collection("individuals")
            .where("leadId", "==", leadId)
            .limit(1)
            .get();
        if (individualsSnap.empty)
            return;
        const individual = individualsSnap.docs[0];
        // Transfer assessment to the individual
        await after.ref.update({
            individual_id: individual.id,
            leadId: admin.firestore.FieldValue.delete(),
            transferredAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[assessmentTransfer] Assessment ${event.params.assessmentId} transferred from lead ${leadId} to individual ${individual.id}`);
    }
    catch (err) {
        console.error("[assessmentTransfer] Failed:", err);
    }
});
//# sourceMappingURL=assessmentTransfer.js.map