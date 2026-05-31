"use strict";
// Escalation Agent — Brain Orchestrator
// Escalates overdue items to supervisors based on configured thresholds.
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
exports.runEscalationAgent = runEscalationAgent;
const admin = __importStar(require("firebase-admin"));
const types_1 = require("../types");
async function runEscalationAgent(individual, runId, orgId, settings, db) {
    var _a, _b, _c;
    const tasks = [];
    const logs = [];
    const indName = `${individual.first_name} ${individual.last_name}`;
    const supervisorUid = (_a = individual.assigned_supervisor_uid) !== null && _a !== void 0 ? _a : "";
    const supervisorName = (_b = individual.assigned_supervisor_name) !== null && _b !== void 0 ? _b : "Supervisor";
    const now = new Date();
    const thresholds = (_c = settings.escalation_thresholds) !== null && _c !== void 0 ? _c : types_1.DEFAULT_ORCHESTRATOR_SETTINGS.escalation_thresholds;
    // Also check general tasks collection for overdue items
    try {
        const generalTasksSnap = await db
            .collection("tasks")
            .where("individualId", "==", individual.id)
            .where("organizationId", "==", orgId)
            .where("status", "!=", "completed")
            .get();
        const today = now.toISOString().split("T")[0];
        const overdueGeneral = generalTasksSnap.docs
            .map((d) => (Object.assign({ id: d.id }, d.data())))
            .filter((t) => t.dueDate && t.dueDate < today && t.source === "brain_orchestrator");
        for (const task of overdueGeneral) {
            if (!task.dueDate)
                continue;
            const dueDate = new Date(task.dueDate);
            const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysOverdue >= thresholds.critical_alert_days && supervisorUid) {
                // Critical: notify all supervisors
                try {
                    await db.collection("notifications").add({
                        uid: supervisorUid,
                        organizationId: orgId,
                        type: "alert",
                        title: `CRITICAL: Task ${daysOverdue} days overdue — ${indName}`,
                        body: `"${task.title}" for ${indName} is ${daysOverdue} days overdue. Immediate review required.`,
                        href: `/people/${individual.id}/echart`,
                        read: false,
                        dismissed: false,
                        severity: "critical",
                        source: "brain_orchestrator",
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
                catch (_d) {
                    // Non-fatal
                }
                tasks.push({
                    org_id: orgId,
                    individual_id: individual.id,
                    individual_name: indName,
                    assigned_to_user_id: supervisorUid,
                    assigned_to_name: supervisorName,
                    task_type: "escalation",
                    severity: "critical",
                    title: `CRITICAL ESCALATION — ${indName}: ${task.title}`,
                    description: `Task "${task.title}" is ${daysOverdue} days overdue. Supervisor action required immediately.`,
                    rule_reference: `Escalation policy: Tasks overdue ${thresholds.critical_alert_days}+ days require supervisor intervention`,
                    due_date: admin.firestore.Timestamp.fromDate(now),
                    days_overdue: daysOverdue,
                    has_ai_draft: false,
                    ai_draft_id: null,
                    source_agent: "escalation",
                    status: "pending",
                    rule_id: "ESCALATION_CRITICAL_OVERDUE_TASK",
                    task_reason: `Task "${task.title}" has been overdue for ${daysOverdue} days, exceeding the ${thresholds.critical_alert_days}-day critical escalation threshold — supervisor intervention required immediately.`,
                    evidence_checked: "tasks (individualId, organizationId, status!=completed, source=brain_orchestrator, dueDate)",
                });
                // Queue notification for deduplication
                try {
                    await db.collection("notification_queue").add({
                        run_id: runId,
                        recipient_id: supervisorUid,
                        individual_id: individual.id,
                        individual_name: indName,
                        recipient_name: supervisorName,
                        urgency: "CRITICAL",
                        message: `CRITICAL ESCALATION: Task "${task.title}" for ${indName} is ${daysOverdue} days overdue. Immediate supervisor intervention required.`,
                        agent: "escalation",
                        rule_id: "ESCALATION_CRITICAL_OVERDUE_TASK",
                        queued_at: admin.firestore.FieldValue.serverTimestamp(),
                        status: "queued",
                        org_id: orgId,
                    });
                }
                catch (_e) {
                    // Non-fatal
                }
                logs.push({
                    org_id: orgId,
                    individual_id: individual.id,
                    agent: "escalation",
                    action: "CRITICAL_ESCALATION",
                    rule_applied: `${thresholds.critical_alert_days}-day critical escalation threshold`,
                    finding: `Task "${task.title}" is ${daysOverdue} days overdue`,
                    result: "Critical alert sent to supervisor, escalation task created",
                });
                // Flag individual as compliance risk
                try {
                    await db.collection("individuals").doc(individual.id).update({
                        compliance_risk_flag: true,
                        compliance_risk_flagged_at: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
                catch (_f) {
                    // Non-fatal
                }
            }
            else if (daysOverdue >= thresholds.supervisor_task_days && supervisorUid) {
                // 14+ days: create supervisor task requiring acknowledgment
                try {
                    await db.collection("notifications").add({
                        uid: supervisorUid,
                        organizationId: orgId,
                        type: "alert",
                        title: `Escalation required — ${indName} (${daysOverdue} days overdue)`,
                        body: `"${task.title}" for ${indName} is ${daysOverdue} days overdue and requires supervisor acknowledgment.`,
                        href: `/people/${individual.id}/echart`,
                        read: false,
                        dismissed: false,
                        severity: "critical",
                        source: "brain_orchestrator",
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
                catch (_g) {
                    // Non-fatal
                }
                logs.push({
                    org_id: orgId,
                    individual_id: individual.id,
                    agent: "escalation",
                    action: "SUPERVISOR_ACKNOWLEDGMENT_REQUIRED",
                    rule_applied: `${thresholds.supervisor_task_days}-day supervisor task threshold`,
                    finding: `Task "${task.title}" is ${daysOverdue} days overdue`,
                    result: "Supervisor notification sent",
                });
            }
            else if (daysOverdue >= thresholds.supervisor_alert_days && supervisorUid) {
                // 7+ days: supervisor alert only
                try {
                    await db.collection("notifications").add({
                        uid: supervisorUid,
                        organizationId: orgId,
                        type: "alert",
                        title: `Overdue task alert — ${indName} (${daysOverdue} days)`,
                        body: `"${task.title}" for ${indName} is ${daysOverdue} days overdue.`,
                        href: `/people/${individual.id}/echart`,
                        read: false,
                        dismissed: false,
                        severity: "warning",
                        source: "brain_orchestrator",
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
                catch (_h) {
                    // Non-fatal
                }
                logs.push({
                    org_id: orgId,
                    individual_id: individual.id,
                    agent: "escalation",
                    action: "SUPERVISOR_ALERT_SENT",
                    rule_applied: `${thresholds.supervisor_alert_days}-day supervisor alert threshold`,
                    finding: `Task "${task.title}" is ${daysOverdue} days overdue`,
                    result: "Supervisor alert sent",
                });
            }
        }
    }
    catch (_j) {
        // Non-fatal
    }
    return { tasks, logs, drafts_count: 0 };
}
//# sourceMappingURL=escalationAgent.js.map