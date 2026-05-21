import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, ChevronDown, Sparkles, X, Save, Printer, Plus, Trash2,
  CheckCircle2, Clock, Mail, FileText, Users, Heart, ListChecks, Briefcase, History,
  AlertCircle, Compass, Star, Link2, ShieldCheck, GitBranch, Eye, ExternalLink,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { PersonAIPanel } from "@/components/icm/PersonAIPanel";
import { getPerson } from "@/data/people";
import { getPlan, type CarePlan, type PlanGoal } from "@/data/carePlans";
import type { AISuggestion } from "@/data/people";

const planSuggestions: AISuggestion[] = [
  { tone: "urgent", label: "Urgent", body: "ISP review overdue 25 days. 3 required signatures still pending.", cta: "Request signatures" },
  { tone: "insight", label: "Insight", body: "Goal 2 (Community Integration) has had no progress update in 4 months. Want me to update the progress status?", cta: "Update goal" },
  { tone: "insight", label: "Insight", body: "Employment goal mentioned in 2 recent sessions. Not currently in plan. Want me to draft?", cta: "Draft goal" },
  { tone: "good", label: "Good news", body: "All service authorizations are current. Next renewal: August 2026.", cta: "View services" },
];

type SectionKey = "details" | "profile" | "nsr" | "goals" | "services" | "support" | "lifecourse" | "linkages" | "team" | "history";

