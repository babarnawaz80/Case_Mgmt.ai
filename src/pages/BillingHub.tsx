import { useMemo, useState } from "react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type AiStatus = "passed" | "attention" | "pending";
type BillStatus = "ready" | "hold" | "pending" | "submitted";

type Claim = {
  id: string;
  individual: string;
  dos: string;
  code: string;
  units: number;
  payer: string;
  auth: string;
  ai: AiStatus;
  billing: BillStatus;
};

const CLAIMS: Claim[] = [
  { id: "c1", individual: "Brown, Joseph", dos: "04/27/2026", code: "T2022", units: 3, payer: "IHCP", auth: "SA-2026-001", ai: "passed", billing: "ready" },
  { id: "c2", individual: "Brown, Joseph", dos: "04/15/2026", code: "T2022", units: 2, payer: "IHCP", auth: "SA-2026-001", ai: "passed", billing: "ready" },
  { id: "c3", individual: "Langston, Travis", dos: "04/27/2026", code: "T2022", units: 4, payer: "Anthem Indiana", auth: "SA-2026-002", ai: "passed", billing: "ready" },
  { id: "c4", individual: "Langston, Travis", dos: "04/09/2026", code: "T2022", units: 3, payer: "Anthem Indiana", auth: "SA-2026-002", ai: "attention", billing: "hold" },
  { id: "c5", individual: "Walker, Ashley", dos: "04/20/2026", code: "T2023", units: 2, payer: "IHCP", auth: "SA-2026-003", ai: "attention", billing: "hold" },
  { id: "c6", individual: "Raza, Mohsin", dos: "04/18/2026", code: "T2022", units: 4, payer: "MHS", auth: "SA-2026-004", ai: "pending", billing: "pending" },
  { id: "c7", individual: "Brown, Joseph", dos: "03/30/2026", code: "T2022", units: 3, payer: "IHCP", auth: "SA-2026-001", ai: "passed", billing: "submitted" },
  { id: "c8", individual: "Langston, Travis", dos: "03/15/2026", code: "T2022", units: 2, payer: "Anthem", auth: "SA-2026-002", ai: "passed", billing: "submitted" },
];

type TabKey = "all" | "pending" | "ready" | "attention" | "submitted" | "denied";

