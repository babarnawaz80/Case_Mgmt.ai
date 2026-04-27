import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Bot, Users, Database, Activity, Shield, LayoutDashboard, BarChart2, Bell, Settings, MessageSquare } from 'lucide-react';
import { useBillingContext } from '@/contexts/BillingContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import AiChatPanel from '@/components/billing/AiChatPanel';
import type { UserRole } from '@/types/billing';

const navItems = [
  { path: '/billing/rcm', label: 'Revenue Cycle', icon: BarChart2 },
];

const BillingLayout = () => {
  const location = useLocation();
  const { role, setRole } = useBillingContext();
  const [chatOpen, setChatOpen] = useState(false);

  // Listen for custom event to open chat panel
  React.useEffect(() => {
    const handler = () => setChatOpen(true);
    window.addEventListener('open-ai-chat', handler);
    return () => window.removeEventListener('open-ai-chat', handler);
  }, []);

  const isActive = (path: string) => {
    if (path === '/billing/rcm') {
      return location.pathname === '/billing/rcm';
    }
    const prefixOrder = ['/billing/individuals', '/billing/agents', '/billing/engines', '/billing/runs', '/billing/audit'];
    if (prefixOrder.includes(path)) {
      return location.pathname === path || location.pathname.startsWith(path + '/');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="bg-card shrink-0 shadow-elevated">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-8">
            <h1 className="text-lg font-extrabold font-display tracking-tight">
              <span className="bg-gradient-to-r from-primary to-ai-violet bg-clip-text text-transparent">IDDBilling.ai</span>
            </h1>
            <nav className="flex items-center gap-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold font-display transition-colors ${
                    isActive(item.path)
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-billing-healthy/10 text-billing-healthy">
              <span className="w-1.5 h-1.5 rounded-full bg-billing-healthy animate-pulse" />
              iCM Connected
            </span>
            <div className="flex items-center gap-2">
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger className="w-32 h-8 text-xs rounded-xl border-none bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="billing-staff">Billing Staff</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="read-only">Read-only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Chat with AI button */}
            <button
              onClick={() => setChatOpen(o => !o)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold text-white bg-gradient-to-r from-[hsl(330,70%,55%)] to-[hsl(265,85%,55%)] hover:opacity-90 transition-opacity shadow-md"
            >
              <MessageSquare className="h-4 w-4" />
              Chat with AI
            </button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl font-semibold" asChild>
              <a href="/icm-dashboard">
                <LayoutDashboard className="h-4 w-4 mr-1.5" />
                ICM Dashboard
              </a>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <footer className="px-6 py-2 text-[10px] text-muted-foreground">
        ⚠️ No PHI should be entered into free-text fields in this demo.
      </footer>

      {/* AI Chat Panel */}
      <AiChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};

export default BillingLayout;
