import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Sparkles, Plus, Trash2, Eye, Printer, ClipboardList, Loader2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { useMonitoringForms } from "@/hooks/useFirestore";
import { useAuth } from "@/contexts/AuthContext";
import { AuthorCell } from "@/components/icm/AuthorCell";
import { type FormStatus, type ReviewType } from "@/data/monitoringForms";

const PersonMonitoringForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading: individualLoading } = useIndividual(id);
  const { data: allForms, loading: formsLoading } = useMonitoringForms(id);
  const { userProfile } = useAuth();



  const [filterType, setFilterType] = useState<"All" | ReviewType>("All");
  const [filterStatus, setFilterStatus] = useState<"All" | FormStatus>("All");
  const [filterActive, setFilterActive] = useState<"All" | "Active" | "Inactive">("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => {
    return allForms.filter(f => {
      if (filterType !== "All" && f.type !== filterType) return false;
      if (filterStatus !== "All" && f.status !== filterStatus) return false;
      if (filterActive !== "All" && f.active !== filterActive) return false;
      return true;
    });
  }, [allForms, filterType, filterStatus, filterActive]);

  const loading = individualLoading || formsLoading;

  if (loading) {
    return (
      <ICMShell title="Monitoring Form" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return (
      <ICMShell title="Monitoring Form" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p>
      </ICMShell>
    );
  }

  const openForm = (formId: string) => navigate(`/people/${id}/monitoring-form/${formId}`);
  const newForm = () => navigate(`/people/${id}/monitoring-form/new`);

  // Empty state
  if (allForms.length === 0) {
    return (
      <ICMShell title="Monitoring Form" showAIPanel={false}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-icm-bg border border-icm-border flex items-center justify-center mb-4">
            <ClipboardList className="w-7 h-7 text-icm-text-faint" />
          </div>
          <h2 className="font-manrope font-extrabold text-[20px] text-icm-text mb-1">No monitoring forms yet</h2>
          <p className="text-[13px] text-icm-text-dim max-w-md mb-6">
            Start {individual.first_name}'s first review or let AI pre-fill one based on existing records.
          </p>
          <div className="flex gap-2">
            <button onClick={newForm} className="h-10 px-4 rounded-xl border border-icm-border text-[13px] font-medium text-icm-text hover:bg-icm-bg">
              + Start blank review
            </button>
            <button onClick={newForm} className="h-10 px-4 rounded-xl bg-icm-text text-icm-panel text-[13px] font-medium hover:opacity-90 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Pre-fill with AI
            </button>
          </div>
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="Monitoring Form" showAIPanel={false}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <button onClick={() => navigate(`/people/${individual.id}/echart`)} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {individual.last_name}, {individual.first_name} · Monitoring Form
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

        {/* Title + Add */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Monitoring Form
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              Structured compliance review · configurable per organization
            </p>
          </div>
          <button onClick={newForm} className="h-9 px-3 rounded-xl bg-teal-600 text-white text-[12px] font-geist font-medium hover:bg-teal-700 inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Review
          </button>
        </div>

        {/* AI ribbon */}
        <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-[12.5px] font-geist text-icm-text leading-snug">
              <span className="font-semibold">Last monitoring form completed 3 months ago.</span>{" "}
              <span className="text-icm-text-dim">
                Next quarterly review is due in 7 days. I pre-filled this form based on recent contact notes and visit summaries.
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={newForm} className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline">
              Review pre-filled form →
            </button>
            <button className="text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">Dismiss</button>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex flex-wrap items-center gap-2">
          <FilterSelect label="Type" value={filterType} onChange={(v) => setFilterType(v as any)} options={["All", "Monthly", "Quarterly", "Annually"]} />
          <FilterSelect label="Status" value={filterStatus} onChange={(v) => setFilterStatus(v as any)} options={["All", "Draft", "In Progress", "Submitted"]} />
          <FilterSelect label="Active" value={filterActive} onChange={(v) => setFilterActive(v as any)} options={["All", "Active", "Inactive"]} />
          <div className="flex items-center gap-1.5 ml-auto max-w-full overflow-hidden">
            <span className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint shrink-0">From</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] text-icm-text min-w-0 w-full max-w-[130px]" />
            <span className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint shrink-0">To</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] text-icm-text min-w-0 w-full max-w-[130px]" />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] font-geist">
              <thead className="bg-icm-bg/60">
                <tr>
                  {["Type of Review", "Due Date", "Status", "Active/Inactive", "Updated By", "Updated On", ""].map((c, i) => (
                    <th key={i} className="text-left px-4 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-icm-border">
                {filtered.map((f) => (
                  <tr key={f.id} onClick={() => openForm(f.id)} className="hover:bg-icm-bg/40 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-icm-text">{f.type || "Monthly"}</span>
                    </td>
                    <td className="px-4 py-3"><DateCell value={f.due_date || f.dueDate || f.submitted_date} /></td>
                    <td className="px-4 py-3"><StatusPill status={f.status} /></td>
                    <td className="px-4 py-3 text-icm-text-dim">{f.active || "Active"}</td>
                    <td className="px-4 py-3 text-icm-text-dim">
                      <AuthorCell name={f.updated_by || f.updatedBy || f.author_name || userProfile?.displayName || ""} />
                    </td>
                    <td className="px-4 py-3 font-mono text-icm-text-dim">{f.updated_on || f.updatedOn || new Date(f.created_at?.seconds * 1000 || Date.now()).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openForm(f.id)} className="p-1.5 rounded hover:bg-icm-bg text-icm-text-dim" title="View"><Eye className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 rounded hover:bg-icm-bg text-icm-text-dim" title="Print"><Printer className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 rounded hover:bg-icm-bg text-icm-text-faint hover:text-icm-red" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-icm-text-faint text-[12px]">No records match these filters.</td></tr>
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

function DateCell({ value }: { value?: string }) {
  if (!value) return <span className="text-icm-text-faint">—</span>;
  return <span className="font-mono text-icm-text">{value}</span>;
}

function StatusPill({ status }: { status: FormStatus }) {
  if (!status) return <span className="text-icm-text-faint text-[11px]">—</span>;
  const tone =
    status === "Submitted" ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
    : status === "In Progress" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
    : "bg-icm-accent-soft text-icm-accent ring-icm-accent/20";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 ${tone}`}>
      {status}
    </span>
  );
}

export default PersonMonitoringForm;
