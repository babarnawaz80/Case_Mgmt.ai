/**
 * useDuplicatePairs.ts — Real-time hooks for the duplicate_pairs collection.
 *
 * Hooks:
 *   usePendingDuplicatePairs  — pending pairs for an org (real-time)
 *   useAllDuplicatePairs      — all pairs for an org, all statuses (real-time)
 *
 * Write helpers:
 *   resolvePairAsNotDuplicate — mark a pair as not_a_duplicate
 *   resolvePairAsMerged       — mark a pair as merged with survivor/merged IDs
 */

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface DuplicatePair {
  id: string;
  tenantId: string;
  orgId: string;
  individualAId: string;
  individualAName: string;
  individualBId: string;
  individualBName: string;
  detectedAt: unknown;
  detectedBy: string;
  matchSignal: "medicaid_id" | "name_dob" | "both";
  medicaidIdMatch: boolean;
  nameDobMatch: boolean;
  status: "pending" | "merged" | "not_a_duplicate";
  resolvedAt: unknown | null;
  resolvedBy: string | null;
  resolvedByName: string | null;
  resolutionNote: string | null;
  survivorId: string | null;
  mergedRecordId: string | null;
}

// ─── Hook: pending pairs only ─────────────────────────────────────────────────

export function usePendingDuplicatePairs(orgId?: string): { data: DuplicatePair[]; loading: boolean } {
  const [data, setData] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "duplicate_pairs"),
      where("orgId", "==", orgId),
      where("status", "==", "pending"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const pairs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DuplicatePair));
        setData(pairs);
        setLoading(false);
      },
      (err) => {
        console.error("usePendingDuplicatePairs error:", err);
        setLoading(false);
      },
    );

    return unsub;
  }, [orgId]);

  return { data, loading };
}

// ─── Hook: all pairs, all statuses ────────────────────────────────────────────

export function useAllDuplicatePairs(orgId?: string): { data: DuplicatePair[]; loading: boolean } {
  const [data, setData] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "duplicate_pairs"),
      where("orgId", "==", orgId),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const pairs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DuplicatePair));
        setData(pairs);
        setLoading(false);
      },
      (err) => {
        console.error("useAllDuplicatePairs error:", err);
        setLoading(false);
      },
    );

    return unsub;
  }, [orgId]);

  return { data, loading };
}

// ─── Write helpers ────────────────────────────────────────────────────────────

/** Mark a duplicate pair as "not a duplicate". */
export async function resolvePairAsNotDuplicate(
  pairId: string,
  userId: string,
  userName: string,
): Promise<void> {
  await updateDoc(doc(db, "duplicate_pairs", pairId), {
    status: "not_a_duplicate",
    resolvedAt: serverTimestamp(),
    resolvedBy: userId,
    resolvedByName: userName,
  });
}

/** Mark a duplicate pair as merged, recording the survivor and merged record IDs. */
export async function resolvePairAsMerged(
  pairId: string,
  survivorId: string,
  mergedId: string,
  userId: string,
  userName: string,
): Promise<void> {
  await updateDoc(doc(db, "duplicate_pairs", pairId), {
    status: "merged",
    survivorId,
    mergedRecordId: mergedId,
    resolvedAt: serverTimestamp(),
    resolvedBy: userId,
    resolvedByName: userName,
  });
}
