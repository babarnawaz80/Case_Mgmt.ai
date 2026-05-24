import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
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
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | RoleKey>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [showInvite, setShowInvite] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
            firstName: data.firstName ?? "",
            lastName: data.lastName ?? "",
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
    try {
      await updateDoc(doc(db, "users", userId), {
        status: newStatus,
        isActive: newStatus === "active",
        updatedAt: serverTimestamp(),
      });
      toast.success(`User ${labelMap[action]} successfully`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to ${action} user`, { description: err?.message });
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
              <button
                onClick={() => setShowInvite(true)}
                className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add User
              </button>
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
                      <td colSpan={6} className="px-3 py-8 text-center text-icm-text-dim text-[12px]">
                        No users found matching your filters.
                      </td>
                    </tr>
                  )}
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => navigate(`/settings/users/${u.id}`)}
                      className="border-t border-icm-border hover:bg-icm-bg cursor-pointer"
                    >
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

function RolesPermissionsView() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">
          Default roles
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {roles.map((r) => (
            <div key={r.key} className="rounded-xl border border-icm-border bg-icm-panel p-3">
              <div className="flex items-center justify-between gap-2">
                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1", roleBadgeTone(r.key))}>
                  {r.name}
                </span>
                <span className="text-[10.5px] text-icm-text-faint font-mono">{r.userCount} users</span>
              </div>
              <p className="text-[11.5px] font-geist text-icm-text-dim mt-2 leading-relaxed">{r.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">
          Permissions matrix
        </p>
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] font-geist">
              <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-icm-bg z-10">Module</th>
                  {roles.map((r) => (
                    <th key={r.key} className="text-center px-3 py-2 font-semibold">{r.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionsMatrix.map((row) => (
                  <tr key={row.module} className="border-t border-icm-border">
                    <td className="px-3 py-2 text-icm-text font-medium sticky left-0 bg-icm-panel z-10">{row.module}</td>
                    {roles.map((r) => {
                      const p = row.perms[r.key];
                      return (
                        <td key={r.key} className="px-3 py-2 text-center">
                          <span className={cn("inline-flex items-center justify-center min-w-[44px] h-6 rounded-full text-[10px] font-geist font-semibold ring-1", permTone(p))}>
                            {permLabel(p)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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

/** Create a Firebase Auth user via the Identity Toolkit REST API */
async function createFirebaseAuthUser(email: string, password: string, displayName: string): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName, returnSecureToken: false }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? "Could not create account");
  return data.localId as string; // new user's UID
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
    const dispName = `${firstName.trim()} ${lastName.trim()}`;
    const pw = generateTempPassword();
    setSaving(true);
    try {
      // 1. Create Firebase Auth account
      const uid = await createFirebaseAuthUser(trimEmail, pw, dispName);

      // 2. Write Firestore user doc with the known UID
      await setDoc(doc(db, "users", uid), {
        uid,
        organizationId: orgId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: trimEmail,
        displayName: dispName,
        role,
        status: "active",
        isActive: true,
        mustChangePw: true,   // flag so we can prompt on first login
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: null,
      });

      setGeneratedPw(pw);
      setCreatedUid(uid);
      setStep("created");
    } catch (err: any) {
      console.error("Create user error:", err);
      const msg = err?.message ?? "Unknown error";
      if (msg.includes("EMAIL_EXISTS")) {
        toast.error("That email is already registered in Firebase Auth.");
      } else {
        toast.error("Failed to create account", { description: msg });
      }
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
