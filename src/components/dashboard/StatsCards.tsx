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
    accent: "from-primary to-accent",
  },
  {
    label: "On Track",
    value: "16.67%",
    change: "8 individuals",
    trend: "up" as const,
    icon: CheckCircle2,
    accent: "from-[hsl(152,55%,42%)] to-[hsl(160,50%,50%)]",
  },
  {
    label: "Out of Compliance",
    value: "83.33%",
    change: "Needs attention",
    trend: "down" as const,
    icon: AlertCircle,
    accent: "from-destructive to-[hsl(20,70%,55%)]",
  },
  {
    label: "Open Tasks",
    value: "0",
    change: "All caught up",
    trend: "up" as const,
    icon: Clock,
    accent: "from-info to-primary",
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
          className="relative overflow-hidden rounded-2xl bg-card border border-border/40 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
        >
          {/* Subtle gradient accent bar at top */}
          <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", stat.accent)} />
          
          <div className="flex items-start justify-between mb-4">
            <div className={cn("p-2.5 rounded-xl bg-gradient-to-br", stat.accent)}>
              <stat.icon className="w-4 h-4 text-white" />
            </div>
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
              stat.trend === "up" ? "bg-[hsl(152,55%,42%)]/10 text-[hsl(152,55%,42%)]" : "bg-destructive/10 text-destructive"
            )}>
              {stat.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {stat.change}
            </div>
          </div>
          <p className="text-3xl font-display font-bold text-foreground tracking-tight">{stat.value}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
