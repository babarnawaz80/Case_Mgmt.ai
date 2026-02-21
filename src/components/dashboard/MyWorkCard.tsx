import { motion } from "framer-motion";
import { Circle, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const workItems = [
  { label: "Open", count: 0, icon: Circle, colorClass: "text-info" },
  { label: "Past Due", count: 0, icon: AlertCircle, colorClass: "text-destructive" },
  { label: "In Progress", count: 0, icon: Clock, colorClass: "text-primary" },
  { label: "Completed", count: 0, icon: CheckCircle2, colorClass: "text-success" },
];

export function MyWorkCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-foreground text-lg">My Work</h3>
          <p className="text-sm text-muted-foreground">Task overview</p>
        </div>
        <button className="text-sm text-primary hover:underline">View Details</button>
      </div>

      <div className="space-y-4">
        {workItems.map((item) => (
          <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
            <item.icon className={`w-5 h-5 ${item.colorClass}`} />
            <span className="flex-1 text-sm text-foreground">{item.label}</span>
            <span className="text-lg font-display font-bold text-foreground">{item.count}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
