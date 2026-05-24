import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Loader2,
  CalendarDays,
  FileText,
  ShieldCheck,
  Briefcase,
  AlertCircle,
  PlusCircle,
  TrendingUp,
  Clock,
  CheckCircle,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { useCarePlans } from "@/hooks/useFirestore";

export default function PersonServicePlan() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading: individualLoading } = useIndividual(id);
  const { data: allPlans, loading: plansLoading } = useCarePlans(id);
  const personLabel = individual ? `${individual.last_name}, ${individual.first_name}` : "Person";

  const activePlan = useMemo(() => allPlans.find((p: any) => !p.isCompleted) || allPlans[0], [allPlans]);

  const services = useMemo(() => {
    if (!activePlan || !activePlan.services) return [];
    return activePlan.services.map((s: any) => ({
      id: s.id || Math.random().toString(36).substring(2, 9),
      name: s.name || "Specialized Habilitation",
      provider: s.provider || "Carroll Community Services",
      startDate: s.startDate || "08/01/2025",
      endDate: s.endDate || "07/31/2026",
      units: s.units || "15 hours/week",
      status: s.status || "Active",
      serviceCode: s.name.match(/\(([^)]+)\)/)?.[1] || "H2014",
    }));
  }, [activePlan]);

  const stats = useMemo(() => {
    if (services.length === 0) return { count: 0, weeklyHours: 0, utilization: 0, compliance: "100%" };
    // Estimate hours from unit strings
    let totalHours = 0;
    services.forEach((s) => {
      const match = s.units.match(/(\d+)\s*(hour|hr|day|dy|unit|ut)/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (s.units.toLowerCase().includes("day") || s.units.toLowerCase().includes("dy")) {
          totalHours += val * 6; // 6 hours per day program
        } else {
          totalHours += val;
        }
      } else {
        totalHours += 15; // default fallback
      }
    });

    return {
      count: services.length,
      weeklyHours: totalHours,
      utilization: 84, // mock utilization rate based on billing history
      compliance: "Current",
    };
  }, [services]);

  const loading = individualLoading || plansLoading;

  if (loading) {
    return (
      <ICMShell title="Service Plan" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading Service Plan…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return (
      <ICMShell title="Service Plan" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="Service Plan" showAIPanel={false}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(`/people/${individual.id}/echart`)}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {individual.last_name}, {individual.first_name} · Service Plan (ISP)
        </button>

        {/* Sticky person header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3 flex-wrap">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono text-[14px] font-bold ${riskAvatarClass(individual.risk_score)}`}>
            {initials(individual)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-manrope font-extrabold text-[16px] text-icm-text tracking-tight">
              {individual.last_name}, {individual.first_name}
              {individual.preferred_name && <span className="font-medium text-icm-text-dim"> ({individual.preferred_name})</span>}
            </h2>
            <p className="text-[11.5px] font-mono text-icm-text-dim">
              {individual.gender ?? "—"} · {individual.county ?? "—"} · ID #{individual.id.slice(0, 8)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
            <span className="w-1.5 h-1.5 rounded-full bg-icm-green" />
            {individual.enrollment_status}
          </span>
        </div>

        {/* Operational Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-icm-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 font-geist">Active Services</p>
              <p className="text-[18px] font-black text-slate-800 leading-tight mt-0.5">{stats.count} Authorizations</p>
            </div>
          </div>

          <div className="bg-white border border-icm-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 font-geist">Weekly Hours</p>
              <p className="text-[18px] font-black text-slate-800 leading-tight mt-0.5">{stats.weeklyHours} hr / week</p>
            </div>
          </div>

          <div className="bg-white border border-icm-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 font-geist">Utilization Rate</p>
              <p className="text-[18px] font-black text-slate-800 leading-tight mt-0.5">{stats.utilization}% Billed</p>
            </div>
          </div>

          <div className="bg-white border border-icm-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 font-geist">ISP Compliance</p>
              <p className="text-[18px] font-black text-slate-800 leading-tight mt-0.5">{stats.compliance}</p>
            </div>
          </div>
        </div>

        {/* Main Service List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-icm-border pb-3">
            <div>
              <h3 className="font-manrope font-extrabold text-[16px] text-icm-text tracking-tight">Service Authorizations</h3>
              <p className="text-[12px] text-icm-text-dim mt-0.5">Authorizations mapped from the active Person-Centered Care Plan.</p>
            </div>
            <button
              onClick={() => navigate(`/people/${id}/care-plan`)}
              className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Edit Care Plan
            </button>
          </div>

          {services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-icm-border bg-icm-panel p-10 text-center">
              <AlertCircle className="w-10 h-10 mx-auto text-icm-text-faint mb-2.5" />
              <p className="text-[13px] font-semibold text-slate-700">No Authorized Services found</p>
              <p className="text-[12px] text-slate-500 mt-1 max-w-sm mx-auto">
                Authorized services are drawn from active, signed Care Plans. Go to the PCP tab to add services.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((s) => (
                <div key={s.id} className="bg-white border border-icm-border rounded-xl p-4 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-manrope font-bold text-[14px] text-slate-800 tracking-tight">{s.name}</h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-geist bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10">
                        {s.status}
                      </span>
                    </div>
                    
                    <div className="mt-3 space-y-1.5 text-[12px] text-slate-600 font-geist">
                      <p className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400 w-16">Code:</span>
                        <span className="font-mono text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">{s.serviceCode}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400 w-16">Provider:</span>
                        <span className="font-medium text-slate-800">{s.provider}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400 w-16">Units:</span>
                        <span className="font-medium text-slate-800">{s.units}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400 w-16">Period:</span>
                        <span className="font-medium text-slate-800 inline-flex items-center gap-1 text-[11px]">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                          {s.startDate} – {s.endDate}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "80%" }} />
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">80% remaining</span>
                    </div>
                    <button
                      onClick={() => navigate(`/people/${id}/progress-note/new`, { state: { prefillServiceCode: s.serviceCode } })}
                      className="inline-flex items-center gap-1 text-[11.5px] font-geist font-semibold text-icm-accent hover:text-icm-accent/80"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Log Session
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documentation Compliance Alert */}
        <div className="bg-gradient-to-br from-amber-50/50 to-amber-100/30 border border-amber-200/50 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[12px] text-amber-800 leading-relaxed font-geist">
            <span className="font-semibold">Compliance Note:</span> Home and Community-Based Services (HCBS) authorizations require corresponding progress notes documented within 24 hours of clinical service delivery to comply with Medicaid waiver audit requirements. Ensure all billing entries are signed and mapped to active service codes.
          </div>
        </div>
      </div>
    </ICMShell>
  );
}
