import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { useRole } from "@/contexts/RoleContext";
import { AdminOnly } from "@/components/platform/AdminOnly";
import {
  Building2,
  Users,
  Map,
  Cpu,
  Plug,
  LayoutTemplate,
  Shield,
  ShieldAlert,
  CreditCard,
  Bell,
  Zap,
  ArrowRight,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";
import { userCounts, programs, integrations, operatingStates } from "@/data/settings";

interface CategoryCard {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  tone: "accent" | "green" | "purple" | "amber" | "teal" | "red";
  stat?: string;
  badge?: { label: string; tone: "amber" | "green" };
}

const Settings = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  if (!isAdmin) return <AdminOnly />;

  const counts = userCounts();
  const activeIntegrations = integrations.filter((i) => i.status === "connected").length;

  const cards: CategoryCard[] = [
    {
      icon: Building2,
      title: "Organization",
      description: "Profile, branding, programs, states, and service categories.",
      to: "/settings/organization",
      tone: "accent",
    },
    {
      icon: Users,
      title: "Users & Roles",
      description: "Manage staff accounts, roles, permissions, and access control.",
      to: "/settings/users",
      tone: "green",
      stat: `${counts.active} active users · 5 roles`,
    },
    {
      icon: Map,
      title: "Programs & States",
      description: "Configure programs, service categories, and state-specific requirements.",
      to: "/settings/programs",
      tone: "purple",
      stat: `${programs.length} programs · ${operatingStates.length} states`,
    },
    {
      icon: Cpu,
      title: "AI Settings",
      description:
        "Enable or disable AI features by program, state, and role. Configure ambient listening and AI behavior.",
      to: "/settings/ai",
      tone: "accent",
    },
    {
      icon: ShieldAlert,
      title: "Risk Score",
      description: "Configure risk scoring factors, point values, and Low / Moderate / High thresholds.",
      to: "/settings/risk-score",
      tone: "red",
    },
    {
      icon: Plug,
      title: "Integrations",
      description: "Connect IDD Billing.AI, Intellectability, HL7/FHIR, EVV, and third-party systems.",
      to: "/settings/integrations",
      tone: "amber",
      stat: `${activeIntegrations} active integrations`,
    },
    {
      icon: LayoutTemplate,
      title: "Templates",
      description: "Case management, workflow, assessment, and document templates.",
      to: "/admin/assessment-builder",
      tone: "teal",
    },
    {
      icon: Shield,
      title: "Security & Audit",
      description: "Audit logs, data retention, legal hold, export controls, and security settings.",
      to: "/settings/security",
      tone: "red",
    },
    {
      icon: CreditCard,
      title: "Billing Configuration",
      description: "Configure billing rules, supervisor approval, service codes, and clearinghouse settings.",
      to: "/settings/billing-config",
      tone: "green",
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Configure system notifications, email alerts, and scheduled report delivery.",
      to: "/settings/notifications",
      tone: "amber",
    },
    {
      icon: Zap,
      title: "AI Usage & Credits",
      description: "Monitor token usage, manage credit balance, and set usage limits.",
      to: "/settings/ai-usage",
      tone: "teal",
      badge: { label: "12,400 credits remaining", tone: "amber" },
    },
  ];

  return (
    <ICMShell title="Admin Settings" showAIPanel={false}>
      <div className="space-y-5 max-w-[1200px]">
        <Breadcrumbs
          backTo="/dashboard"
          backLabel="Dashboard"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Admin Settings" },
          ]}
        />

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Admin Settings
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist max-w-[640px]">
              Configure your organization, users, programs, and integrations.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20">
            ADMIN
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {cards.map((c) => (
            <CategoryCardView key={c.title} {...c} onClick={() => navigate(c.to)} />
          ))}
        </div>
      </div>
    </ICMShell>
  );
};

function CategoryCardView({
  icon: Icon,
  title,
  description,
  stat,
  tone,
  badge,
  onClick,
}: CategoryCard & { onClick: () => void }) {
  const toneMap: Record<CategoryCard["tone"], string> = {
    accent: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    green: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    purple: "bg-purple-50 text-purple-600 ring-purple-200",
    amber: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    teal: "bg-teal-50 text-teal-600 ring-teal-200",
    red: "bg-icm-red-soft text-icm-red ring-icm-red/20",
  };
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-icm-border bg-icm-panel p-4 hover:border-icm-border-strong hover:shadow-elevated transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl ring-1 flex items-center justify-center ${toneMap[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${
                badge.tone === "amber"
                  ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
                  : "bg-icm-green-soft text-icm-green ring-icm-green/20"
              }`}
            >
              {badge.label}
            </span>
          )}
          <ArrowRight className="w-4 h-4 text-icm-text-faint group-hover:text-icm-text transition-colors" />
        </div>
      </div>
      <h3 className="font-manrope font-bold text-icm-text mt-3 text-[14.5px]">{title}</h3>
      <p className="text-[12px] font-geist text-icm-text-dim mt-1 leading-relaxed">{description}</p>
      {stat && <p className="text-[11px] font-mono text-icm-text-faint mt-3">{stat}</p>}
    </button>
  );
}

export default Settings;
