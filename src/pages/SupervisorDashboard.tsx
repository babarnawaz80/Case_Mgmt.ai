import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { ShieldCheck, AlertTriangle, Clock, CalendarClock, FileWarning, Users, TrendingUp, ArrowRight, BarChart3, ShieldAlert } from "lucide-react";
import { COORDINATORS, UPCOMING_RENEWALS, loadSubmittedNotes, loadComplianceExceptions } from "@/data/supervisor";

const SupervisorDashboard = () => {
  const navigate = useNavigate();
  const notes = loadSubmittedNotes();
  const exceptions = loadComplianceExceptions();

  const totals = useMemo(() => ({
    caseload: COORDINATORS.reduce((s, c) => s + c.caseload, 0),
    overdue: COORDINATORS.reduce((s, c) => s + c.overdueContacts, 0),
    pending: notes.filter(n => n.status === "Pending").length,
    errors: COORDINATORS.reduce((s, c) => s + c.errors, 0),
    highRisk: COORDINATORS.reduce((s, c) => s + c.highRiskCount, 0),
    complianceAvg: Math.round(COORDINATORS.reduce((s, c) => s + c.compliancePct, 0) / COORDINATORS.length),
    open: exceptions.filter(e => e.status !== "Resolved").length,
  }), [notes, exceptions]);

  const overloaded = COORDINATORS.filter(c => c.capacityPct >= 100);

  return (
    <ICMShell title="Supervisor Dashboard" showAIPanel={false}>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em] inline-flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600" /> Supervisor Dashboard
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">Caseload health, pending approvals, and compliance risk across your team.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/supervisor/compliance")} className="h-9 px-3 rounded-xl border border-icm-border bg-white text-[12px] inline-flex items-center gap-1.5 hover:bg-icm-bg"><AlertTriangle className="w-3.5 h-3.5" /> Compliance Exceptions</button>
            <button onClick={() => navigate("/exceptions")} className="h-9 px-3 rounded-xl border border-icm-border bg-white text-[12px] inline-flex items-center gap-1.5 hover:bg-icm-bg"><ShieldAlert className="w-3.5 h-3.5" /> Validation Exceptions</button>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi icon={<Users className="w-4 h-4" />} label="Total caseload"          value={totals.caseload} sub={`${COORDINATORS.length} coordinators`} color="bg-blue-500/10 text-blue-700" />
          <Kpi icon={<Clock className="w-4 h-4" />} label="Overdue contacts"        value={totals.overdue}  sub="Across team" color="bg-rose-500/10 text-rose-700" />
          <Kpi icon={<FileWarning className="w-4 h-4" />} label="Notes pending"     value={totals.pending}  sub="Awaiting approval" color="bg-amber-500/10 text-amber-700" />
          <Kpi icon={<AlertTriangle className="w-4 h-4" />} label="Documentation errors" value={totals.errors} sub="Last 7 days" color="bg-rose-500/10 text-rose-700" />
          <Kpi icon={<ShieldAlert className="w-4 h-4" />} label="High-risk individuals" value={totals.highRisk} sub="Active flags" color="bg-purple-500/10 text-purple-700" />
          <Kpi icon={<CalendarClock className="w-4 h-4" />} label="Plan renewals (30d)" value={UPCOMING_RENEWALS.length} sub="Upcoming" color="bg-blue-500/10 text-blue-700" />
          <Kpi icon={<TrendingUp className="w-4 h-4" />} label="Avg compliance"     value={`${totals.complianceAvg}%`} sub="Team average" color="bg-emerald-500/10 text-emerald-700" />
          <Kpi icon={<BarChart3 className="w-4 h-4" />} label="Open exceptions"     value={totals.open} sub="Need action" color="bg-rose-500/10 text-rose-700" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pending approvals */}
          <div className="lg:col-span-2 rounded-xl border border-icm-border bg-icm-panel">
            <div className="p-4 border-b border-icm-border flex items-center justify-between">
              <h3 className="font-manrope font-bold text-[14px] inline-flex items-center gap-2"><FileWarning className="w-4 h-4 text-amber-600" /> Notes awaiting approval</h3>
              <span className="text-[11.5px] text-icm-text-dim">{notes.filter(n=>n.status==="Pending").length} pending</span>
            </div>
            <ul className="divide-y divide-icm-border">
              {notes.filter(n => n.status === "Pending").map(n => (
                <li key={n.id} className="p-3 hover:bg-icm-bg cursor-pointer" onClick={()=>navigate(`/supervisor/review/${n.id}`)}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-icm-text truncate">{n.personName}</div>
                      <div className="text-[11.5px] text-icm-text-dim font-mono">{n.serviceCode} · {n.units}u · {n.coordinator}</div>
                    </div>
                    <span className={`px-1.5 h-5 inline-flex items-center rounded text-[10.5px] ${n.agingHours >= 48 ? "bg-rose-100 text-rose-700" : n.agingHours >= 24 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                      {n.agingHours}h
                    </span>
                    <ArrowRight className="w-4 h-4 text-icm-text-dim" />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[10.5px]">
                    {!n.hasPlanLink && <Chip color="rose">No plan link</Chip>}
                    {!n.authorizationOk && <Chip color="rose">Auth issue</Chip>}
                    {!n.hasAttachments && <Chip color="amber">No attachments</Chip>}
                    {n.agingHours >= 48 && <Chip color="rose">Aged &gt;48h</Chip>}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Plan renewals */}
          <div className="rounded-xl border border-icm-border bg-icm-panel">
            <div className="p-4 border-b border-icm-border">
              <h3 className="font-manrope font-bold text-[14px] inline-flex items-center gap-2"><CalendarClock className="w-4 h-4 text-blue-600" /> Upcoming plan renewals</h3>
            </div>
            <ul className="divide-y divide-icm-border">
              {UPCOMING_RENEWALS.sort((a,b)=>a.daysUntil-b.daysUntil).map(r => (
                <li key={r.personId} className="p-3">
                  <div className="text-[13px] font-semibold text-icm-text">{r.personName}</div>
                  <div className="text-[11.5px] text-icm-text-dim">{r.coordinator} · due {r.dueDate}</div>
                  <span className={`mt-1 inline-block px-1.5 h-5 rounded text-[10.5px] ${r.daysUntil<=7 ? "bg-rose-100 text-rose-700" : r.daysUntil<=14 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{r.daysUntil} day{r.daysUntil!==1?"s":""}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Coordinator scorecard */}
        <div className="rounded-xl border border-icm-border bg-icm-panel">
          <div className="p-4 border-b border-icm-border flex items-center justify-between">
            <h3 className="font-manrope font-bold text-[14px] inline-flex items-center gap-2"><Users className="w-4 h-4" /> Coordinator compliance & workload</h3>
            {overloaded.length > 0 && <span className="text-[11px] text-rose-700">{overloaded.length} coordinator{overloaded.length>1?"s":""} over capacity — consider reassignment</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-icm-bg/50 text-icm-text-dim">
                <tr>
                  <Th>Coordinator</Th><Th>Caseload</Th><Th>Capacity</Th><Th>Overdue</Th><Th>Pending notes</Th><Th>Errors</Th><Th>High-risk</Th><Th>Compliance</Th><Th>Productivity</Th><Th></Th>
                </tr>
              </thead>
              <tbody>
                {COORDINATORS.map(c => (
                  <tr key={c.id} className="border-t border-icm-border hover:bg-icm-bg/30">
                    <Td><span className="font-semibold text-icm-text">{c.name}</span></Td>
                    <Td>{c.caseload}</Td>
                    <Td><Capacity pct={c.capacityPct} /></Td>
                    <Td className={c.overdueContacts ? "text-rose-700 font-semibold" : ""}>{c.overdueContacts}</Td>
                    <Td className={c.pendingNotes>=5 ? "text-amber-700 font-semibold" : ""}>{c.pendingNotes}</Td>
                    <Td className={c.errors ? "text-rose-700 font-semibold" : ""}>{c.errors}</Td>
                    <Td>{c.highRiskCount}</Td>
                    <Td><Pct value={c.compliancePct} good={95} mid={85} /></Td>
                    <Td><Pct value={c.productivityPct} good={90} mid={80} /></Td>
                    <Td>
                      <button onClick={()=>alert(`Reassign workload for ${c.name} — would open workload-balancer.`)} className="text-blue-700 hover:underline text-[11.5px]">Balance →</button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-icm-border text-[11px] text-icm-text-dim">
            Capacity = caseload ÷ target (recommended 33). Reassignment moves selected participants to a coordinator below 85% capacity.
          </div>
        </div>
      </div>
    </ICMShell>
  );
};

const Kpi = ({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub: string; color: string }) => (
  <div className="rounded-xl border border-icm-border bg-icm-panel p-3">
    <div className="flex items-center justify-between">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>{icon}</div>
      <div className="text-[22px] font-extrabold tabular-nums text-icm-text">{value}</div>
    </div>
    <div className="mt-1 text-[12px] font-semibold text-icm-text">{label}</div>
    <div className="text-[10.5px] text-icm-text-dim">{sub}</div>
  </div>
);
const Chip = ({ children, color }: { children: React.ReactNode; color: "rose"|"amber"|"blue" }) => (
  <span className={`px-1.5 h-5 inline-flex items-center rounded text-[10.5px] ${color==="rose"?"bg-rose-100 text-rose-700":color==="amber"?"bg-amber-100 text-amber-800":"bg-blue-100 text-blue-700"}`}>{children}</span>
);
const Th = ({ children }: { children: React.ReactNode }) => <th className="text-left font-medium px-3 py-2">{children}</th>;
const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <td className={`px-3 py-2 ${className}`}>{children}</td>;
const Pct = ({ value, good, mid }: { value: number; good: number; mid: number }) => (
  <div className="flex items-center gap-2">
    <div className="w-16 h-1.5 rounded-full bg-icm-bg overflow-hidden"><div className={`h-full ${value>=good?"bg-emerald-500":value>=mid?"bg-amber-500":"bg-rose-500"}`} style={{ width: `${Math.min(100,value)}%` }} /></div>
    <span className={`tabular-nums font-mono text-[11.5px] ${value>=good?"text-emerald-700":value>=mid?"text-amber-700":"text-rose-700"}`}>{value}%</span>
  </div>
);
const Capacity = ({ pct }: { pct: number }) => (
  <span className={`px-1.5 h-5 inline-flex items-center rounded text-[10.5px] ${pct>=100?"bg-rose-100 text-rose-700":pct>=85?"bg-amber-100 text-amber-800":"bg-emerald-100 text-emerald-700"}`}>{pct}%</span>
);

export default SupervisorDashboard;
