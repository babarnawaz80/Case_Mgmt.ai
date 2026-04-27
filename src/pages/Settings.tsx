import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { useRole } from "@/contexts/RoleContext";
import { AdminOnly } from "@/components/platform/AdminOnly";
import {
  Building2,
  Users,
  Sparkles,
  FileText,
  Shield,
  Plug,
  Lock,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

interface Group {
  title: string;
  icon: LucideIcon;
  items: { label: string; to?: string }[];
}

const groups: Group[] = [
  {
    title: "Organization",
    icon: Building2,
    items: [
      { label: "Organization profile" },
      { label: "Logo and branding" },
      { label: "Programs and service categories" },
      { label: "State configurations" },
    ],
  },
  {
    title: "Users & Roles",
    icon: Users,
    items: [
      { label: "User management" },
      { label: "Role configuration" },
      { label: "Permissions matrix" },
      { label: "SSO configuration" },
    ],
  },
  {
    title: "AI Settings",
    icon: Sparkles,
    items: [
      { label: "Enable/disable AI by feature" },
      { label: "Enable/disable AI by program" },
      { label: "Enable/disable AI by role" },
      { label: "Ambient listening settings" },
      { label: "AI audit log" },
    ],
  },
  {
    title: "Templates & Configuration",
    icon: FileText,
    items: [
      { label: "Case management templates" },
      { label: "Workflow templates", to: "/admin/workflow-templates" },
      { label: "Assessment templates", to: "/admin/assessment-builder" },
      { label: "Document templates" },
    ],
  },
  {
    title: "Compliance",
    icon: Shield,
    items: [
      { label: "Guidelines engines", to: "/platform/guidelines-engines" },
      { label: "Compliance agents", to: "/platform/agents" },
      { label: "Compliance thresholds" },
    ],
  },
  {
    title: "Integrations",
    icon: Plug,
    items: [
      { label: "IDD Billing.AI connection", to: "/billing" },
      { label: "Intellectability / HRST" },
      { label: "HL7 / FHIR settings" },
      { label: "EVV configuration" },
      { label: "API keys and webhooks" },
    ],
  },
  {
    title: "Security & Audit",
    icon: Lock,
    items: [
      { label: "Audit log", to: "/reports" },
      { label: "Data retention policies" },
      { label: "Legal hold management" },
      { label: "Export controls" },
    ],
  },
];

const Settings = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  if (!isAdmin) return <AdminOnly />;

  return (
    <ICMShell title="Settings" showAIPanel={false}>
      <div className="space-y-5 max-w-[1100px]">
        <div>
          <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
            Settings
          </h1>
          <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
            Organization configuration and administration
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {groups.map((g) => {
            const Icon = g.icon;
            return (
              <div
                key={g.title}
                className="rounded-xl border border-icm-border bg-icm-panel p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-icm-bg border border-icm-border flex items-center justify-center text-icm-text-dim">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2 className="font-manrope font-bold text-[14px] text-icm-text">
                    {g.title}
                  </h2>
                </div>
                <ul className="space-y-1">
                  {g.items.map((item) => (
                    <li key={item.label}>
                      <button
                        onClick={() => item.to && navigate(item.to)}
                        disabled={!item.to}
                        className="w-full text-left flex items-center justify-between px-2 py-1.5 rounded-lg text-[12.5px] font-geist text-icm-text hover:bg-icm-bg disabled:text-icm-text-faint disabled:cursor-default transition-colors"
                      >
                        <span>{item.label}</span>
                        {item.to && (
                          <ArrowRight className="w-3.5 h-3.5 text-icm-text-faint" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </ICMShell>
  );
};

export default Settings;
