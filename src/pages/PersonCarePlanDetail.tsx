import { useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronDown, Sparkles, X, Save, Printer, Plus, Trash2,
  CheckCircle2, Clock, Mail, FileText, Users, Heart, ListChecks, Briefcase, History,
  AlertCircle, Compass, Star, Link2, ShieldCheck, GitBranch, Eye, ExternalLink,
  Loader2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual } from "@/hooks/useIndividuals";
import { type CarePlan, type PlanGoal } from "@/data/carePlans";
import { useCarePlans, updateCarePlan, usePCP, useConsents } from "@/hooks/useFirestore";
import { AttestationSection, EMPTY_ATTESTATION, type AttestationValue } from "@/components/icm/AttestationSection";
import { writeAudit } from "@/lib/auditService";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { PCPDocumentViewer } from "@/components/pcp/PCPDocumentViewer";
import { MOCK_PCP_BROWN_2026 } from "@/data/pcpMockData";

const FUNCTIONS_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";

type SectionKey = "details" | "profile" | "nsr" | "goals" | "services" | "support" | "lifecourse" | "linkages" | "team" | "history";

const PersonCarePlanDetail = () => {
  const { id, planId } = useParams<{ id: string; planId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { individual, loading: individualLoading } = useIndividual(id);
  const { data: allPlans, loading: plansLoading } = useCarePlans(id);

  // ── PCP v2 detection ──────────────────────────────────────────────────────
  // A plan is a new PCP v2 if:
  //   1. planId starts with "pcp-" (seeded mock records)
  //   2. planId is a Firestore ID for a record in the `pcps` collection
  //      (detected via usePCP hook below)
  //   3. URL has ?ai=true (freshly generated from PCPOrbAnimation)
  const isPcpV2Candidate =
    planId?.startsWith("pcp-") ||
    searchParams.get("ai") === "true" ||
    false;

  const { data: pcpRecord, loading: pcpLoading } = usePCP(
    isPcpV2Candidate ? planId : undefined
  );

  // Use mock for the seeded Joseph Brown record when Firestore has no data
  const resolvedPcp =
    pcpRecord ??
    (planId === MOCK_PCP_BROWN_2026.id || isPcpV2Candidate ? MOCK_PCP_BROWN_2026 : null);

  const isAiParam = searchParams.get("ai") === "true";
  // ─────────────────────────────────────────────────────────────────────────

  const plan = allPlans.find((p: any) => p.id === planId);

  const { userProfile } = useAuth();
  const aiDraftCalledRef = useRef(false);

  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    details: true, profile: false, nsr: true, goals: true, services: false,
    support: false, lifecourse: false, linkages: true, team: false, history: false,
  });
  const [aiBannerVisible, setAiBannerVisible] = useState(true);
  const [printOpen, setPrintOpen] = useState(false);
  const [aiDraftingGoals, setAiDraftingGoals] = useState(false);

  // Guardian consent flag
  const [guardianConsentRequired, setGuardianConsentRequired] = useState(false);
  const [planAttestation, setPlanAttestation] = useState<AttestationValue>(EMPTY_ATTESTATION);
  const { data: consents } = useConsents(id);
  const hasActiveConsent = consents.some(
    (c) => c.status === "Active" && c.consent_type === "Guardian Consent for Plan Documents"
  );
  const consentBlocked = guardianConsentRequired && !hasActiveConsent;

  // ── Loading state (includes PCP v2 loading) ───────────────────────────────────────────
  const loading = individualLoading || plansLoading || (isPcpV2Candidate && pcpLoading);

  if (loading) {
    return (
      <ICMShell title="Care Plan" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  // ── PCP v2 render path ────────────────────────────────────────────────────
  if (resolvedPcp && individual) {
    return (
      <ICMShell title="Person-Centered Plan" showAIPanel={false}>
        {/* Use negative margins to break out of ICMShell's p-6 padding */}
        <div className="-mx-6 -mt-6 flex h-[calc(100vh-64px)] overflow-hidden">
          <PCPDocumentViewer
            pcp={resolvedPcp as any}
            individualId={id ?? ""}
            individualName={`${individual.first_name} ${individual.last_name}`}
            isAiGenerated={isAiParam || resolvedPcp.ai_generated}
            orgId={userProfile?.organizationId}
            individualPhotoUrl={individual.photo_url}
          />
        </div>
      </ICMShell>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  if (!individual || !plan) {
    return (
      <ICMShell title="Care Plan" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Plan not found.</p>
      </ICMShell>
    );
  }

  const handleSaveDraft = async () => {
    if (!planId) return;
    try {
      await updateCarePlan(planId, {
        status: "Draft",
        updatedOn: new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
        updatedBy: "Kathy Martinez"
      });
      await writeAudit("plan_saved", "care_plan", planId, {
        individualId: id,
        status: "Draft",
      });
      toast.success("Draft saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save draft");
    }
  };

  const handleMarkComplete = async () => {
    if (!planId) return;
    try {
      await updateCarePlan(planId, {
        isCompleted: true,
        status: "Completed",
        completedDate: new Date().toISOString().split("T")[0],
        updatedOn: new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
        updatedBy: "Kathy Martinez"
      });
      await writeAudit("plan_submitted", "care_plan", planId, {
        individualId: id,
        status: "Completed",
      });
      toast.success("Care Plan marked completed!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark complete");
    }
  };

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
      showAIPanel={false}
    >
      <div className="space-y-5">
        {/* Back */}
        <button
          onClick={() => navigate(`/people/${individual.id}/care-plan`)}
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
                <button onClick={handleSaveDraft} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Save draft
                </button>
                <button onClick={handleMarkComplete} className="h-9 px-3 rounded-xl bg-icm-green text-white text-[12px] font-medium hover:opacity-90 inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark complete
                </button>
              </>
            )}
            {/* Guardian consent toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-[12px] font-geist text-icm-text-dim select-none">
              <input
                type="checkbox"
                checked={guardianConsentRequired}
                onChange={(e) => setGuardianConsentRequired(e.target.checked)}
                className="rounded border-icm-border"
              />
              Guardian consent required to share
            </label>

            <div className="relative">
              <button
                onClick={() => { if (consentBlocked) { toast.error("Add an active Guardian Consent record before exporting."); return; } setPrintOpen((o) => !o); }}
                disabled={consentBlocked}
                title={consentBlocked ? "Guardian consent required before sharing. Add consent record first." : undefined}
                className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Printer className="w-3.5 h-3.5" /> Print / Export
              </button>
              {printOpen && (
                <div className="absolute right-0 mt-1 w-56 rounded-lg border border-icm-border bg-white shadow-lg z-10 overflow-hidden">
                  {["Print care plan (formatted)", "Export as PDF", "Export as Word document", "Copy shareable link"].map((opt) => (
                    <button key={opt} onClick={() => { setPrintOpen(false); if (opt.startsWith("Print")) window.print(); else if (opt.startsWith("Copy")) { navigator.clipboard?.writeText(window.location.href); toast.success("Shareable link copied"); } else toast.success(opt + " started"); }} className="w-full text-left px-3 py-2 text-[12px] text-icm-text hover:bg-icm-bg">
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Guardian consent warning banner */}
        {consentBlocked && (
          <div className="rounded-xl border border-icm-amber/40 bg-icm-amber-soft px-4 py-3 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-icm-amber shrink-0 mt-0.5" />
            <p className="text-[12.5px] font-geist text-icm-text">
              <span className="font-semibold">Guardian consent required before sharing.</span>{" "}
              No active "Guardian Consent for Plan Documents" consent record found for this individual.{" "}
              <a href={`/people/${id}/profile?tab=administrative`} className="text-icm-accent font-semibold underline underline-offset-2">Add consent record first →</a>
            </p>
          </div>
        )}

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
            <ProfileLine label="Name" value={`${individual.first_name} ${individual.last_name}`} />
            <ProfileLine label="DOB" value={individual.dob ?? "—"} />
            <ProfileLine label="Diagnosis" value="IDD, mild" />
            <ProfileLine label="Medicaid ID" value="MA-7842301" />
            <ProfileLine label="Address" value={`${individual.county ?? "—"}`} />
            <ProfileLine label="Emergency contact" value="Linda Brown (mother)" />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11.5px]">
            <span className="text-icm-text-faint">Pulled from face sheet. Last updated 01/15/2026.</span>
            <button onClick={() => navigate(`/people/${individual.id}/face-sheet`)} className="text-icm-accent hover:underline">Update in Face Sheet →</button>
          </div>
        </PlanSection>

        {/* SECTION 3 — Goals */}
        <PlanSection icon={ListChecks} title="Goals & Outcomes" complete={(plan.goals ?? []).length} total={(plan.goals ?? []).length} open={open.goals} onToggle={() => toggle("goals")} aiBadge>
          <div className="space-y-3">
            {(plan.goals ?? []).map((g) => <GoalCard key={g.id} goal={g} readOnly={readOnly} />)}
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => toast("Add goal", { description: "Opening goal builder…" })} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add goal
              </button>
              <button
                onClick={async () => {
                  if (aiDraftCalledRef.current || aiDraftingGoals) return;
                  aiDraftCalledRef.current = true;
                  setAiDraftingGoals(true);
                  try {
                    const token = await auth.currentUser?.getIdToken();
                    const res = await fetch(`${FUNCTIONS_BASE}/api/ai-forms/care-plan-draft`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({
                        individualId: id,
                        organizationId: userProfile?.organizationId ?? "unknown",
                        userId: auth.currentUser?.uid ?? "unknown",
                        userName: userProfile?.displayName ?? "Case Manager",
                        userRole: userProfile?.role ?? "case_manager",
                      }),
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    if (!data.success || !data.draft?.goals?.length) {
                      toast.error("AI could not generate goals — try again later.");
                      return;
                    }
                    // Map AI goals to PlanGoal shape and append to plan via Firestore
                    const aiGoals = data.draft.goals.map((g: any, i: number) => ({
                      id: `ai-g${Date.now()}-${i}`,
                      number: (plan?.goals?.length ?? 0) + i + 1,
                      title: g.title,
                      description: g.description,
                      targetDate: g.target_date ?? "",
                      responsibleParty: g.responsible_party ?? "Case Manager",
                      progress: "In Progress" as const,
                      aiSuggested: true,
                      domain: g.domain ?? "",
                      objectives: (g.objectives ?? []).map((o: any) => ({
                        id: o.id ?? `o${i}`,
                        description: o.text ?? "",
                        status: "In Progress" as const,
                        aiSuggested: true,
                      })),
                    }));
                    await updateCarePlan(planId!, {
                      goals: [...(plan?.goals ?? []), ...aiGoals],
                      aiDrafted: true,
                    });
                    await writeAudit("plan_saved", "care_plan", planId!, {
                      individualId: id,
                      aiDrafted: true,
                      goalsCount: aiGoals.length,
                    });
                    toast.success(`AI drafted ${aiGoals.length} new goals`, {
                      description: `Based on ${data.draft.plan_year ?? "12 months"} of documentation. Review and edit before saving.`,
                    });
                  } catch (err) {
                    console.error("[CarePlanDetail] AI draft failed:", err);
                    toast.error("AI drafting failed — check console.");
                  } finally {
                    setAiDraftingGoals(false);
                  }
                }}
                className="h-9 px-3 rounded-xl border border-icm-accent/20 bg-icm-accent-soft text-[12px] font-medium text-icm-accent hover:bg-icm-accent-soft/70 inline-flex items-center gap-1.5 disabled:opacity-50"
                disabled={aiDraftingGoals}
              >
                {aiDraftingGoals ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {aiDraftingGoals ? "AI drafting goals…" : "AI: Add goals based on recent notes"}
              </button>
            </div>
          )}
        </PlanSection>

        {/* SECTION 4 — Services */}
        <PlanSection icon={Briefcase} title="Services" complete={(plan.services ?? []).length} total={(plan.services ?? []).length} open={open.services} onToggle={() => toggle("services")}>
          {(plan.services ?? []).length === 0 ? (
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
                  {(plan.services ?? []).map((s) => (
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
                        {!readOnly && <button onClick={() => toast(`Remove ${s.name}?`, { action: { label: "Remove", onClick: () => toast.success(`${s.name} removed from plan`) } })} className="text-icm-text-faint hover:text-icm-red"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!readOnly && (
            <>
              <button onClick={() => toast("Add service", { description: "Opening service authorization picker…" })} className="mt-3 h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add service
              </button>
              <div className="mt-3 rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-3 flex items-start justify-between gap-3">
                <p className="text-[12px] text-icm-text leading-snug">
                  <Sparkles className="inline w-3 h-3 text-icm-accent mr-1" />
                  {individual.first_name} mentioned interest in employment support during the 04/27/2026 visit. Consider adding Supported Employment service.
                </p>
                <button onClick={() => toast.success("Supported Employment added as draft service", { description: "Review & Apply required before billing." })} className="text-[11.5px] font-semibold text-icm-accent hover:underline shrink-0">Add suggested service</button>
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

        {/* SECTION 5b — Needs / Strengths / Risks */}
        <PlanSection icon={ListChecks} title="Needs, Strengths & Risks" complete={3} total={3} open={open.nsr} onToggle={() => toggle("nsr")} aiBadge>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <NSRColumn
              title="Needs"
              tone="amber"
              items={[
                { text: "Daily support for medication management", source: "Assessment HRA-2026" },
                { text: "Transportation to community activities", source: "Visit note 04/27" },
                { text: "Behavioral support during transitions", source: "Care team input" },
              ]}
              disabled={readOnly}
            />
            <NSRColumn
              title="Strengths"
              tone="green"
              items={[
                { text: "Strong family support network", source: "Intake" },
                { text: "Motivated to participate in community events", source: "Visit note 04/27" },
                { text: "Excellent communication when given visual cues", source: "Assessment FA-2026" },
              ]}
              disabled={readOnly}
            />
            <NSRColumn
              title="Risks"
              tone="red"
              items={[
                { text: "Fall risk during transfers", source: "Assessment HRA-2026", severity: "critical" },
                { text: "Medication interaction risk (3 active prescriptions)", source: "Pharmacy review", severity: "warning" },
                { text: "Elopement risk in unfamiliar environments", source: "Incident log", severity: "warning" },
              ]}
              disabled={readOnly}
            />
          </div>
          <p className="mt-3 text-[11px] text-icm-text-faint">
            Items linked back to source assessments and notes — click to trace origin.
          </p>
        </PlanSection>

        {/* SECTION 7 — LifeCourse Framework (7.3) */}
        <PlanSection icon={Compass} title="LifeCourse Framework" complete={4} total={5} open={open.lifecourse} onToggle={() => toggle("lifecourse")} aiBadge>
          <div className="rounded-lg bg-icm-accent-soft/40 border border-icm-accent/20 px-3 py-2 mb-4">
            <p className="text-[11.5px] text-icm-text">
              <span className="font-semibold">Charting the LifeCourse</span> is included in proposed pricing —
              an evidence-based framework focused on the participant's vision for a good life.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LifeCourseCard
              icon={Eye}
              title="Vision for a Good Life"
              body={`${individual.first_name} wants to live independently with family support, work part-time in a community setting, and stay active with friends.`}
              disabled={readOnly}
            />
            <LifeCourseCard
              icon={Compass}
              title="Life Trajectory"
              body="Today: lives at home, attends day program 3 days/week. Future: own apartment with shared supports, part-time job in retail, expanded social circle."
              disabled={readOnly}
            />
          </div>

          <div className="mt-3 rounded-lg border border-icm-border bg-icm-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-3.5 h-3.5 text-icm-amber" />
              <h4 className="font-tight font-semibold text-[13px] text-icm-text">Integrated Supports Star</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { k: "Personal Strengths", v: "Communication, motivation" },
                { k: "Relationships", v: "Family, day-program peers" },
                { k: "Community Based", v: "Library, YMCA, church" },
                { k: "Eligibility Specific", v: "Waiver CIH, Medicaid SP" },
                { k: "Technology", v: "Smartphone reminders, AAC app" },
              ].map((c) => (
                <div key={c.k} className="rounded-lg border border-icm-border bg-icm-bg p-2.5">
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-icm-text-faint">{c.k}</p>
                  <p className="text-[11.5px] text-icm-text mt-0.5 leading-snug">{c.v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-icm-border bg-icm-panel p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5 text-icm-accent" />
              <h4 className="font-tight font-semibold text-[13px] text-icm-text">Supported Decision-Making</h4>
            </div>
            <p className="text-[12px] text-icm-text-dim leading-relaxed">
              {individual.first_name} makes decisions with support from mother (Linda), older brother (David),
              and care manager. Decisions about medical care require co-signature; daily routine decisions
              are made independently.
            </p>
          </div>

          <div className="mt-3 rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <Link2 className="w-3.5 h-3.5 text-icm-accent mt-0.5 shrink-0" />
              <p className="text-[12px] text-icm-text leading-snug">
                <span className="font-semibold">Goal linkage:</span>{" "}
                <span className="text-icm-text-dim">3 of {(plan.goals ?? []).length} plan goals are mapped to the Life Trajectory and Integrated Supports Star.</span>
              </p>
            </div>
            {!readOnly && (
              <button onClick={() => toast.success("Mapping suggestions ready", { description: "2 goals proposed for LifeCourse linkage." })} className="text-[11.5px] font-semibold text-icm-accent hover:underline shrink-0">
                Map remaining →
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button onClick={() => toast.success("LifeCourse one-page profile exported (PDF)")} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Export LifeCourse one-page profile
            </button>
            <button onClick={() => toast("LifeCourse report", { description: "Opening full LifeCourse report…" })} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> View LifeCourse report
            </button>
          </div>
        </PlanSection>

        {/* SECTION 7b — Linkages, Versioning & Access (7.2) */}
        <PlanSection icon={GitBranch} title="Linkages, Versioning & Access" complete={5} total={5} open={open.linkages} onToggle={() => toggle("linkages")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Linked assessments */}
            <div className="rounded-lg border border-icm-border bg-icm-panel p-3">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-icm-text-faint mb-2">Linked Assessments</p>
              <ul className="space-y-1.5">
                {[
                  { id: "A-2026-01", name: "Health Risk Assessment v3.1", date: "04/12/2026", score: "LOC High (32)" },
                  { id: "A-2026-02", name: "Functional Assessment v2.0", date: "03/28/2026", score: "Score 18/30" },
                ].map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => navigate(`/people/${individual.id}/assessments/${a.id}`)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-icm-bg border border-icm-border hover:border-icm-accent text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-icm-text truncate">{a.name}</p>
                        <p className="text-[10.5px] text-icm-text-faint font-mono">{a.id} · {a.date} · {a.score}</p>
                      </div>
                      <ExternalLink className="w-3 h-3 text-icm-text-faint shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Service authorizations / billable linkage */}
            <div className="rounded-lg border border-icm-border bg-icm-panel p-3">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-icm-text-faint mb-2">Service Authorizations</p>
              <ul className="space-y-1.5">
                {[
                  { id: "AUTH-2026-0123", service: "Targeted Case Management", units: "120 / mo", expires: "08/31/2026" },
                  { id: "AUTH-2026-0124", service: "Community Habilitation", units: "60 hrs / mo", expires: "08/31/2026" },
                ].map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-icm-bg border border-icm-border">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-icm-text truncate">{a.service}</p>
                      <p className="text-[10.5px] text-icm-text-faint font-mono">{a.id} · {a.units} · exp {a.expires}</p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20 shrink-0">Billable</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10.5px] text-icm-text-faint">
                Visit notes referencing these services flow to billing automatically.
              </p>
            </div>

            {/* Monitoring frequency */}
            <div className="rounded-lg border border-icm-border bg-icm-panel p-3">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-icm-text-faint mb-2">Monitoring Frequency</p>
              <ul className="text-[12px] text-icm-text space-y-1">
                <li className="flex justify-between"><span>Monthly contact</span><span className="font-mono text-icm-text-dim">required</span></li>
                <li className="flex justify-between"><span>Quarterly in-home visit</span><span className="font-mono text-icm-text-dim">required</span></li>
                <li className="flex justify-between"><span>Semi-annual plan review</span><span className="font-mono text-icm-text-dim">required</span></li>
                <li className="flex justify-between"><span>Annual recertification</span><span className="font-mono text-icm-text-dim">required</span></li>
              </ul>
            </div>

            {/* Guardian / Participant portal access */}
            <div className="rounded-lg border border-icm-border bg-icm-panel p-3">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-icm-text-faint mb-2">Guardian & Participant Access</p>
              <div className="space-y-2">
                {[
                  { name: `${individual.first_name} (participant)`, access: "View plan + comment", status: "Active" },
                  { name: "Linda Brown (guardian)", access: "View plan + e-sign", status: "Active" },
                ].map((p) => (
                  <div key={p.name} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-icm-bg border border-icm-border">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-icm-text truncate">{p.name}</p>
                      <p className="text-[10.5px] text-icm-text-faint">{p.access}</p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20 shrink-0">{p.status}</span>
                  </div>
                ))}
                {!readOnly && (
                  <button onClick={() => toast.success("Portal invitation resent", { description: "Email sent to Linda Brown · audit logged." })} className="text-[11.5px] text-icm-accent hover:underline inline-flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Resend portal invitation
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Plan versions */}
          <div className="mt-4 rounded-lg border border-icm-border bg-icm-panel p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-icm-text-faint">Plan Version History</p>
              <span className="text-[10px] text-icm-text-faint">Immutable — edits create a new version</span>
            </div>
            <ol className="space-y-1.5">
              {[
                { v: "v3.0", date: "04/15/2026", who: "Kathy Adams, CM", note: "Current draft — incorporates 04/12 HRA findings" },
                { v: "v2.1", date: "08/30/2025", who: "Kathy Adams, CM", note: "Annual renewal, approved" },
                { v: "v2.0", date: "08/15/2024", who: "Marcus Lee, CM", note: "Annual renewal, approved" },
                { v: "v1.0", date: "08/01/2023", who: "Marcus Lee, CM", note: "Initial plan" },
              ].map((vv, i) => (
                <li key={vv.v} className="flex items-center gap-3 px-2.5 py-1.5 rounded-md bg-icm-bg border border-icm-border">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${i === 0 ? "bg-icm-amber-soft text-icm-amber" : "bg-icm-bg text-icm-text-dim border border-icm-border"}`}>
                    {vv.v}
                  </span>
                  <span className="text-[11px] font-mono text-icm-text-faint w-20 shrink-0">{vv.date}</span>
                  <span className="text-[11.5px] text-icm-text-dim w-32 shrink-0 truncate">{vv.who}</span>
                  <span className="text-[11.5px] text-icm-text truncate flex-1">{vv.note}</span>
                  <button onClick={() => toast(`Plan ${vv.v}`, { description: `Opened read-only snapshot from ${vv.date}` })} className="text-[11px] text-icm-accent hover:underline shrink-0">View</button>
                </li>
              ))}
            </ol>
          </div>
        </PlanSection>


        {/* SECTION 6 — Team & Signatures */}
        <PlanSection icon={Users} title="Team & Signatures" complete={(plan.team ?? []).filter(t => t.status === "Signed").length} total={(plan.team ?? []).filter(t => t.status !== "Not required").length} open={open.team} onToggle={() => toggle("team")}>
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
                {(plan.team ?? []).map((t, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-icm-text font-medium">{t.name}</td>
                    <td className="px-3 py-2 text-icm-text-dim">{t.role}</td>
                    <td className="px-3 py-2"><SignaturePill status={t.status} /></td>
                    <td className="px-3 py-2 font-mono text-icm-text-dim">{t.signedOn ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {!readOnly && t.status === "Pending" && (
                        <button onClick={() => toast.success(`E-sign request sent to ${t.name}`)} className="text-[11px] text-icm-accent hover:underline inline-flex items-center gap-1">
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
              <button onClick={() => toast.success("E-sign requests sent", { description: `${(plan.team ?? []).filter(t => t.status === "Pending").length} pending signers notified.` })} className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Send all for signature
              </button>
            </div>
          )}
        </PlanSection>

        {/* SECTION 7 — History */}
        <PlanSection icon={History} title="Plan Notes & History" complete={(plan.history ?? []).length} total={(plan.history ?? []).length} open={open.history} onToggle={() => toggle("history")}>
          <ol className="space-y-2">
            {(plan.history ?? []).map((h, i) => (
              <li key={i} className="flex items-start gap-3 text-[12.5px]">
                <span className="font-mono text-icm-text-faint shrink-0 w-20">{h.date}</span>
                <span className="text-icm-text-dim shrink-0 w-40">{h.user}</span>
                <span className="text-icm-text">{h.action}</span>
              </li>
            ))}
          </ol>
        </PlanSection>

        {/* Attestation */}
        <AttestationSection
          value={planAttestation}
          onChange={setPlanAttestation}
          readOnly={readOnly}
        />
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

function GoalCard({ goal, readOnly }: { goal: any; readOnly?: boolean }) {
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
          <button onClick={() => toast(`Remove G${goal.number}?`, { action: { label: "Remove", onClick: () => toast.success(`Goal G${goal.number} removed`) } })} className="text-icm-text-faint hover:text-icm-red p-1"><Trash2 className="w-3.5 h-3.5" /></button>
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
          <button onClick={() => toast("Add objective", { description: "Opening objective editor…" })} className="mt-2 text-[11.5px] text-icm-accent hover:underline inline-flex items-center gap-1">
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

function NSRColumn({
  title, tone, items, disabled,
}: {
  title: string;
  tone: "amber" | "green" | "red";
  items: { text: string; source: string; severity?: "warning" | "critical" }[];
  disabled?: boolean;
}) {
  const toneClass =
    tone === "green" ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
    : tone === "amber" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
    : "bg-icm-red-soft text-icm-red ring-icm-red/20";
  return (
    <div className="rounded-lg border border-icm-border bg-icm-panel p-3">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 uppercase tracking-wide ${toneClass}`}>
          {title}
        </span>
        <span className="text-[10px] font-mono text-icm-text-faint">{items.length}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-[12px] text-icm-text leading-snug">
            <div className="flex items-start gap-1.5">
              {it.severity === "critical" && <span className="w-1.5 h-1.5 rounded-full bg-icm-red mt-1.5 shrink-0" />}
              {it.severity === "warning" && <span className="w-1.5 h-1.5 rounded-full bg-icm-amber mt-1.5 shrink-0" />}
              <span>{it.text}</span>
            </div>
            <p className="text-[10px] text-icm-text-faint mt-0.5">↳ {it.source}</p>
          </li>
        ))}
      </ul>
      {!disabled && (
        <button onClick={() => toast(`Add ${title.toLowerCase().slice(0,-1)} item`, { description: "Opening editor…" })} className="mt-2 text-[11px] text-icm-accent hover:underline inline-flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add item
        </button>
      )}
    </div>
  );
}

function LifeCourseCard({
  icon: Icon, title, body, disabled,
}: {
  icon: typeof Compass;
  title: string;
  body: string;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-lg border border-icm-border bg-icm-panel p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-icm-accent" />
        <h4 className="font-tight font-semibold text-[13px] text-icm-text">{title}</h4>
      </div>
      <p className="text-[12px] text-icm-text-dim leading-relaxed">{body}</p>
      {!disabled && (
        <button onClick={() => toast(`Edit "${title}"`, { description: "Opening inline editor…" })} className="mt-2 text-[11px] text-icm-accent hover:underline">Edit</button>
      )}
    </div>
  );
}

