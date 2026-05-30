import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Building2,
  ChevronLeft,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProvider,
  addProvider,
  updateProvider,
  type Provider,
} from "@/hooks/useProviders";

// ─── Constants ─────────────────────────────────────────────────────────────────

const PROVIDER_TYPES = [
  "Day Services / Day Habilitation",
  "Employment & Vocational",
  "Residential / Group Home",
  "Supported Living",
  "Behavioral Health",
  "Community Habilitation",
  "Respite Care",
  "Transportation",
  "Healthcare / Medical",
  "Mental Health",
  "Substance Use Treatment",
  "Family Support",
  "Therapy (OT/PT/Speech)",
  "Other",
];

const SERVICES_LIST = [
  "Targeted Case Management",
  "Community Integration & Habilitation",
  "Supported Employment — Individual",
  "Supported Employment — Small Group",
  "Day Services / Day Habilitation",
  "Behavioral Health",
  "Family Supports",
  "Respite Care",
  "Transportation",
  "Residential",
  "Other",
];

const FUNDING_SOURCES = [
  "Medicaid Waiver",
  "Medicaid FFS",
  "Medicare",
  "Private Insurance",
  "State Block Grant",
  "County Funds",
  "Private Pay",
  "Other",
];

const POPULATIONS = [
  "Intellectual Disability",
  "Developmental Disability",
  "Autism Spectrum Disorder",
  "Traumatic Brain Injury",
  "Physical Disability",
  "Mental Health",
  "Substance Use",
  "Aging / Elderly",
  "Children & Youth",
  "Adults",
  "Dual Diagnosis",
];

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "Portuguese",
  "Mandarin",
  "Arabic",
  "Haitian Creole",
  "Russian",
  "Vietnamese",
  "Sign Language",
  "Other",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

// ─── Types ─────────────────────────────────────────────────────────────────────

type FormData = {
  name: string;
  type: string;
  npiNumber: string;
  taxId: string;
  medicaidProviderNumber: string;
  website: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  primaryPhone: string;
  secondaryPhone: string;
  email: string;
  contactPersonName: string;
  contactPersonTitle: string;
  contactPersonPhone: string;
  contactPersonEmail: string;
  servicesOffered: string[];
  geographicCoverage: string[];
  statesCovered: string[];
  populationsServed: string[];
  ageMin: string;
  ageMax: string;
  languages: string[];
  isAcceptingClients: "yes" | "no" | "waitlist";
  currentOpenings: string;
  typicalStartTime: string;
  waitlistEstimate: string;
  medicaidContracted: boolean;
  contractStatus: "active" | "expired" | "pending" | "none";
  contractStartDate: string;
  contractEndDate: string;
  acceptedFundingSources: string[];
  rateNotes: string;
  internalNotes: string;
  status: "active" | "archived" | "pending_review";
};

const EMPTY_FORM: FormData = {
  name: "",
  type: "",
  npiNumber: "",
  taxId: "",
  medicaidProviderNumber: "",
  website: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  county: "",
  primaryPhone: "",
  secondaryPhone: "",
  email: "",
  contactPersonName: "",
  contactPersonTitle: "",
  contactPersonPhone: "",
  contactPersonEmail: "",
  servicesOffered: [],
  geographicCoverage: [],
  statesCovered: [],
  populationsServed: [],
  ageMin: "",
  ageMax: "",
  languages: [],
  isAcceptingClients: "yes",
  currentOpenings: "",
  typicalStartTime: "",
  waitlistEstimate: "",
  medicaidContracted: false,
  contractStatus: "none",
  contractStartDate: "",
  contractEndDate: "",
  acceptedFundingSources: [],
  rateNotes: "",
  internalNotes: "",
  status: "active",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-manrope font-bold text-[14px] text-icm-text">{title}</h3>
      {subtitle && <p className="text-[12px] font-geist text-icm-text-dim mt-0.5">{subtitle}</p>}
    </div>
  );
}

