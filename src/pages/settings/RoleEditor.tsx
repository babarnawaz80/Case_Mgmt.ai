import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, RotateCcw, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type ModuleAccess = "view" | "edit" | "none";

interface RoleDoc {
  roleName: string;
  description: string;
  color: string;
  userCount: number;
  isBuiltIn: boolean;
  tenantId?: string;
  permissions: Record<string, ModuleAccess | boolean>;
  updatedAt?: unknown;
  updatedBy?: string;
}

// ─── Section labels ──────────────────────────────────────────────────────────
const NAV_MODULES: Array<{ key: string; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "peoplelist", label: "People List" },
  { key: "mywork", label: "My Work" },
  { key: "messages", label: "Messages" },
  { key: "reports", label: "Reports" },
  { key: "incidents", label: "Incidents" },
  { key: "billing", label: "Billing" },
  { key: "platform", label: "Platform" },
  { key: "adminsettings", label: "Admin Settings" },
];

const ECHART_MODULES: Array<{ key: string; label: string }> = [
  { key: "facesheet", label: "Face Sheet" },
  { key: "contactnotes", label: "Contact Notes" },
  { key: "progressnotes", label: "Progress Notes" },
  { key: "visitsummaries", label: "Visit Summaries" },
  { key: "careplan", label: "Care Plan / ISP" },
  { key: "monitoringforms", label: "Monitoring Forms" },
  { key: "assessments", label: "Assessments" },
  { key: "eligibility", label: "Eligibility" },
  { key: "authorizations", label: "Authorizations" },
  { key: "casemanagement", label: "Case Management" },
  { key: "referrals", label: "Referrals" },
  { key: "consents", label: "Consents" },
  { key: "documents", label: "Documents" },
  { key: "leads", label: "Leads" },
];

// Documentation tab sections
const DOC_SECTIONS: Array<{
  title: string;
  perms: Array<{ key: string; label: string }>;
}> = [
  {
    title: "CONTACT NOTES",
    perms: [
      { key: "canCreateContactNotes", label: "Create contact notes" },
      { key: "canEditOthersNotes", label: "Edit others' notes" },
      { key: "canDeleteNotes", label: "Delete notes" },
      { key: "canSignNotes", label: "Sign notes" },
      { key: "canSignOthersNotes", label: "Sign others' notes" },
    ],
  },
  {
    title: "PROGRESS NOTES",
    perms: [
      { key: "canCreateProgressNotes", label: "Create progress notes" },
      { key: "canEditOthersNotes", label: "Edit others' notes" },
      { key: "canDeleteNotes", label: "Delete notes" },
      { key: "canSignNotes", label: "Sign notes" },
      { key: "canMarkBillable", label: "Mark as billable" },
    ],
  },
  {
    title: "MONITORING FORMS",
    perms: [
      { key: "canCreateMonitoringForms", label: "Create monitoring forms" },
      { key: "canEditSubmittedForms", label: "Edit submitted forms" },
    ],
  },
  {
    title: "CARE PLAN / ISP",
    perms: [
      { key: "canCreateCarePlans", label: "Create care plans" },
      { key: "canSubmitCarePlans", label: "Submit care plans" },
      { key: "canApproveCarePlans", label: "Approve care plans" },
    ],
  },
  {
    title: "ASSESSMENTS",
    perms: [
      { key: "canStartAssessments", label: "Start assessments" },
      { key: "canSubmitAssessments", label: "Submit assessments" },
      { key: "canEditSubmittedAssessments", label: "Edit submitted assessments" },
    ],
  },
];

// Clinical tab sections
const CLINICAL_SECTIONS: Array<{
  title: string;
  perms: Array<{ key: string; label: string }>;
}> = [
  {
    title: "INCIDENTS",
    perms: [
      { key: "canReportIncidents", label: "Report incidents" },
      { key: "canViewOrgWideIncidents", label: "View org-wide incidents" },
      { key: "canCloseIncidents", label: "Close incidents" },
    ],
  },
  {
    title: "REFERRALS",
    perms: [{ key: "canCreateReferrals", label: "Create referrals" }],
  },
  {
    title: "SERVICE AUTHORIZATIONS",
    perms: [
      { key: "canSubmitAuthorizations", label: "Submit authorizations" },
      { key: "canApproveAuthorizations", label: "Approve authorizations" },
    ],
  },
  {
    title: "ELIGIBILITY",
    perms: [{ key: "canAddEligibility", label: "Add eligibility records" }],
  },
  {
    title: "LEADS",
    perms: [
      { key: "canAcceptLeads", label: "Accept leads" },
      { key: "canConvertLeads", label: "Convert leads to individuals" },
    ],
  },
];

