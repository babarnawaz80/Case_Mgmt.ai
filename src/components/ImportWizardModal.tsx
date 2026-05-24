/**
 * ImportWizardModal — Production-grade bulk import
 *
 * Features:
 *  • Handles 40K+ rows (chunked Firestore batch writes, 500/batch)
 *  • Real-time progress bar during import
 *  • Duplicate detection against existing Firestore records
 *  • Per-row resolution: Merge (update existing) | Skip | Keep Both
 *  • Intra-file duplicate detection (duplicates within the uploaded file)
 *  • Fuzzy auto-mapping with Levenshtein distance
 *
 * Wizard Steps: Upload → Map Fields → Duplicate Review → Import
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { read, utils } from "xlsx";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch,
  query,
  where,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  X, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle,
  ChevronRight, ChevronLeft, Download, ArrowRight, Loader2, Info,
  GitMerge, MinusCircle, CopyPlus, Users, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Field Definitions ────────────────────────────────────────────────────────

export interface SystemField { key: string; label: string; required?: boolean; hint?: string; }

export const INDIVIDUAL_FIELDS: SystemField[] = [
  { key: "first_name",              label: "First Name",                required: true },
  { key: "last_name",               label: "Last Name",                 required: true },
  { key: "middle_name",             label: "Middle Name" },
  { key: "preferred_name",          label: "Preferred Name / Nickname" },
  { key: "dob",                     label: "Date of Birth",             hint: "YYYY-MM-DD or MM/DD/YYYY" },
  { key: "gender",                  label: "Gender" },
  { key: "pronouns",                label: "Pronouns" },
  { key: "primary_language",        label: "Primary Language" },
  { key: "race",                    label: "Race" },
  { key: "ethnicity",               label: "Ethnicity" },
  { key: "marital_status",          label: "Marital Status" },
  { key: "medicaid_id",             label: "Medicaid ID" },
  { key: "ssn_last4",               label: "SSN (Last 4 digits)" },
  { key: "secondary_state_id",      label: "Secondary State ID" },
  { key: "street",                  label: "Street Address" },
  { key: "city",                    label: "City" },
  { key: "state",                   label: "State" },
  { key: "zip",                     label: "ZIP Code" },
  { key: "county",                  label: "County" },
  { key: "phone",                   label: "Phone Number" },
  { key: "email",                   label: "Email Address" },
  { key: "diagnosis",               label: "Primary Diagnosis (ICD-10)" },
  { key: "level_of_care",           label: "Level of Need Score" },
  { key: "enrollment_status",       label: "Enrollment Status",         hint: "active, pending, transition, discharged" },
  { key: "program",                 label: "Program / Service Line" },
  { key: "program_start_date",      label: "Program Start Date" },
  { key: "waiver_effective_date",   label: "Waiver Effective Date" },
  { key: "assigned_case_manager_name", label: "Assigned Case Manager" },
  { key: "assigned_supervisor_name",   label: "Assigned Supervisor" },
  { key: "pcp_due_date",            label: "PCP Due Date" },
  { key: "notes",                   label: "Intake Notes" },
];

export const STAFF_FIELDS: SystemField[] = [
  { key: "first_name",      label: "First Name",            required: true },
  { key: "last_name",       label: "Last Name",             required: true },
  { key: "email",           label: "Email Address",         required: true },
  { key: "phone",           label: "Phone Number" },
  { key: "role",            label: "Role",                  hint: "admin, supervisor, case_manager" },
  { key: "title",           label: "Job Title" },
  { key: "hire_date",       label: "Hire Date" },
  { key: "department",      label: "Department" },
  { key: "supervisor_name", label: "Supervisor Name" },
  { key: "address",         label: "Address" },
  { key: "city",            label: "City" },
  { key: "state",           label: "State" },
  { key: "zip",             label: "ZIP Code" },
  { key: "county",          label: "County" },
  { key: "npi",             label: "NPI Number" },
  { key: "license_number",  label: "License Number" },
  { key: "license_type",    label: "License Type" },
  { key: "credential",      label: "Credential (e.g. QIDP, LSW)" },
  { key: "status",          label: "Employment Status",     hint: "active, inactive, terminated" },
];

// ─── Auto-Mapping ─────────────────────────────────────────────────────────────

function normalize(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, ""); }

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

const ALIASES: Record<string, string[]> = {
  first_name:        ["firstname","fname","givenname","given","firstnm","participantfirst","clientfirst","memberfirst","first_name","first_name_*"],
  last_name:         ["lastname","lname","surname","familyname","lastnm","participantlast","clientlast","memberlast","last_name","last_name_*"],
  middle_name:       ["middlename","mname","midname","middle"],
  preferred_name:    ["preferredname","nickname","preferredname","alias","knownname","goesbyname","preferred_name"],
  dob:               ["dateofbirth","birthdate","bd","bday","dob","birthday","birth","date_of_birth","date_of_birth_*"],
  gender:            ["sex","gender","genderidentity","sexatbirth","gender_*"],
  medicaid_id:       ["medicaidid","medicaid","medicaidnumber","medicaidnum","stateid","waivernumber","recipientid","maid","ma_id","maid_*","ma_id_*"],
  ssn_last4:         ["ssn","socialsecurity","ssn4","ssnlast4","last4ssn"],
  phone:             ["phonenumber","phone","mobile","cell","cellphone","telephone","primaryphone","phone_home","phone_cell","phonehome","phonecell"],
  email:             ["emailaddress","email","emailaddr","mail"],
  county:            ["county","countyofresidence","residentcounty","county_*"],
  street:            ["streetaddress","address1","addr1","street","streetaddr","primaryaddress","address_street","addressstreet"],
  city:              ["city","cityofresidence","town","address_city","addresscity"],
  state:             ["state","statecode","stateofresidence","st","address_state","addressstate"],
  zip:               ["zipcode","zip","postalcode","postal","address_zip","addresszip"],
  diagnosis:         ["diagnosis","primarydiagnosis","icd10","icdcode","condition","primarycondition","dx","primary_diagnosis","icd10_codes","icd10codes"],
  enrollment_status: ["status","enrollmentstatus","participantstatus","memberstatus","clientstatus","active","status_*"],
  program:           ["program","programname","serviceline","waiver","programtype","service","program_type","waiver_type"],
  program_start_date:["programstartdate","startdate","enrollmentdate","waiverstart","servicestart","admission_date","admission_date_*","admissiondate"],
  pcp_due_date:      ["pcpduedate","pcpdue","planofduedate","reviewdate","planreview","next_isp_date","last_annual_plan_date","nextispdate"],
  notes:             ["notes","comments","intakenotes","remarks","additionalnotes","memo","medical_notes","medicalnotes","special_instructions","specialinstructions","living_situation","livingsituation","communication_notes","communicationnotes"],
  assigned_case_manager_name: ["assignedcasemanager","assignedcasemanagername","casemanager","casemanagername","assigned_case_manager","assigned_case_manager_*","assignedcasemanager*"],
  assigned_supervisor_name: ["assignedsupervisor","assignedsupervisorname","supervisor","supervisorname","assigned_supervisor"],
  // Staff-specific
  role:              ["role","jobrole","accessrole","systemrole","userrole","position"],
  title:             ["jobtitle","title","positiontitle","jobrole"],
  role_status:       ["status","employmentstatus","status_*","active"],
  hire_date:         ["hiredate","startdate","dateofhire","employmentstartdate","hireddate"],
  department:        ["department","dept","division","team"],
  supervisor_name:   ["supervisor","supervisorname","manager","managername","reportsto"],
  npi:               ["npi","npinumber","nationalproviderid"],
  license_number:    ["licensenumber","license","licnum","licno","professionallicense"],
  license_type:      ["licensetype","lictype","licensecat","licenseclass"],
  credential:        ["credential","credentials","certification","certifications","qidp","lsw","lpc"],
  status:            ["status","employmentstatus","status_*","active"],
};

type MatchConfidence = "auto" | "review" | "none";
interface ColumnMapping { excelCol: string; systemField: string | null; confidence: MatchConfidence; }

function autoMap(headers: string[], fields: SystemField[]): ColumnMapping[] {
  return headers.map((h) => {
    const nh = normalize(h);
    let best: string | null = null;
    let confidence: MatchConfidence = "none";

    // 1. Exact match against key, label, or aliases
    for (const field of fields) {
      const nf = normalize(field.key);
      const nl = normalize(field.label);
      const aliases = ALIASES[field.key] ?? [];

      if (nh === nf || nh === nl || aliases.includes(nh)) {
        best = field.key;
        confidence = "auto";
        break;
      }
    }

    // 2. Fuzzy fallback match (Levenshtein distance <= 2)
    if (!best) {
      let minDist = Infinity;
      for (const field of fields) {
        const nf = normalize(field.key);
        const nl = normalize(field.label);
        const d = Math.min(levenshtein(nh, nf), levenshtein(nh, nl));
        if (d < minDist && d <= 2) {
          minDist = d;
          best = field.key;
          confidence = "review";
        }
      }
    }

    return { excelCol: h, systemField: best, confidence };
  });
}

function formatDateValue(val: unknown): string {
  if (val instanceof Date) {
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, "0");
    const dd = String(val.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return val !== undefined && val !== null ? String(val).trim() : "";
}

// ─── Mapped Row Extraction ────────────────────────────────────────────────────

function extractMappedData(
  row: Record<string, unknown>,
  mappings: ColumnMapping[],
  type: "individuals" | "staff"
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of mappings) {
    if (!m.systemField) continue;
    const val = row[m.excelCol];
    if (val !== undefined && val !== "") out[m.systemField] = formatDateValue(val);
  }
  if (type === "individuals") out.enrollment_status = out.enrollment_status ?? "active";
  if (type === "staff") { out.role = out.role ?? "case_manager"; }
  return out;
}

// ─── Duplicate Detection ──────────────────────────────────────────────────────

/** Lightweight fingerprint for matching */
interface ExistingFingerprint {
  id: string;        // Firestore doc ID
  nameKey: string;   // normalized "firstname lastname"
  dobKey: string;    // normalized dob
  emailKey: string;  // normalized email
  medicaidKey: string;
  data: Record<string, string>; // key fields for display
}

