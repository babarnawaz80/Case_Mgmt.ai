import { useState, useRef, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { useIndividual, useIndividuals } from "@/hooks/useIndividuals";
import { Plus, Eye, Printer, Trash2, X, Search, Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection, addDoc, onSnapshot, query, where,
  serverTimestamp, orderBy, type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ContactNoteDoc {
  id: string;
  individualId?: string;
  person: string;
  activityType: string;
  billable: boolean;
  nonBillableReason?: string;
  date: string;
  start: string;
  end: string;
  contactType: string;
  purpose: string;
  background: string;
  present: string;
  details: string;
  issues: string;
  nextSteps: string;
  status: "Draft" | "Submitted" | "Signed";
  updatedBy: string;
  updatedOn: string;
  organizationId?: string;
  createdAt?: unknown;
}

function toNote(id: string, d: DocumentData): ContactNoteDoc {
  return {
    id,
    individualId: d.individualId,
    person: d.person ?? "",
    activityType: d.activityType ?? "",
    billable: d.billable ?? true,
    nonBillableReason: d.nonBillableReason,
    date: d.date ?? "",
    start: d.start ?? "",
    end: d.end ?? "",
    contactType: d.contactType ?? "In-person",
    purpose: d.purpose ?? "",
    background: d.background ?? "",
    present: d.present ?? "",
    details: d.details ?? "",
    issues: d.issues ?? "",
    nextSteps: d.nextSteps ?? "",
    status: d.status ?? "Draft",
    updatedBy: d.updatedBy ?? "",
    updatedOn: d.updatedOn ?? "",
    organizationId: d.organizationId,
    createdAt: d.createdAt,
  };
}

const activityTypes = [
  "Face-to-face Visit",
  "Phone Check-in",
  "Care Coordination",
  "Documentation",
  "Team Meeting",
  "Training",
  "Other",
];
const contactTypes = ["In-person", "Phone", "Video", "Email", "Other"];

const ContactNote = () => {
  const { userProfile } = useAuth();
  const [notes, setNotes] = useState<ContactNoteDoc[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<ContactNoteDoc>>({
    billable: true,
    status: "Draft",
    date: new Date().toISOString().slice(0, 10),
  });

  // Load notes from Firestore
  useEffect(() => {
    if (!userProfile?.organizationId) return;
    setNotesLoading(true);

    let q;
    try {
      q = query(
        collection(db, "contact_notes"),
        where("organizationId", "==", userProfile.organizationId),
        orderBy("createdAt", "desc"),
      );
    } catch {
      q = query(
        collection(db, "contact_notes"),
        where("organizationId", "==", userProfile.organizationId),
      );
    }

    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotes(snap.docs.map((d) => toNote(d.id, d.data())));
        setNotesLoading(false);
      },
      (err) => {
        console.warn("[contact_notes]", err.message);
        // Fallback without orderBy
        const fallback = query(
          collection(db, "contact_notes"),
          where("organizationId", "==", userProfile.organizationId),
        );
        onSnapshot(fallback, (snap) => {
          const sorted = snap.docs
            .map((d) => toNote(d.id, d.data()))
            .sort((a, b) => b.date.localeCompare(a.date));
          setNotes(sorted);
          setNotesLoading(false);
        });
      },
    );
    return unsub;
  }, [userProfile?.organizationId]);

  const handleSave = async () => {
    if (!form.person || !form.activityType) {
      toast.error("Person and Activity Type are required.");
      return;
    }
    if (!userProfile?.organizationId) {
      toast.error("Not authenticated.");
      return;
    }
    setSaving(true);
    const now = new Date();
    const updatedOn = now.toISOString().slice(0, 16).replace("T", " ");
    try {
      await addDoc(collection(db, "contact_notes"), {
        individualId: form.individualId ?? null,
        person: form.person,
        activityType: form.activityType,
        billable: !!form.billable,
        nonBillableReason: form.billable ? null : (form.nonBillableReason || ""),
        date: form.date || now.toISOString().slice(0, 10),
        start: form.start || "",
        end: form.end || "",
        contactType: form.contactType || "In-person",
        purpose: form.purpose || "",
        background: form.background || "",
        present: form.present || "",
        details: form.details || "",
        issues: form.issues || "",
        nextSteps: form.nextSteps || "",
        status: form.status || "Draft",
        updatedBy: userProfile.displayName ?? "Unknown",
        updatedOn,
        organizationId: userProfile.organizationId,
        createdAt: serverTimestamp(),
      });
      toast.success(`Contact note saved — ${form.person} · ${form.activityType}`);
      setOpen(false);
      setForm({ billable: true, status: "Draft", date: new Date().toISOString().slice(0, 10) });
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save contact note. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof ContactNoteDoc>(k: K, v: ContactNoteDoc[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <ICMShell title="Contact Note" showAIPanel={false}>
      <div className="space-y-5">
        <ContactNoteCrumbs />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-manrope text-[24px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Contact Notes
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1">
              Unified contact log — live from Firestore. Replaces Activity Note and Billable Activity Note.
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="h-9 px-3.5 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-medium flex items-center gap-1.5 hover:bg-teal-700 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> New Contact Note
          </button>
        </div>

        {/* Summary bar */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Total", value: notes.length, cls: "bg-icm-bg text-icm-text-dim ring-icm-border" },
            { label: "Draft", value: notes.filter((n) => n.status === "Draft").length, cls: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20" },
            { label: "Submitted", value: notes.filter((n) => n.status === "Submitted").length, cls: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20" },
            { label: "Signed", value: notes.filter((n) => n.status === "Signed").length, cls: "bg-icm-green-soft text-icm-green ring-icm-green/20" },
          ].map((chip) => (
            <div key={chip.label} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ring-1 ${chip.cls}`}>
              <span className="text-[10px] uppercase tracking-wide font-geist font-semibold opacity-70">{chip.label}</span>
              <span className="text-[12px] font-mono font-semibold">{chip.value}</span>
            </div>
          ))}
        </div>

        {/* List */}
        {notesLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-icm-text-dim">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[12px] font-geist">Loading contact notes…</span>
          </div>
        ) : (
          <div className="rounded-[12px] border border-icm-border bg-icm-panel overflow-x-auto">
            <table className="w-full min-w-[720px] text-[12px] font-geist">
              <thead className="bg-icm-bg text-icm-text-dim uppercase tracking-wide text-[10px]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium">Person</th>
                  <th className="text-left px-4 py-2.5 font-medium">Activity Type</th>
                  <th className="text-left px-4 py-2.5 font-medium">Contact Type</th>
                  <th className="text-left px-4 py-2.5 font-medium">Billable</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium">Updated</th>
                  <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-icm-border">
                {notes.map((n) => (
                  <tr key={n.id} className="hover:bg-icm-bg/60">
                    <td className="px-4 py-3 font-mono text-icm-text">{n.date}</td>
                    <td className="px-4 py-3 text-icm-text font-medium">{n.person}</td>
                    <td className="px-4 py-3 text-icm-text-dim">{n.activityType}</td>
                    <td className="px-4 py-3 text-icm-text-dim">{n.contactType}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${n.billable ? "bg-icm-green-soft text-icm-green" : "bg-icm-bg text-icm-text-dim"}`}>
                        {n.billable ? "Billable" : "Non-billable"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${n.status === "Signed" ? "bg-icm-green-soft text-icm-green" : n.status === "Submitted" ? "bg-icm-accent-soft text-icm-accent" : "bg-icm-amber-soft text-icm-amber"}`}>
                        {n.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-icm-text-faint">
                      {n.updatedOn} · {n.updatedBy}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => toast.info(`Viewing note for ${n.person}`)}
                          className="w-7 h-7 rounded-md hover:bg-icm-bg text-icm-text-dim hover:text-icm-text flex items-center justify-center"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toast.info(`Print note for ${n.person}`)}
                          className="w-7 h-7 rounded-md hover:bg-icm-bg text-icm-text-dim hover:text-icm-text flex items-center justify-center"
                          title="Print"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {notes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-icm-text-faint">
                      No contact notes yet. Click "New Contact Note" to add the first one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {notes.length > 0 && (
              <div className="px-4 py-2 border-t border-icm-border bg-icm-bg/30 flex items-center justify-between">
                <span className="text-[10.5px] font-geist text-icm-text-faint">{notes.length} note{notes.length !== 1 ? "s" : ""} total</span>
                <span className="text-[10px] font-mono text-icm-text-faint">Live Firestore</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Note Modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-icm-text/40 flex items-center justify-center p-6">
          <div className="bg-icm-panel rounded-[12px] border border-icm-border w-full max-w-[720px] max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-icm-border">
              <h2 className="font-manrope font-extrabold text-[16px] text-icm-text">New Contact Note</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-md hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Person Supported" required>
                  <PersonSearchSelect
                    value={form.person || ""}
                    onChange={(name, id) => setForm((f) => ({ ...f, person: name, individualId: id }))}
                  />
                </Field>

                <Field label="Activity Type" required>
                  <select value={form.activityType || ""} onChange={(e) => set("activityType", e.target.value)} className={inputCls}>
                    <option value="">Select…</option>
                    {activityTypes.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </Field>

                <Field label="Is Billable">
                  <div className="flex items-center gap-2 h-9">
                    <button
                      onClick={() => set("billable", true)}
                      className={`px-3 h-8 rounded-lg text-[12px] font-medium border ${form.billable ? "bg-icm-green-soft border-icm-green text-icm-green" : "border-icm-border text-icm-text-dim"}`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => set("billable", false)}
                      className={`px-3 h-8 rounded-lg text-[12px] font-medium border ${!form.billable ? "bg-icm-bg border-icm-border-strong text-icm-text" : "border-icm-border text-icm-text-dim"}`}
                    >
                      No
                    </button>
                  </div>
                </Field>

                {!form.billable && (
                  <Field label="Non-Billable Reason">
                    <input
                      value={form.nonBillableReason || ""}
                      onChange={(e) => set("nonBillableReason", e.target.value)}
                      placeholder="e.g. Under 15 minutes"
                      className={inputCls}
                    />
                  </Field>
                )}

                <Field label="Activity Date">
                  <input type="date" value={form.date || ""} onChange={(e) => set("date", e.target.value)} className={inputCls} />
                </Field>

                <Field label="Contact Type">
                  <select value={form.contactType || ""} onChange={(e) => set("contactType", e.target.value)} className={inputCls}>
                    <option value="">Select…</option>
                    {contactTypes.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>

                <Field label="Start Time">
                  <input type="time" value={form.start || ""} onChange={(e) => set("start", e.target.value)} className={inputCls} />
                </Field>

                <Field label="End Time">
                  <input type="time" value={form.end || ""} onChange={(e) => set("end", e.target.value)} className={inputCls} />
                </Field>
              </div>

              <Field label="Purpose of Activity">
                <textarea value={form.purpose || ""} onChange={(e) => set("purpose", e.target.value)} className={textareaCls} rows={2} />
              </Field>
              <Field label="Relevant Background / Circumstances">
                <textarea value={form.background || ""} onChange={(e) => set("background", e.target.value)} className={textareaCls} rows={2} />
              </Field>
              <Field label="Who Was Present">
                <input value={form.present || ""} onChange={(e) => set("present", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Details of Activity">
                <textarea value={form.details || ""} onChange={(e) => set("details", e.target.value)} className={textareaCls} rows={3} />
              </Field>
              <Field label="Issues / Concerns / Challenges">
                <textarea value={form.issues || ""} onChange={(e) => set("issues", e.target.value)} className={textareaCls} rows={2} />
              </Field>
              <Field label="Next Steps and Follow Up Plans">
                <textarea value={form.nextSteps || ""} onChange={(e) => set("nextSteps", e.target.value)} className={textareaCls} rows={2} />
              </Field>
              <Field label="Status">
                <select value={form.status || "Draft"} onChange={(e) => set("status", e.target.value as ContactNoteDoc["status"])} className={inputCls}>
                  <option>Draft</option>
                  <option>Submitted</option>
                  <option>Signed</option>
                </select>
              </Field>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-icm-border">
              <button
                onClick={() => setOpen(false)}
                className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:bg-icm-bg"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-9 px-4 rounded-lg bg-teal-600 text-white text-[12px] font-medium hover:bg-teal-700 disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? "Saving…" : "Save Contact Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ICMShell>
  );
};

const inputCls =
  "w-full h-9 px-3 rounded-lg bg-icm-panel border border-icm-border text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong";
const textareaCls =
  "w-full px-3 py-2 rounded-lg bg-icm-panel border border-icm-border text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong resize-none";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wide text-icm-text-faint font-geist font-medium mb-1.5">
        {label} {required && <span className="text-icm-red">*</span>}
      </label>
      {children}
    </div>
  );
}

function ContactNoteCrumbs() {
  const { id } = useParams<{ id: string }>();
  const { individual } = useIndividual(id);
  if (!id || !individual) {
    return (
      <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Contact Notes" }]} />
    );
  }
  return (
    <Breadcrumbs
      backTo={`/people/${individual.id}/echart`}
      backLabel="eChart"
      items={[
        { label: "People Supported", to: "/people" },
        { label: `${individual.first_name} ${individual.last_name}`, to: `/people/${individual.id}/echart` },
        { label: "Contact Notes" },
      ]}
    />
  );
}

function PersonSearchSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string, id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [queryStr, setQueryStr] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const { individuals } = useIndividuals();

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const q = queryStr.trim().toLowerCase();
  const options = useMemo(
    () =>
      individuals
        .map((p) => ({ id: p.id, name: `${p.first_name} ${p.last_name}`, sub: p.county ?? "" }))
        .filter((o) => !q || o.name.toLowerCase().includes(q)),
    [individuals, q],
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} flex items-center justify-between text-left`}
      >
        <span className={value ? "text-icm-text" : "text-icm-text-faint"}>
          {value || "Search person…"}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-icm-text-faint shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-icm-border bg-icm-panel shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 h-9 border-b border-icm-border">
            <Search className="w-3.5 h-3.5 text-icm-text-faint" />
            <input
              autoFocus
              value={queryStr}
              onChange={(e) => setQueryStr(e.target.value)}
              placeholder="Search person…"
              className="flex-1 bg-transparent text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none"
            />
          </div>
          <div className="max-h-[220px] overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-icm-text-faint">No matches.</div>
            ) : (
              options.map((o) => {
                const selected = o.name === value;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      onChange(o.name, o.id);
                      setOpen(false);
                      setQueryStr("");
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-[12px] font-geist text-icm-text hover:bg-icm-bg"
                  >
                    <span className="truncate">
                      {o.name}
                      <span className="text-icm-text-faint"> · {o.sub}</span>
                    </span>
                    {selected && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
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

export default ContactNote;
