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
  targetType: string;
  targetId?: string;
  targetName?: string;
  organizationId: string;
  details?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
  /** Raw Firestore Timestamp — use formatAuditTs() to display */
  createdAt?: unknown;
}

// ------------------------------------------------------------------
// Timestamp formatting helper
// ------------------------------------------------------------------
export function formatAuditTs(ts: unknown): string {
  if (!ts) return "—";
  // Firestore Timestamp has .seconds; Date objects have .getTime()
  const seconds =
    (ts as any)?.seconds ??
    (ts instanceof Date ? ts.getTime() / 1000 : 0);
  if (!seconds) return "—";
  const d = new Date(seconds * 1000);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ------------------------------------------------------------------
// Action label mapping
// ------------------------------------------------------------------
export const ACTION_LABELS: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  view_individual: "Viewed eChart",
  create_note: "Created note",
  edit_note: "Edited note",
  apply_ambient: "Applied ambient AI",
  generate_pcp: "Generated care plan",
  send_pcp: "Sent care plan",
  download_pcp: "Downloaded care plan",
  override_compliance: "Override compliance",
  export_data: "Exported data",
  settings_change: "Changed settings",
  user_created: "Created user",
  role_changed: "Changed role",
  user_role_changed: "Changed role",
  user_suspended: "Suspended user",
  user_reactivated: "Reactivated user",
  user_deactivated: "Deactivated user",
  compliance_run: "Ran compliance check",
  engine_published: "Published engine",
  draft_saved: "Saved draft",
  draft_applied: "Applied draft",
  draft_discarded: "Discarded draft",
  care_plan_created: "Created care plan",
  care_plan_updated: "Updated care plan",
  care_plan_completed: "Completed care plan",
  plan_shared: "Shared plan",
  visit_summary_created: "Created visit summary",
  visit_summary_signed: "Signed visit summary",
  monitoring_form_submitted: "Submitted monitoring form",
  monitoring_form_created: "Created monitoring form",
  monitoring_form_saved: "Saved monitoring form",
  incident_created: "Created incident",
  incident_reported: "Reported incident",
  incident_stage_updated: "Updated incident stage",
  referral_created: "Created referral",
  referral_submitted: "Submitted referral",
  plan_saved: "Saved plan",
  plan_submitted: "Submitted plan",
  workflow_task_updated: "Updated workflow task",
  eligibility_verified: "Verified eligibility",
  create_individual: "Created individual",
  update_organization: "Updated organization",
};

// ------------------------------------------------------------------
// Module label mapping (from targetType)
// ------------------------------------------------------------------
export const MODULE_LABELS: Record<string, string> = {
  user: "Auth",
  individual: "People",
  note: "Notes",
  care_plan: "Care Plans",
  compliance_run: "Compliance",
  export: "Export",
  ai_session: "AI",
  visit_summary: "Visit Summaries",
  monitoring_form: "Monitoring",
  incident: "Incidents",
  referral: "Referrals",
  organization: "Settings",
};

// ------------------------------------------------------------------
// Firestore field normaliser
// Handles both the old writer (occurredAt / actorUserId) and any future schema
// ------------------------------------------------------------------
function toEntry(id: string, d: DocumentData): AuditEntry {
  const createdAt = d.createdAt ?? d.occurredAt ?? null;
  return {
    id,
    actorId: d.actorId ?? d.actorUserId ?? "",
    actorName: d.actorName ?? d.actor ?? "System",
    action: d.action ?? "",
    targetType: d.targetType ?? d.module ?? "",
    targetId: d.targetId,
    targetName: d.targetName ?? d.target,
    organizationId: d.organizationId ?? "",
    details: d.details,
    ip: d.sourceIp ?? d.ip ?? (d.metadata?.sourceIp as string | undefined) ?? undefined,
    metadata: d.metadata,
    createdAt,
  };
}

// ------------------------------------------------------------------
// Org-wide audit log (for audit trail screens)
// ------------------------------------------------------------------
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
    }, () => {
      // Fallback: no index yet — pull without orderBy and sort client-side
      const fallback = query(
        collection(db, "audit_log"),
        where("organizationId", "==", userProfile.organizationId),
        limit(maxEntries),
      );
      onSnapshot(fallback, (snap) => {
        const sorted = snap.docs
          .map((d) => toEntry(d.id, d.data()))
          .sort((a, b) => {
            const ta = (a.createdAt as any)?.seconds ?? 0;
            const tb = (b.createdAt as any)?.seconds ?? 0;
            return tb - ta;
          });
        setEntries(sorted);
        setLoading(false);
      }, () => {
        // Both queries failed — stop loading
        setLoading(false);
      });
    });

    return unsub;
  }, [userProfile?.organizationId, maxEntries]);

  return { entries, loading };
}

// ------------------------------------------------------------------
// Per-user audit log — filtered to a specific user's actions
// ------------------------------------------------------------------
export function useUserAuditLog(actorUid: string, maxEntries = 500) {
  const { userProfile } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!actorUid || !userProfile?.organizationId) { setLoading(false); return; }

    // Try querying by actorUserId (the field name used by auditService.ts writeAudit)
    const q = query(
      collection(db, "audit_log"),
      where("actorUserId", "==", actorUid),
      orderBy("occurredAt", "desc"),
      limit(maxEntries),
    );

    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => toEntry(d.id, d.data())));
      setLoading(false);
    }, () => {
      // Fallback: try actorId field without orderBy
      const fallback = query(
        collection(db, "audit_log"),
        where("actorUserId", "==", actorUid),
        limit(maxEntries),
      );
      onSnapshot(fallback, (snap) => {
        // Also try actorId in case schema mixed
        const sorted = snap.docs
          .map((d) => toEntry(d.id, d.data()))
          .sort((a, b) => {
            const ta = (a.createdAt as any)?.seconds ?? 0;
            const tb = (b.createdAt as any)?.seconds ?? 0;
            return tb - ta;
          });
        setEntries(sorted);
        setLoading(false);
      }, () => {
        // Both queries failed (e.g. permission-denied in dev) — stop loading so demo rows show
        setLoading(false);
      });
    });

    return unsub;
  }, [actorUid, userProfile?.organizationId, maxEntries]);

  return { entries, loading };
}
