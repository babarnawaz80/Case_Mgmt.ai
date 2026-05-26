import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export interface Individual {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  /** camelCase aliases (legacy components). Not persisted. */
  firstName?: string;
  lastName?: string;
  nickname?: string;
  age?: number | null;
  admittedOn?: string;
  status?: "Active" | "Pending" | "Discharged" | string;
  updatedOn?: string;
  allergies?: string;
  specialInstructions?: string;
  riskScore?: number;
  email?: string;
  isp_due_date?: string;
  dob?: string;
  gender?: string;
  medicaid_id?: string;
  diagnosis?: string;
  risk_score?: number;
  risk_level?: "low" | "medium" | "high" | string;
  county?: string;
  address?: string;
  phone?: string;
  enrollment_status: "active" | "transition" | "discharged" | "pending";
  status?: string;
  program?: string;
  level_of_care?: string;
  organizationId: string;
  assigned_case_manager?: string;         // UID or name (legacy)
  assigned_case_manager_uid?: string;     // Firebase UID
  assigned_case_manager_name?: string;    // Display name
  assigned_supervisor?: string;           // UID or name (legacy)
  assigned_supervisor_uid?: string;       // Firebase UID
  assigned_supervisor_name?: string;      // Display name
  pcp_due_date?: string;
  last_visit_date?: string;
  next_visit_date?: string;
  monitoring_compliance_pct?: number;
  open_tasks?: number;
  open_incidents?: number;
  alerts?: string[];
  companion_link_active?: boolean;
  companion_token?: string | null;
  companion_prompt?: {
    content: string;
    lastUpdatedBy: string;
    lastUpdatedAt: unknown;
    version: number;
  } | null;
  employment?: any;
  photo_url?: string | null;   // uploaded avatar image
  createdAt?: unknown;
  updatedAt?: unknown;
}

function toIndividual(id: string, data: DocumentData): Individual {
  return {
    id,
    first_name: data.first_name ?? "",
    last_name: data.last_name ?? "",
    preferred_name: data.preferred_name,
    firstName: data.firstName ?? data.first_name ?? "",
    lastName: data.lastName ?? data.last_name ?? "",
    nickname: data.nickname ?? data.preferred_name,
    dob: data.dob,
    age: data.age ?? calcAge(data.dob),
    gender: data.gender,
    status: data.status ?? (data.enrollment_status === "discharged" ? "Discharged" : data.enrollment_status === "pending" ? "Pending" : "Active"),
    admittedOn: data.admittedOn ?? data.admitted_on ?? data.created_at,
    updatedOn: data.updatedOn ?? data.updated_on,
    allergies: data.allergies,
    specialInstructions: data.specialInstructions ?? data.special_instructions,
    email: data.email,
    medicaid_id: data.medicaid_id,
    diagnosis: data.diagnosis,
    risk_score: data.risk_score,
    riskScore: data.riskScore ?? data.risk_score,
    county: data.county,
    address: data.address,
    phone: data.phone,
    enrollment_status: data.enrollment_status ?? "active",
    status: data.status ?? statusLabel(data.enrollment_status ?? "active"),
    program: data.program,
    level_of_care: data.level_of_care,
    organizationId: data.organizationId ?? "",
    assigned_case_manager: data.assigned_case_manager,
    assigned_case_manager_uid: data.assigned_case_manager_uid ?? data.assigned_case_manager,
    assigned_case_manager_name: data.assigned_case_manager_name ?? data.assigned_case_manager_display_name,
    assigned_supervisor: data.assigned_supervisor,
    assigned_supervisor_uid: data.assigned_supervisor_uid ?? data.assigned_supervisor,
    assigned_supervisor_name: data.assigned_supervisor_name ?? data.assigned_supervisor_display_name,
    pcp_due_date: data.pcp_due_date,
    isp_due_date: data.isp_due_date ?? data.pcp_due_date,
    last_visit_date: data.last_visit_date,
    next_visit_date: data.next_visit_date,
    monitoring_compliance_pct: data.monitoring_compliance_pct,
    open_tasks: data.open_tasks ?? 0,
    open_incidents: data.open_incidents ?? 0,
    alerts: data.alerts ?? [],
    companion_link_active: data.companion_link_active ?? false,
    companion_token: data.companion_token ?? null,
    companion_prompt: data.companion_prompt ?? null,
    employment: data.employment ?? null,
    photo_url: data.photo_url ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/** Computed age from DOB string "YYYY-MM-DD" */
export function calcAge(dob?: string): number | null {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** Risk tier from score */
export function riskTier(score?: number): "high" | "review" | "standard" {
  if (!score && score !== 0) return "standard";
  if (score >= 60) return "high";
  if (score >= 35) return "review";
  return "standard";
}

/** CSS classes for risk score display */
export function riskScoreClass(score?: number): string {
  const tier = riskTier(score);
  if (tier === "high") return "text-icm-red";
  if (tier === "review") return "text-icm-amber";
  return "text-icm-green";
}

/** Avatar background/text class based on risk */
export function riskAvatarClass(score?: number): string {
  const tier = riskTier(score);
  if (tier === "high") return "bg-icm-red/10 text-icm-red";
  if (tier === "review") return "bg-icm-amber/10 text-icm-amber";
  return "bg-icm-green/10 text-icm-green";
}

/** Initials from individual */
export function initials(ind: Individual): string {
  return `${ind.first_name[0] ?? ""}${ind.last_name[0] ?? ""}`.toUpperCase();
}

/** Status label mapping */
export function statusLabel(status: Individual["enrollment_status"]): string {
  switch (status) {
    case "active": return "Active";
    case "transition": return "Transition";
    case "discharged": return "Discharged";
    case "pending": return "Pending";
    default: return "Unknown";
  }
}

/** Update a single individual document in Firestore */
export async function updateIndividual(id: string, data: Partial<Individual>): Promise<void> {
  await updateDoc(doc(db, "individuals", id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

// ─── Hook: all individuals for the logged-in user's org ────────────────────
export function useIndividuals() {
  const { userProfile } = useAuth();
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.organizationId) return;

    setLoading(true);
    const orgId = userProfile.organizationId;
    const role = userProfile.role;

    // Case managers only see their assigned individuals; admins/supervisors see all
    const q =
      role === "case_manager"
        ? query(
            collection(db, "individuals"),
            where("organizationId", "==", orgId),
            where("assigned_case_manager", "==", userProfile.uid),
          )
        : query(
            collection(db, "individuals"),
            where("organizationId", "==", orgId),
          );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => toIndividual(d.id, d.data()));
        // Sort by last name client-side (avoids needing a composite index initially)
        list.sort((a, b) => a.last_name.localeCompare(b.last_name));
        setIndividuals(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("useIndividuals error:", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return unsub;
  }, [userProfile?.organizationId, userProfile?.role, userProfile?.uid]);

  return { individuals, loading, error };
}

// ─── Hook: single individual by Firestore doc ID ───────────────────────────
export function useIndividual(id: string | undefined) {
  const [individual, setIndividual] = useState<Individual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "individuals", id),
      (snap) => {
        if (snap.exists()) {
          setIndividual(toIndividual(snap.id, snap.data()));
        } else {
          setIndividual(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsub;
  }, [id]);

  return { individual, loading, error };
}
