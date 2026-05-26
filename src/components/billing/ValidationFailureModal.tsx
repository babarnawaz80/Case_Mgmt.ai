/**
 * ValidationFailureModal — shown when billing validation fails.
 * Three options: Fix Issues (create correction task), Save Without Billing, Override (admin).
 */
import React from "react";
import { X, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { CHECK_LABELS, type ValidationResult } from "@/services/billingValidation";
import { cn } from "@/lib/utils";

interface ValidationFailureModalProps {
  result: ValidationResult;
  noteType: string;
  isSaving?: boolean;
  isOverriding?: boolean;
  onFix: () => void;          // Create correction task and close
  onSaveWithoutBilling: () => void; // Save note, skip billing
  onOverride: () => void;     // Admin: override and submit anyway
  onClose: () => void;
  isAdmin?: boolean;
}

const ValidationFailureModal: React.FC<ValidationFailureModalProps> = ({
  result,
  noteType,
  isSaving,
  isOverriding,
  onFix,
  onSaveWithoutBilling,
  onOverride,
  onClose,
  isAdmin = false,
}) => {
  const failedChecks = Object.entries(result.checks).filter(([, v]) => !v.passed);
  const passedChecks = Object.entries(result.checks).filter(([, v]) => v.passed);

  const noteTypeLabel = {
    progress_note: "Progress Note",
    contact_note: "Contact Note",
    visit_summary: "Visit Summary",
    monitoring_form: "Monitoring Form",
  }[noteType] || "Note";

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-icm-panel rounded-2xl border border-icm-border w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-icm-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-manrope font-bold text-[15px] text-icm-text">Billing Validation Failed</p>
              <p className="text-[12px] font-geist text-icm-text-dim mt-0.5">
                {failedChecks.length} check{failedChecks.length !== 1 ? "s" : ""} failed · {noteTypeLabel} cannot be billed yet
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-icm-text-dim hover:text-icm-text mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Failed checks */}
        <div className="p-5 space-y-3 max-h-[50vh] overflow-y-auto">
          {failedChecks.map(([key, check]) => (
            <div
              key={key}
              className="rounded-xl border border-red-200 bg-red-50/60 p-3"
            >
              <div className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-geist font-semibold text-icm-text">
                    {CHECK_LABELS[key] || key}
                  </p>
                  <p className="text-[11.5px] font-geist text-red-700 mt-1 leading-relaxed">
                    {check.message}
                  </p>
                  {check.detail && (
                    <p className="text-[11px] font-geist text-icm-text-dim mt-1">
                      {check.detail}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-geist font-semibold text-icm-text">Warnings</p>
                  {result.warnings.map((w, i) => (
                    <p key={i} className="text-[11.5px] font-geist text-amber-700 mt-1 leading-relaxed">{w}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Passed checks (collapsed) */}
          {passedChecks.length > 0 && (
            <details className="group">
              <summary className="text-[11px] font-geist text-icm-text-dim cursor-pointer select-none flex items-center gap-1 hover:text-icm-text">
                <CheckCircle2 className="w-3.5 h-3.5 text-icm-green inline" />
                {passedChecks.length} check{passedChecks.length !== 1 ? "s" : ""} passed
              </summary>
              <div className="mt-2 space-y-1.5 pl-1">
                {passedChecks.map(([key, check]) => (
                  <div key={key} className="flex items-center gap-2 rounded-lg bg-icm-green-soft/30 px-3 py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-icm-green shrink-0" />
                    <div>
                      <span className="text-[11.5px] font-geist font-medium text-icm-text">
                        {CHECK_LABELS[key] || key}
                      </span>
                      <span className="text-[11px] font-geist text-icm-text-dim ml-1">— {check.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-icm-border space-y-3">
          {/* Primary: Fix issues */}
          <button
            onClick={onFix}
            disabled={isSaving}
            className="w-full h-10 rounded-xl bg-icm-text text-icm-panel text-[12.5px] font-geist font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            Fix Issues & Save for Later
          </button>

          {/* Secondary: Save without billing */}
          <button
            onClick={onSaveWithoutBilling}
            disabled={isSaving}
            className="w-full h-10 rounded-xl border border-icm-border text-[12.5px] font-geist font-semibold text-icm-text hover:bg-icm-bg transition-colors disabled:opacity-50"
          >
            Save Note Without Billing
          </button>

          {/* Admin only: Override */}
          {isAdmin && (
            <button
              onClick={onOverride}
              disabled={isOverriding}
              className={cn(
                "w-full text-[11px] font-geist text-icm-text-dim hover:text-icm-red inline-flex items-center justify-center gap-1 transition-colors",
                isOverriding && "opacity-50 pointer-events-none"
              )}
            >
              {isOverriding ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : null}
              Override validation and submit anyway (admin)
            </button>
          )}

          <p className="text-[10.5px] font-geist text-icm-text-faint text-center leading-relaxed">
            "Fix Issues" creates a billing correction task in My Work and saves the note.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ValidationFailureModal;
