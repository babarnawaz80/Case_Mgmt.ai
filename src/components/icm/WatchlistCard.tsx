import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Person {
  initials: string;
  name: string;
  flags: string[];
  risk: number;
  level: "high" | "review" | "ok";
}

const people: Person[] = [
  { initials: "TL", name: "Theo Lindqvist", flags: ["Behavior plan", "Overdue ISP"], risk: 71, level: "high" },
  { initials: "DO", name: "Daniel Okafor", flags: ["Med change", "Fall risk"], risk: 78, level: "high" },
  { initials: "AB", name: "Aisha Boateng", flags: ["ISP renewal"], risk: 42, level: "review" },
  { initials: "EP", name: "Ezekiel Park", flags: ["Annual physical"], risk: 38, level: "review" },
];

function riskColor(r: number) {
  if (r >= 60) return "text-icm-red";
  if (r >= 35) return "text-icm-amber";
  return "text-icm-green";
}

function avatarBg(level: Person["level"]) {
  if (level === "high") return "bg-icm-red-soft text-icm-red";
  if (level === "review") return "bg-icm-amber-soft text-icm-amber";
  return "bg-icm-bg text-icm-text-dim";
}

export function WatchlistCard() {
  return (
    <div className="rounded-[12px] border border-icm-border bg-icm-panel p-4 hover:border-icm-border-strong transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-tight font-semibold text-[15px] text-icm-text">People needing attention</h3>
        <button className="text-[12px] font-geist text-icm-accent hover:underline flex items-center gap-0.5">
          All 48 <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <ul className="divide-y divide-icm-border">
        {people.map((p) => (
          <li key={p.name} className="flex items-center gap-3 py-2.5">
            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold shrink-0", avatarBg(p.level))}>
              {p.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-geist font-medium text-icm-text truncate">{p.name}</p>
              <p className="text-[11px] text-icm-text-dim truncate">{p.flags.join(" · ")}</p>
            </div>
            <span className={cn("font-mono text-[14px] font-semibold tabular-nums", riskColor(p.risk))}>{p.risk}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
