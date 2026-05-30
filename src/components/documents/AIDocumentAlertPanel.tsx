/**
 * AIDocumentAlertPanel — Slide-in side panel showing AI scan results for a document.
 *
 * Queries Firestore `document_scans` collection, displays alerts by severity,
 * key findings, cross-reference data, and allows marking as reviewed.
 */

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  X,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIDocumentAlertPanelProps {
  documentId: string;
  documentName: string;
  individualId: string;
  onClose: () => void;
  onMarkReviewed: (documentId: string) => void;
}

type AlertSeverity = "urgent" | "warning" | "info";

interface ScanAlert {
  alertType: string;
  severity: AlertSeverity;
  message: string;
  suggestedAction?: string;
  actionRoute?: string;
}

interface CrossReference {
  matchedGoals?: number;
  medicationChanges?: string[];
  incidentsReported?: string[];
}

interface DocumentScan {
  id: string;
  documentId: string;
  summary?: string;
  keyFindings?: string[];
  alertsGenerated?: ScanAlert[];
  crossReference?: CrossReference;
  uploadedBy?: string;
  uploadedAt?: { seconds: number; nanoseconds: number } | null;
  reviewedBy?: string;
  reviewedAt?: { seconds: number; nanoseconds: number } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAlertType(alertType: string): string {
  return alertType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimestamp(ts: { seconds: number; nanoseconds: number } | null | undefined): string {
  if (!ts?.seconds) return "";
  return new Date(ts.seconds * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Severity config ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { label: string; chipClass: string; Icon: typeof AlertTriangle }
> = {
  urgent: {
    label: "URGENT",
    chipClass: "bg-red-50 text-red-700 border border-red-200",
    Icon: AlertTriangle,
  },
  warning: {
    label: "WARNING",
    chipClass: "bg-amber-50 text-amber-700 border border-amber-200",
    Icon: AlertTriangle,
  },
  info: {
    label: "INFO",
    chipClass: "bg-blue-50 text-blue-700 border border-blue-200",
    Icon: Info,
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeverityChip({ severity }: { severity: AlertSeverity }) {
  const config = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;
  const { Icon } = config;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${config.chipClass}`}
    >
      <Icon size={11} />
      {config.label}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
      {children}
    </div>
  );
}

function AlertCard({ alert }: { alert: ScanAlert }) {
  const config = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
  return (
    <div
      className={`rounded-lg border p-3 mb-3 ${
        alert.severity === "urgent"
          ? "bg-red-50 border-red-200"
          : alert.severity === "warning"
          ? "bg-amber-50 border-amber-200"
          : "bg-blue-50 border-blue-200"
      }`}
    >
      <div className="flex items-start gap-2 mb-1.5">
        <SeverityChip severity={alert.severity} />
        <span className="text-sm font-semibold text-slate-800 leading-tight">
          {formatAlertType(alert.alertType)}
        </span>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed mb-1">{alert.message}</p>
      {alert.suggestedAction && (
        <p className="text-xs text-slate-500 italic">{alert.suggestedAction}</p>
      )}
      {alert.actionRoute && (
        <a
          href={alert.actionRoute}
          className={`inline-block mt-2 text-xs font-semibold underline ${
            alert.severity === "urgent"
              ? "text-red-700"
              : alert.severity === "warning"
              ? "text-amber-700"
              : "text-blue-700"
          }`}
        >
          View →
        </a>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIDocumentAlertPanel({
  documentId,
  documentName,
  onClose,
  onMarkReviewed,
}: AIDocumentAlertPanelProps) {
  const { currentUser } = useAuth();

  const [scan, setScan] = useState<DocumentScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [marking, setMarking] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  // ── Fetch scan on mount ────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function fetchScan() {
      setLoading(true);
      setNotFound(false);

      try {
        const q = query(
          collection(db, "document_scans"),
          where("documentId", "==", documentId)
        );
        const snap = await getDocs(q);

        if (cancelled) return;

        if (snap.empty) {
          setNotFound(true);
          return;
        }

        const scanDoc = snap.docs[0];
        const data = scanDoc.data() as Omit<DocumentScan, "id">;
        setScan({ id: scanDoc.id, ...data });
        setAlreadyReviewed(!!data.reviewedAt);
      } catch (err) {
        console.error("[AIDocumentAlertPanel] fetch error:", err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchScan();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  // ── Mark as reviewed ───────────────────────────────────────────────────────

  async function handleMarkReviewed() {
    if (!scan || marking) return;
    setMarking(true);

    try {
      const displayName = currentUser?.displayName ?? currentUser?.email ?? "Staff";

      // Update document_scans
      await updateDoc(doc(db, "document_scans", scan.id), {
        reviewedBy: displayName,
        reviewedAt: serverTimestamp(),
      });

      // Update managed_documents
      await updateDoc(doc(db, "managed_documents", documentId), {
        aiAlertCount: 0,
        aiScanSummary: "Reviewed",
      });

      setScan((prev) =>
        prev
          ? {
              ...prev,
              reviewedBy: displayName,
              reviewedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
            }
          : prev
      );
      setAlreadyReviewed(true);
      onMarkReviewed(documentId);
      toast.success("Document marked as reviewed");
    } catch (err) {
      console.error("[AIDocumentAlertPanel] mark reviewed error:", err);
      toast.error("Failed to mark as reviewed. Please try again.");
    } finally {
      setMarking(false);
    }
  }

  // ── Dismiss all alerts ─────────────────────────────────────────────────────

  async function handleDismissAllAlerts() {
    if (!scan || dismissing) return;
    setDismissing(true);

    try {
      await updateDoc(doc(db, "document_scans", scan.id), {
        alertsGenerated: [],
      });

      setScan((prev) => (prev ? { ...prev, alertsGenerated: [] } : prev));
      toast.success("All alerts dismissed");
    } catch (err) {
      console.error("[AIDocumentAlertPanel] dismiss alerts error:", err);
      toast.error("Failed to dismiss alerts. Please try again.");
    } finally {
      setDismissing(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const alerts = scan?.alertsGenerated ?? [];
  const keyFindings = scan?.keyFindings ?? [];
  const crossRef = scan?.crossReference ?? {};
  const matchedGoals = crossRef.matchedGoals ?? 0;
  const medicationChanges = crossRef.medicationChanges ?? [];
  const incidentsReported = crossRef.incidentsReported ?? [];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-[480px] max-w-full bg-white z-50 shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="AI Document Review"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={15} className="text-violet-500 shrink-0" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                AI Document Review
              </span>
            </div>
            <h2
              className="text-base font-semibold text-slate-900 truncate leading-snug"
              title={documentName}
            >
              {documentName}
            </h2>
            {scan?.uploadedBy && (
              <p className="text-xs text-slate-500 mt-0.5">
                Uploaded by {scan.uploadedBy}
                {scan.uploadedAt ? ` · ${formatTimestamp(scan.uploadedAt)}` : ""}
              </p>
            )}
            {alreadyReviewed && scan?.reviewedBy && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle2 size={12} />
                Reviewed by {scan.reviewedBy}
                {scan.reviewedAt ? ` · ${formatTimestamp(scan.reviewedAt)}` : ""}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center h-40 gap-3 text-slate-400">
              <Loader2 size={22} className="animate-spin" />
              <span className="text-sm">Loading AI scan results…</span>
            </div>
          )}

          {!loading && notFound && (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
              <Sparkles size={28} className="text-slate-300" />
              <div>
                <p className="text-sm font-medium text-slate-600">Not yet scanned</p>
                <p className="text-xs text-slate-400 mt-1">
                  This document hasn't been analyzed by AI yet. Check back shortly.
                </p>
              </div>
            </div>
          )}

          {!loading && scan && (
            <div className="space-y-6">
              {/* Document Summary */}
              {scan.summary && (
                <section>
                  <SectionHeading>Document Summary (AI)</SectionHeading>
                  <p className="text-sm text-slate-700 leading-relaxed">{scan.summary}</p>
                </section>
              )}

              {/* Alerts */}
              <section>
                <SectionHeading>
                  Alerts ({alerts.length})
                </SectionHeading>
                {alerts.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                    <CheckCircle2 size={16} className="text-green-500" />
                    No alerts detected
                  </div>
                ) : (
                  alerts.map((alert, i) => (
                    <AlertCard key={`${alert.alertType}-${i}`} alert={alert} />
                  ))
                )}
              </section>

              {/* Key Findings */}
              {keyFindings.length > 0 && (
                <section>
                  <SectionHeading>Key Findings (AI)</SectionHeading>
                  <ul className="space-y-1.5">
                    {keyFindings.map((finding, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                        {finding}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Cross-Reference */}
              <section>
                <SectionHeading>Cross-Reference</SectionHeading>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                    <span className="text-slate-700">
                      Matched to{" "}
                      <span className="font-semibold">{matchedGoals}</span> active Care Plan{" "}
                      {matchedGoals === 1 ? "goal" : "goals"} ✓
                    </span>
                  </div>

                  {medicationChanges.length > 0 ? (
                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-amber-700 font-medium">
                          Medication changes detected
                        </span>
                        <ul className="mt-1 space-y-0.5">
                          {medicationChanges.map((change, i) => (
                            <li key={i} className="text-xs text-slate-600">
                              {change}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}

                  {incidentsReported.length > 0 ? (
                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-amber-700 font-medium">Incidents mentioned</span>
                        <ul className="mt-1 space-y-0.5">
                          {incidentsReported.map((incident, i) => (
                            <li key={i} className="text-xs text-slate-600">
                              {incident}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                      <span className="text-slate-700">No incidents detected ✓</span>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!loading && scan && (
          <div className="px-6 py-4 border-t border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={handleMarkReviewed}
                disabled={marking || alreadyReviewed}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  alreadyReviewed
                    ? "bg-green-50 text-green-600 border border-green-200 cursor-default"
                    : "bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                {marking ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                {alreadyReviewed ? "Reviewed" : "Mark as reviewed"}
              </button>

              {alerts.length > 0 && !alreadyReviewed && (
                <button
                  onClick={handleDismissAllAlerts}
                  disabled={dismissing}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {dismissing ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <X size={15} />
                  )}
                  Dismiss all alerts
                </button>
              )}

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Footer for not-found / loading state */}
        {!loading && notFound && (
          <div className="px-6 py-4 border-t border-slate-100 shrink-0">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
}
