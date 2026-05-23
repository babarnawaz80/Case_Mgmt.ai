import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronDown,
  Sparkles,
  Plus,
  Trash2,
  X,
  CalendarDays,
  FileText,
  CheckCircle2,
  Download,
  Printer,
  Send,
  Link as LinkIcon,
  Copy,
  Mail,
  Lock,
  MoreHorizontal,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { PersonAIPanel } from "@/components/icm/PersonAIPanel";
import { getPerson, riskAvatarClass, initials } from "@/data/people";
import { getPlansForPerson, type CarePlan } from "@/data/carePlans";
import type { AISuggestion } from "@/data/people";

const carePlanSuggestions: AISuggestion[] = [
  {
    tone: "urgent",
    label: "Urgent",
    body: "PCP review overdue 25 days. 3 required signatures still pending.",
    cta: "Request signatures",
  },
  {
    tone: "insight",
    label: "Insight",
    body: "Goal 2 (Community Integration) has had no progress update in 4 months. Last monitoring note mentioned 3 community events. Update progress?",
    cta: "Update goal",
  },
  {
    tone: "insight",
    label: "Insight",
    body: "Employment goal mentioned in 2 recent sessions. Not currently in plan. Want me to draft a new goal?",
    cta: "Draft goal",
  },
  {
    tone: "good",
    label: "Good news",
    body: "All service authorizations are current. Next renewal: August 2026.",
    cta: "View services",
  },
];

