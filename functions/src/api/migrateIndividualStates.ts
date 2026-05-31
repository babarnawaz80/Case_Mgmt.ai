// migrateIndividualStates.ts
// Callable migration that sets individual.state from the PROGRAM the individual
// is enrolled in — not from their residence address.
//
// Logic:
//   1. Load all programs for each org → build { programId → state } map
//   2. For each individual: individual.state = programs[individual.programId].state
//   3. If individual has no programId → find any active program for that org
//      (prefer Indiana/Case MGMT for demo) and assign it
//   4. Canonicalize all values ("IN" → "Indiana")
//   5. Also seed service_authorizations if missing

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// ─── Canonicalization ─────────────────────────────────────────────────────────
// Residence-address abbreviations like AZ/CO/MA must NEVER be treated as
// program states. The STATE_VALID list is the allowed set for program states in
// this system. Anything outside it is rejected and reassigned to the default.
const STATE_VALID = new Set([
  "Indiana", "New Jersey", "Ohio", "Illinois",
  "California", "Texas", "Virginia", "Maryland",
  "Minnesota", "Georgia", "Arizona", "Colorado",
  "Massachusetts", "Oregon", "Pennsylvania", "Michigan",
  "Florida", "New York", "North Carolina", "Washington",
]);

const STATE_CANONICAL: Record<string, string> = {
  "IN": "Indiana",       "in": "Indiana",
  "NJ": "New Jersey",    "nj": "New Jersey",   "new jersey": "New Jersey",
  "OH": "Ohio",          "oh": "Ohio",
  "IL": "Illinois",      "il": "Illinois",
  "CA": "California",    "ca": "California",
  "TX": "Texas",         "tx": "Texas",
  "VA": "Virginia",      "va": "Virginia",
  "MD": "Maryland",      "md": "Maryland",
  "MN": "Minnesota",     "mn": "Minnesota",
  "GA": "Georgia",       "ga": "Georgia",
  "AZ": "Arizona",       "az": "Arizona",
  "CO": "Colorado",      "co": "Colorado",
  "MA": "Massachusetts", "ma": "Massachusetts",
  "OR": "Oregon",        "or": "Oregon",
};

function canonicalize(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();
  const c = STATE_CANONICAL[s] ?? STATE_CANONICAL[s.toLowerCase()] ?? s;
  return STATE_VALID.has(c) ? c : null;
}

// ─── Main migration ───────────────────────────────────────────────────────────

export const migrateIndividualStates = onCall(
  { cors: true, memory: "512MiB", timeoutSeconds: 300 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be authenticated.");

    const db = admin.firestore();
    let updated = 0;
    let skipped = 0;
    let cleared = 0; // had wrong address-derived state, now corrected from program

    // ── Step 1: Load all programs across all orgs ─────────────────────────────
    // programs collection: { id, organizationId, name, state, code, payer, active }
    const programsSnap = await db.collection("programs").limit(200).get();

    // Map: organizationId → array of { id, state, name }
    const orgProgramMap: Record<string, Array<{ id: string; state: string; name: string }>> = {};
    for (const pDoc of programsSnap.docs) {
      const p = pDoc.data();
      const orgId = p.organizationId;
      const pState = canonicalize(p.state);
      if (!orgId || !pState) continue;
      if (!orgProgramMap[orgId]) orgProgramMap[orgId] = [];
      orgProgramMap[orgId].push({ id: pDoc.id, state: pState, name: p.name ?? "" });
    }

    // ── Step 2: Process all individuals ──────────────────────────────────────
    const snap = await db.collection("individuals").limit(500).get();

    // Use batches (max 500 writes each)
    const batches: admin.firestore.WriteBatch[] = [db.batch()];
    let batchCount = 0;

    for (const d of snap.docs) {
      const data = d.data();
      const orgId: string = data.organizationId || data.tenantId || "";

      // ── Resolve program state ────────────────────────────────────────────
      let programState: string | null = null;

      // Priority 1: individual has a programId → look it up in programs map
      const programId: string = data.programId || "";
      if (programId && orgProgramMap[orgId]) {
        const prog = orgProgramMap[orgId].find(p => p.id === programId);
        if (prog) programState = prog.state;
      }

      // Priority 2: individual has a program name → match by name
      if (!programState && orgProgramMap[orgId]) {
        const programName: string = (data.programName || data.program || "").toLowerCase();
        if (programName) {
          const prog = orgProgramMap[orgId].find(p =>
            p.name.toLowerCase().includes(programName) ||
            programName.includes(p.name.toLowerCase())
          );
          if (prog) programState = prog.state;
        }
      }

      // Priority 3: any active program for this org (prefer Indiana/Case MGMT for demo)
      if (!programState && orgProgramMap[orgId]) {
        const fallback =
          orgProgramMap[orgId].find(p => p.state === "Indiana") ??
          orgProgramMap[orgId][0];
        if (fallback) programState = fallback.state;
      }

      // Priority 4: absolute fallback — Indiana (demo tenant default)
      if (!programState) programState = "Indiana";

      // ── Compare with what's currently stored ────────────────────────────
      const currentState: string = data.state || "";
      const currentCanonical = canonicalize(currentState);

      if (currentCanonical === programState) {
        skipped++;
        continue; // already correct
      }

      // Current value is wrong (address-derived abbreviation like AZ/CO/MA) or missing
      if (currentCanonical && currentCanonical !== programState) cleared++;
      else updated++;

      if (batchCount >= 490) {
        batches.push(db.batch());
        batchCount = 0;
      }
      batches[batches.length - 1].update(d.ref, {
        state: programState,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      batchCount++;
    }

    for (const b of batches) await b.commit();

    // ── Seed service_authorizations ───────────────────────────────────────────
    const authSeeded = await seedServiceAuthorizations(db);

    return {
      success: true,
      individualsUpdated: updated,
      individualsClearedBadState: cleared,
      individualsSkipped: skipped,
      authorizationsSeeded: authSeeded,
    };
  }
);

// ─── Seed service_authorizations (once) ──────────────────────────────────────

async function seedServiceAuthorizations(db: admin.firestore.Firestore): Promise<number> {
  const existingSnap = await db.collection("service_authorizations")
    .where("_seededByMigration", "==", true)
    .limit(1).get();
  if (!existingSnap.empty) return 0;

  const indivsSnap = await db.collection("individuals")
    .where("enrollment_status", "==", "active")
    .limit(6).get();
  if (indivsSnap.empty) return 0;

  const today = new Date();
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const batch = db.batch();
  let count = 0;

  const templates = [
    { service_name: "Community Integration & Habilitation", units_authorized: 200, units_used: 120, daysOffset: 75 },
    { service_name: "Day Services / Day Habilitation",      units_authorized: 180, units_used: 90,  daysOffset: 25 },
    { service_name: "Supported Employment",                 units_authorized: 150, units_used: 140, daysOffset: 12 },
    { service_name: "Residential Support",                  units_authorized: 365, units_used: 200, daysOffset: 120 },
    { service_name: "Behavioral Support",                   units_authorized: 100, units_used: 105, daysOffset: -5 },
    { service_name: "Transportation",                       units_authorized: 80,  units_used: 20,  daysOffset: 90 },
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
      status: "active",
      start_date: fmt(startDate), end_date: fmt(endDate),
      startDate: fmt(startDate), endDate: fmt(endDate),
      units_authorized: tmpl.units_authorized, units_used: tmpl.units_used,
      authorizedUnits: tmpl.units_authorized, unitsUsed: tmpl.units_used,
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
