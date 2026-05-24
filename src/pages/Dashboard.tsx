// Dashboard — restored to match original Lovable/GitHub design exactly
// GreetingBanner + HeroRow (3 KPI cards + 1 donut meter) + DonutRow (4 donuts) + QuickActions
// Uses live Firestore hooks instead of static mock data

import { ICMShell } from "@/components/icm/ICMShell";
import { Donut } from "@/components/icm/charts";
import { NavLink, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useIndividuals, riskTier, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { useAllProgressNotes } from "@/hooks/useProgressNotes";
import { useIncidentSummary } from "@/hooks/useIncidents";
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
  type LucideIcon,
} from "lucide-react";

/* ============================================================
   Greeting banner
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
   Hero KPI cards — large pastel
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
   Compliance donut row — 4 cards
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
  const { individuals, loading: indLoading } = useIndividuals();
  const { notes, loading: notesLoading } = useAllProgressNotes();
  const loading = indLoading || notesLoading;

  const metrics = useMemo(() => {
    const total = individuals.length;
    if (total === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. ISP On-Time: pcp_due_date is still in the future (or today) — plan not yet expired
    const ispOnTime = individuals.filter((p) => {
      if (!p.pcp_due_date) return false;
      return new Date(p.pcp_due_date) >= today;
    }).length;

    // 2. Visit Compliance: last_visit_date within the last 30 days
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const visitCompliant = individuals.filter((p) => {
      if (!p.last_visit_date) return false;
      return new Date(p.last_visit_date) >= thirtyDaysAgo;
    }).length;

    // 3. Documentation: individual has at least 1 progress note in our fetched set
    const individualsWithNotes = new Set(notes.map((n) => n.individualId));
    const documented = individuals.filter((p) => individualsWithNotes.has(p.id)).length;

    // 4. Care Plans Active: enrollment_status === 'active'
    const carePlansActive = individuals.filter((p) => p.enrollment_status === "active").length;

    const pct = (n: number) =>
      total > 0 ? Math.round((n / total) * 100) : 0;

    return {
      ispOnTime: { n: ispOnTime, pct: pct(ispOnTime) },
      visitCompliance: { n: visitCompliant, pct: pct(visitCompliant) },
      documentation: { n: documented, pct: pct(documented) },
      carePlansActive: { n: carePlansActive, pct: pct(carePlansActive) },
      total,
    };
  }, [individuals, notes]);

  const dash = "—";

  const items: DonutKpi[] = [
    {
      title: "ISP On-Time",
      subtitle: "Active care plans",
      value: loading || !metrics ? 0 : metrics.ispOnTime.pct,
      centerLabel: loading ? dash : !metrics ? "0%" : `${metrics.ispOnTime.pct}%`,
      color: "hsl(var(--icm-green))",
      to: "/documentation/care-plans",
      legend: loading || !metrics ? undefined : [
        { label: "On-Time", value: metrics.ispOnTime.n, dot: "bg-icm-green" },
        { label: "Overdue/Missing", value: metrics.total - metrics.ispOnTime.n, dot: "bg-icm-red" },
      ],
    },
    {
      title: "Visit Compliance",
      subtitle: "Note in last 30 days",
      value: loading || !metrics ? 0 : metrics.visitCompliance.pct,
      centerLabel: loading ? dash : !metrics ? "0%" : `${metrics.visitCompliance.pct}%`,
      color: "hsl(var(--icm-accent))",
      to: "/documentation",
      legend: loading || !metrics ? undefined : [
        { label: "Compliant", value: metrics.visitCompliance.n, dot: "bg-icm-accent" },
        { label: "Missing", value: metrics.total - metrics.visitCompliance.n, dot: "bg-icm-red" },
      ],
    },
    {
      title: "Documentation",
      subtitle: "Has ≥1 progress note",
      value: loading || !metrics ? 0 : metrics.documentation.pct,
      centerLabel: loading ? dash : !metrics ? "0%" : `${metrics.documentation.pct}%`,
      color: "hsl(var(--icm-amber))",
      to: "/documentation",
      legend: loading || !metrics ? undefined : [
        { label: "Documented", value: metrics.documentation.n, dot: "bg-icm-green" },
        { label: "No Notes", value: metrics.total - metrics.documentation.n, dot: "bg-icm-amber" },
      ],
    },
    {
      title: "Care Plans Active",
      subtitle: "Enrollment status",
      value: loading || !metrics ? 0 : metrics.carePlansActive.pct,
      centerLabel: loading ? dash : !metrics ? "0%" : `${metrics.carePlansActive.pct}%`,
      color: "hsl(270,60%,58%)",
      to: "/people",
      legend: loading || !metrics ? undefined : [
        { label: "Active", value: metrics.carePlansActive.n, dot: "bg-icm-green" },
        { label: "Inactive", value: metrics.total - metrics.carePlansActive.n, dot: "bg-icm-red" },
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
  { label: "Contact Note", icon: FileText, to: "/modules/contact-note", category: "Documentation", count: 24 },
  { label: "Progress Note", icon: PenTool, to: "/progress-note", category: "Documentation", count: 14, formRoute: (id) => `/people/${id}/progress-note` },
  { label: "Visit Summary", icon: ClipboardList, to: "/documentation", category: "Documentation", count: 6, formRoute: (id) => `/people/${id}/visit-summary` },
  { label: "Monitoring Form", icon: ClipboardList, to: "/documentation", category: "Documentation", count: 4, formRoute: (id) => `/people/${id}/monitoring-form` },
  { label: "Managed Documents", icon: Folder, to: "/documents", category: "Operations", count: 8 },
  { label: "On Call Log", icon: PhoneCall, to: "/oncall-log", category: "Operations", count: 3 },
  { label: "Training", icon: GraduationCap, to: "/settings", category: "Operations", count: 4 },
  { label: "Leads", icon: Phone, to: "/leads", category: "Operations" },
  { label: "Assigned Staff", icon: UserCheck, to: "/settings/users", category: "Care", count: 12 },
  { label: "Referrals", icon: Phone, to: "/referrals", category: "Care" },
  { label: "Team", icon: Heart, to: "/settings/users", category: "Care" },
  { label: "Communications", icon: PhoneCall, to: "/documentation", category: "Care", count: 5 },
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
                <ActionTileBtn key={a.label} tile={a} onClick={() => handleTileClick(a)} />
              ))}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-icm-border">
        {(["Documentation", "Operations", "Care"] as ActionCategory[]).map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${ACTION_TONES[cat].bg}`} />
            <span className="text-[11px] font-geist text-icm-text-dim">{cat}</span>
          </div>
        ))}
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
   Dashboard composition — identical to original Lovable design
============================================================ */
const Dashboard = () => {
  const { userProfile, currentUser } = useAuth();
  const firstName = userProfile?.firstName || currentUser?.displayName?.split(" ")[0] || "Kathy";

  return (
    <ICMShell title="iCM Dashboard">
      <div className="space-y-5">
        <GreetingBanner name={firstName} />
        <HeroRow />
        <DonutRow />
        <QuickActions />
      </div>
    </ICMShell>
  );
};

export default Dashboard;
