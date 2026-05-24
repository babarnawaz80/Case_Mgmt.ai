#!/usr/bin/env node
// Demo Seed Script — CaseManagement.AI
// PRD v2.0 Section K2: Creates demo org, 3 users, 7 individuals
// Run: node scripts/seed-demo.js
// Requires: GOOGLE_APPLICATION_CREDENTIALS or firebase-admin default credentials

const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");

admin.initializeApp({ projectId: "casemanagement-ai" });
const db = admin.firestore();
const auth = getAuth();

// ─── Seed Data ────────────────────────────────────────────────────────────

const ORG_ID = "demo-org-001";

const ORG = {
  id: ORG_ID,
  name: "Sunrise Care Services",
  short_name: "Sunrise",
  npi: "1234567890",
  tax_id: "12-3456789",
  address: "1200 W Flagler St, Miami, FL 33135",
  phone: "(305) 555-0100",
  state: "FL",
  county: "Miami-Dade",
  payer_ids: ["medicaid_fl", "acha"],
  active: true,
  ai_features_enabled: true,
  credit_balance: 50000,
  total_credits_purchased: 50000,
  total_credits_used: 0,
  credit_alert_threshold_pct: 20,
  low_balance_alert_sent: false,
  daily_credit_limit: 0,
  plan_tier: "professional",
  billing_email: "billing@sunrisecare.example.com",
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
};

// 3 users per PRD K2
const USERS = [
  {
    email: "kathy@demo.casemanagement.ai",
    password: "Demo1234!",
    firstName: "Kathy",
    lastName: "Martinez",
    role: "case_manager",
    title: "Case Manager",
    phone: "(305) 555-0101",
    organizationId: ORG_ID,
    active: true,
  },
  {
    email: "jennie@demo.casemanagement.ai",
    password: "Demo1234!",
    firstName: "Jennie",
    lastName: "Thompson",
    role: "supervisor",
    title: "Supervisor",
    phone: "(305) 555-0102",
    organizationId: ORG_ID,
    active: true,
  },
  {
    email: "admin@demo.casemanagement.ai",
    password: "Demo1234!",
    firstName: "Admin",
    lastName: "User",
    role: "admin",
    title: "Platform Administrator",
    phone: "(305) 555-0103",
    organizationId: ORG_ID,
    active: true,
  },
];

