// Brain Orchestrator — Main Engine
// CaseManagement.AI
//
// Runs nightly at 2am ET (scheduled) and on-demand (callable).
// Processes all active individuals, runs 5 specialist agents, creates tasks,
// updates compliance scores, and writes a full audit trail.

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

import {
  OrchestratorRun,
  OrchestratorTask,
  IndividualRecord,
  RulePack,
  AgentResult,
  AgentPrompts,
  ComplianceFinding,
  OrchestratorSettings,
  DEFAULT_ORCHESTRATOR_SETTINGS,
  DEFAULT_AGENT_PROMPTS,
} from "./types";
import { getDefaultRulePack } from "./defaultRulePacks";
import { runComplianceAgent } from "./agents/complianceAgent";
import { runDocumentationAgent } from "./agents/documentationAgent";
import { runBillingAgent } from "./agents/billingAgent";
import { runEscalationAgent } from "./agents/escalationAgent";
import { runRenewalAgent } from "./agents/renewalAgent";
import { runAuthorizationAgent } from "./agents/authorizationAgent";
import { runAssessmentAgent } from "./agents/assessmentAgent";
import { clearEngineCache } from "./utilities/getGuidelinesEngine";

const ORCHESTRATOR_TASKS = "orchestrator_tasks";
const ORCHESTRATOR_RUNS = "orchestrator_runs";
const ORCHESTRATOR_LOGS = "orchestrator_logs";
const TASKS = "tasks";

// ─── Scheduled: runs every night at 2am ET ────────────────────────────────────
export const scheduledOrchestrator = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "America/New_York",
    memory: "1GiB",
    timeoutSeconds: 540,
  },
  async (_event) => {
    const db = admin.firestore();

    // Find all organizations (run for all orgs in the system)
    let orgSnap: admin.firestore.QuerySnapshot;
    try {
      orgSnap = await db.collection("organizations").get();
    } catch (err) {
      console.error("[BrainOrchestrator] Failed to load organizations:", err);
      return;
    }

    console.log(`[BrainOrchestrator] Running scheduled job for ${orgSnap.size} organizations`);

    for (const orgDoc of orgSnap.docs) {
      try {
        await runOrchestrator(orgDoc.id, "scheduled", "system", db);
      } catch (err) {
        console.error(`[BrainOrchestrator] Failed for org ${orgDoc.id}:`, err);
      }
    }
  }
);

// ─── Callable: manual trigger by admin ────────────────────────────────────────
export const manualOrchestratorRun = onCall(
  { cors: true, memory: "1GiB", timeoutSeconds: 540 },
  async (request) => {
    const db = admin.firestore();

    // Auth check
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const uid = request.auth.uid;

    // Load user profile to get org and verify admin/supervisor role
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      throw new Error("User profile not found");
    }

    const userProfile = userSnap.data()!;
    const orgId = (request.data?.orgId as string | undefined) ?? userProfile.organizationId as string;
    const role = userProfile.role as string;

    if (role !== "admin" && role !== "supervisor") {
      throw new Error("Admin or supervisor role required to trigger orchestrator");
    }

    if (!orgId) {
      throw new Error("Organization ID required");
    }

    console.log(`[BrainOrchestrator] Manual run triggered by ${uid} (${role}) for org ${orgId}`);

    const result = await runOrchestrator(orgId, "manual", uid, db);
    return result;
  }
);

