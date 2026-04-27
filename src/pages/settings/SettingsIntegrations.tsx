import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { integrations, type IntegrationDef } from "@/data/settings";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Activity,
  Share2,
  MapPin,
  Landmark,
  MessageSquare,
  Video,
  Plug,
  Plus,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "credit-card": CreditCard,
  activity: Activity,
  "share-2": Share2,
  "map-pin": MapPin,
  landmark: Landmark,
  "message-square": MessageSquare,
  video: Video,
};

const SettingsIntegrations = () => {
  return (
    <SettingsLayout
      title="Integrations"
      subtitle="Connect CaseManagement.AI with external systems"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {integrations.map((i) => (
          <IntegrationCard key={i.id} integration={i} />
        ))}
      </div>

      {/* SSO */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-manrope font-bold text-[14px] text-icm-text">Single Sign-On (SSO)</p>
            <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
              SAML 2.0 and OIDC supported. Test before rolling out.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <SsoRow label="SAML 2.0" />
          <SsoRow label="OIDC" />
        </div>
        <button className="mt-3 h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold">
          Test SSO connection
        </button>
      </div>

      {/* API access */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-manrope font-bold text-[14px] text-icm-text">API access</p>
            <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
              Manage API keys and webhook endpoints
            </p>
          </div>
          <button className="h-8 px-2.5 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Generate API key
          </button>
        </div>
        <div className="rounded-xl border border-icm-border overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Key name</th>
                <th className="text-left px-3 py-2 font-semibold">Created</th>
                <th className="text-left px-3 py-2 font-semibold">Last used</th>
                <th className="text-left px-3 py-2 font-semibold">Scopes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-icm-border">
                <td className="px-3 py-2 text-icm-text font-medium">Billing.AI integration</td>
                <td className="px-3 py-2 text-icm-text-dim font-mono text-[11px]">01/15/2025</td>
                <td className="px-3 py-2 text-icm-text-dim font-mono text-[11px]">Today, 8:00 AM</td>
                <td className="px-3 py-2 text-icm-text-dim">Full access</td>
              </tr>
              <tr className="border-t border-icm-border">
                <td className="px-3 py-2 text-icm-text font-medium">FHIR data exchange</td>
                <td className="px-3 py-2 text-icm-text-dim font-mono text-[11px]">02/01/2025</td>
                <td className="px-3 py-2 text-icm-text-dim font-mono text-[11px]">Today, 7:30 AM</td>
                <td className="px-3 py-2 text-icm-text-dim">Read individuals, Write notes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SettingsLayout>
  );
};

function IntegrationCard({ integration }: { integration: IntegrationDef }) {
  const Icon = ICONS[integration.iconKey] ?? Plug;
  const statusMap = {
    connected: { label: "Connected", cls: "bg-icm-green-soft text-icm-green ring-icm-green/20" },
    not_connected: { label: "Not connected", cls: "bg-icm-bg text-icm-text-dim ring-icm-border" },
    error: { label: "Error", cls: "bg-icm-red-soft text-icm-red ring-icm-red/20" },
    coming_soon: { label: "Coming soon", cls: "bg-icm-bg text-icm-text-faint ring-icm-border" },
  } as const;
  const s = statusMap[integration.status];
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <span
          className={cn(
            "px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1",
            s.cls
          )}
        >
          {s.label}
        </span>
      </div>
      <p className="font-manrope font-bold text-[14px] text-icm-text">{integration.name}</p>
      <p className="text-[11.5px] font-geist text-icm-text-dim mt-1 leading-relaxed">
        {integration.description}
      </p>
      <button
        disabled={integration.status === "coming_soon"}
        className="mt-3 h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-icm-text text-[11.5px] font-geist font-semibold hover:border-icm-border-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {integration.status === "connected"
          ? "Configure"
          : integration.status === "coming_soon"
            ? "Learn more"
            : "Connect"}
      </button>
    </div>
  );
}

function SsoRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] font-geist text-icm-text">{label}</span>
      <button className="h-7 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-icm-text text-[11px] font-geist font-semibold">
        Configure
      </button>
    </div>
  );
}

export default SettingsIntegrations;
