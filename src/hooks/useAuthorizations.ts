/**
 * useAuthorizations — hook for fetching authorizations for an individual.
 * Used by note forms for the authorization dropdown and the Funding Streams section.
 */
import { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot, type DocumentData,
  addDoc, updateDoc, doc, serverTimestamp, runTransaction, getDocs, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export interface ApprovedServiceCode {
  serviceCode: string;
  description: string;
  rate: number;
  unit: string;
  billingRuleId: string;
}

export interface Authorization {
  id: string;
  org_id: string;
  individual_id: string;
  authorization_number: string;
  funding_stream_id: string;
  /** programId link to /programs/{id} */
  programId?: string;
  programName?: string;
  payer_name: string;
  payer_id: string;
  payerId?: string;
  /** Full approved service codes with rates (new model) */
  approvedServiceCodes?: ApprovedServiceCode[];
  service_codes: string[];
  authorized_units: number;
  used_units: number;
  remaining_units: number;
  rate_per_unit: number;
  billing_unit_type: string;
  effective_date: string;
  expiration_date: string;
  status: "active" | "expired" | "exhausted" | "pending" | "cancelled";
  notes?: string;
  cancelled_at?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  // Display label
  displayLabel?: string;
}

function toAuth(id: string, d: DocumentData): Authorization {
  const authorizedUnits = d.authorized_units ?? d.authorizedUnits ?? 0;
  const usedUnits = d.used_units ?? d.usedUnits ?? 0;
  const remainingUnits = d.remaining_units ?? d.remainingUnits ?? (authorizedUnits - usedUnits);
  const authNumber = d.authorization_number ?? d.authorizationNumber ?? id.slice(0, 12);

  return {
    id,
    org_id: d.org_id ?? d.organizationId ?? "",
    individual_id: d.individual_id ?? d.individualId ?? "",
    authorization_number: authNumber,
    funding_stream_id: d.funding_stream_id ?? d.fundingStreamId ?? "",
    payer_name: d.payer_name ?? d.payerName ?? d.payer ?? "",
    payer_id: d.payer_id ?? d.payerId ?? "",
    service_codes: d.service_codes ?? d.serviceCodes ?? [],
    authorized_units: authorizedUnits,
    used_units: usedUnits,
    remaining_units: remainingUnits,
    rate_per_unit: d.rate_per_unit ?? d.ratePerUnit ?? 28.5,
    billing_unit_type: d.billing_unit_type ?? d.billingUnitType ?? "15_min",
    effective_date: d.effective_date ?? d.effectiveDate ?? "",
    expiration_date: d.expiration_date ?? d.expirationDate ?? "",
    status: d.status ?? "active",
    notes: d.notes ?? "",
    created_at: d.created_at,
    updated_at: d.updated_at,
    displayLabel: `${authNumber} · ${remainingUnits} of ${authorizedUnits} units remaining`,
  };
}

export function useAuthorizations(individualId?: string) {
  const { userProfile } = useAuth();
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!individualId || !userProfile?.organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const q = query(
      collection(db, "authorizations"),
      where("individual_id", "==", individualId),
    );

    // Also try alternate field name
    const unsub = onSnapshot(q, (snap) => {
      let auths = snap.docs.map(d => toAuth(d.id, d.data()));
      if (auths.length === 0) {
        // Try with camelCase field
        const q2 = query(
          collection(db, "authorizations"),
          where("individualId", "==", individualId),
        );
        onSnapshot(q2, (snap2) => {
          auths = snap2.docs.map(d => toAuth(d.id, d.data()));
          setAuthorizations(auths);
          setLoading(false);
        });
      } else {
        setAuthorizations(auths);
        setLoading(false);
      }
    }, () => setLoading(false));

    return unsub;
  }, [individualId, userProfile?.organizationId]);

  // Filter to active authorizations only
  const active = authorizations.filter(a => a.status === "active");

  // Filter by service code
  const forServiceCode = (code: string) =>
    active.filter(a => a.service_codes.includes(code) || a.service_codes.length === 0);

  return { authorizations, active, forServiceCode, loading };
}

// ── Service codes from org funding streams ─────────────────────────────────

