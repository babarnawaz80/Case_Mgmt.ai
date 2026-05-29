// generatePCP — Firebase Callable Cloud Function
// CaseManagement.AI
//
// Loads all available chart data, builds a comprehensive prompt,
// calls Gemini to generate a complete Person-Centered Plan,
// saves it to Firestore, and returns the plan JSON + document ID.

import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { generateCompletion } from "../services/ai";

interface GeneratePCPRequest {
  individualId: string;
  planType: string;
  effectiveDate: string;
  annualPlanDate: string;
  specialInstructions: string;
  agentId: string;
}

// ─── Helper: 12 months ago timestamp ─────────────────────────────────────────
function twelveMonthsAgo(): admin.firestore.Timestamp {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return admin.firestore.Timestamp.fromDate(d);
}

// ─── Helper: safe doc data ────────────────────────────────────────────────────
function safeData(snap: admin.firestore.DocumentSnapshot): Record<string, unknown> {
  return snap.exists ? (snap.data() as Record<string, unknown>) : {};
}

// ─── Load data from a top-level collection filtered by individualId ───────────
async function loadCollection(
  db: admin.firestore.Firestore,
  collectionName: string,
  individualId: string,
  dateField: string,
  limitCount: number
): Promise<admin.firestore.QueryDocumentSnapshot[]> {
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
  } catch {
    // Try without date filter (no composite index)
    try {
      const snap = await db
        .collection(collectionName)
        .where("individualId", "==", individualId)
        .limit(limitCount)
        .get();
      return snap.docs;
    } catch {
      return [];
    }
  }
}

