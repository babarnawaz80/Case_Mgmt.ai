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

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

export const onAssessmentLeadTransfer = onDocumentWritten(
  "assessments/{assessmentId}",
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;

    const data = after.data() as admin.firestore.DocumentData;

    // Only act when the assessment has a leadId but no individual_id
    const leadId: string | undefined = data.leadId;
    const individualId: string | undefined = data.individual_id;

    if (!leadId || individualId) return;

    try {
      const db = admin.firestore();

      // Look for a matching lead in the individuals collection that was
      // created from a lead conversion (stored with leadId field)
      const individualsSnap = await db
        .collection("individuals")
        .where("leadId", "==", leadId)
        .limit(1)
        .get();

      if (individualsSnap.empty) return;

      const individual = individualsSnap.docs[0];

      // Transfer assessment to the individual
      await after.ref.update({
        individual_id: individual.id,
        leadId: admin.firestore.FieldValue.delete(),
        transferredAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `[assessmentTransfer] Assessment ${event.params.assessmentId} transferred from lead ${leadId} to individual ${individual.id}`
      );
    } catch (err) {
      console.error("[assessmentTransfer] Failed:", err);
    }
  }
);
