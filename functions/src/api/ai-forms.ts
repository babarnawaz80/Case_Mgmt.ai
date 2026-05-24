// AI Forms API — All form pre-fill endpoints
// CaseManagement.AI — Uses Gemini 2.0 Flash (fast tier) for all form pre-fills
// NEVER saves to Firestore — returns suggestions only. User confirms before saving.

import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { generateCompletion } from "../services/ai";
import { consumeCredits } from "../services/credits";
import { logAction } from "../services/audit";
import { COLLECTIONS } from "../config/collections";

// ─── Progress Note Pre-fill ───────────────────────────────────────────────
export async function progressNotePrefill(req: Request, res: Response): Promise<void> {
  try {
    const { individualId, organizationId, userId, userName, userRole } = req.body;

    if (!individualId || !organizationId || !userId) {
      res.status(400).json({ error: "Missing required fields." });
      return;
    }

    const db = admin.firestore();

    // Load context data
    const [individualSnap, notesSnap, monitoringSnap, carePlanSnap] = await Promise.all([
      db.collection(COLLECTIONS.INDIVIDUALS).doc(individualId).get(),
      db.collection(COLLECTIONS.CONTACT_NOTES)
        .where("individualId", "==", individualId)
        .orderBy("activity_date", "desc")
        .limit(5)
        .get(),
      db.collection(COLLECTIONS.MONITORING_FORMS)
        .where("individualId", "==", individualId)
        .orderBy("complete_date", "desc")
        .limit(3)
        .get(),
      db.collection(COLLECTIONS.CARE_PLANS)
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
        name: `${individual?.first_name} ${individual?.last_name}`,
        preferred_name: individual?.preferred_name,
        diagnosis: individual?.diagnosis,
        risk_score: individual?.risk_score,
      },
      recent_notes: notes.map((n) => ({
        date: n.activity_date,
        type: n.activity_type,
        purpose: n.purpose_of_activity,
        issues: n.issues_concerns,
        next_steps: n.next_steps,
      })),
      monitoring_summary: monitoring.map((m) => ({
        date: m.complete_date,
        goal_progress: m.sections?.s4_progress_toward_outcomes,
      })),
      active_goals: carePlan?.goals?.filter((g: Record<string, unknown>) => g.progress_status !== "met"),
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

    const result = await generateCompletion(
      systemPrompt,
      userPrompt,
      context,
      "fast",
      organizationId,
      userId,
      "progress_note_prefill"
    );

    // Consume credits
    await consumeCredits({
      organizationId,
      userId,
      userName: userName ?? "Unknown",
      userRole: userRole ?? "case_manager",
      feature: "progress_note_prefill",
      model: "gemini-flash-latest",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      individualId,
    });

    // Audit
    await logAction({
      organizationId,
      actorUid: userId,
      actorName: userName ?? "Unknown",
      actorRole: userRole ?? "case_manager",
      action: "AI_PREFILL_REQUESTED",
      collectionName: COLLECTIONS.PROGRESS_NOTES,
      recordId: "new",
      individualId,
      summary: `AI pre-fill requested for progress note`,
      source: "ai",
    });

    // Parse the JSON response
    let suggestions: Record<string, unknown>;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.text };
    } catch {
      suggestions = { raw: result.text };
    }

    res.json({ success: true, suggestions, ai_session_id: Date.now().toString() });
  } catch (error) {
    const message = (error as Error).message;
    if (["AI_PAUSED", "INSUFFICIENT_CREDITS", "DAILY_LIMIT_REACHED"].includes(message)) {
      res.status(402).json({ error: message });
    } else {
      console.error("[progress-note-prefill]", error);
      res.status(500).json({ error: "AI service temporarily unavailable." });
    }
  }
}

