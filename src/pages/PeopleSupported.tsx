import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { PersonAvatar } from "@/components/icm/PersonAvatar";
import {
  Search,
  Plus,
  Download,
  Sparkles,
  ChevronDown,
  FileText,
  ClipboardList,
  MapPin,
  User,
  Loader2,
  FileUp,
} from "lucide-react";
import { ImportWizardModal } from "@/components/ImportWizardModal";
import {
  useIndividuals,
  riskScoreClass,
  riskAvatarClass,
  riskTier,
  initials,
  statusLabel,
  calcAge,
  type Individual,
} from "@/hooks/useIndividuals";

type StatusFilter = "All" | "Active" | "Transition" | "Discharged" | "Pending";
type RiskFilter = "All" | "High" | "Review" | "Standard";

const PeopleSupported = () => {
  const navigate = useNavigate();
  const { individuals, loading, error } = useIndividuals();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [risk, setRisk] = useState<RiskFilter>("All");
  const [county, setCounty] = useState("All");
  const [showImport, setShowImport] = useState(false);

  const counties = useMemo(
    () => ["All", ...Array.from(new Set(individuals.map((p) => p.county ?? "").filter(Boolean)))],
    [individuals],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return individuals.filter((p) => {
      const fullName = `${p.first_name} ${p.last_name} ${p.preferred_name ?? ""}`;
      const matchQ =
        !q ||
        fullName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.county ?? "").toLowerCase().includes(q) ||
        (p.medicaid_id ?? "").toLowerCase().includes(q);
      const matchStatus =
        status === "All" || statusLabel(p.enrollment_status) === status;
      const matchCounty = county === "All" || p.county === county;
      const matchRisk =
        risk === "All" ||
        (risk === "High" && riskTier(p.risk_score) === "high") ||
        (risk === "Review" && riskTier(p.risk_score) === "review") ||
        (risk === "Standard" && riskTier(p.risk_score) === "standard");
      return matchQ && matchStatus && matchCounty && matchRisk;
    });
  }, [query, status, risk, county, individuals]);

  const highRiskCount = individuals.filter(p => riskTier(p.risk_score) === "high").length;
  const alertCount = individuals.filter(p => (p.alerts?.length ?? 0) > 0 || (p.open_incidents ?? 0) > 0).length;

  return (
    <ICMShell title="People Supported" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs
          backTo="/dashboard"
          backLabel="Dashboard"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "People Supported" },
          ]}
        />
        {/* Title row */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              People Supported
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              {loading ? "Loading…" : `${individuals.length} individuals · ${alertCount} need attention`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="h-9 px-3.5 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-medium flex items-center gap-1.5 hover:border-icm-border-strong transition-colors"
            >
              <FileUp className="w-3.5 h-3.5" /> Import
            </button>
            <button
              onClick={() => navigate("/people/new")}
              className="h-9 px-3.5 rounded-xl bg-teal-600 text-white text-[12px] font-geist font-medium flex items-center gap-1.5 hover:bg-teal-700"
            >
              <Plus className="w-3.5 h-3.5" /> New Participant
            </button>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[260px] max-w-[420px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, Medicaid ID, or county…"
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-icm-panel border border-icm-border text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40 transition-colors"
            />
          </div>
          <FilterSelect
            value={status}
            onChange={(v) => setStatus(v as StatusFilter)}
            options={["All", "Active", "Transition", "Pending", "Discharged"]}
            label="Status"
          />
          <FilterSelect
            value={risk}
            onChange={(v) => setRisk(v as RiskFilter)}
            options={["All", "High", "Review", "Standard"]}
            label="Risk"
          />
          <FilterSelect value={county} onChange={setCounty} options={counties} label="County" />
        </div>

        {/* AI summary bar */}
        <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-[12.5px] font-geist text-icm-text leading-snug">
              <span className="font-semibold">Your live caseload.</span>{" "}
              <span className="text-icm-text-dim">
                {loading ? "Loading individuals…" : `${highRiskCount} high-risk · ${alertCount} need attention.`}
              </span>
            </p>
          </div>
        </div>

        {/* Loading / error states */}
        {loading && (
          <div className="space-y-2.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-icm-border bg-icm-panel p-4 flex flex-wrap items-center gap-4 animate-pulse">
                <div className="w-12 h-12 bg-slate-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-100 rounded" />
                  <div className="h-3.5 w-60 bg-slate-100/60 rounded" />
                </div>
                <div className="h-8 w-20 bg-slate-100 rounded-lg hidden lg:block" />
                <div className="h-8 w-14 bg-slate-100 rounded-lg hidden md:block" />
                <div className="h-8 w-16 bg-slate-100 rounded-lg hidden md:block" />
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  <div className="h-8 w-20 bg-slate-100 rounded-lg" />
                  <div className="h-8 w-24 bg-slate-100 rounded-lg" />
                  <div className="h-8 w-16 bg-slate-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700 font-geist">
            Error loading individuals: {error}
          </div>
        )}

        {/* People rows */}
        {!loading && (
          <div className="space-y-2.5">
            {filtered.map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                onOpen={() => navigate(`/people/${p.id}/echart`)}
                onOpenFaceSheet={() => navigate(`/people/${p.id}/facesheet`)}
                onOpenProfile={() => navigate(`/people/${p.id}/profile`)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel py-12 text-center">
                <p className="text-[13px] text-icm-text-dim font-geist">
                  {individuals.length === 0 ? "No individuals assigned to your account yet." : "No individuals match your filters."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      {showImport && (
        <ImportWizardModal
          type="individuals"
          onClose={() => setShowImport(false)}
          onComplete={() => setShowImport(false)}
        />
      )}
    </ICMShell>
  );
};

function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none h-9 pl-3 pr-8 rounded-xl bg-icm-panel border border-icm-border text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-accent/40"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {label}: {o}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint pointer-events-none" />
    </div>
  );
}

function PersonRow({ person, onOpen, onOpenFaceSheet, onOpenProfile }: {
  person: Individual;
  onOpen: () => void;
  onOpenFaceSheet: () => void;
  onOpenProfile: () => void;
}) {
  const age = calcAge(person.dob);
  const status = statusLabel(person.enrollment_status);

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex flex-wrap items-center gap-3 sm:gap-4 hover:border-icm-border-strong hover:shadow-elevated transition-all">
      {/* Avatar — initials + risk color */}
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-[13px] font-bold shrink-0 ${riskAvatarClass(person.risk_score)}`}
      >
        {initials(person)}
      </div>

      {/* Identity */}
      <div className="min-w-0 flex-1 basis-[60%] sm:basis-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-tight font-semibold text-[14px] text-icm-text truncate">
            {person.last_name}, {person.first_name}
            {person.preferred_name && person.preferred_name !== person.first_name && (
              <span className="font-normal text-icm-text-dim"> ({person.preferred_name})</span>
            )}
          </h3>
          {(person.alerts?.length ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 bg-red-50 text-red-600 ring-red-200">
              <Sparkles className="w-2.5 h-2.5" />
              Needs Attention
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-icm-text-dim font-geist mt-1 flex-wrap">
          <span className="font-mono">
            {person.gender ?? "—"} · {age !== null ? `${age}y` : "—"} · {person.dob ?? "—"}
          </span>
          {person.county && (
            <>
              <span className="text-icm-text-faint hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {person.county}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Program */}
      <div className="hidden lg:block min-w-[150px] text-right">
        <p className="text-[10px] uppercase tracking-wide text-icm-text-faint font-geist">Program</p>
        <p className="text-[12px] text-icm-text font-geist mt-0.5 truncate">{person.program ?? "—"}</p>
      </div>

      {/* Risk score */}
      {person.risk_score !== undefined && (
        <div className="hidden md:block text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wide text-icm-text-faint font-geist">Risk</p>
          <p className={`font-mono font-bold text-[16px] leading-tight ${riskScoreClass(person.risk_score)}`}>
            {person.risk_score}
          </p>
        </div>
      )}

      {/* Status */}
      <div className="hidden md:block shrink-0">
        <StatusPill status={person.enrollment_status} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto flex-wrap">
        <button
          onClick={onOpen}
          className="h-8 px-3 rounded-lg bg-icm-accent text-white text-[11.5px] font-geist font-semibold flex items-center gap-1.5 hover:opacity-90"
        >
          <FileText className="w-3 h-3" /> eChart
        </button>
        <button
          onClick={onOpenFaceSheet}
          className="h-8 px-3 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1.5 transition-colors"
        >
          <ClipboardList className="w-3 h-3" /> Face Sheet
        </button>
        <button
          onClick={onOpenProfile}
          className="h-8 px-3 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1.5 transition-colors"
        >
          <User className="w-3 h-3" /> Profile
        </button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Individual["enrollment_status"] }) {
  const cls =
    status === "active"
      ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
      : status === "pending"
      ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
      : status === "transition"
      ? "bg-blue-50 text-blue-600 ring-blue-200"
      : "bg-icm-bg text-icm-text-dim ring-icm-border";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}

export default PeopleSupported;
