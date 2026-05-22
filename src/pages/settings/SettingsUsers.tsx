import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import {
  Search,
  UserPlus,
  Upload,
  MoreHorizontal,
  Pencil,
  X,
} from "lucide-react";
import {
  orgUsers,
  roleLabel,
  roleAvatarTone,
  roleBadgeTone,
  statusTone,
  getInitials,
  userCounts,
  permissionsMatrix,
  permTone,
  permLabel,
  roles,
  type RoleKey,
  type UserStatus,
} from "@/data/settings";
import { credentialBadge } from "@/data/staffProvider";
import { cn } from "@/lib/utils";
import { demoToast, demoSuccess } from "@/lib/demoToast";

const SettingsUsers = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | RoleKey>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [showInvite, setShowInvite] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const counts = userCounts();

  const filtered = useMemo(() => {
    return orgUsers.filter((u) => {
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
  }, [search, roleFilter, statusFilter]);

  return (
    <SettingsLayout
      title="Users & Roles"
      subtitle="Manage staff accounts and access"
    >
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
                Invite user
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
            <table className="w-full text-[12px] font-geist">
              <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">User</th>
                  <th className="text-left px-3 py-2 font-semibold">Email</th>
                  <th className="text-left px-3 py-2 font-semibold">Role</th>
                  <th className="text-left px-3 py-2 font-semibold">Programs</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                  <th className="text-left px-3 py-2 font-semibold">Last login</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
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
                          const tone = cb.tone === "red"
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
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1",
                          roleBadgeTone(u.role)
                        )}
                      >
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-icm-text-dim">
                      {u.programs.length === 1 ? u.programs[0] : `${u.programs.length} programs`}
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
                      <div className="inline-flex items-center gap-1">
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
                        <button
                          onClick={(e) => { e.stopPropagation(); demoToast(`More actions for ${u.firstName} ${u.lastName}`); }}
                          className="h-7 w-7 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
                          title="More"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <RolesPermissionsView />
      )}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </SettingsLayout>
  );
};

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
      {/* Roles list */}
      <div>
        <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">
          Default roles
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {roles.map((r) => (
            <div
              key={r.key}
              className="rounded-xl border border-icm-border bg-icm-panel p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1",
                    roleBadgeTone(r.key)
                  )}
                >
                  {r.name}
                </span>
                <span className="text-[10.5px] text-icm-text-faint font-mono">
                  {r.userCount} users
                </span>
              </div>
              <p className="text-[11.5px] font-geist text-icm-text-dim mt-2 leading-relaxed">
                {r.description}
              </p>
            </div>
          ))}
        </div>
        <button
          onClick={() => demoToast("Custom role builder")}
          className="mt-2 h-8 px-3 rounded-xl border border-dashed border-icm-border bg-icm-panel text-icm-text-dim text-[11.5px] font-geist font-semibold hover:border-icm-border-strong hover:text-icm-text transition-colors"
        >
          + Create custom role
        </button>
      </div>

      {/* Permissions matrix */}
      <div>
        <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">
          Permissions matrix
        </p>
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] font-geist">
              <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-icm-bg z-10">
                    Module
                  </th>
                  {roles.map((r) => (
                    <th key={r.key} className="text-center px-3 py-2 font-semibold">
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionsMatrix.map((row) => (
                  <tr key={row.module} className="border-t border-icm-border">
                    <td className="px-3 py-2 text-icm-text font-medium sticky left-0 bg-icm-panel z-10">
                      {row.module}
                    </td>
                    {roles.map((r) => {
                      const p = row.perms[r.key];
                      return (
                        <td key={r.key} className="px-3 py-2 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center min-w-[44px] h-6 rounded-full text-[10px] font-geist font-semibold ring-1",
                              permTone(p)
                            )}
                          >
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
        <div className="flex justify-end mt-3">
          <button
            onClick={() => demoSuccess("Permissions saved", "Updated for all roles.")}
            className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold"
          >
            Save permissions
          </button>
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

function InviteModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="Invite New User" onClose={onClose} width={480}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" />
        <Field label="Last name" />
      </div>
      <div className="mt-3">
        <Field label="Email" placeholder="user@example.com" />
      </div>
      <div className="mt-3">
        <Label>Role</Label>
        <select className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text">
          {roles.map((r) => (
            <option key={r.key} value={r.key}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3">
        <Label>Personal message (optional)</Label>
        <textarea
          rows={3}
          className="mt-1 w-full px-3 py-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text resize-none focus:outline-none focus:border-icm-border-strong"
        />
      </div>
      <label className="mt-3 flex items-center gap-2 text-[12px] font-geist text-icm-text">
        <input type="checkbox" defaultChecked className="accent-icm-accent" />
        Send invitation now
      </label>
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onClose}
          className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={() => { demoSuccess("Invitation sent"); onClose(); }}
          className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold"
        >
          Send invitation
        </button>
      </div>
    </ModalShell>
  );
}

function ImportModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="Import Users from CSV" onClose={onClose} width={520}>
      <ol className="space-y-3 text-[12px] font-geist text-icm-text">
        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-icm-accent-soft text-icm-accent text-[10px] font-bold flex items-center justify-center shrink-0">
            1
          </span>
          <div className="flex-1">
            <p className="font-semibold">Download template</p>
            <button
              onClick={() => demoToast("CSV template download")}
              className="mt-1 h-8 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[11.5px] font-geist font-semibold hover:border-icm-border-strong transition-colors"
            >
              Download CSV template
            </button>
          </div>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-icm-accent-soft text-icm-accent text-[10px] font-bold flex items-center justify-center shrink-0">
            2
          </span>
          <div className="flex-1">
            <p className="font-semibold">Upload completed CSV</p>
            <div className="mt-1 rounded-xl border-2 border-dashed border-icm-border bg-icm-bg p-4 text-center">
              <Upload className="w-6 h-6 text-icm-text-faint mx-auto mb-1" />
              <p className="text-[11.5px] text-icm-text-dim">Drag CSV or click to browse</p>
            </div>
          </div>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-icm-accent-soft text-icm-accent text-[10px] font-bold flex items-center justify-center shrink-0">
            3
          </span>
          <div className="flex-1">
            <p className="font-semibold">Preview and import</p>
            <p className="text-[11.5px] text-icm-text-dim mt-1">
              Errors will be highlighted before import.
            </p>
          </div>
        </li>
      </ol>
      <label className="mt-4 flex items-center gap-2 text-[12px] font-geist text-icm-text">
        <input type="checkbox" defaultChecked className="accent-icm-accent" />
        Send invitation emails after import
      </label>
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onClose}
          className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={() => { demoSuccess("Users imported", "0 errors found in CSV."); onClose(); }}
          className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold"
        >
          Import
        </button>
      </div>
    </ModalShell>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
      {children}
    </label>
  );
}

function Field({ label, placeholder }: { label: string; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        placeholder={placeholder}
        className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong"
      />
    </div>
  );
}

export default SettingsUsers;
