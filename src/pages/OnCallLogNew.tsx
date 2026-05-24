import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { PhoneCall, Search, ChevronDown, Check, Save, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIndividuals } from "@/hooks/useIndividuals";
import type {
  OnCallCategory,
  OnCallStatus,
  OnCallUrgency,
  CallerType,
} from "@/data/onCallLogs";
import { addOnCallLog } from "@/hooks/useFirestore";
import { writeAudit } from "@/lib/auditService";
import { useAuth } from "@/contexts/AuthContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const categories: OnCallCategory[] = [
  "Medical",
  "Behavioral",
  "Medication",
  "Staffing",
  "Incident",
  "Transportation",
  "Family Concern",
  "Other",
];
const urgencies: OnCallUrgency[] = ["Routine", "Urgent", "Emergency"];
const statuses: OnCallStatus[] = ["Open", "In Progress", "Resolved"];
const callerTypes: CallerType[] = [
  "Individual (Self)",
  "Family / Guardian",
  "Direct Support Staff",
  "House Manager",
  "Provider / Clinician",
  "Hospital / ER",
  "Other",
];

const inputCls =
  "w-full h-10 px-3 rounded-lg bg-icm-panel border border-icm-border text-[13px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent transition-colors";
const textareaCls =
  "w-full px-3 py-2 rounded-lg bg-icm-panel border border-icm-border text-[13px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent resize-none transition-colors";
