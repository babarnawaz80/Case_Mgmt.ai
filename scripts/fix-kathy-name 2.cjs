#!/usr/bin/env node
/**
 * fix-kathy-name.cjs
 * Find the Firestore user document for kathy@demo.casemanagement.ai
 * and update firstName/displayName to match the desired display name.
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
    const url = new URL(`${BASE}${urlPath}`);
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
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const TARGET_EMAIL = 'kathy@demo.casemanagement.ai';
  const NEW_FIRST = 'Babar';
  const NEW_LAST  = 'Nawaz';
  const NEW_DISPLAY = `${NEW_FIRST} ${NEW_LAST}`;

  console.log(`Searching users collection for email: ${TARGET_EMAIL}`);

  // Query users where email == TARGET_EMAIL
  const queryPath = `:runQuery`;
  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: 'users' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'email' },
          op: 'EQUAL',
          value: { stringValue: TARGET_EMAIL },
        },
      },
      limit: 5,
    },
  };

  const res = await request('POST', queryPath, queryBody);
  if (res.status !== 200) {
    console.error('Query failed:', res.status, JSON.stringify(res.body));
    process.exit(1);
  }

  const docs = res.body.filter(r => r.document);
  if (docs.length === 0) {
    console.log('No user document found for', TARGET_EMAIL);
    process.exit(1);
  }

  for (const { document: doc } of docs) {
    const docPath = doc.name.replace(`projects/${PROJECT}/databases/(default)/documents`, '');
    const uid = docPath.split('/').pop();
    const cur = doc.fields;
    console.log(`Found: ${docPath}`);
    console.log(`  Current firstName: ${cur.firstName?.stringValue ?? '(none)'}`);
    console.log(`  Current displayName: ${cur.displayName?.stringValue ?? '(none)'}`);
    console.log(`  Role: ${cur.role?.stringValue ?? '(none)'}`);

    // PATCH just the name fields
    const patchPath = `${docPath}?updateMask.fieldPaths=firstName&updateMask.fieldPaths=lastName&updateMask.fieldPaths=displayName&updateMask.fieldPaths=updatedAt`;
    const patchBody = {
      fields: {
        firstName:   { stringValue: NEW_FIRST },
        lastName:    { stringValue: NEW_LAST  },
        displayName: { stringValue: NEW_DISPLAY },
        updatedAt:   { stringValue: new Date().toISOString() },
      },
    };

    const patchRes = await request('PATCH', patchPath, patchBody);
    if (patchRes.status === 200) {
      console.log(`✅  Updated ${uid}: firstName → "${NEW_FIRST}", displayName → "${NEW_DISPLAY}"`);
    } else {
      console.error(`❌  Patch failed for ${uid}:`, patchRes.status, JSON.stringify(patchRes.body));
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
