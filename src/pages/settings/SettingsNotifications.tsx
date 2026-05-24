import { useState } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

// ─── Email notification rows ───────────────────────────────────────────────
const emailEvents = [
  { name: "New incident reported",              recipients: "Supervisor + Admin",          defaultFreq: "Immediately" },
  { name: "Compliance hard stop detected",      recipients: "Assigned CM + Supervisor",    defaultFreq: "Immediately" },
  { name: "Medicaid renewal due in 30 days",    recipients: "Assigned CM",                 defaultFreq: "Immediately" },
  { name: "Document expiring in 30 days",       recipients: "Assigned CM",                 defaultFreq: "Immediately" },
  { name: "Unsigned notes >48 hours",           recipients: "Assigned CM + Supervisor",    defaultFreq: "Immediately" },
  // ── new rows (8–11, inserted before "New user invitation") ──
  { name: "ISP / PCP renewal due in 30 days",   recipients: "Assigned CM",                 defaultFreq: "Immediately" },
  { name: "Service authorization expiring in 30 days", recipients: "Assigned CM",          defaultFreq: "Immediately" },
  { name: "Supervisor approval requested",      recipients: "Supervisor",                   defaultFreq: "Immediately" },
  { name: "Assessment overdue",                 recipients: "Assigned CM + Supervisor",    defaultFreq: "Immediately" },
  // ── existing rows continued ──
  { name: "New user invitation",                recipients: "Invited user",                 defaultFreq: "Immediately" },
  { name: "User login from new device",         recipients: "That user",                    defaultFreq: "Immediately" },
];

// Recipients that support state-scoped options
const scopedRecipients: Record<string, string[]> = {
  "Assigned CM": [
    "Assigned CM only",
    "All Case Managers",
    "All Case Managers — Indiana",
    "All Case Managers — New Jersey",
  ],
  "Assigned CM + Supervisor": [
    "Assigned CM + Supervisor",
    "All Case Managers",
    "All Case Managers — Indiana",
    "All Case Managers — New Jersey",
  ],
  "Supervisor + Admin": ["Supervisor + Admin"],
  "Supervisor": ["Supervisor"],
  "Invited user": ["Invited user"],
  "That user": ["That user"],
};

// ─── Scheduled report rows ─────────────────────────────────────────────────
const defaultScheduledReports = [
  { report: "Caseload Summary",               recipients: "All Supervisors",             frequency: "Weekly (Monday 8:00 AM)", delivery: "Email" },
  { report: "PCP / ISP Compliance Dashboard", recipients: "All Supervisors + Admin",     frequency: "Weekly (Monday 8:00 AM)", delivery: "Email" },
  { report: "Compliance Agent Run Summary",   recipients: "Admin",                        frequency: "Monthly (1st of month)",  delivery: "Email" },
  { report: "Billing & Authorization Status", recipients: "Billing + Admin",              frequency: "Weekly (Monday 8:00 AM)", delivery: "Email" },
];

const reportOptions = [
  "Caseload Summary",
  "PCP / ISP Compliance Dashboard",
  "Compliance Agent Run Summary",
  "Billing & Authorization Status",
  "Individual Progress Report",
  "Authorization Utilization Report",
];

const frequencyOptions = ["Immediately", "Daily Digest", "Weekly Summary"];
const scheduleFreqOptions = ["Daily", "Weekly", "Monthly", "Custom"];

