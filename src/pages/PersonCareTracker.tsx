import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Loader2,
  CalendarDays,
  Heart,
  Activity,
  Award,
  Clock,
  Plus,
  AlertCircle,
  CheckCircle2,
  ListTodo,
  FileCheck,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { toast } from "sonner";

export default function PersonCareTracker() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading } = useIndividual(id);
  const personLabel = individual ? `${individual.last_name}, ${individual.first_name}` : "Person";

  // Daily checklists state
  const [dailyTasks, setDailyTasks] = useState([
    { id: "t1", task: "Medication Administration (Morning Dose)", completed: true, time: "08:15 AM", provider: "Mary Davis, CNA" },
    { id: "t2", task: "Physical Therapy Exercise (Stretching)", completed: true, time: "10:30 AM", provider: "John Stark, PT" },
    { id: "t3", task: "Nutritional Intake (Meal Plan Review)", completed: false, time: "Pending", provider: "Mary Davis, CNA" },
    { id: "t4", task: "Community Activity (Walk in Park)", completed: false, time: "Pending", provider: "Sarah Chen, LCSW" },
    { id: "t5", task: "Medication Administration (Evening Dose)", completed: false, time: "Pending", provider: "Mary Davis, CNA" },
  ]);

  const [historicalLogs, setHistoricalLogs] = useState([
    { date: "May 22, 2026", activity: "Medication Intake", detail: "Morning and Evening doses administered with zero refusal.", provider: "Mary Davis, CNA" },
    { date: "May 22, 2026", activity: "Community Activity", detail: "Attended vocational workshop for 2 hours. Very cooperative.", provider: "Jordan Reyes" },
    { date: "May 21, 2026", activity: "Physical Therapy", detail: "Completed full stretching routine; slight resistance in lower leg.", provider: "John Stark, PT" },
  ]);

  const [newActivity, setNewActivity] = useState("Community Activity");
  const [newDetail, setNewDetail] = useState("");
  const [newProvider, setNewProvider] = useState("Kathy Adams");

  const toggleTask = (taskId: string) => {
    setDailyTasks(
      dailyTasks.map((t) => {
        if (t.id === taskId) {
          const nextVal = !t.completed;
          return {
            ...t,
            completed: nextVal,
            time: nextVal ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Pending",
          };
        }
        return t;
      })
    );
    toast.success("Daily care status updated");
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDetail.trim()) return;
    const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    setHistoricalLogs([
      { date: dateStr, activity: newActivity, detail: newDetail.trim(), provider: newProvider },
      ...historicalLogs,
    ]);
    setNewDetail("");
    toast.success("Care tracking event recorded successfully!");
  };

  const stats = useMemo(() => {
    const total = dailyTasks.length;
    const completed = dailyTasks.filter((t) => t.completed).length;
    const pct = Math.round((completed / total) * 100);
    return { completed, total, pct };
  }, [dailyTasks]);

  if (loading) {
    return (
      <ICMShell title="Care Tracker" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading care tracker logs…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return (
      <ICMShell title="Care Tracker" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="Care Tracker" showAIPanel={false}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(`/people/${individual.id}/echart`)}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {individual.last_name}, {individual.first_name} · Care Tracker
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

        {/* Top KPI Dashboards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daily completion rate */}
          <div className="bg-white border border-icm-border rounded-xl p-5 shadow-sm space-y-3.5">
            <h3 className="font-manrope font-extrabold text-[15px] text-slate-800 tracking-tight flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-indigo-500" /> Daily Care Status
            </h3>
            
            <div className="flex items-center justify-between">
              <div className="text-[32px] font-black text-slate-800 tracking-tight leading-none">
                {stats.pct}%
              </div>
              <span className="text-[12px] font-geist text-slate-500 font-semibold bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
                {stats.completed} / {stats.total} Tasks
              </span>
            </div>
            
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${stats.pct}%` }} />
            </div>
          </div>

          {/* Core Daily Checklist */}
          <div className="bg-white border border-icm-border rounded-xl p-5 shadow-sm md:col-span-2 space-y-3">
            <h3 className="font-manrope font-extrabold text-[15px] text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <ListTodo className="w-4.5 h-4.5 text-teal-500" /> Today's Care Checklist
            </h3>

            <div className="space-y-2 text-[12.5px] font-geist text-slate-700">
              {dailyTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition border border-slate-50">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => toggleTask(t.id)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className={t.completed ? "line-through text-slate-400" : "font-medium text-slate-800"}>
                      {t.task}
                    </span>
                  </label>

                  <div className="text-right shrink-0">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${t.completed ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {t.time}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{t.provider}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action log form and history */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Submit new log */}
          <div className="bg-white border border-icm-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-manrope font-extrabold text-[15px] text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <Plus className="w-4.5 h-4.5 text-teal-500" /> Log Care Activity
            </h3>

            <form onSubmit={handleAddLog} className="space-y-3 font-geist">
              <div>
                <label className="text-[10.5px] uppercase font-bold text-slate-400 block mb-1">Activity Type</label>
                <select
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  <option>Medication Intake</option>
                  <option>Physical Therapy</option>
                  <option>Community Activity</option>
                  <option>Behavior Support</option>
                  <option>Hygiene/ADL</option>
                  <option>Meal Support</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="text-[10.5px] uppercase font-bold text-slate-400 block mb-1">Provider Name</label>
                <input
                  required
                  value={newProvider}
                  onChange={(e) => setNewProvider(e.target.value)}
                  className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label className="text-[10.5px] uppercase font-bold text-slate-400 block mb-1">Session Detail</label>
                <textarea
                  required
                  rows={3}
                  value={newDetail}
                  onChange={(e) => setNewDetail(e.target.value)}
                  placeholder="Record description of services, medication names, food items consumed, or exercises..."
                  className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <button
                type="submit"
                className="w-full h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[13px] transition"
              >
                Log Care Event
              </button>
            </form>
          </div>

          {/* Historical Logs */}
          <div className="bg-white border border-icm-border rounded-xl p-5 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="font-manrope font-extrabold text-[15px] text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileCheck className="w-4.5 h-4.5 text-indigo-500" /> Historical Care Log History
            </h3>

            <div className="space-y-3.5 text-[12.5px] font-geist text-slate-600 overflow-y-auto max-h-[360px]">
              {historicalLogs.map((log, idx) => (
                <div key={idx} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[11px]">{log.activity}</span>
                    <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" /> {log.date}
                    </span>
                  </div>
                  <p className="mt-2 text-slate-700 leading-normal">{log.detail}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Logged by: <span className="font-semibold text-slate-500">{log.provider}</span></p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ICMShell>
  );
}
