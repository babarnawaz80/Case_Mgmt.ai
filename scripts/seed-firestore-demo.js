// ============================================================
// CaseManagement.AI — Firestore Demo Data Seeder
// ============================================================
// Paste this entire script into Chrome DevTools console while
// logged in at https://casemanagement-ai.web.app
//
// Prerequisites:
//   • Logged in as kathy@demo.casemanagement.ai
//   • The app must be running (window.__db will be set)
//
// What it seeds:
//   • individuals     — 5 realistic HCBS participants
//   • progress_notes  — 2 notes per individual (10 total)
//   • incidents       — 2 incidents (one per high-risk individual)
//   • billing_claims  — 10 realistic HCBS billing claims
//   • notifications   — 5 notifications for Kathy's UID
//   • tasks           — 8 case management tasks
//   • audit_log       — 5 audit log entries
//   • conversations   — 2 conversations (DM + team group)
// ============================================================

(async () => {
  'use strict';

  // ── 1. Resolve Firestore helpers ────────────────────────────────────────────
  // The app exposes window.__db (set in main.tsx) and also
  // window._firebaseDb (set in firebase.ts). Fall back to either.
  const db = window.__db || window._firebaseDb;
  if (!db) {
    console.error(
      '❌ Firestore db not found on window.__db or window._firebaseDb.\n' +
      '   Make sure you are on the app page and logged in, then reload and try again.'
    );
    return;
  }

  // Import Firestore modular helpers from the version the app already loaded.
  // We use the same CDN version the app bundles so there's no version mismatch.
  const FBVER = '10.12.0';
  const {
    collection,
    addDoc,
    serverTimestamp,
    Timestamp,
  } = await import(`https://www.gstatic.com/firebasejs/${FBVER}/firebase-firestore.js`);

  const { getAuth } = await import(
    `https://www.gstatic.com/firebasejs/${FBVER}/firebase-auth.js`
  );

  // ── 2. Resolve current user ─────────────────────────────────────────────────
  const auth = window.__auth || window._firebaseAuth || getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error('❌ Not logged in. Sign in as kathy@demo.casemanagement.ai first.');
    return;
  }

  const uid = currentUser.uid;
  console.log(`✅ Logged in as: ${currentUser.email} (uid: ${uid})`);
  console.log('🌱 Starting Firestore demo data seeder…\n');

  // ── Helper: days offset from today ─────────────────────────────────────────
  const daysFromNow = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return Timestamp.fromDate(d);
  };

  const pastDays = (n) => daysFromNow(-n);

  /** ISO date string n days ago, e.g. "2026-05-16" */
  const pastDateStr = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  /** ISO date string n days from now */
  const futureDateStr = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  };

  // ── 3. INDIVIDUALS ──────────────────────────────────────────────────────────
  console.log('👤 Seeding individuals…');

  const individualsData = [
    {
      organizationId: 'demo',
      first_name: 'Marcus',
      last_name: 'Williams',
      preferred_name: 'Marcus',
      dob: '1978-04-12',
      gender: 'Male',
      race: 'Black or African American',
      county: 'Marion',
      program: 'HCBS Waiver — Community Integration',
      risk_score: 74,
      enrollment_status: 'active',
      medicaid_id: 'IN8847231',
      level_of_care: 'Level 3',
      assigned_case_manager: uid,
      assigned_case_manager_uid: uid,
      assigned_case_manager_name: 'Kathy Reynolds',
      phone: '(317) 555-0142',
      email: null,
      address: '4821 N. College Ave, Indianapolis, IN 46205',
      emergency_contact_name: 'Diane Williams (Sister)',
      emergency_contact_phone: '(317) 555-0198',
      diagnosis: 'Intellectual Disability (F70), Hypertension',
      open_tasks: 3,
      open_incidents: 1,
      monitoring_compliance_pct: 78,
      last_visit_date: pastDateStr(8),
      next_visit_date: futureDateStr(6),
      companion_link_active: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      first_name: 'Darlene',
      last_name: 'Thompson',
      preferred_name: 'Darlene',
      dob: '1985-09-30',
      gender: 'Female',
      race: 'Black or African American',
      county: 'Marion',
      program: 'HCBS Waiver — Supported Living',
      risk_score: 48,
      enrollment_status: 'active',
      medicaid_id: 'IN7712984',
      level_of_care: 'Level 2',
      assigned_case_manager: uid,
      assigned_case_manager_uid: uid,
      assigned_case_manager_name: 'Kathy Reynolds',
      phone: '(317) 555-0277',
      email: 'darlene.t@email.com',
      address: '2210 W. Washington St, Indianapolis, IN 46222',
      emergency_contact_name: 'Roy Thompson (Brother)',
      emergency_contact_phone: '(317) 555-0311',
      diagnosis: 'Intellectual Disability (F70), Muscular Dystrophy (G71.00)',
      payer: 'Anthem Indiana',
      open_tasks: 2,
      open_incidents: 0,
      monitoring_compliance_pct: 91,
      last_visit_date: pastDateStr(5),
      next_visit_date: futureDateStr(3),
      companion_link_active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      first_name: 'Robert',
      last_name: 'Castillo',
      preferred_name: 'Bobby',
      dob: '1991-02-14',
      gender: 'Male',
      race: 'Hispanic or Latino',
      county: 'Hamilton',
      program: 'HCBS Waiver — Personal Care',
      risk_score: 22,
      enrollment_status: 'active',
      medicaid_id: 'IN9023417',
      level_of_care: 'Level 1',
      assigned_case_manager: uid,
      assigned_case_manager_uid: uid,
      assigned_case_manager_name: 'Kathy Reynolds',
      phone: '(317) 555-0389',
      email: 'bobby.castillo@gmail.com',
      address: '833 Carmel Dr, Carmel, IN 46032',
      emergency_contact_name: 'Maria Castillo (Mother)',
      emergency_contact_phone: '(317) 555-0412',
      diagnosis: 'Multiple Sclerosis (G35), Mobility Impairment (Z74.01)',
      payer: 'MHS Indiana',
      open_tasks: 1,
      open_incidents: 0,
      monitoring_compliance_pct: 100,
      last_visit_date: pastDateStr(12),
      next_visit_date: futureDateStr(18),
      companion_link_active: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      first_name: 'Jerome',
      last_name: 'Henderson',
      preferred_name: 'Jerome',
      dob: '1969-11-05',
      gender: 'Male',
      race: 'Black or African American',
      county: 'Lake',
      program: 'HCBS Waiver — Supported Living',
      risk_score: 81,
      enrollment_status: 'active',
      medicaid_id: 'IN5521893',
      level_of_care: 'Level 3',
      assigned_case_manager: uid,
      assigned_case_manager_uid: uid,
      assigned_case_manager_name: 'Kathy Reynolds',
      phone: '(219) 555-0544',
      email: null,
      address: '1402 Broadway, Gary, IN 46407',
      emergency_contact_name: 'Linda Henderson (Daughter)',
      emergency_contact_phone: '(219) 555-0601',
      diagnosis: 'Intellectual Disability (F70), Memory/Cognitive Decline (R41.3)',
      payer: 'Anthem Indiana',
      open_tasks: 4,
      open_incidents: 1,
      monitoring_compliance_pct: 62,
      last_visit_date: pastDateStr(15),
      next_visit_date: futureDateStr(1),
      alerts: ['Missing progress note 05/13', 'High risk — monthly monitoring required'],
      companion_link_active: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      first_name: 'Patricia',
      last_name: 'Nguyen',
      preferred_name: 'Pat',
      dob: '1982-06-22',
      gender: 'Female',
      race: 'Asian',
      county: 'Allen',
      program: 'HCBS Waiver — Personal Care',
      risk_score: 37,
      enrollment_status: 'active',
      medicaid_id: 'IN4418762',
      level_of_care: 'Level 2',
      assigned_case_manager: uid,
      assigned_case_manager_uid: uid,
      assigned_case_manager_name: 'Kathy Reynolds',
      phone: '(260) 555-0712',
      email: 'pat.nguyen@outlook.com',
      address: '3819 Coliseum Blvd, Fort Wayne, IN 46805',
      emergency_contact_name: 'Tam Nguyen (Spouse)',
      emergency_contact_phone: '(260) 555-0788',
      diagnosis: 'Muscular Dystrophy (G71.09), Chronic Pain (Z74.09)',
      payer: 'IHCP',
      open_tasks: 1,
      open_incidents: 0,
      monitoring_compliance_pct: 86,
      last_visit_date: pastDateStr(4),
      next_visit_date: futureDateStr(26),
      companion_link_active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  ];

  let individualCount = 0;
  const individualIds = {}; // name key → Firestore doc ID

  for (const ind of individualsData) {
    const ref = await addDoc(collection(db, 'individuals'), ind);
    const key = `${ind.first_name}_${ind.last_name}`;
    individualIds[key] = ref.id;
    individualCount++;
  }
  console.log(`  ✅ Added ${individualCount} individuals`);

  // ── 4. PROGRESS NOTES ───────────────────────────────────────────────────────
  console.log('📝 Seeding progress_notes…');

  /**
   * Build two progress notes for a given individual.
   * Fields aligned to the ProgressNote interface in useProgressNotes.ts.
   */
  const makeNotes = (indId, fullName, firstName, actType1, obs1, steps1, actType2, obs2, steps2) => [
    {
      organizationId: 'demo',
      individualId: indId,
      authorId: uid,
      authorName: 'Kathy Reynolds',
      activityType: actType1,
      contactType: 'Home Visit',
      progressDate: pastDateStr(7),
      startTime: '10:00',
      endTime: '10:45',
      isBillable: true,
      purposeOfActivity: `Conducted scheduled home visit with ${firstName} to review current status, assess needs, and coordinate services. Discussed progress toward individualized support plan goals and addressed barriers to goal achievement.`,
      goalsProgress: [
        {
          goalId: 'goal_1',
          goalText: 'Increase community integration and independence',
          progressStatus: 'progressing',
          narrative: obs1,
        },
        {
          goalId: 'goal_2',
          goalText: 'Maintain health and medication regimen',
          progressStatus: 'no_change',
          narrative: `${firstName} reported no new health concerns during this visit.`,
        },
      ],
      additionalObservations: obs1,
      nextSteps: steps1,
      status: 'signed',
      aiDrafted: false,
      signedAt: pastDays(7),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      individualId: indId,
      authorId: uid,
      authorName: 'Kathy Reynolds',
      activityType: actType2,
      contactType: 'Telephone',
      progressDate: pastDateStr(14),
      startTime: '14:30',
      endTime: '15:00',
      isBillable: true,
      purposeOfActivity: `Telephone check-in with ${firstName} to follow up on previous visit action items and coordinate upcoming services.`,
      goalsProgress: [
        {
          goalId: 'goal_1',
          goalText: 'Increase community integration and independence',
          progressStatus: 'no_change',
          narrative: obs2,
        },
      ],
      additionalObservations: obs2,
      nextSteps: steps2,
      status: 'signed',
      aiDrafted: false,
      signedAt: pastDays(14),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  ];

  const progressNotesData = [
    ...makeNotes(
      individualIds['Marcus_Williams'], 'Marcus Williams', 'Marcus',
      'Case Management',
      'Marcus participated in his weekly community outing to the grocery store with DSP support. He demonstrated improved ability to manage his grocery list independently. Transportation challenges continue to limit broader community access.',
      'Coordinate with transportation provider for regular schedule. Follow up on community integration goal at next visit.',
      'Community Integration',
      'Marcus reported feeling settled in his routine. No new concerns identified during telephone check-in. He mentioned he would like to explore a part-time volunteer opportunity.',
      'Research volunteer opportunities appropriate for Marcus\'s interests and skill level. Share options at next home visit.',
    ),
    ...makeNotes(
      individualIds['Darlene_Thompson'], 'Darlene Williams', 'Darlene',
      'Case Management',
      'Darlene was engaged and communicative during the visit. Discussed upcoming authorization renewal timeline. She expressed concern about continuity of her supported living services and was reassured about the renewal process.',
      'Submit T2023 authorization renewal to Anthem Indiana. Schedule follow-up home visit in 2 weeks.',
      'Care Plan Review',
      'Reviewed Darlene\'s supported living goals via phone. She reported satisfaction with her current DSP and no changes in her support needs.',
      'Update ISP documentation to reflect current status. No service changes needed at this time.',
    ),
    ...makeNotes(
      individualIds['Robert_Castillo'], 'Robert Castillo', 'Bobby',
      'Case Management',
      'Bobby presented in good spirits. His multiple sclerosis symptoms are stable per his report. PCA Angela Park is providing consistent support with ADLs. Bobby is interested in a peer support group.',
      'Research MS peer support groups in Hamilton County. Confirm PCA schedule for next month.',
      'Provider Coordination',
      'Phone check-in with Bobby — all services running smoothly. He confirmed his upcoming PCP appointment.',
      'Confirm PCP appointment outcome and update health notes. Annual ISP meeting to be scheduled next month.',
    ),
    ...makeNotes(
      individualIds['Jerome_Henderson'], 'Jerome Henderson', 'Jerome',
      'Case Management',
      'Jerome was cooperative but appeared fatigued during the home visit. His DSP James Okafor reported increased confusion episodes this week. Progress note for 05/13 was discussed and will be uploaded by provider.',
      'Follow up with DSP regarding missing 05/13 progress note. Assess if increased confusion warrants medical evaluation.',
      'Assessment',
      'Telephone check-in — Jerome was brief but acknowledged understanding of his schedule. Family member (daughter Linda) joined the call briefly and expressed concern about recent behavioral changes.',
      'Schedule additional home visit within 7 days. Consult with nursing team regarding cognitive decline indicators.',
    ),
    ...makeNotes(
      individualIds['Patricia_Nguyen'], 'Patricia Nguyen', 'Pat',
      'Case Management',
      'Pat was engaged and provided detailed updates on her daily routine. Her chronic pain management plan appears to be effective. She expressed interest in exploring adaptive equipment for greater independence.',
      'Research adaptive equipment options through IHCP DME benefit. Coordinate with OT for evaluation referral.',
      'Provider Coordination',
      'Pat confirmed receipt of her updated medication list and reported no side effects. PCA services are meeting her needs.',
      'Continue monitoring pain management outcomes. No service changes at this time.',
    ),
  ];

  let noteCount = 0;
  for (const note of progressNotesData) {
    await addDoc(collection(db, 'progress_notes'), note);
    noteCount++;
  }
  console.log(`  ✅ Added ${noteCount} progress_notes`);

  // ── 5. INCIDENTS ────────────────────────────────────────────────────────────
  console.log('🚨 Seeding incidents…');

  const incidentsData = [
    {
      organizationId: 'demo',
      individualId: individualIds['Marcus_Williams'],
      individual_name: 'Marcus Williams',
      reportedBy: uid,
      reportedByName: 'Kathy Reynolds',
      incidentType: 'Fall',
      severity: 'Minor',
      description: 'Marcus reported a minor fall in his bathroom while getting ready in the morning. He was alone at the time. No loss of consciousness. Slight bruising on left hip noted.',
      immediateResponse: 'Staff assisted Marcus, checked for injury — minor bruising noted on left hip, no fracture suspected. Marcus was ambulatory and declined further medical evaluation.',
      status: 'open',
      notified911: false,
      notifiedFamily: true,
      notifiedSupervisor: true,
      reportedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      individualId: individualIds['Jerome_Henderson'],
      individual_name: 'Jerome Henderson',
      reportedBy: uid,
      reportedByName: 'Kathy Reynolds',
      incidentType: 'Behavioral Episode',
      severity: 'Moderate',
      description: 'Jerome became verbally agitated during a community outing and refused to return to the vehicle for approximately 20 minutes. DSP James Okafor was present and de-escalated the situation using trained techniques.',
      immediateResponse: 'DSP used verbal de-escalation. Jerome eventually returned to the vehicle without physical intervention. He was calm upon return to his residence. Family was notified.',
      status: 'open',
      notified911: false,
      notifiedFamily: true,
      notifiedSupervisor: true,
      reportedAt: pastDays(10),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  ];

  let incidentCount = 0;
  for (const incident of incidentsData) {
    await addDoc(collection(db, 'incidents'), incident);
    incidentCount++;
  }
  console.log(`  ✅ Added ${incidentCount} incidents`);

  // ── 6. BILLING CLAIMS ───────────────────────────────────────────────────────
  console.log('📋 Seeding billing_claims…');

  const billingClaims = [
    {
      organizationId: 'demo',
      participantName: 'Marcus D. Williams',
      medicaidId: 'IN8847231',
      serviceCode: 'T2022',
      serviceDescription: 'Home and Community-Based Waiver — Case Management, per 15 min',
      payer: 'IHCP',
      payerPlanName: 'Indiana Medicaid Fee-for-Service',
      units: 8,
      ratePerUnit: 4.19,
      totalAmount: 33.52,
      serviceDate: pastDays(3),
      billingPeriod: '2026-05',
      renderingProvider: 'Kathy Reynolds, CCM',
      npi: '1234567890',
      aiStatus: 'passed',
      aiStatusNote: 'All documentation requirements met. Units within authorized range.',
      billingStatus: 'ready',
      authorizationNumber: 'IH-2026-0044821',
      diagnosisCodes: ['F32.1', 'Z74.09'],
      claimType: 'professional',
      placeOfService: '12',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      participantName: 'Darlene F. Thompson',
      medicaidId: 'IN7712984',
      serviceCode: 'T2023',
      serviceDescription: 'Home and Community-Based Waiver — Supported Living, per diem',
      payer: 'Anthem Indiana',
      payerPlanName: 'Anthem Medicaid Hoosier Care Connect',
      units: 7,
      ratePerUnit: 89.50,
      totalAmount: 626.50,
      serviceDate: pastDays(5),
      billingPeriod: '2026-05',
      renderingProvider: 'Kathy Reynolds, CCM',
      npi: '1234567890',
      aiStatus: 'attention',
      aiStatusNote: 'Authorization expires in 4 days. Renewal documentation should be submitted.',
      billingStatus: 'hold',
      authorizationNumber: 'ANT-2026-0088342',
      diagnosisCodes: ['F70', 'G71.00'],
      claimType: 'professional',
      placeOfService: '14',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      participantName: 'Robert "Bobby" Castillo',
      medicaidId: 'IN9023417',
      serviceCode: 'T1016',
      serviceDescription: 'Personal Care Assistance — Home Health Aide, per 15 min',
      payer: 'MHS Indiana',
      payerPlanName: 'MHS Medicaid Managed Care',
      units: 32,
      ratePerUnit: 3.85,
      totalAmount: 123.20,
      serviceDate: pastDays(7),
      billingPeriod: '2026-05',
      renderingProvider: 'Angela Park, PCA',
      npi: '0987654321',
      aiStatus: 'passed',
      aiStatusNote: 'Documentation complete. Service log signed by participant and provider.',
      billingStatus: 'submitted',
      authorizationNumber: 'MHS-2026-0021198',
      diagnosisCodes: ['G35', 'Z74.01'],
      claimType: 'professional',
      placeOfService: '12',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      participantName: 'Shirley M. Baker',
      medicaidId: 'IN6634501',
      serviceCode: 'T2022',
      serviceDescription: 'Home and Community-Based Waiver — Case Management, per 15 min',
      payer: 'IHCP',
      payerPlanName: 'Indiana Medicaid Fee-for-Service',
      units: 6,
      ratePerUnit: 4.19,
      totalAmount: 25.14,
      serviceDate: pastDays(2),
      billingPeriod: '2026-05',
      renderingProvider: 'Kathy Reynolds, CCM',
      npi: '1234567890',
      aiStatus: 'passed',
      aiStatusNote: 'All required fields present. Plan of Care is current.',
      billingStatus: 'ready',
      authorizationNumber: 'IH-2026-0039774',
      diagnosisCodes: ['Z99.89', 'F33.0'],
      claimType: 'professional',
      placeOfService: '12',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      participantName: 'Jerome A. Henderson',
      medicaidId: 'IN5521893',
      serviceCode: 'T2023',
      serviceDescription: 'Home and Community-Based Waiver — Supported Living, per diem',
      payer: 'Anthem Indiana',
      payerPlanName: 'Anthem Medicaid Hoosier Care Connect',
      units: 14,
      ratePerUnit: 89.50,
      totalAmount: 1253.00,
      serviceDate: pastDays(10),
      billingPeriod: '2026-05',
      renderingProvider: 'James Okafor, DSP',
      npi: '1122334455',
      aiStatus: 'attention',
      aiStatusNote: 'Missing progress note for 05/13. Provider must upload before claim can be submitted.',
      billingStatus: 'hold',
      authorizationNumber: 'ANT-2026-0077512',
      diagnosisCodes: ['F70', 'R41.3'],
      claimType: 'professional',
      placeOfService: '14',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      participantName: 'Patricia "Pat" Nguyen',
      medicaidId: 'IN4418762',
      serviceCode: 'T1016',
      serviceDescription: 'Personal Care Assistance — Home Health Aide, per 15 min',
      payer: 'MHS Indiana',
      payerPlanName: 'MHS Medicaid Managed Care',
      units: 16,
      ratePerUnit: 3.85,
      totalAmount: 61.60,
      serviceDate: pastDays(1),
      billingPeriod: '2026-05',
      renderingProvider: 'Angela Park, PCA',
      npi: '0987654321',
      aiStatus: 'passed',
      aiStatusNote: 'Documentation complete and within authorized hours for the month.',
      billingStatus: 'ready',
      authorizationNumber: 'MHS-2026-0033441',
      diagnosisCodes: ['G71.09', 'Z74.09'],
      claimType: 'professional',
      placeOfService: '12',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      participantName: 'DeShawn L. Morris',
      medicaidId: 'IN3309845',
      serviceCode: 'T2022',
      serviceDescription: 'Home and Community-Based Waiver — Case Management, per 15 min',
      payer: 'IHCP',
      payerPlanName: 'Indiana Medicaid Fee-for-Service',
      units: 12,
      ratePerUnit: 4.19,
      totalAmount: 50.28,
      serviceDate: pastDays(4),
      billingPeriod: '2026-05',
      renderingProvider: 'Kathy Reynolds, CCM',
      npi: '1234567890',
      aiStatus: 'pending',
      aiStatusNote: 'AI review in progress. Estimated completion in 2 minutes.',
      billingStatus: 'ready',
      authorizationNumber: 'IH-2026-0041003',
      diagnosisCodes: ['F84.0', 'Z74.09'],
      claimType: 'professional',
      placeOfService: '12',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      participantName: 'Gloria J. Ramirez',
      medicaidId: 'IN2298731',
      serviceCode: 'T2023',
      serviceDescription: 'Home and Community-Based Waiver — Supported Living, per diem',
      payer: 'Anthem Indiana',
      payerPlanName: 'Anthem Medicaid Hoosier Care Connect',
      units: 10,
      ratePerUnit: 89.50,
      totalAmount: 895.00,
      serviceDate: pastDays(6),
      billingPeriod: '2026-05',
      renderingProvider: 'James Okafor, DSP',
      npi: '1122334455',
      aiStatus: 'passed',
      aiStatusNote: 'Claim documentation meets all IHCP HCBS waiver billing requirements.',
      billingStatus: 'submitted',
      authorizationNumber: 'ANT-2026-0091234',
      diagnosisCodes: ['F71', 'Z74.01'],
      claimType: 'professional',
      placeOfService: '14',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      participantName: 'Carl E. Johnson',
      medicaidId: 'IN1187524',
      serviceCode: 'T1016',
      serviceDescription: 'Personal Care Assistance — Home Health Aide, per 15 min',
      payer: 'MHS Indiana',
      payerPlanName: 'MHS Medicaid Managed Care',
      units: 24,
      ratePerUnit: 3.85,
      totalAmount: 92.40,
      serviceDate: pastDays(8),
      billingPeriod: '2026-05',
      renderingProvider: 'Angela Park, PCA',
      npi: '0987654321',
      aiStatus: 'attention',
      aiStatusNote: 'Service log signatures incomplete. Participant signature missing for 2 sessions.',
      billingStatus: 'hold',
      authorizationNumber: 'MHS-2026-0044887',
      diagnosisCodes: ['G35', 'R26.89'],
      claimType: 'professional',
      placeOfService: '12',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      participantName: 'Wanda R. Patel',
      medicaidId: 'IN0076312',
      serviceCode: 'T2022',
      serviceDescription: 'Home and Community-Based Waiver — Case Management, per 15 min',
      payer: 'IHCP',
      payerPlanName: 'Indiana Medicaid Fee-for-Service',
      units: 4,
      ratePerUnit: 4.19,
      totalAmount: 16.76,
      serviceDate: pastDays(1),
      billingPeriod: '2026-05',
      renderingProvider: 'Kathy Reynolds, CCM',
      npi: '1234567890',
      aiStatus: 'passed',
      aiStatusNote: 'All documentation requirements met. Units within authorized range.',
      billingStatus: 'ready',
      authorizationNumber: 'IH-2026-0048219',
      diagnosisCodes: ['Z99.89', 'F41.1'],
      claimType: 'professional',
      placeOfService: '12',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  ];

  let claimCount = 0;
  for (const claim of billingClaims) {
    await addDoc(collection(db, 'billing_claims'), claim);
    claimCount++;
  }
  console.log(`  ✅ Added ${claimCount} billing_claims`);

  // ── 7. NOTIFICATIONS ────────────────────────────────────────────────────────
  console.log('🔔 Seeding notifications…');

  const notifications = [
    {
      uid,
      organizationId: 'demo',
      title: 'Claim Requires Attention',
      body: "Darlene Thompson's T2023 claim is on hold — authorization expires in 4 days. Please initiate renewal.",
      type: 'alert',
      severity: 'warning',
      dismissed: false,
      read: false,
      href: '/billing',
      createdAt: serverTimestamp(),
    },
    {
      uid,
      organizationId: 'demo',
      title: 'Quarterly Assessment Due — DeShawn Morris',
      body: 'Annual level-of-care reassessment for DeShawn Morris is due in 7 days. Complete prior to billing cycle close.',
      type: 'task',
      severity: 'warning',
      dismissed: false,
      read: false,
      href: '/tasks',
      createdAt: serverTimestamp(),
    },
    {
      uid,
      organizationId: 'demo',
      title: 'New Message from Maria Gonzalez (Supervisor)',
      body: 'Hi Kathy — can you pull the May billing summary before the team meeting Thursday?',
      type: 'mention',
      severity: 'info',
      dismissed: false,
      read: false,
      href: '/messages',
      createdAt: serverTimestamp(),
    },
    {
      uid,
      organizationId: 'demo',
      title: 'Progress Note Missing — Jerome Henderson',
      body: 'The AI billing reviewer flagged a missing progress note for 05/13. Upload the note to unblock claim submission.',
      type: 'alert',
      severity: 'critical',
      dismissed: false,
      read: false,
      href: '/billing',
      createdAt: serverTimestamp(),
    },
    {
      uid,
      organizationId: 'demo',
      title: 'Plan of Care Updated — Gloria Ramirez',
      body: 'The ISP/Plan of Care for Gloria Ramirez was updated by the team. Review the changes before your next visit.',
      type: 'task',
      severity: 'info',
      dismissed: false,
      read: false,
      href: '/participants',
      createdAt: serverTimestamp(),
    },
  ];

  let notifCount = 0;
  for (const notif of notifications) {
    await addDoc(collection(db, 'notifications'), notif);
    notifCount++;
  }
  console.log(`  ✅ Added ${notifCount} notifications`);

  // ── 8. TASKS ────────────────────────────────────────────────────────────────
  console.log('✅ Seeding tasks…');

  const tasks = [
    {
      organizationId: 'demo',
      assignedTo: uid,
      assignedToName: 'Kathy Reynolds',
      title: 'Complete Quarterly Assessment — Marcus Williams',
      description: 'Conduct and document the quarterly level-of-care assessment per HCBS waiver requirements. Verify current diagnoses and update ISP goals.',
      status: 'open',
      priority: 'high',
      category: 'Assessment',
      dueDate: daysFromNow(7),
      participantName: 'Marcus D. Williams',
      participantId: individualIds['Marcus_Williams'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      assignedTo: uid,
      assignedToName: 'Kathy Reynolds',
      title: 'Home Visit — Darlene Thompson',
      description: 'Conduct scheduled monthly in-home visit. Review supported living goals, document observations, and discuss authorization renewal timeline with Darlene.',
      status: 'open',
      priority: 'high',
      category: 'Visit',
      dueDate: daysFromNow(3),
      participantName: 'Darlene F. Thompson',
      participantId: individualIds['Darlene_Thompson'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      assignedTo: uid,
      assignedToName: 'Kathy Reynolds',
      title: 'Submit Authorization Renewal — Darlene Thompson',
      description: 'T2023 authorization expires in 4 days. Gather supporting documentation and submit renewal request to Anthem Indiana prior to expiration.',
      status: 'open',
      priority: 'high',
      category: 'Planning',
      dueDate: daysFromNow(4),
      participantName: 'Darlene F. Thompson',
      participantId: individualIds['Darlene_Thompson'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      assignedTo: uid,
      assignedToName: 'Kathy Reynolds',
      title: 'Upload Missing Progress Note — Jerome Henderson (05/13)',
      description: 'AI billing review flagged a missing progress note for Jerome Henderson on 05/13. Locate, finalize, and upload the note to unblock claim submission.',
      status: 'open',
      priority: 'high',
      category: 'Monitoring',
      dueDate: daysFromNow(1),
      participantName: 'Jerome A. Henderson',
      participantId: individualIds['Jerome_Henderson'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      assignedTo: uid,
      assignedToName: 'Kathy Reynolds',
      title: 'Annual ISP Meeting — Robert Castillo',
      description: 'Schedule and facilitate the annual Individual Support Plan meeting. Invite Bobby, his family guardian, and the DSP team. Document outcomes and update plan.',
      status: 'open',
      priority: 'medium',
      category: 'Planning',
      dueDate: daysFromNow(14),
      participantName: 'Robert Castillo',
      participantId: individualIds['Robert_Castillo'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      assignedTo: uid,
      assignedToName: 'Kathy Reynolds',
      title: 'New Participant Intake — Wanda Patel',
      description: 'Complete intake documentation for new participant Wanda Patel. Verify Medicaid eligibility, collect consent forms, and conduct initial needs assessment.',
      status: 'open',
      priority: 'medium',
      category: 'Assessment',
      dueDate: daysFromNow(10),
      participantName: 'Wanda R. Patel',
      participantId: 'participant_wanda_patel',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      assignedTo: uid,
      assignedToName: 'Kathy Reynolds',
      title: 'Obtain Signed Consent — Carl Johnson',
      description: 'Carl Johnson has not signed the updated HIPAA consent and Release of Information forms. Collect signatures during next home visit or via secure e-signature.',
      status: 'open',
      priority: 'medium',
      category: 'Consent',
      dueDate: daysFromNow(21),
      participantName: 'Carl E. Johnson',
      participantId: 'participant_carl_johnson',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      assignedTo: uid,
      assignedToName: 'Kathy Reynolds',
      title: 'Medication Monitoring Check — Shirley Baker',
      description: 'Coordinate with Shirley\'s primary care physician to review current medication regimen. Document any changes in the care plan and flag concerns to the nursing team.',
      status: 'open',
      priority: 'medium',
      category: 'Monitoring',
      dueDate: daysFromNow(30),
      participantName: 'Shirley M. Baker',
      participantId: 'participant_shirley_baker',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  ];

  let taskCount = 0;
  for (const task of tasks) {
    await addDoc(collection(db, 'tasks'), task);
    taskCount++;
  }
  console.log(`  ✅ Added ${taskCount} tasks`);

  // ── 9. AUDIT LOG ────────────────────────────────────────────────────────────
  console.log('📜 Seeding audit_log…');

  const auditLog = [
    {
      organizationId: 'demo',
      actorId: uid,
      actorName: 'Kathy Reynolds',
      actorEmail: 'kathy@demo.casemanagement.ai',
      action: 'progress_note_created',
      targetType: 'participant',
      targetId: individualIds['Marcus_Williams'],
      targetName: 'Marcus D. Williams',
      details: 'Created progress note for home visit on 2026-05-20. Documented goal progress and updated ADL status.',
      ipAddress: '72.34.91.210',
      userAgent: 'Chrome/124 — macOS',
      createdAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      actorId: uid,
      actorName: 'Kathy Reynolds',
      actorEmail: 'kathy@demo.casemanagement.ai',
      action: 'participant_intake_created',
      targetType: 'participant',
      targetId: 'participant_wanda_patel',
      targetName: 'Wanda R. Patel',
      details: 'Created new participant intake record. Initial needs assessment completed and Medicaid eligibility verified.',
      ipAddress: '72.34.91.210',
      userAgent: 'Chrome/124 — macOS',
      createdAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      actorId: uid,
      actorName: 'Kathy Reynolds',
      actorEmail: 'kathy@demo.casemanagement.ai',
      action: 'login',
      targetType: 'session',
      targetId: null,
      targetName: null,
      details: 'Successful login via email/password authentication.',
      ipAddress: '72.34.91.210',
      userAgent: 'Chrome/124 — macOS',
      createdAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      actorId: uid,
      actorName: 'Kathy Reynolds',
      actorEmail: 'kathy@demo.casemanagement.ai',
      action: 'billing_claim_submitted',
      targetType: 'billing_claim',
      targetId: 'claim_gloria_ramirez_t2023',
      targetName: 'Gloria Ramirez — T2023 May 2026',
      details: 'Submitted billing claim to Anthem Indiana for T2023 services. 10 units, $895.00.',
      ipAddress: '72.34.91.210',
      userAgent: 'Chrome/124 — macOS',
      createdAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      actorId: uid,
      actorName: 'Kathy Reynolds',
      actorEmail: 'kathy@demo.casemanagement.ai',
      action: 'care_plan_updated',
      targetType: 'participant',
      targetId: 'participant_gloria_ramirez',
      targetName: 'Gloria J. Ramirez',
      details: 'Updated ISP goals: Added community integration goal, revised supported employment milestones, and updated emergency contact information.',
      ipAddress: '72.34.91.210',
      userAgent: 'Chrome/124 — macOS',
      createdAt: serverTimestamp(),
    },
  ];

  let auditCount = 0;
  for (const entry of auditLog) {
    await addDoc(collection(db, 'audit_log'), entry);
    auditCount++;
  }
  console.log(`  ✅ Added ${auditCount} audit_log entries`);

  // ── 10. CONVERSATIONS ───────────────────────────────────────────────────────
  console.log('💬 Seeding conversations…');

  // Supervisor UID placeholder — in a real system this would be looked up.
  // Using a stable demo UID so the conversation renders correctly in the UI.
  const supervisorUid = 'demo_supervisor_maria_gonzalez';
  const teamUids = [uid, supervisorUid, 'demo_cm_james_okafor', 'demo_cm_angela_park'];

  const conversations = [
    {
      organizationId: 'demo',
      type: 'direct',
      members: [uid, supervisorUid],
      memberNames: {
        [uid]: 'Kathy Reynolds',
        [supervisorUid]: 'Maria Gonzalez',
      },
      memberEmails: {
        [uid]: 'kathy@demo.casemanagement.ai',
        [supervisorUid]: 'maria@demo.casemanagement.ai',
      },
      lastMessage: {
        text: 'Hi Kathy — can you pull the May billing summary before the team meeting Thursday?',
        senderId: supervisorUid,
        senderName: 'Maria Gonzalez',
        sentAt: serverTimestamp(),
      },
      unreadCounts: {
        [uid]: 1,
        [supervisorUid]: 0,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      organizationId: 'demo',
      type: 'group',
      name: 'Eastside HCBS Team',
      description: 'Coordination channel for Eastside case managers and direct support staff.',
      members: teamUids,
      memberNames: {
        [uid]: 'Kathy Reynolds',
        [supervisorUid]: 'Maria Gonzalez',
        'demo_cm_james_okafor': 'James Okafor',
        'demo_cm_angela_park': 'Angela Park',
      },
      memberEmails: {
        [uid]: 'kathy@demo.casemanagement.ai',
        [supervisorUid]: 'maria@demo.casemanagement.ai',
        'demo_cm_james_okafor': 'james@demo.casemanagement.ai',
        'demo_cm_angela_park': 'angela@demo.casemanagement.ai',
      },
      lastMessage: {
        text: "Jerome Henderson's progress note for 05/13 is still missing — can whoever did the visit upload it today?",
        senderId: uid,
        senderName: 'Kathy Reynolds',
        sentAt: serverTimestamp(),
      },
      unreadCounts: {
        [uid]: 0,
        [supervisorUid]: 1,
        'demo_cm_james_okafor': 1,
        'demo_cm_angela_park': 1,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  ];

  let convCount = 0;
  for (const convo of conversations) {
    await addDoc(collection(db, 'conversations'), convo);
    convCount++;
  }
  console.log(`  ✅ Added ${convCount} conversations`);

  // ── 11. Summary ─────────────────────────────────────────────────────────────
  console.log('\n🎉 Firestore demo data seeding complete!');
  console.log('─────────────────────────────────────────');
  console.log(`  individuals     : ${individualCount}`);
  console.log(`  progress_notes  : ${noteCount}`);
  console.log(`  incidents       : ${incidentCount}`);
  console.log(`  billing_claims  : ${claimCount}`);
  console.log(`  notifications   : ${notifCount}`);
  console.log(`  tasks           : ${taskCount}`);
  console.log(`  audit_log       : ${auditCount}`);
  console.log(`  conversations   : ${convCount}`);
  console.log('─────────────────────────────────────────');
  console.log('Reload the app to see the seeded data.');
})();
