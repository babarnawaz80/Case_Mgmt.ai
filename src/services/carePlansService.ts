// Care Plans Service — PCP / ISP Generation & Management
// CaseManagement.AI — HIPAA-Compliant
// Handles Person-Centered Plans, Annual Support Plans, ISPs

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { audit } from "../lib/auditService";

export type PlanType = "person_centered_plan" | "annual_support_plan" | "isp" | "behavior_support_plan";
export type PlanStatus = "draft" | "ai_generated" | "in_review" | "approved" | "sent" | "archived";

export interface CarePlan {
  id: string;
  type: PlanType;
  individualId: string;
  authorId: string;
  organizationId: string;
  planYear: number;               // e.g., 2025
  effectiveDate: string;          // ISO date
  expirationDate: string;         // ISO date
  status: PlanStatus;

  // AI-generated content sections (stored as structured JSON)
  sections: PlanSection[];

  // Delivery
  sentToProviders?: ProviderDelivery[];
  downloadedAt?: Timestamp;

  // Metadata
  aiModel?: string;               // e.g., "gemini-1.5-pro"
  aiPromptVersion?: string;
  generatedFromNoteIds?: string[];
  reviewedByUserId?: string;
  reviewedAt?: Timestamp;
  approvedByUserId?: string;
  approvedAt?: Timestamp;

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PlanSection {
  id: string;
  title: string;
  order: number;
  contentMd: string;              // Markdown content
  aiGenerated: boolean;
  lastEditedByUserId?: string;
  lastEditedAt?: string;
}

export interface ProviderDelivery {
  providerName: string;
  deliveryMethod: "encrypted_link" | "email" | "download";
  sentAt: string;
  linkExpiresAt?: string;
  linkToken?: string;
  sentByUserId: string;
}

// Default PCP sections for IDD providers
export const DEFAULT_PCP_SECTIONS: Omit<PlanSection, "contentMd">[] = [
  { id: "profile", title: "Individual Profile & Background", order: 1, aiGenerated: true },
  { id: "vision", title: "Vision & Life Goals", order: 2, aiGenerated: true },
  { id: "strengths", title: "Strengths, Preferences & Interests", order: 3, aiGenerated: true },
  { id: "support_needs", title: "Support Needs & Services", order: 4, aiGenerated: true },
  { id: "health_safety", title: "Health, Safety & Medical Needs", order: 5, aiGenerated: true },
  { id: "natural_supports", title: "Natural & Community Supports", order: 6, aiGenerated: true },
  { id: "outcomes", title: "Outcomes & Measurable Goals", order: 7, aiGenerated: true },
  { id: "team", title: "Support Team & Responsibilities", order: 8, aiGenerated: true },
  { id: "rights", title: "Rights & Informed Consent", order: 9, aiGenerated: false },
  { id: "signatures", title: "Signatures & Acknowledgements", order: 10, aiGenerated: false },
];

// Create a new care plan (blank or AI-generated)
export async function createCarePlan(
  data: Omit<CarePlan, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, "care_plans"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await audit.generatePCP(docRef.id, data.individualId);
  return docRef.id;
}

// Get a single care plan
export async function getCarePlan(id: string): Promise<CarePlan | null> {
  const snap = await getDoc(doc(db, "care_plans", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as CarePlan;
}

// Get all care plans for an individual
export async function getCarePlansByIndividual(
  individualId: string,
  pageLimit = 10
): Promise<CarePlan[]> {
  const q = query(
    collection(db, "care_plans"),
    where("individualId", "==", individualId),
    orderBy("createdAt", "desc"),
    limit(pageLimit)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CarePlan));
}

// Get the most recent approved plan for an individual
export async function getLatestApprovedPlan(individualId: string): Promise<CarePlan | null> {
  const q = query(
    collection(db, "care_plans"),
    where("individualId", "==", individualId),
    where("status", "==", "approved"),
    orderBy("effectiveDate", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as CarePlan;
}

// Update a plan section (called on every editor keystroke — debounced in UI)
export async function updatePlanSection(
  planId: string,
  sectionId: string,
  contentMd: string,
  userId: string
): Promise<void> {
  const planRef = doc(db, "care_plans", planId);
  const plan = await getCarePlan(planId);
  if (!plan) throw new Error("Plan not found");

  const updatedSections = plan.sections.map((s) =>
    s.id === sectionId
      ? { ...s, contentMd, lastEditedByUserId: userId, lastEditedAt: new Date().toISOString() }
      : s
  );

  await updateDoc(planRef, {
    sections: updatedSections,
    updatedAt: serverTimestamp(),
  });
}

// Update plan status
export async function updatePlanStatus(
  planId: string,
  status: PlanStatus,
  userId: string
): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === "approved") {
    updates.approvedByUserId = userId;
    updates.approvedAt = serverTimestamp();
  }
  if (status === "in_review") {
    updates.reviewedByUserId = userId;
    updates.reviewedAt = serverTimestamp();
  }

  await updateDoc(doc(db, "care_plans", planId), updates);
}

// Record a provider delivery (encrypted link or email)
export async function recordProviderDelivery(
  planId: string,
  individualId: string,
  delivery: ProviderDelivery
): Promise<void> {
  const plan = await getCarePlan(planId);
  if (!plan) throw new Error("Plan not found");

  const existingDeliveries = plan.sentToProviders ?? [];
  await updateDoc(doc(db, "care_plans", planId), {
    sentToProviders: [...existingDeliveries, delivery],
    status: "sent",
    updatedAt: serverTimestamp(),
  });

  await audit.sendPCP(planId, individualId, delivery.deliveryMethod);
}
