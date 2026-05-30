#!/usr/bin/env node
/**
 * seed-lisa-anderson.cjs
 * Finds the existing Lisa Anderson in Firestore and seeds her chart with:
 *   - progress_notes (9 notes, Oct 2024–May 2025)
 *   - contact_notes (5 notes)
 *   - visit_summaries (4 visits)
 *   - care_plans (1 active ISP)
 *   - referrals (3 referrals)
 *   - eligibility_verifications (1 active Medicaid record)
 *   - monitoring_forms (3 forms)
 *   - service_authorizations (3 authorizations)
 * Auth: uses Firebase CLI stored refresh token (~/.config/configstore/firebase-tools.json)
 */

const admin = require("firebase-admin");
const os = require("os");
const path = require("path");
const fs = require("fs");

// Load Firebase CLI OAuth refresh token
const configPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
if (!fs.existsSync(configPath)) {
  console.error("❌ Firebase CLI config not found. Run: npx firebase-tools login");
  process.exit(1);
}
const cliConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
const refresh_token = cliConfig.tokens?.refresh_token;
if (!refresh_token) {
  console.error("❌ No refresh token found. Run: npx firebase-tools login");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.refreshToken({
      type: "authorized_user",
      client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
      client_secret: "j9iVZfS8leyL02xLGnEAh6gN",
      refresh_token,
    }),
    projectId: "casemanagement-ai",
  });
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ── Date helpers ──────────────────────────────────────────────────────────────
function d(year, month, day) {
  return new Date(year, month - 1, day);
}
function ts(year, month, day) {
  return admin.firestore.Timestamp.fromDate(d(year, month, day));
}
function dateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Searching for Lisa Anderson in Firestore...");

  // Find Lisa Anderson — try by name
  const snap = await db
    .collection("individuals")
    .where("first_name", "==", "Lisa")
    .where("last_name", "==", "Anderson")
    .limit(5)
    .get();

  if (snap.empty) {
    console.error("❌ No Lisa Anderson found. Please check the individuals collection.");
    process.exit(1);
  }

  // Use the first match (show all if multiple)
  if (snap.docs.length > 1) {
    console.log(`⚠️  Found ${snap.docs.length} Lisa Andersons:`);
    snap.docs.forEach(d => {
      const data = d.data();
      console.log(`   ID: ${d.id}  DOB: ${data.dob}  Org: ${data.organizationId}`);
    });
  }

  const lisaDoc = snap.docs[0];
  const lisaId = lisaDoc.id;
  const lisa = lisaDoc.data();
  const orgId = lisa.organizationId || "demo-org-001";
  const caseManagerName = lisa.assigned_case_manager_name || "Kathy Martinez CM";
  const caseManagerUid = lisa.assigned_case_manager_uid || lisa.assigned_case_manager || "kathy-martinez";

  console.log(`\n✅ Found Lisa Anderson`);
  console.log(`   Firestore ID : ${lisaId}`);
  console.log(`   DOB          : ${lisa.dob}`);
  console.log(`   Org          : ${orgId}`);
  console.log(`   Case Manager : ${caseManagerName}`);
  console.log("");

  // ── Guard: check if data already seeded ──────────────────────────────────
  const existingNotes = await db
    .collection("progress_notes")
    .where("individualId", "==", lisaId)
    .limit(1)
    .get();

  if (!existingNotes.empty) {
    console.log("⚠️  Progress notes already exist for Lisa Anderson.");
    console.log("   Run with --force to overwrite (not implemented — delete manually first).");
    // Still continue to seed other missing collections
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 1. PROGRESS NOTES (individualId field, not individual_id)
  // ────────────────────────────────────────────────────────────────────────────
  const progressNotes = [
    {
      individualId: lisaId,
      organizationId: orgId,
      authorId: caseManagerUid,
      authorName: caseManagerName,
      activityType: "Assessment",
      contactType: "In-Person",
      progressDate: dateStr(2024, 10, 2),
      startTime: "10:00",
      endTime: "11:00",
      isBillable: true,
      purposeOfActivity: "Initial intake assessment completed with Lisa and her mother Carol at agency office. Reviewed diagnostic history (Mild Intellectual Disability, Anxiety Disorder) and prior services from previous provider. Collected emergency contacts, insurance information, and signed consent forms.",
      goalsProgress: [
        {
          goalId: "goal_independent_living",
          goalText: "Develop and maintain independent living skills",
          progressStatus: "no_change",
          narrative: "Baseline established. Lisa currently requires moderate support with meal preparation, budgeting, and household management. Written schedule in kitchen is helping.",
        },
      ],
      additionalObservations: "Lisa was engaged and cooperative throughout the intake appointment. She was able to answer questions about her daily routine and clearly stated her interests (cooking, art, music). Mother Carol expressed concern about Lisa's anxiety in new or unstructured environments. Recommended gradual community integration approach.",
      nextSteps: "Schedule follow-up home visit within 30 days. Connect with behavioral support team. Research day program options in Carroll County.",
      status: "signed",
      aiDrafted: false,
      signedAt: ts(2024, 10, 5),
      createdAt: ts(2024, 10, 2),
      updatedAt: ts(2024, 10, 5),
    },
    {
      individualId: lisaId,
      organizationId: orgId,
      authorId: caseManagerUid,
      authorName: caseManagerName,
      activityType: "Home Visit",
      contactType: "Home Visit",
      progressDate: dateStr(2024, 10, 28),
      startTime: "14:00",
      endTime: "14:45",
      isBillable: true,
      purposeOfActivity: "Home visit to assess Lisa's living environment and identify support needs. Reviewed daily schedule with Lisa and her mother Carol. Identified baseline for ISP goals.",
      goalsProgress: [
        {
          goalId: "goal_independent_living",
          goalText: "Develop and maintain independent living skills",
          progressStatus: "progressing",
          narrative: "Lisa demonstrated ability to prepare simple meals with verbal prompting. She prefers a written schedule posted in the kitchen — this visual support is effective.",
        },
        {
          goalId: "goal_community_integration",
          goalText: "Increase community participation and integration",
          progressStatus: "no_change",
          narrative: "Lisa attends church with family weekly but has no other structured community activities. Plan to explore day program options this month.",
        },
      ],
      additionalObservations: "Home environment clean, organized, and safe. Lisa showed me her art supplies and talked about enjoying drawing and watercolors. Mother reports mood has been stable with current anxiety medication. No behavioral incidents reported.",
      nextSteps: "Submit referral to Carroll Day Services. Follow up with PCP regarding anxiety medication review. Schedule November team meeting.",
      status: "signed",
      aiDrafted: false,
      signedAt: ts(2024, 10, 30),
      createdAt: ts(2024, 10, 28),
      updatedAt: ts(2024, 10, 30),
    },
    {
      individualId: lisaId,
      organizationId: orgId,
      authorId: caseManagerUid,
      authorName: caseManagerName,
      activityType: "Family/Guardian Meeting",
      contactType: "Telehealth",
      progressDate: dateStr(2024, 11, 19),
      startTime: "09:30",
      endTime: "10:15",
      isBillable: true,
      purposeOfActivity: "Person-centered team meeting to review ISP goals, service authorizations, and introduce day program coordinator. Lisa and Carol attended via video call. Day program start date confirmed for January 6, 2025.",
      goalsProgress: [
        {
          goalId: "goal_independent_living",
          goalText: "Develop and maintain independent living skills",
          progressStatus: "progressing",
          narrative: "Lisa reported making breakfast independently 4-5 days per week. Carol confirms she is asking for help less frequently with cooking tasks.",
        },
        {
          goalId: "goal_community_integration",
          goalText: "Increase community participation and integration",
          progressStatus: "progressing",
          narrative: "Day program referral submitted to Carroll Day Services. Enrollment confirmed for January 6, 2025. Transportation being coordinated.",
        },
      ],
      additionalObservations: "Lisa was vocal and assertive during the team meeting — expressed strong interest in art activities and asked about art classes specifically. Day program coordinator Maria Okafor confirmed a space is available and that the program offers art and cooking activities. This is a good fit.",
      nextSteps: "Finalize day program enrollment paperwork. Add art class goal to ISP at January review. Confirm transportation arrangements. Schedule December phone check-in.",
      status: "signed",
      aiDrafted: false,
      signedAt: ts(2024, 11, 20),
      createdAt: ts(2024, 11, 19),
      updatedAt: ts(2024, 11, 20),
    },
    {
      individualId: lisaId,
      organizationId: orgId,
      authorId: caseManagerUid,
      authorName: caseManagerName,
      activityType: "Case Management",
      contactType: "Telephone",
      progressDate: dateStr(2024, 12, 10),
      startTime: "13:00",
      endTime: "13:40",
      isBillable: true,
      purposeOfActivity: "Monthly phone check-in with Lisa and Carol. Reviewed holiday plans, medication adherence, upcoming day program start on January 6th. Answered Carol's questions about transportation reimbursement.",
      goalsProgress: [
        {
          goalId: "goal_independent_living",
          goalText: "Develop and maintain independent living skills",
          progressStatus: "progressing",
          narrative: "Carol reports Lisa has been managing her weekly $40 spending budget for the past 3 weeks with only a written checklist — no verbal reminders needed. Significant improvement.",
        },
      ],
      additionalObservations: "Lisa answered the phone herself and opened the conversation by saying 'I'm ready for day program in January!' — clearly motivated. No health concerns reported. Family plans to visit relatives during the holidays; confirmed emergency contacts will be available locally.",
      nextSteps: "Confirm day program transportation on January 3rd. Schedule home visit for late January (post day-program start). Collect holiday emergency contact list.",
      status: "signed",
      aiDrafted: false,
      signedAt: ts(2024, 12, 11),
      createdAt: ts(2024, 12, 10),
      updatedAt: ts(2024, 12, 11),
    },
    {
      individualId: lisaId,
      organizationId: orgId,
      authorId: caseManagerUid,
      authorName: caseManagerName,
      activityType: "Care Plan Review",
      contactType: "Home Visit",
      progressDate: dateStr(2025, 1, 14),
      startTime: "10:30",
      endTime: "11:30",
      isBillable: true,
      purposeOfActivity: "Quarterly ISP review home visit. Reviewed all goal progress since October. Lisa started Carroll Day Services on January 6th (8 days ago). Added art class as new ISP goal per Lisa's self-advocacy. Updated service plan and collected signatures.",
      goalsProgress: [
        {
          goalId: "goal_independent_living",
          goalText: "Develop and maintain independent living skills",
          progressStatus: "progressing",
          narrative: "Lisa now independently prepares 3 meals per week and manages her personal budget with a written checklist — no prompting needed. Advancing to next benchmark: managing her own laundry schedule.",
        },
        {
          goalId: "goal_community_integration",
          goalText: "Increase community participation and integration",
          progressStatus: "progressing",
          narrative: "Day program attendance consistent — attended all 6 scheduled sessions since Jan 6th. Enjoys cooking and craft activities. Staff report she is a positive, enthusiastic participant.",
        },
        {
          goalId: "goal_art",
          goalText: "Pursue creative arts as a source of personal fulfillment and expression",
          progressStatus: "no_change",
          narrative: "New goal added per Lisa's self-advocacy. Objective: enroll in a community art class by March 2025. Carol is researching options at the Carroll Arts Center.",
        },
      ],
      additionalObservations: "Lisa's mood noticeably more positive since starting the day program — Carol reports she 'has her daughter back.' PCP confirmed at last visit that medication dosage is appropriate and no changes needed. Lisa showed strong self-advocacy skills during the meeting.",
      nextSteps: "Research community art class options. Update ISP to reflect new art goal. Schedule February phone check-in. Follow up on transportation coverage expansion.",
      status: "signed",
      aiDrafted: false,
      signedAt: ts(2025, 1, 16),
      createdAt: ts(2025, 1, 14),
      updatedAt: ts(2025, 1, 16),
    },
    {
      individualId: lisaId,
      organizationId: orgId,
      authorId: caseManagerUid,
      authorName: caseManagerName,
      activityType: "Case Management",
      contactType: "Telephone",
      progressDate: dateStr(2025, 2, 11),
      startTime: "14:00",
      endTime: "14:30",
      isBillable: true,
      purposeOfActivity: "Monthly phone check-in. Reviewed day program satisfaction, art class enrollment status, and any health or behavioral changes since January visit.",
      goalsProgress: [
        {
          goalId: "goal_community_integration",
          goalText: "Increase community participation and integration",
          progressStatus: "progressing",
          narrative: "No absences from day program in January (8/8 sessions attended). Staff report Lisa is a positive presence in the group and has begun helping newer participants.",
        },
        {
          goalId: "goal_art",
          goalText: "Pursue creative arts as a source of personal fulfillment and expression",
          progressStatus: "progressing",
          narrative: "Carol located a Saturday art class at the Carroll Arts Center. Registration submitted — class starts March 8th. Lisa is very excited.",
        },
      ],
      additionalObservations: "Lisa answered the phone and led the majority of the check-in conversation — notable improvement in communication confidence and self-advocacy. No behavioral concerns or health changes reported. Carol mentioned Lisa has started asking about jobs.",
      nextSteps: "Confirm art class registration at Carroll Arts Center. Schedule March home visit. Begin research on supported employment options per Lisa's expressed interest.",
      status: "signed",
      aiDrafted: false,
      signedAt: ts(2025, 2, 12),
      createdAt: ts(2025, 2, 11),
      updatedAt: ts(2025, 2, 12),
    },
    {
      individualId: lisaId,
      organizationId: orgId,
      authorId: caseManagerUid,
      authorName: caseManagerName,
      activityType: "Home Visit",
      contactType: "Home Visit",
      progressDate: dateStr(2025, 3, 18),
      startTime: "11:00",
      endTime: "12:00",
      isBillable: true,
      purposeOfActivity: "Quarterly home visit and behavioral health check-in. Reviewed anxiety management strategies, medication adherence, and coordination with day program behavioral support staff.",
      goalsProgress: [
        {
          goalId: "goal_independent_living",
          goalText: "Develop and maintain independent living skills",
          progressStatus: "progressing",
          narrative: "Lisa now independently grocery shops with a written list (Carol drives but does not assist with shopping). She handles all her own laundry without any prompting. Exceeding benchmark expectations.",
        },
        {
          goalId: "goal_art",
          goalText: "Pursue creative arts as a source of personal fulfillment and expression",
          progressStatus: "progressing",
          narrative: "Attended 2 of 6 Saturday art classes at Carroll Arts Center. Lisa brought home a watercolor painting of her backyard garden — she is very proud of it. Goal on track.",
        },
      ],
      additionalObservations: "Lisa showed me her watercolor painting — a detailed depiction of her garden with flowers, a bird feeder, and a cat. She was beaming. Day program behavioral support staff report zero anxiety episodes in the past 6 weeks. This is a dramatic improvement from October's baseline. Current medication appears highly effective.",
      nextSteps: "Continue current anxiety medication — no changes needed. Coordinate with day program to expand art-focused activities during program hours. Plan April ISP review. Begin employment exploration conversation.",
      status: "signed",
      aiDrafted: false,
      signedAt: ts(2025, 3, 19),
      createdAt: ts(2025, 3, 18),
      updatedAt: ts(2025, 3, 19),
    },
    {
      individualId: lisaId,
      organizationId: orgId,
      authorId: caseManagerUid,
      authorName: caseManagerName,
      activityType: "Care Plan Review",
      contactType: "Home Visit",
      progressDate: dateStr(2025, 4, 15),
      startTime: "10:00",
      endTime: "11:15",
      isBillable: true,
      purposeOfActivity: "Semi-annual ISP review and update. Met with Lisa, Carol, Carroll Day Services coordinator Maria Okafor, and behavioral support specialist Dr. Susan Holt. Reviewed all goals, updated service units, and reviewed authorization status.",
      goalsProgress: [
        {
          goalId: "goal_independent_living",
          goalText: "Develop and maintain independent living skills",
          progressStatus: "met",
          narrative: "GOAL ACHIEVED — Lisa independently manages meal preparation, laundry, and personal budgeting without any support or prompting. Updating goal to focus on the next benchmark: scheduling and attending her own medical appointments.",
        },
        {
          goalId: "goal_community_integration",
          goalText: "Increase community participation and integration",
          progressStatus: "progressing",
          narrative: "Day program attendance rate 97% over 4 months (attended 58 of 60 scheduled sessions). Lisa has formed meaningful friendships with 2 peers. Expanding community activities to include a monthly social outing starting May.",
        },
        {
          goalId: "goal_art",
          goalText: "Pursue creative arts as a source of personal fulfillment and expression",
          progressStatus: "progressing",
          narrative: "Completed the full 6-week beginner art class at Carroll Arts Center. Enrolled in intermediate session starting May 10th. Goal is on track to be fully achieved by June.",
        },
      ],
      additionalObservations: "Exceptional semi-annual review. All team members were present and expressed highly positive feedback about Lisa's growth over the past 7 months. Carol became tearful when describing how much her daughter has blossomed. Lisa self-advocated strongly — she requested a new goal about riding the bus independently and asked about job opportunities for the first time with a specific question: 'Can I work at an animal shelter?'",
      nextSteps: "Add transportation independence goal to ISP. Submit supported employment referral to Carroll County Employment Services. Authorize Community Living Support (10 hrs/week starting April 15). Submit annual eligibility verification before July 1. Schedule May phone check-in.",
      status: "pending_signature",
      aiDrafted: false,
      createdAt: ts(2025, 4, 15),
      updatedAt: ts(2025, 4, 15),
    },
    {
      individualId: lisaId,
      organizationId: orgId,
      authorId: caseManagerUid,
      authorName: caseManagerName,
      activityType: "Case Management",
      contactType: "Telephone",
      progressDate: dateStr(2025, 5, 20),
      startTime: "13:30",
      endTime: "14:00",
      isBillable: true,
      purposeOfActivity: "Monthly phone check-in. Reviewed intermediate art class progress, social outing experience, employment referral status, and any concerns heading into summer.",
      goalsProgress: [
        {
          goalId: "goal_community_integration",
          goalText: "Increase community participation and integration",
          progressStatus: "progressing",
          narrative: "Lisa attended her first community social outing — bowling with 4 peers from the day program. She reported having 'the best time ever' and wants to do it again next month.",
        },
        {
          goalId: "goal_art",
          goalText: "Pursue creative arts as a source of personal fulfillment and expression",
          progressStatus: "progressing",
          narrative: "Intermediate art class started May 10th. Lisa completed her first two sessions. She described learning shading techniques this week.",
        },
      ],
      additionalObservations: "Lisa's communication skills and self-confidence continue to improve month over month. She is asking thoughtful questions about employment and specifically mentioned wanting to work with animals. Employment referral to Carroll County Employment Services was submitted April 15 — still awaiting intake scheduling response.",
      nextSteps: "Follow up with Carroll County Employment Services re: intake appointment (now 35 days pending). Remind Carol about annual eligibility verification due July 1. Schedule July home visit.",
      status: "draft",
      aiDrafted: false,
      createdAt: ts(2025, 5, 20),
      updatedAt: ts(2025, 5, 20),
    },
  ];

  // ────────────────────────────────────────────────────────────────────────────
  // 2. CONTACT NOTES (individual_id field)
  // ────────────────────────────────────────────────────────────────────────────
  const contactNotes = [
    {
      individual_id: lisaId,
      individual_name: "Lisa Anderson",
      author_uid: caseManagerUid,
      author_name: caseManagerName,
      date: dateStr(2024, 10, 2),
      activityType: "Intake",
      contactType: "In-Person",
      billable: true,
      startTime: "10:00",
      endTime: "11:00",
      purpose: "Initial intake — review history, collect consents, establish goals",
      present: "Lisa Anderson, Carol Anderson (mother), Kathy Martinez CM",
      details: "Completed initial intake assessment. Lisa was cooperative and communicative. Reviewed diagnostic history: Mild Intellectual Disability (F70), Anxiety Disorder (F41.1). Prior provider: Carroll County Support Services (discharged Sept 2024 due to relocation). Collected emergency contacts, signed consent for services, Medicaid verification, and PHI release. Lisa identified cooking, art, and music as primary interests.",
      issues: "Mother flagged ongoing anxiety in new environments. Transportation to appointments is a barrier — mother currently drives.",
      nextSteps: "Schedule home visit Oct 28. Connect with behavioral support. Research day programs. Submit ISP by Oct 17.",
      status: "signed",
      created_at: ts(2024, 10, 2),
      updated_at: ts(2024, 10, 5),
    },
    {
      individual_id: lisaId,
      individual_name: "Lisa Anderson",
      author_uid: caseManagerUid,
      author_name: caseManagerName,
      date: dateStr(2024, 11, 4),
      activityType: "Provider Coordination",
      contactType: "Telephone",
      billable: true,
      startTime: "09:00",
      endTime: "09:20",
      purpose: "Coordinate day program referral with Carroll Day Services",
      present: "Kathy Martinez CM, Maria Okafor (Carroll Day Services enrollment coordinator)",
      details: "Called Carroll Day Services to follow up on the October 28 referral (reference CDS-2024-0892). Spoke with Maria Okafor. She confirmed the referral was received, Lisa's Medicaid eligibility was verified, and a spot is available. Start date confirmed: January 6, 2025. Transportation coordination to begin December.",
      issues: "None — enrollment confirmed without issues.",
      nextSteps: "Notify Carol Anderson of January 6 start date. Begin transportation coordination in December. Add enrollment update to November team meeting agenda.",
      status: "signed",
      created_at: ts(2024, 11, 4),
      updated_at: ts(2024, 11, 4),
    },
    {
      individual_id: lisaId,
      individual_name: "Lisa Anderson",
      author_uid: caseManagerUid,
      author_name: caseManagerName,
      date: dateStr(2025, 1, 6),
      activityType: "Provider Coordination",
      contactType: "Telephone",
      billable: false,
      nonBillableReason: "Administrative coordination",
      startTime: "08:30",
      endTime: "08:45",
      purpose: "Confirm Lisa's first day at Carroll Day Services — verify transportation and arrival",
      present: "Kathy Martinez CM, Carol Anderson (mother)",
      details: "Called Carol to confirm Lisa's first day at Carroll Day Services went smoothly. Carol reported that Lisa was nervous in the car but brightened immediately when staff greeted her at the door. She participated in a cooking activity and came home excited. No issues. This is a significant milestone.",
      issues: "None.",
      nextSteps: "Check in again at 2-week mark. Schedule January 14 ISP review home visit.",
      status: "signed",
      created_at: ts(2025, 1, 6),
      updated_at: ts(2025, 1, 6),
    },
    {
      individual_id: lisaId,
      individual_name: "Lisa Anderson",
      author_uid: caseManagerUid,
      author_name: caseManagerName,
      date: dateStr(2025, 3, 19),
      activityType: "Provider Coordination",
      contactType: "Telephone",
      billable: false,
      nonBillableReason: "Administrative coordination",
      startTime: "10:30",
      endTime: "10:50",
      purpose: "Coordinate with Carroll Arts Center regarding art class enrollment status",
      present: "Kathy Martinez CM, Carroll Arts Center reception",
      details: "Called Carroll Arts Center to confirm Lisa Anderson's enrollment in the Saturday beginner watercolor class (March 8 start). Confirmed enrollment is active. Inquired about intermediate session — confirmed they offer a 6-week intermediate class beginning May 10. Registration opens April 1. Requested Carol be notified.",
      issues: "None.",
      nextSteps: "Notify Carol to register Lisa for May 10 intermediate art class. Update ISP art goal timeline.",
      status: "signed",
      created_at: ts(2025, 3, 19),
      updated_at: ts(2025, 3, 19),
    },
    {
      individual_id: lisaId,
      individual_name: "Lisa Anderson",
      author_uid: caseManagerUid,
      author_name: caseManagerName,
      date: dateStr(2025, 4, 15),
      activityType: "Assessment",
      contactType: "In-Person",
      billable: true,
      startTime: "10:00",
      endTime: "11:15",
      purpose: "Semi-annual ISP review team meeting — all stakeholders present",
      present: "Lisa Anderson, Carol Anderson (mother), Kathy Martinez CM, Maria Okafor (Carroll Day Services), Dr. Susan Holt (Behavioral Support Specialist)",
      details: "Full team meeting at Lisa's home for semi-annual ISP review. Reviewed all three goals — Goal 1 (Independent Living) was formally achieved and updated to focus on medical appointment management. Goals 2 and 3 progressing strongly. Lisa self-advocated for a transportation independence goal and expressed interest in employment (specifically animal shelter work). New Community Living Support service authorized (10 hrs/week). All team members signed updated ISP except Lisa and Carol (pending — signature packets mailed).",
      issues: "Supported employment referral not yet submitted — to be completed this week. Annual eligibility verification due July 1.",
      nextSteps: "Submit employment referral to Carroll County Employment Services by April 18. Mail ISP signature packets to Lisa and Carol. Submit eligibility verification by June 15.",
      status: "submitted",
      created_at: ts(2025, 4, 15),
      updated_at: ts(2025, 4, 15),
    },
  ];

  // ────────────────────────────────────────────────────────────────────────────
  // 3. VISIT SUMMARIES (individual_id field)
  // ────────────────────────────────────────────────────────────────────────────
  const visitSummaries = [
    {
      individual_id: lisaId,
      individual_name: "Lisa Anderson",
      visit_date: dateStr(2024, 10, 28),
      start_time: "14:00",
      end_time: "14:45",
      location: "Lisa's residence — 412 Maple St, Carroll, IA",
      purpose_of_support: "Initial home visit — establish baseline supports and conduct living environment assessment",
      what_went_well: "Home environment is clean, safe, and organized. Lisa has a clear daily routine supported by her mother. Visual supports (posted schedule in kitchen) are effective. Lisa was warm, engaged, and clearly comfortable in her home environment.",
      what_is_not_working: "Lisa relies on her mother for most meal preparation and is not yet managing her personal spending money independently. No structured community activities outside of weekly church attendance.",
      goals_addressed: ["Develop independent living skills", "Increase community participation"],
      next_steps: "Submit day program referral. Coordinate ISP meeting for October 14. Follow up with PCP on anxiety medication.",
      status: "signed",
      author_uid: caseManagerUid,
      author_name: caseManagerName,
      updated_by: caseManagerName,
      updated_on: dateStr(2024, 10, 30),
      created_at: ts(2024, 10, 28),
      updated_at: ts(2024, 10, 30),
    },
    {
      individual_id: lisaId,
      individual_name: "Lisa Anderson",
      visit_date: dateStr(2025, 1, 14),
      start_time: "10:30",
      end_time: "11:30",
      location: "Lisa's residence — 412 Maple St, Carroll, IA",
      purpose_of_support: "Quarterly ISP review visit — review goal progress and confirm day program enrollment",
      what_went_well: "Lisa started Carroll Day Services on January 6th and has attended all 6 sessions. Staff report she is enthusiastic and participates actively. Independent living skills improving significantly — making breakfast independently most mornings. ISP review was productive and all signatures collected.",
      what_is_not_working: "Lisa has not yet enrolled in community social activities outside the day program. Art class goal not yet started — researching options.",
      goals_addressed: ["Develop independent living skills", "Increase community participation", "Art and creative expression"],
      next_steps: "Research art class options (Carroll Arts Center). Update ISP to reflect art goal. Schedule February phone check-in.",
      status: "signed",
      author_uid: caseManagerUid,
      author_name: caseManagerName,
      updated_by: caseManagerName,
      updated_on: dateStr(2025, 1, 16),
      created_at: ts(2025, 1, 14),
      updated_at: ts(2025, 1, 16),
    },
    {
      individual_id: lisaId,
      individual_name: "Lisa Anderson",
      visit_date: dateStr(2025, 3, 18),
      start_time: "11:00",
      end_time: "12:00",
      location: "Lisa's residence — 412 Maple St, Carroll, IA",
      purpose_of_support: "Quarterly home visit — behavioral health check-in and goal progress review",
      what_went_well: "No anxiety episodes reported in 6 weeks. Day program attendance excellent. Lisa now independently grocery shops with a list and manages all laundry tasks without prompting. Art class attendance consistent (2/2 sessions attended so far). She showed me a beautiful watercolor painting of her garden.",
      what_is_not_working: "Transportation to community activities remains inconsistent — Carol must arrange all rides which limits frequency of community participation.",
      goals_addressed: ["Develop independent living skills", "Art and creative expression"],
      next_steps: "Submit Medicaid transportation referral to Carroll Transit System. Coordinate with day program to add more art activities during program hours. Plan April semi-annual ISP review.",
      status: "signed",
      author_uid: caseManagerUid,
      author_name: caseManagerName,
      updated_by: caseManagerName,
      updated_on: dateStr(2025, 3, 19),
      created_at: ts(2025, 3, 18),
      updated_at: ts(2025, 3, 19),
    },
    {
      individual_id: lisaId,
      individual_name: "Lisa Anderson",
      visit_date: dateStr(2025, 4, 15),
      start_time: "10:00",
      end_time: "11:15",
      location: "Lisa's residence — 412 Maple St, Carroll, IA",
      purpose_of_support: "Semi-annual ISP review — full interdisciplinary team meeting",
      what_went_well: "Excellent semi-annual review. Goal 1 (Independent Living) formally achieved. Day program attendance 97% over 4 months. Lisa has formed 2 meaningful peer friendships. Art class completed and intermediate session enrolled. All team members expressed extremely positive feedback. Lisa's self-advocacy skills are impressive.",
      what_is_not_working: "Supported employment referral not yet submitted. Transportation independence is still a barrier. Annual eligibility verification (due July 1) not yet initiated.",
      goals_addressed: ["Develop independent living skills", "Increase community participation", "Art and creative expression", "Supported employment exploration"],
      next_steps: "Submit employment referral by April 18. Authorize Community Living Support (10 hrs/week). Submit eligibility verification by June 15. Schedule May phone check-in. Add transportation independence goal to ISP.",
      status: "submitted",
      author_uid: caseManagerUid,
      author_name: caseManagerName,
      updated_by: caseManagerName,
      updated_on: dateStr(2025, 4, 15),
      created_at: ts(2025, 4, 15),
      updated_at: ts(2025, 4, 15),
    },
  ];

  // ────────────────────────────────────────────────────────────────────────────
  // 4. CARE PLANS (individual_id field)
  // ────────────────────────────────────────────────────────────────────────────
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
          goal: "Lisa will develop and maintain independent living skills including meal preparation, personal budgeting, and household management with decreasing levels of support over the plan year.",
          priority: "high",
          target_date: dateStr(2025, 9, 30),
          progress: "achieved",
          interventions: [
            "Home support staff provide coaching (not physical assistance) for meal preparation 3x/week",
            "Written visual checklist for weekly budget management",
            "Weekly review of laundry and cleaning schedule",
          ],
        },
        {
          id: "goal_community_integration",
          goal: "Lisa will participate in structured community activities including a day program and monthly social outings, building peer relationships and community presence.",
          priority: "high",
          target_date: dateStr(2025, 9, 30),
          progress: "in_progress",
          interventions: [
            "Enroll and maintain consistent attendance at Carroll Day Services (5 days/week)",
            "Coordinate monthly social outings with day program peers",
            "Supported transportation to community activities",
          ],
        },
        {
          id: "goal_art",
          goal: "Lisa will pursue her interest in visual art by enrolling in a community art class, completing at least one full session, and expanding her creative practice as a source of personal fulfillment and self-expression.",
          priority: "medium",
          target_date: dateStr(2025, 6, 30),
          progress: "in_progress",
          interventions: [
            "Research and enroll in community art class at Carroll Arts Center",
            "Attend Saturday art classes consistently",
            "Display artwork at home to reinforce pride and self-expression",
          ],
        },
        {
          id: "goal_employment",
          goal: "Lisa will explore supported employment opportunities aligned with her interests (animal care, food service) through referral to Carroll County Employment Services for vocational assessment and job coaching.",
          priority: "medium",
          target_date: dateStr(2025, 12, 31),
          progress: "not_started",
          interventions: [
            "Submit referral to Carroll County Employment Services",
            "Complete vocational interest and skills assessment",
            "Identify potential job shadowing opportunities",
          ],
        },
      ],
      author_uid: caseManagerUid,
      author_name: caseManagerName,
      created_at: ts(2024, 10, 17),
      updated_at: ts(2025, 4, 15),
    },
  ];

  // ────────────────────────────────────────────────────────────────────────────
  // 5. REFERRALS (individual_id field)
  // ────────────────────────────────────────────────────────────────────────────
  const referrals = [
    {
      individual_id: lisaId,
      individual_name: "Lisa Anderson",
      referral_type: "Day Program / Social & Recreational",
      referred_to: "Carroll Day Services",
      referred_by: caseManagerName,
      referred_by_uid: caseManagerUid,
      date: dateStr(2024, 10, 28),
      priority: "routine",
      status: "completed",
      notes: "Referral for day habilitation services aligned with ISP Community Integration goal. Reference: CDS-2024-0892. Provider confirmed enrollment for January 6, 2025.",
      outcome: "Successfully enrolled. Lisa began attending Carroll Day Services January 6, 2025. Attendance rate 97% over first 4 months. Goal-aligned programming including cooking, crafts, and community outings.",
      created_at: ts(2024, 10, 28),
      updated_at: ts(2025, 1, 8),
    },
    {
      individual_id: lisaId,
      individual_name: "Lisa Anderson",
      referral_type: "Transportation",
      referred_to: "Carroll Transit System — Medicaid Paratransit",
      referred_by: caseManagerName,
      referred_by_uid: caseManagerUid,
      date: dateStr(2025, 3, 19),
      priority: "routine",
      status: "completed",
      notes: "Medicaid transportation referral to address barrier identified during March home visit. Carol Anderson (mother) is sole transportation provider — limits community participation. Reference: CTS-2025-0341.",
      outcome: "Medicaid paratransit card issued April 1, 2025. Lisa now using transit for day program 3 days/week and for PCP appointments. Transportation barrier significantly reduced.",
      created_at: ts(2025, 3, 19),
      updated_at: ts(2025, 4, 2),
    },
    {
      individual_id: lisaId,
      individual_name: "Lisa Anderson",
      referral_type: "Employment & Vocational",
      referred_to: "Carroll County Employment Services",
      referred_by: caseManagerName,
      referred_by_uid: caseManagerUid,
      date: dateStr(2025, 4, 15),
      priority: "routine",
      status: "pending",
      notes: "Lisa expressed strong interest in supported employment during April semi-annual ISP review — specifically mentioned wanting to work with animals. Referred for vocational assessment and job coaching. Reference: CCES-2025-0774. Follow-up needed — now 35+ days with no intake appointment scheduled.",
      outcome: null,
      created_at: ts(2025, 4, 15),
      updated_at: ts(2025, 4, 15),
    },
  ];

  // ────────────────────────────────────────────────────────────────────────────
  // 6. ELIGIBILITY VERIFICATIONS (individual_id field)
  // ────────────────────────────────────────────────────────────────────────────
  const eligibilityVerifications = [
    {
      individual_id: lisaId,
      verification_date: dateStr(2024, 10, 1),
      payer: "Iowa Medicaid",
      medicaid_id: "IA88472319",
      eligible: true,
      coverage_start: dateStr(2024, 10, 1),
      coverage_end: dateStr(2025, 9, 30),
      plan_name: "Iowa Medicaid — HCBS Waiver (Intellectual Disability)",
      managed_care_org: "Iowa Total Care",
      verified_by: caseManagerName,
      notes: "Medicaid eligibility verified at intake. Active HCBS Waiver enrollment confirmed. Annual renewal due September 30, 2025. Annual eligibility redetermination due July 1, 2025.",
      maStatus: "MA Eligible — Active",
      maNumber: "IA88472319",
      maType: "Waiver Related",
      ssiOrNoRedetermination: false,
      verificationDate: dateStr(2024, 10, 1),
      effectiveDate: dateStr(2024, 10, 1),
      renewalDate: dateStr(2025, 9, 30),
      redeterminationDate: dateStr(2025, 7, 1),
      documentType: "Medicaid Award Letter",
      documentName: "Iowa Medicaid Eligibility Verification — Anderson, Lisa",
      documentUploadedOn: dateStr(2024, 10, 2),
      recordStatus: "Active",
      updatedBy: caseManagerName,
      updatedOn: dateStr(2024, 10, 2),
      fundingSources: [
        {
          id: "fs-1",
          type: "State funding",
          policyNumber: "IA88472319",
          effectiveDate: dateStr(2024, 10, 1),
          renewalDate: dateStr(2025, 9, 30),
          status: "Active",
          notes: "Iowa Medicaid HCBS Waiver — Intellectual Disability",
        },
      ],
      created_at: ts(2024, 10, 1),
    },
  ];

  // ────────────────────────────────────────────────────────────────────────────
  // 7. MONITORING FORMS (individual_id field)
  // ────────────────────────────────────────────────────────────────────────────
  const monitoringForms = [
    {
      individual_id: lisaId,
      type: "Quarterly",
      status: "Submitted",
      active: "Active",
      due_date: dateStr(2024, 12, 31),
      submitted_date: dateStr(2024, 12, 10),
      updated_by: caseManagerName,
      updated_on: dateStr(2024, 12, 10),
      author_uid: caseManagerUid,
      sections: {
        health_safety: "No health or safety incidents reported Q4 2024. Anxiety medication stable and effective. No hospitalizations or ER visits.",
        goal_progress: "Independent living skills progressing above expectations. Community integration referral submitted — enrollment pending for January 2025. Art goal not yet started.",
        service_utilization: "Case management services utilized as authorized. Day program enrollment pending January 2025. Transportation coordinated by family.",
        satisfaction: "Individual reports high satisfaction with case management support. Family engaged and supportive.",
      },
      created_at: ts(2024, 12, 10),
      updated_at: ts(2024, 12, 10),
    },
    {
      individual_id: lisaId,
      type: "Quarterly",
      status: "Submitted",
      active: "Active",
      due_date: dateStr(2025, 3, 31),
      submitted_date: dateStr(2025, 3, 18),
      updated_by: caseManagerName,
      updated_on: dateStr(2025, 3, 19),
      author_uid: caseManagerUid,
      sections: {
        health_safety: "No health incidents reported Q1 2025. Zero anxiety episodes in past 6 weeks per day program behavioral support staff. PCP visit completed February 28 — medication unchanged.",
        goal_progress: "Goal 1 (Independent Living): Exceeding benchmark — independent meal prep, laundry, and budgeting without prompting. Goal 2 (Community Integration): Day program attendance 97%. Goal 3 (Art): Enrolled in Saturday art class starting March 8.",
        service_utilization: "Day program services fully utilized (5 days/week). Transportation being coordinated via Medicaid paratransit referral submitted March 19. Community Living Support authorized for Q2.",
        satisfaction: "Individual and family report very high satisfaction. Lisa's self-confidence and communication skills notably improved since October.",
      },
      created_at: ts(2025, 3, 18),
      updated_at: ts(2025, 3, 19),
    },
    {
      individual_id: lisaId,
      type: "Quarterly",
      status: "In Progress",
      active: "Active",
      due_date: dateStr(2025, 6, 30),
      updated_by: caseManagerName,
      updated_on: dateStr(2025, 5, 20),
      author_uid: caseManagerUid,
      sections: {
        health_safety: "No incidents Q2 2025 to date. Medicaid transportation now active (April 1). Eligibility verification due July 1 — not yet initiated.",
        goal_progress: "Goal 1 ACHIEVED. Goal 2 (Community): First social outing completed (bowling May 2025). Goal 3 (Art): Intermediate class started May 10. Goal 4 (Employment): Referral submitted, awaiting intake.",
        service_utilization: "All authorized services in use. Community Living Support began April 15 (10 hrs/week). Employment referral pending intake appointment.",
        satisfaction: "Ongoing — to be completed at July home visit.",
      },
      created_at: ts(2025, 5, 20),
      updated_at: ts(2025, 5, 20),
    },
  ];

  // ────────────────────────────────────────────────────────────────────────────
  // 8. SERVICE AUTHORIZATIONS (individual_id field)
  // ────────────────────────────────────────────────────────────────────────────
  const serviceAuthorizations = [
    {
      individual_id: lisaId,
      individual_name: "Lisa Anderson",
      service_name: "Case Management (T2022)",
      service_code: "T2022",
      provider: "Carroll County CM Services",
      authorized_units: 96,
      used_units: 52,
      unit_type: "hours",
      period: "Annual",
      start_date: dateStr(2024, 10, 1),
      end_date: dateStr(2025, 9, 30),
      authorization_number: "SA-2024-LA-001",
      status: "Active",
      funding_source: "Iowa Medicaid HCBS Waiver",
      created_at: ts(2024, 10, 1),
      updated_at: ts(2025, 5, 20),
    },
    {
      individual_id: lisaId,
      individual_name: "Lisa Anderson",
      service_name: "Day Habilitation (T2021)",
      service_code: "T2021",
      provider: "Carroll Day Services",
      authorized_units: 1000,
      used_units: 580,
      unit_type: "hours",
      period: "Annual",
      start_date: dateStr(2025, 1, 6),
      end_date: dateStr(2025, 9, 30),
      authorization_number: "SA-2025-LA-002",
      status: "Active",
      funding_source: "Iowa Medicaid HCBS Waiver",
      created_at: ts(2025, 1, 6),
      updated_at: ts(2025, 5, 20),
    },
    {
      individual_id: lisaId,
      individual_name: "Lisa Anderson",
      service_name: "Community Living Support (H2015)",
      service_code: "H2015",
      provider: "Carroll Home Care",
      authorized_units: 260,
      used_units: 60,
      unit_type: "hours",
      period: "Through Sep 2025",
      start_date: dateStr(2025, 4, 15),
      end_date: dateStr(2025, 9, 30),
      authorization_number: "SA-2025-LA-003",
      status: "Active",
      funding_source: "Iowa Medicaid HCBS Waiver",
      created_at: ts(2025, 4, 15),
      updated_at: ts(2025, 5, 20),
    },
  ];

  // ────────────────────────────────────────────────────────────────────────────
  // WRITE TO FIRESTORE
  // ────────────────────────────────────────────────────────────────────────────
  const batch = db.batch();

  // Progress notes
  let pnCount = 0;
  for (const note of progressNotes) {
    const ref = db.collection("progress_notes").doc();
    batch.set(ref, note);
    pnCount++;
  }
  console.log(`📝 Queued ${pnCount} progress notes`);

  // Contact notes
  let cnCount = 0;
  for (const note of contactNotes) {
    const ref = db.collection("contact_notes").doc();
    batch.set(ref, note);
    cnCount++;
  }
  console.log(`📋 Queued ${cnCount} contact notes`);

  // Visit summaries
  let vsCount = 0;
  for (const visit of visitSummaries) {
    const ref = db.collection("visit_summaries").doc();
    batch.set(ref, visit);
    vsCount++;
  }
  console.log(`🏠 Queued ${vsCount} visit summaries`);

  // Care plans
  let cpCount = 0;
  for (const plan of carePlans) {
    const ref = db.collection("care_plans").doc();
    batch.set(ref, plan);
    cpCount++;
  }
  console.log(`📊 Queued ${cpCount} care plans`);

  // Referrals
  let refCount = 0;
  for (const referral of referrals) {
    const ref = db.collection("referrals").doc();
    batch.set(ref, referral);
    refCount++;
  }
  console.log(`🔗 Queued ${refCount} referrals`);

  // Eligibility verifications
  let evCount = 0;
  for (const ev of eligibilityVerifications) {
    const ref = db.collection("eligibility_verifications").doc();
    batch.set(ref, ev);
    evCount++;
  }
  console.log(`✅ Queued ${evCount} eligibility verifications`);

  // Monitoring forms
  let mfCount = 0;
  for (const form of monitoringForms) {
    const ref = db.collection("monitoring_forms").doc();
    batch.set(ref, form);
    mfCount++;
  }
  console.log(`📊 Queued ${mfCount} monitoring forms`);

  // Service authorizations
  let saCount = 0;
  for (const auth of serviceAuthorizations) {
    const ref = db.collection("service_authorizations").doc();
    batch.set(ref, auth);
    saCount++;
  }
  console.log(`🔑 Queued ${saCount} service authorizations`);

  console.log("\n⏳ Committing batch...");
  await batch.commit();

  console.log("\n✅ All done! Lisa Anderson's chart is now fully populated.");
  console.log(`   Individual Firestore ID: ${lisaId}`);
  console.log(`   Progress Notes    : ${pnCount}`);
  console.log(`   Contact Notes     : ${cnCount}`);
  console.log(`   Visit Summaries   : ${vsCount}`);
  console.log(`   Care Plans        : ${cpCount}`);
  console.log(`   Referrals         : ${refCount}`);
  console.log(`   Eligibility       : ${evCount}`);
  console.log(`   Monitoring Forms  : ${mfCount}`);
  console.log(`   Service Auths     : ${saCount}`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
