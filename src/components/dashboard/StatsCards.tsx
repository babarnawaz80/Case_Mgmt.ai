import { motion } from "framer-motion";
import { Users, AlertTriangle, Pill } from "lucide-react";
import { cn } from "@/lib/utils";

const heroStats = [
  {
    value: "48",
    label: "Current Individuals",
    sub: "Census Report >",
    icon: Users,
    bg: "bg-primary",
    iconBg: "bg-primary-foreground/20",
  },
  {
    value: "03",
    label: "Incident Reporting",
    sub: "Jan 20 – Feb 20",
    icon: AlertTriangle,
    bg: "bg-warning",
    iconBg: "bg-warning-foreground/20",
  },
  {
    value: "eMAR",
    label: "Daily Med Compliance",
    sub: "Details > Compute >",
    icon: Pill,
    bg: "bg-info",
    iconBg: "bg-info-foreground/20",
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {heroStats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className={cn(
            "relative rounded-2xl p-6 text-white overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300",
            stat.bg
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-4xl font-display font-bold leading-none">{stat.value}</p>
              <p className="text-sm font-semibold mt-1 opacity-95">{stat.label}</p>
              <p className="text-xs mt-1 opacity-70">{stat.sub}</p>
            </div>
            <div className={cn("p-3 rounded-xl", stat.iconBg)}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
