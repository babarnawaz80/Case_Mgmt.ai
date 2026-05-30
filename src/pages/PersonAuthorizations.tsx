import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { useIndividual } from "@/hooks/useIndividuals";
import {
  useServiceAuthorizations,
  updateServiceAuthorization,
  type ServiceAuthorization,
} from "@/hooks/useFirestore";
import { useAuth } from "@/contexts/AuthContext";
import { useProgressNotes } from "@/hooks/useProgressNotes";
import { useCarePlans } from "@/hooks/useFirestore";
import { toast } from "sonner";
import { getFunctions, httpsCallable } from "firebase/functions";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Printer,
  Pencil,
  RotateCcw,
  Ban,
  Sparkles,
  X,
  TrendingUp,
  TrendingDown,
  Copy,
  Save,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Utility helpers ──────────────────────────────────────────────────────────

function parseDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysUntilExpiry(endDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((parseDate(endDate).getTime() - today.getTime()) / 86400000);
}

function daysSince(startDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(
    1,
    Math.ceil((today.getTime() - parseDate(startDate).getTime()) / 86400000)
  );
}

function authDisplayStatus(auth: ServiceAuthorization): "active" | "expiring_soon" | "critical" | "expired" | "pending" | "voided" {
  if (auth.status === "voided") return "voided";
  if (auth.status === "pending") return "pending";
  const days = daysUntilExpiry(auth.end_date);
  if (days < 0) return "expired";
  if (days <= 7) return "critical";
  if (days <= 30) return "expiring_soon";
  return "active";
}

function unitsPct(auth: ServiceAuthorization): number {
  if (!auth.units_authorized) return 0;
  return (auth.units_used / auth.units_authorized) * 100;
}

function unitsTone(pct: number): "green" | "orange" | "red" | "dark_red" {
  if (pct > 100) return "dark_red";
  if (pct >= 85) return "red";
  if (pct >= 70) return "orange";
  return "green";
}

// ─── Pace warning logic ───────────────────────────────────────────────────────

interface PaceResult {
  ok: boolean;
  overPace: boolean;
  projectedRemaining: number;
  projectedRunOutDays: number | null; // null = won't run out
  daysInPeriod: number;
  dailyRate: number;
}

function computePace(auth: ServiceAuthorization): PaceResult | null {
  const elapsed = daysSince(auth.start_date);
  if (elapsed < 7 || auth.units_used === 0 || !auth.units_authorized) return null;
  const daysLeft = Math.max(0, daysUntilExpiry(auth.end_date));
  const totalDays = elapsed + daysLeft;
  const dailyRate = auth.units_used / elapsed;
  const projectedTotal = dailyRate * totalDays;
  const projectedRemaining = auth.units_authorized - projectedTotal;
  const overPace = projectedRemaining < 0;
  const projectedRunOutDays = overPace
    ? Math.ceil((auth.units_authorized - auth.units_used) / dailyRate)
    : null;
  return { ok: !overPace, overPace, projectedRemaining, projectedRunOutDays, daysInPeriod: totalDays, dailyRate };
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ReturnType<typeof authDisplayStatus> }) {
  const map: Record<string, string> = {
    active: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    expiring_soon: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    critical: "bg-icm-red-soft text-icm-red ring-icm-red/20",
    expired: "bg-icm-border/60 text-icm-text-dim ring-icm-border/30",
    pending: "bg-yellow-50 text-yellow-700 ring-yellow-200",
    voided: "bg-icm-border/40 text-icm-text-faint ring-icm-border/20",
  };
  const labels: Record<string, string> = {
    active: "Active",
    expiring_soon: "Expiring Soon",
    critical: "Critical",
    expired: "Expired",
    pending: "Pending",
    voided: "Voided",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-geist font-semibold ring-1", map[status])}>
      {labels[status]}
    </span>
  );
}

// ─── Unit progress bar ────────────────────────────────────────────────────────

function UnitBar({ auth }: { auth: ServiceAuthorization }) {
  const pct = unitsPct(auth);
  const tone = unitsTone(pct);
  const barColors = {
    green: "bg-icm-green",
    orange: "bg-icm-amber",
    red: "bg-icm-red",
    dark_red: "bg-red-800",
  };
  const textColors = {
    green: "text-icm-green",
    orange: "text-icm-amber",
    red: "text-icm-red",
    dark_red: "text-red-800 font-bold",
  };
  return (
    <div className="min-w-[120px]">
      <div className="flex items-center justify-between text-[10px] font-geist mb-0.5">
        <span className="text-icm-text-dim">{auth.units_used}/{auth.units_authorized} units</span>
        {pct > 100 && (
          <span className="px-1 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[9px]">OVER CAP</span>
        )}
      </div>
      <div className="h-2 rounded-full bg-icm-border overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColors[tone])}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className={cn("text-[10.5px] mt-0.5 font-geist", textColors[tone])}>
        {pct.toFixed(0)}% used
      </p>
    </div>
  );
}

