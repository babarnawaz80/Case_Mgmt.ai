import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import {
  Download,
  Printer,
  Save,
  Calendar,
  Sparkles,
  Loader2,
  Filter as FilterIcon,
  Layers,
} from "lucide-react";
import { getReport, getReportOutput, StatChip } from "@/data/reports";
import { BarChart, DonutChart, HBarChart, LineChart } from "@/components/reports/ReportCharts";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const toneClass: Record<string, string> = {
  green: "bg-icm-green-soft text-icm-green ring-icm-green/20",
  amber: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
  red: "bg-icm-red-soft text-icm-red ring-icm-red/20",
  blue: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
  neutral: "bg-icm-bg text-icm-text-dim ring-icm-border",
};

// A saved custom (AI) report loaded from Firestore
interface SavedReportDoc {
  name?: string;
  title?: string;
  description?: string;
  category?: string;
  prompt?: string;
  selectedFields?: string[];
  filters?: { fieldId: string; op: string; value: string }[];
  groupBy?: string;
  createdBy?: string;
  lastRun?: string;
  rows?: number;
}

export default function ReportRunner() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  // Static (standard/seeded) report lookup
  const staticReport = reportId ? getReport(reportId) : undefined;
  const staticOutput = reportId ? getReportOutput(reportId) : null;

  const [range, setRange] = useState("Last 30 days");

  // Firestore-backed custom report (loaded only when no static match)
  const [customReport, setCustomReport] = useState<SavedReportDoc | null>(null);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!reportId || staticReport) return; // static report wins
    let cancelled = false;
    setLoadingCustom(true);
    getDoc(doc(db, "reports", reportId))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          setCustomReport(snap.data() as SavedReportDoc);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        console.error("Failed to load report:", err);
        if (!cancelled) setNotFound(true);
      })
      .finally(() => { if (!cancelled) setLoadingCustom(false); });
    return () => { cancelled = true; };
  }, [reportId, staticReport]);

  // ── Static report rendering (unchanged behaviour) ──
  if (staticReport && staticOutput) {
    return <StaticReportView report={staticReport} output={staticOutput} range={range} setRange={setRange} navigate={navigate} />;
  }

  // ── Loading custom report ──
  if (loadingCustom) {
    return (
      <ICMShell title="Report" showAIPanel={false}>
        <div className="flex items-center gap-2 py-20 justify-center text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading report…</span>
        </div>
      </ICMShell>
    );
  }

  // ── Custom (AI) report rendering ──
  if (customReport) {
    return <CustomReportView report={customReport} navigate={navigate} />;
  }

  // ── Not found ──
  if (notFound || (!loadingCustom && !customReport)) {
    return (
      <ICMShell title="Report" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim py-20 text-center">
          Report not found.{" "}
          <button onClick={() => navigate("/reports")} className="text-icm-accent hover:underline">
            Back to Reports
          </button>
        </p>
      </ICMShell>
    );
  }

  return null;
}

// ─── Custom (Firestore AI) report view ──────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  "participant.id": "Participant ID",
  "participant.name": "Participant Name",
  "participant.state": "State",
  "participant.program": "Program",
  "participant.coordinator": "Assigned Coordinator",
  "participant.riskLevel": "Risk Level",
  "contact.lastMonthly": "Last Monthly Contact Date",
  "contact.daysSince": "Days Since Last Monthly Contact",
  "contact.overdue": "Monthly Contact Overdue (Y/N)",
  "visit.lastInHome": "Last Approved In-Home Visit",
  "visit.inHomeLast90": "Approved In-Home in Last 90d (Y/N)",
  "note.rejected30": "Rejected Notes in Last 30d (count)",
  "note.pendingReview": "Notes Pending Supervisor Review",
  "plan.expiryDate": "PCP Expiry Date",
  "assessment.nextDue": "Next Assessment Due",
  "billing.unbilledUnits": "Unbilled Signed Units",
};

function fieldLabel(id: string): string {
  return FIELD_LABELS[id] ?? id;
}