const BillingHub = () => {
  const [tab, setTab] = useState<TabKey>("all");
  const [autoScrub, setAutoScrub] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [drawerClaim, setDrawerClaim] = useState<Claim | null>(null);

  const filtered = useMemo(() => {
    switch (tab) {
      case "pending": return CLAIMS.filter((c) => c.ai === "pending");
      case "ready": return CLAIMS.filter((c) => c.billing === "ready");
      case "attention": return CLAIMS.filter((c) => c.ai === "attention");
      case "submitted": return CLAIMS.filter((c) => c.billing === "submitted");
      case "denied": return [];
      default: return CLAIMS;
    }
  }, [tab]);

  const hasReady = filtered.some((c) => c.billing === "ready");

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "all", label: "All Claims" },
    { key: "pending", label: "Pending Scrub", count: 4 },
    { key: "ready", label: "Ready to Submit", count: 12 },
    { key: "attention", label: "Needs Attention", count: 2 },
    { key: "submitted", label: "Submitted" },
    { key: "denied", label: "Denied" },
  ];

  return (
    <ICMShell title="Billing" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs
          backTo="/dashboard"
          backLabel="Dashboard"
          items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Billing" }]}
        />

        <div>
          <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
            Billing
          </h1>
          <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
            AI-scrubbed claims engine · IDD Billing.AI integration
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Clock} tone="gray" value="4" label="Pending Scrub" sub="Awaiting AI review" />
          <StatCard icon={CheckCircle2} tone="green" value="12" label="Scrub Passed" sub="Ready to submit" />
          <StatCard icon={AlertTriangle} tone="amber" value="2" label="Needs Attention" sub="Action required" />
          <StatCard icon={Send} tone="blue" value="28" label="Submitted This Month" sub="Via IDD Billing.AI" />
        </div>

        {/* AI Scrub Agent banner */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 border-l-4 border-l-teal-500">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-[240px]">
              <p className="font-manrope font-bold text-[13.5px] text-icm-text">AI Billing Agent — Active</p>
              <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">
                Continuously reviewing completed notes. Last scrub run: Today at 9:14 PM · 18 claims reviewed · 2 flagged for attention.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-[11.5px] font-geist text-icm-text cursor-pointer">
                <span>Auto-scrub on note completion</span>
                <button
                  type="button"
                  onClick={() => setAutoScrub((v) => !v)}
                  className={cn(
                    "relative inline-block w-9 h-5 rounded-full transition-colors",
                    autoScrub ? "bg-teal-500" : "bg-icm-border"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                      autoScrub && "translate-x-4"
                    )}
                  />
                </button>
              </label>
              <button
                onClick={() => toast.success("Full scrub started · 18 claims in queue")}
                className="h-8 px-3 rounded-lg border border-icm-border text-[11.5px] font-geist font-semibold text-icm-text hover:bg-icm-bg"
              >
                Run full scrub now
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-icm-border flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3 py-2 text-[12px] font-geist font-semibold -mb-px border-b-2 transition-colors",
                tab === t.key
                  ? "border-icm-accent text-icm-text"
                  : "border-transparent text-icm-text-dim hover:text-icm-text"
              )}
            >
              {t.label}
              {typeof t.count === "number" && (
                <span className="ml-1.5 text-icm-text-dim">({t.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Batch submit bar */}
        {hasReady && (
          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[12px] font-geist text-icm-text">
              <span className="font-semibold">12 claims</span> ready to submit to IDD Billing.AI
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toast("All ready claims selected")}
                className="h-8 px-3 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-geist font-semibold text-icm-text"
              >
                Select All Ready
              </button>
              <button
                onClick={() => setConfirmOpen(true)}
                className="h-8 px-3 rounded-lg bg-teal-600 text-white text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:bg-teal-700"
              >
                Submit Selected to IDD Billing.AI <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Claims table */}
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
              <tr>
                <Th>Individual</Th>
                <Th>Date of Service</Th>
                <Th>Service Code</Th>
                <Th>Units</Th>
                <Th>Payer</Th>
                <Th>Authorization</Th>
                <Th>AI Status</Th>
                <Th>Billing Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-icm-border">
                  <td className="px-3 py-2 text-icm-text font-semibold">{c.individual}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{c.dos}</td>
                  <td className="px-3 py-2 text-icm-text font-mono font-semibold">{c.code}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{c.units} units</td>
                  <td className="px-3 py-2 text-icm-text-dim">{c.payer}</td>
                  <td className="px-3 py-2 text-icm-text-dim font-mono">{c.auth}</td>
                  <td className="px-3 py-2"><AiBadge status={c.ai} /></td>
                  <td className="px-3 py-2"><BillingBadge status={c.billing} /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {c.billing === "ready" && (
                        <button
                          onClick={() => toast.success(`Claim ${c.id.toUpperCase()} submitted`)}
                          className="text-[11.5px] font-geist font-semibold text-teal-600 hover:underline"
                        >
                          Submit
                        </button>
                      )}
                      {c.ai === "attention" && (
                        <button
                          onClick={() => setDrawerClaim(c)}
                          className="text-[11.5px] font-geist font-semibold text-amber-600 hover:underline"
                        >
                          Fix
                        </button>
                      )}
                      <button
                        onClick={() => toast(`Viewing claim ${c.id.toUpperCase()}`)}
                        className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-icm-text-dim text-[12px]">No claims in this view.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Integration footer */}
        <div className="rounded-xl border border-icm-border bg-icm-bg/40 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
          <p className="text-[11px] font-geist text-icm-text-dim">
            Connected to IDD Billing.AI · Last submission: 04/26/2026 · 28 claims submitted this month · Next scheduled submission: Daily at 11:00 PM
          </p>
          <button
            onClick={() => toast("Opening IDD Billing.AI")}
            className="text-[11px] font-geist text-icm-accent hover:underline"
          >
            Open IDD Billing.AI →
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="bg-icm-panel rounded-xl border border-icm-border w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-manrope font-bold text-[15px] text-icm-text">Submit 12 claims to IDD Billing.AI?</h3>
            <p className="text-[12px] font-geist text-icm-text-dim mt-2 leading-relaxed">
              These claims have passed AI scrubbing and supervisor approval. They will be transmitted as an 837P file via IDD Billing.AI.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setConfirmOpen(false)}
                className="h-9 px-3 rounded-lg border border-icm-border text-[12px] font-geist font-semibold text-icm-text"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  toast.success("12 claims submitted to IDD Billing.AI · 837P file generated");
                }}
                className="h-9 px-3 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-semibold"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Needs attention drawer */}
      {drawerClaim && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setDrawerClaim(null)}>
          <div
            className="absolute top-0 right-0 h-full w-full max-w-md bg-icm-panel border-l border-icm-border shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-icm-border">
              <div>
                <p className="text-[10.5px] font-geist uppercase tracking-wider text-icm-text-dim">Claim Issue</p>
                <p className="font-manrope font-bold text-[14px] text-icm-text">
                  {drawerClaim.individual.split(",").reverse().join(" ").trim()} · {drawerClaim.dos}
                </p>
              </div>
              <button onClick={() => setDrawerClaim(null)} className="text-icm-text-dim hover:text-icm-text">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <p className="text-[11px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">AI Finding</p>

                <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 mb-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[12px] font-geist font-semibold text-icm-text">Issue 1</p>
                      <p className="text-[11.5px] font-geist text-icm-text-dim mt-1 leading-relaxed">
                        Narrative does not meet minimum documentation requirements for T2022 under Anthem Indiana. Required: description of coordination activity and individual response. Current narrative is 12 words — minimum is 25 words.
                      </p>
                      <button
                        onClick={() => toast("Opening note")}
                        className="mt-2 text-[11.5px] font-geist font-semibold text-icm-accent hover:underline inline-flex items-center gap-1"
                      >
                        Open note to fix <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[12px] font-geist font-semibold text-icm-text">Issue 2</p>
                      <p className="text-[11.5px] font-geist text-icm-text-dim mt-1 leading-relaxed">
                        Authorization SA-2026-002 has 4 units remaining. This claim is for 3 units — within limit but within 85% warning threshold.
                      </p>
                      <button
                        onClick={() => toast("Opening authorization")}
                        className="mt-2 text-[11.5px] font-geist font-semibold text-icm-accent hover:underline inline-flex items-center gap-1"
                      >
                        View authorization <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11.5px] font-geist text-icm-text-dim italic">
                Once issues are resolved, AI will automatically re-scrub this claim.
              </p>
            </div>
          </div>
        </div>
      )}
    </ICMShell>
  );
};

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-3 py-2 font-semibold">{children}</th>;
}

