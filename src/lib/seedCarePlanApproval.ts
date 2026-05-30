// Seeds Care Plan approval demo data
// Plan Version 2 in supervisor_approved state (2 of 4 signatures)
// Plan Version 1 as superseded

import {
  Timestamp, addDoc, collection, getDocs, query, where, limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function seedCarePlanApprovalIfEmpty(orgId: string, userId: string): Promise<void> {
  try {
    // Find first active individual
    const indsSnap = await getDocs(
      query(collection(db, "individuals"), where("organizationId", "==", orgId), limit(5))
    );
    if (indsSnap.empty) return;

    // Check if any care_plans with approvalStatus already exist
    const existingApproval = await getDocs(
      query(
        collection(db, "care_plans"),
        where("organizationId", "==", orgId),
        where("approvalStatus", "in", ["supervisor_approved", "active", "pending_signatures"]),
        limit(1)
      )
    );
    if (!existingApproval.empty) return; // already seeded

    const ind = indsSnap.docs[0];
    const individualId = ind.id;
    const individualName = `${ind.data().last_name ?? ""}, ${ind.data().first_name ?? ""}`.trim();

    const now = new Date();
    const pastDate = (d: number) => {
      const dt = new Date(now);
      dt.setDate(dt.getDate() - d);
      return dt;
    };

    // Version 1 — superseded
    await addDoc(collection(db, "care_plans"), {
      organizationId: orgId,
      individualId,
      individual_id: individualId,
      individualName,
      type: "Person-Centered ISP",
      version: 1,
      isCurrentVersion: false,
      status: "Completed",
      approvalStatus: "superseded",
      effective_date: "2025-08-31",
      allSignaturesComplete: true,
      activatedAt: Timestamp.fromDate(pastDate(150)),
      createdAt: Timestamp.fromDate(pastDate(160)),
      updatedAt: Timestamp.fromDate(pastDate(150)),
      goals: [
        {
          id: "g1",
          goal: "Community integration and day program participation",
          progress: "in_progress",
          target_date: "2026-08-31",
        },
      ],
      signatures: {
        caseManager: {
          required: true,
          signedAt: Timestamp.fromDate(pastDate(151)),
          signedByName: "Sarah Coordinator",
        },
        supervisor: {
          required: true,
          signedAt: Timestamp.fromDate(pastDate(150)),
          signedByName: "Sam Supervisor",
        },
        guardian: {
          required: true,
          signedAt: Timestamp.fromDate(pastDate(149)),
          signedByName: "Linda Thompson",
          signedVia: "portal",
        },
        participant: {
          required: true,
          signedAt: Timestamp.fromDate(pastDate(149)),
          signedVia: "waived",
        },
      },
    });

    // Version 2 — supervisor_approved, 2 of 4 signatures
    await addDoc(collection(db, "care_plans"), {
      organizationId: orgId,
      individualId,
      individual_id: individualId,
      individualName,
      type: "Person-Centered ISP",
      version: 2,
      isCurrentVersion: true,
      status: "In Progress",
      approvalStatus: "supervisor_approved",
      effective_date: "2026-08-31",
      allSignaturesComplete: false,
      submittedForReviewAt: Timestamp.fromDate(pastDate(3)),
      submittedForReviewBy: userId,
      submittedByName: "Sarah Coordinator",
      supervisorApprovedAt: Timestamp.fromDate(pastDate(2)),
      supervisorApprovedByName: "Sam Supervisor",
      createdAt: Timestamp.fromDate(pastDate(5)),
      updatedAt: Timestamp.fromDate(pastDate(2)),
      goals: [
        {
          id: "g1",
          goal: "Explore part-time employment opportunities",
          progress: "not_started",
          target_date: "2026-10-31",
        },
        {
          id: "g2",
          goal: "Maintain community integration through Day Hab",
          progress: "in_progress",
          target_date: "Ongoing",
        },
        {
          id: "g3",
          goal: "Behavioral support coordination",
          progress: "not_started",
          target_date: "2026-05-15",
        },
      ],
      signatures: {
        caseManager: {
          required: true,
          signedAt: Timestamp.fromDate(pastDate(2)),
          signedByName: "Sarah Coordinator",
          signedBy: userId,
        },
        supervisor: {
          required: true,
          signedAt: Timestamp.fromDate(pastDate(2)),
          signedByName: "Sam Supervisor",
        },
        guardian: {
          required: true,
          signedAt: null,
          signedBy: null,
          signedVia: null,
        },
        participant: {
          required: true,
          signedAt: null,
          signedBy: null,
          signedVia: null,
        },
      },
      returnReasons: [],
    });

    console.log("[CarePlanSeed] Seeded care plan approval demo data");
  } catch (err) {
    console.warn("[CarePlanSeed] Failed:", err);
  }
}
