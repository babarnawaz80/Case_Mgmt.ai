import { useState, useEffect } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
  limit, type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetId?: string;
  targetName?: string;
  organizationId: string;
  details?: string;
  createdAt?: unknown;
}

function toEntry(id: string, d: DocumentData): AuditEntry {
  return {
    id,
    actorId: d.actorId ?? "",
    actorName: d.actorName ?? d.actor ?? "System",
    action: d.action ?? "",
    targetId: d.targetId,
    targetName: d.targetName ?? d.target,
    organizationId: d.organizationId ?? "",
    details: d.details,
    createdAt: d.createdAt,
  };
}

export function useAuditLog(maxEntries = 200) {
  const { userProfile } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.organizationId) { setLoading(false); return; }

    const q = query(
      collection(db, "audit_log"),
      where("organizationId", "==", userProfile.organizationId),
      orderBy("createdAt", "desc"),
      limit(maxEntries),
    );

    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => toEntry(d.id, d.data())));
      setLoading(false);
    }, (err) => {
      console.warn("[auditLog]", err.message);
      // Fallback without orderBy (index may not be deployed yet)
      const fallback = query(
        collection(db, "audit_log"),
        where("organizationId", "==", userProfile.organizationId),
        limit(maxEntries),
      );
      onSnapshot(fallback, (snap) => {
        const sorted = snap.docs.map((d) => toEntry(d.id, d.data()))
          .sort((a, b) => {
            const ta = (a.createdAt as any)?.seconds ?? 0;
            const tb = (b.createdAt as any)?.seconds ?? 0;
            return tb - ta;
          });
        setEntries(sorted);
        setLoading(false);
      });
    });

    return unsub;
  }, [userProfile?.organizationId, maxEntries]);

  return { entries, loading };
}
