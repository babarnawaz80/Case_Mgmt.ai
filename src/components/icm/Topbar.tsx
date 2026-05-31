import {
  Search, Sparkles, HelpCircle, ChevronDown, Layers, Bot, Menu,
  Home, Users, CheckSquare, MessageSquare,
  BarChart3, CreditCard, Settings, User, Clock, LogOut,
  Pencil, FileText, CalendarCheck, AlertTriangle, Phone,
  Shield, Bell, Building2, Folder, ArrowRight, X, Video,
  type LucideIcon,
} from "lucide-react";
import { useState as useTopbarState } from "react";
import { TelevisitModal } from "@/components/televisit/TelevisitModal";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useIndividuals } from "@/hooks/useIndividuals";
import {
  NAV_ITEMS, NAV_ROUTES,
  ACTION_ITEMS, ACTION_ROUTES,
  SETTINGS_ITEMS, SETTINGS_ROUTES,
} from "@/components/CommandPalette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { UserMenu } from "@/components/icm/UserMenu";
import { NavLink, useNavigate } from "react-router-dom";
import brandLogo from "@/assets/casemanagement-ai-logo.png";
import { demoToast } from "@/lib/demoToast";
import { useRole, type UserRole } from "@/contexts/RoleContext";
import { useAIPanel } from "@/contexts/AIPanelContext";
import { InboxButton } from "@/components/notifications/InboxPanel";
import { useNotifications } from "@/hooks/useNotifications";
import { useFirestoreNotifications } from "@/hooks/useFirestoreNotifications";
import { useMessages } from "@/hooks/useMessages";
import { useFirestoreConversations } from "@/hooks/useFirestoreMessages";
import { cn } from "@/lib/utils";
import { openCommandPalette } from "@/components/CommandPalette";

// ─── Search result types ──────────────────────────────────────────────────────
interface SearchItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  category: "Actions" | "Navigation" | "People" | "Settings";
  action: () => void;
}

function buildSearchItems(navigate: (path: string) => void, individuals: any[]): SearchItem[] {
  const items: SearchItem[] = [
    // Actions
    { id: "new-progress-note", label: "New Progress Note", sublabel: "Create a progress note", icon: Pencil, category: "Actions", action: () => navigate("/progress-note/new") },
    { id: "new-contact-note",  label: "New Contact Note",  sublabel: "Log a contact interaction", icon: FileText, category: "Actions", action: () => navigate("/modules/contact-note") },
    { id: "new-visit",         label: "New Visit Summary", sublabel: "Document a visit", icon: CalendarCheck, category: "Actions", action: () => navigate("/visit-summary/new") },
    { id: "new-incident",      label: "New Incident Report", sublabel: "Report a critical incident", icon: AlertTriangle, category: "Actions", action: () => navigate("/incidents") },
    { id: "new-intake",        label: "New Participant Intake", sublabel: "Enroll a new individual", icon: User, category: "Actions", action: () => navigate("/people/new") },
    { id: "oncall-log",        label: "New On-Call Log", sublabel: "Log an on-call interaction", icon: Phone, category: "Actions", action: () => navigate("/oncall-log/new") },
    { id: "new-team-meeting",  label: "New Team Meeting", sublabel: "Schedule a team meeting or PCP review", icon: Users, category: "Actions", action: () => navigate("/team-meetings") },
    // Navigation
    { id: "nav-dashboard",     label: "Dashboard",       icon: Home,          category: "Navigation", action: () => navigate("/dashboard") },
    { id: "nav-mywork",        label: "My Work",         icon: CheckSquare,   category: "Navigation", action: () => navigate("/my-work") },
    { id: "nav-people",        label: "People Supported",icon: Users,         category: "Navigation", action: () => navigate("/people") },
    { id: "nav-messages",      label: "Messages",        icon: MessageSquare, category: "Navigation", action: () => navigate("/messages") },
    { id: "nav-billing",       label: "Billing Hub",     icon: CreditCard,    category: "Navigation", action: () => navigate("/billing") },
    { id: "nav-incidents",     label: "Incidents",       icon: AlertTriangle, category: "Navigation", action: () => navigate("/incidents") },
    { id: "nav-reports",       label: "Reports",         icon: BarChart3,     category: "Navigation", action: () => navigate("/reports") },
    { id: "nav-documents",     label: "Documents",       icon: Folder,        category: "Navigation", action: () => navigate("/documents") },
    { id: "nav-team-meetings", label: "Team Meetings",   sublabel: "Schedule, transcribe and publish meeting minutes", icon: Users, category: "Navigation", action: () => navigate("/team-meetings") },
    // Settings
    { id: "set-org",           label: "Organization Profile", sublabel: "Name, address, logo, brand color", icon: Building2, category: "Settings", action: () => navigate("/settings/organization") },
    { id: "set-users",         label: "Users & Staff",        sublabel: "Manage team members", icon: Users, category: "Settings", action: () => navigate("/settings/users") },
    { id: "set-security",      label: "Security Settings",    sublabel: "Password policy, MFA, sessions", icon: Shield, category: "Settings", action: () => navigate("/settings/security") },
    { id: "set-notifications", label: "Notifications",        sublabel: "Alert preferences", icon: Bell,  category: "Settings", action: () => navigate("/settings/notifications") },
    // People
    ...individuals.filter((p) => p.enrollment_status === "active").slice(0, 80).map((p: any) => ({
      id: `person-${p.id}`,
      label: `${p.first_name} ${p.last_name}`,
      sublabel: [p.county, p.program].filter(Boolean).join(" · ") || undefined,
      icon: User as LucideIcon,
      category: "People" as const,
      action: () => navigate(`/people/${p.id}/echart`),
    })),
  ];
  return items;
}

