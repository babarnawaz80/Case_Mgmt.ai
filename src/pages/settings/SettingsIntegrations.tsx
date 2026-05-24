import React, { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { integrations as DEFAULT_INTEGRATIONS, type IntegrationDef } from "@/data/settings";
import {
  CreditCard,
  Activity,
  Share2,
  MapPin,
  Landmark,
  MessageSquare,
  Video,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  ChevronRight,
  Loader2,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "credit-card": CreditCard,
  activity: Activity,
  "share-2": Share2,
  "map-pin": MapPin,
  landmark: Landmark,
  "message-square": MessageSquare,
  video: Video,
};

function statusMeta(status: IntegrationDef["status"]) {
  switch (status) {
    case "connected":
      return {
        tone: "bg-icm-green-soft text-icm-green ring-icm-green/20",
        icon: CheckCircle2,
        label: "Connected",
      };
    case "error":
      return {
        tone: "bg-icm-red-soft text-icm-red ring-icm-red/20",
        icon: AlertCircle,
        label: "Error",
      };
    case "coming_soon":
      return {
        tone: "bg-icm-bg text-icm-text-dim ring-icm-border",
        icon: Clock,
        label: "Coming soon",
      };
    default:
      return {
        tone: "bg-icm-bg text-icm-text-dim ring-icm-border",
        icon: X,
        label: "Not connected",
      };
  }
}

const CATEGORY_LABELS: Record<IntegrationDef["category"], string> = {
  billing: "Billing & Revenue Cycle",
  clinical: "Clinical Systems",
  interop: "Interoperability",
  comm: "Communication",
  sso: "Identity & SSO",
  state: "State Systems",
};

const CATEGORIES: IntegrationDef["category"][] = [
  "billing",
  "clinical",
  "interop",
  "comm",
  "sso",
  "state",
];

interface IntegrationState {
  id: string;
  status: IntegrationDef["status"];
  apiKey?: string;
  webhookUrl?: string;
  notes?: string;
}

interface ConfigModal {
  integration: IntegrationDef;
  state: IntegrationState;
}

const SettingsIntegrations = () => {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const [intStates, setIntStates] = useState<Record<string, IntegrationState>>({});
  const [loading, setLoading] = useState(true);
  const [configModal, setConfigModal] = useState<ConfigModal | null>(null);
  const [filter, setFilter] = useState<IntegrationDef["category"] | "all">("all");

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    getDoc(doc(db, "organizations", orgId))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setIntStates(d.integrations ?? {});
        }
      })
      .catch((err) => {
        console.error("Failed to load integrations:", err);
        toast.error("Failed to load integrations");
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  const getState = (id: string): IntegrationState => {
    return (
      intStates[id] ?? {
        id,
        status: DEFAULT_INTEGRATIONS.find((i) => i.id === id)?.status ?? "not_connected",
      }
    );
  };

  const handleSaveConfig = async (id: string, newState: IntegrationState) => {
    if (!orgId) return;
    const updated = { ...intStates, [id]: newState };
    const idUnderscore = id.replace("-", "_");
    const isConnected = newState.status === "connected";
    try {
      await updateDoc(doc(db, "organizations", orgId), {
        integrations: updated,
        [`integrations.${id}`]: isConnected,
        [`integrations.${idUnderscore}`]: isConnected,
        updatedAt: new Date(),
      });
      setIntStates(updated);
      toast.success("Integration saved", { description: `Settings for ${DEFAULT_INTEGRATIONS.find((i) => i.id === id)?.name ?? id} updated.` });
      setConfigModal(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save integration");
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!orgId) return;
    const updated = { ...intStates, [id]: { id, status: "not_connected" as const } };
    const idUnderscore = id.replace("-", "_");
    try {
      await updateDoc(doc(db, "organizations", orgId), {
        integrations: updated,
        [`integrations.${id}`]: false,
        [`integrations.${idUnderscore}`]: false,
        updatedAt: new Date(),
      });
      setIntStates(updated);
      toast.success("Integration disconnected");
    } catch (err) {
      console.error(err);
      toast.error("Failed to disconnect integration");
    }
  };

  const connectedCount = DEFAULT_INTEGRATIONS.filter(
    (i) => (getState(i.id).status ?? i.status) === "connected"
  ).length;

  const byCategory = CATEGORIES.filter((cat) => {
    if (filter !== "all" && cat !== filter) return false;
    return DEFAULT_INTEGRATIONS.some((i) => i.category === cat);
  });

  const filteredIntegrations = DEFAULT_INTEGRATIONS.filter(
    (i) => filter === "all" || i.category === filter
  );

  return (
    <SettingsLayout
      title="Integrations"
      subtitle="Connect CaseManagement.AI to external systems, clearinghouses, and state platforms."
    >
      {/* Summary */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="px-2.5 py-1 rounded-xl bg-icm-green-soft text-icm-green text-[11.5px] font-geist font-semibold ring-1 ring-icm-green/20">
          {connectedCount} connected
        </span>
        <span className="px-2.5 py-1 rounded-xl bg-icm-bg text-icm-text-dim text-[11.5px] font-geist font-semibold ring-1 ring-icm-border">
          {DEFAULT_INTEGRATIONS.length - connectedCount} available
        </span>

        <div className="ml-auto flex flex-wrap gap-1">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</FilterChip>
          {CATEGORIES.filter((c) => DEFAULT_INTEGRATIONS.some((i) => i.category === c)).map((c) => (
            <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>
              {CATEGORY_LABELS[c]}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Integration cards */}
      {loading ? (
        <IntegrationsSkeleton />
      ) : (
        <div className="space-y-4">
          {byCategory.map((cat) => {
            const items = filteredIntegrations.filter((i) => i.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">
                  {CATEGORY_LABELS[cat]}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((integration) => {
                    const st = getState(integration.id);
                    const resolvedStatus = st.status;
                    const meta = statusMeta(resolvedStatus);
                    const Icon = ICON_MAP[integration.iconKey] ?? CreditCard;
                    const StatusIcon = meta.icon;
                    const isComingSoon = resolvedStatus === "coming_soon";
                    const isConnected = resolvedStatus === "connected";

                    return (
                      <div
                        key={integration.id}
                        className={cn(
                          "rounded-xl border bg-icm-panel p-4 flex gap-3",
                          isConnected
                            ? "border-icm-green/30"
                            : "border-icm-border",
                          isComingSoon && "opacity-70"
                        )}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl ring-1 flex items-center justify-center shrink-0",
                            isConnected
                              ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
                              : "bg-icm-bg text-icm-text-dim ring-icm-border"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-manrope font-bold text-[13.5px] text-icm-text">
                              {integration.name}
                            </h3>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1",
                                meta.tone
                              )}
                            >
                              <StatusIcon className="w-2.5 h-2.5" />
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-[11.5px] font-geist text-icm-text-dim mt-1 leading-snug">
                            {integration.description}
                          </p>

                          <div className="flex items-center gap-2 mt-3">
                            {!isComingSoon && (
                              <>
                                <button
                                  onClick={() =>
                                    setConfigModal({ integration, state: st })
                                  }
                                  className={cn(
                                    "h-7 px-2.5 rounded-lg text-[11px] font-geist font-semibold inline-flex items-center gap-1",
                                    isConnected
                                      ? "border border-icm-border bg-icm-panel text-icm-text-dim hover:border-icm-border-strong"
                                      : "bg-teal-600 text-white hover:bg-teal-700"
                                  )}
                                >
                                  <Settings2 className="w-3 h-3" />
                                  {isConnected ? "Configure" : "Connect"}
                                </button>
                                {isConnected && (
                                  <button
                                    onClick={() => handleDisconnect(integration.id)}
                                    className="h-7 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-icm-red text-[11px] font-geist font-semibold hover:border-icm-red/30"
                                  >
                                    Disconnect
                                  </button>
                                )}
                              </>
                            )}
                            {isComingSoon && (
                              <button
                                onClick={() => toast("Waitlist notification registered")}
                                className="h-7 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-icm-text-dim text-[11px] font-geist font-semibold inline-flex items-center gap-1"
                              >
                                <ChevronRight className="w-3 h-3" />
                                Notify me
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Config Modal */}
      {configModal && (
        <IntegrationConfigModal
          integration={configModal.integration}
          initialState={configModal.state}
          onSave={handleSaveConfig}
          onClose={() => setConfigModal(null)}
        />
      )}
    </SettingsLayout>
  );
};

function IntegrationConfigModal({
  integration,
  initialState,
  onSave,
  onClose,
}: {
  integration: IntegrationDef;
  initialState: IntegrationState;
  onSave: (id: string, state: IntegrationState) => Promise<void>;
  onClose: () => void;
}) {
  const [apiKey, setApiKey] = useState(initialState.apiKey ?? "");
  const [webhookUrl, setWebhookUrl] = useState(initialState.webhookUrl ?? "");
  const [notes, setNotes] = useState(initialState.notes ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(integration.id, {
      id: integration.id,
      status: apiKey.trim() ? "connected" : "not_connected",
      apiKey: apiKey.trim() || undefined,
      webhookUrl: webhookUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
  };

  const Icon = ICON_MAP[integration.iconKey] ?? CreditCard;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="rounded-2xl bg-icm-panel border border-icm-border shadow-elevated w-full max-w-[520px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-icm-border">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-icm-bg border border-icm-border flex items-center justify-center">
              <Icon className="w-4 h-4 text-icm-text-dim" />
            </span>
            <h2 className="font-manrope font-bold text-[15px] text-icm-text">
              {integration.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-[12px] font-geist text-icm-text-dim">{integration.description}</p>

          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              API Key / Token
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your API key here..."
              className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
            />
          </div>

          {(integration.category === "billing" || integration.category === "clinical") && (
            <div>
              <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
                Webhook URL (optional)
              </label>
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
              />
            </div>
          )}

          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this integration..."
              className="mt-1 w-full px-3 py-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text resize-none focus:outline-none focus:border-icm-border-strong"
            />
          </div>

          <div className="rounded-lg border border-icm-border bg-icm-bg p-2.5 text-[10.5px] font-geist text-icm-text-dim leading-snug">
            API keys are stored encrypted in Firestore. Never share them publicly.
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 pb-4">
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-3 rounded-xl bg-teal-600 text-white text-[12px] font-geist font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save & Connect
          </button>
        </div>
      </div>
    </div>
  );
}

function IntegrationsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[2, 2, 3].map((n, gi) => (
        <div key={gi}>
          <div className="h-4 w-32 rounded bg-icm-border mb-2" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...Array(n)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl border border-icm-border bg-icm-panel" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-7 px-2.5 rounded-xl text-[11px] font-geist font-semibold transition-colors",
        active
          ? "bg-icm-text text-icm-panel"
          : "border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text"
      )}
    >
      {children}
    </button>
  );
}

export default SettingsIntegrations;
