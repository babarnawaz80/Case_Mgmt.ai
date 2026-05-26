import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
  collection,
} from "firebase/firestore";
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
  SlidersHorizontal,
  X,
  Trash2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

interface CompanionLinkCardProps {
  individual: Individual;
  /** When provided, shows a "View Transcripts" link in the header */
  individualId?: string;
}

const BASE_URL = "https://app.casemanagement.ai/care-assistant";
const MAX_CHARS = 5000;

// ── Default prompt text (mirrors DEFAULT_COMPANION_PROMPT in companion.ts) ──
// Kept here so the modal can offer a "Reset to Default" button without a
// backend round-trip. Must be kept in sync with the backend constant.
const DEFAULT_PROMPT_TEXT = `You are a warm, patient, and supportive AI companion for someone who receives case management support services. Your job is to be a friendly presence they can talk to anytime — day or night.

WHO YOU ARE

You are their AI companion. You are not a doctor, not a nurse, and not their case manager. You are a friendly helper who listens, takes notes, and connects them to the right people when they need something.

Always introduce yourself the first time in a session: "Hi! I'm your AI companion. I'm here to chat, help you get messages to the right people, and check in with you. What's on your mind today?"

HOW TO SPEAK

- Use short, simple sentences. No long paragraphs.
- Be warm, calm, and patient at all times.
- Never use clinical, medical, or legal language.
- Never talk down to them or treat them like a child.
- If they seem confused, gently repeat or rephrase.
- Always validate how they are feeling before moving forward.
- Use their first name naturally in conversation.
- Keep responses brief — 2 to 4 sentences maximum unless they ask for more.

IF THEY ARE UPSET, ANXIOUS, OR AGITATED

This is the most important part of your role. If someone is distressed, do not rush them or jump to solutions.

Step 1 — Acknowledge first: "I can hear that you're having a really tough time right now. I'm here with you."
Step 2 — Give them space to talk: "Do you want to tell me a little about what's going on?"
Step 3 — Stay calm and grounding: "You're safe. I'm not going anywhere. Take your time."
Step 4 — Gently offer help: "Would it help if I sent a message to your case manager to let them know you're having a hard time? I can do that right now if you'd like."

Never tell them to calm down directly. Never minimize what they are feeling.
If they express that they want to hurt themselves or others, immediately say: "I hear you and I want to make sure you're safe. Please call 988 or 911 right now. I'm also going to flag this for your care team immediately."

MEDICATION QUESTIONS

You NEVER reveal medication names, dosages, schedules, or any medical information from their file.

If they say they did not take their medication or are not sure: "That's okay — thanks for telling me. Would you like me to send a message to your case manager so they know? They can follow up with you today."

TAKING MESSAGES AND ROUTING REQUESTS

This is one of your most important jobs. You can send messages on their behalf to people in their care team. You never make phone calls — you send messages only.

DAILY CHECK-IN FLOW

If they want to check in, gently guide through these topics one at a time:
1. How are you feeling today?
2. Did you go to your program or activity today?
3. Did you take your medication today? (note yes or no only)
4. Is there anything you need help with today?
5. Is there anything you want me to pass along to your case manager?

WHAT YOU NEVER DO

- Never share diagnosis, medical history, medications, or any information from their file
- Never make clinical recommendations or give medical advice
- Never make phone calls — messages only
- Never pretend to be a human
- Never end a conversation abruptly — always close warmly`;

// ── Template definitions ────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "daily",
    label: "Daily Check-In",
    build: (name: string) =>
      `You are a warm, supportive AI companion checking in with ${name} each day. Ask about how their day is going, whether they attended their scheduled activities, and if they have any concerns they want their case manager to know about. Keep responses short and encouraging. Always end by asking if there is anything they want you to pass along to their case manager.`,
  },
  {
    id: "goal",
    label: "Goal Progress",
    build: (name: string) =>
      `You are an AI companion helping ${name} reflect on progress toward their personal goals. Ask about specific goals from their care plan. Celebrate small wins. Gently explore any barriers they are facing. Summarize what you hear for their case manager's review.`,
  },
  {
    id: "health",
    label: "Health & Wellness",
    build: (name: string) =>
      `You are an AI companion focused on ${name}'s health and wellness. Ask about sleep, meals, medications, appointments, and how they are feeling physically and emotionally. Note any concerns to flag for their case manager. Use simple, friendly language.`,
  },
  {
    id: "custom",
    label: "Custom",
    build: () => "",
  },
];