// Platform & Admin tab sections
const PLATFORM_SECTIONS: Array<{
  title: string;
  perms: Array<{ key: string; label: string }>;
}> = [
  {
    title: "COMPLIANCE PLATFORM",
    perms: [
      { key: "canViewPlatform", label: "View platform" },
      { key: "canRunComplianceAgents", label: "Run compliance agents" },
      { key: "canPublishEngines", label: "Publish engines" },
    ],
  },
  {
    title: "ADMIN SETTINGS",
    perms: [
      { key: "canManageUsers", label: "Manage users" },
      { key: "canManagePrograms", label: "Manage programs" },
      { key: "canManageProviders", label: "Manage providers" },
      { key: "canManageTemplates", label: "Manage templates" },
      { key: "canViewAuditLogs", label: "View audit logs" },
      { key: "canViewOrgAuditLogs", label: "View org-wide audit logs" },
    ],
  },
  {
    title: "REPORTS",
    perms: [
      { key: "canRunStandardReports", label: "Run standard reports" },
      { key: "canExportReports", label: "Export reports" },
      { key: "canViewOrgReports", label: "View org-wide reports" },
      { key: "canBuildCustomReports", label: "Build custom reports" },
    ],
  },
];

// AI Features — parent/child structure
interface AIGroup {
  title: string;
  items: Array<{
    key: string;
    label: string;
    children?: Array<{ key: string; label: string }>;
  }>;
}

const AI_GROUPS: AIGroup[] = [
  {
    title: "AMBIENT LISTENING",
    items: [
      {
        key: "canUseAmbientListening",
        label: "Use ambient listening",
        children: [
          { key: "canViewTranscripts", label: "View transcripts" },
          { key: "canApplyAmbientOutput", label: "Apply ambient output" },
        ],
      },
    ],
  },
  {
    title: "AI DOCUMENTATION ASSISTANCE",
    items: [
      {
        key: "canUseAIPrefill",
        label: "Use AI prefill",
        children: [
          { key: "canUseMonitoringPrefill", label: "Monitoring form prefill" },
          { key: "canUseProgressNotePrefill", label: "Progress note prefill" },
          { key: "canUseVisitSummaryPrefill", label: "Visit summary prefill" },
          { key: "canUseAssessmentPrefill", label: "Assessment prefill" },
        ],
      },
      { key: "canUseAIDraftGeneration", label: "Use AI draft generation" },
      { key: "canViewAISuggestions", label: "View AI suggestions" },
    ],
  },
  {
    title: "AI CHAT & ORCHESTRATOR",
    items: [
      { key: "canUseAIChat", label: "Use AI chat" },
      { key: "canViewOrchestrator", label: "View orchestrator" },
      { key: "canRunOrchestratorAgents", label: "Run orchestrator agents" },
      { key: "canViewComplianceRecommendations", label: "View compliance recommendations" },
    ],
  },
  {
    title: "CONSENT & INTAKE",
    items: [
      { key: "canSendConsentRequests", label: "Send consent requests" },
      { key: "canManageIntakeForms", label: "Manage intake forms" },
    ],
  },
  {
    title: "AI USAGE TRANSPARENCY",
    items: [
      { key: "canViewAIAuditLog", label: "View AI audit log" },
      { key: "canViewOrgAIAuditLog", label: "View org-wide AI audit log" },
    ],
  },
];

// Data & Export tab sections
const DATA_SECTIONS: Array<{
  title: string;
  perms: Array<{ key: string; label: string }>;
}> = [
  {
    title: "INDIVIDUAL DATA",
    perms: [
      { key: "canExportIndividuals", label: "Export individuals" },
      { key: "canPrintDocuments", label: "Print documents" },
    ],
  },
  {
    title: "DOCUMENTS",
    perms: [
      { key: "canUploadDocuments", label: "Upload documents" },
      { key: "canDeleteDocuments", label: "Delete documents" },
    ],
  },
  {
    title: "AUDIT & COMPLIANCE",
    perms: [
      { key: "canViewAIAuditLog", label: "View AI audit log" },
      { key: "canViewOrgAuditLogs", label: "View org-wide audit logs" },
    ],
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-geist font-bold uppercase tracking-widest text-icm-text-dim mb-2 mt-4 first:mt-0">
      {children}
    </p>
  );
}

