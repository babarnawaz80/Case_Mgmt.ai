// Document Management mock data layer
// Per-individual vaults + agency-wide library + AI extraction metadata

export type FolderColor =
  | "blue"
  | "green"
  | "red"
  | "amber"
  | "purple"
  | "pink"
  | "gray"
  | "teal";

export interface Folder {
  id: string;
  name: string;
  color: FolderColor;
  parentId?: string;
}

export type DocumentType =
  | "Consent Form"
  | "Assessment"
  | "Care Plan"
  | "Medical Record"
  | "Insurance Card"
  | "Legal Document"
  | "Correspondence"
  | "Photo"
  | "ID"
  | "State Form"
  | "Policy"
  | "Template"
  | "Training"
  | "Other";

export type FileExt = "pdf" | "jpg" | "png" | "docx" | "xlsx" | "txt";

export type AIStatus = "indexed" | "processing" | "not_indexed" | "error";

export interface ExtractedField {
  label: string;
  value: string;
  confidence: number; // 0-1
}

export interface DocumentRecord {
  id: string;
  name: string;
  ext: FileExt;
  sizeKB: number;
  folderId: string;
  type: DocumentType;
  uploadedOn: string; // MM/DD/YYYY
  uploadedBy: string;
  expiresOn?: string;
  notes?: string;
  aiStatus: AIStatus;
  aiSummary?: string;
  extracted?: ExtractedField[];
  tags: string[];
  shared?: boolean;
  individualId?: string; // undefined = org library
}

// ---- Default folder set used to seed every individual's vault ---------------
export const defaultIndividualFolders: Omit<Folder, "id">[] = [
  { name: "Consent Forms", color: "blue" },
  { name: "Assessments & Evaluations", color: "purple" },
  { name: "Care Plans & ISP", color: "teal" },
  { name: "Medical Records", color: "red" },
  { name: "Insurance & Benefits", color: "green" },
  { name: "Legal & Guardianship", color: "amber" },
  { name: "State Forms", color: "pink" },
  { name: "Correspondence", color: "gray" },
  { name: "Photos & IDs", color: "blue" },
  { name: "Other", color: "gray" },
];

export function buildIndividualFolders(individualId: string): Folder[] {
  return defaultIndividualFolders.map((f, i) => ({
    ...f,
    id: `${individualId}-fld-${i}`,
  }));
}

// ---- Joseph Brown seed ------------------------------------------------------
const JOSEPH = "p-001";
const josephFolders = buildIndividualFolders(JOSEPH);

const fldByName = (n: string) =>
  josephFolders.find((f) => f.name === n)!.id;

export const josephDocuments: DocumentRecord[] = [
  {
    id: "doc-jb-1",
    name: "HIPAA Consent Form 2022.pdf",
    ext: "pdf",
    sizeKB: 412,
    folderId: fldByName("Consent Forms"),
    type: "Consent Form",
    uploadedOn: "09/01/2022",
    uploadedBy: "Babar Nawaz CM",
    aiStatus: "indexed",
    individualId: JOSEPH,
    aiSummary:
      "HIPAA Authorization signed by Joseph Brown and his mother Linda Brown on 09/01/2022. No expiration stated.",
    extracted: [
      { label: "Form type", value: "HIPAA Authorization", confidence: 0.94 },
      { label: "Individual name", value: "Joseph Brown", confidence: 0.99 },
      { label: "Date signed", value: "09/01/2022", confidence: 0.98 },
      { label: "Authorized person", value: "Linda Brown", confidence: 0.91 },
      { label: "Expiration", value: "No expiration stated", confidence: 0.87 },
    ],
    tags: ["Consent", "HIPAA", "Signed"],
  },
  {
    id: "doc-jb-2",
    name: "Service Authorization Consent 2022.pdf",
    ext: "pdf",
    sizeKB: 388,
    folderId: fldByName("Consent Forms"),
    type: "Consent Form",
    uploadedOn: "09/01/2022",
    uploadedBy: "Babar Nawaz CM",
    expiresOn: "09/01/2026",
    aiStatus: "indexed",
    individualId: JOSEPH,
    aiSummary:
      "Service Authorization consent signed 09/01/2022, expired 09/01/2026 — needs renewal.",
    extracted: [
      { label: "Form type", value: "Service Authorization", confidence: 0.93 },
      { label: "Date signed", value: "09/01/2022", confidence: 0.98 },
      { label: "Expiration", value: "09/01/2026", confidence: 0.96 },
    ],
    tags: ["Consent", "Authorization", "Signed", "Expired"],
  },
  {
    id: "doc-jb-3",
    name: "Initial Assessment 2022.pdf",
    ext: "pdf",
    sizeKB: 1124,
    folderId: fldByName("Assessments & Evaluations"),
    type: "Assessment",
    uploadedOn: "09/01/2022",
    uploadedBy: "Babar Nawaz CM",
    aiStatus: "indexed",
    individualId: JOSEPH,
    aiSummary:
      "Comprehensive intake assessment completed 09/01/2022. Overall score 42, LOC Moderate.",
    extracted: [
      { label: "Assessment type", value: "Comprehensive", confidence: 0.88 },
      { label: "Assessment date", value: "09/01/2022", confidence: 0.99 },
      { label: "Completed by", value: "Babar Nawaz", confidence: 0.96 },
      { label: "Overall score", value: "42", confidence: 0.94 },
      { label: "LOC", value: "Moderate", confidence: 0.91 },
    ],
    tags: ["Assessment", "2022", "Completed"],
  },
  {
    id: "doc-jb-4",
    name: "Insurance Card Blue Cross 2026.jpg",
    ext: "jpg",
    sizeKB: 286,
    folderId: fldByName("Insurance & Benefits"),
    type: "Insurance Card",
    uploadedOn: "01/15/2026",
    uploadedBy: "Babar Nawaz CM",
    expiresOn: "12/31/2026",
    aiStatus: "indexed",
    individualId: JOSEPH,
    aiSummary:
      "Blue Cross insurance card. Policy XYZ123456, group GRP-001. Effective 01/01/2026, expires 12/31/2026.",
    extracted: [
      { label: "Provider", value: "Blue Cross", confidence: 0.98 },
      { label: "Policy number", value: "XYZ123456", confidence: 0.97 },
      { label: "Member ID", value: "987654321", confidence: 0.95 },
      { label: "Group number", value: "GRP-001", confidence: 0.92 },
      { label: "Effective date", value: "01/01/2026", confidence: 0.99 },
      { label: "Expiration", value: "12/31/2026", confidence: 0.99 },
    ],
    tags: ["Insurance", "Active", "Blue Cross"],
  },
];

