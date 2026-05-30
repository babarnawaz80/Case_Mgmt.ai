import React, { useState, useEffect, useCallback } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import {
  doc, getDoc, getDocs, updateDoc, collection, addDoc,
  serverTimestamp, query, where, onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Pencil, Building2, X, Check, Loader2, MapPin, ClipboardList, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Assessment Schedule Types ───────────────────────────────────────────────

interface AssessmentRule {
  id: string;
  templateName: string;
  requirementType: "initial" | "recurring";
  initialDueDays: number;
  recurringEveryDays: number;
  countFromEnrollment: boolean;
  alertDaysBefore: number[];
  alertOnOverdue: boolean;
}

const DEFAULT_RULE: AssessmentRule = {
  id: `rule-${Date.now()}`,
  templateName: "",
  requirementType: "initial",
  initialDueDays: 30,
  recurringEveryDays: 365,
  countFromEnrollment: false,
  alertDaysBefore: [14, 7],
  alertOnOverdue: true,
};

// ─── Full US States list ──────────────────────────────────────────────────────
const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

// ─── State → code mapping for migration ──────────────────────────────────────
const STATE_MIGRATIONS: { nameMatch: string; state: string }[] = [
  { nameMatch: "Case MGMT",    state: "Indiana"     },
  { nameMatch: "Ohio",         state: "Ohio"         },
  { nameMatch: "NJ Case Mgmt", state: "New Jersey"   },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Program {
  id: string;
  name: string;
  code: string;
  payer: string;
  state: string;
  active: boolean;
  assessmentSchedule?: AssessmentRule[];
}

const emptyProgram: Omit<Program, "id"> = {
  name: "",
  code: "",
  payer: "",
  state: "",
  active: true,
  assessmentSchedule: [],
};

type DraftProgram = Omit<Program, "id"> & { id?: string };

const PAYERS = [
  "Medicaid","Medicare","State General Funds","IHCP","Private Pay","Other",
];

// ─── Migration: update existing programs + seed individuals ───────────────────

async function runMigrationIfNeeded(orgId: string) {
  try {
    const q = query(collection(db, "programs"), where("organizationId", "==", orgId));
    const snap = await getDocs(q);

    // 1. Update programs missing the state field
    const updatePromises: Promise<void>[] = [];
    snap.docs.forEach((d) => {
      const data = d.data();
      if (!data.state || data.state === "IN") {
        // Find matching migration entry by name
        const migration = STATE_MIGRATIONS.find(
          (m) => data.name && data.name.toLowerCase().includes(m.nameMatch.toLowerCase())
        );
        if (migration) {
          updatePromises.push(
            updateDoc(doc(db, "programs", d.id), {
              state: migration.state,
              updatedAt: serverTimestamp(),
            })
          );
        }
      }
    });
    await Promise.all(updatePromises);

    // 2. Find all programs to build a default program map
    const programsSnap = await getDocs(q);
    const defaultProgram = programsSnap.docs.find((d) => {
      const data = d.data();
      return (data.state === "Indiana" || STATE_MIGRATIONS[0].nameMatch === data.name) && data.active !== false;
    });
    if (!defaultProgram) return;

    const progData = defaultProgram.data();
    const defaultState = progData.state || "Indiana";
    const defaultName = progData.name || "Case MGMT";
    const defaultCode = progData.code || "";
    const defaultPayer = progData.payer || "Medicaid";

    // 3. Update individuals without a state field → assign to default Indiana program
    const indsSnap = await getDocs(
      query(collection(db, "individuals"), where("organizationId", "==", orgId))
    );
    const indUpdatePromises: Promise<void>[] = [];
    indsSnap.docs.forEach((d) => {
      const data = d.data();
      if (!data.state && !data.address_state) {
        indUpdatePromises.push(
          updateDoc(doc(db, "individuals", d.id), {
            state: defaultState,
            program: defaultName,
            programId: defaultProgram.id,
            programName: defaultName,
            programCode: defaultCode,
            payer: defaultPayer,
          })
        );
      }
    });
    await Promise.all(indUpdatePromises);

    if (updatePromises.length > 0 || indUpdatePromises.length > 0) {
      console.log(
        `[Programs migration] Updated ${updatePromises.length} programs and ${indUpdatePromises.length} individuals.`
      );
    }
  } catch (err) {
    console.warn("[Programs migration] Failed (non-fatal):", err);
  }
}

// ─── Page component ───────────────────────────────────────────────────────────

const SettingsPrograms = () => {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftProgram | null>(null);
  const [migrationDone, setMigrationDone] = useState(false);

  // Run migration once on mount
  useEffect(() => {
    if (!orgId || migrationDone) return;
    setMigrationDone(true);
    runMigrationIfNeeded(orgId);
  }, [orgId, migrationDone]);

  // Live-listen to programs
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
        setPrograms(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as Program))
        );
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

  const openAdd  = () => setDraft({ ...emptyProgram });
  const openEdit = (p: Program) => setDraft({ ...p });

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.name.trim()) { toast.error("Program name is required"); return; }
    if (!draft.state)        { toast.error("State is required"); return; }
    if (!orgId) return;

    setSaving(true);
    try {
      const programData = {
        name:               draft.name.trim(),
        code:               draft.code?.trim() || "",
        payer:              draft.payer || "",
        state:              draft.state,
        type:               draft.payer || "IDD Waiver",
        active:             draft.active !== undefined ? draft.active : true,
        organizationId:     orgId,
        assessmentSchedule: (draft.assessmentSchedule || []).filter(r => r.templateName.trim()),
        updatedAt:          serverTimestamp(),
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
        description: `${draft.name} (${draft.state}) saved.`,
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
        active:    !p.active,
        updatedAt: serverTimestamp(),
      });
      toast.success("Program status updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update program");
    }
  };

  const canCreate = !!(draft?.name?.trim() && draft?.state);

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
              <p className="text-[11.5px] text-icm-text-dim mt-1">
                Add your first HCBS waiver program to get started.
              </p>
              <button
                onClick={openAdd}
                className="mt-3 h-8 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add first program
              </button>
            </div>
          )}

          {/* Signature Requirements section */}
          <div className="space-y-3 mt-4">
            <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              Care Plan Signature Requirements
            </p>
            <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
              <p className="text-[12.5px] font-geist text-icm-text-dim">
                Configure which signatures are required before a care plan becomes active. Applies to all programs.
              </p>
              {[
                { key: 'caseManager', label: 'Case Manager signature' },
                { key: 'supervisor', label: 'Supervisor signature' },
                { key: 'participant', label: 'Participant signature' },
                { key: 'guardian', label: 'Guardian / Representative signature' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-[13px] font-geist text-icm-text">{label}</span>
                  <span className="text-[11.5px] text-icm-text-dim font-geist">Required (Indiana HCBS default)</span>
                </div>
              ))}
              <p className="text-[11px] text-icm-text-faint font-geist">Per-program overrides coming soon.</p>
            </div>
          </div>

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
                  {/* State · Payer subtitle */}
                  <p className="text-[11.5px] font-geist text-icm-text-dim mt-1 flex items-center gap-1">
                    {p.state && (
                      <>
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{p.state}</span>
                        {p.payer && <span className="mx-1">·</span>}
                      </>
                    )}
                    {p.payer && <span>{p.payer}</span>}
                    {!p.state && !p.payer && <span>No state or payer set</span>}
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

      {/* Add / Edit Modal */}
      {draft !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-2xl bg-icm-panel border border-icm-border shadow-elevated w-full max-w-[580px] max-h-[90vh] overflow-y-auto">
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
              {/* Program Name — full width */}
              <ModalField
                label="Program Name *"
                value={draft.name}
                onChange={(v) => setDraft((d) => d && ({ ...d, name: v }))}
                placeholder="e.g. Howard County CCS"
              />

              {/* State (60%) + Program Code (40%) side by side */}
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-3">
                  <ModalLabel>State *</ModalLabel>
                  <select
                    value={draft.state}
                    onChange={(e) => setDraft((d) => d && ({ ...d, state: e.target.value }))}
                    className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
                  >
                    <option value="">Select state…</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <ModalField
                    label="Program Code"
                    value={draft.code}
                    onChange={(v) => setDraft((d) => d && ({ ...d, code: v }))}
                    placeholder="e.g. HC-CCS"
                  />
                </div>
              </div>

              {/* Payer — full width */}
              <div>
                <ModalLabel>Payer</ModalLabel>
                <select
                  value={draft.payer}
                  onChange={(e) => setDraft((d) => d && ({ ...d, payer: e.target.value }))}
                  className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
                >
                  <option value="">Select payer…</option>
                  {PAYERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Active toggle */}
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
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                      draft.active && "translate-x-4"
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Assessment Schedule section */}
            <div className="px-4 pb-2 space-y-2">
              <div className="border-t border-icm-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-3.5 h-3.5 text-icm-accent" />
                    <p className="text-[12px] font-geist font-bold text-icm-text">Assessment Schedule</p>
                  </div>
                  <p className="text-[10.5px] font-geist text-icm-text-dim">Monitored by AI Orchestrator</p>
                </div>

                {(draft.assessmentSchedule || []).map((rule, i) => (
                  <div key={rule.id} className="rounded-lg border border-icm-border bg-icm-bg p-3 mb-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10.5px] font-geist font-bold text-icm-text-dim uppercase tracking-wider">Requirement {i + 1}</p>
                      <button onClick={() => setDraft(d => d && ({ ...d, assessmentSchedule: (d.assessmentSchedule || []).filter((_, j) => j !== i) }))}
                        className="text-icm-text-faint hover:text-icm-red">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <label className="text-[10px] font-geist font-semibold uppercase tracking-wider text-icm-text-faint block mb-1">Assessment Template Name</label>
                      <input
                        value={rule.templateName}
                        onChange={e => setDraft(d => d && ({ ...d, assessmentSchedule: (d.assessmentSchedule || []).map((r, j) => j === i ? { ...r, templateName: e.target.value } : r) }))}
                        placeholder="e.g. Annual Reassessment"
                        className="w-full h-8 px-2.5 rounded-lg border border-icm-border bg-white text-[12px] font-geist"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-geist font-semibold uppercase tracking-wider text-icm-text-faint block mb-1">Type</label>
                        <select value={rule.requirementType}
                          onChange={e => setDraft(d => d && ({ ...d, assessmentSchedule: (d.assessmentSchedule || []).map((r, j) => j === i ? { ...r, requirementType: e.target.value as "initial" | "recurring" } : r) }))}
                          className="w-full h-8 px-2 rounded-lg border border-icm-border bg-white text-[11.5px] font-geist">
                          <option value="initial">Initial (once, within N days)</option>
                          <option value="recurring">Recurring (every N days)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-geist font-semibold uppercase tracking-wider text-icm-text-faint block mb-1">
                          {rule.requirementType === "initial" ? "Due within (days)" : "Every (days)"}
                        </label>
                        <input type="number" min={1}
                          value={rule.requirementType === "initial" ? rule.initialDueDays : rule.recurringEveryDays}
                          onChange={e => {
                            const v = parseInt(e.target.value) || 30;
                            setDraft(d => d && ({ ...d, assessmentSchedule: (d.assessmentSchedule || []).map((r, j) => j === i ? { ...r, ...(rule.requirementType === "initial" ? { initialDueDays: v } : { recurringEveryDays: v }) } : r) }));
                          }}
                          className="w-full h-8 px-2.5 rounded-lg border border-icm-border bg-white text-[12px] font-geist"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setDraft(d => d && ({ ...d, assessmentSchedule: [...(d.assessmentSchedule || []), { ...DEFAULT_RULE, id: `rule-${Date.now()}` }] }))}
                  className="w-full h-8 rounded-lg border-2 border-dashed border-icm-border text-[11.5px] font-geist text-icm-text-dim hover:border-icm-accent hover:text-icm-accent transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Assessment Requirement
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
                disabled={saving || !canCreate}
                className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                title={!canCreate ? "Program Name and State are required" : undefined}
              >
                {saving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Check className="w-3.5 h-3.5" />}
                {draft.id ? "Save changes" : "Create program"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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
