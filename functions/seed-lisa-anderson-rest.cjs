#!/usr/bin/env node
/**
 * seed-lisa-anderson-rest.cjs
 * Seeds Lisa Anderson's chart using the Firestore REST API
 * so no service account is needed — uses the Firebase CLI access token.
 */

const https = require("https");
const os = require("os");
const path = require("path");
const fs = require("fs");

const PROJECT_ID = "casemanagement-ai";
const BASE_URL = `firestore.googleapis.com`;

// ── Load Firebase CLI access token ────────────────────────────────────────────
const configPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
const cliConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
const ACCESS_TOKEN = cliConfig.tokens?.access_token;
if (!ACCESS_TOKEN) {
  console.error("❌ No access token. Run: npx firebase-tools login");
  process.exit(1);
}

// ── Firestore REST helpers ────────────────────────────────────────────────────
function toFsValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === "string") return { stringValue: val };
  if (val && typeof val === "object" && val._seconds !== undefined) {
    return { timestampValue: new Date(val._seconds * 1000).toISOString() };
  }
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFsValue) } };
  if (typeof val === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFsValue(v);
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

function toFsDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) fields[k] = toFsValue(v);
  }
  return { fields };
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: BASE_URL,
        path,
        method,
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data || "{}"));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 300)}`));
          }
        });
      }
    );
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function query(collectionId, filters) {
  const structuredQuery = {
    from: [{ collectionId }],
    where: {
      compositeFilter: {
        op: "AND",
        filters: filters.map(([field, value]) => ({
          fieldFilter: {
            field: { fieldPath: field },
            op: "EQUAL",
            value: toFsValue(value),
          },
        })),
      },
    },
    limit: 10,
  };
  const result = await request(
    "POST",
    `/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    { structuredQuery }
  );
  return result.filter((r) => r.document).map((r) => {
    const name = r.document.name;
    const id = name.split("/").pop();
    const fields = r.document.fields || {};
    const obj = { id };
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = extractValue(v);
    }
    return obj;
  });
}

function extractValue(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(extractValue);
  if (v.mapValue) {
    const obj = {};
    for (const [k, mv] of Object.entries(v.mapValue.fields || {})) obj[k] = extractValue(mv);
    return obj;
  }
  return null;
}

