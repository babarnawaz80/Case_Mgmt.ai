#!/usr/bin/env node
/**
 * diagnose.cjs — Check what orgId the current users have and fix seeding
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

async function listDocs(col, pageSize=300) {
  const r = await request('GET', `/${col}?pageSize=${pageSize}`);
  return (r.documents||[]).map(fromDoc);
}

async function main() {
  console.log('\n=== USERS ===');
  const users = await listDocs('users');
  console.log(`Found ${users.length} users`);
  for (const u of users) {
    console.log(`  ${u.id} | email: ${u.email||u.displayName} | role: ${u.role} | orgId: ${u.organizationId}`);
  }

  console.log('\n=== ORGANIZATIONS ===');
  const orgs = await listDocs('organizations');
  for (const o of orgs) {
    console.log(`  ${o.id} | "${o.name||o.displayName}" | credits: ${o.credits||o.ai_credits||0}`);
  }

  console.log('\n=== INDIVIDUALS (by organizationId) ===');
  const inds = await listDocs('individuals');
  const byOrg = {};
  for (const i of inds) {
    const org = i.organizationId || 'NO_ORG';
    if (!byOrg[org]) byOrg[org] = [];
    byOrg[org].push(`${i.id}: ${i.firstName||i.first_name} ${i.lastName||i.last_name}`);
  }
  for (const [org, people] of Object.entries(byOrg)) {
    console.log(`\n  org: ${org} (${people.length} people)`);
    people.forEach(p => console.log(`    ${p}`));
  }
}

main().catch(console.error);
