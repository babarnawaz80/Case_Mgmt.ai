import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Users,
  Mail,
  Phone,
  MessageSquare,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  X,
  Loader2,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual } from "@/hooks/useIndividuals";
import { toast } from "sonner";
import { writeAudit } from "@/lib/auditService";
import { useAssignedStaff, addAssignedStaff, updateAssignedStaff } from "@/hooks/useFirestore";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

function nameInitials(n: string) {
  return n
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Role =
  | "Guardian"
  | "Support Coordinator"
  | "Supervisor"
  | "Provider Contact"
  | "School / Community Contact"
  | "Behavioral Health"
  | "Natural Support"
  | "Other";

type CommPref = "Phone" | "Email" | "Text" | "Portal";

interface TeamMember {
  id: string;
  name: string;
  role: Role;
  organization?: string;
  email?: string;
  phone?: string;
  commPrefs: CommPref[];
  permissions: { read: boolean; write: boolean; sign: boolean };
  consentLimits?: string;
  visibleToGuardian: boolean;
  visibleToParticipant: boolean;
  relationship?: string;
  active: boolean;
  addedAt: string;
}

const ROLES: Role[] = [
  "Guardian",
  "Support Coordinator",
  "Supervisor",
  "Provider Contact",
  "School / Community Contact",
  "Behavioral Health",
  "Natural Support",
  "Other",
];

const COMM: CommPref[] = ["Phone", "Email", "Text", "Portal"];

const ROLE_TONE: Record<Role, string> = {
  Guardian: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
  "Support Coordinator": "bg-icm-green-soft text-icm-green ring-icm-green/20",
  Supervisor: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
  "Provider Contact": "bg-icm-bg text-icm-text ring-icm-border",
  "School / Community Contact": "bg-icm-bg text-icm-text ring-icm-border",
  "Behavioral Health": "bg-icm-red-soft text-icm-red ring-icm-red/20",
  "Natural Support": "bg-icm-bg text-icm-text ring-icm-border",
  Other: "bg-icm-bg text-icm-text-dim ring-icm-border",
};

function seedFor(personId: string): Omit<TeamMember, "id">[] {
  const now = new Date().toISOString();
  return [
    {
      name: "Margaret Thompson",
      role: "Guardian",
      relationship: "Mother / Legal Guardian",
      email: "m.thompson@example.com",
      phone: "(410) 555-0142",
      commPrefs: ["Phone", "Email"],
      permissions: { read: true, write: false, sign: true },
      consentLimits: "Full disclosure authorized for all medical and behavioral information.",
      visibleToGuardian: true,
      visibleToParticipant: true,
      active: true,
      addedAt: now,
    },
    {
      name: "Sarah Chen, LCSW",
      role: "Support Coordinator",
      organization: "Carroll County DDA",
      email: "schen@carrollcountydda.org",
      phone: "(410) 555-0188",
      commPrefs: ["Email", "Portal"],
      permissions: { read: true, write: true, sign: true },
      visibleToGuardian: true,
      visibleToParticipant: true,
      active: true,
      addedAt: now,
    },
    {
      name: "David Park",
      role: "Supervisor",
      organization: "Carroll County DDA",
      email: "dpark@carrollcountydda.org",
      commPrefs: ["Email"],
      permissions: { read: true, write: true, sign: true },
      visibleToGuardian: false,
      visibleToParticipant: false,
      active: true,
      addedAt: now,
    },
    {
      name: "Riverside Day Program",
      role: "Provider Contact",
      organization: "Riverside Community Services",
      email: "intake@riverside-cs.org",
      phone: "(410) 555-0211",
      commPrefs: ["Email", "Phone"],
      permissions: { read: true, write: false, sign: false },
      consentLimits: "ROI on file — limited to attendance, participation, and incidents only.",
      visibleToGuardian: true,
      visibleToParticipant: true,
      active: true,
      addedAt: now,
    },
    {
      name: "Dr. Aaron Patel",
      role: "Behavioral Health",
      organization: "Mid-Atlantic Behavioral Health",
      email: "apatel@mabh.org",
      phone: "(410) 555-0399",
      commPrefs: ["Phone"],
      permissions: { read: true, write: false, sign: false },
      consentLimits: "42 CFR Part 2 protected — re-disclosure prohibited without separate consent.",
      visibleToGuardian: true,
      visibleToParticipant: false,
      active: true,
      addedAt: now,
    },
    {
      name: "Aunt Linda Reyes",
      role: "Natural Support",
      relationship: "Aunt — provides weekend respite",
      phone: "(410) 555-0455",
      commPrefs: ["Phone", "Text"],
      permissions: { read: false, write: false, sign: false },
      visibleToGuardian: true,
      visibleToParticipant: true,
      active: true,
      addedAt: now,
    },
  ];
}

const PersonCareTeam = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading: individualLoading } = useIndividual(id);
  const { data: dbTeam, loading: teamLoading } = useAssignedStaff(id);
  const personLabel = individual ? `${individual.last_name}, ${individual.first_name}` : "Person";

  const [roleFilter, setRoleFilter] = useState<Role | "All">("All");
  const [showGuardianView, setShowGuardianView] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [creating, setCreating] = useState(false);

  const team = useMemo(() => {
    return (dbTeam || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      role: m.role as Role,
      organization: m.organization,
      email: m.email,
      phone: m.phone,
      commPrefs: m.commPrefs || [],
      permissions: m.permissions || { read: true, write: false, sign: false },
      consentLimits: m.consentLimits,
      visibleToGuardian: m.visibleToGuardian !== false,
      visibleToParticipant: m.visibleToParticipant !== false,
      relationship: m.relationship,
      active: m.active !== false && m.status !== "inactive",
      addedAt: m.addedAt || new Date().toISOString(),
    }));
  }, [dbTeam]);

  useEffect(() => {
    if (!teamLoading && (dbTeam || []).length === 0 && id) {
      const seeds = seedFor(id);
      seeds.forEach(async (m) => {
        try {
          await addAssignedStaff({
            individual_id: id,
            name: m.name,
            role: m.role,
            organization: m.organization || "",
            email: m.email || "",
            phone: m.phone || "",
            commPrefs: m.commPrefs,
            permissions: m.permissions,
            consentLimits: m.consentLimits || "",
            visibleToGuardian: m.visibleToGuardian,
            visibleToParticipant: m.visibleToParticipant,
            relationship: m.relationship || "",
            active: m.active,
            status: m.active ? "active" : "inactive",
            addedAt: m.addedAt,
          });
        } catch (err) {
          console.error("Error seeding team member:", err);
        }
      });
    }
  }, [dbTeam, teamLoading, id]);

  const filtered = useMemo(() => {
    let t = team;
    if (roleFilter !== "All") t = t.filter((m) => m.role === roleFilter);
    if (showGuardianView) t = t.filter((m) => m.visibleToGuardian);
    return t;
  }, [team, roleFilter, showGuardianView]);

  const counts = useMemo(() => {
    const c: Partial<Record<Role, number>> = {};
    team.forEach((m) => (c[m.role] = (c[m.role] || 0) + 1));
    return c;
  }, [team]);

  async function remove(memberId: string) {
    const m = team.find((x) => x.id === memberId);
    if (!m) return;
    if (!confirm(`Remove ${m.name} from the care team?`)) return;
    try {
      await deleteDoc(doc(db, "assigned_staff", memberId));
      await writeAudit("settings_change", "individual", id ?? "", {
        action: "care_team.remove",
        target: m.name,
        role: m.role,
      });
      toast.success(`Removed ${m.name} from care team`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove member");
    }
  }

  async function upsert(member: TeamMember, isNew: boolean) {
    try {
      if (isNew) {
        await addAssignedStaff({
          individual_id: id,
          name: member.name,
          role: member.role,
          organization: member.organization || "",
          email: member.email || "",
          phone: member.phone || "",
          commPrefs: member.commPrefs,
          permissions: member.permissions,
          consentLimits: member.consentLimits || "",
          visibleToGuardian: member.visibleToGuardian,
          visibleToParticipant: member.visibleToParticipant,
          relationship: member.relationship || "",
          active: member.active,
          status: member.active ? "active" : "inactive",
          addedAt: member.addedAt,
        });
        await writeAudit("settings_change", "individual", id ?? "", {
          action: "care_team.add",
          target: member.name,
          role: member.role,
        });
        toast.success(`Added ${member.name} to care team`);
      } else {
        await updateAssignedStaff(member.id, {
          name: member.name,
          role: member.role,
          organization: member.organization || "",
          email: member.email || "",
          phone: member.phone || "",
          commPrefs: member.commPrefs,
          permissions: member.permissions,
          consentLimits: member.consentLimits || "",
          visibleToGuardian: member.visibleToGuardian,
          visibleToParticipant: member.visibleToParticipant,
          relationship: member.relationship || "",
          active: member.active,
          status: member.active ? "active" : "inactive",
        });
        await writeAudit("settings_change", "individual", id ?? "", {
          action: "care_team.update",
          target: member.name,
          role: member.role,
        });
        toast.success(`Updated ${member.name}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes");
    }
  }

  const loading = individualLoading || teamLoading;

  if (loading) {
    return (
      <ICMShell title="Care Team" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  return (
    <ICMShell title="Care Team" showAIPanel={false}>
      <div className="space-y-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[11.5px] font-geist text-icm-text-dim">
          <button onClick={() => navigate("/people")} className="hover:text-icm-text">
            People
          </button>
          <span className="text-icm-text-faint">›</span>
          {individual && (
            <>
              <button
                onClick={() => navigate(`/people/${individual.id}/echart`)}
                className="hover:text-icm-text"
              >
                {personLabel}
              </button>
              <span className="text-icm-text-faint">›</span>
            </>
          )}
          <span className="text-icm-text font-medium">Care Team</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-icm-text-dim" />
              <h1 className="text-lg font-medium text-icm-text">Care Team</h1>
              <span className="text-[11px] text-icm-text-dim">
                {team.filter((m) => m.active).length} active members
              </span>
            </div>
            <p className="text-[12px] text-icm-text-dim mt-1">
              Roles, permissions, communication preferences, and consent boundaries for everyone
              supporting {individual?.first_name ?? "this individual"}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuardianView((v) => !v)}
              className={`inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1.5 rounded-md ring-1 ${
                showGuardianView
                  ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20"
                  : "bg-icm-panel text-icm-text-dim ring-icm-border hover:text-icm-text"
              }`}
              title="Preview what guardian/participant sees in the portal"
            >
              {showGuardianView ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              Guardian portal view
            </button>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md bg-icm-accent text-white hover:bg-icm-accent/90"
            >
              <Plus className="w-3.5 h-3.5" /> Add team member
            </button>
          </div>
        </div>

        {/* Role chip row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setRoleFilter("All")}
            className={`text-[11px] px-2 py-1 rounded-md ring-1 ${
              roleFilter === "All"
                ? "bg-icm-text text-white ring-icm-text"
                : "bg-icm-panel text-icm-text-dim ring-icm-border hover:text-icm-text"
            }`}
          >
            All ({team.length})
          </button>
          {ROLES.map((r) =>
            counts[r] ? (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`text-[11px] px-2 py-1 rounded-md ring-1 ${
                  roleFilter === r
                    ? "bg-icm-text text-white ring-icm-text"
                    : `${ROLE_TONE[r]} hover:opacity-80`
                }`}
              >
                {r} ({counts[r]})
              </button>
            ) : null,
          )}
        </div>

        {/* Members list */}
        <div className="space-y-2.5">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-icm-border bg-icm-panel p-4 hover:border-icm-border-strong transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-icm-bg ring-1 ring-icm-border flex items-center justify-center text-[11.5px] font-medium text-icm-text-dim shrink-0">
                  {nameInitials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13.5px] font-medium text-icm-text">{m.name}</span>
                    <span
                      className={`text-[10.5px] px-1.5 py-0.5 rounded ring-1 ${ROLE_TONE[m.role]}`}
                    >
                      {m.role}
                    </span>
                    {!m.active && (
                      <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-icm-bg text-icm-text-dim ring-1 ring-icm-border">
                        Inactive
                      </span>
                    )}
                    {m.visibleToGuardian ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10.5px] text-icm-text-dim"
                        title="Visible in guardian portal"
                      >
                        <Eye className="w-3 h-3" /> Guardian
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[10.5px] text-icm-text-faint"
                        title="Internal only"
                      >
                        <EyeOff className="w-3 h-3" /> Internal
                      </span>
                    )}
                  </div>
                  {(m.organization || m.relationship) && (
                    <div className="text-[11.5px] text-icm-text-dim mt-0.5">
                      {m.organization || m.relationship}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-icm-text-dim">
                    {m.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {m.email}
                      </span>
                    )}
                    {m.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {m.phone}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      Prefers: {m.commPrefs.join(", ") || "—"}
                    </span>
                  </div>

                  {/* Permissions */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <PermBadge label="Read" on={m.permissions.read} />
                    <PermBadge label="Write" on={m.permissions.write} />
                    <PermBadge label="Sign" on={m.permissions.sign} />
                  </div>

                  {/* Consent limits */}
                  {m.consentLimits && (
                    <div className="mt-2 rounded-md bg-icm-amber-soft/40 border border-icm-amber/20 px-2.5 py-1.5">
                      <div className="flex items-start gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-icm-amber shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10.5px] uppercase tracking-wide text-icm-amber font-medium">
                            Consent limitation
                          </div>
                          <div className="text-[11.5px] text-icm-text mt-0.5">
                            {m.consentLimits}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditing(m)}
                    className="p-1.5 rounded hover:bg-icm-bg text-icm-text-dim hover:text-icm-text"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => remove(m.id)}
                    className="p-1.5 rounded hover:bg-icm-red-soft text-icm-text-dim hover:text-icm-red"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel py-10 text-center text-[12px] text-icm-text-dim">
              No team members match this filter.
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="rounded-lg border border-icm-border bg-icm-panel p-3 flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 text-icm-text-dim mt-0.5 shrink-0" />
          <div className="text-[11px] text-icm-text-dim leading-relaxed">
            Permissions and visibility are enforced by the iCM access layer. Guardian-portal
            visibility is filtered by both the per-member toggle and active consent / ROI on file.
            All add, edit, and removal actions are recorded in the person&apos;s audit log.
          </div>
        </div>
      </div>

      {(creating || editing) && (
        <MemberDialog
          member={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={(m, isNew) => {
            upsert(m, isNew);
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </ICMShell>
  );
};

function PermBadge({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded ring-1 ${
        on
          ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
          : "bg-icm-bg text-icm-text-faint ring-icm-border"
      }`}
    >
      {on ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
      {label}
    </span>
  );
}

function MemberDialog({
  member,
  onClose,
  onSave,
}: {
  member: TeamMember | null;
  onClose: () => void;
  onSave: (m: TeamMember, isNew: boolean) => void;
}) {
  const isNew = !member;
  const [draft, setDraft] = useState<TeamMember>(
    member ?? {
      id: crypto.randomUUID(),
      name: "",
      role: "Provider Contact",
      organization: "",
      email: "",
      phone: "",
      commPrefs: ["Email"],
      permissions: { read: true, write: false, sign: false },
      consentLimits: "",
      visibleToGuardian: true,
      visibleToParticipant: true,
      relationship: "",
      active: true,
      addedAt: new Date().toISOString(),
    },
  );

  function toggleComm(c: CommPref) {
    setDraft((d) => ({
      ...d,
      commPrefs: d.commPrefs.includes(c)
        ? d.commPrefs.filter((x) => x !== c)
        : [...d.commPrefs, c],
    }));
  }

  function save() {
    if (!draft.name.trim()) {
      alert("Name is required.");
      return;
    }
    onSave(draft, isNew);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-icm-border">
          <h2 className="text-[13.5px] font-medium text-icm-text">
            {isNew ? "Add team member" : "Edit team member"}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-icm-bg text-icm-text-dim">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Name">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <select
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}
                className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
              >
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Organization / Relationship">
              <input
                value={draft.organization || draft.relationship || ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    organization: e.target.value,
                    relationship: e.target.value,
                  })
                }
                className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input
                value={draft.email ?? ""}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
              />
            </Field>
            <Field label="Phone">
              <input
                value={draft.phone ?? ""}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
              />
            </Field>
          </div>
          <Field label="Communication preferences">
            <div className="flex flex-wrap gap-1.5">
              {COMM.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleComm(c)}
                  className={`text-[11px] px-2 py-1 rounded-md ring-1 ${
                    draft.commPrefs.includes(c)
                      ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20"
                      : "bg-white text-icm-text-dim ring-icm-border hover:text-icm-text"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Permissions">
            <div className="flex flex-wrap gap-3">
              {(["read", "write", "sign"] as const).map((p) => (
                <label key={p} className="flex items-center gap-1.5 text-[12px] text-icm-text">
                  <input
                    type="checkbox"
                    checked={draft.permissions[p]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        permissions: { ...draft.permissions, [p]: e.target.checked },
                      })
                    }
                  />
                  <span className="capitalize">{p}</span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Consent limitations / ROI notes (optional)">
            <textarea
              rows={2}
              value={draft.consentLimits ?? ""}
              onChange={(e) => setDraft({ ...draft, consentLimits: e.target.value })}
              placeholder="e.g. ROI limited to attendance/incidents; 42 CFR Part 2 protected; etc."
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-md border border-icm-border bg-white"
            />
          </Field>
          <Field label="Portal visibility">
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-1.5 text-[12px] text-icm-text">
                <input
                  type="checkbox"
                  checked={draft.visibleToGuardian}
                  onChange={(e) => setDraft({ ...draft, visibleToGuardian: e.target.checked })}
                />
                Visible to guardian
              </label>
              <label className="flex items-center gap-1.5 text-[12px] text-icm-text">
                <input
                  type="checkbox"
                  checked={draft.visibleToParticipant}
                  onChange={(e) => setDraft({ ...draft, visibleToParticipant: e.target.checked })}
                />
                Visible to participant
              </label>
              <label className="flex items-center gap-1.5 text-[12px] text-icm-text">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                />
                Active
              </label>
            </div>
          </Field>
        </div>
        <div className="px-5 py-3 border-t border-icm-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="text-[12px] px-3 py-1.5 rounded-md text-icm-text-dim hover:text-icm-text"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="text-[12px] px-3 py-1.5 rounded-md bg-icm-accent text-white hover:bg-icm-accent/90"
          >
            {isNew ? "Add member" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wide text-icm-text-dim font-medium mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

export default PersonCareTeam;
