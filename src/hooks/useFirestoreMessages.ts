/**
 * useFirestoreMessages.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time Firestore messaging system for CaseManagement.AI.
 *
 * Data model
 * ──────────
 * conversations/{id}
 *   members          string[]
 *   memberNames      Record<uid, string>
 *   type             'direct' | 'group'
 *   name?            string
 *   lastMessage      string
 *   lastMessageAt    Timestamp
 *   lastMessageBy    string
 *   unreadCounts     Record<uid, number>
 *   organizationId   string
 *   createdAt        Timestamp
 *   createdBy        string
 *
 * conversations/{id}/messages/{id}
 *   body             string
 *   senderId         string
 *   senderName       string
 *   senderAvatar?    string
 *   type             'text' | 'system'
 *   createdAt        Timestamp
 *   read             boolean
 *   readBy           string[]
 */

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface FSConversation {
  id: string;
  members: string[];
  memberNames: Record<string, string>;
  type: "direct" | "group";
  name?: string;
  lastMessage: string;
  lastMessageAt?: unknown;
  lastMessageBy?: string;
  unreadCounts: Record<string, number>;
  memberReadAt?: Record<string, unknown>;
  organizationId: string;
  createdAt?: unknown;
  createdBy: string;
  archivedBy?: Record<string, boolean>;
  deletedBy?: Record<string, boolean>;
  mutedBy?: Record<string, boolean>;
  pinnedBy?: Record<string, boolean>;
}

export interface FSLinkedRecord {
  moduleIcon: string;
  moduleLabel: string;
  individualName: string;
  detail: string;
  href: string;
}

export interface FSFileAttachment {
  fileName: string;
  fileSize: number;
  fileUrl: string;
  mimeType: string;
}

export interface FSMessage {
  id: string;
  conversationId: string;
  body: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: "text" | "system";
  createdAt?: unknown;
  readBy: string[];
  deleted?: boolean;
  linkedRecord?: FSLinkedRecord;
  attachment?: FSFileAttachment;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toConversation(id: string, data: DocumentData): FSConversation {
  return {
    id,
    members: data.members ?? [],
    memberNames: data.memberNames ?? {},
    type: data.type ?? "direct",
    name: data.name,
    lastMessage: data.lastMessage ?? "",
    lastMessageAt: data.lastMessageAt,
    lastMessageBy: data.lastMessageBy,
    unreadCounts: data.unreadCounts ?? {},
    memberReadAt: data.memberReadAt ?? {},
    organizationId: data.organizationId ?? "",
    createdAt: data.createdAt,
    createdBy: data.createdBy ?? "",
    archivedBy: data.archivedBy ?? {},
    deletedBy: data.deletedBy ?? {},
    mutedBy: data.mutedBy ?? {},
    pinnedBy: data.pinnedBy ?? {},
  };
}

function toMessage(id: string, conversationId: string, data: DocumentData): FSMessage {
  return {
    id,
    conversationId,
    body: data.body ?? "",
    senderId: data.senderId ?? "",
    senderName: data.senderName ?? "",
    senderAvatar: data.senderAvatar,
    type: data.type ?? "text",
    createdAt: data.createdAt,
    readBy: data.readBy ?? [],
    deleted: data.deleted ?? false,
    linkedRecord: data.linkedRecord ?? undefined,
    attachment: data.attachment ?? undefined,
  };
}

// ─── useFirestoreConversations ────────────────────────────────────────────────
/**
 * Returns all conversations for the current user within their organization,
 * ordered by lastMessageAt DESC. Also computes totalUnread.
 */
export function useFirestoreConversations(): {
  conversations: FSConversation[];
  loading: boolean;
  totalUnread: number;
} {
  const { currentUser, profile } = useAuth();
  const [conversations, setConversations] = useState<FSConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = currentUser?.uid;
    const orgId = profile?.organizationId;

    if (!uid || !orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Firestore supports array-contains + equality filter together,
    // but NOT array-contains + orderBy on different fields without a composite
    // index. We order client-side to avoid requiring array-contains+orderBy
    // composite, relying only on organizationId + lastMessageAt index.
    const q = query(
      collection(db, "conversations"),
      where("members", "array-contains", uid),
      where("organizationId", "==", orgId),
      orderBy("lastMessageAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setConversations(snap.docs.map((d) => toConversation(d.id, d.data())));
        setLoading(false);
      },
      (err) => {
        console.warn("[useFirestoreConversations]", err.message);
        setConversations([]);
        setLoading(false);
      }
    );

    return unsub;
  }, [currentUser?.uid, profile?.organizationId]);

  const uid = currentUser?.uid ?? "";
  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unreadCounts[uid] ?? 0),
    0
  );

  return { conversations, loading, totalUnread };
}

// ─── useConversationMessages ──────────────────────────────────────────────────
/**
 * Listens to the messages sub-collection for a given conversation,
 * ordered by createdAt ASC, limited to 100 most recent.
 */
