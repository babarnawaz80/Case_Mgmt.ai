/**
 * scanDocument.ts — Firestore onCreate trigger for AI document scanning.
 *
 * Fires when a new record is created in the `managed_documents` collection.
 * Sends the document to Gemini for structured extraction, writes alerts
 * to `orchestrator_alerts`, saves a scan record to `document_scans`,
 * and updates the source document with scan results.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { getAiClient } from "../services/ai";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoalRef {
  goalDescription: string;
  progressStatus: "on_track" | "needs_attention" | "not_started" | "completed" | "unknown";
  progressNote: string;
}

interface ExtractionResult {
  documentType: "Progress Note" | "Quarterly Report" | "Medical Update" | "Goal Documentation" | "Incident Report" | "Assessment" | "Other";
  documentDate: string | null;
  authorName: string | null;
  authorOrg: string | null;
  keyFindings: string[];
  concernsFlagged: string[];
  goalsReferenced: GoalRef[];
  medicationChanges: string[];
  incidentsReported: string[];
  employmentInterest: boolean;
  behavioralChanges: boolean;
  medicalChanges: boolean;
  datesAndDeadlines: string[];
  recommendedActions: string[];
}

interface AlertDoc {
  type: string;
  severity: "urgent" | "warning" | "info";
  message: string;
  suggestedAction: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractJsonFromText(raw: string): string {
  // Strip markdown code fences if present
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  // Fall back to first { ... } block
  const braceStart = raw.indexOf("{");
  const braceEnd = raw.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd !== -1) {
    return raw.slice(braceStart, braceEnd + 1);
  }
  return raw.trim();
}

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

// ─── Main trigger ─────────────────────────────────────────────────────────────

export const scanDocumentOnCreate = onDocumentCreated(
  "managed_documents/{docId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data() as Record<string, unknown>;
    const docId = event.params.docId;
    const db = admin.firestore();
    const docRef = snap.ref;

    // ── Guard: only scan files that haven't been scanned yet ──────────────────
    if (data.type !== "file") return;
    if (data.aiScanned === true) return;

    const organizationId = (data.organizationId as string) ?? "";
    const individualId = (data.individualId as string) ?? "";
    const dataUrl = (data.data_url as string) ?? "";
    const documentName = (data.name as string) ?? "Untitled";
    const mimeType = (data.mime as string) ?? "";
    const createdBy = (data.created_by as string) ?? "Unknown";

    console.log(`[scanDocument] Starting scan for doc=${docId} name="${documentName}"`);

    try {
      // ── Determine content strategy ─────────────────────────────────────────
      let hasInlineContent = false;
      let base64Data = "";
      let effectiveMime = mimeType;

      if (
        dataUrl &&
        (dataUrl.startsWith("data:application/pdf;base64,") ||
          dataUrl.startsWith("data:image/"))
      ) {
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
      const ai = getAiClient();
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
        rawResponse = response.text ?? "";
      } else {
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
        rawResponse = response.text ?? "";
      }

      // ── Parse JSON response ────────────────────────────────────────────────
      let extraction: ExtractionResult;
      try {
        const jsonStr = extractJsonFromText(rawResponse);
        extraction = JSON.parse(jsonStr) as ExtractionResult;
      } catch (parseErr) {
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
      let assignedCaseManagerId: string | null = null;
      if (individualId) {
        try {
          const indSnap = await db.collection("individuals").doc(individualId).get();
          if (indSnap.exists) {
            const ind = indSnap.data()!;
            const firstName = (ind.firstName as string) ?? "";
            const lastName = (ind.lastName as string) ?? "";
            individualName = `${firstName} ${lastName}`.trim() || individualName;
            assignedCaseManagerId = (ind.assignedCaseManagerId as string) ?? (ind.case_manager_id as string) ?? null;
          }
        } catch (indErr) {
          console.warn("[scanDocument] Could not load individual doc:", indErr);
        }
      }

      // ── Build alerts ───────────────────────────────────────────────────────
      const alertsToWrite: AlertDoc[] = [];

      for (const concern of (extraction.concernsFlagged ?? [])) {
        alertsToWrite.push({
          type: "document_concern",
          severity: "warning",
          message: concern,
          suggestedAction: "Review the flagged concern in the document and follow up as appropriate.",
        });
      }

      for (const med of (extraction.medicationChanges ?? [])) {
        alertsToWrite.push({
          type: "medication_change_detected",
          severity: "urgent",
          message: `Medication change noted: ${med}`,
          suggestedAction: "Confirm the medication change with the prescriber and update the individual's medication record.",
        });
      }

      for (const incident of (extraction.incidentsReported ?? [])) {
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
      const keyFindings: string[] = Array.isArray(extraction.keyFindings) ? extraction.keyFindings : [];
      await db.collection("document_scans").add({
        documentId: docId,
        documentName,
        individualId,
        organizationId,
        uploadedBy: createdBy,
        documentType: extraction.documentType ?? "Other",
        documentDate: extraction.documentDate ?? null,
        authorName: extraction.authorName ?? null,
        authorOrg: extraction.authorOrg ?? null,
        keyFindings,
        concernsFlagged: extraction.concernsFlagged ?? [],
        goalsReferenced: extraction.goalsReferenced ?? [],
        medicationChanges: extraction.medicationChanges ?? [],
        incidentsReported: extraction.incidentsReported ?? [],
        employmentInterest: extraction.employmentInterest ?? false,
        behavioralChanges: extraction.behavioralChanges ?? false,
        medicalChanges: extraction.medicalChanges ?? false,
        datesAndDeadlines: extraction.datesAndDeadlines ?? [],
        recommendedActions: extraction.recommendedActions ?? [],
        alertsGenerated: alertsToWrite,
        scannedAt: admin.firestore.FieldValue.serverTimestamp(),
        scanStatus: "complete",
        reviewedBy: null,
        reviewedAt: null,
      });

      // ── Update managed_documents record ────────────────────────────────────
      const summaryText =
        keyFindings.slice(0, 2).join(" · ") || "Document scanned";

      await docRef.update({
        aiScanned: true,
        aiScannedAt: admin.firestore.FieldValue.serverTimestamp(),
        aiAlertCount: alertsToWrite.length,
        aiScanSummary: summaryText,
        scanStatus: "complete",
      });

      // ── In-app notification if alerts were generated ───────────────────────
      if (alertsToWrite.length > 0) {
        const notifUid = assignedCaseManagerId ?? createdBy;
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

      console.log(
        `[scanDocument] Completed scan for doc=${docId}: ${alertsToWrite.length} alert(s) generated`
      );
    } catch (err) {
      console.error("[scanDocument] Fatal error for doc", docId, err);
      try {
        await docRef.update({
          scanStatus: "failed",
          aiScanned: false,
          aiScanError: String(err),
          aiScanFailedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (updateErr) {
        console.error("[scanDocument] Also failed to write error status:", updateErr);
      }
    }
  }
);

// Re-export helper for testing purposes only — not part of the public API.
export { maskEmail, maskPhone };
