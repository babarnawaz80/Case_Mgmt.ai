import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  Lock,
  Globe,
  Smartphone,
  Monitor,
  Clock,
  FileText,
  Sparkles,
  ArrowRight,
  Tag,
  Calendar,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";

type EvidenceType =
  | "record.create"
  | "assessment.complete"
  | "plan.approve"
  | "visit.note.create"
  | "supervisor.approve"
  | "note.amend"
  | "billing.export"
  | "communication.sent"
  | "communication.received"
  | "ai.action"
  | "report.export"
  | "report.access";

interface DiffField {
  field: string;
  before?: string | null;
  after?: string | null;
}

interface Evidence {
  id: string;
  ts: string;
  userId: string;
  userName: string;
  userRole: string;
  type: EvidenceType;
  module: string;
  recordId: string;
  recordLabel: string;
  personId?: string;
  personName?: string;
  ip: string;
  device: string;
  sessionId: string;
  details: string;
  diff?: DiffField[];
  legalHold?: boolean;
  aiAgent?: string;
}

const TYPE_LABEL: Record<EvidenceType, string> = {
  "record.create": "Record created",
  "assessment.complete": "Assessment completed",
  "plan.approve": "Plan approved",
  "visit.note.create": "Visit note created",
  "supervisor.approve": "Supervisor approved",
  "note.amend": "Note amended",
  "billing.export": "Billing export",
  "communication.sent": "Communication sent",
  "communication.received": "Communication received",
  "ai.action": "AI action",
  "report.export": "Report exported",
  "report.access": "Report accessed",
};

const TYPE_TONE: Record<EvidenceType, string> = {
  "record.create": "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
  "assessment.complete": "bg-icm-green-soft text-icm-green ring-icm-green/20",
  "plan.approve": "bg-icm-green-soft text-icm-green ring-icm-green/20",
  "visit.note.create": "bg-icm-bg text-icm-text ring-icm-border",
  "supervisor.approve": "bg-icm-green-soft text-icm-green ring-icm-green/20",
  "note.amend": "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
  "billing.export": "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
  "communication.sent": "bg-icm-bg text-icm-text ring-icm-border",
  "communication.received": "bg-icm-bg text-icm-text ring-icm-border",
  "ai.action": "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
  "report.export": "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
  "report.access": "bg-icm-bg text-icm-text-dim ring-icm-border",
};

