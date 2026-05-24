const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "casemanagement-ai"
  });
}

const db = admin.firestore();

async function run() {
  console.log("Starting Firebase Admin fixes...");

  // ==========================================
  // FIX 3 — Elevate admin role to platform_admin
  // ==========================================
  console.log("\n--- Fix 3: Elevating admin role to platform_admin via Admin SDK ---");
  const usersToElevate = ["UvOyy8fvhyVWPBfuoClZ8XfeNYs1", "thulqShiwFZZ69SGcJWm9NEM2WV2"];
  
  for (const uid of usersToElevate) {
    try {
      const userRef = db.collection("users").doc(uid);
      const docSnap = await userRef.get();
      if (docSnap.exists) {
        await userRef.update({
          role: "platform_admin",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Successfully elevated user: ${uid}`);
      } else {
        console.log(`User doc ${uid} does not exist.`);
      }
    } catch (err) {
      console.error(`Error elevating user ${uid}:`, err.message);
    }
  }

  console.log("\nFirebase Admin fixes completed successfully!");
}

run().catch(console.error);
