/**
 * seed-data.cjs
 * Run with: node scripts/seed-data.cjs
 * Uses firebase-admin from functions/node_modules with Application Default Credentials
 */

const path = require('path');
const admin = require(path.join(__dirname, '../functions/node_modules/firebase-admin'));

// ── Init ──────────────────────────────────────────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'casemanagement-ai',
  });
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ── Helpers ───────────────────────────────────────────────────────────────────
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function log(msg) { console.log(`  ${msg}`); }

// ── TASK 2A — Clean up organizations ─────────────────────────────────────────
async function cleanOrganizations() {
  console.log('\n[TASK 2A] Cleaning organizations collection…');
  const snap = await db.collection('organizations').get();
  log(`Found ${snap.size} org documents`);

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const name = data.name || data.displayName || '';
    const credits = data.credits || data.ai_credits || 0;
    log(`  org: ${docSnap.id} | "${name}" | credits: ${credits}`);

    // Delete duplicates: "CaseManagement Demo Org" entries
    if (name.toLowerCase().includes('casemanagement demo org') ||
        name.toLowerCase().includes('case management demo org')) {
      await docSnap.ref.delete();
      log(`  → DELETED: "${name}"`);
    }
  }

  console.log('  ✓ Organizations cleaned');
}

// ── TASK 2B — Clean up duplicate individuals ──────────────────────────────────
async function cleanIndividuals() {
  console.log('\n[TASK 2B] Cleaning individuals collection…');
  const snap = await db.collection('individuals').get();
  log(`Found ${snap.size} individual documents`);

  const keepIds = new Set(['ind-001', 'ind-002', 'ind-003',
    'ind-004','ind-005','ind-006','ind-007','ind-008','ind-009','ind-010',
    'ind-011','ind-012','ind-013','ind-014','ind-015','ind-016','ind-017','ind-018']);

  const deletePromises = [];
  for (const docSnap of snap.docs) {
    if (!keepIds.has(docSnap.id)) {
      log(`  → DELETE duplicate: ${docSnap.id}`);
      deletePromises.push(docSnap.ref.delete());
    }
  }
  await Promise.all(deletePromises);
  log(`  Deleted ${deletePromises.length} duplicate(s)`);
  console.log('  ✓ Individuals de-duplicated');
}

