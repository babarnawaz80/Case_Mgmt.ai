/**
 * ScheduleVisitModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Universal scheduling form, usable as a slide-over modal from:
 *   • Dashboard "Today's Schedule" section
 *   • Individual eChart → Visit Summary tile → "Schedule Visit"
 *   • My Work → task row quick-action
 *
 * Props:
 *   open           – controls visibility
 *   onClose        – dismiss callback
 *   individualId   – pre-selects the individual (optional)
 *   initialDate    – pre-fills the date (optional, YYYY-MM-DD)
 *   onSaved        – called with the new visit id after save
 */

import { useEffect, useMemo, useState } from "react";
import {
  X, CalendarPlus, MapPin, Users, Bell, Link2,
  Clock, CheckCircle2, Loader2, Search, Video, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { staffDisplayName } from "@/lib/userName";
import { useAuth } from "@/contexts/AuthContext";
import { useIndividual, useIndividuals } from "@/hooks/useIndividuals";
import { useCarePlans } from "@/hooks/useFirestore";
import { createScheduledVisit, createTask } from "./scheduleHelpers";
import {
  VISIT_TYPES, REMINDER_TIMINGS,
  type VisitType, type ReminderTiming,
} from "@/hooks/useScheduledVisits";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgUser {
  uid: string;
  displayName: string;
  role: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide mb-1">
        {label}
        {required && <span className="text-icm-red ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full h-9 rounded-lg border border-icm-border bg-white px-2.5 text-[13px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:ring-2 focus:ring-icm-accent/40";

const selectCls =
  "w-full h-9 rounded-lg border border-icm-border bg-white px-2.5 text-[13px] font-geist text-icm-text focus:outline-none focus:ring-2 focus:ring-icm-accent/40";

// ─── Individual search select ─────────────────────────────────────────────────

function IndividualSearchSelect({
  selectedId,
  selectedName,
  onSelect,
}: {
  selectedId?: string;
  selectedName?: string;
  onSelect: (id: string, name: string) => void;
}) {
  const { individuals } = useIndividuals();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    const active = individuals.filter((p) => p.enrollment_status === "active");
    if (!term) return active.slice(0, 40);
    return active
      .filter(
        (p) =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(term) ||
          p.id.toLowerCase().includes(term)
      )
      .slice(0, 40);
  }, [individuals, q]);

  const displayName =
    selectedName ||
    (selectedId
      ? individuals.find((p) => p.id === selectedId)
          ? `${individuals.find((p) => p.id === selectedId)!.last_name}, ${individuals.find((p) => p.id === selectedId)!.first_name}`
          : selectedId
      : "");

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-icm-text-dim absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          value={open ? q : displayName}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search individuals…"
          className={`${inputCls} pl-8`}
        />
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-icm-border bg-white shadow-xl max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-[12px] text-icm-text-dim">
              No individuals found
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-icm-bg transition-colors"
                onMouseDown={() => {
                  onSelect(p.id, `${p.last_name}, ${p.first_name}`);
                  setQ("");
                  setOpen(false);
                }}
              >
                <div className="w-7 h-7 rounded-lg bg-icm-accent-soft flex items-center justify-center text-[11px] font-bold text-icm-accent shrink-0">
                  {p.first_name[0]}{p.last_name[0]}
                </div>
                <div>
                  <p className="text-[12.5px] font-geist font-semibold text-icm-text">
                    {p.last_name}, {p.first_name}
                  </p>
                  <p className="text-[10.5px] font-mono text-icm-text-dim">{p.id}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  individualId?: string;
  initialDate?: string;
  onSaved?: (visitId: string) => void;
}

export function ScheduleVisitModal({ open, onClose, individualId: propIndividualId, initialDate, onSaved }: Props) {
  const { userProfile } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  // ── Form state ────────────────────────────────────────────────────────────
  const [individualId, setIndividualId] = useState(propIndividualId ?? "");
  const [individualName, setIndividualName] = useState("");
  const [visitType, setVisitType] = useState<VisitType>("In-Home Visit");
  const [visitDate, setVisitDate] = useState(initialDate ?? today);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [location, setLocation] = useState("");
  const [assignedTo, setAssignedTo] = useState(userProfile?.uid ?? "");
  const [assignedToName, setAssignedToName] = useState(userProfile?.displayName ?? "");
  const [linkedGoalId, setLinkedGoalId] = useState("");
  const [linkedGoalText, setLinkedGoalText] = useState("");
  const [linkedTaskId, setLinkedTaskId] = useState("");
  const [linkedTaskTitle, setLinkedTaskTitle] = useState("");
  // Televisit-specific fields
  const [tvPlatform, setTvPlatform] = useState<"zoom"|"teams"|"meet"|"">("");
  const [tvMeetingLink, setTvMeetingLink] = useState("");

  const isTelevisit = visitType === "Televisit / Video Call";
  const [notes, setNotes] = useState("");
  const [reminder, setReminder] = useState(false);
  const [reminderTiming, setReminderTiming] = useState<ReminderTiming>("1h");
  const [saving, setSaving] = useState(false);

  // ── Supporting data ───────────────────────────────────────────────────────
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [indTasks, setIndTasks] = useState<{ id: string; title: string }[]>([]);
  const { individual } = useIndividual(individualId || undefined);
  const { data: carePlans } = useCarePlans(individualId || undefined);

  // Load org users once
  useEffect(() => {
    if (!userProfile?.organizationId) return;
    getDocs(
      query(collection(db, "users"), where("organizationId", "==", userProfile.organizationId))
    ).then((snap) => {
      setOrgUsers(
        snap.docs.map((d) => ({
          uid: d.id,
          displayName: staffDisplayName(d.data(), d.id),
          role: d.data().role ?? "",
        }))
      );
    }).catch(() => {});
  }, [userProfile?.organizationId]);

  // Set defaults from logged-in user
  useEffect(() => {
    if (userProfile?.uid && !assignedTo) {
      setAssignedTo(userProfile.uid);
      setAssignedToName(userProfile.displayName ?? "");
    }
  }, [userProfile?.uid, userProfile?.displayName]);

  // Pre-fill when propIndividualId changes
  useEffect(() => {
    if (propIndividualId) setIndividualId(propIndividualId);
  }, [propIndividualId]);

  // Pre-fill location from individual's address
  useEffect(() => {
    if (individual && !location) {
      const parts = [
        individual.address_street,
        individual.address_city,
        individual.address_state,
        individual.address_zip,
      ].filter(Boolean);
      if (parts.length) {
        setLocation(parts.join(", "));
      } else if (individual.address) {
        setLocation(individual.address);
      }
    }
  }, [individual]);

  // Pre-fill individual name from resolved individual
  useEffect(() => {
    if (individual && !individualName) {
      setIndividualName(`${individual.last_name}, ${individual.first_name}`);
    }
  }, [individual]);

  // Load individual's open tasks for the "Linked Monitoring Task" dropdown
  useEffect(() => {
    if (!individualId || !userProfile?.organizationId) { setIndTasks([]); return; }
    getDocs(
      query(
        collection(db, "tasks"),
        where("organizationId", "==", userProfile.organizationId),
        where("individualId", "==", individualId),
      )
    ).then((snap) => {
      setIndTasks(
        snap.docs
          .filter((d) => d.data().status !== "completed")
          .map((d) => ({ id: d.id, title: d.data().title ?? "Untitled" }))
      );
    }).catch(() => {});
  }, [individualId, userProfile?.organizationId]);

  // Goals from the most recent active care plan
  const goals = useMemo(() => {
    if (!carePlans.length) return [];
    const active = carePlans.find((cp) => cp.status === "Active") ?? carePlans[0];
    return (active?.goals ?? []).filter((g) => g.goal);
  }, [carePlans]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setIndividualId(propIndividualId ?? "");
      setIndividualName("");
      setVisitType("In-Home Visit");
      setVisitDate(initialDate ?? today);
      setStartTime("10:00");
      setEndTime("11:00");
      setLocation("");
      setLinkedGoalId("");
      setLinkedGoalText("");
      setLinkedTaskId("");
      setLinkedTaskTitle("");
      setNotes("");
      setReminder(false);
      setReminderTiming("1h");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleIndividualSelect = (id: string, name: string) => {
    setIndividualId(id);
    setIndividualName(name);
    setLocation(""); // will be re-filled by the useEffect above
    setLinkedGoalId("");
    setLinkedGoalText("");
    setLinkedTaskId("");
    setLinkedTaskTitle("");
  };

  const handleSave = async () => {
    if (!individualId) { toast.error("Please select an individual."); return; }
    if (!visitDate)    { toast.error("Please set a visit date."); return; }
    if (!startTime || !endTime) { toast.error("Please set start and end times."); return; }
    if (!userProfile?.organizationId) { toast.error("Not authenticated."); return; }

    setSaving(true);
    try {
      const visitId = await createScheduledVisit({
        organizationId: userProfile.organizationId,
        individual_id: individualId,
        individual_name: individualName,
        visit_type: visitType,
        visit_date: visitDate,
        start_time: startTime,
        end_time: endTime,
        location: isTelevisit ? (tvPlatform ? `Virtual — ${tvPlatform === "zoom" ? "Zoom" : tvPlatform === "teams" ? "Teams" : "Google Meet"}` : "Virtual") : (location || "TBD"),
        assigned_to: assignedTo || userProfile.uid,
        assigned_to_name: assignedToName || (userProfile.displayName ?? ""),
        linked_goal_id: linkedGoalId || undefined,
        linked_goal_text: linkedGoalText || undefined,
        linked_task_id: linkedTaskId || undefined,
        linked_task_title: linkedTaskTitle || undefined,
        notes: notes || undefined,
        reminder,
        reminder_timing: reminder ? reminderTiming : undefined,
        reminder_sent: false,
        status: "scheduled",
        created_by: userProfile.uid,
      });

      // Auto-create a My Work task: "Complete visit documentation for [name]"
      await createTask({
        title: `Complete visit documentation for ${individualName || "individual"}`,
        description: `Follow-up documentation for ${visitType} on ${visitDate} at ${startTime}.`,
        individualId,
        individualName,
        dueDate: visitDate,
        status: "open",
        priority: "medium",
        type: "Visit Scheduled",
        assignedTo: assignedTo || userProfile.uid,
        organizationId: userProfile.organizationId,
        linkedVisitId: visitId,
      });

      toast.success("Visit scheduled!");
      onSaved?.(visitId);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to schedule visit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-icm-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-icm-accent-soft flex items-center justify-center">
              <CalendarPlus className="w-4 h-4 text-icm-accent" />
            </div>
            <div>
              <h2 className="font-manrope font-bold text-[15px] text-icm-text">Schedule a Visit</h2>
              <p className="text-[11px] text-icm-text-dim font-geist">
                {individualName || "Select an individual to begin"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-icm-bg flex items-center justify-center text-icm-text-dim transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* ── Individual ─────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionLabel icon={<Users className="w-3.5 h-3.5" />} title="Person Supported" />
            <Field label="Individual" required>
              {propIndividualId ? (
                <div className={`${inputCls} flex items-center cursor-not-allowed bg-icm-bg`}>
                  <span className="text-icm-text">{individualName || propIndividualId}</span>
                </div>
              ) : (
                <IndividualSearchSelect
                  selectedId={individualId}
                  selectedName={individualName}
                  onSelect={handleIndividualSelect}
                />
              )}
            </Field>
          </section>

          {/* ── Visit details ───────────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionLabel icon={<CalendarPlus className="w-3.5 h-3.5" />} title="Visit Details" />
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Visit Type" required>
                  <select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value as VisitType)}
                    className={selectCls}
                  >
                    {VISIT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Visit Date" required>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Start Time" required>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="End Time" required>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* ── Location / Televisit ────────────────────────────────────────── */}
          {isTelevisit ? (
            <section className="space-y-3">
              <SectionLabel icon={<Video className="w-3.5 h-3.5" />} title="Video Platform" />
              <div className="grid grid-cols-3 gap-2">
                {(["zoom","teams","meet"] as const).map((p) => {
                  const labels = { zoom:"Zoom", teams:"Teams", meet:"Google Meet" };
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTvPlatform(tvPlatform === p ? "" : p)}
                      className={`h-9 rounded-lg text-[12px] font-geist font-semibold border transition-all ${
                        tvPlatform === p
                          ? "bg-teal-600 text-white border-teal-600"
                          : "border-icm-border text-icm-text hover:border-teal-400 bg-white"
                      }`}
                    >
                      {labels[p]}
                    </button>
                  );
                })}
              </div>
              <Field label="Meeting Link (optional)">
                <div className="relative">
                  <Link2 className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-icm-text-dim pointer-events-none" />
                  <input
                    value={tvMeetingLink}
                    onChange={(e) => setTvMeetingLink(e.target.value)}
                    placeholder="Paste Zoom / Teams / Meet link…"
                    className={`${inputCls} pl-8`}
                  />
                </div>
              </Field>
            </section>
          ) : (
            <section className="space-y-3">
              <SectionLabel icon={<MapPin className="w-3.5 h-3.5" />} title="Location" />
              <Field label="Address / Location">
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Pre-fills from individual profile…"
                  className={inputCls}
                />
              </Field>
            </section>
          )}

          {/* ── Assigned Staff ───────────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionLabel icon={<Users className="w-3.5 h-3.5" />} title="Assigned Staff" />
            <Field label="Staff Member">
              <select
                value={assignedTo}
                onChange={(e) => {
                  const user = orgUsers.find((u) => u.uid === e.target.value);
                  setAssignedTo(e.target.value);
                  setAssignedToName(user?.displayName ?? "");
                }}
                className={selectCls}
              >
                {orgUsers.length === 0 && (
                  <option value={userProfile?.uid ?? ""}>
                    {userProfile?.displayName ?? "Me"} (you)
                  </option>
                )}
                {orgUsers.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName}
                    {u.uid === userProfile?.uid ? " (you)" : ""}
                    {u.role ? ` · ${u.role}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </section>

          {/* ── Linked Plan / Task ───────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionLabel icon={<Link2 className="w-3.5 h-3.5" />} title="Linked Plan &amp; Task (optional)" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Linked Plan Goal">
                <select
                  value={linkedGoalId}
                  onChange={(e) => {
                    setLinkedGoalId(e.target.value);
                    const g = goals.find((g) => g.id === e.target.value);
                    setLinkedGoalText(g?.goal ?? "");
                  }}
                  className={selectCls}
                  disabled={!individualId || goals.length === 0}
                >
                  <option value="">— None —</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.goal?.slice(0, 60)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Linked Monitoring Task">
                <select
                  value={linkedTaskId}
                  onChange={(e) => {
                    setLinkedTaskId(e.target.value);
                    const t = indTasks.find((t) => t.id === e.target.value);
                    setLinkedTaskTitle(t?.title ?? "");
                  }}
                  className={selectCls}
                  disabled={!individualId || indTasks.length === 0}
                >
                  <option value="">— None —</option>
                  {indTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title.slice(0, 55)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Preparation Notes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes or preparation instructions for the visit…"
                rows={2}
                className={`${inputCls} h-auto py-2 resize-none`}
              />
            </Field>
          </section>

          {/* ── Reminder ────────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionLabel icon={<Bell className="w-3.5 h-3.5" />} title="Reminder" />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={reminder}
                  onClick={() => setReminder(!reminder)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    reminder ? "bg-icm-accent" : "bg-icm-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      reminder ? "translate-x-5" : ""
                    }`}
                  />
                </button>
                <span className="text-[13px] font-geist text-icm-text">
                  {reminder ? "Send reminder" : "No reminder"}
                </span>
              </label>
              {reminder && (
                <select
                  value={reminderTiming}
                  onChange={(e) => setReminderTiming(e.target.value as ReminderTiming)}
                  className="h-8 rounded-lg border border-icm-border bg-white px-2 text-[12.5px] font-geist text-icm-text focus:outline-none"
                >
                  {REMINDER_TIMINGS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              )}
            </div>
            {reminder && (
              <p className="text-[11.5px] text-icm-text-dim font-geist">
                A notification will be sent to the assigned staff member's inbox.
              </p>
            )}
          </section>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-icm-border bg-icm-bg shrink-0">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-xl border border-icm-border text-[13px] font-geist text-icm-text-dim hover:bg-icm-border/30 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !individualId}
            className="h-9 px-5 rounded-xl bg-icm-accent text-white text-[13px] font-geist font-semibold inline-flex items-center gap-2 hover:bg-icm-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
            ) : (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Save as Scheduled</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function SectionLabel({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-1.5 pb-1 border-b border-icm-border">
      <span className="text-icm-text-dim">{icon}</span>
      <h3 className="font-manrope font-bold text-[13px] text-icm-text">{title}</h3>
    </div>
  );
}
