import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Sparkles, Plus, Trash2, Eye, Printer, Pencil,
  AlertTriangle, BarChart3, ListIcon, Loader2, Mic,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual, riskAvatarClass, initials, calcAge } from "@/hooks/useIndividuals";
import { useProgressNotes, statusLabel, type NoteStatus } from "@/hooks/useProgressNotes";
import { AuthorCell } from "@/components/icm/AuthorCell";

type Tab = "list" | "trends";

const PersonProgressNote = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading: indLoading } = useIndividual(id);
  const { notes, loading: notesLoading } = useProgressNotes(id);

  const [tab, setTab] = useState<Tab>("list");
  const [activityFilter, setActivityFilter] = useState("All");
  const [billableFilter, setBillableFilter] = useState<"All" | "Billable" | "Non-Billable">("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const unsigned = notes.filter(n => n.status === "draft" || n.status === "pending_signature");

  const filtered = useMemo(() => {
    return notes.filter(n => {
      if (activityFilter !== "All" && n.activityType !== activityFilter) return false;
      if (billableFilter === "Billable" && !n.isBillable) return false;
      if (billableFilter === "Non-Billable" && n.isBillable) return false;
      if (statusFilter === "Unsigned" && n.status !== "draft" && n.status !== "pending_signature") return false;
      if (statusFilter !== "All" && statusFilter !== "Unsigned" && n.status !== statusFilter) return false;
      return true;
    });
  }, [notes, activityFilter, billableFilter, statusFilter]);

  const openNote = (noteId: string) => navigate(`/people/${id}/progress-note/${noteId}`);
  const newNote = () => navigate(`/people/${id}/progress-note/new`);

  if (indLoading) {
    return (
      <ICMShell title="Progress Note" showAIPanel={false}>
        <div className="flex items-center justify-center py-20 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return (
      <ICMShell title="Progress Note" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Individual not found.</p>
      </ICMShell>
    );
  }

  const age = calcAge(individual.dob);

  if (!notesLoading && notes.length === 0) {
    return (
      <ICMShell title="Progress Note" showAIPanel={false}>
        <div className="space-y-4">
          <button onClick={() => navigate(`/people/${id}/echart`)} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">
            <ChevronLeft className="w-3.5 h-3.5" />
            People · {individual.last_name}, {individual.first_name} · Progress Note
          </button>
          <PersonHeader individual={individual} age={age} />
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-icm-bg border border-icm-border flex items-center justify-center mb-4">
              <Pencil className="w-7 h-7 text-icm-text-faint" />
            </div>
            <h2 className="font-manrope font-extrabold text-[20px] text-icm-text mb-1">No progress notes yet</h2>
            <p className="text-[13px] text-icm-text-dim max-w-md mb-6">
              Document {individual.preferred_name || individual.first_name}'s first goal progress or let AI draft one from their profile.
            </p>
            <div className="flex gap-2">
              <button onClick={newNote} className="h-10 px-4 rounded-xl border border-icm-border text-[13px] font-medium text-icm-text hover:bg-icm-bg">
                + Start blank note
              </button>
              <button
                onClick={() => navigate(`/people/${id}/progress-note/new?from=ambient`)}
                className="h-10 px-4 rounded-xl border border-icm-border bg-icm-panel text-[13px] font-medium text-icm-text-dim hover:bg-icm-bg inline-flex items-center gap-1.5"
              >
                <Mic className="w-3.5 h-3.5" /> Draft from ambient session
              </button>
              <button onClick={newNote} className="h-10 px-4 rounded-xl bg-teal-600 text-white text-[13px] font-medium hover:bg-teal-700 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI-prefill from profile
              </button>
            </div>
          </div>
        </div>
      </ICMShell>
    );
  }

  const activityTypes = ["All", ...Array.from(new Set(notes.map(n => n.activityType).filter(Boolean)))];

  return (
    <ICMShell title="Progress Note" showAIPanel={false}>
      <div className="space-y-5">
        <button onClick={() => navigate(`/people/${id}/echart`)} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {individual.last_name}, {individual.first_name} · Progress Note
        </button>

        <PersonHeader individual={individual} age={age} />

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">Progress Notes</h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              {notes.length} note{notes.length !== 1 ? "s" : ""} · {unsigned.length} unsigned
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={newNote} className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-medium hover:opacity-90 inline-flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Note
            </button>
          </div>
        </div>

        {/* Unsigned alert */}
        {unsigned.length > 0 && (
          <div className="rounded-xl border border-icm-amber/20 bg-icm-amber-soft px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-icm-amber shrink-0" />
              <p className="text-[12.5px] font-geist text-icm-text leading-snug">
                <span className="font-semibold">{unsigned.length} {unsigned.length === 1 ? "note is" : "notes are"} pending your signature.</span>{" "}
                <span className="text-icm-text-dim">Unsigned notes cannot be submitted for billing.</span>
              </p>
            </div>
            <button onClick={() => setStatusFilter("Unsigned")} className="text-[11.5px] font-geist font-semibold text-icm-amber hover:underline shrink-0">
              Review unsigned notes →
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-icm-border">
          <TabButton active={tab === "list"} onClick={() => setTab("list")} icon={<ListIcon className="w-3.5 h-3.5" />}>All Notes</TabButton>
          <TabButton active={tab === "trends"} onClick={() => setTab("trends")} icon={<BarChart3 className="w-3.5 h-3.5" />}>Trends</TabButton>
        </div>

        {tab === "list" ? (
          <>
            {/* Filters */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex flex-wrap items-center gap-2">
              <FilterSelect label="Activity" value={activityFilter} onChange={setActivityFilter} options={activityTypes} />
              <FilterSelect label="Billable" value={billableFilter} onChange={(v) => setBillableFilter(v as "All" | "Billable" | "Non-Billable")} options={["All", "Billable", "Non-Billable"]} />
              <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={["All", "Unsigned", "draft", "pending_signature", "signed", "void"]} />
            </div>

            {notesLoading ? (
              <div className="flex items-center justify-center py-10 gap-3 text-icm-text-dim">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[12px] font-geist">Loading notes…</span>
              </div>
            ) : (
              <>
              {/* Table — desktop only (sm and above) */}
              <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden hidden sm:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px] font-geist">
                    <thead className="bg-icm-bg/60">
                      <tr>
                        {["Date", "Activity Type", "Contact", "Billable", "Status", "Author", ""].map((c, i) => (
                          <th key={i} className="text-left px-4 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint whitespace-nowrap">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-icm-border">
                      {filtered.map((n) => (
                        <tr key={n.id} onClick={() => openNote(n.id)} className={`hover:bg-icm-bg/40 cursor-pointer transition-colors ${n.status === "void" ? "opacity-60" : ""}`}>
                          <td className={`px-4 py-3 font-mono ${n.status === "void" ? "line-through text-icm-text-dim" : "text-icm-text"}`}>{n.progressDate}</td>
                          <td className="px-4 py-3 text-icm-text-dim">{n.activityType || "—"}</td>
                          <td className="px-4 py-3 text-icm-text-dim">{n.contactType || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-geist ${n.isBillable ? "text-icm-green" : "text-icm-text-dim"}`}>
                              {n.isBillable ? "Billable" : "Non-Billable"}
                            </span>
                          </td>
                          <td className="px-4 py-3"><StatusPill status={n.status} /></td>
                          <td className="px-4 py-3 text-icm-text-dim">
                            <AuthorCell name={n.authorName || "—"} size="sm" showName={true} />
                          </td>
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
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-icm-text-faint text-[12px]">No notes match these filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cards — mobile only (below sm) */}
              <div className="sm:hidden space-y-3">
                {filtered.length === 0 && (
                  <p className="text-center text-[12px] text-icm-text-faint py-8">No notes match these filters.</p>
                )}
                {filtered.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => openNote(n.id)}
                    className={`w-full text-left rounded-xl border border-icm-border bg-icm-panel p-4 space-y-2 hover:border-icm-border-strong transition-colors ${n.status === "void" ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`font-mono text-[12px] ${n.status === "void" ? "line-through text-icm-text-dim" : "text-icm-text font-semibold"}`}>{n.progressDate}</p>
                        <p className="text-[11px] text-icm-text-dim mt-0.5">{n.activityType || "—"} · {n.contactType || "—"}</p>
                        <div className="mt-1">
                          <AuthorCell name={n.authorName || "—"} size="sm" showName={true} />
                        </div>
                      </div>
                      <StatusPill status={n.status} />
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-icm-border/60">
                      <span className={`text-[11px] font-geist ${n.isBillable ? "text-icm-green" : "text-icm-text-dim"}`}>
                        {n.isBillable ? "● Billable" : "○ Non-Billable"}
                      </span>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openNote(n.id)} className="p-1.5 rounded hover:bg-icm-bg text-icm-accent" title="View" aria-label="View note"><Eye className="w-4 h-4" /></button>
                        <button className="p-1.5 rounded hover:bg-icm-bg text-icm-text-dim" title="Print" aria-label="Print note"><Printer className="w-4 h-4" /></button>
                        <button className="p-1.5 rounded hover:bg-icm-bg text-icm-text-faint hover:text-icm-red" title="Delete" aria-label="Delete note"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              </>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-icm-border bg-icm-panel p-8 text-center">
            <p className="text-[13px] text-icm-text-dim font-geist">Trends view coming soon — add more notes to generate insights.</p>
          </div>
        )}
      </div>
    </ICMShell>
  );
};

function PersonHeader({ individual, age }: { individual: any; age: number | null }) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3 flex-wrap">
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono text-[14px] font-bold ${riskAvatarClass(individual.risk_score)}`}>
        {initials(individual)}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-manrope font-extrabold text-[16px] text-icm-text tracking-tight">
          {individual.last_name}, {individual.first_name}
        </h2>
        <p className="text-[11.5px] font-mono text-icm-text-dim">
          {individual.gender ?? "—"} · {age !== null ? `${age}y` : "—"} · {individual.county ?? "—"} · Medicaid {individual.medicaid_id ?? "—"}
        </p>
      </div>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
        <span className="w-1.5 h-1.5 rounded-full bg-icm-green" />
        {individual.enrollment_status}
      </span>
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-3 py-2 -mb-px border-b-2 text-[12.5px] font-geist font-medium inline-flex items-center gap-1.5 transition-colors ${active ? "border-icm-accent text-icm-text" : "border-transparent text-icm-text-dim hover:text-icm-text"}`}>
      {icon}{children}
    </button>
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

function StatusPill({ status }: { status: NoteStatus }) {
  const tone =
    status === "signed" ? "bg-icm-green-soft text-icm-green ring-icm-green/20" :
    status === "draft" ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20" :
    status === "pending_signature" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20" :
    "bg-icm-bg text-icm-text-dim ring-icm-border";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}

export default PersonProgressNote;