type DuplicateResolution = "merge" | "skip" | "keep_both";

interface DuplicateEntry {
  rowIndex: number;
  newData: Record<string, string>;
  existing: ExistingFingerprint;
  matchReason: string;
  resolution: DuplicateResolution;
}

function buildFingerprint(id: string, data: Record<string, unknown>): ExistingFingerprint {
  const s = (k: string) => normalize(String(data[k] ?? ""));
  return {
    id,
    nameKey: `${s("first_name")}${s("last_name")}`,
    dobKey: s("dob"),
    emailKey: s("email"),
    medicaidKey: s("medicaid_id"),
    data: {
      first_name: String(data.first_name ?? ""),
      last_name:  String(data.last_name  ?? ""),
      dob:        String(data.dob        ?? ""),
      email:      String(data.email      ?? ""),
      medicaid_id:String(data.medicaid_id ?? ""),
      program:    String(data.program    ?? ""),
      role:       String(data.role       ?? ""),
      status:     String(data.status ?? data.enrollment_status ?? ""),
    },
  };
}

function detectDuplicate(
  newData: Record<string, string>,
  existing: ExistingFingerprint[],
  type: "individuals" | "staff"
): { match: ExistingFingerprint; reason: string } | null {
  const nName = normalize((newData.first_name ?? "") + (newData.last_name ?? ""));
  const nDob  = normalize(newData.dob ?? "");
  const nEmail = normalize(newData.email ?? "");
  const nMed   = normalize(newData.medicaid_id ?? "");

  for (const fp of existing) {
    // Email exact match (highest confidence for staff)
    if (nEmail && fp.emailKey && nEmail === fp.emailKey) return { match: fp, reason: "Email match" };
    // Medicaid ID match (highest confidence for individuals)
    if (nMed && fp.medicaidKey && nMed === fp.medicaidKey) return { match: fp, reason: "Medicaid ID match" };
    // Name + DOB match
    if (nName && fp.nameKey && nName === fp.nameKey && nDob && fp.dobKey && nDob === fp.dobKey)
      return { match: fp, reason: "Name + DOB match" };
    // Name-only match (lower confidence — only flag if same type)
    if (type === "staff" && nName && fp.nameKey && nName === fp.nameKey)
      return { match: fp, reason: "Name match" };
  }
  return null;
}

