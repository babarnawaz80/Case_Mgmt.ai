import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import {
  AlertTriangle, ChevronLeft, ArrowUpRight, UserCog, CheckCircle2,
  MessageSquare, Search, Download, BarChart3, Users, ClipboardList,
  CalendarX, ShieldCheck, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  loadComplianceExceptions, saveComplianceExceptions,
  writeAudit, COORDINATORS, type ComplianceException,
} from "@/data/supervisor";
import { useAllIncidents } from "@/hooks/useIncidents";
import { useIndividuals } from "@/hooks/useIndividuals";
import { useTasks } from "@/hooks/useTasks";

type ActionKind = "escalate" | "reassign" | "note" | "resolve";

const SupervisorCompliance = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ComplianceException[]>([]);
  const [filter, setFilter] = useState<"All" | ComplianceException["type"]>("All");
  const [severity, setSeverity] = useState<"All" | ComplianceException["severity"]>("All");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionKind, setActionKind] = useState<ActionKind | null>(null);
  const [actionText, setActionText] = useState("");
  const [reassignTo, setReassignTo] = useState("");

  // ─── Real Firestore data ───────────────────────────────────────────────────
  const { individuals, loading: indLoading } = useIndividuals();
  const { incidents, loading: incLoading } = useAllIncidents();
  const { tasks, loading: tasksLoading } = useTasks();
  const metricsLoading = indLoading || incLoading || tasksLoading;

  // ─── Computed compliance metrics ───────────────────────────────────────────
  const metrics = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const todayStr = today.toISOString().split("T")[0];

    const activeIndividuals = individuals.filter((i) => i.enrollment_status === "active");
    const total = activeIndividuals.length;

    const visitedRecently = activeIndividuals.filter((i) => {
      if (!i.last_visit_date) return false;
      const lastVisit = new Date(i.last_visit_date);
      return lastVisit >= thirtyDaysAgo;
    }).length;

    const visitCompliancePct = total > 0 ? Math.round((visitedRecently / total) * 100) : 0;

    const docGaps = activeIndividuals.filter((i) => {
      if (!i.last_visit_date) return true; // never visited
      const lastVisit = new Date(i.last_visit_date);
      return lastVisit < thirtyDaysAgo;
    });

    const openIncidents = incidents.filter((i) => i.status === "open" || i.status === "in_review");
    const incidentsBySeverity = {
      critical: openIncidents.filter((i) => i.severity === "critical").length,
      major: openIncidents.filter((i) => i.severity === "major").length,
      minor: openIncidents.filter((i) => i.severity === "minor").length,
    };

    const overdueTasks = tasks.filter(
      (t) => t.status !== "completed" && t.dueDate < todayStr
    ).length;

    return {
      total,
      visitedRecently,
      visitCompliancePct,
      docGaps,
      openIncidentsTotal: openIncidents.length,
      incidentsBySeverity,
      overdueTasks,
    };
  }, [individuals, incidents, tasks]);

  // ─── Legacy compliance exceptions (from local storage) ────────────────────
  useEffect(() => { setItems(loadComplianceExceptions()); }, []);

  const filtered = useMemo(() => items.filter((i) =>
    (filter === "All" || i.type === filter) &&
    (severity === "All" || i.severity === severity) &&
    (!q || i.personName.toLowerCase().includes(q.toLowerCase()) || i.coordinator.toLowerCase().includes(q.toLowerCase()))
  ), [items, filter, severity, q]);

  const selected = items.find((i) => i.id === selectedId) || null;

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    items.forEach((i) => { byType[i.type] = (byType[i.type] || 0) + 1; });
    return {
      total: items.length,
      open: items.filter((i) => i.status === "Open").length,
      escalated: items.filter((i) => i.status === "Escalated").length,
      resolved: items.filter((i) => i.status === "Resolved").length,
      critical: items.filter((i) => i.severity === "Critical" && i.status !== "Resolved").length,
      byType,
    };
  }, [items]);

  const persist = (next: ComplianceException[]) => { setItems(next); saveComplianceExceptions(next); };

  const apply = () => {
    if (!selected || !actionKind) return;
    if ((actionKind === "escalate" || actionKind === "note" || actionKind === "resolve") && actionText.trim().length < 15) {
      toast.error("Comment is required (minimum 15 characters)."); return;
    }
    if (actionKind === "reassign" && !reassignTo) { toast.error("Select a coordinator."); return; }

    const ts = new Date().toISOString();
    const supervisor = "James O'Connor (Supervisor)";
    let action = "", patch: Partial<ComplianceException> = {};
    if (actionKind === "escalate")  { action = "Escalated to senior supervisor"; patch.status = "Escalated"; }
    if (actionKind === "reassign")  { action = `Reassigned from ${selected.coordinator} to ${reassignTo}`; patch.status = "Reassigned"; patch.coordinator = reassignTo; }
    if (actionKind === "note")      { action = "Supervisor note added"; }
    if (actionKind === "resolve")   { action = "Resolved"; patch.status = "Resolved"; }

    const detail = actionText.trim() || undefined;
    const next = items.map((i) => i.id === selected.id
      ? { ...i, ...patch, history: [...(i.history || []), { ts, action, by: supervisor, note: detail }] }
      : i
    );
    persist(next);
    writeAudit({ ts, action: `Compliance: ${action}`, entity: selected.id, personId: selected.personId, by: supervisor, detail });
    toast.success(`${action}.`);
    setActionKind(null); setActionText(""); setReassignTo("");
  };

  const exportCsv = () => {
    const header = "id,type,personName,coordinator,daysOpen,severity,status,detail\n";
    const rows = items.map((i) => [i.id, i.type, i.personName, i.coordinator, i.daysOpen, i.severity, i.status, `"${i.detail.replace(/"/g, '""')}"`].join(",")).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `compliance-exceptions-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    writeAudit({ ts: new Date().toISOString(), action: "Compliance report exported (CSV)", entity: "compliance-report", by: "James O'Connor", detail: `${items.length} rows` });
    toast.success("Report exported.");
  };

  const TYPES: ComplianceException["type"][] = ["Monthly contact missed", "Plan review overdue", "Assessment expiring", "Note pending too long", "Billing documentation incomplete", "High-risk participant lacks follow-up"];

  return (
    <ICMShell title="Compliance Exceptions" showAIPanel={false}>
      <div className="space-y-5">
        <button onClick={() => navigate("/supervisor")} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"><ChevronLeft className="w-3.5 h-3.5" /> Supervisor Dashboard</button>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[24px] font-extrabold text-icm-text inline-flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-icm-accent" /> Compliance Center</h1>
            <p className="text-[13px] text-icm-text-dim mt-1">Live metrics from Firestore · Exceptions managed below</p>
          </div>
          <button onClick={exportCsv} className="h-9 px-3 rounded-xl border border-icm-border bg-white text-[12px] inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export Exceptions (CSV)</button>
        </div>

        {/* ── Live Compliance Metrics ─────────────────────────────────── */}
        {metricsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-icm-border bg-icm-panel p-4 animate-pulse">
                <div className="h-7 w-12 bg-icm-border rounded mb-2" />
                <div className="h-3 w-24 bg-icm-border rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Visit compliance */}
              <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-icm-accent/10 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-icm-accent" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint">Visit Compliance</span>
                </div>
                <div className={`text-[28px] font-extrabold font-manrope tabular-nums leading-none ${metrics.visitCompliancePct >= 80 ? "text-icm-green" : metrics.visitCompliancePct >= 60 ? "text-icm-amber" : "text-icm-red"}`}>
                  {metrics.visitCompliancePct}%
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-icm-bg overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${metrics.visitCompliancePct >= 80 ? "bg-icm-green" : metrics.visitCompliancePct >= 60 ? "bg-icm-amber" : "bg-icm-red"}`}
                    style={{ width: `${metrics.visitCompliancePct}%` }}
                  />
                </div>
                <p className="text-[11px] text-icm-text-dim mt-1">{metrics.visitedRecently} of {metrics.total} visited in 30d</p>
              </div>

              {/* Open incidents by severity */}
              <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-icm-red/10 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-icm-red" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint">Open Incidents</span>
                </div>
                <div className="text-[28px] font-extrabold font-manrope tabular-nums leading-none text-icm-red">
                  {metrics.openIncidentsTotal}
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-700 font-semibold">
                    {metrics.incidentsBySeverity.critical} critical
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-orange-100 text-orange-700 font-semibold">
                    {metrics.incidentsBySeverity.major} major
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-icm-amber-soft text-icm-amber font-semibold">
                    {metrics.incidentsBySeverity.minor} minor
                  </span>
                </div>
              </div>

              {/* Overdue tasks */}
              <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-icm-amber/10 flex items-center justify-center">
                    <ClipboardList className="w-3.5 h-3.5 text-icm-amber" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint">Overdue Tasks</span>
                </div>
                <div className={`text-[28px] font-extrabold font-manrope tabular-nums leading-none ${metrics.overdueTasks === 0 ? "text-icm-green" : metrics.overdueTasks <= 5 ? "text-icm-amber" : "text-icm-red"}`}>
                  {metrics.overdueTasks}
                </div>
                <p className="text-[11px] text-icm-text-dim mt-2">Tasks past their due date</p>
              </div>

              {/* Documentation gaps */}
              <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
                    <CalendarX className="w-3.5 h-3.5 text-icm-red" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint">Doc Gaps</span>
                </div>
                <div className={`text-[28px] font-extrabold font-manrope tabular-nums leading-none ${metrics.docGaps.length === 0 ? "text-icm-green" : metrics.docGaps.length <= 3 ? "text-icm-amber" : "text-icm-red"}`}>
                  {metrics.docGaps.length}
                </div>
                <p className="text-[11px] text-icm-text-dim mt-2">No contact in 30+ days</p>
              </div>
            </div>

            {/* Documentation Gaps list */}
            {metrics.docGaps.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-3 flex items-center gap-2">
                  <CalendarX className="w-4 h-4 text-icm-red" />
                  Documentation Gaps — No contact in 30+ days ({metrics.docGaps.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {metrics.docGaps.slice(0, 12).map((ind) => {
                    const lastVisit = ind.last_visit_date
                      ? new Date(ind.last_visit_date)
                      : null;
                    const daysAgo = lastVisit
                      ? Math.floor((Date.now() - lastVisit.getTime()) / 86400000)
                      : null;
                    return (
                      <button
                        key={ind.id}
                        onClick={() => navigate(`/people/${ind.id}/echart`)}
                        className="flex items-center gap-2.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-left hover:bg-rose-50 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-icm-red/10 flex items-center justify-center text-[10px] font-bold text-icm-red shrink-0">
                          {ind.first_name[0]}{ind.last_name[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-semibold text-icm-text truncate">
                            {ind.last_name}, {ind.first_name}
                          </div>
                          <div className="text-[10.5px] text-icm-text-faint">
                            {daysAgo !== null ? `${daysAgo}d ago` : "Never visited"}
                            {ind.assigned_case_manager_name && ` · ${ind.assigned_case_manager_name}`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {metrics.docGaps.length > 12 && (
                    <div className="flex items-center px-3 py-2 text-[12px] text-icm-text-dim">
                      +{metrics.docGaps.length - 12} more…
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-icm-border" />
          <span className="text-[11px] font-semibold text-icm-text-faint uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Compliance Exceptions Queue
          </span>
          <div className="flex-1 h-px bg-icm-border" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Stat label="Total" value={stats.total} color="text-icm-text" />
          <Stat label="Open" value={stats.open} color="text-rose-700" />
          <Stat label="Escalated" value={stats.escalated} color="text-amber-700" />
          <Stat label="Critical (active)" value={stats.critical} color="text-rose-700" />
          <Stat label="Resolved" value={stats.resolved} color="text-emerald-700" />
        </div>

        {/* By-type breakdown */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
          <h3 className="font-manrope font-bold text-[14px] mb-2 inline-flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Exceptions by type</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {TYPES.map((t) => (
              <div key={t} className="flex items-center gap-2 text-[12px]">
                <div className="flex-1 truncate">{t}</div>
                <div className="w-24 h-1.5 rounded-full bg-icm-bg overflow-hidden"><div className="h-full bg-rose-500" style={{ width: `${Math.min(100, ((stats.byType[t] || 0) / Math.max(1, stats.total)) * 100)}%` }} /></div>
                <div className="tabular-nums font-mono text-[11.5px] w-6 text-right">{stats.byType[t] || 0}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-icm-border bg-white flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-icm-text-dim" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search person or coordinator" className="bg-transparent text-[13px] outline-none flex-1" />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="h-9 px-2 rounded-md border border-icm-border bg-white text-[12.5px]">
            <option>All</option>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as any)} className="h-9 px-2 rounded-md border border-icm-border bg-white text-[12.5px]">
            <option>All</option><option>Critical</option><option>High</option><option>Medium</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* List */}
          <div className="lg:col-span-3 rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
            <ul className="divide-y divide-icm-border max-h-[600px] overflow-auto">
              {filtered.length === 0 && <li className="p-6 text-[13px] text-icm-text-dim text-center">No exceptions in this view.</li>}
              {filtered.map((i) => (
                <li key={i.id}>
                  <button onClick={() => setSelectedId(i.id)} className={`w-full text-left p-3 hover:bg-icm-bg ${selectedId === i.id ? "bg-blue-50/50" : ""}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <SeverityDot s={i.severity} />
                      <span className="font-semibold text-[13px] text-icm-text truncate">{i.type}</span>
                      <span className={`ml-auto px-1.5 h-5 inline-flex items-center rounded text-[10.5px] ${i.status === "Open" ? "bg-rose-100 text-rose-700" : i.status === "Escalated" ? "bg-amber-100 text-amber-800" : i.status === "Resolved" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{i.status}</span>
                    </div>
                    <div className="text-[11.5px] text-icm-text-dim">{i.personName} · {i.coordinator} · {i.daysOpen}d open</div>
                    <div className="text-[11.5px] text-icm-text mt-0.5 truncate">{i.detail}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Detail */}
          <div className="lg:col-span-2 rounded-xl border border-icm-border bg-icm-panel p-4">
            {!selected ? <p className="text-[13px] text-icm-text-dim text-center py-10">Select an exception to take action.</p> : (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2"><SeverityDot s={selected.severity} /><span className="text-[11.5px] text-icm-text-dim">{selected.severity}</span></div>
                  <h3 className="font-manrope font-extrabold text-[15px] text-icm-text">{selected.type}</h3>
                  <p className="text-[12px] text-icm-text-dim">{selected.personName} · {selected.coordinator}</p>
                  <p className="text-[12.5px] text-icm-text mt-1">{selected.detail}</p>
                </div>

                {selected.status !== "Resolved" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setActionKind("escalate"); setActionText(""); }} className="h-10 rounded-xl bg-amber-600 text-white text-[12px] font-medium inline-flex items-center justify-center gap-1.5"><ArrowUpRight className="w-3.5 h-3.5" /> Escalate</button>
                    <button onClick={() => { setActionKind("reassign"); setReassignTo(""); }} className="h-10 rounded-xl border border-icm-border bg-white text-[12px] font-medium inline-flex items-center justify-center gap-1.5"><UserCog className="w-3.5 h-3.5" /> Reassign</button>
                    <button onClick={() => { setActionKind("note"); setActionText(""); }} className="h-10 rounded-xl border border-icm-border bg-white text-[12px] font-medium inline-flex items-center justify-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Add note</button>
                    <button onClick={() => { setActionKind("resolve"); setActionText(""); }} className="h-10 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium inline-flex items-center justify-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Resolve</button>
                  </div>
                )}

                <div className="border-t border-icm-border pt-3">
                  <h4 className="text-[12.5px] font-semibold text-icm-text mb-1.5">History &amp; audit trail</h4>
                  <ol className="space-y-1.5">
                    {(selected.history || []).map((h, i) => (
                      <li key={i} className="text-[11.5px] border-l-2 border-blue-300 pl-2">
                        <div className="font-semibold text-icm-text">{h.action}</div>
                        <div className="text-icm-text-dim">{h.by} · {new Date(h.ts).toLocaleString()}</div>
                        {h.note && <div className="italic text-icm-text-dim mt-0.5">"{h.note}"</div>}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {actionKind && selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setActionKind(null)}>
          <div className="bg-icm-panel rounded-2xl border border-icm-border max-w-md w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-manrope font-extrabold text-[15px] capitalize">{actionKind} — {selected.personName}</h3>
            {actionKind === "reassign" ? (
              <div>
                <label className="text-[11.5px] font-semibold block mb-1">Reassign to coordinator</label>
                <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} className="w-full h-10 rounded-md border border-icm-border bg-white px-2 text-[13px]">
                  <option value="">— Select —</option>
                  {COORDINATORS.filter((c) => c.name !== selected.coordinator).map((c) => <option key={c.id} value={c.name}>{c.name} ({c.capacityPct}% capacity)</option>)}
                </select>
                <p className="text-[11px] text-icm-text-dim mt-1">Coordinators above 100% capacity are not recommended.</p>
              </div>
            ) : (
              <div>
                <label className="text-[11.5px] font-semibold block mb-1">{actionKind === "resolve" ? "Resolution note" : actionKind === "escalate" ? "Escalation reason" : "Supervisor note"} (min 15 chars)</label>
                <textarea value={actionText} onChange={(e) => setActionText(e.target.value)} rows={4} className="w-full rounded-md border border-icm-border bg-white px-2 py-1.5 text-[13px]" />
                <div className="text-[10.5px] text-icm-text-dim mt-1">{actionText.trim().length} / 15</div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setActionKind(null)} className="h-9 px-3 rounded-md border border-icm-border text-[12.5px] bg-white">Cancel</button>
              <button onClick={apply} className="h-9 px-3 rounded-md bg-icm-text text-icm-panel text-[12.5px] font-medium">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </ICMShell>
  );
};

const Stat = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="rounded-xl border border-icm-border bg-icm-panel p-3">
    <div className={`text-[22px] font-extrabold tabular-nums ${color}`}>{value}</div>
    <div className="text-[11.5px] text-icm-text-dim">{label}</div>
  </div>
);

const SeverityDot = ({ s }: { s: ComplianceException["severity"] }) => (
  <span className={`w-2.5 h-2.5 rounded-full ${s === "Critical" ? "bg-rose-600" : s === "High" ? "bg-amber-500" : "bg-blue-500"}`} />
);

export default SupervisorCompliance;
