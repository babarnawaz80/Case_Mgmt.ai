import { useEffect, useMemo, useState } from "react";
import { Bot, ChevronRight } from "lucide-react";
import { loadCheckIns, type AICheckInSession } from "@/lib/aiCheckIns";
import { CheckInTranscriptDrawer } from "@/components/icm/CheckInTranscriptDrawer";
import { useRole } from "@/contexts/RoleContext";

function useCheckIns() {
  const [list, setList] = useState<AICheckInSession[]>(() => loadCheckIns());
  useEffect(() => {
    const refresh = () => setList(loadCheckIns());
    window.addEventListener("cm_ai_checkins_changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cm_ai_checkins_changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return { list, refresh: () => setList(loadCheckIns()) };
}

export function AICheckInsTab() {
  const { role } = useRole();
  const isSupervisor = role === "supervisor" || role === "admin";
  const { list, refresh } = useCheckIns();
  const [active, setActive] = useState<AICheckInSession | null>(null);
  const [cmFilter, setCmFilter] = useState<string>("All");
  const [indFilter, setIndFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // CM-scope: when not supervisor, only show Kathy Adams' caseload for demo
  const scoped = useMemo(
    () => (isSupervisor ? list : list.filter((c) => c.caseManager === "Kathy Adams")),
    [list, isSupervisor]
  );

  const filtered = useMemo(() => {
    let l = scoped.slice();
    if (isSupervisor) {
      if (cmFilter !== "All") l = l.filter((c) => c.caseManager === cmFilter);
      if (indFilter !== "All") l = l.filter((c) => c.individualName === indFilter);
      if (statusFilter !== "All") l = l.filter((c) => c.status === statusFilter);
    }
    return l.sort((a, b) => {
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      return b.startedAt - a.startedAt;
    });
  }, [scoped, isSupervisor, cmFilter, indFilter, statusFilter]);

  const cms = Array.from(new Set(scoped.map((c) => c.caseManager)));
  const inds = Array.from(new Set(scoped.map((c) => c.individualName)));

  return (
    <div className="space-y-4">
      {isSupervisor && (
        <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex items-center gap-2 flex-wrap text-[12px]">
          <span className="text-icm-text-dim font-semibold mr-1">Supervisor view:</span>
          <select
            value={cmFilter}
            onChange={(e) => setCmFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-icm-border bg-white text-icm-text"
          >
            <option value="All">All Case Managers</option>
            {cms.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            value={indFilter}
            onChange={(e) => setIndFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-icm-border bg-white text-icm-text"
          >
            <option value="All">All Individuals</option>
            {inds.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-icm-border bg-white text-icm-text"
          >
            <option value="All">All Statuses</option>
            <option>Pending Review</option>
            <option>Reviewed</option>
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel p-10 text-center text-[13px] text-icm-text-dim">
          <Bot className="w-6 h-6 mx-auto text-icm-text-faint mb-2" />
          No AI check-ins yet. When an individual completes a Care Assistant session, it will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl bg-icm-panel border overflow-hidden ${
                c.urgent ? "border-rose-200 border-l-4 border-l-rose-500" : "border-icm-border"
              }`}
            >
              {c.urgent && (
                <div className="bg-rose-50 text-rose-700 text-[12px] font-semibold px-4 py-2 border-b border-rose-200">
                  ⚠️ URGENT — Safety language detected. Immediate follow-up required.
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center gap-2 text-[12px] text-teal-700 font-semibold">
                  <Bot className="w-3.5 h-3.5" />
                  AI Care Assistant Check-In
                  <span
                    className={`ml-auto px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                      c.status === "Pending Review"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="mt-1 text-[14px] font-semibold text-icm-text">{c.individualName}</div>
                <div className="text-[11.5px] text-icm-text-dim">
                  {c.county} · {new Date(c.startedAt).toLocaleDateString()}
                  {isSupervisor && <> · Case Manager: <span className="text-icm-text">{c.caseManager}</span></>}
                </div>
                <p className="mt-2 text-[13px] text-icm-text leading-relaxed">"{c.summary}"</p>

                {c.detectedTopics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="text-[10.5px] uppercase tracking-wide text-icm-text-dim mr-1 mt-0.5">
                      Topics detected:
                    </span>
                    {c.detectedTopics.map((t) => (
                      <span
                        key={t.key}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          t.key === "crisis"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                        }`}
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2 text-[11.5px] text-icm-text-dim">
                  {c.tasks.length} task{c.tasks.length === 1 ? "" : "s"} auto-created · 1 draft note ready
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setActive(c)}
                    className="h-8 px-3 rounded-lg text-[12px] font-semibold border border-icm-border text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong"
                  >
                    View Transcript
                  </button>
                  <button
                    onClick={() => setActive(c)}
                    className="h-8 px-3 rounded-lg text-[12px] font-semibold bg-teal-500 text-white hover:bg-teal-600 flex items-center gap-1"
                  >
                    Review & Apply <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CheckInTranscriptDrawer
        session={active}
        onClose={() => setActive(null)}
        showCaseManager={isSupervisor}
        onMarkReviewed={() => refresh()}
      />
    </div>
  );
}
