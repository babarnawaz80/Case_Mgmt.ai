import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Sparkles, Plus, Trash2, Eye, Printer, Pencil,
  AlertTriangle, BarChart3, ListIcon,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { PersonAIPanel } from "@/components/icm/PersonAIPanel";
import { getPerson, riskAvatarClass, initials } from "@/data/people";
import {
  getProgressNotesForPerson, getUnsignedNotesForPerson,
  trendsMonths, activityBreakdown, ACTIVITY_TYPES,
  type ProgressNote, type ProgressStatus,
} from "@/data/progressNotes";
import type { AISuggestion } from "@/data/people";

const progressSuggestions: AISuggestion[] = [
  { tone: "urgent", label: "Urgent", body: "2 progress notes are unsigned. Unsigned notes cannot be billed. Estimated 2 minutes to review and sign both.", cta: "Review now" },
  { tone: "insight", label: "Insight", body: "Goal 2 (Employment Exploration) hasn't had a progress note in 60 days. I detected relevant content in the 04/27 session.", cta: "Create note from session" },
  { tone: "insight", label: "Insight", body: "Joseph has 18 of 40 authorized units remaining this month. At current pace, units will run out before month end.", cta: "View utilization" },
  { tone: "good", label: "Good news", body: "Goal 1 (Community Integration) has had consistent progress documentation for 4 consecutive months.", cta: "View trend" },
];

type Tab = "list" | "trends";

