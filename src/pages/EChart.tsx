import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { PersonAIPanel } from "@/components/icm/PersonAIPanel";
import {
  MessageSquare,
  ListChecks,
  FileCheck2,
  ClipboardList,
  CalendarCheck,
  ShieldCheck,
  Pencil,
  Users,
  StickyNote,
  Activity,
  Signature,
  Briefcase,
  IdCard,
  Siren,
  ArrowRightLeft,
  FolderOpen,
  PhoneCall,
  GraduationCap,
  HandHeart,
  ScrollText,
  Receipt,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  Settings2,
  ClipboardCheck,
  ArrowRightCircle,
  Phone,
  type LucideIcon,
} from "lucide-react";
import {
  getPerson,
  initials,
  riskAvatarClass,
  riskScoreClass,
} from "@/data/people";
import { BillingSummaryWidget } from "@/components/billing/BillingSummaryWidget";

interface ModuleTile {
  slug: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  meta?: string;
  metaTone?: "neutral" | "amber" | "red" | "green" | "accent";
  aiBadge?: string;
}

const caseManagementModules: ModuleTile[] = [
  { slug: "contact-note", label: "Contact Note", icon: MessageSquare, count: 12, meta: "Last 02/22", aiBadge: "Draft ready" },
  { slug: "case-management", label: "Case Management", icon: ListChecks, count: 8, meta: "3 tasks overdue", metaTone: "amber" },
  { slug: "care-plan", label: "Care Plan / ISP", icon: FileCheck2, meta: "Overdue 8 days", metaTone: "red", aiBadge: "Talking points" },
  { slug: "monitoring-form", label: "Monitoring Form", icon: ClipboardList, meta: "Due in 7 days", metaTone: "amber" },
  { slug: "visit-summary", label: "Visit Summary", icon: CalendarCheck, count: 5, meta: "Last 02/15" },
  { slug: "eligibility", label: "Eligibility Verification", icon: ShieldCheck, meta: "MA Active", metaTone: "green" },
  { slug: "progress-note", label: "Progress Note", icon: Pencil, count: 4, meta: "2 unsigned", metaTone: "amber" },
  { slug: "assessments", label: "Assessments", icon: ClipboardCheck, count: 1, meta: "Annual due", metaTone: "amber", aiBadge: "AI pre-fill" },
];

const individualRecordModules: ModuleTile[] = [
  { slug: "assigned-staff", label: "Assigned Staff", icon: Users, count: 4 },
  { slug: "care-notes", label: "Care Notes", icon: StickyNote, count: 18 },
  { slug: "care-tracker", label: "Care Tracker", icon: Activity, count: 6 },
  { slug: "e-signature", label: "e-Signature", icon: Signature, count: 2 },
  { slug: "employment-education", label: "Employment & Education", icon: Briefcase },
  { slug: "face-sheet", label: "Face Sheet", icon: IdCard },
  { slug: "incident-reporting", label: "Incident Reporting", icon: Siren, count: 1 },
  { slug: "discharge-transfer", label: "Global Discharge & Transfer", icon: ArrowRightLeft },
  { slug: "managed-documents", label: "Managed Documents", icon: FolderOpen, count: 24 },
  { slug: "on-call-log", label: "On Call Log", icon: PhoneCall, count: 3 },
  { slug: "person-trainings", label: "Person Trainings", icon: GraduationCap, count: 7 },
  { slug: "services", label: "Services", icon: HandHeart, count: 5 },
  { slug: "service-plan", label: "Service Plan", icon: ScrollText },
  { slug: "general-ledger", label: "General Ledger", icon: Receipt },
];

const coordinationModules: ModuleTile[] = [
  { slug: "referrals", label: "Referrals", icon: ArrowRightCircle, count: 1, meta: "1 pending", metaTone: "amber" },
  { slug: "meeting-notes", label: "Team Meeting Notes", icon: Users, count: 2, meta: "2 this month" },
  { slug: "communications", label: "Communications Log", icon: Phone, count: 6, meta: "6 this month" },
];

