import { Bell, Mail, Sparkles, User, BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function AppHeader() {
  const navigate = useNavigate();

  return (
    <header className="h-16 border-b border-border glass flex items-center justify-between px-6 shrink-0">
      <div>
        <h2 className="font-display font-semibold text-foreground text-lg">iCM Dashboard</h2>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
        </button>
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
          <Mail className="w-5 h-5" />
        </button>

        {/* Agents Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/lifeplan")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[hsl(270,60%,58%)] to-[hsl(200,80%,50%)] text-white font-medium text-sm transition-all shadow-sm hover:shadow-lg"
        >
          <BrainCircuit className="w-4 h-4" />
          <span>Agents</span>
        </motion.button>

        {/* AI Companion Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground font-medium text-sm animate-pulse-glow transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Companion</span>
        </motion.button>

        <div className="ml-2 flex items-center gap-3 pl-4 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground">Case Manager</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </header>
  );
}
