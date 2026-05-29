import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronDown,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  X,
  ArrowRight,
  GitBranch,
  Loader2,
  History,
  CheckCheck,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { DischargedBanner } from "@/components/icm/DischargedBanner";
import { useIndividual, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { useWorkflows } from "@/hooks/useFirestore";
import { progressFraction, workflowProgressTone } from "@/data/workflows";
import { AuthorCell } from "@/components/icm/AuthorCell";
import {
  CASE_TEMPLATES,
  getTemplate,
  calcDueDate,
  type CaseTemplate,
  type TemplateTask,
} from "@/data/caseTemplates";

// ─── Types ───────────────────────────────────────────────────────────────────

type TaskStatus = "Pending Start" | "Open" | "In Progress" | "Completed" | "Overdue" | "superseded";

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
  supersededOn?: string;
  supersededNote?: string;
  templateTaskId?: string;
}

interface Group {
  name: string;
  tasks: Task[];
}

interface TemplateChangeLog {
  id: string;
  type: "initial_assignment" | "template_changed" | "pull_latest";
  fromName?: string;
  fromVersion?: string;
  toName: string;
  toVersion: string;
  reason?: string;
  changedBy: string;
  changedAt: string; // ISO string
}

// ─── Mock seed data ───────────────────────────────────────────────────────────

const ADMISSION_DATE = new Date("2025-09-12");
const ANNUAL_PLAN_DATE = new Date("2024-10-16");

const seedGroups: Group[] = [
  {
    name: "Quarterly Requirements",
    tasks: [
      { id: "t1", name: "Quarterly visit", startDate: "02/09/2026", dueDate: "05/15/2026", status: "Pending Start", templateTaskId: "tmpl-001-t3" },
      { id: "t2", name: "Schedule quarterly visit", startDate: "02/09/2026", dueDate: "02/09/2026", status: "Overdue", aiDraft: true, templateTaskId: "tmpl-001-t1" },
      { id: "t3", name: "Complete monitoring form", startDate: "04/09/2026", dueDate: "04/09/2026", status: "Overdue", linksTo: { slug: "monitoring-form", label: "Monitoring Form" }, templateTaskId: "tmpl-001-t2" },
    ],
  },
  {
    name: "Eligibility & Benefits",
    tasks: [
      { id: "t4", name: "Verify MA status", startDate: "04/16/2026", dueDate: "04/16/2026", status: "Overdue", linksTo: { slug: "eligibility", label: "Eligibility Verification" }, aiDraft: true, templateTaskId: "tmpl-001-t4" },
      { id: "t5", name: "Complete MA redetermination", status: "Pending Start", templateTaskId: "tmpl-001-t5" },
    ],
  },
  {
    name: "Annual Requirements",
    tasks: [
      { id: "t6", name: "Annual ISP review", startDate: "03/01/2026", dueDate: "04/01/2026", status: "Overdue", aiDraft: true, linksTo: { slug: "care-plan", label: "Care Plan / ISP" }, templateTaskId: "tmpl-001-t6" },
      { id: "t7", name: "Annual face-to-face visit", status: "Completed", completedOn: "01/15/2026" },
    ],
  },
];

const overdueDays: Record<string, number> = { t2: 76, t3: 17, t4: 10, t6: 25 };

const statusOrder: Record<TaskStatus, number> = {
  Overdue: 0,
  "In Progress": 1,
  Open: 2,
  "Pending Start": 3,
  Completed: 4,
  superseded: 5,
};

const CHANGE_REASONS = [
  "Individual's needs have changed",
  "Service level changed",
  "Program transfer",
  "Template updated by admin",
  "Error correction",
  "Other",
];

const MODULE_SLUG: Record<string, string> = {
  "Visit Summary": "visit-summary",
  "Monitoring Form": "monitoring-form",
  "Progress Note": "progress-notes",
  "Care Plan / ISP": "care-plan",
  "Eligibility Verification": "eligibility",
  "Contact Note": "contact-notes",
};

const RECURRENCE_LABEL: Record<string, string> = {
  "one-time": "One-time",
  monthly: "Monthly",
  quarterly: "Quarterly",
  "semi-annual": "Semi-annual",
  annual: "Annual",
};

// ─── Component ─────────────────────────────────────────────────────────────────

