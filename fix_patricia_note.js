import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

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
  console.log("Logged in!");

  const noteRef = doc(db, "contact_notes", "jKLu9PGa93AoIgO0jJ2u");
  await updateDoc(noteRef, {
    individualId: "3TyKpHergyWFVlHKjN2T",
    individual_id: "3TyKpHergyWFVlHKjN2T",
    individualName: "Patricia Brooks",
    individual_name: "Patricia Brooks",
    person: "Patricia Brooks"
  });
  console.log("misplaced contact note for Patricia Brooks corrected successfully!");
}

run().catch(console.error);
