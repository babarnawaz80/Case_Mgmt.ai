import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Home, Users, CheckSquare, MessageSquare, BarChart3,
  CreditCard, Settings, FileText, Pencil, CalendarCheck,
  Phone, AlertTriangle, Folder, ArrowRight,
  Loader2, Sparkles, User, Shield, X,
  Bell, Building2, Link, Upload, Clock,
  MapPin, Activity, ClipboardList, HeartPulse,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIndividuals, initials, riskAvatarClass } from "@/hooks/useIndividuals";

// ─── Types ──────────────────────────────────────────────────────────────────

export type CommandPaletteState = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  action: () => void;
  category: "Navigation" | "People" | "Actions" | "Settings" | "Sections";
  keywords?: string[];
}

// ─── Static item definitions ─────────────────────────────────────────────────

export const NAV_ITEMS: Omit<CommandItem, "action">[] = [
  { id: "nav-dashboard",     label: "Dashboard",         icon: Home,          category: "Navigation" },
  { id: "nav-my-work",       label: "My Work",            icon: CheckSquare,   category: "Navigation" },
  { id: "nav-people",        label: "People Supported",   icon: Users,         category: "Navigation" },
  { id: "nav-messages",      label: "Messages",           icon: MessageSquare, category: "Navigation" },
  { id: "nav-reports",       label: "Reports",            icon: BarChart3,     category: "Navigation" },
  { id: "nav-billing",       label: "Billing Hub",        icon: CreditCard,    category: "Navigation" },
  { id: "nav-incidents",     label: "Incidents",          icon: AlertTriangle, category: "Navigation" },
  { id: "nav-documents",     label: "Documents",          icon: Folder,        category: "Navigation" },
  { id: "nav-referrals",     label: "All Referrals",      icon: Phone,         category: "Navigation" },
  { id: "nav-team-meetings", label: "Team Meetings",      icon: Users,         category: "Navigation", keywords: ["team meeting", "meetings", "schedule meeting", "pcp review", "quarterly review", "meeting minutes", "transcribe", "publish minutes"] } as any,
  { id: "nav-settings",      label: "Settings",           icon: Settings,      category: "Navigation" },
];

export const ACTION_ITEMS: Omit<CommandItem, "action">[] = [
  {
    id: "act-new-progress-note",
    label: "New Progress Note",
    sublabel: "Create a progress note",
    icon: Pencil,
    category: "Actions",
    keywords: ["note", "document", "write"],
  },
  {
    id: "act-new-contact-note",
    label: "New Contact Note",
    sublabel: "Log a contact interaction",
    icon: FileText,
    category: "Actions",
    keywords: ["contact", "note", "log"],
  },
  {
    id: "act-new-visit",
    label: "New Visit Summary",
    sublabel: "Schedule or document a visit",
    icon: CalendarCheck,
    category: "Actions",
    keywords: ["visit", "schedule"],
  },
  {
    id: "act-new-incident",
    label: "New Incident Report",
    sublabel: "Report a critical incident",
    icon: AlertTriangle,
    category: "Actions",
    keywords: ["incident", "report"],
  },
  {
    id: "act-new-intake",
    label: "New Participant Intake",
    sublabel: "Enroll a new individual",
    icon: User,
    category: "Actions",
    keywords: ["intake", "new", "participant", "enroll"],
  },
  {
    id: "act-new-oncall",
    label: "New On-Call Log",
    sublabel: "Log an on-call interaction",
    icon: Phone,
    category: "Actions",
    keywords: ["oncall", "call", "log"],
  },
  {
    id: "act-compliance",
    label: "Compliance Dashboard",
    sublabel: "View compliance overview",
    icon: Shield,
    category: "Actions",
    keywords: ["compliance", "audit"],
  },
  {
    id: "act-ai",
    label: "Ask AI Assistant",
    sublabel: "Get AI insights about your caseload",
    icon: Sparkles,
    category: "Actions",
    keywords: ["ai", "ask", "help", "assistant"],
  },
];

export const NAV_ROUTES: Record<string, string> = {
  "nav-dashboard":     "/dashboard",
  "nav-my-work":       "/my-work",
  "nav-people":        "/people",
  "nav-messages":      "/messages",
  "nav-reports":       "/reports",
  "nav-billing":       "/billing",
  "nav-incidents":     "/incidents",
  "nav-documents":     "/documents",
  "nav-referrals":     "/referrals",
  "nav-team-meetings": "/team-meetings",
  "nav-settings":      "/settings",
};

export const ACTION_ROUTES: Record<string, string> = {
  "act-new-progress-note": "/progress-note/new",
  "act-new-contact-note":  "/modules/contact-note",
  "act-new-visit":         "/visit-summary/new",
  "act-new-intake":        "/people/new",
  "act-new-oncall":        "/oncall-log/new",
  "act-compliance":        "/supervisor/compliance",
};

