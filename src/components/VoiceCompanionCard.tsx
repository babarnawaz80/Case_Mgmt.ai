import { useMemo, useState } from "react";
import { Copy, MessageSquare, ExternalLink, Sparkles, RefreshCw, Check, Phone } from "lucide-react";
import { toast } from "sonner";

interface VoiceCompanionCardProps {
  personId: string;
  firstName: string;
  phone?: string;
}

/**
 * Demo-only encoded token. Not cryptographically secure — just opaque
 * for the demo so the URL doesn't expose the raw person id.
 */
function makeToken(personId: string) {
  return `cmp_${btoa(personId)}`;
}

export function VoiceCompanionCard({ personId, firstName, phone }: VoiceCompanionCardProps) {
  const [version, setVersion] = useState(0);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const token = useMemo(() => makeToken(`${personId}:${version}`), [personId, version]);
  const link = useMemo(() => {
    if (typeof window === "undefined") return `/companion/${token}`;
    return `${window.location.origin}/companion/${token}`;
  }, [token]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied", { description: "Paste it into a message to share with the individual." });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handleSendSms = () => {
    setSent(true);
    toast.success(`SMS queued to ${firstName}`, {
      description: phone
        ? `Demo: would text "${phone}" with the secure companion link.`
        : "Demo: would text the individual's phone on file with the secure companion link.",
    });
    setTimeout(() => setSent(false), 2400);
  };

  const handleRotate = () => {
    setVersion((v) => v + 1);
    toast("Link rotated", { description: "The previous link is now invalid." });
  };

  const handleOpen = () => {
    window.open(link, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl ai-gradient flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-manrope font-bold text-[15px] text-icm-text">AI Voice Companion</h2>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20">
                PRIVATE LINK
              </span>
            </div>
            <p className="text-[12px] text-icm-text-dim mt-0.5 leading-snug">
              A unique, encrypted link for <span className="text-icm-text font-medium">{firstName}</span>. They tap it
              from their phone to start a private voice conversation with their AI companion. Summaries flow back to
              this profile.
            </p>
          </div>
        </div>
        <button
          onClick={handleRotate}
          className="h-8 px-2.5 rounded-lg text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text border border-icm-border hover:border-icm-border-strong flex items-center gap-1.5"
          title="Rotate link (invalidates the previous one)"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Rotate
        </button>
      </div>

      {/* Link row */}
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-icm-border bg-icm-bg/60 px-3 py-2">
        <span className="text-[11px] font-mono text-icm-text-dim truncate flex-1" title={link}>
          {link}
        </span>
        <button
          onClick={handleCopy}
          className="h-7 px-2.5 rounded-md text-[11.5px] font-geist font-medium flex items-center gap-1.5 bg-icm-panel border border-icm-border text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-icm-green" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <button
          onClick={handleSendSms}
          className="h-9 px-3 rounded-xl text-[12px] font-geist font-semibold flex items-center gap-1.5 text-white gradient-primary shadow-sm hover:opacity-95"
        >
          {sent ? <Check className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
          {sent ? "Sent (demo)" : `Send link via SMS${phone ? "" : ""}`}
        </button>
        <button
          onClick={handleOpen}
          className="h-9 px-3 rounded-xl text-[12px] font-geist font-medium flex items-center gap-1.5 border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Preview companion
        </button>
        {phone && (
          <span className="text-[11.5px] text-icm-text-dim inline-flex items-center gap-1 ml-1">
            <Phone className="w-3 h-3" />
            On file: {phone}
          </span>
        )}
      </div>
    </div>
  );
}
