import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft,
  Sparkles,
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Download,
  Send,
  Upload,
  FileText,
  FileImage,
  File as FileIcon,
  Paperclip,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { getPerson } from "@/data/people";
import {
  REFERRAL_TYPES,
  addReferral,
  providers,
  suggestProviders,
  type Priority,
  type Provider,
  type Referral,
  type ReferralAttachment,
  type ReferralType,
  type SourceOfNeed,
} from "@/data/referrals";

const SOURCES: SourceOfNeed[] = [
  "Individual's request",
  "Guardian / family request",
  "Case manager recommendation",
  "Assessment finding",
  "ISP / Care Plan goal",
  "Monitoring form finding",
  "Incident follow-up",
  "Compliance requirement",
  "Other",
];

const INFO_OPTIONS = [
  "Name and contact information",
  "Date of birth",
  "Diagnosis",
  "Medicaid / insurance information",
  "Assessment summary",
  "Care Plan / ISP summary",
  "Recent progress notes",
  "Behavioral support plan",
];

const TIMEFRAMES = ["24 hours", "3 days", "1 week", "2 weeks", "30 days", "No timeline"];
const METHODS = ["Phone call", "Fax", "Email", "Online portal", "Walk-in", "Mail", "Electronic referral"];

const PersonReferralForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const person = getPerson(id ?? "");

  // AI-prefill defaults (from ambient session detection)
  const [aiBanner, setAiBanner] = useState(true);
  const [type, setType] = useState<ReferralType>("Employment & Vocational");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState<Priority>("Routine");
  const [reason, setReason] = useState(
    "Joseph expressed interest in part-time employment during the 04/27/2026 ambient session. He has prior warehouse experience and prefers structured, predictable tasks.",
  );
  const [source, setSource] = useState<SourceOfNeed>("Individual's request");
  const [linkedGoal, setLinkedGoal] = useState("");
  const [urgencyDate, setUrgencyDate] = useState("");

  // Provider
  const [providerTab, setProviderTab] = useState<"search" | "manual">("search");
  const [providerQuery, setProviderQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [manualProvider, setManualProvider] = useState({
    name: "",
    contact: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    medicaid: "Unknown" as "Yes" | "No" | "Unknown",
    accepting: "Unknown" as "Yes" | "No" | "Unknown",
    notes: "",
  });

  // Contact
  const [referralMethod, setReferralMethod] = useState("Online portal");
  const [contactDate, setContactDate] = useState(new Date().toISOString().slice(0, 10));
  const [contactPerson, setContactPerson] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");

  // Info shared
  const [infoShared, setInfoShared] = useState<string[]>([
    "Name and contact information",
    "Date of birth",
    "Medicaid / insurance information",
  ]);
  const [consent, setConsent] = useState(false);
  const [consentDate, setConsentDate] = useState("");
  const [consentMethod, setConsentMethod] = useState<"Verbal" | "Written">("Verbal");

  // Follow-up
  const [timeframe, setTimeframe] = useState("1 week");
  const [followUpDate, setFollowUpDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("Kathy Adams");
  const [notes, setNotes] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attachments
  const [attachments, setAttachments] = useState<ReferralAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email modal
  const [showEmail, setShowEmail] = useState(false);

  if (!person) {
    return (
      <ICMShell title="New Referral" showAIPanel={false}>
        <p className="text-[13px] text-icm-text-dim font-geist">Person not found.</p>
      </ICMShell>
    );
  }

  const aiSuggestedProviders = suggestProviders(type, "Carroll");
  const filteredProviders = providers.filter(
    (p) =>
      (p.type === type || providerQuery) &&
      (!providerQuery ||
        p.name.toLowerCase().includes(providerQuery.toLowerCase()) ||
        p.specialties?.some((s) => s.toLowerCase().includes(providerQuery.toLowerCase()))),
  );

  const validate = (): string | null => {
    if (!reason.trim()) return "Reason for referral is required.";
    if (providerTab === "search" && !selectedProvider) return "Select a provider from the directory.";
    if (providerTab === "manual" && !manualProvider.name.trim()) return "Provider name is required.";
    if (!consent) return "Consent to share information must be documented before submitting.";
    return null;
  };

  const onSubmit = () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setShowConfirm(true);
  };

  const finalizeSubmit = () => {
    const newId = `R-${String(Date.now()).slice(-4)}`;
    const providerName =
      providerTab === "search" ? selectedProvider!.name : manualProvider.name;
    const newRef: Referral = {
      id: newId,
      personId: id ?? "",
      date: formatDate(date),
      type,
      priority,
      reason,
      sourceOfNeed: source,
      linkedGoalLabel: linkedGoal || undefined,
      urgencyDate: urgencyDate || undefined,
      providerId: selectedProvider?.id,
      providerName,
      providerPhone:
        providerTab === "search" ? selectedProvider?.phone : manualProvider.phone,
      providerEmail:
        providerTab === "search" ? selectedProvider?.email : manualProvider.email,
      providerAddress:
        providerTab === "search"
          ? `${selectedProvider?.address}, ${selectedProvider?.city}, ${selectedProvider?.state} ${selectedProvider?.zip}`
          : `${manualProvider.address}, ${manualProvider.city}, ${manualProvider.state} ${manualProvider.zip}`,
      acceptsMedicaid:
        providerTab === "search"
          ? selectedProvider?.acceptsMedicaid
          : manualProvider.medicaid === "Yes",
      referralMethod,
      contactDate: formatDate(contactDate),
      contactPerson,
      referenceNumber,
      infoShared,
      consentDocumented: consent,
      consentDate: consentDate ? formatDate(consentDate) : undefined,
      consentMethod,
      expectedTimeframe: timeframe,
      followUpDate: followUpDate ? formatDate(followUpDate) : undefined,
      assignedTo,
      notes,
      status: "Submitted",
      daysOpen: 0,
      lastActivity: formatDate(date),
      timeline: [
        {
          id: "t1",
          date: formatDate(date),
          type: "created",
          title: "Referral created",
          by: assignedTo,
        },
        {
          id: "t2",
          date: formatDate(date),
          type: "submitted",
          title: `Submitted to ${providerName}`,
          notes: referenceNumber ? `Reference: ${referenceNumber}` : undefined,
          by: assignedTo,
        },
      ],
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    addReferral(newRef);
    navigate(`/people/${id}/referrals/${newId}`);
  };

  // ---- Attachment helpers ----
  const kindFromName = (name: string): ReferralAttachment["kind"] => {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (["pdf"].includes(ext)) return "pdf";
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
    if (["doc", "docx", "rtf", "txt"].includes(ext)) return "doc";
    return "other";
  };
  const formatBytes = (b: number): string => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };
  const onFilesPicked = (files: FileList | null) => {
    if (!files) return;
    const next: ReferralAttachment[] = [];
    for (const f of Array.from(files)) {
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`${f.name} is larger than 25 MB`);
        continue;
      }
      next.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        size: formatBytes(f.size),
        kind: kindFromName(f.name),
      });
    }
    if (next.length > 0) setAttachments((prev) => [...prev, ...next]);
  };
  const quickAttach = (label: string) => {
    setAttachments((prev) => [
      ...prev,
      {
        id: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: label,
        size: "auto",
        kind: "pdf",
        autoGenerated: true,
      },
    ]);
  };
  const removeAttachment = (aid: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== aid));

  const downloadPdf = () => {
    toast.success(
      `Referral PDF downloaded — ${person.firstName} ${person.lastName} · ${type} · ${formatDate(date)}`,
    );
  };

  const toggleInfo = (item: string) => {
    setInfoShared((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
  };

  return (
    <ICMShell title="New Referral" showAIPanel={false}>
      <div className="space-y-5 max-w-[1000px] mx-auto">
        <button
          onClick={() => navigate(`/people/${id}/referrals`)}
          className="inline-flex items-center gap-1 text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Referrals
        </button>

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[22px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              New Referral
            </h1>
            <p className="text-[12.5px] text-icm-text-dim mt-0.5 font-geist">
              {person.firstName} {person.lastName} · Status: Draft
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(`/people/${id}/referrals`)}
              className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-semibold text-icm-text-dim hover:text-icm-text"
            >
              Save draft
            </button>
            <button
              onClick={onSubmit}
              className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-semibold hover:opacity-90"
            >
              Submit referral
            </button>
          </div>
        </div>

        {aiBanner && (
          <div className="rounded-xl bg-icm-accent-soft border border-icm-accent/20 p-3 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-icm-accent mt-0.5" />
            <p className="text-[12px] text-icm-text font-geist flex-1">
              I detected employment interest during the 04/27/2026 ambient session. I've pre-filled the
              referral type and reason below. I also found 3 providers in Carroll County.
            </p>
            <button
              onClick={() => setAiBanner(false)}
              className="w-6 h-6 rounded text-icm-text-faint hover:text-icm-text"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-icm-red-soft border border-icm-red/20 p-3 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-icm-red mt-0.5" />
            <p className="text-[12px] text-icm-text font-geist">{error}</p>
          </div>
        )}

        {/* Section 1: Referral Details */}
        <Section title="Referral Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Individual">
              <ReadOnly value={`${person.firstName} ${person.lastName}`} />
            </Field>
            <Field label="Referral Date" required>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Referral Type" required>
              <select value={type} onChange={(e) => setType(e.target.value as ReferralType)} className={inputCls}>
                {REFERRAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={inputCls}>
                {(["Routine", "Urgent", "Critical"] as Priority[]).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Reason for Referral" required hint="AI suggested" hintTone="ai">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Describe why this referral is being made and what the individual needs from this service."
              className={`${inputCls} min-h-[100px]`}
            />
            <p className="mt-1 text-[10.5px] text-icm-text-faint font-mono">{reason.length} / 4000</p>
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Source of Need">
              <select value={source} onChange={(e) => setSource(e.target.value as SourceOfNeed)} className={inputCls}>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Linked to Care Plan Goal">
              <input
                type="text"
                value={linkedGoal}
                onChange={(e) => setLinkedGoal(e.target.value)}
                placeholder="Search goals…"
                className={inputCls}
              />
            </Field>
            <Field label="Urgency timeline" hint="Service needed by this date">
              <input type="date" value={urgencyDate} onChange={(e) => setUrgencyDate(e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Section>

        {/* Section 2: Provider */}
        <Section title="Service Provider / Resource">
          <div className="border-b border-icm-border flex gap-3">
            {(["search", "manual"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setProviderTab(t)}
                className={`pb-2 text-[12px] font-geist font-semibold border-b-2 ${providerTab === t ? "border-icm-accent text-icm-text" : "border-transparent text-icm-text-dim hover:text-icm-text"}`}
              >
                {t === "search" ? "Search provider directory" : "Enter manually"}
              </button>
            ))}
          </div>

          {providerTab === "search" && (
            <div className="space-y-3">
              {aiSuggestedProviders.length > 0 && !selectedProvider && (
                <div className="rounded-xl bg-icm-accent-soft border border-icm-accent/20 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-icm-accent" />
                    <p className="text-[12px] font-geist text-icm-text">
                      <span className="font-semibold">AI suggestions</span>{" "}
                      <span className="text-icm-text-dim">
                        based on {person.firstName}'s county (Carroll) and referral type ({type})
                      </span>
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {aiSuggestedProviders.map((p) => (
                      <ProviderRow key={p.id} provider={p} onSelect={setSelectedProvider} compact />
                    ))}
                  </div>
                </div>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-icm-text-faint" />
                <input
                  value={providerQuery}
                  onChange={(e) => setProviderQuery(e.target.value)}
                  placeholder="Search providers, services, or organizations…"
                  className={`${inputCls} pl-8`}
                />
              </div>

              {selectedProvider ? (
                <div className="rounded-xl border border-icm-accent/40 bg-icm-accent-soft p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-icm-accent mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-manrope font-bold text-[13.5px] text-icm-text">
                        {selectedProvider.name}
                      </p>
                      <p className="text-[11.5px] text-icm-text-dim mt-0.5">
                        {selectedProvider.address}, {selectedProvider.city}, {selectedProvider.state}{" "}
                        {selectedProvider.zip} · {selectedProvider.county} County
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-[11px] text-icm-text-dim">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {selectedProvider.phone}
                        </span>
                        {selectedProvider.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {selectedProvider.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedProvider(null)}
                      className="text-[11px] font-semibold text-icm-text-dim hover:text-icm-text"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                  {filteredProviders.map((p) => (
                    <ProviderRow key={p.id} provider={p} onSelect={setSelectedProvider} />
                  ))}
                  {filteredProviders.length === 0 && (
                    <p className="text-[12px] text-icm-text-faint font-geist py-4 text-center">
                      No providers match. Switch to "Enter manually" to add one.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {providerTab === "manual" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Organization name" required>
                <input
                  type="text"
                  value={manualProvider.name}
                  onChange={(e) => setManualProvider({ ...manualProvider, name: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Contact person">
                <input
                  type="text"
                  value={manualProvider.contact}
                  onChange={(e) => setManualProvider({ ...manualProvider, contact: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Phone">
                <input
                  type="text"
                  value={manualProvider.phone}
                  onChange={(e) => setManualProvider({ ...manualProvider, phone: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Email">
                <input
                  type="text"
                  value={manualProvider.email}
                  onChange={(e) => setManualProvider({ ...manualProvider, email: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Website">
                <input
                  type="text"
                  value={manualProvider.website}
                  onChange={(e) => setManualProvider({ ...manualProvider, website: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Address">
                <input
                  type="text"
                  value={manualProvider.address}
                  onChange={(e) => setManualProvider({ ...manualProvider, address: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="City">
                <input
                  type="text"
                  value={manualProvider.city}
                  onChange={(e) => setManualProvider({ ...manualProvider, city: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="State">
                  <input
                    type="text"
                    value={manualProvider.state}
                    onChange={(e) => setManualProvider({ ...manualProvider, state: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="ZIP">
                  <input
                    type="text"
                    value={manualProvider.zip}
                    onChange={(e) => setManualProvider({ ...manualProvider, zip: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Accepts Medicaid">
                <select
                  value={manualProvider.medicaid}
                  onChange={(e) =>
                    setManualProvider({ ...manualProvider, medicaid: e.target.value as any })
                  }
                  className={inputCls}
                >
                  <option>Unknown</option>
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </Field>
              <Field label="Accepting new clients">
                <select
                  value={manualProvider.accepting}
                  onChange={(e) =>
                    setManualProvider({ ...manualProvider, accepting: e.target.value as any })
                  }
                  className={inputCls}
                >
                  <option>Unknown</option>
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Notes about provider">
                  <textarea
                    value={manualProvider.notes}
                    onChange={(e) => setManualProvider({ ...manualProvider, notes: e.target.value })}
                    rows={2}
                    className={`${inputCls} min-h-[60px]`}
                  />
                </Field>
              </div>
            </div>
          )}
        </Section>

        {/* Section 3: Referral Contact */}
        <Section title="Referral Contact Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Referral method">
              <select value={referralMethod} onChange={(e) => setReferralMethod(e.target.value)} className={inputCls}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Contact date">
              <input type="date" value={contactDate} onChange={(e) => setContactDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Contact person at provider">
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Reference number">
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* Section 4: Information shared */}
        <Section title="Information Shared with Provider">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {INFO_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-start gap-2 text-[12px] font-geist text-icm-text">
                <input
                  type="checkbox"
                  checked={infoShared.includes(opt)}
                  onChange={() => toggleInfo(opt)}
                  className="mt-0.5"
                />
                {opt}
              </label>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-icm-border bg-icm-bg p-3">
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] font-geist font-semibold text-icm-text">
                Consent to share documented?
              </p>
              <button
                onClick={() => setConsent((c) => !c)}
                className={`h-7 px-3 rounded-full text-[11px] font-semibold ring-1 ${consent ? "bg-icm-green-soft text-icm-green ring-icm-green/20" : "bg-icm-bg text-icm-text-dim ring-icm-border"}`}
              >
                {consent ? "Yes" : "No"}
              </button>
            </div>
            {consent ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <Field label="Consent date">
                  <input type="date" value={consentDate} onChange={(e) => setConsentDate(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Consent method">
                  <select
                    value={consentMethod}
                    onChange={(e) => setConsentMethod(e.target.value as any)}
                    className={inputCls}
                  >
                    <option value="Verbal">Verbal</option>
                    <option value="Written">Written</option>
                  </select>
                </Field>
              </div>
            ) : (
              <p className="text-[11.5px] text-icm-amber mt-2 inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Consent to share information is required before submitting this referral.
              </p>
            )}
          </div>
        </Section>

        {/* Section 5: Follow-up */}
        <Section title="Follow-up & Tracking">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Expected response timeframe">
              <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className={inputCls}>
                {TIMEFRAMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Follow-up date" hint="A task will be created in My Work">
              <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Assigned to">
              <input type="text" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={inputCls} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Notes">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any additional context for follow-up"
                  className={`${inputCls} min-h-[60px]`}
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* Submit button (bottom) */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => navigate(`/people/${id}/referrals`)}
            className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-semibold text-icm-text-dim hover:text-icm-text"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-semibold hover:opacity-90"
          >
            Submit referral
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-icm-panel rounded-2xl shadow-elevated max-w-md w-full p-5">
            <h3 className="font-manrope font-bold text-[15px] text-icm-text mb-2">
              Submit this referral?
            </h3>
            <p className="text-[12.5px] text-icm-text-dim mb-3">
              {person.firstName} {person.lastName} · {type} ·{" "}
              {providerTab === "search" ? selectedProvider?.name : manualProvider.name}
            </p>
            <p className="text-[11.5px] text-icm-text-faint mb-4">
              {followUpDate
                ? `A follow-up task will be created for ${formatDate(followUpDate)} and assigned to ${assignedTo}.`
                : "No follow-up task will be created."}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="h-9 px-3 rounded-xl border border-icm-border text-[12px] font-semibold text-icm-text-dim hover:text-icm-text"
              >
                Cancel
              </button>
              <button
                onClick={finalizeSubmit}
                className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-semibold hover:opacity-90"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </ICMShell>
  );
};

const inputCls =
  "h-9 w-full px-3 rounded-lg border border-icm-border bg-icm-panel text-[12.5px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-accent";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3">
      <h2 className="font-manrope font-bold text-[14px] text-icm-text">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  hintTone,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  hintTone?: "ai" | "neutral";
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[11.5px] font-geist font-semibold text-icm-text-dim mb-1 inline-flex items-center gap-1.5">
        {label}
        {required && <span className="text-icm-red">*</span>}
        {hint && (
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ring-1 ${hintTone === "ai" ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20" : "bg-icm-bg text-icm-text-faint ring-icm-border"} inline-flex items-center gap-1`}
          >
            {hintTone === "ai" && <Sparkles className="w-2.5 h-2.5" />}
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function ReadOnly({ value }: { value: string }) {
  return (
    <div className="h-9 w-full px-3 rounded-lg border border-icm-border bg-icm-bg text-[12.5px] font-geist text-icm-text-dim flex items-center">
      {value}
    </div>
  );
}

function ProviderRow({
  provider,
  onSelect,
  compact,
}: {
  provider: Provider;
  onSelect: (p: Provider) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-icm-border bg-icm-panel ${compact ? "p-2" : "p-3"} flex items-center gap-3`}
    >
      <div className="w-8 h-8 rounded-lg bg-icm-bg border border-icm-border flex items-center justify-center text-icm-text-dim shrink-0">
        <Building2 className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-manrope font-bold text-[12.5px] text-icm-text truncate">{provider.name}</p>
        <p className="text-[10.5px] text-icm-text-dim truncate">
          {provider.city}, {provider.state} · {provider.county} County · {provider.phone}
        </p>
        <div className="flex gap-1 mt-1">
          {provider.acceptsMedicaid && (
            <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20 font-semibold">
              Medicaid
            </span>
          )}
          <span
            className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-semibold ring-1 ${provider.acceptingNewClients ? "bg-icm-accent-soft text-icm-accent ring-icm-accent/20" : "bg-icm-bg text-icm-text-dim ring-icm-border"}`}
          >
            {provider.acceptingNewClients ? "Accepting clients" : "Closed to new"}
          </span>
        </div>
      </div>
      <button
        onClick={() => onSelect(provider)}
        className="h-7 px-2.5 rounded-lg bg-icm-text text-icm-panel text-[11px] font-semibold hover:opacity-90 shrink-0"
      >
        Select
      </button>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

export default PersonReferralForm;
