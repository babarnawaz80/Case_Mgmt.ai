import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Building2,
  Pencil,
  Archive,
  Phone,
  Mail,
  Globe,
  MapPin,
  User,
  Loader2,
  AlertTriangle,
  X,
  ChevronRight,
  FileText,
  CheckCircle2,
  Clock,
  Link2,
  Copy,
  RefreshCw,
  ShieldOff,
  Upload,
  Plus,
  ExternalLink,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { cn } from "@/lib/utils";
import { useProvider, useIndividualProviders, updateProvider, type Provider } from "@/hooks/useProviders";
import { httpsCallable } from "firebase/functions";
import { functions as fns } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(ts: unknown): string {
  if (!ts) return "—";
  if (typeof ts === "string") return ts.slice(0, 10);
  const asAny = ts as any;
  if (asAny?.seconds) return new Date(asAny.seconds * 1000).toLocaleDateString();
  return "—";
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
      <h3 className="font-manrope font-bold text-[13px] text-icm-text uppercase tracking-wide mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-[13px] font-geist text-icm-text">{value ?? "—"}</p>
    </div>
  );
}

function Tag({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "green" | "blue" | "amber" }) {
  const cls: Record<string, string> = {
    neutral: "bg-icm-bg border-icm-border text-icm-text-dim",
    green: "bg-icm-green-soft border-icm-green/20 text-icm-green",
    blue: "bg-icm-accent-soft border-icm-accent/20 text-icm-accent",
    amber: "bg-icm-amber-soft border-icm-amber/20 text-icm-amber",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-geist font-medium border", cls[tone])}>
      {label}
    </span>
  );
}

function contractStatusTone(s: string): "green" | "amber" | "neutral" {
  if (s === "active") return "green";
  if (s === "pending") return "amber";
  return "neutral";
}

function acceptingTone(s: string): "green" | "amber" | "neutral" {
  if (s === "yes") return "green";
  if (s === "waitlist") return "amber";
  return "neutral";
}

// ─── Archive Confirm ───────────────────────────────────────────────────────────

