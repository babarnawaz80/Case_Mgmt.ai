#!/usr/bin/env node
/**
 * seed-rest.cjs  — Firestore seed via REST API (no service account needed)
 * Run with: node scripts/seed-rest.cjs
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT = 'casemanagement-ai';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// Get a fresh access token via Firebase CLI
function getAccessToken() {
  const configPath = path.join(process.env.HOME, '.config/configstore/firebase-tools.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return config.tokens?.access_token || config.tokens?.access_token;
}

const TOKEN = getAccessToken();

if (!TOKEN) {
  console.error('No access token found. Run: firebase login');
  process.exit(1);
}

// ── REST helpers ──────────────────────────────────────────────────────────────
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        } else {
          resolve(data ? JSON.parse(data) : {});
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function toFS(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFS) } };
  if (typeof val === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(val).map(([k, v]) => [k, toFS(v)])) } };
  }
  return { stringValue: String(val) };
}

function toFSDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toFS(v);
  }
  return { fields };
}

function fromFS(fv) {
  if (!fv) return null;
  if ('stringValue' in fv) return fv.stringValue;
  if ('integerValue' in fv) return parseInt(fv.integerValue);
  if ('doubleValue' in fv) return fv.doubleValue;
  if ('booleanValue' in fv) return fv.booleanValue;
  if ('nullValue' in fv) return null;
  if ('mapValue' in fv) {
    const obj = {};
    for (const [k, v] of Object.entries(fv.mapValue?.fields || {})) obj[k] = fromFS(v);
    return obj;
  }
  if ('arrayValue' in fv) return (fv.arrayValue?.values || []).map(fromFS);
  return null;
}

function fromFSDoc(doc) {
  const obj = { id: doc.name?.split('/').pop() };
  for (const [k, v] of Object.entries(doc.fields || {})) obj[k] = fromFS(v);
  return obj;
}

async function listDocs(collection) {
  const result = await request('GET', `/${collection}?pageSize=300`);
  return (result.documents || []).map(fromFSDoc);
}

async function setDoc(collection, id, data) {
  const url = `/${collection}/${id}`;
  await request('PATCH', url, toFSDoc(data));
}

async function deleteDoc(collection, id) {
  await request('DELETE', `/${collection}/${id}`);
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function log(msg) { console.log(`  ${msg}`); }

// ── TASK 2A — Clean organizations ─────────────────────────────────────────────
async function cleanOrganizations() {
  console.log('\n[TASK 2A] Cleaning organizations collection…');
  const orgs = await listDocs('organizations');
  log(`Found ${orgs.length} org(s)`);

  for (const org of orgs) {
    const name = org.name || org.displayName || '';
    const credits = org.credits || org.ai_credits || 0;
    log(`org: ${org.id} | "${name}" | credits: ${credits}`);

    // Delete "CaseManagement Demo Org" duplicates
    if (name.toLowerCase().includes('casemanagement demo org') ||
        name.toLowerCase().includes('case management demo org')) {
      await deleteDoc('organizations', org.id);
      log(`→ DELETED: "${name}" (${org.id})`);
    }
  }
  console.log('  ✓ Organizations cleaned');
}

// ── TASK 2B — Clean duplicate individuals ─────────────────────────────────────
async function cleanIndividuals() {
  console.log('\n[TASK 2B] Cleaning duplicate individuals…');
  const inds = await listDocs('individuals');
  log(`Found ${inds.length} individual doc(s)`);

  const keepPattern = /^ind-\d{3}$/;
  let deleted = 0;

  for (const ind of inds) {
    if (!keepPattern.test(ind.id)) {
      const name = `${ind.firstName || ind.first_name || ''} ${ind.lastName || ind.last_name || ''}`.trim();
      log(`→ DELETE duplicate: ${ind.id} (${name})`);
      await deleteDoc('individuals', ind.id);
      deleted++;
    }
  }
  log(`Deleted ${deleted} duplicate(s)`);
  console.log('  ✓ Individuals de-duplicated');
}

// ── TASK 2C — Fix ind-001 ─────────────────────────────────────────────────────
async function fixInd001() {
  console.log('\n[TASK 2C] Fixing ind-001 (Joseph Brown)…');
  await setDoc('individuals', 'ind-001', {
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
    companion_token: uuid(),
    companion_link_active: true,
  });
  console.log('  ✓ ind-001 fixed');
}

// ── TASK 3 — Seed 15 new individuals ─────────────────────────────────────────
const INDIVIDUALS = [
  { id:'ind-002', firstName:'Travis', lastName:'Langston', first_name:'Travis', last_name:'Langston', dob:'1984-07-22', gender:'Male', county:'Howard', program:'HCBS Waiver', risk_score:55, enrollment_status:'active' },
  { id:'ind-003', firstName:'Ashley', lastName:'Walker', first_name:'Ashley', last_name:'Walker', dob:'1997-02-14', gender:'Female', county:'Carroll', program:'Community Pathways', risk_score:42, enrollment_status:'active' },
  { id:'ind-004', firstName:'Maria', lastName:'Garcia', first_name:'Maria', last_name:'Garcia', preferredName:'Mari', dob:'1995-03-22', gender:'Female', county:'Baltimore', program:'Community Pathways', risk_score:45, enrollment_status:'active', assigned_case_manager:'kathy' },
  { id:'ind-005', firstName:'Robert', lastName:'Johnson', first_name:'Robert', last_name:'Johnson', dob:'1978-11-08', gender:'Male', county:'Carroll', program:'HCBS Waiver', risk_score:62, enrollment_status:'active' },
  { id:'ind-006', firstName:'Sarah', lastName:'Mitchell', first_name:'Sarah', last_name:'Mitchell', dob:'2001-06-14', gender:'Female', county:'Howard', program:'Family Support', risk_score:28, enrollment_status:'active' },
  { id:'ind-007', firstName:'David', lastName:'Williams', first_name:'David', last_name:'Williams', dob:'1990-09-30', gender:'Male', county:'Frederick', program:'Community Pathways', risk_score:55, enrollment_status:'active' },
  { id:'ind-008', firstName:'Jennifer', lastName:'Davis', first_name:'Jennifer', last_name:'Davis', dob:'1985-01-17', gender:'Female', county:'Anne Arundel', program:'Supported Living', risk_score:38, enrollment_status:'active' },
  { id:'ind-009', firstName:'Michael', lastName:'Thompson', first_name:'Michael', last_name:'Thompson', dob:'2003-04-05', gender:'Male', county:'Baltimore', program:'Community Pathways', risk_score:71, enrollment_status:'active', compliance_flag:'ISP overdue' },
  { id:'ind-010', firstName:'Lisa', lastName:'Anderson', first_name:'Lisa', last_name:'Anderson', dob:'1972-08-19', gender:'Female', county:'Carroll', program:'Aging and Disability', risk_score:82, enrollment_status:'active' },
  { id:'ind-011', firstName:'James', lastName:'Martinez', first_name:'James', last_name:'Martinez', dob:'1998-12-11', gender:'Male', county:'Harford', program:'Community Pathways', risk_score:33, enrollment_status:'active' },
  { id:'ind-012', firstName:'Patricia', lastName:'Taylor', first_name:'Patricia', last_name:'Taylor', dob:'1969-05-28', gender:'Female', county:'Montgomery', program:'HCBS Waiver', risk_score:58, enrollment_status:'transition' },
  { id:'ind-013', firstName:'Kevin', lastName:'Wilson', first_name:'Kevin', last_name:'Wilson', dob:'2005-02-14', gender:'Male', county:"Prince George's", program:'Family Support', risk_score:41, enrollment_status:'active' },
  { id:'ind-014', firstName:'Dorothy', lastName:'Brown', first_name:'Dorothy', last_name:'Brown', dob:'1955-07-03', gender:'Female', county:'Baltimore', program:'Aging and Disability', risk_score:77, enrollment_status:'active' },
  { id:'ind-015', firstName:'Christopher', lastName:'Lee', first_name:'Christopher', last_name:'Lee', dob:'1993-10-22', gender:'Male', county:'Howard', program:'Community Pathways', risk_score:49, enrollment_status:'active' },
  { id:'ind-016', firstName:'Michelle', lastName:'Harris', first_name:'Michelle', last_name:'Harris', dob:'2000-03-18', gender:'Female', county:'Carroll', program:'Supported Employment', risk_score:31, enrollment_status:'active' },
  { id:'ind-017', firstName:'Thomas', lastName:'Jackson', first_name:'Thomas', last_name:'Jackson', dob:'1987-06-09', gender:'Male', county:'Frederick', program:'HCBS Waiver', risk_score:65, enrollment_status:'active', compliance_flag:'Monitoring form due' },
  { id:'ind-018', firstName:'Nancy', lastName:'White', first_name:'Nancy', last_name:'White', dob:'1963-11-30', gender:'Female', county:'Anne Arundel', program:'Community Pathways', risk_score:44, enrollment_status:'active' },
];

async function seedIndividuals() {
  console.log('\n[TASK 3] Seeding individuals (upsert with organizationId)…');
  for (const ind of INDIVIDUALS) {
    const doc = {
      ...ind,
      organizationId: 'demo-org-001',
      companion_token: uuid(),
      companion_link_active: true,
    };
    await setDoc('individuals', ind.id, doc);
    log(`✓ ${ind.id}: ${ind.firstName} ${ind.lastName}`);
  }
  console.log('  ✓ All individuals seeded');
}

// ── TASK 4 — Verify ───────────────────────────────────────────────────────────
async function verify() {
  console.log('\n[TASK 4] Verifying result…');
  const inds = await listDocs('individuals');
  const orgInds = inds.filter(i => i.organizationId === 'demo-org-001');
  const withFlags = orgInds.filter(i => i.compliance_flag);
  const ind001 = orgInds.find(i => i.id === 'ind-001');

  log(`Total in demo-org-001: ${orgInds.length}`);
  log(`Compliance flags: ${withFlags.length} (${withFlags.map(i => `${i.id}:${i.compliance_flag}`).join(', ')})`);
  if (ind001) {
    log(`ind-001: firstName="${ind001.firstName}" lastName="${ind001.lastName}" risk=${ind001.risk_score}`);
  }

  console.log('');
  const tests = [
    ['18+ individuals present', orgInds.length >= 18],
    ['No duplicates (all IDs match ind-XXX pattern)', inds.every(i => /^ind-\d+$/.test(i.id))],
    ['ind-001 name correct', ind001?.firstName === 'Joseph' && ind001?.lastName === 'Brown'],
    ['Risk scores present', orgInds.every(i => i.risk_score !== undefined)],
    ['Compliance flags on ind-009 and ind-017', withFlags.some(i=>i.id==='ind-009') && withFlags.some(i=>i.id==='ind-017')],
  ];

  for (const [label, pass] of tests) {
    console.log(`  ${pass ? '✅ PASS' : '❌ FAIL'} — ${label}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(55));
  console.log('  CaseManagement.AI — Firestore Seed (REST API)');
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
    console.error(err.stack);
    process.exit(1);
  }
}

main();
