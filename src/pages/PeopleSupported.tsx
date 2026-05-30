import { useState, useMemo, useEffect } from "react";
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
  AlertTriangle,
} from "lucide-react";
import { ImportWizardModal } from "@/components/ImportWizardModal";
import {
  useIndividuals,
  riskScoreClass,
  riskTier,
  statusLabel,
  calcAge,
  type Individual,
} from "@/hooks/useIndividuals";
import { useRiskScore } from "@/contexts/RiskScoreContext";
import { calculateRiskScore, loadRiskSettings } from "@/lib/riskEngine";
import { getRiskLabel, formatDate } from "@/lib/formatDate";
import { collection, query as firestoreQuery, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingDuplicatePairs } from "@/hooks/useDuplicatePairs";

type StatusFilter = "All" | "Active" | "Transition" | "Discharged" | "Pending" | "Possible Duplicate";
type RiskFilter = "All" | "High" | "Review" | "Standard";

const PeopleSupported = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { individuals, loading, error } = useIndividuals();
  const { openDrawer } = useRiskScore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("All");

  // Duplicate detection — live count + IDs for banner and filter
  const { data: pendingPairs } = usePendingDuplicatePairs(userProfile?.organizationId);
  const duplicateIndividualIds = useMemo(() => {
    const ids = new Set<string>();
    pendingPairs.forEach((p) => { ids.add(p.individualAId); ids.add(p.individualBId); });
    return ids;
  }, [pendingPairs]);
  // Map individualId → pairId so the row can link to the review panel
  const duplicatePairIdMap = useMemo(() => {
    const map = new Map<string, string>();
    pendingPairs.forEach((p) => {
      map.set(p.individualAId, p.id);
      map.set(p.individualBId, p.id);
    });
    return map;
  }, [pendingPairs]);
  const [risk, setRisk] = useState<RiskFilter>("All");
  const [county, setCounty] = useState("All");
  const [selectedState, setSelectedState] = useState("All");
  const [showImport, setShowImport] = useState(false);

  // ── Dynamic state list from org's programs config ──────────────────────────
  // Also builds a map of programName → state so the filter can match
  // an individual's .program field (not their home address state).
  const [programStates, setProgramStates] = useState<string[]>([]);
  const [programToState, setProgramToState] = useState<Record<string, string>>({});
  const [statesLoading, setStatesLoading] = useState(true);

  useEffect(() => {
    const orgId = userProfile?.organizationId;
    if (!orgId) { setStatesLoading(false); return; }
    getDocs(
      firestoreQuery(collection(db, "programs"), where("organizationId", "==", orgId))
    )
      .then((snap) => {
        const stateSet = new Set<string>();
        const nameToState: Record<string, string> = {};
        snap.docs.forEach((d) => {
          const prog = d.data();
          const state = (prog.state as string | undefined)?.trim();
          const name  = (prog.name  as string | undefined)?.trim();
          if (state) {
            stateSet.add(state);
            // Map both the exact name and the program code to its state
            if (name) nameToState[name.toLowerCase()] = state;
            const code = (prog.code as string | undefined)?.trim();
            if (code) nameToState[code.toLowerCase()] = state;
          }
        });
        setProgramStates([...stateSet].sort());
        setProgramToState(nameToState);
      })
      .catch(() => {/* non-fatal — show only "All" */})
      .finally(() => setStatesLoading(false));
  }, [userProfile?.organizationId]);

  // Compute scores once per render (uses localStorage settings)
  const riskSettings = useMemo(() => loadRiskSettings(), []);
  const computedScores = useMemo(() => {
    const m: Record<string, number> = {};
    individuals.forEach((p) => {
      m[p.id] = calculateRiskScore(p.id, riskSettings, p.risk_score).total;
    });
    return m;
  }, [individuals, riskSettings]);


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
        (p.medicaid_id ?? "").toLowerCase().includes(q) ||
        (p.ltss_id ?? "").toLowerCase().includes(q);
      const matchStatus =
        status === "All"
          ? statusLabel(p.enrollment_status) !== "Discharged"
          : status === "Possible Duplicate"
          ? duplicateIndividualIds.has(p.id)
          : statusLabel(p.enrollment_status) === status;
      const matchCounty = county === "All" || p.county === county;
      // State filter — matches against the individual's enrolled program's state.
      // Falls back to address_state if program isn't in the map.
      const matchState = (() => {
        if (selectedState === "All") return true;
        // Check if their program name/code maps to the selected state
        const progName = (p.program ?? "").toLowerCase().trim();
        if (progName && programToState[progName] === selectedState) return true;
        // Fallback: check address_state directly (full name or abbreviation)
        const addrState = (p.address_state ?? "").trim();
        if (addrState === selectedState) return true;
        return false;
      })();
      const score = computedScores[p.id] ?? p.risk_score ?? 0;
      const matchRisk =
        risk === "All" ||
        (risk === "High" && score >= 60) ||
        (risk === "Review" && score >= 35 && score < 60) ||
        (risk === "Standard" && score < 35);
      return matchQ && matchStatus && matchCounty && matchState && matchRisk;
    });
  }, [query, status, risk, county, selectedState, individuals, computedScores, programToState]);

  // Counts derived from the filtered set so they update with all active filters
  const highRiskCount = filtered.filter(p => (computedScores[p.id] ?? p.risk_score ?? 0) >= 60).length;
  const alertCount = filtered.filter(p => (p.alerts?.length ?? 0) > 0 || (p.open_incidents ?? 0) > 0).length;


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
              {loading
                ? "Loading…"
                : `${filtered.length}${filtered.length !== individuals.length ? ` of ${individuals.length}` : ""} individuals · ${alertCount} need attention`}
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
            value={selectedState}
            onChange={setSelectedState}
            options={["All", ...programStates]}
            label="State"
            disabled={statesLoading}
            loadingLabel={statesLoading ? "Loading…" : undefined}
          />
          {/* Status filter — custom to add "Possible Duplicate" with divider */}
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className={`appearance-none h-9 pl-3 pr-8 rounded-xl bg-icm-panel border text-[12px] font-geist focus:outline-none focus:border-icm-accent/40 ${
                status === "Possible Duplicate"
                  ? "border-icm-amber text-icm-amber bg-icm-amber-soft"
                  : "border-icm-border text-icm-text"
              }`}
            >
              {["All", "Active", "Transition", "Pending", "Discharged"].map((o) => (
                <option key={o} value={o}>Status: {o}</option>
              ))}
              <option value="──────────" disabled>──────────────────</option>
              <option value="Possible Duplicate">⚠ Possible Duplicate</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint pointer-events-none" />
          </div>
          <FilterSelect
            value={risk}
            onChange={(v) => setRisk(v as RiskFilter)}
            options={["All", "High", "Review", "Standard"]}
            label="Compliance Risk"
          />
          <FilterSelect value={county} onChange={setCounty} options={counties} label="County" />
        </div>

        {/* AI summary bar */}
        <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-[12.5px] font-geist text-icm-text leading-snug flex items-center flex-wrap gap-x-1.5 gap-y-1">
              <span className="font-semibold">Your live caseload.</span>{" "}
              <span className="text-icm-text-dim">
                {loading
                  ? "Loading individuals…"
                  : `${highRiskCount} high compliance risk · ${alertCount} need attention${selectedState !== "All" ? ` (${selectedState})` : ""}.`}
              </span>
              {!loading && pendingPairs.length > 0 && (
                <button
                  onClick={() => navigate("/people/duplicates")}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold bg-icm-amber-soft text-icm-amber ring-1 ring-icm-amber/30 hover:bg-icm-amber/20 transition-colors"
                >
                  <AlertTriangle className="w-3 h-3" />
                  {pendingPairs.length} possible duplicate{pendingPairs.length > 1 ? "s" : ""} →
                </button>
              )}
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
                computedScore={computedScores[p.id]}
                onOpen={() => navigate(`/people/${p.id}/echart`)}
                onOpenFaceSheet={() => navigate(`/people/${p.id}/facesheet`)}
                onOpenProfile={() => navigate(`/people/${p.id}/profile`)}
                onOpenRisk={() => openDrawer(p.id, `${p.first_name} ${p.last_name}`)}
                duplicatePairId={duplicatePairIdMap.get(p.id)}
                onReviewDuplicate={duplicatePairIdMap.has(p.id)
                  ? () => navigate(`/people/duplicates?pairId=${duplicatePairIdMap.get(p.id)}`)
                  : undefined}
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
  disabled,
  loadingLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
  disabled?: boolean;
  loadingLabel?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="appearance-none h-9 pl-3 pr-8 rounded-xl bg-icm-panel border border-icm-border text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-accent/40 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {disabled && loadingLabel ? (
          <option value="All">{label}: {loadingLabel}</option>
        ) : (
          options.map((o) => (
            <option key={o} value={o}>
              {label}: {o}
            </option>
          ))
        )}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint pointer-events-none" />
    </div>
  );
}

