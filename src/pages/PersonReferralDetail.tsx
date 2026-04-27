import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Printer,
  X,
  Plus,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { getPerson } from "@/data/people";
import {
  getReferral,
  REFERRAL_STATUSES,
  statusTone,
  updateReferralStatus,
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

const dotByType: Record<string, string> = {
  created: "bg-icm-accent",
  submitted: "bg-icm-accent",
  responded: "bg-icm-green",
  accepted: "bg-icm-green",
  started: "bg-icm-green",
  "follow-up": "bg-icm-amber",
  "status-update": "bg-icm-amber",
  declined: "bg-icm-red",
  unavailable: "bg-icm-red",
  closed: "bg-icm-text-faint",
};

const PersonReferralDetail = () => {
  const { id, referralId } = useParams<{ id: string; referralId: string }>();
  const navigate = useNavigate();
  const person = getPerson(id ?? "");
  const referral = getReferral(referralId ?? "");
  const [tick, setTick] = useState(0);
  const [showUpdate, setShowUpdate] = useState(false);

  if (!person || !referral) {
    return (
      <ICMShell title="Referral" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Referral not found.</p>
      </ICMShell>
    );
  }

  const tone = statusTone(referral.status);

  return (
    <ICMShell title="Referral" showAIPanel={false}>
      <div className="space-y-5 max-w-[1000px] mx-auto">
        <button
          onClick={() => navigate(`/people/${id}/referrals`)}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Referrals
        </button>

        {/* Header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-icm-bg text-icm-text-dim ring-1 ring-icm-border">
                {referral.id}
              </span>
              <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-icm-bg text-icm-text-dim ring-1 ring-icm-border font-semibold">
                {referral.type}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${statusToneClass[tone]}`}
              >
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
              {person.firstName} {person.lastName} · Created {referral.date} · Assigned to {referral.assignedTo}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowUpdate(true)}
              className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-semibold hover:opacity-90"
            >
              Update status
            </button>
            <button
              onClick={() => window.print()}
              className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-semibold text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1.5"
            >
              <Printer className="w-3 h-3" />
              Print
            </button>
          </div>
        </div>

        {/* Stalled alert */}
        {referral.daysOpen >= 14 && !referral.status.startsWith("Closed") && (
          <div
            className={`rounded-xl border p-3 flex items-start gap-2 ${referral.daysOpen >= 30 ? "bg-icm-red-soft border-icm-red/20" : "bg-icm-amber-soft border-icm-amber/20"}`}
          >
            <AlertTriangle
              className={`w-3.5 h-3.5 mt-0.5 ${referral.daysOpen >= 30 ? "text-icm-red" : "text-icm-amber"}`}
            />
            <p className="text-[12px] font-geist text-icm-text">
              <span className="font-semibold">
                Referral has had no activity in {referral.daysOpen} days.
              </span>{" "}
              <span className="text-icm-text-dim">
                {referral.daysOpen >= 30
                  ? "Consider calling the provider or identifying an alternative."
                  : "Follow up may be needed."}
              </span>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Timeline */}
          <section className="rounded-xl border border-icm-border bg-icm-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-manrope font-bold text-[14px] text-icm-text">Timeline</h2>
              <button
                onClick={() => setShowUpdate(true)}
                className="h-7 px-2.5 rounded-lg border border-icm-border text-[11px] font-semibold text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add update
              </button>
            </div>
            <div className="relative pl-5">
              <div className="absolute left-1.5 top-1 bottom-1 w-px bg-icm-border" />
              <div className="space-y-4">
                {referral.timeline.map((e) => (
                  <div key={e.id} className="relative">
                    <div
                      className={`absolute -left-[18px] top-1 w-3 h-3 rounded-full ring-2 ring-icm-panel ${dotByType[e.type]}`}
                    />
                    <p className="text-[10.5px] font-mono text-icm-text-faint">{e.date}</p>
                    <p className="text-[12.5px] font-geist font-semibold text-icm-text mt-0.5">
                      {e.title}
                    </p>
                    {e.notes && (
                      <p className="text-[11.5px] text-icm-text-dim mt-0.5">{e.notes}</p>
                    )}
                    <p className="text-[10.5px] text-icm-text-faint mt-0.5">— {e.by}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Info side */}
          <aside className="space-y-3">
            <InfoCard title="Provider">
              <p className="font-manrope font-bold text-[12.5px] text-icm-text">
                {referral.providerName}
              </p>
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

            <InfoCard title="Reason">
              <p className="text-[11.5px] text-icm-text-dim leading-relaxed">{referral.reason}</p>
            </InfoCard>

            <InfoCard title="Follow-up">
              <Row k="Method" v={referral.referralMethod ?? "—"} />
              <Row k="Reference" v={referral.referenceNumber ?? "—"} />
              <Row k="Follow-up" v={referral.followUpDate ?? "—"} />
              <Row k="Timeframe" v={referral.expectedTimeframe ?? "—"} />
              <Row k="Priority" v={referral.priority} />
            </InfoCard>

            <InfoCard title="Consent">
              <p className="text-[11.5px] inline-flex items-center gap-1.5">
                {referral.consentDocumented ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-icm-green" />
                    <span className="text-icm-text">
                      Documented {referral.consentDate} ({referral.consentMethod})
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-icm-red" />
                    <span className="text-icm-red">Not documented</span>
                  </>
                )}
              </p>
            </InfoCard>

            {referral.linkedGoalLabel && (
              <InfoCard title="Linked goal">
                <p className="text-[11.5px] text-icm-text">{referral.linkedGoalLabel}</p>
              </InfoCard>
            )}

            {referral.outcomeNotes && (
              <InfoCard title="Outcome">
                <p className="text-[11.5px] text-icm-text-dim leading-relaxed">
                  {referral.outcomeNotes}
                </p>
                {referral.serviceStartDate && (
                  <p className="text-[10.5px] text-icm-text-faint mt-1">
                    Service started {referral.serviceStartDate}
                  </p>
                )}
              </InfoCard>
            )}
          </aside>
        </div>
      </div>

      {showUpdate && (
        <UpdateStatusModal
          currentStatus={referral.status}
          onClose={() => setShowUpdate(false)}
          onSave={(newStatus, event, extras) => {
            updateReferralStatus(referral.id, newStatus, event, extras);
            setShowUpdate(false);
            setTick((t) => t + 1);
          }}
        />
      )}
    </ICMShell>
  );
};

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-3">
      <p className="text-[10.5px] font-geist font-semibold text-icm-text-faint uppercase tracking-wide mb-1.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-[11.5px] py-0.5">
      <span className="text-icm-text-faint">{k}</span>
      <span className="text-icm-text font-medium">{v}</span>
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
          <h3 className="font-manrope font-bold text-[15px] text-icm-text">Update Referral Status</h3>
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
