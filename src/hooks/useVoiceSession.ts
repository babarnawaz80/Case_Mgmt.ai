import { useState, useRef, useCallback, useEffect } from "react";
import { auth } from "@/lib/firebase";

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";

const VOICE_PROXY_URL = "wss://us-central1-casemanagement-ai.cloudfunctions.net/voiceProxy";

// PCM16 audio worklet processor (inline as a blob URL)
const WORKLET_CODE = `
class PCM16Processor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    const pcm = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      pcm[i] = Math.max(-32768, Math.min(32767, Math.round(input[i] * 32767)));
    }
    this.port.postMessage(pcm.buffer, [pcm.buffer]);
    return true;
  }
}
registerProcessor("pcm16-processor", PCM16Processor);
`;

export interface VoiceTurn {
  role: "user" | "assistant";
  text: string;
  isVoice: true;
}

interface UseVoiceSessionOptions {
  onTranscriptTurn: (turn: VoiceTurn) => void;
  onError: (msg: string) => void;
}

export function useVoiceSession({ onTranscriptTurn, onError }: UseVoiceSessionOptions) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isSupported, setIsSupported] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const pendingUserTextRef = useRef("");
  const pendingAITextRef = useRef("");
  // Keep a ref to voiceState for use inside closures
  const voiceStateRef = useRef<VoiceState>("idle");

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    // Check browser support
    if (!window.AudioContext || !navigator.mediaDevices?.getUserMedia) {
      setIsSupported(false);
    }
  }, []);

  const stopPlayback = useCallback(() => {
    currentSourceRef.current?.stop();
    currentSourceRef.current = null;
    playQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  const playNextChunk = useCallback(() => {
    if (!audioContextRef.current || playQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      // Auto-return to listening when done speaking
      setVoiceState("listening");
      return;
    }
    isPlayingRef.current = true;
    const buffer = playQueueRef.current.shift()!;
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    currentSourceRef.current = source;
    source.onended = () => playNextChunk();
    source.start();
  }, []);

  const enqueueAudio = useCallback((pcmData: ArrayBuffer) => {
    if (!audioContextRef.current) return;
    // Gemini returns PCM16 @ 24000 Hz mono
    const samples = new Int16Array(pcmData);
    const float32 = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      float32[i] = samples[i] / 32768;
    }
    const buffer = audioContextRef.current.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);
    playQueueRef.current.push(buffer);
    if (!isPlayingRef.current) {
      setVoiceState("speaking");
      playNextChunk();
    }
  }, [playNextChunk]);

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    workletNodeRef.current?.disconnect();
    audioContextRef.current?.close();
    stopPlayback();
    streamRef.current = null;
    workletNodeRef.current = null;
    audioContextRef.current = null;
  }, [stopPlayback]);

  const startSession = useCallback(async () => {
    if (!isSupported) {
      onError("Voice chat requires Chrome, Edge, or Safari 16+.");
      return;
    }

    try {
      // Request mic permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Get auth token
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        onError("Not signed in.");
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      // Open WebSocket
      const ws = new WebSocket(`${VOICE_PROXY_URL}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = async () => {
        setVoiceState("listening");

        // Set up AudioContext + worklet
        const ctx = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = ctx;

        // Load inline worklet
        const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
        const blobUrl = URL.createObjectURL(blob);
        await ctx.audioWorklet.addModule(blobUrl);
        URL.revokeObjectURL(blobUrl);

        const source = ctx.createMediaStreamSource(stream);
        const worklet = new AudioWorkletNode(ctx, "pcm16-processor");
        workletNodeRef.current = worklet;

        worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
          if (ws.readyState === WebSocket.OPEN) {
            // Send audio chunk to Gemini via proxy
            const msg = JSON.stringify({
              realtime_input: {
                media_chunks: [{
                  data: btoa(String.fromCharCode(...new Uint8Array(e.data))),
                  mime_type: "audio/pcm;rate=16000",
                }],
              },
            });
            ws.send(msg);
          }
        };

        source.connect(worklet);
        worklet.connect(ctx.destination); // needed to keep worklet active
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const raw = typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data as ArrayBuffer);
          const msg = JSON.parse(raw);

          // Handle setup complete
          if (msg.setupComplete) return;

          // Handle server content
          const sc = msg.serverContent;
          if (!sc) return;

          // Extract text transcript
          const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> =
            sc.modelTurn?.parts ?? [];
          for (const part of parts) {
            if (part.text) {
              pendingAITextRef.current += part.text;
            }
            // Extract audio
            if (part.inlineData?.mimeType?.startsWith("audio/")) {
              const binary = atob(part.inlineData.data);
              const buf = new ArrayBuffer(binary.length);
              const view = new Uint8Array(buf);
              for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
              enqueueAudio(buf);
            }
          }

          // Handle user speech transcript
          const inputTranscript = sc.inputTranscript as { text?: string } | undefined;
          if (inputTranscript?.text) {
            pendingUserTextRef.current += inputTranscript.text;
          }

          // On turn complete: flush text to chat
          if (sc.turnComplete) {
            if (pendingUserTextRef.current.trim()) {
              onTranscriptTurn({ role: "user", text: pendingUserTextRef.current.trim(), isVoice: true });
              pendingUserTextRef.current = "";
            }
            if (pendingAITextRef.current.trim()) {
              onTranscriptTurn({ role: "assistant", text: pendingAITextRef.current.trim(), isVoice: true });
              pendingAITextRef.current = "";
            }
          }
        } catch { /* binary or parse error — skip */ }
      };

      ws.onerror = () => {
        setVoiceState("error");
        onError("Voice chat is temporarily unavailable. Try again in a moment.");
        setTimeout(() => setVoiceState("idle"), 3000);
      };

      ws.onclose = (event: CloseEvent) => {
        if (event.code === 1000 && event.reason.includes("timeout")) {
          onError("Voice session ended after 10 minutes. Tap the mic to start a new one.");
        } else if (event.code !== 1000 && voiceStateRef.current !== "idle") {
          onError("Connection lost. Tap mic to reconnect.");
        }
        setVoiceState("idle");
        cleanup();
      };
    } catch (err: unknown) {
      const domErr = err as { name?: string };
      if (domErr.name === "NotAllowedError" || domErr.name === "PermissionDeniedError") {
        onError("Microphone access needed. Enable in browser settings.");
      } else if (domErr.name === "NotFoundError") {
        onError("No microphone found. Please connect a microphone.");
      } else {
        onError("Could not access your microphone. Check if another app is using it.");
      }
      setVoiceState("idle");
    }
  }, [isSupported, onError, onTranscriptTurn, enqueueAudio, cleanup]);

  const interrupt = useCallback(() => {
    if (voiceState === "speaking") {
      stopPlayback();
      // Send interrupt signal to Gemini
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ client_content: { turn_complete: true } }));
      }
      setVoiceState("listening");
    }
  }, [voiceState, stopPlayback]);

  const endSession = useCallback(() => {
    wsRef.current?.close(1000, "User ended session");
    cleanup();
    setVoiceState("idle");
  }, [cleanup]);

  const toggleVoice = useCallback(() => {
    switch (voiceState) {
      case "idle":
        startSession();
        break;
      case "listening":
        endSession();
        break;
      case "speaking":
        interrupt();
        break;
      default:
        break;
    }
  }, [voiceState, startSession, endSession, interrupt]);

  return { voiceState, isSupported, toggleVoice, endSession, interrupt };
}
