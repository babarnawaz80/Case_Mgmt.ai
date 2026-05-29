import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Download, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Individual } from "@/hooks/useIndividuals";
import { type OrchestratorTask } from "@/hooks/useOrchestrator";

interface IndividualComplianceGridProps {
  individuals: Individual[];
  tasks: OrchestratorTask[];
  loading: boolean;
}

type SortField = "compliance_score" | "last_visit_date" | "name" | "pcp_due";
type SortDir = "asc" | "desc";

function tierColor(score?: number): string {
  if (!score && score !== 0) return "text-icm-text-faint";
  if (score >= 90) return "text-icm-green";
  if (score >= 70) return "text-icm-amber";
  return "text-icm-red";
}

function tierBg(score?: number): string {
  if (!score && score !== 0) return "bg-icm-bg text-icm-text-faint border border-icm-border";
  if (score >= 90) return "bg-icm-green-soft text-icm-green";
  if (score >= 70) return "bg-icm-amber-soft text-icm-amber";
  return "bg-icm-red-soft text-icm-red";
}

function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function IndividualComplianceGrid({
  individuals,
  tasks,
  loading,
}: IndividualComplianceGridProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>("compliance_score");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");
  const [cmFilter, setCmFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState<"all" | "green" | "amber" | "red">("all");

  // Build task counts per individual
  const taskCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status === "pending" || t.status === "acknowledged") {
        map[t.individual_id] = (map[t.individual_id] ?? 0) + 1;
      }
    }
    return map;
  }, [tasks]);

  const draftCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tasks) {
      if (t.has_ai_draft && t.status === "pending") {
        map[t.individual_id] = (map[t.individual_id] ?? 0) + 1;
      }
    }
    return map;
  }, [tasks]);

  // Unique CMs
  const cms = useMemo(() => {
    const names = new Set<string>();
    for (const ind of individuals) {
      if (ind.assigned_case_manager_name) names.add(ind.assigned_case_manager_name);
    }
    return Array.from(names).sort();
  }, [individuals]);

  // Filter + sort
  const sorted = useMemo(() => {
    let list = individuals.filter((i) => {
      const name = `${i.first_name} ${i.last_name}`.toLowerCase();
      if (search && !name.includes(search.toLowerCase())) return false;
      if (cmFilter !== "all" && i.assigned_case_manager_name !== cmFilter) return false;
      if (tierFilter !== "all") {
        const score = i.compliance_score;
        if (tierFilter === "green" && !(score !== undefined && score >= 90)) return false;
        if (tierFilter === "amber" && !(score !== undefined && score >= 70 && score < 90)) return false;
        if (tierFilter === "red" && !(score !== undefined && score < 70)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      if (sortField === "compliance_score") {
        va = a.compliance_score ?? 101; // unscored sorts last in ascending
        vb = b.compliance_score ?? 101;
      } else if (sortField === "last_visit_date") {
        va = a.last_visit_date ?? "";
        vb = b.last_visit_date ?? "";
      } else if (sortField === "name") {
        va = `${a.last_name} ${a.first_name}`;
        vb = `${b.last_name} ${b.first_name}`;
      } else if (sortField === "pcp_due") {
        va = a.pcp_due_date ?? a.isp_due_date ?? "";
        vb = b.pcp_due_date ?? b.isp_due_date ?? "";
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [individuals, search, cmFilter, tierFilter, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-icm-text-faint ml-1 shrink-0" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-icm-accent ml-1 shrink-0" />
    ) : (
      <ChevronDown className="w-3 h-3 text-icm-accent ml-1 shrink-0" />
    );
  }

  function exportCsv() {
    const headers = ["Name", "Case Manager", "Program", "Compliance Score", "Last Visit", "PCP Due", "Open Tasks", "AI Drafts"];
    const rows = sorted.map((i) => [
      `${i.first_name} ${i.last_name}`,
      i.assigned_case_manager_name ?? "",
      i.program ?? "",
      i.compliance_score ?? "",
      i.last_visit_date ?? "",
      i.pcp_due_date ?? i.isp_due_date ?? "",
      taskCounts[i.id] ?? 0,
      draftCounts[i.id] ?? 0,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-icm-border flex flex-wrap items-center gap-3">
        <p className="font-manrope font-bold text-[13px] text-icm-text flex-1">
          Individual Compliance Grid
        </p>
        <button
          onClick={exportCsv}
          className="h-7 px-2.5 rounded-lg border border-icm-border bg-icm-bg text-[11px] font-geist font-semibold text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong transition-colors inline-flex items-center gap-1.5"
        >
          <Download className="w-3 h-3" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="px-4 py-2.5 border-b border-icm-border flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 px-2.5 rounded-lg border border-icm-border bg-icm-bg text-[11.5px] font-geist text-icm-text placeholder:text-icm-text-faint w-44 focus:outline-none focus:border-icm-accent"
        />
        <select
          value={cmFilter}
          onChange={(e) => setCmFilter(e.target.value)}
          className="h-7 px-2 rounded-lg border border-icm-border bg-icm-bg text-[11.5px] font-geist text-icm-text"
        >
          <option value="all">All CMs</option>
          {cms.map((cm) => (
            <option key={cm} value={cm}>{cm}</option>
          ))}
        </select>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as any)}
          className="h-7 px-2 rounded-lg border border-icm-border bg-icm-bg text-[11.5px] font-geist text-icm-text"
        >
          <option value="all">All tiers</option>
          <option value="green">90-100% (On track)</option>
          <option value="amber">70-89% (Attention)</option>
          <option value="red">Below 70% (At risk)</option>
        </select>
        <span className="text-[10.5px] font-geist text-icm-text-faint ml-auto">
          {sorted.length} individuals
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-icm-bg animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[12px] font-geist text-icm-text-dim">No individuals match your filters.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-icm-border bg-icm-bg">
                <Th onClick={() => toggleSort("name")}>
                  Individual <SortIcon field="name" />
                </Th>
                <Th>Case Manager</Th>
                <Th>Program</Th>
                <Th onClick={() => toggleSort("compliance_score")}>
                  Compliance <SortIcon field="compliance_score" />
                </Th>
                <Th onClick={() => toggleSort("last_visit_date")}>
                  Last Visit <SortIcon field="last_visit_date" />
                </Th>
                <Th onClick={() => toggleSort("pcp_due")}>
                  PCP Due <SortIcon field="pcp_due" />
                </Th>
                <Th>Tasks</Th>
                <Th>Drafts</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((ind) => {
                const daysLastVisit = daysSince(ind.last_visit_date);
                const pcpDue = ind.pcp_due_date ?? ind.isp_due_date;
                const daysPcp = daysUntil(pcpDue);
                const openTasks = taskCounts[ind.id] ?? 0;
                const aiDrafts = draftCounts[ind.id] ?? 0;
                const hasCritical =
                  typeof ind.compliance_score === "number" && ind.compliance_score < 70;

                return (
                  <tr
                    key={ind.id}
                    className="border-b border-icm-border hover:bg-icm-panel/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/people/${ind.id}/echart`)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {hasCritical && (
                          <AlertTriangle className="w-3.5 h-3.5 text-icm-red shrink-0" />
                        )}
                        <span className="text-[12px] font-geist font-semibold text-icm-text hover:text-icm-accent transition-colors">
                          {ind.first_name} {ind.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[11.5px] font-geist text-icm-text-dim">
                        {ind.assigned_case_manager_name ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[11px] font-mono text-icm-text-faint">
                        {ind.program ?? ind.program_type ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {typeof ind.compliance_score === "number" ? (
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-geist font-bold",
                            tierBg(ind.compliance_score)
                          )}
                        >
                          {ind.compliance_score}%
                        </span>
                      ) : (
                        <span className="text-[11px] font-geist text-icm-text-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {daysLastVisit !== null ? (
                        <span
                          className={cn(
                            "text-[11.5px] font-geist",
                            daysLastVisit > 90 ? "text-icm-red font-semibold" : daysLastVisit > 60 ? "text-icm-amber" : "text-icm-text-dim"
                          )}
                        >
                          {daysLastVisit}d ago
                        </span>
                      ) : (
                        <span className="text-[11px] text-icm-text-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {daysPcp !== null ? (
                        <span
                          className={cn(
                            "text-[11.5px] font-geist",
                            daysPcp < 0 ? "text-icm-red font-semibold" : daysPcp <= 30 ? "text-icm-amber font-semibold" : "text-icm-text-dim"
                          )}
                        >
                          {daysPcp < 0 ? `${Math.abs(daysPcp)}d overdue` : `${daysPcp}d`}
                        </span>
                      ) : (
                        <span className="text-[11px] text-icm-text-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {openTasks > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-icm-accent-soft text-icm-accent text-[10.5px] font-geist font-bold">
                          {openTasks}
                        </span>
                      ) : (
                        <span className="text-[11px] text-icm-text-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {aiDrafts > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-icm-green-soft text-icm-green text-[10.5px] font-geist font-bold">
                          {aiDrafts}
                        </span>
                      ) : (
                        <span className="text-[11px] text-icm-text-faint">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <th
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim whitespace-nowrap",
        onClick && "cursor-pointer hover:text-icm-text select-none"
      )}
    >
      <span className="inline-flex items-center">{children}</span>
    </th>
  );
}
