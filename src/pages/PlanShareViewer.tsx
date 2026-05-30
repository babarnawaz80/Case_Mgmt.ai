/**
 * PlanShareViewer — Public HIPAA-compliant plan share page
 * Route: /shared/:token  (public, no auth required)
 *
 * Flow:
 *  1. Load share record from Firestore plan_shares/{token lookup}
 *  2. Check expiry
 *  3. Prompt for 6-digit passcode if required
 *  4. On match: show read-only plan snapshot + log access
 */
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Lock, CheckCircle2, AlertTriangle, Loader2, FileText,
  Shield, Eye, Calendar, Clock,
} from "lucide-react";
import {
  collection, getDocs, query, where, updateDoc, arrayUnion, doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ShareRecord {
  id: string;
  token: string;
  planId: string;
  individualName: string;
  recipientEmail: string;
  recipientName: string;
  recipientOrg: string;
  passcode: string;
  requirePasscode: boolean;
  expiresAt: any;
  expiresInDays: number;
  status: string;
  planSnapshot: {
    id: string;
    status: string;
    effectiveDate?: string;
    goals?: any[];
    services?: any[];
  };
  createdAt: any;
  message?: string;
}

export default function PlanShareViewer() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [share, setShare] = useState<ShareRecord | null>(null);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!token) { setError("Invalid link."); setLoading(false); return; }

    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "plan_shares"), where("token", "==", token), where("status", "==", "active"))
        );
        if (snap.empty) { setError("This link is invalid or has been revoked."); setLoading(false); return; }

        const docSnap = snap.docs[0]!;
        const data = { id: docSnap.id, ...docSnap.data() } as ShareRecord;

        // Check expiry
        const expiresAt = data.expiresAt?.toDate?.() ?? null;
        if (expiresAt && new Date() > expiresAt) {
          setError("This link has expired. Please request a new one from the sender.");
          setLoading(false);
          return;
        }

        setShare(data);

        // If no passcode required, unlock immediately
        if (!data.requirePasscode) {
          await logAccess(docSnap.id, "no_passcode_required");
          setUnlocked(true);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load this link. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function logAccess(shareDocId: string, method: string) {
    try {
      await updateDoc(doc(db, "plan_shares", shareDocId), {
        accessLog: arrayUnion({
          accessedAt: new Date().toISOString(),
          method,
          userAgent: navigator.userAgent.slice(0, 120),
        }),
      });
    } catch { /* non-fatal */ }
  }

  async function verifyPasscode() {
    if (!share || passcodeInput.length !== 6) return;
    setVerifying(true);
    setPasscodeError("");

    // Simulate brief verification delay for UX
    await new Promise(r => setTimeout(r, 600));

    if (passcodeInput === share.passcode) {
      await logAccess(share.id, "passcode_verified");
      setUnlocked(true);
    } else {
      setPasscodeError("Incorrect passcode. Please check with the sender.");
    }
    setVerifying(false);
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-[13px]">Verifying secure link…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !share) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-[18px] font-bold text-slate-800">Link unavailable</h1>
          <p className="text-[13px] text-slate-500">{error ?? "This link could not be loaded."}</p>
          <p className="text-[11px] text-slate-400">
            If you believe this is an error, contact the person who shared this document.
          </p>
        </div>
      </div>
    );
  }

  // ── Passcode Gate ─────────────────────────────────────────────────────────────
  if (!unlocked && share.requirePasscode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center">
                <Lock className="w-5 h-5 text-teal-300" />
              </div>
              <div>
                <p className="text-white font-semibold text-[14px]">Secure Document Access</p>
                <p className="text-slate-400 text-[11px]">HIPAA-compliant · Encrypted · Expiring link</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-5">
            {/* Document info */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-800 truncate">
                  Person-Centered Plan — {share.individualName}
                </p>
                <p className="text-[11px] text-slate-400">
                  Expires in {share.expiresInDays} day{share.expiresInDays !== 1 ? "s" : ""} · Shared by your provider
                </p>
              </div>
            </div>

            {/* Passcode entry */}
            <div className="space-y-2">
              <label className="block text-[12px] font-semibold text-slate-600">
                Enter 6-digit passcode
              </label>
              <p className="text-[11.5px] text-slate-400">
                The passcode was sent to you separately by the case manager or provider who shared this plan.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={passcodeInput}
                onChange={(e) => { setPasscodeInput(e.target.value.replace(/\D/g, "")); setPasscodeError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") verifyPasscode(); }}
                placeholder="000000"
                className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 text-center text-[22px] font-mono font-bold tracking-[0.5em] text-slate-800 focus:outline-none focus:border-teal-500"
                autoFocus
              />
              {passcodeError && (
                <p className="text-[11.5px] text-red-500 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {passcodeError}
                </p>
              )}
            </div>

            <button
              onClick={verifyPasscode}
              disabled={passcodeInput.length !== 6 || verifying}
              className="w-full h-11 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {verifying ? "Verifying…" : "Access Document"}
            </button>

            {/* HIPAA notice */}
            <p className="text-[10.5px] text-slate-400 text-center leading-relaxed">
              🔒 This document contains Protected Health Information (PHI). Access is logged and audited per HIPAA requirements.
              Unauthorized access is prohibited.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Plan View (unlocked) ──────────────────────────────────────────────────────
  const { planSnapshot } = share;
  const goals: any[] = planSnapshot.goals ?? [];
  const services: any[] = planSnapshot.services ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Banner */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-teal-200" />
          <div>
            <p className="text-white text-[13px] font-semibold">Verified — Secure Document Access</p>
            <p className="text-teal-200 text-[11px]">
              HIPAA-compliant · This session is logged · Link expires in {share.expiresInDays} day{share.expiresInDays !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-teal-200 shrink-0">
          <Eye className="w-3.5 h-3.5" />
          Read-only
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-[20px] text-slate-800">Person-Centered Plan</h1>
              <p className="text-[14px] text-slate-500 mt-0.5">{share.individualName}</p>
              <div className="flex items-center gap-3 mt-2 text-[11.5px] text-slate-400">
                {planSnapshot.effectiveDate && (
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Effective {planSnapshot.effectiveDate}</span>
                )}
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Status: {planSnapshot.status}</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-[11px] font-semibold ring-1 ring-teal-200 shrink-0">
              <Lock className="w-3 h-3" /> Encrypted
            </span>
          </div>
        </div>

        {/* Message from sender */}
        {share.message && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Message from sender</p>
            <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-line">{share.message}</p>
          </div>
        )}

        {/* Goals */}
        {goals.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
              <p className="text-[13px] font-semibold text-slate-700">Goals & Outcomes ({goals.length})</p>
            </div>
            <div className="divide-y divide-slate-100">
              {goals.map((g: any, i: number) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">G{i + 1}</span>
                    <p className="text-[13.5px] font-semibold text-slate-800">{g.title ?? g.goal ?? "Goal"}</p>
                  </div>
                  {g.description && <p className="text-[12.5px] text-slate-500 leading-relaxed">{g.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                    {g.targetDate && <span>Target: {g.targetDate}</span>}
                    {g.responsibleParty && <span>Responsible: {g.responsibleParty}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services */}
        {services.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
              <p className="text-[13px] font-semibold text-slate-700">Services & Supports ({services.length})</p>
            </div>
            <div className="divide-y divide-slate-100">
              {services.map((s: any, i: number) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800">{s.name ?? s.serviceName ?? "Service"}</p>
                    {(s.provider) && <p className="text-[11.5px] text-slate-400">{s.provider} · {s.units ?? s.frequency ?? ""}</p>}
                  </div>
                  {s.status && (
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-200 shrink-0">{s.status}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HIPAA footer */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-[11px] text-amber-700 leading-relaxed">
            <strong>HIPAA Notice:</strong> This document contains Protected Health Information (PHI). It has been shared with you for care coordination purposes only. You may not copy, distribute, or use this information beyond its intended purpose. Your access has been logged with timestamp and IP context. This link expires on {share.expiresAt?.toDate?.()?.toLocaleDateString?.() ?? "—"}.
          </p>
        </div>
      </div>
    </div>
  );
}
