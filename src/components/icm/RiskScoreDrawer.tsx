// RiskScoreDrawer — Right-side breakdown panel
// Opens when any risk score badge is clicked (via RiskScoreContext).
// Shows: total score, level, factor-by-factor breakdown, actions.

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileBarChart,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  calculateRiskScore,
  loadRiskSettings,
  riskBg,
  riskHex,
  scoreLevel,
  type RiskFactor,
  type RiskScoreResult,
  RISK_SETTINGS_CHANGED,
} from "@/lib/riskEngine";

interface RiskScoreDrawerProps {
  isOpen: boolean;
  personId: string | null;
  personName: string | null;
  onClose: () => void;
}

export function RiskScoreDrawer({
  isOpen,
  personId,
  personName,
  onClose,
}: RiskScoreDrawerProps) {
  const navigate = useNavigate();
  const [result, setResult] = useState<RiskScoreResult | null>(null);
  const [showPassing, setShowPassing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Recompute whenever settings change or drawer opens for a new person
  const compute = async () => {
    if (!personId) return;
    let baseScore: number | undefined = undefined;
    try {
      const snap = await getDoc(doc(db, "individuals", personId));
      if (snap.exists()) {
        baseScore = snap.data().risk_score;
      }
    } catch (err) {
      console.error("Error fetching individual risk_score:", err);
    }
    const settings = loadRiskSettings();
    setResult(calculateRiskScore(personId, settings, baseScore));
  };

  useEffect(() => {
    if (!isOpen || !personId) return;
    compute();
    window.addEventListener(RISK_SETTINGS_CHANGED, compute);
    return () => window.removeEventListener(RISK_SETTINGS_CHANGED, compute);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, personId]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const level      = result?.level ?? "low";
  const total      = result?.total ?? 0;

  const rawTriggered = result?.factors.filter((f) => f.triggered) ?? [];
  const triggered = [...rawTriggered];
  if (total > 0 && rawTriggered.length === 0) {
    triggered.push({
      factorId: "base_profile_score",
      label: "Baseline profile risk score",
      points: total,
      triggered: true,
      detail: "Initial assessment or historical risk score from profile",
      source: "Individual Profile",
      sourcePath: `/people/${personId}/profile`,
    });
  }

  const passing    = result?.factors.filter((f) => !f.triggered) ?? [];
  const thresholds = loadRiskSettings().thresholds;
  const maxScore   = 100;

  // Progress bar segments
  const lowWidth      = (thresholds.lowMax / maxScore) * 100;
  const moderateWidth = ((thresholds.moderateMax - thresholds.lowMax) / maxScore) * 100;
  const highWidth     = ((maxScore - thresholds.moderateMax) / maxScore) * 100;
  const indicatorLeft = Math.min((total / maxScore) * 100, 99);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-[2px]"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed top-0 right-0 bottom-0 z-[201] w-full max-w-[420px] bg-icm-panel border-l border-icm-border shadow-2xl flex flex-col"
            aria-label="Risk Score Breakdown"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-icm-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-icm-accent" />
                <h2 className="font-manrope font-bold text-[15px] text-icm-text">Risk Score Breakdown</h2>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-icm-text-dim hover:bg-icm-bg hover:text-icm-text transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {!result ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="w-5 h-5 text-icm-text-faint animate-spin" />
                </div>
              ) : (
                <div className="p-5 space-y-5">

                  {/* Score summary card */}
                  <div className={`rounded-xl p-4 ring-1 ${riskBg(level)}`}>
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70 font-geist">
                          {personName ?? "Individual"}
                        </p>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="font-manrope font-extrabold text-[42px] leading-none">
                            {total}
                          </span>
                          <span className="text-[13px] font-semibold opacity-60">/100</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ring-1 ${riskBg(level)}`}>
                        {level === "high" ? "⚠ HIGH RISK" : level === "moderate" ? "MODERATE" : "LOW RISK"}
                      </span>
                    </div>

                    {/* Threshold bar */}
                    <div className="relative h-2 rounded-full overflow-hidden flex">
                      <div style={{ width: `${lowWidth}%`, background: "#16a34a" }} />
                      <div style={{ width: `${moderateWidth}%`, background: "#d97706" }} />
                      <div style={{ width: `${highWidth}%`, background: "#dc2626" }} />
                      {/* Score indicator */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-icm-text shadow-md transition-all"
                        style={{ left: `${indicatorLeft}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9.5px] font-mono mt-1 opacity-50">
                      <span>0</span>
                      <span>{thresholds.lowMax}</span>
                      <span>{thresholds.moderateMax}</span>
                      <span>100</span>
                    </div>

                    <p className="text-[11px] font-geist opacity-60 mt-2">
                      Calculated {result.lastCalculated}
                    </p>
                  </div>

                  {/* Active factors */}
                  {triggered.length > 0 && (
                    <section>
                      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-icm-text-faint font-geist mb-2">
                        Triggered factors — {triggered.length}
                      </h3>
                      <div className="space-y-2">
                        {triggered.map((f) => (
                          <FactorRow key={f.factorId} factor={f} personId={personId!} navigate={navigate} triggered />
                        ))}
                      </div>
                    </section>
                  )}

                  {triggered.length === 0 && (
                    <div className="rounded-xl border border-icm-border bg-icm-bg p-4 flex items-center gap-3 text-icm-green">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <p className="text-[12.5px] font-geist">No risk factors currently triggered.</p>
                    </div>
                  )}

                  {/* Passing factors (collapsible) */}
                  {passing.length > 0 && (
                    <section>
                      <button
                        onClick={() => setShowPassing((p) => !p)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-icm-text-faint font-geist hover:text-icm-text transition-colors"
                      >
                        {showPassing
                          ? <ChevronDown className="w-3.5 h-3.5" />
                          : <ChevronRight className="w-3.5 h-3.5" />}
                        Passing factors — {passing.length}
                      </button>
                      <AnimatePresence>
                        {showPassing && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-2 mt-2">
                              {passing.map((f) => (
                                <FactorRow key={f.factorId} factor={f} personId={personId!} navigate={navigate} triggered={false} />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </section>
                  )}

                  {/* Disclaimer */}
                  <p className="text-[10.5px] font-geist text-icm-text-faint leading-relaxed border-t border-icm-border pt-4">
                    This score is calculated from documented case data and is intended to support — not replace — clinical judgment. Always review the underlying records before escalating.
                  </p>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-5 py-4 border-t border-icm-border flex-shrink-0 flex items-center gap-2">
              <button
                onClick={() => { navigate("/reports/high-risk"); onClose(); }}
                className="flex-1 h-9 rounded-lg border border-icm-border bg-icm-bg text-icm-text text-[12px] font-semibold font-geist flex items-center justify-center gap-1.5 hover:border-icm-accent/40 hover:bg-icm-accent-soft transition-all"
              >
                <FileBarChart className="w-3.5 h-3.5" />
                High-Risk Report
              </button>
              <button
                onClick={() => { navigate("/settings/risk-score"); onClose(); }}
                className="h-9 px-3 rounded-lg border border-icm-border bg-icm-bg text-icm-text-dim text-[12px] font-semibold font-geist flex items-center justify-center gap-1.5 hover:border-icm-border-strong hover:text-icm-text transition-all"
              >
                Configure
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Factor row ────────────────────────────────────────────────────────────────

function FactorRow({
  factor,
  personId,
  navigate,
  triggered,
}: {
  factor: RiskFactor;
  personId: string;
  navigate: ReturnType<typeof useNavigate>;
  triggered: boolean;
}) {
  const path = factor.sourcePath.replace(":id", personId);

  return (
    <div className={`rounded-xl border p-3 flex items-start gap-3 transition-colors ${
      triggered
        ? "border-icm-red/20 bg-icm-red/5"
        : "border-icm-border bg-icm-bg"
    }`}>
      <div className="mt-0.5 shrink-0">
        {triggered
          ? <AlertTriangle className="w-3.5 h-3.5 text-icm-red" />
          : <CheckCircle2 className="w-3.5 h-3.5 text-icm-green" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12.5px] font-semibold text-icm-text font-geist leading-snug">
            {factor.label}
          </p>
          {triggered && (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-icm-red/10 text-icm-red ring-1 ring-icm-red/20 text-[10px] font-bold font-mono">
              +{factor.points}
            </span>
          )}
        </div>
        <p className="text-[11.5px] text-icm-text-dim font-geist mt-0.5 leading-relaxed">
          {factor.detail}
        </p>
        <button
          onClick={() => navigate(path)}
          className="mt-1.5 inline-flex items-center gap-0.5 text-[11px] text-icm-accent hover:underline font-geist"
        >
          {factor.source}
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}
