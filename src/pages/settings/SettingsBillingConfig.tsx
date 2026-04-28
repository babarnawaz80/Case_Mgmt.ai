import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { demoToast } from "@/lib/demoToast";

const SettingsBillingConfig = () => {
  return (
    <SettingsLayout
      title="Billing Configuration"
      subtitle="Configure billing rules, supervisor approval, service codes, and clearinghouse settings"
    >
      {/* Supervisor approval */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-manrope font-bold text-[14px] text-icm-text">Supervisor approval</p>
            <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">
              Require supervisor approval before billing submission.
            </p>
          </div>
          <Toggle />
        </div>
      </div>

      {/* Billing rules */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
        <p className="font-manrope font-bold text-[14px] text-icm-text">Billing rules</p>
        <div className="grid grid-cols-3 gap-3">
          <SelectField
            label="Default billing unit"
            options={["15 minutes", "30 minutes", "1 hour"]}
            defaultValue="15 minutes"
          />
          <SelectField
            label="Rounding rule"
            options={["Round up", "Round down", "Round nearest"]}
            defaultValue="Round nearest"
          />
          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              Auto-calc units from time
            </label>
            <div className="mt-2">
              <Toggle defaultOn />
            </div>
          </div>
        </div>
      </div>

      {/* Service codes */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-manrope font-bold text-[14px] text-icm-text">Service codes</p>
          <button
            onClick={() => demoToast("Add service code")}
            className="h-8 px-2.5 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add code
          </button>
        </div>
        <div className="rounded-xl border border-icm-border overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Code</th>
                <th className="text-left px-3 py-2 font-semibold">Description</th>
                <th className="text-left px-3 py-2 font-semibold">Rate</th>
                <th className="text-left px-3 py-2 font-semibold">Unit</th>
                <th className="text-left px-3 py-2 font-semibold">Program</th>
                <th className="text-left px-3 py-2 font-semibold">Active</th>
              </tr>
            </thead>
            <tbody>
              {[
                { code: "T2022", desc: "Case management", rate: "$28.50", unit: "15 min", prog: "Carroll County CCS" },
                { code: "T2023", desc: "Targeted case management", rate: "$30.00", unit: "15 min", prog: "Carroll County CCS" },
                { code: "T1019", desc: "Personal care services", rate: "$5.25", unit: "15 min", prog: "Dallas County CCS" },
              ].map((r) => (
                <tr key={r.code} className="border-t border-icm-border">
                  <td className="px-3 py-2 text-icm-text font-mono font-semibold">{r.code}</td>
                  <td className="px-3 py-2 text-icm-text">{r.desc}</td>
                  <td className="px-3 py-2 text-icm-text-dim font-mono">{r.rate}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{r.unit}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{r.prog}</td>
                  <td className="px-3 py-2">
                    <Toggle defaultOn />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clearinghouse */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
        <p className="font-manrope font-bold text-[14px] text-icm-text">Clearinghouse</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              Connected clearinghouse
            </label>
            <p className="mt-1 text-[12px] font-geist text-icm-text">
              IDD Billing.AI{" "}
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20 ml-1">
                Connected
              </span>
            </p>
          </div>
          <SelectField
            label="Submission frequency"
            options={["Real-time", "Daily", "Weekly", "Manual"]}
            defaultValue="Daily"
          />
        </div>
      </div>
    </SettingsLayout>
  );
};

function SelectField({
  label,
  options,
  defaultValue,
}: {
  label: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
        {label}
      </label>
      <select
        defaultValue={defaultValue}
        className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ defaultOn }: { defaultOn?: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-block w-9 h-5 rounded-full",
        defaultOn ? "bg-icm-accent" : "bg-icm-border"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
          defaultOn && "translate-x-4"
        )}
      />
    </span>
  );
}

export default SettingsBillingConfig;
