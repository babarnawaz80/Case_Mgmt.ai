import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import employeePhoto from "@/assets/employee-kathy.jpg";
import {
  MessageSquare,
  Plus,
  Search,
  MoreHorizontal,
  Send,
  Paperclip,
  AtSign,
  Link2,
  Smile,
  Sparkles,
  ArrowRight,
  Check,
  CheckCheck,
  X,
  ClipboardList,
  AlertTriangle,
  FileText,
  ListChecks,
  Archive,
  Trash2,
  BellOff,
  Bell,
  Pin,
  PinOff,
  Copy,
  Users,
  Phone,
  Video,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VideoOff,
  Loader2,
  Wand2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import MentionInput from "@/components/icm/MentionInput";
import { cn } from "@/lib/utils";
import { useMessages } from "@/hooks/useMessages";
import { toast } from "sonner";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth, storage } from "@/lib/firebase";
import {
  useFirestoreConversations,
  useConversationMessages,
  sendFSMessage,
  markConversationReadAt,
  createOrGetDirectConversation,
  createGroupConversation,
  archiveConversation,
  unarchiveConversation,
  deleteConversationForUser,
  muteConversation,
  pinConversation,
  deleteMessage as deleteFSMessage,
  setTypingStatus,
  useTypingUsers,
  type FSLinkedRecord,
  type FSFileAttachment,
} from "@/hooks/useFirestoreMessages";
import { useAuth } from "@/contexts/AuthContext";
import { useIndividuals, type Individual } from "@/hooks/useIndividuals";
import {
  CURRENT_USER_ID,
  allStaff,
  staffById,
  roleAvatarTone,
  roleLabel,
  type ChatMessage,
  type Conversation,
  type LinkedRecord,
  type StaffMember,
} from "@/data/messages";

// ─── Notification sound (Web Audio API — no external file) ───────────────────
function playNotificationSound() {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx() as AudioContext;
    const notes = [880, 1108]; // A5 → C#6 chime
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.14;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  } catch { /* silently ignore if AudioContext blocked */ }
}

function playRingTone(): () => void {
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx() as AudioContext;
      // Two-pulse ring: 425 Hz on → off → on → off
      [[0, 0.4], [0.5, 0.9]].forEach(([s, e]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine"; osc.frequency.value = 425;
        gain.gain.setValueAtTime(0.18, ctx.currentTime + s);
        gain.gain.setValueAtTime(0, ctx.currentTime + e);
        osc.start(ctx.currentTime + s); osc.stop(ctx.currentTime + e + 0.01);
      });
    } catch { /* ignore */ }
    setTimeout(tick, 4000);
  };
  tick();
  return () => { stopped = true; };
}

// ─── Call helper ──────────────────────────────────────────────────────────────
function formatCallDuration(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

// ─── AI rewrite for message composer ─────────────────────────────────────────
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
const GEMINI_PROXY_URL =
  "https://us-central1-casemanagement-ai.cloudfunctions.net/api/api/gemini-proxy";

const MSG_REWRITE_ACTIONS = [
  { id: "translate",    label: "Translate to English", icon: "🌐", description: "Translate any language into English" },
  { id: "improve",      label: "Improve writing",     icon: "✨", description: "Clearer, natural phrasing" },
  { id: "concise",      label: "Make concise",         icon: "✂️", description: "Shorter, same meaning" },
  { id: "professional", label: "More professional",    icon: "💼", description: "Formal workplace tone" },
  { id: "grammar",      label: "Fix grammar",          icon: "📝", description: "Spelling & punctuation only" },
];

const MSG_REWRITE_PROMPTS: Record<string, string> = {
  translate:    "Translate the following message into English. Preserve names, dates, and meaning exactly. If it is already entirely in English, return it unchanged. Return ONLY the English translation — no notes or explanations.",
  improve:      "Improve the clarity and naturalness of the following message. Make it clear, friendly, and easy to read. Do not change the meaning or add new information. Return ONLY the rewritten message, no explanations.",
  concise:      "Make the following message more concise. Remove unnecessary words while keeping the full meaning and tone intact. Return ONLY the shortened message, no explanations.",
  professional: "Rewrite the following message in a professional tone suitable for workplace communication between healthcare staff. Return ONLY the rewritten message, no explanations.",
  grammar:      "Fix only the grammar, spelling, and punctuation in the following message. Do NOT change the meaning, tone, or wording beyond mechanical corrections. Return ONLY the corrected message, no explanations.",
};

async function callMsgRewrite(text: string, action: string): Promise<string> {
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 800));
    // In demo mode, return a slightly tweaked version to show something happened
    return text.trim().replace(/\s+/g, " ");
  }
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error("Not signed in. Please sign in again.");

  const systemPrompt =
    "You are a messaging assistant for a healthcare case management platform. " +
    "Follow the instruction exactly. Return ONLY the rewritten message — no preamble, no labels, no explanations.";

  const prompt = `${MSG_REWRITE_PROMPTS[action] ?? MSG_REWRITE_PROMPTS.improve}\n\n---\n\n${text}`;

  const res = await fetch(GEMINI_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ prompt, systemPrompt, maxTokens: 1024, temperature: 0.3 }),
  });

  if (res.status === 401 || res.status === 403) throw new Error("Authentication failed. Please sign in again.");
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? "Rate limit reached. Please try again in a moment.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `AI service error (HTTP ${res.status})`);
  }
  const data = await res.json();
  if (!data.text) throw new Error("AI returned an empty response.");
  return data.text as string;
}

// ─── Speech recognition helper ────────────────────────────────────────────────
const getSpeechRecognition = (): any =>
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

// Shadow these functions to check for pre-resolved properties first (for Firestore threads)
function conversationDisplayName(c: Conversation): string {
  if ((c as any).displayName) return (c as any).displayName;
  
  if (c.type === "group") {
    if (c.groupName) return c.groupName;
    const others = c.memberIds
      .filter((id) => id !== CURRENT_USER_ID)
      .map((id) => staffById[id]?.name.split(" ")[0])
      .filter(Boolean);
    return others.join(", ");
  }
  const otherId = c.memberIds.find((id) => id !== CURRENT_USER_ID);
  return otherId ? staffById[otherId]?.name ?? "Unknown" : "Unknown";
}

function conversationOtherMember(c: Conversation): StaffMember | null {
  if ((c as any).otherMember) return (c as any).otherMember;
  
  if (c.type !== "direct") return null;
  const otherId = c.memberIds.find((id) => id !== CURRENT_USER_ID);
  return otherId ? staffById[otherId] ?? null : null;
}

type ListTab = "all" | "direct" | "groups" | "unread";

