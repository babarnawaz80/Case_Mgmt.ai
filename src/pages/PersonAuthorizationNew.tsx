import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { useIndividual } from "@/hooks/useIndividuals";
import { addServiceAuthorization } from "@/hooks/useFirestore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Save, X } from "lucide-react";

const BILLING_PERIODS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
  { value: "one_time", label: "One-time" },
] as const;

const PersonAuthorizationNew = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading: personLoading } = useIndividual(id);
  const { currentUser, userProfile } = useAuth();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    auth_number: "",
    service_name: "",
    procedure_code: "",
    payer: "",
    units_authorized: "",
    units_used: "0",
    billing_period: "monthly" as "monthly" | "quarterly" | "annual" | "one_time",
    start_date: "",
    end_date: "",
    notes: "",
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!currentUser) { toast.error("Not signed in."); return; }
    if (!id) { toast.error("Individual ID missing from URL."); return; }
    if (!form.auth_number || !form.service_name || !form.start_date || !form.end_date) {
      toast.error("Auth Number, Service Name, Start Date, and End Date are required.");
      return;
    }

    // Always prefer userProfile.organizationId — individual.organizationId may be stale/empty
    const orgId = userProfile?.organizationId || individual?.organizationId || "";
    if (!orgId) {
      toast.error("Organization ID missing — please refresh and try again.");
      return;
    }

    const indName = individual
      ? `${individual.first_name || ""} ${individual.last_name || ""}`.trim()
      : "";

    console.log("Saving authorization:", {
      individualId: id,
      organizationId: orgId,
      authNumber: form.auth_number,
      serviceName: form.service_name,
      procedureCode: form.procedure_code,
      payer: form.payer,
      billingPeriod: form.billing_period,
      unitsAuthorized: form.units_authorized,
      startDate: form.start_date,
      endDate: form.end_date,
    });

    setSaving(true);
    try {
      await addServiceAuthorization({
        individualId: id,
        individual_id: id,
        individualName: indName,
        organizationId: orgId,
        assigned_case_manager_id: currentUser.uid,
        assigned_case_manager_name: userProfile
          ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim()
          : "",
        auth_number: form.auth_number.trim(),
        service_name: form.service_name.trim(),
        procedure_code: form.procedure_code.trim(),
        payer: form.payer.trim(),
        units_authorized: Number(form.units_authorized) || 0,
        units_used: Number(form.units_used) || 0,
        billing_period: form.billing_period,
        start_date: form.start_date,
        end_date: form.end_date,
        status: "active",
        notes: form.notes.trim(),
      });

      toast.success("Authorization saved.");
      navigate(`/people/${id}/authorizations`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Authorization save error:", err);
      toast.error("Failed to save authorization: " + msg);
    } finally {
      setSaving(false);
    }
  };

  if (personLoading) {
    return (
      <ICMShell title="New Authorization" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </ICMShell>
    );
  }

  const personName = individual
    ? `${individual.first_name} ${individual.last_name}`
    : "Individual";

  return (
    <ICMShell title="New Authorization" showAIPanel={false}>
      <div className="space-y-4 max-w-2xl">
        <Breadcrumbs
          backTo={`/people/${id}/authorizations`}
          backLabel="Authorizations"
          items={[
            { label: "People Supported", to: "/people" },
            { label: personName, to: `/people/${id}/echart` },
            { label: "Authorizations", to: `/people/${id}/authorizations` },
            { label: "New" },
          ]}
        />

        <div className="rounded-2xl border border-icm-border bg-icm-panel p-6 space-y-5">
          <div>
            <h1 className="font-manrope font-extrabold text-[20px] text-icm-text tracking-tight">
              New Service Authorization
            </h1>
            <p className="text-[12.5px] font-geist text-icm-text-dim mt-0.5">
              For {personName}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Auth Number *" required>
              <input
                id="auth-number"
                value={form.auth_number}
                onChange={(e) => set("auth_number", e.target.value)}
                placeholder="e.g. SA-2026-001"
                className="modal-input w-full"
              />
            </FormField>

            <FormField label="Payer">
              <input
                id="payer"
                value={form.payer}
                onChange={(e) => set("payer", e.target.value)}
                placeholder="e.g. IHCP, Anthem Indiana"
                className="modal-input w-full"
              />
            </FormField>

            <FormField label="Service Name *" required className="sm:col-span-2">
              <input
                id="service-name"
                value={form.service_name}
                onChange={(e) => set("service_name", e.target.value)}
                placeholder="e.g. Community Integration Habilitation"
                className="modal-input w-full"
              />
            </FormField>

            <FormField label="Procedure Code">
              <input
                id="procedure-code"
                value={form.procedure_code}
                onChange={(e) => set("procedure_code", e.target.value)}
                placeholder="e.g. T2022"
                className="modal-input w-full"
              />
            </FormField>

            <FormField label="Billing Period">
              <select
                id="billing-period"
                value={form.billing_period}
                onChange={(e) => set("billing_period", e.target.value)}
                className="modal-input w-full"
              >
                {BILLING_PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Units Authorized">
              <input
                id="units-authorized"
                type="number"
                min={0}
                value={form.units_authorized}
                onChange={(e) => set("units_authorized", e.target.value)}
                placeholder="0"
                className="modal-input w-full"
              />
            </FormField>

            <FormField label="Units Used to Date">
              <input
                id="units-used"
                type="number"
                min={0}
                value={form.units_used}
                onChange={(e) => set("units_used", e.target.value)}
                placeholder="0"
                className="modal-input w-full"
              />
            </FormField>

            <FormField label="Start Date *" required>
              <input
                id="start-date"
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                className="modal-input w-full"
              />
            </FormField>

            <FormField label="End Date *" required>
              <input
                id="end-date"
                type="date"
                value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)}
                className="modal-input w-full"
              />
            </FormField>

            <FormField label="Notes" className="sm:col-span-2">
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Additional notes about this authorization..."
                className="modal-input w-full resize-none"
              />
            </FormField>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-icm-border">
            <button
              id="save-authorization"
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-4 rounded-xl text-[12.5px] font-geist font-semibold flex items-center gap-1.5 bg-icm-accent text-white hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving…" : "Save Authorization"}
            </button>
            <button
              onClick={() => navigate(`/people/${id}/authorizations`)}
              className="h-9 px-4 rounded-xl text-[12.5px] font-geist font-semibold flex items-center gap-1.5 border border-icm-border text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong transition"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      </div>
    </ICMShell>
  );
};

function FormField({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-[11.5px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide">
        {label}
        {required && <span className="text-icm-red ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default PersonAuthorizationNew;
