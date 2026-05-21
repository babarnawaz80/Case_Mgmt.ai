import { useState } from "react";
import { ICMShell } from "@/components/icm/ICMShell";
import { MessageSquare, Mail, Phone, Video, FileSignature, FileText, Inbox, Lock, ShieldCheck, CheckCircle2, AlertTriangle, Send, Paperclip, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type Tab = "prefs" | "send" | "inbound";

const CHANNELS = [
  { key: "portal",   icon: Lock,          label: "Secure portal message", phi: true,  auth: "Portal login + MFA",        delivery: "Read receipts",          reply: true,  vendor: "Lovable Cloud (native)",          baa: "Native" },
  { key: "sms",      icon: MessageSquare, label: "Secure text / SMS",     phi: false, auth: "Phone verification + OTP",  delivery: "Carrier delivery report", reply: true,  vendor: "Twilio (HIPAA-eligible add-on)",  baa: "Required" },
  { key: "email",    icon: Mail,          label: "Email (encrypted link)",phi: false, auth: "Link tokenization + OTP",   delivery: "Open + click tracking",   reply: false, vendor: "Brevo (transactional)",           baa: "Required for PHI add-on" },
  { key: "phone",    icon: Phone,         label: "Phone call (logged)",   phi: true,  auth: "Caller verification (DOB+ID)",delivery: "Manual call log",       reply: false, vendor: "Internal (manual)",               baa: "N/A" },
  { key: "telehealth",icon: Video,        label: "Telehealth visit",      phi: true,  auth: "Portal SSO + invite link",  delivery: "Session join log",        reply: true,  vendor: "Doxy.me / Zoom for Healthcare",   baa: "Required" },
  { key: "esign",    icon: FileSignature, label: "E-signature request",   phi: true,  auth: "Knowledge-based + email OTP",delivery: "Signed event webhook",   reply: false, vendor: "DocuSign / Adobe Sign",           baa: "Required" },
  { key: "docreq",   icon: FileText,      label: "Document request",      phi: true,  auth: "Portal upload",             delivery: "Upload confirmation",     reply: true,  vendor: "Lovable Cloud (native)",          baa: "Native" },
];

const PREFS = {
  channel: "portal",
  consent: "Active",
  guardian: "Required for sensitive topics",
  optIn: { portal: true, sms: true, email: true, phone: true },
  sensitive: ["Behavioral health", "Substance use", "HIV status"],
  programRules: "NJ DDD requires guardian co-recipient for participants under 21",
};

const INBOUND = [
  { ts: "2026-05-21 09:14", from: "Sarah Mitchell (Guardian)", channel: "Portal", subject: "Re: ISP changes question", consent: "OK", task: "Reply within 24h", attached: true },
  { ts: "2026-05-21 08:02", from: "Riverside Day Program",     channel: "Email",  subject: "Attendance report",       consent: "OK", task: "Auto-filed",       attached: true },
  { ts: "2026-05-20 16:48", from: "+1 317-555-0199",           channel: "SMS",    subject: "Visit confirmation",      consent: "OK", task: "Closed",           attached: false },
  { ts: "2026-05-20 11:22", from: "Unknown caller",            channel: "Phone",  subject: "Voicemail (transcribed)",  consent: "Pending", task: "Verify identity", attached: false },
];

export default function CommunicationsHub() {
  const [tab, setTab] = useState<Tab>("prefs");
  const [channel, setChannel] = useState("portal");
  const [subject, setSubject] = useState("Follow-up on monthly visit");
  const [body, setBody] = useState("Hi Sarah,\n\nFollowing up on yesterday's home visit. Please confirm the medication change discussed.\n\nThanks,\nM. Carter");

  const ch = CHANNELS.find(c => c.key === channel)!;

  const send = () => {
    if (!subject.trim() || !body.trim()) { toast.error("Subject and message are required"); return; }
    toast.success(`Sent via ${ch.label} · logged to participant record · audit trail updated`);
  };

  return (
    <ICMShell title="Communications">
      <div className="space-y-4">
        <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-icm-accent-soft text-icm-accent grid place-items-center"><MessageSquare className="w-5 h-5" /></div>
            <div className="flex-1">
              <h1 className="font-manrope font-bold text-[20px] text-icm-text">Secure communications & engagement</h1>
              <p className="text-[12px] text-icm-text-dim mt-1">Preferences, consent, multi-channel send, and inbound capture — all linked to the participant record and audited.</p>
            </div>
            <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20 inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" />HIPAA logging</span>
          </div>
        </div>

        <div className="flex gap-1 border-b border-icm-border">
          {([
            ["prefs",   "14.1 Preferences & consent", ShieldCheck],
            ["send",    "14.2 Send communication",    Send],
            ["inbound", "14.3 Inbound",               Inbox],
          ] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-3 py-2 text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 border-b-2 -mb-px ${tab===k?"border-icm-accent text-icm-accent":"border-transparent text-icm-text-dim hover:text-icm-text"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {tab === "prefs" && (
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-icm-border bg-icm-panel p-5">
              <h2 className="font-manrope font-bold text-[14px] text-icm-text mb-3">Participant: Maria Hernandez (NJ-DDD)</h2>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div className="rounded-lg bg-icm-bg ring-1 ring-icm-border p-3"><div className="text-[10px] uppercase text-icm-text-dim font-semibold">Preferred channel</div><div className="font-semibold capitalize">{PREFS.channel}</div></div>
                <div className="rounded-lg bg-icm-bg ring-1 ring-icm-border p-3"><div className="text-[10px] uppercase text-icm-text-dim font-semibold">Consent status</div><div className="font-semibold text-icm-green">{PREFS.consent} (signed 2026-03-12)</div></div>
                <div className="rounded-lg bg-icm-bg ring-1 ring-icm-border p-3 col-span-2"><div className="text-[10px] uppercase text-icm-text-dim font-semibold">Guardian communication</div><div>{PREFS.guardian}</div></div>
                <div className="rounded-lg bg-icm-bg ring-1 ring-icm-border p-3 col-span-2"><div className="text-[10px] uppercase text-icm-text-dim font-semibold">Program/state rule</div><div>{PREFS.programRules}</div></div>
              </div>

              <div className="mt-4">
                <div className="text-[10.5px] uppercase font-semibold text-icm-text-dim mb-2">Opt-in by channel</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(PREFS.optIn).map(([k, v]) => (
                    <div key={k} className="rounded-lg ring-1 ring-icm-border bg-icm-bg p-2.5 text-[11.5px] flex items-center justify-between">
                      <span className="capitalize">{k}</span>
                      {v ? <CheckCircle2 className="w-3.5 h-3.5 text-icm-green" /> : <AlertTriangle className="w-3.5 h-3.5 text-icm-amber" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-[10.5px] uppercase font-semibold text-icm-text-dim mb-2">Sensitive information restrictions</div>
                <div className="flex flex-wrap gap-1.5">
                  {PREFS.sensitive.map(s => <span key={s} className="px-2 py-1 rounded-full text-[10.5px] bg-icm-amber/10 text-icm-amber ring-1 ring-icm-amber/20">{s} — restricted</span>)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
              <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-2">Consent audit</h3>
              <ul className="text-[11.5px] space-y-1.5 text-icm-text-dim">
                <li>2026-03-12 · ROI signed by guardian · DocuSign env <code className="bg-icm-bg px-1 rounded">8f2a</code></li>
                <li>2026-03-12 · Portal opt-in confirmed</li>
                <li>2026-04-02 · SMS opt-in via 2-way confirmation</li>
                <li>2026-05-10 · Behavioral health restriction set by coordinator</li>
              </ul>
            </div>
          </div>
        )}

        {tab === "send" && (
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-icm-border bg-icm-panel p-5">
              <h2 className="font-manrope font-bold text-[14px] text-icm-text mb-3">Compose</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {CHANNELS.map(c => {
                  const Icon = c.icon;
                  return (
                    <button key={c.key} onClick={() => setChannel(c.key)}
                      className={`rounded-xl p-3 text-left ring-1 ${channel===c.key?"ring-icm-accent bg-icm-accent-soft":"ring-icm-border bg-icm-bg hover:ring-icm-border-strong"}`}>
                      <Icon className={`w-4 h-4 mb-1 ${channel===c.key?"text-icm-accent":"text-icm-text-dim"}`} />
                      <div className="text-[11.5px] font-semibold">{c.label}</div>
                      <div className={`mt-1 text-[10px] inline-flex items-center gap-1 ${c.phi?"text-icm-green":"text-icm-amber"}`}>
                        {c.phi ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} PHI {c.phi?"allowed":"not allowed"}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
                  className="w-full h-9 rounded-lg ring-1 ring-icm-border bg-icm-bg px-3 text-[12px]" />
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={7}
                  className="w-full rounded-lg ring-1 ring-icm-border bg-icm-bg px-3 py-2 text-[12px]" />
                <div className="flex items-center justify-between">
                  <button onClick={() => toast("Attachment dialog opened")} className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-semibold inline-flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" />Attach</button>
                  <button onClick={send} className="h-9 px-3 rounded-xl bg-icm-accent text-white text-[12px] font-semibold inline-flex items-center gap-1.5">Send <ArrowRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
              <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-2">{ch.label} — channel profile</h3>
              <dl className="text-[11.5px] space-y-1.5">
                <div className="flex justify-between"><dt className="text-icm-text-dim">PHI allowed</dt><dd className={ch.phi?"text-icm-green font-semibold":"text-icm-amber font-semibold"}>{ch.phi?"Yes":"No"}</dd></div>
                <div className="flex justify-between"><dt className="text-icm-text-dim">Recipient auth</dt><dd>{ch.auth}</dd></div>
                <div className="flex justify-between"><dt className="text-icm-text-dim">Delivery / read</dt><dd>{ch.delivery}</dd></div>
                <div className="flex justify-between"><dt className="text-icm-text-dim">Reply capture</dt><dd>{ch.reply?"Yes (threaded)":"No"}</dd></div>
                <div className="flex justify-between"><dt className="text-icm-text-dim">Vendor</dt><dd>{ch.vendor}</dd></div>
                <div className="flex justify-between"><dt className="text-icm-text-dim">BAA</dt><dd>{ch.baa}</dd></div>
                <div className="flex justify-between"><dt className="text-icm-text-dim">Timestamp</dt><dd>Auto</dd></div>
                <div className="flex justify-between"><dt className="text-icm-text-dim">Staff sender</dt><dd>M. Carter (SC)</dd></div>
                <div className="flex justify-between"><dt className="text-icm-text-dim">Linked to record</dt><dd>Maria Hernandez</dd></div>
              </dl>
              <div className="mt-3 rounded-lg bg-icm-bg ring-1 ring-icm-border p-2 text-[10.5px] text-icm-text-dim">
                Audit trail: sender, recipient(s), channel, subject, attachments hash, delivery status, read receipt, replies — all immutable.
              </div>
            </div>
          </div>
        )}

        {tab === "inbound" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-manrope font-bold text-[14px] text-icm-text inline-flex items-center gap-1.5"><Inbox className="w-4 h-4" />Inbound queue</h2>
                <button onClick={() => toast.success("Logged manual call")} className="h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-semibold">+ Manual log</button>
              </div>
              <table className="w-full text-[11.5px]">
                <thead className="text-icm-text-dim"><tr className="border-b border-icm-border"><th className="text-left p-2">When</th><th className="text-left p-2">From</th><th className="text-left p-2">Channel</th><th className="text-left p-2">Subject</th><th className="text-left p-2">Consent</th><th className="text-left p-2">Task</th><th className="text-left p-2">Attached</th></tr></thead>
                <tbody>
                  {INBOUND.map((m,i) => (
                    <tr key={i} className="border-b border-icm-border/50">
                      <td className="p-2 text-icm-text-dim">{m.ts}</td>
                      <td className="p-2 font-semibold">{m.from}</td>
                      <td className="p-2">{m.channel}</td>
                      <td className="p-2">{m.subject}</td>
                      <td className="p-2"><span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${m.consent==="OK"?"bg-icm-green-soft text-icm-green":"bg-icm-amber/10 text-icm-amber"}`}>{m.consent}</span></td>
                      <td className="p-2 text-icm-text-dim">{m.task}</td>
                      <td className="p-2">{m.attached ? <CheckCircle2 className="w-3.5 h-3.5 text-icm-green" /> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
                <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-2">Automated ingestion</h3>
                <ul className="text-[11.5px] text-icm-text-dim space-y-1.5 list-disc pl-4">
                  <li>Email-to-record (IMAP) → matches participant by sender/subject keys</li>
                  <li>Portal uploads auto-attach to participant Documents</li>
                  <li>SMS replies thread to original outbound message</li>
                  <li>Voicemail → Twilio transcription → task created for SC</li>
                  <li>Fax-to-PDF via SRFax (BAA-covered)</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-icm-border bg-icm-panel p-5">
                <h3 className="font-manrope font-bold text-[13px] text-icm-text mb-2">Vendor / BAA register</h3>
                <table className="w-full text-[11px]">
                  <thead className="text-icm-text-dim"><tr><th className="text-left">Vendor</th><th className="text-left">Use</th><th className="text-left">BAA</th><th className="text-left">Cost</th><th className="text-left">Go-live</th></tr></thead>
                  <tbody>
                    <tr><td>Twilio</td><td>SMS, voicemail TX</td><td className="text-icm-green">Signed</td><td>$0.0079/msg</td><td>2 wk</td></tr>
                    <tr><td>Brevo</td><td>Transactional email</td><td className="text-icm-green">Signed</td><td>$25/mo</td><td>1 wk</td></tr>
                    <tr><td>DocuSign</td><td>E-signature</td><td className="text-icm-green">Signed</td><td>$40/user/mo</td><td>3 wk</td></tr>
                    <tr><td>Doxy.me</td><td>Telehealth</td><td className="text-icm-green">Signed</td><td>$35/user/mo</td><td>1 wk</td></tr>
                    <tr><td>SRFax</td><td>Inbound fax</td><td className="text-icm-green">Signed</td><td>$13/mo</td><td>3 days</td></tr>
                  </tbody>
                </table>
                <p className="text-[10.5px] text-icm-text-dim mt-2">Audit limitation: SMS read receipts unavailable on some carriers; mitigated by 2-way confirmation reply.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ICMShell>
  );
}
