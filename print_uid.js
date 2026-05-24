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
  const cred = await signInWithEmailAndPassword(auth, "admin@demo.casemanagement.ai", "Demo1234!");
  const uid = cred.user.uid;
  console.log("Logged in Auth UID:", uid);

  const docSnap = await getDoc(doc(db, "users", uid));
  if (docSnap.exists()) {
    console.log("User document exists in Firestore:", docSnap.data());
  } else {
    console.log("User document does NOT exist in Firestore for this UID!");
  }
}

run().catch(console.error);
