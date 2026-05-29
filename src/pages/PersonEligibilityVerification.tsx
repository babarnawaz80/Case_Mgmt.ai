import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Sparkles, Plus, Trash2, Eye, Printer, ShieldCheck,
  AlertTriangle, CheckCircle2, Loader2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import {
  daysUntil, complianceToneFor,
  type MAStatus, type MAType, type RecordStatus,
} from "@/data/eligibility";
import { useEligibilityVerifications, type EligibilityVerification } from "@/hooks/useFirestore";
import { useAuth } from "@/contexts/AuthContext";
import { AuthorCell } from "@/components/icm/AuthorCell";


const PersonEligibilityVerification = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading } = useIndividual(id);
  const { data: eligibilityRecords, loading: eligibilityLoading } = useEligibilityVerifications(id);
  const { userProfile } = useAuth();



  const records = useMemo(() => eligibilityRecords || [], [eligibilityRecords]);
  const current = useMemo(() => records[0], [records]);

  const [filterType, setFilterType] = useState<"All" | MAType>("All");
  const [filterStatus, setFilterStatus] = useState<"All" | RecordStatus>("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filterType !== "All" && r.maType !== filterType) return false;
      if (filterStatus !== "All" && r.recordStatus !== filterStatus) return false;
      return true;
    });
  }, [records, filterType, filterStatus]);

  if (loading || eligibilityLoading) {
    return (
      <ICMShell title="Eligibility Verification" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return (
      <ICMShell title="Eligibility Verification" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p>
      </ICMShell>
    );
  }

  const openRecord = (recordId: string) => navigate(`/people/${id}/eligibility-verification/${recordId}`);
  const newRecord = () => navigate(`/people/${id}/eligibility-verification/new`);

  if (records.length === 0) {
    return (
      <ICMShell title="Eligibility Verification" showAIPanel={false}>
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { label: "People Supported", to: "/people" },
              { label: `${individual.last_name}, ${individual.first_name}`, to: `/people/${id}/echart` },
              { label: "Eligibility & Benefits" },
            ]}
          />
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-icm-bg border border-icm-border flex items-center justify-center mb-4">
              <ShieldCheck className="w-7 h-7 text-icm-text-faint" />
            </div>
            <h2 className="font-manrope font-extrabold text-[20px] text-icm-text mb-1">No eligibility records yet</h2>
            <p className="text-[13px] text-icm-text-dim max-w-md mb-6">
              Track {individual.first_name}'s Medicaid status to get compliance alerts and renewal reminders.
            </p>
            <div className="flex gap-2">
              <button onClick={newRecord} className="h-10 px-4 rounded-xl border border-icm-border text-[13px] font-medium text-icm-text hover:bg-icm-bg">
                + Add verification
              </button>
              <button onClick={newRecord} className="h-10 px-4 rounded-xl bg-icm-text text-icm-panel text-[13px] font-medium hover:opacity-90 inline-flex items-center">
                Import from profile
              </button>
            </div>
          </div>
        </div>
      </ICMShell>
    );
  }


  const days = daysUntil(current?.redeterminationDate);
  const tone = complianceToneFor(days);
  const overdue = days !== undefined && days < 0;

  return (
    <ICMShell title="Eligibility Verification" showAIPanel={false}>
      <div className="space-y-5">
        <button onClick={() => navigate(`/people/${individual.id}/echart`)} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {individual.last_name}, {individual.first_name} · Eligibility Verification
        </button>
        <Breadcrumbs
          items={[
            { label: "People Supported", to: "/people" },
            { label: `${individual.last_name}, ${individual.first_name}`, to: `/people/${id}/echart` },
            { label: "Eligibility & Benefits" },
          ]}
        />

        {/* Person header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3 flex-wrap">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono text-[14px] font-bold ${riskAvatarClass(individual.risk_score)}`}>
            {initials(individual)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-manrope font-extrabold text-[16px] text-icm-text tracking-tight">
              {individual.last_name}, {individual.first_name}
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
              Eligibility Verification
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              Medicaid and funding status tracking
            </p>
          </div>
          <button onClick={newRecord} className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-medium hover:opacity-90 inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Verification
          </button>
        </div>

        {/* Status banner */}
        {current && <StatusBanner status={current.maStatus} maNumber={current.maNumber} verifiedDate={current.verificationDate} redetermDate={current.redeterminationDate} />}

        {/* AI ribbon */}
        {overdue ? (
          <div className="rounded-xl border border-icm-red/20 bg-icm-red-soft px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-5 h-5 text-icm-red shrink-0" />
              <p className="text-[12.5px] font-geist text-icm-text leading-snug">
                <span className="font-semibold">{individual.first_name}'s Medicaid renewal was due on {current?.redeterminationDate}.</span>{" "}
                <span className="text-icm-text-dim">This is {Math.abs(days!)} days overdue. Immediate action required.</span>
              </p>
            </div>
            <button className="text-[11.5px] font-geist font-semibold text-icm-red hover:underline shrink-0">Start renewal now →</button>
          </div>
        ) : (
          <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-[12.5px] font-geist text-icm-text leading-snug">
                <span className="font-semibold">Redetermination tracking active.</span>{" "}
                <span className="text-icm-text-dim">I'll create a task in Case Management 30 days before the next due date.</span>
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline">View task →</button>
              <button className="text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">Dismiss</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex flex-wrap items-center gap-2">
          <FilterSelect label="MA Type" value={filterType} onChange={(v) => setFilterType(v as "All" | MAType)} options={["All", "Waiver Related", "SSI Related", "Medicare/Medicaid Dual", "Spend-Down", "Other"]} />
          <FilterSelect label="Status" value={filterStatus} onChange={(v) => setFilterStatus(v as "All" | RecordStatus)} options={["All", "Active", "Pending", "Inactive", "Draft", "Submitted"]} />
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
                  {["ID", "Verification Date", "MA Number", "MA Type", "MA Status", "Record Status", "Updated By", "Updated On", ""].map((c, i) => (
                    <th key={i} className="text-left px-4 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-icm-border">
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => openRecord(r.id)} className="hover:bg-icm-bg/40 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-icm-text">{r.id}</td>
                    <td className="px-4 py-3 font-mono text-icm-text">{r.verificationDate ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-icm-text-dim">{r.maNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-icm-text-dim">{r.maType ?? "—"}</td>
                    <td className="px-4 py-3"><StatusPill status={r.maStatus} /></td>
                    <td className="px-4 py-3"><RecordStatusPill status={r.recordStatus ?? "Draft"} /></td>
                    <td className="px-4 py-3 text-icm-text-dim">
                      <AuthorCell name={r.updatedBy || "Kathy Martinez"} />
                    </td>
                    <td className="px-4 py-3 font-mono text-icm-text-dim">{r.updatedOn}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openRecord(r.id)} className="p-1.5 rounded hover:bg-icm-bg text-icm-accent" title="View"><Eye className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 rounded hover:bg-icm-bg text-icm-text-dim" title="Print"><Printer className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 rounded hover:bg-icm-bg text-icm-text-faint hover:text-icm-red" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-icm-text-faint text-[12px]">No records match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ICMShell>
  );
};

function StatusBanner({ status, maNumber, verifiedDate, redetermDate }: { status: MAStatus; maNumber?: string; verifiedDate?: string; redetermDate?: string }) {
  const days = daysUntil(redetermDate);
  const overdue = days !== undefined && days < 0;
  const dayLabel =
    days === undefined ? "Not set" :
    overdue ? `${Math.abs(days)} days overdue` :
    `${days} days until renewal`;

  const tone =
    status.startsWith("MA Eligible — Active") && !overdue ? "green" :
    status.startsWith("MA Eligible") || (status === "MA Eligible — Active" && overdue) ? (overdue ? "red" : "amber") :
    status.startsWith("MA Ineligible") ? "red" :
    "neutral";

  const cls =
    tone === "green" ? "bg-icm-green-soft border-icm-green/20 text-icm-green" :
    tone === "amber" ? "bg-icm-amber-soft border-icm-amber/20 text-icm-amber" :
    tone === "red" ? "bg-icm-red-soft border-icm-red/20 text-icm-red" :
    "bg-icm-bg border-icm-border text-icm-text-dim";

  const dayCls =
    overdue ? "text-icm-red animate-pulse" :
    days !== undefined && days < 30 ? "text-icm-red" :
    days !== undefined && days < 60 ? "text-icm-amber" :
    "text-icm-green";

  return (
    <div className={`rounded-xl border px-5 py-4 ${cls}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-manrope text-[18px] font-extrabold tracking-tight">
            {overdue && status === "MA Eligible — Active" ? "MA Eligible — Renewal Overdue" : status}
          </p>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3 text-[11.5px] font-geist">
            <Meta label="MA Number" value={maNumber ?? "—"} mono />
            <Meta label="Last Verified" value={verifiedDate ?? "—"} mono />
            <Meta label="Redetermination" value={redetermDate ?? "Not set"} mono />
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">Renewal Status</p>
          <p className={`mt-0.5 font-mono font-bold text-[16px] ${dayCls}`}>{dayLabel}</p>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[9.5px] uppercase tracking-wide font-semibold text-icm-text-faint">{label}</p>
      <p className={`text-icm-text ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

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

function StatusPill({ status }: { status: MAStatus }) {
  const tone =
    status.startsWith("MA Eligible — Active") ? "bg-icm-green-soft text-icm-green ring-icm-green/20" :
    status.startsWith("MA Eligible") ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20" :
    status.startsWith("MA Ineligible") ? "bg-icm-red-soft text-icm-red ring-icm-red/20" :
    "bg-icm-bg text-icm-text-dim ring-icm-border";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 ${tone}`}>
      {status}
    </span>
  );
}

function RecordStatusPill({ status }: { status: RecordStatus }) {
  const tone =
    status === "Submitted" ? "bg-icm-green-soft text-icm-green ring-icm-green/20" :
    status === "Active" ? "bg-blue-50 text-blue-600 ring-blue-200" :
    status === "Draft" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20" :
    status === "Pending" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20" :
    "bg-icm-bg text-icm-text-dim ring-icm-border";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 ${tone}`}>
      {status}
    </span>
  );
}

export default PersonEligibilityVerification;
