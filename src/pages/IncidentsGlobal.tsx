import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, Plus, Search, X, Filter,
  Loader2, Siren, ChevronDown,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { useAllIncidents, useIncidentSummary, type Incident } from "@/hooks/useIncidents";
import { useIndividuals, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/formatDate";

const STATUS_OPTIONS = ["All", "open", "in_review", "closed", "void"] as const;
type StatusFilter = typeof STATUS_OPTIONS[number];

const SEVERITY_COLOR: Record<string, string> = {
  critical: "bg-icm-red text-white",
  major: "bg-orange-500 text-white",
  minor: "bg-icm-amber-soft text-icm-amber",
  informational: "bg-icm-bg text-icm-text-dim",
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-icm-red-soft text-icm-red",
  in_review: "bg-icm-amber-soft text-icm-amber",
  closed: "bg-icm-green-soft text-icm-green",
  void: "bg-icm-bg text-icm-text-dim",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_review: "Step 1 Pending",
  closed: "Closed",
  void: "Void",
};

function SummaryChip({ label, value, tone }: { label: string; value: number; tone: "red" | "amber" | "green" | "blue" }) {
  const toneClass = {
    red: "bg-icm-red-soft border-icm-red/20",
    amber: "bg-icm-amber-soft border-icm-amber/20",
    green: "bg-icm-green-soft border-icm-green/20",
    blue: "bg-icm-accent-soft border-icm-accent/20",
  }[tone];
  const valueClass = {
    red: "text-icm-red",
    amber: "text-icm-amber",
    green: "text-icm-green",
    blue: "text-icm-accent",
  }[tone];
  return (
    <div className={cn("rounded-xl border p-3", toneClass)}>
      <p className={cn("text-[22px] font-extrabold font-manrope tabular-nums", valueClass)}>{value}</p>
      <p className="text-[11px] text-icm-text-dim font-geist mt-0.5">{label}</p>
    </div>
  );
}

const IncidentsGlobal = () => {
  const navigate = useNavigate();
  const { incidents, loading } = useAllIncidents();
  const { totalOpen, overdue, loading: summaryLoading } = useIncidentSummary();
  const { individuals } = useIndividuals();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  // Build a lookup map for quick person resolution
  const personMap = useMemo(() => {
    const m = new Map<string, string>();
    individuals.forEach((p) => m.set(p.id, `${p.first_name} ${p.last_name}`));
    return m;
  }, [individuals]);

  const filtered = useMemo(() => {
    return incidents.filter((i) => {
      if (statusFilter !== "All" && i.status !== statusFilter) return false;
      if (search) {
        const personName = personMap.get(i.individualId) ?? "";
        const haystack = `${personName} ${i.type} ${i.description}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [incidents, statusFilter, search, personMap]);

  // Type breakdown
  const typeBreak = useMemo(() => {
    const m = new Map<string, number>();
    incidents.forEach((i) => m.set(i.type, (m.get(i.type) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [incidents]);
  const maxType = Math.max(1, ...typeBreak.map((t) => t[1]));

  const inReview = incidents.filter((i) => i.status === "in_review").length;
  const closedTotal = incidents.filter((i) => i.status === "closed").length;

  // Person picker list
  const pickerPeople = useMemo(() => {
    const term = pickerSearch.toLowerCase();
    return individuals
      .filter((p) => p.enrollment_status === "active")
      .filter((p) =>
        !term ||
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(term) ||
        (p.county ?? "").toLowerCase().includes(term)
      )
      .slice(0, 20);
  }, [individuals, pickerSearch]);

  return (
    <ICMShell title="Incident Reporting Center" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs
          backTo="/dashboard"
          backLabel="Dashboard"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Incidents" },
          ]}
        />

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em] inline-flex items-center gap-2">
              <Siren className="w-6 h-6 text-icm-red" /> Incident Reporting Center
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">All incidents across your organization — live from Firestore</p>
          </div>
          <button
            onClick={() => setShowPersonPicker(true)}
            className="h-9 px-3 rounded-xl bg-icm-red text-white text-[12px] font-geist font-semibold hover:opacity-90 inline-flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Report Incident
          </button>
        </div>

        {/* Person Picker Modal */}
        {showPersonPicker && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
            onClick={() => setShowPersonPicker(false)}
          >
            <div
              className="w-full max-w-[480px] rounded-2xl bg-icm-panel border border-icm-border shadow-elevated overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-icm-border flex items-center gap-2">
                <Search className="w-4 h-4 text-icm-text-dim shrink-0" />
                <input
                  autoFocus
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Select individual to report incident for…"
                  className="flex-1 bg-transparent text-[13px] font-geist text-icm-text focus:outline-none placeholder:text-icm-text-faint"
                />
                <button onClick={() => setShowPersonPicker(false)} aria-label="Close person picker">
                  <X className="w-4 h-4 text-icm-text-faint hover:text-icm-text" />
                </button>
              </div>
              <div className="max-h-[320px] overflow-y-auto py-1">
                {pickerPeople.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setShowPersonPicker(false);
                      navigate(`/people/${p.id}/incident-report/new`);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-icm-bg text-left"
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-semibold shrink-0", riskAvatarClass(p.risk_score))}>
                      {initials(p)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold text-icm-text truncate">{p.first_name} {p.last_name}</p>
                      <p className="text-[10.5px] text-icm-text-faint">{p.county ?? ""} · {p.program ?? ""}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-icm-text-faint" />
                  </button>
                ))}
                {pickerPeople.length === 0 && (
                  <p className="px-4 py-6 text-center text-[12px] text-icm-text-faint">No active individuals found</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Summary chips */}
        {loading || summaryLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[0,1,2,3].map((i) => (
              <div key={i} className="rounded-xl border border-icm-border bg-icm-panel p-3 animate-pulse">
                <div className="h-6 w-12 bg-icm-border rounded mb-1" />
                <div className="h-3 w-20 bg-icm-border rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryChip label="Total open" value={totalOpen} tone="red" />
            <SummaryChip label="Step 1 Pending" value={inReview} tone="amber" />
            <SummaryChip label="Overdue (7d+)" value={overdue} tone="red" />
            <SummaryChip label="Closed" value={closedTotal} tone="green" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Incident list */}
          <div className="lg:col-span-2 space-y-3">
            {/* Filter bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, type, description…"
                  className="w-full h-9 pl-8 pr-8 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-icm-text-faint" />
                  </button>
                )}
              </div>
              <div className="flex gap-1">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "h-8 px-2.5 rounded-lg text-[11px] font-geist font-medium transition-colors capitalize",
                      statusFilter === s
                        ? "bg-icm-accent text-white"
                        : "bg-icm-panel border border-icm-border text-icm-text-dim hover:border-icm-accent"
                    )}
                  >
                    {s === "All" ? "All" : STATUS_LABEL[s] ?? s}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-icm-text-dim">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[12px] font-geist">Loading incidents…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-icm-border bg-icm-panel p-12 text-center">
                <AlertTriangle className="w-8 h-8 text-icm-text-faint mx-auto mb-3" />
                <p className="text-[13px] text-icm-text-dim font-geist">
                  {incidents.length === 0 ? "No incidents reported yet." : "No incidents match your filters."}
                </p>
                {incidents.length === 0 && (
                  <button
                    onClick={() => setShowPersonPicker(true)}
                    className="mt-3 h-8 px-4 rounded-xl bg-icm-red text-white text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3 h-3" /> Report First Incident
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
                <div className="divide-y divide-icm-border/50">
                  {filtered.map((incident) => {
                    const hasIndividual = !!incident.individualId;
                    const personName = hasIndividual
                      ? (personMap.get(incident.individualId) ?? "Individual not found")
                      : null;
                    const person = hasIndividual ? individuals.find((p) => p.id === incident.individualId) : null;
                    return (
                      <button
                        key={incident.id}
                        onClick={() =>
                          hasIndividual
                            ? navigate(`/people/${incident.individualId}/incident-reporting/${incident.id}`)
                            : navigate(`/incidents/${incident.id}/edit`)
                        }
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-icm-bg transition-colors group"
                      >
                        {person ? (
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-semibold shrink-0 mt-0.5", riskAvatarClass(person.risk_score))}>
                            {initials(person)}
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-icm-red-soft border border-icm-red/20 flex items-center justify-center shrink-0 mt-0.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-icm-red" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {personName ? (
                              <span className="text-[12.5px] font-semibold text-icm-text">{personName}</span>
                            ) : (
                              <>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-icm-red-soft text-icm-red">Individual not assigned</span>
                                <span className="text-[11px] font-geist text-icm-accent hover:underline">Link Individual →</span>
                              </>
                            )}
                            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase", SEVERITY_COLOR[incident.severity] ?? "bg-icm-bg text-icm-text-dim")}>
                              {incident.severity}
                            </span>
                            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono", STATUS_COLOR[incident.status] ?? "")}>
                              {STATUS_LABEL[incident.status] ?? incident.status}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-icm-text-dim mt-0.5">{incident.type} · {formatDate(incident.reportedAt)}</p>
                          {incident.description && (
                            <p className="text-[11px] text-icm-text-faint mt-0.5 line-clamp-1">{incident.description}</p>
                          )}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-icm-text-faint shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
                <div className="px-4 py-2 border-t border-icm-border bg-icm-bg/30 flex items-center justify-between">
                  <span className="text-[10.5px] font-geist text-icm-text-faint">
                    Showing {filtered.length} of {incidents.length} incidents
                  </span>
                  <span className="text-[10px] font-mono text-icm-text-faint">Live Firestore</span>
                </div>
              </div>
            )}
          </div>

          {/* Type breakdown sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
              <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-icm-amber" /> By Type
              </h3>
              {loading ? (
                <div className="space-y-2">
                  {[0,1,2,3].map((i) => <div key={i} className="h-4 rounded bg-icm-border animate-pulse" />)}
                </div>
              ) : typeBreak.length === 0 ? (
                <p className="text-[11.5px] text-icm-text-faint italic">No incidents yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {typeBreak.map(([type, count]) => (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11.5px] font-geist text-icm-text truncate max-w-[160px]">{type}</span>
                        <span className="text-[11px] font-mono font-bold text-icm-text">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-icm-bg overflow-hidden">
                        <div
                          className="h-full rounded-full bg-icm-red/70 transition-all duration-500"
                          style={{ width: `${Math.round((count / maxType) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
              <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowPersonPicker(true)}
                  className="w-full h-9 rounded-xl bg-icm-red text-white text-[12px] font-geist font-semibold hover:opacity-90 flex items-center gap-1.5 px-3"
                >
                  <Plus className="w-3.5 h-3.5" /> New Incident Report
                </button>
                <button
                  onClick={() => navigate("/supervisor/compliance")}
                  className="w-full h-9 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:bg-icm-bg flex items-center gap-1.5 px-3"
                >
                  <Filter className="w-3.5 h-3.5" /> Compliance Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ICMShell>
  );
};

export default IncidentsGlobal;
