"use strict";
// Documentation Agent — Brain Orchestrator
// Pre-fills forms and drafts documentation for overdue/due-soon compliance items.
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
exports.runDocumentationAgent = runDocumentationAgent;
const admin = __importStar(require("firebase-admin"));
const ai_1 = require("../../services/ai");
async function runDocumentationAgent(individual, complianceFindings, runId, orgId, db) {
    var _a;
    const tasks = [];
    const logs = [];
    let draftsCount = 0;
    const indName = `${individual.first_name} ${individual.last_name}`;
    // Only act on findings that need a draft
    const draftsNeeded = complianceFindings.filter((f) => f.requires_draft);
    if (draftsNeeded.length === 0) {
        return { tasks, logs, drafts_count: 0 };
    }
    // Load recent documentation context once
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgoTs = admin.firestore.Timestamp.fromDate(sixtyDaysAgo);
    let recentNotes = [];
    let recentVisits = [];
    try {
        const [notesSnap, visitsSnap] = await Promise.allSettled([
            db.collection("contact_notes")
                .where("individualId", "==", individual.id)
                .where("createdAt", ">=", sixtyDaysAgoTs)
                .orderBy("createdAt", "desc")
                .limit(5)
                .get(),
            db.collection("visit_summaries")
                .where("individualId", "==", individual.id)
                .where("createdAt", ">=", sixtyDaysAgoTs)
                .orderBy("createdAt", "desc")
                .limit(3)
                .get(),
        ]);
        if (notesSnap.status === "fulfilled") {
            recentNotes = notesSnap.value.docs.map((d) => d.data());
        }
        if (visitsSnap.status === "fulfilled") {
            recentVisits = visitsSnap.value.docs.map((d) => d.data());
        }
    }
    catch (_b) {
        // Non-fatal — proceed with empty context
    }
    for (const finding of draftsNeeded) {
        try {
            if (finding.type === "monitoring_form_overdue") {
                await generateMonitoringFormDraft(individual, indName, runId, orgId, recentNotes, recentVisits, db);
                draftsCount++;
                logs.push({
                    org_id: orgId,
                    individual_id: individual.id,
                    agent: "documentation",
                    action: "MONITORING_FORM_DRAFT_GENERATED",
                    rule_applied: "Pre-fill monitoring form from recent contact notes and visits",
                    finding: "Monitoring form overdue — draft generated from recent documentation",
                    result: "AI draft saved to orchestrator_drafts (status: ai_draft)",
                });
            }
            if (finding.type === "pcp_overdue" || finding.type === "pcp_approaching") {
                await generatePcpSummaryDraft(individual, indName, runId, orgId, db);
                draftsCount++;
                logs.push({
                    org_id: orgId,
                    individual_id: individual.id,
                    agent: "documentation",
                    action: "PCP_RENEWAL_DRAFT_GENERATED",
                    rule_applied: "Pre-generate PCP renewal summary from documentation history",
                    finding: "PCP renewal due — draft renewal summary generated",
                    result: "AI draft saved to orchestrator_drafts (status: ai_draft)",
                });
            }
        }
        catch (err) {
            logs.push({
                org_id: orgId,
                individual_id: individual.id,
                agent: "documentation",
                action: "DRAFT_GENERATION_FAILED",
                rule_applied: finding.rule_reference,
                finding: `Draft needed for: ${finding.type}`,
                result: `Error: ${(_a = err.message) !== null && _a !== void 0 ? _a : "Unknown error"}`,
            });
        }
    }
    return { tasks, logs, drafts_count: draftsCount };
}
async function generateMonitoringFormDraft(individual, indName, runId, orgId, recentNotes, recentVisits, db) {
    const context = JSON.stringify({
        individual_name: indName,
        program: individual.program,
        recent_contact_notes: recentNotes.slice(0, 3),
        recent_visits: recentVisits.slice(0, 2),
    });
    const systemPrompt = `You are an IDD case management specialist.
Pre-fill a quarterly monitoring form based on the recent contact notes and visit summaries provided.
Return a JSON object with: health_status_summary (string), safety_status_summary (string), environment_summary (string), goal_progress (string), concerns_identified (string[]), recommended_follow_ups (string[]).
Base all answers on the actual documentation provided. Label as AI DRAFT.`;
    const result = await (0, ai_1.generateCompletion)(systemPrompt, `Pre-fill the quarterly monitoring form for ${indName} from recent documentation.`, context, "fast", orgId, "system", "brain_orchestrator_doc", { maxTokens: 1024, temperature: 0.2 });
    let parsedDraft = { raw_content: result.text };
    try {
        const match = result.text.match(/\{[\s\S]*\}/);
        if (match)
            parsedDraft = JSON.parse(match[0]);
    }
    catch (_a) {
        // Keep raw
    }
    await db.collection("orchestrator_drafts").add({
        individual_id: individual.id,
        individual_name: indName,
        org_id: orgId,
        run_id: runId,
        draft_type: "monitoring_form",
        status: "ai_draft",
        content: parsedDraft,
        ai_confidence: recentNotes.length > 0 ? "medium" : "low",
        source_records: [],
        generated_by: "brain_orchestrator_v1",
        ai_disclaimer: "AI DRAFT — Requires review and approval before submission",
        fields_pre_filled: Object.keys(parsedDraft).length,
        fields_requiring_input: 2,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
}
async function generatePcpSummaryDraft(individual, indName, runId, orgId, db) {
    await db.collection("orchestrator_drafts").add({
        individual_id: individual.id,
        individual_name: indName,
        org_id: orgId,
        run_id: runId,
        draft_type: "pcp_renewal_summary",
        status: "ai_draft",
        content: {
            note: "PCP renewal summary requires 12-month documentation review.",
            instructions: "Use the PCP Renewal Agent from the individual's eChart to generate a full draft.",
        },
        ai_confidence: "low",
        generated_by: "brain_orchestrator_v1",
        ai_disclaimer: "AI DRAFT — Requires review and approval before submission",
        fields_pre_filled: 0,
        fields_requiring_input: 5,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
}
//# sourceMappingURL=documentationAgent.js.map