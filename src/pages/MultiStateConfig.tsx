import { useState } from "react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Globe2, FileText, ShieldCheck, GitBranch, History, Undo2, Download, BarChart3, CheckCircle2, AlertTriangle, ArrowRight, Building2, Users, Filter } from "lucide-react";
import { toast } from "sonner";

type Tab = "config" | "promote" | "reporting";

const NJ_DIFFS = [
  { label: "Required fields", in: "DOB, Medicaid #, Waiver type (CIH/FSW)", nj: "DOB, Medicaid #, NJ DDD ID, Tier (A–E), DDD eligibility date" },
  { label: "Assessment version", in: "Indiana ICAP v2024.1", nj: "NJ NJCAT v2.3 + Self-Direction Addendum" },
  { label: "Plan template", in: "Indiana PCISP (Person-Centered ISP)", nj: "NJ Individualized Service Plan (ISP) — DDD format" },
  { label: "Form variation", in: "Monthly contact: phone OR in-person OK", nj: "Quarterly face-to-face required; monthly any modality" },
  { label: "Billing rules", in: "15-min units, T2022/T2023; FFS via CoreMMIS", nj: "15-min units + per-diem; DDD Fee-for-Service via Molina; PPL for self-direction" },
  { label: "Workflow", in: "Supervisor review optional for routine notes", nj: "Mandatory supervisor co-sign on all ISP changes" },
  { label: "Reporting", in: "BDDS monthly roster, INSITE incident", nj: "DDD Quarterly Monitoring Tool, UIRMS incident reports" },
  { label: "Role/security", in: "Indiana Coordinators see IN caseload only", nj: "NJ Support Coordinators see NJ caseload; cross-state PHI blocked by default" },
];

const PROMO_HISTORY = [
  { ver: "v1.4.2", env: "Production", at: "2026-05-18 09:12", by: "C. Vance (Admin)", changes: 7, status: "Active" },
  { ver: "v1.4.1", env: "Production", at: "2026-04-22 14:30", by: "C. Vance (Admin)", changes: 3, status: "Superseded" },
  { ver: "v1.4.0", env: "Sandbox",    at: "2026-05-20 16:44", by: "M. Patel (Config)", changes: 12, status: "Pending approval" },
];

const STATES_ROLLUP = [
  { state: "Indiana",    coordinators: 42, caseload: 1284, overdue: 38, compliance: 96.4, revenue: "$1.82M" },
  { state: "New Jersey", coordinators: 11, caseload:  287, overdue: 12, compliance: 91.1, revenue: "$0.41M" },
];

const REGIONS = [
  { region: "IN — Central (Indianapolis)", caseload: 612, compliance: 97.1 },
  { region: "IN — Northwest (Gary)",       caseload: 248, compliance: 94.8 },
  { region: "IN — Southern (Evansville)",  caseload: 424, compliance: 96.2 },
  { region: "NJ — North (Newark)",         caseload: 168, compliance: 90.4 },
  { region: "NJ — South (Cherry Hill)",    caseload: 119, compliance: 92.2 },
];

