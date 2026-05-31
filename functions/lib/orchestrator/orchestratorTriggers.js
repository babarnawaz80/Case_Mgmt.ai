"use strict";
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
exports.onContactNoteSubmitted = exports.onIncidentReported = exports.onIndividualEnrolled = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const types_1 = require("./types");
const complianceAgent_1 = require("./agents/complianceAgent");
const billingAgent_1 = require("./agents/billingAgent");
const escalationAgent_1 = require("./agents/escalationAgent");
const renewalAgent_1 = require("./agents/renewalAgent");
const defaultRulePacks_1 = require("./defaultRulePacks");
// ─── Pause guard ──────────────────────────────────────────────────────────────
async function isOrchestratorPaused(db) {
    var _a;
    try {
        const snap = await db.collection("config").doc("orchestrator").get();
        return snap.exists && ((_a = snap.data()) === null || _a === void 0 ? void 0 : _a.paused) === true;
    }
    catch (_b) {
        return false;
    }
}
// ─── Shared helpers ───────────────────────────────────────────────────────────
function toIndividualRecord(id, data) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    return {
        id,
        first_name: (_a = data.first_name) !== null && _a !== void 0 ? _a : "",
        last_name: (_b = data.last_name) !== null && _b !== void 0 ? _b : "",
        organizationId: (_c = data.organizationId) !== null && _c !== void 0 ? _c : "",
        enrollment_status: (_d = data.enrollment_status) !== null && _d !== void 0 ? _d : "active",
        program: data.program,
        program_type: data.program_type,
        waiver_type: data.waiver_type,
        state: (_f = (_e = data.state) !== null && _e !== void 0 ? _e : data.address_state) !== null && _f !== void 0 ? _f : "Indiana",
        assigned_case_manager_uid: (_g = data.assigned_case_manager_uid) !== null && _g !== void 0 ? _g : data.assigned_case_manager,
        assigned_case_manager_name: (_h = data.assigned_case_manager_name) !== null && _h !== void 0 ? _h : data.assigned_case_manager_display_name,
        assigned_supervisor_uid: (_j = data.assigned_supervisor_uid) !== null && _j !== void 0 ? _j : data.assigned_supervisor,
        assigned_supervisor_name: (_k = data.assigned_supervisor_name) !== null && _k !== void 0 ? _k : data.assigned_supervisor_display_name,
        last_visit_date: data.last_visit_date,
        last_monitoring_form_date: data.last_monitoring_form_date,
        last_assessment_date: data.last_assessment_date,
        last_pcp_approval_date: data.last_pcp_approval_date,
        pcp_due_date: (_l = data.pcp_due_date) !== null && _l !== void 0 ? _l : data.isp_due_date,
        isp_due_date: (_m = data.isp_due_date) !== null && _m !== void 0 ? _m : data.pcp_due_date,
        ma_redetermination_date: data.ma_redetermination_date,
        compliance_score: data.compliance_score,
        compliance_tier: data.compliance_tier,
        risk_score: data.risk_score,
        county: data.county,
    };
}
async function loadSettings(orgId, db) {
    try {
        const snap = await db
            .collection("organizations")
            .doc(orgId)
            .collection("settings")
            .doc("orchestrator")
            .get();
        if (snap.exists) {
            return Object.assign(Object.assign({}, types_1.DEFAULT_ORCHESTRATOR_SETTINGS), snap.data());
        }
    }
    catch (_a) {
        // Use defaults
    }
    return types_1.DEFAULT_ORCHESTRATOR_SETTINGS;
}
async function writeRunLog(db, triggerType, orgId, individualId, agentsRun, tasksCreated, errors) {
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
    }
    catch (_a) {
        // Non-fatal
    }
}
async function writeTriggerFailure(db, triggerType, docId, error) {
    try {
        await db.collection("orchestrator_trigger_failures").add({
            trigger_type: triggerType,
            document_id: docId,
            error,
            failed_at: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (_a) {
        // Non-fatal
    }
}
async function writeTasks(db, tasks, runId) {
    let count = 0;
    for (const task of tasks) {
        try {
            // Validate traceability
            if (!task.rule_id || task.rule_id.trim() === "")
                continue;
            if (!task.task_reason || task.task_reason.trim().length < 20)
                continue;
            if (!task.evidence_checked || task.evidence_checked.trim() === "")
                continue;
            await db.collection("orchestrator_tasks").add(Object.assign(Object.assign({}, task), { run_id: runId, created_at: admin.firestore.FieldValue.serverTimestamp(), updated_at: admin.firestore.FieldValue.serverTimestamp() }));
            if (task.assigned_to_user_id) {
                const dueDate = task.due_date
                    .toDate()
                    .toISOString()
                    .split("T")[0];
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
        }
        catch (_a) {
            // Non-fatal — skip task
        }
    }
    return count;
}
// ─── TRIGGER 1: onIndividualEnrolled ─────────────────────────────────────────
// Fires when a new individual document is created.
// Runs all 5 pre-filtered agents scoped to this individual.
exports.onIndividualEnrolled = (0, firestore_1.onDocumentCreated)({
    document: "individuals/{individualId}",
    memory: "512MiB",
    timeoutSeconds: 300,
}, async (event) => {
    var _a, _b, _c, _d;
    const db = admin.firestore();
    const individualId = event.params.individualId;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    try {
        // Check paused
        if (await isOrchestratorPaused(db)) {
            console.log(`[OrchestratorTrigger] Paused — skipping onIndividualEnrolled for ${individualId}`);
            return;
        }
        // Only process active individuals
        const status = (_c = (_b = data.enrollment_status) !== null && _b !== void 0 ? _b : data.status) !== null && _c !== void 0 ? _c : "active";
        if (status !== "active") {
            console.log(`[OrchestratorTrigger] Skipping non-active individual ${individualId} (status: ${status})`);
            return;
        }
        const individual = toIndividualRecord(individualId, data);
        const orgId = individual.organizationId;
        if (!orgId)
            return;
        const runId = `trigger_enrolled_${individualId}_${Date.now()}`;
        const settings = await loadSettings(orgId, db);
        const rulePack = (0, defaultRulePacks_1.getDefaultRulePack)(individual.state, (_d = individual.program) !== null && _d !== void 0 ? _d : individual.waiver_type);
        const errors = [];
        const agentsRun = [];
        let tasksCreated = 0;
        // Import pre-filters inline to avoid circular deps
        const { preFilterCompliance, preFilterDocumentation, preFilterBilling, preFilterEscalation, preFilterRenewal } = await Promise.resolve().then(() => __importStar(require("./preFilters")));
        // Agent 1: Compliance
        if (settings.agents_enabled.compliance) {
            const pf = await preFilterCompliance(individual, db);
            if (pf.passes) {
                try {
                    const result = await (0, complianceAgent_1.runComplianceAgent)(individual, rulePack, runId, orgId, db);
                    tasksCreated += await writeTasks(db, result.tasks, runId);
                    agentsRun.push("compliance");
                }
                catch (err) {
                    errors.push(`Compliance agent: ${err.message}`);
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
                    const result = await (0, billingAgent_1.runBillingAgent)(individual, runId, orgId, db);
                    tasksCreated += await writeTasks(db, result.tasks, runId);
                    agentsRun.push("billing");
                }
                catch (err) {
                    errors.push(`Billing agent: ${err.message}`);
                }
            }
        }
        // Agent 4: Escalation
        if (settings.agents_enabled.escalation) {
            const pf = await preFilterEscalation(individual, db);
            if (pf.passes) {
                try {
                    const result = await (0, escalationAgent_1.runEscalationAgent)(individual, runId, orgId, settings, db);
                    tasksCreated += await writeTasks(db, result.tasks, runId);
                    agentsRun.push("escalation");
                }
                catch (err) {
                    errors.push(`Escalation agent: ${err.message}`);
                }
            }
        }
        // Agent 5: Renewal
        if (settings.agents_enabled.renewal) {
            const pf = await preFilterRenewal(individual, db);
            if (pf.passes) {
                try {
                    const result = await (0, renewalAgent_1.runRenewalAgent)(individual, rulePack, runId, orgId, db);
                    tasksCreated += await writeTasks(db, result.tasks, runId);
                    agentsRun.push("renewal");
                }
                catch (err) {
                    errors.push(`Renewal agent: ${err.message}`);
                }
            }
        }
        await writeRunLog(db, "EVENT_INDIVIDUAL_ENROLLED", orgId, individualId, agentsRun, tasksCreated, errors);
        console.log(`[OrchestratorTrigger] onIndividualEnrolled complete for ${individualId}: ${agentsRun.join(", ")} — ${tasksCreated} tasks created`);
    }
    catch (err) {
        console.error(`[OrchestratorTrigger] onIndividualEnrolled fatal error for ${individualId}:`, err);
        await writeTriggerFailure(db, "EVENT_INDIVIDUAL_ENROLLED", individualId, err.message);
    }
});
// ─── TRIGGER 2: onIncidentReported ────────────────────────────────────────────
// Fires when a new incident document is created.
// Bypasses escalation pre-filter — the incident itself is the signal.
exports.onIncidentReported = (0, firestore_1.onDocumentCreated)({
    document: "incidents/{incidentId}",
    memory: "512MiB",
    timeoutSeconds: 180,
}, async (event) => {
    var _a, _b, _c, _d, _e;
    const db = admin.firestore();
    const incidentId = event.params.incidentId;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    try {
        // Check paused
        if (await isOrchestratorPaused(db)) {
            console.log(`[OrchestratorTrigger] Paused — skipping onIncidentReported for incident ${incidentId}`);
            return;
        }
        const individualId = (_b = data.individualId) !== null && _b !== void 0 ? _b : data.individual_id;
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
        const individual = toIndividualRecord(individualId, indSnap.data());
        const orgId = individual.organizationId;
        if (!orgId)
            return;
        const settings = await loadSettings(orgId, db);
        const runId = `trigger_incident_${incidentId}_${Date.now()}`;
        const errors = [];
        // Run ONLY escalation agent — bypass pre-filter (incident IS the signal)
        let tasksCreated = 0;
        try {
            const result = await (0, escalationAgent_1.runEscalationAgent)(individual, runId, orgId, settings, db);
            tasksCreated = await writeTasks(db, result.tasks, runId);
            // If any CRITICAL task was created, queue an immediate notification
            const criticalTasks = result.tasks.filter((t) => t.severity === "critical");
            for (const task of criticalTasks) {
                const supervisorUid = (_c = individual.assigned_supervisor_uid) !== null && _c !== void 0 ? _c : "";
                if (!supervisorUid)
                    continue;
                try {
                    await db.collection("notification_queue").add({
                        run_id: runId,
                        recipient_id: supervisorUid,
                        individual_id: individual.id,
                        individual_name: `${individual.first_name} ${individual.last_name}`,
                        recipient_name: (_d = individual.assigned_supervisor_name) !== null && _d !== void 0 ? _d : "Supervisor",
                        urgency: "CRITICAL",
                        message: `CRITICAL INCIDENT ALERT: ${task.title} — ${task.description}. Incident ID: ${incidentId}.`,
                        agent: "escalation",
                        rule_id: (_e = task.rule_id) !== null && _e !== void 0 ? _e : "ESCALATION_INCIDENT_REPORTED",
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
                }
                catch (_f) {
                    // Non-fatal
                }
            }
        }
        catch (err) {
            errors.push(`Escalation agent: ${err.message}`);
        }
        await writeRunLog(db, "EVENT_INCIDENT_REPORTED", orgId, individualId, ["escalation"], tasksCreated, errors);
        console.log(`[OrchestratorTrigger] onIncidentReported complete for incident ${incidentId}: ${tasksCreated} tasks created`);
    }
    catch (err) {
        console.error(`[OrchestratorTrigger] onIncidentReported fatal error for incident ${incidentId}:`, err);
        await writeTriggerFailure(db, "EVENT_INCIDENT_REPORTED", incidentId, err.message);
    }
});
// ─── TRIGGER 3: onContactNoteSubmitted ────────────────────────────────────────
// Fires when a contact note document is created or updated.
// Runs compliance agent if note is submitted or approved.
exports.onContactNoteSubmitted = (0, firestore_1.onDocumentWritten)({
    document: "contact_notes/{noteId}",
    memory: "512MiB",
    timeoutSeconds: 180,
}, async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const db = admin.firestore();
    const noteId = event.params.noteId;
    try {
        // Check paused
        if (await isOrchestratorPaused(db)) {
            console.log(`[OrchestratorTrigger] Paused — skipping onContactNoteSubmitted for note ${noteId}`);
            return;
        }
        const afterData = (_b = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after) === null || _b === void 0 ? void 0 : _b.data();
        if (!afterData)
            return;
        // Only act on submitted or approved notes
        const noteStatus = (_c = afterData.status) !== null && _c !== void 0 ? _c : "";
        if (noteStatus !== "submitted" && noteStatus !== "approved")
            return;
        // Only act when status just changed (not just any field)
        const beforeData = (_e = (_d = event.data) === null || _d === void 0 ? void 0 : _d.before) === null || _e === void 0 ? void 0 : _e.data();
        const prevStatus = (_f = beforeData === null || beforeData === void 0 ? void 0 : beforeData.status) !== null && _f !== void 0 ? _f : "";
        if (prevStatus === noteStatus)
            return; // status didn't change
        const individualId = (_g = afterData.individualId) !== null && _g !== void 0 ? _g : afterData.individual_id;
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
        const individual = toIndividualRecord(individualId, indSnap.data());
        const orgId = individual.organizationId;
        if (!orgId)
            return;
        const settings = await loadSettings(orgId, db);
        const runId = `trigger_contact_note_${noteId}_${Date.now()}`;
        const errors = [];
        // Run ONLY compliance agent
        let tasksCreated = 0;
        try {
            const rulePack = (0, defaultRulePacks_1.getDefaultRulePack)(individual.state, (_h = individual.program) !== null && _h !== void 0 ? _h : individual.waiver_type);
            const result = await (0, complianceAgent_1.runComplianceAgent)(individual, rulePack, runId, orgId, db);
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
                }
                catch (_j) {
                    // Non-fatal
                }
            }
        }
        catch (err) {
            errors.push(`Compliance agent: ${err.message}`);
            if (!settings.agents_enabled.compliance) {
                errors.push("Compliance agent disabled in settings");
            }
        }
        await writeRunLog(db, "EVENT_CONTACT_NOTE_SUBMITTED", orgId, individualId, ["compliance"], tasksCreated, errors);
        console.log(`[OrchestratorTrigger] onContactNoteSubmitted complete for note ${noteId}: ${tasksCreated} tasks created`);
    }
    catch (err) {
        console.error(`[OrchestratorTrigger] onContactNoteSubmitted fatal error for note ${noteId}:`, err);
        await writeTriggerFailure(db, "EVENT_CONTACT_NOTE_SUBMITTED", noteId, err.message);
    }
});
//# sourceMappingURL=orchestratorTriggers.js.map