const PersonCaseManagement = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading } = useIndividual(id);
  const { data: workflowsData, loading: workflowsLoading } = useWorkflows(id);

  // ── Template state ──
  const [appliedTemplateId, setAppliedTemplateId] = useState("tmpl-001");
  const [appliedDate, setAppliedDate] = useState("09/12/2025");

  // ── Task board state ──
  const [groups, setGroups] = useState<Group[]>(seedGroups);
  const [supersededTasks, setSupersededTasks] = useState<Task[]>([]);
  const [supersededOpen, setSupersededOpen] = useState(false);

  // ── UI state ──
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [workflowsOpen, setWorkflowsOpen] = useState(true);
  const [completeTask, setCompleteTask] = useState<Task | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ── Change Template modal ──
  const [changeOpen, setChangeOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [changeOtherText, setChangeOtherText] = useState("");
  const [applying, setApplying] = useState(false);

  // ── Pull Latest modal ──
  const [pullOpen, setPullOpen] = useState(false);
  const [pulling, setPulling] = useState(false);

  // ── History drawer ──
  const [historyOpen, setHistoryOpen] = useState(false);
  const [changeLog, setChangeLog] = useState<TemplateChangeLog[]>([
    {
      id: "log-init",
      type: "initial_assignment",
      toName: "Community Coordination",
      toVersion: "v2.1",
      changedBy: "Babar Nawaz CM",
      changedAt: "2025-09-12T09:00:00Z",
    },
  ]);

  const appliedTemplate = getTemplate(appliedTemplateId);
  const availableTemplates = CASE_TEMPLATES.filter(
    (t) => t.id !== appliedTemplateId && t.status === "active"
  );
  const selectedTemplate = selectedTemplateId ? getTemplate(selectedTemplateId) : null;

  const personWorkflows = useMemo(
    () => (workflowsData || []).filter((w) => w.status === "Active"),
    [workflowsData]
  );

  // Summary excludes superseded
  const summary = useMemo(() => {
    const all = groups.flatMap((g) => g.tasks);
    return {
      total: all.length,
      overdue: all.filter((t) => t.status === "Overdue").length,
      inProgress: all.filter((t) => t.status === "In Progress").length,
      completed: all.filter((t) => t.status === "Completed").length,
    };
  }, [groups]);

  // Compute preview diff between applied and selected template
  const preview = useMemo(() => {
    if (!selectedTemplate || !appliedTemplate) return null;
    const existingTitles = new Set(
      groups.flatMap((g) => g.tasks.map((t) => t.name.toLowerCase()))
    );
    const appliedTitles = new Set(appliedTemplate.tasks.map((t) => t.title.toLowerCase()));

    const added = selectedTemplate.tasks.filter(
      (t) => !existingTitles.has(t.title.toLowerCase())
    );
    const superseded = appliedTemplate.tasks.filter(
      (t) => !selectedTemplate.tasks.some((st) => st.title.toLowerCase() === t.title.toLowerCase())
    );
    const preserved = appliedTemplate.tasks.filter((t) =>
      selectedTemplate.tasks.some((st) => st.title.toLowerCase() === t.title.toLowerCase())
    );
    return { added, superseded, preserved };
  }, [selectedTemplate, appliedTemplate, groups]);

  // Tasks that would be net-new on "Pull Latest" (already on latest = nothing new)
  const pullNewTasks = useMemo(() => {
    if (!appliedTemplate) return [];
    const existingTmplIds = new Set(
      groups.flatMap((g) => g.tasks.map((t) => t.templateTaskId)).filter(Boolean)
    );
    return appliedTemplate.tasks.filter((t) => !existingTmplIds.has(t.id));
  }, [appliedTemplate, groups]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  if (loading || workflowsLoading) {
    return (
      <ICMShell title="Case Management" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }
  if (!individual) {
    return (
      <ICMShell title="Case Management" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p>
      </ICMShell>
    );
  }

  const toggleGroup = (name: string) =>
    setCollapsed((c) => ({ ...c, [name]: !c[name] }));

  const handleTaskAction = (task: Task) => {
    if (task.status === "Completed") return;
    setCompleteTask(task);
  };

  // ── Apply Template ──────────────────────────────────────────────────────────
  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !changeReason) return;
    setApplying(true);
    await new Promise((r) => setTimeout(r, 900));

    const today = new Date();
    const todayStr = today.toLocaleDateString("en-US", {
      month: "2-digit", day: "2-digit", year: "numeric",
    });
    const supersededNote = `Replaced by template change on ${todayStr}`;

    // Mark all open tasks as superseded
    const nowSuperseded: Task[] = [];
    const updatedGroups = groups.map((g) => ({
      ...g,
      tasks: g.tasks.map((t) => {
        if (t.status !== "Completed") {
          const sup: Task = {
            ...t,
            status: "superseded",
            supersededOn: todayStr,
            supersededNote,
          };
          nowSuperseded.push(sup);
          return sup;
        }
        return t;
      }),
    }));

    // Generate new tasks from selected template
    const newTasks: Task[] = selectedTemplate.tasks.map((tt, i) => ({
      id: `gen-${Date.now()}-${i}`,
      name: tt.title,
      dueDate: calcDueDate(tt, ADMISSION_DATE, ANNUAL_PLAN_DATE),
      status: "Pending Start" as TaskStatus,
      staff: tt.staffRole === "Anyone" ? undefined : tt.staffRole,
      linksTo: tt.linkedModule
        ? { slug: MODULE_SLUG[tt.linkedModule] ?? tt.linkedModule, label: tt.linkedModule }
        : undefined,
      templateTaskId: tt.id,
    }));

    // Group new tasks by recurrence
    const grouped: Record<string, Task[]> = {};
    selectedTemplate.tasks.forEach((tt, i) => {
      const label =
        tt.recurrence === "one-time"
          ? "One-Time Requirements"
          : tt.recurrence === "monthly"
          ? "Monthly Requirements"
          : tt.recurrence === "quarterly"
          ? "Quarterly Requirements"
          : tt.recurrence === "semi-annual"
          ? "Semi-Annual Requirements"
          : "Annual Requirements";
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(newTasks[i]);
    });

    const finalGroups: Group[] = Object.entries(grouped).map(([name, tasks]) => ({
      name,
      tasks,
    }));

    // Build log entry
    const logEntry: TemplateChangeLog = {
      id: `log-${Date.now()}`,
      type: "template_changed",
      fromName: appliedTemplate?.name,
      fromVersion: appliedTemplate?.version,
      toName: selectedTemplate.name,
      toVersion: selectedTemplate.version,
      reason: changeReason === "Other" ? changeOtherText || "Other" : changeReason,
      changedBy: "Babar Nawaz CM",
      changedAt: new Date().toISOString(),
    };

    setGroups(finalGroups);
    setSupersededTasks((prev) => [...prev, ...nowSuperseded]);
    setAppliedTemplateId(selectedTemplate.id);
    setAppliedDate(todayStr);
    setChangeLog((prev) => [...prev, logEntry]);
    setApplying(false);
    setChangeOpen(false);
    setSelectedTemplateId(null);
    setChangeReason("");
    setChangeOtherText("");
    showToast(`Template updated to ${selectedTemplate.name}. ${newTasks.length} new tasks added.`);
  };

  // ── Pull Latest ─────────────────────────────────────────────────────────────
  const handlePullLatest = async () => {
    if (pullNewTasks.length === 0) { setPullOpen(false); return; }
    setPulling(true);
    await new Promise((r) => setTimeout(r, 700));

    const todayStr = new Date().toLocaleDateString("en-US", {
      month: "2-digit", day: "2-digit", year: "numeric",
    });

    const newTasks: Task[] = pullNewTasks.map((tt, i) => ({
      id: `pull-${Date.now()}-${i}`,
      name: tt.title,
      dueDate: calcDueDate(tt, ADMISSION_DATE, ANNUAL_PLAN_DATE),
      status: "Pending Start" as TaskStatus,
      staff: tt.staffRole === "Anyone" ? undefined : tt.staffRole,
      linksTo: tt.linkedModule
        ? { slug: MODULE_SLUG[tt.linkedModule] ?? tt.linkedModule, label: tt.linkedModule }
        : undefined,
      templateTaskId: tt.id,
    }));

    const logEntry: TemplateChangeLog = {
      id: `log-pull-${Date.now()}`,
      type: "pull_latest",
      toName: appliedTemplate?.name ?? "",
      toVersion: appliedTemplate?.version ?? "",
      changedBy: "Babar Nawaz CM",
      changedAt: new Date().toISOString(),
    };

    setGroups((prev) => {
      const last = prev[prev.length - 1];
      if (last) {
        return [...prev.slice(0, -1), { ...last, tasks: [...last.tasks, ...newTasks] }];
      }
      return [...prev, { name: "Additional Tasks", tasks: newTasks }];
    });
    setChangeLog((l) => [...l, logEntry]);
    setPulling(false);
    setPullOpen(false);
    showToast(`${newTasks.length} new task${newTasks.length === 1 ? "" : "s"} added from latest template.`);
  };

  const firstName = individual.first_name;

  return (
    <ICMShell title="Case Management" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs
          backTo={`/people/${individual.id}/echart`}
          backLabel="eChart"
          items={[
            { label: "People Supported", to: "/people" },
            { label: `${individual.first_name} ${individual.last_name}`, to: `/people/${individual.id}/echart` },
            { label: "Case Management" },
          ]}
        />

        <DischargedBanner individual={individual} />

        {/* Person header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3 flex-wrap">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono text-[14px] font-bold ${riskAvatarClass(individual.risk_score)}`}>
            {initials(individual)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-manrope font-extrabold text-[16px] text-icm-text tracking-tight">
              {individual.last_name}, {individual.first_name}
              {individual.preferred_name && (
                <span className="font-medium text-icm-text-dim"> ({individual.preferred_name})</span>
              )}
            </h2>
            <p className="text-[11.5px] font-mono text-icm-text-dim">
              {individual.gender ?? "—"} · {individual.county ?? "—"} · ID #{individual.id.slice(0, 8)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
            <span className="w-1.5 h-1.5 rounded-full bg-icm-green" />
            {individual.enrollment_status}
          </span>
        </div>

        {/* Title block */}
        <div>
          <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
            Case Management
          </h1>
          <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
            Template:{" "}
            <span className="font-semibold text-icm-text">
              {appliedTemplate?.name ?? "Community Coordination"}
            </span>
            {appliedTemplate && (
              <span className="ml-1.5 text-icm-text-faint text-[11px]">{appliedTemplate.version}</span>
            )}
          </p>
          <div className="flex items-center justify-between gap-3 flex-wrap mt-3">
            <div className="flex items-center gap-x-4 gap-y-1 text-[11.5px] font-geist text-icm-text-dim flex-wrap">
              <span>Annual Plan Date <span className="font-mono text-icm-text">10/16/2024</span></span>
              <span className="text-icm-text-faint">·</span>
              <span>Started By <span className="text-icm-text">Babar Nawaz CM</span></span>
              <span className="text-icm-text-faint">·</span>
              <span>Started On <span className="font-mono text-icm-text">{appliedDate}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPullOpen(true)}
                className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Pull Latest Template Activities
              </button>
              <button
                onClick={() => setChangeOpen(true)}
                className="h-9 px-3 text-[12px] font-geist font-medium text-icm-accent hover:underline"
              >
                Change Template
              </button>
              <button
                onClick={() => setHistoryOpen(true)}
                className="h-9 px-3 text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text flex items-center gap-1"
              >
                <History className="w-3.5 h-3.5" />
                History
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
          <button onClick={() => navigate(`/people/${id}/care-plan`)} className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline shrink-0">
            Show AI plan →
          </button>
        </div>

        {/* Summary chips — excludes superseded */}
        <div className="flex flex-wrap gap-2">
          <SummaryChip label="Total" value={summary.total} />
          <SummaryChip label="Overdue" value={summary.overdue} tone="red" />
          <SummaryChip label="In Progress" value={summary.inProgress} tone="amber" />
          <SummaryChip label="Completed" value={summary.completed} tone="green" />
        </div>

        {/* Active Workflows */}
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <button
            onClick={() => setWorkflowsOpen((o) => !o)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-icm-bg/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ChevronDown className={`w-3.5 h-3.5 text-icm-text-dim transition-transform ${workflowsOpen ? "" : "-rotate-90"}`} />
              <GitBranch className="w-3.5 h-3.5 text-icm-accent" />
              <span className="font-tight font-semibold text-[14px] text-icm-text">Active Workflows</span>
              <span className="px-1.5 py-0.5 rounded-full bg-icm-bg border border-icm-border text-[10px] font-mono font-semibold text-icm-text-dim">
                {personWorkflows.length}
              </span>
            </div>
            <span className="text-[11px] font-geist text-icm-text-faint">AI-managed · auto-triggered</span>
          </button>
          {workflowsOpen && (
            <div className="border-t border-icm-border">
              {personWorkflows.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-[12px] font-geist text-icm-text-dim">
                    No active workflows. AI will start one automatically when a triggering event is detected.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-icm-border">
                  {personWorkflows.map((w) => {
                    const frac = progressFraction(w);
                    const tone = workflowProgressTone(w);
                    const toneCls = tone === "red" ? "bg-icm-red" : tone === "amber" ? "bg-icm-amber" : "bg-icm-green";
                    return (
                      <li key={w.id}>
                        <button
                          onClick={() => navigate(`/people/${individual.id}/workflow-manager/${w.id}`)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-icm-bg/60 transition-colors text-left"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[12.5px] font-geist font-semibold text-icm-text truncate">{w.title}</p>
                            <p className="text-[11px] font-mono text-icm-text-dim mt-0.5">
                              Triggered {w.triggerDate}{w.dueDate ? ` · Due ${w.dueDate}` : ""}
                            </p>
                          </div>
                          <div className="hidden md:flex items-center gap-2 shrink-0">
                            <div className="w-24 h-1.5 rounded-full bg-icm-bg border border-icm-border overflow-hidden">
                              <div className={`h-full ${toneCls}`} style={{ width: `${(frac.done / frac.total) * 100}%` }} />
                            </div>
                            <span className="text-[11px] font-mono text-icm-text-dim">{frac.done}/{frac.total}</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-icm-text-faint shrink-0" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Task groups */}
        <div className="space-y-3">
          {groups.map((g) => {
            const activeTasks = g.tasks.filter((t) => t.status !== "superseded");
            const sorted = [...activeTasks].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
            const isCollapsed = collapsed[g.name];
            return (
              <div key={g.name} className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
                <button
                  onClick={() => toggleGroup(g.name)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-icm-bg/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown className={`w-3.5 h-3.5 text-icm-text-dim transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                    <span className="font-tight font-semibold text-[14px] text-icm-text">{g.name}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-icm-bg border border-icm-border text-[10px] font-mono font-semibold text-icm-text-dim">
                      {sorted.length}
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

        {/* Superseded tasks — collapsible, read-only */}
        {supersededTasks.length > 0 && (
          <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden opacity-80">
            <button
              onClick={() => setSupersededOpen((o) => !o)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-icm-bg/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ChevronDown className={`w-3.5 h-3.5 text-icm-text-dim transition-transform ${supersededOpen ? "" : "-rotate-90"}`} />
                <span className="font-tight font-semibold text-[14px] text-icm-text-dim">Superseded</span>
                <span className="px-1.5 py-0.5 rounded-full bg-icm-bg border border-icm-border text-[10px] font-mono font-semibold text-icm-text-dim">
                  {supersededTasks.length}
                </span>
              </div>
              <span className="text-[11px] font-geist text-icm-text-faint">Collapsed by default · read-only</span>
            </button>
            {supersededOpen && (
              <div className="border-t border-icm-border divide-y divide-icm-border">
                {supersededTasks.map((t) => (
                  <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                    <Circle className="w-4 h-4 text-icm-text-faint shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-tight font-semibold text-[13px] text-icm-text-dim line-through leading-tight">{t.name}</p>
                      <div className="flex items-center gap-3 text-[11px] font-geist text-icm-text-faint mt-1 flex-wrap">
                        {t.dueDate && <span className="font-mono">Due {t.dueDate}</span>}
                        {t.supersededOn && <span className="font-mono">Superseded {t.supersededOn}</span>}
                        {t.supersededNote && <span>{t.supersededNote}</span>}
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-bg text-icm-text-dim ring-1 ring-icm-border shrink-0">
                      Superseded
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
           CHANGE TEMPLATE MODAL
      ────────────────────────────────────────────────────────────────────── */}
      {changeOpen && (
        <div className="fixed inset-0 z-50 bg-icm-text/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-icm-panel rounded-xl border border-icm-border w-full max-w-[640px] my-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-icm-border">
              <div>
                <h2 className="font-manrope font-bold text-[15px] text-icm-text">Change Case Management Template</h2>
                <p className="text-[11.5px] text-icm-text-dim font-geist mt-0.5">
                  Selecting a new template will add new tasks. Completed tasks are preserved. Open tasks will be marked superseded.
                </p>
              </div>
              <button onClick={() => { setChangeOpen(false); setSelectedTemplateId(null); setChangeReason(""); }}
                className="w-7 h-7 rounded-md hover:bg-icm-bg text-icm-text-dim flex items-center justify-center shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Currently applied */}
              <div>
                <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">Currently Applied</p>
                <div className="rounded-xl border border-icm-border bg-icm-bg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-manrope font-bold text-[13px] text-icm-text">{appliedTemplate?.name}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20">
                      {appliedTemplate?.version}
                    </span>
                  </div>
                  <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">Applied {appliedDate}</p>
                </div>
              </div>

              {/* Select new template */}
              <div>
                <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">Select New Template</p>
                <div className="space-y-2">
                  {availableTemplates.map((tmpl) => {
                    const isSelected = selectedTemplateId === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => setSelectedTemplateId(tmpl.id)}
                        className={`w-full text-left rounded-xl border p-4 transition-all ${
                          isSelected
                            ? "border-icm-accent bg-icm-accent-soft"
                            : "border-icm-border bg-icm-bg hover:border-icm-border-strong"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-manrope font-bold text-[13px] text-icm-text">{tmpl.name}</span>
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-bg text-icm-text-dim ring-1 ring-icm-border">
                                {tmpl.version}
                              </span>
                            </div>
                            <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">{tmpl.description}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-[11px] font-geist text-icm-text-faint">{tmpl.tasks.length} tasks</span>
                              {tmpl.applicablePrograms.map((p) => (
                                <span key={p} className="px-1.5 py-0.5 rounded text-[10px] font-geist font-semibold bg-teal-50 text-teal-700">
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                          {isSelected && <CheckCheck className="w-4 h-4 text-icm-accent shrink-0 mt-0.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview diff */}
              {preview && selectedTemplate && (
                <>
                  {/* AI suggestion banner */}
                  <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-3 flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <p className="text-[12px] text-purple-800 font-geist leading-relaxed">
                      Based on <strong>{firstName}</strong>'s service category, recent monitoring notes, and current support level,{" "}
                      <strong>{selectedTemplate.name}</strong> appears to be an appropriate fit.
                    </p>
                  </div>

                  <div>
                    <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">What will change</p>
                    <div className="space-y-2">
                      {/* Added */}
                      {preview.added.length > 0 && (
                        <div className="rounded-xl bg-green-50 border border-green-200 p-3">
                          <p className="text-[10.5px] font-geist font-semibold text-green-700 uppercase tracking-wider mb-2">
                            Tasks Being Added ({preview.added.length})
                          </p>
                          <ul className="space-y-1">
                            {preview.added.map((t) => (
                              <li key={t.id} className="text-[12px] font-geist text-green-800 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                {t.title}
                                {t.linkedModule && <span className="text-green-600 text-[10.5px]">· {t.linkedModule}</span>}
                                <span className="text-green-600 text-[10.5px]">· {RECURRENCE_LABEL[t.recurrence]}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Superseded */}
                      {preview.superseded.length > 0 && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                          <p className="text-[10.5px] font-geist font-semibold text-amber-700 uppercase tracking-wider mb-2">
                            Tasks Being Superseded ({preview.superseded.length}) — not deleted
                          </p>
                          <ul className="space-y-1">
                            {preview.superseded.map((t) => (
                              <li key={t.id} className="text-[12px] font-geist text-amber-800 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                {t.title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Preserved */}
                      {preview.preserved.length > 0 && (
                        <div className="rounded-xl bg-icm-bg border border-icm-border p-3">
                          <p className="text-[10.5px] font-geist font-semibold text-icm-text-dim uppercase tracking-wider mb-2">
                            Tasks Preserved ({preview.preserved.length}) — no change
                          </p>
                          <ul className="space-y-1">
                            {preview.preserved.map((t) => (
                              <li key={t.id} className="text-[12px] font-geist text-icm-text-dim flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-icm-text-faint shrink-0" />
                                {t.title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Reason */}
              <div>
                <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
                  Reason for change <span className="text-icm-red">*</span>
                </label>
                <select
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text"
                >
                  <option value="">Select a reason…</option>
                  {CHANGE_REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                {changeReason === "Other" && (
                  <input
                    placeholder="Please describe…"
                    value={changeOtherText}
                    onChange={(e) => setChangeOtherText(e.target.value)}
                    className="mt-2 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text"
                  />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-icm-border">
              <button
                onClick={() => { setChangeOpen(false); setSelectedTemplateId(null); setChangeReason(""); }}
                className="h-9 px-4 rounded-xl border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:bg-icm-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyTemplate}
                disabled={!selectedTemplateId || !changeReason || applying}
                className="h-9 px-5 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {applying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {applying ? "Applying…" : "Apply Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
           PULL LATEST MODAL
      ────────────────────────────────────────────────────────────────────── */}
      {pullOpen && (
        <div className="fixed inset-0 z-50 bg-icm-text/40 flex items-center justify-center p-6">
          <div className="bg-icm-panel rounded-xl border border-icm-border w-full max-w-[520px]">
            <div className="flex items-center justify-between p-5 border-b border-icm-border">
              <h2 className="font-manrope font-bold text-[14px] text-icm-text">Pull Latest Template Activities</h2>
              <button onClick={() => setPullOpen(false)} className="w-7 h-7 rounded-md hover:bg-icm-bg text-icm-text-dim flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              {pullNewTasks.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-8 h-8 text-icm-green mx-auto mb-3" />
                  <p className="text-[13px] font-geist font-semibold text-icm-text">
                    You're already on the latest version
                  </p>
                  <p className="text-[12px] font-geist text-icm-text-dim mt-1">
                    {appliedTemplate?.name} ({appliedTemplate?.version}) — No new tasks to pull.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[13px] font-geist font-semibold text-icm-text mb-1">
                    New tasks available from {appliedTemplate?.name} {appliedTemplate?.version}
                  </p>
                  <p className="text-[12px] font-geist text-icm-text-dim mb-4">
                    These tasks will be added to {firstName}'s case management board. Existing tasks will not be changed or removed.
                  </p>
                  <div className="rounded-xl border border-icm-border bg-icm-bg divide-y divide-icm-border overflow-hidden mb-4">
                    {pullNewTasks.map((t) => (
                      <div key={t.id} className="px-3 py-2 flex items-center gap-3">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-geist font-bold bg-green-100 text-green-700">NEW</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-geist font-semibold text-icm-text">{t.title}</p>
                          <p className="text-[10.5px] font-geist text-icm-text-dim">
                            {t.linkedModule ?? "No linked module"} · {RECURRENCE_LABEL[t.recurrence]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-icm-border">
              <button onClick={() => setPullOpen(false)}
                className="h-9 px-4 rounded-xl border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:bg-icm-bg transition-colors">
                {pullNewTasks.length === 0 ? "Close" : "Cancel"}
              </button>
              {pullNewTasks.length > 0 && (
                <button onClick={handlePullLatest} disabled={pulling}
                  className="h-9 px-5 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2">
                  {pulling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {pulling ? "Pulling…" : "Pull Latest"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
           TASK COMPLETION MODAL
      ────────────────────────────────────────────────────────────────────── */}
      {completeTask && (
        <div className="fixed inset-0 z-50 bg-icm-text/40 flex items-center justify-center p-6">
          <div className="bg-icm-panel rounded-xl border border-icm-border w-full max-w-[480px]">
            <div className="flex items-center justify-between p-4 border-b border-icm-border">
              <h2 className="font-manrope font-bold text-[14px] text-icm-text">Complete: {completeTask.name}</h2>
              <button onClick={() => setCompleteTask(null)} className="w-7 h-7 rounded-md hover:bg-icm-bg text-icm-text-dim flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              {completeTask.linksTo ? (
                <p className="text-[13px] text-icm-text font-geist">
                  This task requires completing a <span className="font-semibold">{completeTask.linksTo.label}</span>. Would you like to go there now?
                </p>
              ) : (
                <p className="text-[13px] text-icm-text font-geist">Mark this task complete?</p>
              )}
              {completeTask.aiDraft && (
                <div className="mt-3 rounded-xl bg-icm-accent-soft border border-icm-accent/20 px-3.5 py-3 flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <p className="text-[12px] text-icm-text font-geist leading-relaxed">
                    AI has pre-filled this form based on recent notes and <span className="font-semibold">{firstName}</span>'s history. Review before saving.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 mt-5 flex-wrap">
                <button onClick={() => setCompleteTask(null)}
                  className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg">
                  Cancel
                </button>
                <button onClick={() => setCompleteTask(null)}
                  className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text hover:bg-icm-bg">
                  Mark complete manually
                </button>
                {completeTask.linksTo && (
                  <button
                    onClick={() => {
                      const slug = completeTask.linksTo!.slug;
                      setCompleteTask(null);
                      navigate(`/people/${individual.id}/module/${slug}`);
                    }}
                    className="h-9 px-4 rounded-lg bg-icm-text text-icm-panel text-[12px] font-semibold hover:opacity-90 flex items-center gap-1.5"
                  >
                    Go to {completeTask.linksTo.label}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
           HISTORY DRAWER (right-side slide-in)
      ────────────────────────────────────────────────────────────────────── */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-icm-text/30" onClick={() => setHistoryOpen(false)} />
          <div className="relative bg-icm-panel border-l border-icm-border w-full max-w-[400px] h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-icm-border shrink-0">
              <div>
                <h2 className="font-manrope font-bold text-[14px] text-icm-text">Template History</h2>
                <p className="text-[11.5px] text-icm-text-dim font-geist mt-0.5">
                  {individual.last_name}, {individual.first_name}
                </p>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="w-7 h-7 rounded-md hover:bg-icm-bg text-icm-text-dim flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {[...changeLog].reverse().map((entry) => {
                const date = new Date(entry.changedAt);
                const dateStr = date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
                const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={entry.id} className="flex gap-3">
                    <div className="shrink-0 mt-0.5">
                      {entry.type === "initial_assignment" ? (
                        <div className="w-7 h-7 rounded-lg bg-icm-green-soft ring-1 ring-icm-green/20 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-icm-green" />
                        </div>
                      ) : entry.type === "pull_latest" ? (
                        <div className="w-7 h-7 rounded-lg bg-icm-accent-soft ring-1 ring-icm-accent/20 flex items-center justify-center">
                          <RefreshCw className="w-3.5 h-3.5 text-icm-accent" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-amber-50 ring-1 ring-amber-200 flex items-center justify-center">
                          <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-geist font-semibold text-icm-text leading-snug">
                        {entry.type === "initial_assignment"
                          ? `Initial template: ${entry.toName} ${entry.toVersion} assigned`
                          : entry.type === "pull_latest"
                          ? `Pulled latest from ${entry.toName} ${entry.toVersion}`
                          : `Changed from ${entry.fromName} ${entry.fromVersion} → ${entry.toName} ${entry.toVersion}`}
                      </p>
                      {entry.reason && (
                        <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">Reason: {entry.reason}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <AuthorCell name={entry.changedBy} size="sm" showName={true} />
                        <span className="text-[11px] font-mono text-icm-text-faint">· {dateStr} {timeStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-icm-text text-icm-panel text-[12.5px] font-geist font-semibold px-5 py-3 rounded-xl shadow-2xl max-w-sm text-center">
          {toast}
        </div>
      )}
    </ICMShell>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function SummaryChip({ label, value, tone }: { label: string; value: number; tone?: "red" | "amber" | "green" }) {
  const cls = tone === "red" ? "bg-icm-red-soft text-icm-red ring-icm-red/20"
    : tone === "amber" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
    : tone === "green" ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
    : "bg-icm-panel text-icm-text ring-icm-border";
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ring-1 ${cls}`}>
      <span className="text-[10px] uppercase tracking-wide font-geist font-semibold opacity-80">{label}</span>
      <span className="font-mono font-bold text-[14px]">{value}</span>
    </div>
  );
}

function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === "Completed") return <CheckCircle2 className="w-4 h-4 text-icm-green" />;
  if (status === "Overdue") return <AlertCircle className="w-4 h-4 text-icm-red" />;
  if (status === "In Progress") return <Clock className="w-4 h-4 text-icm-amber" />;
  if (status === "Open") return <Circle className="w-4 h-4 text-icm-accent" fill="currentColor" fillOpacity={0.15} />;
  return <Circle className="w-4 h-4 text-icm-text-faint" />;
}

function StatusPill({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, string> = {
    Completed: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    Overdue: "bg-icm-red-soft text-icm-red ring-icm-red/20",
    "In Progress": "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    Open: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    "Pending Start": "bg-icm-bg text-icm-text-dim ring-icm-border",
    superseded: "bg-icm-bg text-icm-text-faint ring-icm-border",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${map[status]}`}>
      {status}
    </span>
  );
}

function TaskRow({ task, overdueDays, onAction }: { task: Task; overdueDays?: number; onAction: () => void }) {
  const isCompleted = task.status === "Completed";
  const isOverdue = task.status === "Overdue";
  const isPending = task.status === "Pending Start";
  return (
    <div className={`px-4 py-3 flex items-center gap-3 hover:bg-icm-bg/60 transition-colors ${isCompleted ? "opacity-60" : ""}`}>
      <StatusIcon status={task.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-tight font-semibold text-[13px] text-icm-text leading-tight ${isCompleted ? "line-through text-icm-text-dim" : ""}`}>
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
          {task.startDate && <span className="font-mono">Start {task.startDate}</span>}
          {task.dueDate && (
            <span className={`font-mono ${isOverdue ? "text-icm-red font-semibold" : ""}`}>
              Due {task.dueDate}
              {isOverdue && overdueDays !== undefined && (
                <span className="ml-1">({overdueDays} day{overdueDays === 1 ? "" : "s"} overdue)</span>
              )}
            </span>
          )}
          {task.completedOn && <span className="font-mono text-icm-green">Completed {task.completedOn}</span>}
          <span className="text-icm-text-faint">·</span>
          <span className={!task.staff ? "text-icm-amber font-medium" : ""}>
              {task.staff ? `Staff: ${task.staff}` : "⚠ Unassigned"}
            </span>
        </div>
      </div>
      <div className="hidden md:block shrink-0"><StatusPill status={task.status} /></div>
      <button
        onClick={onAction}
        className={`h-8 px-3 rounded-lg text-[11.5px] font-geist font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
          isCompleted
            ? "border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text"
            : isPending
            ? "border border-icm-border bg-icm-panel text-icm-text hover:border-icm-border-strong"
            : "bg-teal-600 text-white hover:bg-teal-700"
        }`}
      >
        {isCompleted ? "View" : isPending ? "Start" : "Complete"}
        {!isCompleted && <ArrowRight className="w-3 h-3" />}
      </button>
    </div>
  );
}

export default PersonCaseManagement;
