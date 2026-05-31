"use strict";
// Notification Deduplication — Brain Orchestrator
// Collects queued notifications from a run, separates CRITICAL (immediate),
// groups remaining by recipient+individual, and consolidates duplicates via Gemini.
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
exports.runNotificationDeduplication = runNotificationDeduplication;
const admin = __importStar(require("firebase-admin"));
const ai_1 = require("../services/ai");
async function runNotificationDeduplication(runId, orgId, db) {
    var _a;
    const summary = {
        total_queued: 0,
        critical_delivered_immediately: 0,
        delivered_individual: 0,
        delivered_consolidated: 0,
        individuals_affected: 0,
    };
    try {
        // ── Step 1: Collect queued notifications for this run ─────────────────────
        let queuedSnap;
        try {
            queuedSnap = await db
                .collection("notification_queue")
                .where("run_id", "==", runId)
                .where("status", "==", "queued")
                .get();
        }
        catch (_b) {
            // Non-fatal if collection doesn't exist yet
            return summary;
        }
        if (queuedSnap.empty)
            return summary;
        const notifications = queuedSnap.docs.map((d) => (Object.assign({ id: d.id }, d.data())));
        summary.total_queued = notifications.length;
        // ── Step 2: Separate CRITICAL — deliver immediately ───────────────────────
        const criticalIds = [];
        const nonCritical = [];
        for (const notif of notifications) {
            if (notif.urgency === "CRITICAL") {
                criticalIds.push(notif.id);
                await deliverNotification(notif, db);
                summary.critical_delivered_immediately++;
            }
            else {
                nonCritical.push(notif);
            }
        }
        // Mark CRITICAL as delivered in batch
        if (criticalIds.length > 0) {
            const batch = db.batch();
            for (const id of criticalIds) {
                batch.update(db.collection("notification_queue").doc(id), {
                    status: "delivered",
                    delivered_at: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            try {
                await batch.commit();
            }
            catch ( /* non-fatal */_c) { /* non-fatal */ }
        }
        // ── Step 3: Group non-critical by recipient_id + individual_id ────────────
        const groups = new Map();
        for (const notif of nonCritical) {
            const key = `${notif.recipient_id}__${notif.individual_id}`;
            const existing = (_a = groups.get(key)) !== null && _a !== void 0 ? _a : [];
            existing.push(notif);
            groups.set(key, existing);
        }
        const affectedIndividuals = new Set();
        // ── Step 4: Consolidate or deliver ────────────────────────────────────────
        for (const [, group] of groups) {
            if (group.length === 0)
                continue;
            const first = group[0];
            affectedIndividuals.add(first.individual_id);
            if (group.length === 1) {
                // Deliver as-is
                await deliverNotification(first, db);
                await markDelivered([first.id], db);
                summary.delivered_individual++;
            }
            else {
                // Consolidate using Gemini
                try {
                    const consolidatedId = await consolidateNotifications(group, orgId, db);
                    await markConsolidated(group.map((n) => n.id), consolidatedId, db);
                    summary.delivered_consolidated++;
                }
                catch (err) {
                    // Fallback: deliver each individually
                    console.warn("[NotificationDedup] Consolidation failed, delivering individually:", err);
                    for (const notif of group) {
                        try {
                            await deliverNotification(notif, db);
                            summary.delivered_individual++;
                        }
                        catch ( /* non-fatal */_d) { /* non-fatal */ }
                    }
                    await markDelivered(group.map((n) => n.id), db);
                }
            }
        }
        summary.individuals_affected = affectedIndividuals.size;
    }
    catch (err) {
        console.error("[NotificationDedup] Error during deduplication:", err);
    }
    return summary;
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
async function deliverNotification(notif, db) {
    const urgencyLabel = notif.urgency === "HIGH" ? "HIGH" : notif.urgency === "MEDIUM" ? "MEDIUM" : "LOW";
    const docRef = await db.collection("notifications").add({
        uid: notif.recipient_id,
        organizationId: notif.org_id,
        type: "alert",
        title: `[${urgencyLabel}] ${notif.individual_name} — ${notif.agent} alert`,
        body: notif.message,
        href: `/people/${notif.individual_id}/echart`,
        read: false,
        dismissed: false,
        severity: notif.urgency.toLowerCase(),
        source: "brain_orchestrator",
        agent: notif.agent,
        rule_id: notif.rule_id,
        run_id: notif.run_id,
        individual_id: notif.individual_id,
        individual_name: notif.individual_name,
        recipient_name: notif.recipient_name,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
}
async function consolidateNotifications(group, orgId, db) {
    var _a, _b, _c, _d, _e, _f;
    const first = group[0];
    const indName = first.individual_name;
    // Determine highest urgency
    const urgencyOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const highestUrgency = group.reduce((best, n) => {
        var _a, _b;
        return ((_a = urgencyOrder[n.urgency]) !== null && _a !== void 0 ? _a : 0) > ((_b = urgencyOrder[best.urgency]) !== null && _b !== void 0 ? _b : 0) ? n : best;
    }, first).urgency;
    const issuesList = group
        .map((n, i) => `${i + 1}. [${n.urgency}] Agent: ${n.agent} | Rule: ${n.rule_id}\n   Issue: ${n.message}`)
        .join("\n");
    const prompt = `You are writing a consolidated compliance alert for a supervisor.
Multiple compliance issues were identified for the same individual in this orchestrator run.
Combine them into one clear, actionable notification.

Individual: ${indName}
Issues found:
${issuesList}

Write:
1. Subject line starting with highest urgency found
2. Numbered list of each issue (what was found, which rule, what task was created)
3. Recommended supervisor action
4. Be specific. Plain English. Max 200 words.`;
    const ai = (0, ai_1.getAiClient)();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 512, temperature: 0.2 },
    });
    const consolidatedText = (_f = (_e = (_d = (_c = (_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) !== null && _f !== void 0 ? _f : group.map((n) => n.message).join("\n\n");
    // Write the consolidated notification
    const docRef = await db.collection("notifications").add({
        uid: first.recipient_id,
        organizationId: orgId,
        type: "alert",
        title: `[${highestUrgency}] Consolidated alert: ${indName} (${group.length} issues)`,
        body: consolidatedText,
        href: `/people/${first.individual_id}/echart`,
        read: false,
        dismissed: false,
        severity: highestUrgency.toLowerCase(),
        source: "brain_orchestrator",
        agent: "orchestrator_dedup",
        run_id: first.run_id,
        individual_id: first.individual_id,
        individual_name: indName,
        recipient_name: first.recipient_name,
        consolidated_from_count: group.length,
        consolidated_rule_ids: group.map((n) => n.rule_id),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
}
async function markDelivered(ids, db) {
    const batch = db.batch();
    for (const id of ids) {
        batch.update(db.collection("notification_queue").doc(id), {
            status: "delivered",
            delivered_at: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    try {
        await batch.commit();
    }
    catch ( /* non-fatal */_a) { /* non-fatal */ }
}
async function markConsolidated(ids, consolidatedId, db) {
    const batch = db.batch();
    for (const id of ids) {
        batch.update(db.collection("notification_queue").doc(id), {
            status: "consolidated_into",
            consolidated_notification_id: consolidatedId,
            delivered_at: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    try {
        await batch.commit();
    }
    catch ( /* non-fatal */_a) { /* non-fatal */ }
}
//# sourceMappingURL=notificationDedup.js.map