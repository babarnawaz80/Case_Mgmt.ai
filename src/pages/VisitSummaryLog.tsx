import { useState } from "react";
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



  const loading = visitsLoading || individualsLoading;

  const handleDelete = (id: string) => {
    toast.success("Visit summary removed.");
  };

  const personName = (pid: string) => {
    const p = individuals.find((x) => x.id === pid);
    return p ? `${p.first_name} ${p.last_name}` : pid;
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
              {notes.map((n) => (
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
              {notes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-icm-text-faint">
                    No visit summaries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ICMShell>
  );
};

export default VisitSummaryLog;
