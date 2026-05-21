import { useState, useRef, useEffect } from "react";
import AmbientFlowV2 from "@/components/ambient/AmbientFlowV2";
import { motion, AnimatePresence } from "framer-motion";
import brandLogo from "@/assets/casemanagement-ai-logo.png";
import {
  Sparkles,
  Send,
  Plus,
  Camera,
  Mic,
  MessageSquare,
  Copy,
  Users,
  ClipboardList,
  AlertTriangle,
  FileText,
  Calendar,
  Heart,
  Search,
  Shield,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
  User,
  Home,
  CheckSquare,
  BarChart3,
  Settings,
  CreditCard,
} from "lucide-react";
import { useNavigate, NavLink } from "react-router-dom";
import { useRole, type UserRole } from "@/contexts/RoleContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useMessages } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";
import { people, getPerson } from "@/data/people";
import { demoToast } from "@/lib/demoToast";
import { InlineIndividualSnapshot } from "@/components/InlineIndividualSnapshot";
import { PersonAvatar } from "@/components/icm/PersonAvatar";

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


const chatHistory: ChatHistoryItem[] = [
  { id: "1", title: "Compliance Review — Zone A", preview: "3 individuals flagged out of compliance...", time: "Today 08:15 AM" },
  { id: "2", title: "ISP Updates Due This Week", preview: "5 ISP reviews are due before Friday...", time: "Today 07:30 AM" },
  { id: "3", title: "High-Risk Individuals", preview: "2 individuals currently flagged as high-risk...", time: "Yesterday 04:45 PM" },
  { id: "4", title: "Monthly Progress Notes", preview: "12 progress notes pending completion...", time: "Yesterday 07:00 AM" },
  { id: "5", title: "Incident Follow-ups", preview: "3 incidents require follow-up documentation...", time: "Feb 18 03:20 PM" },
  { id: "6", title: "Training Compliance Check", preview: "4 staff members overdue on training...", time: "Feb 18 08:00 AM" },
];

const quickStats = [
  { label: "People Supported", value: "48", icon: Users, route: "/people" },
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
    icon: AlertTriangle,
    text: "Show incidents in the last 24 hours",
    reply:
      "I found **2 incidents** logged in the last 24 hours. 1 medication error (Joseph Brown, low severity) and 1 fall (Ashley Walker, moderate). Both have follow-up actions assigned.",
    cta: { label: "Open Incidents", href: "/incidents" },
  },
  {
    icon: Heart,
    text: "Individuals with overdue health assessments",
    reply:
      "**3 individuals** have overdue health assessments: Joseph Brown (12 days overdue), Travis Langston (5 days), and Mohsin Raza (due tomorrow — flagged early).",
    cta: { label: "View People", href: "/people" },
  },
  {
    icon: Shield,
    text: "Who is out of PCP compliance?",
    reply:
      "**Joseph Brown** is currently out of PCP compliance — ISP review is 8 days past due. Draft talking points have been generated from last quarter's notes.",
    cta: { label: "Open Joseph's eChart", href: "/people/1/echart" },
  },
  {
    icon: Calendar,
    text: "Any overdue ISP reviews?",
    reply:
      "**1 ISP review** is overdue (Joseph Brown, 8 days). **2 more** are due in the next 14 days (Ashley Walker, Travis Langston).",
    cta: { label: "Open My Work", href: "/my-work" },
  },
  {
    icon: Search,
    text: "Who am I seeing today?",
    reply:
      "You have **3 visits** scheduled today: Ashley Walker (10:30 AM, virtual), Joseph Brown (1:15 PM, in-person), and Mohsin Raza (3:45 PM, virtual).",
    cta: { label: "Open Dashboard", href: "/dashboard" },
  },
  {
    icon: Users,
    text: "New admissions since my last shift",
    reply:
      "**1 new admission** since your last shift: Steve Smith (admitted 06/01/2020, Franklin County). Intake assessment is pending.",
    cta: { label: "Open People", href: "/people" },
  },
  {
    icon: FileText,
    text: "Pending notes awaiting signature",
    reply:
      "You have **3 unsigned notes**: 2 contact notes from last week (Joseph Brown) and 1 progress note (Ashley Walker).",
    cta: { label: "Open Documentation", href: "/documentation" },
  },
  {
    icon: ClipboardList,
    text: "Show high-risk individuals",
    reply:
      "**2 individuals** are currently flagged high-risk: Joseph Brown (risk 71) and Travis Langston (risk 42, watchlist).",
    cta: { label: "Open Watchlist", href: "/dashboard" },
  },
];

