import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const stats = [
  {
    label: "People Supported",
    value: "48",
    change: "+3 this month",
    trend: "up" as const,
    icon: Users,
    bg: "bg-primary",
  },
  {
    label: "On Track",
    value: "16.67%",
    change: "8 individuals",
    trend: "up" as const,
    icon: CheckCircle2,
    bg: "bg-success",
  },
  {
    label: "Out of Compliance",
    value: "83.33%",
    change: "Needs attention",
    trend: "down" as const,
    icon: AlertCircle,
    bg: "bg-destructive",
  },
  {
    label: "Open Tasks",
    value: "0",
    change: "All caught up",
    trend: "up" as const,
    icon: Clock,
    bg: "bg-warning",
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className={cn(
            "relative overflow-hidden rounded-2xl p-5 text-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer",
            stat.bg
          )}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-white/15">
              <stat.icon className="w-4 h-4 text-white" />
            </div>
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
              stat.trend === "up" ? "bg-white/20 text-white" : "bg-white/20 text-white"
            )}>
              {stat.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {stat.change}
            </div>
          </div>
          <p className="text-3xl font-display font-bold tracking-tight">{stat.value}</p>
          <p className="text-xs mt-1 font-medium uppercase tracking-wide opacity-85">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
