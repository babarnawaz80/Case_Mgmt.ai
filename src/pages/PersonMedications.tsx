/**
 * PersonMedications — Beta
 * Tracks an individual's medications and creates reminder tasks for case managers.
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Pill,
  Bell,
  Trash2,
  Loader2,
  ChevronRight,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { DischargedBanner } from "@/components/icm/DischargedBanner";
import { useIndividual } from "@/hooks/useIndividuals";
import { useAuth } from "@/contexts/AuthContext";
import { createTask } from "@/hooks/useTasks";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  prescriber: string;
  startDate: string;
  notes: string;
  reminderEnabled: boolean;
  reminderDays: number;
  createdAt: unknown;
}

const FREQUENCY_OPTIONS = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
  "Every other day",
  "Weekly",
  "As needed (PRN)",
  "Other",
];

const REMINDER_DAY_OPTIONS = [
  { value: 7, label: "1 week before" },
  { value: 14, label: "2 weeks before" },
  { value: 30, label: "1 month before" },
];

const PersonMedications = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { individual, loading } = useIndividual(id);

  const [medications, setMedications] = useState<Medication[]>([]);
  const [medLoading, setMedLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    dose: "",
    frequency: "Once daily",
    prescriber: "",
    startDate: "",
    notes: "",
    reminderEnabled: true,
    reminderDays: 14,
  });

  const isDischarged = individual?.enrollment_status === "discharged";

  // Load medications from Firestore subcollection
  useEffect(() => {
    if (!id) return;
    setMedLoading(true);
    getDocs(collection(db, "individuals", id, "medications"))
      .then((snap) => {
        const meds: Medication[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Medication, "id">),
        }));
        meds.sort((a, b) => a.name.localeCompare(b.name));
        setMedications(meds);
      })
      .catch((err) => {
        console.error("Failed to load medications:", err);
      })
      .finally(() => setMedLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!id || !form.name.trim()) {
      toast.error("Medication name is required");
      return;
    }
    setSaving(true);
    try {
      const orgId = userProfile?.organizationId ?? "";
      const indName = individual
        ? `${individual.first_name} ${individual.last_name}`
        : "Individual";

      // Save to Firestore subcollection
      const docRef = await addDoc(collection(db, "individuals", id, "medications"), {
        name: form.name.trim(),
        dose: form.dose.trim(),
        frequency: form.frequency,
        prescriber: form.prescriber.trim(),
        startDate: form.startDate,
        notes: form.notes.trim(),
        reminderEnabled: form.reminderEnabled,
        reminderDays: form.reminderDays,
        organizationId: orgId,
        createdBy: userProfile?.uid ?? "",
        createdByName: userProfile?.displayName ?? "",
        createdAt: serverTimestamp(),
      });

      // Create a medication reminder task if enabled
      if (form.reminderEnabled && userProfile?.uid) {
        const dueDate = form.startDate
          ? new Date(new Date(form.startDate).getTime() + form.reminderDays * 86400000)
              .toISOString()
              .split("T")[0]
          : new Date(Date.now() + form.reminderDays * 86400000)
              .toISOString()
              .split("T")[0];

        await createTask({
          title: `Medication reminder: ${form.name.trim()} — ${form.dose.trim() || "review dose"}`,
          description: `Scheduled medication check for ${indName}. Frequency: ${form.frequency}. Prescriber: ${form.prescriber || "—"}.`,
          individualId: id,
          individualName: indName,
          dueDate,
          status: "open",
          priority: "medium",
          type: "Medication Reminder",
          assignedTo: userProfile.uid,
          organizationId: orgId,
        });
      }

      setMedications((prev) => [
        ...prev,
        {
          id: docRef.id,
          name: form.name.trim(),
          dose: form.dose.trim(),
          frequency: form.frequency,
          prescriber: form.prescriber.trim(),
          startDate: form.startDate,
          notes: form.notes.trim(),
          reminderEnabled: form.reminderEnabled,
          reminderDays: form.reminderDays,
          createdAt: null,
        },
      ]);

      toast.success("Medication added", {
        description: form.reminderEnabled ? "Reminder task created." : undefined,
      });
      setShowForm(false);
      setForm({
        name: "",
        dose: "",
        frequency: "Once daily",
        prescriber: "",
        startDate: "",
        notes: "",
        reminderEnabled: true,
        reminderDays: 14,
      });
    } catch (err: any) {
      console.error("Failed to save medication:", err);
      toast.error("Failed to save medication", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (medId: string, medName: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, "individuals", id, "medications", medId));
      setMedications((prev) => prev.filter((m) => m.id !== medId));
      toast.success(`${medName} removed`);
    } catch {
      toast.error("Failed to remove medication");
    }
  };

  if (loading) {
    return (
      <ICMShell title="Medications" showAIPanel={false}>
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 animate-spin text-icm-text-dim" />
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return (
      <ICMShell title="Medications" showAIPanel={false}>
        <div className="rounded-xl border border-icm-border bg-icm-panel p-8 text-center">
          <p className="text-icm-text-dim text-[13px]">Individual not found.</p>
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="Medications" showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs
          backTo={`/people/${id}/echart`}
          backLabel="eChart"
          items={[
            { label: "People Supported", to: "/people" },
            { label: `${individual.first_name} ${individual.last_name}`, to: `/people/${id}/echart` },
            { label: "Medications" },
          ]}
        />

        <DischargedBanner individual={individual} />

        {/* Header */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
                Medications
              </h1>
              <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-geist font-bold uppercase tracking-wide bg-icm-amber-soft text-icm-amber ring-1 ring-icm-amber/20">
                Beta
              </span>
            </div>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              {individual.first_name} {individual.last_name} · {medications.length} medication{medications.length !== 1 ? "s" : ""} tracked
            </p>
          </div>
          {!isDischarged && (
            <button
              onClick={() => setShowForm(true)}
              className="h-9 px-3.5 rounded-xl bg-teal-600 text-white text-[12px] font-geist font-medium flex items-center gap-1.5 hover:bg-teal-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add Medication
            </button>
          )}
        </div>

        {/* Info banner */}
        <div className="rounded-xl border border-icm-border bg-icm-panel px-4 py-3 flex items-start gap-3">
          <Activity className="w-4 h-4 text-icm-accent shrink-0 mt-0.5" />
          <p className="text-[12px] font-geist text-icm-text-dim">
            <span className="font-semibold text-icm-text">Medication tracking (Beta)</span> — Add medications to track what the individual is taking. Enable reminders to auto-create tasks for medication reviews.
          </p>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="rounded-xl border border-icm-accent/30 bg-icm-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-manrope font-bold text-[14px] text-icm-text">Add medication</p>
              <button onClick={() => setShowForm(false)} className="text-icm-text-dim hover:text-icm-text text-[12px]">Cancel</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim block mb-1">
                  Medication name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Metformin"
                  className="w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40"
                />
              </div>
              <div>
                <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim block mb-1">
                  Dose
                </label>
                <input
                  value={form.dose}
                  onChange={(e) => setForm((f) => ({ ...f, dose: e.target.value }))}
                  placeholder="e.g. 500mg"
                  className="w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40"
                />
              </div>
              <div>
                <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim block mb-1">
                  Frequency
                </label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                  className="w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text focus:outline-none"
                >
                  {FREQUENCY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim block mb-1">
                  Prescriber
                </label>
                <input
                  value={form.prescriber}
                  onChange={(e) => setForm((f) => ({ ...f, prescriber: e.target.value }))}
                  placeholder="e.g. Dr. Smith"
                  className="w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40"
                />
              </div>
              <div>
                <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim block mb-1">
                  Start date
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-accent/40"
                />
              </div>
              <div>
                <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim block mb-1">
                  Notes
                </label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Special instructions, interactions..."
                  className="w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40"
                />
              </div>
            </div>

            {/* Reminder options */}
            <div className="rounded-xl border border-icm-border bg-icm-bg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-icm-accent" />
                  <p className="text-[12px] font-geist font-semibold text-icm-text">Create reminder task</p>
                </div>
                <button
                  onClick={() => setForm((f) => ({ ...f, reminderEnabled: !f.reminderEnabled }))}
                  className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${form.reminderEnabled ? "bg-icm-accent" : "bg-icm-border"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.reminderEnabled && "translate-x-4"}`} />
                </button>
              </div>
              {form.reminderEnabled && (
                <div>
                  <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim block mb-1">
                    Remind me
                  </label>
                  <select
                    value={form.reminderDays}
                    onChange={(e) => setForm((f) => ({ ...f, reminderDays: parseInt(e.target.value) }))}
                    className="w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none"
                  >
                    {REMINDER_DAY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="h-9 px-4 rounded-xl border border-icm-border text-[12px] font-geist text-icm-text hover:bg-icm-bg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="h-9 px-4 rounded-xl bg-teal-600 text-white text-[12px] font-geist font-semibold hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Add medication
              </button>
            </div>
          </div>
        )}

        {/* Medications list */}
        {medLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-icm-text-dim" />
          </div>
        ) : medications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel p-8 text-center">
            <Pill className="w-8 h-8 text-icm-text-faint mx-auto mb-3" />
            <p className="text-[13px] font-geist font-semibold text-icm-text">No medications tracked yet</p>
            <p className="text-[12px] text-icm-text-dim mt-1">
              {isDischarged ? "This individual is discharged." : "Add a medication to start tracking."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {medications.map((med) => (
              <div
                key={med.id}
                className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-icm-green-soft flex items-center justify-center shrink-0 mt-0.5">
                  <Pill className="w-4 h-4 text-icm-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-geist font-semibold text-[13px] text-icm-text">{med.name}</p>
                    {med.dose && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-icm-bg text-icm-text-dim border border-icm-border">
                        {med.dose}
                      </span>
                    )}
                    {med.reminderEnabled && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-geist bg-icm-accent-soft text-icm-accent">
                        <Bell className="w-2.5 h-2.5" /> Reminder
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-icm-text-dim mt-0.5">
                    {med.frequency}
                    {med.prescriber && ` · Prescribed by ${med.prescriber}`}
                    {med.startDate && ` · Started ${new Date(med.startDate).toLocaleDateString()}`}
                  </p>
                  {med.notes && (
                    <p className="text-[11.5px] text-icm-text-faint mt-1 italic">{med.notes}</p>
                  )}
                </div>
                {!isDischarged && (
                  <button
                    onClick={() => handleDelete(med.id, med.name)}
                    className="text-icm-text-faint hover:text-icm-red transition-colors shrink-0"
                    title="Remove medication"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ICMShell>
  );
};

export default PersonMedications;
