import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { demoToast } from "@/lib/demoToast";
import { PreVisitModal } from "@/components/visit/PreVisitModal";
import { PersonAIPanel } from "@/components/icm/PersonAIPanel";
import { useRole } from "@/contexts/RoleContext";
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
  type LucideIcon,
} from "lucide-react";
import {
  getPerson,
  initials,
  riskAvatarClass,
} from "@/data/people";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { PersonAvatar } from "@/components/icm/PersonAvatar";


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
  { slug: "contact-note", label: "Activity Note", icon: FileText, route: "contact-note", count: 24, category: "Documentation" },
  { slug: "billable-activity", label: "Billable Activity Note", icon: FileText, route: "contact-note", count: 12, category: "Documentation" },
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

  // Operations (amber)
  { slug: "incident-reporting", label: "Incident Reporting", icon: AlertTriangle, route: "incident-reporting", count: 2, category: "Operations" },
  { slug: "discharge-transfer", label: "Discharge & Transfer", icon: ArrowRightCircle, route: "managed-documents", category: "Operations" },
  { slug: "managed-documents", label: "Managed Documents", icon: Folder, route: "managed-documents", count: 8, category: "Operations" },
  { slug: "oncall", label: "On Call Log", icon: PhoneCall, route: "oncall", count: 3, category: "Operations" },
  { slug: "trainings", label: "Person Supported Trainings", icon: BookOpen, route: "trainings", count: 4, category: "Operations" },
  { slug: "progress-notes-ops", label: "Progress Notes", icon: MessageSquare, route: "progress-note", count: 14, category: "Operations" },
  { slug: "services", label: "Services", icon: Briefcase, route: "services", category: "Operations" },
  { slug: "service-plan", label: "Service Plan", icon: LayoutIcon, route: "service-plan", count: 1, category: "Operations" },
  { slug: "billing", label: "General Ledger", icon: CreditCard, route: "billing", category: "Operations", roles: ["billing", "admin"] },
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
  const person = getPerson(id ?? "");
  const { role } = useRole();
  const [showPreVisit, setShowPreVisit] = useState(false);
  const [filter, setFilter] = useState<"All" | Category>("All");

  if (!person) {
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

  // Compact header metrics — hard-coded demo values mapped to the mock person.
  const allergies = person.allergies ?? "Penicillin · Peanuts";
  const specialInstructions =
    person.specialInstructions ?? "Requires 1:1 staffing during community outings · No driving";

  return (
    <ICMShell title="eChart" rightPanel={<PersonAIPanel person={person} />}>
      <div className="space-y-4">
        <Breadcrumbs
          backTo="/people"
          backLabel="People Supported"
          items={[
            { label: "People Supported", to: "/people" },
            { label: `${person.firstName} ${person.lastName}`, to: `/people/${person.id}/profile` },
            { label: "eChart" },
          ]}
        />
        {/* Person header card with gradient accent */}
        <div className="relative rounded-2xl border border-icm-border bg-icm-panel overflow-hidden">
          {/* Top gradient stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-icm-accent via-purple-400 to-icm-red" />

          <div className="p-5 pt-6">
            {/* Top row: identity (left) · alerts (center, flexible) · actions (right) */}
            <div className="flex items-start gap-5">
              {/* LEFT — avatar + identity (fixed width so it never truncates) */}
              <div className="flex items-start gap-4 shrink-0 w-[280px]">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <PersonAvatar person={person} size={64} shape="circle" className="text-[18px]" />
                  <button
                    onClick={() => navigate(`/people/${person.id}/profile`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-icm-border bg-icm-bg hover:bg-icm-panel hover:border-icm-accent/40 text-[10.5px] font-geist font-semibold text-icm-text transition-colors"
                  >
                    <User className="w-3 h-3 text-icm-accent" />
                    Profile
                  </button>
                </div>

                <div className="min-w-0">
                  <h1 className="font-manrope font-extrabold text-[22px] text-icm-text tracking-tight leading-tight">
                    {person.lastName}, {person.firstName}
                    {person.nickname && (
                      <span className="font-medium text-icm-text-dim"> ({person.nickname})</span>
                    )}
                  </h1>
                  <p className="text-[12px] font-geist text-icm-text-dim mt-1 leading-snug">
                    {person.gender} · {person.age} years · {person.dob}
                  </p>
                  <p className="text-[12px] font-geist text-icm-text-dim mt-0.5 inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-icm-red shrink-0" />
                    {person.county}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <StatusChip tone="green" label={person.status} />
                    <StatusChip tone="accent" label="eChart" />
                    <StatusChip tone="amber" label="Manage Programs" />
                  </div>
                </div>
              </div>

              {/* CENTER — alert panels (flex grow, side by side) */}
              <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-3 min-w-0">
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

              {/* RIGHT — action stack (fixed width) */}
              <div className="flex flex-col gap-2 shrink-0 w-[180px]">
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
              <Metric label="PCP STATUS" value="On track" valueClass="text-icm-green" foot="Reviewed Apr 12" />
              <Metric label="RISK SCORE" value="22" valueClass="text-icm-green" foot="Low · ↓ 4 pts" />
              <Metric label="LAST VISIT" value="2 days ago" valueClass="text-icm-text" foot="K. Vargas · 45m" />
              <Metric label="NEXT ISP" value="May 22" valueClass="text-icm-accent" foot="in 24 days" />
              <Metric label="OPEN GOALS" value="4" valueClass="text-purple-600" foot="2 progressing" />
              <Metric label="ASSIGNED STAFF" value="5" valueClass="text-icm-text" foot="J. Thollander lead" />
            </div>
          </div>
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
              <span className={`w-2 h-2 rounded-full ${CATEGORY_META[cat].dot}`} />
              <h2 className="font-manrope font-bold text-[13.5px] text-icm-text tracking-tight">
                {cat}
              </h2>
              <span className="text-[11px] font-geist text-icm-text-dim">
                {tiles.length} modules
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {tiles.map((t) => (
                <ModuleTileCard
                  key={t.slug}
                  tile={t}
                  onOpen={() => navigate(`/people/${person.id}/${t.route}`)}
                />
        ))}
            </div>
          </section>
        ))}
      </div>

      <PreVisitModal
        open={showPreVisit}
        onClose={() => setShowPreVisit(false)}
        personId={person.id}
        personName={`${person.firstName} ${person.lastName}`}
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

export default EChart;
