// Public External Referral Intake Form
// CaseManagement.AI — No Firebase Auth required
// Route: /intake/:orgToken

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Lock, CheckCircle, AlertCircle, Upload, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";

const FUNCTIONS_BASE = "https://us-central1-casemanagement-ai.cloudfunctions.net/api";

interface OrgInfo {
  valid: boolean;
  organizationName: string;
  organizationLogo: string | null;
  organizationPhone: string | null;
  defaultState: string;
  formLabel: string;
}

interface FormData {
  // Section 1 — Individual
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  preferredName: string;
  primaryLanguage: string;
  raceEthnicity: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  primaryPhone: string;
  phoneType: string;
  email: string;

  // Section 2 — Guardian
  hasGuardian: string; // "yes" | "no" | ""
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianAddress: string;

  // Section 3 — Clinical
  primaryDiagnosis: string;
  secondaryDiagnosis: string;
  currentMedications: string;
  knownAllergies: string;
  currentSupports: string;
  reasonForReferral: string;
  primaryInsurance: string;
  medicaidStateId: string;
  urgencyLevel: string;

  // Section 4 — Services & Referral
  services: string[];
  referrerName: string;
  referrerRole: string;
  referrerOrganization: string;
  referrerPhone: string;
  referrerEmail: string;
  howHeard: string;
  additionalNotes: string;

  // Auth
  confirmAuthorization: boolean;
}

const SERVICES_OPTIONS = [
  "Targeted Case Management",
  "Community Integration & Habilitation",
  "Family Supports",
  "Behavioral Health",
  "Aging & Long-Term Services",
  "Children's Services",
  "Respite",
  "Day Services",
];

const emptyForm = (): FormData => ({
  firstName: "", middleName: "", lastName: "", dateOfBirth: "", gender: "",
  preferredName: "", primaryLanguage: "English", raceEthnicity: "", streetAddress: "",
  city: "", state: "", zip: "", county: "", primaryPhone: "", phoneType: "", email: "",
  hasGuardian: "", guardianName: "", guardianRelationship: "", guardianPhone: "",
  guardianEmail: "", guardianAddress: "", primaryDiagnosis: "", secondaryDiagnosis: "",
  currentMedications: "", knownAllergies: "", currentSupports: "", reasonForReferral: "",
  primaryInsurance: "", medicaidStateId: "", urgencyLevel: "",
  services: [], referrerName: "", referrerRole: "", referrerOrganization: "",
  referrerPhone: "", referrerEmail: "", howHeard: "", additionalNotes: "",
  confirmAuthorization: false,
});

