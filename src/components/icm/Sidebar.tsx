import {
  Home,
  Users,
  FileText,
  AlertTriangle,
  BarChart3,
  Settings,
  Sparkles,
  User,
  CheckSquare,
  MessageSquare,
  CreditCard,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useRole, type UserRole } from "@/contexts/RoleContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  title: string;
  url: string;
  icon: typeof Home;
  roles?: UserRole[];
}

const items: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "People Supported", url: "/people", icon: Users },
  { title: "My Work", url: "/my-work", icon: CheckSquare },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Documentation", url: "/documentation", icon: FileText },
  { title: "Incidents", url: "/incidents", icon: AlertTriangle },
  { title: "Reports", url: "/reports", icon: BarChart3, roles: ["admin", "supervisor"] },
  { title: "Billing", url: "/billing", icon: CreditCard, roles: ["admin", "billing"] },
  { title: "Settings", url: "/settings", icon: Settings, roles: ["admin"] },
];

const badgeTone: Record<"red" | "amber" | "accent", string> = {
  red: "bg-icm-red text-white",
  amber: "bg-icm-amber text-white",
  accent: "bg-icm-accent text-white",
};

// Hard-coded count of overdue tasks for the demo (matches myWork seed data).
const OVERDUE_TASK_COUNT = 3;
const OPEN_INCIDENT_COUNT = 1;

export function ICMSidebar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { role } = useRole();
  const { userProfile } = useAuth();
  const { unreadAlerts, unreadMentions } = useNotifications();
  const { unreadTotal: unreadMessages } = useMessages();

  function getInitials() {
    const f = userProfile?.firstName?.[0] ?? "";
    const l = userProfile?.lastName?.[0] ?? "";
    return (f + l).toUpperCase() || "?";
  }

  function badgeFor(item: NavItem): {
    count: number;
    tone: "red" | "amber" | "accent";
    secondaryDot?: boolean;
  } | null {
    if (item.url === "/my-work") {
      const unread = unreadAlerts + unreadMentions;
      if (OVERDUE_TASK_COUNT > 0) {
        return { count: OVERDUE_TASK_COUNT, tone: "red", secondaryDot: unread > 0 };
      }
      if (unread > 0) return { count: unread, tone: "accent" };
      return null;
    }
    if (item.url === "/messages" && unreadMessages > 0) {
      return { count: unreadMessages, tone: "red" };
    }
    if (item.url === "/incidents" && OPEN_INCIDENT_COUNT > 0) {
      return { count: OPEN_INCIDENT_COUNT, tone: "red" };
    }
    return null;
  }

  return (
    <aside className="w-14 shrink-0 bg-icm-panel border-r border-icm-border flex flex-col items-center py-3">
      <NavLink
        to="/"
        className="w-9 h-9 rounded-lg bg-icm-text flex items-center justify-center mb-4"
        title="AI Companion"
      >
        <Sparkles className="w-4 h-4 text-icm-panel" />
      </NavLink>
      <nav className="flex-1 flex flex-col gap-1">
        {items.map((item) => {
          if (item.roles && !item.roles.includes(role)) return null;
          const active =
            loc.pathname === item.url ||
            (item.url !== "/" && loc.pathname.startsWith(item.url + "/"));
          const badge = badgeFor(item);
          return (
            <NavLink
              key={item.title}
              to={item.url}
              title={item.title}
              className={cn(
                "relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                active
                  ? "bg-icm-accent-soft text-icm-accent"
                  : "text-icm-text-dim hover:bg-icm-bg hover:text-icm-text"
              )}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {badge && (
                <>
                  <span
                    className={cn(
                      "absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-mono font-bold flex items-center justify-center ring-2 ring-icm-panel",
                      badgeTone[badge.tone]
                    )}
                  >
                    {badge.count}
                  </span>
                  {badge.secondaryDot && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-icm-accent ring-2 ring-icm-panel" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      <button
        onClick={() => navigate("/my-profile")}
        className="w-9 h-9 rounded-full overflow-hidden border-2 border-icm-border hover:border-icm-accent transition-colors mt-2 shrink-0"
        title="My Profile"
      >
        {userProfile?.photoURL ? (
          <img
            src={userProfile.photoURL}
            alt={userProfile.displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-icm-accent-soft flex items-center justify-center text-icm-accent text-[10px] font-geist font-bold">
            {getInitials()}
          </div>
        )}
      </button>
    </aside>
  );
}
