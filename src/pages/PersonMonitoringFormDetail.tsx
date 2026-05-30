import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Sparkles, X, Save, Printer, CheckCircle2, AlertTriangle,
  FileText, Heart, ListChecks, Users, ShieldCheck, AlertCircle, Phone,
  Activity, Smile, Plus, Loader2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual } from "@/hooks/useIndividuals";
import { useMonitoringForms, addMonitoringForm, updateMonitoringForm } from "@/hooks/useFirestore";
import { writeAudit } from "@/lib/auditService";
import { aiPrefilledDraft, type YesNoAnswer, type GoalProgress, type RecommendedAction } from "@/data/monitoringForms";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import BillingSectionFields from "@/components/billing/BillingSectionFields";
import { AttestationSection, EMPTY_ATTESTATION, type AttestationValue } from "@/components/icm/AttestationSection";
import { createBillingRecord, updateAuthorizationUnits } from "@/hooks/useBillingRecords";
import { getRateForCode } from "@/hooks/useAuthorizations";
import { calculateBillingUnits } from "@/services/billingValidation";

const FUNCTIONS_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";

type SectionKey = "s1" | "s2" | "s3" | "s4" | "s5" | "s6" | "s7" | "s8" | "s9" | "s10";

const SECTIONS: { key: SectionKey; num: number; title: string; icon: typeof FileText }[] = [
  { key: "s1", num: 1, title: "Follow Up Form Information", icon: FileText },
  { key: "s2", num: 2, title: "Current Circumstances", icon: Activity },
  { key: "s3", num: 3, title: "Satisfaction with Services", icon: Smile },
  { key: "s4", num: 4, title: "Progress Toward Outcomes", icon: ListChecks },
  { key: "s5", num: 5, title: "Choice and Rights", icon: ShieldCheck },
  { key: "s6", num: 6, title: "Health and Welfare", icon: Heart },
  { key: "s7", num: 7, title: "Back-up and Emergency Plan", icon: AlertCircle },
  { key: "s8", num: 8, title: "Incidents and Referrals", icon: AlertTriangle },
  { key: "s9", num: 9, title: "Recommended Actions", icon: ListChecks },
  { key: "s10", num: 10, title: "Attempted Contacts", icon: Phone },
];

