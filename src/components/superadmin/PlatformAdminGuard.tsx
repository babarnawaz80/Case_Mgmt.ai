// PlatformAdminGuard — Restricts /super-admin to platform_admin role only
// Enforces domain-aware access rules:
//   RULE 1 — Customer domain (app.casemanagement.ai): super-admin routes blocked for everyone
//   RULE 2 — Admin domain (admin.casemanagement.ai): non-admin users redirected to app domain
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminDomain, isCustomerDomain } from '@/lib/domainConfig';

export function PlatformAdminGuard({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, isPlatformAdmin } = useAuth();

  // RULE 1 — Customer domain: super-admin is completely invisible.
  // Even a platform_admin visiting app.casemanagement.ai is sent to the customer dashboard.
  if (isCustomerDomain) {
    return <Navigate to="/dashboard" replace />;
  }

  // Wait for Firebase auth to resolve before making access decisions
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  // RULE 2 — Admin domain: unauthenticated users must log in via platform-login
  if (isAdminDomain && !isAuthenticated) {
    return <Navigate to="/platform-login" replace />;
  }

  // RULE 2 — Admin domain: authenticated but wrong role → redirect to customer app
  if (isAdminDomain && isAuthenticated && !isPlatformAdmin) {
    window.location.href = 'https://app.casemanagement.ai';
    return null;
  }

  // General fallback: not authenticated on any other domain
  if (!isAuthenticated) {
    return <Navigate to="/platform-login" replace />;
  }

  // General fallback: authenticated but not a platform_admin
  if (!isPlatformAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