// ─── Component ─────────────────────────────────────────────────────────────
const SettingsNotifications = () => {
  const [showModal, setShowModal] = useState(false);
  const [modalFreq, setModalFreq] = useState("Weekly");

  return (
    <SettingsLayout
      title="Notifications"
      subtitle="Configure system notifications, email alerts, and scheduled report delivery"
    >
      {/* ── SECTION 1: Email Notifications ── */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <p className="font-manrope font-bold text-[14px] text-icm-text mb-3">Email notifications</p>
        <div className="rounded-xl border border-icm-border overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Event</th>
                <th className="text-left px-3 py-2 font-semibold">Recipients</th>
                <th className="text-left px-3 py-2 font-semibold">Frequency</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {emailEvents.map((e) => {
                const recipientOptions = scopedRecipients[e.recipients] ?? [e.recipients];
                const hasScoping = recipientOptions.length > 1;
                return (
                  <tr key={e.name} className="border-t border-icm-border">
                    <td className="px-3 py-2 text-icm-text font-medium">{e.name}</td>
                    <td className="px-3 py-2 text-icm-text-dim">
                      {hasScoping ? (
                        <select className="h-7 px-2 rounded-lg border border-icm-border bg-icm-panel text-[11px] font-geist text-icm-text">
                          {recipientOptions.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        e.recipients
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <select className="h-7 px-2 rounded-lg border border-icm-border bg-icm-panel text-[11px] font-geist text-icm-text">
                        {frequencyOptions.map((f) => (
                          <option key={f} selected={f === e.defaultFreq}>{f}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Toggle defaultOn />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECTION 2: Daily Digest (unchanged) ── */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <p className="font-manrope font-bold text-[14px] text-icm-text mb-3">Daily digest</p>
        <div className="flex items-center gap-3 mb-3">
          <Toggle defaultOn />
          <span className="text-[12px] font-geist text-icm-text">Send daily task summary email</span>
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
              <option>All Case Managers — Indiana</option>
              <option>All Case Managers — New Jersey</option>
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

      {/* ── SECTION 3: In-App Notifications (6 existing + 3 new) ── */}
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
            // 3 new
            "ISP / PCP renewal approaching",
            "Authorization expiring",
            "Supervisor approval pending",
          ].map((c) => (
            <label key={c} className="flex items-center gap-2 text-[12px] font-geist text-icm-text">
              <input type="checkbox" defaultChecked className="accent-icm-accent" />
              {c}
            </label>
          ))}
        </div>
      </div>

      {/* ── SECTION 4: Scheduled Report Delivery (new) ── */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
        <div className="mb-3">
          <p className="font-manrope font-bold text-[14px] text-icm-text">Scheduled Report Delivery</p>
          <p className="text-[11.5px] font-geist text-icm-text-dim mt-0.5">
            Automatically deliver reports to recipients on a set schedule.
          </p>
        </div>

        <div className="rounded-xl border border-icm-border overflow-hidden mb-3">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Report</th>
                <th className="text-left px-3 py-2 font-semibold">Recipients</th>
                <th className="text-left px-3 py-2 font-semibold">Frequency</th>
                <th className="text-left px-3 py-2 font-semibold">Delivery Method</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {defaultScheduledReports.map((row) => (
                <tr key={row.report} className="border-t border-icm-border">
                  <td className="px-3 py-2 text-icm-text font-medium">{row.report}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{row.recipients}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{row.frequency}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{row.delivery}</td>
                  <td className="px-3 py-2 text-right">
                    <Toggle defaultOn />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Schedule button */}
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-geist font-semibold border border-icm-border bg-icm-bg text-icm-text hover:bg-icm-panel hover:border-icm-border-strong transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Schedule
        </button>
      </div>

      {/* ── Add Schedule Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl border border-icm-border bg-icm-panel shadow-2xl p-5">
            {/* Modal header */}
            <div className="flex items-center justify-between mb-4">
              <p className="font-manrope font-bold text-[14px] text-icm-text">Add Scheduled Report</p>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg border border-icm-border bg-icm-bg flex items-center justify-center text-icm-text-dim hover:text-icm-text transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Report */}
              <div>
                <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
                  Report
                </label>
                <select className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text">
                  {reportOptions.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>

              {/* Recipients */}
              <div>
                <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
                  Recipients
                </label>
                <select multiple className="mt-1 w-full h-24 px-3 py-1.5 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text">
                  {["All Supervisors", "All Case Managers", "All Case Managers — Indiana", "All Case Managers — New Jersey", "Admin", "Billing", "Assigned CM only"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <p className="text-[10px] font-geist text-icm-text-faint mt-0.5">Hold Cmd/Ctrl to select multiple</p>
              </div>

              {/* Frequency */}
              <div>
                <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
                  Frequency
                </label>
                <select
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text"
                  value={modalFreq}
                  onChange={(e) => setModalFreq(e.target.value)}
                >
                  {scheduleFreqOptions.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>

              {/* Day/Time picker — shown for Weekly / Monthly */}
              {(modalFreq === "Weekly" || modalFreq === "Monthly") && (
                <div className="grid grid-cols-2 gap-3">
                  {modalFreq === "Weekly" && (
                    <div>
                      <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
                        Day
                      </label>
                      <select className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text">
                        {["Monday","Tuesday","Wednesday","Thursday","Friday"].map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                  )}
                  {modalFreq === "Monthly" && (
                    <div>
                      <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
                        Day of Month
                      </label>
                      <select className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text">
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
                      Time
                    </label>
                    <input
                      type="time"
                      defaultValue="08:00"
                      className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text"
                    />
                  </div>
                </div>
              )}

              {/* Delivery Method */}
              <div>
                <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
                  Delivery Method
                </label>
                <select className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-bg text-[12px] font-geist text-icm-text">
                  <option>Email</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="h-9 px-4 rounded-xl text-[12px] font-geist font-semibold border border-icm-border bg-icm-bg text-icm-text-dim hover:text-icm-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="h-9 px-4 rounded-xl text-[12px] font-geist font-semibold bg-icm-accent text-white hover:opacity-90 transition-opacity"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
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
