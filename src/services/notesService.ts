// Notes Service — HIPAA-Compliant Note Operations
// CaseManagement.AI
// Handles: Contact Notes, Progress Notes, Visit Summaries, Draft Store

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
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { audit } from '../lib/auditService';
import { v4 as uuidv4 } from 'uuid';

export type NoteStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type NoteSource = 'manual' | 'ambient' | 'prefill';
export type NoteType = 
  | 'contact_note'
  | 'progress_note'
  | 'visit_summary'
  | 'billable_activity_note'
  | 'monitoring_form'
  | 'meeting_note';

export interface BaseNote {
  id: string;
  type: NoteType;
  individualId: string;
  authorId: string;
  organizationId: string;
  occurredAt: string;           // ISO date string of when the visit/contact happened
  bodyMd: string;               // Markdown content
  status: NoteStatus;
  source: NoteSource;
  aiSessionId?: string;         // Link to ambient session if AI-generated
  signatureUrl?: string;
  idempotencyKey: string;       // Prevents duplicate writes
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ContactNote extends BaseNote {
  type: 'contact_note';
  contactType: string;          // e.g., 'Face-to-Face', 'Phone Call', 'Home Visit'
  participants: string[];
  reasonForContact: string;
  nextSteps?: string;
}

export interface ProgressNote extends BaseNote {
  type: 'progress_note';
  narrative: string;
  updatesSinceLastContact?: string;
  planChanges?: string;
  billable: boolean;
  serviceCode?: string;
  units?: number;
}

// Generate an idempotency key for a write operation
export function generateIdempotencyKey(): string {
  return `idem-${uuidv4()}`;
}

// Create a new contact note
export async function createContactNote(
  data: Omit<ContactNote, 'id' | 'idempotencyKey' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const idempotencyKey = generateIdempotencyKey();

  const docRef = await addDoc(collection(db, 'contact_notes'), {
    ...data,
    idempotencyKey,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await audit.createNote(docRef.id, data.individualId, 'contact_note');
  return docRef.id;
}

// Create a new progress note
export async function createProgressNote(
  data: Omit<ProgressNote, 'id' | 'idempotencyKey' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const idempotencyKey = generateIdempotencyKey();

  const docRef = await addDoc(collection(db, 'progress_notes'), {
    ...data,
    idempotencyKey,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await audit.createNote(docRef.id, data.individualId, 'progress_note');
  return docRef.id;
}

// Get all notes for an individual (paginated)
export async function getNotesByIndividual(
  individualId: string,
  noteType: NoteType,
  pageLimit = 25
): Promise<BaseNote[]> {
  const collectionName = noteType === 'contact_note' ? 'contact_notes' : 'progress_notes';

  const q = query(
    collection(db, collectionName),
    where('individualId', '==', individualId),
    orderBy('occurredAt', 'desc'),
    limit(pageLimit)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BaseNote));
}

// Save a draft from ambient session to Draft Store
export interface DraftItem {
  id?: string;
  type: string;                 // DraftContactNote, DraftBarrier, etc.
  individualId: string;
  sessionId: string;
  userId: string;
  organizationId: string;
  content: Record<string, unknown>;  // The draft content
  status: 'pending' | 'applied' | 'discarded' | 'expired';
  confidence?: number;          // AI confidence score (0-1)
  sourceTranscriptSegment?: {
    startTime: number;
    endTime: number;
    text: string;
  };
  createdAt?: Timestamp;
  expiresAt?: Timestamp;
}

export async function saveDraftItem(data: Omit<DraftItem, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'draft_store'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getDraftsBySession(sessionId: string): Promise<DraftItem[]> {
  const q = query(
    collection(db, 'draft_store'),
    where('sessionId', '==', sessionId),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DraftItem));
}

export async function applyDraftItem(draftId: string): Promise<void> {
  await updateDoc(doc(db, 'draft_store', draftId), {
    status: 'applied',
    appliedAt: serverTimestamp(),
  });
}

export async function discardDraftItem(draftId: string): Promise<void> {
  await updateDoc(doc(db, 'draft_store', draftId), {
    status: 'discarded',
    discardedAt: serverTimestamp(),
  });
}
