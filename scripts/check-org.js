// check-org.js — find users and their org IDs
const https = require('https');
const { execSync } = require('child_process');
const path = require('path');

async function getToken() {
  try {
    const home = process.env.HOME;
    const tokenFile = path.join(home, '.config', 'configstore', 'firebase-tools.json');
    const cfg = require(tokenFile);
    const tokens = cfg.tokens;
    if (tokens && tokens.access_token) return tokens.access_token;
  } catch (_) {}
  return null;
}

async function request(p, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'firestore.googleapis.com', path: p, method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    };
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const token = await getToken();
  const project = 'casemanagement-ai';
  const db = '(default)';

  // Get users
  const users = await request(`/v1/projects/${project}/databases/${db}/documents/users?pageSize=20`, token);
  console.log('\n=== USERS ===');
  (users.documents || []).forEach(doc => {
    const f = doc.fields || {};
    const id = doc.name.split('/').pop();
    console.log(`UID: ${id} | Name: ${f.displayName?.stringValue} | OrgId: ${f.organizationId?.stringValue} | Role: ${f.role?.stringValue}`);
  });

  // Get organizations  
  const orgs = await request(`/v1/projects/${project}/databases/${db}/documents/organizations?pageSize=10`, token);
  console.log('\n=== ORGANIZATIONS ===');
  (orgs.documents || []).forEach(doc => {
    const f = doc.fields || {};
    const id = doc.name.split('/').pop();
    console.log(`OrgId: ${id} | Name: ${f.name?.stringValue}`);
  });
}
main().catch(console.error);
