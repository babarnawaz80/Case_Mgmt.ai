"use strict";
// Renewal Agent — Brain Orchestrator
// The most important agent. Tracks all renewal cycles and generates renewal packets.
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
exports.runRenewalAgent = runRenewalAgent;
const admin = __importStar(require("firebase-admin"));
const ai_1 = require("../../services/ai");
function daysUntil(dateStr) {
    if (!dateStr)
        return 9999;
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
function addDays(d, days) {
    const r = new Date(d);
    r.setDate(r.getDate() + days);
    return r;
}
async function runRenewalAgent(individual, rulePack, runId, orgId, db, customPrompt) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const tasks = [];
    const logs = [];
    let draftsCount = 0;
    const indName = `${individual.first_name} ${individual.last_name}`;
    const assignedTo = (_a = individual.assigned_case_manager_uid) !== null && _a !== void 0 ? _a : "";
    const assignedName = (_b = individual.assigned_case_manager_name) !== null && _b !== void 0 ? _b : "Unassigned";
    const now = new Date();
    // ── 1. Annual ISP/PCP renewal tracking ─────────────────────────────────────
    const pcpDueDate = (_c = individual.pcp_due_date) !== null && _c !== void 0 ? _c : individual.isp_due_date;
    if (pcpDueDate) {
        const daysUntilPcp = daysUntil(pcpDueDate);
        // 60 days out: generate AI renewal packet
        if (daysUntilPcp > 0 && daysUntilPcp <= 60) {
            logs.push({
                org_id: orgId,
                individual_id: individual.id,
                agent: "renewal",
                action: "PCP_RENEWAL_PACKET_GENERATION",
                rule_applied: "60-day PCP renewal preparation threshold",
                finding: `PCP due in ${daysUntilPcp} days`,
                result: "Queued AI draft renewal packet generation",
            });
            // Generate AI draft renewal packet (non-blocking — best effort)
            generateRenewalDraft(individual, runId, orgId, db, customPrompt).catch((err) => {
                console.warn(`[RenewalAgent] Draft generation failed for ${individual.id}:`, err.message);
            });
            draftsCount++;
        }
        // 90 days out: create renewal approaching task
        if (daysUntilPcp > 0 && daysUntilPcp <= 90 && daysUntilPcp > 60) {
            tasks.push({
                org_id: orgId,
                individual_id: individual.id,
                individual_name: indName,
                assigned_to_user_id: assignedTo,
                assigned_to_name: assignedName,
                task_type: "pcp_renewal",
                severity: "medium",
                title: `PCP renewal approaching — ${indName} (${daysUntilPcp} days)`,
                description: `Annual Person-Centered Plan renewal due on ${pcpDueDate}. Begin preparation in the next 30 days.`,
                rule_reference: `${(_d = rulePack.state) !== null && _d !== void 0 ? _d : "Indiana"} ${(_e = rulePack.program) !== null && _e !== void 0 ? _e : "DDA Waiver"} — Annual ISP/PCP renewal`,
                due_date: admin.firestore.Timestamp.fromDate(addDays(new Date(pcpDueDate), -30)),
                days_overdue: 0,
                has_ai_draft: false,
                ai_draft_id: null,
                source_agent: "renewal",
                status: "pending",
            });
            logs.push({
                org_id: orgId,
                individual_id: individual.id,
                agent: "renewal",
                action: "PCP_RENEWAL_TASK_CREATED",
                rule_applied: "90-day PCP renewal approaching threshold",
                finding: `PCP due in ${daysUntilPcp} days on ${pcpDueDate}`,
                result: "Task created: pcp_renewal (90-day warning)",
            });
        }
        // 7 days: alert supervisor
        if (daysUntilPcp > 0 && daysUntilPcp <= 7 && individual.assigned_supervisor_uid) {
            try {
                await db.collection("notifications").add({
                    uid: individual.assigned_supervisor_uid,
                    organizationId: orgId,
                    type: "alert",
                    title: `URGENT: PCP expires in ${daysUntilPcp} days — ${indName}`,
                    body: `Person-Centered Plan for ${indName} expires on ${pcpDueDate}. Immediate review required.`,
                    href: `/people/${individual.id}/care-plan`,
                    read: false,
                    dismissed: false,
                    severity: "critical",
                    source: "brain_orchestrator",
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            catch (_k) {
                // Non-fatal
            }
            logs.push({
                org_id: orgId,
                individual_id: individual.id,
                agent: "renewal",
                action: "PCP_URGENT_SUPERVISOR_ALERT",
                rule_applied: "7-day critical PCP renewal alert",
                finding: `PCP expires in ${daysUntilPcp} days`,
                result: "Supervisor notified via notification system",
            });
        }
    }
    // ── 2. Annual assessment tracking ───────────────────────────────────────────
    const assessmentDueDate = computeNextAssessmentDate(individual, rulePack);
    if (assessmentDueDate) {
        const daysUntilAssessment = daysUntil(assessmentDueDate);
        if (daysUntilAssessment < 0) {
            tasks.push({
                org_id: orgId,
                individual_id: individual.id,
                individual_name: indName,
                assigned_to_user_id: assignedTo,
                assigned_to_name: assignedName,
                task_type: "assessment_due",
                severity: "high",
                title: `Annual assessment overdue — ${indName}`,
                description: `Annual assessment was due on ${assessmentDueDate}. ${Math.abs(daysUntilAssessment)} days overdue.`,
                rule_reference: `${(_f = rulePack.state) !== null && _f !== void 0 ? _f : "Indiana"} ${(_g = rulePack.program) !== null && _g !== void 0 ? _g : "DDA Waiver"} — Annual assessment required every ${rulePack.assessment_frequency_months} months`,
                due_date: admin.firestore.Timestamp.fromDate(now),
                days_overdue: Math.abs(daysUntilAssessment),
                has_ai_draft: false,
                ai_draft_id: null,
                source_agent: "renewal",
                status: "pending",
            });
            logs.push({
                org_id: orgId,
                individual_id: individual.id,
                agent: "renewal",
                action: "ASSESSMENT_OVERDUE",
                rule_applied: `Annual assessment required every ${rulePack.assessment_frequency_months} months`,
                finding: `Assessment overdue by ${Math.abs(daysUntilAssessment)} days`,
                result: "Task created: assessment_due",
            });
        }
        else if (daysUntilAssessment <= 60) {
            tasks.push({
                org_id: orgId,
                individual_id: individual.id,
                individual_name: indName,
                assigned_to_user_id: assignedTo,
                assigned_to_name: assignedName,
                task_type: "assessment_due",
                severity: daysUntilAssessment <= 30 ? "high" : "medium",
                title: `Annual assessment approaching — ${indName} (${daysUntilAssessment} days)`,
                description: `Annual assessment due on ${assessmentDueDate}. Schedule within the next ${daysUntilAssessment} days.`,
                rule_reference: `${(_h = rulePack.state) !== null && _h !== void 0 ? _h : "Indiana"} ${(_j = rulePack.program) !== null && _j !== void 0 ? _j : "DDA Waiver"} — Annual assessment required`,
                due_date: admin.firestore.Timestamp.fromDate(addDays(new Date(assessmentDueDate), -7)),
                days_overdue: 0,
                has_ai_draft: false,
                ai_draft_id: null,
                source_agent: "renewal",
                status: "pending",
            });
            logs.push({
                org_id: orgId,
                individual_id: individual.id,
                agent: "renewal",
                action: "ASSESSMENT_APPROACHING",
                rule_applied: `Annual assessment required every ${rulePack.assessment_frequency_months} months`,
                finding: `Assessment due in ${daysUntilAssessment} days`,
                result: "Task created: assessment_due (approaching)",
            });
        }
    }
    return { tasks, logs, drafts_count: draftsCount };
}
function computeNextAssessmentDate(individual, rulePack) {
    const baseDate = individual.last_assessment_date;
    if (!baseDate)
        return null;
    const d = new Date(baseDate);
    d.setMonth(d.getMonth() + rulePack.assessment_frequency_months);
    return d.toISOString().split("T")[0];
}
async function generateRenewalDraft(individual, runId, orgId, db, customPrompt) {
    var _a;
    const indName = `${individual.first_name} ${individual.last_name}`;
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const twelveMonthsAgoTs = admin.firestore.Timestamp.fromDate(twelveMonthsAgo);
    // Load recent documentation (best effort)
    const [monForms, visitSummaries, progressNotes] = await Promise.allSettled([
        db.collection("monitoring_forms")
            .where("individualId", "==", individual.id)
            .where("createdAt", ">=", twelveMonthsAgoTs)
            .limit(8)
            .get(),
        db.collection("visit_summaries")
            .where("individualId", "==", individual.id)
            .where("createdAt", ">=", twelveMonthsAgoTs)
            .limit(8)
            .get(),
        db.collection("progress_notes")
            .where("individualId", "==", individual.id)
            .where("createdAt", ">=", twelveMonthsAgoTs)
            .limit(6)
            .get(),
    ]);
    const context = JSON.stringify({
        individual: {
            name: indName,
            program: individual.program,
            county: individual.county,
            pcp_due: (_a = individual.pcp_due_date) !== null && _a !== void 0 ? _a : individual.isp_due_date,
        },
        monitoring_forms: monForms.status === "fulfilled" ? monForms.value.docs.map((d) => d.data()) : [],
        visit_summaries: visitSummaries.status === "fulfilled" ? visitSummaries.value.docs.map((d) => d.data()) : [],
        progress_notes: progressNotes.status === "fulfilled" ? progressNotes.value.docs.map((d) => d.data()) : [],
    });
    const baseFormat = `Review this individual's 12-month documentation and create a brief renewal summary.
Return a JSON object with: goal_progress_summary (string), recommended_service_changes (string[]), key_highlights (string[]), and draft_goal_updates (string).
Keep all content concise and evidence-based from the documentation provided.
Label everything as AI DRAFT — requires CM review before submission.`;
    const systemPrompt = customPrompt
        ? `${customPrompt}\n\n${baseFormat}`
        : `You are an experienced IDD case management specialist.\n${baseFormat}`;
    const result = await (0, ai_1.generateCompletion)(systemPrompt, `Analyze the 12-month documentation for ${indName} and draft a PCP renewal summary.`, context, "fast", orgId, "system", "brain_orchestrator_renewal", { maxTokens: 2048, temperature: 0.3 });
    let parsedDraft = { raw_summary: result.text };
    try {
        const match = result.text.match(/\{[\s\S]*\}/);
        if (match)
            parsedDraft = JSON.parse(match[0]);
    }
    catch (_b) {
        // Keep raw text
    }
    await db.collection("orchestrator_drafts").add({
        individual_id: individual.id,
        individual_name: indName,
        org_id: orgId,
        run_id: runId,
        draft_type: "pcp_renewal_packet",
        status: "ai_draft",
        content: parsedDraft,
        ai_confidence: "medium",
        generated_by: "brain_orchestrator_v1",
        ai_disclaimer: "AI DRAFT — Requires review and approval before submission",
        fields_pre_filled: Object.keys(parsedDraft).length,
        fields_requiring_input: 3,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
}
//# sourceMappingURL=renewalAgent.js.map