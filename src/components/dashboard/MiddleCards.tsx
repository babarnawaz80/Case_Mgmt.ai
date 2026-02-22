import { motion } from "framer-motion";
import { Heart, FileWarning, Circle, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const complianceData = [
  { name: "On Track", value: 16.67, color: "hsl(152, 55%, 42%)" },
  { name: "Off Track", value: 0, color: "hsl(38, 92%, 50%)" },
  { name: "Out of Compliance", value: 83.33, color: "hsl(0, 65%, 54%)" },
];

const servicePercent = 87;

const workItems = [
  { label: "Open", count: 0, color: "bg-info", dot: "bg-info" },
  { label: "Past Due", count: 0, color: "bg-destructive", dot: "bg-destructive" },
  { label: "In Progress", count: 0, color: "bg-primary", dot: "bg-primary" },
  { label: "Completed", count: 0, color: "bg-success", dot: "bg-success" },
];

function MiniDonut({ percent, color }: { percent: number; color: string }) {
  const data = [
    { value: percent, color },
    { value: 100 - percent, color: "hsl(var(--muted))" },
  ];
  return (
    <div className="w-20 h-20">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={26} outerRadius={36} dataKey="value" strokeWidth={0}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MiddleCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Services / Care Tracker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-card border border-border/40 p-5 flex flex-col"
      >
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-xs font-bold text-success uppercase tracking-wide">Services</p>
            <p className="text-[11px] text-muted-foreground">Care Tracker</p>
            <p className="text-[10px] text-muted-foreground">Compliance Report &gt;</p>
          </div>
          <Heart className="w-4 h-4 text-destructive" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            <MiniDonut percent={servicePercent} color="hsl(152, 55%, 42%)" />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-display font-bold text-foreground">
              {servicePercent}%
            </span>
          </div>
        </div>
      </motion.div>

      {/* Non-Verified Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl bg-card border border-border/40 p-5 flex flex-col"
      >
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-xs font-bold text-warning uppercase tracking-wide">Non-Verified</p>
            <p className="text-[11px] text-muted-foreground">Orders</p>
            <p className="text-[10px] text-primary cursor-pointer hover:underline">Details &gt;</p>
          </div>
          <FileWarning className="w-4 h-4 text-warning" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <span className="text-destructive text-lg font-bold">#</span>
            <span className="text-3xl font-display font-bold text-foreground">04</span>
          </div>
        </div>
      </motion.div>

      {/* My Work */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-card border border-border/40 p-5 flex flex-col"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">My Work</p>
          <p className="text-[10px] text-primary cursor-pointer hover:underline">Details &gt;</p>
        </div>
        <div className="grid grid-cols-2 gap-2 flex-1">
          {workItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", item.dot)} />
              <div>
                <span className="text-[11px] text-muted-foreground">{item.label}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center">
          <MiniDonut percent={0} color="hsl(var(--primary))" />
        </div>
      </motion.div>

      {/* ISP / PCP Compliance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl bg-card border border-border/40 p-5 flex flex-col"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">PCP Compliance</p>
          <p className="text-[10px] text-primary cursor-pointer hover:underline">Details &gt;</p>
        </div>
        <div className="space-y-2 mb-3">
          {complianceData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] text-muted-foreground flex-1">{item.name}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <div className="relative">
            <MiniDonut percent={16.67} color="hsl(152, 55%, 42%)" />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-display font-bold text-foreground">
              17%
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
