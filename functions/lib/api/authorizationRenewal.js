"use strict";
/**
 * Authorization Renewal — Daily Cloud Function
 * Runs every morning at 6 AM ET (10:00 UTC).
 * Queries all active service_authorizations expiring within 30 days.
 * Creates renewal tasks in workflow_tasks if one doesn't exist yet.
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
exports.dailyAuthRenewalCheck = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
exports.dailyAuthRenewalCheck = (0, scheduler_1.onSchedule)({
    schedule: "0 10 * * *", // 6 AM ET (UTC-4) / 10 AM UTC
    timeZone: "America/New_York",
}, async (_event) => {
    const db = admin.firestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30 = new Date(today);
    in30.setDate(today.getDate() + 30);
    const in30Str = in30.toISOString().split("T")[0];
    console.log(`[AuthRenewal] Checking authorizations expiring before ${in30Str}`);
    // Query active auths expiring within 30 days
    const authsSnap = await db
        .collection("service_authorizations")
        .where("status", "==", "active")
        .where("end_date", "<=", in30Str)
        .get();
    console.log(`[AuthRenewal] Found ${authsSnap.size} auths expiring within 30 days`);
    let created = 0;
    let skipped = 0;
    for (const authDoc of authsSnap.docs) {
        const auth = authDoc.data();
        const authId = authDoc.id;
        const daysLeft = Math.ceil((new Date(auth.end_date + "T00:00:00").getTime() - today.getTime()) / 86400000);
        // Check if renewal task already exists
        const existingSnap = await db
            .collection("workflow_tasks")
            .where("source_auth_id", "==", authId)
            .where("type", "==", "authorization_renewal")
            .where("status", "in", ["open", "in_progress"])
            .limit(1)
            .get();
        if (!existingSnap.empty) {
            skipped++;
            continue;
        }
        // Compute due date = end_date - 14 days
        const endDate = new Date(auth.end_date + "T00:00:00");
        const dueDate = new Date(endDate);
        dueDate.setDate(endDate.getDate() - 14);
        const dueDateStr = dueDate.toISOString().split("T")[0];
        // Priority: critical if <7 days, high otherwise
        const priority = daysLeft <= 7 ? "critical" : "high";
        await db.collection("workflow_tasks").add({
            title: `Renew authorization ${auth.auth_number} — ${auth.service_name}`,
            description: `Service authorization #${auth.auth_number} for ${auth.individualName} (${auth.service_name}) expires on ${auth.end_date}. Initiate renewal process.`,
            individualId: auth.individualId || auth.individual_id,
            individual_id: auth.individual_id || auth.individualId,
            individualName: auth.individualName,
            organizationId: auth.organizationId,
            assigned_to_uid: auth.assigned_case_manager_id || null,
            assigned_to_name: auth.assigned_case_manager_name || null,
            due_date: dueDateStr,
            priority,
            status: "open",
            type: "authorization_renewal",
            source: "ai_generated",
            source_auth_id: authId,
            auth_number: auth.auth_number,
            auth_end_date: auth.end_date,
            days_until_expiry: daysLeft,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        created++;
        console.log(`[AuthRenewal] Created ${priority} renewal task for auth ${auth.auth_number} (${auth.individualName}, expires ${auth.end_date})`);
    }
    console.log(`[AuthRenewal] Done. Created: ${created}, Skipped (already exist): ${skipped}`);
});
//# sourceMappingURL=authorizationRenewal.js.map