"use strict";
// AI Forms API — All form pre-fill endpoints
// CaseManagement.AI — Uses Gemini 2.0 Flash (fast tier) for all form pre-fills
// NEVER saves to Firestore — returns suggestions only. User confirms before saving.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressNotePrefill = progressNotePrefill;
exports.monitoringFormPrefill = monitoringFormPrefill;
exports.visitSummaryPrefill = visitSummaryPrefill;
exports.carePlanDraft = carePlanDraft;
const admin = __importStar(require("firebase-admin"));
const ai_1 = require("../services/ai");
const credits_1 = require("../services/credits");
const audit_1 = require("../services/audit");
const collections_1 = require("../config/collections");
// ─── Progress Note Pre-fill ───────────────────────────────────────────────
async function progressNotePrefill(req, res) {
    var _a;
    try {
        const { individualId, organizationId, userId, userName, userRole } = req.body;
        if (!individualId || !organizationId || !userId) {
            res.status(400).json({ error: "Missing required fields." });
            return;
        }
        const db = admin.firestore();
        // Load context data
        const [individualSnap, notesSnap, monitoringSnap, carePlanSnap] = await Promise.all([
            db.collection(collections_1.COLLECTIONS.INDIVIDUALS).doc(individualId).get(),
            db.collection(collections_1.COLLECTIONS.CONTACT_NOTES)
                .where("individualId", "==", individualId)
                .orderBy("activity_date", "desc")
                .limit(5)
                .get(),
            db.collection(collections_1.COLLECTIONS.MONITORING_FORMS)
                .where("individualId", "==", individualId)
                .orderBy("complete_date", "desc")
                .limit(3)
                .get(),
            db.collection(collections_1.COLLECTIONS.CARE_PLANS)
                .where("individualId", "==", individualId)
                .where("plan_status", "==", "in_progress")
                .limit(1)
                .get(),
        ]);
        const individual = individualSnap.data();
        const notes = notesSnap.docs.map((d) => d.data());
        const monitoring = monitoringSnap.docs.map((d) => d.data());
        const carePlan = carePlanSnap.empty ? null : carePlanSnap.docs[0].data();
        const context = JSON.stringify({
            individual: {
                name: `${individual === null || individual === void 0 ? void 0 : individual.first_name} ${individual === null || individual === void 0 ? void 0 : individual.last_name}`,
                preferred_name: individual === null || individual === void 0 ? void 0 : individual.preferred_name,
                diagnosis: individual === null || individual === void 0 ? void 0 : individual.diagnosis,
                risk_score: individual === null || individual === void 0 ? void 0 : individual.risk_score,
            },
            recent_notes: notes.map((n) => ({
                date: n.activity_date,
                type: n.activity_type,
                purpose: n.purpose_of_activity,
                issues: n.issues_concerns,
                next_steps: n.next_steps,
            })),
            monitoring_summary: monitoring.map((m) => {
                var _a;
                return ({
                    date: m.complete_date,
                    goal_progress: (_a = m.sections) === null || _a === void 0 ? void 0 : _a.s4_progress_toward_outcomes,
                });
            }),
            active_goals: (_a = carePlan === null || carePlan === void 0 ? void 0 : carePlan.goals) === null || _a === void 0 ? void 0 : _a.filter((g) => g.progress_status !== "met"),
        });
        const systemPrompt = `You are an expert IDD case management specialist helping a case manager pre-fill a progress note. 
Your suggestions should be professional, specific, and based on the documentation history provided.
Always respond with valid JSON only. No markdown, no explanation.`;
        const userPrompt = `Based on the individual's profile and recent documentation, suggest values for a new progress note.
Return JSON with these fields:
- activityType: string (e.g., "Home Visit", "Phone Contact", "Community Integration")
- contactType: string (e.g., "In-Person", "Phone", "Virtual")
- purposeOfActivity: string (2-3 sentences)
- goalProgress: array of {goal_id, goal_title, progress_text, goal_status} for each active goal
- additionalObservations: string
- nextSteps: string`;
        const result = await (0, ai_1.generateCompletion)(systemPrompt, userPrompt, context, "fast", organizationId, userId, "progress_note_prefill");
        // Consume credits
        await (0, credits_1.consumeCredits)({
            organizationId,
            userId,
            userName: userName !== null && userName !== void 0 ? userName : "Unknown",
            userRole: userRole !== null && userRole !== void 0 ? userRole : "case_manager",
            feature: "progress_note_prefill",
            model: "gemini-flash-latest",
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            individualId,
        });
        // Audit
        await (0, audit_1.logAction)({
            organizationId,
            actorUid: userId,
            actorName: userName !== null && userName !== void 0 ? userName : "Unknown",
            actorRole: userRole !== null && userRole !== void 0 ? userRole : "case_manager",
            action: "AI_PREFILL_REQUESTED",
            collectionName: collections_1.COLLECTIONS.PROGRESS_NOTES,
            recordId: "new",
            individualId,
            summary: `AI pre-fill requested for progress note`,
            source: "ai",
        });
        // Parse the JSON response
        let suggestions;
        try {
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.text };
        }
        catch (_b) {
            suggestions = { raw: result.text };
        }
        res.json({ success: true, suggestions, ai_session_id: Date.now().toString() });
    }
    catch (error) {
        const message = error.message;
        if (["AI_PAUSED", "INSUFFICIENT_CREDITS", "DAILY_LIMIT_REACHED"].includes(message)) {
            res.status(402).json({ error: message });
        }
        else {
            console.error("[progress-note-prefill]", error);
            res.status(500).json({ error: "AI service temporarily unavailable." });
        }
    }
}
// ─── Monitoring Form Pre-fill ─────────────────────────────────────────────
async function monitoringFormPrefill(req, res) {
    var _a, _b;
    try {
        const { individualId, organizationId, userId, userName, userRole } = req.body;
        if (!individualId || !organizationId || !userId) {
            res.status(400).json({ error: "Missing required fields." });
            return;
        }
        const db = admin.firestore();
        const [individualSnap, visitSnap, contactSnap, progressSnap, monitoringSnap, incidentsSnap] = await Promise.all([
            db.collection(collections_1.COLLECTIONS.INDIVIDUALS).doc(individualId).get(),
            db.collection(collections_1.COLLECTIONS.VISIT_SUMMARIES)
                .where("individualId", "==", individualId)
                .orderBy("visitDate", "desc")
                .limit(3)
                .get(),
            db.collection(collections_1.COLLECTIONS.CONTACT_NOTES)
                .where("individualId", "==", individualId)
                .orderBy("activity_date", "desc")
                .limit(5)
                .get(),
            db.collection(collections_1.COLLECTIONS.PROGRESS_NOTES)
                .where("individualId", "==", individualId)
                .orderBy("created_at", "desc")
                .limit(2)
                .get(),
            db.collection(collections_1.COLLECTIONS.MONITORING_FORMS)
                .where("individualId", "==", individualId)
                .orderBy("created_at", "desc")
                .limit(1)
                .get(),
            db.collection(collections_1.COLLECTIONS.INCIDENTS)
                .where("individualId", "==", individualId)
                .where("status", "==", "open")
                .limit(5)
                .get(),
        ]);
        const individual = individualSnap.data();
        const visits = visitSnap.docs.map((d) => d.data());
        const contacts = contactSnap.docs.map((d) => d.data());
        const progressNotes = progressSnap.docs.map((d) => d.data());
        const lastMonitoring = monitoringSnap.empty ? null : monitoringSnap.docs[0].data();
        const openIncidents = incidentsSnap.docs.map((d) => d.data());
        const context = JSON.stringify({
            individual: {
                name: `${individual === null || individual === void 0 ? void 0 : individual.first_name} ${individual === null || individual === void 0 ? void 0 : individual.last_name}`,
                preferred_name: individual === null || individual === void 0 ? void 0 : individual.preferred_name,
                diagnosis: individual === null || individual === void 0 ? void 0 : individual.diagnosis,
                risk_score: individual === null || individual === void 0 ? void 0 : individual.risk_score,
                risk_level: individual === null || individual === void 0 ? void 0 : individual.risk_level,
                program: individual === null || individual === void 0 ? void 0 : individual.program,
                level_of_care: individual === null || individual === void 0 ? void 0 : individual.level_of_care,
            },
            recent_visits: visits.map((v) => ({
                date: v.visitDate,
                purpose: v.purposeOfSupport,
                working: v.whatIsWorking,
                not_working: v.whatIsNotWorking,
                next_steps: v.visitSummaryAndNextSteps,
            })),
            recent_contacts: contacts.map((c) => ({
                date: c.activity_date,
                type: c.activity_type,
                purpose: c.purpose_of_activity,
                issues: c.issues_concerns,
                next_steps: c.next_steps,
            })),
            recent_progress_notes: progressNotes.map((p) => ({
                date: p.created_at,
                observations: p.additionalObservations,
                next_steps: p.nextSteps,
            })),
            last_monitoring_form: lastMonitoring ? {
                date: lastMonitoring.created_at,
                s2_any_yes: (_a = lastMonitoring.s2_circumstances) === null || _a === void 0 ? void 0 : _a.some((q) => q.answer === "Yes"),
                s6_risk_score: lastMonitoring.s6_riskScore,
                s9_actions: (_b = lastMonitoring.s9_recommendedActions) === null || _b === void 0 ? void 0 : _b.map((a) => a.text),
            } : null,
            open_incidents: openIncidents.map((i) => ({
                type: i.incidentType,
                date: i.incidentDate,
                description: i.description,
            })),
        });
        const systemPrompt = `You are an expert IDD case management specialist pre-filling a Quarterly/Monthly Monitoring Review form.
Based on recent documentation, suggest appropriate answers for each section.
Use simple, professional language appropriate for state regulatory review.
Always respond with valid JSON only. No markdown, no explanation.`;
        const userPrompt = `Based on the individual's profile and recent documentation history, suggest values for a new monitoring form.
Return JSON with these exact fields:
{
  "s2_circumstances": [
    { "id": "c1", "answer": "Yes" or "No", "explain": "brief explanation if Yes" },
    { "id": "c2", "answer": "Yes" or "No", "explain": "" },
    { "id": "c3", "answer": "Yes" or "No", "explain": "" },
    { "id": "c4", "answer": "Yes" or "No", "explain": "" }
  ],
  "s3_satisfaction": [
    { "id": "sat1", "answer": "Yes" or "No", "explain": "" },
    { "id": "sat2", "answer": "Yes" or "No", "explain": "" },
    { "id": "sat3", "answer": "Yes" or "No", "explain": "" }
  ],
  "s4_progress_notes": "narrative describing overall progress toward goals",
  "s5_choice": [
    { "id": "ch1", "answer": "Yes" or "No", "explain": "" },
    { "id": "ch2", "answer": "Yes" or "No", "explain": "" }
  ],
  "s6_risk_score": number (0-10),
  "s6_risk_notes": "brief explanation",
  "s7_backup_summary": "narrative about backup and emergency plan status",
  "s8_incidents": [
    { "id": "i1", "answer": "Yes" or "No", "explain": "" }
  ],
  "s9_recommended_actions": ["action 1 text", "action 2 text"],
  "s10_contact_note": "brief summary of recent contact attempts"
}`;
        const result = await (0, ai_1.generateCompletion)(systemPrompt, userPrompt, context, "fast", organizationId, userId, "monitoring_form_prefill");
        await (0, credits_1.consumeCredits)({
            organizationId,
            userId,
            userName: userName !== null && userName !== void 0 ? userName : "Unknown",
            userRole: userRole !== null && userRole !== void 0 ? userRole : "case_manager",
            feature: "monitoring_form_prefill",
            model: "gemini-flash-latest",
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            individualId,
        });
        await (0, audit_1.logAction)({
            organizationId,
            actorUid: userId,
            actorName: userName !== null && userName !== void 0 ? userName : "Unknown",
            actorRole: userRole !== null && userRole !== void 0 ? userRole : "case_manager",
            action: "AI_PREFILL_REQUESTED",
            collectionName: collections_1.COLLECTIONS.MONITORING_FORMS,
            recordId: "new",
            individualId,
            summary: `AI pre-fill requested for monitoring form`,
            source: "ai",
        });
        let suggestions;
        try {
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.text };
        }
        catch (_c) {
            suggestions = { raw: result.text };
        }
        res.json({ success: true, suggestions, ai_session_id: Date.now().toString() });
    }
    catch (error) {
        const message = error.message;
        if (["AI_PAUSED", "INSUFFICIENT_CREDITS", "DAILY_LIMIT_REACHED"].includes(message)) {
            res.status(402).json({ error: message });
        }
        else {
            console.error("[monitoring-form-prefill]", error);
            res.status(500).json({ error: "AI service temporarily unavailable." });
        }
    }
}
// ─── Visit Summary Pre-fill ───────────────────────────────────────────────
async function visitSummaryPrefill(req, res) {
    var _a;
    try {
        const { individualId, organizationId, userId, userName, userRole } = req.body;
        if (!individualId || !organizationId || !userId) {
            res.status(400).json({ error: "Missing required fields." });
            return;
        }
        const db = admin.firestore();
        const [individualSnap, contactSnap, monitoringSnap, lastVisitSnap] = await Promise.all([
            db.collection(collections_1.COLLECTIONS.INDIVIDUALS).doc(individualId).get(),
            db.collection(collections_1.COLLECTIONS.CONTACT_NOTES)
                .where("individualId", "==", individualId)
                .orderBy("activity_date", "desc")
                .limit(3)
                .get(),
            db.collection(collections_1.COLLECTIONS.MONITORING_FORMS)
                .where("individualId", "==", individualId)
                .orderBy("created_at", "desc")
                .limit(1)
                .get(),
            db.collection(collections_1.COLLECTIONS.VISIT_SUMMARIES)
                .where("individualId", "==", individualId)
                .orderBy("visitDate", "desc")
                .limit(1)
                .get(),
        ]);
        const individual = individualSnap.data();
        const contacts = contactSnap.docs.map((d) => d.data());
        const lastMonitoring = monitoringSnap.empty ? null : monitoringSnap.docs[0].data();
        const lastVisit = lastVisitSnap.empty ? null : lastVisitSnap.docs[0].data();
        // Suggest next visit date (30 days from today by default)
        const nextVisitDate = new Date();
        nextVisitDate.setDate(nextVisitDate.getDate() + 30);
        const nextVisitDateStr = nextVisitDate.toISOString().split("T")[0];
        const context = JSON.stringify({
            individual: {
                name: `${individual === null || individual === void 0 ? void 0 : individual.first_name} ${individual === null || individual === void 0 ? void 0 : individual.last_name}`,
                preferred_name: individual === null || individual === void 0 ? void 0 : individual.preferred_name,
                diagnosis: individual === null || individual === void 0 ? void 0 : individual.diagnosis,
                risk_score: individual === null || individual === void 0 ? void 0 : individual.risk_score,
                program: individual === null || individual === void 0 ? void 0 : individual.program,
                next_visit_date: individual === null || individual === void 0 ? void 0 : individual.next_visit_date,
            },
            recent_contacts: contacts.map((c) => ({
                date: c.activity_date,
                type: c.activity_type,
                purpose: c.purpose_of_activity,
                issues: c.issues_concerns,
                next_steps: c.next_steps,
            })),
            last_monitoring: lastMonitoring ? {
                date: lastMonitoring.created_at,
                s6_risk_score: lastMonitoring.s6_riskScore,
                s9_actions: (_a = lastMonitoring.s9_recommendedActions) === null || _a === void 0 ? void 0 : _a.map((a) => a.text),
            } : null,
            last_visit: lastVisit ? {
                date: lastVisit.visitDate,
                purpose: lastVisit.purposeOfSupport,
                working: lastVisit.whatIsWorking,
                not_working: lastVisit.whatIsNotWorking,
                next_steps: lastVisit.visitSummaryAndNextSteps,
            } : null,
        });
        const systemPrompt = `You are an expert IDD case management specialist helping pre-fill a visit summary note.
Write in first-person case manager voice. Be specific, professional, and HIPAA-safe.
Always respond with valid JSON only. No markdown, no explanation.`;
        const userPrompt = `Based on the individual's recent documentation, suggest values for a new visit summary.
Return JSON with exactly these fields:
{
  "purposeOfSupport": "2-3 sentence description of the purpose of this visit",
  "whatIsWorking": "1-2 sentences describing what is working well",
  "whatIsNotWorking": "1-2 sentences describing challenges or concerns",
  "visitSummaryAndNextSteps": "2-4 sentences summarizing visit and recommended next steps",
  "nextVisitDate": "${nextVisitDateStr}",
  "serviceCode": "T2022"
}`;
        const result = await (0, ai_1.generateCompletion)(systemPrompt, userPrompt, context, "fast", organizationId, userId, "visit_summary_prefill");
        await (0, credits_1.consumeCredits)({
            organizationId,
            userId,
            userName: userName !== null && userName !== void 0 ? userName : "Unknown",
            userRole: userRole !== null && userRole !== void 0 ? userRole : "case_manager",
            feature: "visit_summary_prefill",
            model: "gemini-flash-latest",
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            individualId,
        });
        await (0, audit_1.logAction)({
            organizationId,
            actorUid: userId,
            actorName: userName !== null && userName !== void 0 ? userName : "Unknown",
            actorRole: userRole !== null && userRole !== void 0 ? userRole : "case_manager",
            action: "AI_PREFILL_REQUESTED",
            collectionName: collections_1.COLLECTIONS.VISIT_SUMMARIES,
            recordId: "new",
            individualId,
            summary: `AI pre-fill requested for visit summary`,
            source: "ai",
        });
        let suggestions;
        try {
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.text };
        }
        catch (_b) {
            suggestions = { raw: result.text };
        }
        res.json({ success: true, suggestions, ai_session_id: Date.now().toString() });
    }
    catch (error) {
        const message = error.message;
        if (["AI_PAUSED", "INSUFFICIENT_CREDITS", "DAILY_LIMIT_REACHED"].includes(message)) {
            res.status(402).json({ error: message });
        }
        else {
            console.error("[visit-summary-prefill]", error);
            res.status(500).json({ error: "AI service temporarily unavailable." });
        }
    }
}
// ─── Care Plan Draft ──────────────────────────────────────────────────────
async function carePlanDraft(req, res) {
    var _a, _b;
    try {
        const { individualId, organizationId, userId, userName, userRole } = req.body;
        if (!individualId || !organizationId || !userId) {
            res.status(400).json({ error: "Missing required fields." });
            return;
        }
        const db = admin.firestore();
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const twelveMonthsAgoTs = admin.firestore.Timestamp.fromDate(twelveMonthsAgo);
        const [individualSnap, monitoringSnap, visitSnap, contactSnap, carePlanSnap] = await Promise.all([
            db.collection(collections_1.COLLECTIONS.INDIVIDUALS).doc(individualId).get(),
            db.collection(collections_1.COLLECTIONS.MONITORING_FORMS)
                .where("individualId", "==", individualId)
                .where("created_at", ">=", twelveMonthsAgoTs)
                .orderBy("created_at", "desc")
                .limit(12)
                .get(),
            db.collection(collections_1.COLLECTIONS.VISIT_SUMMARIES)
                .where("individualId", "==", individualId)
                .where("createdAt", ">=", twelveMonthsAgoTs)
                .orderBy("createdAt", "desc")
                .limit(12)
                .get(),
            db.collection(collections_1.COLLECTIONS.CONTACT_NOTES)
                .where("individualId", "==", individualId)
                .orderBy("activity_date", "desc")
                .limit(10)
                .get(),
            db.collection(collections_1.COLLECTIONS.CARE_PLANS)
                .where("individualId", "==", individualId)
                .orderBy("created_at", "desc")
                .limit(1)
                .get(),
        ]);
        const individual = individualSnap.data();
        const monitoringForms = monitoringSnap.docs.map((d) => d.data());
        const visitSummaries = visitSnap.docs.map((d) => d.data());
        const contactNotes = contactSnap.docs.map((d) => d.data());
        const currentPlan = carePlanSnap.empty ? null : carePlanSnap.docs[0].data();
        // Calculate next year for target dates
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const targetDate = nextYear.toISOString().split("T")[0];
        const context = JSON.stringify({
            individual: {
                name: `${individual === null || individual === void 0 ? void 0 : individual.first_name} ${individual === null || individual === void 0 ? void 0 : individual.last_name}`,
                preferred_name: individual === null || individual === void 0 ? void 0 : individual.preferred_name,
                diagnosis: individual === null || individual === void 0 ? void 0 : individual.diagnosis,
                risk_score: individual === null || individual === void 0 ? void 0 : individual.risk_score,
                risk_level: individual === null || individual === void 0 ? void 0 : individual.risk_level,
                program: individual === null || individual === void 0 ? void 0 : individual.program,
                level_of_care: individual === null || individual === void 0 ? void 0 : individual.level_of_care,
                gender: individual === null || individual === void 0 ? void 0 : individual.gender,
                age: individual === null || individual === void 0 ? void 0 : individual.dob,
            },
            monitoring_summary: monitoringForms.slice(0, 4).map((m) => {
                var _a, _b, _c, _d, _e;
                return ({
                    date: m.created_at,
                    s6_risk: m.s6_riskScore,
                    actions: (_b = (_a = m.s9_recommendedActions) === null || _a === void 0 ? void 0 : _a.map((a) => a.text)) === null || _b === void 0 ? void 0 : _b.slice(0, 3),
                    circumstances_concerns: (_e = (_d = (_c = m.s2_circumstances) === null || _c === void 0 ? void 0 : _c.filter((q) => q.answer === "Yes")) === null || _d === void 0 ? void 0 : _d.map((q) => q.question)) === null || _e === void 0 ? void 0 : _e.slice(0, 3),
                });
            }),
            visit_themes: visitSummaries.slice(0, 4).map((v) => ({
                date: v.visitDate,
                working: v.whatIsWorking,
                not_working: v.whatIsNotWorking,
                next_steps: v.visitSummaryAndNextSteps,
            })),
            contact_themes: contactNotes.slice(0, 5).map((c) => ({
                date: c.activity_date,
                purpose: c.purpose_of_activity,
                issues: c.issues_concerns,
                next_steps: c.next_steps,
            })),
            current_plan_goals: (_b = (_a = currentPlan === null || currentPlan === void 0 ? void 0 : currentPlan.goals) === null || _a === void 0 ? void 0 : _a.map((g) => ({ title: g.title, status: g.progress_status }))) !== null && _b !== void 0 ? _b : [],
        });
        const systemPrompt = `You are an expert IDD case management specialist drafting a Person-Centered Support Plan (ISP/Care Plan).
Based on 12 months of documentation history, generate meaningful, specific, measurable goals.
Goals must be person-centered, strengths-based, and tied to the individual's documented needs.
Write in professional case management language appropriate for state regulatory review.
Always respond with valid JSON only. No markdown, no explanation.`;
        const userPrompt = `Based on the individual's 12-month documentation history, draft a complete care plan.
Return JSON with exactly this structure:
{
  "plan_year": "${new Date().getFullYear()}-${new Date().getFullYear() + 1}",
  "plan_status": "Draft",
  "ai_drafted": true,
  "goals": [
    {
      "id": "G1",
      "title": "Goal title (short, 5-8 words)",
      "description": "2-3 sentence description of the goal, person-centered",
      "domain": "Health" or "Community" or "Employment" or "Independence" or "Safety" or "Social",
      "target_date": "${targetDate}",
      "responsible_party": "Case Manager",
      "progress_status": "In Progress",
      "objectives": [
        {
          "id": "G1-O1",
          "text": "Specific measurable objective",
          "frequency": "Monthly" or "Quarterly" or "Weekly",
          "status": "Active"
        }
      ]
    }
  ],
  "strengths": "2-3 sentences about documented strengths",
  "vision_statement": "1-2 sentences about the individual's vision for their life",
  "plan_notes": "Brief summary of key themes from documentation history"
}
Generate 3-5 goals based on patterns identified in the documentation.`;
        const result = await (0, ai_1.generateCompletion)(systemPrompt, userPrompt, context, "fast", organizationId, userId, "care_plan_draft", { maxTokens: 4096 });
        await (0, credits_1.consumeCredits)({
            organizationId,
            userId,
            userName: userName !== null && userName !== void 0 ? userName : "Unknown",
            userRole: userRole !== null && userRole !== void 0 ? userRole : "case_manager",
            feature: "care_plan_draft",
            model: "gemini-flash-latest",
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            individualId,
        });
        await (0, audit_1.logAction)({
            organizationId,
            actorUid: userId,
            actorName: userName !== null && userName !== void 0 ? userName : "Unknown",
            actorRole: userRole !== null && userRole !== void 0 ? userRole : "case_manager",
            action: "AI_CARE_PLAN_DRAFTED",
            collectionName: collections_1.COLLECTIONS.CARE_PLANS,
            recordId: "new",
            individualId,
            summary: `AI care plan draft generated`,
            source: "ai",
        });
        let draft;
        try {
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            draft = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.text };
        }
        catch (_c) {
            draft = { raw: result.text };
        }
        res.json({ success: true, draft, ai_session_id: Date.now().toString() });
    }
    catch (error) {
        const message = error.message;
        if (["AI_PAUSED", "INSUFFICIENT_CREDITS", "DAILY_LIMIT_REACHED"].includes(message)) {
            res.status(402).json({ error: message });
        }
        else {
            console.error("[care-plan-draft]", error);
            res.status(500).json({ error: "AI service temporarily unavailable." });
        }
    }
}
//# sourceMappingURL=ai-forms.js.map