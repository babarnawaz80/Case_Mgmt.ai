"use strict";
// migrateIndividualStates.ts
// Step 1: Fix the programs collection — infer state from program NAME.
//         "NJ Case Mgmt" → New Jersey, "Case MGMT Indiana" → Indiana, etc.
// Step 2: Update every individual → individual.state = their program's state.
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
// ─── State detection from text ────────────────────────────────────────────────
// Maps substrings found in program names → canonical state
// Ordered most-specific first so "New Jersey" beats "New"
const NAME_STATE_HINTS = [
    { pattern: /\bNJ\b/i, state: "New Jersey" },
    { pattern: /new\s*jersey/i, state: "New Jersey" },
    { pattern: /\bIN\b(?!dian)/, state: "Indiana" }, // "IN" but not "Individual"
    { pattern: /indiana/i, state: "Indiana" },
    { pattern: /\bOH\b/i, state: "Ohio" },
    { pattern: /\bohio\b/i, state: "Ohio" },
    { pattern: /\bIL\b/i, state: "Illinois" },
    { pattern: /illinois/i, state: "Illinois" },
    { pattern: /\bCA\b/i, state: "California" },
    { pattern: /california/i, state: "California" },
    { pattern: /\bTX\b/i, state: "Texas" },
    { pattern: /\btexas\b/i, state: "Texas" },
    { pattern: /\bMD\b/i, state: "Maryland" },
    { pattern: /maryland/i, state: "Maryland" },
    { pattern: /\bVA\b/i, state: "Virginia" },
    { pattern: /virginia/i, state: "Virginia" },
    { pattern: /\bMN\b/i, state: "Minnesota" },
    { pattern: /minnesota/i, state: "Minnesota" },
    { pattern: /\bGA\b/i, state: "Georgia" },
    { pattern: /\bgeorgia\b/i, state: "Georgia" },
    { pattern: /\bAZ\b/i, state: "Arizona" },
    { pattern: /arizona/i, state: "Arizona" },
    { pattern: /\bCO\b/i, state: "Colorado" },
    { pattern: /colorado/i, state: "Colorado" },
    { pattern: /\bMA\b/i, state: "Massachusetts" },
    { pattern: /massachusetts/i, state: "Massachusetts" },
    { pattern: /\bOR\b/i, state: "Oregon" },
    { pattern: /\boregon\b/i, state: "Oregon" },
    { pattern: /case\s*mgmt/i, state: "Indiana" }, // demo default
    { pattern: /case\s*management/i, state: "Indiana" }, // demo default
];
/** Infer state from a program name string */
function inferStateFromName(name) {
    for (const { pattern, state } of NAME_STATE_HINTS) {
        if (pattern.test(name))
            return state;
    }
    return null;
}
/** Convert abbreviation to full name */
const ABBR_TO_NAME = {
    IN: "Indiana", NJ: "New Jersey", OH: "Ohio", IL: "Illinois",
    CA: "California", TX: "Texas", VA: "Virginia", MD: "Maryland",
    MN: "Minnesota", GA: "Georgia", AZ: "Arizona", CO: "Colorado",
    MA: "Massachusetts", OR: "Oregon", PA: "Pennsylvania",
};
function toFullName(raw) {
    var _a;
    if (!raw || !raw.trim())
        return null;
    const s = raw.trim();
    return (_a = ABBR_TO_NAME[s.toUpperCase()]) !== null && _a !== void 0 ? _a : (s.length > 2 ? s : null);
}
// ─── Migration ────────────────────────────────────────────────────────────────
exports.migrateIndividualStates = (0, https_1.onCall)({ cors: true, memory: "512MiB", timeoutSeconds: 300 }, async (request) => {
    var _a, _b, _c, _d, _e, _f;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be authenticated.");
    const db = admin.firestore();
    // ── Step 1: Fix programs — infer state from program NAME ─────────────────
    // "NJ Case Mgmt" was stored with state:"Indiana". We override by reading
    // the program NAME, which is the ground truth.
    const programsSnap = await db.collection("programs").limit(300).get();
    const programBatch = db.batch();
    let programsFixed = 0;
    // Build corrected map: programId → canonical state (from name, not stored state)
    const programStateMap = {};
    for (const p of programsSnap.docs) {
        const data = p.data();
        const nameInferred = inferStateFromName((_a = data.name) !== null && _a !== void 0 ? _a : "");
        const storedFull = toFullName(data.state);
        // Name-inferred state wins over stored state (fixes "NJ Case Mgmt → Indiana")
        const correct = (_b = nameInferred !== null && nameInferred !== void 0 ? nameInferred : storedFull) !== null && _b !== void 0 ? _b : "Indiana";
        programStateMap[p.id] = correct;
        if (storedFull !== correct) {
            programBatch.update(p.ref, {
                state: correct,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            programsFixed++;
        }
    }
    await programBatch.commit();
    // ── Step 2: Fix individuals — set state from their program ───────────────
    const indsSnap = await db.collection("individuals").limit(500).get();
    const indBatch = db.batch();
    let indFixed = 0;
    let indSkipped = 0;
    for (const d of indsSnap.docs) {
        const data = d.data();
        // Resolve state: programId → corrected program map (exact)
        let correct = null;
        if (data.programId && programStateMap[data.programId]) {
            correct = programStateMap[data.programId];
        }
        // Fallback: match by program name in the map
        if (!correct) {
            const pName = (data.programName || data.program || "").toLowerCase().trim();
            if (pName) {
                for (const p of programsSnap.docs) {
                    if (((_c = p.data().name) !== null && _c !== void 0 ? _c : "").toLowerCase().trim() === pName) {
                        correct = (_d = programStateMap[p.id]) !== null && _d !== void 0 ? _d : null;
                        break;
                    }
                }
            }
        }
        // Fallback: infer from the program name stored on the individual
        if (!correct) {
            correct = inferStateFromName(data.programName || data.program || "");
        }
        // Last resort: Indiana
        if (!correct)
            correct = "Indiana";
        // Write only if different from what's currently stored
        const current = (_f = (_e = toFullName(data.state)) !== null && _e !== void 0 ? _e : data.state) !== null && _f !== void 0 ? _f : "";
        if (current === correct) {
            indSkipped++;
            continue;
        }
        indBatch.update(d.ref, {
            state: correct,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        indFixed++;
    }
    await indBatch.commit();
    // ── Step 3: Seed service_authorizations if missing ───────────────────────
    const authSeeded = await seedServiceAuthorizationsIfNeeded(db);
    return {
        success: true,
        programsFixed,
        individualsFixed: indFixed,
        individualsSkipped: indSkipped,
        authorizationsSeeded: authSeeded,
    };
});
// ─── Seed service_authorizations (once) ──────────────────────────────────────
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
            service_name: t.service_name,
            auth_number: `AUTH-2026-${100 + i}`,
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