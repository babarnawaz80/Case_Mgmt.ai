/**
 * useEChartCounts — real-time Firestore counts for the eChart module tiles.
 *
 * Runs parallel count queries for all tile slugs whenever the individualId
 * changes. Results are cached for 5 minutes to avoid repeated reads.
 *
 * Field name conventions (must match actual Firestore documents):
 *   - progress_notes    → individualId  (camelCase)
 *   - contact_notes     → individual_id (snake_case)
 *   - monitoring_forms  → individual_id (snake_case)
 *   - visit_summaries   → individual_id (snake_case)
 *   - incidents         → individualId  (camelCase)
 *   - referrals         → individual_id (snake_case)
 *   - managed_documents → individual_id (snake_case)
 *   - oncall_log        → individual_id (snake_case)
 *   - care_plans        → individual_id (snake_case)
 *   - workflows         → individual_id (snake_case)
 *   - service_authorizations → individual_id (snake_case)
 *   - eligibility_verifications → individual_id (snake_case)
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
    carePlans,
    workflows,
    eligibility,
    serviceAuths,
    medications,
  ] = await Promise.all([
    // progress_notes uses camelCase individualId
    getCountFromServer(query(
      collection(db, "progress_notes"),
      where("individualId", "==", individualId),
    )).catch(() => null),
    // contact_notes uses snake_case individual_id
    getCountFromServer(query(
      collection(db, "contact_notes"),
      where("individual_id", "==", individualId),
    )).catch(() => null),
    // monitoring_forms uses snake_case individual_id
    getCountFromServer(query(
      collection(db, "monitoring_forms"),
      where("individual_id", "==", individualId),
    )).catch(() => null),
    // visit_summaries uses snake_case individual_id
    getCountFromServer(query(
      collection(db, "visit_summaries"),
      where("individual_id", "==", individualId),
    )).catch(() => null),
    // incidents uses camelCase individualId
    getCountFromServer(query(
      collection(db, "incidents"),
      where("individualId", "==", individualId),
    )).catch(() => null),
    // referrals uses snake_case individual_id
    getCountFromServer(query(
      collection(db, "referrals"),
      where("individual_id", "==", individualId),
    )).catch(() => null),
    // managed_documents uses snake_case individual_id
    getCountFromServer(query(
      collection(db, "managed_documents"),
      where("individual_id", "==", individualId),
    )).catch(() => null),
    // oncall_log uses snake_case individual_id
    getCountFromServer(query(
      collection(db, "oncall_log"),
      where("individual_id", "==", individualId),
    )).catch(() => null),
    // care_plans uses snake_case individual_id
    getCountFromServer(query(
      collection(db, "care_plans"),
      where("individual_id", "==", individualId),
    )).catch(() => null),
    // workflows uses snake_case individual_id
    getCountFromServer(query(
      collection(db, "workflows"),
      where("individual_id", "==", individualId),
    )).catch(() => null),
    // eligibility_verifications uses snake_case individual_id
    getCountFromServer(query(
      collection(db, "eligibility_verifications"),
      where("individual_id", "==", individualId),
    )).catch(() => null),
    // service_authorizations uses snake_case individual_id
    getCountFromServer(query(
      collection(db, "service_authorizations"),
      where("individual_id", "==", individualId),
    )).catch(() => null),
    // medications — subcollection under individuals/{id}/medications
    getCountFromServer(
      collection(db, "individuals", individualId, "medications"),
    ).catch(() => null),
  ]);

  const data: EChartCounts = {
    // Documentation tiles
    "progress-note":          progressNotes?.data().count ?? 0,
    "care-notes":             progressNotes?.data().count ?? 0, // same collection
    "contact-note":           contactNotes?.data().count ?? 0,
    "monitoring-form":        monitoringForms?.data().count ?? 0,
    "visit-summary":          visitSummaries?.data().count ?? 0,
    "care-plan":              carePlans?.data().count ?? 0,
    "workflow-manager":       workflows?.data().count ?? 0,
    "eligibility-verification": eligibility?.data().count ?? 0,
    // Care tiles
    "referrals":              referrals?.data().count ?? 0,
    // Operations tiles
    "incident-reporting":     incidents?.data().count ?? 0,
    "managed-documents":      managedDocuments?.data().count ?? 0,
    "oncall":                 oncallLogs?.data().count ?? 0,
    "authorizations":         serviceAuths?.data().count ?? 0,
    "medications":            medications?.data().count ?? 0,
  };

  cache.set(individualId, { ts: Date.now(), data });
  return data;
}

export function useEChartCounts(individualId: string | undefined): EChartCounts {
  const [counts, setCounts] = useState<EChartCounts>({});

  useEffect(() => {
    if (!individualId) return;
    let cancelled = false;

    // Bust cache when individualId changes so we always get fresh counts
    cache.delete(individualId);

    fetchCounts(individualId).then((data) => {
      if (!cancelled) setCounts(data);
    }).catch(() => {/* silently use defaults */});
    return () => { cancelled = true; };
  }, [individualId]);

  return counts;
}
