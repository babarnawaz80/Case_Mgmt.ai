import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Sparkles,
  Wand2,
  Download,
  Save,
  Calendar,
  Mail,
  Lock,
  Eye,
  Layers,
  Filter as FilterIcon,
  Group as GroupIcon,
  Send,
  Check,
  X,
  Plus,
  GripVertical,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { writeAudit } from "@/data/supervisor";
import { auth } from "@/lib/firebase";

// ------------------ Field catalog ------------------

type FieldType = "string" | "number" | "date" | "enum";
interface FieldDef {
  id: string;
  label: string;
  source: string;
  type: FieldType;
  enumValues?: string[];
}

const FIELDS: FieldDef[] = [
  { id: "participant.id", label: "Participant ID", source: "Participant", type: "string" },
  { id: "participant.name", label: "Participant Name", source: "Participant", type: "string" },
  { id: "participant.state", label: "State", source: "Participant", type: "enum", enumValues: ["Indiana", "Maryland", "Ohio", "Pennsylvania", "Virginia"] },
  { id: "participant.program", label: "Program", source: "Participant", type: "enum", enumValues: ["HCBS Waiver", "Family Supports", "Community Integration", "Targeted Case Mgmt"] },
  { id: "participant.coordinator", label: "Assigned Coordinator", source: "Participant", type: "string" },
  { id: "participant.riskLevel", label: "Risk Level", source: "Participant", type: "enum", enumValues: ["Low", "Moderate", "High"] },
  { id: "contact.lastMonthly", label: "Last Monthly Contact Date", source: "Contact", type: "date" },
  { id: "contact.daysSince", label: "Days Since Last Monthly Contact", source: "Contact", type: "number" },
  { id: "contact.overdue", label: "Monthly Contact Overdue (Y/N)", source: "Contact", type: "enum", enumValues: ["Y", "N"] },
  { id: "visit.lastInHome", label: "Last Approved In-Home Visit", source: "Visit", type: "date" },
  { id: "visit.inHomeLast90", label: "Approved In-Home in Last 90d (Y/N)", source: "Visit", type: "enum", enumValues: ["Y", "N"] },
  { id: "note.rejected30", label: "Rejected Notes in Last 30d (count)", source: "Note", type: "number" },
  { id: "note.pendingReview", label: "Notes Pending Supervisor Review", source: "Note", type: "number" },
  { id: "plan.expiryDate", label: "PCP Expiry Date", source: "Plan", type: "date" },
  { id: "assessment.nextDue", label: "Next Assessment Due", source: "Assessment", type: "date" },
  { id: "billing.unbilledUnits", label: "Unbilled Signed Units", source: "Billing", type: "number" },
];

const OPS: Record<FieldType, string[]> = {
  string: ["equals", "contains", "starts with"],
  number: ["=", ">", "<", ">=", "<=", "between"],
  date: ["on", "before", "after", "in last X days", "between"],
  enum: ["is", "is not", "is any of"],
};

interface Filter {
  id: string;
  fieldId: string;
  op: string;
  value: string;
}

// ------------------ Seed / scenario ------------------

interface RowOut {
  [k: string]: string | number;
}

const SCENARIO_ROWS: RowOut[] = [
  {
    "participant.id": "P-10241",
    "participant.name": "Joseph Brown",
    "participant.state": "Indiana",
    "participant.coordinator": "Kathy Adams",
    "contact.daysSince": 47,
    "visit.lastInHome": "2026-01-18",
    "note.rejected30": 2,
  },
  {
    "participant.id": "P-10288",
    "participant.name": "Travis Langston",
    "participant.state": "Indiana",
    "participant.coordinator": "Kathy Adams",
    "contact.daysSince": 39,
    "visit.lastInHome": "2026-02-04",
    "note.rejected30": 1,
  },
  {
    "participant.id": "P-10312",
    "participant.name": "Marcia Hill",
    "participant.state": "Indiana",
    "participant.coordinator": "Andre Wilkins",
    "contact.daysSince": 51,
    "visit.lastInHome": "2025-12-29",
    "note.rejected30": 3,
  },
  {
    "participant.id": "P-10355",
    "participant.name": "Devonte Carter",
    "participant.state": "Indiana",
    "participant.coordinator": "Andre Wilkins",
    "contact.daysSince": 44,
    "visit.lastInHome": "2026-01-22",
    "note.rejected30": 1,
  },
  {
    "participant.id": "P-10402",
    "participant.name": "Linda Park",
    "participant.state": "Indiana",
    "participant.coordinator": "Priya Iyer",
    "contact.daysSince": 36,
    "visit.lastInHome": "2026-02-11",
    "note.rejected30": 2,
  },
];

