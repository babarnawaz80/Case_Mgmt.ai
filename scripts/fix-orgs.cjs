#!/usr/bin/env node
/**
 * fix-orgs.cjs — Migrate users from org_demo_casemanagement_ai → demo-org-001
 * and delete the 3 stale individuals
 */
const path = require('path');
const fs = require('fs');
const https = require('https');

const PROJECT = 'casemanagement-ai';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

function getToken() {
  const configPath = path.join(process.env.HOME, '.config/configstore/firebase-tools.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return config.tokens?.access_token;
}
const TOKEN = getToken();

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + urlPath);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => res.statusCode >= 400 ? reject(new Error(`HTTP ${res.statusCode}: ${data}`)) : resolve(data ? JSON.parse(data) : {}));
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
  if (typeof val === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(val).map(([k, v]) => [k, toFS(v)])) } };
  return { stringValue: String(val) };
}
function fromFS(fv) {
  if (!fv) return null;
  if ('stringValue' in fv) return fv.stringValue;
  if ('integerValue' in fv) return parseInt(fv.integerValue);
  if ('doubleValue' in fv) return fv.doubleValue;
  if ('booleanValue' in fv) return fv.booleanValue;
  if ('nullValue' in fv) return null;
  if ('mapValue' in fv) { const o = {}; for (const [k,v] of Object.entries(fv.mapValue?.fields||{})) o[k]=fromFS(v); return o; }
  if ('arrayValue' in fv) return (fv.arrayValue?.values||[]).map(fromFS);
  return null;
}
function fromDoc(doc) { const o={id:doc.name?.split('/').pop()}; for(const[k,v] of Object.entries(doc.fields||{})) o[k]=fromFS(v); return o; }
function toFSDoc(obj) { const f={}; for(const[k,v] of Object.entries(obj)) f[k]=toFS(v); return {fields:f}; }

async function listDocs(col, pageSize=300) {
  const r = await request('GET', `/${col}?pageSize=${pageSize}`);
  return (r.documents||[]).map(fromDoc);
}
async function getDoc(col, id) {
  const r = await request('GET', `/${col}/${id}`);
  return fromDoc(r);
}
async function patchDoc(col, id, fields) {
  // Build updateMask query param
  const fieldList = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const body = toFSDoc(fields);
  await request('PATCH', `/${col}/${id}?${fieldList}`, body);
}
async function deleteDoc(col, id) {
  await request('DELETE', `/${col}/${id}`);
}

function log(msg) { console.log(`  ${msg}`); }

async function main() {
  console.log('='.repeat(60));
  console.log('  CaseManagement.AI — Org Migration Fix');
  console.log('='.repeat(60));

  // ── Step 1: Delete 3 stale individuals in org_demo_casemanagement_ai ──────
  console.log('\n[STEP 1] Deleting 3 stale individuals (org_demo_casemanagement_ai)…');
  const STALE_IND_IDS = ['438jFGOwRO8GoON7KD2Q', '5U60iJ0NFdFBm6Fju0Ex', 'h1AfLKZHJucu2NVkDYki'];
  for (const id of STALE_IND_IDS) {
    try {
      await deleteDoc('individuals', id);
      log(`✓ Deleted individual: ${id}`);
    } catch (e) {
      log(`⚠ Could not delete ${id}: ${e.message}`);
    }
  }

  // ── Step 2: Update all users with wrong orgId → demo-org-001 ─────────────
  console.log('\n[STEP 2] Migrating users from org_demo_casemanagement_ai → demo-org-001…');
  const users = await listDocs('users');
  const toMigrate = users.filter(u => u.organizationId === 'org_demo_casemanagement_ai');
  log(`Found ${toMigrate.length} user(s) to migrate`);

  for (const user of toMigrate) {
    await patchDoc('users', user.id, { organizationId: 'demo-org-001' });
    log(`✓ Updated user: ${user.id} (${user.email}) → demo-org-001`);
  }

  // Also fix org_casemanagement_ai users
  const orgCMUsers = users.filter(u => u.organizationId === 'org_casemanagement_ai');
  log(`\n  Also fixing ${orgCMUsers.length} users in org_casemanagement_ai → demo-org-001`);
  for (const user of orgCMUsers) {
    await patchDoc('users', user.id, { organizationId: 'demo-org-001' });
    log(`  ✓ Updated: ${user.id} (${user.email})`);
  }

  // ── Step 3: Delete stale org docs ─────────────────────────────────────────
  console.log('\n[STEP 3] Deleting stale org documents…');
  // Note: org_demo_casemanagement_ai was already deleted in seed script but may have come back
  const orgs = await listDocs('organizations');
  for (const org of orgs) {
    const name = org.name || org.displayName || '';
    if (org.id === 'org_demo_casemanagement_ai' || org.id === 'org_casemanagement_ai') {
      await deleteDoc('organizations', org.id);
      log(`✓ Deleted org: ${org.id} ("${name}")`);
    } else {
      log(`KEEP: ${org.id} ("${name}")`);
    }
  }

  // ── Step 4: Fix demo-org-001 credits ──────────────────────────────────────
  console.log('\n[STEP 4] Ensuring demo-org-001 has correct data…');
  await patchDoc('organizations', 'demo-org-001', {
    name: 'iCareManager Demo Agency',
    displayName: 'iCareManager Demo Agency',
    credits: 47237,
    ai_credits: 47237,
    plan: 'professional',
    state: 'MD',
    status: 'active',
  });
  log('✓ demo-org-001 updated with credits and metadata');

  // ── Step 5: Verify ────────────────────────────────────────────────────────
  console.log('\n[STEP 5] Verification…');
  const finalUsers = await listDocs('users');
  const finalInds = await listDocs('individuals');
  const finalOrgs = await listDocs('organizations');

  const usersOnDemoOrg = finalUsers.filter(u => u.organizationId === 'demo-org-001');
  const indsOnDemoOrg = finalInds.filter(i => i.organizationId === 'demo-org-001');
  const staleInds = finalInds.filter(i => i.organizationId !== 'demo-org-001');

  log(`Users on demo-org-001: ${usersOnDemoOrg.length}`);
  log(`Individuals on demo-org-001: ${indsOnDemoOrg.length}`);
  log(`Stale individuals (other orgs): ${staleInds.length}${staleInds.length > 0 ? ' ← ISSUE' : ''}`);
  log(`Organizations remaining: ${finalOrgs.length}`);
  for (const o of finalOrgs) log(`  - ${o.id}: "${o.name||o.displayName}"`);

  console.log('');
  const tests = [
    ['All users on demo-org-001', finalUsers.every(u => u.organizationId === 'demo-org-001')],
    ['18 individuals on demo-org-001', indsOnDemoOrg.length === 18],
    ['No stale individuals', staleInds.length === 0],
    ['Only 1-2 orgs remain', finalOrgs.length <= 2],
  ];
  for (const [label, pass] of tests) {
    console.log(`  ${pass ? '✅ PASS' : '❌ FAIL'} — ${label}`);
  }

  console.log('\n✅ Migration complete. Hard-refresh the app to see all 18 individuals.\n');
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
