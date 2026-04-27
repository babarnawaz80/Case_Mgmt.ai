import { Home, Users, Calendar, FileText, AlertTriangle, Building2, BarChart3, Settings, Sparkles, User, GitBranch } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "People", url: "/people", icon: Users },
  { title: "Workflows", url: "/workflows", icon: GitBranch },
  { title: "Schedule", url: "/dashboard/schedule", icon: Calendar },
  { title: "Documentation", url: "/dashboard/documentation", icon: FileText },
  { title: "Incidents", url: "/incidents", icon: AlertTriangle },
  { title: "Sites", url: "/dashboard/sites", icon: Building2 },
  { title: "Reports", url: "/dashboard/reports", icon: BarChart3 },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function ICMSidebar() {
  const loc = useLocation();
  return (
    <aside className="w-14 shrink-0 bg-icm-panel border-r border-icm-border flex flex-col items-center py-3">
      <NavLink to="/" className="w-9 h-9 rounded-lg bg-icm-text flex items-center justify-center mb-4" title="AI Companion">
        <Sparkles className="w-4 h-4 text-icm-panel" />
      </NavLink>
      <nav className="flex-1 flex flex-col gap-1">
        {items.map((item) => {
          const active = loc.pathname === item.url;
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
      <button className="w-9 h-9 rounded-full bg-icm-bg border border-icm-border flex items-center justify-center text-icm-text-dim" title="Profile">
        <User className="w-4 h-4" />
      </button>
    </aside>
  );
}
