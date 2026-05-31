// Pre-Filters — Brain Orchestrator
// Fast, cheap Firestore checks that gate whether a full LLM agent call is needed.
// Each function returns { passes: boolean; reason: string }.

import * as admin from "firebase-admin";
import { IndividualRecord, PreFilterResult } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr?: string): number {
  if (!dateStr) return 9999;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(dateStr?: string): number {
  if (!dateStr) return 9999;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── 1. Compliance Pre-Filter ─────────────────────────────────────────────────
// PASSES if ANY of:
//   a) Last face-to-face contact was > 23 days ago (approaching 30-day window)
//   b) Has an open compliance flag with status = "open"
//   c) Has a monitoring form due within the next 14 days
//   d) Has no monitoring form submitted in the last 85 days

export async function preFilterCompliance(
  individual: IndividualRecord,
  db: admin.firestore.Firestore
): Promise<PreFilterResult> {
  try {
    // (a) Last face-to-face contact > 23 days ago
    const lastVisitDays = daysSince(individual.last_visit_date);
    if (lastVisitDays > 23) {
      return {
        passes: true,
        reason: `Last face-to-face contact was ${lastVisitDays} days ago (threshold: 23 days)`,
      };
    }

    // (b) Open compliance flag
    try {
      const flagSnap = await db
        .collection("compliance_flags")
        .where("individualId", "==", individual.id)
        .where("status", "==", "open")
        .limit(1)
        .get();
      if (!flagSnap.empty) {
        return { passes: true, reason: "Has open compliance flag(s)" };
      }
    } catch {
      // Index may not exist — continue
    }

    // (c) Monitoring form due within next 14 days
    const lastMonDays = daysSince(individual.last_monitoring_form_date);
    // Standard monitoring cycle is 90 days; flag if within 14 days of next due
    if (lastMonDays !== 9999 && lastMonDays >= 76) {
      const daysUntilMonitoring = 90 - lastMonDays;
      return {
        passes: true,
        reason: `Monitoring form due in ${daysUntilMonitoring} day(s) (last submitted ${lastMonDays} days ago)`,
      };
    }

    // (d) No monitoring form in last 85 days
    if (lastMonDays > 85) {
      return {
        passes: true,
        reason: `No monitoring form in ${lastMonDays} days (threshold: 85 days)`,
      };
    }

    return { passes: false, reason: "No compliance signals detected — skipping agent" };
  } catch (err) {
    // On error, pass through to be safe
    return { passes: true, reason: `Pre-filter error — running agent: ${(err as Error).message}` };
  }
}

// ─── 2. Documentation Pre-Filter ─────────────────────────────────────────────
// PASSES if ANY of:
//   a) Has a progress note in "pending_review" status older than 48 hours
//   b) Has a contact note submitted but not countersigned by supervisor
//   c) Has a visit summary marked as draft for more than 24 hours

export async function preFilterDocumentation(
  individual: IndividualRecord,
  db: admin.firestore.Firestore
): Promise<PreFilterResult> {
  try {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // (a) Progress note in pending_review older than 48 hours
    try {
      const progressSnap = await db
        .collection("progress_notes")
        .where("individualId", "==", individual.id)
        .where("status", "==", "pending_review")
        .limit(10)
        .get();

      const oldPending = progressSnap.docs.filter((d) => {
        const data = d.data();
        const created = data.createdAt?.toDate?.() ?? data.created_at?.toDate?.();
        return created && created < fortyEightHoursAgo;
      });

      if (oldPending.length > 0) {
        return {
          passes: true,
          reason: `${oldPending.length} progress note(s) in pending_review status for more than 48 hours`,
        };
      }
    } catch {
      // Non-fatal
    }

    // (b) Contact note submitted but not countersigned
    try {
      const contactSnap = await db
        .collection("contact_notes")
        .where("individualId", "==", individual.id)
        .where("status", "==", "submitted")
        .limit(5)
        .get();

      const unsigned = contactSnap.docs.filter((d) => {
        const data = d.data();
        return !data.supervisor_signed && !data.countersigned_at;
      });

      if (unsigned.length > 0) {
        return {
          passes: true,
          reason: `${unsigned.length} contact note(s) submitted but not countersigned by supervisor`,
        };
      }
    } catch {
      // Non-fatal
    }

    // (c) Visit summary draft older than 24 hours
    try {
      const visitSnap = await db
        .collection("visit_summaries")
        .where("individualId", "==", individual.id)
        .where("status", "==", "draft")
        .limit(10)
        .get();

      const oldDraft = visitSnap.docs.filter((d) => {
        const data = d.data();
        const created = data.createdAt?.toDate?.() ?? data.created_at?.toDate?.();
        return created && created < twentyFourHoursAgo;
      });

      if (oldDraft.length > 0) {
        return {
          passes: true,
          reason: `${oldDraft.length} visit summary draft(s) older than 24 hours`,
        };
      }
    } catch {
      // Non-fatal
    }

    return { passes: false, reason: "No documentation signals detected — skipping agent" };
  } catch (err) {
    return { passes: true, reason: `Pre-filter error — running agent: ${(err as Error).message}` };
  }
}

// ─── 3. Billing Pre-Filter ────────────────────────────────────────────────────
// PASSES if ANY of:
//   a) Has a service authorization expiring within 90 days
//   b) Has a service authorization already expired
//   c) Has units consumed >= 85% of authorized units for any active authorization
//   d) Has a billable note in "pending_billing" status older than 7 days

export async function preFilterBilling(
  individual: IndividualRecord,
  db: admin.firestore.Firestore
): Promise<PreFilterResult> {
  try {
    const now = new Date();
    const nowStr = now.toISOString().split("T")[0]!;
    const in90Str = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // (a) & (b) Service authorization expiring within 90 days or already expired
    try {
      const authSnap = await db
        .collection("service_authorizations")
        .where("individualId", "==", individual.id)
        .where("status", "in", ["active", "Active"])
        .get();

      for (const doc of authSnap.docs) {
        const auth = doc.data();
        const endDate = auth.end_date ?? auth.expiration_date ?? auth.expirationDate;
        if (!endDate) continue;

        if (endDate < nowStr) {
          return {
            passes: true,
            reason: `Service authorization ${auth.auth_number ?? doc.id} expired on ${endDate}`,
          };
        }
        if (endDate <= in90Str) {
          return {
            passes: true,
            reason: `Service authorization ${auth.auth_number ?? doc.id} expires on ${endDate} (within 90 days)`,
          };
        }

        // (c) Units >= 85%
        const unitsAuth = auth.units_authorized ?? auth.authorizedUnits ?? 0;
        const unitsUsed = auth.units_used ?? auth.unitsUsed ?? 0;
        if (unitsAuth > 0 && unitsUsed / unitsAuth >= 0.85) {
          const pct = Math.round((unitsUsed / unitsAuth) * 100);
          return {
            passes: true,
            reason: `Service authorization ${auth.auth_number ?? doc.id} is ${pct}% consumed (threshold: 85%)`,
          };
        }
      }
    } catch {
      // Non-fatal
    }

    // (d) Billable note in pending_billing older than 7 days
    try {
      const billableSnap = await db
        .collection("progress_notes")
        .where("individualId", "==", individual.id)
        .where("status", "==", "pending_billing")
        .limit(10)
        .get();

      const old = billableSnap.docs.filter((d) => {
        const data = d.data();
        const created = data.createdAt?.toDate?.() ?? data.created_at?.toDate?.();
        return created && created < sevenDaysAgo;
      });

      if (old.length > 0) {
        return {
          passes: true,
          reason: `${old.length} billable note(s) in pending_billing status for more than 7 days`,
        };
      }
    } catch {
      // Non-fatal
    }

    return { passes: false, reason: "No billing signals detected — skipping agent" };
  } catch (err) {
    return { passes: true, reason: `Pre-filter error — running agent: ${(err as Error).message}` };
  }
}

// ─── 4. Escalation Pre-Filter ─────────────────────────────────────────────────
// PASSES if ANY of:
//   a) Has an open incident report with no follow-up note in the past 5 days
//   b) Has a compliance flag with severity "HIGH" or "CRITICAL" older than 48 hours
//   c) Has a task with urgency = "CRITICAL" still open

export async function preFilterEscalation(
  individual: IndividualRecord,
  db: admin.firestore.Firestore
): Promise<PreFilterResult> {
  try {
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // (a) Open incident report with no follow-up in past 5 days
    try {
      const incidentSnap = await db
        .collection("incidents")
        .where("individualId", "==", individual.id)
        .where("status", "==", "open")
        .limit(10)
        .get();

      for (const doc of incidentSnap.docs) {
        const data = doc.data();
        const lastFollowUp = data.last_follow_up_at?.toDate?.() ?? data.lastFollowUpAt?.toDate?.();
        const created = data.createdAt?.toDate?.() ?? data.created_at?.toDate?.();
        if (!lastFollowUp && created && created < fiveDaysAgo) {
          return {
            passes: true,
            reason: `Open incident ${doc.id} has no follow-up note and was reported more than 5 days ago`,
          };
        }
        if (lastFollowUp && lastFollowUp < fiveDaysAgo) {
          return {
            passes: true,
            reason: `Open incident ${doc.id} has no follow-up note in the past 5 days`,
          };
        }
      }
    } catch {
      // Non-fatal
    }

    // (b) Compliance flag with HIGH or CRITICAL severity older than 48 hours
    try {
      const flagSnap = await db
        .collection("compliance_flags")
        .where("individualId", "==", individual.id)
        .where("status", "==", "open")
        .where("severity", "in", ["HIGH", "CRITICAL"])
        .limit(5)
        .get();

      for (const doc of flagSnap.docs) {
        const data = doc.data();
        const created = data.createdAt?.toDate?.() ?? data.created_at?.toDate?.();
        if (created && created < fortyEightHoursAgo) {
          return {
            passes: true,
            reason: `Open ${data.severity} compliance flag older than 48 hours (flag: ${doc.id})`,
          };
        }
      }
    } catch {
      // Non-fatal
    }

    // (c) Task with urgency/priority CRITICAL still open
    try {
      const taskSnap = await db
        .collection("tasks")
        .where("individualId", "==", individual.id)
        .where("status", "==", "open")
        .where("priority", "==", "critical")
        .limit(1)
        .get();

      if (!taskSnap.empty) {
        return {
          passes: true,
          reason: `Has ${taskSnap.size} open CRITICAL priority task(s)`,
        };
      }
    } catch {
      // Non-fatal
    }

    return { passes: false, reason: "No escalation signals detected — skipping agent" };
  } catch (err) {
    return { passes: true, reason: `Pre-filter error — running agent: ${(err as Error).message}` };
  }
}

// ─── 5. Renewal Pre-Filter ────────────────────────────────────────────────────
// PASSES if ANY of:
//   a) Has a care plan / ISP with annual renewal due within 90 days
//   b) Has a care plan / ISP with renewal date already passed
//   c) Has a Medicaid eligibility record with redetermination date within 60 days

export async function preFilterRenewal(
  individual: IndividualRecord,
  db: admin.firestore.Firestore
): Promise<PreFilterResult> {
  try {
    // (a) & (b) Care plan / ISP renewal
    const pcpDue = individual.pcp_due_date ?? individual.isp_due_date;
    if (pcpDue) {
      const daysLeft = daysUntil(pcpDue);
      if (daysLeft < 0) {
        return {
          passes: true,
          reason: `Care plan/ISP renewal was due on ${pcpDue} (${Math.abs(daysLeft)} days overdue)`,
        };
      }
      if (daysLeft <= 90) {
        return {
          passes: true,
          reason: `Care plan/ISP renewal due on ${pcpDue} (${daysLeft} days away, threshold: 90 days)`,
        };
      }
    }

    // (c) Medicaid redetermination within 60 days
    if (individual.ma_redetermination_date) {
      const daysLeft = daysUntil(individual.ma_redetermination_date);
      if (daysLeft <= 60) {
        return {
          passes: true,
          reason: `Medicaid redetermination due on ${individual.ma_redetermination_date} (${daysLeft} days away, threshold: 60 days)`,
        };
      }
    }

    return { passes: false, reason: "No renewal signals detected — skipping agent" };
  } catch (err) {
    return { passes: true, reason: `Pre-filter error — running agent: ${(err as Error).message}` };
  }
}