// 7 individuals per PRD K2
const INDIVIDUALS_TEMPLATE = [
  {
    first_name: "Marcus",
    last_name: "Williams",
    preferred_name: "Marcus",
    dob: "1989-03-14",
    gender: "Male",
    medicaid_id: "FL-MCD-001234",
    diagnosis: "Intellectual Disability, Moderate; Autism Spectrum Disorder",
    risk_score: 72,
    county: "Miami-Dade",
    address: "456 NW 12th Ave, Miami, FL 33136",
    phone: "(305) 555-0201",
    enrollment_status: "active",
    program: "Home & Community-Based Services",
    level_of_care: "Level 4",
    companion_link_active: false,
    companion_token: null,
  },
  {
    first_name: "Diane",
    last_name: "Foster",
    preferred_name: "Di",
    dob: "1975-07-22",
    gender: "Female",
    medicaid_id: "FL-MCD-001235",
    diagnosis: "Down Syndrome; Hypothyroidism",
    risk_score: 58,
    county: "Miami-Dade",
    address: "789 SW 8th St, Miami, FL 33130",
    phone: "(305) 555-0202",
    enrollment_status: "active",
    program: "Supported Living",
    level_of_care: "Level 3",
    companion_link_active: true,
    companion_token: "companion_diane_" + Math.random().toString(36).substr(2, 12),
  },
  {
    first_name: "Robert",
    last_name: "Chen",
    preferred_name: "Bobby",
    dob: "2001-11-05",
    gender: "Male",
    medicaid_id: "FL-MCD-001236",
    diagnosis: "Autism Spectrum Disorder, Level 2; Anxiety Disorder",
    risk_score: 45,
    county: "Broward",
    address: "321 N Federal Hwy, Fort Lauderdale, FL 33301",
    phone: "(954) 555-0203",
    enrollment_status: "active",
    program: "Adult Day Training",
    level_of_care: "Level 2",
    companion_link_active: true,
    companion_token: "companion_robert_" + Math.random().toString(36).substr(2, 12),
  },
  {
    first_name: "Sandra",
    last_name: "Okafor",
    preferred_name: "Sandy",
    dob: "1968-05-30",
    gender: "Female",
    medicaid_id: "FL-MCD-001237",
    diagnosis: "Cerebral Palsy, Spastic Quadriplegia; Intellectual Disability",
    risk_score: 88,
    county: "Miami-Dade",
    address: "1100 NE 125th St, North Miami, FL 33161",
    phone: "(305) 555-0204",
    enrollment_status: "active",
    program: "Home & Community-Based Services",
    level_of_care: "Level 6",
    companion_link_active: false,
    companion_token: null,
  },
  {
    first_name: "James",
    last_name: "Rivera",
    preferred_name: "Jimmy",
    dob: "1995-08-18",
    gender: "Male",
    medicaid_id: "FL-MCD-001238",
    diagnosis: "Prader-Willi Syndrome; Obesity",
    risk_score: 63,
    county: "Palm Beach",
    address: "500 Okeechobee Blvd, West Palm Beach, FL 33401",
    phone: "(561) 555-0205",
    enrollment_status: "active",
    program: "Supported Employment",
    level_of_care: "Level 3",
    companion_link_active: true,
    companion_token: "companion_james_" + Math.random().toString(36).substr(2, 12),
  },
  {
    first_name: "Patricia",
    last_name: "Brooks",
    preferred_name: "Pat",
    dob: "1982-01-09",
    gender: "Female",
    medicaid_id: "FL-MCD-001239",
    diagnosis: "Intellectual Disability, Mild; Bipolar Disorder",
    risk_score: 55,
    county: "Miami-Dade",
    address: "220 SW 22nd Ave, Miami, FL 33135",
    phone: "(305) 555-0206",
    enrollment_status: "active",
    program: "Home & Community-Based Services",
    level_of_care: "Level 3",
    companion_link_active: false,
    companion_token: null,
  },
  {
    first_name: "Thomas",
    last_name: "Nguyen",
    preferred_name: "Tom",
    dob: "2003-04-27",
    gender: "Male",
    medicaid_id: "FL-MCD-001240",
    diagnosis: "Autism Spectrum Disorder, Level 1; ADHD",
    risk_score: 32,
    county: "Miami-Dade",
    address: "8800 SW 97th Ave, Miami, FL 33176",
    phone: "(305) 555-0207",
    enrollment_status: "transition",
    program: "Transition to Adult Services",
    level_of_care: "Level 1",
    companion_link_active: false,
    companion_token: null,
  },
];

