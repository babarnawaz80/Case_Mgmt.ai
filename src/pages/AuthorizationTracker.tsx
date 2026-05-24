import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { useAllAuthorizations, addServiceAuthorization, type ServiceAuthorization } from "@/hooks/useFirestore";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { toast } from "sonner";
import {
  FileCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Loader2,
  ArrowRight,
  RotateCcw,
  Plus,
  Sparkles,
  RefreshCw,
  X,
  Save,
  ChevronDown,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

function unitsPct(a: ServiceAuthorization) {
  if (!a.units_authorized) return 0;
  return (a.units_used / a.units_authorized) * 100;
}

type DisplayStatus = "active" | "expiring_soon" | "critical" | "expired" | "pending" | "voided";

function getDisplayStatus(a: ServiceAuthorization): DisplayStatus {
  if (a.status === "voided") return "voided";
  if (a.status === "pending") return "pending";
  const days = daysUntil(a.end_date);
  if (days < 0) return "expired";
  if (days <= 7) return "critical";
  if (days <= 30) return "expiring_soon";
  return "active";
}

function StatusBadge({ status }: { status: DisplayStatus }) {
  const map: Record<DisplayStatus, string> = {
    active: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    expiring_soon: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    critical: "bg-icm-red-soft text-icm-red ring-icm-red/20",
    expired: "bg-icm-border/60 text-icm-text-dim ring-icm-border/30",
    pending: "bg-yellow-50 text-yellow-700 ring-yellow-200",
    voided: "bg-icm-border/40 text-icm-text-faint ring-icm-border/20",
  };
  const labels: Record<DisplayStatus, string> = {
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

function UnitMiniBar({ auth }: { auth: ServiceAuthorization }) {
  const pct = unitsPct(auth);
  const color = pct > 100 ? "bg-red-700" : pct >= 85 ? "bg-icm-red" : pct >= 70 ? "bg-icm-amber" : "bg-icm-green";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-icm-border overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-[10.5px] font-mono text-icm-text-dim whitespace-nowrap">
        {Math.round(auth.units_authorized - auth.units_used)} left
      </span>
    </div>
  );
}

type FilterTab = "all" | "expiring_soon" | "critical" | "expired";

// ── Caseload Insights ────────────────────────────────────────────────────

const FUNCTIONS_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";
const CACHE_KEY = "auth_insights_cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface InsightCard {
  icon: string;
  title: string;
  body: string;
  tone: "info" | "warning" | "tip" | "alert";
}

function parseInsights(raw: string): InsightCard[] {
  const blocks = raw
    .split(/\n(?=\d+\.|##|###|•|–)/)
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, 4);

  const toneMap: InsightCard["tone"][] = ["info", "warning", "tip", "alert"];
  const icons = ["📊", "⚠️", "💡", "🔴"];

  return blocks.map((b, i) => ({
    icon: icons[i % icons.length],
    title: b.split("\n")[0].replace(/^[#\d\.\s*-]+/, "").trim().slice(0, 80),
    body: b.split("\n").slice(1).join(" ").trim() || b.slice(0, 200),
    tone: toneMap[i % toneMap.length],
  }));
}

function CaseloadInsights({ auths }: { auths: ServiceAuthorization[] }) {
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const loadFromCache = useCallback(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return false;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL_MS) {
        setInsights(data);
        setLastGenerated(new Date(ts).toLocaleTimeString());
        return true;
      }
    } catch { /* stale or malformed */ }
    return false;
  }, []);

  const generate = useCallback(async (force = false) => {
    if (!force && loadFromCache()) return;
    if (auths.length === 0) return;

    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const active = auths.filter((a) => a.status === "active" || a.status === "pending");

      const authSummary = active.map((a) => {
        const daysLeft = Math.ceil(
          (new Date(a.end_date + "T00:00:00").getTime() - today.getTime()) / 86400000
        );
        const pct = a.units_authorized > 0
          ? Math.round((a.units_used / a.units_authorized) * 100)
          : 0;
        return `${a.individualName} | ${a.service_name} | ${pct}% used | ${a.units_used}/${a.units_authorized} units | ${daysLeft} days left | Payer: ${a.payer}`;
      }).join("\n");

      const prompt =
        `You are an expert case management supervisor analyzing service authorization data for a caseload.\n\n` +
        `Authorization data (format: Individual | Service | % Used | Units | Days Until Expiry | Payer):\n${authSummary}\n\n` +
        `Analyze these patterns and identify exactly 4 insights in this order:\n` +
        `1. Which services consistently run out of units early (look for high % used with many days remaining)\n` +
        `2. Which individuals consistently underutilize (less than 50% used)\n` +
        `3. Which authorizations are most at risk this month (near cap or expiring)\n` +
        `4. Any patterns worth raising at the next team meeting\n\n` +
        `Format each insight as:\n## [Emoji] [Short Title]\n[2-3 sentence insight with specific names and numbers]\n\n` +
        `Use real names and numbers from the data. Be specific and actionable.`;

      const res = await fetch(`${FUNCTIONS_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: prompt }),
      });

      const { reply } = await res.json();
      const parsed = parseInsights(reply ?? "");
      setInsights(parsed);
      const now = Date.now();
      setLastGenerated(new Date(now).toLocaleTimeString());
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: now, data: parsed }));
    } catch (err) {
      console.error("[CaseloadInsights]", err);
    } finally {
      setLoading(false);
    }
  }, [auths, loadFromCache]);

  useEffect(() => {
    if (auths.length > 0) generate(false);
  }, [auths.length]); // Only re-run when auth count changes

  const toneStyles: Record<InsightCard["tone"], string> = {
    info: "border-icm-accent/20 bg-icm-accent-soft",
    warning: "border-icm-amber/20 bg-icm-amber-soft",
    tip: "border-icm-green/20 bg-icm-green-soft",
    alert: "border-icm-red/20 bg-icm-red-soft",
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-icm-border bg-icm-panel p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
          </div>
          <span className="font-manrope font-bold text-[14px] text-icm-text">Caseload Insights</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-icm-border bg-icm-bg animate-pulse" />
          ))}
        </div>
        <p className="text-[11px] font-geist text-icm-text-faint mt-3 text-center">
          Analyzing your caseload patterns with Gemini…
        </p>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="font-manrope font-bold text-[14px] text-icm-text">Caseload Insights</p>
            {lastGenerated && (
              <p className="text-[10px] font-geist text-icm-text-faint">Generated at {lastGenerated}</p>
            )}
          </div>
        </div>
        <button
          id="refresh-insights-btn"
          onClick={() => generate(true)}
          disabled={loading}
          className="h-8 px-3 rounded-xl border border-icm-border text-[11.5px] font-geist font-semibold text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong transition flex items-center gap-1.5 disabled:opacity-40"
        >
          <RefreshCw className="w-3 h-3" /> Refresh insights
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {insights.map((card, i) => (
          <div key={i} className={cn("rounded-xl border p-4", toneStyles[card.tone])}>
            <div className="flex items-start gap-2">
              <span className="text-[18px] leading-none mt-0.5 shrink-0">{card.icon}</span>
              <div className="min-w-0">
                <p className="font-geist font-semibold text-[12.5px] text-icm-text leading-snug">{card.title}</p>
                <p className="text-[11.5px] font-geist text-icm-text-dim mt-1 leading-relaxed">{card.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Individual picker for modal ─────────────────────────────────────────────

interface IndividualOption {
  id: string;
  name: string;
  program?: string;
}

function useIndividualOptions(orgId: string) {
  const [options, setOptions] = useState<IndividualOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    getDocs(
      query(
        collection(db, "individuals"),
        where("organizationId", "==", orgId),
        orderBy("last_name", "asc")
      )
    )
      .then((snap) => {
        setOptions(
          snap.docs.map((d) => ({
            id: d.id,
            name: `${d.data().first_name ?? ""} ${d.data().last_name ?? ""}`.trim(),
            program: d.data().program ?? d.data().primary_program ?? "",
          }))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orgId]);

  return { options, loading };
}

// ─── New Authorization Modal ─────────────────────────────────────────────────

const BILLING_PERIODS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
  { value: "one_time", label: "One-time" },
] as const;

interface NewAuthModalProps {
  orgId: string;
  currentUser: { uid: string };
  userProfile: { organizationId: string; firstName?: string; lastName?: string } | null;
  prefillIndividual?: IndividualOption | null;
  onClose: () => void;
  onSaved: () => void;
}

function NewAuthModal({ orgId, currentUser, userProfile, prefillIndividual, onClose, onSaved }: NewAuthModalProps) {
  const { options: individuals, loading: indsLoading } = useIndividualOptions(orgId);
  const [selectedInd, setSelectedInd] = useState<IndividualOption | null>(prefillIndividual ?? null);
  const [indSearch, setIndSearch] = useState(prefillIndividual?.name ?? "");
  const [indOpen, setIndOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    auth_number: "",
    service_name: "",
    procedure_code: "",
    payer: "",
    units_authorized: "",
    units_used: "0",
    billing_period: "monthly" as "monthly" | "quarterly" | "annual" | "one_time",
    start_date: "",
    end_date: "",
    notes: "",
  });

  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const filteredInds = useMemo(
    () =>
      indSearch.trim()
        ? individuals.filter((i) => i.name.toLowerCase().includes(indSearch.toLowerCase()))
        : individuals,
    [individuals, indSearch]
  );

  const handleSave = async () => {
    if (!selectedInd) { toast.error("Please select an individual."); return; }
    if (!form.auth_number || !form.service_name || !form.start_date || !form.end_date) {
      toast.error("Auth Number, Service Name, Start Date, and End Date are required.");
      return;
    }

    setSaving(true);
    try {
      await addServiceAuthorization({
        individualId: selectedInd.id,
        individual_id: selectedInd.id,
        individualName: selectedInd.name,
        organizationId: orgId,
        assigned_case_manager_id: currentUser.uid,
        assigned_case_manager_name: userProfile
          ? `${userProfile.firstName ?? ""} ${userProfile.lastName ?? ""}`.trim()
          : "",
        auth_number: form.auth_number.trim(),
        service_name: form.service_name.trim(),
        procedure_code: form.procedure_code.trim(),
        payer: form.payer.trim(),
        units_authorized: Number(form.units_authorized) || 0,
        units_used: Number(form.units_used) || 0,
        billing_period: form.billing_period,
        start_date: form.start_date,
        end_date: form.end_date,
        status: "active",
        notes: form.notes.trim(),
      });

      toast.success(`Authorization saved for ${selectedInd.name}`);
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Authorization save error:", err);
      toast.error("Failed to save authorization: " + msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-icm-panel border border-icm-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-icm-border">
          <div>
            <h2 className="font-manrope font-extrabold text-[18px] text-icm-text tracking-tight">New Authorization</h2>
            <p className="text-[12px] font-geist text-icm-text-dim mt-0.5">Add a service authorization for any individual</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-icm-border/40 transition text-icm-text-dim hover:text-icm-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Individual selector */}
          <div className="space-y-1">
            <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide">
              Individual <span className="text-icm-red">*</span>
            </label>
            <div className="relative">
              <div
                className="modal-input w-full flex items-center gap-2 cursor-pointer select-none"
                onClick={() => setIndOpen((o) => !o)}
              >
                {selectedInd ? (
                  <span className="text-icm-text text-[13px]">{selectedInd.name}</span>
                ) : (
                  <span className="text-icm-text-faint text-[13px]">Search and select individual…</span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-icm-text-dim ml-auto shrink-0" />
              </div>
              {indOpen && (
                <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-icm-panel border border-icm-border rounded-xl shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-icm-border flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-icm-text-dim shrink-0" />
                    <input
                      autoFocus
                      value={indSearch}
                      onChange={(e) => setIndSearch(e.target.value)}
                      placeholder="Search by name…"
                      className="flex-1 bg-transparent text-[13px] font-geist text-icm-text outline-none placeholder:text-icm-text-faint"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {indsLoading ? (
                      <div className="flex items-center justify-center py-4 gap-2 text-icm-text-dim">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-[12px] font-geist">Loading…</span>
                      </div>
                    ) : filteredInds.length === 0 ? (
                      <p className="text-center py-4 text-[12px] font-geist text-icm-text-dim">No individuals found</p>
                    ) : (
                      filteredInds.map((ind) => (
                        <button
                          key={ind.id}
                          onClick={() => { setSelectedInd(ind); setIndSearch(ind.name); setIndOpen(false); }}
                          className={cn(
                            "w-full text-left px-3 py-2.5 hover:bg-icm-bg transition text-[13px] font-geist",
                            selectedInd?.id === ind.id ? "bg-icm-accent/10 text-icm-accent" : "text-icm-text"
                          )}
                        >
                          <span className="font-medium">{ind.name}</span>
                          {ind.program && <span className="text-icm-text-dim text-[11px] ml-2">· {ind.program}</span>}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ModalField label="Auth Number *">
              <input id="modal-auth-number" value={form.auth_number} onChange={(e) => set("auth_number", e.target.value)} placeholder="e.g. SA-2026-001" className="modal-input w-full" />
            </ModalField>
            <ModalField label="Payer">
              <input id="modal-payer" value={form.payer} onChange={(e) => set("payer", e.target.value)} placeholder="e.g. IHCP, Anthem Indiana" className="modal-input w-full" />
            </ModalField>
            <ModalField label="Service Name *" className="sm:col-span-2">
              <input id="modal-service-name" value={form.service_name} onChange={(e) => set("service_name", e.target.value)} placeholder="e.g. Community Integration Habilitation" className="modal-input w-full" />
            </ModalField>
            <ModalField label="Procedure Code">
              <input id="modal-procedure-code" value={form.procedure_code} onChange={(e) => set("procedure_code", e.target.value)} placeholder="e.g. T2022" className="modal-input w-full" />
            </ModalField>
            <ModalField label="Billing Period">
              <select id="modal-billing-period" value={form.billing_period} onChange={(e) => set("billing_period", e.target.value)} className="modal-input w-full">
                {BILLING_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </ModalField>
            <ModalField label="Units Authorized">
              <input id="modal-units-authorized" type="number" min={0} value={form.units_authorized} onChange={(e) => set("units_authorized", e.target.value)} placeholder="0" className="modal-input w-full" />
            </ModalField>
            <ModalField label="Units Used to Date">
              <input id="modal-units-used" type="number" min={0} value={form.units_used} onChange={(e) => set("units_used", e.target.value)} placeholder="0" className="modal-input w-full" />
            </ModalField>
            <ModalField label="Start Date *">
              <input id="modal-start-date" type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} className="modal-input w-full" />
            </ModalField>
            <ModalField label="End Date *">
              <input id="modal-end-date" type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} className="modal-input w-full" />
            </ModalField>
            <ModalField label="Notes" className="sm:col-span-2">
              <textarea id="modal-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Additional notes about this authorization..." className="modal-input w-full resize-none" />
            </ModalField>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-icm-border">
          <button
            id="modal-save-authorization"
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 rounded-xl text-[12.5px] font-geist font-semibold flex items-center gap-1.5 bg-icm-accent text-white hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Save Authorization"}
          </button>
          <button onClick={onClose} className="h-9 px-4 rounded-xl text-[12.5px] font-geist font-semibold flex items-center gap-1.5 border border-icm-border text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong transition">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const AuthorizationTracker = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const orgId = userProfile?.organizationId ?? "";
  const uid = currentUser?.uid ?? "";

  const { data: auths, loading } = useAllAuthorizations(orgId, uid);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [showNewModal, setShowNewModal] = useState(false);
  const [prefillIndividual, setPrefillIndividual] = useState<IndividualOption | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Individual filter
  const [indFilter, setIndFilter] = useState<string>("all"); // "all" or individual name
  const [indFilterSearch, setIndFilterSearch] = useState("");
  const [indFilterOpen, setIndFilterOpen] = useState(false);

  const enriched = useMemo(
    () => auths.map((a) => ({ ...a, _status: getDisplayStatus(a), _days: daysUntil(a.end_date) })),
    [auths, refreshKey]
  );

  // Build unique individual list from loaded auths
  const uniqueIndividuals = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const a of enriched) {
      if (!seen.has(a.individualId)) seen.set(a.individualId, { id: a.individualId, name: a.individualName });
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [enriched]);

  // Summary counts (across all, not just filtered)
  const totalActive = enriched.filter((a) => ["active", "expiring_soon", "critical"].includes(a._status)).length;
  const expiringMonth = enriched.filter((a) => a._status === "expiring_soon" || a._status === "critical").length;
  const criticalWeek = enriched.filter((a) => a._status === "critical").length;
  const expiredCount = enriched.filter((a) => a._status === "expired").length;

  const filtered = useMemo(() => {
    let rows = enriched;
    // Individual filter
    if (indFilter !== "all") rows = rows.filter((a) => a.individualId === indFilter);
    // Tab filter
    if (activeFilter === "expiring_soon") rows = rows.filter((a) => a._status === "expiring_soon" || a._status === "critical");
    else if (activeFilter === "critical") rows = rows.filter((a) => a._status === "critical");
    else if (activeFilter === "expired") rows = rows.filter((a) => a._status === "expired");
    return rows;
  }, [enriched, activeFilter, indFilter]);

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "expiring_soon", label: "Expiring Soon" },
    { key: "critical", label: "Critical" },
    { key: "expired", label: "Expired" },
  ];

  const selectedIndName = indFilter === "all"
    ? "All Individuals"
    : uniqueIndividuals.find((i) => i.id === indFilter)?.name ?? "All Individuals";

  const filteredIndOptions = indFilterSearch.trim()
    ? uniqueIndividuals.filter((i) => i.name.toLowerCase().includes(indFilterSearch.toLowerCase()))
    : uniqueIndividuals;

  return (
    <ICMShell title="Authorization Tracker" showAIPanel={false}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-manrope font-extrabold text-[22px] text-icm-text tracking-tight">
              Authorization Tracker
            </h1>
            <p className="text-[12.5px] font-geist text-icm-text-dim">
              All service authorizations across your caseload
            </p>
          </div>
          <button
            id="new-authorization-btn"
            onClick={() => { setPrefillIndividual(null); setShowNewModal(true); }}
            className="h-9 px-4 rounded-xl text-[12.5px] font-geist font-semibold flex items-center gap-1.5 bg-icm-accent text-white hover:opacity-90 transition"
          >
            <Plus className="w-3.5 h-3.5" /> New Authorization
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard icon={CheckCircle2} label="Total Active" value={totalActive} color="text-icm-green" bg="bg-icm-green-soft" />
          <SummaryCard icon={Clock} label="Expiring This Month" value={expiringMonth} color="text-icm-amber" bg="bg-icm-amber-soft" />
          <SummaryCard icon={AlertTriangle} label="Critical — This Week" value={criticalWeek} color="text-icm-red" bg="bg-icm-red-soft" />
          <SummaryCard icon={Ban} label="Currently Expired" value={expiredCount} color="text-icm-text-dim" bg="bg-icm-border/30" />
        </div>

        {/* AI Caseload Insights */}
        <CaseloadInsights auths={enriched} />

        {/* Individual filter + tabs row */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-icm-border -mb-1 pb-2">
          {/* Tab filters */}
          <div className="flex items-center gap-1 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveFilter(t.key)}
                className={cn(
                  "px-3 py-2 text-[12.5px] font-geist border-b-2 -mb-[9px] transition-colors whitespace-nowrap",
                  activeFilter === t.key
                    ? "border-icm-accent text-icm-text font-semibold"
                    : "border-transparent text-icm-text-dim hover:text-icm-text"
                )}
              >
                {t.label}
                {t.key !== "all" && (
                  <span className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-icm-border/60 text-icm-text-dim">
                    {t.key === "expiring_soon" ? expiringMonth : t.key === "critical" ? criticalWeek : expiredCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Individual filter dropdown */}
          <div className="relative">
            <button
              id="individual-filter-btn"
              onClick={() => setIndFilterOpen((o) => !o)}
              className="h-8 px-3 rounded-xl border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong transition flex items-center gap-1.5"
            >
              {selectedIndName}
              <ChevronDown className="w-3 h-3 shrink-0" />
            </button>
            {indFilterOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-icm-panel border border-icm-border rounded-xl shadow-xl w-56 overflow-hidden">
                <div className="p-2 border-b border-icm-border flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-icm-text-dim shrink-0" />
                  <input
                    autoFocus
                    value={indFilterSearch}
                    onChange={(e) => setIndFilterSearch(e.target.value)}
                    placeholder="Search…"
                    className="flex-1 bg-transparent text-[12px] font-geist text-icm-text outline-none placeholder:text-icm-text-faint"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto">
                  <button
                    onClick={() => { setIndFilter("all"); setIndFilterOpen(false); setIndFilterSearch(""); }}
                    className={cn("w-full text-left px-3 py-2 text-[12.5px] font-geist hover:bg-icm-bg transition", indFilter === "all" ? "text-icm-accent font-semibold" : "text-icm-text")}
                  >
                    All Individuals
                  </button>
                  {filteredIndOptions.map((ind) => (
                    <button
                      key={ind.id}
                      onClick={() => { setIndFilter(ind.id); setIndFilterOpen(false); setIndFilterSearch(""); }}
                      className={cn("w-full text-left px-3 py-2 text-[12.5px] font-geist hover:bg-icm-bg transition", indFilter === ind.id ? "text-icm-accent font-semibold" : "text-icm-text")}
                    >
                      {ind.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[13px] font-geist">Loading authorizations…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-icm-border bg-icm-panel p-12 text-center">
            <FileCheck className="w-8 h-8 text-icm-text-faint mx-auto mb-3" />
            <p className="text-[14px] font-geist text-icm-text-dim mb-4">
              {activeFilter === "all" && indFilter === "all"
                ? "No authorizations in your caseload yet."
                : `No matching authorizations.`}
            </p>
            <button
              onClick={() => { setPrefillIndividual(null); setShowNewModal(true); }}
              className="h-8 px-4 rounded-xl text-[12px] font-geist font-semibold flex items-center gap-1.5 bg-icm-accent text-white hover:opacity-90 transition mx-auto"
            >
              <Plus className="w-3.5 h-3.5" /> Add First Authorization
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-icm-border bg-icm-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px] font-geist">
                <thead>
                  <tr className="border-b border-icm-border bg-icm-bg">
                    {["Individual", "Service", "Auth #", "Units Remaining", "Expires", "Days Left", "Status", "Action"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-icm-text-dim whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((auth, i) => {
                    const isExpired = auth._status === "expired";
                    const isCritical = auth._status === "critical";
                    const isExpiring = auth._status === "expiring_soon";

                    return (
                      <tr
                        key={auth.id}
                        className={cn(
                          "border-b border-icm-border last:border-0 hover:bg-icm-bg/60 transition-colors",
                          i % 2 === 0 ? "" : "bg-icm-bg/30"
                        )}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/people/${auth.individualId}/authorizations`)}
                            className="font-semibold text-icm-text hover:text-icm-accent hover:underline text-left"
                          >
                            {auth.individualName}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-icm-text leading-tight">{auth.service_name}</p>
                          <p className="text-[10.5px] text-icm-text-dim">{auth.procedure_code}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-icm-text-dim whitespace-nowrap">
                          {auth.auth_number}
                        </td>
                        <td className="px-4 py-3">
                          <UnitMiniBar auth={auth} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn(
                            "text-[12px] font-semibold",
                            isCritical ? "text-icm-red" : isExpiring ? "text-icm-amber" : "text-icm-text-dim"
                          )}>
                            {auth.end_date}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn(
                            "text-[12px] font-mono font-semibold",
                            isExpired ? "text-icm-text-faint" :
                            isCritical ? "text-icm-red" :
                            isExpiring ? "text-icm-amber" : "text-icm-text-dim"
                          )}>
                            {isExpired ? "Expired" : `${auth._days}d`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={auth._status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {(isCritical || isExpiring) && (
                              <button
                                onClick={() => navigate(`/people/${auth.individualId}/authorizations`)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-icm-amber/40 text-icm-amber text-[10.5px] font-semibold hover:bg-icm-amber-soft transition whitespace-nowrap"
                              >
                                <RotateCcw className="w-3 h-3" /> Start Renewal
                              </button>
                            )}
                            {isExpired && (
                              <button
                                onClick={() => {
                                  setPrefillIndividual({ id: auth.individualId, name: auth.individualName });
                                  setShowNewModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-icm-border text-icm-text-dim text-[10.5px] font-semibold hover:text-icm-text hover:border-icm-border-strong transition whitespace-nowrap"
                              >
                                <Plus className="w-3 h-3" /> Request New
                              </button>
                            )}
                            {auth._status === "active" && (
                              <button
                                onClick={() => navigate(`/people/${auth.individualId}/authorizations`)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-icm-border text-icm-text-dim text-[10.5px] font-semibold hover:text-icm-text hover:border-icm-border-strong transition whitespace-nowrap"
                              >
                                View <ArrowRight className="w-3 h-3" />
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
      </div>

      {/* New Authorization Modal */}
      {showNewModal && currentUser && (
        <NewAuthModal
          orgId={orgId}
          currentUser={currentUser}
          userProfile={userProfile}
          prefillIndividual={prefillIndividual}
          onClose={() => { setShowNewModal(false); setPrefillIndividual(null); }}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </ICMShell>
  );
};

function SummaryCard({
  icon: Icon, label, value, color, bg,
}: {
  icon: React.ElementType; label: string; value: number; color: string; bg: string;
}) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", bg)}>
        <Icon className={cn("w-4 h-4", color)} />
      </div>
      <p className={cn("font-manrope font-extrabold text-[24px] leading-tight", color)}>{value}</p>
      <p className="text-[11px] font-geist text-icm-text-dim mt-0.5">{label}</p>
    </div>
  );
}

export default AuthorizationTracker;
