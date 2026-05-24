import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  getDocs,
  serverTimestamp
} from "firebase/firestore";

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
  // Sign in as admin@demo.casemanagement.ai to get admin rights
  await signInWithEmailAndPassword(auth, "admin@demo.casemanagement.ai", "Demo1234!");
  console.log("Logged in as Admin!");

  // ==========================================
  // FIX 1 — ind-001 Profile
  // ==========================================
  console.log("\n--- Fix 1: Updating ind-001 profile fields ---");
  await setDoc(doc(db, "individuals", "ind-001"), {
    firstName: "Joseph",
    lastName: "Brown",
    first_name: "Joseph",
    last_name: "Brown",
    preferredName: "Joe",
    dob: "1988-01-15",
    gender: "Male",
    medicaid_id: "MA-12345678",
    county: "Carroll",
    risk_score: 71,
    enrollment_status: "active",
    program: "Community Pathways",
    organizationId: "demo-org-001",
    assigned_case_manager_uid: "SyMfMQcIcAexWYB1xDQvc0ex0dm1",
    companion_token: "6d1b828a-02a1-47bf-bdc0-46daf3c6df36",
    companion_link_active: true,
    updatedAt: serverTimestamp()
  }, { merge: true });
  console.log("Updated ind-001 successfully.");

  // ==========================================
  // FIX 2 — Duplicate Individuals Cleanup
  // ==========================================
  console.log("\n--- Fix 2: Cleaning up duplicate individuals ---");
  const indSnap = await getDocs(collection(db, "individuals"));
  const groups = {};

  indSnap.forEach(d => {
    const data = d.data();
    const f = (data.first_name || data.firstName || "").trim();
    const l = (data.last_name || data.lastName || "").trim();
    const fullName = `${f} ${l}`.trim().toLowerCase();

    if (!fullName) {
      // Empty document, delete immediately
      console.log(`Deleting empty/blank individual document: "${d.id}"`);
      deleteDoc(doc(db, "individuals", d.id));
      return;
    }

    if (!groups[fullName]) groups[fullName] = [];
    groups[fullName].push({ id: d.id, data });
  });

  for (const name of Object.keys(groups)) {
    const docs = groups[name];
    if (docs.length <= 1) continue;

    console.log(`Deduplicating "${name}": found ${docs.length} copies`);
    
    // Choose which document to keep
    let keepDoc = null;
    // 1. Prefer ind-001, ind-002, ind-003
    for (const docObj of docs) {
      if (["ind-001", "ind-002", "ind-003"].includes(docObj.id)) {
        keepDoc = docObj;
        break;
      }
    }
    // 2. Otherwise prefer the lexicographically first ID (consistent choice)
    if (!keepDoc) {
      docs.sort((a, b) => a.id.localeCompare(b.id));
      keepDoc = docs[0];
    }

    console.log(`Keeping doc: "${keepDoc.id}"`);

    for (const docObj of docs) {
      if (docObj.id !== keepDoc.id) {
        console.log(`Deleting duplicate doc: "${docObj.id}"`);
        await deleteDoc(doc(db, "individuals", docObj.id));
      }
    }
  }
  console.log("Deduplication complete.");

  // ==========================================
  // FIX 3 — SuperAdmin Role
  // ==========================================
  console.log("\n--- Fix 3: Elevating admin role to platform_admin ---");
  await updateDoc(doc(db, "users", "UvOyy8fvhyVWPBfuoClZ8XfeNYs1"), {
    role: "platform_admin",
    updatedAt: serverTimestamp()
  });
  await updateDoc(doc(db, "users", "thulqShiwFZZ69SGcJWm9NEM2WV2"), {
    role: "platform_admin",
    updatedAt: serverTimestamp()
  });
  console.log("Updated admin roles successfully.");

  // ==========================================
  // FIX 4 — Patricia Brooks Contact Note Linkage
  // ==========================================
  console.log("\n--- Fix 4: Fixing Patricia Brooks contact note individualId ---");
  const notesSnap = await getDocs(collection(db, "contact_notes"));
  let fixedNotesCount = 0;
  for (const d of notesSnap.docs) {
    const data = d.data();
    if (data.person === "Patricia Brooks" && data.individualId !== "3TyKpHergyWFVlHKjN2T") {
      console.log(`Found misplaced contact note: "${d.id}" for Patricia Brooks with individualId "${data.individualId}". Fixing...`);
      await updateDoc(doc(db, "contact_notes", d.id), {
        individualId: "3TyKpHergyWFVlHKjN2T",
        individual_id: "3TyKpHergyWFVlHKjN2T",
        updatedAt: serverTimestamp()
      });
      fixedNotesCount++;
    }
  }
  console.log(`Misplaced contact notes fixed: ${fixedNotesCount}`);

  // ==========================================
  // FIX 6 — Joseph Brown Seeding
  // ==========================================
  console.log("\n--- Fix 6: Seeding progress_notes, care_plans, and monitoring_forms for ind-001 ---");

  // A. Progress Notes (2 documents)
  console.log("Adding 2 signed progress notes...");
  await addDoc(collection(db, "progress_notes"), {
    individualId: "ind-001",
    individualName: "Joseph Brown",
    organizationId: "demo-org-001",
    author_uid: "SyMfMQcIcAexWYB1xDQvc0ex0dm1",
    author_name: "Kathy Adams",
    progressDate: "2026-04-15",
    activityType: "Home Visit",
    detailsOfActivity: "Completed quarterly home visit with Joseph and his mother Linda. Joseph is engaged in his community integration goal and attended 3 community events this quarter. Employment interest noted — discussed vocational referral options.",
    status: "signed",
    billable: true,
    createdAt: serverTimestamp()
  });

  await addDoc(collection(db, "progress_notes"), {
    individualId: "ind-001",
    individualName: "Joseph Brown",
    organizationId: "demo-org-001",
    author_uid: "SyMfMQcIcAexWYB1xDQvc0ex0dm1",
    author_name: "Kathy Adams",
    progressDate: "2026-03-10",
    activityType: "Phone Call",
    detailsOfActivity: "Phone check-in with Joseph. He reported feeling good and is looking forward to upcoming job fair. No behavioral concerns noted. Care plan goals on track.",
    status: "signed",
    billable: true,
    createdAt: serverTimestamp()
  });

  // B. Care Plan (1 document)
  console.log("Adding care plan for ind-001...");
  await addDoc(collection(db, "care_plans"), {
    individualId: "ind-001",
    individualName: "Joseph Brown",
    organizationId: "demo-org-001",
    status: "in_progress",
    ai_drafted: true,
    startDate: "2026-01-01",
    reviewDate: "2026-12-31",
    goals: [
      {
        id: "goal-1",
        title: "Community Integration",
        description: "Joseph will increase participation in community activities",
        target_date: "2026-12-31",
        responsible_party: "Kathy Adams",
        status: "on_track",
        objectives: [
          "Attend at least 2 community events per month",
          "Maintain connection with peer support group"
        ]
      },
      {
        id: "goal-2",
        title: "Employment and Vocational",
        description: "Joseph will explore employment opportunities aligned with his interests",
        target_date: "2026-09-30",
        responsible_party: "Kathy Adams",
        status: "in_progress",
        objectives: [
          "Complete vocational assessment by March 2026",
          "Apply to at least 3 positions by June 2026"
        ]
      }
    ],
    createdAt: serverTimestamp()
  });

  // C. Monitoring Form (1 document)
  console.log("Adding quarterly monitoring form...");
  await addDoc(collection(db, "monitoring_forms"), {
    individualId: "ind-001",
    individualName: "Joseph Brown",
    organizationId: "demo-org-001",
    reviewType: "Quarterly",
    reviewDate: "2026-03-31",
    author_uid: "SyMfMQcIcAexWYB1xDQvc0ex0dm1",
    status: "submitted",
    sections: {
      s1: { label: "Current Circumstances", value: "Joseph is living independently with family support. No major changes in living situation." },
      s2: { label: "Satisfaction with Services", value: "Joseph reports satisfaction with current supports. Expressed interest in additional vocational services." },
      s3: { label: "Progress Toward Outcomes", value: "Community integration goal on track. Employment goal initiated." },
      s4: { label: "Health and Welfare", value: "No current health concerns. Annual physical completed January 2026." }
    },
    createdAt: serverTimestamp()
  });

  console.log("Seeding complete!");
}

run().catch(console.error);
