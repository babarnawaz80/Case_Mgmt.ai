// Agent Runs Service — Firestore Operations
// CaseManagement.AI
// Manages the 'agent_runs' collection

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RunResult {
  compliance: 'pass' | 'flagged' | 'pending';
  hard_stops: number;
  warnings: number;
  sections_generated: number;
  items_flagged: string[];
}

export interface RunOverride {
  user: string;
  timestamp: Timestamp;
  rule: string;
  justification: string;
}

export interface AgentRunDoc {
  id: string;
  agent_id: string;
  agent_name: string;
  individual_id: string;
  individual_name: string;
  run_type: 'pcp_generation' | 'compliance_check' | 'monitoring_review';
  status: 'running' | 'complete' | 'failed';
  started_at: Timestamp | null;
  completed_at: Timestamp | null;
  created_by: string;
  pcp_id: string | null;
  date_range_from: string;
  date_range_to: string;
  result: RunResult;
  overrides: RunOverride[];
}

// ─── Read Operations ──────────────────────────────────────────────────────────

export async function getRunsForAgent(agentId: string, maxResults = 10): Promise<AgentRunDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, 'agent_runs'),
      where('agent_id', '==', agentId),
      orderBy('started_at', 'desc'),
      limit(maxResults)
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AgentRunDoc));
}

