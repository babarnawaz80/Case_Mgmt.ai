import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "done" | "now" | "next" | "upcoming";

interface ScheduleItem {
  time: string;
  title: string;
  location: string;
  duration: string;
  status: Status;
}

const items: ScheduleItem[] = [
  { time: "09:00", title: "Daniel Okafor", location: "Cedar Court", duration: "45m", status: "done" },
  { time: "10:30", title: "Aisha Boateng", location: "Oak Residence", duration: "60m", status: "done" },
  { time: "12:15", title: "Care team standup", location: "Virtual", duration: "30m", status: "now" },
  { time: "14:00", title: "Theo Lindqvist", location: "Oak Residence", duration: "60m", status: "next" },
  { time: "15:30", title: "Marcus Holloway ISP review", location: "Maple House", duration: "45m", status: "upcoming" },
  { time: "16:30", title: "Progress notes (4)", location: "—", duration: "30m", status: "upcoming" },
];

function StatusPill({ status }: { status: Status }) {
  if (status === "done")
    return <span className="text-[10px] font-geist font-medium text-icm-text-faint uppercase tracking-wide">Done</span>;
  if (status === "now")
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green uppercase tracking-wide shadow-[0_0_0_3px_hsl(var(--icm-green)/0.15)]">
        <span className="w-1.5 h-1.5 rounded-full bg-icm-green animate-pulse" />
        Now
      </span>
    );
  if (status === "next")
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-accent-soft text-icm-accent uppercase tracking-wide">
        Next
      </span>
    );
  return null;
}

export function ScheduleCard() {
  return (
    <div className="rounded-[12px] border border-icm-border bg-icm-panel p-4 hover:border-icm-border-strong transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-tight font-semibold text-[15px] text-icm-text">Today's schedule</h3>
        <button className="text-[12px] font-geist text-icm-accent hover:underline flex items-center gap-0.5">
          View week <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <ul className="divide-y divide-icm-border">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-3 py-2.5">
            <span
              className={cn(
                "font-mono text-[12px] tabular-nums w-12 shrink-0",
                it.status === "done" ? "text-icm-text-faint line-through" : "text-icm-text"
              )}
            >
              {it.time}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-[13px] font-geist font-medium truncate",
                  it.status === "done" ? "text-icm-text-faint line-through" : "text-icm-text"
                )}
              >
                {it.title}
              </p>
              <p className={cn("text-[11px] truncate", it.status === "done" ? "text-icm-text-faint" : "text-icm-text-dim")}>
                {it.location} · {it.duration}
              </p>
            </div>
            <StatusPill status={it.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
