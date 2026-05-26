/**
 * useBillingRecords — real-time Firestore hook for the billing_records collection.
 * This is the authoritative post-validation billing record created when a note is signed.
 */
import { useState, useEffect, useCallback } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp, getDocs,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────

export type BillingStatus =
  | "pending_scrub"
  | "scrub_passed"
  | "needs_attention"
  | "submitted"
  | "accepted"
  | "denied"
  | "adjusted"
  | "void";

export type ValidationStatus = "pending" | "passed" | "failed" | "override";

export type NoteType =
  | "progress_note"
  | "contact_note"
  | "visit_summary"
  | "monitoring_form"
  | "billable_activity_note";

export interface ValidationChecks {
  auth_exists: { passed: boolean; message: string };
  units_within_cap: { passed: boolean; units_requested: number; units_remaining: number; message: string };
  eligibility_active: { passed: boolean; ma_status: string; message: string };
  documentation_complete: { passed: boolean; missing_fields: string[]; message: string };
}

export interface BillingRecord {
  id: string;
  org_id: string;
  individual_id: string;
  individual_name: string;
  case_manager_id: string;
  case_manager_name: string;

  // Source note
  source_note_id: string;
  source_note_type: NoteType;
  source_note_url: string;

  // Service details
  service_code: string;
  service_description: string;
  billing_unit_type: "15_min" | "hourly" | "daily" | "monthly" | "milestone";
  units: number;
  rate_per_unit: number;
  total_amount: number;

  // Date and time
  date_of_service: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;

  // Authorization
  authorization_id: string;
  authorization_number: string;
  funding_stream_id: string;
  payer_name: string;
  payer_id: string;

  // Validation
  validation_status: ValidationStatus;
  validation_checks?: Partial<ValidationChecks>;
  validation_ran_at?: unknown;

  // Billing queue status
  billing_status: BillingStatus;

  // IDD Billing.AI
  submitted_to_iddbilling: boolean;
  submitted_at?: unknown;
  submission_batch_id?: string | null;
  iddbilling_claim_id?: string | null;
  iddbilling_status?: string | null;

  // Remittance
  remittance_received: boolean;
  remittance_date?: string | null;
  amount_paid?: number | null;
  denial_reason?: string | null;
  adjustment_amount?: number | null;

  // Corrections
  correction_task_id?: string | null;
  override_by?: string | null;
  override_reason?: string | null;
  override_at?: unknown;

  // Audit
  created_at?: unknown;
  updated_at?: unknown;
  signed_by?: string;
  signed_at?: unknown;
}

function toRecord(id: string, d: DocumentData): BillingRecord {
  return {
    id,
    org_id: d.org_id ?? d.organizationId ?? "",
    individual_id: d.individual_id ?? d.individualId ?? "",
    individual_name: d.individual_name ?? d.individualName ?? "",
    case_manager_id: d.case_manager_id ?? d.caseManagerId ?? "",
    case_manager_name: d.case_manager_name ?? d.caseManagerName ?? "",
    source_note_id: d.source_note_id ?? d.sourceNoteId ?? "",
    source_note_type: d.source_note_type ?? d.sourceNoteType ?? "progress_note",
    source_note_url: d.source_note_url ?? d.sourceNoteUrl ?? "",
    service_code: d.service_code ?? d.serviceCode ?? "",
    service_description: d.service_description ?? d.serviceDescription ?? "",
    billing_unit_type: d.billing_unit_type ?? d.billingUnitType ?? "15_min",
    units: d.units ?? 0,
    rate_per_unit: d.rate_per_unit ?? d.ratePerUnit ?? 28.5,
    total_amount: d.total_amount ?? d.totalAmount ?? 0,
    date_of_service: d.date_of_service ?? d.dos ?? d.dateOfService ?? "",
    start_time: d.start_time ?? d.startTime ?? "",
    end_time: d.end_time ?? d.endTime ?? "",
    duration_minutes: d.duration_minutes ?? d.durationMinutes ?? 0,
    authorization_id: d.authorization_id ?? d.authorizationId ?? "",
    authorization_number: d.authorization_number ?? d.authorizationNumber ?? d.auth ?? "",
    funding_stream_id: d.funding_stream_id ?? d.fundingStreamId ?? "",
    payer_name: d.payer_name ?? d.payerName ?? d.payer ?? "",
    payer_id: d.payer_id ?? d.payerId ?? "",
    validation_status: d.validation_status ?? "pending",
    validation_checks: d.validation_checks,
    validation_ran_at: d.validation_ran_at,
    billing_status: d.billing_status ?? d.billingStatus ?? "pending_scrub",
    submitted_to_iddbilling: d.submitted_to_iddbilling ?? d.submittedToIddbilling ?? false,
    submitted_at: d.submitted_at,
    submission_batch_id: d.submission_batch_id ?? null,
    iddbilling_claim_id: d.iddbilling_claim_id ?? null,
    iddbilling_status: d.iddbilling_status ?? null,
    remittance_received: d.remittance_received ?? false,
    remittance_date: d.remittance_date ?? null,
    amount_paid: d.amount_paid ?? null,
    denial_reason: d.denial_reason ?? null,
    adjustment_amount: d.adjustment_amount ?? null,
    correction_task_id: d.correction_task_id ?? null,
    override_by: d.override_by ?? null,
    override_reason: d.override_reason ?? null,
    override_at: d.override_at,
    created_at: d.created_at,
    updated_at: d.updated_at,
    signed_by: d.signed_by ?? "",
    signed_at: d.signed_at,
  };
}