// ---- Org library seed -------------------------------------------------------
export const orgFolders: Folder[] = [
  { id: "org-fld-1", name: "Blank Forms & Templates", color: "blue" },
  { id: "org-fld-2", name: "State Required Forms", color: "pink" },
  { id: "org-fld-3", name: "Agency Policies", color: "amber" },
  { id: "org-fld-4", name: "Training Materials", color: "purple" },
  { id: "org-fld-5", name: "Announcements", color: "teal" },
  { id: "org-fld-6", name: "Compliance Documents", color: "red" },
];

export const orgDocuments: DocumentRecord[] = [
  {
    id: "doc-org-1",
    name: "Blank HIPAA Consent.pdf",
    ext: "pdf",
    sizeKB: 220,
    folderId: "org-fld-1",
    type: "Template",
    uploadedOn: "01/04/2024",
    uploadedBy: "Admin",
    aiStatus: "indexed",
    aiSummary: "Blank HIPAA authorization template ready for individual signing.",
    extracted: [{ label: "Form type", value: "HIPAA Authorization", confidence: 0.99 }],
    tags: ["Template", "HIPAA", "Consent"],
  },
  {
    id: "doc-org-2",
    name: "Incident Reporting Policy v3.pdf",
    ext: "pdf",
    sizeKB: 540,
    folderId: "org-fld-3",
    type: "Policy",
    uploadedOn: "06/14/2025",
    uploadedBy: "Admin",
    aiStatus: "indexed",
    aiSummary:
      "Agency incident reporting policy. Defines reportable events, escalation chain, and 24-hour reporting requirement.",
    extracted: [
      { label: "Policy version", value: "v3", confidence: 0.97 },
      { label: "Effective date", value: "06/14/2025", confidence: 0.99 },
    ],
    tags: ["Policy", "Incidents", "Compliance"],
  },
  {
    id: "doc-org-3",
    name: "Mandatory Reporter Training.pdf",
    ext: "pdf",
    sizeKB: 980,
    folderId: "org-fld-4",
    type: "Training",
    uploadedOn: "02/01/2025",
    uploadedBy: "Admin",
    aiStatus: "indexed",
    tags: ["Training", "Mandatory"],
  },
];

// ---- Helpers ----------------------------------------------------------------
export function daysUntil(expires?: string): number | null {
  if (!expires) return null;
  const [m, d, y] = expires.split("/").map((n) => parseInt(n, 10));
  const exp = new Date(y, m - 1, d).getTime();
  return Math.round((exp - Date.now()) / (1000 * 60 * 60 * 24));
}

export type ExpiryTone = "ok" | "warn" | "danger" | "expired";

export function expiryTone(expires?: string): ExpiryTone | null {
  const n = daysUntil(expires);
  if (n === null) return null;
  if (n < 0) return "expired";
  if (n < 30) return "danger";
  if (n < 90) return "warn";
  return "ok";
}

export function folderTone(color: FolderColor) {
  const map: Record<FolderColor, string> = {
    blue: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
    green: "bg-icm-green-soft text-icm-green ring-icm-green/20",
    red: "bg-icm-red-soft text-icm-red ring-icm-red/20",
    amber: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
    purple: "bg-purple-50 text-purple-600 ring-purple-200",
    pink: "bg-pink-50 text-pink-600 ring-pink-200",
    gray: "bg-icm-bg text-icm-text-dim ring-icm-border",
    teal: "bg-teal-50 text-teal-600 ring-teal-200",
  };
  return map[color];
}

export function folderDot(color: FolderColor) {
  const map: Record<FolderColor, string> = {
    blue: "bg-icm-accent",
    green: "bg-icm-green",
    red: "bg-icm-red",
    amber: "bg-icm-amber",
    purple: "bg-purple-500",
    pink: "bg-pink-500",
    gray: "bg-icm-text-faint",
    teal: "bg-teal-500",
  };
  return map[color];
}

export function getDocumentsForIndividual(individualId: string): {
  folders: Folder[];
  documents: DocumentRecord[];
} {
  if (individualId === JOSEPH) {
    return { folders: josephFolders, documents: josephDocuments };
  }
  return { folders: buildIndividualFolders(individualId), documents: [] };
}

export function getOrgLibrary(): {
  folders: Folder[];
  documents: DocumentRecord[];
} {
  return { folders: orgFolders, documents: orgDocuments };
}
