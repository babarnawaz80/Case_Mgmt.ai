import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { Plus, Eye, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCollection } from "@/hooks/useFirestore";
import { useAuth } from "@/contexts/AuthContext";
import { AuthorCell } from "@/components/icm/AuthorCell";

const MonitoringFormLog = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { data, loading } = useCollection<any>("monitoring_forms", "created_at", "desc");

  // Filter state
  const [personFilter, setPersonFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formTypeFilter, setFormTypeFilter] = useState("");
  const [caseManagerFilter, setCaseManagerFilter] = useState("");

  const anyFilterActive = !!(personFilter || dateFrom || dateTo || statusFilter || formTypeFilter || caseManagerFilter);

  const uniqueFormTypes = useMemo(
    () => Array.from(new Set(data.map((n: any) => n.type).filter(Boolean))).sort() as string[],
    [data],
  );

  const filtered = useMemo(() => {
    return data.filter((n: any) => {
      const indName = n.individual_name || n.individualName || "";
      const dueDate = n.due_date || n.dueDate || "";
      const status = (n.status || "").toLowerCase();
      const manager = n.updated_by || n.updatedBy || n.author_name || "";
      const fType = n.type || "";
      if (personFilter && !indName.toLowerCase().includes(personFilter.toLowerCase())) return false;
      if (dateFrom && dueDate < dateFrom) return false;
      if (dateTo && dueDate > dateTo) return false;
      if (statusFilter && status !== statusFilter.toLowerCase()) return false;
      if (formTypeFilter && fType !== formTypeFilter) return false;
      if (caseManagerFilter && !manager.toLowerCase().includes(caseManagerFilter.toLowerCase())) return false;
      return true;
    });
  }, [data, personFilter, dateFrom, dateTo, statusFilter, formTypeFilter, caseManagerFilter]);

  const clearFilters = () => {
    setPersonFilter("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("");
    setFormTypeFilter("");
    setCaseManagerFilter("");
  };

  const formatDate = (val: string | undefined) => {
    if (!val) return "—";
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const statusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "submitted") return "bg-icm-green-soft text-icm-green";
    if (s === "in progress") return "bg-icm-accent-soft text-icm-accent";
    return "bg-icm-amber-soft text-icm-amber";
  };

  return (
    <ICMShell title="Monitoring Forms" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs
          items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Monitoring Forms" }]}
        />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-manrope text-[24px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Monitoring Forms
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1">
              Global log of all monitoring forms across individuals.
            </p>
          </div>
          <button
            onClick={() => toast.info("Select an individual first to create a monitoring form", { description: "Navigate to a person's eChart → Monitoring Form." })}
            className="h-9 px-3.5 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-medium flex items-center gap-1.5 hover:bg-teal-700 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> New Monitoring Form
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Total", value: data.length, cls: "bg-icm-bg text-icm-text-dim ring-icm-border" },
            { label: "In Progress", value: data.filter((n: any) => (n.status || "").toLowerCase() === "in progress").length, cls: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20" },
            { label: "Submitted", value: data.filter((n: any) => (n.status || "").toLowerCase() === "submitted").length, cls: "bg-icm-green-soft text-icm-green ring-icm-green/20" },
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
            <p className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide mb-1">Due From</p>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:border-icm-accent focus:outline-none"
            />
          </div>
          <div>
            <p className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide mb-1">Due To</p>
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
              <option value="in progress">In Progress</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>
          <div>
            <p className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide mb-1">Form Type</p>
            <select
              value={formTypeFilter}
              onChange={(e) => setFormTypeFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:border-icm-accent focus:outline-none"
            >
              <option value="">All</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Monthly">Monthly</option>
              <option value="Annual">Annual</option>
              {uniqueFormTypes.filter((t) => !["Quarterly", "Monthly", "Annual"].includes(t)).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
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

        {/* Table — desktop */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-icm-text-dim">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[12px] font-geist">Loading monitoring forms…</span>
          </div>
        ) : (
          <>
            <div className="hidden sm:block rounded-[12px] border border-icm-border bg-icm-panel overflow-x-auto">
              <table className="w-full min-w-[860px] text-[12px] font-geist">
                <thead className="bg-icm-bg text-icm-text-dim uppercase tracking-wide text-[10px]">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Individual</th>
                    <th className="text-left px-4 py-2.5 font-medium">Type of Review</th>
                    <th className="text-left px-4 py-2.5 font-medium">Due Date</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium">Active</th>
                    <th className="text-left px-4 py-2.5 font-medium">Updated By</th>
                    <th className="text-left px-4 py-2.5 font-medium">Updated On</th>
                    <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-icm-border">
                  {filtered.map((n: any) => (
                    <tr key={n.id} className="hover:bg-icm-bg/60">
                      <td className="px-4 py-3 text-icm-text font-medium">
                        {n.individual_name || n.individualName || "—"}
                      </td>
                      <td className="px-4 py-3 text-icm-text-dim">{n.type || "—"}</td>
                      <td className="px-4 py-3 font-mono text-icm-text">{formatDate(n.due_date || n.dueDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${statusBadge(n.status)}`}>
                          {n.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${n.active ? "bg-icm-green-soft text-icm-green" : "bg-icm-bg text-icm-text-dim"}`}>
                          {n.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <AuthorCell name={n.updated_by || n.updatedBy || n.author_name || "—"} size="sm" showName={true} />
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-icm-text-faint">
                        {formatDate(n.updated_on || n.updatedOn)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              if (n.individual_id || n.individualId) {
                                navigate(`/people/${n.individual_id || n.individualId}/monitoring-form/${n.id}`);
                              } else {
                                toast.info("No individual linked to this form.");
                              }
                            }}
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
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-icm-text-faint">
                        {data.length === 0 ? "No monitoring forms yet." : "No forms match the current filters."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-icm-border bg-icm-bg/30 flex items-center justify-between">
                <span className="text-[10.5px] font-geist text-icm-text-faint">
                  {filtered.length} form{filtered.length !== 1 ? "s" : ""}{anyFilterActive ? ` (filtered from ${data.length})` : " total"} · Live Firestore
                </span>
                <span className="text-[10px] font-mono text-icm-text-faint">monitoring_forms</span>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {filtered.length === 0 && (
                <p className="text-center text-[12px] text-icm-text-faint py-8">
                  {data.length === 0 ? "No monitoring forms yet." : "No forms match the current filters."}
                </p>
              )}
              {filtered.map((n: any) => (
                <div key={n.id} className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-[13px] text-icm-text truncate">
                        {n.individual_name || n.individualName || "—"}
                      </p>
                      <p className="text-[11px] text-icm-text-dim mt-0.5">{n.type || "—"} · Due {formatDate(n.due_date || n.dueDate)}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${statusBadge(n.status)}`}>
                      {n.status || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-icm-border/60">
                    <span className={`text-[11px] font-geist ${n.active ? "text-icm-green" : "text-icm-text-dim"}`}>
                      {n.active ? "● Active" : "○ Inactive"}
                    </span>
                    <div className="flex gap-1">
                      <button
                        aria-label="View form"
                        onClick={() => {
                          if (n.individual_id || n.individualId) {
                            navigate(`/people/${n.individual_id || n.individualId}/monitoring-form/${n.id}`);
                          } else {
                            toast.info("No individual linked to this form.");
                          }
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-icm-bg text-icm-text-dim hover:text-icm-text flex items-center justify-center"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        aria-label="Print form"
                        onClick={() => toast.success("Preparing print version…")}
                        className="w-8 h-8 rounded-lg hover:bg-icm-bg text-icm-text-dim hover:text-icm-text flex items-center justify-center"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ICMShell>
  );
};

export default MonitoringFormLog;
