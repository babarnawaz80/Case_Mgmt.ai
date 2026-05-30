import { useState, useEffect } from "react";
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp, type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export type NoteStatus = "draft" | "pending_signature" | "signed" | "void";

export interface ProgressNote {
  id: string;
  individualId: string;
  organizationId: string;
  authorId: string;
  authorName: string;
  // Clinical fields
  activityType: string;
  contactType: string;
  progressDate: string;   // "YYYY-MM-DD"
  startTime: string;
  endTime: string;
  isBillable: boolean;
  purposeOfActivity: string;
  goalsProgress: GoalProgress[];
  additionalObservations: string;
  nextSteps: string;
  // Status & audit
  status: NoteStatus;
  aiDrafted: boolean;
  aiDraftedAt?: unknown;
  signedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GoalProgress {
  goalId: string;
  goalText: string;
  progressStatus: "progressing" | "no_change" | "regressing" | "met";
  narrative: string;
}

function toNote(id: string, data: DocumentData): ProgressNote {
  return {
    id,
    individualId: data.individualId ?? "",
    organizationId: data.organizationId ?? "",
    authorId: data.authorId ?? "",
    authorName: data.authorName ?? "",
    activityType: data.activityType ?? "",
    contactType: data.contactType ?? "In-Person",
    progressDate: data.progressDate ?? "",
    startTime: data.startTime ?? "",
    endTime: data.endTime ?? "",
    isBillable: data.isBillable ?? true,
    purposeOfActivity: data.purposeOfActivity ?? "",
    goalsProgress: data.goalsProgress ?? [],
    additionalObservations: data.additionalObservations ?? "",
    nextSteps: data.nextSteps ?? "",
    status: data.status ?? "draft",
    aiDrafted: data.aiDrafted ?? false,
    aiDraftedAt: data.aiDraftedAt,
    signedAt: data.signedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// ── Hook: all notes for a specific individual ─────────────────────────────
export function useProgressNotes(individualId: string | undefined) {
  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!individualId) { setLoading(false); return; }
    setLoading(true);

    const q = query(
      collection(db, "progress_notes"),
      where("individualId", "==", individualId),
      orderBy("progressDate", "desc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map(d => toNote(d.id, d.data())));
      setLoading(false);
      setError(null);
    }, (err) => {
      // If index not ready yet, fall back to unordered
      console.warn("Progress notes query error:", err.message);
      const fallback = query(
        collection(db, "progress_notes"),
        where("individualId", "==", individualId),
      );
      onSnapshot(fallback, (snap) => {
        const sorted = snap.docs.map(d => toNote(d.id, d.data()))
          .sort((a, b) => b.progressDate.localeCompare(a.progressDate));
        setNotes(sorted);
        setLoading(false);
      });
      setError(null);
    });

    return unsub;
  }, [individualId]);

  return { notes, loading, error };
}

// ── Hook: a single progress note ───────────────────────────────────────────
export function useProgressNote(noteId: string | undefined) {
  const [data, setData] = useState<ProgressNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!noteId || noteId === "new") {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "progress_notes", noteId),
      (snap) => {
        if (snap.exists()) {
          setData(toNote(snap.id, snap.data()));
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`[progress_notes]`, err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [noteId]);

  return { data, loading, error };
}


// ── Hook: all notes for the organization (role-based) ──────────────────────
export function useAllProgressNotes() {
  const { userProfile } = useAuth();
  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.organizationId) return;
    setLoading(true);

    const orgId = userProfile.organizationId;
    const role = userProfile.role;

    // Case managers see only notes they authored; supervisors/admins see all
    let q = query(
      collection(db, "progress_notes"),
      where("organizationId", "==", orgId),
      orderBy("progressDate", "desc"),
    );

    if (role === "case_manager") {
      q = query(
        collection(db, "progress_notes"),
        where("organizationId", "==", orgId),
        where("authorId", "==", userProfile.uid),
        orderBy("progressDate", "desc"),
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map(d => toNote(d.id, d.data())));
      setLoading(false);
      setError(null);
    }, (err) => {
      console.warn("All progress notes query error:", err.message);
      // Fallback without ordering
      let fallback = query(
        collection(db, "progress_notes"),
        where("organizationId", "==", orgId),
      );
      if (role === "case_manager") {
        fallback = query(
          collection(db, "progress_notes"),
          where("organizationId", "==", orgId),
          where("authorId", "==", userProfile.uid),
        );
      }
      onSnapshot(fallback, (snap) => {
        const sorted = snap.docs.map(d => toNote(d.id, d.data()))
          .sort((a, b) => b.progressDate.localeCompare(a.progressDate));
        setNotes(sorted);
        setLoading(false);
      });
      setError(null);
    });

    return unsub;
  }, [userProfile?.organizationId, userProfile?.role, userProfile?.uid]);

  return { notes, loading, error };
}

// ── Save a new draft note ─────────────────────────────────────────────────
export async function saveProgressNote(
  note: Omit<ProgressNote, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "progress_notes"), {
    ...note,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// ── Update an existing note ───────────────────────────────────────────────
export async function updateProgressNote(
  id: string,
  fields: Partial<Omit<ProgressNote, "id">>
): Promise<void> {
  await updateDoc(doc(db, "progress_notes", id), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

// ── AI prefill via Cloud Function ─────────────────────────────────────────
export interface AIPrefillResult {
  purposeOfActivity: string;
  additionalObservations: string;
  nextSteps: string;
  activityType: string;
  isBillable: boolean;
}

export async function fetchAIPrefill(params: {
  individualName: string;
  diagnosis: string;
  lastVisitDate?: string;
  riskScore?: number;
  county?: string;
}): Promise<AIPrefillResult> {
  try {
    const res = await fetch("/api/prefill-progress-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } catch {
    // Graceful fallback — return useful placeholder text
    return {
      activityType: "Case Management",
      isBillable: true,
      purposeOfActivity: `Conducted case management contact with ${params.individualName} to review current status, assess needs, and coordinate services. Discussed progress toward individualized support plan goals and identified any barriers to goal achievement.`,
      additionalObservations: `${params.individualName} presented with ${params.diagnosis ? `a diagnosis of ${params.diagnosis}` : "their current support needs"}. Risk score is ${params.riskScore ?? "not assessed"}.`,
      nextSteps: "Schedule follow-up contact within 30 days. Review ISP goals at next scheduled visit. Coordinate with service providers as needed.",
    };
  }
}

export const ACTIVITY_TYPES = [
  "Case Management",
  "Community Integration",
  "Assessment",
  "Care Plan Review",
  "Crisis Intervention",
  "Family/Guardian Meeting",
  "Provider Coordination",
  "Training",
  "Transportation",
  "Other",
] as const;

export const CONTACT_TYPES = [
  "In-Person",
  "Telephone",
  "Telehealth",
  "Televisit / Video Call",
  "Email",
  "Home Visit",
  "Community Visit",
] as const;

export function statusLabel(status: NoteStatus): string {
  switch (status) {
    case "draft": return "Draft";
    case "pending_signature": return "Pending Signature";
    case "signed": return "Signed";
    case "void": return "Void";
  }
}
