#!/usr/bin/env node
/**
 * seed-comprehensive.cjs — CaseManagement.AI Full Demo Data Seeder
 *
 * Adds 2-3 months of realistic HCBS demo data for the first 10 individuals
 * in demo-org-001. Covers every major feature of the app.
 *
 * Run from the scripts/ directory:
 *   node seed-comprehensive.cjs
 */
"use strict";

const { initializeApp }   = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const {
  getFirestore, collection, doc, getDocs, updateDoc, setDoc, getDoc,
  addDoc, query, where, limit, serverTimestamp, Timestamp,
} = require("firebase/firestore");
const path = require("path");

// Load env from repo root
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// ── Firebase init ─────────────────────────────────────────────────────────────
const app = initializeApp({
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db   = getFirestore(app);

// ── Config ────────────────────────────────────────────────────────────────────
const ORG_ID       = "org_casemanagement_ai";
const ADMIN_EMAIL  = "kathy@demo.casemanagement.ai";
const ADMIN_PASS   = "Demo1234!";
const NOW          = new Date();

// ── Helpers ───────────────────────────────────────────────────────────────────
const daysAgo  = n => { const d = new Date(NOW); d.setDate(d.getDate() - n); return d; };
const isoDate  = d => d.toISOString().slice(0, 10);
const ts       = d => Timestamp.fromDate(d instanceof Date ? d : new Date(d));
const pick     = arr => arr[Math.floor(Math.random() * arr.length)];
const pickN    = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
const rand     = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const col      = name => collection(db, name);

async function addMany(collectionName, docs) {
  for (const d of docs) await addDoc(col(collectionName), d);
}

// ── Staff personas ─────────────────────────────────────────────────────────────
const STAFF = [
  { uid: "staff-cm-001", name: "Maria Gonzalez",  role: "case_manager", credential: "LSW",  email: "maria.gonzalez@demo.casemanagement.ai" },
  { uid: "staff-cm-002", name: "James Patterson",  role: "case_manager", credential: "QIDP", email: "james.patterson@demo.casemanagement.ai" },
  { uid: "staff-sup-001", name: "Angela Brooks",   role: "supervisor",   credential: "LCSW", email: "angela.brooks@demo.casemanagement.ai" },
];
const CMS = STAFF.filter(s => s.role === "case_manager");
const SUP = STAFF.find(s => s.role === "supervisor");

// ── Content pools ─────────────────────────────────────────────────────────────
const ACTIVITY_TYPES = ["Case Management","Community Integration","Assessment","Care Plan Review","Crisis Intervention","Family/Guardian Meeting","Provider Coordination","Training","Transportation","Other"];
const CONTACT_TYPES  = ["In-Person","Telephone","Telehealth","Home Visit","Community Visit"];
const PROGRAMS  = ["HCBS Waiver — Community Integration","HCBS Waiver — Supported Living","HCBS Waiver — Personal Care"];
const DIAGNOSES = ["Intellectual Disability, Mild (F70)","Autism Spectrum Disorder (F84.0)","Down Syndrome (Q90.9)","Cerebral Palsy, Spastic Diplegia (G80.1)","Intellectual Disability, Moderate (F71)","Traumatic Brain Injury (S09.90XA)","Developmental Delay, Unspecified (F88)","Intellectual Disability, Severe (F72)","Epilepsy, Generalized (G40.309)","Prader-Willi Syndrome (Q87.11)"];
const PHYSICIANS = ["Dr. Sarah Mitchell","Dr. Robert Chen","Dr. Lisa Patel","Dr. James Okafor","Dr. Priya Sharma"];
const HOSPITALS  = ["IU Health Methodist Hospital","St. Vincent Indianapolis Hospital","Community Health Network","Eskenazi Health"];
const PAYERS     = ["IHCP","Anthem Indiana","MHS Indiana","MDwise","Humana CareSource"];
const SVC_CODES  = ["T2022","T2041","H2014","T2019","H0043","T2025"];
const CITIES     = ["Indianapolis","Bloomington","Fort Wayne","Evansville","South Bend","Carmel","Fishers","Noblesville"];
const STREETS    = ["Oak St","Maple Ave","Elm Blvd","Pine Dr","Cedar Ln","Walnut Rd","Birch Ct","Willow Way"];
const PURPOSES   = [
  "Conduct monthly case management visit to review goals and assess current support needs.",
  "Follow-up on recent medical appointment and update care plan accordingly.",
  "Complete quarterly monitoring and review progress on ISP goals.",
  "Coordinate with provider team regarding upcoming service changes.",
  "Support individual in accessing community resources and recreational activities.",
  "Review and update emergency contact information and safety plan.",
  "Facilitate team meeting with family, guardian, and service providers.",
  "Assess need for additional supports following recent life change.",
  "Conduct annual plan review and gather input from support circle.",
  "Follow-up on incident report and review corrective action steps.",
];
const OBSERVATIONS = [
  "Individual appeared engaged and in good spirits throughout the visit. Expressed satisfaction with current supports.",
  "Individual reported feeling supported by their care team. No significant health concerns noted at this time.",
  "Individual demonstrated improved communication skills since last visit. Staff noted increased confidence in self-advocacy.",
  "Individual is making steady progress toward identified goals. Support team is well-coordinated.",
  "Guardian present during visit and expressed appreciation for consistent and responsive case management services.",
  "Individual participated actively in goal-setting discussion. Expressed desire to increase community participation activities.",
  "Individual reported some difficulty with sleep but otherwise health is stable. Will monitor and follow up.",
  "Provider reported positive engagement during day program. Individual is attending regularly and participating well.",
  "Individual continues to live safely in current placement. Home environment is clean, organized, and appropriate.",
  "Medications reviewed; individual is compliant with prescribed regimen per nursing notes on file.",
];
const NEXT_STEPS = [
  "Schedule follow-up with primary care physician for annual physical examination.",
  "Update ISP goals based on today's discussion. Submit revised plan by end of month.",
  "Contact day program coordinator to discuss increased participation opportunities.",
  "Review service authorization renewal timeline and submit prior authorization request.",
  "Coordinate with guardian regarding upcoming family visit and support needs.",
  "Document all progress notes and update task list in the system.",
  "Schedule next monthly monitoring visit within 30 days of today.",
  "Follow up with residential provider regarding reported concerns from last visit.",
  "Submit eligibility verification request to Medicaid office prior to redetermination date.",
  "Review incident report and ensure all corrective actions are documented and in place.",
];

const photoUrl = (gender, idx) => {
  const n = 10 + (idx % 15);
  return (gender || "").toLowerCase().startsWith("f")
    ? `https://randomuser.me/api/portraits/women/${n}.jpg`
    : `https://randomuser.me/api/portraits/men/${n}.jpg`;
};

// ── Enrich individual profile ─────────────────────────────────────────────────
async function enrichIndividual(ind, cm, idx) {
  const gender = ind.gender || pick(["Male", "Female"]);
  const locs   = ["Level 1", "Level 2", "Level 3", "Level 4"];
  const guardians = ["Patricia Williams","Robert Johnson","Linda Martinez","Thomas Brown","Susan Davis"];
  const guardianRels = ["Mother","Father","Sibling","Aunt/Uncle","State Guardian"];
  const legalStats = ["Guardian of Person and Estate","Guardian of Person Only","Self-Determination","POA — Medical"];
  const waiverTypes = ["CIH","FSW","COMP","BI"];
  const livingSits = ["Independent Living","Family Home","Group Home","Supported Living Arrangement","Foster Care"];
  const refSrcs = ["BDDS","Division of Disability and Rehabilitative Services","Hospital Discharge","Self-Referral","Family Referral"];
  const secDx = ["Anxiety Disorder (F41.9)","ADHD (F90.0)","Seizure Disorder (G40.909)","None","Hypertension (I10)"];
  const icd = ["F70","F84.0","Q90.9","G80.1","F71","F88"];

  await setDoc(doc(db, "individuals", ind.id), {
    photo_url:                 ind.photo_url || photoUrl(gender, idx),
    gender,
    assigned_case_manager:     cm.uid,
    assigned_case_manager_uid: cm.uid,
    assigned_case_manager_name:cm.name,
    assigned_supervisor_uid:   SUP.uid,
    assigned_supervisor_name:  SUP.name,
    program:                   ind.program || PROGRAMS[idx % PROGRAMS.length],
    program_type:              "HCBS Waiver",
    waiver_type:               pick(waiverTypes),
    level_of_care:             ind.level_of_care || locs[idx % locs.length],
    service_category:          pick(["Community Integration","Supported Living","Personal Care","Day Services"]),
    funding_stream:            "Medicaid HCBS",
    case_number:               ind.case_number || `CM-2024-${String(1000 + idx).padStart(4, "0")}`,
    primary_diagnosis:         ind.primary_diagnosis || DIAGNOSES[idx % DIAGNOSES.length],
    secondary_diagnoses:       pick(secDx),
    icd10_codes:               `${icd[idx % icd.length]}, Z74.09`,
    primary_physician_name:    pick(PHYSICIANS),
    primary_physician_phone:   `(317) ${rand(200,999)}-${rand(1000,9999)}`,
    hospital_preference:       pick(HOSPITALS),
    ma_status:                 "Active",
    ma_id:                     ind.ma_id || `MA${rand(100000000,999999999)}`,
    ma_type:                   "Waiver Related",
    ma_effective_date:         isoDate(daysAgo(365)),
    ma_redetermination_date:   isoDate(daysAgo(-180)),
    legal_status:              pick(legalStats),
    guardian_name:             pick(guardians),
    guardian_relationship:     pick(guardianRels),
    guardian_phone:            `(317) ${rand(200,999)}-${rand(1000,9999)}`,
    guardian_email:            `guardian${idx + 1}@familyemail.com`,
    emergency_contact_name:    pick(["John Williams","Mary Johnson","Carlos Martinez","Sandra Brown"]),
    emergency_contact_relation:pick(["Parent","Sibling","Spouse","Friend"]),
    emergency_contact_phone:   `(317) ${rand(200,999)}-${rand(1000,9999)}`,
    pcp_due_date:              isoDate(daysAgo(-60)),
    isp_due_date:              isoDate(daysAgo(-60)),
    next_isp_date:             isoDate(daysAgo(-60)),
    last_annual_plan_date:     isoDate(daysAgo(30)),
    pcp_status:                pick(["On Track","Due Soon","Overdue"]),
    risk_score:                rand(25, 85),
    monitoring_compliance_pct: rand(60, 100),
    open_tasks:                rand(1, 4),
    living_situation:          pick(livingSits),
    primary_language:          pick(["English","English","English","Spanish"]),
    admission_date:            isoDate(daysAgo(rand(365,730))),
    referral_date:             isoDate(daysAgo(rand(400,800))),
    referral_source:           pick(refSrcs),
    address_street:            `${rand(100,9999)} ${pick(STREETS)}`,
    address_city:              pick(CITIES),
    address_state:             "IN",
    address_zip:               `4${rand(6000,6999)}`,
    phone_home:                `(317) ${rand(200,999)}-${rand(1000,9999)}`,
    phone_cell:                `(317) ${rand(200,999)}-${rand(1000,9999)}`,
    updatedAt:                 serverTimestamp(),
  }, { merge: true });
}

// ── Progress Notes ─────────────────────────────────────────────────────────────
async function seedProgressNotes(ind, cm, name) {
  const count = rand(8, 12);
  const goalTexts = [
    "Increase independent living skills", "Expand community participation",
    "Develop communication strategies", "Maintain health and wellness routine",
    "Strengthen family/support relationships",
  ];
  for (let i = 0; i < count; i++) {
    const d = daysAgo(rand(5, 90));
    const status = i < 2 ? "draft" : i < count - 1 ? "signed" : "pending_signature";
    await addDoc(col("progress_notes"), {
      individualId: ind.id, organizationId: ORG_ID,
      authorId: cm.uid, authorName: cm.name,
      activityType: pick(ACTIVITY_TYPES), contactType: pick(CONTACT_TYPES),
      progressDate: isoDate(d),
      startTime: `${rand(8,14)}:${pick(["00","15","30","45"])}`,
      endTime:   `${rand(9,16)}:${pick(["00","15","30","45"])}`,
      isBillable: Math.random() > 0.2,
      purposeOfActivity: pick(PURPOSES),
      goalsProgress: [
        { goalId:"goal-1", goalText: pick(goalTexts), progressStatus: pick(["progressing","progressing","no_change","met"]),    narrative: pick(OBSERVATIONS) },
        { goalId:"goal-2", goalText: pick(goalTexts), progressStatus: pick(["progressing","no_change","regressing"]), narrative: pick(OBSERVATIONS) },
      ],
      additionalObservations: pick(OBSERVATIONS),
      nextSteps: pick(NEXT_STEPS),
      status,
      aiDrafted: Math.random() > 0.5,
      signedAt: status === "signed" ? ts(new Date(d.getTime() + 86400000)) : null,
      createdAt: ts(d), updatedAt: ts(d),
    });
  }
  return count;
}

// ── Contact Notes ──────────────────────────────────────────────────────────────
async function seedContactNotes(ind, cm, name) {
  const count = rand(4, 7);
  for (let i = 0; i < count; i++) {
    const d = daysAgo(rand(5, 90));
    await addDoc(col("contact_notes"), {
      organizationId: ORG_ID,
      individual_id: ind.id, individual_name: name,
      author_uid: cm.uid, author_name: cm.name,
      date: isoDate(d), activityType: pick(ACTIVITY_TYPES), contactType: pick(CONTACT_TYPES),
      billable: Math.random() > 0.3,
      startTime: `${rand(8,14)}:00`, endTime: `${rand(9,16)}:30`,
      purpose: pick(PURPOSES),
      background: `${name} has been enrolled in HCBS services for ${rand(1,5)} year(s). Current supports are functioning well.`,
      present: pick(["Individual, Case Manager","Individual, Case Manager, Guardian","Individual, Case Manager, Provider Rep"]),
      details: pick(OBSERVATIONS),
      issues: pick(["No concerns noted at this time.","Minor concern regarding schedule — being addressed.","Guardian reported sleep difficulties — following up with physician."]),
      nextSteps: pick(NEXT_STEPS),
      status: pick(["signed","signed","submitted","draft"]),
      created_at: ts(d), updated_at: ts(d),
    });
  }
  return count;
}

// ── Visit Summaries ────────────────────────────────────────────────────────────
async function seedVisitSummaries(ind, cm, name) {
  const count = rand(3, 5);
  for (let i = 0; i < count; i++) {
    const d = daysAgo(rand(7, 85));
    await addDoc(col("visit_summaries"), {
      organizationId: ORG_ID,
      individual_id: ind.id, individual_name: name,
      visit_date: isoDate(d),
      start_time: `${rand(9,13)}:00`, end_time: `${rand(10,15)}:30`,
      location: pick(["Individual's Home","Day Program","Community Center","Agency Office","Medical Office"]),
      purpose_of_support: pick(PURPOSES),
      what_went_well: pick(["Individual was receptive and engaged. Goals reviewed thoroughly.","Positive interaction with guardian. Individual demonstrated improved self-advocacy.","Individual completed a community outing with minimal support.","Team meeting went smoothly; all providers aligned on support plan."]),
      what_is_not_working: pick(["Transportation to day program remains a challenge. Exploring alternatives.","Individual frustrated with schedule — reviewing options together.","Sleep inconsistent — physician has been notified.","None identified at this time."]),
      goals_addressed: pickN(["Community Participation","Independent Living Skills","Health & Wellness","Social Connections","Communication","Vocational Skills"], rand(2,4)),
      next_steps: pick(NEXT_STEPS),
      status: pick(["signed","signed","submitted"]),
      author_uid: cm.uid, author_name: cm.name,
      created_at: ts(d), updated_at: ts(d),
    });
  }
  return count;
}

// ── Tasks ──────────────────────────────────────────────────────────────────────
async function seedTasks(ind, cm, name) {
  const defs = [
    { title:"Complete monthly progress note",       type:"Progress Note Due",       priority:"high",   offset: rand(-5,15) },
    { title:"Schedule annual ISP meeting",          type:"Care Plan Review",         priority:"high",   offset: rand(5,30) },
    { title:"Submit eligibility verification",      type:"Eligibility Verification", priority:"medium", offset: rand(-10,20) },
    { title:"Review and update emergency contacts", type:"Document Review",          priority:"low",    offset: rand(5,45) },
    { title:"Coordinate with day program provider", type:"Contact Required",         priority:"medium", offset: rand(-3,14) },
    { title:"Complete quarterly monitoring form",   type:"Monitoring Form",          priority:"high",   offset: rand(-15,5) },
    { title:"Update service authorization",         type:"Plan Renewal",             priority:"high",   offset: rand(10,45) },
    { title:"Conduct scheduled home visit",         type:"Visit Scheduled",          priority:"medium", offset: rand(2,20) },
  ];
  for (const t of defs) {
    const due = daysAgo(-t.offset);
    const overdue = t.offset < 0;
    const done = Math.random() > 0.6 && !overdue;
    await addDoc(col("tasks"), {
      title: t.title, description: `${t.title} for ${name}.`,
      individualId: ind.id, individualName: name,
      dueDate: isoDate(due),
      status: done ? "completed" : overdue ? "overdue" : pick(["open","in_progress"]),
      priority: t.priority, type: t.type,
      assignedTo: cm.uid, organizationId: ORG_ID,
      createdAt: ts(daysAgo(rand(10,60))), updatedAt: ts(daysAgo(rand(0,5))),
      completedAt: done ? ts(daysAgo(rand(1,5))) : null,
    });
  }
  return defs.length;
}

// ── Incidents ──────────────────────────────────────────────────────────────────
async function seedIncidents(ind, cm, name) {
  const count = rand(1, 2);
  const types = ["Behavioral Incident","Fall / Injury","Medication Error","Community Safety","Environmental Hazard"];
  for (let i = 0; i < count; i++) {
    const d = daysAgo(rand(10, 80));
    const sev = pick(["minor","minor","informational","major"]);
    await addDoc(col("incidents"), {
      individualId: ind.id, organizationId: ORG_ID,
      type: pick(types), severity: sev,
      status: pick(["closed","closed","in_review"]),
      description: pick([
        `${name} experienced a minor behavioral incident during day program. Staff intervened appropriately. Individual calmed within 15 minutes. Guardian notified per protocol.`,
        `${name} reported a fall in the home. No injuries sustained. Safety assessment completed. Home modifications discussed with residential provider.`,
        `${name} missed a scheduled medication dose. Provider notified. Corrective action plan updated. Physician informed per agency protocol.`,
        `${name} expressed frustration during a community outing. De-escalation strategies employed successfully. No safety concerns at this time.`,
      ]),
      reportedAt: d.toISOString(), reportedBy: cm.uid, reportedByName: cm.name,
      closedAt: sev !== "major" ? daysAgo(rand(1,5)).toISOString() : null,
      createdAt: ts(d), updatedAt: ts(d),
    });
  }
  return count;
}

// ── Care Plan ──────────────────────────────────────────────────────────────────
async function seedCarePlan(ind, cm, name) {
  const d = daysAgo(rand(30, 60));
  await addDoc(col("care_plans"), {
    organizationId: ORG_ID,
    individual_id: ind.id,
    title: `${name} — Annual Support Plan`,
    plan_type: "Annual ISP", status: "active",
    effective_date: isoDate(d), review_date: isoDate(daysAgo(-335)),
    goals: [
      { id:"goal-1", goal:"Increase independent living skills including meal preparation and home management with decreasing staff support", priority:"high", target_date: isoDate(daysAgo(-180)), progress:"in_progress", interventions:["Weekly coaching sessions on meal preparation","Visual supports and checklists for daily routines","Community cooking class participation"] },
      { id:"goal-2", goal:"Expand community participation by engaging in at least 2 community activities per month with support", priority:"high", target_date: isoDate(daysAgo(-90)), progress:"in_progress", interventions:["Identify preferred community activities with individual","Arrange accessible transportation for community outings","Support development of meaningful social connections"] },
      { id:"goal-3", goal:"Maintain health and wellness routine including medication management with minimal prompting from staff", priority:"medium", target_date: isoDate(daysAgo(-60)), progress:"in_progress", interventions:["Daily medication log and automated reminders","Coordinate with nursing for quarterly health checks","Support attendance at all scheduled medical appointments"] },
    ],
    author_uid: cm.uid, author_name: cm.name,
    created_at: ts(d), updated_at: ts(daysAgo(rand(1,14))),
  });
}

// ── Monitoring Forms ───────────────────────────────────────────────────────────
async function seedMonitoringForms(ind, cm, name) {
  for (let i = 0; i < 3; i++) {
    const d = daysAgo(rand(10, 90) + i * 30);
    await addDoc(col("monitoring_forms"), {
      organizationId: ORG_ID,
      individual_id: ind.id, type: i === 2 ? "Quarterly" : "Monthly",
      status: pick(["Submitted","Submitted","In Progress"]), active: "Active",
      due_date: isoDate(daysAgo(-10 + i * 30)), submitted_date: isoDate(d),
      author_uid: cm.uid, author_name: cm.name, updated_by: cm.uid,
      sections: {
        health_status: pick(["Stable","Stable","Improved","Monitoring"]),
        community_participation: `Individual participated in ${rand(2,8)} community activities this period.`,
        goal_progress: "Progress is being made on all identified goals. Individual remains engaged and motivated.",
        concerns: pick(["None noted at this time.","Minor sleep disruption reported by residential provider.","Follow-up needed on transportation access to day program."]),
        recommendations: pick(NEXT_STEPS),
      },
      created_at: ts(d), updated_at: ts(d),
    });
  }
}

// ── Service Authorizations ─────────────────────────────────────────────────────
async function seedServiceAuthorizations(ind, cm, name) {
  const auths = [
    { service: "Community Integration Habilitation", code: "T2022", units: rand(200,400), rate: 16.50 },
    { service: "Supported Living",                   code: "T2041", units: rand(100,200), rate: 22.00 },
  ];
  for (const a of auths) {
    const used = Math.floor(a.units * (Math.random() * 0.7 + 0.1));
    const start = daysAgo(180);
    await addDoc(col("service_authorizations"), {
      individualId: ind.id, individual_id: ind.id, individualName: name, organizationId: ORG_ID,
      assigned_case_manager_id: cm.uid, assigned_case_manager_name: cm.name,
      auth_number: `AUTH-${rand(10000,99999)}`, service_name: a.service,
      procedure_code: a.code, payer: pick(PAYERS),
      units_authorized: a.units, units_used: used, billing_period: "monthly",
      start_date: isoDate(start), end_date: isoDate(daysAgo(-185)), status: "active",
      notes: "Authorization in good standing. Units being utilized appropriately per service plan.",
      created_at: ts(start), updated_at: ts(daysAgo(rand(1,30))),
    });
  }
}

// ── Referrals ──────────────────────────────────────────────────────────────────
async function seedReferrals(ind, cm, name) {
  const defs = [
    { type:"Behavioral Health Services",  to:"Midtown Community Mental Health Center",    priority:"routine", status:"completed" },
    { type:"Vocational Services",          to:"Indiana Vocational Rehabilitation Services", priority:"routine", status:"in_progress" },
  ];
  for (const r of defs) {
    const d = daysAgo(rand(30, 90));
    await addDoc(col("referrals"), {
      organizationId: ORG_ID,
      individual_id: ind.id, individual_name: name,
      referral_type: r.type, referred_to: r.to,
      referred_by: cm.name, referred_by_uid: cm.uid,
      date: isoDate(d), priority: r.priority, status: r.status,
      notes: `Referral submitted for ${name} to access ${r.type}. Individual has expressed strong interest in this service.`,
      outcome: r.status === "completed" ? "Individual successfully connected with services. Initial intake completed." : "",
      created_at: ts(d), updated_at: ts(daysAgo(rand(1,20))),
    });
  }
}

// ── Eligibility ────────────────────────────────────────────────────────────────
async function seedEligibility(ind, cm) {
  const d = daysAgo(rand(15, 45));
  await addDoc(col("eligibility_verifications"), {
    organizationId: ORG_ID,
    individual_id: ind.id, verification_date: isoDate(d),
    maStatus: pick(["MA Eligible — Active","MA Eligible — Active","MA Eligible — Renewal Pending"]),
    maNumber: `MA${rand(100000000,999999999)}`, maType: "Waiver Related", recordStatus: "Active",
    effectiveDate: isoDate(daysAgo(365)), renewalDate: isoDate(daysAgo(-180)), redeterminationDate: isoDate(daysAgo(-175)),
    fundingSources: [{ id:"fs-1", type:"Medicaid HCBS Waiver", policyNumber:`WVR-${rand(10000,99999)}`, effectiveDate: isoDate(daysAgo(365)), renewalDate: isoDate(daysAgo(-180)), status:"Active", notes:"Primary funding source. Annual redetermination scheduled." }],
    verified_by: cm.name, updatedBy: cm.uid, updatedOn: isoDate(d),
    notes: "Medicaid eligibility confirmed. Individual maintains active waiver enrollment in good standing.",
    created_at: ts(d),
  });
}

// ── Billing Claims ─────────────────────────────────────────────────────────────
async function seedBillingClaims(ind, cm, name) {
  const count = rand(6, 10);
  for (let i = 0; i < count; i++) {
    const d = daysAgo(rand(5, 85));
    const units = rand(4, 16);
    await addDoc(col("billing_claims"), {
      individualId: ind.id, individualName: name, organizationId: ORG_ID,
      dos: isoDate(d), serviceCode: pick(SVC_CODES), units,
      payer: pick(PAYERS), authNumber: `AUTH-${rand(10000,99999)}`,
      aiStatus: pick(["passed","passed","passed","attention"]),
      billingStatus: pick(["ready","ready","submitted","paid","hold"]),
      totalAmount: parseFloat((units * 16.50).toFixed(2)),
      denialReason: "", notes: "", createdBy: cm.uid,
      createdAt: ts(d), updatedAt: ts(daysAgo(rand(0,10))),
    });
  }
  return count;
}

// ── Workflow ───────────────────────────────────────────────────────────────────
async function seedWorkflow(ind, cm, name) {
  const d = daysAgo(rand(20, 60));
  await addDoc(col("workflows"), {
    organizationId: ORG_ID,
    individual_id: ind.id, individual_name: name,
    title: "Annual ISP Renewal Workflow",
    triggerDate: isoDate(d), dueDate: isoDate(daysAgo(-30)), createdOn: isoDate(d), status: "Active",
    steps: [
      { id:"s1", number:1, title:"Gather Input from Support Circle", description:"Contact family, providers, and individual to gather input for ISP renewal.", status:"Completed", dueDate: isoDate(daysAgo(50)), staffResponsible: cm.name, completedAt: isoDate(daysAgo(45)), completionNotes:"All support circle members contacted. Input documented in system." },
      { id:"s2", number:2, title:"Complete Annual Assessment", description:"Conduct and document annual level of care assessment.", status:"Completed", dueDate: isoDate(daysAgo(40)), staffResponsible: cm.name, completedAt: isoDate(daysAgo(38)), completionNotes:"Assessment completed. LOC confirmed and documented." },
      { id:"s3", number:3, title:"Draft ISP with Goals", description:"Develop updated ISP based on assessment results and individual preferences.", status:"In Progress", dueDate: isoDate(daysAgo(-10)), staffResponsible: cm.name },
      { id:"s4", number:4, title:"ISP Meeting and Signatures", description:"Hold ISP meeting and obtain signatures from all required parties.", status:"Pending", dueDate: isoDate(daysAgo(-20)), staffResponsible: cm.name },
      { id:"s5", number:5, title:"Submit to BDDS", description:"Submit finalized ISP to the Bureau of Developmental Disability Services.", status:"Pending", dueDate: isoDate(daysAgo(-25)), staffResponsible: cm.name },
    ],
    notes: "Annual renewal workflow initiated on schedule. Steps 1-2 complete.",
    created_at: ts(d), updated_at: ts(daysAgo(rand(1,10))),
  });
}

// ── Meeting Notes ──────────────────────────────────────────────────────────────
async function seedMeetingNotes(ind, cm, name) {
  const count = rand(2, 3);
  const types = ["Team Meeting","ISP Meeting","Family Meeting","Provider Meeting"];
  for (let i = 0; i < count; i++) {
    const d = daysAgo(rand(10, 80));
    await addDoc(col("meeting_notes"), {
      organizationId: ORG_ID,
      individual_id: ind.id, date: isoDate(d),
      startTime: `${rand(9,13)}:00`, endTime: `${rand(10,15)}:30`,
      type: types[i % types.length],
      attendees: pickN([name, cm.name, SUP.name, "Guardian","Provider Rep","Day Program Staff"], rand(3,5)),
      facilitator: cm.name,
      agenda: "1. Review of current supports\n2. Goal progress update\n3. Action items and follow-ups\n4. Next steps and closing",
      discussionNotes: `Meeting held to review ${name}'s current support plan and progress toward goals. ${pick(OBSERVATIONS)} ${pick(NEXT_STEPS)}`,
      actionItems: [
        { task: "Follow up with primary care physician", assignedTo: cm.name, dueDate: isoDate(daysAgo(-7)) },
        { task: "Update ISP documentation in system",   assignedTo: cm.name, dueDate: isoDate(daysAgo(-14)) },
      ],
      linkedGoals: ["Community Participation","Independent Living"],
      attachments: [],
      createdAt: isoDate(d), createdBy: cm.uid,
      created_at: ts(d), updated_at: ts(d),
    });
  }
  return count;
}

// ── On-Call Log ────────────────────────────────────────────────────────────────
async function seedOncallLog(ind, cm, name) {
  const count = rand(1, 2);
  for (let i = 0; i < count; i++) {
    const d = daysAgo(rand(5, 75));
    await addDoc(col("oncall_log"), {
      organizationId: ORG_ID,
      individual_id: ind.id, individual_name: name,
      date: isoDate(d), time: `${rand(17,23)}:${pick(["00","15","30","45"])}`,
      caller: pick(["Guardian","Residential Provider","Day Program Staff","Individual"]),
      call_type: pick(["Behavioral Concern","Medical Question","Schedule Change","General Inquiry","Crisis Support"]),
      description: pick([
        `Guardian called to report ${name} was upset following a schedule change. Provided crisis support and de-escalation guidance.`,
        `Provider called regarding a missed appointment. Assisted in rescheduling and notified relevant parties.`,
        `Call received regarding a medication question. Coordinated with on-call nurse for guidance.`,
        `Individual called requesting support. Provided reassurance and documented the contact.`,
      ]),
      action_taken: pick(NEXT_STEPS),
      follow_up_required: Math.random() > 0.5,
      follow_up_notes: "Documented in case management system. Will follow up at next scheduled visit.",
      author_uid: cm.uid, author_name: cm.name,
      created_at: ts(d),
    });
  }
  return count;
}

// ── Seed individuals (if none exist) ──────────────────────────────────────────
const DEMO_INDIVIDUALS = [
  { id:"ind-001", first_name:"James",    last_name:"Mitchell",   gender:"Male",   date_of_birth:"1985-03-14", race_ethnicity:"White",              primary_language:"English",   living_situation:"Group Home",                  program_type:"HCBS Waiver",  waiver_type:"CIH",  funding_stream:"Medicaid",  primary_diagnosis:"Intellectual Disability, Mild (F70)",         ma_id:"1001234567", ma_status:"Active" },
  { id:"ind-002", first_name:"Maria",    last_name:"Rodriguez",  gender:"Female", date_of_birth:"1992-07-22", race_ethnicity:"Hispanic/Latino",    primary_language:"Spanish",   living_situation:"Family Home",                 program_type:"HCBS Waiver",  waiver_type:"COMP", funding_stream:"Medicaid",  primary_diagnosis:"Autism Spectrum Disorder (F84.0)",            ma_id:"1002345678", ma_status:"Active" },
  { id:"ind-003", first_name:"DeShawn",  last_name:"Williams",   gender:"Male",   date_of_birth:"1990-11-05", race_ethnicity:"Black/African American", primary_language:"English", living_situation:"Supported Living Arrangement", program_type:"HCBS Waiver", waiver_type:"FSW",  funding_stream:"Medicaid",  primary_diagnosis:"Down Syndrome (Q90.9)",                       ma_id:"1003456789", ma_status:"Active" },
  { id:"ind-004", first_name:"Aisha",    last_name:"Thompson",   gender:"Female", date_of_birth:"1988-02-18", race_ethnicity:"Black/African American", primary_language:"English", living_situation:"Independent Living",          program_type:"HCBS Waiver",  waiver_type:"CIH",  funding_stream:"Medicaid",  primary_diagnosis:"Cerebral Palsy, Spastic Diplegia (G80.1)",    ma_id:"1004567890", ma_status:"Active" },
  { id:"ind-005", first_name:"Tyler",    last_name:"Johnson",    gender:"Male",   date_of_birth:"1995-09-30", race_ethnicity:"White",              primary_language:"English",   living_situation:"Family Home",                 program_type:"HCBS Waiver",  waiver_type:"CIH",  funding_stream:"Medicaid",  primary_diagnosis:"Intellectual Disability, Moderate (F71)",     ma_id:"1005678901", ma_status:"Active" },
  { id:"ind-006", first_name:"Priya",    last_name:"Patel",      gender:"Female", date_of_birth:"1987-06-12", race_ethnicity:"Asian",              primary_language:"English",   living_situation:"Group Home",                  program_type:"HCBS Waiver",  waiver_type:"COMP", funding_stream:"Medicaid",  primary_diagnosis:"Traumatic Brain Injury (S09.90XA)",           ma_id:"1006789012", ma_status:"Active" },
  { id:"ind-007", first_name:"Marcus",   last_name:"Davis",      gender:"Male",   date_of_birth:"1983-01-25", race_ethnicity:"Black/African American", primary_language:"English", living_situation:"Supported Living Arrangement", program_type:"HCBS Waiver", waiver_type:"BI",   funding_stream:"Medicaid",  primary_diagnosis:"Developmental Delay, Unspecified (F88)",      ma_id:"1007890123", ma_status:"Active" },
  { id:"ind-008", first_name:"Sarah",    last_name:"Chen",       gender:"Female", date_of_birth:"1993-04-08", race_ethnicity:"Asian",              primary_language:"English",   living_situation:"Family Home",                 program_type:"HCBS Waiver",  waiver_type:"FSW",  funding_stream:"Medicaid",  primary_diagnosis:"Intellectual Disability, Severe (F72)",       ma_id:"1008901234", ma_status:"Active" },
  { id:"ind-009", first_name:"Carlos",   last_name:"Mendez",     gender:"Male",   date_of_birth:"1989-08-17", race_ethnicity:"Hispanic/Latino",    primary_language:"Spanish",   living_situation:"Group Home",                  program_type:"HCBS Waiver",  waiver_type:"CIH",  funding_stream:"Medicaid",  primary_diagnosis:"Epilepsy, Generalized (G40.309)",             ma_id:"1009012345", ma_status:"Active" },
  { id:"ind-010", first_name:"Rebecca",  last_name:"Foster",     gender:"Female", date_of_birth:"1991-12-03", race_ethnicity:"White",              primary_language:"English",   living_situation:"Independent Living",          program_type:"HCBS Waiver",  waiver_type:"COMP", funding_stream:"Medicaid",  primary_diagnosis:"Prader-Willi Syndrome (Q87.11)",              ma_id:"1010123456", ma_status:"Active" },
];

async function ensureIndividuals() {
  const snap = await getDocs(query(col("individuals"), where("organizationId","==",ORG_ID), limit(1)));
  if (!snap.empty) {
    const all = await getDocs(query(col("individuals"), where("organizationId","==",ORG_ID), limit(10)));
    return all.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  console.log("⚙️  No individuals found — creating 10 demo individuals...");
  for (const ind of DEMO_INDIVIDUALS) {
    const { id, ...fields } = ind;
    await setDoc(doc(db, "individuals", id), {
      ...fields,
      organizationId: ORG_ID,
      status: "active",
      isActive: true,
      case_number: `BDDS-${2024}-${id.split("-")[1]}`,
      address_city:  pick(CITIES),
      address_state: "IN",
      address_zip:   `462${rand(10,99)}`,
      address_street:`${rand(100,9999)} ${pick(STREETS)}`,
      phone_cell:    `(317) 555-${rand(1000,9999)}`,
      emergency_contact_name: pick(["Patricia Williams","Robert Johnson","Linda Martinez","Thomas Brown"]),
      emergency_contact_relation: pick(["Mother","Father","Sibling","Guardian"]),
      emergency_contact_phone: `(317) 555-${rand(1000,9999)}`,
      legal_status:  pick(["Guardian of Person and Estate","Guardian of Person Only","Self-Determination","POA — Medical"]),
      admission_date: isoDate(daysAgo(rand(180,540))),
      referral_source: pick(["BDDS","Division of Disability and Rehabilitative Services","Hospital Discharge","Self-Referral"]),
      icd10_codes:   [ind.primary_diagnosis.match(/\(([^)]+)\)/)?.[1] || "F70"],
      pcp_status:    "Active",
      next_isp_date: isoDate(daysAgo(-rand(30,90))),
      ma_type:       "Full Medicaid",
      ma_effective_date: "2021-01-01",
      ma_redetermination_date: isoDate(daysAgo(-rand(30,120))),
      primary_physician_name:  pick(PHYSICIANS),
      primary_physician_phone: `(317) 555-${rand(1000,9999)}`,
      hospital_preference: pick(HOSPITALS),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  console.log(`✅ Created ${DEMO_INDIVIDUALS.length} demo individuals\n`);

  const all = await getDocs(query(col("individuals"), where("organizationId","==",ORG_ID), limit(10)));
  return all.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── MAIN ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🌱  CaseManagement.AI — Comprehensive Demo Seeder`);
  console.log(`${"─".repeat(52)}`);
  console.log(`   Org: ${ORG_ID}`);
  console.log(`   Signing in as: ${ADMIN_EMAIL}\n`);

  const userCred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);
  const uid = userCred.user.uid;
  console.log("✅ Authenticated\n");

  // Ensure the seeder's user doc exists in Firestore with admin role + correct org
  // (required so Firestore rules can evaluate isCaseManager(), newDocInOrg(), etc.)
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists() || userSnap.data().organizationId !== ORG_ID) {
    console.log("⚙️  Ensuring seeder user document in Firestore...");
    await setDoc(userRef, {
      uid,
      email: ADMIN_EMAIL,
      firstName: "Kathy",
      lastName: "Demo",
      displayName: "Kathy Demo",
      role: "admin",
      organizationId: ORG_ID,
      status: "active",
      isActive: true,
    }, { merge: true });
    console.log("✅ User document ready\n");
  }

  const individuals = await ensureIndividuals();
  console.log(`✅ Found ${individuals.length} individuals to seed\n${"─".repeat(52)}\n`);

  for (let i = 0; i < individuals.length; i++) {
    const ind  = individuals[i];
    const cm   = CMS[i % CMS.length];
    const name = `${ind.first_name || ""} ${ind.last_name || ""}`.trim();

    process.stdout.write(`[${i+1}/${individuals.length}] ${name.padEnd(28)} `);

    const safe = async (label, fn) => {
      try { return await fn(); }
      catch(e) { process.stdout.write(`\n  ⚠️  ${label}: ${e.code || e.message}\n`); return 0; }
    };

    await safe("enrich",     () => enrichIndividual(ind, cm, i));
    const pn = await safe("progress_notes",    () => seedProgressNotes(ind, cm, name));
    const cn = await safe("contact_notes",     () => seedContactNotes(ind, cm, name));
    const vs = await safe("visit_summaries",   () => seedVisitSummaries(ind, cm, name));
    const tk = await safe("tasks",             () => seedTasks(ind, cm, name));
    const ic = await safe("incidents",         () => seedIncidents(ind, cm, name));
    const bc = await safe("billing_claims",    () => seedBillingClaims(ind, cm, name));
    const mn = await safe("meeting_notes",     () => seedMeetingNotes(ind, cm, name));
    const oc = await safe("oncall",            () => seedOncallLog(ind, cm, name));

    await safe("care_plan",  () => seedCarePlan(ind, cm, name));
    await safe("monitoring", () => seedMonitoringForms(ind, cm, name));
    await safe("service_auth", () => seedServiceAuthorizations(ind, cm, name));
    await safe("referrals",  () => seedReferrals(ind, cm, name));
    await safe("eligibility",() => seedEligibility(ind, cm));
    await safe("workflow",   () => seedWorkflow(ind, cm, name));

    console.log(`✅  pn:${pn} cn:${cn} vs:${vs} tk:${tk} ic:${ic} bc:${bc} mn:${mn} oc:${oc} +plan/monitor/auth/ref/elig/workflow`);
  }

  console.log(`\n${"─".repeat(52)}`);
  console.log(`🎉  Done! Open app.casemanagement.ai to see the data.\n`);
  process.exit(0);
}

main().catch(err => {
  console.error("\n❌ Seed failed:", err.message || err);
  process.exit(1);
});
