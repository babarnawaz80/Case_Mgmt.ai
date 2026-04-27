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
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";

interface NavItem {
  title: string;
  url: string;
  icon: typeof Home;
  roles?: ("admin" | "case_manager")[];
  badge?: { count: number; tone: "red" | "amber" | "accent" };
}

const items: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "People Supported", url: "/people", icon: Users },
  { title: "My Work", url: "/my-work", icon: CheckSquare, badge: { count: 3, tone: "red" } },
  { title: "Documentation", url: "/documentation", icon: FileText },
  { title: "Incidents", url: "/incidents", icon: AlertTriangle, badge: { count: 1, tone: "red" } },
  // Reports — supervisor/admin/billing (we treat admin as visible)
  { title: "Reports", url: "/reports", icon: BarChart3, roles: ["admin"] },
  // Settings — admin only
  { title: "Settings", url: "/settings", icon: Settings, roles: ["admin"] },
];

const badgeTone: Record<"red" | "amber" | "accent", string> = {
  red: "bg-icm-red text-white",
  amber: "bg-icm-amber text-white",
  accent: "bg-icm-accent text-white",
};

export function ICMSidebar() {
  const loc = useLocation();
  const { isAdmin, role } = useRole();

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
              {item.badge && (
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-mono font-bold flex items-center justify-center ring-2 ring-icm-panel",
                    badgeTone[item.badge.tone]
                  )}
                >
                  {item.badge.count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
      <button
        className="w-9 h-9 rounded-full bg-icm-bg border border-icm-border flex items-center justify-center text-icm-text-dim mt-2"
        title="Profile"
      >
        <User className="w-4 h-4" />
      </button>
    </aside>
  );
}
