import { motion } from "framer-motion";
import { Circle, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const workItems = [
  { label: "Open", count: 0, icon: Circle, color: "text-info", bg: "bg-info/10" },
  { label: "Past Due", count: 0, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
  { label: "In Progress", count: 0, icon: Clock, color: "text-primary", bg: "bg-primary/10" },
  { label: "Completed", count: 0, icon: CheckCircle2, color: "text-[hsl(152,55%,42%)]", bg: "bg-[hsl(152,55%,42%)]/10" },
];

export function MyWorkCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-2xl bg-card border border-border/40 p-5 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground text-sm">My Work</h3>
        <button className="text-[11px] text-primary font-medium hover:underline">View All</button>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1">
        {workItems.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-xl border border-border/30 hover:border-primary/20 transition-all",
              item.bg
            )}
          >
            <item.icon className={cn("w-4 h-4 mb-1.5", item.color)} />
            <span className="text-xl font-display font-bold text-foreground leading-none">{item.count}</span>
            <span className="text-[10px] text-muted-foreground mt-1 font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
