/**
 * SchedulePage
 * ─────────────────────────────────────────────────────────────────────────────
 * Full scheduling dashboard — accessible via /schedule
 *
 * Features:
 *   • Stats cards (today, this week, total scheduled)
 *   • Calendar with Day / Week / Month views + date navigation
 *   • Filter bar: Individual search, Visit Type, County, Assigned Staff, Status
 *   • Quick-access "Schedule Visit" button
 */

import { useMemo, useState } from "react";
import {
  CalendarDays, CalendarRange, CalendarIcon,
  Search, Filter, X, CheckCircle2, Clock, CalendarCheck,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { TodaySchedule } from "@/components/dashboard/TodaySchedule";
import { useScheduledVisits, VISIT_TYPES } from "@/hooks/useScheduledVisits";
import { useIndividuals } from "@/hooks/useIndividuals";

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, tone,
}: {
  label: string; value: string | number; sub: string;
  icon: React.ReactNode; tone: "blue" | "amber" | "emerald" | "violet";
}) {
  const tones = {
    blue:    "from-blue-50 to-blue-100 ring-blue-200/60 text-blue-600",
    amber:   "from-amber-50 to-amber-100 ring-amber-200/60 text-amber-600",
    emerald: "from-emerald-50 to-emerald-100 ring-emerald-200/60 text-emerald-600",
    violet:  "from-violet-50 to-violet-100 ring-violet-200/60 text-violet-600",
  };
  return (
    <div className={`rounded-2xl ring-1 bg-gradient-to-br ${tones[tone]} p-4 flex items-center gap-4`}>
      <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-geist font-bold uppercase tracking-widest text-current opacity-70">{label}</p>
        <p className="font-manrope font-extrabold text-[28px] text-icm-text leading-tight">{value}</p>
        <p className="text-[11px] font-geist text-icm-text-dim truncate">{sub}</p>
      </div>
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

interface Filters {
  individual: string;
  visitType: string;
  county: string;
  staff: string;
  status: string;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const SchedulePage = () => {
  const { visits, loading } = useScheduledVisits();
  const { individuals } = useIndividuals();

  const [filters, setFilters] = useState<Filters>({
    individual: "",
    visitType: "",
    county: "",
    staff: "",
    status: "",
  });
  const [showFilters, setShowFilters] = useState(true);

  const setFilter = (k: keyof Filters, v: string) =>
    setFilters((prev) => ({ ...prev, [k]: v }));

  const clearFilters = () =>
    setFilters({ individual:"", visitType:"", county:"", staff:"", status:"" });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // ── Derived options ───────────────────────────────────────────────────────

  const countyOptions = useMemo(() => {
    const set = new Set<string>();
    individuals.forEach((p) => { if (p.county) set.add(p.county); });
    return [...set].sort();
  }, [individuals]);

  const staffOptions = useMemo(() => {
    const map = new Map<string, string>();
    visits.forEach((v) => {
      if (v.assigned_to && v.assigned_to_name) map.set(v.assigned_to, v.assigned_to_name);
    });
    return [...map.entries()].map(([uid, name]) => ({ uid, name })).sort((a,b)=>a.name.localeCompare(b.name));
  }, [visits]);

  // ── County map for individual→county lookup ───────────────────────────────
  const indCountyMap = useMemo(() => {
    const m: Record<string, string> = {};
    individuals.forEach((p) => { if (p.county) m[p.id] = p.county; });
    return m;
  }, [individuals]);

  // ── Apply filters ─────────────────────────────────────────────────────────
  const filteredVisits = useMemo(() => {
    let result = visits;

    if (filters.individual) {
      const term = filters.individual.toLowerCase();
      result = result.filter((v) =>
        v.individual_name.toLowerCase().includes(term) ||
        v.individual_id.toLowerCase().includes(term)
      );
    }
    if (filters.visitType) {
      result = result.filter((v) => v.visit_type === filters.visitType);
    }
    if (filters.county) {
      result = result.filter((v) => {
        const county = indCountyMap[v.individual_id] ?? "";
        return county === filters.county;
      });
    }
    if (filters.staff) {
      result = result.filter((v) => v.assigned_to === filters.staff);
    }
    if (filters.status) {
      result = result.filter((v) => v.status === filters.status);
    }

    return result;
  }, [visits, filters, indCountyMap]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const todayStr  = new Date().toISOString().slice(0, 10);
  const endOfWeek = (() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? 0 : 7 - day));
    return d.toISOString().slice(0, 10);
  })();

  const statsBase = filteredVisits.filter((v) => v.status !== "cancelled");
  const todayCount     = statsBase.filter((v) => v.visit_date === todayStr).length;
  const weekCount      = statsBase.filter((v) => v.visit_date >= todayStr && v.visit_date <= endOfWeek).length;
  const scheduledCount = statsBase.filter((v) => v.status === "scheduled").length;
  const completedCount = statsBase.filter((v) => v.status === "completed").length;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ICMShell title="Schedule" showAIPanel={false}>
      <div className="space-y-5">

        {/* ── Page header ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-manrope text-[22px] font-extrabold text-icm-text tracking-tight leading-tight">
              Visit Schedule
            </h1>
            <p className="text-[12px] text-icm-text-dim font-geist mt-0.5">
              {statsBase.length} visit{statsBase.length!==1?"s":""} total
              {activeFilterCount > 0 && <span className="ml-1 text-icm-accent font-semibold">({activeFilterCount} filter{activeFilterCount!==1?"s":""} active)</span>}
            </p>
          </div>
        </div>

        {/* ── Stats cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Today" value={todayCount} sub="visits scheduled" icon={<CalendarDays className="w-5 h-5 text-blue-500" />} tone="blue" />
          <StatCard label="This Week" value={weekCount} sub="Mon – Sun" icon={<CalendarRange className="w-5 h-5 text-amber-500" />} tone="amber" />
          <StatCard label="Scheduled" value={scheduledCount} sub="pending visits" icon={<Clock className="w-5 h-5 text-violet-500" />} tone="violet" />
          <StatCard label="Completed" value={completedCount} sub="this period" icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} tone="emerald" />
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-icm-text-dim" />
              <span className="text-[12px] font-geist font-semibold text-icm-text">Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-icm-accent text-white text-[9.5px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-[11px] font-geist text-icm-text-dim hover:text-icm-text flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-[11px] font-geist text-icm-accent"
              >
                {showFilters ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {/* Individual search */}
              <div className="relative">
                <Search className="w-3 h-3 text-icm-text-dim absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={filters.individual}
                  onChange={(e) => setFilter("individual", e.target.value)}
                  placeholder="Individual name…"
                  className="w-full h-8 rounded-lg border border-icm-border bg-white pl-7 pr-2 text-[12px] font-geist focus:outline-none focus:ring-2 focus:ring-icm-accent/40"
                />
                {filters.individual && (
                  <button onClick={() => setFilter("individual","")} className="absolute right-2 top-1/2 -translate-y-1/2 text-icm-text-faint hover:text-icm-text">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Visit type */}
              <select
                value={filters.visitType}
                onChange={(e) => setFilter("visitType", e.target.value)}
                className="h-8 rounded-lg border border-icm-border bg-white px-2.5 text-[12px] font-geist focus:outline-none focus:ring-2 focus:ring-icm-accent/40"
              >
                <option value="">All Visit Types</option>
                {VISIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>

              {/* County */}
              <select
                value={filters.county}
                onChange={(e) => setFilter("county", e.target.value)}
                className="h-8 rounded-lg border border-icm-border bg-white px-2.5 text-[12px] font-geist focus:outline-none focus:ring-2 focus:ring-icm-accent/40"
              >
                <option value="">All Counties</option>
                {countyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Assigned staff */}
              <select
                value={filters.staff}
                onChange={(e) => setFilter("staff", e.target.value)}
                className="h-8 rounded-lg border border-icm-border bg-white px-2.5 text-[12px] font-geist focus:outline-none focus:ring-2 focus:ring-icm-accent/40"
              >
                <option value="">All Staff</option>
                {staffOptions.map((u) => <option key={u.uid} value={u.uid}>{u.name}</option>)}
              </select>

              {/* Status */}
              <select
                value={filters.status}
                onChange={(e) => setFilter("status", e.target.value)}
                className="h-8 rounded-lg border border-icm-border bg-white px-2.5 text-[12px] font-geist focus:outline-none focus:ring-2 focus:ring-icm-accent/40"
              >
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-icm-border">
              {filters.individual && (
                <FilterChip label={`Individual: "${filters.individual}"`} onRemove={() => setFilter("individual","")} />
              )}
              {filters.visitType && (
                <FilterChip label={`Type: ${filters.visitType}`} onRemove={() => setFilter("visitType","")} />
              )}
              {filters.county && (
                <FilterChip label={`County: ${filters.county}`} onRemove={() => setFilter("county","")} />
              )}
              {filters.staff && (
                <FilterChip
                  label={`Staff: ${staffOptions.find(u=>u.uid===filters.staff)?.name ?? filters.staff}`}
                  onRemove={() => setFilter("staff","")}
                />
              )}
              {filters.status && (
                <FilterChip label={`Status: ${filters.status.replace("_"," ")}`} onRemove={() => setFilter("status","")} />
              )}
              <span className="text-[11px] text-icm-text-dim font-geist self-center">
                — {filteredVisits.length} of {visits.length} visit{visits.length!==1?"s":""}
              </span>
            </div>
          )}
        </div>

        {/* ── Calendar ───────────────────────────────────────────────────── */}
        <div className="min-h-[520px]">
          <TodaySchedule
            filteredVisits={filteredVisits}
            externalLoading={loading}
          />
        </div>

      </div>
    </ICMShell>
  );
};

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-icm-accent-soft text-icm-accent text-[11px] font-geist font-medium">
      {label}
      <button onClick={onRemove} className="hover:opacity-70"><X className="w-3 h-3" /></button>
    </span>
  );
}

export default SchedulePage;
