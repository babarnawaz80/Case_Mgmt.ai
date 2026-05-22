import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { people } from "@/data/people";

const stats = [
  {
    label: "People Supported",
    value: people.length.toString(),
    change: "+3 this month",
    trend: "up" as const,
    icon: Users,
    bg: "bg-primary/10",
    textColor: "text-primary",
    iconColor: "text-primary",
  },
  {
    label: "On Track",
    value: "16.67%",
    change: "8 individuals",
    trend: "up" as const,
    icon: CheckCircle2,
    bg: "bg-success/10",
    textColor: "text-success",
    iconColor: "text-success",
  },
  {
    label: "Out of Compliance",
    value: "83.33%",
    change: "Needs attention",
    trend: "down" as const,
    icon: AlertCircle,
    bg: "bg-destructive/10",
    textColor: "text-destructive",
    iconColor: "text-destructive",
  },
  {
    label: "Open Tasks",
    value: "0",
    change: "All caught up",
    trend: "up" as const,
    icon: Clock,
    bg: "bg-warning/10",
    textColor: "text-warning",
    iconColor: "text-warning",
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
            "relative overflow-hidden rounded-2xl p-5 border border-border/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer",
            stat.bg
          )}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={cn("p-2.5 rounded-xl", stat.bg)}>
              <stat.icon className={cn("w-4 h-4", stat.iconColor)} />
            </div>
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
              stat.bg, stat.textColor
            )}>
              {stat.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {stat.change}
            </div>
          </div>
          <p className={cn("text-3xl font-display font-bold tracking-tight text-foreground")}>{stat.value}</p>
          <p className={cn("text-xs mt-1 font-medium uppercase tracking-wide text-muted-foreground")}>{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
