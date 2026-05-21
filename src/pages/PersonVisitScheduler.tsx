import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, CalendarPlus, MapPin, Users, Bell, Link2, Wifi, WifiOff, CheckCircle2, Clock } from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { getPerson, riskAvatarClass, initials } from "@/data/people";
import { toast } from "sonner";

const VISIT_TYPES = [
  "In-home visit (routine)",
  "Initial in-home visit",
  "Quarterly monitoring visit",
  "Annual planning visit",
  "Follow-up / Risk check-in",
  "Telehealth visit",
];

const LOCATIONS = ["Participant home", "Day program site", "Community location", "Provider office", "Telehealth"];

const STAFF = [
  { id: "u1", name: "Babar Nawaz", role: "Support Coordinator" },
  { id: "u2", name: "Maria Chen", role: "Support Coordinator" },
  { id: "u3", name: "James O'Connor", role: "Supervisor" },
  { id: "u4", name: "Priya Patel", role: "Backup Coordinator" },
];

interface ScheduledVisit {
  id: string;
  personId: string;
  type: string;
  date: string;
  startTime: string;
  duration: string;
  location: string;
  address: string;
  staffIds: string[];
  linkedGoalId: string;
  linkedTaskId: string;
  reminderMinutes: number;
  notifyChannels: string[];
  notes: string;
  createdAt: string;
  status: "Scheduled" | "Pending sync";
}

const STORAGE_KEY = "icm.visits.scheduled";

function loadVisits(personId: string): ScheduledVisit[] {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return all.filter((v: ScheduledVisit) => v.personId === personId);
  } catch { return []; }
}
function saveVisit(v: ScheduledVisit) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  all.push(v);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

