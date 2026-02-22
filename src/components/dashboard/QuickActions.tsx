import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FileText, DollarSign, ClipboardList, Search, StickyNote, FileCheck, Workflow,
  Bell, Calendar, FolderOpen, Heart, Users, AlertTriangle,
  Building2, GraduationCap, Send, Tag, Shield, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const quickActions = [
  { title: "Activity Note", icon: FileText, bg: "bg-primary" },
  { title: "Billable Note", icon: DollarSign, bg: "bg-success" },
  { title: "Assessment", icon: ClipboardList, bg: "bg-info" },
  { title: "Monitoring", icon: Search, bg: "bg-warning" },
  { title: "Progress Note", icon: StickyNote, bg: "bg-primary" },
  { title: "Visit Summary", icon: FileCheck, bg: "bg-success" },
  { title: "Workflow", icon: Workflow, bg: "bg-info" },
];

const modules = [
  { title: "Announcements", icon: Bell, url: "", bg: "bg-primary" },
  { title: "Attendance", icon: Calendar, url: "", bg: "bg-success" },
  { title: "Documents", icon: FolderOpen, url: "", bg: "bg-warning" },
  { title: "Care Tracker", icon: Heart, url: "", bg: "bg-destructive" },
  { title: "Custom Forms", icon: ClipboardList, url: "", bg: "bg-primary" },
  { title: "Incidents", icon: AlertTriangle, url: "", bg: "bg-warning" },
  { title: "My Sites", icon: Building2, url: "", bg: "bg-success" },
  { title: "People Supported", icon: Users, url: "/people", bg: "bg-info" },
  { title: "Outreach", icon: Send, url: "", bg: "bg-primary" },
  { title: "Training", icon: GraduationCap, url: "", bg: "bg-warning" },
  { title: "Plan of Correction", icon: Shield, url: "", bg: "bg-destructive" },
  { title: "SnapTag", icon: Tag, url: "", bg: "bg-success" },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-foreground text-sm uppercase tracking-wide">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.04 }}
              whileHover={{ y: -3, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "group relative overflow-hidden rounded-2xl p-4 flex flex-col items-center gap-2.5 text-white shadow-sm hover:shadow-lg transition-all duration-300",
                action.bg
              )}
            >
              <div className="p-2.5 rounded-xl bg-white/20">
                <action.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-semibold text-center leading-tight">{action.title}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* All Modules */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-foreground text-sm uppercase tracking-wide">All Modules</h3>
          <button className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1">
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
              onClick={() => mod.url && navigate(mod.url)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3.5 text-white font-semibold text-xs shadow-sm hover:shadow-lg transition-all duration-300",
                mod.bg
              )}
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
