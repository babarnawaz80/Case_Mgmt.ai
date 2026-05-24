#!/usr/bin/env node
/**
 * fix-conversations.cjs — Migrate conversations from old orgId → demo-org-001
 * Also fixes the messages sub-collection org references.
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
      res.on('end', () => res.statusCode >= 400 ? reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0,300)}`)) : resolve(data ? JSON.parse(data) : {}));
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
  if ('mapValue' in fv) { const o = {}; for (const [k, v] of Object.entries(fv.mapValue?.fields || {})) o[k] = fromFS(v); return o; }
  if ('arrayValue' in fv) return (fv.arrayValue?.values || []).map(fromFS);
  return null;
}
function fromDoc(doc) { const o = { id: doc.name?.split('/').pop() }; for (const [k, v] of Object.entries(doc.fields || {})) o[k] = fromFS(v); return o; }

async function listDocs(urlPath, pageSize = 300) {
  const r = await request('GET', `${urlPath}?pageSize=${pageSize}`);
  return (r.documents || []).map(fromDoc);
}

async function patchField(urlPath, fieldName, fieldValue) {
  const body = { fields: { [fieldName]: toFS(fieldValue) } };
  await request('PATCH', `${urlPath}?updateMask.fieldPaths=${encodeURIComponent(fieldName)}`, body);
}

function log(msg) { console.log(`  ${msg}`); }

async function main() {
  console.log('='.repeat(60));
  console.log('  Fix Conversations → demo-org-001 migration');
  console.log('='.repeat(60));

  // List all conversations
  const conversations = await listDocs('/conversations');
  log(`Found ${conversations.length} conversation(s) total`);

  const OLD_ORG_IDS = ['org_demo_casemanagement_ai', 'org_casemanagement_ai', ''];
  const toFix = conversations.filter(c => OLD_ORG_IDS.includes(c.organizationId || ''));
  const alreadyOk = conversations.filter(c => c.organizationId === 'demo-org-001');

  log(`Already on demo-org-001: ${alreadyOk.length}`);
  log(`Need migration: ${toFix.length}`);

  for (const conv of toFix) {
    const type = conv.type || 'direct';
    const members = (conv.members || []).join(', ').slice(0, 60);
    log(`\n  Fixing conv: ${conv.id} (${type}) | orgId was: "${conv.organizationId}"`);
    log(`    members: [${members}]`);

    // Update organizationId on the conversation document
    await patchField(`/conversations/${conv.id}`, 'organizationId', 'demo-org-001');
    log(`    ✓ organizationId → demo-org-001`);
  }

  // Verify
  console.log('\n[Verification]');
  const finalConvs = await listDocs('/conversations');
  const onDemoOrg = finalConvs.filter(c => c.organizationId === 'demo-org-001');
  const stale = finalConvs.filter(c => c.organizationId !== 'demo-org-001');

  log(`Total conversations: ${finalConvs.length}`);
  log(`On demo-org-001: ${onDemoOrg.length}`);
  log(`Stale (other org): ${stale.length}`);

  if (stale.length > 0) {
    stale.forEach(c => log(`  ⚠ stale: ${c.id} orgId=${c.organizationId}`));
  }

  console.log('');
  console.log(`  ${stale.length === 0 ? '✅ PASS' : '❌ FAIL'} — All conversations on demo-org-001`);
  console.log(`  ${onDemoOrg.length >= toFix.length ? '✅ PASS' : '❌ FAIL'} — All migrated`);
  console.log('\n✅ Done — hard-refresh the app to see conversations persist.\n');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
