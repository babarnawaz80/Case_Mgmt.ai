/**
 * useBillingClaims — real-time Firestore hook for billing claims.
 *
 * Collection: billing_claims
 * Fields: {
 *   id, individualId, individualName, dos (date of service), serviceCode,
 *   units, payer, authNumber, aiStatus ('passed'|'attention'|'pending'),
 *   billingStatus ('ready'|'hold'|'pending'|'submitted'|'denied'|'paid'),
 *   totalAmount?, denialReason?, notes?, organizationId, createdBy, createdAt, updatedAt
 * }
 */
import { useState, useEffect, useCallback } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export type AiStatus = "passed" | "attention" | "pending";
export type BillingStatus = "ready" | "hold" | "pending" | "submitted" | "denied" | "paid";

export interface BillingClaim {
  id: string;
  individualId: string;
  individualName: string;
  dos: string; // YYYY-MM-DD date of service
  serviceCode: string;
  units: number;
  payer: string;
  authNumber?: string;
  aiStatus: AiStatus;
  billingStatus: BillingStatus;
  totalAmount?: number;
  denialReason?: string;
  notes?: string;
  organizationId: string;
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function toClaim(id: string, d: DocumentData): BillingClaim {
  return {
    id,
    individualId: d.individualId ?? "",
    individualName: d.individualName ?? d.individual ?? "",
    dos: d.dos ?? d.dateOfService ?? "",
    serviceCode: d.serviceCode ?? d.code ?? "",
    units: d.units ?? 1,
    payer: d.payer ?? "",
    authNumber: d.authNumber ?? d.auth,
    aiStatus: d.aiStatus ?? d.ai ?? "pending",
    billingStatus: d.billingStatus ?? d.billing ?? "pending",
    totalAmount: d.totalAmount,
    denialReason: d.denialReason,
    notes: d.notes,
    organizationId: d.organizationId ?? "",
    createdBy: d.createdBy,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export function useBillingClaims() {
  const { userProfile } = useAuth();
  const [claims, setClaims] = useState<BillingClaim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.organizationId) { setLoading(false); return; }
    setLoading(true);

    const q = query(
      collection(db, "billing_claims"),
      where("organizationId", "==", userProfile.organizationId),
      orderBy("dos", "desc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      setClaims(snap.docs.map((d) => toClaim(d.id, d.data())));
      setLoading(false);
    }, (err) => {
      console.warn("[billingClaims]", err.message);
      // Fallback without orderBy
      const fallback = query(
        collection(db, "billing_claims"),
        where("organizationId", "==", userProfile.organizationId),
      );
      onSnapshot(fallback, (snap) => {
        const sorted = snap.docs.map((d) => toClaim(d.id, d.data()))
          .sort((a, b) => b.dos.localeCompare(a.dos));
        setClaims(sorted);
        setLoading(false);
      });
    });

    return unsub;
  }, [userProfile?.organizationId]);

  return { claims, loading };
}

export function useBillingSummary() {
  const { claims, loading } = useBillingClaims();

  const ready = claims.filter((c) => c.billingStatus === "ready").length;
  const attention = claims.filter((c) => c.aiStatus === "attention").length;
  const submitted = claims.filter((c) => c.billingStatus === "submitted").length;
  const pending = claims.filter((c) => c.billingStatus === "pending" || c.billingStatus === "hold").length;
  const denied = claims.filter((c) => c.billingStatus === "denied").length;

  return { ready, attention, submitted, pending, denied, total: claims.length, loading };
}

export async function updateClaimStatus(
  id: string,
  billingStatus: BillingStatus,
  aiStatus?: AiStatus,
): Promise<void> {
  const update: Record<string, unknown> = {
    billingStatus,
    updatedAt: serverTimestamp(),
  };
  if (aiStatus) update.aiStatus = aiStatus;
  await updateDoc(doc(db, "billing_claims", id), update);
}

export async function createBillingClaim(
  claim: Omit<BillingClaim, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, "billing_claims"), {
    ...claim,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export const SERVICE_CODES = [
  { code: "T2022", description: "Targeted Case Management — 15 min" },
  { code: "T2023", description: "Case Management — Monthly" },
  { code: "H0043", description: "Supported Employment — Individual" },
  { code: "H0046", description: "Supported Employment — Group" },
  { code: "S9990", description: "Home Health Aide — Hourly" },
  { code: "T1016", description: "Case Management Monthly, per each 15 min" },
  { code: "H2019", description: "Therapeutic Behavioral Services" },
  { code: "T2041", description: "Supported Living — Monthly" },
] as const;

export const PAYERS = [
  "IHCP",
  "Anthem Indiana",
  "MHS Indiana",
  "MDwise",
  "Humana CareSource",
  "UnitedHealthcare Community Plan",
  "Medicare",
  "Private Pay",
] as const;
