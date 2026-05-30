"use strict";
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
exports.sendVisitReminders = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const db = admin.firestore;
const REMINDER_OFFSETS = {
    "1h": 60,
    "2h": 120,
    "1d": 1440,
    "2d": 2880,
};
exports.sendVisitReminders = (0, scheduler_1.onSchedule)({
    schedule: "every 60 minutes",
    region: "us-central1",
    timeoutSeconds: 120,
    memory: "256MiB",
}, async (_event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
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
            const visitDate = (_a = data.visit_date) !== null && _a !== void 0 ? _a : ""; // "YYYY-MM-DD"
            const startTime = (_b = data.start_time) !== null && _b !== void 0 ? _b : ""; // "HH:mm"
            const reminderTiming = (_c = data.reminder_timing) !== null && _c !== void 0 ? _c : "1h";
            const offsetMinutes = (_d = REMINDER_OFFSETS[reminderTiming]) !== null && _d !== void 0 ? _d : 60;
            if (!visitDate || !startTime) {
                skipped++;
                continue;
            }
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
            const assignedTo = (_e = data.assigned_to) !== null && _e !== void 0 ? _e : "";
            const individualName = (_f = data.individual_name) !== null && _f !== void 0 ? _f : "Individual";
            const visitType = (_g = data.visit_type) !== null && _g !== void 0 ? _g : "Visit";
            const location = (_h = data.location) !== null && _h !== void 0 ? _h : "";
            const fmt12 = (t) => {
                const [hh, mm] = t.split(":").map(Number);
                const ampm = hh >= 12 ? "PM" : "AM";
                return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${ampm}`;
            };
            const notifMessage = `Upcoming visit reminder: ${individualName} — ${visitType} — starts at ${fmt12(startTime)}${location ? ` — ${location}` : ""}`;
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
                }
                catch (notifErr) {
                    console.error(`[visitReminders] Failed to write notification for ${docSnap.id}:`, notifErr);
                }
            }
            // Mark reminder as sent regardless (avoid re-firing)
            try {
                await docSnap.ref.update({
                    reminder_sent: true,
                    reminder_sent_at: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            catch (updateErr) {
                console.error(`[visitReminders] Failed to update reminder_sent for ${docSnap.id}:`, updateErr);
            }
        }
        console.log(`[visitReminders] Done. Sent: ${sent}, Skipped: ${skipped}`);
    }
    catch (err) {
        console.error("[visitReminders] Unhandled error:", err);
    }
});
//# sourceMappingURL=visitReminders.js.map