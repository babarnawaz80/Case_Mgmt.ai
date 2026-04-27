import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, GitBranch } from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import {
  getAllWorkflows, globalSummary, progressFraction, workflowProgressTone,
  type WorkflowRecord, type WorkflowStatus,
} from "@/data/workflows";

const WorkflowsGlobal = () => {
  const navigate = useNavigate();
  const summary = globalSummary();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | "All">("Active");

  const all = getAllWorkflows();
  const types = Array.from(new Set(all.map((w) => w.title)));

  const filtered = useMemo(() => {
    return all.filter((w) => {
      if (statusFilter !== "All" && w.status !== statusFilter) return false;
      if (typeFilter !== "All" && w.title !== typeFilter) return false;
      if (search && !w.personName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [all, search, typeFilter, statusFilter]);

  return (
    <ICMShell title="Workflows" showAIPanel={false}>
      <div className="space-y-5">
        <div>
          <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">Workflows</h1>
          <p className="text-[13px] text-icm-text-dim mt-1 font-geist">Active workflows across all individuals</p>
        </div>

        {/* Summary chips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryChip label="Total active" value={summary.totalActive} tone="neutral" />
          <SummaryChip label="Overdue" value={summary.overdue} tone="red" />
          <SummaryChip label="Due this week" value={summary.dueThisWeek} tone="amber" />
          <SummaryChip label="Completed this month" value={summary.completedThisMonth} tone="green" />
        </div>

        {/* AI banner */}
        <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
            <p className="text-[12.5px] font-geist text-icm-text leading-snug">
              <span className="font-semibold">You have {summary.totalActive} active workflows.</span>{" "}
              <span className="text-icm-text-dim">{summary.overdue} have overdue steps. Want me to help prioritize?</span>
            </p>
          </div>
          <button className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline">Show me</button>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex flex-wrap items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by individual…" className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] text-icm-text w-[200px]" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] text-icm-text">
            <option>All</option>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as WorkflowStatus | "All")} className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] text-icm-text">
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Terminated">Terminated</option>
            <option value="All">All</option>
          </select>
          <button onClick={() => navigate("/admin/workflow-templates")} className="ml-auto text-[11px] font-geist text-icm-accent hover:underline">Manage templates →</button>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-icm-bg border border-icm-border flex items-center justify-center mb-3"><GitBranch className="w-6 h-6 text-icm-text-faint" /></div>
            <p className="text-[13px] text-icm-text-dim">No workflows match these filters.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] font-geist">
                <thead className="bg-icm-bg/60">
                  <tr>
                    {["Individual", "Workflow", "Trigger Date", "Due Date", "Progress", "Status", ""].map((c, i) => (
                      <th key={i} className="text-left px-4 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-icm-border">
                  {filtered.map((w) => (
                    <tr key={w.id} onClick={() => navigate(`/people/${w.personId}/workflow-manager/${w.id}`)} className="hover:bg-icm-bg/40 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-medium text-icm-text">{w.personName}</td>
                      <td className="px-4 py-3 text-icm-text-dim">{w.title}</td>
                      <td className="px-4 py-3 font-mono text-icm-text-dim">{w.triggerDate}</td>
                      <td className="px-4 py-3 font-mono text-icm-text-dim">{w.dueDate ?? "—"}</td>
                      <td className="px-4 py-3 min-w-[160px]"><MiniProgress w={w} /></td>
                      <td className="px-4 py-3"><StatusPill status={w.status} /></td>
                      <td className="px-4 py-3 text-right"><ArrowRight className="w-3.5 h-3.5 text-icm-accent inline" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ICMShell>
  );
};

function SummaryChip({ label, value, tone }: { label: string; value: number; tone: "neutral" | "red" | "amber" | "green" }) {
  const toneClass = {
    neutral: "bg-icm-panel text-icm-text border-icm-border",
    red: "bg-icm-red-soft text-icm-red border-icm-red/20",
    amber: "bg-icm-amber-soft text-icm-amber border-icm-amber/20",
    green: "bg-icm-green-soft text-icm-green border-icm-green/20",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-[10.5px] uppercase tracking-wide font-semibold opacity-80">{label}</p>
      <p className="font-manrope font-extrabold text-[24px] mt-1 leading-none">{value}</p>
    </div>
  );
}

function MiniProgress({ w }: { w: WorkflowRecord }) {
  const { done, total } = progressFraction(w);
  const pct = total === 0 ? 0 : (done / total) * 100;
  const tone = workflowProgressTone(w);
  const fill = tone === "red" ? "bg-icm-red" : tone === "amber" ? "bg-icm-amber" : "bg-icm-accent";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-icm-bg border border-icm-border overflow-hidden">
        <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[11px] text-icm-text-dim">{done}/{total}</span>
    </div>
  );
}

function StatusPill({ status }: { status: WorkflowStatus }) {
  const map = {
    Active: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    Completed: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    Terminated: "bg-icm-red-soft text-icm-red ring-icm-red/20",
  } as const;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${map[status]}`}>{status}</span>;
}

export default WorkflowsGlobal;