function ArchiveConfirm({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-icm-panel border border-icm-border rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-icm-amber-soft text-icm-amber flex items-center justify-center">
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="font-manrope font-bold text-[15px] text-icm-text">Archive Provider</p>
            <p className="text-[11.5px] font-geist text-icm-text-dim">This can be undone in the edit form.</p>
          </div>
        </div>
        <p className="text-[12.5px] font-geist text-icm-text-dim mb-5">
          Archive <strong className="text-icm-text">{name}</strong>? They will no longer appear in active searches.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className="h-8 px-3 rounded-lg border border-icm-border text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text">
            Cancel
          </button>
          <button onClick={onConfirm} className="h-8 px-3 rounded-lg bg-icm-red text-white text-[12px] font-geist font-semibold hover:opacity-90">
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Provider Portal Section ───────────────────────────────────────────────────

function ProviderPortalSection({ provider }: { provider: Provider }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [portalInfo, setPortalInfo] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    if (!provider?.id) return;
    setLoading(true);
    httpsCallable(fns, "getProviderPortalInfo")({ providerId: provider.id })
      .then((res: any) => { setPortalInfo(res.data); })
      .catch((err) => { console.error("[ProviderPortal] load error:", err); })
      .finally(() => setLoading(false));
  }, [provider.id]);

  async function handleGenerate(sendEmail: boolean) {
    setGenerating(true);
    try {
      const res: any = await httpsCallable(fns, "generateProviderPortalToken")({
        providerId: provider.id,
        providerName: provider.name,
        providerEmail: provider.email ?? provider.contactPersonEmail ?? "",
        providerPhone: provider.primaryPhone ?? provider.contactPersonPhone ?? null,
        sendEmail,
      });
      setPortalInfo({ hasActiveToken: true, ...res.data });
      toast.success("Provider portal link generated", {
        description: sendEmail ? "Link sent to provider email." : "Copy the link to share with the provider.",
      });
    } catch (err: any) {
      toast.error("Failed to generate portal link", { description: err?.message });
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke() {
    if (!portalInfo?.tokenId) return;
    setRevoking(true);
    try {
      await httpsCallable(fns, "revokeProviderPortalToken")({ tokenId: portalInfo.tokenId });
      setPortalInfo({ hasActiveToken: false });
      toast.success("Provider portal access revoked.");
    } catch (err: any) {
      toast.error("Failed to revoke access", { description: err?.message });
    } finally {
      setRevoking(false);
      setRevokeOpen(false);
    }
  }

  function copyLink() {
    if (portalInfo?.portalUrl) {
      navigator.clipboard.writeText(portalInfo.portalUrl).then(() => {
        toast.success("Portal link copied to clipboard");
      });
    }
  }

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
      <h3 className="font-manrope font-bold text-[13px] text-icm-text uppercase tracking-wide mb-4 flex items-center gap-2">
        <Upload className="w-4 h-4 text-icm-accent" />
        Provider Document Portal
      </h3>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-icm-text-dim">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[12.5px]">Loading portal info…</span>
        </div>
      ) : !portalInfo?.hasActiveToken ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-icm-bg border border-icm-border px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-[12.5px] font-medium text-icm-text">No portal link yet</p>
              <p className="text-[11.5px] text-icm-text-dim">Generate a permanent secure link to allow this provider to upload documents directly.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleGenerate(false)}
              disabled={generating}
              className="h-9 px-4 rounded-xl bg-icm-accent text-white text-[12px] font-semibold inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Generate Portal Link
            </button>
            {(provider.email || provider.contactPersonEmail) && (
              <button
                onClick={() => handleGenerate(true)}
                disabled={generating}
                className="h-9 px-4 rounded-xl border border-icm-border text-[12px] font-semibold text-icm-text-dim inline-flex items-center gap-1.5 hover:text-icm-text disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" /> Generate &amp; Send via Email
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-icm-green-soft text-icm-green border border-icm-green/20">Active</span>
            {portalInfo.generatedAt && (
              <span className="text-[11.5px] text-icm-text-dim">Portal link generated: {new Date(portalInfo.generatedAt?.seconds * 1000).toLocaleDateString()}</span>
            )}
          </div>

          {/* Activity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-icm-bg border border-icm-border px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-icm-text-faint mb-0.5">Last Upload</p>
              <p className="text-[12.5px] text-icm-text font-medium">
                {portalInfo.lastDocumentUploadedAt
                  ? new Date(portalInfo.lastDocumentUploadedAt?.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "Never"}
              </p>
            </div>
            <div className="rounded-lg bg-icm-bg border border-icm-border px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-icm-text-faint mb-0.5">Total Documents</p>
              <p className="text-[12.5px] text-icm-text font-medium tabular-nums">{portalInfo.totalDocumentsUploaded ?? 0}</p>
            </div>
          </div>

          {/* Recent uploads */}
          {portalInfo.recentUploads?.length > 0 && (
            <div>
              <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-2">Recent Uploads</p>
              <div className="space-y-1">
                {portalInfo.recentUploads.slice(0, 5).map((u: any) => (
                  <div key={u.id} className="flex items-center gap-2 text-[12px] font-geist">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-icm-text truncate flex-1">{u.name}</span>
                    <span className="text-icm-text-dim whitespace-nowrap">{u.created_at_iso ? new Date(u.created_at_iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Portal link */}
          <div className="rounded-lg bg-icm-bg border border-icm-border px-3 py-3">
            <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-1.5">Portal Link</p>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="flex-1 text-[11px] font-mono text-icm-accent break-all">{portalInfo.portalUrl}</code>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <button
                onClick={copyLink}
                className="h-7 px-2.5 rounded-lg border border-icm-border text-[11.5px] font-semibold text-icm-text-dim inline-flex items-center gap-1 hover:text-icm-text"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
              <a
                href={portalInfo.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 px-2.5 rounded-lg border border-icm-border text-[11.5px] font-semibold text-icm-text-dim inline-flex items-center gap-1 hover:text-icm-text"
              >
                <ExternalLink className="w-3 h-3" /> Open
              </a>
              <button
                onClick={() => handleGenerate(false)}
                disabled={generating}
                className="h-7 px-2.5 rounded-lg border border-icm-border text-[11.5px] font-semibold text-icm-text-dim inline-flex items-center gap-1 hover:text-icm-text disabled:opacity-50"
              >
                <RefreshCw className="w-3 h-3" /> Regenerate
              </button>
              <button
                onClick={() => setRevokeOpen(true)}
                className="h-7 px-2.5 rounded-lg border border-red-200 text-[11.5px] font-semibold text-red-600 inline-flex items-center gap-1 hover:bg-red-50"
              >
                <ShieldOff className="w-3 h-3" /> Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke confirm modal */}
      {revokeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-icm-panel border border-icm-border rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                <ShieldOff className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="font-manrope font-bold text-[15px] text-icm-text">Revoke Portal Access?</p>
                <p className="text-[11.5px] font-geist text-icm-text-dim">{provider.name}</p>
              </div>
            </div>
            <p className="text-[12.5px] font-geist text-icm-text-dim mb-5">
              The provider will immediately lose access to the upload portal. Their existing link will no longer work. You can generate a new link at any time.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setRevokeOpen(false)} className="h-8 px-3 rounded-lg border border-icm-border text-[12px] font-semibold text-icm-text-dim hover:text-icm-text">
                Cancel
              </button>
              <button onClick={handleRevoke} disabled={revoking} className="h-8 px-3 rounded-lg bg-red-600 text-white text-[12px] font-semibold hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1.5">
                {revoking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProviderDetail() {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();

  const { data: provider, loading } = useProvider(providerId);
  const { data: individualProviders } = useIndividualProviders(undefined); // We query by provider below

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);

  // Sync internal notes when provider loads
  useEffect(() => {
    if (provider) {
      setInternalNotes(provider.internalNotes ?? "");
      setNotesDirty(false);
    }
  }, [provider?.id]);

  // Fetch individuals served by THIS provider
  const [linkedIndividuals, setLinkedIndividuals] = useState<any[]>([]);
  useEffect(() => {
    if (!providerId) return;
    // We query individually since we need to filter by providerId
    import("firebase/firestore").then(({ collection, query, where, onSnapshot }) => {
      import("@/lib/firebase").then(({ db }) => {
        const q = query(
          collection(db, "individual_providers"),
          where("providerId", "==", providerId)
        );
        const unsub = onSnapshot(q, (snap) => {
          setLinkedIndividuals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
      });
    });
  }, [providerId]);

  async function handleArchive() {
    if (!provider) return;
    try {
      await updateProvider(provider.id, { status: "archived" });
      toast.success(`${provider.name} archived.`);
      navigate("/admin/provider-directory");
    } catch {
      toast.error("Failed to archive provider.");
    } finally {
      setArchiveOpen(false);
    }
  }

  async function saveNotes() {
    if (!provider || !notesDirty) return;
    try {
      await updateProvider(provider.id, { internalNotes });
      toast.success("Notes saved.");
      setNotesDirty(false);
    } catch {
      toast.error("Failed to save notes.");
    }
  }

  if (loading) {
    return (
      <ICMShell title="Provider Detail" showAIPanel={false}>
        <div className="flex items-center justify-center py-20 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading provider…</span>
        </div>
      </ICMShell>
    );
  }

  if (!provider) {
    return (
      <ICMShell title="Provider Not Found" showAIPanel={false}>
        <div className="rounded-xl border border-icm-border bg-icm-panel p-12 text-center">
          <p className="text-[14px] font-geist text-icm-text-dim">Provider not found.</p>
          <button
            onClick={() => navigate("/admin/provider-directory")}
            className="mt-4 text-[12px] font-geist font-semibold text-icm-accent hover:underline"
          >
            ← Back to Provider Directory
          </button>
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title={provider.name} showAIPanel={false}>
      <div className="space-y-5 max-w-[1100px]">
        {/* Breadcrumb */}
        <Breadcrumbs
          items={[
            { label: "Admin Settings", to: "/settings" },
            { label: "Provider Directory", to: "/admin/provider-directory" },
            { label: provider.name },
          ]}
        />

        {/* Header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-icm-accent-soft text-icm-accent flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-manrope font-extrabold text-[22px] text-icm-text tracking-tight leading-tight">
                  {provider.name}
                </h1>
                {provider.status === "archived" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-bg border border-icm-border text-icm-text-faint">
                    Archived
                  </span>
                )}
              </div>
              <p className="text-[13px] font-geist text-icm-text-dim mt-0.5">{provider.type}</p>
              {(provider.city || provider.state) && (
                <p className="text-[12.5px] font-geist text-icm-text-dim mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {[provider.city, provider.state].filter(Boolean).join(", ")}
                  {provider.county ? ` · ${provider.county} County` : ""}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {provider.medicaidContracted && (
                  <Tag label="Medicaid Contracted" tone="green" />
                )}
                <Tag
                  label={
                    provider.isAcceptingClients === "yes"
                      ? "Accepting Clients"
                      : provider.isAcceptingClients === "waitlist"
                      ? "Waitlist"
                      : "Not Accepting"
                  }
                  tone={acceptingTone(provider.isAcceptingClients)}
                />
                <Tag
                  label={`Contract: ${provider.contractStatus ?? "—"}`}
                  tone={contractStatusTone(provider.contractStatus ?? "")}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => navigate(`/admin/provider-directory/${provider.id}/edit`)}
                className="h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text flex items-center gap-1.5 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              {provider.status !== "archived" && (
                <button
                  onClick={() => setArchiveOpen(true)}
                  className="h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-red hover:border-icm-red/30 flex items-center gap-1.5 transition-all"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archive
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Contact Information */}
          <Section title="Contact Information">
            <div className="space-y-3">
              {(provider.street || provider.city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-icm-text-faint mt-0.5 shrink-0" />
                  <div className="text-[12.5px] font-geist text-icm-text">
                    {provider.street && <p>{provider.street}</p>}
                    <p>{[provider.city, provider.state, provider.zip].filter(Boolean).join(", ")}</p>
                    {provider.county && <p>{provider.county} County</p>}
                  </div>
                </div>
              )}
              {provider.primaryPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-icm-text-faint shrink-0" />
                  <span className="text-[12.5px] font-geist text-icm-text">{provider.primaryPhone}</span>
                </div>
              )}
              {provider.secondaryPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-icm-text-faint shrink-0" />
                  <span className="text-[12.5px] font-geist text-icm-text">{provider.secondaryPhone} (secondary)</span>
                </div>
              )}
              {provider.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-icm-text-faint shrink-0" />
                  <a href={`mailto:${provider.email}`} className="text-[12.5px] font-geist text-icm-accent hover:underline">
                    {provider.email}
                  </a>
                </div>
              )}
              {provider.website && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-icm-text-faint shrink-0" />
                  <a href={provider.website} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-geist text-icm-accent hover:underline truncate">
                    {provider.website}
                  </a>
                </div>
              )}

              {provider.contactPersonName && (
                <div className="pt-3 border-t border-icm-border">
                  <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-2">Contact Person</p>
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-icm-text-faint mt-0.5 shrink-0" />
                    <div className="text-[12.5px] font-geist text-icm-text">
                      <p className="font-semibold">{provider.contactPersonName}</p>
                      {provider.contactPersonTitle && <p className="text-icm-text-dim">{provider.contactPersonTitle}</p>}
                      {provider.contactPersonPhone && (
                        <p className="flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" /> {provider.contactPersonPhone}
                        </p>
                      )}
                      {provider.contactPersonEmail && (
                        <p className="flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          <a href={`mailto:${provider.contactPersonEmail}`} className="text-icm-accent hover:underline">
                            {provider.contactPersonEmail}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Service Information */}
          <Section title="Service Information">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="NPI Number" value={provider.npiNumber} />
                <Field label="Medicaid Provider #" value={provider.medicaidProviderNumber} />
                <Field label="Tax ID" value={provider.taxId} />
                <Field label="Contract Status" value={provider.contractStatus} />
              </div>
              {(provider.contractStartDate || provider.contractEndDate) && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Contract Start" value={provider.contractStartDate ?? undefined} />
                  <Field label="Contract End" value={provider.contractEndDate ?? undefined} />
                </div>
              )}
              {provider.servicesOffered?.length > 0 && (
                <div>
                  <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-2">Services Offered</p>
                  <div className="flex flex-wrap gap-1.5">
                    {provider.servicesOffered.map((s) => (
                      <Tag key={s} label={s} tone="blue" />
                    ))}
                  </div>
                </div>
              )}
              {provider.geographicCoverage?.length > 0 && (
                <div>
                  <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-2">Geographic Coverage</p>
                  <div className="flex flex-wrap gap-1.5">
                    {provider.geographicCoverage.map((g) => (
                      <Tag key={g} label={g} tone="neutral" />
                    ))}
                  </div>
                </div>
              )}
              {provider.populationsServed?.length > 0 && (
                <div>
                  <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-2">Populations Served</p>
                  <div className="flex flex-wrap gap-1.5">
                    {provider.populationsServed.map((p) => (
                      <Tag key={p} label={p} tone="neutral" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Capacity */}
          <Section title="Capacity &amp; Availability">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Accepting Clients"
                value={
                  provider.isAcceptingClients === "yes"
                    ? "Yes"
                    : provider.isAcceptingClients === "no"
                    ? "No"
                    : "Waitlist"
                }
              />
              <Field label="Current Openings" value={provider.currentOpenings ?? "—"} />
              <Field label="Typical Start Time" value={provider.typicalStartTime} />
              <Field label="Waitlist Estimate" value={provider.waitlistEstimate} />
              {(provider.ageMin != null || provider.ageMax != null) && (
                <Field
                  label="Age Range"
                  value={`${provider.ageMin ?? "0"}–${provider.ageMax ?? "+"} years`}
                />
              )}
              {provider.languages?.length > 0 && (
                <div className="col-span-2">
                  <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-1">Languages</p>
                  <p className="text-[12.5px] font-geist text-icm-text">{provider.languages.join(", ")}</p>
                </div>
              )}
            </div>
          </Section>

          {/* Contract & Billing */}
          <Section title="Contract &amp; Billing">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Medicaid Contracted" value={provider.medicaidContracted ? "Yes" : "No"} />
                <Field label="Contract Status" value={provider.contractStatus} />
              </div>
              {provider.acceptedFundingSources?.length > 0 && (
                <div>
                  <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-2">Accepted Funding Sources</p>
                  <div className="flex flex-wrap gap-1.5">
                    {provider.acceptedFundingSources.map((f) => (
                      <Tag key={f} label={f} tone="neutral" />
                    ))}
                  </div>
                </div>
              )}
              {provider.rateNotes && (
                <div>
                  <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-1">Rate Notes</p>
                  <p className="text-[12.5px] font-geist text-icm-text whitespace-pre-wrap">{provider.rateNotes}</p>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* Provider Document Portal */}
        <ProviderPortalSection provider={provider} />

        {/* Internal Notes */}
        <Section title="Internal Notes">
          <textarea
            value={internalNotes}
            onChange={(e) => { setInternalNotes(e.target.value); setNotesDirty(true); }}
            onBlur={saveNotes}
            placeholder="Add internal notes about this provider…"
            rows={4}
            className="w-full rounded-xl border border-icm-border bg-icm-bg px-3 py-2.5 text-[12.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong resize-none"
          />
          {notesDirty && (
            <p className="text-[11px] font-geist text-icm-text-faint mt-1">Click away to auto-save.</p>
          )}
        </Section>

        {/* Individuals Currently Served */}
        <Section title="Individuals Currently Served">
          {linkedIndividuals.length === 0 ? (
            <p className="text-[12.5px] font-geist text-icm-text-dim py-4 text-center">
              No individuals are currently linked to this provider.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] font-geist">
                <thead>
                  <tr className="border-b border-icm-border">
                    <th className="text-left py-2 pr-4 text-[10.5px] font-semibold text-icm-text-faint uppercase tracking-wide">Individual</th>
                    <th className="text-left py-2 pr-4 text-[10.5px] font-semibold text-icm-text-faint uppercase tracking-wide">Service</th>
                    <th className="text-left py-2 pr-4 text-[10.5px] font-semibold text-icm-text-faint uppercase tracking-wide">Auth #</th>
                    <th className="text-left py-2 pr-4 text-[10.5px] font-semibold text-icm-text-faint uppercase tracking-wide">Start Date</th>
                    <th className="text-left py-2 text-[10.5px] font-semibold text-icm-text-faint uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedIndividuals.map((ip: any) => (
                    <tr key={ip.id} className="border-b border-icm-border last:border-0 hover:bg-icm-bg transition-colors">
                      <td className="py-2.5 pr-4 text-icm-text font-medium">{ip.individualName ?? ip.individualId ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-icm-text-dim">{ip.serviceProvided ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-icm-text-dim font-mono text-[11px]">{ip.authorizationNumber ?? ip.authorizationId ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-icm-text-dim">{ip.startDate ?? "—"}</td>
                      <td className="py-2.5">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                          ip.status === "active"
                            ? "bg-icm-green-soft text-icm-green"
                            : ip.status === "ended"
                            ? "bg-icm-bg text-icm-text-faint border border-icm-border"
                            : "bg-icm-amber-soft text-icm-amber"
                        )}>
                          {ip.status ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {archiveOpen && (
        <ArchiveConfirm
          name={provider.name}
          onConfirm={handleArchive}
          onCancel={() => setArchiveOpen(false)}
        />
      )}
    </ICMShell>
  );
}
