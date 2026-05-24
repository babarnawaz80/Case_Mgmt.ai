// Firestore Triggers — Auto-process new billing claims and daily task checks
// CaseManagement.AI — Gen 2 Firebase Functions

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { COLLECTIONS } from "../config/collections";

// Trigger: When a new billing_claim is created — auto-run AI scrub
export const onNewBillingClaim = onDocumentCreated(
  `${COLLECTIONS.BILLING_CLAIMS}/{claimId}`,
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const claim = snap.data();
    const claimId = event.params.claimId;

    try {
      await snap.ref.update({
        ai_scrub_status: "pending",
        ai_scrub_run_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      const issues: string[] = [];

      if (!claim.service_code) issues.push("Missing service code");
      if (!claim.authorization_id) issues.push("Missing authorization");
      if (!claim.rendering_provider_npi) issues.push("Missing rendering provider NPI");
      if (!claim.units || claim.units <= 0) issues.push("Invalid units");

      if (claim.authorization_id) {
        const authSnap = await admin.firestore()
          .collection(COLLECTIONS.SERVICE_AUTHORIZATIONS)
          .doc(claim.authorization_id)
          .get();

        if (authSnap.exists) {
          const auth = authSnap.data()!;
          const serviceDate = new Date(claim.service_date);
          const authExpiry = new Date(auth.expiration_date);
          if (serviceDate > authExpiry) issues.push("Service date is after authorization expiry");
          if (auth.remaining_units < claim.units) issues.push("Insufficient authorized units remaining");
        }
      }

      await snap.ref.update({
        ai_scrub_status: issues.length === 0 ? "passed" : "needs_attention",
        ai_scrub_notes: issues,
        billing_status: issues.length === 0 ? "ready" : "on_hold",
      });
    } catch (error) {
      console.error("[billing-claim-scrub]", claimId, error);
    }
  }
);

// Daily scheduled trigger: Mark overdue workflow tasks
export const onWorkflowTaskDailyCheck = onSchedule(
  { schedule: "0 6 * * *", timeZone: "America/New_York" },
  async () => {
    const db = admin.firestore();
    const now = new Date();

    const overdueSnap = await db.collection(COLLECTIONS.WORKFLOW_TASKS)
      .where("status", "in", ["pending_start", "in_progress"])
      .where("due_date", "<", now.toISOString())
      .get();

    if (overdueSnap.empty) return;

    const batch = db.batch();
    overdueSnap.docs.forEach((doc) => {
      const dueDate = new Date(doc.data().due_date);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      batch.update(doc.ref, { status: "overdue", days_overdue: daysOverdue });
    });

    await batch.commit();
    console.log(`[daily-check] Marked ${overdueSnap.docs.length} tasks as overdue`);
  }
);
