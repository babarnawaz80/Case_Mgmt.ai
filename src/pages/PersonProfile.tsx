import { useMemo, useState, useRef, useCallback, useEffect, lazy, Suspense } from "react";
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
import { collection, addDoc, doc, updateDoc, serverTimestamp, onSnapshot, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

import { getProfile, tabCompleteness, overallCompleteness, type TabKey, type ProfileData, LIVING_SITUATION_OPTIONS } from "@/data/profiles";
import { useServiceAuthorizations, useConsents, addConsent, updateConsent, computeConsentStatus, type ConsentRecord, type ConsentType } from "@/hooks/useFirestore";
import { useAuth } from "@/contexts/AuthContext";
import { calculateRiskScore } from "@/lib/riskEngine";
import { getRiskLabel } from "@/lib/formatDate";

const PersonServiceProviders = lazy(() => import("./PersonServiceProviders"));
const PersonConsentsTab = lazy(() => import("./PersonConsentsTab"));
function ConsentsTabWrapper({ individualId, individual }: { individualId: string; individual: any }) {
  return (
    <Suspense fallback={<div className="py-12 text-center text-[12px] text-icm-text-dim">Loading consents…</div>}>
      <PersonConsentsTab individualId={individualId} individual={individual} />
    </Suspense>
  );
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "basic", label: "Basic Info" },
  { key: "medical", label: "Medical Info" },
  { key: "monitors", label: "Monitors & Baselines" },
  { key: "court", label: "Court Involvement" },
  { key: "program", label: "Program" },
  { key: "contacts", label: "Contacts" },
  { key: "documents", label: "Documents" },
  { key: "consents", label: "Consents" },
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

  // Consent pending indicator for the tab dot
  const { data: profileConsents } = useConsents(id);
  const hasPendingConsents = profileConsents.some(
    (c) => c.status === "pending_signature" || (c.status as string) === "sent"
  );
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
                    {t.key === "consents" && hasPendingConsents && (
                      <span
                        title="Consent signature pending"
                        className="w-1.5 h-1.5 rounded-full bg-orange-500"
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
        {tab === "monitors" && <MonitorsTab profile={profile} person={person} />}
        {tab === "court" && <CourtTab profile={profile} person={person} />}
        {tab === "program" && <ProgramTab profile={profile} person={person} />}
        {tab === "contacts" && <ContactsTab profile={profile} person={person} />}
        {tab === "documents" && <DocumentsTab profile={profile} />}
        {tab === "consents" && <ConsentsTabWrapper individualId={person.id} individual={person} />}
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

    // Persist to Firestore
    updateIndividual(personId, { living_situation: newVal }).catch((err) => {
      console.error("Failed to save living situation:", err);
    });

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
          pronouns: String(data.pronouns ?? ""),
          marital_status: String(data.marital_status ?? ""),
          religion: String(data.religion ?? ""),
          communication_notes: String(data.communication_notes ?? ""),
          primary_language: String(data.primary_language ?? ""),
          secondary_language: String(data.secondary_language ?? ""),
          communication_needs: String(data.communication_needs ?? ""),
          race_ethnicity: String(data.race_ethnicity ?? ""),
        });
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="First Name" name="first_name" defaultValue={person.first_name} required />
          <EditableField label="Middle Name" name="middle_name" defaultValue={profile.middleName ?? ""} />
          <EditableField label="Last Name" name="last_name" defaultValue={person.last_name} required />
          <EditableField label="Preferred Name / Also Known As" name="preferred_name" defaultValue={profile.preferredName ?? person.preferred_name ?? ""} />
          <EditableField label="Date of Birth" name="dob" defaultValue={person.dob ?? ""} required hint={`Age: ${calcAge(person.dob)}y`} />
          <EditableSelect label="Gender" name="gender" defaultValue={person.gender === "M" ? "Male" : person.gender ?? "Female"} options={GENDER_OPTIONS} />
          <EditableField label="Pronouns" name="pronouns" defaultValue={person.pronouns ?? profile.pronouns ?? ""} />
          <EditableSelect label="Primary Language" name="primary_language" defaultValue={person.primary_language ?? profile.primaryLanguage} options={LANGUAGE_OPTIONS} required />
          <EditableSelect label="Secondary Language" name="secondary_language" defaultValue={person.secondary_language ?? profile.secondaryLanguage ?? ""} options={["—", ...LANGUAGE_OPTIONS]} />
          <div className="md:col-span-2">
            <EditableField label="Communication Needs" name="communication_needs" defaultValue={person.communication_needs ?? profile.communicationNeeds ?? ""} multiline />
          </div>
          <EditableField label="Marital Status" name="marital_status" defaultValue={person.marital_status ?? ""} />
          <EditableField label="Religion" name="religion" defaultValue={person.religion ?? ""} />
          <div className="md:col-span-2">
            <EditableField label="Communication Notes" name="communication_notes" defaultValue={person.communication_notes ?? ""} multiline />
          </div>
          <div className="md:col-span-2">
            <EditableSelect label="Race / Ethnicity" name="race_ethnicity" defaultValue={person.race_ethnicity ?? (profile.raceEthnicity ?? [])[0] ?? ""} options={["", ...RACE_OPTIONS]} />
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
          medicare_id: String(data.medicare_id ?? ""),
          state_id: String(data.state_id ?? ""),
          admitted_on: String(data.admitted_on ?? ""),
          referral_source: String(data.referral_source ?? ""),
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
          phone_secondary: String(data.secondary_phone ?? ""),
          phone_home: String(data.phone_home ?? ""),
          phone_cell: String(data.phone_cell ?? ""),
          preferred_contact: String(data.preferred_contact ?? ""),
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
          onAdd={() => demoToast("Add diagnosis")}
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
          onAdd={() => demoToast("Add medication")}
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
          onAdd={() => demoToast("Add allergy")}
        />
      </Section>

      <Section title="Health Screenings" onSave={async (data) => {
        await updateIndividual(person.id, {
          hrst_score: String(data.hrst_score ?? ""),
          hrst_scored_on: String(data.hrst_scored_on ?? ""),
          hrst_source: String(data.hrst_source ?? ""),
        });
      }}>
        <div className="rounded-lg border border-icm-border bg-icm-bg p-3 space-y-2">
          <div className="flex items-end gap-3 flex-wrap">
            <Field label="HRST / Risk Screening Score">
              <input
                name="hrst_score"
                defaultValue={person.hrst_score ?? profile.hrstScore?.toString() ?? ""}
                className="modal-input w-24"
                placeholder="—"
              />
            </Field>
            <Field label="Score date">
              <input name="hrst_scored_on" defaultValue={person.hrst_scored_on ?? profile.hrstScoredOn ?? ""} className="modal-input w-32" />
            </Field>
            <Field label="Source">
              <select name="hrst_source" className="modal-input w-44" defaultValue={person.hrst_source ?? profile.hrstSource ?? "Manual entry"}>
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
          onAdd={() => demoToast("Add provider")}
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
          onAdd={() => demoToast("Add insurance")}
        />
      </Section>

      <Section title="Clinical Summary" onSave={async (data) => {
        await updateIndividual(person.id, {
          primary_diagnosis: String(data.primary_diagnosis ?? ""),
          secondary_diagnoses: String(data.secondary_diagnoses ?? ""),
          icd10_codes: String(data.icd10_codes ?? ""),
          medical_notes: String(data.medical_notes ?? ""),
        });
      }}>
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

      <Section title="Primary Physician" onSave={async (data) => {
        await updateIndividual(person.id, {
          primary_physician_name: String(data.primary_physician_name ?? ""),
          primary_physician_phone: String(data.primary_physician_phone ?? ""),
          hospital_preference: String(data.hospital_preference ?? ""),
        });
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="Physician Name" name="primary_physician_name" defaultValue={person.primary_physician_name ?? ""} />
          <EditableField label="Physician Phone" name="primary_physician_phone" defaultValue={person.primary_physician_phone ?? ""} />
          <EditableField label="Hospital Preference" name="hospital_preference" defaultValue={person.hospital_preference ?? ""} />
        </div>
      </Section>

      <Section title="Medicaid (MA) Details" onSave={async (data) => {
        await updateIndividual(person.id, {
          ma_status: String(data.ma_status ?? ""),
          ma_id: String(data.ma_id ?? ""),
          ma_type: String(data.ma_type ?? ""),
          ma_effective_date: String(data.ma_effective_date ?? ""),
          ma_redetermination_date: String(data.ma_redetermination_date ?? ""),
        });
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="MA Status" name="ma_status" defaultValue={person.ma_status ?? ""} />
          <EditableField label="MA ID" name="ma_id" defaultValue={person.ma_id ?? ""} />
          <EditableField label="MA Type" name="ma_type" defaultValue={person.ma_type ?? ""} />
          <EditableField label="MA Effective Date" name="ma_effective_date" defaultValue={person.ma_effective_date ?? ""} />
          <EditableField label="MA Redetermination Date" name="ma_redetermination_date" defaultValue={person.ma_redetermination_date ?? ""} />
        </div>
      </Section>

      <Section title="Secondary Insurance" onSave={async (data) => {
        await updateIndividual(person.id, {
          secondary_insurance_name: String(data.secondary_insurance_name ?? ""),
          secondary_insurance_id: String(data.secondary_insurance_id ?? ""),
        });
      }}>
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

function MonitorsTab({ profile, person }: { profile: ProfileData; person: Individual }) {
  const [instruments, setInstruments] = useState([OTHER_INSTRUMENT_INIT]);

  return (
    <div className="space-y-4">
      <Section title="Standardized Scores" onSave={async (data) => {
        await updateIndividual(person.id, {
          hrst_score: String(data.hrst_score ?? ""),
          hrst_scored_on: String(data.hrst_scored_on ?? ""),
          hrst_next_due: String(data.hrst_next_due ?? ""),
          hrst_assessed_by: String(data.hrst_assessed_by ?? ""),
          hrst_source: String(data.hrst_source ?? ""),
          loc_current: String(data.loc_current ?? ""),
          loc_effective_date: String(data.loc_effective_date ?? ""),
          loc_expiration_date: String(data.loc_expiration_date ?? ""),
          loc_issued_by: String(data.loc_issued_by ?? ""),
        });
      }}>
        <div className="space-y-4">
          {/* HRST */}
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-icm-text-faint mb-2">HRST Score</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <EditableField label="Score (1–6)" name="hrst_score" defaultValue={person.hrst_score?.toString() ?? profile.hrstScore?.toString() ?? ""} />
              <EditableField label="Date of Last Assessment" name="hrst_scored_on" defaultValue={person.hrst_scored_on ?? profile.hrstScoredOn ?? ""} />
              <EditableField label="Next Due Date" name="hrst_next_due" defaultValue={person.hrst_next_due ?? ""} />
              <EditableField label="Assessed By" name="hrst_assessed_by" defaultValue={person.hrst_assessed_by ?? ""} />
              <EditableSelect
                label="Source"
                name="hrst_source"
                defaultValue={person.hrst_source ?? profile.hrstSource ?? "Manual entry"}
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
              <EditableField label="Current LOC" name="loc_current" defaultValue={person.loc_current ?? ""} />
              <EditableField label="Effective Date" name="loc_effective_date" defaultValue={person.loc_effective_date ?? ""} />
              <EditableField label="Expiration / Renewal Date" name="loc_expiration_date" defaultValue={person.loc_expiration_date ?? ""} />
              <EditableField label="Issued By" name="loc_issued_by" defaultValue={person.loc_issued_by ?? ""} />
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

      <Section title="Behavioral Baselines" onSave={async (data) => {
        await updateIndividual(person.id, {
          behavioral_monitoring_notes: String(data.behavioral_monitoring_notes ?? ""),
        });
      }}>
        <EditableField
          label="Behavioral baselines, triggers, de-escalation strategies, and support protocols"
          name="behavioral_monitoring_notes"
          defaultValue={person.behavioral_monitoring_notes ?? profile.behavioralMonitoringNotes ?? ""}
          multiline
        />
      </Section>

      <Section title="Health Baselines" onSave={async (data) => {
        await updateIndividual(person.id, {
          health_monitoring_notes: String(data.health_monitoring_notes ?? ""),
        });
      }}>
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
          name="health_monitoring_notes"
          defaultValue={person.health_monitoring_notes ?? profile.healthMonitoringNotes ?? ""}
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

function CourtTab({ profile, person }: { profile: ProfileData; person: Individual }) {
  const [hasCourtInvolvement, setHasCourtInvolvement] = useState(
    !!(profile.court || profile.legalStatus || profile.forensicInvolvement || person.court_involvement)
  );
  const [hasProbation, setHasProbation] = useState(!!person.on_probation);
  const [legalStatus, setLegalStatus] = useState(person.legal_status ?? profile.legalStatus ?? "");
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
          <Section title="Legal Status" onSave={async (data) => {
            await updateIndividual(person.id, {
              legal_status: String(data.legal_status ?? legalStatus),
              guardianship_type: String(data.guardianship_type ?? ""),
              guardian_name: String(data.guardian_name ?? ""),
              guardian_relationship: String(data.guardian_relationship ?? ""),
              guardian_phone: String(data.guardian_phone ?? ""),
              guardian_email: String(data.guardian_email ?? ""),
              guardian_address: String(data.guardian_address ?? ""),
              guardianship_effective_date: String(data.guardianship_effective_date ?? ""),
              court_involvement: hasCourtInvolvement,
            });
          }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-[10.5px] uppercase tracking-wider text-icm-text-faint font-geist block mb-1">Legal Status</label>
                <select
                  name="legal_status"
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
                  <EditableField label="Guardian / POA Name" name="guardian_name" defaultValue={person.guardian_name ?? profile.guardianName ?? ""} required />
                  <EditableSelect label="Guardian / POA Relationship" name="guardian_relationship" defaultValue={person.guardian_relationship ?? profile.guardianRelationship ?? ""} options={GUARDIAN_REL_OPTIONS} />
                  <EditableField label="Guardian / POA Phone" name="guardian_phone" defaultValue={person.guardian_phone ?? profile.guardianPhone ?? ""} required />
                  <EditableField label="Guardian / POA Email" name="guardian_email" defaultValue={person.guardian_email ?? ""} />
                  <div className="md:col-span-2">
                    <EditableField label="Guardian / POA Address" name="guardian_address" defaultValue={person.guardian_address ?? profile.guardianAddress ?? ""} />
                  </div>
                  <EditableField label="Effective Date of Guardianship / POA" name="guardianship_effective_date" defaultValue={person.guardianship_effective_date ?? ""} />
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
              onAdd={() => demoToast("Add court case")}
            />
          </Section>

          <Section title="Probation / Parole" onSave={async (data) => {
            await updateIndividual(person.id, {
              on_probation: hasProbation,
              probation_officer_name: String(data.probation_officer_name ?? ""),
              probation_officer_phone: String(data.probation_officer_phone ?? ""),
              probation_end_date: String(data.probation_end_date ?? ""),
              probation_conditions: String(data.probation_conditions ?? ""),
            });
          }}>
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
                <EditableField label="Officer Name" name="probation_officer_name" defaultValue={person.probation_officer_name ?? ""} />
                <EditableField label="Officer Phone" name="probation_officer_phone" defaultValue={person.probation_officer_phone ?? ""} />
                <EditableField label="Supervision End Date" name="probation_end_date" defaultValue={person.probation_end_date ?? ""} />
                <div className="md:col-span-2">
                  <EditableField label="Conditions" name="probation_conditions" defaultValue={person.probation_conditions ?? ""} multiline />
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

// TAB 5 — Program
// =============================================================
function ProgramTab({ profile, person }: { profile: ProfileData; person: Individual }) {
  const { id: individualId } = useParams<{ id: string }>();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);

  const [orchEngine, setOrchEngine] = useState<{
    engineName: string | null; engineId: string | null; configured: boolean;
  } | null>(null);
  const [lastEvaluatedAt, setLastEvaluatedAt] = useState<string | null>(null);

  useEffect(() => {
    const state = profile.state || (profile as any).address_state;
    if (!state) return;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "guidelines_engines"),
            where("state", "==", state), where("status", "==", "published"),
            orderBy("effectiveDate", "desc"), limit(1)
          )
        );
        if (!snap.empty) {
          const d = snap.docs[0];
          setOrchEngine({ engineName: d.data().name, engineId: d.id, configured: true });
        } else {
          setOrchEngine({ engineName: null, engineId: null, configured: false });
        }
        // Load last evaluated
        if (individualId && userProfile?.organizationId) {
          const actSnap = await getDocs(
            query(collection(db, "orchestrator_logs"),
              where("individual_id", "==", individualId),
              orderBy("timestamp", "desc"), limit(1)
            )
          ).catch(() => null);
          if (actSnap && !actSnap.empty) {
            const ts = (actSnap.docs[0].data().timestamp as any)?.toDate?.();
            if (ts) setLastEvaluatedAt(ts.toLocaleString());
          }
        }
      } catch { setOrchEngine({ engineName: null, engineId: null, configured: false }); }
    })();
  }, [profile.state, (profile as any).address_state, individualId, userProfile?.organizationId]);

  // Live enrollments from Firestore subcollection
  const [fsEnrollments, setFsEnrollments] = useState<Array<{
    id: string; program: string; serviceCategory: string;
    startDate: string; status: string; caseManager: string;
  }>>([]);

  useEffect(() => {
    if (!individualId) return;
    const q = collection(db, "individuals", individualId, "program_enrollments");
    const unsub = onSnapshot(q, (snap) => {
      setFsEnrollments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return unsub;
  }, [individualId]);

  // Merge Firestore enrollments with static seed data (Firestore wins if any exist)
  const displayEnrollments = fsEnrollments.length > 0 ? fsEnrollments : profile.enrollments;

  const indState = profile.state || (profile as any).address_state;

  // ── Program assignment state ─────────────────────────────────────────────
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [availablePrograms, setAvailablePrograms] = useState<Array<{
    id: string; name: string; state: string; payer: string; code: string; active: boolean;
  }>>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [assigningProgram, setAssigningProgram] = useState(false);
  const [programSearch, setProgramSearch] = useState("");

  // Current program data (denormalized on individual doc)
  const currentProgram = (person as any).programName ?? (person as any).program ?? null;
  const currentProgramId = (person as any).programId ?? null;
  const currentProgramState = (person as any).state ?? (person as any).address_state ?? null;
  const currentProgramPayer = (person as any).payer ?? null;
  const currentProgramCode = (person as any).programCode ?? null;

  const openProgramModal = async () => {
    setProgramModalOpen(true);
    setLoadingPrograms(true);
    setProgramSearch("");
    try {
      if (!userProfile?.organizationId) return;
      const snap = await getDocs(
        query(
          collection(db, "programs"),
          where("organizationId", "==", userProfile.organizationId)
        )
      );
      setAvailablePrograms(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as any))
          .filter((p: any) => p.active !== false)
      );
    } catch {
      toast.error("Could not load programs.");
    } finally {
      setLoadingPrograms(false);
    }
  };

  const assignProgram = async (prog: { id: string; name: string; state: string; payer: string; code: string }) => {
    if (!individualId) return;
    setAssigningProgram(true);
    try {
      await updateDoc(doc(db, "individuals", individualId), {
        programId:   prog.id,
        programName: prog.name,
        programCode: prog.code,
        program:     prog.name,
        state:       prog.state,
        payer:       prog.payer,
        updatedAt:   serverTimestamp(),
      });
      toast.success(`Program updated to ${prog.name} (${prog.state})`);
      setProgramModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update program.");
    } finally {
      setAssigningProgram(false);
    }
  };

  const filteredPrograms = programSearch
    ? availablePrograms.filter((p) =>
        `${p.name} ${p.state} ${p.payer}`.toLowerCase().includes(programSearch.toLowerCase())
      )
    : availablePrograms;

  return (
    <div className="space-y-4">

      {/* ── Current Program ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-icm-border bg-icm-bg">
          <p className="text-[10.5px] font-geist font-bold uppercase tracking-wider text-icm-text-dim">
            Current Program
          </p>
          <button
            onClick={openProgramModal}
            className="h-7 px-2.5 rounded-lg border border-icm-border bg-icm-panel text-[11px] font-geist font-semibold text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1.5 transition-colors"
          >
            {currentProgram ? "Change Program" : "+ Assign Program"}
          </button>
        </div>
        {currentProgram ? (
          <div className="p-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <ProgramDetailRow label="Program" value={currentProgram} />
              <ProgramDetailRow label="State" value={currentProgramState} />
              <ProgramDetailRow label="Payer" value={currentProgramPayer} />
              <ProgramDetailRow label="Code" value={currentProgramCode} />
            </dl>
          </div>
        ) : (
          <div className="p-5 text-center">
            <p className="text-[13px] text-icm-text-dim font-geist">No program assigned yet.</p>
            <button
              onClick={openProgramModal}
              className="mt-2 h-8 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:opacity-90"
            >
              + Assign Program
            </button>
          </div>
        )}
      </div>

      {/* ── Assign Program Modal ─────────────────────────────────────────────── */}
      {programModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setProgramModalOpen(false)}
        >
          <div
            className="w-full max-w-[520px] rounded-2xl bg-icm-panel border border-icm-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-icm-border">
              <div>
                <h2 className="font-manrope font-bold text-[15px] text-icm-text">Assign Program</h2>
                <p className="text-[11.5px] text-icm-text-dim font-geist">
                  Select the program for {person.first_name} {person.last_name}
                </p>
              </div>
              <button onClick={() => setProgramModalOpen(false)} className="w-8 h-8 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center">
                ✕
              </button>
            </div>
            <div className="p-3 border-b border-icm-border">
              <input
                value={programSearch}
                onChange={(e) => setProgramSearch(e.target.value)}
                placeholder="Search programs…"
                className="w-full h-9 px-3 rounded-xl border border-icm-border bg-white text-[12.5px] font-geist focus:outline-none focus:border-icm-border-strong"
                autoFocus
              />
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {loadingPrograms ? (
                <div className="py-8 flex items-center justify-center gap-2 text-icm-text-dim">
                  <div className="w-4 h-4 border-2 border-icm-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-[12px] font-geist">Loading programs…</span>
                </div>
              ) : filteredPrograms.length === 0 ? (
                <p className="text-center text-[12px] text-icm-text-dim py-8">No active programs found.</p>
              ) : (
                <div className="p-2 space-y-1.5">
                  {filteredPrograms.map((prog) => (
                    <div
                      key={prog.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-icm-border p-3 hover:border-icm-border-strong hover:bg-icm-bg transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-manrope font-bold text-[13.5px] text-icm-text">{prog.name}</p>
                        <p className="text-[11.5px] text-icm-text-dim font-geist mt-0.5">
                          {[prog.state, prog.payer, prog.code ? `Code: ${prog.code}` : null]
                            .filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <button
                        disabled={assigningProgram}
                        onClick={() => assignProgram(prog)}
                        className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-geist font-semibold shrink-0 hover:opacity-90 disabled:opacity-50"
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Orchestrator Engine Status */}
      {orchEngine !== null && (
        <div className="rounded-xl border overflow-hidden"
          style={{ borderColor: orchEngine.configured ? "#ddd6fe" : "#fcd34d" }}>
          <div className="flex items-center justify-between px-4 py-2 border-b"
            style={{ backgroundColor: orchEngine.configured ? "#f5f3ff" : "#fffbeb", borderColor: orchEngine.configured ? "#ddd6fe" : "#fcd34d" }}>
            <span className="text-[10px] font-geist font-bold uppercase tracking-wider"
              style={{ color: orchEngine.configured ? "#5b21b6" : "#92400e" }}>
              AI ORCHESTRATOR ENGINE
            </span>
            {orchEngine.configured && orchEngine.engineId && (
              <button onClick={() => navigate(`/agents/guidelines/${orchEngine.engineId}`)}
                className="text-[11px] font-geist font-semibold text-indigo-600 hover:underline">
                View engine →
              </button>
            )}
          </div>
          <div className="px-4 py-3" style={{ backgroundColor: orchEngine.configured ? "#f5f3ff" : "#fffbeb" }}>
            {orchEngine.configured ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span style={{ color: "#7c3aed", fontSize: "14px" }}>✦</span>
                  <span className="font-geist font-semibold text-[14px]" style={{ color: "#1e1b4b" }}>{orchEngine.engineName}</span>
                  <span className="text-[10px] font-geist font-bold text-white px-1.5 py-0.5 rounded" style={{ background: "#7c3aed" }}>ACTIVE</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {["PCP compliance checks", "Authorization monitoring", "Documentation drafting", "Billing gap detection"].map(item => (
                    <div key={item} className="flex items-center gap-1.5">
                      <span className="font-bold" style={{ color: "#7c3aed" }}>✓</span>
                      <span className="text-[12px] font-geist" style={{ color: "#4c1d95" }}>{item}</span>
                    </div>
                  ))}
                </div>
                {lastEvaluatedAt && (
                  <p className="text-[11px] font-geist" style={{ color: "#6d28d9" }}>
                    Last evaluated: {lastEvaluatedAt}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-geist font-semibold text-[13px]" style={{ color: "#92400e" }}>
                  <span>⚠</span>
                  <span>No guidelines engine configured for <strong>{indState || "this state"}</strong></span>
                </div>
                <p className="text-[12px] font-geist leading-relaxed" style={{ color: "#78350f" }}>
                  AI compliance checks, PCP generation, and authorization monitoring are inactive for this individual.
                  Ask your administrator to add a guidelines engine for {indState || "this state"} in AI Agents → Guidelines Engines.
                </p>
                <button onClick={() => navigate("/agents/guidelines/new")}
                  className="text-[12px] font-geist font-semibold hover:underline" style={{ color: "#7c3aed" }}>
                  + Add {indState || "state"} guidelines engine →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Section title="Current Programs">
        <DataTable
          columns={["Program", "Service Category", "Start", "Status", "Case Manager"]}
          rows={displayEnrollments.map((e) => [
            <span key="p" className="font-semibold">{e.program}</span>,
            e.serviceCategory,
            e.startDate,
            <ProgramStatusBadge key="s" status={e.status as any} />,
            e.caseManager,
          ])}
          emptyText="Not enrolled in any program yet."
          addLabel="Enroll in program"
          onAdd={() => setEnrollModalOpen(true)}
        />
      </Section>

      <Section title="Service Categories">
        {displayEnrollments.map((e) => (
          <div
            key={e.serviceCategory}
            className="rounded-lg border border-icm-border bg-icm-bg p-3 mb-2 last:mb-0"
          >
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-icm-text font-geist">{e.serviceCategory}</p>
            </div>
            <p className="text-[11.5px] text-icm-text-dim mt-0.5">
              Program: {e.program} · Status: {e.status} · Started: {e.startDate}
            </p>
          </div>
        ))}
      </Section>

      {/* Service Providers — live from individual_providers collection */}
      {individualId && (
        <Suspense fallback={null}>
          <PersonServiceProviders individualId={individualId} individual={person as any} />
        </Suspense>
      )}

      <FundingStreamsSection profile={profile} />

      {enrollModalOpen && individualId && (
        <EnrollProgramModal
          individualId={individualId}
          caseManagerName={userProfile?.displayName ?? "Case Manager"}
          onClose={() => setEnrollModalOpen(false)}
        />
      )}
    </div>
  );
}

// ---------- Enroll in Program Modal ----------
function EnrollProgramModal({
  individualId,
  caseManagerName,
  onClose,
}: {
  individualId: string;
  caseManagerName: string;
  onClose: () => void;
}) {
  const { userProfile } = useAuth();
  const [programs, setPrograms] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    programId: "",
    programName: "",
    serviceCategory: "",
    startDate: new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
    status: "Active" as "Active" | "Pending" | "On Hold",
  });

  // Load org programs from Firestore
  useEffect(() => {
    if (!userProfile?.organizationId) return;
    const q = query(
      collection(db, "programs"),
      where("organizationId", "==", userProfile.organizationId)
    );
    getDocs(q).then((snap) => {
      setPrograms(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setLoadingPrograms(false);
    }).catch(() => setLoadingPrograms(false));
  }, [userProfile?.organizationId]);

  const handleSave = async () => {
    if (!form.programName) { toast.error("Select a program"); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, "individuals", individualId, "program_enrollments"), {
        program: form.programName,
        serviceCategory: form.serviceCategory || form.programName,
        startDate: form.startDate,
        status: form.status,
        caseManager: caseManagerName,
        enrolledAt: serverTimestamp(),
        enrolledBy: userProfile?.uid ?? "",
        organizationId: userProfile?.organizationId ?? "",
      });
      toast.success("Enrolled in " + form.programName);
      onClose();
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-icm-panel rounded-2xl border border-icm-border shadow-xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-manrope font-bold text-icm-text">Enroll in Program</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-icm-bg text-icm-text-dim">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Program selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wide font-geist font-semibold text-icm-text-dim">Program *</label>
          {loadingPrograms ? (
            <div className="flex items-center gap-2 py-2 text-[12px] text-icm-text-dim font-geist">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading programs…
            </div>
          ) : programs.length === 0 ? (
            <p className="text-[12px] text-icm-text-dim font-geist py-2">
              No programs configured. Go to <span className="font-semibold">Settings → Programs</span> to add programs first.
            </p>
          ) : (
            <select
              value={form.programId}
              onChange={(e) => {
                const prog = programs.find((p) => p.id === e.target.value);
                setForm((f) => ({ ...f, programId: e.target.value, programName: prog?.name ?? "" }));
              }}
              className="w-full h-9 rounded-lg border border-icm-border bg-icm-bg px-3 text-[13px] font-geist text-icm-text focus:outline-none focus:border-icm-accent"
            >
              <option value="">Select a program…</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ""}</option>
              ))}
            </select>
          )}
        </div>

        {/* Service Category */}
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wide font-geist font-semibold text-icm-text-dim">Service Category</label>
          <input
            type="text"
            placeholder="e.g. Medicaid | Case Management"
            value={form.serviceCategory}
            onChange={(e) => setForm((f) => ({ ...f, serviceCategory: e.target.value }))}
            className="w-full h-9 rounded-lg border border-icm-border bg-icm-bg px-3 text-[13px] font-geist text-icm-text focus:outline-none focus:border-icm-accent"
          />
        </div>

        {/* Start Date + Status row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wide font-geist font-semibold text-icm-text-dim">Start Date</label>
            <input
              type="date"
              value={form.startDate.split("/").length === 3
                ? `${form.startDate.split("/")[2]}-${form.startDate.split("/")[0].padStart(2,"0")}-${form.startDate.split("/")[1].padStart(2,"0")}`
                : form.startDate}
              onChange={(e) => {
                const d = new Date(e.target.value + "T12:00:00");
                setForm((f) => ({ ...f, startDate: d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) }));
              }}
              className="w-full h-9 rounded-lg border border-icm-border bg-icm-bg px-3 text-[13px] font-geist text-icm-text focus:outline-none focus:border-icm-accent"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wide font-geist font-semibold text-icm-text-dim">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
              className="w-full h-9 rounded-lg border border-icm-border bg-icm-bg px-3 text-[13px] font-geist text-icm-text focus:outline-none focus:border-icm-accent"
            >
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg border border-icm-border text-[12.5px] font-geist font-semibold text-icm-text-dim hover:text-icm-text"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.programName}
            className="h-8 px-4 rounded-lg bg-icm-accent text-white text-[12.5px] font-geist font-semibold hover:bg-icm-accent/90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Enroll
          </button>
        </div>
      </div>
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
// ─── ProgramDetailRow helper (used in ProgramTab) ────────────────────────────
function ProgramDetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
        {label}
      </dt>
      <dd className="text-[13px] font-geist text-icm-text mt-0.5">
        {value || <span className="text-icm-text-faint">—</span>}
      </dd>
    </div>
  );
}

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
              <button className="text-icm-text-faint hover:text-icm-text" onClick={() => demoToast("Edit contact")}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {profile.emergencyContacts.length === 0 && <Empty text="No emergency contacts." />}
          <button onClick={() => demoToast("Add emergency contact")} className="mt-1 h-8 px-3 rounded-lg border border-dashed border-icm-border text-[11.5px] text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1" id="add-emergency-contact">
            <Plus className="w-3.5 h-3.5" /> Add contact
          </button>
        </div>
      </Section>

      <Section title="Emergency Contact (Primary)" onSave={async (data) => {
        await updateIndividual(person.id, {
          emergency_contact_name: String(data.emergency_contact_name ?? ""),
          emergency_contact_relation: String(data.emergency_contact_relation ?? ""),
          emergency_contact_phone: String(data.emergency_contact_phone ?? ""),
          emergency_contact_phone2: String(data.emergency_contact_phone2 ?? ""),
          emergency_contact_email: String(data.emergency_contact_email ?? ""),
        });
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="Name" name="emergency_contact_name" defaultValue={person.emergency_contact_name ?? ""} />
          <EditableField label="Relationship" name="emergency_contact_relation" defaultValue={person.emergency_contact_relation ?? ""} />
          <EditableField label="Phone" name="emergency_contact_phone" defaultValue={person.emergency_contact_phone ?? ""} />
          <EditableField label="Alternate Phone" name="emergency_contact_phone2" defaultValue={person.emergency_contact_phone2 ?? ""} />
          <EditableField label="Email" name="emergency_contact_email" defaultValue={person.emergency_contact_email ?? ""} />
        </div>
      </Section>

      <Section title="Guardian / POA" onSave={async (data) => {
        await updateIndividual(person.id, {
          guardian_name: String(data.guardian_name ?? ""),
          guardian_relationship: String(data.guardian_relationship ?? ""),
          guardian_phone: String(data.guardian_phone ?? ""),
          guardian_email: String(data.guardian_email ?? ""),
          poa_name: String(data.poa_name ?? ""),
          poa_phone: String(data.poa_phone ?? ""),
        });
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="Guardian Name" name="guardian_name" defaultValue={person.guardian_name ?? ""} />
          <EditableField label="Guardian Relationship" name="guardian_relationship" defaultValue={person.guardian_relationship ?? ""} />
          <EditableField label="Guardian Phone" name="guardian_phone" defaultValue={person.guardian_phone ?? ""} />
          <EditableField label="Guardian Email" name="guardian_email" defaultValue={person.guardian_email ?? ""} />
          <EditableField label="POA Name" name="poa_name" defaultValue={person.poa_name ?? ""} />
          <EditableField label="POA Phone" name="poa_phone" defaultValue={person.poa_phone ?? ""} />
        </div>
      </Section>

      <Section title="Care Team" onSave={async (data) => {
        await updateIndividual(person.id, {
          assigned_case_manager: String(data.care_case_manager ?? ""),
          supervisor: String(data.care_supervisor ?? ""),
          program_coordinator: String(data.care_program_coordinator ?? ""),
        });
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="Case Manager" name="care_case_manager" defaultValue={person.assigned_case_manager ?? profile.caseManager ?? ""} />
          <EditableField label="Supervisor" name="care_supervisor" defaultValue={person.supervisor ?? profile.supervisor ?? ""} />
          <EditableField label="Program Coordinator" name="care_program_coordinator" defaultValue={person.program_coordinator ?? profile.programCoordinator ?? ""} />
        </div>
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
          onAdd={() => demoToast("Add support circle member")}
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
          onAdd={() => demoToast("Add external provider")}
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

      {/* Communication Preferences */}
      <CommunicationPreferencesSection person={person} />
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
          <button onClick={() => demoToast("Upload document")} className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[11.5px] font-semibold hover:opacity-90 flex items-center gap-1">
            <Upload className="w-3.5 h-3.5" /> Upload document
          </button>
        </div>
        {profile.documents.length === 0 ? (
          <div className="rounded-lg border border-icm-border bg-icm-bg p-8 text-center">
            <FileText className="w-8 h-8 text-icm-text-faint mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-icm-text">No documents uploaded</p>
            <p className="text-[11.5px] text-icm-text-dim mt-1">
              Upload intake paperwork, insurance cards, and medical records here.
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
      <Section title="Case Assignment" onSave={async (data) => {
        await updateIndividual(person.id, {
          assigned_case_manager: String(data.assigned_case_manager ?? ""),
          secondary_case_manager: String(data.secondary_case_manager ?? ""),
          supervisor: String(data.supervisor ?? ""),
          program_coordinator: String(data.program_coordinator ?? ""),
        });
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="Assigned Case Manager" name="assigned_case_manager" defaultValue={person.assigned_case_manager ?? profile.caseManager ?? ""} required />
          <EditableField label="Secondary Case Manager" name="secondary_case_manager" defaultValue={person.secondary_case_manager ?? profile.secondaryCaseManager ?? ""} />
          <EditableField label="Supervisor" name="supervisor" defaultValue={person.supervisor ?? profile.supervisor ?? ""} />
          <EditableField label="Program Coordinator" name="program_coordinator" defaultValue={person.program_coordinator ?? profile.programCoordinator ?? ""} />
        </div>
        <p className="text-[11px] text-icm-text-faint mt-2 font-geist">
          Assignment changes are managed in Admin Settings.
        </p>
      </Section>

      <Section title="Caseload Weighting" onSave={async (data) => {
        await updateIndividual(person.id, {
          caseload_weight: String(data.caseload_weight ?? ""),
          complexity: String(data.complexity ?? ""),
        });
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="Caseload Weight" name="caseload_weight" defaultValue={person.caseload_weight?.toString() ?? profile.caseloadWeight?.toString() ?? ""} />
          <EditableField label="Complexity Level" name="complexity" defaultValue={person.complexity ?? profile.complexity ?? "Standard"} />
        </div>
      </Section>

      <Section title="Intake & Discharge" onSave={async (data) => {
        await updateIndividual(person.id, {
          referral_date: String(data.referral_date ?? ""),
          referral_source: String(data.referral_source ?? ""),
          admission_date: String(data.admission_date ?? ""),
          admission_type: String(data.admission_type ?? ""),
          previous_agency: String(data.previous_agency ?? ""),
          discharge_date: String(data.discharge_date ?? ""),
          discharge_reason: String(data.discharge_reason ?? ""),
        });
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="Referral Date" name="referral_date" defaultValue={person.referral_date ?? (profile as any).referralDate ?? ""} />
          <EditableField label="Referral Source" name="referral_source" defaultValue={person.referral_source ?? ""} />
          <EditableField label="Admission Date" name="admission_date" defaultValue={person.admission_date ?? person.admittedOn ?? ""} />
          <EditableField label="Admission Type" name="admission_type" defaultValue={person.admission_type ?? (profile as any).admissionType ?? ""} />
          <EditableField label="Previous Agency" name="previous_agency" defaultValue={person.previous_agency ?? (profile as any).previousAgency ?? ""} />
          <EditableField label="Discharge Date" name="discharge_date" defaultValue={person.discharge_date ?? (profile as any).dischargeDate ?? (dischargeDone ? dischargeDate : "")} />
          <EditableField label="Discharge Reason" name="discharge_reason" defaultValue={(profile as any).dischargeReason ?? (dischargeDone ? dischargeReason : "")} />
        </div>
      </Section>

      <Section title="Program & Service" onSave={async (data) => {
        await updateIndividual(person.id, {
          program_type: String(data.program_type ?? ""),
          waiver_type: String(data.waiver_type ?? ""),
          service_category: String(data.service_category ?? ""),
          funding_stream: String(data.funding_stream ?? ""),
          case_number: String(data.case_number ?? ""),
        });
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="Program Type" name="program_type" defaultValue={person.program_type ?? ""} />
          <EditableField label="Waiver Type" name="waiver_type" defaultValue={person.waiver_type ?? ""} />
          <EditableField label="Service Category" name="service_category" defaultValue={person.service_category ?? ""} />
          <EditableField label="Funding Stream" name="funding_stream" defaultValue={person.funding_stream ?? ""} />
          <EditableField label="Case Number" name="case_number" defaultValue={person.case_number ?? ""} />
        </div>
      </Section>

      <Section title="Legal & Care Planning" onSave={async (data) => {
        await updateIndividual(person.id, {
          legal_status: String(data.legal_status_admin ?? ""),
          pcp_status: String(data.pcp_status ?? ""),
          next_isp_date: String(data.next_isp_date ?? ""),
          last_annual_plan_date: String(data.last_annual_plan_date ?? ""),
        });
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <EditableField label="Legal Status" name="legal_status_admin" defaultValue={person.legal_status ?? ""} />
          <EditableField label="PCP Status" name="pcp_status" defaultValue={person.pcp_status ?? ""} />
          <EditableField label="Next ISP Date" name="next_isp_date" defaultValue={person.next_isp_date ?? ""} />
          <EditableField label="Last Annual Plan Date" name="last_annual_plan_date" defaultValue={person.last_annual_plan_date ?? ""} />
        </div>
      </Section>

      <Section title="Compliance & Quality" onSave={async (data) => {
        await updateIndividual(person.id, {
          last_chart_review: String(data.last_chart_review ?? ""),
          next_chart_review_due: String(data.next_chart_review_due ?? ""),
        });
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-3">
          <EditableField label="Last Chart Review" name="last_chart_review" defaultValue={person.last_chart_review ?? (profile as any).lastChartReview ?? ""} />
          <EditableField label="Next Chart Review Due" name="next_chart_review_due" defaultValue={person.next_chart_review_due ?? (profile as any).nextChartReviewDue ?? ""} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
// Communication Preferences Section (ContactsTab)
// =============================================================
function CommunicationPreferencesSection({ person }: { person: Individual }) {
  const [prefs, setPrefs] = useState({
    preferred_contact_method: (person as any).communication_preferences?.preferred_contact_method ?? "",
    best_time_to_contact:     (person as any).communication_preferences?.best_time_to_contact ?? "",
    guardian_must_be_present: (person as any).communication_preferences?.guardian_must_be_present ?? false,
    consent_sms:              (person as any).communication_preferences?.consent_sms ?? "",
    consent_email:            (person as any).communication_preferences?.consent_email ?? "",
    do_not_contact_directly:  (person as any).communication_preferences?.do_not_contact_directly ?? false,
    communication_notes:      (person as any).communication_preferences?.communication_notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  function patch(key: string, value: string | boolean) {
    setPrefs((p) => ({ ...p, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateIndividual(person.id, { communication_preferences: prefs } as any);
      toast.success("Communication preferences saved.");
      setDirty(false);
    } catch {
      toast.error("Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Communication Preferences">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <label className="block">
          <span className="text-[10.5px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1 block">Preferred Contact Method</span>
          <select
            value={prefs.preferred_contact_method}
            onChange={(e) => patch("preferred_contact_method", e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text appearance-none"
          >
            <option value="">— Select —</option>
            <option value="Phone">Phone</option>
            <option value="Email">Email</option>
            <option value="Secure Portal">Secure Portal</option>
            <option value="SMS">SMS</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[10.5px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1 block">Best Time to Contact</span>
          <input
            type="text"
            value={prefs.best_time_to_contact}
            onChange={(e) => patch("best_time_to_contact", e.target.value)}
            placeholder="e.g. Mornings after 9 AM"
            className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text"
          />
        </label>
        <label className="block">
          <span className="text-[10.5px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1 block">Consent to Contact via SMS</span>
          <select
            value={prefs.consent_sms}
            onChange={(e) => patch("consent_sms", e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text appearance-none"
          >
            <option value="">— Select —</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="Not obtained">Not obtained</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[10.5px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1 block">Consent to Contact via Email</span>
          <select
            value={prefs.consent_email}
            onChange={(e) => patch("consent_email", e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text appearance-none"
          >
            <option value="">— Select —</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="Not obtained">Not obtained</option>
          </select>
        </label>
      </div>

      <div className="space-y-2 mb-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.guardian_must_be_present}
            onChange={(e) => patch("guardian_must_be_present", e.target.checked)}
            className="mt-0.5 rounded border-icm-border w-4 h-4"
          />
          <span className="text-[12.5px] font-geist text-icm-text leading-snug">
            Guardian must be present for all communications
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.do_not_contact_directly}
            onChange={(e) => patch("do_not_contact_directly", e.target.checked)}
            className="mt-0.5 rounded border-icm-border w-4 h-4"
          />
          <span className="text-[12.5px] font-geist text-icm-text leading-snug">
            Do not contact individual directly — route all contact through guardian
          </span>
        </label>
      </div>

      <label className="block mb-3">
        <span className="text-[10.5px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1 block">Communication Notes</span>
        <textarea
          value={prefs.communication_notes}
          onChange={(e) => patch("communication_notes", e.target.value)}
          rows={3}
          placeholder="Any additional notes about how to communicate with this individual…"
          className="w-full px-3 py-2 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text leading-relaxed"
        />
      </label>

      {dirty && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-4 rounded-xl bg-icm-accent text-white text-[12px] font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Preferences"}
        </button>
      )}
    </Section>
  );
}

// =============================================================
// Consent Section (AdminTab)
// =============================================================
const CONSENT_TYPES: ConsentType[] = [
  "General Consent",
  "Release of Information",
  "Guardian Consent for Plan Documents",
  "Photo/Video Consent",
  "Communication Consent",
];

const CONSENT_STATUS_TONE: Record<string, string> = {
  Active:  "bg-icm-green-soft text-icm-green",
  Expired: "bg-icm-amber-soft text-icm-amber",
  Revoked: "bg-icm-red-soft text-icm-red",
};

function ConsentSection({ individualId }: { individualId: string }) {
  const { data: consents, loading } = useConsents(individualId);
  const { userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const emptyForm = {
    consent_type: "General Consent" as ConsentType,
    given_by_name: "",
    relationship: "",
    date_obtained: new Date().toISOString().slice(0, 10),
    expiration_date: "",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  function field(name: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [name]: e.target.value }));
  }

  async function handleSave() {
    if (!form.given_by_name.trim() || !form.relationship.trim() || !form.date_obtained) {
      toast.error("Name, relationship, and date obtained are required.");
      return;
    }
    setSaving(true);
    try {
      const status = computeConsentStatus({ expiration_date: form.expiration_date || undefined, status: "Active", revoked_date: undefined });
      await addConsent(individualId, {
        ...form,
        individual_id: individualId,
        expiration_date: form.expiration_date || undefined,
        status,
        created_by_uid: userProfile?.uid,
        created_by_name: userProfile?.displayName ?? userProfile?.email ?? "",
      });
      toast.success("Consent record added.");
      setOpen(false);
      setForm(emptyForm);
    } catch {
      toast.error("Failed to save consent record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(c: ConsentRecord) {
    if (!confirm(`Revoke "${c.consent_type}"? This cannot be undone.`)) return;
    try {
      await updateConsent(individualId, c.id, {
        status: "Revoked",
        revoked_date: new Date().toISOString().slice(0, 10),
        revoked_by: userProfile?.displayName ?? userProfile?.email ?? "User",
      });
      toast.success("Consent revoked.");
    } catch {
      toast.error("Failed to revoke consent.");
    }
  }

  return (
    <Section
      title="Consent Records"
      onSave={undefined}
    >
      {loading ? (
        <p className="text-[12px] text-icm-text-dim italic">Loading…</p>
      ) : consents.length === 0 ? (
        <p className="text-[12px] text-icm-text-dim italic">No consent records on file.</p>
      ) : (
        <div className="space-y-2 mb-3">
          {consents.map((c) => (
            <div key={c.id} className="rounded-lg border border-icm-border bg-icm-bg p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-icm-text">{c.consent_type}</span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${CONSENT_STATUS_TONE[c.status] ?? "bg-icm-bg text-icm-text-dim"}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-[11.5px] text-icm-text-dim mt-0.5">
                  {c.given_by_name} · {c.relationship} · Obtained: <span className="font-mono">{c.date_obtained}</span>
                  {c.expiration_date && ` · Expires: `}{c.expiration_date && <span className="font-mono">{c.expiration_date}</span>}
                </p>
                {c.notes && <p className="text-[11px] text-icm-text-faint mt-0.5 italic">{c.notes}</p>}
              </div>
              {c.status === "Active" && (
                <button
                  onClick={() => handleRevoke(c)}
                  className="text-[11px] text-icm-red hover:underline shrink-0 font-medium"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        className="h-8 px-3 rounded-lg border border-icm-border text-[12px] font-medium text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" /> Add Consent
      </button>

      {/* Add Consent Modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-icm-panel rounded-xl border border-icm-border w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-manrope font-bold text-[15px] text-icm-text">Add Consent Record</h3>
              <button onClick={() => setOpen(false)} className="text-icm-text-dim hover:text-icm-text">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <ModalField label="Consent Type">
                <select className="modal-input" value={form.consent_type} onChange={field("consent_type")}>
                  {CONSENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </ModalField>
              <ModalField label="Consent Given By (Name)">
                <input className="modal-input" value={form.given_by_name} onChange={field("given_by_name")} placeholder="Full name" />
              </ModalField>
              <ModalField label="Relationship">
                <input className="modal-input" value={form.relationship} onChange={field("relationship")} placeholder="e.g. Guardian, Individual, Parent" />
              </ModalField>
              <ModalField label="Date Obtained">
                <input type="date" className="modal-input" value={form.date_obtained} onChange={field("date_obtained")} />
              </ModalField>
              <ModalField label="Expiration Date (leave blank if no expiry)">
                <input type="date" className="modal-input" value={form.expiration_date} onChange={field("expiration_date")} />
              </ModalField>
              <ModalField label="Notes (optional)">
                <textarea className="modal-input min-h-[60px]" value={form.notes} onChange={field("notes")} placeholder="Any additional context…" />
              </ModalField>
            </div>
            <div className="flex items-center gap-2 mt-5 justify-end">
              <button onClick={() => setOpen(false)} className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-semibold text-icm-text-dim hover:text-icm-text">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="h-9 px-4 rounded-xl bg-icm-accent text-white text-[12px] font-semibold hover:opacity-90 disabled:opacity-50">
                {saving ? "Saving…" : "Save Consent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Section>
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      const formData = formRef.current ? new FormData(formRef.current) : new FormData();
      const data = Object.fromEntries(formData.entries()) as Record<string, string>;
      await onSave(data);
      setSaved(true);
      toast.success(`${title} saved`);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(`Failed to save ${title}:`, err);
      toast.error(`Failed to save ${title}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="icm-section-title">{title}</h3>
        {onSave && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="text-[11px] font-geist font-medium text-white bg-icm-accent hover:opacity-90 px-2.5 py-1 rounded-md disabled:opacity-60 flex items-center gap-1.5"
          >
            {saving
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : saved
                ? <CheckCircle2 className="w-3 h-3" />
                : null}
            {saved ? "Saved" : "Save"}
          </button>
        )}
      </div>
      <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          {children}
        </fieldset>
      </form>
      <style>{`.modal-input { width:100%; height:32px; padding:0 8px; border-radius:8px; border:1px solid hsl(var(--icm-border)); background:hsl(var(--icm-panel)); font-size:12px; color:hsl(var(--icm-text)); font-family: inherit; transition: border-color 0.15s; }
      .modal-input:focus { outline: none; border-color: hsl(var(--icm-accent)); box-shadow: 0 0 0 2px hsl(var(--icm-accent)/0.15); }
      textarea.modal-input { padding:8px; height:auto; resize:vertical; }`}</style>
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
  onAdd,
}: {
  columns: string[];
  rows: React.ReactNode[][];
  emptyText: string;
  addLabel?: string;
  compact?: boolean;
  onAdd?: () => void;
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
        <button
          onClick={onAdd}
          className="mt-2 h-8 px-3 rounded-lg border border-dashed border-icm-border text-[11.5px] text-icm-text-dim hover:text-icm-text hover:border-icm-border-strong flex items-center gap-1"
        >
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