// ─── Build summary text from a doc array ─────────────────────────────────────
function summarizeDocs(
  docs: admin.firestore.QueryDocumentSnapshot[],
  fields: string[],
  maxCharsEach = 300
): string {
  if (docs.length === 0) return "None found.";
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

export const generatePCP = onCall(
  { cors: true, memory: "1GiB", timeoutSeconds: 300 },
  async (request) => {
    const db = admin.firestore();

    if (!request.auth) {
      return { success: false, error: "AUTH_REQUIRED", message: "Authentication required." };
    }

    const uid = request.auth.uid;
    const {
      individualId,
      planType = "Annual Plan",
      effectiveDate = "",
      annualPlanDate = "",
      specialInstructions = "",
      agentId = "",
    } = (request.data as GeneratePCPRequest) ?? {};

    if (!individualId) {
      return { success: false, error: "MISSING_PARAMS", message: "individualId is required." };
    }

    try {
      // ── Step A: Load all data in parallel ────────────────────────────────────
      const [
        individualSnap,
        agentSnap,
        contactNotesResult,
        visitSummariesResult,
        monitoringFormsResult,
        progressNotesResult,
        ambientSessionsResult,
        incidentsResult,
        authorizationsResult,
        assessmentsResult,
        priorPlansResult,
      ] = await Promise.allSettled([
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
          .catch(() => ({ docs: [] as admin.firestore.QueryDocumentSnapshot[] })),
        db.collection("assessments").where("individualId", "==", individualId).limit(10).get()
          .catch(() => ({ docs: [] as admin.firestore.QueryDocumentSnapshot[] })),
        db.collection("care_plans").where("individual_id", "==", individualId).orderBy("created_at", "desc").limit(3).get()
          .catch(() => ({ docs: [] as admin.firestore.QueryDocumentSnapshot[] })),
      ]);

      // Extract results (use empty fallbacks)
      const individual = individualSnap.status === "fulfilled" ? safeData(individualSnap.value as admin.firestore.DocumentSnapshot) : {};
      const agent = agentSnap.status === "fulfilled" && agentSnap.value ? safeData(agentSnap.value as admin.firestore.DocumentSnapshot) : {};

      const contactNotes = contactNotesResult.status === "fulfilled" ? contactNotesResult.value : [];
      const visitSummaries = visitSummariesResult.status === "fulfilled" ? visitSummariesResult.value : [];
      const monitoringForms = monitoringFormsResult.status === "fulfilled" ? monitoringFormsResult.value : [];
      const progressNotes = progressNotesResult.status === "fulfilled" ? progressNotesResult.value : [];
      const ambientSessions = ambientSessionsResult.status === "fulfilled" ? ambientSessionsResult.value : [];
      const incidents = incidentsResult.status === "fulfilled" ? incidentsResult.value : [];
      const authorizationDocs = authorizationsResult.status === "fulfilled" ? (authorizationsResult.value as any).docs || [] : [];
      const assessmentDocs = assessmentsResult.status === "fulfilled" ? (assessmentsResult.value as any).docs || [] : [];
      const priorPlanDocs = priorPlansResult.status === "fulfilled" ? (priorPlansResult.value as any).docs || [] : [];

      // Load guidelines engine if linked
      let engineData: Record<string, unknown> = {};
      const engineId = agent.guidelines_engine_id as string;
      if (engineId) {
        try {
          const engineSnap = await db.collection("guidelines_engines").doc(engineId).get();
          if (engineSnap.exists) engineData = safeData(engineSnap);
        } catch { /* non-fatal */ }
      }

      const engineName = (engineData.name as string) || (agent.guidelines_engine_name as string) || "State DD Waiver Guidelines";
      const masterPrompt = (agent.master_prompt as string) || "";

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

ASSESSMENTS (${assessmentDocs.length}):
${summarizeDocs(assessmentDocs, ["assessmentType", "date", "score", "keyFindings", "summary"], 200)}

${priorPlanDocs.length > 0 ? `PRIOR PLAN HISTORY (most recent):
${JSON.stringify((priorPlanDocs[0] as any).data().goals || [], null, 2).slice(0, 1000)}` : "PRIOR PLAN: No prior plans on file."}

${specialInstructions ? `CASE MANAGER SPECIAL INSTRUCTIONS:\n${specialInstructions}` : ""}`;

      const userPrompt = `Based on ALL of the above information, generate a complete, high-quality Person-Centered Plan for ${indName}.

The plan must:
1. Be written in person-first, strengths-based language
2. Include 3-5 specific, measurable goals based on expressed interests and documented needs
3. Each goal must have: title, description, targetDate, responsibleParty, progress: "Not Started", objectives (2-3 per goal)
4. List all active services with service names from the authorizations on file
5. Document support needs and preferences from contact notes and visit summaries
6. Include health and safety section if incidents or health concerns are documented
7. Reference specific events, preferences, and progress — do NOT generate generic boilerplate
8. Comply with ${engineName} guidelines

Return ONLY valid JSON with NO markdown, NO backticks, NO preamble. Use this exact structure:
{
  "planDetails": { "planType": "${planType}", "status": "draft", "effectiveDate": "${effectiveDate}", "annualPlanDate": "${annualPlanDate}", "aiConfidence": "high", "dataSources": ${JSON.stringify(dataSources)} },
  "individualSummary": { "strengths": [], "interests": [], "supportNeeds": [], "livingSituation": "", "naturalSupports": [] },
  "goals": [{ "id": "G1", "title": "", "description": "", "targetDate": "", "responsibleParty": "", "progress": "Not Started", "objectives": [{ "description": "", "status": "Not Started", "aiGenerated": true }], "aiGenerated": true }],
  "services": [{ "serviceName": "", "provider": "", "frequency": "", "authorizationId": "" }],
  "supportNeeds": { "communication": "", "mobility": "", "selfCare": "", "behavioral": "", "medical": "", "other": "" },
  "healthAndSafety": { "riskFactors": [], "safetyPlan": "", "emergencyContacts": [] },
  "backupPlan": { "primaryBackup": "", "emergencyContact": "" },
  "complianceFlags": [],
  "planNotes": ""
}`;

      // ── Step C: Call Gemini ───────────────────────────────────────────────────

      let rawText: string;
      try {
        const result = await generateCompletion(
          systemPrompt,
          userPrompt,
          contextBlock,
          "quality",
          individual.organizationId as string || "unknown",
          uid,
          "generate_pcp",
          { maxTokens: 8000, temperature: 0.25 }
        );
        rawText = result.text;
      } catch (err: any) {
        return { success: false, error: "GENERATION_FAILED", message: err.message || "Gemini call failed." };
      }

      // ── Step D: Parse JSON ────────────────────────────────────────────────────

      let parsedPlan: Record<string, unknown>;
      try {
        // Strip markdown fences if present
        const cleaned = rawText
          .replace(/^```json\s*/im, "")
          .replace(/^```\s*/im, "")
          .replace(/```\s*$/im, "")
          .trim();
        parsedPlan = JSON.parse(cleaned);
      } catch {
        // Try to extract JSON object from the text
        try {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (!match) throw new Error("No JSON found");
          parsedPlan = JSON.parse(match[0]);
        } catch (err: any) {
          return { success: false, error: "PARSE_FAILED", message: "Could not parse AI response as JSON." };
        }
      }

      // Validate minimum fields
      if (!parsedPlan.goals || !Array.isArray(parsedPlan.goals)) {
        parsedPlan.goals = [];
      }

      // ── Step E: Save to Firestore ─────────────────────────────────────────────

      try {
        const userSnap = await db.collection("users").doc(uid).get();
        const userData = userSnap.exists ? userSnap.data() : {};
        const createdByName = (userData?.displayName || userData?.firstName
          ? `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim()
          : null) || request.auth.token?.name || "Case Manager";

        const docRef = await db.collection("care_plans").add({
          ...parsedPlan,
          individual_id: individualId,
          personId: individualId,
          status: "draft",
          source: "ai_generated",
          ai_generated: true,
          agentId: agentId || null,
          guidelinesEngineId: engineId || null,
          guidelinesEngineName: engineName,
          specialInstructions: specialInstructions || null,
          effective_date: effectiveDate,
          annual_plan_date: annualPlanDate,
          plan_type: planType,
          created_by: uid,
          created_by_name: createdByName,
          organizationId: individual.organizationId || null,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          // Fields for PersonCarePlan list view
          internalDueDate: annualPlanDate || null,
          isCompleted: false,
          goals: (parsedPlan.goals as any[]) || [],
          services: (parsedPlan.services as any[]) || [],
        });

        return {
          success: true,
          planId: docRef.id,
          plan: parsedPlan,
          engineName,
          dataSources,
        };
      } catch (err: any) {
        return { success: false, error: "SAVE_FAILED", message: err.message || "Failed to save plan to Firestore." };
      }
    } catch (err: any) {
      return { success: false, error: "DATA_LOAD_FAILED", message: err.message || "Failed to load individual data." };
    }
  }
);
