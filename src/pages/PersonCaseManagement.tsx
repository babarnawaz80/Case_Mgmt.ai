import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronDown,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  X,
  ArrowRight,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { PersonAIPanel } from "@/components/icm/PersonAIPanel";
import { getPerson, riskAvatarClass, initials } from "@/data/people";
import type { AISuggestion } from "@/data/people";

type TaskStatus = "Pending Start" | "Open" | "In Progress" | "Completed" | "Overdue";

interface Task {
  id: string;
  name: string;
  startDate?: string;
  dueDate?: string;
  status: TaskStatus;
  staff?: string;
  aiDraft?: boolean;
  linksTo?: { slug: string; label: string };
  completedOn?: string;
}

interface Group {
  name: string;
  tasks: Task[];
}

const seedGroups: Group[] = [
  {
    name: "Quarterly Requirements",
    tasks: [
      {
        id: "t1",
        name: "Quarterly visit",
        startDate: "02/09/2026",
        dueDate: "05/15/2026",
        status: "Pending Start",
      },
      {
        id: "t2",
        name: "Schedule quarterly visit",
        startDate: "02/09/2026",
        dueDate: "02/09/2026",
        status: "Overdue",
        aiDraft: true,
      },
      {
        id: "t3",
        name: "Complete monitoring form",
        startDate: "04/09/2026",
        dueDate: "04/09/2026",
        status: "Overdue",
        linksTo: { slug: "monitoring-form", label: "Monitoring Form" },
      },
    ],
  },
  {
    name: "Eligibility & Benefits",
    tasks: [
      {
        id: "t4",
        name: "Verify MA status",
        startDate: "04/16/2026",
        dueDate: "04/16/2026",
        status: "Overdue",
        linksTo: { slug: "eligibility", label: "Eligibility Verification" },
        aiDraft: true,
      },
      {
        id: "t5",
        name: "Complete MA redetermination",
        status: "Pending Start",
      },
    ],
  },
  {
    name: "Annual Requirements",
    tasks: [
      {
        id: "t6",
        name: "Annual ISP review",
        startDate: "03/01/2026",
        dueDate: "04/01/2026",
        status: "Overdue",
        aiDraft: true,
        linksTo: { slug: "care-plan", label: "Care Plan / ISP" },
      },
      {
        id: "t7",
        name: "Annual face-to-face visit",
        status: "Completed",
        completedOn: "01/15/2026",
      },
    ],
  },
];

// Days overdue lookup, computed against 02/23/2026 to match seed expectations.
const overdueDays: Record<string, number> = {
  t2: 76,
  t3: 17,
  t4: 10,
  t6: 25,
};

const moduleSuggestions: AISuggestion[] = [
  {
    tone: "urgent",
    label: "Urgent",
    body: "3 tasks are overdue. Longest overdue: 'Schedule quarterly visit' at 76 days. Want me to draft the visit summary and contact note?",
    cta: "Generate drafts",
  },
  {
    tone: "insight",
    label: "Insight",
    body: "MA redetermination typically takes 2–3 weeks. Based on Joseph's renewal date, you should start the process by May 10.",
    cta: "Add reminder",
  },
  {
    tone: "insight",
    label: "Insight",
    body: "Annual ISP review is 25 days overdue. I pulled last year's ISP and drafted updated goal language based on recent monitoring notes.",
    cta: "Review draft",
  },
];

const statusOrder: Record<TaskStatus, number> = {
  Overdue: 0,
  "In Progress": 1,
  Open: 2,
  "Pending Start": 3,
  Completed: 4,
};

