import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { PCPChart } from "@/components/dashboard/PCPChart";
import { IncidentsCard } from "@/components/dashboard/IncidentsCard";
import { MyWorkCard } from "@/components/dashboard/MyWorkCard";
import { QuickActions } from "@/components/dashboard/QuickActions";

const Index = () => {
  return (
    <AppLayout>
      <div className="space-y-6 max-w-[1600px] mx-auto">
        {/* Stats Row */}
        <StatsCards />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <PCPChart />
          <IncidentsCard />
          <MyWorkCard />
        </div>

        {/* Quick Actions & Modules */}
        <QuickActions />
      </div>
    </AppLayout>
  );
};

export default Index;