function SearchDropdown({
  q,
  individuals,
  onSelect,
}: {
  q: string;
  individuals: any[];
  onSelect: (action: () => void) => void;
}) {
  const navigate = useNavigate();
  const allItems = useMemo(() => buildSearchItems(navigate, individuals), [navigate, individuals]);

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    let filtered: SearchItem[];
    if (!term) {
      filtered = [
        ...allItems.filter((i) => i.category === "Actions"),
        ...allItems.filter((i) => i.category === "Navigation").slice(0, 5),
        ...allItems.filter((i) => i.category === "People").slice(0, 4),
      ];
    } else {
      filtered = allItems
        .filter((item) => [item.label, item.sublabel ?? ""].join(" ").toLowerCase().includes(term))
        .slice(0, 18);
    }

    const map = new Map<string, SearchItem[]>();
    const order: SearchItem["category"][] = ["Actions", "People", "Navigation", "Settings"];
    filtered.forEach((item) => {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    });
    return order.filter((c) => map.has(c)).map((c) => ({ category: c, items: map.get(c)! }));
  }, [allItems, q]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => { setSelectedIdx(0); }, [q]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, flatItems.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); const it = flatItems[selectedIdx]; if (it) onSelect(it.action); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flatItems, selectedIdx, onSelect]);

  if (groups.length === 0 && !q) return null;

  let flatIdx = 0;
  return (
    <div className="absolute top-[calc(100%+6px)] left-0 min-w-[320px] max-h-[420px] overflow-y-auto rounded-xl border border-icm-border bg-icm-panel shadow-[0_16px_48px_-8px_rgba(0,0,0,0.18)] z-[9999] py-1">
      {groups.length === 0 && q && (
        <div className="px-4 py-6 text-center text-[12px] text-icm-text-faint font-geist">
          No results for &ldquo;{q}&rdquo;
        </div>
      )}
      {groups.map((g) => (
        <div key={g.category}>
          <p className="px-3 py-1.5 text-[9.5px] font-geist font-bold uppercase tracking-wider text-icm-text-faint">
            {g.category}
          </p>
          {g.items.map((item) => {
            const idx = flatIdx++;
            const Icon = item.icon;
            const isSelected = idx === selectedIdx;
            return (
              <button
                key={item.id}
                onMouseDown={(e) => { e.preventDefault(); onSelect(item.action); }}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                  isSelected ? "bg-icm-accent-soft" : "hover:bg-icm-bg"
                )}
              >
                <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", isSelected ? "bg-icm-accent/20" : "bg-icm-bg border border-icm-border")}>
                  <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-icm-accent" : "text-icm-text-dim")} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[12px] font-geist font-medium truncate", isSelected ? "text-icm-accent" : "text-icm-text")}>{item.label}</p>
                  {item.sublabel && <p className="text-[10.5px] font-geist text-icm-text-faint truncate">{item.sublabel}</p>}
                </div>
                {isSelected && <ArrowRight className="w-3 h-3 text-icm-accent shrink-0" />}
              </button>
            );
          })}
        </div>
      ))}
      <div className="border-t border-icm-border px-3 py-1.5 flex items-center gap-2.5 text-[10px] font-geist text-icm-text-faint">
        <span>↑↓ navigate</span>
        <span>↵ select</span>
        <span>esc close</span>
      </div>
    </div>
  );
}
import { useOrgSettings } from "@/contexts/OrgSettingsContext";

