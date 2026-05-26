/**
 * useFirestore.ts
 * Generic real-time Firestore hooks for all individual-scoped sub-collections.
 * Each hook returns { data, loading, error } with real-time onSnapshot updates.
 */
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

// ─── Generic sub-collection hook ────────────────────────────────────────────

function useSubCollection<T>(
  individualId: string | undefined,
  collectionName: string,
  orderField = "created_at",
  orderDir: "asc" | "desc" = "desc",
  extraConstraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!individualId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const constraints: QueryConstraint[] = [
      where("individual_id", "==", individualId),
      orderBy(orderField, orderDir),
      ...extraConstraints,
    ];
    const q = query(collection(db, collectionName), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`[${collectionName}]`, err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [individualId, collectionName, orderField, orderDir]);

  return { data, loading, error };
}

// ─── Generic collection hook (unscoped, for global views) ───────────────────

export function useCollection<T>(
  collectionName: string,
  orderField = "created_at",
  orderDir: "asc" | "desc" = "desc",
  extraConstraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const constraints: QueryConstraint[] = [
      orderBy(orderField, orderDir),
      ...extraConstraints,
    ];
    const q = query(collection(db, collectionName), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`[${collectionName}]`, err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [collectionName, orderField, orderDir]);

  return { data, loading, error };
}

// ─── Contact Notes ────────────────────────────────────────────────────────────

export interface ContactNote {
  id: string;
  individual_id: string;
  individual_name?: string;
  author_uid: string;
  author_name: string;
  date: string;
  activityType?: string;
  contactType?: string;
  billable?: boolean;
  nonBillableReason?: string;
  startTime?: string;
  endTime?: string;
  purpose?: string;
  background?: string;
  present?: string;
  details?: string;
  issues?: string;
  nextSteps?: string;
  status: "draft" | "submitted" | "signed";
  created_at?: unknown;
  updated_at?: unknown;
}

export function useContactNotes(individualId: string | undefined) {
  return useSubCollection<ContactNote>(individualId, "contact_notes", "date", "desc");
}

// ─── Referrals ────────────────────────────────────────────────────────────────

export interface Referral {
  id: string;
  individual_id: string;
  individual_name?: string;
  referral_type: string;
  referred_to: string;
  referred_by: string;
  referred_by_uid?: string;
  date: string;
  priority?: "routine" | "urgent" | "emergency";
  status: "pending" | "in_progress" | "completed" | "declined";
  notes?: string;
  outcome?: string;
  conversation?: any[];
  created_at?: unknown;
  updated_at?: unknown;
  [key: string]: any;
}

export function useReferrals(individualId: string | undefined) {
  return useSubCollection<Referral>(individualId, "referrals", "date", "desc");
}

