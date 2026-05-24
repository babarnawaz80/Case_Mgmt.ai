// Individuals Service — HIPAA-Compliant Firestore Operations
// CaseManagement.AI
// All reads/writes go through this service — never query Firestore directly from components

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { audit } from '../lib/auditService';

export type RiskTier = 'low' | 'medium' | 'high';
export type IndividualStatus = 'active' | 'pending' | 'discharged' | 'on_hold';
export type WaiverType = 'CIH' | 'FSW' | 'COMP' | 'BI' | 'other';

export interface Individual {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;                     // ISO date string
  gender?: string;
  photoUrl?: string;
  riskTier: RiskTier;
  waiverType?: WaiverType;
  hrstScore?: number;
  icapScore?: number;
  primaryDx?: string;
  status: IndividualStatus;
  programId: string;
  organizationId: string;
  assignedCaseManagerId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface IndividualContact {
  id?: string;
  individualId: string;
  relationship: string;
  name: string;
  phone?: string;
  email?: string;
  isEmergency: boolean;
}

// Get all individuals assigned to a case manager
export async function getIndividualsByCaseManager(
  caseManagerId: string,
  organizationId: string
): Promise<Individual[]> {
  const q = query(
    collection(db, 'individuals'),
    where('organizationId', '==', organizationId),
    where('assignedCaseManagerId', '==', caseManagerId),
    where('status', '==', 'active'),
    orderBy('lastName'),
    limit(200)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Individual));
}

// Get all individuals for an org (admin/supervisor view)
export async function getAllIndividuals(organizationId: string): Promise<Individual[]> {
  const q = query(
    collection(db, 'individuals'),
    where('organizationId', '==', organizationId),
    orderBy('lastName'),
    limit(500)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Individual));
}

// Get a single individual by ID
export async function getIndividual(id: string): Promise<Individual | null> {
  const docRef = doc(db, 'individuals', id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  // Audit the access
  await audit.viewIndividual(id);

  return { id: snapshot.id, ...snapshot.data() } as Individual;
}

// Get full display name
export function getDisplayName(individual: Individual): string {
  return `${individual.firstName} ${individual.lastName}`;
}

// Get initials for avatar fallback
export function getInitials(individual: Individual): string {
  return `${individual.firstName[0]}${individual.lastName[0]}`.toUpperCase();
}

// Get risk color class based on tier
export function getRiskColor(tier: RiskTier): string {
  switch (tier) {
    case 'high': return 'bg-red-100 text-red-700 border-red-200';
    case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'low': return 'bg-green-100 text-green-700 border-green-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

// Get avatar background color (deterministic by name)
export function getAvatarColor(individual: Individual): string {
  const colors = [
    'bg-blue-200 text-blue-800',
    'bg-purple-200 text-purple-800',
    'bg-teal-200 text-teal-800',
    'bg-orange-200 text-orange-800',
    'bg-pink-200 text-pink-800',
    'bg-indigo-200 text-indigo-800',
  ];
  const idx = (individual.firstName.charCodeAt(0) + individual.lastName.charCodeAt(0)) % colors.length;
  return colors[idx];
}

// Create a new individual record
export async function createIndividual(
  data: Omit<Individual, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'individuals'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await audit.viewIndividual(docRef.id);
  return docRef.id;
}

// Update an individual record
export async function updateIndividual(
  id: string,
  data: Partial<Omit<Individual, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, 'individuals', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
