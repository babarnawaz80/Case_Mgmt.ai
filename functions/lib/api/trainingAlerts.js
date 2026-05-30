"use strict";
// trainingAlerts.ts — Daily check for expiring/expired staff training
// Scheduled Cloud Function + callable seed function
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
exports.seedTrainingData = exports.checkTrainingExpirations = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
// ─── Scheduled: daily at 6 AM ET ─────────────────────────────────────────────
exports.checkTrainingExpirations = (0, scheduler_1.onSchedule)({ schedule: "0 6 * * *", timeZone: "America/New_York", memory: "512MiB", timeoutSeconds: 300 }, async () => {
    var _a, _b, _c, _d, _e;
    const db = admin.firestore();
    const today = new Date();
    const orgsSnap = await db.collection("organizations").limit(50).get();
    for (const orgDoc of orgsSnap.docs) {
        const orgId = orgDoc.id;
        try {
            // Load requirements
            const reqSnap = await db.collection("org_training_requirements")
                .where("organizationId", "==", orgId)
                .where("isActive", "==", true)
                .get();
            if (reqSnap.empty)
                continue;
            // Load active users
            const usersSnap = await db.collection("users")
                .where("organizationId", "==", orgId)
                .limit(200)
                .get();
            for (const userDoc of usersSnap.docs) {
                const user = userDoc.data();
                if (!user || user.status === "inactive")
                    continue;
                // Load user's training records
                const trainingsSnap = await db.collection("staff_trainings")
                    .where("userId", "==", userDoc.id)
                    .get();
                const trainingMap = {};
                for (const t of trainingsSnap.docs) {
                    const d = t.data();
                    const existing = trainingMap[d.trainingTypeName];
                    if (!existing || (d.completionDate > existing.completionDate)) {
                        trainingMap[d.trainingTypeName] = d;
                    }
                }
                for (const reqDoc of reqSnap.docs) {
                    const req = reqDoc.data();
                    if (!((_a = req.requiredForRoles) === null || _a === void 0 ? void 0 : _a.includes(user.role)))
                        continue;
                    const training = trainingMap[req.trainingTypeName];
                    if (!training) {
                        // Never completed — check if past hire window
                        const createdAt = ((_c = (_b = user.createdAt) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b)) || ((_e = (_d = user.activatedAt) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d));
                        if (createdAt) {
                            const daysSince = Math.floor((today.getTime() - createdAt.getTime()) / 86400000);
                            const dueDays = req.dueDaysAfterHire || 30;
                            if (daysSince > dueDays) {
                                await createAlert(db, {
                                    type: "training_never_completed", severity: "critical",
                                    userId: userDoc.id, userName: user.displayName || user.email,
                                    trainingTypeName: req.trainingTypeName,
                                    message: `${req.trainingTypeName} has never been completed. Required within ${dueDays} days of hire.`,
                                    orgId, userRole: user.role,
                                });
                            }
                        }
                    }
                    else if (training.expirationDate) {
                        const expDate = new Date(training.expirationDate);
                        const daysUntil = Math.floor((expDate.getTime() - today.getTime()) / 86400000);
                        const thresholds = req.alertDaysBefore || [60, 30, 14];
                        if (daysUntil < 0) {
                            const daysOverdue = Math.abs(daysUntil);
                            if (daysOverdue === 0 || daysOverdue % 14 === 0) {
                                await createAlert(db, {
                                    type: "training_expired", severity: "critical",
                                    userId: userDoc.id, userName: user.displayName || user.email,
                                    trainingTypeName: req.trainingTypeName,
                                    expirationDate: training.expirationDate,
                                    daysOverdue,
                                    message: `${req.trainingTypeName} expired ${daysOverdue} days ago. Renewal required.`,
                                    orgId, userRole: user.role,
                                });
                            }
                        }
                        else if (thresholds.some(t => daysUntil <= t)) {
                            await createAlert(db, {
                                type: "training_expiring_soon", severity: daysUntil <= 14 ? "warning" : "info",
                                userId: userDoc.id, userName: user.displayName || user.email,
                                trainingTypeName: req.trainingTypeName,
                                expirationDate: training.expirationDate,
                                daysUntilExpiry: daysUntil,
                                message: `${req.trainingTypeName} expires in ${daysUntil} days (${expDate.toLocaleDateString()}).`,
                                orgId, userRole: user.role,
                            });
                        }
                    }
                }
            }
        }
        catch (err) {
            console.warn(`[TrainingAlerts] Error for org ${orgId}:`, err);
        }
    }
});
async function createAlert(db, data) {
    // Prevent duplicates
    const existing = await db.collection("training_alerts")
        .where("userId", "==", data.userId)
        .where("trainingTypeName", "==", data.trainingTypeName)
        .where("type", "==", data.type)
        .where("resolvedAt", "==", null)
        .limit(1)
        .get().catch(() => ({ empty: true }));
    if (!existing.empty)
        return;
    const alertRef = await db.collection("training_alerts").add(Object.assign(Object.assign({}, data), { createdAt: admin.firestore.FieldValue.serverTimestamp(), resolvedAt: null, dismissedAt: null, reminderSentAt: null }));
    // In-app notification for the staff member
    await db.collection("notifications").add({
        uid: data.userId,
        organizationId: data.orgId,
        type: data.type,
        title: data.type === "training_expired"
            ? `Training Overdue: ${data.trainingTypeName}`
            : `Training Expiring: ${data.trainingTypeName}`,
        body: data.message,
        href: `/settings/users/${data.userId}`,
        read: false, dismissed: false,
        severity: data.severity,
        source: "training_alerts",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Task in My Work
    await db.collection("tasks").add({
        title: data.type === "training_expired"
            ? `Renew overdue training: ${data.trainingTypeName}`
            : `Renew training soon: ${data.trainingTypeName}`,
        description: data.message,
        assignedTo: data.userId,
        organizationId: data.orgId,
        priority: data.severity === "critical" ? "high" : "medium",
        status: "open",
        type: "training_renewal",
        source: "training_alert",
        sourceId: alertRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
// ─── Seed training data (callable) ───────────────────────────────────────────
exports.seedTrainingData = (0, https_1.onCall)({ cors: true, memory: "256MiB", timeoutSeconds: 120 }, async (request) => {
    if (!request.auth)
        return { success: false, error: "AUTH_REQUIRED" };
    const db = admin.firestore();
    // Find Kathy user for demo records
    const kathySnap = await db.collection("users")
        .where("email", "==", "kathy@demo.casemanagement.ai")
        .limit(1).get();
    const kathyId = kathySnap.empty ? null : kathySnap.docs[0].id;
    const orgId = kathySnap.empty ? null : kathySnap.docs[0].data().organizationId;
    const seeded = [];
    if (kathyId && orgId) {
        // Seed Indiana org requirements
        const reqExists = await db.collection("org_training_requirements")
            .where("organizationId", "==", orgId)
            .limit(1).get();
        if (reqExists.empty) {
            const reqs = [
                { trainingTypeName: "HIPAA Privacy & Security", recurringFrequencyDays: 365, dueDaysAfterHire: 30 },
                { trainingTypeName: "Mandatory Reporter", recurringFrequencyDays: 365, dueDaysAfterHire: 30 },
                { trainingTypeName: "First Aid / CPR", recurringFrequencyDays: 730, dueDaysAfterHire: 90 },
                { trainingTypeName: "CaseManagement.AI Platform Training", recurringFrequencyDays: null, dueDaysAfterHire: 14 },
                { trainingTypeName: "IDD Waiver Overview", recurringFrequencyDays: null, dueDaysAfterHire: 30 },
            ];
            for (const r of reqs) {
                await db.collection("org_training_requirements").add(Object.assign(Object.assign({ organizationId: orgId }, r), { requiredForRoles: ["case_manager", "supervisor"], alertDaysBefore: [30, 14, 7], isActive: true, createdAt: admin.firestore.FieldValue.serverTimestamp() }));
            }
            seeded.push("org_requirements");
        }
        // Seed Kathy's training records
        const trainExists = await db.collection("staff_trainings")
            .where("userId", "==", kathyId).limit(1).get();
        if (trainExists.empty) {
            const records = [
                {
                    trainingTypeName: "HIPAA Privacy & Security", category: "Compliance", isRequired: true,
                    completionDate: "2026-03-15", expirationDate: "2027-03-15",
                    status: "current", completedBy: "self", verifiedByName: "Admin",
                },
                {
                    trainingTypeName: "First Aid / CPR", category: "Safety", isRequired: true,
                    completionDate: "2024-06-01", expirationDate: "2026-06-01",
                    status: "expiring_soon", completedBy: "external", verifiedByName: "Supervisor",
                },
                {
                    trainingTypeName: "Mandatory Reporter", category: "Legal", isRequired: true,
                    completionDate: "2025-04-10", expirationDate: "2026-04-10",
                    status: "expired", completedBy: "self", verifiedByName: "",
                },
                {
                    trainingTypeName: "CaseManagement.AI Platform Training", category: "Technology", isRequired: true,
                    completionDate: "2026-01-20", expirationDate: null,
                    status: "no_expiration", completedBy: "admin", verifiedByName: "Admin",
                },
                {
                    trainingTypeName: "IDD Waiver Overview", category: "Compliance", isRequired: true,
                    completionDate: "2026-01-20", expirationDate: null,
                    status: "no_expiration", completedBy: "self", verifiedByName: "Admin",
                },
            ];
            for (const r of records) {
                await db.collection("staff_trainings").add(Object.assign(Object.assign({ userId: kathyId, organizationId: orgId }, r), { notes: "", trainingProvider: "", certificateUrl: null, recurringFrequencyDays: null, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
            }
            seeded.push("kathy_training_records");
        }
    }
    return { success: true, seeded };
});
//# sourceMappingURL=trainingAlerts.js.map