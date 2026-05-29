import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Sparkles,
  ChevronLeft,
  ChevronDown,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Star,
  AlertTriangle,
  CheckCircle2,
  Settings2,
  FileText,
  Upload,
  Search,
  X,
  Sparkle,
  ArrowRight,
  Phone as PhoneIcon,
  Mail,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  Send,
  type LucideIcon,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";

import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { useIndividual, updateIndividual, initials, riskAvatarClass, riskScoreClass, calcAge, type Individual } from "@/hooks/useIndividuals";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { PersonAvatar } from "@/components/icm/PersonAvatar";
import { demoToast } from "@/lib/demoToast";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

import { getProfile, tabCompleteness, overallCompleteness, type TabKey, type ProfileData, LIVING_SITUATION_OPTIONS } from "@/data/profiles";
import { useServiceAuthorizations } from "@/hooks/useFirestore";
import { calculateRiskScore } from "@/lib/riskEngine";
import { getRiskLabel } from "@/lib/formatDate";

const TABS: { key: TabKey; label: string }[] = [
  { key: "basic", label: "Basic Info" },
  { key: "medical", label: "Medical Info" },
  { key: "monitors", label: "Monitors & Baselines" },
  { key: "court", label: "Court Involvement" },
  { key: "program", label: "Program" },
  { key: "contacts", label: "Contacts" },
  { key: "documents", label: "Documents" },
  { key: "administrative", label: "Administrative" },
];

const PersonProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { individual: person, loading } = useIndividual(id);
  const profile = useMemo(() => (person ? getProfile(person.id) : null), [person]);

  const initialTab = (params.get("tab") as TabKey) ?? "basic";
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [showSsn, setShowSsn] = useState(false);
  const [briefDismissed, setBriefDismissed] = useState(false);
  const [echartOpen, setEchartOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<"active" | "transition" | "discharged" | "pending" | null>(null);

  const getStatusStyles = (status?: string) => {
    const s = (status ?? "active").toLowerCase();
    if (s === "active") {
      return {
        dot: "bg-icm-green",
        badge: "bg-icm-green-soft text-icm-green ring-icm-green/20",
      };
    }
    if (s === "transition") {
      return {
        dot: "bg-icm-amber",
        badge: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
      };
    }
    if (s === "discharged") {
      return {
        dot: "bg-icm-red",
        badge: "bg-icm-red-soft text-icm-red ring-icm-red/20",
      };
    }
    return {
      dot: "bg-icm-accent",
      badge: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    };
  };

  const handleStatusChange = async (
    newStatus: "active" | "transition" | "discharged" | "pending",
    extra?: { reason: string; effectiveDate: string; notes: string; notified: string[] }
  ) => {
    if (!person) return;
    try {
      const friendlyStatus =
        newStatus === "active" ? "Active" :
        newStatus === "transition" ? "Transition" :
        newStatus === "discharged" ? "Discharged" : "Pending";
      await updateIndividual(person.id, {
        enrollment_status: newStatus,
        status: friendlyStatus,
        ...(extra ? {
          status_change_reason: extra.reason,
          status_change_date: extra.effectiveDate,
          status_change_notes: extra.notes,
          status_notified: extra.notified,
          status_changed_at: new Date().toISOString(),
        } : {}),
      });
      // Log to audit trail in Firestore
      if (extra) {
        await addDoc(collection(db, "status_change_log"), {
          individualId: person.id,
          individualName: `${person.first_name} ${person.last_name}`,
          newStatus: friendlyStatus,
          reason: extra.reason,
          effectiveDate: extra.effectiveDate,
          notes: extra.notes,
          notified: extra.notified,
          changedAt: serverTimestamp(),
        });
      }
      toast.success(`Status updated to ${friendlyStatus}`);
      setStatusOpen(false);
      setPendingStatus(null);
    } catch (err: any) {
      toast.error(`Failed to update status: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <ICMShell title="Profile" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!person || !profile) {
    return (
      <ICMShell title="Profile" showAIPanel={false}>
        <div className="rounded-xl border border-icm-border bg-icm-panel p-12 text-center">
          <p className="text-[14px] text-icm-text-dim font-geist">Person not found.</p>
          <button
            onClick={() => navigate("/people")}
            className="mt-4 text-[12px] font-geist font-semibold text-icm-accent hover:underline"
          >
            ← Back to People
          </button>
        </div>
      </ICMShell>
    );
  }

  const tabs = tabCompleteness(profile, person.first_name, person.last_name, person.dob);
  const overall = overallCompleteness(tabs);
  const tabMap = Object.fromEntries(tabs.map((t) => [t.tab, t]));

  function setTabAndUrl(t: TabKey) {
    setTab(t);
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set("tab", t);
      return next;
    });
  }

  return (
    <ICMShell title="Profile" rightPanel={<ProfileAIPanel pct={overall.pct} />}>
      <div className="space-y-5">
        <Breadcrumbs
          backTo={`/people/${person.id}/echart`}
          backLabel="eChart"
          items={[
            { label: "People Supported", to: "/people" },
            { label: `${person.first_name} ${person.last_name}`, to: `/people/${person.id}/echart` },
            { label: "Profile", to: `/people/${person.id}/profile` },
            { label: TABS.find((t) => t.key === tab)?.label ?? "" },
          ]}
        />

        {/* Sticky header */}
        <div className="sticky top-0 z-20 -mx-6 px-6 pt-1 pb-3 bg-icm-bg/95 backdrop-blur-sm">
          <div className="rounded-xl border border-icm-border bg-icm-panel p-5">
            <div className="flex items-start gap-4 flex-wrap">
              <PersonAvatar person={person as any} size={64} shape="square" className="text-[18px]" editable individualId={person.id} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-manrope font-extrabold text-[22px] text-icm-text tracking-tight leading-tight">
                    {person.last_name}, {person.first_name}
                    {person.preferred_name && (
                      <span className="font-medium text-icm-text-dim"> ({person.preferred_name})</span>
                    )}
                  </h1>
                  {person.risk_score !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ring-1 ring-current/20 ${riskScoreClass(person.risk_score)}`}
                      aria-label={`Risk score ${person.risk_score} — ${getRiskLabel(person.risk_score)}`}
                    >
                      RISK {person.risk_score} · {getRiskLabel(person.risk_score)}
                    </span>
                  )}
                </div>
                <p className="text-[12px] font-mono text-icm-text-dim mt-1">
                  {person.gender} · {calcAge(person.dob) != null ? `${calcAge(person.dob)}y` : "Age unknown"} · {person.dob} · {person.county} · ID #{person.id}
                </p>
                {/* Authorization compliance summary — one minimal line */}
                <AuthComplianceLine individualId={person.id} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <InlineField label="Allergies" value={person.allergies ?? "None recorded"} />
                  <InlineField
                    label="Special Instructions"
                    value={person.specialInstructions ?? "—"}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap relative">
                <div className="relative">
                  <button
                    onClick={() => setStatusOpen((s) => !s)}
                    className={`h-9 px-3 rounded-xl text-[12px] font-geist font-medium flex items-center gap-1.5 ring-1 ${getStatusStyles(person.status).badge} hover:brightness-95`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusStyles(person.status).dot}`} />
                    {person.status ?? "Active"}
                    <ChevronDown className="w-3 h-3 opacity-70" />
                  </button>
                  {statusOpen && (
                    <div className="absolute left-0 top-10 z-30 w-[150px] rounded-xl border border-icm-border bg-icm-panel shadow-elevated overflow-hidden">
                      <DropdownItem
                        label="Active"
                        onClick={() => { setStatusOpen(false); setPendingStatus("active"); }}
                      />
                      <DropdownItem
                        label="Pending"
                        onClick={() => { setStatusOpen(false); setPendingStatus("pending"); }}
                      />
                      <DropdownItem
                        label="Transition"
                        onClick={() => { setStatusOpen(false); setPendingStatus("transition"); }}
                      />
                      <DropdownItem
                        label="Discharged"
                        onClick={() => { setStatusOpen(false); setPendingStatus("discharged"); }}
                      />
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setEchartOpen((s) => !s)}
                    className="h-9 px-3 rounded-xl text-[12px] font-geist font-medium flex items-center gap-1.5 border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong"
                  >
                    eChart
                    <ChevronDown className="w-3 h-3 opacity-70" />
                  </button>
                  {echartOpen && (
                    <div className="absolute right-0 top-10 z-30 w-[200px] rounded-xl border border-icm-border bg-icm-panel shadow-elevated overflow-hidden">
                      <DropdownItem
                        label="View Profile"
                        onClick={() => {
                          setEchartOpen(false);
                        }}
                        active
                      />
                      <DropdownItem
                        label="Face Sheet"
                        onClick={() => navigate(`/people/${person.id}/facesheet`)}
                      />
                      <DropdownItem
                        label="Manage Programs"
                        onClick={() => {
                          setTabAndUrl("program");
                          setEchartOpen(false);
                        }}
                      />
                      <div className="border-t border-icm-border" />
                      <DropdownItem
                        label="Open eChart"
                        onClick={() => navigate(`/people/${person.id}/echart`)}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setTabAndUrl("program")}
                  className="h-9 px-3 rounded-xl text-[12px] font-geist font-medium flex items-center gap-1.5 border border-icm-border bg-icm-panel text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong"
                >
                  Manage Programs
                  <Settings2 className="w-3 h-3 opacity-70" />
                </button>
              </div>
            </div>

            {/* Completeness ribbon */}
            {!briefDismissed && overall.pct < 100 && (
              <div className="mt-4 rounded-xl bg-icm-accent-soft border border-icm-accent/20 px-3.5 py-2.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[12.5px] font-geist text-icm-text leading-snug">
                      <span className="font-semibold">
                        {person.first_name}'s profile is {overall.pct}% complete.
                      </span>{" "}
                      <span className="text-icm-text-dim">
                        {overall.missing.length > 0 &&
                          `Missing: ${overall.missing.slice(0, 3).join(", ")}${overall.missing.length > 3 ? `, +${overall.missing.length - 3} more` : ""}.`}
                      </span>
                    </p>
                    <button
                      onClick={() => {
                        const firstIncomplete = tabs.find((t) => t.missing.length > 0);
                        if (firstIncomplete) setTabAndUrl(firstIncomplete.tab);
                      }}
                      className="text-[11.5px] font-geist font-semibold text-icm-accent hover:underline mt-0.5 flex items-center gap-1"
                    >
                      Complete profile <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setBriefDismissed(true)}
                  className="text-icm-text-faint hover:text-icm-text"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className="mt-4 flex items-center gap-0.5 border-b border-icm-border overflow-x-auto -mb-3 -mx-1 px-1" role="tablist" aria-label="Profile sections">
              {TABS.map((t) => {
                const tc = tabMap[t.key];
                const incomplete = tc && tc.missing.length > 0;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={active}
                    tabIndex={active ? 0 : -1}
                    aria-controls={`profile-tabpanel-${t.key}`}
                    id={`profile-tab-${t.key}`}
                    onClick={() => setTabAndUrl(t.key)}
                    className={cn(
                      "px-3 py-2 text-[12.5px] font-geist border-b-2 -mb-px flex items-center gap-1.5 whitespace-nowrap",
                      active
                        ? "border-icm-accent text-icm-text font-semibold"
                        : "border-transparent text-icm-text-dim hover:text-icm-text",
                    )}
                  >
                    {t.label}
                    {incomplete && (
                      <span
                        title="This section has missing required information"
                        aria-label="(has missing information)"
                        className="w-1.5 h-1.5 rounded-full bg-icm-amber"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab content */}
        {tab === "basic" && (
            <BasicInfoTab person={person} profile={profile} showSsn={showSsn} setShowSsn={setShowSsn} personId={person.id} />
        )}
        {tab === "medical" && <MedicalInfoTab profile={profile} person={person} />}
        {tab === "monitors" && <MonitorsTab profile={profile} />}
        {tab === "court" && <CourtTab profile={profile} />}
        {tab === "program" && <ProgramTab profile={profile} />}
        {tab === "contacts" && <ContactsTab profile={profile} person={person} />}
        {tab === "documents" && <DocumentsTab profile={profile} />}
        {tab === "administrative" && <AdminTab profile={profile} person={person} />}

        {/* Per-tab completeness footer */}
        {tabMap[tab] && (
          <CompletenessFooter
            tc={tabMap[tab]}
            onJump={(_label) => {
              /* placeholder — would scroll to first incomplete field */
            }}
          />
        )}
      </div>
      {pendingStatus && person && (
        <StatusChangeModal
          personName={`${person.first_name} ${person.last_name}`}
          newStatus={pendingStatus}
          onConfirm={(extra) => handleStatusChange(pendingStatus, extra)}
          onClose={() => setPendingStatus(null)}
        />
      )}
    </ICMShell>
  );
};

// =============================================================
// AUTH COMPLIANCE LINE — shown in profile sticky header
// =============================================================
function AuthComplianceLine({ individualId }: { individualId: string }) {
  const navigate = useNavigate();
  const { data: auths } = useServiceAuthorizations(individualId);

  if (auths.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  function daysLeft(d: string) {
    return Math.ceil((new Date(d + "T00:00:00").getTime() - today.getTime()) / 86400000);
  }

  const active = auths.filter((a) => a.status === "active" || a.status === "pending");
  const critical = active.filter((a) => daysLeft(a.end_date) <= 7);
  const expiringSoon = active.filter((a) => { const d = daysLeft(a.end_date); return d > 7 && d <= 30; });

  return (
    <button
      onClick={() => navigate(`/people/${individualId}/authorizations`)}
      className="flex items-center gap-2 mt-1 text-[11.5px] font-geist hover:underline"
    >
      <span className="text-icm-text-dim">
        Authorizations: <span className="text-icm-text font-semibold">{active.length} active</span>
      </span>
      {expiringSoon.length > 0 && (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-icm-amber-soft text-icm-amber ring-1 ring-icm-amber/20">
          {expiringSoon.length} expiring
        </span>
      )}
      {critical.length > 0 && (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-icm-red-soft text-icm-red ring-1 ring-icm-red/20">
          {critical.length} critical
        </span>
      )}
    </button>
  );
}

// =============================================================
// TAB 1 — Basic Info
// =============================================================
const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Transgender", "Prefer not to say", "Other"];
const RACE_OPTIONS = [
  "American Indian or Alaska Native", "Asian", "Black or African American",
  "Hispanic or Latino", "Native Hawaiian or Other Pacific Islander",
  "White", "Two or more races", "Prefer not to say",
];
const LANGUAGE_OPTIONS = ["English", "Spanish", "French", "Mandarin", "Arabic", "ASL", "Other"];
const REFERRAL_OPTIONS = ["Self-referral", "Family", "Hospital", "Court", "School", "State agency", "Other"];
const CONTACT_PREF_OPTIONS = ["Phone", "Email", "Text", "Mail"];
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA",
  "ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
  "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

function BasicInfoTab({
  person,
  profile,
  showSsn,
  setShowSsn,
  personId,
}: {
  person: Individual;
  profile: ProfileData;
  showSsn: boolean;
  setShowSsn: (v: boolean) => void;
  personId: string;
}) {
  const [localLS, setLocalLS] = useState(profile.livingSituation ?? "");
  const unstable = localLS === "Homeless" || localLS === "Other";

  const handleLivingSituationChange = (newVal: string) => {
    const oldLS = profile.livingSituation ?? "";
    setLocalLS(newVal);
    // Mutate the singleton so risk engine picks it up immediately
    profile.livingSituation = newVal;

    // Recalculate risk and show toast if level changed
    try {
      const before = calculateRiskScore(personId);
      profile.livingSituation = newVal;
      const after = calculateRiskScore(personId);
      if (before.level !== after.level || before.total !== after.total) {
        toast.success(
          `Risk score updated to ${after.total} (${after.level}) based on living situation change.`,
          { duration: 4500 }
        );
      }
    } catch {
      // silent — risk engine is non-blocking
    }
    if (oldLS !== newVal) {
      // Log to profile change history
      const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
      profile.changeHistory = [
        { date: today, user: "Case Manager", field: "Living Situation", oldValue: oldLS || "—", newValue: newVal },
        ...profile.changeHistory,
      ];
    }
  };

  return (
    <div className="space-y-4">
      <Section title="Personal Information" onSave={async (data) => {
        await updateIndividual(personId, {
          ...(data.first_name && { first_name: data.first_name }),
          ...(data.last_name && { last_name: data.last_name }),
          preferred_name: data.preferred_name ?? "",
          ...(data.dob && { dob: data.dob }),
          ...(data.gender && { gender: data.gender }),
        });
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="First Name" name="first_name" defaultValue={person.first_name} required />
          <EditableField label="Middle Name" name="middle_name" defaultValue={profile.middleName ?? ""} />
          <EditableField label="Last Name" name="last_name" defaultValue={person.last_name} required />
          <EditableField label="Preferred Name / Also Known As" name="preferred_name" defaultValue={profile.preferredName ?? person.preferred_name ?? ""} />
          <EditableField label="Date of Birth" name="dob" defaultValue={person.dob ?? ""} required hint={`Age: ${calcAge(person.dob)}y`} />
          <EditableSelect label="Gender" name="gender" defaultValue={person.gender === "M" ? "Male" : person.gender ?? "Female"} options={GENDER_OPTIONS} />
          <EditableField label="Pronouns" name="pronouns" defaultValue={profile.pronouns ?? ""} />
          <EditableSelect label="Primary Language" name="primary_language" defaultValue={profile.primaryLanguage} options={LANGUAGE_OPTIONS} required />
          <EditableSelect label="Secondary Language" name="secondary_language" defaultValue={profile.secondaryLanguage ?? ""} options={["—", ...LANGUAGE_OPTIONS]} />
          <div className="md:col-span-2">
            <EditableField label="Communication Needs" name="communication_needs" defaultValue={profile.communicationNeeds ?? ""} multiline />
          </div>
          <EditableField label="Marital Status" name="marital_status" defaultValue={person.marital_status ?? ""} />
          <EditableField label="Religion" name="religion" defaultValue={person.religion ?? ""} />
          <div className="md:col-span-2">
            <EditableField label="Communication Notes" name="communication_notes" defaultValue={person.communication_notes ?? ""} multiline />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10.5px] uppercase tracking-wider text-icm-text-faint font-geist block mb-1">Race / Ethnicity</label>
            <div className="flex flex-wrap gap-1.5">
              {RACE_OPTIONS.map((opt) => {
                const selected = (profile.raceEthnicity ?? []).includes(opt);
                return (
                  <span key={opt} className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-geist border cursor-default",
                    selected ? "bg-icm-accent-soft text-icm-accent border-icm-accent/30" : "border-icm-border text-icm-text-dim"
                  )}>{opt}</span>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Address & Location" onSave={async (data) => {
        const parts = [data.street, data.city, data.state, data.zip].filter(Boolean);
        await updateIndividual(personId, {
          address: parts.join(", ") || undefined,
          ...(data.county && { county: data.county }),
        });
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <div className="md:col-span-2">
            <EditableField label="Street Address" name="street" defaultValue={profile.street ?? ""} />
          </div>
          <EditableField label="City" name="city" defaultValue={profile.city ?? ""} />
          <EditableSelect label="State" name="state" defaultValue={profile.state ?? ""} options={US_STATES} />
          <EditableField label="ZIP Code" name="zip" defaultValue={profile.zip ?? ""} />
          <EditableField label="County" name="county" defaultValue={person.county ?? ""} required hint="Drives program assignment" />
          {/* Living Situation — connected field */}
          <div className="md:col-span-2">
            <label className="text-[10.5px] uppercase tracking-wider text-icm-text-faint font-geist block mb-1">
              Living Situation <span className="text-icm-red">*</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                className="modal-input max-w-xs"
                value={localLS}
                onChange={(e) => handleLivingSituationChange(e.target.value)}
              >
                <option value="">— Select —</option>
                {LIVING_SITUATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {unstable && (
                <span
                  title="This living situation may affect the individual's risk score"
                  className="flex items-center gap-1 text-[11px] font-geist text-icm-amber"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  May affect risk score
                </span>
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Identification" onSave={async (data) => {
        await updateIndividual(personId, {
          ...(data.medicaid_id && { medicaid_id: data.medicaid_id }),
          ...(data.ltss_id !== undefined && { ltss_id: data.ltss_id }),
        });
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10.5px] uppercase tracking-wider text-icm-text-faint font-geist block mb-1">SSN</label>
              <div className="flex items-center gap-2">
                <input
                  className="modal-input w-40 font-mono"
                  type={showSsn ? "text" : "password"}
                  defaultValue={profile.ssn ?? "XXX-XX-XXXX"}
                  readOnly
                />
                <button onClick={() => setShowSsn(!showSsn)} className="text-icm-text-faint hover:text-icm-text">
                  {showSsn ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
          <EditableField label="Medicaid ID / MA Number" name="medicaid_id" defaultValue={person.medicaid_id ?? profile.medicaidId ?? ""} required />
          <EditableField label="Medicare ID" name="medicare_id" defaultValue={profile.medicareId ?? ""} />
          <EditableField label="State ID / Client ID" name="state_id" defaultValue={profile.stateId ?? ""} />
          <EditableField label="LTSS ID" name="ltss_id" defaultValue={person.ltss_id ?? profile.ltssId ?? ""} />
          <EditableField label="Date of Admission" name="admitted_on" defaultValue={person.admittedOn ?? ""} required />
          <EditableSelect label="Referral Source" name="referral_source" defaultValue={profile.referralSource ?? ""} options={["", ...REFERRAL_OPTIONS]} />
        </div>
      </Section>

      <Section title="Contact" onSave={async (data) => {
        await updateIndividual(personId, {
          ...(data.primary_phone && { phone: data.primary_phone }),
          ...(data.email && { email: data.email }),
        });
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="Primary Phone" name="primary_phone" defaultValue={person.phone ?? profile.primaryPhone ?? ""} required />
          <EditableField label="Secondary Phone" name="secondary_phone" defaultValue={profile.secondaryPhone ?? ""} />
          <EditableField label="Home Phone" name="phone_home" defaultValue={person.phone_home ?? ""} />
          <EditableField label="Cell Phone" name="phone_cell" defaultValue={person.phone_cell ?? ""} />
          <EditableField label="Email Address" name="email" defaultValue={person.email ?? profile.email ?? ""} />
          <EditableSelect label="Preferred Contact Method" name="preferred_contact" defaultValue={profile.preferredContact ?? ""} options={["", ...CONTACT_PREF_OPTIONS]} />
        </div>
      </Section>
    </div>
  );
}

// Small reusable editable field (reads disabled state from parent fieldset)
function EditableField({
  label, defaultValue, required, hint, multiline, name,
}: { label: string; defaultValue: string; required?: boolean; hint?: string; multiline?: boolean; name?: string }) {
  return (
    <div>
      <label className="text-[10.5px] uppercase tracking-wider text-icm-text-faint font-geist block mb-1">
        {label}{required && <span className="text-icm-red ml-0.5">*</span>}
        {hint && <span className="ml-1.5 normal-case text-[10px] text-icm-text-faint">({hint})</span>}
      </label>
      {multiline ? (
        <textarea className="modal-input min-h-[60px] py-1.5 px-2" name={name} defaultValue={defaultValue} />
      ) : (
        <input className="modal-input" name={name} defaultValue={defaultValue} />
      )}
    </div>
  );
}

function EditableSelect({
  label, defaultValue, options, required, name,
}: { label: string; defaultValue: string; options: string[]; required?: boolean; name?: string }) {
  return (
    <div>
      <label className="text-[10.5px] uppercase tracking-wider text-icm-text-faint font-geist block mb-1">
        {label}{required && <span className="text-icm-red ml-0.5">*</span>}
      </label>
      <select className="modal-input" name={name} defaultValue={defaultValue}>
        {options.map((opt) => <option key={opt} value={opt}>{opt || "— Select —"}</option>)}
      </select>
    </div>
  );
}

// =============================================================
// TAB 2 — Medical Info
// =============================================================
function MedicalInfoTab({ profile, person }: { profile: ProfileData; person: Individual }) {
  return (
    <div className="space-y-4">
      <Section title="Diagnoses">
        <DataTable
          columns={["Code", "Description", "Type", "Added", "By"]}
          rows={profile.diagnoses.map((d) => [
            <span key="c" className="font-mono text-icm-text">{d.code}</span>,
            d.description,
            d.primary ? (
              <span className="px-1.5 py-0.5 rounded bg-icm-accent-soft text-icm-accent text-[10px] font-mono font-semibold">Primary</span>
            ) : (
              <span className="text-icm-text-dim text-[11px]">Secondary</span>
            ),
            d.addedOn,
            d.addedBy,
          ])}
          emptyText="No diagnoses recorded. Primary diagnosis is required for Care Plan."
          addLabel="Add diagnosis"
        />
      </Section>

      <Section title="Medications">
        <DataTable
          columns={["Name", "Dosage", "Frequency", "Prescriber", "Start", "Status"]}
          rows={profile.medications.map((m) => [
            <span key="n" className="font-semibold">{m.name}</span>,
            m.dosage,
            m.frequency,
            m.prescriber,
            m.startDate,
            <MedStatusBadge key="s" status={m.status} />,
          ])}
          emptyText="No medications recorded."
          addLabel="Add medication"
        />
        <p className="text-[11px] text-icm-text-faint mt-2 font-geist">
          Medication records here are reference only. Administration is managed in the eMAR module.
        </p>
      </Section>

      <Section title="Allergies">
        <DataTable
          columns={["Allergen", "Reaction", "Severity", "Identified"]}
          rows={profile.allergies.map((a) => [
            <span key="a" className="font-semibold">{a.allergen}</span>,
            a.reaction,
            <SeverityBadge key="s" severity={a.severity} />,
            a.identifiedOn,
          ])}
          emptyText="No allergies recorded."
          addLabel="Add allergy"
        />
      </Section>

      <Section title="Health Screenings">
        <div className="rounded-lg border border-icm-border bg-icm-bg p-3 space-y-2">
          <div className="flex items-end gap-3 flex-wrap">
            <Field label="HRST / Risk Screening Score">
              <input
                defaultValue={profile.hrstScore ?? ""}
                className="modal-input w-24"
                placeholder="—"
              />
            </Field>
            <Field label="Score date">
              <input defaultValue={profile.hrstScoredOn ?? ""} className="modal-input w-32" />
            </Field>
            <Field label="Source">
              <select className="modal-input w-44" defaultValue={profile.hrstSource ?? "Manual entry"}>
                <option>Manual entry</option>
                <option>From Intellectability</option>
                <option>From HRST</option>
              </select>
            </Field>
          </div>
          {(profile.hrstScore ?? 0) >= 3 && (
            <div className="rounded-lg border border-icm-amber/30 bg-icm-amber-soft p-2.5 text-[11.5px] font-geist text-icm-text flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-icm-amber" />
              Score of {profile.hrstScore} requires nursing review per state guidelines. AI created a follow-up task.
            </div>
          )}
          <p className="text-[11px] italic text-icm-text-faint">
            Integration with Intellectability coming soon — scores will auto-populate from the linked assessment.
          </p>
        </div>
      </Section>

      <Section title="Healthcare Providers">
        <DataTable
          columns={["Provider", "Specialty", "Phone", "Last Visit", "Next Appt"]}
          rows={profile.providers.map((p) => [
            <span key="n" className="font-semibold">{p.name}</span>,
            p.specialty,
            <span key="p" className="font-mono text-[11px]">{p.phone}</span>,
            p.lastVisit ?? "—",
            p.nextAppointment ?? "—",
          ])}
          emptyText="No providers added."
          addLabel="Add provider"
        />
      </Section>

      <Section title="Insurance">
        <DataTable
          columns={["Type", "Provider", "Policy #", "Effective", "Expiration"]}
          rows={profile.insurance.map((i) => [
            <span
              key="t"
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono",
                i.type === "Medicaid"
                  ? "bg-icm-accent-soft text-icm-accent"
                  : "bg-icm-bg text-icm-text-dim",
              )}
            >
              {i.type}
            </span>,
            i.provider,
            <span key="p" className="font-mono text-[11px]">{i.policyNumber}</span>,
            i.effectiveDate,
            i.expirationDate ?? "—",
          ])}
          emptyText="No insurance on file."
          addLabel="Add insurance"
        />
      </Section>

      <Section title="Clinical Summary">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <div className="md:col-span-2">
            <EditableField label="Primary Diagnosis" name="primary_diagnosis" defaultValue={person.primary_diagnosis ?? ""} />
          </div>
          <div className="md:col-span-2">
            <EditableField label="Secondary Diagnoses" name="secondary_diagnoses" defaultValue={person.secondary_diagnoses ?? ""} />
          </div>
          <div className="md:col-span-2">
            <EditableField label="ICD-10 Codes" name="icd10_codes" defaultValue={person.icd10_codes ?? ""} />
          </div>
          <div className="md:col-span-2">
            <EditableField label="Medical Notes" name="medical_notes" defaultValue={person.medical_notes ?? ""} multiline />
          </div>
        </div>
      </Section>

      <Section title="Primary Physician">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="Physician Name" name="primary_physician_name" defaultValue={person.primary_physician_name ?? ""} />
          <EditableField label="Physician Phone" name="primary_physician_phone" defaultValue={person.primary_physician_phone ?? ""} />
          <EditableField label="Hospital Preference" name="hospital_preference" defaultValue={person.hospital_preference ?? ""} />
        </div>
      </Section>

      <Section title="Medicaid (MA) Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="MA Status" name="ma_status" defaultValue={person.ma_status ?? ""} />
          <EditableField label="MA ID" name="ma_id" defaultValue={person.ma_id ?? ""} />
          <EditableField label="MA Type" name="ma_type" defaultValue={person.ma_type ?? ""} />
          <EditableField label="MA Effective Date" name="ma_effective_date" defaultValue={person.ma_effective_date ?? ""} />
          <EditableField label="MA Redetermination Date" name="ma_redetermination_date" defaultValue={person.ma_redetermination_date ?? ""} />
        </div>
      </Section>

      <Section title="Secondary Insurance">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="Secondary Insurance Name" name="secondary_insurance_name" defaultValue={person.secondary_insurance_name ?? ""} />
          <EditableField label="Secondary Insurance ID" name="secondary_insurance_id" defaultValue={person.secondary_insurance_id ?? ""} />
        </div>
      </Section>
    </div>
  );
}


// =============================================================
// TAB 3 — Monitors & Baselines (NEW)
// =============================================================
const OTHER_INSTRUMENT_INIT = { name: "", score: "", date: "", nextDue: "" };

function MonitorsTab({ profile }: { profile: ProfileData }) {
  const [instruments, setInstruments] = useState([OTHER_INSTRUMENT_INIT]);

  return (
    <div className="space-y-4">
      <Section title="Standardized Scores">
        <div className="space-y-4">
          {/* HRST */}
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-icm-text-faint mb-2">HRST Score</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <EditableField label="Score (1–6)" defaultValue={profile.hrstScore?.toString() ?? ""} />
              <EditableField label="Date of Last Assessment" defaultValue={profile.hrstScoredOn ?? ""} />
              <EditableField label="Next Due Date" defaultValue="" />
              <EditableField label="Assessed By" defaultValue="" />
              <EditableSelect
                label="Source"
                defaultValue={profile.hrstSource ?? "Manual entry"}
                options={["Intellectability", "Manual entry", "Uploaded"]}
              />
            </div>
            {(profile.hrstScore ?? 0) >= 3 && (
              <div className="mt-2 rounded-lg border border-icm-amber/30 bg-icm-amber-soft p-2.5 text-[11.5px] font-geist text-icm-text flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-icm-amber" />
                Score of {profile.hrstScore} requires nursing review per state guidelines.
              </div>
            )}
          </div>

          {/* Level of Care */}
          <div className="pt-3 border-t border-icm-border">
            <p className="text-[11px] font-mono uppercase tracking-wider text-icm-text-faint mb-2">Level of Care (LOC)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <EditableField label="Current LOC" defaultValue="" />
              <EditableField label="Effective Date" defaultValue="" />
              <EditableField label="Expiration / Renewal Date" defaultValue="" />
              <EditableField label="Issued By" defaultValue="" />
            </div>
          </div>

          {/* Other instruments */}
          <div className="pt-3 border-t border-icm-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-mono uppercase tracking-wider text-icm-text-faint">Other Standardized Instruments</p>
              <button
                type="button"
                onClick={() => setInstruments((prev) => [...prev, { ...OTHER_INSTRUMENT_INIT }])}
                className="h-7 px-2.5 rounded-lg border border-dashed border-icm-border text-[11px] font-geist text-icm-text-dim hover:text-icm-text flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {instruments.map((inst, i) => (
                <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 rounded-lg border border-icm-border p-2">
                  <EditableField label="Instrument Name" defaultValue={inst.name} />
                  <EditableField label="Score" defaultValue={inst.score} />
                  <EditableField label="Date" defaultValue={inst.date} />
                  <EditableField label="Next Due" defaultValue={inst.nextDue} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Behavioral Baselines">
        <EditableField
          label="Behavioral baselines, triggers, de-escalation strategies, and support protocols"
          defaultValue={profile.behavioralMonitoringNotes ?? ""}
          multiline
        />
      </Section>

      <Section title="Health Baselines">
        <div className="mb-3">
          <DataTable
            columns={["Measurement", "Baseline", "Normal Range", "Last Measured", "Measured By"]}
            rows={profile.vitalBaselines.map((v) => [
              <span key="m" className="font-semibold">{v.measurement}</span>,
              v.baseline,
              v.normalRange,
              v.lastMeasured ?? "—",
              v.measuredBy ?? "—",
            ])}
            emptyText="No baselines recorded."
          />
        </div>
        <EditableField
          label="Additional health baseline notes"
          defaultValue={profile.healthMonitoringNotes ?? ""}
          multiline
        />
      </Section>
    </div>
  );
}

// =============================================================
// TAB 4 — Court Involvement
// =============================================================
const LEGAL_STATUS_OPTIONS = [
  "Competent adult — self-directing",
  "Guardianship — full",
  "Guardianship — limited",
  "Power of Attorney",
  "Representative payee",
  "Conservatorship",
  "Other",
];
const GUARDIAN_REL_OPTIONS = ["Parent", "Sibling", "Spouse", "Other family", "Professional guardian", "Agency", "Other"];
const CASE_TYPE_OPTIONS = ["Criminal", "Civil", "Family", "Probate", "Other"];
const CASE_STATUS_OPTIONS = ["Active", "Closed", "Pending"];

function CourtTab({ profile }: { profile: ProfileData }) {
  const [hasCourtInvolvement, setHasCourtInvolvement] = useState(
    !!(profile.court || profile.legalStatus || profile.forensicInvolvement)
  );
  const [hasProbation, setHasProbation] = useState(false);
  const [legalStatus, setLegalStatus] = useState(profile.legalStatus ?? "");
  const isGuardianship = legalStatus.includes("Guardianship") || legalStatus === "Power of Attorney";

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center justify-between">
        <div>
          <p className="text-[13.5px] font-manrope font-bold text-icm-text">Court Involvement</p>
          <p className="text-[11.5px] text-icm-text-dim mt-0.5">Toggle on if individual has active court cases, guardianship, or legal supervision.</p>
        </div>
        <button
          type="button"
          onClick={() => setHasCourtInvolvement((p) => !p)}
          className={cn(
            "w-11 h-6 rounded-full transition-colors relative shrink-0",
            hasCourtInvolvement ? "bg-icm-accent" : "bg-icm-border"
          )}
        >
          <span className={cn(
            "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
            hasCourtInvolvement ? "translate-x-6" : "translate-x-1"
          )} />
        </button>
      </div>

      {!hasCourtInvolvement ? (
        <div className="rounded-xl border border-icm-border bg-icm-panel p-6 text-center">
          <p className="text-[13px] text-icm-text-dim font-geist">No active court involvement documented.</p>
        </div>
      ) : (
        <>
          <Section title="Legal Status">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-[10.5px] uppercase tracking-wider text-icm-text-faint font-geist block mb-1">Legal Status</label>
                <select
                  className="modal-input max-w-xs"
                  value={legalStatus}
                  onChange={(e) => setLegalStatus(e.target.value)}
                >
                  <option value="">— Select —</option>
                  {LEGAL_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              {isGuardianship && (
                <>
                  <EditableField label="Guardian / POA Name" defaultValue={profile.guardianName ?? ""} required />
                  <EditableSelect label="Guardian / POA Relationship" defaultValue={profile.guardianRelationship ?? ""} options={GUARDIAN_REL_OPTIONS} />
                  <EditableField label="Guardian / POA Phone" defaultValue={profile.guardianPhone ?? ""} required />
                  <EditableField label="Guardian / POA Email" defaultValue="" />
                  <div className="md:col-span-2">
                    <EditableField label="Guardian / POA Address" defaultValue={profile.guardianAddress ?? ""} />
                  </div>
                  <EditableField label="Effective Date of Guardianship / POA" defaultValue="" />
                </>
              )}
            </div>
          </Section>

          <Section title="Active Court Cases">
            <DataTable
              columns={["Case Type", "Case #", "Court", "Status", "Next Date", "Attorney"]}
              rows={profile.court ? [[
                <span key="t" className="font-semibold">Court Case</span>,
                "—",
                profile.court,
                <span key="s" className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-icm-green-soft text-icm-green">Active</span>,
                profile.nextCourtDate ?? "—",
                profile.attorney ?? "—",
              ]] : []}
              emptyText="No active court cases recorded."
              addLabel="Add case"
            />
          </Section>

          <Section title="Probation / Parole">
            <div className="flex items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => setHasProbation((p) => !p)}
                className={cn(
                  "w-9 h-5 rounded-full transition-colors relative shrink-0",
                  hasProbation ? "bg-icm-accent" : "bg-icm-border"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                  hasProbation ? "translate-x-4" : "translate-x-0.5"
                )} />
              </button>
              <span className="text-[12.5px] font-geist text-icm-text">Under probation or parole supervision</span>
            </div>
            {hasProbation && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <EditableField label="Officer Name" defaultValue="" />
                <EditableField label="Officer Phone" defaultValue="" />
                <EditableField label="Supervision End Date" defaultValue="" />
                <div className="md:col-span-2">
                  <EditableField label="Conditions" defaultValue="" multiline />
                </div>
              </div>
            )}
          </Section>

          {/* Sidebar: providers and pharmacies */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2" />
            <div className="space-y-4">
              <Section title="Providers">
                {profile.providers.length === 0 ? (
                  <Empty text="Manage in Medical tab." />
                ) : (
                  <ul className="space-y-1.5 text-[12px] font-geist">
                    {profile.providers.map((p) => (
                      <li key={p.name} className="flex items-center justify-between">
                        <span className="text-icm-text">{p.name}</span>
                        <span className="text-icm-text-dim text-[11px]">{p.specialty}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================
// TAB 5 — Program
// =============================================================
function ProgramTab({ profile }: { profile: ProfileData }) {
  return (
    <div className="space-y-4">
      <Section title="Current Programs">
        <DataTable
          columns={["Program", "Service Category", "Start", "Status", "Case Manager"]}
          rows={profile.enrollments.map((e) => [
            <span key="p" className="font-semibold">{e.program}</span>,
            e.serviceCategory,
            e.startDate,
            <ProgramStatusBadge key="s" status={e.status} />,
            e.caseManager,
          ])}
          emptyText="Not enrolled in any program yet."
          addLabel="Enroll in program"
        />
      </Section>

      <Section title="Service Categories">
        {profile.enrollments.map((e) => (
          <div
            key={e.serviceCategory}
            className="rounded-lg border border-icm-border bg-icm-bg p-3 mb-2 last:mb-0"
          >
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-icm-text font-geist">{e.serviceCategory}</p>
              <span className="text-[11px] font-mono text-icm-text-dim">3 of 4 visits this year</span>
            </div>
            <p className="text-[11.5px] text-icm-text-dim mt-0.5">
              Required visits: 4 per year (quarterly) · Required forms: Quarterly monitoring, Annual ISP
            </p>
            <div className="h-1.5 rounded-full bg-icm-border mt-2 overflow-hidden">
              <div className="h-full bg-icm-accent" style={{ width: "75%" }} />
            </div>
          </div>
        ))}
      </Section>

      <FundingStreamsSection profile={profile} />

    </div>
  );
}

// ---------- Funding Streams (expanded) ----------
type FundingCard = {
  name: string;
  payer: string;
  authNumber: string;
  effective: string;
  expires: string;
  codes: string[];
  rate: string;
  rateUnit: string;
  used: number;
  authorized: number;
};

function FundingStreamsSection({ profile }: { profile: ProfileData }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  const first = profile.funding[0];
  const cards: FundingCard[] = [
    {
      name: "Medicaid Waiver",
      payer: "IHCP",
      authNumber: first?.authorizationNumber ?? "SA-2026-001",
      effective: "01/01/2026",
      expires: "04/30/2026",
      codes: ["T2022", "T2023"],
      rate: "$28.50",
      rateUnit: "15-min increments",
      used: first?.usedUnits ?? 0,
      authorized: first?.authorizedUnits ?? 40,
    },
    {
      name: "Indiana Managed Care — Anthem",
      payer: "Anthem Indiana",
      authNumber: "SA-2026-002",
      effective: "01/01/2026",
      expires: "06/30/2026",
      codes: ["T2022"],
      rate: "$29.10",
      rateUnit: "15-min increments",
      used: 12,
      authorized: 30,
    },
  ];

  return (
    <section className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-manrope font-bold text-[13.5px] text-icm-text tracking-tight">Funding Streams</h3>
        <button
          onClick={() => setModalOpen(true)}
          className="h-7 px-2.5 rounded-lg border border-icm-border text-[11px] font-geist font-semibold text-icm-text inline-flex items-center gap-1 hover:bg-icm-bg"
        >
          <Plus className="w-3 h-3" /> Add Authorization
        </button>
      </div>

      <div className="space-y-2">
        {cards.map((c) => (
          <FundingStreamCard key={c.authNumber} card={c} />
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-icm-border flex items-center justify-between flex-wrap gap-2">
        <p className="text-[11px] text-icm-text-dim font-geist">
          Last billing record: Progress Note 04/27/2026 · 3 units · T2022 · Pending scrub
        </p>
        <button
          onClick={() => (id ? navigate(`/people/${id}?tab=billing`) : navigate("/billing"))}
          className="text-[11px] font-geist font-semibold text-icm-accent hover:underline inline-flex items-center gap-1"
        >
          View all billing records <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {modalOpen && <AddAuthorizationModal onClose={() => setModalOpen(false)} />}
    </section>
  );
}

function FundingStreamCard({ card }: { card: FundingCard }) {
  const pct = card.authorized === 0 ? 0 : Math.min(100, (card.used / card.authorized) * 100);
  const capped = card.used >= card.authorized && card.authorized > 0;
  const approaching = !capped && pct >= 85;
  const tone = capped ? "bg-icm-red" : approaching ? "bg-icm-amber" : "bg-icm-accent";
  const remaining = Math.max(0, card.authorized - card.used);

  return (
    <div className="rounded-lg border border-icm-border bg-icm-bg p-3">
      {/* Line 1 */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-[13px] font-semibold text-icm-text">{card.name}</p>
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
          Active
        </span>
        <span className="text-[11.5px] text-icm-text-dim">· {card.payer}</span>
      </div>
      {/* Line 2 */}
      <p className="text-[11px] font-mono text-icm-text-dim mt-0.5">
        Auth #{card.authNumber} · Effective {card.effective} · Expires {card.expires}
      </p>
      {/* Line 3 */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className="text-[11px] text-icm-text-dim font-geist">Service codes:</span>
        {card.codes.map((code) => (
          <span
            key={code}
            className="px-1.5 py-0.5 rounded-md text-[10.5px] font-mono font-semibold bg-icm-border/60 text-icm-text"
          >
            {code}
          </span>
        ))}
      </div>
      {/* Line 4 */}
      <p className="text-[11.5px] text-icm-text mt-1.5 font-geist">
        Rate: <span className="font-semibold">{card.rate}</span> per unit ({card.rateUnit})
      </p>
      {/* Line 5 */}
      <div className="h-2 rounded-full bg-icm-border mt-2 overflow-hidden">
        <div className={cn("h-full", tone)} style={{ width: `${pct}%` }} />
      </div>
      <p
        className={cn(
          "text-[11.5px] mt-1.5 font-geist",
          capped ? "text-icm-red font-semibold" : approaching ? "text-icm-amber font-semibold" : "text-icm-text-dim"
        )}
      >
        {capped
          ? "Authorization cap reached — billing blocked"
          : approaching
            ? `Approaching cap — ${remaining} units remaining`
            : `${card.used} of ${card.authorized} units used this authorization period`}
      </p>
    </div>
  );
}

function AddAuthorizationModal({ onClose }: { onClose: () => void }) {
  const { id } = useParams<{ id: string }>();
  const STREAMS = [
    { name: "Indiana HCBS — CIH Waiver", payer: "IHCP" },
    { name: "Indiana HCBS — Family Supports", payer: "IHCP" },
    { name: "Indiana Managed Care — Anthem", payer: "Anthem Indiana" },
    { name: "NJ DDD Community Care", payer: "NJ DDD" },
  ];
  const CODES = ["T2022", "T2023", "T1019", "T1016"];
  const [stream, setStream] = useState(STREAMS[0].name);
  const [codes, setCodes] = useState<string[]>(["T2022"]);
  const [authNumber, setAuthNumber] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [authorizedUnits, setAuthorizedUnits] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const payer = STREAMS.find((s) => s.name === stream)?.payer ?? "";

  const toggleCode = (c: string) =>
    setCodes((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "authorizations"), {
        individualId: id,
        fundingStream: stream,
        payer,
        authorizationNumber: authNumber,
        effectiveDate,
        expirationDate,
        authorizedUnits: authorizedUnits ? Number(authorizedUnits) : null,
        serviceCodes: codes,
        notes,
        createdAt: serverTimestamp(),
      });
      toast.success("Authorization saved");
      onClose();
    } catch (err) {
      console.error("Failed to save authorization:", err);
      toast.error("Failed to save authorization");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-icm-panel rounded-xl border border-icm-border w-full max-w-lg p-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-manrope font-bold text-[14px] text-icm-text">Add Authorization</h3>
          <button onClick={onClose} className="text-icm-text-dim hover:text-icm-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <ModalField label="Funding stream">
            <select className="modal-input" value={stream} onChange={(e) => setStream(e.target.value)}>
              {STREAMS.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </ModalField>

          <ModalField label="Payer (auto)">
            <input className="modal-input" value={payer} readOnly />
          </ModalField>

          <ModalField label="Authorization number">
            <input className="modal-input" placeholder="SA-2026-003" value={authNumber} onChange={(e) => setAuthNumber(e.target.value)} />
          </ModalField>

          <div className="grid grid-cols-2 gap-3">
            <ModalField label="Effective date">
              <input className="modal-input" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </ModalField>
            <ModalField label="Expiration date">
              <input className="modal-input" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
            </ModalField>
          </div>

          <ModalField label="Authorized units">
            <input className="modal-input" type="number" placeholder="40" value={authorizedUnits} onChange={(e) => setAuthorizedUnits(e.target.value)} />
          </ModalField>

          <ModalField label="Service codes">
            <div className="flex flex-wrap gap-1.5">
              {CODES.map((c) => {
                const on = codes.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCode(c)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[11px] font-mono font-semibold border",
                      on
                        ? "bg-icm-accent text-white border-icm-accent"
                        : "bg-icm-bg text-icm-text border-icm-border"
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </ModalField>

          <ModalField label="Notes">
            <textarea className="modal-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </ModalField>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg border border-icm-border text-[12px] font-geist font-semibold text-icm-text"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[12px] font-geist font-semibold disabled:opacity-60 flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Save
          </button>
        </div>
        <style>{`.modal-input { width:100%; height:32px; padding:0 8px; border-radius:8px; border:1px solid hsl(var(--icm-border)); background:white; font-size:12px; color:hsl(var(--icm-text)); font-family: inherit; }
        textarea.modal-input { padding:8px; height:auto; }`}</style>
      </div>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}


// =============================================================
// TAB 6 — Contacts
// =============================================================
function ContactsTab({ profile, person }: { profile: ProfileData; person: Individual }) {
  const stale = profile.professionalContacts.filter((c) => c.lastContacted && monthsAgo(c.lastContacted) >= 3);
  return (
    <div className="space-y-4">
      <Section title="Emergency Contacts">
        <div className="space-y-2">
          {profile.emergencyContacts.map((c) => (
            <div
              key={c.name}
              className="rounded-lg border border-icm-border bg-icm-bg p-3 flex items-center gap-3"
            >
              {c.priority === 1 && (
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="w-4 h-4 text-icm-amber fill-icm-amber" />
                  <span className="text-[9px] font-mono font-bold text-icm-amber uppercase tracking-wide">Primary</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-icm-text">{c.name}</p>
                <p className="text-[11.5px] text-icm-text-dim">
                  {c.relationship} · <span className="font-mono">{c.primaryPhone}</span>
                  {c.notes && ` · ${c.notes}`}
                </p>
              </div>
              <button className="text-icm-text-faint hover:text-icm-text">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {profile.emergencyContacts.length === 0 && <Empty text="No emergency contacts." />}
          <button className="mt-1 h-8 px-3 rounded-lg border border-dashed border-icm-border text-[11.5px] text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1" id="add-emergency-contact">
            <Plus className="w-3.5 h-3.5" /> Add contact
          </button>
        </div>
      </Section>

      <Section title="Emergency Contact (Primary)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="Name" name="emergency_contact_name" defaultValue={person.emergency_contact_name ?? ""} />
          <EditableField label="Relationship" name="emergency_contact_relation" defaultValue={person.emergency_contact_relation ?? ""} />
          <EditableField label="Phone" name="emergency_contact_phone" defaultValue={person.emergency_contact_phone ?? ""} />
          <EditableField label="Alternate Phone" name="emergency_contact_phone2" defaultValue={person.emergency_contact_phone2 ?? ""} />
          <EditableField label="Email" name="emergency_contact_email" defaultValue={person.emergency_contact_email ?? ""} />
        </div>
      </Section>

      <Section title="Guardian / POA">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="Guardian Name" name="guardian_name" defaultValue={person.guardian_name ?? ""} />
          <EditableField label="Guardian Relationship" name="guardian_relationship" defaultValue={person.guardian_relationship ?? ""} />
          <EditableField label="Guardian Phone" name="guardian_phone" defaultValue={person.guardian_phone ?? ""} />
          <EditableField label="Guardian Email" name="guardian_email" defaultValue={person.guardian_email ?? ""} />
          <EditableField label="POA Name" name="poa_name" defaultValue={person.poa_name ?? ""} />
          <EditableField label="POA Phone" name="poa_phone" defaultValue={person.poa_phone ?? ""} />
        </div>
      </Section>

      <Section title="Care Team">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between py-1.5 border-b border-icm-border/40">
            <span className="text-[11px] uppercase tracking-wide text-icm-text-faint font-geist">Case Manager</span>
            <span className="text-[12.5px] text-icm-text font-geist">{profile.caseManager}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-icm-border/40">
            <span className="text-[11px] uppercase tracking-wide text-icm-text-faint font-geist">Supervisor</span>
            <span className="text-[12.5px] text-icm-text font-geist">{profile.supervisor ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[11px] uppercase tracking-wide text-icm-text-faint font-geist">Program Coordinator</span>
            <span className="text-[12.5px] text-icm-text font-geist">{profile.programCoordinator ?? "—"}</span>
          </div>
        </div>
        <p className="text-[11px] text-icm-text-faint mt-2 font-geist italic">
          Manage team assignments in Admin Settings.
        </p>
      </Section>

      <Section title="Support Circle">
        <DataTable
          columns={["Name", "Role", "Phone", "Involvement"]}
          rows={profile.supportCircle.map((s) => [
            <span key="n" className="font-semibold">{s.name}</span>,
            s.role,
            <span key="p" className="font-mono text-[11px]">{s.phone ?? "—"}</span>,
            <span
              key="i"
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-mono",
                s.involvement === "High"
                  ? "bg-icm-green-soft text-icm-green"
                  : s.involvement === "Medium"
                    ? "bg-icm-amber-soft text-icm-amber"
                    : "bg-icm-bg text-icm-text-dim",
              )}
            >
              {s.involvement}
            </span>,
          ])}
          emptyText="No support circle members yet."
          addLabel="Add member"
        />
      </Section>

      <Section title="External Providers">
        <DataTable
          columns={["Provider", "Organization", "Role", "Phone", "Last Contact"]}
          rows={profile.professionalContacts.map((p) => [
            <span key="n" className="font-semibold">{p.name}</span>,
            p.organization,
            p.role,
            <span key="p" className="font-mono text-[11px]">{p.phone}</span>,
            <span
              key="l"
              className={cn(
                "text-[11px]",
                p.lastContacted && monthsAgo(p.lastContacted) >= 3
                  ? "text-icm-amber font-semibold"
                  : "text-icm-text-dim",
              )}
            >
              {p.lastContacted ?? "—"}
            </span>,
          ])}
          emptyText="No external providers yet."
          addLabel="Add provider"
        />
        {stale.length > 0 && (
          <div className="mt-3 rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-3 text-[11.5px] font-geist text-icm-text flex items-start gap-2">
            <Sparkle className="w-3.5 h-3.5 text-icm-accent mt-0.5" />
            <span>
              {stale.length} provider{stale.length === 1 ? "" : "s"} with no recorded
              contact in 90+ days. Consider reaching out to stay updated on service delivery.
            </span>
          </div>
        )}
      </Section>
    </div>
  );
}


// =============================================================
// TAB 7 — Documents
// =============================================================
function DocumentsTab({ profile }: { profile: ProfileData }) {
  return (
    <div className="space-y-4">
      <Section title="Document Library">
        <div className="rounded-lg border border-icm-border bg-icm-panel p-3 mb-3 flex flex-wrap items-center gap-2">
          <select className="modal-input w-44">
            <option>All types</option>
            <option>Consent Forms</option>
            <option>DNR</option>
            <option>Guardianship Papers</option>
            <option>Insurance Cards</option>
            <option>Medical Records</option>
            <option>Legal Documents</option>
          </select>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint" />
            <input placeholder="Search documents…" className="modal-input pl-7" />
          </div>
          <button className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-semibold hover:opacity-90 flex items-center gap-1">
            <Upload className="w-3.5 h-3.5" /> Upload document
          </button>
        </div>
        {profile.documents.length === 0 ? (
          <div className="rounded-lg border border-icm-border bg-icm-bg p-8 text-center">
            <FileText className="w-8 h-8 text-icm-text-faint mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-icm-text">No documents uploaded</p>
            <p className="text-[11.5px] text-icm-text-dim mt-1">
              Upload intake paperwork, insurance cards, and consent forms here.
            </p>
          </div>
        ) : (
          <DataTable
            columns={["Document", "Type", "Uploaded By", "Upload Date", "Expiration"]}
            rows={profile.documents.map((d) => [
              <span key="n" className="font-semibold">{d.name}</span>,
              d.type,
              d.uploadedBy,
              d.uploadDate,
              d.expirationDate ? (
                <ExpirationBadge date={d.expirationDate} />
              ) : (
                <span className="text-icm-text-dim">—</span>
              ),
            ])}
            emptyText=""
          />
        )}
      </Section>

      <Section title="AI Document Processing">
        <div className="rounded-lg border border-icm-accent/20 bg-icm-accent-soft p-3 text-[12px] font-geist text-icm-text flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-icm-accent mt-0.5" />
          <span>
            Upload documents and AI will extract key information automatically. Supported: insurance
            cards, Medicaid verification letters, assessment reports, guardianship orders.
          </span>
        </div>
      </Section>
    </div>
  );
}

// =============================================================
// =============================================================
// TAB 8 — Administrative
// =============================================================
const ADMIN_DISCHARGE_REASONS = [
  "Completed services", "Individual request", "Non-compliance",
  "Moved out of area", "Deceased", "Other",
];

function AdminTab({ profile, person }: { profile: ProfileData; person: Individual }) {
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargeDate, setDischargeDate] = useState("");
  const [dischargeReason, setDischargeReason] = useState("");
  const [dischargeNotes, setDischargeNotes] = useState("");
  const [dischargeDone, setDischargeDone] = useState(false);

  const handleDischarge = () => {
    if (!dischargeDate || !dischargeReason) {
      toast.error("Discharge date and reason are required.");
      return;
    }
    profile.dischargeDate = dischargeDate;
    profile.dischargeType = "Voluntary";
    profile.dischargeReason = dischargeReason;
    profile.dischargeSummary = dischargeNotes;
    const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    profile.changeHistory = [
      { date: today, user: "Case Manager", field: "Enrollment Status", oldValue: person.status, newValue: "Discharged" },
      ...profile.changeHistory,
    ];
    setDischargeDone(true);
    setShowDischargeModal(false);
    toast.success(`${person.first_name} ${person.last_name} has been discharged.`, { duration: 5000 });
  };

  return (
    <div className="space-y-4">
      <Section title="Case Assignment">
        <KvGrid
          rows={[
            ["Assigned Case Manager", profile.caseManager, true],
            ["Secondary Case Manager", profile.secondaryCaseManager ?? "—"],
            ["Supervisor", profile.supervisor ?? "—"],
            ["Program Coordinator", profile.programCoordinator ?? "—"],
          ]}
        />
        <p className="text-[11px] text-icm-text-faint mt-2 font-geist">
          Assignment changes are managed in Admin Settings.
        </p>
      </Section>

      <Section title="Caseload Weighting">
        <KvGrid
          rows={[
            ["Caseload weight", profile.caseloadWeight?.toString() ?? "—"],
            ["Complexity level", profile.complexity ?? "Standard"],
          ]}
        />
      </Section>

      <Section title="Intake & Discharge">
        <KvGrid
          rows={[
            ["Referral date", person.referral_date ?? profile.referralDate ?? "—"],
            ["Referral source", person.referral_source ?? "—"],
            ["Admission date", person.admission_date ?? person.admittedOn ?? "—"],
            ["Admission type", profile.admissionType ?? "—"],
            ["Previous agency", profile.previousAgency ?? "—"],
            ["Discharge date", person.discharge_date ?? profile.dischargeDate ?? (dischargeDone ? dischargeDate : "—")],
            ["Discharge reason", profile.dischargeReason ?? (dischargeDone ? dischargeReason : "—")],
          ]}
        />
      </Section>

      <Section title="Program & Service">
        <KvGrid
          rows={[
            ["Program type", person.program_type ?? "—"],
            ["Waiver type", person.waiver_type ?? "—"],
            ["Service category", person.service_category ?? "—"],
            ["Funding stream", person.funding_stream ?? "—"],
            ["Case number", person.case_number ?? "—"],
          ]}
        />
      </Section>

      <Section title="Legal & Care Planning">
        <KvGrid
          rows={[
            ["Legal status", person.legal_status ?? "—"],
            ["PCP status", person.pcp_status ?? "—"],
            ["Next ISP date", person.next_isp_date ?? "—"],
            ["Last annual plan date", person.last_annual_plan_date ?? "—"],
          ]}
        />
      </Section>

      <Section title="Compliance & Quality">
        <KvGrid
          rows={[
            ["Last chart review", profile.lastChartReview ?? "—"],
            ["Next chart review due", profile.nextChartReviewDue ?? "—"],
          ]}
        />
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <ComplianceChip label="PCP" status="Out of compliance" tone="red" />
          <ComplianceChip label="Monitoring" status="Due in 7 days" tone="amber" />
          <ComplianceChip label="MA" status="Active" tone="green" />
          <ComplianceChip label="Visits" status="Overdue" tone="red" />
        </div>
      </Section>

      <Section title="Profile Change History">
        {profile.changeHistory.length === 0 ? (
          <Empty text="No changes recorded." />
        ) : (
          <ul className="text-[11.5px] font-geist text-icm-text-dim space-y-1.5">
            {profile.changeHistory.map((c, i) => (
              <li key={i} className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-icm-text-faint">{c.date}</span>
                <span>·</span>
                <span className="text-icm-text">{c.user}</span>
                <span>·</span>
                <span>{c.field}:</span>
                <span className="text-icm-text-faint line-through">{c.oldValue}</span>
                <span>→</span>
                <span className="text-icm-text">{c.newValue}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="System Information">
        <KvGrid
          rows={[
            ["Individual ID", <span key="id" className="font-mono text-[11px]">{person.id}</span>],
            ["Created Date", person.admittedOn],
            ["Last Modified", person.updatedOn ?? "—"],
            ["Companion Token", <span key="ct" className="font-mono text-[11px] blur-sm select-none">••••••••••••</span>],
          ]}
        />
      </Section>

      {/* Discharge Management — only visible if not already discharged */}
      {person.status !== "Discharged" && !dischargeDone && (
        <div className="rounded-xl border border-icm-red/30 bg-icm-red-soft p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-icm-red font-manrope">Discharge Management</p>
              <p className="text-[11.5px] text-icm-text-dim mt-0.5">
                Initiating discharge will close all active tasks, terminate active workflows, and flag this record as inactive.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDischargeModal(true)}
              className="h-9 px-3 rounded-xl border border-icm-red text-[12px] font-semibold text-icm-red hover:bg-icm-red/10 flex items-center gap-1.5"
            >
              Initiate Discharge
            </button>
          </div>
        </div>
      )}

      {/* Discharge confirmation modal */}
      {showDischargeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowDischargeModal(false)}>
          <div className="bg-icm-panel rounded-xl border border-icm-border w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-manrope font-bold text-[15px] text-icm-text">Initiate Discharge</h3>
              <button onClick={() => setShowDischargeModal(false)} className="text-icm-text-dim hover:text-icm-text">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[12.5px] text-icm-text-dim mb-4 font-geist">
              You are initiating discharge for <span className="font-semibold text-icm-text">{person.first_name} {person.last_name}</span>.
              This action will close all active tasks and terminate active workflows.
            </p>
            <div className="space-y-3">
              <ModalField label="Discharge Date (required)">
                <input type="date" className="modal-input" value={dischargeDate} onChange={(e) => setDischargeDate(e.target.value)} />
              </ModalField>
              <ModalField label="Reason for Discharge (required)">
                <select className="modal-input" value={dischargeReason} onChange={(e) => setDischargeReason(e.target.value)}>
                  <option value="">— Select —</option>
                  {ADMIN_DISCHARGE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </ModalField>
              <ModalField label="Notes (optional)">
                <textarea
                  className="modal-input min-h-[60px]"
                  value={dischargeNotes}
                  onChange={(e) => setDischargeNotes(e.target.value)}
                  placeholder="Any additional context..."
                />
              </ModalField>
            </div>
            <div className="flex items-center gap-2 mt-5 justify-end">
              <button
                type="button"
                onClick={() => setShowDischargeModal(false)}
                className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-semibold text-icm-text-dim hover:text-icm-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDischarge}
                className="h-9 px-4 rounded-xl bg-icm-red text-white text-[12px] font-semibold hover:opacity-90"
              >
                Initiate Discharge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================
// Reusable bits
// =============================================================
function Section({ title, children, onSave }: {
  title: string;
  children: React.ReactNode;
  onSave?: (data: Record<string, string>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSave = async () => {
    if (onSave) {
      setSaving(true);
      try {
        const formData = formRef.current ? new FormData(formRef.current) : new FormData();
        const data = Object.fromEntries(formData.entries()) as Record<string, string>;
        await onSave(data);
        toast.success(`${title} saved`);
      } catch (err) {
        console.error(`Failed to save ${title}:`, err);
        toast.error(`Failed to save ${title}`);
      } finally {
        setSaving(false);
      }
    } else {
      demoToast(`${title} saved`);
    }
    setEditing(false);
  };

  return (
    <section className={cn(
      "rounded-xl border bg-icm-panel p-4 transition-colors",
      editing ? "border-icm-accent ring-1 ring-icm-accent/30" : "border-icm-border"
    )}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="icm-section-title">
          {title}
          {editing && <span className="ml-2 text-[10px] font-geist font-medium uppercase tracking-wide text-icm-accent">Editing</span>}
        </h3>
        {editing ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-[11px] font-geist text-icm-text-dim hover:text-icm-text px-2 py-1 rounded-md hover:bg-icm-bg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="text-[11px] font-geist font-medium text-white bg-icm-accent hover:opacity-90 px-2.5 py-1 rounded-md disabled:opacity-60 flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              Save
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[11px] font-geist text-icm-accent hover:underline flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        )}
      </div>
      <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
        <fieldset disabled={!editing} className={cn(!editing && "pointer-events-none select-text")}>
          {children}
        </fieldset>
      </form>
      <style>{`.modal-input { width:100%; height:32px; padding:0 8px; border-radius:8px; border:1px solid hsl(var(--icm-border)); background:white; font-size:12px; color:hsl(var(--icm-text)); font-family: inherit; }
      textarea.modal-input { padding:8px; height:auto; }
      fieldset:disabled .modal-input { background: hsl(var(--icm-bg)); color: hsl(var(--icm-text)); cursor: default; }`}</style>
    </section>
  );
}


function KvGrid({ rows }: { rows: [string, React.ReactNode, boolean?][] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
      {rows.map(([label, value, required], i) => (
        <div key={i} className="flex items-baseline gap-3 py-1.5 border-b border-icm-border/40 last:border-b-0">
          <span className="text-[11px] uppercase tracking-wide text-icm-text-faint font-geist w-1/3 text-right shrink-0">
            {label}
            {required && <span className="text-icm-red ml-0.5">*</span>}
          </span>
          <span className="text-[12.5px] text-icm-text font-geist flex-1 break-words">{value}</span>
        </div>
      ))}
    </div>
  );
}

function DataTable({
  columns,
  rows,
  emptyText,
  addLabel,
  compact,
}: {
  columns: string[];
  rows: React.ReactNode[][];
  emptyText: string;
  addLabel?: string;
  compact?: boolean;
}) {
  return (
    <div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-icm-border bg-icm-bg p-4 text-center">
          <p className="text-[12px] text-icm-text-dim font-geist">{emptyText}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-icm-border overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c}
                    className={cn(
                      "text-left px-3 font-semibold text-icm-text-dim text-[10.5px] uppercase tracking-wider",
                      compact ? "py-1.5" : "py-2",
                    )}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-icm-border">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-icm-bg/50">
                  {r.map((cell, j) => (
                    <td key={j} className={cn("px-3 text-icm-text", compact ? "py-1.5" : "py-2")}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {addLabel && (
        <button className="mt-2 h-8 px-3 rounded-lg border border-dashed border-icm-border text-[11.5px] text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> {addLabel}
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] text-icm-text-dim font-geist">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-icm-border bg-icm-bg p-4 text-center">
      <p className="text-[12px] text-icm-text-dim font-geist">{text}</p>
    </div>
  );
}

function MedStatusBadge({ status }: { status: ProfileData["medications"][number]["status"] }) {
  const cls =
    status === "Active"
      ? "bg-icm-green-soft text-icm-green"
      : status === "Discontinued"
        ? "bg-icm-bg text-icm-text-dim"
        : "bg-icm-accent-soft text-icm-accent";
  return <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold", cls)}>{status}</span>;
}

function SeverityBadge({ severity }: { severity: ProfileData["allergies"][number]["severity"] }) {
  const cls =
    severity === "Life-threatening" || severity === "Severe"
      ? "bg-icm-red-soft text-icm-red"
      : severity === "Moderate"
        ? "bg-icm-amber-soft text-icm-amber"
        : "bg-icm-bg text-icm-text-dim";
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold", cls)}>
      {severity}
    </span>
  );
}

function ProgramStatusBadge({ status }: { status: ProfileData["enrollments"][number]["status"] }) {
  const map = {
    Active: "bg-icm-green-soft text-icm-green",
    Pending: "bg-icm-amber-soft text-icm-amber",
    Closed: "bg-icm-bg text-icm-text-dim",
    "On Hold": "bg-icm-amber-soft text-icm-amber",
  } as const;
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold", map[status])}>
      {status}
    </span>
  );
}

function ComplianceChip({
  label,
  status,
  tone,
}: {
  label: string;
  status: string;
  tone: "red" | "amber" | "green";
}) {
  const cls = {
    red: "bg-icm-red-soft text-icm-red border-icm-red/20",
    amber: "bg-icm-amber-soft text-icm-amber border-icm-amber/20",
    green: "bg-icm-green-soft text-icm-green border-icm-green/20",
  }[tone];
  return (
    <div className={cn("rounded-lg border p-2.5", cls)}>
      <p className="text-[10px] uppercase tracking-wider font-mono font-bold opacity-80">{label}</p>
      <p className="text-[11.5px] font-semibold mt-0.5">{status}</p>
    </div>
  );
}

function ExpirationBadge({ date }: { date: string }) {
  const days = daysUntil(date);
  let cls = "bg-icm-green-soft text-icm-green";
  let label = date;
  if (days < 0) {
    cls = "bg-icm-red-soft text-icm-red font-bold";
    label = "EXPIRED";
  } else if (days < 30) {
    cls = "bg-icm-red-soft text-icm-red";
  } else if (days < 90) {
    cls = "bg-icm-amber-soft text-icm-amber";
  }
  return <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold", cls)}>{label}</span>;
}

function InlineField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-icm-bg border border-icm-border px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-icm-text-faint font-geist font-medium">
        {label}
      </p>
      <p className="text-[12px] text-icm-text font-geist mt-0.5 truncate">{value}</p>
    </div>
  );
}

function DropdownItem({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 text-[12px] font-geist hover:bg-icm-bg flex items-center justify-between",
        active ? "text-icm-accent font-semibold" : "text-icm-text",
      )}
    >
      {label}
      {active && <span className="w-1.5 h-1.5 rounded-full bg-icm-accent" />}
    </button>
  );
}

function CompletenessFooter({
  tc,
  onJump,
}: {
  tc: ReturnType<typeof tabCompleteness>[number];
  onJump: (label: string) => void;
}) {
  const pct = tc.total === 0 ? 100 : Math.round((tc.filled / tc.total) * 100);
  const complete = tc.missing.length === 0;
  return (
    <div
      className={cn(
        "rounded-xl border p-3 flex items-center justify-between gap-3 flex-wrap",
        complete ? "border-icm-green/20 bg-icm-green-soft" : "border-icm-amber/20 bg-icm-amber-soft",
      )}
    >
      <div className="flex items-center gap-2.5 text-[12px] font-geist text-icm-text">
        {complete ? (
          <CheckCircle2 className="w-4 h-4 text-icm-green" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-icm-amber" />
        )}
        <span className="font-semibold">
          {tc.label} · {pct}% complete
        </span>
        {!complete && (
          <span className="text-icm-text-dim">
            · Missing: {tc.missing.join(", ")}
          </span>
        )}
      </div>
      {!complete && (
        <button
          onClick={() => onJump(tc.missing[0])}
          className="text-[11px] font-geist font-semibold text-icm-text hover:underline"
        >
          Upload intake paperwork — AI can fill some fields →
        </button>
      )}
    </div>
  );
}

// =============================================================
// AI panel
// =============================================================
const PROFILE_CHAT_ENDPOINT = "https://us-central1-casemanagement-ai.cloudfunctions.net/api/api/chat";
const PROFILE_QUICK_PROMPTS = ["What's missing from this profile?", "Check compliance"];

type ProfileChatMsg = { role: "user" | "ai"; text: string };

function ProfileAIPanel({ pct }: { pct: number }) {
  const [messages, setMessages] = useState<ProfileChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ProfileChatMsg = { role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(PROFILE_CHAT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text.trim(),
          context: { page: "person_profile", module: "profile_assistant" },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.reply ?? data.message ?? data.text ?? "Sorry, no response.";
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", text: "⚠️ Couldn't reach the AI. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <aside className="w-[320px] shrink-0 border-l border-icm-border bg-icm-panel flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-icm-border/50 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg ai-gradient flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[12px] font-semibold text-icm-text font-geist">Profile assistant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-icm-green animate-pulse" />
            <span className="text-[10px] font-geist text-icm-green font-semibold">Ready</span>
          </div>
        </div>
        {/* Profile completion card — kept as-is */}
        <div className="rounded-xl border border-icm-accent/20 bg-icm-accent-soft p-3">
          <p className="text-[11px] font-mono font-bold tracking-wider text-icm-accent">PROFILE STATUS</p>
          <p className="text-[12px] text-icm-text mt-1 font-geist">
            Profile is <span className="font-bold">{pct}% complete</span>. The more complete the profile,
            the better AI performs across every module.
          </p>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0">
        {messages.length === 0 && !loading && (
          <div className="text-center py-6">
            <div className="w-10 h-10 rounded-2xl ai-gradient flex items-center justify-center mx-auto mb-2">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <p className="text-[11.5px] text-icm-text-dim font-geist leading-relaxed">
              Ask me about this profile, compliance gaps, or missing information.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "ai" && (
              <div className="w-6 h-6 rounded-lg ai-gradient flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[220px] rounded-2xl px-3 py-2 text-[11.5px] font-geist leading-relaxed relative group",
                m.role === "user"
                  ? "bg-icm-text text-icm-panel rounded-tr-sm"
                  : "bg-icm-bg border border-icm-border text-icm-text rounded-tl-sm"
              )}
            >
              {m.text}
              {m.role === "ai" && (
                <button
                  onClick={() => handleCopy(m.text, i)}
                  className="absolute -bottom-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-icm-text-faint hover:text-icm-text-dim"
                >
                  {copied === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-lg ai-gradient flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <div className="bg-icm-bg border border-icm-border rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-icm-text-dim animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-icm-text-dim animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-icm-text-dim animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
          {PROFILE_QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="h-7 px-2.5 rounded-full border border-icm-accent/30 bg-icm-accent-soft text-icm-accent text-[11px] font-geist hover:bg-icm-accent hover:text-white transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 shrink-0">
        <div className="flex items-center gap-1.5 rounded-xl border border-icm-border bg-icm-bg px-2.5 py-1.5 focus-within:border-icm-accent focus-within:ring-2 focus-within:ring-icm-accent/15 transition-all">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage(input))}
            placeholder="Ask anything…"
            className="flex-1 bg-transparent text-[11.5px] font-geist text-icm-text outline-none placeholder:text-icm-text-faint"
          />
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-icm-text-faint hover:text-icm-text-dim transition-colors"
              title="Clear chat"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-6 h-6 rounded-lg bg-icm-text text-icm-panel flex items-center justify-center disabled:opacity-40 hover:opacity-80 transition-opacity"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </aside>
  );
}

function PanelSection({
  tone,
  title,
  children,
}: {
  tone: "red" | "accent" | "green";
  title: string;
  children: React.ReactNode;
}) {
  const map = {
    red: "border-icm-red/20 bg-icm-red-soft",
    accent: "border-icm-accent/20 bg-icm-accent-soft",
    green: "border-icm-green/20 bg-icm-green-soft",
  } as const;
  const titleColor = {
    red: "text-icm-red",
    accent: "text-icm-accent",
    green: "text-icm-green",
  }[tone];
  return (
    <div className={cn("mt-3 rounded-xl border p-3", map[tone])}>
      <p className={cn("text-[10px] font-mono font-bold tracking-wider", titleColor)}>{title}</p>
      <p className="text-[11.5px] font-geist text-icm-text mt-1 leading-relaxed">{children}</p>
    </div>
  );
}

// helpers
function daysUntil(mdy: string): number {
  const [m, d, y] = mdy.split("/").map(Number);
  if (!m || !d || !y) return Infinity;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function monthsAgo(mdy: string): number {
  const [m, d, y] = mdy.split("/").map(Number);
  if (!m || !d || !y) return 0;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  return (today.getFullYear() - target.getFullYear()) * 12 + (today.getMonth() - target.getMonth());
}

// ── Status Change Modal ───────────────────────────────────────────────────────
const DISCHARGE_REASONS = [
  "Completed Services",
  "Voluntary Discharge",
  "Moved Out of Area / Jurisdiction",
  "Non-Compliance",
  "Transferred to Another Agency",
  "Hospitalization / Residential Placement",
  "Incarceration",
  "Deceased",
  "Administrative Closure",
  "No Longer Meets Eligibility",
  "Other",
];
const TRANSITION_REASONS = [
  "Moving to New Program",
  "Level of Care Change",
  "Provider Transfer",
  "Graduation / Step-Down",
  "Step-Up to Higher Level of Care",
  "Other",
];
const PENDING_REASONS = [
  "Awaiting Authorization Approval",
  "Awaiting Documentation",
  "On Hold — Client Request",
  "On Hold — Administrative",
  "Intake in Progress",
  "Other",
];
const REACTIVATION_REASONS = [
  "Returned from Discharge",
  "Authorization Reinstated",
  "Administrative Correction",
  "New Referral / Re-enrollment",
  "Other",
];

function StatusChangeModal({
  personName,
  newStatus,
  onConfirm,
  onClose,
}: {
  personName: string;
  newStatus: "active" | "transition" | "discharged" | "pending";
  onConfirm: (extra: { reason: string; effectiveDate: string; notes: string; notified: string[] }) => Promise<void>;
  onClose: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [notified, setNotified] = useState<string[]>(["Case Manager", "Supervisor"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const friendlyStatus =
    newStatus === "active" ? "Active" :
    newStatus === "transition" ? "Transition" :
    newStatus === "discharged" ? "Discharged" : "Pending";

  const reasons =
    newStatus === "discharged" ? DISCHARGE_REASONS :
    newStatus === "transition" ? TRANSITION_REASONS :
    newStatus === "pending" ? PENDING_REASONS : REACTIVATION_REASONS;

  const statusColor =
    newStatus === "active" ? "text-icm-green bg-icm-green-soft ring-icm-green/20" :
    newStatus === "discharged" ? "text-icm-red bg-icm-red-soft ring-icm-red/20" :
    newStatus === "transition" ? "text-icm-amber bg-icm-amber-soft ring-icm-amber/20" :
    "text-icm-accent bg-icm-accent-soft ring-icm-accent/20";

  const NOTIFY_OPTIONS = ["Case Manager", "Supervisor", "Billing Team", "Service Providers", "Primary Contact"];

  const toggleNotify = (opt: string) => {
    setNotified((prev) =>
      prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatus === "discharged" && !reason) {
      setError("Please select a reason for discharge.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onConfirm({ reason, effectiveDate, notes, notified });
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-foreground">Status Change</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {personName} →{" "}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${statusColor}`}>
                {friendlyStatus}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Reason */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Reason{newStatus === "discharged" && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <div className="relative mt-1">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-10 pl-3 pr-8 rounded-xl border border-border bg-background text-[13px] text-foreground outline-none focus:border-primary appearance-none"
              >
                <option value="">Select a reason…</option>
                {reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Effective Date */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Effective Date <span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
              className="mt-1 w-full h-10 px-3 rounded-xl border border-border bg-background text-[13px] text-foreground outline-none focus:border-primary"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Notes / Comments
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant notes about this status change…"
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-[13px] text-foreground resize-none outline-none focus:border-primary placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Notifications */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Notify
            </label>
            <div className="flex flex-wrap gap-2">
              {NOTIFY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleNotify(opt)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11.5px] font-medium transition-colors",
                    notified.includes(opt)
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary/20"
                  )}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${notified.includes(opt) ? "bg-primary" : "bg-muted-foreground/40"}`} />
                  {opt}
                </button>
              ))}
            </div>
            {notified.length > 0 && (
              <p className="text-[10.5px] text-muted-foreground mt-1.5">
                A notification record will be created for: {notified.join(", ")}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-[12px] text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-border text-[13px] font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                `Confirm — ${friendlyStatus}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PersonProfile;
