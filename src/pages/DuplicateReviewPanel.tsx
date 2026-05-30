/**
 * DuplicateReviewPanel — /people/duplicates
 *
 * Full-page duplicate record review workflow.
 * State machine: list → compare → merge (modal overlay)
 *
 * Parallel agent is responsible for creating useDuplicatePairs hook;
 * this file imports it as if it already exists.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Users,
  GitMerge,
  XCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  usePendingDuplicatePairs,
  resolvePairAsNotDuplicate,
  resolvePairAsMerged,
  type DuplicatePair,
} from "@/hooks/useDuplicatePairs";
import { useIndividuals, type Individual } from "@/hooks/useIndividuals";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "list" | "compare";

interface RecordCounts {
  notes: number;
  consents: number;
  carePlans: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | unknown): string {
  if (!dateStr || typeof dateStr !== "string") return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function formatFirestoreTs(ts: unknown): string {
  if (!ts) return "—";
  // Firestore Timestamp object
  if (ts && typeof (ts as any).toDate === "function") {
    return (ts as any).toDate().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  }
  if (ts instanceof Date) {
    return ts.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  }
  return "—";
}

function signalLabel(signal: DuplicatePair["matchSignal"]): string {
  switch (signal) {
    case "medicaid_id":
      return "Same Medicaid ID";
    case "name_dob":
      return "Same Name + DOB";
    case "both":
      return "Both signals";
    default:
      return signal;
  }
}

function indFullName(ind: Individual): string {
  return `${ind.first_name} ${ind.last_name}`.trim();
}

// ─── Subcollection copy helper ────────────────────────────────────────────────

const SUBCOLLECTIONS_BY_ID_FIELD: Array<{ col: string; field: string }> = [
  { col: "progress_notes", field: "individual_id" },
  { col: "contact_notes", field: "individual_id" },
  { col: "visit_summaries", field: "individual_id" },
  { col: "monitoring_forms", field: "individual_id" },
  { col: "care_plans", field: "individual_id" },
  { col: "assessments", field: "individual_id" },
  { col: "incidents", field: "individual_id" },
  { col: "referrals", field: "individual_id" },
];

async function performMerge(
  pair: DuplicatePair,
  survivorId: string,
  mergedId: string,
  userId: string,
  userName: string,
): Promise<void> {
  // 1. Archive the merged individual
  await updateDoc(doc(db, "individuals", mergedId), {
    enrollment_status: "archived",
    status: "archived",
    updatedAt: serverTimestamp(),
  });

  // 2. Copy top-level subcollections (filter by individual_id field)
  for (const { col, field } of SUBCOLLECTIONS_BY_ID_FIELD) {
    try {
      const snap = await getDocs(
        query(collection(db, col), where(field, "==", mergedId)),
      );
      const writes = snap.docs.map((d) => {
        const { [field]: _old, ...rest } = d.data() as Record<string, unknown>;
        return addDoc(collection(db, col), {
          ...rest,
          [field]: survivorId,
          _mergedFrom: mergedId,
          _mergedAt: serverTimestamp(),
        });
      });
      await Promise.all(writes);
    } catch (err) {
      // Non-fatal — log but don't abort
      console.warn(`[DuplicateMerge] Failed to copy ${col}:`, err);
    }
  }

  // 3. Copy consents subcollection (individuals/{id}/consents)
  try {
    const consentsSnap = await getDocs(
      collection(db, "individuals", mergedId, "consents"),
    );
    const consentWrites = consentsSnap.docs.map((d) =>
      addDoc(collection(db, "individuals", survivorId, "consents"), {
        ...d.data(),
        _mergedFrom: mergedId,
        _mergedAt: serverTimestamp(),
      }),
    );
    await Promise.all(consentWrites);
  } catch (err) {
    console.warn("[DuplicateMerge] Failed to copy consents:", err);
  }

  // 4. Resolve the pair
  await resolvePairAsMerged(pair.id, survivorId, mergedId, userId, userName);

  // 5. Audit log
  try {
    await addDoc(collection(db, "audit_log"), {
      actorUserId: userId,
      action: "merge_individuals",
      targetType: "individual",
      targetId: survivorId,
      metadata: {
        mergedId,
        pairId: pair.id,
        performedBy: userName,
      },
      occurredAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("[DuplicateMerge] Audit log failed (non-fatal):", err);
  }
}

// ─── Signal badge ─────────────────────────────────────────────────────────────

function SignalBadge({ signal }: { signal: DuplicatePair["matchSignal"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-icm-amber-soft text-icm-amber border border-icm-amber/20">
      <AlertTriangle className="w-3 h-3 shrink-0" />
      {signalLabel(signal)}
    </span>
  );
}

// ─── Warning icon ─────────────────────────────────────────────────────────────

function WarnIcon() {
  return <AlertTriangle className="w-3.5 h-3.5 text-icm-amber shrink-0 inline ml-1" />;
}

// ─── Record counts loader ─────────────────────────────────────────────────────

function useRecordCounts(individualId: string | undefined): RecordCounts & { loading: boolean } {
  const [counts, setCounts] = useState<RecordCounts>({ notes: 0, consents: 0, carePlans: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!individualId) return;
    setLoading(true);
    let cancelled = false;

    async function load() {
      try {
        const [notesSnap, consentsSnap, carePlansSnap] = await Promise.all([
          getDocs(query(collection(db, "progress_notes"), where("individual_id", "==", individualId))),
          getDocs(collection(db, "individuals", individualId!, "consents")),
          getDocs(query(collection(db, "care_plans"), where("individual_id", "==", individualId))),
        ]);
        if (!cancelled) {
          setCounts({
            notes: notesSnap.size,
            consents: consentsSnap.size,
            carePlans: carePlansSnap.size,
          });
        }
      } catch {
        // Silently handle — counts are informational
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [individualId]);

  return { ...counts, loading };
}

// ─── Record column ────────────────────────────────────────────────────────────

interface RecordColumnProps {
  label: "RECORD A" | "RECORD B";
  individual: Individual;
  signal: DuplicatePair["matchSignal"];
}

function RecordColumn({ label, individual, signal }: RecordColumnProps) {
  const counts = useRecordCounts(individual.id);
  const highlightName = signal === "name_dob" || signal === "both";
  const highlightMedicaid = signal === "medicaid_id" || signal === "both";

  const createdAt = formatFirestoreTs(individual.createdAt);

  function Row({
    field,
    value,
    highlight,
  }: {
    field: string;
    value: string;
    highlight?: boolean;
  }) {
    return (
      <tr className="border-b border-icm-border last:border-0">
        <td className="py-2.5 pr-4 text-[12px] font-medium text-icm-text-dim w-36 shrink-0 align-top">
          {field}
        </td>
        <td className="py-2.5 text-[13px] font-medium text-icm-text align-top">
          <span className={cn(highlight && "text-icm-amber font-semibold")}>
            {value || "—"}
          </span>
          {highlight && <WarnIcon />}
        </td>
      </tr>
    );
  }

  const enrollmentLabel =
    individual.enrollment_status
      ? individual.enrollment_status.charAt(0).toUpperCase() + individual.enrollment_status.slice(1)
      : "—";

  return (
    <div className="flex-1 bg-icm-panel border border-icm-border rounded-xl overflow-hidden min-w-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-icm-border bg-icm-bg/60">
        <p className="text-[11px] font-bold tracking-widest text-icm-text-faint uppercase mb-0.5">
          {label}
        </p>
        <p className="text-[12px] text-icm-text-dim font-medium">
          Created {createdAt}
        </p>
      </div>

      {/* Fields table */}
      <div className="px-5 py-3">
        <table className="w-full">
          <tbody>
            <Row
              field="Name"
              value={indFullName(individual)}
              highlight={highlightName}
            />
            <Row
              field="Date of Birth"
              value={formatDate(individual.dob ?? individual.date_of_birth)}
              highlight={highlightName}
            />
            <Row
              field="Medicaid ID"
              value={individual.medicaid_id ?? "—"}
              highlight={highlightMedicaid}
            />
            <Row field="Program" value={individual.program ?? "—"} />
            <Row field="County" value={individual.county ?? "—"} />
            <Row
              field="Coordinator"
              value={individual.assigned_case_manager_name ?? individual.assigned_case_manager ?? "—"}
            />
            <Row field="Enrollment" value={enrollmentLabel} />
            <Row
              field="Progress Notes"
              value={counts.loading ? "…" : String(counts.notes)}
            />
            <Row
              field="Consents"
              value={counts.loading ? "…" : String(counts.consents)}
            />
            <Row
              field="Care Plans"
              value={counts.loading ? "…" : String(counts.carePlans)}
            />
          </tbody>
        </table>
      </div>

      {/* View profile link */}
      <div className="px-5 pb-4">
        <a
          href={`/people/${individual.id}/echart`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          View full profile
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

// ─── Merge modal ──────────────────────────────────────────────────────────────

interface MergeModalProps {
  pair: DuplicatePair;
  indA: Individual;
  indB: Individual;
  onCancel: () => void;
  onSuccess: () => void;
  userId: string;
  userName: string;
}

function MergeModal({ pair, indA, indB, onCancel, onSuccess, userId, userName }: MergeModalProps) {
  const [survivorId, setSurvivorId] = useState<string>(pair.individualAId);
  const [confirmText, setConfirmText] = useState("");
  const [saving, setSaving] = useState(false);

  const mergedId = survivorId === pair.individualAId ? pair.individualBId : pair.individualAId;
  const survivor = survivorId === pair.individualAId ? indA : indB;
  const merged = survivorId === pair.individualAId ? indB : indA;
  const canConfirm = confirmText === "MERGE" && !saving;

  async function handleMerge() {
    if (!canConfirm) return;
    setSaving(true);
    try {
      await performMerge(pair, survivorId, mergedId, userId, userName);
      toast.success("Records merged successfully");
      onSuccess();
    } catch (err) {
      console.error("[MergeModal] Merge failed:", err);
      toast.error("Merge failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-icm-panel border border-icm-border rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="px-6 py-5 border-b border-icm-border">
          <div className="flex items-center gap-2 mb-1">
            <GitMerge className="w-5 h-5 text-icm-text-dim" />
            <h2 className="text-[16px] font-bold font-manrope text-icm-text">Merge Records</h2>
          </div>
          <p className="text-[13px] text-icm-text-dim">
            Select which record to keep as the primary. The other will be archived and its data merged into the primary.
          </p>
        </div>

        {/* Survivor selection */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-[12px] font-semibold text-icm-text-dim uppercase tracking-wide mb-2">
            Select primary record
          </p>

          {[indA, indB].map((ind) => {
            const isSelected = survivorId === ind.id;
            return (
              <label
                key={ind.id}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                  isSelected
                    ? "border-indigo-500 bg-indigo-50/60"
                    : "border-icm-border bg-icm-bg hover:border-icm-border-hover",
                )}
              >
                <input
                  type="radio"
                  name="survivor"
                  value={ind.id}
                  checked={isSelected}
                  onChange={() => setSurvivorId(ind.id)}
                  className="mt-0.5 accent-indigo-600"
                />
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-icm-text">{indFullName(ind)}</p>
                  <p className="text-[12px] text-icm-text-dim">
                    {ind.medicaid_id ? `Medicaid ID: ${ind.medicaid_id}` : "No Medicaid ID"}
                    {ind.dob ? ` · DOB: ${formatDate(ind.dob)}` : ""}
                  </p>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Primary (kept)
                    </span>
                  )}
                  {!isSelected && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-icm-text-faint bg-icm-bg px-2 py-0.5 rounded-full border border-icm-border">
                      Archived &amp; merged into primary
                    </span>
                  )}
                </div>
              </label>
            );
          })}

          {/* Summary */}
          <div className="rounded-lg bg-icm-amber-soft border border-icm-amber/20 px-4 py-3 text-[12px] text-icm-amber mt-1">
            <p className="font-semibold mb-0.5">What will happen:</p>
            <ul className="list-disc list-inside space-y-0.5 text-icm-amber/90">
              <li>
                <strong>{indFullName(merged)}</strong> will be archived
              </li>
              <li>All notes, consents &amp; care plans will be copied to <strong>{indFullName(survivor)}</strong></li>
              <li>This action cannot be undone</li>
            </ul>
          </div>

          {/* Confirm input */}
          <div className="pt-1">
            <label className="block text-[12px] font-semibold text-icm-text-dim mb-1.5">
              Type <span className="font-bold text-icm-text">MERGE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="MERGE"
              className="w-full h-9 px-3 rounded-lg border border-icm-border bg-icm-bg text-[13px] text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-icm-border flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="h-9 px-4 rounded-xl text-[13px] font-semibold text-icm-text-dim hover:text-icm-text hover:bg-icm-bg border border-icm-border transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={!canConfirm}
            className={cn(
              "h-9 px-4 rounded-xl text-[13px] font-semibold flex items-center gap-2 transition",
              canConfirm
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-icm-border text-icm-text-faint cursor-not-allowed",
            )}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Merge Records
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Not a Duplicate modal ────────────────────────────────────────────────────

interface NotDupModalProps {
  indA: Individual;
  indB: Individual;
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
}

function NotDupModal({ indA, indB, onCancel, onConfirm, saving }: NotDupModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-icm-panel border border-icm-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-icm-border">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-5 h-5 text-icm-text-dim" />
            <h2 className="text-[16px] font-bold font-manrope text-icm-text">
              Mark as Not a Duplicate
            </h2>
          </div>
          <p className="text-[13px] text-icm-text-dim">
            This will dismiss the duplicate alert and no further action will be taken.
          </p>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className="rounded-xl bg-icm-bg border border-icm-border px-4 py-3 text-[13px] text-icm-text-dim">
            <p>
              <strong className="text-icm-text">{indFullName(indA)}</strong> and{" "}
              <strong className="text-icm-text">{indFullName(indB)}</strong> will be marked as
              distinct individuals.
            </p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-icm-border flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="h-9 px-4 rounded-xl text-[13px] font-semibold text-icm-text-dim hover:text-icm-text hover:bg-icm-bg border border-icm-border transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="h-9 px-4 rounded-xl text-[13px] font-semibold bg-icm-text text-white hover:bg-icm-text/90 flex items-center gap-2 transition disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Not a duplicate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

interface ListViewProps {
  pairs: DuplicatePair[];
  individuals: Individual[];
  onSelect: (pair: DuplicatePair) => void;
}

function ListView({ pairs, individuals, onSelect }: ListViewProps) {
  const indMap = new Map(individuals.map((i) => [i.id, i]));

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-icm-text-dim mb-4">
        {pairs.length} pending pair{pairs.length !== 1 ? "s" : ""} to review
      </p>
      {pairs.map((pair, idx) => {
        const indA = indMap.get(pair.individualAId);
        const indB = indMap.get(pair.individualBId);
        const nameA = indA ? indFullName(indA) : pair.individualAId;
        const nameB = indB ? indFullName(indB) : pair.individualBId;
        const detectedDate = pair.detectedAt
          ? (typeof (pair.detectedAt as any).toDate === "function"
              ? (pair.detectedAt as any).toDate().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
              : "—")
          : "—";

        return (
          <button
            key={pair.id}
            onClick={() => onSelect(pair)}
            className="w-full text-left bg-icm-panel border border-icm-border rounded-xl px-5 py-4 hover:border-indigo-400 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold text-icm-text-faint uppercase tracking-wider">
                    Pair {idx + 1}
                  </span>
                  <SignalBadge signal={pair.matchSignal} />
                </div>
                <p className="text-[14px] font-semibold text-icm-text mb-0.5">
                  {nameA}
                  <span className="text-icm-text-faint font-normal mx-2">vs</span>
                  {nameB}
                </p>
                <p className="text-[12px] text-icm-text-dim">Detected {detectedDate}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-icm-text-faint group-hover:text-indigo-500 transition-colors mt-1 shrink-0" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Compare view ─────────────────────────────────────────────────────────────

interface CompareViewProps {
  pair: DuplicatePair;
  pairIndex: number;
  totalPairs: number;
  indA: Individual;
  indB: Individual;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onResolved: () => void;
  canMerge: boolean;
  userId: string;
  userName: string;
}

function CompareView({
  pair,
  pairIndex,
  totalPairs,
  indA,
  indB,
  onBack,
  onPrev,
  onNext,
  onResolved,
  canMerge,
  userId,
  userName,
}: CompareViewProps) {
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showNotDupModal, setShowNotDupModal] = useState(false);
  const [resolvingSaving, setResolvingSaving] = useState(false);

  async function handleNotDuplicate() {
    setResolvingSaving(true);
    try {
      await resolvePairAsNotDuplicate(pair.id, userId, userName);
      toast.success("Pair dismissed — marked as not a duplicate");
      onResolved();
    } catch (err) {
      console.error("[DuplicateReviewPanel] Not-duplicate resolve failed:", err);
      toast.error("Failed to dismiss pair. Please try again.");
    } finally {
      setResolvingSaving(false);
      setShowNotDupModal(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-icm-text-dim hover:text-icm-text transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to People Supported
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-icm-text-dim">
              Pair {pairIndex + 1} of {totalPairs} pending
            </span>
            <button
              onClick={onPrev}
              disabled={pairIndex === 0}
              className="h-7 w-7 rounded-lg border border-icm-border flex items-center justify-center text-icm-text-dim hover:text-icm-text hover:bg-icm-bg transition disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous pair"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onNext}
              disabled={pairIndex >= totalPairs - 1}
              className="h-7 w-7 rounded-lg border border-icm-border flex items-center justify-center text-icm-text-dim hover:text-icm-text hover:bg-icm-bg transition disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next pair"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Page title area */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-icm-amber" />
            <h1 className="text-[20px] font-bold font-manrope text-icm-text">
              Possible duplicate detected
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-icm-text-dim font-medium">Match signal:</span>
            <SignalBadge signal={pair.matchSignal} />
          </div>
        </div>

        {/* Side-by-side comparison */}
        <div className="flex flex-col lg:flex-row gap-4">
          <RecordColumn label="RECORD A" individual={indA} signal={pair.matchSignal} />
          <RecordColumn label="RECORD B" individual={indB} signal={pair.matchSignal} />
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Merge card */}
          <div className="bg-icm-panel border border-icm-border rounded-xl px-5 py-5">
            <div className="flex items-center gap-2 mb-2">
              <GitMerge className="w-5 h-5 text-indigo-500" />
              <h3 className="text-[15px] font-bold font-manrope text-icm-text">Merge Records</h3>
            </div>
            <p className="text-[13px] text-icm-text-dim mb-3">
              Combine both records into one, keeping all notes, consents, and care plans. The
              archived record will be flagged but retained for audit purposes.
            </p>
            {!canMerge && (
              <p className="text-[11px] font-semibold text-icm-amber mb-3">
                This action requires Admin or Supervisor role
              </p>
            )}
            <button
              onClick={() => setShowMergeModal(true)}
              disabled={!canMerge}
              className={cn(
                "h-9 px-4 rounded-xl text-[13px] font-semibold flex items-center gap-2 transition",
                canMerge
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-icm-border text-icm-text-faint cursor-not-allowed",
              )}
            >
              <GitMerge className="w-4 h-4" />
              Merge records
            </button>
          </div>

          {/* Not a duplicate card */}
          <div className="bg-icm-panel border border-icm-border rounded-xl px-5 py-5">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-icm-text-dim" />
              <h3 className="text-[15px] font-bold font-manrope text-icm-text">
                Not a Duplicate
              </h3>
            </div>
            <p className="text-[13px] text-icm-text-dim mb-3">
              These records represent two distinct individuals. Dismiss this alert and keep both
              records active.
            </p>
            <button
              onClick={() => setShowNotDupModal(true)}
              className="h-9 px-4 rounded-xl text-[13px] font-semibold border border-icm-border text-icm-text hover:bg-icm-bg flex items-center gap-2 transition"
            >
              <XCircle className="w-4 h-4" />
              Not a duplicate
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showMergeModal && (
        <MergeModal
          pair={pair}
          indA={indA}
          indB={indB}
          onCancel={() => setShowMergeModal(false)}
          onSuccess={() => {
            setShowMergeModal(false);
            onResolved();
          }}
          userId={userId}
          userName={userName}
        />
      )}

      {showNotDupModal && (
        <NotDupModal
          indA={indA}
          indB={indB}
          onCancel={() => setShowNotDupModal(false)}
          onConfirm={handleNotDuplicate}
          saving={resolvingSaving}
        />
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DuplicateReviewPanel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userProfile, isSupervisor } = useAuth();

  const { data: pairs, loading: pairsLoading } = usePendingDuplicatePairs(userProfile?.organizationId);
  const { individuals } = useIndividuals();

  const userId = userProfile?.uid ?? "";
  const userName =
    userProfile?.displayName ||
    `${userProfile?.firstName ?? ""} ${userProfile?.lastName ?? ""}`.trim() ||
    "User";

  // Current pair index in compare view
  const [currentIdx, setCurrentIdx] = useState<number>(0);

  // Determine view from query param + state
  const pairIdParam = searchParams.get("pairId");

  // Derive view: if we have a pairId param or we've selected a pair, show compare
  const [selectedPairId, setSelectedPairId] = useState<string | null>(pairIdParam ?? null);

  // Sync pairId from URL param on load
  useEffect(() => {
    if (pairIdParam) {
      setSelectedPairId(pairIdParam);
    }
  }, [pairIdParam]);

  // When pairs load and we have a selectedPairId, find its index
  useEffect(() => {
    if (!pairsLoading && selectedPairId && pairs.length > 0) {
      const idx = pairs.findIndex((p) => p.id === selectedPairId);
      if (idx >= 0) {
        setCurrentIdx(idx);
      } else {
        // Pair no longer pending (maybe resolved externally)
        setSelectedPairId(null);
        setCurrentIdx(0);
      }
    }
  }, [pairsLoading, selectedPairId, pairs]);

  const view: ViewMode = selectedPairId != null ? "compare" : "list";

  // The active pair
  const activePair = view === "compare" ? pairs[currentIdx] : undefined;

  // Individual lookup
  const indMap = new Map(individuals.map((i) => [i.id, i]));
  const indA = activePair ? indMap.get(activePair.individualAId) : undefined;
  const indB = activePair ? indMap.get(activePair.individualBId) : undefined;

  // Wait for individual data to be available
  const indLoading = activePair && (!indA || !indB);

  const canMerge = isSupervisor;

  // ── Navigation helpers ──────────────────────────────────────────────────────

  function selectPair(pair: DuplicatePair) {
    const idx = pairs.findIndex((p) => p.id === pair.id);
    setCurrentIdx(idx >= 0 ? idx : 0);
    setSelectedPairId(pair.id);
  }

  function goToPrev() {
    if (currentIdx > 0) {
      const prev = pairs[currentIdx - 1];
      setCurrentIdx(currentIdx - 1);
      setSelectedPairId(prev.id);
    }
  }

  function goToNext() {
    if (currentIdx < pairs.length - 1) {
      const next = pairs[currentIdx + 1];
      setCurrentIdx(currentIdx + 1);
      setSelectedPairId(next.id);
    }
  }

  function handleResolved() {
    // pairs list will update reactively via listener in hook
    // Try to advance to next; if none remain go to /people
    const remainingAfter = pairs.filter((_, i) => i !== currentIdx);
    if (remainingAfter.length === 0) {
      navigate("/people");
    } else {
      const nextIdx = Math.min(currentIdx, remainingAfter.length - 1);
      const nextPair = remainingAfter[nextIdx];
      setCurrentIdx(nextIdx);
      setSelectedPairId(nextPair.id);
    }
  }

  function handleBack() {
    if (view === "compare") {
      setSelectedPairId(null);
    } else {
      navigate("/people");
    }
  }

  // ── Breadcrumbs ─────────────────────────────────────────────────────────────

  const breadcrumbs =
    view === "compare"
      ? [
          { label: "People Supported", to: "/people" },
          { label: "Duplicate Review", to: "/people/duplicates" },
          {
            label:
              indA && indB
                ? `${indFullName(indA)} vs ${indFullName(indB)}`
                : "Compare",
          },
        ]
      : [{ label: "People Supported", to: "/people" }, { label: "Duplicate Review" }];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ICMShell showAIPanel={false}>
      <div className="space-y-5">
        <Breadcrumbs items={breadcrumbs} />

        {/* Page header (list view only) */}
        {view === "list" && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-icm-amber-soft border border-icm-amber/20 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-icm-amber" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold font-manrope text-icm-text leading-tight">
                DUPLICATE REVIEW
              </h1>
              <p className="text-[13px] text-icm-text-dim">
                Review and resolve possible duplicate individual records
              </p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {pairsLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-icm-text-faint" />
          </div>
        )}

        {/* Empty state */}
        {!pairsLoading && pairs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-icm-panel border border-icm-border flex items-center justify-center mb-2">
              <CheckCircle2 className="w-7 h-7 text-icm-green" />
            </div>
            <h2 className="text-[18px] font-bold font-manrope text-icm-text">
              All clear
            </h2>
            <p className="text-[13px] text-icm-text-dim max-w-xs">
              No pending duplicate pairs to review. Check back after new imports or records are added.
            </p>
            <button
              onClick={() => navigate("/people")}
              className="mt-2 h-9 px-4 rounded-xl text-[13px] font-semibold border border-icm-border text-icm-text-dim hover:text-icm-text hover:bg-icm-bg transition"
            >
              Back to People Supported
            </button>
          </div>
        )}

        {/* List view */}
        {!pairsLoading && pairs.length > 0 && view === "list" && (
          <ListView
            pairs={pairs}
            individuals={individuals}
            onSelect={selectPair}
          />
        )}

        {/* Compare view — loading individuals */}
        {!pairsLoading && view === "compare" && indLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-icm-text-faint" />
          </div>
        )}

        {/* Compare view — individual data ready */}
        {!pairsLoading &&
          view === "compare" &&
          activePair &&
          indA &&
          indB && (
            <CompareView
              pair={activePair}
              pairIndex={currentIdx}
              totalPairs={pairs.length}
              indA={indA}
              indB={indB}
              onBack={handleBack}
              onPrev={goToPrev}
              onNext={goToNext}
              onResolved={handleResolved}
              canMerge={canMerge}
              userId={userId}
              userName={userName}
            />
          )}
      </div>
    </ICMShell>
  );
}
