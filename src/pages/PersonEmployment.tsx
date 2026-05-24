import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Loader2,
  CalendarDays,
  Briefcase,
  GraduationCap,
  Award,
  Clock,
  Plus,
  AlertCircle,
  CheckCircle2,
  Building,
  User,
  Phone,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { toast } from "sonner";

export default function PersonEmployment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading } = useIndividual(id);
  const personLabel = individual ? `${individual.last_name}, ${individual.first_name}` : "Person";

  // Mock data for vocational records
  const [empStatus, setEmpStatus] = useState("Employed Part-Time");
  const [jobTitle, setJobTitle] = useState("Supported Associate");
  const [employer, setEmployer] = useState("Wegmans Food Markets");
  const [startDate, setStartDate] = useState("09/15/2024");
  const [hoursPerWeek, setHoursPerWeek] = useState(12);
  const [supervisor, setSupervisor] = useState("Karen Miller");
  const [supervisorPhone, setSupervisorPhone] = useState("(410) 555-0921");
  const [jobCoach, setJobCoach] = useState("Sarah Chen, LCSW");

  const [educationHistory] = useState([
    { degree: "High School Certificate of Completion", school: "Carroll County High School", date: "June 2023" },
    { degree: "Supported Vocational Training", school: "DDA Career Development Center", date: "April 2024" },
  ]);

  const [accommodations, setAccommodations] = useState([
    "Frequent breaks during high-stimulus shifts.",
    "Job coach shadowing during new task integration.",
    "Written task checklist updated weekly.",
  ]);

  const [newAcc, setNewAcc] = useState("");

  const handleAddAccommodation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAcc.trim()) return;
    setAccommodations([...accommodations, newAcc.trim()]);
    setNewAcc("");
    toast.success("Accommodation added to vocational profile");
  };

  if (loading) {
    return (
      <ICMShell title="Employment &amp; Education" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading vocational profile…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return (
      <ICMShell title="Employment &amp; Education" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="Employment &amp; Education" showAIPanel={false}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(`/people/${individual.id}/echart`)}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {individual.last_name}, {individual.first_name} · Employment &amp; Education
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

        {/* Overview dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Employment Placements */}
          <div className="bg-white border border-icm-border rounded-xl p-5 shadow-sm md:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-manrope font-extrabold text-[15px] text-slate-800 tracking-tight flex items-center gap-2">
                <Briefcase className="w-4.5 h-4.5 text-indigo-500" /> Active Placement Details
              </h3>
              <span className="px-2 py-0.5 rounded text-[10.5px] font-bold font-geist bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/10">
                {empStatus}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12.5px] font-geist text-slate-600">
              <div className="space-y-1.5">
                <p className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-400 w-20">Employer:</span>
                  <span className="font-medium text-slate-800">{employer}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-400 w-20">Job Title:</span>
                  <span className="font-medium text-slate-800">{jobTitle}</span>
                </p>
                <p className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-400 w-20">Start Date:</span>
                  <span className="font-medium text-slate-800">{startDate}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-400 w-20">Hours:</span>
                  <span className="font-medium text-slate-800">{hoursPerWeek} hrs/week</span>
                </p>
              </div>

              <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4">
                <p className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-400 w-20">Supervisor:</span>
                  <span className="font-medium text-slate-800">{supervisor}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-400 w-20">Phone:</span>
                  <span className="font-medium text-slate-800">{supervisorPhone}</span>
                </p>
                <p className="flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="font-semibold text-slate-400 w-20">Job Coach:</span>
                  <span className="font-medium text-indigo-700 font-semibold">{jobCoach}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Education list */}
          <div className="bg-white border border-icm-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-manrope font-extrabold text-[15px] text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <GraduationCap className="w-4.5 h-4.5 text-teal-500" /> Education &amp; Credentials
            </h3>
            
            <div className="space-y-3">
              {educationHistory.map((edu, idx) => (
                <div key={idx} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0 mt-0.5">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[12.5px] text-slate-800 leading-tight">{edu.degree}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{edu.school} · {edu.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Accommodations details */}
        <div className="bg-white border border-icm-border rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-manrope font-extrabold text-[15px] text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
            <AlertCircle className="w-4.5 h-4.5 text-amber-500" /> Workplace Accommodations &amp; Support Needs
          </h3>

          <ul className="space-y-2.5 text-[12.5px] font-geist text-slate-700">
            {accommodations.map((acc, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{acc}</span>
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddAccommodation} className="flex gap-2 pt-2">
            <input
              value={newAcc}
              onChange={(e) => setNewAcc(e.target.value)}
              placeholder="Record new accommodation support need..."
              className="flex-1 text-[13px] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="submit"
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-semibold transition"
            >
              Add
            </button>
          </form>
        </div>
      </div>
    </ICMShell>
  );
}
