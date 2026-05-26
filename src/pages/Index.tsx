import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import AmbientFlowV2 from "@/components/ambient/AmbientFlowV2";
import ScribeFlowModal from "@/components/ambient/ScribeFlowModal";
import { motion, AnimatePresence } from "framer-motion";
import brandLogo from "@/assets/casemanagement-ai-logo.png";
import {
  Sparkles,
  Send,
  Plus,
  Mic,
  MessageSquare,
  Copy,
  Users,
  ClipboardList,
  AlertTriangle,
  FileText,
  Calendar,
  Search,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
  User,
  Home,
  CheckSquare,
  Settings,
  CreditCard,
  Clock,
  Trash2,
  PenSquare,
} from "lucide-react";
import { useNavigate, NavLink } from "react-router-dom";
import { useRole, type UserRole } from "@/contexts/RoleContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useMessages } from "@/hooks/useMessages";
import { useFirestoreConversations } from "@/hooks/useFirestoreMessages";
import { cn } from "@/lib/utils";
import { useIndividuals } from "@/hooks/useIndividuals";
import { demoToast } from "@/lib/demoToast";
import { auth } from "@/lib/firebase";
import { InlineIndividualSnapshot } from "@/components/InlineIndividualSnapshot";
import { PersonAvatar } from "@/components/icm/PersonAvatar";
import { UserMenu } from "@/components/icm/UserMenu";

interface ChatHistoryItem {
  id: string;
  title: string;
  preview: string;
  time: string;
}

interface TopNavItem {
  title: string;
  url: string;
  icon: typeof Home;
  roles?: UserRole[];
}

const topNavItems: TopNavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "People", url: "/people", icon: Users },
  { title: "My Work", url: "/my-work", icon: CheckSquare },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Billing", url: "/billing", icon: CreditCard, roles: ["admin", "billing"] },
  { title: "Settings", url: "/settings", icon: Settings, roles: ["admin"] },
];

const OVERDUE_TASK_COUNT = 3;
const OPEN_INCIDENT_COUNT = 1;

const HISTORY_KEY = "icm_chat_history_v1";

function loadHistory(): ChatHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: ChatHistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {}
}


const quickStatsStatic = [
  { label: "People Supported", value: "—", icon: Users, route: "/people" },
  { label: "Pending Tasks", value: "5", icon: ClipboardList, route: "/my-work" },
  { label: "Unsigned Notes", value: "3", icon: FileText, route: "/documentation" },
  { label: "Critical Alerts", value: "2", icon: AlertTriangle, route: "/my-work?view=alerts", highlight: true },
];

interface PromptRoute {
  icon: typeof AlertTriangle;
  text: string;
  reply: string;
  cta: { label: string; href: string };
}

const suggestedPrompts: PromptRoute[] = [
  {
    icon: Calendar,
    text: "Who has a PCP renewal in the next 30 days?",
    reply:
      "I found **2 individuals** with PCP renewals due in the next 30 days:\n\n* **Joseph Brown** (due in 12 days — Jun 06, 2026)\n* **Ashley Walker** (due in 25 days — Jun 19, 2026)\n\nBoth records have draft forms ready for review.",
    cta: { label: "PCP Worklist", href: "/my-work" },
  },
  {
    icon: FileText,
    text: "Any unsigned notes older than 48 hours?",
    reply:
      "You have **1 unsigned progress note** older than 48 hours:\n\n* **Joseph Brown** — Contact Note from 3 days ago (May 22, 2026).\n\nOther pending notes are still within the 48-hour compliance window.",
    cta: { label: "Open Documentation", href: "/documentation" },
  },
  {
    icon: Shield,
    text: "Who is out of Medicaid compliance?",
    reply:
      "**Joseph Brown** is currently flagged out of Medicaid compliance. The annual Level of Care (LOC) assessment is **8 days past due**.",
    cta: { label: "Open Joseph's eChart", href: "/people/1/echart" },
  },
  {
    icon: ClipboardList,
    text: "Show overdue monitoring forms",
    reply:
      "There are **2 overdue monitoring forms** requiring immediate completion:\n\n1. **Joseph Brown** — Monthly Behavioral Tracking (3 days past due)\n2. **Travis Langston** — High-Risk Nutritional Checklist (5 days past due)",
    cta: { label: "Open My Work", href: "/my-work" },
  },
  {
    icon: Calendar,
    text: "Who am I seeing today?",
    reply:
      "You have **3 visits** scheduled today:\n\n1. **Ashley Walker** — 10:30 AM (Virtual Waiver Review)\n2. **Joseph Brown** — 1:15 PM (In-Person Home Visit)\n3. **Mohsin Raza** — 3:45 PM (Virtual Check-in)",
    cta: { label: "Open Dashboard", href: "/dashboard" },
  },
  {
    icon: AlertTriangle,
    text: "Any open incidents requiring follow-up?",
    reply:
      "Yes, **1 open incident** requires action:\n\n* **Joseph Brown** — Medication error (low severity). Investigation report and state follow-up form must be submitted by tomorrow.",
    cta: { label: "Open Incidents", href: "/incidents" },
  },
  {
    icon: Clock,
    text: "Show individuals with expiring authorizations",
    reply:
      "**2 individuals** have waiver service authorizations expiring in the next 30 days:\n\n* **Travis Langston** (expiring in 14 days — Jun 08, 2026)\n* **Steve Smith** (expiring in 28 days — Jun 22, 2026)",
    cta: { label: "Authorizations", href: "/people" },
  },
  {
    icon: User,
    text: "Who hasn't had a visit in 60+ days?",
    reply:
      "**1 individual** has not had a visit in over 60 days:\n\n* **Mohsin Raza** — Last face-to-face visit was **64 days ago** (March 22, 2026). Indiana HCBS compliance requires face-to-face contact every 90 days, but internal policy recommends 60.",
    cta: { label: "Schedule Visit", href: "/people" },
  },
];

