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
import { seedDemoIfEmpty } from '../hooks/useDemoSeed';

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
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
          // Skip org seed for platform admins — they have no customer org
          if (userProfile.role !== 'platform_admin') {
            const orgId = userProfile.organizationId;
            const displayName = userProfile.displayName || user.email?.split('@')[0] || 'User';
            seedDemoIfEmpty(orgId, user.uid, displayName).catch(() => {});
            seedNotificationsForUser(user.uid, orgId).catch(() => {});
          }
        } catch (error) {
          console.error('[AuthContext] Fatal error loading user — signing out:', error);
          setFirebaseUser(null);
          setProfile(null);
          await logOut();
        }
      } else {
        // User signed out — clear both immediately, set isLoading false
        setFirebaseUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const role = profile?.role ?? null;

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
    // isAuthenticated only requires Firebase user — profile may lag briefly
    isAuthenticated: !!firebaseUser,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
