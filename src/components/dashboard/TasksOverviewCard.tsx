import { NavLink } from "react-router-dom";
import { CheckSquare, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { useTaskSummary } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

export function TasksOverviewCard() {
  const { overdue, dueToday, dueThisWeek, completed, total, loading } = useTaskSummary();

  if (loading) {
    return (
      <div className="rounded-2xl border border-icm-border bg-icm-panel p-4 animate-pulse">
        <div className="h-4 w-32 bg-icm-border rounded mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-icm-border" />
          ))}
        </div>
      </div>
    );
  }

  // If no tasks yet from Firestore, show a helpful empty state
  if (total === 0) return null;

  return (
    <NavLink to="/my-work" className="block">
      <div className="rounded-2xl border border-icm-border bg-icm-panel p-4 hover:shadow-elevated transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-icm-accent" />
            <h3 className="font-manrope font-bold text-[13px] text-icm-text uppercase tracking-wider">
              My Tasks
            </h3>
          </div>
          <span className="text-[11px] font-geist font-semibold text-icm-accent inline-flex items-center gap-0.5">
            View all <ArrowRight className="w-3 h-3" />
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat
            icon={<AlertCircle className="w-3.5 h-3.5" />}
            label="Overdue"
            value={overdue}
            color={overdue > 0 ? "text-icm-red" : "text-icm-text"}
            bg={overdue > 0 ? "bg-icm-red-soft" : "bg-icm-bg"}
          />
          <Stat
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Due Today"
            value={dueToday}
            color={dueToday > 0 ? "text-icm-amber" : "text-icm-text"}
            bg={dueToday > 0 ? "bg-icm-amber-soft" : "bg-icm-bg"}
          />
          <Stat
            icon={<CheckSquare className="w-3.5 h-3.5" />}
            label="This Week"
            value={dueThisWeek}
            color="text-icm-accent"
            bg="bg-icm-accent-soft"
          />
          <Stat
            icon={<CheckSquare className="w-3.5 h-3.5" />}
            label="Completed"
            value={completed}
            color="text-icm-green"
            bg="bg-icm-green-soft"
          />
        </div>
      </div>
    </NavLink>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={cn("rounded-xl p-2.5", bg)}>
      <div className={cn("flex items-center gap-1 mb-1", color)}>{icon}</div>
      <p className={cn("text-[18px] font-extrabold font-manrope tabular-nums", color)}>
        {value}
      </p>
      <p className="text-[10px] text-icm-text-faint font-geist">{label}</p>
    </div>
  );
}
