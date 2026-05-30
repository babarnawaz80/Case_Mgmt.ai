// Auth Context — Real Firebase Authentication
// CaseManagement.AI — Aligned with PRD v2.0
// Single role string (not array) on users/{uid}.role

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import {
  subscribeToAuthState,
  loadUserData,
  bootstrapUserProfile,
  logOut,
  hasRole,
  AppRole,
  UserProfile,
} from '../lib/auth';
import { audit } from '../lib/auditService';
import { seedNotificationsForUser } from '../hooks/useFirestoreNotifications';
import { seedDemoIfEmpty, seedScheduledVisitsIfEmpty, seedApprovalDemoData } from '../hooks/useDemoSeed';
import { seedAssessmentsIfEmpty } from '../lib/seedAssessments';
import { seedGuardianPortalIfEmpty } from '../lib/seedGuardianPortal';
import { seedCarePlanApprovalIfEmpty } from '../lib/seedCarePlanApproval';
import { initFCM, setupForegroundMessages } from '../lib/fcm';

interface AuthContextValue {
  // Auth state
  firebaseUser: User | null;
  currentUser: User | null;   // alias for firebaseUser
  profile: UserProfile | null;
  userProfile: UserProfile | null;  // alias for profile

  // Role helpers
  role: AppRole | null;
  isAdmin: boolean;
  isSupervisor: boolean;
  isCaseManager: boolean;
  isPlatformAdmin: boolean;

  // State flags
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  logout: () => Promise<void>;
  hasPermission: (requiredRole: AppRole) => boolean;
  refreshProfile?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Dev-only auth bypass ─────────────────────────────────────────────────────
// Set VITE_DEV_BYPASS_AUTH=true in .env.local to skip Firebase Auth entirely.
// Useful when Firebase or Firestore is temporarily unavailable (GCP outage,
// project suspension, etc.).  import.meta.env.DEV is always false in prod
// builds, so this can NEVER activate in production.
const DEV_BYPASS_AUTH =
  import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // Skip the loading state entirely when using the dev bypass
  const [isLoading, setIsLoading] = useState(!DEV_BYPASS_AUTH);

  useEffect(() => {
    // ── Dev bypass: inject a mock profile without touching Firebase ────────────
    if (DEV_BYPASS_AUTH) {
      console.warn(
        '[AuthContext] ⚠ VITE_DEV_BYPASS_AUTH=true — using mock admin profile. ' +
        'Never enable this in production.'
      );
      setProfile({
        uid: 'SyMfMQcIcAexWYB1xDQvc0ex0dm1',
        email: 'kathy@demo.casemanagement.ai',
        displayName: 'Kathy Martinez',
        firstName: 'Kathy',
        lastName: 'Martinez',
        role: 'admin',
        organizationId: 'org_casemanagement_ai',
        caseload: [],
        isActive: true,
      });
      // isLoading is already false — no further action needed
      return;
    }

    // ── Normal Firebase Auth flow ─────────────────────────────────────────────
    const unsubscribe = subscribeToAuthState(async (user) => {
      if (user) {
        try {
          // Try to load existing profile
          let userProfile: UserProfile;
          try {
            const result = await loadUserData(user.uid);
            userProfile = result.profile;
          } catch {
            // Profile missing — bootstrap it from Firebase Auth info
            console.log('[AuthContext] No user profile found — bootstrapping from Firebase Auth');
            userProfile = await bootstrapUserProfile(user);
          }
          setFirebaseUser(user);
          setProfile(userProfile);
          // Fire audit log — non-blocking, never let it crash the auth flow
          audit.login(user.uid).catch(e => console.warn('[AuthContext] Audit log failed (non-fatal):', e));
          // Initialise FCM push notifications — non-blocking, never fatal
          initFCM().catch(() => {});
          setupForegroundMessages().catch(() => {});
          // Skip org seed for platform admins — they have no customer org
          if (userProfile.role !== 'platform_admin') {
            const orgId = userProfile.organizationId;
            const displayName = userProfile.displayName || user.email?.split('@')[0] || 'User';
            seedDemoIfEmpty(orgId, user.uid, displayName).catch(() => {});
            seedScheduledVisitsIfEmpty(orgId, user.uid, displayName).catch(() => {});
            seedApprovalDemoData(orgId, user.uid).catch(() => {});
            seedNotificationsForUser(user.uid, orgId).catch(() => {});
            seedAssessmentsIfEmpty(orgId, user.uid).catch(() => {});
            seedGuardianPortalIfEmpty(orgId).catch(() => {});
            seedCarePlanApprovalIfEmpty(orgId, user.uid).catch(() => {});
          }
        } catch (error) {
          // ── IMPORTANT: do NOT call logOut() here ─────────────────────────────
          // Calling logOut when Firestore is unavailable creates a broken login
          // loop: Firebase Auth succeeds, Firestore fails, user is immediately
          // signed out, user tries again — repeat forever.
          //
          // Instead: keep the Firebase user signed in and synthesise a minimal
          // in-memory profile from Auth data alone (no Firestore required).
          // The real profile will load automatically on the next successful
          // Firestore round-trip.
          console.error(
            '[AuthContext] Firestore profile load failed — keeping user signed in ' +
            'with fallback profile. Firestore may be temporarily unavailable:',
            error
          );
          const email = user.email ?? '';
          const displayName = user.displayName ?? email.split('@')[0] ?? 'User';
          const nameParts = displayName.trim().split(' ');
          setFirebaseUser(user);
          setProfile({
            uid: user.uid,
            email,
            displayName,
            firstName: nameParts[0] ?? 'User',
            lastName: nameParts.slice(1).join(' '),
            // Default to admin so all navigation is accessible while Firestore recovers.
            // Real role will be restored on next successful profile load.
            role: 'admin',
            organizationId: 'org-1',
            caseload: [],
            isActive: true,
          });
        }
      } else {
        // User signed out — clear both immediately
        setFirebaseUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const role = profile?.role ?? null;

  const refreshProfile = async () => {
    if (firebaseUser) {
      try {
        const result = await loadUserData(firebaseUser.uid);
        setProfile(result.profile);
      } catch (err) {
        console.error('[AuthContext] Failed to refresh profile:', err);
      }
    }
  };

  const logout = async () => {
    await logOut();
  };

  // hasPermission checks if the user's role is >= the required role in the hierarchy
  const hasPermission = (requiredRole: AppRole) => {
    if (!role) return false;
    return hasRole(role, requiredRole);
  };

  const value: AuthContextValue = {
    firebaseUser,
    currentUser: firebaseUser,       // alias
    profile,
    userProfile: profile,            // alias
    role,
    isAdmin: role === 'admin' || role === 'platform_admin',
    isSupervisor: role === 'supervisor' || role === 'admin' || role === 'platform_admin',
    isCaseManager: role !== null,
    isPlatformAdmin: role === 'platform_admin',
    isLoading,
    // isAuthenticated: real Firebase user in normal mode; profile presence in bypass mode
    isAuthenticated: DEV_BYPASS_AUTH ? !!profile : !!firebaseUser,
    logout,
    hasPermission,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