/** Detect duplicates within the file itself */
function detectIntraFileDuplicates(
  rows: Record<string, string>[],
  type: "individuals" | "staff"
): Map<number, number> {
  // Returns map of rowIndex → first-seen rowIndex for intra-file dupes
  const seen = new Map<string, number>();
  const dupes = new Map<number, number>();
  rows.forEach((row, i) => {
    const key = type === "individuals"
      ? `${normalize(row.first_name??"")}${normalize(row.last_name??"")}${normalize(row.dob??"")}${normalize(row.medicaid_id??"")}`
      : `${normalize(row.email??"")}${normalize(row.first_name??"")}${normalize(row.last_name??"")}`;
    if (key.length < 3) return;
    if (seen.has(key)) dupes.set(i, seen.get(key)!);
    else seen.set(key, i);
  });
  return dupes;
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface RowError { row: number; field: string; message: string; }
function validateRow(row: Record<string, string>, fields: SystemField[], rowIdx: number): RowError[] {
  return fields.filter(f => f.required).flatMap(f => {
    const val = row[f.key];
    return (!val || val.trim() === "") ? [{ row: rowIdx, field: f.key, message: `${f.label} is required` }] : [];
  });
}

// ─── Batch Firestore Write ────────────────────────────────────────────────────

const BATCH_SIZE = 400; // stay under Firestore 500 op limit

async function batchWrite(
  collectionName: string,
  docs: Array<{ docId?: string; data: Record<string, unknown> }>,
  onProgress: (done: number) => void
): Promise<{ success: number; errors: number }> {
  let success = 0, errors = 0, done = 0;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      if (item.docId) {
        // merge into existing doc
        batch.update(doc(db, collectionName, item.docId), { ...item.data, updatedAt: serverTimestamp() });
      } else {
        batch.set(doc(collection(db, collectionName)), { ...item.data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
    }
    try {
      await batch.commit();
      success += chunk.length;
    } catch {
      errors += chunk.length;
    }
    done += chunk.length;
    onProgress(done);
    // Small yield to keep UI breathing on large imports
    await new Promise(r => setTimeout(r, 0));
  }
  return { success, errors };
}

// ─── Fetch Existing Records ───────────────────────────────────────────────────

async function fetchExistingFingerprints(
  collectionName: string,
  orgId: string,
  onProgress: (count: number) => void
): Promise<ExistingFingerprint[]> {
  const fingerprints: ExistingFingerprint[] = [];
  const PAGE_SIZE = 1000;
  let lastDoc: QueryDocumentSnapshot | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const q = lastDoc
      ? query(collection(db, collectionName), where("organizationId", "==", orgId), limit(PAGE_SIZE), startAfter(lastDoc))
      : query(collection(db, collectionName), where("organizationId", "==", orgId), limit(PAGE_SIZE));

    const snap = await getDocs(q);
    if (snap.empty) break;

    snap.docs.forEach(d => fingerprints.push(buildFingerprint(d.id, d.data())));
    lastDoc = snap.docs[snap.docs.length - 1];
    onProgress(fingerprints.length);

    if (snap.docs.length < PAGE_SIZE) break;
  }
  return fingerprints;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportType = "individuals" | "staff";
type Step = "upload" | "map" | "duplicates" | "review";
interface ParsedData { headers: string[]; rows: Record<string, unknown>[]; fileName: string; }
interface ImportResult { success: number; errors: number; merged: number; skipped: number; }

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  type: ImportType;
  onClose: () => void;
  onComplete?: (count: number) => void;
}

export function ImportWizardModal({ type, onClose, onComplete }: Props) {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId ?? "org-1";

  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [mappedRows, setMappedRows] = useState<Record<string, string>[]>([]);

  // Duplicate detection state
  const [checkingDupes, setCheckingDupes] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [duplicates, setDuplicates] = useState<DuplicateEntry[]>([]);
  const [intraFileDupes, setIntraFileDupes] = useState<Map<number, number>>(new Map());
  const [showDupeDetail, setShowDupeDetail] = useState<number | null>(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fields = type === "individuals" ? INDIVIDUAL_FIELDS : STAFF_FIELDS;
  const collectionName = type === "individuals" ? "individuals" : "users";
  const typeLabel = type === "individuals" ? "Individuals" : "Staff Members";

  // ── File Parsing ────────────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = read(data, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];

        // 1. Read first 8 rows as raw arrays to auto-detect optimal header row index
        const rawRows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, range: 0, defval: "" });
        console.log("ImportWizardModal: rawRows length:", rawRows.length);
        console.log("ImportWizardModal: fields count:", fields.length);
        console.log("ImportWizardModal: type parameter is:", type);
        
        let bestHeaderIndex = 0;
        let maxMatches = 0;

        const scanLimit = Math.min(8, rawRows.length);
        for (let i = 0; i < scanLimit; i++) {
          const row = rawRows[i];
          if (!Array.isArray(row)) {
            console.log(`ImportWizardModal: Row ${i} is not an array:`, row);
            continue;
          }

          let matches = 0;
          const matchingDetails: string[] = [];
          for (const cell of row) {
            const sc = normalize(String(cell ?? ""));
            if (!sc) continue;

            const isMatch = fields.some(field => {
              const fk = normalize(field.key);
              const fl = normalize(field.label);
              const aliases = ALIASES[field.key] ?? [];
              const match = sc === fk || sc === fl || aliases.includes(sc) || sc.includes(fk) || sc.includes(fl);
              if (match) {
                matchingDetails.push(`${sc} -> ${field.key}`);
              }
              return match;
            });
            if (isMatch) matches++;
          }

          console.log(`ImportWizardModal: Row ${i} matches: ${matches}`, matchingDetails);

          if (matches > maxMatches && matches >= 3) {
            maxMatches = matches;
            bestHeaderIndex = i;
          }
        }

        console.log("ImportWizardModal: Detected bestHeaderIndex:", bestHeaderIndex, "maxMatches:", maxMatches);

        // 2. Parse sheet from the detected header index onward
        const json = utils.sheet_to_json<Record<string, unknown>>(sheet, { range: bestHeaderIndex, defval: "" });

        if (json.length === 0) { toast.error("The spreadsheet appears to be empty."); return; }

        const headers = Object.keys(json[0]);
        console.log("ImportWizardModal: Parsed headers:", headers);
        const autoMappings = autoMap(headers, fields);

        setParsed({ headers, rows: json, fileName: file.name });
        setMappings(autoMappings);
        setStep("map");
        toast.info(`Smart template detected! Header row found at line ${bestHeaderIndex + 1}.`);
      } catch (err) {
        console.error("ImportWizardModal processFile error:", err);
        toast.error("Could not read this file. Use .xlsx, .xls, or .csv format.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, [fields, type]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  // ── Duplicate Check ─────────────────────────────────────────────────────────

  const runDuplicateCheck = useCallback(async () => {
    if (!parsed) return;
    setCheckingDupes(true);
    setFetchProgress(0);

    // Build mapped rows first
    const rows = parsed.rows.map(r => extractMappedData(r, mappings, type));
    setMappedRows(rows);

    try {
      // Fetch existing records from Firestore (paginated)
      const existing = await fetchExistingFingerprints(collectionName, orgId, setFetchProgress);

      // Intra-file duplicates
      const intraDupes = detectIntraFileDuplicates(rows, type);
      setIntraFileDupes(intraDupes);

      // Detect duplicates vs existing Firestore data
      const dupes: DuplicateEntry[] = [];
      rows.forEach((row, i) => {
        const match = detectDuplicate(row, existing, type);
        if (match) {
          dupes.push({
            rowIndex: i,
            newData: row,
            existing: match.match,
            matchReason: match.reason,
            resolution: "merge", // default: merge
          });
        }
      });
      setDuplicates(dupes);
    } catch (err) {
      console.error("Duplicate check failed:", err);
      toast.error("Could not load existing records for duplicate check. You can still proceed.");
      setDuplicates([]);
    }

    setCheckingDupes(false);
    setStep("duplicates");
  }, [parsed, mappings, type, collectionName, orgId]);

  const updateResolution = (rowIndex: number, resolution: DuplicateResolution) => {
    setDuplicates(prev => prev.map(d => d.rowIndex === rowIndex ? { ...d, resolution } : d));
  };

  const applyAllResolution = (resolution: DuplicateResolution) => {
    setDuplicates(prev => prev.map(d => ({ ...d, resolution })));
  };

  // ── Import ──────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);

    // Build resolution maps
    const dupeMap = new Map<number, DuplicateEntry>(duplicates.map(d => [d.rowIndex, d]));
    const intraSkips = new Set<number>();
    intraFileDupes.forEach((firstIdx, dupeIdx) => {
      // Skip the intra-file duplicate if user hasn't overridden
      intraSkips.add(dupeIdx);
    });

    // Build write operations
    const ops: Array<{ docId?: string; data: Record<string, unknown> }> = [];
    let skipped = 0, merged = 0;

    mappedRows.forEach((row, i) => {
      const dupe = dupeMap.get(i);
      const isIntraDupe = intraSkips.has(i);

      if (dupe) {
        if (dupe.resolution === "skip") { skipped++; return; }
        if (dupe.resolution === "merge") {
          merged++;
          ops.push({ docId: dupe.existing.id, data: { ...row, organizationId: orgId, import_source: "excel_import" } });
          return;
        }
        // keep_both: fall through to normal addDoc
      }

      if (isIntraDupe) { skipped++; return; } // skip intra-file dupe by default

      ops.push({ data: { ...row, organizationId: orgId, import_source: "excel_import" } });
    });

    const total = ops.length;
    setImportProgress({ done: 0, total });

    const { success, errors } = await batchWrite(
      collectionName,
      ops,
      (done) => setImportProgress({ done, total })
    );

    setImporting(false);
    setImportProgress(null);
    setResult({ success, errors, merged, skipped });

    if (success > 0) {
      toast.success(`${success} ${typeLabel.toLowerCase()} imported!`);
      onComplete?.(success);
    }
    if (errors > 0) toast.error(`${errors} rows failed to write.`);
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const rowErrors = mappedRows.length > 0
    ? mappedRows.flatMap((row, i) => validateRow(row, fields, i + 1))
    : parsed?.rows.flatMap((row, i) => validateRow(extractMappedData(row, mappings, type), fields, i + 1)) ?? [];

  const errorRowSet = new Set(rowErrors.map(e => e.row));
  const readyCount = parsed
    ? parsed.rows.length - errorRowSet.size
    : 0;

  const downloadErrors = () => {
    if (!parsed) return;
    const errorRows = parsed.rows.filter((_, i) => errorRowSet.has(i + 1));
    const csv = [parsed.headers.join(","), ...errorRows.map(r =>
      parsed.headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
    )].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "import_errors.csv"; a.click();
  };

  const autoMapped = mappings.filter(m => m.confidence === "auto").length;
  const reviewNeeded = mappings.filter(m => m.confidence === "review").length;
  const unmapped = mappings.filter(m => !m.systemField).length;

  const dupeCountByResolution = {
    merge: duplicates.filter(d => d.resolution === "merge").length,
    skip: duplicates.filter(d => d.resolution === "skip").length,
    keep_both: duplicates.filter(d => d.resolution === "keep_both").length,
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-icm-panel border border-icm-border shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-icm-border shrink-0">
          <div>
            <h2 className="font-manrope font-bold text-[17px] text-icm-text">Import {typeLabel}</h2>
            <p className="text-[12px] text-icm-text-dim font-geist mt-0.5">
              Handles large files · Detects duplicates · Batch writes to Firestore
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step bar */}
        <div className="px-6 py-3 border-b border-icm-border bg-icm-bg/50 shrink-0">
          <WizardStepBar step={step} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── UPLOAD ────────────────────────────────────────────────────── */}
          {step === "upload" && (
            <div className="space-y-5 max-w-xl mx-auto">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
                  dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <div className={cn("mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors", dragOver ? "bg-primary/10" : "bg-muted")}>
                  <FileSpreadsheet className={cn("w-7 h-7", dragOver ? "text-primary" : "text-icm-text-dim")} />
                </div>
                <p className="font-semibold text-icm-text text-[15px]">{dragOver ? "Drop to upload" : "Drag & drop your spreadsheet here"}</p>
                <p className="text-[13px] text-icm-text-dim mt-1">or click to browse</p>
                <p className="text-[11.5px] text-icm-text-dim/70 mt-3">Supports .xlsx · .xls · .csv · Handles 40,000+ rows</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                <p className="text-[12px] font-semibold text-icm-text flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-primary" /> Tips</p>
                <ul className="text-[12px] text-icm-text-dim space-y-1 ml-5 list-disc">
                  <li>Column headers in first row · Standard names auto-match</li>
                  <li>Dates: YYYY-MM-DD or MM/DD/YYYY</li>
                  <li>Duplicates are detected automatically before import</li>
                  <li>{type === "individuals" ? 'Use "active", "pending", "transition" for status' : 'Use "admin", "supervisor", "case_manager" for role'}</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── MAP FIELDS ────────────────────────────────────────────────── */}
          {step === "map" && parsed && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-[13px] text-icm-text font-medium">
                  <span className="text-icm-text-dim">File:</span> {parsed.fileName}
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">{parsed.rows.toLocaleString()} rows</span>
                </p>
                <div className="flex items-center gap-3 text-[12px]">
                  <span className="flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> {autoMapped} auto-matched</span>
                  {reviewNeeded > 0 && <span className="flex items-center gap-1 text-amber-600 font-medium"><AlertTriangle className="w-3.5 h-3.5" /> {reviewNeeded} review</span>}
                  {unmapped > 0 && <span className="flex items-center gap-1 text-icm-text-dim font-medium"><XCircle className="w-3.5 h-3.5" /> {unmapped} unmapped</span>}
                </div>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-[1fr_32px_1fr_110px] bg-muted/50 px-4 py-2 border-b border-border text-[11px] font-semibold text-icm-text-dim uppercase tracking-wide">
                  <span>Excel Column</span><span /><span>System Field</span><span>Status</span>
                </div>
                <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                  {mappings.map((m, idx) => (
                    <MappingRow key={m.excelCol} mapping={m} fields={fields} sampleValue={parsed.rows[0]?.[m.excelCol]}
                      onFieldChange={(sf) => setMappings(prev => prev.map((pm, i) => i === idx ? { ...pm, systemField: sf, confidence: sf ? "auto" : "none" } : pm))}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b border-border text-[11px] font-semibold text-icm-text-dim uppercase tracking-wide">Preview (first 3 rows)</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-border">
                        {mappings.filter(m => m.systemField).map(m => (
                          <th key={m.excelCol} className="px-3 py-2 text-left font-medium text-icm-text-dim whitespace-nowrap">
                            {fields.find(f => f.key === m.systemField)?.label ?? m.systemField}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-b border-border hover:bg-muted/20">
                          {mappings.filter(m => m.systemField).map(m => (
                            <td key={m.excelCol} className="px-3 py-2 text-icm-text max-w-[150px] truncate">{String(row[m.excelCol] ?? "—")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── CHECKING DUPES (loading) ───────────────────────────────────── */}
          {checkingDupes && (
            <div className="flex flex-col items-center justify-center py-16 gap-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-icm-text text-[15px]">Scanning for duplicates…</p>
                <p className="text-[12px] text-icm-text-dim mt-1">Comparing against existing records</p>
              </div>
              {fetchProgress > 0 && (
                <p className="text-[12px] text-primary font-mono">{fetchProgress.toLocaleString()} existing records loaded</p>
              )}
            </div>
          )}

          {/* ── DUPLICATES ────────────────────────────────────────────────── */}
          {step === "duplicates" && !checkingDupes && (
            <div className="space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard value={parsed?.rows.length ?? 0} label="Total rows" color="gray" />
                <SummaryCard value={duplicates.length} label="Duplicates found" color={duplicates.length > 0 ? "amber" : "green"} />
                <SummaryCard value={intraFileDupes.size} label="In-file dupes" color={intraFileDupes.size > 0 ? "amber" : "gray"} />
                <SummaryCard value={readyCount - duplicates.length} label="Unique new" color="green" />
              </div>

              {duplicates.length === 0 && intraFileDupes.size === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="font-semibold text-emerald-800 text-[14px]">No duplicates detected!</p>
                  <p className="text-[12px] text-emerald-700 mt-1">All {parsed?.rows.length.toLocaleString()} rows are unique. Ready to import.</p>
                </div>
              ) : (
                <>
                  {/* In-file duplicates notice */}
                  {intraFileDupes.size > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="font-semibold text-amber-800 text-[13px] flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" /> {intraFileDupes.size} duplicate rows within your file
                      </p>
                      <p className="text-[12px] text-amber-700 mt-1">
                        These rows appear more than once in your spreadsheet. Only the first occurrence will be imported — later copies are automatically skipped.
                      </p>
                    </div>
                  )}

                  {/* Existing duplicates */}
                  {duplicates.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <p className="font-semibold text-icm-text text-[13.5px]">
                          {duplicates.length} match{duplicates.length !== 1 ? "es" : ""} found in existing records
                        </p>
                        {/* Bulk actions */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11.5px] text-icm-text-dim">Apply all:</span>
                          <button onClick={() => applyAllResolution("merge")}
                            className="h-7 px-2.5 rounded-lg text-[11.5px] font-semibold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1">
                            <GitMerge className="w-3 h-3" /> Merge all
                          </button>
                          <button onClick={() => applyAllResolution("skip")}
                            className="h-7 px-2.5 rounded-lg text-[11.5px] font-semibold border border-border bg-muted text-icm-text-dim hover:bg-icm-bg transition-colors flex items-center gap-1">
                            <MinusCircle className="w-3 h-3" /> Skip all
                          </button>
                          <button onClick={() => applyAllResolution("keep_both")}
                            className="h-7 px-2.5 rounded-lg text-[11.5px] font-semibold border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors flex items-center gap-1">
                            <CopyPlus className="w-3 h-3" /> Keep all
                          </button>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="flex items-center gap-4 text-[11.5px]">
                        <span className="flex items-center gap-1 text-blue-600"><GitMerge className="w-3 h-3" /> Merge — update existing record with new data</span>
                        <span className="flex items-center gap-1 text-icm-text-dim"><MinusCircle className="w-3 h-3" /> Skip — don't import this row</span>
                        <span className="flex items-center gap-1 text-violet-600"><CopyPlus className="w-3 h-3" /> Keep Both — create new record alongside existing</span>
                      </div>

                      {/* Duplicate rows */}
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {duplicates.map((d) => (
                          <DuplicateRow
                            key={d.rowIndex}
                            entry={d}
                            fields={fields}
                            showDetail={showDupeDetail === d.rowIndex}
                            onToggleDetail={() => setShowDupeDetail(prev => prev === d.rowIndex ? null : d.rowIndex)}
                            onResolve={(r) => updateResolution(d.rowIndex, r)}
                          />
                        ))}
                      </div>

                      {/* Resolution summary */}
                      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center gap-4 text-[12px] flex-wrap">
                        <span className="font-semibold text-icm-text">Resolution summary:</span>
                        <span className="text-blue-600 font-medium">{dupeCountByResolution.merge} will be merged</span>
                        <span className="text-icm-text-dim">{dupeCountByResolution.skip} will be skipped</span>
                        <span className="text-violet-600 font-medium">{dupeCountByResolution.keep_both} will create new records</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── REVIEW / IMPORT PROGRESS ──────────────────────────────────── */}
          {step === "review" && !result && (
            <div className="space-y-5">
              {importing && importProgress ? (
                /* Progress view */
                <div className="py-8 space-y-6 max-w-lg mx-auto">
                  <div className="text-center space-y-2">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                    <p className="font-semibold text-icm-text text-[15px]">Importing {typeLabel}…</p>
                    <p className="text-[12px] text-icm-text-dim">
                      {importProgress.done.toLocaleString()} of {importProgress.total.toLocaleString()} records written
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${Math.round((importProgress.done / importProgress.total) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-icm-text-dim font-mono">
                      <span>{Math.round((importProgress.done / importProgress.total) * 100)}%</span>
                      <span>{importProgress.total.toLocaleString()} total</span>
                    </div>
                  </div>
                  <p className="text-[11.5px] text-icm-text-dim text-center">
                    Writing in batches of {BATCH_SIZE} · Do not close this window
                  </p>
                </div>
              ) : (
                /* Final review summary */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <SummaryCard value={parsed?.rows.length ?? 0} label="Total rows" color="gray" />
                    <SummaryCard value={readyCount} label="To import" color="green" />
                    <SummaryCard value={duplicates.filter(d => d.resolution === "merge").length} label="To merge" color="blue" />
                    <SummaryCard value={errorRowSet.size} label="Validation errors" color={errorRowSet.size > 0 ? "red" : "gray"} />
                  </div>

                  {rowErrors.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[12.5px] font-semibold text-amber-800 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {rowErrors.length} validation issue(s)</p>
                        <button onClick={downloadErrors} className="text-[11.5px] text-amber-700 hover:text-amber-900 underline flex items-center gap-1"><Download className="w-3 h-3" /> Download error rows</button>
                      </div>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {rowErrors.slice(0, 8).map((e, i) => <p key={i} className="text-[12px] text-amber-700">Row {e.row}: {e.message}</p>)}
                        {rowErrors.length > 8 && <p className="text-[12px] text-amber-600">…and {rowErrors.length - 8} more</p>}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                    <p className="text-[13px] font-semibold text-icm-text">Import plan</p>
                    <ul className="text-[12.5px] text-icm-text-dim space-y-1.5">
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {(readyCount - duplicates.filter(d=>d.resolution!=="skip").length).toLocaleString()} new records will be created</li>
                      {dupeCountByResolution.merge > 0 && <li className="flex items-center gap-2"><GitMerge className="w-3.5 h-3.5 text-blue-500" /> {dupeCountByResolution.merge} existing records will be updated (merged)</li>}
                      {dupeCountByResolution.keep_both > 0 && <li className="flex items-center gap-2"><CopyPlus className="w-3.5 h-3.5 text-violet-500" /> {dupeCountByResolution.keep_both} duplicates kept as new separate records</li>}
                      {(dupeCountByResolution.skip + errorRowSet.size + intraFileDupes.size) > 0 && <li className="flex items-center gap-2"><MinusCircle className="w-3.5 h-3.5 text-icm-text-dim" /> {(dupeCountByResolution.skip + errorRowSet.size + intraFileDupes.size).toLocaleString()} rows will be skipped</li>}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── POST-IMPORT RESULT ────────────────────────────────────────── */}
          {result && (
            <div className="max-w-sm mx-auto text-center space-y-5 py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-[20px] font-extrabold text-icm-text font-manrope">Import Complete!</h3>
                <p className="text-[13px] text-icm-text-dim mt-1">
                  {result.success.toLocaleString()} records written successfully.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SummaryCard value={result.success} label="Created / Updated" color="green" />
                <SummaryCard value={result.merged} label="Merged" color="blue" />
                <SummaryCard value={result.skipped} label="Skipped" color="gray" />
                <SummaryCard value={result.errors} label="Errors" color={result.errors > 0 ? "red" : "gray"} />
              </div>
              <button onClick={onClose} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
                Done <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        {!result && !checkingDupes && (
          <div className="px-6 py-4 border-t border-icm-border bg-icm-bg/50 flex items-center justify-between shrink-0">
            <button
              onClick={() => {
                if (step === "review") setStep("duplicates");
                else if (step === "duplicates") setStep("map");
                else if (step === "map") { setStep("upload"); setParsed(null); setMappings([]); }
                else onClose();
              }}
              disabled={importing}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border border-border text-[12.5px] font-semibold text-icm-text hover:bg-muted/40 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> {step === "upload" ? "Cancel" : "Back"}
            </button>

            {step === "upload" && <p className="text-[12px] text-icm-text-dim">Upload a file to continue</p>}

            {step === "map" && (
              <button
                onClick={runDuplicateCheck}
                className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-primary text-white text-[12.5px] font-semibold hover:bg-primary/90 transition-colors"
              >
                Check for Duplicates <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === "duplicates" && (
              <button
                onClick={() => setStep("review")}
                className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-primary text-white text-[12.5px] font-semibold hover:bg-primary/90 transition-colors"
              >
                Review Import Plan <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === "review" && !importing && (
              <button
                onClick={handleImport}
                disabled={readyCount === 0}
                className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-primary text-white text-[12.5px] font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Start Import ({readyCount.toLocaleString()} records)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DuplicateRow ─────────────────────────────────────────────────────────────

function DuplicateRow({ entry, fields, showDetail, onToggleDetail, onResolve }: {
  entry: DuplicateEntry;
  fields: SystemField[];
  showDetail: boolean;
  onToggleDetail: () => void;
  onResolve: (r: DuplicateResolution) => void;
}) {
  const name = `${entry.newData.first_name ?? ""} ${entry.newData.last_name ?? ""}`.trim();
  const existingName = `${entry.existing.data.first_name ?? ""} ${entry.existing.data.last_name ?? ""}`.trim();

  const resolutionConfig: Record<DuplicateResolution, { label: string; cls: string; icon: React.ReactNode }> = {
    merge:     { label: "Merge",     cls: "border-blue-300 bg-blue-600 text-white", icon: <GitMerge className="w-3 h-3" /> },
    skip:      { label: "Skip",      cls: "border-border bg-icm-bg text-icm-text-dim", icon: <MinusCircle className="w-3 h-3" /> },
    keep_both: { label: "Keep Both", cls: "border-violet-300 bg-violet-600 text-white", icon: <CopyPlus className="w-3 h-3" /> },
  };

  return (
    <div className={cn("rounded-xl border overflow-hidden",
      entry.resolution === "merge"     ? "border-blue-200 bg-blue-50/30" :
      entry.resolution === "skip"      ? "border-border bg-muted/20 opacity-70" :
                                         "border-violet-200 bg-violet-50/30"
    )}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Row info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-icm-text">{name || "(unnamed)"}</span>
            <span className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{entry.matchReason}</span>
            <span className="text-[11px] text-icm-text-dim">Row {entry.rowIndex + 1}</span>
          </div>
          <p className="text-[11.5px] text-icm-text-dim mt-0.5">
            Matches: <span className="font-medium text-icm-text">{existingName || entry.existing.data.email}</span>
            {entry.existing.data.dob && ` · ${entry.existing.data.dob}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {(["merge", "skip", "keep_both"] as DuplicateResolution[]).map((r) => {
            const cfg = resolutionConfig[r];
            return (
              <button
                key={r}
                onClick={() => onResolve(r)}
                className={cn(
                  "h-7 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-colors",
                  entry.resolution === r ? cfg.cls : "border-border bg-icm-panel text-icm-text-dim hover:bg-muted/50"
                )}
              >
                {entry.resolution === r && cfg.icon}
                {cfg.label}
              </button>
            );
          })}
          <button onClick={onToggleDetail} className="w-7 h-7 rounded-lg border border-border bg-icm-panel text-icm-text-dim flex items-center justify-center hover:bg-muted/50 transition-colors">
            {showDetail ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Detail comparison */}
      {showDetail && (
        <div className="border-t border-border px-4 py-3 bg-background">
          <div className="grid grid-cols-2 gap-4 text-[12px]">
            <div>
              <p className="font-semibold text-icm-text-dim uppercase text-[10px] tracking-wide mb-2">New data (from file)</p>
              <div className="space-y-1">
                {Object.entries(entry.newData).slice(0, 10).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-icm-text-dim min-w-[100px]">{fields.find(f => f.key === k)?.label ?? k}:</span>
                    <span className="text-icm-text font-medium truncate">{v || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold text-icm-text-dim uppercase text-[10px] tracking-wide mb-2">Existing record</p>
              <div className="space-y-1">
                {Object.entries(entry.existing.data).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-icm-text-dim min-w-[100px]">{fields.find(f => f.key === k)?.label ?? k}:</span>
                    <span className="text-icm-text font-medium truncate">{String(v) || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function WizardStepBar({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload",     label: "1. Upload File" },
    { key: "map",        label: "2. Map Fields"  },
    { key: "duplicates", label: "3. Duplicate Check" },
    { key: "review",     label: "4. Review & Import" },
  ];
  const current = steps.findIndex(s => s.key === step);
  return (
    <div className="flex items-center gap-0 flex-wrap">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <span className={cn("text-[12px] font-medium px-2.5 py-1 rounded-lg transition-colors",
            i === current ? "bg-primary text-white" : i < current ? "text-emerald-600" : "text-icm-text-dim"
          )}>
            {i < current && <CheckCircle2 className="w-3 h-3 inline mr-1" />}{s.label}
          </span>
          {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-border mx-0.5" />}
        </div>
      ))}
    </div>
  );
}

function MappingRow({ mapping, fields, sampleValue, onFieldChange }: {
  mapping: ColumnMapping; fields: SystemField[]; sampleValue: unknown; onFieldChange: (f: string | null) => void;
}) {
  const cfg = { auto: { label: "Auto", cls: "text-emerald-600 bg-emerald-50", icon: <CheckCircle2 className="w-3 h-3" /> },
                review: { label: "Review", cls: "text-amber-600 bg-amber-50", icon: <AlertTriangle className="w-3 h-3" /> },
                none: { label: "No match", cls: "text-icm-text-dim bg-muted", icon: <XCircle className="w-3 h-3" /> },
              }[mapping.systemField ? mapping.confidence : "none"];
  return (
    <div className="grid grid-cols-[1fr_32px_1fr_110px] items-center px-4 py-2.5 hover:bg-muted/20 gap-2">
      <div>
        <p className="text-[12.5px] font-medium text-icm-text">{mapping.excelCol}</p>
        {sampleValue !== undefined && sampleValue !== "" && (
          <p className="text-[11px] text-icm-text-dim truncate max-w-[180px]">e.g. {String(sampleValue)}</p>
        )}
      </div>
      <div className="flex justify-center"><ArrowRight className="w-3 h-3 text-icm-text-dim" /></div>
      <select value={mapping.systemField ?? ""} onChange={(e) => onFieldChange(e.target.value || null)}
        className="w-full text-[12px] rounded-lg border border-border bg-background px-2 py-1.5 text-icm-text focus:outline-none focus:ring-2 focus:ring-primary/30">
        <option value="">— Skip this column —</option>
        {fields.map(f => <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>)}
      </select>
      <div className={cn("text-[11px] font-medium px-2 py-1 rounded-lg flex items-center gap-1 justify-center", cfg.cls)}>
        {cfg.icon} {cfg.label}
      </div>
    </div>
  );
}

function SummaryCard({ value, label, color }: { value: number; label: string; color: "green"|"red"|"gray"|"amber"|"blue" }) {
  const cls = {
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
    red:   "bg-red-50 border-red-200 text-red-700",
    gray:  "bg-muted border-border text-icm-text-dim",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    blue:  "bg-blue-50 border-blue-200 text-blue-700",
  }[color];
  return (
    <div className={cn("rounded-xl border p-3 text-center", cls)}>
      <p className="text-2xl font-extrabold font-manrope">{value.toLocaleString()}</p>
      <p className="text-[11.5px] font-medium">{label}</p>
    </div>
  );
}
