import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import {
  Search,
  Plus,
  Download,
  Sparkles,
  ChevronDown,
  FileText,
  ClipboardList,
  MapPin,
} from "lucide-react";
import {
  people,
  flagStyles,
  riskAvatarClass,
  riskScoreClass,
  initials,
  type Person,
} from "@/data/people";

type StatusFilter = "All" | "Active" | "Pending" | "Discharged";
type RiskFilter = "All" | "High" | "Review" | "Standard";

const PeopleSupported = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [risk, setRisk] = useState<RiskFilter>("All");
  const [county, setCounty] = useState("All");

  const counties = useMemo(
    () => ["All", ...Array.from(new Set(people.map((p) => p.county)))],
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
      const matchQ =
        !q ||
        `${p.firstName} ${p.lastName} ${p.nickname ?? ""}`.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.county.toLowerCase().includes(q);
      const matchStatus = status === "All" || p.status === status;
      const matchCounty = county === "All" || p.county === county;
      const matchRisk =
        risk === "All" ||
        (risk === "High" && (p.riskScore ?? 0) >= 60) ||
        (risk === "Review" && (p.riskScore ?? 0) >= 35 && (p.riskScore ?? 0) < 60) ||
        (risk === "Standard" && (p.riskScore ?? 0) < 35);
      return matchQ && matchStatus && matchCounty && matchRisk;
    });
  }, [query, status, risk, county]);

  const flagged = filtered.filter((p) => p.aiFlag).length;

  return (
    <ICMShell title="People Supported" showAIPanel={false}>
      <div className="space-y-5">
        {/* Title row */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              People Supported
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              {people.length} individuals · {flagged} flagged by AI today
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("Export CSV (mock)")}
              className="h-9 px-3.5 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={() => alert("Add Person (mock)")}
              className="h-9 px-3.5 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-medium flex items-center gap-1.5 hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" /> Add Person
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
              placeholder="Search by name, ID, or county…"
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-icm-panel border border-icm-border text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40 transition-colors"
            />
          </div>
          <FilterSelect
            value={status}
            onChange={(v) => setStatus(v as StatusFilter)}
            options={["All", "Active", "Pending", "Discharged"]}
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
              <span className="font-semibold">AI reviewed your caseload.</span>{" "}
              <span className="text-icm-text-dim">
                {flagged} {flagged === 1 ? "individual needs" : "individuals need"} attention today.
              </span>
            </p>
          </div>
          <button className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline shrink-0">
            View all flags →
          </button>
        </div>

        {/* People rows */}
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
              <p className="text-[13px] text-icm-text-dim font-geist">No individuals match your filters.</p>
            </div>
          )}
        </div>
      </div>
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

function PersonRow({ person, onOpen, onOpenFaceSheet, onOpenProfile }: { person: Person; onOpen: () => void; onOpenFaceSheet: () => void; onOpenProfile: () => void }) {
  const flag = person.aiFlag;
  const flagStyle = flag ? flagStyles[flag.tone] : null;

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-4 hover:border-icm-border-strong hover:shadow-elevated transition-all">
      {/* Avatar */}
      <div
        className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 font-mono text-[13px] font-bold ${riskAvatarClass(
          person.riskScore,
        )}`}
      >
        {initials(person)}
      </div>

      {/* Identity */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-tight font-semibold text-[14px] text-icm-text truncate">
            {person.lastName}, {person.firstName}
            {person.nickname && (
              <span className="font-normal text-icm-text-dim"> ({person.nickname})</span>
            )}
          </h3>
          {flag && flagStyle && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${flagStyle.bg} ${flagStyle.text} ${flagStyle.ring}`}
              title={flag.detail}
            >
              <Sparkles className="w-2.5 h-2.5" />
              {flag.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11.5px] text-icm-text-dim font-geist mt-1 flex-wrap">
          <span className="font-mono">
            {person.gender} · {person.age}y · {person.dob}
          </span>
          <span className="text-icm-text-faint">·</span>
          <span>Adm {person.admittedOn}</span>
          <span className="text-icm-text-faint">·</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {person.county}
          </span>
        </div>
      </div>

      {/* Service contact */}
      <div className="hidden lg:block min-w-[150px] text-right">
        <p className="text-[10px] uppercase tracking-wide text-icm-text-faint font-geist">
          Service Contact
        </p>
        <p className="text-[12px] text-icm-text font-geist mt-0.5 truncate">
          {person.serviceContact ?? "—"}
        </p>
      </div>

      {/* Risk */}
      {person.riskScore !== undefined && (
        <div className="hidden md:block text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wide text-icm-text-faint font-geist">
            Risk
          </p>
          <p className={`font-mono font-bold text-[16px] leading-tight ${riskScoreClass(person.riskScore)}`}>
            {person.riskScore}
          </p>
        </div>
      )}

      {/* Status */}
      <div className="hidden md:block shrink-0">
        <StatusPill status={person.status} />
      </div>

      {/* Updated */}
      <div className="hidden xl:block text-right shrink-0">
        <p className="text-[10px] uppercase tracking-wide text-icm-text-faint font-geist">
          Updated
        </p>
        <p className="text-[11px] font-mono text-icm-text-dim mt-0.5">{person.updatedOn}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onOpen}
          className="h-8 px-3 rounded-lg bg-icm-accent text-white text-[11.5px] font-geist font-semibold flex items-center gap-1.5 hover:opacity-90"
        >
          <FileText className="w-3 h-3" /> eChart
        </button>
        <button
          onClick={() => navigate(`/people/${person.id}/facesheet`)}
          className="h-8 px-3 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1.5 transition-colors"
        >
          <ClipboardList className="w-3 h-3" /> Face Sheet
        </button>
        <button
          onClick={() => navigate(`/people/${person.id}/profile`)}
          className="h-8 w-8 rounded-lg border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center justify-center transition-colors"
          title="Open Profile"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Person["status"] }) {
  const cls =
    status === "Active"
      ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
      : status === "Pending"
      ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
      : "bg-icm-bg text-icm-text-dim ring-icm-border";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${cls}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export default PeopleSupported;
