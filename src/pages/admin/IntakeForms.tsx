// Admin Intake Forms Management Page
// CaseManagement.AI — Protected, admin only
// Route: /settings/intake-forms

import { useState, useEffect, useCallback } from "react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { useRole } from "@/contexts/RoleContext";
import { AdminOnly } from "@/components/platform/AdminOnly";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import {
  Link as LinkIcon,
  Plus,
  Copy,
  Check,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
} from "lucide-react";

const FUNCTIONS_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";

interface IntakeToken {
  id: string;
  label: string;
  isActive: boolean;
  submissionCount: number;
  lastSubmissionAt: { seconds: number } | null;
  createdAt: { seconds: number } | null;
  createdBy: string;
  orgId: string;
}

async function getIdToken(): Promise<string | null> {
  try {
    return await auth.currentUser?.getIdToken() ?? null;
  } catch {
    return null;
  }
}

export default function IntakeForms() {
  const { isAdmin } = useRole();
  if (!isAdmin) return <AdminOnly />;

  return <IntakeFormsContent />;
}

function IntakeFormsContent() {
  const [tokens, setTokens] = useState<IntakeToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<IntakeToken | null>(null);

  const fetchTokens = useCallback(async () => {
    const idToken = await getIdToken();
    if (!idToken) return;
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/api/intake/tokens`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      setTokens(data.tokens ?? []);
    } catch {
      toast.error("Failed to load intake links");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  const activeTokens = tokens.filter((t) => t.isActive);
  const inactiveTokens = tokens.filter((t) => !t.isActive);

  const handleDeactivate = async (token: IntakeToken) => {
    const idToken = await getIdToken();
    if (!idToken) return;
    try {
      await fetch(`${FUNCTIONS_BASE}/api/intake/tokens/${token.id}/deactivate`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      toast.success(`"${token.label}" deactivated`);
      setDeactivateTarget(null);
      fetchTokens();
    } catch {
      toast.error("Failed to deactivate link");
    }
  };

  const intakeUrl = (token: IntakeToken) =>
    `https://app.casemanagement.ai/intake/${token.id}-PLACEHOLDER`;
  // Note: the actual rawToken is never stored — only the hash.
  // The URL shown in the list is a reference link only. The real URL was shown at generation time.

  return (
    <ICMShell title="Intake Forms" showAIPanel={false}>
      <div className="space-y-5 max-w-[900px]">
        <Breadcrumbs
          backTo="/leads"
          backLabel="Leads"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Leads", to: "/leads" },
            { label: "Intake Forms" },
          ]}
        />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Intake Forms
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist max-w-[560px]">
              Generate secure referral intake links for external providers. Each link is unique
              and routes submissions directly into your pending leads queue.
            </p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[12px] font-geist font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Generate New Intake Link
          </button>
        </div>

        {/* Active tokens */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          </div>
        ) : activeTokens.length === 0 ? (
          <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel p-10 text-center">
            <LinkIcon className="w-8 h-8 mx-auto mb-3 text-icm-text-faint" />
            <p className="text-sm text-icm-text-dim">No active intake links. Generate one to get started.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
            {activeTokens.map((token, i) => (
              <TokenRow
                key={token.id}
                token={token}
                isLast={i === activeTokens.length - 1}
                onDeactivate={() => setDeactivateTarget(token)}
              />
            ))}
          </div>
        )}

        {/* Inactive tokens */}
        {inactiveTokens.length > 0 && (
          <div>
            <button
              onClick={() => setShowInactive((s) => !s)}
              className="flex items-center gap-2 text-xs text-icm-text-dim font-geist font-medium hover:text-icm-text transition-colors"
            >
              {showInactive ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showInactive ? "Hide" : "Show"} deactivated links ({inactiveTokens.length})
            </button>
            {showInactive && (
              <div className="mt-2 rounded-xl border border-icm-border bg-icm-panel overflow-hidden opacity-60">
                {inactiveTokens.map((token, i) => (
                  <TokenRow
                    key={token.id}
                    token={token}
                    isLast={i === inactiveTokens.length - 1}
                    inactive
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* How it works */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-sm text-blue-800">
          <p className="font-semibold mb-2">How it works</p>
          <ul className="space-y-1.5 list-disc list-inside text-blue-700">
            <li>Generate a unique intake link and share it with external providers</li>
            <li>Providers fill out the referral form — no login required</li>
            <li>Submissions appear in your <strong>Leads → Pending Review</strong> tab</li>
            <li>Case managers can accept, request more info, or reject each lead</li>
            <li>Deactivating a link immediately stops new submissions</li>
          </ul>
        </div>
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <GenerateModal
          onClose={() => setShowGenerateModal(false)}
          onSuccess={() => { setShowGenerateModal(false); fetchTokens(); }}
        />
      )}

      {/* Deactivate Confirm Modal */}
      {deactivateTarget && (
        <DeactivateModal
          token={deactivateTarget}
          onConfirm={() => handleDeactivate(deactivateTarget)}
          onClose={() => setDeactivateTarget(null)}
        />
      )}
    </ICMShell>
  );
}

function TokenRow({
  token,
  isLast,
  inactive,
  onDeactivate,
}: {
  token: IntakeToken;
  isLast: boolean;
  inactive?: boolean;
  onDeactivate?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const formattedDate = (ts: { seconds: number } | null) => {
    if (!ts) return "—";
    return new Date(ts.seconds * 1000).toLocaleDateString();
  };

  const copyLink = async () => {
    // Since we only store the hash, show a note
    toast.info("The full intake URL was shown only at generation time. Share it with providers directly.");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`px-4 py-4 ${!isLast ? "border-b border-icm-border" : ""}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-geist font-semibold text-[13.5px] text-icm-text">{token.label}</p>
            {!inactive && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700 border border-green-200">ACTIVE</span>
            )}
          </div>
          <p className="text-[11px] text-icm-text-faint font-mono mt-1">
            Created {formattedDate(token.createdAt)} · {token.submissionCount ?? 0} submission{token.submissionCount !== 1 ? "s" : ""}
            {token.lastSubmissionAt ? ` · Last: ${formattedDate(token.lastSubmissionAt)}` : ""}
          </p>
        </div>
        {!inactive && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-icm-border bg-icm-panel hover:bg-muted text-[11px] font-geist font-medium text-icm-text-dim transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <button
              onClick={onDeactivate}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-icm-border hover:border-red-200 hover:bg-red-50 text-[11px] font-geist font-medium text-icm-text-dim hover:text-red-600 transition-colors"
            >
              <XCircle className="w-3 h-3" />
              Deactivate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GenerateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);

  const handleGenerate = async () => {
    if (!label.trim()) return;
    setLoading(true);
    try {
      const idToken = await getIdToken();
      if (!idToken) { toast.error("Not authenticated"); return; }
      // We need the orgId — fetch from current user's profile
      // Using the token endpoint directly: the function reads orgId from the admin's profile
      const res = await fetch(`${FUNCTIONS_BASE}/api/intake/generate-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ label: label.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedUrl(data.intakeUrl);
      } else {
        toast.error(data.error ?? "Failed to generate link");
      }
    } catch {
      toast.error("Failed to generate link");
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-manrope font-bold text-[18px] text-icm-text mb-1">Generate Intake Link</h2>
        <p className="text-[12.5px] text-icm-text-dim font-geist mb-5">
          Create a unique referral link to share with external providers.
        </p>

        {!generatedUrl ? (
          <>
            <label className="block text-xs font-medium text-icm-text-dim mb-1.5">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. County Hospital Referrals"
              className="w-full border border-icm-border rounded-xl px-3 py-2 text-sm bg-icm-bg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-[11px] text-icm-text-faint mt-1.5 mb-5">
              This label helps you identify which link was used for each submission.
            </p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 h-9 rounded-xl border border-icm-border text-icm-text-dim text-sm font-geist font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={!label.trim() || loading}
                className="flex-1 h-9 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-geist font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Link →"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-medium">Copy this link now — it will not be shown again.</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-mono text-xs text-gray-700 break-all mb-3">
              {generatedUrl}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyUrl}
                className="flex-1 h-9 rounded-xl border border-icm-border bg-white hover:bg-muted text-sm font-geist font-medium text-icm-text transition-colors flex items-center justify-center gap-1.5"
              >
                {urlCopied ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy URL</>}
              </button>
              <button
                onClick={onSuccess}
                className="flex-1 h-9 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-geist font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DeactivateModal({ token, onConfirm, onClose }: { token: IntakeToken; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-manrope font-bold text-[16px] text-icm-text mb-2">Deactivate "{token.label}"?</h2>
        <p className="text-[13px] text-icm-text-dim font-geist mb-5">
          This will immediately stop accepting new submissions through this link.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-9 rounded-xl border border-icm-border text-icm-text-dim text-sm font-geist font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-geist font-semibold transition-colors"
          >
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}
