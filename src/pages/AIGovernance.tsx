import { useState } from "react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Mic, FileText, Tags, ShieldCheck, AlertTriangle, ClipboardList, MessageSquare, DollarSign, Lock, Eye, History, ToggleRight, ToggleLeft, CheckCircle2, Settings2, Activity } from "lucide-react";
import { toast } from "sonner";

type CapKey = "ambient" | "summary" | "service" | "compliance" | "risk" | "plan" | "nlq" | "billing";

const CAPS: Array<{
  key: CapKey; icon: any; name: string; desc: string;
  phi: "Read+Write" | "Read-only" | "None";
  review: "Required" | "Optional" | "Background draft";
  model: string;
  cost: string;
  status: "GA" | "Beta" | "Pilot";
  example: string;
}> = [
  { key:"ambient",    icon:Mic,            name:"Ambient listening / note drafting", desc:"Consent-first capture of in-visit conversation; structured draft note with entity extraction.", phi:"Read+Write", review:"Required",         model:"google/gemini-3-flash-preview", cost:"~$0.018 / 15-min visit", status:"GA",   example:"Draft of Maria H. visit ready for Review & Apply" },
  { key:"summary",    icon:FileText,       name:"Case summarization",                desc:"6-month rollup across notes, assessments, incidents, and meetings.",                         phi:"Read-only",  review:"Optional",         model:"google/gemini-2.5-pro",         cost:"~$0.04 / summary",       status:"GA",   example:"Auto-generated handoff summary for J. Chen" },
  { key:"service",    icon:Tags,           name:"Service-code suggestion",           desc:"Suggests T-codes from narrative + plan goals; coordinator confirms.",                       phi:"Read-only",  review:"Required",         model:"google/gemini-3-flash-preview", cost:"~$0.004 / note",         status:"GA",   example:"Suggested T2022 + 4 units" },
  { key:"compliance", icon:ShieldCheck,    name:"Compliance check",                  desc:"Validates note against state guideline pack; flags hard stops vs warnings.",                phi:"Read-only",  review:"Background draft", model:"google/gemini-3-flash-preview", cost:"~$0.003 / check",        status:"GA",   example:"3 warnings, 0 hard stops on today's submissions" },
  { key:"risk",       icon:AlertTriangle,  name:"Risk identification",               desc:"Surfaces escalating patterns (missed contacts, ER visits, incidents).",                      phi:"Read-only",  review:"Optional",         model:"google/gemini-2.5-flash",       cost:"~$0.012 / individual / wk", status:"Beta",example:"2 individuals elevated to High this week" },
  { key:"plan",       icon:ClipboardList,  name:"Plan generation / suggestions",     desc:"Proposes goals/objectives from assessment; never published without supervisor sign-off.",   phi:"Read+Write", review:"Required",         model:"google/gemini-3.1-pro-preview", cost:"~$0.08 / plan",          status:"Pilot",example:"Draft ISP for L. Brooks pending supervisor" },
  { key:"nlq",        icon:MessageSquare,  name:"Natural-language reporting",        desc:"Ask questions in plain English; returns chart + underlying query with audit log.",          phi:"Read-only",  review:"Optional",         model:"google/gemini-3-flash-preview", cost:"~$0.006 / query",        status:"GA",   example:'"Show NJ overdue contacts by region"' },
  { key:"billing",    icon:DollarSign,     name:"Billing / denial prevention",       desc:"Pre-submission check against payer rules; predicts denial likelihood and suggests fixes.",  phi:"Read-only",  review:"Required",         model:"google/gemini-2.5-flash",       cost:"~$0.009 / claim",        status:"GA",   example:"4 claims flagged: missing units justification" },
];

const AUDIT = [
  { ts:"2026-05-21 09:14", user:"M. Carter (SC)",  cap:"ambient",    action:"Draft generated · 412 tokens · Review pending", person:"Maria H." },
  { ts:"2026-05-21 09:02", user:"System",          cap:"compliance", action:"Background check on 28 submitted notes",        person:"—" },
  { ts:"2026-05-21 08:47", user:"J. O'Connor (Sup)",cap:"plan",      action:"AI plan suggestion rejected · reason: goals too generic", person:"L. Brooks" },
  { ts:"2026-05-20 17:30", user:"C. Vance (Admin)",cap:"nlq",        action:"Query: 'NJ overdue contacts by region' · 287 rows returned", person:"—" },
  { ts:"2026-05-20 16:11", user:"M. Carter (SC)",  cap:"service",    action:"Suggested T2022 accepted (4 units)",            person:"Maria H." },
];

