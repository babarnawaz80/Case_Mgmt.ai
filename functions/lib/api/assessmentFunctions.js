"use strict";
/**
 * assessmentFunctions.ts
 * Assessment-related Cloud Function routes.
 * POST /api/assessments/prefill — AI pre-fill suggestions for an assessment template
 */
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
exports.assessmentRoutes = void 0;
const express_1 = require("express");
const admin = __importStar(require("firebase-admin"));
const ai_1 = require("../services/ai");
const router = (0, express_1.Router)();
// ─── POST /api/assessments/prefill ───────────────────────────────────────────
router.post("/prefill", async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const { templateId, individualId } = req.body;
        if (!templateId || !individualId) {
            res.status(400).json({ error: "templateId and individualId are required." });
            return;
        }
        const db = admin.firestore();
        // Load template (Firestore first, then return empty suggestions if not found)
        let templateData = null;
        try {
            const templateSnap = await db
                .collection("assessment_templates")
                .doc(templateId)
                .get();
            if (templateSnap.exists) {
                templateData = (_a = templateSnap.data()) !== null && _a !== void 0 ? _a : null;
            }
        }
        catch (_j) {
            // Template not in Firestore — that's ok, we still try individual data
        }
        // Load recent clinical data for the individual
        const [contactNotesSnap, visitSummariesSnap, progressNotesSnap, individualSnap,] = await Promise.allSettled([
            db
                .collection("contact_notes")
                .where("individual_id", "==", individualId)
                .orderBy("date", "desc")
                .limit(20)
                .get(),
            db
                .collection("visit_summaries")
                .where("individual_id", "==", individualId)
                .orderBy("visit_date", "desc")
                .limit(10)
                .get(),
            db
                .collection("progress_notes")
                .where("individualId", "==", individualId)
                .orderBy("created_at", "desc")
                .limit(20)
                .get(),
            db.collection("individuals").doc(individualId).get(),
        ]);
        const individual = individualSnap.status === "fulfilled" && individualSnap.value.exists
            ? individualSnap.value.data()
            : null;
        const contactNotes = contactNotesSnap.status === "fulfilled"
            ? contactNotesSnap.value.docs.map((d) => d.data())
            : [];
        const visitSummaries = visitSummariesSnap.status === "fulfilled"
            ? visitSummariesSnap.value.docs.map((d) => d.data())
            : [];
        const progressNotes = progressNotesSnap.status === "fulfilled"
            ? progressNotesSnap.value.docs.map((d) => d.data())
            : [];
        if (!individual) {
            res.json({ suggestions: {}, questionsPreFilled: 0 });
            return;
        }
        // Build questions list from template (if available)
        const questions = [];
        if (templateData === null || templateData === void 0 ? void 0 : templateData.sections) {
            for (const section of templateData.sections) {
                for (const q of (_b = section.questions) !== null && _b !== void 0 ? _b : []) {
                    if (q.type !== "section_header" && q.type !== "instructions" && q.type !== "divider") {
                        questions.push({ id: q.id, label: q.label, type: q.type });
                    }
                }
            }
        }
        if (questions.length === 0) {
            res.json({ suggestions: {}, questionsPreFilled: 0 });
            return;
        }
        const contextStr = JSON.stringify({
            individual: {
                name: `${(_c = individual.first_name) !== null && _c !== void 0 ? _c : ""} ${(_d = individual.last_name) !== null && _d !== void 0 ? _d : ""}`.trim(),
                dob: individual.dob,
                diagnosis: individual.diagnosis,
                preferred_name: individual.preferred_name,
                primary_language: individual.primary_language,
            },
            recent_contact_notes: contactNotes.slice(0, 5).map((n) => ({
                date: n.date,
                purpose: n.purpose,
                details: n.details,
                issues: n.issues,
            })),
            recent_visit_summaries: visitSummaries.slice(0, 3).map((v) => {
                var _a;
                return ({
                    date: (_a = v.visit_date) !== null && _a !== void 0 ? _a : v.visitDate,
                    what_went_well: v.what_went_well,
                    what_is_not_working: v.what_is_not_working,
                });
            }),
            recent_progress_notes: progressNotes.slice(0, 5).map((p) => ({
                date: p.date,
                content: p.content,
            })),
        });
        const systemPrompt = `You are a clinical documentation assistant for a case management platform.
Pre-fill assessment questions based on provided individual context.
Return ONLY valid JSON, no markdown or explanation.`;
        const userPrompt = `Based on the individual context provided, pre-fill these assessment questions.

QUESTIONS TO PRE-FILL (JSON array):
${JSON.stringify(questions, null, 2)}

Return a JSON object where each key is a questionId and each value is:
{ "value": <string|number|null>, "source": <brief source note>, "confidence": "high"|"medium"|"low" }

Only include questions you can confidently answer from the context.`;
        let aiSuggestions = {};
        try {
            const orgId = (_f = (_e = req.user) === null || _e === void 0 ? void 0 : _e.organizationId) !== null && _f !== void 0 ? _f : "demo";
            const userId = (_h = (_g = req.user) === null || _g === void 0 ? void 0 : _g.uid) !== null && _h !== void 0 ? _h : "system";
            const aiResult = await (0, ai_1.generateCompletion)(systemPrompt, userPrompt, contextStr, "fast", orgId, userId, "assessment-prefill", { maxTokens: 2048, temperature: 0.1 });
            if (aiResult === null || aiResult === void 0 ? void 0 : aiResult.text) {
                // Parse JSON from response
                const jsonMatch = aiResult.text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    aiSuggestions = JSON.parse(jsonMatch[0]);
                }
            }
        }
        catch (aiErr) {
            // Non-fatal — return empty suggestions
            console.warn("[assessmentPrefill] AI call failed (non-fatal):", aiErr);
        }
        res.json({
            suggestions: aiSuggestions,
            questionsPreFilled: Object.keys(aiSuggestions).length,
        });
    }
    catch (err) {
        console.error("[assessmentPrefill]", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.assessmentRoutes = router;
//# sourceMappingURL=assessmentFunctions.js.map