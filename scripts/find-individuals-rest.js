// find-individuals-rest.js
// Uses Firebase CLI cached credentials via FIREBASE_TOKEN env or gcloud ADC path
const https = require('https');
const { execSync } = require('child_process');

async function getToken() {
  try {
    // Try gcloud first
    const tok = execSync('gcloud auth print-access-token 2>/dev/null', { encoding: 'utf8' }).trim();
    if (tok && tok.length > 20) return tok;
  } catch (_) {}
  // Fall back to firebase-tools token cache
  try {
    const home = process.env.HOME;
    const tokenFile = require('path').join(home, '.config', 'configstore', 'firebase-tools.json');
    const cfg = require(tokenFile);
    const tokens = cfg.tokens;
    if (tokens && tokens.access_token) return tokens.access_token;
  } catch (_) {}
  return null;
}

async function request(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'firestore.googleapis.com',
      path,
      method: 'GET',
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
  if (!token) { console.error('No token found. Run: gcloud auth login'); process.exit(1); }
  
  const project = 'casemanagement-ai';
  const db = '(default)';
  const path = `/v1/projects/${project}/databases/${db}/documents/individuals?pageSize=50`;
  
  const result = await request(path, token);
  if (result.error) { console.error('Firestore error:', JSON.stringify(result.error)); return; }
  
  const docs = result.documents || [];
  docs.forEach(doc => {
    const parts = doc.name.split('/');
    const id = parts[parts.length - 1];
    const f = doc.fields || {};
    const firstName = f.first_name?.stringValue || '';
    const lastName = f.last_name?.stringValue || '';
    const orgId = f.organizationId?.stringValue || 'n/a';
    console.log(`ID: ${id} | Name: ${firstName} ${lastName} | Org: ${orgId}`);
  });
  console.log(`\nTotal: ${docs.length}`);
}
main().catch(console.error);
