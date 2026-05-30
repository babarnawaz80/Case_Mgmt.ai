// TrainingRecordsSection — Staff training & certification tracker
// Embedded in the Compliance & Training sub-tab of the user profile.

import { useState, useEffect, useRef } from "react";
import {
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, orderBy,
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, Pencil, Trash2, RefreshCw, FileText, CheckCircle2,
  AlertTriangle, Clock, X, Upload, Loader2, ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrainingRecord {
  id: string;
  userId: string;
  organizationId: string;
  trainingTypeName: string;
  category: string;
  isRequired: boolean;
  completionDate: string;
  expirationDate: string | null;
  recurringFrequencyDays: number | null;
  completedBy: "self" | "external" | "admin";
  verifiedByName: string;
  trainingProvider: string;
  certificateUrl: string | null;
  notes: string;
  status: "current" | "expiring_soon" | "expired" | "no_expiration";
}

const BUILT_IN_TRAININGS = [
  { name: "HIPAA Privacy & Security", category: "Compliance", defaultDays: 365 },
  { name: "First Aid / CPR", category: "Safety", defaultDays: 730 },
  { name: "Mandatory Reporter", category: "Legal", defaultDays: 365 },
  { name: "Crisis Prevention (CPI/MANDT)", category: "Clinical", defaultDays: 365 },
  { name: "Medication Administration", category: "Clinical", defaultDays: 365 },
  { name: "Defensive Driving", category: "Safety", defaultDays: 1095 },
  { name: "Person-Centered Planning", category: "Clinical", defaultDays: 730 },
  { name: "Positive Behavioral Supports", category: "Clinical", defaultDays: 365 },
  { name: "IDD Waiver Overview", category: "Compliance", defaultDays: null },
  { name: "CaseManagement.AI Platform Training", category: "Technology", defaultDays: null },
  { name: "Background Check", category: "Compliance", defaultDays: 730 },
  { name: "Abuse/Neglect Recognition", category: "Legal", defaultDays: 365 },
];

const CATEGORIES = ["Compliance", "Safety", "Clinical", "Legal", "Technology", "Leadership", "Other"];

function getStatus(record: Omit<TrainingRecord, "status" | "id">): TrainingRecord["status"] {
  if (!record.expirationDate) return "no_expiration";
  const days = Math.floor((new Date(record.expirationDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 60) return "expiring_soon";
  return "current";
}

function StatusBadge({ status, expirationDate }: { status: TrainingRecord["status"]; expirationDate: string | null }) {
  const days = expirationDate
    ? Math.floor((new Date(expirationDate).getTime() - Date.now()) / 86400000)
    : null;

  if (status === "no_expiration") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-geist font-bold bg-icm-bg text-icm-text-dim border border-icm-border">
      ○ No Expiration
    </span>
  );
  if (status === "current") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-geist font-bold bg-icm-green-soft text-icm-green">
      ● Current
    </span>
  );
  if (status === "expiring_soon") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-geist font-bold bg-icm-amber-soft text-icm-amber">
      ⚠ Expiring in {days}d
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-geist font-bold bg-icm-red-soft text-icm-red">
      ● Overdue {days !== null ? `(${Math.abs(days)}d ago)` : ""}
    </span>
  );
}

// ─── Training Modal ────────────────────────────────────────────────────────────

