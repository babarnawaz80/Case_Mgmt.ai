import React, { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { writeAudit } from "@/lib/auditService";
import { Save, Loader2 } from "lucide-react";

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
  npi: string;
  licenseNumber: string;
  brandColor: string;
  states: string[];
}

const ORG_TYPES = ["IDD Provider", "Case Management Agency", "MCO", "State Agency", "Other"];
const ALL_STATES = [
  { code: "MD", name: "Maryland" },
  { code: "VA", name: "Virginia" },
  { code: "TX", name: "Texas" },
  { code: "PA", name: "Pennsylvania" },
  { code: "IN", name: "Indiana" },
  { code: "NJ", name: "New Jersey" },
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
            npi: d.npi ?? "",
            licenseNumber: d.licenseNumber ?? "",
            brandColor: d.brandColor ?? "#2563eb",
            states: d.states ?? [],
          });
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

  const toggleState = (code: string) => {
    setForm((prev) => ({
      ...prev,
      states: prev.states.includes(code)
        ? prev.states.filter((s) => s !== code)
        : [...prev.states, code],
    }));
  };

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name,
        address: {
          street: form.street,
          city: form.city,
          state: form.state,
          zip: form.zip,
          county: form.county,
        },
        phone: form.phone,
        states_of_operation: form.states,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, "organizations", orgId), payload);
      await writeAudit("update_organization", "organization", orgId, {
        name: form.name,
      });
      toast.success("Organization profile saved", {
        description: "Changes propagated to all users.",
      });
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
              <Panel title="Logo">
                <div className="aspect-square rounded-xl border-2 border-dashed border-icm-border bg-icm-bg flex items-center justify-center text-icm-text-faint text-[11.5px] font-geist">
                  Drag logo or click to upload
                </div>
                <p className="text-[10.5px] text-icm-text-dim font-geist mt-2">
                  Used in printed documents, reports, email notifications, and login page.
                </p>
              </Panel>

              <Panel title="Brand color">
                <p className="text-[11.5px] text-icm-text-dim font-geist mb-2">
                  Used as accent in printed reports and exported documents.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.brandColor}
                    onChange={(e) => set("brandColor", e.target.value)}
                    className="w-10 h-10 rounded-lg border border-icm-border cursor-pointer"
                  />
                  <input
                    value={form.brandColor}
                    onChange={(e) => set("brandColor", e.target.value)}
                    className="flex-1 h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-mono text-icm-text"
                  />
                </div>
              </Panel>

              <Panel title="States of operation">
                <div className="space-y-2">
                  {ALL_STATES.map((s) => (
                    <label
                      key={s.code}
                      className="flex items-center gap-2 text-[12px] font-geist text-icm-text cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.states.includes(s.code)}
                        onChange={() => toggleState(s.code)}
                        className="accent-icm-accent"
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
};

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

export default SettingsOrganization;
