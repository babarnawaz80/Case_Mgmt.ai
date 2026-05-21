import { Pencil, Plus, Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileData } from "@/data/profiles";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-manrope font-bold text-[13.5px] text-icm-text tracking-tight">{title}</h3>
        <button className="text-[11px] font-geist text-icm-accent hover:underline flex items-center gap-1">
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>
      {children}
      <style>{`.mb-input { width:100%; padding:8px; border-radius:8px; border:1px solid hsl(var(--icm-border)); background:white; font-size:12px; color:hsl(var(--icm-text)); font-family: inherit; }`}</style>
    </section>
  );
}

function DataTable({
  columns,
  rows,
  emptyText,
  addLabel,
}: {
  columns: string[];
  rows: React.ReactNode[][];
  emptyText: string;
  addLabel?: string;
}) {
  return (
    <div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-icm-border bg-icm-bg p-4 text-center">
          <p className="text-[12px] text-icm-text-dim font-geist">{emptyText}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-icm-border overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c}
                    className={cn(
                      "text-left px-3 py-2 font-semibold text-icm-text-dim text-[10.5px] uppercase tracking-wider",
                    )}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-icm-border">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-icm-bg/50">
                  {r.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-icm-text">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {addLabel && (
        <button className="mt-2 h-8 px-3 rounded-lg border border-dashed border-icm-border text-[11.5px] text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> {addLabel}
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] text-icm-text-dim font-geist">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function MonitorsBaselines({ profile }: { profile: ProfileData }) {
  return (
    <div className="space-y-4">
      <Section title="Vital Sign Baselines">
        <DataTable
          columns={["Measurement", "Baseline", "Normal Range", "Last Measured", "Notes"]}
          rows={profile.vitalBaselines.map((v) => [
            <span key="m" className="font-semibold">{v.measurement}</span>,
            v.baseline,
            <span key="r" className="text-[11px] text-icm-text-dim">{v.normalRange}</span>,
            v.lastMeasured ?? "—",
            v.notes ?? "—",
          ])}
          emptyText="No baselines recorded."
          addLabel="Add measurement"
        />
      </Section>

      <Section title="Monitoring Instructions">
        <div className="space-y-3">
          <Field label="Health monitoring notes">
            <textarea
              defaultValue={profile.healthMonitoringNotes}
              placeholder="Special monitoring requirements, medical equipment, positioning needs, etc."
              className="mb-input min-h-[72px]"
            />
          </Field>
          <Field label="Behavioral monitoring notes">
            <textarea
              defaultValue={profile.behavioralMonitoringNotes}
              placeholder="Behavioral baselines, triggers, de-escalation strategies, etc."
              className="mb-input min-h-[72px]"
            />
          </Field>
          <div className="rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-2.5 text-[11.5px] font-geist text-icm-text flex items-start gap-2">
            <Sparkle className="w-3.5 h-3.5 text-icm-accent mt-0.5" />
            <span>
              AI will surface monitoring content detected in ambient sessions or contact notes here as suggestions.
            </span>
          </div>
        </div>
      </Section>

      <Section title="Measurement History">
        <div className="rounded-lg border border-icm-border bg-icm-bg p-6 text-center">
          <p className="text-[12px] text-icm-text-dim font-geist">
            No measurement history yet. Recorded vitals will appear here as a chronological log with trend lines.
          </p>
        </div>
      </Section>
    </div>
  );
}
