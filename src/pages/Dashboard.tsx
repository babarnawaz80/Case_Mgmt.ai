import { ICMShell } from "@/components/icm/ICMShell";

import { Donut } from "@/components/icm/charts";
import { people, initials, riskAvatarClass, type Person } from "@/data/people";
import { globalIncidentSummary } from "@/data/incidents";
import { NavLink, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sun,
  Users,
  AlertTriangle,
  CreditCard,
  FileText,
  ClipboardList,
  ClipboardCheck,
  StickyNote,
  Heart,
  Shield,
  Phone,
  GraduationCap,
  Briefcase,
  CheckSquare,
  Calendar,
  CalendarCheck,
  Folder,
  PhoneCall,
  UserCheck,
  PenTool,
  BarChart3,
  Receipt,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

/* ============================================================
   Greeting banner — IDDBilling-inspired
============================================================ */
function GreetingBanner({ name }: { name: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div className="rounded-2xl border border-icm-border bg-icm-panel px-6 py-5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-icm-amber-soft flex items-center justify-center">
          <Sun className="w-6 h-6 text-icm-amber" />
        </div>
        <div>
          <h1 className="font-manrope text-[24px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
            {greeting}, {name}
          </h1>
          <p className="text-[13px] text-icm-text-dim mt-0.5 font-geist">
            Here's what's happening today
          </p>
        </div>
      </div>
      <div className="text-right hidden sm:block">
        <p className="text-[13px] font-geist font-semibold text-icm-text">{dateStr}</p>
        <p className="text-[11px] text-icm-text-dim font-geist mt-0.5">Dashboard Overview</p>
      </div>
    </div>
  );
}

/* ============================================================
   Hero KPI cards — large pastel, IDDBilling-style
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
      <p className={`font-manrope text-[40px] font-extrabold leading-none tracking-tight mt-1 ${t.valueText}`}>
        {kpi.value}
      </p>
      <p className="text-[12px] text-icm-text-dim mt-1.5 font-geist">{kpi.sub}</p>
      <span className="inline-flex items-center gap-1 text-[11px] font-geist font-semibold text-icm-accent mt-3 group-hover:gap-2 transition-all">
        {kpi.cta} <ArrowRight className="w-3 h-3" />
      </span>
      {/* Decorative circle */}
      <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/30" />
    </NavLink>
  );
}

/* Hero meter card — donut-based, matches HeroKpiCard pastel styling */
interface HeroMeter {
  label: string;
  value: number; // 0-100
  centerLabel: string;
  sub: string;
  icon: LucideIcon;
  to: string;
  cta: string;
  tone: "blue" | "amber" | "emerald" | "rose";
  donutColor: string;
}

const METER_TONES: Record<HeroMeter["tone"], { bg: string; ring: string; iconBg: string; iconText: string }> = {
  blue: {
    bg: "bg-gradient-to-br from-[hsl(210,90%,97%)] to-[hsl(210,80%,92%)]",
    ring: "ring-[hsl(210,80%,80%)]/40",
    iconBg: "bg-white/70",
    iconText: "text-icm-accent",
  },
  amber: {
    bg: "bg-gradient-to-br from-[hsl(28,100%,97%)] to-[hsl(20,90%,93%)]",
    ring: "ring-[hsl(28,90%,80%)]/40",
    iconBg: "bg-white/70",
    iconText: "text-icm-amber",
  },
  emerald: {
    bg: "bg-gradient-to-br from-[hsl(155,70%,96%)] to-[hsl(155,60%,90%)]",
    ring: "ring-[hsl(155,60%,75%)]/40",
    iconBg: "bg-white/70",
    iconText: "text-icm-green",
  },
  rose: {
    bg: "bg-gradient-to-br from-[hsl(350,90%,97%)] to-[hsl(350,80%,92%)]",
    ring: "ring-[hsl(350,80%,80%)]/40",
    iconBg: "bg-white/70",
    iconText: "text-icm-red",
  },
};

