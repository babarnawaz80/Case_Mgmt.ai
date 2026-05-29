import React, { useState, useEffect, useRef } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { writeAudit } from "@/lib/auditService";
import { Save, Loader2, Upload, X, ImagePlus, Link as LinkIcon } from "lucide-react";

interface OrgData {
  name: string;
  type: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  primaryContactName: string;
  primaryContactEmail: string;
  phone: string;
  fax: string;
  npi: string;
  licenseNumber: string;
  brandColor: string;
  states: string[];
}

const ORG_TYPES = ["IDD Provider", "Case Management Agency", "MCO", "State Agency", "Other"];
const ALL_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

const DEFAULT: OrgData = {
  name: "",
  type: "Case Management Agency",
  street: "",
  city: "",
  state: "",
  zip: "",
  county: "",
  primaryContactName: "",
  primaryContactEmail: "",
  phone: "",
  fax: "",
  npi: "",
  licenseNumber: "",
  brandColor: "#2563eb",
  states: [],
};

const SettingsOrganization = () => {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const [form, setForm] = useState<OrgData>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLinkUrl, setLogoLinkUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);


  // Load from Firestore on mount
  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    getDoc(doc(db, "organizations", orgId))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setForm({
            name: d.name ?? "",
            type: d.type ?? "Case Management Agency",
            street: d.street ?? "",
            city: d.city ?? "",
            state: d.state ?? "",
            zip: d.zip ?? "",
            county: d.county ?? "",
            primaryContactName: d.primaryContactName ?? "",
            primaryContactEmail: d.primaryContactEmail ?? "",
            phone: d.phone ?? "",
            fax: d.fax ?? "",
            npi: d.npi ?? "",
            licenseNumber: d.licenseNumber ?? "",
            brandColor: d.brandColor ?? "#0d9488",
            states: d.states ?? [],
          });
          setLogoUrl(d.logoUrl ?? null);
          setLogoLinkUrl(d.logoLinkUrl ?? "");
          // Apply saved brand color immediately
          if (d.brandColor) applyColorVar(d.brandColor);
        }
      })
      .catch((err) => {
        console.error("Failed to load org:", err);
        toast.error("Failed to load organization settings");
      })
      .finally(() => setLoading(false));
  }, [orgId]);


  const set = (key: keyof OrgData, value: string | string[]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleColorChange = (color: string) => {
    set("brandColor", color);
    applyColorVar(color);
  };

  const handleLogoUpload = async (file: File) => {
    if (!orgId) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Logo must be under 5 MB."); return; }
    setLogoUploading(true);
    // Instant preview
    const preview = URL.createObjectURL(file);
    setLogoUrl(preview);
    try {
      const path = `org_logos/${orgId}/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file, { contentType: file.type });
      await new Promise<void>((res, rej) => task.on("state_changed", null, rej, res));
      const url = await getDownloadURL(sRef);
      await updateDoc(doc(db, "organizations", orgId), { logoUrl: url, updatedAt: serverTimestamp() });
      URL.revokeObjectURL(preview);
      setLogoUrl(url);
      toast.success("Logo uploaded", { description: "Visible in the sidebar for all users." });
    } catch (err) {
      console.error(err);
      URL.revokeObjectURL(preview);
      setLogoUrl(null);
      toast.error("Logo upload failed. Please try again.");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name,
        brandColor: form.brandColor,
        address: {
          street: form.street,
          city: form.city,
          state: form.state,
          zip: form.zip,
          county: form.county,
        },
        phone: form.phone,
        fax: form.fax,
        states_of_operation: form.states,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, "organizations", orgId), {
        ...payload,
        logoLinkUrl: logoLinkUrl.trim() || null,
      });
      await writeAudit("update_organization", "organization", orgId, { name: form.name });
      toast.success("Organization profile saved", { description: "Changes propagated to all users." });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };


  return (
    <SettingsLayout
      title="Organization Profile"
      subtitle="Configure your organization's identity, address, and branding."
      actions={
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="h-9 px-3 rounded-xl bg-teal-600 text-white text-[12px] font-geist font-semibold hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save profile
        </button>
      }
    >
      {loading ? (
        <OrgSkeleton />
      ) : (
        <div className="space-y-3 max-w-[1100px]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 space-y-3">
              <Panel title="Profile">
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Organization name"
                    value={form.name}
                    onChange={(v) => set("name", v)}
                    placeholder="e.g. iCareManager Demo Agency"
                  />
                  <SelectField
                    label="Organization type"
                    options={ORG_TYPES}
                    value={form.type}
                    onChange={(v) => set("type", v)}
                  />
                </div>
              </Panel>

              <Panel title="Compliance">
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="NPI number"
                    value={form.npi}
                    onChange={(v) => set("npi", v)}
                    placeholder="10-digit NPI"
                  />
                  <Field
                    label="License number"
                    value={form.licenseNumber}
                    onChange={(v) => set("licenseNumber", v)}
                    placeholder="State license number"
                  />
                  <Field
                    label="Phone"
                    value={form.phone}
                    onChange={(v) => set("phone", v)}
                    placeholder="(555) 555-5555"
                  />
                  <Field
                    label="Fax"
                    value={form.fax}
                    onChange={(v) => set("fax", v)}
                    placeholder="(555) 555-5566"
                  />
                </div>
              </Panel>

              <Panel title="Address">
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Street"
                    value={form.street}
                    onChange={(v) => set("street", v)}
                    placeholder="100 Main Street"
                  />
                  <Field
                    label="City"
                    value={form.city}
                    onChange={(v) => set("city", v)}
                    placeholder="Westminster"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <Field
                    label="State"
                    value={form.state}
                    onChange={(v) => set("state", v)}
                    placeholder="MD"
                  />
                  <Field
                    label="ZIP"
                    value={form.zip}
                    onChange={(v) => set("zip", v)}
                    placeholder="21157"
                  />
                  <Field
                    label="County"
                    value={form.county}
                    onChange={(v) => set("county", v)}
                    placeholder="Carroll"
                  />
                </div>
              </Panel>

              <Panel title="Contacts">
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Primary contact name"
                    value={form.primaryContactName}
                    onChange={(v) => set("primaryContactName", v)}
                    placeholder="Full name"
                  />
                  <Field
                    label="Primary contact email"
                    value={form.primaryContactEmail}
                    onChange={(v) => set("primaryContactEmail", v)}
                    placeholder="contact@example.com"
                  />
                </div>
              </Panel>
            </div>

            <div className="space-y-3">
              {/* Logo upload zone */}
              <Panel title="Logo">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }}
                />
                <div
                  onClick={() => !logoUploading && logoInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleLogoUpload(f);
                  }}
                  className="relative rounded-xl border-2 border-dashed border-icm-border bg-icm-bg flex flex-col items-center justify-center cursor-pointer hover:border-icm-accent/50 hover:bg-icm-accent-soft/30 transition-all group overflow-hidden"
                  style={{ minHeight: 140 }}
                >
                  {logoUrl ? (
                    <>
                      <img
                        src={logoUrl}
                        alt="Organization logo"
                        className="max-h-28 max-w-full object-contain p-3"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <div className="bg-white/90 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-icm-text flex items-center gap-1.5">
                          <Upload className="w-3 h-3" /> Replace logo
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-6 text-icm-text-faint">
                      {logoUploading ? (
                        <Loader2 className="w-7 h-7 animate-spin" />
                      ) : (
                        <ImagePlus className="w-7 h-7 text-icm-text-faint group-hover:text-icm-accent transition-colors" />
                      )}
                      <p className="text-[11.5px] font-geist text-center">
                        {logoUploading ? "Uploading…" : "Drag logo or click to upload"}
                      </p>
                    </div>
                  )}
                  {logoUploading && (
                    <div className="absolute inset-0 bg-icm-panel/60 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-icm-accent" />
                    </div>
                  )}
                </div>
                {logoUrl && (
                  <button
                    onClick={async () => {
                      if (!orgId) return;
                      setLogoUrl(null);
                      await updateDoc(doc(db, "organizations", orgId), { logoUrl: null });
                      toast.success("Logo removed");
                    }}
                    className="mt-2 text-[10.5px] text-icm-red hover:underline font-geist flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" /> Remove logo
                  </button>
                )}

                {/* Logo link URL — makes the topbar logo clickable */}
                <div className="mt-3 space-y-1">
                  <label className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide">
                    Logo link URL
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint pointer-events-none" />
                    <input
                      type="url"
                      value={logoLinkUrl}
                      onChange={(e) => setLogoLinkUrl(e.target.value)}
                      placeholder="https://yourcompany.com or /dashboard"
                      className="w-full h-9 pl-8 pr-3 rounded-xl bg-icm-bg border border-icm-border text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/50 transition-colors"
                    />
                  </div>
                  <p className="text-[10.5px] text-icm-text-faint font-geist">
                    Optional. When set, clicking the logo in the topbar opens this URL.
                    Use a full URL (https://…) for external sites or a path (/dashboard) for internal pages.
                  </p>
                </div>

                <p className="text-[10.5px] text-icm-text-dim font-geist mt-2">
                  Used in the sidebar, reports, and email notifications. PNG or SVG recommended.
                </p>
              </Panel>

              <Panel title="Brand color">
                <p className="text-[11.5px] text-icm-text-dim font-geist mb-3">
                  Applied as the accent color throughout the app for all users in your organization.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.brandColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-12 h-12 rounded-xl border border-icm-border cursor-pointer p-0.5 bg-icm-bg"
                    title="Pick brand color"
                  />
                  <div className="flex-1">
                    <input
                      value={form.brandColor}
                      onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) handleColorChange(e.target.value); }}
                      className="w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-mono text-icm-text focus:outline-none focus:border-icm-accent/60"
                      placeholder="#0d9488"
                      maxLength={7}
                    />
                    <p className="text-[10px] text-icm-text-faint font-geist mt-1">Preview updates live — save to persist.</p>
                  </div>
                </div>
                {/* Live preview swatch */}
                <div className="mt-3 rounded-xl p-3 flex items-center gap-3" style={{ background: `${form.brandColor}18` }}>
                  <div className="w-8 h-8 rounded-lg" style={{ background: form.brandColor }} />
                  <div>
                    <p className="text-[12px] font-semibold font-geist" style={{ color: form.brandColor }}>Brand preview</p>
                    <p className="text-[10.5px] text-icm-text-dim font-geist">Sidebar active states, buttons, badges</p>
                  </div>
                </div>
              </Panel>

              <Panel title="States of operation">
                <StateMultiSelect
                  selected={form.states}
                  onChange={(codes) => set("states", codes)}
                />
              </Panel>
            </div>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
};

function StateMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = ALL_STATES.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (code: string) => {
    onChange(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code]
    );
  };

  const selectAll = () => onChange(filtered.map((s) => s.code));
  const clearAll = () => onChange(selected.filter((c) => !filtered.some((s) => s.code === c)));

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-left flex items-center justify-between focus:outline-none focus:border-icm-accent/60 transition-colors"
      >
        <span className={selected.length === 0 ? "text-icm-text-faint" : "text-icm-text"}>
          {selected.length === 0 ? "Select states…" : `${selected.length} state${selected.length !== 1 ? "s" : ""} selected`}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-icm-text-faint transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-icm-border bg-icm-panel shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-icm-border">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search states…"
              className="w-full h-8 px-3 rounded-lg border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/60"
            />
          </div>

          {/* Select all / Clear all */}
          <div className="px-3 py-1.5 flex items-center gap-3 border-b border-icm-border">
            <button
              type="button"
              onClick={selectAll}
              className="text-[11px] font-geist font-semibold text-icm-accent hover:underline"
            >
              Select all
            </button>
            <span className="text-icm-text-faint text-[10px]">·</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-geist font-semibold text-icm-text-dim hover:underline"
            >
              Clear all
            </button>
          </div>

          {/* State list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-[12px] font-geist text-icm-text-faint">No states found.</p>
            ) : (
              filtered.map((s) => (
                <label
                  key={s.code}
                  className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-icm-bg transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(s.code)}
                    onChange={() => toggle(s.code)}
                    className="accent-icm-accent shrink-0"
                  />
                  <span className="text-[12px] font-geist text-icm-text">{s.name}</span>
                  <span className="ml-auto text-[10.5px] font-geist text-icm-text-faint">{s.code}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((code) => {
            const st = ALL_STATES.find((s) => s.code === code);
            return (
              <span
                key={code}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-icm-accent-soft border border-icm-border text-[11px] font-geist font-medium text-icm-accent"
              >
                {st?.name ?? code}
                <button
                  type="button"
                  onClick={() => toggle(code)}
                  className="ml-0.5 text-icm-accent/60 hover:text-icm-accent transition-colors"
                  aria-label={`Remove ${st?.name ?? code}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrgSkeleton() {
  return (
    <div className="space-y-3 max-w-[1100px] animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          {[80, 100, 120, 80].map((h, i) => (
            <div key={i} className="rounded-xl border border-icm-border bg-icm-panel p-4" style={{ height: h }} />
          ))}
        </div>
        <div className="space-y-3">
          {[200, 100, 140].map((h, i) => (
            <div key={i} className="rounded-xl border border-icm-border bg-icm-panel p-4" style={{ height: h }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({
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
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
      />
    </div>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
      {children}
    </label>
  );
}

function applyColorVar(hex: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  const hsl = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  // Use --icm-accent-brand so we don't stomp on the dark/light mode --icm-accent token
  document.documentElement.style.setProperty("--icm-accent-brand", hsl);
}


export default SettingsOrganization;
