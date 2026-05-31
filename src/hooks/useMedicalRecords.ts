import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface Diagnosis {
  id: string;
  icd10_code: string;
  icd10_description: string;
  diagnosis_type: "primary" | "secondary" | "historical";
  onset_date: string | null;
  diagnosed_by: string;
  notes: string;
  is_active: boolean;
  created_at?: unknown;
  created_by?: string;
  updated_at?: unknown;
  updated_by?: string;
}

export interface Medication {
  id: string;
  medication_name: string;
  brand_name: string;
  dosage: string;
  frequency: string;
  route: string;
  prescribing_provider: string;
  start_date: string | null;
  end_date: string | null;
  indication: string;
  notes: string;
  is_active: boolean;
  created_at?: unknown;
  created_by?: string;
  updated_at?: unknown;
  updated_by?: string;
}

export interface Allergy {
  id: string;
  allergen: string;
  allergen_type: "medication" | "food" | "environmental" | "other";
  reaction: string;
  severity: "mild" | "moderate" | "severe" | "life-threatening";
  onset_date: string | null;
  notes: string;
  is_active: boolean;
  created_at?: unknown;
  created_by?: string;
  updated_at?: unknown;
  updated_by?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useDiagnoses(individualId: string | undefined): {
  diagnoses: Diagnosis[];
  loading: boolean;
} {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!individualId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "individuals", individualId, "diagnoses"),
      where("is_active", "==", true),
      orderBy("created_at", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDiagnoses(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Diagnosis, "id">) }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [individualId]);

  return { diagnoses, loading };
}

export function useMedications(individualId: string | undefined): {
  medications: Medication[];
  loading: boolean;
} {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!individualId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "individuals", individualId, "medications"),
      where("is_active", "==", true),
      orderBy("created_at", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMedications(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Medication, "id">) }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [individualId]);

  return { medications, loading };
}

export function useAllergies(individualId: string | undefined): {
  allergies: Allergy[];
  loading: boolean;
} {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!individualId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "individuals", individualId, "allergies"),
      where("is_active", "==", true),
      orderBy("created_at", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAllergies(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Allergy, "id">) }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [individualId]);

  return { allergies, loading };
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD — Diagnoses
// ─────────────────────────────────────────────────────────────────────────────

export async function addDiagnosis(
  individualId: string,
  data: Omit<Diagnosis, "id" | "created_at" | "updated_at">,
  userEmail: string
): Promise<string> {
  const ref = await addDoc(
    collection(db, "individuals", individualId, "diagnoses"),
    {
      ...data,
      is_active: true,
      created_at: serverTimestamp(),
      created_by: userEmail,
      updated_at: serverTimestamp(),
      updated_by: userEmail,
    }
  );
  return ref.id;
}

export async function updateDiagnosis(
  individualId: string,
  diagnosisId: string,
  data: Partial<Diagnosis>,
  userEmail: string
): Promise<void> {
  await updateDoc(doc(db, "individuals", individualId, "diagnoses", diagnosisId), {
    ...data,
    updated_at: serverTimestamp(),
    updated_by: userEmail,
  });
}

export async function softDeleteDiagnosis(
  individualId: string,
  diagnosisId: string,
  userEmail: string
): Promise<void> {
  await updateDoc(doc(db, "individuals", individualId, "diagnoses", diagnosisId), {
    is_active: false,
    updated_at: serverTimestamp(),
    updated_by: userEmail,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD — Medications
// ─────────────────────────────────────────────────────────────────────────────

export async function addMedication(
  individualId: string,
  data: Omit<Medication, "id" | "created_at" | "updated_at">,
  userEmail: string
): Promise<string> {
  const ref = await addDoc(
    collection(db, "individuals", individualId, "medications"),
    {
      ...data,
      is_active: true,
      created_at: serverTimestamp(),
      created_by: userEmail,
      updated_at: serverTimestamp(),
      updated_by: userEmail,
    }
  );
  return ref.id;
}

export async function updateMedication(
  individualId: string,
  medicationId: string,
  data: Partial<Medication>,
  userEmail: string
): Promise<void> {
  await updateDoc(doc(db, "individuals", individualId, "medications", medicationId), {
    ...data,
    updated_at: serverTimestamp(),
    updated_by: userEmail,
  });
}

export async function softDeleteMedication(
  individualId: string,
  medicationId: string,
  userEmail: string
): Promise<void> {
  await updateDoc(doc(db, "individuals", individualId, "medications", medicationId), {
    is_active: false,
    updated_at: serverTimestamp(),
    updated_by: userEmail,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD — Allergies
// ─────────────────────────────────────────────────────────────────────────────

export async function addAllergy(
  individualId: string,
  data: Omit<Allergy, "id" | "created_at" | "updated_at">,
  userEmail: string
): Promise<string> {
  const ref = await addDoc(
    collection(db, "individuals", individualId, "allergies"),
    {
      ...data,
      is_active: true,
      created_at: serverTimestamp(),
      created_by: userEmail,
      updated_at: serverTimestamp(),
      updated_by: userEmail,
    }
  );
  return ref.id;
}

export async function updateAllergy(
  individualId: string,
  allergyId: string,
  data: Partial<Allergy>,
  userEmail: string
): Promise<void> {
  await updateDoc(doc(db, "individuals", individualId, "allergies", allergyId), {
    ...data,
    updated_at: serverTimestamp(),
    updated_by: userEmail,
  });
}

export async function softDeleteAllergy(
  individualId: string,
  allergyId: string,
  userEmail: string
): Promise<void> {
  await updateDoc(doc(db, "individuals", individualId, "allergies", allergyId), {
    is_active: false,
    updated_at: serverTimestamp(),
    updated_by: userEmail,
  });
}
