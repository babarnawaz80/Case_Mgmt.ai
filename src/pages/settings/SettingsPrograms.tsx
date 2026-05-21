import { useState } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { programs as seedPrograms, operatingStates, type ProgramDef } from "@/data/settings";
import { Plus, Pencil, Building2, Map as MapIcon, X, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface ProgramDraft {
  id?: string;
  name: string;
  state: string;
  type: string;
  fundingSource: string;
  billingUnit: string;
  individuals: number;
  active: boolean;
}

const emptyDraft: ProgramDraft = {
  name: "",
  state: "Maryland",
  type: "IDD Waiver",
  fundingSource: "Medicaid",
  billingUnit: "15 minutes",
  individuals: 0,
  active: true,
};

const stateTerminology: Record<string, { individual: string; planAcronym: string; agency: string }> = {
  MD: {
    individual: "Person Supported",
    planAcronym: "PCP (Person-Centered Plan)",
    agency: "Maryland DDA",
  },
  VA: {
    individual: "Individual",
    planAcronym: "ISP (Individual Support Plan)",
    agency: "Virginia DBHDS",
  },
};

const SettingsPrograms = () => {
  const [programs, setPrograms] = useState<ProgramDef[]>(seedPrograms);
  const [draft, setDraft] = useState<ProgramDraft | null>(null);
  const [stateConfig, setStateConfig] = useState<{ code: string; name: string } | null>(null);

  const openAdd = () => setDraft({ ...emptyDraft });
  const openEdit = (p: ProgramDef) => setDraft({ ...p });

  const savePrograms = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Program name is required");
      return;
    }
    if (draft.id) {
      setPrograms((prev) => prev.map((p) => (p.id === draft.id ? { ...p, ...draft } as ProgramDef : p)));
      toast.success("Program updated", { description: `${draft.name} saved.` });
    } else {
      const id = `prg-${String(programs.length + 1).padStart(3, "0")}`;
      setPrograms((prev) => [...prev, { ...draft, id } as ProgramDef]);
      toast.success("Program created", { description: `${draft.name} added.` });
    }
    setDraft(null);
  };

  return (
    <SettingsLayout
      title="Programs & States"
      subtitle="Configure programs, service categories, and state-specific requirements"
      actions={
        <button
          onClick={openAdd}
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
              <div className="w-10 h-10 rounded-lg bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20 flex items-center justify-center">
                <Building2 className="w-4.5 h-4.5" />
              </div>
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
                onClick={() => openEdit(p)}
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
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20 flex items-center justify-center">
                  <MapIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-manrope font-bold text-[13px] text-icm-text">{s.name}</p>
                  <p className="text-[11px] font-geist text-icm-text-dim mt-0.5">
                    Configured · State terminology customized
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStateConfig(s)}
                className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-icm-text text-[11.5px] font-geist font-semibold hover:border-icm-border-strong"
              >
                Configure
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Program */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit program" : "Add program"}</DialogTitle>
            <DialogDescription>
              {draft?.id
                ? "Update program details. Changes apply to new records."
                : "Create a new program. You can assign users and individuals after creation."}
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label className="text-[11.5px]">Program name</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Howard County CCS"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11.5px]">State</Label>
                  <Select value={draft.state} onValueChange={(v) => setDraft({ ...draft, state: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Maryland">Maryland</SelectItem>
                      <SelectItem value="Virginia">Virginia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11.5px]">Waiver type</Label>
                  <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IDD Waiver">IDD Waiver</SelectItem>
                      <SelectItem value="DD Waiver">DD Waiver</SelectItem>
                      <SelectItem value="Community Pathways">Community Pathways</SelectItem>
                      <SelectItem value="Family Supports">Family Supports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11.5px]">Funding source</Label>
                  <Select value={draft.fundingSource} onValueChange={(v) => setDraft({ ...draft, fundingSource: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Medicaid">Medicaid</SelectItem>
                      <SelectItem value="State General Funds">State General Funds</SelectItem>
                      <SelectItem value="Private Pay">Private Pay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11.5px]">Billing unit</Label>
                  <Select value={draft.billingUnit} onValueChange={(v) => setDraft({ ...draft, billingUnit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15 minutes">15 minutes</SelectItem>
                      <SelectItem value="Per day">Per day</SelectItem>
                      <SelectItem value="Per visit">Per visit</SelectItem>
                      <SelectItem value="Per month">Per month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-icm-border p-2.5">
                <div>
                  <p className="text-[12px] font-geist font-semibold text-icm-text">Active</p>
                  <p className="text-[10.5px] text-icm-text-dim">Allow new enrollments and billing.</p>
                </div>
                <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => setDraft(null)}
              className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold inline-flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={savePrograms}
              className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> {draft?.id ? "Save changes" : "Create program"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure State */}
      <Dialog open={!!stateConfig} onOpenChange={(o) => !o && setStateConfig(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Configure {stateConfig?.name}</DialogTitle>
            <DialogDescription>
              State-specific terminology, plan format, and reporting agency.
            </DialogDescription>
          </DialogHeader>
          {stateConfig && (
            <div className="space-y-3 py-1">
              {(() => {
                const cfg = stateTerminology[stateConfig.code] ?? stateTerminology.MD;
                return (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-[11.5px]">Person terminology</Label>
                      <Input defaultValue={cfg.individual} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11.5px]">Plan format</Label>
                      <Input defaultValue={cfg.planAcronym} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11.5px]">Reporting agency</Label>
                      <Input defaultValue={cfg.agency} />
                    </div>
                    <div className="rounded-lg bg-icm-bg p-2.5 text-[11px] text-icm-text-dim">
                      These overrides cascade through forms, plans, and reports for {stateConfig.name}.
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => setStateConfig(null)}
              className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.success(`${stateConfig?.name} configuration saved`);
                setStateConfig(null);
              }}
              className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold"
            >
              Save configuration
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
};

export default SettingsPrograms;
