/**
 * PCPOrbAnimation.tsx
 * Full-screen orb animation for "Draft with AI" path (Step 4B).
 * Animates through processing steps with sequential reveals, 
 * then shows completion card.
 */
import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2, Sparkles, FileText, AlertTriangle } from "lucide-react";

interface PCPOrbAnimationProps {
  individualName: string;
  planType: string;
  effectiveDate: string;
  annualDate: string;
  onComplete: () => void;
  onLater: () => void;
}

interface Step {
  delay: number;       // ms when this step appears
  completedAt: number; // ms when it transitions to ✓
  text: string;
  completedText: string;
}

const ANIMATION_STEPS: Step[] = [
  { delay: 500,  completedAt: 2000,  text: "Loading chart data (Jan 12 – today)...", completedText: "Chart loaded — 847 data points found" },
  { delay: 3000, completedAt: 5000,  text: "Processing uploaded documents...", completedText: "Documents processed — prior goals, risks, and services extracted" },
  { delay: 6000, completedAt: 7000,  text: "Building Individual Profile Summary...", completedText: "Profile complete" },
  { delay: 7500, completedAt: 9000,  text: "Drafting Good Life vision from monitoring notes...", completedText: "Good Life section drafted" },
  { delay: 9500, completedAt: 11500, text: "Completing Focus Area Explorations...", completedText: "6 focus areas complete" },
  { delay: 12000,completedAt: 13500, text: "Importing and updating goals...", completedText: "3 goals imported, 1 new goal suggested" },
  { delay: 14000,completedAt: 15500, text: "Mapping health risks from HRST...", completedText: "2 risks documented with mitigation" },
  { delay: 16000,completedAt: 17500, text: "Building services table from authorizations...", completedText: "6 services added" },
  { delay: 18000,completedAt: 19000, text: "Assembling team and signatures...", completedText: "4 team members added" },
  { delay: 19500,completedAt: 21000, text: "Running compliance check — Maryland DDA v2.0...", completedText: "Compliance check complete — 0 hard stops, 2 items to review" },
  { delay: 21500,completedAt: 23000, text: "Finalizing document...", completedText: "PCP draft complete" },
];

const TOTAL_MS = 24000;

export function PCPOrbAnimation({
  individualName,
  planType,
  effectiveDate,
  annualDate,
  onComplete,
  onLater,
}: PCPOrbAnimationProps) {
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const startRef = useRef(Date.now());
  const rafRef = useRef<number>(0);

  // Format display name: "Brown, Joseph"
  const nameParts = individualName.split(" ");
  const displayName =
    nameParts.length >= 2
      ? `${nameParts[nameParts.length - 1]}, ${nameParts.slice(0, -1).join(" ")}`
      : individualName;

  // Format dates
  const fmtDate = (iso: string) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    } catch {
      return iso;
    }
  };

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const ms = now - startRef.current;
      setElapsed(ms);
      const pct = Math.min((ms / TOTAL_MS) * 100, 100);
      setProgress(pct);

      if (ms >= TOTAL_MS) {
        setDone(true);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Determine which steps are visible and their state
  const visibleSteps = ANIMATION_STEPS.filter((s) => elapsed >= s.delay);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050A14] overflow-y-auto">
      <div className="w-full max-w-lg px-6 py-10 flex flex-col items-center">

        {/* Orb */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* Outer glow */}
          <div className={`absolute w-56 h-56 rounded-full transition-opacity duration-1000 ${done ? "opacity-60" : "opacity-100"}`}
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)" }}
          />
          {/* Outer ring */}
          <div
            className="absolute w-44 h-44 rounded-full border border-indigo-500/30"
            style={{ animation: "spin 8s linear infinite" }}
          />
          {/* Inner ring */}
          <div
            className="absolute w-36 h-36 rounded-full border border-teal-400/40"
            style={{ animation: "spin 5s linear infinite reverse" }}
          />
          {/* Core orb */}
          <div
            className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-1000 ${
              done
                ? "shadow-teal-400/40"
                : "shadow-indigo-500/50"
            }`}
            style={{
              background: done
                ? "radial-gradient(circle, #14b8a6 0%, #0891b2 60%, #1e1b4b 100%)"
                : "radial-gradient(circle, #a5b4fc 0%, #6366f1 50%, #1e1b4b 100%)",
              animation: done ? "none" : "pulse 2s ease-in-out infinite",
            }}
          >
            {done ? (
              <CheckCircle2 className="w-12 h-12 text-white" />
            ) : (
              <Sparkles className="w-12 h-12 text-white" />
            )}
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-2">
          {done ? (
            <h2 className="font-manrope font-extrabold text-[22px] text-white">
              Draft Generated Successfully ✓
            </h2>
          ) : (
            <>
              <h2 className="font-manrope font-extrabold text-[20px] text-white">
                Generating Person-Centered Plan
              </h2>
              <p className="text-[13px] text-indigo-300 mt-1">for {displayName}</p>
            </>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-sm h-1.5 bg-white/10 rounded-full overflow-hidden mb-6">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: done
                ? "linear-gradient(to right, #14b8a6, #0891b2)"
                : "linear-gradient(to right, #6366f1, #8b5cf6, #06b6d4)",
            }}
          />
        </div>

        {/* Steps list */}
        <div className="w-full space-y-2 max-h-72 overflow-y-auto pr-1">
          {visibleSteps.map((s, i) => {
            const isComplete = elapsed >= s.completedAt;
            return (
              <div key={i} className="flex items-start gap-2.5 text-[12.5px]">
                {isComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin mt-0.5 shrink-0" />
                )}
                <span className={isComplete ? "text-teal-300" : "text-indigo-200"}>
                  {isComplete ? s.completedText : s.text}
                </span>
              </div>
            );
          })}
        </div>

        {/* Completion card */}
        {done && (
          <div className="mt-8 w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-indigo-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white">Person-Centered Plan — Draft</p>
                <p className="text-[11.5px] text-indigo-200 mt-0.5">
                  {displayName} · {planType} · Effective: {fmtDate(effectiveDate)} · APD: {fmtDate(annualDate)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {["10 sections", "3 goals", "6 services"].map((v) => (
                <div key={v} className="rounded-lg bg-white/5 px-3 py-2 text-center">
                  <p className="text-[13px] font-bold text-white">{v.split(" ")[0]}</p>
                  <p className="text-[10px] text-indigo-300 uppercase tracking-wide">
                    {v.split(" ").slice(1).join(" ")}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11.5px] text-amber-300">2 items need your review</span>
              <span className="ml-auto text-[10.5px] px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300 font-semibold">
                ⟡ AI Generated · Pending Review
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onComplete}
                className="flex-1 h-10 rounded-xl font-semibold text-[13px] text-white transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #14b8a6)",
                }}
              >
                Review Draft →
              </button>
              <button
                onClick={onLater}
                className="h-10 px-5 rounded-xl border border-white/20 text-[13px] font-medium text-white/70 hover:text-white hover:border-white/40"
              >
                Review Later
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 40px 10px rgba(99,102,241,0.5); }
          50% { box-shadow: 0 0 60px 20px rgba(99,102,241,0.3); }
        }
      `}</style>
    </div>
  );
}