const PersonCarePlanDetail = () => {
  const { id, planId } = useParams<{ id: string; planId: string }>();
  const navigate = useNavigate();
  const person = getPerson(id ?? "");
  const plan = getPlan(planId ?? "");

  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    details: true, profile: false, goals: true, services: false, support: false, team: false, history: false,
  });
  const [aiBannerVisible, setAiBannerVisible] = useState(true);
  const [printOpen, setPrintOpen] = useState(false);

  if (!person || !plan) {
    return (
      <ICMShell title="Care Plan" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Plan not found.</p>
      </ICMShell>
    );
  }

  const readOnly = plan.isCompleted;
  const toggle = (k: SectionKey) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const statusToneClass =
    plan.status === "Completed" ? "bg-icm-bg text-icm-text-dim ring-icm-border"
    : plan.status === "Approved" ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
    : plan.status === "In Progress" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
    : "bg-icm-accent-soft text-icm-accent ring-icm-accent/20";

  return (
    <ICMShell
      title="Care Plan / ISP"
      rightPanel={<PersonAIPanel person={person} suggestions={planSuggestions} intro={`I'm tracking ${planSuggestions.length} items on plan #${plan.id}.`} />}
    >
      <div className="space-y-5">
        {/* Back */}
        <button
          onClick={() => navigate(`/people/${person.id}/care-plan`)}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Care Plan Board
        </button>

        {/* Plan header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3 flex-wrap">
          <div className="font-mono text-[13px] font-bold text-icm-text px-2.5 py-1 rounded-md bg-icm-bg border border-icm-border">
            #{plan.id}
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-geist font-semibold ring-1 ${statusToneClass}`}>
            {plan.status}
          </span>
          <div className="text-[11.5px] text-icm-text-dim font-geist">
            Last saved <span className="font-mono text-icm-text">{plan.updatedOn}</span>
            <span className="ml-2 inline-flex items-center gap-1 text-icm-green">
              <span className="w-1.5 h-1.5 rounded-full bg-icm-green" /> Autosaved
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!readOnly && (
              <>
                <button className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Save draft
                </button>
                <button className="h-9 px-3 rounded-xl bg-icm-green text-white text-[12px] font-medium hover:opacity-90 inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark complete
                </button>
              </>
            )}
            <div className="relative">
              <button
                onClick={() => setPrintOpen((o) => !o)}
                className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print / Export
              </button>
              {printOpen && (
                <div className="absolute right-0 mt-1 w-56 rounded-lg border border-icm-border bg-white shadow-lg z-10 overflow-hidden">
                  {["Print care plan (formatted)", "Export as PDF", "Export as Word document", "Copy shareable link"].map((opt) => (
                    <button key={opt} onClick={() => setPrintOpen(false)} className="w-full text-left px-3 py-2 text-[12px] text-icm-text hover:bg-icm-bg">
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI banner */}
        {aiBannerVisible && plan.aiDrafted && !readOnly && (
          <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-[12.5px] font-geist text-icm-text leading-snug">
                I drafted this plan based on <span className="font-semibold">6 monitoring forms</span>, <span className="font-semibold">3 visit summaries</span>, and <span className="font-semibold">2 contact notes</span> from the past 12 months. All AI-suggested content is labeled. Review and edit before saving.
              </p>
            </div>
            <button onClick={() => setAiBannerVisible(false)} className="text-icm-text-dim hover:text-icm-text shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {readOnly && (
          <div className="rounded-xl border border-icm-border bg-icm-bg px-4 py-3 text-[12.5px] text-icm-text-dim">
            This plan is <span className="font-semibold text-icm-text">completed</span> and read-only. To make changes, start a new plan.
          </div>
        )}

        {/* SECTION 1 — Plan Details */}
        <PlanSection icon={FileText} title="Plan Details" complete={5} total={9} open={open.details} onToggle={() => toggle("details")}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FieldRow label="Plan type" value="Person-Centered Plan (ISP)" readOnly />
            <FieldRow label="Effective date" value={plan.effectiveDate} type="date" disabled={readOnly} aiSuggested source="Inferred from prior plan" />
            <FieldRow label="Review / expiration" value={plan.reviewDate} type="date" disabled={readOnly} aiSuggested source="Auto +1 year" />
            <FieldRow label="Plan status" value={plan.status} disabled={readOnly} />
            <FieldRow label="Internal due date" value={plan.internalDueDate} type="date" disabled={readOnly} />
            <FieldRow label="Meeting date" value={plan.meetingDate} type="date" disabled={readOnly} />
            <FieldRow label="CR received date" value={plan.crReceivedDate} type="date" disabled={readOnly} />
            <FieldRow label="Plan approval date" value={plan.approvalDate} type="date" disabled={readOnly} />
            <FieldRow label="Plan completed date" value={plan.completedDate} type="date" disabled={readOnly} />
          </div>
        </PlanSection>

        {/* SECTION 2 — Individual Profile */}
        <PlanSection icon={Users} title="Individual Profile Summary" complete={5} total={5} open={open.profile} onToggle={() => toggle("profile")}>
          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            <ProfileLine label="Name" value={`${person.firstName} ${person.lastName}`} />
            <ProfileLine label="DOB" value={person.dob} />
            <ProfileLine label="Diagnosis" value="IDD, mild" />
            <ProfileLine label="Medicaid ID" value="MA-7842301" />
            <ProfileLine label="Address" value={`${person.county}`} />
            <ProfileLine label="Emergency contact" value="Linda Brown (mother)" />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11.5px]">
            <span className="text-icm-text-faint">Pulled from face sheet. Last updated 01/15/2026.</span>
            <button className="text-icm-accent hover:underline">Update in Face Sheet →</button>
          </div>
        </PlanSection>

        {/* SECTION 3 — Goals */}
        <PlanSection icon={ListChecks} title="Goals & Outcomes" complete={plan.goals.length} total={plan.goals.length} open={open.goals} onToggle={() => toggle("goals")} aiBadge>
          <div className="space-y-3">
            {plan.goals.map((g) => <GoalCard key={g.id} goal={g} readOnly={readOnly} />)}
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2 mt-4">
              <button className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add goal
              </button>
              <button className="h-9 px-3 rounded-xl border border-icm-accent/20 bg-icm-accent-soft text-[12px] font-medium text-icm-accent hover:bg-icm-accent-soft/70 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI: Add goals based on recent notes
              </button>
            </div>
          )}
        </PlanSection>

        {/* SECTION 4 — Services */}
        <PlanSection icon={Briefcase} title="Services" complete={plan.services.length} total={plan.services.length} open={open.services} onToggle={() => toggle("services")}>
          {plan.services.length === 0 ? (
            <p className="text-[12.5px] text-icm-text-faint">No services on this plan.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-icm-border">
              <table className="w-full text-[12px] font-geist">
                <thead className="bg-icm-bg/60">
                  <tr>
                    {["Service", "Provider", "Start", "End", "Units", "Status", ""].map((c, i) => (
                      <th key={i} className="text-left px-3 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-icm-border">
                  {plan.services.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2 text-icm-text font-medium">{s.name}</td>
                      <td className="px-3 py-2 text-icm-text-dim">{s.provider}</td>
                      <td className="px-3 py-2 font-mono text-icm-text-dim">{s.startDate}</td>
                      <td className="px-3 py-2 font-mono text-icm-text-dim">{s.endDate}</td>
                      <td className="px-3 py-2 text-icm-text-dim">{s.units}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">{s.status}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {!readOnly && <button className="text-icm-text-faint hover:text-icm-red"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!readOnly && (
            <>
              <button className="mt-3 h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add service
              </button>
              <div className="mt-3 rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-3 flex items-start justify-between gap-3">
                <p className="text-[12px] text-icm-text leading-snug">
                  <Sparkles className="inline w-3 h-3 text-icm-accent mr-1" />
                  {person.firstName} mentioned interest in employment support during the 04/27/2026 visit. Consider adding Supported Employment service.
                </p>
                <button className="text-[11.5px] font-semibold text-icm-accent hover:underline shrink-0">Add suggested service</button>
              </div>
            </>
          )}
        </PlanSection>

        {/* SECTION 5 — Support Needs */}
        <PlanSection icon={Heart} title="Support Needs & Preferences" complete={4} total={4} open={open.support} onToggle={() => toggle("support")} aiBadge>
          <div className="space-y-4">
            <SupportField label="What is working well" data={plan.supportNeeds.workingWell} disabled={readOnly} />
            <SupportField label="What is not working" data={plan.supportNeeds.notWorking} disabled={readOnly} />
            <SupportField label="Individual's expressed preferences and goals" data={plan.supportNeeds.preferences} disabled={readOnly} />
            <SupportField label="Health and safety considerations" data={plan.supportNeeds.healthSafety} disabled={readOnly} />
          </div>
        </PlanSection>

        {/* SECTION 6 — Team & Signatures */}
        <PlanSection icon={Users} title="Team & Signatures" complete={plan.team.filter(t => t.status === "Signed").length} total={plan.team.filter(t => t.status !== "Not required").length} open={open.team} onToggle={() => toggle("team")}>
          <div className="overflow-x-auto rounded-lg border border-icm-border">
            <table className="w-full text-[12px] font-geist">
              <thead className="bg-icm-bg/60">
                <tr>
                  {["Name", "Role", "Status", "Signed", ""].map((c, i) => (
                    <th key={i} className="text-left px-3 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-icm-border">
                {plan.team.map((t, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-icm-text font-medium">{t.name}</td>
                    <td className="px-3 py-2 text-icm-text-dim">{t.role}</td>
                    <td className="px-3 py-2"><SignaturePill status={t.status} /></td>
                    <td className="px-3 py-2 font-mono text-icm-text-dim">{t.signedOn ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {!readOnly && t.status === "Pending" && (
                        <button className="text-[11px] text-icm-accent hover:underline inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" /> Request e-signature
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!readOnly && (
            <div className="mt-3 flex justify-end">
              <button className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Send all for signature
              </button>
            </div>
          )}
        </PlanSection>

        {/* SECTION 7 — History */}
        <PlanSection icon={History} title="Plan Notes & History" complete={plan.history.length} total={plan.history.length} open={open.history} onToggle={() => toggle("history")}>
          <ol className="space-y-2">
            {plan.history.map((h, i) => (
              <li key={i} className="flex items-start gap-3 text-[12.5px]">
                <span className="font-mono text-icm-text-faint shrink-0 w-20">{h.date}</span>
                <span className="text-icm-text-dim shrink-0 w-40">{h.user}</span>
                <span className="text-icm-text">{h.action}</span>
              </li>
            ))}
          </ol>
        </PlanSection>
      </div>
    </ICMShell>
  );
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function PlanSection({
  icon: Icon, title, complete, total, open, onToggle, children, aiBadge,
}: {
  icon: typeof FileText; title: string; complete: number; total: number; open: boolean;
  onToggle: () => void; children: React.ReactNode; aiBadge?: boolean;
}) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center gap-2 hover:bg-icm-bg/60 transition-colors">
        <ChevronDown className={`w-3.5 h-3.5 text-icm-text-dim transition-transform ${open ? "" : "-rotate-90"}`} />
        <Icon className="w-4 h-4 text-icm-text-dim" />
        <span className="font-tight font-semibold text-[14px] text-icm-text">{title}</span>
        {aiBadge && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-geist font-semibold ai-gradient text-white">
            <Sparkles className="w-2.5 h-2.5" /> AI drafted
          </span>
        )}
        <span className="ml-auto text-[11px] font-mono text-icm-text-faint">{complete} / {total}</span>
      </button>
      {open && <div className="border-t border-icm-border p-4">{children}</div>}
    </div>
  );
}

function FieldRow({
  label, value, type = "text", disabled, readOnly, aiSuggested, source,
}: {
  label: string; value?: string; type?: string; disabled?: boolean; readOnly?: boolean;
  aiSuggested?: boolean; source?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint">{label}</span>
        {aiSuggested && (
          <span title={source} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20 cursor-help">
            <Sparkles className="w-2 h-2" /> AI
          </span>
        )}
      </div>
      <input
        defaultValue={value ?? ""}
        type={type}
        disabled={disabled || readOnly}
        className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text disabled:bg-icm-bg disabled:text-icm-text-dim"
      />
    </div>
  );
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">{label}</p>
      <p className="text-icm-text font-medium">{value}</p>
    </div>
  );
}

function GoalCard({ goal, readOnly }: { goal: PlanGoal; readOnly?: boolean }) {
  const progressTone =
    goal.progress === "Achieved" ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
    : goal.progress === "In Progress" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
    : goal.progress === "Discontinued" ? "bg-icm-red-soft text-icm-red ring-icm-red/20"
    : "bg-icm-bg text-icm-text-dim ring-icm-border";

  return (
    <div className="rounded-lg border border-icm-border bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-icm-bg border border-icm-border">G{goal.number}</span>
        <input
          defaultValue={goal.title}
          disabled={readOnly}
          className="flex-1 text-[14px] font-semibold text-icm-text bg-transparent border-0 outline-none focus:bg-icm-bg/40 rounded px-1 disabled:bg-transparent"
        />
        {goal.aiSuggested && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20">
            <Sparkles className="w-2.5 h-2.5" /> AI
          </span>
        )}
        {!readOnly && (
          <button className="text-icm-text-faint hover:text-icm-red p-1"><Trash2 className="w-3.5 h-3.5" /></button>
        )}
      </div>
      <textarea
        defaultValue={goal.description}
        disabled={readOnly}
        rows={3}
        maxLength={4000}
        className="w-full px-3 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text disabled:bg-icm-bg disabled:text-icm-text-dim mb-3"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <FieldRow label="Target date" value={goal.targetDate} disabled={readOnly} />
        <FieldRow label="Responsible party" value={goal.responsibleParty} disabled={readOnly} />
        <div>
          <span className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1 block">Progress</span>
          <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11.5px] font-semibold ring-1 ${progressTone}`}>{goal.progress}</span>
        </div>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-2">Objectives</p>
        <ul className="space-y-1.5">
          {goal.objectives.map((o) => (
            <li key={o.id} className="flex items-center gap-2 text-[12.5px] text-icm-text">
              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${o.status === "Achieved" ? "text-icm-green" : o.status === "In Progress" ? "text-icm-amber" : "text-icm-text-faint"}`} />
              <span className="flex-1">{o.description}</span>
              <span className="text-[11px] text-icm-text-dim">{o.status}</span>
              {o.aiSuggested && (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-semibold bg-icm-accent-soft text-icm-accent">
                  <Sparkles className="w-2 h-2" /> AI
                </span>
              )}
            </li>
          ))}
        </ul>
        {!readOnly && (
          <button className="mt-2 text-[11.5px] text-icm-accent hover:underline inline-flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add objective
          </button>
        )}
      </div>
    </div>
  );
}

function SupportField({
  label, data, disabled,
}: {
  label: string; data: { value: string; aiSuggested?: boolean; source?: string }; disabled?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11.5px] uppercase tracking-wide font-semibold text-icm-text-faint">{label}</span>
        {data.aiSuggested && (
          <span title={data.source ? `Source: ${data.source}` : undefined} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20 cursor-help">
            <Sparkles className="w-2.5 h-2.5" /> AI suggested
          </span>
        )}
      </div>
      <textarea
        defaultValue={data.value}
        disabled={disabled}
        rows={3}
        className="w-full px-3 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text leading-relaxed disabled:bg-icm-bg disabled:text-icm-text-dim"
      />
      {data.source && (
        <p className="text-[10.5px] text-icm-text-faint mt-1 font-geist italic">From: {data.source}</p>
      )}
    </div>
  );
}

function SignaturePill({ status }: { status: "Signed" | "Pending" | "Not required" }) {
  const tone =
    status === "Signed" ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
    : status === "Pending" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
    : "bg-icm-bg text-icm-text-dim ring-icm-border";
  const Icon = status === "Signed" ? CheckCircle2 : status === "Pending" ? Clock : AlertCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 ${tone}`}>
      <Icon className="w-3 h-3" /> {status}
    </span>
  );
}

export default PersonCarePlanDetail;
