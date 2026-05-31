import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Individual } from "@/hooks/useIndividuals";
import { getDocs, query, collection, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { individualState, stateDisplayLabel } from "@/lib/stateUtils";

/** Returns a display label for a canonical state value */
function stateLabel(canonical: string): string {
  return stateDisplayLabel(canonical);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface StateRow {
  state: string;
  count: number;
  atRisk: number;
  compliant: number;
  engineName: string | null;
  engineId: string | null;
  engineLoading: boolean;
}

interface Props {
  individuals: Individual[];
  selectedState: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StateComplianceBreakdown({ individuals, selectedState }: Props) {
  const navigate = useNavigate();
  const [engines, setEngines] = useState<Record<string, { name: string; id: string } | null | "loading">>({});

  // Program enrollment state (NOT residence), canonicalized ("IN" → "Indiana")
  function indState(ind: Individual): string | null {
    return individualState(ind);
  }

  // Count individuals with NO valid state
  const unassignedCount = useMemo(() =>
    individuals.filter(i => i.enrollment_status === "active" && !indState(i)).length,
  [individuals]);

  // Build per-state rows — SKIP null/empty states (no "Unknown" bucket)
  const rows = useMemo((): StateRow[] => {
    const today = new Date();
    const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const stateMap: Record<string, { count: number; atRisk: number }> = {};
    for (const ind of individuals) {
      if (ind.enrollment_status !== "active") continue;
      const state = indState(ind);
      if (!state) continue; // skip unassigned — they're captured in unassignedCount

      if (!stateMap[state]) stateMap[state] = { count: 0, atRisk: 0 };
      stateMap[state].count++;

      const pcpDate = ind.pcp_due_date ?? ind.isp_due_date;
      const maDate = (ind as any).ma_redetermination_date;
      if (
        (pcpDate && new Date(pcpDate) < thirtyDays) ||
        (maDate && new Date(maDate) < thirtyDays) ||
        (ind.last_visit_date && (today.getTime() - new Date(ind.last_visit_date).getTime()) > 75 * 24 * 60 * 60 * 1000)
      ) {
        stateMap[state].atRisk++;
      }
    }

    return Object.entries(stateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([state, data]) => ({
        state,
        count: data.count,
        atRisk: data.atRisk,
        compliant: data.count - data.atRisk,
        engineName: engines[state] === "loading" ? null : (engines[state] as any)?.name ?? null,
        engineId:   engines[state] === "loading" ? null : (engines[state] as any)?.id ?? null,
        engineLoading: engines[state] === "loading",
      }));
  }, [individuals, engines]);

  // Load published engines for all distinct known states
  useEffect(() => {
    const states = [...new Set(
      individuals
        .filter(i => i.enrollment_status === "active")
        .map(i => indState(i))
        .filter((s): s is string => !!s)
    )];
    if (states.length === 0) return;

    // Mark as loading
    setEngines(prev => {
      const next = { ...prev };
      for (const s of states) if (!(s in next)) next[s] = "loading";
      return next;
    });

    (async () => {
      const newEngines: Record<string, { name: string; id: string } | null> = {};
      for (const state of states) {
        try {
          // Engines may be stored under the full name ("Indiana") OR the
          // abbreviation ("IN"). Try both. No orderBy (avoids composite-index
          // requirement) — we sort newest-first client-side instead.
          const abbrMap: Record<string, string> = { "Indiana": "IN", "New Jersey": "NJ" };
          const candidates = [state, abbrMap[state]].filter(Boolean) as string[];

          let found: { name: string; id: string } | null = null;
          for (const candidate of candidates) {
            const snap = await getDocs(
              query(
                collection(db, "guidelines_engines"),
                where("state", "==", candidate),
                where("status", "==", "published")
              )
            );
            if (!snap.empty) {
              // Pick the most recent by effectiveDate (client-side sort)
              const docs = snap.docs
                .map(d => ({ id: d.id, ...(d.data() as any) }))
                .sort((a, b) => String(b.effectiveDate ?? "").localeCompare(String(a.effectiveDate ?? "")));
              found = { name: docs[0].name ?? candidate, id: docs[0].id };
              break;
            }
          }
          newEngines[state] = found;
        } catch {
          newEngines[state] = null;
        }
      }
      setEngines(prev => ({ ...prev, ...newEngines }));
    })();
  }, [individuals]); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render if we have no state data at all
  if (rows.length === 0 && unassignedCount === 0) return null;

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
      <div className="px-4 py-3 border-b border-icm-border bg-icm-bg/60">
        <p className="font-manrope font-bold text-[14px] text-icm-text">Compliance by State</p>
        <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
          Multi-state caseload overview — guidelines engine per state
        </p>
      </div>
      <div className="p-4 space-y-3">
        {rows.map(row => {
          const pct = row.count > 0 ? Math.round((row.compliant / row.count) * 100) : 100;
          // When a specific state is selected, dim the other rows
          const isDimmed = selectedState !== "all" && selectedState !== row.state;
          return (
            <div key={row.state} className={cn("space-y-1 transition-opacity", isDimmed && "opacity-30")}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-geist font-semibold text-[12.5px] text-icm-text w-36 shrink-0">
                  {stateLabel(row.state)}
                </span>
                <div className="flex-1 min-w-[120px] h-3 bg-icm-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: pct >= 85 ? "#22c55e" : pct >= 70 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </div>
                <span className={cn(
                  "text-[12px] font-mono font-bold w-10 text-right",
                  pct >= 85 ? "text-icm-green" : pct >= 70 ? "text-icm-amber" : "text-icm-red",
                )}>
                  {pct}%
                </span>
                <span className="text-[11px] font-geist text-icm-text-faint w-24">
                  {row.count} individual{row.count !== 1 ? "s" : ""}
                </span>

                {/* Engine chip */}
                {row.engineLoading ? (
                  <span className="text-[10.5px] font-geist text-icm-text-faint px-2 py-0.5 rounded border border-icm-border">
                    Loading…
                  </span>
                ) : row.engineName ? (
                  <button
                    onClick={() => row.engineId && navigate(`/agents/guidelines/${row.engineId}`)}
                    className="inline-flex items-center gap-1 text-[10.5px] font-geist font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-100 transition-colors truncate max-w-[220px]"
                    title={row.engineName}
                  >
                    <span className="text-[9px]">✦</span>
                    <span className="truncate">{row.engineName}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/agents/guidelines/new")}
                    title={`No published compliance engine for ${stateLabel(row.state)}. Create one in Platform → Guidelines Engines.`}
                    className="inline-flex items-center gap-1 text-[10.5px] font-geist font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded hover:bg-amber-100 transition-colors"
                  >
                    <AlertTriangle className="w-3 h-3" /> No engine
                  </button>
                )}
              </div>
              {row.atRisk > 0 && (
                <p className="text-[10.5px] font-geist text-icm-text-faint ml-[156px]">
                  {row.atRisk} at risk · {row.compliant} on track
                </p>
              )}
            </div>
          );
        })}

        {/* Warning for unassigned individuals — no "Unknown" row */}
        {unassignedCount > 0 && (
          <div className="mt-2 pt-3 border-t border-icm-border flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11.5px] font-geist text-amber-700">
              <strong>{unassignedCount} individual{unassignedCount !== 1 ? "s" : ""}</strong> {unassignedCount !== 1 ? "have" : "has"} no state assigned and {unassignedCount !== 1 ? "are" : "is"} excluded from compliance tracking.{" "}
              <button
                onClick={() => navigate("/people?filter=no_state")}
                className="underline hover:no-underline font-semibold"
              >
                Review unassigned individuals →
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
