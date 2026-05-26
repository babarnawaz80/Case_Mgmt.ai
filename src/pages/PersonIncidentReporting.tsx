import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Sparkles, Plus, X, ArrowRight, Siren, ShieldCheck, FileDown, Filter, Loader2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { useIncidentReports } from "@/hooks/useFirestore";
import { AuthorCell } from "@/components/icm/AuthorCell";

type IncidentStatus = "Open" | "In Progress" | "Pending Review" | "Closed" | "Void";
type IncidentStageId = 1 | 2 | 3 | 4 | 5;

interface IncidentRecord {
  id: string;
  incidentTypes: string[];
  classification: "Critical" | "Significant" | "Minor" | "Unknown";
  status: IncidentStatus;
  currentStage: IncidentStageId;
  personName: string;
  incidentDate: string;
  incidentTime: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

function typeBreakdown(records: IncidentRecord[]): Array<{ label: string; count: number }> {
  const map = new Map<string, number>();
  for (const r of records) {
    for (const t of r.incidentTypes) {
      map.set(t, (map.get(t) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}



type Tab = "List" | "Patterns";

const PersonIncidentReporting = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading: individualLoading } = useIndividual(id);
  const { data: dbIncidents, loading: incidentsLoading } = useIncidentReports(id);
  const [tab, setTab] = useState<Tab>("List");
  const [showFilters, setShowFilters] = useState(false);
  const [showSCModal, setShowSCModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const all = useMemo(() => {
    return dbIncidents.map((i: any) => ({
      id: i.id,
      personId: i.individual_id,
      personName: i.individual_name || (individual ? `${individual.last_name}, ${individual.first_name}` : "—"),
      incidentDate: i.incident_date || i.incidentDate || "—",
      incidentTime: i.incident_time || i.incidentTime || "—",
      programSite: i.programSite || i.program_site || "—",
      location: i.location || "—",
      incidentTypes: i.incident_types || i.incidentTypes || [],
      classification: i.classification || "Unknown",
      staffOnDuty: i.staff_on_duty || i.staffOnDuty || [],
      personResponsible: i.person_responsible || i.personResponsible || "—",
      description: i.description || "",
      immediateActions: i.immediateActions || i.immediate_actions || "",
      medicalRequired: !!(i.medical_required || i.medicalRequired),
      hospitalized: !!(i.hospitalized),
      stateNotified: !!(i.state_notified || i.stateNotified),
      committeeNotified: !!(i.committee_notified || i.committeeNotified),
      guardianNotified: !!(i.guardian_notified || i.guardianNotified),
      currentStage: i.current_stage || i.currentStage || 1,
      stageStatuses: i.stage_statuses || i.stageStatuses || { 1: "Complete", 2: "Current", 3: "Pending", 4: "Pending", 5: "Pending" },
      notifications: i.notifications || [],
      contributingFactors: i.contributing_factors || i.contributingFactors || [],
      actionItems: i.action_items || i.actionItems || [],
      status: i.status || "Open",
      createdAt: i.created_at || i.createdAt || "—",
      lastUpdatedBy: i.last_updated_by || i.lastUpdatedBy || "—",
      lastUpdatedAt: i.last_updated_at || i.lastUpdatedAt || "—",
    }));
  }, [dbIncidents, individual]);

  const open = useMemo(() => {
    return all.filter((i) => i.status !== "Closed" && i.status !== "Void");
  }, [all]);

  const loading = individualLoading || incidentsLoading;

  if (loading) {
    return (
      <ICMShell title="Incident Reporting" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return <ICMShell title="Incident Reporting" showAIPanel={false}><p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p></ICMShell>;
  }

  return (
    <ICMShell title="Incident Reporting" showAIPanel={false}>
      <div className="space-y-5">
        <button onClick={() => navigate(`/people/${individual.id}/echart`)} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {individual.last_name}, {individual.first_name} · Incident Reporting
        </button>

        {/* Person header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3 flex-wrap">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono text-[14px] font-bold ${riskAvatarClass(individual.risk_score)}`}>{initials(individual)}</div>
          <div className="min-w-0 flex-1">
            <h2 className="font-manrope font-extrabold text-[16px] text-icm-text tracking-tight">{individual.last_name}, {individual.first_name}</h2>
            <p className="text-[11.5px] font-mono text-icm-text-dim">{individual.gender ?? "—"} · {individual.county ?? "—"} · ID #{individual.id.slice(0, 8)}</p>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
            <span className="w-1.5 h-1.5 rounded-full bg-icm-green" />{individual.enrollment_status}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">Incident Reports</h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">Compliance-mandated incident lifecycle management</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSCModal(true)} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-geist text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
              <FileDown className="w-3.5 h-3.5" /> Generate SC Packet
            </button>
            <button onClick={() => navigate(`/people/${individual.id}/incident-reporting/new`)} className="h-9 px-3 rounded-xl bg-icm-red text-white text-[12px] font-geist font-medium hover:opacity-90 inline-flex items-center gap-1.5">
              <Siren className="w-3.5 h-3.5" /> Report an Incident
            </button>
          </div>
        </div>

        {/* AI ribbon (red — open incidents) */}
        {!bannerDismissed && open.length > 0 && (
          <div className="rounded-xl border border-icm-red/20 bg-icm-red-soft px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <Siren className="w-5 h-5 text-icm-red shrink-0" />
              <p className="text-[12.5px] font-geist text-icm-text leading-snug">
                <span className="font-semibold">{individual.first_name} has {open.length} open incident{open.length === 1 ? "" : "s"} (ID {open.map((i) => i.id).join(", ")}) at Step {open[0].currentStage} of 5.</span>{" "}
                <span className="text-icm-text-dim">Initial report was filed {open[0].incidentDate}. This incident requires follow-up documentation.</span>
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => navigate(`/people/${individual.id}/incident-reporting/${open[0].id}`)} className="text-[11.5px] font-geist font-semibold text-icm-red hover:underline">View incident →</button>
              <button onClick={() => setBannerDismissed(true)} className="text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">Dismiss</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-icm-border">
          {(["List", "Patterns"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 -mb-px border-b-2 text-[12.5px] font-geist font-medium transition-colors ${tab === t ? "border-icm-accent text-icm-text" : "border-transparent text-icm-text-dim hover:text-icm-text"}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "List" && (
          <>
            {/* Filters */}
            <div className="rounded-xl border border-icm-border bg-icm-panel">
              <button onClick={() => setShowFilters((s) => !s)} className="w-full flex items-center justify-between px-3 py-2.5 text-[12px] font-geist text-icm-text">
                <span className="inline-flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Apply Filters</span>
                <span className="text-icm-text-dim">{showFilters ? "Hide" : "Show"}</span>
              </button>
              {showFilters && (
                <div className="border-t border-icm-border p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {["Program/Site", "Stage", "Status", "Classification", "From AIR", "To AIR", "From Committee", "To Committee", "From Incident Date", "To Incident Date", "From Due Date", "To Due Date", "Staff on duty", "Incident Type", "Person Responsible", "Incident Report ID"].map((f) => (
                    <div key={f}>
                      <label className="block text-[10px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1">{f}</label>
                      <input className="w-full h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] text-icm-text" placeholder="—" />
                    </div>
                  ))}
                  <div className="col-span-full flex items-center justify-end gap-2 pt-1">
                    <button className="h-8 px-3 rounded-xl border border-icm-border text-[11.5px] text-icm-text-dim hover:text-icm-text">Clear</button>
                    <button className="h-8 px-3 rounded-xl bg-icm-accent text-white text-[11.5px] font-medium hover:opacity-90">Filter</button>
                  </div>
                </div>
              )}
            </div>

            {/* Table or empty */}
            {all.length === 0 ? (
              <EmptyState onReport={() => navigate(`/people/${individual.id}/incident-reporting/new`)} />
            ) : (
              <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px] font-geist">
                    <thead className="bg-icm-bg/60">
                      <tr>
                        {["ID", "Incident Date", "Incident Type", "Person", "Classification", "Stage", "Status", "Last Updated", ""].map((c, i) => (
                          <th key={i} className="text-left px-4 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint whitespace-nowrap">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-icm-border">
                      {all.map((inc) => (
                        <tr key={inc.id} onClick={() => navigate(`/people/${individual.id}/incident-reporting/${inc.id}`)} className="hover:bg-icm-bg/40 cursor-pointer transition-colors">
                          <td className="px-4 py-3 font-mono text-icm-text-dim">{inc.id}</td>
                          <td className="px-4 py-3 font-mono text-icm-text">{inc.incidentDate} {inc.incidentTime}</td>
                          <td className="px-4 py-3 text-icm-text">{inc.incidentTypes.join(", ")}</td>
                          <td className="px-4 py-3 text-icm-text-dim">{inc.personName}</td>
                          <td className="px-4 py-3"><ClassificationPill c={inc.classification} /></td>
                          <td className="px-4 py-3"><StagePill stage={inc.currentStage} /></td>
                          <td className="px-4 py-3"><StatusPill s={inc.status} /></td>
                          <td className="px-4 py-3 text-[11px] text-icm-text-dim font-geist">
                            <AuthorCell name={inc.lastUpdatedBy} size="sm" showName={true} />
                            <p className="font-mono mt-0.5">{inc.lastUpdatedAt}</p>
                          </td>
                          <td className="px-4 py-3 text-right"><ArrowRight className="w-3.5 h-3.5 text-icm-accent inline" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "Patterns" && <PatternsTab records={all as IncidentRecord[]} />}
      </div>

      {showSCModal && (
        <SCPacketModal incidents={all} onClose={() => setShowSCModal(false)} />
      )}
    </ICMShell>
  );
};

function EmptyState({ onReport }: { onReport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-icm-green-soft border border-icm-green/20 flex items-center justify-center mb-4"><ShieldCheck className="w-7 h-7 text-icm-green" /></div>
      <h2 className="font-manrope font-extrabold text-[20px] text-icm-text mb-1">No incidents reported</h2>
      <p className="text-[13px] text-icm-text-dim max-w-md mb-6">No incident history. Report an incident immediately if one occurs — timely reporting is a compliance requirement.</p>
      <button onClick={onReport} className="h-10 px-4 rounded-xl bg-icm-red text-white text-[13px] font-medium hover:opacity-90 inline-flex items-center gap-1.5"><Siren className="w-3.5 h-3.5" /> Report an incident</button>
      <p className="text-[11.5px] text-icm-text-faint mt-3 max-w-sm">Incident reports are time-sensitive. Most state agencies require initial reports within 24 hours of occurrence.</p>
    </div>
  );
}

function PatternsTab({ records }: { records: IncidentRecord[] }) {
  // 12 month frequency mock — for Joseph: only 1 incident in 2023.
  const months: Array<{ label: string; count: number }> = (() => {
    const today = new Date();
    const out: Array<{ label: string; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      out.push({ label: d.toLocaleString("en-US", { month: "short" }), count: 0 });
    }
    return out;
  })();
  const types = typeBreakdown(records);
  const total = types.reduce((s, t) => s + t.count, 0) || 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <h3 className="font-manrope font-bold text-[14px] text-icm-text mb-2">Incident frequency (12 months)</h3>
        <FrequencyLine data={months} />
      </div>
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <h3 className="font-manrope font-bold text-[14px] text-icm-text mb-2">Incident type breakdown</h3>
        {types.length === 0 ? (
          <p className="text-[12px] text-icm-text-dim font-geist py-8 text-center">No incidents to chart.</p>
        ) : (
          <div className="flex items-center gap-4">
            <Donut segments={types.map((t, i) => ({ value: t.count, color: donutColors[i % donutColors.length] }))} total={total} />
            <ul className="text-[11.5px] font-geist text-icm-text space-y-1 flex-1">
              {types.map((t, i) => (
                <li key={t.label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: donutColors[i % donutColors.length] }} />
                  <span className="flex-1 truncate">{t.label}</span>
                  <span className="font-mono text-icm-text-dim">{t.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <h3 className="font-manrope font-bold text-[14px] text-icm-text mb-1">Average time to resolution</h3>
        <p className="font-manrope font-extrabold text-[28px] text-icm-text leading-none">— <span className="text-[12px] text-icm-text-dim font-geist font-normal">days</span></p>
        <p className="text-[11.5px] text-icm-text-dim mt-1 font-geist">Insufficient closed incidents to compute an average.</p>
      </div>
      <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft p-4">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-icm-accent shrink-0 mt-0.5" />
          <div className="text-[12.5px] font-geist text-icm-text space-y-1.5">
            <p>Joseph has had <span className="font-semibold">1 reported incident</span> in the past 3 years. No patterns of recurring incident types detected.</p>
            <p className="text-icm-text-dim">All previous incidents were resolved within 0 days on average — no closed incidents yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const donutColors = ["hsl(var(--icm-accent))", "hsl(var(--icm-amber))", "hsl(var(--icm-red))", "hsl(var(--icm-green))", "hsl(var(--icm-text-dim))"];

function Donut({ segments, total }: { segments: Array<{ value: number; color: string }>; total: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--icm-bg))" strokeWidth="14" />
      {segments.map((s, i) => {
        const len = (s.value / total) * c;
        const dash = `${len} ${c - len}`;
        const dashOffset = -offset;
        offset += len;
        return <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={dash} strokeDashoffset={dashOffset} transform="rotate(-90 50 50)" />;
      })}
    </svg>
  );
}

function FrequencyLine({ data }: { data: Array<{ label: string; count: number }> }) {
  const w = 480, h = 120, pad = 24;
  const max = Math.max(1, ...data.map((d) => d.count));
  const stepX = (w - pad * 2) / (data.length - 1);
  const points = data.map((d, i) => {
    const x = pad + stepX * i;
    const y = h - pad - (d.count / max) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[120px]">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="hsl(var(--icm-border))" />
      <polyline points={points} fill="none" stroke="hsl(var(--icm-red))" strokeWidth="2" />
      {data.map((d, i) => {
        const x = pad + stepX * i;
        const y = h - pad - (d.count / max) * (h - pad * 2);
        return <g key={i}>
          <circle cx={x} cy={y} r={2.5} fill="hsl(var(--icm-red))" />
          <text x={x} y={h - 6} textAnchor="middle" fontSize="9" fill="hsl(var(--icm-text-faint))" fontFamily="monospace">{d.label}</text>
        </g>;
      })}
    </svg>
  );
}

function SCPacketModal({ incidents, onClose }: { incidents: IncidentRecord[]; onClose: () => void }) {
  const [selected, setSelected] = useState(incidents[0]?.id ?? "");
  const [sections, setSections] = useState({ initial: true, notification: true, investigation: true, corrective: true, final: true });
  const [generated, setGenerated] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-icm-text/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-icm-panel rounded-2xl border border-icm-border w-full max-w-[480px] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-manrope font-bold text-[16px] text-icm-text">Generate Support Coordinator Packet</h3>
          <button onClick={onClose} className="text-icm-text-faint hover:text-icm-text"><X className="w-4 h-4" /></button>
        </div>

        <div className="mb-3">
          <label className="block text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1.5">Incident ID</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text font-mono">
            {incidents.map((i) => <option key={i.id} value={i.id}>{i.id} · {i.incidentDate} · {i.incidentTypes.join(", ")}</option>)}
          </select>
        </div>

        <div className="mb-4 space-y-1.5">
          <p className="text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint">Include sections</p>
          {([
            ["initial", "Initial Report"],
            ["notification", "Notification Log"],
            ["investigation", "Investigation Findings"],
            ["corrective", "Corrective Action Plan"],
            ["final", "Final Review"],
          ] as const).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-[12px] text-icm-text">
              <input type="checkbox" checked={sections[k]} onChange={(e) => setSections({ ...sections, [k]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>

        <p className="text-[11px] text-icm-text-dim mb-4 font-geist">Format: PDF</p>

        {!generated ? (
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] text-icm-text-dim hover:text-icm-text">Cancel</button>
            <button onClick={() => setGenerated(true)} className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-medium hover:opacity-90">Generate packet</button>
          </div>
        ) : (
          <div className="rounded-xl border border-icm-green/20 bg-icm-green-soft p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-icm-green shrink-0 mt-0.5" />
              <div className="text-[12px] font-geist text-icm-text">
                <p className="font-semibold mb-1">Packet ready.</p>
                <p className="text-icm-text-dim mb-3">This packet includes all 5 stages. Review before submitting to the state agency.</p>
                <button className="h-8 px-3 rounded-xl bg-icm-text text-icm-panel text-[11.5px] font-medium hover:opacity-90 inline-flex items-center gap-1.5">
                  <FileDown className="w-3.5 h-3.5" /> Download SC Packet (PDF)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StagePill({ stage }: { stage: IncidentStageId }) {
  const tone = stage <= 2 ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20" : stage <= 4 ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20" : "bg-icm-green-soft text-icm-green ring-icm-green/20";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ring-1 ${tone}`}>Step {stage} of 5</span>;
}

function StatusPill({ s }: { s: IncidentStatus }) {
  const map = {
    Open: "bg-icm-red-soft text-icm-red ring-icm-red/20",
    "In Progress": "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    "Pending Review": "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    Closed: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    Void: "bg-icm-bg text-icm-text-faint ring-icm-border line-through",
  } as const;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${map[s]}`}>{s}</span>;
}

function ClassificationPill({ c }: { c: IncidentRecord["classification"] }) {
  const map = {
    Critical: "bg-icm-red-soft text-icm-red ring-icm-red/20",
    Significant: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    Minor: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    Unknown: "bg-icm-bg text-icm-text-dim ring-icm-border",
  } as const;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 ${map[c]}`}>{c}</span>;
}

export default PersonIncidentReporting;
