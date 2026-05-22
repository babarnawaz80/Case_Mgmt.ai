import { useMemo, useState } from "react";
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
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { cn } from "@/lib/utils";
import {
  myWorkTasks as seedTasks,
  focusedSessionTaskIds,
  bucketForTask,
  parseMDY,
  daysBetween,
  DEMO_TODAY,
  type MyWorkTask,
  type TaskStatus,
} from "@/data/myWork";
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

  const [tasks, setTasks] = useState<MyWorkTask[]>(seedTasks);
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

  // ---- counts ----
  const counts = useMemo(() => {
    const open = tasks.filter((t) => t.status !== "Completed");
    const overdue = open.filter((t) => bucketForTask(t) === "overdue").length;
    const today = open.filter((t) => bucketForTask(t) === "today").length;
    const week = open.filter((t) => {
      const b = bucketForTask(t);
      return b === "today" || b === "tomorrow" || b === "thisWeek";
    }).length;
    const completed = tasks.filter((t) => t.status === "Completed").length;
    return { total: open.length, overdue, today, week, completed };
  }, [tasks]);

  // ---- filter pipeline ----
  const filtered = useMemo(() => {
    let list = tasks.slice();

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
  }, [tasks, view, tab, filterIndividual, filterCounty, filterSource, filterStatus, sort, focused]);

  // unique counties for filter dropdown
  const counties = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.individualCounty).filter(Boolean))).sort(),
    [tasks],
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
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "Completed" as TaskStatus } : t)),
    );
    setActionTask(null);

    if (focused) {
      const remaining = focusedSessionTaskIds.filter((tid) => {
        const updated = tasks.find((x) => x.id === tid);
        return updated && updated.status !== "Completed" && tid !== id;
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
      (id) => tasks.find((t) => t.id === id)?.status === "Completed",
    ).length;
    return { done, total };
  }, [focused, tasks]);

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
          <div className="inline-flex items-center p-1.5 rounded-2xl bg-icm-bg/70 ring-1 ring-icm-border/60 shadow-inner">
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
                  onClick={() => setView(t.key)}
                  className={cn(
                    "h-9 px-4 rounded-xl text-[12.5px] font-geist flex items-center gap-1.5 transition-all",
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
              const collapsed = collapsedGroups[g.id];
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
          <div className="text-[10.5px] text-icm-text-dim font-geist">
            Created by {task.createdBy} on {task.createdOn} · Source: {task.source}{task.sourceDetail ? ` · ${task.sourceDetail}` : ""}
          </div>
          <div className="flex items-center gap-2">
            <input
              placeholder="Add a comment… use @ to mention"
              className="flex-1 h-8 px-2.5 rounded-lg border border-icm-border bg-white text-[12px] text-icm-text focus:border-icm-accent focus:ring-2 focus:ring-icm-accent/15 outline-none transition-all"
            />
            <button
              onClick={() => demoSuccess("Comment posted")}
              className="text-[11px] text-icm-accent hover:underline font-bold"
            >
              Post
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
  return (
    <ModalShell onClose={onClose} title="Add Task">
      <div className="space-y-2.5">
        <Field label="Task name">
          <input className="modal-input" placeholder="e.g. Schedule annual review" />
        </Field>
        <Field label="Individual">
          <input className="modal-input" placeholder="Search individual…" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Due date">
            <input type="date" className="modal-input" />
          </Field>
          <Field label="Priority">
            <select className="modal-input">
              <option>Medium</option>
              <option>Low</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </Field>
        </div>
        <Field label="Link to module (optional)">
          <select className="modal-input">
            <option value="">— none —</option>
            <option>Contact Note</option>
            <option>Monitoring Form</option>
            <option>Visit Summary</option>
            <option>Eligibility Verification</option>
            <option>Care Plan / ISP</option>
            <option>Progress Note</option>
            <option>Workflow</option>
            <option>Incident</option>
          </select>
        </Field>
        <Field label="Description">
          <textarea className="modal-input min-h-[60px]" placeholder="Optional details…" />
        </Field>
        <div className="rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-3 text-[11.5px] text-icm-text font-geist flex items-start gap-2">
          <Sparkle className="w-3.5 h-3.5 text-icm-accent mt-0.5" />
          <span>
            Want me to suggest tasks based on this individual's upcoming compliance deadlines?{" "}
            <button
              onClick={() => demoToast("AI task suggestions")}
              className="text-icm-accent font-semibold hover:underline"
            >
              Show suggestions
            </button>
          </span>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg border border-icm-border text-[11.5px] text-icm-text-dim hover:text-icm-text"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-semibold hover:opacity-90"
          >
            Add task
          </button>
        </div>
      </div>
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
function MyWorkAIPanel({ onStartFocused }: { onStartFocused: () => void }) {
  return (
    <aside className="w-[320px] shrink-0 border-l border-icm-border bg-icm-panel p-4 overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-[12px] font-semibold text-icm-text font-geist">Daily plan</span>
      </div>

      <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft p-3 space-y-2">
        <p className="text-[11.5px] font-geist text-icm-text-dim">
          Here's how I'd prioritize your day:
        </p>
        <ol className="space-y-1.5 text-[11.5px] font-geist text-icm-text">
          <li>
            <span className="font-semibold">1.</span> Joseph Brown — Quarterly visit
            <span className="text-icm-red"> (76d overdue)</span>
          </li>
          <li>
            <span className="font-semibold">2.</span> Joseph Brown — Verify MA status
            <span className="text-icm-red"> (10d overdue)</span>
          </li>
          <li>
            <span className="font-semibold">3.</span> Mohsin Raza — Monitoring form due today
          </li>
          <li>
            <span className="font-semibold">4.</span> Ashley Walker — PCP renewal in 14 days
          </li>
        </ol>
        <button
          onClick={onStartFocused}
          className="mt-1 w-full h-8 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-semibold hover:opacity-90"
        >
          Start focused session
        </button>
      </div>

      <Section tone="red" title="URGENT">
        3 tasks are past due. Longest overdue: Joseph's quarterly visit at 76 days. This affects his
        compliance status.
      </Section>
      <Section tone="accent" title="INSIGHT">
        You have 4 tasks due today. Based on location, I suggest starting with Joseph (Carroll
        County) then Mohsin (Bremer County) to minimize travel.
      </Section>
      <Section tone="accent" title="INSIGHT">
        Ashley Walker's PCP renewal is 14 days away. Starting the ISP Renewal Workflow now gives
        you enough time to complete all 8 steps.
      </Section>
      <Section tone="green" title="GOOD NEWS">
        You completed 3 tasks yesterday. Dwight Doe's case management is fully up to date.
      </Section>

      <p className="text-[10.5px] text-icm-text-faint mt-4 font-geist border-t border-icm-border pt-3">
        Your daily task summary was sent to kathy@agency.com at 7:00 AM.
      </p>
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