const EVIDENCE: Evidence[] = [
  {
    id: "AE-2026-00721",
    ts: "2026-05-21 09:14:22 ET",
    userId: "U-0042",
    userName: "Sarah Chen, LCSW",
    userRole: "Support Coordinator",
    type: "visit.note.create",
    module: "Visit Documentation",
    recordId: "VN-2026-31044",
    recordLabel: "In-home visit note — 2026-05-21",
    personId: "P-10241",
    personName: "Joseph Brown",
    ip: "73.128.44.211",
    device: "iPhone 15 · iOS 18.4 · iCM Mobile 4.2.1",
    sessionId: "sess_8f1c2…",
    details: "Created on mobile · 4 billable units (T1016) · linked to plan goal G-1",
  },
  {
    id: "AE-2026-00722",
    ts: "2026-05-21 09:46:08 ET",
    userId: "U-0017",
    userName: "David Park",
    userRole: "Supervisor",
    type: "supervisor.approve",
    module: "Visit Documentation",
    recordId: "VN-2026-31044",
    recordLabel: "In-home visit note — 2026-05-21",
    personId: "P-10241",
    personName: "Joseph Brown",
    ip: "10.42.118.6",
    device: "MacBook Pro · Chrome 128 · Carroll County DDA network",
    sessionId: "sess_a44d9…",
    details: "Approved with comment: \"Clear narrative, units validated against authorization SA-887.\"",
    diff: [
      { field: "status", before: "Submitted", after: "Approved" },
      { field: "approvedBy", before: null, after: "David Park (U-0017)" },
      { field: "approvedAt", before: null, after: "2026-05-21 09:46:08 ET" },
    ],
  },
  {
    id: "AE-2026-00723",
    ts: "2026-05-21 10:12:53 ET",
    userId: "U-0042",
    userName: "Sarah Chen, LCSW",
    userRole: "Support Coordinator",
    type: "note.amend",
    module: "Visit Documentation",
    recordId: "VN-2026-31044",
    recordLabel: "In-home visit note — 2026-05-21",
    personId: "P-10241",
    personName: "Joseph Brown",
    ip: "10.42.118.42",
    device: "MacBook Air · Safari 18 · Carroll County DDA network",
    sessionId: "sess_b91f4…",
    details: "Amendment after approval — reason recorded.",
    diff: [
      {
        field: "narrative",
        before:
          "Met with Joseph at his apartment. Discussed weekend respite options with mom.",
        after:
          "Met with Joseph at his apartment. Discussed weekend respite options with mom. Confirmed Aunt Linda available 5/24–5/25.",
      },
      { field: "amendmentReason", before: null, after: "Adding clarifying detail per supervisor note" },
    ],
  },
  {
    id: "AE-2026-00712",
    ts: "2026-05-20 16:02:11 ET",
    userId: "U-0042",
    userName: "Sarah Chen, LCSW",
    userRole: "Support Coordinator",
    type: "assessment.complete",
    module: "Assessments",
    recordId: "AS-2026-08821",
    recordLabel: "Annual Functional Assessment v3",
    personId: "P-10241",
    personName: "Joseph Brown",
    ip: "73.128.44.211",
    device: "MacBook Air · Safari 18",
    sessionId: "sess_77a01…",
    details: "Score 62 · 2 risk flags raised · auto-task created for follow-up.",
    diff: [
      { field: "status", before: "Draft", after: "Complete" },
      { field: "score", before: null, after: "62" },
      { field: "riskFlags", before: "[]", after: "[\"falls\",\"medication adherence\"]" },
    ],
  },
  {
    id: "AE-2026-00715",
    ts: "2026-05-20 17:33:47 ET",
    userId: "U-0017",
    userName: "David Park",
    userRole: "Supervisor",
    type: "plan.approve",
    module: "Person-Centered Plan",
    recordId: "PCP-2026-441",
    recordLabel: "PCP v4 — effective 2026-06-01",
    personId: "P-10241",
    personName: "Joseph Brown",
    ip: "10.42.118.6",
    device: "MacBook Pro · Chrome 128",
    sessionId: "sess_a44d9…",
    details: "E-signed by supervisor and guardian via portal token.",
    diff: [
      { field: "status", before: "Pending approval", after: "Approved" },
      { field: "version", before: "3", after: "4" },
      { field: "effectiveFrom", before: "2025-06-01", after: "2026-06-01" },
    ],
    legalHold: true,
  },
  {
    id: "AE-2026-00688",
    ts: "2026-05-19 11:21:09 ET",
    userId: "U-SYS",
    userName: "Compliance Agent (Engine v12.3)",
    userRole: "AI Agent",
    type: "ai.action",
    module: "Guidelines Engine",
    recordId: "AR-2026-00099",
    recordLabel: "Auto-monitor draft on PCP-2026-441",
    personId: "P-10241",
    personName: "Joseph Brown",
    ip: "internal",
    device: "Engine runtime · k8s pod compliance-agent-7c4f",
    sessionId: "agent-run_19f2…",
    details:
      "Draft generated for supervisor review · 0 iCM writes (Review & Apply pending) · cited MD-DDA §10.22.11.06.",
    aiAgent: "Compliance Agent (Engine v12.3)",
  },
  {
    id: "AE-2026-00701",
    ts: "2026-05-20 08:00:02 ET",
    userId: "U-0029",
    userName: "Marcus Webb (Billing)",
    userRole: "Billing Specialist",
    type: "billing.export",
    module: "Billing",
    recordId: "EXP-2026-0520-001",
    recordLabel: "837P batch — week of 2026-05-12",
    ip: "10.42.118.51",
    device: "Windows 11 · Edge 128",
    sessionId: "sess_c12aa…",
    details: "412 service lines · $74,318.20 submitted to MD Medicaid clearinghouse.",
  },
  {
    id: "AE-2026-00665",
    ts: "2026-05-18 14:47:33 ET",
    userId: "U-0042",
    userName: "Sarah Chen, LCSW",
    userRole: "Support Coordinator",
    type: "communication.sent",
    module: "Messages",
    recordId: "MSG-2026-19844",
    recordLabel: "Email to Margaret Thompson (Guardian)",
    personId: "P-10241",
    personName: "Joseph Brown",
    ip: "73.128.44.211",
    device: "MacBook Air · Safari 18",
    sessionId: "sess_77a01…",
    details: "Subject: \"PCP review meeting reminder\" · ROI on file verified.",
  },
  {
    id: "AE-2026-00641",
    ts: "2026-05-17 19:02:18 ET",
    userId: "U-0042",
    userName: "Sarah Chen, LCSW",
    userRole: "Support Coordinator",
    type: "record.create",
    module: "People",
    recordId: "P-10455",
    recordLabel: "New participant intake — Diana Suarez",
    personId: "P-10455",
    personName: "Diana Suarez",
    ip: "73.128.44.211",
    device: "MacBook Air · Safari 18",
    sessionId: "sess_71e0c…",
    details: "Intake created from referral REF-2026-2202 · 12 required fields complete.",
  },
  {
    id: "AE-2026-00638",
    ts: "2026-05-17 13:15:00 ET",
    userId: "U-0042",
    userName: "Sarah Chen, LCSW",
    userRole: "Support Coordinator",
    type: "report.export",
    module: "Reports",
    recordId: "RPT-watchlist-indiana",
    recordLabel: "Indiana – At-Risk Caseload Watchlist (XLSX)",
    ip: "73.128.44.211",
    device: "MacBook Air · Safari 18",
    sessionId: "sess_71e0c…",
    details: "5 rows exported · file hash 0xa14f…be23 retained for 7 years.",
  },
  {
    id: "AE-2026-00611",
    ts: "2026-05-16 08:30:12 ET",
    userId: "U-0098",
    userName: "Priya Iyer",
    userRole: "Support Coordinator",
    type: "report.access",
    module: "Reports",
    recordId: "RPT-pcp-compliance",
    recordLabel: "PCP / ISP Compliance Dashboard",
    ip: "98.41.207.12",
    device: "iPad Air · iOS 18.4 · iCM Mobile 4.2.1",
    sessionId: "sess_44b7e…",
    details: "Viewed for caseload of 22 individuals.",
  },
];

