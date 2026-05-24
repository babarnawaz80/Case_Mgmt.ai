"use strict";
// Compliance Agents API — PCP Renewal and other compliance agents
// CaseManagement.AI — Uses Gemini 2.5 Pro (quality tier)
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
exports.runPcpRenewalAgent = runPcpRenewalAgent;
const admin = __importStar(require("firebase-admin"));
const ai_1 = require("../services/ai");
const credits_1 = require("../services/credits");
const audit_1 = require("../services/audit");
const collections_1 = require("../config/collections");
// POST /api/agents/pcp-renewal/run
async function runPcpRenewalAgent(req, res) {
    try {
        const { individualId, organizationId, userId, userName, userRole } = req.body;
        if (!individualId || !organizationId || !userId) {
            res.status(400).json({ error: "Missing required fields." });
            return;
        }
        const db = admin.firestore();
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
        const twelveMonthsAgoTs = admin.firestore.Timestamp.fromDate(twelveMonthsAgo);
        // Step 1 — Load 12 months of data
        const [individual, monitoringForms, visitSummaries, progressNotes, contactNotes, incidents, currentPlan, authorizations,] = await Promise.all([
            db.collection(collections_1.COLLECTIONS.INDIVIDUALS).doc(individualId).get(),
            db.collection(collections_1.COLLECTIONS.MONITORING_FORMS)
                .where("individualId", "==", individualId)
                .where("createdAt", ">=", twelveMonthsAgoTs)
                .get(),
            db.collection(collections_1.COLLECTIONS.VISIT_SUMMARIES)
                .where("individualId", "==", individualId)
                .where("createdAt", ">=", twelveMonthsAgoTs)
                .get(),
            db.collection(collections_1.COLLECTIONS.PROGRESS_NOTES)
                .where("individualId", "==", individualId)
                .where("createdAt", ">=", twelveMonthsAgoTs)
                .limit(10)
                .get(),
            db.collection(collections_1.COLLECTIONS.CONTACT_NOTES)
                .where("individualId", "==", individualId)
                .where("createdAt", ">=", twelveMonthsAgoTs)
                .limit(10)
                .get(),
            db.collection(collections_1.COLLECTIONS.INCIDENTS)
                .where("individualId", "==", individualId)
                .where("createdAt", ">=", twelveMonthsAgoTs)
                .get(),
            db.collection(collections_1.COLLECTIONS.CARE_PLANS)
                .where("individualId", "==", individualId)
                .where("plan_status", "in", ["in_progress", "approved"])
                .limit(1)
                .get(),
            db.collection(collections_1.COLLECTIONS.SERVICE_AUTHORIZATIONS)
                .where("individualId", "==", individualId)
                .where("status", "==", "active")
                .get(),
        ]);
        if (!individual.exists) {
            res.status(404).json({ error: "Individual not found." });
            return;
        }
        const sourceDocIds = [
            ...monitoringForms.docs.map((d) => d.id),
            ...visitSummaries.docs.map((d) => d.id),
            ...progressNotes.docs.map((d) => d.id),
            ...contactNotes.docs.map((d) => d.id),
        ];
        const context = JSON.stringify({
            individual: individual.data(),
            monitoring_forms: monitoringForms.docs.map((d) => d.data()),
            visit_summaries: visitSummaries.docs.map((d) => d.data()),
            progress_notes: progressNotes.docs.map((d) => d.data()),
            contact_notes: contactNotes.docs.map((d) => d.data()),
            incidents: incidents.docs.map((d) => d.data()),
            current_plan: currentPlan.empty ? null : currentPlan.docs[0].data(),
            service_authorizations: authorizations.docs.map((d) => d.data()),
        });
        // Step 2 — AI Analysis with Gemini 2.5 Pro
        const systemPrompt = `Act as an experienced IDD case management specialist. Review the year's documentation and draft an updated Person-Centered Plan. 
Return a detailed JSON structure with: individual_profile_summary, goals (with objectives), services, and key_recommendations.
The plan should reflect actual progress documented, identify met goals, new needs, and service gaps.`;
        const result = await (0, ai_1.generateCompletion)(systemPrompt, `Please analyze this 12-month documentation history and draft a complete updated PCP for this individual.`, context, "quality", organizationId, userId, "pcp_renewal_agent", { maxTokens: 8192 });
        // Parse AI response
        let aiDraft;
        try {
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            aiDraft = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw_draft: result.text };
        }
        catch (_a) {
            aiDraft = { raw_draft: result.text };
        }
        // Step 3 — Create draft care plan
        const now = new Date();
        const nextYear = new Date(now);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const newPlanRef = await db.collection(collections_1.COLLECTIONS.CARE_PLANS).add(Object.assign(Object.assign({ individualId,
            organizationId, plan_type: "person_centered_plan", plan_status: "in_progress", effective_date: now.toISOString().split("T")[0], review_expiration: nextYear.toISOString().split("T")[0], ai_drafted: true, ai_drafted_from: sourceDocIds, ai_draft_summary: `AI-drafted from 12-month data analysis. ${now.toLocaleDateString()}` }, aiDraft), { created_by: userId, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
        const indData = individual.data();
        const indName = `${indData.first_name} ${indData.last_name}`;
        // Step 4 — Notify case manager
        const cmUid = indData.assigned_case_manager;
        if (cmUid) {
            await Promise.all([
                db.collection(collections_1.COLLECTIONS.NOTIFICATIONS).add({
                    organizationId,
                    user_id: cmUid,
                    type: "pcp_drafted",
                    title: `Annual PCP for ${indName} has been AI-drafted`,
                    body: "Please review and edit to begin the approval process.",
                    linked_route: `/people/${individualId}/care-plan`,
                    linked_record_id: newPlanRef.id,
                    read: false,
                    priority: "high",
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                }),
                db.collection(collections_1.COLLECTIONS.WORKFLOW_TASKS).add({
                    individualId,
                    organizationId,
                    assigned_to: cmUid,
                    created_by: "system",
                    title: `Review AI-drafted Annual PCP — ${indName}`,
                    description: "AI has drafted an updated Person-Centered Plan from 12 months of documentation. Please review, edit, and submit.",
                    task_type: "pcp_review",
                    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    status: "pending_start",
                    priority: "high",
                    ai_generated: true,
                    linked_module: "care_plan",
                    linked_record_id: newPlanRef.id,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                }),
            ]);
        }
        // Consume credits
        await (0, credits_1.consumeCredits)({
            organizationId,
            userId,
            userName: userName !== null && userName !== void 0 ? userName : "Unknown",
            userRole: userRole !== null && userRole !== void 0 ? userRole : "admin",
            feature: "pcp_renewal_agent",
            model: "gemini-pro-latest",
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            individualId,
        });
        await (0, audit_1.logAction)({
            organizationId,
            actorUid: userId,
            actorName: userName !== null && userName !== void 0 ? userName : "Unknown",
            actorRole: userRole !== null && userRole !== void 0 ? userRole : "admin",
            action: "COMPLIANCE_AGENT_RUN",
            collectionName: collections_1.COLLECTIONS.CARE_PLANS,
            recordId: newPlanRef.id,
            individualId,
            summary: `PCP Renewal Agent ran for ${indName}. Draft plan created.`,
            source: "ai",
        });
        res.json({
            success: true,
            planId: newPlanRef.id,
            message: `Annual PCP draft created for ${indName}. Case manager has been notified.`,
        });
    }
    catch (error) {
        const message = error.message;
        if (["AI_PAUSED", "INSUFFICIENT_CREDITS", "DAILY_LIMIT_REACHED"].includes(message)) {
            res.status(402).json({ error: message });
        }
        else {
            console.error("[pcp-renewal-agent]", error);
            res.status(500).json({ error: "Agent failed. Please try again." });
        }
    }
}
//# sourceMappingURL=agents.js.map