const metaToneClasses: Record<NonNullable<ModuleTile["metaTone"]>, string> = {
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

  const urgent = person.aiSuggestions?.find((s) => s.tone === "urgent");

  return (
    <ICMShell title="eChart" rightPanel={<PersonAIPanel person={person} />}>
      <div className="space-y-5">
        <button
          onClick={() => navigate("/people")}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          People Supported
        </button>

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
                <button className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline shrink-0">
                  {urgent.cta} →
                </button>
              </div>
            )}
          </div>
        </div>

        <ModuleSection
          title="Case Management"
          subtitle="Primary working modules"
          tiles={caseManagementModules}
          personId={person.id}
        />

        <ModuleSection
          title="Individual Record"
          subtitle="Supporting information"
          tiles={individualRecordModules}
          personId={person.id}
        />

        <ModuleSection
          title="Coordination"
          subtitle="Referrals and communications"
          tiles={coordinationModules}
          personId={person.id}
        />

        <BillingSummaryWidget individualId={person.id} />
      </div>
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
      <button className={`${base} bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20 hover:brightness-95`}>
        <span className="w-1.5 h-1.5 rounded-full bg-icm-green" />
        {label}
        <Icon className="w-3 h-3 opacity-70" />
      </button>
    );
  }
  return (
    <button className={`${base} border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong`}>
      {label}
      <Icon className="w-3 h-3 opacity-70" />
    </button>
  );
}

function ModuleSection({
  title,
  subtitle,
  tiles,
  personId,
}: {
  title: string;
  subtitle: string;
  tiles: ModuleTile[];
  personId: string;
}) {
  const navigate = useNavigate();
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="font-manrope font-bold text-[15px] text-icm-text tracking-tight">{title}</h2>
          <p className="text-[11.5px] text-icm-text-dim font-geist">{subtitle}</p>
        </div>
        <span className="text-[11px] font-mono text-icm-text-faint">{tiles.length} modules</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <ModuleTileCard
            key={t.slug}
            tile={t}
            onOpen={() => {
              if (t.slug === "contact-note") {
                navigate(`/people/${personId}/contact-note`);
              } else if (t.slug === "case-management") {
                navigate(`/people/${personId}/case-management`);
              } else if (t.slug === "care-plan") {
                navigate(`/people/${personId}/care-plan`);
              } else if (t.slug === "monitoring-form") {
                navigate(`/people/${personId}/monitoring-form`);
              } else if (t.slug === "visit-summary") {
                navigate(`/people/${personId}/visit-summary`);
              } else if (t.slug === "eligibility") {
                navigate(`/people/${personId}/eligibility-verification`);
              } else if (t.slug === "progress-note") {
                navigate(`/people/${personId}/progress-note`);
              } else if (t.slug === "workflow-manager") {
                navigate(`/people/${personId}/workflow-manager`);
              } else if (t.slug === "incident-reporting") {
                navigate(`/people/${personId}/incident-reporting`);
              } else if (t.slug === "assessments") {
                navigate(`/people/${personId}/assessments`);
              } else {
                navigate(`/people/${personId}/module/${t.slug}`);
              }
            }}
          />
        ))}
      </div>
    </section>
  );
}

function ModuleTileCard({ tile, onOpen }: { tile: ModuleTile; onOpen: () => void }) {
  const Icon = tile.icon;
  const tone = tile.metaTone ? metaToneClasses[tile.metaTone] : metaToneClasses.neutral;
  return (
    <button
      onClick={onOpen}
      className="text-left rounded-xl border border-icm-border bg-icm-panel p-3.5 hover:border-icm-border-strong hover:shadow-elevated transition-all flex flex-col gap-2"
    >
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg bg-icm-bg border border-icm-border flex items-center justify-center text-icm-text-dim">
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <div className="flex items-center gap-1.5">
          {tile.aiBadge && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-geist font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20">
              <Sparkles className="w-2.5 h-2.5" />
              {tile.aiBadge}
            </span>
          )}
          {tile.count !== undefined && (
            <span className="px-1.5 min-w-[20px] h-5 rounded-full bg-icm-bg border border-icm-border text-[10px] font-mono font-semibold text-icm-text-dim flex items-center justify-center">
              {tile.count}
            </span>
          )}
        </div>
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