// ─── Renewal letter modal ─────────────────────────────────────────────────────

function RenewalLetterModal({
  auth,
  individualName,
  onClose,
}: {
  auth: ServiceAuthorization;
  individualName: string;
  onClose: () => void;
}) {
  const [letter, setLetter] = useState("");
  const [letterId, setLetterId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [letterError, setLetterError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pre-filled renewal fields
  const newStartDate = auth.end_date
    ? new Date(new Date(auth.end_date).getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    : "";
  const newEndDate = auth.end_date
    ? new Date(new Date(auth.end_date).getTime() + 366 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    : "";

  const [renewalFields, setRenewalFields] = useState({
    serviceName: auth.service_name,
    payer: auth.payer,
    procedureCode: auth.procedure_code,
    billingPeriod: auth.billing_period || "Monthly",
    unitsRequested: auth.units_authorized,
    newStartDate,
    newEndDate,
    notes: "",
  });

  const handleGenerate = async () => {
    setGenerating(true);
    setLetterError(null);
    setLetter("");
    try {
      const fns = getFunctions();
      const fn = httpsCallable(fns, "generateRenewalLetter");
      const result = await fn({ individualId: auth.individualId, authorizationId: auth.id }) as any;
      const data = result.data;
      if (data.success && data.letterText) {
        setLetter(data.letterText);
        setLetterId(data.letterId);
      } else {
        setLetterError(data.message || "Generation returned empty result. Please try again.");
      }
    } catch (err: any) {
      setLetterError(err.message || "Failed to generate letter. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await addDoc(collection(db, "renewal_letters"), {
        authorizationId: auth.id,
        individualId: auth.individualId,
        individualName,
        serviceName: renewalFields.serviceName,
        authNumber: auth.auth_number,
        renewalFields,
        letterText: letter || null,
        status: "draft",
        createdAt: serverTimestamp(),
      });
      toast.success("Renewal draft saved.");
      onClose();
    } catch {
      toast.error("Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Renewal Letter</title><style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;font-size:14px;line-height:1.6}pre{white-space:pre-wrap;font-family:inherit}</style></head><body><pre>${letter}</pre></body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-icm-border bg-icm-panel shadow-elevated overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-icm-border shrink-0">
          <div>
            <h2 className="font-manrope font-bold text-[15px] text-icm-text">Draft Renewal Request</h2>
            <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
              {auth.service_name} · Auth #{auth.auth_number}
            </p>
          </div>
          <button onClick={onClose} className="text-icm-text-faint hover:text-icm-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Section 1 — Pre-filled renewal details */}
          <div className="rounded-xl border border-icm-border bg-icm-bg p-4 space-y-3">
            <p className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim">Renewal Details</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Service Name", key: "serviceName" as const },
                { label: "Payer", key: "payer" as const },
                { label: "Procedure Code", key: "procedureCode" as const },
                { label: "Billing Period", key: "billingPeriod" as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-[10px] font-geist font-semibold uppercase tracking-wider text-icm-text-faint block mb-1">{label}</label>
                  <input
                    value={renewalFields[key] as string}
                    onChange={e => setRenewalFields(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full h-8 px-2.5 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist text-icm-text"
                  />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-geist font-semibold uppercase tracking-wider text-icm-text-faint block mb-1">Units Requested</label>
                <input
                  type="number"
                  value={renewalFields.unitsRequested}
                  onChange={e => setRenewalFields(f => ({ ...f, unitsRequested: parseInt(e.target.value) || 0 }))}
                  className="w-full h-8 px-2.5 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist text-icm-text"
                />
              </div>
              <div>
                <label className="text-[10px] font-geist font-semibold uppercase tracking-wider text-icm-text-faint block mb-1">New Start Date</label>
                <input type="date" value={renewalFields.newStartDate} onChange={e => setRenewalFields(f => ({ ...f, newStartDate: e.target.value }))}
                  className="w-full h-8 px-2.5 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist text-icm-text" />
              </div>
              <div>
                <label className="text-[10px] font-geist font-semibold uppercase tracking-wider text-icm-text-faint block mb-1">New End Date</label>
                <input type="date" value={renewalFields.newEndDate} onChange={e => setRenewalFields(f => ({ ...f, newEndDate: e.target.value }))}
                  className="w-full h-8 px-2.5 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist text-icm-text" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-geist font-semibold uppercase tracking-wider text-icm-text-faint block mb-1">Notes</label>
              <textarea value={renewalFields.notes} onChange={e => setRenewalFields(f => ({ ...f, notes: e.target.value }))} rows={2}
                placeholder="Any additional notes for this renewal..."
                className="w-full px-2.5 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist text-icm-text resize-none" />
            </div>
          </div>

          {/* Section 2 — AI Letter Generator */}
          <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-icm-accent" />
              <span className="text-[12.5px] font-geist font-semibold text-icm-text">AI Renewal Letter Generator</span>
            </div>

            {/* Not yet generated */}
            {!generating && !letter && !letterError && (
              <>
                <p className="text-[12px] font-geist text-icm-text-dim">
                  Gemini will review {individualName}'s progress notes, monitoring forms, care plan goals, and authorization history to draft a clinical Medicaid renewal letter.
                </p>
                <button onClick={handleGenerate}
                  className="h-9 px-4 rounded-xl text-[12px] font-geist font-semibold flex items-center gap-1.5 bg-icm-accent text-white hover:opacity-90 transition">
                  <Sparkles className="w-3.5 h-3.5" /> Generate Letter
                </button>
              </>
            )}

            {/* Loading */}
            {generating && (
              <div className="flex flex-col items-center py-6 text-center space-y-2">
                <Loader2 className="w-8 h-8 text-icm-accent animate-spin" />
                <p className="text-[13px] font-geist font-semibold text-icm-text">Gemini is reviewing {individualName}'s records…</p>
                <p className="text-[11.5px] font-geist text-icm-text-dim">Reading progress notes, care plan goals, and authorization history.</p>
                <p className="text-[11px] font-geist text-icm-text-faint">This takes about 15–30 seconds.</p>
              </div>
            )}

            {/* Error */}
            {letterError && !generating && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg bg-icm-red-soft border border-icm-red/20 px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-icm-red shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[12px] font-geist font-semibold text-icm-red">Failed to generate letter</p>
                    <p className="text-[11px] font-geist text-icm-text-dim mt-0.5">{letterError}</p>
                  </div>
                </div>
                <button onClick={handleGenerate}
                  className="h-8 px-3 rounded-lg text-[12px] font-geist font-semibold flex items-center gap-1.5 bg-icm-accent text-white hover:opacity-90 transition">
                  <RefreshCw className="w-3.5 h-3.5" /> Try Again
                </button>
              </div>
            )}

            {/* Generated letter */}
            {letter && !generating && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-icm-green" />
                    <span className="text-[11.5px] font-geist font-semibold text-icm-text">Letter generated</span>
                    <span className="text-[10px] font-geist font-bold px-1.5 py-0.5 rounded bg-icm-amber-soft text-icm-amber">AI Draft — Review before sending</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { navigator.clipboard.writeText(letter); toast.success("Copied to clipboard"); }}
                      className="h-7 px-2.5 rounded-lg border border-icm-border text-[11px] font-geist text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1">
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                    <button onClick={handlePrint}
                      className="h-7 px-2.5 rounded-lg border border-icm-border text-[11px] font-geist text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1">
                      <Printer className="w-3 h-3" /> Print/PDF
                    </button>
                    <button onClick={handleGenerate} disabled={generating}
                      className="h-7 px-2.5 rounded-lg border border-icm-border text-[11px] font-geist text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  </div>
                </div>
                <textarea value={letter} onChange={e => setLetter(e.target.value)} rows={16}
                  style={{ minHeight: "300px" }}
                  className="w-full rounded-xl border border-icm-border bg-white px-4 py-3 text-[12px] font-mono text-icm-text resize-y focus:outline-none focus:ring-2 focus:ring-icm-accent/40" />
              </div>
            )}
          </div>
        </div>

        {/* Section 3 — Actions */}
        <div className="px-5 py-3 border-t border-icm-border flex items-center justify-between gap-3 shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:bg-icm-bg">Cancel</button>
          <button onClick={handleSaveDraft} disabled={saving}
            className="h-9 px-4 rounded-xl bg-teal-600 text-white text-[12px] font-geist font-semibold hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save as Draft
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const PersonAuthorizations = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading: personLoading } = useIndividual(id);
  const { data: auths, loading: authsLoading } = useServiceAuthorizations(id);
  const [renewalAuth, setRenewalAuth] = useState<ServiceAuthorization | null>(null);

  const personName = individual
    ? `${individual.first_name} ${individual.last_name}`
    : "Individual";

  const enriched = useMemo(() =>
    auths.map((a) => ({ ...a, _status: authDisplayStatus(a), _pct: unitsPct(a) })),
    [auths]
  );

  const activeCount = enriched.filter((a) => a._status === "active" || a._status === "expiring_soon" || a._status === "critical").length;
  const expiringSoonCount = enriched.filter((a) => a._status === "expiring_soon" || a._status === "critical").length;
  const expiredCount = enriched.filter((a) => a._status === "expired").length;
  const unitsThisMonth = enriched.reduce((sum, a) => sum + (a.units_used || 0), 0);

  const handleVoid = async (auth: ServiceAuthorization) => {
    if (!confirm(`Void authorization ${auth.auth_number}? This cannot be undone.`)) return;
    await updateServiceAuthorization(auth.id, { status: "voided" });
    toast.success("Authorization voided.");
  };

  if (personLoading || authsLoading) {
    return (
      <ICMShell title="Authorizations" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="Authorizations" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs
          backTo={`/people/${id}/echart`}
          backLabel="eChart"
          items={[
            { label: "People Supported", to: "/people" },
            { label: personName, to: `/people/${id}/echart` },
            { label: "Service Authorizations" },
          ]}
        />

        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-manrope font-extrabold text-[22px] text-icm-text tracking-tight">
              Service Authorizations
            </h1>
            <p className="text-[12.5px] font-geist text-icm-text-dim">{personName}</p>
          </div>
          <button
            id="new-authorization-btn"
            onClick={() => navigate(`/people/${id}/authorizations/new`)}
            className="h-9 px-4 rounded-xl text-[12.5px] font-geist font-semibold flex items-center gap-1.5 bg-icm-accent text-white hover:opacity-90 transition"
          >
            <Plus className="w-3.5 h-3.5" /> New Authorization
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Active" value={activeCount} tone="green" icon={CheckCircle2} />
          <SummaryCard label="Expiring Soon" value={expiringSoonCount} tone="amber" icon={Clock} />
          <SummaryCard label="Expired" value={expiredCount} tone="grey" icon={Ban} />
          <SummaryCard label="Units Used This Month" value={unitsThisMonth} tone="blue" icon={FileText} />
        </div>

        {/* Eligibility suspension banner — auto-shown from Firestore flag */}
        {enriched.some((a) => (a as any).eligibility_suspended) && (
          <div className="flex items-start gap-3 rounded-xl border border-icm-red/40 bg-icm-red-soft px-4 py-3.5">
            <AlertTriangle className="w-5 h-5 text-icm-red mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-geist font-semibold text-[13px] text-icm-red leading-snug">
                ⚠️ MA eligibility suspended as of{" "}
                {(enriched.find((a) => (a as any).eligibility_suspended) as any)?.eligibility_suspended_date ?? "recent date"}.
              </p>
              <p className="text-[12.5px] font-geist text-icm-text mt-1 leading-relaxed">
                Billing for all active authorizations is at risk.{" "}
                <strong>Do not submit claims until eligibility is restored.</strong>{" "}
                Go to{" "}
                <button
                  onClick={() => navigate(`/people/${id}/eligibility-verification`)}
                  className="underline text-icm-red font-semibold hover:opacity-80"
                >
                  Eligibility Verification
                </button>{" "}
                to restore status.
              </p>
            </div>
          </div>
        )}

        {/* AI Pace warnings */}
        {enriched
          .filter((a) => a._status === "active" || a._status === "expiring_soon" || a._status === "critical")
          .map((a) => {
            const pace = computePace(a);
            if (!pace) return null;
            if (pace.ok) return null; // Only show warnings, not "on track" here
            return (
              <div
                key={`pace-${a.id}`}
                className="flex items-start gap-3 rounded-xl border border-icm-amber/30 bg-icm-amber-soft px-4 py-3"
              >
                <TrendingDown className="w-4 h-4 text-icm-amber mt-0.5 shrink-0" />
                <p className="text-[12.5px] font-geist text-icm-text leading-snug">
                  <span className="font-semibold">Pace Warning — {a.service_name}: </span>
                  At current pace ({pace.dailyRate.toFixed(1)} units/day), units will run out{" "}
                  {pace.projectedRunOutDays !== null
                    ? `in approximately ${pace.projectedRunOutDays} days`
                    : "before the period ends"}
                  . Consider requesting additional units.
                </p>
              </div>
            );
          })}

        {/* Authorizations table */}
        {enriched.length === 0 ? (
          <div className="rounded-2xl border border-icm-border bg-icm-panel p-12 text-center">
            <FileText className="w-8 h-8 text-icm-text-faint mx-auto mb-3" />
            <p className="text-[14px] font-geist text-icm-text-dim">No authorizations on file.</p>
            <button
              onClick={() => navigate(`/people/${id}/authorizations/new`)}
              className="mt-4 text-[12px] font-geist font-semibold text-icm-accent hover:underline"
            >
              + Add first authorization
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-icm-border bg-icm-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px] font-geist">
                <thead>
                  <tr className="border-b border-icm-border bg-icm-bg">
                    {["Auth #", "Service Name", "Proc. Code", "Units", "Billing Period", "Dates", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-icm-text-dim whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enriched.map((auth, i) => {
                    const pace = computePace(auth);
                    const days = daysUntilExpiry(auth.end_date);
                    return (
                      <tr
                        key={auth.id}
                        className={cn(
                          "border-b border-icm-border last:border-0 hover:bg-icm-bg/60 transition-colors",
                          i % 2 === 0 ? "" : "bg-icm-bg/30"
                        )}
                      >
                        <td className="px-4 py-3 font-mono text-[11.5px] text-icm-text whitespace-nowrap">
                          {auth.auth_number}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-icm-text leading-tight">{auth.service_name}</p>
                          <p className="text-[11px] text-icm-text-dim mt-0.5">{auth.payer}</p>
                          {pace && !pace.ok && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-icm-amber">
                              <TrendingDown className="w-3 h-3" /> Over pace
                            </span>
                          )}
                          {pace && pace.ok && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-icm-green">
                              <TrendingUp className="w-3 h-3" /> On track
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-icm-text-dim">
                          {auth.procedure_code || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <UnitBar auth={auth} />
                        </td>
                        <td className="px-4 py-3 text-icm-text-dim capitalize whitespace-nowrap">
                          {auth.billing_period.replace("_", "-")}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-icm-text-dim text-[11px]">
                            {auth.start_date} →
                          </p>
                          <p className={cn(
                            "text-[11px] font-semibold",
                            auth._status === "critical" ? "text-icm-red" :
                            auth._status === "expiring_soon" ? "text-icm-amber" : "text-icm-text"
                          )}>
                            {auth.end_date}
                          </p>
                          {days >= 0 && auth._status !== "expired" && (
                            <p className="text-[10px] text-icm-text-faint">{days}d left</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={auth._status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              title="Draft Renewal Request"
                              onClick={() => setRenewalAuth(auth)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-icm-border text-[10.5px] text-icm-accent hover:bg-icm-accent-soft transition whitespace-nowrap"
                            >
                              <Sparkles className="w-3 h-3" /> Renew
                            </button>
                            {auth.status !== "voided" && (
                              <button
                                title="Void authorization"
                                onClick={() => handleVoid(auth)}
                                className="p-1.5 rounded-lg border border-icm-border text-icm-text-dim hover:text-icm-red hover:border-icm-red/30 transition"
                              >
                                <Ban className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* "On track" pace notes for active auths */}
        {enriched
          .filter((a) => a._status === "active")
          .map((a) => {
            const pace = computePace(a);
            if (!pace || !pace.ok) return null;
            return (
              <div
                key={`pace-ok-${a.id}`}
                className="flex items-center gap-2 text-[11.5px] font-geist text-icm-green"
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <strong>{a.service_name}</strong> — on track to finish period with ~{Math.round(pace.projectedRemaining)} units remaining.
                </span>
              </div>
            );
          })}
      </div>

      {renewalAuth && (
        <RenewalLetterModal
          auth={renewalAuth}
          individualName={personName}
          onClose={() => setRenewalAuth(null)}
        />
      )}
    </ICMShell>
  );
};

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "grey" | "blue";
  icon: React.ElementType;
}) {
  const colors = {
    green: { bg: "bg-icm-green-soft", text: "text-icm-green", icon: "text-icm-green" },
    amber: { bg: "bg-icm-amber-soft", text: "text-icm-amber", icon: "text-icm-amber" },
    grey: { bg: "bg-icm-border/30", text: "text-icm-text-dim", icon: "text-icm-text-dim" },
    blue: { bg: "bg-icm-accent-soft", text: "text-icm-accent", icon: "text-icm-accent" },
  }[tone];

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", colors.bg)}>
        <Icon className={cn("w-4 h-4", colors.icon)} />
      </div>
      <p className={cn("font-manrope font-extrabold text-[24px] leading-tight", colors.text)}>
        {value}
      </p>
      <p className="text-[11px] font-geist text-icm-text-dim mt-0.5">{label}</p>
    </div>
  );
}

export default PersonAuthorizations;