function PersonRow({ person, computedScore, onOpen, onOpenFaceSheet, onOpenProfile, onOpenRisk, duplicatePairId, onReviewDuplicate }: {
  person: Individual;
  computedScore?: number;
  onOpen: () => void;
  onOpenFaceSheet: () => void;
  onOpenProfile: () => void;
  onOpenRisk: () => void;
  duplicatePairId?: string;
  onReviewDuplicate?: () => void;
}) {
  const age = calcAge(person.dob);
  const status = statusLabel(person.enrollment_status);
  const displayScore = computedScore ?? person.risk_score;


  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex flex-wrap items-center gap-3 sm:gap-4 hover:border-icm-border-strong hover:shadow-elevated transition-all">
      {/* Avatar — shows photo if uploaded, falls back to risk-tinted initials */}
      <PersonAvatar
        person={person}
        size={48}
        shape="rounded"
        className="shrink-0"
      />

      {/* Identity */}
      <div className="min-w-0 flex-1 basis-[60%] sm:basis-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenProfile}
            className="font-tight font-semibold text-[14px] text-icm-text truncate hover:text-icm-accent hover:underline transition-colors text-left"
          >
            {person.last_name}, {person.first_name}
            {person.preferred_name && person.preferred_name !== person.first_name && (
              <span className="font-normal text-icm-text-dim"> ({person.preferred_name})</span>
            )}
          </button>
          {duplicatePairId && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 bg-icm-amber-soft text-icm-amber ring-icm-amber/20">
              <AlertTriangle className="w-2.5 h-2.5" />
              Possible Duplicate
            </span>
          )}
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
          {(person.updatedAt || person.updatedOn) && (
            <>
              <span className="text-icm-text-faint hidden sm:inline">·</span>
              <span className="text-icm-text-faint">
                Updated {formatDate(person.updatedAt as any ?? person.updatedOn)}
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

      {/* Risk score — clickable → opens breakdown drawer */}
      {displayScore !== undefined && (
        <button
          onClick={(e) => { e.stopPropagation(); onOpenRisk(); }}
          className="hidden md:block text-right shrink-0 group"
          title="View risk score breakdown"
          aria-label={`Compliance Risk score ${displayScore} — ${getRiskLabel(displayScore)}. Click to view breakdown.`}
        >
          <p className="text-[10px] uppercase tracking-wide text-icm-text-faint font-geist">Compliance Risk</p>
          <p className={`font-mono font-bold text-[16px] leading-tight group-hover:underline ${riskScoreClass(displayScore)}`}>
            {displayScore}
          </p>
          <p className={`text-[9.5px] font-geist leading-tight ${riskScoreClass(displayScore)}`}>
            {getRiskLabel(displayScore)}
          </p>
        </button>
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
        {onReviewDuplicate && (
          <button
            onClick={onReviewDuplicate}
            className="h-8 px-3 rounded-lg border border-icm-amber bg-icm-amber-soft text-[11.5px] font-geist font-semibold text-icm-amber hover:bg-icm-amber/20 flex items-center gap-1.5 transition-colors"
          >
            <AlertTriangle className="w-3 h-3" /> Review →
          </button>
        )}
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
