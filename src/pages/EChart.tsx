import { useState } from "react";
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
  ChevronLeft,
  Settings2,
  Video,
  type LucideIcon,
} from "lucide-react";
import {
  getPerson,
  initials,
  riskAvatarClass,
  riskScoreClass,
} from "@/data/people";

type Tone = "neutral" | "amber" | "red" | "green" | "accent";

interface ModuleTile {
  slug: string;
  label: string;
  icon: LucideIcon;
  /** Route segment appended to /people/:id/ */
  route: string;
  /** Numeric badge (e.g., overdue count) */
  count?: number;
  /** Pill text shown next to/under the count */
  meta?: string;
  metaTone?: Tone;
  /** Roles allowed to see this tile. Undefined = visible to all. */
  roles?: ("admin" | "case_manager" | "billing" | "supervisor")[];
}

// Flat tile order — strict sequence per spec.
const ALL_TILES: ModuleTile[] = [
  // Row 1
  { slug: "case-management", label: "Case Management", icon: CheckSquare, route: "case-management", count: 3, meta: "3 overdue", metaTone: "red" },
  { slug: "care-plan", label: "Care Plan / ISP", icon: FileHeart, route: "care-plan", meta: "Overdue 8d", metaTone: "red" },
  { slug: "contact-note", label: "Contact Note", icon: MessageSquare, route: "contact-note", count: 2, meta: "2 unsigned", metaTone: "amber" },
  { slug: "progress-note", label: "Progress Note", icon: Pencil, route: "progress-note", count: 2, meta: "2 unsigned", metaTone: "amber" },
  // Row 2
  { slug: "visit-summary", label: "Visit Summary", icon: CalendarCheck, route: "visit-summary", meta: "Last 02/15", metaTone: "neutral" },
  { slug: "monitoring-form", label: "Monitoring Form", icon: ClipboardList, route: "monitoring-form", meta: "Due in 7d", metaTone: "amber" },
  { slug: "assessments", label: "Assessments", icon: ClipboardCheck, route: "assessments", count: 1, meta: "1 overdue", metaTone: "red" },
  { slug: "eligibility-verification", label: "Eligibility Verification", icon: ShieldCheck, route: "eligibility-verification", meta: "MA Active", metaTone: "green" },
  // Row 3
  { slug: "referrals", label: "Referrals", icon: ArrowRightCircle, route: "referrals", count: 1, meta: "1 pending", metaTone: "amber" },
  { slug: "incident-reporting", label: "Incidents", icon: AlertTriangle, route: "incident-reporting", count: 1, meta: "1 open", metaTone: "red" },
  { slug: "meeting-notes", label: "Team Meeting Notes", icon: Users, route: "meeting-notes", meta: "2 this month", metaTone: "neutral" },
  { slug: "communications", label: "Communications Log", icon: Phone, route: "communications", meta: "6 this month", metaTone: "neutral" },
  // Row 4
  { slug: "documents", label: "Documents", icon: Folder, route: "documents", count: 3, meta: "3 expiring", metaTone: "amber" },
  { slug: "services", label: "Services", icon: Briefcase, route: "services", meta: "5 active", metaTone: "neutral" },
  { slug: "employment", label: "Employment & Education", icon: GraduationCap, route: "employment" },
  { slug: "care-tracker", label: "Care Tracker", icon: Heart, route: "care-tracker" },
  // Row 5
  { slug: "facesheet", label: "Face Sheet", icon: User, route: "facesheet" },
  { slug: "assigned-staff", label: "Assigned Staff", icon: UserCheck, route: "assigned-staff" },
  { slug: "managed-documents", label: "Managed Documents", icon: Archive, route: "managed-documents" },
  { slug: "oncall", label: "On Call Log", icon: PhoneCall, route: "oncall" },
  // Row 6
  { slug: "trainings", label: "Person Trainings", icon: BookOpen, route: "trainings" },
  { slug: "service-plan", label: "Service Plan", icon: LayoutIcon, route: "service-plan" },
  { slug: "billing", label: "Billing Summary", icon: CreditCard, route: "billing", meta: "12 claims", metaTone: "neutral", roles: ["billing", "admin"] },
  { slug: "esignature", label: "e-Signature", icon: PenTool, route: "esignature" },
];

const metaToneClasses: Record<Tone, string> = {
  neutral: "bg-icm-bg text-icm-text-dim ring-icm-border",
  amber: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
  red: "bg-icm-red-soft text-icm-red ring-icm-red/20",
  green: "bg-icm-green-soft text-icm-green ring-icm-green/20",
  accent: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
};

