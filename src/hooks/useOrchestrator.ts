// AI Orchestrator Frontend Hook
// Reads orchestrator data from Firestore and provides the trigger function.

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  limit,
  getDocs,
  type DocumentData,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OrchestratorRun {
  id: string;
  org_id: string;
  run_type: "scheduled" | "manual";
  triggered_by: string;
  started_at: Date | null;
  completed_at: Date | null;
  status: "running" | "completed" | "failed";
  individuals_processed: number;
  tasks_created: number;
  drafts_generated: number;
  escalations_triggered: number;
  compliance_scores_updated: number;
  errors: string[];
  summary?: string;
}

export interface OrchestratorLog {
  id: string;
  org_id: string;
  run_id: string;
  individual_id: string;
  individual_name?: string;
  agent: "compliance" | "documentation" | "billing" | "escalation" | "renewal";
  action: string;
  rule_applied: string;
  finding: string;
  result: string;
  timestamp: Date | null;
}

export interface OrchestratorTask {
  id: string;
  org_id: string;
  individual_id: string;
  individual_name: string;
  assigned_to_name: string;
  task_type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  status: "pending" | "acknowledged" | "in_progress" | "completed" | "dismissed";
  days_overdue: number;
  has_ai_draft: boolean;
  source_agent: string;
  created_at: Date | null;
}

function toRun(id: string, data: DocumentData): OrchestratorRun {
  return {
    id,
    org_id: data.org_id ?? "",
    run_type: data.run_type ?? "scheduled",
    triggered_by: data.triggered_by ?? "system",
    started_at: data.started_at?.toDate?.() ?? null,
    completed_at: data.completed_at?.toDate?.() ?? null,
    status: data.status ?? "completed",
    individuals_processed: data.individuals_processed ?? 0,
    tasks_created: data.tasks_created ?? 0,
    drafts_generated: data.drafts_generated ?? 0,
    escalations_triggered: data.escalations_triggered ?? 0,
    compliance_scores_updated: data.compliance_scores_updated ?? 0,
    errors: data.errors ?? [],
    summary: data.summary,
  };
}

function toLog(id: string, data: DocumentData): OrchestratorLog {
  return {
    id,
    org_id: data.org_id ?? "",
    run_id: data.run_id ?? "",
    individual_id: data.individual_id ?? "",
    individual_name: data.individual_name,
    agent: data.agent ?? "compliance",
    action: data.action ?? "",
    rule_applied: data.rule_applied ?? "",
    finding: data.finding ?? "",
    result: data.result ?? "",
    timestamp: data.timestamp?.toDate?.() ?? null,
  };
}

function toTask(id: string, data: DocumentData): OrchestratorTask {
  return {
    id,
    org_id: data.org_id ?? "",
    individual_id: data.individual_id ?? "",
    individual_name: data.individual_name ?? "",
    assigned_to_name: data.assigned_to_name ?? "Unassigned",
    task_type: data.task_type ?? "",
    severity: data.severity ?? "medium",
    title: data.title ?? "",
    description: data.description ?? "",
    status: data.status ?? "pending",
    days_overdue: data.days_overdue ?? 0,
    has_ai_draft: data.has_ai_draft ?? false,
    source_agent: data.source_agent ?? "",
    created_at: data.created_at?.toDate?.() ?? null,
  };
}

// ── Seed data for demo (written once if collection is empty) ──────────────────

