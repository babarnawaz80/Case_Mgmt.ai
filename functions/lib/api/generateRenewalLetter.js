"use strict";
// generateRenewalLetter — Firebase Callable Cloud Function
// Generates a professional Medicaid prior authorization renewal letter
// using the individual's chart data. Uses getAiClient() directly to
// bypass org-level AI feature flags.
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
exports.generateRenewalLetter = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const ai_1 = require("../services/ai");
async function callAI(systemPrompt, userPrompt) {
    var _a;
    const ai = (0, ai_1.getAiClient)();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        config: {
            systemInstruction: systemPrompt,
            maxOutputTokens: 4096,
            temperature: 0.3,
        },
    });
    return (_a = response.text) !== null && _a !== void 0 ? _a : "";
}
exports.generateRenewalLetter = (0, https_1.onCall)({ cors: true, memory: "512MiB", timeoutSeconds: 180 }, async (request) => {
    var _a, _b, _c;
    if (!request.auth) {
        return { success: false, error: "AUTH_REQUIRED", message: "Authentication required." };
    }
    const { individualId, authorizationId } = (_a = request.data) !== null && _a !== void 0 ? _a : {};
    if (!individualId || !authorizationId) {
        return { success: false, error: "MISSING_PARAMS", message: "individualId and authorizationId are required." };
    }
    const db = admin.firestore();
    const sixMonthsAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000));
    try {
        // ── Load all data in parallel ──────────────────────────────────────────
        const [individualSnap, authSnap, progressSnap, monitoringSnap, carePlanSnap] = await Promise.allSettled([
            db.collection("individuals").doc(individualId).get(),
            // Auth could be in service_authorizations top-level OR as subcollection
            db.collection("service_authorizations").doc(authorizationId).get(),
            db.collection("progress_notes")
                .where("individualId", "==", individualId)
                .where("createdAt", ">=", sixMonthsAgo)
                .orderBy("createdAt", "desc")
                .limit(15)
                .get()
                .catch(() => db.collection("progress_notes")
                .where("individualId", "==", individualId)
                .limit(15).get()),
            db.collection("monitoring_forms")
                .where("individualId", "==", individualId)
                .orderBy("createdAt", "desc")
                .limit(4)
                .get()
                .catch(() => ({ docs: [] })),
            db.collection("care_plans")
                .where("individual_id", "==", individualId)
                .orderBy("created_at", "desc")
                .limit(1)
                .get()
                .catch(() => ({ docs: [] })),
        ]);
        const individual = individualSnap.status === "fulfilled" && individualSnap.value.exists
            ? individualSnap.value.data()
            : null;
        let auth = authSnap.status === "fulfilled" && authSnap.value.exists
            ? authSnap.value.data()
            : null;
        // Fallback: search by id field in service_authorizations
        if (!auth) {
            const authQuery = await db.collection("service_authorizations")
                .where("individualId", "==", individualId)
                .limit(20)
                .get()
                .catch(() => ({ docs: [] }));
            const found = authQuery.docs.find(d => d.id === authorizationId);
            if (found)
                auth = found.data();
        }
        if (!individual) {
            return { success: false, error: "NOT_FOUND", message: "Individual not found." };
        }
        if (!auth) {
            return { success: false, error: "NOT_FOUND", message: "Authorization not found." };
        }
        const progressDocs = progressSnap.status === "fulfilled"
            ? progressSnap.value.docs
            : [];
        const monitoringDocs = monitoringSnap.status === "fulfilled"
            ? (_b = monitoringSnap.value.docs) !== null && _b !== void 0 ? _b : []
            : [];
        const carePlanDocs = carePlanSnap.status === "fulfilled"
            ? (_c = carePlanSnap.value.docs) !== null && _c !== void 0 ? _c : []
            : [];
        // ── Build prompt ───────────────────────────────────────────────────────
        const indName = `${individual.first_name || individual.firstName || ""} ${individual.last_name || individual.lastName || ""}`.trim();
        const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        const endDate = auth.end_date || auth.expirationDate || "";
        const newStartDate = endDate
            ? new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString("en-US")
            : "[TBD]";
        const newEndDate = endDate
            ? new Date(new Date(endDate).getTime() + 366 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US")
            : "[TBD]";
        const progressSummary = progressDocs.slice(0, 8).map(d => {
            var _a, _b, _c, _d;
            const n = d.data();
            const date = n.date || n.progressDate || ((_d = (_c = (_b = (_a = n.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toLocaleDateString) === null || _d === void 0 ? void 0 : _d.call(_c)) || "—";
            const body = (n.detailsOfActivity || n.purposeOfActivity || n.narrative || n.note_body || "").slice(0, 250);
            return `[${date}] ${body}`;
        }).join("\n") || "No recent progress notes on file.";
        const monitoringSummary = monitoringDocs.slice(0, 2).map((d) => {
            var _a, _b, _c, _d;
            const n = d.data();
            const actions = (n.recommendedActions || []).slice(0, 3).join("; ");
            return `${n.typeOfReview || "Quarterly"} (${((_d = (_c = (_b = (_a = n.completedDate) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toLocaleDateString) === null || _d === void 0 ? void 0 : _d.call(_c)) || "—"}): ${actions || n.goalProgress || "No findings."}`;
        }).join("\n") || "No recent monitoring forms on file.";
        const goals = carePlanDocs.length > 0
            ? (carePlanDocs[0].data().goals || []).slice(0, 4)
                .map((g) => `• ${g.title || g.goal}: ${(g.description || "").slice(0, 120)}`)
                .join("\n")
            : "No current care plan goals on file.";
        const systemPrompt = `You are an expert Medicaid case management specialist writing formal prior authorization renewal request letters. Your letters are thorough, clinically grounded, specific to the individual's actual documented progress, and fully compliant with Medicaid prior authorization standards. You write in professional business letter format. You NEVER use generic boilerplate — every letter references specific documented facts from the individual's chart.`;
        const userPrompt = `Write a complete, professional Medicaid prior authorization renewal request letter for the following individual and service.

DATE: ${today}

INDIVIDUAL:
Full Name: ${indName}
Date of Birth: ${individual.date_of_birth || individual.dateOfBirth || "—"}
Medicaid ID: ${individual.medicaid_id || individual.medicaidId || "—"}
Program: ${individual.program || "—"}
Waiver Type: ${individual.waiver_type || individual.waiverType || "—"}
Diagnosis: ${individual.primary_diagnosis || individual.diagnosis || "—"}
Level of Care: ${individual.level_of_care || individual.levelOfCare || "—"}
County: ${individual.county || "—"}
Case Manager: ${individual.assigned_case_manager_name || "—"}
Agency: ${individual.agency || "—"}

AUTHORIZATION BEING RENEWED:
Authorization #: ${auth.auth_number || auth.authorizationId || auth.authNumber || "—"}
Service Name: ${auth.service_name || auth.serviceName || "—"}
Procedure Code: ${auth.procedure_code || auth.serviceCode || "—"}
Payer: ${auth.payer || auth.provider || "—"}
Current Authorization Period: ${auth.start_date || auth.effectiveDate || "—"} to ${endDate}
Units Authorized: ${auth.units_authorized || auth.authorizedUnits || "—"}
Units Used to Date: ${auth.units_used || auth.unitsUsed || "—"}
Billing Period: ${auth.billing_period || auth.billingPeriod || "Monthly"}

RENEWAL REQUESTED:
New Authorization Period: ${newStartDate} to ${newEndDate}
Units Requested: ${auth.units_authorized || auth.authorizedUnits || "—"} (same as current)

RECENT PROGRESS NOTES (last 6 months):
${progressSummary}

RECENT MONITORING FORM FINDINGS:
${monitoringSummary}

CURRENT CARE PLAN GOALS:
${goals}

LETTER REQUIREMENTS:
1. Formal business letter format with date at top
2. Address to: "Prior Authorization Department" at the Payer listed above
3. Reference: "RE: Prior Authorization Renewal Request — ${indName} — Medicaid ID: ${individual.medicaid_id || individual.medicaidId || "—"}"
4. Opening paragraph: state the purpose clearly
5. Clinical justification section: reference SPECIFIC documented progress from progress notes above — use dates and specific observations. Do not write generic statements.
6. Goals alignment section: explain how this service supports the active care plan goals listed above
7. Medical necessity statement: specific to this individual's diagnoses and level of care
8. Requested units and period with brief justification
9. Closing with contact information placeholder
10. Start the letter with: "AI DRAFTED — REVIEW CAREFULLY BEFORE SENDING\n\n"
11. Length: 450–650 words. Comprehensive but concise.
12. Use person-first language throughout
13. Do NOT use placeholder brackets like [insert here] — use the actual data provided above

Write ONLY the letter text. No explanation, no preamble.`;
        // ── Generate ───────────────────────────────────────────────────────────
        let letterText;
        try {
            letterText = await callAI(systemPrompt, userPrompt);
        }
        catch (err) {
            return { success: false, error: "GENERATION_FAILED", message: err.message || "AI generation failed." };
        }
        if (!letterText || letterText.trim().length < 100) {
            return { success: false, error: "EMPTY_RESPONSE", message: "Generated letter was empty. Please try again." };
        }
        // ── Save to Firestore ──────────────────────────────────────────────────
        const letterRef = await db.collection("renewal_letters").add({
            individualId,
            authorizationId,
            individualName: indName,
            serviceName: auth.service_name || auth.serviceName || "—",
            authNumber: auth.auth_number || auth.authorizationId || auth.authNumber || "—",
            payer: auth.payer || "—",
            letterText,
            status: "draft",
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            generatedBy: request.auth.uid,
            source: "ai_generated",
        });
        return { success: true, letterText, letterId: letterRef.id };
    }
    catch (err) {
        console.error("[generateRenewalLetter]", err);
        return { success: false, error: "UNEXPECTED", message: err.message || "Unexpected error." };
    }
});
//# sourceMappingURL=generateRenewalLetter.js.map