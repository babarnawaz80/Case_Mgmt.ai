import { Bot, MoreVertical, Copy, Trash2, Eye, Play, CheckCircle2, Clock, Users } from "lucide-react";
import { Agent } from "@/types/agent";
import { cn } from "@/lib/utils";

const cardThemes = [
  { bg: "from-[hsl(200,65%,52%)] to-[hsl(210,55%,62%)]", statColor: "text-primary" },
  { bg: "from-[hsl(160,45%,48%)] to-[hsl(160,40%,58%)]", statColor: "text-emerald-500" },
  { bg: "from-[hsl(30,70%,55%)] to-[hsl(30,60%,65%)]", statColor: "text-amber-500" },
  { bg: "from-[hsl(350,55%,58%)] to-[hsl(350,50%,68%)]", statColor: "text-rose-500" },
  { bg: "from-[hsl(270,50%,58%)] to-[hsl(270,45%,68%)]", statColor: "text-violet-500" },
  { bg: "from-[hsl(190,55%,48%)] to-[hsl(190,50%,58%)]", statColor: "text-cyan-500" },
];

interface AgentCardProps {
  agent: Agent;
  colorIndex?: number;
  onClick?: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
}

export function LifePlanAgentCard({ agent, colorIndex = 0, onClick, onDelete }: AgentCardProps) {
  const theme = cardThemes[colorIndex % cardThemes.length];

  // Mock stats
  const stats = {
    implemented: Math.floor(Math.random() * 8),
    inProgress: Math.floor(Math.random() * 4),
    total: Math.floor(Math.random() * 15) + 3,
  };

  return (
    <div
      className="group relative rounded-2xl bg-card border border-border/40 overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 ease-out hover:-translate-y-1"
      onClick={() => onClick?.(agent)}
    >
      {/* Colored header */}
      <div className={cn("relative bg-gradient-to-br px-5 pt-5 pb-6", theme.bg)}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 blur-2xl -translate-y-8 translate-x-8" />

        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-white/20 border border-white/15 shadow-lg shrink-0">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[15px] text-white truncate leading-tight">{agent.name}</h3>
            <p className="text-[11px] text-white/60 mt-0.5">{agent.planType}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-4 pb-5">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem] leading-relaxed">
          {agent.description || "No description provided"}
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2.5 rounded-xl bg-muted/40 border border-border/40">
            <CheckCircle2 className={cn("h-4 w-4 mx-auto mb-1", theme.statColor)} />
            <div className={cn("text-xl font-bold leading-none", theme.statColor)}>{stats.implemented}</div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1 font-medium">Implemented</p>
          </div>
          <div className="text-center p-2.5 rounded-xl bg-muted/40 border border-border/40">
            <Clock className="h-4 w-4 mx-auto mb-1 text-amber-500" />
            <div className="text-xl font-bold text-amber-500 leading-none">{stats.inProgress}</div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1 font-medium">In Progress</p>
          </div>
          <div className="text-center p-2.5 rounded-xl bg-muted/40 border border-border/40">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-xl font-bold text-foreground leading-none">{stats.total}</div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1 font-medium">Individuals</p>
          </div>
        </div>

        <button
          className={cn(
            "w-full h-9 gap-2 rounded-xl text-xs font-medium flex items-center justify-center",
            "bg-gradient-to-r text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all",
            theme.bg
          )}
          onClick={(e) => { e.stopPropagation(); onClick?.(agent); }}
        >
          <Play className="h-3 w-3 fill-current" />
          Open Agent
        </button>
      </div>
    </div>
  );
}