const PersonCarePlan = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const person = getPerson(id ?? "");
  const allPlans = getPlansForPerson(id ?? "");
  const [completedOpen, setCompletedOpen] = useState(false);
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [draftingAI, setDraftingAI] = useState(false);
  const [sharePlan, setSharePlan] = useState<CarePlan | null>(null);

  const inProgress = useMemo(() => allPlans.filter((p) => !p.isCompleted), [allPlans]);
  const completed = useMemo(() => allPlans.filter((p) => p.isCompleted), [allPlans]);

  if (!person) {
    return (
      <ICMShell title="PCP" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p>
      </ICMShell>
    );
  }

  const activePlan = inProgress[0];
  const renewalDays = 127;
  const isOverdue = false;
  const lastApproved = completed[0]?.approvalDate ?? "—";

  const openPlan = (planId: string) => navigate(`/people/${id}/care-plan/${planId}`);

  // Empty state
  if (allPlans.length === 0) {
    return (
      <ICMShell
        title="PCP"
        rightPanel={<PersonAIPanel person={person} suggestions={carePlanSuggestions} intro={`I'm tracking ${carePlanSuggestions.length} items on ${person.firstName}'s plan.`} />}
      >
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-icm-bg border border-icm-border flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-icm-text-faint" />
          </div>
          <h2 className="font-manrope font-extrabold text-[20px] text-icm-text mb-1">No care plans yet</h2>
          <p className="text-[13px] text-icm-text-dim max-w-md mb-6">
            Start {person.firstName}'s first plan or let AI draft one based on existing records.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setNewPlanOpen(true)} className="h-10 px-4 rounded-xl border border-icm-border text-[13px] font-medium text-icm-text hover:bg-icm-bg">
              + Start blank plan
            </button>
            <button onClick={() => { setNewPlanOpen(true); setDraftingAI(true); }} className="h-10 px-4 rounded-xl bg-icm-text text-icm-panel text-[13px] font-medium hover:opacity-90 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Draft with AI
            </button>
          </div>
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell
      title="PCP"
      rightPanel={
        <PersonAIPanel
          person={person}
          suggestions={carePlanSuggestions}
          intro={`I'm tracking ${carePlanSuggestions.length} items on ${person.firstName}'s plan.`}
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
          People · {person.lastName}, {person.firstName} · PCP
        </button>

        {/* Sticky person header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3 flex-wrap">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono text-[14px] font-bold ${riskAvatarClass(person.riskScore)}`}>
            {initials(person)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-manrope font-extrabold text-[16px] text-icm-text tracking-tight">
              {person.lastName}, {person.firstName}
              {person.nickname && <span className="font-medium text-icm-text-dim"> ({person.nickname})</span>}
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

        {/* Title + meta + new */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              PCP
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              <span className="font-semibold text-icm-text">Person-Centered Plan (PCP)</span>
              <span className="text-icm-text-faint"> · </span>
              Annual renewal: <span className="font-mono text-icm-text">August 31</span>
              <button onClick={() => toast("Modify renewal date", { description: "Opening renewal scheduler…" })} className="ml-1.5 text-icm-accent hover:underline text-[12px]">Modify</button>
            </p>
          </div>
          <button
            onClick={() => setNewPlanOpen(true)}
            className="h-9 px-3 rounded-xl bg-teal-600 text-white text-[12px] font-geist font-medium hover:bg-teal-700 inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> New Plan
          </button>
        </div>

        {/* AI ribbon */}
        <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-[12.5px] font-geist text-icm-text leading-snug">
              <span className="font-semibold">PCP review is 25 days overdue.</span>{" "}
              <span className="text-icm-text-dim">
                I drafted updated goal language based on recent monitoring notes and {person.firstName}'s expressed interests.
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {activePlan && (
              <button
                onClick={() => openPlan(activePlan.id)}
                className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline"
              >
                Review draft →
              </button>
            )}
            <button onClick={() => toast.success("AI draft dismissed", { description: "Banner hidden for this session." })} className="text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">Dismiss</button>
          </div>
        </div>

        {/* Status summary chips */}
        <div className="flex flex-wrap gap-2">
          <StatusChip label="Current plan" value={activePlan ? "Active" : "Expired"} tone={activePlan ? "green" : "red"} />
          <StatusChip
            label="Days until renewal"
            value={isOverdue ? `${renewalDays} days overdue` : `${renewalDays} days`}
            tone={isOverdue ? "red" : "green"}
          />
          <StatusChip label="Last approved" value={lastApproved} tone="dim" />
          <StatusChip label="Open drafts" value={String(inProgress.length)} tone={inProgress.length > 0 ? "amber" : "dim"} />
        </div>

        {/* In Progress */}
        <Section title="In Progress" count={inProgress.length}>
          <PlanTable plans={inProgress} onOpen={openPlan} variant="inProgress" />
        </Section>

        {/* Completed */}
        <Section title="Completed" count={completed.length} collapsible collapsed={!completedOpen} onToggle={() => setCompletedOpen((o) => !o)}>
          <PlanTable plans={completed} onOpen={openPlan} variant="completed" />
        </Section>
      </div>

      {/* New Plan Modal */}
      {newPlanOpen && (
        <Modal title="Start New Plan" onClose={() => { setNewPlanOpen(false); setDraftingAI(false); }}>
          {!draftingAI ? (
            <>
              <div className="space-y-3">
                <Field label="Plan type">
                  <select className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[13px] text-icm-text">
                    <option>Person-Centered Plan (PCP)</option>
                    <option>Care Plan</option>
                    <option>Service Plan</option>
                  </select>
                </Field>
                <Field label="Internal due date">
                  <input type="date" className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[13px] text-icm-text" />
                </Field>
                <Field label="Notes">
                  <textarea rows={2} className="w-full px-3 py-2 rounded-lg border border-icm-border bg-white text-[13px] text-icm-text" />
                </Field>
              </div>
              <div className="mt-4 rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-icm-accent mt-0.5 shrink-0" />
                  <p className="text-[12px] text-icm-text leading-relaxed">
                    Based on {person.firstName}'s last plan and current monitoring notes, I can pre-populate goals, services, and outcomes. Want me to draft this plan?
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-5">
                <button onClick={() => setNewPlanOpen(false)} className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg">
                  Start blank
                </button>
                <button
                  onClick={() => setDraftingAI(true)}
                  className="h-9 px-4 rounded-lg bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Start with AI draft
                </button>
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <div className="w-12 h-12 rounded-xl ai-gradient flex items-center justify-center mx-auto mb-3 animate-pulse">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <p className="text-[13px] text-icm-text font-medium">AI is reviewing {person.firstName}'s records...</p>
              <p className="text-[12px] text-icm-text-dim mt-1">6 monitoring forms · 3 visit summaries · 2 contact notes</p>
              <button
                onClick={() => { setNewPlanOpen(false); setDraftingAI(false); if (activePlan) openPlan(activePlan.id); }}
                className="mt-5 h-9 px-4 rounded-lg bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90"
              >
                Open draft →
              </button>
            </div>
          )}
        </Modal>
      )}
    </ICMShell>
  );
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function StatusChip({ label, value, tone }: { label: string; value: string; tone: "green" | "red" | "amber" | "dim" }) {
  const toneClass =
    tone === "green" ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
    : tone === "red" ? "bg-icm-red-soft text-icm-red ring-icm-red/20"
    : tone === "amber" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
    : "bg-icm-bg text-icm-text-dim ring-icm-border";
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ring-1 ${toneClass}`}>
      <span className="text-[10px] uppercase tracking-wide font-geist font-semibold opacity-70">{label}</span>
      <span className="text-[12px] font-mono font-semibold">{value}</span>
    </div>
  );
}

function Section({
  title, count, children, collapsible, collapsed, onToggle,
}: {
  title: string; count: number; children: React.ReactNode;
  collapsible?: boolean; collapsed?: boolean; onToggle?: () => void;
}) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
      <button
        onClick={onToggle}
        disabled={!collapsible}
        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-icm-bg/60 disabled:hover:bg-transparent disabled:cursor-default transition-colors"
      >
        {collapsible && (
          <ChevronDown className={`w-3.5 h-3.5 text-icm-text-dim transition-transform ${collapsed ? "-rotate-90" : ""}`} />
        )}
        <span className="font-tight font-semibold text-[14px] text-icm-text">{title}</span>
        <span className="px-1.5 py-0.5 rounded-full bg-icm-bg border border-icm-border text-[10px] font-mono font-semibold text-icm-text-dim">
          {count}
        </span>
      </button>
      {(!collapsible || !collapsed) && <div className="border-t border-icm-border">{children}</div>}
    </div>
  );
}

function PlanTable({ plans, onOpen, variant }: { plans: CarePlan[]; onOpen: (id: string) => void; variant: "inProgress" | "completed" }) {
  if (plans.length === 0) {
    return (
      <div className="px-4 py-6 text-[12px] text-icm-text-faint font-geist">
        No plans in this section.
      </div>
    );
  }
  const cols = variant === "completed"
    ? ["Plan ID", "Internal Due", "Meeting", "CR Received", "Approval", "Completed", "Updated", ""]
    : ["Plan ID", "Internal Due", "Meeting", "CR Received", "Approval", "Updated", ""];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] font-geist">
        <thead className="bg-icm-bg/60">
          <tr>
            {cols.map((c, i) => (
              <th key={i} className="text-left px-4 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-icm-border">
          {plans.map((p) => (
            <tr key={p.id} className="hover:bg-icm-bg/40 transition-colors">
              <td className="px-4 py-3">
                <button onClick={() => onOpen(p.id)} className="font-mono font-semibold text-icm-accent hover:underline">
                  {p.id}
                </button>
              </td>
              <td className="px-4 py-3"><DateCell value={p.internalDueDate} /></td>
              <td className="px-4 py-3"><DateCell value={p.meetingDate} /></td>
              <td className="px-4 py-3"><DateCell value={p.crReceivedDate} /></td>
              <td className="px-4 py-3"><DateCell value={p.approvalDate} /></td>
              {variant === "completed" && <td className="px-4 py-3"><DateCell value={p.completedDate} /></td>}
              <td className="px-4 py-3 text-icm-text-dim">
                <div className="text-[11.5px]">{p.updatedBy}</div>
                <div className="font-mono text-[11px] text-icm-text-faint">{p.updatedOn}</div>
              </td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => toast(`Delete plan ${p.id}?`, { action: { label: "Delete", onClick: () => toast.success(`Plan ${p.id} deleted`) } })} className="text-icm-text-faint hover:text-icm-red p-1 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DateCell({ value }: { value?: string }) {
  if (!value || value === "—") {
    return <button onClick={() => toast("Set date", { description: "Opening date picker…" })} className="text-icm-accent hover:underline text-[12px] inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Set date</button>;
  }
  return <span className="font-mono text-icm-text">{value}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-manrope font-bold text-[15px] text-icm-text">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-icm-bg text-icm-text-dim"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default PersonCarePlan;
