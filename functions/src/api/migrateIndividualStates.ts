// migrateIndividualStates.ts
// Callable migration — sets individual.state from the PROGRAM the individual
// is enrolled in (programs collection → state field).
//
// This is safe to run multiple times (always overwrites).
// "Seed Demo Data" button on the Orchestrator page calls this.

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Full-name canonicalization (IN → Indiana, NJ → New Jersey, etc.)
const ABBR_TO_NAME: Record<string, string> = {
  IN: "Indiana",       NJ: "New Jersey",   OH: "Ohio",
  IL: "Illinois",      CA: "California",   TX: "Texas",
  VA: "Virginia",      MD: "Maryland",     MN: "Minnesota",
  GA: "Georgia",       AZ: "Arizona",      CO: "Colorado",
  MA: "Massachusetts", OR: "Oregon",       PA: "Pennsylvania",
  MI: "Michigan",      FL: "Florida",      NY: "New York",
  NC: "North Carolina",WA: "Washington",
};

function toFullName(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();
  return ABBR_TO_NAME[s.toUpperCase()] ?? ABBR_TO_NAME[s] ?? (s.length > 2 ? s : null);
}

export const migrateIndividualStates = onCall(
  { cors: true, memory: "512MiB", timeoutSeconds: 300 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be authenticated.");

    const db = admin.firestore();
    let fixed = 0;
    let alreadyCorrect = 0;

    // ── Step 1: Load ALL programs → build { id → fullNameState } ─────────────
    const programsSnap = await db.collection("programs").limit(300).get();

    // Map programId → canonical state name
    const programStateMap: Record<string, string> = {};
    // Also map programName (lowercase) → canonical state, as a name-based fallback
    const programNameStateMap: Record<string, string> = {};

    for (const p of programsSnap.docs) {
      const d = p.data();
      const pState = toFullName(d.state);
      if (!pState) continue;
      programStateMap[p.id] = pState;
      if (d.name) {
        programNameStateMap[d.name.toLowerCase().trim()] = pState;
      }
    }

    // ── Step 2: Update every individual with the program's state ─────────────
    const indsSnap = await db.collection("individuals").limit(500).get();

    const batches: admin.firestore.WriteBatch[] = [db.batch()];
    let writeCount = 0;

    for (const d of indsSnap.docs) {
      const data = d.data();

      // ── Resolve the correct state from program ──────────────────────────
      let correctState: string | null = null;

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
      const current = toFullName(data.state) ?? data.state ?? "";
      if (current === correctState) {
        alreadyCorrect++;
        continue;
      }

      if (writeCount > 0 && writeCount % 490 === 0) {
        batches.push(db.batch());
      }
      batches[batches.length - 1].update(d.ref, {
        state:      correctState,
        updatedAt:  admin.firestore.FieldValue.serverTimestamp(),
      });
      writeCount++;
      fixed++;
    }

    for (const b of batches) await b.commit();

    // ── Step 3: Seed service_authorizations if not yet done ───────────────────
    const authSeeded = await seedServiceAuthorizationsIfNeeded(db);

    return {
      success: true,
      individualsFixed: fixed,
      individualsAlreadyCorrect: alreadyCorrect,
      authorizationsSeeded: authSeeded,
      programsLoaded: programsSnap.size,
    };
  }
);

async function seedServiceAuthorizationsIfNeeded(db: admin.firestore.Firestore): Promise<number> {
  const existing = await db.collection("service_authorizations")
    .where("_seededByMigration", "==", true).limit(1).get();
  if (!existing.empty) return 0;

  const inds = await db.collection("individuals")
    .where("enrollment_status", "==", "active").limit(6).get();
  if (inds.empty) return 0;

  const today = new Date();
  const add = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const templates = [
    { service_name: "Community Integration & Habilitation", units_authorized: 200, units_used: 120, daysOffset: 75 },
    { service_name: "Day Services / Day Habilitation",      units_authorized: 180, units_used: 90,  daysOffset: 25 },
    { service_name: "Supported Employment",                 units_authorized: 150, units_used: 140, daysOffset: 12 },
    { service_name: "Residential Support",                  units_authorized: 365, units_used: 200, daysOffset: 120 },
    { service_name: "Behavioral Support",                   units_authorized: 100, units_used: 105, daysOffset: -5 },
    { service_name: "Transportation",                       units_authorized: 80,  units_used: 20,  daysOffset: 90 },
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
      startDate:  fmt(add(today, -180)), endDate:   fmt(add(today, t.daysOffset)),
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
