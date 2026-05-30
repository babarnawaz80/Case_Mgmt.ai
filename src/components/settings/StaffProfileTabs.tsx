// StaffProfileTabs — comprehensive staff profile form with 6 sub-tabs
// Covers all fields: Basic Info, Contact, Employment, Credentials,
// Compliance & Training, Emergency Contact, and System settings.

import { useState, useEffect, useCallback } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { AlertTriangle, X, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { TrainingRecordsSection } from "./TrainingRecordsSection";

/* ─── Constants ────────────────────────────────────────────── */

const GENDER_OPTIONS = [
  "Male",
  "Female",
  "Non-binary",
  "Other",
  "Prefer not to say",
];

const RACE_OPTIONS = [
  "White / Non-Hispanic",
  "Black / African American",
  "Hispanic / Latino",
  "Hispanic / Latina",
  "Asian / Pacific Islander",
  "South Asian",
  "Middle Eastern",
  "Native American / Alaska Native",
  "Two or More Races",
  "Other",
  "Prefer not to say",
];

const EMPLOYMENT_TYPE_OPTIONS = ["Full-Time", "Part-Time", "Contract", "Per Diem"];

const CREDENTIAL_OPTIONS = [
  "BSW",
  "MSW",
  "LCSW",
  "LMSW",
  "LGSW",
  "MA",
  "BA",
  "MS",
  "PhD",
  "QDDP",
  "BCBA",
];

const SPECIALIZATION_OPTIONS = [
  "IDD",
  "Autism Spectrum Disorder",
  "Behavioral Health",
  "Physical Disabilities",
  "Aging",
  "Child Welfare",
  "Youth Transition",
  "Substance Use",
  "Foster Care",
  "Reentry",
  "Refugee Services",
  "Housing and Homelessness",
];

const ROLE_OPTIONS = [
  { value: "case_manager", label: "Case Manager" },
  { value: "supervisor", label: "Supervisor" },
  { value: "admin", label: "Admin" },
];

/* ─── Helpers ──────────────────────────────────────────────── */

/** Returns days until the date (negative = already expired). null if no/invalid date. */
function daysUntilDate(dateStr: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

/** Parse a Firestore value to a string array (array or semicolon-delimited string). */
function parseMultiValue(v: unknown): string[] {
  if (Array.isArray(v)) return (v as string[]).filter(Boolean);
  if (typeof v === "string" && v.trim())
    return v
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}

/* ─── Form state shape ─────────────────────────────────────── */

interface ProfileForm {
  // Basic Identity
  first_name: string;
  last_name: string;
  preferred_name: string;
  date_of_birth: string;
  gender: string;
  race_ethnicity: string;
  primary_language: string;
  // Contact
  work_email: string;
  personal_email: string;
  work_phone: string;
  cell_phone: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  county: string;
  // Employment
  role: string;
  job_title: string;
  department: string;
  employment_type: string;
  hire_date: string;
  termination_date: string;
  supervisor_name: string;
  office_location: string;
  caseload_capacity: number;
  program_assignment: string[];
  states_licensed_in: string[];
  languages_spoken: string[];
  areas_of_specialization: string[];
  // Credentials
  credential: string;
  license_number: string;
  license_state: string;
  license_expiration_date: string;
  npi_type1: string;
  supervising_provider_npi: string;
  education_degree: string;
  education_field: string;
  education_school: string;
  education_grad_year: string;
  // Compliance & Training
  background_check_date: string;
  hipaa_training_date: string;
  mandatory_reporter_date: string;
  first_aid_expiration: string;
  other_certifications: string[];
  // Emergency Contact
  emergency_contact_name: string;
  emergency_relationship: string;
  emergency_phone: string;
  emergency_phone2: string;
  // System
  is_active: boolean;
  send_welcome_email: string;
  notes: string;
}

function makeInitialForm(u: any): ProfileForm {
  return {
    // Basic Identity
    first_name: u?.first_name || u?.firstName || "",
    last_name: u?.last_name || u?.lastName || "",
    preferred_name: u?.preferred_name || "",
    date_of_birth: u?.date_of_birth || "",
    gender: u?.gender || "",
    race_ethnicity: u?.race_ethnicity || "",
    primary_language: u?.primary_language || "",
    // Contact
    work_email: u?.work_email || u?.email || "",
    personal_email: u?.personal_email || "",
    work_phone: u?.work_phone || u?.phone || u?.phoneNumber || "",
    cell_phone: u?.cell_phone || "",
    address_street: u?.address_street || "",
    address_city: u?.address_city || "",
    address_state: u?.address_state || "",
    address_zip: u?.address_zip || "",
    county: u?.county || "",
    // Employment
    role: u?.role || "case_manager",
    job_title: u?.job_title || u?.title || "",
    department: u?.department || "",
    employment_type: u?.employment_type || "",
    hire_date: u?.hire_date || "",
    termination_date: u?.termination_date || "",
    supervisor_name: u?.supervisor_name || u?.supervisor || "",
    office_location: u?.office_location || "",
    caseload_capacity:
      typeof u?.caseload_capacity === "number"
        ? u.caseload_capacity
        : typeof u?.caseloadCapacity === "number"
        ? u.caseloadCapacity
        : 0,
    program_assignment: parseMultiValue(u?.program_assignment ?? u?.programs),
    states_licensed_in: parseMultiValue(u?.states_licensed_in ?? u?.states),
    languages_spoken: parseMultiValue(u?.languages_spoken),
    areas_of_specialization: parseMultiValue(u?.areas_of_specialization),
    // Credentials
    credential: u?.credential || u?.providerInfo?.credentialType || "",
    license_number:
      u?.license_number || u?.licenseNumber || u?.providerInfo?.licenseNumber || "",
    license_state: u?.license_state || "",
    license_expiration_date:
      u?.license_expiration_date || u?.providerInfo?.licenseExpiration || "",
    npi_type1: u?.npi_type1 || u?.npi || u?.providerInfo?.npi || "",
    supervising_provider_npi: u?.supervising_provider_npi || "",
    education_degree: u?.education_degree || "",
    education_field: u?.education_field || "",
    education_school: u?.education_school || "",
    education_grad_year: u?.education_grad_year || "",
    // Compliance & Training
    background_check_date: u?.background_check_date || "",
    hipaa_training_date: u?.hipaa_training_date || "",
    mandatory_reporter_date: u?.mandatory_reporter_date || "",
    first_aid_expiration: u?.first_aid_expiration || "",
    other_certifications: parseMultiValue(u?.other_certifications),
    // Emergency Contact
    emergency_contact_name: u?.emergency_contact_name || "",
    emergency_relationship: u?.emergency_relationship || "",
    emergency_phone: u?.emergency_phone || "",
    emergency_phone2: u?.emergency_phone2 || "",
    // System
    is_active: u?.is_active !== false && u?.isActive !== false,
    send_welcome_email: u?.send_welcome_email || "No",
    notes: u?.notes || "",
  };
}

/* ─── Primitive form controls ──────────────────────────────── */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
      {children}
    </label>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="col-span-full text-[10px] font-geist font-bold uppercase tracking-widest text-icm-text-dim mt-3 first:mt-0 pb-1 border-b border-icm-border">
      {children}
    </p>
  );
}

