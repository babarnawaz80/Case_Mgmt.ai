import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { useIndividual } from "@/hooks/useIndividuals";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Edit2, Check, Printer, Save, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContactNoteDoc {
  id: string;
  individualId?: string;
  individualName?: string;
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
  createdAt?: any;
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

const inputCls =
  "w-full h-9 px-3 rounded-lg bg-icm-panel border border-icm-border text-[12.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong";
const textareaCls =
  "w-full px-3 py-2 rounded-lg bg-icm-panel border border-icm-border text-[12.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong resize-none";

const ContactNoteDetail = () => {
  const { id, noteId } = useParams<{ id: string; noteId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { individual } = useIndividual(id);

  const [note, setNote] = useState<ContactNoteDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [form, setForm] = useState<Partial<ContactNoteDoc>>({});

  // Fetch the contact note details
  useEffect(() => {
    if (!noteId) return;
    const fetchNote = async () => {
      try {
        const docRef = doc(db, "contact_notes", noteId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const d = docSnap.data();
          const loaded: ContactNoteDoc = {
            id: docSnap.id,
            individualId: d.individualId ?? d.individual_id,
            individualName: d.individualName ?? d.individual_name ?? d.person ?? "",
            person: d.person ?? d.individual_name ?? "",
            activityType: d.activityType ?? d.activity_type ?? "",
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
            createdAt: d.createdAt ?? d.created_at ?? null,
          };
          setNote(loaded);
          setForm(loaded);
        } else {
          toast.error("Contact note not found.");
        }
      } catch (err) {
        console.error("Error fetching contact note:", err);
        toast.error("Failed to load contact note.");
      } finally {
        setLoading(false);
      }
    };
    fetchNote();
  }, [noteId]);

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    if (!noteId || !userProfile?.organizationId) return;
    if (!form.activityType) {
      toast.error("Activity Type is required.");
      return;
    }
    setSaving(true);
    const now = new Date();
    const updatedOn = now.toISOString().slice(0, 16).replace("T", " ");
    try {
      const updatedFields = {
        activityType: form.activityType,
        activity_type: form.activityType,
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
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      await updateDoc(doc(db, "contact_notes", noteId), updatedFields);
      toast.success("Contact note updated successfully.");
      setNote((prev) => (prev ? { ...prev, ...updatedFields } : null));
      setEditing(false);
    } catch (err) {
      console.error("Error updating contact note:", err);
      toast.error("Failed to update contact note.");
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    if (!noteId) return;
    setSigning(true);
    const now = new Date();
    const updatedOn = now.toISOString().slice(0, 16).replace("T", " ");
    try {
      await updateDoc(doc(db, "contact_notes", noteId), {
        status: "Signed",
        updatedBy: userProfile?.displayName ?? "Unknown",
        updatedOn,
        updatedAt: serverTimestamp(),
      });
      toast.success("Contact note signed successfully.");
      setNote((prev) => (prev ? { ...prev, status: "Signed", updatedOn, updatedBy: userProfile?.displayName ?? "Unknown" } : null));
    } catch (err) {
      console.error("Error signing contact note:", err);
      toast.error("Failed to sign contact note.");
    } finally {
      setSigning(false);
    }
  };

  const setField = <K extends keyof ContactNoteDoc>(k: K, v: ContactNoteDoc[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const formatDate = (ts: any) => {
    if (!ts) return "—";
    if (ts?.toDate) return ts.toDate().toLocaleDateString("en-US");
    if (ts instanceof Date) return ts.toLocaleDateString("en-US");
    return String(ts);
  };

  if (loading) {
    return (
      <ICMShell title="Contact Note Details" showAIPanel={false}>
        <div className="flex items-center justify-center py-20 gap-2 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading contact note details…</span>
        </div>
      </ICMShell>
    );
  }

  if (!note) {
    return (
      <ICMShell title="Contact Note Details" showAIPanel={false}>
        <div className="text-center py-20 text-icm-text-dim">
          <p className="text-[14px]">Contact note not found.</p>
          <button
            onClick={() => navigate(`/people/${id}/contact-note`)}
            className="mt-4 h-9 px-4 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-medium"
          >
            Back to Contact Notes
          </button>
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="Contact Note Details" showAIPanel={false}>
      {/* Printable CSS injected directly */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          /* Hide everything in the layout by default */
          .no-print,
          header,
          nav,
          button,
          .breadcrumbs-container,
          [class*="Topbar"],
          [class*="AIPanel"],
          .flex.items-center.justify-between.gap-3.no-print {
            display: none !important;
          }
          /* Target printable note container */
          #printable-note-content {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            position: absolute;
            left: 0;
            top: 0;
          }
          /* Ensure text colors are black for readability when printing */
          #printable-note-content * {
            color: black !important;
            background: transparent !important;
            border-color: #e5e7eb !important;
          }
        }
      `}</style>

      <div className="space-y-5">
        {/* Breadcrumbs (no-print) */}
        <div className="no-print">
          <Breadcrumbs
            backTo={`/people/${id}/contact-note`}
            backLabel="Contact Notes"
            items={[
              { label: "People Supported", to: "/people" },
              { label: individual ? `${individual.first_name} ${individual.last_name}` : "Profile", to: `/people/${id}/echart` },
              { label: "Contact Notes", to: `/people/${id}/contact-note` },
              { label: "Contact Note Details" },
            ]}
          />
        </div>

        {/* Header Actions (no-print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <button
            onClick={() => navigate(`/people/${id}/contact-note`)}
            className="h-9 px-3 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="h-9 px-3 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print Note
            </button>

            {note.status !== "Signed" && !editing && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="h-9 px-3 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text flex items-center gap-1.5"
                >
                  <Edit2 className="w-4 h-4 text-teal-600" /> Edit Note
                </button>
                <button
                  onClick={handleSign}
                  disabled={signing}
                  className="h-9 px-3.5 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-medium flex items-center gap-1.5 hover:bg-teal-700 disabled:opacity-60"
                >
                  {signing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {signing ? "Signing…" : "Sign Note"}
                </button>
              </>
            )}

            {editing && (
              <>
                <button
                  onClick={() => {
                    setEditing(false);
                    setForm(note);
                  }}
                  className="h-9 px-3 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-9 px-3.5 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-medium flex items-center gap-1.5 hover:bg-teal-700 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Printable Contact Note Content */}
        <div
          id="printable-note-content"
          className="rounded-[12px] border border-icm-border bg-icm-panel p-6 space-y-6"
        >
          {/* Print Only Header */}
          <div className="hidden print:block border-b border-gray-300 pb-4 mb-4">
            <h1 className="text-2xl font-bold text-black uppercase">CaseManagement.AI</h1>
            <p className="text-sm text-gray-600">HIPAA-Compliant Contact Note Record</p>
          </div>

          <div className="flex items-center justify-between border-b border-icm-border pb-4 flex-wrap gap-3">
            <div>
              <h2 className="font-manrope text-[18px] font-extrabold text-icm-text flex items-center gap-2">
                Contact Note for {note.individualName || note.person}
              </h2>
              <p className="text-[12.5px] text-icm-text-dim font-geist mt-0.5">
                Status:{" "}
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
                    note.status === "Signed"
                      ? "bg-icm-green-soft text-icm-green"
                      : note.status === "Submitted"
                      ? "bg-icm-accent-soft text-icm-accent"
                      : "bg-icm-amber-soft text-icm-amber"
                  )}
                >
                  {note.status}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-mono text-icm-text-dim">
                Created: {formatDate(note.createdAt)}
              </p>
              <p className="text-[11.5px] text-icm-text-faint font-geist mt-0.5">
                Last updated: {note.updatedOn} by {note.updatedBy || "System"}
              </p>
            </div>
          </div>

          {editing ? (
            // Edit Mode Form
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Person Supported">
                <input
                  type="text"
                  disabled
                  value={form.individualName || form.person}
                  className={cn(inputCls, "opacity-60 cursor-not-allowed")}
                />
              </Field>

              <Field label="Activity Type" required>
                <select
                  value={form.activityType || ""}
                  onChange={(e) => setField("activityType", e.target.value)}
                  className={inputCls}
                >
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
                    onClick={() => setField("billable", true)}
                    className={cn(
                      "px-3 h-8 rounded-lg text-[12px] font-medium border",
                      form.billable
                        ? "bg-icm-green-soft border-icm-green text-icm-green"
                        : "border-icm-border text-icm-text-dim"
                    )}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setField("billable", false)}
                    className={cn(
                      "px-3 h-8 rounded-lg text-[12px] font-medium border",
                      !form.billable
                        ? "bg-icm-bg border-icm-border-strong text-icm-text"
                        : "border-icm-border text-icm-text-dim"
                    )}
                  >
                    No
                  </button>
                </div>
              </Field>

              {!form.billable && (
                <Field label="Non-Billable Reason">
                  <input
                    value={form.nonBillableReason || ""}
                    onChange={(e) => setField("nonBillableReason", e.target.value)}
                    placeholder="e.g. Under 15 minutes"
                    className={inputCls}
                  />
                </Field>
              )}

              <Field label="Activity Date">
                <input
                  type="date"
                  value={form.date || ""}
                  onChange={(e) => setField("date", e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="Contact Type">
                <select
                  value={form.contactType || ""}
                  onChange={(e) => setField("contactType", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select…</option>
                  {contactTypes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Start Time">
                <input
                  type="time"
                  value={form.start || ""}
                  onChange={(e) => setField("start", e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="End Time">
                <input
                  type="time"
                  value={form.end || ""}
                  onChange={(e) => setField("end", e.target.value)}
                  className={inputCls}
                />
              </Field>

              <div className="md:col-span-2 space-y-4">
                <Field label="Purpose of Activity">
                  <textarea
                    value={form.purpose || ""}
                    onChange={(e) => setField("purpose", e.target.value)}
                    className={textareaCls}
                    rows={2}
                  />
                </Field>
                <Field label="Relevant Background / Circumstances">
                  <textarea
                    value={form.background || ""}
                    onChange={(e) => setField("background", e.target.value)}
                    className={textareaCls}
                    rows={2}
                  />
                </Field>
                <Field label="Who Was Present">
                  <input
                    value={form.present || ""}
                    onChange={(e) => setField("present", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Details of Activity">
                  <textarea
                    value={form.details || ""}
                    onChange={(e) => setField("details", e.target.value)}
                    className={textareaCls}
                    rows={3}
                  />
                </Field>
                <Field label="Issues / Concerns / Challenges">
                  <textarea
                    value={form.issues || ""}
                    onChange={(e) => setField("issues", e.target.value)}
                    className={textareaCls}
                    rows={2}
                  />
                </Field>
                <Field label="Next Steps and Follow Up Plans">
                  <textarea
                    value={form.nextSteps || ""}
                    onChange={(e) => setField("nextSteps", e.target.value)}
                    className={textareaCls}
                    rows={2}
                  />
                </Field>
              </div>
            </div>
          ) : (
            // Read-Only Display Mode
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-icm-bg/20 p-4 rounded-xl border border-icm-border">
                <DetailItem label="Person Supported" value={note.individualName || note.person} />
                <DetailItem label="Activity Type" value={note.activityType} />
                <DetailItem
                  label="Billing Status"
                  value={
                    note.billable
                      ? "Billable"
                      : `Non-billable ${note.nonBillableReason ? `(${note.nonBillableReason})` : ""}`
                  }
                />
                <DetailItem label="Activity Date" value={note.date} />
                <DetailItem label="Contact Type" value={note.contactType} />
                <DetailItem label="Start Time" value={note.start || "—"} />
                <DetailItem label="End Time" value={note.end || "—"} />
                <DetailItem label="Who Was Present" value={note.present || "—"} />
              </div>

              <div className="space-y-4">
                <DetailBlock label="Purpose of Activity" value={note.purpose} />
                <DetailBlock label="Relevant Background / Circumstances" value={note.background} />
                <DetailBlock label="Details of Activity" value={note.details} />
                <DetailBlock label="Issues / Concerns / Challenges" value={note.issues} />
                <DetailBlock label="Next Steps and Follow Up Plans" value={note.nextSteps} />
              </div>

              {note.status === "Signed" && (
                <div className="border-t border-icm-border pt-4 mt-6">
                  <div className="rounded-xl bg-icm-green-soft/30 border border-icm-green/20 p-4 flex items-center gap-3">
                    <Check className="w-5 h-5 text-icm-green shrink-0" />
                    <div>
                      <p className="text-[12.5px] font-semibold text-icm-text">
                        Electronically Signed
                      </p>
                      <p className="text-[11.5px] text-icm-text-dim">
                        Signed by {note.updatedBy} on {note.updatedOn}.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ICMShell>
  );
};

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

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] uppercase tracking-wider text-icm-text-faint font-geist font-semibold">
        {label}
      </span>
      <span className="text-[13px] font-geist text-icm-text font-medium mt-0.5 block">
        {value}
      </span>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <span className="block text-[10.5px] uppercase tracking-wider text-icm-text-faint font-geist font-semibold border-b border-icm-border pb-1.5 mb-2.5">
        {label}
      </span>
      <p className="text-[12.5px] font-geist text-icm-text leading-relaxed whitespace-pre-wrap">
        {value || "—"}
      </p>
    </div>
  );
}

export default ContactNoteDetail;
