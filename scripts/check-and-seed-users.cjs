#!/usr/bin/env node
/**
 * check-and-seed-users.js
 * Uses Firebase CLI's stored access token to check/create Firestore user profiles.
 * Run: node scripts/check-and-seed-users.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Read firebase-tools config to get access token
const configPath = path.join(process.env.HOME, '.config', 'configstore', 'firebase-tools.json');
let token;
try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  token = config.tokens?.access_token;
  if (!token) {
    console.error('❌ No access token found. Run: npx firebase-tools login');
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Could not read firebase-tools config:', e.message);
  process.exit(1);
}

const PROJECT_ID = 'casemanagement-ai';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Demo users from auth export
const USERS = [
  {
    uid: 'TzFYFn1unMMNjVZoJqxyYP6S8m62',
    email: 'kathy@demo.casemanagement.ai',
    firstName: 'Kathy',
    lastName: 'Martinez',
    displayName: 'Kathy Martinez',
    role: 'case_manager',
    title: 'Case Manager',
    phone: '(305) 555-0101',
    organizationId: 'demo-org-001',
  },
  {
    uid: 'lUILCHTwWKV9tYsxjxmBCy81ei13',
    email: 'jennie@demo.casemanagement.ai',
    firstName: 'Jennie',
    lastName: 'Thompson',
    displayName: 'Jennie Thompson',
    role: 'supervisor',
    title: 'Supervisor',
    phone: '(305) 555-0102',
    organizationId: 'demo-org-001',
  },
  {
    uid: 'thulqShiwFZZ69SGcJWm9NEM2WV2',
    email: 'admin@demo.casemanagement.ai',
    firstName: 'Admin',
    lastName: 'User',
    displayName: 'Admin User',
    role: 'admin',
    title: 'Platform Administrator',
    phone: '(305) 555-0103',
    organizationId: 'demo-org-001',
  },
];

const ORG = {
  name: 'Sunrise Care Services',
  short_name: 'Sunrise',
  npi: '1234567890',
  tax_id: '12-3456789',
  address: '1200 W Flagler St, Miami, FL 33135',
  phone: '(305) 555-0100',
  state: 'FL',
  county: 'Miami-Dade',
  active: true,
  ai_features_enabled: true,
  credit_balance: 50000,
  total_credits_purchased: 50000,
  total_credits_used: 0,
  credit_alert_threshold_pct: 20,
  low_balance_alert_sent: false,
  daily_credit_limit: 0,
  plan_tier: 'professional',
  billing_email: 'billing@sunrisecare.example.com',
};

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(FIRESTORE_BASE + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function toFirestoreDoc(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (typeof value === 'number') {
      fields[key] = { integerValue: String(value) };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = { arrayValue: { values: value.map(v => ({ stringValue: String(v) })) } };
    }
  }
  return { fields };
}

async function checkAndCreateDoc(collectionPath, docId, data) {
  const getRes = await makeRequest('GET', `/${collectionPath}/${docId}`);
  if (getRes.status === 200) {
    console.log(`   ✅ EXISTS: ${collectionPath}/${docId}`);
    return false;
  }
  // Create the document
  const patchRes = await makeRequest('PATCH', `/${collectionPath}/${docId}`, toFirestoreDoc(data));
  if (patchRes.status === 200) {
    console.log(`   ✅ CREATED: ${collectionPath}/${docId}`);
    return true;
  } else {
    console.error(`   ❌ FAILED to create ${collectionPath}/${docId}:`, patchRes.status, JSON.stringify(patchRes.body).substring(0, 200));
    return false;
  }
}

async function main() {
  console.log('🔍 Checking & seeding CaseManagement.AI demo data...\n');

  // 1. Check/create organization
  console.log('📁 Organization (demo-org-001):');
  await checkAndCreateDoc('organizations', 'demo-org-001', ORG);
  console.log();

  // 2. Check/create user profiles
  console.log('👥 User profiles:');
  for (const user of USERS) {
    const { uid, ...profileData } = user;
    await checkAndCreateDoc('users', uid, {
      ...profileData,
      uid,
      active: true,
      isActive: true,
      avatar_url: null,
      caseload: [],
    });
  }
  console.log();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ DONE — Demo data verified/created');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('🔑 LOGIN CREDENTIALS:');
  console.log('   Case Manager : kathy@demo.casemanagement.ai  / Demo1234!');
  console.log('   Supervisor   : jennie@demo.casemanagement.ai / Demo1234!');
  console.log('   Admin        : admin@demo.casemanagement.ai  / Demo1234!');
  console.log('\n🌐 App URL: https://casemanagement-ai.web.app');
}

main().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
