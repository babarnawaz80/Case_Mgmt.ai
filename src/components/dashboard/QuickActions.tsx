import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Heart, Building2, GraduationCap, Calendar, DollarSign, Truck,
  StickyNote, Wrench, Send, Briefcase, Shield, ClipboardList,
  FileText, Users, Droplets, Home, AlertTriangle, Search
} from "lucide-react";
import { cn } from "@/lib/utils";

const modules = [
  { title: "Care Tracker", icon: Heart, bg: "bg-primary", url: "" },
  { title: "Sites & Programs", icon: Building2, bg: "bg-success", url: "" },
  { title: "Training Management", icon: GraduationCap, bg: "bg-warning", url: "" },
  { title: "Events", icon: Calendar, bg: "bg-destructive", url: "" },
  { title: "LTSS or 837 Billing", icon: DollarSign, bg: "bg-primary", url: "" },
  { title: "Fleet Management", icon: Truck, bg: "bg-success", url: "" },
  { title: "Leads & Outreach", icon: Send, bg: "bg-warning", url: "" },
  { title: "Staff Scheduler", icon: Briefcase, bg: "bg-destructive", url: "" },
  { title: "Note", icon: StickyNote, bg: "bg-primary", url: "" },
  { title: "Maintenance Request", icon: Wrench, bg: "bg-success", url: "" },
  { title: "Employer Lead", icon: Users, bg: "bg-warning", url: "" },
  { title: "Attendance", icon: Calendar, bg: "bg-primary", url: "" },
  { title: "Drills", icon: AlertTriangle, bg: "bg-success", url: "" },
  { title: "Clinical Contact Note", icon: FileText, bg: "bg-warning", url: "" },
  { title: "Ratio Compliance", icon: Shield, bg: "bg-primary", url: "" },
  { title: "Plan of Correction", icon: ClipboardList, bg: "bg-success", url: "" },
  { title: "Group Activity Mgmt", icon: Users, bg: "bg-warning", url: "" },
  { title: "Psych Referral Form", icon: Search, bg: "bg-primary", url: "" },
  { title: "Home Inspection", icon: Home, bg: "bg-success", url: "" },
  { title: "Water Temp Reading", icon: Droplets, bg: "bg-warning", url: "" },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {modules.map((mod, i) => (
          <motion.button
            key={mod.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.02 }}
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => mod.url && navigate(mod.url)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-left text-white font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md",
              mod.bg
            )}
          >
            <mod.icon className="w-4 h-4 shrink-0 opacity-90" />
            <span className="leading-tight">{mod.title}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