// ─── Monitoring Form Pre-fill ─────────────────────────────────────────────
export async function monitoringFormPrefill(req: Request, res: Response): Promise<void> {
  try {
    const { individualId, organizationId, userId, userName, userRole } = req.body;

    if (!individualId || !organizationId || !userId) {
      res.status(400).json({ error: "Missing required fields." });
      return;
    }

    const db = admin.firestore();

    const [individualSnap, visitSnap, contactSnap, progressSnap, monitoringSnap, incidentsSnap] = await Promise.all([
      db.collection(COLLECTIONS.INDIVIDUALS).doc(individualId).get(),
      db.collection(COLLECTIONS.VISIT_SUMMARIES)
        .where("individualId", "==", individualId)
        .orderBy("visitDate", "desc")
        .limit(3)
        .get(),
      db.collection(COLLECTIONS.CONTACT_NOTES)
        .where("individualId", "==", individualId)
        .orderBy("activity_date", "desc")
        .limit(5)
        .get(),
      db.collection(COLLECTIONS.PROGRESS_NOTES)
        .where("individualId", "==", individualId)
        .orderBy("created_at", "desc")
        .limit(2)
        .get(),
      db.collection(COLLECTIONS.MONITORING_FORMS)
        .where("individualId", "==", individualId)
        .orderBy("created_at", "desc")
        .limit(1)
        .get(),
      db.collection(COLLECTIONS.INCIDENTS)
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
        name: `${individual?.first_name} ${individual?.last_name}`,
        preferred_name: individual?.preferred_name,
        diagnosis: individual?.diagnosis,
        risk_score: individual?.risk_score,
        risk_level: individual?.risk_level,
        program: individual?.program,
        level_of_care: individual?.level_of_care,
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
        s2_any_yes: lastMonitoring.s2_circumstances?.some((q: any) => q.answer === "Yes"),
        s6_risk_score: lastMonitoring.s6_riskScore,
        s9_actions: lastMonitoring.s9_recommendedActions?.map((a: any) => a.text),
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

    const result = await generateCompletion(
      systemPrompt,
      userPrompt,
      context,
      "fast",
      organizationId,
      userId,
      "monitoring_form_prefill"
    );

    await consumeCredits({
      organizationId,
      userId,
      userName: userName ?? "Unknown",
      userRole: userRole ?? "case_manager",
      feature: "monitoring_form_prefill",
      model: "gemini-flash-latest",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      individualId,
    });

    await logAction({
      organizationId,
      actorUid: userId,
      actorName: userName ?? "Unknown",
      actorRole: userRole ?? "case_manager",
      action: "AI_PREFILL_REQUESTED",
      collectionName: COLLECTIONS.MONITORING_FORMS,
      recordId: "new",
      individualId,
      summary: `AI pre-fill requested for monitoring form`,
      source: "ai",
    });

    let suggestions: Record<string, unknown>;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.text };
    } catch {
      suggestions = { raw: result.text };
    }

    res.json({ success: true, suggestions, ai_session_id: Date.now().toString() });
  } catch (error) {
    const message = (error as Error).message;
    if (["AI_PAUSED", "INSUFFICIENT_CREDITS", "DAILY_LIMIT_REACHED"].includes(message)) {
      res.status(402).json({ error: message });
    } else {
      console.error("[monitoring-form-prefill]", error);
      res.status(500).json({ error: "AI service temporarily unavailable." });
    }
  }
}

// ─── Visit Summary Pre-fill ───────────────────────────────────────────────
export async function visitSummaryPrefill(req: Request, res: Response): Promise<void> {
  try {
    const { individualId, organizationId, userId, userName, userRole } = req.body;

    if (!individualId || !organizationId || !userId) {
      res.status(400).json({ error: "Missing required fields." });
      return;
    }

    const db = admin.firestore();

    const [individualSnap, contactSnap, monitoringSnap, lastVisitSnap] = await Promise.all([
      db.collection(COLLECTIONS.INDIVIDUALS).doc(individualId).get(),
      db.collection(COLLECTIONS.CONTACT_NOTES)
        .where("individualId", "==", individualId)
        .orderBy("activity_date", "desc")
        .limit(3)
        .get(),
      db.collection(COLLECTIONS.MONITORING_FORMS)
        .where("individualId", "==", individualId)
        .orderBy("created_at", "desc")
        .limit(1)
        .get(),
      db.collection(COLLECTIONS.VISIT_SUMMARIES)
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
        name: `${individual?.first_name} ${individual?.last_name}`,
        preferred_name: individual?.preferred_name,
        diagnosis: individual?.diagnosis,
        risk_score: individual?.risk_score,
        program: individual?.program,
        next_visit_date: individual?.next_visit_date,
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
        s9_actions: lastMonitoring.s9_recommendedActions?.map((a: any) => a.text),
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

    const result = await generateCompletion(
      systemPrompt,
      userPrompt,
      context,
      "fast",
      organizationId,
      userId,
      "visit_summary_prefill"
    );

    await consumeCredits({
      organizationId,
      userId,
      userName: userName ?? "Unknown",
      userRole: userRole ?? "case_manager",
      feature: "visit_summary_prefill",
      model: "gemini-flash-latest",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      individualId,
    });

    await logAction({
      organizationId,
      actorUid: userId,
      actorName: userName ?? "Unknown",
      actorRole: userRole ?? "case_manager",
      action: "AI_PREFILL_REQUESTED",
      collectionName: COLLECTIONS.VISIT_SUMMARIES,
      recordId: "new",
      individualId,
      summary: `AI pre-fill requested for visit summary`,
      source: "ai",
    });

    let suggestions: Record<string, unknown>;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.text };
    } catch {
      suggestions = { raw: result.text };
    }

    res.json({ success: true, suggestions, ai_session_id: Date.now().toString() });
  } catch (error) {
    const message = (error as Error).message;
    if (["AI_PAUSED", "INSUFFICIENT_CREDITS", "DAILY_LIMIT_REACHED"].includes(message)) {
      res.status(402).json({ error: message });
    } else {
      console.error("[visit-summary-prefill]", error);
      res.status(500).json({ error: "AI service temporarily unavailable." });
    }
  }
}

