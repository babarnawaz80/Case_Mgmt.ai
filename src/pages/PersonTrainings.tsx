import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Loader2,
  CalendarDays,
  BookOpen,
  Award,
  Clock,
  Plus,
  AlertCircle,
  CheckCircle2,
  PenTool,
  X,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { addTraining, updateTraining } from "@/hooks/useFirestore";
import { writeAudit } from "@/lib/auditService";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PersonTrainings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading: individualLoading } = useIndividual(id);
  const { currentUser, userProfile } = useAuth();
  const orgId = userProfile?.organizationId || currentUser?.organizationId || "demo";

  const [dbTrainings, setDbTrainings] = useState<any[]>([]);
  const [trainingsLoading, setTrainingsLoading] = useState(true);

  useEffect(() => {
    if (!id || !orgId) return;
    setTrainingsLoading(true);
    const q = query(
      collection(db, "trainings"),
      where("individualId", "==", id),
      where("organizationId", "==", orgId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDbTrainings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setTrainingsLoading(false);
      },
      (err) => {
        console.error("Error loading trainings:", err);
        setTrainingsLoading(false);
      }
    );
    return unsub;
  }, [id, orgId]);

  const personLabel = individual ? `${individual.last_name}, ${individual.first_name}` : "Person";

  const [isAdding, setIsAdding] = useState(false);
  const [editingTraining, setEditingTraining] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Independent Living");
  const [provider, setProvider] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [hours, setHours] = useState("");
  const [status, setStatus] = useState<"completed" | "in_progress" | "scheduled" | "overdue">("completed");
  const [notes, setNotes] = useState("");

  const trainings = useMemo(() => {
    return (dbTrainings || []).map((t: any) => ({
      id: t.id,
      title: t.title || "Vocational Skill Building",
      category: t.category || "Skill Development",
      provider: t.provider || "Community Services Inc.",
      completionDate: t.completion_date || "",
      expirationDate: t.expiration_date || "",
      status: t.status || "completed",
      hours: t.hours || 0,
      notes: t.notes || "",
    }));
  }, [dbTrainings]);

  const stats = useMemo(() => {
    const totalHours = trainings.reduce((sum, t) => sum + (t.hours || 0), 0);
    const completed = trainings.filter((t) => t.status === "completed").length;
    const pending = trainings.filter((t) => t.status === "in_progress" || t.status === "scheduled").length;
    return { totalHours, completed, pending };
  }, [trainings]);

  const handleOpenAdd = () => {
    setTitle("");
    setCategory("Independent Living");
    setProvider("");
    setCompletionDate("");
    setExpirationDate("");
    setHours("");
    setStatus("completed");
    setNotes("");
    setIsAdding(true);
  };

  const handleOpenEdit = (t: any) => {
    setEditingTraining(t);
    setTitle(t.title);
    setCategory(t.category);
    setProvider(t.provider);
    setCompletionDate(t.completionDate);
    setExpirationDate(t.expirationDate);
    setHours(t.hours ? t.hours.toString() : "");
    setStatus(t.status);
    setNotes(t.notes);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !id) return;
    setIsSubmitting(true);

    const payload = {
      individual_id: id,
      individualId: id,
      organizationId: orgId,
      organization_id: orgId,
      title,
      category,
      provider,
      completion_date: completionDate,
      expiration_date: expirationDate,
      hours: hours ? parseFloat(hours) : 0,
      status,
      notes,
    };

    try {
      if (editingTraining) {
        await updateTraining(editingTraining.id, payload);
        await writeAudit("settings_change", "individual", id, {
          action: "training_updated",
          trainingTitle: title,
        });
        toast.success("Training certification updated");
      } else {
        await addTraining(payload);
        await writeAudit("settings_change", "individual", id, {
          action: "training_added",
          trainingTitle: title,
        });
        toast.success("Training certification added successfully!");
      }
      setIsAdding(false);
      setEditingTraining(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save training entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loading = individualLoading || trainingsLoading;

  if (loading) {
    return (
      <ICMShell title="Trainings" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading training history…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return (
      <ICMShell title="Trainings" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="Trainings" showAIPanel={false}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(`/people/${individual.id}/echart`)}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {individual.last_name}, {individual.first_name} · Trainings
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

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-icm-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 font-geist">Completed Certs</p>
              <p className="text-[18px] font-black text-slate-800 leading-tight mt-0.5">{stats.completed} Trainings</p>
            </div>
          </div>

          <div className="bg-white border border-icm-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 font-geist">Total Training Hours</p>
              <p className="text-[18px] font-black text-slate-800 leading-tight mt-0.5">{stats.totalHours} Hours</p>
            </div>
          </div>

          <div className="bg-white border border-icm-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 font-geist">Scheduled Courses</p>
              <p className="text-[18px] font-black text-slate-800 leading-tight mt-0.5">{stats.pending} Pending</p>
            </div>
          </div>
        </div>

        {/* Course Lists */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-icm-border pb-3">
            <div>
              <h3 className="font-manrope font-extrabold text-[16px] text-icm-text tracking-tight">Trainings & Certifications</h3>
              <p className="text-[12px] text-icm-text-dim mt-0.5">Academic, community, and vocational courses taken by {individual.first_name}.</p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1 text-[12px] px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" /> Record Course
            </button>
          </div>

          {trainings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-icm-border bg-icm-panel p-12 text-center">
              <BookOpen className="w-10 h-10 mx-auto text-icm-text-faint mb-2.5" />
              <p className="text-[13px] font-semibold text-slate-700">No trainings logged yet</p>
              <p className="text-[12px] text-slate-500 mt-1 max-w-sm mx-auto">
                Record coursework, CPR training, community skills class, or vocational workshops for {individual.first_name}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trainings.map((t) => (
                <div key={t.id} className="bg-white border border-icm-border rounded-xl p-4 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-manrope font-bold text-[14px] text-slate-800 tracking-tight">{t.title}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-geist ${
                        t.status === "completed" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10" :
                        t.status === "in_progress" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-600/10" :
                        t.status === "scheduled" ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/10" :
                        "bg-red-50 text-red-700 ring-1 ring-red-600/10"
                      }`}>
                        {t.status === "in_progress" ? "In Progress" : t.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-[12px] text-slate-600 font-geist">
                      <p className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400 w-16">Category:</span>
                        <span className="font-medium text-slate-800">{t.category}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400 w-16">Provider:</span>
                        <span className="font-medium text-slate-800">{t.provider}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400 w-16">Hours:</span>
                        <span className="font-medium text-slate-800">{t.hours} hrs</span>
                      </p>
                      {t.completionDate && (
                        <p className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-400 w-16">Completed:</span>
                          <span className="font-medium text-slate-800 inline-flex items-center gap-1 text-[11px]">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                            {t.completionDate}
                          </span>
                        </p>
                      )}
                      {t.expirationDate && (
                        <p className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-400 w-16">Expires:</span>
                          <span className="font-medium text-red-600 inline-flex items-center gap-1 text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                            {t.expirationDate}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[11px] text-slate-400 font-geist truncate max-w-[200px]">{t.notes || "No notes logged."}</span>
                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="inline-flex items-center gap-1 text-[11.5px] font-geist font-semibold text-icm-accent hover:text-icm-accent/80"
                    >
                      <PenTool className="w-3.5 h-3.5" /> Edit Record
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Record Dialog */}
      {(isAdding || editingTraining) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <h2 className="text-[14px] font-bold text-slate-800 flex items-center gap-1.5 font-manrope">
                <BookOpen className="w-4 h-4 text-teal-600" /> {editingTraining ? "Edit Course Entry" : "Record Training Course"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingTraining(null);
                }}
                className="p-1 rounded hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 font-geist">
              <div>
                <label className="text-[10.5px] uppercase font-bold text-slate-400 block mb-1">Course Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CPR & First Aid Certification"
                  className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10.5px] uppercase font-bold text-slate-400 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  >
                    <option>Independent Living</option>
                    <option>Vocational Training</option>
                    <option>Social Skill Building</option>
                    <option>Medical & Safety</option>
                    <option>Communication & Advocacy</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10.5px] uppercase font-bold text-slate-400 block mb-1">Hours / Credits</label>
                  <input
                    type="number"
                    step="0.5"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="e.g. 4.0"
                    className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10.5px] uppercase font-bold text-slate-400 block mb-1">Completion Date</label>
                  <input
                    type="date"
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] uppercase font-bold text-slate-400 block mb-1">Expiration Date (optional)</label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10.5px] uppercase font-bold text-slate-400 block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10.5px] uppercase font-bold text-slate-400 block mb-1">Provider Agency</label>
                  <input
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="e.g. Red Cross Carroll"
                    className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10.5px] uppercase font-bold text-slate-400 block mb-1">Course Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe goal progress, certifications gained, etc."
                  className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-50 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingTraining(null);
                }}
                className="text-[12px] px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 text-[12px] px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm disabled:opacity-40"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Save Entry
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </ICMShell>
  );
}
