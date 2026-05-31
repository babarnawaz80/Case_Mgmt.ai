import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Search,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDiagnoses,
  useMedications,
  useAllergies,
  addDiagnosis,
  updateDiagnosis,
  softDeleteDiagnosis,
  addMedication,
  updateMedication,
  softDeleteMedication,
  addAllergy,
  updateAllergy,
  softDeleteAllergy,
  type Diagnosis,
  type Medication,
  type Allergy,
} from "@/hooks/useMedicalRecords";
import { ICD10_CODES, COMMON_MEDICATIONS, COMMON_ALLERGENS } from "@/data/medicalLookups";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface MedicalTabProps {
  individualId: string;
  individualName?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_ORDER = ["life-threatening", "severe", "moderate", "mild"] as const;
const DIAGNOSIS_TYPE_ORDER = ["primary", "secondary", "historical"] as const;

function severityColors(severity: Allergy["severity"]) {
  switch (severity) {
    case "life-threatening": return { border: "border-l-red-600", badge: "bg-red-100 text-red-700" };
    case "severe":           return { border: "border-l-orange-500", badge: "bg-orange-100 text-orange-700" };
    case "moderate":         return { border: "border-l-amber-400", badge: "bg-amber-100 text-amber-700" };
    default:                 return { border: "border-l-gray-300", badge: "bg-gray-100 text-gray-600" };
  }
}

function DiagnosisTypeBadge({ type }: { type: Diagnosis["diagnosis_type"] }) {
  const cls =
    type === "primary"    ? "bg-blue-100 text-blue-700" :
    type === "secondary"  ? "bg-purple-100 text-purple-700" :
                            "bg-gray-100 text-gray-600";
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase", cls)}>
      {type}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Typeahead helpers
// ─────────────────────────────────────────────────────────────────────────────

function ICD10Typeahead({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (code: string, description: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const matches = value.length >= 1
    ? ICD10_CODES.filter(
        (c) =>
          c.code.toLowerCase().startsWith(value.toLowerCase()) ||
          c.description.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint pointer-events-none" />
        <input
          className="modal-input pl-8 w-full"
          value={value}
          placeholder="Search ICD-10 code or description…"
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-icm-border bg-white shadow-lg max-h-56 overflow-y-auto">
          {matches.map((c) => (
            <button
              key={c.code}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-icm-bg flex items-center gap-2"
              onMouseDown={() => { onSelect(c.code, c.description); setOpen(false); }}
            >
              <span className="font-mono text-[11px] text-icm-accent shrink-0">{c.code}</span>
              <span className="text-[12px] text-icm-text">{c.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MedTypeahead({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const matches = value.length >= 2
    ? COMMON_MEDICATIONS.filter((m) => m.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <input
        className="modal-input w-full"
        value={value}
        placeholder="Type medication name…"
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-icm-border bg-white shadow-lg max-h-56 overflow-y-auto">
          {matches.map((m) => (
            <button
              key={m}
              type="button"
              className="w-full text-left px-3 py-2 text-[12px] text-icm-text hover:bg-icm-bg"
              onMouseDown={() => { onChange(m); setOpen(false); }}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AllergenTypeahead({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const matches = value.length >= 2
    ? COMMON_ALLERGENS.filter((a) => a.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <input
        className="modal-input w-full"
        value={value}
        placeholder="Type allergen name…"
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-icm-border bg-white shadow-lg max-h-56 overflow-y-auto">
          {matches.map((a) => (
            <button
              key={a}
              type="button"
              className="w-full text-left px-3 py-2 text-[12px] text-icm-text hover:bg-icm-bg"
              onMouseDown={() => { onChange(a); setOpen(false); }}
            >
              {a}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section header shared component
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  count,
  onAdd,
}: {
  title: string;
  count: number;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h3 className="text-[13px] font-semibold font-geist text-icm-text">{title}</h3>
        {count > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-icm-bg border border-icm-border text-[10px] font-mono text-icm-text-dim">
            {count}
          </span>
        )}
      </div>
      <button
        onClick={onAdd}
        className="h-7 px-2.5 rounded-lg border border-icm-border bg-icm-panel hover:bg-icm-bg text-[11.5px] font-geist font-medium text-icm-text-dim hover:text-icm-text flex items-center gap-1.5 transition-colors"
      >
        <Plus className="w-3 h-3" /> Add
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Slide-over panel
// ─────────────────────────────────────────────────────────────────────────────

type PanelMode = "none" | "add-diagnosis" | "edit-diagnosis" | "add-medication" | "edit-medication" | "add-allergy" | "edit-allergy";

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function MedicalTab({ individualId, individualName }: MedicalTabProps) {
  const { userProfile } = useAuth();
  const userEmail = userProfile?.email ?? "unknown";
  const canDelete = userProfile?.role === "supervisor" || userProfile?.role === "admin" || userProfile?.role === "platform_admin";

  const { diagnoses: diagList, loading: diagLoading } = useDiagnoses(individualId);
  const { medications: medList, loading: medLoading } = useMedications(individualId);
  const { allergies: allergyList, loading: allergyLoading } = useAllergies(individualId);

  // Sort diagnoses: primary → secondary → historical
  const sortedDiagnoses = [...diagList].sort(
    (a, b) => DIAGNOSIS_TYPE_ORDER.indexOf(a.diagnosis_type) - DIAGNOSIS_TYPE_ORDER.indexOf(b.diagnosis_type)
  );

  // Sort allergies: life-threatening → severe → moderate → mild
  const sortedAllergies = [...allergyList].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  const severeAllergies = allergyList.filter(
    (a) => a.severity === "severe" || a.severity === "life-threatening"
  );

  // Delete confirm state
  const [deletingDiagId, setDeletingDiagId] = useState<string | null>(null);
  const [deletingMedId, setDeletingMedId] = useState<string | null>(null);
  const [deletingAllergyId, setDeletingAllergyId] = useState<string | null>(null);

  // Panel state
  const [panelMode, setPanelMode] = useState<PanelMode>("none");
  const [editingDiagnosis, setEditingDiagnosis] = useState<Diagnosis | null>(null);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [editingAllergy, setEditingAllergy] = useState<Allergy | null>(null);

  // Panel saving
  const [saving, setSaving] = useState(false);

  // Diagnosis form
  const [diagIcd10Code, setDiagIcd10Code] = useState("");
  const [diagIcd10Search, setDiagIcd10Search] = useState("");
  const [diagIcd10Description, setDiagIcd10Description] = useState("");
  const [diagType, setDiagType] = useState<Diagnosis["diagnosis_type"]>("secondary");
  const [diagOnsetDate, setDiagOnsetDate] = useState("");
  const [diagDiagnosedBy, setDiagDiagnosedBy] = useState("");
  const [diagNotes, setDiagNotes] = useState("");

  // Medication form
  const [medName, setMedName] = useState("");
  const [medBrand, setMedBrand] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState("");
  const [medRoute, setMedRoute] = useState("");
  const [medPrescriber, setMedPrescriber] = useState("");
  const [medStartDate, setMedStartDate] = useState("");
  const [medEndDate, setMedEndDate] = useState("");
  const [medIndication, setMedIndication] = useState("");
  const [medNotes, setMedNotes] = useState("");

  // Allergy form
  const [allergyAllergen, setAllergyAllergen] = useState("");
  const [allergyType, setAllergyType] = useState<Allergy["allergen_type"]>("medication");
  const [allergyReaction, setAllergyReaction] = useState("");
  const [allergySeverity, setAllergySeverity] = useState<Allergy["severity"]>("moderate");
  const [allergyOnsetDate, setAllergyOnsetDate] = useState("");
  const [allergyNotes, setAllergyNotes] = useState("");

  const closePanel = () => {
    setPanelMode("none");
    setEditingDiagnosis(null);
    setEditingMedication(null);
    setEditingAllergy(null);
  };

  // ── Open add/edit panels ──

  const openAddDiagnosis = () => {
    setDiagIcd10Code(""); setDiagIcd10Search(""); setDiagIcd10Description("");
    setDiagType("secondary"); setDiagOnsetDate(""); setDiagDiagnosedBy(""); setDiagNotes("");
    setEditingDiagnosis(null);
    setPanelMode("add-diagnosis");
  };

  const openEditDiagnosis = (d: Diagnosis) => {
    setDiagIcd10Code(d.icd10_code); setDiagIcd10Search(d.icd10_code); setDiagIcd10Description(d.icd10_description);
    setDiagType(d.diagnosis_type); setDiagOnsetDate(d.onset_date ?? "");
    setDiagDiagnosedBy(d.diagnosed_by); setDiagNotes(d.notes);
    setEditingDiagnosis(d);
    setPanelMode("edit-diagnosis");
  };

  const openAddMedication = () => {
    setMedName(""); setMedBrand(""); setMedDosage(""); setMedFrequency(""); setMedRoute("");
    setMedPrescriber(""); setMedStartDate(""); setMedEndDate(""); setMedIndication(""); setMedNotes("");
    setEditingMedication(null);
    setPanelMode("add-medication");
  };

  const openEditMedication = (m: Medication) => {
    setMedName(m.medication_name); setMedBrand(m.brand_name); setMedDosage(m.dosage);
    setMedFrequency(m.frequency); setMedRoute(m.route); setMedPrescriber(m.prescribing_provider);
    setMedStartDate(m.start_date ?? ""); setMedEndDate(m.end_date ?? "");
    setMedIndication(m.indication); setMedNotes(m.notes);
    setEditingMedication(m);
    setPanelMode("edit-medication");
  };

  const openAddAllergy = () => {
    setAllergyAllergen(""); setAllergyType("medication"); setAllergyReaction("");
    setAllergySeverity("moderate"); setAllergyOnsetDate(""); setAllergyNotes("");
    setEditingAllergy(null);
    setPanelMode("add-allergy");
  };

  const openEditAllergy = (a: Allergy) => {
    setAllergyAllergen(a.allergen); setAllergyType(a.allergen_type); setAllergyReaction(a.reaction);
    setAllergySeverity(a.severity); setAllergyOnsetDate(a.onset_date ?? ""); setAllergyNotes(a.notes);
    setEditingAllergy(a);
    setPanelMode("edit-allergy");
  };

  // ── Primary diagnosis conflict check ──

  const existingPrimary = diagList.find((d) => d.diagnosis_type === "primary");
  const willReplacePrimary =
    (panelMode === "add-diagnosis" || panelMode === "edit-diagnosis") &&
    diagType === "primary" &&
    existingPrimary &&
    existingPrimary.id !== editingDiagnosis?.id;

  // ── Save handlers ──

  const saveDiagnosis = async () => {
    if (!diagIcd10Code.trim()) { toast.error("ICD-10 code is required"); return; }
    setSaving(true);
    try {
      // If replacing primary, demote existing
      if (willReplacePrimary && existingPrimary) {
        await updateDiagnosis(individualId, existingPrimary.id, { diagnosis_type: "secondary" }, userEmail);
      }
      const payload = {
        icd10_code: diagIcd10Code,
        icd10_description: diagIcd10Description,
        diagnosis_type: diagType,
        onset_date: diagOnsetDate || null,
        diagnosed_by: diagDiagnosedBy,
        notes: diagNotes,
        is_active: true,
        created_by: userEmail,
        updated_by: userEmail,
      };
      if (panelMode === "add-diagnosis") {
        await addDiagnosis(individualId, payload, userEmail);
        toast.success("Diagnosis added");
      } else if (editingDiagnosis) {
        await updateDiagnosis(individualId, editingDiagnosis.id, payload, userEmail);
        toast.success("Diagnosis updated");
      }
      closePanel();
    } catch (e) {
      toast.error("Failed to save diagnosis");
    } finally {
      setSaving(false);
    }
  };

  const saveMedication = async () => {
    if (!medName.trim()) { toast.error("Medication name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        medication_name: medName,
        brand_name: medBrand,
        dosage: medDosage,
        frequency: medFrequency,
        route: medRoute,
        prescribing_provider: medPrescriber,
        start_date: medStartDate || null,
        end_date: medEndDate || null,
        indication: medIndication,
        notes: medNotes,
        is_active: true,
        created_by: userEmail,
        updated_by: userEmail,
      };
      if (panelMode === "add-medication") {
        await addMedication(individualId, payload, userEmail);
        toast.success("Medication added");
      } else if (editingMedication) {
        await updateMedication(individualId, editingMedication.id, payload, userEmail);
        toast.success("Medication updated");
      }
      closePanel();
    } catch (e) {
      toast.error("Failed to save medication");
    } finally {
      setSaving(false);
    }
  };

  const saveAllergy = async () => {
    if (!allergyAllergen.trim()) { toast.error("Allergen is required"); return; }
    setSaving(true);
    try {
      const payload = {
        allergen: allergyAllergen,
        allergen_type: allergyType,
        reaction: allergyReaction,
        severity: allergySeverity,
        onset_date: allergyOnsetDate || null,
        notes: allergyNotes,
        is_active: true,
        created_by: userEmail,
        updated_by: userEmail,
      };
      if (panelMode === "add-allergy") {
        await addAllergy(individualId, payload, userEmail);
        toast.success("Allergy added");
      } else if (editingAllergy) {
        await updateAllergy(individualId, editingAllergy.id, payload, userEmail);
        toast.success("Allergy updated");
      }
      closePanel();
    } catch (e) {
      toast.error("Failed to save allergy");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete handlers ──

  const handleDeleteDiagnosis = async (id: string) => {
    try {
      await softDeleteDiagnosis(individualId, id, userEmail);
      toast.success("Diagnosis removed");
    } catch {
      toast.error("Failed to delete diagnosis");
    }
    setDeletingDiagId(null);
  };

  const handleDeleteMedication = async (id: string) => {
    try {
      await softDeleteMedication(individualId, id, userEmail);
      toast.success("Medication removed");
    } catch {
      toast.error("Failed to delete medication");
    }
    setDeletingMedId(null);
  };

  const handleDeleteAllergy = async (id: string) => {
    try {
      await softDeleteAllergy(individualId, id, userEmail);
      toast.success("Allergy removed");
    } catch {
      toast.error("Failed to delete allergy");
    }
    setDeletingAllergyId(null);
  };

  const panelOpen = panelMode !== "none";

  return (
    <div className="space-y-4">
      {/* ── Allergy Alert Banner ── */}
      {severeAllergies.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[12.5px] font-semibold text-red-800">
              ALLERGY ALERT — {individualName} has {severeAllergies.length} severe/life-threatening{" "}
              {severeAllergies.length === 1 ? "allergy" : "allergies"}:
            </p>
            <p className="text-[11.5px] text-red-700 mt-0.5">
              {severeAllergies.map((a) => a.allergen).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* ── No-primary-diagnosis notice ── */}
      {!diagLoading && diagList.length > 0 && !diagList.some((d) => d.diagnosis_type === "primary") && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] font-geist text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          No primary diagnosis recorded. Primary diagnosis is required for Care Plan.
        </div>
      )}

      {/* ── Diagnoses ── */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <SectionHeader
          title="Diagnoses"
          count={diagList.length}
          onAdd={openAddDiagnosis}
        />
        {diagLoading ? (
          <div className="flex items-center gap-2 py-4 text-icm-text-dim">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[12px] font-geist">Loading…</span>
          </div>
        ) : sortedDiagnoses.length === 0 ? (
          <p className="text-[12px] text-icm-text-faint font-geist py-2">
            No diagnoses recorded. Primary diagnosis is required for Care Plan.
          </p>
        ) : (
          <div className="space-y-2">
            {sortedDiagnoses.map((d) => (
              <div
                key={d.id}
                className="group rounded-lg border border-icm-border bg-icm-bg/40 p-3 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] font-semibold text-icm-accent bg-blue-50 px-1.5 py-0.5 rounded">
                      {d.icd10_code}
                    </span>
                    <span className="text-[13px] font-semibold text-icm-text">{d.icd10_description}</span>
                    <DiagnosisTypeBadge type={d.diagnosis_type} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11.5px] text-icm-text-dim font-geist">
                    {d.onset_date && <span>Onset: {d.onset_date}</span>}
                    {d.diagnosed_by && <span>By: {d.diagnosed_by}</span>}
                  </div>
                  {d.notes && (
                    <p className="mt-1 text-[11.5px] text-icm-text font-geist">{d.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {deletingDiagId === d.id ? (
                    <div className="flex items-center gap-2 text-[11px] font-geist">
                      <span className="text-icm-text-dim">Delete? Cannot be undone.</span>
                      <button
                        onClick={() => handleDeleteDiagnosis(d.id)}
                        className="text-red-600 font-semibold hover:underline"
                      >Delete</button>
                      <button
                        onClick={() => setDeletingDiagId(null)}
                        className="text-icm-text-dim hover:underline"
                      >Cancel</button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => openEditDiagnosis(d)}
                        className="opacity-0 group-hover:opacity-100 text-icm-text-faint hover:text-icm-accent transition-opacity"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => setDeletingDiagId(d.id)}
                          className="opacity-0 group-hover:opacity-100 text-icm-text-faint hover:text-red-500 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Medications ── */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <SectionHeader
          title="Medications"
          count={medList.length}
          onAdd={openAddMedication}
        />
        <p className="text-[11px] text-icm-text-faint font-geist mb-3">
          Medication records here are reference only. Administration is managed in the eMAR module.
        </p>
        {medLoading ? (
          <div className="flex items-center gap-2 py-4 text-icm-text-dim">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[12px] font-geist">Loading…</span>
          </div>
        ) : medList.length === 0 ? (
          <p className="text-[12px] text-icm-text-faint font-geist py-2">No medications recorded.</p>
        ) : (
          <div className="space-y-2">
            {medList.map((m) => (
              <div
                key={m.id}
                className="group rounded-lg border border-icm-border bg-icm-bg/40 p-3 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-icm-text">
                      {m.medication_name}
                      {m.brand_name ? (
                        <span className="font-normal text-icm-text-dim"> ({m.brand_name})</span>
                      ) : null}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-green-100 text-green-700">
                      Active
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-icm-text-dim font-geist">
                    {m.dosage && <span>{m.dosage}</span>}
                    {m.frequency && <span>· {m.frequency}</span>}
                    {m.route && <span>· {m.route}</span>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11.5px] text-icm-text-dim font-geist">
                    {m.prescribing_provider && <span>Rx: {m.prescribing_provider}</span>}
                    {m.start_date && <span>Start: {m.start_date}</span>}
                    {m.end_date && <span>End: {m.end_date}</span>}
                  </div>
                  {m.indication && (
                    <p className="mt-0.5 text-[11.5px] text-icm-text font-geist">For: {m.indication}</p>
                  )}
                  {m.notes && (
                    <p className="mt-0.5 text-[11.5px] text-icm-text-dim font-geist italic">{m.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {deletingMedId === m.id ? (
                    <div className="flex items-center gap-2 text-[11px] font-geist">
                      <span className="text-icm-text-dim">Delete? Cannot be undone.</span>
                      <button
                        onClick={() => handleDeleteMedication(m.id)}
                        className="text-red-600 font-semibold hover:underline"
                      >Delete</button>
                      <button
                        onClick={() => setDeletingMedId(null)}
                        className="text-icm-text-dim hover:underline"
                      >Cancel</button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => openEditMedication(m)}
                        className="opacity-0 group-hover:opacity-100 text-icm-text-faint hover:text-icm-accent transition-opacity"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => setDeletingMedId(m.id)}
                          className="opacity-0 group-hover:opacity-100 text-icm-text-faint hover:text-red-500 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Allergies ── */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <SectionHeader
          title="Allergies"
          count={allergyList.length}
          onAdd={openAddAllergy}
        />
        {allergyLoading ? (
          <div className="flex items-center gap-2 py-4 text-icm-text-dim">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[12px] font-geist">Loading…</span>
          </div>
        ) : sortedAllergies.length === 0 ? (
          <p className="text-[12px] text-green-700 font-geist py-2">No known allergies recorded.</p>
        ) : (
          <div className="space-y-2">
            {sortedAllergies.map((a) => {
              const colors = severityColors(a.severity);
              return (
                <div
                  key={a.id}
                  className={cn(
                    "group rounded-lg border border-icm-border bg-icm-bg/40 p-3 border-l-4 flex items-start gap-3",
                    colors.border
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-icm-text">{a.allergen}</span>
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase", colors.badge)}>
                        {a.severity}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-600 uppercase">
                        {a.allergen_type}
                      </span>
                    </div>
                    {a.reaction && (
                      <p className="mt-0.5 text-[12px] text-icm-text font-geist">Reaction: {a.reaction}</p>
                    )}
                    <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11.5px] text-icm-text-dim font-geist">
                      {a.onset_date && <span>Identified: {a.onset_date}</span>}
                    </div>
                    {a.notes && (
                      <p className="mt-0.5 text-[11.5px] text-icm-text-dim font-geist italic">{a.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {deletingAllergyId === a.id ? (
                      <div className="flex items-center gap-2 text-[11px] font-geist">
                        <span className="text-icm-text-dim">Delete? Cannot be undone.</span>
                        <button
                          onClick={() => handleDeleteAllergy(a.id)}
                          className="text-red-600 font-semibold hover:underline"
                        >Delete</button>
                        <button
                          onClick={() => setDeletingAllergyId(null)}
                          className="text-icm-text-dim hover:underline"
                        >Cancel</button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => openEditAllergy(a)}
                          className="opacity-0 group-hover:opacity-100 text-icm-text-faint hover:text-icm-accent transition-opacity"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => setDeletingAllergyId(a.id)}
                            className="opacity-0 group-hover:opacity-100 text-icm-text-faint hover:text-red-500 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Slide-over panel ── */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={closePanel}
          />
          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-icm-border shadow-2xl z-50 flex flex-col">
            {/* Panel header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-icm-border">
              <h2 className="text-[14px] font-semibold font-geist text-icm-text">
                {panelMode === "add-diagnosis" && "Add Diagnosis"}
                {panelMode === "edit-diagnosis" && "Edit Diagnosis"}
                {panelMode === "add-medication" && "Add Medication"}
                {panelMode === "edit-medication" && "Edit Medication"}
                {panelMode === "add-allergy" && "Add Allergy"}
                {panelMode === "edit-allergy" && "Edit Allergy"}
              </h2>
              <button onClick={closePanel} className="p-1.5 rounded-lg hover:bg-icm-bg text-icm-text-dim">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* ── Diagnosis form ── */}
              {(panelMode === "add-diagnosis" || panelMode === "edit-diagnosis") && (
                <>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      ICD-10 Code *
                    </label>
                    <ICD10Typeahead
                      value={diagIcd10Search}
                      onChange={(v) => { setDiagIcd10Search(v); setDiagIcd10Code(v); }}
                      onSelect={(code, description) => {
                        setDiagIcd10Code(code);
                        setDiagIcd10Search(code);
                        setDiagIcd10Description(description);
                      }}
                    />
                    {diagIcd10Code && (
                      <p className="mt-1 text-[11.5px] text-icm-text-dim font-geist">{diagIcd10Description || "Enter code above"}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Description
                    </label>
                    <input
                      className="modal-input w-full"
                      value={diagIcd10Description}
                      onChange={(e) => setDiagIcd10Description(e.target.value)}
                      placeholder="Diagnosis description"
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Type *
                    </label>
                    <select
                      className="modal-input w-full"
                      value={diagType}
                      onChange={(e) => setDiagType(e.target.value as Diagnosis["diagnosis_type"])}
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="historical">Historical</option>
                    </select>
                    {willReplacePrimary && existingPrimary && (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11.5px] font-geist text-amber-800">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        This will replace &ldquo;{existingPrimary.icd10_code} — {existingPrimary.icd10_description}&rdquo; as the primary diagnosis (it will become secondary).
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Onset Date
                    </label>
                    <input
                      type="date"
                      className="modal-input w-full"
                      value={diagOnsetDate}
                      onChange={(e) => setDiagOnsetDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Diagnosed By
                    </label>
                    <input
                      className="modal-input w-full"
                      value={diagDiagnosedBy}
                      onChange={(e) => setDiagDiagnosedBy(e.target.value)}
                      placeholder="Provider or source"
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Notes
                    </label>
                    <textarea
                      className="modal-input w-full"
                      rows={3}
                      value={diagNotes}
                      onChange={(e) => setDiagNotes(e.target.value)}
                      placeholder="Additional notes…"
                    />
                  </div>
                </>
              )}

              {/* ── Medication form ── */}
              {(panelMode === "add-medication" || panelMode === "edit-medication") && (
                <>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Medication Name *
                    </label>
                    <MedTypeahead value={medName} onChange={setMedName} />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Brand Name
                    </label>
                    <input
                      className="modal-input w-full"
                      value={medBrand}
                      onChange={(e) => setMedBrand(e.target.value)}
                      placeholder="e.g. Risperdal"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                        Dosage
                      </label>
                      <input
                        className="modal-input w-full"
                        value={medDosage}
                        onChange={(e) => setMedDosage(e.target.value)}
                        placeholder="e.g. 5mg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                        Frequency
                      </label>
                      <input
                        className="modal-input w-full"
                        value={medFrequency}
                        onChange={(e) => setMedFrequency(e.target.value)}
                        placeholder="e.g. twice daily"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Route
                    </label>
                    <select
                      className="modal-input w-full"
                      value={medRoute}
                      onChange={(e) => setMedRoute(e.target.value)}
                    >
                      <option value="">— Select —</option>
                      <option>Oral</option>
                      <option>Sublingual</option>
                      <option>Topical</option>
                      <option>Injection (IM)</option>
                      <option>Injection (IV)</option>
                      <option>Injection (SC)</option>
                      <option>Inhalation</option>
                      <option>Rectal</option>
                      <option>Nasal</option>
                      <option>Ophthalmic</option>
                      <option>Otic</option>
                      <option>Patch/Transdermal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Prescribing Provider
                    </label>
                    <input
                      className="modal-input w-full"
                      value={medPrescriber}
                      onChange={(e) => setMedPrescriber(e.target.value)}
                      placeholder="Provider name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                        Start Date
                      </label>
                      <input
                        type="date"
                        className="modal-input w-full"
                        value={medStartDate}
                        onChange={(e) => setMedStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                        End Date
                      </label>
                      <input
                        type="date"
                        className="modal-input w-full"
                        value={medEndDate}
                        onChange={(e) => setMedEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Indication
                    </label>
                    <input
                      className="modal-input w-full"
                      value={medIndication}
                      onChange={(e) => setMedIndication(e.target.value)}
                      placeholder="What is this medication for?"
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Notes
                    </label>
                    <textarea
                      className="modal-input w-full"
                      rows={3}
                      value={medNotes}
                      onChange={(e) => setMedNotes(e.target.value)}
                      placeholder="Additional notes…"
                    />
                  </div>
                </>
              )}

              {/* ── Allergy form ── */}
              {(panelMode === "add-allergy" || panelMode === "edit-allergy") && (
                <>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Allergen *
                    </label>
                    <AllergenTypeahead value={allergyAllergen} onChange={setAllergyAllergen} />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Allergen Type
                    </label>
                    <select
                      className="modal-input w-full"
                      value={allergyType}
                      onChange={(e) => setAllergyType(e.target.value as Allergy["allergen_type"])}
                    >
                      <option value="medication">Medication</option>
                      <option value="food">Food</option>
                      <option value="environmental">Environmental</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Reaction
                    </label>
                    <input
                      className="modal-input w-full"
                      value={allergyReaction}
                      onChange={(e) => setAllergyReaction(e.target.value)}
                      placeholder="e.g. hives, anaphylaxis, rash"
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Severity *
                    </label>
                    <select
                      className="modal-input w-full"
                      value={allergySeverity}
                      onChange={(e) => setAllergySeverity(e.target.value as Allergy["severity"])}
                    >
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                      <option value="life-threatening">Life-threatening</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Date Identified
                    </label>
                    <input
                      type="date"
                      className="modal-input w-full"
                      value={allergyOnsetDate}
                      onChange={(e) => setAllergyOnsetDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1.5 uppercase tracking-wider">
                      Notes
                    </label>
                    <textarea
                      className="modal-input w-full"
                      rows={3}
                      value={allergyNotes}
                      onChange={(e) => setAllergyNotes(e.target.value)}
                      placeholder="Additional notes…"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Panel footer */}
            <div className="shrink-0 px-5 py-4 border-t border-icm-border flex items-center justify-end gap-3">
              <button
                onClick={closePanel}
                className="h-9 px-4 rounded-xl border border-icm-border text-[12.5px] font-geist font-medium text-icm-text-dim hover:text-icm-text"
              >
                Cancel
              </button>
              <button
                onClick={
                  panelMode.includes("diagnosis") ? saveDiagnosis :
                  panelMode.includes("medication") ? saveMedication :
                  saveAllergy
                }
                disabled={saving}
                className="h-9 px-4 rounded-xl bg-icm-accent text-white text-[12.5px] font-geist font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
