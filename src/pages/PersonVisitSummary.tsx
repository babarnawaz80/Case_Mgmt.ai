import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Sparkles, Plus, Trash2, Eye, Printer, CalendarCheck, Smartphone, Loader2 } from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { useVisitSummaries } from "@/hooks/useFirestore";

const PersonVisitSummary = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading: individualLoading } = useIndividual(id);
  const { data: allVisits, loading: visitsLoading } = useVisitSummaries(id);

  const [updatedByFilter, setUpdatedByFilter] = useState<"All" | "Me">("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => {
    return allVisits.filter(v => {
      if (updatedByFilter === "Me" && v.updated_by !== "Babar Nawaz CM") return false;
      return true;
    });
  }, [allVisits, updatedByFilter]);

  const loading = individualLoading || visitsLoading;

  if (loading) {
    return (
      <ICMShell title="Visit Summary" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return (
      <ICMShell title="Visit Summary" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p>
      </ICMShell>
    );
  }

  const openVisit = (visitId: string) => navigate(`/people/${id}/visit-summary/${visitId}`);
  const newVisit = () => navigate(`/people/${id}/visit-summary/new`);

  if (allVisits.length === 0) {
    return (
      <ICMShell title="Visit Summary" showAIPanel={false}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-icm-bg border border-icm-border flex items-center justify-center mb-4">
            <CalendarCheck className="w-7 h-7 text-icm-text-faint" />
          </div>
          <h2 className="font-manrope font-extrabold text-[20px] text-icm-text mb-1">No visit summaries yet</h2>
          <p className="text-[13px] text-icm-text-dim max-w-md mb-6">
            Document {individual.first_name}'s first visit or let AI draft one from a recent ambient session.
          </p>
          <div className="flex gap-2">
            <button onClick={newVisit} className="h-10 px-4 rounded-xl border border-icm-border text-[13px] font-medium text-icm-text hover:bg-icm-bg">
              + Start blank summary
            </button>
            <button onClick={newVisit} className="h-10 px-4 rounded-xl bg-teal-600 text-white text-[13px] font-medium hover:bg-teal-700 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Draft from ambient session
            </button>
          </div>
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="Visit Summary" showAIPanel={false}>
      <div className="space-y-5">
        <button onClick={() => navigate(`/people/${individual.id}/echart`)} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {individual.last_name}, {individual.first_name} · Visit Summary
        </button>

        {/* Person header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3 flex-wrap">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono text-[14px] font-bold ${riskAvatarClass(individual.risk_score)}`}>
            {initials(individual)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-manrope font-extrabold text-[16px] text-icm-text tracking-tight">
              {individual.last_name}, {individual.first_name}
              {individual.preferred_name && <span className="font-medium text-icm-text-dim"> ({individual.preferred_name})</span>}
            </h2>
            <p className="text-[11.5px] font-mono text-icm-text-dim">
              {individual.gender ?? "—"} · {individual.county ?? "—"} · ID #{individual.id.slice(0, 8)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
            <span className="w-1.5 h-1.5 rounded-full bg-icm-green" />
            {individual.enrollment_status}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Visit Summary
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              In-person visit documentation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/people/${individual.id}/visit-summary/schedule`)} className="h-9 px-3 rounded-xl border border-icm-border bg-white text-[12px] font-geist font-medium hover:bg-icm-bg inline-flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5" /> Schedule visit
            </button>
            <button onClick={() => navigate(`/people/${individual.id}/visit-summary/document`)} className="h-9 px-3 rounded-xl border border-icm-border bg-white text-[12px] font-geist font-medium hover:bg-icm-bg inline-flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" /> Document visit (mobile)
            </button>
            <button onClick={newVisit} className="h-9 px-3 rounded-xl bg-teal-600 text-white text-[12px] font-geist font-medium hover:bg-teal-700 inline-flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Visit Summary
            </button>
          </div>
        </div>

        {/* AI ribbon */}
        <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-[12.5px] font-geist text-icm-text leading-snug">
              <span className="font-semibold">Last visit was on {individual.last_visit_date ?? "N/A"}.</span>{" "}
              <span className="text-icm-text-dim">
                Based on {individual.first_name}'s quarterly visit requirement, next visit is due soon. Let AI draft a pre-filled form.
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={newVisit} className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline">
              Review pre-filled form →
            </button>
            <button className="text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">Dismiss</button>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex flex-wrap items-center gap-2">
          <FilterSelect label="Updated By" value={updatedByFilter} onChange={(v) => setUpdatedByFilter(v as "All" | "Me")} options={["All", "Me"]} />
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">From</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] text-icm-text" />
            <span className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">To</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] text-icm-text" />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] font-geist">
              <thead className="bg-icm-bg/60">
                <tr>
                  {["Visit Date", "Person Supported", "Purpose of Support", "Updated By", "Updated On", ""].map((c, i) => (
                    <th key={i} className="text-left px-4 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-icm-border">
                {filtered.map((v) => (
                  <tr key={v.id} onClick={() => openVisit(v.id)} className="hover:bg-icm-bg/40 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-icm-text">{v.visit_date || v.visitDate}</td>
                    <td className="px-4 py-3">{individual.last_name}, {individual.first_name}</td>
                    <td className="px-4 py-3 text-icm-text-dim">{v.purpose_of_support || v.purposeOfSupport || <span className="text-icm-text-faint">—</span>}</td>
                    <td className="px-4 py-3 text-icm-text-dim">{v.updated_by || v.updatedBy || v.author_name || "Kathy Martinez"}</td>
                    <td className="px-4 py-3 font-mono text-icm-text-dim">{v.updated_on || v.updatedOn || new Date(v.created_at?.seconds * 1000 || Date.now()).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openVisit(v.id)} className="p-1.5 rounded hover:bg-icm-bg text-icm-accent" title="View"><Eye className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 rounded hover:bg-icm-bg text-icm-text-dim" title="Print"><Printer className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 rounded hover:bg-icm-bg text-icm-text-faint hover:text-icm-red" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-icm-text-faint text-[12px]">No records match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ICMShell>
  );
};

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] text-icm-text">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

export default PersonVisitSummary;