const PersonMonitoringFormDetail = () => {
  const { id, formId } = useParams<{ id: string; formId: string }>();
  const navigate = useNavigate();
  const { individual, loading: individualLoading } = useIndividual(id);
  const { data: allForms, loading: formsLoading } = useMonitoringForms(id);

  const isNew = formId === "new";
  const initial = useMemo<any>(() => {
    if (!individual) return undefined;
    if (isNew && id) return aiPrefilledDraft(id);
    return allForms.find((f: any) => f.id === formId);
  }, [formId, id, isNew, allForms, individual]);

  const { userProfile } = useAuth();
  const isSupervisorOrAdmin =
    userProfile?.role === "supervisor" || userProfile?.role === "admin";
  const [form, setForm] = useState<any>(undefined);
  const [aiBanner, setAiBanner] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [confirmReviewed, setConfirmReviewed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [attestation, setAttestation] = useState<AttestationValue>(EMPTY_ATTESTATION);
  const [aiPrefilling, setAiPrefilling] = useState(false);
  const prefillCalledRef = useRef(false);

  // Billing state
  const [mfIsBillable, setMfIsBillable] = useState(false);
  const [mfServiceCode, setMfServiceCode] = useState("");
  const [mfUnits, setMfUnits] = useState(0);
  const [mfAuthId, setMfAuthId] = useState("");
  const [mfAuthNumber, setMfAuthNumber] = useState("");

  useEffect(() => {
    if (initial && !form) {
      setForm(initial);
    }
  }, [initial, form]);

  // AI prefill on new form load
  useEffect(() => {
    if (!isNew || !initial || !form || !id || prefillCalledRef.current) return;
    prefillCalledRef.current = true;

    const runPrefill = async () => {
      setAiPrefilling(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`${FUNCTIONS_BASE}/api/ai-forms/monitoring-form-prefill`, {
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
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success || !data.suggestions) return;
        const s = data.suggestions;

        // Apply AI suggestions to form sections — preserve existing ids, just fill answer/explain
        setForm((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            aiPreFilled: true,
            s2_circumstances: prev.s2_circumstances.map((q: YesNoAnswer, i: number) => {
              const aiQ = s.s2_circumstances?.[i];
              if (!aiQ) return q;
              return { ...q, answer: aiQ.answer, explain: aiQ.explain || "", aiSuggested: true, aiSource: "Recent contact notes & visits" };
            }),
            s3_satisfaction: prev.s3_satisfaction.map((q: YesNoAnswer, i: number) => {
              const aiQ = s.s3_satisfaction?.[i];
              if (!aiQ) return q;
              return { ...q, answer: aiQ.answer, explain: aiQ.explain || "", aiSuggested: true, aiSource: "Recent documentation" };
            }),
            s5_choice: prev.s5_choice.map((q: YesNoAnswer, i: number) => {
              const aiQ = s.s5_choice?.[i];
              if (!aiQ) return q;
              return { ...q, answer: aiQ.answer, explain: aiQ.explain || "", aiSuggested: true, aiSource: "Case history" };
            }),
            s6_health: prev.s6_health.map((q: YesNoAnswer) => q),
            s6_riskScore: s.s6_risk_score ?? prev.s6_riskScore,
            s7_backupSummary: s.s7_backup_summary
              ? { value: s.s7_backup_summary, aiSuggested: true, aiSource: "Last monitoring form" }
              : prev.s7_backupSummary,
            s8_incidents: prev.s8_incidents.map((q: YesNoAnswer, i: number) => {
              const aiQ = s.s8_incidents?.[i];
              if (!aiQ) return q;
              return { ...q, answer: aiQ.answer, explain: aiQ.explain || "", aiSuggested: true, aiSource: "Open incidents" };
            }),
            s9_recommendedActions: s.s9_recommended_actions?.length
              ? s.s9_recommended_actions.map((text: string, i: number) => ({
                  id: `ai-${i}`,
                  text,
                  createTask: false,
                  aiSuggested: true,
                }))
              : prev.s9_recommendedActions,
          };
        });
      } catch (err) {
        console.warn("[MonitoringFormDetail] AI prefill failed (non-fatal):", err);
      } finally {
        setAiPrefilling(false);
      }
    };

    runPrefill();
  }, [isNew, initial, form, id, userProfile]);

  const loading = individualLoading || formsLoading;

  // Completion status per section (computed before any early return to keep hook order stable)
  const completion = useMemo(() => {
    if (!form) return { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0, s6: 0, s7: 0, s8: 0, s9: 0, s10: 0 };
    const s2Arr = form.s2_circumstances || []; const s2 = s2Arr.length > 0 ? s2Arr.filter((q: any) => q.answer).length / s2Arr.length : 0;
    const s3Arr = form.s3_satisfaction || []; const s3 = s3Arr.length > 0 ? s3Arr.filter((q: any) => q.answer).length / s3Arr.length : 0;
    const s4Arr = form.s4_progress || []; const s4 = s4Arr.length > 0 ? s4Arr.filter((g: any) => g.notes).length / s4Arr.length : 0;
    const s5Arr = form.s5_choice || []; const s5 = s5Arr.length > 0 ? s5Arr.filter((q: any) => q.answer).length / s5Arr.length : 0;
    const s6Arr = form.s6_health || []; const s6 = s6Arr.length > 0 ? s6Arr.filter((q: any) => q.answer).length / s6Arr.length : 0;
    const s7Arr = form.s7_emergency || []; const s7 = s7Arr.length > 0 ? s7Arr.filter((q: any) => q.answer).length / s7Arr.length : 0;
    const s8Arr = form.s8_incidents || []; const s8 = s8Arr.length > 0 ? s8Arr.filter((q: any) => q.answer).length / s8Arr.length : 0;
    const s9 = (form.s9_recommendedActions || []).length > 0 ? 1 : 0;
    const s10 = (form.s10_contacts || []).length > 0 ? 1 : 0;
    return { s1: 1, s2, s3, s4, s5, s6, s7, s8, s9, s10 };
  }, [form]);

  if (loading) {
    return (
      <ICMShell title="Monitoring Form" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual || !form) {
    return (
      <ICMShell title="Monitoring Form" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Form not found.</p>
      </ICMShell>
    );
  }

  const readOnly = form.status === "Submitted" && !isNew;

  const updateAnswer = (sectionKey: "s2_circumstances" | "s3_satisfaction" | "s5_choice" | "s6_health" | "s7_emergency" | "s8_incidents", qid: string, patch: Partial<YesNoAnswer>) => {
    setForm(prev => prev ? { ...prev, [sectionKey]: prev[sectionKey].map(q => q.id === qid ? { ...q, ...patch, aiSuggested: patch.answer !== undefined ? false : q.aiSuggested } : q) } : prev);
  };

  const updateGoal = (goalId: string, patch: Partial<GoalProgress>) => {
    setForm(prev => prev ? { ...prev, s4_progress: prev.s4_progress.map(g => g.goalId === goalId ? { ...g, ...patch } : g) } : prev);
  };

  const toggleAction = (actionId: string) => {
    setForm(prev => prev ? { ...prev, s9_recommendedActions: prev.s9_recommendedActions.map(a => a.id === actionId ? { ...a, createTask: !a.createTask } : a) } : prev);
  };

  const dotClass = (pct: number) => pct === 0 ? "bg-icm-text-faint/40" : pct >= 1 ? "bg-icm-green" : "bg-icm-amber";

  const sectionsComplete = Object.values(completion).filter(p => p >= 1).length;
  const sectionsSkipped = Object.values(completion).filter(p => p === 0).length;

  const handleSave = async (status = "Draft") => {
    if (!form || !individual) return;
    try {
      const isSubmitting = status === "Submitted";
      const approvalStatus = isSubmitting
        ? (isSupervisorOrAdmin ? "approved" : "pending_review")
        : undefined;

      const formData: any = {
        individual_id: id,
        type: form.type || "Quarterly",
        status: status,
        active: form.active || "Active",
        dueDate: form.dueDate || new Date().toISOString().split("T")[0],
        submitted_date: isSubmitting ? new Date().toISOString().split("T")[0] : "",
        updated_by: userProfile?.displayName ?? "",
        updated_on: new Date().toLocaleDateString(),
        organizationId: userProfile?.organizationId ?? "",
        s2_circumstances: form.s2_circumstances || [],
        s3_satisfaction: form.s3_satisfaction || [],
        s4_progress: form.s4_progress || [],
        s5_choice: form.s5_choice || [],
        s6_health: form.s6_health || [],
        s6_riskScore: form.s6_riskScore || 0,
        s6_riskSource: form.s6_riskSource || "Manual entry",
        s7_emergency: form.s7_emergency || [],
        s7_backupSummary: form.s7_backupSummary || {},
        s8_incidents: form.s8_incidents || [],
        s9_recommendedActions: form.s9_recommendedActions || [],
        s10_contacts: form.s10_contacts || [],
        attestation: attestation.attested ? attestation : null,
        ...(approvalStatus !== undefined ? {
          approvalStatus,
          isBillingReady: isSupervisorOrAdmin ? true : false,
          submittedForReviewAt: (!isSupervisorOrAdmin && isSubmitting) ? serverTimestamp() : null,
          submittedForReviewBy: (!isSupervisorOrAdmin && isSubmitting) ? (userProfile?.uid ?? null) : null,
          submittedByName: (!isSupervisorOrAdmin && isSubmitting)
            ? (userProfile?.displayName || `${userProfile?.firstName ?? ""} ${userProfile?.lastName ?? ""}`.trim() || "Unknown")
            : null,
          returnReasons: [],
          individualName: `${individual.first_name} ${individual.last_name}`,
        } : {}),
      };

      if (isNew) {
        const docRef = await addMonitoringForm(formData);
        await writeAudit("monitoring_form_created", "monitoring_form", docRef.id, {
          individualId: id,
          status,
        });
        toast.success("Monitoring form draft created!");
        navigate(`/people/${id}/monitoring-form/${docRef.id}`);
      } else {
        await updateMonitoringForm(formId, formData);
        await writeAudit(status === "Submitted" ? "monitoring_form_submitted" : "monitoring_form_saved", "monitoring_form", formId, {
          individualId: id,
          status,
        });
        toast.success(status === "Submitted" ? "Monitoring form submitted successfully!" : "Monitoring form draft saved!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save monitoring form");
    }
  };

  const handleFormSubmit = async () => {
    if (!form || !individual) return;
    try {
      await handleSave("Submitted");

      // Auto-create billing record if billable
      if (mfIsBillable && mfServiceCode && userProfile?.organizationId) {
        const { rate, unitType } = getRateForCode(mfServiceCode);
        const today = form.dueDate || new Date().toISOString().slice(0, 10);
        const finalUnits = mfUnits > 0 ? mfUnits : 1;
        try {
          await createBillingRecord({
            org_id: userProfile.organizationId,
            individual_id: id || "",
            individual_name: `${individual.first_name} ${individual.last_name}`,
            case_manager_id: userProfile.uid ?? "",
            case_manager_name: userProfile.displayName ?? "",
            source_note_id: formId === "new" ? "" : formId,
            source_note_type: "monitoring_form",
            source_note_url: `/people/${id}/monitoring-form/${formId}`,
            service_code: mfServiceCode,
            service_description: `Monitoring Form — ${form.type}`,
            billing_unit_type: unitType as any,
            units: finalUnits,
            rate_per_unit: rate,
            total_amount: finalUnits * rate,
            date_of_service: today,
            start_time: "",
            end_time: "",
            duration_minutes: 0,
            authorization_id: mfAuthId,
            authorization_number: mfAuthNumber,
            funding_stream_id: "",
            payer_name: "",
            payer_id: "",
            validation_status: "passed",
            billing_status: "scrub_passed",
            submitted_to_iddbilling: false,
            remittance_received: false,
            signed_by: userProfile.uid ?? "",
          });
          if (mfAuthId) await updateAuthorizationUnits(mfAuthId, finalUnits, "add");
        } catch (billingErr) {
          console.error("[billing] monitoring form billing record error:", billingErr);
        }
      }

      setSubmitted(true);
      setSubmitOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit monitoring form");
    }
  };

  const statusToneClass =
    form.status === "Submitted" ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
    : form.status === "In Progress" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
    : "bg-icm-accent-soft text-icm-accent ring-icm-accent/20";

  return (
    <ICMShell title="Monitoring Form" showAIPanel={false}>
      <div className="space-y-5">
        {/* Back */}
        <button onClick={() => navigate(`/people/${individual.id}/monitoring-form`)} className="inline-flex items-center gap-1.5 text-[14px] font-geist font-bold text-icm-text hover:text-icm-accent">
          <ChevronLeft className="w-4 h-4" /> Monitoring Forms
        </button>

        {/* Form header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3 flex-wrap">
          <div className="font-mono text-[12px] font-bold text-icm-text px-2.5 py-1 rounded-md bg-icm-bg border border-icm-border">
            {form.type} Review
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-geist font-semibold ring-1 ${statusToneClass}`}>
            {form.status || "Draft"}
          </span>
          <div className="text-[11.5px] text-icm-text-dim font-geist">
            Last saved <span className="font-mono text-icm-text">{form.updatedOn}</span>
            <span className="ml-2 inline-flex items-center gap-1 text-icm-green">
              <span className="w-1.5 h-1.5 rounded-full bg-icm-green" /> Autosaved
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!readOnly && (
              <>
                <button onClick={() => handleSave("In Progress")} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Save draft
                </button>
                <button onClick={() => setSubmitOpen(true)} className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSupervisorOrAdmin ? "Submit" : "Submit for Review"}
                </button>
              </>
            )}
            <button onClick={() => window.print()} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>

        {/* AI prefilling loading state */}
        {aiPrefilling && !readOnly && (
          <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            </div>
            <p className="text-[12.5px] font-geist text-icm-text leading-snug">
              <span className="font-semibold">AI is analyzing</span> {individual.first_name}'s recent documentation to pre-fill this form…
            </p>
          </div>
        )}

        {/* AI banner */}
        {aiBanner && form.aiPreFilled && !readOnly && !aiPrefilling && (
          <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft px-4 py-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-[12.5px] font-geist text-icm-text leading-snug">
                I pre-filled <span className="font-semibold">sections 2, 3, 5, 7, 8 & 9</span> based on {individual.first_name}'s recent contact notes, visit summaries, and risk flags. All AI content is labeled. Review and edit before submitting.
              </p>
            </div>
            <button onClick={() => setAiBanner(false)} className="text-icm-text-dim hover:text-icm-text shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}


        {readOnly && (
          <div className="rounded-xl border border-icm-border bg-icm-bg px-4 py-3 text-[12.5px] text-icm-text-dim">
            This form is <span className="font-semibold text-icm-text">submitted</span> and read-only.
          </div>
        )}

        {/* Approval status banners */}
        {form.approvalStatus === "pending_review" && (
          <div className="rounded-xl border border-icm-amber/30 bg-icm-amber-soft px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-icm-amber shrink-0" />
            <div>
              <p className="text-[12.5px] font-geist font-semibold text-icm-text">Pending supervisor review</p>
              <p className="text-[11.5px] font-geist text-icm-text-dim">
                This form is awaiting supervisor review. You cannot edit it until it is reviewed.
              </p>
            </div>
          </div>
        )}
        {form.approvalStatus === "returned_for_correction" && (() => {
          const reasons: any[] = form.returnReasons ?? [];
          const last = reasons[reasons.length - 1];
          return (
            <div className="rounded-xl border border-icm-red/30 bg-icm-red-soft px-4 py-3 space-y-2">
              <p className="text-[12.5px] font-geist font-semibold text-icm-red">
                Returned for correction{last?.returnedByName ? ` by ${last.returnedByName}` : ""}
              </p>
              {last?.reason && <p className="text-[11.5px] font-geist text-icm-text"><span className="font-semibold">Reason:</span> {last.reason}</p>}
              {last?.comment && <p className="text-[11.5px] font-geist text-icm-text-dim italic">"{last.comment}"</p>}
            </div>
          );
        })()}
        {form.approvalStatus === "approved" && (
          <div className="rounded-xl border border-icm-green/20 bg-icm-green-soft px-4 py-2.5 text-[12px] text-icm-green flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-semibold">Approved{form.reviewedByName ? ` by ${form.reviewedByName}` : ""}.</span>
            <span className="text-icm-green/80">This form is billing-ready.</span>
          </div>
        )}
        {form.approvalStatus === "approved_with_exception" && (
          <div className="rounded-xl border border-icm-amber/30 bg-icm-amber-soft px-4 py-2.5 text-[12px] text-icm-amber flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">Approved with exception{form.reviewedByName ? ` by ${form.reviewedByName}` : ""}.</span>
              {form.exceptionReason && <p className="mt-0.5 text-[11.5px] text-icm-text-dim">Exception: {form.exceptionReason}</p>}
            </div>
          </div>
        )}

        {submitted && (
          <div className="rounded-xl border border-icm-green/20 bg-icm-green-soft px-4 py-3 text-[12.5px] text-icm-text">
            <span className="font-semibold text-icm-green">Monitoring form submitted.</span> I've updated {individual.first_name}'s compliance status. Next quarterly review due: <span className="font-mono">07/26/2026</span>.
          </div>
        )}

        {/* Layout: sidebar + sections */}
        <div className="flex gap-5">
          {/* Sticky sidebar nav */}
          <nav className="w-56 shrink-0 hidden lg:block">
            <div className="sticky top-4 rounded-xl border border-icm-border bg-icm-panel p-3 space-y-0.5">
              {SECTIONS.map((s) => (
                <a key={s.key} href={`#${s.key}`} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-icm-text-dim hover:bg-icm-bg hover:text-icm-text">
                  <span className={`w-2 h-2 rounded-full ${dotClass(completion[s.key])}`} />
                  <span className="font-mono text-[10.5px] text-icm-text-faint">{s.num}</span>
                  <span className="truncate">{s.title}</span>
                </a>
              ))}
            </div>
          </nav>

          {/* Sections */}
          <div className="flex-1 min-w-0 space-y-4">
          {/* Billing panel */}
          {!readOnly && (
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-manrope font-bold text-[14px] text-icm-text">Billing</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-geist text-icm-text-dim">Billable?</span>
                  <button
                    onClick={() => setMfIsBillable(true)}
                    className={`px-3 h-7 rounded-lg text-[11.5px] font-medium border ${mfIsBillable ? "bg-icm-green-soft border-icm-green text-icm-green" : "border-icm-border text-icm-text-dim"}`}
                  >Yes</button>
                  <button
                    onClick={() => setMfIsBillable(false)}
                    className={`px-3 h-7 rounded-lg text-[11.5px] font-medium border ${!mfIsBillable ? "bg-icm-bg border-icm-border-strong text-icm-text" : "border-icm-border text-icm-text-dim"}`}
                  >No</button>
                </div>
              </div>
              {mfIsBillable && (
                <BillingSectionFields
                  individualId={id || ""}
                  serviceCode={mfServiceCode}
                  onServiceCodeChange={setMfServiceCode}
                  units={mfUnits}
                  onUnitsChange={setMfUnits}
                  authorizationId={mfAuthId}
                  authorizationNumber={mfAuthNumber}
                  onAuthorizationChange={(aid, anum) => { setMfAuthId(aid); setMfAuthNumber(anum); }}
                  startTime=""
                  endTime=""
                />
              )}
            </div>
          )}

          {/* SECTION 1 */}
          <Section id="s1" num={1} title="Follow Up Form Information" complete={5} total={5}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Type of Review">
                  <select disabled={readOnly} defaultValue={form.type} className={selectClass}>
                    <option>Monthly</option><option>Quarterly</option><option>Annually</option>
                  </select>
                </Field>
                <Field label="Form Status">
                  <select disabled={readOnly} defaultValue={form.status || "Draft"} className={selectClass}>
                    <option>Draft</option><option>In Progress</option><option>Submitted</option>
                  </select>
                </Field>
                <Field label="Complete Date">
                  <input type="date" disabled={readOnly} defaultValue={form.completeDate ? "" : ""} className={inputClass} />
                </Field>
                <Field label="Due Date">
                  <input type="date" disabled={readOnly} className={inputClass} />
                </Field>
                <Field label="Active/Inactive">
                  <select disabled={readOnly} defaultValue={form.active === "—" ? "Active" : form.active} className={selectClass}>
                    <option>Active</option><option>Inactive</option>
                  </select>
                </Field>
              </div>
            </Section>

            {/* SECTION 2 */}
            <Section id="s2" num={2} title="Current Circumstances" complete={form.s2_circumstances.filter(q => q.answer).length} total={form.s2_circumstances.length} aiBadge={form.s2_circumstances.some(q => q.aiSuggested)}>
              <div className="space-y-3">
                {form.s2_circumstances.map((q) => (
                  <YesNoQ key={q.id} q={q} readOnly={readOnly} onChange={(patch) => updateAnswer("s2_circumstances", q.id, patch)} />
                ))}
              </div>
            </Section>

            {/* SECTION 3 */}
            <Section id="s3" num={3} title="Satisfaction with Services" complete={form.s3_satisfaction.filter(q => q.answer).length} total={form.s3_satisfaction.length} aiBadge={form.s3_satisfaction.some(q => q.aiSuggested)}>
              <div className="space-y-3">
                {form.s3_satisfaction.map((q) => (
                  <YesNoQ key={q.id} q={q} readOnly={readOnly} onChange={(patch) => updateAnswer("s3_satisfaction", q.id, patch)} />
                ))}
              </div>
            </Section>

            {/* SECTION 4 */}
            <Section id="s4" num={4} title="Progress Toward Outcomes" complete={form.s4_progress.filter(g => g.notes).length} total={Math.max(form.s4_progress.length, 1)} aiBadge={form.s4_progress.some(g => g.aiSuggested)}>
              {form.s4_progress.length === 0 ? (
                <div className="rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-3 text-[12.5px] text-icm-text">
                  No active care plan found. Add goals in the Care Plan module to track progress here.
                </div>
              ) : (
                <div className="space-y-3">
                  {form.s4_progress.map((g) => (
                    <div key={g.goalId} className="rounded-lg border border-icm-border bg-white p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-[13px] text-icm-text">{g.goalName}</span>
                        {g.aiSuggested && <AIChip source={g.aiSource} />}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Field label="Progress status">
                          <select disabled={readOnly} value={g.status} onChange={(e) => updateGoal(g.goalId, { status: e.target.value as any })} className={selectClass}>
                            <option>On Track</option><option>Progressing</option><option>Needs Attention</option><option>Discontinued</option>
                          </select>
                        </Field>
                        <div className="md:col-span-2">
                          <Field label="Progress notes">
                            <textarea disabled={readOnly} value={g.notes} onChange={(e) => updateGoal(g.goalId, { notes: e.target.value })} rows={2} className={textareaClass} />
                          </Field>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* SECTION 5 */}
            <Section id="s5" num={5} title="Choice and Rights" complete={form.s5_choice.filter(q => q.answer).length} total={form.s5_choice.length}>
              <div className="space-y-3">
                {form.s5_choice.map((q) => (
                  <YesNoQ key={q.id} q={q} readOnly={readOnly} onChange={(patch) => updateAnswer("s5_choice", q.id, patch)} />
                ))}
              </div>
            </Section>

            {/* SECTION 6 */}
            <Section id="s6" num={6} title="Health and Welfare" complete={form.s6_health.filter(q => q.answer).length} total={form.s6_health.length}>
              <div className="space-y-3">
                {form.s6_health.map((q) => (
                  <YesNoQ key={q.id} q={q} readOnly={readOnly} onChange={(patch) => updateAnswer("s6_health", q.id, patch)} />
                ))}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-icm-border">
                  <Field label="Risk screening score">
                    <input type="number" disabled={readOnly} defaultValue={form.s6_riskScore ?? ""} className={inputClass} />
                  </Field>
                  <Field label="Source">
                    <select disabled={readOnly} defaultValue={form.s6_riskSource} className={selectClass}>
                      <option>Manual entry</option><option>From HRST</option><option>From Intellectability</option>
                    </select>
                  </Field>
                </div>
                {(form.s6_riskScore ?? 0) >= 3 && (
                  <div className="rounded-lg border border-icm-amber/20 bg-icm-amber-soft p-3 flex items-start justify-between gap-3">
                    <p className="text-[12px] text-icm-text leading-snug">
                      <AlertTriangle className="inline w-3.5 h-3.5 text-icm-amber mr-1" />
                      Score of {form.s6_riskScore} triggers required nursing review. AI created a task for follow-up.
                    </p>
                    <button className="text-[11.5px] font-semibold text-icm-amber hover:underline shrink-0">View task →</button>
                  </div>
                )}
              </div>
            </Section>

            {/* SECTION 7 */}
            <Section id="s7" num={7} title="Back-up and Emergency Plan" complete={form.s7_emergency.filter(q => q.answer).length} total={form.s7_emergency.length}>
              <div className="space-y-3">
                {form.s7_emergency.map((q) => (
                  <YesNoQ key={q.id} q={q} readOnly={readOnly} onChange={(patch) => updateAnswer("s7_emergency", q.id, patch)} />
                ))}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint">Back-up plan summary</span>
                    {form.s7_backupSummary.aiSuggested && <AIChip source={form.s7_backupSummary.aiSource} />}
                  </div>
                  <textarea disabled={readOnly} defaultValue={form.s7_backupSummary.value} rows={3} className={textareaClass} />
                </div>
              </div>
            </Section>

            {/* SECTION 8 */}
            <Section id="s8" num={8} title="Incidents and Referrals" complete={form.s8_incidents.filter(q => q.answer).length} total={form.s8_incidents.length}>
              <div className="space-y-3">
                {form.s8_incidents.map((q) => (
                  <YesNoQ key={q.id} q={q} readOnly={readOnly} onChange={(patch) => updateAnswer("s8_incidents", q.id, patch)} />
                ))}
                {form.s8_incidents.find(q => q.id === "i1")?.answer === "Yes" && (
                  <button onClick={() => navigate(`/people/${individual.id}/module/incident-reporting`)} className="text-[12px] text-icm-accent hover:underline">
                    View incident reports for {individual.first_name} →
                  </button>
                )}
              </div>
            </Section>

            {/* SECTION 9 */}
            <Section id="s9" num={9} title="Recommended Actions" complete={form.s9_recommendedActions.length} total={Math.max(form.s9_recommendedActions.length, 1)} aiBadge={form.s9_recommendedActions.some(a => a.aiSuggested)}>
              <div className="space-y-2">
                {form.s9_recommendedActions.map((a, idx) => (
                  <div key={a.id} className="rounded-lg border border-icm-border bg-white p-3 flex items-start gap-3">
                    <span className="font-mono text-[11px] font-bold text-icm-text-faint mt-0.5">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] text-icm-text leading-snug">{a.text}</p>
                      <label className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-icm-text-dim cursor-pointer">
                        <input type="checkbox" disabled={readOnly} checked={a.createTask} onChange={() => toggleAction(a.id)} className="w-3.5 h-3.5 rounded border-icm-border" />
                        Create task in Case Management
                      </label>
                    </div>
                    {a.aiSuggested && <AIChip />}
                  </div>
                ))}
              </div>
            </Section>

            {/* SECTION 10 */}
            <Section id="s10" num={10} title="Attempted Contacts" complete={form.s10_contacts.length} total={Math.max(form.s10_contacts.length, 1)}>
              {form.s10_contacts.length === 0 ? (
                <p className="text-[12.5px] text-icm-text-faint">No contact attempts logged yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-icm-border">
                  <table className="w-full text-[12px]">
                    <thead className="bg-icm-bg/60">
                      <tr>
                        {["Date", "Type", "Person", "Outcome", "Notes"].map((c, i) => (
                          <th key={i} className="text-left px-3 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-icm-border">
                      {form.s10_contacts.map((c, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-mono text-icm-text-dim">{c.date}</td>
                          <td className="px-3 py-2 text-icm-text">{c.type}</td>
                          <td className="px-3 py-2 text-icm-text">{c.person}</td>
                          <td className="px-3 py-2 text-icm-text-dim">{c.outcome}</td>
                          <td className="px-3 py-2 text-icm-text-dim">{c.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!readOnly && (
                <button className="mt-3 h-9 px-3 rounded-xl border border-icm-border text-[12px] font-medium text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add contact attempt
                </button>
              )}
            </Section>
          </div>
        </div>
      </div>

      {/* Attestation */}
      <div className="px-4 sm:px-6 pb-2">
        <AttestationSection
          value={attestation}
          onChange={setAttestation}
          readOnly={readOnly}
        />
      </div>

      {/* Submit modal */}
      {submitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSubmitOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-manrope font-bold text-[15px] text-icm-text">Ready to submit this {form.type.toLowerCase()} review?</h3>
              <button onClick={() => setSubmitOpen(false)} className="p-1 rounded hover:bg-icm-bg text-icm-text-dim"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-[12.5px] text-icm-text-dim mb-4">
              <p><span className="font-semibold text-icm-text">{sectionsComplete}</span> sections complete · <span className="font-semibold text-icm-text">{sectionsSkipped}</span> sections skipped</p>
              {form.aiPreFilled && (
                <div className="rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-3">
                  <p className="text-icm-text leading-snug">This form contains AI-suggested content. Confirm you have reviewed all labeled fields.</p>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={confirmReviewed} onChange={(e) => setConfirmReviewed(e.target.checked)} className="w-3.5 h-3.5 rounded border-icm-border" />
                <span className="text-icm-text">I confirm I have reviewed all content.</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setSubmitOpen(false)} className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg">
                Go back and review
              </button>
              <button onClick={handleFormSubmit} disabled={!confirmReviewed} className="h-9 px-4 rounded-lg bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
                {isSupervisorOrAdmin ? "Submit" : "Submit for Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ICMShell>
  );
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const inputClass = "w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text disabled:bg-icm-bg disabled:text-icm-text-dim";
const selectClass = inputClass;
const textareaClass = "w-full px-3 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text leading-relaxed disabled:bg-icm-bg disabled:text-icm-text-dim";

function Section({ id, num, title, complete, total, aiBadge, children }: { id: string; num: number; title: string; complete: number; total: number; aiBadge?: boolean; children: React.ReactNode }) {
  return (
    <div id={id} className="rounded-xl border border-icm-border bg-icm-panel p-4 scroll-mt-4">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-icm-border">
        <span className="font-mono text-[11px] font-bold text-icm-text-faint">S{num}</span>
        <h3 className="font-tight font-semibold text-[15px] text-icm-text">{title}</h3>
        {aiBadge && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold ai-gradient text-white">
            <Sparkles className="w-2.5 h-2.5" /> AI
          </span>
        )}
        <span className="ml-auto text-[11px] font-mono text-icm-text-faint">{complete} / {total}</span>
      </div>
      {children}
    </div>
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

function YesNoQ({ q, readOnly, onChange }: { q: YesNoAnswer; readOnly?: boolean; onChange: (patch: Partial<YesNoAnswer>) => void }) {
  const tinted = q.aiSuggested ? "bg-icm-accent-soft/40 ring-icm-accent/20" : "bg-white ring-icm-border";
  return (
    <div className={`rounded-lg ring-1 p-3 ${tinted}`}>
      <div className="flex items-start gap-3">
        <p className="flex-1 text-[12.5px] text-icm-text leading-snug">{q.question}</p>
        {q.aiSuggested && <AIChip source={q.aiSource} />}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {(["Yes", "No"] as const).map((opt) => {
          const selected = q.answer === opt;
          return (
            <button
              key={opt}
              disabled={readOnly}
              onClick={() => onChange({ answer: opt, explain: opt === "No" ? undefined : q.explain })}
              className={`h-8 px-4 rounded-lg text-[12px] font-medium ring-1 transition-colors ${
                selected
                  ? "bg-icm-text text-icm-panel ring-icm-text"
                  : "bg-white text-icm-text-dim ring-icm-border hover:bg-icm-bg"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {q.answer === "Yes" && (
        <div className="mt-2">
          <span className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1 block">Please explain</span>
          <textarea
            disabled={readOnly}
            value={q.explain ?? ""}
            onChange={(e) => onChange({ explain: e.target.value })}
            rows={2}
            className={textareaClass}
          />
        </div>
      )}
    </div>
  );
}

function AIChip({ source }: { source?: string }) {
  return (
    <span title={source ? `From: ${source}` : undefined} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20 cursor-help shrink-0">
      <Sparkles className="w-2.5 h-2.5" /> AI suggested
    </span>
  );
}

export default PersonMonitoringFormDetail;