async function addDoc(collectionId, data) {
  const result = await request(
    "POST",
    `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionId}`,
    toFsDoc(data)
  );
  return result.name.split("/").pop();
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function dateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function ts(year, month, day) {
  return new Date(year, month - 1, day);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Searching for Lisa Anderson in Firestore...\n");

  const results = await query("individuals", [
    ["first_name", "Lisa"],
    ["last_name", "Anderson"],
  ]);

  if (results.length === 0) {
    console.error("❌ No Lisa Anderson found in individuals collection.");
    process.exit(1);
  }

  if (results.length > 1) {
    console.log(`⚠️  Found ${results.length} Lisa Andersons:`);
    results.forEach((r) => console.log(`   ID: ${r.id}  DOB: ${r.dob}  Org: ${r.organizationId}`));
  }

  const lisa = results[0];
  const lisaId = lisa.id;
  const orgId = lisa.organizationId || "demo-org-001";
  const caseManagerName = lisa.assigned_case_manager_name || "Kathy Martinez CM";
  const caseManagerUid = lisa.assigned_case_manager_uid || lisa.assigned_case_manager || "kathy-martinez";

  console.log("✅ Found Lisa Anderson");
  console.log(`   ID           : ${lisaId}`);
  console.log(`   DOB          : ${lisa.dob}`);
  console.log(`   Org          : ${orgId}`);
  console.log(`   Case Manager : ${caseManagerName}\n`);

  // ── PROGRESS NOTES ─────────────────────────────────────────────────────────
  const progressNotes = [
    {
      individualId: lisaId, organizationId: orgId,
      authorId: caseManagerUid, authorName: caseManagerName,
      activityType: "Assessment", contactType: "In-Person",
      progressDate: dateStr(2024, 10, 2), startTime: "10:00", endTime: "11:00",
      isBillable: true,
      purposeOfActivity: "Initial intake assessment completed with Lisa and her mother Carol at agency office. Reviewed diagnostic history (Mild Intellectual Disability F70, Anxiety Disorder F41.1). Collected emergency contacts, insurance information, and signed consent forms. Established baseline for ISP goal planning.",
      goalsProgress: [
        { goalId: "goal_independent_living", goalText: "Develop and maintain independent living skills", progressStatus: "no_change", narrative: "Baseline established. Lisa requires moderate support with meal preparation, budgeting, and household management." },
      ],
      additionalObservations: "Lisa was engaged and cooperative throughout the intake. She clearly stated her interests: cooking, art, and music. Mother Carol expressed concern about Lisa's anxiety in new environments.",
      nextSteps: "Schedule follow-up home visit Oct 28. Connect with behavioral support team. Research day program options.",
      status: "signed", aiDrafted: false,
      signedAt: ts(2024, 10, 5), createdAt: ts(2024, 10, 2), updatedAt: ts(2024, 10, 5),
    },
    {
      individualId: lisaId, organizationId: orgId,
      authorId: caseManagerUid, authorName: caseManagerName,
      activityType: "Home Visit", contactType: "Home Visit",
      progressDate: dateStr(2024, 10, 28), startTime: "14:00", endTime: "14:45",
      isBillable: true,
      purposeOfActivity: "Home visit to assess Lisa's living environment and identify support needs. Reviewed daily schedule with Lisa and her mother Carol.",
      goalsProgress: [
        { goalId: "goal_independent_living", goalText: "Develop and maintain independent living skills", progressStatus: "progressing", narrative: "Lisa demonstrated ability to prepare simple meals with verbal prompting. Visual schedule posted in kitchen is effective." },
        { goalId: "goal_community_integration", goalText: "Increase community participation", progressStatus: "no_change", narrative: "Lisa attends church with family weekly but has no other structured community activities. Researching day program options." },
      ],
      additionalObservations: "Home environment clean, organized, and safe. Lisa showed me her art supplies and talked about enjoying drawing and watercolors. Mother reports mood stable with current anxiety medication.",
      nextSteps: "Submit referral to Carroll Day Services. Follow up with PCP regarding anxiety medication. Schedule November team meeting.",
      status: "signed", aiDrafted: false,
      signedAt: ts(2024, 10, 30), createdAt: ts(2024, 10, 28), updatedAt: ts(2024, 10, 30),
    },
    {
      individualId: lisaId, organizationId: orgId,
      authorId: caseManagerUid, authorName: caseManagerName,
      activityType: "Family/Guardian Meeting", contactType: "Telehealth",
      progressDate: dateStr(2024, 11, 19), startTime: "09:30", endTime: "10:15",
      isBillable: true,
      purposeOfActivity: "Person-centered team meeting to review ISP goals and confirm day program start date of January 6, 2025. Lisa and Carol attended via video call with day program coordinator Maria Okafor.",
      goalsProgress: [
        { goalId: "goal_independent_living", goalText: "Develop and maintain independent living skills", progressStatus: "progressing", narrative: "Lisa reported making breakfast independently 4-5 days/week. Carol confirms asking for help less with cooking tasks." },
        { goalId: "goal_community_integration", goalText: "Increase community participation", progressStatus: "progressing", narrative: "Day program referral submitted and enrollment confirmed for January 6, 2025. Transportation being coordinated." },
      ],
      additionalObservations: "Lisa was vocal during the meeting — expressed strong interest in art activities and asked about art classes specifically. Day program coordinator confirmed art and cooking activities available. Excellent fit.",
      nextSteps: "Finalize day program enrollment paperwork. Add art class goal to January ISP review. Confirm transportation arrangements.",
      status: "signed", aiDrafted: false,
      signedAt: ts(2024, 11, 20), createdAt: ts(2024, 11, 19), updatedAt: ts(2024, 11, 20),
    },
    {
      individualId: lisaId, organizationId: orgId,
      authorId: caseManagerUid, authorName: caseManagerName,
      activityType: "Case Management", contactType: "Telephone",
      progressDate: dateStr(2024, 12, 10), startTime: "13:00", endTime: "13:40",
      isBillable: true,
      purposeOfActivity: "Monthly phone check-in. Reviewed holiday plans, medication adherence, upcoming day program start January 6th.",
      goalsProgress: [
        { goalId: "goal_independent_living", goalText: "Develop and maintain independent living skills", progressStatus: "progressing", narrative: "Carol reports Lisa has been managing her $40 weekly spending budget for 3 weeks using only a written checklist — no verbal reminders needed. Significant improvement." },
      ],
      additionalObservations: "Lisa answered the phone herself and said 'I'm ready for day program in January!' — clearly motivated. No health concerns. Family plans holiday visit to relatives.",
      nextSteps: "Confirm day program transportation January 3rd. Schedule January home visit. Collect emergency contact list for holidays.",
      status: "signed", aiDrafted: false,
      signedAt: ts(2024, 12, 11), createdAt: ts(2024, 12, 10), updatedAt: ts(2024, 12, 11),
    },
    {
      individualId: lisaId, organizationId: orgId,
      authorId: caseManagerUid, authorName: caseManagerName,
      activityType: "Care Plan Review", contactType: "Home Visit",
      progressDate: dateStr(2025, 1, 14), startTime: "10:30", endTime: "11:30",
      isBillable: true,
      purposeOfActivity: "Quarterly ISP review home visit. Reviewed all goal progress since October. Lisa started Carroll Day Services 8 days ago. Added art class as new ISP goal per Lisa's self-advocacy.",
      goalsProgress: [
        { goalId: "goal_independent_living", goalText: "Develop and maintain independent living skills", progressStatus: "progressing", narrative: "Lisa now independently prepares 3 meals/week and manages her budget with a checklist — no prompting. Advancing to laundry management goal." },
        { goalId: "goal_community_integration", goalText: "Increase community participation", progressStatus: "progressing", narrative: "Attended all 6 day program sessions since Jan 6. Staff report she is enthusiastic and participates actively." },
        { goalId: "goal_art", goalText: "Pursue creative arts for personal fulfillment", progressStatus: "no_change", narrative: "New goal added per Lisa's self-advocacy. Objective: enroll in community art class by March 2025." },
      ],
      additionalObservations: "Lisa's mood noticeably more positive since starting the day program — Carol reports she 'has her daughter back.' PCP confirmed medication appropriate, no changes needed.",
      nextSteps: "Research community art class options. Update ISP to reflect new art goal. Schedule February phone check-in.",
      status: "signed", aiDrafted: false,
      signedAt: ts(2025, 1, 16), createdAt: ts(2025, 1, 14), updatedAt: ts(2025, 1, 16),
    },
    {
      individualId: lisaId, organizationId: orgId,
      authorId: caseManagerUid, authorName: caseManagerName,
      activityType: "Case Management", contactType: "Telephone",
      progressDate: dateStr(2025, 2, 11), startTime: "14:00", endTime: "14:30",
      isBillable: true,
      purposeOfActivity: "Monthly phone check-in. Reviewed day program satisfaction, art class enrollment, and any health or behavioral changes since January.",
      goalsProgress: [
        { goalId: "goal_community_integration", goalText: "Increase community participation", progressStatus: "progressing", narrative: "No absences from day program in January (8/8 sessions). Lisa has begun helping newer participants — a leadership milestone." },
        { goalId: "goal_art", goalText: "Pursue creative arts for personal fulfillment", progressStatus: "progressing", narrative: "Carol located a Saturday art class at the Carroll Arts Center. Registration submitted. Class starts March 8." },
      ],
      additionalObservations: "Lisa led most of the check-in conversation — notable improvement in communication confidence. Carol mentioned Lisa has started asking about jobs. Beginning to explore employment interest.",
      nextSteps: "Confirm art class registration. Schedule March home visit. Research supported employment options per Lisa's expressed interest.",
      status: "signed", aiDrafted: false,
      signedAt: ts(2025, 2, 12), createdAt: ts(2025, 2, 11), updatedAt: ts(2025, 2, 12),
    },
    {
      individualId: lisaId, organizationId: orgId,
      authorId: caseManagerUid, authorName: caseManagerName,
      activityType: "Home Visit", contactType: "Home Visit",
      progressDate: dateStr(2025, 3, 18), startTime: "11:00", endTime: "12:00",
      isBillable: true,
      purposeOfActivity: "Quarterly home visit and behavioral health check-in. Reviewed anxiety management, medication adherence, and coordination with day program behavioral support staff.",
      goalsProgress: [
        { goalId: "goal_independent_living", goalText: "Develop and maintain independent living skills", progressStatus: "progressing", narrative: "Lisa independently grocery shops with a written list and handles all laundry without prompting. Exceeding benchmark expectations." },
        { goalId: "goal_art", goalText: "Pursue creative arts for personal fulfillment", progressStatus: "progressing", narrative: "Attended 2 of 6 Saturday art classes at Carroll Arts Center. Brought home a watercolor of her backyard garden — very proud of it." },
      ],
      additionalObservations: "Lisa showed me her watercolor — a detailed garden scene with flowers, bird feeder, and cat. Zero anxiety episodes in the past 6 weeks per day program staff. Dramatic improvement from October baseline.",
      nextSteps: "Continue medication — no changes. Expand art activities during day program. Plan April semi-annual ISP review. Begin employment exploration.",
      status: "signed", aiDrafted: false,
      signedAt: ts(2025, 3, 19), createdAt: ts(2025, 3, 18), updatedAt: ts(2025, 3, 19),
    },
    {
      individualId: lisaId, organizationId: orgId,
      authorId: caseManagerUid, authorName: caseManagerName,
      activityType: "Care Plan Review", contactType: "Home Visit",
      progressDate: dateStr(2025, 4, 15), startTime: "10:00", endTime: "11:15",
      isBillable: true,
      purposeOfActivity: "Semi-annual ISP review. Met with Lisa, Carol, Carroll Day Services coordinator Maria Okafor, and behavioral support specialist Dr. Susan Holt. Reviewed all goals and updated service authorizations.",
      goalsProgress: [
        { goalId: "goal_independent_living", goalText: "Develop and maintain independent living skills", progressStatus: "met", narrative: "GOAL ACHIEVED — Lisa independently manages all meal prep, laundry, and personal budgeting without support. Updating goal to medical appointment management." },
        { goalId: "goal_community_integration", goalText: "Increase community participation", progressStatus: "progressing", narrative: "Day program attendance 97% over 4 months (58/60 sessions). Lisa has formed 2 meaningful peer friendships. Expanding to monthly social outings starting May." },
        { goalId: "goal_art", goalText: "Pursue creative arts for personal fulfillment", progressStatus: "progressing", narrative: "Completed full 6-week beginner class. Enrolled in intermediate session starting May 10." },
      ],
      additionalObservations: "Exceptional semi-annual review. All team members very positive. Carol became tearful describing how her daughter has blossomed. Lisa self-advocated strongly — requested transportation independence goal and asked specifically about working at an animal shelter.",
      nextSteps: "Add transportation independence goal. Submit supported employment referral. Authorize Community Living Support (10 hrs/week). Submit eligibility verification before July 1.",
      status: "pending_signature", aiDrafted: false,
      createdAt: ts(2025, 4, 15), updatedAt: ts(2025, 4, 15),
    },
    {
      individualId: lisaId, organizationId: orgId,
      authorId: caseManagerUid, authorName: caseManagerName,
      activityType: "Case Management", contactType: "Telephone",
      progressDate: dateStr(2025, 5, 20), startTime: "13:30", endTime: "14:00",
      isBillable: true,
      purposeOfActivity: "Monthly phone check-in. Reviewed intermediate art class progress, first social outing experience, and employment referral status.",
      goalsProgress: [
        { goalId: "goal_community_integration", goalText: "Increase community participation", progressStatus: "progressing", narrative: "Lisa attended her first community social outing — bowling with 4 day program peers. She reported 'the best time ever' and wants to do it again." },
        { goalId: "goal_art", goalText: "Pursue creative arts for personal fulfillment", progressStatus: "progressing", narrative: "Intermediate art class started May 10. Completed 2 sessions — learning shading and perspective." },
      ],
      additionalObservations: "Lisa's confidence continues to grow month over month. She asked thoughtful questions about employment and mentioned wanting to work with animals. Employment referral pending now 35+ days.",
      nextSteps: "Follow up with Carroll County Employment Services re: intake (35 days pending). Remind Carol about eligibility verification due July 1. Schedule July home visit.",
      status: "draft", aiDrafted: false,
      createdAt: ts(2025, 5, 20), updatedAt: ts(2025, 5, 20),
    },
  ];

  // ── CONTACT NOTES ──────────────────────────────────────────────────────────
  const contactNotes = [
    {
      individual_id: lisaId, individual_name: "Lisa Anderson",
      author_uid: caseManagerUid, author_name: caseManagerName,
      date: dateStr(2024, 10, 2), activityType: "Intake", contactType: "In-Person",
      billable: true, startTime: "10:00", endTime: "11:00",
      purpose: "Initial intake — review history, collect consents, establish goals",
      present: "Lisa Anderson, Carol Anderson (mother), Kathy Martinez CM",
      details: "Completed initial intake. Diagnostic history: Mild Intellectual Disability (F70), Anxiety Disorder (F41.1). Prior provider: Carroll County Support Services (discharged Sept 2024). Collected emergency contacts, Medicaid verification, PHI release, consent for services. Lisa identified cooking, art, and music as primary interests.",
      issues: "Mother flagged ongoing anxiety in new environments. Transportation is a barrier — mother currently drives.",
      nextSteps: "Schedule home visit Oct 28. Connect with behavioral support. Research day programs. Submit ISP by Oct 17.",
      status: "signed", created_at: ts(2024, 10, 2), updated_at: ts(2024, 10, 5),
    },
    {
      individual_id: lisaId, individual_name: "Lisa Anderson",
      author_uid: caseManagerUid, author_name: caseManagerName,
      date: dateStr(2024, 11, 4), activityType: "Provider Coordination", contactType: "Telephone",
      billable: true, startTime: "09:00", endTime: "09:20",
      purpose: "Coordinate day program referral with Carroll Day Services",
      present: "Kathy Martinez CM, Maria Okafor (Carroll Day Services)",
      details: "Confirmed referral (CDS-2024-0892) received. Medicaid eligibility verified. Space available. Start date confirmed January 6, 2025.",
      issues: "None.",
      nextSteps: "Notify Carol of January 6 start. Coordinate transportation in December.",
      status: "signed", created_at: ts(2024, 11, 4), updated_at: ts(2024, 11, 4),
    },
    {
      individual_id: lisaId, individual_name: "Lisa Anderson",
      author_uid: caseManagerUid, author_name: caseManagerName,
      date: dateStr(2025, 1, 6), activityType: "Provider Coordination", contactType: "Telephone",
      billable: false, nonBillableReason: "Administrative coordination",
      startTime: "08:30", endTime: "08:45",
      purpose: "Confirm Lisa's first day at Carroll Day Services",
      present: "Kathy Martinez CM, Carol Anderson (mother)",
      details: "Called Carol to confirm first day went smoothly. Lisa was nervous in the car but brightened when staff greeted her. Participated in cooking activity and came home excited. No issues. Significant milestone.",
      issues: "None.",
      nextSteps: "Check in at 2-week mark. Schedule January 14 ISP review.",
      status: "signed", created_at: ts(2025, 1, 6), updated_at: ts(2025, 1, 6),
    },
    {
      individual_id: lisaId, individual_name: "Lisa Anderson",
      author_uid: caseManagerUid, author_name: caseManagerName,
      date: dateStr(2025, 3, 19), activityType: "Provider Coordination", contactType: "Telephone",
      billable: false, nonBillableReason: "Administrative coordination",
      startTime: "10:30", endTime: "10:50",
      purpose: "Coordinate with Carroll Arts Center regarding art class enrollment",
      present: "Kathy Martinez CM, Carroll Arts Center reception",
      details: "Confirmed Lisa's enrollment in Saturday beginner watercolor class (March 8 start). Inquired about intermediate session — available May 10. Requested Carol be notified to register.",
      issues: "None.",
      nextSteps: "Notify Carol to register Lisa for May 10 intermediate class. Update ISP art goal timeline.",
      status: "signed", created_at: ts(2025, 3, 19), updated_at: ts(2025, 3, 19),
    },
    {
      individual_id: lisaId, individual_name: "Lisa Anderson",
      author_uid: caseManagerUid, author_name: caseManagerName,
      date: dateStr(2025, 4, 15), activityType: "Assessment", contactType: "In-Person",
      billable: true, startTime: "10:00", endTime: "11:15",
      purpose: "Semi-annual ISP review team meeting — all stakeholders",
      present: "Lisa Anderson, Carol Anderson (mother), Kathy Martinez CM, Maria Okafor (Carroll Day Services), Dr. Susan Holt (Behavioral Support)",
      details: "Full team meeting for semi-annual ISP review. Goal 1 achieved and updated. Goals 2 and 3 progressing strongly. Lisa self-advocated for transportation independence goal and expressed employment interest (animal shelter). Community Living Support (10 hrs/week) authorized. ISP signature packets mailed.",
      issues: "Employment referral not yet submitted. Eligibility verification due July 1.",
      nextSteps: "Submit employment referral by April 18. Mail ISP signature packets. Submit eligibility verification by June 15.",
      status: "submitted", created_at: ts(2025, 4, 15), updated_at: ts(2025, 4, 15),
    },
  ];

  // ── VISIT SUMMARIES ────────────────────────────────────────────────────────
  const visitSummaries = [
    {
      individual_id: lisaId, individual_name: "Lisa Anderson",
      visit_date: dateStr(2024, 10, 28), start_time: "14:00", end_time: "14:45",
      location: "Lisa's residence — 412 Maple St, Carroll, IA",
      purpose_of_support: "Initial home visit — baseline assessment and living environment evaluation",
      what_went_well: "Home environment clean, safe, and organized. Lisa has a clear daily routine. Visual supports (kitchen schedule) effective. Lisa was warm and engaged throughout.",
      what_is_not_working: "Lisa relies on her mother for most meal prep and isn't yet managing spending money independently. No structured community activities outside weekly church.",
      goals_addressed: ["Develop independent living skills", "Increase community participation"],
      next_steps: "Submit day program referral. Coordinate ISP meeting. Follow up with PCP on anxiety medication.",
      status: "signed", author_uid: caseManagerUid, author_name: caseManagerName,
      updated_by: caseManagerName, updated_on: dateStr(2024, 10, 30),
      created_at: ts(2024, 10, 28), updated_at: ts(2024, 10, 30),
    },
    {
      individual_id: lisaId, individual_name: "Lisa Anderson",
      visit_date: dateStr(2025, 1, 14), start_time: "10:30", end_time: "11:30",
      location: "Lisa's residence — 412 Maple St, Carroll, IA",
      purpose_of_support: "Quarterly ISP review — confirm day program enrollment and update goals",
      what_went_well: "Lisa started Carroll Day Services Jan 6 — attended all 6 sessions. Staff report she is enthusiastic and active. Independent living skills improving — breakfast independently most mornings. Art goal added to ISP.",
      what_is_not_working: "No social activities outside day program yet. Art class not yet started — researching options.",
      goals_addressed: ["Develop independent living skills", "Increase community participation", "Art and creative expression"],
      next_steps: "Research art class options. Update ISP with art goal. Schedule February check-in.",
      status: "signed", author_uid: caseManagerUid, author_name: caseManagerName,
      updated_by: caseManagerName, updated_on: dateStr(2025, 1, 16),
      created_at: ts(2025, 1, 14), updated_at: ts(2025, 1, 16),
    },
    {
      individual_id: lisaId, individual_name: "Lisa Anderson",
      visit_date: dateStr(2025, 3, 18), start_time: "11:00", end_time: "12:00",
      location: "Lisa's residence — 412 Maple St, Carroll, IA",
      purpose_of_support: "Quarterly home visit — behavioral health check-in and goal progress review",
      what_went_well: "Zero anxiety episodes in 6 weeks. Day program attendance 97%. Lisa independently grocery shops and manages all laundry. Art class attending consistently — showed me a beautiful watercolor of her garden.",
      what_is_not_working: "Transportation to community activities remains inconsistent — Carol arranges all rides, limiting frequency of outings.",
      goals_addressed: ["Develop independent living skills", "Art and creative expression"],
      next_steps: "Submit Medicaid transportation referral. Add more art activities during day program hours. Plan April semi-annual ISP review.",
      status: "signed", author_uid: caseManagerUid, author_name: caseManagerName,
      updated_by: caseManagerName, updated_on: dateStr(2025, 3, 19),
      created_at: ts(2025, 3, 18), updated_at: ts(2025, 3, 19),
    },
    {
      individual_id: lisaId, individual_name: "Lisa Anderson",
      visit_date: dateStr(2025, 4, 15), start_time: "10:00", end_time: "11:15",
      location: "Lisa's residence — 412 Maple St, Carroll, IA",
      purpose_of_support: "Semi-annual ISP review — full interdisciplinary team meeting",
      what_went_well: "Exceptional review. Goal 1 (Independent Living) formally achieved. Day program attendance 97% over 4 months. Lisa formed 2 meaningful peer friendships. Art class completed — intermediate enrolled. Lisa's self-advocacy skills are outstanding.",
      what_is_not_working: "Employment referral not yet submitted. Transportation independence still a barrier. Eligibility verification (due July 1) not initiated.",
      goals_addressed: ["Develop independent living skills", "Increase community participation", "Art and creative expression", "Employment exploration"],
      next_steps: "Submit employment referral by April 18. Authorize Community Living Support. Submit eligibility verification by June 15. Schedule May check-in.",
      status: "submitted", author_uid: caseManagerUid, author_name: caseManagerName,
      updated_by: caseManagerName, updated_on: dateStr(2025, 4, 15),
      created_at: ts(2025, 4, 15), updated_at: ts(2025, 4, 15),
    },
  ];

  // ── CARE PLANS ─────────────────────────────────────────────────────────────
  const carePlans = [
    {
      individual_id: lisaId,
      title: "Annual ISP — October 2024 to September 2025",
      plan_type: "Individual Support Plan (ISP)",
      status: "active",
      effective_date: dateStr(2024, 10, 1),
      review_date: dateStr(2025, 9, 30),
      goals: [
        {
          id: "goal_independent_living",
          goal: "Lisa will develop and maintain independent living skills including meal preparation, personal budgeting, and household management.",
          priority: "high",
          target_date: dateStr(2025, 9, 30),
          progress: "achieved",
          interventions: ["Home support coaching for meal prep 3x/week", "Written visual budget checklist", "Weekly review of laundry schedule"],
        },
        {
          id: "goal_community_integration",
          goal: "Lisa will participate in structured community activities including a day program and monthly social outings, building peer relationships.",
          priority: "high",
          target_date: dateStr(2025, 9, 30),
          progress: "in_progress",
          interventions: ["Enroll and maintain attendance at Carroll Day Services (5 days/week)", "Coordinate monthly social outings", "Medicaid transportation support"],
        },
        {
          id: "goal_art",
          goal: "Lisa will pursue visual art by enrolling in a community art class and completing at least one full session as personal fulfillment.",
          priority: "medium",
          target_date: dateStr(2025, 6, 30),
          progress: "in_progress",
          interventions: ["Enroll in art class at Carroll Arts Center", "Attend Saturday sessions consistently", "Display artwork at home"],
        },
        {
          id: "goal_employment",
          goal: "Lisa will explore supported employment opportunities aligned with her interests through referral to Carroll County Employment Services.",
          priority: "medium",
          target_date: dateStr(2025, 12, 31),
          progress: "not_started",
          interventions: ["Submit referral to Carroll County Employment Services", "Complete vocational interest assessment", "Identify job shadowing opportunities"],
        },
      ],
      author_uid: caseManagerUid, author_name: caseManagerName,
      created_at: ts(2024, 10, 17), updated_at: ts(2025, 4, 15),
    },
  ];

  // ── REFERRALS ──────────────────────────────────────────────────────────────
  const referrals = [
    {
      individual_id: lisaId, individual_name: "Lisa Anderson",
      referral_type: "Day Program / Social & Recreational",
      referred_to: "Carroll Day Services", referred_by: caseManagerName, referred_by_uid: caseManagerUid,
      date: dateStr(2024, 10, 28), priority: "routine", status: "completed",
      notes: "Day habilitation referral aligned with ISP Community Integration goal. Reference: CDS-2024-0892. Enrollment confirmed January 6, 2025.",
      outcome: "Successfully enrolled. Lisa began January 6, 2025. Attendance rate 97% over first 4 months. Excellent fit.",
      created_at: ts(2024, 10, 28), updated_at: ts(2025, 1, 8),
    },
    {
      individual_id: lisaId, individual_name: "Lisa Anderson",
      referral_type: "Transportation",
      referred_to: "Carroll Transit System — Medicaid Paratransit", referred_by: caseManagerName, referred_by_uid: caseManagerUid,
      date: dateStr(2025, 3, 19), priority: "routine", status: "completed",
      notes: "Transportation barrier identified March home visit. Carol Anderson sole transport provider. Reference: CTS-2025-0341.",
      outcome: "Medicaid transit card issued April 1, 2025. Lisa using transit for day program 3 days/week and PCP appointments.",
      created_at: ts(2025, 3, 19), updated_at: ts(2025, 4, 2),
    },
    {
      individual_id: lisaId, individual_name: "Lisa Anderson",
      referral_type: "Employment & Vocational",
      referred_to: "Carroll County Employment Services", referred_by: caseManagerName, referred_by_uid: caseManagerUid,
      date: dateStr(2025, 4, 15), priority: "routine", status: "pending",
      notes: "Lisa expressed interest in supported employment during April ISP review — specifically animal shelter work. Reference: CCES-2025-0774. Follow-up needed — 35+ days, no intake appointment scheduled.",
      outcome: null,
      created_at: ts(2025, 4, 15), updated_at: ts(2025, 4, 15),
    },
  ];

  // ── ELIGIBILITY VERIFICATIONS ──────────────────────────────────────────────
  const eligibilityVerifications = [
    {
      individual_id: lisaId, verification_date: dateStr(2024, 10, 1),
      payer: "Iowa Medicaid", medicaid_id: "IA88472319", eligible: true,
      coverage_start: dateStr(2024, 10, 1), coverage_end: dateStr(2025, 9, 30),
      plan_name: "Iowa Medicaid — HCBS Waiver (Intellectual Disability)",
      managed_care_org: "Iowa Total Care", verified_by: caseManagerName,
      notes: "Active HCBS Waiver enrollment confirmed. Annual renewal due September 30, 2025. Redetermination due July 1, 2025.",
      maStatus: "MA Eligible — Active", maNumber: "IA88472319", maType: "Waiver Related",
      ssiOrNoRedetermination: false, verificationDate: dateStr(2024, 10, 1),
      effectiveDate: dateStr(2024, 10, 1), renewalDate: dateStr(2025, 9, 30),
      redeterminationDate: dateStr(2025, 7, 1),
      documentType: "Medicaid Award Letter", documentName: "Iowa Medicaid Eligibility Verification — Anderson, Lisa",
      documentUploadedOn: dateStr(2024, 10, 2), recordStatus: "Active",
      updatedBy: caseManagerName, updatedOn: dateStr(2024, 10, 2),
      fundingSources: [{ id: "fs-1", type: "State funding", policyNumber: "IA88472319", effectiveDate: dateStr(2024, 10, 1), renewalDate: dateStr(2025, 9, 30), status: "Active", notes: "Iowa Medicaid HCBS Waiver — ID" }],
      created_at: ts(2024, 10, 1),
    },
  ];

  // ── MONITORING FORMS ───────────────────────────────────────────────────────
  const monitoringForms = [
    {
      individual_id: lisaId, type: "Quarterly", status: "Submitted", active: "Active",
      due_date: dateStr(2024, 12, 31), submitted_date: dateStr(2024, 12, 10),
      updated_by: caseManagerName, updated_on: dateStr(2024, 12, 10), author_uid: caseManagerUid,
      sections: { health_safety: "No incidents Q4 2024. Anxiety medication stable. No hospitalizations.", goal_progress: "Independent living skills progressing. Day program enrollment pending Jan 2025. Art goal not yet started.", service_utilization: "Case management utilized as authorized. Day program pending.", satisfaction: "Individual and family report high satisfaction." },
      created_at: ts(2024, 12, 10), updated_at: ts(2024, 12, 10),
    },
    {
      individual_id: lisaId, type: "Quarterly", status: "Submitted", active: "Active",
      due_date: dateStr(2025, 3, 31), submitted_date: dateStr(2025, 3, 18),
      updated_by: caseManagerName, updated_on: dateStr(2025, 3, 19), author_uid: caseManagerUid,
      sections: { health_safety: "No incidents Q1 2025. Zero anxiety episodes in 6 weeks per day program staff. PCP visit Feb 28 — medication unchanged.", goal_progress: "Goal 1: Exceeding benchmark — independent meal prep, laundry, budgeting. Goal 2: Day program 97% attendance. Goal 3: Art class enrolled March 8.", service_utilization: "Day program fully utilized. Transit referral submitted March 19. Community Living Support authorized Q2.", satisfaction: "Individual and family report very high satisfaction. Communication skills and confidence notably improved." },
      created_at: ts(2025, 3, 18), updated_at: ts(2025, 3, 19),
    },
    {
      individual_id: lisaId, type: "Quarterly", status: "In Progress", active: "Active",
      due_date: dateStr(2025, 6, 30),
      updated_by: caseManagerName, updated_on: dateStr(2025, 5, 20), author_uid: caseManagerUid,
      sections: { health_safety: "No incidents Q2 2025 to date. Transit now active. Eligibility verification due July 1 — not yet initiated.", goal_progress: "Goal 1 ACHIEVED. Goal 2: First social outing completed (bowling May 2025). Goal 3: Intermediate art class started May 10. Goal 4 (employment): Referral submitted, awaiting intake.", service_utilization: "All authorized services in use. Community Living Support began April 15 (10 hrs/week). Employment referral pending.", satisfaction: "Ongoing — to be completed at July home visit." },
      created_at: ts(2025, 5, 20), updated_at: ts(2025, 5, 20),
    },
  ];

  // ── SERVICE AUTHORIZATIONS ─────────────────────────────────────────────────
  const serviceAuthorizations = [
    {
      individual_id: lisaId, individual_name: "Lisa Anderson",
      service_name: "Case Management (T2022)", service_code: "T2022",
      provider: "Carroll County CM Services", authorized_units: 96, used_units: 52,
      unit_type: "hours", period: "Annual", start_date: dateStr(2024, 10, 1),
      end_date: dateStr(2025, 9, 30), authorization_number: "SA-2024-LA-001",
      status: "Active", funding_source: "Iowa Medicaid HCBS Waiver",
      created_at: ts(2024, 10, 1), updated_at: ts(2025, 5, 20),
    },
    {
      individual_id: lisaId, individual_name: "Lisa Anderson",
      service_name: "Day Habilitation (T2021)", service_code: "T2021",
      provider: "Carroll Day Services", authorized_units: 1000, used_units: 580,
      unit_type: "hours", period: "Annual", start_date: dateStr(2025, 1, 6),
      end_date: dateStr(2025, 9, 30), authorization_number: "SA-2025-LA-002",
      status: "Active", funding_source: "Iowa Medicaid HCBS Waiver",
      created_at: ts(2025, 1, 6), updated_at: ts(2025, 5, 20),
    },
    {
      individual_id: lisaId, individual_name: "Lisa Anderson",
      service_name: "Community Living Support (H2015)", service_code: "H2015",
      provider: "Carroll Home Care", authorized_units: 260, used_units: 60,
      unit_type: "hours", period: "Through Sep 2025", start_date: dateStr(2025, 4, 15),
      end_date: dateStr(2025, 9, 30), authorization_number: "SA-2025-LA-003",
      status: "Active", funding_source: "Iowa Medicaid HCBS Waiver",
      created_at: ts(2025, 4, 15), updated_at: ts(2025, 5, 20),
    },
  ];

  // ── WRITE TO FIRESTORE ─────────────────────────────────────────────────────
  const collections = [
    ["progress_notes", progressNotes],
    ["contact_notes", contactNotes],
    ["visit_summaries", visitSummaries],
    ["care_plans", carePlans],
    ["referrals", referrals],
    ["eligibility_verifications", eligibilityVerifications],
    ["monitoring_forms", monitoringForms],
    ["service_authorizations", serviceAuthorizations],
  ];

  for (const [collectionId, docs] of collections) {
    let count = 0;
    for (const docData of docs) {
      await addDoc(collectionId, docData);
      count++;
    }
    console.log(`  ✅ ${collectionId}: ${count} docs written`);
  }

  console.log(`\n🎉 All done! Lisa Anderson (ID: ${lisaId}) is fully seeded.`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message || err);
  process.exit(1);
});
