/**
 * CaseManagement.AI — Interactive Browser Console Seeder Script
 * =============================================================
 *
 * This script is designed to be copy-pasted directly into the browser developer console 
 * when logged into the CaseManagement.AI application as Kathy or Jennie.
 *
 * It uses the exposed `window._firebaseDb` and `window._firebaseAuth` instances to dynamically
 * query all individuals in the database, then seeds realistic clinical and administrative
 * sub-collections (notes, forms, visits, tasks, and referrals) for each individual.
 *
 * Prerequisites:
 * --------------
 * 1. Log in to the CaseManagement.AI application in your browser.
 * 2. Open Developer Tools (Cmd+Option+I on Mac, Ctrl+Shift+I on Windows).
 * 3. Copy this entire script, paste it in the Console, and press Enter.
 */

(async () => {
  console.log("%c🌱 Starting Browser Console Demo Seeder...", "color: #10b981; font-weight: bold; font-size: 14px;");

  const db = window._firebaseDb;
  const auth = window._firebaseAuth;

  if (!db || !auth) {
    console.error("❌ Firebase instances not found on window object. Make sure you are logged in and running CaseManagement.AI in development or with exposed references.");
    return;
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("❌ No logged in user detected. Please log in first.");
    return;
  }

  console.log(`👤 Active User: ${currentUser.email} (UID: ${currentUser.uid})`);

  // Load Firestore utilities dynamically from Firebase window scope or reconstruct them
  const { 
    collection, 
    getDocs, 
    addDoc, 
    query, 
    where, 
    serverTimestamp,
    doc,
    setDoc
  } = window.FirebaseFirestore || await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");

  // Get active individuals
  console.log("🔍 Fetching individuals from Firestore...");
  const indSnapshot = await getDocs(collection(db, "individuals"));
  const individuals = [];
  indSnapshot.forEach(doc => {
    individuals.push({ id: doc.id, ...doc.data() });
  });

  if (individuals.length === 0) {
    console.warn("⚠️ No individuals found in Firestore. Run the main backend seeder first to populate individuals.");
    return;
  }

  console.log(`✅ Loaded ${individuals.length} individuals.`);

  const clinicalWording = {
    progressNotes: [
      {
        goal: "Increase independence in community settings and improve navigation skills.",
        activity: "Supported the individual during a community transit excursion. Assisted in selecting the correct bus route, purchasing fare tickets, and managing physical change. The individual remained engaged and demonstrated cooperative behaviors throughout the interaction.",
        nextSteps: "Continue community navigation practice once weekly; focus on timetable interpretation."
      },
      {
        goal: "Support self-advocacy and choice in recreational and structured daily scheduling.",
        activity: "Conducted home visit to discuss monthly recreational calendar. The individual expressed an interest in volunteering at the local animal shelter. Discussed application requirements, transport logistics, and personal boundaries in work settings.",
        nextSteps: "Case manager to coordinate contact with animal shelter volunteer coordinator by next Tuesday."
      },
      {
        goal: "Promote health, wellness, and cooperative compliance with medication regimes.",
        activity: "Reviewed weekly pill organizer with the individual. Assessed compliance with daily morning doses. The individual stated they sometimes feel nauseated in the morning, which led to missed doses. Brainstormed eating a light cracker beforehand.",
        nextSteps: "Follow up with PCP regarding morning dose timing and mild nausea concerns."
      }
    ],
    contactNotes: [
      {
        method: "Phone",
        summary: "Spoke with the individual's guardian regarding upcoming annual ISP meeting. Confirmed attendance and coordinated transportation assistance. Guardian expressed satisfaction with current progress but noted minor anxiety spikes during social outings."
      },
      {
        method: "In-Person",
        summary: "Conducted brief face-to-face check-in at the day training facility. Checked in on engagement levels and vocational projects. Staff reports consistent participation and positive peer relationships. Individual expressed pride in their recent woodworking task."
      }
    ],
    visits: [
      {
        purpose: "Routine Monthly Monitoring & Safety Assessment",
        outcome: "Verified living environment remains safe, clean, and free of visible hazards. Individual appears well-groomed and in positive spirits. Food supply is ample and emergency contact sheets are clearly posted near the refrigerator."
      },
      {
        purpose: "ISP Annual Preparation & Goal Alignment Check",
        outcome: "Collaboratively reviewed current service goals. The individual wishes to maintain their employment goals but requested less frequent staff intervention at their workstation. Discussed strategies to transition support levels gradually."
      }
    ],
    referrals: [
      {
        provider: "Apex Behavioral Therapy Services",
        type: "Behavioral Analysis & Consultation",
        reason: "Requesting comprehensive behavioral assessment to address social anxiety and develop adaptive self-regulation techniques during high-sensory community outings."
      },
      {
        provider: "County Transit Assistance Program",
        type: "Specialized Paratransit Certification",
        reason: "Securing door-to-door transportation eligibility to facilitate independent attendance at the daily supported employment vocational site."
      }
    ]
  };

  let countNotes = 0;
  let countContacts = 0;
  let countVisits = 0;
  let countReferrals = 0;
  let countForms = 0;
  let countTasks = 0;

  for (const person of individuals) {
    const fullName = `${person.first_name} ${person.last_name}`;
    console.log(`%c📝 Seeding sub-collections for: ${fullName} (ID: ${person.id})`, "color: #3b82f6; font-weight: bold;");

    // 1. Progress Notes (3 notes per individual)
    const pNotesRef = collection(db, "progress_notes");
    for (let j = 0; j < 3; j++) {
      const template = clinicalWording.progressNotes[j];
      const noteDate = new Date();
      noteDate.setDate(noteDate.getDate() - (j * 4 + 1));

      await addDoc(pNotesRef, {
        individual_id: person.id,
        individual_name: fullName,
        organizationId: person.organizationId || "demo-org-001",
        author_uid: currentUser.uid,
        author_name: currentUser.displayName || "Kathy Martinez",
        note_date: noteDate.toISOString().split("T")[0],
        service_code: "T1017-HE",
        duration_minutes: 60,
        goal_addressed: template.goal,
        activity_conducted: template.activity,
        next_steps: template.nextSteps,
        status: "submitted",
        is_signed: false,
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      countNotes++;
    }

    // 2. Contact Notes (2 per individual)
    const cNotesRef = collection(db, "contact_notes");
    for (let j = 0; j < 2; j++) {
      const template = clinicalWording.contactNotes[j];
      const contactDate = new Date();
      contactDate.setDate(contactDate.getDate() - (j * 5 + 2));

      await addDoc(cNotesRef, {
        individual_id: person.id,
        individual_name: fullName,
        organizationId: person.organizationId || "demo-org-001",
        author_uid: currentUser.uid,
        author_name: currentUser.displayName || "Kathy Martinez",
        contact_date: contactDate.toISOString().split("T")[0],
        contact_method: template.method,
        duration_minutes: 30,
        summary: template.summary,
        createdAt: serverTimestamp()
      });
      countContacts++;
    }

    // 3. Visit Summaries (2 per individual)
    const visitsRef = collection(db, "visit_summaries");
    for (let j = 0; j < 2; j++) {
      const template = clinicalWording.visits[j];
      const visitDate = new Date();
      visitDate.setDate(visitDate.getDate() - (j * 14 + 5));

      await addDoc(visitsRef, {
        individual_id: person.id,
        individual_name: fullName,
        organizationId: person.organizationId || "demo-org-001",
        author_uid: currentUser.uid,
        author_name: currentUser.displayName || "Kathy Martinez",
        visit_date: visitDate.toISOString().split("T")[0],
        purpose: template.purpose,
        outcome_summary: template.outcome,
        home_safety_verified: true,
        individual_participated: true,
        createdAt: serverTimestamp()
      });
      countVisits++;
    }

    // 4. Referrals (2 per individual)
    const referralsRef = collection(db, "referrals");
    for (let j = 0; j < 2; j++) {
      const template = clinicalWording.referrals[j];
      const refDate = new Date();
      refDate.setDate(refDate.getDate() - (j * 10 + 3));

      await addDoc(referralsRef, {
        individualId: person.id,
        individualName: fullName,
        organizationId: person.organizationId || "demo-org-001",
        providerName: template.provider,
        referralType: template.type,
        reason: template.reason,
        status: j === 0 ? "Pending Provider Acceptance" : "In Intake",
        referralDate: refDate.toISOString().split("T")[0],
        createdAt: serverTimestamp()
      });
      countReferrals++;
    }

    // 5. Quarterly Monitoring Form (1 per individual)
    const formsRef = collection(db, "monitoring_forms");
    const formDate = new Date();
    formDate.setDate(formDate.getDate() - 10);
    await addDoc(formsRef, {
      individual_id: person.id,
      individual_name: fullName,
      organizationId: person.organizationId || "demo-org-001",
      author_uid: currentUser.uid,
      author_name: currentUser.displayName || "Kathy Martinez",
      review_quarter: "2026-Q1",
      review_date: formDate.toISOString().split("T")[0],
      living_arrangement_safe: "Yes",
      living_arrangement_comments: "Residential placement clean, smoke detectors tested and operational. Food supplies checked.",
      health_services_adequate: "Yes",
      health_services_comments: "Primary Care and Dental appointments are current. Medication logs complete with zero discrepancies.",
      status: "Submitted",
      createdAt: serverTimestamp()
    });
    countForms++;

    // 6. Assigned Staff Record
    const staffRef = doc(db, `organizations/${person.organizationId || 'demo-org-001'}/individuals/${person.id}/assigned_staff/${currentUser.uid}`);
    await setDoc(staffRef, {
      staff_uid: currentUser.uid,
      staff_name: currentUser.displayName || "Kathy Martinez",
      role: "primary_case_manager",
      assigned_at: serverTimestamp()
    });
  }

  console.log("%c=======================================================", "color: #10b981; font-weight: bold;");
  console.log("%c🎉 SEED PROCESS COMPLETE!", "color: #10b981; font-weight: bold; font-size: 14px;");
  console.log(`   - Progress Notes created    : ${countNotes}`);
  console.log(`   - Contact Notes created     : ${countContacts}`);
  console.log(`   - Visit Summaries created   : ${countVisits}`);
  console.log(`   - Referrals created         : ${countReferrals}`);
  console.log(`   - Monitoring Forms created  : ${countForms}`);
  console.log("%c=======================================================", "color: #10b981; font-weight: bold;");
})();
