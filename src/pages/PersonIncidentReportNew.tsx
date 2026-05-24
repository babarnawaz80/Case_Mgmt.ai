import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle, ChevronLeft, Sparkles, Save, Loader2,
  MapPin, Clock, Users, Phone, Shield, FileText,
} from "lucide-react";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { useIndividual } from "@/hooks/useIndividuals";
import { useAuth } from "@/contexts/AuthContext";
import { createIncident, INCIDENT_TYPES, INCIDENT_SEVERITIES } from "@/hooks/useIncidents";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { writeAudit } from "@/lib/auditService";

const PersonIncidentReportNew = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading } = useIndividual(id);
  const { userProfile } = useAuth();

  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 5);

  // Form state
  const [incidentType, setIncidentType] = useState("");
  const [severity, setSeverity] = useState<"critical" | "major" | "minor" | "informational">("minor");
  const [incidentDate, setIncidentDate] = useState(today);
  const [incidentTime, setIncidentTime] = useState(now);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [immediateResponse, setImmediateResponse] = useState("");
  const [witnesses, setWitnesses] = useState("");
  const [called911, setCalled911] = useState(false);
  const [familyNotified, setFamilyNotified] = useState(false);
  const [supervisorNotified, setSupervisorNotified] = useState(false);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);

  const inputCls = "w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text font-geist focus:outline-none focus:border-icm-accent transition-colors";
  const textareaCls = "w-full px-3 py-2.5 rounded-lg border border-icm-border bg-white text-[12.5px] text-icm-text font-geist focus:outline-none focus:border-icm-accent transition-colors resize-none";

  const handleAIAssist = async () => {
    if (!incidentType) { toast.error("Select an incident type first."); return; }
    if (!individual) { toast.error("Individual not loaded."); return; }
    setAiLoading(true);
    try {
      // Fallback AI description generation
      const name = `${individual.first_name} ${individual.last_name}`;
      const generatedDescription = `On ${incidentDate} at ${incidentTime || "unknown time"}, a ${incidentType.toLowerCase()} incident occurred involving ${name} at ${location || "the program site"}. The individual ${severity === "critical" ? "required immediate emergency intervention" : severity === "major" ? "required significant staff intervention" : "required staff support and monitoring"}. Staff responded promptly according to protocol.`;
      const generatedResponse = `Staff immediately assessed the situation and ensured ${name}'s safety. ${called911 ? "Emergency services (911) were contacted." : "The situation was managed without emergency services."} ${supervisorNotified ? "The supervisor was notified per protocol." : ""} ${familyNotified ? "Family/guardian was notified." : ""} Documentation was completed per agency policy.`;
      setDescription(generatedDescription);
      setImmediateResponse(generatedResponse);
      toast.success("AI draft generated", { description: "Review and edit before submitting." });
    } catch {
      toast.error("AI generation failed. Please fill in manually.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) { toast.error("Individual ID missing."); return; }
    if (!incidentType) { toast.error("Select an incident type."); return; }
    if (!incidentDate) { toast.error("Enter the incident date."); return; }
    if (!description.trim() || description.trim().length < 20) {
      toast.error("Description must be at least 20 characters.");
      return;
    }

    const orgId = userProfile?.organizationId ?? "";
    const authorId = userProfile?.uid ?? "";
    const authorName = userProfile?.firstName
      ? `${userProfile.firstName} ${userProfile.lastName ?? ""}`.trim()
      : "Unknown";

    setSaving(true);
    try {
      const incidentId = await createIncident({
        individualId: id,
        organizationId: orgId,
        type: incidentType,
        severity,
        status: "open",
        description: description.trim(),
        reportedAt: incidentDate,
        reportedBy: authorId,
        reportedByName: authorName,
      });
      await writeAudit("incident_reported", "incident", incidentId, {
        individualId: id,
        severity,
        incidentType,
      });
      toast.success("Incident report submitted", {
        description: `ID #${incidentId.slice(0, 8)} — Supervisor will be notified.`,
      });
      navigate(`/people/${id}/echart`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit incident report.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ICMShell title="New Incident Report" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  const personName = individual
    ? `${individual.first_name} ${individual.last_name}`
    : "Unknown Individual";

  return (
    <ICMShell title="New Incident Report" showAIPanel={false}>
      <div className="max-w-3xl mx-auto space-y-5">
        <Breadcrumbs
          backTo={id ? `/people/${id}/echart` : "/people"}
          backLabel="eChart"
          items={[
            { label: "People Supported", to: "/people" },
            { label: personName, to: id ? `/people/${id}/echart` : "/people" },
            { label: "New Incident Report" },
          ]}
        />

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-icm-red-soft flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-icm-red" />
          </div>
          <div>
            <h1 className="font-manrope font-extrabold text-[22px] text-icm-text tracking-tight">
              New Incident Report
            </h1>
            <p className="text-[12.5px] text-icm-text-dim font-geist mt-0.5">
              For: <span className="font-semibold text-icm-text">{personName}</span>
              {individual?.program && ` · ${individual.program}`}
            </p>
          </div>
          <button
            onClick={handleAIAssist}
            disabled={aiLoading || !incidentType}
            className="ml-auto h-9 px-4 rounded-xl text-white text-[12px] font-geist font-semibold ai-gradient disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 hover:opacity-90"
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            AI Assist
          </button>
        </div>

        {/* Severity Banner */}
        {severity === "critical" && (
          <div className="rounded-xl border-2 border-icm-red bg-icm-red-soft p-3 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-icm-red" />
            <p className="text-[12.5px] font-manrope font-bold text-icm-red">
              Critical Incident — 911, supervisor, and family notification required per policy.
            </p>
          </div>
        )}

        {/* Form */}
        <div className="rounded-xl border border-icm-border bg-icm-panel p-6 space-y-5">

          {/* Row 1: Type + Severity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-icm-text-faint mb-1.5">
                Incident Type *
              </label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className={inputCls}
              >
                <option value="">Select type…</option>
                {INCIDENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-icm-text-faint mb-1.5">
                Severity *
              </label>
              <div className="flex gap-2">
                {INCIDENT_SEVERITIES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSeverity(s.value)}
                    className={cn(
                      "flex-1 h-9 rounded-lg border text-[11px] font-geist font-semibold transition-colors",
                      severity === s.value
                        ? `border-transparent bg-icm-accent text-white`
                        : "border-icm-border bg-white text-icm-text-dim hover:border-icm-accent hover:text-icm-accent"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Date + Time + Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-icm-text-faint mb-1.5">
                <Clock className="inline w-3 h-3 mr-0.5" /> Incident Date *
              </label>
              <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-icm-text-faint mb-1.5">
                Incident Time
              </label>
              <input type="time" value={incidentTime} onChange={(e) => setIncidentTime(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-icm-text-faint mb-1.5">
                <MapPin className="inline w-3 h-3 mr-0.5" /> Location
              </label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Home, community center…" className={inputCls} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-icm-text-faint mb-1.5">
              <FileText className="inline w-3 h-3 mr-0.5" /> Description of Incident *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Describe what happened, who was involved, environmental factors, antecedents, and the sequence of events…"
              className={textareaCls}
            />
            <p className="text-[10px] text-icm-text-faint font-mono mt-1">
              {description.length} characters · {description.length < 20 ? `${20 - description.length} more needed` : "✓ Sufficient detail"}
            </p>
          </div>

          {/* Immediate Response */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-icm-text-faint mb-1.5">
              Immediate Staff Response
            </label>
            <textarea
              value={immediateResponse}
              onChange={(e) => setImmediateResponse(e.target.value)}
              rows={4}
              placeholder="Describe the immediate actions taken by staff to address the situation…"
              className={textareaCls}
            />
          </div>

          {/* Witnesses */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-icm-text-faint mb-1.5">
              <Users className="inline w-3 h-3 mr-0.5" /> Witnesses / Staff Present
            </label>
            <input
              type="text"
              value={witnesses}
              onChange={(e) => setWitnesses(e.target.value)}
              placeholder="Names of witnesses or staff present…"
              className={inputCls}
            />
          </div>

          {/* Notification toggles */}
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-icm-text-faint mb-2.5">Notifications Made</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Toggle
                id="called-911"
                label="911 Called"
                icon={<Phone className="w-3.5 h-3.5" />}
                checked={called911}
                onChange={setCalled911}
                urgentColor={called911}
              />
              <Toggle
                id="family-notified"
                label="Family / Guardian Notified"
                icon={<Users className="w-3.5 h-3.5" />}
                checked={familyNotified}
                onChange={setFamilyNotified}
              />
              <Toggle
                id="supervisor-notified"
                label="Supervisor Notified"
                icon={<Shield className="w-3.5 h-3.5" />}
                checked={supervisorNotified}
                onChange={setSupervisorNotified}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-9 px-4 rounded-xl border border-icm-border bg-white text-[12px] font-geist font-medium text-icm-text-dim hover:bg-icm-bg flex items-center gap-1.5"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !incidentType || !description.trim()}
            className="h-9 px-6 rounded-xl bg-icm-red text-white text-[12px] font-geist font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 hover:bg-icm-red/90"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Submit Incident Report
          </button>
        </div>
      </div>
    </ICMShell>
  );
};

function Toggle({
  id,
  label,
  icon,
  checked,
  onChange,
  urgentColor,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  urgentColor?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left w-full transition-colors",
        checked
          ? urgentColor
            ? "bg-icm-red-soft border-icm-red text-icm-red"
            : "bg-icm-green-soft border-icm-green text-icm-green"
          : "bg-white border-icm-border text-icm-text-dim hover:border-icm-accent"
      )}
    >
      <div className={cn(
        "w-4 h-4 rounded flex items-center justify-center shrink-0",
        checked ? (urgentColor ? "bg-icm-red/20" : "bg-icm-green/20") : "bg-icm-bg"
      )}>
        {checked ? icon : <span className="w-2 h-2 rounded-full bg-icm-border" />}
      </div>
      <span className="text-[11.5px] font-geist font-medium leading-tight">{label}</span>
    </button>
  );
}

export default PersonIncidentReportNew;