export const SETTINGS_ITEMS: Omit<CommandItem, "action">[] = [
  { id: "set-org",           label: "Organization Profile",  sublabel: "Name, address, logo, brand color, NPI",   icon: Building2,  category: "Settings", keywords: ["organization", "org", "address", "logo", "brand", "color", "npi", "license", "phone", "fax", "states", "profile"] },
  { id: "set-security",      label: "Security & Password",   sublabel: "Password policy, session timeout, MFA",   icon: Shield,     category: "Settings", keywords: ["security", "password", "timeout", "session", "mfa", "2fa", "login", "expiry", "expire"] },
  { id: "set-users",         label: "Users & Permissions",   sublabel: "Manage team members and roles",           icon: Users,      category: "Settings", keywords: ["users", "staff", "team", "permissions", "roles", "invite", "add user", "members"] },
  { id: "set-billing",       label: "Billing Configuration", sublabel: "Service codes, rates, payers",            icon: CreditCard, category: "Settings", keywords: ["billing", "rates", "payers", "service codes", "claims", "invoice", "revenue"] },
  { id: "set-programs",      label: "Programs",              sublabel: "Configure service programs",              icon: Folder,     category: "Settings", keywords: ["programs", "services", "waiver", "idd", "dda"] },
  { id: "set-ai",            label: "AI Settings",           sublabel: "AI credits, features, models",            icon: Sparkles,   category: "Settings", keywords: ["ai", "credits", "gemini", "intelligence", "automation", "features"] },
  { id: "set-notifications", label: "Notifications",         sublabel: "Email and in-app notifications",          icon: Bell,       category: "Settings", keywords: ["notifications", "alerts", "email", "reminders"] },
  { id: "set-integrations",  label: "Integrations",          sublabel: "Third-party connections",                 icon: Link,       category: "Settings", keywords: ["integrations", "api", "connect", "third party", "deepgram", "voice"] },
  { id: "set-templates",     label: "Document Templates",    sublabel: "Note and form templates",                 icon: FileText,   category: "Settings", keywords: ["templates", "forms", "documents", "progress note", "contact note"] },
  { id: "set-import",        label: "Import Data",           sublabel: "Import individuals, staff, and data",     icon: Upload,     category: "Settings", keywords: ["import", "upload", "csv", "data", "individuals", "staff"] },
];

export const SETTINGS_ROUTES: Record<string, string> = {
  "set-org":           "/settings/organization",
  "set-security":      "/settings/security",
  "set-users":         "/settings/users",
  "set-billing":       "/settings/billing-config",
  "set-programs":      "/settings/programs",
  "set-ai":            "/settings/ai",
  "set-notifications": "/settings/notifications",
  "set-integrations":  "/settings/integrations",
  "set-templates":     "/settings/templates",
  "set-import":        "/settings/import",
};

// ─── Section / Field items — profile fields, eChart modules, features ────────
// These allow users to search for ANY concept in the system and jump there.
// Items that need a person first link to /people; module-level pages have
// their own routes (incidents, referrals, billing, etc.)