export async function getRunById(id: string): Promise<AgentRunDoc | null> {
  const snap = await getDoc(doc(db, 'agent_runs', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AgentRunDoc;
}

// ─── Write Operations ─────────────────────────────────────────────────────────

export interface CreateRunInput {
  agent_id: string;
  agent_name: string;
  individual_id: string;
  individual_name: string;
  run_type: AgentRunDoc['run_type'];
  created_by: string;
  date_range_from: string;
  date_range_to: string;
}

export async function createRun(input: CreateRunInput): Promise<string> {
  const ref = doc(collection(db, 'agent_runs'));
  await setDoc(ref, {
    ...input,
    status: 'running',
    started_at: serverTimestamp(),
    completed_at: null,
    pcp_id: null,
    result: {
      compliance: 'pending',
      hard_stops: 0,
      warnings: 0,
      sections_generated: 0,
      items_flagged: [],
    },
    overrides: [],
  });
  return ref.id;
}

export async function completeRun(
  id: string,
  result: RunResult
): Promise<void> {
  await updateDoc(doc(db, 'agent_runs', id), {
    status: 'complete',
    completed_at: serverTimestamp(),
    result,
  });
}

export async function failRun(id: string, reason: string): Promise<void> {
  await updateDoc(doc(db, 'agent_runs', id), {
    status: 'failed',
    completed_at: serverTimestamp(),
    'result.items_flagged': [reason],
  });
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_RUNS = [
  {
    id: 'run-001',
    agent_id: 'agent-alignment-001',
    agent_name: 'PCP Alignment Copilot',
    individual_id: 'joseph-brown',
    individual_name: 'Williams, James',
    run_type: 'compliance_check' as const,
    status: 'complete' as const,
    created_by: 'System (auto-monitor)',
    date_range_from: '2026-01-12',
    date_range_to: '2026-02-22',
    pcp_id: null,
    result: { compliance: 'flagged' as const, hard_stops: 1, warnings: 2, sections_generated: 10, items_flagged: ['ISP overdue', 'FAE not completed', 'Monitoring form overdue'] },
    overrides: [],
    started_at: Timestamp.fromDate(new Date('2026-02-22T09:30:00')),
    completed_at: Timestamp.fromDate(new Date('2026-02-22T09:32:00')),
  },
  {
    id: 'run-002',
    agent_id: 'agent-alignment-001',
    agent_name: 'PCP Alignment Copilot',
    individual_id: 'garcia-maria',
    individual_name: 'Garcia, Maria',
    run_type: 'compliance_check' as const,
    status: 'complete' as const,
    created_by: 'Kathy Adams',
    date_range_from: '2026-01-01',
    date_range_to: '2026-02-21',
    pcp_id: null,
    result: { compliance: 'pass' as const, hard_stops: 0, warnings: 0, sections_generated: 10, items_flagged: [] },
    overrides: [],
    started_at: Timestamp.fromDate(new Date('2026-02-21T11:48:00')),
    completed_at: Timestamp.fromDate(new Date('2026-02-21T11:50:00')),
  },
  {
    id: 'run-003',
    agent_id: 'agent-pcp-001',
    agent_name: 'PCP Generation Agent',
    individual_id: 'joseph-brown',
    individual_name: 'Brown, Joseph',
    run_type: 'pcp_generation' as const,
    status: 'complete' as const,
    created_by: 'System (auto-monitor)',
    date_range_from: '2026-01-12',
    date_range_to: '2026-02-22',
    pcp_id: null,
    result: { compliance: 'flagged' as const, hard_stops: 1, warnings: 2, sections_generated: 11, items_flagged: ['ISP overdue by 25 days', 'Monitoring form overdue', 'Unsigned progress notes'] },
    overrides: [],
    started_at: Timestamp.fromDate(new Date('2026-02-22T09:30:00')),
    completed_at: Timestamp.fromDate(new Date('2026-02-22T09:35:00')),
  },
  {
    id: 'run-004',
    agent_id: 'agent-pcp-001',
    agent_name: 'PCP Generation Agent',
    individual_id: 'travis-langston',
    individual_name: 'Langston, Travis',
    run_type: 'pcp_generation' as const,
    status: 'complete' as const,
    created_by: 'System (auto-monitor)',
    date_range_from: '2025-12-01',
    date_range_to: '2026-02-21',
    pcp_id: null,
    result: { compliance: 'flagged' as const, hard_stops: 1, warnings: 1, sections_generated: 11, items_flagged: ['Day Hab hours exceed weekly cap'] },
    overrides: [],
    started_at: Timestamp.fromDate(new Date('2026-02-21T16:12:00')),
    completed_at: Timestamp.fromDate(new Date('2026-02-21T16:15:00')),
  },
  {
    id: 'run-005',
    agent_id: 'agent-billing-001',
    agent_name: 'Billing Documentation Copilot',
    individual_id: 'ashley-king',
    individual_name: 'King, Ashley',
    run_type: 'compliance_check' as const,
    status: 'complete' as const,
    created_by: 'Kathy Adams',
    date_range_from: '2026-02-01',
    date_range_to: '2026-02-21',
    pcp_id: null,
    result: { compliance: 'pass' as const, hard_stops: 0, warnings: 0, sections_generated: 0, items_flagged: [] },
    overrides: [],
    started_at: Timestamp.fromDate(new Date('2026-02-21T11:48:00')),
    completed_at: Timestamp.fromDate(new Date('2026-02-21T11:49:00')),
  },
  {
    id: 'run-006',
    agent_id: 'agent-monitoring-001',
    agent_name: 'Monitoring & Reauth Copilot',
    individual_id: 'mohsin-iqbal',
    individual_name: 'Iqbal, Mohsin',
    run_type: 'monitoring_review' as const,
    status: 'complete' as const,
    created_by: 'System (auto-monitor)',
    date_range_from: '2026-01-01',
    date_range_to: '2026-02-20',
    pcp_id: null,
    result: { compliance: 'pass' as const, hard_stops: 0, warnings: 1, sections_generated: 0, items_flagged: ['Auth expiring in 45 days'] },
    overrides: [],
    started_at: Timestamp.fromDate(new Date('2026-02-20T08:00:00')),
    completed_at: Timestamp.fromDate(new Date('2026-02-20T08:02:00')),
  },
];

export async function seedAgentRuns(): Promise<void> {
  const existing = await getDocs(
    query(collection(db, 'agent_runs'), where('id', '==', 'run-001'))
  );

  // Check by doc ID directly instead
  const checkRef = await getDoc(doc(db, 'agent_runs', 'run-001'));
  if (checkRef.exists()) return;

  const batch = writeBatch(db);
  for (const run of SEED_RUNS) {
    const ref = doc(db, 'agent_runs', run.id);
    batch.set(ref, run);
  }
  await batch.commit();
}
