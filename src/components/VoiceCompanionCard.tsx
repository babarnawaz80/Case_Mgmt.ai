import { useEffect, useMemo, useState } from "react";
import { Copy, MessageSquare, ExternalLink, Sparkles, RefreshCw, Check, Phone } from "lucide-react";
import { toast } from "sonner";
import { loadCheckIns, tokenForIndividual } from "@/lib/aiCheckIns";

interface VoiceCompanionCardProps {
  personId: string;
  firstName: string;
  phone?: string;
}

const PUBLIC_HOST = "https://casemanagement.ai";

export function VoiceCompanionCard({ personId, firstName, phone }: VoiceCompanionCardProps) {
  const [rotated, setRotated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsPhone, setSmsPhone] = useState(phone ?? "");
  const [lastUsedTick, setLastUsedTick] = useState(0);

  useEffect(() => {
    const refresh = () => setLastUsedTick((t) => t + 1);
    window.addEventListener("cm_ai_checkins_changed", refresh);
    return () => window.removeEventListener("cm_ai_checkins_changed", refresh);
  }, []);

  const token = useMemo(() => {
    const base = tokenForIndividual(personId);
    return rotated ? `${base.replace(/-001$/, "-001b").replace(/-002$/, "-002b").replace(/-003$/, "-003b")}` : base;
  }, [personId, rotated]);

  const publicLink = `${PUBLIC_HOST}/care-assistant/${token}`;
  const internalHref = `/care-assistant/${token}`;

  const lastUsed = useMemo(() => {
    const sessions = loadCheckIns().filter((c) => c.individualId === personId);
    if (sessions.length === 0) return null;
    const latest = sessions.reduce((a, b) => (a.startedAt > b.startedAt ? a : b));
    return new Date(latest.startedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, lastUsedTick]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handleOpen = () => {
    window.open(internalHref, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-[2rem] border border-icm-border/70 bg-icm-panel p-6 shadow-[0_25px_70px_-20px_rgba(15,23,42,0.08),0_4px_10px_-2px_rgba(15,23,42,0.02)]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-icm-accent-soft to-icm-accent-soft/60 ring-1 ring-icm-accent/15 flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5 text-icm-accent" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-manrope font-bold text-[16px] text-icm-text tracking-tight">AI Case Companion</h2>
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest bg-icm-accent-soft text-icm-accent border border-icm-accent/15">
                Private Link
              </span>
            </div>
            <p className="text-[12.5px] text-icm-text-dim mt-1 leading-relaxed font-geist max-w-xl">
              A unique link for <span className="text-icm-text font-semibold">{firstName}</span>. They tap it from
              their phone to start a check-in with their Care Assistant. The transcript and any tasks flow
              back to My Work and this individual's Communications Log.
            </p>
          </div>
        </div>
        <button
          onClick={() => setConfirmRotate(true)}
          className="h-9 px-3 rounded-xl text-[11.5px] font-geist font-semibold text-icm-text-dim hover:text-icm-text border border-icm-border bg-icm-panel hover:border-icm-border-strong shadow-sm flex items-center gap-1.5"
          title="Rotate link"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Rotate Link
        </button>
      </div>

      {/* Link row */}
      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-icm-border bg-icm-bg/60 px-4 py-2.5">
        <a
          href={internalHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-mono text-icm-accent hover:underline truncate flex-1"
          title={publicLink}
        >
          {publicLink}
        </a>
        <button
          onClick={handleCopy}
          className="h-8 px-3 rounded-lg text-[11.5px] font-geist font-bold flex items-center gap-1.5 bg-icm-panel border border-icm-border text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong shadow-sm"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-icm-green" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Status indicator */}
      <div className="mt-3 flex items-center gap-2 text-[11.5px] font-geist">
        <span className={`w-2 h-2 rounded-full ${lastUsed ? "bg-icm-green shadow-[0_0_8px_rgba(34,197,94,0.45)]" : "bg-icm-text-faint"}`} />
        <span className="text-icm-text-dim">
          {lastUsed
            ? `Link active — last used ${lastUsed.toLocaleDateString()} at ${lastUsed.toLocaleTimeString(
                [],
                { hour: "numeric", minute: "2-digit" }
              )}`
            : "Link active — not yet opened"}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSmsOpen(true)}
          className="h-10 px-5 rounded-2xl text-[12px] font-geist font-bold text-white bg-icm-accent hover:bg-icm-accent/90 shadow-[0_10px_25px_-5px_rgba(59,130,246,0.45)] hover:shadow-[0_15px_30px_-5px_rgba(59,130,246,0.55)] hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Send via Text
        </button>
        <button
          onClick={handleOpen}
          className="h-10 px-4 rounded-2xl text-[12px] font-geist font-black text-icm-text bg-white border border-icm-border shadow-sm hover:bg-icm-bg/60 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Preview Care Assistant
        </button>
        {phone && (
          <span className="text-[11.5px] text-icm-text-dim font-geist inline-flex items-center gap-1 ml-1">
            <Phone className="w-3 h-3" />
            On file: {phone}
          </span>
        )}
      </div>

      {/* Confirm rotate */}
      {confirmRotate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5">
            <h3 className="font-semibold text-icm-text text-[15px]">Regenerate link?</h3>
            <p className="mt-2 text-[13px] text-icm-text-dim leading-relaxed">
              Regenerating this link will deactivate the old one. {firstName} will need the new link to access
              their Care Assistant. Continue?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmRotate(false)}
                className="h-8 px-3 rounded-lg text-[12px] font-semibold border border-icm-border text-icm-text-dim hover:text-icm-text"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setRotated(true);
                  setConfirmRotate(false);
                  toast.success("New link generated", {
                    description: `Send it to ${firstName} to get started.`,
                  });
                }}
                className="h-8 px-3 rounded-lg text-[12px] font-semibold bg-icm-accent text-white hover:bg-icm-accent/90"
              >
                Regenerate Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send via Text modal */}
      {smsOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5">
            <h3 className="font-semibold text-icm-text text-[15px]">Send Care Assistant link via text</h3>
            <label className="block mt-3 text-[11.5px] text-icm-text-dim">Phone number</label>
            <input
              value={smsPhone}
              onChange={(e) => setSmsPhone(e.target.value)}
              className="mt-1 w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[13px] text-icm-text"
            />
            <label className="block mt-3 text-[11.5px] text-icm-text-dim">Message preview</label>
            <div className="mt-1 rounded-lg border border-icm-border bg-icm-bg/60 p-3 text-[12.5px] text-icm-text leading-relaxed">
              Hi {firstName}, here is your Care Assistant link from your agency: {publicLink} — Click anytime
              you need support or want to check in with your care team.
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setSmsOpen(false)}
                className="h-8 px-3 rounded-lg text-[12px] font-semibold border border-icm-border text-icm-text-dim hover:text-icm-text"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSmsOpen(false);
                  toast.success(`Text message sent to ${firstName} at ${smsPhone || phone || "phone on file"}`);
                }}
                className="h-8 px-3 rounded-lg text-[12px] font-semibold bg-icm-accent text-white hover:bg-icm-accent/90"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
