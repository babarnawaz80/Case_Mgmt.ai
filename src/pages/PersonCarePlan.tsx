import { useMemo, useState, useEffect } from "react";
import { getDocs, query, collection, where, limit, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { updateCarePlan } from "@/hooks/useFirestore";
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
  Loader2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { AuthorCell } from "@/components/icm/AuthorCell";
import { useIndividual, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { type CarePlan } from "@/data/carePlans";
import { useCarePlans, addCarePlan } from "@/hooks/useFirestore";
import { PCPCreationModal, type PCPMode } from "@/components/pcp/PCPCreationModal";


const PersonCarePlan = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading: individualLoading } = useIndividual(id);
  const { data: allPlans, loading: plansLoading } = useCarePlans(id);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [draftingAI, setDraftingAI] = useState(false);
  // PCP Creation Modal state
  const [pcpModalOpen, setPcpModalOpen] = useState(false);
  const [pcpMode, setPcpMode] = useState<PCPMode>("blank");
  const [sharePlan, setSharePlan] = useState<CarePlan | null>(null);

  // PCP Agent state
  const [pcpAgentId, setPcpAgentId] = useState<string | null>(null);
  const [pcpAgentPrompt, setPcpAgentPrompt] = useState<string>("");
  const [pcpEngineName, setPcpEngineName] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "agents"), where("type", "in", ["pcp_generator", "pcp_alignment"]), where("status", "==", "active"), limit(1))
        );
        if (!snap.empty) {
          const d = snap.docs[0];
          setPcpAgentId(d.id);
          setPcpAgentPrompt(d.data().master_prompt || "");
          setPcpEngineName(d.data().guidelines_engine_name || "");
        }
      } catch { /* non-fatal */ }
    })();
  }, []);

  const [planType, setPlanType] = useState("Person-Centered Plan (PCP)");
  const [internalDueDate, setInternalDueDate] = useState("2026-08-01");
  const [notes, setNotes] = useState("");
  // Renewal date modify state
  const [showModifyRenewal, setShowModifyRenewal] = useState(false);
  const [renewalDateEdit, setRenewalDateEdit] = useState("2026-08-31");

  const inProgress = useMemo(() => allPlans.filter((p: any) => {
    if (p.isCompleted === true) return false;
    const s = (p.status || '').toLowerCase();
    return s !== 'archived' && s !== 'completed';
  }), [allPlans]);
  const completed = useMemo(() => allPlans.filter((p: any) => {
    if (p.isCompleted === true) return true;
    const s = (p.status || '').toLowerCase();
    return s === 'archived' || s === 'completed';
  }), [allPlans]);

  // Compute renewal days — must be above all early returns (Rules of Hooks)
  const activePlan = inProgress[0];
  const renewalTarget = (activePlan as any)?.reviewDate || (activePlan as any)?.internalDueDate || null;
  const renewalDaysNum = useMemo(() => {
    if (!renewalTarget) return null;
    const d = new Date(renewalTarget);
    if (isNaN(d.getTime())) return null;
    return Math.ceil((d.getTime() - Date.now()) / 86400000);
  }, [renewalTarget]);
  const isOverdue = renewalDaysNum !== null && renewalDaysNum < 0;
  const renewalDays = renewalDaysNum !== null ? Math.abs(renewalDaysNum) : 127;
  const lastApproved = (completed[0] as any)?.approvalDate ?? "—";

  const loading = individualLoading || plansLoading;

  if (loading) {
    return (
      <ICMShell title="PCP" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }
  if (!individual) {
    return (
      <ICMShell title="PCP" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p>
      </ICMShell>
    );
  }

  // Handler to save a date field on a plan
  const handleSetDate = async (planId: string, field: string, value: string) => {
    try {
      await updateCarePlan(planId, { [field]: value });
      toast.success("Date saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save date");
    }
  };

  // Handler to save annual renewal date
  const handleSaveRenewal = async () => {
    if (!activePlan) { setShowModifyRenewal(false); return; }
    try {
      await updateCarePlan(activePlan.id, { reviewDate: renewalDateEdit, internalDueDate: renewalDateEdit });
      toast.success("Renewal date updated");
    } catch (err) {
      toast.error("Failed to update renewal date");
    }
    setShowModifyRenewal(false);
  };

  const openPlan = (planId: string) => navigate(`/people/${id}/care-plan/${planId}`);

  const handleCreatePlan = async (isAi = false) => {
    if (!individual) return;
    try {
      const docRef = await addCarePlan({
        individual_id: id,
        personId: id,
        status: isAi ? "In Progress" : "Draft",
        isCompleted: false,
        internalDueDate: internalDueDate,
        updatedBy: "Kathy Martinez",
        updatedOn: new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
        effectiveDate: "08/01/2026",
        reviewDate: "08/01/2027",
        aiDrafted: isAi,
        goals: isAi ? [
          {
            id: "g1",
            number: 1,
            title: "Explore part-time employment opportunities",
            description: `Joseph has expressed interest in pursuing part-time employment. Connect with Supported Employment provider to assess vocational interests, identify community-based work opportunities aligned with his skills, and arrange job shadowing within 90 days.`,
            targetDate: "10/31/2026",
            responsibleParty: "Kathy Martinez + Supported Employment provider",
            progress: "Not Started",
            aiSuggested: true,
            objectives: [
              { id: "g1o1", description: "Complete vocational interest assessment", status: "Not Started", aiSuggested: true },
              { id: "g1o2", description: "Schedule 2 job shadowing visits", status: "Not Started", aiSuggested: true }
            ]
          }
        ] : [],
        services: [
          {
            id: "s1",
            name: "Day Habilitation (T2021)",
            provider: "Carroll Community Services",
            startDate: "08/01/2025",
            endDate: "07/31/2026",
            units: "5 days/week",
            status: "Active"
          }
        ],
        supportNeeds: {
          workingWell: { value: "Joseph is consistently attending Day Habilitation 4-5 days per week." },
          notWorking: { value: "Recent withdrawn behavior reported by mother (last 2 weeks)." },
          preferences: { value: "Joseph has expressed clear interest in exploring part-time employment." },
          healthSafety: { value: "Behavioral changes at home flagged Low-Medium severity." }
        },
        team: [
          { role: "Individual", name: `${individual.first_name} ${individual.last_name}`, status: "Pending" },
          { role: "Case Manager", name: "Kathy Martinez", status: "Pending" }
        ],
        history: [
          { date: new Date().toLocaleDateString(), user: "Kathy Martinez", action: isAi ? "AI draft generated from ambient session" : "Plan created" }
        ]
      });
      toast.success("Plan created successfully!");
      setNewPlanOpen(false);
      setDraftingAI(false);
      navigate(`/people/${id}/care-plan/${docRef.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create plan");
    }
  };

  // Empty state
  if (allPlans.length === 0) {
    return (
      <ICMShell
        title="PCP"
        showAIPanel={false}
      >
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-icm-bg border border-icm-border flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-icm-text-faint" />
          </div>
          <h2 className="font-manrope font-extrabold text-[20px] text-icm-text mb-1">No care plans yet</h2>
          <p className="text-[13px] text-icm-text-dim max-w-md mb-6">
            Start {individual.first_name}'s first plan or let AI draft one based on existing records.
          </p>
          <div className="flex gap-2">
            <button
              id="btn-start-blank-plan"
              onClick={() => { setPcpMode("blank"); setPcpModalOpen(true); }}
              className="h-10 px-4 rounded-xl border border-icm-border text-[13px] font-medium text-icm-text hover:bg-icm-bg"
            >
              + Start blank plan
            </button>
            <button
              id="btn-draft-with-ai"
              onClick={() => {
                if (!pcpAgentId) {
                  toast.error("No PCP Agent configured. Ask your admin to set one up under AI Agents.");
                  return;
                }
                setPcpMode("ai");
                setPcpModalOpen(true);
              }}
              className="h-10 px-4 rounded-xl bg-icm-text text-icm-panel text-[13px] font-medium hover:opacity-90 inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Draft with AI
            </button>
          </div>
        </div>
        {pcpModalOpen && (
          <PCPCreationModal
            mode={pcpMode}
            individualId={id ?? ""}
            individualName={individual ? `${individual.first_name} ${individual.last_name}` : ""}
            annualPlanDate="08/31/2026"
            onClose={() => setPcpModalOpen(false)}
            agentId={pcpAgentId ?? undefined}
            agentMasterPrompt={pcpAgentPrompt}
            linkedGuidelinesEngineName={pcpEngineName}
            individualProgram={individual?.program ?? undefined}
            individualState={individual?.state ?? undefined}
          />
        )}
      </ICMShell>
    );
  }

  return (
    <ICMShell
      title="PCP"
      showAIPanel={false}
    >
      <div className="space-y-5">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(`/people/${individual.id}/echart`)}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {individual.last_name}, {individual.first_name} · PCP
        </button>

        {/* Sticky person header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3 flex-wrap">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono text-[14px] font-bold ${riskAvatarClass(individual.risk_score)}`}>
            {initials(individual)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-manrope font-extrabold text-[16px] text-icm-text tracking-tight">
              {individual.last_name}, {individual.first_name}
              {individual.preferred_name && <span className="font-medium text-icm-text-dim"> ({individual.preferred_name})</span>}
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

        {/* Title + meta + new */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              PCP
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist relative">
              <span className="font-semibold text-icm-text">Person-Centered Plan (PCP)</span>
              <span className="text-icm-text-faint"> · </span>
              Annual renewal:{" "}
              <span className="font-mono text-icm-text">
                {renewalTarget
                  ? new Date(renewalTarget).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                  : "August 31"}
              </span>
              <button
                onClick={() => { setRenewalDateEdit(renewalTarget || "2026-08-31"); setShowModifyRenewal(true); }}
                className="ml-1.5 text-icm-accent hover:underline text-[12px]"
              >
                Modify
              </button>
              {/* Inline renewal date editor */}
              {showModifyRenewal && (
                <span className="absolute left-0 top-7 z-30 bg-white border border-icm-border rounded-xl shadow-lg p-3 flex items-center gap-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                  <input
                    type="date"
                    value={renewalDateEdit}
                    onChange={e => setRenewalDateEdit(e.target.value)}
                    className="h-8 px-2 rounded-lg border border-icm-border text-[12.5px] font-mono text-icm-text bg-white focus:outline-none focus:border-icm-accent"
                  />
                  <button
                    onClick={handleSaveRenewal}
                    className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowModifyRenewal(false)}
                    className="h-8 px-3 rounded-lg border border-icm-border text-[12px] text-icm-text-dim hover:bg-icm-bg"
                  >
                    Cancel
                  </button>
                </span>
              )}
            </p>
          </div>
          <button
            id="btn-new-pcp-plan"
            onClick={() => { setPcpMode("blank"); setPcpModalOpen(true); }}
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
                I drafted updated goal language based on recent monitoring notes and {individual.first_name}'s expressed interests.
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
          <PlanTable plans={inProgress} onOpen={openPlan} variant="inProgress" onSetDate={handleSetDate} />
        </Section>

        {/* Completed */}
        <Section title="Completed" count={completed.length} collapsible collapsed={!completedOpen} onToggle={() => setCompletedOpen((o) => !o)}>
          <PlanTable plans={completed} onOpen={openPlan} variant="completed" onShare={(p) => setSharePlan(p)} onSetDate={handleSetDate} />
        </Section>
      </div>

      {sharePlan && (
        <SharePlanModal
          plan={sharePlan}
          personName={`${individual.last_name}, ${individual.first_name}`}
          onClose={() => setSharePlan(null)}
        />
      )}

      {/* PCP Creation Modal — replaces the old broken modal */}
      {pcpModalOpen && (
        <PCPCreationModal
          mode={pcpMode}
          individualId={id ?? ""}
          individualName={`${individual.first_name} ${individual.last_name}`}
          annualPlanDate="08/31/2026"
          onClose={() => setPcpModalOpen(false)}
        />
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

function PlanTable({
  plans, onOpen, variant, onShare, onSetDate,
}: {
  plans: CarePlan[];
  onOpen: (id: string) => void;
  variant: "inProgress" | "completed";
  onShare?: (p: CarePlan) => void;
  onSetDate?: (planId: string, field: string, value: string) => void;
}) {
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
          {plans.map((p) => {
            // Show a short human-readable ID: plan_id_display (e.g. "6080") or first 8 chars
            const displayId = (p as any).plan_id_display || p.id.slice(0, 8);
            return (
              <tr key={p.id} className="hover:bg-icm-bg/40 transition-colors">
                <td className="px-4 py-3">
                  <button onClick={() => onOpen(p.id)} className="font-mono font-semibold text-icm-accent hover:underline">
                    {displayId}
                  </button>
                  {p.goals && p.goals.length > 0 && (
                    <div className="text-[11px] text-icm-text-dim mt-1 space-y-0.5 max-w-[220px]">
                      {p.goals.map((g: any, idx: number) => (
                        <div key={idx} className="truncate">
                          • {g.title || g.goal || "Goal"}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <DateCell value={(p as any).internalDueDate || (p as any).internal_due_date} planId={p.id} field="internalDueDate" onSave={onSetDate} />
                </td>
                <td className="px-4 py-3">
                  <DateCell value={(p as any).meetingDate || (p as any).meeting_date} planId={p.id} field="meetingDate" onSave={onSetDate} />
                </td>
                <td className="px-4 py-3">
                  <DateCell value={(p as any).crReceivedDate || (p as any).cr_received_date} planId={p.id} field="crReceivedDate" onSave={onSetDate} />
                </td>
                <td className="px-4 py-3">
                  <DateCell value={(p as any).approvalDate || (p as any).approval_date} planId={p.id} field="approvalDate" onSave={onSetDate} />
                </td>
                {variant === "completed" && (
                  <td className="px-4 py-3">
                    <DateCell value={(p as any).completedDate || (p as any).completed_date} planId={p.id} field="completedDate" onSave={onSetDate} />
                  </td>
                )}
                <td className="px-4 py-3 text-icm-text-dim">
                  <AuthorCell name={p.updatedBy} size="sm" showName={true} />
                  <div className="font-mono text-[11px] text-icm-text-faint mt-0.5">{p.updatedOn}</div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    {variant === "completed" && (
                      <>
                        <button
                          onClick={() => onShare?.(p)}
                          title="Send secure link to provider"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-geist font-medium text-icm-accent hover:bg-icm-accent-soft"
                        >
                          <Send className="w-3.5 h-3.5" /> Send
                        </button>
                        <button
                          onClick={() => toast.success(`Downloading PCP ${displayId}.pdf`)}
                          title="Download PDF"
                          className="p-1.5 rounded-md text-icm-text-dim hover:bg-icm-bg hover:text-icm-text"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { toast("Opening print dialog…"); setTimeout(() => window.print(), 200); }}
                          title="Print"
                          className="p-1.5 rounded-md text-icm-text-dim hover:bg-icm-bg hover:text-icm-text"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => toast(`Delete plan ${displayId}?`, {
                        action: {
                          label: "Delete",
                          onClick: async () => {
                            try {
                              await deleteDoc(doc(db, "care_plans", p.id));
                              toast.success(`Plan ${displayId} deleted`);
                            } catch {
                              toast.error("Failed to delete plan — check connection.");
                            }
                          }
                        }
                      })}
                      className="text-icm-text-faint hover:text-icm-red p-1.5 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DateCell({
  value, planId, field, onSave,
}: {
  value?: string;
  planId?: string;
  field?: string;
  onSave?: (planId: string, field: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  // If no planId / onSave (legacy usage), fall back to old toast behaviour
  if (!planId || !onSave) {
    if (!value || value === "—") {
      return (
        <button
          onClick={() => toast("Set date", { description: "Date picker coming soon." })}
          className="text-icm-accent hover:underline text-[12px] inline-flex items-center gap-1"
        >
          <CalendarDays className="w-3 h-3" /> Set date
        </button>
      );
    }
    return <span className="font-mono text-icm-text">{value}</span>;
  }

  if (!value || value === "—") {
    // Show "Set date" — clicking shows an inline date input
    if (!editing) {
      return (
        <button
          onClick={() => { setDraft(""); setEditing(true); }}
          className="text-icm-accent hover:underline text-[12px] inline-flex items-center gap-1"
        >
          <CalendarDays className="w-3 h-3" /> Set date
        </button>
      );
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <input
          type="date"
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="h-7 px-2 rounded-md border border-icm-accent text-[12px] font-mono text-icm-text bg-white focus:outline-none"
        />
        <button
          onClick={() => {
            if (!draft) { setEditing(false); return; }
            onSave(planId, field!, draft);
            setEditing(false);
          }}
          className="h-7 px-2 rounded-md bg-icm-text text-icm-panel text-[11px] font-medium hover:opacity-90"
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="h-7 px-2 rounded-md border border-icm-border text-[11px] text-icm-text-dim hover:bg-icm-bg"
        >
          ✕
        </button>
      </div>
    );
  }

  // Has a value — show it, click to edit
  return (
    <button
      onClick={() => { setDraft(value || ""); setEditing(true); }}
      className="font-mono text-icm-text hover:text-icm-accent hover:underline text-[12px]"
      title="Click to edit date"
    >
      {value}
    </button>
  );
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

function SharePlanModal({ plan, personName, onClose }: { plan: CarePlan; personName: string; onClose: () => void }) {
  const [step, setStep] = useState<"compose" | "sent">("compose");
  const [providerName, setProviderName] = useState("");
  const [providerOrg, setProviderOrg] = useState("");
  const [providerEmail, setProviderEmail] = useState("");
  const [expiresIn, setExpiresIn] = useState("7");
  const [requirePasscode, setRequirePasscode] = useState(true);
  const [notifyOnOpen, setNotifyOnOpen] = useState(true);
  const [message, setMessage] = useState(
    `Hello,\n\nPlease find the attached Person-Centered Plan (PCP) for ${personName}. Access it securely via the link below. This link is encrypted and expires automatically.\n\nThank you.`
  );

  const secureLink = useMemo(() => {
    const token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    return `https://share.casemgmt.ai/pcp/${plan.id.toLowerCase()}/${token}`;
  }, [plan.id]);
  const passcode = useMemo(() => Math.floor(100000 + Math.random() * 900000).toString(), [plan.id]);

  const sendIt = () => {
    if (!providerEmail) {
      toast.error("Provider email is required");
      return;
    }
    setStep("sent");
    toast.success(`Secure PCP link sent to ${providerEmail}`);
  };

  return (
    <Modal title={step === "compose" ? "Send PCP to External Provider" : "Secure link sent"} onClose={onClose}>
      {step === "compose" ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-icm-border bg-icm-bg/50 p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-icm-accent-soft flex items-center justify-center">
              <FileText className="w-4 h-4 text-icm-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold text-icm-text truncate">PCP {plan.id} — {personName}</div>
              <div className="text-[11px] text-icm-text-dim font-mono">Approved {plan.approvalDate ?? "—"}</div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-icm-green bg-icm-green-soft px-1.5 py-0.5 rounded ring-1 ring-icm-green/20">
              <Lock className="w-3 h-3" /> Encrypted
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Provider name">
              <input value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="Dr. Jane Smith" className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[13px]" />
            </Field>
            <Field label="Organization">
              <input value={providerOrg} onChange={(e) => setProviderOrg(e.target.value)} placeholder="Acme IDD Services" className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[13px]" />
            </Field>
          </div>
          <Field label="Provider email">
            <input type="email" value={providerEmail} onChange={(e) => setProviderEmail(e.target.value)} placeholder="provider@example.com" className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[13px]" />
          </Field>
          <Field label="Message">
            <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist" />
          </Field>

          <div className="rounded-lg border border-icm-border p-3 space-y-2">
            <div className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">Security</div>
            <div className="flex items-center justify-between gap-3">
              <label className="text-[12px] text-icm-text">Link expires in</label>
              <select value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)} className="h-8 px-2 rounded-md border border-icm-border bg-white text-[12px]">
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
            </div>
            <label className="flex items-center justify-between gap-3 text-[12px] text-icm-text">
              <span>Require 6-digit passcode</span>
              <input type="checkbox" checked={requirePasscode} onChange={(e) => setRequirePasscode(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between gap-3 text-[12px] text-icm-text">
              <span>Notify me when opened</span>
              <input type="checkbox" checked={notifyOnOpen} onChange={(e) => setNotifyOnOpen(e.target.checked)} />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg">Cancel</button>
            <button onClick={sendIt} className="h-9 px-4 rounded-lg bg-teal-600 text-white text-[12px] font-medium hover:bg-teal-700 inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Send secure link
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-icm-green">
            <CheckCircle2 className="w-5 h-5" />
            <div className="text-[13px] font-semibold text-icm-text">Email sent to {providerEmail}</div>
          </div>
          <p className="text-[12px] text-icm-text-dim">
            The provider will receive an email with an encrypted link to view PCP {plan.id}. Link expires in {expiresIn} day{expiresIn === "1" ? "" : "s"}.
          </p>
          <div className="rounded-lg border border-icm-border bg-icm-bg/50 p-3 space-y-2">
            <div className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Secure link</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate text-[11.5px] font-mono text-icm-text bg-white border border-icm-border rounded px-2 py-1.5">{secureLink}</code>
              <button onClick={() => { navigator.clipboard.writeText(secureLink); toast.success("Link copied"); }} className="p-1.5 rounded border border-icm-border hover:bg-white" title="Copy link">
                <Copy className="w-3.5 h-3.5 text-icm-text-dim" />
              </button>
            </div>
            {requirePasscode && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-icm-border">
                <span className="text-[11.5px] text-icm-text-dim">Passcode (share separately)</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono font-bold text-[13px] text-icm-text tracking-widest">{passcode}</code>
                  <button onClick={() => { navigator.clipboard.writeText(passcode); toast.success("Passcode copied"); }} className="p-1 rounded hover:bg-white" title="Copy passcode">
                    <Copy className="w-3 h-3 text-icm-text-dim" />
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end pt-1">
            <button onClick={onClose} className="h-9 px-4 rounded-lg bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90">Done</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default PersonCarePlan;