function HeroMeterCard({ kpi }: { kpi: HeroMeter }) {
  const t = METER_TONES[kpi.tone];
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
        <div className="relative">
          <Donut value={kpi.value} size={64} stroke={7} color={kpi.donutColor} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono font-bold text-[12px] text-icm-text">{kpi.centerLabel}</span>
          </div>
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-icm-text-dim font-geist font-semibold mt-3">
        {kpi.label}
      </p>
      <p className="text-[12px] text-icm-text-dim mt-1 font-geist">{kpi.sub}</p>
      <span className="inline-flex items-center gap-1 text-[11px] font-geist font-semibold text-icm-accent mt-3 group-hover:gap-2 transition-all">
        {kpi.cta} <ArrowRight className="w-3 h-3" />
      </span>
      <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/30" />
    </NavLink>
  );
}

function HeroRow() {
  const census = people.length;
  const activeCensus = people.filter((p) => p.status === "Active").length;
  const highRisk = people.filter((p) => (p.riskScore ?? 0) >= 60).length;
  const reviewRisk = people.filter((p) => (p.riskScore ?? 0) >= 35 && (p.riskScore ?? 0) < 60).length;
  const attentionCount = highRisk + reviewRisk;
  const incidentSummary = globalIncidentSummary();
  const kpis: HeroKpi[] = [
    {
      label: "Census",
      value: census.toString(),
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
    },
  ];
  const attention: HeroMeter = {
    label: "People Needing Attention",
    value: (attentionCount / census) * 100,
    centerLabel: `${attentionCount}/${census}`,
    sub: `${highRisk} high-risk · ${reviewRisk} review`,
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
   Compliance donut row — 4 cards, IDDBilling-style
============================================================ */
interface DonutKpi {
  title: string;
  subtitle?: string;
  value: number;
  centerLabel: string;
  color: string;
  to: string;
  legend?: { label: string; value: string | number; dot: string }[];
}

function DonutCard({ kpi }: { kpi: DonutKpi }) {
  return (
    <NavLink
      to={kpi.to}
      className="rounded-xl border border-icm-border bg-icm-panel p-4 hover:border-icm-border-strong hover:shadow-elevated transition-all flex flex-col"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-manrope font-bold text-[13.5px] text-icm-text">{kpi.title}</p>
          {kpi.subtitle && (
            <p className="text-[11px] text-icm-text-dim font-geist mt-0.5">{kpi.subtitle}</p>
          )}
        </div>
        <span className="text-[10px] font-geist font-semibold text-icm-accent inline-flex items-center gap-0.5">
          Details <ArrowRight className="w-2.5 h-2.5" />
        </span>
      </div>
      <div className="flex items-center justify-between mt-3 flex-1">
        {kpi.legend && (
          <div className="space-y-1">
            {kpi.legend.map((l) => (
              <div key={l.label} className="flex items-center gap-2 text-[11px] font-geist">
                <span className={`w-1.5 h-1.5 rounded-full ${l.dot}`} />
                <span className="text-icm-text-dim">{l.label}:</span>
                <span className="font-mono font-semibold text-icm-text">{l.value}</span>
              </div>
            ))}
          </div>
        )}
        <div className="relative">
          <Donut value={kpi.value} size={72} stroke={8} color={kpi.color} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono font-bold text-[12px] text-icm-text">{kpi.centerLabel}</span>
          </div>
        </div>
      </div>
    </NavLink>
  );
}

function DonutRow() {
  const items: DonutKpi[] = [
    {
      title: "PCP Compliance",
      subtitle: "Person-Centered Plans",
      value: 84.2,
      centerLabel: "84%",
      color: "hsl(var(--icm-green))",
      to: "/documentation/care-plans",
      legend: [
        { label: "On Track", value: "78%", dot: "bg-icm-green" },
        { label: "Off Track", value: "12%", dot: "bg-icm-amber" },
        { label: "Out of Comp.", value: "10%", dot: "bg-icm-red" },
      ],
    },
    {
      title: "Services",
      subtitle: "Care Tracker coverage",
      value: 87,
      centerLabel: "87%",
      color: "hsl(var(--icm-accent))",
      to: "/documentation",
      legend: [
        { label: "Delivered", value: 412, dot: "bg-icm-accent" },
        { label: "Missed", value: 18, dot: "bg-icm-red" },
        { label: "Pending", value: 42, dot: "bg-icm-amber" },
      ],
    },
    {
      title: "My Work",
      subtitle: "Task breakdown",
      value: 64,
      centerLabel: "14",
      color: "hsl(var(--icm-amber))",
      to: "/my-work",
      legend: [
        { label: "Open", value: 8, dot: "bg-icm-accent" },
        { label: "Past Due", value: 3, dot: "bg-icm-red" },
        { label: "In Progress", value: 2, dot: "bg-icm-amber" },
        { label: "Completed", value: 1, dot: "bg-icm-green" },
      ],
    },
    {
      title: "ISP Reviews",
      subtitle: "Next 30 days",
      value: 72,
      centerLabel: "72%",
      color: "hsl(270,60%,58%)",
      to: "/documentation/care-plans",
      legend: [
        { label: "Due Soon", value: 6, dot: "bg-icm-amber" },
        { label: "Overdue", value: 1, dot: "bg-icm-red" },
        { label: "Complete", value: 22, dot: "bg-icm-green" },
      ],
    },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map((k) => (
        <DonutCard key={k.title} kpi={k} />
      ))}
    </div>
  );
}

/* ============================================================
   Quick Actions grid — color-banded tiles
   Combines legacy iCM color tiles + IDDBilling Quick Actions
============================================================ */
type ActionCategory = "Documentation" | "Operations" | "Care" | "Schedule";

interface ActionTile {
  label: string;
  icon: LucideIcon;
  to: string;
  category: ActionCategory;
  count?: number;
}

const ACTION_TONES: Record<
  ActionCategory,
  { bg: string; hover: string; ring: string; iconBg: string }
> = {
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
  Schedule: {
    bg: "bg-[hsl(158,60%,42%)]",
    hover: "hover:bg-[hsl(158,60%,37%)]",
    ring: "ring-[hsl(158,60%,32%)]/30",
    iconBg: "bg-white/15",
  },
};

const ACTIONS: ActionTile[] = [
  // Documentation (blue)
  { label: "Activity Note", icon: FileText, to: "/documentation/contact-notes", category: "Documentation", count: 24 },
  { label: "Progress Note", icon: PenTool, to: "/documentation/progress-notes", category: "Documentation", count: 14 },
  { label: "Visit Summary", icon: CalendarCheck, to: "/documentation/visit-summaries", category: "Documentation", count: 6 },
  { label: "Monitoring Form", icon: ClipboardList, to: "/documentation/monitoring-forms", category: "Documentation", count: 4 },

  // Operations (orange)
  { label: "Managed Documents", icon: Folder, to: "/documents", category: "Operations", count: 8 },
  { label: "On Call Log", icon: PhoneCall, to: "/documentation", category: "Operations", count: 3 },
  { label: "Training", icon: GraduationCap, to: "/settings", category: "Operations", count: 4 },
  { label: "Leads", icon: Phone, to: "/leads", category: "Operations" },

  // Care (purple)
  { label: "Assigned Staff", icon: UserCheck, to: "/settings/users", category: "Care", count: 12 },
  { label: "Referrals", icon: Phone, to: "/documentation", category: "Care" },
  { label: "Team", icon: Heart, to: "/settings/users", category: "Care" },
  { label: "Communications", icon: PhoneCall, to: "/documentation", category: "Care", count: 5 },
];

function ActionTileBtn({ tile }: { tile: ActionTile }) {
  const navigate = useNavigate();
  const tone = ACTION_TONES[tile.category];
  const Icon = tile.icon;
  return (
    <button
      onClick={() => navigate(tile.to)}
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
  const categories: ActionCategory[] = ["Documentation", "Operations", "Care"];
  return (
    <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-1 h-4 rounded-full bg-icm-accent" />
        <h3 className="font-manrope font-bold text-[13px] text-icm-text uppercase tracking-wider">
          Quick Actions
        </h3>
        <span className="text-[11px] text-icm-text-faint font-geist ml-auto">
          {ACTIONS.length} modules
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {categories.map((cat) => {
          const items = ACTIONS.filter((a) => a.category === cat);
          return (
            <div key={cat} className="space-y-2.5">
              {items.map((a) => (
                <ActionTileBtn key={a.label} tile={a} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Category legend */}
      <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-icm-border">
        {(["Documentation", "Operations", "Care"] as ActionCategory[]).map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${ACTION_TONES[cat].bg}`} />
            <span className="text-[11px] font-geist text-icm-text-dim">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Dashboard composition
============================================================ */
const Dashboard = () => {
  return (
    <ICMShell title="iCM Dashboard">
      <div className="space-y-5">
        <GreetingBanner name="Kathy" />
        <HeroRow />
        <DonutRow />



        <QuickActions />
      </div>
    </ICMShell>
  );
};

export default Dashboard;
