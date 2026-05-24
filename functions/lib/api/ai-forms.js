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
//# sourceMappingURL=ai-forms.js.map