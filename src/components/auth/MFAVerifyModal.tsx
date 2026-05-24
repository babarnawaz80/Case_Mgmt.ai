/**
 * MFAVerifyModal — SMS challenge during sign-in
 * Shown when Firebase returns auth/multi-factor-auth-required
 */
import { useState, useEffect, useRef } from "react";
import { Loader2, Shield, Smartphone, AlertTriangle } from "lucide-react";
import { MultiFactorResolver } from "firebase/auth";
import { challengeSendSms, challengeConfirm, clearRecaptcha } from "@/lib/mfa";

interface MFAVerifyModalProps {
  resolver: MultiFactorResolver;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MFAVerifyModal({ resolver, onSuccess, onCancel }: MFAVerifyModalProps) {
  const [step, setStep] = useState<"sending" | "code" | "verifying" | "error">("sending");
  const [verificationId, setVerificationId] = useState("");
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Masked phone hint
  const phoneHint = (resolver.hints[0] as any)?.phoneNumber ?? "your registered phone";

  useEffect(() => {
    sendCode();
    return () => clearRecaptcha();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus();
  }, [step]);

  const sendCode = async () => {
    setStep("sending");
    setErrorMsg("");
    try {
      const vid = await challengeSendSms(resolver, "mfa-verify-recaptcha");
      setVerificationId(vid);
      setStep("code");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to send SMS. Please try again.");
      setStep("error");
    }
  };

  const verify = async () => {
    if (code.length < 6) return;
    setStep("verifying");
    setErrorMsg("");
    try {
      await challengeConfirm(resolver, verificationId, code.trim());
      onSuccess();
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
      <div id="mfa-verify-recaptcha" ref={containerRef} className="hidden" />

      <div className="w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-[17px]">Two-Factor Verification</h2>
          </div>
          <p className="text-[13px] text-white/80 pl-12">
            Verify your identity to continue
          </p>
        </div>

        <div className="px-6 py-5">
          {step === "sending" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
              <p className="text-[13px] text-slate-600">Sending verification code…</p>
            </div>
          )}

          {(step === "code" || step === "verifying") && (
            <>
              <div className="flex items-center gap-2 mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <Smartphone className="w-4 h-4 text-indigo-500 shrink-0" />
                <p className="text-[12.5px] text-indigo-800">
                  We sent a 6-digit code to <span className="font-semibold">{phoneHint}</span>
                </p>
              </div>

              <label className="block text-[11.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Verification Code
              </label>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && code.length === 6 && verify()}
                placeholder="• • • • • •"
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-center text-[22px] font-mono tracking-[0.4em] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 mb-4"
                disabled={step === "verifying"}
              />

              {errorMsg && (
                <div className="flex items-start gap-2 mb-4 p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-rose-700">{errorMsg}</p>
                </div>
              )}

              <button
                onClick={verify}
                disabled={code.length < 6 || step === "verifying"}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-[14px] shadow-md disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {step === "verifying" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                ) : (
                  "Verify & Sign In"
                )}
              </button>

              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={sendCode}
                  className="text-[12px] text-indigo-600 hover:underline"
                >
                  Resend code
                </button>
                <button
                  onClick={onCancel}
                  className="text-[12px] text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {step === "error" && (
            <div className="py-4">
              <div className="flex items-start gap-2 mb-4 p-3 bg-rose-50 rounded-xl border border-rose-100">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-[12.5px] text-rose-700">{errorMsg}</p>
              </div>
              <button
                onClick={sendCode}
                className="w-full h-11 rounded-xl border border-slate-200 text-slate-700 font-medium text-[14px] hover:bg-slate-50 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onCancel}
                className="w-full mt-2 text-[12px] text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