export default function MultiStateConfig() {
  const [tab, setTab] = useState<Tab>("config");
  const [enabled, setEnabled] = useState({
    intake: true, assessment: true, plan: true, billing: false, workflow: false, reporting: false, security: true,
  });
  const [filterState, setFilterState] = useState<"All" | "Indiana" | "New Jersey">("All");

  const exportCsv = (name: string) => {
    const rows = filterState === "All" ? STATES_ROLLUP : STATES_ROLLUP.filter(s => s.state === filterState);
    const csv = ["State,Coordinators,Caseload,Overdue,Compliance %,Revenue", ...rows.map(r => `${r.state},${r.coordinators},${r.caseload},${r.overdue},${r.compliance},${r.revenue}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${name}`);
  };

  return (
    <ICMShell title="Multi-State Configuration">
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-icm-accent-soft text-icm-accent grid place-items-center"><Globe2 className="w-5 h-5" /></div>
            <div className="flex-1">
              <h1 className="font-manrope font-bold text-[20px] text-icm-text">Indiana → New Jersey expansion</h1>
              <p className="text-[12px] text-icm-text-dim mt-1">Add a second state/program with no custom code — clone, override, promote, and report across states.</p>
            </div>
            <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">Tenant-aware</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-icm-border">
          {([
            ["config",    "13.1 NJ configuration",   FileText],
            ["promote",   "13.2 Promote to prod",    GitBranch],
            ["reporting", "13.3 Cross-state reports", BarChart3],
          ] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-3 py-2 text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 border-b-2 -mb-px ${tab===k?"border-icm-accent text-icm-accent":"border-transparent text-icm-text-dim hover:text-icm-text"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {tab === "config" && (
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
                <h2 className="font-manrope font-bold text-[14px] text-icm-text mb-1">New program: New Jersey DDD Support Coordination</h2>
                <p className="text-[11.5px] text-icm-text-dim mb-4">Cloned from Indiana CIH/FSW baseline · Tenant ID <code className="bg-icm-bg px-1 rounded">ipmg-nj</code></p>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  {[
                    ["Program code", "NJ-DDD-SC"],
                    ["State", "New Jersey"],
                    ["Funding source", "NJ DDD (FFS) + Self-Direction (PPL)"],
                    ["Go-live", "2026-07-01"],
                    ["Default tier", "Tier B"],
                    ["Time zone", "America/New_York"],
                  ].map(([k,v]) => (
                    <div key={k} className="rounded-lg bg-icm-bg ring-1 ring-icm-border p-2.5">
                      <div className="text-[10px] uppercase text-icm-text-dim font-semibold">{k}</div>
                      <div className="font-semibold text-icm-text">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
                <h2 className="font-manrope font-bold text-[14px] text-icm-text mb-3">Configuration deltas (IN → NJ)</h2>
                <div className="space-y-2">
                  {NJ_DIFFS.map((d, i) => (
                    <div key={d.label} className="grid grid-cols-12 gap-2 rounded-lg ring-1 ring-icm-border bg-icm-bg p-2.5 text-[11.5px]">
                      <div className="col-span-3 font-semibold text-icm-text">{d.label}</div>
                      <div className="col-span-4 text-icm-text-dim"><span className="text-[10px] uppercase mr-1 text-icm-text-dim">IN</span>{d.in}</div>
                      <div className="col-span-5 text-icm-text"><span className="text-[10px] uppercase mr-1 text-icm-accent font-semibold">NJ</span>{d.nj}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
                <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-3">Modules to override</h3>
                <div className="space-y-2">
                  {Object.entries(enabled).map(([k, v]) => (
                    <label key={k} className="flex items-center justify-between text-[12px] rounded-lg ring-1 ring-icm-border bg-icm-bg px-3 py-2 cursor-pointer">
                      <span className="capitalize">{k}</span>
                      <input type="checkbox" checked={v} onChange={e => setEnabled(s => ({ ...s, [k]: e.target.checked }))} />
                    </label>
                  ))}
                </div>
                <button onClick={() => { setTab("promote"); toast.success("Draft saved to Sandbox"); }}
                  className="mt-3 w-full h-9 rounded-xl bg-icm-accent text-white text-[12px] font-semibold inline-flex items-center justify-center gap-1.5">
                  Save & open promotion <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
                <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-2 inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-icm-accent" />Security segmentation</h3>
                <ul className="text-[11.5px] text-icm-text-dim space-y-1.5 list-disc pl-4">
                  <li>Row-level isolation by <code className="bg-icm-bg px-1 rounded">tenant_id</code></li>
                  <li>NJ role group: <b>SC-NJ</b> (no IN PHI access)</li>
                  <li>Cross-state report access gated by <b>Enterprise Analyst</b> role</li>
                  <li>Audit log tags every record with state code</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {tab === "promote" && (
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-manrope font-bold text-[14px] text-icm-text">Promotion pipeline</h2>
                  <span className="text-[10.5px] uppercase font-semibold text-icm-text-dim">NJ-DDD-SC · v1.4.0</span>
                </div>
                <div className="flex items-center gap-2">
                  {["Sandbox", "QA", "UAT", "Production"].map((env, i) => (
                    <div key={env} className="flex-1 flex items-center gap-2">
                      <div className={`flex-1 rounded-xl ring-1 p-3 ${i < 2 ? "bg-icm-green-soft ring-icm-green/30 text-icm-green" : i === 2 ? "bg-icm-accent-soft ring-icm-accent/30 text-icm-accent" : "bg-icm-bg ring-icm-border text-icm-text-dim"}`}>
                        <div className="text-[10px] uppercase font-semibold">{i < 2 ? "Passed" : i === 2 ? "Awaiting approval" : "Locked"}</div>
                        <div className="font-bold text-[13px]">{env}</div>
                      </div>
                      {i < 3 && <ArrowRight className="w-4 h-4 text-icm-text-dim" />}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => toast.success("Promotion approved — deploying to Production")}
                    className="h-9 px-3 rounded-xl bg-icm-accent text-white text-[12px] font-semibold inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Approve & promote</button>
                  <button onClick={() => toast("Rolled back to v1.4.2")}
                    className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-semibold inline-flex items-center gap-1.5"><Undo2 className="w-3.5 h-3.5" />Rollback</button>
                  <button onClick={() => toast.info("Impact: 287 individuals, 11 coordinators, 4 reports affected")}
                    className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-semibold inline-flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Impact analysis</button>
                </div>
              </div>

              <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
                <h2 className="font-manrope font-bold text-[14px] text-icm-text mb-3 inline-flex items-center gap-1.5"><History className="w-4 h-4" />Change audit log</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11.5px]">
                    <thead className="text-icm-text-dim">
                      <tr className="border-b border-icm-border"><th className="text-left p-2">Version</th><th className="text-left p-2">Environment</th><th className="text-left p-2">When</th><th className="text-left p-2">By</th><th className="text-left p-2">Changes</th><th className="text-left p-2">Status</th></tr>
                    </thead>
                    <tbody>
                      {PROMO_HISTORY.map(h => (
                        <tr key={h.ver} className="border-b border-icm-border/50">
                          <td className="p-2 font-mono">{h.ver}</td><td className="p-2">{h.env}</td><td className="p-2 text-icm-text-dim">{h.at}</td><td className="p-2">{h.by}</td><td className="p-2">{h.changes}</td>
                          <td className="p-2"><span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${h.status==="Active"?"bg-icm-green-soft text-icm-green":h.status==="Pending approval"?"bg-icm-accent-soft text-icm-accent":"bg-icm-bg text-icm-text-dim ring-1 ring-icm-border"}`}>{h.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
                <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-2">Impact analysis (v1.4.0)</h3>
                <ul className="text-[11.5px] space-y-1.5">
                  <li className="flex justify-between"><span className="text-icm-text-dim">Individuals affected</span><b>287</b></li>
                  <li className="flex justify-between"><span className="text-icm-text-dim">In-flight plans</span><b>34</b></li>
                  <li className="flex justify-between"><span className="text-icm-text-dim">Reports needing re-run</span><b>4</b></li>
                  <li className="flex justify-between"><span className="text-icm-text-dim">Roles modified</span><b>2 (SC-NJ, Supervisor-NJ)</b></li>
                  <li className="flex justify-between"><span className="text-icm-text-dim">Breaking changes</span><b className="text-icm-green">None</b></li>
                </ul>
              </div>
              <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
                <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-2">Approvers</h3>
                <ul className="text-[11.5px] space-y-1.5">
                  <li>✓ M. Patel (Config) — Submitted</li>
                  <li>✓ C. Vance (Admin) — Reviewed</li>
                  <li>⏳ L. Ramirez (Compliance) — Pending</li>
                  <li>⏳ J. O'Connor (Operations) — Pending</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {tab === "reporting" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-manrope font-bold text-[14px] text-icm-text inline-flex items-center gap-1.5"><Building2 className="w-4 h-4" />Enterprise rollup</h2>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 text-[11.5px] bg-icm-bg ring-1 ring-icm-border rounded-lg px-2 py-1">
                    <Filter className="w-3.5 h-3.5 text-icm-text-dim" />
                    <select value={filterState} onChange={e => setFilterState(e.target.value as any)} className="bg-transparent outline-none">
                      <option>All</option><option>Indiana</option><option>New Jersey</option>
                    </select>
                  </div>
                  <button onClick={() => exportCsv(`cross-state-${filterState.toLowerCase()}.csv`)}
                    className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-semibold inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />Export CSV</button>
                </div>
              </div>
              <table className="w-full text-[12px]">
                <thead className="text-icm-text-dim">
                  <tr className="border-b border-icm-border"><th className="text-left p-2">State</th><th className="text-right p-2">Coordinators</th><th className="text-right p-2">Caseload</th><th className="text-right p-2">Overdue</th><th className="text-right p-2">Compliance %</th><th className="text-right p-2">Revenue</th></tr>
                </thead>
                <tbody>
                  {STATES_ROLLUP.filter(s => filterState==="All" || s.state===filterState).map(s => (
                    <tr key={s.state} className="border-b border-icm-border/50">
                      <td className="p-2 font-semibold">{s.state}</td>
                      <td className="p-2 text-right">{s.coordinators}</td>
                      <td className="p-2 text-right">{s.caseload}</td>
                      <td className="p-2 text-right"><span className="text-icm-amber">{s.overdue}</span></td>
                      <td className="p-2 text-right">{s.compliance}%</td>
                      <td className="p-2 text-right font-semibold">{s.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
                <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-3 inline-flex items-center gap-1.5"><Users className="w-4 h-4" />Region / office rollup</h3>
                <div className="space-y-2">
                  {REGIONS.filter(r => filterState==="All" || r.region.startsWith(filterState==="Indiana"?"IN":"NJ")).map(r => (
                    <div key={r.region} className="rounded-lg bg-icm-bg ring-1 ring-icm-border p-2.5 text-[11.5px] flex items-center justify-between">
                      <span className="font-semibold">{r.region}</span>
                      <span className="text-icm-text-dim">{r.caseload} cases · <b className={r.compliance >= 95 ? "text-icm-green" : "text-icm-amber"}>{r.compliance}%</b></span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
                <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-3">Role-based segmentation</h3>
                <ul className="text-[11.5px] space-y-2">
                  <li className="flex justify-between"><span>Indiana SC</span><span className="text-icm-text-dim">IN data only</span></li>
                  <li className="flex justify-between"><span>New Jersey SC</span><span className="text-icm-text-dim">NJ data only</span></li>
                  <li className="flex justify-between"><span>State Director (IN / NJ)</span><span className="text-icm-text-dim">Single-state rollup</span></li>
                  <li className="flex justify-between"><span>Enterprise Analyst</span><span className="text-icm-green">Cross-state rollup</span></li>
                  <li className="flex justify-between"><span>Compliance Officer</span><span className="text-icm-green">Cross-state + audit</span></li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </ICMShell>
  );
}
