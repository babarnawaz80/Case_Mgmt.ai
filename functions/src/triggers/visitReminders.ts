/**
 * visitReminders — Hourly scheduled Cloud Function
 * ─────────────────────────────────────────────────────────────────────────────
 * Queries scheduled_visits where:
 *   • status == "scheduled"
 *   • reminder == true
 *   • reminder_sent == false
 *
 * For any visit whose reminder window is within the next 60 minutes:
 *   • Creates a notification in the assigned staff member's notifications
 *   • Sets reminder_sent = true on the record
 *
 * Reminder timing offsets (minutes before visit):
 *   1h  → 60 min
 *   2h  → 120 min
 *   1d  → 1440 min
 *   2d  → 2880 min
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";

const db = admin.firestore;

const REMINDER_OFFSETS: Record<string, number> = {
  "1h":  60,
  "2h":  120,
  "1d":  1440,
  "2d":  2880,
};

export const sendVisitReminders = onSchedule(
  {
    schedule: "every 60 minutes",
    region: "us-central1",
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (_event) => {
    const firestore = db();
    const now = new Date();

    try {
      // Fetch all pending-reminder scheduled visits
      const snap = await firestore
        .collection("scheduled_visits")
        .where("status", "==", "scheduled")
        .where("reminder", "==", true)
        .where("reminder_sent", "==", false)
        .get();

      if (snap.empty) {
        console.log("[visitReminders] No pending reminders.");
        return;
      }

      let sent = 0;
      let skipped = 0;

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const visitDate: string = data.visit_date ?? "";   // "YYYY-MM-DD"
        const startTime: string = data.start_time ?? "";   // "HH:mm"
        const reminderTiming: string = data.reminder_timing ?? "1h";
        const offsetMinutes: number = REMINDER_OFFSETS[reminderTiming] ?? 60;

        if (!visitDate || !startTime) { skipped++; continue; }

        // Build visit start as a Date
        const [y, mo, d] = visitDate.split("-").map(Number);
        const [h, m] = startTime.split(":").map(Number);
        const visitStart = new Date(y, mo - 1, d, h, m, 0);

        // Reminder fires at: visitStart - offsetMinutes
        const reminderAt = new Date(visitStart.getTime() - offsetMinutes * 60 * 1000);

        // Send if reminderAt is in the past 60 minutes (i.e., within our check window)
        const windowStart = new Date(now.getTime() - 60 * 60 * 1000);
        if (reminderAt < windowStart || reminderAt > now) {
          skipped++;
          continue;
        }

        // ── Create inbox notification for assigned staff ─────────────────────
        const assignedTo: string = data.assigned_to ?? "";
        const individualName: string = data.individual_name ?? "Individual";
        const visitType: string = data.visit_type ?? "Visit";
        const location: string = data.location ?? "";

        const fmt12 = (t: string) => {
          const [hh, mm] = t.split(":").map(Number);
          const ampm = hh >= 12 ? "PM" : "AM";
          return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${ampm}`;
        };

        const notifMessage =
          `Upcoming visit reminder: ${individualName} — ${visitType} — starts at ${fmt12(startTime)}${location ? ` — ${location}` : ""}`;

        if (assignedTo) {
          try {
            await firestore.collection("notifications").add({
              uid: assignedTo,
              user_id: assignedTo,
              type: "visit_reminder",
              title: "Upcoming Visit Reminder",
              message: notifMessage,
              individual_name: individualName,
              visit_type: visitType,
              visit_date: visitDate,
              start_time: startTime,
              location,
              scheduled_visit_id: docSnap.id,
              read: false,
              created_at: admin.firestore.FieldValue.serverTimestamp(),
            });
            sent++;
          } catch (notifErr) {
            console.error(`[visitReminders] Failed to write notification for ${docSnap.id}:`, notifErr);
          }
        }

        // Mark reminder as sent regardless (avoid re-firing)
        try {
          await docSnap.ref.update({
            reminder_sent: true,
            reminder_sent_at: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (updateErr) {
          console.error(`[visitReminders] Failed to update reminder_sent for ${docSnap.id}:`, updateErr);
        }
      }

      console.log(`[visitReminders] Done. Sent: ${sent}, Skipped: ${skipped}`);
    } catch (err) {
      console.error("[visitReminders] Unhandled error:", err);
    }
  }
);
