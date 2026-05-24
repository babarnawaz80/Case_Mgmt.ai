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
  await signInWithEmailAndPassword(auth, "kathy@demo.casemanagement.ai", "Demo1234!");
  console.log("Logged in!");

  const snap = await getDocs(collection(db, "individuals"));
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