const PersonCaseManagement = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const person = getPerson(id ?? "");

  const [groups] = useState<Group[]>(seedGroups);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [pullOpen, setPullOpen] = useState(false);
  const [completeTask, setCompleteTask] = useState<Task | null>(null);

  const summary = useMemo(() => {
    const all = groups.flatMap((g) => g.tasks);
    return {
      total: all.length,
      overdue: all.filter((t) => t.status === "Overdue").length,
      inProgress: all.filter((t) => t.status === "In Progress").length,
      completed: all.filter((t) => t.status === "Completed").length,
    };
  }, [groups]);

  if (!person) {
    return (
      <ICMShell title="Case Management" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p>
      </ICMShell>
    );
  }

  const toggleGroup = (name: string) =>
    setCollapsed((c) => ({ ...c, [name]: !c[name] }));

  const handleTaskAction = (task: Task) => {
    if (task.status === "Completed") {
      // View
      return;
    }
    if (task.linksTo) {
      setCompleteTask(task);
      return;
    }
    setCompleteTask(task);
  };

  return (
    <ICMShell
      title="Case Management"
      rightPanel={
        <PersonAIPanel
          person={person}
          suggestions={moduleSuggestions}
          intro={`I'm tracking ${moduleSuggestions.length} items on ${person.firstName}'s case management board.`}
        />
      }
    >
      <div className="space-y-5">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(`/people/${person.id}/echart`)}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {person.lastName}, {person.firstName} · Case Management
        </button>

        {/* Sticky person header (compact version) */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3 flex-wrap">
          <div
            className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono text-[14px] font-bold ${riskAvatarClass(
              person.riskScore,
            )}`}
          >
            {initials(person)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-manrope font-extrabold text-[16px] text-icm-text tracking-tight">
              {person.lastName}, {person.firstName}
              {person.nickname && (
                <span className="font-medium text-icm-text-dim"> ({person.nickname})</span>
              )}
            </h2>
            <p className="text-[11.5px] font-mono text-icm-text-dim">
              {person.gender} · {person.age}y · {person.county} · ID #{person.id}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
            <span className="w-1.5 h-1.5 rounded-full bg-icm-green" />
            {person.status}
          </span>
        </div>

        {/* Title block */}
        <div>
          <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
            Case Management
          </h1>
          <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
            Template:{" "}
            <span className="font-semibold text-icm-text">Community Coordination</span>
          </p>
          <div className="flex items-center justify-between gap-3 flex-wrap mt-3">
            <div className="flex items-center gap-x-4 gap-y-1 text-[11.5px] font-geist text-icm-text-dim flex-wrap">
              <span>
                Annual Plan Date{" "}
                <span className="font-mono text-icm-text">10/16/2024</span>
              </span>
              <span className="text-icm-text-faint">·</span>
              <span>
                Started By <span className="text-icm-text">Babar Nawaz CM</span>
              </span>
              <span className="text-icm-text-faint">·</span>
              <span>
                Started On <span className="font-mono text-icm-text">09/12/2025</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPullOpen(true)}
                className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Pull Latest Template Activities
              </button>
              <button className="h-9 px-3 text-[12px] font-geist font-medium text-icm-accent hover:underline">
                Change Template
              </button>
            </div>
          </div>
        </div>

        {/* AI ribbon */}
        <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-[12.5px] font-geist text-icm-text leading-snug">
              <span className="font-semibold">{summary.overdue} tasks are overdue.</span>{" "}
              <span className="text-icm-text-dim">
                I can help you prioritize and draft the required documentation.
              </span>
            </p>
          </div>
          <button className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline shrink-0">
            Show AI plan →
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          <SummaryChip label="Total" value={summary.total} />
          <SummaryChip label="Overdue" value={summary.overdue} tone="red" />
          <SummaryChip label="In Progress" value={summary.inProgress} tone="amber" />
          <SummaryChip label="Completed" value={summary.completed} tone="green" />
        </div>

        {/* Task groups */}
        <div className="space-y-3">
          {groups.map((g) => {
            const sorted = [...g.tasks].sort(
              (a, b) => statusOrder[a.status] - statusOrder[b.status],
            );
            const isCollapsed = collapsed[g.name];
            return (
              <div
                key={g.name}
                className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden"
              >
                <button
                  onClick={() => toggleGroup(g.name)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-icm-bg/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-icm-text-dim transition-transform ${
                        isCollapsed ? "-rotate-90" : ""
                      }`}
                    />
                    <span className="font-tight font-semibold text-[14px] text-icm-text">
                      {g.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-icm-bg border border-icm-border text-[10px] font-mono font-semibold text-icm-text-dim">
                      {g.tasks.length}
                    </span>
                  </div>
                </button>
                {!isCollapsed && (
                  <div className="border-t border-icm-border divide-y divide-icm-border">
                    {sorted.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        overdueDays={overdueDays[t.id]}
                        onAction={() => handleTaskAction(t)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pull Latest modal */}
      {pullOpen && (
        <Modal onClose={() => setPullOpen(false)} title="Pull Latest Template Activities">
          <p className="text-[13px] text-icm-text font-geist">
            Are you sure you want to pull latest changes?
          </p>
          <p className="text-[12px] text-icm-text-dim font-geist mt-2 leading-relaxed">
            This will add any new tasks from the current template version. Existing tasks
            will not be changed.
          </p>
          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              onClick={() => setPullOpen(false)}
              className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg"
            >
              Cancel
            </button>
            <button
              onClick={() => setPullOpen(false)}
              className="h-9 px-4 rounded-lg bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90"
            >
              Pull Latest
            </button>
          </div>
        </Modal>
      )}

      {/* Task completion modal */}
      {completeTask && (
        <Modal
          onClose={() => setCompleteTask(null)}
          title={`Complete: ${completeTask.name}`}
        >
          {completeTask.linksTo ? (
            <p className="text-[13px] text-icm-text font-geist">
              This task requires completing a{" "}
              <span className="font-semibold">{completeTask.linksTo.label}</span>. Would
              you like to go there now?
            </p>
          ) : (
            <p className="text-[13px] text-icm-text font-geist">
              Mark this task complete?
            </p>
          )}

          {completeTask.aiDraft && (
            <div className="mt-3 rounded-xl bg-icm-accent-soft border border-icm-accent/20 px-3.5 py-3 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-[12px] text-icm-text font-geist leading-relaxed">
                AI has pre-filled this form based on recent notes and{" "}
                <span className="font-semibold">{person.firstName}</span>'s history. Review
                before saving.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-5 flex-wrap">
            <button
              onClick={() => setCompleteTask(null)}
              className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg"
            >
              Cancel
            </button>
            <button
              onClick={() => setCompleteTask(null)}
              className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text hover:bg-icm-bg"
            >
              Mark complete manually
            </button>
            {completeTask.linksTo && (
              <button
                onClick={() => {
                  const slug = completeTask.linksTo!.slug;
                  const label = completeTask.linksTo!.label;
                  setCompleteTask(null);
                  navigate(`/people/${person.id}/module/${slug}`);
                  // Note: a real impl would pre-fill the destination module form.
                  void label;
                }}
                className="h-9 px-4 rounded-lg bg-icm-text text-icm-panel text-[12px] font-semibold hover:opacity-90 flex items-center gap-1.5"
              >
                Go to {completeTask.linksTo.label}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </Modal>
      )}
    </ICMShell>
  );
};

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "red" | "amber" | "green";
}) {
  const cls =
    tone === "red"
      ? "bg-icm-red-soft text-icm-red ring-icm-red/20"
      : tone === "amber"
      ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
      : tone === "green"
      ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
      : "bg-icm-panel text-icm-text ring-icm-border";
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ring-1 ${cls}`}
    >
      <span className="text-[10px] uppercase tracking-wide font-geist font-semibold opacity-80">
        {label}
      </span>
      <span className="font-mono font-bold text-[14px]">{value}</span>
    </div>
  );
}

function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === "Completed")
    return <CheckCircle2 className="w-4 h-4 text-icm-green" />;
  if (status === "Overdue")
    return <AlertCircle className="w-4 h-4 text-icm-red" />;
  if (status === "In Progress")
    return <Clock className="w-4 h-4 text-icm-amber" />;
  if (status === "Open")
    return <Circle className="w-4 h-4 text-icm-accent" fill="currentColor" fillOpacity={0.15} />;
  return <Circle className="w-4 h-4 text-icm-text-faint" />;
}

function StatusPill({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, string> = {
    Completed: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    Overdue: "bg-icm-red-soft text-icm-red ring-icm-red/20",
    "In Progress": "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    Open: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    "Pending Start": "bg-icm-bg text-icm-text-dim ring-icm-border",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${map[status]}`}
    >
      {status}
    </span>
  );
}

function TaskRow({
  task,
  overdueDays,
  onAction,
}: {
  task: Task;
  overdueDays?: number;
  onAction: () => void;
}) {
  const isCompleted = task.status === "Completed";
  const isOverdue = task.status === "Overdue";
  const isPending = task.status === "Pending Start";

  return (
    <div
      className={`px-4 py-3 flex items-center gap-3 hover:bg-icm-bg/60 transition-colors ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      <StatusIcon status={task.status} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={`font-tight font-semibold text-[13px] text-icm-text leading-tight ${
              isCompleted ? "line-through text-icm-text-dim" : ""
            }`}
          >
            {task.name}
          </p>
          {task.aiDraft && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-geist font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20">
              <Sparkles className="w-2.5 h-2.5" />
              AI draft ready
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] font-geist text-icm-text-dim mt-1 flex-wrap">
          {task.startDate && (
            <span className="font-mono">Start {task.startDate}</span>
          )}
          {task.dueDate && (
            <span
              className={`font-mono ${
                isOverdue ? "text-icm-red font-semibold" : ""
              }`}
            >
              Due {task.dueDate}
              {isOverdue && overdueDays !== undefined && (
                <span className="ml-1">({overdueDays} day{overdueDays === 1 ? "" : "s"} overdue)</span>
              )}
            </span>
          )}
          {task.completedOn && (
            <span className="font-mono text-icm-green">
              Completed {task.completedOn}
            </span>
          )}
          <span className="text-icm-text-faint">·</span>
          <span>Staff: {task.staff ?? "Anyone"}</span>
        </div>
      </div>

      <div className="hidden md:block shrink-0">
        <StatusPill status={task.status} />
      </div>

      <button
        onClick={onAction}
        className={`h-8 px-3 rounded-lg text-[11.5px] font-geist font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
          isCompleted
            ? "border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text"
            : isPending
            ? "border border-icm-border bg-icm-panel text-icm-text hover:border-icm-border-strong"
            : "bg-icm-text text-icm-panel hover:opacity-90"
        }`}
      >
        {isCompleted ? "View" : isPending ? "Start" : "Complete"}
        {!isCompleted && <ArrowRight className="w-3 h-3" />}
      </button>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-icm-text/40 flex items-center justify-center p-6">
      <div className="bg-icm-panel rounded-xl border border-icm-border w-full max-w-[480px] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-icm-border">
          <h2 className="font-manrope font-bold text-[14px] text-icm-text tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default PersonCaseManagement;
