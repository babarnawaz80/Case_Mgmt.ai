import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { PCPChart } from "@/components/dashboard/PCPChart";
import { IncidentsCard } from "@/components/dashboard/IncidentsCard";
import { MyWorkCard } from "@/components/dashboard/MyWorkCard";
import { QuickActions } from "@/components/dashboard/QuickActions";

const Index = () => {
  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1600px] mx-auto">
        {/* Stats Row */}
        <StatsCards />

        {/* Middle Row: PCP wide + Incidents compact + My Work compact */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5">
            <PCPChart />
          </div>
          <div className="lg:col-span-3">
            <IncidentsCard />
          </div>
          <div className="lg:col-span-4">
            <MyWorkCard />
          </div>
        </div>

        {/* Quick Actions & Modules */}
        <QuickActions />
      </div>
    </AppLayout>
  );
};

export default Index;
