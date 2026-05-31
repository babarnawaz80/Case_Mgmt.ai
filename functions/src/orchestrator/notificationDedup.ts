// Notification Deduplication — Brain Orchestrator
// Collects queued notifications from a run, separates CRITICAL (immediate),
// groups remaining by recipient+individual, and consolidates duplicates via Gemini.

import * as admin from "firebase-admin";
import { getAiClient } from "../services/ai";
import { NotificationDedupSummary, QueuedNotification } from "./types";

export async function runNotificationDeduplication(
  runId: string,
  orgId: string,
  db: admin.firestore.Firestore
): Promise<NotificationDedupSummary> {
  const summary: NotificationDedupSummary = {
    total_queued: 0,
    critical_delivered_immediately: 0,
    delivered_individual: 0,
    delivered_consolidated: 0,
    individuals_affected: 0,
  };

  try {
    // ── Step 1: Collect queued notifications for this run ─────────────────────
    let queuedSnap: admin.firestore.QuerySnapshot;
    try {
      queuedSnap = await db
        .collection("notification_queue")
        .where("run_id", "==", runId)
        .where("status", "==", "queued")
        .get();
    } catch {
      // Non-fatal if collection doesn't exist yet
      return summary;
    }

    if (queuedSnap.empty) return summary;

    const notifications: QueuedNotification[] = queuedSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<QueuedNotification, "id">),
    }));
    summary.total_queued = notifications.length;

    // ── Step 2: Separate CRITICAL — deliver immediately ───────────────────────
    const criticalIds: string[] = [];
    const nonCritical: QueuedNotification[] = [];

    for (const notif of notifications) {
      if (notif.urgency === "CRITICAL") {
        criticalIds.push(notif.id);
        await deliverNotification(notif, db);
        summary.critical_delivered_immediately++;
      } else {
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
      try { await batch.commit(); } catch { /* non-fatal */ }
    }

    // ── Step 3: Group non-critical by recipient_id + individual_id ────────────
    const groups = new Map<string, QueuedNotification[]>();
    for (const notif of nonCritical) {
      const key = `${notif.recipient_id}__${notif.individual_id}`;
      const existing = groups.get(key) ?? [];
      existing.push(notif);
      groups.set(key, existing);
    }

    const affectedIndividuals = new Set<string>();

    // ── Step 4: Consolidate or deliver ────────────────────────────────────────
    for (const [, group] of groups) {
      if (group.length === 0) continue;

      const first = group[0]!;
      affectedIndividuals.add(first.individual_id);

      if (group.length === 1) {
        // Deliver as-is
        await deliverNotification(first, db);
        await markDelivered([first.id], db);
        summary.delivered_individual++;
      } else {
        // Consolidate using Gemini
        try {
          const consolidatedId = await consolidateNotifications(group, orgId, db);
          await markConsolidated(
            group.map((n) => n.id),
            consolidatedId,
            db
          );
          summary.delivered_consolidated++;
        } catch (err) {
          // Fallback: deliver each individually
          console.warn("[NotificationDedup] Consolidation failed, delivering individually:", err);
          for (const notif of group) {
            try {
              await deliverNotification(notif, db);
              summary.delivered_individual++;
            } catch { /* non-fatal */ }
          }
          await markDelivered(group.map((n) => n.id), db);
        }
      }
    }

    summary.individuals_affected = affectedIndividuals.size;
  } catch (err) {
    console.error("[NotificationDedup] Error during deduplication:", err);
  }

  return summary;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function deliverNotification(
  notif: QueuedNotification,
  db: admin.firestore.Firestore
): Promise<string> {
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

async function consolidateNotifications(
  group: QueuedNotification[],
  orgId: string,
  db: admin.firestore.Firestore
): Promise<string> {
  const first = group[0]!;
  const indName = first.individual_name;

  // Determine highest urgency
  const urgencyOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const highestUrgency = group.reduce((best, n) => {
    return (urgencyOrder[n.urgency] ?? 0) > (urgencyOrder[best.urgency] ?? 0) ? n : best;
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

  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 512, temperature: 0.2 },
  });

  const consolidatedText =
    response.candidates?.[0]?.content?.parts?.[0]?.text ??
    group.map((n) => n.message).join("\n\n");

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

async function markDelivered(ids: string[], db: admin.firestore.Firestore): Promise<void> {
  const batch = db.batch();
  for (const id of ids) {
    batch.update(db.collection("notification_queue").doc(id), {
      status: "delivered",
      delivered_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  try { await batch.commit(); } catch { /* non-fatal */ }
}

async function markConsolidated(
  ids: string[],
  consolidatedId: string,
  db: admin.firestore.Firestore
): Promise<void> {
  const batch = db.batch();
  for (const id of ids) {
    batch.update(db.collection("notification_queue").doc(id), {
      status: "consolidated_into",
      consolidated_notification_id: consolidatedId,
      delivered_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  try { await batch.commit(); } catch { /* non-fatal */ }
}
