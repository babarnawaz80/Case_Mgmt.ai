import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Individual } from "@/hooks/useIndividuals";
import { getDocs, query, collection, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface StateRow {
  state: string;
  count: number;
  atRisk: number;
  compliant: number;
  engineName: string | null;
  engineId: string | null;
}

interface Props {
  individuals: Individual[];
  selectedState: string;
}

export function StateComplianceBreakdown({ individuals, selectedState }: Props) {
  const navigate = useNavigate();
  const [engines, setEngines] = useState<Record<string, { name: string; id: string } | null>>({});

  // Build per-state rows
  const rows = useMemo((): StateRow[] => {
    const today = new Date();
    const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const stateMap: Record<string, { count: number; atRisk: number }> = {};
    for (const ind of individuals) {
      if (ind.enrollment_status !== "active") continue;
      const state = ind.state || (ind as any).address_state || "Unknown";
      if (!stateMap[state]) stateMap[state] = { count: 0, atRisk: 0 };
      stateMap[state].count++;
      const pcpDate = ind.pcp_due_date ?? ind.isp_due_date;
      const maDate = (ind as any).ma_redetermination_date;
      if ((pcpDate && new Date(pcpDate) < thirtyDays) ||
          (maDate && new Date(maDate) < thirtyDays) ||
          (ind.last_visit_date && (today.getTime() - new Date(ind.last_visit_date).getTime()) > 75 * 24 * 60 * 60 * 1000)) {
        stateMap[state].atRisk++;
      }
    }

    return Object.entries(stateMap).sort(([a], [b]) => a.localeCompare(b)).map(([state, data]) => ({
      state,
      count: data.count,
      atRisk: data.atRisk,
      compliant: data.count - data.atRisk,
      engineName: engines[state]?.name ?? null,
      engineId: engines[state]?.id ?? null,
    }));
  }, [individuals, engines]);

  // Load engines for all states
  useEffect(() => {
    const states = [...new Set(individuals
      .filter(i => i.enrollment_status === "active")
      .map(i => i.state || (i as any).address_state)
      .filter(Boolean)
    )];
    if (states.length === 0) return;

    (async () => {
      const newEngines: Record<string, { name: string; id: string } | null> = {};
      for (const state of states) {
        try {
          const snap = await getDocs(
            query(collection(db, "guidelines_engines"),
              where("state", "==", state), where("status", "==", "published"))
          );
          newEngines[state] = snap.empty ? null : { name: snap.docs[0].data().name, id: snap.docs[0].id };
        } catch { newEngines[state] = null; }
      }
      setEngines(newEngines);
    })();
  }, [individuals]);

  if (rows.length <= 1) return null; // Only show when multi-state

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
          const isSelected = selectedState !== "all" && selectedState !== row.state;
          return (
            <div key={row.state} className={cn("space-y-1", isSelected && "opacity-40")}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-geist font-semibold text-[12.5px] text-icm-text w-24 shrink-0">{row.state}</span>
                <div className="flex-1 min-w-[120px] h-3 bg-icm-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: pct >= 85 ? "#22c55e" : pct >= 70 ? "#f59e0b" : "#ef4444" }} />
                </div>
                <span className={cn("text-[12px] font-mono font-bold w-10 text-right",
                  pct >= 85 ? "text-icm-green" : pct >= 70 ? "text-icm-amber" : "text-icm-red")}>
                  {pct}%
                </span>
                <span className="text-[11px] font-geist text-icm-text-faint w-20">{row.count} individuals</span>
                {row.engineName ? (
                  <button
                    onClick={() => row.engineId && navigate(`/agents/guidelines/${row.engineId}`)}
                    className="inline-flex items-center gap-1 text-[10.5px] font-geist font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-100 transition-colors truncate max-w-[200px]"
                    title={row.engineName}
                  >
                    <span className="text-[9px]">✦</span>
                    <span className="truncate">{row.engineName}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/agents/guidelines/new")}
                    className="inline-flex items-center gap-1 text-[10.5px] font-geist font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded hover:bg-amber-100 transition-colors"
                  >
                    <AlertTriangle className="w-3 h-3" /> No engine
                  </button>
                )}
              </div>
              {row.atRisk > 0 && (
                <p className="text-[10.5px] font-geist text-icm-text-faint ml-[108px]">
                  {row.atRisk} at risk · {row.compliant} on track
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
