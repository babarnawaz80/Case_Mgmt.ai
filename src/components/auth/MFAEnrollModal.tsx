/**
 * MFAEnrollModal — Phone enrollment flow
 * Shown after login when MFA is required but not yet enrolled.
 * Also accessible from Account Settings to add/manage MFA.
 */
import { useState, useEffect, useRef } from "react";
import { Loader2, Shield, Smartphone, CheckCircle2, AlertTriangle, Phone } from "lucide-react";
import { enrollSendSms, enrollConfirm, clearRecaptcha } from "@/lib/mfa";

interface MFAEnrollModalProps {
  /** Called after successful enrollment */
  onEnrolled: () => void;
  /** If provided, shows a "Skip for now" link (for optional enrollment) */
  onSkip?: () => void;
  /** If false/undefined, enrollment is mandatory — no skip option */
  optional?: boolean;
}

export function MFAEnrollModal({ onEnrolled, onSkip, optional }: MFAEnrollModalProps) {
  const [step, setStep] = useState<"phone" | "sending" | "code" | "verifying" | "done" | "error">("phone");
  const [phone, setPhone] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => clearRecaptcha();
  }, []);

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus();
  }, [step]);

  const formatPhone = (raw: string) => {
    // Strip everything except digits and +
    const digits = raw.replace(/[^\d+]/g, "");
    // Auto-add +1 if it's a 10-digit US number
    if (/^\d{10}$/.test(digits)) return `+1${digits}`;
    return digits;
  };

  const sendCode = async () => {
    const formatted = formatPhone(phone);
    if (formatted.length < 10) {
      setErrorMsg("Please enter a valid phone number.");
      return;
    }
    setErrorMsg("");
    setStep("sending");
    try {
      const vid = await enrollSendSms(formatted, "mfa-enroll-recaptcha");
      setVerificationId(vid);
      setStep("code");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to send SMS. Please check the number and try again.");
      setStep("phone");
    }
  };

  const confirmCode = async () => {
    if (code.length < 6) return;
    setStep("verifying");
    setErrorMsg("");
    try {
      await enrollConfirm(verificationId, code.trim());
      setStep("done");
      setTimeout(() => onEnrolled(), 1200);
    } catch (err: any) {
      setErrorMsg(
        err?.code === "auth/invalid-verification-code"
          ? "Incorrect code. Please check your SMS and try again."
          : err?.message ?? "Verification failed."
      );
      setStep("code");
      setCode("");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* invisible reCAPTCHA container */}
      <div id="mfa-enroll-recaptcha" ref={containerRef} className="hidden" />

      <div className="w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-[17px]">Set Up Two-Factor Authentication</h2>
          </div>
          <p className="text-[13px] text-white/80 pl-12">
            {optional
              ? "Add an extra layer of security to your account"
              : "Required by your organization's security policy"}
          </p>
        </div>

        <div className="px-6 py-5">
          {/* ── Step: Enter Phone ── */}
          {step === "phone" && (
            <>
              <div className="flex items-start gap-2 mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[12.5px] text-emerald-800">
                  You'll receive a 6-digit verification code by SMS each time you sign in.
                </p>
              </div>

              <label className="block text-[11.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Mobile Phone Number
              </label>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-500 gap-1.5 shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                  <span>+1</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setErrorMsg(""); }}
                  onKeyDown={(e) => e.key === "Enter" && sendCode()}
                  placeholder="(555) 000-0000"
                  className="flex-1 h-11 px-4 rounded-xl border border-slate-200 text-[14px] focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400 mb-4">
                Standard US/Canada numbers are auto-formatted. For international, include your country code (e.g. +44 7700 900000).
              </p>

              {errorMsg && (
                <div className="flex items-start gap-2 mb-4 p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-rose-700">{errorMsg}</p>
                </div>
              )}

              <button
                onClick={sendCode}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-[14px] shadow-md hover:opacity-90 transition-opacity"
              >
                Send Verification Code
              </button>

              {optional && onSkip && (
                <button
                  onClick={onSkip}
                  className="w-full mt-2 text-[12px] text-slate-400 hover:text-slate-600"
                >
                  Skip for now
                </button>
              )}
            </>
          )}

          {/* ── Step: Sending ── */}
          {step === "sending" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
              <p className="text-[13px] text-slate-600">Sending verification code…</p>
            </div>
          )}

          {/* ── Step: Enter Code ── */}
          {(step === "code" || step === "verifying") && (
            <>
              <div className="flex items-center gap-2 mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-[12.5px] text-emerald-800">
                  Code sent to <span className="font-semibold">{formatPhone(phone)}</span>
                </p>
              </div>

              <label className="block text-[11.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                6-Digit Code
              </label>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && code.length === 6 && confirmCode()}
                placeholder="• • • • • •"
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-center text-[22px] font-mono tracking-[0.4em] focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 mb-4"
                disabled={step === "verifying"}
              />

              {errorMsg && (
                <div className="flex items-start gap-2 mb-4 p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-rose-700">{errorMsg}</p>
                </div>
              )}

              <button
                onClick={confirmCode}
                disabled={code.length < 6 || step === "verifying"}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-[14px] shadow-md disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {step === "verifying" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Confirming…</>
                ) : (
                  "Confirm & Enable MFA"
                )}
              </button>

              <button
                onClick={() => { setStep("phone"); setCode(""); setErrorMsg(""); }}
                className="w-full mt-2 text-[12px] text-slate-400 hover:text-slate-600"
              >
                ← Change phone number
              </button>
            </>
          )}

          {/* ── Step: Done ── */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="font-semibold text-[15px] text-slate-800">MFA Enabled!</p>
              <p className="text-[12.5px] text-slate-500 text-center">
                Your account is now protected with two-factor authentication.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
