import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FileText, DollarSign, ClipboardList, Search, StickyNote, FileCheck, Workflow,
  Bell, Calendar, FolderOpen, Heart, Users, AlertTriangle,
  Building2, GraduationCap, Send, Tag, Shield, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const quickActions = [
  { title: "Activity Note", icon: FileText, gradient: "from-primary to-[hsl(210,70%,52%)]" },
  { title: "Billable Note", icon: DollarSign, gradient: "from-[hsl(152,55%,42%)] to-[hsl(160,50%,50%)]" },
  { title: "Assessment", icon: ClipboardList, gradient: "from-info to-primary" },
  { title: "Monitoring", icon: Search, gradient: "from-warning to-[hsl(30,70%,55%)]" },
  { title: "Progress Note", icon: StickyNote, gradient: "from-[hsl(270,50%,58%)] to-[hsl(280,45%,55%)]" },
  { title: "Visit Summary", icon: FileCheck, gradient: "from-[hsl(190,55%,48%)] to-[hsl(200,50%,52%)]" },
  { title: "Workflow", icon: Workflow, gradient: "from-accent to-primary" },
];

const modules = [
  { title: "Announcements", icon: Bell, url: "", color: "text-primary" },
  { title: "Attendance", icon: Calendar, url: "", color: "text-[hsl(152,55%,42%)]" },
  { title: "Documents", icon: FolderOpen, url: "", color: "text-info" },
  { title: "Care Tracker", icon: Heart, url: "", color: "text-destructive" },
  { title: "Custom Forms", icon: ClipboardList, url: "", color: "text-[hsl(270,50%,58%)]" },
  { title: "Incidents", icon: AlertTriangle, url: "", color: "text-warning" },
  { title: "My Sites", icon: Building2, url: "", color: "text-[hsl(190,55%,48%)]" },
  { title: "People Supported", icon: Users, url: "/people", color: "text-primary" },
  { title: "Outreach", icon: Send, url: "", color: "text-[hsl(160,45%,48%)]" },
  { title: "Training", icon: GraduationCap, url: "", color: "text-[hsl(30,70%,55%)]" },
  { title: "Plan of Correction", icon: Shield, url: "", color: "text-destructive" },
  { title: "SnapTag", icon: Tag, url: "", color: "text-accent" },
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
              className="group relative overflow-hidden rounded-2xl bg-card border border-border/40 p-4 flex flex-col items-center gap-2.5 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shadow-md", action.gradient)}>
                <action.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-semibold text-foreground text-center leading-tight">{action.title}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* All Modules — bigger buttons */}
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
              className="group relative rounded-2xl bg-card border border-border/40 p-5 flex flex-col items-center gap-3 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              <div className="p-3 rounded-xl bg-muted/50 border border-border/30 group-hover:bg-primary/5 group-hover:border-primary/15 transition-all">
                <mod.icon className={cn("w-5 h-5", mod.color)} />
              </div>
              <span className="text-xs font-semibold text-foreground text-center leading-tight">{mod.title}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
