import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Sparkles,
  Wand2,
  Plus,
  Search,
  Clock,
  Download,
  Star,
  StarOff,
  ChevronRight,
  FileText,
  Shield,
  Users,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  ClipboardList,
  BookOpen,
  Filter,
  Play,
  Loader2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { cn } from "@/lib/utils";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SavedReport {
  id: string;
  name: string;
  description: string;
  category: string;
  lastRun: string;
  createdBy: string;
  format: string;
  starred: boolean;
  type: "ai" | "custom" | "standard";
  rows?: number;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SAVED_REPORTS: SavedReport[] = [
  {
    id: "r1",
    name: "Indiana – At-Risk Caseload Watchlist",
    description: "Participants with overdue monthly contact, no recent in-home visit, or rejected notes.",
    category: "Compliance",
    lastRun: "Today, 7:02 AM",
    createdBy: "Kathy Adams",
    format: "XLSX",
    starred: true,
    type: "ai",
    rows: 23,
  },
  {
    id: "r2",
    name: "Monthly Documentation Rate by Coordinator",
    description: "Progress note completion rates grouped by assigned coordinator for the past 30 days.",
    category: "Documentation",
    lastRun: "Yesterday",
    createdBy: "Jordan Reeves",
    format: "PDF",
    starred: true,
    type: "standard",
    rows: 45,
  },
  {
    id: "r3",
    name: "PCISP Expiration Calendar – Q2 2026",
    description: "Individuals whose Person-Centered ISP expires within the next 90 days.",
    category: "Plans",
    lastRun: "3 days ago",
    createdBy: "Andre Wilkins",
    format: "XLSX",
    starred: false,
    type: "ai",
    rows: 12,
  },
  {
    id: "r4",
    name: "Unbilled Signed Units – Current Month",
    description: "All signed service units not yet submitted for billing, grouped by service type.",
    category: "Billing",
    lastRun: "1 week ago",
    createdBy: "Priya Iyer",
    format: "XLSX",
    starred: false,
    type: "custom",
    rows: 67,
  },
  {
    id: "r5",
    name: "Open Incidents by Severity – Last 30 Days",
    description: "All open incident reports grouped by severity and type across the organization.",
    category: "Incidents",
    lastRun: "2 days ago",
    createdBy: "Kathy Adams",
    format: "PDF",
    starred: false,
    type: "standard",
    rows: 8,
  },
  {
    id: "r6",
    name: "Waiver Eligibility Verification Status",
    description: "Current MA eligibility verification status for all active waiver participants.",
    category: "Compliance",
    lastRun: "Today, 6:00 AM",
    createdBy: "System (Scheduled)",
    format: "CSV",
    starred: false,
    type: "standard",
    rows: 45,
  },
];

const STANDARD_REPORTS = [
  { id: "s1", name: "Caseload Overview", icon: Users, description: "All active individuals with risk scores, program, and coordinator.", category: "People" },
  { id: "s2", name: "Compliance Dashboard", icon: Shield, description: "Documentation rates, overdue assessments, and PCISP status.", category: "Compliance" },
  { id: "s3", name: "Billing Summary", icon: CreditCard, description: "Claims, unbilled units, and revenue by service type.", category: "Billing" },
  { id: "s4", name: "Incident Summary", icon: AlertTriangle, description: "All incidents by severity, type, and resolution status.", category: "Incidents" },
  { id: "s5", name: "Documentation Rate", icon: ClipboardList, description: "Note completion rates by coordinator and program.", category: "Documentation" },
  { id: "s6", name: "Plan Expiration Tracker", icon: BookOpen, description: "Upcoming PCP/ISP expirations for the next 90 days.", category: "Plans" },
  { id: "s7", name: "Workflow Status", icon: TrendingUp, description: "Open, overdue, and completed workflow tasks across the org.", category: "Operations" },
  { id: "s8", name: "IPMG Audit Evidence Packet", icon: FileText, description: "Full audit-ready export per §17.5.5 — includes coverage matrix and compliance run history.", category: "Audit" },
];

const CATEGORIES = ["All", "Compliance", "Documentation", "Billing", "Incidents", "Plans", "People", "Operations", "Audit"];

// ─── Export report types ───────────────────────────────────────────────────────
type ExportReportType = "progress_notes" | "incidents" | "tasks";

const EXPORT_TYPES: { value: ExportReportType; label: string }[] = [
  { value: "progress_notes", label: "Progress Notes" },
  { value: "incidents", label: "Incidents" },
  { value: "tasks", label: "Tasks" },
];

function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) {
    alert("No records found for the selected filters.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csvLines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ReportExportPanel() {
  const { userProfile } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const defaultStart = thirtyDaysAgo.toISOString().split("T")[0];

  const [reportType, setReportType] = useState<ExportReportType>("progress_notes");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(today);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    const orgId = userProfile?.organizationId;
    if (!orgId) return;
    if (!startDate || !endDate) {
      alert("Please select a date range.");
      return;
    }

    setGenerating(true);
    try {
      let rows: Record<string, unknown>[] = [];
      const endDateInclusive = endDate + "T23:59:59";

      if (reportType === "progress_notes") {
        let q;
        try {
          q = query(
            collection(db, "progress_notes"),
            where("organizationId", "==", orgId),
            where("progressDate", ">=", startDate),
            where("progressDate", "<=", endDate),
            orderBy("progressDate", "desc"),
          );
        } catch {
          q = query(
            collection(db, "progress_notes"),
            where("organizationId", "==", orgId),
            where("progressDate", ">=", startDate),
            where("progressDate", "<=", endDate),
          );
        }
        const snap = await getDocs(q);
        rows = snap.docs.map((d) => {
          const data = d.data() as Record<string, any>;
          return {
            id: d.id,
            individualId: data.individualId ?? "",
            authorName: data.authorName ?? "",
            progressDate: data.progressDate ?? "",
            activityType: data.activityType ?? "",
            contactType: data.contactType ?? "",
            startTime: data.startTime ?? "",
            endTime: data.endTime ?? "",
            isBillable: data.isBillable ? "Yes" : "No",
            status: data.status ?? "",
            purposeOfActivity: data.purposeOfActivity ?? "",
            additionalObservations: data.additionalObservations ?? "",
            nextSteps: data.nextSteps ?? "",
          };
        });
        downloadCsv(`progress_notes_${startDate}_${endDate}.csv`, rows);
      } else if (reportType === "incidents") {
        let q;
        try {
          q = query(
            collection(db, "incidents"),
            where("organizationId", "==", orgId),
            where("reportedAt", ">=", startDate),
            where("reportedAt", "<=", endDateInclusive),
            orderBy("reportedAt", "desc"),
          );
        } catch {
          q = query(
            collection(db, "incidents"),
            where("organizationId", "==", orgId),
            where("reportedAt", ">=", startDate),
            where("reportedAt", "<=", endDateInclusive),
          );
        }
        const snap = await getDocs(q);
        rows = snap.docs.map((d) => {
          const data = d.data() as Record<string, any>;
          return {
            id: d.id,
            individualId: data.individualId ?? "",
            type: data.type ?? "",
            severity: data.severity ?? "",
            status: data.status ?? "",
            reportedAt: data.reportedAt ?? "",
            reportedByName: data.reportedByName ?? data.reportedBy ?? "",
            description: data.description ?? "",
            closedAt: data.closedAt ?? "",
          };
        });
        downloadCsv(`incidents_${startDate}_${endDate}.csv`, rows);
      } else if (reportType === "tasks") {
        let q;
        try {
          q = query(
            collection(db, "tasks"),
            where("organizationId", "==", orgId),
            where("dueDate", ">=", startDate),
            where("dueDate", "<=", endDate),
            orderBy("dueDate", "asc"),
          );
        } catch {
          q = query(
            collection(db, "tasks"),
            where("organizationId", "==", orgId),
            where("dueDate", ">=", startDate),
            where("dueDate", "<=", endDate),
          );
        }
        const snap = await getDocs(q);
        rows = snap.docs.map((d) => {
          const data = d.data() as Record<string, any>;
          return {
            id: d.id,
            title: data.title ?? "",
            type: data.type ?? "",
            individualName: data.individualName ?? "",
            dueDate: data.dueDate ?? "",
            status: data.status ?? "",
            priority: data.priority ?? "",
            assignedTo: data.assignedTo ?? "",
          };
        });
        downloadCsv(`tasks_${startDate}_${endDate}.csv`, rows);
      }
    } catch (err) {
      console.error("[ReportExport] Error generating report:", err);
      alert("Error generating report. Check console for details.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-1 h-4 rounded-full bg-icm-accent" />
        <h3 className="font-manrope font-bold text-[13px] text-icm-text uppercase tracking-wider">
          Quick Export
        </h3>
        <span className="text-[11px] text-icm-text-faint font-geist ml-auto">CSV download</span>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wider">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ExportReportType)}
            className="h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12.5px] font-geist text-icm-text focus:outline-none focus:border-icm-accent"
          >
            {EXPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wider">From</label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12.5px] font-geist text-icm-text focus:outline-none focus:border-icm-accent"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wider">To</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12.5px] font-geist text-icm-text focus:outline-none focus:border-icm-accent"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="h-9 px-4 rounded-xl bg-icm-accent text-white text-[12.5px] font-geist font-semibold inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {generating ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
          ) : (
            <><Download className="w-3.5 h-3.5" /> Generate Report</>
          )}
        </button>
      </div>
      <p className="text-[10.5px] text-icm-text-faint font-geist mt-3">
        Exports a CSV of all {EXPORT_TYPES.find((t) => t.value === reportType)?.label.toLowerCase()} in the selected date range for your organization.
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const Reports = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [reports, setReports] = useState<SavedReport[]>(SAVED_REPORTS);
  const [activeTab, setActiveTab] = useState<"my" | "standard">("my");

  const toggleStar = (id: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, starred: !r.starred } : r))
    );
  };

  const filtered = reports.filter((r) => {
    if (category !== "All" && r.category !== category) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const starred = filtered.filter((r) => r.starred);
  const rest = filtered.filter((r) => !r.starred);

  const filteredStandard = STANDARD_REPORTS.filter((r) => {
    if (category !== "All" && r.category !== category) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <ICMShell title="Reports" showAIPanel={false}>
      <div className="space-y-6">
        <Breadcrumbs
          backTo="/dashboard"
          backLabel="Dashboard"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Reports" },
          ]}
        />

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em] flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-icm-accent" />
              Reports
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              Build custom reports with AI, run standard templates, or schedule automated exports.
            </p>
          </div>
        </div>

        {/* ── Create Report with AI — single full-width CTA ── */}
        <button
          onClick={() => navigate("/reports/builder")}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(230,90%,15%)] to-[hsl(250,80%,25%)] p-6 text-left hover:scale-[1.005] transition-transform shadow-lg w-full"
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-12 translate-x-12" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-8 -translate-x-6" />
          <div className="relative flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-manrope font-extrabold text-[18px] text-white leading-tight">
                Create Report with AI
              </p>
              <p className="text-[12.5px] text-white/70 mt-1 font-geist leading-relaxed">
                Describe what you need in plain language. AI translates it into fields, filters, and grouping instantly.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-white/80 text-[12px] font-geist font-semibold group-hover:text-white transition-colors shrink-0">
              Start building <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* ── Quick Export panel ── */}
        <ReportExportPanel />

        {/* ── Search + Category filter ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports…"
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-icm-border bg-icm-panel text-[12.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "h-8 px-3 rounded-lg text-[11.5px] font-geist font-medium transition-colors",
                  category === c
                    ? "bg-icm-accent text-white"
                    : "bg-icm-panel border border-icm-border text-icm-text-dim hover:border-icm-accent"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tabs: My Reports / Standard ── */}
        <div className="border-b border-icm-border flex gap-6">
          {(["my", "standard"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                "pb-2.5 text-[13px] font-geist font-semibold border-b-2 transition-colors",
                activeTab === t
                  ? "border-icm-accent text-icm-accent"
                  : "border-transparent text-icm-text-dim hover:text-icm-text"
              )}
            >
              {t === "my" ? "My Reports" : "Standard Reports"}
            </button>
          ))}
        </div>

        {/* ── My Reports tab ── */}
        {activeTab === "my" && (
          <div className="space-y-4">
            {filtered.length === 0 && (
              <div className="rounded-xl border border-icm-border bg-icm-panel p-12 text-center">
                <BarChart3 className="w-8 h-8 text-icm-text-faint mx-auto mb-3" />
                <p className="text-[13px] text-icm-text-dim font-geist">No reports match your search.</p>
                <button
                  onClick={() => navigate("/reports/builder")}
                  className="mt-3 h-8 px-4 rounded-xl bg-icm-accent text-white text-[12px] font-geist font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Create your first report
                </button>
              </div>
            )}

            {starred.length > 0 && (
              <div>
                <p className="text-[10.5px] font-mono uppercase tracking-wider text-icm-text-faint mb-2 flex items-center gap-1.5">
                  <Star className="w-3 h-3" /> Starred
                </p>
                <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden divide-y divide-icm-border/60">
                  {starred.map((r) => (
                    <ReportRow key={r.id} report={r} onToggleStar={toggleStar} onRun={() => navigate(`/reports/${r.id}`)} onEdit={() => navigate("/reports/builder")} />
                  ))}
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div>
                {starred.length > 0 && (
                  <p className="text-[10.5px] font-mono uppercase tracking-wider text-icm-text-faint mb-2">
                    All Reports
                  </p>
                )}
                <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden divide-y divide-icm-border/60">
                  {rest.map((r) => (
                    <ReportRow key={r.id} report={r} onToggleStar={toggleStar} onRun={() => navigate(`/reports/${r.id}`)} onEdit={() => navigate("/reports/builder")} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Standard Reports tab ── */}
        {activeTab === "standard" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredStandard.map((r) => (
              <button
                key={r.id}
                onClick={() => r.id === "s8" ? navigate("/reports/audit-evidence") : navigate(`/reports/${r.id}`)}
                className="group rounded-xl border border-icm-border bg-icm-panel p-4 text-left hover:border-icm-accent transition-colors flex items-start gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-icm-accent-soft flex items-center justify-center shrink-0">
                  <r.icon className="w-4.5 h-4.5 text-icm-accent" style={{ width: 18, height: 18 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-manrope font-bold text-[13px] text-icm-text">{r.name}</p>
                  <p className="text-[11.5px] text-icm-text-dim mt-0.5 font-geist leading-snug">{r.description}</p>
                  <span className="mt-1.5 inline-block text-[10px] font-mono uppercase tracking-wide bg-icm-bg border border-icm-border text-icm-text-faint px-1.5 py-0.5 rounded">
                    {r.category}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-icm-text-faint shrink-0 mt-1 group-hover:text-icm-accent transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    </ICMShell>
  );
};

// ─── Report row component ─────────────────────────────────────────────────────

function ReportRow({
  report,
  onToggleStar,
  onRun,
  onEdit,
}: {
  report: SavedReport;
  onToggleStar: (id: string) => void;
  onRun: () => void;
  onEdit: () => void;
}) {
  const TypeBadge = ({ type }: { type: SavedReport["type"] }) => {
    const map = {
      ai: { label: "AI", className: "bg-icm-accent-soft text-icm-accent" },
      custom: { label: "Custom", className: "bg-icm-bg text-icm-text-dim" },
      standard: { label: "Standard", className: "bg-icm-green-soft text-icm-green" },
    };
    const { label, className } = map[type];
    return (
      <span className={cn("text-[9.5px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded font-bold", className)}>
        {label}
      </span>
    );
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-icm-bg/40 group">
      <button
        onClick={(e) => { e.stopPropagation(); onToggleStar(report.id); }}
        className="text-icm-text-faint hover:text-icm-amber transition-colors shrink-0"
        title={report.starred ? "Unstar" : "Star"}
      >
        {report.starred
          ? <Star className="w-4 h-4 fill-icm-amber text-icm-amber" />
          : <StarOff className="w-4 h-4" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-semibold text-icm-text font-geist">{report.name}</p>
          <TypeBadge type={report.type} />
          <span className="text-[10px] font-mono uppercase tracking-wide text-icm-text-faint bg-icm-bg border border-icm-border px-1.5 py-0.5 rounded">
            {report.category}
          </span>
        </div>
        <p className="text-[11.5px] text-icm-text-dim mt-0.5 font-geist truncate">{report.description}</p>
        <div className="flex items-center gap-3 mt-0.5 text-[10.5px] text-icm-text-faint font-geist">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {report.lastRun}</span>
          {report.rows && <span>{report.rows} rows</span>}
          <span>{report.createdBy}</span>
          <span className="font-mono">{report.format}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onEdit}
          className="h-7 px-2.5 rounded-lg border border-icm-border bg-white text-[11px] font-geist font-medium text-icm-text-dim hover:text-icm-text flex items-center gap-1"
          title="Edit"
        >
          <Filter className="w-3 h-3" /> Edit
        </button>
        <button
          onClick={onRun}
          className="h-7 px-2.5 rounded-lg bg-icm-accent text-white text-[11px] font-geist font-semibold hover:opacity-90 flex items-center gap-1"
          title="Run report"
        >
          <Play className="w-3 h-3" /> Run
        </button>
        <button
          className="h-7 w-7 rounded-lg border border-icm-border bg-white text-icm-text-dim hover:text-icm-text flex items-center justify-center"
          title="Download last run"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default Reports;
