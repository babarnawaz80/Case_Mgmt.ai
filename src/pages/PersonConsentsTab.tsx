/**
 * PersonConsentsTab — Consent management for an individual.
 * Shown as the "Consents" tab in the individual profile.
 *
 * Features:
 *  - Summary stats (total / signed / pending / expired)
 *  - Consent records table with status badges
 *  - "+ New Consent Request" 4-step modal (Type → Compose → Recipient → Review & Send)
 *  - Resend / View / Void actions
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileText, Plus, Send, RefreshCw, XCircle, CheckCircle2,
  Clock, AlertTriangle, ChevronRight, Phone, User, Loader2, X,
  Shield, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useConsents, addConsent, updateConsent, computeConsentStatus, type ConsentRecord, type ConsentType } from "@/hooks/useFirestore";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import type { Individual } from "@/hooks/useIndividuals";
import { ConsentComposerStep } from "@/components/consent/ConsentComposerStep";
import { findUnfilledPlaceholders } from "@/components/consent/consentTemplates";
import { useOrgSettings } from "@/contexts/OrgSettingsContext";

// ─── Default consent types & descriptions ────────────────────────────────────

type ConsentTypeDef = { id: string; label: string; description: string };

const DEFAULT_CONSENT_TYPES: ConsentTypeDef[] = [
  { id: "roi",         label: "Release of Information (ROI)",                description: "Authorization to release or exchange information with designated parties for the purpose of coordinating care and services." },
  { id: "services",   label: "Consent to Receive Services",                  description: "Authorization to receive case management and related support services as outlined in the Individual's service plan." },
  { id: "electronic", label: "Consent for Electronic Communication",         description: "Authorization to communicate via email, text message, and electronic portal for service coordination purposes." },
  { id: "provider",   label: "Consent to Share with Provider",               description: "Authorization to share relevant health and service information with the individual's service providers." },
  { id: "photo",      label: "Consent for Photography / Video Recording",    description: "Authorization to photograph or record the individual for the purpose of program documentation." },
  { id: "emergency",  label: "Emergency Medical Consent",                    description: "Authorization for emergency medical treatment in the event the guardian cannot be reached." },
  { id: "rights",     label: "Guardian Acknowledgment of Rights",            description: "Acknowledgment that the individual's rights have been reviewed and understood." },
  { id: "ambient",    label: "Ambient Listening Consent",                    description: "Authorization to use ambient listening technology during case management sessions for documentation purposes." },
  { id: "bsp",        label: "Behavioral Support Plan Consent",              description: "Authorization to implement the Behavioral Support Plan as written." },
  { id: "hipaa",      label: "HIPAA Notice of Privacy Practices",            description: "Acknowledgment of receipt of the Notice of Privacy Practices as required by HIPAA." },
];

// ─── Status helpers ───────────────────────────────────────────────────────────

type ConsentStatus = "draft" | "sent" | "pending_signature" | "signed" | "expired" | "declined" | "voided";

const STATUS_BADGE: Record<ConsentStatus, { label: string; cls: string }> = {
  draft:             { label: "Draft",             cls: "bg-icm-bg text-icm-text-dim ring-icm-border" },
  sent:              { label: "Sent",              cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  pending_signature: { label: "Pending Signature", cls: "bg-orange-50 text-orange-700 ring-orange-200" },
  signed:            { label: "Signed",            cls: "bg-icm-green-soft text-icm-green ring-icm-green/20" },
  expired:           { label: "Expired",           cls: "bg-icm-red-soft text-icm-red ring-icm-red/20" },
  declined:          { label: "Declined",          cls: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20" },
  voided:            { label: "Voided",            cls: "bg-icm-bg text-icm-text-faint ring-icm-border" },
};

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `***-***-${digits.slice(-4)}`;
}

function formatDate(ts: any): string {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Main component ───────────────────────────────────────────────────────────

// ─── Guardian Portal Session type ────────────────────────────────────────────

interface GuardianPortalSession {
  id: string;
  guardianName: string;
  guardianPhone?: string;
  consentIds: string[];
  sessionExpiresAt: Timestamp | Date | null;
  revokedAt: Timestamp | Date | null;
  lastActiveAt?: Timestamp | Date | null;
  consentTokenHash?: string;
}

function formatSessionDate(val: Timestamp | Date | null | undefined): string {
  if (!val) return "—";
  try {
    const d = val instanceof Timestamp ? val.toDate() : new Date(val as any);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

function sessionLastActive(val: Timestamp | Date | null | undefined): string {
  if (!val) return "Never";
  try {
    const d = val instanceof Timestamp ? val.toDate() : new Date(val as any);
    const diffMs = Date.now() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d ago`;
  } catch {
    return "Unknown";
  }
}

// ─── Guardian Portal Access widget ───────────────────────────────────────────

function GuardianPortalAccess({ individualId }: { individualId: string }) {
  const [sessions, setSessions] = useState<GuardianPortalSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<GuardianPortalSession | null>(null);
  const [revoking, setRevoking] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    let cancelled = false;
    async function loadSessions() {
      try {
        const snap = await getDocs(
          query(
            collection(db, "guardian_portal_sessions"),
            where("individualId", "==", individualId),
            where("revokedAt", "==", null)
          )
        );
        if (!cancelled) {
          setSessions(
            snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<GuardianPortalSession, "id">),
            }))
          );
        }
      } catch {
        // silently fail — Firestore rule may deny if query uses revokedAt == null
        // fall back to filtering client-side
        try {
          const snap2 = await getDocs(
            query(
              collection(db, "guardian_portal_sessions"),
              where("individualId", "==", individualId)
            )
          );
          if (!cancelled) {
            setSessions(
              snap2.docs
                .map((d) => ({ id: d.id, ...(d.data() as Omit<GuardianPortalSession, "id">) }))
                .filter((s) => !s.revokedAt)
            );
          }
        } catch {
          // ignore
        }
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    }
    loadSessions();
    return () => { cancelled = true; };
  }, [individualId]);

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const { doc: firestoreDoc } = await import("firebase/firestore");
      const ref = firestoreDoc(db, "guardian_portal_sessions", revokeTarget.id);
      await updateDoc(ref, {
        revokedAt: serverTimestamp(),
        revokedBy: userProfile?.uid ?? "unknown",
      });
      setSessions((prev) => prev.filter((s) => s.id !== revokeTarget.id));
      toast.success(`Portal access revoked for ${revokeTarget.guardianName}.`);
      setRevokeTarget(null);
    } catch {
      toast.error("Failed to revoke portal access.");
    } finally {
      setRevoking(false);
    }
  }

  if (loadingSessions) return null;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-icm-accent" />
        <h3 className="text-[13px] font-manrope font-bold text-icm-text">Guardian Portal Access</h3>
        {sessions.length > 0 && (
          <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-icm-green-soft text-icm-green font-semibold">
            {sessions.length} active
          </span>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-icm-border bg-icm-bg/30 px-4 py-3 text-center">
          <p className="text-[12px] text-icm-text-dim">No active guardian portal sessions.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="rounded-lg border border-icm-border bg-white px-4 py-3 flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-icm-text">{sess.guardianName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-icm-green-soft text-icm-green font-semibold">
                    ● Verified
                  </span>
                </div>
                <div className="text-[11.5px] text-icm-text-dim mt-0.5 space-y-0.5">
                  <div>Last active: {sessionLastActive(sess.lastActiveAt as any)}</div>
                  <div>Session expires: {formatSessionDate(sess.sessionExpiresAt as any)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setRevokeTarget(sess)}
                  className="text-[11.5px] text-icm-red hover:underline font-medium flex items-center gap-1"
                >
                  <XCircle className="w-3 h-3" /> Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revoke confirmation modal */}
      {revokeTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setRevokeTarget(null)}
        >
          <div
            className="bg-icm-panel rounded-xl border border-icm-border w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-manrope font-bold text-[15px] text-icm-text mb-1">
              Revoke portal access?
            </h3>
            <p className="text-[12.5px] text-icm-text-dim mb-4">
              <strong>{revokeTarget.guardianName}</strong> will immediately lose access to the
              guardian portal. This cannot be undone.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setRevokeTarget(null)}
                className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-semibold text-icm-text-dim hover:text-icm-text"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="h-9 px-4 rounded-xl bg-icm-red text-white text-[12px] font-semibold hover:opacity-90 disabled:opacity-40"
              >
                {revoking ? "Revoking…" : "Revoke Access"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PersonConsentsTab({
  individualId,
  individual,
}: {
  individualId: string;
  individual: Individual;
}) {
  const { userProfile } = useAuth();
  const { data: consents, loading } = useConsents(individualId);
  const [modalOpen, setModalOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<ConsentRecord | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [resending, setResending] = useState<string | null>(null);

  // Stats
  const stats = useMemo(() => ({
    total:   consents.length,
    signed:  consents.filter((c) => (c.status as string) === "signed").length,
    pending: consents.filter((c) => (c.status as string) === "pending_signature" || (c.status as string) === "sent").length,
    expired: consents.filter((c) => (c.status as string) === "expired").length,
  }), [consents]);

  async function handleVoid() {
    if (!voidTarget || !voidReason.trim()) { toast.error("Reason is required."); return; }
    setVoiding(true);
    try {
      await updateConsent(individualId, voidTarget.id, {
        status: "voided" as any,
        voidedAt: serverTimestamp() as any,
        voidedBy: userProfile?.uid ?? "",
        voidReason: voidReason.trim(),
      } as any);
      toast.success("Consent voided.");
      setVoidTarget(null);
      setVoidReason("");
    } catch {
      toast.error("Failed to void consent.");
    } finally {
      setVoiding(false);
    }
  }

  async function handleResend(c: ConsentRecord) {
    if (!c.recipientPhone) { toast.error("No phone number on file for this consent."); return; }
    setResending(c.id);
    try {
      const fns = getFunctions();
      const sendFn = httpsCallable(fns, "sendConsentRequest");
      await sendFn({
        individualId,
        consentId: c.id,
        recipientPhone: c.recipientPhone,
        recipientName: c.recipientName,
        consentType: c.consentType,
        individualName: `${individual.first_name} ${individual.last_name}`,
        caseManagerName: userProfile?.displayName ?? "Your Case Manager",
      });
      toast.success(`Consent re-sent to ${c.recipientName}.`);
    } catch (err: any) {
      toast.error("Failed to resend consent: " + (err.message ?? "unknown error"));
    } finally {
      setResending(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[20px] font-manrope font-bold text-icm-text tracking-tight">Consents</h2>
          <p className="text-[12.5px] text-icm-text-dim font-geist mt-0.5">
            Manage consent records and send electronic consent requests to guardians and participants.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="h-9 px-4 rounded-xl bg-icm-accent text-white text-[12.5px] font-geist font-semibold hover:opacity-90 flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> New Consent Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatChip label="TOTAL"   value={stats.total}   cls="text-icm-text" />
        <StatChip label="SIGNED"  value={stats.signed}  cls="text-icm-green" />
        <StatChip label="PENDING" value={stats.pending} cls="text-orange-600" />
        <StatChip label="EXPIRED" value={stats.expired} cls="text-icm-red" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-icm-text-dim">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[12px] font-geist">Loading consents…</span>
        </div>
      ) : consents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-icm-border bg-icm-bg p-10 text-center">
          <FileText className="w-8 h-8 text-icm-text-faint mx-auto mb-3" />
          <p className="text-[14px] font-manrope font-semibold text-icm-text mb-1">No consent records yet.</p>
          <p className="text-[12.5px] text-icm-text-dim font-geist mb-4">
            Create a consent request and send it electronically to a guardian or participant for signature.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="h-9 px-4 rounded-xl bg-icm-accent text-white text-[12.5px] font-geist font-semibold hover:opacity-90 inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> New Consent Request
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-icm-border overflow-hidden">
          <table className="w-full text-[12.5px] font-geist">
            <thead className="bg-icm-bg/60">
              <tr>
                {["Type", "Sent To", "Sent Date", "Status", "Signed Date", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10.5px] font-mono font-bold uppercase tracking-wider text-icm-text-faint">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-icm-border">
              {consents.map((c) => {
                const status = (c.status as ConsentStatus) ?? "draft";
                const badge = STATUS_BADGE[status] ?? STATUS_BADGE.draft;
                return (
                  <tr key={c.id} className="hover:bg-icm-bg/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-icm-text max-w-[200px] truncate">
                      {c.consentType}
                    </td>
                    <td className="px-4 py-3 text-icm-text-dim">
                      {c.recipientName && <span className="block font-medium text-icm-text">{c.recipientName}</span>}
                      {c.recipientPhone && <span className="font-mono text-[11px]">{maskPhone(c.recipientPhone)}</span>}
                    </td>
                    <td className="px-4 py-3 text-icm-text-dim font-mono text-[11.5px]">
                      {(c as any).sentAt ? formatDate((c as any).sentAt) : "Not sent"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1", badge.cls)}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-icm-text-dim font-mono text-[11.5px]">
                      {(c as any).signedAt ? formatDate((c as any).signedAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {status !== "voided" && status !== "signed" && (
                          <button
                            onClick={() => handleResend(c)}
                            disabled={resending === c.id}
                            className="text-icm-accent hover:underline text-[11.5px] font-medium disabled:opacity-50 flex items-center gap-1"
                          >
                            {resending === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            Resend
                          </button>
                        )}
                        {status !== "voided" && (
                          <button
                            onClick={() => { setVoidTarget(c); setVoidReason(""); }}
                            className="text-icm-red hover:underline text-[11.5px] font-medium flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" /> Void
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New Consent Request Modal */}
      {modalOpen && (
        <NewConsentModal
          individualId={individualId}
          individual={individual}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Void Confirmation Modal */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setVoidTarget(null)}>
          <div className="bg-icm-panel rounded-xl border border-icm-border w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-manrope font-bold text-[15px] text-icm-text mb-1">Void this consent?</h3>
            <p className="text-[12.5px] text-icm-text-dim mb-3">
              <strong>{voidTarget.consentType}</strong> — sent to {voidTarget.recipientName}. This cannot be undone.
            </p>
            <label className="block mb-4">
              <span className="text-[10.5px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1 block">Reason for voiding (required)</span>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text"
                placeholder="e.g. Sent to wrong recipient"
              />
            </label>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setVoidTarget(null)} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-semibold text-icm-text-dim hover:text-icm-text">Cancel</button>
              <button onClick={handleVoid} disabled={voiding || !voidReason.trim()} className="h-9 px-4 rounded-xl bg-icm-red text-white text-[12px] font-semibold hover:opacity-90 disabled:opacity-40">
                {voiding ? "Voiding…" : "Void Consent"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Guardian Portal Access ── */}
      <div className="pt-2 border-t border-icm-border/50 mt-2">
        <GuardianPortalAccess individualId={individualId} />
      </div>
    </div>
  );
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────

function StatChip({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="rounded-lg border border-icm-border bg-icm-bg/40 px-3 py-2.5">
      <p className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-icm-text-faint">{label}</p>
      <p className={cn("text-[20px] font-manrope font-bold mt-0.5", cls)}>{value}</p>
    </div>
  );
}

// ─── New Consent Request Modal (4-step) ───────────────────────────────────────

type RecipientType = "guardian" | "participant" | "other" | "manual";
type DeliveryMethod = "sms" | "email" | "both";

const STEP_LABELS = ["Select Type", "Compose Document", "Select Recipient", "Review & Send"];

function NewConsentModal({
  individualId,
  individual,
  onClose,
}: {
  individualId: string;
  individual: Individual;
  onClose: () => void;
}) {
  const { userProfile } = useAuth();
  const { orgName } = useOrgSettings();
  const [step, setStep] = useState(1);
  const [sending, setSending] = useState(false);

  // Step 1 state
  const [selectedTypeId, setSelectedTypeId] = useState(DEFAULT_CONSENT_TYPES[0].id);
  const [description, setDescription] = useState(DEFAULT_CONSENT_TYPES[0].description);

  // Step 2 state — composed document
  const [consentBodyHtml, setConsentBodyHtml] = useState("");
  const [consentBodyText, setConsentBodyText] = useState("");
  const [step2Validated, setStep2Validated] = useState(false);
  const [showPlaceholderOverride, setShowPlaceholderOverride] = useState(false);

  // Step 3 state
  const [recipientType, setRecipientType] = useState<RecipientType>("guardian");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualRelationship, setManualRelationship] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("sms");

  // Step 4 state
  const [confirmed, setConfirmed] = useState(false);
  const [bodyExpanded, setBodyExpanded] = useState(false);

  const selectedType = DEFAULT_CONSENT_TYPES.find((t) => t.id === selectedTypeId) ?? DEFAULT_CONSENT_TYPES[0];

  function handleTypeChange(typeId: string) {
    const t = DEFAULT_CONSENT_TYPES.find((x) => x.id === typeId);
    if (t) { setSelectedTypeId(typeId); setDescription(t.description); }
  }

  const handleComposerChange = useCallback((html: string, text: string) => {
    setConsentBodyHtml(html);
    setConsentBodyText(text);
  }, []);

  const recipientName = useMemo(() => {
    if (recipientType === "guardian") return individual.guardian_name ?? "Guardian";
    if (recipientType === "participant") return `${individual.first_name} ${individual.last_name}`;
    if (recipientType === "manual") return manualName;
    return "—";
  }, [recipientType, manualName, individual]);

  const resolvedPhone = useMemo(() => {
    if (recipientType === "guardian") return individual.guardian_phone ?? individual.phone ?? "";
    if (recipientType === "participant") return individual.phone ?? "";
    if (recipientType === "manual") return manualPhone;
    return "";
  }, [recipientType, manualPhone, individual]);

  // Step 2 → Step 3 validation
  function handleAdvanceFromCompose() {
    const plainText = consentBodyHtml.replace(/<[^>]+>/g, "").trim();
    if (plainText.length < 50) {
      toast.error("Document must be at least 50 characters long.");
      return;
    }
    const unfilled = findUnfilledPlaceholders(consentBodyHtml);
    if (unfilled.length > 0 && !showPlaceholderOverride) {
      setShowPlaceholderOverride(true);
      return;
    }
    setShowPlaceholderOverride(false);
    setStep(3);
  }

  async function handleSaveDraft(html: string) {
    const docRef = await addDoc(
      collection(db, "individuals", individualId, "consents"),
      {
        individual_id: individualId,
        consentType: selectedType.label,
        consentTypeId: selectedTypeId,
        description,
        consentBodyHtml: html,
        consentBodyText: html.replace(/<[^>]+>/g, ""),
        status: "draft",
        recipientName: "",
        recipientPhone: "",
        recipientRelationship: "",
        sentAt: null, sentVia: null, linkExpiresAt: null,
        signedAt: null, signedBy: null, signerRelationship: null,
        signatureType: null, signatureData: null, twilioMessageSid: null,
        auditTrail: null,
        createdBy: userProfile?.uid ?? "",
        createdByName: userProfile?.displayName ?? "",
        voidedAt: null, voidedBy: null, voidReason: null,
        composedAt: serverTimestamp(),
        composedBy: userProfile?.uid ?? "",
        signatureBlockAppended: true,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      }
    );
    return;
  }

  async function handleSend() {
    if (!resolvedPhone && deliveryMethod !== "email") {
      toast.error("A phone number is required to send via SMS.");
      return;
    }
    if (!confirmed) { toast.error("Please confirm the recipient before sending."); return; }

    setSending(true);
    try {
      const consentData = {
        individual_id: individualId,
        consentType: selectedType.label,
        consentTypeId: selectedTypeId,
        description,
        consentBodyHtml,
        consentBodyText,
        signatureBlockAppended: true,
        composedAt: serverTimestamp(),
        composedBy: userProfile?.uid ?? "",
        status: "sent" as any,
        recipientName,
        recipientPhone: resolvedPhone,
        recipientRelationship: recipientType === "manual" ? manualRelationship : recipientType,
        sentAt: null, sentVia: deliveryMethod,
        linkExpiresAt: null, signedAt: null, signedBy: null,
        signerRelationship: null, signatureType: null, signatureData: null,
        twilioMessageSid: null, auditTrail: null,
        createdBy: userProfile?.uid ?? "",
        createdByName: userProfile?.displayName ?? "",
        voidedAt: null, voidedBy: null, voidReason: null,
      };

      const docRef = await addDoc(
        collection(db, "individuals", individualId, "consents"),
        { ...consentData, created_at: serverTimestamp(), updated_at: serverTimestamp() }
      );

      const fns = getFunctions();
      const sendFn = httpsCallable(fns, "sendConsentRequest");
      await sendFn({
        individualId,
        consentId: docRef.id,
        recipientPhone: resolvedPhone,
        recipientName,
        consentType: selectedType.label,
        individualName: `${individual.first_name} ${individual.last_name}`,
        caseManagerName: userProfile?.displayName ?? "Your Case Manager",
      });

      toast.success(`Consent request sent to ${recipientName} via SMS.`);
      onClose();
    } catch (err: any) {
      toast.error("Failed to send consent request: " + (err.message ?? "unknown error"));
    } finally {
      setSending(false);
    }
  }

  const previewMessage = `[CaseManagement.AI] ${individual.first_name} ${individual.last_name}'s case manager has sent a consent request for "${selectedType.label}". Click to review and sign: [secure link]. Link expires in 48 hours. Reply STOP to opt out.`;

  // Modal width: Step 2 gets wider (900px) for the composer
  const isComposerStep = step === 2;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        className={cn(
          "bg-icm-panel rounded-xl border border-icm-border w-full flex flex-col transition-all duration-200",
          isComposerStep
            ? "max-w-[900px] h-[85vh]"
            : "max-w-lg max-h-[90vh] overflow-y-auto"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 bg-icm-panel border-b border-icm-border px-5 py-4 flex items-center justify-between rounded-t-xl">
          <div>
            <h3 className="font-manrope font-bold text-[15px] text-icm-text">New Consent Request</h3>
            <p className="text-[11.5px] text-icm-text-dim mt-0.5">
              Step {step} of 4 — {STEP_LABELS[step - 1]}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={cn("w-2 h-2 rounded-full transition-colors", s <= step ? "bg-icm-accent" : "bg-icm-border")} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className={cn("flex-1 min-h-0", isComposerStep ? "overflow-hidden" : "overflow-y-auto")}>
          {/* ── Step 1: Select Type ── */}
          {step === 1 && (
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10.5px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1.5 block">Consent Type *</label>
                <select
                  value={selectedTypeId}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-icm-border bg-white text-[13px] text-icm-text appearance-none"
                >
                  {DEFAULT_CONSENT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10.5px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1.5 block">Brief description (editable)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text leading-relaxed"
                />
              </div>
              <p className="text-[11.5px] text-icm-text-dim">
                You'll compose the full document text in the next step.
              </p>
            </div>
          )}

          {/* ── Step 2: Compose ── */}
          {step === 2 && (
            <div className="flex-1 h-full overflow-hidden">
              <ConsentComposerStep
                consentTypeId={selectedTypeId}
                consentTypeLabel={selectedType.label}
                individual={individual}
                cmName={userProfile?.displayName ?? ""}
                agencyName={orgName}
                onChange={handleComposerChange}
                initialHtml={consentBodyHtml || undefined}
                onSaveDraft={handleSaveDraft}
              />
            </div>
          )}

          {/* ── Step 3: Recipient ── */}
          {step === 3 && (
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[12.5px] font-semibold text-icm-text mb-2">Who should receive this consent request?</p>
                <div className="space-y-2">
                  {([
                    { value: "guardian",    label: "Guardian on file",   sub: individual.guardian_name ? `${individual.guardian_name} · ${maskPhone(individual.guardian_phone ?? "")}` : "No guardian on file" },
                    { value: "participant", label: "Participant directly", sub: `${individual.first_name} ${individual.last_name} · ${maskPhone(individual.phone ?? "")}` },
                    { value: "manual",      label: "Enter manually",      sub: "Type name and phone number" },
                  ] as { value: RecipientType; label: string; sub: string }[]).map((opt) => (
                    <label key={opt.value} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-icm-border hover:bg-icm-bg transition-colors">
                      <input type="radio" name="recipientType" value={opt.value} checked={recipientType === opt.value} onChange={() => setRecipientType(opt.value)} className="mt-0.5" />
                      <div>
                        <p className="text-[12.5px] font-medium text-icm-text">{opt.label}</p>
                        <p className="text-[11.5px] text-icm-text-dim">{opt.sub}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {recipientType === "manual" && (
                <div className="space-y-3 border border-icm-border rounded-lg p-3">
                  <ModalInput label="Name" value={manualName} onChange={setManualName} placeholder="Full name" />
                  <ModalInput label="Phone Number (US)" value={manualPhone} onChange={setManualPhone} placeholder="+1 (555) 000-0000" type="tel" />
                  <ModalInput label="Relationship to Individual" value={manualRelationship} onChange={setManualRelationship} placeholder="e.g. Guardian, Parent" />
                </div>
              )}
              <div>
                <p className="text-[10.5px] uppercase tracking-wider font-semibold text-icm-text-faint mb-2">Send Via</p>
                <div className="flex items-center gap-3">
                  {(["sms", "email", "both"] as DeliveryMethod[]).map((m) => (
                    <label key={m} className="flex items-center gap-1.5 cursor-pointer text-[12.5px] text-icm-text">
                      <input type="radio" name="delivery" value={m} checked={deliveryMethod === m} onChange={() => setDeliveryMethod(m)} />
                      {m === "sms" ? "SMS" : m === "email" ? "Email" : "Both"}
                    </label>
                  ))}
                </div>
              </div>
              {(deliveryMethod === "sms" || deliveryMethod === "both") && (
                <div className="rounded-lg border border-icm-border bg-icm-bg/40 p-3">
                  <p className="text-[10.5px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1">Preview SMS</p>
                  <p className="text-[12px] text-icm-text-dim italic">{previewMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Review & Send ── */}
          {step === 4 && (
            <div className="p-5 space-y-4">
              <div className="rounded-lg border border-icm-border bg-icm-bg p-4 space-y-2 text-[12.5px] font-geist">
                <SummaryRow label="Consent Type" value={selectedType.label} />
                <SummaryRow label="Recipient"    value={`${recipientName} · ${maskPhone(resolvedPhone)}`} />
                <SummaryRow label="Delivery"     value={deliveryMethod === "sms" ? `SMS to ***-***-${resolvedPhone.slice(-4)}` : deliveryMethod} />
                <SummaryRow label="Expiry"       value="48 hours from send" />
              </div>
              <div>
                <p className="text-[10.5px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1.5">Consent Document</p>
                <div className="rounded-lg border border-icm-border bg-white p-3 text-[12.5px] text-icm-text leading-relaxed">
                  {consentBodyHtml ? (
                    <>
                      <div
                        className={cn("overflow-hidden transition-all", bodyExpanded ? "max-h-none" : "max-h-[80px]")}
                        dangerouslySetInnerHTML={{
                          __html: consentBodyHtml.replace(/<[^>]+>/g, " ").trim().slice(0, bodyExpanded ? undefined : 200) + (!bodyExpanded ? "…" : "")
                        }}
                      />
                      <button
                        onClick={() => setBodyExpanded(!bodyExpanded)}
                        className="mt-1 text-[11.5px] text-icm-accent hover:underline font-medium"
                      >
                        {bodyExpanded ? "Collapse" : "[View full document]"}
                      </button>
                    </>
                  ) : (
                    <span className="text-icm-text-dim italic">{description}</span>
                  )}
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-icm-border" />
                <span className="text-[12.5px] font-geist text-icm-text leading-snug">
                  I confirm this consent request is being sent to the correct recipient.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Placeholder override warning (Step 2) */}
        {step === 2 && showPlaceholderOverride && (
          <div className="shrink-0 border-t border-icm-amber/30 bg-icm-amber-soft px-5 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-icm-amber shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-icm-text">Unfilled placeholders detected.</p>
              <p className="text-[11.5px] text-icm-text-dim">Fill them in or click "Send anyway" to proceed.</p>
            </div>
            <button onClick={() => { setShowPlaceholderOverride(false); setStep(3); }} className="h-8 px-3 rounded-lg bg-icm-amber text-white text-[11.5px] font-semibold shrink-0">
              Send anyway
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 bg-icm-panel border-t border-icm-border px-5 py-3 flex items-center justify-between rounded-b-xl">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-semibold text-icm-text-dim hover:text-icm-text"
          >
            {step === 1 ? "Cancel" : "← Back"}
          </button>
          {step === 2 ? (
            <button
              onClick={handleAdvanceFromCompose}
              className="h-9 px-5 rounded-xl bg-icm-accent text-white text-[12px] font-semibold hover:opacity-90 flex items-center gap-1.5"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="h-9 px-5 rounded-xl bg-icm-accent text-white text-[12px] font-semibold hover:opacity-90 flex items-center gap-1.5"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={sending || !confirmed}
              className="h-9 px-5 rounded-xl bg-icm-accent text-white text-[12px] font-semibold hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? "Sending…" : "Send Consent Request →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ModalInput({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10.5px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1 block">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text" />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-icm-text-faint w-32 shrink-0 text-[11px] uppercase tracking-wider font-mono font-semibold">{label}</span>
      <span className="text-icm-text flex-1">{value}</span>
    </div>
  );
}
