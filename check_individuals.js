import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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
  const userCred = await signInWithEmailAndPassword(auth, "kathy@demo.casemanagement.ai", "Demo1234!");
  console.log("Logged in:", userCred.user.email);

  const snap = await getDocs(collection(db, "individuals"));
  console.log("Individuals in DB count:", snap.size);
  snap.forEach(d => {
    console.log(`Individual doc ID: "${d.id}"`, d.data());
  });
}

run().catch(console.error);
