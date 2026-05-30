/**
 * seed-demo-data.js
 * CaseManagement.AI — Full Demo Data Seeder
 *
 * Seeds Modules 1-9 for:
 *   Joseph Brown  (ind-001) — org: demo-org-001
 *   Lisa Anderson (ind-010) — org: demo-org-001
 *
 * ADDITIVE ONLY — never overwrites existing documents.
 * Run: node seed-demo-data.js
 */

const https = require('https');
const path  = require('path');

// ── Config ──────────────────────────────────────────────────────────────────

const PROJECT  = 'casemanagement-ai';
const DB       = '(default)';
const ORG_ID   = 'demo-org-001';

const JOE_ID   = 'ind-001';   // Joseph Brown
const LISA_ID  = 'ind-010';   // Lisa Anderson

const CM_NAME  = 'Kathy Adams';
const CM_UID   = 'TzFYFn1unMMNjVZoJqxyYP6S8m62';  // Kathy Martinez / Adams

// ── Auth ────────────────────────────────────────────────────────────────────

async function getToken() {
  try {
    const tokenFile = path.join(process.env.HOME, '.config', 'configstore', 'firebase-tools.json');
    const cfg = require(tokenFile);
    const t = cfg.tokens?.access_token;
    if (t) return t;
  } catch (_) {}
  console.error('ERROR: No Firebase CLI token found. Run: npx firebase-tools login');
  process.exit(1);
}

// ── Firestore REST helpers ───────────────────────────────────────────────────

function fsValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean')  return { booleanValue: v };
  if (typeof v === 'number')   return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string')   return { stringValue: v };
  if (v instanceof Date)       return { timestampValue: v.toISOString() };
  if (Array.isArray(v))        return { arrayValue: { values: v.map(fsValue) } };
  if (typeof v === 'object')   return { mapValue: { fields: objToFields(v) } };
  return { stringValue: String(v) };
}

function objToFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = fsValue(v);
  }
  return fields;
}

