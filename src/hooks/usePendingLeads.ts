// usePendingLeads — reads pending_leads from Firestore for the current org
// Returns { pendingLeads, loading }

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export interface PendingLead {
  id: string;
  firstName: string;
  lastName: string;
  referrerName: string;
  referrerOrganization: string;
  urgencyLevel: string;
  submittedAt: { seconds: number; nanoseconds: number } | null;
  referenceNumber: string;
  intakeLinkLabel: string;
  status: string;
  primaryDiagnosis: string;
  orgId: string;
  // Additional fields for detail view
  dateOfBirth?: string;
  gender?: string;
  primaryPhone?: string;
  email?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  primaryLanguage?: string;
  raceEthnicity?: string;
  preferredName?: string;
  middleName?: string;
  hasGuardian?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianAddress?: string;
  secondaryDiagnosis?: string;
  currentMedications?: string;
  knownAllergies?: string;
  currentSupports?: string;
  reasonForReferral?: string;
  primaryInsurance?: string;
  medicaidStateId?: string;
  services?: string[];
  referrerRole?: string;
  referrerPhone?: string;
  referrerEmail?: string;
  howHeard?: string;
  additionalNotes?: string;
  uploadedFileUrls?: string[];
  source?: string;
  assignedTo?: string;
  acceptedAt?: { seconds: number } | null;
  reviewNotes?: string;
  rejectionReason?: string;
  phoneType?: string;
}

export function usePendingLeads() {
  const { userProfile } = useAuth();
  const [pendingLeads, setPendingLeads] = useState<PendingLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.organizationId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "pending_leads"),
      where("orgId", "==", userProfile.organizationId),
      where("status", "==", "pending_review"),
      orderBy("submittedAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const leads: PendingLead[] = snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            firstName: d.firstName ?? "",
            lastName: d.lastName ?? "",
            referrerName: d.referrerName ?? "",
            referrerOrganization: d.referrerOrganization ?? "",
            urgencyLevel: d.urgencyLevel ?? "routine",
            submittedAt: d.submittedAt ?? null,
            referenceNumber: d.referenceNumber ?? "",
            intakeLinkLabel: d.intakeLinkLabel ?? "",
            status: d.status ?? "pending_review",
            primaryDiagnosis: d.primaryDiagnosis ?? "",
            orgId: d.orgId ?? "",
            // Additional fields
            dateOfBirth: d.dateOfBirth,
            gender: d.gender,
            primaryPhone: d.primaryPhone,
            email: d.email,
            streetAddress: d.streetAddress,
            city: d.city,
            state: d.state,
            zip: d.zip,
            county: d.county,
            primaryLanguage: d.primaryLanguage,
            raceEthnicity: d.raceEthnicity,
            preferredName: d.preferredName,
            middleName: d.middleName,
            hasGuardian: d.hasGuardian,
            guardianName: d.guardianName,
            guardianRelationship: d.guardianRelationship,
            guardianPhone: d.guardianPhone,
            guardianEmail: d.guardianEmail,
            guardianAddress: d.guardianAddress,
            secondaryDiagnosis: d.secondaryDiagnosis,
            currentMedications: d.currentMedications,
            knownAllergies: d.knownAllergies,
            currentSupports: d.currentSupports,
            reasonForReferral: d.reasonForReferral,
            primaryInsurance: d.primaryInsurance,
            medicaidStateId: d.medicaidStateId,
            services: d.services,
            referrerRole: d.referrerRole,
            referrerPhone: d.referrerPhone,
            referrerEmail: d.referrerEmail,
            howHeard: d.howHeard,
            additionalNotes: d.additionalNotes,
            uploadedFileUrls: d.uploadedFileUrls,
            source: d.source,
            assignedTo: d.assignedTo,
            acceptedAt: d.acceptedAt ?? null,
            reviewNotes: d.reviewNotes,
            rejectionReason: d.rejectionReason,
            phoneType: d.phoneType,
          } as PendingLead;
        });

        // Sort: crisis first, then urgent, then routine
        leads.sort((a, b) => {
          const urgencyOrder = { crisis: 0, urgent: 1, routine: 2 };
          const aOrder = urgencyOrder[a.urgencyLevel as keyof typeof urgencyOrder] ?? 2;
          const bOrder = urgencyOrder[b.urgencyLevel as keyof typeof urgencyOrder] ?? 2;
          return aOrder - bOrder;
        });

        setPendingLeads(leads);
        setLoading(false);
      },
      (err) => {
        console.error("usePendingLeads error:", err);
        setLoading(false);
      }
    );

    return unsub;
  }, [userProfile?.organizationId]);

  return { pendingLeads, loading };
}
