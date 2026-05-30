// Pending Lead Detail Page
// CaseManagement.AI — Protected, supervisor+ access
// Route: /leads/pending/:id

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { PendingLead } from "@/hooks/usePendingLeads";
import {
  CheckCircle,
  MessageSquare,
  XCircle,
  ArrowLeft,
  Loader2,
  ClipboardList,
  User,
  Heart,
  FileText,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrgUser {
  uid: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function PendingLeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [lead, setLead] = useState<PendingLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);

  // Modal states
  const [acceptModal, setAcceptModal] = useState(false);
  const [infoModal, setInfoModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);

  // Accept form
  const [assignedTo, setAssignedTo] = useState("");
  const [acceptNotes, setAcceptNotes] = useState("");
  const [acceptLoading, setAcceptLoading] = useState(false);

  // Info request
  const [infoNote, setInfoNote] = useState("");
  const [infoLoading, setInfoLoading] = useState(false);

  // Reject form
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "pending_leads", id)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setLead({ id: snap.id, ...d } as PendingLead);
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!userProfile?.organizationId) return;
    getDocs(
      query(collection(db, "users"), where("organizationId", "==", userProfile.organizationId))
    ).then((snap) => {
      const users: OrgUser[] = snap.docs.map((d) => ({
        uid: d.id,
        firstName: d.data().firstName ?? "",
        lastName: d.data().lastName ?? "",
        role: d.data().role ?? "",
      }));
      setOrgUsers(users);
    });
  }, [userProfile?.organizationId]);

  const handleAccept = async () => {
    if (!id || !lead) return;
    setAcceptLoading(true);
    try {
      await updateDoc(doc(db, "pending_leads", id), {
        status: "accepted",
        assignedTo: assignedTo || null,
        acceptedAt: serverTimestamp(),
        reviewNotes: acceptNotes,
        reviewedBy: userProfile?.uid ?? null,
      });
      toast.success("Lead accepted successfully");
      navigate("/leads");
    } catch {
      toast.error("Failed to accept lead");
    } finally {
      setAcceptLoading(false);
      setAcceptModal(false);
    }
  };

  const handleInfoRequest = async () => {
    if (!id || !lead) return;
    setInfoLoading(true);
    try {
      await updateDoc(doc(db, "pending_leads", id), {
        status: "info_requested",
        infoRequestNote: infoNote,
        infoRequestedAt: serverTimestamp(),
        reviewedBy: userProfile?.uid ?? null,
      });
      toast.success("Info request recorded");
      navigate("/leads");
    } catch {
      toast.error("Failed to save info request");
    } finally {
      setInfoLoading(false);
      setInfoModal(false);
    }
  };

  const handleReject = async () => {
    if (!id || !lead) return;
    setRejectLoading(true);
    try {
      await updateDoc(doc(db, "pending_leads", id), {
        status: "rejected",
        rejectionReason: rejectReason,
        rejectionNotes: rejectNotes,
        rejectedAt: serverTimestamp(),
        reviewedBy: userProfile?.uid ?? null,
      });
      toast.success("Lead rejected");
      navigate("/leads");
    } catch {
      toast.error("Failed to reject lead");
    } finally {
      setRejectLoading(false);
      setRejectModal(false);
    }
  };

  if (loading) {
    return (
      <ICMShell title="Pending Lead" showAIPanel={false}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        </div>
      </ICMShell>
    );
  }

  if (!lead) {
    return (
      <ICMShell title="Pending Lead" showAIPanel={false}>
        <div className="text-center py-16">
          <p className="text-icm-text-dim text-sm">Lead not found.</p>
          <button onClick={() => navigate("/leads")} className="mt-4 text-sm text-teal-600 hover:underline">
            Back to Leads
          </button>
        </div>
      </ICMShell>
    );
  }

  const urgencyClass = () => {
    if (lead.urgencyLevel === "crisis") return "bg-red-100 text-red-700 border-red-300";
    if (lead.urgencyLevel === "urgent") return "bg-orange-100 text-orange-700 border-orange-300";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  const submittedDate = lead.submittedAt
    ? new Date(lead.submittedAt.seconds * 1000).toLocaleString()
    : "—";

  return (
    <ICMShell title="Pending Lead Detail" showAIPanel={false}>
      <div className="max-w-[820px] space-y-5">
        <Breadcrumbs
          backTo="/leads"
          backLabel="Leads"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Leads", to: "/leads" },
            { label: `${lead.firstName} ${lead.lastName}` },
          ]}
        />

        {/* Orange banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="text-sm font-semibold text-orange-800">
                  Submitted via external intake form
                </span>
                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase", urgencyClass())}>
                  {lead.urgencyLevel}
                </span>
              </div>
              <p className="text-xs text-orange-700 pl-6">
                Reference: <strong>{lead.referenceNumber}</strong> · Submitted: {submittedDate}
              </p>
              {lead.intakeLinkLabel && (
                <p className="text-xs text-orange-700 pl-6">
                  Source: <strong>{lead.intakeLinkLabel}</strong>
                </p>
              )}
              <p className="text-xs text-orange-700 pl-6">
                Referrer: <strong>{lead.referrerName}</strong>
                {lead.referrerOrganization && ` · ${lead.referrerOrganization}`}
              </p>
            </div>
            {lead.status === "pending_review" && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setAcceptModal(true)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Accept Lead
                </button>
                <button
                  onClick={() => setInfoModal(true)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-orange-300 bg-white hover:bg-orange-50 text-orange-700 text-xs font-semibold transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Request More Info
                </button>
                <button
                  onClick={() => setRejectModal(true)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-semibold transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Individual Demographics */}
        <Section icon={User} title="Individual Demographics">
          <Grid>
            <LabelValue label="Full Name" value={`${lead.firstName} ${lead.middleName ?? ""} ${lead.lastName}`.trim()} />
            <LabelValue label="Preferred Name" value={lead.preferredName} />
            <LabelValue label="Date of Birth" value={lead.dateOfBirth} />
            <LabelValue label="Gender" value={lead.gender} />
            <LabelValue label="Primary Language" value={lead.primaryLanguage} />
            <LabelValue label="Race / Ethnicity" value={lead.raceEthnicity} />
          </Grid>
          <div className="mt-3 pt-3 border-t border-icm-border">
            <p className="text-xs font-medium text-icm-text-dim mb-2">Address</p>
            <p className="text-sm text-icm-text">
              {[lead.streetAddress, lead.city, lead.state, lead.zip].filter(Boolean).join(", ") || "—"}
            </p>
            {lead.county && <p className="text-xs text-icm-text-dim mt-0.5">{lead.county} County</p>}
          </div>
          <Grid>
            <LabelValue label="Primary Phone" value={lead.primaryPhone} />
            <LabelValue label="Phone Type" value={lead.phoneType} />
            <LabelValue label="Email" value={lead.email} />
          </Grid>
        </Section>

        {/* Guardian */}
        {lead.hasGuardian === "yes" && (
          <Section icon={User} title="Guardian / Legal Representative">
            <Grid>
              <LabelValue label="Guardian Name" value={lead.guardianName} />
              <LabelValue label="Relationship" value={lead.guardianRelationship} />
              <LabelValue label="Guardian Phone" value={lead.guardianPhone} />
              <LabelValue label="Guardian Email" value={lead.guardianEmail} />
            </Grid>
            {lead.guardianAddress && <LabelValue label="Guardian Address" value={lead.guardianAddress} />}
          </Section>
        )}

        {/* Clinical */}
        <Section icon={Heart} title="Clinical Information">
          <Grid>
            <LabelValue label="Primary Diagnosis" value={lead.primaryDiagnosis} />
            <LabelValue label="Secondary Diagnosis" value={lead.secondaryDiagnosis} />
            <LabelValue label="Primary Insurance" value={lead.primaryInsurance} />
            <LabelValue label="Medicaid / State ID" value={lead.medicaidStateId} />
          </Grid>
          {lead.currentMedications && (
            <LabelValue label="Current Medications" value={lead.currentMedications} multiline />
          )}
          {lead.knownAllergies && <LabelValue label="Known Allergies" value={lead.knownAllergies} />}
          {lead.currentSupports && (
            <LabelValue label="Current Supports & Services" value={lead.currentSupports} multiline />
          )}
          <LabelValue label="Reason for Referral" value={lead.reasonForReferral} multiline />
          {lead.services && lead.services.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-icm-text-dim mb-1">Services Requested</p>
              <div className="flex flex-wrap gap-1.5">
                {lead.services.map((s) => (
                  <span key={s} className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full text-xs">{s}</span>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Referral Source */}
        <Section icon={FileText} title="Referral Source">
          <Grid>
            <LabelValue label="Name" value={lead.referrerName} />
            <LabelValue label="Role / Title" value={lead.referrerRole} />
            <LabelValue label="Organization" value={lead.referrerOrganization} />
            <LabelValue label="Phone" value={lead.referrerPhone} />
            <LabelValue label="Email" value={lead.referrerEmail} />
            <LabelValue label="How Heard" value={lead.howHeard} />
          </Grid>
          {lead.additionalNotes && <LabelValue label="Additional Notes" value={lead.additionalNotes} multiline />}
        </Section>

        {/* Uploaded Files */}
        {lead.uploadedFileUrls && lead.uploadedFileUrls.length > 0 && (
          <Section icon={FileText} title="Uploaded Documents">
            <ul className="space-y-1.5">
              {lead.uploadedFileUrls.map((url, i) => (
                <li key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm text-teal-600 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Document {i + 1}
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {/* Accept Modal */}
      {acceptModal && (
        <Modal title="Accept Lead" onClose={() => setAcceptModal(false)}>
          <label className="block text-xs font-medium text-icm-text-dim mb-1.5">Assign to</label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full border border-icm-border rounded-xl px-3 py-2 text-sm bg-icm-bg focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
          >
            <option value="">Unassigned</option>
            {orgUsers.map((u) => (
              <option key={u.uid} value={u.uid}>
                {u.firstName} {u.lastName} ({u.role})
              </option>
            ))}
          </select>
          <label className="block text-xs font-medium text-icm-text-dim mb-1.5">Notes to referrer (optional)</label>
          <textarea
            rows={3}
            value={acceptNotes}
            onChange={(e) => setAcceptNotes(e.target.value)}
            className="w-full border border-icm-border rounded-xl px-3 py-2 text-sm bg-icm-bg focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
          />
          <div className="flex gap-2">
            <button onClick={() => setAcceptModal(false)} className="flex-1 h-9 rounded-xl border border-icm-border text-icm-text-dim text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              onClick={handleAccept}
              disabled={acceptLoading}
              className="flex-1 h-9 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              {acceptLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Accept"}
            </button>
          </div>
        </Modal>
      )}

      {/* Info Request Modal */}
      {infoModal && (
        <Modal title="Request More Information" onClose={() => setInfoModal(false)}>
          <label className="block text-xs font-medium text-icm-text-dim mb-1.5">What additional information is needed?</label>
          <textarea
            rows={4}
            value={infoNote}
            onChange={(e) => setInfoNote(e.target.value)}
            placeholder="Describe what information is needed from the referrer…"
            className="w-full border border-icm-border rounded-xl px-3 py-2 text-sm bg-icm-bg focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
          />
          <div className="flex gap-2">
            <button onClick={() => setInfoModal(false)} className="flex-1 h-9 rounded-xl border border-icm-border text-icm-text-dim text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              onClick={handleInfoRequest}
              disabled={!infoNote.trim() || infoLoading}
              className="flex-1 h-9 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              {infoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Request"}
            </button>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <Modal title="Reject Lead" onClose={() => setRejectModal(false)}>
          <label className="block text-xs font-medium text-icm-text-dim mb-1.5">Reason for rejection <span className="text-red-500">*</span></label>
          <select
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full border border-icm-border rounded-xl px-3 py-2 text-sm bg-icm-bg focus:outline-none focus:ring-2 focus:ring-teal-500 mb-3"
          >
            <option value="">Select reason…</option>
            <option>Outside service area</option>
            <option>Not eligible</option>
            <option>Duplicate</option>
            <option>Insufficient information</option>
            <option>Other</option>
          </select>
          <label className="block text-xs font-medium text-icm-text-dim mb-1.5">Additional notes</label>
          <textarea
            rows={3}
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            className="w-full border border-icm-border rounded-xl px-3 py-2 text-sm bg-icm-bg focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
          />
          <div className="flex gap-2">
            <button onClick={() => setRejectModal(false)} className="flex-1 h-9 rounded-xl border border-icm-border text-icm-text-dim text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectReason || rejectLoading}
              className="flex-1 h-9 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              {rejectLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject Lead"}
            </button>
          </div>
        </Modal>
      )}
    </ICMShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-5 space-y-3">
      <div className="flex items-center gap-2 border-b border-icm-border pb-3">
        <Icon className="w-4 h-4 text-icm-text-dim" />
        <h3 className="text-xs font-semibold text-icm-text-dim uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{children}</div>;
}

function LabelValue({
  label,
  value,
  multiline,
}: {
  label: string;
  value?: string | null;
  multiline?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={multiline ? "col-span-2 md:col-span-3" : ""}>
      <p className="text-[10px] font-medium text-icm-text-faint uppercase tracking-widest mb-0.5">{label}</p>
      <p className={cn("text-sm text-icm-text", multiline ? "whitespace-pre-wrap" : "")}>{value}</p>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-manrope font-bold text-[17px] text-icm-text mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
