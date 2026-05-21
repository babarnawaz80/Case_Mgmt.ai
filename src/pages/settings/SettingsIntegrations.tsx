import { useState } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { integrations as seedIntegrations, type IntegrationDef } from "@/data/settings";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  CreditCard, Activity, Share2, MapPin, Landmark, MessageSquare, Video, Plug, Plus,
  CheckCircle2, ExternalLink, Copy, RefreshCw, Trash2, type LucideIcon,
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

// Per-integration field specs for the Connect / Configure dialog
const INTEGRATION_FIELDS: Record<string, { label: string; placeholder: string; type?: string; defaultValue?: string }[]> = {
  "idd-billing": [
    { label: "API endpoint", placeholder: "https://api.iddbilling.ai/v2", defaultValue: "https://api.iddbilling.ai/v2" },
    { label: "API key", placeholder: "iddb_live_••••••••••••", type: "password", defaultValue: "iddb_live_8x2k••••••••" },
    { label: "Organization ID", placeholder: "org_xxx", defaultValue: "org_carroll_md" },
  ],
  intellectability: [
    { label: "Account email", placeholder: "you@org.com", type: "email" },
    { label: "API token", placeholder: "Paste token from Intellectability portal", type: "password" },
    { label: "Sync interval (hours)", placeholder: "24", type: "number", defaultValue: "24" },
  ],
  fhir: [
    { label: "FHIR base URL", placeholder: "https://fhir.state.md.gov/r4", defaultValue: "https://fhir.state.md.gov/r4" },
    { label: "Client ID", placeholder: "smart-app-xxx", defaultValue: "icm-prod-md" },
    { label: "Client secret", placeholder: "••••••••", type: "password", defaultValue: "•••• •••• •••• 4f21" },
  ],
  evv: [
    { label: "Provider NPI", placeholder: "10-digit NPI" },
    { label: "State EVV aggregator", placeholder: "e.g. Sandata, HHAeXchange" },
  ],
  ltss: [
    { label: "State system", placeholder: "LTSS Maryland / Pega VA" },
    { label: "SFTP host", placeholder: "sftp.ltssmaryland.org" },
    { label: "Username", placeholder: "service account" },
    { label: "Password", placeholder: "••••••••", type: "password" },
  ],
  sms: [
    { label: "Twilio Account SID", placeholder: "AC••••••••••••••••••••••••" },
    { label: "Auth token", placeholder: "••••••••", type: "password" },
    { label: "From number", placeholder: "+14105551234" },
  ],
  telehealth: [
    { label: "Provider", placeholder: "Zoom or Microsoft Teams", defaultValue: "Zoom" },
    { label: "OAuth client ID", placeholder: "xxx.apps" },
    { label: "OAuth client secret", placeholder: "••••••••", type: "password" },
  ],
};

