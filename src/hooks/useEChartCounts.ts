/**
 * useEChartCounts — real-time Firestore counts for the eChart module tiles.
 *
 * Rather than running a separate onSnapshot per collection (which would be
 * very expensive), this hook runs a small set of targeted count queries in
 * parallel whenever the individualId changes and refreshes every 5 minutes.
 *
 * Returns a `counts` map keyed by the tile slug.
 */
import { useState, useEffect } from "react";
import {
  collection, query, where, getCountFromServer,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type EChartCounts = Record<string, number>;

const STALE_MS = 5 * 60 * 1000; // 5 min cache

const cache = new Map<string, { ts: number; data: EChartCounts }>();

async function fetchCounts(individualId: string): Promise<EChartCounts> {
  const cached = cache.get(individualId);
  if (cached && Date.now() - cached.ts < STALE_MS) return cached.data;

  // Run all count queries in parallel
  const [
    progressNotes,
    contactNotes,
    monitoringForms,
    visitSummaries,
    incidents,
    referrals,
    managedDocuments,
    oncallLogs,
  ] = await Promise.all([
    getCountFromServer(query(
      collection(db, "progress_notes"),
      where("individualId", "==", individualId),
    )).catch(() => null),
    getCountFromServer(query(
      collection(db, "contact_notes"),
      where("individual_id", "==", individualId),
    )).catch(() => null),
    getCountFromServer(query(
      collection(db, "monitoring_forms"),
      where("individual_id", "==", individualId),
    )).catch(() => null),
    getCountFromServer(query(
      collection(db, "visit_summaries"),
      where("individual_id", "==", individualId),
    )).catch(() => null),
    getCountFromServer(query(
      collection(db, "incidents"),
      where("individualId", "==", individualId),
    )).catch(() => null),
    getCountFromServer(query(
      collection(db, "referrals"),
      where("individual_id", "==", individualId),
    )).catch(() => null),
    getCountFromServer(query(
      collection(db, "managed_documents"),
      where("individual_id", "==", individualId),
    )).catch(() => null),
    getCountFromServer(query(
      collection(db, "oncall_log"),
      where("individual_id", "==", individualId),
    )).catch(() => null),
  ]);

  const data: EChartCounts = {
    "progress-note": progressNotes?.data().count ?? 0,
    "care-notes":    progressNotes?.data().count ?? 0, // same collection
    "contact-note":  contactNotes?.data().count ?? 0,
    "monitoring-form": monitoringForms?.data().count ?? 0,
    "visit-summary": visitSummaries?.data().count ?? 0,
    "incident-reporting": incidents?.data().count ?? 0,
    "referrals":     referrals?.data().count ?? 0,
    "managed-documents": managedDocuments?.data().count ?? 0,
    "oncall":        oncallLogs?.data().count ?? 0,
  };

  cache.set(individualId, { ts: Date.now(), data });
  return data;
}

export function useEChartCounts(individualId: string | undefined): EChartCounts {
  const [counts, setCounts] = useState<EChartCounts>({});

  useEffect(() => {
    if (!individualId) return;
    let cancelled = false;
    fetchCounts(individualId).then((data) => {
      if (!cancelled) setCounts(data);
    }).catch(() => {/* silently use defaults */});
    return () => { cancelled = true; };
  }, [individualId]);

  return counts;
}