const PersonProgressNote = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const person = getPerson(id ?? "");
  const allNotes = getProgressNotesForPerson(id ?? "");
  const unsigned = getUnsignedNotesForPerson(id ?? "");

  const [tab, setTab] = useState<Tab>("list");
  const [activityFilter, setActivityFilter] = useState<"All" | string>("All");
  const [billableFilter, setBillableFilter] = useState<"All" | "Billable" | "Non-Billable">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | ProgressStatus | "Unsigned">("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filtersTouched, setFiltersTouched] = useState(false);

  const filtered = useMemo(() => {
    return allNotes.filter(n => {
      if (activityFilter !== "All" && n.activityType !== activityFilter) return false;
      if (billableFilter === "Billable" && !n.isBillable) return false;
      if (billableFilter === "Non-Billable" && n.isBillable) return false;
      if (statusFilter === "Unsigned" && n.status !== "Draft" && n.status !== "Pending Signature") return false;
      if (statusFilter !== "All" && statusFilter !== "Unsigned" && n.status !== statusFilter) return false;
      return true;
    });
  }, [allNotes, activityFilter, billableFilter, statusFilter]);

  if (!person) {
    return (
      <ICMShell title="Progress Note" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p>
      </ICMShell>
    );
  }

  const openNote = (noteId: string) => navigate(`/people/${id}/progress-note/${noteId}`);
  const newNote = () => navigate(`/people/${id}/progress-note/new`);
  const showFilterPrompt = !filtersTouched && tab === "list";
  const touchFilters = () => setFiltersTouched(true);

  if (allNotes.length === 0) {
    return (
      <ICMShell title="Progress Note" rightPanel={<PersonAIPanel person={person} suggestions={progressSuggestions} intro={`${progressSuggestions.length} suggestions for ${person.firstName}.`} />}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-icm-bg border border-icm-border flex items-center justify-center mb-4">
            <Pencil className="w-7 h-7 text-icm-text-faint" />
          </div>
          <h2 className="font-manrope font-extrabold text-[20px] text-icm-text mb-1">No progress notes yet</h2>
          <p className="text-[13px] text-icm-text-dim max-w-md mb-6">
            Document {person.firstName}'s first goal progress or let AI draft one from a recent session.
          </p>
          <div className="flex gap-2">
            <button onClick={newNote} className="h-10 px-4 rounded-xl border border-icm-border text-[13px] font-medium text-icm-text hover:bg-icm-bg">
              + Start blank note
            </button>
            <button onClick={newNote} className="h-10 px-4 rounded-xl bg-icm-text text-icm-panel text-[13px] font-medium hover:opacity-90 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Draft from ambient session
            </button>
          </div>
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="Progress Note" rightPanel={<PersonAIPanel person={person} suggestions={progressSuggestions} intro={`${progressSuggestions.length} suggestions for ${person.firstName}.`} />}>
      <div className="space-y-5">
        <button onClick={() => navigate(`/people/${person.id}/echart`)} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {person.lastName}, {person.firstName} · Progress Note
        </button>

        {/* Person header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3 flex-wrap">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono text-[14px] font-bold ${riskAvatarClass(person.riskScore)}`}>
            {initials(person)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-manrope font-extrabold text-[16px] text-icm-text tracking-tight">
              {person.lastName}, {person.firstName}
            </h2>
            <p className="text-[11.5px] font-mono text-icm-text-dim">
              {person.gender} · {person.age}y · {person.county} · ID #{person.id}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
            <span className="w-1.5 h-1.5 rounded-full bg-icm-green" />
            {person.status}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Progress Note
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              Goal progress and outcome documentation
            </p>
          </div>
          <button onClick={newNote} className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-medium hover:opacity-90 inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Note
          </button>
        </div>

        {/* AI ribbon */}
        <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-[12.5px] font-geist text-icm-text leading-snug">
              <span className="font-semibold">Goal 2 (Employment Exploration) has had no progress documented in 60 days.</span>{" "}
              <span className="text-icm-text-dim">
                I detected relevant content in the 04/27/2026 ambient session that should be captured here.
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={newNote} className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline">
              Review suggested note →
            </button>
            <button className="text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">Dismiss</button>
          </div>
        </div>

        {/* Unsigned alert */}
        {unsigned.length > 0 && (
          <div className="rounded-xl border border-icm-amber/20 bg-icm-amber-soft px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-icm-amber shrink-0" />
              <p className="text-[12.5px] font-geist text-icm-text leading-snug">
                <span className="font-semibold">{unsigned.length} notes are pending your signature.</span>{" "}
                <span className="text-icm-text-dim">Unsigned notes cannot be submitted for billing.</span>
              </p>
            </div>
            <button onClick={() => { setStatusFilter("Unsigned"); touchFilters(); }} className="text-[11.5px] font-geist font-semibold text-icm-amber hover:underline shrink-0">
              Review unsigned notes →
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-icm-border">
          <TabButton active={tab === "list"} onClick={() => setTab("list")} icon={<ListIcon className="w-3.5 h-3.5" />}>
            All Notes
          </TabButton>
          <TabButton active={tab === "trends"} onClick={() => setTab("trends")} icon={<BarChart3 className="w-3.5 h-3.5" />}>
            Trends
          </TabButton>
        </div>

        {tab === "list" ? (
          <>
            {/* Filters */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex flex-wrap items-center gap-2">
              <FilterSelect label="Activity" value={activityFilter} onChange={(v) => { setActivityFilter(v); touchFilters(); }} options={["All", ...ACTIVITY_TYPES]} />
              <FilterSelect label="Billable" value={billableFilter} onChange={(v) => { setBillableFilter(v as "All" | "Billable" | "Non-Billable"); touchFilters(); }} options={["All", "Billable", "Non-Billable"]} />
              <FilterSelect label="Status" value={statusFilter} onChange={(v) => { setStatusFilter(v as ProgressStatus | "All" | "Unsigned"); touchFilters(); }} options={["All", "Unsigned", "Draft", "Pending Signature", "Signed", "Void"]} />
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">From</span>
                <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); touchFilters(); }} className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] text-icm-text" />
                <span className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">To</span>
                <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); touchFilters(); }} className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] text-icm-text" />
              </div>
            </div>

            {showFilterPrompt && (
              <div className="rounded-xl border border-icm-border bg-icm-bg/40 px-4 py-3 text-[12px] font-geist text-icm-text-dim">
                Please select at least one filter to continue, or browse the full list below.
              </div>
            )}

            {/* Table */}
            <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] font-geist">
                  <thead className="bg-icm-bg/60">
                    <tr>
                      {["Date", "Person Supported", "Activity Type", "Billable", "Status", "Updated By", "Updated On", ""].map((c, i) => (
                        <th key={i} className="text-left px-4 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-icm-border">
                    {filtered.map((n) => (
                      <tr key={n.id} onClick={() => openNote(n.id)} className={`hover:bg-icm-bg/40 cursor-pointer transition-colors ${n.status === "Void" ? "opacity-60" : ""}`}>
                        <td className={`px-4 py-3 font-mono ${n.status === "Void" ? "line-through text-icm-text-dim" : "text-icm-text"}`}>{n.date}</td>
                        <td className="px-4 py-3">{person.lastName}, {person.firstName}</td>
                        <td className="px-4 py-3 text-icm-text-dim">{n.activityType}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-geist ${n.isBillable ? "text-icm-green" : "text-icm-text-dim"}`}>
                            {n.isBillable ? "Billable" : "Non-Billable"}
                          </span>
                        </td>
                        <td className="px-4 py-3"><StatusPill status={n.status} /></td>
                        <td className="px-4 py-3 text-icm-text-dim">{n.updatedBy}</td>
                        <td className="px-4 py-3 font-mono text-icm-text-dim">{n.updatedOn}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => openNote(n.id)} className="p-1.5 rounded hover:bg-icm-bg text-icm-accent" title="View"><Eye className="w-3.5 h-3.5" /></button>
                            <button className="p-1.5 rounded hover:bg-icm-bg text-icm-text-dim" title="Print"><Printer className="w-3.5 h-3.5" /></button>
                            <button className="p-1.5 rounded hover:bg-icm-bg text-icm-text-faint hover:text-icm-red" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-icm-text-faint text-[12px]">No notes match these filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <TrendsView />
        )}
      </div>
    </ICMShell>
  );
};

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 -mb-px border-b-2 text-[12.5px] font-geist font-medium inline-flex items-center gap-1.5 transition-colors ${
        active
          ? "border-icm-accent text-icm-text"
          : "border-transparent text-icm-text-dim hover:text-icm-text"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] text-icm-text">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function StatusPill({ status }: { status: ProgressStatus }) {
  const tone =
    status === "Signed" ? "bg-icm-green-soft text-icm-green ring-icm-green/20" :
    status === "Draft" ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20" :
    status === "Pending Signature" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20" :
    "bg-icm-bg text-icm-text-dim ring-icm-border";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 ${tone}`}>
      {status}
    </span>
  );
}

// --- TRENDS ---
function TrendsView() {
  const max = Math.max(...trendsMonths.map(m => m.total));
  const totalActivities = activityBreakdown.reduce((s, a) => s + a.count, 0);
  const billablePct = 78;

  return (
    <div className="space-y-4">
      {/* Goal progress bar chart */}
      <section className="rounded-xl border border-icm-border bg-icm-panel p-5">
        <h3 className="font-manrope font-bold text-[14px] text-icm-text">Goal progress notes — last 6 months</h3>
        <p className="text-[11.5px] text-icm-text-dim font-geist mt-0.5">Color-coded by goal</p>
        <div className="mt-4">
          <svg viewBox="0 0 600 200" className="w-full h-48">
            {trendsMonths.map((m, i) => {
              const x = 40 + i * 95;
              const g1Height = (m.goal1 / max) * 130;
              const g2Height = (m.goal2 / max) * 130;
              const baseY = 160;
              return (
                <g key={m.label}>
                  <rect x={x} y={baseY - g1Height} width={28} height={g1Height} rx={3} fill="hsl(var(--icm-accent))" />
                  <rect x={x + 32} y={baseY - g2Height} width={28} height={g2Height} rx={3} fill="hsl(var(--icm-amber))" />
                  <text x={x + 30} y={180} textAnchor="middle" fontSize="11" fill="hsl(var(--icm-text-dim))" fontFamily="ui-sans-serif">{m.label}</text>
                </g>
              );
            })}
            {/* axis line */}
            <line x1="30" y1="160" x2="590" y2="160" stroke="hsl(var(--icm-border))" />
          </svg>
          <div className="mt-2 flex items-center gap-4 text-[11px] font-geist">
            <Legend color="hsl(var(--icm-accent))" label="Goal 1 — Community Integration" />
            <Legend color="hsl(var(--icm-amber))" label="Goal 2 — Employment Exploration" />
          </div>
        </div>
      </section>

      {/* Goal status summary */}
      <section className="rounded-xl border border-icm-border bg-icm-panel p-5">
        <h3 className="font-manrope font-bold text-[14px] text-icm-text mb-3">Goal status summary</h3>
        <div className="space-y-2">
          <GoalStatusRow goal="Goal 1 — Community Integration" lastStatus="Progressing" days={12} />
          <GoalStatusRow goal="Goal 2 — Employment Exploration" lastStatus="No change" days={62} />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Activity donut */}
        <section className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <h3 className="font-manrope font-bold text-[14px] text-icm-text">Activity type breakdown</h3>
          <div className="mt-4 flex items-center gap-5">
            <DonutChart data={activityBreakdown} total={totalActivities} />
            <ul className="flex-1 space-y-1.5 text-[11.5px] font-geist">
              {activityBreakdown.map(a => (
                <li key={a.label} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: a.color }} />
                    <span className="text-icm-text truncate">{a.label}</span>
                  </div>
                  <span className="font-mono text-icm-text-dim shrink-0">{Math.round((a.count / totalActivities) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Billable ratio */}
        <section className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <h3 className="font-manrope font-bold text-[14px] text-icm-text">Billable vs Non-Billable</h3>
          <div className="mt-5">
            <div className="h-7 rounded-lg bg-icm-bg border border-icm-border overflow-hidden flex">
              <div className="h-full bg-icm-green flex items-center justify-end pr-2 text-[10.5px] font-mono font-bold text-white" style={{ width: `${billablePct}%` }}>
                {billablePct}%
              </div>
              <div className="h-full bg-icm-text-faint flex items-center justify-end pr-2 text-[10.5px] font-mono font-bold text-white" style={{ width: `${100 - billablePct}%` }}>
                {100 - billablePct}%
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-geist text-icm-text-dim">
              <span><span className="inline-block w-2 h-2 rounded-sm bg-icm-green mr-1" />Billable</span>
              <span><span className="inline-block w-2 h-2 rounded-sm bg-icm-text-faint mr-1" />Non-Billable</span>
            </div>
          </div>
        </section>
      </div>

      {/* AI insights */}
      <section className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md ai-gradient flex items-center justify-center"><Sparkles className="w-3 h-3 text-white" /></div>
          <h3 className="font-manrope font-bold text-[13px] text-icm-text">AI insights</h3>
        </div>
        <ul className="space-y-2 text-[12px] font-geist text-icm-text-dim">
          <li><span className="font-semibold text-icm-text">Goal 2 (Employment Exploration)</span> has had no progress documented in 60 days. This may impact the goal's viability at the next ISP review.</li>
          <li><span className="font-semibold text-icm-text">Assessment Coordination</span> is the most common activity type (42% of notes). This aligns with Joseph's current service phase.</li>
        </ul>
      </section>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-icm-text-dim">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function GoalStatusRow({ goal, lastStatus, days }: { goal: string; lastStatus: string; days: number }) {
  const tone = days > 60 ? "red" : days > 30 ? "amber" : "green";
  const cls =
    tone === "red" ? "text-icm-red bg-icm-red-soft ring-icm-red/20" :
    tone === "amber" ? "text-icm-amber bg-icm-amber-soft ring-icm-amber/20" :
    "text-icm-green bg-icm-green-soft ring-icm-green/20";
  return (
    <div className="flex items-center justify-between rounded-lg border border-icm-border bg-icm-bg/40 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[12.5px] font-geist text-icm-text font-medium truncate">{goal}</p>
        <p className="text-[11px] text-icm-text-dim">Last status: {lastStatus}</p>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 ${cls}`}>
        {days} days since last note
      </span>
    </div>
  );
}

function DonutChart({ data, total }: { data: { label: string; count: number; color: string }[]; total: number }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg viewBox="0 0 140 140" className="w-32 h-32 shrink-0">
      <g transform="translate(70 70) rotate(-90)">
        <circle r={radius} fill="none" stroke="hsl(var(--icm-bg))" strokeWidth={18} />
        {data.map((d, i) => {
          const length = (d.count / total) * circumference;
          const dasharray = `${length} ${circumference - length}`;
          const el = (
            <circle
              key={d.label}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={18}
              strokeDasharray={dasharray}
              strokeDashoffset={-offset}
            />
          );
          offset += length;
          return el;
        })}
      </g>
      <text x="70" y="70" textAnchor="middle" dominantBaseline="central" className="font-mono font-bold" fontSize="18" fill="hsl(var(--icm-text))">
        {total}
      </text>
      <text x="70" y="86" textAnchor="middle" fontSize="9" fill="hsl(var(--icm-text-dim))">notes</text>
    </svg>
  );
}

export default PersonProgressNote;