function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      className={cn(
        "relative w-10 h-5 rounded-full transition-colors shrink-0",
        value ? "bg-icm-accent" : "bg-icm-border",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
          value ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

function PermRow({
  label,
  permKey,
  perms,
  onChange,
  indent = false,
}: {
  label: string;
  permKey: string;
  perms: Record<string, ModuleAccess | boolean>;
  onChange: (key: string, val: boolean) => void;
  indent?: boolean;
}) {
  const val = typeof perms[permKey] === "boolean" ? (perms[permKey] as boolean) : false;
  return (
    <div className={cn("flex items-center gap-3 py-2", indent && "pl-6")}>
      <span className="flex-1 text-[12.5px] font-geist text-icm-text">{label}</span>
      <Toggle value={val} onChange={(v) => onChange(permKey, v)} />
    </div>
  );
}

function SegmentedAccess({
  moduleKey,
  perms,
  onChange,
}: {
  moduleKey: string;
  perms: Record<string, ModuleAccess | boolean>;
  onChange: (key: string, val: ModuleAccess) => void;
}) {
  const val = (perms[moduleKey] as ModuleAccess) ?? "none";
  const options: Array<{ value: ModuleAccess; label: string }> = [
    { value: "view", label: "View" },
    { value: "edit", label: "Edit" },
    { value: "none", label: "None" },
  ];
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-icm-border bg-icm-bg">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(moduleKey, o.value)}
          className={cn(
            "px-2 py-1 rounded-md text-[11px] font-geist font-semibold transition-colors",
            val === o.value
              ? "bg-icm-accent text-white"
              : "text-icm-text-dim hover:text-icm-text hover:bg-icm-panel"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ModuleRow({
  label,
  moduleKey,
  perms,
  onChange,
}: {
  label: string;
  moduleKey: string;
  perms: Record<string, ModuleAccess | boolean>;
  onChange: (key: string, val: ModuleAccess) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="flex-1 text-[12.5px] font-geist text-icm-text">{label}</span>
      <SegmentedAccess moduleKey={moduleKey} perms={perms} onChange={onChange} />
    </div>
  );
}

// ─── Tab contents ────────────────────────────────────────────────────────────

function Tab1Modules({
  perms,
  onModuleChange,
}: {
  perms: Record<string, ModuleAccess | boolean>;
  onModuleChange: (key: string, val: ModuleAccess) => void;
}) {
  return (
    <div className="space-y-1">
      <SectionHeader>Navigation & Dashboard</SectionHeader>
      <div className="rounded-xl border border-icm-border bg-icm-panel divide-y divide-icm-border px-3">
        {NAV_MODULES.map((m) => (
          <ModuleRow key={m.key} label={m.label} moduleKey={m.key} perms={perms} onChange={onModuleChange} />
        ))}
      </div>
      <SectionHeader>eChart Modules</SectionHeader>
      <div className="rounded-xl border border-icm-border bg-icm-panel divide-y divide-icm-border px-3">
        {ECHART_MODULES.map((m) => (
          <ModuleRow key={m.key} label={m.label} moduleKey={m.key} perms={perms} onChange={onModuleChange} />
        ))}
      </div>
    </div>
  );
}

function Tab2Documentation({
  perms,
  onBoolChange,
}: {
  perms: Record<string, ModuleAccess | boolean>;
  onBoolChange: (key: string, val: boolean) => void;
}) {
  return (
    <div>
      {DOC_SECTIONS.map((section) => (
        <div key={section.title}>
          <SectionHeader>{section.title}</SectionHeader>
          <div className="rounded-xl border border-icm-border bg-icm-panel divide-y divide-icm-border px-3">
            {section.perms.map((p) => (
              <PermRow key={section.title + p.key} label={p.label} permKey={p.key} perms={perms} onChange={onBoolChange} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Tab3Clinical({
  perms,
  onBoolChange,
}: {
  perms: Record<string, ModuleAccess | boolean>;
  onBoolChange: (key: string, val: boolean) => void;
}) {
  return (
    <div>
      {CLINICAL_SECTIONS.map((section) => (
        <div key={section.title}>
          <SectionHeader>{section.title}</SectionHeader>
          <div className="rounded-xl border border-icm-border bg-icm-panel divide-y divide-icm-border px-3">
            {section.perms.map((p) => (
              <PermRow key={p.key} label={p.label} permKey={p.key} perms={perms} onChange={onBoolChange} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Tab4Platform({
  perms,
  onBoolChange,
}: {
  perms: Record<string, ModuleAccess | boolean>;
  onBoolChange: (key: string, val: boolean) => void;
}) {
  return (
    <div>
      {PLATFORM_SECTIONS.map((section) => (
        <div key={section.title}>
          <SectionHeader>{section.title}</SectionHeader>
          <div className="rounded-xl border border-icm-border bg-icm-panel divide-y divide-icm-border px-3">
            {section.perms.map((p) => (
              <PermRow key={p.key} label={p.label} permKey={p.key} perms={perms} onChange={onBoolChange} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Tab5AI({
  perms,
  onBoolChange,
}: {
  perms: Record<string, ModuleAccess | boolean>;
  onBoolChange: (key: string, val: boolean) => void;
}) {
  const handleParentOff = useCallback(
    (
      parentKey: string,
      children: Array<{ key: string }> | undefined,
      val: boolean
    ) => {
      onBoolChange(parentKey, val);
      // When parent is turned OFF, auto-disable all children
      if (!val && children) {
        children.forEach((c) => onBoolChange(c.key, false));
      }
    },
    [onBoolChange]
  );

  return (
    <div>
      {AI_GROUPS.map((group) => (
        <div key={group.title}>
          <SectionHeader>{group.title}</SectionHeader>
          <div className="rounded-xl border border-icm-border bg-icm-panel divide-y divide-icm-border px-3">
            {group.items.map((item) => {
              const parentVal =
                typeof perms[item.key] === "boolean" ? (perms[item.key] as boolean) : false;
              return (
                <React.Fragment key={item.key}>
                  <div className="flex items-center gap-3 py-2">
                    <span className="flex-1 text-[12.5px] font-geist font-medium text-icm-text">
                      {item.label}
                    </span>
                    <Toggle
                      value={parentVal}
                      onChange={(v) => handleParentOff(item.key, item.children, v)}
                    />
                  </div>
                  {item.children?.map((child) => (
                    <div key={child.key} className="flex items-center gap-3 py-2 pl-6">
                      <span className="flex-1 text-[12px] font-geist text-icm-text-dim">
                        ↳ {child.label}
                      </span>
                      <Toggle
                        value={
                          typeof perms[child.key] === "boolean"
                            ? (perms[child.key] as boolean)
                            : false
                        }
                        onChange={(v) => onBoolChange(child.key, v)}
                        disabled={!parentVal}
                      />
                    </div>
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Tab6Data({
  perms,
  onBoolChange,
}: {
  perms: Record<string, ModuleAccess | boolean>;
  onBoolChange: (key: string, val: boolean) => void;
}) {
  return (
    <div>
      {DATA_SECTIONS.map((section) => (
        <div key={section.title}>
          <SectionHeader>{section.title}</SectionHeader>
          <div className="rounded-xl border border-icm-border bg-icm-panel divide-y divide-icm-border px-3">
            {section.perms.map((p) => (
              <PermRow key={section.title + p.key} label={p.label} permKey={p.key} perms={perms} onChange={onBoolChange} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main RoleEditor page ────────────────────────────────────────────────────

type TabId = "modules" | "documentation" | "clinical" | "platform" | "ai" | "data";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "modules", label: "Modules & Access" },
  { id: "documentation", label: "Documentation" },
  { id: "clinical", label: "Clinical" },
  { id: "platform", label: "Platform & Admin" },
  { id: "ai", label: "AI Features" },
  { id: "data", label: "Data & Export" },
];

export default function RoleEditor() {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [roleData, setRoleData] = useState<RoleDoc | null>(null);
  const [savedPerms, setSavedPerms] = useState<Record<string, ModuleAccess | boolean>>({});
  const [localPerms, setLocalPerms] = useState<Record<string, ModuleAccess | boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("modules");
  const [showDiscard, setShowDiscard] = useState(false);

  const isDirty = JSON.stringify(localPerms) !== JSON.stringify(savedPerms);

  useEffect(() => {
    if (!roleId) return;
    setLoading(true);
    getDoc(doc(db, "role_permissions", roleId))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as RoleDoc;
          setRoleData(data);
          const p = data.permissions ?? {};
          setSavedPerms(p);
          setLocalPerms(p);
        } else {
          toast.error("Role not found");
          navigate("/settings/users");
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load role");
      })
      .finally(() => setLoading(false));
  }, [roleId, navigate]);

  const handleModuleChange = useCallback((key: string, val: ModuleAccess) => {
    setLocalPerms((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleBoolChange = useCallback((key: string, val: boolean) => {
    setLocalPerms((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleSave = async () => {
    if (!roleId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "role_permissions", roleId), {
        permissions: localPerms,
        updatedAt: serverTimestamp(),
        updatedBy: userProfile?.uid ?? "",
      });

      await addDoc(collection(db, "audit_log"), {
        action: "role_permissions_updated",
        roleId,
        roleName: roleData?.roleName,
        changedBy: userProfile?.uid,
        changedByName: userProfile?.displayName,
        tenantId: userProfile?.organizationId,
        timestamp: serverTimestamp(),
      });

      setSavedPerms(localPerms);
      toast.success("Permissions saved successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save permissions.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (isDirty) {
      setShowDiscard(true);
    } else {
      navigate("/settings/users");
    }
  };

  const confirmDiscard = () => {
    setLocalPerms(savedPerms);
    setShowDiscard(false);
  };

  if (loading) {
    return (
      <ICMShell title="Role Editor">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-icm-accent" />
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title={roleData?.roleName ? `${roleData.roleName} — Permissions` : "Role Editor"}>
      <div className="space-y-5 pb-12">
        {/* Back link */}
        <button
          onClick={() => navigate("/settings/users")}
          className="inline-flex items-center gap-1.5 text-[12px] font-geist text-icm-text-dim hover:text-icm-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Roles &amp; Permissions
        </button>

        {/* Header */}
        <div>
          <h1 className="font-manrope font-bold text-[22px] text-icm-text">
            {roleData?.roleName} — PERMISSIONS
          </h1>
          <p className="text-[12.5px] text-icm-text-dim font-geist mt-0.5">
            {roleData?.userCount ?? 0} users have this role · Changes apply immediately
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold disabled:opacity-40 inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Changes
          </button>
          <button
            onClick={handleDiscard}
            className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold hover:border-icm-border-strong transition-colors inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Discard
          </button>
          <button
            onClick={() => {
              toast.info("Duplicate role — coming soon.");
            }}
            className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold hover:border-icm-border-strong transition-colors inline-flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicate Role
          </button>
          {isDirty && (
            <span className="text-[11px] font-geist text-icm-amber ml-1">
              Unsaved changes
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-icm-border overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "h-9 px-3 text-[12px] font-geist font-semibold transition-colors -mb-px border-b-2 whitespace-nowrap shrink-0",
                activeTab === t.id
                  ? "text-icm-accent border-icm-accent"
                  : "text-icm-text-dim border-transparent hover:text-icm-text"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "modules" && (
            <Tab1Modules perms={localPerms} onModuleChange={handleModuleChange} />
          )}
          {activeTab === "documentation" && (
            <Tab2Documentation perms={localPerms} onBoolChange={handleBoolChange} />
          )}
          {activeTab === "clinical" && (
            <Tab3Clinical perms={localPerms} onBoolChange={handleBoolChange} />
          )}
          {activeTab === "platform" && (
            <Tab4Platform perms={localPerms} onBoolChange={handleBoolChange} />
          )}
          {activeTab === "ai" && (
            <Tab5AI perms={localPerms} onBoolChange={handleBoolChange} />
          )}
          {activeTab === "data" && (
            <Tab6Data perms={localPerms} onBoolChange={handleBoolChange} />
          )}
        </div>
      </div>

      {/* Discard confirm modal */}
      {showDiscard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-2xl bg-icm-panel border border-icm-border shadow-elevated w-full max-w-sm p-5">
            <h2 className="font-manrope font-bold text-[15px] text-icm-text mb-1">
              Discard changes?
            </h2>
            <p className="text-[12.5px] font-geist text-icm-text-dim mb-4">
              Any unsaved permission changes will be lost.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDiscard(false)}
                className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold"
              >
                Keep editing
              </button>
              <button
                onClick={confirmDiscard}
                className="h-9 px-3 rounded-xl bg-icm-red text-white text-[12px] font-geist font-semibold"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </ICMShell>
  );
}
