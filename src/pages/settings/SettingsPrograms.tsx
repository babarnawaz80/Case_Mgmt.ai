import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { programs, operatingStates } from "@/data/settings";
import { cn } from "@/lib/utils";
import { Plus, Pencil } from "lucide-react";
import { demoToast } from "@/lib/demoToast";

const SettingsPrograms = () => {
  return (
    <SettingsLayout
      title="Programs & States"
      subtitle="Configure programs, service categories, and state-specific requirements"
      actions={
        <button
          onClick={() => demoToast("New program wizard")}
          className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add program
        </button>
      }
    >
      <div className="space-y-3">
        <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
          Programs
        </p>
        <div className="space-y-2">
          {programs.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-manrope font-bold text-[14px] text-icm-text">{p.name}</h3>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-bg text-icm-text-dim ring-1 ring-icm-border">
                    {p.state}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20">
                    {p.type}
                  </span>
                  {p.active && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] font-geist text-icm-text-dim mt-1">
                  {p.fundingSource} · {p.billingUnit} · {p.individuals} individuals
                </p>
              </div>
              <button
                onClick={() => demoToast(`Edit ${p.name}`)}
                className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-icm-text text-[11.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:border-icm-border-strong"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          ))}
        </div>

        <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mt-6">
          States
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {operatingStates.map((s) => (
            <div
              key={s.code}
              className="rounded-xl border border-icm-border bg-icm-panel p-3 flex items-center justify-between"
            >
              <div>
                <p className="font-manrope font-bold text-[13px] text-icm-text">{s.name}</p>
                <p className="text-[11px] font-geist text-icm-text-dim mt-0.5">
                  Configured · State terminology customized
                </p>
              </div>
              <button
                onClick={() => demoToast(`Configure ${s.name}`)}
                className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-icm-text text-[11.5px] font-geist font-semibold hover:border-icm-border-strong"
              >
                Configure
              </button>
            </div>
          ))}
        </div>
      </div>
    </SettingsLayout>
  );
};

export default SettingsPrograms;
