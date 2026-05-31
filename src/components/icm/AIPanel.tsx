import { useRef, useState, useCallback, useEffect } from "react";
import { Sparkles, Send, Loader2, ChevronDown, X, RotateCcw, Copy, Check, Maximize2, Minimize2, Plus, MessageSquare, Trash2, Mic, MicOff, Volume2, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, getDoc, setDoc } from "firebase/firestore";
import { useVoiceSession } from "@/hooks/useVoiceSession";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tone = "urgent" | "insight" | "good";

interface Suggestion {
  tone: Tone;
  label: string;
  body: string;
  prompt: string; // what to send when clicked
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: number;
  error?: boolean;
  isVoice?: boolean;
}

// Context passed to the AI — derived from URL / props
interface ChatContext {
  page?: string;
  personId?: string;
  personName?: string;
  personRisk?: string;
  personProgram?: string;
  personCounty?: string;
  module?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FUNCTIONS_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";

const STARTER_SUGGESTIONS: Suggestion[] = [
  {
    tone: "urgent",
    label: "Urgent",
    body: "ISP renewals are coming up. Shall I draft an update checklist?",
    prompt: "Which participants have ISP renewals coming up in the next 30 days? Draft a renewal checklist.",
  },
  {
    tone: "insight",
    label: "Insight",
    body: "Help me draft a progress note for a home visit.",
    prompt: "Help me draft a professional progress note for a home visit. Ask me for the key details.",
  },
  {
    tone: "good",
    label: "Billing",
    body: "What are the most common billing codes for HCBS waiver services?",
    prompt: "What are the most commonly used Indiana Medicaid billing codes for HCBS waiver case management services? Include T-codes and unit billing.",
  },
  {
    tone: "insight",
    label: "Compliance",
    body: "What documentation do I need for a high-risk participant?",
    prompt: "What documentation is required for high-risk participants under the Indiana HCBS waiver program? List all required forms and timelines.",
  },
];

const toneStyles: Record<Tone, { wrap: string; chip: string }> = {
  urgent: { wrap: "bg-icm-red-soft border-icm-red/20", chip: "bg-icm-red text-white" },
  insight: { wrap: "bg-icm-accent-soft border-icm-accent/20", chip: "bg-icm-accent text-white" },
  good: { wrap: "bg-icm-green-soft border-icm-green/20", chip: "bg-icm-green text-white" },
};

// ── Intent detection + Firestore enrichment ────────────────────────────────

const AUTH_INTENT_UNITS    = /units? (left|remaining|used|balance)|how many units|units? (avail|this month)/i;
const AUTH_INTENT_EXPIRING = /expir|renew|renewal/i;
const AUTH_INTENT_CAP      = /over cap|near cap|cap|exceed|limit|85%|utiliz/i;

// Caseload intent: questions about the case manager's own workload and schedule
const CASELOAD_INTENT = new RegExp(
  [
    "who (should|do|am|need to|supposed to) (i |me )?(see|visit|schedule|call|contact)",
    "who('?s| is) (on |next|coming|scheduled|due|overdue)",
    "my (caseload|clients?|individuals?|people|visits?|tasks?|schedule|work|calendar)",
    "upcoming (visits?|schedule|appointments?)",
    "overdue (visits?|tasks?|forms?|notes?|monitoring)",
    "schedule (this week|today|tomorrow|next week)",
    "who (needs|need) (attention|a visit|to be seen|follow.?up)",
    "how many (people|individuals?|clients?|cases?)",
    "list (my|all|the) (individuals?|clients?|people|caseload)",
    "(show|give|tell) me (my|the) (caseload|clients?|individuals?|schedule|tasks?|visits?)",
    "what (do i|should i) (do|work on|focus on|prioritize)",
    "(high.?risk|at.?risk) (individuals?|clients?|people)",
    "compliance (issues?|problems?|alerts?|flags?)",
    "who hasn'?t (been seen|had a visit)",
    "next visit|last visit|missed visit",
    "pending (tasks?|review|approval|signatures?)",
  ].join("|"),
  "i"
);

// ── Caseload data fetcher ─────────────────────────────────────────────────────

async function fetchCaseloadContext(orgId: string, userId: string): Promise<string> {
  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const endOfWeek = (() => {
    const d = new Date();
    d.setDate(d.getDate() + (7 - d.getDay()));
    return d.toISOString().slice(0, 10);
  })();
  const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  try {
    lines.push("=== LIVE CASELOAD DATA (from Firestore — answer using this, do not guess) ===");
    lines.push(`Today: ${today}  |  End of week: ${endOfWeek}`);
    lines.push("");

    // ── 1. Scheduled visits ──────────────────────────────────────────────────
    const visitsSnap = await getDocs(
      query(
        collection(db, "scheduled_visits"),
        where("organizationId", "==", orgId),
        where("status", "==", "scheduled")
      )
    );
    const allVisits = visitsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    // Filter to user's visits or upcoming
    const myVisits = allVisits.filter(v =>
      !v.visit_date || v.assigned_to === userId || true // show all for now
    ).sort((a, b) => (a.visit_date || "").localeCompare(b.visit_date || ""));

    const todayVisits = myVisits.filter(v => v.visit_date === today);
    const weekVisits  = myVisits.filter(v => v.visit_date > today && v.visit_date <= endOfWeek);
    const upcomingVisits = myVisits.filter(v => v.visit_date > endOfWeek && v.visit_date <= twoWeeks);

    lines.push(`--- SCHEDULED VISITS ---`);
    lines.push(`Today (${today}): ${todayVisits.length} visit(s)`);
    todayVisits.forEach(v => {
      lines.push(`  • ${v.individual_name || "Unknown"} — ${v.visit_type || "Visit"} at ${v.start_time || "TBD"} — ${v.location || "TBD"}`);
    });
    lines.push(`This week: ${weekVisits.length} visit(s)`);
    weekVisits.forEach(v => {
      lines.push(`  • ${v.visit_date} — ${v.individual_name || "Unknown"} — ${v.visit_type || "Visit"} at ${v.start_time || "TBD"}`);
    });
    if (upcomingVisits.length > 0) {
      lines.push(`Next 2 weeks: ${upcomingVisits.length} more visit(s)`);
      upcomingVisits.slice(0, 5).forEach(v => {
        lines.push(`  • ${v.visit_date} — ${v.individual_name || "Unknown"} — ${v.visit_type || "Visit"}`);
      });
    }
    lines.push("");

    // ── 2. My Work tasks ────────────────────────────────────────────────────
    const tasksSnap = await getDocs(
      query(
        collection(db, "tasks"),
        where("organizationId", "==", orgId),
        where("assignedTo", "==", userId)
      )
    );
    const allTasks = tasksSnap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) }))
      .filter((t: any) => t.status !== "completed")
      .sort((a: any, b: any) => (a.dueDate || "").localeCompare(b.dueDate || ""));

    const overdueTasks  = allTasks.filter((t: any) => t.dueDate && t.dueDate < today);
    const dueTodayTasks = allTasks.filter((t: any) => t.dueDate === today);
    const thisWeekTasks = allTasks.filter((t: any) => t.dueDate > today && t.dueDate <= endOfWeek);

    lines.push(`--- MY WORK TASKS ---`);
    lines.push(`Overdue: ${overdueTasks.length} | Due today: ${dueTodayTasks.length} | Due this week: ${thisWeekTasks.length} | Total open: ${allTasks.length}`);
    if (overdueTasks.length > 0) {
      lines.push("OVERDUE TASKS:");
      overdueTasks.slice(0, 8).forEach((t: any) => {
        lines.push(`  • [${t.dueDate}] ${t.title}${t.individualName ? ` — ${t.individualName}` : ""} (${t.priority || "medium"} priority)`);
      });
    }
    if (dueTodayTasks.length > 0) {
      lines.push("DUE TODAY:");
      dueTodayTasks.forEach((t: any) => {
        lines.push(`  • ${t.title}${t.individualName ? ` — ${t.individualName}` : ""}`);
      });
    }
    if (thisWeekTasks.length > 0) {
      lines.push("DUE THIS WEEK:");
      thisWeekTasks.slice(0, 6).forEach((t: any) => {
        lines.push(`  • [${t.dueDate}] ${t.title}${t.individualName ? ` — ${t.individualName}` : ""}`);
      });
    }
    lines.push("");

    // ── 3. Active individuals overview ──────────────────────────────────────
    const indsSnap = await getDocs(
      query(
        collection(db, "individuals"),
        where("organizationId", "==", orgId),
        where("enrollment_status", "==", "active")
      )
    );
    const individuals = indsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    const highRisk = individuals.filter((p: any) => (p.risk_score ?? 0) >= 60);
    const reviewRisk = individuals.filter((p: any) => {
      const s = p.risk_score ?? 0; return s >= 35 && s < 60;
    });

    lines.push(`--- ACTIVE CASELOAD ---`);
    lines.push(`Total active individuals: ${individuals.length}`);
    lines.push(`High risk (score ≥60): ${highRisk.length}`);
    lines.push(`Needs review (score 35–59): ${reviewRisk.length}`);
    if (highRisk.length > 0) {
      lines.push("HIGH RISK INDIVIDUALS:");
      highRisk.slice(0, 6).forEach((p: any) => {
        const name = `${p.last_name || ""}, ${p.first_name || ""}`.trim().replace(/^,\s*/, "");
        lines.push(`  • ${name} — Risk score: ${p.risk_score ?? "?"} — County: ${p.county || "?"} — Program: ${p.program || "?"}`);
      });
    }
    lines.push("");

    lines.push("=== END OF LIVE DATA ===");
    return lines.join("\n");
  } catch (err) {
    console.warn("[AIPanel] Caseload context fetch failed:", err);
    return "";
  }
}