function CustomReportView({ report, navigate }: { report: SavedReportDoc; navigate: (p: string) => void }) {
  const name = report.name || report.title || "Custom Report";
  const fields = report.selectedFields ?? [];
  const filters = report.filters ?? [];

  function exportCsv() {
    const header = fields.map(fieldLabel).join(",");
    // No live rows persisted — export the report definition as a single descriptive row.
    const defRow = fields.map(() => "").join(",");
    const blob = new Blob([header + "\n" + defRow], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ICMShell title="Reports" showAIPanel={false}>
      <div className="space-y-5 max-w-[1200px]">
        <Breadcrumbs
          backTo="/reports"
          backLabel="Reports"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Reports", to: "/reports" },
            { label: name },
          ]}
        />

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] text-icm-text-faint font-geist uppercase tracking-wide font-semibold">
              {report.category || "Custom"} · AI Report
            </p>
            <h1 className="font-manrope text-[22px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              {name}
            </h1>
            {report.description && (
              <p className="text-[12.5px] text-icm-text-dim mt-1 font-geist max-w-[640px]">
                {report.description}
              </p>
            )}
            {report.createdBy && (
              <p className="text-[11px] text-icm-text-faint font-geist mt-1">
                Saved by {report.createdBy}{report.lastRun ? ` · ${report.lastRun}` : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={exportCsv} className="h-8 px-2.5 rounded-lg text-[11px] font-geist font-semibold inline-flex items-center gap-1.5 border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text">
              <Download className="w-3 h-3" /> CSV
            </button>
            <button onClick={() => window.print()} className="h-8 px-2.5 rounded-lg text-[11px] font-geist font-semibold inline-flex items-center gap-1.5 border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text">
              <Printer className="w-3 h-3" /> Print
            </button>
            <button onClick={() => navigate("/reports/builder")} className="h-8 px-2.5 rounded-lg text-[11px] font-geist font-semibold inline-flex items-center gap-1.5 bg-icm-text text-icm-panel hover:opacity-90">
              <Save className="w-3 h-3" /> Edit in Builder
            </button>
          </div>
        </div>

        {/* Original prompt */}
        {report.prompt && (
          <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft/60 p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-icm-accent" />
              <h3 className="font-manrope font-bold text-[12px] text-icm-text uppercase tracking-wide">Report request</h3>
            </div>
            <p className="text-[13px] font-geist text-icm-text leading-relaxed italic">"{report.prompt}"</p>
          </div>
        )}

        {/* Definition: fields + filters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Layers className="w-3.5 h-3.5 text-icm-text-dim" />
              <span className="text-[11.5px] font-semibold text-icm-text uppercase tracking-wide">
                Columns ({fields.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fields.length === 0 ? (
                <span className="text-[12px] text-icm-text-dim">No columns selected.</span>
              ) : fields.map((f) => (
                <span key={f} className="px-2 py-1 rounded-md bg-icm-bg text-[11.5px] text-icm-text ring-1 ring-icm-border">
                  {fieldLabel(f)}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <FilterIcon className="w-3.5 h-3.5 text-icm-text-dim" />
              <span className="text-[11.5px] font-semibold text-icm-text uppercase tracking-wide">
                Filters ({filters.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {filters.length === 0 ? (
                <span className="text-[12px] text-icm-text-dim">No filters — returns all rows.</span>
              ) : filters.map((flt, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[12px] font-geist">
                  <span className="font-semibold text-icm-text">{fieldLabel(flt.fieldId)}</span>
                  <span className="text-icm-text-dim">{flt.op}</span>
                  <span className="px-1.5 py-0.5 rounded bg-icm-accent-soft text-icm-accent text-[11px] font-mono">{flt.value || "—"}</span>
                </div>
              ))}
            </div>
            {report.groupBy && (
              <div className="mt-3 pt-3 border-t border-icm-border text-[11.5px] text-icm-text-dim">
                Grouped by <span className="font-semibold text-icm-text">{fieldLabel(report.groupBy)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-icm-border bg-icm-bg/40 p-4 text-[12px] text-icm-text-dim font-geist">
          This report's live data is pulled when exported or scheduled. Use{" "}
          <button onClick={() => navigate("/reports/builder")} className="text-icm-accent hover:underline font-semibold">
            Edit in Builder
          </button>{" "}
          to preview rows and adjust the definition.
        </div>
      </div>
    </ICMShell>
  );
}

// ─── Static (seeded) report view — original behaviour ───────────────────────

function StaticReportView({ report, output, range, setRange, navigate }: any) {
  const renderChart = () => {
    if (report.chartType === "donut") return <DonutChart data={output.chart} />;
    if (report.chartType === "hbar") return <HBarChart data={output.chart} />;
    if (report.chartType === "line") return <LineChart data={output.trend ?? []} />;
    if (report.chartType === "bar") return <BarChart data={output.chart} />;
    return null;
  };

  return (
    <ICMShell title="Reports" showAIPanel={false}>
      <div className="space-y-5 max-w-[1200px]">
        <Breadcrumbs
          backTo="/reports"
          backLabel="Reports"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Reports", to: "/reports" },
            { label: report.name },
          ]}
        />

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] text-icm-text-faint font-geist uppercase tracking-wide font-semibold">
              {report.category}
            </p>
            <h1 className="font-manrope text-[22px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              {report.name}
            </h1>
            <p className="text-[12.5px] text-icm-text-dim mt-1 font-geist max-w-[640px]">
              {report.description}
            </p>
            {report.lastRun && (
              <p className="text-[11px] text-icm-text-faint font-geist mt-1">
                Last run {report.lastRun}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <ActionButton icon={Download} label="CSV" />
            <ActionButton icon={Download} label="PDF" />
            <ActionButton icon={Printer} label="Print" />
            <ActionButton icon={Save} label="Save" />
            <ActionButton icon={Calendar} label="Schedule" primary />
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint">
            Filters
          </span>
          <div className="flex gap-1 flex-wrap">
            {["Today", "This week", "This month", "Last 30 days", "Last 90 days", "Last 12 months"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`h-7 px-2.5 rounded-full text-[11px] font-geist font-semibold ring-1 transition-colors ${range === r ? "bg-icm-accent text-white ring-icm-accent" : "bg-icm-bg text-icm-text-dim ring-icm-border hover:ring-icm-border-strong"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Stat chips */}
        <div className="flex flex-wrap gap-2">
          {output.stats.map((s: StatChip, i: number) => (
            <Stat key={i} stat={s} />
          ))}
        </div>

        {/* Chart + insight */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
            <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-3">
              {output.chartTitle}
            </h3>
            {renderChart()}
          </div>
          <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-icm-accent" />
              <h3 className="font-manrope font-bold text-[13px] text-icm-text">AI insight</h3>
            </div>
            <p className="text-[12px] font-geist text-icm-text leading-relaxed">
              {output.insight}
            </p>
          </div>
        </div>

        {/* Data table */}
        {output.rows.length > 0 && (
          <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
            <div className="px-4 py-2.5 border-b border-icm-border flex items-center justify-between">
              <h3 className="font-manrope font-bold text-[13px] text-icm-text">Detail data</h3>
              <span className="text-[11px] font-mono text-icm-text-faint">
                {output.rows.length} rows
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] font-geist">
                <thead className="bg-icm-bg text-icm-text-dim text-[11px] uppercase tracking-wide">
                  <tr>
                    {output.columns.map((c: any) => (
                      <th
                        key={c.key}
                        className={`px-4 py-2 font-semibold ${c.align === "right" ? "text-right" : "text-left"}`}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {output.rows.map((row: any, i: number) => (
                    <tr key={i} className="border-t border-icm-border hover:bg-icm-bg/50">
                      {output.columns.map((c: any) => (
                        <td
                          key={c.key}
                          className={`px-4 py-2 text-icm-text ${c.align === "right" ? "text-right font-mono" : ""}`}
                        >
                          {String(row[c.key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ICMShell>
  );
}

function Stat({ stat }: { stat: StatChip }) {
  return (
    <div
      className={`px-3 py-2 rounded-xl ring-1 min-w-[120px] ${toneClass[stat.tone]}`}
    >
      <p className="text-[10px] font-geist font-semibold uppercase tracking-wide opacity-80">
        {stat.label}
      </p>
      <p className="font-manrope font-extrabold text-[18px] leading-tight mt-0.5">
        {stat.value}
      </p>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  primary,
}: {
  icon: any;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      className={`h-8 px-2.5 rounded-lg text-[11px] font-geist font-semibold inline-flex items-center gap-1.5 ${primary ? "bg-icm-text text-icm-panel hover:opacity-90" : "border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text"}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}
