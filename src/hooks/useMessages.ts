import { useCallback, useEffect, useState } from "react";
import {
  CURRENT_USER_ID,
  seedConversations,
  seedMessages,
  type ChatMessage,
  type Conversation,
} from "@/data/messages";

// Simple module-level store with subscribers, matching useNotifications.
// No new deps; keeps the sidebar badge and the messages page in sync.

type Listener = () => void;
const listeners = new Set<Listener>();

let conversations: Conversation[] = seedConversations.slice();
let messages: ChatMessage[] = seedMessages.slice();

function emit() {
  listeners.forEach((l) => l());
}

function setConversations(updater: (prev: Conversation[]) => Conversation[]) {
  conversations = updater(conversations);
  emit();
}

function setMessages(updater: (prev: ChatMessage[]) => ChatMessage[]) {
  messages = updater(messages);
  emit();
}

let nextMsgId = 1000;
function newMsgId() {
  nextMsgId += 1;
  return `m-new-${nextMsgId}`;
}
let nextConvId = 1000;
function newConvId() {
  nextConvId += 1;
  return `c-new-${nextConvId}`;
}

export function useMessages() {
  const [, force] = useState(0);

  useEffect(() => {
    const cb = () => force((n) => n + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setConversations((prev) => prev.map((c) => ({ ...c, unread: 0 })));
  }, []);

  const sendMessage = useCallback(
    (
      conversationId: string,
      payload: {
        text?: string;
        kind?: ChatMessage["kind"];
        linkedRecord?: ChatMessage["linkedRecord"];
        aiTitle?: string;
        aiHref?: string;
      }
    ) => {
      const id = newMsgId();
      const message: ChatMessage = {
        id,
        conversationId,
        authorId: CURRENT_USER_ID,
        kind: payload.kind ?? "text",
        text: payload.text,
        linkedRecord: payload.linkedRecord,
        aiTitle: payload.aiTitle,
        aiHref: payload.aiHref,
        timestamp: "Just now",
        dayBucket: "today",
        dayLabel: "Today",
        receipt: "delivered",
      };
      setMessages((prev) => [...prev, message]);

      const preview =
        payload.kind === "linked_record"
          ? `📋 ${payload.linkedRecord?.moduleLabel} · ${payload.linkedRecord?.individualName}`
          : payload.kind === "ai_summary"
            ? `✨ AI: ${payload.aiTitle ?? ""}`
            : (payload.text ?? "");
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastPreview: preview,
                lastTimestamp: "Just now",
                lastWasYou: true,
              }
            : c
        )
      );
      return id;
    },
    []
  );

  const createConversation = useCallback(
    (memberIds: string[], groupName?: string) => {
      const allIds = Array.from(new Set([CURRENT_USER_ID, ...memberIds]));
      // If a direct conv already exists between these two, reuse it.
      if (allIds.length === 2) {
        const existing = conversations.find(
          (c) =>
            c.type === "direct" &&
            c.memberIds.length === 2 &&
            allIds.every((id) => c.memberIds.includes(id))
        );
        if (existing) return existing.id;
      }
      const id = newConvId();
      const conv: Conversation = {
        id,
        type: allIds.length > 2 ? "group" : "direct",
        memberIds: allIds,
        groupName: allIds.length > 2 ? groupName : undefined,
        lastPreview: "Conversation started",
        lastTimestamp: "Just now",
        lastWasYou: true,
        unread: 0,
      };
      setConversations((prev) => [conv, ...prev]);
      return id;
    },
    []
  );

  const renameGroup = useCallback((conversationId: string, name: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId && c.type === "group"
          ? { ...c, groupName: name.trim() || undefined }
          : c
      )
    );
  }, []);

  const messagesForConversation = useCallback(
    (conversationId: string): ChatMessage[] =>
      messages.filter((m) => m.conversationId === conversationId),
    []
  );

  const unreadTotal = conversations.reduce(
    (acc, c) => acc + (c.muted ? 0 : c.unread),
    0
  );

  return {
    conversations,
    messages,
    unreadTotal,
    markConversationRead,
    markAllRead,
    sendMessage,
    createConversation,
    renameGroup,
    messagesForConversation,
  };
}
