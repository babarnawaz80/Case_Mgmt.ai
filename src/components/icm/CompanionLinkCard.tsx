import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { Individual } from "@/hooks/useIndividuals";
import { toast } from "sonner";
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Loader2,
} from "lucide-react";

interface CompanionLinkCardProps {
  individual: Individual;
  /** When provided, shows a "View Transcripts" link in the header */
  individualId?: string;
}

const BASE_URL = "https://casemanagement-ai.web.app/care-assistant";

export function CompanionLinkCard({ individual, individualId }: CompanionLinkCardProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [copied, setCopied] = useState(false);

  const isActive = individual.companion_link_active === true;
  const token = individual.companion_token;
  const companionUrl = isActive && token ? `${BASE_URL}/${token}` : null;

  const generateLink = async () => {
    if (!currentUser) {
      toast.error("You must be logged in to generate a link.");
      return;
    }
    setGenerating(true);
    try {
      const rawToken = btoa(`${individual.id}_${Date.now()}`);
      const companionToken = `cmp_${rawToken}`;
      await updateDoc(doc(db, "individuals", individual.id), {
        companion_token: companionToken,
        companion_link_active: true,
        companion_generated_at: serverTimestamp(),
        companion_generated_by: currentUser.uid,
      });
      toast.success("Case Companion link generated successfully.");
    } catch (err) {
      console.error("Failed to generate companion link:", err);
      toast.error("Failed to generate link. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const deactivateLink = async () => {
    setDeactivating(true);
    try {
      await updateDoc(doc(db, "individuals", individual.id), {
        companion_link_active: false,
      });
      toast.success("Case Companion link deactivated.");
    } catch (err) {
      console.error("Failed to deactivate companion link:", err);
      toast.error("Failed to deactivate Case Companion link. Please try again.");
    } finally {
      setDeactivating(false);
    }
  };

  const copyLink = async () => {
    if (!companionUrl) return;
    try {
      await navigator.clipboard.writeText(companionUrl);
      setCopied(true);
      toast.success("Link copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  return (
    <div className="rounded-2xl border border-icm-border bg-icm-panel overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-icm-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div>
            <h2 className="font-manrope font-bold text-[13.5px] text-icm-text leading-tight">
              AI Case Companion
            </h2>
            <p className="text-[11px] font-geist text-icm-text-dim leading-snug">
              Generate a secure link for daily check-in conversations
            </p>
          </div>
        </div>

        {/* Status pill + transcripts link */}
        <div className="flex items-center gap-2 shrink-0">
          {individualId && (
            <button
              onClick={() => navigate(`/people/${individualId}/companion-transcripts`)}
              className="inline-flex items-center gap-1 text-[11px] font-geist font-semibold text-purple-500 hover:text-purple-600 hover:underline transition-colors"
            >
              View Transcripts
              <span className="text-[10px]">→</span>
            </button>
          )}
          {isActive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
              <span className="w-1.5 h-1.5 rounded-full bg-icm-green animate-pulse" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-geist font-semibold bg-icm-panel border border-icm-border text-icm-text-dim">
              <span className="w-1.5 h-1.5 rounded-full bg-icm-text-faint" />
              Not configured
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Description */}
        <p className="text-[12px] font-geist text-icm-text-dim leading-relaxed">
          Generate a secure link your client can use to have daily check-in conversations with the AI companion.
          The link is private and unique to{" "}
          <span className="text-icm-text font-semibold">
            {individual.preferred_name || individual.first_name}
          </span>
          .
        </p>

        {/* Active link display */}
        {isActive && companionUrl && (
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-3 py-2.5 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span className="flex-1 text-[11.5px] font-mono text-icm-text truncate min-w-0">
              {companionUrl}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={copyLink}
                title="Copy link"
                className="w-7 h-7 rounded-lg border border-icm-border bg-icm-bg hover:bg-icm-panel flex items-center justify-center text-icm-text-dim hover:text-icm-text transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-icm-green" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <a
                href={companionUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open link"
                className="w-7 h-7 rounded-lg border border-icm-border bg-icm-bg hover:bg-icm-panel flex items-center justify-center text-icm-text-dim hover:text-icm-text transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={generateLink}
            disabled={generating || deactivating}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-geist font-semibold bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-60 transition-colors"
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {isActive ? "Generate New Link" : "Generate Link"}
          </button>

          {isActive && (
            <button
              onClick={deactivateLink}
              disabled={generating || deactivating}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-geist font-semibold border border-icm-border bg-icm-bg text-icm-text-dim hover:text-icm-red hover:border-icm-red/40 disabled:opacity-60 transition-colors"
            >
              {deactivating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              Deactivate Link
            </button>
          )}

          {isActive && companionUrl && (
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-geist font-semibold border border-icm-border bg-icm-bg text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-icm-green" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
