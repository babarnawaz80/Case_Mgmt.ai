import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export interface PendingNote {
  id: string;
  collection: "progress_notes" | "contact_notes" | "visit_summaries" | "monitoring_forms" | "care_plans";
  noteType: string;
  individualId: string;
  individualName: string;
  date: string;
  serviceCode?: string;
  units?: number;
  submittedBy: string;
  submittedByName: string;
  submittedAt: any; // Timestamp
  approvalStatus: string;
  contactType?: string;
  county?: string;
  planVersion?: number;
  planType?: string;
}

const COLLECTION_LABEL: Record<PendingNote["collection"], string> = {
  progress_notes: "Progress Note",
  contact_notes: "Contact Note",
  visit_summaries: "Visit Summary",
  monitoring_forms: "Monitoring Form",
  care_plans: "Care Plan / ISP",
};

export function usePendingReview() {
  const { userProfile } = useAuth();
  const [notes, setNotes] = useState<PendingNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.organizationId) return;

    const orgId = userProfile.organizationId;
    const isSupervisorOrAdmin =
      userProfile.role === "supervisor" || userProfile.role === "admin";

    const collections: PendingNote["collection"][] = [
      "progress_notes",
      "contact_notes",
      "visit_summaries",
      "monitoring_forms",
    ];

    const fetchAll = async () => {
      setLoading(true);
      const results: PendingNote[] = [];

      for (const col of collections) {
        try {
          let q;
          if (isSupervisorOrAdmin) {
            q = query(
              collection(db, col),
              where("approvalStatus", "==", "pending_review"),
              where("organizationId", "==", orgId)
            );
          } else {
            q = query(
              collection(db, col),
              where("approvalStatus", "==", "pending_review"),
              where("organizationId", "==", orgId),
              where("submittedForReviewBy", "==", userProfile.uid)
            );
          }
          const snap = await getDocs(q);
          snap.forEach((docSnap) => {
            const d = docSnap.data();
            // Derive individual name from various field naming conventions
            const indName =
              d.individualName ||
              d.individual_name ||
              `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() ||
              "Unknown";

            // Derive date from various field naming conventions
            const date =
              d.progressDate ||
              d.visit_date ||
              d.visitDate ||
              d.dueDate ||
              d.date ||
              "";

            results.push({
              id: docSnap.id,
              collection: col,
              noteType: COLLECTION_LABEL[col],
              individualId: d.individualId || d.individual_id || "",
              individualName: indName,
              date,
              serviceCode: d.serviceCode || d.service_code,
              units: d.billingUnits || d.units,
              submittedBy: d.submittedForReviewBy || d.authorId || d.author_uid || "",
              submittedByName:
                d.submittedByName ||
                d.authorName ||
                d.author_name ||
                d.updated_by ||
                "Unknown",
              submittedAt: d.submittedForReviewAt || d.createdAt,
              approvalStatus: d.approvalStatus,
              contactType: d.contactType,
              county: d.county,
            });
          });
        } catch (err) {
          console.warn(`[usePendingReview] Error fetching ${col}:`, err);
        }
      }

      // care_plans use 'submitted_for_review' status
      try {
        const carePlanQuery = isSupervisorOrAdmin
          ? query(collection(db, "care_plans"), where("approvalStatus", "==", "submitted_for_review"), where("organizationId", "==", orgId))
          : query(collection(db, "care_plans"), where("approvalStatus", "==", "submitted_for_review"), where("organizationId", "==", orgId), where("submittedForReviewBy", "==", userProfile.uid));

        const carePlanSnap = await getDocs(carePlanQuery);
        carePlanSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const indName = d.individualName || d.individual_name || "";
          results.push({
            id: docSnap.id,
            collection: "care_plans" as const,
            noteType: "Care Plan / ISP",
            individualId: d.individualId || d.individual_id || "",
            individualName: indName,
            date: d.effective_date || d.effectiveDate || d.createdAt || "",
            submittedBy: d.submittedForReviewBy || "",
            submittedByName: d.submittedByName || d.updatedBy || "Unknown",
            submittedAt: d.submittedForReviewAt || d.createdAt,
            approvalStatus: d.approvalStatus,
            county: d.county,
            // Extra care plan fields
            planVersion: d.version,
            planType: d.type || "Person-Centered ISP",
          });
        });
      } catch (err) {
        console.warn("[usePendingReview] Error fetching care_plans:", err);
      }

      // Sort by submittedAt ascending (oldest first)
      results.sort((a, b) => {
        const aMs = a.submittedAt?.toMillis?.() ?? 0;
        const bMs = b.submittedAt?.toMillis?.() ?? 0;
        return aMs - bMs;
      });

      setNotes(results);
      setLoading(false);
    };

    fetchAll();
  }, [userProfile?.organizationId, userProfile?.role, userProfile?.uid]);

  return { notes, loading, count: notes.length };
}
