#!/usr/bin/env node
// seed-superadmin.cjs
// Sets role: "platform_admin" on admin@demo.casemanagement.ai
// and seeds demo support notes + a second org for the super admin tables.

const { initializeApp } = require('firebase/app');
const {
  getFirestore, doc, setDoc, getDocs, collection,
  query, where, serverTimestamp, addDoc,
} = require('firebase/firestore');
const {
  getAuth, signInWithEmailAndPassword,
} = require('firebase/auth');

// Load env from repo/.env
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
};

console.log('Project:', firebaseConfig.projectId);
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const ADMIN_EMAIL = 'admin@demo.casemanagement.ai';
const ADMIN_PASS  = 'Demo1234!';

async function main() {
  // 1) Sign in as admin so we have auth context
  console.log(`\n[1] Signing in as ${ADMIN_EMAIL}…`);
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);
  const uid = auth.currentUser.uid;
  console.log(`    UID: ${uid}`);

  // 2) Set role = platform_admin on users/{uid}
  console.log('\n[2] Setting role = platform_admin…');
  await setDoc(doc(db, 'users', uid), {
    role: 'platform_admin',
    updatedAt: serverTimestamp(),
  }, { merge: true });
  console.log('    ✅ Done');

  // 3) Ensure a second demo org exists for table demo
  console.log('\n[3] Seeding demo organizations…');
  const existingSnap = await getDocs(
    query(collection(db, 'organizations'), where('name', '==', 'Sunrise Support Services'))
  );
  if (existingSnap.empty) {
    await addDoc(collection(db, 'organizations'), {
      name: 'Sunrise Support Services',
      state: 'VA',
      status: 'active',
      ai_features_enabled: true,
      creditBalance: 1200,
      totalCreditsPurchased: 2000,
      totalCreditsUsed: 800,
      amountPaid: 20,
      monthlyAISpend: 12.50,
      totalUsers: 8,
      createdAt: serverTimestamp(),
    });
    console.log('    ✅ Created Sunrise Support Services (VA)');
  } else {
    console.log('    ℹ️  Sunrise Support Services already exists');
  }

  // 4) Seed support notes for org-1
  console.log('\n[4] Seeding support notes for org-1…');
  const notesCol = collection(db, 'support_notes', 'org-1', 'notes');
  const notesSnap = await getDocs(notesCol);
  if (notesSnap.empty) {
    await addDoc(notesCol, {
      content: 'Onboarding complete. Kathy and Jennie trained on system. Joseph Brown seeded as test individual.',
      created_by: 'Platform Admin',
      created_at: serverTimestamp(),
    });
    await addDoc(notesCol, {
      content: 'Org requested AI credits increase from 500 to 1000. Approved and updated in Stripe.',
      created_by: 'Platform Admin',
      created_at: serverTimestamp(),
    });
    console.log('    ✅ Seeded 2 support notes');
  } else {
    console.log('    ℹ️  Notes already exist');
  }

  console.log('\n✅ Super Admin seed complete!\n');
  console.log('   Navigate to https://casemanagement-ai.web.app/super-admin');
  console.log('   and log in as admin@demo.casemanagement.ai / Demo1234!\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
