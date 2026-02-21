import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, Users } from "lucide-react";

const stats = [
  {
    label: "People Supported",
    value: "48",
    change: "+3 this month",
    trend: "up" as const,
    icon: Users,
  },
  {
    label: "On Track",
    value: "16.67%",
    change: "8 individuals",
    trend: "up" as const,
    icon: CheckCircle2,
  },
  {
    label: "Out of Compliance",
    value: "83.33%",
    change: "Needs attention",
    trend: "down" as const,
    icon: AlertCircle,
  },
  {
    label: "Open Tasks",
    value: "0",
    change: "All caught up",
    trend: "up" as const,
    icon: Clock,
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
          transition={{ delay: i * 0.1 }}
          className="glass rounded-xl p-5 hover:glow-border transition-all duration-300 group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <stat.icon className="w-5 h-5" />
            </div>
            {stat.trend === "up" ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
          <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          <p className="text-xs text-muted-foreground mt-2">{stat.change}</p>
        </motion.div>
      ))}
    </div>
  );
}
