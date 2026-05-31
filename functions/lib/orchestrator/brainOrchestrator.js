"use strict";
// Brain Orchestrator — Main Engine
// CaseManagement.AI
//
// Runs nightly at 2am ET (scheduled) and on-demand (callable).
// Processes all active individuals, runs 5 specialist agents, creates tasks,
// updates compliance scores, and writes a full audit trail.
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
exports.manualOrchestratorRun = exports.scheduledOrchestrator = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const types_1 = require("./types");
const defaultRulePacks_1 = require("./defaultRulePacks");
const complianceAgent_1 = require("./agents/complianceAgent");
const documentationAgent_1 = require("./agents/documentationAgent");
const billingAgent_1 = require("./agents/billingAgent");
const escalationAgent_1 = require("./agents/escalationAgent");
const renewalAgent_1 = require("./agents/renewalAgent");
const authorizationAgent_1 = require("./agents/authorizationAgent");
const assessmentAgent_1 = require("./agents/assessmentAgent");
const getGuidelinesEngine_1 = require("./utilities/getGuidelinesEngine");
const preFilters_1 = require("./preFilters");
const notificationDedup_1 = require("./notificationDedup");
const ORCHESTRATOR_TASKS = "orchestrator_tasks";
const ORCHESTRATOR_RUNS = "orchestrator_runs";
const ORCHESTRATOR_LOGS = "orchestrator_logs";
const TASKS = "tasks";
// ─── Scheduled: runs every night at 2am ET ────────────────────────────────────
exports.scheduledOrchestrator = (0, scheduler_1.onSchedule)({
    schedule: "0 2 * * *",
    timeZone: "America/New_York",
    memory: "1GiB",
    timeoutSeconds: 540,
}, async (_event) => {
    const db = admin.firestore();
    // Find all organizations (run for all orgs in the system)
    let orgSnap;
    try {
        orgSnap = await db.collection("organizations").get();
    }
    catch (err) {
        console.error("[BrainOrchestrator] Failed to load organizations:", err);
        return;
    }
    console.log(`[BrainOrchestrator] Running scheduled job for ${orgSnap.size} organizations`);
    for (const orgDoc of orgSnap.docs) {
        try {
            await runOrchestrator(orgDoc.id, "scheduled", "system", db);
        }
        catch (err) {
            console.error(`[BrainOrchestrator] Failed for org ${orgDoc.id}:`, err);
        }
    }
});
// ─── Callable: manual trigger by admin ────────────────────────────────────────
exports.manualOrchestratorRun = (0, https_1.onCall)({ cors: true, memory: "1GiB", timeoutSeconds: 540 }, async (request) => {
    var _a, _b;
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
    const userProfile = userSnap.data();
    const orgId = (_b = (_a = request.data) === null || _a === void 0 ? void 0 : _a.orgId) !== null && _b !== void 0 ? _b : userProfile.organizationId;
    const role = userProfile.role;
    if (role !== "admin" && role !== "supervisor") {
        throw new Error("Admin or supervisor role required to trigger orchestrator");
    }
    if (!orgId) {
        throw new Error("Organization ID required");
    }
    console.log(`[BrainOrchestrator] Manual run triggered by ${uid} (${role}) for org ${orgId}`);
    const result = await runOrchestrator(orgId, "manual", uid, db);
    return result;
});
// ─── Core Orchestrator Logic ──────────────────────────────────────────────────
async function runOrchestrator(orgId, runType, triggeredBy, db) {
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
    });
    const runId = runRef.id;
    const errors = [];
    let individualsProcessed = 0;
    let tasksCreated = 0;
    let draftsGenerated = 0;
    let escalationsTriggered = 0;
    let complianceScoresUpdated = 0;
    let tasksWithTraceability = 0;
    let tasksBlockedMissingTraceability = 0;
    const preFilterResults = {
        compliance: { scanned: 0, passed: 0, skipped: 0 },
        documentation: { scanned: 0, passed: 0, skipped: 0 },
        billing: { scanned: 0, passed: 0, skipped: 0 },
        escalation: { scanned: 0, passed: 0, skipped: 0 },
        renewal: { scanned: 0, passed: 0, skipped: 0 },
    };
    let notificationSummary = null;
    try {
        // Clear engine cache for this run (cache persists per warm instance, clear for fresh run)
        (0, getGuidelinesEngine_1.clearEngineCache)();
        // Load orchestrator settings and custom agent prompts
        const settings = await loadOrchestratorSettings(orgId, db);
        const customPrompts = await loadAgentPrompts(orgId, db);
        // Load all active individuals for this org
        let individualsSnap;
        try {
            individualsSnap = await db
                .collection("individuals")
                .where("organizationId", "==", orgId)
                .where("enrollment_status", "==", "active")
                .get();
        }
        catch (_a) {
            // Fallback: try without enrollment_status filter
            try {
                individualsSnap = await db
                    .collection("individuals")
                    .where("organizationId", "==", orgId)
                    .get();
            }
            catch (err2) {
                errors.push(`Failed to load individuals: ${err2.message}`);
                await finalizeRun(runRef, "failed", errors, 0, 0, 0, 0, 0, 0, 0, preFilterResults, null);
                return buildRunResult(runId, orgId, runType, triggeredBy, "failed", 0, 0, 0, 0, 0, 0, 0, preFilterResults, null, errors);
            }
        }
        console.log(`[BrainOrchestrator] Processing ${individualsSnap.size} individuals for org ${orgId}`);
        for (const indDoc of individualsSnap.docs) {
            const individual = toIndividualRecord(indDoc.id, indDoc.data());
            let complianceFindings = [];
            try {
                // Load the guidelines engine rule pack for this individual
                const rulePack = await loadRulePack(individual, orgId, db);
                // ── Agent 1: Compliance ───────────────────────────────────────────────
                let complianceResult = { tasks: [], logs: [], compliance_score: 70, drafts_count: 0 };
                if (settings.agents_enabled.compliance) {
                    preFilterResults.compliance.scanned++;
                    const pfCompliance = await (0, preFilters_1.preFilterCompliance)(individual, db);
                    if (pfCompliance.passes) {
                        preFilterResults.compliance.passed++;
                        try {
                            complianceResult = await (0, complianceAgent_1.runComplianceAgent)(individual, rulePack, runId, orgId, db);
                            if (complianceResult.compliance_score !== undefined) {
                                complianceScoresUpdated++;
                            }
                            // Reconstruct ComplianceFindings from tasks for the documentation agent
                            complianceFindings = complianceResult.tasks.map((t) => ({
                                type: t.task_type,
                                severity: (t.severity === "critical" ? "critical" : t.severity === "high" ? "warning" : "info"),
                                title: t.title,
                                description: t.description,
                                days_overdue: t.days_overdue,
                                rule_reference: t.rule_reference,
                                requires_task: true,
                                requires_draft: t.has_ai_draft,
                            }));
                        }
                        catch (err) {
                            errors.push(`Compliance agent failed for ${individual.id}: ${err.message}`);
                        }
                    }
                    else {
                        preFilterResults.compliance.skipped++;
                        console.log(`[BrainOrchestrator] SKIPPED compliance for ${individual.id}: ${pfCompliance.reason}`);
                    }
                }
                // ── Agent 2: Documentation ────────────────────────────────────────────
                let docResult = { tasks: [], logs: [], drafts_count: 0 };
                if (settings.agents_enabled.documentation && complianceFindings.length > 0) {
                    preFilterResults.documentation.scanned++;
                    const pfDoc = await (0, preFilters_1.preFilterDocumentation)(individual, db);
                    if (pfDoc.passes) {
                        preFilterResults.documentation.passed++;
                        try {
                            docResult = await (0, documentationAgent_1.runDocumentationAgent)(individual, complianceFindings, runId, orgId, db, customPrompts.documentation);
                            draftsGenerated += docResult.drafts_count;
                        }
                        catch (err) {
                            errors.push(`Documentation agent failed for ${individual.id}: ${err.message}`);
                        }
                    }
                    else {
                        preFilterResults.documentation.skipped++;
                        console.log(`[BrainOrchestrator] SKIPPED documentation for ${individual.id}: ${pfDoc.reason}`);
                    }
                }
                // ── Agent 3: Billing ──────────────────────────────────────────────────
                let billingResult = { tasks: [], logs: [], drafts_count: 0 };
                if (settings.agents_enabled.billing) {
                    preFilterResults.billing.scanned++;
                    const pfBilling = await (0, preFilters_1.preFilterBilling)(individual, db);
                    if (pfBilling.passes) {
                        preFilterResults.billing.passed++;
                        try {
                            billingResult = await (0, billingAgent_1.runBillingAgent)(individual, runId, orgId, db);
                        }
                        catch (err) {
                            errors.push(`Billing agent failed for ${individual.id}: ${err.message}`);
                        }
                    }
                    else {
                        preFilterResults.billing.skipped++;
                        console.log(`[BrainOrchestrator] SKIPPED billing for ${individual.id}: ${pfBilling.reason}`);
                    }
                }
                // ── Agent 4: Escalation ───────────────────────────────────────────────
                let escalationResult = { tasks: [], logs: [], drafts_count: 0 };
                if (settings.agents_enabled.escalation) {
                    preFilterResults.escalation.scanned++;
                    const pfEscalation = await (0, preFilters_1.preFilterEscalation)(individual, db);
                    if (pfEscalation.passes) {
                        preFilterResults.escalation.passed++;
                        try {
                            escalationResult = await (0, escalationAgent_1.runEscalationAgent)(individual, runId, orgId, settings, db);
                            escalationsTriggered += escalationResult.tasks.length;
                        }
                        catch (err) {
                            errors.push(`Escalation agent failed for ${individual.id}: ${err.message}`);
                        }
                    }
                    else {
                        preFilterResults.escalation.skipped++;
                        console.log(`[BrainOrchestrator] SKIPPED escalation for ${individual.id}: ${pfEscalation.reason}`);
                    }
                }
                // ── Agent 5: Renewal ──────────────────────────────────────────────────
                let renewalResult = { tasks: [], logs: [], drafts_count: 0 };
                if (settings.agents_enabled.renewal) {
                    preFilterResults.renewal.scanned++;
                    const pfRenewal = await (0, preFilters_1.preFilterRenewal)(individual, db);
                    if (pfRenewal.passes) {
                        preFilterResults.renewal.passed++;
                        try {
                            renewalResult = await (0, renewalAgent_1.runRenewalAgent)(individual, rulePack, runId, orgId, db, customPrompts.renewal);
                            draftsGenerated += renewalResult.drafts_count;
                        }
                        catch (err) {
                            errors.push(`Renewal agent failed for ${individual.id}: ${err.message}`);
                        }
                    }
                    else {
                        preFilterResults.renewal.skipped++;
                        console.log(`[BrainOrchestrator] SKIPPED renewal for ${individual.id}: ${pfRenewal.reason}`);
                    }
                }
                // ── Agent 6: Authorization ────────────────────────────────────────────
                let authResult = { tasks: [], logs: [], drafts_count: 0 };
                if (settings.agents_enabled.authorization !== false) {
                    try {
                        authResult = await (0, authorizationAgent_1.runAuthorizationAgent)(individual, runId, orgId, db);
                    }
                    catch (err) {
                        errors.push(`Authorization agent failed for ${individual.id}: ${err.message}`);
                    }
                }
                // ── Agent 7: Assessment Compliance ────────────────────────────────────
                let assessmentResult = { tasks: [], logs: [], drafts_count: 0 };
                if (settings.agents_enabled.assessment !== false) {
                    try {
                        assessmentResult = await (0, assessmentAgent_1.runAssessmentAgent)(individual, runId, orgId, db);
                    }
                    catch (err) {
                        errors.push(`Assessment agent failed for ${individual.id}: ${err.message}`);
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
                        // ── Traceability validation ───────────────────────────────────────
                        if (!task.rule_id || task.rule_id.trim() === "") {
                            console.warn(`[BrainOrchestrator] BLOCKED task: missing rule_id for individual ${individual.id}, agent ${task.source_agent}, title: "${task.title}"`);
                            tasksBlockedMissingTraceability++;
                            continue;
                        }
                        if (!task.task_reason || task.task_reason.trim().length < 20) {
                            console.warn(`[BrainOrchestrator] BLOCKED task: task_reason missing or < 20 chars for individual ${individual.id}, rule_id: ${task.rule_id}`);
                            tasksBlockedMissingTraceability++;
                            continue;
                        }
                        if (!task.evidence_checked || task.evidence_checked.trim() === "") {
                            console.warn(`[BrainOrchestrator] BLOCKED task: missing evidence_checked for individual ${individual.id}, rule_id: ${task.rule_id}`);
                            tasksBlockedMissingTraceability++;
                            continue;
                        }
                        tasksWithTraceability++;
                        // Write to orchestrator_tasks collection
                        const orchTaskRef = await db.collection(ORCHESTRATOR_TASKS).add(Object.assign(Object.assign({}, task), { run_id: runId, created_at: admin.firestore.FieldValue.serverTimestamp(), updated_at: admin.firestore.FieldValue.serverTimestamp() }));
                        // Write to tasks collection (for My Work integration)
                        if (task.assigned_to_user_id) {
                            const dueDate = task.due_date
                                .toDate()
                                .toISOString()
                                .split("T")[0];
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
                                rule_id: task.rule_id,
                                task_reason: task.task_reason,
                                evidence_checked: task.evidence_checked,
                                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                            });
                            tasksCreated++;
                        }
                    }
                    catch (err) {
                        errors.push(`Failed to write task for ${individual.id}: ${err.message}`);
                    }
                }
                // ── Write logs ────────────────────────────────────────────────────────
                const logBatch = db.batch();
                for (const log of allLogs) {
                    const logRef = db.collection(ORCHESTRATOR_LOGS).doc();
                    logBatch.set(logRef, Object.assign(Object.assign({}, log), { run_id: runId, timestamp: admin.firestore.FieldValue.serverTimestamp() }));
                }
                try {
                    await logBatch.commit();
                }
                catch (_b) {
                    // Non-fatal — logs are informational
                }
                individualsProcessed++;
            }
            catch (err) {
                const errMsg = `Failed to process individual ${individual.id}: ${err.message}`;
                errors.push(errMsg);
                console.error(`[BrainOrchestrator] ${errMsg}`);
            }
        }
        // ── Run notification deduplication after all agents for all individuals ──
        try {
            notificationSummary = await (0, notificationDedup_1.runNotificationDeduplication)(runId, orgId, db);
            console.log(`[BrainOrchestrator] Notification dedup complete: ${JSON.stringify(notificationSummary)}`);
        }
        catch (err) {
            errors.push(`Notification dedup failed: ${err.message}`);
        }
        // Generate run summary
        const summary = `Processed ${individualsProcessed} individuals. Created ${tasksCreated} tasks (${tasksBlockedMissingTraceability} blocked for missing traceability). Generated ${draftsGenerated} AI drafts. Triggered ${escalationsTriggered} escalations. Updated ${complianceScoresUpdated} compliance scores.${errors.length > 0 ? ` ${errors.length} errors.` : ""}`;
        await finalizeRun(runRef, "completed", errors, individualsProcessed, tasksCreated, draftsGenerated, escalationsTriggered, complianceScoresUpdated, tasksWithTraceability, tasksBlockedMissingTraceability, preFilterResults, notificationSummary, summary);
        console.log(`[BrainOrchestrator] Completed. ${summary}`);
        return buildRunResult(runId, orgId, runType, triggeredBy, "completed", individualsProcessed, tasksCreated, draftsGenerated, escalationsTriggered, complianceScoresUpdated, tasksWithTraceability, tasksBlockedMissingTraceability, preFilterResults, notificationSummary, errors, summary);
    }
    catch (err) {
        const errMsg = err.message;
        errors.push(errMsg);
        await finalizeRun(runRef, "failed", errors, individualsProcessed, tasksCreated, draftsGenerated, escalationsTriggered, complianceScoresUpdated, tasksWithTraceability, tasksBlockedMissingTraceability, preFilterResults, notificationSummary);
        console.error(`[BrainOrchestrator] Fatal error for org ${orgId}:`, err);
        return buildRunResult(runId, orgId, runType, triggeredBy, "failed", individualsProcessed, tasksCreated, draftsGenerated, escalationsTriggered, complianceScoresUpdated, tasksWithTraceability, tasksBlockedMissingTraceability, preFilterResults, notificationSummary, errors);
    }
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
async function loadOrchestratorSettings(orgId, db) {
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
        // Non-fatal — use defaults
    }
    return types_1.DEFAULT_ORCHESTRATOR_SETTINGS;
}
async function loadRulePack(individual, orgId, db) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
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
            const state = (_a = individual.state) !== null && _a !== void 0 ? _a : "Indiana";
            const program = (_c = (_b = individual.program) !== null && _b !== void 0 ? _b : individual.waiver_type) !== null && _c !== void 0 ? _c : individual.program_type;
            let bestMatch = snap.docs[0];
            for (const engineDoc of snap.docs) {
                const data = engineDoc.data();
                if (data.state === state &&
                    (data.program === program || !program)) {
                    bestMatch = engineDoc;
                    break;
                }
            }
            const engineData = (_d = bestMatch === null || bestMatch === void 0 ? void 0 : bestMatch.data()) !== null && _d !== void 0 ? _d : {};
            // Map engine data to RulePack format
            const rulePack = {
                visit_frequency_months: (_e = engineData.visit_frequency_months) !== null && _e !== void 0 ? _e : 3,
                monitoring_form_frequency_months: (_f = engineData.monitoring_form_frequency_months) !== null && _f !== void 0 ? _f : 3,
                contact_frequency_months: (_g = engineData.contact_frequency_months) !== null && _g !== void 0 ? _g : 1,
                annual_pcp_required: (_h = engineData.annual_pcp_required) !== null && _h !== void 0 ? _h : true,
                pcp_renewal_cycle_days: (_j = engineData.pcp_renewal_cycle_days) !== null && _j !== void 0 ? _j : 365,
                medicaid_redetermination_cycle_days: (_k = engineData.medicaid_redetermination_cycle_days) !== null && _k !== void 0 ? _k : 365,
                assessment_frequency_months: (_l = engineData.assessment_frequency_months) !== null && _l !== void 0 ? _l : 12,
                supervisor_review_required: (_m = engineData.supervisor_review_required) !== null && _m !== void 0 ? _m : true,
                billing_authorization_required: (_o = engineData.billing_authorization_required) !== null && _o !== void 0 ? _o : true,
                state: (_p = engineData.state) !== null && _p !== void 0 ? _p : state,
                program: (_r = (_q = engineData.program) !== null && _q !== void 0 ? _q : program) !== null && _r !== void 0 ? _r : "DDA",
                version: (_s = engineData.version) !== null && _s !== void 0 ? _s : "1.0",
                source: "guidelines_engine",
            };
            return rulePack;
        }
    }
    catch (_u) {
        // Fall through to default
    }
    // Fallback: Indiana DDA defaults
    return (0, defaultRulePacks_1.getDefaultRulePack)(individual.state, (_t = individual.program) !== null && _t !== void 0 ? _t : individual.waiver_type);
}
async function finalizeRun(runRef, status, errors, individualsProcessed, tasksCreated, draftsGenerated, escalationsTriggered, complianceScoresUpdated, tasksWithTraceability, tasksBlockedMissingTraceability, preFilterResults, notificationSummary, summary) {
    try {
        await runRef.update(Object.assign(Object.assign(Object.assign({ status, completed_at: admin.firestore.FieldValue.serverTimestamp(), individuals_processed: individualsProcessed, tasks_created: tasksCreated, drafts_generated: draftsGenerated, escalations_triggered: escalationsTriggered, compliance_scores_updated: complianceScoresUpdated, tasks_with_traceability: tasksWithTraceability, tasks_blocked_missing_traceability: tasksBlockedMissingTraceability, pre_filter_results: preFilterResults }, (notificationSummary ? { notification_summary: notificationSummary } : {})), { errors: errors.slice(0, 20) }), (summary ? { summary } : {})));
    }
    catch (err) {
        console.error("[BrainOrchestrator] Failed to finalize run:", err);
    }
}
function buildRunResult(runId, orgId, runType, triggeredBy, status, individualsProcessed, tasksCreated, draftsGenerated, escalationsTriggered, complianceScoresUpdated, tasksWithTraceability, tasksBlockedMissingTraceability, preFilterResults, notificationSummary, errors, summary) {
    return Object.assign(Object.assign(Object.assign({ run_id: runId, org_id: orgId, run_type: runType, triggered_by: triggeredBy, status, individuals_processed: individualsProcessed, tasks_created: tasksCreated, drafts_generated: draftsGenerated, escalations_triggered: escalationsTriggered, compliance_scores_updated: complianceScoresUpdated, tasks_with_traceability: tasksWithTraceability, tasks_blocked_missing_traceability: tasksBlockedMissingTraceability, pre_filter_results: preFilterResults }, (notificationSummary ? { notification_summary: notificationSummary } : {})), { errors }), (summary ? { summary } : {}));
}
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
async function loadAgentPrompts(orgId, db) {
    try {
        const snap = await db
            .doc(`organizations/${orgId}/settings/orchestrator_prompts`)
            .get();
        if (snap.exists) {
            const data = snap.data();
            return {
                compliance: data.compliance || types_1.DEFAULT_AGENT_PROMPTS.compliance,
                documentation: data.documentation || types_1.DEFAULT_AGENT_PROMPTS.documentation,
                billing: data.billing || types_1.DEFAULT_AGENT_PROMPTS.billing,
                escalation: data.escalation || types_1.DEFAULT_AGENT_PROMPTS.escalation,
                renewal: data.renewal || types_1.DEFAULT_AGENT_PROMPTS.renewal,
            };
        }
    }
    catch (_a) {
        // Non-fatal — use defaults
    }
    return Object.assign({}, types_1.DEFAULT_AGENT_PROMPTS);
}
function taskTypeToLabel(taskType) {
    var _a;
    const labels = {
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
    return (_a = labels[taskType]) !== null && _a !== void 0 ? _a : "General";
}
//# sourceMappingURL=brainOrchestrator.js.map