// ── TASK 2C — Fix ind-001 ────────────────────────────────────────────────────
async function fixInd001() {
  console.log('\n[TASK 2C] Fixing ind-001 (Joseph Brown)…');
  const ref = db.collection('individuals').doc('ind-001');
  const snap = await ref.get();
  if (!snap.exists) {
    log('  ind-001 does not exist — creating…');
  }
  await ref.set({
    id: 'ind-001',
    firstName: 'Joseph',
    lastName: 'Brown',
    first_name: 'Joseph',
    last_name: 'Brown',
    preferredName: 'Joe',
    dob: '1988-01-15',
    gender: 'Male',
    risk_score: 71,
    county: 'Carroll',
    enrollment_status: 'active',
    program: 'Community Pathways',
    organizationId: 'demo-org-001',
    companion_token: snap.exists ? (snap.data().companion_token || uuid()) : uuid(),
    companion_link_active: true,
    createdAt: snap.exists ? (snap.data().createdAt || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log('  ✓ ind-001 fixed');
}

// ── TASK 3 — Seed 15 new individuals ─────────────────────────────────────────
const NEW_INDIVIDUALS = [
  {
    id: 'ind-004', firstName: 'Maria', lastName: 'Garcia',
    first_name: 'Maria', last_name: 'Garcia',
    preferredName: 'Mari', dob: '1995-03-22', gender: 'Female',
    county: 'Baltimore', program: 'Community Pathways',
    risk_score: 45, enrollment_status: 'active',
    assigned_case_manager: 'kathy',
  },
  {
    id: 'ind-005', firstName: 'Robert', lastName: 'Johnson',
    first_name: 'Robert', last_name: 'Johnson',
    dob: '1978-11-08', gender: 'Male',
    county: 'Carroll', program: 'HCBS Waiver',
    risk_score: 62, enrollment_status: 'active',
  },
  {
    id: 'ind-006', firstName: 'Sarah', lastName: 'Mitchell',
    first_name: 'Sarah', last_name: 'Mitchell',
    dob: '2001-06-14', gender: 'Female',
    county: 'Howard', program: 'Family Support',
    risk_score: 28, enrollment_status: 'active',
  },
  {
    id: 'ind-007', firstName: 'David', lastName: 'Williams',
    first_name: 'David', last_name: 'Williams',
    dob: '1990-09-30', gender: 'Male',
    county: 'Frederick', program: 'Community Pathways',
    risk_score: 55, enrollment_status: 'active',
  },
  {
    id: 'ind-008', firstName: 'Jennifer', lastName: 'Davis',
    first_name: 'Jennifer', last_name: 'Davis',
    dob: '1985-01-17', gender: 'Female',
    county: 'Anne Arundel', program: 'Supported Living',
    risk_score: 38, enrollment_status: 'active',
  },
  {
    id: 'ind-009', firstName: 'Michael', lastName: 'Thompson',
    first_name: 'Michael', last_name: 'Thompson',
    dob: '2003-04-05', gender: 'Male',
    county: 'Baltimore', program: 'Community Pathways',
    risk_score: 71, enrollment_status: 'active',
    compliance_flag: 'ISP overdue',
  },
  {
    id: 'ind-010', firstName: 'Lisa', lastName: 'Anderson',
    first_name: 'Lisa', last_name: 'Anderson',
    dob: '1972-08-19', gender: 'Female',
    county: 'Carroll', program: 'Aging and Disability',
    risk_score: 82, enrollment_status: 'active',
  },
  {
    id: 'ind-011', firstName: 'James', lastName: 'Martinez',
    first_name: 'James', last_name: 'Martinez',
    dob: '1998-12-11', gender: 'Male',
    county: 'Harford', program: 'Community Pathways',
    risk_score: 33, enrollment_status: 'active',
  },
  {
    id: 'ind-012', firstName: 'Patricia', lastName: 'Taylor',
    first_name: 'Patricia', last_name: 'Taylor',
    dob: '1969-05-28', gender: 'Female',
    county: 'Montgomery', program: 'HCBS Waiver',
    risk_score: 58, enrollment_status: 'transition',
  },
  {
    id: 'ind-013', firstName: 'Kevin', lastName: 'Wilson',
    first_name: 'Kevin', last_name: 'Wilson',
    dob: '2005-02-14', gender: 'Male',
    county: "Prince George's", program: 'Family Support',
    risk_score: 41, enrollment_status: 'active',
  },
  {
    id: 'ind-014', firstName: 'Dorothy', lastName: 'Brown',
    first_name: 'Dorothy', last_name: 'Brown',
    dob: '1955-07-03', gender: 'Female',
    county: 'Baltimore', program: 'Aging and Disability',
    risk_score: 77, enrollment_status: 'active',
  },
  {
    id: 'ind-015', firstName: 'Christopher', lastName: 'Lee',
    first_name: 'Christopher', last_name: 'Lee',
    dob: '1993-10-22', gender: 'Male',
    county: 'Howard', program: 'Community Pathways',
    risk_score: 49, enrollment_status: 'active',
  },
  {
    id: 'ind-016', firstName: 'Michelle', lastName: 'Harris',
    first_name: 'Michelle', last_name: 'Harris',
    dob: '2000-03-18', gender: 'Female',
    county: 'Carroll', program: 'Supported Employment',
    risk_score: 31, enrollment_status: 'active',
  },
  {
    id: 'ind-017', firstName: 'Thomas', lastName: 'Jackson',
    first_name: 'Thomas', last_name: 'Jackson',
    dob: '1987-06-09', gender: 'Male',
    county: 'Frederick', program: 'HCBS Waiver',
    risk_score: 65, enrollment_status: 'active',
    compliance_flag: 'Monitoring form due',
  },
  {
    id: 'ind-018', firstName: 'Nancy', lastName: 'White',
    first_name: 'Nancy', last_name: 'White',
    dob: '1963-11-30', gender: 'Female',
    county: 'Anne Arundel', program: 'Community Pathways',
    risk_score: 44, enrollment_status: 'active',
  },
];

async function seedIndividuals() {
  console.log('\n[TASK 3] Seeding 15 new individuals…');
  const batch = db.batch();

  for (const ind of NEW_INDIVIDUALS) {
    const ref = db.collection('individuals').doc(ind.id);
    const existing = await ref.get();
    if (existing.exists) {
      log(`  SKIP: ${ind.id} (${ind.firstName} ${ind.lastName}) already exists`);
      continue;
    }
    const doc = {
      ...ind,
      organizationId: 'demo-org-001',
      companion_token: uuid(),
      companion_link_active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    batch.set(ref, doc);
    log(`  + ${ind.id}: ${ind.firstName} ${ind.lastName} (${ind.program}, risk: ${ind.risk_score})`);
  }

  await batch.commit();
  console.log('  ✓ Individuals seeded');
}

// ── TASK 4 — Verify ───────────────────────────────────────────────────────────
async function verify() {
  console.log('\n[TASK 4] Verifying…');
  const snap = await db.collection('individuals')
    .where('organizationId', '==', 'demo-org-001')
    .get();

  log(`Total individuals in demo-org-001: ${snap.size}`);

  const withFlags = snap.docs.filter(d => d.data().compliance_flag);
  log(`Compliance flags: ${withFlags.length} (${withFlags.map(d => d.id).join(', ')})`);

  const ind001 = snap.docs.find(d => d.id === 'ind-001');
  if (ind001) {
    const d = ind001.data();
    log(`ind-001: firstName="${d.firstName}" lastName="${d.lastName}" risk=${d.risk_score}`);
  }

  if (snap.size >= 18) {
    console.log('\n  ✅ PASS: 18+ individuals present');
  } else {
    console.log(`\n  ❌ FAIL: Only ${snap.size} individuals — expected 18`);
  }
}

// ── Run all tasks ─────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(55));
  console.log('  CaseManagement.AI — Firestore Seed Script');
  console.log('  Project: casemanagement-ai');
  console.log('='.repeat(55));

  try {
    await cleanOrganizations();
    await cleanIndividuals();
    await fixInd001();
    await seedIndividuals();
    await verify();
    console.log('\n✅ All tasks complete.\n');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
