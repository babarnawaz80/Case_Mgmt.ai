"use strict";
// Billing Agent — Brain Orchestrator
// Finds unsigned billable notes, expiring authorizations, and service cap warnings.
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
exports.runBillingAgent = runBillingAgent;
const admin = __importStar(require("firebase-admin"));
async function runBillingAgent(individual, runId, orgId, db) {
    var _a, _b, _c, _d, _e, _f, _g;
    const tasks = [];
    const logs = [];
    const indName = `${individual.first_name} ${individual.last_name}`;
    const assignedTo = (_a = individual.assigned_case_manager_uid) !== null && _a !== void 0 ? _a : "";
    const assignedName = (_b = individual.assigned_case_manager_name) !== null && _b !== void 0 ? _b : "Unassigned";
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    // ── 1. Unsigned billable progress notes older than 48 hours ─────────────────
    try {
        const unsignedSnap = await db
            .collection("progress_notes")
            .where("individualId", "==", individual.id)
            .where("billable", "==", true)
            .where("status", "in", ["draft", "pending_signature"])
            .get();
        const oldUnsigned = unsignedSnap.docs.filter((d) => {
            var _a, _b, _c, _d, _e;
            const data = d.data();
            const created = (_c = (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : (_e = (_d = data.created_at) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d);
            return created && created < twoDaysAgo;
        });
        if (oldUnsigned.length > 0) {
            tasks.push({
                org_id: orgId,
                individual_id: individual.id,
                individual_name: indName,
                assigned_to_user_id: assignedTo,
                assigned_to_name: assignedName,
                task_type: "billing_action",
                severity: "high",
                title: `${oldUnsigned.length} unsigned billable note${oldUnsigned.length > 1 ? "s" : ""} — ${indName}`,
                description: `${oldUnsigned.length} billable progress note${oldUnsigned.length > 1 ? "s" : ""} pending signature for more than 48 hours. Unsigned notes cannot be billed.`,
                rule_reference: "Billing policy: Notes must be signed within 48 hours for timely billing",
                due_date: admin.firestore.Timestamp.fromDate(now),
                days_overdue: 0,
                has_ai_draft: false,
                ai_draft_id: null,
                source_agent: "billing",
                status: "pending",
                rule_id: "BILLING_UNSIGNED_NOTES",
                task_reason: `${oldUnsigned.length} billable progress note(s) have been in draft/pending_signature status for more than 48 hours and cannot be submitted for billing.`,
                evidence_checked: "progress_notes (billable=true, status in [draft, pending_signature], createdAt)",
            });
            logs.push({
                org_id: orgId,
                individual_id: individual.id,
                agent: "billing",
                action: "UNSIGNED_BILLABLE_NOTES_FOUND",
                rule_applied: "48-hour signing policy for billable notes",
                finding: `${oldUnsigned.length} unsigned billable notes older than 48 hours`,
                result: "Task created: billing_action",
            });
        }
    }
    catch (_h) {
        // Non-fatal — collection may not have the required index
    }
    // ── 2. Expiring service authorizations ──────────────────────────────────────
    try {
        const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const in30Str = in30.toISOString().split("T")[0];
        const nowStr = now.toISOString().split("T")[0];
        const authSnap = await db
            .collection("service_authorizations")
            .where("individualId", "==", individual.id)
            .where("status", "==", "active")
            .get();
        const expiringAuths = authSnap.docs.filter((d) => {
            var _a;
            const endDate = (_a = d.data().end_date) !== null && _a !== void 0 ? _a : d.data().expiration_date;
            return endDate && endDate >= nowStr && endDate <= in30Str;
        });
        for (const authDoc of expiringAuths) {
            const auth = authDoc.data();
            const endDate = (_c = auth.end_date) !== null && _c !== void 0 ? _c : auth.expiration_date;
            const daysLeft = Math.ceil((new Date(endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            tasks.push({
                org_id: orgId,
                individual_id: individual.id,
                individual_name: indName,
                assigned_to_user_id: assignedTo,
                assigned_to_name: assignedName,
                task_type: "authorization_expiring",
                severity: daysLeft <= 7 ? "critical" : daysLeft <= 14 ? "high" : "medium",
                title: `Authorization expiring in ${daysLeft} days — ${indName}`,
                description: `Service authorization for ${(_d = auth.service_name) !== null && _d !== void 0 ? _d : "services"} expires on ${endDate}. Renew to prevent service interruption.`,
                rule_reference: "Service authorization must be active for billing — renewal required before expiration",
                due_date: admin.firestore.Timestamp.fromDate(new Date(new Date(endDate).getTime() - 14 * 24 * 60 * 60 * 1000)),
                days_overdue: 0,
                has_ai_draft: false,
                ai_draft_id: null,
                source_agent: "billing",
                status: "pending",
                rule_id: "BILLING_AUTH_EXPIRY",
                task_reason: `Service authorization for ${(_e = auth.service_name) !== null && _e !== void 0 ? _e : "services"} (auth #${(_f = auth.auth_number) !== null && _f !== void 0 ? _f : authDoc.id}) expires on ${endDate} — ${daysLeft} days remaining before billing becomes invalid.`,
                evidence_checked: "service_authorizations (status=active, end_date, expiration_date)",
            });
            logs.push({
                org_id: orgId,
                individual_id: individual.id,
                agent: "billing",
                action: "AUTHORIZATION_EXPIRING",
                rule_applied: "Active authorization required for billing",
                finding: `Auth #${(_g = auth.auth_number) !== null && _g !== void 0 ? _g : authDoc.id} expires on ${endDate} (${daysLeft} days)`,
                result: `Task created: authorization_expiring — severity: ${daysLeft <= 7 ? "critical" : daysLeft <= 14 ? "high" : "medium"}`,
            });
        }
    }
    catch (_j) {
        // Non-fatal
    }
    return { tasks, logs, drafts_count: 0 };
}
//# sourceMappingURL=billingAgent.js.map