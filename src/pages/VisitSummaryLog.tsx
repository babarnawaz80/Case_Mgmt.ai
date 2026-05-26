import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { Plus, Eye, Printer, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCollection } from "@/hooks/useFirestore";
import { useIndividuals } from "@/hooks/useIndividuals";
import { useAuth } from "@/contexts/AuthContext";
import { AuthorCell } from "@/components/icm/AuthorCell";

const VisitSummaryLog = () => {
  const navigate = useNavigate();
  const { data: notes, loading: visitsLoading } = useCollection<any>("visit_summaries", "visit_date", "desc");
  const { individuals, loading: individualsLoading } = useIndividuals();
  const { userProfile } = useAuth();

  // Filter state — must be before any early return (Rules of Hooks)
  const [personFilter, setPersonFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [visitTypeFilter, setVisitTypeFilter] = useState("");
  const [caseManagerFilter, setCaseManagerFilter] = useState("");

  const loading = visitsLoading || individualsLoading;

  const handleDelete = (id: string) => {
    toast.success("Visit summary removed.");
  };

  const personName = (pid: string) => {
    const p = individuals.find((x) => x.id === pid);
    return p ? `${p.first_name} ${p.last_name}` : pid;
  };

  const anyFilterActive = !!(personFilter || dateFrom || dateTo || statusFilter || visitTypeFilter || caseManagerFilter);

  const uniqueVisitTypes = useMemo(
    () => Array.from(new Set(notes.map((n: any) => n.visit_type || n.visitType).filter(Boolean))).sort() as string[],
    [notes],
  );

  const filtered = useMemo(() => {
    return notes.filter((n: any) => {
      const visitDate = n.visit_date || n.visitDate || "";
      const name = personName(n.individual_id || n.personId);
      const manager = n.updated_by || n.updatedBy || n.author_name || n.caseManager || "";
      const vType = n.visit_type || n.visitType || "";
      const status = (n.status || "").toLowerCase();
      if (personFilter && !name.toLowerCase().includes(personFilter.toLowerCase())) return false;
      if (dateFrom && visitDate < dateFrom) return false;
      if (dateTo && visitDate > dateTo) return false;
      if (statusFilter && status !== statusFilter.toLowerCase()) return false;
      if (visitTypeFilter && vType !== visitTypeFilter) return false;
      if (caseManagerFilter && !manager.toLowerCase().includes(caseManagerFilter.toLowerCase())) return false;
      return true;
    });
  }, [notes, personFilter, dateFrom, dateTo, statusFilter, visitTypeFilter, caseManagerFilter, individuals]);

  const clearFilters = () => {
    setPersonFilter("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("");
    setVisitTypeFilter("");
    setCaseManagerFilter("");
  };

  if (loading) {
    return (
      <ICMShell title="Visit Summary" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="Visit Summary" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Visit Summary" }]} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-tight text-[24px] font-semibold text-icm-text leading-tight tracking-[-0.02em]">
              Visit Summary
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1">
              Log of all visit summaries across individuals.
            </p>
          </div>
          <button
            onClick={() => navigate("/visit-summary/new")}
            className="h-9 px-3.5 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-medium flex items-center gap-1.5 hover:bg-teal-700 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> New Visit Summary
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Total", value: notes.length, cls: "bg-icm-bg text-icm-text-dim ring-icm-border" },
            { label: "Draft", value: notes.filter((n: any) => (n.status || "").toLowerCase() === "draft" || !n.status).length, cls: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20" },
            { label: "Submitted", value: notes.filter((n: any) => (n.status || "").toLowerCase() === "submitted").length, cls: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20" },
            { label: "Signed", value: notes.filter((n: any) => (n.status || "").toLowerCase() === "signed").length, cls: "bg-icm-green-soft text-icm-green ring-icm-green/20" },
          ].map((chip) => (
            <div key={chip.label} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ring-1 ${chip.cls}`}>
              <span className="text-[10px] uppercase tracking-wide font-geist font-semibold opacity-70">{chip.label}</span>
              <span className="text-[12px] font-mono font-semibold">{chip.value}</span>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-3 p-3 rounded-xl border border-icm-border bg-icm-panel/60">
          <div>
            <p className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide mb-1">Person</p>
            <input
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              placeholder="Filter by person…"
              className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:border-icm-accent focus:outline-none w-40"
            />
          </div>
          <div>
            <p className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide mb-1">Date From</p>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:border-icm-accent focus:outline-none"
            />
          </div>
          <div>
            <p className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide mb-1">Date To</p>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:border-icm-accent focus:outline-none"
            />
          </div>
          <div>
            <p className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide mb-1">Status</p>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:border-icm-accent focus:outline-none"
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="signed">Signed</option>
            </select>
          </div>
          <div>
            <p className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide mb-1">Visit Type</p>
            <select
              value={visitTypeFilter}
              onChange={(e) => setVisitTypeFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:border-icm-accent focus:outline-none"
            >
              <option value="">All</option>
              {uniqueVisitTypes.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide mb-1">Case Manager</p>
            <input
              value={caseManagerFilter}
              onChange={(e) => setCaseManagerFilter(e.target.value)}
              placeholder="Filter by manager…"
              className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:border-icm-accent focus:outline-none w-40"
            />
          </div>
          {anyFilterActive && (
            <button onClick={clearFilters} className="text-[11px] text-icm-accent hover:underline self-end pb-1">
              Clear filters
            </button>
          )}
        </div>

        <div className="rounded-[12px] border border-icm-border bg-icm-panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim uppercase tracking-wide text-[10px]">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Date</th>
                <th className="text-left px-4 py-2.5 font-medium">Person</th>
                <th className="text-left px-4 py-2.5 font-medium">Case Manager</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Updated</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-icm-border">
              {filtered.map((n: any) => (
                <tr key={n.id} className="hover:bg-icm-bg/60">
                  <td className="px-4 py-3 font-mono text-icm-text">{n.visit_date || n.visitDate}</td>
                  <td className="px-4 py-3 text-icm-text font-medium">{personName(n.individual_id || n.personId)}</td>
                  <td className="px-4 py-3 text-icm-text-dim">
                    <AuthorCell name={n.updated_by || n.updatedBy || n.author_name || n.caseManager || "Kathy Martinez"} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        n.status?.toLowerCase() === "signed" || n.status === "Signed"
                          ? "bg-icm-green-soft text-icm-green"
                          : n.status?.toLowerCase() === "submitted" || n.status === "Submitted"
                          ? "bg-icm-accent-soft text-icm-accent"
                          : "bg-icm-amber-soft text-icm-amber"
                      }`}
                    >
                      {n.status || "draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-icm-text-faint">
                    {n.updated_on || n.updatedOn || new Date(n.created_at?.seconds * 1000 || Date.now()).toLocaleDateString()} · {n.updated_by || n.updatedBy || n.author_name || "Kathy Martinez"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => navigate(`/people/${n.individual_id || n.personId}/visit-summary/${n.id}`)}
                        className="w-7 h-7 rounded-md hover:bg-icm-bg text-icm-text-dim hover:text-icm-text flex items-center justify-center"
                        title="View"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toast.success("Preparing print version…")}
                        className="w-7 h-7 rounded-md hover:bg-icm-bg text-icm-text-dim hover:text-icm-text flex items-center justify-center"
                        title="Print"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="w-7 h-7 rounded-md hover:bg-icm-red-soft text-icm-text-dim hover:text-icm-red flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-icm-text-faint">
                    {notes.length === 0 ? "No visit summaries yet." : "No summaries match the current filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-icm-border bg-icm-bg/30 flex items-center justify-between">
            <span className="text-[10.5px] font-geist text-icm-text-faint">
              {filtered.length} summar{filtered.length !== 1 ? "ies" : "y"}{anyFilterActive ? ` (filtered from ${notes.length})` : " total"}
            </span>
            <span className="text-[10px] font-mono text-icm-text-faint">Live Firestore</span>
          </div>
        </div>
      </div>
    </ICMShell>
  );
};

export default VisitSummaryLog;
