/**
 * ConsentPortal — Public-facing consent signature page.
 * Route: /consent/:token
 *
 * Flow: Token validation → Phone verification (OTP) → Consent review → Signature → Confirmation
 *
 * This page requires NO login. It is designed for mobile use (opened from an SMS link).
 * Max-width 480px, large touch targets, 16px minimum font, no external navigation.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import {
  Shield, CheckCircle2, AlertTriangle, Lock, Phone,
  Loader2, RotateCcw, PenLine,
} from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PortalStep = "loading" | "invalid" | "expired" | "used" | "phone_verify" | "otp_entry" | "consent_review" | "confirmed";

interface ConsentData {
  consentType: string;
  description: string;
  consentBodyHtml?: string;   // rich-text HTML from the composer
  individualName?: string;
  createdByName?: string;
  createdAt?: any;
}

interface VerifyResult {
  success: boolean;
  consent: ConsentData;
  individualName: string;
  consentId: string;
  individualId: string;
  tokenDocId: string;
  recipientName?: string;
  recipientPhone?: string;
}

// ─── Signature canvas hook ────────────────────────────────────────────────────

function useSignatureCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      drawing.current = true;
      const { x, y } = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const move = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!drawing.current) return;
      const { x, y } = getPos(e, canvas);
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSignature(true);
    };
    const stop = () => { drawing.current = false; };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", stop);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", stop);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", stop);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", move);
      canvas.removeEventListener("touchend", stop);
    };
  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const getDataUrl = () => canvasRef.current?.toDataURL("image/png") ?? "";

  return { canvasRef, clear, hasSignature, getDataUrl };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConsentPortal() {
  const { token } = useParams<{ token: string }>();
  const fns = getFunctions();
  const navigate = useNavigate();

  const [step, setStep] = useState<PortalStep>("loading");
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");

  // OTP state
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  // Signature state
  const [signerName, setSignerName] = useState("");
  const [signerRelationship, setSignerRelationship] = useState("");
  const [signatureTab, setSignatureTab] = useState<"draw" | "type">("draw");
  const [typedSignature, setTypedSignature] = useState("");
  const [agreedLegal, setAgreedLegal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedAt, setConfirmedAt] = useState("");

  const { canvasRef, clear, hasSignature, getDataUrl } = useSignatureCanvas();
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Step 0: Validate token on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!token) { setStep("invalid"); return; }
    const checkToken = httpsCallable(fns, "checkConsentToken");
    checkToken({ token })
      .then((result: any) => {
        const data = result.data as any;
        if (data.status === "expired") { setStep("expired"); return; }
        if (data.status === "used")    { setStep("used"); return; }
        if (data.status === "invalid") { setStep("invalid"); return; }
        // Valid — show phone verification
        setMaskedPhone(data.maskedPhone ?? "***-***-????");
        setRecipientPhone(data.recipientPhone ?? "");
        setStep("phone_verify");
      })
      .catch(() => setStep("invalid"));
  }, [token, fns]);

  // ── Resend countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  // ── Post-signature redirect to Guardian Portal ────────────────────────────────
  useEffect(() => {
    if (step !== "confirmed" || !token || !verifyResult) return;
    // Store token for portal session persistence
    localStorage.setItem("guardian_portal_token", token);
    // Fire-and-forget: create/update guardian portal session
    try {
      const createSession = httpsCallable(fns, "createGuardianPortalSession");
      createSession({
        consentId: verifyResult.consentId,
        token,
        individualId: verifyResult.individualId,
        guardianName: signerName,
        guardianPhone: verifyResult.recipientPhone ?? "",
        tenantId: "org_casemanagement_ai",
        orgId: "org_casemanagement_ai",
      }).catch(() => { /* ignore — redirect happens regardless */ });
    } catch {
      // ignore
    }
    const t = setTimeout(() => {
      navigate(`/guardian-portal/${token}/home`);
    }, 2000);
    return () => clearTimeout(t);
  }, [step, token, verifyResult, signerName, fns, navigate]);

  // ── Send OTP ─────────────────────────────────────────────────────────────────
  async function sendOtp() {
    setOtpSending(true);
    setOtpError("");
    try {
      const fn = httpsCallable(fns, "sendConsentOTP");
      await fn({ token, phone: recipientPhone });
      setStep("otp_entry");
      setResendCountdown(30);
    } catch (err: any) {
      setOtpError(err.message ?? "Failed to send code. Please try again.");
    } finally {
      setOtpSending(false);
    }
  }

  // ── OTP digit input handling ─────────────────────────────────────────────────
  function handleOtpChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(0, 1);
    const next = [...otp];
    next[index] = cleaned;
    setOtp(next);
    if (cleaned && index < 5) otpInputRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  // ── Verify OTP ───────────────────────────────────────────────────────────────
  async function verifyOtp() {
    const code = otp.join("");
    if (code.length < 6) { setOtpError("Please enter all 6 digits."); return; }
    setOtpVerifying(true);
    setOtpError("");
    try {
      const fn = httpsCallable(fns, "verifyConsentOTP");
      const result = await fn({ token, otp: code }) as any;
      const data = result.data as VerifyResult;
      setVerifyResult(data);
      setSignerName(data.recipientName ?? "");
      setStep("consent_review");
    } catch (err: any) {
      const msg: string = err.message ?? "";
      if (msg.includes("exhausted") || msg.includes("Too many")) {
        setOtpError("Too many attempts. Contact your case manager for a new link.");
        setAttemptsLeft(0);
      } else if (msg.includes("Incorrect")) {
        setAttemptsLeft((a) => a - 1);
        setOtpError(`Incorrect code. ${Math.max(0, attemptsLeft - 1)} attempt(s) remaining.`);
      } else {
        setOtpError(msg || "Verification failed. Please try again.");
      }
    } finally {
      setOtpVerifying(false);
    }
  }

  // ── Submit signature ─────────────────────────────────────────────────────────
  async function submitSignature() {
    if (!verifyResult) return;

    const signatureData = signatureTab === "draw" ? getDataUrl() : typedSignature;
    if (!signatureData || (signatureTab === "draw" && !hasSignature)) {
      alert("Please provide your signature.");
      return;
    }
    if (!signerName.trim() || !signerRelationship || !agreedLegal) {
      alert("Please fill in all required fields and agree to the legal statement.");
      return;
    }

    setSubmitting(true);
    try {
      const fn = httpsCallable(fns, "submitConsentSignature");
      const result = await fn({
        token,
        tokenDocId: verifyResult.tokenDocId,
        signatureData,
        signatureType: signatureTab,
        signerName: signerName.trim(),
        signerRelationship,
        ipAddress: "client", // server will log real IP
        userAgent: navigator.userAgent,
      }) as any;
      setConfirmedAt(result.data?.signedAt ?? new Date().toISOString());
      setStep("confirmed");
    } catch (err: any) {
      alert("Failed to submit signature: " + (err.message ?? "unknown error"));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Renders ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8 font-geist">
      <div className="w-full max-w-[480px]">

        {/* Logo */}
        <div className="text-center mb-6">
          <span className="text-[18px] font-manrope font-bold text-icm-text">CaseManagement.AI</span>
        </div>

        {/* ── Loading ── */}
        {step === "loading" && (
          <Card>
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-8 h-8 text-icm-accent animate-spin" />
              <p className="text-[16px] text-icm-text-dim">Verifying your secure link…</p>
            </div>
          </Card>
        )}

        {/* ── Invalid ── */}
        {step === "invalid" && (
          <Card>
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <AlertTriangle className="w-10 h-10 text-icm-amber" />
              <h1 className="text-[20px] font-manrope font-bold text-icm-text">This link is no longer valid.</h1>
              <p className="text-[16px] text-icm-text-dim">It may have already been used or cancelled. Please contact your case manager.</p>
            </div>
          </Card>
        )}

        {/* ── Expired ── */}
        {step === "expired" && (
          <Card>
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <Lock className="w-10 h-10 text-icm-red" />
              <h1 className="text-[20px] font-manrope font-bold text-icm-text">This link has expired.</h1>
              <p className="text-[16px] text-icm-text-dim">Consent links are valid for 48 hours. Please contact your case manager to request a new link.</p>
            </div>
          </Card>
        )}

        {/* ── Used ── */}
        {step === "used" && (
          <Card>
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <CheckCircle2 className="w-10 h-10 text-icm-green" />
              <h1 className="text-[20px] font-manrope font-bold text-icm-text">Already signed.</h1>
              <p className="text-[16px] text-icm-text-dim">This consent has already been signed. Contact your case manager if you have questions.</p>
            </div>
          </Card>
        )}

        {/* ── Phone Verification ── */}
        {step === "phone_verify" && (
          <Card>
            <h1 className="text-[22px] font-manrope font-bold text-icm-text mb-2">Verify Your Identity</h1>
            <p className="text-[16px] text-icm-text-dim mb-5 leading-relaxed">
              To protect privacy, we need to verify your phone number before showing any documents.
            </p>
            <div className="rounded-lg bg-icm-bg border border-icm-border p-4 mb-5">
              <p className="text-[14px] text-icm-text-dim">Your phone number on file:</p>
              <p className="text-[18px] font-mono font-semibold text-icm-text mt-1">{maskedPhone}</p>
            </div>
            {otpError && <p className="text-[15px] text-icm-red mb-3">{otpError}</p>}
            <button
              onClick={sendOtp}
              disabled={otpSending}
              className="w-full h-[52px] rounded-xl bg-icm-accent text-white text-[17px] font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {otpSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Phone className="w-5 h-5" />}
              {otpSending ? "Sending…" : "Send Verification Code"}
            </button>
          </Card>
        )}

        {/* ── OTP Entry ── */}
        {step === "otp_entry" && (
          <Card>
            <h1 className="text-[22px] font-manrope font-bold text-icm-text mb-2">Enter Your Code</h1>
            <p className="text-[16px] text-icm-text-dim mb-5">
              A 6-digit code was sent to <strong>{maskedPhone}</strong>. It expires in 10 minutes.
            </p>

            {/* OTP inputs */}
            <div className="flex items-center gap-2 justify-center mb-5">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpInputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-[48px] h-[56px] text-center text-[24px] font-mono font-bold border-2 border-icm-border rounded-xl bg-white focus:border-icm-accent focus:outline-none transition-colors"
                />
              ))}
            </div>

            {otpError && <p className="text-[15px] text-icm-red text-center mb-3">{otpError}</p>}

            <button
              onClick={verifyOtp}
              disabled={otpVerifying || otp.join("").length < 6 || attemptsLeft === 0}
              className="w-full h-[52px] rounded-xl bg-icm-accent text-white text-[17px] font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
            >
              {otpVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {otpVerifying ? "Verifying…" : "Verify →"}
            </button>

            {/* Resend */}
            <div className="text-center text-[15px] text-icm-text-dim">
              Didn't receive a code?{" "}
              {resendCountdown > 0 ? (
                <span>Resend in {resendCountdown}s</span>
              ) : (
                <button onClick={sendOtp} disabled={otpSending} className="text-icm-accent font-semibold hover:underline">
                  Resend
                </button>
              )}
            </div>
          </Card>
        )}

        {/* ── Consent Review & Signature ── */}
        {step === "consent_review" && verifyResult && (
          <div className="space-y-4">
            {/* Verified banner */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-icm-green-soft text-icm-green text-[14px] font-semibold">
              <Shield className="w-4 h-4" /> Verified · {verifyResult.recipientName} · {new Date().toLocaleDateString()}
            </div>

            <Card>
              {/* Consent document */}
              <div className="border-b border-icm-border pb-4 mb-4">
                <p className="text-[13px] font-mono text-icm-text-faint uppercase tracking-widest mb-2">Consent Form</p>
                <h2 className="text-[22px] font-manrope font-bold text-icm-text mb-3">{verifyResult.consent.consentType}</h2>
                <div className="text-[14px] text-icm-text-dim space-y-1">
                  <p>Individual: <span className="text-icm-text font-medium">{verifyResult.individualName}</span></p>
                  {verifyResult.consent.createdByName && <p>Case Manager: <span className="text-icm-text font-medium">{verifyResult.consent.createdByName}</span></p>}
                  <p>Date: <span className="text-icm-text font-medium">{new Date().toLocaleDateString()}</span></p>
                </div>
              </div>

              {/* Render rich HTML body if available, fall back to plain description */}
              {(verifyResult.consent as any).consentBodyHtml ? (
                <div
                  className="consent-body-html mb-5"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize((verifyResult.consent as any).consentBodyHtml),
                  }}
                />
              ) : (
                <p className="text-[16px] text-icm-text leading-relaxed mb-5">
                  {verifyResult.consent.description}
                </p>
              )}

              <div className="border-t border-icm-border pt-5 space-y-4">
                <p className="text-[13px] font-semibold text-icm-text uppercase tracking-wider">
                  By signing below, I acknowledge that I have read and understand the above consent.
                </p>

                {/* Signer name */}
                <div>
                  <label className="text-[13px] font-semibold text-icm-text-dim block mb-1">Your name</label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full h-[48px] px-4 rounded-xl border border-icm-border bg-white text-[16px] text-icm-text focus:border-icm-accent focus:outline-none"
                    style={{ fontSize: 16 }} // prevents iOS zoom
                  />
                </div>

                {/* Relationship */}
                <div>
                  <label className="text-[13px] font-semibold text-icm-text-dim block mb-1">Your relationship to the individual</label>
                  <select
                    value={signerRelationship}
                    onChange={(e) => setSignerRelationship(e.target.value)}
                    className="w-full h-[48px] px-4 rounded-xl border border-icm-border bg-white text-[16px] text-icm-text focus:border-icm-accent focus:outline-none appearance-none"
                    style={{ fontSize: 16 }}
                  >
                    <option value="">— Select relationship —</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Parent">Parent</option>
                    <option value="Legal Representative">Legal Representative</option>
                    <option value="Participant">Participant</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Signature tabs */}
                <div>
                  <label className="text-[13px] font-semibold text-icm-text-dim block mb-2">Signature</label>
                  <div className="flex items-center gap-1 mb-3">
                    {(["draw", "type"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setSignatureTab(t)}
                        className={cn(
                          "h-[40px] px-4 rounded-lg text-[15px] font-medium transition-colors",
                          signatureTab === t ? "bg-icm-text text-white" : "bg-icm-bg text-icm-text-dim border border-icm-border"
                        )}
                      >
                        {t === "draw" ? "Draw" : "Type"}
                      </button>
                    ))}
                  </div>

                  {signatureTab === "draw" ? (
                    <div>
                      <canvas
                        ref={canvasRef}
                        width={440}
                        height={140}
                        className="w-full h-[140px] border-2 border-icm-border rounded-xl bg-white touch-none"
                        style={{ touchAction: "none" }}
                      />
                      <button onClick={clear} className="mt-2 text-[14px] text-icm-text-dim hover:text-icm-text flex items-center gap-1">
                        <RotateCcw className="w-4 h-4" /> Clear
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={typedSignature}
                        onChange={(e) => setTypedSignature(e.target.value)}
                        placeholder="Type your full name as your signature"
                        className="w-full h-[56px] px-4 rounded-xl border border-icm-border bg-white text-[16px] text-icm-text focus:border-icm-accent focus:outline-none"
                        style={{ fontSize: 16, fontFamily: "'Dancing Script', cursive, serif" }}
                      />
                      {typedSignature && (
                        <p className="mt-2 text-[22px] text-icm-text-dim" style={{ fontFamily: "'Dancing Script', cursive, serif" }}>
                          {typedSignature}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Legal checkbox */}
                <label className="flex items-start gap-3 cursor-pointer mt-4">
                  <input
                    type="checkbox"
                    checked={agreedLegal}
                    onChange={(e) => setAgreedLegal(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-icm-border"
                  />
                  <span className="text-[15px] text-icm-text leading-snug">
                    I agree that this electronic signature is legally binding.
                  </span>
                </label>

                <button
                  onClick={submitSignature}
                  disabled={submitting || !signerName.trim() || !signerRelationship || !agreedLegal || (signatureTab === "draw" && !hasSignature) || (signatureTab === "type" && !typedSignature.trim())}
                  className="w-full h-[52px] rounded-xl bg-icm-accent text-white text-[17px] font-semibold hover:opacity-90 disabled:opacity-40 mt-2 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenLine className="w-5 h-5" />}
                  {submitting ? "Submitting…" : "Submit Signature →"}
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* ── Confirmation ── */}
        {step === "confirmed" && verifyResult && (
          <div className="flex flex-col items-center text-center py-12 gap-4">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-[24px] font-manrope font-bold text-gray-900">Signed successfully.</h1>
            <p className="text-[16px] text-gray-500">Thank you, <strong>{signerName}</strong>.</p>
            <p className="text-[14px] text-gray-400">Taking you to your secure portal...</p>
            <div className="flex gap-1 mt-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
      {children}
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-icm-text-faint w-28 shrink-0 text-[12px] font-mono uppercase">{label}</span>
      <span className="text-icm-text font-medium">{value}</span>
    </div>
  );
}
