// PlatformAdminGuard — Restricts /super-admin to platform_admin role only
// Any other authenticated user is redirected to /home
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function PlatformAdminGuard({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, isPlatformAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/platform-login" replace />;
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