const ALL_TYPES: EvidenceType[] = Object.keys(TYPE_LABEL) as EvidenceType[];

function deviceIcon(d: string) {
  if (/iphone|android|ipad|mobile/i.test(d)) return Smartphone;
  if (/internal|pod|runtime/i.test(d)) return Sparkles;
  return Monitor;
}

const AuditEvidence = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<EvidenceType | "All">("All");
  const [from, setFrom] = useState("2026-05-15");
  const [to, setTo] = useState("2026-05-22");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showLegalHoldOnly, setShowLegalHoldOnly] = useState(false);

  const filtered = useMemo(() => {
    return EVIDENCE.filter((e) => {
      if (typeFilter !== "All" && e.type !== typeFilter) return false;
      if (showLegalHoldOnly && !e.legalHold) return false;
      if (q) {
        const hay = `${e.userName} ${e.recordLabel} ${e.personName ?? ""} ${e.details} ${e.recordId} ${e.id}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      const d = e.ts.slice(0, 10);
      if (d < from || d > to) return false;
      return true;
    });
  }, [q, typeFilter, from, to, showLegalHoldOnly]);

  const counts = useMemo(() => {
    const c: Partial<Record<EvidenceType, number>> = {};
    filtered.forEach((e) => (c[e.type] = (c[e.type] || 0) + 1));
    return c;
  }, [filtered]);

  function toggle(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function exportCsv() {
    const rows = filtered.map((e) =>
      [
        e.id,
        e.ts,
        e.userId,
        e.userName,
        e.userRole,
        TYPE_LABEL[e.type],
        e.module,
        e.recordId,
        e.personId ?? "",
        e.personName ?? "",
        e.ip,
        e.device,
        e.sessionId,
        e.legalHold ? "Y" : "N",
        e.details.replace(/[\n,]/g, " "),
      ]
        .map((v) => JSON.stringify(v))
        .join(","),
    );
    const header =
      "evidence_id,timestamp,user_id,user_name,user_role,action,module,record_id,person_id,person_name,ip,device,session_id,legal_hold,details";
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-evidence-${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ICMShell title="Audit Evidence" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs
          backTo="/reports"
          backLabel="Reports"
          items={[
            { label: "Reports", to: "/reports" },
            { label: "Audit Evidence" },
          ]}
        />

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-icm-text-dim" />
              <h1 className="font-manrope text-[22px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
                Audit Evidence Retrieval
              </h1>
            </div>
            <p className="text-[12.5px] text-icm-text-dim mt-1 font-geist">
              Tamper-evident log of every record action, AI run, communication, and report
              access. Each entry includes user, device, before/after values, and retention status.
            </p>
          </div>
          <button
            onClick={exportCsv}
            className="h-9 px-3 rounded-xl bg-icm-accent text-white text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90"
          >
            <Download className="w-3.5 h-3.5" /> Export filtered ({filtered.length}) as CSV
          </button>
        </div>

        {/* Retention banner */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-3 flex flex-wrap items-center gap-4 text-[11.5px]">
          <div className="inline-flex items-center gap-1.5 text-icm-text">
            <Lock className="w-3.5 h-3.5 text-icm-text-dim" />
            <span className="font-semibold">Retention:</span>
            <span className="text-icm-text-dim">
              7 years (HIPAA + state Medicaid waiver) · write-once, append-only
            </span>
          </div>
          <span className="text-icm-text-faint">·</span>
          <div className="inline-flex items-center gap-1.5 text-icm-text">
            <Tag className="w-3.5 h-3.5 text-icm-text-dim" />
            <span className="font-semibold">Storage:</span>
            <span className="text-icm-text-dim">
              encrypted at rest (AES-256), hash-chained per day, off-site replicated
            </span>
          </div>
          <span className="text-icm-text-faint">·</span>
          <label className="inline-flex items-center gap-1.5 cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={showLegalHoldOnly}
              onChange={(e) => setShowLegalHoldOnly(e.target.checked)}
            />
            <span className="text-icm-text">Legal hold only</span>
          </label>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-icm-text-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search user, record, individual, evidence ID…"
                className="h-9 w-full pl-8 pr-3 rounded-lg border border-icm-border bg-white text-[12px]"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11.5px] text-icm-text-dim">
              <Calendar className="w-3.5 h-3.5" />
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 px-2 rounded-lg border border-icm-border bg-white text-[12px]"
              />
              <span>→</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 px-2 rounded-lg border border-icm-border bg-white text-[12px]"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setTypeFilter("All")}
              className={`text-[11px] px-2 py-1 rounded-md ring-1 ${
                typeFilter === "All"
                  ? "bg-icm-text text-white ring-icm-text"
                  : "bg-white text-icm-text-dim ring-icm-border hover:text-icm-text"
              }`}
            >
              All ({EVIDENCE.length})
            </button>
            {ALL_TYPES.map((t) =>
              counts[t] || typeFilter === t ? (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`text-[11px] px-2 py-1 rounded-md ring-1 ${
                    typeFilter === t
                      ? "bg-icm-text text-white ring-icm-text"
                      : `${TYPE_TONE[t]} hover:opacity-80`
                  }`}
                >
                  {TYPE_LABEL[t]} ({counts[t] ?? 0})
                </button>
              ) : null,
            )}
          </div>
        </div>

        {/* Evidence list */}
        <div className="space-y-2">
          {filtered.map((e) => {
            const isOpen = expanded.has(e.id);
            const DeviceIcon = deviceIcon(e.device);
            return (
              <div
                key={e.id}
                className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden"
              >
                <button
                  onClick={() => toggle(e.id)}
                  className="w-full flex items-start gap-3 p-3.5 text-left hover:bg-icm-bg/40"
                >
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-icm-text-dim shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-icm-text-dim shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10.5px] px-1.5 py-0.5 rounded ring-1 ${TYPE_TONE[e.type]}`}
                      >
                        {TYPE_LABEL[e.type]}
                      </span>
                      <span className="text-[13px] font-medium text-icm-text">
                        {e.recordLabel}
                      </span>
                      {e.legalHold && (
                        <span className="text-[10.5px] px-1.5 py-0.5 rounded ring-1 bg-icm-red-soft text-icm-red ring-icm-red/20 inline-flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Legal hold
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-icm-text-dim mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {e.ts}
                      </span>
                      <span>
                        {e.userName} <span className="text-icm-text-faint">({e.userRole})</span>
                      </span>
                      {e.personName && (
                        <span>
                          Individual: {e.personName} ({e.personId})
                        </span>
                      )}
                      <span className="font-mono text-icm-text-faint">{e.id}</span>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-icm-border p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Section title="Actor">
                        <Row label="User">{e.userName}</Row>
                        <Row label="User ID">
                          <span className="font-mono">{e.userId}</span>
                        </Row>
                        <Row label="Role">{e.userRole}</Row>
                        {e.aiAgent && <Row label="AI agent">{e.aiAgent}</Row>}
                      </Section>
                    </div>
                    <div className="space-y-2">
                      <Section title="Device & session">
                        <Row label="IP">
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Globe className="w-3 h-3 text-icm-text-dim" /> {e.ip}
                          </span>
                        </Row>
                        <Row label="Device">
                          <span className="inline-flex items-center gap-1">
                            <DeviceIcon className="w-3 h-3 text-icm-text-dim" /> {e.device}
                          </span>
                        </Row>
                        <Row label="Session">
                          <span className="font-mono">{e.sessionId}</span>
                        </Row>
                      </Section>
                    </div>
                    <div className="space-y-2">
                      <Section title="Record">
                        <Row label="Module">{e.module}</Row>
                        <Row label="Record ID">
                          <span className="font-mono">{e.recordId}</span>
                        </Row>
                        <Row label="Retention">
                          <span className="text-icm-green">7 yr · sealed</span>
                        </Row>
                      </Section>
                    </div>

                    <div className="md:col-span-3">
                      <Section title="Details">
                        <p className="text-[12px] text-icm-text">{e.details}</p>
                      </Section>
                    </div>

                    {e.diff && e.diff.length > 0 && (
                      <div className="md:col-span-3">
                        <Section title={`Before / After (${e.diff.length})`}>
                          <div className="rounded-md border border-icm-border overflow-hidden">
                            <table className="w-full text-[11.5px] font-geist">
                              <thead className="bg-icm-bg text-icm-text-dim uppercase text-[10px]">
                                <tr>
                                  <th className="text-left px-3 py-1.5 font-semibold w-[20%]">
                                    Field
                                  </th>
                                  <th className="text-left px-3 py-1.5 font-semibold">Before</th>
                                  <th className="text-left px-3 py-1.5 font-semibold w-[5%]"></th>
                                  <th className="text-left px-3 py-1.5 font-semibold">After</th>
                                </tr>
                              </thead>
                              <tbody>
                                {e.diff.map((d, i) => (
                                  <tr key={i} className="border-t border-icm-border align-top">
                                    <td className="px-3 py-1.5 font-medium text-icm-text">
                                      {d.field}
                                    </td>
                                    <td className="px-3 py-1.5 text-icm-text-dim line-through">
                                      {d.before ?? <em>null</em>}
                                    </td>
                                    <td className="px-3 py-1.5 text-icm-text-faint">
                                      <ArrowRight className="w-3 h-3" />
                                    </td>
                                    <td className="px-3 py-1.5 text-icm-text">
                                      {d.after ?? <em>null</em>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Section>
                      </div>
                    )}

                    <div className="md:col-span-3 flex items-center justify-end gap-2">
                      <button className="text-[11px] px-2.5 py-1 rounded-md ring-1 ring-icm-border text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1">
                        <FileText className="w-3 h-3" /> View record
                      </button>
                      <button className="text-[11px] px-2.5 py-1 rounded-md ring-1 ring-icm-border text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1">
                        <Download className="w-3 h-3" /> Export this entry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel py-10 text-center text-[12px] text-icm-text-dim">
              No audit entries match these filters.
            </div>
          )}
        </div>
      </div>
    </ICMShell>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-semibold mb-1.5">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 text-[11.5px]">
      <span className="text-icm-text-faint w-[70px] shrink-0">{label}</span>
      <span className="text-icm-text">{children}</span>
    </div>
  );
}

export default AuditEvidence;
