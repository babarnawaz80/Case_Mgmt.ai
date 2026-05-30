import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  GraduationCap, CheckCircle2, AlertTriangle, XCircle, Users,
  Download, Plus, X, Loader2, Bell, ExternalLink,
} from "lucide-react";

interface StaffUser {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  role: string;
  email: string;
  status: string;
}

/** Returns "First Last" from available name fields, falling back to email prefix. */
function staffDisplayName(s: StaffUser): string {
  const first = s.firstName?.trim();
  const last  = s.lastName?.trim();
  if (first || last) return [first, last].filter(Boolean).join(" ");
  // displayName might already be "First Last" — use it if it doesn't look like an email
  if (s.displayName && !s.displayName.includes("@")) return s.displayName;
  // Fall back: use the part before @ in the email
  return (s.email || s.displayName || "Staff").split("@")[0];
}

interface TrainingRecord {
  id: string;
  userId: string;
  trainingTypeName: string;
  expirationDate: string | null;
  status: "current" | "expiring_soon" | "expired" | "no_expiration";
  completionDate: string;
}

interface OrgRequirement {
  id: string;
  trainingTypeName: string;
  requiredForRoles: string[];
  recurringFrequencyDays: number | null;
  isActive: boolean;
}

interface MatrixCell {
  status: "current" | "expiring_soon" | "expired" | "missing" | "not_required";
  daysUntil?: number | null;
}

const CELL_ICONS: Record<MatrixCell["status"], string> = {
  current: "✓",
  expiring_soon: "⚠",
  expired: "✗",
  missing: "✗",
  not_required: "○",
};

const CELL_CLASSES: Record<MatrixCell["status"], string> = {
  current: "text-icm-green",
  expiring_soon: "text-icm-amber",
  expired: "text-icm-red font-bold",
  missing: "text-icm-text-faint",
  not_required: "text-icm-text-faint",
};

