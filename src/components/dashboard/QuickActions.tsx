import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FileText, DollarSign, ClipboardList, Search, StickyNote, FileCheck, Workflow,
  Bell, Calendar, FolderOpen, Heart, Users, AlertTriangle,
  Building2, GraduationCap, Send, Tag, Shield, ArrowRight,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const categoryStyles = {
  documentation: { bg: "#EBF4FD", text: "#1a5f8a", iconBg: "rgba(26, 95, 138, 0.12)" },
  operations: { bg: "#FEF4EC", text: "#b85c00", iconBg: "rgba(184, 92, 0, 0.12)" },
  care: { bg: "#F0EEFF", text: "#5b3fa6", iconBg: "rgba(91, 63, 166, 0.12)" },
};

const quickActions: Array<{
  title: string;
  icon: typeof FileText;
  category: "documentation" | "operations" | "care";
  directTo?: string;
}> = [
  { title: "Activity Note", icon: FileText, category: "documentation", directTo: "/modules/contact-note" },
  { title: "Billable Note", icon: DollarSign, category: "operations" },
  { title: "Assessment", icon: ClipboardList, category: "documentation" },
  { title: "Monitoring", icon: Search, category: "operations", directTo: "/monitoring-form" },
  { title: "Progress Note", icon: StickyNote, category: "documentation", directTo: "/progress-note" },
  { title: "Visit Summary", icon: FileCheck, category: "operations", directTo: "/visit-summary" },
  { title: "Workflow", icon: Workflow, category: "documentation" },
];

const modules = [
  { title: "Announcements", icon: Bell, url: "", category: "care" },
  { title: "Attendance", icon: Calendar, url: "", category: "operations" },
  { title: "Documents", icon: FolderOpen, url: "", category: "documentation" },
  { title: "Care Tracker", icon: Heart, url: "", category: "care" },
  { title: "Custom Forms", icon: ClipboardList, url: "", category: "documentation" },
  { title: "Incidents", icon: AlertTriangle, url: "", category: "operations" },
  { title: "My Sites", icon: Building2, url: "", category: "operations" },
  { title: "People Supported", icon: Users, url: "/people", category: "care" },
  { title: "Authorizations", icon: Send, url: "/billing", category: "operations" },
  { title: "Caseload Reports", icon: BarChart3, url: "/reports", category: "operations" },
  { title: "Training", icon: GraduationCap, url: "", category: "operations" },
  { title: "Plan of Correction", icon: Shield, url: "", category: "operations" },
  { title: "SnapTag", icon: Tag, url: "", category: "care" },
];

export function QuickActions() {
  const navigate = useNavigate();

  const handleQuickAction = (action: typeof quickActions[number]) => {
    if (action.directTo) {
      navigate(action.directTo);
    } else {
      toast({
        title: action.title,
        description: `Opening ${action.title} form. This connects to the iCM ${action.title} module.`,
      });
    }
  };

  const handleModuleClick = (mod: typeof modules[0]) => {
    if (mod.url) {
      navigate(mod.url);
    } else {
      toast({
        title: mod.title,
        description: `Opening ${mod.title} module. This connects to iCM.`,
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-foreground text-sm uppercase tracking-wide">Quick Actions</h3>
        </div>
        <div className="space-y-4">
          {(
            [
              { key: "documentation", label: "Documentation" },
              { key: "operations", label: "Operations" },
              { key: "care", label: "Care" },
            ] as { key: "documentation" | "operations" | "care"; label: string }[]
          ).map(({ key, label }) => {
            const tiles = quickActions.filter((a) => a.category === key);
            if (tiles.length === 0) return null;
            return (
              <div key={key}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {label}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {tiles.map((action, i) => (
                    <motion.button
                      key={action.title}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.04 }}
                      whileHover={{ y: -3, scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleQuickAction(action)}
                      className={cn(
                        "group relative overflow-hidden rounded-2xl p-4 flex flex-col items-center gap-2.5 shadow-sm hover:shadow-lg transition-all duration-300",
                      )}
                      style={{ backgroundColor: categoryStyles[action.category].bg, color: categoryStyles[action.category].text }}
                    >
                      <div className="p-2.5 rounded-xl" style={{ backgroundColor: categoryStyles[action.category].iconBg }}>
                        <action.icon className="w-4 h-4" style={{ color: categoryStyles[action.category].text }} />
                      </div>
                      <span className="text-[11px] font-semibold text-center leading-tight">{action.title}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Modules */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-foreground text-sm uppercase tracking-wide">All Modules</h3>
          <button
            onClick={() => toast({ title: "All Modules", description: "Showing complete module list. Each module connects to the corresponding iCM feature." })}
            className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {modules.map((mod, i) => (
            <motion.button
              key={mod.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.03 }}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleModuleClick(mod)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3.5 font-semibold text-xs shadow-sm hover:shadow-lg transition-all duration-300",
              )}
              style={{ backgroundColor: categoryStyles[mod.category as keyof typeof categoryStyles].bg, color: categoryStyles[mod.category as keyof typeof categoryStyles].text }}
            >
              <mod.icon className="w-4 h-4 shrink-0 opacity-90" />
              <span className="leading-tight text-left">{mod.title}</span>
            </motion.button>
          ))}
        </div>
      </div>

    </div>
  );
}