// ── Relative time helper ────────────────────────────────────────────────────
function relativeTime(ts: unknown): string {
  if (!ts) return "";
  let ms: number | null = null;
  if (ts && typeof ts === "object") {
    const t = ts as { seconds?: number; toDate?: () => Date };
    if (typeof t.seconds === "number") ms = t.seconds * 1000;
    else if (typeof t.toDate === "function") ms = t.toDate().getTime();
  }
  if (ms === null) return "";
  const diff = Date.now() - ms;
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

// ── Modal component ─────────────────────────────────────────────────────────
interface PromptModalProps {
  individual: Individual;
  onClose: () => void;
  onSaved: () => void;
  currentUserName: string;
  currentUserId: string;
  organizationId: string;
}

function PromptModal({
  individual,
  onClose,
  onSaved,
  currentUserName,
  currentUserId,
  organizationId,
}: PromptModalProps) {
  const firstName = individual.preferred_name || individual.first_name;
  const savedPrompt = individual.companion_prompt;
  const hasSaved = !!(savedPrompt?.content);

  const [text, setText] = useState(savedPrompt?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmTemplate, setConfirmTemplate] = useState<(typeof TEMPLATES)[number] | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Trap focus inside modal
  useEffect(() => {
    textareaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const applyTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    if (tpl.id === "custom") {
      if (text.trim() && hasSaved) {
        setConfirmTemplate(tpl);
        return;
      }
      setText("");
      textareaRef.current?.focus();
      return;
    }
    const built = tpl.build(firstName);
    if (text.trim() && text.trim() !== built) {
      setConfirmTemplate(tpl);
    } else {
      setText(built);
    }
  };

  const confirmApply = () => {
    if (!confirmTemplate) return;
    const built = confirmTemplate.build(firstName);
    setText(built);
    setConfirmTemplate(null);
    if (!built) textareaRef.current?.focus();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const indRef = doc(db, "individuals", individual.id);
      const trimmed = text.trim();
      const prevVersion = savedPrompt?.version ?? 0;

      if (!trimmed) {
        // Clear the prompt
        await updateDoc(indRef, { companion_prompt: null });
        // Audit log
        await addDoc(collection(db, "audit_log"), {
          organizationId,
          individualId: individual.id,
          userId: currentUserId,
          userName: currentUserName,
          action: "companion_prompt_cleared",
          description: `AI Companion instructions cleared for ${firstName} by ${currentUserName}.`,
          timestamp: serverTimestamp(),
        });
        toast.success(`Companion instructions cleared for ${firstName}. Default behavior will be used.`);
      } else {
        await updateDoc(indRef, {
          companion_prompt: {
            content: trimmed,
            lastUpdatedBy: currentUserId,
            lastUpdatedAt: serverTimestamp(),
            version: prevVersion + 1,
          },
        });
        // Audit log
        await addDoc(collection(db, "audit_log"), {
          organizationId,
          individualId: individual.id,
          userId: currentUserId,
          userName: currentUserName,
          action: "companion_prompt_updated",
          description: `AI Companion instructions updated for ${firstName} by ${currentUserName}.`,
          timestamp: serverTimestamp(),
        });
        toast.success(`Companion instructions saved for ${firstName}.`);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error("Failed to save companion prompt:", err);
      toast.error("Failed to save instructions. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const chars = text.length;
  const overLimit = chars > MAX_CHARS;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      >
        {/* Modal */}
        <div className="relative w-full max-w-xl bg-icm-panel border border-icm-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-icm-border flex items-start justify-between gap-3 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <h2 className="font-manrope font-bold text-[14px] text-icm-text">
                  AI Companion Instructions
                </h2>
              </div>
              <p className="text-[11.5px] font-geist text-icm-text-dim leading-snug pl-8">
                {hasSaved && savedPrompt?.lastUpdatedAt ? (
                  <>
                    Last updated{" "}
                    <span className="text-icm-text font-medium">
                      {relativeTime(savedPrompt.lastUpdatedAt)}
                    </span>{" "}
                    — private, never shown to {firstName}.
                  </>
                ) : (
                  <>
                    These instructions tell the AI how to interact with{" "}
                    <span className="font-semibold text-icm-text">{firstName}</span>.
                    Private — never shown to {firstName}.
                  </>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg border border-icm-border bg-icm-bg hover:bg-icm-panel flex items-center justify-center text-icm-text-dim hover:text-icm-text transition-colors shrink-0 mt-0.5"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 overflow-y-auto space-y-4 flex-1">
            {/* Template chips */}
            <div>
              <p className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide mb-2">
                Start from a template
              </p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11.5px] font-geist font-semibold border border-icm-border bg-icm-bg text-icm-text-dim hover:border-purple-500/40 hover:text-purple-500 hover:bg-purple-500/5 transition-colors"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide">
                  Custom instructions
                </p>
                <span
                  className={`text-[10.5px] font-geist tabular-nums ${
                    overLimit ? "text-red-500 font-semibold" : "text-icm-text-faint"
                  }`}
                >
                  {chars.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS + 50))}
                rows={8}
                className={`w-full resize-y rounded-xl border px-3.5 py-3 text-[12.5px] font-geist text-icm-text bg-icm-bg placeholder:text-icm-text-faint focus:outline-none focus:ring-2 transition-colors leading-relaxed ${
                  overLimit
                    ? "border-red-500/60 focus:ring-red-500/30"
                    : "border-icm-border focus:ring-purple-500/30 focus:border-purple-500/50"
                }`}
                placeholder={`Describe how the AI companion should interact with ${firstName}...\n\nExamples:\n• Topics to focus on (goals, health, daily routine)\n• Communication style (simple language, upbeat tone)\n• Things to ask about each session\n• What to report back to the case manager\n• Topics to avoid`}
              />
              {overLimit && (
                <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Please keep instructions under {MAX_CHARS.toLocaleString()} characters.
                </p>
              )}
            </div>

            {/* Preview banner */}
            <div className="rounded-xl bg-icm-bg border border-icm-border px-3.5 py-2.5 flex items-start gap-2.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
              <p className="text-[11.5px] font-geist text-icm-text-dim leading-relaxed">
                When{" "}
                <span className="font-semibold text-icm-text">{firstName}</span>{" "}
                opens their companion link, the AI will follow these instructions.
                The instructions are never shown to {firstName}.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-icm-border flex items-center justify-between gap-3 shrink-0 bg-icm-panel">
            {/* Left side: Clear + Reset to Default */}
            <div className="flex items-center gap-2">
              {text.trim() && (
                <button
                  onClick={() => setText("")}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-geist font-semibold border border-icm-border bg-icm-bg text-icm-text-dim hover:text-icm-red hover:border-icm-red/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
              <button
                onClick={() => {
                  if (text.trim() && text.trim() !== DEFAULT_PROMPT_TEXT) {
                    setConfirmReset(true);
                  } else {
                    setText(DEFAULT_PROMPT_TEXT);
                    toast.info("Default instructions loaded. Click Save to apply.");
                  }
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-geist font-semibold border border-icm-border bg-icm-bg text-icm-text-dim hover:text-purple-500 hover:border-purple-500/40 transition-colors"
              >
                Reset to Default
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="h-8 px-3.5 rounded-lg text-[12px] font-geist font-semibold border border-icm-border bg-icm-bg text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || overLimit || text === (savedPrompt?.content ?? "")}
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-[12px] font-geist font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Instructions"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Template-replace confirmation dialog */}
      {confirmTemplate && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-icm-panel border border-icm-border rounded-2xl shadow-2xl p-5 max-w-sm w-full">
            <h3 className="font-manrope font-bold text-[13.5px] text-icm-text mb-1.5">
              Replace current instructions?
            </h3>
            <p className="text-[12px] font-geist text-icm-text-dim mb-4 leading-relaxed">
              This will replace your current instructions with the "
              {confirmTemplate.label}" template. Your current text will be lost.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmTemplate(null)}
                className="h-8 px-3 rounded-lg text-[12px] font-geist font-semibold border border-icm-border text-icm-text-dim hover:text-icm-text transition-colors"
              >
                Keep mine
              </button>
              <button
                onClick={confirmApply}
                className="h-8 px-4 rounded-lg text-[12px] font-geist font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset to Default confirmation dialog */}
      {confirmReset && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-icm-panel border border-icm-border rounded-2xl shadow-2xl p-5 max-w-sm w-full">
            <h3 className="font-manrope font-bold text-[13.5px] text-icm-text mb-1.5">
              Replace with default instructions?
            </h3>
            <p className="text-[12px] font-geist text-icm-text-dim mb-4 leading-relaxed">
              This will replace your custom instructions with the system default companion prompt. You can still edit it before saving.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmReset(false)}
                className="h-8 px-3 rounded-lg text-[12px] font-geist font-semibold border border-icm-border text-icm-text-dim hover:text-icm-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setText(DEFAULT_PROMPT_TEXT);
                  setConfirmReset(false);
                  toast.info("Default instructions loaded. Click Save to apply.");
                }}
                className="h-8 px-4 rounded-lg text-[12px] font-geist font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                Yes, reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main card component ─────────────────────────────────────────────────────
export function CompanionLinkCard({ individual, individualId }: CompanionLinkCardProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const isActive = individual.companion_link_active === true;
  const token = individual.companion_token;
  const companionUrl = isActive && token ? `${BASE_URL}/${token}` : null;
  const hasCustomPrompt = !!(individual.companion_prompt?.content);
  const firstName = individual.preferred_name || individual.first_name;

  // Derive user name safely
  const currentUserName = (currentUser as unknown as { displayName?: string })?.displayName ?? "Case Manager";
  const organizationId = individual.organizationId ?? "";

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
    <>
      <div className="rounded-2xl border border-icm-border bg-icm-panel overflow-hidden">
        {/* Header — clicking anywhere on it also toggles collapse */}
        <div
          className="px-4 py-3 border-b border-icm-border flex items-center justify-between gap-3 cursor-pointer select-none"
          onClick={() => setCollapsed((c) => !c)}
        >
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div
              className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center cursor-pointer"
              onClick={() => setCollapsed((c) => !c)}
            >
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

          {/* Right side: status pill + transcripts + collapse toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Stop propagation so these buttons don't trigger collapse */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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

            {/* Collapse chevron */}
            <button
              onClick={(e) => { e.stopPropagation(); setCollapsed((c) => !c); }}
              title={collapsed ? "Expand" : "Collapse"}
              className="w-7 h-7 rounded-lg border border-icm-border bg-icm-bg hover:bg-icm-panel flex items-center justify-center text-icm-text-dim hover:text-icm-text transition-colors"
            >
              <ChevronDown
                className="w-3.5 h-3.5 transition-transform duration-200"
                style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
              />
            </button>
          </div>
        </div>

        {/* Collapsible body */}
        <div
          ref={bodyRef}
          style={{
            maxHeight: collapsed ? 0 : "600px",
            overflow: "hidden",
            transition: "max-height 0.22s ease",
          }}
        >
          <div className="px-4 py-3 space-y-3">
            {/* Description */}
            <p className="text-[12px] font-geist text-icm-text-dim leading-relaxed">
              Generate a secure link your client can use to have daily check-in conversations with the AI companion.
              The link is private and unique to{" "}
              <span className="text-icm-text font-semibold">{firstName}</span>.
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
            {/* Generate New Link */}
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

            {/* Deactivate Link */}
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

            {/* Copy Link */}
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

            {/* Customize Prompt */}
            <button
              onClick={() => setShowPromptModal(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-geist font-semibold border border-icm-border bg-icm-bg text-icm-text-dim hover:text-purple-500 hover:border-purple-500/40 transition-colors relative"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Customize Prompt
              {hasCustomPrompt && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Custom prompt active" />
              )}
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Prompt Modal */}
      {showPromptModal && (
        <PromptModal
          individual={individual}
          onClose={() => setShowPromptModal(false)}
          onSaved={() => setShowPromptModal(false)}
          currentUserName={currentUserName}
          currentUserId={currentUser?.uid ?? ""}
          organizationId={organizationId}
        />
      )}
    </>
  );
}