function request(method, urlPath, token, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'firestore.googleapis.com',
      path: urlPath,
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (_) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function addDoc(collectionName, fields, token) {
  const url = `/v1/projects/${PROJECT}/databases/${DB}/documents/${collectionName}`;
  const now = new Date().toISOString();
  const withMeta = {
    ...fields,
    createdAt: now,
    updatedAt: now,
    organizationId: ORG_ID,
  };
  const body = { fields: objToFields(withMeta) };
  const result = await request('POST', url, token, body);
  if (result.error) {
    console.error(`  ✗ addDoc(${collectionName}):`, result.error.message);
    return null;
  }
  const id = result.name?.split('/').pop();
  return id;
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function dateStr(year, month, day) {
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

// ════════════════════════════════════════════════════════════════════════════
// MODULE 1 — CONTACT NOTES
// ════════════════════════════════════════════════════════════════════════════

const JOE_CONTACT_NOTES = [
  {
    date: '2025-05-20', start: '10:00', end: '11:00',
    activityType: 'Face-to-face Visit', contactType: 'In-person',
    billable: true, status: 'Submitted',
    purpose: 'Annual ISP review preparation. Visited Joseph at his residence to review current goals, services, and discuss upcoming annual plan renewal.',
    background: 'Joseph has been receiving Day Habilitation services 4 days/week. Mother Linda Brown was present.',
    present: 'Joseph Brown, Linda Brown (mother), Kathy Adams (CM)',
    details: 'Reviewed current ISP goals. Joseph expressed satisfaction with his Day Hab program and mentioned interest in exploring part-time employment. Discussed employment exploration goal for upcoming annual plan. Joseph stated he prefers warehouse or structured outdoor work. Linda noted behavioral improvements at home over past 3 months.',
    issues: 'Employment exploration not yet added to ISP — to be addressed at annual meeting.',
    nextSteps: 'Schedule annual ISP meeting. Contact supported employment provider for pre-assessment information.',
    authorizationNumber: 'SA-2026-001',
  },
  {
    date: '2025-06-10', start: '14:00', end: '14:15',
    activityType: 'Phone Check-in', contactType: 'Phone',
    billable: true, status: 'Submitted',
    purpose: 'Routine check-in following Day Hab provider quarterly report.',
    present: 'Joseph Brown, Kathy Adams (CM)',
    details: 'Called Joseph to discuss quarterly progress report received from Carroll County Day Services. Provider reports Joseph has been attending consistently, participating in group activities, and showing positive peer interactions. Joseph confirmed he enjoys the program. No concerns noted.',
    issues: 'None.',
    nextSteps: 'File quarterly report. Schedule next face-to-face visit.',
    authorizationNumber: 'SA-2026-001',
  },
  {
    date: '2025-07-15', start: '11:00', end: '12:00',
    activityType: 'Care Coordination', contactType: 'In-person',
    billable: true, status: 'Submitted',
    purpose: 'Observation of Day Habilitation program and community integration activity.',
    present: 'Joseph Brown, Day Hab staff Maria Torres, Kathy Adams (CM)',
    details: "Observed Joseph at Carroll County Day Services during community outing to Westminster Farmers Market. Joseph navigated the market independently with minimal prompting. He purchased a snack using his own money and initiated a conversation with a vendor. Staff reported Joseph has been a positive peer model for newer program participants.",
    issues: 'None. Joseph doing well.',
    nextSteps: 'Document community integration progress in ISP.',
    authorizationNumber: 'SA-2026-001',
  },
  {
    date: '2025-08-05', start: '14:30', end: '14:50',
    activityType: 'Phone Check-in', contactType: 'Phone',
    billable: false, nonBillableReason: 'Collateral contact — under 15 minutes', status: 'Submitted',
    purpose: 'Collateral contact with mother regarding behavioral changes at home.',
    present: 'Linda Brown (mother), Kathy Adams (CM)',
    details: "Linda called to report that Joseph has been more withdrawn at home over the past two weeks. She noted he has been sleeping more than usual and seems less interested in his usual hobbies. No incidents reported. Linda does not believe the Day Hab program is contributing — she suspects it may be related to a neighbor moving away who Joseph was friendly with.",
    issues: 'Possible social/emotional adjustment. Monitor for continued changes.',
    nextSteps: 'Flag for behavioral support review at next team meeting. Check in with Day Hab staff.',
  },
  {
    date: '2025-09-18', start: '13:00', end: '14:00',
    activityType: 'Face-to-face Visit', contactType: 'In-person',
    billable: true, status: 'Submitted',
    purpose: 'Quarterly face-to-face contact. ISP goal progress review.',
    present: 'Joseph Brown, Linda Brown, Kathy Adams (CM)',
    details: "Joseph appeared in good spirits and engaged well during the visit. Linda reported the withdrawal from August has resolved — Joseph reconnected with a friend from his Day Hab program outside of scheduled activities. Reviewed ISP goals: Community Integration goal On Track (attended 3 community events this quarter). Employment Exploration goal discussed — Joseph confirmed strong interest. Provided information on BridgeWorks Vocational Training program.",
    issues: 'MA redetermination due in 60 days. Begin renewal process.',
    nextSteps: 'Contact BridgeWorks for referral intake. Begin MA redetermination.',
    authorizationNumber: 'SA-2026-001',
  },
  {
    date: '2025-10-22', start: '09:30', end: '10:30',
    activityType: 'Face-to-face Visit', contactType: 'In-person',
    billable: true, status: 'Submitted',
    purpose: 'MA redetermination support. Assist Joseph and Linda with Medicaid renewal paperwork.',
    present: 'Joseph Brown, Linda Brown, Kathy Adams (CM)',
    details: "Met at agency office to complete Medicaid renewal documentation. Verified income information, current living arrangement, and program enrollment. Joseph continues to reside with mother. Documents submitted online via FSSA portal during meeting. Confirmation number obtained. Linda expressed relief that the renewal is complete.",
    issues: 'Awaiting Medicaid confirmation letter — expected within 30 days.',
    nextSteps: 'Monitor MA status. Update eligibility record when confirmation received.',
    authorizationNumber: 'SA-2026-001',
  },
  {
    date: '2025-11-14', start: '15:00', end: '15:15',
    activityType: 'Phone Check-in', contactType: 'Phone',
    billable: true, status: 'Submitted',
    purpose: 'Medicaid renewal status check. Confirm active MA status.',
    present: 'Joseph Brown, Kathy Adams (CM)',
    details: "Called FSSA portal — confirmed Joseph's Medicaid renewal approved. Active status confirmed through 04/30/2027. Called Joseph to share news. He was pleased. Updated eligibility verification record in system.",
    issues: 'None.',
    nextSteps: 'Upload MA confirmation. Update individual profile.',
    authorizationNumber: 'SA-2026-001',
  },
  {
    date: '2025-12-10', start: '10:00', end: '11:00',
    activityType: 'Face-to-face Visit', contactType: 'In-person',
    billable: true, status: 'Submitted',
    purpose: 'End-of-year check-in. Holiday wellness visit.',
    present: 'Joseph Brown, Linda Brown, Kathy Adams (CM)',
    details: "Holiday season visit. Joseph in very good spirits. Family celebrated Thanksgiving last month — Joseph helped prepare food for the first time this year, which he was proud of. Reviewed service schedule for December. Day Hab closed Dec 24–Jan 1. Confirmed Joseph has a backup plan to stay with his aunt during those days. No concerns. Services all current.",
    issues: 'None.',
    nextSteps: 'Confirm January schedule. Begin ISP renewal preparation.',
    authorizationNumber: 'SA-2026-001',
  },
  {
    date: '2026-01-20', start: '14:00', end: '14:47',
    activityType: 'Team Meeting', contactType: 'Video',
    billable: true, status: 'Submitted',
    purpose: 'ISP renewal preparation meeting. Annual plan pre-meeting discussion.',
    present: 'Joseph Brown, Linda Brown, Kathy Adams (CM) — via video call',
    details: "Video call to prepare for upcoming annual ISP meeting. Reviewed current goals and progress. Joseph articulated clearly that employment exploration is his top priority for the new plan year. Linda requested that transportation to appointments be addressed in the new plan. Discussed BridgeWorks referral status — intake scheduled for Feb 5.",
    issues: 'ISP renewal due 08/31/2026. Begin early preparation.',
    nextSteps: 'Schedule ISP annual meeting. Confirm BridgeWorks intake appointment.',
    authorizationNumber: 'SA-2026-001',
  },
  {
    date: '2026-02-18', start: '11:00', end: '11:20',
    activityType: 'Care Coordination', contactType: 'Phone',
    billable: true, status: 'Submitted',
    purpose: 'Collateral contact with Carroll County Employment Services following referral submission.',
    present: 'Kathy Adams (CM), Marcus Reid (Employment Specialist, Carroll County Employment Services)',
    details: "Called Carroll County Employment Services to confirm receipt of referral for Joseph Brown. Marcus Reid confirmed referral received and intake scheduled for March 5. He reviewed Joseph's profile and noted his warehouse interest is a strong fit for current openings in the Westminster area. Provided information on the 90-day vocational assessment process.",
    issues: 'None.',
    nextSteps: 'Confirm Joseph attends March 5 intake appointment.',
    authorizationNumber: 'SA-2026-001',
  },
  {
    date: '2026-03-25', start: '13:00', end: '14:00',
    activityType: 'Face-to-face Visit', contactType: 'In-person',
    billable: true, status: 'Submitted',
    purpose: 'Quarterly face-to-face. Employment services update and ISP goal progress review.',
    present: 'Joseph Brown, Linda Brown, Kathy Adams (CM)',
    details: "Joseph attended March 5 intake at Carroll County Employment Services. He reported the meeting went well and he felt comfortable with the employment specialist. A vocational interest assessment is scheduled for April 10. Community Integration goal: On Track — Joseph attended 2 community events in Q1 including a community cleanup and the Westminster Spring Festival. Behavioral support goal remains Not Started — discussed adding this to ISP at annual meeting.",
    issues: 'Behavioral support coordination goal in ISP has not been actioned. Needs team discussion.',
    nextSteps: 'Follow up on April 10 vocational assessment. Prepare behavioral support section for annual ISP.',
    authorizationNumber: 'SA-2026-001',
  },
  {
    date: '2026-04-27', start: '14:00', end: '14:47',
    activityType: 'Face-to-face Visit', contactType: 'In-person',
    billable: true, status: 'Submitted',
    purpose: 'Quarterly check-in and service review. Employment progress update.',
    present: 'Joseph Brown, Linda Brown, Kathy Adams (CM)',
    details: "Joseph completed vocational assessment at Carroll County Employment Services on April 10. Marcus Reid will provide written report by May 15. Joseph is excited about the process and mentioned a specific warehouse opportunity he saw on the job board. Linda reported behavioral changes at home — Joseph has been more withdrawn recently, possibly related to some staffing changes at Day Hab. Reviewed all active services — all current. Authorization SA-2026-001 has 18 of 40 units remaining.",
    issues: 'Behavioral changes at home — monitor. Behavioral support coordination still not actioned.',
    nextSteps: 'Add behavioral support goal to upcoming ISP. Follow up on vocational report. Schedule ISP annual meeting.',
    authorizationNumber: 'SA-2026-001',
  },
];

const LISA_CONTACT_NOTES = [
  {
    date: '2025-05-12', start: '10:00', end: '11:00',
    activityType: 'Face-to-face Visit', contactType: 'In-person',
    billable: true, status: 'Submitted',
    purpose: 'Annual ISP preparation. Home visit to review goals and discuss upcoming plan renewal.',
    present: 'Lisa Anderson, Sandra Anderson (sister/guardian), Kathy Adams (CM)',
    details: "Lisa was calm and engaged during the visit. Sandra was present and provided background on Lisa's recent health appointment — her primary care physician adjusted her anxiety medication in March. Sandra reports Lisa has been less anxious overall since the adjustment. Reviewed current ISP: Community Connections goal On Track. Health Management goal needs update to reflect new medication protocol. Lisa stated she wants to take a pottery class at the Carroll County Arts Center — added to plan.",
    issues: 'None noted.',
    nextSteps: 'Add pottery class goal. Update health section of ISP.',
    authorizationNumber: 'SA-2026-010',
  },
  {
    date: '2025-06-18', start: '14:00', end: '14:15',
    activityType: 'Phone Check-in', contactType: 'Phone',
    billable: true, status: 'Submitted',
    purpose: 'Check-in following medical appointment.',
    present: 'Sandra Anderson (guardian), Kathy Adams (CM)',
    details: "Called Sandra to follow up on Lisa's scheduled psychiatry appointment. Sandra confirmed Lisa attended on June 15. Psychiatrist maintained current medication — no changes needed. Lisa tolerated the appointment well. No concerns.",
    issues: 'None.',
    nextSteps: 'Document in health record. Next psychiatry appointment September.',
    authorizationNumber: 'SA-2026-010',
  },
  {
    date: '2025-07-22', start: '11:00', end: '12:00',
    activityType: 'Care Coordination', contactType: 'In-person',
    billable: true, status: 'Submitted',
    purpose: 'Community integration observation — pottery class.',
    present: 'Lisa Anderson, Kathy Adams (CM)',
    details: "Observed Lisa at her pottery class at Carroll County Arts Center. Lisa has been attending weekly for 6 weeks. The instructor noted Lisa is one of the most consistent students and has shown real talent for hand-building. Lisa made a bowl during the session and was visibly proud of her work. She introduced the CM to two classmates by name — demonstrating positive social connection in a natural community setting. No support staff present during the class — Lisa attends independently with transportation from Sandra.",
    issues: 'None.',
    nextSteps: 'Document community integration progress.',
    authorizationNumber: 'SA-2026-010',
  },
  {
    date: '2025-08-14', start: '10:00', end: '11:00',
    activityType: 'Face-to-face Visit', contactType: 'In-person',
    billable: true, status: 'Submitted',
    purpose: 'Quarterly face-to-face. Goal progress review.',
    present: 'Lisa Anderson, Sandra Anderson, Kathy Adams (CM)',
    details: "Lisa in good health and positive affect during visit. Anxiety symptoms well-controlled per Sandra. Pottery class goal: On Track — attending weekly, completed 2 finished pieces. Health Management goal: On Track — maintaining medication schedule and attending all scheduled appointments. Discussed adding a volunteer goal to the ISP. Lisa expressed interest in volunteering at the local animal shelter — she loves animals and previously had a dog named Biscuit. Sandra supportive of the idea.",
    issues: 'None.',
    nextSteps: 'Research Carroll County Animal Shelter volunteer program. Add to ISP at next update.',
    authorizationNumber: 'SA-2026-010',
  },
  {
    date: '2025-09-10', start: '15:30', end: '15:45',
    activityType: 'Phone Check-in', contactType: 'Phone',
    billable: false, nonBillableReason: 'Collateral contact — under 15 minutes', status: 'Submitted',
    purpose: 'Collateral — psychiatry appointment follow-up.',
    present: 'Sandra Anderson (guardian), Kathy Adams (CM)',
    details: "Called Sandra following Lisa's September 9 psychiatry appointment. Appointment went well. Medication remains unchanged. Psychiatrist noted Lisa's anxiety scores have improved significantly over the past 6 months. Next appointment scheduled December.",
    issues: 'None.',
    nextSteps: 'Update health record.',
  },
  {
    date: '2025-10-08', start: '10:00', end: '11:00',
    activityType: 'Face-to-face Visit', contactType: 'In-person',
    billable: true, status: 'Submitted',
    purpose: 'ISP mid-year review. Service satisfaction and goal progress.',
    present: 'Lisa Anderson, Sandra Anderson, Kathy Adams (CM)',
    details: "Mid-year ISP review completed. All three goals On Track: 1. Community Connections (pottery) — Lisa received recognition certificate from Arts Center for attendance. 2. Health Management — all appointments current, medication stable. 3. Volunteer goal — approved for Carroll County Animal Shelter. Lisa attended first orientation session September 28. She was paired with the small dog room and loves it. Sandra reports Lisa talks about the dogs every day. No concerns across any service area.",
    issues: 'None.',
    nextSteps: 'Document mid-year review. Schedule annual meeting.',
    authorizationNumber: 'SA-2026-010',
  },
  {
    date: '2025-11-20', start: '14:00', end: '14:47',
    activityType: 'Care Coordination', contactType: 'In-person',
    billable: true, status: 'Submitted',
    purpose: 'Observation at animal shelter volunteer activity.',
    present: 'Lisa Anderson, shelter staff James Ko, Kathy Adams (CM)',
    details: "Observed Lisa at her Wednesday volunteer shift at Carroll County Animal Shelter. James (volunteer coordinator) shared that Lisa is one of their most reliable volunteers — she has not missed a single Wednesday in 8 weeks. Lisa handled 3 dogs during the observation including walking them in the yard. She was confident, gentle, and clearly comfortable in the role. James mentioned they are considering Lisa for a lead volunteer role in the new year.",
    issues: 'None.',
    nextSteps: 'Document volunteer progress. Add to ISP annual update.',
    authorizationNumber: 'SA-2026-010',
  },
  {
    date: '2025-12-16', start: '10:00', end: '11:00',
    activityType: 'Face-to-face Visit', contactType: 'In-person',
    billable: true, status: 'Submitted',
    purpose: 'Year-end wellness visit. Holiday check-in.',
    present: 'Lisa Anderson, Sandra Anderson, Kathy Adams (CM)',
    details: "Lisa in excellent spirits. She showed CM photos on her tablet of dogs she has cared for at the shelter — has named them all. Sandra reports this is the best year Lisa has had in terms of mood stability and community involvement. MA status current — renewal not due until March 2027. Services all current. No concerns.",
    issues: 'None.',
    nextSteps: 'Begin annual ISP preparation in January.',
    authorizationNumber: 'SA-2026-010',
  },
  {
    date: '2026-01-14', start: '11:00', end: '11:15',
    activityType: 'Phone Check-in', contactType: 'Phone',
    billable: true, status: 'Submitted',
    purpose: 'Annual ISP planning call.',
    present: 'Sandra Anderson (guardian), Kathy Adams (CM)',
    details: "Called Sandra to begin planning for Lisa's annual ISP renewal due in April. Sandra confirmed availability for February annual meeting. Discussed adding a new goal around independent meal preparation — Lisa has been helping Sandra cook at home and wants to learn to prepare simple meals independently. Sandra supportive. Will add to agenda.",
    issues: 'None.',
    nextSteps: 'Schedule annual ISP meeting for February.',
    authorizationNumber: 'SA-2026-010',
  },
  {
    date: '2026-02-24', start: '09:30', end: '10:30',
    activityType: 'Team Meeting', contactType: 'In-person',
    billable: true, status: 'Submitted',
    purpose: 'Annual ISP meeting. Plan renewal and goal setting.',
    present: 'Lisa Anderson, Sandra Anderson (guardian), James Ko (shelter volunteer coordinator), Kathy Adams (CM)',
    details: "Annual ISP meeting completed. James Ko attended as community support representative. New ISP goals for 2026-2027: 1. Continue pottery class — expand to advanced session. 2. Maintain animal shelter volunteer — pursue lead volunteer role. 3. Health Management — maintain all health appointments. 4. Independent meal preparation — learn to prepare 3 simple meals independently by August 2026. All team members signed. ISP distributed.",
    issues: 'None.',
    nextSteps: 'Upload signed ISP. Submit updated services for authorization.',
    authorizationNumber: 'SA-2026-010',
  },
  {
    date: '2026-03-19', start: '10:00', end: '11:00',
    activityType: 'Face-to-face Visit', contactType: 'In-person',
    billable: true, status: 'Submitted',
    purpose: 'Q1 face-to-face. New ISP implementation check-in.',
    present: 'Lisa Anderson, Sandra Anderson, Kathy Adams (CM)',
    details: "First quarterly visit under new 2026-2027 ISP. All goals initiated. Pottery: enrolled in advanced session starting April 7. Shelter: James confirmed lead volunteer role begins April 1 — Lisa will oversee the small dog room on Wednesdays. Meal prep: Sandra has been working with Lisa on scrambled eggs and pasta. Lisa successfully made pasta independently twice this month. Health: March psychiatry appointment completed — stable.",
    issues: 'None.',
    nextSteps: 'Document Q1 progress. Follow up on April pottery advanced session start.',
    authorizationNumber: 'SA-2026-010',
  },
  {
    date: '2026-04-30', start: '10:00', end: '11:00',
    activityType: 'Face-to-face Visit', contactType: 'In-person',
    billable: true, status: 'Submitted',
    purpose: 'Q2 face-to-face. Goal progress and service review.',
    present: 'Lisa Anderson, Sandra Anderson, Kathy Adams (CM)',
    details: "Lisa doing extremely well. Advanced pottery: attended first two sessions — instructor reports Lisa is the most experienced student in the class. Shelter lead volunteer: Lisa has been training a new volunteer named Marcus on the small dog room routines — Sandra says Lisa came home beaming after the first training session. Meal prep: independently prepared 3 meals this month — pasta, eggs, and a simple sandwich wrap. Health: All current. No concerns across any area.",
    issues: 'None.',
    nextSteps: 'Document excellent progress. ISP annual renewal not due until April 2027.',
    authorizationNumber: 'SA-2026-010',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// MODULE 2 — PROGRESS NOTES
// ════════════════════════════════════════════════════════════════════════════

const JOE_PROGRESS_NOTES = [
  {
    progressDate: '2025-09-18', startTime: '13:00', endTime: '14:00',
    activityType: 'Case Management', contactType: 'Home Visit',
    isBillable: true, status: 'signed',
    purposeOfActivity: 'Quarterly home visit. ISP goal review and service coordination.',
    goalsProgress: [
      { goalId: 'g1', goalText: 'Community Integration', progressStatus: 'progressing', narrative: 'Joseph attended 3 community events this quarter. On track with goal objective.' },
      { goalId: 'g2', goalText: 'Employment Exploration', progressStatus: 'no_change', narrative: 'Goal discussed — not yet actioned. Referral to employment services planned.' },
    ],
    additionalObservations: "Mother reports behavioral improvement. Joseph's social network at Day Hab has expanded.",
    nextSteps: 'Contact BridgeWorks for employment referral.',
  },
  {
    progressDate: '2025-11-14', startTime: '15:00', endTime: '15:15',
    activityType: 'Case Management', contactType: 'Telephone',
    isBillable: true, status: 'signed',
    purposeOfActivity: 'MA renewal status confirmation.',
    goalsProgress: [
      { goalId: 'g3', goalText: 'Health and Wellness', progressStatus: 'progressing', narrative: 'Medicaid renewal confirmed active through 04/30/2027. No coverage gap.' },
    ],
    additionalObservations: 'MA status verified and updated in system.',
    nextSteps: 'Update eligibility record. Upload MA confirmation.',
  },
  {
    progressDate: '2025-12-10', startTime: '10:00', endTime: '11:00',
    activityType: 'Case Management', contactType: 'Home Visit',
    isBillable: true, status: 'signed',
    purposeOfActivity: 'Year-end home visit. Holiday wellness check.',
    goalsProgress: [
      { goalId: 'g1', goalText: 'Community Integration', progressStatus: 'progressing', narrative: 'Joseph active in community. Attended holiday events with Day Hab group.' },
      { goalId: 'g2', goalText: 'Employment Exploration', progressStatus: 'no_change', narrative: 'BridgeWorks referral submitted — awaiting intake.' },
    ],
    additionalObservations: 'Family in excellent spirits. Joseph helped cook Thanksgiving meal for first time.',
    nextSteps: 'Confirm BridgeWorks intake date in January.',
  },
  {
    progressDate: '2026-01-20', startTime: '14:00', endTime: '14:47',
    activityType: 'Care Plan Review', contactType: 'Telehealth',
    isBillable: true, status: 'signed',
    purposeOfActivity: 'ISP annual renewal preparation meeting.',
    goalsProgress: [
      { goalId: 'g2', goalText: 'Employment Exploration', progressStatus: 'progressing', narrative: 'BridgeWorks intake scheduled Feb 5. Joseph engaged and motivated.' },
      { goalId: 'g1', goalText: 'Community Integration', progressStatus: 'progressing', narrative: 'Joseph attended 2 events in December. Continuing strong participation.' },
    ],
    additionalObservations: 'Joseph articulated employment as top priority for new plan year. Video call went smoothly.',
    nextSteps: 'Confirm Feb 5 intake. Schedule annual ISP meeting.',
  },
  {
    progressDate: '2026-02-18', startTime: '11:00', endTime: '11:20',
    activityType: 'Provider Coordination', contactType: 'Telephone',
    isBillable: true, status: 'signed',
    purposeOfActivity: 'Collateral with employment services provider.',
    goalsProgress: [
      { goalId: 'g2', goalText: 'Employment Exploration', progressStatus: 'progressing', narrative: 'Referral confirmed with Carroll County Employment Services. Intake March 5.' },
    ],
    additionalObservations: 'Marcus Reid (Employment Specialist) reviewed Joseph profile positively. Warehouse interest is strong fit.',
    nextSteps: 'Confirm Joseph attends March 5 appointment.',
  },
  {
    progressDate: '2026-03-25', startTime: '13:00', endTime: '14:00',
    activityType: 'Case Management', contactType: 'Home Visit',
    isBillable: true, status: 'signed',
    purposeOfActivity: 'Quarterly visit. Employment services update and goal review.',
    goalsProgress: [
      { goalId: 'g2', goalText: 'Employment Exploration', progressStatus: 'progressing', narrative: 'Attended intake March 5. Vocational assessment scheduled April 10.' },
      { goalId: 'g1', goalText: 'Community Integration', progressStatus: 'progressing', narrative: 'Attended 2 community events Q1. On track.' },
      { goalId: 'g4', goalText: 'Behavioral Support Coordination', progressStatus: 'no_change', narrative: 'Goal not yet actioned. To be addressed at annual ISP.' },
    ],
    additionalObservations: 'Joseph most motivated in 2 years per Linda. Annual ISP meeting must be scheduled immediately.',
    nextSteps: 'Annual ISP meeting needed. Follow up April 10 assessment.',
  },
  {
    progressDate: '2026-04-10', startTime: '09:00', endTime: '09:30',
    activityType: 'Community Integration', contactType: 'Community Visit',
    isBillable: true, status: 'signed',
    purposeOfActivity: 'Support at vocational interest assessment appointment.',
    goalsProgress: [
      { goalId: 'g2', goalText: 'Employment Exploration', progressStatus: 'progressing', narrative: 'Vocational assessment completed at Carroll County Employment Services. Joseph engaged fully. Report expected May 15. Interest in warehouse and outdoor work confirmed.' },
    ],
    additionalObservations: 'Assessment lasted approximately 30 minutes. Joseph was calm and cooperative throughout.',
    nextSteps: 'Follow up on report. Share results with team.',
  },
  {
    progressDate: '2026-04-27', startTime: '14:00', endTime: '14:47',
    activityType: 'Case Management', contactType: 'Home Visit',
    isBillable: true, status: 'signed',
    purposeOfActivity: 'Quarterly visit and comprehensive service review.',
    goalsProgress: [
      { goalId: 'g2', goalText: 'Employment Exploration', progressStatus: 'progressing', narrative: 'Vocational report pending May 15. Joseph motivated and watching job board.' },
      { goalId: 'g1', goalText: 'Community Integration', progressStatus: 'progressing', narrative: 'Attended 3 community events this quarter. On track.' },
      { goalId: 'g4', goalText: 'Behavioral Support Coordination', progressStatus: 'no_change', narrative: 'Linda reports some withdrawal — behavioral support to be added to ISP.' },
    ],
    additionalObservations: 'Authorization SA-2026-001 has 18 of 40 units remaining. Units on track for authorization period.',
    nextSteps: 'Add behavioral support to ISP. Schedule annual meeting. Follow up vocational report.',
  },
];

const LISA_PROGRESS_NOTES = [
  {
    progressDate: '2025-05-12', startTime: '10:00', endTime: '11:00',
    activityType: 'Case Management', contactType: 'Home Visit',
    isBillable: true, status: 'signed',
    purposeOfActivity: 'Annual ISP preparation. Home visit to review goals and plan renewal.',
    goalsProgress: [
      { goalId: 'g1', goalText: 'Community Connections', progressStatus: 'progressing', narrative: 'Lisa engaged in community activities. Pottery class goal added to plan.' },
      { goalId: 'g2', goalText: 'Health Management', progressStatus: 'progressing', narrative: 'Medication adjusted in March — anxiety symptoms improving per Sandra.' },
    ],
    additionalObservations: 'Lisa calm and engaged. Pottery class goal added to upcoming ISP.',
    nextSteps: 'Add pottery class goal. Update health section of ISP.',
  },
  {
    progressDate: '2025-07-22', startTime: '11:00', endTime: '12:00',
    activityType: 'Community Integration', contactType: 'Community Visit',
    isBillable: true, status: 'signed',
    purposeOfActivity: 'Community integration observation — pottery class at Carroll County Arts Center.',
    goalsProgress: [
      { goalId: 'g1', goalText: 'Community Connections', progressStatus: 'progressing', narrative: 'Lisa attending pottery weekly for 6 weeks. Instructor notes strong talent and consistency. Social connections forming with classmates.' },
    ],
    additionalObservations: 'Lisa attends class independently with transportation from Sandra. No support staff needed.',
    nextSteps: 'Document community integration progress.',
  },
  {
    progressDate: '2025-08-14', startTime: '10:00', endTime: '11:00',
    activityType: 'Case Management', contactType: 'Home Visit',
    isBillable: true, status: 'signed',
    purposeOfActivity: 'Quarterly face-to-face. Goal progress review.',
    goalsProgress: [
      { goalId: 'g1', goalText: 'Community Connections (Pottery)', progressStatus: 'progressing', narrative: 'Attending weekly, completed 2 finished pieces. Strong progress.' },
      { goalId: 'g2', goalText: 'Health Management', progressStatus: 'progressing', narrative: 'Medication schedule maintained. All scheduled appointments current. Anxiety well-controlled.' },
    ],
    additionalObservations: 'Discussed adding volunteer goal — animal shelter. Lisa enthusiastically agreed.',
    nextSteps: 'Research Carroll County Animal Shelter volunteer program. Add to ISP at next update.',
  },
  {
    progressDate: '2025-10-08', startTime: '10:00', endTime: '11:00',
    activityType: 'Care Plan Review', contactType: 'Home Visit',
    isBillable: true, status: 'signed',
    purposeOfActivity: 'ISP mid-year review. Service satisfaction and goal progress.',
    goalsProgress: [
      { goalId: 'g1', goalText: 'Community Connections (Pottery)', progressStatus: 'progressing', narrative: 'Received Arts Center recognition certificate. Consistent attendance. Strong social engagement.' },
      { goalId: 'g2', goalText: 'Health Management', progressStatus: 'progressing', narrative: 'All appointments current, medication stable. Anxiety scores improved per psychiatrist.' },
      { goalId: 'g3', goalText: 'Volunteer — Animal Shelter', progressStatus: 'progressing', narrative: 'Approved for Carroll County Animal Shelter. First orientation September 28 completed. Assigned to small dog room.' },
    ],
    additionalObservations: 'Mid-year ISP review complete. All goals On Track. No concerns.',
    nextSteps: 'Document mid-year review. Schedule annual meeting.',
  },
  {
    progressDate: '2025-11-20', startTime: '14:00', endTime: '14:47',
    activityType: 'Community Integration', contactType: 'Community Visit',
    isBillable: true, status: 'signed',
    purposeOfActivity: 'Observation at animal shelter volunteer activity.',
    goalsProgress: [
      { goalId: 'g3', goalText: 'Volunteer — Animal Shelter', progressStatus: 'progressing', narrative: 'James Ko (coordinator) confirms Lisa is most reliable volunteer — no missed shifts in 8 weeks. Lead volunteer role being considered for new year.' },
    ],
    additionalObservations: 'Lisa confident and gentle with animals. Handles 3 dogs independently. Natural fit for the role.',
    nextSteps: 'Document volunteer progress. Add to ISP annual update.',
  },
  {
    progressDate: '2025-12-16', startTime: '10:00', endTime: '11:00',
    activityType: 'Case Management', contactType: 'Home Visit',
    isBillable: true, status: 'signed',
    purposeOfActivity: 'Year-end wellness visit. Holiday check-in.',
    goalsProgress: [
      { goalId: 'g1', goalText: 'Community Connections', progressStatus: 'progressing', narrative: 'Pottery continuing. Community engagement excellent.' },
      { goalId: 'g2', goalText: 'Health Management', progressStatus: 'progressing', narrative: 'MA current through March 2027. All health appointments maintained.' },
      { goalId: 'g3', goalText: 'Volunteer — Animal Shelter', progressStatus: 'progressing', narrative: 'Lisa deeply engaged with shelter role. Sandra reports best year in terms of mood and community involvement.' },
    ],
    additionalObservations: 'Lisa showed CM photos of dogs on her tablet — has named them all. Family in excellent spirits.',
    nextSteps: 'Begin annual ISP preparation in January.',
  },
  {
    progressDate: '2026-02-24', startTime: '09:30', endTime: '10:30',
    activityType: 'Care Plan Review', contactType: 'In-Person',
    isBillable: true, status: 'signed',
    purposeOfActivity: 'Annual ISP meeting. Plan renewal and goal setting for 2026-2027.',
    goalsProgress: [
      { goalId: 'g1', goalText: 'Community Connections — Advanced Pottery', progressStatus: 'progressing', narrative: 'Goal updated: enroll in advanced pottery session. Starting April 7.' },
      { goalId: 'g3', goalText: 'Volunteer — Animal Shelter Lead', progressStatus: 'progressing', narrative: 'New goal: pursue lead volunteer role. James Ko attending as community support rep.' },
      { goalId: 'g4', goalText: 'Independent Meal Preparation', progressStatus: 'no_change', narrative: 'New goal added: prepare 3 simple meals independently by August 2026.' },
    ],
    additionalObservations: 'Annual ISP meeting completed with all team members present and signing. James Ko attended. ISP distributed to all parties.',
    nextSteps: 'Upload signed ISP. Submit updated services for authorization.',
  },
  {
    progressDate: '2026-04-30', startTime: '10:00', endTime: '11:00',
    activityType: 'Case Management', contactType: 'Home Visit',
    isBillable: true, status: 'signed',
    purposeOfActivity: 'Q2 face-to-face. Goal progress and service review.',
    goalsProgress: [
      { goalId: 'g1', goalText: 'Advanced Pottery', progressStatus: 'progressing', narrative: 'Attended first two advanced sessions. Instructor reports Lisa is the most experienced student.' },
      { goalId: 'g3', goalText: 'Shelter Lead Volunteer', progressStatus: 'progressing', narrative: 'Lead role active April 1. Currently training new volunteer Marcus on small dog room routines.' },
      { goalId: 'g4', goalText: 'Independent Meal Preparation', progressStatus: 'progressing', narrative: 'Independently prepared pasta, eggs, and sandwich wrap this month — 3 meals achieved ahead of schedule.' },
      { goalId: 'g2', goalText: 'Health Management', progressStatus: 'progressing', narrative: 'All health appointments current. No concerns.' },
    ],
    additionalObservations: 'Exceptional progress across all 4 ISP goals. Lisa is a model of community integration.',
    nextSteps: 'Document excellent progress. ISP annual renewal not due until April 2027.',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// MODULE 3 — VISIT SUMMARIES
// ════════════════════════════════════════════════════════════════════════════

const JOE_VISIT_SUMMARIES = [
  {
    individual_id: JOE_ID,
    individual_name: 'Brown, Joseph',
    visit_date: '2025-09-18',
    start_time: '13:00',
    end_time: '14:00',
    location: "Carroll County, Joseph's residence — 1247 Maple Street, Westminster, MD 21157",
    othersPresent: 'Linda Brown (mother)',
    purpose_of_support: 'Quarterly face-to-face visit per waiver requirements. ISP goal progress review and service satisfaction assessment.',
    what_went_well: "Joseph is thriving in his Day Habilitation program. Attendance is consistent at 4 days per week. Community integration has been strong this quarter with 3 events attended. Joseph's mood and affect have improved since a social setback in August — he has reconnected with a friend from Day Hab.",
    what_is_not_working: 'Employment exploration goal has not been actioned. Joseph has verbalized clear interest in employment for over a year but a referral has not yet been made. This is a priority for the upcoming annual plan.',
    immediateAction: 'None. No health or safety concerns identified.',
    visitSummary: "Joseph is doing well overall. Services are being delivered as planned. The primary area for development is employment exploration, which will be the focus of the upcoming annual ISP meeting. MA redetermination was identified as needing to begin — process initiated at this visit.",
    next_steps: 'Begin MA renewal. Make employment referral. Schedule annual ISP meeting.',
    nextVisitDate: '2025-12-10',
    nextVisitLocation: "Carroll County, Joseph's residence",
    annualPlanDate: '2026-08-31',
    status: 'submitted',
    author_name: CM_NAME, author_uid: CM_UID, updated_by: CM_NAME,
  },
  {
    individual_id: JOE_ID,
    individual_name: 'Brown, Joseph',
    visit_date: '2025-12-10',
    start_time: '10:00',
    end_time: '11:00',
    location: "Carroll County, Joseph's residence",
    othersPresent: 'Linda Brown (mother)',
    purpose_of_support: 'Year-end visit. Service review and holiday wellness check.',
    what_went_well: "Excellent year overall. Community Integration goal strong — consistent event attendance. MA renewal completed and approved. Joseph is engaged in daily life, helping around the house, and looking forward to the new year. Linda reports the best year they have had as a family.",
    what_is_not_working: 'Employment referral has been submitted to BridgeWorks but intake not yet scheduled. Behavioral Support goal not started.',
    immediateAction: 'None.',
    visitSummary: 'Strong year-end visit. Joseph is stable, services are current, and the family is in a positive place. Employment referral is the key open item to close out. ISP annual renewal preparation will begin in January.',
    next_steps: 'Confirm BridgeWorks intake. Begin ISP renewal preparation January.',
    nextVisitDate: '2026-03-25',
    annualPlanDate: '2026-08-31',
    status: 'submitted',
    author_name: CM_NAME, author_uid: CM_UID, updated_by: CM_NAME,
  },
  {
    individual_id: JOE_ID,
    individual_name: 'Brown, Joseph',
    visit_date: '2026-03-25',
    start_time: '13:00',
    end_time: '14:00',
    location: "Carroll County, Joseph's residence",
    othersPresent: 'Linda Brown (mother)',
    purpose_of_support: 'Q1 quarterly visit. Employment services update, ISP goal progress review, and service review.',
    what_went_well: "Employment exploration finally actioned — Joseph attended intake March 5 and vocational assessment is scheduled. Community Integration continues strong. Day Habilitation attendance consistent. Joseph is the most motivated and engaged he has been in 2 years per Linda.",
    what_is_not_working: 'Behavioral Support Coordination goal remains Not Started. Annual ISP meeting has not yet been scheduled — overdue by 30 days. Team needs to prioritize.',
    immediateAction: 'None. No safety concerns.',
    visitSummary: 'Positive quarterly visit. Major milestone achieved — employment referral and intake completed. Joseph is excited about the vocational process. Annual ISP must be scheduled immediately.',
    next_steps: 'Schedule annual ISP meeting. Follow up April 10 assessment. Action behavioral support goal.',
    nextVisitDate: '2026-06-18',
    nextVisitLocation: "Carroll County, Joseph's residence or Day Hab site",
    annualPlanDate: '2026-08-31',
    status: 'submitted',
    author_name: CM_NAME, author_uid: CM_UID, updated_by: CM_NAME,
  },
  {
    individual_id: JOE_ID,
    individual_name: 'Brown, Joseph',
    visit_date: '2026-04-27',
    start_time: '14:00',
    end_time: '14:47',
    location: "Carroll County, Joseph's residence",
    othersPresent: 'Linda Brown (mother)',
    purpose_of_support: 'Quarterly service review. Employment progress update and comprehensive goal review.',
    what_went_well: "Vocational assessment completed. Joseph fully engaged in employment process. Community Integration goal continues strong. Authorization utilization on track — 22 of 40 units used with 5 months remaining in period.",
    what_is_not_working: "Behavioral changes at home — withdrawal reported by Linda. Possibly related to Day Hab staffing changes. Behavioral Support Coordination goal still not started — must be added to annual ISP immediately.",
    immediateAction: 'Monitor behavioral changes. Assess need for formal behavioral support. No immediate safety concern identified at this visit.',
    visitSummary: "Joseph is progressing well on employment and community goals. The behavioral concern flagged by Linda is the key issue to address going forward. Annual ISP renewal must be scheduled in May to ensure behavioral support is formally added to the plan.",
    next_steps: 'Schedule annual ISP. Add behavioral support goal. Follow up vocational report May 15.',
    nextVisitDate: '2026-07-27',
    annualPlanDate: '2026-08-31',
    status: 'submitted',
    author_name: CM_NAME, author_uid: CM_UID, updated_by: CM_NAME,
  },
];

const LISA_VISIT_SUMMARIES = [
  {
    individual_id: LISA_ID,
    individual_name: 'Anderson, Lisa',
    visit_date: '2025-08-14',
    start_time: '10:00',
    end_time: '11:00',
    location: "Carroll County, Lisa's residence",
    othersPresent: 'Sandra Anderson (sister/guardian)',
    purpose_of_support: 'Quarterly face-to-face. Goal progress review and service satisfaction assessment.',
    what_went_well: 'All ISP goals are On Track. Lisa is thriving in her pottery class, attending weekly and building real friendships. Anxiety is well-controlled under current medication. Volunteer goal approved and ready to begin at the animal shelter.',
    what_is_not_working: 'None identified. All services current. All goals progressing well.',
    immediateAction: 'None.',
    visitSummary: 'Excellent quarterly visit. Lisa is doing remarkably well across all domains — health, community integration, and social engagement. The animal shelter volunteer goal is a significant new development that reflects Lisa\'s growing confidence and independence.',
    next_steps: 'Confirm animal shelter orientation date. Update ISP to add volunteer goal formally.',
    nextVisitDate: '2025-12-16',
    annualPlanDate: '2026-04-30',
    status: 'submitted',
    author_name: CM_NAME, author_uid: CM_UID, updated_by: CM_NAME,
  },
  {
    individual_id: LISA_ID,
    individual_name: 'Anderson, Lisa',
    visit_date: '2025-12-16',
    start_time: '10:00',
    end_time: '11:00',
    location: "Carroll County, Lisa's residence",
    othersPresent: 'Sandra Anderson (sister/guardian)',
    purpose_of_support: 'Year-end wellness visit. Holiday check-in and annual ISP preview.',
    what_went_well: 'Lisa is in the best condition she has been in years. Pottery class thriving — received Arts Center recognition. Shelter volunteer role firmly established — most reliable volunteer, not missed a single Wednesday. Anxiety scores improved significantly per December psychiatry appointment.',
    what_is_not_working: 'None. All services current.',
    immediateAction: 'None.',
    visitSummary: 'Exceptional year-end visit. Lisa showed CM photos of shelter dogs she has named and cares for. Sandra reports this is the best year Lisa has had emotionally and socially. Annual ISP prep to begin in January with new goals including advanced pottery and meal prep.',
    next_steps: 'Begin ISP prep in January. Schedule annual meeting for February.',
    nextVisitDate: '2026-03-19',
    annualPlanDate: '2026-04-30',
    status: 'submitted',
    author_name: CM_NAME, author_uid: CM_UID, updated_by: CM_NAME,
  },
  {
    individual_id: LISA_ID,
    individual_name: 'Anderson, Lisa',
    visit_date: '2026-03-19',
    start_time: '10:00',
    end_time: '11:00',
    location: "Carroll County, Lisa's residence",
    othersPresent: 'Sandra Anderson (sister/guardian)',
    purpose_of_support: 'Q1 face-to-face. New ISP implementation check-in.',
    what_went_well: 'All 2026-2027 ISP goals initiated. Pottery advanced session enrolled and starting April 7. Lead volunteer role at shelter confirmed starting April 1. Meal prep goal in progress — Lisa made pasta independently twice in March. Health appointment completed and stable.',
    what_is_not_working: 'None. All goals on track at first quarterly review.',
    immediateAction: 'None.',
    visitSummary: 'Outstanding Q1 visit. Lisa has hit the ground running on all four new ISP goals. Vocational growth through her shelter lead role is particularly impressive — she is already in a position of responsibility and teaching others.',
    next_steps: 'Document Q1 progress. Follow up on April pottery advanced session start.',
    nextVisitDate: '2026-06-19',
    annualPlanDate: '2027-04-30',
    status: 'submitted',
    author_name: CM_NAME, author_uid: CM_UID, updated_by: CM_NAME,
  },
  {
    individual_id: LISA_ID,
    individual_name: 'Anderson, Lisa',
    visit_date: '2026-04-30',
    start_time: '10:00',
    end_time: '11:00',
    location: "Carroll County, Lisa's residence",
    othersPresent: 'Sandra Anderson (sister/guardian)',
    purpose_of_support: 'Q2 face-to-face. Goal progress and service review.',
    what_went_well: 'All four 2026-2027 ISP goals are progressing excellently. Advanced pottery: Lisa is the most experienced student. Shelter lead: Lisa is training a new volunteer and loving the responsibility. Meal prep: 3 meals independently — pasta, eggs, sandwich wrap — goal met ahead of schedule. Health: all current.',
    what_is_not_working: 'None. All services current. All goals progressing ahead of target.',
    immediateAction: 'None.',
    visitSummary: 'Lisa has achieved remarkable independence and community participation. Her meal prep goal is essentially met, her shelter role has expanded to include mentoring, and her pottery has advanced to the highest level available locally. Sandra is moved by how far Lisa has come.',
    next_steps: 'Document excellent progress. Consider adding new goals at next annual review. ISP annual renewal not due until April 2027.',
    nextVisitDate: '2026-07-30',
    annualPlanDate: '2027-04-30',
    status: 'submitted',
    author_name: CM_NAME, author_uid: CM_UID, updated_by: CM_NAME,
  },
];

// ════════════════════════════════════════════════════════════════════════════
// MODULE 4 — MONITORING FORMS
// ════════════════════════════════════════════════════════════════════════════

const JOE_MONITORING_FORMS = [
  {
    individual_id: JOE_ID,
    type: 'Quarterly', status: 'Submitted', active: 'Active',
    due_date: '2025-09-30', submitted_date: '2025-09-18',
    complete_date: '2025-09-18',
    updated_by: CM_NAME, author_uid: CM_UID,
    sections: {
      s2_demographics_changed: false,
      s2_living_situation_changed: false,
      s2_health_status_changed: false,
      s2_services_appropriate: true,
      s3_satisfied_with_services: true,
      s3_wants_changes: false,
      s3_provider_responsive: true,
      s3_explain: "Joseph has expressed consistently that he is happy with his Day Habilitation program and the staff there. No complaints.",
      s4_goals: [
        { goal_name: 'Community Integration', progress_status: 'On Track', progress_notes: 'Attended 3 community events this quarter. Participating in group activities at Day Hab and in the community.' },
        { goal_name: 'Employment Exploration', progress_status: 'Needs Attention', progress_notes: 'Goal not yet formally actioned. Referral to employment services planned for next quarter.' },
      ],
      s5_informed_of_rights: true,
      s5_makes_daily_choices: true,
      s5_rights_concerns: false,
      s6_health_adequately_addressed: true,
      s6_new_health_concerns: false,
      s6_recent_medical_appointments: true,
      s6_medical_appointment_notes: 'Annual physical completed August 2025. All results normal.',
      s6_risk_screening_score: 2,
      s7_backup_plan_current: true,
      s7_emergency_plan_current: true,
      s7_backup_summary: 'Primary back-up: Linda Brown (mother, same household). Emergency contact: Carroll County Services on-call line: (410) 555-0199',
      s8_incidents_since_review: false,
      s8_referrals_made: false,
      s8_pending_referrals: true,
      s8_pending_referrals_notes: 'Employment services referral pending — to be submitted this quarter.',
      s9_recommended_actions: [
        'Submit employment services referral by October 31.',
        'Begin MA redetermination process — due date approaching.',
        'Schedule next quarterly monitoring by December 31.',
        'Follow up on Day Hab quarterly provider report.',
      ],
    },
  },
  {
    individual_id: JOE_ID,
    type: 'Quarterly', status: 'Submitted', active: 'Active',
    due_date: '2026-01-31', submitted_date: '2026-01-12',
    complete_date: '2026-01-12',
    updated_by: CM_NAME, author_uid: CM_UID,
    sections: {
      s2_demographics_changed: false,
      s2_living_situation_changed: false,
      s2_health_status_changed: false,
      s2_services_appropriate: true,
      s3_satisfied_with_services: true,
      s3_wants_changes: false,
      s3_provider_responsive: true,
      s3_explain: "Joseph and Linda are very satisfied. Employment referral submitted to BridgeWorks — family is hopeful about the process.",
      s4_goals: [
        { goal_name: 'Community Integration', progress_status: 'On Track', progress_notes: 'Consistent attendance at Day Hab. Holiday events attended. Strong community presence.' },
        { goal_name: 'Employment Exploration', progress_status: 'On Track', progress_notes: 'BridgeWorks referral submitted Q4 2025. Intake scheduled Feb 5, 2026. Major progress.' },
        { goal_name: 'Health and Wellness', progress_status: 'On Track', progress_notes: 'MA renewal approved through 04/30/2027. No coverage gaps. All health appointments current.' },
      ],
      s5_informed_of_rights: true,
      s5_makes_daily_choices: true,
      s5_rights_concerns: false,
      s6_health_adequately_addressed: true,
      s6_new_health_concerns: false,
      s6_recent_medical_appointments: true,
      s6_medical_appointment_notes: 'MA renewed and confirmed active. No new medical concerns.',
      s6_risk_screening_score: 1,
      s7_backup_plan_current: true,
      s7_emergency_plan_current: true,
      s7_backup_summary: 'Primary: Linda Brown (mother). Secondary: Aunt Martha Brown. Emergency: Carroll County Services on-call.',
      s8_incidents_since_review: false,
      s8_referrals_made: true,
      s8_referrals_notes: 'Employment referral submitted to BridgeWorks October 2025. Intake Feb 5, 2026.',
      s9_recommended_actions: [
        'Confirm Joseph attends Feb 5 BridgeWorks intake appointment.',
        'Schedule annual ISP meeting for Q1 2026.',
        'Begin ISP renewal preparation.',
      ],
    },
  },
  {
    individual_id: JOE_ID,
    type: 'Quarterly', status: 'In Progress', active: 'Active',
    due_date: '2026-04-30', submitted_date: null,
    complete_date: null,
    updated_by: CM_NAME, author_uid: CM_UID,
    aiPreFilled: true,
    aiPreFilledNote: 'I pre-filled sections 1–4 based on Joseph\'s recent contact notes, visit summaries, and risk flags. All AI content is labeled. Review and edit before submitting.',
    sections: {
      s2_demographics_changed: false,
      s2_living_situation_changed: false,
      s2_health_status_changed: false,
      s2_services_appropriate: true,
      s3_satisfied_with_services: true,
      s3_wants_changes: false,
      s3_provider_responsive: true,
      s4_goals: [
        { goal_name: 'Employment Exploration', progress_status: 'On Track', progress_notes: 'Vocational assessment completed April 10. Report expected May 15. Joseph engaged and motivated.' },
        { goal_name: 'Community Integration', progress_status: 'On Track', progress_notes: 'Attended 3 community events Q1. Day Hab attendance consistent.' },
        { goal_name: 'Behavioral Support Coordination', progress_status: 'Needs Attention', progress_notes: 'Linda reports behavioral changes — withdrawal. Goal not yet actioned. To be added to annual ISP.' },
      ],
      // Sections 5-10 empty — waiting for CM to complete
    },
  },
  {
    individual_id: JOE_ID,
    type: 'Annually', status: 'Submitted', active: 'Inactive',
    due_date: '2023-09-30', submitted_date: '2023-09-19',
    complete_date: '2023-09-19',
    updated_by: 'Babar Nawaz CM', author_uid: CM_UID,
    sections: {
      s2_demographics_changed: false,
      s2_living_situation_changed: false,
      s2_health_status_changed: false,
      s2_services_appropriate: true,
      s3_satisfied_with_services: true,
      s3_wants_changes: false,
      s4_goals: [
        { goal_name: 'Community Integration', progress_status: 'On Track', progress_notes: 'Annual review 2023: Joseph attending Day Hab consistently and participating in community outings.' },
        { goal_name: 'Health Maintenance', progress_status: 'On Track', progress_notes: 'All health appointments current. MA active.' },
      ],
      s6_health_adequately_addressed: true,
      s6_risk_screening_score: 2,
      s7_backup_plan_current: true,
      s7_emergency_plan_current: true,
      s8_incidents_since_review: false,
    },
  },
];

const LISA_MONITORING_FORMS = [
  {
    individual_id: LISA_ID,
    type: 'Quarterly', status: 'Submitted', active: 'Active',
    due_date: '2025-08-31', submitted_date: '2025-08-14',
    complete_date: '2025-08-14',
    updated_by: CM_NAME, author_uid: CM_UID,
    sections: {
      s2_demographics_changed: false,
      s2_living_situation_changed: false,
      s2_health_status_changed: false,
      s2_services_appropriate: true,
      s3_satisfied_with_services: true,
      s3_wants_changes: false,
      s3_provider_responsive: true,
      s3_explain: 'Lisa and Sandra are very satisfied with all current services. Lisa is particularly thriving in her pottery class and has asked to continue.',
      s4_goals: [
        { goal_name: 'Community Connections (Pottery)', progress_status: 'On Track', progress_notes: 'Attending weekly for 6+ weeks. Strong progress and peer connections forming.' },
        { goal_name: 'Health Management', progress_status: 'On Track', progress_notes: 'Anxiety medication adjusted March 2025 — symptoms well-controlled. All appointments current.' },
      ],
      s5_informed_of_rights: true,
      s5_makes_daily_choices: true,
      s5_rights_concerns: false,
      s6_health_adequately_addressed: true,
      s6_new_health_concerns: false,
      s6_recent_medical_appointments: true,
      s6_medical_appointment_notes: 'Psychiatry appointment June 15 — medication maintained. Next appointment September.',
      s6_risk_screening_score: 1,
      s7_backup_plan_current: true,
      s7_emergency_plan_current: true,
      s7_backup_summary: 'Primary: Sandra Anderson (sister/guardian, same area). Emergency: Carroll County Services on-call.',
      s8_incidents_since_review: false,
      s8_referrals_made: false,
      s8_pending_referrals: true,
      s8_pending_referrals_notes: 'Animal shelter volunteer program — pending approval.',
      s9_recommended_actions: [
        'Add volunteer goal (animal shelter) to ISP at next update.',
        'Schedule next quarterly monitoring by November 30.',
        'Document community integration progress (pottery milestones).',
      ],
    },
  },
  {
    individual_id: LISA_ID,
    type: 'Quarterly', status: 'Submitted', active: 'Active',
    due_date: '2025-11-30', submitted_date: '2025-11-20',
    complete_date: '2025-11-20',
    updated_by: CM_NAME, author_uid: CM_UID,
    sections: {
      s2_demographics_changed: false,
      s2_living_situation_changed: false,
      s2_health_status_changed: false,
      s2_services_appropriate: true,
      s3_satisfied_with_services: true,
      s3_wants_changes: false,
      s3_provider_responsive: true,
      s4_goals: [
        { goal_name: 'Community Connections (Pottery)', progress_status: 'On Track', progress_notes: 'Received Arts Center recognition certificate. Consistent attendance. Strong social engagement.' },
        { goal_name: 'Health Management', progress_status: 'On Track', progress_notes: 'September psychiatry: anxiety scores improved significantly. Medication stable.' },
        { goal_name: 'Volunteer — Animal Shelter', progress_status: 'On Track', progress_notes: 'Approved and started September 28. Most reliable volunteer — no missed shifts in 8 weeks.' },
      ],
      s5_informed_of_rights: true,
      s5_makes_daily_choices: true,
      s6_health_adequately_addressed: true,
      s6_risk_screening_score: 1,
      s7_backup_plan_current: true,
      s7_emergency_plan_current: true,
      s8_incidents_since_review: false,
      s9_recommended_actions: [
        'Begin annual ISP preparation in January.',
        'Add new goals (advanced pottery, meal prep) to ISP renewal.',
        'Document volunteer milestone (8 consecutive weeks).',
      ],
    },
  },
  {
    individual_id: LISA_ID,
    type: 'Quarterly', status: 'Submitted', active: 'Active',
    due_date: '2026-02-28', submitted_date: '2026-02-20',
    complete_date: '2026-02-20',
    updated_by: CM_NAME, author_uid: CM_UID,
    sections: {
      s2_demographics_changed: false,
      s2_living_situation_changed: false,
      s2_health_status_changed: false,
      s2_services_appropriate: true,
      s3_satisfied_with_services: true,
      s3_wants_changes: false,
      s3_provider_responsive: true,
      s4_goals: [
        { goal_name: 'Community Connections (Pottery → Advanced)', progress_status: 'On Track', progress_notes: 'Annual ISP set — advanced session enrollment confirmed for April 7.' },
        { goal_name: 'Volunteer — Animal Shelter Lead', progress_status: 'On Track', progress_notes: 'Annual ISP meeting completed Feb 24. Lead role confirmed starting April 1.' },
        { goal_name: 'Health Management', progress_status: 'On Track', progress_notes: 'All health appointments current. Psychiatry stable through at least June 2026.' },
        { goal_name: 'Independent Meal Preparation', progress_status: 'On Track', progress_notes: 'New goal added at annual ISP. Lisa has been practicing with Sandra — pasta successfully made twice.' },
      ],
      s5_informed_of_rights: true,
      s5_makes_daily_choices: true,
      s6_health_adequately_addressed: true,
      s6_risk_screening_score: 0,
      s7_backup_plan_current: true,
      s7_emergency_plan_current: true,
      s8_incidents_since_review: false,
      s9_recommended_actions: [
        'Confirm pottery advanced session enrollment April 7.',
        'Confirm shelter lead role start date April 1.',
        'Track meal preparation milestones monthly.',
      ],
    },
  },
  {
    individual_id: LISA_ID,
    type: 'Quarterly', status: 'In Progress', active: 'Active',
    due_date: '2026-04-30', submitted_date: null,
    complete_date: null,
    updated_by: CM_NAME, author_uid: CM_UID,
    aiPreFilled: true,
    aiPreFilledNote: 'Sections 1–4 pre-filled based on Lisa\'s recent contact notes and visit summaries. All AI content is labeled. Review and edit before submitting.',
    sections: {
      s2_demographics_changed: false,
      s2_living_situation_changed: false,
      s2_health_status_changed: false,
      s2_services_appropriate: true,
      s3_satisfied_with_services: true,
      s3_wants_changes: false,
      s3_provider_responsive: true,
      s4_goals: [
        { goal_name: 'Advanced Pottery', progress_status: 'On Track', progress_notes: 'Attended first two advanced sessions. Instructor reports Lisa is the most experienced student in the class.' },
        { goal_name: 'Shelter Lead Volunteer', progress_status: 'On Track', progress_notes: 'Lead role active April 1. Training new volunteer Marcus. Excellent performance.' },
        { goal_name: 'Independent Meal Preparation', progress_status: 'On Track', progress_notes: 'Goal essentially met — 3 meals prepared independently (pasta, eggs, sandwich wrap) as of April 2026.' },
        { goal_name: 'Health Management', progress_status: 'On Track', progress_notes: 'All health appointments current. March psychiatry stable. No concerns.' },
      ],
    },
  },
];

// ════════════════════════════════════════════════════════════════════════════
// MODULE 5 — CARE PLANS / ISP
// ════════════════════════════════════════════════════════════════════════════

const JOE_CARE_PLANS = [
  {
    individual_id: JOE_ID,
    individual_name: 'Brown, Joseph',
    title: 'Person-Centered Plan (ISP) 2025-2026',
    plan_type: 'Person-Centered Plan (ISP)',
    status: 'archived',
    effective_date: '2025-09-01',
    review_date: '2026-08-31',
    internal_due_date: '2025-08-01',
    meeting_date: '2025-08-20',
    plan_id_display: '6079',
    author_uid: CM_UID,
    author_name: 'Babar Nawaz CM',
    individualProfileSummary: "Joseph (Joe) is a 38-year-old male who lives with his mother Linda in Westminster, Maryland. He has mild intellectual disability and has been receiving waiver services since 2022. Joseph is friendly, funny, and deeply loyal to his family. He loves cooking shows, outdoor activities, and his church community.",
    goals: [
      { id: 'g1', goal: 'Community Integration through Day Habilitation', priority: 'high', target_date: '2026-08-31', progress: 'achieved', interventions: ['Attend Day Hab 4+ days/week', 'Participate in 2+ community outings monthly'] },
      { id: 'g2', goal: 'Develop Social Connections', priority: 'medium', target_date: '2026-02-28', progress: 'achieved', interventions: ['Encourage peer relationships at Day Hab', 'Support participation in community activities'] },
      { id: 'g3', goal: 'Health Maintenance', priority: 'high', target_date: '2026-08-31', progress: 'achieved', interventions: ['Maintain all health appointments', 'Complete MA renewal before expiration'] },
    ],
  },
  {
    individual_id: JOE_ID,
    individual_name: 'Brown, Joseph',
    title: 'Person-Centered Plan (ISP) 2026-2027 — Draft',
    plan_type: 'Person-Centered Plan (ISP)',
    status: 'draft',
    effective_date: null,
    review_date: '2027-08-31',
    internal_due_date: '2026-08-01',
    plan_id_display: '6080',
    author_uid: CM_UID,
    author_name: 'Babar Nawaz CM',
    aiDrafted: true,
    aiDraftBanner: "I drafted this plan based on 6 monitoring forms, 3 visit summaries, and 2 contact notes from the past 12 months. All AI-suggested content is labeled. Review and edit before saving.",
    goals: [
      { id: 'g1', goal: 'Explore Part-Time Employment Opportunities', priority: 'high', target_date: '2026-10-31', progress: 'in_progress', interventions: ['Complete vocational interest assessment (IN PROGRESS)', 'Schedule 2 job shadowing visits (Not Started)'], responsible: 'Babar Nawaz CM + Carroll County Employment Services', aiSuggested: true },
      { id: 'g2', goal: 'Maintain Community Integration through Day Habilitation', priority: 'high', target_date: null, progress: 'in_progress', interventions: ['Attend Day Hab 4 days/week', 'Participate in 2+ community outings monthly'], responsible: 'Day Hab provider + Babar Nawaz CM' },
      { id: 'g3', goal: 'Behavioral Support Coordination', priority: 'high', target_date: '2026-05-15', progress: 'not_started', interventions: ['Behavioral assessment scheduled (Not Started)', 'Family/caregiver consultation completed (Not Started)'], responsible: 'Behavioral support team + Babar Nawaz CM', aiSuggested: true, urgency: 'Mother reported recent behavioral changes at home. Prioritize.' },
    ],
  },
];

const LISA_CARE_PLANS = [
  {
    individual_id: LISA_ID,
    individual_name: 'Anderson, Lisa',
    title: 'Person-Centered Plan (ISP) 2025-2026',
    plan_type: 'Person-Centered Plan (ISP)',
    status: 'archived',
    effective_date: '2025-05-01',
    review_date: '2026-04-30',
    internal_due_date: '2025-04-01',
    meeting_date: '2025-04-22',
    plan_id_display: '5210',
    author_uid: CM_UID,
    author_name: CM_NAME,
    individualProfileSummary: "Lisa Anderson is a 53-year-old woman who lives in Carroll County, Indiana with her sister and guardian Sandra Anderson. Lisa has Intellectual Disability (Moderate) and Anxiety Disorder. She is warm, creative, and deeply connected to her family. Lisa loves animals, arts and crafts, and her weekly routines.",
    goals: [
      { id: 'g1', goal: 'Community Connections through Pottery Class', priority: 'high', target_date: '2026-04-30', progress: 'achieved', interventions: ['Enroll and attend pottery class weekly', 'Build peer connections with classmates'] },
      { id: 'g2', goal: 'Health Management — Anxiety and General Health', priority: 'high', target_date: '2026-04-30', progress: 'achieved', interventions: ['Maintain medication schedule', 'Attend all scheduled health appointments'] },
      { id: 'g3', goal: 'Volunteer at Carroll County Animal Shelter', priority: 'medium', target_date: '2026-04-30', progress: 'achieved', interventions: ['Complete shelter orientation', 'Volunteer weekly on Wednesdays', 'Pursue lead volunteer role'] },
    ],
  },
  {
    individual_id: LISA_ID,
    individual_name: 'Anderson, Lisa',
    title: 'Person-Centered Plan (ISP) 2026-2027 — Draft',
    plan_type: 'Person-Centered Plan (ISP)',
    status: 'draft',
    effective_date: null,
    review_date: '2027-04-30',
    internal_due_date: '2027-03-01',
    plan_id_display: '5211',
    author_uid: CM_UID,
    author_name: CM_NAME,
    aiDrafted: true,
    aiDraftBanner: "I drafted this plan based on Lisa's annual ISP meeting (Feb 24, 2026) and 4 monitoring forms from the past 12 months. All AI-suggested content is labeled. Review and edit before saving.",
    goals: [
      { id: 'g1', goal: 'Advanced Pottery — Expand Community Connections', priority: 'high', target_date: '2027-04-30', progress: 'in_progress', interventions: ['Enroll in advanced pottery session (COMPLETED)', 'Build friendships in advanced class'] },
      { id: 'g2', goal: 'Animal Shelter Lead Volunteer Role', priority: 'high', target_date: '2027-04-30', progress: 'in_progress', interventions: ['Lead small dog room on Wednesdays (ACTIVE)', 'Train new volunteers as needed'] },
      { id: 'g3', goal: 'Health Management — Maintain Stability', priority: 'high', target_date: '2027-04-30', progress: 'in_progress', interventions: ['Maintain medication schedule', 'Attend all scheduled health appointments'] },
      { id: 'g4', goal: 'Independent Meal Preparation', priority: 'medium', target_date: '2026-08-31', progress: 'achieved', interventions: ['Prepare 3 simple meals independently (ACHIEVED April 2026)', 'Continue building cooking skills'], aiSuggested: false },
    ],
  },
];

// ════════════════════════════════════════════════════════════════════════════
// MODULE 6 — CASE MANAGEMENT BOARD (workflow_tasks)
// ════════════════════════════════════════════════════════════════════════════

const JOE_CM_TASKS = [
  { individual_id: JOE_ID, title: 'Schedule quarterly visit — Brown, Joseph', description: 'Q1 2026 quarterly face-to-face visit is overdue. Contact Joseph and Linda to schedule.', category: 'Quarterly Requirements', priority: 'high', status: 'open', due_date: '2026-02-09', assigned_to_name: CM_NAME },
  { individual_id: JOE_ID, title: 'Complete monitoring form — Brown, Joseph Q1', description: 'Q1 2026 quarterly monitoring form is overdue. Complete and submit.', category: 'Quarterly Requirements', priority: 'high', status: 'open', due_date: '2026-04-09', assigned_to_name: CM_NAME },
  { individual_id: JOE_ID, title: 'Verify MA status — Brown, Joseph', description: 'Medicaid status verification overdue. Access FSSA portal and verify current eligibility.', category: 'Eligibility & Benefits', priority: 'high', status: 'open', due_date: '2026-04-16', assigned_to_name: CM_NAME },
  { individual_id: JOE_ID, title: 'Schedule next quarterly visit — Brown, Joseph', description: 'Schedule Q2 2026 quarterly visit by May 15.', category: 'Quarterly Requirements', priority: 'medium', status: 'open', due_date: '2026-05-15', assigned_to_name: CM_NAME },
  { individual_id: JOE_ID, title: 'Annual ISP renewal preparation — Brown, Joseph', description: 'Annual ISP due 08/31/2026. Begin preparation including scheduling the annual meeting and drafting goals.', category: 'Plan Development', priority: 'high', status: 'open', due_date: '2026-07-01', assigned_to_name: CM_NAME },
  { individual_id: JOE_ID, title: 'Medicaid Recertification workflow', description: 'Begin full Medicaid recertification process. Step 1 of 4 completed (identity verification).', category: 'Eligibility & Benefits', priority: 'medium', status: 'in_progress', due_date: '2026-06-10', assigned_to_name: CM_NAME },
  { individual_id: JOE_ID, title: 'Coordinate annual physical — Brown, Joseph', description: 'Annual physical coordination completed for 2025-2026 plan year.', category: 'Health', priority: 'low', status: 'completed', due_date: '2026-01-15', assigned_to_name: CM_NAME, completed_at: '2026-01-15' },
];

const LISA_CM_TASKS = [
  { individual_id: LISA_ID, title: 'Upload signed 2026-2027 ISP — Anderson, Lisa', description: 'Annual ISP signed at Feb 24 meeting. Upload signed copy to managed documents.', category: 'Plan Development', priority: 'high', status: 'completed', due_date: '2026-03-01', assigned_to_name: CM_NAME, completed_at: '2026-03-05' },
  { individual_id: LISA_ID, title: 'Confirm shelter lead role start — Anderson, Lisa', description: 'James Ko confirmed lead role starts April 1. Document confirmation and update ISP.', category: 'Service Coordination', priority: 'medium', status: 'completed', due_date: '2026-04-01', assigned_to_name: CM_NAME, completed_at: '2026-04-02' },
  { individual_id: LISA_ID, title: 'Confirm advanced pottery enrollment — Anderson, Lisa', description: 'Confirm Lisa is enrolled in the advanced pottery session starting April 7.', category: 'Service Coordination', priority: 'medium', status: 'completed', due_date: '2026-04-07', assigned_to_name: CM_NAME, completed_at: '2026-04-08' },
  { individual_id: LISA_ID, title: 'Document advanced pottery enrollment — Anderson, Lisa', description: 'Document enrollment confirmation and add attendance record to managed documents.', category: 'Documentation', priority: 'low', status: 'open', due_date: '2026-05-15', assigned_to_name: CM_NAME },
  { individual_id: LISA_ID, title: 'Q2 Quarterly monitoring form — Anderson, Lisa', description: 'Complete Q2 2026 quarterly monitoring form. AI pre-fill available.', category: 'Quarterly Requirements', priority: 'medium', status: 'in_progress', due_date: '2026-06-30', assigned_to_name: CM_NAME },
  { individual_id: LISA_ID, title: 'Schedule Q2 quarterly visit — Anderson, Lisa', description: 'Schedule next quarterly visit by June 30, 2026.', category: 'Quarterly Requirements', priority: 'medium', status: 'open', due_date: '2026-06-30', assigned_to_name: CM_NAME },
];

// ════════════════════════════════════════════════════════════════════════════
// MODULE 7 — ELIGIBILITY VERIFICATIONS
// ════════════════════════════════════════════════════════════════════════════

const JOE_ELIGIBILITY = [
  {
    individual_id: JOE_ID,
    verification_date: '2023-08-01',
    maStatus: 'MA Eligible — Active',
    maNumber: '1234567890',
    maType: 'Waiver Related',
    effectiveDate: '2023-08-01',
    renewalDate: '2025-08-01',
    redeterminationDate: '2025-08-01',
    documentType: 'MA Screenshot',
    recordStatus: 'Inactive',
    updatedBy: CM_NAME, updatedOn: '2023-08-01',
    notes: 'Verified via FSSA portal. Waiver enrollment confirmed.',
    eligible: true,
  },
  {
    individual_id: JOE_ID,
    verification_date: '2025-08-01',
    maStatus: 'MA Eligible — Active',
    maNumber: '1234567890',
    maType: 'Waiver Related',
    effectiveDate: '2025-08-01',
    renewalDate: '2026-11-01',
    redeterminationDate: '2026-11-01',
    documentType: 'MA Screenshot',
    recordStatus: 'Active',
    updatedBy: CM_NAME, updatedOn: '2025-08-01',
    notes: 'Annual verification. MA active. Renewal due Nov 2026. Confirmed via FSSA portal.',
    eligible: true,
  },
  {
    individual_id: JOE_ID,
    verification_date: '2026-04-27',
    maStatus: 'MA Eligible — Active',
    maNumber: '1234567890',
    maType: 'Waiver Related',
    effectiveDate: null,
    renewalDate: null,
    redeterminationDate: null,
    documentType: null,
    recordStatus: 'Draft',
    updatedBy: CM_NAME, updatedOn: '2026-04-27',
    notes: '',
    eligible: null,
    aiPreFilled: true,
    aiNote: "Medicaid tracking active. I've pre-filled known fields from Joseph's profile. Upload the verification document when available.",
    aiUrgent: "MA redetermination is approaching. Upload a current MA verification screenshot from the state portal to refresh the record.",
  },
];

const LISA_ELIGIBILITY = [
  {
    individual_id: LISA_ID,
    verification_date: '2024-03-15',
    maStatus: 'MA Eligible — Active',
    maNumber: '9876543210',
    maType: 'Waiver Related',
    effectiveDate: '2024-03-15',
    renewalDate: '2025-03-15',
    redeterminationDate: '2025-03-15',
    documentType: 'MA Screenshot',
    recordStatus: 'Inactive',
    updatedBy: CM_NAME, updatedOn: '2024-03-15',
    notes: 'Annual verification. MA active. Continuous coverage confirmed.',
    eligible: true,
  },
  {
    individual_id: LISA_ID,
    verification_date: '2026-03-01',
    maStatus: 'MA Eligible — Active',
    maNumber: '9876543210',
    maType: 'Waiver Related',
    effectiveDate: '2026-03-01',
    renewalDate: '2027-03-01',
    redeterminationDate: '2027-03-01',
    documentType: 'MA Screenshot',
    recordStatus: 'Active',
    updatedBy: CM_NAME, updatedOn: '2026-03-01',
    notes: 'MA confirmed active through March 2027. Continuous coverage — no lapses in record.',
    eligible: true,
  },
];

// ════════════════════════════════════════════════════════════════════════════
// MODULE 8 — REFERRALS
// ════════════════════════════════════════════════════════════════════════════

const JOE_REFERRALS = [
  {
    individual_id: JOE_ID,
    individual_name: 'Brown, Joseph',
    referral_type: 'Employment & Vocational',
    referred_to: 'Carroll County Employment Services',
    referred_by: CM_NAME,
    referred_by_uid: CM_UID,
    date: '2026-04-27',
    priority: 'routine',
    status: 'pending',
    notes: "Joseph expressed interest in part-time employment during the 04/27/2026 home visit. He has prior warehouse experience and prefers structured, predictable tasks. Referral submitted via online portal. Marcus Reid assigned as employment specialist. Intake confirmed for March 5 — assessment completed April 10. Awaiting written vocational report by May 15.",
    outcome: null,
    referral_method: 'Online portal',
    contact_date: '2026-04-28',
    follow_up_date: '2026-05-05',
    linked_goal: 'Employment Exploration (G1)',
    consent_documented: true,
  },
  {
    individual_id: JOE_ID,
    individual_name: 'Brown, Joseph',
    referral_type: 'Benefits Assistance',
    referred_to: 'Carroll County SSA Office',
    referred_by: 'Babar Nawaz CM',
    date: '2023-10-02',
    priority: 'routine',
    status: 'completed',
    notes: 'SSI enrollment referral.',
    outcome: 'Successful — SSI enrollment completed. Joseph receiving monthly SSI benefits.',
  },
  {
    individual_id: JOE_ID,
    individual_name: 'Brown, Joseph',
    referral_type: 'Healthcare — Mental Health',
    referred_to: 'Way Station Behavioral Health',
    referred_by: 'Babar Nawaz CM',
    date: '2024-01-18',
    priority: 'routine',
    status: 'completed',
    notes: 'Initial behavioral health evaluation referral following family concern about mood changes.',
    outcome: 'Successful — Initial behavioral health evaluation completed. No ongoing services needed at that time. Case closed.',
  },
];

const LISA_REFERRALS = [
  {
    individual_id: LISA_ID,
    individual_name: 'Anderson, Lisa',
    referral_type: 'Transportation Coordination',
    referred_to: 'Carroll County Medical Transport Coordination',
    referred_by: CM_NAME,
    referred_by_uid: CM_UID,
    date: '2026-02-24',
    priority: 'routine',
    status: 'pending',
    notes: "Discussed at annual ISP meeting. Sandra currently provides transportation to all appointments but requested coordination support for medical appointments when she is unavailable. Referral submitted to Carroll County Medical Transport to set up backup transportation plan.",
    outcome: null,
    follow_up_date: '2026-03-15',
    linked_goal: 'Health Management (G3)',
    consent_documented: true,
  },
  {
    individual_id: LISA_ID,
    individual_name: 'Anderson, Lisa',
    referral_type: 'Healthcare — Psychiatric Services',
    referred_to: 'Carroll County Behavioral Health — Dr. Angela Rosario',
    referred_by: CM_NAME,
    date: '2024-06-01',
    priority: 'routine',
    status: 'completed',
    notes: 'Referral for psychiatric evaluation to address anxiety disorder and medication management.',
    outcome: 'Successful — Ongoing provider relationship established with Dr. Angela Rosario. Lisa seen quarterly. Medication adjusted March 2025 with positive results. Active ongoing relationship.',
  },
  {
    individual_id: LISA_ID,
    individual_name: 'Anderson, Lisa',
    referral_type: 'Community / Arts Programs',
    referred_to: 'Carroll County Arts Center — Pottery Program',
    referred_by: CM_NAME,
    date: '2025-05-12',
    priority: 'routine',
    status: 'completed',
    notes: "Referral made following Lisa's expressed interest in pottery at annual ISP preparation visit.",
    outcome: 'Successful — Lisa enrolled in pottery class in June 2025. Attending weekly. Received Arts Center recognition certificate October 2025. Advanced to advanced session April 2026.',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// MODULE 9 — INCIDENT REPORTS
// ════════════════════════════════════════════════════════════════════════════

const JOE_INCIDENTS = [
  {
    individual_id: JOE_ID,
    individual_name: 'Brown, Joseph',
    incident_date: '2023-08-01',
    incident_time: '14:30',
    location: 'Westminster Community Center, Westminster, MD',
    incident_types: ['Financial Exploitation Concern'],
    description: "Concern raised by mother Linda Brown regarding an individual in the community who may have solicited money from Joseph. Joseph reported the person asked him for $20 at the community center. No physical contact or threat occurred. Financial exploitation concern flagged for investigation. Incident reported to APS per protocol.",
    classification: 'Critical',
    current_stage: 2,
    status: 'In Progress',
    person_responsible: 'Unknown community member',
    staff_on_duty: 'N/A — community setting, no staff present',
    reported_by_name: 'Linda Brown (mother)',
    last_updated_by: CM_NAME,
    last_updated_at: '2023-08-15',
  },
  {
    individual_id: JOE_ID,
    individual_name: 'Brown, Joseph',
    incident_date: '2024-03-14',
    incident_time: '11:00',
    location: 'Carroll County Day Services, Westminster, MD',
    incident_types: ['Minor Behavioral Incident'],
    description: "Joseph had a verbal altercation with a peer at Day Hab during a group activity. Staff intervened immediately. No physical contact. Joseph was redirected and calmed within 5 minutes. Peer also calmed. Root cause: competition over a seating preference. Resolved without incident.",
    classification: 'Minor',
    current_stage: 5,
    status: 'Closed',
    person_responsible: 'N/A',
    staff_on_duty: 'Maria Torres (Day Hab Program Staff)',
    reported_by_name: 'Maria Torres',
    last_updated_by: CM_NAME,
    last_updated_at: '2024-03-20',
    closure_notes: 'Staff debriefed with Joseph and peer. Seating arrangement adjusted by Day Hab staff. No further issues. Incident closed.',
  },
];

const LISA_INCIDENTS = [
  {
    individual_id: LISA_ID,
    individual_name: 'Anderson, Lisa',
    incident_date: '2024-09-05',
    incident_time: '10:00',
    location: "Lisa Anderson's residence",
    incident_types: ['Health / Medical Concern'],
    description: "Sandra Anderson reported Lisa experienced an episode of significant anxiety and hyperventilation at home on the morning of September 5. Lisa was unable to attend her pottery class that day. Sandra used calming strategies learned from Lisa's psychiatrist. Lisa stabilized within 45 minutes. No emergency services contacted. Incident reported per protocol as a health/behavioral event. Sandra notified the CM same day.",
    classification: 'Minor',
    current_stage: 5,
    status: 'Closed',
    person_responsible: 'N/A — health event',
    staff_on_duty: 'Sandra Anderson (guardian)',
    reported_by_name: 'Sandra Anderson (guardian)',
    last_updated_by: CM_NAME,
    last_updated_at: '2024-09-10',
    closure_notes: "Incident discussed with Dr. Rosario (psychiatrist) at September 9 appointment. Identified trigger (unexpected change in routine). Medication reviewed — no changes needed. Sandra given additional coping strategies. No recurrence since. Case closed.",
  },
];

// ════════════════════════════════════════════════════════════════════════════
// MAIN SEEDER
// ════════════════════════════════════════════════════════════════════════════

async function seed(token) {
  console.log('\n🌱 Starting comprehensive demo data seed...\n');
  let total = 0;

  // ── MODULE 1: CONTACT NOTES ─────────────────────────────────────────────
  console.log('📝 MODULE 1: Contact Notes');
  for (const note of JOE_CONTACT_NOTES) {
    const doc = { ...note, individualId: JOE_ID, individual_id: JOE_ID, individual_name: 'Joseph Brown', person: 'Joseph Brown', updatedBy: CM_NAME, updatedOn: note.date };
    const id = await addDoc('contact_notes', doc, token);
    if (id) { console.log(`  ✓ Joe contact note ${note.date}`); total++; }
    await delay(120);
  }
  for (const note of LISA_CONTACT_NOTES) {
    const doc = { ...note, individualId: LISA_ID, individual_id: LISA_ID, individual_name: 'Lisa Anderson', person: 'Lisa Anderson', updatedBy: CM_NAME, updatedOn: note.date };
    const id = await addDoc('contact_notes', doc, token);
    if (id) { console.log(`  ✓ Lisa contact note ${note.date}`); total++; }
    await delay(120);
  }

  // ── MODULE 2: PROGRESS NOTES ────────────────────────────────────────────
  console.log('\n📊 MODULE 2: Progress Notes');
  for (const note of JOE_PROGRESS_NOTES) {
    const doc = { ...note, individualId: JOE_ID, authorId: CM_UID, authorName: CM_NAME, aiDrafted: false };
    const id = await addDoc('progress_notes', doc, token);
    if (id) { console.log(`  ✓ Joe progress note ${note.progressDate}`); total++; }
    await delay(120);
  }
  for (const note of LISA_PROGRESS_NOTES) {
    const doc = { ...note, individualId: LISA_ID, authorId: CM_UID, authorName: CM_NAME, aiDrafted: false };
    const id = await addDoc('progress_notes', doc, token);
    if (id) { console.log(`  ✓ Lisa progress note ${note.progressDate}`); total++; }
    await delay(120);
  }

  // ── MODULE 3: VISIT SUMMARIES ───────────────────────────────────────────
  console.log('\n🏠 MODULE 3: Visit Summaries');
  for (const vs of JOE_VISIT_SUMMARIES) {
    const id = await addDoc('visit_summaries', vs, token);
    if (id) { console.log(`  ✓ Joe visit summary ${vs.visit_date}`); total++; }
    await delay(120);
  }
  for (const vs of LISA_VISIT_SUMMARIES) {
    const id = await addDoc('visit_summaries', vs, token);
    if (id) { console.log(`  ✓ Lisa visit summary ${vs.visit_date}`); total++; }
    await delay(120);
  }

  // ── MODULE 4: MONITORING FORMS ──────────────────────────────────────────
  console.log('\n📋 MODULE 4: Monitoring Forms');
  for (const mf of JOE_MONITORING_FORMS) {
    const id = await addDoc('monitoring_forms', mf, token);
    if (id) { console.log(`  ✓ Joe monitoring form ${mf.type} ${mf.due_date}`); total++; }
    await delay(120);
  }
  for (const mf of LISA_MONITORING_FORMS) {
    const id = await addDoc('monitoring_forms', mf, token);
    if (id) { console.log(`  ✓ Lisa monitoring form ${mf.type} ${mf.due_date}`); total++; }
    await delay(120);
  }

  // ── MODULE 5: CARE PLANS / ISP ──────────────────────────────────────────
  console.log('\n📄 MODULE 5: Care Plans / ISP');
  for (const cp of JOE_CARE_PLANS) {
    const doc = {
      ...cp,
      created_at: new Date().toISOString(),
      isCompleted: cp.status === 'archived' || cp.status === 'completed',
      // Normalize to camelCase so the UI can read both
      internalDueDate: cp.internal_due_date || null,
      meetingDate: cp.meeting_date || null,
      crReceivedDate: cp.cr_received_date || null,
      approvalDate: cp.approval_date || null,
      effectiveDate: cp.effective_date || null,
      reviewDate: cp.review_date || null,
      updatedBy: cp.author_name || null,
      updatedOn: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
    };
    const id = await addDoc('care_plans', doc, token);
    if (id) { console.log(`  ✓ Joe care plan: ${cp.title}`); total++; }
    await delay(120);
  }
  for (const cp of LISA_CARE_PLANS) {
    const doc = {
      ...cp,
      created_at: new Date().toISOString(),
      isCompleted: cp.status === 'archived' || cp.status === 'completed',
      internalDueDate: cp.internal_due_date || null,
      meetingDate: cp.meeting_date || null,
      crReceivedDate: cp.cr_received_date || null,
      approvalDate: cp.approval_date || null,
      effectiveDate: cp.effective_date || null,
      reviewDate: cp.review_date || null,
      updatedBy: cp.author_name || null,
      updatedOn: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
    };
    const id = await addDoc('care_plans', doc, token);
    if (id) { console.log(`  ✓ Lisa care plan: ${cp.title}`); total++; }
    await delay(120);
  }

  // ── MODULE 6: CASE MANAGEMENT TASKS ────────────────────────────────────
  console.log('\n📌 MODULE 6: Case Management Tasks');
  for (const task of JOE_CM_TASKS) {
    const id = await addDoc('workflow_tasks', { ...task, assigned_to_uid: CM_UID }, token);
    if (id) { console.log(`  ✓ Joe task: ${task.title.substring(0,50)}`); total++; }
    await delay(120);
  }
  for (const task of LISA_CM_TASKS) {
    const id = await addDoc('workflow_tasks', { ...task, assigned_to_uid: CM_UID }, token);
    if (id) { console.log(`  ✓ Lisa task: ${task.title.substring(0,50)}`); total++; }
    await delay(120);
  }

  // ── MODULE 7: ELIGIBILITY VERIFICATIONS ────────────────────────────────
  console.log('\n✅ MODULE 7: Eligibility Verifications');
  for (const ev of JOE_ELIGIBILITY) {
    const id = await addDoc('eligibility_verifications', ev, token);
    if (id) { console.log(`  ✓ Joe eligibility ${ev.verification_date}`); total++; }
    await delay(120);
  }
  for (const ev of LISA_ELIGIBILITY) {
    const id = await addDoc('eligibility_verifications', ev, token);
    if (id) { console.log(`  ✓ Lisa eligibility ${ev.verification_date}`); total++; }
    await delay(120);
  }

  // ── MODULE 8: REFERRALS ─────────────────────────────────────────────────
  console.log('\n🔗 MODULE 8: Referrals');
  for (const ref of JOE_REFERRALS) {
    const id = await addDoc('referrals', ref, token);
    if (id) { console.log(`  ✓ Joe referral: ${ref.referral_type}`); total++; }
    await delay(120);
  }
  for (const ref of LISA_REFERRALS) {
    const id = await addDoc('referrals', ref, token);
    if (id) { console.log(`  ✓ Lisa referral: ${ref.referral_type}`); total++; }
    await delay(120);
  }

  // ── MODULE 9: INCIDENT REPORTS ──────────────────────────────────────────
  console.log('\n🚨 MODULE 9: Incident Reports');
  for (const inc of JOE_INCIDENTS) {
    const id = await addDoc('incident_reports', inc, token);
    if (id) { console.log(`  ✓ Joe incident: ${inc.incident_date} — ${inc.classification}`); total++; }
    await delay(120);
  }
  for (const inc of LISA_INCIDENTS) {
    const id = await addDoc('incident_reports', inc, token);
    if (id) { console.log(`  ✓ Lisa incident: ${inc.incident_date} — ${inc.classification}`); total++; }
    await delay(120);
  }

  console.log(`\n✅ Seeding complete! Wrote ${total} documents across 9 modules.`);
  console.log('   Joseph Brown (ind-001) and Lisa Anderson (ind-010) are now fully populated.\n');
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const token = await getToken();
  await seed(token);
}

main().catch(console.error);