const EChart = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const person = getPerson(id ?? "");
  const { role } = useRole();
  const [showPreVisit, setShowPreVisit] = useState(false);

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

  const urgent = person.aiSuggestions?.find((s) => s.tone === "urgent");

  return (
    <ICMShell title="eChart" rightPanel={<PersonAIPanel person={person} />}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[11.5px] font-geist text-icm-text-dim">
          <button onClick={() => navigate("/people")} className="hover:text-icm-text">
            People
          </button>
          <ChevronLeft className="w-3 h-3 rotate-180 text-icm-text-faint" />
          <span className="text-icm-text font-medium">
            {person.lastName}, {person.firstName}
          </span>
          <ChevronLeft className="w-3 h-3 rotate-180 text-icm-text-faint" />
          <span className="text-icm-text font-medium">eChart</span>
        </nav>

        {/* Sticky person header */}
        <div className="sticky top-0 z-10 -mx-6 px-6 pt-1 pb-3 bg-icm-bg/95 backdrop-blur-sm">
          <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
            <div className="flex items-start gap-4 flex-wrap">
              <div
                className={`w-16 h-16 rounded-2xl border flex items-center justify-center font-mono text-[18px] font-bold shrink-0 ${riskAvatarClass(
                  person.riskScore,
                )}`}
              >
                {initials(person)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-manrope font-extrabold text-[22px] text-icm-text tracking-tight leading-tight">
                    {person.lastName}, {person.firstName}
                    {person.nickname && (
                      <span className="font-medium text-icm-text-dim"> ({person.nickname})</span>
                    )}
                  </h1>
                  {person.riskScore !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ring-1 ring-current/20 ${riskScoreClass(
                        person.riskScore,
                      )}`}
                    >
                      RISK {person.riskScore}
                    </span>
                  )}
                </div>
                <p className="text-[12px] font-mono text-icm-text-dim mt-1">
                  {person.gender} · {person.age}y · {person.dob} · {person.county} · ID #{person.id}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <InlineField label="Allergies" value={person.allergies ?? "None recorded"} />
                  <InlineField label="Special Instructions" value={person.specialInstructions ?? "—"} />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowPreVisit(true)}
                  className="h-9 px-3 rounded-xl text-[12px] font-geist font-semibold flex items-center gap-1.5 bg-icm-green-soft text-icm-green ring-1 ring-icm-green/30 hover:brightness-95 transition"
                >
                  <Video className="w-3.5 h-3.5" />
                  Start Visit
                </button>
                <HeaderButton label={person.status} icon={ChevronDown} variant="status" />
                <HeaderButton label="eChart" icon={ChevronDown} />
                <HeaderButton label="Manage Programs" icon={Settings2} />
              </div>
            </div>

            {urgent && (
              <div className="mt-4 rounded-xl bg-icm-accent-soft border border-icm-accent/20 px-3.5 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <p className="text-[12.5px] font-geist text-icm-text leading-snug">
                    <span className="font-semibold">AI noticed: </span>
                    <span className="text-icm-text-dim">{urgent.body}</span>
                  </p>
                </div>
                <button
                  onClick={() => demoToast(urgent.cta)}
                  className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline shrink-0"
                >
                  {urgent.cta} →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ONE flat tile grid */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="font-manrope font-bold text-[15px] text-icm-text tracking-tight">
                Modules
              </h2>
              <p className="text-[11.5px] text-icm-text-dim font-geist">
                Open any module for {person.firstName}
              </p>
            </div>
            <span className="text-[11px] font-mono text-icm-text-faint">
              {visibleTiles.length} modules
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {visibleTiles.map((t) => (
              <ModuleTileCard
                key={t.slug}
                tile={t}
                onOpen={() => navigate(`/people/${person.id}/${t.route}`)}
              />
            ))}
          </div>
        </section>
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

function InlineField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-icm-bg border border-icm-border px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-icm-text-faint font-geist font-medium">
        {label}
      </p>
      <p className="text-[12px] text-icm-text font-geist mt-0.5 truncate">{value}</p>
    </div>
  );
}

function HeaderButton({
  label,
  icon: Icon,
  variant,
}: {
  label: string;
  icon: LucideIcon;
  variant?: "status";
}) {
  const base =
    "h-9 px-3 rounded-xl text-[12px] font-geist font-medium flex items-center gap-1.5 transition-colors";
  if (variant === "status") {
    return (
      <button
        onClick={() => demoToast(`${label} details`)}
        className={`${base} bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20 hover:brightness-95`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-icm-green" />
        {label}
        <Icon className="w-3 h-3 opacity-70" />
      </button>
    );
  }
  return (
    <button
      onClick={() => demoToast(label)}
      className={`${base} border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong`}
    >
      {label}
      <Icon className="w-3 h-3 opacity-70" />
    </button>
  );
}

function ModuleTileCard({ tile, onOpen }: { tile: ModuleTile; onOpen: () => void }) {
  const Icon = tile.icon;
  const tone = tile.metaTone ? metaToneClasses[tile.metaTone] : metaToneClasses.neutral;
  return (
    <button
      onClick={onOpen}
      className="text-left rounded-xl border border-icm-border bg-icm-panel p-3.5 min-h-[112px] hover:border-icm-border-strong hover:shadow-elevated transition-all flex flex-col gap-2"
    >
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg bg-icm-bg border border-icm-border flex items-center justify-center text-icm-text-dim">
          <Icon className="w-[18px] h-[18px]" />
        </div>
        {tile.count !== undefined && (
          <span
            className={`px-1.5 min-w-[20px] h-5 rounded-full text-[10px] font-mono font-semibold flex items-center justify-center ${
              tile.metaTone === "red"
                ? "bg-icm-red text-white"
                : tile.metaTone === "amber"
                ? "bg-icm-amber text-white"
                : "bg-icm-bg border border-icm-border text-icm-text-dim"
            }`}
          >
            {tile.count}
          </span>
        )}
      </div>
      <p className="font-tight font-semibold text-[12.5px] text-icm-text leading-tight">
        {tile.label}
      </p>
      {tile.meta && (
        <span
          className={`inline-flex items-center self-start px-1.5 py-0.5 rounded-full text-[10px] font-geist font-medium ring-1 ${tone}`}
        >
          {tile.meta}
        </span>
      )}
    </button>
  );
}

export default EChart;