const Messages = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    conversations,
    messagesForConversation,
    unreadTotal,
    markConversationRead,
    markAllRead,
    sendMessage,
    createConversation,
    renameGroup,
  } = useMessages();

  // ── Firestore integration (additive, non-breaking) ───────────────────────
  const { currentUser, userProfile } = useAuth();
  const {
    conversations: fsConversations,
    totalUnread: fsTotalUnread,
  } = useFirestoreConversations();

  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser || !userProfile?.organizationId) return;
    const fetchUsers = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("organizationId", "==", userProfile.organizationId)
        );
        const snap = await getDocs(q);
        const list = snap.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              firstName: data.firstName ?? "",
              lastName: data.lastName ?? "",
              name: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
              displayName: data.displayName ?? "",
              email: data.email ?? "",
              role: data.role ?? "case_manager",
              status: data.status ?? "active",
              isActive: data.isActive ?? true,
              photoURL: data.photoURL ?? data.photo
                ?? `https://i.pravatar.cc/64?u=${encodeURIComponent(data.email || doc.id)}`,
            };
          })
          .filter((u) => u.isActive !== false && u.status !== "suspended" && u.id !== currentUser.uid);
        setAllUsers(list);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, [currentUser, userProfile?.organizationId]);

  const photoMap = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    // Current user: real photo → Firebase Auth photo → employee demo photo
    const myPhoto = userProfile?.photoURL || currentUser?.photoURL || employeePhoto;
    if (currentUser?.uid) m[currentUser.uid] = myPhoto;
    // Other staff: Firestore photoURL → pravatar by email
    allUsers.forEach((u) => {
      if (u.id && u.photoURL) m[u.id] = u.photoURL;
    });
    return m;
  }, [allUsers, currentUser?.uid, currentUser?.photoURL, userProfile?.photoURL]);

  // ── State that combinedConversations memo depends on — must come BEFORE it ──
  const [showArchived, setShowArchived] = useState(false);
  const [hiddenMockIds, setHiddenMockIds] = useState<Set<string>>(new Set());

  // Map live Firestore conversations into the unified Conversation interface
  const combinedConversations = useMemo(() => {
    const fsMapped: Conversation[] = fsConversations.map((c) => {
      const otherId = c.members.find((m) => m !== currentUser?.uid) ?? "supervisor";
      const otherName = c.memberNames[otherId] ?? "Supervisor Account";
      const initials = otherName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

      const otherMember: StaffMember = {
        id: otherId,
        name: otherName,
        initials,
        role: "supervisor",
        title: "Supervisor",
        online: true,
      };

      let timeStr = "Just now";
      if (c.lastMessageAt && typeof c.lastMessageAt === "object" && "seconds" in c.lastMessageAt) {
        const date = new Date((c.lastMessageAt as any).seconds * 1000);
        timeStr = date.toLocaleDateString() === new Date().toLocaleDateString()
          ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }

      return {
        id: c.id,
        type: c.type,
        memberIds: c.members,
        groupName: c.type === "group" ? (c.name ?? "Group Conversation") : undefined,
        lastPreview: c.lastMessage || "Conversation started",
        lastTimestamp: timeStr,
        lastWasYou: c.lastMessageBy === currentUser?.uid,
        unread: c.unreadCounts[currentUser?.uid ?? ""] ?? 0,
        // Injected properties for shadowing functions
        isFirestore: true,
        displayName: c.type === "group" ? (c.name ?? "Group Conversation") : otherName,
        otherMember: c.type === "direct" ? otherMember : undefined,
        memberNames: c.memberNames,
      } as any;
    });

    const seenIds = new Set<string>();
    const result: Conversation[] = [];

    // Filter out conversations deleted or archived by the current user
    const uid = currentUser?.uid ?? "";
    const visible = fsMapped.filter((c) => {
      const fsConv = fsConversations.find((f) => f.id === c.id);
      if (!fsConv) return true;
      if (fsConv.deletedBy?.[uid]) return false;
      if (showArchived) return !!fsConv.archivedBy?.[uid];
      return !fsConv.archivedBy?.[uid];
    });
    visible.forEach((c) => {
      seenIds.add(c.id);
      result.push(c);
    });

    // Include mock conversations that don't already have a real Firestore equivalent.
    // A mock is suppressed only when a Firestore conversation shares the same
    // member(s) — not simply because any Firestore thread exists.
    const fsMemberSets = fsMapped.map((f) => new Set((f as any).memberIds ?? []));
    conversations.forEach((c) => {
      if (seenIds.has(c.id) || hiddenMockIds.has(c.id)) return;
      const mockMembers: string[] = (c as any).memberIds ?? [];
      const hasFsEquivalent = fsMemberSets.some((fsSet) =>
        mockMembers.some((mid) => fsSet.has(mid))
      );
      if (!hasFsEquivalent) {
        result.push(c);
      }
    });

    return result;
  }, [fsConversations, conversations, currentUser?.uid, showArchived, hiddenMockIds]);

  // Combined unread badge count
  const totalUnreadDisplay = unreadTotal + fsTotalUnread;

  // Selected conversation
  const initialId = searchParams.get("c") ?? combinedConversations[0]?.id ?? null;
  const [activeId, setActiveIdRaw] = useState<string | null>(initialId);

  // useConversationMessages subscribes to Firestore for the active thread
  const { messages: _fsMessages } = useConversationMessages(activeId);
  function setActiveId(id: string | null) {
    setActiveIdRaw(id);
    if (id) setSearchParams({ c: id }, { replace: true });
    else setSearchParams({}, { replace: true });
  }

  const active = useMemo(
    () => combinedConversations.find((c) => c.id === activeId) ?? null,
    [combinedConversations, activeId]
  );

  // Map Firestore or mock messages cleanly for bubble rendering
  const activeConversationMessages = useMemo(() => {
    if (!activeId) return [];
    const isFS = fsConversations.some((c) => c.id === activeId);
    if (isFS && _fsMessages.length > 0) {
      return _fsMessages.map((m) => {
        let timeStr = "Just now";
        let dayBucket: "today" | "yesterday" | "earlier" = "today";
        let dayLabel = "Today";
        if (m.createdAt && typeof m.createdAt === "object" && "seconds" in m.createdAt) {
          const date = new Date((m.createdAt as any).seconds * 1000);
          const timeOnly = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          const today = new Date();
          const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
          if (date.toDateString() === today.toDateString()) {
            dayBucket = "today"; dayLabel = "Today";
            timeStr = `Today at ${timeOnly}`;
          } else if (date.toDateString() === yesterday.toDateString()) {
            dayBucket = "yesterday"; dayLabel = "Yesterday";
            timeStr = `Yesterday at ${timeOnly}`;
          } else {
            dayBucket = "earlier";
            const dateLabel = date.toLocaleDateString([], { month: "short", day: "numeric" });
            dayLabel = date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
            timeStr = `${dateLabel} at ${timeOnly}`;
          }
        }

        // Determine message kind and payload
        let kind: "text" | "linked_record" | "file" = "text";
        let linkedRecord: any = undefined;
        let fileName: string | undefined;
        let fileSize: string | undefined;
        let fileUrl: string | undefined;

        if (m.linkedRecord) {
          kind = "linked_record";
          linkedRecord = m.linkedRecord;
        } else if (m.attachment) {
          kind = "file";
          fileName = m.attachment.fileName;
          const bytes = m.attachment.fileSize;
          fileSize = bytes < 1024 * 1024
            ? `${(bytes / 1024).toFixed(1)} KB`
            : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
          fileUrl = m.attachment.fileUrl;
        }

        return {
          id: m.id,
          conversationId: m.conversationId,
          authorId: m.senderId === currentUser?.uid ? "you" : m.senderId,
          authorName: m.senderName,
          kind,
          text: m.body,
          linkedRecord,
          fileName,
          fileSize,
          fileUrl,
          timestamp: timeStr,
          dayBucket,
          dayLabel,
          deleted: m.deleted,
        } as any;
      });
    }
    return messagesForConversation(activeId);
  }, [activeId, _fsMessages, messagesForConversation, fsConversations, currentUser?.uid]);

  // Mark active as read when opened
  useEffect(() => {
    if (!active || !currentUser?.uid) return;
    const isFS = (active as any).isFirestore;
    if (isFS) {
      markConversationReadAt(active.id, currentUser.uid).catch(() => {});
    } else if (active.unread > 0) {
      markConversationRead(active.id);
    }
  }, [active?.id, currentUser?.uid]);

  // ── Notification sound on incoming messages ──────────────────────────────
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (_fsMessages.length === 0) { prevMsgCountRef.current = 0; return; }
    const newCount = _fsMessages.length;
    if (newCount > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
      const last = _fsMessages[newCount - 1];
      if (last.senderId !== currentUser?.uid) {
        playNotificationSound();
      }
    }
    prevMsgCountRef.current = newCount;
  }, [_fsMessages.length, currentUser?.uid]);

  // Archive / delete / mute / pin state (showArchived + hiddenMockIds declared above combinedConversations)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteMsg, setConfirmDeleteMsg] = useState<{ convId: string; msgId: string } | null>(null);
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  // Tabs and search in left panel
  const [listTab, setListTab] = useState<ListTab>("all");
  const [listSearch, setListSearch] = useState("");

  const filteredConversations = useMemo(() => {
    let list = combinedConversations.slice();
    if (listTab === "direct") list = list.filter((c) => c.type === "direct");
    else if (listTab === "groups") list = list.filter((c) => c.type === "group");
    else if (listTab === "unread") list = list.filter((c) => c.unread > 0);
    if (listSearch.trim()) {
      const q = listSearch.toLowerCase();
      list = list.filter(
        (c) =>
          conversationDisplayName(c).toLowerCase().includes(q) ||
          c.lastPreview.toLowerCase().includes(q)
      );
    }
    // Sort pinned conversations to top
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id) ? -1 : 0;
      const bPinned = pinnedIds.has(b.id) ? -1 : 0;
      return aPinned - bPinned;
    });
    return list;
  }, [combinedConversations, listTab, listSearch, pinnedIds]);

  // Composer state
  const [draft, setDraft] = useState("");
  const [draftLinked, setDraftLinked] = useState<LinkedRecord | null>(null);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [renameMode, setRenameMode] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [inConvoSearch, setInConvoSearch] = useState(false);
  const [inConvoQuery, setInConvoQuery] = useState("");

  // Typing indicator — subscribe to other users typing in the active conversation
  const activeConvId = active?.id ?? null;
  const typingNames = useTypingUsers(activeConvId, currentUser?.uid ?? "");

  // Debounced typing status writer
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTyping = useCallback((isTyping: boolean) => {
    if (!activeConvId || !currentUser?.uid) return;
    const displayName = userProfile?.displayName ?? currentUser?.email ?? "Someone";
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setTypingStatus(activeConvId, currentUser.uid, displayName, isTyping);
    if (isTyping) {
      // Auto-clear after 4 seconds of no updates (safety net)
      typingTimerRef.current = setTimeout(() => {
        setTypingStatus(activeConvId, currentUser.uid, displayName, false);
      }, 4000);
    }
  }, [activeConvId, currentUser?.uid, userProfile?.displayName, currentUser?.email]);

  // New message modal
  const [newOpen, setNewOpen] = useState(false);

  async function handleSend() {
    if (!active) return;
    const text = draft.trim();
    if (!text && !draftLinked && !draftFile) return;

    const isFS = (active as any).isFirestore;
    const senderId  = currentUser?.uid ?? "";
    const senderName = userProfile?.displayName ?? currentUser?.email ?? "Me";
    const senderAvatar = userProfile?.photoURL || currentUser?.photoURL || employeePhoto;
    const orgId = userProfile?.organizationId ?? "general";

    if (isFS) {
      // ── Upload file if present ──────────────────────────────────────────
      let fsAttachment: FSFileAttachment | null = null;
      if (draftFile) {
        try {
          const path = `organizations/${orgId}/messages/${active.id}/${Date.now()}_${draftFile.name}`;
          const sRef = storageRef(storage, path);
          const task = uploadBytesResumable(sRef, draftFile, { contentType: draftFile.type || "application/octet-stream" });
          const snap = await new Promise<import("firebase/storage").UploadTaskSnapshot>((resolve, reject) => {
            task.on("state_changed", undefined, reject, () => resolve(task.snapshot));
          });
          const fileUrl = await getDownloadURL(snap.ref);
          fsAttachment = {
            fileName: draftFile.name,
            fileSize: draftFile.size,
            fileUrl,
            mimeType: draftFile.type || "application/octet-stream",
          };
        } catch (err: any) {
          toast.error("File upload failed", { description: err.message });
          return; // don't clear draft if upload failed
        }
      }

      // ── Build linked record payload ────────────────────────────────────
      const fsLinked: FSLinkedRecord | null = draftLinked
        ? {
            moduleIcon: draftLinked.moduleIcon,
            moduleLabel: draftLinked.moduleLabel,
            individualName: draftLinked.individualName,
            detail: draftLinked.detail,
            href: draftLinked.href,
          }
        : null;

      sendFSMessage(active.id, senderId, senderName, text, senderAvatar, fsLinked, fsAttachment)
        .catch((err) => console.error("[Messages] sendFSMessage failed:", err));
    } else {
      if (draftLinked) {
        // First send the text (if any) then the linked record card
        if (text) sendMessage(active.id, { kind: "text", text });
        sendMessage(active.id, {
          kind: "linked_record",
          linkedRecord: draftLinked,
        });
      } else if (text.startsWith("@AI ") || text.startsWith("/ai ")) {
        // AI prompt -> send as user, then AI summary reply
        sendMessage(active.id, { kind: "text", text });
        const prompt = text.replace(/^(@AI |\/ai )/, "");
        setTimeout(() => {
          sendMessage(active.id, {
            kind: "ai_summary",
            aiTitle: `Here's a quick summary based on "${prompt}". I cross-referenced recent records and surfaced the most relevant findings.`,
            aiHref: "/dashboard",
          });
        }, 350);
      } else {
        sendMessage(active.id, { kind: "text", text });
      }

    }

    setDraft("");
    setDraftLinked(null);
    setDraftFile(null);
    handleTyping(false); // clear typing status on send
  }

  return (
    <ICMShell title="Messages" showAIPanel={false}>
      <div className="flex h-[calc(100dvh-160px)] -m-3 sm:-m-6 bg-icm-bg">
        {/* LEFT — conversation list (hidden on mobile when a conversation is active) */}
        <aside
          className={cn(
            "w-full md:w-[280px] shrink-0 bg-icm-panel border-r border-icm-border flex-col",
            active ? "hidden md:flex" : "flex"
          )}
        >
          <div className="p-3 border-b border-icm-border space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-manrope font-bold text-[15px] text-icm-text">
                Messages
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={cn(
                    "text-[10.5px] font-geist font-semibold hover:underline flex items-center gap-1",
                    showArchived ? "text-icm-accent" : "text-icm-text-dim"
                  )}
                >
                  <Archive className="w-3 h-3" />
                  {showArchived ? "Back to inbox" : "Archived"}
                </button>
                {!showArchived && totalUnreadDisplay > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10.5px] font-geist font-semibold text-icm-accent hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setNewOpen(true)}
              className="w-full h-8 rounded-lg bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center justify-center gap-1.5 hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" /> New message
            </button>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-icm-text-faint absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full h-8 pl-7 pr-2 rounded-lg border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent"
              />
            </div>
            <div className="flex items-center gap-1">
              {(
                [
                  { v: "all", label: "All" },
                  { v: "direct", label: "Direct" },
                  { v: "groups", label: "Groups" },
                  { v: "unread", label: "Unread" },
                ] as const
              ).map((t) => (
                <button
                  key={t.v}
                  onClick={() => setListTab(t.v)}
                  className={cn(
                    "flex-1 h-7 rounded-lg text-[11px] font-geist font-semibold transition-colors",
                    listTab === t.v
                      ? "bg-icm-text text-icm-panel"
                      : "text-icm-text-dim hover:bg-icm-bg"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Live Firestore threads indicator */}
            {fsConversations.length > 0 && (
              <div className="px-3 py-1.5 text-[10px] font-geist text-icm-text-faint border-b border-icm-border flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-icm-green animate-pulse" />
                {fsConversations.length} live thread{fsConversations.length !== 1 ? "s" : ""} from Firestore
              </div>
            )}
            {filteredConversations.length === 0 ? (
              <p className="px-3 py-6 text-[12px] font-geist text-icm-text-dim text-center">
                No conversations
              </p>
            ) : (
              filteredConversations.map((c) => (
                <ConversationRow
                  key={c.id}
                  conversation={c}
                  active={c.id === activeId}
                  currentUid={currentUser?.uid ?? ""}
                  photoMap={photoMap}
                  onClick={() => setActiveId(c.id)}
                  isPinned={pinnedIds.has(c.id)}
                  showArchived={showArchived}
                  onArchive={() => {
                    const isFS = (c as any).isFirestore;
                    if (isFS && currentUser?.uid) {
                      if (showArchived) {
                        unarchiveConversation(c.id, currentUser.uid);
                      } else {
                        archiveConversation(c.id, currentUser.uid);
                        if (activeId === c.id) setActiveId(null);
                      }
                    } else {
                      setHiddenMockIds(prev => new Set([...prev, c.id]));
                      if (activeId === c.id) setActiveId(null);
                    }
                  }}
                  onDelete={() => setConfirmDelete(c.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* RIGHT — active conversation */}
        <section
          className={cn(
            "flex-1 flex-col min-w-0 bg-icm-bg",
            active ? "flex" : "hidden md:flex"
          )}
        >
          {!active ? (
            <EmptyConversation onNew={() => setNewOpen(true)} />
          ) : (
            <ActiveConversation
              conversation={active}
              messages={activeConversationMessages}
              currentUid={currentUser?.uid ?? ""}
              photoMap={photoMap}
              draft={draft}
              setDraft={setDraft}
              draftLinked={draftLinked}
              setDraftLinked={setDraftLinked}
              draftFile={draftFile}
              setDraftFile={setDraftFile}
              onSend={handleSend}
              showMentionPicker={showMentionPicker}
              setShowMentionPicker={setShowMentionPicker}
              showLinkPicker={showLinkPicker}
              setShowLinkPicker={setShowLinkPicker}
              headerMenuOpen={headerMenuOpen}
              setHeaderMenuOpen={setHeaderMenuOpen}
              renameMode={renameMode}
              setRenameMode={setRenameMode}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              onBack={() => setActiveId(null)}
              onRename={(val) => {
                renameGroup(active.id, val);
                setRenameMode(false);
              }}
              inConvoSearch={inConvoSearch}
              setInConvoSearch={setInConvoSearch}
              inConvoQuery={inConvoQuery}
              setInConvoQuery={setInConvoQuery}
              onArchive={() => {
                if (!active || !currentUser?.uid) return;
                const isFS = (active as any).isFirestore;
                if (isFS) {
                  archiveConversation(active.id, currentUser.uid);
                  setActiveId(null);
                } else {
                  setHiddenMockIds(prev => new Set([...prev, active.id]));
                  setActiveId(null);
                }
              }}
              onDelete={() => setConfirmDelete(active?.id ?? null)}
              onMute={(muted: boolean) => {
                if (!active || !currentUser?.uid) return;
                const isFS = (active as any).isFirestore;
                if (isFS) muteConversation(active.id, currentUser.uid, muted);
                if (muted) setMutedIds(prev => new Set([...prev, active.id]));
                else setMutedIds(prev => { const s = new Set(prev); s.delete(active.id); return s; });
              }}
              onPin={(pinned: boolean) => {
                if (!active || !currentUser?.uid) return;
                const isFS = (active as any).isFirestore;
                if (isFS) pinConversation(active.id, currentUser.uid, pinned);
                if (pinned) setPinnedIds(prev => new Set([...prev, active.id]));
                else setPinnedIds(prev => { const s = new Set(prev); s.delete(active.id); return s; });
              }}
              isMuted={mutedIds.has(active?.id ?? "")}
              isPinned={pinnedIds.has(active?.id ?? "")}
              onDeleteMessage={(msgId: string) => setConfirmDeleteMsg({ convId: active?.id ?? "", msgId })}
              orgUsers={allUsers}
              typingNames={typingNames}
              onTyping={handleTyping}
            />
          )}
        </section>


        {/* Delete conversation confirmation */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-icm-panel border border-icm-border shadow-elevated p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-icm-red" />
                </div>
                <div>
                  <p className="font-manrope font-bold text-[15px] text-icm-text">Delete conversation?</p>
                  <p className="text-[12px] text-icm-text-dim mt-0.5">This will remove it from your inbox. The other person can still see it.</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="h-8 px-3 rounded-lg border border-icm-border text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const id = confirmDelete;
                    const found = combinedConversations.find((c) => c.id === id);
                    const isFS = found && (found as any).isFirestore;
                    if (isFS && currentUser?.uid) {
                      deleteConversationForUser(id, currentUser.uid);
                    } else {
                      setHiddenMockIds(prev => new Set([...prev, id]));
                    }
                    if (activeId === id) setActiveId(null);
                    setConfirmDelete(null);
                  }}
                  className="h-8 px-3 rounded-lg bg-icm-red text-white text-[12px] font-geist font-semibold hover:opacity-90"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete message confirmation */}
        {confirmDeleteMsg && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-icm-panel border border-icm-border shadow-elevated p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-icm-red" />
                </div>
                <div>
                  <p className="font-manrope font-bold text-[15px] text-icm-text">Delete message?</p>
                  <p className="text-[12px] text-icm-text-dim mt-0.5">This message will be removed for everyone.</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmDeleteMsg(null)}
                  className="h-8 px-3 rounded-lg border border-icm-border text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const { convId, msgId } = confirmDeleteMsg;
                    const found = combinedConversations.find((c) => c.id === convId);
                    const isFS = found && (found as any).isFirestore;
                    if (isFS) deleteFSMessage(convId, msgId).catch(() => {});
                    setConfirmDeleteMsg(null);
                  }}
                  className="h-8 px-3 rounded-lg bg-icm-red text-white text-[12px] font-geist font-semibold hover:opacity-90"
                >
                  Delete for everyone
                </button>
              </div>
            </div>
          </div>
        )}

        {newOpen && (
          <NewMessageModal
            users={allUsers}
            onClose={() => setNewOpen(false)}
            onCreate={async (memberIds, groupName, firstMessage) => {
              if (currentUser && userProfile?.organizationId) {
                try {
                  let newId = "";
                  const myName = userProfile.firstName && userProfile.lastName 
                    ? `${userProfile.firstName} ${userProfile.lastName}` 
                    : userProfile.displayName || "Me";
                    
                  if (memberIds.length === 1) {
                    const recipientId = memberIds[0];
                    const recipientUser = allUsers.find((u) => u.id === recipientId);
                    const recipientName = recipientUser ? recipientUser.name : "Supervisor";
                    
                    newId = await createOrGetDirectConversation(
                      currentUser.uid,
                      myName,
                      recipientId,
                      recipientName,
                      userProfile.organizationId
                    );
                  } else {
                    const membersList = memberIds.map(id => {
                      const u = allUsers.find((x) => x.id === id);
                      return { uid: id, name: u ? u.name : "User" };
                    });
                    membersList.push({ uid: currentUser.uid, name: myName });
                    
                    newId = await createGroupConversation(
                      membersList,
                      groupName || "Group Conversation",
                      currentUser.uid,
                      userProfile.organizationId
                    );
                  }
                  
                  if (firstMessage.trim()) {
                    await sendFSMessage(
                      newId,
                      currentUser.uid,
                      myName,
                      firstMessage
                    );
                  }
                  
                  setActiveId(newId);
                  setNewOpen(false);
                  return;
                } catch (err) {
                  console.error("Failed to create Firestore conversation:", err);
                }
              }

              const id = createConversation(memberIds, groupName);
              if (firstMessage.trim()) {
                sendMessage(id, { kind: "text", text: firstMessage });
              }
              setActiveId(id);
              setNewOpen(false);
            }}
          />
        )}
      </div>
    </ICMShell>
  );
};

// ----- User avatar helper -------------------------------------------------

function UserAvatar({
  photoUrl,
  initials,
  tone,
  size,
  online,
}: {
  photoUrl?: string | null;
  initials: string;
  tone: string;
  size: "sm" | "md" | "lg";
  online?: boolean;
}) {
  const sizeMap = { sm: "w-8 h-8 text-[11px]", md: "w-9 h-9 text-[11px]", lg: "w-10 h-10 text-[12px]" };
  const dotMap = { sm: "w-2.5 h-2.5", md: "w-2.5 h-2.5", lg: "w-3 h-3" };
  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          sizeMap[size],
          "rounded-lg ring-1 ring-icm-border overflow-hidden flex items-center justify-center font-geist font-bold",
          !photoUrl && tone
        )}
      >
        {photoUrl ? (
          <img src={photoUrl} alt={initials} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-icm-panel",
            dotMap[size],
            online ? "bg-icm-green" : "bg-icm-text-faint"
          )}
        />
      )}
    </div>
  );
}

