#!/usr/bin/env node
/**
 * seed-all-individuals.cjs
 * Seeds realistic sub-collection data for ALL individuals who are missing it.
 * For each individual, populates:
 *   - visit_summaries (3-4 records going back 6 months)
 *   - contact_notes (3-4 records)
 *   - care_plans (1 active ISP)
 *   - monitoring_forms (2-3 quarterly forms)
 *   - referrals (1-2 referrals)
 *   - service_authorizations (2 auths)
 *   - workflow_tasks (2-3 open tasks with due dates)
 *
 * Skips individuals who already have data in these collections.
 * Preserves progress_notes (already seeded by useDemoSeed.ts for most).
 *
 * Auth: uses Firebase CLI stored refresh token
 */

const https = require("https");
const os = require("os");
const path = require("path");
const fs = require("fs");

const PROJECT_ID = "casemanagement-ai";

// ── Load Firebase CLI access token ────────────────────────────────────────────
const configPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
const cliConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
const ACCESS_TOKEN = cliConfig.tokens?.access_token;
if (!ACCESS_TOKEN) { console.error("❌ No access token. Run: npx firebase-tools login"); process.exit(1); }

// ── Firestore REST helpers ────────────────────────────────────────────────────
function toFsValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === "string") return { stringValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFsValue) } };
  if (typeof val === "object") { const fields = {}; for (const [k, v] of Object.entries(val)) fields[k] = toFsValue(v); return { mapValue: { fields } }; }
  return { nullValue: null };
}
function toFsDoc(obj) { const fields = {}; for (const [k, v] of Object.entries(obj)) { if (v !== undefined) fields[k] = toFsValue(v); } return { fields }; }
function request(method, p, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const req = https.request({ hostname: "firestore.googleapis.com", path: p, method, headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json", ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}) } }, res => {
      let data = ""; res.on("data", c => data += c);
      res.on("end", () => { if (res.statusCode < 300) resolve(JSON.parse(data || "{}")); else reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`)); });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
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
  if (v.mapValue) { const obj = {}; for (const [k, mv] of Object.entries(v.mapValue.fields || {})) obj[k] = extractValue(mv); return obj; }
  return null;
}
async function runQuery(collectionId, filters, lim = 1) {
  const sQ = { from: [{ collectionId }], limit: lim, ...(filters.length ? { where: { compositeFilter: { op: "AND", filters: filters.map(([field, value]) => ({ fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: toFsValue(value) } })) } } } : {}) };
  const result = await request("POST", `/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`, { structuredQuery: sQ });
  return result.filter(r => r.document).map(r => { const id = r.document.name.split("/").pop(); const fields = r.document.fields || {}; const obj = { id }; for (const [k, v] of Object.entries(fields)) obj[k] = extractValue(v); return obj; });
}
async function addDoc(collectionId, data) {
  const result = await request("POST", `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionId}`, toFsDoc(data));
  return result.name.split("/").pop();
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function dateStr(year, month, day) { return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function ts(year, month, day) { return new Date(year, month - 1, day); }

// ── Case manager pool ─────────────────────────────────────────────────────────
const CASE_MANAGERS = [
  { name: "Kathy Martinez", uid: "kathy-martinez" },
  { name: "David Park", uid: "david-park" },
  { name: "Sandra Williams", uid: "sandra-williams" },
  { name: "Marcus Thomas", uid: "marcus-thomas" },
];

// ── Generic data generators ────────────────────────────────────────────────────
function makeVisitSummaries(individualId, firstName, cm, orgId) {
  return [
    {
      individual_id: individualId, individual_name: firstName,
      visit_date: daysAgo(150), start_time: "10:00", end_time: "11:00",
      location: `${firstName}'s residence`,
      purpose_of_support: "Initial home visit — baseline assessment and support planning",
      what_went_well: `${firstName} was engaged and cooperative throughout the visit. Home environment is clean and safe. Daily routine is established with appropriate support structures in place.`,
      what_is_not_working: "Some areas of independent living require additional support. Transportation to community activities is limited.",
      goals_addressed: ["Independent living skills", "Community integration"],
      next_steps: "Submit ISP for review. Coordinate services. Schedule follow-up visit in 4-6 weeks.",
      status: "signed", author_uid: cm.uid, author_name: cm.name,
      updated_by: cm.name, updated_on: daysAgo(148),
      created_at: new Date(Date.now() - 150 * 86400000), updated_at: new Date(Date.now() - 148 * 86400000),
    },
    {
      individual_id: individualId, individual_name: firstName,
      visit_date: daysAgo(90), start_time: "14:00", end_time: "15:00",
      location: `${firstName}'s residence`,
      purpose_of_support: "Quarterly home visit — goal progress review and service coordination",
      what_went_well: `${firstName} is making consistent progress on ISP goals. Support staff report positive engagement. Family involvement is strong.`,
      what_is_not_working: "Some community integration goals need additional resources and coordination with day program.",
      goals_addressed: ["Independent living skills", "Community integration", "Health management"],
      next_steps: "Update ISP with current progress. Coordinate with provider. Schedule next visit in 90 days.",
      status: "signed", author_uid: cm.uid, author_name: cm.name,
      updated_by: cm.name, updated_on: daysAgo(88),
      created_at: new Date(Date.now() - 90 * 86400000), updated_at: new Date(Date.now() - 88 * 86400000),
    },
    {
      individual_id: individualId, individual_name: firstName,
      visit_date: daysAgo(30), start_time: "11:00", end_time: "12:00",
      location: `${firstName}'s residence`,
      purpose_of_support: "Quarterly home visit — semi-annual ISP review and update",
      what_went_well: `${firstName} continues to demonstrate strong progress. Staff report excellent engagement and motivation. Community participation has increased noticeably since last visit.`,
      what_is_not_working: "Employment exploration is an emerging goal area that needs formal referral and planning.",
      goals_addressed: ["Independent living skills", "Community integration", "Employment exploration"],
      next_steps: "Submit updated ISP for signatures. Plan for employment referral. Schedule next visit in 90 days.",
      status: "submitted", author_uid: cm.uid, author_name: cm.name,
      updated_by: cm.name, updated_on: daysAgo(28),
      created_at: new Date(Date.now() - 30 * 86400000), updated_at: new Date(Date.now() - 28 * 86400000),
    },
  ];
}

function makeContactNotes(individualId, firstName, cm) {
  return [
    {
      individual_id: individualId, individual_name: firstName,
      author_uid: cm.uid, author_name: cm.name,
      date: daysAgo(140), activityType: "Intake", contactType: "In-Person",
      billable: true, startTime: "10:00", endTime: "11:00",
      purpose: "Initial intake — collect consents and establish service plan",
      present: `${firstName}, ${cm.name}`,
      details: `Completed initial intake with ${firstName}. Reviewed diagnostic history, collected signed consents, Medicaid verification, and PHI release. Established priority goals for ISP: community integration, independent living skills, and health self-management.`,
      issues: "Transportation to appointments identified as a barrier. Will coordinate with Medicaid transit program.",
      nextSteps: "Schedule home visit. Submit ISP for team review. Research community day program options.",
      status: "signed", created_at: new Date(Date.now() - 140 * 86400000), updated_at: new Date(Date.now() - 138 * 86400000),
    },
    {
      individual_id: individualId, individual_name: firstName,
      author_uid: cm.uid, author_name: cm.name,
      date: daysAgo(85), activityType: "Provider Coordination", contactType: "Telephone",
      billable: true, startTime: "09:30", endTime: "09:50",
      purpose: "Coordinate with provider — confirm service plan and scheduling",
      present: `${cm.name}, Provider Coordinator`,
      details: `Called provider to coordinate ${firstName}'s service schedule and confirm active Medicaid authorization. Confirmed services are authorized and scheduling is on track. Reviewed ISP goals with provider team.`,
      issues: "None.",
      nextSteps: "Follow up at next quarterly visit. Monitor service utilization.",
      status: "signed", created_at: new Date(Date.now() - 85 * 86400000), updated_at: new Date(Date.now() - 85 * 86400000),
    },
    {
      individual_id: individualId, individual_name: firstName,
      author_uid: cm.uid, author_name: cm.name,
      date: daysAgo(25), activityType: "Assessment", contactType: "In-Person",
      billable: true, startTime: "10:00", endTime: "11:00",
      purpose: "Semi-annual ISP review — team meeting",
      present: `${firstName}, family/guardian, ${cm.name}, provider representative`,
      details: `Conducted semi-annual ISP review meeting. Reviewed all active goals — progress is strong across all areas. ${firstName} participated actively and self-advocated for several goal updates. New employment exploration goal added per ${firstName}'s request. Updated ISP submitted for signatures.`,
      issues: "Employment referral not yet submitted — to be completed within 2 weeks.",
      nextSteps: "Submit employment referral. Collect ISP signatures from all parties. Schedule 90-day follow-up visit.",
      status: "submitted", created_at: new Date(Date.now() - 25 * 86400000), updated_at: new Date(Date.now() - 25 * 86400000),
    },
  ];
}

function makeCarePlan(individualId, firstName, cm) {
  const today = new Date();
  const endYear = today.getFullYear() + 1;
  return [{
    individual_id: individualId,
    title: `Annual ISP — ${today.getFullYear()}`,
    plan_type: "Individual Support Plan (ISP)",
    status: "active",
    effective_date: daysAgo(150),
    review_date: daysFromNow(215),
    goals: [
      {
        id: "goal_independent_living",
        goal: `${firstName} will develop and maintain independent living skills including meal preparation, personal budgeting, and household management with decreasing levels of support.`,
        priority: "high",
        target_date: daysFromNow(215),
        progress: "in_progress",
        interventions: ["Home support coaching 3x/week", "Written visual schedule and budget checklist", "Monthly progress review with case manager"],
      },
      {
        id: "goal_community_integration",
        goal: `${firstName} will participate in structured community activities and build peer relationships through day program and community outings.`,
        priority: "high",
        target_date: daysFromNow(215),
        progress: "in_progress",
        interventions: ["Day program attendance 5 days/week", "Monthly community social outings", "Medicaid transportation coordination"],
      },
      {
        id: "goal_health",
        goal: `${firstName} will manage their health by attending all medical appointments and following medication management protocols with appropriate support.`,
        priority: "medium",
        target_date: daysFromNow(215),
        progress: "in_progress",
        interventions: ["Coordinate all medical appointments", "Medication administration support as needed", "Quarterly health status review"],
      },
    ],
    author_uid: cm.uid, author_name: cm.name,
    created_at: new Date(Date.now() - 150 * 86400000), updated_at: new Date(Date.now() - 30 * 86400000),
  }];
}

function makeMonitoringForms(individualId, cm) {
  return [
    {
      individual_id: individualId, type: "Quarterly", status: "Submitted", active: "Active",
      due_date: daysAgo(90), submitted_date: daysAgo(95),
      updated_by: cm.name, updated_on: daysAgo(95), author_uid: cm.uid,
      sections: {
        health_safety: "No health or safety incidents reported. Current medications are effective and stable. No hospitalizations or emergency room visits.",
        goal_progress: "Independent living skills progressing well. Community integration goal on track — attending day program consistently. Health management goal being met with supports in place.",
        service_utilization: "All authorized services utilized as planned. Case management hours within authorized range. Transportation coordinated successfully.",
        satisfaction: "Individual and family report high satisfaction with services and supports. No concerns raised.",
      },
      created_at: new Date(Date.now() - 95 * 86400000), updated_at: new Date(Date.now() - 95 * 86400000),
    },
    {
      individual_id: individualId, type: "Quarterly", status: "Submitted", active: "Active",
      due_date: daysAgo(10), submitted_date: daysAgo(12),
      updated_by: cm.name, updated_on: daysAgo(12), author_uid: cm.uid,
      sections: {
        health_safety: "No incidents this quarter. Medical appointments attended as scheduled. Behavioral health stable.",
        goal_progress: "Continued progress on all ISP goals. Community integration goal showing particularly strong results — attendance and participation both excellent. Employment exploration added as new goal this quarter.",
        service_utilization: "All services fully utilized. Service authorization renewal submitted ahead of deadline.",
        satisfaction: "Individual is engaged and motivated. Family reports very positive changes over the past 6 months.",
      },
      created_at: new Date(Date.now() - 12 * 86400000), updated_at: new Date(Date.now() - 12 * 86400000),
    },
    {
      individual_id: individualId, type: "Quarterly", status: "In Progress", active: "Active",
      due_date: daysFromNow(80),
      updated_by: cm.name, updated_on: daysAgo(2), author_uid: cm.uid,
      sections: {
        health_safety: "Monitoring in progress — no incidents to date this quarter.",
        goal_progress: "In progress — to be completed at next home visit.",
        service_utilization: "Services ongoing and within authorized range.",
        satisfaction: "Ongoing — to be collected at next visit.",
      },
      created_at: new Date(Date.now() - 2 * 86400000), updated_at: new Date(Date.now() - 2 * 86400000),
    },
  ];
}

function makeReferrals(individualId, firstName, cm) {
  return [
    {
      individual_id: individualId, individual_name: firstName,
      referral_type: "Day Program / Social & Recreational",
      referred_to: "County Day Habilitation Services",
      referred_by: cm.name, referred_by_uid: cm.uid,
      date: daysAgo(145), priority: "routine", status: "completed",
      notes: `Day habilitation referral for ${firstName} aligned with ISP Community Integration goal. Enrollment confirmed.`,
      outcome: `Successfully enrolled. ${firstName} attends 5 days/week. Attendance rate excellent. Staff report positive engagement.`,
      created_at: new Date(Date.now() - 145 * 86400000), updated_at: new Date(Date.now() - 120 * 86400000),
    },
    {
      individual_id: individualId, individual_name: firstName,
      referral_type: "Transportation",
      referred_to: "County Transit — Medicaid Paratransit",
      referred_by: cm.name, referred_by_uid: cm.uid,
      date: daysAgo(130), priority: "routine", status: "completed",
      notes: "Transportation referral to address barrier to community participation and medical appointments.",
      outcome: "Medicaid paratransit card issued. Transportation barrier significantly reduced.",
      created_at: new Date(Date.now() - 130 * 86400000), updated_at: new Date(Date.now() - 115 * 86400000),
    },
  ];
}

function makeServiceAuths(individualId, firstName, orgId, cm) {
  return [
    {
      individual_id: individualId, individual_name: firstName,
      service_name: "Case Management (T2022)", service_code: "T2022",
      provider: "County Case Management Services",
      authorized_units: 96, used_units: Math.floor(Math.random() * 50) + 20,
      unit_type: "hours", period: "Annual",
      start_date: daysAgo(150), end_date: daysFromNow(215),
      authorization_number: `SA-${new Date().getFullYear()}-${individualId.slice(-4)}-001`,
      status: "Active", funding_source: "Medicaid HCBS Waiver",
      created_at: new Date(Date.now() - 150 * 86400000), updated_at: new Date(),
    },
    {
      individual_id: individualId, individual_name: firstName,
      service_name: "Day Habilitation (T2021)", service_code: "T2021",
      provider: "County Day Services",
      authorized_units: 1000, used_units: Math.floor(Math.random() * 400) + 200,
      unit_type: "hours", period: "Annual",
      start_date: daysAgo(120), end_date: daysFromNow(215),
      authorization_number: `SA-${new Date().getFullYear()}-${individualId.slice(-4)}-002`,
      status: "Active", funding_source: "Medicaid HCBS Waiver",
      created_at: new Date(Date.now() - 120 * 86400000), updated_at: new Date(),
    },
  ];
}

function makeWorkflowTasks(individualId, firstName, cm) {
  return [
    {
      individual_id: individualId, individualId: individualId,
      title: `Complete quarterly monitoring form for ${firstName}`,
      description: `Q2 monitoring form is due. Review all goal progress, service utilization, and satisfaction data collected during home visits and phone check-ins.`,
      category: "Compliance",
      priority: "high", status: "open",
      due_date: daysFromNow(15),
      assigned_to_uid: cm.uid, assigned_to_name: cm.name,
      created_at: new Date(Date.now() - 3 * 86400000), updated_at: new Date(Date.now() - 3 * 86400000),
    },
    {
      individual_id: individualId, individualId: individualId,
      title: `Schedule next home visit — ${firstName}`,
      description: `90-day home visit is due. Contact family to schedule. Review current ISP goals and service authorizations before visit.`,
      category: "Case Management",
      priority: "medium", status: "open",
      due_date: daysFromNow(30),
      assigned_to_uid: cm.uid, assigned_to_name: cm.name,
      created_at: new Date(Date.now() - 5 * 86400000), updated_at: new Date(Date.now() - 5 * 86400000),
    },
    {
      individual_id: individualId, individualId: individualId,
      title: `Review service authorization renewal — ${firstName}`,
      description: `Current service authorizations expire in ~215 days. Begin renewal process at least 60 days before expiration to avoid service interruption.`,
      category: "Billing",
      priority: "low", status: "open",
      due_date: daysFromNow(155),
      assigned_to_uid: cm.uid, assigned_to_name: cm.name,
      created_at: new Date(Date.now() - 1 * 86400000), updated_at: new Date(Date.now() - 1 * 86400000),
    },
  ];
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Fetching all individuals...\n");

  const sQ = { from: [{ collectionId: "individuals" }], limit: 100 };
  const result = await request("POST", `/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`, { structuredQuery: sQ });
  const individuals = result.filter(r => r.document).map(r => {
    const id = r.document.name.split("/").pop();
    const fields = r.document.fields || {};
    const obj = { id };
    for (const [k, v] of Object.entries(fields)) obj[k] = extractValue(v);
    return obj;
  });

  console.log(`Found ${individuals.length} individuals.\n`);

  let totalWritten = 0;
  let skipped = 0;
  let cmIndex = 0;

  for (const ind of individuals) {
    const firstName = ind.first_name || "Unknown";
    const lastName = ind.last_name || "";
    const displayName = `${firstName} ${lastName}`.trim();
    const orgId = ind.organizationId || ind.organization_id || "demo-org-001";

    // Round-robin case managers
    const cm = CASE_MANAGERS[cmIndex % CASE_MANAGERS.length];
    cmIndex++;

    // Check if this individual already has visit_summaries
    const existing = await runQuery("visit_summaries", [["individual_id", ind.id]], 1);
    if (existing.length > 0) {
      console.log(`  ⏭  ${displayName} (${ind.id}) — already has visit data, skipping`);
      skipped++;
      continue;
    }

    console.log(`  📝 Seeding ${displayName} (${ind.id})...`);
    let count = 0;

    // Visit summaries
    for (const doc of makeVisitSummaries(ind.id, firstName, cm, orgId)) {
      await addDoc("visit_summaries", doc);
      count++;
    }

    // Contact notes
    for (const doc of makeContactNotes(ind.id, firstName, cm)) {
      await addDoc("contact_notes", doc);
      count++;
    }

    // Care plans
    for (const doc of makeCarePlan(ind.id, firstName, cm)) {
      await addDoc("care_plans", doc);
      count++;
    }

    // Monitoring forms
    for (const doc of makeMonitoringForms(ind.id, cm)) {
      await addDoc("monitoring_forms", doc);
      count++;
    }

    // Referrals
    for (const doc of makeReferrals(ind.id, firstName, cm)) {
      await addDoc("referrals", doc);
      count++;
    }

    // Service authorizations
    for (const doc of makeServiceAuths(ind.id, firstName, orgId, cm)) {
      await addDoc("service_authorizations", doc);
      count++;
    }

    // Workflow tasks (open tasks that power the OPEN TASKS stat)
    for (const doc of makeWorkflowTasks(ind.id, firstName, cm)) {
      await addDoc("workflow_tasks", doc);
      count++;
    }

    totalWritten += count;
    console.log(`     ✅ ${count} documents written`);
  }

  console.log(`\n🎉 Done! Seeded ${individuals.length - skipped} individuals with ${totalWritten} total documents.`);
  console.log(`   ${skipped} individuals were skipped (already had data).`);
}

main().catch(err => { console.error("❌ Error:", err.message || err); process.exit(1); });
