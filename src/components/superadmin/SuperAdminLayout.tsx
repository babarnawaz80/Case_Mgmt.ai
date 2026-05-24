// SuperAdminLayout — Dedicated shell for the Super Admin area
// Uses a dark navy sidebar to visually distinguish from the agency-facing app
import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2, Users, CreditCard, Activity, MessageSquare,
  HeartPulse, LogOut, ChevronLeft, ChevronRight, ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { isAdminDomain } from '@/lib/domainConfig';

const NAV_ITEMS = [
  { label: 'Organizations', icon: Building2, path: '/super-admin/organizations' },
  { label: 'All Users',     icon: Users,      path: '/super-admin/users' },
  { label: 'Billing',       icon: CreditCard, path: '/super-admin/billing' },
  { label: 'AI Usage',      icon: Activity,   path: '/super-admin/ai-usage' },
  { label: 'Support Notes', icon: MessageSquare, path: '/super-admin/support' },
  { label: 'Platform Health', icon: HeartPulse, path: '/super-admin/health' },
];

interface SuperAdminLayoutProps {
  children: ReactNode;
  title: string;
}

export function SuperAdminLayout({ children, title }: SuperAdminLayoutProps) {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#0d0d1a' }}>
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        className={cn(
          'flex flex-col flex-shrink-0 transition-all duration-300 border-r',
          collapsed ? 'w-[60px]' : 'w-[220px]',
        )}
        style={{
          background: '#12122a',
          borderColor: 'rgba(99,102,241,0.15)',
        }}
      >
        {/* Logo / Brand */}
        <div
          className="flex items-center gap-3 px-4 py-4 border-b"
          style={{ borderColor: 'rgba(99,102,241,0.15)' }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #6366f1 100%)' }}>
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-white font-manrope font-bold text-[13px] leading-tight">CaseManagement.AI</div>
              <div className="text-[9px] font-geist font-semibold tracking-widest"
                   style={{ color: '#14b8a6' }}>
                PLATFORM ADMIN
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path ||
                           location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-[13px] font-geist transition-all duration-150',
                  active
                    ? 'text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5',
                )}
                style={active ? {
                  background: 'linear-gradient(135deg, rgba(20,184,166,0.18) 0%, rgba(99,102,241,0.18) 100%)',
                  boxShadow: 'inset 0 0 0 1px rgba(20,184,166,0.25)',
                } : undefined}
              >
                <item.icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-teal-400' : '')} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t px-3 py-3 space-y-2" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
          {!collapsed && (
            <div className="px-1 pb-1">
              <div className="text-white text-[12px] font-geist font-medium truncate">{profile?.displayName}</div>
              <div className="text-slate-500 text-[10px] truncate">{profile?.email}</div>
            </div>
          )}
          <button
            onClick={() => { logout(); navigate('/login'); }}
            title="Sign out"
            className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-[12px] font-geist"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && 'Sign Out'}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-slate-600 hover:text-slate-300 transition-all text-[11px]"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Topbar */}
        <header
          className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
          style={{
            background: '#12122a',
            borderColor: 'rgba(99,102,241,0.15)',
          }}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-white font-manrope font-bold text-[16px]">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-geist font-bold tracking-widest"
              style={{
                background: 'linear-gradient(135deg, rgba(20,184,166,0.2) 0%, rgba(99,102,241,0.2) 100%)',
                color: '#14b8a6',
                border: '1px solid rgba(20,184,166,0.3)',
              }}
            >
              PLATFORM ADMIN
            </span>
            <button
              onClick={() => navigate('/home')}
              className="text-[12px] font-geist text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              ← App
            </button>
          </div>
        </header>

        {/* ── Admin Domain Banner (RULE 4) ──────────────────────────── */}
        {isAdminDomain && (
          <div
            className="flex items-center justify-center gap-2 px-6 py-1.5 text-[11px] font-geist flex-shrink-0"
            style={{
              background: 'rgba(20,184,166,0.07)',
              borderBottom: '1px solid rgba(20,184,166,0.15)',
              color: '#14b8a6',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse flex-shrink-0" />
            <span>You are on the admin portal · admin.casemanagement.ai</span>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6" style={{ background: '#0d0d1a' }}>
          <div className="max-w-[1300px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
