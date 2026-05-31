import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import {
  ShieldCheck, AlertTriangle, Clock, CalendarClock, FileWarning,
  Users, TrendingUp, ArrowRight, BarChart3, ShieldAlert, Loader2,
  CheckCircle2,
} from "lucide-react";
import { useIndividuals, riskTier } from "@/hooks/useIndividuals";
import { useIncidentSummary } from "@/hooks/useIncidents";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection, query, where, orderBy, onSnapshot, type DocumentData,
} from "firebase/firestore";
import { cn } from "@/lib/utils";
import { AuthorCell } from "@/components/icm/AuthorCell";

// ──── Pending progress note type ────────────────────────────────────────────
interface PendingNote {
  id: string;
  individualId: string;
  individualName?: string;
  authorName?: string;
  progressDate: string;
  status: string;
  serviceCode?: string;
  units?: number;
  createdAt?: unknown;
}

function toNote(id: string, d: DocumentData): PendingNote {
  return {
    id,
    individualId: d.individualId ?? "",
    individualName: d.individualName ?? d.personName ?? "",
    authorName: d.authorName ?? d.coordinator ?? "",
    progressDate: d.progressDate ?? d.date ?? "",
    status: d.status ?? "submitted",
    serviceCode: d.serviceCode ?? d.service_code,
    units: d.units,
  };
}

function usePendingNotes(orgId: string | undefined) {
  const [notes, setNotes] = useState<PendingNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const q = query(
      collection(db, "progress_notes"),
      where("organizationId", "==", orgId),
      where("status", "in", ["submitted", "pending", "awaiting_review"]),
      orderBy("progressDate", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map((d) => toNote(d.id, d.data())));
      setLoading(false);
    }, (err) => {
      console.warn("[pendingNotes]", err.message);
      // Fallback without orderBy (avoids index error)
      const fallback = query(
        collection(db, "progress_notes"),
        where("organizationId", "==", orgId),
        where("status", "in", ["submitted", "pending", "awaiting_review"]),
      );
      onSnapshot(fallback, (snap) => {
        setNotes(snap.docs.map((d) => toNote(d.id, d.data())));
        setLoading(false);
      });
    });
    return unsub;
  }, [orgId]);

  return { notes, loading };
}

// ──── Published reports (from Report Builder → Publish to supervisor dashboard) ──
interface PublishedReport { id: string; name: string; description?: string; category?: string; createdBy?: string; }

function usePublishedReports(orgId: string | undefined) {
  const [reports, setReports] = useState<PublishedReport[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const q = query(
      collection(db, "reports"),
      where("organizationId", "==", orgId),
      where("published", "==", true),
    );
    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map((d) => {
        const data = d.data();
        return { id: d.id, name: data.name || data.title || "Untitled Report", description: data.description, category: data.category, createdBy: data.createdBy };
      }));
      setLoading(false);
    }, (err) => { console.warn("[publishedReports]", err.message); setLoading(false); });
    return unsub;
  }, [orgId]);
  return { reports, loading };
}

