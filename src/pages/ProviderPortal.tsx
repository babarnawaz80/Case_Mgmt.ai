/**
 * ProviderPortal — Public-facing portal for external service providers.
 * Route: /provider-portal/:token
 *
 * COMPLETELY PUBLIC — no Firebase Auth, no ICMShell.
 * State machine: "validating" → "auth" → "portal" → "success"
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions as fns } from "@/lib/firebase";
import { Loader2, CheckCircle2, Upload, X, FileText, ShieldCheck } from "lucide-react";

// ─── Palette ──────────────────────────────────────────────────────────────────

const S = {
  bg: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
  borderFocus: "#3b82f6",
  text: "#0f172a",
  textMuted: "#64748b",
  primary: "#2563eb",
  primaryHover: "#1d4ed8",
  green: "#059669",
  greenBg: "#ecfdf5",
  red: "#dc2626",
  redBg: "#fef2f2",
  inputBg: "#ffffff",
  labelColor: "#374151",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "validating" | "auth" | "otp" | "portal" | "success";

interface ProviderTokenData {
  tokenId: string;
  providerName: string;
  providerEmail: string;
  providerPhone?: string;
  maskedEmail?: string;
  maskedPhone?: string;
  individuals: LinkedIndividual[];
}

interface LinkedIndividual {
  id: string;
  name: string;
}

interface RecentUpload {
  id: string;
  fileName: string;
  individualName: string;
  documentType: string;
  uploadedAt: string;
}

interface PortalData {
  individuals: LinkedIndividual[];
  recentUploads: RecentUpload[];
}

interface UploadedDoc {
  fileName: string;
  individualName: string;
  documentType: string;
  uploadedAt: string;
}

interface LocalSession {
  sessionToken: string;
  expiresAt: number;
}

// ─── Document type options ────────────────────────────────────────────────────

const DOCUMENT_TYPES = [
  "Progress Note",
  "Goal Documentation / Progress Update",
  "Quarterly Report",
  "Annual Report",
  "Medical / Health Update",
  "Incident Documentation",
  "Service Authorization Request",
  "Other",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sessionKey(tokenId: string): string {
  return `provider_session_${tokenId}`;
}

function loadLocalSession(tokenId: string): LocalSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(tokenId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalSession;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(sessionKey(tokenId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveLocalSession(tokenId: string, session: LocalSession): void {
  try {
    localStorage.setItem(sessionKey(tokenId), JSON.stringify(session));
  } catch {
    // localStorage unavailable — continue without persistent session
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ size = 24, color = S.primary }: { size?: number; color?: string }) {
  return (
    <Loader2
      size={size}
      style={{ color, animation: "spin 1s linear infinite" }}
    />
  );
}

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: S.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: S.white,
          border: `1px solid ${S.border}`,
          borderRadius: 12,
          padding: "40px 32px",
          maxWidth: 440,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: S.redBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <X size={26} style={{ color: S.red }} />
        </div>
        <h2 style={{ margin: "0 0 10px", fontSize: 20, color: S.text, fontWeight: 700 }}>
          {title}
        </h2>
        <p style={{ margin: 0, color: S.textMuted, fontSize: 15, lineHeight: 1.6 }}>
          {message}
        </p>
      </div>
    </div>
  );
}

function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 13,
        color: "#1e40af",
        marginBottom: 6,
      }}
    >
      <FileText size={14} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {file.name}
      </span>
      <span style={{ color: "#64748b", flexShrink: 0 }}>{sizeMB} MB</span>
      <button
        onClick={onRemove}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 2,
          display: "flex",
          alignItems: "center",
          color: "#64748b",
        }}
        aria-label={`Remove ${file.name}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProviderPortal() {
  const { token = "" } = useParams<{ token: string }>();

  const [step, setStep] = useState<Step>("validating");
  const [errorType, setErrorType] = useState<"invalid" | "revoked" | null>(null);
  const [tokenData, setTokenData] = useState<ProviderTokenData | null>(null);
  const [sessionToken, setSessionToken] = useState<string>("");

  // Auth step
  const [otpSent, setOtpSent] = useState(false);
  const [otpMethod, setOtpMethod] = useState<"email" | "sms">("email");
  const [otpCode, setOtpCode] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Portal step
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [selectedIndividual, setSelectedIndividual] = useState("");
  const [selectedDocType, setSelectedDocType] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Success step
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDoc | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Token validation on mount ──────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      try {
        const validateFn = httpsCallable<{ token: string }, ProviderTokenData & { status: string }>(
          fns,
          "validateProviderToken"
        );
        const result = await validateFn({ token });
        const data = result.data;

        if (cancelled) return;

        if (data.status === "revoked") {
          setErrorType("revoked");
          setStep("validating"); // stays on error — rendered below
          return;
        }

        if (data.status === "invalid" || !data.tokenId) {
          setErrorType("invalid");
          return;
        }

        setTokenData(data);

        // Check for stored session
        const storedSession = loadLocalSession(data.tokenId);
        if (storedSession) {
          try {
            const validateSessionFn = httpsCallable<
              { tokenId: string; sessionToken: string },
              { valid: boolean }
            >(fns, "validateProviderSession");
            const sessionResult = await validateSessionFn({
              tokenId: data.tokenId,
              sessionToken: storedSession.sessionToken,
            });
            if (!cancelled && sessionResult.data.valid) {
              setSessionToken(storedSession.sessionToken);
              await loadPortalData(data.tokenId, storedSession.sessionToken);
              if (!cancelled) setStep("portal");
              return;
            }
          } catch {
            // Session invalid — fall through to auth
          }
        }

        if (!cancelled) setStep("auth");
      } catch {
        if (!cancelled) setErrorType("invalid");
      }
    }

    validate();
    return () => {
      cancelled = true;
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPortalData(tokenId: string, sToken: string) {
    setPortalLoading(true);
    try {
      const getPortalDataFn = httpsCallable<
        { tokenId: string; sessionToken: string },
        PortalData
      >(fns, "getProviderPortalData");
      const result = await getPortalDataFn({ tokenId: tokenId, sessionToken: sToken });
      setPortalData(result.data);
    } catch {
      // Non-fatal — portal renders with empty state
    } finally {
      setPortalLoading(false);
    }
  }

  // ── OTP: send ──────────────────────────────────────────────────────────────

  const handleSendOTP = useCallback(
    async (method: "email" | "sms") => {
      if (!tokenData) return;
      setAuthLoading(true);
      setOtpError("");
      setOtpMethod(method);

      try {
        const sendFn = httpsCallable<
          { tokenId: string; method: "email" | "sms" },
          { sent: boolean }
        >(fns, "sendProviderOTP");
        await sendFn({ tokenId: tokenData.tokenId, method });
        setOtpSent(true);

        // Resend cooldown
        setResendCooldown(60);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              if (cooldownRef.current) clearInterval(cooldownRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch {
        setOtpError("Failed to send verification code. Please try again.");
      } finally {
        setAuthLoading(false);
      }
    },
    [tokenData]
  );

  // ── OTP: verify ───────────────────────────────────────────────────────────

  const handleVerifyOTP = useCallback(async () => {
    if (!tokenData || otpCode.length < 6) return;
    setAuthLoading(true);
    setOtpError("");

    try {
      const verifyFn = httpsCallable<
        { tokenId: string; otp: string },
        { sessionToken: string; expiresAt: number }
      >(fns, "verifyProviderOTP");
      const result = await verifyFn({ tokenId: tokenData.tokenId, otp: otpCode });
      const { sessionToken: sToken, expiresAt } = result.data;

      saveLocalSession(tokenData.tokenId, { sessionToken: sToken, expiresAt });
      setSessionToken(sToken);
      await loadPortalData(tokenData.tokenId, sToken);
      setStep("portal");
    } catch {
      setOtpError("Invalid or expired code. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }, [tokenData, otpCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── File handling ──────────────────────────────────────────────────────────

  function addFiles(files: FileList | File[]) {
    const MAX_SIZE = 25 * 1024 * 1024;
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"];
    const valid: File[] = [];
    const rejected: string[] = [];

    Array.from(files).forEach((f) => {
      if (f.size > MAX_SIZE) {
        rejected.push(`${f.name} exceeds 25 MB`);
      } else if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|docx|jpg|jpeg|png)$/i)) {
        rejected.push(`${f.name} is not a supported file type`);
      } else {
        valid.push(f);
      }
    });

    if (rejected.length) {
      setUploadError(rejected.join("; "));
    }
    if (valid.length) {
      setSelectedFiles((prev) => [...prev, ...valid]);
      setUploadError("");
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Upload submit ──────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!tokenData || !sessionToken) return;

    if (!selectedIndividual) {
      setUploadError("Please select an individual.");
      return;
    }
    if (!selectedDocType) {
      setUploadError("Please select a document type.");
      return;
    }
    if (selectedFiles.length === 0) {
      setUploadError("Please attach at least one file.");
      return;
    }

    setUploadError("");
    setUploading(true);

    try {
      const uploadFn = httpsCallable<
        {
          tokenId: string;
          sessionToken: string;
          individualId: string;
          documentType: string;
          documentDate: string;
          notes: string;
          fileName: string;
          fileData: string;
          fileType: string;
        },
        { success: boolean; uploadedAt: string }
      >(fns, "providerPortalUpload");

      const individual = (portalData?.individuals ?? tokenData.individuals).find(
        (i) => i.id === selectedIndividual
      );
      const individualName = individual?.name ?? selectedIndividual;

      let lastUploadedAt = new Date().toISOString();

      for (const file of selectedFiles) {
        const fileData = await readFileAsDataURL(file);
        const result = await uploadFn({
          tokenId: tokenData.tokenId,
          sessionToken,
          individualId: selectedIndividual,
          documentType: selectedDocType,
          documentDate,
          notes,
          fileName: file.name,
          fileData,
          fileType: file.type,
        });
        lastUploadedAt = result.data.uploadedAt ?? lastUploadedAt;
      }

      setUploadedDoc({
        fileName: selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} files`,
        individualName,
        documentType: selectedDocType,
        uploadedAt: lastUploadedAt,
      });

      setStep("success");
    } catch {
      setUploadError("Upload failed. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  function resetForAnotherUpload() {
    setSelectedIndividual("");
    setSelectedDocType("");
    setDocumentDate("");
    setNotes("");
    setSelectedFiles([]);
    setUploadError("");
    setUploadedDoc(null);
    setStep("portal");
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  // Validating / loading
  if (step === "validating" && !errorType) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: S.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Spinner size={32} />
          <p style={{ marginTop: 16, color: S.textMuted, fontSize: 15 }}>Verifying portal link…</p>
        </div>
      </div>
    );
  }

  // Error screens
  if (errorType === "revoked") {
    return (
      <ErrorScreen
        title="Portal Link Deactivated"
        message="This portal link has been deactivated. Please contact your coordinator to request a new link."
      />
    );
  }

  if (errorType === "invalid") {
    return (
      <ErrorScreen
        title="Invalid Portal Link"
        message="This portal link is not valid. Please contact your coordinator to request a new link."
      />
    );
  }

  // ── Shared page wrapper ────────────────────────────────────────────────────

  const pageWrapper: React.CSSProperties = {
    minHeight: "100vh",
    background: S.bg,
    padding: "40px 16px 80px",
  };

  const card: React.CSSProperties = {
    background: S.white,
    border: `1px solid ${S.border}`,
    borderRadius: 16,
    padding: "36px 32px",
    maxWidth: 512,
    width: "100%",
    margin: "0 auto",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  };

  const logoText: React.CSSProperties = {
    fontSize: 17,
    fontWeight: 700,
    color: S.primary,
    marginBottom: 28,
    letterSpacing: "-0.3px",
  };

  const label: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: S.labelColor,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 13px",
    border: `1.5px solid ${S.border}`,
    borderRadius: 8,
    fontSize: 15,
    color: S.text,
    background: S.inputBg,
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 0.15s",
  };

  const primaryBtn = (disabled = false): React.CSSProperties => ({
    width: "100%",
    padding: "12px 20px",
    background: disabled ? "#93c5fd" : S.primary,
    color: S.white,
    border: "none",
    borderRadius: 9,
    fontSize: 15,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "background 0.15s",
  });

  const secondaryBtn: React.CSSProperties = {
    background: "none",
    border: `1.5px solid ${S.border}`,
    borderRadius: 9,
    padding: "10px 16px",
    fontSize: 14,
    color: S.textMuted,
    cursor: "pointer",
    width: "100%",
    marginTop: 10,
  };

  const fieldGroup: React.CSSProperties = { marginBottom: 20 };

  // ── Auth step ──────────────────────────────────────────────────────────────

  if (step === "auth") {
    const { maskedEmail, maskedPhone, providerName } = tokenData!;

    if (!otpSent) {
      return (
        <div style={pageWrapper}>
          <div style={card}>
            <div style={logoText}>CaseManagement.AI</div>
            <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: S.text }}>
              {providerName}
            </h1>
            <p style={{ margin: "0 0 24px", color: S.textMuted, fontSize: 15 }}>
              Secure Document Upload Portal
            </p>
            <p style={{ margin: "0 0 24px", fontSize: 15, color: S.text, lineHeight: 1.6 }}>
              Verify your identity to continue. We'll send a one-time code to confirm
              you're authorized.
            </p>

            {maskedEmail && (
              <div style={fieldGroup}>
                <label style={label}>EMAIL</label>
                <div
                  style={{
                    padding: "10px 13px",
                    background: "#f8fafc",
                    border: `1.5px solid ${S.border}`,
                    borderRadius: 8,
                    fontSize: 15,
                    color: S.text,
                    marginBottom: 10,
                  }}
                >
                  {maskedEmail}
                </div>
                <button
                  style={primaryBtn(authLoading)}
                  disabled={authLoading}
                  onClick={() => handleSendOTP("email")}
                >
                  {authLoading ? <Spinner size={18} color="#fff" /> : null}
                  Send verification code
                </button>
              </div>
            )}

            {maskedPhone && (
              <div style={{ marginTop: 16 }}>
                <p style={{ margin: "0 0 10px", fontSize: 14, color: S.textMuted }}>
                  Or verify via SMS: {maskedPhone}
                </p>
                <button
                  style={secondaryBtn}
                  disabled={authLoading}
                  onClick={() => handleSendOTP("sms")}
                >
                  Send SMS code instead
                </button>
              </div>
            )}

            {otpError && (
              <p style={{ marginTop: 14, color: S.red, fontSize: 14 }}>{otpError}</p>
            )}
          </div>
        </div>
      );
    }

    // OTP entry
    const maskedDest = otpMethod === "email" ? maskedEmail : maskedPhone;
    return (
      <div style={pageWrapper}>
        <div style={card}>
          <div style={logoText}>CaseManagement.AI</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: S.text }}>
            Enter verification code
          </h2>
          <p style={{ margin: "0 0 24px", color: S.textMuted, fontSize: 15, lineHeight: 1.5 }}>
            Enter the 6-digit code sent to {maskedDest}.
          </p>

          <div style={fieldGroup}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otpCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtpCode(val);
                setOtpError("");
              }}
              style={{
                ...inputStyle,
                letterSpacing: "0.25em",
                fontSize: 22,
                textAlign: "center",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && otpCode.length === 6) handleVerifyOTP();
              }}
              autoFocus
            />
          </div>

          <p style={{ margin: "0 0 16px", fontSize: 13, color: S.textMuted }}>
            Code expires in 10 minutes.
          </p>

          <button
            style={primaryBtn(authLoading || otpCode.length < 6)}
            disabled={authLoading || otpCode.length < 6}
            onClick={handleVerifyOTP}
          >
            {authLoading ? <Spinner size={18} color="#fff" /> : null}
            Verify →
          </button>

          <button
            style={{
              ...secondaryBtn,
              opacity: resendCooldown > 0 ? 0.5 : 1,
              cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
            }}
            disabled={resendCooldown > 0 || authLoading}
            onClick={() => {
              setOtpCode("");
              handleSendOTP(otpMethod);
            }}
          >
            {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
          </button>

          {otpError && (
            <p style={{ marginTop: 14, color: S.red, fontSize: 14 }}>{otpError}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Portal step ────────────────────────────────────────────────────────────

  if (step === "portal") {
    const individuals = portalData?.individuals ?? tokenData?.individuals ?? [];
    const recentUploads = portalData?.recentUploads ?? [];
    const providerName = tokenData?.providerName ?? "Provider";

    return (
      <div style={pageWrapper}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: 512,
            margin: "0 auto 28px",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: S.primary }}>
            CaseManagement.AI
          </span>
          <span style={{ fontSize: 14, color: S.textMuted }}>{providerName}</span>
        </div>

        <div style={card}>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: S.text }}>
            {providerName}
          </h1>
          <p style={{ margin: "0 0 28px", color: S.textMuted, fontSize: 15 }}>
            Secure Document Upload Portal
          </p>

          {/* Section header */}
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: S.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 20,
            }}
          >
            Upload a Document
          </div>

          {/* Individual */}
          <div style={fieldGroup}>
            <label style={label}>
              Individual <span style={{ color: S.red }}>*</span>
            </label>
            {portalLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: S.textMuted }}>
                <Spinner size={16} />
                <span style={{ fontSize: 14 }}>Loading…</span>
              </div>
            ) : (
              <select
                value={selectedIndividual}
                onChange={(e) => setSelectedIndividual(e.target.value)}
                style={{ ...inputStyle, appearance: "auto" }}
              >
                <option value="">Select individual</option>
                {individuals.map((ind) => (
                  <option key={ind.id} value={ind.id}>
                    {ind.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Document Type */}
          <div style={fieldGroup}>
            <label style={label}>
              Document Type <span style={{ color: S.red }}>*</span>
            </label>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              style={{ ...inputStyle, appearance: "auto" }}
            >
              <option value="">Select type</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Document Date */}
          <div style={fieldGroup}>
            <label style={label}>Document Date</label>
            <input
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Notes */}
          <div style={fieldGroup}>
            <label style={label}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any context for the case manager"
              rows={3}
              style={{
                ...inputStyle,
                resize: "vertical" as const,
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* File drop zone */}
          <div style={fieldGroup}>
            <label style={label}>
              Upload Files <span style={{ color: S.red }}>*</span>
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? S.primary : S.border}`,
                borderRadius: 10,
                padding: "28px 20px",
                textAlign: "center",
                cursor: "pointer",
                background: isDragging ? "#eff6ff" : "#fafafa",
                transition: "all 0.15s",
                marginBottom: 10,
              }}
            >
              <Upload size={28} style={{ color: isDragging ? S.primary : S.textMuted, marginBottom: 8 }} />
              <p style={{ margin: "0 0 4px", fontSize: 15, color: isDragging ? S.primary : S.text, fontWeight: 500 }}>
                Drag files here or click to browse
              </p>
              <p style={{ margin: 0, fontSize: 13, color: S.textMuted }}>
                Accepts PDF, DOCX, JPG, PNG · Max 25 MB per file
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                onChange={handleFileInput}
                style={{ display: "none" }}
              />
            </div>

            {selectedFiles.map((f, i) => (
              <FileChip key={`${f.name}-${i}`} file={f} onRemove={() => removeFile(i)} />
            ))}
          </div>

          {uploadError && (
            <p style={{ margin: "0 0 14px", color: S.red, fontSize: 14 }}>{uploadError}</p>
          )}

          <button
            style={primaryBtn(uploading || selectedFiles.length === 0)}
            disabled={uploading || selectedFiles.length === 0}
            onClick={handleUpload}
          >
            {uploading ? <Spinner size={18} color="#fff" /> : <Upload size={18} />}
            {uploading ? "Uploading…" : "Upload Document(s) →"}
          </button>

          {/* Recent uploads */}
          {recentUploads.length > 0 && (
            <div style={{ marginTop: 36 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: S.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 14,
                }}
              >
                Recent Uploads (your uploads only)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recentUploads.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: S.greenBg,
                      border: "1px solid #a7f3d0",
                      borderRadius: 8,
                    }}
                  >
                    <CheckCircle2 size={16} style={{ color: S.green, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: S.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {u.fileName}
                      </div>
                      <div style={{ fontSize: 12, color: S.textMuted }}>
                        {u.individualName} · {u.documentType}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: S.textMuted, flexShrink: 0 }}>
                      {formatDateTime(u.uploadedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security footer */}
          <div
            style={{
              marginTop: 32,
              paddingTop: 20,
              borderTop: `1px solid ${S.border}`,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              color: S.textMuted,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 1, color: S.green }} />
            <span>
              This is a secure, verified portal. Documents are encrypted and go directly
              to the case management system.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Success step ───────────────────────────────────────────────────────────

  if (step === "success" && uploadedDoc) {
    return (
      <div style={pageWrapper}>
        <div style={{ ...card, textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: S.greenBg,
              border: `2px solid #a7f3d0`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <CheckCircle2 size={32} style={{ color: S.green }} />
          </div>

          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: S.text }}>
            Document uploaded successfully!
          </h2>

          <div
            style={{
              background: "#f8fafc",
              border: `1px solid ${S.border}`,
              borderRadius: 10,
              padding: "14px 18px",
              margin: "20px 0",
              textAlign: "left",
            }}
          >
            <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: S.text }}>
              {uploadedDoc.fileName}
            </p>
            <p style={{ margin: "0 0 4px", fontSize: 14, color: S.textMuted }}>
              {uploadedDoc.individualName} · {uploadedDoc.documentType}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: S.textMuted }}>
              Uploaded: {formatDateTime(uploadedDoc.uploadedAt)}
            </p>
          </div>

          <p style={{ margin: "0 0 28px", color: S.textMuted, fontSize: 15, lineHeight: 1.6 }}>
            Your document has been received and will be reviewed by the care team.
          </p>

          <button style={primaryBtn()} onClick={resetForAnotherUpload}>
            Upload another document →
          </button>
        </div>
      </div>
    );
  }

  return null;
}