// ─── Care Plan Draft ──────────────────────────────────────────────────────
export async function carePlanDraft(req: Request, res: Response): Promise<void> {
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
      db.collection(COLLECTIONS.INDIVIDUALS).doc(individualId).get(),
      db.collection(COLLECTIONS.MONITORING_FORMS)
        .where("individualId", "==", individualId)
        .where("created_at", ">=", twelveMonthsAgoTs)
        .orderBy("created_at", "desc")
        .limit(12)
        .get(),
      db.collection(COLLECTIONS.VISIT_SUMMARIES)
        .where("individualId", "==", individualId)
        .where("createdAt", ">=", twelveMonthsAgoTs)
        .orderBy("createdAt", "desc")
        .limit(12)
        .get(),
      db.collection(COLLECTIONS.CONTACT_NOTES)
        .where("individualId", "==", individualId)
        .orderBy("activity_date", "desc")
        .limit(10)
        .get(),
      db.collection(COLLECTIONS.CARE_PLANS)
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
        name: `${individual?.first_name} ${individual?.last_name}`,
        preferred_name: individual?.preferred_name,
        diagnosis: individual?.diagnosis,
        risk_score: individual?.risk_score,
        risk_level: individual?.risk_level,
        program: individual?.program,
        level_of_care: individual?.level_of_care,
        gender: individual?.gender,
        age: individual?.dob,
      },
      monitoring_summary: monitoringForms.slice(0, 4).map((m) => ({
        date: m.created_at,
        s6_risk: m.s6_riskScore,
        actions: m.s9_recommendedActions?.map((a: any) => a.text)?.slice(0, 3),
        circumstances_concerns: m.s2_circumstances?.filter((q: any) => q.answer === "Yes")?.map((q: any) => q.question)?.slice(0, 3),
      })),
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
      current_plan_goals: currentPlan?.goals?.map((g: any) => ({ title: g.title, status: g.progress_status })) ?? [],
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

    const result = await generateCompletion(
      systemPrompt,
      userPrompt,
      context,
      "fast",
      organizationId,
      userId,
      "care_plan_draft",
      { maxTokens: 4096 }
    );

    await consumeCredits({
      organizationId,
      userId,
      userName: userName ?? "Unknown",
      userRole: userRole ?? "case_manager",
      feature: "care_plan_draft",
      model: "gemini-flash-latest",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      individualId,
    });

    await logAction({
      organizationId,
      actorUid: userId,
      actorName: userName ?? "Unknown",
      actorRole: userRole ?? "case_manager",
      action: "AI_CARE_PLAN_DRAFTED",
      collectionName: COLLECTIONS.CARE_PLANS,
      recordId: "new",
      individualId,
      summary: `AI care plan draft generated`,
      source: "ai",
    });

    let draft: Record<string, unknown>;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      draft = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.text };
    } catch {
      draft = { raw: result.text };
    }

    res.json({ success: true, draft, ai_session_id: Date.now().toString() });
  } catch (error) {
    const message = (error as Error).message;
    if (["AI_PAUSED", "INSUFFICIENT_CREDITS", "DAILY_LIMIT_REACHED"].includes(message)) {
      res.status(402).json({ error: message });
    } else {
      console.error("[care-plan-draft]", error);
      res.status(500).json({ error: "AI service temporarily unavailable." });
    }
  }
}

