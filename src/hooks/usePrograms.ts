/**
 * usePrograms — Firestore hooks for the unified programs data model.
 */
import { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot, doc,
  addDoc, updateDoc, deleteDoc, serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ProviderEnrollment {
  npiType2: string; taxIdEin: string; medicaidProviderId: string;
  effectiveDate: string; expirationDate?: string;
  enrollmentStatus: "active" | "pending" | "expired";
}
export interface BillingContact {
  name: string; phone: string; email: string;
  payToAddress?: string; sameAsOrgAddress: boolean;
}
export interface ClearinghouseInfo {
  name: string; submitterId: string;
  claimFormat: "837P" | "837I" | "UB04" | "CMS1500";
  electronicRemittance: boolean;
}
export interface SignatureRequirements {
  caseManager: boolean; supervisor: boolean;
  participant: boolean; guardian: boolean;
}
export interface SupervisorApproval {
  required: boolean; progressNotes: boolean; contactNotes: boolean;
  visitSummaries: boolean; monitoringForms: boolean;
  overdueThresholdHours: number;
}
export interface ProgramBillingDefaults {
  defaultBillingUnit: "15min" | "30min" | "1hr" | "per_visit" | "per_day";
  roundingRule: "round_nearest" | "round_up" | "round_down";
  autoCalcUnitsFromTime: boolean;
}
export interface Program {
  id: string; tenantId: string;
  name: string; abbreviation: string; state: string; stateName: string;
  fundingType: "medicaid" | "state_general" | "federal" | "private" | "other";
  description?: string; status: "active" | "inactive";
  // legacy compat
  code?: string; payer?: string; active?: boolean; organizationId?: string;
  // new fields
  providerEnrollment?: ProviderEnrollment; billingContact?: BillingContact;
  clearinghouse?: ClearinghouseInfo; signatureRequirements?: SignatureRequirements;
  supervisorApproval?: SupervisorApproval; billingRules?: ProgramBillingDefaults;
  createdAt?: unknown; updatedAt?: unknown; createdBy?: string;
}
export interface ProgramPayer {
  id: string; payerName: string; payerId: string;
  type: "state_medicaid" | "mco" | "private" | "other";
  filingDeadlineDays: number; status: "active" | "inactive";
  electronicBilling: boolean; createdAt?: unknown;
}
export interface ProgramBillingRule {
  id: string; serviceCode: string; description: string;
  payerId: string; payerName: string; rate: number; unit: string;
  effectiveDate: string; endDate?: string; status: "active" | "inactive";
  createdAt?: unknown;
}

export function computeEnrollmentStatus(enrollment?: ProviderEnrollment): {
  status: "active" | "pending" | "expired" | "expiring_soon" | "not_configured";
  label: string; daysUntilExpiry?: number;
} {
  if (!enrollment?.effectiveDate) return { status: "not_configured", label: "Not configured" };
  const now = new Date();
  const effective = new Date(enrollment.effectiveDate);
  if (effective > now) return { status: "pending", label: "Pending" };
  if (enrollment.expirationDate) {
    const expiry = new Date(enrollment.expirationDate);
    if (expiry < now) return { status: "expired", label: "Expired" };
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 90) return { status: "expiring_soon", label: `Expiring in ${daysLeft}d`, daysUntilExpiry: daysLeft };
  }
  return { status: "active", label: "Active" };
}

function toProgram(id: string, data: DocumentData): Program {
  return {
    id, tenantId: data.tenantId ?? data.organizationId ?? "",
    name: data.name ?? "", abbreviation: data.abbreviation ?? data.code ?? "",
    state: data.state ?? "", stateName: data.stateName ?? data.state ?? "",
    fundingType: data.fundingType ?? "medicaid", description: data.description,
    status: data.status ?? (data.active === false ? "inactive" : "active"),
    code: data.code, payer: data.payer, active: data.active, organizationId: data.organizationId,
    providerEnrollment: data.providerEnrollment, billingContact: data.billingContact,
    clearinghouse: data.clearinghouse, signatureRequirements: data.signatureRequirements,
    supervisorApproval: data.supervisorApproval, billingRules: data.billingRules,
    createdAt: data.createdAt, updatedAt: data.updatedAt, createdBy: data.createdBy,
  };
}

export function usePrograms(orgId?: string) {
  const [data, setData] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const q = query(collection(db, "programs"), where("organizationId", "==", orgId));
    const unsub = onSnapshot(q, snap => { setData(snap.docs.map(d => toProgram(d.id, d.data()))); setLoading(false); },
      err => { console.error("[programs]", err); setLoading(false); });
    return unsub;
  }, [orgId]);
  return { data, loading };
}

export function useProgramPayers(programId?: string) {
  const [data, setData] = useState<ProgramPayer[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!programId) { setLoading(false); return; }
    const unsub = onSnapshot(collection(db, "programs", programId, "payers"),
      snap => { setData(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProgramPayer))); setLoading(false); },
      err => { console.error("[payers]", err); setLoading(false); });
    return unsub;
  }, [programId]);
  return { data, loading };
}

export function useProgramBillingRules(programId?: string) {
  const [data, setData] = useState<ProgramBillingRule[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!programId) { setLoading(false); return; }
    const unsub = onSnapshot(collection(db, "programs", programId, "billingRules"),
      snap => { setData(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProgramBillingRule))); setLoading(false); },
      err => { console.error("[billingRules]", err); setLoading(false); });
    return unsub;
  }, [programId]);
  return { data, loading };
}

export async function saveProgram(orgId: string, data: Partial<Program>, existingId?: string, userId?: string) {
  const payload = { ...data, organizationId: orgId, tenantId: orgId, updatedAt: serverTimestamp() };
  if (existingId) { await updateDoc(doc(db, "programs", existingId), payload); return existingId; }
  const ref = await addDoc(collection(db, "programs"), { ...payload, createdAt: serverTimestamp(), createdBy: userId ?? "" });
  return ref.id;
}
export const addProgramPayer = (pid: string, p: Omit<ProgramPayer,"id"|"createdAt">) =>
  addDoc(collection(db,"programs",pid,"payers"), { ...p, createdAt: serverTimestamp() });
export const updateProgramPayer = (pid: string, id: string, d: Partial<ProgramPayer>) =>
  updateDoc(doc(db,"programs",pid,"payers",id), d);
export const deleteProgramPayer = (pid: string, id: string) =>
  deleteDoc(doc(db,"programs",pid,"payers",id));
export const addProgramBillingRule = (pid: string, r: Omit<ProgramBillingRule,"id"|"createdAt">) =>
  addDoc(collection(db,"programs",pid,"billingRules"), { ...r, createdAt: serverTimestamp() });
export const updateProgramBillingRule = (pid: string, id: string, d: Partial<ProgramBillingRule>) =>
  updateDoc(doc(db,"programs",pid,"billingRules",id), d);
export const deleteProgramBillingRule = (pid: string, id: string) =>
  deleteDoc(doc(db,"programs",pid,"billingRules",id));
