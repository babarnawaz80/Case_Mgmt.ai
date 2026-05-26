/**
 * PCPSendModal.tsx
 * Send Plan modal with two options: Secure Link + Download PDF
 */
import { useMemo, useState } from "react";
import { X, Link as LinkIcon, Download, Copy, Mail, Lock, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";

interface PCPSendModalProps {
  pcpId: string;
  personName: string;
  planType: string;
  onClose: () => void;
}

export function PCPSendModal({ pcpId, personName, planType, onClose }: PCPSendModalProps) {
  const [linkGenerated, setLinkGenerated] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");

  const secureLink = useMemo(() => {
    const token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    return `https://share.casemgmt.ai/pcp/${pcpId.toLowerCase()}/${token}`;
  }, [pcpId]);

  // Format filename
  const lastName = personName.split(" ").pop() || "Person";
  const firstName = personName.split(" ").slice(0, -1).join("") || "Individual";
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const filename = `PCP_${lastName}${firstName}_${planType.replace(/\s+/g, "")}_${today}.pdf`;

  const handleGenerateLink = () => {
    setLinkGenerated(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(secureLink);
    toast.success("Secure link copied to clipboard");
  };

  const handleSendEmail = () => {
    if (!recipientEmail) {
      toast.error("Please enter a recipient email address");
      return;
    }
    toast.success(`Secure link sent to ${recipientEmail}`);
    onClose();
  };

  const handleDownloadPDF = () => {
    toast.success(`Downloading ${filename}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-icm-border flex items-center justify-between">
          <h3 className="font-manrope font-bold text-[16px] text-icm-text">Send Plan</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-icm-bg text-icm-text-dim">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Plan info pill */}
        <div className="px-6 pt-4 pb-2">
          <div className="rounded-lg border border-icm-border bg-icm-bg/50 px-3 py-2.5 flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-icm-text-dim shrink-0" />
            <div>
              <p className="text-[12.5px] font-semibold text-icm-text">
                Person-Centered Plan — {personName}
              </p>
              <p className="text-[11px] text-icm-text-dim font-mono">{planType} · Draft</p>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="px-6 pb-6 space-y-3 mt-2">
          {/* Option 1: Secure Link */}
          <div className="rounded-xl border border-icm-border p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-icm-text">Send Secure Link</p>
                <p className="text-[11.5px] text-icm-text-dim leading-snug">
                  Generate a secure, encrypted link to share with the provider or agency
                </p>
              </div>
            </div>

            {!linkGenerated ? (
              <button
                onClick={handleGenerateLink}
                className="w-full h-9 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-700 transition-colors"
              >
                Generate Secure Link
              </button>
            ) : (
              <div className="space-y-3">
                {/* Link field */}
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate text-[11px] font-mono text-icm-text bg-icm-bg border border-icm-border rounded-lg px-3 py-2">
                    {secureLink}
                  </code>
                  <button
                    onClick={handleCopyLink}
                    className="p-2 rounded-lg border border-icm-border hover:bg-icm-bg shrink-0"
                    title="Copy link"
                  >
                    <Copy className="w-3.5 h-3.5 text-icm-text-dim" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-icm-text-faint">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                  Link expires in 30 days · Encrypted
                </div>

                {/* Email field */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wide font-semibold text-icm-text-faint mb-1">
                    Recipient Email (optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="provider@example.com"
                      className="flex-1 h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                    <button
                      onClick={handleSendEmail}
                      className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-700 inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Mail className="w-3.5 h-3.5" /> Send via email
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Option 2: Download PDF */}
          <div className="rounded-xl border border-icm-border p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-icm-text">Download as PDF</p>
                <p className="text-[11.5px] text-icm-text-dim leading-snug">
                  Download a formatted PDF to attach to an email or upload to LTSS
                </p>
                <p className="text-[10.5px] font-mono text-icm-text-faint mt-0.5 truncate">
                  {filename}
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadPDF}
              className="w-full h-9 rounded-lg bg-teal-600 text-white text-[12px] font-semibold hover:bg-teal-700 inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
