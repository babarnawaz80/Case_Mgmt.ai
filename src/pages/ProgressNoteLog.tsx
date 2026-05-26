import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { Plus, Eye, Printer, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useIndividuals } from "@/hooks/useIndividuals";
import { useAllProgressNotes, updateProgressNote } from "@/hooks/useProgressNotes";
import { AuthorCell } from "@/components/icm/AuthorCell";

const ProgressNoteLog = () => {
  const navigate = useNavigate();
  const { notes, loading } = useAllProgressNotes();
  const { individuals } = useIndividuals();

  // Filter state
  const [personFilter, setPersonFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activityFilter, setActivityFilter] = useState("");
  const [caseManagerFilter, setCaseManagerFilter] = useState("");

  const handleVoid = async (id: string) => {
    try {
      await updateProgressNote(id, { status: "void" });
      toast.success("Progress note voided successfully", {
        description: "Note marked as void for regulatory compliance compliance audits."
      });
    } catch (err) {
      toast.error("Failed to void progress note", { description: (err as Error).message });
    }
  };

  const personName = (pid: string) => {
    const p = individuals.find((x) => x.id === pid);
    return p ? `${p.first_name} ${p.last_name}` : "—";
  };

  const anyFilterActive = !!(personFilter || dateFrom || dateTo || statusFilter || activityFilter || caseManagerFilter);

  const uniqueActivityTypes = useMemo(
    () => Array.from(new Set(notes.map((n) => n.activityType).filter(Boolean))).sort(),
    [notes],
  );

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (personFilter && !personName(n.individualId).toLowerCase().includes(personFilter.toLowerCase())) return false;
      if (dateFrom && (n.progressDate || "") < dateFrom) return false;
      if (dateTo && (n.progressDate || "") > dateTo) return false;
      if (statusFilter && n.status !== statusFilter) return false;
      if (activityFilter && n.activityType !== activityFilter) return false;
      if (caseManagerFilter && !(n.authorName || "").toLowerCase().includes(caseManagerFilter.toLowerCase())) return false;
      return true;
    });
  }, [notes, personFilter, dateFrom, dateTo, statusFilter, activityFilter, caseManagerFilter, individuals]);

  const clearFilters = () => {
    setPersonFilter("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("");
    setActivityFilter("");
    setCaseManagerFilter("");
  };

  const getStatusStyle = (status: string) => {
    if (status === "signed") return "bg-icm-green-soft text-icm-green";
    if (status === "pending_signature") return "bg-icm-accent-soft text-icm-accent";
    if (status === "void") return "bg-icm-red-soft text-icm-red";
    return "bg-icm-amber-soft text-icm-amber";
  };

  const getStatusLabel = (status: string) => {
    if (status === "signed") return "Signed";
    if (status === "pending_signature") return "Pending Signature";
    if (status === "void") return "Void";
    return "Draft";
  };

  return (
    <ICMShell title="Progress Note" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Progress Note" }]} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-tight text-[24px] font-semibold text-icm-text leading-tight tracking-[-0.02em]">
              Progress Note
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1">
              Log of all progress notes across individuals.
            </p>
          </div>
          <button
            onClick={() => navigate("/progress-note/new")}
            className="h-9 px-3.5 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-medium flex items-center gap-1.5 hover:bg-teal-700 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> New Progress Note
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Total", value: notes.length, cls: "bg-icm-bg text-icm-text-dim ring-icm-border" },
            { label: "Draft", value: notes.filter((n) => n.status === "draft").length, cls: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20" },
            { label: "Pending Signature", value: notes.filter((n) => n.status === "pending_signature").length, cls: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20" },
            { label: "Signed", value: notes.filter((n) => n.status === "signed").length, cls: "bg-icm-green-soft text-icm-green ring-icm-green/20" },
            { label: "Void", value: notes.filter((n) => n.status === "void").length, cls: "bg-icm-red-soft text-icm-red ring-icm-red/20" },
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
              <option value="pending_signature">Pending Signature</option>
              <option value="signed">Signed</option>
              <option value="void">Void</option>
            </select>
          </div>
          <div>
            <p className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide mb-1">Activity Type</p>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:border-icm-accent focus:outline-none"
            >
              <option value="">All</option>
              {uniqueActivityTypes.map((a) => <option key={a} value={a}>{a}</option>)}
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

        <div className="rounded-[12px] border border-icm-border bg-icm-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[12px] font-geist">
              <thead className="bg-icm-bg text-icm-text-dim uppercase tracking-wide text-[10px]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium">Person</th>
                  <th className="text-left px-4 py-2.5 font-medium">Activity Type</th>
                  <th className="text-left px-4 py-2.5 font-medium">Billable</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium">Author / Roster</th>
                  <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-icm-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-icm-text-dim">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-icm-accent" />
                        <span>Loading progress notes…</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-icm-text-faint">
                      {notes.length === 0 ? "No progress notes yet." : "No notes match the current filters."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((n) => (
                    <tr key={n.id} className="hover:bg-icm-bg/60">
                      <td className="px-4 py-3 font-mono text-icm-text">{n.progressDate}</td>
                      <td className="px-4 py-3 text-icm-text font-medium">{personName(n.individualId)}</td>
                      <td className="px-4 py-3 text-icm-text-dim">{n.activityType}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                            n.isBillable ? "bg-icm-green-soft text-icm-green" : "bg-icm-bg text-icm-text-dim"
                          }`}
                        >
                          {n.isBillable ? "Billable" : "Non-billable"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${getStatusStyle(n.status)}`}
                        >
                          {getStatusLabel(n.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <AuthorCell name={n.authorName} size="sm" showName={true} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => navigate(`/people/${n.individualId}/progress-note/${n.id}`)}
                            className="w-7 h-7 rounded-md hover:bg-icm-bg text-icm-text-dim hover:text-icm-text flex items-center justify-center"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toast.success("Print job started", { description: `Preparing clinical note PDF for ${n.id}` })}
                            className="w-7 h-7 rounded-md hover:bg-icm-bg text-icm-text-dim hover:text-icm-text flex items-center justify-center"
                            title="Print"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {n.status !== "void" && (
                            <button
                              onClick={() => handleVoid(n.id)}
                              className="w-7 h-7 rounded-md hover:bg-icm-red-soft text-icm-text-dim hover:text-icm-red flex items-center justify-center"
                              title="Void"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-icm-border bg-icm-bg/30 flex items-center justify-between">
            <span className="text-[10.5px] font-geist text-icm-text-faint">
              {filtered.length} note{filtered.length !== 1 ? "s" : ""}{anyFilterActive ? ` (filtered from ${notes.length})` : " total"}
            </span>
            <span className="text-[10px] font-mono text-icm-text-faint">Live Firestore</span>
          </div>
        </div>
      </div>
    </ICMShell>
  );
};

export default ProgressNoteLog;
