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
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { getPerson } from "@/data/people";
import { writeAudit } from "@/data/supervisor";

interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  dueDate: string;
  status: "Open" | "In progress" | "Done";
  linkedGoalId?: string;
  reminder?: string;
}

interface MeetingNote {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "Quarterly review" | "Annual planning" | "Crisis huddle" | "Provider check-in" | "Other";
  attendees: string[];
  facilitator: string;
  agenda: string;
  discussionNotes: string;
  actionItems: ActionItem[];
  linkedGoals: string[];
  attachments: { name: string; size: string }[];
  createdAt: string;
  createdBy: string;
}

const PLAN_GOALS = [
  { id: "g1", text: "Increase community employment hours to 20/week" },
  { id: "g2", text: "Maintain medication compliance ≥95%" },
  { id: "g3", text: "Develop two new natural supports in Carroll County" },
  { id: "g4", text: "Independent transportation training (bus route 8)" },
];

const TEAM_ROSTER = [
  "Margaret Thompson (Guardian)",
  "Sarah Chen, LCSW (Coordinator)",
  "David Park (Supervisor)",
  "Riverside Day Program",
  "Dr. Aaron Patel (BH)",
  "Aunt Linda Reyes (Natural support)",
];

function seedNotes(personId: string): MeetingNote[] {
  return [
    {
      id: crypto.randomUUID(),
      date: "2026-05-12",
      startTime: "10:00",
      endTime: "11:15",
      type: "Quarterly review",
      facilitator: "Sarah Chen, LCSW",
      attendees: [
        "Margaret Thompson (Guardian)",
        "Sarah Chen, LCSW (Coordinator)",
        "David Park (Supervisor)",
        "Riverside Day Program",
      ],
      agenda:
        "1. Progress on employment goal\n2. Medication review\n3. Transportation training update\n4. Summer schedule changes",
      discussionNotes:
        "Joseph has made strong progress at Riverside. Mom raised concern about weekend isolation. Discussed expanding natural supports through Aunt Linda. Provider confirmed July break dates.",
      actionItems: [
        {
          id: crypto.randomUUID(),
          description: "Contact 3 employment providers re: 20hr/week placements",
          assignee: "Sarah Chen, LCSW",
          dueDate: "2026-05-26",
          status: "In progress",
          linkedGoalId: "g1",
          reminder: "2026-05-23",
        },
        {
          id: crypto.randomUUID(),
          description: "Set up weekend respite arrangement with Aunt Linda",
          assignee: "Margaret Thompson",
          dueDate: "2026-06-01",
          status: "Open",
          linkedGoalId: "g3",
        },
        {
          id: crypto.randomUUID(),
          description: "Schedule transportation training assessment",
          assignee: "Sarah Chen, LCSW",
          dueDate: "2026-05-19",
          status: "Done",
          linkedGoalId: "g4",
        },
      ],
      linkedGoals: ["g1", "g3", "g4"],
      attachments: [
        { name: "Q1-2026-progress-summary.pdf", size: "184 KB" },
        { name: "med-list-current.pdf", size: "42 KB" },
      ],
      createdAt: "2026-05-12T11:20:00Z",
      createdBy: "Sarah Chen, LCSW",
    },
    {
      id: crypto.randomUUID(),
      date: "2026-02-08",
      startTime: "14:00",
      endTime: "15:00",
      type: "Annual planning",
      facilitator: "Sarah Chen, LCSW",
      attendees: TEAM_ROSTER,
      agenda: "Annual person-centered plan review and goal setting for 2026.",
      discussionNotes:
        "Reviewed last year's goals (3 of 4 met). Established new goals around community employment and transportation. Guardian signed updated plan.",
      actionItems: [
        {
          id: crypto.randomUUID(),
          description: "Finalize signed PCP and distribute to team",
          assignee: "Sarah Chen, LCSW",
          dueDate: "2026-02-15",
          status: "Done",
          linkedGoalId: "g1",
        },
      ],
      linkedGoals: ["g1", "g2", "g3", "g4"],
      attachments: [{ name: "PCP-2026-signed.pdf", size: "612 KB" }],
      createdAt: "2026-02-08T15:10:00Z",
      createdBy: "Sarah Chen, LCSW",
    },
  ];
}

