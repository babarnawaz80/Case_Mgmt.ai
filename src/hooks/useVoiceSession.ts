/**
 * useVoiceSession
 * ─────────────────────────────────────────────────────────────────────────────
 * Browser-native voice input/output:
 *   • SpeechRecognition  — Chrome / Edge / Safari 16.4+
 *   • SpeechSynthesis    — all modern browsers
 *
 * The key fix over the previous version: startListening is stored in a ref so
 * closures (onend, onerror, setTimeout callbacks) always call the current
 * version without creating a circular useCallback dependency that Vite/Rollup
 * turns into a temporal-dead-zone crash after minification.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { auth } from "@/lib/firebase";

const FUNCTIONS_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";

export interface VoiceTurn {
  role: "user" | "assistant";
  text: string;
  isVoice: true;
}

interface UseVoiceSessionOptions {
  onFinalTranscript: (text: string) => void;
  onError: (msg: string) => void;
  onInterimTranscript?: (text: string) => void;
}

// ─── Browser detection ────────────────────────────────────────────────────────

function isSpeechSupported(): boolean {
  return !!(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) &&
    window.speechSynthesis
  );
}

function makeSpeechRecognition(): SpeechRecognition | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const r: SpeechRecognition = new Ctor();
  // continuous=true keeps the session open so the user can take their time
  // speaking — it won't cut them off mid-sentence.
  r.continuous      = true;
  r.interimResults  = true;
  r.lang            = "en-US";
  r.maxAlternatives = 1;
  return r;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceSession({
  onFinalTranscript,
  onError,
  onInterimTranscript,
}: UseVoiceSessionOptions) {
  const [voiceState, setVoiceState]   = useState<VoiceState>("idle");
  const [isSupported, setIsSupported] = useState(true);

  // ── Persistent refs (survive re-renders, safe inside closures) ──────────────
  const continuousRef       = useRef(false);
  const isSpeakingRef       = useRef(false);
  const recognitionRef      = useRef<SpeechRecognition | null>(null);
  const pendingTextRef      = useRef("");

  // Echo suppression: track the first words of what the AI just said and when
  // it finished. If the mic hears those same words within 4 seconds, it's room
  // echo from the speakers — discard it.
  const lastAIFingerprintRef = useRef("");   // first ~15 chars of last AI response
  const lastAISpokeMsRef     = useRef(0);    // timestamp when AI finished speaking

  // This ref holds the latest version of startListening so that callbacks
  // registered inside event handlers always call the current closure without
  // creating a circular useCallback dependency.
  const startListeningRef = useRef<() => void>(() => {});

  // Callbacks from props — keep in refs so event handlers don't go stale
  const onFinalRef   = useRef(onFinalTranscript);
  const onErrorRef   = useRef(onError);
  const onInterimRef = useRef(onInterimTranscript);
  useEffect(() => { onFinalRef.current   = onFinalTranscript; }, [onFinalTranscript]);
  useEffect(() => { onErrorRef.current   = onError;           }, [onError]);
  useEffect(() => { onInterimRef.current = onInterimTranscript; }, [onInterimTranscript]);

  useEffect(() => {
    setIsSupported(isSpeechSupported());
  }, []);

  // ── startListening (no deps — uses refs exclusively) ─────────────────────
  const startListening = useCallback(() => {
    if (!continuousRef.current) return;

    const r = makeSpeechRecognition();
    if (!r) return;
    recognitionRef.current = r;

    r.onstart = () => setVoiceState("listening");

    r.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }

      if (finalText.trim()) {
        const candidate = finalText.trim();

        // ── Echo suppression ────────────────────────────────────────────────
        // If the mic hears words that match the beginning of what the AI just
        // said, within 4 seconds of it finishing, it's room echo — drop it.
        const msSinceSpeaking = Date.now() - lastAISpokeMsRef.current;
        const fingerprint     = lastAIFingerprintRef.current;
        const isEcho =
          msSinceSpeaking < 4000 &&
          fingerprint.length >= 5 &&
          candidate.toLowerCase().startsWith(fingerprint);

        if (isEcho) {
          pendingTextRef.current = "";
          onInterimRef.current?.("");
          r.abort(); // restart cleanly
        } else {
          // Final result: store it and stop recognition so we can process
          pendingTextRef.current = candidate;
          onInterimRef.current?.(candidate);
          r.abort();
        }
      } else {
        // Interim: just update the live preview in the input box
        pendingTextRef.current = interim;
        onInterimRef.current?.(interim);
      }
    };

    r.onend = () => {
      const text = pendingTextRef.current.trim();
      pendingTextRef.current = "";
      onInterimRef.current?.("");

      if (text && continuousRef.current) {
        setVoiceState("processing");
        onFinalRef.current(text);
        // speakText() will restart listening after TTS finishes
      } else if (continuousRef.current && !isSpeakingRef.current) {
        // Silence/empty/echo-filtered — restart. Use longer gap if AI just spoke
        // so room echo doesn't get picked up on reopen.
        const gapMs = (Date.now() - lastAISpokeMsRef.current) < 2000 ? 900 : 300;
        setTimeout(() => startListeningRef.current(), gapMs);
      }
    };

    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (!continuousRef.current) return;
      if (e.error === "no-speech") {
        const gapMs = (Date.now() - lastAISpokeMsRef.current) < 2000 ? 900 : 300;
        setTimeout(() => startListeningRef.current(), gapMs);
        return;
      }
      if (e.error === "not-allowed") {
        onErrorRef.current("Microphone access needed. Enable in browser settings.");
        continuousRef.current = false;
        setVoiceState("idle");
        return;
      }
      if (e.error === "audio-capture") {
        onErrorRef.current("Could not access your microphone. Check if another app is using it.");
        continuousRef.current = false;
        setVoiceState("idle");
        return;
      }
      setTimeout(() => startListeningRef.current(), 400);
    };

    try { r.start(); } catch { /* already started */ }
  }, []); // ← zero deps: everything accessed via refs

  // Keep the ref in sync
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // ── startSession ─────────────────────────────────────────────────────────
  const startSession = useCallback(() => {
    if (!isSpeechSupported()) {
      onErrorRef.current("Voice requires Chrome, Edge, or Safari 16.4+.");
      return;
    }
    continuousRef.current = true;
    startListeningRef.current();
  }, []);

  // ── endSession ────────────────────────────────────────────────────────────
  const endSession = useCallback(() => {
    continuousRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current  = null;
    window.speechSynthesis.cancel();
    isSpeakingRef.current   = false;
    pendingTextRef.current  = "";
    onInterimRef.current?.("");
    setVoiceState("idle");
  }, []);

  // ── Gemini TTS via Cloud Function ────────────────────────────────────────
  // Called by speakText — returns true if Gemini audio was played,
  // false if the caller should fall back to browser SpeechSynthesis.
  const speakViaGemini = useCallback(async (text: string): Promise<boolean> => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return false;

      const res = await fetch(`${FUNCTIONS_BASE}/api/voice/speak`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ text, voice: "Kore" }),
        signal:  AbortSignal.timeout(12000), // 12s max
      });

      if (!res.ok) return false;

      const { audioData, mimeType } = await res.json();
      if (!audioData) return false;

      // Decode base64 and play via Audio element
      const binary = atob(audioData);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mimeType ?? "audio/wav" });
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);

      await new Promise<void>((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        audio.play().catch(() => resolve());
      });

      return true;
    } catch {
      return false;
    }
  }, []);

  // ── speakText: Gemini TTS → browser SpeechSynthesis fallback ─────────────
  const speakText = useCallback(async (text: string) => {
    if (!continuousRef.current || !text.trim()) return;

    // ── Stop the mic FIRST to prevent the AI's own voice looping back ────────
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    window.speechSynthesis.cancel();

    isSpeakingRef.current = true;
    setVoiceState("speaking");

    // Record echo fingerprint: first 15 lowercase chars of what we're about to say
    const firstWords = text.toLowerCase().replace(/[^a-z\s]/g, "").trim().slice(0, 15);
    lastAIFingerprintRef.current = firstWords;

    // First 4 sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    const spoken    = sentences.slice(0, 4).join(" ").trim();

    // Try Gemini TTS first
    const usedGemini = await speakViaGemini(spoken);

    if (!usedGemini) {
      // Fallback: browser SpeechSynthesis (worse quality but always available)
      const utt = new SpeechSynthesisUtterance(spoken);
      utt.rate  = 1.05;
      utt.lang  = "en-US";
      const voices    = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith("en") && !v.localService)
                     ?? voices.find(v => v.lang.startsWith("en"))
                     ?? null;
      if (preferred) utt.voice = preferred;

      await new Promise<void>((resolve) => {
        utt.onend   = () => resolve();
        utt.onerror = () => resolve();
        window.speechSynthesis.speak(utt);
      });
    }

    isSpeakingRef.current = false;
    lastAISpokeMsRef.current = Date.now(); // mark when AI finished

    if (continuousRef.current) {
      // 1200ms gap: gives room echo time to fully die out before mic opens.
      // The echo filter above provides a second layer of protection.
      setTimeout(() => startListeningRef.current(), 1200);
    }
  }, [speakViaGemini]); // speakViaGemini is stable (zero deps)

  // ── interrupt (stop TTS, go back to listening) ────────────────────────────
  const interrupt = useCallback(() => {
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    if (continuousRef.current) setTimeout(() => startListeningRef.current(), 100);
  }, []);

  // ── toggleVoice (main entry point from the mic button) ────────────────────
  const toggleVoice = useCallback(() => {
    if (!continuousRef.current) {
      startSession();
    } else if (isSpeakingRef.current) {
      interrupt();
    } else {
      endSession();
    }
  }, [startSession, interrupt, endSession]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      continuousRef.current = false;
      recognitionRef.current?.abort();
      window.speechSynthesis.cancel();
    };
  }, []);

  return { voiceState, isSupported, toggleVoice, endSession, speakText, interrupt };
}
