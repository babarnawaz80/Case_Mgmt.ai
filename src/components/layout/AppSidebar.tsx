import {
  Home,
  Users,
  FileText,
  ClipboardList,
  Calendar,
  AlertTriangle,
  Building2,
  GraduationCap,
  FolderOpen,
  Bell,
  BarChart3,
  Settings,
  Heart,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: Home },
      { title: "My Work", url: "", icon: Target },
      { title: "Announcements", url: "", icon: Bell },
    ],
  },
  {
    label: "Care Management",
    items: [
      { title: "People Supported", url: "/people", icon: Users },
      { title: "Care Tracker", url: "", icon: Heart },
      { title: "Activity Notes", url: "", icon: FileText },
      { title: "Assessments", url: "", icon: ClipboardList },
      { title: "Progress Notes", url: "", icon: FileText },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Attendance", url: "", icon: Calendar },
      { title: "Incidents", url: "", icon: AlertTriangle },
      { title: "My Sites", url: "", icon: Building2 },
      { title: "Training", url: "", icon: GraduationCap },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Documents", url: "", icon: FolderOpen },
      { title: "Reports", url: "", icon: BarChart3 },
      { title: "Settings", url: "", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const handleNavClick = (item: typeof navGroups[0]["items"][0]) => {
    if (!item.url) {
      toast({
        title: item.title,
        description: `Opening ${item.title} module. This connects to the iCM ${item.title} feature.`,
      });
    }
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border overflow-hidden shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shrink-0">
            <span className="font-display font-bold text-primary-foreground text-sm">CM</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="font-display font-bold text-foreground text-lg">Case Management AI</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.title}>
                  {item.url ? (
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 group"
                      activeClassName="bg-sidebar-accent text-primary glow-border"
                    >
                      <item.icon className="w-5 h-5 shrink-0 group-hover:text-primary transition-colors" />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="overflow-hidden whitespace-nowrap"
                          >
                            {item.title}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </NavLink>
                  ) : (
                    <button
                      onClick={() => handleNavClick(item)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 group"
                    >
                      <item.icon className="w-5 h-5 shrink-0 group-hover:text-primary transition-colors" />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="overflow-hidden whitespace-nowrap"
                          >
                            {item.title}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-sidebar-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </motion.aside>
  );
}
