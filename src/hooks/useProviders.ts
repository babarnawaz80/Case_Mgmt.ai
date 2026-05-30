/**
 * useProviders.ts
 * Firestore hooks for the Provider Directory feature.
 * Collections:
 *   - providers/{id}          — org-level provider database
 *   - individual_providers/{id} — per-individual provider links
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
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Provider {
  id: string;
  name: string;
  type: string;
  npiNumber?: string;
  taxId?: string;
  medicaidProviderNumber?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  email?: string;
  contactPersonName?: string;
  contactPersonTitle?: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;
  servicesOffered: string[];
  geographicCoverage: string[];
  statesCovered: string[];
  populationsServed: string[];
  ageMin?: number | null;
  ageMax?: number | null;
  languages: string[];
  isAcceptingClients: "yes" | "no" | "waitlist";
  currentOpenings?: number | null;
  typicalStartTime?: string;
  waitlistEstimate?: string;
  medicaidContracted: boolean;
  contractStatus: "active" | "expired" | "pending" | "none";
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  acceptedFundingSources: string[];
  rateNotes?: string;
  internalNotes?: string;
  documentUrls?: string[];
  tenantId?: string;
  orgId?: string;
  status: "active" | "archived" | "pending_review";
  addedBy?: string;
  addedAt?: unknown;
  updatedAt?: unknown;
  referralCount?: number;
  currentIndividualCount?: number;
}

export interface IndividualProvider {
  id: string;
  individualId: string;
  providerId: string;
  providerName: string;
  providerType: string;
  serviceProvided: string;
  authorizationId?: string | null;
  authorizationNumber?: string | null;
  startDate: string;
  endDate?: string | null;
  contactPersonOverride?: string;
  contactPhoneOverride?: string;
  contactEmailOverride?: string;
  notes?: string;
  status: "active" | "ended" | "pending";
  endReason?: string | null;
  tenantId?: string;
  addedBy?: string;
  addedAt?: unknown;
  updatedAt?: unknown;
}

// ─── Provider hooks ────────────────────────────────────────────────────────────

/**
 * Real-time list of providers. Fetches records where orgId matches OR
 * where orgId field is absent (seeded/global records).
 */
export function useProviders(orgId?: string) {
  const [data, setData] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubs: Array<() => void> = [];

    let settled = false;
    let orgProviders: Provider[] = [];
    let seedProviders: Provider[] = [];

    function merge() {
      // De-duplicate by id, org-specific records win
      const map = new Map<string, Provider>();
      seedProviders.forEach((p) => map.set(p.id, p));
      orgProviders.forEach((p) => map.set(p.id, p));
      setData(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
      if (!settled) {
        setLoading(false);
        settled = true;
      }
    }

    // Query 1: org-specific providers
    if (orgId) {
      const orgQ = query(
        collection(db, "providers"),
        where("orgId", "==", orgId),
        orderBy("name", "asc")
      );
      const u1 = onSnapshot(
        orgQ,
        (snap) => {
          orgProviders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Provider));
          merge();
        },
        (err) => {
          // Fallback without ordering
          const fallQ = query(collection(db, "providers"), where("orgId", "==", orgId));
          const u1f = onSnapshot(fallQ, (snap) => {
            orgProviders = snap.docs
              .map((d) => ({ id: d.id, ...d.data() } as Provider))
              .sort((a, b) => a.name.localeCompare(b.name));
            merge();
          }, (err2) => {
            console.error("[providers/org]", err2.message);
            setError(err2.message);
            if (!settled) { setLoading(false); settled = true; }
          });
          unsubs.push(u1f);
          console.warn("[providers/org] ordered fallback:", err.message);
        }
      );
      unsubs.push(u1);
    } else {
      merge();
    }

    // Query 2: global/seeded providers (no orgId field)
    // Firestore doesn't support "field doesn't exist" queries, so we fetch
    // all docs without orgId filter and client-filter. For small directories
    // this is acceptable. Production should use a dedicated "global=true" flag.
    const globalQ = query(
      collection(db, "providers"),
      orderBy("name", "asc")
    );
    const u2 = onSnapshot(
      globalQ,
      (snap) => {
        seedProviders = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Provider))
          .filter((p) => !p.orgId || p.orgId === orgId);
        merge();
      },
      (err) => {
        console.warn("[providers/global]", err.message);
        // Non-fatal — org providers are the primary source
        if (!settled) { setLoading(false); settled = true; }
      }
    );
    unsubs.push(u2);

    return () => { unsubs.forEach((fn) => fn()); };
  }, [orgId]);

  return { data, loading, error };
}

/** Real-time single provider by ID. */
export function useProvider(providerId: string | undefined) {
  const [data, setData] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!providerId) { setLoading(false); return; }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "providers", providerId),
      (snap) => {
        setData(snap.exists() ? ({ id: snap.id, ...snap.data() } as Provider) : null);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[provider]", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [providerId]);

  return { data, loading, error };
}

/** Real-time list of individual_providers for one individual. */
export function useIndividualProviders(individualId: string | undefined) {
  const [data, setData] = useState<IndividualProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!individualId) { setLoading(false); return; }
    setLoading(true);
    const unsubs: Array<() => void> = [];

    const primaryQ = query(
      collection(db, "individual_providers"),
      where("individualId", "==", individualId),
      orderBy("startDate", "desc")
    );
    const u = onSnapshot(
      primaryQ,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as IndividualProvider)));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn("[individual_providers] ordered fallback:", err.message);
        const fallQ = query(
          collection(db, "individual_providers"),
          where("individualId", "==", individualId)
        );
        const u2 = onSnapshot(
          fallQ,
          (snap) => {
            setData(
              snap.docs
                .map((d) => ({ id: d.id, ...d.data() } as IndividualProvider))
                .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))
            );
            setLoading(false);
            setError(null);
          },
          (err2) => {
            console.error("[individual_providers]", err2.message);
            setError(err2.message);
            setLoading(false);
          }
        );
        unsubs.push(u2);
      }
    );
    unsubs.push(u);

    return () => { unsubs.forEach((fn) => fn()); };
  }, [individualId]);

  return { data, loading, error };
}

// ─── Write helpers ──────────────────────────────────────────────────────────────

/**
 * Firestore rejects `undefined` values. Replace every undefined with null
 * before writing so we never get "Unsupported field value: undefined".
 */
function sanitize<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = v === undefined ? null : v;
  }
  return out as T;
}

export async function addProvider(
  data: Omit<Provider, "id" | "addedAt" | "updatedAt">
) {
  return addDoc(collection(db, "providers"), {
    ...sanitize(data as any),
    addedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProvider(id: string, data: Partial<Provider>) {
  return updateDoc(doc(db, "providers", id), {
    ...sanitize(data as any),
    updatedAt: serverTimestamp(),
  });
}

export async function addIndividualProvider(
  data: Omit<IndividualProvider, "id" | "addedAt" | "updatedAt">
) {
  return addDoc(collection(db, "individual_providers"), {
    ...sanitize(data as any),
    addedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateIndividualProvider(
  id: string,
  data: Partial<IndividualProvider>
) {
  return updateDoc(doc(db, "individual_providers", id), {
    ...sanitize(data as any),
    updatedAt: serverTimestamp(),
  });
}
