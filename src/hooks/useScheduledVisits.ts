import { useState, useEffect } from "react";
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp, type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export const VISIT_TYPES = [
  "In-Home Visit",
  "Office Visit",
  "Community Visit",
  "Phone Contact",
  "Virtual Visit",
  "Televisit / Video Call",
  "Wraparound Meeting",
] as const;

export type VisitType = (typeof VISIT_TYPES)[number];

export type VisitStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export const REMINDER_TIMINGS = [
  { value: "1h", label: "1 hour before",  minutes: 60   },
  { value: "2h", label: "2 hours before", minutes: 120  },
  { value: "1d", label: "1 day before",   minutes: 1440 },
  { value: "2d", label: "2 days before",  minutes: 2880 },
] as const;

export type ReminderTiming = "1h" | "2h" | "1d" | "2d";

/** Color coding for visit types (used in calendar blocks) */
export const VISIT_TYPE_COLORS: Record<VisitType, { bg: string; text: string; dot: string }> = {
  "In-Home Visit":       { bg: "bg-blue-100",   text: "text-blue-800",   dot: "bg-blue-500"   },
  "Office Visit":        { bg: "bg-indigo-100",  text: "text-indigo-800", dot: "bg-indigo-500" },
  "Community Visit":     { bg: "bg-violet-100",  text: "text-violet-800", dot: "bg-violet-500" },
  "Phone Contact":       { bg: "bg-green-100",   text: "text-green-800",  dot: "bg-green-500"  },
  "Virtual Visit":          { bg: "bg-cyan-100",    text: "text-cyan-800",   dot: "bg-cyan-500"   },
  "Televisit / Video Call": { bg: "bg-teal-100",    text: "text-teal-800",   dot: "bg-teal-500"   },
  "Wraparound Meeting":     { bg: "bg-amber-100",   text: "text-amber-800",  dot: "bg-amber-500"  },
};

export interface ScheduledVisit {
  id: string;
  organizationId: string;
  individual_id: string;
  individual_name: string;
  visit_type: VisitType;
  visit_date: string;       // YYYY-MM-DD
  start_time: string;       // HH:mm
  end_time: string;         // HH:mm
  location: string;
  assigned_to: string;      // uid
  assigned_to_name: string;
  linked_goal_id?: string;
  linked_goal_text?: string;
  linked_task_id?: string;
  linked_task_title?: string;
  notes?: string;
  reminder: boolean;
  reminder_timing?: ReminderTiming;
  reminder_sent?: boolean;
  status: VisitStatus;
  cancellation_reason?: string;
  created_by: string;
  created_at?: unknown;
  updated_at?: unknown;
  visit_summary_id?: string;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function toVisit(id: string, data: DocumentData): ScheduledVisit {
  return {
    id,
    organizationId:    data.organizationId    ?? "",
    individual_id:     data.individual_id     ?? "",
    individual_name:   data.individual_name   ?? "",
    visit_type:        data.visit_type        ?? "In-Home Visit",
    visit_date:        data.visit_date        ?? "",
    start_time:        data.start_time        ?? "",
    end_time:          data.end_time          ?? "",
    location:          data.location          ?? "",
    assigned_to:       data.assigned_to       ?? "",
    assigned_to_name:  data.assigned_to_name  ?? "",
    linked_goal_id:    data.linked_goal_id,
    linked_goal_text:  data.linked_goal_text,
    linked_task_id:    data.linked_task_id,
    linked_task_title: data.linked_task_title,
    notes:             data.notes,
    reminder:          data.reminder          ?? false,
    reminder_timing:   data.reminder_timing,
    reminder_sent:     data.reminder_sent     ?? false,
    status:            data.status            ?? "scheduled",
    cancellation_reason: data.cancellation_reason,
    created_by:        data.created_by        ?? "",
    created_at:        data.created_at,
    updated_at:        data.updated_at,
    visit_summary_id:  data.visit_summary_id,
  };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** All scheduled visits for the org, optionally filtered by individual */
export function useScheduledVisits(individualId?: string) {
  const { userProfile } = useAuth();
  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.organizationId) { setLoading(false); return; }

    const constraints: Parameters<typeof query>[1][] = [
      where("organizationId", "==", userProfile.organizationId),
    ];
    if (individualId) constraints.push(where("individual_id", "==", individualId));
    constraints.push(orderBy("visit_date", "asc"));

    const q = query(collection(db, "scheduled_visits"), ...constraints);

    const unsub = onSnapshot(q, (snap) => {
      setVisits(snap.docs.map((d) => toVisit(d.id, d.data())));
      setLoading(false);
    }, (err) => {
      console.warn("[scheduled_visits] falling back without orderBy:", err.message);
      // Fallback: no orderBy (avoids index requirement if not yet created)
      const fallbackConstraints: Parameters<typeof query>[1][] = [
        where("organizationId", "==", userProfile.organizationId),
      ];
      if (individualId) fallbackConstraints.push(where("individual_id", "==", individualId));
      const fb = query(collection(db, "scheduled_visits"), ...fallbackConstraints);
      const unsub2 = onSnapshot(fb, (snap) => {
        setVisits(
          snap.docs
            .map((d) => toVisit(d.id, d.data()))
            .sort((a, b) => a.visit_date.localeCompare(b.visit_date))
        );
        setLoading(false);
      });
      return unsub2;
    });

    return unsub;
  }, [userProfile?.organizationId, individualId]);

  return { visits, loading };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createScheduledVisit(
  visit: Omit<ScheduledVisit, "id" | "created_at" | "updated_at">
): Promise<string> {
  const ref = await addDoc(collection(db, "scheduled_visits"), {
    ...visit,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateScheduledVisit(
  id: string,
  updates: Partial<Omit<ScheduledVisit, "id" | "created_at">>
): Promise<void> {
  await updateDoc(doc(db, "scheduled_visits", id), {
    ...updates,
    updated_at: serverTimestamp(),
  });
}
