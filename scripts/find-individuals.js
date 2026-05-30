const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ projectId: 'casemanagement-ai', credential: applicationDefault() });
const db = getFirestore();

async function main() {
  const snap = await db.collection('individuals').get();
  snap.forEach(d => {
    const data = d.data();
    console.log(`ID: ${d.id} | Name: ${data.first_name} ${data.last_name} | Org: ${data.organizationId || 'n/a'}`);
  });
  console.log(`\nTotal: ${snap.size} individuals`);
}
main().catch(e => console.error(e));