export function useConversationMessages(conversationId: string | null): {
  messages: FSMessage[];
  loading: boolean;
} {
  const [messages, setMessages] = useState<FSMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(
          snap.docs.map((d) => toMessage(d.id, conversationId, d.data()))
        );
        setLoading(false);
      },
      (err) => {
        console.warn("[useConversationMessages]", err.message);
        setMessages([]);
        setLoading(false);
      }
    );

    return unsub;
  }, [conversationId]);

  return { messages, loading };
}

// ─── sendFSMessage ────────────────────────────────────────────────────────────
/**
 * Adds a message to conversations/{id}/messages and updates the conversation
 * document (lastMessage, lastMessageAt, lastMessageBy) and increments
 * unreadCounts for all members except the sender.
 */
export async function sendFSMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  body: string,
  senderAvatar?: string | null,
  linkedRecord?: FSLinkedRecord | null,
  attachment?: FSFileAttachment | null
): Promise<void> {
  try {
    // 1. Build the message payload — only include optional fields when set
    const msgPayload: Record<string, unknown> = {
      body,
      senderId,
      senderName,
      senderAvatar: senderAvatar ?? null,
      type: "text",
      createdAt: serverTimestamp(),
      read: false,
      readBy: [senderId], // sender has already "read" their own message
    };
    if (linkedRecord) msgPayload.linkedRecord = linkedRecord;
    if (attachment)   msgPayload.attachment   = attachment;

    // 1. Add the message document
    await addDoc(
      collection(db, "conversations", conversationId, "messages"),
      msgPayload
    );

    // 2. Fetch current conversation to get the members list
    const convSnap = await getDocs(
      query(
        collection(db, "conversations"),
        where("__name__", "==", conversationId)
      )
    );

    // Build unreadCounts increment map for all members except sender
    const unreadIncrements: Record<string, ReturnType<typeof increment>> = {};

    if (!convSnap.empty) {
      const members: string[] = convSnap.docs[0].data().members ?? [];
      for (const uid of members) {
        if (uid !== senderId) {
          unreadIncrements[`unreadCounts.${uid}`] = increment(1);
        }
      }
    }

    // 3. Compute a human-readable preview for the conversation list
    let preview = body;
    if (!preview && linkedRecord) preview = `📎 ${linkedRecord.moduleLabel} — ${linkedRecord.individualName}`;
    if (!preview && attachment)   preview = `📎 ${attachment.fileName}`;
    if (!preview) preview = "Sent a message";

    // 4. Update the conversation meta
    await updateDoc(doc(db, "conversations", conversationId), {
      lastMessage: preview.length > 120 ? preview.slice(0, 120) + "…" : preview,
      lastMessageAt: serverTimestamp(),
      lastMessageBy: senderId,
      ...unreadIncrements,
    });
  } catch (err) {
    console.warn("[sendFSMessage]", err);
  }
}

// ─── markConversationRead ─────────────────────────────────────────────────────
/**
 * Resets unreadCounts.{uid} to 0 for the given conversation.
 */
export async function markConversationRead(
  conversationId: string,
  uid: string
): Promise<void> {
  try {
    await updateDoc(doc(db, "conversations", conversationId), {
      [`unreadCounts.${uid}`]: 0,
    });
  } catch (err) {
    console.warn("[markConversationRead]", err);
  }
}

// ─── markConversationReadAt ───────────────────────────────────────────────────
/**
 * Updates memberReadAt.{uid} with a server timestamp and resets unreadCounts.{uid} to 0.
 */
export async function markConversationReadAt(
  conversationId: string,
  uid: string
): Promise<void> {
  try {
    await updateDoc(doc(db, "conversations", conversationId), {
      [`memberReadAt.${uid}`]: serverTimestamp(),
      [`unreadCounts.${uid}`]: 0,
    });
  } catch (err) {
    console.warn("[markConversationReadAt]", err);
  }
}

// ─── createOrGetDirectConversation ────────────────────────────────────────────
/**
 * Idempotent — returns an existing direct conversation between uid1 and uid2,
 * or creates a new one. Returns the conversation ID.
 */
export async function createOrGetDirectConversation(
  uid1: string,
  name1: string,
  uid2: string,
  name2: string,
  organizationId: string
): Promise<string> {
  try {
    // Query all direct conversations that contain uid1
    const q = query(
      collection(db, "conversations"),
      where("members", "array-contains", uid1),
      where("type", "==", "direct"),
      where("organizationId", "==", organizationId)
    );

    const snap = await getDocs(q);

    // Client-side filter: exactly 2 members, and uid2 must be one of them
    const existing = snap.docs.find((d) => {
      const members: string[] = d.data().members ?? [];
      return members.length === 2 && members.includes(uid2);
    });

    if (existing) return existing.id;

    // Create a new direct conversation
    const ref = await addDoc(collection(db, "conversations"), {
      members: [uid1, uid2],
      memberNames: { [uid1]: name1, [uid2]: name2 },
      type: "direct",
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      lastMessageBy: uid1,
      unreadCounts: { [uid1]: 0, [uid2]: 0 },
      organizationId,
      createdAt: serverTimestamp(),
      createdBy: uid1,
    });

    return ref.id;
  } catch (err) {
    console.warn("[createOrGetDirectConversation]", err);
    throw err;
  }
}

