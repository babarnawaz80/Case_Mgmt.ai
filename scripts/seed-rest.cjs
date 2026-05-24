#!/usr/bin/env node
// Seed script using Firebase CLI's stored access token via REST API
// Avoids needing service account key or gcloud ADC

const https = require('https');
const fs = require('fs');
const os = require('os');

const PROJECT_ID = 'casemanagement-ai';
const ORG_ID = 'demo-org-001';

// Read Firebase CLI stored access token
const configPath = os.homedir() + '/.config/configstore/firebase-tools.json';
const cliConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const ACCESS_TOKEN = cliConfig.tokens.access_token;

if (!ACCESS_TOKEN) {
  console.error('❌ No access token found in Firebase CLI config');
  process.exit(1);
}

// ── REST Helpers ──────────────────────────────────────────────────────────────

function firestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return { integerValue: String(Math.round(val)) };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(firestoreValue) } };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = firestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) fields[k] = firestoreValue(v);
  }
  return { fields };
}

async function firestoreSet(collectionId, docId, data) {
  return new Promise((resolve, reject) => {
    const doc = toFirestoreDoc(data);
    const body = JSON.stringify(doc);
    const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionId}/${docId}`;
    
    const req = https.request({
      hostname: 'firestore.googleapis.com',
      path,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      }
    }, res => {
      let responseData = '';
      res.on('data', d => responseData += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`Firestore error ${res.statusCode}: ${responseData}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function identityToolkitRequest(path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request({
      hostname: 'identitytoolkit.googleapis.com',
      path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'X-Goog-User-Project': PROJECT_ID,
      }
    }, res => {
      let responseData = '';
      res.on('data', d => responseData += d);
      res.on('end', () => {
        const parsed = JSON.parse(responseData);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
        } else {
          reject(new Error(`Identity API ${res.statusCode}: ${JSON.stringify(parsed)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function lookupUserByEmail(email) {
  try {
    const res = await identityToolkitRequest(
      `/v1/projects/${PROJECT_ID}/accounts:lookup`,
      { email: [email] }
    );
    return res.users?.[0] || null;
  } catch {
    return null;
  }
}

async function deleteUser(localId) {
  try {
    await identityToolkitRequest(
      `/v1/projects/${PROJECT_ID}/accounts:delete`,
      { localId }
    );
  } catch (e) {
    // Ignore
  }
}

async function createUser({ email, password, displayName }) {
  const res = await identityToolkitRequest(
    `/v1/projects/${PROJECT_ID}/accounts`,
    { email, password, displayName, emailVerified: true }
  );
  return res.localId;
}

// ── Seed Data ────────────────────────────────────────────────────────────────

const USERS = [
  {
    email: 'kathy@demo.casemanagement.ai',
    password: 'Demo1234!',
    firstName: 'Kathy',
    lastName: 'Morrison',
    displayName: 'Kathy Morrison',
    role: 'case_manager',
  },
  {
    email: 'jennie@demo.casemanagement.ai',
    password: 'Demo1234!',
    firstName: 'Jennie',
    lastName: 'Park',
    displayName: 'Jennie Park',
    role: 'supervisor',
  },
  {
    email: 'admin@demo.casemanagement.ai',
    password: 'Demo1234!',
    firstName: 'Admin',
    lastName: 'User',
    displayName: 'Admin User',
    role: 'admin',
  },
];

async function seed() {
  console.log('🌱 Starting CaseManagement.AI demo seed (REST API)...\n');

  // 1. Create Organization
  console.log('📁 Creating organization...');
  await firestoreSet('organizations', ORG_ID, {
    id: ORG_ID,
    name: 'iCareManager Demo Agency',
    short_name: 'iCareManager',
    active: true,
    ai_features_enabled: true,
    credit_balance: 47240,
    state: 'TX',
    createdAt: new Date().toISOString(),
  });
  console.log('   ✅ Organization created: demo-org-001\n');

  // 2. Create Auth users + Firestore user docs
  console.log('👥 Creating demo users...');
  const userUids = {};

  for (const user of USERS) {
    try {
      // Check if user exists, delete if so
      const existing = await lookupUserByEmail(user.email);
      if (existing) {
        await deleteUser(existing.localId);
        console.log(`   ♻️  Deleted existing: ${user.email}`);
      }

      const uid = await createUser({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
      });
      userUids[user.email] = uid;

      await firestoreSet('users', uid, {
        uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        role: user.role,
        organizationId: ORG_ID,
        isActive: true,
        caseload: [],
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
      });

      console.log(`   ✅ ${user.role.padEnd(14)} ${user.email} (uid: ${uid})`);
    } catch (err) {
      console.error(`   ❌ Failed ${user.email}: ${err.message}`);
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
      assigned_case_manager: kathyUid || 'unknown',
      organizationId: ORG_ID,
      dob: '1985-03-15',
      gender: 'Male',
      diagnosis: 'Intellectual Disability',
      enrollment_status: 'active',
      open_tasks: 3,
      open_incidents: 1,
      alerts: ['PCP overdue — out of compliance'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ind-002',
      first_name: 'Travis',
      last_name: 'Langston',
      county: 'Dallas',
      risk_score: 42,
      status: 'active',
      pcp_status: 'off_track',
      assigned_case_manager: kathyUid || 'unknown',
      organizationId: ORG_ID,
      dob: '1990-07-22',
      gender: 'Male',
      diagnosis: 'Autism Spectrum Disorder',
      enrollment_status: 'active',
      open_tasks: 2,
      open_incidents: 0,
      alerts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ind-003',
      first_name: 'Ashley',
      last_name: 'Walker',
      county: 'Clinton',
      risk_score: 45,
      status: 'active',
      pcp_status: 'off_track',
      assigned_case_manager: kathyUid || 'unknown',
      organizationId: ORG_ID,
      dob: '1995-11-08',
      gender: 'Female',
      diagnosis: 'Cerebral Palsy',
      enrollment_status: 'active',
      open_tasks: 1,
      open_incidents: 0,
      alerts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const ind of individuals) {
    const { id, ...data } = ind;
    await firestoreSet('individuals', id, data);
    console.log(`   ✅ ${ind.first_name} ${ind.last_name} — ID: ${id}`);
  }
  console.log();

  // 4. Update Kathy's caseload
  if (kathyUid) {
    await firestoreSet('users', kathyUid, {
      uid: kathyUid,
      email: 'kathy@demo.casemanagement.ai',
      firstName: 'Kathy',
      lastName: 'Morrison',
      displayName: 'Kathy Morrison',
      role: 'case_manager',
      organizationId: ORG_ID,
      isActive: true,
      caseload: ['ind-001', 'ind-002', 'ind-003'],
      createdAt: new Date().toISOString(),
    });
    console.log('   ✅ Updated Kathy\'s caseload → [ind-001, ind-002, ind-003]\n');
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ SEED COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('🔑 LOGIN CREDENTIALS:');
  console.log('   Case Manager : kathy@demo.casemanagement.ai  / Demo1234!');
  console.log('   Supervisor   : jennie@demo.casemanagement.ai / Demo1234!');
  console.log('   Admin        : admin@demo.casemanagement.ai  / Demo1234!');
  console.log('\n👤 UIDs:');
  for (const [email, uid] of Object.entries(userUids)) {
    console.log(`   ${email}: ${uid}`);
  }

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message || err);
  process.exit(1);
});