const SettingsIntegrations = () => {
  const [items, setItems] = useState<IntegrationDef[]>(seedIntegrations);
  const [active, setActive] = useState<IntegrationDef | null>(null);
  const [showApiDialog, setShowApiDialog] = useState(false);
  const [showSso, setShowSso] = useState<string | null>(null);

  const setStatus = (id: string, status: IntegrationDef["status"]) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));

  return (
    <SettingsLayout title="Integrations" subtitle="Connect CaseManagement.AI with external systems">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((i) => (
          <IntegrationCard key={i.id} integration={i} onOpen={() => setActive(i)} />
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
          <SsoRow label="SAML 2.0" onConfigure={() => setShowSso("SAML 2.0")} />
          <SsoRow label="OIDC" onConfigure={() => setShowSso("OIDC")} />
        </div>
        <button
          onClick={() => toast.success("SSO connection test passed", { description: "SAML 2.0 endpoint reachable in 142ms." })}
          className="mt-3 h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold hover:border-icm-border-strong"
        >
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
          <button
            onClick={() => setShowApiDialog(true)}
            className="h-8 px-2.5 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5"
          >
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
                <th className="text-right px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Billing.AI integration", created: "01/15/2025", used: "Today, 8:00 AM", scopes: "Full access" },
                { name: "FHIR data exchange", created: "02/01/2025", used: "Today, 7:30 AM", scopes: "Read individuals, Write notes" },
              ].map((k) => (
                <tr key={k.name} className="border-t border-icm-border">
                  <td className="px-3 py-2 text-icm-text font-medium">{k.name}</td>
                  <td className="px-3 py-2 text-icm-text-dim font-mono text-[11px]">{k.created}</td>
                  <td className="px-3 py-2 text-icm-text-dim font-mono text-[11px]">{k.used}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{k.scopes}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => toast.success("Key rotated", { description: `${k.name} rotated. Old key valid for 24h.` })}
                      className="h-7 px-2 rounded-md text-icm-text-dim hover:text-icm-text hover:bg-icm-bg text-[11px] inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Rotate
                    </button>
                    <button
                      onClick={() => toast("Revoke confirmed", { description: `${k.name} disabled.` })}
                      className="h-7 px-2 rounded-md text-icm-red hover:bg-icm-red-soft text-[11px] inline-flex items-center gap-1 ml-1"
                    >
                      <Trash2 className="w-3 h-3" /> Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration Connect/Configure dialog */}
      <IntegrationDialog
        integration={active}
        onClose={() => setActive(null)}
        onConnect={(id) => {
          setStatus(id, "connected");
          toast.success(`${active?.name} connected`, { description: "Credentials saved. Initial sync started." });
          setActive(null);
        }}
        onDisconnect={(id) => {
          setStatus(id, "not_connected");
          toast(`${active?.name} disconnected`, { description: "Credentials removed." });
          setActive(null);
        }}
        onSave={() => {
          toast.success(`${active?.name} configuration saved`);
          setActive(null);
        }}
      />

      {/* API key dialog */}
      <Dialog open={showApiDialog} onOpenChange={setShowApiDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Generate API key</DialogTitle>
            <DialogDescription>Name the key and choose its scopes. You'll see the secret once.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-[11.5px]">Key name</Label>
              <Input placeholder="e.g. State reporting export" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11.5px]">Scopes</Label>
              <div className="space-y-1.5 rounded-lg border border-icm-border p-2.5">
                {["Read individuals", "Write notes", "Read billing", "Webhook delivery"].map((s) => (
                  <label key={s} className="flex items-center gap-2 text-[12px] text-icm-text">
                    <input type="checkbox" defaultChecked={s.startsWith("Read")} className="rounded" />
                    {s}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowApiDialog(false)} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-semibold">Cancel</button>
            <button
              onClick={() => {
                setShowApiDialog(false);
                toast.success("API key created", { description: "icm_live_x82k••••••••  · copy now, it won't be shown again." });
              }}
              className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-semibold"
            >
              Generate key
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SSO dialog */}
      <Dialog open={!!showSso} onOpenChange={(o) => !o && setShowSso(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Configure {showSso}</DialogTitle>
            <DialogDescription>Provide your identity provider details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {showSso === "SAML 2.0" ? (
              <>
                <FieldRow label="Identity provider entity ID" placeholder="https://idp.example.com/saml" />
                <FieldRow label="SSO URL" placeholder="https://idp.example.com/sso" />
                <FieldRow label="X.509 certificate" placeholder="-----BEGIN CERTIFICATE-----" />
              </>
            ) : (
              <>
                <FieldRow label="Issuer URL" placeholder="https://login.example.com" />
                <FieldRow label="Client ID" placeholder="icm-prod" />
                <FieldRow label="Client secret" placeholder="••••••••" type="password" />
              </>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setShowSso(null)} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-semibold">Cancel</button>
            <button
              onClick={() => {
                toast.success(`${showSso} configured`);
                setShowSso(null);
              }}
              className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-semibold"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
};

function IntegrationCard({ integration, onOpen }: { integration: IntegrationDef; onOpen: () => void }) {
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
        <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1", s.cls)}>
          {s.label}
        </span>
      </div>
      <p className="font-manrope font-bold text-[14px] text-icm-text">{integration.name}</p>
      <p className="text-[11.5px] font-geist text-icm-text-dim mt-1 leading-relaxed">{integration.description}</p>
      <button
        onClick={onOpen}
        className="mt-3 h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-icm-text text-[11.5px] font-geist font-semibold hover:border-icm-border-strong transition-colors"
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

function IntegrationDialog({
  integration,
  onClose,
  onConnect,
  onDisconnect,
  onSave,
}: {
  integration: IntegrationDef | null;
  onClose: () => void;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onSave: () => void;
}) {
  const isComingSoon = integration?.status === "coming_soon";
  const isConnected = integration?.status === "connected";
  const fields = integration ? INTEGRATION_FIELDS[integration.id] ?? [] : [];

  return (
    <Dialog open={!!integration} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {integration?.name}
            {isConnected && <CheckCircle2 className="w-4 h-4 text-icm-green" />}
          </DialogTitle>
          <DialogDescription>{integration?.description}</DialogDescription>
        </DialogHeader>

        {isComingSoon ? (
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-icm-bg p-3 text-[12px] text-icm-text-dim">
              This integration is on the roadmap. We'll notify your admins when it ships.
            </div>
            <FieldRow label="Notify email" placeholder="admin@org.com" type="email" />
            <label className="flex items-center justify-between rounded-lg border border-icm-border p-2.5">
              <span className="text-[12px] text-icm-text">Join the early access program</span>
              <Switch defaultChecked />
            </label>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {fields.length === 0 && (
              <div className="rounded-lg bg-icm-bg p-3 text-[12px] text-icm-text-dim">
                No configuration fields required for this integration.
              </div>
            )}
            {fields.map((f) => (
              <FieldRow key={f.label} {...f} />
            ))}
            {isConnected && (
              <div className="rounded-lg bg-icm-green-soft/40 ring-1 ring-icm-green/20 p-2.5 text-[11.5px] text-icm-text flex items-center justify-between">
                <span>Last sync: Today, 8:00 AM · 142 records updated</span>
                <button
                  onClick={() => toast.success("Sync started")}
                  className="text-icm-green font-semibold inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Sync now
                </button>
              </div>
            )}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); toast("Docs would open in a new tab"); }}
              className="text-[11.5px] text-icm-accent inline-flex items-center gap-1 hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> View {integration?.name} setup docs
            </a>
          </div>
        )}

        <DialogFooter className="gap-2">
          {isConnected && (
            <button
              onClick={() => integration && onDisconnect(integration.id)}
              className="h-9 px-3 rounded-xl border border-icm-red/30 text-icm-red text-[12px] font-semibold mr-auto"
            >
              Disconnect
            </button>
          )}
          <button onClick={onClose} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-semibold">
            {isComingSoon ? "Close" : "Cancel"}
          </button>
          {!isComingSoon && (
            <button
              onClick={() => integration && (isConnected ? onSave() : onConnect(integration.id))}
              className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-semibold"
            >
              {isConnected ? "Save changes" : "Connect"}
            </button>
          )}
          {isComingSoon && (
            <button
              onClick={() => { toast.success("You're on the list"); onClose(); }}
              className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-semibold"
            >
              Notify me
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({ label, placeholder, type, defaultValue }: { label: string; placeholder: string; type?: string; defaultValue?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11.5px]">{label}</Label>
      <div className="flex gap-1.5">
        <Input type={type} placeholder={placeholder} defaultValue={defaultValue} />
        {defaultValue && (
          <button
            type="button"
            onClick={() => { navigator.clipboard?.writeText(defaultValue); toast("Copied"); }}
            className="h-9 px-2 rounded-md border border-icm-border text-icm-text-dim hover:text-icm-text"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function SsoRow({ label, onConfigure }: { label: string; onConfigure: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] font-geist text-icm-text">{label}</span>
      <button
        onClick={onConfigure}
        className="h-7 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-icm-text text-[11px] font-geist font-semibold hover:border-icm-border-strong"
      >
        Configure
      </button>
    </div>
  );
}

export default SettingsIntegrations;