// ----- Conversation list row ----------------------------------------------

function ConversationRow({
  conversation,
  active,
  currentUid,
  photoMap,
  onClick,
  isPinned,
  showArchived,
  onArchive,
  onDelete,
}: {
  conversation: Conversation;
  active: boolean;
  currentUid: string;
  photoMap: Record<string, string>;
  onClick: () => void;
  isPinned?: boolean;
  showArchived?: boolean;
  onArchive?: () => void;
  onDelete?: () => void;
}) {
  const name = conversationDisplayName(conversation);
  const other = conversationOtherMember(conversation);
  const isGroup = conversation.type === "group";

  // Build avatar
  const avatarMembers = isGroup
    ? conversation.memberIds
        .filter((id) => id !== (conversation.isFirestore ? currentUid : CURRENT_USER_ID))
        .slice(0, 3)
        .map((id) => staffById[id] ?? {
          id,
          name: (conversation as any).memberNames?.[id] ?? "User",
          initials: ((conversation as any).memberNames?.[id] ?? "U").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
          role: "supervisor" as const,
          title: "User",
          online: true,
        })
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }}}
      className={cn(
        "group w-full text-left px-3 py-2.5 border-b border-icm-border last:border-b-0 transition-colors flex items-start gap-2.5 relative cursor-pointer",
        active
          ? "bg-icm-accent-soft/40 border-l-4 border-l-icm-accent pl-2"
          : "hover:bg-icm-bg border-l-4 border-l-transparent pl-2"
      )}
    >
      {isGroup ? (
        <div className="relative w-8 h-8 shrink-0">
          {avatarMembers?.map((m, i) => (
            <span
              key={m.id}
              className={cn(
                "absolute w-6 h-6 rounded-lg ring-1 ring-icm-panel flex items-center justify-center text-[9px] font-geist font-bold",
                roleAvatarTone(m.role)
              )}
              style={{ left: i * 8, top: i * 4, zIndex: 3 - i }}
            >
              {m.initials}
            </span>
          ))}
        </div>
      ) : (
        <UserAvatar
          photoUrl={
            (other && photoMap[(other as any).id]) ??
            (conversation as any).otherMemberPhoto ??
            null
          }
          initials={other?.initials ?? "?"}
          tone={other ? roleAvatarTone(other.role) : "bg-icm-bg text-icm-text-dim"}
          size="sm"
          online={other?.online}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-[13px] font-geist truncate",
              conversation.unread > 0 ? "font-bold text-icm-text" : "font-semibold text-icm-text"
            )}
          >
            {name}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {isPinned && <Pin className="w-3 h-3 text-icm-accent" />}
            <span className="text-[10.5px] font-mono text-icm-text-faint">
              {conversation.lastTimestamp}
            </span>
          </div>
        </div>
        {isGroup && (
          <p className="text-[10.5px] font-geist text-icm-text-faint">
            {conversation.memberIds.length} members
          </p>
        )}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={cn(
              "text-[12px] font-geist truncate",
              conversation.unread > 0 ? "text-icm-text" : "text-icm-text-dim"
            )}
          >
            {conversation.lastWasYou && (
              <span className="text-icm-text-faint">You: </span>
            )}
            {conversation.lastPreview}
          </p>
          {conversation.unread > 0 && (
            <span className="px-1.5 h-[16px] min-w-[16px] rounded-full bg-icm-red text-white text-[9px] font-mono font-bold flex items-center justify-center shrink-0">
              {conversation.unread}
            </span>
          )}
        </div>
      </div>
      {/* Hover action strip */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-icm-panel pl-2">
        <button
          onClick={(e) => { e.stopPropagation(); onArchive?.(); }}
          className="w-7 h-7 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
          title={showArchived ? "Unarchive" : "Archive"}
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
          className="w-7 h-7 rounded-lg hover:bg-icm-bg text-icm-red flex items-center justify-center"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ----- Empty state ---------------------------------------------------------

function EmptyConversation({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-icm-panel ring-1 ring-icm-border flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-icm-text-faint" />
        </div>
        <p className="text-[13px] font-geist text-icm-text-dim">
          Select a conversation or start a new one
        </p>
        <button
          onClick={onNew}
          className="h-9 px-3 rounded-lg bg-icm-text text-icm-panel text-[12.5px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" /> New message
        </button>
      </div>
    </div>
  );
}

// ----- Active conversation panel ------------------------------------------

interface ActiveConversationProps {
  conversation: Conversation;
  messages: ChatMessage[];
  currentUid: string;
  photoMap: Record<string, string>;
  draft: string;
  setDraft: (v: string) => void;
  draftLinked: LinkedRecord | null;
  setDraftLinked: (v: LinkedRecord | null) => void;
  draftFile: File | null;
  setDraftFile: (v: File | null) => void;
  onSend: () => void;
  showMentionPicker: boolean;
  setShowMentionPicker: (v: boolean) => void;
  showLinkPicker: boolean;
  setShowLinkPicker: (v: boolean) => void;
  headerMenuOpen: boolean;
  setHeaderMenuOpen: (v: boolean) => void;
  renameMode: boolean;
  setRenameMode: (v: boolean) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  onRename: (v: string) => void;
  onBack?: () => void;
  inConvoSearch: boolean;
  setInConvoSearch: (v: boolean) => void;
  inConvoQuery: string;
  setInConvoQuery: (v: string) => void;
  onArchive: () => void;
  onDelete: () => void;
  onMute: (muted: boolean) => void;
  onPin: (pinned: boolean) => void;
  isMuted: boolean;
  isPinned: boolean;
  onDeleteMessage: (msgId: string) => void;
  orgUsers: any[];
  typingNames: string[];
  onTyping: (isTyping: boolean) => void;
}

function ActiveConversation({
  conversation,
  messages,
  currentUid,
  photoMap,
  draft,
  setDraft,
  draftLinked,
  setDraftLinked,
  draftFile,
  setDraftFile,
  onSend,
  showMentionPicker,
  setShowMentionPicker,
  showLinkPicker,
  setShowLinkPicker,
  headerMenuOpen,
  setHeaderMenuOpen,
  renameMode,
  setRenameMode,
  renameValue,
  setRenameValue,
  onRename,
  onBack,
  inConvoSearch,
  setInConvoSearch,
  inConvoQuery,
  setInConvoQuery,
  onArchive,
  onDelete,
  onMute,
  onPin,
  isMuted,
  isPinned,
  onDeleteMessage,
  orgUsers,
  typingNames,
  onTyping,
}: ActiveConversationProps) {
  const isGroup = conversation.type === "group";
  const other = conversationOtherMember(conversation);
  const name = conversationDisplayName(conversation);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showHelpWrite, setShowHelpWrite] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const recRef = useRef<any>(null);
  const baseTextRef = useRef("");

  // ── Voice dictation ──────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      toast.error("Voice input not supported", { description: "Try Chrome or Edge on desktop." });
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    baseTextRef.current = draft;
    rec.onresult = (event: any) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalChunk += r[0].transcript;
        else interimChunk += r[0].transcript;
      }
      if (finalChunk) {
        baseTextRef.current = (baseTextRef.current + " " + finalChunk).replace(/\s+/g, " ").trim();
        setDraft(baseTextRef.current);
      } else {
        setDraft((baseTextRef.current + " " + interimChunk).replace(/\s+/g, " ").trim());
      }
    };
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed") {
        toast.error("Microphone access denied", { description: "Enable mic permission in your browser." });
      } else if (e.error !== "aborted" && e.error !== "no-speech") {
        toast.error(`Voice error: ${e.error}`);
      }
      setIsRecording(false);
    };
    rec.onend = () => setIsRecording(false);
    recRef.current = rec;
    try {
      rec.start();
      setIsRecording(true);
      toast.success("Listening…", { description: "Speak now. Click the mic again to stop.", duration: 2000 });
    } catch {
      toast.error("Could not start voice input");
    }
  }, [draft, setDraft]);

  const stopRecording = useCallback(() => {
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    setIsRecording(false);
  }, []);

  // ── Help Me Write (AI rewrite) ────────────────────────────────────────────
  const doRewrite = useCallback(async (actionId: string) => {
    const text = draft.trim();
    if (!text) {
      toast.error("Nothing to rewrite", { description: "Type or dictate your message first." });
      setShowHelpWrite(false);
      return;
    }
    setShowHelpWrite(false);
    setIsRewriting(true);
    try {
      const out = await callMsgRewrite(text, actionId);
      setDraft(out);
      toast.success("Message updated", {
        description: MSG_REWRITE_ACTIONS.find((a) => a.id === actionId)?.label,
      });
    } catch (err: any) {
      toast.error("AI rewrite failed", { description: err.message || "Check connection and try again." });
    } finally {
      setIsRewriting(false);
    }
  }, [draft, setDraft]);

  // ── Call state ────────────────────────────────────────────────────────────
  const [callState, setCallState] = useState<null | "calling" | "connected">(null);
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [callDuration, setCallDuration] = useState(0);
  const [callMuted, setCallMuted] = useState(false);
  const [callSpeaker, setCallSpeaker] = useState(true);
  const stopRingRef = useRef<(() => void) | null>(null);

  const startCall = (type: "audio" | "video") => {
    setCallType(type);
    setCallState("calling");
    setCallDuration(0);
    stopRingRef.current = playRingTone();
    // Simulate answer after 4 s (demo)
    setTimeout(() => {
      stopRingRef.current?.();
      setCallState("connected");
    }, 4000);
  };

  const endCall = () => {
    stopRingRef.current?.();
    setCallState(null);
    setCallDuration(0);
    setCallMuted(false);
  };

  useEffect(() => {
    if (callState !== "connected") return;
    const t = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [callState]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, conversation.id]);

  // Filter messages by in-conversation search query
  const displayMessages = useMemo(() => {
    if (!inConvoSearch || !inConvoQuery.trim()) return messages;
    const q = inConvoQuery.trim().toLowerCase();
    return messages.filter((m) => (m.text ?? "").toLowerCase().includes(q));
  }, [messages, inConvoSearch, inConvoQuery]);

  // Group messages by day for date separators
  const grouped = useMemo(() => {
    const out: { label: string; items: ChatMessage[] }[] = [];
    displayMessages.forEach((m) => {
      const last = out[out.length - 1];
      if (last && last.label === m.dayLabel) last.items.push(m);
      else out.push({ label: m.dayLabel, items: [m] });
    });
    return out;
  }, [displayMessages]);

  return (
    <>
      {/* Header */}
      <header className="px-3 sm:px-4 py-2.5 border-b border-icm-border bg-icm-panel flex items-center gap-2 sm:gap-3 relative">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden w-8 h-8 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center shrink-0"
            title="Back"
            aria-label="Back to conversations"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
        )}
        {isGroup ? (
          <div className="relative w-10 h-10 shrink-0">
            {conversation.memberIds
              .filter((id) => id !== (conversation.isFirestore ? currentUid : CURRENT_USER_ID))
              .slice(0, 3)
              .map((id, i) => {
                const m = staffById[id] ?? {
                  id,
                  name: (conversation as any).memberNames?.[id] ?? "User",
                  initials: ((conversation as any).memberNames?.[id] ?? "U").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
                  role: "supervisor" as const,
                  title: "User",
                  online: true,
                };
                return (
                  <span
                    key={id}
                    className={cn(
                      "absolute w-7 h-7 rounded-lg ring-2 ring-icm-panel flex items-center justify-center text-[10px] font-geist font-bold",
                      roleAvatarTone(m.role)
                    )}
                    style={{ left: i * 10, top: i * 5, zIndex: 3 - i }}
                  >
                    {m.initials}
                  </span>
                );
              })}
          </div>
        ) : (
          <UserAvatar
            photoUrl={other ? photoMap[(other as any).id] ?? null : null}
            initials={other?.initials ?? "?"}
            tone={other ? roleAvatarTone(other.role) : "bg-icm-bg"}
            size="lg"
            online={other?.online}
          />
        )}
        <div className="flex-1 min-w-0">
          {isGroup && renameMode ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => onRename(renameValue)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRename(renameValue);
                if (e.key === "Escape") setRenameMode(false);
              }}
              className="font-manrope font-bold text-[16px] text-icm-text bg-icm-bg border border-icm-border rounded px-2 py-0.5 focus:outline-none focus:border-icm-accent"
            />
          ) : (
            <button
              onClick={() => {
                if (isGroup) {
                  setRenameValue(name);
                  setRenameMode(true);
                }
              }}
              className={cn(
                "block text-left max-w-full",
                isGroup && "hover:opacity-80"
              )}
            >
              <p className="font-manrope font-bold text-[16px] text-icm-text truncate">
                {name}
              </p>
            </button>
          )}
          <p className="text-[11px] font-geist text-icm-text-dim">
            {isGroup
              ? `${conversation.memberIds.length} members · View members`
              : other
                ? `${roleLabel(other.role)} · View profile →`
                : ""}
          </p>
        </div>
        {/* Call buttons */}
        {!isGroup && (
          <>
            <button
              onClick={() => startCall("audio")}
              className="w-8 h-8 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
              title="Audio call"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => startCall("video")}
              className="w-8 h-8 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
              title="Video call"
            >
              <Video className="w-4 h-4" />
            </button>
          </>
        )}
        <button
          onClick={() => {
            setInConvoSearch(!inConvoSearch);
            setInConvoQuery("");
          }}
          className={cn(
            "w-8 h-8 rounded-lg hover:bg-icm-bg flex items-center justify-center",
            inConvoSearch ? "bg-icm-accent text-white" : "text-icm-text-dim"
          )}
          title={inConvoSearch ? "Close search" : "Search in conversation"}
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
          className="w-8 h-8 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
          title="More"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {headerMenuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setHeaderMenuOpen(false)} />
            <div className="absolute top-full right-3 mt-1 z-30 w-56 rounded-xl border border-icm-border bg-icm-panel shadow-elevated py-1">
              {isGroup && (
                <HeaderMenuItem icon={<Users className="w-3.5 h-3.5" />} onClick={() => setHeaderMenuOpen(false)}>
                  View members
                </HeaderMenuItem>
              )}
              <HeaderMenuItem
                icon={isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                onClick={() => { onPin(!isPinned); setHeaderMenuOpen(false); }}
              >
                {isPinned ? "Unpin conversation" : "Pin conversation"}
              </HeaderMenuItem>
              <HeaderMenuItem
                icon={isMuted ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                onClick={() => { onMute(!isMuted); setHeaderMenuOpen(false); }}
              >
                {isMuted ? "Unmute notifications" : "Mute notifications"}
              </HeaderMenuItem>
              <HeaderMenuItem
                icon={<Archive className="w-3.5 h-3.5" />}
                onClick={() => { onArchive(); setHeaderMenuOpen(false); }}
              >
                Archive conversation
              </HeaderMenuItem>
              <div className="my-1 border-t border-icm-border" />
              <HeaderMenuItem
                icon={<Trash2 className="w-3.5 h-3.5" />}
                destructive
                onClick={() => { onDelete(); setHeaderMenuOpen(false); }}
              >
                {isGroup ? "Leave & delete" : "Delete conversation"}
              </HeaderMenuItem>
            </div>
          </>
        )}
      </header>

      {/* In-conversation search bar */}
      {inConvoSearch && (
        <div className="px-3 py-2 border-b border-icm-border bg-icm-panel flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-icm-text-faint shrink-0" />
          <input
            autoFocus
            value={inConvoQuery}
            onChange={(e) => setInConvoQuery(e.target.value)}
            placeholder="Search messages…"
            className="flex-1 bg-transparent text-[12.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none"
          />
          {inConvoQuery.trim() && (
            <span className="text-[11px] font-geist text-icm-text-faint shrink-0">
              {displayMessages.length} result{displayMessages.length !== 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={() => { setInConvoSearch(false); setInConvoQuery(""); }}
            className="w-6 h-6 rounded-md hover:bg-icm-bg text-icm-text-dim flex items-center justify-center shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-5">
        {grouped.map((g) => (
          <div key={g.label} className="space-y-3">
            <div className="flex items-center justify-center">
              <span className="px-2.5 py-0.5 rounded-full bg-icm-panel border border-icm-border text-[10.5px] font-geist text-icm-text-dim">
                {g.label}
              </span>
            </div>
            <div className="space-y-3">
              {g.items.map((m, i) => {
                const isMe = m.authorId === CURRENT_USER_ID || m.authorId === "you" || m.authorId === currentUid;
                const prevItem = i > 0 ? g.items[i - 1] : null;
                const showAuthor =
                  !isMe &&
                  (!prevItem || prevItem.authorId !== m.authorId);
                // isLastSentByMe: the very last message sent by me across ALL display messages
                const mIdx = displayMessages.indexOf(m);
                const isLastSentByMe =
                  isMe &&
                  !displayMessages.slice(mIdx + 1).some(
                    (later) => later.authorId === CURRENT_USER_ID || later.authorId === "you" || later.authorId === currentUid
                  );
                // seenByOther: anyone else has EVER sent a message in this conversation
                // (once someone replies they've read everything prior — same as WhatsApp/iMessage)
                const seenByOther =
                  isLastSentByMe &&
                  displayMessages.some(
                    (later) => later.authorId !== CURRENT_USER_ID && later.authorId !== "you" && later.authorId !== currentUid && later.kind !== "system"
                  );
                return (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    showAuthor={showAuthor}
                    photoMap={photoMap}
                    currentUid={currentUid}
                    isLastSentByMe={isLastSentByMe}
                    seenByOther={seenByOther}
                    conversationMemberReadAt={(conversation as any).memberReadAt}
                    onDeleteMessage={onDeleteMessage}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-icm-border bg-icm-panel p-3 space-y-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setDraftFile(file);
            // reset so the same file can be re-selected
            e.target.value = "";
          }}
        />

        {draftLinked && (
          <div className="rounded-lg border border-icm-border bg-icm-bg p-2 flex items-center gap-2">
            <RecordCard record={draftLinked} compact />
            <button
              onClick={() => setDraftLinked(null)}
              className="ml-auto w-7 h-7 rounded-lg hover:bg-icm-panel text-icm-text-dim flex items-center justify-center shrink-0"
              title="Remove"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {draftFile && (
          <div className="rounded-lg border border-icm-border bg-icm-bg px-3 py-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-icm-accent shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-geist font-semibold text-icm-text truncate">{draftFile.name}</p>
              <p className="text-[10.5px] text-icm-text-faint">
                {draftFile.size < 1024 * 1024
                  ? `${(draftFile.size / 1024).toFixed(1)} KB`
                  : `${(draftFile.size / (1024 * 1024)).toFixed(1)} MB`}
              </p>
            </div>
            <button
              onClick={() => setDraftFile(null)}
              className="w-6 h-6 rounded-lg hover:bg-icm-panel text-icm-text-dim flex items-center justify-center shrink-0"
              title="Remove"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="rounded-xl border border-icm-border bg-icm-bg">
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-icm-border relative">
            <ToolbarButton
              title="Attach file"
              keepFocus
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Mention a user"
              keepFocus
              onClick={() => {
                setDraft((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}@`);
                setShowMentionPicker(true);
              }}
            >
              <AtSign className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              title="Link a record"
              keepFocus
              onClick={() => setShowLinkPicker(!showLinkPicker)}
            >
              <Link2 className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Emoji" keepFocus onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
              <Smile className="w-3.5 h-3.5" />
            </ToolbarButton>

            {/* Divider */}
            <span className="w-px h-4 bg-icm-border mx-0.5 shrink-0" />

            {/* Voice input */}
            <ToolbarButton
              title={isRecording ? "Stop recording" : "Voice message"}
              keepFocus
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? (
                <span className="relative flex items-center justify-center w-3.5 h-3.5">
                  <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                  <Mic className="w-3.5 h-3.5 text-red-500" />
                </span>
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </ToolbarButton>

            {/* Help Me Write */}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setShowHelpWrite((v) => !v); setShowEmojiPicker(false); }}
              disabled={isRewriting}
              title="Help me write"
              className={cn(
                "h-7 px-2 rounded-lg flex items-center gap-1 text-[11.5px] font-geist font-semibold transition-colors",
                showHelpWrite
                  ? "bg-icm-accent/10 text-icm-accent"
                  : "hover:bg-icm-panel text-icm-text-dim hover:text-icm-text",
                isRewriting && "opacity-60 cursor-not-allowed"
              )}
            >
              {isRewriting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              <span>{isRewriting ? "Rewriting…" : "Help me write"}</span>
            </button>

            <span className="ml-auto text-[10.5px] font-geist text-icm-text-faint pr-1">
              Tip: type <span className="font-mono text-icm-accent">@AI</span> to ask AI inline
            </span>

            {showEmojiPicker && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowEmojiPicker(false)} />
                <EmojiPicker
                  onSelect={(e) => { setDraft((prev) => prev + e); setShowEmojiPicker(false); }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </>
            )}
            {showMentionPicker && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowMentionPicker(false)} />
                <MentionPicker
                  users={orgUsers}
                  onSelect={(s) => {
                    setDraft((prev) => {
                      // Strip any trailing @word the user may have typed before clicking the toolbar @
                      const cleaned = prev.replace(/@\w*$/, "");
                      return `${cleaned}${cleaned && !cleaned.endsWith(" ") ? " " : ""}@${s.name} `;
                    });
                    setShowMentionPicker(false);
                  }}
                  onClose={() => setShowMentionPicker(false)}
                />
              </>
            )}
            {showLinkPicker && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowLinkPicker(false)} />
                <LinkRecordPicker
                  onSelect={(r) => {
                    setDraftLinked(r);
                    setShowLinkPicker(false);
                  }}
                  onClose={() => setShowLinkPicker(false)}
                />
              </>
            )}
            {showHelpWrite && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowHelpWrite(false)} />
                <div className="absolute bottom-full right-0 mb-1 z-30 w-64 rounded-xl border border-icm-border bg-icm-panel shadow-elevated overflow-hidden">
                  <div className="px-3 py-2 border-b border-icm-border">
                    <p className="text-[10px] font-geist font-bold uppercase tracking-wider text-icm-text-faint">Help Me Write</p>
                    <p className="text-[11px] text-icm-text-dim mt-0.5">AI will rewrite your message</p>
                  </div>
                  {MSG_REWRITE_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => doRewrite(action.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-icm-bg text-left transition-colors"
                    >
                      <span className="text-[14px] shrink-0">{action.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-geist font-semibold text-icm-text">{action.label}</p>
                        <p className="text-[10.5px] text-icm-text-faint">{action.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Typing indicator */}
          {typingNames.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5">
              <span className="flex gap-0.5 items-end h-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-icm-text-faint animate-bounce"
                    style={{ height: "6px", animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
                  />
                ))}
              </span>
              <span className="text-[11px] text-icm-text-faint font-geist">
                {typingNames.length === 1
                  ? `${typingNames[0]} is typing…`
                  : typingNames.length === 2
                  ? `${typingNames[0]} and ${typingNames[1]} are typing…`
                  : "Several people are typing…"}
              </span>
            </div>
          )}

          <div className="flex items-end gap-2 p-2">
            <MentionInput
              value={draft}
              onChange={(value) => {
                setDraft(value);
                onTyping(value.trim().length > 0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (isRecording) stopRecording();
                  onTyping(false);
                  onSend();
                }
              }}
              placeholder={`Message ${name}…`}
              rows={1}
              className="flex-1 resize-none bg-transparent text-[13px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none min-h-[28px] max-h-[120px] py-1"
            />
            <button
              onClick={() => { if (isRecording) stopRecording(); onSend(); }}
              disabled={!draft.trim() && !draftLinked && !draftFile}
              className="w-8 h-8 rounded-lg bg-icm-accent text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90"
              title="Send"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Call overlay — rendered via portal so fixed inset-0 always covers full viewport ── */}
      {callState && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-gradient-to-b from-[#1a1a2e] to-[#16213e] py-14 px-6"
          style={{ fontFamily: "inherit" }}
        >
          {/* Top status */}
          <div className="flex flex-col items-center gap-1 text-white/50 text-[12px]">
            {callType === "video" ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            <span>{callType === "video" ? "Video call" : "Voice call"}</span>
          </div>

          {/* Contact */}
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              "w-28 h-28 rounded-full overflow-hidden transition-all",
              callState === "calling"
                ? "ring-4 ring-white/30 animate-pulse"
                : "ring-4 ring-[#4f83ff]/80 shadow-[0_0_40px_rgba(79,131,255,0.4)]"
            )}>
              {other && photoMap[(other as any).id] ? (
                <img src={photoMap[(other as any).id]} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#4f83ff] flex items-center justify-center text-white font-bold"
                  style={{ fontSize: "2.5rem" }}>
                  {other?.initials ?? name[0]}
                </div>
              )}
            </div>
            <p className="text-white font-bold" style={{ fontSize: "1.4rem" }}>{name}</p>
            <p className={callState === "calling" ? "text-white/50 text-sm animate-pulse" : "text-emerald-400 text-sm font-medium"}>
              {callState === "calling" ? "Calling…" : formatCallDuration(callDuration)}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-end gap-8">
            {/* Mute */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setCallMuted(!callMuted)}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                  callMuted ? "bg-white text-gray-900" : "bg-white/20 text-white hover:bg-white/30"
                )}
              >
                {callMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <span className="text-white/50 text-[11px]">{callMuted ? "Unmute" : "Mute"}</span>
            </div>

            {/* End call */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 flex items-center justify-center transition-colors shadow-lg"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
              <span className="text-white/50 text-[11px]">End</span>
            </div>

            {/* Speaker */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setCallSpeaker(!callSpeaker)}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                  callSpeaker ? "bg-white text-gray-900" : "bg-white/20 text-white hover:bg-white/30"
                )}
              >
                <Volume2 className="w-5 h-5" />
              </button>
              <span className="text-white/50 text-[11px]">Speaker</span>
            </div>

            {/* Upgrade to video (audio calls only) */}
            {callType === "audio" && (
              <div className="flex flex-col items-center gap-2">
                <button
                  className="w-14 h-14 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-colors"
                  onClick={() => setCallType("video")}
                >
                  <Video className="w-5 h-5" />
                </button>
                <span className="text-white/50 text-[11px]">Video</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function ToolbarButton({
  children,
  title,
  onClick,
  keepFocus = false,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
  /** When true, prevents the button from stealing focus from the textarea */
  keepFocus?: boolean;
}) {
  return (
    <button
      onMouseDown={keepFocus ? (e) => e.preventDefault() : undefined}
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-lg hover:bg-icm-panel text-icm-text-dim hover:text-icm-text flex items-center justify-center"
    >
      {children}
    </button>
  );
}

function HeaderMenuItem({
  children,
  destructive,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  destructive?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick ?? (() => {})}
      className={cn(
        "w-full text-left px-3 py-1.5 text-[12px] font-geist hover:bg-icm-bg flex items-center gap-2",
        destructive ? "text-icm-red" : "text-icm-text"
      )}
    >
      {icon && <span className="shrink-0 opacity-70">{icon}</span>}
      {children}
    </button>
  );
}

// ----- Single message bubble ----------------------------------------------

function MessageBubble({
  message,
  showAuthor,
  photoMap,
  currentUid,
  isLastSentByMe,
  seenByOther,
  conversationMemberReadAt,
  onDeleteMessage,
}: {
  message: ChatMessage;
  showAuthor: boolean;
  photoMap: Record<string, string>;
  currentUid: string;
  isLastSentByMe?: boolean;
  seenByOther?: boolean;
  conversationMemberReadAt?: Record<string, unknown>;
  onDeleteMessage?: (msgId: string) => void;
}) {
  const isMe = message.authorId === CURRENT_USER_ID || message.authorId === "you" || message.authorId === currentUid;
  const author = staffById[message.authorId] ?? {
    id: message.authorId,
    name: (message as any).authorName ?? "Supervisor",
    initials: ((message as any).authorName ?? "S").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    role: "supervisor" as const,
    title: "Supervisor",
    online: true,
  };
  const [hovered, setHovered] = useState(false);

  if (message.kind === "system") {
    return (
      <div className="flex justify-center">
        <span className="text-[11px] font-geist text-icm-text-faint italic">
          {message.systemText}
        </span>
      </div>
    );
  }

  // Deleted message display
  if ((message as any).deleted) {
    return (
      <div className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
        <div className={cn("max-w-[70%]", isMe ? "ml-auto" : "")}>
          <div className="px-3 py-1.5 rounded-2xl border border-icm-border bg-icm-bg/50 text-icm-text-faint text-[12px] font-geist italic">
            🗑 Message deleted
          </div>
        </div>
      </div>
    );
  }

  // Resolve the sender's photo: for me → photoMap by uid; for others → photoMap or senderAvatar stored on message
  const senderPhoto = isMe
    ? (photoMap[currentUid] ?? (message as any).senderAvatar ?? null)
    : (photoMap[message.authorId] ?? (message as any).senderAvatar ?? null);

  return (
    <div className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
      {!isMe && (
        <UserAvatar
          photoUrl={senderPhoto}
          initials={author.initials}
          tone={roleAvatarTone(author.role)}
          size="sm"
        />
      )}
      <div
        className={cn("max-w-[70%] flex flex-col relative", isMe ? "items-end" : "items-start")}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {showAuthor && !isMe && (
          <p className="text-[10.5px] font-geist text-icm-text-dim mb-0.5 ml-1">
            {author.name}
          </p>
        )}
        <BubbleBody message={message} isMe={isMe} />
        {/* Hover action bar */}
        {hovered && message.kind === "text" && (
          <div className={cn(
            "absolute -top-7 flex items-center gap-0.5 bg-icm-panel border border-icm-border rounded-lg px-1 py-0.5 shadow-sm z-10",
            isMe ? "right-0" : "left-0"
          )}>
            <button
              onClick={() => navigator.clipboard.writeText(message.text ?? "")}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-icm-bg text-icm-text-dim"
              title="Copy"
            >
              <Copy className="w-3 h-3" />
            </button>
            {isMe && (
              <button
                onClick={() => onDeleteMessage?.(message.id)}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-icm-bg text-icm-red"
                title="Delete message"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
        <div
          className={cn(
            "flex items-center gap-1 mt-0.5",
            isMe ? "flex-row-reverse mr-1" : "ml-1"
          )}
        >
          <span className="text-[10px] font-mono text-icm-text-faint">
            {message.timestamp}
          </span>
          {isMe && (
            <ReadReceipt
              receipt={message.receipt}
              isLastSentByMe={isLastSentByMe}
              seenByOther={seenByOther}
              memberReadAt={conversationMemberReadAt}
              currentUid={currentUid}
            />
          )}
        </div>
      </div>
      {isMe && (
        <UserAvatar
          photoUrl={senderPhoto}
          initials={author.initials}
          tone={roleAvatarTone(author.role)}
          size="sm"
        />
      )}
    </div>
  );
}

function BubbleBody({ message, isMe }: { message: ChatMessage; isMe: boolean }) {
  if (message.kind === "linked_record" && message.linkedRecord) {
    return <RecordCard record={message.linkedRecord} />;
  }

  if (message.kind === "ai_summary") {
    return (
      <div className="rounded-2xl rounded-bl-sm bg-icm-accent-soft border border-icm-accent/20 px-3 py-2 max-w-full">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-icm-accent" />
          <span className="text-[10.5px] font-geist font-bold text-icm-accent uppercase tracking-wider">
            AI Summary
          </span>
        </div>
        <p className="text-[12.5px] font-geist text-icm-text leading-relaxed">
          {message.aiTitle}
        </p>
        {message.aiHref && (
          <a
            href={message.aiHref}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-geist font-semibold text-icm-accent hover:underline"
          >
            View full report <ArrowRight className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  if (message.kind === "file") {
    return (
      <div className="rounded-2xl bg-icm-panel border border-icm-border px-3 py-2 flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-icm-text-dim" />
        <div>
          <p className="text-[12.5px] font-geist font-semibold text-icm-text">
            {message.fileName}
          </p>
          <p className="text-[10.5px] font-mono text-icm-text-faint">{message.fileSize}</p>
        </div>
      </div>
    );
  }

  // text
  return (
    <div
      className={cn(
        "px-3 py-1.5 max-w-full break-words",
        isMe
          ? "rounded-2xl rounded-br-sm bg-icm-accent text-white"
          : "rounded-2xl rounded-bl-sm bg-icm-panel border border-icm-border text-icm-text"
      )}
    >
      <p className="text-[12.5px] font-geist leading-relaxed whitespace-pre-wrap">
        {renderTextWithMentions(message.text ?? "", isMe)}
      </p>
    </div>
  );
}

function renderTextWithMentions(text: string, isMe: boolean) {
  // Highlight @Word tokens
  const parts = text.split(/(@[A-Za-z][A-Za-z0-9_]*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("@")) {
      return (
        <span
          key={i}
          className={cn(
            "font-bold",
            isMe ? "text-white" : "text-icm-accent"
          )}
        >
          {p}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function ReceiptIcon({ receipt }: { receipt: NonNullable<ChatMessage["receipt"]> }) {
  if (receipt === "delivered")
    return <Check className="w-3 h-3 text-icm-text-faint" />;
  if (receipt === "seen")
    return <CheckCheck className="w-3 h-3 text-icm-text-faint" />;
  return <CheckCheck className="w-3 h-3 text-icm-accent" />;
}

function ReadReceipt({
  receipt,
  isLastSentByMe,
  seenByOther,
  memberReadAt,
  currentUid,
}: {
  receipt?: ChatMessage["receipt"];
  isLastSentByMe?: boolean;
  seenByOther?: boolean;
  memberReadAt?: Record<string, unknown>;
  currentUid: string;
}) {
  // Blue double-check: other party has seen the message
  const blueCheck = (
    <span title="Seen" className="inline-flex items-center" style={{ color: "#4f83ff" }}>
      <CheckCheck style={{ width: 15, height: 15 }} />
    </span>
  );
  const greyCheck = (
    <span title="Sent" className="inline-flex items-center text-icm-text-faint">
      <Check style={{ width: 13, height: 13 }} />
    </span>
  );

  // seenByOther: someone in the conversation has replied → they've read everything before
  if (seenByOther) return blueCheck;

  // Firestore memberReadAt: check if any other user has explicitly opened the conversation
  if (isLastSentByMe && memberReadAt) {
    const otherUids = Object.keys(memberReadAt).filter((uid) => uid !== currentUid);
    if (otherUids.some((uid) => memberReadAt[uid] != null)) return blueCheck;
    return greyCheck;
  }

  // Mock receipts (for demo/seed conversations)
  if (!receipt || receipt === "delivered") return greyCheck;
  if (receipt === "seen") return blueCheck;
  return blueCheck; // "read" or any other value
}

const EMOJI_GROUPS = [
  { label: "Smileys", emojis: ["😀","😊","😂","🤣","😍","🥰","😎","🤔","😅","😬","🙏","👍","👎","👏","🎉","❤️","🔥","✅","⚠️","📋"] },
  { label: "Work", emojis: ["💼","📧","📞","🖥️","📊","📈","📝","✏️","📌","🗓️","⏰","🏆","🎯","💡","🔔","✔️","❌","🔄","📎","🔍"] },
];

function EmojiPicker({ onSelect }: { onSelect: (e: string) => void; onClose: () => void }) {
  return (
    <div
      className="absolute bottom-full left-20 mb-1 z-30 w-72 rounded-xl border border-icm-border bg-icm-panel shadow-elevated p-2"
    >
      {EMOJI_GROUPS.map((g) => (
        <div key={g.label} className="mb-2">
          <p className="text-[9px] font-geist font-semibold uppercase tracking-wider text-icm-text-faint px-1 mb-1">{g.label}</p>
          <div className="flex flex-wrap gap-0.5">
            {g.emojis.map((e) => (
              <button
                key={e}
                onClick={() => onSelect(e)}
                className="w-8 h-8 rounded-lg hover:bg-icm-bg text-[16px] flex items-center justify-center transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ----- Linked record card -------------------------------------------------

function recordIcon(kind: LinkedRecord["moduleIcon"]) {
  const cls = "w-3.5 h-3.5";
  switch (kind) {
    case "monitoring":
      return <ClipboardList className={cls} />;
    case "incident":
      return <AlertTriangle className={cls} />;
    case "isp":
    case "assessment":
    case "referral":
      return <FileText className={cls} />;
    case "note":
    default:
      return <ListChecks className={cls} />;
  }
}

function RecordCard({ record, compact }: { record: LinkedRecord; compact?: boolean }) {
  return (
    <a
      href={record.href}
      className={cn(
        "block rounded-lg border border-icm-border bg-icm-panel hover:border-icm-accent transition-colors",
        compact ? "px-2 py-1.5" : "px-3 py-2"
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded bg-icm-bg ring-1 ring-icm-border flex items-center justify-center text-icm-text-dim shrink-0">
          {recordIcon(record.moduleIcon)}
        </span>
        <span className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim">
          {record.moduleLabel}
        </span>
        <span className="text-icm-text-faint">·</span>
        <span className="text-[11.5px] font-geist font-semibold text-icm-text">
          {record.individualName}
        </span>
      </div>
      <p className="text-[12px] font-geist text-icm-text-dim mt-0.5">{record.detail}</p>
      <span className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-geist font-semibold text-icm-accent">
        View <ArrowRight className="w-3 h-3" />
      </span>
    </a>
  );
}

// ----- Mention picker (simple dropdown) -----------------------------------

function MentionPicker({
  users,
  onSelect,
  onClose,
}: {
  users: any[];
  onSelect: (s: { name: string; role: string }) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const filtered = users.filter((u) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="absolute bottom-full left-2 mb-1 z-30 w-64 rounded-xl border border-icm-border bg-icm-panel shadow-elevated py-1">
      <div className="px-2 pt-1 pb-2">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team members..."
          className="w-full h-7 px-2.5 rounded-lg border border-icm-border bg-icm-bg text-[12px] text-icm-text placeholder:text-icm-text-faint outline-none focus:border-icm-accent"
        />
      </div>
      {filtered.length === 0 && (
        <p className="px-3 py-2 text-[11px] text-icm-text-faint">No users found</p>
      )}
      {filtered.slice(0, 8).map((u) => (
        <button
          key={u.id}
          onClick={() => onSelect(u)}
          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-icm-bg text-left"
        >
          {u.photoURL ? (
            <img src={u.photoURL} alt="" className="w-6 h-6 rounded-lg object-cover" />
          ) : (
            <span className="w-6 h-6 rounded-lg bg-icm-accent/15 flex items-center justify-center text-[9px] font-bold text-icm-accent">
              {(u.name || u.displayName || "?")[0].toUpperCase()}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-icm-text truncate">{u.name || u.displayName}</p>
            <p className="text-[10.5px] text-icm-text-faint">{u.role?.replace(/_/g, " ")}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ----- Link record picker -------------------------------------------------

/** All module types that can be linked from a message */
const MODULE_TYPES: Array<{
  icon: LinkedRecord["moduleIcon"];
  label: string;
  path: string;
  getDetail: (ind: Individual) => string;
}> = [
  {
    icon: "note",
    label: "Contact Note",
    path: "contact-note",
    getDetail: (ind) =>
      ind.last_visit_date ? `Last visit: ${ind.last_visit_date}` : "No visits yet",
  },
  {
    icon: "monitoring",
    label: "Monitoring Form",
    path: "monitoring-form",
    getDetail: (ind) =>
      ind.isp_due_date ? `Due ${ind.isp_due_date}` : "No upcoming forms",
  },
  {
    icon: "isp",
    label: "Care Plan / ISP",
    path: "care-plan",
    getDetail: (ind) =>
      ind.isp_due_date ? `ISP due ${ind.isp_due_date}` : "Up to date",
  },
  {
    icon: "incident",
    label: "Incident",
    path: "incident-reporting",
    getDetail: (ind) =>
      ind.open_incidents ? `${ind.open_incidents} open incident(s)` : "No open incidents",
  },
  {
    icon: "assessment",
    label: "Assessment",
    path: "assessments",
    getDetail: () => "View latest assessment",
  },
  {
    icon: "referral",
    label: "Referral",
    path: "referrals",
    getDetail: () => "View referral",
  },
];

function buildRecordsFromIndividuals(individuals: Individual[]): LinkedRecord[] {
  const records: LinkedRecord[] = [];
  for (const ind of individuals) {
    const fullName = `${ind.first_name} ${ind.last_name}`;
    for (const mod of MODULE_TYPES) {
      records.push({
        moduleIcon: mod.icon,
        moduleLabel: mod.label,
        individualName: fullName,
        detail: mod.getDetail(ind),
        href: `/people/${ind.id}/${mod.path}`,
      });
    }
  }
  return records;
}

function LinkRecordPicker({
  onSelect,
  onClose,
}: {
  onSelect: (r: LinkedRecord) => void;
  onClose: () => void;
}) {
  const { individuals } = useIndividuals();
  const [search, setSearch] = React.useState("");

  const allRecords = React.useMemo(
    () => buildRecordsFromIndividuals(individuals),
    [individuals]
  );

  const filtered = React.useMemo(() => {
    if (!search.trim()) {
      // Default: show one entry per individual (Contact Note) to keep it scannable
      return individuals
        .slice(0, 8)
        .map((ind) => ({
          moduleIcon: "note" as LinkedRecord["moduleIcon"],
          moduleLabel: "Contact Note",
          individualName: `${ind.first_name} ${ind.last_name}`,
          detail: ind.last_visit_date ? `Last visit: ${ind.last_visit_date}` : "No visits yet",
          href: `/people/${ind.id}/contact-note`,
        }));
    }
    const q = search.toLowerCase();
    return allRecords
      .filter(
        (r) =>
          r.individualName.toLowerCase().includes(q) ||
          r.moduleLabel.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [search, allRecords, individuals]);

  return (
    <div className="absolute bottom-full left-12 mb-1 z-30 w-80 rounded-xl border border-icm-border bg-icm-panel shadow-elevated overflow-hidden">
      {/* Search */}
      <div className="px-2 pt-2 pb-1.5 border-b border-icm-border">
        <div className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-icm-bg border border-icm-border focus-within:border-icm-accent">
          <Search className="w-3 h-3 text-icm-text-faint shrink-0" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or record type…"
            className="flex-1 bg-transparent text-[12px] text-icm-text placeholder:text-icm-text-faint outline-none"
          />
        </div>
      </div>

      {/* Results */}
      <div className="max-h-56 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-[11px] text-icm-text-faint text-center">No records found</p>
        ) : (
          filtered.map((r, i) => (
            <button
              key={i}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(r)}
              className="w-full flex items-start gap-2 px-3 py-1.5 hover:bg-icm-bg text-left transition-colors"
            >
              <span className="w-5 h-5 rounded bg-icm-bg ring-1 ring-icm-border flex items-center justify-center text-icm-text-dim shrink-0 mt-0.5">
                {recordIcon(r.moduleIcon)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11.5px] font-geist font-semibold text-icm-text truncate">
                  {r.individualName}
                  <span className="font-normal text-icm-text-dim"> · {r.moduleLabel}</span>
                </p>
                <p className="text-[10.5px] font-geist text-icm-text-faint truncate">{r.detail}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {!search && individuals.length > 8 && (
        <p className="px-3 py-1.5 text-[10px] text-icm-text-faint border-t border-icm-border">
          Showing 8 of {individuals.length} people — type to search all
        </p>
      )}
    </div>
  );
}

// ----- New message modal --------------------------------------------------

function NewMessageModal({
  users,
  onClose,
  onCreate,
}: {
  users: any[];
  onClose: () => void;
  onCreate: (memberIds: string[], groupName: string | undefined, firstMessage: string) => void;
}) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [staffList, setStaffList] = useState<any[]>([]);

  const { currentUser, userProfile } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    const fetchStaff = async () => {
      try {
        const orgId = userProfile?.organizationId || (currentUser as any).organizationId;
        const q = query(
          collection(db, 'users'),
          where('organizationId', '==', orgId),
          where('isActive', '==', true)
        );
        const snapshot = await getDocs(q);
        const staff = snapshot.docs
          .map(d => {
            const data = d.data();
            return {
              id: d.id,
              uid: data.uid ?? d.id,
              firstName: data.firstName ?? "",
              lastName: data.lastName ?? "",
              name: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
              email: data.email ?? "",
              role: data.role ?? "case_manager",
              photoURL: data.photoURL ?? data.photo
                ?? `https://i.pravatar.cc/64?u=${encodeURIComponent(data.email || d.id)}`,
              ...data
            };
          })
          .filter(u => u.uid !== currentUser.uid && u.id !== currentUser.uid);
        setStaffList(staff);
      } catch (err) {
        console.error("Error loading staff:", err);
      }
    };
    fetchStaff();
  }, [currentUser, userProfile]);

  const matches = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return staffList.filter((u) => !recipients.includes(u.id));
    return staffList.filter((u) => {
      if (recipients.includes(u.id)) return false;
      const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
      return (
        fullName.includes(term) ||
        (u.email || "").toLowerCase().includes(term)
      );
    });
  }, [staffList, recipients, search]);

  const isGroup = recipients.length > 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-icm-panel border border-icm-border shadow-elevated overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-icm-border">
          <p className="font-manrope font-bold text-[15px] text-icm-text">New Message</p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              To
            </label>
            <div className="mt-1 rounded-lg border border-icm-border bg-icm-bg px-2 py-1.5 flex flex-wrap gap-1.5 min-h-[40px]">
              {recipients.map((id) => {
                const s = staffList.find((u) => u.id === id) || users.find((u) => u.id === id) || staffById[id] || {
                  id,
                  name: "Unknown",
                  role: "case_manager" as const,
                };
                return (
                  <span
                    key={id}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-geist font-semibold ring-1",
                      roleAvatarTone(s.role)
                    )}
                  >
                    {s.name}
                    <button
                      onClick={() => setRecipients(recipients.filter((r) => r !== id))}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={recipients.length === 0 ? "Search staff..." : ""}
                className="flex-1 min-w-[120px] bg-transparent text-[12.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none"
              />
            </div>
            {matches.length > 0 && (
              <div className="mt-1 rounded-lg border border-icm-border bg-icm-panel max-h-48 overflow-y-auto">
                {matches.map((s) => {
                  const initials = `${s.firstName?.[0] ?? ""}${s.lastName?.[0] ?? ""}`.toUpperCase();
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setRecipients([...recipients, s.id]);
                        setSearch("");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-icm-bg text-left border-b border-icm-border/40 last:border-b-0"
                    >
                      {s.photoURL ? (
                        <img src={s.photoURL} alt={s.name} className="w-7 h-7 rounded-lg object-cover" />
                      ) : (
                        <span className={cn("w-7 h-7 rounded-lg ring-1 flex items-center justify-center text-[10px] font-geist font-bold shrink-0", roleAvatarTone(s.role))}>
                          {initials || "??"}
                        </span>
                      )}
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[12px] font-geist font-bold text-icm-text truncate">
                            {s.name}
                          </p>
                          <p className="text-[10.5px] font-geist text-icm-text-faint truncate">
                            {s.email}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-geist font-bold ring-1 shrink-0 uppercase tracking-wider",
                            roleAvatarTone(s.role)
                          )}
                        >
                          {roleLabel(s.role)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {isGroup && (
            <div>
              <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
                Group name (optional)
              </label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Joseph Brown — Quarterly Review"
                className="mt-1 w-full h-9 px-2.5 rounded-lg border border-icm-border bg-icm-bg text-[12.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent"
              />
            </div>
          )}

        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-icm-border">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (recipients.length === 0) return;
              onCreate(recipients, groupName.trim() || undefined, "");
            }}
            disabled={recipients.length === 0}
            className="h-8 px-3 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-semibold disabled:opacity-40 hover:bg-teal-700"
          >
            Start conversation
          </button>
        </div>
      </div>
    </div>
  );
}

export default Messages;