// ── Hooks ─────────────────────────────────────────────────────────────────

export function useBillingRecords(individualId?: string) {
  const { userProfile } = useAuth();
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.organizationId) { setLoading(false); return; }
    setLoading(true);
    const orgId = userProfile.organizationId;

    // Subscribe to both field variants (org_id for notes flow, organizationId for seeded data)
    // and merge results, deduplicating by document ID.
    const qOrg = query(collection(db, "billing_records"),
      where("org_id", "==", orgId),
      ...(individualId ? [where("individual_id", "==", individualId)] : [])
    );
    const qOrgId = query(collection(db, "billing_records"),
      where("organizationId", "==", orgId),
      ...(individualId ? [where("individual_id", "==", individualId)] : [])
    );

    let orgRecs: BillingRecord[] = [];
    let orgIdRecs: BillingRecord[] = [];

    const rebuild = () => {
      const all = new Map<string, BillingRecord>();
      [...orgRecs, ...orgIdRecs].forEach(r => all.set(r.id, r));
      const list = Array.from(all.values());
      list.sort((a, b) => (b.date_of_service || "").localeCompare(a.date_of_service || ""));
      setRecords(list);
      setLoading(false);
    };

    const unsub1 = onSnapshot(qOrg, (snap) => {
      orgRecs = snap.docs.map(d => toRecord(d.id, d.data()));
      rebuild();
    }, (err) => { console.warn("[billingRecords/org_id]", err.message); setLoading(false); });

    const unsub2 = onSnapshot(qOrgId, (snap) => {
      orgIdRecs = snap.docs.map(d => toRecord(d.id, d.data()));
      rebuild();
    }, (err) => { console.warn("[billingRecords/organizationId]", err.message); setLoading(false); });

    return () => { unsub1(); unsub2(); };
  }, [userProfile?.organizationId, individualId]);

  return { records, loading };
}

export function useBillingRecordsSummary() {
  const { records, loading } = useBillingRecords();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const pending_scrub = records.filter(r => r.billing_status === "pending_scrub").length;
  const scrub_passed = records.filter(r => r.billing_status === "scrub_passed" && !r.submitted_to_iddbilling).length;
  const needs_attention = records.filter(r => r.billing_status === "needs_attention").length;
  const submitted_this_month = records.filter(r => {
    if (!r.submitted_to_iddbilling) return false;
    const submittedAt = (r.submitted_at as any)?.toDate?.() || (r.submitted_at ? new Date(r.submitted_at as string) : null);
    return submittedAt && submittedAt >= startOfMonth;
  }).length;

  const total_ready_amount = records
    .filter(r => r.billing_status === "scrub_passed" && !r.submitted_to_iddbilling)
    .reduce((sum, r) => sum + (r.total_amount || 0), 0);

  return { pending_scrub, scrub_passed, needs_attention, submitted_this_month, total_ready_amount, loading };
}

// ── CRUD ──────────────────────────────────────────────────────────────────

export async function createBillingRecord(
  record: Omit<BillingRecord, "id" | "created_at" | "updated_at">
): Promise<string> {
  const ref = await addDoc(collection(db, "billing_records"), {
    ...record,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateBillingRecord(
  id: string,
  patch: Partial<Omit<BillingRecord, "id">>
): Promise<void> {
  await updateDoc(doc(db, "billing_records", id), {
    ...patch,
    updated_at: serverTimestamp(),
  });
}

export async function markRecordsSubmitted(
  recordIds: string[],
  batchId: string,
  iddClaimMap: Record<string, { id: string; status: string }>
): Promise<void> {
  await Promise.all(
    recordIds.map(id =>
      updateDoc(doc(db, "billing_records", id), {
        billing_status: "submitted",
        submitted_to_iddbilling: true,
        submitted_at: serverTimestamp(),
        submission_batch_id: batchId,
        iddbilling_claim_id: iddClaimMap[id]?.id ?? null,
        iddbilling_status: iddClaimMap[id]?.status ?? null,
        updated_at: serverTimestamp(),
      })
    )
  );
}

// ── Authorization Unit Update ──────────────────────────────────────────────

export async function updateAuthorizationUnits(
  authorizationId: string,
  units: number,
  operation: "add" | "subtract"
): Promise<void> {
  if (!authorizationId) return;
  try {
    const snap = await getDocs(
      query(collection(db, "authorizations"), where("__name__", "==", authorizationId))
    );
    if (snap.empty) return;

    const authRef = doc(db, "authorizations", authorizationId);
    const data = snap.docs[0].data();
    const authorizedUnits = data.authorized_units || data.authorizedUnits || 0;
    const currentUsed = data.used_units || data.usedUnits || 0;
    const newUsed = operation === "add" ? currentUsed + units : Math.max(0, currentUsed - units);
    const newRemaining = authorizedUnits - newUsed;

    let status = data.status;
    if (newRemaining <= 0) status = "exhausted";
    else if (status === "exhausted") status = "active";

    await updateDoc(authRef, {
      used_units: newUsed,
      remaining_units: newRemaining,
      status,
      updated_at: serverTimestamp(),
    });
  } catch (err) {
    console.error("[billingRecords] updateAuthorizationUnits:", err);
  }
}
