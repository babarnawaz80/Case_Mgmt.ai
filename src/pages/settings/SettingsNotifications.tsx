import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { cn } from "@/lib/utils";

const events = [
  { name: "New incident reported", recipients: "Supervisor + Admin" },
  { name: "Compliance hard stop detected", recipients: "Assigned CM + Supervisor" },
  { name: "Medicaid renewal due in 30 days", recipients: "Assigned CM" },
  { name: "Document expiring in 30 days", recipients: "Assigned CM" },
  { name: "Unsigned notes >48 hours", recipients: "Assigned CM + Supervisor" },
  { name: "New user invitation", recipients: "Invited user" },
  { name: "User login from new device", recipients: "That user" },
];

const SettingsNotifications = () => {
  return (
    <SettingsLayout
      title="Notifications"
      subtitle="Configure system notifications, email alerts, and scheduled report delivery"
    >
      {/* Email events */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <p className="font-manrope font-bold text-[14px] text-icm-text mb-3">Email notifications</p>
        <div className="rounded-xl border border-icm-border overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Event</th>
                <th className="text-left px-3 py-2 font-semibold">Recipients</th>
                <th className="text-left px-3 py-2 font-semibold">Frequency</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.name} className="border-t border-icm-border">
                  <td className="px-3 py-2 text-icm-text font-medium">{e.name}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{e.recipients}</td>
                  <td className="px-3 py-2">
                    <select className="h-7 px-2 rounded-lg border border-icm-border bg-icm-panel text-[11px] font-geist text-icm-text">
                      <option>Immediately</option>
                      <option>Daily digest</option>
                      <option>Weekly digest</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Toggle defaultOn />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily digest */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <p className="font-manrope font-bold text-[14px] text-icm-text mb-3">Daily digest</p>
        <div className="flex items-center gap-3 mb-3">
          <Toggle defaultOn />
          <span className="text-[12px] font-geist text-icm-text">
            Send daily task summary email
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-[480px]">
          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              Time
            </label>
            <input
              defaultValue="07:00"
              className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
            />
          </div>
          <div>
            <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              Recipients
            </label>
            <select className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text">
              <option>All Case Managers</option>
              <option>Supervisors only</option>
              <option>Admins only</option>
            </select>
          </div>
        </div>
        <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mt-3 mb-2">
          Include
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {["Overdue tasks", "Tasks due today", "Upcoming deadlines (7 days)", "AI alerts and suggestions", "Unsigned notes"].map((c) => (
            <label key={c} className="flex items-center gap-2 text-[12px] font-geist text-icm-text">
              <input type="checkbox" defaultChecked className="accent-icm-accent" />
              {c}
            </label>
          ))}
        </div>
      </div>

      {/* In-app */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <p className="font-manrope font-bold text-[14px] text-icm-text mb-3">In-app notifications</p>
        <p className="text-[11.5px] font-geist text-icm-text-dim mb-2">
          Bell icon badge will indicate the following alert types:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {[
            "Overdue tasks",
            "Incident alerts",
            "Compliance flags",
            "Denied claims",
            "Document expirations",
            "Scheduled report ready",
          ].map((c) => (
            <label key={c} className="flex items-center gap-2 text-[12px] font-geist text-icm-text">
              <input type="checkbox" defaultChecked className="accent-icm-accent" />
              {c}
            </label>
          ))}
        </div>
      </div>
    </SettingsLayout>
  );
};

function Toggle({ defaultOn }: { defaultOn?: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-block w-9 h-5 rounded-full",
        defaultOn ? "bg-icm-accent" : "bg-icm-border"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
          defaultOn && "translate-x-4"
        )}
      />
    </span>
  );
}

export default SettingsNotifications;
