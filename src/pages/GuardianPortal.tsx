/**
 * GuardianPortal — Public-facing portal for guardians/family members.
 * Route: /guardian-portal/:token/*
 *
 * COMPLETELY PUBLIC — no Firebase Auth, no ICMShell.
 * Consumer-facing mobile experience, inline styles only.
 *
 * Sub-pages:
 *   /home      — dashboard overview
 *   /consents  — consent records
 *   /care-plan — individual care plan (read-only)
 *   /messages  — messaging thread with staff
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  collection, query, where, getDocs, doc, getDoc,
  updateDoc, addDoc, serverTimestamp, orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

// ─── Core palette (inline styles only — intentionally different from staff app) ──

const S = {
  bg: "#f8fafc",
  white: "#fff",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
  green: "#059669",
  amber: "#f59e0b",
  primary: "#6366f1",
  red: "#dc2626",
  greenBg: "#ecfdf5",
  amberBg: "#fffbeb",
};

const card = {
  background: S.white,
  borderRadius: 12,
  padding: "16px 20px",
  margin: "0 16px 12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  border: `1px solid ${S.border}`,
};

const navRow = {
  padding: "14px 0",
  borderBottom: `1px solid #f1f5f9`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortalSession {
  id: string;
  individualId: string;
  guardianName: string;
  guardianPhone: string;
  consentIds: string[];
  sessionExpiresAt: Timestamp | Date | null;
  revokedAt: Timestamp | Date | null;
  consentTokenHash?: string;
  orgId?: string;
  tenantId?: string;
}

interface Individual {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  county?: string;
  program?: string;
  case_manager_name?: string;
  assigned_cm?: string;
}

interface CarePlan {
  id: string;
  title?: string;
  plan_type?: string;
  status?: string;
  effective_date?: Timestamp | string | null;
  renewal_date?: string | null;
  goals?: Array<{ text?: string; goal?: string; target_date?: string; status?: string }>;
  individual_id?: string;
  individualId?: string;
  created_at?: Timestamp | null;
}

interface ConsentRecord {
  id: string;
  consentType?: string;
  status?: string;
  signedAt?: Timestamp | string | null;
  sentAt?: Timestamp | string | null;
  expiresAt?: Timestamp | string | null;
  recipientName?: string;
  consentBodyHtml?: string;
  description?: string;
}

interface Message {
  id: string;
  senderType: "guardian" | "staff";
  senderName: string;
  text: string;
  createdAt: Timestamp | null;
  read?: boolean;
}

// ─── SHA-256 token hash ───────────────────────────────────────────────────────

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Helper formatters ────────────────────────────────────────────────────────

function formatDate(val: Timestamp | string | null | undefined): string {
  if (!val) return "—";
  try {
    const d = val instanceof Timestamp ? val.toDate() : new Date(val as string);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

function timeAgo(val: Timestamp | null | undefined): string {
  if (!val) return "Unknown";
  try {
    const d = val instanceof Timestamp ? val.toDate() : new Date(val as any);
    const diffMs = Date.now() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${diffH} hour${diffH > 1 ? "s" : ""} ago`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD} day${diffD > 1 ? "s" : ""} ago`;
  } catch {
    return "Unknown";
  }
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function individualDisplayName(ind: Individual | null): string {
  if (!ind) return "your individual";
  if (ind.first_name && ind.last_name) return `${ind.first_name} ${ind.last_name}`;
  if (ind.name) return ind.name;
  return "Individual";
}

function guardianFirstName(fullName: string): string {
  return fullName.split(" ")[0] || fullName;
}

// ─── Expired / Invalid screen ─────────────────────────────────────────────────

function ExpiredScreen() {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", background: S.bg, minHeight: "100vh" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: S.text }}>This link has expired</h1>
      <p style={{ color: S.textMuted, marginTop: 8 }}>
        Please contact your support coordinator for a new link.
      </p>
    </div>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: S.bg,
        gap: 16,
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color: S.text }}>CaseManagement.AI</div>
      <div style={{ color: S.textMuted, fontSize: 14 }}>Loading your secure portal…</div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: S.primary,
              animation: "bounce 1.2s infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Portal Header ────────────────────────────────────────────────────────────

function PortalHeader({
  guardianName,
  onSignOut,
}: {
  guardianName: string;
  onSignOut: () => void;
}) {
  return (
    <div
      style={{
        background: S.white,
        borderBottom: `1px solid ${S.border}`,
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: S.text }}>CaseManagement.AI</div>
        <div style={{ fontSize: 12, color: S.textMuted }}>Secure Portal</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <span style={{ fontSize: 13, color: S.text, fontWeight: 600 }}>{guardianName}</span>
        <span
          style={{
            fontSize: 11,
            color: S.green,
            background: S.greenBg,
            padding: "1px 8px",
            borderRadius: 20,
          }}
        >
          ● Verified
        </span>
        <button
          onClick={onSignOut}
          style={{
            fontSize: 11,
            color: S.textMuted,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

function BottomNav({
  token,
  active,
}: {
  token: string;
  active: "home" | "consents" | "care-plan" | "messages";
}) {
  const navigate = useNavigate();
  const tabs = [
    { key: "home", label: "Home", icon: "🏠" },
    { key: "consents", label: "Consents", icon: "📄" },
    { key: "care-plan", label: "Care Plan", icon: "📋" },
    { key: "messages", label: "Messages", icon: "💬" },
  ] as const;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: S.white,
        borderTop: `1px solid ${S.border}`,
        display: "flex",
        zIndex: 20,
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => navigate(`/guardian-portal/${token}/${t.key}`)}
          style={{
            flex: 1,
            padding: "10px 0 8px",
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            color: active === t.key ? S.primary : S.textMuted,
            fontSize: 11,
            fontWeight: active === t.key ? 700 : 400,
          }}
        >
          <span style={{ fontSize: 20 }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Portal Home ──────────────────────────────────────────────────────────────

function PortalHome({
  session,
  individual,
  carePlan,
  consents,
  messages,
  token,
}: {
  session: PortalSession;
  individual: Individual | null;
  carePlan: CarePlan | null;
  consents: ConsentRecord[];
  messages: Message[];
  token: string;
}) {
  const navigate = useNavigate();
  const pendingConsents = consents.filter(
    (c) => c.status !== "signed" && c.status !== "voided" && c.status !== "expired"
  );
  const signedConsents = consents.filter((c) => c.status === "signed");
  const lastMsg = messages[messages.length - 1];
  const firstName = guardianFirstName(session.guardianName);
  const indName = individualDisplayName(individual);

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Pending action banner */}
      {pendingConsents.length > 0 && (
        <div
          style={{
            background: S.amberBg,
            borderBottom: `1px solid #fde68a`,
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
              {pendingConsents.length} consent{pendingConsents.length > 1 ? "s" : ""} pending your signature
            </div>
            <div style={{ fontSize: 12, color: "#b45309" }}>Tap Consents to review and sign</div>
          </div>
          <button
            onClick={() => navigate(`/guardian-portal/${token}/consents`)}
            style={{
              background: S.amber,
              color: S.white,
              border: "none",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Review
          </button>
        </div>
      )}

      {/* Greeting */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: S.text }}>
          {getGreeting()}, {firstName}.
        </div>
        <div style={{ fontSize: 14, color: S.textMuted, marginTop: 4 }}>
          Here's {indName}'s care summary.
        </div>
      </div>

      {/* Care Plan card */}
      <div style={{ margin: "16px 16px 0" }}>
        <div
          style={{ ...card, margin: 0, cursor: "pointer" }}
          onClick={() => navigate(`/guardian-portal/${token}/care-plan`)}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, color: S.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                Care Plan
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: S.text, marginTop: 2 }}>
                {carePlan?.title || carePlan?.plan_type || "Active Plan"}
              </div>
              {carePlan?.renewal_date && (
                <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
                  Renewal: {formatDate(carePlan.renewal_date as any)}
                </div>
              )}
            </div>
            <span style={{ fontSize: 20, color: S.textMuted }}>›</span>
          </div>
        </div>
      </div>

      {/* Consents card */}
      <div style={{ margin: "12px 16px 0" }}>
        <div
          style={{ ...card, margin: 0, cursor: "pointer" }}
          onClick={() => navigate(`/guardian-portal/${token}/consents`)}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, color: S.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                Consents
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: S.text, marginTop: 2 }}>
                {signedConsents.length} signed · {pendingConsents.length} pending
              </div>
            </div>
            <span style={{ fontSize: 20, color: S.textMuted }}>›</span>
          </div>
        </div>
      </div>

      {/* Messages card */}
      <div style={{ margin: "12px 16px 0" }}>
        <div
          style={{ ...card, margin: 0, cursor: "pointer" }}
          onClick={() => navigate(`/guardian-portal/${token}/messages`)}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: S.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                Messages
              </div>
              {lastMsg ? (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, color: S.text, marginTop: 2 }}>
                    {lastMsg.senderName}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: S.textMuted,
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {lastMsg.text}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 14, color: S.textMuted, marginTop: 2 }}>No messages yet</div>
              )}
            </div>
            <span style={{ fontSize: 20, color: S.textMuted, flexShrink: 0, marginLeft: 8 }}>›</span>
          </div>
        </div>
      </div>

      {/* Care Team card */}
      {individual && (individual.case_manager_name || individual.assigned_cm) && (
        <div style={{ margin: "12px 16px 0" }}>
          <div style={{ ...card, margin: 0 }}>
            <div style={{ fontSize: 11, color: S.textMuted, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>
              Care Team
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#e0e7ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
              >
                👤
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: S.text }}>
                  {individual.case_manager_name || individual.assigned_cm}
                </div>
                <div style={{ fontSize: 12, color: S.textMuted }}>Case Manager</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security footer */}
      <div
        style={{
          margin: "20px 16px 0",
          padding: "12px 16px",
          background: "#f0fdf4",
          borderRadius: 10,
          border: "1px solid #bbf7d0",
          fontSize: 12,
          color: "#166534",
          textAlign: "center",
        }}
      >
        🔒 This is a secure, verified portal. Your identity was verified via SMS.
      </div>
    </div>
  );
}

