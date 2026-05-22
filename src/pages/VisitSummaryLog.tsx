import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { Plus, Eye, Printer, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { visitSummaries as seed, VisitSummary } from "@/data/visitSummaries";
import { getPerson } from "@/data/people";

const VisitSummaryLog = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<VisitSummary[]>(seed);

  const handleDelete = (id: string) => {
    setNotes((n) => n.filter((x) => x.id !== id));
    toast({ title: "Deleted", description: "Visit summary removed." });
  };

  const personName = (pid: string) => {
    const p = getPerson(pid);
    return p ? `${p.firstName} ${p.lastName}` : pid;
  };

  return (
    <ICMShell title="Visit Summary" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Visit Summary" }]} />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-tight text-[24px] font-semibold text-icm-text leading-tight tracking-[-0.02em]">
              Visit Summary
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1">
              Log of all visit summaries across individuals.
            </p>
          </div>
          <button
            onClick={() => navigate("/visit-summary/new")}
            className="h-9 px-3.5 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-medium flex items-center gap-1.5 hover:bg-teal-700"
          >
            <Plus className="w-3.5 h-3.5" /> New Visit Summary
          </button>
        </div>

        <div className="rounded-[12px] border border-icm-border bg-icm-panel overflow-hidden">
          <table className="w-full text-[12px] font-geist">
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
                  <td className="px-4 py-3 font-mono text-icm-text">{n.visitDate}</td>
                  <td className="px-4 py-3 text-icm-text font-medium">{personName(n.personId)}</td>
                  <td className="px-4 py-3 text-icm-text-dim">{n.caseManager}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        n.status === "Signed"
                          ? "bg-icm-green-soft text-icm-green"
                          : n.status === "Submitted"
                          ? "bg-icm-accent-soft text-icm-accent"
                          : "bg-icm-amber-soft text-icm-amber"
                      }`}
                    >
                      {n.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-icm-text-faint">
                    {n.updatedOn} · {n.updatedBy}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => navigate(`/people/${n.personId}/visit-summary/${n.id}`)}
                        className="w-7 h-7 rounded-md hover:bg-icm-bg text-icm-text-dim hover:text-icm-text flex items-center justify-center"
                        title="View"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toast({ title: "Print", description: `Preparing ${n.id}` })}
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
