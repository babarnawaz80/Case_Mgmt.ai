import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { writeAudit } from "@/lib/auditService";
import {
  Search,
  UserPlus,
  Upload,
  MoreHorizontal,
  Pencil,
  X,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  UserX,
  UserCheck,
  UserMinus,
  LogOut,
  ChevronDown,
  Settings,
} from "lucide-react";
import { ImportWizardModal } from "@/components/ImportWizardModal";
import { credentialBadge } from "@/data/staffProvider";
import { cn } from "@/lib/utils";
import {
  roleLabel,
  roleAvatarTone,
  roleBadgeTone,
  permissionsMatrix,
  permTone,
  permLabel,
  roles,
  type RoleKey,
} from "@/data/settings";

type UserStatus = "active" | "inactive" | "pending" | "locked";

interface OrgUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: RoleKey;
  status: UserStatus;
  lastLogin?: string;
  programs?: string[];
}

function getInitials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function statusTone(s: UserStatus) {
  switch (s) {
    case "active": return "bg-icm-green-soft text-icm-green ring-icm-green/20";
    case "pending": return "bg-icm-amber-soft text-icm-amber ring-icm-amber/20";
    case "locked": return "bg-icm-red-soft text-icm-red ring-icm-red/20";
    default: return "bg-icm-bg text-icm-text-dim ring-icm-border";
  }
}

