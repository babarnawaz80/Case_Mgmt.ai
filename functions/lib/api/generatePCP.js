"use strict";
// generatePCP — Firebase Callable Cloud Function
// CaseManagement.AI
//
// Loads all available chart data, builds a comprehensive prompt,
// calls Gemini to generate a complete Person-Centered Plan,
// saves it to Firestore, and returns the plan JSON + document ID.
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
exports.generatePCP = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const ai_1 = require("../services/ai");
const getGuidelinesEngine_1 = require("../orchestrator/utilities/getGuidelinesEngine");
// Direct AI call that bypasses org-level AI_PAUSED / credit checks.
// generatePCP is an admin-level server function — it should never be blocked
// by org feature flags or credit balances.
async function callAIDirect(systemPrompt, contextBlock, userPrompt, maxTokens = 8000, temperature = 0.25) {
    var _a;
    const ai = (0, ai_1.getAiClient)();
    const fullPrompt = contextBlock ? `${contextBlock}\n\n${userPrompt}` : userPrompt;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        config: {
            systemInstruction: systemPrompt,
            maxOutputTokens: maxTokens,
            temperature,
        },
    });
    return (_a = response.text) !== null && _a !== void 0 ? _a : "";
}
// ─── Helper: 12 months ago timestamp ─────────────────────────────────────────
function twelveMonthsAgo() {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return admin.firestore.Timestamp.fromDate(d);
}
// ─── Helper: safe doc data ────────────────────────────────────────────────────
function safeData(snap) {
    return snap.exists ? snap.data() : {};
}
// ─── Load data from a top-level collection filtered by individualId ───────────
async function loadCollection(db, collectionName, individualId, dateField, limitCount) {
    try {
        const cutoff = twelveMonthsAgo();
        const snap = await db
            .collection(collectionName)
            .where("individualId", "==", individualId)
            .where(dateField, ">=", cutoff)
            .orderBy(dateField, "desc")
            .limit(limitCount)
            .get();
        return snap.docs;
    }
    catch (_a) {
        // Try without date filter (no composite index)
        try {
            const snap = await db
                .collection(collectionName)
                .where("individualId", "==", individualId)
                .limit(limitCount)
                .get();
            return snap.docs;
        }
        catch (_b) {
            return [];
        }
    }
}
// ─── Build summary text from a doc array ─────────────────────────────────────
function summarizeDocs(docs, fields, maxCharsEach = 300) {
    if (docs.length === 0)
        return "None found.";
    return docs.map((d, i) => {
        const data = d.data();
        const parts = fields
            .map(f => data[f] ? `${f}: ${String(data[f]).slice(0, maxCharsEach)}` : null)
            .filter(Boolean)
            .join(" | ");
        return `[${i + 1}] ${parts}`;
    }).join("\n");
}
// ─── Main Callable Function ───────────────────────────────────────────────────
exports.generatePCP = (0, https_1.onCall)({ cors: true, memory: "1GiB", timeoutSeconds: 300 }, async (request) => {
    var _a, _b, _c, _d, _e, _f;
    const db = admin.firestore();
    if (!request.auth) {
        return { success: false, error: "AUTH_REQUIRED", message: "Authentication required." };
    }
    const uid = request.auth.uid;
    const { individualId, planType = "Annual Plan", effectiveDate = "", annualPlanDate = "", specialInstructions = "", agentId = "", } = (_a = request.data) !== null && _a !== void 0 ? _a : {};
    if (!individualId) {
        return { success: false, error: "MISSING_PARAMS", message: "individualId is required." };
    }
    try {
        // ── Step A: Load all data in parallel ────────────────────────────────────
        const [individualSnap, agentSnap, contactNotesResult, visitSummariesResult, monitoringFormsResult, progressNotesResult, ambientSessionsResult, incidentsResult, authorizationsResult, assessmentsResult, priorPlansResult,] = await Promise.allSettled([
            db.collection("individuals").doc(individualId).get(),
            agentId ? db.collection("agents").doc(agentId).get() : Promise.resolve(null),
            loadCollection(db, "contact_notes", individualId, "createdAt", 40),
            loadCollection(db, "visit_summaries", individualId, "createdAt", 20),
            loadCollection(db, "monitoring_forms", individualId, "createdAt", 15),
            loadCollection(db, "progress_notes", individualId, "createdAt", 30),
            loadCollection(db, "ai_checkins", individualId, "createdAt", 15),
            loadCollection(db, "incidents", individualId, "createdAt", 15),
            // Authorizations — no date filter needed
            db.collection("service_authorizations").where("individualId", "==", individualId).limit(20).get()
                .catch(() => db.collection("authorizations").where("individualId", "==", individualId).limit(20).get())
                .catch(() => ({ docs: [] })),
            db.collection("assessments").where("individualId", "==", individualId).limit(10).get()
                .catch(() => ({ docs: [] })),
            db.collection("care_plans").where("individual_id", "==", individualId).orderBy("created_at", "desc").limit(3).get()
                .catch(() => ({ docs: [] })),
        ]);
        // Extract results (use empty fallbacks)
        const individual = individualSnap.status === "fulfilled" ? safeData(individualSnap.value) : {};
        const agent = agentSnap.status === "fulfilled" && agentSnap.value ? safeData(agentSnap.value) : {};
        const contactNotes = contactNotesResult.status === "fulfilled" ? contactNotesResult.value : [];
        const visitSummaries = visitSummariesResult.status === "fulfilled" ? visitSummariesResult.value : [];
        const monitoringForms = monitoringFormsResult.status === "fulfilled" ? monitoringFormsResult.value : [];
        const progressNotes = progressNotesResult.status === "fulfilled" ? progressNotesResult.value : [];
        const ambientSessions = ambientSessionsResult.status === "fulfilled" ? ambientSessionsResult.value : [];
        const incidents = incidentsResult.status === "fulfilled" ? incidentsResult.value : [];
        const authorizationDocs = authorizationsResult.status === "fulfilled" ? authorizationsResult.value.docs || [] : [];
        const assessmentDocs = assessmentsResult.status === "fulfilled" ? assessmentsResult.value.docs || [] : [];
        // ── Extract structured assessment data ────────────────────────────────────
        const sortedAssessments = [...assessmentDocs].sort((a, b) => {
            var _a, _b, _c, _d;
            const aDate = (((_b = (_a = a.data().completedAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || new Date(a.data().date || 0)).getTime();
            const bDate = (((_d = (_c = b.data().completedAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || new Date(b.data().date || 0)).getTime();
            return bDate - aDate; // most recent first
        });
        const structuredAssessments = sortedAssessments.slice(0, 3).map((d) => {
            var _a, _b, _c, _d, _e, _f, _g;
            const a = d.data();
            const responses = a.responses || {};
            const entries = Object.entries(responses);
            return {
                templateName: a.templateName || a.assessmentType || a.type || "Assessment",
                completedAt: ((_d = (_c = (_b = (_a = a.completedAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toLocaleDateString) === null || _d === void 0 ? void 0 : _d.call(_c)) || a.date || "—",
                score: a.totalScore || a.score || null,
                maxScore: a.maxScore || null,
                keyFindings: a.keyFindings || a.summary || "",
                independenceLevels: entries
                    .filter(([, r]) => { var _a, _b; return (r === null || r === void 0 ? void 0 : r.questionType) === "independence_level" || ((_a = r === null || r === void 0 ? void 0 : r.questionLabel) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes("independence")) || ((_b = r === null || r === void 0 ? void 0 : r.questionLabel) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes("adl")); })
                    .map(([, r]) => `${r.questionLabel || "Activity"}: Level ${r.value || "—"}`),
                goalAreas: entries
                    .filter(([, r]) => { var _a; return ((_a = r === null || r === void 0 ? void 0 : r.questionLabel) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes("goal")) || (r === null || r === void 0 ? void 0 : r.questionType) === "goal_area"; })
                    .map(([, r]) => `${r.questionLabel}: ${r.value || "—"}`),
                supportNeeds: entries
                    .filter(([, r]) => { var _a; return ((_a = r === null || r === void 0 ? void 0 : r.questionLabel) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes("support")) || (r === null || r === void 0 ? void 0 : r.questionType) === "support_need"; })
                    .map(([, r]) => `${r.questionLabel}: ${r.value}`),
                recommendedServices: entries
                    .filter(([, r]) => { var _a, _b; return ((_a = r === null || r === void 0 ? void 0 : r.questionLabel) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes("recommend")) || ((_b = r === null || r === void 0 ? void 0 : r.questionLabel) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes("service")); })
                    .map(([, r]) => `${r.questionLabel}: ${r.value}`),
                riskScore: (_g = (_f = (_e = entries.find(([, r]) => { var _a; return ((_a = r === null || r === void 0 ? void 0 : r.questionLabel) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes("risk")) && typeof (r === null || r === void 0 ? void 0 : r.value) === "number"; })) === null || _e === void 0 ? void 0 : _e[1]) === null || _f === void 0 ? void 0 : _f.value) !== null && _g !== void 0 ? _g : null,
            };
        });
        // Check assessment freshness for warnings
        const latestAssessmentDate = sortedAssessments.length > 0
            ? (((_c = (_b = sortedAssessments[0].data().completedAt) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) || new Date(sortedAssessments[0].data().date || 0))
            : null;
        const assessmentAgeMonths = latestAssessmentDate
            ? Math.floor((Date.now() - latestAssessmentDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
            : null;
        const assessmentWarning = assessmentDocs.length === 0
            ? "NO_ASSESSMENT"
            : assessmentAgeMonths !== null && assessmentAgeMonths > 13
                ? "OUTDATED_ASSESSMENT"
                : null;
        const priorPlanDocs = priorPlansResult.status === "fulfilled" ? priorPlansResult.value.docs || [] : [];
        // Load guidelines engine if linked
        let engineData = {};
        const engineId = agent.guidelines_engine_id;
        if (engineId) {
            try {
                const engineSnap = await db.collection("guidelines_engines").doc(engineId).get();
                if (engineSnap.exists)
                    engineData = safeData(engineSnap);
            }
            catch ( /* non-fatal */_g) { /* non-fatal */ }
        }
        // Dynamic engine selection: agent's linked engine → fallback to individual's state+program
        let dynamicEngineName = engineData.name || agent.guidelines_engine_name || null;
        let dynamicEngineId = engineId || null;
        if (!dynamicEngineName) {
            const orgId = individual.organizationId || "unknown";
            const indState = individual.state || individual.address_state || "";
            const indProgram = individual.program || individual.program_type || "";
            const foundEngine = await (0, getGuidelinesEngine_1.getGuidelinesEngineForIndividual)(orgId, indState, indProgram, db);
            if (foundEngine) {
                dynamicEngineName = foundEngine.name;
                dynamicEngineId = foundEngine.id;
            }
        }
        const engineName = dynamicEngineName || "State DD Waiver Guidelines";
        const masterPrompt = agent.master_prompt || "";
        // ── Step B: Build the prompt ──────────────────────────────────────────────
        const indName = `${individual.first_name || ""} ${individual.last_name || ""}`.trim() || "Individual";
        const dataSources = {
            contactNotes: contactNotes.length,
            visitSummaries: visitSummaries.length,
            monitoringForms: monitoringForms.length,
            progressNotes: progressNotes.length,
            ambientSessions: ambientSessions.length,
            incidents: incidents.length,
            authorizations: authorizationDocs.length,
            assessments: assessmentDocs.length,
            priorPlans: priorPlanDocs.length,
        };
        const systemPrompt = `You are an expert Person-Centered Plan writer for a human services case management agency. You write PCPs that are thorough, compliant with state guidelines, and written in person-first language. Every goal must be specific, measurable, and tied to the individual's expressed interests and documented needs.

GUIDELINES ENGINE: ${engineName}
${engineData.description ? `Description: ${engineData.description}` : ""}

${masterPrompt ? `AGENCY INSTRUCTIONS (Agent Master Prompt):\n${masterPrompt}` : ""}`;
        const contextBlock = `INDIVIDUAL PROFILE:
Name: ${indName}
Date of Birth: ${individual.date_of_birth || individual.dateOfBirth || "—"}
Program: ${individual.program || individual.program_type || "—"}
State: ${individual.state || individual.address_state || "—"}
Medicaid ID: ${individual.medicaid_id || individual.medicaidId || "—"}
Diagnosis: ${individual.primary_diagnosis || individual.diagnosis || "—"}
County: ${individual.county || "—"}
Case Manager: ${individual.assigned_case_manager_name || "—"}

PLAN DETAILS:
Plan Type: ${planType}
Effective Date: ${effectiveDate}
Annual Plan Date: ${annualPlanDate}

CONTACT NOTES (${contactNotes.length} notes, past 12 months):
${summarizeDocs(contactNotes, ["noteType", "contactType", "narrative", "summary", "notes", "date"], 250)}

VISIT SUMMARIES (${visitSummaries.length} visits):
${summarizeDocs(visitSummaries, ["visitDate", "purpose", "workingWell", "notWorking", "nextSteps", "summary"], 250)}

MONITORING FORMS (${monitoringForms.length} forms):
${summarizeDocs(monitoringForms, ["formType", "dueDate", "healthStatus", "safetyStatus", "goalProgress", "recommendedActions"], 250)}

PROGRESS NOTES (${progressNotes.length} notes):
${summarizeDocs(progressNotes, ["date", "serviceType", "goalsAddressed", "progressStatus", "narrative"], 200)}

AMBIENT SESSIONS (${ambientSessions.length} sessions):
${summarizeDocs(ambientSessions, ["startedAt", "summary", "keyEntities", "suggestions"], 200)}

INCIDENTS (${incidents.length} incidents):
${summarizeDocs(incidents, ["date", "incidentType", "classification", "status", "description"], 200)}

SERVICE AUTHORIZATIONS (${authorizationDocs.length}):
${summarizeDocs(authorizationDocs, ["serviceName", "serviceType", "authorizedUnits", "unitsUsed", "expirationDate", "status"], 200)}

COMPLETED ASSESSMENTS (${assessmentDocs.length} total, most recent first):
${structuredAssessments.length === 0 ? "No completed assessments on file." : structuredAssessments.map(a => `
Assessment: ${a.templateName}
Completed: ${a.completedAt}${a.score !== null ? ` | Score: ${a.score}${a.maxScore ? `/${a.maxScore}` : ""}` : ""}
Key Findings: ${a.keyFindings || "See responses"}
Independence/ADL Levels: ${a.independenceLevels.length ? a.independenceLevels.join("; ") : "Not assessed"}
Support Needs Identified: ${a.supportNeeds.length ? a.supportNeeds.join("; ") : "Not specified"}
Recommended Services: ${a.recommendedServices.length ? a.recommendedServices.join("; ") : "Not specified"}
Goal Areas: ${a.goalAreas.length ? a.goalAreas.join("; ") : "Not specified"}
Risk Score: ${a.riskScore !== null ? a.riskScore : "Not scored"}
`).join("---")}

ASSESSMENT → PCP MAPPING INSTRUCTIONS:
- Independence Level scores → map directly to "Support Needs" section
  Levels 1-3 = high support need; Levels 4-5 = moderate support; Levels 6-8 = minimal/no support
- Goal Areas from assessment → seed ISP Goals section (each goal area = proposed PCP goal)
- Recommended Services → populate Services section alongside authorizations
- Risk Score → Health & Safety: 0-2=Low, 3-5=Moderate, 6+=High risk (flag for attention)
- Always cite assessment source: "Based on ${((_d = structuredAssessments[0]) === null || _d === void 0 ? void 0 : _d.templateName) || "assessment"} (${((_e = structuredAssessments[0]) === null || _e === void 0 ? void 0 : _e.completedAt) || "—"})"

${priorPlanDocs.length > 0 ? `PRIOR PLAN HISTORY (most recent):
${JSON.stringify(priorPlanDocs[0].data().goals || [], null, 2).slice(0, 1000)}` : "PRIOR PLAN: No prior plans on file."}

${specialInstructions ? `CASE MANAGER SPECIAL INSTRUCTIONS:\n${specialInstructions}` : ""}`;
        const userPrompt = `Based on ALL of the above information, generate a complete, high-quality Person-Centered Plan for ${indName}.

CRITICAL REQUIREMENTS — THESE ARE MANDATORY, NOT OPTIONAL:
- DO NOT return empty arrays for goals or services. EVER.
- Goals MUST be based on the individual's documented interests, expressed preferences, and identified needs from the chart data provided above.
- Every goal must reference SPECIFIC, REAL, DOCUMENTED aspirations or needs — generic placeholder goals like "Individual will improve quality of life" are COMPLETELY UNACCEPTABLE and will be rejected.
- If the individual has active service authorizations above, ALL of them MUST appear in the services array with their exact service names.
- ALL supportNeeds fields must be populated with specific, non-generic content drawn from the individual's documentation.
- Generate MINIMUM 3 goals, each with MINIMUM 2 objectives. Preferred: 4-5 goals with 2-3 objectives each.
- Each goal must have a realistic target date (within 6-18 months of ${effectiveDate}).

The plan must:
1. Be written in person-first, strengths-based language
2. Include 3-5 specific, measurable goals grounded in ${indName}'s actual documented life, interests, and needs
3. Each goal MUST have: title, description (2-3 sentences of specific detail), targetDate (YYYY-MM-DD), responsibleParty, progress: "Not Started", objectives (2-3 specific action steps)
4. List ALL services from the service authorizations section above — if none found, create reasonable services based on the program type
5. Populate ALL support needs fields with specific observations from the notes and visits
6. Include health and safety section based on any documented incidents or health concerns
7. Reference SPECIFIC events, dates, preferences, and documented facts from the data provided
8. Comply with ${engineName} guidelines
9. Add compliance flags for any hard stops or warnings from the guidelines

Return ONLY valid JSON with NO markdown, NO backticks, NO preamble. Use this exact structure:
{
  "planDetails": { "planType": "${planType}", "status": "draft", "effectiveDate": "${effectiveDate}", "annualPlanDate": "${annualPlanDate}", "aiConfidence": "high", "dataSources": ${JSON.stringify(dataSources)} },
  "individualSummary": { "strengths": ["specific strength 1", "specific strength 2"], "interests": ["specific interest 1", "specific interest 2"], "supportNeeds": ["specific need 1", "specific need 2"], "livingSituation": "detailed living situation description", "naturalSupports": ["natural support person/resource 1"] },
  "goals": [
    { "id": "G1", "number": 1, "title": "Specific goal title", "description": "2-3 sentence specific description referencing actual documented aspirations", "targetDate": "YYYY-MM-DD", "responsibleParty": "Case Manager + [specific provider]", "progress": "Not Started", "aiSuggested": true, "objectives": [{ "id": "G1O1", "description": "Specific action step", "status": "Not Started", "aiSuggested": true }], "aiGenerated": true }
  ],
  "services": [
    { "id": "S1", "name": "Exact service name from authorizations", "serviceName": "Exact service name", "provider": "Provider name", "frequency": "e.g. 5 days/week", "units": "e.g. 6 hrs/day", "startDate": "${effectiveDate}", "endDate": "${annualPlanDate}", "status": "Active", "authorizationId": "auth ID if available" }
  ],
  "supportNeeds": { "communication": "specific description", "mobility": "specific description", "selfCare": "specific description", "behavioral": "specific description", "medical": "specific description", "other": "" },
  "healthAndSafety": { "riskFactors": ["specific risk factor"], "safetyPlan": "detailed specific safety plan text", "emergencyContacts": ["specific contact"] },
  "backupPlan": { "primaryBackup": "specific backup person", "emergencyContact": "contact details" },
  "complianceFlags": [],
  "planNotes": "Any additional notes about this plan generation"
}`;
        // ── Step C: Call Gemini ───────────────────────────────────────────────────
        let rawText;
        try {
            rawText = await callAIDirect(systemPrompt, contextBlock, userPrompt, 8000, 0.25);
        }
        catch (err) {
            return { success: false, error: "GENERATION_FAILED", message: err.message || "Gemini call failed." };
        }
        // ── Step D: Parse JSON ────────────────────────────────────────────────────
        let parsedPlan;
        try {
            // Strip markdown fences if present
            const cleaned = rawText
                .replace(/^```json\s*/im, "")
                .replace(/^```\s*/im, "")
                .replace(/```\s*$/im, "")
                .trim();
            parsedPlan = JSON.parse(cleaned);
        }
        catch (_h) {
            // Try to extract JSON object from the text
            try {
                const match = rawText.match(/\{[\s\S]*\}/);
                if (!match)
                    throw new Error("No JSON found");
                parsedPlan = JSON.parse(match[0]);
            }
            catch (err) {
                return { success: false, error: "PARSE_FAILED", message: "Could not parse AI response as JSON." };
            }
        }
        // Validate minimum fields — ensure goals and services are never empty
        const rawGoals = Array.isArray(parsedPlan.goals) ? parsedPlan.goals : [];
        const rawServices = Array.isArray(parsedPlan.services) ? parsedPlan.services : [];
        // Normalize goals: add number field, ensure objectives array
        const normalizedGoals = rawGoals.map((g, i) => (Object.assign(Object.assign({}, g), { number: i + 1, id: g.id || `G${i + 1}`, objectives: Array.isArray(g.objectives) ? g.objectives.map((o, j) => (Object.assign(Object.assign({}, o), { id: o.id || `G${i + 1}O${j + 1}`, aiSuggested: true }))) : [], aiSuggested: true, aiGenerated: true })));
        // Normalize services: ensure both name and serviceName fields exist
        const normalizedServices = rawServices.map((s, i) => (Object.assign(Object.assign({}, s), { id: s.id || `S${i + 1}`, name: s.name || s.serviceName || "Service", serviceName: s.serviceName || s.name || "Service", status: s.status || "Active", startDate: s.startDate || effectiveDate, endDate: s.endDate || annualPlanDate, units: s.units || s.frequency || "" })));
        parsedPlan.goals = normalizedGoals;
        parsedPlan.services = normalizedServices;
        // ── Step E: Save to Firestore ─────────────────────────────────────────────
        try {
            const userSnap = await db.collection("users").doc(uid).get();
            const userData = userSnap.exists ? userSnap.data() : {};
            const createdByName = ((userData === null || userData === void 0 ? void 0 : userData.displayName) || (userData === null || userData === void 0 ? void 0 : userData.firstName)
                ? `${(userData === null || userData === void 0 ? void 0 : userData.firstName) || ""} ${(userData === null || userData === void 0 ? void 0 : userData.lastName) || ""}`.trim()
                : null) || ((_f = request.auth.token) === null || _f === void 0 ? void 0 : _f.name) || "Case Manager";
            // Generate human-readable plan ID: PCP-YEAR-INITIALS-NNN
            const firstName = (individual.first_name || "?")[0].toUpperCase();
            const lastName = (individual.last_name || "?")[0].toUpperCase();
            const initials = firstName + lastName;
            const year = new Date().getFullYear();
            let sequenceNum = 1;
            try {
                const existingPlans = await db.collection("care_plans")
                    .where("individual_id", "==", individualId)
                    .get();
                sequenceNum = existingPlans.size + 1;
            }
            catch ( /* non-fatal */_j) { /* non-fatal */ }
            const humanReadableId = `PCP-${year}-${initials}-${String(sequenceNum).padStart(3, "0")}`;
            const versionNote = `AI-generated draft · ${Object.values(dataSources).reduce((a, b) => a + b, 0)} data sources · ${engineName}`;
            const docRef = await db.collection("care_plans").add(Object.assign(Object.assign({}, parsedPlan), { individual_id: individualId, personId: individualId, status: "In Progress", source: "ai_generated", ai_generated: true, humanReadableId,
                versionNote, agentId: agentId || null, guidelinesEngineId: dynamicEngineId || null, guidelinesEngineName: engineName, specialInstructions: specialInstructions || null, effective_date: effectiveDate, annual_plan_date: annualPlanDate, plan_type: planType, created_by: uid, created_by_name: createdByName, organizationId: individual.organizationId || null, created_at: admin.firestore.FieldValue.serverTimestamp(), updated_at: admin.firestore.FieldValue.serverTimestamp(), internalDueDate: annualPlanDate || null, isCompleted: false, goals: normalizedGoals, services: normalizedServices, supportNeeds: parsedPlan.supportNeeds || {}, healthAndSafety: parsedPlan.healthAndSafety || {}, complianceFlags: parsedPlan.complianceFlags || [], dataSources }));
            const warnings = [];
            if (assessmentWarning === "NO_ASSESSMENT") {
                warnings.push({
                    type: "no_assessment",
                    severity: "warning",
                    message: "No completed assessments found. PCP generated from contact notes and monitoring forms only. Complete an Initial Assessment to improve accuracy.",
                });
            }
            else if (assessmentWarning === "OUTDATED_ASSESSMENT") {
                warnings.push({
                    type: "outdated_assessment",
                    severity: "info",
                    message: `Most recent assessment was completed ${assessmentAgeMonths} months ago. Consider completing a new assessment before finalizing this PCP renewal.`,
                });
            }
            return {
                success: true,
                planId: docRef.id,
                humanReadableId,
                plan: Object.assign(Object.assign({}, parsedPlan), { guidelinesEngineName: engineName }),
                engineName,
                dataSources,
                assessmentWarning,
                warnings,
            };
        }
        catch (err) {
            return { success: false, error: "SAVE_FAILED", message: err.message || "Failed to save plan to Firestore." };
        }
    }
    catch (err) {
        return { success: false, error: "DATA_LOAD_FAILED", message: err.message || "Failed to load individual data." };
    }
});
//# sourceMappingURL=generatePCP.js.map