const selectCls = inputCls + " appearance-none pr-8";

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wide text-icm-text-faint font-geist font-semibold mb-1.5">
        {label} {required && <span className="text-icm-red">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-icm-text-faint mt-1 font-geist">{hint}</p>}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-icm-border bg-icm-panel p-4 sm:p-5 space-y-4">
      <h2 className="font-manrope font-bold text-[14px] text-icm-text tracking-tight">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function PersonSearchSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { individuals, loading } = useIndividuals();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const q = query.trim().toLowerCase();
  const options = individuals
    .map((p) => ({ id: p.id, name: `${p.first_name} ${p.last_name}`, sub: p.county ?? "—" }))
    .filter((o) => !q || o.name.toLowerCase().includes(q));

  const selected = individuals.find((p) => p.id === value);
  const display = selected ? `${selected.first_name} ${selected.last_name}` : "";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} flex items-center justify-between text-left`}
      >
        <span className={display ? "text-icm-text" : "text-icm-text-faint inline-flex items-center gap-1.5"}>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-icm-accent shrink-0" />}
          {display || "Search individual… (optional)"}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-icm-text-faint shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-icm-border bg-icm-panel shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 h-9 border-b border-icm-border">
            <Search className="w-3.5 h-3.5 text-icm-text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search person…"
              className="flex-1 bg-transparent text-[13px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none"
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto py-1">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full text-left px-3 py-1.5 text-[12px] font-geist text-icm-text-dim hover:bg-icm-bg"
              >
                Clear selection
              </button>
            )}
            {loading ? (
              <div className="px-3 py-2 text-[12px] text-icm-text-faint flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-icm-accent" />
                Loading caseload…
              </div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-icm-text-faint">No matches.</div>
            ) : (
              options.map((o) => {
                const isSel = o.id === value;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      onChange(o.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-icm-bg flex items-center justify-between gap-2"
                  >
                    <span className="min-w-0">
                      <span className="block text-[13px] font-geist text-icm-text truncate">{o.name}</span>
                      <span className="block text-[11px] text-icm-text-faint">{o.sub}</span>
                    </span>
                    {isSel && <Check className="w-3.5 h-3.5 text-icm-accent shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const OnCallLogNew = () => {
  const navigate = useNavigate();
  const { individuals } = useIndividuals();
  const { currentUser, userProfile } = useAuth();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const nowTime = now.toTimeString().slice(0, 5);

  const [form, setForm] = useState({
    personId: "",
    callDate: today,
    callStartTime: nowTime,
    callEndTime: "",
    callerName: "",
    callerType: "Direct Support Staff" as CallerType,
    callerPhone: "",
    callbackNumber: "",
    category: "Medical" as OnCallCategory,
    urgency: "Routine" as OnCallUrgency,
    reason: "",
    actionTaken: "",
    referrals: "",
    supervisorNotified: false,
    supervisorName: "",
    followUpRequired: false,
    followUpBy: "",
    followUpDue: "",
    status: "Open" as OnCallStatus,
    receivedBy: "Kathy Adams",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (asDraft = false) => {
    if (!form.callerName.trim() || !form.callerPhone.trim() || !form.reason.trim()) {
      toast({
        title: "Missing required fields",
        description: "Caller name, phone number, and reason for call are required.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const selectedPerson = individuals.find(p => p.id === form.personId);
      const docRef = await addDoc(collection(db, "oncall_log"), {
        individual_id: form.personId || "unspecified",
        individual_name: selectedPerson ? `${selectedPerson.first_name} ${selectedPerson.last_name}` : "Unspecified",
        date: form.callDate,
        time: form.callStartTime || "—",
        caller: form.callerName,
        call_type: form.callerType,
        description: form.reason,
        action_taken: form.actionTaken,
        follow_up_required: form.followUpRequired,
        follow_up_notes: form.followUpDue ? `Due ${form.followUpDue} by ${form.followUpBy}` : "—",
        author_name: userProfile?.displayName || userProfile?.email || "Kathy Adams",
        category: form.category,
        urgency: form.urgency,
        status: asDraft ? "Open" : "Resolved",
        caller_phone: form.callerPhone,
        notes: form.notes,
        supervisor_notified: form.supervisorNotified,
        supervisor_name: form.supervisorName,
        organizationId: userProfile?.organizationId || currentUser?.organizationId || "demo",
        userId: currentUser?.uid || "unknown",
        createdAt: serverTimestamp(),
      });

      await writeAudit('create_note', 'oncall_log', docRef.id, {
        individualId: form.personId || "unspecified",
        noteType: "oncall",
      });

      toast({
        title: asDraft ? "Draft saved" : "On-call log saved",
        description: `Call from ${form.callerName} recorded.`,
      });
      navigate("/oncall-log");
    } catch (err) {
      toast({
        title: "Save failed",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ICMShell title="New On-Call Log" showAIPanel={false}>
      <div className="space-y-5 max-w-[1000px] mx-auto">
        <Breadcrumbs
          backTo="/oncall-log"
          backLabel="On-Call Log"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "On-Call Log", to: "/oncall-log" },
            { label: "New Call" },
          ]}
        />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-tight text-[24px] font-semibold text-icm-text leading-tight tracking-[-0.02em] flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-icm-accent" />
              New On-Call Log Entry
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1">
              Record an incoming after-hours or backup case manager call.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate("/oncall-log")}
              className="h-9 px-3.5 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={submitting}
              className="h-9 px-3.5 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text flex items-center gap-1.5 disabled:opacity-40"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={submitting}
              className="h-9 px-3.5 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-medium flex items-center gap-1.5 hover:bg-teal-700 disabled:opacity-40"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Submit Log
            </button>
          </div>
        </div>

        {/* Call Information */}
        <SectionCard title="Call Information">
          <Field label="Date of Call" required>
            <input
              type="date"
              value={form.callDate}
              onChange={(e) => set("callDate", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Received By" required>
            <input
              value={form.receivedBy}
              onChange={(e) => set("receivedBy", e.target.value)}
              placeholder="On-call case manager name"
              className={inputCls}
            />
          </Field>
          <Field label="Time Call Received" required>
            <input
              type="time"
              value={form.callStartTime}
              onChange={(e) => set("callStartTime", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Time Call Ended">
            <input
              type="time"
              value={form.callEndTime}
              onChange={(e) => set("callEndTime", e.target.value)}
              className={inputCls}
            />
          </Field>
        </SectionCard>

        {/* Caller Details */}
        <SectionCard title="Caller Details">
          <Field label="Caller Name" required>
            <input
              value={form.callerName}
              onChange={(e) => set("callerName", e.target.value)}
              placeholder="Full name of the person calling"
              className={inputCls}
            />
          </Field>
          <Field label="Relationship to Individual">
            <div className="relative">
              <select
                value={form.callerType}
                onChange={(e) => set("callerType", e.target.value as CallerType)}
                className={selectCls}
              >
                {callerTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint pointer-events-none" />
            </div>
          </Field>
          <Field label="Phone Number (called from)" required>
            <input
              type="tel"
              value={form.callerPhone}
              onChange={(e) => set("callerPhone", e.target.value)}
              placeholder="(555) 555-5555"
              className={inputCls}
            />
          </Field>
          <Field label="Callback Number" hint="If different from number called from">
            <input
              type="tel"
              value={form.callbackNumber}
              onChange={(e) => set("callbackNumber", e.target.value)}
              placeholder="(555) 555-5555"
              className={inputCls}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Individual Involved" hint="Optional — leave blank if call is not about a specific person">
              <PersonSearchSelect value={form.personId} onChange={(v) => set("personId", v)} />
            </Field>
          </div>
        </SectionCard>

        {/* Reason & Triage */}
        <SectionCard title="Reason & Triage">
          <Field label="Category" required>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value as OnCallCategory)}
                className={selectCls}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint pointer-events-none" />
            </div>
          </Field>
          <Field label="Urgency Level" required>
            <div className="flex gap-2">
              {urgencies.map((u) => {
                const active = form.urgency === u;
                const tone =
                  u === "Emergency"
                    ? active
                      ? "bg-icm-red text-white border-icm-red"
                      : "border-icm-border text-icm-text-dim hover:border-icm-red/40"
                    : u === "Urgent"
                    ? active
                      ? "bg-icm-amber text-white border-icm-amber"
                      : "border-icm-border text-icm-text-dim hover:border-icm-amber/40"
                    : active
                    ? "bg-icm-text text-icm-panel border-icm-text"
                    : "border-icm-border text-icm-text-dim hover:border-icm-text/40";
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => set("urgency", u)}
                    className={`flex-1 h-10 rounded-lg border text-[12px] font-geist font-semibold transition-colors ${tone}`}
                  >
                    {u}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="md:col-span-2">
            <Field label="Reason for Call" required hint="What is the caller reporting or asking about?">
              <textarea
                rows={3}
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
                placeholder="Describe the concern, situation, or question raised by the caller…"
                className={textareaCls}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Response */}
        <SectionCard title="Response & Action Taken">
          <div className="md:col-span-2">
            <Field label="Action Taken" required>
              <textarea
                rows={3}
                value={form.actionTaken}
                onChange={(e) => set("actionTaken", e.target.value)}
                placeholder="What did you do? Guidance given, decisions made, instructions provided…"
                className={textareaCls}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Referrals / Escalations" hint="911, on-call nurse, hospital, guardian, etc.">
              <textarea
                rows={2}
                value={form.referrals}
                onChange={(e) => set("referrals", e.target.value)}
                placeholder="List any people or services contacted as a result of this call…"
                className={textareaCls}
              />
            </Field>
          </div>
          <Field label="Supervisor Notified?">
            <div className="flex items-center gap-2 h-10">
              <button
                type="button"
                onClick={() => set("supervisorNotified", !form.supervisorNotified)}
                className={`h-10 px-4 rounded-lg border text-[12px] font-geist font-semibold transition-colors ${
                  form.supervisorNotified
                    ? "bg-icm-green text-white border-icm-green"
                    : "border-icm-border text-icm-text-dim hover:border-icm-text/40"
                }`}
              >
                {form.supervisorNotified ? "Yes" : "No"}
              </button>
              {form.supervisorNotified && (
                <input
                  value={form.supervisorName}
                  onChange={(e) => set("supervisorName", e.target.value)}
                  placeholder="Supervisor name"
                  className={inputCls}
                />
              )}
            </div>
          </Field>
          <Field label="Resolution Status" required>
            <div className="relative">
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as OnCallStatus)}
                className={selectCls}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint pointer-events-none" />
            </div>
          </Field>
        </SectionCard>

        {/* Follow-up */}
        <SectionCard title="Follow-Up">
          <Field label="Follow-Up Required?">
            <button
              type="button"
              onClick={() => set("followUpRequired", !form.followUpRequired)}
              className={`h-10 px-4 rounded-lg border text-[12px] font-geist font-semibold transition-colors ${
                form.followUpRequired
                  ? "bg-icm-accent text-white border-icm-accent"
                  : "border-icm-border text-icm-text-dim hover:border-icm-text/40"
              }`}
            >
              {form.followUpRequired ? "Yes — follow-up needed" : "No follow-up needed"}
            </button>
          </Field>
          <div />
          {form.followUpRequired && (
            <>
              <Field label="Follow-Up By">
                <input
                  value={form.followUpBy}
                  onChange={(e) => set("followUpBy", e.target.value)}
                  placeholder="Staff member responsible"
                  className={inputCls}
                />
              </Field>
              <Field label="Follow-Up Due Date">
                <input
                  type="date"
                  value={form.followUpDue}
                  onChange={(e) => set("followUpDue", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </>
          )}
          <div className="md:col-span-2">
            <Field label="Additional Notes">
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Anything else worth documenting for the daytime team…"
                className={textareaCls}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Footer actions (mirror top) */}
        <div className="flex items-center justify-end gap-2 pb-4">
          <button
            onClick={() => navigate("/oncall-log")}
            className="h-9 px-3.5 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSave(true)}
            className="h-9 px-3.5 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave(false)}
            className="h-9 px-3.5 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-medium flex items-center gap-1.5 hover:bg-teal-700"
          >
            <Save className="w-3.5 h-3.5" /> Submit Log
          </button>
        </div>
      </div>
    </ICMShell>
  );
};

export default OnCallLogNew;