const SettingsUsers = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const orgId = userProfile?.organizationId;

  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLimit, setUserLimit] = useState<number | null>(null);
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | RoleKey>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [showInvite, setShowInvite] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRoleValue, setBulkRoleValue] = useState<RoleKey>("case_manager");
  const [showBulkRoleConfirm, setShowBulkRoleConfirm] = useState(false);
  const [showBulkDeactivateConfirm, setShowBulkDeactivateConfirm] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

  // Load user limit from org document
  useEffect(() => {
    if (!orgId) return;
    getDoc(doc(db, "organizations", orgId)).then((snap) => {
      if (snap.exists()) {
        const limit = snap.data()?.userLimit;
        setUserLimit(typeof limit === "number" ? limit : null);
      }
    }).catch(() => {});
  }, [orgId]);

  // Live Firestore subscription
  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    const q = query(collection(db, "users"), where("organizationId", "==", orgId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: OrgUser[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            firstName: data.firstName || data.first_name || "",
            lastName: data.lastName || data.last_name || "",
            email: data.email ?? "",
            role: (data.role ?? "case_manager") as RoleKey,
            status: (data.status ?? "active") as UserStatus,
            lastLogin: data.lastLogin ?? "—",
            programs: data.programs ?? [],
          };
        });
        list.sort((a, b) => a.lastName.localeCompare(b.lastName));
        setUsers(list);
        setLoading(false);
      },
      (err) => {
        console.error("SettingsUsers:", err);
        toast.error("Failed to load users");
        setLoading(false);
      }
    );
    return unsub;
  }, [orgId]);

  const counts = useMemo(() => ({
    active: users.filter((u) => u.status === "active").length,
    inactive: users.filter((u) => u.status === "inactive").length,
    pending: users.filter((u) => u.status === "pending").length,
    admins: users.filter((u) => u.role === "admin").length,
  }), [users]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !`${u.firstName} ${u.lastName}`.toLowerCase().includes(q) &&
          !u.email.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleChangeRole = async (userId: string, newRole: RoleKey) => {
    if (!orgId) return;
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole, updatedAt: serverTimestamp() });
      await writeAudit("role_changed", "user_management", userId, { newRole });
      toast.success("Role updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update role");
    }
  };

  const handleUserAction = async (
    userId: string,
    action: "suspend" | "reactivate" | "deactivate" | "edit"
  ) => {
    setOpenMenuId(null);
    if (action === "edit") { navigate(`/settings/users/${userId}`); return; }
    const statusMap = { suspend: "locked", reactivate: "active", deactivate: "inactive" } as const;
    const newStatus = statusMap[action];
    const labelMap = { suspend: "suspended", reactivate: "reactivated", deactivate: "deactivated" };
    // Lookup target user's display name for the audit record
    const targetUser = users.find((u) => u.id === userId);
    const targetName = targetUser ? `${targetUser.firstName} ${targetUser.lastName}`.trim() || targetUser.email : userId;
    try {
      await updateDoc(doc(db, "users", userId), {
        status: newStatus,
        isActive: newStatus === "active",
        updatedAt: serverTimestamp(),
      });
      // Use canonical (non-typo) action names for new events
      const auditAction = action === "deactivate"
        ? "user_deactivated" as const
        : action === "reactivate"
        ? "user_activated" as const
        : "user_suspended" as const;
      await writeAudit(auditAction, "user_management", userId, {
        action,
        status: newStatus,
        actor_name: userProfile?.displayName ?? userProfile?.email ?? "Admin",
        actor_user_id: userProfile?.uid ?? "",
        target_user_id: userId,
        target_user_name: targetName,
      });
      toast.success(`User ${labelMap[action]} successfully`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to ${action} user`, { description: err?.message });
    }
  };

  // Header checkbox indeterminate state
  useEffect(() => {
    if (!headerCheckboxRef.current) return;
    const total = filtered.length;
    const selected = filtered.filter((u) => selectedIds.has(u.id)).length;
    headerCheckboxRef.current.indeterminate = selected > 0 && selected < total;
    headerCheckboxRef.current.checked = total > 0 && selected === total;
  }, [filtered, selectedIds]);

  const toggleSelectAll = () => {
    const allSelected = filtered.every((u) => selectedIds.has(u.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((u) => u.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkChangeRole = async () => {
    setBulkProcessing(true);
    try {
      const affected = users.filter((u) => selectedIds.has(u.id));
      await Promise.all(
        affected.map((u) =>
          updateDoc(doc(db, "users", u.id), {
            role: bulkRoleValue,
            updatedAt: serverTimestamp(),
          })
        )
      );
      await addDoc(collection(db, "audit_log"), {
        action: "bulk_role_change",
        isBulkChange: true,
        newRole: bulkRoleValue,
        affectedUsers: affected.map((u) => ({ id: u.id, email: u.email })),
        changedBy: userProfile?.uid,
        changedByName: userProfile?.displayName,
        tenantId: orgId,
        timestamp: serverTimestamp(),
      });
      toast.success(`Role updated for ${affected.length} user${affected.length !== 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      setShowBulkRoleConfirm(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update roles");
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDeactivate = async () => {
    setBulkProcessing(true);
    try {
      const affected = users.filter((u) => selectedIds.has(u.id));
      await Promise.all(
        affected.map((u) =>
          updateDoc(doc(db, "users", u.id), {
            status: "inactive",
            isActive: false,
            updatedAt: serverTimestamp(),
          })
        )
      );
      await addDoc(collection(db, "audit_log"), {
        action: "bulk_deactivate",
        isBulkChange: true,
        affectedUsers: affected.map((u) => ({ id: u.id, email: u.email })),
        changedBy: userProfile?.uid,
        changedByName: userProfile?.displayName,
        tenantId: orgId,
        timestamp: serverTimestamp(),
      });
      toast.success(`Deactivated ${affected.length} user${affected.length !== 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      setShowBulkDeactivateConfirm(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to deactivate users");
    } finally {
      setBulkProcessing(false);
    }
  };

  return (
    <SettingsLayout title="Users & Roles" subtitle="Manage staff accounts and access">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <Chip label="Active" value={counts.active} tone="green" />
        <Chip label="Inactive" value={counts.inactive} tone="gray" />
        <Chip label="Pending" value={counts.pending} tone="amber" />
        <Chip label="Admins" value={counts.admins} tone="accent" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-icm-border">
        <TabButton active={tab === "users"} onClick={() => setTab("users")}>
          Users
        </TabButton>
        <TabButton active={tab === "roles"} onClick={() => setTab("roles")}>
          Roles & Permissions
        </TabButton>
      </div>

      {tab === "users" ? (
        <>
          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-icm-accent/30 bg-icm-accent-soft/40 flex-wrap">
              <span className="text-[12px] font-geist font-semibold text-icm-accent">
                {selectedIds.size} user{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-1 ml-auto flex-wrap">
                <div className="relative">
                  <select
                    value={bulkRoleValue}
                    onChange={(e) => setBulkRoleValue(e.target.value as RoleKey)}
                    className="h-8 pl-2 pr-6 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-geist text-icm-text appearance-none cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r.key} value={r.key}>{r.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-icm-text-dim pointer-events-none" />
                </div>
                <button
                  onClick={() => setShowBulkRoleConfirm(true)}
                  className="h-8 px-3 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-geist font-semibold text-icm-text hover:border-icm-border-strong transition-colors"
                >
                  Change Role
                </button>
                <button
                  onClick={() => setShowBulkDeactivateConfirm(true)}
                  className="h-8 px-3 rounded-lg border border-icm-red/30 bg-icm-red-soft/50 text-icm-red text-[11.5px] font-geist font-semibold hover:bg-icm-red-soft transition-colors"
                >
                  Deactivate
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="h-8 w-8 rounded-lg border border-icm-border bg-icm-panel text-icm-text-dim hover:border-icm-border-strong transition-colors inline-flex items-center justify-center"
                  title="Clear selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="h-9 w-[260px] pl-8 pr-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong"
                />
              </div>
              <FilterSelect
                value={roleFilter}
                onChange={(v) => setRoleFilter(v as "all" | RoleKey)}
                options={[
                  { value: "all", label: "All roles" },
                  { value: "admin", label: "Admin" },
                  { value: "supervisor", label: "Supervisor" },
                  { value: "case_manager", label: "Case Manager" },
                  { value: "billing", label: "Billing" },
                  { value: "read_only", label: "Read Only" },
                ]}
              />
              <FilterSelect
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as "all" | UserStatus)}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "pending", label: "Pending" },
                  { value: "locked", label: "Locked" },
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImport(true)}
                className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold hover:border-icm-border-strong transition-colors inline-flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Import users
              </button>
              {userLimit !== null && users.filter(u => u.status === "active").length >= userLimit ? (
                <div className="flex items-center gap-2 h-9 px-3 rounded-xl border border-icm-red/30 bg-icm-red-soft text-icm-red text-[12px] font-geist font-semibold">
                  <span>Seat limit reached ({userLimit}/{userLimit})</span>
                </div>
              ) : (
                <button
                  onClick={() => setShowInvite(true)}
                  className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add User {userLimit !== null ? `(${users.filter(u => u.status === "active").length}/${userLimit})` : ""}
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <UsersSkeleton />
          ) : (
            <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
              <table className="w-full text-[12px] font-geist">
                <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        ref={headerCheckboxRef}
                        onChange={toggleSelectAll}
                        className="rounded border-icm-border accent-icm-accent w-3.5 h-3.5 cursor-pointer"
                      />
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">User</th>
                    <th className="text-left px-3 py-2 font-semibold">Email</th>
                    <th className="text-left px-3 py-2 font-semibold">Role</th>
                    <th className="text-left px-3 py-2 font-semibold">Status</th>
                    <th className="text-left px-3 py-2 font-semibold">Last login</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-icm-text-dim text-[12px]">
                        No users found matching your filters.
                      </td>
                    </tr>
                  )}
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => navigate(`/settings/users/${u.id}`)}
                      className={cn(
                        "border-t border-icm-border hover:bg-icm-bg cursor-pointer",
                        selectedIds.has(u.id) && "bg-icm-accent-soft/20"
                      )}
                    >
                      <td
                        className="px-3 py-2.5 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(u.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-icm-border accent-icm-accent w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "w-8 h-8 rounded-lg ring-1 flex items-center justify-center text-[11px] font-geist font-bold",
                              roleAvatarTone(u.role)
                            )}
                          >
                            {getInitials(u.firstName, u.lastName)}
                          </span>
                          <span className="text-icm-text font-medium">
                            {u.firstName} {u.lastName}
                          </span>
                          {(() => {
                            const cb = credentialBadge(u.id);
                            if (!cb) return null;
                            const tone =
                              cb.tone === "red"
                                ? "bg-icm-red-soft text-icm-red ring-icm-red/20"
                                : "bg-icm-amber-soft text-icm-amber ring-icm-amber/20";
                            return (
                              <span className={cn("ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 whitespace-nowrap", tone)}>
                                {cb.label}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-icm-text-dim">{u.email}</td>
                      <td className="px-3 py-2.5">
                        <select
                          value={u.role}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleChangeRole(u.id, e.target.value as RoleKey);
                          }}
                          className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 border-0 cursor-pointer",
                            roleBadgeTone(u.role)
                          )}
                        >
                          {roles.map((r) => (
                            <option key={r.key} value={r.key}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 capitalize",
                            statusTone(u.status)
                          )}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-icm-text-dim font-mono text-[11px]">
                        {u.lastLogin}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1" ref={openMenuId === u.id ? menuRef : undefined}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/settings/users/${u.id}`);
                            }}
                            className="h-7 w-7 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === u.id ? null : u.id);
                              }}
                              className={cn(
                                "h-7 w-7 rounded-lg text-icm-text-dim flex items-center justify-center transition-colors",
                                openMenuId === u.id
                                  ? "bg-icm-accent/10 text-icm-accent"
                                  : "hover:bg-icm-bg"
                              )}
                              title="More actions"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>

                            {openMenuId === u.id && (
                              <div
                                className="absolute right-0 top-8 z-50 w-44 rounded-xl border border-icm-border bg-white shadow-elevated py-1 text-[12.5px] font-geist"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DropMenuItem
                                  icon={Pencil}
                                  label="Edit user"
                                  onClick={() => handleUserAction(u.id, "edit")}
                                />
                                <div className="my-1 border-t border-icm-border" />
                                {u.status !== "locked" ? (
                                  <DropMenuItem
                                    icon={UserX}
                                    label="Suspend"
                                    onClick={() => handleUserAction(u.id, "suspend")}
                                    danger
                                  />
                                ) : (
                                  <DropMenuItem
                                    icon={UserCheck}
                                    label="Reactivate"
                                    onClick={() => handleUserAction(u.id, "reactivate")}
                                    success
                                  />
                                )}
                                {u.status === "active" && (
                                  <DropMenuItem
                                    icon={UserMinus}
                                    label="Deactivate"
                                    onClick={() => handleUserAction(u.id, "deactivate")}
                                    danger
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <RolesPermissionsView />
      )}

      {showInvite && <CreateUserModal orgId={orgId ?? ""} onClose={() => setShowInvite(false)} />}
      {showImport && (
        <ImportWizardModal
          type="staff"
          onClose={() => setShowImport(false)}
          onComplete={() => setShowImport(false)}
        />
      )}

      {/* Bulk Change Role Confirm */}
      {showBulkRoleConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-2xl bg-icm-panel border border-icm-border shadow-elevated w-full max-w-md p-5">
            <h2 className="font-manrope font-bold text-[15px] text-icm-text mb-1">
              Change role for {selectedIds.size} user{selectedIds.size !== 1 ? "s" : ""}?
            </h2>
            <p className="text-[12px] font-geist text-icm-text-dim mb-3">
              New role: <strong className="text-icm-text">{roles.find((r) => r.key === bulkRoleValue)?.name}</strong>
              <br />Permissions change immediately.
            </p>
            <div className="space-y-1 mb-4 max-h-40 overflow-y-auto">
              {users.filter((u) => selectedIds.has(u.id)).map((u) => (
                <div key={u.id} className="flex items-center gap-2 text-[11.5px] font-geist text-icm-text-dim">
                  <span>{u.firstName} {u.lastName}</span>
                  <span className="text-icm-text-faint">·</span>
                  <span>{u.email}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowBulkRoleConfirm(false)}
                className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkChangeRole}
                disabled={bulkProcessing}
                className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {bulkProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Deactivate Confirm */}
      {showBulkDeactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-2xl bg-icm-panel border border-icm-border shadow-elevated w-full max-w-md p-5">
            <h2 className="font-manrope font-bold text-[15px] text-icm-text mb-1">
              Deactivate {selectedIds.size} user{selectedIds.size !== 1 ? "s" : ""}?
            </h2>
            <p className="text-[12px] font-geist text-icm-text-dim mb-3">
              These accounts will be set to inactive immediately.
            </p>
            <div className="space-y-1 mb-4 max-h-40 overflow-y-auto">
              {users.filter((u) => selectedIds.has(u.id)).map((u) => (
                <div key={u.id} className="flex items-center gap-2 text-[11.5px] font-geist text-icm-text-dim">
                  <span>{u.firstName} {u.lastName}</span>
                  <span className="text-icm-text-faint">·</span>
                  <span>{u.email}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowBulkDeactivateConfirm(false)}
                className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDeactivate}
                disabled={bulkProcessing}
                className="h-9 px-4 rounded-xl bg-icm-red text-white text-[12px] font-geist font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {bulkProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
};

function UsersSkeleton() {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 border-t border-icm-border bg-icm-bg/30" />
      ))}
    </div>
  );
}

function Chip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "accent" | "gray";
}) {
  const map = {
    green: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    amber: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    accent: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    gray: "bg-icm-bg text-icm-text-dim ring-icm-border",
  };
  return (
    <span
      className={cn(
        "px-2 py-1 rounded-lg text-[11.5px] font-geist font-semibold ring-1 inline-flex items-center gap-1.5",
        map[tone]
      )}
    >
      {label}: <span className="font-mono">{value}</span>
    </span>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-9 px-3 text-[12.5px] font-geist font-semibold transition-colors -mb-px border-b-2",
        active
          ? "text-icm-accent border-icm-accent"
          : "text-icm-text-dim border-transparent hover:text-icm-text"
      )}
    >
      {children}
    </button>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Built-in role seed data ─────────────────────────────────────────────────
type ModuleAccess = "view" | "edit" | "none";

const BUILT_IN_ROLES: Array<{
  key: string;
  name: string;
  description: string;
  color: string;
  isBuiltIn: boolean;
  permissions: Record<string, ModuleAccess | boolean>;
}> = [
  {
    key: "admin",
    name: "Admin",
    description: "Full system access",
    color: "#7c3aed",
    isBuiltIn: true,
    permissions: {
      dashboard: "edit", peoplelist: "edit", mywork: "edit", messages: "edit",
      reports: "edit", incidents: "edit", billing: "edit", platform: "edit", adminsettings: "edit",
      facesheet: "edit", contactnotes: "edit", progressnotes: "edit", visitsummaries: "edit",
      careplan: "edit", monitoringforms: "edit", assessments: "edit", eligibility: "edit",
      authorizations: "edit", casemanagement: "edit", referrals: "edit", consents: "edit",
      documents: "edit", leads: "edit",
      canCreateContactNotes: true, canEditOthersNotes: true, canDeleteNotes: true,
      canSignNotes: true, canSignOthersNotes: true, canCreateProgressNotes: true,
      canMarkBillable: true, canCreateMonitoringForms: true, canEditSubmittedForms: true,
      canCreateCarePlans: true, canSubmitCarePlans: true, canApproveCarePlans: true,
      canStartAssessments: true, canSubmitAssessments: true, canEditSubmittedAssessments: true,
      canReportIncidents: true, canViewOrgWideIncidents: true, canCloseIncidents: true,
      canCreateReferrals: true, canSubmitAuthorizations: true, canApproveAuthorizations: true,
      canAddEligibility: true, canAcceptLeads: true, canConvertLeads: true,
      canViewPlatform: true, canRunComplianceAgents: true, canPublishEngines: true,
      canManageUsers: true, canManagePrograms: true, canManageProviders: true,
      canManageTemplates: true, canViewAuditLogs: true, canViewOrgAuditLogs: true,
      canRunStandardReports: true, canExportReports: true, canViewOrgReports: true,
      canBuildCustomReports: true,
      canUseAmbientListening: true, canViewTranscripts: true, canApplyAmbientOutput: true,
      canUseAIPrefill: true, canUseMonitoringPrefill: true, canUseProgressNotePrefill: true,
      canUseVisitSummaryPrefill: true, canUseAssessmentPrefill: true,
      canUseAIDraftGeneration: true, canViewAISuggestions: true, canUseAIChat: true,
      canViewOrchestrator: true, canRunOrchestratorAgents: true, canViewComplianceRecommendations: true,
      canSendConsentRequests: true, canManageIntakeForms: true,
      canViewAIAuditLog: true, canViewOrgAIAuditLog: true,
      canExportIndividuals: true, canPrintDocuments: true, canUploadDocuments: true, canDeleteDocuments: true,
    },
  },
  {
    key: "supervisor",
    name: "Supervisor",
    description: "Team oversight + approvals",
    color: "#0891b2",
    isBuiltIn: true,
    permissions: {
      dashboard: "edit", peoplelist: "edit", mywork: "edit", messages: "edit",
      reports: "edit", incidents: "edit", billing: "edit", platform: "none", adminsettings: "none",
      facesheet: "edit", contactnotes: "edit", progressnotes: "edit", visitsummaries: "edit",
      careplan: "edit", monitoringforms: "edit", assessments: "edit", eligibility: "edit",
      authorizations: "edit", casemanagement: "edit", referrals: "edit", consents: "edit",
      documents: "edit", leads: "edit",
      canCreateContactNotes: true, canEditOthersNotes: true, canDeleteNotes: true,
      canSignNotes: true, canSignOthersNotes: true, canCreateProgressNotes: true,
      canMarkBillable: true, canCreateMonitoringForms: true, canEditSubmittedForms: true,
      canCreateCarePlans: true, canSubmitCarePlans: true, canApproveCarePlans: true,
      canStartAssessments: true, canSubmitAssessments: true, canEditSubmittedAssessments: true,
      canReportIncidents: true, canViewOrgWideIncidents: true, canCloseIncidents: true,
      canCreateReferrals: true, canSubmitAuthorizations: true, canApproveAuthorizations: true,
      canAddEligibility: true, canAcceptLeads: true, canConvertLeads: true,
      canViewPlatform: false, canRunComplianceAgents: false, canPublishEngines: false,
      canManageUsers: false, canManagePrograms: false, canManageProviders: false,
      canManageTemplates: true, canViewAuditLogs: true, canViewOrgAuditLogs: true,
      canRunStandardReports: true, canExportReports: true, canViewOrgReports: true,
      canBuildCustomReports: true,
      canUseAmbientListening: true, canViewTranscripts: true, canApplyAmbientOutput: true,
      canUseAIPrefill: true, canUseMonitoringPrefill: true, canUseProgressNotePrefill: true,
      canUseVisitSummaryPrefill: true, canUseAssessmentPrefill: true,
      canUseAIDraftGeneration: true, canViewAISuggestions: true, canUseAIChat: true,
      canViewOrchestrator: true, canRunOrchestratorAgents: true, canViewComplianceRecommendations: true,
      canSendConsentRequests: true, canManageIntakeForms: true,
      canViewAIAuditLog: true, canViewOrgAIAuditLog: true,
      canExportIndividuals: true, canPrintDocuments: true, canUploadDocuments: true, canDeleteDocuments: false,
    },
  },
  {
    key: "case_manager",
    name: "Case Manager",
    description: "Caseload and documentation",
    color: "#059669",
    isBuiltIn: true,
    permissions: {
      dashboard: "edit", peoplelist: "edit", mywork: "edit", messages: "edit",
      reports: "view", incidents: "edit", billing: "none", platform: "none", adminsettings: "none",
      facesheet: "edit", contactnotes: "edit", progressnotes: "edit", visitsummaries: "edit",
      careplan: "edit", monitoringforms: "edit", assessments: "edit", eligibility: "edit",
      authorizations: "view", casemanagement: "edit", referrals: "edit", consents: "edit",
      documents: "edit", leads: "edit",
      canCreateContactNotes: true, canEditOthersNotes: false, canDeleteNotes: false,
      canSignNotes: true, canSignOthersNotes: false, canCreateProgressNotes: true,
      canMarkBillable: true, canCreateMonitoringForms: true, canEditSubmittedForms: false,
      canCreateCarePlans: true, canSubmitCarePlans: true, canApproveCarePlans: false,
      canStartAssessments: true, canSubmitAssessments: true, canEditSubmittedAssessments: false,
      canReportIncidents: true, canViewOrgWideIncidents: false, canCloseIncidents: false,
      canCreateReferrals: true, canSubmitAuthorizations: false, canApproveAuthorizations: false,
      canAddEligibility: true, canAcceptLeads: false, canConvertLeads: false,
      canViewPlatform: false, canRunComplianceAgents: false, canPublishEngines: false,
      canManageUsers: false, canManagePrograms: false, canManageProviders: false,
      canManageTemplates: false, canViewAuditLogs: false, canViewOrgAuditLogs: false,
      canRunStandardReports: true, canExportReports: false, canViewOrgReports: false,
      canBuildCustomReports: false,
      canUseAmbientListening: true, canViewTranscripts: true, canApplyAmbientOutput: true,
      canUseAIPrefill: true, canUseMonitoringPrefill: true, canUseProgressNotePrefill: true,
      canUseVisitSummaryPrefill: true, canUseAssessmentPrefill: true,
      canUseAIDraftGeneration: true, canViewAISuggestions: true, canUseAIChat: true,
      canViewOrchestrator: true, canRunOrchestratorAgents: true, canViewComplianceRecommendations: true,
      canSendConsentRequests: true, canManageIntakeForms: true,
      canViewAIAuditLog: true, canViewOrgAIAuditLog: false,
      canExportIndividuals: false, canPrintDocuments: true, canUploadDocuments: true, canDeleteDocuments: false,
    },
  },
  {
    key: "billing",
    name: "Billing",
    description: "Billing and claims only",
    color: "#d97706",
    isBuiltIn: true,
    permissions: {
      dashboard: "view", peoplelist: "view", mywork: "view", messages: "view",
      reports: "none", incidents: "none", billing: "edit", platform: "none", adminsettings: "none",
      facesheet: "view", contactnotes: "view", progressnotes: "view", visitsummaries: "view",
      careplan: "view", monitoringforms: "view", assessments: "view", eligibility: "view",
      authorizations: "view", casemanagement: "view", referrals: "view", consents: "view",
      documents: "view", leads: "none",
      canCreateContactNotes: false, canEditOthersNotes: false, canDeleteNotes: false,
      canSignNotes: false, canSignOthersNotes: false, canCreateProgressNotes: false,
      canMarkBillable: false, canCreateMonitoringForms: false, canEditSubmittedForms: false,
      canCreateCarePlans: false, canSubmitCarePlans: false, canApproveCarePlans: false,
      canStartAssessments: false, canSubmitAssessments: false, canEditSubmittedAssessments: false,
      canReportIncidents: false, canViewOrgWideIncidents: false, canCloseIncidents: false,
      canCreateReferrals: false, canSubmitAuthorizations: false, canApproveAuthorizations: false,
      canAddEligibility: false, canAcceptLeads: false, canConvertLeads: false,
      canViewPlatform: false, canRunComplianceAgents: false, canPublishEngines: false,
      canManageUsers: false, canManagePrograms: false, canManageProviders: false,
      canManageTemplates: false, canViewAuditLogs: false, canViewOrgAuditLogs: false,
      canRunStandardReports: true, canExportReports: false, canViewOrgReports: false,
      canBuildCustomReports: false,
      canUseAmbientListening: false, canViewTranscripts: false, canApplyAmbientOutput: false,
      canUseAIPrefill: false, canUseMonitoringPrefill: false, canUseProgressNotePrefill: false,
      canUseVisitSummaryPrefill: false, canUseAssessmentPrefill: false,
      canUseAIDraftGeneration: false, canViewAISuggestions: false, canUseAIChat: false,
      canViewOrchestrator: false, canRunOrchestratorAgents: false, canViewComplianceRecommendations: false,
      canSendConsentRequests: false, canManageIntakeForms: false,
      canViewAIAuditLog: false, canViewOrgAIAuditLog: false,
      canExportIndividuals: false, canPrintDocuments: true, canUploadDocuments: false, canDeleteDocuments: false,
    },
  },
  {
    key: "read_only",
    name: "Read Only",
    description: "View only — no edits",
    color: "#64748b",
    isBuiltIn: true,
    permissions: {
      dashboard: "view", peoplelist: "view", mywork: "view", messages: "view",
      reports: "view", incidents: "view", billing: "view", platform: "view", adminsettings: "view",
      facesheet: "view", contactnotes: "view", progressnotes: "view", visitsummaries: "view",
      careplan: "view", monitoringforms: "view", assessments: "view", eligibility: "view",
      authorizations: "view", casemanagement: "view", referrals: "view", consents: "view",
      documents: "view", leads: "view",
      canCreateContactNotes: false, canEditOthersNotes: false, canDeleteNotes: false,
      canSignNotes: false, canSignOthersNotes: false, canCreateProgressNotes: false,
      canMarkBillable: false, canCreateMonitoringForms: false, canEditSubmittedForms: false,
      canCreateCarePlans: false, canSubmitCarePlans: false, canApproveCarePlans: false,
      canStartAssessments: false, canSubmitAssessments: false, canEditSubmittedAssessments: false,
      canReportIncidents: false, canViewOrgWideIncidents: false, canCloseIncidents: false,
      canCreateReferrals: false, canSubmitAuthorizations: false, canApproveAuthorizations: false,
      canAddEligibility: false, canAcceptLeads: false, canConvertLeads: false,
      canViewPlatform: false, canRunComplianceAgents: false, canPublishEngines: false,
      canManageUsers: false, canManagePrograms: false, canManageProviders: false,
      canManageTemplates: false, canViewAuditLogs: false, canViewOrgAuditLogs: false,
      canRunStandardReports: false, canExportReports: false, canViewOrgReports: false,
      canBuildCustomReports: false,
      canUseAmbientListening: false, canViewTranscripts: false, canApplyAmbientOutput: false,
      canUseAIPrefill: false, canUseMonitoringPrefill: false, canUseProgressNotePrefill: false,
      canUseVisitSummaryPrefill: false, canUseAssessmentPrefill: false,
      canUseAIDraftGeneration: false, canViewAISuggestions: false, canUseAIChat: false,
      canViewOrchestrator: false, canRunOrchestratorAgents: false, canViewComplianceRecommendations: false,
      canSendConsentRequests: false, canManageIntakeForms: false,
      canViewAIAuditLog: true, canViewOrgAIAuditLog: false,
      canExportIndividuals: false, canPrintDocuments: true, canUploadDocuments: false, canDeleteDocuments: false,
    },
  },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  supervisor: "bg-cyan-100 text-cyan-700",
  case_manager: "bg-emerald-100 text-emerald-700",
  billing: "bg-amber-100 text-amber-700",
  read_only: "bg-slate-100 text-slate-600",
};

const ROLE_DOTS: Record<string, string> = {
  admin: "bg-purple-600",
  supervisor: "bg-cyan-600",
  case_manager: "bg-emerald-600",
  billing: "bg-amber-500",
  read_only: "bg-slate-500",
};

interface RoleRow {
  id: string;
  roleName: string;
  description: string;
  userCount: number;
  isBuiltIn: boolean;
}

function RolesPermissionsView() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const [roleRows, setRoleRows] = useState<RoleRow[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [openRoleMenu, setOpenRoleMenu] = useState<string | null>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  // Close role menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setOpenRoleMenu(null);
      }
    }
    if (openRoleMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openRoleMenu]);

  useEffect(() => {
    if (!orgId) return;
    setLoadingRoles(true);

    // Load role_permissions docs for this org
    const q = query(collection(db, "role_permissions"), where("tenantId", "==", orgId));
    const unsub = onSnapshot(
      q,
      async (snap) => {
        if (snap.empty) {
          // Seed built-in roles
          try {
            await Promise.all(
              BUILT_IN_ROLES.map((r) =>
                setDoc(doc(db, "role_permissions", r.key), {
                  roleName: r.name,
                  description: r.description,
                  color: r.color,
                  isBuiltIn: r.isBuiltIn,
                  tenantId: orgId,
                  userCount: 0,
                  permissions: r.permissions,
                  createdAt: serverTimestamp(),
                })
              )
            );
          } catch (err) {
            console.error("Failed to seed roles:", err);
          }
          // Snapshot listener will re-fire after seeding
          return;
        }

        const rows: RoleRow[] = snap.docs.map((d) => ({
          id: d.id,
          roleName: d.data().roleName ?? d.id,
          description: d.data().description ?? "",
          userCount: d.data().userCount ?? 0,
          isBuiltIn: d.data().isBuiltIn ?? false,
        }));

        // Sort by built-in order
        const ORDER = ["admin", "supervisor", "case_manager", "billing", "read_only"];
        rows.sort((a, b) => {
          const ai = ORDER.indexOf(a.id);
          const bi = ORDER.indexOf(b.id);
          if (ai === -1 && bi === -1) return a.roleName.localeCompare(b.roleName);
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });

        setRoleRows(rows);
        setLoadingRoles(false);
      },
      (err) => {
        console.error("RolesPermissionsView:", err);
        // Fallback: show built-in roles from local data without Firestore
        setRoleRows(
          BUILT_IN_ROLES.map((r) => ({
            id: r.key,
            roleName: r.name,
            description: r.description,
            userCount: 0,
            isBuiltIn: true,
          }))
        );
        setLoadingRoles(false);
      }
    );

    return unsub;
  }, [orgId]);

  const handleCreateRole = async () => {
    if (!orgId) return;
    try {
      const newRef = await addDoc(collection(db, "role_permissions"), {
        roleName: "New Role",
        description: "Custom role",
        color: "#64748b",
        isBuiltIn: false,
        tenantId: orgId,
        userCount: 0,
        permissions: {},
        createdAt: serverTimestamp(),
      });
      navigate(`/settings/users/roles/${newRef.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create role");
    }
  };

  if (loadingRoles) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-icm-bg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
          Roles & Permissions
        </p>
        <button
          onClick={handleCreateRole}
          className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
        >
          + Create Role
        </button>
      </div>

      <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
        <table className="w-full text-[12px] font-geist">
          <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Role</th>
              <th className="text-left px-3 py-2.5 font-semibold w-16">Users</th>
              <th className="text-left px-3 py-2.5 font-semibold">Description</th>
              <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roleRows.map((r) => {
              const dotClass = ROLE_DOTS[r.id] ?? "bg-slate-400";
              const badgeClass = ROLE_COLORS[r.id] ?? "bg-slate-100 text-slate-600";
              return (
                <tr key={r.id} className="border-t border-icm-border hover:bg-icm-bg">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", dotClass)} />
                      <span className={cn("px-2 py-0.5 rounded-full text-[10.5px] font-geist font-semibold", badgeClass)}>
                        {r.roleName}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-icm-text-dim">{r.userCount}</td>
                  <td className="px-3 py-3 text-icm-text-dim">{r.description}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/settings/users/roles/${r.id}`)}
                        className="h-7 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[11px] font-geist font-semibold text-icm-text hover:border-icm-border-strong transition-colors inline-flex items-center gap-1"
                      >
                        <Settings className="w-3 h-3" />
                        Edit
                      </button>
                      <div className="relative" ref={openRoleMenu === r.id ? roleMenuRef : undefined}>
                        <button
                          onClick={() => setOpenRoleMenu(openRoleMenu === r.id ? null : r.id)}
                          className={cn(
                            "h-7 w-7 rounded-lg text-icm-text-dim flex items-center justify-center transition-colors",
                            openRoleMenu === r.id
                              ? "bg-icm-accent/10 text-icm-accent"
                              : "hover:bg-icm-bg border border-icm-border"
                          )}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                        {openRoleMenu === r.id && (
                          <div className="absolute right-0 top-8 z-50 w-40 rounded-xl border border-icm-border bg-white shadow-elevated py-1 text-[12px] font-geist">
                            <button
                              onClick={() => {
                                setOpenRoleMenu(null);
                                toast.info("Rename — edit the role name in the editor.");
                                navigate(`/settings/users/roles/${r.id}`);
                              }}
                              className="w-full px-3 py-2 text-left text-icm-text hover:bg-icm-bg transition-colors"
                            >
                              Rename
                            </button>
                            <button
                              onClick={async () => {
                                setOpenRoleMenu(null);
                                if (!orgId) return;
                                try {
                                  const srcDoc = await import("firebase/firestore").then(({ getDoc, doc: _doc }) =>
                                    getDoc(_doc(db, "role_permissions", r.id))
                                  );
                                  if (!srcDoc.exists()) return;
                                  const newRef = await addDoc(collection(db, "role_permissions"), {
                                    ...srcDoc.data(),
                                    roleName: `${r.roleName} (copy)`,
                                    isBuiltIn: false,
                                    tenantId: orgId,
                                    createdAt: serverTimestamp(),
                                  });
                                  toast.success("Role duplicated");
                                  navigate(`/settings/users/roles/${newRef.id}`);
                                } catch (err) {
                                  toast.error("Failed to duplicate role");
                                }
                              }}
                              className="w-full px-3 py-2 text-left text-icm-text hover:bg-icm-bg transition-colors"
                            >
                              Duplicate
                            </button>
                            {!r.isBuiltIn && (
                              <button
                                onClick={async () => {
                                  setOpenRoleMenu(null);
                                  try {
                                    await updateDoc(doc(db, "role_permissions", r.id), {
                                      isActive: false,
                                      updatedAt: serverTimestamp(),
                                    });
                                    toast.success("Role deactivated");
                                  } catch (err) {
                                    toast.error("Failed to deactivate role");
                                  }
                                }}
                                className="w-full px-3 py-2 text-left text-icm-red hover:bg-icm-red-soft/50 transition-colors"
                              >
                                Deactivate
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  width = 480,
  children,
}: {
  title: string;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="rounded-2xl bg-icm-panel border border-icm-border shadow-elevated w-full"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-icm-border">
          <h2 className="font-manrope font-bold text-[15px] text-icm-text">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY as string;

/** Generate a strong temporary password: e.g. Tmp#Xk9mP2qR */
function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "#@!";
  const all = upper + lower + digits + special;
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  const base = [
    rand(upper), rand(upper),
    rand(lower), rand(lower), rand(lower),
    rand(digits), rand(digits),
    rand(special),
    ...Array.from({ length: 4 }, () => rand(all)),
  ];
  // shuffle
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base.join("");
}

const STAFF_CREATE_URL = "https://us-central1-casemanagement-ai.cloudfunctions.net/api/api/staff/create-or-update";

/**
 * Create or re-link a staff user via the Admin SDK Cloud Function.
 * Handles EMAIL_EXISTS gracefully — if the Firebase Auth account already
 * exists, the Cloud Function just reconnects it to this org in Firestore.
 * Returns { uid, isNew, tempPassword? }
 */
async function upsertStaffUser(
  email: string,
  firstName: string,
  lastName: string,
  role: string,
  orgId: string,
): Promise<{ uid: string; isNew: boolean; tempPassword?: string }> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error("Not signed in. Please reload and try again.");
  const res = await fetch(STAFF_CREATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ email, firstName, lastName, role, organizationId: orgId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Could not create staff account");
  return data as { uid: string; isNew: boolean; tempPassword?: string };
}

// ─── Create User Modal ───────────────────────────────────────────────────────

type CreateStep = "form" | "created";

function CreateUserModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [step, setStep] = useState<CreateStep>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleKey>("case_manager");
  const [saving, setSaving] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPw, setCopiedPw] = useState(false);
  const [generatedPw, setGeneratedPw] = useState("");
  const [createdUid, setCreatedUid] = useState("");

  const handleCreate = async () => {
    if (!email.trim()) { toast.error("Email is required"); return; }
    if (!firstName.trim() || !lastName.trim()) { toast.error("First and last name are required"); return; }
    const trimEmail = email.trim().toLowerCase();
    setSaving(true);
    try {
      // Cloud Function handles both new and existing Firebase Auth accounts.
      // If the account already exists, it re-links it to this org in Firestore
      // without creating a duplicate — no more EMAIL_EXISTS errors.
      const result = await upsertStaffUser(trimEmail, firstName.trim(), lastName.trim(), role, orgId);

      setGeneratedPw(result.tempPassword ?? "");
      setCreatedUid(result.uid);
      // isNew=false means the account already existed — they keep their password
      if (!result.isNew) {
        setGeneratedPw("(existing account — they keep their current password)");
      }
      setStep("created");
    } catch (err: any) {
      console.error("Create user error:", err);
      toast.error("Failed to create account", { description: err?.message ?? "Unknown error" });
    } finally {
      setSaving(false);
    }
  };

  const copy = async (text: string, which: "email" | "pw") => {
    await navigator.clipboard.writeText(text);
    if (which === "email") { setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000); }
    else { setCopiedPw(true); setTimeout(() => setCopiedPw(false), 2000); }
  };

  if (step === "created") {
    const loginUrl = window.location.origin + "/login";
    return (
      <ModalShell title="Account Created" onClose={onClose} width={500}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-full bg-icm-green-soft flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-icm-green" />
          </div>
          <div>
            <p className="text-[13px] font-geist font-semibold text-icm-text">{firstName} {lastName} is ready to log in</p>
            <p className="text-[11.5px] text-icm-text-dim">Share these credentials securely with the user.</p>
          </div>
        </div>

        <div className="rounded-xl border border-icm-green/30 bg-icm-green-soft/40 p-4 space-y-3">
          <CredentialRow label="Login URL" value={loginUrl} onCopy={() => copy(loginUrl, "email")} copied={false} />
          <CredentialRow label="Email" value={email.trim().toLowerCase()} onCopy={() => copy(email.trim().toLowerCase(), "email")} copied={copiedEmail} />
          <CredentialRow label="Temporary Password" value={generatedPw} onCopy={() => copy(generatedPw, "pw")} copied={copiedPw} mono />
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg bg-icm-amber-soft/50 border border-icm-amber/20 px-3 py-2.5">
          <span className="text-icm-amber text-[11px] font-geist font-semibold mt-0.5">⚠</span>
          <p className="text-[11.5px] text-icm-text-dim font-geist leading-relaxed">
            This password will not be shown again. Copy it now and share it securely with <strong className="text-icm-text">{firstName}</strong>.
            They can change their password after logging in.
          </p>
        </div>

        <button
          onClick={() => {
            copy(`Login: ${loginUrl}\nEmail: ${email.trim().toLowerCase()}\nPassword: ${generatedPw}`, "pw");
          }}
          className="mt-4 w-full h-9 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold hover:bg-icm-bg inline-flex items-center justify-center gap-2"
        >
          <Copy className="w-3.5 h-3.5" /> Copy all credentials
        </button>
        <button
          onClick={onClose}
          className="mt-2 w-full h-9 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90"
        >
          Done
        </button>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Add New User" onClose={onClose} width={480}>
      <p className="text-[12px] text-icm-text-dim font-geist mb-4">
        We'll create a login and generate a temporary password you can share directly with the user.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <InlineField label="First name" value={firstName} onChange={setFirstName} />
        <InlineField label="Last name" value={lastName} onChange={setLastName} />
      </div>
      <div className="mt-3">
        <InlineField label="Email" value={email} onChange={setEmail} placeholder="user@example.com" />
      </div>
      <div className="mt-3">
        <InlineLabel>Role</InlineLabel>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as RoleKey)}
          className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
        >
          {roles.map((r) => (
            <option key={r.key} value={r.key}>{r.name}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold">
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saving ? "Creating account…" : "Create Account & Get Credentials"}
        </button>
      </div>
    </ModalShell>
  );
}

function CredentialRow({
  label, value, onCopy, copied, mono = false,
}: { label: string; value: string; onCopy: () => void; copied: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">{label}</p>
        <p className={`text-[12.5px] text-icm-text truncate ${mono ? "font-mono" : "font-geist"}`}>{value}</p>
      </div>
      <button
        onClick={onCopy}
        className="shrink-0 h-7 w-7 rounded-lg border border-icm-border bg-icm-panel hover:bg-icm-bg flex items-center justify-center text-icm-text-dim"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-icm-green" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function InlineLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">{children}</label>
  );
}

function InlineField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <InlineLabel>{label}</InlineLabel>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong"
      />
    </div>
  );
}

function DropMenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
  success = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-icm-bg transition-colors text-[12.5px] font-geist",
        danger ? "text-icm-red hover:bg-icm-red-soft/50" :
        success ? "text-icm-green hover:bg-icm-green-soft/50" :
        "text-icm-text"
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
    </button>
  );
}

export default SettingsUsers;
