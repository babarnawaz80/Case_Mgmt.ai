/**
 * seedGuardianPortal.ts
 *
 * Seeds demo guardian portal session for John Smith + Linda Thompson.
 * Called once from AuthContext after login.
 *
 * Demo token: GUARDIAN-DEMO-TOKEN-LINDA-SMITH-2026
 * Portal URL: /guardian-portal/GUARDIAN-DEMO-TOKEN-LINDA-SMITH-2026/home
 */

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const DEMO_TOKEN = "GUARDIAN-DEMO-TOKEN-LINDA-SMITH-2026";

/**
 * SHA-256 hash using Web Crypto API — same as the portal client uses.
 */
async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function pastDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function futureDate(daysAhead: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d;
}

export async function seedGuardianPortalIfEmpty(_orgId: string): Promise<void> {
  try {
    // 1. Find John Smith individual (first_name === "John", last_name === "Smith")
    //    Fall back to first individual if John Smith is not found.
    let individualId = "";
    let individualName = "John Smith";

    try {
      const indSnap = await getDocs(
        query(
          collection(db, "individuals"),
          where("first_name", "==", "John"),
          where("last_name", "==", "Smith")
        )
      );
      if (!indSnap.empty) {
        individualId = indSnap.docs[0].id;
        const d = indSnap.docs[0].data();
        individualName = `${d.first_name} ${d.last_name}`;
      }
    } catch {
      // query failed — try a broader search
    }

    // If John Smith not found, fall back to ind-001
    if (!individualId) {
      individualId = "ind-001";
    }

    // 2. Check if a guardian portal session already exists for the demo token hash
    const tokenHash = await sha256Hex(DEMO_TOKEN);
    const existingSnap = await getDocs(
      query(
        collection(db, "guardian_portal_sessions"),
        where("consentTokenHash", "==", tokenHash)
      )
    );

    if (!existingSnap.empty) {
      // Already seeded — nothing to do
      return;
    }

    // 3. Seed two consent records in consent_requests
    const consent1Ref = await addDoc(collection(db, "consent_requests"), {
      consentType: "Release of Information",
      status: "signed",
      individualId,
      individualName,
      recipientName: "Linda Thompson",
      recipientPhone: "+13175550100",
      signedAt: Timestamp.fromDate(pastDate(5)),
      sentAt: Timestamp.fromDate(pastDate(6)),
      description:
        "Authorization to release or exchange information with designated parties for the purpose of coordinating care and services.",
      createdAt: Timestamp.fromDate(pastDate(6)),
    });

    const consent2Ref = await addDoc(collection(db, "consent_requests"), {
      consentType: "Consent to Receive Services",
      status: "signed",
      individualId,
      individualName,
      recipientName: "Linda Thompson",
      recipientPhone: "+13175550100",
      signedAt: Timestamp.fromDate(pastDate(90)),
      sentAt: Timestamp.fromDate(pastDate(91)),
      description:
        "Authorization to receive case management and related support services as outlined in the Individual's service plan.",
      createdAt: Timestamp.fromDate(pastDate(91)),
    });

    // 4. Create guardian portal session with fixed demo token hash
    const sessionRef = await addDoc(collection(db, "guardian_portal_sessions"), {
      consentTokenHash: tokenHash,
      individualId,
      guardianName: "Linda Thompson",
      guardianPhone: "+13175550100",
      tenantId: "org_casemanagement_ai",
      orgId: "org_casemanagement_ai",
      otpVerifiedAt: Timestamp.fromDate(pastDate(5)),
      sessionCreatedAt: Timestamp.fromDate(pastDate(5)),
      sessionExpiresAt: futureDate(30),
      lastActiveAt: Timestamp.fromDate(pastDate(1)),
      revokedAt: null,
      revokedBy: null,
      consentIds: [consent1Ref.id, consent2Ref.id],
    });

    // 5. Seed guardian messages
    const msgs = [
      {
        senderType: "staff",
        senderName: "Sarah Coordinator",
        text: "Hi Linda, I wanted to let you know that John's quarterly monitoring form has been completed. Everything looks good!",
        createdAt: Timestamp.fromDate(pastDate(2)),
        read: true,
      },
      {
        senderType: "guardian",
        senderName: "Linda Thompson",
        text: "Thank you Sarah! We noticed John has been doing well with the community activities.",
        createdAt: Timestamp.fromDate(pastDate(1)),
        read: true,
      },
      {
        senderType: "staff",
        senderName: "Sarah Coordinator",
        text: "Great to hear! His next in-home visit is scheduled for June 15th. I'll send a reminder closer to the date.",
        createdAt: Timestamp.fromDate(new Date(Date.now() - 12 * 3600000)), // 12h ago
        read: false,
      },
    ];

    for (const msg of msgs) {
      await addDoc(collection(db, "guardian_messages"), {
        ...msg,
        individualId,
        sessionId: sessionRef.id,
      });
    }

    console.log("[seedGuardianPortal] Demo guardian portal session seeded successfully.");
    console.log(`[seedGuardianPortal] Portal URL: /guardian-portal/${DEMO_TOKEN}/home`);
  } catch (err) {
    // Seed failures are non-fatal — log and continue
    console.warn("[seedGuardianPortal] Seed skipped or failed:", err);
  }
}
