/**
 * TodaySchedule / ScheduleCalendar
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable scheduling calendar component with Day / Week / Month views,
 * date navigation, and optional filters.
 *
 * Two modes:
 *  • compact  – dashboard side-panel (no filter bar, condensed chrome)
 *  • full     – SchedulePage (filter bar, taller cells, all filters)
 */

import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays, CalendarRange, CalendarIcon,
  ChevronLeft, ChevronRight, Plus, Clock,
  MapPin, User, XCircle, PlayCircle, Loader2,
  CheckCircle2, Search, SlidersHorizontal,
  FileText, Mic, PenLine, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  useScheduledVisits,
  updateScheduledVisit,
  VISIT_TYPE_COLORS,
  type ScheduledVisit,
  type VisitType,
} from "@/hooks/useScheduledVisits";
import { ScheduleVisitModal } from "@/components/scheduling/ScheduleVisitModal";

// Lazy-load heavy modals so they don't bloat the dashboard bundle
const AmbientFlowV2   = lazy(() => import("@/components/ambient/AmbientFlowV2"));
const ScribeFlowModal = lazy(() => import("@/components/ambient/ScribeFlowModal"));
const TelevisitModal  = lazy(() =>
  import("@/components/televisit/TelevisitModal").then((m) => ({ default: m.TelevisitModal }))
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmt12(time24: string): string {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function toYMD(d: Date): string {
  // Use LOCAL date parts, not toISOString() (which converts to UTC and shifts
  // the date by a day in UTC-negative timezones — making tomorrow's visits show
  // as "Today" and vice-versa). visit_date strings are local YYYY-MM-DD.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtMonthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function weekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** All days in the week containing `anchor` (Mon–Sun) */
function weekDays(anchor: Date): Date[] {
  const mon = weekStart(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** All cells in the month grid (6 rows × 7 cols, Mon-start) */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  // Start Monday of first week
  const start = new Date(first);
  const dow = first.getDay(); // 0=Sun
  start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
  // 6 rows × 7 = 42 cells
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const DAY_ABBR = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const STATUS_PILL: Record<string, string> = {
  scheduled:   "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  completed:   "bg-emerald-50 text-emerald-700",
  cancelled:   "bg-icm-bg text-icm-text-dim",
};

// ─── Start Visit — Mode Picker ────────────────────────────────────────────────

/** Appears inside the drawer when the user clicks "Start Visit" */
function StartVisitModePicker({
  onOpenForm,
  onStartAmbient,
  onStartScribe,
  onBack,
}: {
  onOpenForm:     () => void;
  onStartAmbient: () => void;
  onStartScribe:  () => void;
  onBack:         () => void;
}) {
  const modes = [
    {
      id:       "form",
      icon:     <FileText className="w-5 h-5" />,
      title:    "Open Visit Form",
      desc:     "Fill in the visit summary manually. All fields pre-filled from the scheduled visit.",
      accent:   "border-blue-200 bg-blue-50 hover:bg-blue-100",
      iconBg:   "bg-blue-500",
      onClick:  onOpenForm,
    },
    {
      id:       "ambient",
      icon:     <Mic className="w-5 h-5" />,
      title:    "Start Ambient Listening",
      desc:     "AI listens passively during the visit and auto-drafts the visit summary when you stop.",
      accent:   "border-violet-200 bg-violet-50 hover:bg-violet-100",
      iconBg:   "bg-violet-500",
      onClick:  onStartAmbient,
    },
    {
      id:       "scribe",
      icon:     <PenLine className="w-5 h-5" />,
      title:    "Start Live Scribing",
      desc:     "Dictate or speak — AI transcribes and extracts notes, tasks, and incidents in real-time.",
      accent:   "border-teal-200 bg-teal-50 hover:bg-teal-100",
      iconBg:   "bg-teal-500",
      onClick:  onStartScribe,
    },
  ] as const;

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="font-manrope font-bold text-[14px] text-icm-text">How would you like to document?</p>
        <button
          onClick={onBack}
          className="text-[11px] font-geist text-icm-text-dim hover:text-icm-text flex items-center gap-0.5"
        >
          <ChevronDown className="w-3.5 h-3.5 rotate-90" /> Back
        </button>
      </div>
      <p className="text-[11.5px] text-icm-text-dim font-geist -mt-1 mb-2">
        Choose how to capture this visit. You can switch modes after the visit begins.
      </p>
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={m.onClick}
          className={`w-full text-left rounded-xl border p-3.5 transition-all flex items-start gap-3 ${m.accent}`}
        >
          <div className={`${m.iconBg} w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0`}>
            {m.icon}
          </div>
          <div>
            <p className="font-geist font-semibold text-[13px] text-icm-text leading-tight">{m.title}</p>
            <p className="text-[11.5px] text-icm-text-dim font-geist mt-0.5 leading-snug">{m.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Visit Detail Drawer ──────────────────────────────────────────────────────

function VisitDetailDrawer({
  visit,
  onClose,
  onStartVisit,
  onCancelClick,
}: {
  visit: ScheduledVisit;
  onClose: () => void;
  onStartVisit: (v: ScheduledVisit, mode: "form" | "ambient" | "scribe") => void;
  onCancelClick: (v: ScheduledVisit) => void;
}) {
  const [showModePicker, setShowModePicker] = useState(false);

  const colors = VISIT_TYPE_COLORS[visit.visit_type as VisitType] ?? {
    bg: "bg-icm-bg", text: "text-icm-text", dot: "bg-icm-border",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/40" onClick={onClose}>
      <div
        className="w-full sm:w-[420px] sm:h-full bg-white sm:shadow-2xl rounded-t-2xl sm:rounded-none overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Colored header */}
        <div className={`${colors.bg} px-5 pt-5 pb-4 shrink-0`}>
          <div className="flex items-start justify-between">
            <div>
              <span className={`text-[10px] font-geist font-bold uppercase tracking-widest ${colors.text}`}>
                {visit.visit_type}
              </span>
              <h2 className="font-manrope font-extrabold text-[17px] text-icm-text mt-0.5">
                {visit.individual_name}
              </h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-icm-text-dim">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-geist font-semibold ${STATUS_PILL[visit.status] ?? "bg-icm-bg text-icm-text-dim"}`}>
              {visit.status.replace("_", " ")}
            </span>
            <span className="text-[11px] text-icm-text-dim font-geist">
              {new Date(visit.visit_date + "T12:00:00").toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" })}
            </span>
          </div>
        </div>

        {/* Mode picker replaces detail + actions when "Start Visit" was clicked */}
        {showModePicker ? (
          <div className="flex-1 flex flex-col">
            <StartVisitModePicker
              onBack={() => setShowModePicker(false)}
              onOpenForm={()     => onStartVisit(visit, "form")}
              onStartAmbient={() => onStartVisit(visit, "ambient")}
              onStartScribe={() => onStartVisit(visit, "scribe")}
            />
          </div>
        ) : (
          <>
            {/* Details */}
            <div className="p-5 space-y-4 flex-1">
              <DrawerRow icon={<Clock className="w-3.5 h-3.5" />} label="Time">
                {fmt12(visit.start_time)} – {fmt12(visit.end_time)}
              </DrawerRow>
              <DrawerRow icon={<MapPin className="w-3.5 h-3.5" />} label="Location">
                {visit.location || "—"}
              </DrawerRow>
              <DrawerRow icon={<User className="w-3.5 h-3.5" />} label="Assigned Staff">
                {visit.assigned_to_name || "—"}
              </DrawerRow>
              {visit.linked_goal_text && (
                <DrawerRow icon={<ChevronRight className="w-3.5 h-3.5" />} label="Linked Goal">
                  {visit.linked_goal_text}
                </DrawerRow>
              )}
              {visit.notes && (
                <DrawerRow icon={<ChevronRight className="w-3.5 h-3.5" />} label="Prep Notes">
                  {visit.notes}
                </DrawerRow>
              )}
            </div>

            {/* Actions */}
            <div className="p-5 pt-0 space-y-2 border-t border-icm-border shrink-0">
              {visit.status === "scheduled" && (
                <button
                  onClick={() => setShowModePicker(true)}
                  className="w-full h-10 rounded-xl bg-icm-accent text-white text-[13px] font-geist font-semibold flex items-center justify-center gap-2 hover:bg-icm-accent/90 transition-colors"
                >
                  <PlayCircle className="w-4 h-4" /> Start Visit
                </button>
              )}
              {visit.status === "in_progress" && (
                <button
                  onClick={() => setShowModePicker(true)}
                  className="w-full h-10 rounded-xl bg-amber-500 text-white text-[13px] font-geist font-semibold flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors"
                >
                  <PlayCircle className="w-4 h-4" /> Continue Visit
                </button>
              )}
              {(visit.status === "scheduled" || visit.status === "in_progress") && (
                <button
                  onClick={() => onCancelClick(visit)}
                  className="w-full h-9 rounded-xl border border-icm-border text-[13px] font-geist text-icm-text-dim hover:bg-icm-bg flex items-center justify-center gap-2"
                >
                  <XCircle className="w-3.5 h-3.5" /> Cancel Visit
                </button>
              )}
              {(visit.status === "completed" || visit.status === "cancelled") && (
                <div className="rounded-xl bg-icm-bg p-3 text-center">
                  <CheckCircle2 className="w-4 h-4 text-icm-green mx-auto mb-1" />
                  <p className="text-[12px] text-icm-text-dim font-geist">
                    {visit.status === "completed" ? "Visit completed." : "Visit cancelled."}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DrawerRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-icm-text-dim shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-[10px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">{label}</p>
        <p className="text-[12.5px] font-geist text-icm-text mt-0.5">{children}</p>
      </div>
    </div>
  );
}

// ─── Visit Chip ───────────────────────────────────────────────────────────────

function VisitChip({ visit, onClick, mini }: { visit: ScheduledVisit; onClick: () => void; mini?: boolean }) {
  const colors = VISIT_TYPE_COLORS[visit.visit_type as VisitType] ?? { bg:"bg-icm-bg", text:"text-icm-text", dot:"bg-icm-border" };
  const isTV = visit.visit_type === "Televisit / Video Call";
  if (mini) {
    return (
      <button
        onClick={onClick}
        title={`${visit.individual_name} — ${visit.visit_type} ${fmt12(visit.start_time)}`}
        className={`w-full text-left rounded px-1 py-0.5 ${colors.bg} hover:brightness-95 transition-all`}
      >
        <p className={`text-[9px] font-geist font-bold truncate flex items-center gap-0.5 ${colors.text}`}>
          {isTV && <span>📹</span>}
          {visit.individual_name.split(",")[0]}
        </p>
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-md px-1.5 py-1 ${colors.bg} hover:brightness-95 transition-all border border-transparent hover:border-icm-border`}
    >
      <p className={`text-[10px] font-geist font-bold truncate flex items-center gap-1 ${colors.text}`}>
        {isTV && <span className="text-[9px]">📹</span>}
        {visit.individual_name.split(",")[0]}
      </p>
      <p className={`text-[9px] font-geist truncate ${colors.text} opacity-80`}>
        {fmt12(visit.start_time)}
      </p>
    </button>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ visits, onVisitClick, compact }: { visits: ScheduledVisit[]; onVisitClick: (v:ScheduledVisit)=>void; compact?: boolean }) {
  const sorted = [...visits].sort((a,b) => a.start_time.localeCompare(b.start_time));
  if (sorted.length === 0) {
    return (
      <div className={`flex flex-col items-center gap-2 text-center ${compact ? "py-6" : "py-12"}`}>
        <CalendarDays className="w-6 h-6 text-icm-text-faint" />
        <p className="text-[12px] text-icm-text-dim font-geist">No visits scheduled.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2 py-1">
      {sorted.map((v) => {
        const colors = VISIT_TYPE_COLORS[v.visit_type as VisitType] ?? { bg:"bg-icm-bg", text:"text-icm-text", dot:"bg-icm-border" };
        return (
          <button
            key={v.id}
            onClick={() => onVisitClick(v)}
            className="w-full text-left rounded-xl border border-icm-border bg-white hover:bg-icm-bg/70 hover:shadow-sm transition-all p-3 flex items-center gap-3 group"
          >
            <div className={`w-1 self-stretch rounded-full ${colors.dot} shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-geist font-semibold text-[12.5px] text-icm-text truncate">{v.individual_name}</span>
                <span className={`text-[10px] font-geist px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>{v.visit_type}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-icm-text-dim font-geist">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmt12(v.start_time)} – {fmt12(v.end_time)}</span>
                {v.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{v.location}</span></span>}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-icm-text-faint group-hover:text-icm-accent transition-colors shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ days, visits, todayStr, onVisitClick, compact }: {
  days: Date[]; visits: ScheduledVisit[]; todayStr: string;
  onVisitClick: (v:ScheduledVisit)=>void; compact?: boolean;
}) {
  const byDay = useMemo(() => {
    const map: Record<string,ScheduledVisit[]> = {};
    for (const d of days) map[toYMD(d)] = [];
    for (const v of visits) { if (map[v.visit_date]) map[v.visit_date].push(v); }
    return map;
  }, [days, visits]);

  return (
    <div className="overflow-x-auto -mx-1">
      <div className={`min-w-[500px] grid grid-cols-7 gap-1 px-1 ${compact ? "" : "gap-1.5"}`}>
        {days.map((date, i) => {
          const ymd = toYMD(date);
          const isToday = ymd === todayStr;
          const dayVisits = (byDay[ymd]??[]).sort((a,b)=>a.start_time.localeCompare(b.start_time));
          return (
            <div key={ymd} className="flex flex-col gap-1">
              <div className={`text-center rounded-lg py-1 ${isToday ? "bg-icm-accent" : ""}`}>
                <p className={`text-[9px] font-geist font-bold uppercase tracking-wider ${isToday ? "text-white" : "text-icm-text-dim"}`}>{DAY_ABBR[i]}</p>
                <p className={`text-[13px] font-manrope font-bold ${isToday ? "text-white" : "text-icm-text"}`}>{date.getDate()}</p>
                <p className={`text-[9px] font-geist ${isToday ? "text-white/70" : "text-icm-text-faint"}`}>
                  {date.toLocaleDateString("en-US",{month:"short"})}
                </p>
              </div>
              <div className={`space-y-1 ${compact ? "min-h-[60px]" : "min-h-[90px]"}`}>
                {dayVisits.slice(0, compact ? 2 : 4).map((v) => (
                  <VisitChip key={v.id} visit={v} onClick={()=>onVisitClick(v)} mini={compact} />
                ))}
                {dayVisits.length > (compact ? 2 : 4) && (
                  <p className="text-[9px] text-icm-text-dim px-1">+{dayVisits.length-(compact?2:4)} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ year, month, visits, todayStr, onVisitClick, onDayClick, compact }: {
  year: number; month: number; visits: ScheduledVisit[];
  todayStr: string; onVisitClick: (v:ScheduledVisit)=>void;
  onDayClick: (date: Date) => void; compact?: boolean;
}) {
  const cells = useMemo(() => monthGrid(year, month), [year, month]);
  const byDay = useMemo(() => {
    const map: Record<string, ScheduledVisit[]> = {};
    for (const v of visits) {
      if (!map[v.visit_date]) map[v.visit_date] = [];
      map[v.visit_date].push(v);
    }
    return map;
  }, [visits]);

  const MAX_CHIPS = compact ? 1 : 2;

  return (
    <div className="select-none">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_ABBR.map((d) => (
          <div key={d} className="text-center py-1">
            <span className="text-[9px] font-geist font-bold uppercase tracking-wider text-icm-text-dim">{d}</span>
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px bg-icm-border rounded-xl overflow-hidden">
        {cells.map((date, i) => {
          const ymd = toYMD(date);
          const isCurrentMonth = date.getMonth() === month;
          const isToday = ymd === todayStr;
          const dayVisits = (byDay[ymd] ?? []).filter(v => v.status !== "cancelled");
          const overflow = dayVisits.length - MAX_CHIPS;
          return (
            <div
              key={i}
              onClick={() => isCurrentMonth && onDayClick(date)}
              className={`bg-white ${compact ? "p-1 min-h-[52px]" : "p-1.5 min-h-[72px]"} flex flex-col cursor-pointer transition-colors ${
                isCurrentMonth ? "hover:bg-icm-bg/60" : "opacity-30 cursor-default"
              }`}
            >
              {/* Date number */}
              <div className="flex items-center justify-end mb-0.5">
                <span
                  className={`text-[11px] font-manrope font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday
                      ? "bg-icm-accent text-white"
                      : isCurrentMonth
                      ? "text-icm-text"
                      : "text-icm-text-faint"
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>
              {/* Visit chips */}
              <div className="space-y-0.5 flex-1">
                {dayVisits.slice(0, MAX_CHIPS).map((v) => (
                  <VisitChip key={v.id} visit={v} onClick={(e:any)=>{e.stopPropagation();onVisitClick(v);}} mini />
                ))}
                {overflow > 0 && (
                  <p className="text-[8.5px] text-icm-text-dim leading-none px-0.5">+{overflow}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main TodaySchedule Component ────────────────────────────────────────────

type ViewMode = "day" | "week" | "month";

export interface TodayScheduleProps {
  /** compact=true → Dashboard side-panel; false/undefined → full page */
  compact?: boolean;
  /** External visits override (for full page with external filters applied) */
  filteredVisits?: ScheduledVisit[];
  /** Whether the hook is loading (only used when filteredVisits provided) */
  externalLoading?: boolean;
}

export function TodaySchedule({ compact, filteredVisits, externalLoading }: TodayScheduleProps = {}) {
  const navigate = useNavigate();
  const today = new Date();
  const todayStr = toYMD(today);

  const [view, setView]         = useState<ViewMode>("day");
  const [anchor, setAnchor]     = useState<Date>(new Date(today));
  const [showModal, setShowModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<ScheduledVisit | null>(null);
  const [cancellingId, setCancellingId]   = useState<string | null>(null);
  const [cancelReason, setCancelReason]   = useState("");
  // Ambient / Scribe overlays — store the in-progress visit context
  const [ambientVisit, setAmbientVisit] = useState<ScheduledVisit | null>(null);
  const [scribeVisit,  setScribeVisit]  = useState<ScheduledVisit | null>(null);
  // Televisit modal state
  const [televisitVisit, setTelevisitVisit] = useState<ScheduledVisit | null>(null);

  // Internal hook (used when no external visits provided)
  const { visits: allVisits, loading: internalLoading } = useScheduledVisits();
  const visits   = filteredVisits ?? allVisits;
  const loading  = filteredVisits !== undefined ? (externalLoading ?? false) : internalLoading;

  // ── Date navigation ───────────────────────────────────────────────────────
  const navigatePrev = useCallback(() => {
    setAnchor((a) => {
      const d = new Date(a);
      if (view === "day")   d.setDate(d.getDate() - 1);
      if (view === "week")  d.setDate(d.getDate() - 7);
      if (view === "month") d.setMonth(d.getMonth() - 1);
      return d;
    });
  }, [view]);

  const navigateNext = useCallback(() => {
    setAnchor((a) => {
      const d = new Date(a);
      if (view === "day")   d.setDate(d.getDate() + 1);
      if (view === "week")  d.setDate(d.getDate() + 7);
      if (view === "month") d.setMonth(d.getMonth() + 1);
      return d;
    });
  }, [view]);

  const goToday = () => setAnchor(new Date(today));

  // ── Visible date label ────────────────────────────────────────────────────
  const dateLabel = useMemo(() => {
    if (view === "day")  return toYMD(anchor) === todayStr
      ? "Today"
      : anchor.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
    if (view === "week") {
      const days = weekDays(anchor);
      return `${fmtShort(days[0])} – ${fmtShort(days[6])}`;
    }
    return fmtMonthYear(anchor);
  }, [view, anchor, todayStr]);

  // ── Filtered visits for current window ───────────────────────────────────
  const windowVisits = useMemo(() => {
    const active = visits.filter((v) => v.status !== "cancelled");
    if (view === "day") {
      return active.filter((v) => v.visit_date === toYMD(anchor));
    }
    if (view === "week") {
      const days = weekDays(anchor).map(toYMD);
      return active.filter((v) => days.includes(v.visit_date));
    }
    // month — include all days in the calendar grid
    const cells = monthGrid(anchor.getFullYear(), anchor.getMonth()).map(toYMD);
    return active.filter((v) => cells.includes(v.visit_date));
  }, [visits, view, anchor]);

  // ── Today count (for day view subtitle) ──────────────────────────────────
  const todayCount = useMemo(
    () => visits.filter((v) => v.visit_date === todayStr && v.status !== "cancelled").length,
    [visits, todayStr]
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleStartVisit = async (visit: ScheduledVisit, mode: "form" | "ambient" | "scribe") => {
    try {
      // Mark in_progress regardless of mode
      await updateScheduledVisit(visit.id, { status: "in_progress" });
      setSelectedVisit(null);

      if (mode === "form") {
        navigate(`/people/${visit.individual_id}/visit-summary/new?from_scheduled=${visit.id}`);
      } else if (mode === "ambient") {
        setAmbientVisit(visit);
      } else {
        setScribeVisit(visit);
      }
    } catch { toast.error("Could not start visit."); }
  };

  /** When a televisit event block is clicked, open the TelevisitModal pre-filled */
  const handleEventClick = useCallback((visit: ScheduledVisit) => {
    if (visit.visit_type === "Televisit / Video Call") {
      setTelevisitVisit(visit);
    } else {
      setSelectedVisit(visit);
    }
  }, []);

  const handleCancelClick  = (v: ScheduledVisit) => { setCancellingId(v.id); setCancelReason(""); };
  const handleCancelConfirm = async () => {
    if (!cancellingId) return;
    try {
      await updateScheduledVisit(cancellingId, { status: "cancelled", cancellation_reason: cancelReason || "Cancelled" });
      setSelectedVisit(null);
      setCancellingId(null);
      toast.success("Visit cancelled.");
    } catch { toast.error("Could not cancel visit."); }
  };

  const handleMonthDayClick = (date: Date) => {
    setAnchor(new Date(date));
    setView("day");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col h-full space-y-3">
        {/* ── Section header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {compact
              ? <h2 className="icm-section-title whitespace-nowrap">Today&apos;s Schedule</h2>
              : null /* full-page has its own header */
            }
            {compact && !loading && (
              <span className="text-[10.5px] font-geist text-icm-text-dim whitespace-nowrap">
                {todayCount} today
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-icm-border overflow-hidden bg-white">
              {(["day","week","month"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`h-7 px-2 flex items-center gap-1 text-[10.5px] font-geist font-medium transition-colors whitespace-nowrap ${
                    view === v ? "bg-icm-accent text-white" : "text-icm-text-dim hover:bg-icm-bg"
                  }`}
                >
                  {v === "day"   && <CalendarDays className="w-3 h-3" />}
                  {v === "week"  && <CalendarRange className="w-3 h-3" />}
                  {v === "month" && <CalendarIcon className="w-3 h-3" />}
                  <span className="capitalize">{v}</span>
                </button>
              ))}
            </div>

            {/* + Schedule */}
            <button
              onClick={() => setShowModal(true)}
              className="h-7 px-2.5 rounded-lg bg-white border border-[#4f46e5] text-[#4f46e5] text-[10.5px] font-geist font-semibold flex items-center gap-1 hover:bg-[#eef2ff] transition-colors whitespace-nowrap"
            >
              <Plus className="w-3 h-3" /> {compact ? "New" : "Schedule"}
            </button>
          </div>
        </div>

        {/* ── Card ────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-icm-border bg-icm-panel flex-1 flex flex-col overflow-hidden">
          {/* Date navigation bar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-icm-border shrink-0">
            <button
              onClick={goToday}
              className="h-6 px-2 rounded-md border border-icm-border text-[10.5px] font-geist text-icm-text-dim hover:bg-icm-bg transition-colors"
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <button onClick={navigatePrev} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-icm-bg transition-colors text-icm-text-dim">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[12px] font-geist font-semibold text-icm-text min-w-[140px] text-center">
                {dateLabel}
              </span>
              <button onClick={navigateNext} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-icm-bg transition-colors text-icm-text-dim">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-[10px] font-geist text-icm-text-faint w-16 text-right">
              {loading ? "" : `${windowVisits.length} visit${windowVisits.length!==1?"s":""}`}
            </span>
          </div>

          {/* Calendar body */}
          <div className={`overflow-y-auto flex-1 ${compact ? "p-2" : "p-3"}`}>
            {loading ? (
              <div className={`flex items-center justify-center gap-2 text-icm-text-dim ${compact ? "py-8" : "py-16"}`}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[12px] font-geist">Loading…</span>
              </div>
            ) : view === "day" ? (
              <DayView visits={windowVisits} onVisitClick={handleEventClick} compact={compact} />
            ) : view === "week" ? (
              <WeekView
                days={weekDays(anchor)}
                visits={windowVisits}
                todayStr={todayStr}
                onVisitClick={handleEventClick}
                compact={compact}
              />
            ) : (
              <MonthView
                year={anchor.getFullYear()}
                month={anchor.getMonth()}
                visits={windowVisits}
                todayStr={todayStr}
                onVisitClick={handleEventClick}
                onDayClick={handleMonthDayClick}
                compact={compact}
              />
            )}
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <ScheduleVisitModal open={showModal} onClose={() => setShowModal(false)} onSaved={() => {}} />

      {/* Visit Detail Drawer */}
      {selectedVisit && (
        <VisitDetailDrawer
          visit={selectedVisit}
          onClose={() => setSelectedVisit(null)}
          onStartVisit={handleStartVisit}
          onCancelClick={handleCancelClick}
        />
      )}

      {/* Cancel Confirmation */}
      {cancellingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" onClick={() => setCancellingId(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-manrope font-bold text-[15px] text-icm-text">Cancel this visit?</h3>
            <input
              autoFocus value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full h-9 rounded-lg border border-icm-border px-2.5 text-[13px] font-geist focus:outline-none focus:ring-2 focus:ring-icm-accent/40"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCancellingId(null)} className="h-9 px-4 rounded-xl border border-icm-border text-[13px] font-geist text-icm-text-dim">Back</button>
              <button onClick={handleCancelConfirm} className="h-9 px-4 rounded-xl bg-icm-red text-white text-[13px] font-geist font-semibold">Cancel Visit</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ambient Listening Overlay ──────────────────────────────────────────
          Mounted when user picks "Start Ambient Listening" from the visit drawer.
          AmbientFlowV2 is a full-screen overlay that handles consent → record →
          review → auto-draft. We pre-populate the individual so the case manager
          doesn't have to search again.
      */}
      {ambientVisit && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[70] bg-white/90 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-icm-accent" />
          </div>
        }>
          <AmbientFlowV2
            defaultIndividualId={ambientVisit.individual_id}
            defaultIndividualName={ambientVisit.individual_name.split(",").reverse().join(" ").trim()}
            onClose={() => {
              setAmbientVisit(null);
              // Navigate to the visit summary form so they can complete documentation
              navigate(`/people/${ambientVisit.individual_id}/visit-summary/new?from_scheduled=${ambientVisit.id}`);
            }}
          />
        </Suspense>
      )}

      {/* ── Live Scribing Overlay ──────────────────────────────────────────────
          Mounted when user picks "Start Live Scribing" from the visit drawer.
          ScribeFlowModal handles dictation → AI extraction → module push.
      */}
      {scribeVisit && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[70] bg-white/90 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-icm-accent" />
          </div>
        }>
          <ScribeFlowModal
            defaultIndividualId={scribeVisit.individual_id}
            defaultIndividualName={scribeVisit.individual_name.split(",").reverse().join(" ").trim()}
            onClose={() => setScribeVisit(null)}
          />
        </Suspense>
      )}

      {/* ── Televisit Modal ────────────────────────────────────────────────────
          Opens when a "Televisit / Video Call" event block is clicked.
          Pre-fills the individual from the scheduled visit.
      */}
      {televisitVisit && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[70] bg-white/90 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
          </div>
        }>
          <TelevisitModal
            open={true}
            prefilledIndividualId={televisitVisit.individual_id}
            prefilledIndividualName={televisitVisit.individual_name}
            onClose={() => setTelevisitVisit(null)}
          />
        </Suspense>
      )}
    </>
  );
}
