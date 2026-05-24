const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp({ projectId: "casemanagement-ai" });
}
const db = admin.firestore();

async function run() {
  const snap = await db.collection("individuals").get();
  console.log("Total individuals:", snap.size);
  const people = [];
  snap.forEach(d => {
    const data = d.data();
    people.push({
      id: d.id,
      first_name: data.first_name || data.firstName || "",
      last_name: data.last_name || data.lastName || "",
      organizationId: data.organizationId,
      medicaid_id: data.medicaid_id,
      dob: data.dob
    });
  });
  console.log(JSON.stringify(people, null, 2));
}

run().catch(console.error);
