// Orchestrator Event-Driven Triggers — Brain Orchestrator
// CaseManagement.AI
//
// Three Firestore triggers that run scoped orchestrator logic
// without waiting for the nightly scheduled run.
//
// /config/orchestrator Firestore structure:
// { paused: false, created_at: Timestamp }
//
// To pause ALL triggers: set /config/orchestrator.paused = true

import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

import { IndividualRecord, OrchestratorSettings, DEFAULT_ORCHESTRATOR_SETTINGS } from "./types";
import { runComplianceAgent } from "./agents/complianceAgent";
import { runBillingAgent } from "./agents/billingAgent";
import { runEscalationAgent } from "./agents/escalationAgent";
import { runRenewalAgent } from "./agents/renewalAgent";
import { getDefaultRulePack } from "./defaultRulePacks";

// ─── Pause guard ──────────────────────────────────────────────────────────────
async function isOrchestratorPaused(db: admin.firestore.Firestore): Promise<boolean> {
  try {
    const snap = await db.collection("config").doc("orchestrator").get();
    return snap.exists && snap.data()?.paused === true;
  } catch {
    return false;
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
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
    assigned_case_manager_name: data.assigned_case_manager_name ?? data.assigned_case_manager_display_name,
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

async function loadSettings(orgId: string, db: admin.firestore.Firestore): Promise<OrchestratorSettings> {
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
    // Use defaults
  }
  return DEFAULT_ORCHESTRATOR_SETTINGS;
}

async function writeRunLog(
  db: admin.firestore.Firestore,
  triggerType: string,
  orgId: string,
  individualId: string,
  agentsRun: string[],
  tasksCreated: number,
  errors: string[]
): Promise<void> {
  try {
    await db.collection("orchestrator_trigger_runs").add({
      trigger_type: triggerType,
      org_id: orgId,
      individual_id: individualId,
      agents_run: agentsRun,
      tasks_created: tasksCreated,
      errors: errors.slice(0, 10),
      status: errors.length === 0 ? "completed" : "completed_with_errors",
      triggered_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch {
    // Non-fatal
  }
}

async function writeTriggerFailure(
  db: admin.firestore.Firestore,
  triggerType: string,
  docId: string,
  error: string
): Promise<void> {
  try {
    await db.collection("orchestrator_trigger_failures").add({
      trigger_type: triggerType,
      document_id: docId,
      error,
      failed_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch {
    // Non-fatal
  }
}

import { AgentResult } from "./types";

async function writeTasks(
  db: admin.firestore.Firestore,
  tasks: AgentResult["tasks"],
  runId: string
): Promise<number> {
  let count = 0;
  for (const task of tasks) {
    try {
      // Validate traceability
      if (!task.rule_id || task.rule_id.trim() === "") continue;
      if (!task.task_reason || task.task_reason.trim().length < 20) continue;
      if (!task.evidence_checked || task.evidence_checked.trim() === "") continue;

      await db.collection("orchestrator_tasks").add({
        ...task,
        run_id: runId,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (task.assigned_to_user_id) {
        const dueDate = (task.due_date as admin.firestore.Timestamp)
          .toDate()
          .toISOString()
          .split("T")[0]!;

        await db.collection("tasks").add({
          title: task.title,
          description: task.description,
          individualId: task.individual_id,
          individualName: task.individual_name,
          dueDate,
          status: "open",
          priority: task.severity === "critical" || task.severity === "high" ? "high" : "medium",
          type: task.task_type,
          assignedTo: task.assigned_to_user_id,
          organizationId: task.org_id,
          source: "brain_orchestrator",
          has_ai_draft: task.has_ai_draft,
          rule_reference: task.rule_reference,
          rule_id: task.rule_id,
          task_reason: task.task_reason,
          evidence_checked: task.evidence_checked,
          run_id: runId,
          trigger_type: "event_driven",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        count++;
      }
    } catch {
      // Non-fatal — skip task
    }
  }
  return count;
}

// ─── TRIGGER 1: onIndividualEnrolled ─────────────────────────────────────────
// Fires when a new individual document is created.
// Runs all 5 pre-filtered agents scoped to this individual.

export const onIndividualEnrolled = onDocumentCreated(
  {
    document: "individuals/{individualId}",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async (event) => {
    const db = admin.firestore();
    const individualId = event.params.individualId;
    const data = event.data?.data();
    if (!data) return;

    try {
      // Check paused
      if (await isOrchestratorPaused(db)) {
        console.log(`[OrchestratorTrigger] Paused — skipping onIndividualEnrolled for ${individualId}`);
        return;
      }

      // Only process active individuals
      const status = data.enrollment_status ?? data.status ?? "active";
      if (status !== "active") {
        console.log(`[OrchestratorTrigger] Skipping non-active individual ${individualId} (status: ${status})`);
        return;
      }

      const individual = toIndividualRecord(individualId, data);
      const orgId = individual.organizationId;
      if (!orgId) return;

      const runId = `trigger_enrolled_${individualId}_${Date.now()}`;
      const settings = await loadSettings(orgId, db);
      const rulePack = getDefaultRulePack(individual.state, individual.program ?? individual.waiver_type);
      const errors: string[] = [];
      const agentsRun: string[] = [];
      let tasksCreated = 0;

      // Import pre-filters inline to avoid circular deps
      const { preFilterCompliance, preFilterDocumentation, preFilterBilling, preFilterEscalation, preFilterRenewal } =
        await import("./preFilters");

      // Agent 1: Compliance
      if (settings.agents_enabled.compliance) {
        const pf = await preFilterCompliance(individual, db);
        if (pf.passes) {
          try {
            const result = await runComplianceAgent(individual, rulePack, runId, orgId, db);
            tasksCreated += await writeTasks(db, result.tasks, runId);
            agentsRun.push("compliance");
          } catch (err) {
            errors.push(`Compliance agent: ${(err as Error).message}`);
          }
        }
      }

      // Agent 2: Documentation (needs compliance findings — simplified here)
      if (settings.agents_enabled.documentation) {
        const pf = await preFilterDocumentation(individual, db);
        if (pf.passes) {
          agentsRun.push("documentation_checked");
          // Documentation agent requires compliance findings — skip for new enrollments
        }
      }

      // Agent 3: Billing
      if (settings.agents_enabled.billing) {
        const pf = await preFilterBilling(individual, db);
        if (pf.passes) {
          try {
            const result = await runBillingAgent(individual, runId, orgId, db);
            tasksCreated += await writeTasks(db, result.tasks, runId);
            agentsRun.push("billing");
          } catch (err) {
            errors.push(`Billing agent: ${(err as Error).message}`);
          }
        }
      }

      // Agent 4: Escalation
      if (settings.agents_enabled.escalation) {
        const pf = await preFilterEscalation(individual, db);
        if (pf.passes) {
          try {
            const result = await runEscalationAgent(individual, runId, orgId, settings, db);
            tasksCreated += await writeTasks(db, result.tasks, runId);
            agentsRun.push("escalation");
          } catch (err) {
            errors.push(`Escalation agent: ${(err as Error).message}`);
          }
        }
      }

      // Agent 5: Renewal
      if (settings.agents_enabled.renewal) {
        const pf = await preFilterRenewal(individual, db);
        if (pf.passes) {
          try {
            const result = await runRenewalAgent(individual, rulePack, runId, orgId, db);
            tasksCreated += await writeTasks(db, result.tasks, runId);
            agentsRun.push("renewal");
          } catch (err) {
            errors.push(`Renewal agent: ${(err as Error).message}`);
          }
        }
      }

      await writeRunLog(db, "EVENT_INDIVIDUAL_ENROLLED", orgId, individualId, agentsRun, tasksCreated, errors);
      console.log(`[OrchestratorTrigger] onIndividualEnrolled complete for ${individualId}: ${agentsRun.join(", ")} — ${tasksCreated} tasks created`);
    } catch (err) {
      console.error(`[OrchestratorTrigger] onIndividualEnrolled fatal error for ${individualId}:`, err);
      await writeTriggerFailure(db, "EVENT_INDIVIDUAL_ENROLLED", individualId, (err as Error).message);
    }
  }
);

// ─── TRIGGER 2: onIncidentReported ────────────────────────────────────────────
// Fires when a new incident document is created.
// Bypasses escalation pre-filter — the incident itself is the signal.

export const onIncidentReported = onDocumentCreated(
  {
    document: "incidents/{incidentId}",
    memory: "512MiB",
    timeoutSeconds: 180,
  },
  async (event) => {
    const db = admin.firestore();
    const incidentId = event.params.incidentId;
    const data = event.data?.data();
    if (!data) return;

    try {
      // Check paused
      if (await isOrchestratorPaused(db)) {
        console.log(`[OrchestratorTrigger] Paused — skipping onIncidentReported for incident ${incidentId}`);
        return;
      }

      const individualId: string | undefined = data.individualId ?? data.individual_id;
      if (!individualId) {
        console.warn(`[OrchestratorTrigger] onIncidentReported: no individualId on incident ${incidentId}`);
        return;
      }

      // Load the individual
      const indSnap = await db.collection("individuals").doc(individualId).get();
      if (!indSnap.exists) {
        console.warn(`[OrchestratorTrigger] onIncidentReported: individual ${individualId} not found`);
        return;
      }

      const individual = toIndividualRecord(individualId, indSnap.data()!);
      const orgId = individual.organizationId;
      if (!orgId) return;

      const settings = await loadSettings(orgId, db);
      const runId = `trigger_incident_${incidentId}_${Date.now()}`;
      const errors: string[] = [];

      // Run ONLY escalation agent — bypass pre-filter (incident IS the signal)
      let tasksCreated = 0;
      try {
        const result = await runEscalationAgent(individual, runId, orgId, settings, db);
        tasksCreated = await writeTasks(db, result.tasks, runId);

        // If any CRITICAL task was created, queue an immediate notification
        const criticalTasks = result.tasks.filter((t) => t.severity === "critical");
        for (const task of criticalTasks) {
          const supervisorUid = individual.assigned_supervisor_uid ?? "";
          if (!supervisorUid) continue;
          try {
            await db.collection("notification_queue").add({
              run_id: runId,
              recipient_id: supervisorUid,
              individual_id: individual.id,
              individual_name: `${individual.first_name} ${individual.last_name}`,
              recipient_name: individual.assigned_supervisor_name ?? "Supervisor",
              urgency: "CRITICAL",
              message: `CRITICAL INCIDENT ALERT: ${task.title} — ${task.description}. Incident ID: ${incidentId}.`,
              agent: "escalation",
              rule_id: task.rule_id ?? "ESCALATION_INCIDENT_REPORTED",
              queued_at: admin.firestore.FieldValue.serverTimestamp(),
              status: "queued",
              org_id: orgId,
            });

            // Deliver CRITICAL immediately — don't wait for dedup
            await db.collection("notifications").add({
              uid: supervisorUid,
              organizationId: orgId,
              type: "alert",
              title: `[CRITICAL] Incident reported: ${individual.first_name} ${individual.last_name}`,
              body: task.description,
              href: `/people/${individual.id}/echart`,
              read: false,
              dismissed: false,
              severity: "critical",
              source: "brain_orchestrator",
              incident_id: incidentId,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } catch {
            // Non-fatal
          }
        }
      } catch (err) {
        errors.push(`Escalation agent: ${(err as Error).message}`);
      }

      await writeRunLog(db, "EVENT_INCIDENT_REPORTED", orgId, individualId, ["escalation"], tasksCreated, errors);
      console.log(`[OrchestratorTrigger] onIncidentReported complete for incident ${incidentId}: ${tasksCreated} tasks created`);
    } catch (err) {
      console.error(`[OrchestratorTrigger] onIncidentReported fatal error for incident ${incidentId}:`, err);
      await writeTriggerFailure(db, "EVENT_INCIDENT_REPORTED", incidentId, (err as Error).message);
    }
  }
);

// ─── TRIGGER 3: onContactNoteSubmitted ────────────────────────────────────────
// Fires when a contact note document is created or updated.
// Runs compliance agent if note is submitted or approved.

export const onContactNoteSubmitted = onDocumentWritten(
  {
    document: "contact_notes/{noteId}",
    memory: "512MiB",
    timeoutSeconds: 180,
  },
  async (event) => {
    const db = admin.firestore();
    const noteId = event.params.noteId;

    try {
      // Check paused
      if (await isOrchestratorPaused(db)) {
        console.log(`[OrchestratorTrigger] Paused — skipping onContactNoteSubmitted for note ${noteId}`);
        return;
      }

      const afterData = event.data?.after?.data();
      if (!afterData) return;

      // Only act on submitted or approved notes
      const noteStatus: string = afterData.status ?? "";
      if (noteStatus !== "submitted" && noteStatus !== "approved") return;

      // Only act when status just changed (not just any field)
      const beforeData = event.data?.before?.data();
      const prevStatus: string = beforeData?.status ?? "";
      if (prevStatus === noteStatus) return; // status didn't change

      const individualId: string | undefined = afterData.individualId ?? afterData.individual_id;
      if (!individualId) {
        console.warn(`[OrchestratorTrigger] onContactNoteSubmitted: no individualId on note ${noteId}`);
        return;
      }

      // Load the individual
      const indSnap = await db.collection("individuals").doc(individualId).get();
      if (!indSnap.exists) {
        console.warn(`[OrchestratorTrigger] onContactNoteSubmitted: individual ${individualId} not found`);
        return;
      }

      const individual = toIndividualRecord(individualId, indSnap.data()!);
      const orgId = individual.organizationId;
      if (!orgId) return;

      const settings = await loadSettings(orgId, db);
      const runId = `trigger_contact_note_${noteId}_${Date.now()}`;
      const errors: string[] = [];

      // Run ONLY compliance agent
      let tasksCreated = 0;
      try {
        const rulePack = getDefaultRulePack(individual.state, individual.program ?? individual.waiver_type);
        const result = await runComplianceAgent(individual, rulePack, runId, orgId, db);
        tasksCreated = await writeTasks(db, result.tasks, runId);

        // If compliance agent created tasks, mark any related open compliance tasks as fulfilled
        if (result.tasks.length > 0) {
          try {
            const openContactTasks = await db
              .collection("tasks")
              .where("individualId", "==", individualId)
              .where("status", "==", "open")
              .where("type", "==", "contact_required")
              .where("source", "==", "brain_orchestrator")
              .get();

            const batch = db.batch();
            for (const taskDoc of openContactTasks.docs) {
              batch.update(taskDoc.ref, {
                status: "completed",
                completed_at: admin.firestore.FieldValue.serverTimestamp(),
                completed_reason: `Contact note ${noteId} submitted with status "${noteStatus}"`,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
            if (!openContactTasks.empty) {
              await batch.commit();
              console.log(`[OrchestratorTrigger] Marked ${openContactTasks.size} contact_required task(s) as fulfilled for individual ${individualId}`);
            }
          } catch {
            // Non-fatal
          }
        }
      } catch (err) {
        errors.push(`Compliance agent: ${(err as Error).message}`);
        if (!settings.agents_enabled.compliance) {
          errors.push("Compliance agent disabled in settings");
        }
      }

      await writeRunLog(db, "EVENT_CONTACT_NOTE_SUBMITTED", orgId, individualId, ["compliance"], tasksCreated, errors);
      console.log(`[OrchestratorTrigger] onContactNoteSubmitted complete for note ${noteId}: ${tasksCreated} tasks created`);
    } catch (err) {
      console.error(`[OrchestratorTrigger] onContactNoteSubmitted fatal error for note ${noteId}:`, err);
      await writeTriggerFailure(db, "EVENT_CONTACT_NOTE_SUBMITTED", noteId, (err as Error).message);
    }
  }
);
