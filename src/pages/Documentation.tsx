import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import {
  MessageSquare,
  Pencil,
  CalendarCheck,
  ClipboardList,
  ClipboardCheck,
  FileHeart,
  ArrowRightCircle,
  Users,
  Phone,
  type LucideIcon,
} from "lucide-react";

interface DocCard {
  label: string;
  icon: LucideIcon;
  to: string;
  meta: string;
  metaTone?: "neutral" | "amber" | "red" | "green";
}

const cards: DocCard[] = [
  // Row 1 — Most used
  { label: "Contact Notes", icon: MessageSquare, to: "/documentation/contact-notes", meta: "3 unsigned · 42 this month" },
  { label: "Progress Notes", icon: Pencil, to: "/documentation/progress-notes", meta: "2 unsigned", metaTone: "red" },
  { label: "Visit Summaries", icon: CalendarCheck, to: "/documentation/visit-summaries", meta: "12 this month" },
  // Row 2 — Reviews & Monitoring
  { label: "Monitoring Forms", icon: ClipboardList, to: "/documentation/monitoring-forms", meta: "1 overdue", metaTone: "red" },
  { label: "Assessments", icon: ClipboardCheck, to: "/documentation/assessments", meta: "1 overdue", metaTone: "amber" },
  { label: "Care Plans / ISP", icon: FileHeart, to: "/documentation/care-plans", meta: "1 out of compliance", metaTone: "red" },
  // Row 3 — Coordination
  { label: "Referrals", icon: ArrowRightCircle, to: "/documentation/referrals", meta: "1 pending", metaTone: "amber" },
  { label: "Team Meeting Notes", icon: Users, to: "/documentation/meeting-notes", meta: "4 this month" },
  { label: "Communications Log", icon: Phone, to: "/documentation/communications", meta: "18 this month" },
];

const toneClasses: Record<NonNullable<DocCard["metaTone"]>, string> = {
  neutral: "bg-icm-bg text-icm-text-dim ring-icm-border",
  amber: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
  red: "bg-icm-red-soft text-icm-red ring-icm-red/20",
  green: "bg-icm-green-soft text-icm-green ring-icm-green/20",
};

const Documentation = () => {
  const navigate = useNavigate();
  return (
    <ICMShell title="Documentation" showAIPanel={false}>
      <div className="space-y-5 max-w-[1100px]">
        <Breadcrumbs
          backTo="/dashboard"
          backLabel="Dashboard"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Documentation" },
          ]}
        />
        <div>
          <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
            Documentation
          </h1>
          <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
            Quick access to all documentation across your caseload
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            const tone = c.metaTone ? toneClasses[c.metaTone] : toneClasses.neutral;
            return (
              <button
                key={c.label}
                onClick={() => navigate(c.to)}
                className="text-left rounded-xl border border-icm-border bg-icm-panel p-4 hover:border-icm-border-strong hover:shadow-elevated transition-all flex flex-col gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-icm-bg border border-icm-border flex items-center justify-center text-icm-text-dim">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-tight font-semibold text-[14px] text-icm-text leading-tight">
                    {c.label}
                  </p>
                  <span
                    className={`mt-2 inline-flex items-center self-start px-1.5 py-0.5 rounded-full text-[10px] font-geist font-medium ring-1 ${tone}`}
                  >
                    {c.meta}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </ICMShell>
  );
};

export default Documentation;