export const SERVICE_CODES_STATIC = [
  { code: "T2022", description: "Case Management — 15 min", unitType: "15_min", rate: 28.50 },
  { code: "T2023", description: "Targeted Case Management — 15 min", unitType: "15_min", rate: 30.00 },
  { code: "T1016", description: "Case Management Monthly, per 15 min", unitType: "15_min", rate: 25.00 },
  { code: "H0043", description: "Supported Employment — Individual", unitType: "hourly", rate: 45.00 },
  { code: "H2019", description: "Therapeutic Behavioral Services", unitType: "15_min", rate: 22.00 },
  { code: "T2041", description: "Supported Living — Monthly", unitType: "monthly", rate: 1200.00 },
  { code: "S9990", description: "Home Health Aide — Hourly", unitType: "hourly", rate: 18.00 },
  { code: "H0046", description: "Supported Employment — Group", unitType: "hourly", rate: 35.00 },
] as const;

export type ServiceCodeEntry = typeof SERVICE_CODES_STATIC[number];

export function getRateForCode(code: string): { rate: number; unitType: string } {
  const match = SERVICE_CODES_STATIC.find(s => s.code === code);
  return { rate: match?.rate ?? 28.5, unitType: match?.unitType ?? "15_min" };
}

// ── Write helpers ──────────────────────────────────────────────────────────────

export interface CreateAuthorizationInput {
  individualId: string;
  orgId: string;
  programId: string;
  programName: string;
  payerId: string;
  payerName: string;
  authorizationNumber: string;
  effectiveDate: string;
  expirationDate: string;
  authorizedUnits: number;
  approvedServiceCodes: ApprovedServiceCode[];
  notes?: string;
  createdBy?: string;
}

export async function createAuthorization(input: CreateAuthorizationInput): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const isExpired = input.expirationDate && input.expirationDate < today;
  const isPending = input.effectiveDate && input.effectiveDate > today;
  const status = isExpired ? "expired" : isPending ? "pending" : "active";

  const ref = await addDoc(collection(db, "authorizations"), {
    individual_id: input.individualId,
    individualId: input.individualId,     // dual-write for compatibility
    org_id: input.orgId,
    organizationId: input.orgId,
    programId: input.programId,
    programName: input.programName,
    payer_id: input.payerId,
    payer_name: input.payerName,
    authorization_number: input.authorizationNumber,
    effective_date: input.effectiveDate,
    expiration_date: input.expirationDate,
    authorized_units: input.authorizedUnits,
    used_units: 0,
    remaining_units: input.authorizedUnits,
    approvedServiceCodes: input.approvedServiceCodes,
    service_codes: input.approvedServiceCodes.map(c => c.serviceCode),
    rate_per_unit: input.approvedServiceCodes[0]?.rate ?? 0,
    billing_unit_type: "15_min",
    status,
    notes: input.notes ?? "",
    createdBy: input.createdBy ?? "",
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAuthorization(authId: string, data: Partial<Authorization>) {
  await updateDoc(doc(db, "authorizations", authId), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

export async function cancelAuthorization(authId: string) {
  await updateDoc(doc(db, "authorizations", authId), {
    status: "cancelled",
    cancelled_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

/** Increment usedUnits on an authorization inside a Firestore transaction. */
export async function incrementAuthorizationUnits(authId: string, unitsDelta: number): Promise<void> {
  const authRef = doc(db, "authorizations", authId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(authRef);
    if (!snap.exists()) return;
    const d = snap.data();
    const used = (d.used_units ?? d.usedUnits ?? 0) + unitsDelta;
    const authorized = d.authorized_units ?? d.authorizedUnits ?? 0;
    transaction.update(authRef, {
      used_units: used,
      remaining_units: Math.max(0, authorized - used),
      updated_at: serverTimestamp(),
    });
  });
}

/** Get the next suggested auth number for an individual (e.g. "SA-2026-004"). */
export async function getNextAuthNumber(individualId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SA-${year}-`;
  try {
    const q = query(
      collection(db, "authorizations"),
      where("individual_id", "==", individualId),
      orderBy("created_at", "desc"),
    );
    const snap = await getDocs(q);
    const nums = snap.docs
      .map(d => {
        const n = (d.data().authorization_number ?? "") as string;
        if (!n.startsWith(prefix)) return 0;
        return parseInt(n.replace(prefix, ""), 10);
      })
      .filter(n => !isNaN(n) && n > 0);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `${prefix}${String(next).padStart(3, "0")}`;
  } catch {
    return `${prefix}001`;
  }
}