export default function SettingsTrainingCompliance() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId ?? "";

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [requirements, setRequirements] = useState<OrgRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [showAddReqModal, setShowAddReqModal] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    loadAll();
  }, [orgId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [usersSnap, trainingsSnap, reqSnap] = await Promise.allSettled([
        getDocs(query(collection(db, "users"), where("organizationId", "==", orgId))),
        getDocs(query(collection(db, "staff_trainings"), where("organizationId", "==", orgId))),
        getDocs(query(collection(db, "org_training_requirements"), where("organizationId", "==", orgId), where("isActive", "==", true))),
      ]);

      if (usersSnap.status === "fulfilled") {
        setStaff(usersSnap.value.docs
          .filter(d => d.data().status !== "inactive")
          .map(d => ({ id: d.id, ...d.data() } as StaffUser)));
      }
      if (trainingsSnap.status === "fulfilled") {
        setTrainings(trainingsSnap.value.docs.map(d => ({ id: d.id, ...d.data() } as TrainingRecord)));
      }
      if (reqSnap.status === "fulfilled") {
        setRequirements(reqSnap.value.docs.map(d => ({ id: d.id, ...d.data() } as OrgRequirement)));
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  };

  // Build training map: userId → trainingName → record
  const trainingMap = useMemo(() => {
    const m: Record<string, Record<string, TrainingRecord>> = {};
    for (const t of trainings) {
      if (!m[t.userId]) m[t.userId] = {};
      // Keep most recent
      const existing = m[t.userId][t.trainingTypeName];
      if (!existing || (t.completionDate > existing.completionDate)) {
        m[t.userId][t.trainingTypeName] = t;
      }
    }
    return m;
  }, [trainings]);

  // Required training columns (from org requirements)
  const requiredCols = useMemo(() =>
    requirements.map(r => r.trainingTypeName).filter((v, i, arr) => arr.indexOf(v) === i),
    [requirements]
  );

  // Stats
  const stats = useMemo(() => {
    let current = 0, expiring = 0, overdue = 0, never = 0;
    for (const s of staff) {
      const userTrainings = trainingMap[s.id] || {};
      const applicable = requirements.filter(r => r.requiredForRoles.includes(s.role));
      for (const req of applicable) {
        const record = userTrainings[req.trainingTypeName];
        if (!record) { never++; }
        else if (record.status === "expired") overdue++;
        else if (record.status === "expiring_soon") expiring++;
        else current++;
      }
    }
    return { total: staff.length, current, expiring, overdue, never };
  }, [staff, requirements, trainingMap]);

  // Urgent items (overdue or expiring within 30 days)
  const urgentItems = useMemo(() => {
    const items: Array<{ staffMember: StaffUser; trainingName: string; record: TrainingRecord; status: string }> = [];
    for (const s of staff) {
      const userTrainings = trainingMap[s.id] || {};
      for (const req of requirements.filter(r => r.requiredForRoles.includes(s.role))) {
        const record = userTrainings[req.trainingTypeName];
        if (record && (record.status === "expired" || record.status === "expiring_soon")) {
          items.push({ staffMember: s, trainingName: req.trainingTypeName, record, status: record.status });
        }
      }
    }
    return items.sort((a, b) => {
      if (a.status === "expired" && b.status !== "expired") return -1;
      if (b.status === "expired" && a.status !== "expired") return 1;
      return 0;
    });
  }, [staff, requirements, trainingMap]);

  const filteredStaff = useMemo(() => staff.filter(s => {
    if (filterRole !== "all" && s.role !== filterRole) return false;
    if (search && !staffDisplayName(s).toLowerCase().includes(search.toLowerCase()) && !s.email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [staff, filterRole, search]);

  const getCell = (userId: string, trainingName: string, userRole: string): MatrixCell => {
    const req = requirements.find(r => r.trainingTypeName === trainingName);
    if (req && !req.requiredForRoles.includes(userRole)) return { status: "not_required" };
    const record = trainingMap[userId]?.[trainingName];
    if (!record) return { status: "missing" };
    return { status: record.status as any };
  };

  const sendReminder = async (staffId: string, staffName: string, trainingName: string) => {
    setSendingReminder(staffId + trainingName);
    try {
      await addDoc(collection(db, "notifications"), {
        uid: staffId,
        organizationId: orgId,
        type: "training_reminder",
        title: "Training Renewal Reminder",
        body: `Your supervisor has sent a reminder to renew your ${trainingName}. Please complete and log your renewal.`,
        read: false,
        dismissed: false,
        severity: "warning",
        href: `/settings/users/${staffId}`,
        createdAt: serverTimestamp(),
      });
      toast.success(`Reminder sent to ${staffName}`);
    } catch { toast.error("Failed to send reminder"); }
    finally { setSendingReminder(null); }
  };

  const exportCSV = () => {
    const headers = ["Staff Member", "Role", ...requiredCols, "Overall Status"];
    const rows = filteredStaff.map(s => {
      const cells = requiredCols.map(col => {
        const cell = getCell(s.id, col, s.role);
        return cell.status === "current" ? "Current" : cell.status === "expiring_soon" ? "Expiring" :
          cell.status === "expired" ? "Overdue" : cell.status === "missing" ? "Missing" : "N/A";
      });
      const hasIssue = cells.some(c => c === "Overdue" || c === "Missing");
      const hasExpiring = cells.some(c => c === "Expiring");
      return [staffDisplayName(s), s.role?.replace(/_/g, " "), ...cells, hasIssue ? "Needs Attention" : hasExpiring ? "Expiring Soon" : "Current"];
    });
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "training-compliance.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SettingsLayout
      title="Training Compliance"
      subtitle="Track training and certification status for all staff across your organization."
      actions={
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-geist font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg inline-flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export Report
          </button>
          <button onClick={() => setShowAddReqModal(true)} className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90">
            <Plus className="w-3.5 h-3.5" /> Add Org Requirement
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-24 gap-2 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading training data…</span>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Staff Members", value: stats.total, icon: Users, tone: "accent" },
              { label: "Current", value: stats.current, icon: CheckCircle2, tone: "green" },
              { label: "Expiring Soon", value: stats.expiring, icon: AlertTriangle, tone: "amber" },
              { label: "Overdue", value: stats.overdue, icon: XCircle, tone: "red" },
              { label: "Never Recorded", value: stats.never, icon: XCircle, tone: "red" },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className={cn("rounded-xl border p-3",
                tone === "green" ? "bg-icm-green-soft border-icm-green/20" :
                tone === "amber" ? "bg-icm-amber-soft border-icm-amber/20" :
                tone === "red" ? "bg-icm-red-soft border-icm-red/20" :
                "bg-icm-accent-soft border-icm-accent/20")}>
                <Icon className={cn("w-4 h-4 mb-2",
                  tone === "green" ? "text-icm-green" : tone === "amber" ? "text-icm-amber" :
                  tone === "red" ? "text-icm-red" : "text-icm-accent")} />
                <p className={cn("font-manrope font-extrabold text-[22px] leading-tight",
                  tone === "green" ? "text-icm-green" : tone === "amber" ? "text-icm-amber" :
                  tone === "red" ? "text-icm-red" : "text-icm-accent")}>{value}</p>
                <p className="text-[10.5px] font-geist text-icm-text-dim">{label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search staff…"
              className="h-8 px-3 rounded-lg border border-icm-border bg-white text-[12px] font-geist w-44" />
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
              className="h-8 px-2 rounded-lg border border-icm-border bg-white text-[12px] font-geist">
              <option value="all">All Roles</option>
              <option value="case_manager">Case Manager</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
              <option value="billing">Billing</option>
            </select>
          </div>

          {/* Training matrix */}
          {requiredCols.length > 0 && (
            <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
              <div className="px-4 py-3 border-b border-icm-border bg-icm-bg/60">
                <p className="font-manrope font-bold text-[14px] text-icm-text">Staff Training Matrix</p>
                <p className="text-[11px] font-geist text-icm-text-faint mt-0.5">
                  ✓ Current &nbsp; ⚠ Expiring &nbsp; ✗ Overdue/Missing &nbsp; ○ Not required
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11.5px] font-geist">
                  <thead>
                    <tr className="border-b border-icm-border bg-icm-bg/40">
                      <th className="text-left px-4 py-2.5 font-semibold text-icm-text-dim">Staff Member</th>
                      {requiredCols.map(col => (
                        <th key={col} className="px-3 py-2.5 font-semibold text-icm-text-dim text-center max-w-[80px]">
                          <span className="block truncate max-w-[80px]" title={col}>{col.split(" ").slice(0, 2).join(" ")}</span>
                        </th>
                      ))}
                      <th className="px-3 py-2.5 font-semibold text-icm-text-dim text-center">Overall</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-icm-border">
                    {filteredStaff.map(s => {
                      const cells = requiredCols.map(col => getCell(s.id, col, s.role));
                      const hasIssue = cells.some(c => c.status === "expired" || c.status === "missing");
                      const hasExpiring = cells.some(c => c.status === "expiring_soon");
                      return (
                        <tr key={s.id} className="hover:bg-icm-bg/40">
                          <td className="px-4 py-2.5">
                            <button onClick={() => navigate(`/settings/users/${s.id}`)}
                              className="font-semibold text-icm-accent hover:underline">{staffDisplayName(s)}</button>
                            <p className="text-[10px] text-icm-text-faint capitalize">{s.role?.replace(/_/g, " ")}</p>
                          </td>
                          {cells.map((cell, i) => (
                            <td key={i} className={cn("px-3 py-2.5 text-center text-[14px]", CELL_CLASSES[cell.status])}>
                              {CELL_ICONS[cell.status]}
                            </td>
                          ))}
                          <td className={cn("px-3 py-2.5 text-center text-[11px] font-bold",
                            hasIssue ? "text-icm-red" : hasExpiring ? "text-icm-amber" : "text-icm-green")}>
                            {hasIssue ? "Needs Attention" : hasExpiring ? "Expiring" : "✓"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Urgent items */}
          {urgentItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-manrope font-bold text-[14px] text-icm-text">Needs Immediate Attention</h3>
              {urgentItems.map((item, i) => (
                <div key={i} className={cn("rounded-xl border p-4",
                  item.status === "expired" ? "border-icm-red/30 bg-icm-red-soft/30" : "border-icm-amber/30 bg-icm-amber-soft/30")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-[10.5px] font-geist font-bold px-2 py-0.5 rounded",
                          item.status === "expired" ? "bg-icm-red text-white" : "bg-icm-amber text-white")}>
                          {item.status === "expired" ? "● OVERDUE" : "⚠ EXPIRING SOON"}
                        </span>
                      </div>
                      <p className="font-geist font-bold text-[13.5px] text-icm-text">{item.trainingName}</p>
                      <p className="text-[12px] font-geist text-icm-text-dim mt-0.5">
                        {staffDisplayName(item.staffMember)} · {item.staffMember.role?.replace(/_/g, " ")} ·{" "}
                        {item.status === "expired"
                          ? `Expired: ${item.record.expirationDate}`
                          : `Expires: ${item.record.expirationDate}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => navigate(`/settings/users/${item.staffMember.id}`)}
                        className="h-7 px-2.5 rounded-lg border border-icm-border text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text inline-flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> View Profile
                      </button>
                      <button
                        onClick={() => sendReminder(item.staffMember.id, staffDisplayName(item.staffMember), item.trainingName)}
                        disabled={sendingReminder === item.staffMember.id + item.trainingName}
                        className="h-7 px-2.5 rounded-lg bg-icm-accent text-white text-[11.5px] font-geist font-semibold disabled:opacity-50 inline-flex items-center gap-1">
                        {sendingReminder === item.staffMember.id + item.trainingName
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Bell className="w-3 h-3" />}
                        Send Reminder
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {urgentItems.length === 0 && requiredCols.length === 0 && !loading && (
            <div className="rounded-xl border-2 border-dashed border-icm-border p-10 text-center">
              <GraduationCap className="w-9 h-9 text-icm-text-faint mx-auto mb-3" />
              <p className="font-manrope font-bold text-[15px] text-icm-text">No training requirements configured</p>
              <p className="text-[12.5px] text-icm-text-dim mt-1 mb-4">Add org training requirements to track compliance across your staff.</p>
              <button onClick={() => setShowAddReqModal(true)}
                className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add First Requirement
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Org Requirement Modal */}
      {showAddReqModal && (
        <AddOrgRequirementModal
          orgId={orgId}
          onClose={() => setShowAddReqModal(false)}
          onSaved={() => { setShowAddReqModal(false); loadAll(); }}
        />
      )}
    </SettingsLayout>
  );
}

// ─── Add Org Requirement Modal ────────────────────────────────────────────────

const BUILT_IN_TRAININGS = [
  "HIPAA Privacy & Security", "First Aid / CPR", "Mandatory Reporter",
  "Crisis Prevention (CPI/MANDT)", "Medication Administration", "Defensive Driving",
  "Person-Centered Planning", "Positive Behavioral Supports", "IDD Waiver Overview",
  "CaseManagement.AI Platform Training", "Background Check", "Abuse/Neglect Recognition",
];

function AddOrgRequirementModal({ orgId, onClose, onSaved }: { orgId: string; onClose: () => void; onSaved: () => void }) {
  const [trainingName, setTrainingName] = useState("");
  const [roles, setRoles] = useState<string[]>(["case_manager", "supervisor"]);
  const [dueDays, setDueDays] = useState(30);
  const [freqDays, setFreqDays] = useState<number | null>(365);
  const [saving, setSaving] = useState(false);

  const toggleRole = (r: string) => setRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);

  const handleSave = async () => {
    if (!trainingName) { toast.error("Training type is required"); return; }
    if (roles.length === 0) { toast.error("Select at least one role"); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, "org_training_requirements"), {
        organizationId: orgId,
        trainingTypeName: trainingName,
        requiredForRoles: roles,
        dueDaysAfterHire: dueDays,
        recurringFrequencyDays: freqDays,
        alertDaysBefore: [30, 14, 7],
        isActive: true,
        createdAt: serverTimestamp(),
      });
      toast.success("Org training requirement saved");
      onSaved();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-icm-border">
          <h2 className="font-manrope font-bold text-[15px] text-icm-text">Add Org Training Requirement</h2>
          <button onClick={onClose} className="text-icm-text-faint hover:text-icm-text"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim block mb-1">Training Type *</label>
            <select value={trainingName} onChange={e => setTrainingName(e.target.value)}
              className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist">
              <option value="">Select…</option>
              {BUILT_IN_TRAININGS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim block mb-1.5">Required For Roles *</label>
            <div className="flex flex-wrap gap-2">
              {[["case_manager", "Case Manager"], ["supervisor", "Supervisor"], ["admin", "Admin"], ["billing", "Billing"]].map(([val, label]) => (
                <label key={val} className="flex items-center gap-1.5 text-[12.5px] font-geist cursor-pointer">
                  <input type="checkbox" checked={roles.includes(val)} onChange={() => toggleRole(val)} className="accent-icm-accent" />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim block mb-1">Due within (days of hire)</label>
              <input type="number" value={dueDays} onChange={e => setDueDays(parseInt(e.target.value) || 30)}
                className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist" />
            </div>
            <div>
              <label className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim block mb-1">Renewal every (days)</label>
              <select value={freqDays ?? ""} onChange={e => setFreqDays(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full h-9 px-2 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist">
                <option value="">One-time</option>
                <option value="365">Annual (365d)</option>
                <option value="730">Every 2 years</option>
                <option value="1095">Every 3 years</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-icm-border text-[12px] font-geist text-icm-text-dim">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="h-9 px-4 rounded-lg bg-teal-600 text-white text-[12px] font-geist font-semibold disabled:opacity-50 inline-flex items-center gap-1.5">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Requirement
          </button>
        </div>
      </div>
    </div>
  );
}