export async function addReferral(
  data: Omit<Referral, "id" | "created_at" | "updated_at">
) {
  return addDoc(collection(db, "referrals"), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function updateReferral(id: string, data: Partial<Referral>) {
  return updateDoc(doc(db, "referrals", id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

// ─── Care Plans ───────────────────────────────────────────────────────────────

export interface CarePlan {
  id: string;
  individual_id: string;
  title: string;
  plan_type?: string;
  status: "draft" | "active" | "archived" | string;
  effective_date?: string;
  review_date?: string;
  goals?: CarePlanGoal[];
  author_uid?: string;
  author_name?: string;
  created_at?: unknown;
  updated_at?: unknown;
  [key: string]: any;
}

export interface CarePlanGoal {
  id: string;
  goal?: string;
  priority?: "high" | "medium" | "low";
  target_date?: string;
  progress?: "not_started" | "in_progress" | "achieved" | "discontinued" | string;
  interventions?: string[];
  [key: string]: any;
}

export function useCarePlans(individualId: string | undefined) {
  return useSubCollection<CarePlan>(individualId, "care_plans", "created_at", "desc");
}

// ─── Monitoring Forms ─────────────────────────────────────────────────────────

export interface MonitoringFormRecord {
  id: string;
  individual_id: string;
  type: "Monthly" | "Quarterly" | "Annually";
  status: "Draft" | "In Progress" | "Submitted";
  active: "Active" | "Inactive";
  due_date?: string;
  dueDate?: string;
  submitted_date?: string;
  updated_by?: string;
  updatedBy?: string;
  author_name?: string;
  updated_on?: string;
  updatedOn?: string;
  sections?: Record<string, unknown>;
  author_uid?: string;
  created_at?: any;
  updated_at?: unknown;
}

export function useMonitoringForms(individualId: string | undefined) {
  return useSubCollection<MonitoringFormRecord>(
    individualId,
    "monitoring_forms",
    "created_at",
    "desc"
  );
}

// ─── Visit Summaries ──────────────────────────────────────────────────────────

export interface VisitSummaryRecord {
  id: string;
  individual_id: string;
  individual_name?: string;
  visit_date: string;
  visitDate?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  purpose_of_support?: string;
  purposeOfSupport?: string;
  what_went_well?: string;
  what_is_not_working?: string;
  goals_addressed?: string[];
  next_steps?: string;
  status: "draft" | "submitted" | "signed";
  author_uid?: string;
  author_name?: string;
  updated_by?: string;
  updatedBy?: string;
  updated_on?: string;
  updatedOn?: string;
  created_at?: any;
  updated_at?: unknown;
}

export function useVisitSummaries(individualId: string | undefined) {
  return useSubCollection<VisitSummaryRecord>(
    individualId,
    "visit_summaries",
    "visit_date",
    "desc"
  );
}

export async function addVisitSummary(
  data: Omit<VisitSummaryRecord, "id" | "created_at" | "updated_at">
) {
  return addDoc(collection(db, "visit_summaries"), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

// ─── Incident Reports ─────────────────────────────────────────────────────────

export interface IncidentReport {
  id: string;
  individual_id: string;
  individual_name?: string;
  incident_date: string;
  incident_time?: string;
  location?: string;
  incident_types?: string[];
  description?: string;
  classification?: "Critical" | "Significant" | "Minor" | "Unknown";
  current_stage?: number;
  status: "Open" | "In Progress" | "Pending Review" | "Closed" | "Void";
  person_responsible?: string;
  staff_on_duty?: string;
  reported_by_uid?: string;
  reported_by_name?: string;
  last_updated_by?: string;
  last_updated_at?: string;
  created_at?: unknown;
  updated_at?: unknown;
  [key: string]: any;
}

export function useIncidentReports(individualId: string | undefined) {
  return useSubCollection<IncidentReport>(
    individualId,
    "incident_reports",
    "incident_date",
    "desc"
  );
}

// ─── Documents ────────────────────────────────────────────────────────────────

export interface ManagedDocument {
  id: string;
  individual_id: string;
  name: string;
  category?: string;
  file_url?: string;
  file_type?: string;
  file_size_kb?: number;
  uploaded_by?: string;
  uploaded_by_uid?: string;
  expiration_date?: string;
  status?: "current" | "expired" | "pending";
  notes?: string;
  created_at?: unknown;
  updated_at?: unknown;
}

export function useManagedDocuments(individualId: string | undefined) {
  return useSubCollection<ManagedDocument>(
    individualId,
    "managed_documents",
    "created_at",
    "desc"
  );
}

// ─── Workflows & Workflow Tasks ───────────────────────────────────────────────

export interface WorkflowStep {
  id: string;
  number: number;
  title: string;
  description: string;
  status: "Pending" | "In Progress" | "Completed" | "Overdue";
  dueDate?: string;
  staffResponsible?: string;
  linkedModuleSlug?: string;
  linkedModuleLabel?: string;
  aiDraftReady?: boolean;
  aiDraftBody?: string;
  completedAt?: string;
  completionNotes?: string;
}

export interface WorkflowRecord {
  id: string;
  personId: string;
  personName: string;
  individual_id?: string;
  individual_name?: string;
  title: string;
  triggerDate: string;
  dueDate?: string;
  createdOn: string;
  status: "Active" | "Completed" | "Terminated";
  steps: WorkflowStep[];
  notes?: string;
  terminationReason?: string;
  terminationNotes?: string;
  completedDate?: string;
  created_at?: unknown;
  updated_at?: unknown;
}

export function useWorkflows(individualId: string | undefined) {
  return useSubCollection<WorkflowRecord>(individualId, "workflows", "created_at", "desc");
}

export function useWorkflow(workflowId: string | undefined) {
  const [data, setData] = useState<WorkflowRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workflowId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "workflows", workflowId),
      (snap) => {
        if (snap.exists()) {
          setData({ id: snap.id, ...snap.data() } as WorkflowRecord);
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`[workflow]`, err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [workflowId]);

  return { data, loading, error };
}

export function useAllWorkflows() {
  return useCollection<WorkflowRecord>("workflows", "created_at", "desc");
}

export async function addWorkflow(data: Omit<WorkflowRecord, "id" | "created_at" | "updated_at">) {
  return addDoc(collection(db, "workflows"), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function updateWorkflow(id: string, data: Partial<WorkflowRecord>) {
  return updateDoc(doc(db, "workflows", id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

export interface WorkflowTask {
  id: string;
  individual_id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: "high" | "medium" | "low";
  status: "open" | "in_progress" | "completed" | "cancelled";
  due_date?: string;
  assigned_to_uid?: string;
  assigned_to_name?: string;
  completed_at?: unknown;
  completed_by?: string;
  created_at?: unknown;
  updated_at?: unknown;
}

export function useWorkflowTasks(individualId: string | undefined) {
  return useSubCollection<WorkflowTask>(
    individualId,
    "workflow_tasks",
    "due_date",
    "asc"
  );
}

export async function addWorkflowTask(
  data: Omit<WorkflowTask, "id" | "created_at" | "updated_at">
) {
  return addDoc(collection(db, "workflow_tasks"), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function updateWorkflowTask(id: string, data: Partial<WorkflowTask>) {
  return updateDoc(doc(db, "workflow_tasks", id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

// ─── On-Call Log ──────────────────────────────────────────────────────────────

export interface OnCallEntry {
  id: string;
  individual_id: string;
  individual_name?: string;
  date: string;
  time?: string;
  caller?: string;
  call_type?: string;
  description?: string;
  action_taken?: string;
  follow_up_required?: boolean;
  follow_up_notes?: string;
  author_uid?: string;
  author_name?: string;
  created_at?: unknown;
}

export function useOnCallLog(individualId: string | undefined) {
  return useSubCollection<OnCallEntry>(individualId, "oncall_log", "date", "desc");
}

export function useAllOnCallLogs() {
  return useCollection<OnCallEntry>("oncall_log", "date", "desc");
}

export async function addOnCallLog(data: Omit<OnCallEntry, "id" | "created_at">) {
  return addDoc(collection(db, "oncall_log"), {
    ...data,
    created_at: serverTimestamp(),
  });
}

// ─── Trainings ────────────────────────────────────────────────────────────────

export interface Training {
  id: string;
  individual_id: string;
  title: string;
  category?: string;
  provider?: string;
  completion_date?: string;
  expiration_date?: string;
  status: "completed" | "in_progress" | "overdue" | "scheduled";
  hours?: number;
  certificate_url?: string;
  notes?: string;
  created_at?: unknown;
  updated_at?: unknown;
}

export function useTrainings(individualId: string | undefined) {
  return useSubCollection<Training>(individualId, "trainings", "completion_date", "desc");
}

// ─── Assessments ──────────────────────────────────────────────────────────────

export interface AssessmentRecord {
  id: string;
  individual_id: string;
  templateId: string;
  templateVersion: string;
  date: string;
  status: "Draft" | "In Progress" | "Completed";
  completedBy?: string;
  totalScore?: number;
  loc?: "Low" | "Moderate" | "High" | "Critical";
  answers: any[];
  signatures?: any;
  attachments?: any[];
  riskFindings?: any[];
  created_at?: unknown;
  updated_at?: unknown;
}

export function useAssessments(individualId: string | undefined) {
  return useSubCollection<AssessmentRecord>(individualId, "assessments", "created_at", "desc");
}

export async function addAssessment(data: Omit<AssessmentRecord, "id" | "created_at" | "updated_at">) {
  return addDoc(collection(db, "assessments"), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

// ─── Care Tracker ─────────────────────────────────────────────────────────────

export interface CareTrackerRecord {
  id: string;
  individual_id: string;
  activity: string;
  detail: string;
  provider: string;
  date: string;
  created_at?: unknown;
}

export function useCareTracker(individualId: string | undefined) {
  return useSubCollection<CareTrackerRecord>(individualId, "care_tracker", "created_at", "desc");
}

export async function addCareTrackerEntry(data: Omit<CareTrackerRecord, "id" | "created_at">) {
  return addDoc(collection(db, "care_tracker"), {
    ...data,
    created_at: serverTimestamp(),
  });
}

// ─── Meeting Notes ────────────────────────────────────────────────────────────

export interface MeetingNoteRecord {
  id: string;
  individual_id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  attendees: string[];
  facilitator: string;
  agenda: string;
  discussionNotes: string;
  actionItems: any[];
  linkedGoals: string[];
  attachments: { name: string; size: string }[];
  createdAt: string;
  createdBy: string;
  created_at?: unknown;
  updated_at?: unknown;
}

export function useMeetingNotes(individualId: string | undefined) {
  return useSubCollection<MeetingNoteRecord>(individualId, "meeting_notes", "date", "desc");
}

export async function addMeetingNote(data: Omit<MeetingNoteRecord, "id" | "created_at" | "updated_at">) {
  return addDoc(collection(db, "meeting_notes"), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function updateMeetingNote(id: string, data: Partial<MeetingNoteRecord>) {
  return updateDoc(doc(db, "meeting_notes", id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

export async function deleteMeetingNote(id: string) {
  return deleteDoc(doc(db, "meeting_notes", id));
}

// ─── Eligibility Verifications ────────────────────────────────────────────────

export interface FundingSource {
  id: string;
  type: "Medicare" | "State funding" | "County funding" | "Private insurance" | "Self-pay" | "Other";
  policyNumber?: string;
  effectiveDate?: string;
  renewalDate?: string;
  status?: string;
  notes?: string;
}

export interface EligibilityVerification {
  id: string;
  individual_id: string;
  verification_date: string;
  payer?: string;
  medicaid_id?: string;
  eligible?: boolean;
  coverage_start?: string;
  coverage_end?: string;
  plan_name?: string;
  managed_care_org?: string;
  verified_by?: string;
  notes?: string;
  created_at?: unknown;
  // Comprehensive compatibility fields
  maStatus: "MA Eligible — Active"
    | "MA Eligible — Renewal Pending"
    | "MA Eligible — Pending Approval"
    | "MA Ineligible — Suspended"
    | "MA Ineligible — Terminated"
    | "MA Ineligible — Not Found"
    | "Unknown — Verification Needed";
  maNumber?: string;
  maType?: "Waiver Related" | "SSI Related" | "Medicare/Medicaid Dual" | "Spend-Down" | "Other";
  ssiOrNoRedetermination?: boolean;
  verificationDate?: string;
  effectiveDate?: string;
  applicationDate?: string;
  renewalDate?: string;
  redeterminationDate?: string;
  documentType?: string;
  documentName?: string;
  documentUploadedOn?: string;
  recordStatus: "Active" | "Pending" | "Inactive" | "Draft";
  updatedBy: string;
  updatedOn: string;
  fundingSources?: FundingSource[];
  aiFields?: Record<string, string>;
}

export function useEligibilityVerification(verificationId: string | undefined) {
  const [data, setData] = useState<EligibilityVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!verificationId || verificationId === "new") {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "eligibility_verifications", verificationId),
      (snap) => {
        if (snap.exists()) {
          setData({ id: snap.id, ...snap.data() } as EligibilityVerification);
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`[eligibility_verification]`, err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [verificationId]);

  return { data, loading, error };
}

export function useEligibilityVerifications(individualId: string | undefined) {
  return useSubCollection<EligibilityVerification>(
    individualId,
    "eligibility_verifications",
    "verification_date",
    "desc"
  );
}

// ─── Assigned Staff ───────────────────────────────────────────────────────────

export interface AssignedStaffMember {
  id: string;
  individual_id: string;
  staff_uid?: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  start_date?: string;
  end_date?: string;
  primary?: boolean;
  status: "active" | "inactive";
  created_at?: unknown;
}

export function useAssignedStaff(individualId: string | undefined) {
  return useSubCollection<AssignedStaffMember>(
    individualId,
    "assigned_staff",
    "created_at",
    "asc"
  );
}

// ─── Firestore Action Helpers ──────────────────────────────────────────────────

export async function addCarePlan(data: any) {
  return addDoc(collection(db, "care_plans"), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function updateCarePlan(id: string, data: any) {
  return updateDoc(doc(db, "care_plans", id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

export async function addMonitoringForm(data: any) {
  return addDoc(collection(db, "monitoring_forms"), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function updateMonitoringForm(id: string, data: any) {
  return updateDoc(doc(db, "monitoring_forms", id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

export async function addIncidentReport(data: any) {
  return addDoc(collection(db, "incident_reports"), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function updateIncidentReport(id: string, data: any) {
  return updateDoc(doc(db, "incident_reports", id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

export async function addEligibilityVerification(data: any) {
  return addDoc(collection(db, "eligibility_verifications"), {
    ...data,
    created_at: serverTimestamp(),
  });
}

export async function updateEligibilityVerification(id: string, data: any) {
  return updateDoc(doc(db, "eligibility_verifications", id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

export async function addOnCallEntry(data: any) {
  return addDoc(collection(db, "oncall_log"), {
    ...data,
    created_at: serverTimestamp(),
  });
}

export async function updateOnCallEntry(id: string, data: any) {
  return updateDoc(doc(db, "oncall_log", id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

export async function addTraining(data: any) {
  return addDoc(collection(db, "trainings"), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function updateTraining(id: string, data: any) {
  return updateDoc(doc(db, "trainings", id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

export async function addAssignedStaff(data: any) {
  return addDoc(collection(db, "assigned_staff"), {
    ...data,
    created_at: serverTimestamp(),
  });
}

export async function updateAssignedStaff(id: string, data: any) {
  return updateDoc(doc(db, "assigned_staff", id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

// ─── Compliance Engines ───────────────────────────────────────────────────────

export interface ComplianceEngineRecord {
  id: string;
  name: string;
  state: string;
  program: string;
  effectiveDate: string;
  version: string;
  status: "draft" | "published" | "archived";
  serviceCount: number;
  hardStopCount: number;
  warningCount: number;
  createdBy: string;
  publishedAt: string | null;
  lastUpdated: string;
  created_at?: unknown;
  updated_at?: unknown;
}

export function useComplianceEngines() {
  return useCollection<ComplianceEngineRecord>("compliance_engines", "lastUpdated", "desc");
}

export async function addComplianceEngine(data: Omit<ComplianceEngineRecord, "id" | "created_at" | "updated_at">) {
  return addDoc(collection(db, "compliance_engines"), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function updateComplianceEngine(id: string, data: Partial<ComplianceEngineRecord>) {
  return updateDoc(doc(db, "compliance_engines", id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

export async function deleteComplianceEngine(id: string) {
  return deleteDoc(doc(db, "compliance_engines", id));
}

// ─── Service Authorizations ───────────────────────────────────────────────────

export type AuthBillingPeriod = "monthly" | "quarterly" | "annual" | "one_time";
export type AuthStatus = "active" | "expired" | "pending" | "voided";

export interface ServiceAuthorization {
  id: string;
  /** Matches the individual's Firestore doc id */
  individualId: string;
  /** Snake-case alias kept for query compat with useSubCollection */
  individual_id: string;
  individualName: string;
  organizationId: string;
  assigned_case_manager_id?: string;
  assigned_case_manager_name?: string;
  auth_number: string;
  service_name: string;
  procedure_code: string;
  payer: string;
  units_authorized: number;
  units_used: number;
  billing_period: AuthBillingPeriod;
  start_date: string;   // YYYY-MM-DD
  end_date: string;     // YYYY-MM-DD
  status: AuthStatus;
  notes?: string;
  created_at?: unknown;
  updated_at?: unknown;
}

/** Individual-scoped: all auths for one person */
export function useServiceAuthorizations(individualId: string | undefined) {
  return useSubCollection<ServiceAuthorization>(
    individualId,
    "service_authorizations",
    "end_date",
    "asc"
  );
}

/** Org-wide: all auths for a case manager's caseload */
export function useAllAuthorizations(
  organizationId: string | undefined,
  caseManagerId: string | undefined
) {
  const [data, setData] = useState<ServiceAuthorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId || !caseManagerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "service_authorizations"),
      where("organizationId", "==", organizationId),
      where("assigned_case_manager_id", "==", caseManagerId),
      orderBy("end_date", "asc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceAuthorization)));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[service_authorizations]", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [organizationId, caseManagerId]);

  return { data, loading, error };
}

export async function addServiceAuthorization(
  data: Omit<ServiceAuthorization, "id" | "created_at" | "updated_at">
) {
  return addDoc(collection(db, "service_authorizations"), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function updateServiceAuthorization(
  id: string,
  data: Partial<ServiceAuthorization>
) {
  return updateDoc(doc(db, "service_authorizations", id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

export async function deleteServiceAuthorization(id: string) {
  return deleteDoc(doc(db, "service_authorizations", id));
}

// ─── Person-Centered Plans (PCP v2) ───────────────────────────────────────────

export interface PCPRecord {
  id: string;
  individual_id: string;
  plan_type: "annual" | "initial" | "revised";
  plan_format: "pcp_v2";
  effective_date: string;
  annual_plan_date: string;
  status: "draft" | "pending_signatures" | "submitted" | "approved";
  created_by?: string;
  ai_generated: boolean;
  ai_draft_path: boolean;
  source_documents?: Array<{ name: string; label: string }>;
  sections?: Record<string, unknown>;
  compliance_check?: { hard_stops: number; review_items: number };
  signatures?: Array<{ name: string; role: string; signed: boolean; signedOn?: string }>;
  revision_reason?: string;
  created_at?: unknown;
  updated_at?: unknown;
}

export function usePCPs(individualId: string | undefined) {
  return useSubCollection<PCPRecord>(
    individualId,
    "pcps",
    "created_at",
    "desc"
  );
}

export function usePCP(pcpId: string | undefined) {
  const [data, setData] = useState<PCPRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pcpId || pcpId === "new") {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "pcps", pcpId),
      (snap) => {
        if (snap.exists()) {
          setData({ id: snap.id, ...snap.data() } as PCPRecord);
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[pcp]", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [pcpId]);

  return { data, loading, error };
}

export async function addPCP(data: Omit<PCPRecord, "id" | "created_at" | "updated_at">) {
  return addDoc(collection(db, "pcps"), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function updatePCP(id: string, data: Partial<PCPRecord>) {
  return updateDoc(doc(db, "pcps", id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}
