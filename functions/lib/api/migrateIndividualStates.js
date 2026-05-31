"use strict";
// migrateIndividualStates.ts
// One-time callable to:
// 1. Assign address_state to all demo individuals that have null/missing state
// 2. Seed realistic service_authorizations for demo individuals
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
// ─── State assignment for known demo individuals ───────────────────────────────
// County → State map used as fallback when county is known
const COUNTY_STATE_MAP = {
    "Carroll County": "Indiana",
    "Hamilton County": "Indiana",
    "Marion County": "Indiana",
    "Johnson County": "Indiana",
    "Hendricks County": "Indiana",
    "Boone County": "Indiana",
    "Tippecanoe County": "Indiana",
    "Allen County": "Indiana",
    "Dallas County": "Indiana",
    "Franklin County": "Indiana",
    "Bremer County": "Indiana",
    "Essex County": "New Jersey",
    "Hudson County": "New Jersey",
    "Bergen County": "New Jersey",
    "Camden County": "New Jersey",
};
// Known NJ last names / first names for heuristic assignment
const NJ_HINTS = ["Dwight", "Doe"];
// Canonicalize any state variant ("IN", "in", "Indiana") to a single full name.
const STATE_CANONICAL = {
    "IN": "Indiana", "in": "Indiana", "indiana": "Indiana",
    "NJ": "New Jersey", "nj": "New Jersey", "new jersey": "New Jersey",
    "CA": "California", "TX": "Texas", "OH": "Ohio", "IL": "Illinois",
};
function canonicalize(raw) {
    var _a, _b;
    const s = raw.trim();
    return (_b = (_a = STATE_CANONICAL[s]) !== null && _a !== void 0 ? _a : STATE_CANONICAL[s.toLowerCase()]) !== null && _b !== void 0 ? _b : s;
}
exports.migrateIndividualStates = (0, https_1.onCall)({ cors: true, memory: "512MiB", timeoutSeconds: 300 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be authenticated.");
    const db = admin.firestore();
    const batch = db.batch();
    let updated = 0;
    let normalized = 0;
    let skipped = 0;
    // Get all individuals across all orgs (limit 500 for safety)
    const snap = await db.collection("individuals").limit(500).get();
    for (const d of snap.docs) {
        const data = d.data();
        // The authoritative state for the orchestrator is the PROGRAM enrollment
        // state, stored in the top-level `state` field. The residence address
        // (address_state / address.state) is NOT used for compliance.
        const programState = data.state; // set by Change Program / intake
        const legacyState = data.address_state; // legacy backfill fallback
        // Determine the canonical program state for this individual.
        let resolved = null;
        if (programState && programState.trim()) {
            resolved = canonicalize(programState);
        }
        else if (legacyState && legacyState.trim()) {
            // Promote legacy residence-backfill into the program-state field
            resolved = canonicalize(legacyState);
        }
        else {
            // Infer for demo records that have no state at all
            const county = data.county || data.address_county || "";
            if (county) {
                for (const [c, s] of Object.entries(COUNTY_STATE_MAP)) {
                    if (county.toLowerCase().includes(c.toLowerCase().replace(" county", ""))) {
                        resolved = s;
                        break;
                    }
                }
            }
            if (!resolved) {
                const fullName = `${data.first_name || data.firstName || ""} ${data.last_name || data.lastName || ""}`;
                if (NJ_HINTS.some(h => fullName.toLowerCase().includes(h.toLowerCase())))
                    resolved = "New Jersey";
            }
            if (!resolved)
                resolved = "Indiana"; // demo default
        }
        // Already correct on the authoritative field — skip.
        if (programState && programState.trim() === resolved) {
            skipped++;
            continue;
        }
        batch.update(d.ref, {
            state: resolved, // ← authoritative program-state field
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        if (programState && programState.trim())
            normalized++;
        else
            updated++;
    }
    await batch.commit();
    // ── Seed service_authorizations for demo ──────────────────────────────────
    const authSeeded = await seedServiceAuthorizations(db);
    return {
        success: true,
        individualsUpdated: updated,
        individualsNormalized: normalized,
        individualsSkipped: skipped,
        authorizationsSeeded: authSeeded,
    };
});
async function seedServiceAuthorizations(db) {
    // Check if demo auths already exist
    const existingSnap = await db.collection("service_authorizations")
        .where("_seededByMigration", "==", true)
        .limit(1).get();
    if (!existingSnap.empty)
        return 0; // already seeded
    // Get org and first few individuals
    const indivsSnap = await db.collection("individuals")
        .where("enrollment_status", "==", "active")
        .limit(6).get();
    if (indivsSnap.empty)
        return 0;
    const today = new Date();
    const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
    const fmtDate = (d) => d.toISOString().slice(0, 10);
    const batch = db.batch();
    let count = 0;
    // Sample auth templates
    const templates = [
        { service_name: "Community Integration & Habilitation", units_authorized: 200, units_used: 120, daysOffset: 75, status: "active" },
        { service_name: "Day Services / Day Habilitation", units_authorized: 180, units_used: 90, daysOffset: 25, status: "active" },
        { service_name: "Supported Employment", units_authorized: 150, units_used: 140, daysOffset: 12, status: "active" },
        { service_name: "Residential Support", units_authorized: 365, units_used: 200, daysOffset: 120, status: "active" },
        { service_name: "Behavioral Support", units_authorized: 100, units_used: 105, daysOffset: -5, status: "active" }, // expired
        { service_name: "Transportation", units_authorized: 80, units_used: 20, daysOffset: 90, status: "active" },
    ];
    indivsSnap.docs.forEach((indDoc, i) => {
        const ind = indDoc.data();
        const orgId = ind.organizationId || ind.tenantId;
        const tmpl = templates[i % templates.length];
        const startDate = addDays(today, -180);
        const endDate = addDays(today, tmpl.daysOffset);
        const ref = db.collection("service_authorizations").doc();
        batch.set(ref, {
            individualId: indDoc.id,
            individualName: `${ind.first_name || ""} ${ind.last_name || ""}`.trim(),
            organizationId: orgId,
            tenantId: orgId,
            service_name: tmpl.service_name,
            auth_number: `AUTH-2026-${100 + i}`,
            status: tmpl.status,
            start_date: fmtDate(startDate),
            end_date: fmtDate(endDate),
            startDate: fmtDate(startDate),
            endDate: fmtDate(endDate),
            units_authorized: tmpl.units_authorized,
            units_used: tmpl.units_used,
            authorizedUnits: tmpl.units_authorized,
            unitsUsed: tmpl.units_used,
            funding_source: "Medicaid HCBS Waiver",
            _seededByMigration: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        count++;
    });
    await batch.commit();
    return count;
}
//# sourceMappingURL=migrateIndividualStates.js.map