import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft,
  Plus,
  ArrowRightCircle,
  Sparkles,
  Eye,
  Pencil,
  Printer,
  Trash2,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual, initials, riskAvatarClass, type Individual } from "@/hooks/useIndividuals";
import { useReferrals } from "@/hooks/useFirestore";
import {
  REFERRAL_TYPES,
  REFERRAL_STATUSES,
  daysOpenTone,
  lastConversation,
  statusTone,
  summarize,
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

const PersonReferrals = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading: individualLoading } = useIndividual(id);
  const { data: dbReferrals, loading: referralsLoading } = useReferrals(id);

  const all = useMemo(() => {
    return dbReferrals.map((r: any) => {
      let daysOpen = r.daysOpen || 0;
      if (!daysOpen && r.date) {
        const [m, d, y] = r.date.split("/").map(Number);
        if (m) {
          const dt = new Date(y, m - 1, d);
          daysOpen = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 86400000));
        }
      }
      return {
        id: r.id,
        personId: r.individual_id,
        date: r.date || "—",
        type: r.referral_type || r.type || "—",
        priority: r.priority || "Routine",
        reason: r.reason || "—",
        sourceOfNeed: r.sourceOfNeed || "Case manager recommendation",
        linkedGoalId: r.linkedGoalId,
        linkedGoalLabel: r.linkedGoalLabel,
        urgencyDate: r.urgencyDate,
        providerId: r.providerId,
        providerName: r.referred_to || r.providerName || "—",
        providerPhone: r.providerPhone,
        providerAddress: r.providerAddress,
        providerEmail: r.providerEmail,
        acceptsMedicaid: !!r.acceptsMedicaid,
        referralMethod: r.referralMethod,
        contactDate: r.contactDate,
        contactPerson: r.contactPerson,
        referenceNumber: r.referenceNumber,
        infoShared: r.infoShared || [],
        consentDocumented: !!r.consentDocumented,
        consentDate: r.consentDate,
        consentMethod: r.consentMethod,
        expectedTimeframe: r.expectedTimeframe,
        followUpDate: r.followUpDate,
        assignedTo: r.referred_by || r.assignedTo || "—",
        notes: r.notes || "",
        status: r.status || "Pending Response",
        daysOpen,
        lastActivity: r.lastActivity || r.date || "—",
        closeReason: r.closeReason,
        outcomeNotes: r.outcomeNotes,
        serviceStartDate: r.serviceStartDate,
        aiPrefilled: !!r.aiPrefilled,
        timeline: r.timeline || [],
        attachments: r.attachments || [],
        conversation: r.conversation || [],
      };
    });
  }, [dbReferrals]);

  const sum = useMemo(() => summarize(all), [all]);

  const [typeFilter, setTypeFilter] = useState<"All" | string>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | ReferralStatus>("All");
  const [aiBannerVisible, setAiBannerVisible] = useState(true);

  const filtered = useMemo(() => {
    return all.filter((r) => {
      if (typeFilter !== "All" && r.type !== typeFilter) return false;
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      return true;
    });
  }, [all, typeFilter, statusFilter]);

  const loading = individualLoading || referralsLoading;

  if (loading) {
    return (
      <ICMShell title="Referrals" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return (
      <ICMShell title="Referrals" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p>
      </ICMShell>
    );
  }

  const open = (rid: string) => navigate(`/people/${id}/referrals/${rid}`);
  const create = () => navigate(`/people/${id}/referrals/new`);

  return (
    <ICMShell title="Referrals" showAIPanel={false}>
      <div className="space-y-5">
        {/* Person header */}
        <PersonHeader individual={individual} navigate={navigate} />

        {/* Title row */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[22px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Referrals
            </h1>
            <p className="text-[12.5px] text-icm-text-dim mt-0.5 font-geist">
              Community resource and service referrals · closed-loop tracking
            </p>
          </div>
          <button
            onClick={create}
            className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Referral
          </button>
        </div>

        {/* AI ribbon */}
        {aiBannerVisible && (
          <div className="rounded-xl bg-icm-accent-soft border border-icm-accent/20 p-3 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-icm-accent mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-geist text-icm-text">
                <span className="font-semibold">{individual.first_name} may benefit from a community referral</span>{" "}
                <span className="text-icm-text-dim">
                  based on recent notes. Review care plan goals and create referrals to support active goals.
                </span>
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={create}
                  className="h-7 px-2.5 rounded-lg bg-icm-accent text-white text-[11px] font-semibold hover:opacity-90"
                >
                  Create referral →
                </button>
                <button
                  onClick={() => setAiBannerVisible(false)}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-icm-text-dim hover:text-icm-text"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              onClick={() => setAiBannerVisible(false)}
              className="w-6 h-6 rounded text-icm-text-faint hover:text-icm-text hover:bg-icm-panel flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {all.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-icm-bg border border-icm-border flex items-center justify-center mb-4">
              <ArrowRightCircle className="w-7 h-7 text-icm-text-faint" />
            </div>
            <h2 className="font-manrope font-extrabold text-[20px] text-icm-text mb-1">
              No referrals yet
            </h2>
            <p className="text-[13px] text-icm-text-dim max-w-md mb-6">
              Track referrals to community resources and services to ensure {individual.first_name} is connected to
              everything they need.
            </p>
            <div className="flex gap-2">
              <button
                onClick={create}
                className="h-10 px-4 rounded-xl border border-icm-border text-[13px] font-medium text-icm-text hover:bg-icm-bg"
              >
                + Create referral
              </button>
              <button
                onClick={create}
                className="h-10 px-4 rounded-xl bg-icm-text text-icm-panel text-[13px] font-medium hover:opacity-90 inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI suggests referrals
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Summary chips */}
            <div className="flex flex-wrap gap-2">
              <Chip label="Total" value={sum.total} tone="neutral" />
              <Chip label="Pending" value={sum.pending} tone="amber" />
              <Chip label="Connected" value={sum.connected} tone="green" />
              <Chip label="Unsuccessful" value={sum.unsuccessful} tone="red" />
              {sum.stalled > 0 && (
                <Chip label="Stalled >14d" value={sum.stalled} tone="red" icon={AlertTriangle} />
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none"
              >
                <option value="All">All types</option>
                {REFERRAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none"
              >
                <option value="All">All statuses</option>
                {REFERRAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
              <table className="w-full text-[12px] font-geist">
                <thead className="bg-icm-bg text-icm-text-dim text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Referral ID</th>
                    <th className="text-left px-4 py-2 font-semibold">Date</th>
                    <th className="text-left px-4 py-2 font-semibold">Type</th>
                    <th className="text-left px-4 py-2 font-semibold">Referred To</th>
                    <th className="text-left px-4 py-2 font-semibold">Status</th>
                    <th className="text-left px-4 py-2 font-semibold">Last Activity</th>
                    <th className="text-left px-4 py-2 font-semibold">Last Communication</th>
                    <th className="text-right px-4 py-2 font-semibold">Days Open</th>
                    <th className="text-left px-4 py-2 font-semibold">Assigned To</th>
                    <th className="text-right px-4 py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const tone = statusTone(r.status);
                    const dTone = daysOpenTone(r.daysOpen);
                    const isPending = r.status === "Pending Response";
                    const last = lastConversation(r);
                    const attCount = r.attachments?.length ?? 0;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => open(r.id)}
                        className="border-t border-icm-border hover:bg-icm-bg/60 cursor-pointer"
                      >
                        <td className="px-4 py-2.5 font-mono text-icm-text">{r.id}</td>
                        <td className="px-4 py-2.5 font-mono text-icm-text-dim">{r.date}</td>
                        <td className="px-4 py-2.5 text-icm-text">{r.type}</td>
                        <td className="px-4 py-2.5 text-icm-text">
                          <div className="inline-flex items-center gap-1.5">
                            <span>{r.providerName}</span>
                            {attCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-icm-bg text-icm-text-dim text-[10px] font-mono ring-1 ring-icm-border">
                                📎 {attCount}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 ${statusToneClass[tone]}`}
                          >
                            {isPending && <span className="w-1.5 h-1.5 rounded-full bg-icm-amber animate-pulse" />}
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-icm-text-dim">{r.lastActivity}</td>
                        <td className="px-4 py-2.5 text-icm-text-dim">
                          {last ? (
                            <span className="inline-flex items-center gap-1">
                              <span>
                                {last.type === "email"
                                  ? "📧"
                                  : last.type === "phone"
                                    ? "📞"
                                    : last.type === "status"
                                      ? "📋"
                                      : "💬"}
                              </span>
                              <span className="text-[11.5px]">{timeAgo(last.date)}</span>
                            </span>
                          ) : (
                            <span className="text-[11.5px] text-icm-text-faint">No contact yet</span>
                          )}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono ${daysToneClass[dTone]}`}>
                          {r.daysOpen}
                        </td>
                        <td className="px-4 py-2.5 text-icm-text-dim">{r.assignedTo}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <IconBtn icon={Eye} onClick={() => open(r.id)} />
                            <IconBtn icon={Pencil} onClick={() => open(r.id)} />
                            <IconBtn icon={Printer} onClick={() => window.print()} />
                            <IconBtn icon={Trash2} onClick={() => toast(`Withdraw referral ${r.id}?`, { action: { label: "Withdraw", onClick: () => toast.success(`Referral ${r.id} withdrawn`) } })} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </ICMShell>
  );
};

function PersonHeader({ individual, navigate }: { individual: Individual; navigate: any }) {
  return (
    <div className="space-y-2">
      <button
        onClick={() => navigate(`/people/${individual.id}/echart`)}
        className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Back to eChart
      </button>
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg ring-2 flex items-center justify-center font-semibold text-[13px] ${riskAvatarClass(individual.risk_score)}`}
        >
          {initials(individual)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-manrope font-bold text-[15px] text-icm-text leading-tight">
            {individual.first_name} {individual.last_name}
          </p>
          <p className="text-[11.5px] text-icm-text-dim">
            People → {individual.first_name} {individual.last_name} → Referrals
          </p>
        </div>
      </div>
    </div>
  );
}

function Chip({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  tone: "neutral" | "amber" | "red" | "green" | "blue";
  icon?: any;
}) {
  return (
    <div className={`px-3 py-1.5 rounded-xl ring-1 inline-flex items-center gap-2 ${statusToneClass[tone]}`}>
      {Icon && <Icon className="w-3 h-3" />}
      <span className="text-[10.5px] font-geist font-semibold uppercase tracking-wide opacity-80">
        {label}
      </span>
      <span className="font-manrope font-extrabold text-[14px]">{value}</span>
    </div>
  );
}

function IconBtn({ icon: Icon, onClick }: { icon: any; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="w-7 h-7 rounded-lg text-icm-text-faint hover:text-icm-text hover:bg-icm-bg flex items-center justify-center"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function timeAgo(dateStr: string): string {
  const datePart = dateStr.split(" ")[0];
  const [m, d, y] = datePart.split("/").map((n) => parseInt(n, 10));
  if (!m || !d || !y) return dateStr;
  const then = new Date(y, m - 1, d).getTime();
  const diffMs = Date.now() - then;
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diffMs / day);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export default PersonReferrals;
