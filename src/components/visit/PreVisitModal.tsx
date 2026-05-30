import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  X,
  Video,
  Calendar,
  Mail,
  Phone,
  Link2,
  Plus,
  Sparkles,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { demoSuccess } from "@/lib/demoToast";
import { toast } from "sonner";
import { createScheduledVisit } from "@/hooks/useScheduledVisits";
import { useAuth } from "@/contexts/AuthContext";

interface Participant {
  id: string;
  name: string;
  contact: string;
  method: "email" | "sms" | "link";
  required?: boolean;
  role?: string;
}

interface PreVisitModalProps {
  open: boolean;
  onClose: () => void;
  personId: string;
  personName: string;
  guardianName?: string;
  guardianContact?: string;
}

const purposes = [
  "Quarterly check-in",
  "Annual ISP review",
  "Care team meeting",
  "Service review",
  "Emergency check-in",
  "Other",
];

export function PreVisitModal({
  open,
  onClose,
  personId,
  personName,
  guardianName = "Linda Brown",
  guardianContact = "linda.brown@email.com",
}: PreVisitModalProps) {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [purpose, setPurpose] = useState("Quarterly check-in");
  const [includeIndividual, setIncludeIndividual] = useState(true);
  const [includeGuardian, setIncludeGuardian] = useState(true);
  const [extras, setExtras] = useState<Participant[]>([]);
  const [consent, setConsent] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [sendIcs, setSendIcs] = useState(true);
  const [briefExpanded, setBriefExpanded] = useState(false);

  const addExtra = () => {
    setExtras((s) => [
      ...s,
      { id: `p_${Date.now()}`, name: "", contact: "", method: "email" },
    ]);
  };

  const updateExtra = (id: string, patch: Partial<Participant>) => {
    setExtras((s) => s.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removeExtra = (id: string) => {
    setExtras((s) => s.filter((p) => p.id !== id));
  };

  const canStart = consent && (scheduleMode === "now" || (scheduleDate && scheduleTime));

  const startVisit = async () => {
    if (scheduleMode === "later" && scheduleDate && scheduleTime) {
      // ── "Schedule for later" → write to scheduled_visits ─────────────────
      try {
        await createScheduledVisit({
          organizationId:  userProfile?.organizationId ?? "org-1",
          individual_id:   personId,
          individual_name: personName,
          visit_type:      "Virtual Visit",
          visit_date:      scheduleDate,
          start_time:      scheduleTime,
          end_time:        addHourPreVisit(scheduleTime),
          location:        "Virtual / Video call",
          assigned_to:     userProfile?.uid ?? "",
          assigned_to_name: userProfile?.displayName ?? "",
          notes:           `Purpose: ${purpose}`,
          reminder:        true,
          reminder_timing: "1h",
          reminder_sent:   false,
          status:          "scheduled",
          created_by:      userProfile?.uid ?? "",
        });
        toast.success(`Virtual visit scheduled for ${scheduleDate} at ${scheduleTime} — added to your calendar.`);
        onClose();
      } catch (err) {
        console.error("[PreVisitModal] schedule failed:", err);
        toast.error("Could not save the scheduled visit. Please try again.");
      }
      return;
    }
    // ── "Start now" → launch virtual visit session ────────────────────────
    const sessionId = `vs-${Date.now().toString(36)}`;
    const params = new URLSearchParams({
      person: personId,
      name: personName,
      purpose,
    });
    onClose();
    navigate(`/visit/${sessionId}?${params.toString()}`);
  };

  function addHourPreVisit(hhmm: string): string {
    const [h, m] = hhmm.split(":").map(Number);
    const total = h * 60 + (m || 0) + 60;
    return `${String(Math.floor(total / 60) % 24).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-icm-panel rounded-2xl border border-icm-border shadow-2xl w-full max-w-[640px] max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col">
              {/* Header */}
              <div className="px-5 py-4 border-b border-icm-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-icm-green-soft text-icm-green flex items-center justify-center ring-1 ring-icm-green/20">
                    <Video className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="font-manrope font-bold text-[15px] text-icm-text">
                      Start Virtual Visit
                    </h2>
                    <p className="text-[11.5px] font-geist text-icm-text-dim">
                      {personName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-icm-bg flex items-center justify-center text-icm-text-dim"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body (scrollable) */}
              <div className="overflow-y-auto p-5 space-y-5">
                {/* AI Brief */}
                <div className="rounded-xl bg-icm-accent-soft border border-icm-accent/20 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-manrope font-bold text-[12.5px] text-icm-text">
                        AI pre-visit brief
                      </p>
                      <p className="text-[12px] font-geist text-icm-text-dim mt-1 leading-relaxed">
                        Before this visit I reviewed {personName.split(" ")[0]}'s
                        record. 3 things worth discussing:
                      </p>
                      <ol className="mt-2 space-y-1 text-[12px] font-geist text-icm-text">
                        <li>1. ISP renewal is 25 days overdue</li>
                        <li>2. Behavioral changes reported by mother</li>
                        <li>
                          3. Employment interest mentioned twice in recent
                          sessions
                        </li>
                      </ol>
                      {briefExpanded && (
                        <div className="mt-2 text-[11.5px] font-geist text-icm-text-dim leading-relaxed border-t border-icm-accent/15 pt-2">
                          Last visit summary cited a positive engagement at the
                          day program. HRST score is stable at 2. Medicaid
                          renewal due in 47 days. Mother flagged sleep changes
                          on 04/08.
                        </div>
                      )}
                      <button
                        onClick={() => setBriefExpanded((v) => !v)}
                        className="mt-1.5 text-[11.5px] font-geist font-semibold text-icm-accent hover:underline"
                      >
                        {briefExpanded ? "Hide brief" : "View full brief →"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Visit details */}
                <div>
                  <SectionLabel>Visit details</SectionLabel>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <Field label="Individual">
                      <div className="h-9 px-2.5 rounded-xl border border-icm-border bg-icm-bg flex items-center text-[12px] font-geist text-icm-text">
                        {personName}
                      </div>
                    </Field>
                    <Field label="Visit type">
                      <div className="h-9 px-2.5 rounded-xl border border-icm-border bg-icm-bg flex items-center gap-1.5 text-[12px] font-geist text-icm-text">
                        <Video className="w-3 h-3 text-icm-green" />
                        Virtual Visit
                      </div>
                    </Field>
                    <Field label="Purpose" full>
                      <select
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        className="w-full h-9 px-2.5 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
                      >
                        {purposes.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <SectionLabel>Participants</SectionLabel>
                  <p className="text-[11.5px] font-geist text-icm-text-dim mb-2">
                    Who will be in this visit?
                  </p>

                  <ParticipantToggle
                    on={includeIndividual}
                    onChange={setIncludeIndividual}
                    name={personName}
                    role="Individual"
                    contact={`${personName.toLowerCase().replace(" ", ".")}@email.com`}
                  />
                  <ParticipantToggle
                    on={includeGuardian}
                    onChange={setIncludeGuardian}
                    name={guardianName}
                    role="Guardian / Mother"
                    contact={guardianContact}
                  />

                  {extras.map((p) => (
                    <div
                      key={p.id}
                      className="mt-2 rounded-xl border border-icm-border bg-icm-bg p-2.5 grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center"
                    >
                      <input
                        placeholder="Name"
                        value={p.name}
                        onChange={(e) => updateExtra(p.id, { name: e.target.value })}
                        className="h-8 px-2 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
                      />
                      <input
                        placeholder="Email or phone"
                        value={p.contact}
                        onChange={(e) =>
                          updateExtra(p.id, { contact: e.target.value })
                        }
                        className="h-8 px-2 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
                      />
                      <select
                        value={p.method}
                        onChange={(e) =>
                          updateExtra(p.id, {
                            method: e.target.value as Participant["method"],
                          })
                        }
                        className="h-8 px-2 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-geist text-icm-text"
                      >
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="link">Copy link</option>
                      </select>
                      <button
                        onClick={() => removeExtra(p.id)}
                        className="w-8 h-8 rounded-lg hover:bg-icm-red-soft text-icm-text-dim hover:text-icm-red flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={addExtra}
                    className="mt-2 h-8 px-2.5 rounded-lg border border-dashed border-icm-border text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3 h-3" /> Add participant
                  </button>
                </div>

                {/* Schedule */}
                <div>
                  <SectionLabel>Schedule</SectionLabel>
                  <div className="space-y-1.5 mt-2">
                    <RadioRow
                      label="Start now"
                      checked={scheduleMode === "now"}
                      onChange={() => setScheduleMode("now")}
                    />
                    <RadioRow
                      label="Schedule for later"
                      checked={scheduleMode === "later"}
                      onChange={() => setScheduleMode("later")}
                    />
                    {scheduleMode === "later" && (
                      <div className="ml-6 mt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="h-9 px-2.5 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
                          />
                          <input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="h-9 px-2.5 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-[12px] font-geist text-icm-text">
                          <input
                            type="checkbox"
                            checked={sendIcs}
                            onChange={(e) => setSendIcs(e.target.checked)}
                          />
                          Send calendar invite (.ics)
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Consent */}
                <div className="rounded-xl border border-icm-amber/30 bg-icm-amber-soft p-3.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-icm-amber shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[12px] font-geist text-icm-text leading-relaxed">
                        This visit will be recorded for documentation purposes
                        using AI ambient listening.
                      </p>
                      <label className="mt-2 flex items-start gap-2 text-[12px] font-geist text-icm-text cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>
                          I confirm all participants will be informed that this
                          session will be recorded and processed by AI.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-icm-border flex items-center justify-end gap-2 shrink-0 bg-icm-panel">
                <button
                  onClick={onClose}
                  className="h-9 px-3.5 rounded-xl text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text"
                >
                  Cancel
                </button>
                <button
                  disabled={!consent}
                  onClick={() => {
                    demoSuccess("Invite sent to participants");
                    onClose();
                  }}
                  className="h-9 px-3.5 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text hover:border-icm-border-strong disabled:opacity-40"
                >
                  Send invite only
                </button>
                <button
                  onClick={startVisit}
                  disabled={!canStart}
                  className="h-9 px-3.5 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-1.5"
                >
                  {scheduleMode === "now" ? (
                    <>
                      <Video className="w-3.5 h-3.5" />
                      Send invites & start now
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3.5 h-3.5" />
                      Schedule visit
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-1">
      {children}
    </p>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function RadioRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <span
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
          checked ? "border-icm-accent" : "border-icm-border"
        }`}
      >
        {checked && <span className="w-2 h-2 rounded-full bg-icm-accent" />}
      </span>
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className="text-[12.5px] font-geist text-icm-text">{label}</span>
    </label>
  );
}

function ParticipantToggle({
  on,
  onChange,
  name,
  role,
  contact,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  name: string;
  role: string;
  contact: string;
}) {
  return (
    <div className="mt-2 rounded-xl border border-icm-border bg-icm-bg p-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-icm-accent-soft text-icm-accent flex items-center justify-center text-[11px] font-manrope font-bold shrink-0">
          {name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)}
        </div>
        <div className="min-w-0">
          <p className="text-[12.5px] font-geist font-semibold text-icm-text truncate">
            {name}
            <span className="ml-1.5 text-[10.5px] font-medium text-icm-text-dim">
              {role}
            </span>
          </p>
          <p className="text-[11px] font-geist text-icm-text-dim truncate inline-flex items-center gap-1">
            <Mail className="w-2.5 h-2.5" />
            {contact}
          </p>
        </div>
      </div>
      <button
        onClick={() => onChange(!on)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
          on ? "bg-icm-accent" : "bg-icm-border"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            on ? "translate-x-4" : ""
          }`}
        />
      </button>
    </div>
  );
}
