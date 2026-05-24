#!/usr/bin/env node
// Seed script using Firebase CLI's stored OAuth refresh token
// Run: node repo/scripts/seed-with-cli-token.cjs

const admin = require('firebase-admin');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Load the Firebase CLI refresh token
const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const { refresh_token } = config.tokens;

if (!refresh_token) {
  console.error('❌ No refresh token found. Run: npx firebase-tools login');
  process.exit(1);
}

// Initialize with refresh token credential
admin.initializeApp({
  credential: admin.credential.refreshToken({
    type: 'authorized_user',
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8leyL02xLGnEAh6gN',
    refresh_token,
  }),
  projectId: 'casemanagement-ai',
});

const db = admin.firestore();
const auth = admin.auth();

const ORG_ID = 'demo-org-001';

const USERS = [
  {
    email: 'kathy@demo.casemanagement.ai',
    password: 'Demo1234!',
    firstName: 'Kathy',
    lastName: 'Morrison',
    displayName: 'Kathy Morrison',
    role: 'case_manager',
    organizationId: ORG_ID,
  },
  {
    email: 'jennie@demo.casemanagement.ai',
    password: 'Demo1234!',
    firstName: 'Jennie',
    lastName: 'Park',
    displayName: 'Jennie Park',
    role: 'supervisor',
    organizationId: ORG_ID,
  },
  {
    email: 'admin@demo.casemanagement.ai',
    password: 'Demo1234!',
    firstName: 'Admin',
    lastName: 'User',
    displayName: 'Admin User',
    role: 'admin',
    organizationId: ORG_ID,
  },
];

async function seed() {
  console.log('🌱 Starting CaseManagement.AI demo seed...\n');

  // 1. Create Organization
  console.log('📁 Creating organization: iCareManager Demo Agency');
  await db.collection('organizations').doc(ORG_ID).set({
    id: ORG_ID,
    name: 'iCareManager Demo Agency',
    short_name: 'iCareManager',
    active: true,
    ai_features_enabled: true,
    credit_balance: 47240,
    state: 'TX',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('   ✅ Organization created\n');

  // 2. Create Firebase Auth users + Firestore user docs
  console.log('👥 Creating demo users...');
  const userUids = {};

  for (const user of USERS) {
    try {
      // Delete existing user if present
      try {
        const existing = await auth.getUserByEmail(user.email);
        await auth.deleteUser(existing.uid);
        console.log(`   ♻️  Deleted existing: ${user.email}`);
      } catch (_) {
        // Doesn't exist — fine
      }

      const fbUser = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
        emailVerified: true,
      });

      userUids[user.email] = fbUser.uid;

      await db.collection('users').doc(fbUser.uid).set({
        uid: fbUser.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        role: user.role,
        organizationId: user.organizationId,
        isActive: true,
        caseload: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: null,
      });

      console.log(`   ✅ ${user.role.padEnd(14)} ${user.email} / ${user.password}`);
    } catch (err) {
      console.error(`   ❌ Failed to create ${user.email}:`, err.message);
    }
  }

  const kathyUid = userUids['kathy@demo.casemanagement.ai'];
  console.log();

  // 3. Create Individuals
  console.log('🧑‍🤝‍🧑 Creating 3 demo individuals...');

  const individuals = [
    {
      id: 'ind-001',
      first_name: 'Joseph',
      last_name: 'Brown',
      county: 'Carroll',
      risk_score: 71,
      status: 'active',
      pcp_status: 'out_of_compliance',
      assigned_case_manager: kathyUid,
      organizationId: ORG_ID,
      dob: '1985-03-15',
      gender: 'Male',
      diagnosis: 'Intellectual Disability',
      enrollment_status: 'active',
      open_tasks: 3,
      open_incidents: 1,
      alerts: ['PCP overdue — out of compliance'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      id: 'ind-002',
      first_name: 'Travis',
      last_name: 'Langston',
      county: 'Dallas',
      risk_score: 42,
      status: 'active',
      pcp_status: 'off_track',
      assigned_case_manager: kathyUid,
      organizationId: ORG_ID,
      dob: '1990-07-22',
      gender: 'Male',
      diagnosis: 'Autism Spectrum Disorder',
      enrollment_status: 'active',
      open_tasks: 2,
      open_incidents: 0,
      alerts: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      id: 'ind-003',
      first_name: 'Ashley',
      last_name: 'Walker',
      county: 'Clinton',
      risk_score: 45,
      status: 'active',
      pcp_status: 'off_track',
      assigned_case_manager: kathyUid,
      organizationId: ORG_ID,
      dob: '1995-11-08',
      gender: 'Female',
      diagnosis: 'Cerebral Palsy',
      enrollment_status: 'active',
      open_tasks: 1,
      open_incidents: 0,
      alerts: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  ];

  for (const ind of individuals) {
    const { id, ...data } = ind;
    await db.collection('individuals').doc(id).set(data);
    console.log(`   ✅ ${ind.first_name} ${ind.last_name} — ID: ${id}`);
  }
  console.log();

  // 4. Update Kathy's caseload
  if (kathyUid) {
    await db.collection('users').doc(kathyUid).update({
      caseload: ['ind-001', 'ind-002', 'ind-003'],
    });
    console.log('   ✅ Updated Kathy\'s caseload\n');
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ SEED COMPLETE — CaseManagement.AI demo environment ready');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('🔑 LOGIN CREDENTIALS:');
  console.log('   Case Manager : kathy@demo.casemanagement.ai  / Demo1234!');
  console.log('   Supervisor   : jennie@demo.casemanagement.ai / Demo1234!');
  console.log('   Admin        : admin@demo.casemanagement.ai  / Demo1234!');
  console.log('\n🌐 App URL: https://app.casemanagement.ai');
  console.log('\n👤 UIDs created:');
  for (const [email, uid] of Object.entries(userUids)) {
    console.log(`   ${email}: ${uid}`);
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message || err);
  process.exit(1);
});
