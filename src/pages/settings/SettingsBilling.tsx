import { CreditCard, Building2, FileCheck, AlertCircle } from "lucide-react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";

/**
 * SettingsBilling — Billing configuration & payer setup.
 * Admins configure payers, funding streams, and billing account settings here.
 */
export default function SettingsBilling() {
  return (
    <SettingsLayout
      title="Billing Configuration"
      subtitle="Configure payers, funding streams, rate schedules, and billing account settings."
    >
      <div className="space-y-6">
        {/* Info banner */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[12.5px] font-geist font-semibold text-amber-800">Billing Configuration</p>
            <p className="text-[12px] text-amber-700 font-geist mt-0.5">
              Changes to billing settings affect how claims are generated and submitted. Coordinate with your billing team before making changes.
            </p>
          </div>
        </div>

        {/* Config cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              icon: CreditCard,
              title: "Payers & Funding Streams",
              desc: "Add Medicaid, waiver programs, and private payer configurations.",
              action: "Configure",
            },
            {
              icon: Building2,
              title: "Billing Account",
              desc: "NPI numbers, taxonomy codes, and clearing house connections.",
              action: "Manage",
            },
            {
              icon: FileCheck,
              title: "Rate Schedules",
              desc: "Service codes (H-codes, T-codes) with unit types and reimbursement rates.",
              action: "Edit Rates",
            },
            {
              icon: AlertCircle,
              title: "Validation Rules",
              desc: "Customize pre-submission scrubbing rules and override policies.",
              action: "Configure",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-icm-border bg-icm-panel p-5 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-icm-accent-soft border border-icm-accent/20 flex items-center justify-center shrink-0">
                <card.icon className="w-4.5 h-4.5 text-icm-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-manrope font-bold text-[13.5px] text-icm-text">{card.title}</h3>
                <p className="text-[12px] text-icm-text-dim font-geist mt-0.5 leading-snug">{card.desc}</p>
                <button className="mt-3 text-[12px] font-geist font-semibold text-icm-accent hover:underline">
                  {card.action} →
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[12px] text-icm-text-faint font-geist">
          Full billing configuration UI coming in the next platform update.
          Contact support for manual setup assistance.
        </p>
      </div>
    </SettingsLayout>
  );
}
