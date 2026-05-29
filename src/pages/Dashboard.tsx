// Dashboard — compact greeting + KPI cards with meters + My Work Queue
// GreetingBanner (compact) + HeroRow (3 KPI+meter cards + 1 donut) + MyWorkQueue + QuickActions

import { ICMShell } from "@/components/icm/ICMShell";
import { Donut } from "@/components/icm/charts";
import { NavLink, useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIndividuals, riskTier, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { useIncidentSummary } from "@/hooks/useIncidents";
import { useTasks, completeTask } from "@/hooks/useTasks";
import type { Task } from "@/hooks/useTasks";
import {
  Sun,
  Users,
  AlertTriangle,
  CreditCard,
  FileText,
  ClipboardList,
  Heart,
  Phone,
  GraduationCap,
  Folder,
  PhoneCall,
  UserCheck,
  PenTool,
  ArrowRight,
  Search,
  X,
  FileCheck,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

/* ============================================================
   Greeting banner — compact
============================================================ */
function GreetingBanner({ name }: { name: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <div className="rounded-2xl border border-icm-border bg-icm-panel px-4 py-2.5 flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-icm-amber-soft flex items-center justify-center shrink-0">
        <Sun className="w-[18px] h-[18px] text-icm-amber" />
      </div>
      <div>
        <h1 className="font-manrope text-[16px] font-bold text-icm-text leading-tight tracking-[-0.01em]">
          {greeting}, {name}
        </h1>
        <p className="text-[12px] text-icm-text-dim font-geist leading-none mt-0.5">
          Here's what's happening today
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Hero KPI cards — large pastel, with optional embedded meter
============================================================ */
interface HeroKpi {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  to: string;
  cta: string;
  tone: "blue" | "amber" | "emerald";
  trend?: { value: string; positive?: boolean };
  meter?: { value: number; centerLabel: string; color: string };
}

const HERO_TONES: Record<HeroKpi["tone"], { bg: string; ring: string; iconBg: string; iconText: string; valueText: string }> = {
  blue: {
    bg: "bg-gradient-to-br from-[hsl(210,90%,97%)] to-[hsl(210,80%,92%)]",
    ring: "ring-[hsl(210,80%,80%)]/40",
    iconBg: "bg-white/70",
    iconText: "text-icm-accent",
    valueText: "text-icm-text",
  },
  amber: {
    bg: "bg-gradient-to-br from-[hsl(28,100%,97%)] to-[hsl(20,90%,93%)]",
    ring: "ring-[hsl(28,90%,80%)]/40",
    iconBg: "bg-white/70",
    iconText: "text-icm-amber",
    valueText: "text-icm-text",
  },
  emerald: {
    bg: "bg-gradient-to-br from-[hsl(155,70%,96%)] to-[hsl(155,60%,90%)]",
    ring: "ring-[hsl(155,60%,75%)]/40",
    iconBg: "bg-white/70",
    iconText: "text-icm-green",
    valueText: "text-icm-green",
  },
};

function HeroKpiCard({ kpi }: { kpi: HeroKpi }) {
  const t = HERO_TONES[kpi.tone];
  const Icon = kpi.icon;
  return (
    <NavLink
      to={kpi.to}
      className={`relative overflow-hidden rounded-2xl ring-1 ${t.ring} ${t.bg} p-5 group hover:shadow-elevated transition-all block`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${t.iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${t.iconText}`} />
        </div>
        {kpi.trend && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
              kpi.trend.positive ? "bg-white/70 text-icm-green" : "bg-white/70 text-icm-red"
            }`}
          >
            {kpi.trend.positive ? "▲" : "▼"} {kpi.trend.value}
          </span>
        )}
      </div>
      <p className="text-[10px] uppercase tracking-wider text-icm-text-dim font-geist font-semibold mt-3">
        {kpi.label}
      </p>
      {/* Value row — with optional inline meter */}
      <div className="flex items-end justify-between gap-2 mt-1">
        <div className="min-w-0">
          <p className={`font-manrope text-[40px] font-extrabold leading-none tracking-tight ${t.valueText}`}>
            {kpi.value}
          </p>
          <p className="text-[12px] text-icm-text-dim mt-1.5 font-geist">{kpi.sub}</p>
        </div>
        {kpi.meter && (
          <div className="relative shrink-0 pb-0.5">
            <Donut value={kpi.meter.value} size={58} stroke={6} color={kpi.meter.color} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="font-mono font-bold text-[9px] leading-none text-center"
                style={{ color: kpi.meter.color }}
              >
                {kpi.meter.centerLabel}
              </span>
            </div>
          </div>
        )}
      </div>
      <span className="inline-flex items-center gap-1 text-[11px] font-geist font-semibold text-icm-accent mt-3 group-hover:gap-2 transition-all">
        {kpi.cta} <ArrowRight className="w-3 h-3" />
      </span>
      <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/30" />
    </NavLink>
  );
}

/* Hero meter card — donut-based */
interface HeroMeter {
  label: string;
  value: number;
  centerLabel: string;
  sub: string;
  icon: LucideIcon;
  to: string;
  cta: string;
  tone: "rose";
  donutColor: string;
}

function HeroMeterCard({ kpi }: { kpi: HeroMeter }) {
  const Icon = kpi.icon;
  return (
    <NavLink
      to={kpi.to}
      className="relative overflow-hidden rounded-2xl ring-1 ring-[hsl(0,80%,80%)]/40 bg-gradient-to-br from-[hsl(0,90%,97%)] to-[hsl(0,80%,93%)] p-5 group hover:shadow-elevated transition-all block"
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center">
          <Icon className="w-5 h-5 text-icm-red" />
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-icm-text-dim font-geist font-semibold mt-3">
        {kpi.label}
      </p>
      <div className="flex items-center gap-4 mt-2">
        <div className="relative shrink-0">
          <Donut value={kpi.value} size={72} stroke={8} color={kpi.donutColor} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono font-bold text-[13px] text-icm-text">{kpi.centerLabel}</span>
          </div>
        </div>
        <div>
          <p className="text-[12px] text-icm-text-dim font-geist">{kpi.sub}</p>
          <span className="inline-flex items-center gap-1 text-[11px] font-geist font-semibold text-icm-accent mt-2 group-hover:gap-2 transition-all">
            {kpi.cta} <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
      <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/30" />
    </NavLink>
  );
}

function HeroRow() {
  const { individuals } = useIndividuals();
  const census = individuals.length;
  const activeCensus = individuals.filter((p) => p.enrollment_status === "active").length;
  const highRisk = individuals.filter((p) => riskTier(p.risk_score) === "high").length;
  const reviewRisk = individuals.filter((p) => riskTier(p.risk_score) === "review").length;
  const attentionCount = highRisk + reviewRisk;
  const incidentSummary = useIncidentSummary();

  const incidentMeterValue =
    incidentSummary.totalOpen > 0
      ? Math.round((incidentSummary.overdue / incidentSummary.totalOpen) * 100)
      : 0;

  const kpis: HeroKpi[] = [
    {
      label: "Census",
      value: census > 0 ? census.toString() : "—",
      sub: `${activeCensus} active · ${census - activeCensus} inactive/pending`,
      icon: Users,
      to: "/people",
      cta: "Open People",
      tone: "blue",
    },
    {
      label: "Incidents",
      value: incidentSummary.totalOpen.toString().padStart(2, "0"),
      sub: `${incidentSummary.overdue} overdue · ${incidentSummary.closedThisMonth} closed`,
      icon: AlertTriangle,
      to: "/incidents",
      cta: "View All",
      tone: "amber",
      meter: {
        value: incidentMeterValue,
        centerLabel: `${incidentSummary.overdue}/${incidentSummary.totalOpen}`,
        color: "hsl(var(--icm-amber))",
      },
    },
    {
      label: "Billing",
      value: "98%",
      sub: "Claims clean rate",
      icon: CreditCard,
      to: "/billing",
      cta: "Billing Hub",
      tone: "emerald",
      trend: { value: "+1.4%", positive: true },
      meter: {
        value: 98,
        centerLabel: "98%",
        color: "hsl(var(--icm-green))",
      },
    },
  ];

  const attention: HeroMeter = {
    label: "People Needing Attention",
    value: census > 0 ? (attentionCount / census) * 100 : 0,
    centerLabel: `${attentionCount}/${census}`,
    sub: `${highRisk} high-risk · ${reviewRisk} need review`,
    icon: AlertTriangle,
    to: "/people",
    cta: "View Watchlist",
    tone: "rose",
    donutColor: "hsl(var(--icm-red))",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis.map((k) => (
        <HeroKpiCard key={k.label} kpi={k} />
      ))}
      <HeroMeterCard kpi={attention} />
    </div>
  );
}

/* ============================================================
   My Work Queue — replaces Care Alerts
============================================================ */

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-[hsl(var(--icm-red))]",
  medium: "bg-[hsl(var(--icm-amber))]",
  low: "bg-icm-border",
};

function dueDateLabel(dateStr: string, todayStr: string): string {
  if (!dateStr) return "No date";
  const d = new Date(dateStr + "T00:00:00");
  const todayMs = new Date(todayStr + "T00:00:00").getTime();
  const diffDays = Math.round((d.getTime() - todayMs) / 86_400_000);
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function WorkQueueTaskRow({
  task,
  todayStr,
  onComplete,
}: {
  task: Task;
  todayStr: string;
  onComplete: (id: string) => void;
}) {
  const dotClass = PRIORITY_DOT[task.priority] ?? PRIORITY_DOT.low;
  const isOverdue = !!task.dueDate && task.dueDate < todayStr;
  const isToday = task.dueDate === todayStr;
  const label = dueDateLabel(task.dueDate, todayStr);

  return (
    <div className="flex items-center gap-3 py-1.5 px-3 rounded-xl hover:bg-icm-bg/70 transition-colors group cursor-default">
      {/* Checkbox button */}
      <button
        onClick={() => onComplete(task.id)}
        aria-label={`Complete: ${task.title}`}
        className="w-4.5 h-4.5 w-[18px] h-[18px] rounded-full border-2 border-icm-border group-hover:border-icm-accent flex items-center justify-center shrink-0 transition-colors hover:bg-icm-accent/10"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-icm-accent/50 transition-colors" />
      </button>

      {/* Priority dot */}
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />

      {/* Title + individual — single line */}
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-geist font-semibold text-icm-text truncate leading-tight">
          {task.title}
          {task.individualName && (
            <span className="font-normal text-icm-text-dim ml-1.5">· {task.individualName}</span>
          )}
        </p>
      </div>

      {/* Due badge */}
      <span
        className={`text-[10px] font-geist font-semibold shrink-0 px-2 py-0.5 rounded-full whitespace-nowrap ${
          isOverdue
            ? "bg-[hsl(0,90%,96%)] text-[hsl(var(--icm-red))]"
            : isToday
            ? "bg-[hsl(28,100%,95%)] text-[hsl(var(--icm-amber))]"
            : "bg-icm-bg text-icm-text-dim"
        }`}
      >
        {label}
      </span>

      {/* Hover arrow to full task */}
      <NavLink
        to="/my-work"
        onClick={(e) => e.stopPropagation()}
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        tabIndex={-1}
      >
        <ArrowRight className="w-3.5 h-3.5 text-icm-accent" />
      </NavLink>
    </div>
  );
}

function WorkQueueGroup({
  title,
  tasks,
  accentClass,
  todayStr,
  onComplete,
}: {
  title: string;
  tasks: Task[];
  accentClass: string;
  todayStr: string;
  onComplete: (id: string) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <p className={`text-[9.5px] uppercase tracking-widest font-geist font-bold mb-0.5 px-3 ${accentClass}`}>
        {title} · {tasks.length}
      </p>
      <div className="space-y-0">
        {tasks.map((t) => (
          <WorkQueueTaskRow key={t.id} task={t} todayStr={todayStr} onComplete={onComplete} />
        ))}
      </div>
    </div>
  );
}

function MyWorkQueue() {
  const { tasks, loading } = useTasks();
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  const todayStr = new Date().toISOString().split("T")[0];

  // End of current week (Saturday)
  const endOfWeekStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + (6 - d.getDay()));
    return d.toISOString().split("T")[0];
  })();

  const pending = tasks.filter(
    (t) => t.status !== "completed" && !completingIds.has(t.id)
  );

  const overdueTasks  = pending.filter((t) => t.dueDate && t.dueDate < todayStr);
  const todayTasks    = pending.filter((t) => t.dueDate === todayStr);
  const thisWeekTasks = pending.filter((t) => t.dueDate > todayStr && t.dueDate <= endOfWeekStr);
  const upcomingTasks = pending.filter((t) => !t.dueDate || t.dueDate > endOfWeekStr);

  const handleComplete = async (id: string) => {
    setCompletingIds((prev) => new Set([...prev, id]));
    try {
      await completeTask(id);
    } catch {
      // Roll back optimistic removal on error
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const totalPending = pending.length;
  const hasWork = totalPending > 0;

  // Max tasks shown per section on the dashboard
  const MAX_OVERDUE  = 3;
  const MAX_TODAY    = 2;
  const MAX_WEEK     = 2;
  const MAX_UPCOMING = 3;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="icm-section-title">My Work Queue</h2>
          {!loading && (
            <div className="flex items-center gap-1.5">
              {overdueTasks.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-geist font-semibold bg-[hsl(0,90%,96%)] text-[hsl(var(--icm-red))] px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {overdueTasks.length} overdue
                </span>
              )}
              {todayTasks.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-geist font-semibold bg-[hsl(28,100%,95%)] text-[hsl(var(--icm-amber))] px-2 py-0.5 rounded-full">
                  {todayTasks.length} due today
                </span>
              )}
              {totalPending > 0 && overdueTasks.length === 0 && todayTasks.length === 0 && (
                <span className="text-[10.5px] font-geist text-icm-text-faint">
                  {totalPending} pending
                </span>
              )}
            </div>
          )}
        </div>
        <NavLink
          to="/my-work"
          className="inline-flex items-center gap-1 text-[11px] font-geist font-semibold text-icm-accent hover:gap-2 transition-all shrink-0"
        >
          View All <ArrowRight className="w-3 h-3" />
        </NavLink>
      </div>

      {/* Card body */}
      <div className="rounded-2xl border border-icm-border bg-icm-panel p-3">
        {loading ? (
          /* Skeleton */
          <div className="space-y-2.5 py-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center gap-3 px-3 py-2">
                <div className="w-5 h-5 rounded-full bg-icm-border/50 animate-pulse shrink-0" />
                <div className="w-2 h-2 rounded-full bg-icm-border/60 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div
                    className="h-3 bg-icm-border/50 rounded animate-pulse"
                    style={{ width: `${55 + (n * 8) % 30}%` }}
                  />
                  <div
                    className="h-2.5 bg-icm-border/35 rounded animate-pulse"
                    style={{ width: `${35 + (n * 7) % 25}%` }}
                  />
                </div>
                <div className="w-16 h-5 bg-icm-border/35 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : !hasWork ? (
          /* Empty state */
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[hsl(155,70%,94%)] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-icm-green" />
            </div>
            <div>
              <p className="font-manrope font-bold text-[14px] text-icm-text">All caught up!</p>
              <p className="text-[12px] text-icm-text-dim mt-0.5 font-geist">
                No pending tasks. Great work!
              </p>
            </div>
            <NavLink
              to="/my-work"
              className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline mt-1"
            >
              Go to My Work →
            </NavLink>
          </div>
        ) : (
          /* Task groups */
          <div className="space-y-2">
            <WorkQueueGroup
              title="Overdue"
              tasks={overdueTasks.slice(0, MAX_OVERDUE)}
              accentClass="text-[hsl(var(--icm-red))]"
              todayStr={todayStr}
              onComplete={handleComplete}
            />
            <WorkQueueGroup
              title="Due Today"
              tasks={todayTasks.slice(0, MAX_TODAY)}
              accentClass="text-[hsl(var(--icm-amber))]"
              todayStr={todayStr}
              onComplete={handleComplete}
            />
            <WorkQueueGroup
              title="This Week"
              tasks={thisWeekTasks.slice(0, MAX_WEEK)}
              accentClass="text-icm-accent"
              todayStr={todayStr}
              onComplete={handleComplete}
            />
            {/* Show Upcoming only if no overdue/today/week tasks */}
            {overdueTasks.length === 0 && todayTasks.length === 0 && thisWeekTasks.length === 0 && (
              <WorkQueueGroup
                title="Upcoming"
                tasks={upcomingTasks.slice(0, MAX_UPCOMING)}
                accentClass="text-icm-text-dim"
                todayStr={todayStr}
                onComplete={handleComplete}
              />
            )}

            {/* "View more" footer link */}
            {totalPending > MAX_OVERDUE + MAX_TODAY + MAX_WEEK && (
              <NavLink
                to="/my-work"
                className="flex items-center justify-center gap-1.5 text-[11.5px] font-geist font-semibold text-icm-accent py-2 border-t border-icm-border mt-2 hover:underline"
              >
                +{totalPending - (MAX_OVERDUE + MAX_TODAY + MAX_WEEK)} more tasks · View All
                <ArrowRight className="w-3 h-3" />
              </NavLink>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Quick Actions grid — color-banded tiles
============================================================ */
type ActionCategory = "Documentation" | "Operations" | "Care";

interface ActionTile {
  label: string;
  icon: LucideIcon;
  to: string;
  category: ActionCategory;
  count?: number;
  formRoute?: (personId: string) => string;
}

const ACTION_TONES: Record<ActionCategory, { bg: string; hover: string; ring: string; iconBg: string }> = {
  Documentation: {
    bg: "bg-[hsl(210,85%,55%)]",
    hover: "hover:bg-[hsl(210,85%,50%)]",
    ring: "ring-[hsl(210,85%,45%)]/30",
    iconBg: "bg-white/15",
  },
  Operations: {
    bg: "bg-[hsl(22,90%,56%)]",
    hover: "hover:bg-[hsl(22,90%,51%)]",
    ring: "ring-[hsl(22,90%,46%)]/30",
    iconBg: "bg-white/15",
  },
  Care: {
    bg: "bg-[hsl(270,55%,58%)]",
    hover: "hover:bg-[hsl(270,55%,53%)]",
    ring: "ring-[hsl(270,55%,48%)]/30",
    iconBg: "bg-white/15",
  },
};

const ACTIONS: ActionTile[] = [
  { label: "Contact Note",     icon: FileText,      to: "/modules/contact-note", category: "Documentation", count: 24 },
  { label: "Progress Note",    icon: PenTool,        to: "/progress-note",        category: "Documentation", count: 14 },
  { label: "Visit Summary",    icon: ClipboardList,  to: "/visit-summary",        category: "Documentation", count: 6  },
  { label: "Monitoring Form",  icon: ClipboardList,  to: "/monitoring-form",      category: "Documentation", count: 4  },
  { label: "Managed Documents",icon: Folder,         to: "/documents",            category: "Operations",    count: 8  },
  { label: "On Call Log",      icon: PhoneCall,      to: "/oncall-log",           category: "Operations",    count: 3  },
  { label: "Training",         icon: GraduationCap,  to: "/settings",             category: "Operations",    count: 4  },
  { label: "Leads",            icon: Phone,          to: "/leads",                category: "Operations"               },
  { label: "Assigned Staff",   icon: UserCheck,      to: "/settings/users",       category: "Care",          count: 12 },
  { label: "Referrals",        icon: Phone,          to: "/referrals",            category: "Care"                     },
  { label: "Team",             icon: Heart,          to: "/settings/users",       category: "Care"                     },
  { label: "Authorizations",   icon: FileCheck,      to: "/authorizations",       category: "Care"                     },
];

function ActionTileBtn({ tile, onClick }: { tile: ActionTile; onClick: () => void }) {
  const tone = ACTION_TONES[tile.category];
  const Icon = tile.icon;
  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left rounded-xl ${tone.bg} ${tone.hover} ring-1 ${tone.ring} px-3 py-2.5 flex items-center gap-2.5 text-white shadow-sm hover:shadow-elevated hover:-translate-y-0.5 transition-all overflow-hidden`}
    >
      <div className={`w-8 h-8 rounded-lg ${tone.iconBg} flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-manrope font-semibold text-[12.5px] leading-tight truncate">{tile.label}</p>
      </div>
      {typeof tile.count === "number" && (
        <span className="font-mono font-bold text-[11px] bg-white/20 px-1.5 py-0.5 rounded-full shrink-0">
          {tile.count}
        </span>
      )}
    </button>
  );
}

function QuickActions() {
  const navigate = useNavigate();
  const categories: ActionCategory[] = ["Documentation", "Operations", "Care"];
  const [picker, setPicker] = useState<{ label: string; formRoute: (id: string) => string } | null>(null);
  const tiles = ACTIONS;

  const handleTileClick = (tile: ActionTile) => {
    if (tile.formRoute) {
      setPicker({ label: tile.label, formRoute: tile.formRoute });
    } else {
      navigate(tile.to);
    }
  };

  return (
    <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="icm-section-title">Quick Actions</h3>
        <span className="text-[11px] text-icm-text-faint font-geist">
          {ACTIONS.length} modules
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {categories.map((cat) => {
          const items = tiles.filter((a) => a.category === cat);
          return (
            <div key={cat} className="space-y-2">
              <div className="space-y-2">
                {items.map((a) => (
                  <ActionTileBtn key={a.label} tile={a} onClick={() => handleTileClick(a)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {picker && (
        <IndividualPickerModal
          title={picker.label}
          onClose={() => setPicker(null)}
          onSelect={(personId) => {
            const target = picker.formRoute(personId);
            setPicker(null);
            navigate(target);
          }}
        />
      )}
    </div>
  );
}

function IndividualPickerModal({
  title,
  onClose,
  onSelect,
}: {
  title: string;
  onClose: () => void;
  onSelect: (personId: string) => void;
}) {
  const { individuals } = useIndividuals();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const active = individuals.filter((p) => p.enrollment_status === "active");
    const fullName = (p: typeof individuals[0]) => `${p.first_name} ${p.last_name}`;
    if (!term) return active.slice(0, 60);
    return active
      .filter((p) => fullName(p).toLowerCase().includes(term) || p.id.toLowerCase().includes(term))
      .slice(0, 60);
  }, [individuals, q]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-[15px] text-foreground">Start {title}</h2>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">
              Select the individual this {title.toLowerCase()} is for
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search individuals…"
              className="w-full h-9 pl-8 pr-2 rounded-lg border border-border bg-background text-[12px] text-foreground"
            />
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
          {list.length === 0 && (
            <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
              No individuals found
            </div>
          )}
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60 transition-colors"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold",
                  riskAvatarClass(p.risk_score)
                )}
              >
                {initials(p)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-foreground truncate">
                  {p.first_name} {p.last_name}
                </p>
                <p className="text-[10.5px] font-mono text-muted-foreground truncate">{p.id}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Dashboard page composition
============================================================ */
const Dashboard = () => {
  const { userProfile, currentUser, refreshProfile } = useAuth();

  // Always read the latest name from Firestore when Dashboard mounts.
  useEffect(() => {
    refreshProfile?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName =
    userProfile?.firstName ||
    userProfile?.displayName?.split(" ")[0] ||
    currentUser?.displayName?.split(" ")[0] ||
    currentUser?.email?.split("@")[0] ||
    "there";

  return (
    <ICMShell title="iCM Dashboard">
      <div className="space-y-5">
        <GreetingBanner name={firstName} />
        <HeroRow />
        <MyWorkQueue />
        <QuickActions />
      </div>
    </ICMShell>
  );
};

export default Dashboard;