const INPUT_BASE =
  "w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-accent transition-colors";

function FField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(INPUT_BASE, "mt-1")}
      />
    </div>
  );
}

function FSelect({
  label,
  value,
  onChange,
  options,
  emptyLabel,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
  emptyLabel?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(INPUT_BASE, "mt-1 px-2 cursor-pointer")}
      >
        {emptyLabel && <option value="">{emptyLabel}</option>}
        {options.map((o) =>
          typeof o === "string" ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          )
        )}
      </select>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  warnLabel,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  warnLabel?: string;
  className?: string;
}) {
  const days = daysUntilDate(value);
  const expired = days !== null && days < 0;
  const expiring = days !== null && days >= 0 && days <= 60;
  const showWarn = warnLabel && (expired || expiring);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 flex-wrap">
        <Label>{label}</Label>
        {showWarn && (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-geist font-semibold ring-1",
              expired
                ? "bg-icm-red-soft text-icm-red ring-icm-red/20"
                : "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
            )}
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            {expired
              ? `Expired ${Math.abs(days!)}d ago`
              : `Expires in ${days}d`}
          </span>
        )}
      </div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          INPUT_BASE,
          "mt-1",
          expired
            ? "border-icm-red"
            : expiring
            ? "border-icm-amber"
            : "border-icm-border"
        )}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  className,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(
            Math.max(min, Math.min(max, parseInt(e.target.value, 10) || 0))
          )
        }
        className={cn(INPUT_BASE, "mt-1")}
      />
    </div>
  );
}

function FTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-1 w-full px-3 py-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-accent transition-colors resize-none"
      />
    </div>
  );
}

/* ─── Tag input ────────────────────────────────────────────── */

function TagInput({
  label,
  values,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  };

  const removeTag = (tag: string) => onChange(values.filter((v) => v !== tag));

  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-1 border border-icm-border rounded-xl bg-icm-panel p-2 flex flex-wrap gap-1.5 min-h-[38px] focus-within:border-icm-accent transition-colors">
        {values.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-icm-accent-soft text-icm-accent text-[11px] font-geist font-semibold px-2 py-0.5 rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-icm-red transition-colors"
              aria-label={`Remove ${tag}`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ";") {
              e.preventDefault();
              addTag();
            }
            if (e.key === "Backspace" && !input && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          placeholder={values.length === 0 ? (placeholder ?? "Type and press Enter…") : "Add more…"}
          className="flex-1 min-w-[100px] text-[12px] font-geist text-icm-text bg-transparent focus:outline-none placeholder:text-icm-text-faint"
        />
        {input.trim() && (
          <button
            type="button"
            onClick={addTag}
            className="text-icm-accent hover:text-icm-accent/80 shrink-0 transition-colors"
            aria-label="Add"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <p className="text-[10px] font-geist text-icm-text-faint mt-0.5">
        Press Enter or ";" to add each item
      </p>
    </div>
  );
}

/* ─── Multi-checkbox (specializations) ────────────────────── */

function MultiChip({
  label,
  options,
  values,
  onChange,
  className,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
  className?: string;
}) {
  const toggle = (opt: string) =>
    onChange(
      values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]
    );

  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 mt-1.5">
        {options.map((opt) => {
          const checked = values.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={cn(
                "text-[11px] font-geist font-semibold px-2.5 py-1 rounded-full border transition-colors",
                checked
                  ? "bg-icm-accent text-white border-icm-accent"
                  : "bg-icm-panel text-icm-text-dim border-icm-border hover:border-icm-accent hover:text-icm-accent"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Sub-tab bar ──────────────────────────────────────────── */

type ProfileSubTab =
  | "basic"
  | "contact"
  | "employment"
  | "credentials"
  | "compliance"
  | "emergency";

const PROFILE_SUBTABS: { k: ProfileSubTab; label: string }[] = [
  { k: "basic",       label: "Basic Info"           },
  { k: "contact",     label: "Contact"              },
  { k: "employment",  label: "Employment"           },
  { k: "credentials", label: "Credentials"          },
  { k: "compliance",  label: "Compliance & Training" },
  { k: "emergency",   label: "Emergency Contact"    },
];

/* ─── Exported component ───────────────────────────────────── */

export function StaffProfileTabs({
  firestoreUser,
  realUid,
  onSaved,
}: {
  firestoreUser: any;
  realUid: string;
  onSaved?: (updatedData: any) => void;
}) {
  const { currentUser, refreshProfile } = useAuth();
  const [subTab, setSubTab] = useState<ProfileSubTab>("basic");
  const [form, setForm] = useState<ProfileForm>(() =>
    makeInitialForm(firestoreUser)
  );
  const [saving, setSaving] = useState(false);

  // Re-init when firestoreUser loads / changes
  useEffect(() => {
    if (firestoreUser) setForm(makeInitialForm(firestoreUser));
  }, [firestoreUser]);

  const set = useCallback(
    <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    []
  );

  // ── Compliance expiry warnings shown at top ─────────────────
  const WARN_FIELDS = [
    { key: "license_expiration_date", label: "License",           value: form.license_expiration_date },
    { key: "background_check_date",   label: "Background Check",  value: form.background_check_date   },
    { key: "hipaa_training_date",     label: "HIPAA Training",    value: form.hipaa_training_date     },
    { key: "mandatory_reporter_date", label: "Mandatory Reporter",value: form.mandatory_reporter_date },
    { key: "first_aid_expiration",    label: "First Aid",         value: form.first_aid_expiration    },
  ] as const;

  const warnings = WARN_FIELDS.filter(({ value }) => {
    const d = daysUntilDate(value);
    return d !== null && d <= 60;
  });

  // ── Save ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!realUid) {
      toast.error("Cannot save: user ID not resolved");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        // All snake_case profile fields
        ...form,
        // Mirror to camelCase legacy fields used elsewhere in the app
        firstName:    form.first_name,
        lastName:     form.last_name,
        displayName:  `${form.first_name} ${form.last_name}`.trim(),
        email:        form.work_email,
        phone:        form.work_phone,
        phoneNumber:  form.work_phone,
        title:        form.job_title,
        credential:   form.credential,
        department:   form.department,
        supervisor:   form.supervisor_name,
        role:         form.role,
        isActive:     form.is_active,
        caseload:     form.caseload_capacity,
        caseloadCapacity: form.caseload_capacity,
        programs:     form.program_assignment,
        states:       form.states_licensed_in,
        updatedAt:    new Date().toISOString(),
      };
      await setDoc(doc(db, "users", realUid), payload, { merge: true });
      if (refreshProfile && realUid === currentUser?.uid) {
        await refreshProfile();
      }
      onSaved?.(payload);
      toast.success("Profile saved successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save profile", { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="space-y-3 max-w-[720px]">

      {/* Expiry warning banners */}
      {warnings.length > 0 && (
        <div className="space-y-1.5">
          {warnings.map(({ key, label, value }) => {
            const days = daysUntilDate(value)!;
            const expired = days < 0;
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl ring-1 text-[11.5px] font-geist font-semibold",
                  expired
                    ? "bg-icm-red-soft text-icm-red ring-icm-red/20"
                    : "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {expired
                  ? `${label} expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`
                  : `${label} expires in ${days} day${days === 1 ? "" : "s"}`}
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-tab bar */}
      <div className="flex items-center gap-0.5 border-b border-icm-border overflow-x-auto">
        {PROFILE_SUBTABS.map((t) => (
          <button
            key={t.k}
            onClick={() => setSubTab(t.k)}
            className={cn(
              "h-8 px-3 text-[12px] font-geist font-semibold whitespace-nowrap transition-colors -mb-px border-b-2 shrink-0",
              subTab === t.k
                ? "text-icm-accent border-icm-accent"
                : "text-icm-text-dim border-transparent hover:text-icm-text"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">

        {/* BASIC INFO */}
        {subTab === "basic" && (
          <div className="grid grid-cols-2 gap-3">
            <SectionHeading>Identity</SectionHeading>
            <FField
              label="First Name"
              value={form.first_name}
              onChange={(v) => set("first_name", v)}
            />
            <FField
              label="Last Name"
              value={form.last_name}
              onChange={(v) => set("last_name", v)}
            />
            <FField
              label="Preferred Name"
              value={form.preferred_name}
              onChange={(v) => set("preferred_name", v)}
              placeholder="Goes by…"
            />
            <DateField
              label="Date of Birth"
              value={form.date_of_birth}
              onChange={(v) => set("date_of_birth", v)}
            />
            <FSelect
              label="Gender"
              value={form.gender}
              onChange={(v) => set("gender", v)}
              options={GENDER_OPTIONS}
              emptyLabel="Select…"
            />
            <FSelect
              label="Race / Ethnicity"
              value={form.race_ethnicity}
              onChange={(v) => set("race_ethnicity", v)}
              options={RACE_OPTIONS}
              emptyLabel="Select…"
            />
            <FField
              label="Primary Language"
              value={form.primary_language}
              onChange={(v) => set("primary_language", v)}
              placeholder="e.g. English, Spanish"
              className="col-span-2"
            />
          </div>
        )}

        {/* CONTACT */}
        {subTab === "contact" && (
          <div className="grid grid-cols-2 gap-3">
            <SectionHeading>Email</SectionHeading>
            <FField
              label="Work Email"
              value={form.work_email}
              onChange={(v) => set("work_email", v)}
              type="email"
            />
            <FField
              label="Personal Email"
              value={form.personal_email}
              onChange={(v) => set("personal_email", v)}
              type="email"
            />

            <SectionHeading>Phone</SectionHeading>
            <FField
              label="Work Phone"
              value={form.work_phone}
              onChange={(v) => set("work_phone", v)}
              placeholder="(555) 000-0000"
            />
            <FField
              label="Cell Phone"
              value={form.cell_phone}
              onChange={(v) => set("cell_phone", v)}
              placeholder="(555) 000-0000"
            />

            <SectionHeading>Address</SectionHeading>
            <FField
              label="Street Address"
              value={form.address_street}
              onChange={(v) => set("address_street", v)}
              className="col-span-2"
            />
            <FField
              label="City"
              value={form.address_city}
              onChange={(v) => set("address_city", v)}
            />
            <FField
              label="State"
              value={form.address_state}
              onChange={(v) => set("address_state", v)}
              placeholder="e.g. CA"
            />
            <FField
              label="ZIP Code"
              value={form.address_zip}
              onChange={(v) => set("address_zip", v)}
              placeholder="00000"
            />
            <FField
              label="County"
              value={form.county}
              onChange={(v) => set("county", v)}
            />
          </div>
        )}

        {/* EMPLOYMENT */}
        {subTab === "employment" && (
          <div className="grid grid-cols-2 gap-3">
            <SectionHeading>Position</SectionHeading>
            <FSelect
              label="Role"
              value={form.role}
              onChange={(v) => {
                set("role", v);
                if (v === "supervisor" || v === "admin") {
                  set("caseload_capacity", 0);
                }
              }}
              options={ROLE_OPTIONS}
            />
            <FField
              label="Job Title"
              value={form.job_title}
              onChange={(v) => set("job_title", v)}
              placeholder="e.g. Case Manager"
            />
            <FField
              label="Department"
              value={form.department}
              onChange={(v) => set("department", v)}
            />
            <FSelect
              label="Employment Type"
              value={form.employment_type}
              onChange={(v) => set("employment_type", v)}
              options={EMPLOYMENT_TYPE_OPTIONS}
              emptyLabel="Select…"
            />

            <SectionHeading>Dates</SectionHeading>
            <DateField
              label="Hire Date"
              value={form.hire_date}
              onChange={(v) => set("hire_date", v)}
            />
            <DateField
              label="Termination Date"
              value={form.termination_date}
              onChange={(v) => set("termination_date", v)}
            />

            <SectionHeading>Assignments</SectionHeading>
            <FField
              label="Supervisor Name"
              value={form.supervisor_name}
              onChange={(v) => set("supervisor_name", v)}
            />
            <FField
              label="Office Location"
              value={form.office_location}
              onChange={(v) => set("office_location", v)}
            />
            <NumberField
              label="Caseload Capacity"
              value={form.caseload_capacity}
              onChange={(v) => set("caseload_capacity", v)}
              min={0}
              max={999}
            />
            <div /> {/* spacer */}

            <TagInput
              label="Program Assignment"
              values={form.program_assignment}
              onChange={(v) => set("program_assignment", v)}
              placeholder="Add program…"
              className="col-span-2"
            />
            <TagInput
              label="States Licensed In"
              values={form.states_licensed_in}
              onChange={(v) => set("states_licensed_in", v)}
              placeholder="e.g. CA, NY…"
              className="col-span-2"
            />
            <TagInput
              label="Languages Spoken"
              values={form.languages_spoken}
              onChange={(v) => set("languages_spoken", v)}
              placeholder="Add language…"
              className="col-span-2"
            />
            <MultiChip
              label="Areas of Specialization"
              options={SPECIALIZATION_OPTIONS}
              values={form.areas_of_specialization}
              onChange={(v) => set("areas_of_specialization", v)}
              className="col-span-2"
            />
          </div>
        )}

        {/* CREDENTIALS */}
        {subTab === "credentials" && (
          <div className="grid grid-cols-2 gap-3">
            <SectionHeading>License & Credential</SectionHeading>
            <FSelect
              label="Credential"
              value={form.credential}
              onChange={(v) => set("credential", v)}
              options={CREDENTIAL_OPTIONS}
              emptyLabel="Select…"
            />
            <FField
              label="License Number"
              value={form.license_number}
              onChange={(v) => set("license_number", v)}
            />
            <FField
              label="License State"
              value={form.license_state}
              onChange={(v) => set("license_state", v)}
              placeholder="e.g. CA"
            />
            <DateField
              label="License Expiration Date"
              value={form.license_expiration_date}
              onChange={(v) => set("license_expiration_date", v)}
              warnLabel="License"
            />

            <SectionHeading>NPI</SectionHeading>
            <FField
              label="NPI Type 1"
              value={form.npi_type1}
              onChange={(v) => set("npi_type1", v)}
              placeholder="10-digit NPI"
            />
            <FField
              label="Supervising Provider NPI"
              value={form.supervising_provider_npi}
              onChange={(v) => set("supervising_provider_npi", v)}
            />

            <SectionHeading>Education</SectionHeading>
            <FField
              label="Degree"
              value={form.education_degree}
              onChange={(v) => set("education_degree", v)}
              placeholder="e.g. MSW"
            />
            <FField
              label="Field of Study"
              value={form.education_field}
              onChange={(v) => set("education_field", v)}
              placeholder="e.g. Social Work"
            />
            <FField
              label="School / University"
              value={form.education_school}
              onChange={(v) => set("education_school", v)}
              className="col-span-2"
            />
            <FField
              label="Graduation Year"
              value={form.education_grad_year}
              onChange={(v) => set("education_grad_year", v)}
              placeholder="YYYY"
            />
          </div>
        )}

        {/* COMPLIANCE & TRAINING */}
        {subTab === "compliance" && (
          <div className="grid grid-cols-2 gap-3">
            <SectionHeading>Compliance Dates</SectionHeading>
            <DateField
              label="Background Check Date"
              value={form.background_check_date}
              onChange={(v) => set("background_check_date", v)}
              warnLabel="Background Check"
            />
            <DateField
              label="HIPAA Training Date"
              value={form.hipaa_training_date}
              onChange={(v) => set("hipaa_training_date", v)}
              warnLabel="HIPAA Training"
            />
            <DateField
              label="Mandatory Reporter Date"
              value={form.mandatory_reporter_date}
              onChange={(v) => set("mandatory_reporter_date", v)}
              warnLabel="Mandatory Reporter"
            />
            <DateField
              label="First Aid Expiration"
              value={form.first_aid_expiration}
              onChange={(v) => set("first_aid_expiration", v)}
              warnLabel="First Aid"
            />
            <TagInput
              label="Other Certifications"
              values={form.other_certifications}
              onChange={(v) => set("other_certifications", v)}
              placeholder="Add certification…"
              className="col-span-2"
            />
            {/* Full training records section */}
            {realUid && <TrainingRecordsSection userId={realUid} />}
          </div>
        )}

        {/* EMERGENCY CONTACT */}
        {subTab === "emergency" && (
          <div className="grid grid-cols-2 gap-3">
            <SectionHeading>Emergency Contact Information</SectionHeading>
            <FField
              label="Contact Name"
              value={form.emergency_contact_name}
              onChange={(v) => set("emergency_contact_name", v)}
              className="col-span-2"
            />
            <FField
              label="Relationship"
              value={form.emergency_relationship}
              onChange={(v) => set("emergency_relationship", v)}
              placeholder="e.g. Spouse, Parent"
            />
            <div /> {/* spacer */}
            <FField
              label="Primary Phone"
              value={form.emergency_phone}
              onChange={(v) => set("emergency_phone", v)}
              placeholder="(555) 000-0000"
            />
            <FField
              label="Secondary Phone"
              value={form.emergency_phone2}
              onChange={(v) => set("emergency_phone2", v)}
              placeholder="(555) 000-0000"
            />
          </div>
        )}
      </div>

      {/* System fields — always visible below sub-tabs */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
        <p className="text-[10px] font-geist font-bold uppercase tracking-widest text-icm-text-dim">
          System
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Account Status</Label>
            <div className="flex items-center gap-4 mt-2">
              {(["Active", "Inactive"] as const).map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-1.5 text-[12px] font-geist text-icm-text cursor-pointer"
                >
                  <input
                    type="radio"
                    name="is_active_radio"
                    checked={opt === "Active" ? form.is_active : !form.is_active}
                    onChange={() => set("is_active", opt === "Active")}
                    className="accent-icm-accent"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          <FSelect
            label="Send Welcome Email"
            value={form.send_welcome_email}
            onChange={(v) => set("send_welcome_email", v)}
            options={["Yes", "No"]}
          />
        </div>
        <FTextarea
          label="Notes"
          value={form.notes}
          onChange={(v) => set("notes", v)}
          placeholder="Internal notes about this staff member…"
          rows={3}
        />
        <div className="flex justify-end pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 transition-opacity"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