// ─── Portal Consents ──────────────────────────────────────────────────────────

function PortalConsents({
  consents,
  token,
  rawToken,
}: {
  consents: ConsentRecord[];
  token: string;
  rawToken: string;
}) {
  const navigate = useNavigate();
  const [viewConsent, setViewConsent] = useState<ConsentRecord | null>(null);

  const signed = consents.filter((c) => c.status === "signed");
  const pending = consents.filter(
    (c) => c.status !== "signed" && c.status !== "voided" && c.status !== "expired"
  );
  const expired = consents.filter((c) => c.status === "expired" || c.status === "voided");

  function ConsentGroup({ label, items, color }: { label: string; items: ConsentRecord[]; color: string }) {
    if (items.length === 0) return null;
    return (
      <div style={{ margin: "0 16px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          {label}
        </div>
        {items.map((c) => (
          <div key={c.id} style={{ ...card, margin: "0 0 8px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: S.text }}>{c.consentType}</div>
            {c.status === "signed" && (
              <>
                <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
                  Signed: {formatDate(c.signedAt)}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => setViewConsent(c)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      background: "#f1f5f9",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: S.text,
                      cursor: "pointer",
                    }}
                  >
                    View document
                  </button>
                  <button
                    onClick={() => toast.info("Download coming soon")}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      background: "#f1f5f9",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: S.text,
                      cursor: "pointer",
                    }}
                  >
                    Download PDF
                  </button>
                </div>
              </>
            )}
            {c.status !== "signed" && c.status !== "expired" && c.status !== "voided" && (
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => navigate(`/consent/${rawToken}`)}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    background: S.primary,
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    color: S.white,
                    cursor: "pointer",
                  }}
                >
                  Sign this consent →
                </button>
              </div>
            )}
            {(c.status === "expired" || c.status === "voided") && (
              <div style={{ fontSize: 12, color: S.textMuted, marginTop: 4, fontStyle: "italic" }}>
                {c.status === "expired" ? "Expired" : "Voided"}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: "16px 20px 8px" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: S.text }}>Consents</div>
        <div style={{ fontSize: 13, color: S.textMuted, marginTop: 2 }}>
          {consents.length} total · {signed.length} signed · {pending.length} pending
        </div>
      </div>

      <ConsentGroup label="Pending Your Signature" items={pending} color={S.amber} />
      <ConsentGroup label="Signed" items={signed} color={S.green} />
      <ConsentGroup label="Expired / Voided" items={expired} color={S.textMuted} />

      {consents.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: S.textMuted }}>
          No consent records found.
        </div>
      )}

      {/* Consent document modal */}
      {viewConsent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 50,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => setViewConsent(null)}
        >
          <div
            style={{
              background: S.white,
              borderRadius: "20px 20px 0 0",
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              padding: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: S.text }}>{viewConsent.consentType}</div>
              <button
                onClick={() => setViewConsent(null)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: S.textMuted }}
              >
                ✕
              </button>
            </div>
            {viewConsent.consentBodyHtml ? (
              <div
                style={{ fontSize: 14, color: S.text, lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: viewConsent.consentBodyHtml }}
              />
            ) : (
              <div style={{ fontSize: 14, color: S.text, lineHeight: 1.6 }}>
                {viewConsent.description || "No document content available."}
              </div>
            )}
            <div style={{ marginTop: 16, fontSize: 12, color: S.textMuted }}>
              Signed: {formatDate(viewConsent.signedAt)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Portal Care Plan ─────────────────────────────────────────────────────────

function PortalCarePlan({
  carePlan,
  individual,
}: {
  carePlan: CarePlan | null;
  individual: Individual | null;
}) {
  if (!carePlan) {
    return (
      <div style={{ paddingBottom: 80 }}>
        <div style={{ padding: "16px 20px 8px" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: S.text }}>Care Plan</div>
        </div>
        <div style={{ textAlign: "center", padding: "40px 20px", color: S.textMuted }}>
          No active care plan on file.
        </div>
      </div>
    );
  }

  const goals = carePlan.goals ?? [];

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: "16px 20px 8px" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: S.text }}>Care Plan</div>
        <div style={{ fontSize: 13, color: S.textMuted, marginTop: 2 }}>Read-only view</div>
      </div>

      {/* Plan summary card */}
      <div style={{ ...card }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: S.text }}>
            {carePlan.title || carePlan.plan_type || "Care Plan"}
          </div>
          <span
            style={{
              display: "inline-block",
              marginTop: 4,
              fontSize: 11,
              fontWeight: 700,
              color: S.green,
              background: S.greenBg,
              padding: "2px 10px",
              borderRadius: 20,
            }}
          >
            {carePlan.status || "Active"}
          </span>
        </div>
        <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: 10, marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {carePlan.effective_date && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: S.textMuted }}>Effective date</span>
              <span style={{ color: S.text, fontWeight: 600 }}>{formatDate(carePlan.effective_date as any)}</span>
            </div>
          )}
          {carePlan.renewal_date && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: S.textMuted }}>Renewal date</span>
              <span style={{ color: S.text, fontWeight: 600 }}>{formatDate(carePlan.renewal_date as any)}</span>
            </div>
          )}
          {individual && (individual.case_manager_name || individual.assigned_cm) && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: S.textMuted }}>Case manager</span>
              <span style={{ color: S.text, fontWeight: 600 }}>
                {individual.case_manager_name || individual.assigned_cm}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Goals */}
      {goals.length > 0 && (
        <div style={{ ...card }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: S.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Goals ({goals.length})
          </div>
          {goals.map((g, i) => (
            <div key={i} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: i < goals.length - 1 ? `1px solid ${S.border}` : "none" }}>
              <div style={{ fontSize: 14, color: S.text, fontWeight: 500 }}>
                {g.text || g.goal || `Goal ${i + 1}`}
              </div>
              {g.target_date && (
                <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
                  Target: {g.target_date}
                </div>
              )}
              {g.status && (
                <div
                  style={{
                    display: "inline-block",
                    marginTop: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    color: g.status.toLowerCase().includes("complet") ? S.green : S.primary,
                    background: g.status.toLowerCase().includes("complet") ? S.greenBg : "#eef2ff",
                    padding: "1px 8px",
                    borderRadius: 12,
                  }}
                >
                  {g.status}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Portal Messages ──────────────────────────────────────────────────────────

function PortalMessages({
  session,
  individualId,
  messages,
  onSend,
}: {
  session: PortalSession;
  individualId: string;
  messages: Message[];
  onSend: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText("");
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px - 56px)", paddingBottom: 0 }}>
      {/* Header */}
      <div style={{ padding: "12px 20px 8px", borderBottom: `1px solid ${S.border}`, background: S.white }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: S.text }}>Messages</div>
        <div style={{ fontSize: 12, color: S.textMuted }}>Secure communication with your care team</div>
      </div>

      {/* Thread */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 16px 8px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: S.textMuted, fontSize: 13, marginTop: 40 }}>
            No messages yet. Send a message to your care team below.
          </div>
        )}
        {messages.map((msg) => {
          const isGuardian = msg.senderType === "guardian";
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent: isGuardian ? "flex-end" : "flex-start",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  background: isGuardian ? S.primary : S.white,
                  color: isGuardian ? S.white : S.text,
                  borderRadius: isGuardian ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  padding: "10px 14px",
                  border: isGuardian ? "none" : `1px solid ${S.border}`,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                {!isGuardian && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: S.primary, marginBottom: 3 }}>
                    {msg.senderName}
                  </div>
                )}
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>{msg.text}</div>
                <div
                  style={{
                    fontSize: 10,
                    marginTop: 4,
                    color: isGuardian ? "rgba(255,255,255,0.65)" : S.textMuted,
                    textAlign: "right",
                  }}
                >
                  {msg.createdAt ? timeAgo(msg.createdAt) : ""}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: `1px solid ${S.border}`,
          background: S.white,
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          style={{
            flex: 1,
            borderRadius: 20,
            border: `1px solid ${S.border}`,
            padding: "10px 14px",
            fontSize: 14,
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            background: "#f8fafc",
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: S.primary,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            opacity: sending || !text.trim() ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          {sending ? "…" : "↑"}
        </button>
      </div>
    </div>
  );
}

// ─── Main GuardianPortal component ───────────────────────────────────────────

export default function GuardianPortal() {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [session, setSession] = useState<PortalSession | null>(null);
  const [individual, setIndividual] = useState<Individual | null>(null);
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const rawToken = token ?? "";

  // Determine sub-page
  const path = location.pathname;
  let subPage: "home" | "consents" | "care-plan" | "messages" = "home";
  if (path.endsWith("/consents")) subPage = "consents";
  else if (path.endsWith("/care-plan")) subPage = "care-plan";
  else if (path.endsWith("/messages")) subPage = "messages";
  else if (!path.endsWith("/home")) {
    // default redirect
    if (rawToken) {
      navigate(`/guardian-portal/${rawToken}/home`, { replace: true });
    }
  }

  // Sign out
  const handleSignOut = useCallback(() => {
    localStorage.removeItem("guardian_portal_token");
    navigate("/");
  }, [navigate]);

  // Send message
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!session || !rawToken) return;
      await addDoc(collection(db, "guardian_messages"), {
        individualId: session.individualId,
        sessionId: session.id,
        senderType: "guardian",
        senderName: session.guardianName,
        text,
        createdAt: serverTimestamp(),
        read: false,
      });
      // Refresh messages
      const snap = await getDocs(
        query(
          collection(db, "guardian_messages"),
          where("individualId", "==", session.individualId),
          orderBy("createdAt", "asc")
        )
      );
      setMessages(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, "id">) }))
      );
    },
    [session, rawToken]
  );

  // Validate session on mount
  useEffect(() => {
    if (!rawToken) {
      setValid(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function validate() {
      try {
        // Hash the token
        const hash = await sha256Hex(rawToken);

        // Query guardian_portal_sessions by hash
        const sessSnap = await getDocs(
          query(
            collection(db, "guardian_portal_sessions"),
            where("consentTokenHash", "==", hash)
          )
        );

        if (sessSnap.empty || cancelled) {
          if (!cancelled) { setValid(false); setLoading(false); }
          return;
        }

        const sessDoc = sessSnap.docs[0];
        const sessData = sessDoc.data() as Omit<PortalSession, "id">;

        // Check revoked
        if (sessData.revokedAt !== null && sessData.revokedAt !== undefined) {
          setValid(false);
          setLoading(false);
          return;
        }

        // Check expiry
        if (sessData.sessionExpiresAt) {
          const expiresDate =
            sessData.sessionExpiresAt instanceof Timestamp
              ? sessData.sessionExpiresAt.toDate()
              : new Date(sessData.sessionExpiresAt as any);
          if (expiresDate < new Date()) {
            setValid(false);
            setLoading(false);
            return;
          }
        }

        const sess: PortalSession = { id: sessDoc.id, ...sessData };
        setSession(sess);

        // Update lastActiveAt
        updateDoc(sessDoc.ref, { lastActiveAt: serverTimestamp() }).catch(() => {});

        // Load individual
        let indData: Individual | null = null;
        try {
          const indDoc = await getDoc(doc(db, "individuals", sess.individualId));
          if (indDoc.exists()) {
            indData = { id: indDoc.id, ...(indDoc.data() as Omit<Individual, "id">) };
            setIndividual(indData);
          }
        } catch {
          // individual load failed — non-fatal
        }

        // Load care plan
        try {
          const cpSnap = await getDocs(
            query(
              collection(db, "care_plans"),
              where("individual_id", "==", sess.individualId)
            )
          );
          const activePlans = cpSnap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<CarePlan, "id">) }))
            .filter((p) => {
              const s = (p.status ?? "").toLowerCase();
              return s === "active" || s === "approved";
            })
            .sort((a, b) => {
              const aT = a.created_at instanceof Timestamp ? a.created_at.toMillis() : 0;
              const bT = b.created_at instanceof Timestamp ? b.created_at.toMillis() : 0;
              return bT - aT;
            });
          if (activePlans.length > 0) setCarePlan(activePlans[0]);
        } catch {
          // care plan load failed — non-fatal
        }

        // Load consents
        if (sess.consentIds && sess.consentIds.length > 0) {
          try {
            const consentDocs: ConsentRecord[] = [];
            // Load from top-level consent_requests collection
            const cReqSnap = await getDocs(
              query(
                collection(db, "consent_requests"),
                where("__name__", "in", sess.consentIds.slice(0, 10))
              )
            );
            cReqSnap.docs.forEach((d) => {
              consentDocs.push({ id: d.id, ...(d.data() as Omit<ConsentRecord, "id">) });
            });
            // Also try loading from individual subcollection
            if (consentDocs.length < sess.consentIds.length) {
              const subSnap = await getDocs(
                collection(db, "individuals", sess.individualId, "consents")
              );
              subSnap.docs.forEach((d) => {
                if (sess.consentIds.includes(d.id) && !consentDocs.find((c) => c.id === d.id)) {
                  consentDocs.push({ id: d.id, ...(d.data() as Omit<ConsentRecord, "id">) });
                }
              });
            }
            setConsents(consentDocs);
          } catch {
            // consents load failed — non-fatal
          }
        }

        // Load messages
        try {
          const msgSnap = await getDocs(
            query(
              collection(db, "guardian_messages"),
              where("individualId", "==", sess.individualId),
              orderBy("createdAt", "asc")
            )
          );
          setMessages(
            msgSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, "id">) }))
          );
        } catch {
          // messages load failed — non-fatal
        }

        if (!cancelled) {
          setValid(true);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setValid(false);
          setLoading(false);
        }
      }
    }

    validate();
    return () => { cancelled = true; };
  }, [rawToken]);

  if (loading) return <LoadingScreen />;
  if (!valid || !session) return <ExpiredScreen />;

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>
      <div style={{ background: S.bg, minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>
        <PortalHeader guardianName={session.guardianName} onSignOut={handleSignOut} />

        {subPage === "home" && (
          <PortalHome
            session={session}
            individual={individual}
            carePlan={carePlan}
            consents={consents}
            messages={messages}
            token={rawToken}
          />
        )}
        {subPage === "consents" && (
          <PortalConsents
            consents={consents}
            token={rawToken}
            rawToken={rawToken}
          />
        )}
        {subPage === "care-plan" && (
          <PortalCarePlan
            carePlan={carePlan}
            individual={individual}
          />
        )}
        {subPage === "messages" && (
          <PortalMessages
            session={session}
            individualId={session.individualId}
            messages={messages}
            onSend={handleSendMessage}
          />
        )}

        <BottomNav token={rawToken} active={subPage} />
      </div>
    </>
  );
}
