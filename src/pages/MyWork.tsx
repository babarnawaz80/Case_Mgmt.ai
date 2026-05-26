import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { demoSuccess, demoToast } from "@/lib/demoToast";
import {
  Sparkles,
  ListChecks,
  Filter as FilterIcon,
  ChevronDown,
  ChevronRight,
  Plus,
  ArrowRight,
  Circle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users as UsersIcon,
  Calendar as CalendarIcon,
  X,
  Sparkle,
  Keyboard,
  PartyPopper,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  Send,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import {
  bucketForTask,
  parseMDY,
  daysBetween,
  DEMO_TODAY,
  type MyWorkTask,
  type TaskStatus,
} from "@/data/myWork";
import { useTasks, completeTask as firestoreCompleteTask, addTaskComment, createTask } from "@/hooks/useTasks";
import type { Task } from "@/hooks/useTasks";
import { useIndividuals } from "@/hooks/useIndividuals";
import { useAuth } from "@/contexts/AuthContext";
import { AuthorCell } from "@/components/icm/AuthorCell";

// ---------- Shape adapter: Firestore Task → MyWorkTask ----------
function mapTaskToMyWork(t: Task): MyWorkTask {
  // Convert YYYY-MM-DD or Timestamp → MM/DD/YYYY for existing date helpers
  function toMDY(val: any): string {
    if (!val) return "";
    if (val.toDate) {
      val = val.toDate();
    }
    if (val instanceof Date) {
      const m = String(val.getMonth() + 1).padStart(2, "0");
      const d = String(val.getDate()).padStart(2, "0");
      const y = val.getFullYear();
      return `${m}/${d}/${y}`;
    }
    if (typeof val === "string") {
      if (val.includes("/")) return val;
      if (val.includes("-")) {
        const parts = val.split("T")[0].split("-");
        if (parts.length === 3) {
          const [y, m, d] = parts;
          return `${m}/${d}/${y}`;
        }
      }
    }
    return String(val);
  }

  // Derive initials from name
  function initials(name?: string): string {
    if (!name) return "?";
    return name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0].toUpperCase())
      .slice(0, 2)
      .join("");
  }

  // Map Firestore status → display status
  const statusMap: Record<string, TaskStatus> = {
    open: "Open",
    in_progress: "In Progress",
    completed: "Completed",
    overdue: "Overdue",
  };

  // Map Firestore priority → display priority
  const priorityMap: Record<string, MyWorkTask["priority"]> = {
    high: "High",
    medium: "Medium",
    low: "Low",
  };

  const dueMDY = toMDY(t.dueDate);
  const dueDate = parseMDY(dueMDY);
  const today = new Date();
  const diff = dueDate ? daysBetween(today, dueDate) : null;
  const status = statusMap[t.status] ?? "Open";
  const isOverdue = diff !== null && diff < 0 && status !== "Completed";

  return {
    id: t.id,
    name: t.title,
    description: t.description,
    source: "Case Management" as const,
    sourceDetail: t.type ?? "General",
    individualId: t.individualId ?? "unknown",
    individualName: t.individualName ?? "Unknown Individual",
    individualCounty: "",
    individualInitials: initials(t.individualName),
    dueDate: dueMDY,
    status: isOverdue ? "Overdue" : status,
    daysOverdue: isOverdue && diff !== null ? Math.abs(diff) : undefined,
    staffResponsible: "Me",
    priority: priorityMap[t.priority] ?? "Medium",
    createdOn: toMDY(t.createdAt),
    createdBy: t.assignedTo ?? "",
  };
}
import { AlertsTab } from "@/components/notifications/AlertsTab";
import { MentionsTab } from "@/components/notifications/MentionsTab";
import { AICheckInsTab } from "@/components/icm/AICheckInsTab";
import { StatCard } from "@/components/icm/StatCard";
import { useNotifications } from "@/hooks/useNotifications";
import { useSearchParams } from "react-router-dom";
import { loadCheckIns } from "@/lib/aiCheckIns";

type TopView = "my_work" | "alerts" | "mentions" | "ai_checkins" | "completed";
type TabKey = "today" | "week" | "all" | "completed";
type GroupMode = "individual" | "due";

// Inner tabs only show within the "My Work" top-level view.
const innerTabs: { key: Exclude<TabKey, "completed">; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "all", label: "All Tasks" },
];

function statusTone(status: TaskStatus) {
  switch (status) {
    case "Overdue":
      return { dot: "bg-icm-red", text: "text-icm-red", chip: "bg-icm-red-soft text-icm-red" };
    case "In Progress":
      return { dot: "bg-icm-amber", text: "text-icm-amber", chip: "bg-icm-amber-soft text-icm-amber" };
    case "Open":
      return { dot: "bg-icm-accent", text: "text-icm-accent", chip: "bg-icm-accent-soft text-icm-accent" };
    case "Completed":
      return { dot: "bg-icm-green", text: "text-icm-green", chip: "bg-icm-green-soft text-icm-green" };
    default:
      return { dot: "bg-icm-text-faint", text: "text-icm-text-dim", chip: "bg-icm-bg text-icm-text-dim" };
  }
}

function dueTone(task: MyWorkTask) {
  if (task.status === "Completed") return "text-icm-text-dim";
  const due = parseMDY(task.dueDate);
  if (!due) return "text-icm-text-dim";
  const diff = daysBetween(DEMO_TODAY, due);
  if (diff < 0) return "text-icm-red font-semibold";
  if (diff <= 7) return "text-icm-amber";
  if (diff <= 14) return "text-icm-amber";
  return "text-icm-green";
}

function StatusIcon({ status }: { status: TaskStatus }) {
  const cls = "w-4 h-4";
  switch (status) {
    case "Overdue":
      return <AlertCircle className={cn(cls, "text-icm-red fill-icm-red/15")} />;
    case "In Progress":
      return <Clock className={cn(cls, "text-icm-amber")} />;
    case "Open":
      return <Circle className={cn(cls, "text-icm-accent")} />;
    case "Completed":
      return <CheckCircle2 className={cn(cls, "text-icm-green")} />;
    default:
      return <Circle className={cn(cls, "text-icm-text-faint")} />;
  }
}

