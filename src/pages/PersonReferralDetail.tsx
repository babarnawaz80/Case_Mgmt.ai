import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft,
  X,
  Plus,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Download,
  Send,
  Pencil,
  FileText,
  Paperclip,
  Loader2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual } from "@/hooks/useIndividuals";
import { useReferrals, updateReferral } from "@/hooks/useFirestore";
import {
  REFERRAL_STATUSES,
  statusTone,
  type ConversationEntry,
  type ConversationKind,
  type ReferralStatus,
  type TimelineEvent,
} from "@/data/referrals";

const statusToneClass: Record<string, string> = {
  green: "bg-icm-green-soft text-icm-green ring-icm-green/20",
  amber: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
  red: "bg-icm-red-soft text-icm-red ring-icm-red/20",
  blue: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
  neutral: "bg-icm-bg text-icm-text-dim ring-icm-border",
};

const convoBadge: Record<ConversationKind, { label: string; cls: string; icon: string }> = {
  email: { label: "Email sent", cls: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20", icon: "📧" },
  phone: { label: "Phone call", cls: "bg-icm-green-soft text-icm-green ring-icm-green/20", icon: "📞" },
  note: { label: "Note", cls: "bg-icm-bg text-icm-text-dim ring-icm-border", icon: "💬" },
  status: { label: "Status update", cls: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20", icon: "📋" },
};

const PersonReferralDetail = () => {
  const { id, referralId } = useParams<{ id: string; referralId: string }>();
  const navigate = useNavigate();
  const { individual, loading: individualLoading } = useIndividual(id);
  const { data: dbReferrals, loading: referralsLoading } = useReferrals(id);
  const [showUpdate, setShowUpdate] = useState(false);
  const [logging, setLogging] = useState(false);

  const referral = useMemo(() => {
    const r = dbReferrals.find((ref) => ref.id === referralId);
    if (!r) return undefined;
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
      personId: r.individual_id || r.personId,
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
  }, [dbReferrals, referralId]);

  const loading = individualLoading || referralsLoading;

  if (loading) {
    return (
      <ICMShell title="Referral" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual || !referral) {
    return (
      <ICMShell title="Referral" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Referral not found.</p>
      </ICMShell>
    );
  }

  const tone = statusTone(referral.status as ReferralStatus);
  const isPending = referral.status === "Pending Response" || referral.status === "Submitted" || referral.status === "pending";

  const markStatus = async (status: ReferralStatus, label: string) => {
    const today = new Date();
    const fmt = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}/${today.getFullYear()}`;
    const newEvent = {
      id: `t-${Date.now()}`,
      date: fmt,
      type: status === "Connected" ? "accepted" : "declined",
      title: `Status updated to ${status}`,
      by: "Kathy Adams",
    };
    const newConvo = {
      id: `c-${Date.now()}`,
      type: "status" as const,
      by: "Kathy Adams",
      initials: "KA",
      date: `${fmt}`,
      message: `Referral marked as ${label}.`,
    };
    try {
      await updateReferral(referral.id, {
        status: status as any,
        lastActivity: fmt,
        timeline: [...referral.timeline, newEvent] as any,
        conversation: [...referral.conversation, newConvo] as any,
      });
      toast.success(`Referral marked as ${label}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const downloadPdf = () =>
    toast.success(
      `Referral PDF downloaded — ${individual.first_name} ${individual.last_name} · ${referral.type} · ${referral.date}`,
    );

  return (
    <ICMShell title="Referral" showAIPanel={false}>
      <div className="space-y-4 max-w-[1200px] mx-auto">
        <button
          onClick={() => navigate(`/people/${id}/referrals`)}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Referrals
        </button>

        {/* Status bar */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-icm-bg text-icm-text-dim ring-1 ring-icm-border">
                {referral.id}
              </span>
              <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-icm-bg text-icm-text-dim ring-1 ring-icm-border font-semibold">
                {referral.type}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${statusToneClass[tone]}`}>
                {referral.status}
              </span>
              <span className="text-[10.5px] text-icm-text-dim font-mono">
                {referral.daysOpen} days open
              </span>
            </div>
            <h1 className="font-manrope text-[18px] font-extrabold text-icm-text leading-tight">
              {referral.providerName}
            </h1>
            <p className="text-[12px] text-icm-text-dim mt-0.5">
              {individual.first_name} {individual.last_name} · Created {referral.date} · Assigned to {referral.assignedTo}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setShowUpdate(true)}
              className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-semibold text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1.5"
            >
              <Pencil className="w-3 h-3" />
              Edit referral
            </button>
            <button
              onClick={downloadPdf}
              className="h-9 px-3 rounded-xl border border-icm-accent text-icm-accent bg-icm-panel text-[12px] font-semibold hover:bg-icm-accent-soft inline-flex items-center gap-1.5"
            >
              <Download className="w-3 h-3" />
              Download PDF
            </button>
            <button
              onClick={() => toast(`Email composer — ${referral.providerName}`, { description: "Opens the email-to-provider flow from the form." })}
              className="h-9 px-3 rounded-xl border border-icm-accent text-icm-accent bg-icm-panel text-[12px] font-semibold hover:bg-icm-accent-soft inline-flex items-center gap-1.5"
            >
              <Send className="w-3 h-3" />
              Email Provider
            </button>
            {isPending && (
              <>
                <button
                  onClick={() => markStatus("Connected", "Connected")}
                  className="h-9 px-3 rounded-xl bg-icm-accent text-white text-[12px] font-semibold hover:opacity-90"
                >
                  Mark as Connected
                </button>
                <button
                  onClick={() => markStatus("Closed — Unsuccessful", "Unsuccessful")}
                  className="h-9 px-3 rounded-xl border border-icm-red text-icm-red bg-icm-panel text-[12px] font-semibold hover:bg-icm-red-soft"
                >
                  Mark as Unsuccessful
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stalled alert */}
        {referral.daysOpen >= 14 && !referral.status.startsWith("Closed") && (
          <div
            className={`rounded-xl border p-3 flex items-start gap-2 ${referral.daysOpen >= 30 ? "bg-icm-red-soft border-icm-red/20" : "bg-icm-amber-soft border-icm-amber/20"}`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 ${referral.daysOpen >= 30 ? "text-icm-red" : "text-icm-amber"}`} />
            <p className="text-[12px] font-geist text-icm-text">
              <span className="font-semibold">Referral has had no activity in {referral.daysOpen} days.</span>{" "}
              <span className="text-icm-text-dim">
                {referral.daysOpen >= 30
                  ? "Consider calling the provider or identifying an alternative."
                  : "Follow up may be needed."}
              </span>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4">
          {/* LEFT — Referral details */}
          <div className="space-y-3 min-w-0">
            <InfoCard title="Individual">
              <Row k="Name" v={`${individual.first_name} ${individual.last_name}`} />
              <Row k="Date" v={referral.date} />
              <Row k="Type" v={referral.type} />
              <Row k="Priority" v={referral.priority} />
            </InfoCard>

            <InfoCard title="Reason for referral">
              <p className="text-[12px] text-icm-text-dim leading-relaxed">{referral.reason}</p>
            </InfoCard>

            <InfoCard title="Provider">
              <p className="font-manrope font-bold text-[12.5px] text-icm-text">{referral.providerName}</p>
              {referral.providerPhone && (
                <p className="text-[11.5px] text-icm-text-dim mt-1 inline-flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {referral.providerPhone}
                </p>
              )}
              {referral.providerEmail && (
                <p className="text-[11.5px] text-icm-text-dim mt-0.5 inline-flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {referral.providerEmail}
                </p>
              )}
              {referral.providerAddress && (
                <p className="text-[11.5px] text-icm-text-dim mt-0.5 inline-flex items-start gap-1">
                  <MapPin className="w-3 h-3 mt-0.5" />
                  <span>{referral.providerAddress}</span>
                </p>
              )}
            </InfoCard>

            <InfoCard title="Information shared">
              <ul className="space-y-1">
                {referral.infoShared.map((i) => (
                  <li key={i} className="text-[12px] text-icm-text inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-icm-green" />
                    {i}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-icm-text-faint mt-2 inline-flex items-center gap-1">
                {referral.consentDocumented ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-icm-green" />
                    Consent documented {referral.consentDate} ({referral.consentMethod})
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-icm-red" />
                    <span className="text-icm-red">Consent not documented</span>
                  </>
                )}
              </p>
            </InfoCard>

            <InfoCard title={`Attached documents${referral.attachments?.length ? ` (${referral.attachments.length})` : ""}`}>
              {referral.attachments && referral.attachments.length > 0 ? (
                <ul className="space-y-1.5">
                  {referral.attachments.map((a) => (
                    <li
                      key={a.id}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${a.autoGenerated ? "bg-icm-accent-soft border-icm-accent/20" : "bg-icm-panel border-icm-border"}`}
                    >
                      <FileText className={`w-4 h-4 ${a.autoGenerated ? "text-icm-accent" : "text-icm-text-dim"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-icm-text truncate">
                          {a.name}
                          {a.autoGenerated && (
                            <span className="ml-1.5 text-[10.5px] font-normal text-icm-accent">(auto-generated)</span>
                          )}
                        </p>
                        <p className="text-[10.5px] font-mono text-icm-text-faint">{a.size}</p>
                      </div>
                      <button
                        onClick={() => toast.success(`Downloading ${a.name}`)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-icm-text-dim hover:bg-icm-bg"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11.5px] text-icm-text-faint">No documents attached.</p>
              )}
            </InfoCard>

            <InfoCard title="Follow-up & tracking">
              <Row k="Method" v={referral.referralMethod ?? "—"} />
              <Row k="Reference" v={referral.referenceNumber ?? "—"} />
              <Row k="Follow-up date" v={referral.followUpDate ?? "—"} />
              <Row k="Timeframe" v={referral.expectedTimeframe ?? "—"} />
              <Row k="Assigned to" v={referral.assignedTo} />
            </InfoCard>

            {referral.outcomeNotes && (
              <InfoCard title="Outcome">
                <p className="text-[11.5px] text-icm-text-dim leading-relaxed">{referral.outcomeNotes}</p>
                {referral.serviceStartDate && (
                  <p className="text-[10.5px] text-icm-text-faint mt-1">
                    Service started {referral.serviceStartDate}
                  </p>
                )}
              </InfoCard>
            )}
          </div>

          {/* RIGHT — Conversation history */}
          <aside className="space-y-3">
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4 sticky top-3">
              <div className="mb-3">
                <h2 className="font-manrope font-bold text-[14px] text-icm-text">Conversation History</h2>
                <p className="text-[11.5px] text-icm-text-dim mt-0.5">
                  Log all communication with this provider
                </p>
              </div>

              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {(referral.conversation ?? []).length === 0 && (
                  <p className="text-[11.5px] text-icm-text-faint">No communication logged yet.</p>
                )}
                {(referral.conversation ?? []).map((e) => {
                  const badge = convoBadge[e.type];
                  return (
                    <div key={e.id} className="flex gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-icm-accent text-white font-semibold text-[11px] flex items-center justify-center shrink-0">
                        {e.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[12px] font-semibold text-icm-text">{e.by}</span>
                          <span className="text-[10.5px] font-mono text-icm-text-faint">{e.date}</span>
                        </div>
                        <span
                          className={`mt-1 inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded-full font-semibold ring-1 ${badge.cls}`}
                        >
                          {badge.icon} {badge.label}
                        </span>
                        <p className="text-[12px] text-icm-text mt-1.5 leading-relaxed">{e.message}</p>
                        {e.status && (
                          <p className="text-[10.5px] text-icm-text-faint mt-0.5">Status: {e.status}</p>
                        )}
                        {e.attachments && e.attachments.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {e.attachments.map((f) => (
                              <li
                                key={f}
                                className="text-[10.5px] text-icm-text-dim inline-flex items-center gap-1 mr-2"
                              >
                                <Paperclip className="w-2.5 h-2.5" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-icm-border">
                {!logging ? (
                  <button
                    onClick={() => setLogging(true)}
                    className="w-full h-9 rounded-xl border border-icm-accent text-icm-accent text-[12px] font-semibold hover:bg-icm-accent-soft inline-flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Log communication
                  </button>
                ) : (
                  <LogCommunicationForm
                    onCancel={() => setLogging(false)}
                    onSave={async (entry) => {
                      try {
                        await updateReferral(referral.id, {
                          conversation: [...referral.conversation, entry] as any,
                        });
                        setLogging(false);
                        toast.success("Communication logged");
                      } catch (err) {
                        console.error(err);
                        toast.error("Failed to log communication");
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {showUpdate && (
        <UpdateStatusModal
          currentStatus={referral.status as ReferralStatus}
          onClose={() => setShowUpdate(false)}
          onSave={async (newStatus, event, extras) => {
            try {
              await updateReferral(referral.id, {
                status: newStatus as any,
                lastActivity: event.date.split(" ")[0],
                timeline: [...referral.timeline, event] as any,
                ...extras,
              });
              setShowUpdate(false);
              toast.success("Referral status updated successfully");
            } catch (err) {
              console.error(err);
              toast.error("Failed to update status");
            }
          }}
        />
      )}
    </ICMShell>
  );
};

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-[12px] py-0.5">
      <span className="text-icm-text-faint">{k}</span>
      <span className="text-icm-text font-medium text-right">{v}</span>
    </div>
  );
}

function LogCommunicationForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (e: ConversationEntry) => void;
}) {
  const [type, setType] = useState<ConversationKind>("note");
  const [message, setMessage] = useState("");

  const save = () => {
    if (!message.trim()) {
      toast.error("Please describe what happened");
      return;
    }
    const now = new Date();
    const fmt = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()} ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    onSave({
      id: `c-${Date.now()}`,
      type,
      by: "Kathy Adams",
      initials: "KA",
      date: fmt,
      message: message.trim(),
    });
  };

  return (
    <div className="space-y-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as ConversationKind)}
        className="h-8 w-full px-2 rounded-lg border border-icm-border bg-icm-panel text-[12px] text-icm-text focus:outline-none focus:border-icm-accent"
      >
        <option value="email">Email sent</option>
        <option value="phone">Phone call</option>
        <option value="note">Note</option>
        <option value="status">Status update</option>
      </select>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="What happened?"
        className="w-full px-2 py-1.5 rounded-lg border border-icm-border bg-icm-panel text-[12px] text-icm-text focus:outline-none focus:border-icm-accent min-h-[70px]"
      />
      <div className="flex justify-end items-center gap-2">
        <button
          onClick={onCancel}
          className="text-[11.5px] font-semibold text-icm-text-dim hover:text-icm-text"
        >
          Cancel
        </button>
        <button
          onClick={save}
          className="h-8 px-3 rounded-lg bg-icm-accent text-white text-[11.5px] font-semibold hover:opacity-90"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function UpdateStatusModal({
  currentStatus,
  onClose,
  onSave,
}: {
  currentStatus: ReferralStatus;
  onClose: () => void;
  onSave: (s: ReferralStatus, event: TimelineEvent, extras: any) => void;
}) {
  const [status, setStatus] = useState<ReferralStatus>(currentStatus);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("");
  const [reason, setReason] = useState("");

  const closingSuccess = status === "Closed — Successful";
  const closingFail = status === "Closed — Unsuccessful";

  const save = () => {
    const fmt = (() => {
      const [y, m, d] = date.split("-");
      return `${m}/${d}/${y}`;
    })();
    const event: TimelineEvent = {
      id: `t-${Date.now()}`,
      date: fmt,
      type:
        status === "Connected" || status === "Accepted"
          ? "accepted"
          : status === "Closed — Successful"
            ? "closed"
            : status === "Closed — Unsuccessful"
              ? "declined"
              : "status-update",
      title: `Status updated to ${status}`,
      notes: notes || outcome || reason || undefined,
      by: "Kathy Adams",
    };
    onSave(status, event, {
      outcomeNotes: closingSuccess ? outcome : undefined,
      closeReason: closingFail ? reason : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-icm-panel rounded-2xl shadow-elevated max-w-lg w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-manrope font-bold text-[15px] text-icm-text">Edit Referral Status</h3>
          <button onClick={onClose} className="w-6 h-6 rounded text-icm-text-faint hover:text-icm-text">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1 block">
              New status <span className="text-icm-red">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ReferralStatus)}
              className="h-9 w-full px-3 rounded-lg border border-icm-border bg-icm-panel text-[12.5px] font-geist text-icm-text focus:outline-none focus:border-icm-accent"
            >
              {REFERRAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1 block">
              Date of update
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 w-full px-3 rounded-lg border border-icm-border bg-icm-panel text-[12.5px] font-geist text-icm-text focus:outline-none focus:border-icm-accent"
            />
          </div>
          <div>
            <label className="text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1 block">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Describe what happened in this update"
              className="w-full px-3 py-2 rounded-lg border border-icm-border bg-icm-panel text-[12.5px] font-geist text-icm-text focus:outline-none focus:border-icm-accent min-h-[80px]"
            />
          </div>
          {closingSuccess && (
            <div>
              <label className="text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1 block">
                Outcome notes <span className="text-icm-red">*</span>
              </label>
              <textarea
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                rows={2}
                placeholder="Describe the outcome — what service did the individual receive?"
                className="w-full px-3 py-2 rounded-lg border border-icm-border bg-icm-panel text-[12.5px] font-geist text-icm-text focus:outline-none focus:border-icm-accent min-h-[60px]"
              />
            </div>
          )}
          {closingFail && (
            <div>
              <label className="text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1 block">
                Reason <span className="text-icm-red">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-9 w-full px-3 rounded-lg border border-icm-border bg-icm-panel text-[12.5px] font-geist text-icm-text focus:outline-none focus:border-icm-accent"
              >
                <option value="">Select reason…</option>
                <option>Provider not available</option>
                <option>Not accepting</option>
                <option>Individual declined</option>
                <option>Eligibility issue</option>
                <option>Geographic barrier</option>
                <option>Financial barrier</option>
                <option>Individual circumstances changed</option>
                <option>Other</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-semibold text-icm-text-dim hover:text-icm-text"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-semibold hover:opacity-90"
          >
            Save update
          </button>
        </div>
      </div>
    </div>
  );
}

export default PersonReferralDetail;
