import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { useRole } from "@/contexts/RoleContext";
import {
  BarChart3,
  Search,
  Sparkles,
  X,
  Calendar,
  Clock,
  Mail,
  Database,
  Shield,
  Download,
  Plus,
  CheckCircle2,
  PauseCircle,
} from "lucide-react";
import {
  CATEGORIES,
  REPORTS,
  ReportCategory,
  ReportDef,
  auditLog,
  exportPresets,
  savedReports,
  scheduledReports,
} from "@/data/reports";

type Tab = "standard" | "my" | "audit";

const toneClass: Record<string, string> = {
  green: "bg-icm-green-soft text-icm-green ring-icm-green/20",
  amber: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
  red: "bg-icm-red-soft text-icm-red ring-icm-red/20",
  blue: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
  neutral: "bg-icm-bg text-icm-text-dim ring-icm-border",
};

export default function Reports() {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const [tab, setTab] = useState<Tab>("standard");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"All" | ReportCategory>("All");
  const [dismissed, setDismissed] = useState(false);
  const [askOpen, setAskOpen] = useState(true);

  const filtered = useMemo(() => {
    return REPORTS.filter((r) => {
      const matchQ =
        !q ||
        r.name.toLowerCase().includes(q.toLowerCase()) ||
        r.description.toLowerCase().includes(q.toLowerCase());
      const matchC = cat === "All" || r.category === cat;
      const matchRole = !r.rolesAllowed || isAdmin || r.rolesAllowed.includes("admin") === false;
      // Show admin-only reports only to admins.
      const adminOk =
        !r.rolesAllowed?.includes("admin") || isAdmin || r.rolesAllowed.length > 1;
      return matchQ && matchC && matchRole && adminOk;
    });
  }, [q, cat, isAdmin]);

  return (
    <ICMShell title="Reports" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs
          backTo="/dashboard"
          backLabel="Dashboard"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Reports" },
          ]}
        />
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[24px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Reports
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              Operational, compliance, and outcome reporting across your caseload.
            </p>
          </div>
          <button
            onClick={() => navigate("/reports/builder")}
            className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Report Builder
          </button>
        </div>

        {!dismissed && (
          <div className="rounded-xl bg-icm-accent-soft border border-icm-accent/20 p-3 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-icm-accent mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-geist text-icm-text">
                <span className="font-semibold">3 reports need your attention today.</span>{" "}
                <span className="text-icm-text-dim">
                  PCP compliance dropped 4% this week · 5 individuals have overdue assessments · Claim denial rate increased to 12%.
                </span>
              </p>
              <button
                onClick={() => {
                  setCat("Compliance & Plan Status");
                  setTab("standard");
                }}
                className="mt-2 h-7 px-2.5 rounded-lg bg-icm-accent text-white text-[11px] font-semibold hover:opacity-90"
              >
                View flagged reports
              </button>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="w-6 h-6 rounded text-icm-text-dim hover:text-icm-text hover:bg-icm-panel flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-icm-border flex gap-4">
          {([
            ["standard", "Standard Reports"],
            ["my", "My Reports"],
            ["audit", "Audit & Export"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-2 text-[12.5px] font-geist font-semibold border-b-2 ${tab === key ? "border-icm-accent text-icm-text" : "border-transparent text-icm-text-dim hover:text-icm-text"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "standard" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
            <div className="space-y-4 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-icm-text-faint" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search reports…"
                    className="h-9 w-full pl-8 pr-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong"
                  />
                </div>
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value as any)}
                  className="h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none"
                >
                  <option value="All">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {(cat === "All" ? CATEGORIES : [cat]).map((category) => {
                const items = filtered.filter((r) => r.category === category);
                if (!items.length) return null;
                return (
                  <section key={category}>
                    <h2 className="font-manrope font-bold text-[14px] text-icm-text mb-2">
                      {category}{" "}
                      <span className="text-icm-text-faint font-mono text-[11px]">
                        {items.length}
                      </span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {items.map((r) => (
                        <ReportCard
                          key={r.id}
                          report={r}
                          onRun={() => navigate(`/reports/${r.id}`)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            {askOpen && (
              <aside className="lg:sticky lg:top-4 lg:self-start rounded-xl border border-icm-border bg-icm-panel p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-icm-accent mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-manrope font-bold text-[13px] text-icm-text">
                      Ask AI about your data
                    </h3>
                    <p className="text-[11px] text-icm-text-dim font-geist">
                      Plain-language queries across every report.
                    </p>
                  </div>
                  <button
                    onClick={() => setAskOpen(false)}
                    className="w-5 h-5 rounded text-icm-text-faint hover:text-icm-text"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  placeholder="Ask anything…"
                  className="h-9 w-full px-3 rounded-lg border border-icm-border bg-icm-bg text-[12px] focus:outline-none focus:border-icm-accent"
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {[
                    "Who has the most overdue tasks?",
                    "What is our PCP compliance rate?",
                    "Show denial trends for T2022",
                  ].map((s) => (
                    <button
                      key={s}
                      className="text-[10.5px] px-2 py-0.5 rounded-full bg-icm-bg text-icm-text-dim ring-1 ring-icm-border hover:ring-icm-border-strong"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="mt-3 rounded-lg bg-icm-bg p-2.5 text-[11.5px] font-geist text-icm-text">
                  <p className="font-semibold mb-1">Top overdue tasks:</p>
                  <p className="text-icm-text-dim">
                    Joseph Brown (3), Travis Langston (2), Mohsin Raza (1). All assigned to Kathy Adams.
                  </p>
                  <button
                    onClick={() => navigate("/reports/task-status")}
                    className="mt-2 text-[11px] font-semibold text-icm-accent hover:underline"
                  >
                    Open report →
                  </button>
                </div>
              </aside>
            )}
          </div>
        )}

        {tab === "my" && <MyReportsTab onOpen={(id) => navigate(`/reports/${id}`)} />}
        {tab === "audit" && <AuditExportTab isAdmin={isAdmin} />}
      </div>
    </ICMShell>
  );
}

function ReportCard({ report, onRun }: { report: ReportDef; onRun: () => void }) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex flex-col gap-3 hover:border-icm-border-strong hover:shadow-elevated transition-all">
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-lg bg-icm-accent-soft text-icm-accent flex items-center justify-center shrink-0">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-manrope font-bold text-[13.5px] text-icm-text leading-tight">
            {report.name}
          </h3>
          <p className="text-[11.5px] text-icm-text-dim font-geist mt-1 leading-snug line-clamp-2">
            {report.description}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] text-icm-text-faint font-geist">
          {report.lastRun ? `Last run ${report.lastRun}` : "Not yet run"}
        </span>
        <button
          onClick={onRun}
          className="h-7 px-2.5 rounded-lg bg-icm-text text-icm-panel text-[11px] font-geist font-semibold hover:opacity-90"
        >
          Run report →
        </button>
      </div>
    </div>
  );
}

function MyReportsTab({ onOpen }: { onOpen: (id: string) => void }) {
  const [sub, setSub] = useState<"saved" | "scheduled">("saved");
  return (
    <div className="space-y-4">
      <div className="flex gap-3 border-b border-icm-border">
        {([
          ["saved", "Saved Reports"],
          ["scheduled", "Scheduled Reports"],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setSub(k)}
            className={`pb-2 text-[12px] font-geist font-semibold border-b-2 ${sub === k ? "border-icm-accent text-icm-text" : "border-transparent text-icm-text-dim hover:text-icm-text"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {sub === "saved" && (
        <div className="space-y-2">
          {savedReports.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-icm-border bg-icm-panel p-3 flex items-center gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-manrope font-bold text-[13px] text-icm-text">{s.name}</p>
                <p className="text-[11px] text-icm-text-dim mt-0.5">
                  Based on {s.basedOn} · {s.filtersSummary} · Last run {s.lastRun}
                </p>
              </div>
              <button
                onClick={() => onOpen(s.basedOn)}
                className="h-8 px-2.5 rounded-lg bg-icm-text text-icm-panel text-[11px] font-semibold hover:opacity-90"
              >
                Run →
              </button>
            </div>
          ))}
        </div>
      )}

      {sub === "scheduled" && (
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Report</th>
                <th className="text-left px-4 py-2 font-semibold">Frequency</th>
                <th className="text-left px-4 py-2 font-semibold">Next run</th>
                <th className="text-left px-4 py-2 font-semibold">Recipients</th>
                <th className="text-left px-4 py-2 font-semibold">Format</th>
                <th className="text-left px-4 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {scheduledReports.map((s) => (
                <tr key={s.id} className="border-t border-icm-border">
                  <td className="px-4 py-2 font-semibold text-icm-text">{s.name}</td>
                  <td className="px-4 py-2 text-icm-text-dim">{s.frequency}</td>
                  <td className="px-4 py-2 font-mono text-icm-text-dim">{s.nextRun}</td>
                  <td className="px-4 py-2 text-icm-text-dim">{s.recipients.join(", ")}</td>
                  <td className="px-4 py-2 text-icm-text-dim">{s.format}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${s.status === "Active" ? "bg-icm-green-soft text-icm-green ring-icm-green/20" : "bg-icm-bg text-icm-text-dim ring-icm-border"}`}
                    >
                      {s.status === "Active" ? (
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      ) : (
                        <PauseCircle className="w-2.5 h-2.5" />
                      )}
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AuditExportTab({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-manrope font-bold text-[15px] text-icm-text">System Audit Log</h2>
            <p className="text-[11.5px] text-icm-text-dim">
              Every record access, edit, approval, and export logged permanently.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/reports/audit-evidence")}
              className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[11px] font-semibold text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1.5"
            >
              <Shield className="w-3 h-3" />
              Open Audit Evidence
            </button>
            {isAdmin && (
              <button className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[11px] font-semibold text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1.5">
                <Download className="w-3 h-3" />
                Export audit log
              </button>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Timestamp</th>
                <th className="text-left px-4 py-2 font-semibold">User</th>
                <th className="text-left px-4 py-2 font-semibold">Action</th>
                <th className="text-left px-4 py-2 font-semibold">Module</th>
                <th className="text-left px-4 py-2 font-semibold">Record</th>
                <th className="text-left px-4 py-2 font-semibold">Individual</th>
                <th className="text-left px-4 py-2 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((e) => (
                <tr key={e.id} className="border-t border-icm-border">
                  <td className="px-4 py-2 font-mono text-icm-text-dim">{e.timestamp}</td>
                  <td className="px-4 py-2 text-icm-text">{e.user}</td>
                  <td className="px-4 py-2">
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-icm-bg text-icm-text-dim ring-1 ring-icm-border">
                      {e.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-icm-text-dim">{e.module}</td>
                  <td className="px-4 py-2 font-mono text-icm-text-dim">{e.record}</td>
                  <td className="px-4 py-2 text-icm-text-dim">{e.individual ?? "—"}</td>
                  <td className="px-4 py-2 text-icm-text-dim">{e.details ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-manrope font-bold text-[15px] text-icm-text mb-2">
          Bulk Data Export
        </h2>
        <p className="text-[11.5px] text-icm-text-dim mb-3">
          Export data for analytics, migration, or compliance requirements.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {exportPresets
            .filter((p) => !p.adminOnly || isAdmin)
            .map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-icm-border bg-icm-panel p-4 flex flex-col gap-2"
              >
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-lg bg-icm-bg border border-icm-border flex items-center justify-center text-icm-text-dim">
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-manrope font-bold text-[13px] text-icm-text">{p.name}</h3>
                    <p className="text-[11.5px] text-icm-text-dim mt-0.5">{p.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex gap-1">
                    {p.formats.map((f) => (
                      <span
                        key={f}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-icm-bg text-icm-text-dim ring-1 ring-icm-border"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <button className="h-7 px-2.5 rounded-lg bg-icm-text text-icm-panel text-[11px] font-semibold hover:opacity-90">
                    Export →
                  </button>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section>
        <h2 className="font-manrope font-bold text-[15px] text-icm-text mb-2">
          Business Intelligence Integration
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: "Power BI", desc: "Connect CaseManagement.AI data to Microsoft Power BI", status: "Not connected", cta: "Configure →" },
            { name: "Tableau", desc: "Export data in Tableau-compatible format", status: "Available", cta: "Learn more →" },
            { name: "Google Looker Studio", desc: "Connect via Google Sheets export", status: "Available", cta: "Learn more →" },
            { name: "Custom Data Warehouse", desc: "REST API or scheduled CSV to your own data warehouse", status: "Available", cta: "View API docs →" },
          ].map((c) => (
            <div
              key={c.name}
              className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-icm-bg border border-icm-border flex items-center justify-center text-icm-text-dim">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-manrope font-bold text-[13px] text-icm-text">{c.name}</p>
                <p className="text-[11px] text-icm-text-dim">{c.desc}</p>
                <p className="text-[10.5px] text-icm-text-faint mt-0.5">Status: {c.status}</p>
              </div>
              <button className="h-8 px-2.5 rounded-lg border border-icm-border text-[11px] font-semibold text-icm-text-dim hover:text-icm-text">
                {c.cta}
              </button>
            </div>
          ))}
        </div>
        <p className="text-[10.5px] text-icm-text-faint mt-3 font-geist">
          All BI integrations export anonymized or role-filtered data based on the connecting user's permissions. PHI is never exported without explicit data sharing agreements.
        </p>
      </section>
    </div>
  );
}
