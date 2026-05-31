"use strict";
// migrateIndividualStates.ts
// Callable migration — sets individual.state from the PROGRAM the individual
// is enrolled in (programs collection → state field).
//
// This is safe to run multiple times (always overwrites).
// "Seed Demo Data" button on the Orchestrator page calls this.
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
exports.migrateIndividualStates = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
// Full-name canonicalization (IN → Indiana, NJ → New Jersey, etc.)
const ABBR_TO_NAME = {
    IN: "Indiana", NJ: "New Jersey", OH: "Ohio",
    IL: "Illinois", CA: "California", TX: "Texas",
    VA: "Virginia", MD: "Maryland", MN: "Minnesota",
    GA: "Georgia", AZ: "Arizona", CO: "Colorado",
    MA: "Massachusetts", OR: "Oregon", PA: "Pennsylvania",
    MI: "Michigan", FL: "Florida", NY: "New York",
    NC: "North Carolina", WA: "Washington",
};
function toFullName(raw) {
    var _a, _b;
    if (!raw || !raw.trim())
        return null;
    const s = raw.trim();
    return (_b = (_a = ABBR_TO_NAME[s.toUpperCase()]) !== null && _a !== void 0 ? _a : ABBR_TO_NAME[s]) !== null && _b !== void 0 ? _b : (s.length > 2 ? s : null);
}
exports.migrateIndividualStates = (0, https_1.onCall)({ cors: true, memory: "512MiB", timeoutSeconds: 300 }, async (request) => {
    var _a, _b;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be authenticated.");
    const db = admin.firestore();
    let fixed = 0;
    let alreadyCorrect = 0;
    // ── Step 1: Load ALL programs → build { id → fullNameState } ─────────────
    const programsSnap = await db.collection("programs").limit(300).get();
    // Map programId → canonical state name
    const programStateMap = {};
    // Also map programName (lowercase) → canonical state, as a name-based fallback
    const programNameStateMap = {};
    for (const p of programsSnap.docs) {
        const d = p.data();
        const pState = toFullName(d.state);
        if (!pState)
            continue;
        programStateMap[p.id] = pState;
        if (d.name) {
            programNameStateMap[d.name.toLowerCase().trim()] = pState;
        }
    }
    // ── Step 2: Update every individual with the program's state ─────────────
    const indsSnap = await db.collection("individuals").limit(500).get();
    const batches = [db.batch()];
    let writeCount = 0;
    for (const d of indsSnap.docs) {
        const data = d.data();
        // ── Resolve the correct state from program ──────────────────────────
        let correctState = null;
        // 1. programId → programs collection (most reliable)
        if (data.programId && programStateMap[data.programId]) {
            correctState = programStateMap[data.programId];
        }
        // 2. programName → programs collection (name match)
        if (!correctState) {
            const pName = (data.programName || data.program || "").toLowerCase().trim();
            if (pName && programNameStateMap[pName]) {
                correctState = programNameStateMap[pName];
            }
        }
        // 3. Partial name match (e.g. "Case MGMT" in "Case MGMT - Region 3")
        if (!correctState) {
            const pName = (data.programName || data.program || "").toLowerCase().trim();
            if (pName) {
                for (const [name, state] of Object.entries(programNameStateMap)) {
                    if (pName.includes(name) || name.includes(pName)) {
                        correctState = state;
                        break;
                    }
                }
            }
        }
        // 4. enrollment_state / enrollmentState field on the individual
        if (!correctState) {
            correctState = toFullName(data.enrollment_state || data.enrollmentState);
        }
        // 5. Last resort: Indiana (demo default)
        if (!correctState) {
            correctState = "Indiana";
        }
        // ── Write only if different ───────────────────────────────────────
        const current = (_b = (_a = toFullName(data.state)) !== null && _a !== void 0 ? _a : data.state) !== null && _b !== void 0 ? _b : "";
        if (current === correctState) {
            alreadyCorrect++;
            continue;
        }
        if (writeCount > 0 && writeCount % 490 === 0) {
            batches.push(db.batch());
        }
        batches[batches.length - 1].update(d.ref, {
            state: correctState,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        writeCount++;
        fixed++;
    }
    for (const b of batches)
        await b.commit();
    // ── Step 3: Seed service_authorizations if not yet done ───────────────────
    const authSeeded = await seedServiceAuthorizationsIfNeeded(db);
    return {
        success: true,
        individualsFixed: fixed,
        individualsAlreadyCorrect: alreadyCorrect,
        authorizationsSeeded: authSeeded,
        programsLoaded: programsSnap.size,
    };
});
async function seedServiceAuthorizationsIfNeeded(db) {
    const existing = await db.collection("service_authorizations")
        .where("_seededByMigration", "==", true).limit(1).get();
    if (!existing.empty)
        return 0;
    const inds = await db.collection("individuals")
        .where("enrollment_status", "==", "active").limit(6).get();
    if (inds.empty)
        return 0;
    const today = new Date();
    const add = (d, n) => new Date(d.getTime() + n * 86400000);
    const fmt = (d) => d.toISOString().slice(0, 10);
    const templates = [
        { service_name: "Community Integration & Habilitation", units_authorized: 200, units_used: 120, daysOffset: 75 },
        { service_name: "Day Services / Day Habilitation", units_authorized: 180, units_used: 90, daysOffset: 25 },
        { service_name: "Supported Employment", units_authorized: 150, units_used: 140, daysOffset: 12 },
        { service_name: "Residential Support", units_authorized: 365, units_used: 200, daysOffset: 120 },
        { service_name: "Behavioral Support", units_authorized: 100, units_used: 105, daysOffset: -5 },
        { service_name: "Transportation", units_authorized: 80, units_used: 20, daysOffset: 90 },
    ];
    const batch = db.batch();
    inds.docs.forEach((doc, i) => {
        const ind = doc.data();
        const orgId = ind.organizationId || ind.tenantId;
        const t = templates[i % templates.length];
        const ref = db.collection("service_authorizations").doc();
        batch.set(ref, {
            individualId: doc.id,
            individualName: `${ind.first_name || ""} ${ind.last_name || ""}`.trim(),
            organizationId: orgId, tenantId: orgId,
            service_name: t.service_name, auth_number: `AUTH-2026-${100 + i}`,
            status: "active",
            start_date: fmt(add(today, -180)), end_date: fmt(add(today, t.daysOffset)),
            startDate: fmt(add(today, -180)), endDate: fmt(add(today, t.daysOffset)),
            units_authorized: t.units_authorized, units_used: t.units_used,
            authorizedUnits: t.units_authorized, unitsUsed: t.units_used,
            funding_source: "Medicaid HCBS Waiver",
            _seededByMigration: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    await batch.commit();
    return inds.size;
}
//# sourceMappingURL=migrateIndividualStates.js.map