import { motion } from "framer-motion";
import {
  FileText,
  DollarSign,
  ClipboardList,
  Search,
  StickyNote,
  FileCheck,
  Workflow,
  BookOpen,
  Bell,
  Calendar,
  FolderOpen,
  Heart,
  Users,
  AlertTriangle,
  Building2,
  GraduationCap,
  Send,
  Tag,
  Shield,
} from "lucide-react";

const quickActions = [
  { title: "Activity Note", icon: FileText, color: "from-primary/20 to-info/20" },
  { title: "Billable Note", icon: DollarSign, color: "from-success/20 to-primary/20" },
  { title: "Assessment", icon: ClipboardList, color: "from-info/20 to-primary/20" },
  { title: "Monitoring", icon: Search, color: "from-warning/20 to-primary/20" },
  { title: "Progress Note", icon: StickyNote, color: "from-primary/20 to-accent/20" },
  { title: "Visit Summary", icon: FileCheck, color: "from-info/20 to-success/20" },
  { title: "Workflow", icon: Workflow, color: "from-accent/20 to-primary/20" },
];

const modules = [
  { title: "Announcements", icon: Bell },
  { title: "Attendance", icon: Calendar },
  { title: "Documents", icon: FolderOpen },
  { title: "Care Tracker", icon: Heart },
  { title: "Custom Forms", icon: BookOpen },
  { title: "Incidents", icon: AlertTriangle },
  { title: "My Sites", icon: Building2 },
  { title: "People Supported", icon: Users },
  { title: "Outreach", icon: Send },
  { title: "Training", icon: GraduationCap },
  { title: "Plan of Correction", icon: Shield },
  { title: "SnapTag", icon: Tag },
];

export function QuickActions() {
  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div>
        <h3 className="font-display font-semibold text-foreground text-lg mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`glass rounded-xl p-4 flex flex-col items-center gap-3 hover:glow-border transition-all duration-300 bg-gradient-to-br ${action.color}`}
            >
              <action.icon className="w-6 h-6 text-primary" />
              <span className="text-xs font-medium text-foreground text-center leading-tight">{action.title}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* All Modules */}
      <div>
        <h3 className="font-display font-semibold text-foreground text-lg mb-4">All Modules</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {modules.map((mod, i) => (
            <motion.button
              key={mod.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.04 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="glass rounded-xl p-4 flex flex-col items-center gap-3 hover:bg-secondary/80 transition-all duration-200"
            >
              <mod.icon className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground text-center leading-tight">{mod.title}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
