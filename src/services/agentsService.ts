// Agents Service — Firestore Operations
// CaseManagement.AI
// Manages the 'agents' collection

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentType =
  | 'pcp_generator'
  | 'compliance_copilot'
  | 'pcp_alignment'
  | 'billing_documentation'
  | 'monitoring_reauth'
  | 'isp_generator';

export type PushMode = 'manual' | 'auto_pass' | 'auto_always';

export interface AgentDoc {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  guidelines_engine_id: string;
  guidelines_engine_name: string;
  guidelines_engine_version: string;
  master_prompt: string;
  master_prompt_updated_at: Timestamp | null;
  master_prompt_updated_by: string;
  auto_monitor: boolean;
  push_mode: PushMode;
  individuals_count: number;
  avg_compliance: number;
  active_runs: number;
  drafts_pending: number;
  created_by: string;
  created_at: Timestamp | null;
  last_run_at: Timestamp | null;
  tone?: string; // for UI color
  alert_count?: number;
  version?: string;
  schedule?: string;
}

// ─── Read Operations ──────────────────────────────────────────────────────────

export async function getAgents(): Promise<AgentDoc[]> {
  const snap = await getDocs(
    query(collection(db, 'agents'), orderBy('created_at', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AgentDoc));
}

export async function getAgentById(id: string): Promise<AgentDoc | null> {
  const snap = await getDoc(doc(db, 'agents', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AgentDoc;
}

// ─── Write Operations ─────────────────────────────────────────────────────────

export interface CreateAgentInput {
  name: string;
  type: AgentType;
  description: string;
  guidelines_engine_id: string;
  guidelines_engine_name: string;
  guidelines_engine_version: string;
  master_prompt: string;
  auto_monitor: boolean;
  push_mode: PushMode;
  created_by: string;
}

export async function createAgent(input: CreateAgentInput): Promise<string> {
  const ref = doc(collection(db, 'agents'));
  await setDoc(ref, {
    ...input,
    status: 'active',
    individuals_count: 0,
    avg_compliance: 0,
    active_runs: 0,
    drafts_pending: 0,
    master_prompt_updated_at: serverTimestamp(),
    master_prompt_updated_by: input.created_by,
    created_at: serverTimestamp(),
    last_run_at: null,
    tone: 'accent',
    alert_count: 0,
    version: 'v1.0',
    schedule: 'Manual only',
  });
  return ref.id;
}

export async function updateAgent(
  id: string,
  data: Partial<Omit<AgentDoc, 'id' | 'created_at'>>
): Promise<void> {
  await updateDoc(doc(db, 'agents', id), data as Record<string, unknown>);
}

export async function updateMasterPrompt(
  id: string,
  prompt: string,
  updatedBy: string
): Promise<void> {
  await updateDoc(doc(db, 'agents', id), {
    master_prompt: prompt,
    master_prompt_updated_at: serverTimestamp(),
    master_prompt_updated_by: updatedBy,
  });
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

// Only the PCP Alignment Copilot is seeded — all other dummy agents were removed
const SEED_AGENTS: Omit<AgentDoc, 'created_at' | 'last_run_at' | 'master_prompt_updated_at'>[] = [
  {
    id: 'agent-alignment-001',
    name: 'PCP Alignment Copilot',
    type: 'pcp_alignment',
    description: 'Scans PCP vs guideline pack requirements, identifies missing items, drafts addendum language.',
    status: 'active',
    guidelines_engine_id: 'engine-maryland-dda-v2',
    guidelines_engine_name: 'Maryland DDA',
    guidelines_engine_version: 'v2.0',
    master_prompt: 'Scan existing PCPs against Maryland DDA v2.0 guidelines. Identify any missing required sections, unsigned goals, or outdated assessments. Draft addendum language in person-first style for any gaps found. Prioritize hard stops over warnings in your report.',
    master_prompt_updated_by: 'Babar Nawaz',
    auto_monitor: true,
    push_mode: 'manual',
    individuals_count: 18,
    avg_compliance: 97,
    active_runs: 0,
    drafts_pending: 3,
    created_by: 'system-seed',
    tone: 'green',
    alert_count: 3,
    version: 'v1.0',
    schedule: 'Daily',
  },
];

// IDs of dummy agents that should be removed from Firestore
const DUMMY_AGENT_IDS = [
  'agent-pcp-001',
  'agent-billing-001',
  'agent-monitoring-001',
  'agent-isp-001',
];

export async function cleanupDummyAgents(): Promise<void> {
  const batch = writeBatch(db);
  let hasDeletions = false;
  for (const id of DUMMY_AGENT_IDS) {
    const ref = doc(db, 'agents', id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      batch.delete(ref);
      hasDeletions = true;
    }
  }
  if (hasDeletions) await batch.commit();
}

export async function seedAgents(): Promise<void> {
  // Ensure the PCP Alignment Copilot exists
  const alignmentRef = doc(db, 'agents', 'agent-alignment-001');
  const alignmentSnap = await getDoc(alignmentRef);
  if (alignmentSnap.exists()) return;

  const now = Timestamp.now();
  const lastRunDate = Timestamp.fromDate(new Date('2026-02-22T09:30:00'));
  const agent = SEED_AGENTS[0];
  await setDoc(alignmentRef, {
    ...agent,
    created_at: now,
    last_run_at: lastRunDate,
    master_prompt_updated_at: now,
  });
}
