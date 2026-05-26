/**
 * useEChartStats.ts
 * Computes the 5 live stats shown in the eChart metric strip:
 *   - LAST VISIT      → most recent visit_summary.visit_date
 *   - NEXT VISIT      → soonest future workflow_task.due_date (or next scheduled visit)
 *   - OPEN TASKS      → count of open/in_progress workflow_tasks
 *   - INCIDENTS       → count of open incidents
 *   - COMPLIANCE      → % of monitoring_forms that are Submitted (vs total)
 *
 * All data is derived from real Firestore sub-collections so it stays accurate
 * for ALL individuals, not just those with pre-seeded static fields.
 */

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface EChartStats {
  lastVisitDate: string | null;   // "YYYY-MM-DD" or null
  nextVisitDate: string | null;   // "YYYY-MM-DD" or null
  openTasks: number;
  openIncidents: number;
  compliancePct: number | null;   // 0-100 or null if no forms
  loading: boolean;
}

const EMPTY: EChartStats = {
  lastVisitDate: null,
  nextVisitDate: null,
  openTasks: 0,
  openIncidents: 0,
  compliancePct: null,
  loading: true,
};

/** Format a YYYY-MM-DD date string to "May 25" style for display */
export function fmtVisitDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function useEChartStats(individualId: string | undefined): EChartStats {
  const [stats, setStats] = useState<EChartStats>(EMPTY);

  useEffect(() => {
    if (!individualId) {
      setStats({ ...EMPTY, loading: false });
      return;
    }

    // Track completion of all 4 async listeners
    let lastVisitDate: string | null = null;
    let nextVisitDate: string | null = null;
    let openTasks = 0;
    let openIncidents = 0;
    let compliancePct: number | null = null;
    let done = 0;
    const TOTAL = 4;

    function flush() {
      done++;
      if (done >= TOTAL) {
        setStats({
          lastVisitDate,
          nextVisitDate,
          openTasks,
          openIncidents,
          compliancePct,
          loading: false,
        });
      }
    }

    // ── 1. LAST VISIT: most recent visit_summary ──────────────────────────────
    const visitQ = query(
      collection(db, "visit_summaries"),
      where("individual_id", "==", individualId),
      orderBy("visit_date", "desc"),
      limit(1)
    );
    const unsubVisit = onSnapshot(
      visitQ,
      (snap) => {
        if (!snap.empty) {
          lastVisitDate = snap.docs[0].data().visit_date ?? null;
        } else {
          lastVisitDate = null;
        }
        flush();
      },
      () => { flush(); }
    );

    // ── 2. OPEN TASKS: open or in_progress workflow_tasks ────────────────────
    // workflow_tasks uses individual_id (snake_case)
    const tasksQ = query(
      collection(db, "workflow_tasks"),
      where("individual_id", "==", individualId),
    );
    const unsubTasks = onSnapshot(
      tasksQ,
      (snap) => {
        // Count open/in_progress tasks; also find the soonest future due_date for NEXT VISIT
        let count = 0;
        let soonestFuture: string | null = null;
        const today = new Date().toISOString().slice(0, 10);
        snap.docs.forEach((d) => {
          const data = d.data();
          const status = data.status ?? "";
          if (status === "open" || status === "in_progress") {
            count++;
            const due = data.due_date ?? "";
            if (due >= today) {
              if (!soonestFuture || due < soonestFuture) soonestFuture = due;
            }
          }
        });
        openTasks = count;
        nextVisitDate = soonestFuture;
        flush();
      },
      () => { flush(); }
    );

    // ── 3. OPEN INCIDENTS: open incidents ────────────────────────────────────
    // "incidents" collection uses individualId (camelCase)
    const incQ = query(
      collection(db, "incidents"),
      where("individualId", "==", individualId),
    );
    const unsubInc = onSnapshot(
      incQ,
      (snap) => {
        let count = 0;
        snap.docs.forEach((d) => {
          const s = d.data().status ?? "";
          if (s === "open" || s === "in_review") count++;
        });
        openIncidents = count;
        flush();
      },
      () => { flush(); }
    );

    // ── 4. COMPLIANCE: % of monitoring_forms that are "Submitted" ────────────
    const mfQ = query(
      collection(db, "monitoring_forms"),
      where("individual_id", "==", individualId)
    );
    const unsubMf = onSnapshot(
      mfQ,
      (snap) => {
        if (snap.empty) {
          compliancePct = null;
        } else {
          const total = snap.size;
          const submitted = snap.docs.filter(
            (d) => (d.data().status ?? "").toLowerCase() === "submitted"
          ).length;
          compliancePct = Math.round((submitted / total) * 100);
        }
        flush();
      },
      () => { flush(); }
    );

    return () => {
      unsubVisit();
      unsubTasks();
      unsubInc();
      unsubMf();
    };
  }, [individualId]);

  return stats;
}