async function seedDemoRunsIfNeeded(orgId: string): Promise<void> {
  try {
    const existing = await getDocs(
      query(collection(db, "orchestrator_runs"), where("org_id", "==", orgId), limit(1))
    );
    if (!existing.empty) return;

    const now = new Date();
    const makeDate = (daysAgo: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      d.setHours(2, 4, 0, 0);
      return d;
    };

    const seedRuns = [
      {
        org_id: orgId,
        run_type: "scheduled",
        triggered_by: "system",
        started_at: makeDate(7),
        completed_at: new Date(makeDate(7).getTime() + 4 * 60 * 1000),
        status: "completed",
        individuals_processed: 18,
        tasks_created: 7,
        drafts_generated: 3,
        escalations_triggered: 1,
        compliance_scores_updated: 18,
        errors: [],
        summary: "Processed 18 individuals. Created 7 tasks. Generated 3 AI drafts. Triggered 1 escalation. Updated 18 compliance scores.",
      },
      {
        org_id: orgId,
        run_type: "scheduled",
        triggered_by: "system",
        started_at: makeDate(3),
        completed_at: new Date(makeDate(3).getTime() + 5 * 60 * 1000),
        status: "completed",
        individuals_processed: 18,
        tasks_created: 12,
        drafts_generated: 5,
        escalations_triggered: 2,
        compliance_scores_updated: 18,
        errors: [],
        summary: "Processed 18 individuals. Created 12 tasks. Generated 5 AI drafts. Triggered 2 escalations. Updated 18 compliance scores.",
      },
      {
        org_id: orgId,
        run_type: "scheduled",
        triggered_by: "system",
        started_at: makeDate(1),
        completed_at: new Date(makeDate(1).getTime() + 4 * 60 * 1000 + 22 * 1000),
        status: "completed",
        individuals_processed: 18,
        tasks_created: 9,
        drafts_generated: 4,
        escalations_triggered: 1,
        compliance_scores_updated: 18,
        errors: [],
        summary: "Processed 18 individuals. Created 9 tasks. Generated 4 AI drafts. Triggered 1 escalation. Updated 18 compliance scores.",
      },
    ];

    await Promise.all(seedRuns.map((run) => addDoc(collection(db, "orchestrator_runs"), run)));
  } catch {
    // Non-fatal — seeding is best-effort for demo
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useOrchestrator() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId ?? "";

  const [runs, setRuns] = useState<OrchestratorRun[]>([]);
  const [logs, setLogs] = useState<OrchestratorLog[]>([]);
  const [tasks, setTasks] = useState<OrchestratorTask[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runProgress, setRunProgress] = useState<string | null>(null);

  // Seed demo data on first load
  useEffect(() => {
    if (orgId) seedDemoRunsIfNeeded(orgId);
  }, [orgId]);

  // Listen to orchestrator_runs
  useEffect(() => {
    if (!orgId) { setRunsLoading(false); return; }
    setRunsLoading(true);

    const q = query(
      collection(db, "orchestrator_runs"),
      where("org_id", "==", orgId),
      orderBy("started_at", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      setRuns(snap.docs.map((d) => toRun(d.id, d.data())));
      setRunsLoading(false);
    }, (err) => {
      console.warn("[useOrchestrator] runs:", err.message);
      // Try without ordering
      const fallbackQ = query(
        collection(db, "orchestrator_runs"),
        where("org_id", "==", orgId),
        limit(20)
      );
      onSnapshot(fallbackQ, (snap) => {
        const sorted = snap.docs
          .map((d) => toRun(d.id, d.data()))
          .sort((a, b) => (b.started_at?.getTime() ?? 0) - (a.started_at?.getTime() ?? 0));
        setRuns(sorted);
        setRunsLoading(false);
      });
    });

    return unsub;
  }, [orgId]);

  // Listen to orchestrator_logs (most recent 50)
  useEffect(() => {
    if (!orgId) { setLogsLoading(false); return; }
    setLogsLoading(true);

    const q = query(
      collection(db, "orchestrator_logs"),
      where("org_id", "==", orgId),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => toLog(d.id, d.data())));
      setLogsLoading(false);
    }, (err) => {
      console.warn("[useOrchestrator] logs:", err.message);
      setLogs([]);
      setLogsLoading(false);
    });

    return unsub;
  }, [orgId]);

  // Listen to orchestrator_tasks
  useEffect(() => {
    if (!orgId) return;

    const q = query(
      collection(db, "orchestrator_tasks"),
      where("org_id", "==", orgId),
      where("status", "in", ["pending", "acknowledged", "in_progress"]),
      limit(200)
    );

    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => toTask(d.id, d.data())));
    }, (err) => {
      console.warn("[useOrchestrator] tasks:", err.message);
      setTasks([]);
    });

    return unsub;
  }, [orgId]);

  // Trigger manual run
  const triggerRun = useCallback(async () => {
    if (!orgId || running) return;
    setRunning(true);
    setRunProgress("Initializing AI Orchestrator...");

    try {
      const fns = getFunctions(undefined, "us-central1");
      const runFn = httpsCallable(fns, "manualOrchestratorRun");

      setRunProgress("Loading individuals...");
      const result = await runFn({ orgId });
      const data = result.data as Record<string, unknown>;

      setRunProgress(
        `Complete — ${data.individuals_processed ?? 0} individuals processed, ${data.tasks_created ?? 0} tasks created`
      );

      setTimeout(() => setRunProgress(null), 5000);
    } catch (err: any) {
      setRunProgress(`Error: ${err.message ?? "Run failed"}`);
      setTimeout(() => setRunProgress(null), 8000);
    } finally {
      setRunning(false);
    }
  }, [orgId, running]);

  // Derived metrics
  const lastRun = runs[0] ?? null;
  const nextRunDate = (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    return tomorrow;
  })();

  const openTasksCount = tasks.filter((t) => t.status === "pending" || t.status === "acknowledged").length;
  const draftsReadyCount = tasks.filter((t) => t.has_ai_draft && t.status === "pending").length;

  return {
    runs,
    logs,
    tasks,
    runsLoading,
    logsLoading,
    running,
    runProgress,
    lastRun,
    nextRunDate,
    openTasksCount,
    draftsReadyCount,
    triggerRun,
  };
}
