import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Search,
  Upload,
  Download,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Loader2,
  Pencil,
  Eye,
  Archive,
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { AdminOnly } from "@/components/platform/AdminOnly";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  useProviders,
  updateProvider,
  type Provider,
} from "@/hooks/useProviders";
import { ProviderImportModal } from "@/components/ProviderImportModal";

// ─── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

const PROVIDER_TYPES = [
  "Day Services / Day Habilitation",
  "Employment & Vocational",
  "Residential / Group Home",
  "Supported Living",
  "Behavioral Health",
  "Community Habilitation",
  "Respite Care",
  "Transportation",
  "Healthcare / Medical",
  "Mental Health",
  "Substance Use Treatment",
  "Family Support",
  "Therapy (OT/PT/Speech)",
  "Other",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(ts: unknown): string {
  if (!ts) return "—";
  if (typeof ts === "string") return ts.slice(0, 10);
  const asAny = ts as any;
  if (asAny?.seconds) return new Date(asAny.seconds * 1000).toLocaleDateString();
  return "—";
}

function csvRow(p: Provider): string {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    esc(p.name),
    esc(p.type),
    esc(p.city),
    esc(p.state),
    esc(p.county),
    esc(p.primaryPhone),
    esc(p.email),
    esc(p.npiNumber),
    esc(p.medicaidContracted ? "Yes" : "No"),
    esc(p.isAcceptingClients),
    esc(p.contractStatus),
    esc(p.status),
  ].join(",");
}