export default function IntakeForm() {
  const { orgToken } = useParams<{ orgToken: string }>();
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>(emptyForm());
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; referenceNumber?: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!orgToken) { setLoading(false); return; }
    fetch(`${FUNCTIONS_BASE}/api/intake/validate-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgToken }),
    })
      .then((r) => r.json())
      .then((data) => {
        setOrgInfo(data);
        if (data.valid && data.defaultState) {
          setFormData((f) => ({ ...f, state: data.defaultState }));
        }
      })
      .catch(() => setOrgInfo({ valid: false, organizationName: "", organizationLogo: null, organizationPhone: null, defaultState: "", formLabel: "" }))
      .finally(() => setLoading(false));
  }, [orgToken]);

  const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((f) => ({ ...f, [key]: value }));
  }, []);

  const toggleService = (s: string) => {
    setFormData((f) => ({
      ...f,
      services: f.services.includes(s) ? f.services.filter((x) => x !== s) : [...f.services, s],
    }));
  };

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const valid = Array.from(incoming).filter((f) => {
      const okType = ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(f.type);
      const okSize = f.size <= 10 * 1024 * 1024;
      return okType && okSize;
    });
    setFiles((prev) => {
      const combined = [...prev, ...valid];
      return combined.slice(0, 5);
    });
  };

  const isValid = () => {
    const f = formData;
    return !!(
      f.firstName && f.lastName && f.dateOfBirth && f.primaryPhone &&
      f.primaryDiagnosis && f.reasonForReferral &&
      f.referrerName && f.referrerOrganization && f.referrerPhone && f.referrerEmail &&
      f.urgencyLevel && f.confirmAuthorization
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid() || submitting || !orgToken) return;
    setSubmitting(true);

    try {
      // Upload files
      const uploadedFileUrls: string[] = [];
      for (const file of files) {
        const storageRef = ref(storage, `intake_uploads/${orgToken}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedFileUrls.push(url);
      }

      const res = await fetch(`${FUNCTIONS_BASE}/api/intake/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgToken, formData, uploadedFileUrls }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitResult({ success: true, referenceNumber: data.referenceNumber });
      } else {
        setSubmitResult({ success: false });
      }
    } catch {
      setSubmitResult({ success: false });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // ── Invalid token ─────────────────────────────────────────────────────────────
  if (!orgInfo?.valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-16 px-4">
        <p className="text-sm text-gray-400 mb-12 font-medium tracking-wide">CaseManagement.AI</p>
        <div className="text-center max-w-md">
          <p className="text-lg font-semibold text-gray-700 mb-2">
            This intake form is not currently available.
          </p>
          <p className="text-sm text-gray-500">
            If you are a provider trying to submit a referral, please contact the agency directly.
          </p>
        </div>
      </div>
    );
  }

  // ── Success screen ────────────────────────────────────────────────────────────
  if (submitResult?.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-lg w-full">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Referral Submitted Successfully</h2>
          <p className="text-gray-600 text-sm mb-4">
            Thank you, <strong>{formData.referrerName}</strong>. Your referral for{" "}
            <strong>{formData.firstName} {formData.lastName}</strong> has been received by{" "}
            <strong>{orgInfo.organizationName}</strong>.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Reference Number</p>
            <p className="text-xl font-mono font-bold text-teal-700">{submitResult.referenceNumber}</p>
          </div>
          <div className="text-left bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 mb-6">
            <p className="text-sm font-semibold text-blue-800 mb-2">What happens next:</p>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Our team will review your referral within 1–2 business days</li>
              <li>If additional information is needed, we will contact you</li>
              <li>You will be notified of the outcome via email</li>
              <li>Please keep your reference number for your records</li>
            </ul>
          </div>
          <button
            onClick={() => { setSubmitResult(null); setFormData(emptyForm()); setFiles([]); }}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
          >
            Submit Another Referral
          </button>
        </div>
      </div>
    );
  }

  // ── Error screen ──────────────────────────────────────────────────────────────
  if (submitResult !== null && !submitResult.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-9 h-9 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Submission Failed</h2>
          <p className="text-gray-500 text-sm mb-6">
            We were unable to submit your referral. Please try again or contact the agency directly.
          </p>
          <button
            onClick={() => setSubmitResult(null)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[720px] mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        {orgInfo.organizationLogo && (
          <img src={orgInfo.organizationLogo} alt="Logo" className="h-12 mx-auto mb-3 object-contain" />
        )}
        <h1 className="text-2xl font-bold text-gray-900">{orgInfo.organizationName}</h1>
        <p className="text-base text-gray-600 mt-1 font-medium">{orgInfo.formLabel}</p>
        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-gray-400">
          <Lock className="w-3.5 h-3.5" />
          Secure form · Your information is protected
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1 */}
        <Section title="INDIVIDUAL BEING REFERRED">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="First Name" required><input className={input()} value={formData.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
            <Field label="Middle Name"><input className={input()} value={formData.middleName} onChange={(e) => set("middleName", e.target.value)} /></Field>
            <Field label="Last Name" required><input className={input()} value={formData.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Date of Birth" required><input type="date" className={input()} value={formData.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} /></Field>
            <Field label="Gender">
              <select className={input()} value={formData.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Select…</option>
                <option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option>
              </select>
            </Field>
            <Field label="Preferred Name"><input className={input()} value={formData.preferredName} onChange={(e) => set("preferredName", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Primary Language"><input className={input()} value={formData.primaryLanguage} onChange={(e) => set("primaryLanguage", e.target.value)} /></Field>
            <Field label="Race / Ethnicity"><input className={input()} value={formData.raceEthnicity} onChange={(e) => set("raceEthnicity", e.target.value)} /></Field>
          </div>
          <Field label="Street Address"><input className={input()} value={formData.streetAddress} onChange={(e) => set("streetAddress", e.target.value)} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="City" required><input className={input()} value={formData.city} onChange={(e) => set("city", e.target.value)} /></Field>
            <Field label="State" required><input className={input()} value={formData.state} onChange={(e) => set("state", e.target.value)} /></Field>
            <Field label="ZIP" required><input className={input()} value={formData.zip} onChange={(e) => set("zip", e.target.value)} /></Field>
          </div>
          <Field label="County"><input className={input()} value={formData.county} onChange={(e) => set("county", e.target.value)} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Primary Phone" required><input type="tel" className={input()} value={formData.primaryPhone} onChange={(e) => set("primaryPhone", e.target.value)} /></Field>
            <Field label="Phone Type">
              <select className={input()} value={formData.phoneType} onChange={(e) => set("phoneType", e.target.value)}>
                <option value="">Select…</option>
                <option>Mobile</option><option>Home</option><option>Work</option>
              </select>
            </Field>
            <Field label="Email"><input type="email" className={input()} value={formData.email} onChange={(e) => set("email", e.target.value)} /></Field>
          </div>
        </Section>

        {/* Section 2 */}
        <Section title="GUARDIAN & LEGAL REPRESENTATIVE">
          <Field label="Does this individual have a legal guardian or POA?">
            <div className="flex gap-6 mt-1">
              {(["yes", "no"] as const).map((v) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="radio" name="hasGuardian" value={v} checked={formData.hasGuardian === v} onChange={() => set("hasGuardian", v)} className="accent-teal-600" />
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </label>
              ))}
            </div>
          </Field>
          {formData.hasGuardian === "yes" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Guardian Name" required><input className={input()} value={formData.guardianName} onChange={(e) => set("guardianName", e.target.value)} /></Field>
                <Field label="Relationship" required>
                  <select className={input()} value={formData.guardianRelationship} onChange={(e) => set("guardianRelationship", e.target.value)}>
                    <option value="">Select…</option>
                    <option>Parent</option><option>Legal Guardian</option><option>POA</option><option>Other</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Guardian Phone" required><input type="tel" className={input()} value={formData.guardianPhone} onChange={(e) => set("guardianPhone", e.target.value)} /></Field>
                <Field label="Guardian Email"><input type="email" className={input()} value={formData.guardianEmail} onChange={(e) => set("guardianEmail", e.target.value)} /></Field>
              </div>
              <Field label="Guardian Address"><input className={input()} value={formData.guardianAddress} onChange={(e) => set("guardianAddress", e.target.value)} /></Field>
            </>
          )}
        </Section>

        {/* Section 3 */}
        <Section title="CLINICAL INFORMATION">
          <Field label="Primary Diagnosis" required><input className={input()} value={formData.primaryDiagnosis} onChange={(e) => set("primaryDiagnosis", e.target.value)} /></Field>
          <Field label="Secondary Diagnosis"><input className={input()} value={formData.secondaryDiagnosis} onChange={(e) => set("secondaryDiagnosis", e.target.value)} /></Field>
          <Field label="Current Medications"><textarea rows={3} className={input()} value={formData.currentMedications} onChange={(e) => set("currentMedications", e.target.value)} /></Field>
          <Field label="Known Allergies"><input className={input()} value={formData.knownAllergies} onChange={(e) => set("knownAllergies", e.target.value)} /></Field>
          <Field label="Current Supports & Services"><textarea rows={3} className={input()} value={formData.currentSupports} onChange={(e) => set("currentSupports", e.target.value)} /></Field>
          <Field label="Reason for Referral" required><textarea rows={4} className={input()} value={formData.reasonForReferral} onChange={(e) => set("reasonForReferral", e.target.value)} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Primary Insurance"><input className={input()} value={formData.primaryInsurance} onChange={(e) => set("primaryInsurance", e.target.value)} /></Field>
            <Field label="Medicaid / State ID"><input className={input()} value={formData.medicaidStateId} onChange={(e) => set("medicaidStateId", e.target.value)} /></Field>
          </div>
          <Field label="Urgency Level" required>
            <div className="flex gap-6 mt-1">
              {(["Routine", "Urgent", "Crisis"] as const).map((v) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="radio" name="urgencyLevel" value={v.toLowerCase()} checked={formData.urgencyLevel === v.toLowerCase()} onChange={() => set("urgencyLevel", v.toLowerCase())} className="accent-teal-600" />
                  {v}
                </label>
              ))}
            </div>
          </Field>
        </Section>

        {/* Section 4 */}
        <Section title="SERVICES REQUESTED">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SERVICES_OPTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={formData.services.includes(s)} onChange={() => toggleService(s)} className="accent-teal-600 w-4 h-4" />
                {s}
              </label>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-5 mt-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">REFERRAL SOURCE</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Your Name" required><input className={input()} value={formData.referrerName} onChange={(e) => set("referrerName", e.target.value)} /></Field>
              <Field label="Your Role / Title" required><input className={input()} value={formData.referrerRole} onChange={(e) => set("referrerRole", e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Your Organization" required><input className={input()} value={formData.referrerOrganization} onChange={(e) => set("referrerOrganization", e.target.value)} /></Field>
              <Field label="Your Phone" required><input type="tel" className={input()} value={formData.referrerPhone} onChange={(e) => set("referrerPhone", e.target.value)} /></Field>
            </div>
            <Field label="Your Email" required><input type="email" className={`${input()} sm:col-span-2`} value={formData.referrerEmail} onChange={(e) => set("referrerEmail", e.target.value)} /></Field>
            <Field label="How did you hear about us?">
              <select className={input()} value={formData.howHeard} onChange={(e) => set("howHeard", e.target.value)}>
                <option value="">Select…</option>
                <option>Physician / Hospital</option>
                <option>State Agency</option>
                <option>Self-referral</option>
                <option>Another provider</option>
                <option>Community organization</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Additional Notes"><textarea rows={3} className={input()} value={formData.additionalNotes} onChange={(e) => set("additionalNotes", e.target.value)} /></Field>
          </div>
        </Section>

        {/* File Upload */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">SUPPORTING DOCUMENTS</h3>
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${dragOver ? "border-teal-400 bg-teal-50" : "border-gray-200 hover:border-gray-300"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-7 h-7 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">Drag &amp; drop files here, or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOCX · Max 10MB each · Up to 5 files</p>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.docx" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </div>
          {files.length > 0 && (
            <ul className="mt-3 space-y-2">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="truncate max-w-[80%]">{f.name}</span>
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 transition-colors ml-2 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 leading-relaxed">
          <strong>Privacy Notice:</strong> The information you provide on this form is confidential and will only be used to evaluate and process your referral. It is protected under applicable federal and state privacy laws including HIPAA. By submitting this form, you confirm that you have the authority to share this information and that the individual (or their legal guardian) has provided consent.
        </div>

        {/* Authorization Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.confirmAuthorization}
            onChange={(e) => set("confirmAuthorization", e.target.checked)}
            className="accent-teal-600 w-4 h-4 mt-0.5 shrink-0"
          />
          <span className="text-sm text-gray-700">
            <strong>*</strong> I confirm that I am authorized to submit this referral and that the information provided is accurate to the best of my knowledge. I have obtained or have the authority to obtain consent from the individual or their legal representative.
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isValid() || submitting}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
        >
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit Referral"}
        </button>
        <p className="text-center text-xs text-gray-400 pb-6">
          Powered by CaseManagement.AI · Secure &amp; HIPAA-compliant
        </p>
      </form>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function input() {
  return "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-3">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