export const SECTION_ITEMS: Omit<CommandItem, "action">[] = [

  // ── Individual Profile ────────────────────────────────────────────────────
  {
    id: "sec-personal-info",
    label: "Personal Information",
    sublabel: "Individual Profile · Name, date of birth, gender, SSN",
    icon: User, category: "Sections",
    keywords: ["personal", "personal info", "name", "first name", "last name", "date of birth", "dob", "birthday", "age", "gender", "sex", "ssn", "social security", "full name"],
  },
  {
    id: "sec-address",
    label: "Address & Location",
    sublabel: "Individual Profile · Home address, city, state, zip, county",
    icon: MapPin, category: "Sections",
    keywords: ["address", "street", "city", "state", "zip", "zipcode", "postal", "county", "location", "home address", "mailing address", "residence", "where they live"],
  },
  {
    id: "sec-contact-info",
    label: "Contact Information",
    sublabel: "Individual Profile · Phone, mobile, email",
    icon: Phone, category: "Sections",
    keywords: ["contact", "phone", "mobile", "cell", "telephone", "email", "email address", "call", "number", "reach"],
  },
  {
    id: "sec-emergency-contacts",
    label: "Emergency Contacts",
    sublabel: "Individual Profile · Emergency contact, next of kin, family",
    icon: Phone, category: "Sections",
    keywords: ["emergency", "emergency contact", "next of kin", "family", "parent", "spouse", "relative", "in case of emergency", "ice", "contact person"],
  },
  {
    id: "sec-insurance",
    label: "Insurance & Medicaid ID",
    sublabel: "Individual Profile · Medicaid ID, LTSS ID, Medicare, payer",
    icon: CreditCard, category: "Sections",
    keywords: ["insurance", "medicaid", "medicare", "payer", "coverage", "medicaid id", "ltss", "ltss id", "member id", "insurance plan", "health insurance", "ma", "ma number"],
  },
  {
    id: "sec-diagnosis",
    label: "Diagnoses & Medical Conditions",
    sublabel: "Individual Profile · ICD-10 codes, primary and secondary diagnoses",
    icon: Activity, category: "Sections",
    keywords: ["diagnosis", "diagnoses", "icd", "icd-10", "icd10", "medical condition", "condition", "primary diagnosis", "secondary diagnosis", "medical history", "dx", "disability", "intellectual disability", "autism", "asd", "cerebral palsy", "seizure", "epilepsy", "mental health", "psychiatric", "bi-polar", "schizophrenia", "depression", "anxiety"],
  },
  {
    id: "sec-allergies",
    label: "Allergies",
    sublabel: "Individual Profile · Known allergies and adverse reactions",
    icon: AlertTriangle, category: "Sections",
    keywords: ["allergy", "allergies", "reaction", "allergic", "food allergy", "medication allergy", "drug allergy", "latex", "bee sting", "anaphylaxis", "adverse reaction"],
  },
  {
    id: "sec-pcp",
    label: "Primary Care Physician",
    sublabel: "Individual Profile · PCP, doctor, specialist, provider",
    icon: User, category: "Sections",
    keywords: ["pcp", "primary care", "physician", "doctor", "provider", "healthcare provider", "medical provider", "specialist", "psychiatrist", "neurologist", "pediatrician", "gp", "general practitioner"],
  },
  {
    id: "sec-program-enrollment",
    label: "Program & Waiver Enrollment",
    sublabel: "Individual Profile · Waiver program, level of care, service type",
    icon: Folder, category: "Sections",
    keywords: ["program", "waiver", "enrollment", "level of care", "loc", "hcbs", "idd", "dda", "ccs", "service program", "waiver program", "enrolled", "service type", "service category", "ltss waiver", "community living", "supported living"],
  },
  {
    id: "sec-enrollment-status",
    label: "Enrollment Status",
    sublabel: "Individual Profile · Active, discharged, pending, transition",
    icon: CheckSquare, category: "Sections",
    keywords: ["enrollment status", "status", "active", "discharged", "discharge", "pending", "transition", "enrollment", "disenrollment", "terminated", "closed case", "open case"],
  },
  {
    id: "sec-legal",
    label: "Court & Legal Status",
    sublabel: "Individual Profile · Court involvement, guardianship, conservatorship",
    icon: Shield, category: "Sections",
    keywords: ["court", "court involvement", "legal", "legal status", "guardianship", "guardian", "legal guardian", "power of attorney", "poa", "rep payee", "representative payee", "custody", "conservatorship", "judge", "attorney", "court order", "probation", "parole", "criminal", "dss", "dcfs"],
  },
  {
    id: "sec-consent",
    label: "Consent Forms & Releases",
    sublabel: "Individual Profile · Consent, ROI, HIPAA authorization",
    icon: FileText, category: "Sections",
    keywords: ["consent", "consent form", "release", "roi", "release of information", "hipaa", "authorization", "signed consent", "release form", "disclosure", "privacy", "signature"],
  },
  {
    id: "sec-housing",
    label: "Housing Status",
    sublabel: "Individual Profile · Living situation, home type, residential setting",
    icon: Home, category: "Sections",
    keywords: ["housing", "housing status", "living situation", "home", "residence", "residential", "homeless", "group home", "independent living", "supported living", "living arrangement", "apartment", "family home", "foster", "community residence", "icf"],
  },
  {
    id: "sec-demographics",
    label: "Demographics",
    sublabel: "Individual Profile · Race, ethnicity, language, interpreter needs",
    icon: Users, category: "Sections",
    keywords: ["demographics", "race", "ethnicity", "language", "preferred language", "interpreter", "translation", "culture", "hispanic", "latino", "spanish", "bilingual", "english", "lep", "limited english"],
  },
  {
    id: "sec-service-dates",
    label: "Service Dates & History",
    sublabel: "Individual Profile · Start date, discharge date, enrollment history",
    icon: CalendarCheck, category: "Sections",
    keywords: ["service start", "start date", "enrollment date", "effective date", "admission date", "discharge date", "service dates", "service history", "anniversary", "renewal"],
  },

  // ── eChart Modules ────────────────────────────────────────────────────────
  {
    id: "sec-progress-notes",
    label: "Progress Notes",
    sublabel: "eChart · Session documentation, case notes",
    icon: Pencil, category: "Sections",
    keywords: ["progress note", "progress notes", "note", "documentation", "case notes", "session notes", "daily note", "weekly note", "monthly note", "t2041", "h2015", "h0038"],
  },
  {
    id: "sec-contact-notes",
    label: "Contact Notes",
    sublabel: "eChart · Phone calls, emails, face-to-face contacts logged",
    icon: Phone, category: "Sections",
    keywords: ["contact note", "contact notes", "phone call", "face to face", "f2f", "email contact", "interaction", "outreach", "attempted contact", "voicemail", "left message"],
  },
  {
    id: "sec-visit-summaries",
    label: "Visit Summaries",
    sublabel: "eChart · Home visits, field visits, in-person documentation",
    icon: CalendarCheck, category: "Sections",
    keywords: ["visit", "visit summary", "home visit", "field visit", "in person", "scheduled visit", "visit documentation", "monthly visit", "quarterly visit"],
  },
  {
    id: "sec-care-plan",
    label: "Care Plans",
    sublabel: "eChart · Person-centered plans, ISP, goals, objectives",
    icon: ClipboardList, category: "Sections",
    keywords: ["care plan", "isp", "person centered plan", "service plan", "goals", "care goals", "life plan", "individual support plan", "objective", "outcome", "care planning", "annual plan", "plan of care"],
  },
  {
    id: "sec-monitoring",
    label: "Monitoring Forms",
    sublabel: "eChart · Health monitoring, behavioral data, vital signs",
    icon: Activity, category: "Sections",
    keywords: ["monitoring", "monitoring form", "health monitoring", "vital signs", "weight", "blood pressure", "bp", "behavioral monitoring", "bmi", "temperature", "pulse", "data collection", "monthly monitoring"],
  },
  {
    id: "sec-service-authorizations",
    label: "Service Authorizations",
    sublabel: "eChart · Auth numbers, approved units, prior authorizations",
    icon: Shield, category: "Sections",
    keywords: ["authorization", "service authorization", "auth", "prior auth", "pa", "approved units", "billing authorization", "auth number", "prior authorization", "approved hours"],
  },
  {
    id: "sec-eligibility",
    label: "Eligibility Verification",
    sublabel: "eChart · MA status checks, Medicaid eligibility records",
    icon: CheckSquare, category: "Sections",
    keywords: ["eligibility", "eligibility verification", "ma status", "medicaid eligibility", "evs", "eligibility check", "coverage verification", "ma check", "verify coverage"],
  },
  {
    id: "sec-medications",
    label: "Medications",
    sublabel: "eChart · Medication list, dosage, prescriber, reminders",
    icon: HeartPulse, category: "Sections",
    keywords: ["medication", "medications", "prescription", "prescriptions", "med", "meds", "drug", "drugs", "pharmacy", "dosage", "dose", "pill", "tablet", "metformin", "lisinopril", "prescriber", "refill"],
  },
  {
    id: "sec-managed-documents",
    label: "Managed Documents",
    sublabel: "eChart · Uploaded files, evaluations, legal docs, consent forms",
    icon: Folder, category: "Sections",
    keywords: ["managed documents", "documents", "document", "uploads", "files", "attachments", "evaluations", "assessment", "psychological evaluation", "legal documents", "consent forms", "releases", "upload file", "attach", "psychosocial"],
  },
  {
    id: "sec-oncall-log",
    label: "On-Call Log",
    sublabel: "eChart · After-hours calls, crisis contacts, on-call notes",
    icon: Phone, category: "Sections",
    keywords: ["on call", "oncall", "on-call", "after hours", "after-hours", "emergency call", "crisis", "on call log", "night call", "weekend call"],
  },
  {
    id: "sec-incidents",
    label: "Incident Reports",
    sublabel: "eChart · Critical incidents, adverse events, behavioral incidents",
    icon: AlertTriangle, category: "Sections",
    keywords: ["incident", "incident report", "critical incident", "adverse event", "behavioral incident", "injury", "abuse", "neglect", "fall", "elopement", "restraint", "altercation", "sei", "serious event", "reportable incident"],
  },
  {
    id: "sec-referrals-echart",
    label: "Referrals",
    sublabel: "eChart · Service referrals, specialist referrals, referral tracking",
    icon: ArrowRight, category: "Sections",
    keywords: ["referral", "referrals", "service referral", "specialist referral", "mental health referral", "refer", "referred", "referral status", "referral source"],
  },
  {
    id: "sec-workflow",
    label: "Workflow Manager",
    sublabel: "eChart · Task workflows, checklists, automated reminders",
    icon: CheckSquare, category: "Sections",
    keywords: ["workflow", "workflows", "task workflow", "checklist", "automated task", "template task", "task template"],
  },

  // ── Billing ───────────────────────────────────────────────────────────────
  {
    id: "sec-claims",
    label: "Claims & Billing Records",
    sublabel: "Billing Hub · Claims status, submitted, paid, denied",
    icon: CreditCard, category: "Sections",
    keywords: ["claim", "claims", "billing record", "submit claim", "claim status", "paid", "denied", "pending claim", "remittance", "835", "837", "edi", "claim submission", "rejected"],
  },
  {
    id: "sec-service-codes",
    label: "Service Codes & Rates",
    sublabel: "Settings · Procedure codes, unit rates, billing codes",
    icon: CreditCard, category: "Sections",
    keywords: ["service code", "procedure code", "billing code", "rate", "unit rate", "t2022", "h0038", "t2041", "h2015", "cpt", "hcpcs", "revenue code", "billing rate", "fee schedule"],
  },
  {
    id: "sec-payers",
    label: "Payers & Funding Sources",
    sublabel: "Settings · Medicaid payers, managed care, private pay",
    icon: CreditCard, category: "Sections",
    keywords: ["payer", "payers", "funding", "funding source", "medicaid payer", "managed care", "mco", "insurance payer", "private pay", "self pay", "third party"],
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  {
    id: "sec-org-logo",
    label: "Organization Logo & Branding",
    sublabel: "Settings · Upload logo, set brand colors",
    icon: Building2, category: "Sections",
    keywords: ["logo", "brand", "branding", "organization logo", "color", "brand color", "upload logo", "letterhead"],
  },
  {
    id: "sec-npi",
    label: "NPI & License Numbers",
    sublabel: "Settings · Organization NPI, license number, taxonomy",
    icon: Building2, category: "Sections",
    keywords: ["npi", "national provider", "license", "license number", "taxonomy", "provider number", "ein", "tax id", "tin", "organization npi"],
  },
  {
    id: "sec-staff-roles",
    label: "Staff Roles & Permissions",
    sublabel: "Settings · Admin, supervisor, case manager roles",
    icon: Shield, category: "Sections",
    keywords: ["role", "roles", "permission", "permissions", "access", "staff role", "case manager role", "admin role", "supervisor role", "billing role", "restrict access"],
  },
  {
    id: "sec-staff-profiles",
    label: "Staff Profiles",
    sublabel: "Settings · View or edit staff member details",
    icon: Users, category: "Sections",
    keywords: ["staff", "employee", "team member", "case worker", "staff profile", "worker", "coordinator", "care coordinator", "employee profile"],
  },
  {
    id: "sec-invite-user",
    label: "Invite Team Member",
    sublabel: "Settings · Send invite to add a new staff user",
    icon: Users, category: "Sections",
    keywords: ["invite", "add user", "new user", "add staff", "invite staff", "send invite", "add team member", "onboard staff"],
  },
  {
    id: "sec-writing-style",
    label: "AI Writing Style",
    sublabel: "Settings · Configure how AI writes notes and summaries",
    icon: Sparkles, category: "Sections",
    keywords: ["writing style", "ai style", "note style", "ai writing", "writing config", "help me write", "ai tone", "ai voice", "writing configuration"],
  },
  {
    id: "sec-ambient",
    label: "Ambient AI / Session Recording",
    sublabel: "eChart · Record and transcribe case management sessions",
    icon: Sparkles, category: "Sections",
    keywords: ["ambient", "recording", "transcribe", "transcription", "session recording", "voice", "ambient ai", "audio", "deepgram", "session note", "auto note"],
  },
  {
    id: "sec-face-sheet",
    label: "Face Sheet",
    sublabel: "eChart · One-page summary with key individual details",
    icon: FileText, category: "Sections",
    keywords: ["face sheet", "facesheet", "summary page", "quick view", "overview", "snapshot", "one pager"],
  },
  {
    id: "sec-assigned-staff",
    label: "Assigned Staff / Case Manager",
    sublabel: "eChart · Who is assigned to support this individual",
    icon: Users, category: "Sections",
    keywords: ["assigned staff", "case manager", "assigned", "care team", "team", "who is assigned", "change case manager", "reassign", "caseload assignment"],
  },
  {
    id: "sec-ai-checkins",
    label: "AI Check-Ins",
    sublabel: "eChart · Automated digital check-in conversations",
    icon: Sparkles, category: "Sections",
    keywords: ["check in", "checkin", "ai check-in", "digital check-in", "automated check-in", "check-in link", "survey", "daily check"],
  },
  {
    id: "sec-compliance-risk",
    label: "Compliance Risk Score",
    sublabel: "People Supported · Risk score, monitoring level",
    icon: Shield, category: "Sections",
    keywords: ["compliance risk", "risk score", "risk", "high risk", "compliance", "monitoring level", "risk level", "low risk", "moderate risk"],
  },
  {
    id: "sec-import",
    label: "Import Individuals or Staff",
    sublabel: "Settings · CSV import for bulk data upload",
    icon: Upload, category: "Sections",
    keywords: ["import", "upload", "csv", "bulk import", "import individuals", "import staff", "bulk upload", "data import", "spreadsheet"],
  },
  {
    id: "sec-reports-overview",
    label: "Reports & Analytics",
    sublabel: "Reports · Caseload, compliance, billing analytics",
    icon: BarChart3, category: "Sections",
    keywords: ["report", "reports", "analytics", "dashboard analytics", "caseload report", "compliance report", "billing report", "statistics", "data", "export", "summary report"],
  },
  {
    id: "sec-new-participant",
    label: "New Participant / Intake Form",
    sublabel: "Enroll a new individual in the system",
    icon: User, category: "Sections",
    keywords: ["intake", "new participant", "enroll", "new individual", "add person", "new client", "new admission", "registration", "intake form", "onboarding"],
  },
  {
    id: "sec-team-meetings",
    label: "Team Meetings",
    sublabel: "Schedule, transcribe, and publish meeting minutes",
    icon: Users, category: "Sections",
    keywords: ["team meeting", "meeting", "meetings", "schedule meeting", "new meeting", "pcp review", "annual pcp", "quarterly review", "transition planning", "crisis meeting", "meeting minutes", "transcribe", "publish minutes", "agenda", "action items", "attendees", "zoom meeting", "in-person meeting"],
  },
];

export const SECTION_ROUTES: Record<string, string> = {
  // Profile fields → /people (user selects person then navigates)
  "sec-personal-info":       "/people",
  "sec-address":             "/people",
  "sec-contact-info":        "/people",
  "sec-emergency-contacts":  "/people",
  "sec-insurance":           "/people",
  "sec-diagnosis":           "/people",
  "sec-allergies":           "/people",
  "sec-pcp":                 "/people",
  "sec-program-enrollment":  "/settings/programs",
  "sec-enrollment-status":   "/people",
  "sec-legal":               "/people",
  "sec-consent":             "/people",
  "sec-housing":             "/people",
  "sec-demographics":        "/people",
  "sec-service-dates":       "/people",
  // eChart modules → /people (user selects person first)
  "sec-progress-notes":      "/people",
  "sec-contact-notes":       "/people",
  "sec-visit-summaries":     "/people",
  "sec-care-plan":           "/people",
  "sec-monitoring":          "/people",
  "sec-service-authorizations": "/people",
  "sec-eligibility":         "/people",
  "sec-medications":         "/people",
  "sec-managed-documents":   "/people",
  "sec-oncall-log":          "/people",
  "sec-incidents":           "/incidents",
  "sec-referrals-echart":    "/referrals",
  "sec-workflow":            "/people",
  // Billing
  "sec-claims":              "/billing",
  "sec-service-codes":       "/settings/billing-config",
  "sec-payers":              "/settings/billing-config",
  // Settings
  "sec-org-logo":            "/settings/organization",
  "sec-npi":                 "/settings/organization",
  "sec-staff-roles":         "/settings/users",
  "sec-staff-profiles":      "/settings/users",
  "sec-invite-user":         "/settings/users",
  "sec-writing-style":       "/settings/ai",
  "sec-ambient":             "/people",
  "sec-face-sheet":          "/people",
  "sec-assigned-staff":      "/people",
  "sec-ai-checkins":         "/people",
  "sec-compliance-risk":     "/people",
  "sec-import":              "/settings/import",
  "sec-reports-overview":    "/reports",
  "sec-new-participant":     "/people/new",
  "sec-team-meetings":       "/team-meetings",
};

// ─── Recent items helpers ─────────────────────────────────────────────────────

const RECENT_KEY = "cp_recent_v1";
const RECENT_MAX = 5;

function loadRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecentId(id: string): void {
  try {
    const current = loadRecentIds().filter((i) => i !== id);
    const next = [id, ...current].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

// ─── Singleton open/close state ───────────────────────────────────────────────

type Listener = (open: boolean) => void;
const paletteListeners = new Set<Listener>();
let paletteOpen = false;

export function openCommandPalette() {
  paletteOpen = true;
  paletteListeners.forEach((l) => l(true));
}

export function closeCommandPalette() {
  paletteOpen = false;
  paletteListeners.forEach((l) => l(false));
}

export function useCommandPalette() {
  const [open, setOpenRaw] = useState(paletteOpen);
  useEffect(() => {
    const cb = (v: boolean) => setOpenRaw(v);
    paletteListeners.add(cb);
    return () => {
      paletteListeners.delete(cb);
    };
  }, []);
  return {
    open,
    toggle: () => {
      paletteOpen ? closeCommandPalette() : openCommandPalette();
    },
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpenRaw] = useState(paletteOpen);
  const [q, setQ] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { individuals, loading: loadingPeople } = useIndividuals();

  // Subscribe to singleton state
  useEffect(() => {
    const cb = (v: boolean) => setOpenRaw(v);
    paletteListeners.add(cb);
    return () => {
      paletteListeners.delete(cb);
    };
  }, []);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        paletteOpen ? closeCommandPalette() : openCommandPalette();
      }
      if (e.key === "Escape" && paletteOpen) {
        closeCommandPalette();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Auto-focus input when opened; reset state + load recents
  useEffect(() => {
    if (open) {
      setQ("");
      setSelectedIdx(0);
      setRecentIds(loadRecentIds());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build full command list (memoised by individuals + navigate)
  const allItems = useMemo((): CommandItem[] => {
    const navItems: CommandItem[] = NAV_ITEMS.map((n) => ({
      ...n,
      action: () => navigate(NAV_ROUTES[n.id]),
    }));

    const actionItems: CommandItem[] = ACTION_ITEMS.map((a) => ({
      ...a,
      action: () => {
        if (ACTION_ROUTES[a.id]) {
          navigate(ACTION_ROUTES[a.id]);
        } else if (a.id === "act-new-incident") {
          navigate("/incidents");
        }
        // act-ai has no route; handled by AI panel — no-op here (future: toggleAI)
      },
    }));

    const settingsItems: CommandItem[] = SETTINGS_ITEMS.map((s) => ({
      ...s,
      action: () => navigate(SETTINGS_ROUTES[s.id]),
    }));

    const sectionItems: CommandItem[] = SECTION_ITEMS.map((s) => ({
      ...s,
      action: () => navigate(SECTION_ROUTES[s.id] ?? "/people"),
    }));

    const peopleItems: CommandItem[] = individuals
      .filter((p) => p.enrollment_status === "active")
      .slice(0, 100)
      .map((p) => ({
        id: `person-${p.id}`,
        label: `${p.first_name} ${p.last_name}`,
        sublabel: [p.county, p.program].filter(Boolean).join(" · ") || undefined,
        icon: User,
        category: "People" as const,
        action: () => navigate(`/people/${p.id}/echart`),
        // Expanded keywords: Medicaid ID, LTSS ID, program, county, status
        keywords: [
          p.first_name, p.last_name,
          p.county ?? "",
          p.medicaid_id ?? "",
          p.ltss_id ?? "",
          p.program ?? "",
          p.enrollment_status ?? "",
        ].filter(Boolean),
      }));

    return [...actionItems, ...navItems, ...settingsItems, ...sectionItems, ...peopleItems];
  }, [individuals, navigate]);

  // Filter by query
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) {
      // Empty state: show Actions + top Nav + top People. No Sections (too many).
      const actions = allItems.filter((i) => i.category === "Actions");
      const nav     = allItems.filter((i) => i.category === "Navigation").slice(0, 6);
      const people  = allItems.filter((i) => i.category === "People").slice(0, 5);
      return [...actions, ...nav, ...people];
    }
    return allItems
      .filter((item) => {
        const searchable = [item.label, item.sublabel ?? "", ...(item.keywords ?? [])]
          .join(" ")
          .toLowerCase();
        return searchable.includes(term);
      })
      .slice(0, 30);
  }, [allItems, q]);

  // Resolve recent ids to full CommandItems (for display when query is empty)
  const recentItems = useMemo((): CommandItem[] => {
    if (q.trim()) return [];
    return recentIds
      .map((id) => allItems.find((item) => item.id === id))
      .filter((item): item is CommandItem => item != null);
  }, [recentIds, allItems, q]);

  // Group results by category (ordered), with Recent prepended when query is empty
  const groups = useMemo(() => {
    type GroupEntry = { category: string; items: CommandItem[] };
    const result: GroupEntry[] = [];

    if (recentItems.length > 0) {
      result.push({ category: "Recent", items: recentItems });
    }

    const order: CommandItem["category"][] = ["Actions", "Sections", "People", "Navigation", "Settings"];
    const map = new Map<string, CommandItem[]>();
    filtered.forEach((item) => {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    });
    order
      .filter((cat) => map.has(cat))
      .forEach((cat) => result.push({ category: cat, items: map.get(cat)! }));

    return result;
  }, [filtered, recentItems]);

  // Flat index map for keyboard selection (includes all items across groups)
  const { itemFlatIdx, flatItems } = useMemo(() => {
    let idx = 0;
    const m = new Map<string, number>();
    const flat: CommandItem[] = [];
    groups.forEach((g) => g.items.forEach((item) => {
      m.set(item.id, idx++);
      flat.push(item);
    }));
    return { itemFlatIdx: m, flatItems: flat };
  }, [groups]);

  // Select an item: run its action, save to recents, close
  function selectItem(item: CommandItem) {
    saveRecentId(item.id);
    setRecentIds(loadRecentIds());
    item.action();
    closeCommandPalette();
  }

  // Keyboard navigation inside the input
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[selectedIdx];
      if (item) {
        selectItem(item);
      }
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4 bg-black/40 backdrop-blur-sm"
      onClick={closeCommandPalette}
    >
      <div
        className="w-full max-w-[600px] rounded-2xl bg-icm-panel border border-icm-border shadow-[0_32px_80px_-12px_rgba(0,0,0,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        {/* ── Search input ── */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-icm-border bg-icm-panel">
          <Search className="w-[18px] h-[18px] text-icm-accent shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search people, settings, actions, pages…"
            className="flex-1 bg-transparent text-[15px] font-geist font-medium text-icm-text placeholder:text-icm-text-faint focus:outline-none"
            aria-label="Command palette search"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="w-6 h-6 rounded flex items-center justify-center text-icm-text-faint hover:text-icm-text transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono text-icm-text-faint bg-icm-bg border border-icm-border">
            ESC
          </kbd>
        </div>

        {/* ── Results list ── */}
        <div ref={listRef} className="max-h-[420px] overflow-y-auto py-1.5">
          {/* Loading indicator (only when querying people) */}
          {loadingPeople && q && (
            <div className="flex items-center gap-2 px-4 py-3 text-[12px] text-icm-text-dim font-geist">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading people…
            </div>
          )}

          {/* Empty state */}
          {!loadingPeople && flatItems.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] text-icm-text-dim font-geist">
                No results for &ldquo;{q}&rdquo;
              </p>
              <p className="text-[11px] text-icm-text-faint font-geist mt-1">
                Try a different search term
              </p>
            </div>
          )}

          {/* Grouped results */}
          {groups.map(({ category, items }) => (
            <div key={category}>
              {/* Category header */}
              <div className="flex items-center gap-2 px-4 pt-3 pb-1 select-none">
                {category === "Recent" && <Clock className="w-3 h-3 text-icm-text-faint" />}
                <p className="text-[10px] uppercase tracking-[0.08em] font-geist font-semibold text-icm-text-faint">
                  {category}
                </p>
                <div className="flex-1 h-px bg-icm-border/60" />
              </div>
              {items.map((item) => {
                const idx = itemFlatIdx.get(item.id) ?? 0;
                const isSelected = idx === selectedIdx;
                const Icon = item.icon;
                const isPerson = item.category === "People";
                const personId = isPerson ? item.id.replace("person-", "") : null;
                const person = personId ? individuals.find((p) => p.id === personId) : null;
                const isSettings = item.category === "Settings";

                return (
                  <button
                    key={item.id}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={cn(
                      "group w-full text-left flex items-center gap-3 px-4 py-2 transition-colors",
                      isSelected ? "bg-icm-accent-soft" : "hover:bg-icm-bg"
                    )}
                  >
                    {/* Avatar or icon */}
                    {isPerson && person ? (
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-semibold shrink-0",
                          riskAvatarClass(person.risk_score)
                        )}
                      >
                        {initials(person)}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "bg-icm-accent/15 text-icm-accent"
                            : isSettings
                              ? "bg-icm-bg/60 text-icm-text-dim"
                              : "bg-icm-bg text-icm-text-dim border border-icm-border"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    )}

                    {/* Label + sublabel */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-[13px] font-geist truncate",
                          isSelected
                            ? "font-semibold text-icm-accent"
                            : "font-semibold text-icm-text"
                        )}
                      >
                        {item.label}
                      </p>
                      {item.sublabel && (
                        <p className="text-[11px] text-icm-text-dim font-geist truncate">
                          {item.sublabel}
                        </p>
                      )}
                    </div>

                    {/* ↵ hint — visible only on hover/selected */}
                    <kbd
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-mono border transition-opacity shrink-0",
                        isSelected
                          ? "opacity-100 bg-icm-accent/10 border-icm-accent/30 text-icm-accent"
                          : "opacity-0 group-hover:opacity-60 bg-icm-bg border-icm-border text-icm-text-faint"
                      )}
                    >
                      ↵
                    </kbd>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Footer: keyboard hints ── */}
        <div className="px-4 py-2 border-t border-icm-border flex items-center justify-center gap-3 text-[10px] font-geist text-icm-text-faint">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded text-[9px] font-mono bg-icm-bg border border-icm-border leading-none">↑↓</kbd>
            navigate
          </span>
          <span className="text-icm-border select-none">·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded text-[9px] font-mono bg-icm-bg border border-icm-border leading-none">↵</kbd>
            select
          </span>
          <span className="text-icm-border select-none">·</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded text-[9px] font-mono bg-icm-bg border border-icm-border leading-none">esc</kbd>
            close
          </span>
          <span className="ml-auto inline-flex items-center gap-1 opacity-60">
            <Sparkles className="w-3 h-3 text-icm-accent" />
            CaseManagement.AI
          </span>
        </div>
      </div>
    </div>
  );
}