const PersonVisitScheduler = () => {
  const { id } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const person = getPerson(id ?? "");

  const today = new Date().toISOString().slice(0, 10);
  const [visitType, setVisitType] = useState(search.get("type") || VISIT_TYPES[0]);
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("10:00");
  const [duration, setDuration] = useState("60");
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [address, setAddress] = useState((person as any)?.address || "");
  const [staffIds, setStaffIds] = useState<string[]>(["u1"]);
  const [linkedGoalId, setLinkedGoalId] = useState("goal-1");
  const [linkedTaskId, setLinkedTaskId] = useState("task-monitoring");
  const [reminderMinutes, setReminderMinutes] = useState(60);
  const [notifyChannels, setNotifyChannels] = useState<string[]>(["Email", "In-app"]);
  const [notes, setNotes] = useState("");
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [scheduled, setScheduled] = useState<ScheduledVisit[]>([]);

  useEffect(() => {
    if (id) setScheduled(loadVisits(id));
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [id]);

  const conflicts = useMemo(() => {
    return scheduled.filter(v => v.date === date && Math.abs(parseInt(v.startTime.replace(":","")) - parseInt(startTime.replace(":",""))) < 100);
  }, [scheduled, date, startTime]);

  if (!person) return <ICMShell title="Schedule Visit" showAIPanel={false}><p className="p-6">Person not found.</p></ICMShell>;

  const toggleStaff = (sid: string) => setStaffIds(s => s.includes(sid) ? s.filter(x => x !== sid) : [...s, sid]);
  const toggleChannel = (c: string) => setNotifyChannels(s => s.includes(c) ? s.filter(x => x !== c) : [...s, c]);

  const submit = () => {
    if (!staffIds.length) { toast.error("Assign at least one staff member."); return; }
    const visit: ScheduledVisit = {
      id: `vs-${Date.now()}`, personId: id!, type: visitType, date, startTime, duration,
      location, address, staffIds, linkedGoalId, linkedTaskId, reminderMinutes,
      notifyChannels, notes, createdAt: new Date().toISOString(),
      status: online ? "Scheduled" : "Pending sync",
    };
    saveVisit(visit);
    setScheduled(loadVisits(id!));
    // audit
    try {
      const audit = JSON.parse(localStorage.getItem("icm.audit") || "[]");
      audit.push({ ts: visit.createdAt, action: "Visit scheduled", entity: visit.id, personId: id, by: "Babar Nawaz", detail: `${visitType} on ${date} ${startTime}` });
      localStorage.setItem("icm.audit", JSON.stringify(audit));
    } catch {}
    toast.success(online ? "Visit scheduled. Reminders queued." : "Saved offline — will sync when online.");
  };

  return (
    <ICMShell title="Schedule In-Home Visit" showAIPanel={false}>
      <div className="space-y-5">
        <button onClick={() => navigate(`/people/${person.id}/visit-summary`)} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {person.lastName}, {person.firstName} · Schedule Visit
        </button>

        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3 flex-wrap">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono text-[14px] font-bold ${riskAvatarClass(person.riskScore)}`}>{initials(person)}</div>
          <div className="flex-1">
            <div className="font-manrope font-extrabold text-[16px] text-icm-text">{person.lastName}, {person.firstName}</div>
            <div className="text-[11.5px] text-icm-text-dim">{person.county} · {person.age}y · {person.program ?? "Program"}</div>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[11.5px] font-medium border ${online ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-700"}`}>
            {online ? <><Wifi className="w-3.5 h-3.5" /> Online — auto-sync</> : <><WifiOff className="w-3.5 h-3.5" /> Offline — save locally</>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Visit details */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1"><CalendarPlus className="w-4 h-4 text-icm-text-dim" /><h3 className="font-manrope font-bold text-[14px]">Visit details</h3></div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Visit type"><select value={visitType} onChange={e=>setVisitType(e.target.value)} className="w-full h-9 rounded-md border border-icm-border bg-white px-2 text-[13px]">{VISIT_TYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
                <Field label="Duration (min)"><select value={duration} onChange={e=>setDuration(e.target.value)} className="w-full h-9 rounded-md border border-icm-border bg-white px-2 text-[13px]">{["30","45","60","90","120"].map(d => <option key={d}>{d}</option>)}</select></Field>
                <Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full h-9 rounded-md border border-icm-border bg-white px-2 text-[13px]" /></Field>
                <Field label="Start time"><input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} className="w-full h-9 rounded-md border border-icm-border bg-white px-2 text-[13px]" /></Field>
              </div>
              {conflicts.length > 0 && (
                <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">⚠ Possible conflict with {conflicts.length} existing visit at similar time.</div>
              )}
            </div>

            {/* Location */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1"><MapPin className="w-4 h-4 text-icm-text-dim" /><h3 className="font-manrope font-bold text-[14px]">Location</h3></div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Location type"><select value={location} onChange={e=>setLocation(e.target.value)} className="w-full h-9 rounded-md border border-icm-border bg-white px-2 text-[13px]">{LOCATIONS.map(l => <option key={l}>{l}</option>)}</select></Field>
                <Field label="Address / details"><input value={address} onChange={e=>setAddress(e.target.value)} className="w-full h-9 rounded-md border border-icm-border bg-white px-2 text-[13px]" /></Field>
              </div>
            </div>

            {/* Staff */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-icm-text-dim" /><h3 className="font-manrope font-bold text-[14px]">Assigned staff</h3></div>
              <div className="grid grid-cols-2 gap-2">
                {STAFF.map(s => (
                  <label key={s.id} className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer text-[13px] ${staffIds.includes(s.id) ? "border-blue-400 bg-blue-50" : "border-icm-border bg-white"}`}>
                    <input type="checkbox" checked={staffIds.includes(s.id)} onChange={()=>toggleStaff(s.id)} />
                    <span className="flex-1"><span className="font-medium">{s.name}</span> <span className="text-icm-text-dim">· {s.role}</span></span>
                  </label>
                ))}
              </div>
            </div>

            {/* Linkage */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1"><Link2 className="w-4 h-4 text-icm-text-dim" /><h3 className="font-manrope font-bold text-[14px]">Link to plan / task</h3></div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Plan goal">
                  <select value={linkedGoalId} onChange={e=>setLinkedGoalId(e.target.value)} className="w-full h-9 rounded-md border border-icm-border bg-white px-2 text-[13px]">
                    <option value="goal-1">Improve community engagement (Goal 1)</option>
                    <option value="goal-2">Maintain medication routine (Goal 2)</option>
                    <option value="goal-3">Develop independent living skills (Goal 3)</option>
                    <option value="">— None —</option>
                  </select>
                </Field>
                <Field label="Monitoring task">
                  <select value={linkedTaskId} onChange={e=>setLinkedTaskId(e.target.value)} className="w-full h-9 rounded-md border border-icm-border bg-white px-2 text-[13px]">
                    <option value="task-monitoring">Quarterly monitoring contact</option>
                    <option value="task-followup">Risk follow-up</option>
                    <option value="task-annual">Annual plan review</option>
                    <option value="">— None —</option>
                  </select>
                </Field>
              </div>
              <Field label="Visit prep notes (optional)"><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} className="w-full rounded-md border border-icm-border bg-white px-2 py-1.5 text-[13px]" /></Field>
            </div>

            {/* Reminders */}
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1"><Bell className="w-4 h-4 text-icm-text-dim" /><h3 className="font-manrope font-bold text-[14px]">Reminders & notifications</h3></div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Remind me before"><select value={reminderMinutes} onChange={e=>setReminderMinutes(parseInt(e.target.value))} className="w-full h-9 rounded-md border border-icm-border bg-white px-2 text-[13px]">{[15,30,60,120,1440].map(m => <option key={m} value={m}>{m >= 1440 ? `${m/1440} day` : `${m} min`}</option>)}</select></Field>
                <Field label="Notify via">
                  <div className="flex flex-wrap gap-2">
                    {["Email","SMS","In-app","Push"].map(c => (
                      <button key={c} type="button" onClick={()=>toggleChannel(c)} className={`px-2.5 h-8 rounded-md text-[12px] border ${notifyChannels.includes(c) ? "border-blue-400 bg-blue-50 text-blue-700" : "border-icm-border bg-white"}`}>{c}</button>
                    ))}
                  </div>
                </Field>
              </div>
              <p className="text-[11.5px] text-icm-text-dim">Reminders sent to assigned staff and supervisor. Participant/guardian receives reminder per consent preferences.</p>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={()=>navigate(`/people/${person.id}/visit-summary`)} className="h-10 px-4 rounded-xl border border-icm-border text-[13px]">Cancel</button>
              <button onClick={submit} className="h-10 px-4 rounded-xl bg-icm-text text-icm-panel text-[13px] font-medium inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Schedule visit</button>
            </div>
          </div>

          {/* Upcoming */}
          <div className="space-y-4">
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
              <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-icm-text-dim" /><h3 className="font-manrope font-bold text-[14px]">Upcoming visits</h3></div>
              {scheduled.length === 0 ? (
                <p className="text-[12px] text-icm-text-dim">No scheduled visits yet.</p>
              ) : (
                <ul className="space-y-2">
                  {scheduled.sort((a,b)=>(a.date+a.startTime).localeCompare(b.date+b.startTime)).map(v => (
                    <li key={v.id} className="rounded-md border border-icm-border p-2 text-[12px]">
                      <div className="font-medium text-icm-text">{v.type}</div>
                      <div className="text-icm-text-dim">{v.date} · {v.startTime} · {v.duration}m</div>
                      <div className="text-icm-text-dim">{v.location}</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`px-1.5 h-5 inline-flex items-center rounded text-[10.5px] ${v.status === "Scheduled" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{v.status}</span>
                        {v.linkedGoalId && <span className="text-[10.5px] text-icm-text-dim">linked to plan goal</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-icm-border bg-blue-50/40 p-3 text-[11.5px] text-icm-text-dim">
              <strong className="text-icm-text">Mobile & offline.</strong> Coordinators can schedule, edit and document visits offline from any device. Records sync automatically when connectivity is restored.
            </div>
          </div>
        </div>
      </div>
    </ICMShell>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-medium text-icm-text-dim mb-1">{label}</span>
      {children}
    </label>
  );
}

export default PersonVisitScheduler;
