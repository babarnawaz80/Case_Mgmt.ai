import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import {
  ChevronLeft,
  Download,
  Printer,
  Save,
  Calendar,
  Sparkles,
} from "lucide-react";
import { getReport, getReportOutput, StatChip } from "@/data/reports";
import { BarChart, DonutChart, HBarChart, LineChart } from "@/components/reports/ReportCharts";

const toneClass: Record<string, string> = {
  green: "bg-icm-green-soft text-icm-green ring-icm-green/20",
  amber: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
  red: "bg-icm-red-soft text-icm-red ring-icm-red/20",
  blue: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
  neutral: "bg-icm-bg text-icm-text-dim ring-icm-border",
};

export default function ReportRunner() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const report = reportId ? getReport(reportId) : undefined;
  const output = reportId ? getReportOutput(reportId) : null;
  const [range, setRange] = useState("Last 30 days");

  if (!report || !output) {
    return (
      <ICMShell title="Report" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim">
          Report not found.{" "}
          <button onClick={() => navigate("/dashboard/reports")} className="text-icm-accent hover:underline">
            Back to Reports
          </button>
        </p>
      </ICMShell>
    );
  }

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
        <button
          onClick={() => navigate("/dashboard/reports")}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Reports
        </button>

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
                Last run {report.lastRun} by Kathy Adams
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
          <div className="ml-auto flex items-center gap-2">
            <button className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-semibold hover:opacity-90">
              Run
            </button>
            <button className="text-[11px] text-icm-text-dim hover:text-icm-text">
              Reset filters
            </button>
          </div>
        </div>

        {/* Stat chips */}
        <div className="flex flex-wrap gap-2">
          {output.stats.map((s, i) => (
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
                    {output.columns.map((c) => (
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
                  {output.rows.map((row, i) => (
                    <tr key={i} className="border-t border-icm-border hover:bg-icm-bg/50">
                      {output.columns.map((c) => (
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