function StatCard({
  icon: Icon, tone, value, label, sub,
}: {
  icon: typeof Clock; tone: "gray" | "green" | "amber" | "blue"; value: string; label: string; sub: string;
}) {
  const toneMap = {
    gray: "bg-slate-100 text-slate-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  } as const;
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-3">
      <div className="flex items-center gap-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", toneMap[tone])}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">{label}</p>
      </div>
      <p className="mt-2 font-manrope font-extrabold text-[24px] text-icm-text leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-geist text-icm-text-dim">{sub}</p>
    </div>
  );
}

function AiBadge({ status }: { status: AiStatus }) {
  if (status === "passed") return <Pill tone="green">✅ Scrub passed</Pill>;
  if (status === "attention") return <Pill tone="amber">⚠️ Needs attention</Pill>;
  return <Pill tone="gray">🔄 Pending scrub</Pill>;
}

function BillingBadge({ status }: { status: BillStatus }) {
  if (status === "ready") return <Pill tone="green">Ready</Pill>;
  if (status === "hold") return <Pill tone="amber">On hold</Pill>;
  if (status === "submitted") return <Pill tone="blue">Submitted</Pill>;
  return <Pill tone="gray">Pending</Pill>;
}

function Pill({ tone, children }: { tone: "green" | "amber" | "gray" | "blue"; children: React.ReactNode }) {
  const map = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    gray: "bg-slate-100 text-slate-700 ring-slate-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
  } as const;
  return (
    <span className={cn("px-1.5 py-0.5 rounded-full text-[10.5px] font-geist font-semibold ring-1 inline-flex items-center gap-1", map[tone])}>
      {children}
    </span>
  );
}

export default BillingHub;
