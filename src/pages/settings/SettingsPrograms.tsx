import React, { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Pencil, Building2, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Program {
  id: string;
  name: string;
  code: string;
  payer: string;
  active: boolean;
}

const emptyProgram: Omit<Program, "id"> = {
  name: "",
  code: "",
  payer: "",
  active: true,
};

type DraftProgram = Omit<Program, "id"> & { id?: string };

const PAYERS = [
  "Medicaid",
  "Medicare",
  "State General Funds",
  "IHCP",
  "Private Pay",
  "Other",
];

const SettingsPrograms = () => {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftProgram | null>(null);

  // Load programs from Firestore flat programs collection
  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    const q = query(
      collection(db, "programs"),
      where("organizationId", "==", orgId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPrograms(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Program)));
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load programs:", err);
        toast.error("Failed to load programs");
        setLoading(false);
      }
    );
    return unsub;
  }, [orgId]);

  const openAdd = () => setDraft({ ...emptyProgram });
  const openEdit = (p: Program) => setDraft({ ...p });

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.name.trim()) { toast.error("Program name is required"); return; }
    if (!orgId) return;

    setSaving(true);
    try {
      const programData = {
        name: draft.name.trim(),
        code: draft.code?.trim() || "",
        payer: draft.payer || "",
        type: draft.payer || "IDD Waiver",
        state: "IN",
        active: draft.active !== undefined ? draft.active : true,
        organizationId: orgId,
        updatedAt: serverTimestamp(),
      };

      if (draft.id) {
        await updateDoc(doc(db, "programs", draft.id), programData);
      } else {
        await addDoc(collection(db, "programs"), {
          ...programData,
          createdAt: serverTimestamp(),
        });
      }

      toast.success(draft.id ? "Program updated" : "Program created", {
        description: `${draft.name} saved.`,
      });
      setDraft(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save program");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (programId: string) => {
    if (!orgId) return;
    const p = programs.find((x) => x.id === programId);
    if (!p) return;
    try {
      await updateDoc(doc(db, "programs", programId), {
        active: !p.active,
        updatedAt: serverTimestamp(),
      });
      toast.success("Program status updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update program");
    }
  };

  return (
    <SettingsLayout
      title="Programs & States"
      subtitle="Configure HCBS waiver programs your organization supports"
      actions={
        <button
          onClick={openAdd}
          className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" />
          Add program
        </button>
      }
    >
      {loading ? (
        <ProgramsSkeleton />
      ) : (
        <div className="space-y-3">
          <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
            Programs ({programs.length})
          </p>

          {programs.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-icm-border bg-icm-panel p-8 text-center">
              <Building2 className="w-8 h-8 text-icm-text-faint mx-auto mb-2" />
              <p className="text-[13px] font-manrope font-bold text-icm-text">No programs configured</p>
              <p className="text-[11.5px] text-icm-text-dim mt-1">Add your first HCBS waiver program to get started.</p>
              <button
                onClick={openAdd}
                className="mt-3 h-8 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add first program
              </button>
            </div>
          )}

          <div className="space-y-2">
            {programs.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-manrope font-bold text-[14px] text-icm-text">{p.name}</h3>
                    {p.code && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-bg text-icm-text-dim ring-1 ring-icm-border font-mono">
                        {p.code}
                      </span>
                    )}
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1",
                        p.active
                          ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
                          : "bg-icm-bg text-icm-text-dim ring-icm-border"
                      )}
                    >
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">
                    {p.payer || "No payer set"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(p.id)}
                    className={cn(
                      "h-8 px-2.5 rounded-lg border text-[11.5px] font-geist font-semibold",
                      p.active
                        ? "border-icm-border bg-icm-panel text-icm-text-dim hover:border-icm-border-strong"
                        : "border-icm-green/30 bg-icm-green-soft text-icm-green hover:border-icm-green/50"
                    )}
                  >
                    {p.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-icm-text text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:border-icm-border-strong"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {draft !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-2xl bg-icm-panel border border-icm-border shadow-elevated w-full max-w-[520px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-icm-border">
              <h2 className="font-manrope font-bold text-[15px] text-icm-text">
                {draft.id ? "Edit program" : "Add program"}
              </h2>
              <button
                onClick={() => setDraft(null)}
                className="w-8 h-8 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <ModalField
                label="Program Name"
                value={draft.name}
                onChange={(v) => setDraft((d) => d && ({ ...d, name: v }))}
                placeholder="e.g. Howard County CCS"
              />
              <div className="grid grid-cols-2 gap-3">
                <ModalField
                  label="Program Code"
                  value={draft.code}
                  onChange={(v) => setDraft((d) => d && ({ ...d, code: v }))}
                  placeholder="e.g. HC-CCS"
                />
                <div>
                  <ModalLabel>Payer</ModalLabel>
                  <select
                    value={draft.payer}
                    onChange={(e) => setDraft((d) => d && ({ ...d, payer: e.target.value }))}
                    className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
                  >
                    <option value="">Select payer...</option>
                    {PAYERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-icm-border p-2.5">
                <div>
                  <p className="text-[12px] font-geist font-semibold text-icm-text">Active</p>
                  <p className="text-[10.5px] text-icm-text-dim">Allow new enrollments and billing.</p>
                </div>
                <button
                  onClick={() => setDraft((d) => d && ({ ...d, active: !d.active }))}
                  className={cn(
                    "relative w-9 h-5 rounded-full transition-colors",
                    draft.active ? "bg-icm-accent" : "bg-icm-border"
                  )}
                >
                  <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform", draft.active && "translate-x-4")} />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 pb-4">
              <button
                onClick={() => setDraft(null)}
                className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold inline-flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                onClick={saveDraft}
                disabled={saving}
                className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {draft.id ? "Save changes" : "Create program"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
};

function ProgramsSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl border border-icm-border bg-icm-panel p-4 h-20" />
      ))}
    </div>
  );
}

function ModalLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
      {children}
    </label>
  );
}

function ModalField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <ModalLabel>{label}</ModalLabel>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong"
      />
    </div>
  );
}

export default SettingsPrograms;
