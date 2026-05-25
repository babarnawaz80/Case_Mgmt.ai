// Firebase Authentication Helpers
// CaseManagement.AI — HIPAA-Compliant Auth Layer
// Aligned with Claude PRD v2.0: single role string in users/{uid}.role

import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  AuthError,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export type AppRole = 'platform_admin' | 'admin' | 'supervisor' | 'case_manager';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  /** snake_case aliases (legacy components). Not persisted. */
  first_name?: string;
  last_name?: string;
  role: AppRole;
  organizationId: string;
  caseload: string[];           // Array of individual IDs
  phone?: string;
  npi_type1?: string;
  credential?: string;
  license_number?: string;
  isActive: boolean;
  lastLogin?: string;
  photoURL?: string;            // Firebase Storage URL for profile picture
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<void> {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    const authError = error as AuthError;
    throw new Error(getFriendlyAuthError(authError.code));
  }
}

// Sign out
export async function logOut(): Promise<void> {
  await signOut(auth);
}

// Send password reset email
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    const authError = error as AuthError;
    throw new Error(getFriendlyAuthError(authError.code));
  }
}

// Load user profile from users/{uid} — role is a single field on the user doc
export async function loadUserData(uid: string): Promise<{ profile: UserProfile }> {
  const profileDoc = await getDoc(doc(db, 'users', uid));

  if (!profileDoc.exists()) {
    throw new Error('User profile not found. Please contact your administrator.');
  }

  const data = profileDoc.data();
  const profile: UserProfile = {
    uid,
    email: data.email ?? '',
    displayName: data.displayName ?? `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    role: (data.role as AppRole) ?? 'case_manager',
    organizationId: data.organizationId ?? '',
    caseload: data.caseload ?? [],
    phone: data.phone,
    npi_type1: data.npi_type1,
    credential: data.credential,
    license_number: data.license_number,
    isActive: data.isActive ?? true,
    lastLogin: data.lastLogin,
    photoURL: data.photoURL,
  };

  return { profile };
}

/**
 * Bootstrap a user profile from Firebase Auth when no Firestore doc exists.
 * Creates users/{uid} with sensible defaults derived from Auth data.
 * NEVER overwrites an existing role — reads Firestore first to preserve it.
 */
export async function bootstrapUserProfile(user: User): Promise<UserProfile> {
  const email = user.email ?? '';
  const displayName = user.displayName ?? email.split('@')[0] ?? 'User';
  const nameParts = displayName.trim().split(' ');
  const firstName = nameParts[0] ?? 'User';
  const lastName = nameParts.slice(1).join(' ') || '';
  // Derive orgId from email domain so the same org is used consistently
  const domain = email.split('@')[1]?.replace(/\./g, '_') ?? 'demo_org';
  const organizationId = `org_${domain}`;

  // Check for existing Firestore doc — preserve its role if it already exists
  let existingRole: AppRole | null = null;
  let existingOrgId: string | null = null;
  try {
    const existing = await getDoc(doc(db, 'users', user.uid));
    if (existing.exists()) {
      existingRole = (existing.data().role as AppRole) ?? null;
      existingOrgId = existing.data().organizationId ?? null;
    }
  } catch { /* ignore — will write fresh doc */ }

  const role: AppRole = existingRole ?? 'admin';

  const profile: UserProfile = {
    uid: user.uid,
    email,
    displayName,
    firstName,
    lastName,
    role,
    organizationId: existingOrgId ?? organizationId,
    caseload: [],
    isActive: true,
    lastLogin: new Date().toISOString(),
  };

  // Write to Firestore — use merge and omit role field if it already exists
  // so platform_admin (or any pre-set role) is never downgraded
  const writeData: Record<string, unknown> = {
    uid: user.uid,
    email,
    displayName,
    firstName,
    lastName,
    organizationId: existingOrgId ?? organizationId,
    caseload: [],
    isActive: true,
    lastLogin: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  };
  if (!existingRole) {
    // Only write role when there's no existing role — never overwrite
    writeData.role = 'admin';
    writeData.createdAt = serverTimestamp();
  }
  await setDoc(doc(db, 'users', user.uid), writeData, { merge: true });

  console.log('[auth] Bootstrapped user profile for:', user.uid, 'role:', role);
  return profile;
}

// Subscribe to auth state changes
export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Check if a role meets a required minimum level
export function hasRole(userRole: AppRole, requiredRole: AppRole): boolean {
  const hierarchy: AppRole[] = ['case_manager', 'supervisor', 'admin', 'platform_admin'];
  return hierarchy.indexOf(userRole) >= hierarchy.indexOf(requiredRole);
}

// Convert Firebase auth error codes to user-friendly messages (PRD spec exact)
function getFriendlyAuthError(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with that email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect password. Please try again.';
    case 'auth/user-disabled':
      return 'Your account has been disabled. Please contact your administrator.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    default:
      return 'Authentication failed. Please try again.';
  }
}