// ─── Core Orchestrator Logic ──────────────────────────────────────────────────
async function runOrchestrator(
  orgId: string,
  runType: "scheduled" | "manual",
  triggeredBy: string,
  db: admin.firestore.Firestore
): Promise<Omit<OrchestratorRun, "started_at" | "completed_at">> {
  const startTime = admin.firestore.Timestamp.now();

  // Create the run document
  const runRef = await db.collection(ORCHESTRATOR_RUNS).add({
    org_id: orgId,
    run_type: runType,
    triggered_by: triggeredBy,
    started_at: startTime,
    status: "running",
    individuals_processed: 0,
    tasks_created: 0,
    drafts_generated: 0,
    escalations_triggered: 0,
    compliance_scores_updated: 0,
    errors: [],
  } as Partial<OrchestratorRun>);

  const runId = runRef.id;
  const errors: string[] = [];
  let individualsProcessed = 0;
  let tasksCreated = 0;
  let draftsGenerated = 0;
  let escalationsTriggered = 0;
  let complianceScoresUpdated = 0;

  try {
    // Clear engine cache for this run (cache persists per warm instance, clear for fresh run)
    clearEngineCache();

    // Load orchestrator settings and custom agent prompts
    const settings = await loadOrchestratorSettings(orgId, db);
    const customPrompts = await loadAgentPrompts(orgId, db);

    // Load all active individuals for this org
    let individualsSnap: admin.firestore.QuerySnapshot;
    try {
      individualsSnap = await db
        .collection("individuals")
        .where("organizationId", "==", orgId)
        .where("enrollment_status", "==", "active")
        .get();
    } catch {
      // Fallback: try without enrollment_status filter
      try {
        individualsSnap = await db
          .collection("individuals")
          .where("organizationId", "==", orgId)
          .get();
      } catch (err2) {
        errors.push(`Failed to load individuals: ${(err2 as Error).message}`);
        await finalizeRun(runRef, "failed", errors, 0, 0, 0, 0, 0);
        return buildRunResult(runId, orgId, runType, triggeredBy, "failed", 0, 0, 0, 0, 0, errors);
      }
    }

    console.log(`[BrainOrchestrator] Processing ${individualsSnap.size} individuals for org ${orgId}`);

    for (const indDoc of individualsSnap.docs) {
      const individual = toIndividualRecord(indDoc.id, indDoc.data());
      let complianceFindings: ComplianceFinding[] = [];

      try {
        // Load the guidelines engine rule pack for this individual
        const rulePack = await loadRulePack(individual, orgId, db);

        // ── Agent 1: Compliance ───────────────────────────────────────────────
        let complianceResult: AgentResult = { tasks: [], logs: [], compliance_score: 70, drafts_count: 0 };
        if (settings.agents_enabled.compliance) {
          try {
            complianceResult = await runComplianceAgent(individual, rulePack, runId, orgId, db);
            if (complianceResult.compliance_score !== undefined) {
              complianceScoresUpdated++;
            }
            // Reconstruct ComplianceFindings from tasks for the documentation agent
            complianceFindings = complianceResult.tasks.map((t) => ({
              type: t.task_type as string,
              severity: (t.severity === "critical" ? "critical" : t.severity === "high" ? "warning" : "info") as "critical" | "warning" | "info",
              title: t.title,
              description: t.description,
              days_overdue: t.days_overdue,
              rule_reference: t.rule_reference,
              requires_task: true,
              requires_draft: t.has_ai_draft,
            }));
          } catch (err) {
            errors.push(`Compliance agent failed for ${individual.id}: ${(err as Error).message}`);
          }
        }

        // ── Agent 2: Documentation ────────────────────────────────────────────
        let docResult: AgentResult = { tasks: [], logs: [], drafts_count: 0 };
        if (settings.agents_enabled.documentation && complianceFindings.length > 0) {
          try {
            docResult = await runDocumentationAgent(individual, complianceFindings, runId, orgId, db, customPrompts.documentation);
            draftsGenerated += docResult.drafts_count;
          } catch (err) {
            errors.push(`Documentation agent failed for ${individual.id}: ${(err as Error).message}`);
          }
        }

        // ── Agent 3: Billing ──────────────────────────────────────────────────
        let billingResult: AgentResult = { tasks: [], logs: [], drafts_count: 0 };
        if (settings.agents_enabled.billing) {
          try {
            billingResult = await runBillingAgent(individual, runId, orgId, db);
          } catch (err) {
            errors.push(`Billing agent failed for ${individual.id}: ${(err as Error).message}`);
          }
        }

        // ── Agent 4: Escalation ───────────────────────────────────────────────
        let escalationResult: AgentResult = { tasks: [], logs: [], drafts_count: 0 };
        if (settings.agents_enabled.escalation) {
          try {
            escalationResult = await runEscalationAgent(individual, runId, orgId, settings, db);
            escalationsTriggered += escalationResult.tasks.length;
          } catch (err) {
            errors.push(`Escalation agent failed for ${individual.id}: ${(err as Error).message}`);
          }
        }

        // ── Agent 5: Renewal ──────────────────────────────────────────────────
        let renewalResult: AgentResult = { tasks: [], logs: [], drafts_count: 0 };
        if (settings.agents_enabled.renewal) {
          try {
            renewalResult = await runRenewalAgent(individual, rulePack, runId, orgId, db, customPrompts.renewal);
            draftsGenerated += renewalResult.drafts_count;
          } catch (err) {
            errors.push(`Renewal agent failed for ${individual.id}: ${(err as Error).message}`);
          }
        }

        // ── Agent 6: Authorization ────────────────────────────────────────────
        let authResult: AgentResult = { tasks: [], logs: [], drafts_count: 0 };
        if ((settings.agents_enabled as any).authorization !== false) {
          try {
            authResult = await runAuthorizationAgent(individual, runId, orgId, db);
          } catch (err) {
            errors.push(`Authorization agent failed for ${individual.id}: ${(err as Error).message}`);
          }
        }

        // ── Agent 7: Assessment Compliance ────────────────────────────────────
        let assessmentResult: AgentResult = { tasks: [], logs: [], drafts_count: 0 };
        if ((settings.agents_enabled as any).assessment !== false) {
          try {
            assessmentResult = await runAssessmentAgent(individual, runId, orgId, db);
          } catch (err) {
            errors.push(`Assessment agent failed for ${individual.id}: ${(err as Error).message}`);
          }
        }

        // ── Collect all tasks from all agents ─────────────────────────────────
        const allTasks = [
          ...complianceResult.tasks,
          ...docResult.tasks,
          ...billingResult.tasks,
          ...escalationResult.tasks,
          ...renewalResult.tasks,
          ...authResult.tasks,
          ...assessmentResult.tasks,
        ];

        const allLogs = [
          ...complianceResult.logs,
          ...docResult.logs,
          ...billingResult.logs,
          ...escalationResult.logs,
          ...renewalResult.logs,
          ...authResult.logs,
          ...assessmentResult.logs,
        ];

        // ── Write tasks to both orchestrator_tasks and tasks (My Work) ─────────
        for (const task of allTasks) {
          try {
            // Write to orchestrator_tasks collection
            const orchTaskRef = await db.collection(ORCHESTRATOR_TASKS).add({
              ...task,
              run_id: runId,
              created_at: admin.firestore.FieldValue.serverTimestamp(),
              updated_at: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Write to tasks collection (for My Work integration)
            if (task.assigned_to_user_id) {
              const dueDate = (task.due_date as admin.firestore.Timestamp)
                .toDate()
                .toISOString()
                .split("T")[0]!;

              await db.collection(TASKS).add({
                title: task.title,
                description: task.description,
                individualId: task.individual_id,
                individualName: task.individual_name,
                dueDate,
                status: "open",
                priority: task.severity === "critical" || task.severity === "high" ? "high" : task.severity === "medium" ? "medium" : "low",
                type: taskTypeToLabel(task.task_type),
                assignedTo: task.assigned_to_user_id,
                organizationId: task.org_id,
                source: "brain_orchestrator",
                has_ai_draft: task.has_ai_draft,
                orchestrator_task_id: orchTaskRef.id,
                rule_reference: task.rule_reference,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              tasksCreated++;
            }
          } catch (err) {
            errors.push(`Failed to write task for ${individual.id}: ${(err as Error).message}`);
          }
        }

        // ── Write logs ────────────────────────────────────────────────────────
        const logBatch = db.batch();
        for (const log of allLogs) {
          const logRef = db.collection(ORCHESTRATOR_LOGS).doc();
          logBatch.set(logRef, {
            ...log,
            run_id: runId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        try {
          await logBatch.commit();
        } catch {
          // Non-fatal — logs are informational
        }

        individualsProcessed++;
      } catch (err) {
        const errMsg = `Failed to process individual ${individual.id}: ${(err as Error).message}`;
        errors.push(errMsg);
        console.error(`[BrainOrchestrator] ${errMsg}`);
      }
    }

    // Generate run summary
    const summary = `Processed ${individualsProcessed} individuals. Created ${tasksCreated} tasks. Generated ${draftsGenerated} AI drafts. Triggered ${escalationsTriggered} escalations. Updated ${complianceScoresUpdated} compliance scores.${errors.length > 0 ? ` ${errors.length} errors.` : ""}`;

    await finalizeRun(runRef, "completed", errors, individualsProcessed, tasksCreated, draftsGenerated, escalationsTriggered, complianceScoresUpdated, summary);

    console.log(`[BrainOrchestrator] Completed. ${summary}`);

    return buildRunResult(runId, orgId, runType, triggeredBy, "completed", individualsProcessed, tasksCreated, draftsGenerated, escalationsTriggered, complianceScoresUpdated, errors, summary);
  } catch (err) {
    const errMsg = (err as Error).message;
    errors.push(errMsg);
    await finalizeRun(runRef, "failed", errors, individualsProcessed, tasksCreated, draftsGenerated, escalationsTriggered, complianceScoresUpdated);
    console.error(`[BrainOrchestrator] Fatal error for org ${orgId}:`, err);
    return buildRunResult(runId, orgId, runType, triggeredBy, "failed", individualsProcessed, tasksCreated, draftsGenerated, escalationsTriggered, complianceScoresUpdated, errors);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadOrchestratorSettings(
  orgId: string,
  db: admin.firestore.Firestore
): Promise<OrchestratorSettings> {
  try {
    const snap = await db
      .collection("organizations")
      .doc(orgId)
      .collection("settings")
      .doc("orchestrator")
      .get();
    if (snap.exists) {
      return { ...DEFAULT_ORCHESTRATOR_SETTINGS, ...snap.data() } as OrchestratorSettings;
    }
  } catch {
    // Non-fatal — use defaults
  }
  return DEFAULT_ORCHESTRATOR_SETTINGS;
}

async function loadRulePack(
  individual: IndividualRecord,
  orgId: string,
  db: admin.firestore.Firestore
): Promise<RulePack> {
  try {
    // Try to find a published guidelines engine for this individual's state/program
    const snap = await db
      .collection("guidelines_engines")
      .where("organizationId", "==", orgId)
      .where("status", "==", "published")
      .limit(5)
      .get();

    if (!snap.empty) {
      // Find the best match: same state + program
      const state = individual.state ?? "Indiana";
      const program = individual.program ?? individual.waiver_type ?? individual.program_type;

      let bestMatch = snap.docs[0];
      for (const engineDoc of snap.docs) {
        const data = engineDoc.data();
        if (
          data.state === state &&
          (data.program === program || !program)
        ) {
          bestMatch = engineDoc;
          break;
        }
      }

      const engineData = bestMatch?.data() ?? {};

      // Map engine data to RulePack format
      const rulePack: RulePack = {
        visit_frequency_months: engineData.visit_frequency_months ?? 3,
        monitoring_form_frequency_months: engineData.monitoring_form_frequency_months ?? 3,
        contact_frequency_months: engineData.contact_frequency_months ?? 1,
        annual_pcp_required: engineData.annual_pcp_required ?? true,
        pcp_renewal_cycle_days: engineData.pcp_renewal_cycle_days ?? 365,
        medicaid_redetermination_cycle_days: engineData.medicaid_redetermination_cycle_days ?? 365,
        assessment_frequency_months: engineData.assessment_frequency_months ?? 12,
        supervisor_review_required: engineData.supervisor_review_required ?? true,
        billing_authorization_required: engineData.billing_authorization_required ?? true,
        state: engineData.state ?? state,
        program: engineData.program ?? program ?? "DDA",
        version: engineData.version ?? "1.0",
        source: "guidelines_engine",
      };

      return rulePack;
    }
  } catch {
    // Fall through to default
  }

  // Fallback: Indiana DDA defaults
  return getDefaultRulePack(individual.state, individual.program ?? individual.waiver_type);
}

async function finalizeRun(
  runRef: admin.firestore.DocumentReference,
  status: "completed" | "failed",
  errors: string[],
  individualsProcessed: number,
  tasksCreated: number,
  draftsGenerated: number,
  escalationsTriggered: number,
  complianceScoresUpdated: number,
  summary?: string
): Promise<void> {
  try {
    await runRef.update({
      status,
      completed_at: admin.firestore.FieldValue.serverTimestamp(),
      individuals_processed: individualsProcessed,
      tasks_created: tasksCreated,
      drafts_generated: draftsGenerated,
      escalations_triggered: escalationsTriggered,
      compliance_scores_updated: complianceScoresUpdated,
      errors: errors.slice(0, 20), // Cap errors to avoid huge documents
      ...(summary ? { summary } : {}),
    });
  } catch (err) {
    console.error("[BrainOrchestrator] Failed to finalize run:", err);
  }
}

function buildRunResult(
  runId: string,
  orgId: string,
  runType: "scheduled" | "manual",
  triggeredBy: string,
  status: "completed" | "failed",
  individualsProcessed: number,
  tasksCreated: number,
  draftsGenerated: number,
  escalationsTriggered: number,
  complianceScoresUpdated: number,
  errors: string[],
  summary?: string
) {
  return {
    run_id: runId,
    org_id: orgId,
    run_type: runType,
    triggered_by: triggeredBy,
    status,
    individuals_processed: individualsProcessed,
    tasks_created: tasksCreated,
    drafts_generated: draftsGenerated,
    escalations_triggered: escalationsTriggered,
    compliance_scores_updated: complianceScoresUpdated,
    errors,
    ...(summary ? { summary } : {}),
  };
}

function toIndividualRecord(id: string, data: admin.firestore.DocumentData): IndividualRecord {
  return {
    id,
    first_name: data.first_name ?? "",
    last_name: data.last_name ?? "",
    organizationId: data.organizationId ?? "",
    enrollment_status: data.enrollment_status ?? "active",
    program: data.program,
    program_type: data.program_type,
    waiver_type: data.waiver_type,
    state: data.state ?? data.address_state ?? "Indiana",
    assigned_case_manager_uid: data.assigned_case_manager_uid ?? data.assigned_case_manager,
    assigned_case_manager_name:
      data.assigned_case_manager_name ?? data.assigned_case_manager_display_name,
    assigned_supervisor_uid: data.assigned_supervisor_uid ?? data.assigned_supervisor,
    assigned_supervisor_name: data.assigned_supervisor_name ?? data.assigned_supervisor_display_name,
    last_visit_date: data.last_visit_date,
    last_monitoring_form_date: data.last_monitoring_form_date,
    last_assessment_date: data.last_assessment_date,
    last_pcp_approval_date: data.last_pcp_approval_date,
    pcp_due_date: data.pcp_due_date ?? data.isp_due_date,
    isp_due_date: data.isp_due_date ?? data.pcp_due_date,
    ma_redetermination_date: data.ma_redetermination_date,
    compliance_score: data.compliance_score,
    compliance_tier: data.compliance_tier,
    risk_score: data.risk_score,
    county: data.county,
  };
}

async function loadAgentPrompts(
  orgId: string,
  db: admin.firestore.Firestore
): Promise<typeof DEFAULT_AGENT_PROMPTS> {
  try {
    const snap = await db
      .doc(`organizations/${orgId}/settings/orchestrator_prompts`)
      .get();
    if (snap.exists) {
      const data = snap.data() as Partial<AgentPrompts>;
      return {
        compliance: data.compliance || DEFAULT_AGENT_PROMPTS.compliance,
        documentation: data.documentation || DEFAULT_AGENT_PROMPTS.documentation,
        billing: data.billing || DEFAULT_AGENT_PROMPTS.billing,
        escalation: data.escalation || DEFAULT_AGENT_PROMPTS.escalation,
        renewal: data.renewal || DEFAULT_AGENT_PROMPTS.renewal,
      };
    }
  } catch {
    // Non-fatal — use defaults
  }
  return { ...DEFAULT_AGENT_PROMPTS };
}

function taskTypeToLabel(taskType: OrchestratorTask["task_type"]): string {
  const labels: Record<OrchestratorTask["task_type"], string> = {
    visit_required: "Visit Scheduled",
    monitoring_form_due: "Monitoring Form",
    pcp_renewal: "Plan Renewal",
    medicaid_redetermination: "Eligibility Verification",
    assessment_due: "Assessment Due",
    authorization_expiring: "Authorization Renewal",
    billing_action: "Progress Note Due",
    escalation: "Escalation",
    contact_required: "Contact Required",
  };
  return labels[taskType] ?? "General";
}
