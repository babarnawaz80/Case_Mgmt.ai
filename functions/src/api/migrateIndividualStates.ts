// migrateIndividualStates.ts
// One-time callable to:
// 1. Assign address_state to all demo individuals that have null/missing state
// 2. Seed realistic service_authorizations for demo individuals

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// ─── State assignment for known demo individuals ───────────────────────────────
// County → State map used as fallback when county is known
const COUNTY_STATE_MAP: Record<string, string> = {
  "Carroll County":  "Indiana",
  "Hamilton County": "Indiana",
  "Marion County":   "Indiana",
  "Johnson County":  "Indiana",
  "Hendricks County":"Indiana",
  "Boone County":    "Indiana",
  "Tippecanoe County":"Indiana",
  "Allen County":    "Indiana",
  "Dallas County":   "Indiana",
  "Franklin County": "Indiana",
  "Bremer County":   "Indiana",
  "Essex County":    "New Jersey",
  "Hudson County":   "New Jersey",
  "Bergen County":   "New Jersey",
  "Camden County":   "New Jersey",
};

// Known NJ last names / first names for heuristic assignment
const NJ_HINTS = ["Dwight", "Doe"];

// Canonicalize any state variant ("IN", "in", "Indiana") to a single full name.
const STATE_CANONICAL: Record<string, string> = {
  "IN": "Indiana", "in": "Indiana", "indiana": "Indiana",
  "NJ": "New Jersey", "nj": "New Jersey", "new jersey": "New Jersey",
  "CA": "California", "TX": "Texas", "OH": "Ohio", "IL": "Illinois",
};
function canonicalize(raw: string): string {
  const s = raw.trim();
  return STATE_CANONICAL[s] ?? STATE_CANONICAL[s.toLowerCase()] ?? s;
}

export const migrateIndividualStates = onCall(
  { cors: true, memory: "512MiB", timeoutSeconds: 300 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be authenticated.");

    const db = admin.firestore();
    const batch = db.batch();
    let updated = 0;
    let normalized = 0;
    let skipped = 0;

    // Get all individuals across all orgs (limit 500 for safety)
    const snap = await db.collection("individuals").limit(500).get();

    for (const d of snap.docs) {
      const data = d.data();
      const existing = data.address_state;

      // Already has a value — canonicalize it ("IN" → "Indiana") if needed.
      if (existing && existing.trim()) {
        const canonical = canonicalize(existing);
        if (canonical !== existing.trim()) {
          batch.update(d.ref, {
            address_state: canonical,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });
          normalized++;
        } else {
          skipped++;
        }
        continue;
      }

      // Try to infer state from county
      let assignedState: string | null = null;
      const county = data.county || data.address_county || "";
      if (county) {
        for (const [c, s] of Object.entries(COUNTY_STATE_MAP)) {
          if (county.toLowerCase().includes(c.toLowerCase().replace(" county", ""))) {
            assignedState = s;
            break;
          }
        }
      }

      // Heuristic: check first/last name hints for NJ
      if (!assignedState) {
        const firstName = data.first_name || data.firstName || "";
        const lastName = data.last_name || data.lastName || "";
        const fullName = `${firstName} ${lastName}`;
        if (NJ_HINTS.some(h => fullName.toLowerCase().includes(h.toLowerCase()))) {
          assignedState = "New Jersey";
        }
      }

      // Default: assign Indiana for demo tenant
      if (!assignedState) {
        assignedState = "Indiana";
      }

      batch.update(d.ref, {
        address_state: assignedState,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
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
  }
);

async function seedServiceAuthorizations(db: admin.firestore.Firestore): Promise<number> {
  // Check if demo auths already exist
  const existingSnap = await db.collection("service_authorizations")
    .where("_seededByMigration", "==", true)
    .limit(1).get();
  if (!existingSnap.empty) return 0; // already seeded

  // Get org and first few individuals
  const indivsSnap = await db.collection("individuals")
    .where("enrollment_status", "==", "active")
    .limit(6).get();
  if (indivsSnap.empty) return 0;

  const today = new Date();
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

  const batch = db.batch();
  let count = 0;

  // Sample auth templates
  const templates = [
    { service_name: "Community Integration & Habilitation", units_authorized: 200, units_used: 120, daysOffset: 75, status: "active" },
    { service_name: "Day Services / Day Habilitation",      units_authorized: 180, units_used: 90,  daysOffset: 25, status: "active" },
    { service_name: "Supported Employment",                 units_authorized: 150, units_used: 140, daysOffset: 12, status: "active" },
    { service_name: "Residential Support",                  units_authorized: 365, units_used: 200, daysOffset: 120, status: "active" },
    { service_name: "Behavioral Support",                   units_authorized: 100, units_used: 105, daysOffset: -5, status: "active" },  // expired
    { service_name: "Transportation",                       units_authorized: 80,  units_used: 20,  daysOffset: 90, status: "active" },
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