interface TrainingModalProps {
  userId: string;
  organizationId: string;
  existing?: TrainingRecord | null;
  renewMode?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function TrainingModal({ userId, organizationId, existing, renewMode, onClose, onSaved }: TrainingModalProps) {
  const [trainingName, setTrainingName] = useState(existing?.trainingTypeName ?? "");
  const [customName, setCustomName] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [category, setCategory] = useState(existing?.category ?? "Compliance");
  const [isRequired, setIsRequired] = useState(existing?.isRequired ?? true);
  const [completionDate, setCompletionDate] = useState(renewMode ? "" : (existing?.completionDate ?? ""));
  const [hasExpiry, setHasExpiry] = useState(existing ? !!existing.expirationDate : true);
  const [expirationDate, setExpirationDate] = useState(renewMode ? "" : (existing?.expirationDate ?? ""));
  const [completedBy, setCompletedBy] = useState<"self" | "external" | "admin">(existing?.completedBy ?? "self");
  const [verifiedByName, setVerifiedByName] = useState(existing?.verifiedByName ?? "");
  const [trainingProvider, setTrainingProvider] = useState(existing?.trainingProvider ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [certificateUrl, setCertificateUrl] = useState(existing?.certificateUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const finalName = showCustom ? customName : trainingName;

  // Auto-fill expiry from built-in
  const handleSelectBuiltIn = (name: string) => {
    setTrainingName(name);
    const found = BUILT_IN_TRAININGS.find(t => t.name === name);
    if (found) {
      setCategory(found.category);
      if (!found.defaultDays) { setHasExpiry(false); }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 10 * 1024 * 1024) { toast.error("Max file size is 10MB"); return; }
    setUploading(true);
    try {
      const path = `certificates/${organizationId}/${userId}/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(sRef, file);
        task.on("state_changed", null, reject, () => {
          getDownloadURL(task.snapshot.ref).then(url => { setCertificateUrl(url); resolve(); });
        });
      });
      toast.success("Certificate uploaded");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!finalName.trim()) { toast.error("Training name is required"); return; }
    if (!completionDate) { toast.error("Completion date is required"); return; }
    setSaving(true);
    try {
      const data: Omit<TrainingRecord, "id"> = {
        userId, organizationId,
        trainingTypeName: finalName.trim(),
        category, isRequired,
        completionDate, expirationDate: hasExpiry ? expirationDate : null,
        recurringFrequencyDays: null,
        completedBy, verifiedByName, trainingProvider,
        certificateUrl: certificateUrl || null, notes,
        status: getStatus({ userId, organizationId, trainingTypeName: finalName, category, isRequired, completionDate, expirationDate: hasExpiry ? expirationDate : null, recurringFrequencyDays: null, completedBy, verifiedByName, trainingProvider, certificateUrl, notes }),
      };

      if (existing && !renewMode) {
        await updateDoc(doc(db, "staff_trainings", existing.id), { ...data, updatedAt: serverTimestamp() });
        toast.success("Training record updated");
      } else {
        await addDoc(collection(db, "staff_trainings"), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast.success("Training record saved");
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save training record");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-icm-border shrink-0">
          <h2 className="font-manrope font-bold text-[16px] text-icm-text">
            {renewMode ? "Renew Training" : existing ? "Edit Training Record" : "Add Training Record"}
          </h2>
          <button onClick={onClose} className="text-icm-text-faint hover:text-icm-text"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Training Type */}
          <div>
            <label className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim block mb-1.5">Training Type *</label>
            {!showCustom ? (
              <div className="space-y-1.5">
                <select value={trainingName} onChange={e => handleSelectBuiltIn(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[13px] font-geist text-icm-text">
                  <option value="">Select training type…</option>
                  {BUILT_IN_TRAININGS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
                <button onClick={() => setShowCustom(true)} className="text-[11.5px] text-icm-accent hover:underline">
                  + Create custom training type
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <input value={customName} onChange={e => setCustomName(e.target.value)}
                  placeholder="Enter custom training name…"
                  className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[13px] font-geist" />
                <button onClick={() => setShowCustom(false)} className="text-[11.5px] text-icm-text-dim hover:text-icm-text">
                  ← Use standard training
                </button>
              </div>
            )}
          </div>

          {/* Category + Required */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim block mb-1">Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim block mb-1">Requirement</label>
              <div className="flex items-center gap-3 h-9">
                <label className="flex items-center gap-1.5 text-[12.5px] font-geist cursor-pointer">
                  <input type="radio" checked={isRequired} onChange={() => setIsRequired(true)} className="accent-icm-accent" /> Required
                </label>
                <label className="flex items-center gap-1.5 text-[12.5px] font-geist cursor-pointer">
                  <input type="radio" checked={!isRequired} onChange={() => setIsRequired(false)} className="accent-icm-accent" /> Optional
                </label>
              </div>
            </div>
          </div>

          {/* Completion Date + Completed By */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim block mb-1">Completion Date *</label>
              <input type="date" value={completionDate} onChange={e => setCompletionDate(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist" />
            </div>
            <div>
              <label className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim block mb-1">Completed By</label>
              <select value={completedBy} onChange={e => setCompletedBy(e.target.value as any)}
                className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist">
                <option value="self">Self</option>
                <option value="external">External Provider</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Expiration */}
          <div>
            <label className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim block mb-1.5">Expiration</label>
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-1.5 text-[12.5px] font-geist cursor-pointer">
                <input type="radio" checked={!hasExpiry} onChange={() => setHasExpiry(false)} className="accent-icm-accent" /> No expiration
              </label>
              <label className="flex items-center gap-1.5 text-[12.5px] font-geist cursor-pointer">
                <input type="radio" checked={hasExpiry} onChange={() => setHasExpiry(true)} className="accent-icm-accent" /> Has expiration date
              </label>
            </div>
            {hasExpiry && (
              <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist" />
            )}
          </div>

          {/* Verified By + Provider */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim block mb-1">Verified By</label>
              <input value={verifiedByName} onChange={e => setVerifiedByName(e.target.value)}
                placeholder="Name of verifier…" className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist" />
            </div>
            <div>
              <label className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim block mb-1">Training Provider</label>
              <input value={trainingProvider} onChange={e => setTrainingProvider(e.target.value)}
                placeholder="e.g. Red Cross, Internal…" className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist" />
            </div>
          </div>

          {/* Certificate Upload */}
          <div>
            <label className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim block mb-1.5">Certificate / Documentation</label>
            {certificateUrl ? (
              <div className="flex items-center gap-2">
                <a href={certificateUrl} target="_blank" rel="noreferrer"
                  className="text-[12px] font-geist text-icm-accent hover:underline inline-flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> View certificate <ExternalLink className="w-3 h-3" />
                </a>
                <button onClick={() => setCertificateUrl("")} className="text-[11.5px] text-icm-text-dim hover:text-icm-red">Remove</button>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-icm-border rounded-lg p-4 text-center cursor-pointer hover:border-icm-accent/50 hover:bg-icm-accent-soft/20 transition-colors">
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 text-[12px] text-icm-text-dim">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-icm-text-faint mx-auto mb-1" />
                    <p className="text-[12px] font-geist text-icm-text-dim">Click to upload certificate</p>
                    <p className="text-[10.5px] text-icm-text-faint">PDF, JPG, PNG · Max 10MB</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload} />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim block mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist resize-none" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-icm-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:bg-icm-bg">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="h-9 px-4 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-semibold hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-1.5">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Training Record
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Section Component ───────────────────────────────────────────────────

interface TrainingRecordsSectionProps {
  userId: string;
}

export function TrainingRecordsSection({ userId }: TrainingRecordsSectionProps) {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId ?? "";
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<TrainingRecord | null>(null);
  const [renewRecord, setRenewRecord] = useState<TrainingRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadRecords = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "staff_trainings"),
          where("userId", "==", userId),
          orderBy("completionDate", "desc"))
      );
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as TrainingRecord)));
    } catch { setRecords([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRecords(); }, [userId]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "staff_trainings", id));
      toast.success("Training record deleted");
      setDeleteId(null);
      loadRecords();
    } catch { toast.error("Failed to delete"); }
  };

  const stats = {
    current: records.filter(r => r.status === "current" || r.status === "no_expiration").length,
    expiring: records.filter(r => r.status === "expiring_soon").length,
    overdue: records.filter(r => r.status === "expired").length,
  };

  return (
    <div className="space-y-4 col-span-2 mt-2">
      <div className="border-t border-icm-border pt-4" />

      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="font-manrope font-bold text-[14px] text-icm-text">Training &amp; Certifications</h3>
        <button onClick={() => { setEditRecord(null); setModalOpen(true); }}
          className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Add Training
        </button>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Current", value: stats.current, tone: "green" },
          { label: "Expiring Soon", value: stats.expiring, tone: "amber" },
          { label: "Overdue", value: stats.overdue, tone: "red" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-xl border p-3 text-center",
            s.tone === "green" ? "bg-icm-green-soft border-icm-green/20" :
            s.tone === "amber" ? "bg-icm-amber-soft border-icm-amber/20" :
            "bg-icm-red-soft border-icm-red/20")}>
            <p className={cn("font-manrope font-extrabold text-[22px]",
              s.tone === "green" ? "text-icm-green" : s.tone === "amber" ? "text-icm-amber" : "text-icm-red")}>
              {s.value}
            </p>
            <p className="text-[10.5px] font-geist text-icm-text-dim">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Records list */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-icm-text-dim gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[12px] font-geist">Loading training records…</span>
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-icm-border p-8 text-center">
          <FileText className="w-7 h-7 text-icm-text-faint mx-auto mb-2" />
          <p className="text-[13px] font-manrope font-bold text-icm-text">No training records yet</p>
          <p className="text-[11.5px] text-icm-text-dim mt-1">Add training and certification records for this staff member.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(r => (
            <div key={r.id} className={cn("rounded-xl border p-4 space-y-2",
              r.status === "expired" ? "border-icm-red/30 bg-icm-red-soft/30" :
              r.status === "expiring_soon" ? "border-icm-amber/30 bg-icm-amber-soft/30" :
              "border-icm-border bg-icm-panel")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-geist font-bold text-[13.5px] text-icm-text">{r.trainingTypeName}</span>
                    <StatusBadge status={r.status} expirationDate={r.expirationDate} />
                  </div>
                  <p className="text-[11.5px] font-geist text-icm-text-dim">
                    {r.category} · {r.isRequired ? "Required" : "Optional"}
                    {r.completionDate ? ` · Completed: ${r.completionDate}` : ""}
                    {r.expirationDate ? ` · Expires: ${r.expirationDate}` : ""}
                  </p>
                  {(r.verifiedByName || r.trainingProvider) && (
                    <p className="text-[11px] font-geist text-icm-text-faint mt-0.5">
                      {r.verifiedByName ? `Verified by: ${r.verifiedByName}` : "Not verified"}
                      {r.trainingProvider ? ` · Provider: ${r.trainingProvider}` : ""}
                    </p>
                  )}
                  {r.certificateUrl && (
                    <a href={r.certificateUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-geist text-icm-accent hover:underline mt-0.5">
                      <FileText className="w-3 h-3" /> View certificate
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {(r.status === "expiring_soon" || r.status === "expired") && (
                    <button onClick={() => { setRenewRecord(r); setModalOpen(true); }}
                      className="h-7 px-2.5 rounded-lg text-[11px] font-geist font-semibold text-icm-accent border border-icm-accent/30 hover:bg-icm-accent-soft inline-flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Renew
                    </button>
                  )}
                  <button onClick={() => { setEditRecord(r); setRenewRecord(null); setModalOpen(true); }}
                    className="h-7 w-7 rounded-lg border border-icm-border text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center justify-center">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(r.id)}
                    className="h-7 w-7 rounded-lg border border-icm-border text-icm-text-dim hover:text-icm-red hover:border-icm-red/30 flex items-center justify-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button onClick={() => { setEditRecord(null); setRenewRecord(null); setModalOpen(true); }}
            className="w-full h-9 rounded-xl border-2 border-dashed border-icm-border text-[12px] font-geist text-icm-text-dim hover:border-icm-accent hover:text-icm-accent transition-colors inline-flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Training Record
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <TrainingModal
          userId={userId}
          organizationId={orgId}
          existing={renewRecord ?? editRecord}
          renewMode={!!renewRecord}
          onClose={() => { setModalOpen(false); setEditRecord(null); setRenewRecord(null); }}
          onSaved={loadRecords}
        />
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-manrope font-bold text-[16px] text-icm-text mb-2">Delete Training Record?</h3>
            <p className="text-[12.5px] text-icm-text-dim mb-4">This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-geist text-icm-text-dim">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="h-9 px-4 rounded-lg bg-icm-red text-white text-[12px] font-geist font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
