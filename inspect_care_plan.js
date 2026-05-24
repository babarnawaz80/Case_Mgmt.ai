import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCCDjSN6OIu-VODP7mcqz8IPRk43NRKphE",
  authDomain: "casemanagement-ai.firebaseapp.com",
  projectId: "casemanagement-ai",
  storageBucket: "casemanagement-ai.firebasestorage.app",
  messagingSenderId: "366290080097",
  appId: "1:366290080097:web:d2985cd7323ae04d447520"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  await signInWithEmailAndPassword(auth, "kathy@demo.casemanagement.ai", "Demo1234!");
  const docRef = doc(db, "care_plans", "6080");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    console.log("Care Plan 6080 data:", JSON.stringify(snap.data(), null, 2));
  } else {
    console.log("Care Plan 6080 does not exist!");
  }
}

run().catch(console.error);