function SourceLabel({ task }: { task: MyWorkTask }) {
  const isAI = task.source === "AI";
  return (
    <span className={cn("text-[10.5px] font-geist", isAI ? "text-icm-accent" : "text-icm-text-faint")}>
      {isAI && "✨ "}
      {task.source} · {task.sourceDetail}
    </span>
  );
}

// ---------- Page ----------
const MyWork = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialView = (searchParams.get("tab") as TopView | null) ?? "my_work";
  const [view, setViewRaw] = useState<TopView>(
    initialView === "alerts" || initialView === "mentions" || initialView === "completed" || initialView === "ai_checkins"
      ? initialView
      : "my_work"
  );
  function setView(v: TopView) {
    setViewRaw(v);
    if (v === "my_work") setSearchParams({}, { replace: true });
    else setSearchParams({ tab: v }, { replace: true });
  }

  // --- Real Firestore tasks ---
  const { tasks: firestoreTasks, loading: tasksLoading } = useTasks();
  // Map Firestore shape → MyWorkTask shape for UI compatibility
  const tasks = useMemo(() => firestoreTasks.map(mapTaskToMyWork), [firestoreTasks]);
  // Local optimistic override for completions (id → true)
  const [localCompleted, setLocalCompleted] = useState<Set<string>>(new Set());
  // Apply optimistic completions
  const tasksWithOptimistic = useMemo(
    () =>
      tasks.map((t) =>
        localCompleted.has(t.id) ? { ...t, status: "Completed" as TaskStatus } : t,
      ),
    [tasks, localCompleted],
  );

  // Dynamic focused-session: first 4 open non-completed task IDs
  const focusedSessionTaskIds = useMemo(
    () => tasksWithOptimistic.filter((t) => t.status !== "Completed").slice(0, 4).map((t) => t.id),
    [tasksWithOptimistic],
  );

  const [tab, setTab] = useState<Exclude<TabKey, "completed">>("today");
  const [groupMode, setGroupMode] = useState<GroupMode>("individual");
  const [sort, setSort] = useState<"priority" | "due" | "name" | "type" | "created">("priority");
  const [showFilters, setShowFilters] = useState(true);
  const [filterIndividual, setFilterIndividual] = useState("");
  const [filterCounty, setFilterCounty] = useState<string>("All");
  const [filterSource, setFilterSource] = useState<"All" | MyWorkTask["source"]>("All");
  const [filterStatus, setFilterStatus] = useState<"All" | TaskStatus>("All");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [actionTask, setActionTask] = useState<MyWorkTask | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [briefDismissed, setBriefDismissed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showSessionDone, setShowSessionDone] = useState(false);

  const notif = useNotifications();

  // Use optimistic tasks everywhere below
  // (aliased for backwards compat with existing code that references `tasks`)
  // We shadow the const declared above
  const allTasks = tasksWithOptimistic;

  // ---- counts ----
  const counts = useMemo(() => {
    const open = allTasks.filter((t) => t.status !== "Completed");
    const overdue = open.filter((t) => bucketForTask(t) === "overdue").length;
    const today = open.filter((t) => bucketForTask(t) === "today").length;
    const week = open.filter((t) => {
      const b = bucketForTask(t);
      return b === "today" || b === "tomorrow" || b === "thisWeek";
    }).length;
    const completed = allTasks.filter((t) => t.status === "Completed").length;
    return { total: open.length, overdue, today, week, completed };
  }, [allTasks]);

  // ---- filter pipeline ----
  const filtered = useMemo(() => {
    let list = allTasks.slice();

    if (focused) {
      list = list.filter((t) => focusedSessionTaskIds.includes(t.id));
    }

    if (view === "completed") {
      list = list.filter((t) => t.status === "Completed");
    } else if (tab === "today") {
      list = list.filter((t) => {
        if (t.status === "Completed") return false;
        const b = bucketForTask(t);
        return b === "today" || b === "overdue";
      });
    } else if (tab === "week") {
      list = list.filter((t) => {
        if (t.status === "Completed") return false;
        const b = bucketForTask(t);
        return b === "today" || b === "tomorrow" || b === "thisWeek" || b === "overdue";
      });
    } else if (tab === "all") {
      list = list.filter((t) => t.status !== "Completed");
    }

    if (filterIndividual)
      list = list.filter((t) =>
        t.individualName.toLowerCase().includes(filterIndividual.toLowerCase()),
      );
    if (filterCounty !== "All")
      list = list.filter((t) => t.individualCounty === filterCounty);
    if (filterSource !== "All") list = list.filter((t) => t.source === filterSource);
    if (filterStatus !== "All") list = list.filter((t) => t.status === filterStatus);

    // sort
    const priorityWeight = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
    list.sort((a, b) => {
      if (sort === "priority") {
        // overdue first
        const ao = bucketForTask(a) === "overdue" ? 0 : 1;
        const bo = bucketForTask(b) === "overdue" ? 0 : 1;
        if (ao !== bo) return ao - bo;
        return priorityWeight[a.priority] - priorityWeight[b.priority];
      }
      if (sort === "due") {
        const ad = parseMDY(a.dueDate)?.getTime() ?? Infinity;
        const bd = parseMDY(b.dueDate)?.getTime() ?? Infinity;
        return ad - bd;
      }
      if (sort === "name") return a.individualName.localeCompare(b.individualName);
      if (sort === "type") return a.source.localeCompare(b.source);
      return (parseMDY(b.createdOn)?.getTime() ?? 0) - (parseMDY(a.createdOn)?.getTime() ?? 0);
    });

    return list;
  }, [allTasks, view, tab, filterIndividual, filterCounty, filterSource, filterStatus, sort, focused]);

  // unique counties for filter dropdown
  const counties = useMemo(
    () => Array.from(new Set(allTasks.map((t) => t.individualCounty).filter(Boolean))).sort(),
    [allTasks],
  );
  const grouped = useMemo(() => {
    if (groupMode === "individual") {
      const map = new Map<string, MyWorkTask[]>();
      for (const t of filtered) {
        const key = t.individualId;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      }
      const groups = Array.from(map.entries()).map(([id, items]) => ({
        id,
        label: items[0].individualName,
        sub: "",
        initials: items[0].individualInitials,
        items,
        overdueCount: items.filter((i) => bucketForTask(i) === "overdue").length,
      }));
      // float overdue groups to top
      groups.sort((a, b) => b.overdueCount - a.overdueCount);
      return groups;
    }
    // group by due bucket
    const order: { key: string; label: string; tone: string }[] = [
      { key: "overdue", label: "OVERDUE", tone: "text-icm-red" },
      { key: "today", label: "TODAY", tone: "text-icm-amber" },
      { key: "tomorrow", label: "TOMORROW", tone: "text-icm-accent" },
      { key: "thisWeek", label: "THIS WEEK", tone: "text-icm-text-dim" },
      { key: "nextWeek", label: "NEXT WEEK", tone: "text-icm-text-dim" },
      { key: "later", label: "LATER", tone: "text-icm-text-faint" },
    ];
    const map = new Map<string, MyWorkTask[]>();
    for (const t of filtered) {
      const k = bucketForTask(t);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return order
      .filter((o) => map.has(o.key))
      .map((o) => ({
        id: o.key,
        label: o.label,
        sub: "",
        initials: "",
        items: map.get(o.key)!,
        overdueCount: o.key === "overdue" ? map.get(o.key)!.length : 0,
        tone: o.tone,
      }));
  }, [filtered, groupMode]);

  // ---- actions ----
  function openTask(t: MyWorkTask) {
    if (t.status === "Completed") return;
    setActionTask(t);
  }

  function completeTask(id: string) {
    // Optimistic update locally
    setLocalCompleted((prev) => new Set([...prev, id]));
    setActionTask(null);
    // Persist to Firestore
    firestoreCompleteTask(id).catch((err) => {
      console.error("[completeTask]", err);
      // Roll back optimistic if Firestore write failed
      setLocalCompleted((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });

    if (focused) {
      const remaining = focusedSessionTaskIds.filter((tid) => {
        const current = allTasks.find((x) => x.id === tid);
        return current && current.status !== "Completed" && tid !== id;
      });
      if (remaining.length === 0) {
        setShowSessionDone(true);
      }
    }
  }

  function goToLinkedModule(t: MyWorkTask) {
    if (!t.linkedModule) return;
    navigate(`/people/${t.individualId}/${t.linkedModule.slug}`);
  }

  function toggleGroup(id: string) {
    setCollapsedGroups((p) => ({ ...p, [id]: !p[id] }));
  }

  // focused-session progress
  const sessionProgress = useMemo(() => {
    if (!focused) return null;
    const total = focusedSessionTaskIds.length;
    const done = focusedSessionTaskIds.filter(
      (id) => allTasks.find((t) => t.id === id)?.status === "Completed",
    ).length;
    return { done, total };
  }, [focused, allTasks, focusedSessionTaskIds]);

  // ---- loading skeleton ----
  if (tasksLoading) {
    return (
      <ICMShell title="My Work">
        <div className="space-y-5">
          <div className="space-y-1">
            <div className="h-9 w-40 rounded-xl bg-icm-border/40 animate-pulse" />
            <div className="h-4 w-72 rounded-lg bg-icm-border/30 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-[1.75rem] bg-icm-border/30 animate-pulse" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-[2rem] bg-icm-border/30 animate-pulse" />
            ))}
          </div>
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="My Work" rightPanel={<MyWorkAIPanel onStartFocused={() => setFocused(true)} />}>
      <div className="space-y-5">
        {/* Heading */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="font-manrope text-[34px] md:text-[38px] font-extrabold text-icm-text leading-[1.05] tracking-[-0.025em]">
              My Work
            </h1>
            <p className="text-[14.5px] text-icm-text-dim font-geist font-medium">
              Personalized caseload prioritization and task orchestration.
            </p>
          </div>
        </div>

        {/* Focused-session banner */}
        {focused && (
          <div className="rounded-xl border border-icm-amber/30 bg-icm-amber-soft px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-[12.5px] font-geist text-icm-text">
              <Sparkle className="w-4 h-4 text-icm-amber" />
              <span className="font-semibold">Focused session</span>
              <span className="text-icm-text-dim">
                · {sessionProgress?.done ?? 0} of {sessionProgress?.total ?? 0} tasks complete
              </span>
            </div>
            <button
              onClick={() => {
                setFocused(false);
                setShowSessionDone(false);
              }}
              className="text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text flex items-center gap-1"
            >
              Exit focused mode <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Daily brief — luminous glass banner */}
        {!briefDismissed && !focused && (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-icm-accent to-indigo-500 rounded-[2.2rem] blur-xl opacity-10 group-hover:opacity-20 transition duration-700 pointer-events-none" />
            <div className="relative bg-white/80 backdrop-blur-2xl border border-white/60 ring-1 ring-icm-border/50 p-6 md:p-7 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.02)] flex items-start gap-5">
              <div className="p-3.5 rounded-2xl shadow-[0_10px_20px_-5px_rgba(0,194,178,0.45)] shrink-0" style={{ backgroundColor: '#00C2B2' }}>
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[18px] md:text-[19px] font-manrope font-bold text-icm-text tracking-tight">
                    Good morning, Kathy.
                  </h2>
                  <button
                    onClick={() => setBriefDismissed(true)}
                    className="text-icm-text-faint hover:text-icm-text-dim transition-colors shrink-0"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="mt-1.5 text-[13.5px] md:text-[14px] text-icm-text-dim leading-relaxed font-geist max-w-2xl">
                  You have <span className="font-bold text-icm-text">{counts.total} open tasks</span> remaining today.{" "}
                  <button
                    onClick={() => { setFilterIndividual("Joseph"); setTab("all"); }}
                    className="text-icm-accent font-semibold hover:underline underline-offset-4"
                  >
                    Joseph Brown's quarterly visit
                  </button>{" "}
                  is marked as high priority.
                </p>
                <div className="mt-4 flex gap-2 flex-wrap">
                  {counts.overdue > 0 && (
                    <span className="px-3 py-1 bg-icm-red-soft text-icm-red text-[10.5px] font-extrabold rounded-xl border border-icm-red/15 shadow-sm uppercase tracking-widest">
                      {counts.overdue} Past Due
                    </span>
                  )}
                  {counts.today > 0 && (
                    <span className="px-3 py-1 bg-icm-amber-soft text-icm-amber text-[10.5px] font-extrabold rounded-xl border border-icm-amber/15 shadow-sm uppercase tracking-widest">
                      {counts.today} Due Today
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top-level segmented control: My Work / Alerts / Mentions / Completed */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="overflow-x-auto scrollbar-none -mx-1 sm:mx-0">
            <div className="inline-flex items-center p-1.5 rounded-2xl bg-icm-bg/70 ring-1 ring-icm-border/60 shadow-inner min-w-max" role="tablist" aria-label="Work views">
              {(() => {
                const checkInsList = loadCheckIns();
                const pendingAI = checkInsList.filter((c) => c.status === "Pending Review").length;
                return [
                  { key: "my_work" as const, label: "My Work", count: counts.overdue, alert: counts.overdue > 0 },
                  { key: "alerts" as const, label: "Alerts", count: notif.unreadAlerts, alert: notif.unreadAlerts > 0 },
                  { key: "mentions" as const, label: "Mentions", count: notif.unreadMentions, alert: notif.unreadMentions > 0 },
                  { key: "ai_checkins" as const, label: "AI Check-Ins", count: pendingAI, alert: pendingAI > 0 },
                  { key: "completed" as const, label: "Completed", count: counts.completed, alert: false },
                ];
              })().map((t) => {
                const active = view === t.key;
                return (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setView(t.key)}
                    className={cn(
                      "h-9 px-4 rounded-xl text-[12.5px] font-geist flex items-center gap-1.5 transition-all whitespace-nowrap flex-shrink-0",
                      active
                        ? "bg-icm-panel text-icm-text font-bold shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                        : "text-icm-text-dim hover:text-icm-text font-semibold"
                    )}
                  >
                    {t.label}
                    {t.count > 0 && (
                      <span
                        className={cn(
                          "px-1.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center",
                          t.alert
                            ? "bg-icm-red/10 text-icm-red"
                            : "bg-icm-bg text-icm-text-faint",
                          active && !t.alert && "bg-icm-bg"
                        )}
                      >
                        {t.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          {view === "my_work" && (
            <button
              onClick={() => setAddOpen(true)}
              className="group h-10 px-5 rounded-2xl text-[12.5px] font-geist font-bold text-white bg-icm-accent hover:bg-icm-accent/90 shadow-[0_10px_25px_-5px_rgba(59,130,246,0.45)] hover:shadow-[0_15px_30px_-5px_rgba(59,130,246,0.55)] hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Add task
            </button>
          )}
        </div>

        {/* Alerts / Mentions take over the page when active */}
        {view === "alerts" && (
          <AlertsTab
            alerts={notif.alerts}
            onMarkRead={notif.markAlertRead}
            onMarkUnread={notif.markAlertUnread}
            onDismiss={notif.dismissAlert}
            onMarkAllRead={notif.markAllAlertsRead}
            onClearDismissed={notif.clearDismissedAlerts}
          />
        )}
        {view === "mentions" && (
          <MentionsTab
            mentions={notif.mentions}
            onMarkRead={notif.markMentionRead}
            onMarkUnread={notif.markMentionUnread}
            onDismiss={notif.dismissMention}
            onMarkAllRead={notif.markAllMentionsRead}
          />
        )}
        {view === "ai_checkins" && <AICheckInsTab />}



        {/* Stat strip — quiet, minimal */}
        {view === "my_work" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Open" value={counts.total} tone="neutral" icon={ListChecks} />
            <StatCard label="Past due" value={counts.overdue} tone="red" icon={AlertCircle} />
            <StatCard label="Due today" value={counts.today} tone="amber" icon={Clock} />
            <StatCard label="This week" value={counts.week} tone="accent" icon={CalendarIcon} />
          </div>

        )}

        {/* Unified toolbar: timeframe + sort/filter */}
        {view === "my_work" && (
          <div className="rounded-2xl border border-icm-border bg-icm-panel px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-icm-bg">
              {innerTabs.map((t) => {
                const active = tab === t.key;
                const badge =
                  t.key === "today" ? counts.today : t.key === "week" ? counts.week : counts.total;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "h-7 px-3 rounded-md text-[11.5px] font-geist flex items-center gap-1.5 transition-colors",
                      active
                        ? "bg-icm-panel text-icm-text font-semibold shadow-sm"
                        : "text-icm-text-dim hover:text-icm-text"
                    )}
                  >
                    {t.label}
                    <span className="text-icm-text-faint font-mono text-[10px]">{badge}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="inline-flex items-center p-0.5 rounded-lg bg-icm-bg">
                <button
                  onClick={() => setGroupMode("individual")}
                  className={cn(
                    "h-7 px-2.5 rounded-md text-[11px] font-geist flex items-center gap-1.5",
                    groupMode === "individual"
                      ? "bg-icm-panel text-icm-text font-semibold shadow-sm"
                      : "text-icm-text-dim hover:text-icm-text"
                  )}
                >
                  <UsersIcon className="w-3.5 h-3.5" /> By person
                </button>
                <button
                  onClick={() => setGroupMode("due")}
                  className={cn(
                    "h-7 px-2.5 rounded-md text-[11px] font-geist flex items-center gap-1.5",
                    groupMode === "due"
                      ? "bg-icm-panel text-icm-text font-semibold shadow-sm"
                      : "text-icm-text-dim hover:text-icm-text"
                  )}
                >
                  <CalendarIcon className="w-3.5 h-3.5" /> By date
                </button>
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="h-7 px-2 rounded-md border border-icm-border bg-icm-panel text-[11px] text-icm-text-dim hover:text-icm-text"
              >
                <option value="priority">Priority</option>
                <option value="due">Due date</option>
                <option value="name">Individual</option>
                <option value="type">Task type</option>
                <option value="created">Created</option>
              </select>
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
            </div>
          </div>
        )}

        {/* Filters panel */}
        {view === "my_work" && showFilters && (
          <div className="rounded-2xl border border-icm-border bg-icm-panel p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={filterIndividual}
              onChange={(e) => setFilterIndividual(e.target.value)}
              placeholder="Search individual…"
              className="h-8 px-2.5 rounded-lg border border-icm-border bg-white text-[12px] text-icm-text"
            />
            <select
              value={filterCounty}
              onChange={(e) => setFilterCounty(e.target.value)}
              className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[12px] text-icm-text"
            >
              <option value="All">All counties</option>
              {counties.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as typeof filterSource)}
              className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[12px] text-icm-text"
            >
              <option value="All">All sources</option>
              <option value="Case Management">Case Management</option>
              <option value="Workflow">Workflow</option>
              <option value="AI">AI-generated</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[12px] text-icm-text"
            >
              <option value="All">All statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending Start">Pending Start</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        )}

        {/* Content */}
        {view !== "ai_checkins" && (grouped.length === 0 ? (
          <EmptyState tab={tab} onJumpWeek={() => setTab("week")} />
        ) : (
          <div className="space-y-5">

            {grouped.map((g) => {
              const collapsed = groupMode === "individual" ? (collapsedGroups[g.id] ?? true) : collapsedGroups[g.id];
              const hasOverdue = g.overdueCount > 0 && groupMode === "individual";
              return (
                <div
                  key={g.id}
                  className={cn(
                    "bg-icm-panel border border-icm-border/60 rounded-[2rem] overflow-hidden transition-all duration-500",
                    "shadow-[0_25px_70px_-20px_rgba(15,23,42,0.08),0_4px_10px_-2px_rgba(15,23,42,0.02)] hover:shadow-[0_35px_80px_-20px_rgba(15,23,42,0.1)]"
                  )}
                >
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(g.id)}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-icm-bg/40 transition-colors text-left border-b border-icm-border/40 bg-icm-bg/20"
                  >
                    {groupMode === "individual" ? (
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-[10.5px] font-manrope font-black shrink-0",
                        hasOverdue
                          ? "bg-icm-red-soft text-icm-red ring-1 ring-icm-red/15"
                          : "bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/15"
                      )}>
                        {g.initials}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-icm-bg border border-icm-border flex items-center justify-center shrink-0">
                        <CalendarIcon
                          className={cn("w-3.5 h-3.5", (g as any).tone ?? "text-icm-text-dim")}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "font-manrope font-bold text-[13px] tracking-tight",
                          groupMode === "due" ? (g as any).tone : "text-icm-text",
                          groupMode === "due" && "tracking-widest text-[11px] uppercase font-extrabold",
                        )}
                      >
                        {g.label}
                      </span>
                      {g.sub && (
                        <span className="text-[9.5px] font-extrabold text-icm-text-faint uppercase tracking-widest font-geist">{g.sub}</span>
                      )}
                      <span className="text-[11px] text-icm-text-dim font-geist">
                        · {g.items.length} task{g.items.length === 1 ? "" : "s"}
                        {hasOverdue && (
                          <>
                            <span className="mx-1 text-icm-text-faint">•</span>
                            <span className="text-icm-red font-bold">{g.overdueCount} overdue</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="p-1 text-icm-text-faint hover:text-icm-text-dim transition-colors">
                      {collapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </button>

                  {!collapsed && (
                    <div className="divide-y divide-icm-border/40">
                      {g.items.map((t) => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          expanded={expandedTask === t.id}
                          onToggleExpand={() =>
                            setExpandedTask(expandedTask === t.id ? null : t.id)
                          }
                          onComplete={() => openTask(t)}
                          onLinkedModule={() => goToLinkedModule(t)}
                          onAdvance={focused ? () => openTask(t) : undefined}
                          showIndividualName={groupMode === "due"}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>


      {/* Modals */}
      {actionTask && (
        <TaskActionModal
          task={actionTask}
          onClose={() => setActionTask(null)}
          onComplete={() => completeTask(actionTask.id)}
          onGoToModule={() => {
            goToLinkedModule(actionTask);
            setActionTask(null);
          }}
        />
      )}
      {addOpen && <AddTaskModal onClose={() => setAddOpen(false)} />}
      {showSessionDone && (
        <FocusedSessionDone
          onClose={() => {
            setShowSessionDone(false);
            setFocused(false);
          }}
        />
      )}
    </ICMShell>
  );
};

// ---------- Task Row ----------
function TaskRow({
  task,
  expanded,
  onToggleExpand,
  onComplete,
  onLinkedModule,
  onAdvance,
  showIndividualName,
}: {
  task: MyWorkTask;
  expanded: boolean;
  onToggleExpand: () => void;
  onComplete: () => void;
  onLinkedModule: () => void;
  onAdvance?: () => void;
  showIndividualName?: boolean;
}) {
  const { userProfile } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [commentPosting, setCommentPosting] = useState(false);
  const tone = statusTone(task.status);
  const due = parseMDY(task.dueDate);
  const diff = due ? daysBetween(DEMO_TODAY, due) : null;
  const isOver = diff !== null && diff < 0 && task.status !== "Completed";

  return (
    <div className={cn("px-4 py-2 transition-colors hover:bg-icm-bg/40 group/row", isOver && "bg-icm-red/[0.015]")}>
      <div className="flex items-center gap-3">
        {/* Status rail */}
        <div className="shrink-0">
          {isOver ? (
            <div className="w-4 h-4 rounded-md border-[2px] border-icm-red/30 bg-white flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-icm-red rounded-[2px]" />
            </div>
          ) : task.status === "Completed" ? (
            <div className="w-4 h-4 rounded-md bg-icm-green-soft flex items-center justify-center">
              <CheckCircle2 className="w-2.5 h-2.5 text-icm-green" />
            </div>
          ) : task.status === "In Progress" ? (
            <div className="w-4 h-4 rounded-md border-[2px] border-icm-amber/35 bg-white flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-icm-amber rounded-[2px]" />
            </div>
          ) : (
            <div className="w-4 h-4 rounded-md border-[2px] border-icm-border bg-white" />
          )}
        </div>

        {/* Body — single line */}
        <button onClick={onToggleExpand} className="text-left flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
          <span className="text-[13px] font-manrope font-semibold text-icm-text leading-tight tracking-tight truncate max-w-[260px]">
            {task.name}
          </span>
          {showIndividualName && (
            <span className="text-[11px] text-icm-text-dim font-geist">· {task.individualName}</span>
          )}
          {task.priority === "Critical" && (
            <span className="px-1.5 py-0 bg-icm-red-soft text-icm-red text-[9px] font-black rounded uppercase tracking-wider">
              Critical
            </span>
          )}
          <span className={cn("inline-flex items-center gap-1 text-[11.5px] font-geist font-medium", isOver ? "text-icm-red font-semibold" : "text-icm-text-dim")}>
            {isOver && <Clock className="w-3 h-3" />}
            Due {task.dueDate}{isOver && task.daysOverdue ? ` (${task.daysOverdue}d)` : ""}
          </span>
          <span className="text-[11px] text-icm-text-faint font-geist">· {task.staffResponsible}</span>
          {task.linkedModule && (
            <button
              onClick={(e) => { e.stopPropagation(); onLinkedModule(); }}
              className="px-1.5 py-0.5 rounded text-icm-accent text-[9.5px] font-bold uppercase tracking-tight bg-icm-accent-soft/70 border border-icm-accent/15 hover:bg-icm-accent hover:text-white transition-colors inline-flex items-center gap-1"
            >
              {task.linkedModule.label} <ArrowRight className="w-2.5 h-2.5" />
            </button>
          )}
          {task.aiDraftReady && (
            <span className="px-1.5 py-0.5 rounded bg-white text-indigo-600 text-[9.5px] font-bold uppercase tracking-tight border border-indigo-100 inline-flex items-center gap-1">
              <Sparkle className="w-2.5 h-2.5 fill-indigo-500 text-indigo-500" /> AI Draft
            </span>
          )}
        </button>

        {/* Action */}
        <div className="shrink-0">
          {task.status === "Completed" ? (
            <span className="text-[11px] text-icm-green font-bold flex items-center gap-1 px-2">
              <CheckCircle2 className="w-3 h-3" /> Done
            </span>
          ) : (
            <button
              onClick={onAdvance ?? onComplete}
              className="h-7 px-3 rounded-lg text-[11px] font-geist font-bold text-icm-text bg-white border border-icm-border hover:bg-icm-text hover:text-white hover:border-icm-text transition-colors"
            >
              {task.status === "Pending Start" ? "Start" : "Complete"}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-2 ml-7 rounded-lg border border-icm-border bg-icm-bg/60 p-3 space-y-2">
          {task.description && (
            <p className="text-[12px] text-icm-text font-geist leading-relaxed">
              {task.description}
            </p>
          )}
          <div className="text-[10.5px] text-icm-text-dim font-geist flex items-center gap-1.5 mt-0.5">
            Created by <AuthorCell name={task.createdBy} size="sm" showName={true} /> on {task.createdOn} · Source: {task.source}{task.sourceDetail ? ` · ${task.sourceDetail}` : ""}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && !commentPosting && commentText.trim()) {
                  setCommentPosting(true);
                  try {
                    await addTaskComment(task.id, commentText.trim(), userProfile?.uid ?? "", userProfile?.displayName ?? "Unknown");
                    setCommentText("");
                    toast.success("Comment posted");
                  } catch { toast.error("Failed to post comment."); }
                  finally { setCommentPosting(false); }
                }
              }}
              placeholder="Add a comment… use @ to mention"
              className="flex-1 h-8 px-2.5 rounded-lg border border-icm-border bg-white text-[12px] text-icm-text focus:border-icm-accent focus:ring-2 focus:ring-icm-accent/15 outline-none transition-all"
            />
            <button
              disabled={!commentText.trim() || commentPosting}
              onClick={async () => {
                if (!commentText.trim() || commentPosting) return;
                setCommentPosting(true);
                try {
                  await addTaskComment(task.id, commentText.trim(), userProfile?.uid ?? "", userProfile?.displayName ?? "Unknown");
                  setCommentText("");
                  toast.success("Comment posted");
                } catch { toast.error("Failed to post comment."); }
                finally { setCommentPosting(false); }
              }}
              className="text-[11px] text-icm-accent hover:underline font-bold disabled:opacity-40"
            >
              {commentPosting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Task Action Modal ----------
function TaskActionModal({
  task,
  onClose,
  onComplete,
  onGoToModule,
}: {
  task: MyWorkTask;
  onClose: () => void;
  onComplete: () => void;
  onGoToModule: () => void;
}) {
  const linked = !!task.linkedModule;
  return (
    <ModalShell onClose={onClose} title={`Complete: ${task.name}`}>
      <div className="space-y-3">
        <div className="text-[12px] text-icm-text-dim font-geist">
          Individual: <span className="text-icm-text font-semibold">{task.individualName}</span>
          {" · "}Due <span className="font-mono">{task.dueDate}</span>
        </div>

        {linked ? (
          <>
            <div className="rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-3 text-[12px] font-geist text-icm-text">
              This task requires action in{" "}
              <span className="font-semibold">{task.linkedModule!.label}</span> for{" "}
              <span className="font-semibold">{task.individualName}</span>.
            </div>
            {task.aiDraftReady && (
              <div className="rounded-lg border border-icm-amber/30 bg-icm-amber-soft p-3 text-[12px] font-geist text-icm-text flex items-start gap-2">
                <Sparkle className="w-4 h-4 text-icm-amber mt-0.5" />
                <span>
                  AI has pre-staged content in {task.linkedModule!.label}. Review before saving.
                </span>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onComplete}
                className="h-8 px-3 rounded-lg border border-icm-border text-[11.5px] text-icm-text-dim hover:text-icm-text"
              >
                Mark complete without documentation
              </button>
              <button
                onClick={onGoToModule}
                className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-semibold hover:opacity-90"
              >
                Go to {task.linkedModule!.label} →
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[12.5px] text-icm-text font-geist">Mark this task as complete?</p>
            <textarea
              placeholder="Add any completion notes…"
              className="w-full min-h-[80px] p-2 rounded-lg border border-icm-border bg-white text-[12px] text-icm-text"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="h-8 px-3 rounded-lg border border-icm-border text-[11.5px] text-icm-text-dim hover:text-icm-text"
              >
                Cancel
              </button>
              <button
                onClick={onComplete}
                className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-semibold hover:opacity-90"
              >
                Mark complete
              </button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}

// ---------- Add Task Modal ----------
function AddTaskModal({ onClose }: { onClose: () => void }) {
  const { userProfile } = useAuth();
  const { individuals, loading: indLoading } = useIndividuals();
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [individualId, setIndividualId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [type, setType] = useState("General");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Task name is required");
      return;
    }
    if (!dueDate) {
      toast.error("Due date is required");
      return;
    }

    setSaving(true);
    try {
      const selectedInd = individuals.find((ind) => ind.id === individualId);
      const indName = selectedInd
        ? `${selectedInd.first_name} ${selectedInd.last_name}`
        : "Unknown Individual";

      await createTask({
        title: title.trim(),
        description: description.trim(),
        individualId: individualId || "unknown",
        individualName: indName,
        dueDate, // YYYY-MM-DD
        status: "open",
        priority,
        type: type || "General",
        assignedTo: userProfile?.uid ?? "",
        organizationId: userProfile?.organizationId ?? "",
      });

      toast.success("Task added successfully");
      onClose();
    } catch (err: any) {
      console.error("Failed to add task:", err);
      toast.error("Failed to add task: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title="Add Task">
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <Field label="Task name">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="modal-input"
            placeholder="e.g. Schedule annual review"
          />
        </Field>
        <Field label="Individual">
          <select
            value={individualId}
            onChange={(e) => setIndividualId(e.target.value)}
            className="modal-input"
            disabled={indLoading}
          >
            <option value="">— select individual —</option>
            {individuals.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.first_name} {ind.last_name} ({ind.county})
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Due date">
            <input
              required
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="modal-input"
            />
          </Field>
          <Field label="Priority">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="modal-input"
            >
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="high">High</option>
            </select>
          </Field>
        </div>
        <Field label="Link to module (optional)">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="modal-input"
          >
            <option value="General">— none —</option>
            <option value="Contact Note">Contact Note</option>
            <option value="Monitoring Form">Monitoring Form</option>
            <option value="Visit Summary">Visit Summary</option>
            <option value="Eligibility Verification">Eligibility Verification</option>
            <option value="Care Plan / ISP">Care Plan / ISP</option>
            <option value="Progress Note">Progress Note</option>
            <option value="Workflow">Workflow</option>
            <option value="Incident">Incident</option>
          </select>
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="modal-input min-h-[60px]"
            placeholder="Optional details…"
          />
        </Field>
        <div className="rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-3 text-[11.5px] text-icm-text font-geist flex items-start gap-2">
          <Sparkle className="w-3.5 h-3.5 text-icm-accent mt-0.5" />
          <span>
            Want me to suggest tasks based on this individual's upcoming compliance deadlines?{" "}
            <button
              type="button"
              disabled={aiLoading || !individualId}
              onClick={async () => {
                if (aiLoading) return;
                setAiLoading(true);
                try {
                  const token = await auth.currentUser?.getIdToken();
                  const selectedInd = individuals.find((ind) => ind.id === individualId);
                  const indName = selectedInd ? `${selectedInd.first_name} ${selectedInd.last_name}` : "";
                  
                  const res = await fetch(
                    "https://us-central1-casemanagement-ai.cloudfunctions.net/api/api/chat",
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({
                        message: `Suggest 3 high-priority tasks for individual ${indName} based on upcoming compliance deadlines, ISP reviews, and health assessments. Be concise — one sentence per task.`,
                        context: { page: "my_work", module: "task_suggestions" },
                      }),
                    }
                  );
                  const data = await res.json();
                  const reply = data.reply ?? "Unable to generate suggestions at this time.";
                  import("@/lib/demoToast").then((m) => m.demoToast(reply));
                } catch {
                  import("@/lib/demoToast").then((m) => m.demoToast("Failed to get AI suggestions. Check your connection."));
                } finally {
                  setAiLoading(false);
                }
              }}
              className="text-icm-accent font-semibold hover:underline inline-flex items-center gap-1 disabled:opacity-40 disabled:hover:no-underline"
            >
              {aiLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : null}
              {aiLoading ? "Loading…" : "Show suggestions"}
            </button>
          </span>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-lg border border-icm-border text-[11.5px] text-icm-text-dim hover:text-icm-text"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add task"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ---------- Focused Session Done ----------
function FocusedSessionDone({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell onClose={onClose} title="">
      <div className="text-center py-3 space-y-2">
        <div className="w-14 h-14 rounded-full bg-icm-green-soft mx-auto flex items-center justify-center">
          <PartyPopper className="w-7 h-7 text-icm-green" />
        </div>
        <h3 className="text-[16px] font-manrope font-bold text-icm-text">Focused session complete</h3>
        <p className="text-[12.5px] text-icm-text-dim">4 priority tasks done. Great work, Kathy.</p>
        <button
          onClick={onClose}
          className="mt-3 h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-semibold hover:opacity-90"
        >
          Back to My Work
        </button>
      </div>
    </ModalShell>
  );
}

// ---------- Reusable bits ----------
function StatTile({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "neutral" | "red" | "amber" | "accent";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const value$ = {
    neutral: "text-icm-text",
    red: "text-icm-red",
    amber: "text-icm-amber",
    accent: "text-icm-accent",
  }[tone];
  const iconBg = {
    neutral: "bg-icm-bg text-icm-text-dim group-hover:bg-icm-accent-soft group-hover:text-icm-accent",
    red: "bg-icm-red-soft text-icm-red/70",
    amber: "bg-icm-amber-soft text-icm-amber/70",
    accent: "bg-icm-accent-soft text-icm-accent/70",
  }[tone];
  const hoverShadow = {
    neutral: "hover:shadow-[0_25px_50px_-12px_rgba(15,23,42,0.08)]",
    red: "hover:shadow-[0_25px_50px_-12px_rgba(239,68,68,0.18)]",
    amber: "hover:shadow-[0_25px_50px_-12px_rgba(245,158,11,0.18)]",
    accent: "hover:shadow-[0_25px_50px_-12px_rgba(59,130,246,0.18)]",
  }[tone];
  return (
    <div className={cn("group bg-icm-panel border border-icm-border/70 p-6 rounded-[1.75rem] shadow-[0_15px_35px_-12px_rgba(15,23,42,0.06),0_4px_10px_-2px_rgba(15,23,42,0.02)] transition-all duration-300 cursor-default", hoverShadow)}>
      <p className="text-[10px] font-extrabold text-icm-text-faint uppercase tracking-widest">
        {label}
      </p>
      <div className="flex items-end justify-between mt-3">
        <span className={cn("font-manrope text-[44px] font-black leading-none tracking-tighter", value$)}>
          {value}
        </span>
        {Icon && (
          <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm transition-all", iconBg)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}


function Chip({
  tone,
  label,
  value,
}: {
  tone: "neutral" | "red" | "amber" | "accent" | "green";
  label: string;
  value: number;
}) {
  const cls = {
    neutral: "bg-icm-bg text-icm-text-dim border-icm-border",
    red: "bg-icm-red-soft text-icm-red border-icm-red/20",
    amber: "bg-icm-amber-soft text-icm-amber border-icm-amber/20",
    accent: "bg-icm-accent-soft text-icm-accent border-icm-accent/20",
    green: "bg-icm-green-soft text-icm-green border-icm-green/20",
  }[tone];
  return (
    <div className={cn("h-8 px-2.5 rounded-lg border flex items-center gap-1.5 text-[11.5px] font-geist", cls)}>
      <span>{label}</span>
      <span className="font-mono font-bold">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] text-icm-text-dim font-geist">{label}</span>
      <div className="mt-1">{children}</div>
      <style>{`.modal-input { width:100%; height:32px; padding:0 8px; border-radius:8px; border:1px solid hsl(var(--icm-border)); background:white; font-size:12px; color:hsl(var(--icm-text)); font-family: inherit; }
      textarea.modal-input { padding:8px; height:auto; }`}</style>
    </label>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-icm-text/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-[480px] rounded-2xl bg-icm-panel border border-icm-border shadow-elevated overflow-hidden">
        {title && (
          <div className="px-4 py-3 border-b border-icm-border flex items-center justify-between">
            <h3 className="text-[14px] font-manrope font-bold text-icm-text">{title}</h3>
            <button onClick={onClose} className="text-icm-text-faint hover:text-icm-text">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ tab, onJumpWeek }: { tab: TabKey; onJumpWeek: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-icm-green-soft flex items-center justify-center mb-3">
        <ListChecks className="w-6 h-6 text-icm-green" />
      </div>
      <h3 className="text-[15px] font-manrope font-bold text-icm-text">All caught up</h3>
      <p className="text-[12.5px] text-icm-text-dim mt-1 max-w-[360px]">
        {tab === "today"
          ? "Nothing due today. Check 'This Week' for upcoming tasks."
          : "No open tasks right now. AI will surface new tasks as deadlines approach."}
      </p>
      {tab === "today" && (
        <button
          onClick={onJumpWeek}
          className="mt-3 text-[11.5px] text-icm-accent hover:underline font-semibold"
        >
          View this week →
        </button>
      )}
      <span className="mt-3 px-2 py-0.5 rounded-full bg-icm-green-soft text-icm-green text-[10px] font-mono font-bold">
        Great work
      </span>
    </div>
  );
}

// ---------- AI panel ----------
const CHAT_ENDPOINT = "https://us-central1-casemanagement-ai.cloudfunctions.net/api/api/chat";
const MW_QUICK_PROMPTS = ["Prioritize my day", "What's overdue?", "Draft a note"];

type ChatMsg = { role: "user" | "ai"; text: string };

function MyWorkAIPanel({ onStartFocused }: { onStartFocused: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMsg = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text.trim(),
          context: { page: "my_work", module: "daily_planner" },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.reply ?? data.message ?? data.text ?? "Sorry, no response.";
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", text: "⚠️ Couldn't reach the AI. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <aside className="w-[320px] shrink-0 border-l border-icm-border bg-icm-panel flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-icm-border/50 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[12px] font-semibold text-icm-text font-geist">Daily AI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-icm-green animate-pulse" />
            <span className="text-[10px] font-geist text-icm-green font-semibold">Ready</span>
          </div>
        </div>
        <button
          onClick={onStartFocused}
          className="w-full h-8 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-semibold hover:opacity-90 transition-opacity"
        >
          Start focused session
        </button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0">
        {messages.length === 0 && !loading && (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-2xl ai-gradient flex items-center justify-center mx-auto mb-2">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <p className="text-[11.5px] text-icm-text-dim font-geist leading-relaxed">
              Ask me anything about your tasks, caseload, or upcoming deadlines.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "ai" && (
              <div className="w-6 h-6 rounded-lg ai-gradient flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[220px] rounded-2xl px-3 py-2 text-[11.5px] font-geist leading-relaxed relative group",
                m.role === "user"
                  ? "bg-icm-text text-icm-panel rounded-tr-sm"
                  : "bg-icm-bg border border-icm-border text-icm-text rounded-tl-sm"
              )}
            >
              {m.text}
              {m.role === "ai" && (
                <button
                  onClick={() => handleCopy(m.text, i)}
                  className="absolute -bottom-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-icm-text-faint hover:text-icm-text-dim"
                >
                  {copied === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-lg ai-gradient flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <div className="bg-icm-bg border border-icm-border rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-icm-text-dim animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-icm-text-dim animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-icm-text-dim animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
          {MW_QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="h-7 px-2.5 rounded-full border border-icm-accent/30 bg-icm-accent-soft text-icm-accent text-[11px] font-geist hover:bg-icm-accent hover:text-white transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 shrink-0">
        <div className="flex items-center gap-1.5 rounded-xl border border-icm-border bg-icm-bg px-2.5 py-1.5 focus-within:border-icm-accent focus-within:ring-2 focus-within:ring-icm-accent/15 transition-all">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage(input))}
            placeholder="Ask anything…"
            className="flex-1 bg-transparent text-[11.5px] font-geist text-icm-text outline-none placeholder:text-icm-text-faint"
          />
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-icm-text-faint hover:text-icm-text-dim transition-colors"
              title="Clear chat"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-6 h-6 rounded-lg bg-icm-text text-icm-panel flex items-center justify-center disabled:opacity-40 hover:opacity-80 transition-opacity"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </aside>
  );
}

function Section({
  tone,
  title,
  children,
}: {
  tone: "red" | "accent" | "green";
  title: string;
  children: React.ReactNode;
}) {
  const map = {
    red: "border-icm-red/20 bg-icm-red-soft",
    accent: "border-icm-accent/20 bg-icm-accent-soft",
    green: "border-icm-green/20 bg-icm-green-soft",
  } as const;
  const titleColor = {
    red: "text-icm-red",
    accent: "text-icm-accent",
    green: "text-icm-green",
  }[tone];
  return (
    <div className={cn("mt-3 rounded-xl border p-3", map[tone])}>
      <p className={cn("text-[10px] font-mono font-bold tracking-wider", titleColor)}>{title}</p>
      <p className="text-[11.5px] font-geist text-icm-text mt-1 leading-relaxed">{children}</p>
    </div>
  );
}

export default MyWork;
