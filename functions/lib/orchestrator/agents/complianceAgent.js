"use strict";
// Compliance Agent — Brain Orchestrator
// Checks visit, monitoring, assessment, PCP, and MA compliance for each individual.
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
exports.runComplianceAgent = runComplianceAgent;
const admin = __importStar(require("firebase-admin"));
function daysSince(dateStr) {
    if (!dateStr)
        return 9999;
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}
function daysUntil(dateStr) {
    if (!dateStr)
        return -9999;
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
async function runComplianceAgent(individual, rulePack, runId, orgId, db) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2;
    const tasks = [];
    const logs = [];
    const findings = [];
    const indName = `${individual.first_name} ${individual.last_name}`;
    const assignedTo = (_a = individual.assigned_case_manager_uid) !== null && _a !== void 0 ? _a : "";
    const assignedName = (_b = individual.assigned_case_manager_name) !== null && _b !== void 0 ? _b : "Unassigned";
    // ── 1. Visit compliance ─────────────────────────────────────────────────────
    const visitRequiredDays = rulePack.visit_frequency_months * 30;
    const daysSinceVisit = daysSince(individual.last_visit_date);
    const visitOverdue = daysSinceVisit - visitRequiredDays;
    if (visitOverdue > 0) {
        const severity = visitOverdue > 30 ? "critical" : visitOverdue > 7 ? "warning" : "info";
        findings.push({
            type: "visit_overdue",
            severity,
            title: `Visit overdue ${visitOverdue} days`,
            description: `Last visit was ${daysSinceVisit} days ago. Required every ${rulePack.visit_frequency_months} months.`,
            days_overdue: visitOverdue,
            rule_reference: `${(_c = rulePack.state) !== null && _c !== void 0 ? _c : "State"} ${(_d = rulePack.program) !== null && _d !== void 0 ? _d : "Program"} — Quarterly visit required`,
            requires_task: true,
            requires_draft: false,
        });
        const dueDate = admin.firestore.Timestamp.fromDate(new Date());
        tasks.push({
            org_id: orgId,
            individual_id: individual.id,
            individual_name: indName,
            assigned_to_user_id: assignedTo,
            assigned_to_name: assignedName,
            task_type: "visit_required",
            severity: visitOverdue > 30 ? "critical" : visitOverdue > 7 ? "high" : "medium",
            title: `Quarterly visit overdue — ${indName}`,
            description: `Visit required every ${rulePack.visit_frequency_months} months. Last visit ${daysSinceVisit} days ago. ${visitOverdue} days overdue.`,
            rule_reference: `${(_e = rulePack.state) !== null && _e !== void 0 ? _e : "Indiana"} ${(_f = rulePack.program) !== null && _f !== void 0 ? _f : "DDA Waiver"} — Section 4.2: Quarterly in-home visit required`,
            due_date: dueDate,
            days_overdue: visitOverdue,
            has_ai_draft: false,
            ai_draft_id: null,
            source_agent: "compliance",
            status: "pending",
            rule_id: "COMPLIANCE_VISIT_REQUIRED",
            task_reason: `Last face-to-face visit was ${daysSinceVisit} days ago; required every ${rulePack.visit_frequency_months * 30} days — ${visitOverdue} days overdue as of today.`,
            evidence_checked: "individuals (last_visit_date), monitoring_forms (most recent)",
        });
        logs.push({
            org_id: orgId,
            individual_id: individual.id,
            agent: "compliance",
            action: "VISIT_OVERDUE_DETECTED",
            rule_applied: `Visit required every ${rulePack.visit_frequency_months} months`,
            finding: `Last visit ${daysSinceVisit} days ago, overdue by ${visitOverdue} days`,
            result: "Task created: visit_required",
        });
    }
    else if (visitOverdue > -30) {
        // Approaching (within 30 days)
        findings.push({
            type: "visit_approaching",
            severity: "info",
            title: `Visit due in ${-visitOverdue} days`,
            description: `Next visit due in ${-visitOverdue} days based on last visit date.`,
            days_overdue: visitOverdue,
            rule_reference: `${(_g = rulePack.state) !== null && _g !== void 0 ? _g : "State"} ${(_h = rulePack.program) !== null && _h !== void 0 ? _h : "Program"} — Quarterly visit required`,
            requires_task: false,
            requires_draft: false,
        });
    }
    // ── 2. Monitoring form compliance ───────────────────────────────────────────
    const monitoringRequiredDays = rulePack.monitoring_form_frequency_months * 30;
    // Try to get last monitoring form date from Firestore if not on individual record
    let lastMonitoringDate = individual.last_monitoring_form_date;
    if (!lastMonitoringDate) {
        try {
            const monSnap = await db
                .collection("monitoring_forms")
                .where("individualId", "==", individual.id)
                .orderBy("createdAt", "desc")
                .limit(1)
                .get();
            if (!monSnap.empty) {
                const data = monSnap.docs[0].data();
                lastMonitoringDate = (_k = (_j = data.date) !== null && _j !== void 0 ? _j : data.visitDate) !== null && _k !== void 0 ? _k : (_p = (_o = (_m = (_l = data.createdAt) === null || _l === void 0 ? void 0 : _l.toDate) === null || _m === void 0 ? void 0 : _m.call(_l)) === null || _o === void 0 ? void 0 : _o.toISOString()) === null || _p === void 0 ? void 0 : _p.split("T")[0];
            }
        }
        catch (_3) {
            // Index may not exist — skip
        }
    }
    const daysSinceMonitoring = daysSince(lastMonitoringDate);
    const monitoringOverdue = daysSinceMonitoring - monitoringRequiredDays;
    if (monitoringOverdue > 0) {
        findings.push({
            type: "monitoring_form_overdue",
            severity: monitoringOverdue > 14 ? "critical" : "warning",
            title: `Monitoring form overdue ${monitoringOverdue} days`,
            description: `Last monitoring form was ${daysSinceMonitoring} days ago.`,
            days_overdue: monitoringOverdue,
            rule_reference: `${(_q = rulePack.state) !== null && _q !== void 0 ? _q : "State"} ${(_r = rulePack.program) !== null && _r !== void 0 ? _r : "Program"} — Quarterly monitoring form required`,
            requires_task: true,
            requires_draft: true,
        });
        tasks.push({
            org_id: orgId,
            individual_id: individual.id,
            individual_name: indName,
            assigned_to_user_id: assignedTo,
            assigned_to_name: assignedName,
            task_type: "monitoring_form_due",
            severity: monitoringOverdue > 14 ? "critical" : "high",
            title: `Monitoring form overdue — ${indName}`,
            description: `Monitoring form required every ${rulePack.monitoring_form_frequency_months} months. ${monitoringOverdue} days overdue.`,
            rule_reference: `${(_s = rulePack.state) !== null && _s !== void 0 ? _s : "Indiana"} ${(_t = rulePack.program) !== null && _t !== void 0 ? _t : "DDA Waiver"} — Section 5.1: Quarterly monitoring documentation required`,
            due_date: admin.firestore.Timestamp.fromDate(new Date()),
            days_overdue: monitoringOverdue,
            has_ai_draft: true,
            ai_draft_id: null,
            source_agent: "compliance",
            status: "pending",
            rule_id: "COMPLIANCE_MONITORING_FORM_OVERDUE",
            task_reason: `Last monitoring form was ${daysSinceMonitoring} days ago; required every ${rulePack.monitoring_form_frequency_months * 30} days — ${monitoringOverdue} days overdue.`,
            evidence_checked: "individuals (last_monitoring_form_date), monitoring_forms (most recent by createdAt desc)",
        });
        logs.push({
            org_id: orgId,
            individual_id: individual.id,
            agent: "compliance",
            action: "MONITORING_FORM_OVERDUE",
            rule_applied: `Monitoring form required every ${rulePack.monitoring_form_frequency_months} months`,
            finding: `Last monitoring form ${daysSinceMonitoring} days ago, overdue by ${monitoringOverdue} days`,
            result: "Task created: monitoring_form_due (AI draft queued)",
        });
    }
    // ── 3. PCP/ISP renewal ──────────────────────────────────────────────────────
    const pcpDueDate = (_u = individual.pcp_due_date) !== null && _u !== void 0 ? _u : individual.isp_due_date;
    if (pcpDueDate) {
        const daysUntilPcp = daysUntil(pcpDueDate);
        if (daysUntilPcp < 0) {
            findings.push({
                type: "pcp_overdue",
                severity: "critical",
                title: `PCP expired ${Math.abs(daysUntilPcp)} days ago`,
                description: `Person-Centered Plan was due on ${pcpDueDate} and is now overdue.`,
                days_overdue: Math.abs(daysUntilPcp),
                rule_reference: `${(_v = rulePack.state) !== null && _v !== void 0 ? _v : "State"} ${(_w = rulePack.program) !== null && _w !== void 0 ? _w : "Program"} — Annual PCP renewal required`,
                requires_task: true,
                requires_draft: true,
            });
            tasks.push({
                org_id: orgId,
                individual_id: individual.id,
                individual_name: indName,
                assigned_to_user_id: assignedTo,
                assigned_to_name: assignedName,
                task_type: "pcp_renewal",
                severity: "critical",
                title: `PCP renewal OVERDUE — ${indName}`,
                description: `Annual Person-Centered Plan expired on ${pcpDueDate}. ${Math.abs(daysUntilPcp)} days overdue. Immediate action required.`,
                rule_reference: `${(_x = rulePack.state) !== null && _x !== void 0 ? _x : "Indiana"} ${(_y = rulePack.program) !== null && _y !== void 0 ? _y : "DDA Waiver"} — Annual ISP/PCP renewal required within 365 days`,
                due_date: admin.firestore.Timestamp.fromDate(new Date()),
                days_overdue: Math.abs(daysUntilPcp),
                has_ai_draft: true,
                ai_draft_id: null,
                source_agent: "compliance",
                status: "pending",
                rule_id: "COMPLIANCE_PCP_OVERDUE",
                task_reason: `Person-Centered Plan due date was ${pcpDueDate} and is now ${Math.abs(daysUntilPcp)} days overdue — immediate renewal required.`,
                evidence_checked: "individuals (pcp_due_date, isp_due_date)",
            });
            logs.push({
                org_id: orgId,
                individual_id: individual.id,
                agent: "compliance",
                action: "PCP_EXPIRED",
                rule_applied: "Annual PCP renewal required",
                finding: `PCP expired on ${pcpDueDate}, ${Math.abs(daysUntilPcp)} days overdue`,
                result: "Critical task created: pcp_renewal",
            });
        }
        else if (daysUntilPcp <= 90) {
            findings.push({
                type: "pcp_approaching",
                severity: daysUntilPcp <= 30 ? "warning" : "info",
                title: `PCP due in ${daysUntilPcp} days`,
                description: `Person-Centered Plan renewal due on ${pcpDueDate}.`,
                days_overdue: -daysUntilPcp,
                rule_reference: `${(_z = rulePack.state) !== null && _z !== void 0 ? _z : "State"} ${(_0 = rulePack.program) !== null && _0 !== void 0 ? _0 : "Program"} — Annual PCP renewal required`,
                requires_task: daysUntilPcp <= 60,
                requires_draft: daysUntilPcp <= 60,
            });
            if (daysUntilPcp <= 60) {
                const dueDateObj = new Date(pcpDueDate);
                tasks.push({
                    org_id: orgId,
                    individual_id: individual.id,
                    individual_name: indName,
                    assigned_to_user_id: assignedTo,
                    assigned_to_name: assignedName,
                    task_type: "pcp_renewal",
                    severity: daysUntilPcp <= 30 ? "high" : "medium",
                    title: `PCP renewal approaching — ${indName} (${daysUntilPcp} days)`,
                    description: `Person-Centered Plan renewal due on ${pcpDueDate}. Begin renewal process now. AI draft available.`,
                    rule_reference: `${(_1 = rulePack.state) !== null && _1 !== void 0 ? _1 : "Indiana"} ${(_2 = rulePack.program) !== null && _2 !== void 0 ? _2 : "DDA Waiver"} — Annual ISP/PCP renewal required`,
                    due_date: admin.firestore.Timestamp.fromDate(addDays(dueDateObj, -14)),
                    days_overdue: 0,
                    has_ai_draft: true,
                    ai_draft_id: null,
                    source_agent: "compliance",
                    status: "pending",
                    rule_id: "COMPLIANCE_PCP_APPROACHING",
                    task_reason: `Person-Centered Plan renewal is due on ${pcpDueDate} — only ${daysUntilPcp} days remain to complete the renewal packet.`,
                    evidence_checked: "individuals (pcp_due_date, isp_due_date)",
                });
                logs.push({
                    org_id: orgId,
                    individual_id: individual.id,
                    agent: "compliance",
                    action: "PCP_RENEWAL_APPROACHING",
                    rule_applied: "Annual PCP renewal required",
                    finding: `PCP due in ${daysUntilPcp} days on ${pcpDueDate}`,
                    result: daysUntilPcp <= 60 ? "Task created with AI draft queued" : "Logged only",
                });
            }
        }
    }
    // ── 4. Medicaid redetermination ─────────────────────────────────────────────
    if (individual.ma_redetermination_date) {
        const daysUntilMA = daysUntil(individual.ma_redetermination_date);
        if (daysUntilMA < 0) {
            findings.push({
                type: "ma_redetermination_overdue",
                severity: "critical",
                title: `MA redetermination overdue ${Math.abs(daysUntilMA)} days`,
                description: `Medicaid redetermination was due on ${individual.ma_redetermination_date}.`,
                days_overdue: Math.abs(daysUntilMA),
                rule_reference: "Annual Medicaid redetermination required",
                requires_task: true,
                requires_draft: false,
            });
            tasks.push({
                org_id: orgId,
                individual_id: individual.id,
                individual_name: indName,
                assigned_to_user_id: assignedTo,
                assigned_to_name: assignedName,
                task_type: "medicaid_redetermination",
                severity: "critical",
                title: `MA redetermination OVERDUE — ${indName}`,
                description: `Medicaid redetermination was due on ${individual.ma_redetermination_date}. Service interruption risk.`,
                rule_reference: "Annual Medicaid redetermination required — Eligibility Verification",
                due_date: admin.firestore.Timestamp.fromDate(new Date()),
                days_overdue: Math.abs(daysUntilMA),
                has_ai_draft: false,
                ai_draft_id: null,
                source_agent: "compliance",
                status: "pending",
                rule_id: "COMPLIANCE_MA_REDETERMINATION_OVERDUE",
                task_reason: `Medicaid redetermination was due on ${individual.ma_redetermination_date} and is ${Math.abs(daysUntilMA)} days overdue — service eligibility at risk.`,
                evidence_checked: "individuals (ma_redetermination_date)",
            });
        }
        else if (daysUntilMA <= 60) {
            tasks.push({
                org_id: orgId,
                individual_id: individual.id,
                individual_name: indName,
                assigned_to_user_id: assignedTo,
                assigned_to_name: assignedName,
                task_type: "medicaid_redetermination",
                severity: daysUntilMA <= 30 ? "high" : "medium",
                title: `MA redetermination approaching — ${indName} (${daysUntilMA} days)`,
                description: `Medicaid redetermination due on ${individual.ma_redetermination_date}. Begin preparation.`,
                rule_reference: "Annual Medicaid redetermination required",
                due_date: admin.firestore.Timestamp.fromDate(addDays(new Date(individual.ma_redetermination_date), -14)),
                days_overdue: 0,
                has_ai_draft: false,
                ai_draft_id: null,
                source_agent: "compliance",
                status: "pending",
                rule_id: "COMPLIANCE_MA_REDETERMINATION_APPROACHING",
                task_reason: `Medicaid redetermination is due on ${individual.ma_redetermination_date} — only ${daysUntilMA} days remain to submit eligibility documentation.`,
                evidence_checked: "individuals (ma_redetermination_date)",
            });
        }
    }
    // ── 5. Calculate compliance score ───────────────────────────────────────────
    const criticalCount = findings.filter((f) => f.severity === "critical").length;
    const warningCount = findings.filter((f) => f.severity === "warning").length;
    const maxPossibleDeductions = 4;
    const deductions = Math.min(criticalCount * 25 + warningCount * 10, 100);
    const complianceScore = Math.max(0, 100 - deductions);
    // Update individual's compliance score
    try {
        await db.collection("individuals").doc(individual.id).update({
            compliance_score: complianceScore,
            compliance_tier: complianceScore >= 90 ? "green" : complianceScore >= 70 ? "amber" : "red",
            orchestrator_last_run: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (_4) {
        // Non-fatal if update fails
    }
    logs.push({
        org_id: orgId,
        individual_id: individual.id,
        agent: "compliance",
        action: "COMPLIANCE_SCORE_CALCULATED",
        rule_applied: "Composite compliance scoring",
        finding: `${criticalCount} critical, ${warningCount} warnings across ${maxPossibleDeductions} compliance areas`,
        result: `Score: ${complianceScore}/100 — Tier: ${complianceScore >= 90 ? "green" : complianceScore >= 70 ? "amber" : "red"}`,
    });
    return {
        tasks,
        logs,
        compliance_score: complianceScore,
        drafts_count: tasks.filter((t) => t.has_ai_draft).length,
    };
}
//# sourceMappingURL=complianceAgent.js.map