// PlatformAdminGuard — Restricts /super-admin routes to platform_admin role only.
// Simple role check — no domain magic.
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function PlatformAdminGuard({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, isPlatformAdmin } = useAuth();

  // Wait for Firebase auth to finish loading profile before deciding
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  // Not logged in → send to platform login
  if (!isAuthenticated) {
    return <Navigate to="/platform-login" replace />;
  }

  // Logged in but wrong role → send to customer home
  if (!isPlatformAdmin) {
    return <Navigate to="/home" replace />;
  }

  // All good — platform admin confirmed
  return <>{children}</>;
}
