import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Mic, MicOff, Loader2, Wand2, ChevronDown, Check, Globe2, X } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";

// ─── Web Speech API ─────────────────────────────────────────────────────────
const getSpeechRecognition = (): any => {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

const LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "es-ES", label: "Español" },
  { code: "es-MX", label: "Español (MX)" },
  { code: "fr-FR", label: "Français" },
  { code: "de-DE", label: "Deutsch" },
  { code: "it-IT", label: "Italiano" },
  { code: "pt-BR", label: "Português (BR)" },
  { code: "zh-CN", label: "中文 (简体)" },
  { code: "ja-JP", label: "日本語" },
  { code: "ko-KR", label: "한국어" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "ar-SA", label: "العربية" },
  { code: "ru-RU", label: "Русский" },
  { code: "vi-VN", label: "Tiếng Việt" },
  { code: "tl-PH", label: "Tagalog" },
];

const REWRITE_ACTIONS = [
  { id: "improve",      label: "Improve writing",        description: "Tighten phrasing and clarity" },
  { id: "professional", label: "Make more professional", description: "Clinical, audit-ready tone" },
  { id: "concise",      label: "Make concise",           description: "Cut filler, keep meaning" },
  { id: "expand",       label: "Expand & add detail",    description: "Add structure and specifics" },
  { id: "grammar",      label: "Fix grammar & spelling", description: "Correct mechanics only" },
  { id: "soap",         label: "Convert to SOAP format", description: "Subjective / Objective / Assessment / Plan" },
];

// AI rewrite calls are handled server-side. The frontend must NOT call Gemini directly.

const REWRITE_PROMPTS: Record<string, string> = {
  improve:      "Improve the clarity and readability of the following clinical case management note. Fix awkward phrasing, tighten sentences, and ensure professional language. Return ONLY the rewritten text, no explanations.",
  professional: "Rewrite the following text in a professional, clinical case management tone suitable for an official health record. Use third-person where appropriate (e.g. 'the individual' instead of 'he/she'), avoid informal language, and ensure it is audit-ready. Return ONLY the rewritten text, no explanations.",
  concise:      "Make the following clinical note more concise. Remove filler words, redundant phrases, and unnecessary detail while preserving all critical clinical information. Return ONLY the rewritten text, no explanations.",
  expand:       "Expand the following brief clinical note with appropriate clinical detail. Add structured context, document observations more thoroughly, and ensure it meets documentation standards for case management records. Return ONLY the expanded text, no explanations.",
  grammar:      "Fix only the grammar, spelling, and punctuation in the following text. Do NOT change the meaning, tone, or content. Return ONLY the corrected text, no explanations.",
  soap:         "Convert the following clinical note into SOAP format (Subjective, Objective, Assessment, Plan). Label each section clearly. Return ONLY the SOAP-formatted note, no explanations.",
};

// ─── AI rewrite via geminiProxy Cloud Function ────────────────────────────────
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
const GEMINI_PROXY_URL =
  "https://us-central1-casemanagement-ai.cloudfunctions.net/api/api/gemini-proxy";

async function callGeminiRewrite(text: string, action: string): Promise<string> {
  // Demo mode: simulate rewrite delay without an API call
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 700));
    return text;
  }

  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error("Not signed in. Please sign in and try again.");

  const systemPrompt =
    "You are a clinical documentation assistant for a healthcare case management platform. " +
    "Follow the instruction exactly. Return ONLY the rewritten text — no preamble, no labels, no explanations.";

  const prompt = `${REWRITE_PROMPTS[action] ?? REWRITE_PROMPTS.improve}\n\n---\n\n${text}`;

  const res = await fetch(GEMINI_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ prompt, systemPrompt, maxTokens: 4096, temperature: 0.3 }),
  });

  if (res.status === 401 || res.status === 403)
    throw new Error("Authentication failed. Please sign in again.");
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? "Rate limit reached. You can make up to 20 AI requests per hour.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `AI service error (HTTP ${res.status})`);
  }

  const data = await res.json();
  if (!data.text) throw new Error("AI service returned an empty response.");
  return data.text as string;
}

