/**
 * seedAssessments.ts
 * Seeds demo assessment data if none exists.
 * Called from AuthContext after seedDemoIfEmpty.
 * Fully idempotent — safe to call on every login.
 * All errors are swallowed; this function never throws.
 */

import {
  collection,
  query,
  where,
  limit,
  getDocs,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { templates as mockTemplates } from "@/data/assessments";

export async function seedAssessmentsIfEmpty(
  orgId: string,
  userId: string
): Promise<void> {
  try {
    // ── 1. Ensure at least one Firestore assessment_template exists ───────────
    const tplSnap = await getDocs(
      query(
        collection(db, "assessment_templates"),
        where("orgId", "==", orgId),
        limit(1)
      )
    );

    if (tplSnap.empty && mockTemplates.length > 0) {
      // Seed the first published mock template into Firestore
      const compInitial = mockTemplates.find((t) => t.id === "tpl-comp-initial");
      const toSeed = compInitial ?? mockTemplates[0];

      await setDoc(doc(db, "assessment_templates", toSeed.id), {
        ...toSeed,
        orgId,
        tenantId: orgId,
        createdBy: userId,
        createdByName: "Demo Seed",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }

    // ── 2. Find Valentina Cruz's individual ID ────────────────────────────────
    const valentinasSnap = await getDocs(
      query(
        collection(db, "individuals"),
        where("first_name", "==", "Valentina"),
        where("organizationId", "==", orgId),
        limit(1)
      )
    );

    if (!valentinasSnap.empty) {
      const valentina = valentinasSnap.docs[0];
      const valId = valentina.id;

      // Check if Valentina has any assessments
      const valAssessmentSnap = await getDocs(
        query(
          collection(db, "assessments"),
          where("individual_id", "==", valId),
          limit(1)
        )
      );

      if (valAssessmentSnap.empty) {
        // Seed one completed assessment for Valentina
        await addDoc(collection(db, "assessments"), {
          individual_id: valId,
          templateId: "tpl-comp-initial",
          templateVersion: "v2.0",
          date: "01/15/2026",
          status: "Completed",
          completedBy: "Kathy Martinez, CM",
          totalScore: 38,
          loc: "Moderate",
          organizationId: orgId,
          answers: [
            { questionId: "q-name", value: "Valentina" },
            { questionId: "q-lang", value: "Spanish" },
            { questionId: "q-adl-bath", value: "Supervision" },
            { questionId: "q-adl-dress", value: "Modified Independent" },
            { questionId: "q-adl-eat", value: "Independent" },
            { questionId: "q-iadl-meds", value: "Moderate Assist" },
            { questionId: "q-iadl-fin", value: "Maximal Assist" },
            { questionId: "q-comm-mode", value: "Verbal" },
            { questionId: "q-beh-concerns", value: "No" },
            { questionId: "q-h-dx", value: "Moderate ID, cerebral palsy" },
            { questionId: "q-cog-level", value: "Moderate support" },
            { questionId: "q-legal-guard", value: "Limited guardianship" },
            { questionId: "q-env-living", value: "Group home" },
          ],
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      }
    }

    // ── 3. Find Mateo Alvarez lead, seed a draft assessment if none exists ────
    // Leads are localStorage-based in this app so we just check for existing
    // draft assessments in Firestore with a leadId matching known leads
    const mateoSnap = await getDocs(
      query(
        collection(db, "assessments"),
        where("leadId", "==", "lead-mateo"),
        limit(1)
      )
    );

    if (mateoSnap.empty) {
      // Skip — leads are localStorage-only, no Firestore seeding needed
    }
  } catch (err) {
    // Non-fatal — never throw from seed functions
    console.warn("[seedAssessmentsIfEmpty] Non-fatal error:", err);
  }
}
