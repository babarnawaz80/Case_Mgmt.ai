import { useState, useEffect } from "react";
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp, type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export type IncidentSeverity = "critical" | "major" | "minor" | "informational";
export type IncidentStatus = "open" | "in_review" | "closed" | "void";

export interface Incident {
  id: string;
  individualId: string;
  organizationId: string;
  type: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  reportedAt: string; // ISO date
  reportedBy: string;
  reportedByName?: string;
  closedAt?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function toIncident(id: string, data: DocumentData): Incident {
  return {
    id,
    individualId: data.individualId ?? "",
    organizationId: data.organizationId ?? "",
    type: data.type ?? "Other",
    severity: data.severity ?? "minor",
    status: data.status ?? "open",
    description: data.description ?? "",
    reportedAt: data.reportedAt ?? "",
    reportedBy: data.reportedBy ?? "",
    reportedByName: data.reportedByName,
    closedAt: data.closedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// ── Incidents for a single individual ────────────────────────────────────────
export function useIndividualIncidents(individualId: string | undefined) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!individualId) { setLoading(false); return; }
    setLoading(true);

    const q = query(
      collection(db, "incidents"),
      where("individualId", "==", individualId),
      orderBy("reportedAt", "desc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      setIncidents(snap.docs.map(d => toIncident(d.id, d.data())));
      setLoading(false);
      setError(null);
    }, (err) => {
      console.warn("Individual incidents query error:", err.message);
      const fallback = query(
        collection(db, "incidents"),
        where("individualId", "==", individualId),
      );
      onSnapshot(fallback, (snap) => {
        setIncidents(snap.docs.map(d => toIncident(d.id, d.data()))
          .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt)));
        setLoading(false);
      });
      setError(null);
    });

    return unsub;
  }, [individualId]);

  return { incidents, loading, error };
}

// ── All incidents for the organization ───────────────────────────────────────
export function useAllIncidents() {
  const { userProfile } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.organizationId) return;
    setLoading(true);

    const orgId = userProfile.organizationId;
    const q = query(
      collection(db, "incidents"),
      where("organizationId", "==", orgId),
      orderBy("reportedAt", "desc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      setIncidents(snap.docs.map(d => toIncident(d.id, d.data())));
      setLoading(false);
      setError(null);
    }, (err) => {
      console.warn("All incidents query error:", err.message);
      const fallback = query(
        collection(db, "incidents"),
        where("organizationId", "==", orgId),
      );
      onSnapshot(fallback, (snap) => {
        setIncidents(snap.docs.map(d => toIncident(d.id, d.data()))
          .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt)));
        setLoading(false);
      });
      setError(null);
    });

    return unsub;
  }, [userProfile?.organizationId]);

  return { incidents, loading, error };
}

// ── Summary hook for Dashboard ────────────────────────────────────────────────
export function useIncidentSummary() {
  const { incidents, loading } = useAllIncidents();

  const summary = {
    totalOpen: 0,
    overdue: 0,
    inReview: 0,
    critical: 0,
    closedThisMonth: 0,
  };

  if (!loading) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    summary.totalOpen = incidents.filter(i =>
      i.status === "open" || i.status === "in_review"
    ).length;

    summary.inReview = incidents.filter(i => i.status === "in_review").length;

    summary.critical = incidents.filter(i =>
      (i.status === "open" || i.status === "in_review") &&
      (i.severity === "critical" || i.severity === "major")
    ).length;

    summary.overdue = incidents.filter(i => {
      if (i.status !== "open" && i.status !== "in_review") return false;
      const reported = new Date(i.reportedAt);
      return reported < sevenDaysAgo;
    }).length;

    summary.closedThisMonth = incidents.filter(i => {
      if (i.status !== "closed") return false;
      if (!i.closedAt) return false;
      const closed = new Date(i.closedAt);
      return closed >= thisMonthStart;
    }).length;
  }

  return { ...summary, loading };
}

// ── Create an incident ────────────────────────────────────────────────────────
export async function createIncident(
  incident: Omit<Incident, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "incidents"), {
    ...incident,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// ── Update an incident ────────────────────────────────────────────────────────
export async function updateIncident(
  id: string,
  fields: Partial<Omit<Incident, "id">>
): Promise<void> {
  await updateDoc(doc(db, "incidents", id), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export const INCIDENT_TYPES = [
  "Behavioral Incident",
  "Medical Emergency",
  "Fall / Injury",
  "Medication Error",
  "Property Damage",
  "Abuse / Neglect",
  "Missing Person",
  "Community Safety",
  "Environmental Hazard",
  "Other",
] as const;

export const INCIDENT_SEVERITIES = [
  { value: "critical" as const, label: "Critical", color: "text-icm-red" },
  { value: "major" as const, label: "Major", color: "text-orange-600" },
  { value: "minor" as const, label: "Minor", color: "text-icm-amber" },
  { value: "informational" as const, label: "Informational", color: "text-icm-text-dim" },
];
