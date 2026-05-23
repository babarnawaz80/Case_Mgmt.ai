import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { Plus, Eye, Printer, Trash2, PhoneCall } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { onCallLogs as seed, type OnCallLogEntry } from "@/data/onCallLogs";
import { getPerson } from "@/data/people";

const urgencyClass: Record<string, string> = {
  Routine: "bg-icm-bg text-icm-text-dim",
  Urgent: "bg-icm-amber-soft text-icm-amber",
  Emergency: "bg-icm-red-soft text-icm-red",
};

const statusClass: Record<string, string> = {
  Open: "bg-icm-accent-soft text-icm-accent",
  "In Progress": "bg-icm-amber-soft text-icm-amber",
  Resolved: "bg-icm-green-soft text-icm-green",
};

const OnCallLog = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<OnCallLogEntry[]>(seed);

  const handleDelete = (id: string) => {
    setLogs((l) => l.filter((x) => x.id !== id));
    toast({ title: "Deleted", description: "On-call log removed." });
  };

  const personName = (pid?: string) => {
    if (!pid) return "—";
    const p = getPerson(pid);
    return p ? `${p.firstName} ${p.lastName}` : pid;
  };

  return (
    <ICMShell title="On-Call Log" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "On-Call Log" }]} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-tight text-[24px] font-semibold text-icm-text leading-tight tracking-[-0.02em] flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-icm-accent" />
              On-Call Log
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1">
              After-hours and backup case manager call log across all individuals.
            </p>
          </div>
          <button
            onClick={() => navigate("/oncall-log/new")}
            className="h-9 px-3.5 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-medium flex items-center gap-1.5 hover:bg-teal-700 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> Start New Log
          </button>
        </div>

        <div className="rounded-[12px] border border-icm-border bg-icm-panel overflow-x-auto">
          <table className="w-full min-w-[900px] text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim uppercase tracking-wide text-[10px]">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Date / Time</th>
                <th className="text-left px-4 py-2.5 font-medium">Caller</th>
                <th className="text-left px-4 py-2.5 font-medium">Individual</th>
                <th className="text-left px-4 py-2.5 font-medium">Category</th>
                <th className="text-left px-4 py-2.5 font-medium">Urgency</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Received By</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-icm-border">
              {logs.map((n) => (
                <tr key={n.id} className="hover:bg-icm-bg/60">
                  <td className="px-4 py-3 font-mono text-icm-text whitespace-nowrap">
                    {n.callDate}
                    <div className="text-[10.5px] text-icm-text-faint">{n.callStartTime}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-icm-text font-medium">{n.callerName}</div>
                    <div className="text-[10.5px] text-icm-text-faint">{n.callerType}</div>
                  </td>
                  <td className="px-4 py-3 text-icm-text-dim">{personName(n.personId)}</td>
                  <td className="px-4 py-3 text-icm-text-dim">{n.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${urgencyClass[n.urgency]}`}
                    >
                      {n.urgency}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${statusClass[n.status]}`}
                    >
                      {n.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-icm-text-dim">{n.receivedBy}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => navigate(`/oncall-log/${n.id}`)}
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
              {logs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-icm-text-faint">
                    No on-call logs yet. Click "Start New Log" to record an incoming call.
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

export default OnCallLog;
