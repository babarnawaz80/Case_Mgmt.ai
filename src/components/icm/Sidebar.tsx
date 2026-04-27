import {
  Home,
  Users,
  FileText,
  AlertTriangle,
  BarChart3,
  Settings,
  Sparkles,
  User,
  ListChecks,
  Layers,
  CreditCard,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "People", url: "/people", icon: Users },
  { title: "My Work", url: "/my-work", icon: ListChecks },
  { title: "Documentation", url: "/dashboard/documentation", icon: FileText },
  { title: "Incidents", url: "/incidents", icon: AlertTriangle },
  { title: "Reports", url: "/dashboard/reports", icon: BarChart3 },
  { title: "Billing", url: "/billing", icon: CreditCard, adminOnly: true },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function ICMSidebar() {
  const loc = useLocation();
  const { isAdmin } = useRole();
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
          if (item.adminOnly && !isAdmin) return null;
          const active =
            loc.pathname === item.url ||
            (item.url !== "/" && loc.pathname.startsWith(item.url + "/"));
          return (
            <NavLink
              key={item.title}
              to={item.url}
              title={item.title}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                active
                  ? "bg-icm-accent-soft text-icm-accent"
                  : "text-icm-text-dim hover:bg-icm-bg hover:text-icm-text"
              )}
            >
              <item.icon className="w-[18px] h-[18px]" />
            </NavLink>
          );
        })}
      </nav>
      {isAdmin && (
        <NavLink
          to="/platform"
          title="Agents Platform"
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors mb-1",
            loc.pathname.startsWith("/platform")
              ? "bg-icm-accent-soft text-icm-accent"
              : "text-icm-text-dim hover:bg-icm-bg hover:text-icm-text"
          )}
        >
          <Layers className="w-[18px] h-[18px]" />
        </NavLink>
      )}
      <button
        className="w-9 h-9 rounded-full bg-icm-bg border border-icm-border flex items-center justify-center text-icm-text-dim"
        title="Profile"
      >
        <User className="w-4 h-4" />
      </button>
    </aside>
  );
}
