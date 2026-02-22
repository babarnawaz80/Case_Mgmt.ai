import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { MiddleCards } from "@/components/dashboard/MiddleCards";
import { QuickActions } from "@/components/dashboard/QuickActions";

const Index = () => {
  return (
    <AppLayout>
      <div className="space-y-5 max-w-[1600px] mx-auto">
        <StatsCards />
        <MiddleCards />
        <QuickActions />
      </div>
    </AppLayout>
  );
};

export default Index;
