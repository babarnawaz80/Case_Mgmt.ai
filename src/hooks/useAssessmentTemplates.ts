/**
 * useAssessmentTemplates.ts
 * Firestore-backed hooks for assessment templates.
 * Falls back to mock data from @/data/assessments so the demo always has data.
 */
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  AssessmentTemplate,
  TemplateStatus,
  templates as mockTemplates,
} from "@/data/assessments";

// ─── Types for Firestore-persisted templates ──────────────────────────────────

export interface FirestoreAssessmentTemplate extends AssessmentTemplate {
  orgId?: string;
  tenantId?: string;
  createdBy?: string;
  createdByName?: string;
  created_at?: unknown;
  updated_at?: unknown;
}

// ─── Merge helper — deduplicates by id, Firestore wins over mock ─────────────

function mergeTemplates(
  fsTemplates: FirestoreAssessmentTemplate[],
  filterStatus?: "published" | "draft" | "all"
): FirestoreAssessmentTemplate[] {
  // Start with mocks (as fallback)
  const mocks: FirestoreAssessmentTemplate[] = mockTemplates.map((t) => ({ ...t }));

  // Overwrite or append Firestore templates
  const fsIds = new Set(fsTemplates.map((t) => t.id));
  const mockFiltered = mocks.filter((m) => !fsIds.has(m.id));
  const merged = [...fsTemplates, ...mockFiltered];

  if (!filterStatus || filterStatus === "all") return merged;
  return merged.filter((t) => t.status === filterStatus);
}

// ─── Hook: list of templates for this org ─────────────────────────────────────

export function useAssessmentTemplates(statusFilter?: "published" | "draft" | "all") {
  const { userProfile } = useAuth();
  const [templates, setTemplates] = useState<FirestoreAssessmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.organizationId) {
      // No org yet — use mock data
      setTemplates(mergeTemplates([], statusFilter));
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "assessment_templates"),
      where("orgId", "==", userProfile.organizationId),
      orderBy("updated_at", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const fsTemplates = snap.docs.map(
          (d) => ({ ...d.data(), id: d.id } as FirestoreAssessmentTemplate)
        );
        setTemplates(mergeTemplates(fsTemplates, statusFilter));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn("[assessment_templates] query failed, using mock data:", err.message);
        // Fall back to mock data on error
        setTemplates(mergeTemplates([], statusFilter));
        setLoading(false);
        setError(null); // non-fatal — mock data still works
      }
    );

    return unsub;
  }, [userProfile?.organizationId, statusFilter]);

  return { templates, loading, error };
}

// ─── Hook: single template ────────────────────────────────────────────────────

export function useAssessmentTemplate(templateId: string | undefined) {
  const [template, setTemplate] = useState<FirestoreAssessmentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!templateId || templateId === "new") {
      setLoading(false);
      return;
    }

    // Check mock data first
    const mock = mockTemplates.find((t) => t.id === templateId);

    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "assessment_templates", templateId),
      (snap) => {
        if (snap.exists()) {
          setTemplate({ ...snap.data(), id: snap.id } as FirestoreAssessmentTemplate);
        } else if (mock) {
          setTemplate({ ...mock });
        } else {
          setTemplate(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn("[assessment_template] fetch failed:", err.message);
        if (mock) setTemplate({ ...mock });
        setLoading(false);
        setError(null);
      }
    );

    return unsub;
  }, [templateId]);

  return { template, loading, error };
}

// ─── Helper: remove undefined / function values Firestore can't serialize ─────

function stripUndefined(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([, v]) => v !== undefined && typeof v !== "function")
        .map(([k, v]) => [k, stripUndefined(v)])
    );
  }
  return obj;
}

// ─── Save as draft ────────────────────────────────────────────────────────────

export async function saveAssessmentTemplate(
  template: AssessmentTemplate,
  userProfile: { uid: string; organizationId: string; displayName?: string }
): Promise<string> {
  const rawPayload: Omit<FirestoreAssessmentTemplate, "id"> = {
    ...template,
    status: "draft" as TemplateStatus,
    orgId: userProfile.organizationId,
    tenantId: userProfile.organizationId,
    createdBy: userProfile.uid,
    createdByName: userProfile.displayName ?? "",
    updatedAt: new Date().toLocaleDateString("en-US"),
    updated_at: serverTimestamp(),
  };
  const payload = stripUndefined(rawPayload) as Omit<FirestoreAssessmentTemplate, "id">;

  // If the template has a Firestore-style id (not a mock id), use setDoc
  const isMockId =
    !template.id ||
    template.id.startsWith("tpl-comp") ||
    template.id.startsWith("tpl-annual") ||
    template.id.startsWith("tpl-screening") ||
    template.id.startsWith("tpl-mdda");

  if (template.id && !isMockId) {
    // Update existing Firestore doc
    await setDoc(doc(db, "assessment_templates", template.id), payload, { merge: true });
    return template.id;
  } else {
    // Create new doc
    const ref = await addDoc(collection(db, "assessment_templates"), {
      ...payload,
      created_at: serverTimestamp(),
    });
    return ref.id;
  }
}

// ─── Publish ──────────────────────────────────────────────────────────────────

export async function publishAssessmentTemplate(
  template: AssessmentTemplate,
  userProfile: { uid: string; organizationId: string; displayName?: string }
): Promise<string> {
  const rawPayload: Omit<FirestoreAssessmentTemplate, "id"> = {
    ...template,
    status: "published" as TemplateStatus,
    orgId: userProfile.organizationId,
    tenantId: userProfile.organizationId,
    createdBy: userProfile.uid,
    createdByName: userProfile.displayName ?? "",
    updatedAt: new Date().toLocaleDateString("en-US"),
    updated_at: serverTimestamp(),
  };
  const payload = stripUndefined(rawPayload) as Omit<FirestoreAssessmentTemplate, "id">;

  const isMockId =
    !template.id ||
    template.id.startsWith("tpl-comp") ||
    template.id.startsWith("tpl-annual") ||
    template.id.startsWith("tpl-screening") ||
    template.id.startsWith("tpl-mdda");

  if (template.id && !isMockId) {
    await setDoc(doc(db, "assessment_templates", template.id), payload, { merge: true });
    return template.id;
  } else {
    const ref = await addDoc(collection(db, "assessment_templates"), {
      ...payload,
      created_at: serverTimestamp(),
    });
    return ref.id;
  }
}

// ─── One-shot fetch (no subscription) ────────────────────────────────────────

export async function fetchAssessmentTemplate(
  templateId: string
): Promise<FirestoreAssessmentTemplate | null> {
  try {
    const snap = await getDoc(doc(db, "assessment_templates", templateId));
    if (snap.exists()) {
      return { ...snap.data(), id: snap.id } as FirestoreAssessmentTemplate;
    }
  } catch {
    // Firestore unavailable
  }
  // Fall back to mock
  const mock = mockTemplates.find((t) => t.id === templateId);
  return mock ? { ...mock } : null;
}
