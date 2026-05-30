"use strict";
/**
 * duplicates.ts — Duplicate individual detection for CaseManagement.AI
 *
 * Functions:
 *   detectDuplicatesScheduled  — Nightly 2AM ET pubsub schedule
 *   detectDuplicatesOnCreate   — Firestore trigger on individuals/{individualId} onCreate
 *   detectDuplicatesOnDemand   — HTTPS callable for manual frontend-triggered scan
 *
 * Match signals:
 *   medicaid_id   — same Medicaid ID within an org
 *   name_dob      — same first name + last name + DOB within an org
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
exports.detectDuplicatesOnDemand = exports.detectDuplicatesOnCreate = exports.detectDuplicatesScheduled = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const db = admin.firestore();
// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Canonical sorted pair key — order-independent dedup */
function pairKey(idA, idB) {
    return idA < idB ? { idA, idB } : { idA: idB, idB: idA };
}
/** Format display name as "LastName, FirstName" */
function displayName(first, last) {
    return `${last}, ${first}`;
}
/** Normalise Medicaid ID: trim + lowercase */
function normalizeMedicaidId(v) {
    if (!v)
        return null;
    const s = v.trim().toLowerCase();
    return s.length > 0 ? s : null;
}
/** Normalise name+dob key */
function namedobKey(first, last, dob) {
    if (!dob)
        return null;
    const dobTrimmed = dob.trim();
    if (!dobTrimmed)
        return null;
    return `${first.trim().toLowerCase()}|${last.trim().toLowerCase()}|${dobTrimmed}`;
}
// ─── Check for existing pair ───────────────────────────────────────────────────
async function pairAlreadyExists(idA, idB) {
    const { idA: a, idB: b } = pairKey(idA, idB);
    // Query both orientations in one shot using the canonical ordering
    const snap = await db
        .collection("duplicate_pairs")
        .where("individualAId", "==", a)
        .where("individualBId", "==", b)
        .where("status", "in", ["pending", "not_a_duplicate"])
        .limit(1)
        .get();
    return !snap.empty;
}
// ─── Write a new duplicate pair document ──────────────────────────────────────
async function writePair(orgId, indA, indB, medicaidIdMatch, nameDobMatch) {
    const { idA, idB } = pairKey(indA.id, indB.id);
    // Determine which record is A and which is B after canonical sort
    const recA = idA === indA.id ? indA : indB;
    const recB = idA === indA.id ? indB : indA;
    // Skip if already tracked
    const exists = await pairAlreadyExists(idA, idB);
    if (exists)
        return;
    let matchSignal;
    if (medicaidIdMatch && nameDobMatch) {
        matchSignal = "both";
    }
    else if (medicaidIdMatch) {
        matchSignal = "medicaid_id";
    }
    else {
        matchSignal = "name_dob";
    }
    await db.collection("duplicate_pairs").add({
        tenantId: orgId,
        orgId,
        individualAId: recA.id,
        individualAName: displayName(recA.first_name, recA.last_name),
        individualBId: recB.id,
        individualBName: displayName(recB.first_name, recB.last_name),
        detectedAt: admin.firestore.FieldValue.serverTimestamp(),
        detectedBy: "scheduled_scan",
        matchSignal,
        medicaidIdMatch,
        nameDobMatch,
        status: "pending",
        resolvedAt: null,
        resolvedBy: null,
        resolvedByName: null,
        resolutionNote: null,
        survivorId: null,
        mergedRecordId: null,
    });
}
// ─── Core scan logic for a single org group ───────────────────────────────────
async function scanOrgGroup(orgId, records) {
    var _a, _b;
    // Signal A: group by Medicaid ID
    const byMedicaidId = new Map();
    for (const rec of records) {
        const key = normalizeMedicaidId(rec.medicaid_id);
        if (!key)
            continue;
        const group = (_a = byMedicaidId.get(key)) !== null && _a !== void 0 ? _a : [];
        group.push(rec);
        byMedicaidId.set(key, group);
    }
    // Signal B: group by name+DOB
    const byNameDob = new Map();
    for (const rec of records) {
        const key = namedobKey(rec.first_name, rec.last_name, rec.dob);
        if (!key)
            continue;
        const group = (_b = byNameDob.get(key)) !== null && _b !== void 0 ? _b : [];
        group.push(rec);
        byNameDob.set(key, group);
    }
    // Collect pairs from both signals, tracking which signals each pair triggers
    // Use a Map keyed by canonical pair IDs to merge signals
    const pairSignals = new Map();
    for (const group of byMedicaidId.values()) {
        if (group.length < 2)
            continue;
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const { idA, idB } = pairKey(group[i].id, group[j].id);
                const mapKey = `${idA}:${idB}`;
                const existing = pairSignals.get(mapKey);
                const recA = idA === group[i].id ? group[i] : group[j];
                const recB = idA === group[i].id ? group[j] : group[i];
                if (existing) {
                    existing.medicaidId = true;
                }
                else {
                    pairSignals.set(mapKey, { medicaidId: true, nameDob: false, recA, recB });
                }
            }
        }
    }
    for (const group of byNameDob.values()) {
        if (group.length < 2)
            continue;
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const { idA, idB } = pairKey(group[i].id, group[j].id);
                const mapKey = `${idA}:${idB}`;
                const existing = pairSignals.get(mapKey);
                const recA = idA === group[i].id ? group[i] : group[j];
                const recB = idA === group[i].id ? group[j] : group[i];
                if (existing) {
                    existing.nameDob = true;
                }
                else {
                    pairSignals.set(mapKey, { medicaidId: false, nameDob: true, recA, recB });
                }
            }
        }
    }
    // Write all discovered pairs
    const writes = [];
    for (const { medicaidId, nameDob, recA, recB } of pairSignals.values()) {
        writes.push(writePair(orgId, recA, recB, medicaidId, nameDob));
    }
    await Promise.all(writes);
}
// ─── C. runDuplicateScan — full org scan ──────────────────────────────────────
async function runDuplicateScan() {
    var _a, _b, _c, _d;
    const snap = await db.collection("individuals").get();
    // Group by org
    const byOrg = new Map();
    for (const doc of snap.docs) {
        const data = doc.data();
        const orgId = (_a = data.organizationId) !== null && _a !== void 0 ? _a : "";
        if (!orgId)
            continue;
        const rec = {
            id: doc.id,
            organizationId: orgId,
            first_name: (_b = data.first_name) !== null && _b !== void 0 ? _b : "",
            last_name: (_c = data.last_name) !== null && _c !== void 0 ? _c : "",
            dob: data.dob,
            medicaid_id: data.medicaid_id,
        };
        const group = (_d = byOrg.get(orgId)) !== null && _d !== void 0 ? _d : [];
        group.push(rec);
        byOrg.set(orgId, group);
    }
    const scanPromises = [];
    for (const [orgId, records] of byOrg.entries()) {
        scanPromises.push(scanOrgGroup(orgId, records));
    }
    await Promise.all(scanPromises);
}
// ─── D. runDuplicateScanForNew — check new individual against existing ────────
async function runDuplicateScanForNew(data, individualId) {
    var _a, _b, _c, _d, _e;
    const orgId = (_a = data.organizationId) !== null && _a !== void 0 ? _a : "";
    if (!orgId)
        return;
    // Fetch all other individuals in the same org
    const snap = await db
        .collection("individuals")
        .where("organizationId", "==", orgId)
        .get();
    const newRec = {
        id: individualId,
        organizationId: orgId,
        first_name: (_b = data.first_name) !== null && _b !== void 0 ? _b : "",
        last_name: (_c = data.last_name) !== null && _c !== void 0 ? _c : "",
        dob: data.dob,
        medicaid_id: data.medicaid_id,
    };
    const newMedicaidKey = normalizeMedicaidId(newRec.medicaid_id);
    const newNameDobKey = namedobKey(newRec.first_name, newRec.last_name, newRec.dob);
    const writes = [];
    for (const docSnap of snap.docs) {
        if (docSnap.id === individualId)
            continue; // skip self
        const existingData = docSnap.data();
        const existing = {
            id: docSnap.id,
            organizationId: orgId,
            first_name: (_d = existingData.first_name) !== null && _d !== void 0 ? _d : "",
            last_name: (_e = existingData.last_name) !== null && _e !== void 0 ? _e : "",
            dob: existingData.dob,
            medicaid_id: existingData.medicaid_id,
        };
        const medicaidMatch = newMedicaidKey !== null &&
            normalizeMedicaidId(existing.medicaid_id) === newMedicaidKey;
        const existingNameDobKey = namedobKey(existing.first_name, existing.last_name, existing.dob);
        const nameDobMatch = newNameDobKey !== null &&
            existingNameDobKey !== null &&
            newNameDobKey === existingNameDobKey;
        if (medicaidMatch || nameDobMatch) {
            writes.push(writePair(orgId, newRec, existing, medicaidMatch, nameDobMatch));
        }
    }
    await Promise.all(writes);
}
// ─── A. detectDuplicatesScheduled — nightly 2AM ET ────────────────────────────
exports.detectDuplicatesScheduled = (0, scheduler_1.onSchedule)({
    schedule: "0 2 * * *",
    timeZone: "America/New_York",
}, async (_event) => {
    await runDuplicateScan();
});
// ─── B. detectDuplicatesOnCreate — Firestore trigger on new individual ─────────
exports.detectDuplicatesOnCreate = (0, firestore_1.onDocumentCreated)("individuals/{individualId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    await runDuplicateScanForNew(snap.data(), snap.id);
});
// ─── E. detectDuplicatesOnDemand — HTTPS callable for manual scan ──────────────
exports.detectDuplicatesOnDemand = (0, https_1.onCall)(async (_request) => {
    await runDuplicateScan();
    return { success: true };
});
//# sourceMappingURL=duplicates.js.map