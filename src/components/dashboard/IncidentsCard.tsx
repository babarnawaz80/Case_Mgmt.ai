import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export function IncidentsCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-foreground text-lg">Incidents</h3>
          <p className="text-sm text-muted-foreground">1/20/2026 – 2/20/2026</p>
        </div>
      </div>

      <div className="flex items-center justify-center py-6">
        <div className="relative">
          <div className="w-28 h-28 rounded-full border-4 border-secondary flex items-center justify-center">
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-foreground">0</p>
              <p className="text-xs text-muted-foreground mt-0.5"># reported</p>
            </div>
          </div>
          <div className="absolute -top-1 -right-1 p-1.5 rounded-full bg-success/20">
            <AlertTriangle className="w-4 h-4 text-success" />
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">No incidents reported this period</p>
    </motion.div>
  );
}
