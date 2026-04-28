import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import {
  getUser,
  roleLabel,
  roleAvatarTone,
  roleBadgeTone,
  statusTone,
  getInitials,
  programs,
  operatingStates,
  permissionsMatrix,
  permTone,
  permLabel,
} from "@/data/settings";
import { cn } from "@/lib/utils";
import { Pencil, MoreHorizontal, Shield, Activity } from "lucide-react";
import { demoToast, demoSuccess } from "@/lib/demoToast";

const SettingsUserDetail = () => {
  const { userId = "" } = useParams();
  const navigate = useNavigate();
  const user = getUser(userId);
  const [tab, setTab] = useState<"profile" | "access" | "activity" | "permissions">(
    "profile"
  );

  if (!user) {
    return (
      <SettingsLayout title="User not found" subtitle="The requested user does not exist.">
        <button
          onClick={() => navigate("/settings/users")}
          className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold"
        >
          Back to users
        </button>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title={`${user.firstName} ${user.lastName}`} subtitle={user.email}>
      {/* Identity card */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-4">
        <span
          className={cn(
            "w-16 h-16 rounded-full ring-1 flex items-center justify-center text-[18px] font-manrope font-bold",
            roleAvatarTone(user.role)
          )}
        >
          {getInitials(user.firstName, user.lastName)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-manrope font-bold text-[18px] text-icm-text">
              {user.firstName} {user.lastName}
            </h2>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1",
                roleBadgeTone(user.role)
              )}
            >
              {roleLabel(user.role)}
            </span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 capitalize",
                statusTone(user.status)
              )}
            >
              {user.status}
            </span>
          </div>
          <p className="text-[12px] font-geist text-icm-text-dim mt-1">
            {user.title ?? "—"} · {user.email}
          </p>
          <p className="text-[11px] font-mono text-icm-text-faint mt-0.5">
            Last login: {user.lastLogin}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => demoToast(`Edit ${user.firstName} ${user.lastName}`)}
            className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:border-icm-border-strong"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={() => demoToast("More user actions")}
            className="h-9 w-9 rounded-xl border border-icm-border bg-icm-panel text-icm-text-dim flex items-center justify-center hover:border-icm-border-strong"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-icm-border">
        {(
          [
            { k: "profile", label: "Profile" },
            { k: "access", label: "Programs & Access" },
            { k: "activity", label: "Activity Log" },
            { k: "permissions", label: "Permissions" },
          ] as const
        ).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={cn(
              "h-9 px-3 text-[12.5px] font-geist font-semibold transition-colors -mb-px border-b-2",
              tab === t.k
                ? "text-icm-accent border-icm-accent"
                : "text-icm-text-dim border-transparent hover:text-icm-text"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3 max-w-[640px]">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" defaultValue={user.firstName} />
            <Field label="Last name" defaultValue={user.lastName} />
          </div>
          <Field label="Email" defaultValue={user.email} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" defaultValue={user.phone ?? ""} />
            <Field label="Title / Credential" defaultValue={user.title ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Department" defaultValue={user.department ?? ""} />
            <Field label="Supervisor" defaultValue={user.supervisor ?? ""} />
          </div>
          <div>
            <Label>Role</Label>
            <select
              defaultValue={user.role}
              className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
            >
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="case_manager">Case Manager</option>
              <option value="billing">Billing</option>
              <option value="read_only">Read Only</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-[12px] font-geist text-icm-text">
            <input
              type="checkbox"
              defaultChecked={user.status === "active"}
              className="accent-icm-accent"
            />
            Account active
          </label>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => demoSuccess("User profile saved")}
              className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold"
            >
              Save changes
            </button>
          </div>
        </div>
      )}

      {tab === "access" && (
        <div className="space-y-3 max-w-[800px]">
          <SectionPanel title="Program access">
            <ul className="divide-y divide-icm-border">
              {programs.map((p) => {
                const enabled = user.programs.includes(p.name);
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between py-2 text-[12px] font-geist text-icm-text"
                  >
                    <span>{p.name}</span>
                    <span className="flex items-center gap-2">
                      {enabled && (
                        <span className="text-[10.5px] font-geist text-icm-text-dim">
                          {roleLabel(user.role)}
                        </span>
                      )}
                      <Toggle defaultOn={enabled} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </SectionPanel>

          <SectionPanel title="State access">
            <div className="flex flex-wrap gap-3">
              {operatingStates.map((s) => (
                <label
                  key={s.code}
                  className="flex items-center gap-2 text-[12px] font-geist text-icm-text"
                >
                  <input
                    type="checkbox"
                    defaultChecked={user.states.includes(s.code)}
                    className="accent-icm-accent"
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </SectionPanel>

          <SectionPanel title="Individual access">
            <div className="space-y-2 text-[12px] font-geist text-icm-text">
              <Radio
                name="access"
                defaultChecked
                label="Assigned individuals only"
                desc="User sees only individuals assigned to them as case manager"
              />
              <Radio
                name="access"
                label="All individuals in assigned programs"
                desc="User sees all individuals in their programs regardless of assignment"
              />
              <Radio
                name="access"
                label="All individuals in organization"
                desc="Admin-level access to all records (requires Admin or Supervisor role)"
              />
            </div>
          </SectionPanel>

          {user.role === "case_manager" && (
            <SectionPanel title="Caseload">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Current caseload" defaultValue={String(user.caseload ?? 0)} />
                <Field
                  label="Caseload capacity"
                  defaultValue={String(user.caseloadCapacity ?? 0)}
                />
                <Field label="Caseload weight" defaultValue="0" />
              </div>
            </SectionPanel>
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Timestamp</th>
                <th className="text-left px-3 py-2 font-semibold">Action</th>
                <th className="text-left px-3 py-2 font-semibold">Module</th>
                <th className="text-left px-3 py-2 font-semibold">Individual</th>
                <th className="text-left px-3 py-2 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody>
              {[
                { t: "Today, 9:14 AM", a: "Login", m: "Auth", i: "—", ip: "10.0.1.42" },
                { t: "Today, 9:18 AM", a: "Viewed eChart", m: "People", i: "Joseph Brown", ip: "10.0.1.42" },
                { t: "Today, 9:32 AM", a: "Created contact note", m: "Contact Notes", i: "Joseph Brown", ip: "10.0.1.42" },
                { t: "Yesterday", a: "Submitted referral", m: "Referrals", i: "Joseph Brown", ip: "10.0.1.42" },
              ].map((row, i) => (
                <tr key={i} className="border-t border-icm-border">
                  <td className="px-3 py-2 text-icm-text-dim font-mono text-[11px]">{row.t}</td>
                  <td className="px-3 py-2 text-icm-text">{row.a}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{row.m}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{row.i}</td>
                  <td className="px-3 py-2 text-icm-text-faint font-mono text-[11px]">{row.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "permissions" && (
        <div className="space-y-3 max-w-[900px]">
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-icm-amber-soft ring-1 ring-icm-amber/20 text-[11.5px] font-geist text-icm-text">
            <Shield className="w-3.5 h-3.5 text-icm-amber mt-0.5 shrink-0" />
            Permission overrides for this user replace defaults set by their role. Use sparingly.
          </div>
          <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
            <table className="w-full text-[12px] font-geist">
              <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Module</th>
                  <th className="text-center px-3 py-2 font-semibold">Default ({roleLabel(user.role)})</th>
                  <th className="text-center px-3 py-2 font-semibold">Override</th>
                </tr>
              </thead>
              <tbody>
                {permissionsMatrix.slice(0, 8).map((row) => {
                  const def = row.perms[user.role];
                  return (
                    <tr key={row.module} className="border-t border-icm-border">
                      <td className="px-3 py-2 text-icm-text font-medium">{row.module}</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center min-w-[44px] h-6 rounded-full text-[10px] font-geist font-semibold ring-1",
                            permTone(def)
                          )}
                        >
                          {permLabel(def)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <select className="h-7 px-2 rounded-lg border border-icm-border bg-icm-panel text-[11px] font-geist text-icm-text">
                          <option>Inherit</option>
                          <option>Allow</option>
                          <option>Deny</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => demoSuccess("Permission overrides reset to role defaults")}
            className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:border-icm-border-strong"
          >
            <Activity className="w-3.5 h-3.5" />
            Reset all to role defaults
          </button>
        </div>
      )}
    </SettingsLayout>
  );
};

function SectionPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function Toggle({ defaultOn }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <button
      onClick={() => setOn(!on)}
      className={cn(
        "relative w-9 h-5 rounded-full transition-colors",
        on ? "bg-icm-accent" : "bg-icm-border"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
          on && "translate-x-4"
        )}
      />
    </button>
  );
}

function Radio({
  name,
  label,
  desc,
  defaultChecked,
}: {
  name: string;
  label: string;
  desc: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="radio"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 accent-icm-accent"
      />
      <div>
        <p className="font-medium text-icm-text">{label}</p>
        <p className="text-[11.5px] text-icm-text-dim">{desc}</p>
      </div>
    </label>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
      {children}
    </label>
  );
}

function Field({
  label,
  defaultValue,
}: {
  label: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        defaultValue={defaultValue}
        className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
      />
    </div>
  );
}

export default SettingsUserDetail;
