#!/usr/bin/env node
/**
 * seed-duplicates.cjs
 * Seeds two demo duplicate_pairs for the duplicate detection demo.
 *
 *  Pair 1 — Medicaid ID match
 *    Johnson, Marcus vs Johnson, Marcus T  (same Medicaid: IN987654321)
 *
 *  Pair 2 — Name + DOB match
 *    Williams, Patricia vs Williams, Patricia Ann (same DOB, different Medicaid)
 *
 * Also creates stub individual records for each pair so the review panel
 * can pull real data.
 *
 * Run from scripts/ directory:
 *   node seed-duplicates.cjs
 */
"use strict";

const { initializeApp }   = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const {
  getFirestore, collection, addDoc, setDoc, doc, getDocs,
  query, where, serverTimestamp,
} = require("firebase/firestore");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = initializeApp({
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db   = getFirestore(app);
const ORG_ID = "org_casemanagement_ai";

async function upsertIndividual(id, data) {
  const ref = doc(db, "individuals", id);
  await setDoc(ref, {
    ...data,
    organizationId: ORG_ID,
    enrollment_status: data.enrollment_status ?? "active",
    updatedAt: serverTimestamp(),
  }, { merge: true });
  console.log(`  ✓ Individual ${id}: ${data.last_name}, ${data.first_name}`);
}

async function run() {
  console.log("Authenticating...");
  await signInWithEmailAndPassword(auth, "kathy@demo.casemanagement.ai", "Demo1234!");
  console.log("Authenticated.\n");

  // ── Create stub individuals for the demo pairs ────────────────────────────
  console.log("Creating stub individuals...");

  const indAId = "dup-marcus-a";
  const indBId = "dup-marcus-b";
  const indCId = "dup-patricia-a";
  const indDId = "dup-patricia-b";

  await upsertIndividual(indAId, {
    first_name: "Marcus",
    last_name:  "Johnson",
    dob:        "1990-07-22",
    medicaid_id: "IN987654321",
    program:    "Indiana HCBS",
    county:     "Marion",
    assigned_case_manager_name: "Sarah Mitchell",
    enrollment_status: "active",
    open_tasks: 0,
    risk_score: 30,
  });

  await upsertIndividual(indBId, {
    first_name: "Marcus",
    last_name:  "Johnson",
    preferred_name: "Marcus T",
    dob:        "1990-07-22",
    medicaid_id: "IN987654321",
    program:    "Indiana HCBS",
    county:     "Marion",
    assigned_case_manager_name: "Jordan Miles",
    enrollment_status: "pending",
    open_tasks: 0,
    risk_score: 0,
  });

  await upsertIndividual(indCId, {
    first_name: "Patricia",
    last_name:  "Williams",
    dob:        "1978-04-10",
    medicaid_id: "IN555000111",
    program:    "Indiana HCBS",
    county:     "Hamilton",
    assigned_case_manager_name: "Kathy Martinez",
    enrollment_status: "active",
    open_tasks: 1,
    risk_score: 45,
  });

  await upsertIndividual(indDId, {
    first_name: "Patricia",
    last_name:  "Williams",
    preferred_name: "Patricia Ann",
    dob:        "1978-04-10",
    medicaid_id: "IN555000999",
    program:    "Indiana HCBS",
    county:     "Hamilton",
    assigned_case_manager_name: "Kathy Martinez",
    enrollment_status: "active",
    open_tasks: 0,
    risk_score: 25,
  });

  // ── Clear existing demo pairs if any ──────────────────────────────────────
  console.log("\nClearing old demo pairs...");
  const existing = await getDocs(
    query(collection(db, "duplicate_pairs"),
      where("orgId", "==", ORG_ID),
      where("status", "==", "pending")
    )
  );
  // Only clear pairs involving our demo individual IDs
  const demoIds = new Set([indAId, indBId, indCId, indDId]);
  let cleared = 0;
  for (const d of existing.docs) {
    const data = d.data();
    if (demoIds.has(data.individualAId) || demoIds.has(data.individualBId)) {
      // We can't delete without admin SDK, so we'll just skip if pair already exists
      cleared++;
    }
  }
  console.log(`  ${existing.docs.length} existing pairs found (${cleared} from demo individuals).`);

  // ── Seed Pair 1: Medicaid ID match ─────────────────────────────────────────
  console.log("\nSeeding Pair 1 — Medicaid ID match...");
  const pair1Existing = existing.docs.find((d) => {
    const data = d.data();
    return (data.individualAId === indAId && data.individualBId === indBId) ||
           (data.individualAId === indBId && data.individualBId === indAId);
  });
  if (!pair1Existing) {
    const ref1 = await addDoc(collection(db, "duplicate_pairs"), {
      tenantId:        ORG_ID,
      orgId:           ORG_ID,
      individualAId:   indAId,
      individualAName: "Johnson, Marcus",
      individualBId:   indBId,
      individualBName: "Johnson, Marcus T",
      detectedAt:      serverTimestamp(),
      detectedBy:      "scheduled_scan",
      matchSignal:     "medicaid_id",
      medicaidIdMatch: true,
      nameDobMatch:    false,
      status:          "pending",
      resolvedAt:      null,
      resolvedBy:      null,
      resolvedByName:  null,
      resolutionNote:  null,
      survivorId:      null,
      mergedRecordId:  null,
    });
    console.log(`  ✓ Pair 1 created: ${ref1.id}`);
  } else {
    console.log(`  ℹ Pair 1 already exists: ${pair1Existing.id}`);
  }

  // ── Seed Pair 2: Name + DOB match ─────────────────────────────────────────
  console.log("\nSeeding Pair 2 — Name + DOB match...");
  const pair2Existing = existing.docs.find((d) => {
    const data = d.data();
    return (data.individualAId === indCId && data.individualBId === indDId) ||
           (data.individualAId === indDId && data.individualBId === indCId);
  });
  if (!pair2Existing) {
    const ref2 = await addDoc(collection(db, "duplicate_pairs"), {
      tenantId:        ORG_ID,
      orgId:           ORG_ID,
      individualAId:   indCId,
      individualAName: "Williams, Patricia",
      individualBId:   indDId,
      individualBName: "Williams, Patricia Ann",
      detectedAt:      serverTimestamp(),
      detectedBy:      "scheduled_scan",
      matchSignal:     "name_dob",
      medicaidIdMatch: false,
      nameDobMatch:    true,
      status:          "pending",
      resolvedAt:      null,
      resolvedBy:      null,
      resolvedByName:  null,
      resolutionNote:  null,
      survivorId:      null,
      mergedRecordId:  null,
    });
    console.log(`  ✓ Pair 2 created: ${ref2.id}`);
  } else {
    console.log(`  ℹ Pair 2 already exists: ${pair2Existing.id}`);
  }

  console.log("\n✅ Duplicate detection demo seed complete!");
  console.log("   AI banner will show: ⚠ 2 possible duplicates →");
  console.log("   Navigate to /people to see the banner chip.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
