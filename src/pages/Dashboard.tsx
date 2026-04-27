import { ICMShell } from "@/components/icm/ICMShell";
import { KPIRow } from "@/components/icm/KPIRow";
import { ScheduleCard } from "@/components/icm/ScheduleCard";
import { WatchlistCard } from "@/components/icm/WatchlistCard";
import { ModuleGrid } from "@/components/icm/ModuleGrid";

const Dashboard = () => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <ICMShell title="iCM Dashboard">
      <div className="space-y-5">
        {/* Greeting */}
        <div>
          <h1 className="font-tight text-[26px] font-semibold text-icm-text leading-tight tracking-[-0.02em]">
            {greeting}, Kathy
          </h1>
          <p className="text-[13px] text-icm-text-dim mt-1">
            You have 3 items needing attention and 4 visits remaining today.
          </p>
        </div>

        {/* KPIs */}
        <KPIRow />

        {/* Two column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ScheduleCard />
          <WatchlistCard />
        </div>

        {/* Module grid */}
        <ModuleGrid />
      </div>
    </ICMShell>
  );
};

export default Dashboard;