// ──── KPI card ───────────────────────────────────────────────────────────────
function Kpi({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  return (
    <div className={cn("rounded-xl p-3 border border-icm-border bg-icm-panel flex gap-3 items-start")}>
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", color)}>{icon}</div>
      <div>
        <p className="font-manrope font-extrabold text-[20px] text-icm-text leading-none tabular-nums">{value}</p>
        <p className="text-[11px] font-geist font-semibold text-icm-text mt-0.5">{label}</p>
        <p className="text-[10.5px] font-geist text-icm-text-dim">{sub}</p>
      </div>
    </div>
  );
}

const SupervisorDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const { individuals, loading: loadingPeople } = useIndividuals();
  const { totalOpen: openIncidents, overdue: overdueIncidents, loading: loadingIncidents } = useIncidentSummary();
  const { notes: pendingNotes, loading: loadingNotes } = usePendingNotes(orgId);
  const { reports: publishedReports } = usePublishedReports(orgId);

  const loading = loadingPeople || loadingIncidents;

  const totals = useMemo(() => {
    const active = individuals.filter((i) => i.enrollment_status === "active");
    const highRisk = active.filter((i) => (i.risk_score ?? 0) >= 7).length;
    return {
      caseload: active.length,
      highRisk,
      pending: pendingNotes.length,
    };
  }, [individuals, pendingNotes]);

  return (
    <ICMShell title="Supervisor Dashboard" showAIPanel={false}>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em] inline-flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600" /> Supervisor Dashboard
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">Caseload health, pending approvals, and compliance risk — live from Firestore.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/supervisor/compliance")} className="h-9 px-3 rounded-xl border border-icm-border bg-white text-[12px] inline-flex items-center gap-1.5 hover:bg-icm-bg">
              <AlertTriangle className="w-3.5 h-3.5" /> Compliance Exceptions
            </button>
            <button onClick={() => navigate("/exceptions")} className="h-9 px-3 rounded-xl border border-icm-border bg-white text-[12px] inline-flex items-center gap-1.5 hover:bg-icm-bg">
              <ShieldAlert className="w-3.5 h-3.5" /> Validation Exceptions
            </button>
          </div>
        </div>

        {/* KPI grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="rounded-xl border border-icm-border bg-icm-panel p-3 animate-pulse h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={<Users className="w-4 h-4" />} label="Total caseload" value={totals.caseload} sub="Active individuals" color="bg-blue-500/10 text-blue-700" />
            <Kpi icon={<Clock className="w-4 h-4" />} label="Open incidents" value={openIncidents} sub="Across org" color="bg-rose-500/10 text-rose-700" />
            <Kpi icon={<FileWarning className="w-4 h-4" />} label="Notes pending" value={totals.pending} sub="Awaiting approval" color="bg-amber-500/10 text-amber-700" />
            <Kpi icon={<AlertTriangle className="w-4 h-4" />} label="Overdue incidents" value={overdueIncidents} sub="7+ days open" color="bg-rose-500/10 text-rose-700" />
            <Kpi icon={<ShieldAlert className="w-4 h-4" />} label="High-risk individuals" value={totals.highRisk} sub="Risk score ≥ 7" color="bg-purple-500/10 text-purple-700" />
            <Kpi icon={<CalendarClock className="w-4 h-4" />} label="Active caseload" value={totals.caseload} sub="Live count" color="bg-blue-500/10 text-blue-700" />
            <Kpi icon={<TrendingUp className="w-4 h-4" />} label="Notes submitted" value={totals.pending} sub="Pending review" color="bg-emerald-500/10 text-emerald-700" />
            <Kpi icon={<BarChart3 className="w-4 h-4" />} label="Incidents open" value={openIncidents} sub="Need action" color="bg-rose-500/10 text-rose-700" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pending approvals */}
          <div className="lg:col-span-2 rounded-xl border border-icm-border bg-icm-panel">
            <div className="p-4 border-b border-icm-border flex items-center justify-between">
              <h3 className="font-manrope font-bold text-[14px] inline-flex items-center gap-2">
                <FileWarning className="w-4 h-4 text-amber-600" /> Notes awaiting approval
              </h3>
              <span className="text-[11.5px] text-icm-text-dim">{totals.pending} pending</span>
            </div>
            {loadingNotes ? (
              <div className="flex items-center justify-center py-10 gap-2 text-icm-text-dim">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[12px] font-geist">Loading notes…</span>
              </div>
            ) : pendingNotes.length === 0 ? (
              <div className="flex items-center justify-center py-10 gap-2 text-icm-text-dim">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-[12px] font-geist">All notes reviewed. Great work!</span>
              </div>
            ) : (
              <ul className="divide-y divide-icm-border">
                {pendingNotes.slice(0, 10).map((n) => (
                  <li
                    key={n.id}
                    className="p-3 hover:bg-icm-bg cursor-pointer"
                    onClick={() => navigate(`/supervisor/review/${n.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-icm-text truncate">
                          {n.individualName || "Individual"}
                        </div>
                        <div className="text-[11.5px] text-icm-text-dim font-mono flex items-center gap-1 mt-0.5">
                          {n.serviceCode && `${n.serviceCode} · `}{n.units != null && `${n.units}u · `}
                          <AuthorCell name={n.authorName} size="sm" showName={true} />
                          {n.progressDate && ` · ${n.progressDate}`}
                        </div>
                      </div>
                      <span className="px-1.5 h-5 inline-flex items-center rounded text-[10.5px] bg-amber-100 text-amber-700">
                        Pending
                      </span>
                      <ArrowRight className="w-4 h-4 text-icm-text-dim" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right sidebar — caseload summary + quick actions */}
          <div className="space-y-4">
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
              <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-3">Caseload Overview</h3>
              {loadingPeople ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => <div key={i} className="h-4 rounded bg-icm-border animate-pulse" />)}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(["high", "review", "standard"] as const).map((tier) => {
                    const count = individuals.filter((p) => riskTier(p.risk_score) === tier).length;
                    const pct = individuals.length > 0 ? Math.round((count / individuals.length) * 100) : 0;
                    const colors = {
                      high: "bg-red-500",
                      review: "bg-amber-500",
                      standard: "bg-emerald-500",
                    };
                    const labels = { high: "High Risk", review: "Needs Review", standard: "Stable" };
                    return (
                      <div key={tier}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11.5px] font-geist text-icm-text">{labels[tier]}</span>
                          <span className="text-[11px] font-mono font-bold text-icm-text">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-icm-bg overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", colors[tier])}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <button
                onClick={() => navigate("/people")}
                className="mt-3 w-full h-8 rounded-xl border border-icm-border text-[11.5px] font-geist font-medium text-icm-accent inline-flex items-center justify-center gap-1 hover:bg-icm-bg"
              >
                View all people <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
              <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button onClick={() => navigate("/incidents")} className="w-full h-9 rounded-xl border border-icm-border text-[11.5px] font-geist text-left px-3 flex items-center gap-2 hover:bg-icm-bg">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> View all incidents
                </button>
                <button onClick={() => navigate("/people")} className="w-full h-9 rounded-xl border border-icm-border text-[11.5px] font-geist text-left px-3 flex items-center gap-2 hover:bg-icm-bg">
                  <Users className="w-3.5 h-3.5 text-blue-600" /> View caseload
                </button>
                <button onClick={() => navigate("/supervisor/compliance")} className="w-full h-9 rounded-xl border border-icm-border text-[11.5px] font-geist text-left px-3 flex items-center gap-2 hover:bg-icm-bg">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Compliance report
                </button>
              </div>
            </div>

            {/* Published Reports — pushed here from the Report Builder */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-manrope font-bold text-[13px] text-icm-text inline-flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-icm-accent" /> Published Reports
                </h3>
                <button onClick={() => navigate("/reports")} className="text-[11px] font-geist font-semibold text-icm-accent hover:underline">
                  All reports →
                </button>
              </div>
              {publishedReports.length === 0 ? (
                <p className="text-[11.5px] text-icm-text-dim font-geist py-2">
                  No reports published yet. Publish one from the Report Builder to share it here.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {publishedReports.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/reports/${r.id}`)}
                      className="w-full text-left rounded-lg border border-icm-border px-3 py-2 hover:bg-icm-bg transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-geist font-semibold text-icm-text truncate">{r.name}</p>
                        <ArrowRight className="w-3.5 h-3.5 text-icm-text-faint group-hover:text-icm-accent shrink-0" />
                      </div>
                      {r.description && <p className="text-[10.5px] text-icm-text-dim font-geist truncate mt-0.5">{r.description}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ICMShell>
  );
};

export default SupervisorDashboard;
