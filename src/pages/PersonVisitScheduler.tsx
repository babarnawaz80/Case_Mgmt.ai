/**
 * PersonVisitScheduler
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-page visit scheduler accessible via /people/:id/visit-summary/schedule
 * Writes to Firestore scheduled_visits collection and creates a follow-up task.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, CalendarPlus, MapPin, Users, Bell,
  Link2, Clock, CheckCircle2, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual, riskAvatarClass } from "@/hooks/useIndividuals";
import { useAuth } from "@/contexts/AuthContext";
import { useCarePlans } from "@/hooks/useFirestore";
import {
  useScheduledVisits,
  createScheduledVisit,
  updateScheduledVisit,
  VISIT_TYPES,
  REMINDER_TIMINGS,
  VISIT_TYPE_COLORS,
  type VisitType,
  type ReminderTiming,
  type ScheduledVisit,
} from "@/hooks/useScheduledVisits";
import { createTask } from "@/hooks/useTasks";

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-medium text-icm-text-dim mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full h-9 rounded-md border border-icm-border bg-white px-2.5 text-[13px] font-geist";
const selectCls = "w-full h-9 rounded-md border border-icm-border bg-white px-2 text-[13px] font-geist";

function fmt12(time24: string): string {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ─── Page Component ───────────────────────────────────────────────────────────

const PersonVisitScheduler = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { individual, loading: indLoading } = useIndividual(id);
  const { visits, loading: visitsLoading } = useScheduledVisits(id);
  const { data: carePlans } = useCarePlans(id);

  const today = new Date().toISOString().slice(0, 10);

  // ── Form state ────────────────────────────────────────────────────────────
  const [visitType, setVisitType] = useState<VisitType>("In-Home Visit");
  const [visitDate, setVisitDate] = useState(today);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [location, setLocation] = useState("");
  const [assignedTo, setAssignedTo] = useState(userProfile?.uid ?? "");
  const [assignedToName, setAssignedToName] = useState(userProfile?.displayName ?? "");
  const [linkedGoalId, setLinkedGoalId] = useState("");
  const [linkedGoalText, setLinkedGoalText] = useState("");
  const [linkedTaskId, setLinkedTaskId] = useState("");
  const [linkedTaskTitle, setLinkedTaskTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [reminder, setReminder] = useState(false);
  const [reminderTiming, setReminderTiming] = useState<ReminderTiming>("1h");
  const [saving, setSaving] = useState(false);

  // ── Supporting data ───────────────────────────────────────────────────────
  const [orgUsers, setOrgUsers] = useState<{ uid: string; displayName: string; role: string }[]>([]);
  const [indTasks, setIndTasks] = useState<{ id: string; title: string }[]>([]);

  // Pre-fill address from individual profile
  useEffect(() => {
    if (individual && !location) {
      const parts = [
        individual.address_street,
        individual.address_city,
        individual.address_state,
        individual.address_zip,
      ].filter(Boolean);
      setLocation(parts.length ? parts.join(", ") : individual.address ?? "");
    }
  }, [individual]);

  // Defaults from logged-in user
  useEffect(() => {
    if (userProfile?.uid) {
      setAssignedTo(userProfile.uid);
      setAssignedToName(userProfile.displayName ?? "");
    }
  }, [userProfile?.uid]);

  // Load org users
  useEffect(() => {
    if (!userProfile?.organizationId) return;
    getDocs(
      query(collection(db, "users"), where("organizationId", "==", userProfile.organizationId))
    ).then((snap) => {
      setOrgUsers(
        snap.docs.map((d) => ({
          uid: d.id,
          displayName: d.data().displayName ?? d.data().firstName ?? d.id,
          role: d.data().role ?? "",
        }))
      );
    }).catch(() => {});
  }, [userProfile?.organizationId]);

  // Load individual's open tasks
  useEffect(() => {
    if (!id || !userProfile?.organizationId) return;
    getDocs(
      query(
        collection(db, "tasks"),
        where("organizationId", "==", userProfile.organizationId),
        where("individualId", "==", id),
      )
    ).then((snap) => {
      setIndTasks(
        snap.docs
          .filter((d) => d.data().status !== "completed")
          .map((d) => ({ id: d.id, title: d.data().title ?? "Untitled" }))
      );
    }).catch(() => {});
  }, [id, userProfile?.organizationId]);

  // Goals from most recent active care plan
  const goals = useMemo(() => {
    if (!carePlans.length) return [];
    const active = carePlans.find((cp) => cp.status === "Active") ?? carePlans[0];
    return (active?.goals ?? []).filter((g) => g.goal);
  }, [carePlans]);

  // Conflict detection
  const conflicts = useMemo(
    () =>
      visits.filter(
        (v) =>
          v.status === "scheduled" &&
          v.visit_date === visitDate &&
          Math.abs(
            parseInt(v.start_time.replace(":", "")) -
              parseInt(startTime.replace(":", ""))
          ) < 100
      ),
    [visits, visitDate, startTime]
  );

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!id || !individual || !userProfile?.organizationId) return;
    if (!visitDate || !startTime || !endTime) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      const individualName = `${individual.last_name}, ${individual.first_name}`;
      const visitId = await createScheduledVisit({
        organizationId: userProfile.organizationId,
        individual_id: id,
        individual_name: individualName,
        visit_type: visitType,
        visit_date: visitDate,
        start_time: startTime,
        end_time: endTime,
        location: location || "TBD",
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

      // Follow-up task
      await createTask({
        title: `Complete visit documentation for ${individualName}`,
        description: `Documentation for ${visitType} scheduled on ${visitDate} at ${fmt12(startTime)}.`,
        individualId: id,
        individualName,
        dueDate: visitDate,
        status: "open",
        priority: "medium",
        type: "Visit Scheduled",
        assignedTo: assignedTo || userProfile.uid,
        organizationId: userProfile.organizationId,
      });

      toast.success("Visit scheduled! A follow-up documentation task has been created.");
      navigate(`/people/${id}/visit-summary`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to schedule visit.");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────

  if (indLoading) {
    return (
      <ICMShell title="Schedule Visit" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }
  if (!individual) {
    return (
      <ICMShell title="Schedule Visit" showAIPanel={false}>
        <p className="p-6 text-[13px] text-icm-text-dim">Person not found.</p>
      </ICMShell>
    );
  }

  const individualName = `${individual.last_name}, ${individual.first_name}`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ICMShell title="Schedule Visit" showAIPanel={false}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(`/people/${id}/visit-summary`)}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {individualName} · Schedule Visit
        </button>

        {/* Individual card */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono text-[14px] font-bold ${riskAvatarClass(individual.risk_score)}`}
          >
            {individual.first_name[0]}{individual.last_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-manrope font-extrabold text-[16px] text-icm-text">{individualName}</div>
            <div className="text-[11.5px] text-icm-text-dim">
              {individual.county ?? "—"} · ID #{id?.slice(0, 8)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Form ─────────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Visit details */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
              <SectionHead icon={<CalendarPlus className="w-4 h-4" />} title="Visit Details" />
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Field label="Visit Type">
                    <select
                      value={visitType}
                      onChange={(e) => setVisitType(e.target.value as VisitType)}
                      className={selectCls}
                    >
                      {VISIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Visit Date">
                  <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Start Time">
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="End Time">
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
                  </Field>
                </div>
              </div>
              {conflicts.length > 0 && (
                <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                  ⚠ Possible conflict with {conflicts.length} existing visit at a similar time.
                </div>
              )}
            </div>

            {/* Location */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
              <SectionHead icon={<MapPin className="w-4 h-4" />} title="Location" />
              <Field label="Address / Location">
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Pre-filled from individual's profile…"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Assigned Staff */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
              <SectionHead icon={<Users className="w-4 h-4" />} title="Assigned Staff" />
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
                      {u.displayName}{u.uid === userProfile?.uid ? " (you)" : ""}
                      {u.role ? ` · ${u.role}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Linked plan / task */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
              <SectionHead icon={<Link2 className="w-4 h-4" />} title="Link to Plan / Task (optional)" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Plan Goal">
                  <select
                    value={linkedGoalId}
                    onChange={(e) => {
                      setLinkedGoalId(e.target.value);
                      const g = goals.find((g) => g.id === e.target.value);
                      setLinkedGoalText(g?.goal ?? "");
                    }}
                    className={selectCls}
                    disabled={goals.length === 0}
                  >
                    <option value="">— None —</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>{g.goal?.slice(0, 55)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Monitoring Task">
                  <select
                    value={linkedTaskId}
                    onChange={(e) => {
                      setLinkedTaskId(e.target.value);
                      const t = indTasks.find((t) => t.id === e.target.value);
                      setLinkedTaskTitle(t?.title ?? "");
                    }}
                    className={selectCls}
                    disabled={indTasks.length === 0}
                  >
                    <option value="">— None —</option>
                    {indTasks.map((t) => (
                      <option key={t.id} value={t.id}>{t.title.slice(0, 55)}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Preparation Notes">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className={`${inputCls} h-auto py-2 resize-none`}
                />
              </Field>
            </div>

            {/* Reminders */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
              <SectionHead icon={<Bell className="w-4 h-4" />} title="Reminder" />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={reminder}
                    onClick={() => setReminder(!reminder)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${reminder ? "bg-icm-accent" : "bg-icm-border"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${reminder ? "translate-x-5" : ""}`} />
                  </button>
                  <span className="text-[13px] font-geist text-icm-text">
                    {reminder ? "Send reminder" : "No reminder"}
                  </span>
                </label>
                {reminder && (
                  <select
                    value={reminderTiming}
                    onChange={(e) => setReminderTiming(e.target.value as ReminderTiming)}
                    className="h-8 rounded-md border border-icm-border bg-white px-2 text-[12.5px] font-geist"
                  >
                    {REMINDER_TIMINGS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                )}
              </div>
              {reminder && (
                <p className="text-[11.5px] text-icm-text-dim font-geist">
                  Reminder will be sent to the assigned staff member's inbox.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => navigate(`/people/${id}/visit-summary`)}
                className="h-10 px-4 rounded-xl border border-icm-border text-[13px] font-geist"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="h-10 px-4 rounded-xl bg-icm-text text-icm-panel text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Save as Scheduled</>
                )}
              </button>
            </div>
          </div>

          {/* ── Sidebar ───────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-icm-text-dim" />
                <h3 className="font-manrope font-bold text-[14px]">Upcoming Visits</h3>
              </div>
              {visitsLoading ? (
                <div className="flex items-center gap-2 text-icm-text-dim py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[12px]">Loading…</span>
                </div>
              ) : visits.filter((v) => v.status === "scheduled").length === 0 ? (
                <p className="text-[12px] text-icm-text-dim">No scheduled visits yet.</p>
              ) : (
                <ul className="space-y-2">
                  {visits
                    .filter((v) => v.status === "scheduled")
                    .sort((a, b) => `${a.visit_date}${a.start_time}`.localeCompare(`${b.visit_date}${b.start_time}`))
                    .map((v) => {
                      const colors = VISIT_TYPE_COLORS[v.visit_type as VisitType] ?? { dot: "bg-icm-border" };
                      return (
                        <li key={v.id} className="rounded-md border border-icm-border p-2 text-[12px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${colors.dot} shrink-0`} />
                            <span className="font-medium text-icm-text">{v.visit_type}</span>
                          </div>
                          <div className="text-icm-text-dim mt-0.5">
                            {v.visit_date} · {fmt12(v.start_time)} – {fmt12(v.end_time)}
                          </div>
                          {v.linked_goal_text && (
                            <div className="text-icm-text-faint text-[10.5px] truncate">
                              Goal: {v.linked_goal_text}
                            </div>
                          )}
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-icm-border bg-blue-50/40 p-3 text-[11.5px] text-icm-text-dim">
              <strong className="text-icm-text">Auto follow-up.</strong> When you save this visit, a documentation task is automatically added to the assigned staff member's My Work queue.
            </div>
          </div>
        </div>
      </div>
    </ICMShell>
  );
};

function SectionHead({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-1 text-icm-text-dim">
      {icon}
      <h3 className="font-manrope font-bold text-[14px] text-icm-text">{title}</h3>
    </div>
  );
}

export default PersonVisitScheduler;
