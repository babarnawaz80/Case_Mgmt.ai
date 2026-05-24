import { useState, useEffect, useCallback } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
  type DocumentData, getDocs, limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export type NotifType = "alert" | "mention" | "task" | "info";
export type NotifSeverity = "info" | "warning" | "critical";

export interface FirestoreNotification {
  id: string;
  uid: string;
  organizationId: string;
  type: NotifType;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  dismissed: boolean;
  severity: NotifSeverity;
  createdAt?: unknown;
}

function toNotif(id: string, data: DocumentData): FirestoreNotification {
  return {
    id,
    uid: data.uid ?? "",
    organizationId: data.organizationId ?? "",
    type: data.type ?? "info",
    title: data.title ?? "",
    body: data.body ?? "",
    href: data.href,
    read: data.read ?? false,
    dismissed: data.dismissed ?? false,
    severity: data.severity ?? "info",
    createdAt: data.createdAt,
  };
}

export function useFirestoreNotifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<FirestoreNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) { setLoading(false); return; }
    setLoading(true);

    const q = query(
      collection(db, "notifications"),
      where("uid", "==", currentUser.uid),
      where("dismissed", "==", false),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifications(snap.docs.map((d) => toNotif(d.id, d.data())));
        setLoading(false);
      },
      (err) => {
        // Collection may not exist yet — silently return empty
        console.warn("[notifications]", err.message);
        setNotifications([]);
        setLoading(false);
      }
    );

    return unsub;
  }, [currentUser?.uid]);

  const markRead = useCallback(async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  }, []);

  const markAllRead = useCallback(async () => {
    await Promise.all(
      notifications.filter((n) => !n.read).map((n) =>
        updateDoc(doc(db, "notifications", n.id), { read: true })
      )
    );
  }, [notifications]);

  const dismiss = useCallback(async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { dismissed: true });
  }, []);

  const unreadCount = notifications.filter((n) => !n.read && !n.dismissed).length;

  return { notifications, unreadCount, markRead, markAllRead, dismiss, loading };
}

export async function createNotification(
  notif: Omit<FirestoreNotification, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "notifications"), {
    ...notif,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Seeds 3 demo notifications for a new user if they have none.
 * Call this after login if the user has 0 notifications.
 */
export async function seedNotificationsForUser(
  uid: string,
  organizationId: string
): Promise<void> {
  const existing = await getDocs(
    query(collection(db, "notifications"), where("uid", "==", uid), limit(1))
  );
  if (!existing.empty) return; // already seeded

  const demos: Omit<FirestoreNotification, "id" | "createdAt">[] = [
    {
      uid,
      organizationId,
      type: "alert",
      title: "Progress note pending signature",
      body: "You have 1 progress note awaiting your signature. Please review and sign.",
      href: "/my-work",
      read: false,
      dismissed: false,
      severity: "warning",
    },
    {
      uid,
      organizationId,
      type: "task",
      title: "Plan renewal due in 14 days",
      body: "Individual care plans due for renewal — review and update by the end of the month.",
      href: "/my-work",
      read: false,
      dismissed: false,
      severity: "info",
    },
    {
      uid,
      organizationId,
      type: "mention",
      title: "Supervisor left a comment",
      body: "Your supervisor reviewed the progress note and left feedback. Click to view.",
      href: "/messages",
      read: false,
      dismissed: false,
      severity: "info",
    },
  ];

  await Promise.all(demos.map((d) => createNotification(d)));
}
