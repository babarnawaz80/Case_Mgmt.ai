import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Copy, Pencil } from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { workflowTemplates } from "@/data/workflows";

const WorkflowTemplatesAdmin = () => {
  const navigate = useNavigate();
  return (
    <ICMShell title="Workflow Templates" showAIPanel={false}>
      <div className="space-y-5">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">Workflow Templates</h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">Admin-managed templates that case managers can trigger.</p>
          </div>
          <button className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-medium hover:opacity-90 inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New template
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {workflowTemplates.map((tpl) => (
            <div key={tpl.id} className="rounded-xl border border-icm-border bg-icm-panel p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-manrope font-bold text-[14.5px] text-icm-text">{tpl.name}</h3>
                  <p className="text-[12px] text-icm-text-dim mt-1 leading-relaxed">{tpl.description}</p>
                </div>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-geist font-semibold ring-1 ${tpl.active ? "bg-icm-green-soft text-icm-green ring-icm-green/20" : "bg-icm-bg text-icm-text-dim ring-icm-border"}`}>
                  {tpl.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-geist">
                <Meta label="Steps" value={String(tpl.steps.length)} />
                <Meta label="Trigger" value={tpl.triggerEvent} />
                <Meta label="Default due" value={tpl.defaultDueDays ? `${tpl.defaultDueDays} days` : "—"} />
              </div>

              <ol className="mt-3 space-y-1.5">
                {tpl.steps.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[12px]">
                    <span className="w-5 h-5 rounded-full bg-icm-bg border border-icm-border text-[10px] font-mono font-semibold text-icm-text-dim flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                    <div className="min-w-0">
                      <p className="text-icm-text leading-snug">{s.title}</p>
                      {s.linkedModuleLabel && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-geist font-medium bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20 mt-0.5">→ {s.linkedModuleLabel}</span>}
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button className="h-8 px-2.5 rounded-lg border border-icm-border text-[11px] text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1"><Copy className="w-3 h-3" /> Duplicate</button>
                <button className="h-8 px-2.5 rounded-lg border border-icm-border text-[11px] text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>
              </div>

              <p className="mt-3 text-[10.5px] text-icm-text-faint font-geist">
                Linked compliance rule: <span className="font-mono">{tpl.linkedComplianceRule ?? "— (Engine 2 hook)"}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </ICMShell>
  );
};

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-icm-bg border border-icm-border px-2 py-1.5">
      <p className="text-[9.5px] uppercase tracking-wide text-icm-text-faint font-semibold">{label}</p>
      <p className="text-[11px] text-icm-text mt-0.5 truncate">{value}</p>
    </div>
  );
}

export default WorkflowTemplatesAdmin;
