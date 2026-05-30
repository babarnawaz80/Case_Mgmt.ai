/**
 * TelevisitModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 1 Televisit experience. Two steps:
 *
 *   "select" — search and pick the individual
 *   "active" — live visit: timer, platform picker, meeting link, end button
 *
 * Clicking "End Visit & Document Notes" opens PostVisitDocModal.
 * No WebRTC / recording of the actual video call — Phase 1 only.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Video, X, Search, ArrowRight, PlayCircle,
  Clock, ExternalLink, Link2, StopCircle,
} from "lucide-react";
import { useIndividuals } from "@/hooks/useIndividuals";
import { useIndividual } from "@/hooks/useIndividuals";
import { PostVisitDocModal } from "./PostVisitDocModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TelevisitPlatform = "zoom" | "teams" | "meet";

const PLATFORM_CFG: Record<TelevisitPlatform, { label: string; url: string; color: string }> = {
  zoom:  { label: "Zoom",        url: "https://zoom.us/start/videomeeting", color: "bg-blue-600 hover:bg-blue-700 ring-blue-400" },
  teams: { label: "Teams",       url: "https://teams.microsoft.com",         color: "bg-indigo-600 hover:bg-indigo-700 ring-indigo-400" },
  meet:  { label: "Google Meet", url: "https://meet.google.com/new",          color: "bg-emerald-600 hover:bg-emerald-700 ring-emerald-400" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// ─── Individual Search Select (inline, minimal) ───────────────────────────────

function IndividualPicker({ onSelect }: { onSelect: (id: string, name: string) => void }) {
  const { individuals } = useIndividuals();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const active = individuals.filter((p) => p.enrollment_status === "active");
    if (!term) return active.slice(0, 50);
    return active
      .filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(term) || p.id.includes(term))
      .slice(0, 50);
  }, [individuals, q]);

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-icm-text-dim font-geist">
        Search for the individual you are meeting with.
      </p>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-icm-text-dim pointer-events-none" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name…"
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-icm-border bg-white text-[13px] font-geist focus:outline-none focus:ring-2 focus:ring-teal-400/50"
        />
      </div>
      <div className="max-h-[300px] overflow-y-auto rounded-xl border border-icm-border divide-y divide-icm-border">
        {list.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-icm-text-dim">No individuals found</div>
        )}
        {list.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id, `${p.last_name}, ${p.first_name}`)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-teal-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-[11px] font-bold shrink-0">
              {p.first_name[0]}{p.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-geist font-semibold text-icm-text truncate">
                {p.last_name}, {p.first_name}
              </p>
              <p className="text-[10.5px] text-icm-text-dim font-geist truncate">
                {[p.county, p.program].filter(Boolean).join(" · ")}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-teal-500 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Active Visit Panel ───────────────────────────────────────────────────────

function ActiveVisitPanel({
  individualId,
  individualName,
  visitDate,
  startTime,
  elapsed,
  platform,
  meetingLink,
  onPlatformSelect,
  onMeetingLinkChange,
  onEnd,
}: {
  individualId: string;
  individualName: string;
  visitDate: string;
  startTime: string;
  elapsed: number;
  platform: TelevisitPlatform | null;
  meetingLink: string;
  onPlatformSelect: (p: TelevisitPlatform) => void;
  onMeetingLinkChange: (v: string) => void;
  onEnd: () => void;
}) {
  const { individual } = useIndividual(individualId);

  return (
    <div className="space-y-5">
      {/* Individual card */}
      <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3">
        <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 font-bold text-[15px] flex items-center justify-center shrink-0">
          {individualName.split(",")[1]?.trim()[0] ?? ""}{individualName.split(",")[0]?.trim()[0] ?? ""}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-manrope font-extrabold text-[15px] text-icm-text truncate">{individualName}</p>
          {individual && (
            <p className="text-[11px] text-icm-text-dim font-geist truncate">
              {[individual.county, individual.program].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-geist text-icm-text-dim uppercase tracking-wide">Date</p>
          <p className="text-[12px] font-geist font-semibold text-icm-text">{visitDate}</p>
          <p className="text-[11px] font-geist text-icm-text-dim">{startTime}</p>
        </div>
      </div>

      {/* Live timer */}
      <div className="rounded-xl bg-icm-bg border border-icm-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-icm-text-dim">
          <Clock className="w-4 h-4" />
          <span className="text-[12px] font-geist">Visit duration</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          <span className="font-mono font-bold text-[22px] text-icm-text tracking-wider">
            {fmtElapsed(elapsed)}
          </span>
        </div>
      </div>

      {/* Platform picker */}
      <div className="space-y-2">
        <p className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide">
          Video Platform
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(["zoom","teams","meet"] as TelevisitPlatform[]).map((p) => {
            const cfg = PLATFORM_CFG[p];
            const active = platform === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  onPlatformSelect(p);
                  window.open(cfg.url, "_blank", "noopener,noreferrer");
                }}
                className={`h-10 rounded-xl text-[12px] font-geist font-semibold flex items-center justify-center gap-1.5 transition-all border-2 ${
                  active
                    ? `text-white ${cfg.color} ring-2 ring-offset-1 border-transparent`
                    : "border-icm-border text-icm-text hover:border-teal-400 bg-white"
                }`}
              >
                <ExternalLink className="w-3 h-3" />
                {cfg.label}
              </button>
            );
          })}
        </div>
        {platform && (
          <p className="text-[11px] text-teal-600 font-geist">
            ✓ {PLATFORM_CFG[platform].label} opened in a new tab
          </p>
        )}
      </div>

      {/* Optional meeting link */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide">
          Meeting Link (optional)
        </p>
        <div className="relative">
          <Link2 className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-icm-text-dim pointer-events-none" />
          <input
            value={meetingLink}
            onChange={(e) => onMeetingLinkChange(e.target.value)}
            placeholder="Paste your Zoom / Teams / Meet link…"
            className="w-full h-9 pl-8 pr-3 rounded-xl border border-icm-border bg-white text-[12.5px] font-geist focus:outline-none focus:ring-2 focus:ring-teal-400/50"
          />
        </div>
      </div>

      {/* End Visit button */}
      <button
        onClick={onEnd}
        className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-manrope font-bold text-[14px] flex items-center justify-center gap-2.5 transition-colors shadow-lg shadow-red-200"
      >
        <StopCircle className="w-5 h-5" />
        End Visit &amp; Document Notes
      </button>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface TelevisitModalProps {
  open: boolean;
  onClose: () => void;
  prefilledIndividualId?: string;
  prefilledIndividualName?: string;
}

export function TelevisitModal({
  open,
  onClose,
  prefilledIndividualId,
  prefilledIndividualName,
}: TelevisitModalProps) {
  const [step, setStep] = useState<"select" | "active">(
    prefilledIndividualId ? "active" : "select"
  );
  const [individualId,   setIndividualId]   = useState(prefilledIndividualId ?? "");
  const [individualName, setIndividualName] = useState(prefilledIndividualName ?? "");
  const [platform,   setPlatform]   = useState<TelevisitPlatform | null>(null);
  const [meetingLink, setMeetingLink] = useState("");

  // Timer
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsed,   setElapsed]   = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Post-visit doc modal state
  const [showPostVisit, setShowPostVisit] = useState(false);
  const [endedDuration, setEndedDuration] = useState(0);
  const [endedStartTime, setEndedStartTime] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  // Start timer when step becomes "active"
  useEffect(() => {
    if (step === "active" && !startedAt) {
      const now = new Date();
      setStartedAt(now);
      setEndedStartTime(nowHHMM());
      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  // Reset when opened with a prefill
  useEffect(() => {
    if (open && prefilledIndividualId) {
      setIndividualId(prefilledIndividualId);
      setIndividualName(prefilledIndividualName ?? "");
      setStep("active");
    } else if (open && !prefilledIndividualId) {
      setStep("select");
      setIndividualId("");
      setIndividualName("");
      setElapsed(0);
      setStartedAt(null);
      setPlatform(null);
      setMeetingLink("");
    }
  }, [open, prefilledIndividualId, prefilledIndividualName]);

  const handleIndividualSelect = useCallback((id: string, name: string) => {
    setIndividualId(id);
    setIndividualName(name);
    setStep("active");
  }, []);

  const handleEndVisit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setEndedDuration(elapsed);
    setShowPostVisit(true);
  }, [elapsed]);

  if (!open) return null;

  return (
    <>
      {/* Main modal */}
      {!showPostVisit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={onClose}
        >
          <div
            className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-icm-border bg-gradient-to-r from-teal-600 to-teal-500">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Video className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-manrope font-bold text-[15px] text-white">
                    {step === "select" ? "Start Televisit" : "Televisit in Progress"}
                  </h2>
                  <p className="text-[11px] text-white/70 font-geist">
                    {step === "select" ? "Who is this visit with?" : individualName}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {step === "select" ? (
                <IndividualPicker onSelect={handleIndividualSelect} />
              ) : (
                <ActiveVisitPanel
                  individualId={individualId}
                  individualName={individualName}
                  visitDate={today}
                  startTime={endedStartTime || nowHHMM()}
                  elapsed={elapsed}
                  platform={platform}
                  meetingLink={meetingLink}
                  onPlatformSelect={setPlatform}
                  onMeetingLinkChange={setMeetingLink}
                  onEnd={handleEndVisit}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post-visit documentation */}
      <PostVisitDocModal
        open={showPostVisit}
        onClose={() => {
          setShowPostVisit(false);
          onClose();
        }}
        individualId={individualId}
        individualName={individualName}
        visitDate={today}
        startTime={endedStartTime}
        durationSeconds={endedDuration}
        platform={platform}
        meetingLink={meetingLink}
      />
    </>
  );
}
