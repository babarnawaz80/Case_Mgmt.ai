"use strict";
/**
 * scanDocument.ts — Firestore onCreate trigger for AI document scanning.
 *
 * Fires when a new record is created in the `managed_documents` collection.
 * Sends the document to Gemini for structured extraction, writes alerts
 * to `orchestrator_alerts`, saves a scan record to `document_scans`,
 * and updates the source document with scan results.
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
exports.scanDocumentOnCreate = void 0;
exports.maskEmail = maskEmail;
exports.maskPhone = maskPhone;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const ai_1 = require("../services/ai");
// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractJsonFromText(raw) {
    // Strip markdown code fences if present
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch)
        return fenceMatch[1].trim();
    // Fall back to first { ... } block
    const braceStart = raw.indexOf("{");
    const braceEnd = raw.lastIndexOf("}");
    if (braceStart !== -1 && braceEnd !== -1) {
        return raw.slice(braceStart, braceEnd + 1);
    }
    return raw.trim();
}
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
// ─── Main trigger ─────────────────────────────────────────────────────────────
exports.scanDocumentOnCreate = (0, firestore_1.onDocumentCreated)("managed_documents/{docId}", async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    const docId = event.params.docId;
    const db = admin.firestore();
    const docRef = snap.ref;
    // ── Guard: only scan files that haven't been scanned yet ──────────────────
    if (data.type !== "file")
        return;
    if (data.aiScanned === true)
        return;
    const organizationId = (_a = data.organizationId) !== null && _a !== void 0 ? _a : "";
    const individualId = (_b = data.individualId) !== null && _b !== void 0 ? _b : "";
    const dataUrl = (_c = data.data_url) !== null && _c !== void 0 ? _c : "";
    const documentName = (_d = data.name) !== null && _d !== void 0 ? _d : "Untitled";
    const mimeType = (_e = data.mime) !== null && _e !== void 0 ? _e : "";
    const createdBy = (_f = data.created_by) !== null && _f !== void 0 ? _f : "Unknown";
    console.log(`[scanDocument] Starting scan for doc=${docId} name="${documentName}"`);
    try {
        // ── Determine content strategy ─────────────────────────────────────────
        let hasInlineContent = false;
        let base64Data = "";
        let effectiveMime = mimeType;
        if (dataUrl &&
            (dataUrl.startsWith("data:application/pdf;base64,") ||
                dataUrl.startsWith("data:image/"))) {
            const commaIdx = dataUrl.indexOf(",");
            if (commaIdx !== -1) {
                base64Data = dataUrl.slice(commaIdx + 1);
                // Extract MIME from data URL if not already set
                if (!effectiveMime) {
                    const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
                    effectiveMime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
                }
                hasInlineContent = base64Data.length > 0;
            }
        }
        // ── Build prompts ──────────────────────────────────────────────────────
        const systemPrompt = `You are a clinical document analyst for a case management platform.
Your task is to extract structured information from documents uploaded by case managers or providers.
Return ONLY a valid JSON object — no prose, no markdown, no explanation.
Be conservative: only flag concerns that are clearly present in the document.`;
        const userPrompt = `Analyse the document${hasInlineContent ? " (content provided above)" : ` named "${documentName}"`} and return a JSON object with exactly these fields:

{
  "documentType": one of "Progress Note"|"Quarterly Report"|"Medical Update"|"Goal Documentation"|"Incident Report"|"Assessment"|"Other",
  "documentDate": ISO date string or null,
  "authorName": string or null,
  "authorOrg": string or null,
  "keyFindings": array of up to 5 concise bullet strings,
  "concernsFlagged": array of strings (things that should alert the case manager — empty array if none),
  "goalsReferenced": array of { "goalDescription": string, "progressStatus": "on_track"|"needs_attention"|"not_started"|"completed"|"unknown", "progressNote": string },
  "medicationChanges": array of strings (empty if none),
  "incidentsReported": array of strings (empty if none),
  "employmentInterest": boolean (true only if document explicitly mentions employment interest or job search),
  "behavioralChanges": boolean (true only if document explicitly mentions notable behavioral changes),
  "medicalChanges": boolean (true only if document explicitly mentions medical changes or health updates),
  "datesAndDeadlines": array of strings describing important future dates or deadlines found in the document,
  "recommendedActions": array of strings
}

Document metadata:
- File name: ${documentName}
- MIME type: ${effectiveMime || "unknown"}
- Uploaded by: ${createdBy}`;
        // ── Call Gemini ────────────────────────────────────────────────────────
        const ai = (0, ai_1.getAiClient)();
        let rawResponse = "";
        if (hasInlineContent) {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                    {
                        role: "user",
                        parts: [
                            { inlineData: { mimeType: effectiveMime, data: base64Data } },
                            { text: userPrompt },
                        ],
                    },
                ],
                config: {
                    systemInstruction: systemPrompt,
                    maxOutputTokens: 4000,
                    temperature: 0.1,
                },
            });
            rawResponse = (_g = response.text) !== null && _g !== void 0 ? _g : "";
        }
        else {
            // No inline content — use metadata only
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                    {
                        role: "user",
                        parts: [{ text: userPrompt }],
                    },
                ],
                config: {
                    systemInstruction: systemPrompt,
                    maxOutputTokens: 4000,
                    temperature: 0.1,
                },
            });
            rawResponse = (_h = response.text) !== null && _h !== void 0 ? _h : "";
        }
        // ── Parse JSON response ────────────────────────────────────────────────
        let extraction;
        try {
            const jsonStr = extractJsonFromText(rawResponse);
            extraction = JSON.parse(jsonStr);
        }
        catch (parseErr) {
            console.error("[scanDocument] JSON parse error for doc", docId, parseErr);
            // Provide a safe default rather than failing the whole scan
            extraction = {
                documentType: "Other",
                documentDate: null,
                authorName: null,
                authorOrg: null,
                keyFindings: [`Document "${documentName}" was uploaded and stored.`],
                concernsFlagged: [],
                goalsReferenced: [],
                medicationChanges: [],
                incidentsReported: [],
                employmentInterest: false,
                behavioralChanges: false,
                medicalChanges: false,
                datesAndDeadlines: [],
                recommendedActions: [],
            };
        }
        // ── Resolve individual name for alert docs ─────────────────────────────
        let individualName = "Unknown Individual";
        let assignedCaseManagerId = null;
        if (individualId) {
            try {
                const indSnap = await db.collection("individuals").doc(individualId).get();
                if (indSnap.exists) {
                    const ind = indSnap.data();
                    const firstName = (_j = ind.firstName) !== null && _j !== void 0 ? _j : "";
                    const lastName = (_k = ind.lastName) !== null && _k !== void 0 ? _k : "";
                    individualName = `${firstName} ${lastName}`.trim() || individualName;
                    assignedCaseManagerId = (_m = (_l = ind.assignedCaseManagerId) !== null && _l !== void 0 ? _l : ind.case_manager_id) !== null && _m !== void 0 ? _m : null;
                }
            }
            catch (indErr) {
                console.warn("[scanDocument] Could not load individual doc:", indErr);
            }
        }
        // ── Build alerts ───────────────────────────────────────────────────────
        const alertsToWrite = [];
        for (const concern of ((_o = extraction.concernsFlagged) !== null && _o !== void 0 ? _o : [])) {
            alertsToWrite.push({
                type: "document_concern",
                severity: "warning",
                message: concern,
                suggestedAction: "Review the flagged concern in the document and follow up as appropriate.",
            });
        }
        for (const med of ((_p = extraction.medicationChanges) !== null && _p !== void 0 ? _p : [])) {
            alertsToWrite.push({
                type: "medication_change_detected",
                severity: "urgent",
                message: `Medication change noted: ${med}`,
                suggestedAction: "Confirm the medication change with the prescriber and update the individual's medication record.",
            });
        }
        for (const incident of ((_q = extraction.incidentsReported) !== null && _q !== void 0 ? _q : [])) {
            alertsToWrite.push({
                type: "incident_mentioned",
                severity: "urgent",
                message: `Incident referenced in document: ${incident}`,
                suggestedAction: "Verify that a formal incident report has been filed and follow up per agency protocol.",
            });
        }
        if (extraction.behavioralChanges === true) {
            alertsToWrite.push({
                type: "behavioral_change_noted",
                severity: "warning",
                message: "The uploaded document mentions notable behavioral changes.",
                suggestedAction: "Review the document and consider updating the individual's behavior support plan.",
            });
        }
        if (extraction.employmentInterest === true) {
            alertsToWrite.push({
                type: "employment_interest",
                severity: "info",
                message: "The uploaded document indicates the individual has expressed interest in employment.",
                suggestedAction: "Connect the individual with employment services or supported employment resources.",
            });
        }
        // ── Write orchestrator_alerts ──────────────────────────────────────────
        const alertBatch = db.batch();
        for (const alert of alertsToWrite) {
            const alertRef = db.collection("orchestrator_alerts").doc();
            alertBatch.set(alertRef, {
                tenantId: organizationId,
                organizationId,
                individualId,
                individualName,
                source: "document_scan",
                documentId: docId,
                documentName,
                type: alert.type,
                severity: alert.severity,
                message: alert.message,
                suggestedAction: alert.suggestedAction,
                actionRoute: individualId ? `/people/${individualId}/documents` : null,
                status: "active",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        await alertBatch.commit();
        // ── Write document_scans record ────────────────────────────────────────
        const keyFindings = Array.isArray(extraction.keyFindings) ? extraction.keyFindings : [];
        await db.collection("document_scans").add({
            documentId: docId,
            documentName,
            individualId,
            organizationId,
            uploadedBy: createdBy,
            documentType: (_r = extraction.documentType) !== null && _r !== void 0 ? _r : "Other",
            documentDate: (_s = extraction.documentDate) !== null && _s !== void 0 ? _s : null,
            authorName: (_t = extraction.authorName) !== null && _t !== void 0 ? _t : null,
            authorOrg: (_u = extraction.authorOrg) !== null && _u !== void 0 ? _u : null,
            keyFindings,
            concernsFlagged: (_v = extraction.concernsFlagged) !== null && _v !== void 0 ? _v : [],
            goalsReferenced: (_w = extraction.goalsReferenced) !== null && _w !== void 0 ? _w : [],
            medicationChanges: (_x = extraction.medicationChanges) !== null && _x !== void 0 ? _x : [],
            incidentsReported: (_y = extraction.incidentsReported) !== null && _y !== void 0 ? _y : [],
            employmentInterest: (_z = extraction.employmentInterest) !== null && _z !== void 0 ? _z : false,
            behavioralChanges: (_0 = extraction.behavioralChanges) !== null && _0 !== void 0 ? _0 : false,
            medicalChanges: (_1 = extraction.medicalChanges) !== null && _1 !== void 0 ? _1 : false,
            datesAndDeadlines: (_2 = extraction.datesAndDeadlines) !== null && _2 !== void 0 ? _2 : [],
            recommendedActions: (_3 = extraction.recommendedActions) !== null && _3 !== void 0 ? _3 : [],
            alertsGenerated: alertsToWrite,
            scannedAt: admin.firestore.FieldValue.serverTimestamp(),
            scanStatus: "complete",
            reviewedBy: null,
            reviewedAt: null,
        });
        // ── Update managed_documents record ────────────────────────────────────
        const summaryText = keyFindings.slice(0, 2).join(" · ") || "Document scanned";
        await docRef.update({
            aiScanned: true,
            aiScannedAt: admin.firestore.FieldValue.serverTimestamp(),
            aiAlertCount: alertsToWrite.length,
            aiScanSummary: summaryText,
            scanStatus: "complete",
        });
        // ── In-app notification if alerts were generated ───────────────────────
        if (alertsToWrite.length > 0) {
            const notifUid = assignedCaseManagerId !== null && assignedCaseManagerId !== void 0 ? assignedCaseManagerId : createdBy;
            const firstAlertMessage = alertsToWrite[0].message;
            await db.collection("notifications").add({
                uid: notifUid,
                organizationId,
                type: "document_ai_alert",
                title: `AI found ${alertsToWrite.length} issue(s) in "${documentName}"`,
                body: `Document uploaded by ${createdBy} for individual. AI detected: ${firstAlertMessage}`,
                href: `/people/${individualId}/documents`,
                read: false,
                dismissed: false,
                severity: "warning",
                source: "document_scan",
                documentId: docId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        console.log(`[scanDocument] Completed scan for doc=${docId}: ${alertsToWrite.length} alert(s) generated`);
    }
    catch (err) {
        console.error("[scanDocument] Fatal error for doc", docId, err);
        try {
            await docRef.update({
                scanStatus: "failed",
                aiScanned: false,
                aiScanError: String(err),
                aiScanFailedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        catch (updateErr) {
            console.error("[scanDocument] Also failed to write error status:", updateErr);
        }
    }
});
//# sourceMappingURL=scanDocument.js.map