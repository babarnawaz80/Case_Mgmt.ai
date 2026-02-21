import { AppHeader } from "./AppHeader";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <AppHeader />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
