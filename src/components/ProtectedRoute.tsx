// ProtectedRoute — Guards all authenticated routes
// CaseManagement.AI
// Redirects to /login if not authenticated. Shows spinner while auth resolves.
// Enforces SMS MFA enrollment when org security policy requires it.

import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole } from "@/lib/auth";
import { isMFAEnrolled } from "@/lib/mfa";
import { MFAEnrollModal } from "@/components/auth/MFAEnrollModal";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: AppRole;   // Optional — if set, user must have this role
}

export default function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission, userProfile } = useAuth();
  const location = useLocation();
  const [mfaCheckDone, setMfaCheckDone] = useState(false);
  const [requireMFAEnroll, setRequireMFAEnroll] = useState(false);

  // Check org-level MFA requirement after auth resolves
  useEffect(() => {
    if (!isAuthenticated || isLoading || !userProfile) return;

    const checkMFAPolicy = async () => {
      try {
        const orgId = userProfile.organizationId ?? "org-1";
        const orgSnap = await getDoc(doc(db, "organizations", orgId));
        if (orgSnap.exists()) {
          const sec = orgSnap.data()?.security ?? {};
          const orgRequiresMFA = sec.requireMFA === true;
          const alreadyEnrolled = isMFAEnrolled();
          if (orgRequiresMFA && !alreadyEnrolled) {
            setRequireMFAEnroll(true);
          }
        }
      } catch {
        // If policy check fails, don't block the user
      } finally {
        setMfaCheckDone(true);
      }
    };

    checkMFAPolicy();
  }, [isAuthenticated, isLoading, userProfile]);

  // Still resolving Firebase auth state — show spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf7ff]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <p className="text-sm text-slate-500">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  // Not logged in — redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Platform admins belong in /super-admin — but ONLY redirect from entry-point paths.
  // Redirecting on every path causes an infinite loop when platform_admin visits /people,
  // /settings, etc. (e.g. when impersonating a customer org to debug).
  if (isAuthenticated && userProfile?.role === 'platform_admin') {
    const { pathname } = location;
    if (pathname === '/' || pathname === '/login' || pathname === '/home') {
      return <Navigate to="/super-admin/organizations" replace />;
    }
  }

  // Role-gated route — user doesn't have required role
  if (requireRole && !hasPermission(requireRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf7ff]">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
          <p className="text-slate-500 text-sm">
            You don't have permission to view this page. Contact your administrator if you need access.
          </p>
        </div>
      </div>
    );
  }

  // MFA policy check still in progress — show spinner briefly
  if (isAuthenticated && !mfaCheckDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf7ff]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  // Org requires MFA and user hasn't enrolled yet — force enrollment
  if (requireMFAEnroll) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#faf7ff] via-white to-[#eef0ff]">
        <MFAEnrollModal
          onEnrolled={() => setRequireMFAEnroll(false)}
          optional={false}
        />
      </div>
    );
  }

  return <>{children}</>;
}