function exportCSV(providers: Provider[]) {
  const header = "Name,Type,City,State,County,Phone,Email,NPI,Medicaid Contracted,Accepting Clients,Contract Status,Status";
  const rows = providers.map(csvRow).join("\n");
  const blob = new Blob([`${header}\n${rows}`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `provider-directory-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "neutral" | "green" | "amber" | "blue";
}) {
  const cls: Record<string, string> = {
    neutral: "bg-icm-panel border-icm-border text-icm-text-dim",
    green: "bg-icm-green-soft border-icm-green/20 text-icm-green",
    amber: "bg-icm-amber-soft border-icm-amber/20 text-icm-amber",
    blue: "bg-icm-accent-soft border-icm-accent/20 text-icm-accent",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3 min-w-[130px]", cls[tone])}>
      <p className="text-[22px] font-manrope font-extrabold leading-tight">{value}</p>
      <p className="text-[11px] font-geist mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

// ─── Table row (list view) ─────────────────────────────────────────────────────

function ProviderRow({
  provider,
  onArchive,
}: {
  provider: Provider;
  onArchive: (p: Provider) => void;
}) {
  const navigate = useNavigate();

  return (
    <tr className="group hover:bg-icm-bg/60 transition-colors border-b border-icm-border last:border-b-0">
      {/* Name + type */}
      <td className="px-4 py-3 min-w-[200px]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-icm-accent-soft text-icm-accent flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <button
              onClick={() => navigate(`/admin/provider-directory/${provider.id}`)}
              className="font-geist font-semibold text-[12.5px] text-icm-text hover:text-icm-accent hover:underline underline-offset-2 truncate block max-w-[220px] text-left"
            >
              {provider.name}
            </button>
            <p className="text-[11px] text-icm-text-faint font-geist truncate max-w-[220px]">{provider.type}</p>
          </div>
        </div>
      </td>

      {/* Location */}
      <td className="px-4 py-3 text-[12px] font-geist text-icm-text-dim whitespace-nowrap">
        {[provider.city, provider.state].filter(Boolean).join(", ")}
        {provider.county ? <><br /><span className="text-[11px] text-icm-text-faint">{provider.county}</span></> : null}
      </td>

      {/* Phone */}
      <td className="px-4 py-3 text-[12px] font-geist font-mono text-icm-text-dim whitespace-nowrap">
        {provider.primaryPhone ?? "—"}
      </td>

      {/* Medicaid */}
      <td className="px-4 py-3">
        {provider.medicaidContracted ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20 whitespace-nowrap">
            ✓ Medicaid
          </span>
        ) : (
          <span className="text-[11px] text-icm-text-faint">—</span>
        )}
      </td>

      {/* Accepting */}
      <td className="px-4 py-3">
        {provider.isAcceptingClients === "yes" ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20 whitespace-nowrap">
            Accepting
          </span>
        ) : provider.isAcceptingClients === "waitlist" ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-amber-soft text-icm-amber ring-1 ring-icm-amber/20 whitespace-nowrap">
            Waitlist
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-red-soft text-icm-red ring-1 ring-icm-red/20 whitespace-nowrap">
            Closed
          </span>
        )}
      </td>

      {/* Individuals */}
      <td className="px-4 py-3 text-center text-[12.5px] font-geist font-semibold text-icm-text">
        {provider.currentIndividualCount ?? 0}
      </td>

      {/* Actions — reveal on row hover */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => navigate(`/admin/provider-directory/${provider.id}`)}
            title="View"
            className="h-7 w-7 rounded-md border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-accent hover:border-icm-accent/30 flex items-center justify-center transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigate(`/admin/provider-directory/${provider.id}/edit`)}
            title="Edit"
            className="h-7 w-7 rounded-md border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center justify-center transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {provider.status !== "archived" && (
            <button
              onClick={() => onArchive(provider)}
              title="Archive"
              className="h-7 w-7 rounded-md border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-red hover:border-icm-red/30 flex items-center justify-center transition-all"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ImportModal removed — replaced by ProviderImportModal (full 4-step wizard)

// ─── Archive Confirmation ───────────────────────────────────────────────────────

function ArchiveConfirm({
  provider,
  onConfirm,
  onCancel,
}: {
  provider: Provider;
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
            <p className="text-[11.5px] font-geist text-icm-text-dim">This action can be undone by editing the provider.</p>
          </div>
        </div>
        <p className="text-[12.5px] font-geist text-icm-text-dim mb-5">
          Archive <strong className="text-icm-text">{provider.name}</strong>? They will no longer appear in active searches or referral suggestions.
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

// ─── Main Page ─────────────────────────────────────────────────────────────────

type TabKey = "active" | "pending";

const ProviderDirectory = () => {
  const { isAdmin } = useRole();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const orgId = profile?.organizationId;
  const { data: allProviders, loading } = useProviders(orgId);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [page, setPage] = useState(1);
  const [archiveTarget, setArchiveTarget] = useState<Provider | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [sortKey, setSortKey] = useState<"name" | "type" | "city" | "individuals">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  if (!isAdmin) return <AdminOnly />;

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = allProviders.filter((p) => p.status === "active");
    return {
      total: active.length,
      accepting: active.filter((p) => p.isAcceptingClients === "yes").length,
      medicaid: active.filter((p) => p.medicaidContracted).length,
      pending: allProviders.filter((p) => p.status === "pending_review").length,
    };
  }, [allProviders]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allProviders.filter((p) => {
      if (activeTab === "pending") return p.status === "pending_review";
      // active tab: show active + archived if filter selected
      if (statusFilter === "active" && p.status !== "active") return false;
      if (statusFilter === "archived" && p.status !== "archived") return false;
      if (statusFilter === "all" && p.status === "pending_review") return false;
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (q) {
        return (
          p.name.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q) ||
          (p.city ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allProviders, search, typeFilter, statusFilter, activeTab]);

  // ── Sort ───────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const copy = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      if (sortKey === "name") return dir * a.name.localeCompare(b.name);
      if (sortKey === "type") return dir * (a.type ?? "").localeCompare(b.type ?? "");
      if (sortKey === "city") return dir * ((a.city ?? "")).localeCompare(b.city ?? "");
      if (sortKey === "individuals") return dir * ((a.currentIndividualCount ?? 0) - (b.currentIndividualCount ?? 0));
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetPage() { setPage(1); }

  async function handleArchive(provider: Provider) {
    try {
      await updateProvider(provider.id, { status: "archived" });
      toast.success(`${provider.name} archived.`);
    } catch {
      toast.error("Failed to archive provider.");
    } finally {
      setArchiveTarget(null);
    }
  }

  return (
    <ICMShell title="Provider Directory" showAIPanel={false}>
      <div className="space-y-5 max-w-[1100px]">
        {/* Breadcrumb */}
        <Breadcrumbs
          items={[
            { label: "Admin Settings", to: "/settings" },
            { label: "Provider Directory" },
          ]}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Provider Directory
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              Manage community providers available for referral matching and service coordination.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text flex items-center gap-1.5 hover:border-icm-border-strong transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              Import CSV
            </button>
            <button
              onClick={() => exportCSV(allProviders.filter((p) => p.status === "active"))}
              className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text flex items-center gap-1.5 hover:border-icm-border-strong transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={() => navigate("/admin/provider-directory/new")}
              className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Provider
            </button>
          </div>
        </div>

        {/* Stat chips */}
        <div className="flex items-center gap-3 flex-wrap">
          <StatChip label="Total Providers" value={stats.total} tone="neutral" />
          <StatChip label="Accepting New Clients" value={stats.accepting} tone="green" />
          <StatChip label="Medicaid Contracted" value={stats.medicaid} tone="blue" />
          <StatChip label="Pending Review" value={stats.pending} tone="amber" />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 bg-icm-bg rounded-xl border border-icm-border p-0.5 w-fit">
          {(["active", "pending"] as TabKey[]).map((t) => (
            <button
              key={t}
              onClick={() => { setActiveTab(t); resetPage(); }}
              className={cn(
                "h-8 px-4 rounded-lg text-[12px] font-geist font-semibold transition-all",
                activeTab === t
                  ? "bg-icm-panel text-icm-text shadow-sm border border-icm-border"
                  : "text-icm-text-dim hover:text-icm-text"
              )}
            >
              {t === "active" ? "All Providers" : `Pending Review${stats.pending > 0 ? ` (${stats.pending})` : ""}`}
            </button>
          ))}
        </div>

        {/* Filters */}
        {activeTab === "active" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-[340px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-icm-text-faint" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                placeholder="Search by name, type, or city…"
                className="h-9 w-full pl-8 pr-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); resetPage(); }}
              className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
            >
              <option value="all">All Types</option>
              {PROVIDER_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
              className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
            >
              <option value="all">Active + Archived</option>
              <option value="active">Active Only</option>
              <option value="archived">Archived Only</option>
            </select>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-icm-text-dim">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[13px] font-geist">Loading providers…</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel p-12 text-center">
            <Building2 className="w-8 h-8 text-icm-text-faint mx-auto mb-3" />
            <p className="font-manrope font-bold text-[15px] text-icm-text">
              {activeTab === "pending" ? "No providers pending review" : "No providers found"}
            </p>
            <p className="text-[12.5px] font-geist text-icm-text-dim mt-1 mb-4">
              {search || typeFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Add providers to build your organization's directory."}
            </p>
            {activeTab === "active" && (
              <button
                onClick={() => navigate("/admin/provider-directory/new")}
                className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 transition-opacity"
              >
                + Add First Provider
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-icm-border overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-icm-bg/80 border-b border-icm-border">
                  {([
                    { key: "name",        label: "Provider Name",  sortable: true,  w: "" },
                    { key: "type",        label: "Type",           sortable: true,  w: "w-[160px]" },
                    { key: "city",        label: "Location",       sortable: true,  w: "w-[140px]" },
                    { key: null,          label: "Phone",          sortable: false, w: "w-[130px]" },
                    { key: null,          label: "Medicaid",       sortable: false, w: "w-[100px]" },
                    { key: null,          label: "Accepting",      sortable: false, w: "w-[100px]" },
                    { key: "individuals", label: "Indiv.",         sortable: true,  w: "w-[60px]" },
                    { key: null,          label: "",               sortable: false, w: "w-[90px]" },
                  ] as { key: "name" | "type" | "city" | "individuals" | null; label: string; sortable: boolean; w: string }[]).map((col, i) => (
                    <th
                      key={i}
                      className={cn(
                        "px-4 py-2.5 text-left text-[10.5px] font-mono font-bold uppercase tracking-wider text-icm-text-faint",
                        col.w,
                        col.sortable && "cursor-pointer hover:text-icm-text select-none"
                      )}
                      onClick={() => col.sortable && col.key && toggleSort(col.key)}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {col.sortable && col.key && (
                          sortKey === col.key ? (
                            sortDir === "asc"
                              ? <ChevronUp className="w-3 h-3" />
                              : <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-icm-panel divide-y divide-icm-border/50">
                {paginated.map((provider) => (
                  <ProviderRow
                    key={provider.id}
                    provider={provider}
                    onArchive={(p) => setArchiveTarget(p)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-[11.5px] font-geist text-icm-text-dim">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length} providers
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 w-8 rounded-lg border border-icm-border flex items-center justify-center text-icm-text-dim hover:text-icm-text disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                const pg = i + 1;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={cn(
                      "h-8 w-8 rounded-lg border text-[12px] font-geist font-semibold transition-all",
                      pg === page
                        ? "bg-icm-text text-icm-panel border-icm-text"
                        : "border-icm-border text-icm-text-dim hover:text-icm-text"
                    )}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 w-8 rounded-lg border border-icm-border flex items-center justify-center text-icm-text-dim hover:text-icm-text disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showImport && (
        <ProviderImportModal
          onClose={() => setShowImport(false)}
          onComplete={(count) => {
            toast.success(`${count} provider${count !== 1 ? "s" : ""} imported successfully.`);
            setShowImport(false);
          }}
        />
      )}
      {archiveTarget && (
        <ArchiveConfirm
          provider={archiveTarget}
          onConfirm={() => handleArchive(archiveTarget)}
          onCancel={() => setArchiveTarget(null)}
        />
      )}
    </ICMShell>
  );
};

export default ProviderDirectory;
