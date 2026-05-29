import { useState, useEffect } from "react";
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp, type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export type TaskStatus = "open" | "in_progress" | "completed" | "overdue";
export type TaskPriority = "high" | "medium" | "low";

export interface Task {
  id: string;
  title: string;
  description?: string;
  individualId?: string;
  individualName?: string;
  dueDate: string; // YYYY-MM-DD
  status: TaskStatus;
  priority: TaskPriority;
  type: string;
  assignedTo: string; // uid
  organizationId: string;
  createdAt?: unknown;
  completedAt?: unknown;
}

function toTask(id: string, data: DocumentData): Task {
  return {
    id,
    title: data.title ?? "Untitled Task",
    description: data.description,
    individualId: data.individualId,
    individualName: data.individualName,
    dueDate: data.dueDate ?? data.due_date ?? "",
    status: data.status ?? "open",
    priority: data.priority ?? "medium",
    type: data.type ?? "General",
    assignedTo: data.assignedTo ?? "",
    organizationId: data.organizationId ?? "",
    createdAt: data.createdAt,
    completedAt: data.completedAt,
  };
}

export function useTasks() {
  const { userProfile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.uid || !userProfile?.organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const role = userProfile.role;
    let q;

    if (role === "admin" || role === "supervisor") {
      // Supervisors/admins see all tasks in the org
      q = query(
        collection(db, "tasks"),
        where("organizationId", "==", userProfile.organizationId),
        orderBy("dueDate", "asc"),
      );
    } else {
      // Case managers see only their own tasks
      q = query(
        collection(db, "tasks"),
        where("organizationId", "==", userProfile.organizationId),
        where("assignedTo", "==", userProfile.uid),
        orderBy("dueDate", "asc"),
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => toTask(d.id, d.data())));
      setLoading(false);
      setError(null);
    }, (err) => {
      console.warn("[tasks]", err.message);
      // Fallback: unordered query
      const fallback = query(
        collection(db, "tasks"),
        where("organizationId", "==", userProfile.organizationId),
        where("assignedTo", "==", userProfile.uid),
      );
      onSnapshot(fallback, (snap) => {
        setTasks(snap.docs.map((d) => toTask(d.id, d.data()))
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
        setLoading(false);
      });
      setError(null);
    });

    return unsub;
  }, [userProfile?.uid, userProfile?.organizationId, userProfile?.role]);

  return { tasks, loading, error };
}

export function useTaskSummary() {
  const { tasks, loading } = useTasks();

  const today = new Date().toISOString().split("T")[0];
  const endOfWeek = new Date();
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
  const eow = endOfWeek.toISOString().split("T")[0];

  const overdue = tasks.filter((t) => t.status !== "completed" && t.dueDate < today).length;
  const dueToday = tasks.filter((t) => t.status !== "completed" && t.dueDate === today).length;
  const dueThisWeek = tasks.filter((t) => t.status !== "completed" && t.dueDate > today && t.dueDate <= eow).length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const total = tasks.length;

  return { overdue, dueToday, dueThisWeek, completed, total, loading };
}

export async function completeTask(id: string): Promise<void> {
  await updateDoc(doc(db, "tasks", id), {
    status: "completed",
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createTask(
  task: Omit<Task, "id" | "createdAt" | "completedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "tasks"), {
    ...task,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export const TASK_TYPES = [
  "Progress Note Due",
  "Care Plan Review",
  "Assessment Due",
  "Monitoring Form",
  "Plan Renewal",
  "Eligibility Verification",
  "Incident Follow-up",
  "Visit Scheduled",
  "Contact Required",
  "Document Review",
  "General",
] as const;

export async function addTaskComment(
  taskId: string,
  comment: string,
  authorUid: string,
  authorName: string,
  mentions?: string[]
): Promise<void> {
  await addDoc(collection(db, "tasks", taskId, "comments"), {
    body: comment,
    authorUid,
    authorName,
    ...(mentions && mentions.length > 0 ? { mentions } : {}),
    createdAt: serverTimestamp(),
  });
  // Also update the parent task's updatedAt
  await updateDoc(doc(db, "tasks", taskId), {
    updatedAt: serverTimestamp(),
  });
}

