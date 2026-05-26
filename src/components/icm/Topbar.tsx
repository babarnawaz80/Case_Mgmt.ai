import {
  Search, Sparkles, HelpCircle, ChevronDown, Layers, Bot, Menu,
  Home, Users, CheckSquare, MessageSquare,
  BarChart3, CreditCard, Settings, User, Clock, LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
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
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { useNotifications } from "@/hooks/useNotifications";
import { useFirestoreNotifications } from "@/hooks/useFirestoreNotifications";
import { useMessages } from "@/hooks/useMessages";
import { useFirestoreConversations } from "@/hooks/useFirestoreMessages";
import { cn } from "@/lib/utils";
import { openCommandPalette } from "@/components/CommandPalette";
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

export function ICMTopbar({ title = "iCM Dashboard" }: TopbarProps) {
  const navigate = useNavigate();
  const { isAdmin, role } = useRole();
  const { toggle: toggleAI, open: aiOpen } = useAIPanel();
  const { unreadAlerts, unreadMentions } = useNotifications();
  const { unreadCount: fsUnread } = useFirestoreNotifications();
  const { unreadTotal: unreadMessages } = useMessages();
  const { totalUnread: fsMessagesUnread } = useFirestoreConversations();
  const { logoUrl, logoLinkUrl, orgName } = useOrgSettings();
  const [logoError, setLogoError] = useState(false);

  // Use Firestore unread count if > 0, otherwise fall back to mock counts
  const totalUnread = fsUnread > 0 ? fsUnread : (unreadAlerts + unreadMentions);
  const totalMessagesUnread = unreadMessages + fsMessagesUnread;

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
    <header className="h-14 border-b border-icm-border bg-icm-panel flex items-center justify-between px-3 sm:px-6 shrink-0 gap-2">
      {/* Left: CaseManagement.ai brand + org logo side-by-side */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
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
              className={`h-6 w-auto max-w-[96px] object-contain shrink-0 ${logoLinkUrl ? "cursor-pointer opacity-90 hover:opacity-100 transition-opacity" : ""}`}
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
      <nav className="hidden md:flex flex-1 items-center justify-center gap-0.5 overflow-x-auto min-w-0">
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

      {/* Mobile spacer + nav dropdown */}
      <div className="flex-1 md:hidden" />
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
              <DropdownMenuItem onClick={() => navigate("/platform/agents")} className="cursor-pointer">
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


      {/* Right: search + actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint" />
          <input
            placeholder="Search people, notes, modules…"
            readOnly
            onClick={openCommandPalette}
            className="w-[200px] xl:w-[240px] h-9 pl-8 pr-12 rounded-xl bg-icm-bg border border-icm-border text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40 focus:bg-icm-panel transition-colors cursor-pointer"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono text-icm-text-faint border border-icm-border bg-icm-panel">
            ⌘K
          </kbd>
        </div>

        {/* Mobile-only search icon */}
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
            onClick={() => navigate("/platform/agents")}
            title="AI Agent"
            className="hidden md:flex h-9 px-3.5 rounded-xl text-white text-[12px] font-manrope font-bold items-center gap-1.5 bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500 shadow-[0_8px_20px_-8px_rgba(99,102,241,0.55)] hover:opacity-95 hover:-translate-y-px active:translate-y-0 transition-all"
          >
            <Bot className="w-3.5 h-3.5" />
            AI Agent
          </button>
        )}

        <div className="hidden sm:block w-px h-5 bg-icm-border mx-1" />

        {/* Notifications dropdown (alerts + mentions) */}
        <NotificationsBell />

        <button
          onClick={() => demoToast("Help & documentation")}
          className="hidden sm:flex h-9 w-9 rounded-xl text-icm-text-dim hover:text-icm-text hover:bg-icm-bg items-center justify-center transition-colors"
        >
          <HelpCircle className="w-[18px] h-[18px]" />
        </button>

        <UserMenu />
      </div>
    </header>
  );
}