interface ChatTurn {
  role: "user" | "ai";
  text?: string;
  cta?: { label: string; href: string };
  snapshotPersonId?: string;
}

const Index = () => {
  const [message, setMessage] = useState("");
  const [historyOpen, setHistoryOpen] = useState(true);
  const [selectedIndividual, setSelectedIndividual] = useState<string | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [ambientOpen, setAmbientOpen] = useState(false);
  const [thread, setThread] = useState<ChatTurn[]>([]);
  const [activeIndividualId, setActiveIndividualId] = useState<string | null>(null);
  const [snapshotPickerOpen, setSnapshotPickerOpen] = useState(false);
  const [snapshotQuery, setSnapshotQuery] = useState("");
  const snapshotRef = useRef<HTMLDivElement>(null);
  const plusRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { role } = useRole();
  const { unreadAlerts, unreadMentions } = useNotifications();
  const { unreadTotal: unreadMessages } = useMessages();

  const badgeFor = (item: TopNavItem) => {
    if (item.url === "/my-work") {
      const unread = unreadAlerts + unreadMentions;
      if (OVERDUE_TASK_COUNT > 0) return { count: OVERDUE_TASK_COUNT, tone: "red" as const };
      if (unread > 0) return { count: unread, tone: "accent" as const };
    }
    if (item.url === "/messages" && unreadMessages > 0) return { count: unreadMessages, tone: "red" as const };
    if (item.url === "/incidents" && OPEN_INCIDENT_COUNT > 0) return { count: OPEN_INCIDENT_COUNT, tone: "red" as const };
    return null;
  };

  const badgeToneClass: Record<"red" | "accent", string> = {
    red: "bg-icm-red text-white",
    accent: "bg-icm-accent text-white",
  };

  const individualOptions = ["Select Individual", ...people.map((p) => `${p.firstName} ${p.lastName}`)];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (plusRef.current && !plusRef.current.contains(e.target as Node)) setPlusMenuOpen(false);
      if (snapshotRef.current && !snapshotRef.current.contains(e.target as Node)) setSnapshotPickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function openSnapshotFor(personId: string) {
    const p = getPerson(personId);
    if (!p) return;
    setSnapshotPickerOpen(false);
    setSnapshotQuery("");
    // Always start a fresh chat when an individual is picked — one chat per individual.
    setMessage("");
    setActiveIndividualId(p.id);
    setThread([
      { role: "user", text: `Individual Snapshot for ${p.firstName} ${p.lastName}` },
      { role: "ai", snapshotPersonId: p.id, text: `Here's the case management snapshot for ${p.firstName}. This chat is scoped to ${p.firstName} ${p.lastName} — ask follow-up questions or convert into a note below.` },
    ]);
  }


  function findReply(text: string): { reply: string; cta?: { label: string; href: string } } {
    const t = text.toLowerCase();
    const active = activeIndividualId ? getPerson(activeIndividualId) : null;

    if (active) {
      const name = `${active.firstName} ${active.lastName}`;
      if (t.includes("med") || t.includes("allerg"))
        return { reply: `**${name}** — Allergies on file: ${active.allergies ?? "None known"}. ${active.specialInstructions ?? ""}`.trim() };
      if (t.includes("isp") || t.includes("pcp") || t.includes("compliance"))
        return active.aiFlag
          ? { reply: `**${name}** — ${active.aiFlag.detail ?? active.aiFlag.label}`, cta: { label: "Open eChart", href: `/people/${active.id}/echart` } }
          : { reply: `**${name}** is currently in compliance. Last review on file ${active.updatedOn}.` };
      if (t.includes("note") || t.includes("contact"))
        return { reply: `**${name}** has 2 unsigned contact notes from last week and 1 progress note pending.`, cta: { label: "Open Contact Note", href: `/people/${active.id}/contact-note` } };
      if (t.includes("incident"))
        return { reply: `**${name}** — 1 low-severity incident (medication error) logged Apr 09; follow-up assigned.`, cta: { label: "Open Incidents", href: `/people/${active.id}/incident-reporting` } };
      if (t.includes("risk"))
        return { reply: `**${name}** — Current risk score: ${active.riskScore ?? "not scored"}.` };
      if (t.includes("monitor") || t.includes("form"))
        return { reply: `**${name}** — Monthly monitoring form due in 7 days.`, cta: { label: "Open Monitoring", href: `/people/${active.id}/monitoring-form` } };
      // Default in-context answer
      return { reply: `Looking at **${name}**'s record — could you be more specific? You can ask about ISP/PCP status, notes, incidents, allergies, monitoring forms, or risk.` };
    }

    const match = suggestedPrompts.find((p) => p.text.toLowerCase() === text.trim().toLowerCase());
    if (match) return { reply: match.reply, cta: match.cta };
    if (t.includes("incident")) return { reply: suggestedPrompts[0].reply, cta: suggestedPrompts[0].cta };
    if (t.includes("health") || t.includes("assessment")) return { reply: suggestedPrompts[1].reply, cta: suggestedPrompts[1].cta };
    if (t.includes("pcp") || t.includes("compliance")) return { reply: suggestedPrompts[2].reply, cta: suggestedPrompts[2].cta };
    if (t.includes("isp") || t.includes("review")) return { reply: suggestedPrompts[3].reply, cta: suggestedPrompts[3].cta };
    if (t.includes("today") || t.includes("schedule")) return { reply: suggestedPrompts[4].reply, cta: suggestedPrompts[4].cta };
    if (t.includes("admission") || t.includes("new")) return { reply: suggestedPrompts[5].reply, cta: suggestedPrompts[5].cta };
    if (t.includes("note") || t.includes("sign")) return { reply: suggestedPrompts[6].reply, cta: suggestedPrompts[6].cta };
    if (t.includes("risk")) return { reply: suggestedPrompts[7].reply, cta: suggestedPrompts[7].cta };
    return {
      reply: "I can help with compliance reviews, ISP/PCP status, incidents, schedules, and unsigned documentation. Try one of the suggested prompts below.",
    };
  }

  function handleSend(text?: string) {
    const content = (text ?? message).trim();
    if (!content) return;
    const { reply, cta } = findReply(content);
    setThread((prev) => [...prev, { role: "user", text: content }, { role: "ai", text: reply, cta }]);
    setMessage("");
  }

  function startNewChat() {
    setThread([]);
    setMessage("");
    setActiveIndividualId(null);
  }

  const ambientOverlay = ambientOpen ? (
    <AmbientFlowV2
      defaultIndividualName={selectedIndividual && selectedIndividual !== "Select Individual" ? selectedIndividual : undefined}
      onClose={() => setAmbientOpen(false)}
    />
  ) : null;

  return (
    <>
    {ambientOverlay}
    
    <div className="flex h-screen w-full bg-background">
      {/* Collapsible Chat History Sidebar */}
      <AnimatePresence initial={false}>
        {historyOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-r border-border flex flex-col shrink-0 overflow-hidden bg-card/50"
          >
            <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
              <h3 className="font-display font-semibold text-foreground text-sm">Chat History</h3>
              <div className="flex gap-1">
                <button
                  onClick={startNewChat}
                  title="New chat"
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => demoToast("Chat export coming soon")}
                  title="Copy thread"
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {thread.length > 0 && (() => {
                const active = activeIndividualId ? getPerson(activeIndividualId) : null;
                const title = active ? `${active.firstName} ${active.lastName} — Snapshot` : (thread[0]?.text ?? "Current chat");
                return (
                  <div className="px-4 py-3 mx-2 mb-2 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300 mb-1">Active chat</p>
                    <p className="text-sm font-medium text-foreground truncate">{title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{thread.length} messages · just now</p>
                  </div>
                );
              })()}
              {chatHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setThread([
                      { role: "user", text: item.title },
                      { role: "ai", text: item.preview + " (Loaded from history.)" },
                    ]);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-secondary/60 transition-colors border-b border-border/30"
                >
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.preview}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{item.time}</p>
                </button>
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
            <div className="flex items-center gap-2">
              <img
                src={brandLogo}
                alt="CaseManagement AI by iCareManager"
                className="h-8 w-auto object-contain"
              />
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            </div>
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
            <button
              onClick={() => navigate("/settings")}
              title="Profile / Settings"
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <User className="w-5 h-5 text-muted-foreground" />
            </button>
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
            <div className="w-full max-w-2xl space-y-4 mt-2 mb-6">
              {thread.map((turn, idx) => {
                const snapPerson = turn.snapshotPersonId ? getPerson(turn.snapshotPersonId) : undefined;
                if (snapPerson) {
                  return (
                    <div key={idx} className="flex justify-start">
                      <div className="w-full max-w-[92%] space-y-2">
                        {turn.text && (
                          <p className="text-sm text-foreground">{turn.text}</p>
                        )}
                        <InlineIndividualSnapshot person={snapPerson} />
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={idx} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                        turn.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "glass text-foreground"
                      }`}
                    >
                      <div
                        className="whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: (turn.text ?? "").replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
                        }}
                      />
                      {turn.cta && (
                        <button
                          onClick={() => navigate(turn.cta!.href)}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          {turn.cta.label}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}


          {/* Active context chip */}
          {thread.length > 0 && (
            <div className="w-full max-w-2xl flex items-center justify-between gap-2 mt-2 mb-2">
              {activeIndividualId && (() => {
                const ap = getPerson(activeIndividualId);
                return ap ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/30 text-xs text-purple-800 dark:text-purple-200">
                    <Sparkles className="w-3.5 h-3.5" />
                    Chatting about <strong className="font-semibold">{ap.firstName} {ap.lastName}</strong>
                  </div>
                ) : null;
              })()}
              <button
                onClick={startNewChat}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-secondary transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" /> New chat
              </button>
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
                      className={`p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors ${selectedIndividual ? 'text-primary' : ''}`}
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
                            onClick={() => { setSelectedIndividual("Select Individual"); setPlusMenuOpen(false); setPlusSearch(""); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${!selectedIndividual || selectedIndividual === "Select Individual" ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50 text-foreground'}`}
                          >
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-muted/50">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <span>Select Individual</span>
                          </button>
                          {people
                            .filter((p) => {
                              const q = plusSearch.trim().toLowerCase();
                              if (!q) return true;
                              return `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || (p.county || "").toLowerCase().includes(q);
                            })
                            .map((p) => {
                              const name = `${p.firstName} ${p.lastName}`;
                              const isSel = selectedIndividual === name;
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => { setSelectedIndividual(name); setPlusMenuOpen(false); setPlusSearch(""); }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${isSel ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                                >
                                  <PersonAvatar person={p} size={36} shape="circle" />
                                  <div className="min-w-0 flex-1">
                                    <div className={`font-medium truncate ${isSel ? 'text-primary' : 'text-foreground'}`}>{name}</div>
                                    <div className="text-xs text-muted-foreground truncate">{p.county} County · {p.status}</div>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedIndividual && selectedIndividual !== "Select Individual" && (
                    <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-lg">
                      {selectedIndividual}
                    </span>
                  )}
                  <button
                    onClick={() => demoToast("Camera capture coming soon")}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {(() => {
                    const isIndividualSelected = selectedIndividual && selectedIndividual !== "Select Individual";
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
                          onClick={() => isIndividualSelected && setAmbientOpen(true)}
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
                    onClick={() => demoToast("Voice dictation coming soon")}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
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
            className="flex flex-wrap justify-center gap-2 mt-6 max-w-2xl"
          >
            {thread.length === 0 && suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt.text)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full glass text-xs text-muted-foreground hover:text-foreground hover:glow-border transition-all duration-200"
              >
                <prompt.icon className="w-3.5 h-3.5 text-primary" />
                {prompt.text}
              </button>
            ))}
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
                    {people
                      .filter((p) =>
                        `${p.firstName} ${p.lastName} ${p.nickname ?? ""}`
                          .toLowerCase()
                          .includes(snapshotQuery.trim().toLowerCase())
                      )
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => openSnapshotFor(p.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                        >
                          <PersonAvatar person={p} size={28} shape="circle" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {p.firstName} {p.lastName}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {p.county} · {p.status}
                            </p>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

          </motion.div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Index;
