import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export type ModuleAccess = 'view' | 'edit' | 'none';

export interface RolePermissions {
  // Modules
  dashboard: ModuleAccess;
  peoplelist: ModuleAccess;
  mywork: ModuleAccess;
  messages: ModuleAccess;
  reports: ModuleAccess;
  incidents: ModuleAccess;
  billing: ModuleAccess;
  platform: ModuleAccess;
  adminsettings: ModuleAccess;
  // eChart
  facesheet: ModuleAccess;
  contactnotes: ModuleAccess;
  progressnotes: ModuleAccess;
  visitsummaries: ModuleAccess;
  careplan: ModuleAccess;
  monitoringforms: ModuleAccess;
  assessments: ModuleAccess;
  eligibility: ModuleAccess;
  authorizations: ModuleAccess;
  casemanagement: ModuleAccess;
  referrals: ModuleAccess;
  consents: ModuleAccess;
  documents: ModuleAccess;
  leads: ModuleAccess;
  // Boolean permissions
  [key: string]: ModuleAccess | boolean;
}

// Default = everything allowed (fallback for admins and when Firestore unavailable)
const ALLOW_ALL: Partial<RolePermissions> = {
  dashboard: 'edit', peoplelist: 'edit', mywork: 'edit', messages: 'edit',
  reports: 'edit', incidents: 'edit', billing: 'edit', platform: 'edit', adminsettings: 'edit',
  facesheet: 'edit', contactnotes: 'edit', progressnotes: 'edit', visitsummaries: 'edit',
  careplan: 'edit', monitoringforms: 'edit', assessments: 'edit', eligibility: 'edit',
  authorizations: 'edit', casemanagement: 'edit', referrals: 'edit', consents: 'edit',
  documents: 'edit', leads: 'edit',
  canUseAmbientListening: true, canUseAIPrefill: true, canViewAISuggestions: true,
  canUseAIChat: true, canViewPlatform: true, canManageUsers: true, canManagePrograms: true,
};

export function useRolePermissions() {
  const { userProfile } = useAuth();
  const role = userProfile?.role ?? "admin";

  // Map role string → document ID in role_permissions collection
  const roleDocId = (
    {
      admin: "admin",
      supervisor: "supervisor",
      case_manager: "case_manager",
      billing: "billing",
      read_only: "read_only",
    } as Record<string, string>
  )[role] ?? "case_manager";

  const [permissions, setPermissions] = useState<Partial<RolePermissions>>(ALLOW_ALL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Admins always get full access
    if (role === "admin") {
      setPermissions(ALLOW_ALL);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "role_permissions", roleDocId),
      (snap) => {
        if (snap.exists()) {
          setPermissions({ ...ALLOW_ALL, ...snap.data().permissions });
        } else {
          setPermissions(ALLOW_ALL); // fallback
        }
        setLoading(false);
      },
      () => {
        setPermissions(ALLOW_ALL); // fallback on error
        setLoading(false);
      }
    );

    return unsub;
  }, [role, roleDocId]);

  const can = (key: string): boolean => {
    const val = permissions[key];
    if (typeof val === "boolean") return val;
    return val === "edit" || val === "view";
  };

  const canEdit = (module: string): boolean => permissions[module] === "edit";
  const canView = (module: string): boolean =>
    permissions[module] === "edit" || permissions[module] === "view";
  const isHidden = (module: string): boolean => permissions[module] === "none";

  return { permissions, loading, can, canEdit, canView, isHidden };
}
