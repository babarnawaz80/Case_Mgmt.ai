import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export function IncidentsCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl bg-card border border-border/40 p-5 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground text-sm">Incidents</h3>
        <span className="text-[10px] text-muted-foreground">Jan 20 – Feb 20</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(152,55%,42%)]/10 border border-[hsl(152,55%,42%)]/20 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-[hsl(152,55%,42%)]" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[hsl(152,55%,42%)] flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">0</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-2xl font-display font-bold text-foreground">0</p>
          <p className="text-[11px] text-muted-foreground">Reported this period</p>
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-border/40">
        <p className="text-[10px] text-[hsl(152,55%,42%)] font-medium text-center flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3" /> All clear — no incidents
        </p>
      </div>
    </motion.div>
  );
}
