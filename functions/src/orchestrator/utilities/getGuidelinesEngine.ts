// getGuidelinesEngine.ts — Shared utility for dynamic engine selection
// Selects the correct guidelines engine per individual based on state + program.
// Results are cached within a single run to avoid redundant Firestore queries.

import * as admin from "firebase-admin";

export interface EngineInfo {
  id: string;
  name: string;
  state: string;
  program?: string;
  version?: string;
  status: string;
}

// Module-level cache — resets between function cold starts (intended)
const _runCache = new Map<string, EngineInfo | null>();

export function clearEngineCache(): void {
  _runCache.clear();
}

export async function getGuidelinesEngineForIndividual(
  orgId: string,
  individualState?: string,
  individualProgram?: string,
  db?: admin.firestore.Firestore
): Promise<EngineInfo | null> {
  if (!individualState) return null;
  const firestoreDb = db ?? admin.firestore();
  const cacheKey = `${orgId}::${individualState}::${individualProgram ?? ""}`;

  if (_runCache.has(cacheKey)) {
    return _runCache.get(cacheKey) ?? null;
  }

  try {
    // Query all published engines for this org + state
    const snap = await firestoreDb
      .collection("guidelines_engines")
      .where("organizationId", "==", orgId)
      .where("state", "==", individualState)
      .where("status", "==", "published")
      .orderBy("effectiveDate", "desc")
      .limit(5)
      .get();

    if (snap.empty) {
      // Try without organizationId filter (some orgs may not set it)
      const broadSnap = await firestoreDb
        .collection("guidelines_engines")
        .where("state", "==", individualState)
        .where("status", "==", "published")
        .orderBy("effectiveDate", "desc")
        .limit(5)
        .get();

      if (broadSnap.empty) {
        _runCache.set(cacheKey, null);
        return null;
      }

      const engines = broadSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as EngineInfo));
      const result = findBestMatch(engines, individualProgram);
      _runCache.set(cacheKey, result);
      return result;
    }

    const engines = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as EngineInfo));
    const result = findBestMatch(engines, individualProgram);
    _runCache.set(cacheKey, result);
    return result;
  } catch {
    // Non-fatal — return null so orchestrator can fall back gracefully
    _runCache.set(cacheKey, null);
    return null;
  }
}

function findBestMatch(engines: EngineInfo[], program?: string): EngineInfo | null {
  if (!engines.length) return null;
  if (!program) return engines[0] ?? null;
  const prog = program.toLowerCase();
  // Try exact program match
  const exact = engines.find(e =>
    e.program?.toLowerCase().includes(prog) || prog.includes(e.program?.toLowerCase() ?? "")
  );
  return exact ?? engines[0] ?? null;
}
