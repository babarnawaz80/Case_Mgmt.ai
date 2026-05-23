import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft,
  Search,
  Filter,
  Phone,
  MessageSquarePlus,
  X,
  ExternalLink,
  Paperclip,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { getPerson, initials, riskAvatarClass } from "@/data/people";
import {
  REFERRAL_TYPES,
  REFERRAL_STATUSES,
  referrals as allReferrals,
  daysOpenTone,
  statusTone,
  summarize,
  lastConversation,
  addConversationEntry,
  type Referral,
  type ReferralStatus,
} from "@/data/referrals";

const statusToneClass: Record<string, string> = {
  green: "bg-icm-green-soft text-icm-green ring-icm-green/20",
  amber: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
  red: "bg-icm-red-soft text-icm-red ring-icm-red/20",
  blue: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
  neutral: "bg-icm-bg text-icm-text-dim ring-icm-border",
};
const daysToneClass: Record<string, string> = {
  neutral: "text-icm-text-dim",
  amber: "text-icm-amber",
  red: "text-icm-red",
};

function timeAgo(date: string): string {
  // dates are MM/DD/YYYY
  const [m, d, y] = date.split("/").map((s) => parseInt(s, 10));
  if (!m || !d || !y) return date;
  const then = new Date(y, m - 1, d).getTime();
  const days = Math.max(0, Math.round((Date.now() - then) / (1000 * 60 * 60 * 24)));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

const AllReferrals = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ReferralStatus>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [personFilter, setPersonFilter] = useState<string>("All");
  const [notesFor, setNotesFor] = useState<Referral | null>(null);
  const [tick, setTick] = useState(0); // re-render after note add

  const peopleInList = useMemo(() => {
    const ids = Array.from(new Set(allReferrals.map((r) => r.personId)));
    return ids
      .map((id) => getPerson(id))
      .filter((p): p is NonNullable<ReturnType<typeof getPerson>> => !!p);
  }, []);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return allReferrals.filter((r) => {
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      if (typeFilter !== "All" && r.type !== typeFilter) return false;
      if (personFilter !== "All" && r.personId !== personFilter) return false;
      if (!ql) return true;
      const p = getPerson(r.personId);
      const name = p ? `${p.firstName} ${p.lastName}` : "";
      return (
        r.providerName.toLowerCase().includes(ql) ||
        r.type.toLowerCase().includes(ql) ||
        r.reason.toLowerCase().includes(ql) ||
        name.toLowerCase().includes(ql)
      );
    });
  }, [q, statusFilter, typeFilter, personFilter, tick]);

  const sum = summarize(filtered);

  return (
    <ICMShell title="All Referrals" showAIPanel={false}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Dashboard · All Referrals
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              All Referrals
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              Every referral you've sent across your caseload — provider, status, last contact, and notes.
            </p>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          <Chip label="Total" value={sum.total} tone="dim" />
          <Chip label="Pending" value={sum.pending} tone="amber" />
          <Chip label="Connected" value={sum.connected} tone="green" />
          <Chip label="Stalled 14d+" value={sum.stalled} tone="red" />
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-icm-text-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by person, provider, type, or reason…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-icm-border bg-white text-[12.5px]"
            />
          </div>
          <Filter className="w-3.5 h-3.5 text-icm-text-faint ml-1" />
          <select
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            className="h-9 px-2 rounded-lg border border-icm-border bg-white text-[12px]"
          >
            <option value="All">All individuals</option>
            {peopleInList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.lastName}, {p.firstName}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "All" | ReferralStatus)}
            className="h-9 px-2 rounded-lg border border-icm-border bg-white text-[12px]"
          >
            <option value="All">All statuses</option>
            {REFERRAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-2 rounded-lg border border-icm-border bg-white text-[12px]"
          >
            <option value="All">All types</option>
            {REFERRAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] font-geist">
              <thead className="bg-icm-bg/60">
                <tr>
                  {[
                    "Individual",
                    "Type",
                    "Referred To",
                    "Status",
                    "Last Contact",
                    "Days Open",
                    "",
                  ].map((c, i) => (
                    <th
                      key={i}
                      className="text-left px-3 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint whitespace-nowrap"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-icm-border">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-[12px] text-icm-text-faint">
                      No referrals match these filters.
                    </td>
                  </tr>
                )}
                {filtered.map((r) => {
                  const person = getPerson(r.personId);
                  const lc = lastConversation(r);
                  const dTone = daysOpenTone(r.daysOpen);
                  const sTone = statusTone(r.status);
                  return (
                    <tr key={r.id} className="hover:bg-icm-bg/40 transition-colors">
                      <td className="px-3 py-2.5">
                        {person ? (
                          <button
                            onClick={() => navigate(`/people/${person.id}/referrals/${r.id}`)}
                            className="flex items-center gap-2 text-left"
                          >
                            <div
                              className={`w-8 h-8 rounded-lg border flex items-center justify-center font-mono text-[11px] font-bold ${riskAvatarClass(person.riskScore)}`}
                            >
                              {initials(person)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[12.5px] font-semibold text-icm-text truncate">
                                {person.lastName}, {person.firstName}
                              </div>
                              <div className="text-[10.5px] font-mono text-icm-text-faint">
                                ID #{person.id} · {r.date}
                              </div>
                            </div>
                          </button>
                        ) : (
                          <span className="text-icm-text-faint">Unknown</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-icm-text">{r.type}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-icm-text">{r.providerName}</span>
                          {r.attachments && r.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-icm-bg text-icm-text-dim text-[10px] font-mono ring-1 ring-icm-border">
                              <Paperclip className="w-2.5 h-2.5" /> {r.attachments.length}
                            </span>
                          )}
                        </div>
                        {r.providerPhone && (
                          <div className="text-[10.5px] font-mono text-icm-text-faint flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" /> {r.providerPhone}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${statusToneClass[sTone]}`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {lc ? (
                          <div className="leading-tight">
                            <div className="text-[11.5px] text-icm-text capitalize">{lc.type}</div>
                            <div className="text-[10.5px] text-icm-text-faint">{timeAgo(r.lastActivity)}</div>
                          </div>
                        ) : (
                          <span className="text-[11.5px] text-icm-text-faint">No contact yet</span>
                        )}
                      </td>
                      <td className={`px-3 py-2.5 font-mono ${daysToneClass[dTone]}`}>
                        {r.status.startsWith("Closed") ? "—" : r.daysOpen}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setNotesFor(r)}
                            title="Add note"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-medium text-icm-accent hover:bg-icm-accent-soft"
                          >
                            <MessageSquarePlus className="w-3.5 h-3.5" /> Note
                          </button>
                          {person && (
                            <button
                              onClick={() => navigate(`/people/${person.id}/referrals/${r.id}`)}
                              title="Open referral"
                              className="p-1.5 rounded-md text-icm-text-dim hover:bg-icm-bg hover:text-icm-text"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {notesFor && (
        <NotesModal
          referral={notesFor}
          onClose={() => setNotesFor(null)}
          onSaved={() => setTick((n) => n + 1)}
        />
      )}
    </ICMShell>
  );
};

function Chip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "green" | "red" | "amber" | "dim";
}) {
  const toneClass =
    tone === "green"
      ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
      : tone === "red"
      ? "bg-icm-red-soft text-icm-red ring-icm-red/20"
      : tone === "amber"
      ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
      : "bg-icm-bg text-icm-text-dim ring-icm-border";
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ring-1 ${toneClass}`}>
      <span className="text-[10px] uppercase tracking-wide font-geist font-semibold opacity-70">{label}</span>
      <span className="text-[12px] font-mono font-semibold">{value}</span>
    </div>
  );
}

function NotesModal({
  referral,
  onClose,
  onSaved,
}: {
  referral: Referral;
  onClose: () => void;
  onSaved: () => void;
}) {
  const person = getPerson(referral.personId);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"note" | "phone" | "email">("note");

  const save = () => {
    if (!text.trim()) {
      toast.error("Please write a note first");
      return;
    }
    const now = new Date();
    const date = `${(now.getMonth() + 1).toString().padStart(2, "0")}/${now
      .getDate()
      .toString()
      .padStart(2, "0")}/${now.getFullYear()} ${now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
    addConversationEntry(referral.id, {
      id: `c-${Date.now()}`,
      type: kind,
      by: "Kathy Adams",
      initials: "KA",
      date,
      message: text.trim(),
    });
    referral.lastActivity = date.split(" ")[0];
    toast.success("Note added to referral");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-manrope font-bold text-[15px] text-icm-text">Add note</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-icm-bg text-icm-text-dim">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11.5px] text-icm-text-dim mb-3 font-geist">
          {person ? `${person.lastName}, ${person.firstName}` : "Referral"} · {referral.type} ·{" "}
          {referral.providerName}
        </p>

        <div className="space-y-3">
          <div className="flex gap-1.5">
            {(["note", "phone", "email"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium capitalize ${
                  kind === k
                    ? "bg-icm-accent text-white"
                    : "bg-icm-bg text-icm-text-dim hover:bg-icm-border"
                }`}
              >
                {k === "note" ? "Note" : k === "phone" ? "Phone call" : "Email"}
              </button>
            ))}
          </div>
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What happened? E.g. Spoke with intake coordinator, on waitlist for 2 weeks…"
            className="w-full px-3 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist"
          />
        </div>

        {referral.conversation && referral.conversation.length > 0 && (
          <div className="mt-4">
            <div className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1.5">
              Recent
            </div>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {[...referral.conversation]
                .slice(-3)
                .reverse()
                .map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-icm-border bg-icm-bg/40 p-2 text-[11.5px]"
                  >
                    <div className="flex items-center justify-between text-[10.5px] text-icm-text-faint mb-0.5">
                      <span className="font-semibold capitalize">{c.type}</span>
                      <span className="font-mono">{c.date}</span>
                    </div>
                    <p className="text-icm-text leading-snug">{c.message}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="h-9 px-4 rounded-lg bg-teal-600 text-white text-[12px] font-medium hover:bg-teal-700"
          >
            Save note
          </button>
        </div>
      </div>
    </div>
  );
}

export default AllReferrals;