// ─── archiveConversation ──────────────────────────────────────────────────────
export async function archiveConversation(conversationId: string, uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, "conversations", conversationId), {
      [`archivedBy.${uid}`]: true,
    });
  } catch (err) {
    console.warn("[archiveConversation]", err);
  }
}

// ─── unarchiveConversation ────────────────────────────────────────────────────
export async function unarchiveConversation(conversationId: string, uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, "conversations", conversationId), {
      [`archivedBy.${uid}`]: false,
    });
  } catch (err) {
    console.warn("[unarchiveConversation]", err);
  }
}

// ─── deleteConversationForUser (soft) ─────────────────────────────────────────
export async function deleteConversationForUser(conversationId: string, uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, "conversations", conversationId), {
      [`deletedBy.${uid}`]: true,
    });
  } catch (err) {
    console.warn("[deleteConversationForUser]", err);
  }
}

// ─── muteConversation ─────────────────────────────────────────────────────────
export async function muteConversation(conversationId: string, uid: string, muted: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, "conversations", conversationId), {
      [`mutedBy.${uid}`]: muted,
    });
  } catch (err) {
    console.warn("[muteConversation]", err);
  }
}

// ─── pinConversation ──────────────────────────────────────────────────────────
export async function pinConversation(conversationId: string, uid: string, pinned: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, "conversations", conversationId), {
      [`pinnedBy.${uid}`]: pinned,
    });
  } catch (err) {
    console.warn("[pinConversation]", err);
  }
}

// ─── deleteMessage ────────────────────────────────────────────────────────────
export async function deleteMessage(conversationId: string, messageId: string): Promise<void> {
  try {
    await updateDoc(
      doc(db, "conversations", conversationId, "messages", messageId),
      { deleted: true, body: "" }
    );
  } catch (err) {
    console.warn("[deleteMessage]", err);
  }
}

// ─── createGroupConversation ──────────────────────────────────────────────────
/**
 * Creates a new group conversation and returns its ID.
 */
export async function createGroupConversation(
  members: Array<{ uid: string; name: string }>,
  groupName: string,
  createdBy: string,
  organizationId: string
): Promise<string> {
  try {
    const memberIds = members.map((m) => m.uid);
    const memberNames: Record<string, string> = {};
    const unreadCounts: Record<string, number> = {};

    for (const m of members) {
      memberNames[m.uid] = m.name;
      unreadCounts[m.uid] = 0;
    }

    const ref = await addDoc(collection(db, "conversations"), {
      members: memberIds,
      memberNames,
      type: "group",
      name: groupName,
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      lastMessageBy: createdBy,
      unreadCounts,
      organizationId,
      createdAt: serverTimestamp(),
      createdBy,
    });

    return ref.id;
  } catch (err) {
    console.warn("[createGroupConversation]", err);
    throw err;
  }
}

// ─── Typing indicators ────────────────────────────────────────────────────────
//
// Data model: conversations/{convId}/typing/{userId}
//   { name: string, typingAt: Timestamp }
//
// A user is considered "typing" when their typingAt is ≤ 5 seconds ago.

const TYPING_TTL_MS = 5000;

/**
 * Writes (or clears) the current user's typing record.
 */
export async function setTypingStatus(
  conversationId: string,
  userId: string,
  displayName: string,
  isTyping: boolean
): Promise<void> {
  const ref = doc(db, "conversations", conversationId, "typing", userId);
  try {
    if (isTyping) {
      await setDoc(ref, { name: displayName, typingAt: serverTimestamp() }, { merge: true });
    } else {
      await deleteDoc(ref);
    }
  } catch {
    // Silently ignore — typing indicators are best-effort
  }
}

/**
 * Subscribes to the typing subcollection and returns the names of users who
 * are currently typing (excluding the current user).
 */
export function useTypingUsers(
  conversationId: string | null,
  currentUserId: string
): string[] {
  const [typingNames, setTypingNames] = useState<string[]>([]);

  useEffect(() => {
    if (!conversationId) return;

    const ref = collection(db, "conversations", conversationId, "typing");
    const unsub = onSnapshot(ref, (snap) => {
      const now = Date.now();
      const names: string[] = [];
      snap.docs.forEach((d) => {
        if (d.id === currentUserId) return; // skip self
        const data = d.data();
        const typingAt = data.typingAt?.toDate?.()?.getTime() ?? 0;
        if (now - typingAt < TYPING_TTL_MS) {
          names.push(data.name ?? "Someone");
        }
      });
      setTypingNames(names);
    });

    return unsub;
  }, [conversationId, currentUserId]);

  return typingNames;
}