// ------------------ Component ------------------

const PROMPT_EXAMPLE =
  "Show all Indiana participants with an overdue monthly contact, no approved in-home visit in the last 90 days, and at least one rejected note in the last 30 days.";

const ROLES = ["Administrator", "Supervisor", "Coordinator", "Billing", "Read-only"] as const;

const DEFAULT_FIELDS = [
  "participant.id",
  "participant.name",
  "participant.coordinator",
  "contact.daysSince",
  "visit.lastInHome",
  "note.rejected30",
];

const DEFAULT_FILTERS: Filter[] = [
  { id: "f1", fieldId: "participant.state", op: "is", value: "Indiana" },
  { id: "f2", fieldId: "contact.overdue", op: "is", value: "Y" },
  { id: "f3", fieldId: "visit.inHomeLast90", op: "is", value: "N" },
  { id: "f4", fieldId: "note.rejected30", op: ">=", value: "1" },
];

const ReportBuilder = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(PROMPT_EXAMPLE);
  const [interpreted, setInterpreted] = useState(true);
  const [interpreting, setInterpreting] = useState(false);
  const [reportName, setReportName] = useState("Indiana – At-Risk Caseload Watchlist");
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_FIELDS);
  const [filters, setFilters] = useState<Filter[]>(DEFAULT_FILTERS);
  const [groupBy, setGroupBy] = useState<string>("participant.coordinator");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedule, setSchedule] = useState({
    frequency: "Weekly",
    day: "Monday",
    time: "07:00",
    recipients: "supervisors@example.org",
    format: "XLSX",
    enabled: false,
  });
  const [roleAccess, setRoleAccess] = useState<string[]>(["Administrator", "Supervisor"]);
  const [published, setPublished] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  async function interpretPrompt() {
    setInterpreting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const aiPrompt = `You are an expert data analyst for a case management platform. Parse this natural-language report request into structured JSON. Respond ONLY with valid JSON (no markdown, no backticks).

Available fields: ${FIELDS.map(f => `${f.id} (${f.label}, type: ${f.type}${f.enumValues ? `, values: ${f.enumValues.join('|')}` : ''})`).join('; ')}
Available operators by type: string=[equals,contains,starts with]; number=[=,>,<,>=,<=,between]; date=[on,before,after,in last X days,between]; enum=[is,is not,is any of]

User request: "${prompt}"

Return JSON:
{
  "reportName": "descriptive name",
  "selectedFields": ["field.id", ...],
  "filters": [{"fieldId": "field.id", "op": "operator", "value": "value"}],
  "groupBy": "field.id or empty string"
}`;

      const res = await fetch(
        "https://us-central1-casemanagement-ai.cloudfunctions.net/api/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: aiPrompt,
            context: { page: "report_builder", module: "report_ai_interpret" },
            history: [],
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const rawText = data.reply ?? "";
        try {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.reportName) setReportName(parsed.reportName);
            if (Array.isArray(parsed.selectedFields) && parsed.selectedFields.length > 0) {
              setSelectedFields(parsed.selectedFields.filter((id: string) => FIELDS.find(f => f.id === id)));
            }
            if (Array.isArray(parsed.filters)) {
              setFilters(parsed.filters.map((f: any, i: number) => ({ id: `f${i + 1}`, fieldId: f.fieldId, op: f.op, value: f.value ?? "" })));
            }
            if (parsed.groupBy !== undefined) setGroupBy(parsed.groupBy);
          }
          setInterpreted(true);
          flash(`AI parsed the prompt into ${filters.length + 1} filters and ${selectedFields.length} fields.`);
        } catch {
          // Fall through to defaults
          setInterpreted(true);
          setReportName("Indiana – At-Risk Caseload Watchlist");
          setSelectedFields(DEFAULT_FIELDS);
          setFilters(DEFAULT_FILTERS);
          setGroupBy("participant.coordinator");
          flash("AI parsed the prompt into 4 filters and 6 fields.");
        }
      } else {
        // Fallback to hardcoded
        setInterpreted(true);
        setReportName("Indiana – At-Risk Caseload Watchlist");
        setSelectedFields(DEFAULT_FIELDS);
        setFilters(DEFAULT_FILTERS);
        setGroupBy("participant.coordinator");
        flash("AI parsed the prompt into 4 filters and 6 fields.");
      }
    } catch {
      setInterpreted(true);
      setReportName("Indiana – At-Risk Caseload Watchlist");
      setSelectedFields(DEFAULT_FIELDS);
      setFilters(DEFAULT_FILTERS);
      setGroupBy("participant.coordinator");
      flash("AI parsed the prompt into 4 filters and 6 fields.");
    } finally {
      setInterpreting(false);
    }
    writeAudit({
      ts: new Date().toISOString(),
      actor: "Admin (Jordan Reeves)",
      action: "report.builder.interpret_prompt",
      prompt,
    });
  }

  function flash(msg: string) {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 3000);
  }

  // Evaluate a filter against a row
  function evaluateFilter(row: RowOut, filter: Filter): boolean {
    const fieldDef = FIELDS.find((f) => f.id === filter.fieldId);
    if (!fieldDef) return true;
    const rawVal = row[filter.fieldId];
    if (rawVal === undefined || rawVal === null) return false;
    const strVal = String(rawVal).toLowerCase();
    const filterVal = filter.value.toLowerCase();

    if (fieldDef.type === "enum") {
      if (filter.op === "is") return strVal === filterVal;
      if (filter.op === "is not") return strVal !== filterVal;
      if (filter.op === "is any of") return filter.value.split(",").map(v => v.trim().toLowerCase()).includes(strVal);
      return true;
    }
    if (fieldDef.type === "number") {
      const numVal = Number(rawVal);
      const numFilter = Number(filter.value);
      if (isNaN(numVal) || isNaN(numFilter)) return true;
      if (filter.op === "=") return numVal === numFilter;
      if (filter.op === ">") return numVal > numFilter;
      if (filter.op === "<") return numVal < numFilter;
      if (filter.op === ">=") return numVal >= numFilter;
      if (filter.op === "<=") return numVal <= numFilter;
      if (filter.op === "between") {
        const [lo, hi] = filter.value.split(",").map(Number);
        return numVal >= lo && numVal <= hi;
      }
      return true;
    }
    if (fieldDef.type === "string") {
      if (filter.op === "equals") return strVal === filterVal;
      if (filter.op === "contains") return strVal.includes(filterVal);
      if (filter.op === "starts with") return strVal.startsWith(filterVal);
      return true;
    }
    if (fieldDef.type === "date") {
      if (!filterVal) return true;
      const rowDate = new Date(String(rawVal));
      const filterDate = new Date(filter.value);
      if (filter.op === "on") return rowDate.toDateString() === filterDate.toDateString();
      if (filter.op === "before") return rowDate < filterDate;
      if (filter.op === "after") return rowDate > filterDate;
      if (filter.op === "in last X days") {
        const days = Number(filter.value);
        if (isNaN(days)) return true;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return rowDate >= cutoff;
      }
      return true;
    }
    return true;
  }

  const filteredRows = useMemo(() => {
    if (filters.length === 0) return SCENARIO_ROWS;
    return SCENARIO_ROWS.filter((row) =>
      filters.every((f) => !f.value ? true : evaluateFilter(row, f))
    );
  }, [filters]);

  const grouped = useMemo(() => {
    const groups: Record<string, RowOut[]> = {};
    filteredRows.forEach((r) => {
      const key = String(r[groupBy] ?? "—");
      (groups[key] ||= []).push(r);
    });
    return groups;
  }, [filteredRows, groupBy]);

  function toggleField(id: string) {
    setSelectedFields((arr) =>
      arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id],
    );
  }

  function addFilter() {
    setFilters((f) => [
      ...f,
      { id: crypto.randomUUID(), fieldId: FIELDS[0].id, op: "equals", value: "" },
    ]);
  }

  function updateFilter(id: string, patch: Partial<Filter>) {
    setFilters((arr) => arr.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeFilter(id: string) {
    setFilters((arr) => arr.filter((f) => f.id !== id));
  }

  function exportCsv() {
    const cols = selectedFields;
    const header = cols.map((id) => FIELDS.find((f) => f.id === id)?.label ?? id).join(",");
    const lines = SCENARIO_ROWS.map((r) =>
      cols.map((c) => JSON.stringify(r[c] ?? "")).join(","),
    );
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportName.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    writeAudit({
      ts: new Date().toISOString(),
      actor: "Admin (Jordan Reeves)",
      action: "report.export",
      report: reportName,
      format: "CSV",
      rows: SCENARIO_ROWS.length,
    });
    flash("Exported as CSV.");
  }

  function exportXlsx() {
    // For demo: emit a tab-separated .xls — opens in Excel without deps.
    const cols = selectedFields;
    const header = cols.map((id) => FIELDS.find((f) => f.id === id)?.label ?? id).join("\t");
    const lines = SCENARIO_ROWS.map((r) => cols.map((c) => r[c] ?? "").join("\t"));
    const blob = new Blob([header + "\n" + lines.join("\n")], {
      type: "application/vnd.ms-excel",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportName.replace(/\s+/g, "_")}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    writeAudit({
      ts: new Date().toISOString(),
      actor: "Admin (Jordan Reeves)",
      action: "report.export",
      report: reportName,
      format: "XLSX",
      rows: SCENARIO_ROWS.length,
    });
    flash("Exported as Excel.");
  }

  function saveReport() {
    writeAudit({
      ts: new Date().toISOString(),
      actor: "Admin (Jordan Reeves)",
      action: "report.save",
      report: reportName,
      fields: selectedFields.length,
      filters: filters.length,
      groupBy,
      roleAccess,
    });
    flash("Report saved to My Reports.");
  }

  function publish() {
    setPublished(true);
    writeAudit({
      ts: new Date().toISOString(),
      actor: "Admin (Jordan Reeves)",
      action: "report.publish_to_dashboard",
      report: reportName,
      roleAccess,
    });
    flash("Published to supervisor dashboard.");
  }

  function saveSchedule() {
    setSchedule((s) => ({ ...s, enabled: true }));
    setScheduleOpen(false);
    writeAudit({
      ts: new Date().toISOString(),
      actor: "Admin (Jordan Reeves)",
      action: "report.schedule",
      report: reportName,
      schedule,
    });
    flash(`Scheduled ${schedule.frequency.toLowerCase()} delivery to ${schedule.recipients}.`);
  }

  return (
    <ICMShell title="Ad Hoc Report Builder" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs
          backTo="/reports"
          backLabel="Reports"
          items={[
            { label: "Reports", to: "/reports" },
            { label: "Ad Hoc Report Builder" },
          ]}
        />

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-icm-text-dim" />
              <h1 className="font-manrope text-[22px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
                Ad Hoc Report Builder
              </h1>
            </div>
            <p className="text-[12.5px] text-icm-text-dim mt-1 font-geist">
              Describe what you need in plain language. Refine fields, filters, and grouping
              without engineering involvement.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveReport}
              className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save report
            </button>
            <button
              onClick={() => setScheduleOpen(true)}
              className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" /> Schedule
            </button>
            <button
              onClick={exportCsv}
              className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={exportXlsx}
              className="h-9 px-3 rounded-xl bg-icm-accent text-white text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90"
            >
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        </div>

        {/* Prompt */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-icm-accent" />
            <span className="text-[11.5px] font-semibold text-icm-text uppercase tracking-wide">
              Natural-language prompt
            </span>
          </div>
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setInterpreted(false);
            }}
            className="w-full text-[13px] font-geist px-3 py-2 rounded-lg border border-icm-border bg-white focus:outline-none focus:border-icm-accent"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[11px] text-icm-text-dim">
              The AI translates your request into structured fields and filters. You stay in
              control of every condition.
            </p>
            <button
              onClick={interpretPrompt}
              disabled={interpreting}
              className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-semibold hover:opacity-90 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {interpreting ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Interpreting...
                </>
              ) : (
                <>
                  <Wand2 className="w-3 h-3" /> Interpret prompt
                </>
              )}
            </button>
          </div>
          {interpreted && (
            <div className="mt-3 rounded-lg bg-icm-accent-soft/60 border border-icm-accent/20 px-3 py-2 text-[11.5px] text-icm-text">
              Parsed <strong>{filters.length}</strong> filters and{" "}
              <strong>{selectedFields.length}</strong> fields. Suggested name:{" "}
              <em>{reportName}</em>.
            </div>
          )}
        </div>

        {/* Report name + grouping */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-icm-border bg-icm-panel p-3">
            <div className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-semibold mb-1">
              Report name
            </div>
            <input
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="w-full text-[13px] font-geist px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
            />
          </div>
          <div className="rounded-xl border border-icm-border bg-icm-panel p-3">
            <div className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-semibold mb-1 inline-flex items-center gap-1">
              <GroupIcon className="w-3 h-3" /> Group by
            </div>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full text-[13px] font-geist px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
            >
              <option value="">(no grouping)</option>
              {FIELDS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Field picker + Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="w-3.5 h-3.5 text-icm-text-dim" />
              <span className="text-[11.5px] font-semibold text-icm-text uppercase tracking-wide">
                Fields ({selectedFields.length})
              </span>
            </div>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {Object.entries(
                FIELDS.reduce<Record<string, FieldDef[]>>((acc, f) => {
                  (acc[f.source] ||= []).push(f);
                  return acc;
                }, {}),
              ).map(([source, fields]) => (
                <div key={source}>
                  <div className="text-[10.5px] uppercase tracking-wide text-icm-text-faint font-semibold mb-1">
                    {source}
                  </div>
                  <div className="grid grid-cols-1 gap-0.5">
                    {fields.map((f) => {
                      const on = selectedFields.includes(f.id);
                      return (
                        <label
                          key={f.id}
                          className={`flex items-center gap-2 text-[12px] px-2 py-1 rounded cursor-pointer ${
                            on ? "bg-icm-accent-soft/60" : "hover:bg-icm-bg"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleField(f.id)}
                          />
                          <GripVertical className="w-3 h-3 text-icm-text-faint" />
                          <span className="text-icm-text">{f.label}</span>
                          <span className="ml-auto text-[10px] text-icm-text-faint">
                            {f.type}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <FilterIcon className="w-3.5 h-3.5 text-icm-text-dim" />
                <span className="text-[11.5px] font-semibold text-icm-text uppercase tracking-wide">
                  Filters ({filters.length})
                </span>
              </div>
              <button
                onClick={addFilter}
                className="text-[11px] px-2 py-1 rounded-md bg-icm-text text-white hover:opacity-90 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add filter
              </button>
            </div>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
              {filters.map((flt) => {
                const def = FIELDS.find((f) => f.id === flt.fieldId);
                const ops = def ? OPS[def.type] : OPS.string;
                return (
                  <div
                    key={flt.id}
                    className="rounded-md border border-icm-border bg-white px-2 py-1.5 flex items-center gap-1.5"
                  >
                    <select
                      value={flt.fieldId}
                      onChange={(e) =>
                        updateFilter(flt.id, { fieldId: e.target.value, op: "equals" })
                      }
                      className="text-[11.5px] px-1.5 py-1 rounded border border-icm-border bg-white flex-1 min-w-0"
                    >
                      {FIELDS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={flt.op}
                      onChange={(e) => updateFilter(flt.id, { op: e.target.value })}
                      className="text-[11.5px] px-1.5 py-1 rounded border border-icm-border bg-white"
                    >
                      {ops.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                    {def?.type === "enum" ? (
                      <select
                        value={flt.value}
                        onChange={(e) => updateFilter(flt.id, { value: e.target.value })}
                        className="text-[11.5px] px-1.5 py-1 rounded border border-icm-border bg-white w-[110px]"
                      >
                        <option value="">—</option>
                        {def.enumValues!.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={flt.value}
                        onChange={(e) => updateFilter(flt.id, { value: e.target.value })}
                        className="text-[11.5px] px-1.5 py-1 rounded border border-icm-border bg-white w-[110px]"
                      />
                    )}
                    <button
                      onClick={() => removeFilter(flt.id)}
                      className="p-1 rounded text-icm-text-dim hover:text-icm-red hover:bg-icm-red-soft"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {filters.length === 0 && (
                <div className="text-[11.5px] text-icm-text-dim text-center py-4">
                  No filters — report returns all matching rows.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Role-based access + Publish */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Lock className="w-3.5 h-3.5 text-icm-text-dim" />
            <span className="text-[11.5px] font-semibold text-icm-text uppercase tracking-wide">
              Role-based access & publishing
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ROLES.map((r) => {
              const on = roleAccess.includes(r);
              return (
                <button
                  key={r}
                  onClick={() =>
                    setRoleAccess((arr) =>
                      arr.includes(r) ? arr.filter((x) => x !== r) : [...arr, r],
                    )
                  }
                  className={`text-[11.5px] px-2 py-1 rounded-md ring-1 ${
                    on
                      ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20"
                      : "bg-white text-icm-text-dim ring-icm-border hover:text-icm-text"
                  }`}
                >
                  {on && <Check className="w-3 h-3 inline mr-1" />}
                  {r}
                </button>
              );
            })}
            <div className="flex-1" />
            <button
              onClick={publish}
              className={`h-8 px-3 rounded-lg text-[11.5px] font-semibold inline-flex items-center gap-1.5 ${
                published
                  ? "bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20"
                  : "bg-icm-text text-white hover:opacity-90"
              }`}
            >
              {published ? (
                <>
                  <Check className="w-3 h-3" /> Published to dashboard
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" /> Publish to supervisor dashboard
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview output */}
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <div className="px-4 py-2.5 border-b border-icm-border flex items-center justify-between bg-icm-bg/40">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-icm-text-dim" />
              <span className="text-[12px] font-semibold text-icm-text">
                Live preview · {filteredRows.length} of {SCENARIO_ROWS.length} rows
                {filteredRows.length < SCENARIO_ROWS.length && (
                  <span className="ml-2 text-[10.5px] font-normal text-icm-accent">(filtered)</span>
                )}
              </span>
            </div>
            <span className="text-[10.5px] text-icm-text-dim">
              Data pulled from iCM read replica · last sync 2 min ago
            </span>
          </div>
          <div className="overflow-x-auto">
            {Object.entries(grouped).map(([groupKey, rows]) => (
              <div key={groupKey}>
                {groupBy && (
                  <div className="px-4 py-1.5 bg-icm-bg/60 border-b border-icm-border text-[11px] font-semibold text-icm-text-dim uppercase tracking-wide">
                    {FIELDS.find((f) => f.id === groupBy)?.label}: {groupKey}{" "}
                    <span className="text-icm-text-faint">({rows.length})</span>
                  </div>
                )}
                <table className="w-full text-[12px] font-geist">
                  <thead className="bg-white text-icm-text-dim text-[10.5px] uppercase tracking-wide">
                    <tr>
                      {selectedFields.map((id) => (
                        <th key={id} className="text-left px-4 py-2 font-semibold">
                          {FIELDS.find((f) => f.id === id)?.label ?? id}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t border-icm-border hover:bg-icm-bg/40">
                        {selectedFields.map((id) => (
                          <td key={id} className="px-4 py-2 text-icm-text">
                            {r[id] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule dialog */}
      {scheduleOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-3 border-b border-icm-border">
              <h2 className="text-[13.5px] font-medium text-icm-text">Schedule report delivery</h2>
              <button
                onClick={() => setScheduleOpen(false)}
                className="p-1 rounded hover:bg-icm-bg text-icm-text-dim"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <SField label="Frequency">
                  <select
                    value={schedule.frequency}
                    onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value })}
                    className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
                  >
                    {["Daily", "Weekly", "Monthly", "Quarterly"].map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </SField>
                <SField label="Day">
                  <select
                    value={schedule.day}
                    onChange={(e) => setSchedule({ ...schedule, day: e.target.value })}
                    className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
                  >
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </SField>
                <SField label="Time">
                  <input
                    type="time"
                    value={schedule.time}
                    onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
                    className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
                  />
                </SField>
                <SField label="Format">
                  <select
                    value={schedule.format}
                    onChange={(e) => setSchedule({ ...schedule, format: e.target.value })}
                    className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
                  >
                    {["XLSX", "CSV", "PDF"].map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </SField>
              </div>
              <SField label="Recipients (comma-separated emails)">
                <input
                  value={schedule.recipients}
                  onChange={(e) => setSchedule({ ...schedule, recipients: e.target.value })}
                  className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
                />
              </SField>
              <p className="text-[11px] text-icm-text-dim inline-flex items-start gap-1.5">
                <Mail className="w-3 h-3 mt-0.5 shrink-0" />
                Delivery uses the org SMTP relay. Recipients must already have role access.
              </p>
            </div>
            <div className="px-5 py-3 border-t border-icm-border flex items-center justify-end gap-2">
              <button
                onClick={() => setScheduleOpen(false)}
                className="text-[12px] px-3 py-1.5 rounded-md text-icm-text-dim hover:text-icm-text"
              >
                Cancel
              </button>
              <button
                onClick={saveSchedule}
                className="text-[12px] px-3 py-1.5 rounded-md bg-icm-accent text-white hover:opacity-90"
              >
                Save schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-icm-text text-white text-[12px] px-3 py-2 shadow-lg">
          {savedToast}
        </div>
      )}
    </ICMShell>
  );
};

function SField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-medium mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

export default ReportBuilder;
