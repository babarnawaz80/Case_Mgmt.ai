import { useCallback, useEffect, useState } from "react";
import {
  seedAlerts,
  seedMentions,
  type AlertItem,
  type MentionItem,
} from "@/data/notifications";

// Lightweight global store using a module-level state + subscribers so that
// the bell dropdown in the topbar and the My Work page stay in sync without
// adding any new dependencies.

type Listener = () => void;
const listeners = new Set<Listener>();

let alerts: AlertItem[] = seedAlerts.slice();
let mentions: MentionItem[] = seedMentions.slice();

function emit() {
  listeners.forEach((l) => l());
}

function setAlerts(updater: (prev: AlertItem[]) => AlertItem[]) {
  alerts = updater(alerts);
  emit();
}

function setMentions(updater: (prev: MentionItem[]) => MentionItem[]) {
  mentions = updater(mentions);
  emit();
}

export function useNotifications() {
  const [, force] = useState(0);

  useEffect(() => {
    const cb = () => force((n) => n + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const markAlertRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  }, []);
  const markAlertUnread = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: false } : a)));
  }, []);
  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, dismissed: true } : a)));
  }, []);
  const markAllAlertsRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }, []);
  const clearDismissedAlerts = useCallback(() => {
    setAlerts((prev) => prev.filter((a) => !a.dismissed));
  }, []);

  const markMentionRead = useCallback((id: string) => {
    setMentions((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
  }, []);
  const markMentionUnread = useCallback((id: string) => {
    setMentions((prev) => prev.map((m) => (m.id === id ? { ...m, read: false } : m)));
  }, []);
  const dismissMention = useCallback((id: string) => {
    setMentions((prev) => prev.map((m) => (m.id === id ? { ...m, dismissed: true } : m)));
  }, []);
  const markAllMentionsRead = useCallback(() => {
    setMentions((prev) => prev.map((m) => ({ ...m, read: true })));
  }, []);

  const unreadAlerts = alerts.filter((a) => !a.read && !a.dismissed).length;
  const unreadMentions = mentions.filter((m) => !m.read && !m.dismissed).length;
  const unreadTotal = unreadAlerts + unreadMentions;

  return {
    alerts,
    mentions,
    unreadAlerts,
    unreadMentions,
    unreadTotal,
    markAlertRead,
    markAlertUnread,
    dismissAlert,
    markAllAlertsRead,
    clearDismissedAlerts,
    markMentionRead,
    markMentionUnread,
    dismissMention,
    markAllMentionsRead,
  };
}
