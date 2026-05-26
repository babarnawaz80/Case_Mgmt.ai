import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ShieldAlert, CheckCircle2, ChevronLeft, ChevronRight, FileText, History, Search, User2 } from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { toast } from "sonner";
import type { ValidationError } from "@/pages/PersonVisitDocument";
import { AuthorCell } from "@/components/icm/AuthorCell";

interface ExceptionRecord {
  id: string;
  docId: string;
  personId: string;
  personName: string;
  createdAt: string;
  createdBy: string;
  errors: ValidationError[];
  status: "Open" | "Returned to author" | "Override approved" | "Resolved";
  serviceCode: string;
  units: number;
  override?: { by: string; at: string; reason: string; codes: string[] };
  resolutionHistory?: { ts: string; action: string; by: string; detail?: string }[];
}

const KEY = "icm.exceptions";
const loadAll = (): ExceptionRecord[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const saveAll = (list: ExceptionRecord[]) => localStorage.setItem(KEY, JSON.stringify(list));
const writeAudit = (entry: any) => {
  try { const a = JSON.parse(localStorage.getItem("icm.audit") || "[]"); a.push(entry); localStorage.setItem("icm.audit", JSON.stringify(a)); } catch {}
};

const ExceptionsQueue = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ExceptionRecord[]>([]);
  const [filter, setFilter] = useState<"All" | "Open" | "Returned to author" | "Override approved" | "Resolved">("Open");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideCodes, setOverrideCodes] = useState<string[]>([]);

  useEffect(() => { setItems(loadAll()); }, []);

  // Seed demo exception if empty
  useEffect(() => {
    if (loadAll().length === 0) {
      const demo: ExceptionRecord = {
        id: "exc-demo-1", docId: "vd-demo", personId: "p1", personName: "Doe, Jane",
        createdAt: new Date(Date.now() - 3600_000).toISOString(), createdBy: "Maria Chen",
        serviceCode: "T1017", units: 6,
        errors: [
          { code: "V005", rule: "Units exceed authorization", message: "Billable units (6) exceed remaining authorization (4).", severity: "block", overridable: true },
          { code: "V008", rule: "Billing documentation rules", message: "Narrative must reference goals, progress, or services delivered.", severity: "block", overridable: true },
        ],
        status: "Open", resolutionHistory: [{ ts: new Date().toISOString(), action: "Exception opened automatically", by: "System" }],
      };
      saveAll([demo]);
      setItems([demo]);
    }
  }, []);

  const filtered = useMemo(() => items.filter(i =>
    (filter === "All" || i.status === filter) &&
    (!q || i.personName.toLowerCase().includes(q.toLowerCase()) || i.docId.includes(q) || i.errors.some(e => e.code.toLowerCase().includes(q.toLowerCase())))
  ), [items, filter, q]);

  const selected = items.find(i => i.id === selectedId) || null;

  const returnToAuthor = (rec: ExceptionRecord) => {
    const next = items.map(i => i.id === rec.id ? { ...i, status: "Returned to author" as const, resolutionHistory: [...(i.resolutionHistory||[]), { ts: new Date().toISOString(), action: "Returned to author for correction", by: "James O'Connor (Supervisor)" }] } : i);
    setItems(next); saveAll(next);
    writeAudit({ ts: new Date().toISOString(), action: "Exception returned to author", entity: rec.docId, personId: rec.personId, by: "James O'Connor", detail: `Codes: ${rec.errors.map(e=>e.code).join(", ")}` });
    toast.success("Returned to author for correction.");
  };

  const openOverride = (rec: ExceptionRecord) => {
    setSelectedId(rec.id);
    setOverrideCodes(rec.errors.filter(e => e.overridable).map(e => e.code));
    setOverrideReason("");
    setOverrideOpen(true);
  };

  const submitOverride = () => {
    if (!selected) return;
    if (overrideReason.trim().length < 25) { toast.error("Override justification must be at least 25 characters."); return; }
    if (!overrideCodes.length) { toast.error("Select at least one finding to override."); return; }
    const ts = new Date().toISOString();
    const override = { by: "James O'Connor (Supervisor)", at: ts, reason: overrideReason.trim(), codes: overrideCodes };
    const next = items.map(i => i.id === selected.id ? { ...i, status: "Override approved" as const, override, resolutionHistory: [...(i.resolutionHistory||[]), { ts, action: "Supervisor override approved", by: override.by, detail: `Codes: ${overrideCodes.join(", ")} — ${overrideReason.trim().slice(0,80)}` }] } : i);
    setItems(next); saveAll(next);
    writeAudit({ ts, action: "Supervisor OVERRIDE applied", entity: selected.docId, personId: selected.personId, by: override.by, detail: `${overrideCodes.join(", ")} — ${overrideReason.trim()}` });
    toast.success("Override applied. Note routed to billing.");
    setOverrideOpen(false);
  };

  const markResolved = (rec: ExceptionRecord) => {
    const next = items.map(i => i.id === rec.id ? { ...i, status: "Resolved" as const, resolutionHistory: [...(i.resolutionHistory||[]), { ts: new Date().toISOString(), action: "Marked resolved", by: "James O'Connor (Supervisor)" }] } : i);
    setItems(next); saveAll(next);
    writeAudit({ ts: new Date().toISOString(), action: "Exception resolved", entity: rec.docId, personId: rec.personId, by: "James O'Connor" });
    toast.success("Exception resolved.");
  };

  const counts = useMemo(() => ({
    Open: items.filter(i => i.status === "Open").length,
    "Returned to author": items.filter(i => i.status === "Returned to author").length,
    "Override approved": items.filter(i => i.status === "Override approved").length,
    Resolved: items.filter(i => i.status === "Resolved").length,
  }), [items]);

  return (
    <ICMShell title="Exception Queue" showAIPanel={false}>
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">Exception Queue</h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">Validation failures awaiting correction or supervisor override.</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["Open","Returned to author","Override approved","Resolved"] as const).map(s => (
              <button key={s} onClick={()=>setFilter(s)} className={`px-3 h-12 rounded-xl border text-left ${filter===s ? "border-blue-400 bg-blue-50" : "border-icm-border bg-icm-panel"}`}>
                <div className="text-[18px] font-extrabold tabular-nums text-icm-text leading-none">{counts[s]}</div>
                <div className="text-[10.5px] text-icm-text-dim mt-0.5">{s}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-icm-border bg-white flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-icm-text-dim" />
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by person, doc ID, or error code" className="bg-transparent text-[13px] outline-none flex-1" />
          </div>
          <button onClick={()=>setFilter("All")} className={`h-9 px-3 rounded-md border text-[12px] ${filter==="All" ? "border-blue-400 bg-blue-50" : "border-icm-border bg-white"}`}>All</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* List */}
          <div className="lg:col-span-2 rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
            {filtered.length === 0 ? (
              <p className="p-6 text-[13px] text-icm-text-dim text-center">No exceptions in this view.</p>
            ) : (
              <ul className="divide-y divide-icm-border">
                {filtered.map(rec => (
                  <li key={rec.id}>
                    <button onClick={()=>setSelectedId(rec.id)} className={`w-full text-left p-3 hover:bg-icm-bg ${selectedId===rec.id ? "bg-blue-50/50" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span className="font-semibold text-[13px] text-icm-text">{rec.personName}</span>
                        <span className={`ml-auto px-1.5 h-5 inline-flex items-center rounded text-[10.5px] ${rec.status==="Open"?"bg-rose-100 text-rose-700":rec.status==="Override approved"?"bg-amber-100 text-amber-800":rec.status==="Resolved"?"bg-emerald-100 text-emerald-700":"bg-blue-100 text-blue-700"}`}>{rec.status}</span>
                      </div>
                      <div className="text-[11.5px] text-icm-text-dim font-mono">{rec.docId} · {rec.serviceCode} · {rec.units}u</div>
                      <div className="text-[11px] text-icm-text-dim mt-1">{rec.errors.length} finding{rec.errors.length>1?"s":""} · {new Date(rec.createdAt).toLocaleString()}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Detail */}
          <div className="lg:col-span-3 rounded-xl border border-icm-border bg-icm-panel p-4">
            {!selected ? (
              <p className="text-[13px] text-icm-text-dim text-center py-12">Select an exception to view details and take action.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-[11.5px] text-icm-text-dim font-mono"><User2 className="w-3.5 h-3.5" /> {selected.personName} · {selected.docId}</div>
                    <h3 className="font-manrope font-extrabold text-[18px] text-icm-text">{selected.serviceCode} — {selected.units} billable units</h3>
                    <div className="text-[11.5px] text-icm-text-dim flex items-center gap-1.5 mt-0.5">Filed by <AuthorCell name={selected.createdBy} size="sm" showName={true} /> · {new Date(selected.createdAt).toLocaleString()}</div>
                  </div>
                  <span className={`px-2 h-6 inline-flex items-center rounded text-[11px] ${selected.status==="Open"?"bg-rose-100 text-rose-700":selected.status==="Override approved"?"bg-amber-100 text-amber-800":selected.status==="Resolved"?"bg-emerald-100 text-emerald-700":"bg-blue-100 text-blue-700"}`}>{selected.status}</span>
                </div>

                <div className="rounded-md border border-rose-200 bg-rose-50 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-800 font-semibold text-[12.5px]"><AlertTriangle className="w-3.5 h-3.5" /> Findings</div>
                  {selected.errors.map(e => (
                    <div key={e.code} className="text-[12px] flex gap-2 items-start">
                      <span className={`px-1.5 h-5 inline-flex items-center rounded text-[10.5px] font-mono ${e.severity==="block" ? "bg-rose-200 text-rose-800" : "bg-amber-200 text-amber-800"}`}>{e.code}</span>
                      <span><span className="font-semibold text-icm-text">{e.rule}.</span> <span className="text-icm-text-dim">{e.message}</span>{!e.overridable && <span className="ml-1 text-[10.5px] text-rose-700 font-semibold">NOT overridable</span>}</span>
                    </div>
                  ))}
                </div>

                {selected.override && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
                    <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-[12.5px] mb-1"><ShieldAlert className="w-3.5 h-3.5" /> Supervisor override on record</div>
                    <div className="text-[12px] text-icm-text"><strong>{selected.override.by}</strong> · {new Date(selected.override.at).toLocaleString()}</div>
                    <div className="text-[11.5px] text-icm-text-dim font-mono">Codes overridden: {selected.override.codes.join(", ")}</div>
                    <p className="text-[12px] text-icm-text mt-1 italic">"{selected.override.reason}"</p>
                  </div>
                )}

                <div className="rounded-md border border-icm-border p-3">
                  <div className="flex items-center gap-1.5 text-icm-text font-semibold text-[12.5px] mb-1.5"><History className="w-3.5 h-3.5" /> Audit trail</div>
                  <ol className="space-y-1 text-[11.5px]">
                    {(selected.resolutionHistory||[]).map((h, i) => (
                      <li key={i} className="flex gap-2"><span className="text-icm-text-dim font-mono">{new Date(h.ts).toLocaleTimeString()}</span><span><strong className="text-icm-text">{h.action}</strong> — {h.by}{h.detail && <span className="text-icm-text-dim"> · {h.detail}</span>}</span></li>
                    ))}
                  </ol>
                </div>

                {selected.status !== "Resolved" && (
                  <div className="flex gap-2 justify-end flex-wrap pt-2 border-t border-icm-border">
                    <button onClick={()=>returnToAuthor(selected)} className="h-10 px-3 rounded-xl border border-icm-border text-[12.5px] inline-flex items-center gap-1.5 bg-white"><ChevronLeft className="w-3.5 h-3.5" /> Return to author</button>
                    {selected.errors.some(e => e.overridable) && selected.status !== "Override approved" && (
                      <button onClick={()=>openOverride(selected)} className="h-10 px-3 rounded-xl bg-amber-600 text-white text-[12.5px] font-medium inline-flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Supervisor override</button>
                    )}
                    <button onClick={()=>markResolved(selected)} className="h-10 px-3 rounded-xl bg-icm-text text-icm-panel text-[12.5px] font-medium inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Mark resolved <ChevronRight className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Override modal */}
      {overrideOpen && selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={()=>setOverrideOpen(false)}>
          <div className="bg-icm-panel rounded-2xl border border-icm-border max-w-lg w-full p-5 space-y-3" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-600" /><h3 className="font-manrope font-extrabold text-[16px]">Supervisor override</h3></div>
            <p className="text-[12.5px] text-icm-text-dim">Overrides bypass billing validation. A written justification is required and will be permanently logged in the audit trail with your name and timestamp.</p>
            <div>
              <div className="text-[11.5px] font-semibold text-icm-text mb-1">Findings to override</div>
              <div className="space-y-1 max-h-40 overflow-auto border border-icm-border rounded-md p-2">
                {selected.errors.filter(e=>e.overridable).map(e => (
                  <label key={e.code} className="flex items-start gap-2 text-[12px]">
                    <input type="checkbox" className="mt-0.5" checked={overrideCodes.includes(e.code)} onChange={()=>setOverrideCodes(c => c.includes(e.code) ? c.filter(x=>x!==e.code) : [...c, e.code])} />
                    <span><span className="font-mono">{e.code}</span> — {e.rule}: <span className="text-icm-text-dim">{e.message}</span></span>
                  </label>
                ))}
              </div>
              {selected.errors.some(e=>!e.overridable) && <p className="text-[11px] text-rose-700 mt-1">Non-overridable findings must be corrected by the author.</p>}
            </div>
            <div>
              <div className="text-[11.5px] font-semibold text-icm-text mb-1">Written justification (required, min 25 chars)</div>
              <textarea value={overrideReason} onChange={e=>setOverrideReason(e.target.value)} rows={4} placeholder="Explain why this override is appropriate, including any supporting documentation or program authorization." className="w-full rounded-md border border-icm-border bg-white px-2 py-1.5 text-[13px]" />
              <div className="text-[10.5px] text-icm-text-dim mt-1">{overrideReason.trim().length} / 25 minimum</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={()=>setOverrideOpen(false)} className="h-9 px-3 rounded-md border border-icm-border text-[12.5px] bg-white">Cancel</button>
              <button onClick={submitOverride} className="h-9 px-3 rounded-md bg-amber-600 text-white text-[12.5px] font-medium">Apply override</button>
            </div>
          </div>
        </div>
      )}
    </ICMShell>
  );
};

export default ExceptionsQueue;
