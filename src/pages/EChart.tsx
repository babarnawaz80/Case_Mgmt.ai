import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getDocs, query, collection, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ICMShell } from "@/components/icm/ICMShell";
import { DischargedBanner } from "@/components/icm/DischargedBanner";
import { demoToast } from "@/lib/demoToast";
import { PreVisitModal } from "@/components/visit/PreVisitModal";
import { useRole } from "@/contexts/RoleContext";
import { useIndividual, calcAge, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { PersonAvatar } from "@/components/icm/PersonAvatar";
import { useRiskScore } from "@/contexts/RiskScoreContext";
import { calculateRiskScore, loadRiskSettings, riskColor } from "@/lib/riskEngine";
import { useEChartCounts } from "@/hooks/useEChartCounts";
import { useEChartStats, fmtVisitDate } from "@/hooks/useEChartStats";
import {
  CheckSquare,
  FileHeart,
  MessageSquare,
  Pencil,
  CalendarCheck,
  ClipboardList,
  ClipboardCheck,
  ShieldCheck,
  ArrowRightCircle,
  AlertTriangle,
  Users,
  Phone,
  Folder,
  Briefcase,
  GraduationCap,
  Heart,
  User,
  UserCheck,
  Archive,
  PhoneCall,
  BookOpen,
  Layout as LayoutIcon,
  CreditCard,
  PenTool,
  Sparkles,
  ChevronDown,
  Settings2,
  Video,
  FileText,
  Plus,
  Activity,
  AlertCircle,
  MapPin,
  Loader2,
  FileCheck,
  type LucideIcon,
} from "lucide-react";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { CompanionLinkCard } from "@/components/icm/CompanionLinkCard";
import { useServiceAuthorizations } from "@/hooks/useFirestore";


type Category = "Documentation" | "Care" | "Operations";

interface ModuleTile {
  slug: string;
  label: string;
  icon: LucideIcon;
  /** Route segment appended to /people/:id/ */
  route: string;
  /** Numeric badge in top-right (large) */
  count?: number;
  /** Category — drives accent-bar color and grouping */
  category: Category;
  /** Roles allowed to see this tile. Undefined = visible to all. */
  roles?: ("admin" | "case_manager" | "billing" | "supervisor")[];
}

// Tile definitions — counts come from liveCounts (Firestore), never hardcoded here
const ALL_TILES: ModuleTile[] = [
  // Documentation (blue)
  { slug: "contact-note",           label: "Contact Notes",              icon: FileText,       route: "contact-note",           category: "Documentation" },
  { slug: "case-management",        label: "Case Management",            icon: Briefcase,      route: "case-management",        category: "Documentation" },
  { slug: "eligibility-verification", label: "MA Status Verification",  icon: ShieldCheck,    route: "eligibility-verification", category: "Documentation" },
  { slug: "monitoring-form",        label: "Monitoring Form",            icon: ClipboardList,  route: "monitoring-form",        category: "Documentation" },
  { slug: "care-plan",              label: "PCP",                        icon: Heart,          route: "care-plan",              category: "Documentation" },
  { slug: "progress-note",          label: "Progress Note",              icon: Pencil,         route: "progress-note",          category: "Documentation" },
  { slug: "visit-summary",          label: "Visit Summary",              icon: CalendarCheck,  route: "visit-summary",          category: "Documentation" },
  { slug: "workflow-manager",       label: "Workflow Manager",           icon: LayoutIcon,     route: "workflow-manager",       category: "Documentation" },

  // Care (green)
  { slug: "assigned-staff",         label: "Assigned Staff",             icon: Users,          route: "assigned-staff",         category: "Care" },
  { slug: "care-notes",             label: "Care Notes",                 icon: FileText,       route: "progress-note",          category: "Care" },
  { slug: "care-tracker",           label: "Care Tracker",               icon: Heart,          route: "care-tracker",           category: "Care" },
  { slug: "medications",            label: "Medications",                icon: Activity,       route: "medications",            category: "Care" },
  { slug: "esignature",             label: "e-Signature",                icon: CheckSquare,    route: "esignature",             category: "Care" },
  { slug: "employment",             label: "Employment & Education",     icon: GraduationCap,  route: "employment",             category: "Care" },
  { slug: "facesheet",              label: "Face Sheet",                 icon: User,           route: "facesheet",              category: "Care" },
  { slug: "monitors-baselines",     label: "Monitors & Baselines",       icon: Activity,       route: "monitors-baselines",     category: "Care" },
  { slug: "referrals",              label: "Referrals",                  icon: Phone,          route: "referrals",              category: "Care" },

  // Operations (amber)
  { slug: "incident-reporting",     label: "Incident Reporting",         icon: AlertTriangle,  route: "incident-reporting",     category: "Operations" },
  { slug: "discharge-transfer",     label: "Discharge & Transfer",       icon: ArrowRightCircle, route: "managed-documents",    category: "Operations" },
  { slug: "managed-documents",      label: "Managed Documents",          icon: Folder,         route: "managed-documents",      category: "Operations" },
  { slug: "oncall",                 label: "On Call Log",                icon: PhoneCall,      route: "oncall",                 category: "Operations" },
  { slug: "trainings",              label: "Person Supported Trainings", icon: BookOpen,       route: "trainings",              category: "Operations" },
  { slug: "services",               label: "Services",                   icon: Briefcase,      route: "services",               category: "Operations" },
  { slug: "service-plan",           label: "Service Plan",               icon: LayoutIcon,     route: "service-plan",           category: "Operations" },
  { slug: "billing",                label: "General Ledger",             icon: CreditCard,     route: "billing",                category: "Operations", roles: ["billing", "admin"] },
  { slug: "authorizations",         label: "Authorizations",             icon: FileCheck,      route: "authorizations",         category: "Operations" },
];

// Category visual language
const CATEGORY_META: Record<
  Category,
  {
    dot: string;
    accentBar: string;
    iconBg: string;
    iconColor: string;
    pillActive: string;
    pillIdle: string;
  }
> = {
  Documentation: {
    dot: "bg-icm-accent",
    accentBar: "bg-icm-accent",
    iconBg: "bg-icm-accent-soft",
    iconColor: "text-icm-accent",
    pillActive: "bg-icm-accent text-white",
    pillIdle: "bg-icm-panel border border-icm-border text-icm-text-dim",
  },
  Care: {
    dot: "bg-icm-green",
    accentBar: "bg-icm-green",
    iconBg: "bg-icm-green-soft",
    iconColor: "text-icm-green",
    pillActive: "bg-icm-green text-white",
    pillIdle: "bg-icm-panel border border-icm-border text-icm-text-dim",
  },
  Operations: {
    dot: "bg-icm-amber",
    accentBar: "bg-icm-amber",
    iconBg: "bg-icm-amber-soft",
    iconColor: "text-icm-amber",
    pillActive: "bg-icm-amber text-white",
    pillIdle: "bg-icm-panel border border-icm-border text-icm-text-dim",
  },
};

const EChart = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading } = useIndividual(id);
  const { role } = useRole();
  const [showPreVisit, setShowPreVisit] = useState(false);

  // ── Orchestrator engine indicator ──────────────────────────────────────────
  const [orchEngine, setOrchEngine] = useState<{
    engineName: string | null; engineId: string | null; configured: boolean;
  } | null>(null);

  useEffect(() => {
    if (!individual?.state && !individual?.address_state) return;
    const state = individual.state || (individual as any).address_state;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "guidelines_engines"),
            where("state", "==", state),
            where("status", "==", "published"),
            orderBy("effectiveDate", "desc"),
            limit(1)
          )
        );
        if (!snap.empty) {
          const d = snap.docs[0];
          setOrchEngine({ engineName: d.data().name, engineId: d.id, configured: true });
        } else {
          setOrchEngine({ engineName: null, engineId: null, configured: false });
        }
      } catch { setOrchEngine({ engineName: null, engineId: null, configured: false }); }
    })();
  }, [individual?.state, (individual as any)?.address_state]);
  const [filter, setFilter] = useState<"All" | Category>("All");
  const liveCounts = useEChartCounts(id);
  const liveStats = useEChartStats(id);
  // ALL hooks must be called before any early returns (Rules of Hooks)
  const { openDrawer } = useRiskScore();

  const visibleTiles = ALL_TILES.filter(
    (t) => !t.roles || t.roles.includes(role as "admin" | "case_manager" | "billing" | "supervisor"),
  );
  const filtered = filter === "All" ? visibleTiles : visibleTiles.filter((t) => t.category === filter);
  const grouped = useMemo(() => {
    const order: Category[] = ["Documentation", "Care", "Operations"];
    return order
      .map((cat) => ({ cat, tiles: filtered.filter((t) => t.category === cat) }))
      .filter((g) => g.tiles.length > 0);
  }, [filtered]);

  if (loading) {
    return (
      <ICMShell title="eChart" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading eChart…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return (
      <ICMShell title="eChart" showAIPanel={false}>
        <div className="rounded-xl border border-icm-border bg-icm-panel p-12 text-center">
          <p className="text-[14px] text-icm-text-dim font-geist">Person not found.</p>
          <button
            onClick={() => navigate("/people")}
            className="mt-4 text-[12px] font-geist font-semibold text-icm-accent hover:underline"
          >
            ← Back to People
          </button>
        </div>
      </ICMShell>
    );
  }

  // Derived values (safe — individual is guaranteed non-null here)
  const age = calcAge(individual.dob);
  const riskClass = riskAvatarClass(individual.risk_score);
  const personInitials = initials(individual);
  const allergies = "Document in Face Sheet";
  const specialInstructions = individual.diagnosis ?? "See care plan for details";

  const computedRisk = calculateRiskScore(individual.id, loadRiskSettings(), individual.risk_score);
  const computedScore = computedRisk.total;
  const computedLevel = computedRisk.level;

  return (
    <ICMShell title="eChart" showAIPanel={false}>
      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { label: "People Supported", to: "/people" },
            { label: `${individual.first_name} ${individual.last_name}` },
          ]}
        />
        <DischargedBanner individual={individual} />
        {/* Person header card */}
        <div className="rounded-2xl border border-icm-border bg-icm-panel overflow-hidden">
          <div className="p-4 sm:p-5 pt-5 sm:pt-6">
            {/* Top row: identity (left) · alerts (center, flexible) · actions (right) */}
            <div className="flex flex-wrap items-start gap-4 sm:gap-5">
              {/* LEFT — avatar + identity */}
              <div className="flex items-start gap-3 sm:gap-4 shrink-0 w-full sm:w-[280px]">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <PersonAvatar
                    person={individual}
                    size={64}
                    shape="circle"
                    editable
                    individualId={individual.id}
                  />
                  <button
                    onClick={() => navigate(`/people/${individual.id}/profile`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-icm-border bg-icm-bg hover:bg-icm-panel hover:border-icm-accent/40 text-[10.5px] font-geist font-semibold text-icm-text transition-colors"
                  >
                    <User className="w-3 h-3 text-icm-accent" />
                    Profile
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="font-manrope font-extrabold text-[20px] sm:text-[22px] text-icm-text tracking-tight leading-tight break-words">
                    {individual.last_name}, {individual.first_name}
                    {individual.preferred_name && (
                      <span className="font-medium text-icm-text-dim"> ({individual.preferred_name})</span>
                    )}
                  </h1>
                  <p className="text-[12px] font-geist text-icm-text-dim mt-1 leading-snug">
                    {individual.gender ?? "—"} · {age !== null ? `${age} years` : "—"} · {individual.dob ?? "—"}
                  </p>
                  <p className="text-[12px] font-geist text-icm-text-dim mt-0.5 inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-icm-red shrink-0" />
                    {individual.county ?? "—"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <StatusChip tone="green" label={individual.enrollment_status} />
                    <StatusChip tone="accent" label="eChart" />
                  </div>
                  {/* Orchestrator engine chip */}
                  {orchEngine !== null && (
                    <button
                      onClick={() => orchEngine.configured && orchEngine.engineId
                        ? navigate(`/agents/guidelines/${orchEngine.engineId}`)
                        : navigate("/agents/guidelines/new")}
                      title={orchEngine.configured ? "Click to view guidelines engine" : "No guidelines engine — click to add one"}
                      className={cn(
                        "mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-geist font-medium border transition-colors",
                        orchEngine.configured
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                          : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                      )}
                    >
                      {orchEngine.configured
                        ? <><span className="text-[9px]">✦</span> AI Orchestrator: {orchEngine.engineName}</>
                        : <><span>⚠</span> AI Orchestrator: No engine for {individual.state || (individual as any).address_state || "this state"}</>}
                    </button>
                  )}
                </div>
              </div>

              {/* CENTER — alert panels */}
              <div className="flex-1 min-w-full sm:min-w-[260px] grid grid-cols-1 xl:grid-cols-2 gap-3">
                <AlertPanel
                  tone="red"
                  icon={AlertTriangle}
                  label="ALLERGIES"
                  title={allergies}
                  subtitle="Severe reactions documented"
                />
                <AlertPanel
                  tone="amber"
                  icon={AlertCircle}
                  label="SPECIAL INSTRUCTIONS"
                  title={specialInstructions}
                />
              </div>

              {/* RIGHT — action stack */}
              <div className="flex flex-col gap-2 shrink-0 w-full sm:w-[180px]">
                <button
                  onClick={() => setShowPreVisit(true)}
                  className="h-9 px-3.5 rounded-xl text-[12px] font-geist font-semibold flex items-center justify-center gap-1.5 border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New note
                </button>
              </div>
            </div>


            {/* Metric strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-5 pt-5 border-t border-icm-border">
              <button
                onClick={() => openDrawer(individual.id, `${individual.first_name} ${individual.last_name}`)}
                className="text-left group"
                title="View risk score breakdown"
              >
                <Metric
                  label="RISK SCORE"
                  value={computedScore.toString()}
                  valueClass={`${riskColor(computedLevel)} group-hover:underline`}
                  foot={computedLevel === "high" ? "HIGH RISK" : computedLevel === "moderate" ? "MODERATE" : "Low Risk"}
                />
              </button>
              <Metric label="LAST VISIT" value={liveStats.loading ? "…" : fmtVisitDate(liveStats.lastVisitDate)} valueClass="text-icm-text" foot="See visit summary" />
              <Metric label="NEXT VISIT" value={liveStats.loading ? "…" : fmtVisitDate(liveStats.nextVisitDate)} valueClass="text-icm-accent" foot="Scheduled" />
              <Metric label="OPEN TASKS" value={liveStats.loading ? "…" : liveStats.openTasks.toString()} valueClass="text-purple-600" foot="See workflow" />
              <Metric label="INCIDENTS" value={liveStats.loading ? "…" : liveStats.openIncidents.toString()} valueClass={liveStats.openIncidents > 0 ? "text-icm-red" : "text-icm-text"} foot="Open" />
              <Metric label="COMPLIANCE" value={liveStats.loading ? "…" : liveStats.compliancePct != null ? `${liveStats.compliancePct}%` : "—"} valueClass="text-icm-green" foot="Monitoring" />
            </div>
          </div>
        </div>

        {/* AI Case Companion link card */}
        <CompanionLinkCard individual={individual} individualId={individual.id} />

        {/* Filter pills */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <FilterPill
              label="All"
              active={filter === "All"}
              onClick={() => setFilter("All")}
            />
            {(["Documentation", "Care", "Operations"] as Category[]).map((c) => (
              <FilterPill
                key={c}
                label={c}
                category={c}
                active={filter === c}
                onClick={() => setFilter(c)}
              />
            ))}
          </div>
          <span className="text-[11.5px] font-geist text-icm-text-dim">
            {visibleTiles.length} modules · last activity 12 min ago
          </span>
        </div>

        {/* Grouped tile sections */}
        {grouped.map(({ cat, tiles }) => (
          <section key={cat} className="space-y-2.5">
            <div className="flex items-center gap-2 border-t border-icm-border pt-3">
              <span className="font-manrope font-normal text-[14px] text-icm-text-dim">{cat}</span>
              <span className="text-[11px] font-geist text-icm-text-faint">{tiles.length} modules</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {tiles.map((t) => {
                const destination = `/people/${individual.id}/${t.route}`;
                return t.slug === "authorizations" ? (
                  <AuthorizationTileCard
                    key={t.slug}
                    tile={t}
                    individualId={individual.id}
                    onOpen={() => navigate(`/people/${individual.id}/${t.route}`)}
                  />
                ) : (
                  <ModuleTileCard
                    key={t.slug}
                    tile={{
                      ...t,
                      count: liveCounts[t.slug] !== undefined
                        ? liveCounts[t.slug]
                        : t.count,
                    }}
                    onOpen={() => navigate(destination)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <PreVisitModal
        open={showPreVisit}
        onClose={() => setShowPreVisit(false)}
        personId={individual.id}
        personName={`${individual.first_name} ${individual.last_name}`}
      />
    </ICMShell>
  );
};

/* ---------- subcomponents ---------- */

function StatusChip({
  tone,
  label,
}: {
  tone: "green" | "accent" | "amber";
  label: string;
}) {
  const map = {
    green: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    accent: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    amber: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-geist font-medium ring-1 ${map[tone]}`}
    >
      {tone === "green" && <span className="w-1.5 h-1.5 rounded-full bg-icm-green" />}
      {label}
    </span>
  );
}

function AlertPanel({
  tone,
  icon: Icon,
  label,
  title,
  subtitle,
}: {
  tone: "red" | "amber";
  icon: LucideIcon;
  label: string;
  title: string;
  subtitle?: string;
}) {
  const map = {
    red: "bg-icm-red-soft border-icm-red/20 text-icm-red",
    amber: "bg-icm-amber-soft border-icm-amber/20 text-icm-amber",
  } as const;
  const titleColor = tone === "red" ? "text-icm-text" : "text-icm-text";
  return (
    <div
      className={`rounded-xl border px-3.5 py-2.5 ${map[tone]}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-geist font-bold uppercase tracking-wide">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <p className={`mt-1 text-[12.5px] font-geist font-semibold leading-snug ${titleColor}`}>
        {title}
      </p>
      {subtitle && (
        <p className="text-[11px] font-geist text-icm-text-dim mt-0.5 leading-snug">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  foot,
  valueClass = "text-icm-text",
}: {
  label: string;
  value: string;
  foot: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-icm-text-faint font-geist font-semibold">
        {label}
      </p>
      <p className={`mt-1 font-manrope font-extrabold text-[18px] leading-tight tracking-tight truncate ${valueClass}`}>
        {value}
      </p>
      <p className="text-[11px] font-geist text-icm-text-dim mt-0.5 truncate">{foot}</p>
    </div>
  );
}

function FilterPill({
  label,
  category,
  active,
  onClick,
}: {
  label: string;
  category?: Category;
  active: boolean;
  onClick: () => void;
}) {
  // "All" pill is solid black when active.
  if (!category) {
    return (
      <button
        onClick={onClick}
        className={`h-7 px-3 rounded-full text-[12px] font-geist font-semibold transition-colors ${
          active
            ? "bg-icm-text text-icm-panel"
            : "bg-icm-panel border border-icm-border text-icm-text-dim hover:text-icm-text"
        }`}
      >
        {label}
      </button>
    );
  }
  const meta = CATEGORY_META[category];
  return (
    <button
      onClick={onClick}
      className={`h-7 px-3 rounded-full text-[12px] font-geist font-medium inline-flex items-center gap-1.5 transition-colors ${
        active ? meta.pillActive : meta.pillIdle + " hover:text-icm-text"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-white/80" : meta.dot}`} />
      {label}
    </button>
  );
}

function ModuleTileCard({ tile, onOpen }: { tile: ModuleTile; onOpen: () => void }) {
  const Icon = tile.icon;
  const meta = CATEGORY_META[tile.category];

  const hoverStyles = {
    Documentation: "hover:border-icm-accent/40 hover:shadow-[0_8px_30px_rgb(59,130,246,0.06)] focus-visible:ring-icm-accent",
    Care: "hover:border-icm-green/40 hover:shadow-[0_8px_30px_rgb(16,185,129,0.06)] focus-visible:ring-icm-green",
    Operations: "hover:border-icm-amber/40 hover:shadow-[0_8px_30px_rgb(245,158,11,0.06)] focus-visible:ring-icm-amber"
  }[tile.category];

  return (
    <button
      onClick={onOpen}
      className={cn(
        "group relative text-left rounded-2xl border border-icm-border bg-icm-panel pl-4 pr-3.5 pt-4 pb-3.5 min-h-[104px] transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden outline-none",
        hoverStyles
      )}
    >
      {/* Rounded Left accent bar that expands smoothly on hover */}
      <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full transition-all duration-300 group-hover:top-1.5 group-hover:bottom-1.5 ${meta.accentBar}`} />

      <div className="flex items-start justify-between w-full">
        <div
          className={cn(
            "w-8.5 h-8.5 rounded-xl flex items-center justify-center transition-all duration-300 transform group-hover:scale-105",
            meta.iconBg,
            meta.iconColor
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        {tile.count !== undefined && (
          <span className="font-mono font-extrabold text-[16px] text-icm-text mt-0.5">
            {tile.count}
          </span>
        )}
      </div>

      <p className="font-manrope font-bold text-[13px] text-icm-text-dim group-hover:text-icm-text leading-tight mt-3 transition-colors duration-200">
        {tile.label}
      </p>
    </button>
  );
}

// ─── Authorization tile — real-time, with mini bars & urgency badges ──────────

function AuthorizationTileCard({
  tile,
  individualId,
  onOpen,
}: {
  tile: ModuleTile;
  individualId: string;
  onOpen: () => void;
}) {
  const meta = CATEGORY_META[tile.category];
  const { data: auths } = useServiceAuthorizations(individualId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function daysLeft(endDate: string) {
    return Math.ceil((new Date(endDate + "T00:00:00").getTime() - today.getTime()) / 86400000);
  }

  const active = auths.filter((a) => a.status === "active" || a.status === "pending");
  const critical = active.filter((a) => daysLeft(a.end_date) <= 7);
  const expiringSoon = active.filter((a) => { const d = daysLeft(a.end_date); return d > 7 && d <= 30; });
  const overUnits = active.filter((a) => a.units_authorized > 0 && (a.units_used / a.units_authorized) >= 0.85);

  const sorted = [...active].sort((a, b) => daysLeft(a.end_date) - daysLeft(b.end_date));
  const top3 = sorted.slice(0, 3);

  const hasRed = critical.length > 0 || overUnits.length > 0;
  const hasOrange = !hasRed && expiringSoon.length > 0;

  const hoverStyles = "hover:border-icm-amber/40 hover:shadow-[0_8px_30px_rgb(245,158,11,0.06)] focus-visible:ring-icm-amber";

  return (
    <button
      onClick={onOpen}
      className={cn(
        "group relative text-left rounded-2xl border border-icm-border bg-icm-panel pl-4 pr-3.5 pt-4 pb-3.5 min-h-[104px] transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden outline-none",
        hoverStyles
      )}
    >
      <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full transition-all duration-300 group-hover:top-1.5 group-hover:bottom-1.5 ${meta.accentBar}`} />

      <div className="flex items-start justify-between w-full">
        <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center transition-all duration-300 transform group-hover:scale-105 ${meta.iconBg} ${meta.iconColor}`}>
          <FileCheck className="w-4 h-4" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono font-extrabold text-[16px] text-icm-text mt-0.5">{active.length}</span>
          {hasRed && (
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-icm-red animate-pulse" title="Critical authorization" />
          )}
          {hasOrange && !hasRed && (
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-icm-amber animate-pulse" title="Expiring soon" />
          )}
        </div>
      </div>

      <p className="font-manrope font-bold text-[13px] text-icm-text-dim group-hover:text-icm-text leading-tight mt-3 transition-colors duration-200">
        {tile.label}
      </p>

      {/* Mini progress bars for top 3 auths */}
      {top3.length > 0 && (
        <div className="space-y-1 mt-2 w-full">
          {top3.map((auth) => {
            const pct = auth.units_authorized > 0
              ? Math.min(100, (auth.units_used / auth.units_authorized) * 100)
              : 0;
            const barColor = pct >= 85 ? "bg-icm-red" : pct >= 70 ? "bg-icm-amber" : "bg-icm-green";
            const dl = daysLeft(auth.end_date);
            return (
              <div key={auth.id} className="flex items-center gap-1.5 w-full">
                <div className="flex-1 h-1 rounded-full bg-icm-border/60 overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`text-[9px] font-mono font-bold shrink-0 ${dl <= 7 ? "text-icm-red" : dl <= 30 ? "text-icm-amber" : "text-icm-text-faint"}`}>
                  {dl}d
                </span>
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

export default EChart;
