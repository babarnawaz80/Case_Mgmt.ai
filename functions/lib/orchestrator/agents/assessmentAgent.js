"use strict";
// Assessment Compliance Agent — Orchestrator
// Checks assessment deadlines against program-configured schedule rules.
// Creates tasks for overdue or upcoming assessments.
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
exports.runAssessmentAgent = runAssessmentAgent;
const admin = __importStar(require("firebase-admin"));
async function runAssessmentAgent(individual, runId, orgId, db) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const tasks = [];
    const logs = [];
    const today = new Date();
    const indName = `${individual.first_name} ${individual.last_name}`;
    const assignedTo = (_a = individual.assigned_case_manager_uid) !== null && _a !== void 0 ? _a : "";
    const assignedName = (_b = individual.assigned_case_manager_name) !== null && _b !== void 0 ? _b : "Unassigned";
    try {
        // ── Load program assessment schedule rules ────────────────────────────────
        let scheduleRules = [];
        // Get the individual's program ID
        const indDoc = await db.collection("individuals").doc(individual.id).get().catch(() => null);
        const programId = (_c = indDoc === null || indDoc === void 0 ? void 0 : indDoc.data()) === null || _c === void 0 ? void 0 : _c.programId;
        if (programId) {
            const programDoc = await db.collection("programs").doc(programId).get().catch(() => null);
            const programData = programDoc === null || programDoc === void 0 ? void 0 : programDoc.data();
            if ((programData === null || programData === void 0 ? void 0 : programData.assessmentSchedule) && Array.isArray(programData.assessmentSchedule)) {
                scheduleRules = programData.assessmentSchedule;
            }
        }
        // If no program rules, use sensible defaults: check for any assessments > 13 months old
        if (scheduleRules.length === 0) {
            // Default rule: assessments should not be older than 13 months
            scheduleRules = [{
                    templateId: "__any__",
                    templateName: "Annual Reassessment",
                    requirementType: "recurring",
                    recurringEveryDays: 365,
                    countFromEnrollment: false,
                    alertDaysBefore: [30, 14],
                    alertOnOverdue: true,
                }];
        }
        // ── Check each rule against actual assessments ────────────────────────────
        for (const rule of scheduleRules) {
            // Load matching assessments
            let snap;
            try {
                const q = rule.templateId === "__any__"
                    ? db.collection("assessments")
                        .where("individualId", "==", individual.id)
                        .where("status", "==", "completed")
                        .orderBy("completedAt", "desc")
                        .limit(1)
                    : db.collection("assessments")
                        .where("individualId", "==", individual.id)
                        .where("templateId", "==", rule.templateId)
                        .where("status", "==", "completed")
                        .orderBy("completedAt", "desc")
                        .limit(1);
                snap = await q.get();
            }
            catch (_p) {
                try {
                    // Fallback without ordering
                    snap = await db.collection("assessments")
                        .where("individualId", "==", individual.id)
                        .where("status", "==", "completed")
                        .limit(5)
                        .get();
                }
                catch (_q) {
                    continue;
                }
            }
            const lastAssessment = !snap.empty ? snap.docs[0].data() : null;
            const lastCompleted = lastAssessment
                ? (((_e = (_d = lastAssessment.completedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) || new Date(lastAssessment.date || 0))
                : null;
            let daysUntil;
            let overdue = false;
            if (rule.requirementType === "initial") {
                const dueDays = (_f = rule.initialDueDays) !== null && _f !== void 0 ? _f : 30;
                if (!lastCompleted) {
                    // Never completed — check enrollment window
                    const enrollDate = ((_g = indDoc === null || indDoc === void 0 ? void 0 : indDoc.data()) === null || _g === void 0 ? void 0 : _g.admissionDate) || ((_h = indDoc === null || indDoc === void 0 ? void 0 : indDoc.data()) === null || _h === void 0 ? void 0 : _h.enrollmentDate);
                    if (enrollDate) {
                        const enrolled = new Date(enrollDate);
                        const daysEnrolled = Math.floor((today.getTime() - enrolled.getTime()) / (1000 * 60 * 60 * 24));
                        daysUntil = dueDays - daysEnrolled;
                        overdue = daysUntil < 0;
                    }
                    else {
                        continue; // can't compute without enrollment date
                    }
                }
                else {
                    continue; // initial already done
                }
            }
            else {
                // Recurring
                const freqDays = (_j = rule.recurringEveryDays) !== null && _j !== void 0 ? _j : 365;
                const baseDate = lastCompleted || (((_k = indDoc === null || indDoc === void 0 ? void 0 : indDoc.data()) === null || _k === void 0 ? void 0 : _k.admissionDate) ? new Date(indDoc.data().admissionDate) : null);
                if (!baseDate)
                    continue;
                const nextDue = new Date(baseDate.getTime() + freqDays * 24 * 60 * 60 * 1000);
                daysUntil = Math.floor((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                overdue = daysUntil < 0;
            }
            // Determine if we should fire
            const alertThresholds = (_l = rule.alertDaysBefore) !== null && _l !== void 0 ? _l : [30, 14];
            const shouldAlert = overdue
                ? (rule.alertOnOverdue !== false)
                : alertThresholds.some(t => daysUntil <= t);
            if (!shouldAlert)
                continue;
            const severity = overdue ? "critical" : daysUntil <= 14 ? "high" : "medium";
            const message = overdue
                ? `${rule.templateName} is overdue by ${Math.abs(daysUntil)} days for ${indName}.${lastCompleted ? ` Last completed: ${lastCompleted.toLocaleDateString()}.` : " Never completed."}`
                : `${rule.templateName} for ${indName} is due in ${daysUntil} days.${lastCompleted ? ` Last completed: ${lastCompleted.toLocaleDateString()}.` : ""}`;
            tasks.push({
                org_id: orgId,
                individual_id: individual.id,
                individual_name: indName,
                assigned_to_user_id: assignedTo,
                assigned_to_name: assignedName,
                task_type: "assessment_due",
                severity,
                title: overdue
                    ? `Assessment overdue: ${rule.templateName} — ${indName}`
                    : `Assessment due in ${daysUntil}d: ${rule.templateName} — ${indName}`,
                description: message,
                rule_reference: `Assessment Compliance — ${rule.requirementType} requirement`,
                due_date: admin.firestore.Timestamp.fromDate(today),
                days_overdue: overdue ? Math.abs(daysUntil) : 0,
                has_ai_draft: false,
                ai_draft_id: null,
                source_agent: "compliance",
                status: "pending",
                rule_id: overdue ? "ASSESSMENT_OVERDUE" : "ASSESSMENT_DUE_SOON",
                task_reason: overdue
                    ? `${rule.templateName} for ${indName} is overdue by ${Math.abs(daysUntil)} days (${rule.requirementType} requirement, every ${(_m = rule.recurringEveryDays) !== null && _m !== void 0 ? _m : rule.initialDueDays} days).`
                    : `${rule.templateName} for ${indName} is due in ${daysUntil} days (${rule.requirementType} requirement, every ${(_o = rule.recurringEveryDays) !== null && _o !== void 0 ? _o : rule.initialDueDays} days).`,
                evidence_checked: `assessments (individualId, templateId=${rule.templateId}, status=completed, completedAt desc), programs (assessmentSchedule), individuals (programId)`,
            });
            logs.push({
                org_id: orgId,
                individual_id: individual.id,
                agent: "compliance",
                action: overdue ? "ASSESSMENT_OVERDUE" : "ASSESSMENT_DUE_SOON",
                rule_applied: `Assessment schedule: ${rule.templateName} every ${rule.recurringEveryDays || rule.initialDueDays} days`,
                finding: message,
                result: "Task created for case manager review",
            });
            // Escalate critical to supervisor
            if (severity === "critical" && individual.assigned_supervisor_uid) {
                try {
                    await db.collection("notifications").add({
                        uid: individual.assigned_supervisor_uid,
                        organizationId: orgId,
                        type: "alert",
                        title: `Assessment Overdue — ${indName}`,
                        body: message,
                        href: `/people/${individual.id}/assessments`,
                        read: false,
                        dismissed: false,
                        severity: "critical",
                        source: "assessment_agent",
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
                catch ( /* non-fatal */_r) { /* non-fatal */ }
            }
        }
    }
    catch (err) {
        console.warn(`[AssessmentAgent] Error for ${individual.id}:`, err);
    }
    return { tasks, logs, drafts_count: 0 };
}
//# sourceMappingURL=assessmentAgent.js.map