function FormGroup({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11.5px] font-geist font-semibold text-icm-text mb-1">
        {label}{required && <span className="text-icm-red ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "h-9 w-full px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong transition-colors";
const textareaCls = "w-full px-3 py-2.5 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong transition-colors resize-none";

function CheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(opt: string) {
    onChange(
      selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]
    );
  }
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            className="w-4 h-4 rounded border-icm-border text-icm-accent focus:ring-0 focus:ring-offset-0"
          />
          <span className="text-[12px] font-geist text-icm-text group-hover:text-icm-text transition-colors">{opt}</span>
        </label>
      ))}
    </div>
  );
}

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function add() {
    const trimmed = input.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setInput("");
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? "Type and press Enter"}
          className={cn(inputCls, "flex-1")}
        />
        <button
          type="button"
          onClick={add}
          className="h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-icm-text-dim hover:text-icm-text text-[12px] font-geist font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-icm-accent-soft text-icm-accent border border-icm-accent/20 text-[11px] font-geist font-medium">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProviderForm() {
  const { providerId } = useParams<{ providerId?: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const isEdit = !!providerId && providerId !== "new";
  const { data: existing, loading: existingLoading } = useProvider(isEdit ? providerId : undefined);

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (isEdit && existing) {
      setForm({
        name: existing.name ?? "",
        type: existing.type ?? "",
        npiNumber: existing.npiNumber ?? "",
        taxId: existing.taxId ?? "",
        medicaidProviderNumber: existing.medicaidProviderNumber ?? "",
        website: existing.website ?? "",
        street: existing.street ?? "",
        city: existing.city ?? "",
        state: existing.state ?? "",
        zip: existing.zip ?? "",
        county: existing.county ?? "",
        primaryPhone: existing.primaryPhone ?? "",
        secondaryPhone: existing.secondaryPhone ?? "",
        email: existing.email ?? "",
        contactPersonName: existing.contactPersonName ?? "",
        contactPersonTitle: existing.contactPersonTitle ?? "",
        contactPersonPhone: existing.contactPersonPhone ?? "",
        contactPersonEmail: existing.contactPersonEmail ?? "",
        servicesOffered: existing.servicesOffered ?? [],
        geographicCoverage: existing.geographicCoverage ?? [],
        statesCovered: existing.statesCovered ?? [],
        populationsServed: existing.populationsServed ?? [],
        ageMin: existing.ageMin != null ? String(existing.ageMin) : "",
        ageMax: existing.ageMax != null ? String(existing.ageMax) : "",
        languages: existing.languages ?? [],
        isAcceptingClients: existing.isAcceptingClients ?? "yes",
        currentOpenings: existing.currentOpenings != null ? String(existing.currentOpenings) : "",
        typicalStartTime: existing.typicalStartTime ?? "",
        waitlistEstimate: existing.waitlistEstimate ?? "",
        medicaidContracted: existing.medicaidContracted ?? false,
        contractStatus: existing.contractStatus ?? "none",
        contractStartDate: existing.contractStartDate ?? "",
        contractEndDate: existing.contractEndDate ?? "",
        acceptedFundingSources: existing.acceptedFundingSources ?? [],
        rateNotes: existing.rateNotes ?? "",
        internalNotes: existing.internalNotes ?? "",
        status: existing.status ?? "active",
      });
    }
  }, [isEdit, existing?.id]);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const next = { ...e }; delete next[key]; return next; });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Provider name is required.";
    if (!form.type) errs.type = "Provider type is required.";
    if (!form.city.trim()) errs.city = "City is required.";
    if (!form.state) errs.state = "State is required.";
    if (!form.primaryPhone.trim()) errs.primaryPhone = "Primary phone is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave(status: "active" | "pending_review") {
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setSaving(true);
    try {
      const payload: Omit<Provider, "id" | "addedAt" | "updatedAt"> = {
        name: form.name.trim(),
        type: form.type,
        npiNumber: form.npiNumber || undefined,
        taxId: form.taxId || undefined,
        medicaidProviderNumber: form.medicaidProviderNumber || undefined,
        website: form.website || undefined,
        street: form.street || undefined,
        city: form.city.trim(),
        state: form.state,
        zip: form.zip || undefined,
        county: form.county || undefined,
        primaryPhone: form.primaryPhone.trim(),
        secondaryPhone: form.secondaryPhone || undefined,
        email: form.email || undefined,
        contactPersonName: form.contactPersonName || undefined,
        contactPersonTitle: form.contactPersonTitle || undefined,
        contactPersonPhone: form.contactPersonPhone || undefined,
        contactPersonEmail: form.contactPersonEmail || undefined,
        servicesOffered: form.servicesOffered,
        geographicCoverage: form.geographicCoverage,
        statesCovered: form.statesCovered,
        populationsServed: form.populationsServed,
        ageMin: form.ageMin !== "" ? parseInt(form.ageMin, 10) : null,
        ageMax: form.ageMax !== "" ? parseInt(form.ageMax, 10) : null,
        languages: form.languages,
        isAcceptingClients: form.isAcceptingClients,
        currentOpenings: form.currentOpenings !== "" ? parseInt(form.currentOpenings, 10) : null,
        typicalStartTime: form.typicalStartTime || undefined,
        waitlistEstimate: form.waitlistEstimate || undefined,
        medicaidContracted: form.medicaidContracted,
        contractStatus: form.contractStatus,
        contractStartDate: form.contractStartDate || null,
        contractEndDate: form.contractEndDate || null,
        acceptedFundingSources: form.acceptedFundingSources,
        rateNotes: form.rateNotes || undefined,
        internalNotes: form.internalNotes || undefined,
        status,
        addedBy: profile?.uid,
        orgId: profile?.organizationId,
      };

      if (isEdit && providerId) {
        await updateProvider(providerId, payload);
        toast.success("Provider updated.");
      } else {
        await addProvider(payload);
        toast.success("Provider added.");
      }
      navigate("/admin/provider-directory");
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && existingLoading) {
    return (
      <ICMShell title="Edit Provider" showAIPanel={false}>
        <div className="flex items-center justify-center py-20 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading provider…</span>
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title={isEdit ? "Edit Provider" : "Add Provider"} showAIPanel={false}>
      <div className="max-w-[820px] space-y-6">
        {/* Breadcrumb */}
        <Breadcrumbs
          items={[
            { label: "Admin Settings", to: "/settings" },
            { label: "Provider Directory", to: "/admin/provider-directory" },
            { label: isEdit ? "Edit Provider" : "Add Provider" },
          ]}
        />

        {/* Page title */}
        <div>
          <h1 className="font-manrope text-[24px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
            {isEdit ? "Edit Provider" : "Add Provider"}
          </h1>
          <p className="text-[13px] font-geist text-icm-text-dim mt-1">
            {isEdit ? "Update provider information in your directory." : "Add a new provider to your organization's directory."}
          </p>
        </div>

        {/* ─── Section 1: Organization Information ─── */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-4">
          <SectionHeader title="1. Organization Information" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FormGroup label="Provider Name" required>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Organization legal name"
                  className={cn(inputCls, errors.name && "border-icm-red")}
                />
                {errors.name && <p className="text-[11px] text-icm-red mt-1">{errors.name}</p>}
              </FormGroup>
            </div>
            <div className="md:col-span-2">
              <FormGroup label="Provider Type" required>
                <select
                  value={form.type}
                  onChange={(e) => set("type", e.target.value)}
                  className={cn(inputCls, errors.type && "border-icm-red")}
                >
                  <option value="">Select type…</option>
                  {PROVIDER_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {errors.type && <p className="text-[11px] text-icm-red mt-1">{errors.type}</p>}
              </FormGroup>
            </div>
            <FormGroup label="NPI Number">
              <input value={form.npiNumber} onChange={(e) => set("npiNumber", e.target.value)} placeholder="10-digit NPI" className={inputCls} />
            </FormGroup>
            <FormGroup label="Tax ID">
              <input value={form.taxId} onChange={(e) => set("taxId", e.target.value)} placeholder="XX-XXXXXXX" className={inputCls} />
            </FormGroup>
            <FormGroup label="Medicaid Provider Number">
              <input value={form.medicaidProviderNumber} onChange={(e) => set("medicaidProviderNumber", e.target.value)} placeholder="Medicaid provider ID" className={inputCls} />
            </FormGroup>
            <FormGroup label="Website">
              <input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" type="url" className={inputCls} />
            </FormGroup>
          </div>
        </div>

        {/* ─── Section 2: Contact Information ─── */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-4">
          <SectionHeader title="2. Contact Information" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FormGroup label="Street Address" required>
                <input value={form.street} onChange={(e) => set("street", e.target.value)} placeholder="123 Main St" className={inputCls} />
              </FormGroup>
            </div>
            <FormGroup label="City" required>
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="City"
                className={cn(inputCls, errors.city && "border-icm-red")}
              />
              {errors.city && <p className="text-[11px] text-icm-red mt-1">{errors.city}</p>}
            </FormGroup>
            <FormGroup label="State" required>
              <select
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                className={cn(inputCls, errors.state && "border-icm-red")}
              >
                <option value="">Select state…</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.state && <p className="text-[11px] text-icm-red mt-1">{errors.state}</p>}
            </FormGroup>
            <FormGroup label="ZIP Code">
              <input value={form.zip} onChange={(e) => set("zip", e.target.value)} placeholder="XXXXX" className={inputCls} />
            </FormGroup>
            <FormGroup label="County">
              <input value={form.county} onChange={(e) => set("county", e.target.value)} placeholder="County name" className={inputCls} />
            </FormGroup>
            <FormGroup label="Primary Phone" required>
              <input
                value={form.primaryPhone}
                onChange={(e) => set("primaryPhone", e.target.value)}
                placeholder="(555) 555-5555"
                type="tel"
                className={cn(inputCls, errors.primaryPhone && "border-icm-red")}
              />
              {errors.primaryPhone && <p className="text-[11px] text-icm-red mt-1">{errors.primaryPhone}</p>}
            </FormGroup>
            <FormGroup label="Secondary Phone">
              <input value={form.secondaryPhone} onChange={(e) => set("secondaryPhone", e.target.value)} placeholder="(555) 555-5555" type="tel" className={inputCls} />
            </FormGroup>
            <div className="md:col-span-2">
              <FormGroup label="Email">
                <input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="contact@provider.org" type="email" className={inputCls} />
              </FormGroup>
            </div>

            {/* Contact Person */}
            <div className="md:col-span-2 pt-2 border-t border-icm-border">
              <p className="text-[11.5px] font-geist font-semibold text-icm-text-dim mb-3">Primary Contact Person</p>
            </div>
            <FormGroup label="Contact Name">
              <input value={form.contactPersonName} onChange={(e) => set("contactPersonName", e.target.value)} placeholder="Full name" className={inputCls} />
            </FormGroup>
            <FormGroup label="Title / Role">
              <input value={form.contactPersonTitle} onChange={(e) => set("contactPersonTitle", e.target.value)} placeholder="e.g. Program Director" className={inputCls} />
            </FormGroup>
            <FormGroup label="Contact Phone">
              <input value={form.contactPersonPhone} onChange={(e) => set("contactPersonPhone", e.target.value)} placeholder="(555) 555-5555" type="tel" className={inputCls} />
            </FormGroup>
            <FormGroup label="Contact Email">
              <input value={form.contactPersonEmail} onChange={(e) => set("contactPersonEmail", e.target.value)} placeholder="contact@provider.org" type="email" className={inputCls} />
            </FormGroup>
          </div>
        </div>

        {/* ─── Section 3: Services & Coverage ─── */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-4">
          <SectionHeader title="3. Services &amp; Coverage" />
          <FormGroup label="Services Offered">
            <CheckboxGroup
              options={SERVICES_LIST}
              selected={form.servicesOffered}
              onChange={(v) => set("servicesOffered", v)}
            />
          </FormGroup>
          <FormGroup label="Geographic Coverage (counties / regions)">
            <TagInput
              values={form.geographicCoverage}
              onChange={(v) => set("geographicCoverage", v)}
              placeholder="Type a county or region and press Enter"
            />
          </FormGroup>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormGroup label="States Covered">
              <div className="grid grid-cols-4 gap-1 max-h-40 overflow-y-auto rounded-xl border border-icm-border bg-icm-bg p-2">
                {US_STATES.map((s) => (
                  <label key={s} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.statesCovered.includes(s)}
                      onChange={() => {
                        set("statesCovered", form.statesCovered.includes(s)
                          ? form.statesCovered.filter((x) => x !== s)
                          : [...form.statesCovered, s]
                        );
                      }}
                      className="w-3 h-3"
                    />
                    <span className="text-[11px] font-geist text-icm-text">{s}</span>
                  </label>
                ))}
              </div>
            </FormGroup>
            <FormGroup label="Populations Served">
              <CheckboxGroup
                options={POPULATIONS}
                selected={form.populationsServed}
                onChange={(v) => set("populationsServed", v)}
              />
            </FormGroup>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Minimum Age">
              <input value={form.ageMin} onChange={(e) => set("ageMin", e.target.value)} type="number" min="0" placeholder="0" className={inputCls} />
            </FormGroup>
            <FormGroup label="Maximum Age">
              <input value={form.ageMax} onChange={(e) => set("ageMax", e.target.value)} type="number" min="0" placeholder="99" className={inputCls} />
            </FormGroup>
          </div>
          <FormGroup label="Languages Spoken">
            <CheckboxGroup
              options={LANGUAGES}
              selected={form.languages}
              onChange={(v) => set("languages", v)}
            />
          </FormGroup>
        </div>

        {/* ─── Section 4: Capacity & Availability ─── */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-4">
          <SectionHeader title="4. Capacity &amp; Availability" />
          <FormGroup label="Accepting New Clients">
            <div className="flex items-center gap-4">
              {(["yes", "no", "waitlist"] as const).map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isAcceptingClients"
                    value={opt}
                    checked={form.isAcceptingClients === opt}
                    onChange={() => set("isAcceptingClients", opt)}
                    className="w-4 h-4"
                  />
                  <span className="text-[12px] font-geist text-icm-text capitalize">{opt === "waitlist" ? "Waitlist" : opt === "yes" ? "Yes" : "No"}</span>
                </label>
              ))}
            </div>
          </FormGroup>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormGroup label="Current Openings">
              <input value={form.currentOpenings} onChange={(e) => set("currentOpenings", e.target.value)} type="number" min="0" placeholder="0" className={inputCls} />
            </FormGroup>
            <FormGroup label="Typical Start Time">
              <select value={form.typicalStartTime} onChange={(e) => set("typicalStartTime", e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                <option value="Immediate (within 2 weeks)">Immediate (within 2 weeks)</option>
                <option value="2–4 weeks">2–4 weeks</option>
                <option value="1–2 months">1–2 months</option>
                <option value="2–3 months">2–3 months</option>
                <option value="3–6 months">3–6 months</option>
                <option value="6+ months">6+ months</option>
                <option value="Unknown">Unknown</option>
              </select>
            </FormGroup>
            <FormGroup label="Waitlist Estimate">
              <input value={form.waitlistEstimate} onChange={(e) => set("waitlistEstimate", e.target.value)} placeholder="e.g. 3–6 months" className={inputCls} />
            </FormGroup>
          </div>
        </div>

        {/* ─── Section 5: Contract & Billing ─── */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-4">
          <SectionHeader title="5. Contract &amp; Billing" />
          <FormGroup label="Medicaid Contracted">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="medicaidContracted" checked={form.medicaidContracted} onChange={() => set("medicaidContracted", true)} className="w-4 h-4" />
                <span className="text-[12px] font-geist text-icm-text">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="medicaidContracted" checked={!form.medicaidContracted} onChange={() => set("medicaidContracted", false)} className="w-4 h-4" />
                <span className="text-[12px] font-geist text-icm-text">No</span>
              </label>
            </div>
          </FormGroup>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormGroup label="Contract Status">
              <select value={form.contractStatus} onChange={(e) => set("contractStatus", e.target.value as FormData["contractStatus"])} className={inputCls}>
                <option value="none">None</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
              </select>
            </FormGroup>
            <FormGroup label="Contract Start Date">
              <input value={form.contractStartDate} onChange={(e) => set("contractStartDate", e.target.value)} type="date" className={inputCls} />
            </FormGroup>
            <FormGroup label="Contract End Date">
              <input value={form.contractEndDate} onChange={(e) => set("contractEndDate", e.target.value)} type="date" className={inputCls} />
            </FormGroup>
          </div>
          <FormGroup label="Accepted Funding Sources">
            <CheckboxGroup
              options={FUNDING_SOURCES}
              selected={form.acceptedFundingSources}
              onChange={(v) => set("acceptedFundingSources", v)}
            />
          </FormGroup>
          <FormGroup label="Rate Notes">
            <textarea
              value={form.rateNotes}
              onChange={(e) => set("rateNotes", e.target.value)}
              placeholder="Notes about rates, billing codes, or contract terms…"
              rows={3}
              className={textareaCls}
            />
          </FormGroup>
        </div>

        {/* ─── Section 6: Internal Notes ─── */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
          <SectionHeader title="6. Internal Notes" subtitle="Visible only to your organization's staff." />
          <textarea
            value={form.internalNotes}
            onChange={(e) => set("internalNotes", e.target.value)}
            placeholder="Internal notes, referral history, quality notes…"
            rows={4}
            className={textareaCls}
          />
        </div>

        {/* ─── Footer ─── */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <button
            type="button"
            onClick={() => navigate("/admin/provider-directory")}
            className="h-9 px-4 rounded-xl border border-icm-border text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text flex items-center gap-1.5 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave("pending_review")}
              disabled={saving}
              className="h-9 px-4 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save as Draft"}
            </button>
            <button
              type="button"
              onClick={() => handleSave("active")}
              disabled={saving}
              className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 transition-opacity"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Building2 className="w-3.5 h-3.5" />
                  {isEdit ? "Update Provider" : "Save Provider"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </ICMShell>
  );
}
