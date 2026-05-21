import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  ChevronRight,
  AlertCircle,
  ListChecks,
  Sparkles,
  Filter as FilterIcon,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { loadCheckIns, type AICheckInSession } from "@/lib/aiCheckIns";
import { CheckInTranscriptDrawer } from "@/components/icm/CheckInTranscriptDrawer";
import { StatCard } from "@/components/icm/StatCard";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";

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

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}



export function AICheckInsTab() {
  const { role } = useRole();
  const isSupervisor = role === "supervisor" || role === "admin";
  const { list, refresh } = useCheckIns();
  const [active, setActive] = useState<AICheckInSession | null>(null);
  const [cmFilter, setCmFilter] = useState<string>("All");
  const [indFilter, setIndFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  const scoped = useMemo(
    () => (isSupervisor ? list : list.filter((c) => c.caseManager === "Kathy Adams")),
    [list, isSupervisor]
  );

  const filtered = useMemo(() => {
    let l = scoped.slice();
    if (cmFilter !== "All") l = l.filter((c) => c.caseManager === cmFilter);
    if (indFilter !== "All") l = l.filter((c) => c.individualName === indFilter);
    if (statusFilter !== "All") l = l.filter((c) => c.status === statusFilter);
    return l.sort((a, b) => {
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      return b.startedAt - a.startedAt;
    });
  }, [scoped, cmFilter, indFilter, statusFilter]);

  const counts = useMemo(() => {
    const pending = scoped.filter((c) => c.status === "Pending Review").length;
    const reviewed = scoped.filter((c) => c.status === "Reviewed").length;
    const urgent = scoped.filter((c) => c.urgent).length;
    return { total: scoped.length, pending, reviewed, urgent };
  }, [scoped]);

  const cms = Array.from(new Set(scoped.map((c) => c.caseManager)));
  const inds = Array.from(new Set(scoped.map((c) => c.individualName)));

  return (
    <div className="space-y-5">
      {/* Stat strip — mirror My Work */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total check-ins" value={counts.total} tone="neutral" icon={Bot} subtext="All sessions" />
        <StatCard label="Urgent" value={counts.urgent} tone="red" icon={AlertCircle} subtext="Needs review" />
        <StatCard label="Pending review" value={counts.pending} tone="amber" icon={Clock} subtext="Awaiting action" />
        <StatCard label="Reviewed" value={counts.reviewed} tone="green" icon={CheckCircle2} subtext="Completed" />
      </div>

      {/* Toolbar — mirror My Work */}
      <div className="rounded-2xl border border-icm-border bg-icm-panel px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[12px] text-icm-text-dim font-geist">
          <Sparkles className="w-3.5 h-3.5 text-icm-accent" />
          <span className="font-semibold text-icm-text">AI Care Assistant Check-Ins</span>
          <span className="text-icm-text-faint">— transcripts & detected topics from individual sessions</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {isSupervisor && (
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={cn(
                "h-7 px-2.5 rounded-md text-[11px] font-geist flex items-center gap-1.5 border",
                showFilters
                  ? "bg-icm-text text-icm-panel border-icm-text"
                  : "border-icm-border text-icm-text-dim hover:text-icm-text"
              )}
            >
              <FilterIcon className="w-3.5 h-3.5" /> Filter
            </button>
          )}
        </div>
      </div>

      {isSupervisor && showFilters && (
        <div className="rounded-2xl border border-icm-border bg-icm-panel p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            value={cmFilter}
            onChange={(e) => setCmFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[12px] text-icm-text"
          >
            <option value="All">All Case Managers</option>
            {cms.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            value={indFilter}
            onChange={(e) => setIndFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[12px] text-icm-text"
          >
            <option value="All">All Individuals</option>
            {inds.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[12px] text-icm-text"
          >
            <option value="All">All Statuses</option>
            <option>Pending Review</option>
            <option>Reviewed</option>
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-icm-accent-soft flex items-center justify-center mb-3">
            <Bot className="w-6 h-6 text-icm-accent" />
          </div>
          <h3 className="text-[15px] font-manrope font-bold text-icm-text">No AI check-ins yet</h3>
          <p className="text-[12.5px] text-icm-text-dim mt-1 max-w-[380px]">
            When an individual completes a Care Assistant session, the transcript and auto-created tasks
            will appear here for your review.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map((c) => {
            const isPending = c.status === "Pending Review";
            return (
              <div
                key={c.id}
                className={cn(
                  "bg-icm-panel border rounded-[2rem] overflow-hidden transition-all duration-500",
                  "shadow-[0_25px_70px_-20px_rgba(15,23,42,0.08),0_4px_10px_-2px_rgba(15,23,42,0.02)] hover:shadow-[0_35px_80px_-20px_rgba(15,23,42,0.1)]",
                  c.urgent ? "border-icm-red/30" : "border-icm-border/60"
                )}
              >
                {c.urgent && (
                  <div className="bg-icm-red-soft text-icm-red text-[11px] font-extrabold uppercase tracking-widest px-6 py-2.5 border-b border-icm-red/15 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Urgent — safety language detected. Immediate follow-up required.
                  </div>
                )}

                {/* Header — avatar well + name + sub */}
                <div className="px-6 py-5 flex items-center gap-4 border-b border-icm-border/40 bg-gradient-to-r from-icm-bg/30 to-transparent">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-[13px] font-manrope font-black shrink-0 shadow-sm ring-1",
                      c.urgent
                        ? "bg-gradient-to-br from-icm-red-soft to-icm-red-soft/60 text-icm-red ring-icm-red/15"
                        : "bg-gradient-to-br from-icm-accent-soft to-icm-accent-soft/60 text-icm-accent ring-icm-accent/15"
                    )}
                  >
                    {initials(c.individualName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-manrope font-bold text-[16px] tracking-tight text-icm-text">
                        {c.individualName}
                      </span>
                      <span className="text-[10px] font-extrabold text-icm-text-faint uppercase tracking-widest font-geist">
                        {c.county}
                      </span>
                    </div>
                    <p className="text-[12px] text-icm-text-dim font-geist font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <Bot className="w-3.5 h-3.5 text-icm-accent" />
                      AI Care Assistant Check-In · {new Date(c.startedAt).toLocaleDateString()} · {c.durationLabel}
                      {isSupervisor && (
                        <>
                          <span className="mx-1 text-icm-text-faint">•</span>
                          <span>CM: <span className="text-icm-text font-semibold">{c.caseManager}</span></span>
                        </>
                      )}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "px-3 py-1 text-[10.5px] font-extrabold rounded-xl border shadow-sm uppercase tracking-widest",
                      isPending
                        ? "bg-icm-amber-soft text-icm-amber border-icm-amber/15"
                        : "bg-icm-green-soft text-icm-green border-icm-green/15"
                    )}
                  >
                    {c.status}
                  </span>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                  <p className="text-[13.5px] text-icm-text font-geist leading-relaxed italic">
                    "{c.summary}"
                  </p>

                  {c.detectedTopics.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-widest font-extrabold text-icm-text-faint mr-1">
                        Topics
                      </span>
                      {c.detectedTopics.map((t) => (
                        <span
                          key={t.key}
                          className={cn(
                            "px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-tight",
                            t.key === "crisis"
                              ? "bg-icm-red-soft text-icm-red border border-icm-red/15"
                              : "bg-icm-accent-soft text-icm-accent border border-icm-accent/15"
                          )}
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                    <div className="flex items-center gap-2 text-[11.5px] font-geist text-icm-text-dim">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-icm-bg border border-icm-border/60">
                        <ListChecks className="w-3.5 h-3.5 text-icm-accent" />
                        <span className="font-bold text-icm-text">{c.tasks.length}</span>
                        <span>task{c.tasks.length === 1 ? "" : "s"} auto-created</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-icm-bg border border-icm-border/60">
                        <Sparkles className="w-3.5 h-3.5 text-icm-accent" />
                        <span>1 draft note ready</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActive(c)}
                        className="h-10 px-4 rounded-2xl text-[12px] font-geist font-black text-icm-text bg-white border border-icm-border shadow-sm hover:bg-icm-bg/60 active:scale-95 transition-all"
                      >
                        View Transcript
                      </button>
                      <button
                        onClick={() => setActive(c)}
                        className="group h-10 px-5 rounded-2xl text-[12px] font-geist font-bold text-white bg-icm-accent hover:bg-icm-accent/90 shadow-[0_10px_25px_-5px_rgba(59,130,246,0.45)] hover:shadow-[0_15px_30px_-5px_rgba(59,130,246,0.55)] hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        Review & Apply <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