export default function AIGovernance() {
  const [enabled, setEnabled] = useState<Record<CapKey, boolean>>({
    ambient:true, summary:true, service:true, compliance:true, risk:true, plan:false, nlq:true, billing:true,
  });
  const [selected, setSelected] = useState<CapKey>("ambient");

  const cap = CAPS.find(c => c.key === selected)!;
  const toggle = (k: CapKey) => {
    setEnabled(s => ({ ...s, [k]: !s[k] }));
    toast.success(`${CAPS.find(c=>c.key===k)!.name} ${enabled[k] ? "disabled" : "enabled"} — change logged to audit`);
  };

  const usedThisMonth = 1284.62;
  const monthlyBudget = 2500;
  const pct = Math.min(100, (usedThisMonth / monthlyBudget) * 100);

  return (
    <ICMShell title="AI & Automation Governance">
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-icm-accent-soft text-icm-accent grid place-items-center"><Settings2 className="w-5 h-5" /></div>
            <div className="flex-1">
              <h1 className="font-manrope font-bold text-[20px] text-icm-text">AI & Automation Governance</h1>
              <p className="text-[12px] text-icm-text-dim mt-1">Administrator control, PHI safeguards, human review, audit trail, and usage transparency for every AI capability.</p>
            </div>
            <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20 inline-flex items-center gap-1"><Lock className="w-3 h-3" />No silent automation</span>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
            {[
              ["Capabilities enabled", `${Object.values(enabled).filter(Boolean).length} of ${CAPS.length}`],
              ["Human-review gated",   "7 of 8 actions"],
              ["PHI write-back",       "Review & Apply only"],
              ["Audit retention",      "7 years (hash-chained)"],
            ].map(([k,v]) => (
              <div key={k} className="rounded-lg bg-icm-bg ring-1 ring-icm-border p-2.5">
                <div className="text-[10px] uppercase text-icm-text-dim font-semibold">{k}</div>
                <div className="font-semibold text-icm-text">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Capability grid + detail */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
              <h2 className="font-manrope font-bold text-[14px] text-icm-text mb-3">Capabilities</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                {CAPS.map(c => {
                  const Icon = c.icon;
                  const active = selected === c.key;
                  const on = enabled[c.key];
                  return (
                    <div key={c.key}
                      className={`rounded-xl p-3 ring-1 cursor-pointer ${active?"ring-icm-accent bg-icm-accent-soft":"ring-icm-border bg-icm-bg hover:ring-icm-border-strong"}`}
                      onClick={() => setSelected(c.key)}>
                      <div className="flex items-start gap-2">
                        <Icon className={`w-4 h-4 mt-0.5 ${active?"text-icm-accent":"text-icm-text-dim"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-[12px] text-icm-text">{c.name}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold ${c.status==="GA"?"bg-icm-green-soft text-icm-green":c.status==="Beta"?"bg-icm-accent-soft text-icm-accent":"bg-icm-amber/10 text-icm-amber"}`}>{c.status}</span>
                          </div>
                          <p className="text-[11px] text-icm-text-dim mt-0.5 line-clamp-2">{c.desc}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); toggle(c.key); }} className="shrink-0" title={on?"Disable":"Enable"}>
                          {on ? <ToggleRight className="w-6 h-6 text-icm-green" /> : <ToggleLeft className="w-6 h-6 text-icm-text-dim" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-manrope font-bold text-[14px] text-icm-text inline-flex items-center gap-1.5"><History className="w-4 h-4" />AI action audit trail</h2>
                <button onClick={() => toast.success("Exported AI audit log (CSV)")} className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-semibold">Export</button>
              </div>
              <table className="w-full text-[11.5px]">
                <thead className="text-icm-text-dim"><tr className="border-b border-icm-border"><th className="text-left p-2">When</th><th className="text-left p-2">User</th><th className="text-left p-2">Capability</th><th className="text-left p-2">Action</th><th className="text-left p-2">Person</th></tr></thead>
                <tbody>
                  {AUDIT.map((a,i) => (
                    <tr key={i} className="border-b border-icm-border/50">
                      <td className="p-2 text-icm-text-dim">{a.ts}</td>
                      <td className="p-2">{a.user}</td>
                      <td className="p-2"><span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-icm-bg ring-1 ring-icm-border">{CAPS.find(c=>c.key===a.cap)?.name.split(" ")[0]}</span></td>
                      <td className="p-2">{a.action}</td>
                      <td className="p-2 text-icm-text-dim">{a.person}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10.5px] text-icm-text-dim mt-2">Every AI call records: user ID, capability, model, prompt hash, token count, PHI scope, review outcome, and IP/device. Logs are append-only and hash-chained.</p>
            </div>
          </div>

          {/* Right detail rail */}
          <div className="space-y-3">
            <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
              <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-2 inline-flex items-center gap-1.5">
                <cap.icon className="w-4 h-4 text-icm-accent" /> {cap.name}
              </h3>
              <p className="text-[11.5px] text-icm-text-dim mb-3">{cap.desc}</p>
              <dl className="text-[11.5px] space-y-1.5">
                <div className="flex justify-between"><dt className="text-icm-text-dim">Status</dt><dd className="font-semibold">{cap.status} · {enabled[cap.key]?"Enabled":"Disabled"}</dd></div>
                <div className="flex justify-between"><dt className="text-icm-text-dim">PHI access</dt><dd className={cap.phi==="Read+Write"?"text-icm-amber font-semibold":"font-semibold"}>{cap.phi}</dd></div>
                <div className="flex justify-between"><dt className="text-icm-text-dim">Human review</dt><dd className="font-semibold">{cap.review}</dd></div>
                <div className="flex justify-between"><dt className="text-icm-text-dim">Model</dt><dd className="font-mono text-[10.5px]">{cap.model}</dd></div>
                <div className="flex justify-between"><dt className="text-icm-text-dim">Est. cost</dt><dd>{cap.cost}</dd></div>
              </dl>
              <div className="mt-3 rounded-lg bg-icm-bg ring-1 ring-icm-border p-2.5 text-[11px]">
                <div className="text-[10px] uppercase text-icm-text-dim font-semibold mb-1 inline-flex items-center gap-1"><Activity className="w-3 h-3" />Live example</div>
                {cap.example}
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => toast.success("Opened sample run with Review & Apply")} className="flex-1 h-8 rounded-lg bg-icm-accent text-white text-[11.5px] font-semibold inline-flex items-center justify-center gap-1.5"><Eye className="w-3.5 h-3.5" />Try demo</button>
                <button onClick={() => toast("Opened policy & data-handling sheet")} className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-semibold">Policy</button>
              </div>
            </div>

            <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
              <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-2 inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-icm-green" />PHI safeguards</h3>
              <ul className="text-[11.5px] text-icm-text-dim space-y-1.5 list-disc pl-4">
                <li>De-identification toggle for analytics queries</li>
                <li>Model calls routed via HIPAA-eligible gateway (BAA on file)</li>
                <li>Prompts/responses never used for model training</li>
                <li>State-tenant isolation enforced at gateway</li>
                <li>Per-role allowlist for AI capabilities</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
              <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-2 inline-flex items-center gap-1.5"><DollarSign className="w-4 h-4" />Usage & budget (May 2026)</h3>
              <div className="text-[11.5px] flex justify-between mb-1"><span className="text-icm-text-dim">Spent</span><span className="font-semibold">${usedThisMonth.toFixed(2)} / ${monthlyBudget}</span></div>
              <div className="h-2 rounded-full bg-icm-bg ring-1 ring-icm-border overflow-hidden">
                <div className="h-full bg-icm-accent" style={{ width: `${pct}%` }} />
              </div>
              <ul className="mt-3 text-[11px] text-icm-text-dim space-y-1">
                <li className="flex justify-between"><span>Ambient drafts (812)</span><span>$14.62</span></li>
                <li className="flex justify-between"><span>Summaries (94)</span><span>$3.76</span></li>
                <li className="flex justify-between"><span>Compliance checks (4.1k)</span><span>$12.30</span></li>
                <li className="flex justify-between"><span>NLQ queries (520)</span><span>$3.12</span></li>
                <li className="flex justify-between"><span>Plan suggestions (18)</span><span>$1.44</span></li>
              </ul>
              <p className="mt-2 text-[10.5px] text-icm-text-dim">Soft cap alerts at 80%; admin must approve overage. Per-coordinator quotas configurable.</p>
            </div>
          </div>
        </div>

        {/* Governance principles strip */}
        <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
          <h2 className="font-manrope font-bold text-[14px] text-icm-text mb-3 inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-icm-green" />Governance principles</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11.5px]">
            {[
              ["No silent automation",   "Every AI write to iCM requires Review & Apply confirmation."],
              ["Cite, don't guess",      "Compliance AI cites the exact state guideline triggering each flag."],
              ["Versioned & immutable",  "Published engines are pinned; edits create new versions, runs are preserved."],
              ["Override w/ justification","Supervisors can override findings; reason text is mandatory and audited."],
            ].map(([t,d]) => (
              <div key={t} className="rounded-lg bg-icm-bg ring-1 ring-icm-border p-3">
                <div className="font-semibold text-icm-text">{t}</div>
                <div className="text-icm-text-dim mt-1">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ICMShell>
  );
}