// Set a controlled <textarea> value in a way React notices.
function setNativeValue(el: HTMLTextAreaElement, value: string) {
  const proto = Object.getPrototypeOf(el);
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function isEligibleTextarea(el: Element | null): el is HTMLTextAreaElement {
  if (!(el instanceof HTMLTextAreaElement)) return false;
  if (el.disabled || el.readOnly) return false;
  if (el.dataset.noSmart === "true") return false;
  const rows = el.rows || 0;
  const minRows = 3;
  // also accept large textareas where rows wasn't set
  return rows >= minRows || el.clientHeight >= 70;
}

export default function SmartNoteAttacher() {
  const [target, setTarget] = useState<HTMLTextAreaElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [showRewrite, setShowRewrite] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [lang, setLang] = useState<string>(() => {
    try { return localStorage.getItem("cm_ai_dictation_lang") || "en-US"; } catch { return "en-US"; }
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const recRef = useRef<any>(null);
  const baseRef = useRef("");
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Track focus globally
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as Element | null;
      if (isEligibleTextarea(t)) setTarget(t);
    };
    const onFocusOut = (e: FocusEvent) => {
      // Delay so clicks inside toolbar don't dismiss
      setTimeout(() => {
        const active = document.activeElement;
        if (active === toolbarRef.current || toolbarRef.current?.contains(active as Node)) return;
        if (isEligibleTextarea(active)) return;
        // Stay open if user is interacting with our portal popovers
        const open = document.querySelector("[data-smart-popover='true']");
        if (open && open.contains(active as Node)) return;
        if (!isRecording) setTarget(null);
      }, 120);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [isRecording]);

  // Position toolbar above the textarea
  useEffect(() => {
    if (!target) { setPos(null); return; }
    const update = () => {
      const r = target.getBoundingClientRect();
      setPos({ top: r.top + window.scrollY - 38, left: r.left + window.scrollX, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    ro.observe(target);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, [target]);

  // Stop mic if target gone
  useEffect(() => {
    if (!target && isRecording) {
      try { recRef.current?.stop(); } catch {}
      setIsRecording(false);
    }
  }, [target, isRecording]);

  useEffect(() => {
    try { localStorage.setItem("cm_ai_dictation_lang", lang); } catch {}
  }, [lang]);

  const stopRec = useCallback(() => {
    try { recRef.current?.stop(); } catch {}
    setIsRecording(false);
  }, []);

  const startRec = useCallback(() => {
    if (!target) return;
    const SR = getSpeechRecognition();
    if (!SR) {
      toast.error("Voice dictation not supported in this browser", {
        description: "Try Chrome, Edge, or Safari on desktop.",
      });
      return;
    }
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = target.value;
    rec.onresult = (event: any) => {
      if (!target) return;
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalChunk += r[0].transcript;
        else interimChunk += r[0].transcript;
      }
      if (finalChunk) {
        baseRef.current = (baseRef.current + " " + finalChunk).replace(/\s+/g, " ").trim();
        setNativeValue(target, baseRef.current);
      } else {
        setNativeValue(target, (baseRef.current + " " + interimChunk).replace(/\s+/g, " ").trim());
      }
    };
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed") {
        toast.error("Microphone access denied", { description: "Enable mic permission in your browser." });
      } else if (e.error !== "aborted" && e.error !== "no-speech") {
        toast.error(`Dictation error: ${e.error}`);
      }
      setIsRecording(false);
    };
    rec.onend = () => setIsRecording(false);
    recRef.current = rec;
    try {
      rec.start();
      setIsRecording(true);
      const label = LANGUAGES.find((l) => l.code === lang)?.label || lang;
      toast.success(`Listening · ${label}`, {
        description: "Speak naturally — tap Stop when done.",
        duration: 2000,
      });
    } catch {
      toast.error("Could not start dictation");
    }
  }, [lang, target]);

  const doRewrite = async (actionId: string) => {
    if (!target) return;
    const current = target.value;
    if (!current.trim()) {
      toast.error("Nothing to rewrite", { description: "Type or dictate some text first." });
      setShowRewrite(false);
      return;
    }
    setShowRewrite(false);
    setIsRewriting(true);
    const el = target;
    try {
      const out = await callGeminiRewrite(current, actionId);
      setNativeValue(el, out);
      toast.success("Help Me Write applied", {
        description: REWRITE_ACTIONS.find((a) => a.id === actionId)?.label,
      });
    } catch (err: any) {
      console.error("AI rewrite failed:", err);
      toast.error("AI rewrite failed", {
        description: err.message || "Please check your connection and try again.",
      });
    } finally {
      setIsRewriting(false);
    }
  };

  if (!target || !pos) return null;

  const langLabel = LANGUAGES.find((l) => l.code === lang)?.label || lang;

  return createPortal(
    <div
      ref={toolbarRef}
      onMouseDown={(e) => e.preventDefault()} // keep textarea focus on click
      style={{ position: "absolute", top: pos.top, left: pos.left, width: pos.width, zIndex: 60 }}
      className="pointer-events-none"
    >
      <div className="pointer-events-auto inline-flex items-center gap-1 px-1.5 py-1 rounded-t-lg bg-white border border-b-0 border-slate-200 shadow-sm">
        {/* Help me write */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowRewrite((s) => !s); setShowLang(false); }}
            disabled={isRewriting}
            className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition disabled:opacity-60"
          >
            {isRewriting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            <span>Help me write</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-70" />
          </button>
          {showRewrite && (
            <div data-smart-popover="true" className="absolute z-[70] mt-1 left-0 w-64 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI rewrite</p>
                  <p className="text-[11px] text-slate-500">Rewrites the text in this field</p>
                </div>
                <button type="button" onClick={() => setShowRewrite(false)} className="p-0.5 rounded hover:bg-slate-100">
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              </div>
              <div className="py-1 max-h-72 overflow-y-auto">
                {REWRITE_ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => doRewrite(a.id)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 transition"
                  >
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-3 h-3 text-blue-500" />
                      <span className="text-[12px] font-semibold text-slate-800">{a.label}</span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 ml-5">{a.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mic */}
        <button
          type="button"
          onClick={() => (isRecording ? stopRec() : startRec())}
          className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-[11px] font-semibold transition ${
            isRecording
              ? "bg-red-50 text-red-700 hover:bg-red-100 animate-pulse"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {isRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
          <span>{isRecording ? "Stop" : "Dictate"}</span>
        </button>

        {/* Language */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowLang((s) => !s); setShowRewrite(false); }}
            className="inline-flex items-center gap-1 h-6 px-1.5 rounded-md text-[10.5px] font-medium text-slate-600 hover:bg-slate-100 transition"
            title="Dictation language"
          >
            <Globe2 className="w-3 h-3" />
            <span>{lang.split("-")[0].toUpperCase()}</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-70" />
          </button>
          {showLang && (
            <div data-smart-popover="true" className="absolute z-[70] mt-1 left-0 w-52 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10">
              <div className="px-3 py-2 border-b border-slate-100 sticky top-0 bg-white">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dictation language</p>
              </div>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => { setLang(l.code); setShowLang(false); }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[12px] text-slate-700 hover:bg-blue-50"
                >
                  <span>{l.label}</span>
                  {l.code === lang && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-[10px] text-slate-400 px-1 hidden md:inline">
          {isRecording ? `● Listening · ${langLabel}` : `AI · ${langLabel}`}
        </span>
      </div>
    </div>,
    document.body
  );
}
