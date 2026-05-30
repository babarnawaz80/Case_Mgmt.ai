/**
 * PostVisitDocModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Post-visit documentation screen — opens after "End Visit & Document Notes".
 *
 * Features (Phase 1):
 *   • Visit header: individual, date, duration, platform
 *   • Voice summary section using Web Speech API (falls back to textarea)
 *   • AI extraction via Gemini proxy → pre-fills form fields
 *   • Standard Visit Summary form (simplified) — submits to Firestore
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  X, Mic, MicOff, Sparkles, Loader2, CheckCircle2,
  Clock, Video, StopCircle, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import type { TelevisitPlatform } from "./TelevisitModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_LABEL: Record<TelevisitPlatform, string> = {
  zoom:  "Zoom",
  teams: "Microsoft Teams",
  meet:  "Google Meet",
};

function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

function addMinutes(hhmm: string, minutes: number): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
}

const FUNCTIONS_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";

// ─── Speech recognition helpers ───────────────────────────────────────────────

declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

function getSpeechRecognition(): SpeechRecognition | null {
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
  if (!Ctor) return null;
  const r = new Ctor();
  r.continuous = true;
  r.interimResults = true;
  r.lang = "en-US";
  return r;
}

// ─── AI extraction via Gemini proxy ───────────────────────────────────────────

async function extractFromTranscript(
  transcript: string,
  individualName: string,
  visitDate: string
): Promise<{ summary: string; nextSteps: string; observations: string }> {
  const token = await auth.currentUser?.getIdToken();
  if (!token || !transcript.trim()) return { summary: "", nextSteps: "", observations: "" };

  const prompt = `You are a clinical documentation assistant. Extract key information from this visit transcript for a Home and Community-Based Services visit summary.

Individual: ${individualName}
Visit Date: ${visitDate}

Transcript:
${transcript}

Return a JSON object with these keys (all strings):
- summary: A professional 2-3 sentence narrative of the visit from a case management perspective
- nextSteps: Bullet-pointed next steps and follow-up actions mentioned
- observations: Clinical observations about the individual's status, wellbeing, and progress

Return ONLY the JSON object, no other text.`;

  try {
    const res = await fetch(`${FUNCTIONS_BASE}/api/gemini-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prompt, maxTokens: 512, temperature: 0.2 }),
    });
    if (!res.ok) throw new Error("AI request failed");
    const data = await res.json();
    const rawText: string = data.text ?? "";
    // Extract JSON from the response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { summary: rawText, nextSteps: "", observations: "" };
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary:      parsed.summary      ?? "",
      nextSteps:    parsed.nextSteps     ?? "",
      observations: parsed.observations  ?? "",
    };
  } catch {
    return { summary: transcript.slice(0, 800), nextSteps: "", observations: "" };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  individualId: string;
  individualName: string;
  visitDate: string;
  startTime: string;
  durationSeconds: number;
  platform: TelevisitPlatform | null;
  meetingLink: string;
}

export function PostVisitDocModal({
  open, onClose,
  individualId, individualName,
  visitDate, startTime, durationSeconds,
  platform, meetingLink,
}: Props) {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const endTime = addMinutes(startTime, Math.ceil(durationSeconds / 60));

  // ── Voice state ──────────────────────────────────────────────────────────
  const [isRecording,  setIsRecording]  = useState(false);
  const [transcript,   setTranscript]   = useState("");
  const [interimText,  setInterimText]  = useState("");
  const [speechAvail,  setSpeechAvail]  = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // ── AI extraction state ───────────────────────────────────────────────────
  const [extracting, setExtracting] = useState(false);
  const [extracted,  setExtracted]  = useState(false);

  // ── Form state ────────────────────────────────────────────────────────────
  const [purposeOfSupport, setPurposeOfSupport] = useState(
    platform ? `Televisit / Video Call via ${PLATFORM_LABEL[platform]}` : "Televisit / Video Call"
  );
  const [visitSummary,  setVisitSummary]  = useState("");
  const [nextSteps,     setNextSteps]     = useState("");
  const [observations,  setObservations]  = useState("");
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSpeechAvail(!!(window.SpeechRecognition ?? window.webkitSpeechRecognition));
  }, []);

  const startRecording = useCallback(() => {
    const r = getSpeechRecognition();
    if (!r) return;
    recognitionRef.current = r;
    r.onresult = (e) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      setTranscript(final);
      setInterimText(interim);
    };
    r.onend = () => { setIsRecording(false); setInterimText(""); };
    r.onerror = () => { setIsRecording(false); toast.error("Microphone error. Please check permissions."); };
    r.start();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setInterimText("");
  }, []);

  const handleExtract = useCallback(async () => {
    const fullText = transcript + interimText;
    if (!fullText.trim()) { toast.error("No transcript to extract from. Record something first."); return; }
    setExtracting(true);
    try {
      const result = await extractFromTranscript(fullText, individualName, visitDate);
      if (result.summary)       setVisitSummary(result.summary);
      if (result.nextSteps)     setNextSteps(result.nextSteps);
      if (result.observations)  setObservations(result.observations);
      setExtracted(true);
      toast.success("AI extracted key information from your recording.");
    } catch {
      toast.error("AI extraction failed. You can fill in the form manually.");
    } finally {
      setExtracting(false);
    }
  }, [transcript, interimText, individualName, visitDate]);

  const handleSubmit = useCallback(async () => {
    if (!userProfile?.organizationId || !individualId) return;
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, "visit_summaries"), {
        individual_id:      individualId,
        individual_name:    individualName,
        visit_date:         visitDate,
        start_time:         startTime,
        end_time:           endTime,
        duration_seconds:   durationSeconds,
        location:           "Virtual",
        contact_type:       "Televisit / Video Call",
        platform:           platform ? PLATFORM_LABEL[platform] : "Video Call",
        meeting_link:       meetingLink || "",
        purpose_of_support: purposeOfSupport,
        what_went_well:     visitSummary,
        next_steps:         nextSteps,
        additional_observations: observations,
        next_visit_date:    nextVisitDate,
        voice_transcript:   transcript,
        status:             "draft",
        author_uid:         userProfile.uid ?? "",
        author_name:        userProfile.displayName ?? "",
        updated_by:         userProfile.displayName ?? "",
        updated_on:         new Date().toLocaleDateString(),
        organizationId:     userProfile.organizationId,
        createdAt:          serverTimestamp(),
        updatedAt:          serverTimestamp(),
      });
      toast.success("Visit summary saved as draft — redirecting to review…");
      onClose();
      navigate(`/people/${individualId}/visit-summary/${docRef.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [
    userProfile, individualId, individualName, visitDate, startTime, endTime,
    durationSeconds, platform, meetingLink, purposeOfSupport, visitSummary,
    nextSteps, observations, nextVisitDate, transcript, onClose, navigate,
  ]);

  if (!open) return null;

  const fullTranscript = transcript + (interimText ? `[...${interimText}]` : "");

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-manrope font-bold text-[15px] text-white">Document Visit</h2>
                <p className="text-[11px] text-white/70 font-geist">{individualName}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Visit metadata chips */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Chip icon={<Clock className="w-3 h-3" />} text={fmtDuration(durationSeconds)} />
            <Chip icon={<Video className="w-3 h-3" />} text={platform ? PLATFORM_LABEL[platform] : "Video Call"} />
            <Chip icon={null} text={visitDate} />
            {startTime && <Chip icon={null} text={`${startTime}${endTime ? ` – ${endTime}` : ""}`} />}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* ── Voice Summary Section ──────────────────────────────────────── */}
          <section className="rounded-xl border border-icm-border bg-icm-bg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-manrope font-bold text-[14px] text-icm-text">Speak Your Visit Summary</h3>
              {!speechAvail && (
                <span className="text-[10.5px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Use text fallback
                </span>
              )}
            </div>

            {speechAvail ? (
              <div className="space-y-3">
                {/* Big mic button */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`mx-auto flex items-center justify-center gap-2 h-14 px-8 rounded-2xl font-manrope font-bold text-[14px] transition-all ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200 animate-pulse"
                      : "bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-200"
                  }`}
                >
                  {isRecording ? (
                    <><MicOff className="w-5 h-5" /> Stop Recording</>
                  ) : (
                    <><Mic className="w-5 h-5" /> Tap to Record</>
                  )}
                </button>

                {/* Live transcript */}
                {(fullTranscript || isRecording) && (
                  <div className="rounded-xl border border-icm-border bg-white p-3 min-h-[80px] text-[12.5px] font-geist text-icm-text leading-relaxed">
                    {fullTranscript || (
                      <span className="text-icm-text-faint">Listening…</span>
                    )}
                  </div>
                )}

                {/* AI Extract button */}
                {transcript && !isRecording && (
                  <button
                    type="button"
                    onClick={handleExtract}
                    disabled={extracting}
                    className="w-full h-9 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[12.5px] font-geist font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
                  >
                    {extracting ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> AI is processing…</>
                    ) : extracted ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Re-extract with AI</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5" /> Extract Key Information with AI</>
                    )}
                  </button>
                )}
              </div>
            ) : (
              /* Textarea fallback when SpeechRecognition not available */
              <div className="space-y-2">
                <p className="text-[11.5px] text-icm-text-dim font-geist">
                  Your browser doesn't support live transcription. Type your visit summary below.
                </p>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={4}
                  placeholder="Type your visit summary here…"
                  className="w-full rounded-xl border border-icm-border bg-white px-3 py-2 text-[13px] font-geist resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                />
                {transcript && (
                  <button
                    type="button"
                    onClick={handleExtract}
                    disabled={extracting}
                    className="w-full h-9 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[12.5px] font-geist font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
                  >
                    {extracting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</> : <><Sparkles className="w-3.5 h-3.5" /> Extract with AI</>}
                  </button>
                )}
              </div>
            )}
          </section>

          {/* ── Pre-filled Visit Summary Form ─────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-manrope font-bold text-[14px] text-icm-text">Visit Summary</h3>
              {extracted && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-geist font-semibold">
                  ✦ AI suggested
                </span>
              )}
            </div>

            <FormField label="Contact Type" required>
              <div className="w-full h-9 rounded-lg border border-icm-border bg-icm-bg px-3 flex items-center text-[13px] font-geist text-icm-text-dim">
                Televisit / Video Call {platform ? `(${PLATFORM_LABEL[platform]})` : ""}
              </div>
            </FormField>

            <FormField label="Purpose of Support" required>
              <textarea
                value={purposeOfSupport}
                onChange={(e) => setPurposeOfSupport(e.target.value)}
                rows={2}
                className={taCls}
              />
            </FormField>

            <FormField label="Visit Summary / What went well" aiLabel={extracted}>
              <textarea value={visitSummary} onChange={(e) => setVisitSummary(e.target.value)} rows={3} className={taCls} placeholder="Narrative summary of the visit…" />
            </FormField>

            <FormField label="Observations" aiLabel={extracted}>
              <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} className={taCls} placeholder="Individual's status, mood, wellbeing…" />
            </FormField>

            <FormField label="Next Steps / Follow-up" aiLabel={extracted}>
              <textarea value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} rows={2} className={taCls} placeholder="Planned actions and follow-ups…" />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Next Visit Date">
                <input type="date" value={nextVisitDate} onChange={(e) => setNextVisitDate(e.target.value)} className={inputCls} />
              </FormField>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-icm-border bg-icm-bg shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-icm-border text-[13px] font-geist text-icm-text-dim hover:bg-icm-border/30">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !purposeOfSupport}
            className="h-9 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-geist font-semibold flex items-center gap-2 disabled:opacity-60 transition-colors"
          >
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Save &amp; Review</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Chip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-white/20 text-white text-[11px] font-geist px-2 py-0.5 rounded-full">
      {icon}{text}
    </span>
  );
}

function FormField({
  label, required, aiLabel, children,
}: {
  label: string; required?: boolean; aiLabel?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide mb-1">
        {label}
        {required && <span className="text-icm-red">*</span>}
        {aiLabel && <span className="text-[9.5px] normal-case tracking-normal px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">✦ AI</span>}
      </span>
      {children}
    </label>
  );
}

const taCls = "w-full rounded-lg border border-icm-border bg-white px-3 py-2 text-[13px] font-geist resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/50";
const inputCls = "w-full h-9 rounded-lg border border-icm-border bg-white px-3 text-[13px] font-geist focus:outline-none focus:ring-2 focus:ring-teal-400/50";
