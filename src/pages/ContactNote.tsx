import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { getPerson } from "@/data/people";
import { people } from "@/data/people";
import { Plus, Eye, Printer, Trash2, X, Search, Check, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";




interface ContactNote {
  id: string;
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
}

const seedNotes: ContactNote[] = [
  {
    id: "cn-001",
    person: "Daniel Okafor",
    activityType: "Face-to-face Visit",
    billable: true,
    date: "2026-02-22",
    start: "10:30",
    end: "11:30",
    contactType: "In-person",
    purpose: "Monthly monitoring",
    background: "Recent med change.",
    present: "Daniel, Kathy (CM)",
    details: "Reviewed daily routine, no concerns reported.",
    issues: "None",
    nextSteps: "Follow up in 2 weeks.",
    status: "Signed",
    updatedBy: "Kathy Adams",
    updatedOn: "2026-02-22 11:42",
  },
  {
    id: "cn-002",
    person: "Aisha Boateng",
    activityType: "Phone Check-in",
    billable: false,
    nonBillableReason: "Under 15 minutes",
    date: "2026-02-23",
    start: "09:15",
    end: "09:25",
    contactType: "Phone",
    purpose: "ISP renewal coordination",
    background: "ISP renewal due.",
    present: "Aisha",
    details: "Confirmed availability for next week.",
    issues: "—",
    nextSteps: "Schedule ISP meeting.",
    status: "Draft",
    updatedBy: "Kathy Adams",
    updatedOn: "2026-02-23 09:30",
  },
];

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
  const [notes, setNotes] = useState<ContactNote[]>(seedNotes);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<ContactNote>>({
    billable: true,
    status: "Draft",
    date: new Date().toISOString().slice(0, 10),
  });

  const handleSave = () => {
    if (!form.person || !form.activityType) {
      toast({ title: "Missing fields", description: "Person and Activity Type are required." });
      return;
    }
    const newNote: ContactNote = {
      id: `cn-${String(notes.length + 1).padStart(3, "0")}`,
      person: form.person!,
      activityType: form.activityType!,
      billable: !!form.billable,
      nonBillableReason: form.billable ? undefined : form.nonBillableReason || "",
      date: form.date || new Date().toISOString().slice(0, 10),
      start: form.start || "",
      end: form.end || "",
      contactType: form.contactType || "In-person",
      purpose: form.purpose || "",
      background: form.background || "",
      present: form.present || "",
      details: form.details || "",
      issues: form.issues || "",
      nextSteps: form.nextSteps || "",
      status: (form.status as ContactNote["status"]) || "Draft",
      updatedBy: "Kathy Adams",
      updatedOn: new Date().toISOString().slice(0, 16).replace("T", " "),
    };
    setNotes([newNote, ...notes]);
    setOpen(false);
    setForm({ billable: true, status: "Draft", date: new Date().toISOString().slice(0, 10) });
    toast({ title: "Contact Note saved", description: `${newNote.person} · ${newNote.activityType}` });
  };

  const handleDelete = (id: string) => {
    setNotes((n) => n.filter((x) => x.id !== id));
    toast({ title: "Deleted", description: "Contact note removed." });
  };

  const set = <K extends keyof ContactNote>(k: K, v: ContactNote[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <ICMShell title="Contact Note" showAIPanel={false}>
      <div className="space-y-5">
        <ContactNoteCrumbs />
        <div className="flex items-center justify-between">

          <div>
            <h1 className="font-tight text-[24px] font-semibold text-icm-text leading-tight tracking-[-0.02em]">
              Contact Note
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1">
              Unified module — replaces Activity Note and Billable Activity Note.
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="h-9 px-3.5 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-medium flex items-center gap-1.5 hover:bg-teal-700"
          >
            <Plus className="w-3.5 h-3.5" /> New Contact Note
          </button>
        </div>

        {/* List */}
        <div className="rounded-[12px] border border-icm-border bg-icm-panel overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim uppercase tracking-wide text-[10px]">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Date</th>
                <th className="text-left px-4 py-2.5 font-medium">Person</th>
                <th className="text-left px-4 py-2.5 font-medium">Activity Type</th>
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
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        n.billable ? "bg-icm-green-soft text-icm-green" : "bg-icm-bg text-icm-text-dim"
                      }`}
                    >
                      {n.billable ? "Billable" : "Non-billable"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        n.status === "Signed"
                          ? "bg-icm-green-soft text-icm-green"
                          : n.status === "Submitted"
                          ? "bg-icm-accent-soft text-icm-accent"
                          : "bg-icm-amber-soft text-icm-amber"
                      }`}
                    >
                      {n.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-icm-text-faint">
                    {n.updatedOn} · {n.updatedBy}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => toast({ title: "Open", description: `Viewing ${n.id}` })}
                        className="w-7 h-7 rounded-md hover:bg-icm-bg text-icm-text-dim hover:text-icm-text flex items-center justify-center"
                        title="View"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toast({ title: "Print", description: `Preparing ${n.id}` })}
                        className="w-7 h-7 rounded-md hover:bg-icm-bg text-icm-text-dim hover:text-icm-text flex items-center justify-center"
                        title="Print"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="w-7 h-7 rounded-md hover:bg-icm-red-soft text-icm-text-dim hover:text-icm-red flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {notes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-icm-text-faint">
                    No contact notes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-icm-text/40 flex items-center justify-center p-6">
          <div className="bg-icm-panel rounded-[12px] border border-icm-border w-full max-w-[720px] max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-icm-border">
              <h2 className="font-tight font-semibold text-[16px] text-icm-text">New Contact Note</h2>
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
                    onChange={(name) => set("person", name)}
                  />
                </Field>

                <Field label="Activity Type" required>
                  <select value={form.activityType || ""} onChange={(e) => set("activityType", e.target.value)} className={inputCls}>
                    <option value="">Select…</option>
                    {activityTypes.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Is Billable">
                  <div className="flex items-center gap-2 h-9">
                    <button
                      onClick={() => set("billable", true)}
                      className={`px-3 h-8 rounded-lg text-[12px] font-medium border ${
                        form.billable ? "bg-icm-green-soft border-icm-green text-icm-green" : "border-icm-border text-icm-text-dim"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => set("billable", false)}
                      className={`px-3 h-8 rounded-lg text-[12px] font-medium border ${
                        !form.billable ? "bg-icm-bg border-icm-border-strong text-icm-text" : "border-icm-border text-icm-text-dim"
                      }`}
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
                    {contactTypes.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
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
                <select value={form.status || "Draft"} onChange={(e) => set("status", e.target.value as ContactNote["status"])} className={inputCls}>
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
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="h-9 px-4 rounded-lg bg-teal-600 text-white text-[12px] font-medium hover:bg-teal-700"
              >
                Save Contact Note
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
  const person = id ? getPerson(id) : undefined;
  if (!person) {
    return (
      <Breadcrumbs items={[{ label: "People Supported", to: "/people" }, { label: "Contact Note" }]} />
    );
  }
  return (
    <Breadcrumbs
      backTo={`/people/${person.id}/echart`}
      backLabel="eChart"
      items={[
        { label: "People Supported", to: "/people" },
        { label: `${person.firstName} ${person.lastName}`, to: `/people/${person.id}/echart` },
        { label: "Contact Note" },
      ]}
    />
  );
}

function PersonSearchSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
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
  const options = people
    .map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, sub: p.county }))
    .filter((o) => !q || o.name.toLowerCase().includes(q));

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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
                      onChange(o.name);
                      setOpen(false);
                      setQuery("");
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


