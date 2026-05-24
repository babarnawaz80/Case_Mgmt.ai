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
  // Sign in as kathy@demo.casemanagement.ai to get admin rights and own document update rights
  await signInWithEmailAndPassword(auth, "kathy@demo.casemanagement.ai", "Demo1234!");
  console.log("Logged in as Kathy!");

  // ==========================================
  // FIX USER: Align Kathy's organizationId
  // ==========================================
  console.log("Aligning Kathy's user document organizationId...");
  await updateDoc(doc(db, "users", "TzFYFn1unMMNjVZoJqxyYP6S8m62"), {
    organizationId: "demo-org-001",
    updatedAt: serverTimestamp()
  });
  console.log("Kathy's user document aligned successfully.");

  // ==========================================
  // FIX 1: ind-001 Profile
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
    assigned_case_manager_uid: "TzFYFn1unMMNjVZoJqxyYP6S8m62",
    assigned_case_manager: "TzFYFn1unMMNjVZoJqxyYP6S8m62",
    companion_token: "6d1b828a-02a1-47bf-bdc0-46daf3c6df36",
    companion_link_active: true,
    created_at: serverTimestamp(),
    createdAt: serverTimestamp(),
    updated_at: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
  console.log("Updated ind-001 successfully.");

  // ==========================================
  // FIX 2: Duplicate Individuals Cleanup
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
    for (const docObj of docs) {
      if (["ind-001", "ind-002", "ind-003"].includes(docObj.id)) {
        keepDoc = docObj;
        break;
      }
    }
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
  // FIX 3: SuperAdmin Role
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
  // FIX 4: Patricia Brooks Contact Note Linkage
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
    } else {
      // Ensure all contact notes have both individualId and individual_id set
      const indId = data.individualId || data.individual_id;
      if (indId && (!data.individualId || !data.individual_id)) {
        await updateDoc(doc(db, "contact_notes", d.id), {
          individualId: indId,
          individual_id: indId,
          updatedAt: serverTimestamp()
        });
      }
    }
  }
  console.log(`Contact notes check/fix complete. Misplaced notes fixed: ${fixedNotesCount}`);

  // ==========================================
  // FIX 6: Joseph Brown Seeding
  // ==========================================
  console.log("\n--- Fix 6: Seeding progress_notes, care_plans, and monitoring_forms for ind-001 ---");

  // A. Clean up existing progress notes, care plans, and monitoring forms for ind-001 first
  console.log("Cleaning existing progress notes for ind-001...");
  const pSnap = await getDocs(collection(db, "progress_notes"));
  for (const d of pSnap.docs) {
    const data = d.data();
    if (data.individualId === "ind-001" || data.individual_id === "ind-001") {
      await deleteDoc(doc(db, "progress_notes", d.id));
    }
  }

  console.log("Cleaning existing care plans for ind-001...");
  const cpSnap = await getDocs(collection(db, "care_plans"));
  for (const d of cpSnap.docs) {
    const data = d.data();
    if (data.individualId === "ind-001" || data.individual_id === "ind-001" || d.id === "6080") {
      await deleteDoc(doc(db, "care_plans", d.id));
    }
  }

  console.log("Cleaning existing monitoring forms for ind-001...");
  const mfSnap = await getDocs(collection(db, "monitoring_forms"));
  for (const d of mfSnap.docs) {
    const data = d.data();
    if (data.individualId === "ind-001" || data.individual_id === "ind-001") {
      await deleteDoc(doc(db, "monitoring_forms", d.id));
    }
  }

  // B. Seeding Progress Notes (2 documents)
  console.log("Adding 2 signed progress notes...");
  await addDoc(collection(db, "progress_notes"), {
    individualId: "ind-001",
    individual_id: "ind-001",
    individualName: "Joseph Brown",
    organizationId: "demo-org-001",
    authorId: "TzFYFn1unMMNjVZoJqxyYP6S8m62",
    authorName: "Kathy Adams",
    author_uid: "TzFYFn1unMMNjVZoJqxyYP6S8m62",
    author_name: "Kathy Adams",
    progressDate: "2026-04-15",
    activityType: "Home Visit",
    contactType: "Home Visit",
    detailsOfActivity: "Completed quarterly home visit with Joseph and his mother Linda. Joseph is engaged in his community integration goal and attended 3 community events this quarter. Employment interest noted — discussed vocational referral options.",
    status: "signed",
    isBillable: true,
    billable: true,
    created_at: serverTimestamp(),
    createdAt: serverTimestamp(),
    updated_at: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await addDoc(collection(db, "progress_notes"), {
    individualId: "ind-001",
    individual_id: "ind-001",
    individualName: "Joseph Brown",
    organizationId: "demo-org-001",
    authorId: "TzFYFn1unMMNjVZoJqxyYP6S8m62",
    authorName: "Kathy Adams",
    author_uid: "TzFYFn1unMMNjVZoJqxyYP6S8m62",
    author_name: "Kathy Adams",
    progressDate: "2026-03-10",
    activityType: "Phone Call",
    contactType: "Telephone",
    detailsOfActivity: "Phone check-in with Joseph. He reported feeling good and is looking forward to upcoming job fair. No behavioral concerns noted. Care plan goals on track.",
    status: "signed",
    isBillable: true,
    billable: true,
    created_at: serverTimestamp(),
    createdAt: serverTimestamp(),
    updated_at: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // C. Seeding Care Plan with ID "6080"
  console.log("Adding care plan '6080' for ind-001...");
  await setDoc(doc(db, "care_plans", "6080"), {
    id: "6080",
    individualId: "ind-001",
    individual_id: "ind-001",
    personId: "ind-001",
    individualName: "Joseph Brown",
    organizationId: "demo-org-001",
    status: "In Progress",
    isCompleted: false,
    aiDrafted: true,
    effectiveDate: "08/01/2026",
    reviewDate: "08/01/2027",
    internalDueDate: "08/01/2026",
    updatedBy: "Kathy Martinez",
    updatedOn: "01/26/2026",
    goals: [
      {
        id: "goal-1",
        number: 1,
        title: "Community Integration",
        description: "Joseph will increase participation in community activities",
        targetDate: "12/31/2026",
        responsibleParty: "Kathy Adams",
        progress: "In Progress",
        objectives: [
          { id: "g1o1", description: "Attend at least 2 community events per month", status: "In Progress" },
          { id: "g1o2", description: "Maintain connection with peer support group", status: "In Progress" }
        ]
      },
      {
        id: "goal-2",
        number: 2,
        title: "Employment and Vocational",
        description: "Joseph will explore employment opportunities aligned with his interests",
        targetDate: "09/30/2026",
        responsibleParty: "Kathy Adams",
        progress: "In Progress",
        objectives: [
          { id: "g2o1", description: "Complete vocational assessment by March 2026", status: "In Progress" },
          { id: "g2o2", description: "Apply to at least 3 positions by June 2026", status: "In Progress" }
        ]
      }
    ],
    services: [
      {
        id: "s1",
        name: "Day Habilitation (T2021)",
        provider: "Carroll Community Services",
        startDate: "08/01/2025",
        endDate: "07/31/2026",
        units: "5 days/week",
        status: "Active"
      }
    ],
    supportNeeds: {
      workingWell: { value: "Joseph is consistently attending Day Habilitation 4-5 days per week." },
      notWorking: { value: "Recent withdrawn behavior reported by mother (last 2 weeks)." },
      preferences: { value: "Joseph has expressed clear interest in exploring part-time employment." },
      healthSafety: { value: "Behavioral changes at home flagged Low-Medium severity." }
    },
    team: [
      { role: "Individual", name: "Joseph Brown", status: "Pending" },
      { role: "Case Manager", name: "Kathy Martinez", status: "Pending" }
    ],
    history: [
      { date: "01/26/2026", user: "Kathy Martinez", action: "AI draft generated from ambient session" }
    ],
    created_at: serverTimestamp(),
    createdAt: serverTimestamp(),
    updated_at: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // D. Seeding Monitoring Form
  console.log("Adding quarterly monitoring form for ind-001...");
  await setDoc(doc(db, "monitoring_forms", "quarterly-monitoring-001"), {
    individualId: "ind-001",
    individual_id: "ind-001",
    individualName: "Joseph Brown",
    organizationId: "demo-org-001",
    type: "Quarterly",
    reviewType: "Quarterly",
    reviewDate: "2026-03-31",
    due_date: "2026-03-31",
    dueDate: "2026-03-31",
    submitted_date: "2026-03-31",
    author_uid: "TzFYFn1unMMNjVZoJqxyYP6S8m62",
    authorName: "Kathy Martinez",
    updated_by: "Kathy Martinez",
    updatedBy: "Kathy Martinez",
    updated_on: "03/31/2026",
    updatedOn: "03/31/2026",
    status: "Submitted",
    active: "Active",
    sections: {
      s1: { label: "Current Circumstances", value: "Joseph is living independently with family support. No major changes in living situation." },
      s2: { label: "Satisfaction with Services", value: "Joseph reports satisfaction with current supports. Expressed interest in additional vocational services." },
      s3: { label: "Progress Toward Outcomes", value: "Community integration goal on track. Employment goal initiated." },
      s4: { label: "Health and Welfare", value: "No current health concerns. Annual physical completed January 2026." }
    },
    created_at: serverTimestamp(),
    createdAt: serverTimestamp(),
    updated_at: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  console.log("Seeding and fixes complete!");
}

run().catch(console.error);
