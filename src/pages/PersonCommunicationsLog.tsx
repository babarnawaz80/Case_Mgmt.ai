import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Bot, Phone } from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { loadCheckIns, type AICheckInSession } from "@/lib/aiCheckIns";
import { CheckInTranscriptDrawer } from "@/components/icm/CheckInTranscriptDrawer";

export default function PersonCommunicationsLog() {
  const { id = "" } = useParams();
  const [list, setList] = useState<AICheckInSession[]>(() => loadCheckIns());
  const [active, setActive] = useState<AICheckInSession | null>(null);

  useEffect(() => {
    const refresh = () => setList(loadCheckIns());
    window.addEventListener("cm_ai_checkins_changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cm_ai_checkins_changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const entries = useMemo(
    () => list.filter((c) => c.individualId === id).sort((a, b) => b.startedAt - a.startedAt),
    [list, id]
  );

  return (
    <ICMShell>
      <div className="p-6 max-w-5xl mx-auto">
        <header className="mb-5">
          <div className="flex items-center gap-2 text-[12px] text-icm-text-dim">
            <Phone className="w-3.5 h-3.5" /> Communications Log
          </div>
          <h1 className="text-xl font-semibold text-icm-text mt-1">Communications Log</h1>
          <p className="text-[12.5px] text-icm-text-dim">
            All recorded contacts with this individual, including Case Companion check-ins.
          </p>
        </header>

        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-icm-bg/70 text-[11px] uppercase tracking-wide text-icm-text-dim">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Date</th>
                <th className="text-left px-4 py-2 font-semibold">Type</th>
                <th className="text-left px-4 py-2 font-semibold">Summary</th>
                <th className="text-left px-4 py-2 font-semibold">Duration</th>
                <th className="text-left px-4 py-2 font-semibold">Status</th>
                <th className="text-right px-4 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-icm-text-dim">
                    No communications logged yet.
                  </td>
                </tr>
              )}
              {entries.map((c) => (
                <tr key={c.id} className="border-t border-icm-border">
                  <td className="px-4 py-3 text-icm-text">
                    {new Date(c.startedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-200 text-[11px] font-semibold">
                      <Bot className="w-3 h-3" /> Case Companion Check-In
                    </span>
                  </td>
                  <td className="px-4 py-3 text-icm-text max-w-md">{c.summary}</td>
                  <td className="px-4 py-3 text-icm-text-dim">{c.durationLabel}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                        c.status === "Pending Review"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setActive(c)}
                      className="h-7 px-2.5 rounded-md text-[11.5px] font-semibold border border-icm-border text-icm-text-dim hover:text-icm-text mr-1"
                    >
                      View Transcript
                    </button>
                    <button
                      onClick={() => setActive(c)}
                      className="h-7 px-2.5 rounded-md text-[11.5px] font-semibold bg-teal-500 text-white hover:bg-teal-600"
                    >
                      Mark Reviewed
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <CheckInTranscriptDrawer session={active} onClose={() => setActive(null)} />
    </ICMShell>
  );
}
