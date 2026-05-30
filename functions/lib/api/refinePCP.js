"use strict";
// refinePCP — Firebase Callable Cloud Function
// CaseManagement.AI
//
// Refines an existing AI-generated PCP based on case manager instructions.
// Can do targeted section updates or full regeneration.
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
exports.refinePCP = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const ai_1 = require("../services/ai");
async function callAIDirect(systemPrompt, userPrompt, maxTokens = 8000, temperature = 0.2) {
    var _a;
    const ai = (0, ai_1.getAiClient)();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        config: { systemInstruction: systemPrompt, maxOutputTokens: maxTokens, temperature },
    });
    return (_a = response.text) !== null && _a !== void 0 ? _a : "";
}
exports.refinePCP = (0, https_1.onCall)({ cors: true, memory: "512MiB", timeoutSeconds: 180 }, async (request) => {
    var _a;
    const db = admin.firestore();
    if (!request.auth) {
        return { success: false, error: "AUTH_REQUIRED", message: "Authentication required." };
    }
    const uid = request.auth.uid;
    const { planId, individualId, currentPlan = {}, refinementInstructions = "", regenerateFull = false, } = (_a = request.data) !== null && _a !== void 0 ? _a : {};
    if (!planId || !individualId || !refinementInstructions) {
        return { success: false, error: "MISSING_PARAMS", message: "planId, individualId, and refinementInstructions are required." };
    }
    try {
        // Load individual for context
        let indName = "Individual";
        try {
            const indSnap = await db.collection("individuals").doc(individualId).get();
            if (indSnap.exists) {
                const data = indSnap.data();
                indName = `${data.first_name || ""} ${data.last_name || ""}`.trim() || indName;
            }
        }
        catch ( /* non-fatal */_b) { /* non-fatal */ }
        const planJson = JSON.stringify(currentPlan, null, 2).slice(0, 12000);
        let systemPrompt;
        let userPrompt;
        if (regenerateFull) {
            systemPrompt = `You are an expert Person-Centered Plan writer. You will update an existing PCP based on case manager instructions. Maintain person-first language and all required structure. Return ONLY valid JSON matching the original structure exactly.`;
            userPrompt = `Here is the current PCP for ${indName}:\n${planJson}\n\nCase manager instructions:\n${refinementInstructions}\n\nUpdate the plan accordingly and return the complete updated plan JSON only. No markdown, no backticks.`;
        }
        else {
            systemPrompt = `You are an expert Person-Centered Plan writer. The case manager has specific targeted changes to make. Apply only the requested changes and return the complete updated JSON. Return ONLY valid JSON. No markdown, no backticks.`;
            userPrompt = `Here is the current PCP for ${indName}:\n${planJson}\n\nApply these targeted changes:\n${refinementInstructions}\n\nReturn the complete updated plan JSON only, with your changes applied.`;
        }
        let rawText;
        try {
            rawText = await callAIDirect(systemPrompt, userPrompt, 8000, 0.2);
        }
        catch (err) {
            return { success: false, error: "GENERATION_FAILED", message: err.message || "Gemini call failed." };
        }
        // Parse JSON
        let updatedPlan;
        try {
            const cleaned = rawText
                .replace(/^```json\s*/im, "")
                .replace(/^```\s*/im, "")
                .replace(/```\s*$/im, "")
                .trim();
            updatedPlan = JSON.parse(cleaned);
        }
        catch (_c) {
            try {
                const match = rawText.match(/\{[\s\S]*\}/);
                if (!match)
                    throw new Error("No JSON");
                updatedPlan = JSON.parse(match[0]);
            }
            catch (_d) {
                return { success: false, error: "PARSE_FAILED", message: "Could not parse refined plan as JSON." };
            }
        }
        // Save back to Firestore
        try {
            await db.collection("care_plans").doc(planId).update(Object.assign(Object.assign({}, updatedPlan), { individual_id: individualId, goals: updatedPlan.goals || [], services: updatedPlan.services || [], updated_at: admin.firestore.FieldValue.serverTimestamp(), last_refined_by: uid, refinement_instructions: refinementInstructions }));
        }
        catch (err) {
            return { success: false, error: "SAVE_FAILED", message: err.message || "Failed to save refined plan." };
        }
        return { success: true, plan: updatedPlan };
    }
    catch (err) {
        return { success: false, error: "UNEXPECTED", message: err.message || "Unexpected error." };
    }
});
//# sourceMappingURL=refinePCP.js.map