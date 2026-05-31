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
  ltss_id?: string;
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

  // Demographics (extended)
  date_of_birth?: string;          // alias for dob
  race_ethnicity?: string;
  primary_language?: string;
  secondary_language?: string;
  marital_status?: string;
  religion?: string;
  living_situation?: string;
  communication_notes?: string;

  // Address (split fields)
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;

  // Phone
  phone_home?: string;
  phone_cell?: string;

  // Dates / Intake
  admission_date?: string;
  discharge_date?: string;
  referral_date?: string;
  referral_source?: string;

  // Program / Service
  // `state` is the PROGRAM enrollment state (set by Change Program / intake).
  // This — NOT the residence address (address_state) — is the authoritative
  // state for the AI Orchestrator, compliance, and reporting.
  state?: string;
  programId?: string;
  programName?: string;
  programCode?: string;
  payer?: string;
  program_type?: string;
  waiver_type?: string;
  service_category?: string;
  funding_stream?: string;
  case_number?: string;

  // Clinical
  primary_diagnosis?: string;
  secondary_diagnoses?: string;
  icd10_codes?: string;
  primary_physician_name?: string;
  primary_physician_phone?: string;
  hospital_preference?: string;
  medical_notes?: string;
  pcp_status?: string;
  next_isp_date?: string;
  last_annual_plan_date?: string;

  // Insurance / Medicaid (extended)
  ma_status?: string;
  ma_id?: string;
  ma_type?: string;
  ma_effective_date?: string;
  ma_redetermination_date?: string;
  secondary_insurance_name?: string;
  secondary_insurance_id?: string;

  // Legal / Guardian
  legal_status?: string;
  guardian_name?: string;
  guardian_relationship?: string;
  guardian_phone?: string;
  guardian_email?: string;
  poa_name?: string;
  poa_phone?: string;

  // Emergency Contact
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;
  emergency_contact_phone2?: string;
  emergency_contact_email?: string;

  // Special instructions (snake_case)
  special_instructions?: string;

  // Demographics (extended — additional fields)
  pronouns?: string;
  communication_needs?: string;

  // Identification (extended)
  medicare_id?: string;
  state_id?: string;
  admitted_on?: string;

  // Phone (extended)
  phone_secondary?: string;
  preferred_contact?: string;

  // HRST / Monitoring
  hrst_score?: string;
  hrst_scored_on?: string;
  hrst_next_due?: string;
  hrst_assessed_by?: string;
  hrst_source?: string;

  // Level of Care
  loc_current?: string;
  loc_effective_date?: string;
  loc_expiration_date?: string;
  loc_issued_by?: string;

  // Behavioral / Health baselines
  behavioral_monitoring_notes?: string;
  health_monitoring_notes?: string;

  // Court / Legal (extended)
  court_involvement?: boolean;
  guardianship_type?: string;
  guardian_address?: string;
  guardianship_effective_date?: string;
  on_probation?: boolean;
  probation_officer_name?: string;
  probation_officer_phone?: string;
  probation_end_date?: string;
  probation_conditions?: string;

  // Admin / Assignment (extended)
  secondary_case_manager?: string;
  supervisor?: string;
  program_coordinator?: string;
  caseload_weight?: string;
  complexity?: string;

  // Intake / Discharge (extended)
  admission_type?: string;
  previous_agency?: string;
  discharge_reason?: string;

  // Compliance / Quality
  last_chart_review?: string;
  next_chart_review_due?: string;
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

    // Demographics (extended)
    date_of_birth: data.date_of_birth ?? data.dob,
    race_ethnicity: data.race_ethnicity,
    primary_language: data.primary_language,
    secondary_language: data.secondary_language,
    marital_status: data.marital_status,
    religion: data.religion,
    living_situation: data.living_situation,
    communication_notes: data.communication_notes,

    // Program enrollment state (authoritative for orchestrator/reporting)
    state: data.state,
    programId: data.programId,
    programName: data.programName ?? data.program,
    programCode: data.programCode,
    payer: data.payer,

    // Address (split fields) — RESIDENCE only, never used for compliance
    address_street: data.address_street,
    address_city: data.address_city,
    address_state: data.address_state,
    address_zip: data.address_zip,

    // Phone
    phone_home: data.phone_home,
    phone_cell: data.phone_cell,

    // Dates / Intake
    admission_date: data.admission_date ?? data.admittedOn ?? data.admitted_on,
    discharge_date: data.discharge_date,
    referral_date: data.referral_date,
    referral_source: data.referral_source,

    // Program / Service
    program_type: data.program_type,
    waiver_type: data.waiver_type,
    service_category: data.service_category,
    funding_stream: data.funding_stream,
    case_number: data.case_number,

    // Clinical
    primary_diagnosis: data.primary_diagnosis,
    secondary_diagnoses: data.secondary_diagnoses,
    icd10_codes: data.icd10_codes,
    primary_physician_name: data.primary_physician_name,
    primary_physician_phone: data.primary_physician_phone,
    hospital_preference: data.hospital_preference,
    medical_notes: data.medical_notes,
    pcp_status: data.pcp_status,
    next_isp_date: data.next_isp_date,
    last_annual_plan_date: data.last_annual_plan_date,

    // Insurance / Medicaid (extended)
    ma_status: data.ma_status,
    ma_id: data.ma_id,
    ma_type: data.ma_type,
    ma_effective_date: data.ma_effective_date,
    ma_redetermination_date: data.ma_redetermination_date,
    secondary_insurance_name: data.secondary_insurance_name,
    secondary_insurance_id: data.secondary_insurance_id,

    // Legal / Guardian
    legal_status: data.legal_status,
    guardian_name: data.guardian_name,
    guardian_relationship: data.guardian_relationship,
    guardian_phone: data.guardian_phone,
    guardian_email: data.guardian_email,
    poa_name: data.poa_name,
    poa_phone: data.poa_phone,

    // Emergency Contact
    emergency_contact_name: data.emergency_contact_name,
    emergency_contact_relation: data.emergency_contact_relation,
    emergency_contact_phone: data.emergency_contact_phone,
    emergency_contact_phone2: data.emergency_contact_phone2,
    emergency_contact_email: data.emergency_contact_email,

    // Special instructions (snake_case)
    special_instructions: data.special_instructions ?? data.specialInstructions,

    // Demographics (extended — additional fields)
    pronouns: data.pronouns,
    communication_needs: data.communication_needs,

    // Identification (extended)
    medicare_id: data.medicare_id,
    state_id: data.state_id,
    admitted_on: data.admitted_on ?? data.admittedOn,

    // Phone (extended)
    phone_secondary: data.phone_secondary,
    preferred_contact: data.preferred_contact,

    // HRST / Monitoring
    hrst_score: data.hrst_score,
    hrst_scored_on: data.hrst_scored_on,
    hrst_next_due: data.hrst_next_due,
    hrst_assessed_by: data.hrst_assessed_by,
    hrst_source: data.hrst_source,

    // Level of Care
    loc_current: data.loc_current,
    loc_effective_date: data.loc_effective_date,
    loc_expiration_date: data.loc_expiration_date,
    loc_issued_by: data.loc_issued_by,

    // Behavioral / Health baselines
    behavioral_monitoring_notes: data.behavioral_monitoring_notes,
    health_monitoring_notes: data.health_monitoring_notes,

    // Court / Legal (extended)
    court_involvement: data.court_involvement,
    guardianship_type: data.guardianship_type,
    guardian_address: data.guardian_address,
    guardianship_effective_date: data.guardianship_effective_date,
    on_probation: data.on_probation,
    probation_officer_name: data.probation_officer_name,
    probation_officer_phone: data.probation_officer_phone,
    probation_end_date: data.probation_end_date,
    probation_conditions: data.probation_conditions,

    // Admin / Assignment (extended)
    secondary_case_manager: data.secondary_case_manager,
    supervisor: data.supervisor,
    program_coordinator: data.program_coordinator,
    caseload_weight: data.caseload_weight?.toString(),
    complexity: data.complexity,

    // Intake / Discharge (extended)
    admission_type: data.admission_type,
    previous_agency: data.previous_agency,
    discharge_reason: data.discharge_reason,

    // Compliance / Quality
    last_chart_review: data.last_chart_review,
    next_chart_review_due: data.next_chart_review_due,
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
