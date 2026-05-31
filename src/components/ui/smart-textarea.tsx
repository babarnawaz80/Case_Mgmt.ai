import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Mic, MicOff, Loader2, Wand2, ChevronDown, Check, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";

// ─── Web Speech API typings (browsers expose this globally) ─────────────────
type SpeechRecognitionAlt = any;
const getSpeechRecognition = (): SpeechRecognitionAlt | null => {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

const LANGUAGES: { code: string; label: string }[] = [
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

const REWRITE_ACTIONS: { id: string; label: string; description: string }[] = [
  { id: "translate",    label: "🌐 Translate to English", description: "Translate any language into English" },
  { id: "improve",      label: "Improve writing",       description: "Tighten phrasing and clarity" },
  { id: "professional", label: "Make more professional", description: "Clinical, audit-ready tone" },
  { id: "concise",      label: "Make concise",           description: "Cut filler, keep meaning" },
  { id: "expand",       label: "Expand & add detail",    description: "Add structure and specifics" },
  { id: "grammar",      label: "Fix grammar & spelling", description: "Correct mechanics only" },
  { id: "soap",         label: "Convert to SOAP format", description: "Subjective / Objective / Assessment / Plan" },
];
// AI rewrite calls are handled server-side. The frontend must NOT call Gemini directly.

const REWRITE_PROMPTS: Record<string, string> = {
  translate:    "Translate the following text into English. Preserve all clinical meaning, names, dates, numbers, and details exactly. If the text is already entirely in English, return it unchanged. Return ONLY the English translation — no notes, no explanations, no original-language text.",
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

export interface SmartTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  smartLabel?: string;
  toolbarPosition?: "top" | "bottom";
  /** disable AI/mic toolbar entirely (falls back to plain textarea styling) */
  noSmart?: boolean;
}

export const SmartTextarea = React.forwardRef<HTMLTextAreaElement, SmartTextareaProps>(
  ({ value, onChange, className, smartLabel, toolbarPosition = "bottom", noSmart, placeholder, ...props }, ref) => {
    const [showRewrite, setShowRewrite] = useState(false);
    const [showLang, setShowLang] = useState(false);
    const [lang, setLang] = useState<string>(() => {
      try { return localStorage.getItem("cm_ai_dictation_lang") || "en-US"; } catch { return "en-US"; }
    });
    const [isRecording, setIsRecording] = useState(false);
    const [isRewriting, setIsRewriting] = useState(false);
    const [interim, setInterim] = useState("");
    const recognitionRef = useRef<any>(null);
    const baseTextRef = useRef("");
    const rewriteRef = useRef<HTMLDivElement>(null);
    const langRef = useRef<HTMLDivElement>(null);

    // close popovers on outside click
    useEffect(() => {
      const onDoc = (e: MouseEvent) => {
        if (rewriteRef.current && !rewriteRef.current.contains(e.target as Node)) setShowRewrite(false);
        if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLang(false);
      };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const stopRecording = useCallback(() => {
      try { recognitionRef.current?.stop(); } catch {}
      setIsRecording(false);
      setInterim("");
    }, []);

    const startRecording = useCallback(() => {
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
      baseTextRef.current = value;
      rec.onresult = (event: any) => {
        let finalChunk = "";
        let interimChunk = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) finalChunk += r[0].transcript;
          else interimChunk += r[0].transcript;
        }
        if (finalChunk) {
          baseTextRef.current = (baseTextRef.current + " " + finalChunk).replace(/\s+/g, " ").trim();
          onChange(baseTextRef.current);
          setInterim("");
        } else {
          setInterim(interimChunk);
          onChange((baseTextRef.current + " " + interimChunk).replace(/\s+/g, " ").trim());
        }
      };
      rec.onerror = (e: any) => {
        if (e.error === "not-allowed") {
          toast.error("Microphone access denied", { description: "Enable mic permission in your browser." });
        } else if (e.error !== "aborted" && e.error !== "no-speech") {
          toast.error(`Dictation error: ${e.error}`);
        }
        setIsRecording(false);
        setInterim("");
      };
      rec.onend = () => {
        setIsRecording(false);
        setInterim("");
      };
      recognitionRef.current = rec;
      try {
        rec.start();
        setIsRecording(true);
        toast.success(`Listening · ${LANGUAGES.find((l) => l.code === lang)?.label || lang}`, {
          description: "Speak naturally — tap the mic again to stop.",
          duration: 2000,
        });
      } catch (err) {
        toast.error("Could not start dictation");
      }
    }, [lang, value, onChange]);

    const toggleRec = () => (isRecording ? stopRecording() : startRecording());

    const doRewrite = async (actionId: string) => {
      if (!value.trim()) {
        toast.error("Nothing to rewrite", { description: "Type or dictate some text first." });
        setShowRewrite(false);
        return;
      }
      setShowRewrite(false);
      setIsRewriting(true);
      try {
        const out = await callGeminiRewrite(value, actionId);
        onChange(out);
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

    useEffect(() => {
      try { localStorage.setItem("cm_ai_dictation_lang", lang); } catch {}
    }, [lang]);

    useEffect(() => () => { try { recognitionRef.current?.stop(); } catch {} }, []);

    const langLabel = LANGUAGES.find((l) => l.code === lang)?.label || lang;

    const toolbar = !noSmart && (
      <div className={cn(
        "flex items-center justify-between gap-2 px-2.5 py-1.5",
        toolbarPosition === "top"
          ? "border-b border-input rounded-t-md bg-muted/40"
          : "border-t border-input rounded-b-md bg-muted/40"
      )}>
        <div className="flex items-center gap-1.5">
          {/* Help Me Write */}
          <div className="relative" ref={rewriteRef}>
            <button
              type="button"
              onClick={() => { setShowRewrite((s) => !s); setShowLang(false); }}
              disabled={isRewriting}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition disabled:opacity-60"
            >
              {isRewriting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Help me write</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>
            {showRewrite && (
              <div className="absolute z-50 mt-1 left-0 w-64 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI rewrite</p>
                  <p className="text-[11px] text-slate-500">Rewrites your text below</p>
                </div>
                <div className="py-1">
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
            onClick={toggleRec}
            className={cn(
              "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-semibold transition",
              isRecording
                ? "bg-red-50 text-red-700 hover:bg-red-100 animate-pulse"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span>{isRecording ? "Stop" : "Dictate"}</span>
          </button>

          {/* Language */}
          <div className="relative" ref={langRef}>
            <button
              type="button"
              onClick={() => { setShowLang((s) => !s); setShowRewrite(false); }}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition"
              title="Dictation language"
            >
              <Globe2 className="w-3 h-3" />
              <span>{lang.split("-")[0].toUpperCase()}</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>
            {showLang && (
              <div className="absolute z-50 mt-1 left-0 w-52 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10">
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
        </div>

        <div className="text-[10.5px] text-slate-400 truncate hidden sm:block">
          {isRecording ? `● Listening · ${langLabel}` : smartLabel || `AI · ${langLabel}`}
        </div>
      </div>
    );

    return (
      <div className={cn("flex flex-col rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background", noSmart && "border-input")}>
        {toolbarPosition === "top" && toolbar}
        <textarea
          ref={ref}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "flex min-h-[100px] w-full bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-y",
            isRecording && "bg-red-50/30",
            className
          )}
          {...props}
        />
        {toolbarPosition === "bottom" && toolbar}
      </div>
    );
  }
);
SmartTextarea.displayName = "SmartTextarea";
