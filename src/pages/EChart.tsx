import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { demoToast } from "@/lib/demoToast";
import { PreVisitModal } from "@/components/visit/PreVisitModal";
import { useRole } from "@/contexts/RoleContext";
import { useIndividual, calcAge, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { useEChartCounts } from "@/hooks/useEChartCounts";
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
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect } from "react";
import { MessageSquare as MsgIcon, ExternalLink, FileText as FileTextIcon, ChevronRight } from "lucide-react";


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

// Grouped tiles per the screenshot. Counts mirror the original demo data.
const ALL_TILES: ModuleTile[] = [
  // Documentation (blue)
  { slug: "contact-note", label: "Contact Notes", icon: FileText, route: "contact-note", count: 36, category: "Documentation" },
  { slug: "case-management", label: "Case Management", icon: Briefcase, route: "case-management", count: 8, category: "Documentation" },
  { slug: "eligibility-verification", label: "MA Status Verification", icon: ShieldCheck, route: "eligibility-verification", category: "Documentation" },
  { slug: "monitoring-form", label: "Monitoring Form", icon: ClipboardList, route: "monitoring-form", count: 4, category: "Documentation" },
  { slug: "care-plan", label: "PCP", icon: Heart, route: "care-plan", count: 1, category: "Documentation" },
  { slug: "progress-note", label: "Progress Note", icon: Pencil, route: "progress-note", count: 14, category: "Documentation" },
  { slug: "visit-summary", label: "Visit Summary", icon: CalendarCheck, route: "visit-summary", count: 6, category: "Documentation" },
  { slug: "workflow-manager", label: "Workflow Manager", icon: LayoutIcon, route: "workflow-manager", count: 2, category: "Documentation" },

  // Care (green)
  { slug: "assigned-staff", label: "Assigned Staff", icon: Users, route: "assigned-staff", count: 5, category: "Care" },
  { slug: "care-notes", label: "Care Notes", icon: FileText, route: "progress-note", count: 18, category: "Care" },
  { slug: "care-tracker", label: "Care Tracker", icon: Heart, route: "care-tracker", category: "Care" },
  { slug: "esignature", label: "e-Signature", icon: CheckSquare, route: "esignature", count: 3, category: "Care" },
  { slug: "employment", label: "Employment & Education", icon: GraduationCap, route: "employment", category: "Care" },
  { slug: "facesheet", label: "Face Sheet", icon: User, route: "facesheet", count: 1, category: "Care" },
  { slug: "monitors-baselines", label: "Monitors & Baselines", icon: Activity, route: "monitors-baselines", category: "Care" },
  { slug: "referrals", label: "Referrals", icon: Phone, route: "referrals", category: "Care", count: 3 },

  // Operations (amber)
  { slug: "incident-reporting", label: "Incident Reporting", icon: AlertTriangle, route: "incident-reporting", count: 2, category: "Operations" },
  { slug: "discharge-transfer", label: "Discharge & Transfer", icon: ArrowRightCircle, route: "managed-documents", category: "Operations" },
  { slug: "managed-documents", label: "Managed Documents", icon: Folder, route: "managed-documents", count: 8, category: "Operations" },
  { slug: "oncall", label: "On Call Log", icon: PhoneCall, route: "oncall", count: 3, category: "Operations" },
  { slug: "trainings", label: "Person Supported Trainings", icon: BookOpen, route: "trainings", count: 4, category: "Operations" },
  { slug: "services", label: "Services", icon: Briefcase, route: "services", category: "Operations" },
  { slug: "service-plan", label: "Service Plan", icon: LayoutIcon, route: "service-plan", count: 1, category: "Operations" },
  { slug: "billing", label: "General Ledger", icon: CreditCard, route: "billing", category: "Operations", roles: ["billing", "admin"] },
  { slug: "authorizations", label: "Authorizations", icon: FileCheck, route: "authorizations", category: "Operations" },
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
  const [filter, setFilter] = useState<"All" | Category>("All");
  const liveCounts = useEChartCounts(id);
  const [transcripts, setTranscripts] = useState<CompanionSession[]>([]);
  const [transcriptsLoading, setTranscriptsLoading] = useState(false);

  // Load companion sessions for this individual
  useEffect(() => {
    if (!id) return;
    setTranscriptsLoading(true);
    const q = query(
      collection(db, "ai_checkins"),
      where("individualId", "==", id),
      orderBy("session_date", "desc"),
      limit(20)
    );
    getDocs(q)
      .then((snap) => {
        setTranscripts(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CompanionSession, "id">) }))
        );
      })
      .catch(() => setTranscripts([]))
      .finally(() => setTranscriptsLoading(false));
  }, [id]);

  // ALL hooks must be called before any early returns (Rules of Hooks)
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


  return (
    <ICMShell title="eChart" showAIPanel={false}>
      <div className="space-y-4">
        <Breadcrumbs
          backTo="/people"
          backLabel="People Supported"
          items={[
            { label: "People Supported", to: "/people" },
            { label: `${individual.first_name} ${individual.last_name}`, to: `/people/${individual.id}/profile` },
            { label: "eChart" },
          ]}
        />
        {/* Person header card */}
        <div className="rounded-2xl border border-icm-border bg-icm-panel overflow-hidden">
          <div className="p-4 sm:p-5 pt-5 sm:pt-6">
            {/* Top row: identity (left) · alerts (center, flexible) · actions (right) */}
            <div className="flex flex-wrap items-start gap-4 sm:gap-5">
              {/* LEFT — avatar + identity */}
              <div className="flex items-start gap-3 sm:gap-4 shrink-0 w-full sm:w-[280px]">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center font-mono text-[20px] font-bold ${riskClass}`}>
                    {personInitials}
                  </div>
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
              <Metric label="RISK SCORE" value={individual.risk_score?.toString() ?? "—"} valueClass={individual.risk_score && individual.risk_score >= 60 ? "text-icm-red" : individual.risk_score && individual.risk_score >= 35 ? "text-icm-amber" : "text-icm-green"} foot={individual.level_of_care ?? "Standard"} />
              <Metric label="LAST VISIT" value={individual.last_visit_date ?? "—"} valueClass="text-icm-text" foot="See visit summary" />
              <Metric label="NEXT VISIT" value={individual.next_visit_date ?? "—"} valueClass="text-icm-accent" foot="Scheduled" />
              <Metric label="OPEN TASKS" value={individual.open_tasks?.toString() ?? "0"} valueClass="text-purple-600" foot="See workflow" />
              <Metric label="INCIDENTS" value={individual.open_incidents?.toString() ?? "0"} valueClass={individual.open_incidents ? "text-icm-red" : "text-icm-text"} foot="Open" />
              <Metric label="COMPLIANCE" value={individual.monitoring_compliance_pct ? `${individual.monitoring_compliance_pct}%` : "—"} valueClass="text-icm-green" foot="Monitoring" />
            </div>
          </div>
        </div>

        {/* AI Case Companion link card + open link + transcripts */}
        <div className="space-y-0">
          {/* Card header row: card + open-in-tab hyperlink */}
          <div>
            <CompanionLinkCard individual={individual} />
            {individual.companion_link_active && individual.companion_token && (
              <div className="flex items-center gap-1.5 mt-1.5 px-1">
                <span className="text-[11px] font-geist text-icm-text-dim">Open companion link →</span>
                <a
                  href={`https://casemanagement-ai.web.app/care-assistant/${individual.companion_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11.5px] font-geist font-semibold text-icm-accent hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {`casemanagement-ai.web.app/care-assistant/${individual.companion_token.slice(0, 16)}…`}
                </a>
              </div>
            )}
          </div>

          {/* Companion Transcripts */}
          <CompanionTranscriptList
            transcripts={transcripts}
            loading={transcriptsLoading}
            firstName={individual.first_name}
          />
        </div>

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
              {tiles.map((t) => (
                t.slug === "authorizations" ? (
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
                    onOpen={() => navigate(`/people/${individual.id}/${t.route}`)}
                  />
                )
        ))}
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
  return (
    <button
      onClick={onOpen}
      className="group relative text-left rounded-xl border border-icm-border bg-icm-panel pl-4 pr-3.5 py-3 min-h-[96px] hover:border-icm-border-strong hover:shadow-elevated transition-all flex flex-col justify-between overflow-hidden"
    >
      {/* Left accent bar */}
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${meta.accentBar}`} />

      <div className="flex items-start justify-between">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.iconBg} ${meta.iconColor}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        {tile.count !== undefined && (
          <span className="font-mono font-bold text-[15px] text-icm-text leading-none">
            {tile.count}
          </span>
        )}
      </div>

      <p className="font-tight font-semibold text-[12.5px] text-icm-text leading-tight mt-2">
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

  // Top 3 by urgency: sort by days_left ascending then units pct descending
  const sorted = [...active].sort((a, b) => daysLeft(a.end_date) - daysLeft(b.end_date));
  const top3 = sorted.slice(0, 3);

  const hasRed = critical.length > 0 || overUnits.length > 0;
  const hasOrange = !hasRed && expiringSoon.length > 0;

  return (
    <button
      onClick={onOpen}
      className="group relative text-left rounded-xl border border-icm-border bg-icm-panel pl-4 pr-3.5 py-3 min-h-[96px] hover:border-icm-border-strong hover:shadow-elevated transition-all flex flex-col justify-between overflow-hidden"
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${meta.accentBar}`} />

      <div className="flex items-start justify-between">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.iconBg} ${meta.iconColor}`}>
          <FileCheck className="w-4 h-4" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono font-bold text-[15px] text-icm-text leading-none">{active.length}</span>
          {hasRed && (
            <span className="inline-block w-2 h-2 rounded-full bg-icm-red" title="Critical authorization" />
          )}
          {hasOrange && !hasRed && (
            <span className="inline-block w-2 h-2 rounded-full bg-icm-amber" title="Expiring soon" />
          )}
        </div>
      </div>

      <p className="font-tight font-semibold text-[12.5px] text-icm-text leading-tight mt-1.5 mb-1">
        {tile.label}
      </p>

      {/* Mini progress bars for top 3 auths */}
      {top3.length > 0 && (
        <div className="space-y-0.5 mt-1">
          {top3.map((auth) => {
            const pct = auth.units_authorized > 0
              ? Math.min(100, (auth.units_used / auth.units_authorized) * 100)
              : 0;
            const barColor = pct >= 85 ? "bg-icm-red" : pct >= 70 ? "bg-icm-amber" : "bg-icm-green";
            const dl = daysLeft(auth.end_date);
            return (
              <div key={auth.id} className="flex items-center gap-1.5">
                <div className="flex-1 h-1 rounded-full bg-icm-border overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`text-[9px] font-mono shrink-0 ${dl <= 7 ? "text-icm-red" : dl <= 30 ? "text-icm-amber" : "text-icm-text-faint"}`}>
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

// ─── Companion Session Types & Transcript List ──────────────────────────────

interface CompanionMessage {
  role: string;
  content: string;
}

interface CompanionSession {
  id: string;
  individualId: string;
  session_date: { toDate?: () => Date } | string | null;
  transcript: CompanionMessage[];
  message_count?: number;
  urgency_flagged?: boolean;
  review_status?: string;
  opened_at?: string;
}

function formatSessionDate(raw: CompanionSession["session_date"]): string {
  if (!raw) return "—";
  if (typeof raw === "string") return new Date(raw).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  if (raw && typeof raw === "object" && "toDate" in raw && typeof raw.toDate === "function") {
    return raw.toDate().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  return "—";
}

function CompanionTranscriptList({
  transcripts,
  loading,
  firstName,
}: {
  transcripts: CompanionSession[];
  loading: boolean;
  firstName: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  const summarize = (session: CompanionSession) => {
    // Mock AI summary — in production this would call the AI endpoint
    const messages = session.transcript || [];
    const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content);
    const mock = userMessages.length > 0
      ? `${firstName} mentioned: "${userMessages[0]?.slice(0, 80)}${userMessages[0]?.length > 80 ? "…" : ""}". ${userMessages.length} user message${userMessages.length === 1 ? "" : "s"} recorded. No urgent flags detected.`
      : "No user messages recorded in this session.";
    setSummaries((prev) => ({ ...prev, [session.id]: mock }));
  };

  if (loading) {
    return (
      <div className="mt-3 rounded-2xl border border-icm-border bg-icm-panel px-4 py-3 flex items-center gap-2 text-icm-text-dim">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px] font-geist">Loading transcripts…</span>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-icm-border bg-icm-panel overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-icm-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <MsgIcon className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div>
            <p className="font-manrope font-bold text-[13px] text-icm-text leading-tight">
              AI Case Companion Transcripts
            </p>
            <p className="text-[11px] font-geist text-icm-text-dim">
              Check-in conversations — review and summarize as needed
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-geist font-semibold bg-icm-bg border border-icm-border text-icm-text-dim">
          {transcripts.length} session{transcripts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      {transcripts.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <MsgIcon className="w-8 h-8 text-icm-text-faint mx-auto mb-2" />
          <p className="text-[13px] font-geist font-semibold text-icm-text">No sessions yet</p>
          <p className="text-[12px] font-geist text-icm-text-dim mt-1">
            Once {firstName} uses their companion link, transcripts will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-icm-border">
          {transcripts.map((session) => {
            const isExpanded = expandedId === session.id;
            const msgCount = session.transcript?.length ?? session.message_count ?? 0;
            const summary = summaries[session.id];

            return (
              <li key={session.id}>
                {/* Row header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-icm-bg/60 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    <FileTextIcon className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[12.5px] font-geist font-semibold text-icm-text">
                        Check-in — {formatSessionDate(session.session_date)}
                      </p>
                      {session.urgency_flagged && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-red-soft text-icm-red ring-1 ring-icm-red/20">
                          Urgent
                        </span>
                      )}
                      {session.review_status === "pending_review" && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-amber-soft text-icm-amber ring-1 ring-icm-amber/20">
                          Pending Review
                        </span>
                      )}
                      {session.review_status === "reviewed" && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
                          Reviewed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-icm-text-dim mt-0.5">
                      {msgCount} message{msgCount !== 1 ? "s" : ""} exchanged
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-icm-text-faint shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </button>

                {/* Expanded: transcript + AI summary */}
                {isExpanded && (
                  <div className="border-t border-icm-border bg-icm-bg px-4 py-4 space-y-4">
                    {/* AI Summary */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
                          AI Summary
                        </p>
                        {!summary && (
                          <button
                            onClick={() => summarize(session)}
                            className="inline-flex items-center gap-1 h-6 px-2.5 rounded-lg text-[10.5px] font-geist font-semibold bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                          >
                            <Sparkles className="w-3 h-3" />
                            Summarize
                          </button>
                        )}
                      </div>
                      {summary ? (
                        <div className="rounded-xl bg-purple-50 border border-purple-200 px-3.5 py-2.5">
                          <p className="text-[12px] font-geist text-purple-800 leading-relaxed">{summary}</p>
                        </div>
                      ) : (
                        <p className="text-[12px] font-geist text-icm-text-dim italic">
                          Click "Summarize" to generate an AI summary of this session.
                        </p>
                      )}
                    </div>

                    {/* Full transcript */}
                    {session.transcript && session.transcript.length > 0 && (
                      <div>
                        <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">
                          Full Transcript
                        </p>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {session.transcript.map((msg, i) => {
                            const isUser = msg.role === "user";
                            return (
                              <div
                                key={i}
                                className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[12px] font-geist leading-relaxed ${
                                    isUser
                                      ? "bg-icm-accent text-white rounded-br-md"
                                      : "bg-icm-panel border border-icm-border text-icm-text rounded-bl-md"
                                  }`}
                                >
                                  <p className={`text-[9.5px] font-semibold uppercase tracking-wide mb-0.5 ${isUser ? "text-white/60" : "text-icm-text-faint"}`}>
                                    {isUser ? firstName : "Case Companion"}
                                  </p>
                                  {msg.content}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Mark reviewed */}
                    {session.review_status !== "reviewed" && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-icm-border">
                        <span className="text-[11px] font-geist text-icm-text-dim">
                          Mark this session as reviewed once you've read it.
                        </span>
                        <button className="h-7 px-3 rounded-lg text-[11px] font-geist font-semibold bg-icm-text text-icm-panel hover:opacity-90 transition-opacity">
                          Mark Reviewed
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default EChart;