interface TopbarProps {
  title?: string;
}

interface TopNavItem {
  title: string;
  url: string;
  icon: typeof Home;
  roles?: UserRole[];
}

const topNavItems: TopNavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "My Work", url: "/my-work", icon: CheckSquare },
  { title: "People", url: "/people", icon: Users },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Billing", url: "/billing", icon: CreditCard, roles: ["admin", "billing"] },
];

const OVERDUE_TASK_COUNT = 3;

const badgeTone: Record<"red" | "amber" | "accent", string> = {
  red: "bg-icm-red text-white",
  amber: "bg-icm-amber text-white",
  accent: "bg-icm-accent text-white",
};

function InlineSearch() {
  const { individuals } = useIndividuals();
  const [searchQ, setSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ⌘K / Ctrl+K focuses the search input; Escape closes it
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQ("");
        searchRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSelect = useCallback((action: () => void) => {
    action();
    setSearchOpen(false);
    setSearchQ("");
  }, []);

  return (
    <div className="relative hidden md:block" ref={dropRef}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint pointer-events-none z-10" />
      <input
        ref={searchRef}
        value={searchQ}
        onChange={(e) => { setSearchQ(e.target.value); setSearchOpen(true); }}
        onFocus={() => setSearchOpen(true)}
        placeholder="Search people, notes, modules…"
        className="w-[200px] xl:w-[260px] h-9 pl-8 pr-10 rounded-xl bg-icm-bg border border-icm-border text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/60 focus:bg-icm-panel transition-colors"
      />
      {searchQ ? (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setSearchQ(""); searchRef.current?.focus(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-icm-text-faint hover:text-icm-text"
        >
          <X className="w-3 h-3" />
        </button>
      ) : (
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono text-icm-text-faint border border-icm-border bg-icm-panel pointer-events-none">
          ⌘K
        </kbd>
      )}

      {/* Inline search dropdown */}
      {searchOpen && (
        <SearchDropdown
          q={searchQ}
          individuals={individuals}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}

// ─── Help Button with contact popover ────────────────────────────────────────
function HelpButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-9 rounded-xl text-icm-text-dim hover:text-icm-text hover:bg-icm-bg flex items-center justify-center transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="w-[18px] h-[18px]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-icm-border bg-icm-panel shadow-2xl z-[9999] overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-icm-border bg-icm-bg/60">
            <div className="w-7 h-7 rounded-lg bg-icm-accent-soft flex items-center justify-center shrink-0">
              <HelpCircle className="w-3.5 h-3.5 text-icm-accent" />
            </div>
            <p className="font-manrope font-bold text-[13px] text-icm-text">Need help?</p>
          </div>
          {/* Body */}
          <div className="px-4 py-3.5 space-y-3">
            <p className="text-[12px] font-geist text-icm-text-dim leading-relaxed">
              Our customer support team is here for you.
            </p>
            <div className="space-y-2">
              <a
                href="mailto:help@icaremanager.com"
                className="flex items-center gap-2.5 rounded-xl border border-icm-border bg-white px-3 py-2 hover:border-icm-accent/40 hover:bg-icm-accent-soft/20 transition-colors group"
              >
                <span className="text-[13px]">✉️</span>
                <div>
                  <p className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide">Email</p>
                  <p className="text-[12.5px] font-geist font-semibold text-icm-accent group-hover:underline">
                    help@icaremanager.com
                  </p>
                </div>
              </a>
              <a
                href="tel:+18884264020"
                className="flex items-center gap-2.5 rounded-xl border border-icm-border bg-white px-3 py-2 hover:border-icm-accent/40 hover:bg-icm-accent-soft/20 transition-colors group"
              >
                <span className="text-[13px]">📞</span>
                <div>
                  <p className="text-[11px] font-geist font-semibold text-icm-text-dim uppercase tracking-wide">Phone</p>
                  <p className="text-[12.5px] font-geist font-semibold text-icm-text group-hover:text-icm-accent transition-colors">
                    888-426-4020
                  </p>
                </div>
              </a>
            </div>
            <p className="text-[10.5px] font-geist text-icm-text-faint text-center">
              Mon – Fri · 8 AM – 6 PM ET
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function ICMTopbar({ title = "iCM Dashboard" }: TopbarProps) {
  const navigate = useNavigate();
  const { isAdmin, role } = useRole();
  const [televisitOpen, setTelevisitOpen] = useTopbarState(false);
  const { toggle: toggleAI, open: aiOpen } = useAIPanel();
  const { unreadAlerts, unreadMentions } = useNotifications();
  const { unreadCount: fsUnread } = useFirestoreNotifications();
  const { unreadTotal: unreadMessages } = useMessages();
  const { conversations: fsConvs, totalUnread: fsMessagesUnread } = useFirestoreConversations();
  const { logoUrl, logoLinkUrl, orgName } = useOrgSettings();
  const [logoError, setLogoError] = useState(false);

  // Reset error flag whenever the URL changes (e.g. Firestore loads a new URL
  // or the org re-uploads their logo). Prevents a stale error from hiding the logo.
  useEffect(() => { setLogoError(false); }, [logoUrl]);

  // Use Firestore unread count if > 0, otherwise fall back to mock counts
  const totalUnread = fsUnread > 0 ? fsUnread : (unreadAlerts + unreadMentions);
  // If Firestore conversations exist, use only FS unread (avoids double-counting mock + real)
  const totalMessagesUnread = fsConvs.length > 0 ? fsMessagesUnread : unreadMessages + fsMessagesUnread;

  // Org initials fallback (e.g. "iCareManager Demo" → "iD")
  const orgInitials = orgName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  function badgeFor(item: TopNavItem): { count: number; tone: "red" | "amber" | "accent" } | null {
    if (item.url === "/my-work") {
      if (totalUnread > 0) return { count: totalUnread, tone: "accent" };
      return null;
    }
    if (item.url === "/messages" && totalMessagesUnread > 0) return { count: totalMessagesUnread, tone: "red" };
    return null;
  }

  return (
    <header
      className="border-b border-icm-border flex items-center px-3 sm:px-6 shrink-0"
      style={{
        backgroundColor: "hsl(var(--icm-topbar))",
        paddingTop: "env(safe-area-inset-top)",
        minHeight: "calc(3.5rem + env(safe-area-inset-top))",
      }}
    >
      {/* Left: CaseManagement.ai brand + org logo side-by-side */}
      <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
        <NavLink to="/home" className="flex items-center gap-2 shrink-0" title="Home">
          <img
            src={brandLogo}
            alt="CaseManagement AI"
            className="h-6 w-auto object-contain shrink-0"
          />
        </NavLink>

        {/* Org logo — clickable if a link URL is configured in Settings */}
        {logoUrl && !logoError && (() => {
          const isExternal = logoLinkUrl && (logoLinkUrl.startsWith("http://") || logoLinkUrl.startsWith("https://"));
          const isInternal = logoLinkUrl && logoLinkUrl.startsWith("/");
          const logoImg = (
            <img
              src={logoUrl}
              alt={orgName}
              title={logoLinkUrl ? `${orgName} — click to open link` : orgName}
              className={`h-7 w-auto max-w-[120px] object-contain shrink-0 ${logoLinkUrl ? "cursor-pointer opacity-90 hover:opacity-100 transition-opacity" : ""}`}
              onError={() => setLogoError(true)}
            />
          );
          return (
            <>
              <span className="w-px h-5 bg-icm-border shrink-0" />
              {isExternal ? (
                <a href={logoLinkUrl!} target="_blank" rel="noopener noreferrer">{logoImg}</a>
              ) : isInternal ? (
                <NavLink to={logoLinkUrl!}>{logoImg}</NavLink>
              ) : (
                logoImg
              )}
            </>
          );
        })()}

        {/* Fallback: org name text when no logo is set */}
        {(!logoUrl || logoError) && orgName !== "CaseManagement.ai" && (
          <>
            <span className="w-px h-5 bg-icm-border shrink-0" />
            <span className="text-[11px] font-geist font-semibold text-icm-text-dim max-w-[130px] truncate shrink-0">
              {orgName}
            </span>
          </>
        )}

        <span className="hidden lg:block w-px h-5 bg-icm-border" />
      </div>

      {/* Center: horizontal nav (desktop) */}
      <nav className="hidden md:flex items-center justify-center gap-0.5">
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
                  "relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-geist font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-icm-accent-soft text-icm-accent"
                    : "text-icm-text-dim hover:bg-icm-bg hover:text-icm-text"
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">{item.title}</span>
              {badge && (
                <span
                  className={cn(
                    "ml-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-mono font-bold flex items-center justify-center",
                    badgeTone[badge.tone]
                  )}
                >
                  {badge.count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Right: mobile hamburger + search + actions */}
      <div className="flex-1 flex items-center gap-1 sm:gap-2 justify-end">
        {/* Mobile nav hamburger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="md:hidden h-9 w-9 rounded-xl text-icm-text-dim hover:text-icm-text hover:bg-icm-bg flex items-center justify-center transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-icm-panel z-50">
            <DropdownMenuLabel>Navigation</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {topNavItems.map((item) => {
              if (item.roles && !item.roles.includes(role)) return null;
              const badge = badgeFor(item);
              const Icon = item.icon;
              return (
                <DropdownMenuItem key={item.title} onClick={() => navigate(item.url)} className="cursor-pointer">
                  <Icon className="w-4 h-4 mr-2" />
                  <span className="flex-1">{item.title}</span>
                  {badge && (
                    <span className={cn("min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-bold flex items-center justify-center", badgeTone[badge.tone])}>
                      {badge.count}
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/agents")} className="cursor-pointer">
                  <Bot className="w-4 h-4 mr-2" />
                  AI Agent
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => demoToast("Help & documentation")} className="cursor-pointer">
              <HelpCircle className="w-4 h-4 mr-2" />
              Help
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Televisit button — before search */}
        <button
          onClick={() => setTelevisitOpen(true)}
          title="Start a Televisit"
          className="hidden sm:flex h-9 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[12px] font-geist font-semibold items-center gap-1.5 transition-colors shadow-sm shrink-0"
        >
          <Video className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Televisit</span>
        </button>

        <InlineSearch />

        {/* Mobile-only search icon — opens command palette */}
        <button
          onClick={openCommandPalette}
          className="md:hidden h-9 w-9 rounded-xl text-icm-text-dim hover:text-icm-text hover:bg-icm-bg flex items-center justify-center transition-colors"
          aria-label="Search"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>

        {/* AI Chat Sidebar Toggle Button */}
        <button
          onClick={toggleAI}
          title={aiOpen ? "Close AI Assistant" : "Open AI Assistant"}
          className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center text-white transition-all shadow-[0_4px_12px_-4px_rgba(168,85,247,0.4)] hover:opacity-95 hover:scale-[1.03] active:scale-95 shrink-0",
            aiOpen 
              ? "bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600 ring-2 ring-purple-400"
              : "bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500"
          )}
        >
          <Sparkles className="w-[18px] h-[18px] text-white" />
        </button>

        {isAdmin && (
          <button
            onClick={() => navigate("/agents")}
            title="AI Agent"
            className="hidden md:flex h-9 px-3.5 rounded-xl text-white text-[12px] font-manrope font-bold items-center gap-1.5 whitespace-nowrap bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500 shadow-[0_8px_20px_-8px_rgba(99,102,241,0.55)] hover:opacity-95 hover:-translate-y-px active:translate-y-0 transition-all"
          >
            <Bot className="w-3.5 h-3.5" />
            AI Agent
          </button>
        )}

        <div className="hidden sm:block w-px h-5 bg-icm-border mx-1" />

        {/* Unified Inbox slide-over */}
        <InboxButton />

        {/* Help button with contact popover */}
        <HelpButton />

        <UserMenu />
      </div>

      {/* Televisit modal — mounted at root level so it overlays everything */}
      <TelevisitModal
        open={televisitOpen}
        onClose={() => setTelevisitOpen(false)}
      />
    </header>
  );
}

