import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Users,
  Calendar,
  Paperclip,
  CheckSquare,
  Square,
  Target,
  Bell,
  Link2,
  ChevronDown,
  ChevronRight,
  X,
  FileText,
  Trash2,
  Loader2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual } from "@/hooks/useIndividuals";
import { useMeetingNotes, addMeetingNote, updateMeetingNote, deleteMeetingNote, useCarePlans } from "@/hooks/useFirestore";
import { writeAudit } from "@/lib/auditService";
import { createTask } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { staffDisplayName } from "@/lib/userName";
import { toast } from "sonner";

interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  dueDate: string;
  status: "Open" | "In progress" | "Done";
  linkedGoalId?: string;
  reminder?: string;
}

type MeetingType = "Team Meeting" | "IDT Meeting" | "PCP Planning Meeting" | "Wraparound Meeting" | "Other";

interface MeetingNote {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: MeetingType;
  attendees: string[];
  externalAttendees?: string; // free text for non-org attendees
  facilitator: string;
  agenda: string;
  discussionNotes: string;
  actionItems: ActionItem[];
  linkedGoals: string[];
  nextMeetingDate?: string;
  attachments: { name: string; size: string }[];
  createdAt: string;
  createdBy: string;
}

const MEETING_TYPES: MeetingType[] = [
  "Team Meeting",
  "IDT Meeting",
  "PCP Planning Meeting",
  "Wraparound Meeting",
  "Other",
];

const PLAN_GOALS = [
  { id: "g1", text: "Increase community employment hours to 20/week" },
  { id: "g2", text: "Maintain medication compliance ≥95%" },
  { id: "g3", text: "Develop two new natural supports in Carroll County" },
  { id: "g4", text: "Independent transportation training (bus route 8)" },
];

const TYPE_TONE: Record<MeetingType, string> = {
  "Team Meeting":        "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
  "IDT Meeting":         "bg-icm-green-soft text-icm-green ring-icm-green/20",
  "PCP Planning Meeting":"bg-violet-100 text-violet-700 ring-violet-200",
  "Wraparound Meeting":  "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
  Other:                 "bg-icm-bg text-icm-text-dim ring-icm-border",
};

const PersonMeetingNotesPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading } = useIndividual(id);
  const { data: notes = [], loading: notesLoading } = useMeetingNotes(id);
  const { userProfile } = useAuth();
  const { data: carePlans } = useCarePlans(id);

  // Load org staff users for attendee multi-select
  const [orgUsers, setOrgUsers] = useState<{ uid: string; name: string; role: string }[]>([]);
  useEffect(() => {
    if (!userProfile?.organizationId) return;
    const q = query(collection(db, "users"), where("organizationId", "==", userProfile.organizationId));
    const unsub = onSnapshot(q, (snap) => {
      setOrgUsers(snap.docs.map((d) => ({
        uid: d.id,
        name: staffDisplayName(d.data(), d.id),
        role: d.data().role ?? "",
      })));
    }, () => {});
    return () => unsub();
  }, [userProfile?.organizationId]);
  const personLabel = individual ? `${individual.last_name}, ${individual.first_name}` : "Person";

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const sorted = useMemo(
    () => [...notes].sort((a, b) => b.date.localeCompare(a.date)),
    [notes],
  );

  const openActions = useMemo(
    () =>
      notes.flatMap((n) =>
        n.actionItems
          .filter((a) => a.status !== "Done")
          .map((a) => ({ ...a, meetingDate: n.date })),
      ),
    [notes],
  );

  function toggleExpand(noteId: string) {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(noteId) ? n.delete(noteId) : n.add(noteId);
      return n;
    });
  }

  async function toggleActionStatus(noteId: string, actionId: string) {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    const nextActionItems = note.actionItems.map((a) =>
      a.id !== actionId
        ? a
        : { ...a, status: a.status === "Done" ? "Open" : "Done" }
    );
    try {
      await updateMeetingNote(noteId, {
        actionItems: nextActionItems
      });
      writeAudit("edit_note", "meeting_note", noteId, { actionId });
      toast.success("Action item status updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update action item status");
    }
  }

  async function removeNote(noteId: string) {
    if (!confirm("Delete this meeting note? This cannot be undone.")) return;
    try {
      await deleteMeetingNote(noteId);
      writeAudit("settings_change", "meeting_note", noteId, { action: "delete" });
      toast.success("Meeting note deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete meeting note");
    }
  }

  async function createNote(noteData: MeetingNote) {
    try {
      const { id: _, ...cleanNote } = noteData;
      const payload = {
        ...cleanNote,
        individual_id: id!,
        organizationId: userProfile?.organizationId ?? "",
      };
      const docRef = await addMeetingNote(payload);
      writeAudit("create_note", "meeting_note", docRef.id, {
        individualId: id!,
        attendees: noteData.attendees.length,
      });

      // Create a My Work task for each action item assigned to an org user
      const individualName = individual
        ? `${individual.first_name} ${individual.last_name}`
        : "Individual";
      const taskPromises = noteData.actionItems
        .filter((a) => a.assignee && a.description)
        .map((a) =>
          createTask({
            title: a.description,
            description: `Action item from team meeting on ${noteData.date} (${noteData.type})`,
            individualId: id!,
            individualName,
            organizationId: userProfile?.organizationId ?? "",
            type: "Team Meeting",
            priority: "medium",
            status: "open",
            source: "meeting_note",
            dueDate: a.dueDate,
            assignedTo: orgUsers.find((u) => u.name === a.assignee)?.uid ?? a.assignee,
          }).catch(() => {/* non-fatal */})
        );
      await Promise.all(taskPromises);

      if (noteData.actionItems.length > 0) {
        toast.success(`Meeting documented · ${noteData.actionItems.length} task${noteData.actionItems.length > 1 ? "s" : ""} created in My Work`);
      } else {
        toast.success("Meeting note documented successfully");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save meeting note");
    }
  }

  if (loading || notesLoading) {
    return (
      <ICMShell title="Team Meeting Notes" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="Team Meeting Notes" showAIPanel={false}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[11.5px] font-geist text-icm-text-dim">
          <button onClick={() => navigate("/people")} className="hover:text-icm-text">
            People
          </button>
          <span className="text-icm-text-faint">›</span>
          {individual && (
            <>
              <button
                onClick={() => navigate(`/people/${individual.id}/echart`)}
                className="hover:text-icm-text"
              >
                {personLabel}
              </button>
              <span className="text-icm-text-faint">›</span>
            </>
          )}
          <span className="text-icm-text font-medium">Team Meetings</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-icm-text-dim" />
              <h1 className="text-lg font-medium text-icm-text">Team Meetings</h1>
              <span className="text-[11px] text-icm-text-dim">
                {notes.length} meetings · {openActions.length} open action items
              </span>
            </div>
            <p className="text-[12px] text-icm-text-dim mt-1">
              Document team meetings, agendas, attendees, and assigned action items linked to plan
              goals.
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md bg-icm-accent text-white hover:bg-icm-accent/90"
          >
            <Plus className="w-3.5 h-3.5" /> Document meeting
          </button>
        </div>

        {/* Open action items summary */}
        {openActions.length > 0 && (
          <div className="rounded-xl border border-icm-amber/30 bg-icm-amber-soft/30 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Bell className="w-3.5 h-3.5 text-icm-amber" />
              <span className="text-[11.5px] font-medium text-icm-text">
                Open action items across meetings
              </span>
            </div>
            <div className="space-y-1">
              {openActions.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-[11.5px]">
                  <span className="text-icm-text truncate">{a.description}</span>
                  <span className="text-icm-text-dim shrink-0 ml-3">
                    {a.assignee} · due {a.dueDate}
                  </span>
                </div>
              ))}
              {openActions.length > 5 && (
                <div className="text-[11px] text-icm-text-dim pt-1">
                  +{openActions.length - 5} more open items
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes list */}
        <div className="space-y-2.5">
          {sorted.map((n) => {
            const isOpen = expanded.has(n.id);
            const done = n.actionItems.filter((a) => a.status === "Done").length;
            return (
              <div
                key={n.id}
                className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden"
              >
                <button
                  onClick={() => toggleExpand(n.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-icm-bg/40"
                >
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-icm-text-dim shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-icm-text-dim shrink-0" />
                  )}
                  <Calendar className="w-4 h-4 text-icm-text-dim shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-icm-text">
                        {n.date} · {n.startTime}–{n.endTime}
                      </span>
                      <span
                        className={`text-[10.5px] px-1.5 py-0.5 rounded ring-1 ${TYPE_TONE[n.type]}`}
                      >
                        {n.type}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-icm-text-dim mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>Facilitator: {n.facilitator}</span>
                      <span>{n.attendees.length} attendees</span>
                      <span>
                        Actions: {done}/{n.actionItems.length}
                      </span>
                      {n.linkedGoals.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Target className="w-3 h-3" /> {n.linkedGoals.length} linked goals
                        </span>
                      )}
                      {n.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="w-3 h-3" /> {n.attachments.length}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-icm-border p-4 space-y-4">
                    <Section title="Attendees">
                      <div className="flex flex-wrap gap-1.5">
                        {n.attendees.map((a) => (
                          <span
                            key={a}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-icm-bg ring-1 ring-icm-border text-icm-text"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </Section>
                    <Section title="Agenda">
                      <pre className="text-[12px] text-icm-text whitespace-pre-wrap font-geist">
                        {n.agenda || "—"}
                      </pre>
                    </Section>
                    <Section title="Discussion notes">
                      <p className="text-[12px] text-icm-text whitespace-pre-wrap">
                        {n.discussionNotes || "—"}
                      </p>
                    </Section>
                    <Section title={`Action items (${n.actionItems.length})`}>
                      <div className="space-y-1.5">
                        {n.actionItems.map((a) => {
                          const goal = PLAN_GOALS.find((g) => g.id === a.linkedGoalId);
                          const done = a.status === "Done";
                          return (
                            <div
                              key={a.id}
                              className="flex items-start gap-2 rounded-md border border-icm-border bg-white px-2.5 py-2"
                            >
                              <button
                                onClick={() => toggleActionStatus(n.id, a.id)}
                                className="mt-0.5 text-icm-text-dim hover:text-icm-text"
                              >
                                {done ? (
                                  <CheckSquare className="w-4 h-4 text-icm-green" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-[12px] ${done ? "line-through text-icm-text-dim" : "text-icm-text"}`}
                                >
                                  {a.description}
                                </div>
                                <div className="text-[11px] text-icm-text-dim mt-0.5 flex flex-wrap gap-x-3">
                                  <span>{a.assignee}</span>
                                  <span>Due {a.dueDate}</span>
                                  {a.reminder && (
                                    <span className="inline-flex items-center gap-1">
                                      <Bell className="w-3 h-3" /> Reminder {a.reminder}
                                    </span>
                                  )}
                                  {goal && (
                                    <span className="inline-flex items-center gap-1 text-icm-accent">
                                      <Link2 className="w-3 h-3" /> Goal: {goal.text}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span
                                className={`text-[10.5px] px-1.5 py-0.5 rounded ring-1 shrink-0 ${
                                  done
                                    ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
                                    : a.status === "In progress"
                                      ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
                                      : "bg-icm-bg text-icm-text-dim ring-icm-border"
                                }`}
                              >
                                {a.status}
                              </span>
                            </div>
                          );
                        })}
                        {n.actionItems.length === 0 && (
                          <div className="text-[11.5px] text-icm-text-dim">
                            No action items recorded.
                          </div>
                        )}
                      </div>
                    </Section>
                    {n.attachments.length > 0 && (
                      <Section title="Attachments">
                        <div className="space-y-1">
                          {n.attachments.map((f) => (
                            <div
                              key={f.name}
                              className="flex items-center gap-2 text-[11.5px] text-icm-text"
                            >
                              <FileText className="w-3.5 h-3.5 text-icm-text-dim" />
                              <span>{f.name}</span>
                              <span className="text-icm-text-dim">· {f.size}</span>
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}
                    <div className="flex justify-end">
                      <button
                        onClick={() => removeNote(n.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-icm-text-dim hover:text-icm-red"
                      >
                        <Trash2 className="w-3 h-3" /> Delete meeting note
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {sorted.length === 0 && (
            <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel py-10 text-center text-[12px] text-icm-text-dim">
              No meetings documented yet.
            </div>
          )}
        </div>
      </div>

      {creating && (
        <CreateMeetingDialog
          onClose={() => setCreating(false)}
          onCreate={(n) => {
            createNote(n);
            setCreating(false);
          }}
          orgUsers={orgUsers}
          carePlanGoals={carePlans.flatMap((p) =>
            (p.goals ?? []).map((g) => ({ id: g.id, text: g.goal ?? "" }))
          )}
        />
      )}
    </ICMShell>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-medium mb-1.5">
        {title}
      </div>
      {children}
    </div>
  );
}

function CreateMeetingDialog({
  onClose,
  onCreate,
  orgUsers,
  carePlanGoals,
}: {
  onClose: () => void;
  onCreate: (n: MeetingNote) => void;
  orgUsers: { uid: string; name: string; role: string }[];
  carePlanGoals: { id: string; text: string }[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [type, setType] = useState<MeetingType>("Team Meeting");
  const [facilitator, setFacilitator] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [externalAttendees, setExternalAttendees] = useState("");
  const [nextMeetingDate, setNextMeetingDate] = useState("");
  const [agenda, setAgenda] = useState("");
  const [discussion, setDiscussion] = useState("");
  const [linkedGoals, setLinkedGoals] = useState<string[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [newAction, setNewAction] = useState({
    description: "",
    assignee: "Sarah Chen, LCSW",
    dueDate: today,
    linkedGoalId: "",
  });

  function toggleAttendee(a: string) {
    setAttendees((arr) => (arr.includes(a) ? arr.filter((x) => x !== a) : [...arr, a]));
  }
  function toggleGoal(g: string) {
    setLinkedGoals((arr) => (arr.includes(g) ? arr.filter((x) => x !== g) : [...arr, g]));
  }
  function addAction() {
    if (!newAction.description.trim()) return;
    setActions((a) => [
      ...a,
      {
        id: crypto.randomUUID(),
        description: newAction.description,
        assignee: newAction.assignee,
        dueDate: newAction.dueDate,
        status: "Open",
        linkedGoalId: newAction.linkedGoalId || undefined,
      },
    ]);
    setNewAction({ ...newAction, description: "" });
  }

  function submit() {
    if (!agenda.trim()) {
      toast.error("Agenda is required.");
      return;
    }
    onCreate({
      id: crypto.randomUUID(),
      date,
      startTime,
      endTime,
      type,
      facilitator,
      attendees,
      externalAttendees: externalAttendees.trim() || undefined,
      agenda,
      discussionNotes: discussion,
      actionItems: actions,
      linkedGoals,
      nextMeetingDate: nextMeetingDate || undefined,
      attachments: [],
      createdAt: new Date().toISOString(),
      createdBy: facilitator,
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-icm-border sticky top-0 bg-white">
          <h2 className="text-[13.5px] font-medium text-icm-text">Document team meeting</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-icm-bg text-icm-text-dim">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <Field label="Date">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
              />
            </Field>
            <Field label="Start">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
              />
            </Field>
            <Field label="End">
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
              />
            </Field>
            <Field label="Type">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MeetingType)}
                className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
              >
                {MEETING_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Facilitator">
            <input
              value={facilitator}
              onChange={(e) => setFacilitator(e.target.value)}
              placeholder="Name of meeting facilitator"
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
            />
          </Field>
          <Field label="Attendees (organization staff)">
            <div className="flex flex-wrap gap-1.5">
              {orgUsers.map((u) => (
                <button
                  key={u.uid}
                  type="button"
                  onClick={() => toggleAttendee(u.name)}
                  className={`text-[11px] px-2 py-1 rounded-md ring-1 ${
                    attendees.includes(u.name)
                      ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20"
                      : "bg-white text-icm-text-dim ring-icm-border hover:text-icm-text"
                  }`}
                >
                  {u.name}{u.role ? ` (${u.role})` : ""}
                </button>
              ))}
              {orgUsers.length === 0 && <p className="text-[11.5px] text-icm-text-faint italic">No org users found.</p>}
            </div>
          </Field>
          <Field label="External attendees (free text — guardian, providers, etc.)">
            <input
              value={externalAttendees}
              onChange={(e) => setExternalAttendees(e.target.value)}
              placeholder="e.g. Margaret Thompson (Guardian), Dr. Patel (BH)"
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
            />
          </Field>
          <Field label="Agenda (required)">
            <textarea
              rows={3}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="1. ...&#10;2. ..."
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
            />
          </Field>
          <Field label="Discussion summary">
            <textarea
              rows={3}
              value={discussion}
              onChange={(e) => setDiscussion(e.target.value)}
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
            />
          </Field>
          <Field label="Link to care plan goals">
            <div className="space-y-1">
              {carePlanGoals.length === 0
                ? <p className="text-[11.5px] text-icm-text-faint italic">No active care plan goals found.</p>
                : carePlanGoals.map((g) => (
                  <label key={g.id} className="flex items-start gap-2 text-[11.5px] text-icm-text">
                    <input
                      type="checkbox"
                      checked={linkedGoals.includes(g.id)}
                      onChange={() => toggleGoal(g.id)}
                      className="mt-0.5"
                    />
                    <span>{g.text}</span>
                  </label>
                ))
              }
            </div>
          </Field>
          <Field label="Next meeting date (optional)">
            <input
              type="date"
              value={nextMeetingDate}
              onChange={(e) => setNextMeetingDate(e.target.value)}
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
            />
          </Field>
          <Field label="Action items">
            <div className="space-y-1.5 mb-2">
              {actions.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-[11.5px] rounded-md bg-icm-bg px-2 py-1.5 ring-1 ring-icm-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-icm-text truncate">{a.description}</div>
                    <div className="text-[10.5px] text-icm-text-dim">
                      {a.assignee} · due {a.dueDate}
                      {a.linkedGoalId &&
                        ` · goal: ${PLAN_GOALS.find((g) => g.id === a.linkedGoalId)?.text}`}
                    </div>
                  </div>
                  <button
                    onClick={() => setActions((arr) => arr.filter((x) => x.id !== a.id))}
                    className="text-icm-text-dim hover:text-icm-red"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-icm-border bg-icm-bg/30 p-2 space-y-1.5">
              <input
                placeholder="Action description…"
                value={newAction.description}
                onChange={(e) =>
                  setNewAction({ ...newAction, description: e.target.value })
                }
                className="w-full text-[12px] px-2 py-1 rounded border border-icm-border bg-white"
              />
              <div className="grid grid-cols-3 gap-1.5">
                <select
                  value={newAction.assignee}
                  onChange={(e) => setNewAction({ ...newAction, assignee: e.target.value })}
                  className="text-[12px] px-2 py-1 rounded border border-icm-border bg-white"
                >
                  <option value="">Assign to…</option>
                  {orgUsers.map((u) => (
                    <option key={u.uid} value={u.name}>{u.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newAction.dueDate}
                  onChange={(e) => setNewAction({ ...newAction, dueDate: e.target.value })}
                  className="text-[12px] px-2 py-1 rounded border border-icm-border bg-white"
                />
                <select
                  value={newAction.linkedGoalId}
                  onChange={(e) => setNewAction({ ...newAction, linkedGoalId: e.target.value })}
                  className="text-[12px] px-2 py-1 rounded border border-icm-border bg-white"
                >
                  <option value="">No goal link</option>
                  {carePlanGoals.map((g) => (
                    <option key={g.id} value={g.id}>{g.text.slice(0, 40)}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={addAction}
                className="text-[11.5px] px-2 py-1 rounded-md bg-icm-text text-white hover:bg-icm-text/90"
              >
                + Add action item
              </button>
            </div>
          </Field>
        </div>
        <div className="px-5 py-3 border-t border-icm-border flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="text-[12px] px-3 py-1.5 rounded-md text-icm-text-dim hover:text-icm-text"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="text-[12px] px-3 py-1.5 rounded-md bg-icm-accent text-white hover:bg-icm-accent/90"
          >
            Save meeting note
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-medium mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

export default PersonMeetingNotesPage;
