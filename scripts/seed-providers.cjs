#!/usr/bin/env node
/**
 * seed-providers.cjs — Seeds 5 demo providers + Valentina Cruz individual_providers
 *
 * Run from scripts/ directory:
 *   node seed-providers.cjs
 */
"use strict";

const { initializeApp }   = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const {
  getFirestore, collection, doc, getDocs, setDoc, addDoc,
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

// ── Provider seed data ────────────────────────────────────────────────────────

const PROVIDERS = [
  {
    id: "abc_indiana_day_services",
    name: "ABC Indiana Day Services",
    type: "Day Services / Day Habilitation",
    npiNumber: "1234501001",
    medicaidProviderNumber: "IN-44201",
    street: "4800 N Keystone Ave",
    city: "Indianapolis",
    state: "IN",
    zip: "46205",
    county: "Marion",
    primaryPhone: "(317) 555-0150",
    email: "intake@abcindiana.org",
    website: "www.abcindiana.org",
    contactPersonName: "Sarah Mitchell",
    contactPersonTitle: "Program Director",
    contactPersonPhone: "(317) 555-0150",
    contactPersonEmail: "sarah@abcindiana.org",
    servicesOffered: ["Community Integration & Habilitation", "Day Services / Day Habilitation"],
    geographicCoverage: ["Marion", "Hamilton", "Hendricks"],
    statesCovered: ["IN"],
    populationsServed: ["IDD"],
    ageMin: 18,
    ageMax: null,
    languages: ["English"],
    isAcceptingClients: "yes",
    currentOpenings: 8,
    typicalStartTime: "2-4 weeks",
    waitlistEstimate: null,
    medicaidContracted: true,
    contractStatus: "active",
    contractStartDate: "2026-01-01",
    contractEndDate: "2026-12-31",
    acceptedFundingSources: ["Medicaid Waiver"],
    rateNotes: "Daily rate: $95. Billing code: T2021.",
    internalNotes: "Strong partner for community integration. Sarah Mitchell is responsive. Submit referrals 2 weeks in advance.",
    status: "active",
    orgId: ORG_ID,
    referralCount: 5,
    currentIndividualCount: 3,
  },
  {
    id: "hoosier_supported_employment",
    name: "Hoosier Supported Employment",
    type: "Employment & Vocational",
    npiNumber: "1234502002",
    medicaidProviderNumber: "IN-44305",
    street: "3200 E 96th St Suite 200",
    city: "Indianapolis",
    state: "IN",
    zip: "46240",
    county: "Marion",
    primaryPhone: "(317) 555-0198",
    email: "intake@hoosieremployment.org",
    website: "www.hoosieremployment.org",
    contactPersonName: "Derek Young",
    contactPersonTitle: "Intake Coordinator",
    contactPersonPhone: "(317) 555-0198",
    contactPersonEmail: "derek@hoosieremployment.org",
    servicesOffered: ["Supported Employment — Individual", "Job Development"],
    geographicCoverage: ["Marion", "Hamilton"],
    statesCovered: ["IN"],
    populationsServed: ["IDD", "Behavioral Health"],
    ageMin: 18,
    ageMax: null,
    languages: ["English", "Spanish"],
    isAcceptingClients: "yes",
    currentOpenings: 5,
    typicalStartTime: "2-4 weeks",
    waitlistEstimate: null,
    medicaidContracted: true,
    contractStatus: "active",
    contractStartDate: "2026-01-01",
    contractEndDate: "2026-12-31",
    acceptedFundingSources: ["Medicaid Waiver", "State Funds"],
    rateNotes: "Per 15-min unit: $7.50. Billing code: H2023.",
    internalNotes: "Derek Young is very responsive. Good track record with IDD + BH populations. Call before referring.",
    status: "active",
    orgId: ORG_ID,
    referralCount: 8,
    currentIndividualCount: 4,
  },
  {
    id: "indiana_behavioral_wellness",
    name: "Indiana Behavioral Wellness",
    type: "Behavioral Health",
    npiNumber: "1234503003",
    medicaidProviderNumber: "IN-44412",
    street: "9102 N Meridian St",
    city: "Indianapolis",
    state: "IN",
    zip: "46260",
    county: "Marion",
    primaryPhone: "(317) 555-0217",
    email: "referrals@ibwellness.org",
    website: "www.ibwellness.org",
    contactPersonName: "Dr. Anita Patel",
    contactPersonTitle: "Clinical Director",
    contactPersonPhone: "(317) 555-0217",
    contactPersonEmail: "apatel@ibwellness.org",
    servicesOffered: ["Behavioral Health", "Therapy (OT/PT/Speech)", "Community Habilitation"],
    geographicCoverage: ["Marion", "Boone", "Hamilton"],
    statesCovered: ["IN"],
    populationsServed: ["IDD", "Behavioral Health", "TBI"],
    ageMin: 5,
    ageMax: null,
    languages: ["English"],
    isAcceptingClients: "yes",
    currentOpenings: 3,
    typicalStartTime: "1-2 weeks",
    waitlistEstimate: null,
    medicaidContracted: true,
    contractStatus: "active",
    contractStartDate: "2026-01-01",
    contractEndDate: "2026-12-31",
    acceptedFundingSources: ["Medicaid Waiver", "Private Pay"],
    rateNotes: "Monthly consult: $250. Crisis services billed separately.",
    internalNotes: "Dr. Patel specializes in IDD/BH dual diagnoses. Excellent communication. Prefer email referrals.",
    status: "active",
    orgId: ORG_ID,
    referralCount: 6,
    currentIndividualCount: 3,
  },
  {
    id: "carroll_county_employment",
    name: "Carroll County Employment Services",
    type: "Employment & Vocational",
    npiNumber: "1234504004",
    medicaidProviderNumber: "MD-12345",
    street: "121 N Center St",
    city: "Westminster",
    state: "MD",
    zip: "21157",
    county: "Carroll",
    primaryPhone: "(410) 555-0142",
    email: "intake@ccemployment.org",
    website: "www.ccemployment.org",
    contactPersonName: "James Walsh",
    contactPersonTitle: "Program Director",
    contactPersonPhone: "(410) 555-0142",
    contactPersonEmail: "jwalsh@ccemployment.org",
    servicesOffered: ["Supported Employment — Individual", "Supported Employment — Small Group", "Job Development"],
    geographicCoverage: ["Carroll", "Frederick", "Howard"],
    statesCovered: ["MD"],
    populationsServed: ["IDD", "Behavioral Health"],
    ageMin: 18,
    ageMax: null,
    languages: ["English", "Spanish"],
    isAcceptingClients: "yes",
    currentOpenings: 12,
    typicalStartTime: "2-3 weeks",
    waitlistEstimate: null,
    medicaidContracted: true,
    contractStatus: "active",
    contractStartDate: "2026-01-01",
    contractEndDate: "2026-12-31",
    acceptedFundingSources: ["Medicaid Waiver"],
    rateNotes: "Strong partner for mild-moderate IDD. James Walsh is responsive and communicates well. Call before submitting referral to verify capacity.",
    internalNotes: "Strong partner for individuals with mild-moderate IDD. James Walsh is responsive and communicates well. Call before submitting referral to verify capacity.",
    status: "active",
    orgId: ORG_ID,
    referralCount: 12,
    currentIndividualCount: 3,
  },
  {
    id: "bridgeworks_vocational",
    name: "BridgeWorks Vocational Training",
    type: "Employment & Vocational",
    npiNumber: "1234505005",
    medicaidProviderNumber: "MD-23456",
    street: "5300 Sykesville Rd",
    city: "Sykesville",
    state: "MD",
    zip: "21784",
    county: "Carroll",
    primaryPhone: "(410) 555-0188",
    email: "info@bridgeworksvoc.org",
    website: "www.bridgeworksvoc.org",
    contactPersonName: "Linda Park",
    contactPersonTitle: "Program Coordinator",
    contactPersonPhone: "(410) 555-0188",
    contactPersonEmail: "lpark@bridgeworksvoc.org",
    servicesOffered: ["Supported Employment — Individual", "Supported Employment — Small Group"],
    geographicCoverage: ["Carroll", "Baltimore"],
    statesCovered: ["MD"],
    populationsServed: ["IDD"],
    ageMin: 16,
    ageMax: null,
    languages: ["English"],
    isAcceptingClients: "yes",
    currentOpenings: 6,
    typicalStartTime: "2-4 weeks",
    waitlistEstimate: null,
    medicaidContracted: true,
    contractStatus: "active",
    contractStartDate: "2026-01-01",
    contractEndDate: "2026-12-31",
    acceptedFundingSources: ["Medicaid Waiver", "State Funds"],
    rateNotes: "Per 15-min unit: $7.25.",
    internalNotes: "Good for small-group employment. Linda Park is easy to work with.",
    status: "active",
    orgId: ORG_ID,
    referralCount: 4,
    currentIndividualCount: 1,
  },
];

// ── Run seed ──────────────────────────────────────────────────────────────────

async function run() {
  console.log("Authenticating...");
  await signInWithEmailAndPassword(auth, "kathy@demo.casemanagement.ai", "Demo1234!");
  console.log("Authenticated as Kathy.");

  // ── 1. Seed providers ──────────────────────────────────────────────────────
  console.log("\nSeeding providers...");
  for (const p of PROVIDERS) {
    const { id, ...data } = p;
    await setDoc(doc(db, "providers", id), {
      ...data,
      addedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`  ✓ ${p.name}`);
  }

  // ── 2. Find Valentina Cruz ─────────────────────────────────────────────────
  console.log("\nLooking up Valentina Cruz...");
  let valentinaId = null;

  const snap = await getDocs(
    query(collection(db, "individuals"),
      where("organizationId", "==", ORG_ID),
      where("first_name", "==", "Valentina")
    )
  );

  if (!snap.empty) {
    // Pick the one with last_name Cruz if multiple
    const hit = snap.docs.find(d => d.data().last_name === "Cruz") ?? snap.docs[0];
    valentinaId = hit.id;
    console.log(`  Found Valentina Cruz — ID: ${valentinaId}`);
  } else {
    // Try alternate first name
    const snap2 = await getDocs(
      query(collection(db, "individuals"),
        where("organizationId", "==", ORG_ID),
        where("last_name", "==", "Cruz")
      )
    );
    if (!snap2.empty) {
      valentinaId = snap2.docs[0].id;
      console.log(`  Found Cruz individual — ID: ${valentinaId}`);
    } else {
      console.warn("  ⚠ Valentina Cruz not found. Skipping individual_providers seed.");
    }
  }

  // ── 3. Seed individual_providers for Valentina Cruz ────────────────────────
  if (valentinaId) {
    console.log("\nSeeding individual_providers for Valentina Cruz...");

    const links = [
      {
        individualId: valentinaId,
        providerId: "abc_indiana_day_services",
        providerName: "ABC Indiana Day Services",
        providerType: "Day Services / Day Habilitation",
        serviceProvided: "Community Integration & Habilitation",
        authorizationId: null,
        authorizationNumber: "AUTH-2026-124",
        startDate: "2026-01-15",
        endDate: null,
        contactPersonOverride: "Sarah Mitchell",
        contactPhoneOverride: "(317) 555-0150",
        contactEmailOverride: "sarah@abcindiana.org",
        notes: "Monday–Thursday 9am–3pm. Transport provided.",
        status: "active",
        endReason: null,
        orgId: ORG_ID,
      },
      {
        individualId: valentinaId,
        providerId: "hoosier_supported_employment",
        providerName: "Hoosier Supported Employment",
        providerType: "Employment & Vocational",
        serviceProvided: "Supported Employment — Individual",
        authorizationId: null,
        authorizationNumber: "AUTH-2026-125",
        startDate: "2026-03-01",
        endDate: null,
        contactPersonOverride: "Derek Young",
        contactPhoneOverride: "(317) 555-0198",
        contactEmailOverride: "derek@hoosieremployment.org",
        notes: "Job placement focus: food service / retail. 20 hrs/week goal.",
        status: "active",
        endReason: null,
        orgId: ORG_ID,
      },
      {
        individualId: valentinaId,
        providerId: "indiana_behavioral_wellness",
        providerName: "Indiana Behavioral Wellness",
        providerType: "Behavioral Health",
        serviceProvided: "Behavioral Support — Monthly Consult",
        authorizationId: null,
        authorizationNumber: "AUTH-2026-126",
        startDate: "2026-02-01",
        endDate: null,
        contactPersonOverride: "Dr. Anita Patel",
        contactPhoneOverride: "(317) 555-0217",
        contactEmailOverride: "apatel@ibwellness.org",
        notes: "Monthly 60-min behavioral consult. BSP review quarterly.",
        status: "active",
        endReason: null,
        orgId: ORG_ID,
      },
    ];

    // Clear existing links for this individual first
    const existingSnap = await getDocs(
      query(collection(db, "individual_providers"),
        where("individualId", "==", valentinaId)
      )
    );
    console.log(`  Clearing ${existingSnap.size} existing links...`);

    for (const link of links) {
      await addDoc(collection(db, "individual_providers"), {
        ...link,
        addedBy: "seed-script",
        addedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`  ✓ ${link.providerName} — ${link.serviceProvided}`);
    }
  }

  console.log("\n✅ Provider seed complete!");
  process.exit(0);
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
