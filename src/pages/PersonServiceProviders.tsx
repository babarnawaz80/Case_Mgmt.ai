/**
 * PersonServiceProviders.tsx
 * Service Providers section for the Program tab of PersonProfile.
 * Shows active/past providers linked to an individual, with modals
 * for adding, editing, viewing, and ending service relationships.
 */

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Pencil,
  X,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Globe,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import {
  useProviders,
  useIndividualProviders,
  addIndividualProvider,
  updateIndividualProvider,
  type Provider,
  type IndividualProvider,
} from "@/hooks/useProviders";
import {
  useServiceAuthorizations,
  type ServiceAuthorization,
} from "@/hooks/useFirestore";

// ─── Props ──────────────────────────────────────────────────────────────────────

interface PersonServiceProvidersProps {
  individualId: string;
  individual: any;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(ds: string | null | undefined): string {
  if (!ds) return "—";
  try {
    return new Date(ds + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return ds;
  }
}

const SERVICES_LIST = [
  "Targeted Case Management",
  "Community Integration & Habilitation",
  "Supported Employment — Individual",
  "Supported Employment — Small Group",
  "Day Services / Day Habilitation",
  "Behavioral Health",
  "Family Supports",
  "Respite Care",
  "Transportation",
  "Residential",
  "Other",
];

const END_REASONS = [
  "Services completed",
  "Individual no longer eligible",
  "Provider closed / no longer available",
  "Individual transferred to another provider",
  "Individual discharged from program",
  "Voluntary withdrawal by individual",
  "Contract/authorization ended",
  "Other",
];

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
      : status === "ended"
      ? "bg-icm-bg text-icm-text-faint ring-icm-border"
      : "bg-icm-amber-soft text-icm-amber ring-icm-amber/20";
  return (
    <span className={cn("px-1.5 py-0.5 rounded-full text-[9.5px] font-geist font-semibold ring-1", cls)}>
      {status}
    </span>
  );
}

// ─── Provider Quick-View Slide-over ────────────────────────────────────────────

function ProviderSlideOver({
  provider,
  onClose,
}: {
  provider: Provider;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[400px] h-full bg-icm-panel border-l border-icm-border overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-icm-panel border-b border-icm-border px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-icm-accent-soft text-icm-accent flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-manrope font-bold text-[14px] text-icm-text truncate">{provider.name}</p>
                <p className="text-[11px] font-geist text-icm-text-dim">{provider.type}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-icm-text-dim hover:text-icm-text mt-1 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            {provider.medicaidContracted && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
                Medicaid Contracted
              </span>
            )}
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1",
              provider.isAcceptingClients === "yes"
                ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20"
                : provider.isAcceptingClients === "waitlist"
                ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
                : "bg-icm-bg text-icm-text-faint ring-icm-border"
            )}>
              {provider.isAcceptingClients === "yes" ? "Accepting Clients" : provider.isAcceptingClients === "waitlist" ? "Waitlist" : "Not Accepting"}
            </span>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-2">Contact</p>
            <div className="space-y-1.5 text-[12.5px] font-geist text-icm-text-dim">
              {(provider.city || provider.state) && (
                <p>{[provider.city, provider.state].filter(Boolean).join(", ")}{provider.county ? ` · ${provider.county}` : ""}</p>
              )}
              {provider.primaryPhone && (
                <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0" />{provider.primaryPhone}</p>
              )}
              {provider.email && (
                <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 shrink-0" />{provider.email}</p>
              )}
              {provider.website && (
                <p className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <a href={provider.website} target="_blank" rel="noopener noreferrer" className="text-icm-accent hover:underline truncate">
                    {provider.website}
                  </a>
                </p>
              )}
            </div>
          </div>

          {/* Services */}
          {provider.servicesOffered?.length > 0 && (
            <div>
              <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-2">Services Offered</p>
              <div className="flex flex-wrap gap-1.5">
                {provider.servicesOffered.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-geist bg-icm-accent-soft text-icm-accent border border-icm-accent/20">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Availability */}
          <div>
            <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-2">Availability</p>
            <div className="space-y-1 text-[12.5px] font-geist text-icm-text-dim">
              {provider.currentOpenings != null && (
                <p>Current openings: <span className="text-icm-text font-medium">{provider.currentOpenings}</span></p>
              )}
              {provider.typicalStartTime && (
                <p>Typical start: <span className="text-icm-text font-medium">{provider.typicalStartTime}</span></p>
              )}
              {provider.waitlistEstimate && (
                <p>Waitlist: <span className="text-icm-text font-medium">{provider.waitlistEstimate}</span></p>
              )}
              {(provider.ageMin != null || provider.ageMax != null) && (
                <p>Age range: <span className="text-icm-text font-medium">{provider.ageMin ?? 0}–{provider.ageMax ?? "+"} years</span></p>
              )}
              {provider.languages?.length > 0 && (
                <p>Languages: <span className="text-icm-text font-medium">{provider.languages.join(", ")}</span></p>
              )}
            </div>
          </div>

          {/* Contact Person */}
          {provider.contactPersonName && (
            <div>
              <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-2">Primary Contact</p>
              <div className="text-[12.5px] font-geist text-icm-text-dim space-y-0.5">
                <p className="font-semibold text-icm-text">{provider.contactPersonName}</p>
                {provider.contactPersonTitle && <p>{provider.contactPersonTitle}</p>}
                {provider.contactPersonPhone && <p><Phone className="w-3 h-3 inline mr-1" />{provider.contactPersonPhone}</p>}
                {provider.contactPersonEmail && <p><Mail className="w-3 h-3 inline mr-1" />{provider.contactPersonEmail}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Add Provider Modal ─────────────────────────────────────────────────────────

interface AddModalProps {
  individualId: string;
  individual: any;
  orgId: string | undefined;
  authorizations: ServiceAuthorization[];
  onClose: () => void;
}

function AddProviderModal({ individualId, individual, orgId, authorizations, onClose }: AddModalProps) {
  const { profile } = useAuth();
  const { data: allProviders, loading: providersLoading } = useProviders(orgId);

  const [step, setStep] = useState<1 | 2>(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Provider | null>(null);
  const [saving, setSaving] = useState(false);

  // Step 2 form
  const [serviceProvided, setServiceProvided] = useState("");
  const [authorizationId, setAuthorizationId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [contactPersonOverride, setContactPersonOverride] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = useMemo(() => {
    if (!search) return allProviders.filter((p) => p.status === "active").slice(0, 20);
    const q = search.toLowerCase();
    return allProviders
      .filter((p) => p.status === "active" && (
        p.name.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        (p.city ?? "").toLowerCase().includes(q)
      ))
      .slice(0, 20);
  }, [allProviders, search]);

  // Top 3 suggestions (just first 3 active providers)
  const suggestions = useMemo(() => allProviders.filter((p) => p.status === "active").slice(0, 3), [allProviders]);

  async function handleSave() {
    if (!selected || !serviceProvided) {
      toast.error("Please select a service type.");
      return;
    }
    setSaving(true);
    try {
      const selectedAuth = authorizations.find((a) => a.id === authorizationId);
      await addIndividualProvider({
        individualId,
        providerId: selected.id,
        providerName: selected.name,
        providerType: selected.type,
        serviceProvided,
        authorizationId: authorizationId || null,
        authorizationNumber: selectedAuth?.auth_number ?? null,
        startDate,
        endDate: endDate || null,
        contactPersonOverride: contactPersonOverride || null,
        contactPhoneOverride: null,
        contactEmailOverride: null,
        notes: notes || null,
        status: "active",
        addedBy: profile?.uid ?? null,
        tenantId: profile?.organizationId ?? null,
        endReason: null,
      });
      toast.success(`${selected.name} added as a service provider.`);
      onClose();
    } catch (err: any) {
      toast.error(`Failed to add provider: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-icm-panel border border-icm-border rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-icm-border shrink-0">
          <div>
            <p className="font-manrope font-bold text-[16px] text-icm-text">Add Service Provider</p>
            <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
              Step {step} of 2 — {step === 1 ? "Search Provider Directory" : "Service Details"}
            </p>
          </div>
          <button onClick={onClose} className="text-icm-text-dim hover:text-icm-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 1 ? (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-icm-text-faint" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, type, or city…"
                  className="h-9 w-full pl-8 pr-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong"
                />
              </div>

              {/* Suggestions */}
              {!search && suggestions.length > 0 && (
                <div>
                  <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-2">Suggested Providers</p>
                  <div className="space-y-2">
                    {suggestions.map((p) => (
                      <ProviderRow key={p.id} provider={p} selected={selected?.id === p.id} onSelect={setSelected} />
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              {search && (
                <div className="space-y-2">
                  {providersLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-icm-text-dim">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-[12px] font-geist">Loading…</span>
                    </div>
                  ) : filtered.length === 0 ? (
                    <p className="text-[12px] font-geist text-icm-text-dim py-4 text-center">No providers found matching "{search}"</p>
                  ) : (
                    filtered.map((p) => (
                      <ProviderRow key={p.id} provider={p} selected={selected?.id === p.id} onSelect={setSelected} />
                    ))
                  )}
                </div>
              )}

              {/* All providers when not searching */}
              {!search && (
                <div>
                  <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-2">All Active Providers</p>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {providersLoading ? (
                      <div className="flex items-center justify-center py-6 gap-2 text-icm-text-dim">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : allProviders.filter((p) => p.status === "active").length === 0 ? (
                      <p className="text-[12px] font-geist text-icm-text-dim py-3 text-center">No active providers in directory.</p>
                    ) : (
                      allProviders
                        .filter((p) => p.status === "active")
                        .map((p) => (
                          <ProviderRow key={p.id} provider={p} selected={selected?.id === p.id} onSelect={setSelected} />
                        ))
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Step 2 */
            <div className="space-y-4">
              {/* Selected provider summary */}
              {selected && (
                <div className="flex items-center gap-3 rounded-xl border border-icm-border bg-icm-bg px-3 py-2.5">
                  <Building2 className="w-4 h-4 text-icm-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-geist font-semibold text-icm-text truncate">{selected.name}</p>
                    <p className="text-[11px] font-geist text-icm-text-dim">{selected.type}</p>
                  </div>
                  <button onClick={() => setStep(1)} className="ml-auto text-[10.5px] font-geist text-icm-accent hover:underline shrink-0">
                    Change
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[11.5px] font-geist font-semibold text-icm-text mb-1">
                  Service Provided <span className="text-icm-red">*</span>
                </label>
                <select
                  value={serviceProvided}
                  onChange={(e) => setServiceProvided(e.target.value)}
                  className="h-9 w-full px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
                >
                  <option value="">Select service…</option>
                  {SERVICES_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11.5px] font-geist font-semibold text-icm-text mb-1">
                  Link to Authorization
                </label>
                <select
                  value={authorizationId}
                  onChange={(e) => setAuthorizationId(e.target.value)}
                  className="h-9 w-full px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
                >
                  <option value="">No authorization linked</option>
                  {authorizations.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.auth_number} — {a.service_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-geist font-semibold text-icm-text mb-1">Start Date <span className="text-icm-red">*</span></label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 w-full px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-geist font-semibold text-icm-text mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 w-full px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-geist font-semibold text-icm-text mb-1">Contact Person Override</label>
                <input
                  value={contactPersonOverride}
                  onChange={(e) => setContactPersonOverride(e.target.value)}
                  placeholder="Override default contact person"
                  className="h-9 w-full px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-geist font-semibold text-icm-text mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes about this service relationship…"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-icm-border shrink-0">
          <button
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="h-8 px-3 rounded-lg border border-icm-border text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          {step === 1 ? (
            <button
              onClick={() => { if (selected) setStep(2); else toast.error("Please select a provider."); }}
              disabled={!selected}
              className="h-8 px-4 rounded-lg bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next: Service Details
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || !serviceProvided}
              className="h-8 px-4 rounded-lg bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Add Provider
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProviderRow({
  provider,
  selected,
  onSelect,
}: {
  provider: Provider;
  selected: boolean;
  onSelect: (p: Provider) => void;
}) {
  return (
    <button
      onClick={() => onSelect(provider)}
      className={cn(
        "w-full text-left rounded-xl border px-3 py-2.5 transition-all",
        selected
          ? "border-icm-accent bg-icm-accent-soft"
          : "border-icm-border bg-icm-bg hover:border-icm-border-strong"
      )}
    >
      <div className="flex items-center gap-2">
        <Building2 className="w-3.5 h-3.5 text-icm-text-faint shrink-0" />
        <div className="min-w-0 flex-1">
          <p className={cn("text-[12.5px] font-geist font-semibold truncate", selected ? "text-icm-accent" : "text-icm-text")}>
            {provider.name}
          </p>
          <p className="text-[11px] font-geist text-icm-text-dim truncate">
            {provider.type}{provider.city ? ` · ${provider.city}, ${provider.state}` : ""}
          </p>
        </div>
        {provider.medicaidContracted && (
          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
            Medicaid
          </span>
        )}
      </div>
    </button>
  );
}

// ─── End Service Modal ──────────────────────────────────────────────────────────

function EndServiceModal({
  link,
  onClose,
}: {
  link: IndividualProvider;
  onClose: () => void;
}) {
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleEnd() {
    if (!reason) { toast.error("Please select an end reason."); return; }
    setSaving(true);
    try {
      await updateIndividualProvider(link.id, {
        status: "ended",
        endDate,
        endReason: reason,
      });
      toast.success(`Service with ${link.providerName} ended.`);
      onClose();
    } catch (err: any) {
      toast.error(`Failed to end service: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-icm-panel border border-icm-border rounded-2xl w-full max-w-sm p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-icm-amber-soft text-icm-amber flex items-center justify-center">
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="font-manrope font-bold text-[15px] text-icm-text">End Service</p>
            <p className="text-[11.5px] font-geist text-icm-text-dim">{link.providerName}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11.5px] font-geist font-semibold text-icm-text mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-full px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-geist font-semibold text-icm-text mb-1">Reason <span className="text-icm-red">*</span></label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 w-full px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
            >
              <option value="">Select reason…</option>
              {END_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onClose} className="h-8 px-3 rounded-lg border border-icm-border text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text">
            Cancel
          </button>
          <button
            onClick={handleEnd}
            disabled={saving || !reason}
            className="h-8 px-3 rounded-lg bg-icm-amber text-white text-[12px] font-geist font-semibold hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            End Service
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Link Modal ────────────────────────────────────────────────────────────

function EditLinkModal({
  link,
  authorizations,
  onClose,
}: {
  link: IndividualProvider;
  authorizations: ServiceAuthorization[];
  onClose: () => void;
}) {
  const [serviceProvided, setServiceProvided] = useState(link.serviceProvided);
  const [authorizationId, setAuthorizationId] = useState(link.authorizationId ?? "");
  const [startDate, setStartDate] = useState(link.startDate);
  const [endDate, setEndDate] = useState(link.endDate ?? "");
  const [contactPersonOverride, setContactPersonOverride] = useState(link.contactPersonOverride ?? "");
  const [notes, setNotes] = useState(link.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!serviceProvided) { toast.error("Service type required."); return; }
    setSaving(true);
    try {
      const selectedAuth = authorizations.find((a) => a.id === authorizationId);
      await updateIndividualProvider(link.id, {
        serviceProvided,
        authorizationId: authorizationId || null,
        authorizationNumber: selectedAuth?.auth_number ?? link.authorizationNumber ?? null,
        startDate,
        endDate: endDate || null,
        contactPersonOverride: contactPersonOverride || null,
        notes: notes || null,
      });
      toast.success("Provider link updated.");
      onClose();
    } catch (err: any) {
      toast.error(`Failed to update: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-icm-panel border border-icm-border rounded-2xl w-full max-w-md p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <p className="font-manrope font-bold text-[15px] text-icm-text">Edit Provider Link</p>
          <button onClick={onClose} className="text-icm-text-dim hover:text-icm-text"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-[12px] font-geist text-icm-text-dim mb-4">{link.providerName}</p>
        <div className="space-y-3">
          <div>
            <label className="block text-[11.5px] font-geist font-semibold text-icm-text mb-1">Service Provided *</label>
            <select value={serviceProvided} onChange={(e) => setServiceProvided(e.target.value)} className="h-9 w-full px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong">
              <option value="">Select…</option>
              {SERVICES_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11.5px] font-geist font-semibold text-icm-text mb-1">Authorization</label>
            <select value={authorizationId} onChange={(e) => setAuthorizationId(e.target.value)} className="h-9 w-full px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong">
              <option value="">None</option>
              {authorizations.map((a) => <option key={a.id} value={a.id}>{a.auth_number} — {a.service_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-geist font-semibold text-icm-text mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-full px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong" />
            </div>
            <div>
              <label className="block text-[11.5px] font-geist font-semibold text-icm-text mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 w-full px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong" />
            </div>
          </div>
          <div>
            <label className="block text-[11.5px] font-geist font-semibold text-icm-text mb-1">Contact Override</label>
            <input value={contactPersonOverride} onChange={(e) => setContactPersonOverride(e.target.value)} placeholder="Override contact" className="h-9 w-full px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong" />
          </div>
          <div>
            <label className="block text-[11.5px] font-geist font-semibold text-icm-text mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2.5 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong resize-none" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onClose} className="h-8 px-3 rounded-lg border border-icm-border text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Provider Link Card ─────────────────────────────────────────────────────────

function ProviderLinkCard({
  link,
  allProviders,
  authorizations,
  canEdit,
  onViewProvider,
  onEdit,
  onEndService,
}: {
  link: IndividualProvider;
  allProviders: Provider[];
  authorizations: ServiceAuthorization[];
  canEdit: boolean;
  onViewProvider: (p: Provider) => void;
  onEdit: (l: IndividualProvider) => void;
  onEndService: (l: IndividualProvider) => void;
}) {
  const provider = allProviders.find((p) => p.id === link.providerId);
  const auth = authorizations.find((a) => a.id === link.authorizationId);

  const unitsRemaining = auth
    ? auth.units_authorized - auth.units_used
    : null;

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-icm-accent-soft text-icm-accent flex items-center justify-center shrink-0">
          <Building2 className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-manrope font-bold text-[13.5px] text-icm-text">{link.providerName}</p>
            <StatusBadge status={link.status} />
          </div>
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">{link.providerType}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px] font-geist">
        <div>
          <span className="text-icm-text-faint">Service:</span>{" "}
          <span className="text-icm-text">{link.serviceProvided}</span>
        </div>
        {link.authorizationNumber && (
          <div>
            <span className="text-icm-text-faint">Auth #:</span>{" "}
            <span className="text-icm-text font-mono">{link.authorizationNumber}</span>
          </div>
        )}
        {unitsRemaining != null && (
          <div>
            <span className="text-icm-text-faint">Units remaining:</span>{" "}
            <span className={cn("font-medium", unitsRemaining <= 0 ? "text-icm-red" : unitsRemaining < 10 ? "text-icm-amber" : "text-icm-green")}>
              {unitsRemaining}
            </span>
          </div>
        )}
        <div>
          <span className="text-icm-text-faint">Start:</span>{" "}
          <span className="text-icm-text">{fmtDate(link.startDate)}</span>
        </div>
        {link.endDate && (
          <div>
            <span className="text-icm-text-faint">End:</span>{" "}
            <span className="text-icm-text">{fmtDate(link.endDate)}</span>
          </div>
        )}
        {link.contactPersonOverride && (
          <div className="col-span-2">
            <span className="text-icm-text-faint">Contact:</span>{" "}
            <span className="text-icm-text">{link.contactPersonOverride}</span>
          </div>
        )}
        {!link.contactPersonOverride && provider?.contactPersonName && (
          <div className="col-span-2">
            <span className="text-icm-text-faint">Contact:</span>{" "}
            <span className="text-icm-text">{provider.contactPersonName}{provider.contactPersonPhone ? ` · ${provider.contactPersonPhone}` : ""}</span>
          </div>
        )}
      </div>

      {link.notes && (
        <p className="mt-2 text-[11.5px] font-geist text-icm-text-dim italic border-t border-icm-border pt-2">{link.notes}</p>
      )}

      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        {provider && (
          <button
            onClick={() => onViewProvider(provider)}
            className="h-7 px-2.5 rounded-lg border border-icm-border bg-icm-bg text-[11px] font-geist font-semibold text-icm-text-dim hover:text-icm-text flex items-center gap-1 transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            View Provider
          </button>
        )}
        {canEdit && (
          <>
            <button
              onClick={() => onEdit(link)}
              className="h-7 px-2.5 rounded-lg border border-icm-border bg-icm-bg text-[11px] font-geist font-semibold text-icm-text-dim hover:text-icm-text flex items-center gap-1 transition-all"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
            {link.status === "active" && (
              <button
                onClick={() => onEndService(link)}
                className="h-7 px-2.5 rounded-lg border border-icm-border bg-icm-bg text-[11px] font-geist font-semibold text-icm-text-dim hover:text-icm-amber hover:border-icm-amber/30 flex items-center gap-1 transition-all"
              >
                End Service
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function PersonServiceProviders({ individualId, individual }: PersonServiceProvidersProps) {
  const { profile } = useAuth();
  const { isAdmin } = useRole();
  // Supervisors and admins can edit
  const isSupervisorOrAdmin = isAdmin || (profile?.role === "supervisor");

  const { data: links, loading: linksLoading } = useIndividualProviders(individualId);
  const { data: authorizations } = useServiceAuthorizations(individualId);
  const { data: allProviders } = useProviders(profile?.organizationId);

  const [showAdd, setShowAdd] = useState(false);
  const [viewProvider, setViewProvider] = useState<Provider | null>(null);
  const [editLink, setEditLink] = useState<IndividualProvider | null>(null);
  const [endLink, setEndLink] = useState<IndividualProvider | null>(null);
  const [pastExpanded, setPastExpanded] = useState(false);

  const activeLinks = useMemo(() => links.filter((l) => l.status === "active" || l.status === "pending"), [links]);
  const pastLinks = useMemo(() => links.filter((l) => l.status === "ended"), [links]);

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-manrope font-bold text-[13px] text-icm-text uppercase tracking-wide">
            SERVICE PROVIDERS
          </h3>
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
            Active provider relationships for this individual
          </p>
        </div>
        {isSupervisorOrAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="h-8 px-3 rounded-xl bg-icm-text text-icm-panel text-[11.5px] font-geist font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Provider
          </button>
        )}
      </div>

      {/* Active providers */}
      {linksLoading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-icm-text-dim">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[12px] font-geist">Loading providers…</span>
        </div>
      ) : activeLinks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel p-8 text-center">
          <Building2 className="w-7 h-7 text-icm-text-faint mx-auto mb-2" />
          <p className="text-[13px] font-geist font-semibold text-icm-text">No active service providers</p>
          <p className="text-[12px] font-geist text-icm-text-dim mt-1 mb-3">
            Add providers from the directory to track services for this individual.
          </p>
          {isSupervisorOrAdmin && (
            <button
              onClick={() => setShowAdd(true)}
              className="h-8 px-4 rounded-xl bg-icm-text text-icm-panel text-[11.5px] font-geist font-semibold hover:opacity-90 transition-opacity"
            >
              + Add Provider
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {activeLinks.map((link) => (
            <ProviderLinkCard
              key={link.id}
              link={link}
              allProviders={allProviders}
              authorizations={authorizations}
              canEdit={isSupervisorOrAdmin}
              onViewProvider={setViewProvider}
              onEdit={setEditLink}
              onEndService={setEndLink}
            />
          ))}
        </div>
      )}

      {/* Past providers collapsible */}
      {pastLinks.length > 0 && (
        <div>
          <button
            onClick={() => setPastExpanded((v) => !v)}
            className="flex items-center gap-2 text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text transition-colors w-full py-1"
          >
            {pastExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Past Providers ({pastLinks.length})
          </button>
          {pastExpanded && (
            <div className="mt-3 grid grid-cols-1 gap-3">
              {pastLinks.map((link) => (
                <ProviderLinkCard
                  key={link.id}
                  link={link}
                  allProviders={allProviders}
                  authorizations={authorizations}
                  canEdit={isSupervisorOrAdmin}
                  onViewProvider={setViewProvider}
                  onEdit={setEditLink}
                  onEndService={setEndLink}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddProviderModal
          individualId={individualId}
          individual={individual}
          orgId={profile?.organizationId}
          authorizations={authorizations}
          onClose={() => setShowAdd(false)}
        />
      )}
      {viewProvider && (
        <ProviderSlideOver provider={viewProvider} onClose={() => setViewProvider(null)} />
      )}
      {editLink && (
        <EditLinkModal link={editLink} authorizations={authorizations} onClose={() => setEditLink(null)} />
      )}
      {endLink && (
        <EndServiceModal link={endLink} onClose={() => setEndLink(null)} />
      )}
    </div>
  );
}