// ─── Sample workflow tasks ─────────────────────────────────────────────────
function sampleTasks(individualId, caseManagerUid, orgId) {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return [
    {
      individualId,
      organizationId: orgId,
      assigned_to: caseManagerUid,
      created_by: caseManagerUid,
      title: "Schedule Annual PCP Review",
      description: "Contact family and schedule the annual person-centered plan review meeting.",
      task_type: "pcp_review",
      due_date: nextWeek.toISOString(),
      status: "pending_start",
      priority: "high",
      ai_generated: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      individualId,
      organizationId: orgId,
      assigned_to: caseManagerUid,
      created_by: caseManagerUid,
      title: "Verify Medicaid Eligibility",
      description: "Run eligibility verification before end of month.",
      task_type: "eligibility",
      due_date: lastWeek.toISOString(),
      status: "overdue",
      priority: "high",
      ai_generated: false,
      days_overdue: 7,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  ];
}

// ─── Main Seed Function ────────────────────────────────────────────────────
async function seed() {
  console.log("🌱 Starting CaseManagement.AI demo seed...\n");

  // 1. Create Organization
  console.log("📁 Creating organization: Sunrise Care Services");
  await db.collection("organizations").doc(ORG_ID).set(ORG);
  console.log("   ✅ Organization created\n");

  // 2. Create Firebase Auth users + Firestore user docs
  console.log("👥 Creating demo users...");
  const userUids = {};

  for (const user of USERS) {
    try {
      // Try to delete if exists
      try {
        const existing = await auth.getUserByEmail(user.email);
        await auth.deleteUser(existing.uid);
        console.log(`   ♻️  Deleted existing user: ${user.email}`);
      } catch (_) {
        // Doesn't exist, that's fine
      }

      const fbUser = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: `${user.firstName} ${user.lastName}`,
        emailVerified: true,
      });

      userUids[user.email] = fbUser.uid;

      await db.collection("users").doc(fbUser.uid).set({
        uid: fbUser.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: `${user.firstName} ${user.lastName}`,
        role: user.role,
        title: user.title,
        phone: user.phone,
        organizationId: user.organizationId,
        active: true,
        avatar_url: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: null,
      });

      console.log(`   ✅ ${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
    } catch (err) {
      console.error(`   ❌ Failed to create ${user.email}:`, err.message);
    }
  }

  const kathyUid = userUids["kathy@demo.casemanagement.ai"];
  const jennieUid = userUids["jennie@demo.casemanagement.ai"];
  console.log();

  // 3. Create Individuals
  console.log("🧑‍🤝‍🧑 Creating 7 demo individuals...");
  const individualIds = [];

  for (let i = 0; i < INDIVIDUALS_TEMPLATE.length; i++) {
    const tmpl = INDIVIDUALS_TEMPLATE[i];
    // Alternate assignments between kathy and jennie (jennie gets her own in supervisor view)
    const assignedCm = i < 5 ? kathyUid : jennieUid;

    const individualData = {
      ...tmpl,
      organizationId: ORG_ID,
      assigned_case_manager: assignedCm,
      assigned_supervisor: jennieUid,
      pcp_due_date: new Date(Date.now() + (30 + i * 15) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      last_visit_date: new Date(Date.now() - (7 + i * 3) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      next_visit_date: new Date(Date.now() + (7 + i * 5) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      monitoring_compliance_pct: 75 + Math.floor(Math.random() * 25),
      open_tasks: 2,
      open_incidents: i === 3 ? 1 : 0,
      alerts: i === 3 ? ["High risk — requires immediate follow-up"] : [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db.collection("individuals").add(individualData);
    individualIds.push(ref.id);
    console.log(`   ✅ ${tmpl.first_name} ${tmpl.last_name} — ID: ${ref.id}`);

    // Create workflow tasks
    const tasks = sampleTasks(ref.id, assignedCm, ORG_ID);
    for (const task of tasks) {
      await db.collection("workflow_tasks").add(task);
    }
  }
  console.log();

  // 4. Create AI config
  console.log("🤖 Writing AI routing config...");
  await db.collection("config").doc("ai_routing").set({
    default_tier: "fast",
    companion_tier: "companion",
    pcp_tier: "quality",
    enabled: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection("config").doc("credit_rates").set({
    gemini_flash_per_1k_tokens: 2,
    gemini_pro_per_1k_tokens: 10,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection("config").doc("credit_packs").set({
    packs: [
      { id: "starter", name: "Starter", credits: 10000, price_usd: 50, stripe_price_id: "price_starter" },
      { id: "growth", name: "Growth", credits: 25000, price_usd: 100, stripe_price_id: "price_growth" },
      { id: "professional", name: "Professional", credits: 75000, price_usd: 250, stripe_price_id: "price_professional" },
      { id: "enterprise", name: "Enterprise", credits: 200000, price_usd: 500, stripe_price_id: "price_enterprise" },
    ],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("   ✅ AI config written\n");

  // 5. Done!
  console.log("═══════════════════════════════════════════════════════════");
  console.log("✅ SEED COMPLETE — CaseManagement.AI demo environment ready");
  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("🔑 LOGIN CREDENTIALS:");
  console.log("   Case Manager : kathy@demo.casemanagement.ai  / Demo1234!");
  console.log("   Supervisor   : jennie@demo.casemanagement.ai / Demo1234!");
  console.log("   Admin        : admin@demo.casemanagement.ai  / Demo1234!");
  console.log("\n🌐 App URL: https://casemanagement-ai.web.app");
  console.log("   Custom: https://app.casemanagement.ai (after DNS)");
  console.log("\n🧑‍🤝‍🧑 Individuals seeded:", individualIds.length);
  console.log("   IDs:", individualIds.join(", "));
  console.log("\n⚠️  REMINDER: Enable Vertex AI API before testing AI features");
  console.log("   https://console.cloud.google.com → Vertex AI → Enable\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