function loadNotes(personId: string): MeetingNote[] {
  const key = `icm.meeting-notes.${personId}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  const s = seedNotes(personId);
  localStorage.setItem(key, JSON.stringify(s));
  return s;
}

function saveNotes(personId: string, list: MeetingNote[]) {
  localStorage.setItem(`icm.meeting-notes.${personId}`, JSON.stringify(list));
}

const TYPE_TONE: Record<MeetingNote["type"], string> = {
  "Quarterly review": "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
  "Annual planning": "bg-icm-green-soft text-icm-green ring-icm-green/20",
  "Crisis huddle": "bg-icm-red-soft text-icm-red ring-icm-red/20",
  "Provider check-in": "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
  Other: "bg-icm-bg text-icm-text-dim ring-icm-border",
};

const PersonMeetingNotesPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const person = getPerson(id ?? "");
  const personLabel = person ? `${person.lastName}, ${person.firstName}` : "Person";

  const [notes, setNotes] = useState<MeetingNote[]>(() => loadNotes(id ?? ""));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    saveNotes(id ?? "", notes);
  }, [notes, id]);

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

  function toggleActionStatus(noteId: string, actionId: string) {
    setNotes((all) =>
      all.map((n) =>
        n.id !== noteId
          ? n
          : {
              ...n,
              actionItems: n.actionItems.map((a) =>
                a.id !== actionId
                  ? a
                  : { ...a, status: a.status === "Done" ? "Open" : "Done" },
              ),
            },
      ),
    );
    writeAudit({
      ts: new Date().toISOString(),
      actor: "Sarah Chen, LCSW",
      action: "meeting_action.toggle",
      personId: id,
      noteId,
      actionId,
    });
  }

  function removeNote(noteId: string) {
    if (!confirm("Delete this meeting note? This cannot be undone.")) return;
    setNotes((all) => all.filter((n) => n.id !== noteId));
    writeAudit({
      ts: new Date().toISOString(),
      actor: "Sarah Chen, LCSW",
      action: "meeting_note.delete",
      personId: id,
      noteId,
    });
  }

  function createNote(note: MeetingNote) {
    setNotes((all) => [note, ...all]);
    writeAudit({
      ts: new Date().toISOString(),
      actor: note.createdBy,
      action: "meeting_note.create",
      personId: id,
      noteId: note.id,
      attendees: note.attendees.length,
      actionItems: note.actionItems.length,
    });
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
          {person && (
            <>
              <button
                onClick={() => navigate(`/people/${person.id}/echart`)}
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
}: {
  onClose: () => void;
  onCreate: (n: MeetingNote) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [type, setType] = useState<MeetingNote["type"]>("Quarterly review");
  const [facilitator, setFacilitator] = useState("Sarah Chen, LCSW");
  const [attendees, setAttendees] = useState<string[]>([
    "Sarah Chen, LCSW (Coordinator)",
    "Margaret Thompson (Guardian)",
  ]);
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
      alert("Agenda is required.");
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
      agenda,
      discussionNotes: discussion,
      actionItems: actions,
      linkedGoals,
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
                onChange={(e) => setType(e.target.value as MeetingNote["type"])}
                className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
              >
                {Object.keys(TYPE_TONE).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Facilitator">
            <input
              value={facilitator}
              onChange={(e) => setFacilitator(e.target.value)}
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
            />
          </Field>
          <Field label="Attendees">
            <div className="flex flex-wrap gap-1.5">
              {TEAM_ROSTER.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAttendee(a)}
                  className={`text-[11px] px-2 py-1 rounded-md ring-1 ${
                    attendees.includes(a)
                      ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20"
                      : "bg-white text-icm-text-dim ring-icm-border hover:text-icm-text"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Agenda">
            <textarea
              rows={3}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="1. ...&#10;2. ..."
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
            />
          </Field>
          <Field label="Discussion notes">
            <textarea
              rows={3}
              value={discussion}
              onChange={(e) => setDiscussion(e.target.value)}
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
            />
          </Field>
          <Field label="Link to plan goals / outcomes">
            <div className="space-y-1">
              {PLAN_GOALS.map((g) => (
                <label
                  key={g.id}
                  className="flex items-start gap-2 text-[11.5px] text-icm-text"
                >
                  <input
                    type="checkbox"
                    checked={linkedGoals.includes(g.id)}
                    onChange={() => toggleGoal(g.id)}
                    className="mt-0.5"
                  />
                  <span>{g.text}</span>
                </label>
              ))}
            </div>
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
                <input
                  placeholder="Assignee"
                  value={newAction.assignee}
                  onChange={(e) =>
                    setNewAction({ ...newAction, assignee: e.target.value })
                  }
                  className="text-[12px] px-2 py-1 rounded border border-icm-border bg-white"
                />
                <input
                  type="date"
                  value={newAction.dueDate}
                  onChange={(e) =>
                    setNewAction({ ...newAction, dueDate: e.target.value })
                  }
                  className="text-[12px] px-2 py-1 rounded border border-icm-border bg-white"
                />
                <select
                  value={newAction.linkedGoalId}
                  onChange={(e) =>
                    setNewAction({ ...newAction, linkedGoalId: e.target.value })
                  }
                  className="text-[12px] px-2 py-1 rounded border border-icm-border bg-white"
                >
                  <option value="">No goal link</option>
                  {PLAN_GOALS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.text.slice(0, 40)}
                    </option>
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
