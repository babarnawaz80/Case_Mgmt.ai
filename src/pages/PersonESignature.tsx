import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Loader2,
  CalendarDays,
  FileText,
  Clock,
  PenTool,
  CheckSquare,
  AlertCircle,
  FileSignature,
  Lock,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual, riskAvatarClass, initials } from "@/hooks/useIndividuals";
import { useProgressNotes, updateProgressNote } from "@/hooks/useProgressNotes";
import { writeAudit } from "@/lib/auditService";
import { toast } from "sonner";

export default function PersonESignature() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading: individualLoading } = useIndividual(id);
  const { notes, loading: notesLoading } = useProgressNotes(id);
  const personLabel = individual ? `${individual.last_name}, ${individual.first_name}` : "Person";

  const [signingNote, setSigningNote] = useState<any | null>(null);
  const [signatureName, setSignatureName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingNotes = useMemo(() => {
    return (notes || []).filter((n) => n.status === "draft" || n.status === "pending_signature");
  }, [notes]);

  const handleSign = async () => {
    if (!signingNote || !signatureName.trim()) return;
    setIsSubmitting(true);
    try {
      // Update note status to signed in Firestore
      await updateProgressNote(signingNote.id, {
        status: "signed",
        signedAt: new Date().toISOString(),
      });

      // Write immutable SOC 2 audit log
      await writeAudit("edit_note", "note", signingNote.id, {
        status: "signed",
        signatory: signatureName,
        individual_id: id ?? "",
      });

      toast.success("Progress Note signed successfully!");
      setSigningNote(null);
      setSignatureName("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to sign progress note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loading = individualLoading || notesLoading;

  if (loading) {
    return (
      <ICMShell title="e-Signature Queue" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading signature queue…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return (
      <ICMShell title="e-Signature Queue" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="e-Signature Queue" showAIPanel={false}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(`/people/${individual.id}/echart`)}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          People · {individual.last_name}, {individual.first_name} · e-Signatures
        </button>

        {/* Sticky person header */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-3 flex-wrap">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono text-[14px] font-bold ${riskAvatarClass(individual.risk_score)}`}>
            {initials(individual)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-manrope font-extrabold text-[16px] text-icm-text tracking-tight">
              {individual.last_name}, {individual.first_name}
              {individual.preferred_name && <span className="font-medium text-icm-text-dim"> ({individual.preferred_name})</span>}
            </h2>
            <p className="text-[11.5px] font-mono text-icm-text-dim">
              {individual.gender ?? "—"} · {individual.county ?? "—"} · ID #{individual.id.slice(0, 8)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
            <span className="w-1.5 h-1.5 rounded-full bg-icm-green" />
            {individual.enrollment_status}
          </span>
        </div>

        {/* E-Signature Intro Card */}
        <div className="bg-gradient-to-br from-white to-indigo-50/40 border border-icm-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
              <FileSignature className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-manrope text-xl font-black tracking-tight text-slate-900">e-Signature Queue</h1>
              <p className="text-[12px] text-slate-500">Sign outstanding draft clinical progress notes and documentation to lock audits.</p>
            </div>
          </div>
        </div>

        {/* Signature List */}
        <div className="space-y-4">
          <div className="border-b border-icm-border pb-3">
            <h3 className="font-manrope font-extrabold text-[16px] text-icm-text tracking-tight">Pending Signatures</h3>
            <p className="text-[12px] text-icm-text-dim mt-0.5">{pendingNotes.length} clinical records requiring your verification.</p>
          </div>

          {pendingNotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-icm-border bg-icm-panel p-12 text-center">
              <CheckSquare className="w-10 h-10 mx-auto text-icm-text-faint mb-2.5" />
              <p className="text-[13px] font-semibold text-slate-700">All caught up!</p>
              <p className="text-[12px] text-slate-500 mt-1 max-w-sm mx-auto">
                There are no progress notes or care plans awaiting signature for {individual.first_name}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingNotes.map((n) => (
                <div key={n.id} className="bg-white border border-icm-border rounded-xl p-4 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <h4 className="font-manrope font-bold text-[14px] text-slate-800 tracking-tight">{n.activityType || "Case Session"}</h4>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-geist bg-amber-50 text-amber-700 ring-1 ring-amber-600/10">
                        {n.status === "draft" ? "Draft" : "Pending Signature"}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-[12px] text-slate-600 font-geist">
                      <p className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400 w-16">Date:</span>
                        <span className="font-medium text-slate-800 inline-flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                          {n.progressDate}
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400 w-16">Duration:</span>
                        <span className="font-medium text-slate-800 inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {n.startTime} – {n.endTime}
                        </span>
                      </p>
                      {n.purposeOfActivity && (
                        <p className="text-[11.5px] text-slate-500 leading-normal line-clamp-2 mt-2 bg-slate-50 p-2 rounded-lg italic">
                          "{n.purposeOfActivity}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => navigate(`/people/${id}/progress-note/${n.id}`)}
                      className="text-[11.5px] font-geist font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded"
                    >
                      View Note
                    </button>
                    <button
                      onClick={() => setSigningNote(n)}
                      className="inline-flex items-center gap-1.5 text-[11.5px] px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition"
                    >
                      <PenTool className="w-3.5 h-3.5" /> Sign Document
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lock Notice */}
        <div className="bg-gradient-to-br from-indigo-50/50 to-indigo-100/30 border border-indigo-200/50 rounded-xl p-4 flex gap-3">
          <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-[12px] text-indigo-800 leading-relaxed font-geist">
            <span className="font-semibold">Electronic Signature Policy:</span> Electronic signatures applied to CaseManagement.AI records are legally binding under the Uniform Electronic Transactions Act (UETA) and comply with HIPAA documentation standards. Signed clinical notes cannot be deleted or edited.
          </div>
        </div>
      </div>

      {/* Signature Dialog */}
      {signingNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <h2 className="text-[14px] font-bold text-slate-800 flex items-center gap-1.5">
                <PenTool className="w-4 h-4 text-indigo-600" /> Electronic Signature Verification
              </h2>
              <button
                onClick={() => {
                  setSigningNote(null);
                  setSignatureName("");
                }}
                className="p-1 rounded hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 font-geist">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-[12.5px] text-slate-600">
                <p><span className="font-semibold text-slate-500">Document Type:</span> Progress Note</p>
                <p className="mt-1"><span className="font-semibold text-slate-500">Service Date:</span> {signingNote.progressDate}</p>
                <p className="mt-1"><span className="font-semibold text-slate-500">Category:</span> {signingNote.activityType}</p>
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                  Type your full name to sign
                </label>
                <input
                  autoFocus
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="e.g. Kathy Martinez"
                  className="w-full text-[13px] px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <p className="text-[11px] text-slate-400 leading-normal text-center">
                By typing your name above, you certify that this progress note is a complete and accurate record of support services provided to {personLabel}.
              </p>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-50 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => {
                  setSigningNote(null);
                  setSignatureName("");
                }}
                className="text-[12px] px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={isSubmitting || !signatureName.trim()}
                onClick={handleSign}
                className="inline-flex items-center gap-1.5 text-[12px] px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm disabled:opacity-40"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Signing…
                  </>
                ) : (
                  <>
                    <FileSignature className="w-3.5 h-3.5" /> Sign Note
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ICMShell>
  );
}