async function fetchAuthContext(personId: string, orgId?: string): Promise<string> {
  const lines: string[] = [];

  try {
    // Fetch individual's auths
    const authsSnap = await getDocs(
      query(
        collection(db, "service_authorizations"),
        where("individualId", "==", personId),
        orderBy("end_date", "asc")
      )
    );

    if (authsSnap.empty) {
      return "No service authorizations found for this individual.";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const auths = authsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
    const active = auths.filter((a: any) => a.status === "active" || a.status === "pending");

    lines.push("=== REAL SERVICE AUTHORIZATION DATA (from Firestore, do not fabricate) ===");
    lines.push(`Total authorizations: ${auths.length}, Active: ${active.length}`);
    lines.push("");

    for (const auth of active) {
      const daysLeft = Math.ceil(
        (new Date(auth.end_date + "T00:00:00").getTime() - today.getTime()) / 86400000
      );
      const unitsLeft = (auth.units_authorized || 0) - (auth.units_used || 0);
      const pct = auth.units_authorized > 0
        ? Math.round((auth.units_used / auth.units_authorized) * 100)
        : 0;
      // Pace computation
      const elapsed = Math.max(1, Math.ceil(
        (today.getTime() - new Date(auth.start_date + "T00:00:00").getTime()) / 86400000
      ));
      const dailyRate = auth.units_used / elapsed;
      const totalDays = elapsed + Math.max(0, daysLeft);
      const projectedTotal = Math.round(dailyRate * totalDays);

      lines.push(`Authorization: ${auth.service_name}`);
      lines.push(`  Auth #: ${auth.auth_number}`);
      lines.push(`  Procedure Code: ${auth.procedure_code || "N/A"}`);
      lines.push(`  Payer: ${auth.payer || "N/A"}`);
      lines.push(`  Units: ${auth.units_used} used of ${auth.units_authorized} authorized (${pct}% used, ${unitsLeft} remaining)`);
      lines.push(`  Billing Period: ${auth.billing_period}`);
      lines.push(`  Period: ${auth.start_date} to ${auth.end_date} (${daysLeft} days remaining)`);
      lines.push(`  Daily pace: ${dailyRate.toFixed(2)} units/day, projected total: ${projectedTotal} units`);
      if (projectedTotal > auth.units_authorized) {
        lines.push(`  ⚠️ OVER PACE: Projected to exceed cap by ${projectedTotal - auth.units_authorized} units`);
      }
      if (pct >= 85) {
        lines.push(`  🔴 NEAR CAP: ${pct}% of units used`);
      }
      if (daysLeft <= 7) {
        lines.push(`  🔴 CRITICAL: Expires in ${daysLeft} days`);
      } else if (daysLeft <= 30) {
        lines.push(`  🟡 EXPIRING SOON: Expires in ${daysLeft} days`);
      }
      lines.push("");
    }

    return lines.join("\n");
  } catch (err) {
    console.warn("[AIPanel] Auth context fetch failed:", err);
    return "";
  }
}

async function callChatAPI(
  message: string,
  history: ChatMessage[],
  context: ChatContext
): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not authenticated");

  // Detect auth intent and enrich with real Firestore data
  const needsAuthContext =
    AUTH_INTENT_UNITS.test(message) ||
    AUTH_INTENT_EXPIRING.test(message) ||
    AUTH_INTENT_CAP.test(message);

  let enrichedMessage = message;

  // ── Enrich with authorization data when asked about a specific person ────
  if (needsAuthContext && context.personId) {
    const authData = await fetchAuthContext(context.personId);
    if (authData) {
      enrichedMessage =
        `${message}\n\n[SYSTEM CONTEXT — REAL DATA, use this to answer precisely]\n${authData}\n` +
        `Please answer the question using only the real data above. Be specific with numbers.`;
    }
  }

  // ── Enrich with live caseload data when asked about schedule / workload ───
  const needsCaseloadContext = CASELOAD_INTENT.test(message);
  if (needsCaseloadContext && auth.currentUser) {
    // Get the org ID from the user's Firestore document
    let orgId = "";
    try {
      const { getDoc: fsGetDoc, doc: fsDoc } = await import("firebase/firestore");
      const userDoc = await fsGetDoc(fsDoc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) orgId = userDoc.data().organizationId ?? "";
    } catch { /* non-fatal */ }

    if (orgId) {
      const caseloadData = await fetchCaseloadContext(orgId, auth.currentUser.uid);
      if (caseloadData) {
        enrichedMessage =
          `${message}\n\n[LIVE CASELOAD DATA — Real data from the system. Answer using this, be specific with names and dates.]\n${caseloadData}\n` +
          `Answer the question using the real data above. Give specific names, dates, and counts. Do not say to check the system — you have the data right here.`;
      }
    }
  }

  const res = await fetch(`${FUNCTIONS_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: enrichedMessage,
      history: history.slice(-10).map((m) => ({ role: m.role, text: m.text })),
      context,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err.error === "AI_PAUSED") throw new Error("AI features are currently paused.");
    if (err.error === "INSUFFICIENT_CREDITS") throw new Error("AI credits exhausted. Contact your admin.");
    if (err.error === "DAILY_LIMIT_REACHED") throw new Error("Daily AI limit reached. Try again tomorrow.");
    throw new Error(err.message ?? `AI error (${res.status})`);
  }

  const data = await res.json();
  return data.reply ?? "";
}

// ── Markdown renderer (lightweight — no external lib) ─────────────────────────

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-icm-bg px-1 rounded text-[11px] font-mono">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<p class="font-geist font-bold text-[12px] text-icm-text mt-3 mb-1">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="font-geist font-bold text-[13px] text-icm-text mt-3 mb-1">$1</p>')
    // Bullets
    .replace(/^- (.+)$/gm, '<li class="ml-3 list-disc">$1</li>')
    .replace(/^• (.+)$/gm, '<li class="ml-3 list-disc">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AIPanelProps {
  personId?: string;
  personName?: string;
  personRisk?: string;
  personProgram?: string;
  personCounty?: string;
  module?: string;
}

export function AIPanel({
  personId,
  personName,
  personRisk,
  personProgram,
  personCounty,
  module,
}: AIPanelProps = {}) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const context: ChatContext = {
    page: location.pathname,
    personId,
    personName,
    personRisk,
    personProgram,
    personCounty,
    module,
  };

  // ── Voice session state ────────────────────────────────────────────────────
  const [voiceSessionActive, setVoiceSessionActive] = useState(false);
  const [phiAcknowledged, setPhiAcknowledged] = useState(false);
  const [phiLoading, setPhiLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Load PHI disclosure status
  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, "users", currentUser.uid))
      .then(snap => setPhiAcknowledged(snap.data()?.voice_disclosure_acknowledged === true))
      .catch(() => {});
  }, [currentUser]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("casemanagement_ai_chats");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSessions(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load sessions", e);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const saveSession = useCallback(
    (updatedMessages: ChatMessage[]) => {
      try {
        const saved = localStorage.getItem("casemanagement_ai_chats");
        let chats: any[] = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(chats)) chats = [];

        const currentSessionId = activeSessionId || crypto.randomUUID();
        if (!activeSessionId) {
          setActiveSessionId(currentSessionId);
        }

        const existingIdx = chats.findIndex((c) => c.id === currentSessionId);
        const firstUserMsg = updatedMessages.find((m) => m.role === "user")?.text || "New Conversation";
        const defaultTitle = personName ? `Context: ${personName}` : firstUserMsg;
        const title = defaultTitle.length > 30 ? defaultTitle.substring(0, 30) + "..." : defaultTitle;

        const sessionObj = {
          id: currentSessionId,
          title,
          messages: updatedMessages,
          ts: Date.now(),
          context,
        };

        if (existingIdx >= 0) {
          chats[existingIdx] = sessionObj;
        } else {
          chats.unshift(sessionObj);
        }

        localStorage.setItem("casemanagement_ai_chats", JSON.stringify(chats));
        setSessions(chats);
      } catch (e) {
        console.warn("Failed to save chat to localStorage", e);
      }
    },
    [activeSessionId, personName, context]
  );

  // ── Voice callbacks ────────────────────────────────────────────────────────
  // sendMessage is declared later in this component but we need to pass
  // onFinalTranscript to useVoiceSession now. Use a ref so the dependency
  // array never references a variable that hasn't been initialised yet
  // (that would produce "Cannot access 'X' before initialization" after
  // Vite minification — a temporal dead zone crash).
  const sendMessageRef = useRef<((text: string) => void) | null>(null);

  const handleVoiceError = useCallback((errorMsg: string) => {
    setVoiceError(errorMsg);
    setTimeout(() => setVoiceError(null), 6000);
  }, []);

  // onFinalTranscript: voice recognised speech → auto-send via ref (no TDZ)
  const handleFinalTranscript = useCallback((text: string) => {
    if (text.trim()) sendMessageRef.current?.(text.trim());
  }, []); // ← zero deps: accesses sendMessage through the ref

  // onInterimTranscript: show live speech in the input box
  const handleInterimTranscript = useCallback((text: string) => {
    setInput(text);
  }, []);

  const { voiceState, isSupported, toggleVoice, endSession: endVoiceSession, speakText } = useVoiceSession({
    onFinalTranscript: handleFinalTranscript,
    onInterimTranscript: handleInterimTranscript,
    onError: handleVoiceError,
  });

  // Speak the AI reply aloud when voice is active
  const voiceStateRef = useRef(voiceState);
  useEffect(() => { voiceStateRef.current = voiceState; }, [voiceState]);

  const prevMessagesLenRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevMessagesLenRef.current) {
      prevMessagesLenRef.current = messages.length;
      const last = messages[messages.length - 1];
      if (last?.role === "assistant" && !last.error && voiceStateRef.current !== "idle") {
        speakText(last.text);
      }
    }
  }, [messages, speakText]);

  const isVoiceActive = voiceState !== "idle";

  const handleMicClick = useCallback(async () => {
    if (!phiAcknowledged) return; // Show disclosure first
    if (voiceState === "idle") setVoiceSessionActive(true);
    toggleVoice();
  }, [phiAcknowledged, voiceState, toggleVoice]);

  const handleEndVoiceSession = useCallback(() => {
    endVoiceSession();
    setVoiceSessionActive(false);
  }, [endVoiceSession]);

  const acknowledgePhiDisclosure = useCallback(async () => {
    if (!currentUser) return;
    setPhiLoading(true);
    try {
      await setDoc(doc(db, "users", currentUser.uid), { voice_disclosure_acknowledged: true }, { merge: true });
      setPhiAcknowledged(true);
    } catch { /* non-fatal */ }
    setPhiLoading(false);
  }, [currentUser]);

  const VOICE_SUGGESTIONS = [
    "How do I complete a monitoring form?",
    "My billing claim shows Needs Attention — what do I do?",
    "Walk me through the ambient listening process",
    "How do I request a supervisor review?",
  ];

  const micAriaLabel =
    voiceState === "idle" ? "Start voice conversation" :
    voiceState === "listening" ? "Listening — tap to stop" :
    voiceState === "speaking" ? "AI is responding — tap to interrupt" :
    "Voice";

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading || !currentUser) return;
      setError(null);
      setShowSuggestions(false);

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: text.trim(),
        ts: Date.now(),
      };

      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput("");
      setLoading(true);

      // Save user message immediately to the session
      saveSession(nextMessages);

      try {
        const reply = await callChatAPI(text.trim(), messages, context);
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: reply,
          ts: Date.now(),
        };
        const finalMessages = [...nextMessages, assistantMsg];
        setMessages(finalMessages);
        saveSession(finalMessages);
      } catch (err) {
        const errText = err instanceof Error ? err.message : "Something went wrong";
        setError(errText);
        // Add error message to chat
        const errMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: errText,
          ts: Date.now(),
          error: true,
        };
        const finalMessages = [...nextMessages, errMsg];
        setMessages(finalMessages);
        saveSession(finalMessages);
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [loading, currentUser, messages, context, saveSession]
  );

  // Keep voice ref in sync now that sendMessage is initialised
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyMessage = async (msg: ChatMessage) => {
    await navigator.clipboard.writeText(msg.text);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadSession = (session: any) => {
    setActiveSessionId(session.id);
    setMessages(session.messages || []);
    setShowSuggestions(false);
    setError(null);
  };

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const saved = localStorage.getItem("casemanagement_ai_chats");
      if (saved) {
        const chats = JSON.parse(saved);
        if (Array.isArray(chats)) {
          const updated = chats.filter((c) => c.id !== sessionId);
          localStorage.setItem("casemanagement_ai_chats", JSON.stringify(updated));
          setSessions(updated);
          if (activeSessionId === sessionId) {
            startNewChat();
          }
        }
      }
    } catch (err) {
      console.warn("Failed to delete session", err);
    }
  };

  const clearAllHistory = () => {
    try {
      localStorage.removeItem("casemanagement_ai_chats");
      setSessions([]);
      setActiveSessionId(null);
      setMessages([]);
      setShowSuggestions(true);
      setError(null);
    } catch (e) {
      console.warn("Failed to clear localStorage", e);
    }
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setShowSuggestions(true);
    setError(null);
    setInput("");
  };

  const clearChat = () => {
    startNewChat();
  };

  const hasMessages = messages.length > 0;

  return (
    <aside className={cn(
      "hidden lg:flex shrink-0 border-l border-icm-border bg-icm-panel flex-col h-full overflow-hidden transition-all duration-300 ease-in-out shadow-elevated z-30",
      isExpanded ? "w-[720px]" : "w-[360px]"
    )}>
      <div className="flex-1 flex min-h-0 divide-x divide-icm-border h-full overflow-hidden">
        {/* ── Left Pane: Chat History Sidebar (Expanded state only) ── */}
        {isExpanded && (
          <div className="w-[260px] shrink-0 bg-icm-panel flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-icm-border flex items-center justify-between shrink-0 bg-icm-bg/20">
              <span className="text-[11px] font-bold text-icm-text font-geist uppercase tracking-wider">Chat History</span>
              {sessions.length > 0 && (
                <button
                  onClick={clearAllHistory}
                  className="text-[10px] text-icm-red hover:underline font-geist font-medium"
                  title="Clear all saved chats"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 bg-icm-panel/30">
              {sessions.length === 0 ? (
                <p className="text-[11px] text-icm-text-faint text-center p-6 font-geist">
                  No saved chat history.
                </p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => loadSession(s)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 text-[11px] font-geist shadow-sm cursor-pointer group/item relative",
                      activeSessionId === s.id
                        ? "bg-icm-accent-soft border-icm-accent/40 text-icm-text font-medium"
                        : "border-transparent bg-white hover:bg-icm-bg hover:border-icm-border text-icm-text-dim hover:text-icm-text"
                    )}
                  >
                    <div className="flex items-center justify-between w-full pr-6">
                      <span className="font-semibold truncate pr-2 max-w-[120px]">{s.title}</span>
                      <span className="text-[9px] text-icm-text-faint whitespace-nowrap">
                        {new Date(s.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-[10px] text-icm-text-faint truncate pr-6">
                      {s.messages?.[s.messages.length - 1]?.text || "Empty chat"}
                    </p>
                    <button
                      onClick={(e) => deleteSession(s.id, e)}
                      title="Delete this chat"
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 p-1.5 rounded-lg text-icm-text-faint hover:text-icm-red hover:bg-icm-red-soft transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-icm-border shrink-0 bg-icm-bg/10">
              <button
                onClick={startNewChat}
                className="w-full h-9 flex items-center justify-center gap-1.5 rounded-xl border border-icm-border bg-white text-icm-text hover:bg-icm-bg font-bold text-xs transition-all shadow-sm"
              >
                <Plus className="w-4 h-4 text-icm-accent" />
                New Chat
              </button>
            </div>
          </div>
        )}

        {/* ── Right Pane: Active Chat Area ── */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-icm-panel">
          {/* ── Header ─────────────────────────────────────────────────────────── */}
          <div className="p-4 border-b border-icm-border shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl ai-gradient flex items-center justify-center shadow-elevated">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-manrope font-bold text-[13px] text-icm-text tracking-tight">
                    Case Management AI
                  </p>
                  <p className="text-[11px] flex items-center gap-1 text-icm-green font-geist">
                    <span className="w-1.5 h-1.5 rounded-full bg-icm-green animate-pulse" />
                    {personName ? `Context: ${personName.split(" ")[0]}` : "Ready · Gemini 2.0"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Always show Start New Chat button */}
                <button
                  onClick={startNewChat}
                  title="Start New Chat"
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-icm-text-faint hover:text-icm-text hover:bg-icm-bg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {/* Clear Chat if messages exist */}
                {hasMessages && (
                  <button
                    onClick={clearChat}
                    title="Clear current messages"
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-icm-text-faint hover:text-icm-text hover:bg-icm-bg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Expand / Collapse toggle */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? "Collapse to right" : "Expand to left"}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-icm-text-faint hover:text-icm-text hover:bg-icm-bg transition-colors"
                >
                  {isExpanded ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
            {personName && (
              <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-icm-accent-soft border border-icm-accent/20 flex items-center gap-1.5">
                <span className="text-[10px] font-geist font-semibold text-icm-accent uppercase tracking-wide">Context</span>
                <span className="text-[11px] font-geist text-icm-text">{personName}</span>
                {personRisk && (
                  <span className={cn(
                    "ml-auto text-[9px] font-geist font-bold px-1.5 py-0.5 rounded-full uppercase",
                    personRisk === "High" ? "bg-icm-red text-white" :
                    personRisk === "Medium" ? "bg-icm-amber text-white" :
                    "bg-icm-green text-white"
                  )}>
                    {personRisk} Risk
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Messages ───────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-0 bg-icm-panel">
            {/* PHI disclosure — first use only */}
            {isSupported && !phiAcknowledged && (
              <div className="mx-1 mb-2 rounded-xl border border-icm-border bg-icm-bg p-3 space-y-2">
                <p className="text-[11.5px] font-geist text-icm-text leading-relaxed">
                  Voice conversations are processed by Google Gemini on Google Cloud under our Business Associate Agreement. Audio is not stored after processing.
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={phiLoading}
                    onClick={acknowledgePhiDisclosure}
                    className="h-7 px-3 rounded-lg bg-icm-accent text-white text-[11px] font-geist font-semibold hover:opacity-90 disabled:opacity-60"
                  >
                    {phiLoading ? "…" : "I understand — enable voice"}
                  </button>
                  <button className="h-7 px-3 rounded-lg border border-icm-border text-[11px] font-geist text-icm-text-dim hover:bg-icm-bg">
                    Learn more
                  </button>
                </div>
              </div>
            )}

            {/* Voice session active banner */}
            {isVoiceActive && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl mx-1 mb-2" style={{ background: "#e1f5ee" }}>
                <div className="flex items-center gap-2">
                  {voiceState === "listening" && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                  {voiceState === "speaking" && <Volume2 className="w-3.5 h-3.5 text-green-700" />}
                  {voiceState === "processing" && <Radio className="w-3.5 h-3.5 text-green-700 animate-pulse" />}
                  <span className="text-[11px] font-geist text-green-800 font-medium">
                    Voice session active — Gemini 2.0 Live
                  </span>
                </div>
                <button onClick={handleEndVoiceSession} className="text-green-700 hover:text-green-900 text-[11px] font-geist">
                  End session ×
                </button>
              </div>
            )}

            {/* Voice error banner */}
            {voiceError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl mx-1 mb-2 bg-red-50 border border-red-200">
                <span className="text-[11px] font-geist text-red-700">{voiceError}</span>
              </div>
            )}

            {/* Voice suggestion cards (only when voice active) */}
            {voiceSessionActive && showSuggestions && !hasMessages && (
              <div className="grid grid-cols-2 gap-2 px-1">
                {VOICE_SUGGESTIONS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="text-left rounded-xl border border-icm-border bg-icm-panel p-3 hover:border-icm-accent/40 hover:bg-icm-accent-soft/20 transition-all group"
                  >
                    <p className="text-[12px] font-geist font-semibold text-icm-text leading-snug">{prompt}</p>
                    <p className="text-[10px] text-icm-text-dim mt-1.5 group-hover:text-icm-accent transition-colors">Click to ask →</p>
                  </button>
                ))}
              </div>
            )}

            {/* Starter suggestions (text chat, hidden during voice session) */}
            {!voiceSessionActive && showSuggestions && !hasMessages && (
              <div className="space-y-2">
                <p className="text-[11.5px] text-icm-text-faint font-geist px-1 mb-3">
                  Ask me anything about your caseload, documentation, billing, or compliance.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {STARTER_SUGGESTIONS.map((s, i) => {
                    const tone = toneStyles[s.tone];
                    return (
                      <button
                        key={i}
                        onClick={() => sendMessage(s.prompt)}
                        className={cn(
                          "w-full text-left rounded-xl border p-3 hover:brightness-95 transition-all group shadow-sm bg-white",
                          tone.wrap
                        )}
                      >
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded-full text-[9px] font-geist font-bold uppercase tracking-wider mb-1.5",
                          tone.chip
                        )}>
                          {s.label}
                        </span>
                        <p className="text-[12px] text-icm-text font-geist leading-relaxed font-semibold">
                          {s.body}
                        </p>
                        <p className="text-[10.5px] text-icm-text-faint font-geist mt-1.5 group-hover:text-icm-text-dim">
                          Click to ask →
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2.5",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full ai-gradient flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] font-geist leading-relaxed relative group shadow-sm",
                    msg.role === "user"
                      ? "bg-icm-accent text-white rounded-tr-none"
                      : msg.error
                      ? "bg-icm-red-soft border border-icm-red/20 text-icm-red rounded-tl-none"
                      : "bg-white border border-icm-border text-icm-text rounded-tl-none"
                  )}
                >
                  {msg.role === "assistant" && !msg.error ? (
                    <div
                      className="prose-sm"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  )}
                  {msg.isVoice && (
                    <span className="inline-flex items-center gap-0.5 ml-1 opacity-50" title={msg.role === "user" ? "Voice input" : "Voice response"}>
                      {msg.role === "user" ? <Mic className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
                    </span>
                  )}
                  {msg.role === "assistant" && !msg.error && (
                    <button
                      onClick={() => copyMessage(msg)}
                      className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 h-5.5 w-5.5 flex items-center justify-center rounded-lg bg-white border border-icm-border text-icm-text-faint hover:text-icm-text transition-all shadow-sm"
                      title="Copy response"
                    >
                      {copiedId === msg.id
                        ? <Check className="w-3 h-3 text-icm-green" />
                        : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-6 h-6 rounded-full ai-gradient flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="bg-white border border-icm-border rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-icm-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-icm-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-icm-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Premium Input Area ────────────────────────────────────────────── */}
          <div className="pt-4 pb-10 px-4 border-t border-icm-border shrink-0 bg-white shadow-lg">
            {hasMessages && (
              <button
                onClick={() => setShowSuggestions((v) => !v)}
                className="w-full flex items-center justify-center gap-1 text-[11px] font-bold text-icm-text-faint hover:text-icm-text-dim mb-3 transition-colors uppercase tracking-wider"
              >
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform text-icm-accent", showSuggestions && "rotate-180")} />
                {showSuggestions ? "Hide" : "Show"} quick prompts
              </button>
            )}
            {hasMessages && showSuggestions && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {["Draft progress note", "Billing help", "ISP renewal", "Compliance check"].map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    disabled={loading}
                    className="px-3 py-1.5 text-[11px] font-bold rounded-full border border-icm-border bg-icm-bg text-icm-text-dim hover:text-icm-text hover:border-icm-accent/40 transition-colors disabled:opacity-40 shadow-sm"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            <div className={cn(
              "flex items-center gap-3 rounded-2xl border bg-icm-bg pl-4 pr-1.5 py-2 transition-all shadow-sm focus-within:shadow-md focus-within:border-icm-accent/80",
              loading ? "border-icm-accent/40" : "border-icm-border"
            )}>
              {/* Mic button */}
              {isSupported && phiAcknowledged && (
                <button
                  onClick={handleMicClick}
                  disabled={voiceState === "processing" || loading}
                  aria-label={micAriaLabel}
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all",
                    voiceState === "idle" && "text-icm-text-dim hover:bg-icm-bg hover:text-icm-text",
                    voiceState === "listening" && "bg-red-100 text-red-600 ring-2 ring-red-400 ring-offset-1",
                    voiceState === "speaking" && "bg-green-100 text-green-600",
                    voiceState === "processing" && "opacity-50 cursor-not-allowed",
                    voiceState === "error" && "bg-red-50 text-red-500"
                  )}
                >
                  {voiceState === "listening" ? (
                    <MicOff className="w-4 h-4" />
                  ) : voiceState === "speaking" ? (
                    <Volume2 className="w-4 h-4 animate-pulse" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              )}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={personName ? `Ask about ${personName.split(" ")[0]}…` : "Ask anything about your caseload…"}
                disabled={loading || !currentUser}
                className="flex-1 bg-transparent text-sm font-geist text-icm-text placeholder:text-icm-text-faint outline-none disabled:opacity-50 font-semibold"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading || !currentUser}
                className="w-9 h-9 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-600 text-white flex items-center justify-center hover:opacity-95 hover:shadow-sm disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11.5px] text-icm-text-faint font-geist text-center mt-2.5 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-icm-accent" />
              AI responses may need review · Powered by Gemini
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