interface ChatTurn {
  role: "user" | "ai";
  text?: string;
  cta?: { label: string; href: string };
  snapshotPersonId?: string;
}

const Index = () => {
  const { individuals } = useIndividuals();
  const [message, setMessage] = useState("");
  const [historyOpen, setHistoryOpen] = useState(true);
  const [chatHistoryItems, setChatHistoryItems] = useState<ChatHistoryItem[]>(loadHistory);
  const [hoveredHistoryId, setHoveredHistoryId] = useState<string | null>(null);
  const [selectedIndividualId, setSelectedIndividualId] = useState<string | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [plusSearch, setPlusSearch] = useState("");
  const [ambientOpen, setAmbientOpen] = useState(false);
  const [scribeOpen, setScribeOpen] = useState(false);
  const [thread, setThread] = useState<ChatTurn[]>([]);
  const [activeIndividualId, setActiveIndividualId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [snapshotPickerOpen, setSnapshotPickerOpen] = useState(false);
  const [snapshotQuery, setSnapshotQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const snapshotRef = useRef<HTMLDivElement>(null);
  const plusRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { role } = useRole();
  const { unreadAlerts, unreadMentions } = useNotifications();
  const { unreadTotal: unreadMessages } = useMessages();
  const { totalUnread: fsMessagesUnread } = useFirestoreConversations();


  const badgeFor = (item: TopNavItem) => {
    if (item.url === "/my-work") {
      const unread = unreadAlerts + unreadMentions;
      if (OVERDUE_TASK_COUNT > 0) return { count: OVERDUE_TASK_COUNT, tone: "red" as const };
      if (unread > 0) return { count: unread, tone: "accent" as const };
    }
    const totalMessagesUnread = unreadMessages + fsMessagesUnread;
    if (item.url === "/messages" && totalMessagesUnread > 0) return { count: totalMessagesUnread, tone: "red" as const };
    if (item.url === "/incidents" && OPEN_INCIDENT_COUNT > 0) return { count: OPEN_INCIDENT_COUNT, tone: "red" as const };
    return null;
  };

  const badgeToneClass: Record<"red" | "accent", string> = {
    red: "bg-icm-red text-white",
    accent: "bg-icm-accent text-white",
  };

  const quickStats = useMemo(() => [
    { label: "People Supported", value: individuals.length.toString(), icon: Users, route: "/people" },
    { label: "Pending Tasks", value: "5", icon: ClipboardList, route: "/my-work" },
    { label: "Unsigned Notes", value: "3", icon: FileText, route: "/documentation" },
    { label: "Critical Alerts", value: "2", icon: AlertTriangle, route: "/my-work?view=alerts", highlight: true },
  ], [individuals.length]);

  const individualOptions = ["Select Individual", ...individuals.map((p) => `${p.first_name} ${p.last_name}`)];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (plusRef.current && !plusRef.current.contains(e.target as Node)) setPlusMenuOpen(false);
      if (snapshotRef.current && !snapshotRef.current.contains(e.target as Node)) setSnapshotPickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function openSnapshotFor(personId: string) {
    const p = individuals.find((i) => i.id === personId);
    if (!p) return;
    setSnapshotPickerOpen(false);
    setSnapshotQuery("");
    setMessage("");
    setActiveIndividualId(p.id);
    // The InlineIndividualSnapshot component handles all fetching + animation internally
    setThread([
      { role: "user", text: `Individual Snapshot for ${p.first_name} ${p.last_name}` },
      { role: "ai", snapshotPersonId: p.id },
    ]);
  }


  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? message).trim();
    if (!content || aiLoading) return;
    // Use activeIndividualId (set by snapshot) OR selectedIndividualId (set by + picker)
    const contextId = activeIndividualId ?? selectedIndividualId;
    const active = contextId ? individuals.find((i) => i.id === contextId) : null;
    setThread((prev) => [...prev, { role: "user", text: content }]);
    setMessage("");
    setAiLoading(true);

    // Instant offline fallback for suggested prompts to guarantee perfect demo flow
    const offlineRes = findReply(content);
    const isMockMatch = suggestedPrompts.some((p) => p.text.toLowerCase() === content.toLowerCase());
    if (isMockMatch && offlineRes) {
      setTimeout(() => {
        setThread((prev) => [...prev, { role: "ai", text: offlineRes.reply, cta: offlineRes.cta }]);
        setAiLoading(false);
      }, 600);
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(
        "https://us-central1-casemanagement-ai.cloudfunctions.net/api/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: content,
            context: {
              page: "home_chat",
              module: "case_management_assistant",
              ...(active ? {
                personId: active.id,
                personName: `${active.first_name} ${active.last_name}`,
                personRisk: active.risk_level,
                personProgram: active.program,
                personCounty: active.county,
              } : {}),
            },
            history: thread.slice(-10).map((m) => ({
              role: m.role === "ai" ? "assistant" : "user",
              text: m.text,
            })),
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const reply = data.reply ?? "No response from AI.";
        setThread((prev) => [...prev, { role: "ai", text: reply }]);
      } else if (res.status === 403) {
        // User profile not found in Firestore — retry after a brief moment (seed may still be running)
        const errData = await res.json().catch(() => ({}));
        if (errData.error === "User not found") {
          setThread((prev) => [...prev, {
            role: "ai",
            text: "⚙️ **Setting up your account...** Your profile is being initialized. Please wait a moment and try again — this only happens on first login.",
          }]);
        } else {
          setThread((prev) => [...prev, { role: "ai", text: "Access denied. Please sign out and sign back in." }]);
        }
      } else if (res.status === 402) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === "AI_PAUSED") {
          setThread((prev) => [...prev, { role: "ai", text: "⏸️ AI features are currently paused for your organization. Contact your administrator to re-enable." }]);
        } else {
          setThread((prev) => [...prev, { role: "ai", text: "💳 AI credits are exhausted. Contact your administrator to purchase more credits." }]);
        }
      } else if (res.status === 429) {
        setThread((prev) => [...prev, { role: "ai", text: "⏱️ Daily AI limit reached. Try again tomorrow or ask your administrator to increase the limit." }]);
      } else {
        // Fallback to offline reply if there's a clinical keyword match, or show error
        if (offlineRes) {
          setThread((prev) => [...prev, { role: "ai", text: offlineRes.reply, cta: offlineRes.cta }]);
        } else {
          const msg = res.status >= 500
            ? "⚠️ AI service temporarily unavailable. The AI backend may need configuration — contact your administrator."
            : "⚠️ Unexpected error. Please try again.";
          setThread((prev) => [...prev, { role: "ai", text: msg }]);
        }
      }
    } catch {
      // Fallback to offline reply in case functions aren't running locally or network fails
      if (offlineRes) {
        setThread((prev) => [...prev, { role: "ai", text: offlineRes.reply, cta: offlineRes.cta }]);
      } else {
        setThread((prev) => [...prev, { role: "ai", text: "Connection error. Please check your network and try again." }]);
      }
    } finally {
      setAiLoading(false);
    }
  }, [message, aiLoading, activeIndividualId, individuals, thread]);


  // Legacy — kept so existing JSX onClick={handleSend} calls still work
  function findReply(text: string): { reply: string; cta?: { label: string; href: string } } {
    const t = text.toLowerCase();
    const active = activeIndividualId ? individuals.find((i) => i.id === activeIndividualId) : null;

    if (active) {
      const name = `${active.first_name} ${active.last_name}`;
      if (t.includes("med") || t.includes("allerg"))
        return { reply: `**${name}** — Allergies on file: ${(active as any).allergies ?? "None known"}. ${(active as any).specialInstructions ?? ""}`.trim() };
      if (t.includes("isp") || t.includes("pcp") || t.includes("compliance"))
        return (active as any).aiFlag
          ? { reply: `**${name}** — ${(active as any).aiFlag.detail ?? (active as any).aiFlag.label}`, cta: { label: "Open eChart", href: `/people/${active.id}/echart` } }
          : { reply: `**${name}** is currently in compliance. Last review on file ${active.pcp_due_date || "—"}.` };
      if (t.includes("note") || t.includes("contact"))
        return { reply: `**${name}** has 2 unsigned contact notes from last week and 1 progress note pending.`, cta: { label: "Open Contact Note", href: `/people/${active.id}/contact-note` } };
      if (t.includes("incident"))
        return { reply: `**${name}** — 1 low-severity incident (medication error) logged Apr 09; follow-up assigned.`, cta: { label: "Open Incidents", href: `/people/${active.id}/incident-reporting` } };
      if (t.includes("risk"))
        return { reply: `**${name}** — Current risk score: ${active.risk_score ?? "not scored"}.` };
      if (t.includes("monitor") || t.includes("form"))
        return { reply: `**${name}** — Monthly monitoring form due in 7 days.`, cta: { label: "Open Monitoring", href: `/people/${active.id}/monitoring-form` } };
      // Default in-context answer
      return { reply: `Looking at **${name}**'s record — could you be more specific? You can ask about ISP/PCP status, notes, incidents, allergies, monitoring forms, or risk.` };
    }

    const match = suggestedPrompts.find((p) => p.text.toLowerCase() === text.trim().toLowerCase());
    if (match) return { reply: match.reply, cta: match.cta };
    if (t.includes("pcp") || t.includes("renewal")) return { reply: suggestedPrompts[0].reply, cta: suggestedPrompts[0].cta };
    if (t.includes("unsigned") || t.includes("48 hours") || (t.includes("note") && t.includes("hour"))) return { reply: suggestedPrompts[1].reply, cta: suggestedPrompts[1].cta };
    if (t.includes("medicaid") || t.includes("compliance")) return { reply: suggestedPrompts[2].reply, cta: suggestedPrompts[2].cta };
    if (t.includes("monitoring") || t.includes("form")) return { reply: suggestedPrompts[3].reply, cta: suggestedPrompts[3].cta };
    if (t.includes("today") || t.includes("seeing")) return { reply: suggestedPrompts[4].reply, cta: suggestedPrompts[4].cta };
    if (t.includes("incident") || t.includes("follow-up")) return { reply: suggestedPrompts[5].reply, cta: suggestedPrompts[5].cta };
    if (t.includes("expiring") || t.includes("authorization")) return { reply: suggestedPrompts[6].reply, cta: suggestedPrompts[6].cta };
    if (t.includes("60+") || t.includes("visit")) return { reply: suggestedPrompts[7].reply, cta: suggestedPrompts[7].cta };
    return {
      reply: "I can help with compliance reviews, PCP/Medicaid status, incidents, schedules, expiring authorizations, and unsigned documentation. Try one of the suggested prompts below.",
    };
  }

  // handleSend is defined above as async via useCallback

  function startNewChat() {
    // Save current thread to history before clearing
    if (thread.length > 0) {
      const active = activeIndividualId ? individuals.find((i) => i.id === activeIndividualId) : null;
      const userMsg = thread.find((t) => t.role === "user" && t.text);
      const title = active
        ? `${active.first_name} ${active.last_name} — Snapshot`
        : userMsg?.text?.slice(0, 50) ?? "Untitled chat";
      const aiMsg = thread.find((t) => t.role === "ai" && t.text);
      const preview = aiMsg?.text?.slice(0, 60) ?? "";
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const newItem: ChatHistoryItem = {
        id: `${Date.now()}`,
        title,
        preview,
        time: `Today ${time}`,
      };
      const updated = [newItem, ...chatHistoryItems].slice(0, 30);
      setChatHistoryItems(updated);
      saveHistory(updated);
    }
    setThread([]);
    setMessage("");
    setActiveIndividualId(null);
    setSelectedIndividualId(null);
  }

  function deleteHistoryItem(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = chatHistoryItems.filter((h) => h.id !== id);
    setChatHistoryItems(updated);
    saveHistory(updated);
  }

  // Auto-scroll to bottom of thread on new messages
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread, aiLoading]);


  const selectedInd = selectedIndividualId ? individuals.find(p => p.id === selectedIndividualId) : null;
  const selectedIndName = selectedInd ? `${selectedInd.first_name} ${selectedInd.last_name}` : null;
  const ambientOverlay = ambientOpen ? (
    <AmbientFlowV2
      defaultIndividualId={selectedInd?.id}
      defaultIndividualName={selectedIndName ?? undefined}
      onClose={() => setAmbientOpen(false)}
    />
  ) : null;
  const scribeOverlay = scribeOpen ? (
    <AmbientFlowV2
      defaultIndividualId={selectedInd?.id}
      defaultIndividualName={selectedIndName ?? undefined}
      initialStep="recording"
      onClose={() => setScribeOpen(false)}
    />
  ) : null;

  return (
    <>
    {ambientOverlay}
    {scribeOverlay}
    
    <div className="flex h-screen w-full bg-background">
      {/* Collapsible Chat History Sidebar */}
      <AnimatePresence initial={false}>
        {historyOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="border-r border-border flex flex-col shrink-0 overflow-hidden bg-card"
          >
            {/* Sidebar header */}
            <div className="px-4 pt-5 pb-3 border-b border-border shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground text-sm">Chat History</h3>
                <button
                  onClick={() => {
                    if (thread.length === 0) return;
                    const date = new Date().toISOString().split("T")[0];
                    const lines = thread.map((t) => {
                      const label = t.role === "user" ? "You" : "AI Assistant";
                      return `[${label}]\n${t.text ?? "(inline snapshot)"}\n`;
                    });
                    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `chat-export-${date}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  title="Export current chat"
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {/* Prominent New Chat button */}
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
              >
                <PenSquare className="w-4 h-4" />
                New Chat
              </button>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto">
              {/* Active chat pill */}
              {thread.length > 0 && (() => {
                const active = activeIndividualId ? individuals.find((i) => i.id === activeIndividualId) : null;
                const title = active
                  ? `${active.first_name} ${active.last_name} — Snapshot`
                  : thread.find((t) => t.role === "user" && t.text)?.text?.slice(0, 45) ?? "Current chat";
                return (
                  <div className="px-3 py-2 mx-2 mt-2 mb-1 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-0.5">Active</p>
                    <p className="text-xs font-medium text-foreground truncate">{title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{thread.length} messages · just now</p>
                  </div>
                );
              })()}

              {/* History items */}
              {chatHistoryItems.length === 0 && thread.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No chat history yet.</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">Start a conversation to see it here.</p>
                </div>
              )}
              {chatHistoryItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex items-start gap-0 px-3 py-2.5 mx-1 my-0.5 rounded-xl hover:bg-secondary/70 transition-colors cursor-pointer"
                  onMouseEnter={() => setHoveredHistoryId(item.id)}
                  onMouseLeave={() => setHoveredHistoryId(null)}
                  onClick={() => {
                    setThread([
                      { role: "user", text: item.title },
                      { role: "ai", text: item.preview },
                    ]);
                    setActiveIndividualId(null);
                  }}
                >
                  <div className="flex-1 min-w-0 pr-6">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.preview}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">{item.time}</p>
                  </div>
                  {/* Delete button — visible on hover */}
                  <button
                    onClick={(e) => deleteHistoryItem(item.id, e)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all ${
                      hoveredHistoryId === item.id ? "opacity-100" : "opacity-0"
                    }`}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border glass shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              {historyOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
            <NavLink to="/home" className="flex items-center gap-2 hover:opacity-90 transition-opacity" title="Go to Chat Home">
              <img
                src={brandLogo}
                alt="CaseManagement AI by iCareManager"
                className="h-8 w-auto object-contain"
              />
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            </NavLink>
          </div>

          {/* Center: horizontal nav of iCM modules — icon + label pills */}
          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {topNavItems.map((item) => {
              if (item.roles && !item.roles.includes(role)) return null;
              const badge = badgeFor(item);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={({ isActive }) =>
                    cn(
                      "relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-secondary"
                    )
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.title}</span>
                  {badge && (
                    <span
                      className={cn(
                        "ml-0.5 min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center",
                        badgeToneClass[badge.tone]
                      )}
                    >
                      {badge.count}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <UserMenu />
          </div>
        </header>



        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 py-10">
          {thread.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center max-w-2xl"
            >
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                Good evening, Kathy
              </h1>
              <p className="text-muted-foreground text-lg">
                Your <span className="text-primary font-medium">AI case manager</span> is ready to assist you
              </p>
            </motion.div>
          )}


          {/* Quick Stats — clickable */}
          {thread.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap justify-center gap-4 mt-8"
            >
              {quickStats.map((stat) => (
                <button
                  key={stat.label}
                  onClick={() => navigate(stat.route)}
                  className="glass rounded-xl px-5 py-4 flex flex-col items-center gap-1 min-w-[120px] hover:scale-[1.02] hover:border-primary/40 transition-all"
                >
                  <stat.icon className={`w-5 h-5 ${stat.highlight ? "text-destructive" : "text-muted-foreground"}`} />
                  <span className={`text-2xl font-display font-bold ${stat.highlight ? "text-destructive" : "text-foreground"}`}>
                    {stat.value}
                  </span>
                  <span className="text-[11px] text-muted-foreground text-center">{stat.label}</span>
                </button>
              ))}
            </motion.div>
          )}

          {/* Conversation thread */}
          {thread.length > 0 && (
            <div className="w-full max-w-2xl mt-2 mb-6">
              {/* Context bar — active person chip */}
              <div className="flex items-center justify-end mb-3">
                {activeIndividualId && (() => {
                  const ap = individuals.find((i) => i.id === activeIndividualId);
                  return ap ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/30 text-xs text-purple-800 dark:text-purple-200">
                      <Sparkles className="w-3 h-3" />
                      <span>Viewing <strong>{ap.first_name} {ap.last_name}</strong></span>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Messages */}
              <div className="space-y-4">
                {thread.map((turn, idx) => {
                  const snapPerson = turn.snapshotPersonId ? individuals.find((i) => i.id === turn.snapshotPersonId) : undefined;
                  if (snapPerson) {
                    return (
                      <div key={idx} className="flex justify-start">
                        <div className="w-full max-w-[92%]">
                          <InlineIndividualSnapshot person={snapPerson} />
                        </div>
                      </div>
                    );
                  }

                  // ── Rich AI message card ─────────────────────────────────────
                  if (turn.role === "ai") {
                    const raw = turn.text ?? "";
                    const lines = raw.split("\n");
                    type Seg = { type: "bullet" | "numbered" | "text" | "spacer"; content: string };
                    const segments: Seg[] = [];
                    let bulletItems: string[] = [];
                    let numberedItems: string[] = [];
                    const flushBullets = () => { if (bulletItems.length) { segments.push({ type: "bullet", content: bulletItems.join("|||") }); bulletItems = []; } };
                    const flushNumbered = () => { if (numberedItems.length) { segments.push({ type: "numbered", content: numberedItems.join("|||") }); numberedItems = []; } };
                    for (const line of lines) {
                      const trimmed = line.trim();
                      if (!trimmed) { flushBullets(); flushNumbered(); continue; }
                      const nm = trimmed.match(/^(\d+)\.\s+(.+)$/);
                      const bm = trimmed.match(/^[\*\-]\s+(.+)$/);
                      if (nm) { flushBullets(); numberedItems.push(nm[2]); }
                      else if (bm) { flushNumbered(); bulletItems.push(bm[1]); }
                      else { flushBullets(); flushNumbered(); segments.push({ type: "text", content: trimmed }); }
                    }
                    flushBullets(); flushNumbered();

                    const renderInline = (text: string) =>
                      text.split(/(\*\*.+?\*\*)/g).map((p, i) =>
                        p.startsWith("**") && p.endsWith("**")
                          ? <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
                          : <span key={i}>{p}</span>
                      );

                    const cardColors = [
                      "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/40",
                      "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-700/40",
                      "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/40",
                      "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/40",
                      "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700/40",
                    ];
                    const numColors = ["bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500"];

                    return (
                      <div key={idx} className="flex justify-start">
                        <div className="max-w-[90%] w-full">
                          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                            <div className="px-5 pt-4 pb-3 space-y-3">
                              {segments.map((seg, si) => {
                                if (seg.type === "text") return (
                                  <p key={si} className="text-sm text-foreground leading-relaxed">{renderInline(seg.content)}</p>
                                );
                                if (seg.type === "bullet") {
                                  return (
                                    <div key={si} className="grid grid-cols-1 gap-1.5">
                                      {seg.content.split("|||").map((item, ii) => (
                                        <div key={ii} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-muted/50 border border-border/60">
                                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                          <span className="text-sm text-foreground leading-snug">{renderInline(item)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                if (seg.type === "numbered") {
                                  return (
                                    <div key={si} className="grid grid-cols-1 gap-1.5">
                                      {seg.content.split("|||").map((item, ii) => (
                                        <div key={ii} className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${cardColors[ii % cardColors.length]}`}>
                                          <span className={`mt-0.5 min-w-[22px] h-[22px] rounded-full ${numColors[ii % numColors.length]} text-white text-[11px] font-bold flex items-center justify-center shrink-0`}>{ii + 1}</span>
                                          <span className="text-sm text-foreground leading-snug">{renderInline(item)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                            {turn.cta && (
                              <div className="px-5 pb-4">
                                <button
                                  onClick={() => navigate(turn.cta!.href)}
                                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                                >
                                  {turn.cta.label} <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ── User message bubble ──────────────────────────────────────
                  return (
                    <div key={idx} className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm bg-primary text-primary-foreground">
                        {turn.text}
                      </div>
                    </div>
                  );
                })}

                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-border bg-card px-5 py-4 flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}

                <div ref={threadEndRef} />
              </div>
            </div>
          )}





          {/* Chat Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-2xl mt-2"
          >
            <div className="glass rounded-2xl p-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about individuals, start documentation, or review cases..."
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none text-sm min-h-[44px] max-h-[120px]"
                rows={2}
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                <div className="flex gap-1 items-center">
                  <div className="relative" ref={plusRef}>
                    <button
                      onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                      className={`p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors ${selectedIndividualId ? 'text-primary' : ''}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {plusMenuOpen && (
                      <div className="absolute bottom-full left-0 mb-2 w-80 max-w-[92vw] rounded-xl bg-popover border border-border shadow-xl overflow-hidden z-50">
                        <div className="px-3 py-2 border-b border-border">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pick an individual</p>
                        </div>
                        <div className="p-2 border-b border-border">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                              type="text"
                              value={plusSearch}
                              onChange={(e) => setPlusSearch(e.target.value)}
                              placeholder="Search…"
                              className="w-full pl-8 pr-2 py-1.5 text-sm rounded-lg border border-primary/40 bg-background outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                          <button
                            onClick={() => { setSelectedIndividualId(null); setPlusMenuOpen(false); setPlusSearch(""); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${!selectedIndividualId ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50 text-foreground'}`}
                          >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-muted/50">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <span>Select Individual</span>
                          </button>
                          {individuals
                            .filter((p) => {
                              const q = plusSearch.trim().toLowerCase();
                              if (!q) return true;
                              return `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) || (p.county || "").toLowerCase().includes(q);
                            })
                            .map((p) => {
                              const isSel = selectedIndividualId === p.id;
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => { setSelectedIndividualId(p.id); setPlusMenuOpen(false); setPlusSearch(""); }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${isSel ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                                >
                                  <PersonAvatar person={p as any} size={36} shape="circle" />
                                  <div className="min-w-0 flex-1">
                                    <div className={`font-medium truncate ${isSel ? 'text-primary' : 'text-foreground'}`}>{p.first_name} {p.last_name}</div>
                                    <div className="text-xs text-muted-foreground truncate">{p.county} County · {p.enrollment_status}</div>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedIndName && (
                    <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-lg">
                      {selectedIndName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {(() => {
                    const isIndividualSelected = !!selectedIndividualId;
                    return (
                      <>
                        <button
                          onClick={() => isIndividualSelected && setAmbientOpen(true)}
                          disabled={!isIndividualSelected}
                          className={`px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                            isIndividualSelected
                              ? "hover:bg-secondary text-foreground cursor-pointer"
                              : "text-muted-foreground/40 cursor-not-allowed"
                          }`}
                          title={!isIndividualSelected ? "Select an individual first" : ""}
                        >
                          <Mic className="w-3.5 h-3.5" />
                          Ambient
                        </button>
                        <button
                          onClick={() => isIndividualSelected && setScribeOpen(true)}
                          disabled={!isIndividualSelected}
                          className={`px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                            isIndividualSelected
                              ? "hover:bg-secondary text-foreground cursor-pointer"
                              : "text-muted-foreground/40 cursor-not-allowed"
                          }`}
                          title={!isIndividualSelected ? "Select an individual first" : ""}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Scribe
                        </button>
                      </>
                    );
                  })()}
                  <button
                    onClick={() => {
                      const SpeechRecognition =
                        (window as any).SpeechRecognition ||
                        (window as any).webkitSpeechRecognition;
                      if (!SpeechRecognition) {
                        import("@/lib/demoToast").then((m) =>
                          m.demoToast("Voice dictation is not supported in this browser")
                        );
                        return;
                      }
                      if (isListening) {
                        recognitionRef.current?.stop();
                        setIsListening(false);
                        return;
                      }
                      const recognition = new SpeechRecognition();
                      recognition.lang = "en-US";
                      recognition.continuous = false;
                      recognition.interimResults = false;
                      recognition.onresult = (e: any) => {
                        const transcript = e.results[0][0].transcript;
                        setMessage((prev) => (prev ? prev + " " + transcript : transcript));
                      };
                      recognition.onend = () => setIsListening(false);
                      recognition.onerror = () => setIsListening(false);
                      recognitionRef.current = recognition;
                      recognition.start();
                      setIsListening(true);
                    }}
                    className={`p-2 rounded-lg hover:bg-secondary transition-colors ${
                      isListening
                        ? "text-red-500 animate-pulse"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={isListening ? "Stop dictation" : "Voice dictation"}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleSend()}
                    className="p-2 rounded-lg gradient-primary text-primary-foreground transition-colors hover:opacity-90"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Suggested Prompts — only on empty state. Snapshot button always available. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-2.5 mt-6 w-full max-w-2xl"
          >
            {thread.length === 0 ? (
              <>
                {/* Row 1 */}
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedPrompts.slice(0, 2).map((prompt, idx) => {
                    const i = idx;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSend(prompt.text)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-full glass text-xs text-muted-foreground hover:text-foreground hover:glow-border transition-all duration-200"
                      >
                        <prompt.icon className="w-3.5 h-3.5 text-primary" />
                        {prompt.text}
                      </button>
                    );
                  })}
                </div>

                {/* Row 2 */}
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedPrompts.slice(2, 5).map((prompt, idx) => {
                    const i = idx + 2;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSend(prompt.text)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-full glass text-xs text-muted-foreground hover:text-foreground hover:glow-border transition-all duration-200"
                      >
                        <prompt.icon className="w-3.5 h-3.5 text-primary" />
                        {prompt.text}
                      </button>
                    );
                  })}
                </div>

                {/* Row 3 */}
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedPrompts.slice(5, 7).map((prompt, idx) => {
                    const i = idx + 5;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSend(prompt.text)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-full glass text-xs text-muted-foreground hover:text-foreground hover:glow-border transition-all duration-200"
                      >
                        <prompt.icon className="w-3.5 h-3.5 text-primary" />
                        {prompt.text}
                      </button>
                    );
                  })}
                </div>

                {/* Row 4 */}
                <div className="flex flex-wrap justify-center gap-2 items-center">
                  <button
                    onClick={() => handleSend(suggestedPrompts[7].text)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-full glass text-xs text-muted-foreground hover:text-foreground hover:glow-border transition-all duration-200"
                  >
                    <User className="w-3.5 h-3.5 text-primary" />
                    {suggestedPrompts[7].text}
                  </button>
                  <div className="relative" ref={snapshotRef}>
                    <button
                      onClick={() => setSnapshotPickerOpen((v) => !v)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs font-medium shadow-lg shadow-purple-600/20 hover:shadow-purple-600/40 hover:-translate-y-px transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Individual Snapshot
                    </button>
                    {snapshotPickerOpen && (
                      <div className="absolute bottom-full right-0 mb-2 w-72 rounded-xl bg-popover border border-border shadow-xl overflow-hidden z-50">
                        <div className="px-3 py-2 border-b border-border bg-gradient-to-r from-purple-600/10 to-violet-600/5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-400">
                            Pick an individual
                          </p>
                          <input
                            autoFocus
                            value={snapshotQuery}
                            onChange={(e) => setSnapshotQuery(e.target.value)}
                            placeholder="Search…"
                            className="mt-1.5 w-full bg-card border border-border rounded-md px-2 py-1 text-xs outline-none focus:border-purple-400"
                          />
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {individuals
                            .filter((p) =>
                              `${p.first_name} ${p.last_name} ${p.preferred_name ?? ""}`
                                .toLowerCase()
                                .includes(snapshotQuery.trim().toLowerCase())
                            )
                            .map((p) => (
                              <button
                                key={p.id}
                                onClick={() => openSnapshotFor(p.id)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                              >
                                <PersonAvatar person={p as any} size={28} shape="circle" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {p.first_name} {p.last_name}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {p.county} · {p.enrollment_status}
                                  </p>
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="relative" ref={snapshotRef}>
                <button
                  onClick={() => setSnapshotPickerOpen((v) => !v)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs font-medium shadow-lg shadow-purple-600/20 hover:shadow-purple-600/40 hover:-translate-y-px transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Individual Snapshot
                </button>
                {snapshotPickerOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-72 rounded-xl bg-popover border border-border shadow-xl overflow-hidden z-50">
                    <div className="px-3 py-2 border-b border-border bg-gradient-to-r from-purple-600/10 to-violet-600/5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-400">
                        Pick an individual
                      </p>
                      <input
                        autoFocus
                        value={snapshotQuery}
                        onChange={(e) => setSnapshotQuery(e.target.value)}
                        placeholder="Search…"
                        className="mt-1.5 w-full bg-card border border-border rounded-md px-2 py-1 text-xs outline-none focus:border-purple-400"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {individuals
                        .filter((p) =>
                          `${p.first_name} ${p.last_name} ${p.preferred_name ?? ""}`
                            .toLowerCase()
                            .includes(snapshotQuery.trim().toLowerCase())
                        )
                        .map((p) => (
                          <button
                            key={p.id}
                            onClick={() => openSnapshotFor(p.id)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                          >
                            <PersonAvatar person={p as any} size={28} shape="circle" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {p.first_name} {p.last_name}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {p.county} · {p.enrollment_status}
                              </p>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Index;
