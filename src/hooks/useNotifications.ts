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
//
// Read/dismissed state is persisted to localStorage so dismissals survive
// page refresh. Only the state deltas (read/dismissed flags) are stored —
// the seed data still provides the full item list each time.

type Listener = () => void;
const listeners = new Set<Listener>();

const LS_KEY = "icm_notifications_v1";

type PersistedState = {
  alerts: Record<string, { read?: boolean; dismissed?: boolean }>;
  mentions: Record<string, { read?: boolean; dismissed?: boolean }>;
};

function loadPersistedState(): PersistedState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as PersistedState;
  } catch {}
  return { alerts: {}, mentions: {} };
}

function savePersistedState(state: PersistedState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

function applyPersistedAlerts(items: AlertItem[]): AlertItem[] {
  const saved = loadPersistedState().alerts;
  return items.map((a) =>
    saved[a.id]
      ? { ...a, read: saved[a.id].read ?? a.read, dismissed: saved[a.id].dismissed ?? a.dismissed }
      : a
  );
}

function applyPersistedMentions(items: MentionItem[]): MentionItem[] {
  const saved = loadPersistedState().mentions;
  return items.map((m) =>
    saved[m.id]
      ? { ...m, read: saved[m.id].read ?? m.read, dismissed: saved[m.id].dismissed ?? m.dismissed }
      : m
  );
}

let alerts: AlertItem[] = applyPersistedAlerts(seedAlerts.slice());
let mentions: MentionItem[] = applyPersistedMentions(seedMentions.slice());

function emit() {
  listeners.forEach((l) => l());
}

function persistCurrentState() {
  const alertsState: PersistedState["alerts"] = {};
  const mentionsState: PersistedState["mentions"] = {};
  alerts.forEach((a) => {
    if (a.read || a.dismissed) alertsState[a.id] = { read: a.read, dismissed: a.dismissed };
  });
  mentions.forEach((m) => {
    if (m.read || m.dismissed) mentionsState[m.id] = { read: m.read, dismissed: m.dismissed };
  });
  savePersistedState({ alerts: alertsState, mentions: mentionsState });
}

function setAlerts(updater: (prev: AlertItem[]) => AlertItem[]) {
  alerts = updater(alerts);
  persistCurrentState();
  emit();
}

function setMentions(updater: (prev: MentionItem[]) => MentionItem[]) {
  mentions = updater(mentions);
  persistCurrentState();
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
