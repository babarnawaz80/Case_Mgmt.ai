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
import { useMessages } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";

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
  { title: "Reports", url: "/reports", icon: BarChart3, roles: ["admin", "supervisor"] },
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
  const { unreadTotal: unreadMessages } = useMessages();

  function badgeFor(item: TopNavItem): { count: number; tone: "red" | "amber" | "accent" } | null {
    if (item.url === "/my-work") {
      const unread = unreadAlerts + unreadMentions;
      if (OVERDUE_TASK_COUNT > 0) return { count: OVERDUE_TASK_COUNT, tone: "red" };
      if (unread > 0) return { count: unread, tone: "accent" };
      return null;
    }
    if (item.url === "/messages" && unreadMessages > 0) return { count: unreadMessages, tone: "red" };
    return null;
  }

  return (
    <header className="h-14 border-b border-icm-border bg-icm-panel flex items-center justify-between px-3 sm:px-6 shrink-0 gap-2">
      {/* Left: brand */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
        <NavLink to="/" className="flex items-center gap-2 shrink-0" title="AI Companion">
          <img
            src={brandLogo}
            alt="CaseManagement AI"
            className="h-6 w-auto object-contain shrink-0"
          />
        </NavLink>
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
              <DropdownMenuItem onClick={() => navigate("/platform")} className="cursor-pointer">
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
            className="w-[200px] xl:w-[240px] h-9 pl-8 pr-12 rounded-xl bg-icm-bg border border-icm-border text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent/40 focus:bg-icm-panel transition-colors"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono text-icm-text-faint border border-icm-border bg-icm-panel">
            ⌘K
          </kbd>
        </div>

        {/* Mobile-only search icon */}
        <button
          onClick={() => demoToast("Mobile search")}
          className="md:hidden h-9 w-9 rounded-xl text-icm-text-dim hover:text-icm-text hover:bg-icm-bg flex items-center justify-center transition-colors"
          aria-label="Search"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>

        {/* Gradient AI button (icon only) */}
        <button
          onClick={toggleAI}
          aria-pressed={aiOpen}
          title="Ask AI"
          className="h-9 w-9 flex items-center justify-center rounded-xl text-white ai-gradient shadow-elevated hover:opacity-95 hover:-translate-y-px active:translate-y-0 transition-all"
        >
          <Sparkles className="w-[18px] h-[18px]" />
        </button>

        {isAdmin && (
          <button
            onClick={() => navigate("/platform")}
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

