import { useState, useCallback, useRef } from "react";
import { read, utils } from "xlsx";
import { collection, serverTimestamp, writeBatch, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { toast } from "sonner";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle,
  ChevronRight, ChevronLeft, Download, Users, UserCheck,
  ArrowRight, Loader2, Info, RefreshCw, Copy
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Field Definitions ────────────────────────────────────────────────────────

interface SystemField {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
}

const INDIVIDUAL_FIELDS: SystemField[] = [
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
  { key: "ssn_last4",              label: "SSN (Last 4 digits)" },
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

const STAFF_FIELDS: SystemField[] = [
  { key: "first_name",      label: "First Name",            required: true },
  { key: "last_name",       label: "Last Name",             required: true },
  { key: "email",           label: "Email Address",         required: true, hint: "Used for login" },
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

// ─── Auto-Mapping Logic ───────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

// Additional aliases for common column names (expanded to cover standard template headers)
const FIELD_ALIASES: Record<string, string[]> = {
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

interface ColumnMapping {
  excelCol: string;
  systemField: string | null;
  confidence: MatchConfidence;
}

function autoMap(headers: string[], fields: SystemField[]): ColumnMapping[] {
  return headers.map((h) => {
    const nh = normalize(h);
    let best: string | null = null;
    let confidence: MatchConfidence = "none";

    // 1. Exact match against key, label, or aliases
    for (const field of fields) {
      const nf = normalize(field.key);
      const nl = normalize(field.label);
      const aliases = FIELD_ALIASES[field.key] ?? [];

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

// ─── Date Formatter Helper ─────────────────────────────────────────────────────

function formatDateValue(val: unknown): string {
  if (val instanceof Date) {
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, "0");
    const dd = String(val.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return val !== undefined && val !== null ? String(val).trim() : "";
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface RowError { row: number; field: string; message: string; }

function validateRow(
  row: Record<string, unknown>,
  mappings: ColumnMapping[],
  fields: SystemField[],
  rowIdx: number
): RowError[] {
  const errors: RowError[] = [];
  const requiredFields = fields.filter(f => f.required).map(f => f.key);

  for (const rf of requiredFields) {
    const mapping = mappings.find(m => m.systemField === rf);
    if (!mapping) continue;
    const val = row[mapping.excelCol];
    if (val === undefined || val === null || String(val).trim() === "") {
      errors.push({ row: rowIdx, field: rf, message: `${fields.find(f => f.key === rf)?.label} is required` });
    }
  }
  return errors;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportType = "individuals" | "staff";
type Step = "type" | "upload" | "map" | "review";

interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
  fileName: string;
}

interface DuplicateItem {
  rowIdx: number; // 1-indexed row index in sheet
  excelRow: Record<string, unknown>;
  dbMatch?: Record<string, unknown>; // Existing doc from Firestore
  matchReason: string;
  resolution: "merge" | "keep" | "skip";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsImport() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId ?? "org-1";

  const [importType, setImportType] = useState<ImportType>("individuals");
  const [step, setStep] = useState<Step>("type");
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [importingProgress, setImportingProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Duplicate Resolution States
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  const fields = importType === "individuals" ? INDIVIDUAL_FIELDS : STAFF_FIELDS;
  const collectionName = importType === "individuals" ? "individuals" : "users";

  // ── Smart File Parsing & Header Auto-Detection ───────────────────────────────

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = read(data, { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        // 1. Read first 8 rows as raw arrays to auto-detect optimal header row index
        const rawRows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, range: 0, defval: "" });
        
        let bestHeaderIndex = 0;
        let maxMatches = 0;

        const scanLimit = Math.min(8, rawRows.length);
        for (let i = 0; i < scanLimit; i++) {
          const row = rawRows[i];
          if (!Array.isArray(row)) continue;

          let matches = 0;
          for (const cell of row) {
            const sc = normalize(String(cell ?? ""));
            if (!sc) continue;

            const isMatch = fields.some(field => {
              const fk = normalize(field.key);
              const fl = normalize(field.label);
              const aliases = FIELD_ALIASES[field.key] ?? [];
              return sc === fk || sc === fl || aliases.includes(sc) || sc.includes(fk) || sc.includes(fl);
            });
            if (isMatch) matches++;
          }

          if (matches > maxMatches && matches >= 3) {
            maxMatches = matches;
            bestHeaderIndex = i;
          }
        }

        // 2. Parse sheet from the detected header index onward
        const json = utils.sheet_to_json<Record<string, unknown>>(sheet, { range: bestHeaderIndex, defval: "" });

        if (json.length === 0) { toast.error("The spreadsheet appears to be empty."); return; }

        const headers = Object.keys(json[0]);
        const autoMappings = autoMap(headers, fields);

        setParsed({ headers, rows: json, fileName: file.name });
        setMappings(autoMappings);
        setStep("map");
        toast.info(`Smart template detected! Header row found at line ${bestHeaderIndex + 1}.`);
      } catch (err) {
        console.error(err);
        toast.error("Could not read this file. Please use .xlsx, .xls, or .csv format.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, [fields]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  // ── Duplicate Detection Logic ────────────────────────────────────────────────

  const runDuplicateCheck = async (rows: Record<string, unknown>[], currentMappings: ColumnMapping[]) => {
    setIsCheckingDuplicates(true);
    setDuplicates([]);
    try {
      // Fetch all existing records in this organization to check against
      const q = query(collection(db, collectionName), where("organizationId", "==", orgId));
      const querySnapshot = await getDocs(q);
      const existingDocs: Record<string, any>[] = querySnapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...(docSnapshot.data() as Record<string, unknown>)
      }));

      const detectedDups: DuplicateItem[] = [];
      const seenMedicaid = new Map<string, number>(); // val -> rowIdx
      const seenEmail = new Map<string, number>(); // val -> rowIdx
      const seenNameDob = new Map<string, number>(); // val -> rowIdx

      rows.forEach((row, idx) => {
        const rowIdx = idx + 1; // 1-indexed display index

        // Get values of mapped cells
        const medicaidCol = currentMappings.find(m => m.systemField === "medicaid_id")?.excelCol;
        const emailCol = currentMappings.find(m => m.systemField === "email")?.excelCol;
        const firstNameCol = currentMappings.find(m => m.systemField === "first_name")?.excelCol;
        const lastNameCol = currentMappings.find(m => m.systemField === "last_name")?.excelCol;
        const dobCol = currentMappings.find(m => m.systemField === "dob")?.excelCol;

        const medicaidVal = medicaidCol ? String(row[medicaidCol] ?? "").trim().toLowerCase() : "";
        const emailVal = emailCol ? String(row[emailCol] ?? "").trim().toLowerCase() : "";
        const firstVal = firstNameCol ? String(row[firstNameCol] ?? "").trim().toLowerCase() : "";
        const lastVal = lastNameCol ? String(row[lastNameCol] ?? "").trim().toLowerCase() : "";
        const dobVal = dobCol ? formatDateValue(row[dobCol]).trim().toLowerCase() : "";
        const nameDobKey = firstVal && lastVal && dobVal ? `${firstVal}_${lastVal}_${dobVal}` : "";

        let isDup = false;
        let matchReason = "";
        let dbMatchDoc: Record<string, unknown> | undefined = undefined;

        // 1. Check in-file (internal) duplicates
        if (importType === "individuals") {
          if (medicaidVal && seenMedicaid.has(medicaidVal)) {
            isDup = true;
            matchReason = `Medicaid ID (${row[medicaidCol!]}) matches Row ${seenMedicaid.get(medicaidVal)} in this spreadsheet.`;
          } else if (emailVal && seenEmail.has(emailVal)) {
            isDup = true;
            matchReason = `Email (${row[emailCol!]}) matches Row ${seenEmail.get(emailVal)} in this spreadsheet.`;
          } else if (nameDobKey && seenNameDob.has(nameDobKey)) {
            isDup = true;
            matchReason = `Name & DOB (${row[firstNameCol!]} ${row[lastNameCol!]}) matches Row ${seenNameDob.get(nameDobKey)} in this spreadsheet.`;
          }
        } else {
          if (emailVal && seenEmail.has(emailVal)) {
            isDup = true;
            matchReason = `Email (${row[emailCol!]}) matches Row ${seenEmail.get(emailVal)} in this spreadsheet.`;
          }
        }

        // 2. Check database duplicates if no internal duplication was flagged
        if (!isDup) {
          if (importType === "individuals") {
            const match = existingDocs.find(d => {
              const dMedicaid = String(d.medicaid_id ?? "").trim().toLowerCase();
              const dEmail = String(d.email ?? "").trim().toLowerCase();
              const dFirst = String(d.first_name ?? "").trim().toLowerCase();
              const dLast = String(d.last_name ?? "").trim().toLowerCase();
              const dDob = String(d.dob ?? "").trim().toLowerCase();
              const dNameDob = dFirst && dLast && dDob ? `${dFirst}_${dLast}_${dDob}` : "";

              return (medicaidVal && medicaidVal === dMedicaid) ||
                     (emailVal && emailVal === dEmail) ||
                     (nameDobKey && nameDobKey === dNameDob);
            });

            if (match) {
              isDup = true;
              dbMatchDoc = match;
              const matchType = medicaidVal && String(match.medicaid_id ?? "").trim().toLowerCase() === medicaidVal ? "Medicaid ID" :
                                emailVal && String(match.email ?? "").trim().toLowerCase() === emailVal ? "Email" : "Name & DOB";
              matchReason = `Matches existing individual in your database (${matchType} match).`;
            }
          } else {
            const match = existingDocs.find(d => {
              const dEmail = String(d.email ?? "").trim().toLowerCase();
              return emailVal && emailVal === dEmail;
            });

            if (match) {
              isDup = true;
              dbMatchDoc = match;
              matchReason = "Matches existing staff member in your database (Email match).";
            }
          }
        }

        // Cache indices to check subsequent rows
        if (medicaidVal) seenMedicaid.set(medicaidVal, rowIdx);
        if (emailVal) seenEmail.set(emailVal, rowIdx);
        if (nameDobKey) seenNameDob.set(nameDobKey, rowIdx);

        if (isDup) {
          detectedDups.push({
            rowIdx,
            excelRow: row,
            dbMatch: dbMatchDoc,
            matchReason,
            resolution: dbMatchDoc ? "merge" : "skip", // Auto-default DB matches to Merge, file duplicates to Skip
          });
        }
      });

      setDuplicates(detectedDups);
    } catch (err) {
      console.error("Duplicate checking error:", err);
      toast.error("Failed to run duplicate checks.");
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const resolveDuplicate = (rowIdx: number, resolution: "merge" | "keep" | "skip") => {
    setDuplicates(prev => prev.map(d => d.rowIdx === rowIdx ? { ...d, resolution } : d));
  };

  const resolveAllDuplicates = (resolution: "merge" | "keep" | "skip") => {
    setDuplicates(prev => prev.map(d => {
      // Cannot merge internal-only duplicates (no dbMatch targets)
      if (resolution === "merge" && !d.dbMatch) return { ...d, resolution: "skip" };
      return { ...d, resolution };
    }));
    toast.success(`Set resolution for all duplicates to: ${resolution.toUpperCase()}`);
  };

  // ── Scalable Batch Import Engine ─────────────────────────────────────────────

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setImportingProgress({ current: 0, total: parsed.rows.length });
    
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 400; // Batch limit is 500, we use 400 for structural buffer
    const totalRows = parsed.rows.length;

    // Create a fast map of row index -> duplicate settings
    const dupMap = new Map<number, DuplicateItem>();
    duplicates.forEach(d => dupMap.set(d.rowIdx, d));

    // Chunk rows into blocks
    const chunks: { row: Record<string, unknown>; rowIdx: number }[][] = [];
    const items = parsed.rows.map((row, idx) => ({ row, rowIdx: idx + 1 }));
    for (let i = 0; i < items.length; i += batchSize) {
      chunks.push(items.slice(i, i + batchSize));
    }

    let chunkIdx = 0;
    for (const chunk of chunks) {
      try {
        const batch = writeBatch(db);

        for (const item of chunk) {
          const { row, rowIdx } = item;
          const dupItem = dupMap.get(rowIdx);

          // Handle Skip resolution
          if (dupItem && dupItem.resolution === "skip") {
            successCount++; // Count as processed successfully
            continue;
          }

          // Build Firestore Document Payload
          const docData: Record<string, unknown> = {
            organizationId: orgId,
            updatedAt: serverTimestamp(),
            import_source: "excel_import",
          };

          // Apply column mappings with cell date normalization
          for (const mapping of mappings) {
            if (!mapping.systemField) continue;
            const val = row[mapping.excelCol];
            if (val !== undefined && val !== null && val !== "") {
              docData[mapping.systemField] = formatDateValue(val);
            }
          }

          // Defaults for individuals
          if (importType === "individuals") {
            docData.enrollment_status = docData.enrollment_status ?? "active";
            docData.first_name = docData.first_name ?? "";
            docData.last_name = docData.last_name ?? "";
          }

          // Defaults for staff
          if (importType === "staff") {
            docData.role = docData.role ?? "case_manager";
            docData.status = docData.status ?? "active";
            docData.import_pending_invite = true;
          }

          if (dupItem && dupItem.resolution === "merge" && dupItem.dbMatch?.id) {
            // MERGE: Update the existing database document
            const docRef = doc(db, collectionName, String(dupItem.dbMatch.id));
            batch.update(docRef, docData);
          } else {
            // CREATE NEW: Generate new doc and batch insert
            const docRef = doc(collection(db, collectionName));
            docData.createdAt = serverTimestamp();
            batch.set(docRef, docData);
          }
        }

        // Commit batch writes
        await batch.commit();
        successCount += chunk.length;

        // Update progress state
        const currentProcessed = Math.min((chunkIdx + 1) * batchSize, totalRows);
        setImportingProgress({ current: currentProcessed, total: totalRows });
      } catch (err) {
        console.error("Batch write failure:", err);
        errorCount += chunk.length;
      }

      chunkIdx++;
      // Relinquish thread slightly to keep UI fluid
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    setImporting(false);
    setImportResult({ success: successCount - errorCount, errors: errorCount });
    setStep("review");

    if (successCount - errorCount > 0) {
      toast.success(`${successCount - errorCount} records processed successfully!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} records failed during writing.`);
    }
  };

  // ── Row validation ────────────────────────────────────────────────────────────

  const rowErrors = parsed
    ? parsed.rows.flatMap((row, i) => validateRow(row, mappings, fields, i + 1))
    : [];

  const readyRows = parsed ? parsed.rows.length - new Set(rowErrors.map(e => e.row)).size : 0;
  const errorRows = parsed ? new Set(rowErrors.map(e => e.row)).size : 0;

  const autoMapped  = mappings.filter(m => m.confidence === "auto").length;
  const reviewNeeded = mappings.filter(m => m.confidence === "review").length;
  const unmapped    = mappings.filter(m => m.confidence === "none" || !m.systemField).length;

  // ── Download error CSV ───────────────────────────────────────────────────────

  const downloadErrors = () => {
    if (!parsed) return;
    const errorRowIndices = new Set(rowErrors.map(e => e.row));
    const errorRowsData = parsed.rows.filter((_, i) => errorRowIndices.has(i + 1));
    const csv = [parsed.headers.join(","), ...errorRowsData.map(r =>
      parsed.headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
    )].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "import_errors.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SettingsLayout
      title="Import Data"
      subtitle="Bulk import individuals or staff members from an Excel or CSV file."
    >
      {/* Batched Upload Circular Progress Overlay */}
      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
          <div className="bg-gradient-to-br from-icm-panel to-background border border-icm-border rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6 text-center">
            <div className="relative w-24 h-24 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="var(--border)" strokeWidth="6" fill="transparent" className="opacity-20" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="var(--primary)"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - (importingProgress.current / (importingProgress.total || 1)))}
                  className="transition-all duration-300 stroke-teal-600"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-[18px] font-extrabold text-icm-text">
                  {Math.round((importingProgress.current / (importingProgress.total || 1)) * 100)}%
                </span>
              </div>
            </div>
            <div>
              <h3 className="text-[16px] font-extrabold text-icm-text font-manrope">Importing Records…</h3>
              <p className="text-[12px] text-icm-text-dim mt-2 leading-relaxed">
                Writing {importingProgress.current.toLocaleString()} of {importingProgress.total.toLocaleString()} rows in chunked batches. Please keep this browser window open.
              </p>
            </div>
            <div className="flex justify-center items-center gap-1.5 text-[11px] font-semibold text-teal-600 uppercase tracking-wider animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Batch Commits Processing
            </div>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <StepBar step={step} />

      {/* STEP: Type Selection */}
      {step === "type" && (
        <div className="space-y-6 mt-2">
          <p className="text-[13.5px] text-icm-text-dim font-geist">
            Choose what you'd like to import:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <TypeCard
              active={importType === "individuals"}
              onClick={() => setImportType("individuals")}
              icon={<Users className="w-7 h-7" />}
              title="Individuals"
              desc="Import people supported — participants, clients, waiver recipients."
              fields={`${INDIVIDUAL_FIELDS.length} mappable fields`}
              color="violet"
            />
            <TypeCard
              active={importType === "staff"}
              onClick={() => setImportType("staff")}
              icon={<UserCheck className="w-7 h-7" />}
              title="Staff Members"
              desc="Import care managers, supervisors, and admin staff."
              fields={`${STAFF_FIELDS.length} mappable fields`}
              color="blue"
            />
          </div>
          <button
            onClick={() => setStep("upload")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP: Upload */}
      {step === "upload" && (
        <div className="space-y-5 mt-2 max-w-2xl">
          <div className="flex items-center gap-2 text-[13px] text-icm-text-dim">
            <button onClick={() => setStep("type")} className="hover:text-icm-text transition-colors inline-flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
            <span>·</span>
            <span>Importing: <strong className="text-icm-text capitalize">{importType}</strong></span>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
              dragOver
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <div className={cn(
              "mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors",
              dragOver ? "bg-primary/10" : "bg-muted"
            )}>
              <FileSpreadsheet className={cn("w-7 h-7", dragOver ? "text-primary" : "text-icm-text-dim")} />
            </div>
            <p className="font-semibold text-icm-text text-[15px]">
              {dragOver ? "Drop to upload" : "Drag & drop your spreadsheet here"}
            </p>
            <p className="text-[13px] text-icm-text-dim mt-1">or click to browse</p>
            <p className="text-[11.5px] text-icm-text-dim/70 mt-3">Supports .xlsx · .xls · .csv</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Tips */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-[12px] font-semibold text-icm-text flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary" /> Smart templates supported
            </p>
            <ul className="text-[12px] text-icm-text-dim space-y-1 ml-5 list-disc">
              <li>Template sheets with banners or instructions are parsed automatically</li>
              <li>Required fields: First Name and Last Name must map to valid columns</li>
              <li>Medicaid ID and emails are automatically checked for duplicates</li>
              <li>Dates in date columns are fully formatted during import</li>
            </ul>
          </div>
        </div>
      )}

      {/* STEP: Map Fields */}
      {step === "map" && parsed && (
        <div className="space-y-5 mt-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-[13px] text-icm-text-dim">
              <button onClick={() => setStep("upload")} className="hover:text-icm-text transition-colors inline-flex items-center gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span>·</span>
              <span className="text-icm-text font-medium">{parsed.fileName}</span>
              <span>·</span>
              <span>{parsed.rows.length} rows detected</span>
            </div>
            {/* Match summary */}
            <div className="flex items-center gap-3 text-[12px]">
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> {autoMapped} auto-matched
              </span>
              {reviewNeeded > 0 && (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" /> {reviewNeeded} review
                </span>
              )}
              {unmapped > 0 && (
                <span className="flex items-center gap-1 text-icm-text-dim font-medium">
                  <XCircle className="w-3.5 h-3.5" /> {unmapped} unmapped
                </span>
              )}
            </div>
          </div>

          {/* Mapping table */}
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_40px_1fr_120px] bg-muted/50 px-4 py-2.5 border-b border-border text-[11.5px] font-semibold text-icm-text-dim uppercase tracking-wide">
              <span>Excel Column</span>
              <span />
              <span>System Field</span>
              <span>Status</span>
            </div>

            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {mappings.map((m, idx) => (
                <MappingRow
                  key={m.excelCol}
                  mapping={m}
                  fields={fields}
                  sampleValue={parsed.rows[0]?.[m.excelCol]}
                  onFieldChange={(systemField) => {
                    setMappings(prev => prev.map((pm, i) =>
                      i === idx
                        ? { ...pm, systemField, confidence: systemField ? "auto" : "none" }
                        : pm
                    ));
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-muted/50 px-4 py-2.5 border-b border-border text-[11.5px] font-semibold text-icm-text-dim uppercase tracking-wide">
              Data Preview (first 3 rows)
            </div>
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
                        <td key={m.excelCol} className="px-3 py-2 text-icm-text max-w-[160px] truncate">
                          {formatDateValue(row[m.excelCol]) || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[12.5px] text-icm-text-dim">
              {mappings.filter(m => !m.systemField).length > 0 && (
                <span className="text-amber-600">
                  {mappings.filter(m => !m.systemField).length} column(s) set to "Skip" and will not be imported.
                </span>
              )}
            </p>
            <button
              onClick={() => {
                setStep("review");
                if (parsed) runDuplicateCheck(parsed.rows, mappings);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Review & Import <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP: Review & Import (pre-import with Duplicate Resolution) */}
      {step === "review" && parsed && !importResult && (
        <div className="space-y-6 mt-2">
          <div className="flex items-center gap-2 text-[13px] text-icm-text-dim">
            <button onClick={() => setStep("map")} className="hover:text-icm-text transition-colors inline-flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to mapping
            </button>
          </div>

          {isCheckingDuplicates ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4 rounded-2xl border border-dashed border-border bg-muted/25">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-[13px] font-medium text-icm-text">Checking database for existing records & duplicate fields…</p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
                <SummaryCard value={parsed.rows.length} label="Total rows" color="gray" />
                <SummaryCard value={readyRows - duplicates.filter(d => d.resolution === "skip").length} label="Ready to import" color="green" />
                <SummaryCard value={duplicates.length} label="Flagged duplicates" color={duplicates.length > 0 ? "amber" : "gray"} />
                <SummaryCard value={errorRows} label="Validation errors" color={errorRows > 0 ? "red" : "gray"} />
              </div>

              {/* DUPLICATE RESOLUTION WIZARD PANEL */}
              {duplicates.length > 0 && (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-6 space-y-5">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="space-y-1">
                      <h3 className="text-[16px] font-extrabold text-amber-800 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        Duplicate Conflict Resolution Center ({duplicates.length} found)
                      </h3>
                      <p className="text-[12.5px] text-amber-700 max-w-2xl leading-relaxed">
                        Flagged records either conflict with entries already stored in Firestore or repeat multiple times within this file. Decide how to handle each case below.
                      </p>
                    </div>
                    {/* Bulk Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => resolveAllDuplicates("merge")}
                        className="px-3 py-1.5 text-[11px] font-bold bg-white text-primary border border-primary/30 rounded-lg shadow-sm hover:bg-muted/40 transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Merge All Matches
                      </button>
                      <button
                        onClick={() => resolveAllDuplicates("skip")}
                        className="px-3 py-1.5 text-[11px] font-bold bg-white text-red-700 border border-red-200 rounded-lg shadow-sm hover:bg-red-50 transition-colors flex items-center gap-1"
                      >
                        <XCircle className="w-3 h-3" /> Skip All
                      </button>
                      <button
                        onClick={() => resolveAllDuplicates("keep")}
                        className="px-3 py-1.5 text-[11px] font-bold bg-white text-emerald-700 border border-emerald-200 rounded-lg shadow-sm hover:bg-emerald-50 transition-colors flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Import All As New
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Duplicate List */}
                  <div className="divide-y divide-amber-200/60 max-h-[360px] overflow-y-auto border border-amber-200 rounded-xl bg-white/80">
                    {duplicates.map((dup) => {
                      const firstNameCol = mappings.find(m => m.systemField === "first_name")?.excelCol;
                      const lastNameCol = mappings.find(m => m.systemField === "last_name")?.excelCol;
                      const medicaidCol = mappings.find(m => m.systemField === "medicaid_id")?.excelCol;
                      const emailCol = mappings.find(m => m.systemField === "email")?.excelCol;

                      const dupName = `${dup.excelRow[firstNameCol!] ?? ""} ${dup.excelRow[lastNameCol!] ?? ""}`;
                      const dupMedicaid = medicaidCol ? String(dup.excelRow[medicaidCol!] ?? "") : "";
                      const dupEmail = emailCol ? String(dup.excelRow[emailCol!] ?? "") : "";

                      return (
                        <div key={dup.rowIdx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-[12.5px]">
                          <div className="space-y-1.5 max-w-xl">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                                Row {dup.rowIdx}
                              </span>
                              <strong className="text-icm-text font-bold text-[13.5px]">{dupName}</strong>
                            </div>
                            <p className="text-[12px] text-icm-text-dim leading-relaxed flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />
                              <strong className="text-amber-800">Conflict:</strong> {dup.matchReason}
                            </p>
                            {(dupMedicaid || dupEmail) && (
                              <p className="text-[11px] text-icm-text-dim/80 font-mono">
                                {dupMedicaid && `Medicaid: ${dupMedicaid}`} {dupEmail && ` · Email: ${dupEmail}`}
                              </p>
                            )}
                          </div>

                          {/* Options Segmented Control */}
                          <div className="flex items-center gap-1.5 self-start md:self-center shrink-0">
                            {dup.dbMatch && (
                              <button
                                onClick={() => resolveDuplicate(dup.rowIdx, "merge")}
                                className={cn(
                                  "px-2.5 py-1.5 text-[11px] font-bold rounded-lg border transition-all",
                                  dup.resolution === "merge"
                                    ? "bg-primary text-white border-primary shadow-sm"
                                    : "bg-white text-icm-text border-border hover:bg-muted/40"
                                )}
                              >
                                Merge
                              </button>
                            )}
                            <button
                              onClick={() => resolveDuplicate(dup.rowIdx, "skip")}
                              className={cn(
                                "px-2.5 py-1.5 text-[11px] font-bold rounded-lg border transition-all",
                                dup.resolution === "skip"
                                  ? "bg-red-600 text-white border-red-600 shadow-sm"
                                  : "bg-white text-red-600 border-red-200 hover:bg-red-50"
                              )}
                            >
                              Skip Row
                            </button>
                            <button
                              onClick={() => resolveDuplicate(dup.rowIdx, "keep")}
                              className={cn(
                                "px-2.5 py-1.5 text-[11px] font-bold rounded-lg border transition-all",
                                dup.resolution === "keep"
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                  : "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              )}
                            >
                              Keep New
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Errors Panel */}
              {rowErrors.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[12.5px] font-semibold text-red-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> {rowErrors.length} validation issues
                    </p>
                    <button
                      onClick={downloadErrors}
                      className="text-[11.5px] text-red-700 hover:text-red-900 underline flex items-center gap-1 font-semibold"
                    >
                      <Download className="w-3 h-3" /> Download rows with errors
                    </button>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {rowErrors.slice(0, 10).map((e, i) => (
                      <p key={i} className="text-[12px] text-red-700">
                        Row {e.row}: {e.message}
                      </p>
                    ))}
                    {rowErrors.length > 10 && (
                      <p className="text-[12px] text-red-600">…and {rowErrors.length - 10} more</p>
                    )}
                  </div>
                </div>
              )}

              {/* Review table */}
              <div className="rounded-2xl border border-border overflow-hidden">
                <div className="bg-muted/50 px-4 py-2.5 border-b border-border text-[11.5px] font-semibold text-icm-text-dim uppercase tracking-wide">
                  All {parsed.rows.length} Rows
                </div>
                <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-background border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-icm-text-dim w-10">#</th>
                        {mappings.filter(m => m.systemField).slice(0, 6).map(m => (
                          <th key={m.excelCol} className="px-3 py-2 text-left font-medium text-icm-text-dim whitespace-nowrap">
                            {fields.find(f => f.key === m.systemField)?.label ?? m.systemField}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-left font-medium text-icm-text-dim">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.map((row, i) => {
                        const hasError = rowErrors.some(e => e.row === i + 1);
                        const isDup = duplicates.some(d => d.rowIdx === i + 1);
                        const dupConfig = duplicates.find(d => d.rowIdx === i + 1);

                        return (
                          <tr key={i} className={cn("border-b border-border", hasError ? "bg-red-50/60" : isDup ? "bg-amber-50/40" : "")}>
                            <td className="px-3 py-2 text-icm-text-dim">{i + 1}</td>
                            {mappings.filter(m => m.systemField).slice(0, 6).map(m => (
                              <td key={m.excelCol} className="px-3 py-2 text-icm-text max-w-[140px] truncate">
                                {formatDateValue(row[m.excelCol]) || "—"}
                              </td>
                            ))}
                            <td className="px-3 py-2">
                              {hasError ? (
                                <span className="text-red-600 text-[11px] font-semibold flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> Error
                                </span>
                              ) : isDup ? (
                                <span className={cn(
                                  "text-[11px] font-bold flex items-center gap-1",
                                  dupConfig?.resolution === "merge" ? "text-primary" :
                                  dupConfig?.resolution === "skip" ? "text-red-500" : "text-emerald-600"
                                )}>
                                  <AlertTriangle className="w-3 h-3" /> Duplicate ({dupConfig?.resolution?.toUpperCase()})
                                </span>
                              ) : (
                                <span className="text-emerald-600 text-[11px] font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Ready
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-[12.5px] text-icm-text-dim">
                  {readyRows - duplicates.filter(d => d.resolution === "skip").length} of {parsed.rows.length} records will be imported / updated.
                </p>
                <button
                  onClick={handleImport}
                  disabled={importing || (readyRows - duplicates.filter(d => d.resolution === "skip").length) === 0}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Upload className="w-4 h-4" /> Finalize Bulk Import
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP: Post-import Result */}
      {step === "review" && importResult && (
        <div className="space-y-6 mt-2 max-w-xl">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-emerald-50 to-white p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-[22px] font-extrabold text-icm-text font-manrope">Import Complete</h2>
              <p className="text-[14px] text-icm-text-dim mt-1">
                {importResult.success} {importType === "individuals" ? "individuals" : "staff members"} processed successfully.
                {importResult.errors > 0 && ` ${importResult.errors} rows failed.`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-left">
              <SummaryCard value={importResult.success} label="Processed" color="green" />
              <SummaryCard value={importResult.errors} label="Failed" color={importResult.errors > 0 ? "red" : "gray"} />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <a
              href={importType === "individuals" ? "/people" : "/settings/users"}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              View {importType === "individuals" ? "People Supported" : "Staff Members"} <ArrowRight className="w-4 h-4" />
            </a>
            <button
              onClick={() => {
                setParsed(null); setMappings([]); setImportResult(null); setDuplicates([]); setStep("type");
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-icm-text text-sm font-semibold hover:bg-muted/40 transition-colors"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepBar({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "type",   label: "1. Choose Type" },
    { key: "upload", label: "2. Upload File" },
    { key: "map",    label: "3. Map Fields" },
    { key: "review", label: "4. Review & Import" },
  ];
  const current = steps.findIndex(s => s.key === step);
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className={cn(
            "text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors",
            i === current ? "bg-primary text-white" : i < current ? "text-emerald-600" : "text-icm-text-dim"
          )}>
            {i < current ? <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> : null}
            {s.label}
          </div>
          {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-border mx-0.5" />}
        </div>
      ))}
    </div>
  );
}

function TypeCard({
  active, onClick, icon, title, desc, fields, color
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  title: string; desc: string; fields: string; color: "violet" | "blue";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left p-5 rounded-2xl border-2 transition-all",
        active
          ? color === "violet"
            ? "border-violet-500 bg-violet-50"
            : "border-blue-500 bg-blue-50"
          : "border-border hover:border-primary/40 hover:bg-muted/30"
      )}
    >
      <div className={cn(
        "w-11 h-11 rounded-xl flex items-center justify-center mb-3",
        active
          ? color === "violet" ? "bg-violet-100 text-violet-600" : "bg-blue-100 text-blue-600"
          : "bg-muted text-icm-text-dim"
      )}>
        {icon}
      </div>
      <p className="font-bold text-icm-text text-[15px]">{title}</p>
      <p className="text-[12.5px] text-icm-text-dim mt-1 leading-relaxed">{desc}</p>
      <p className="text-[11.5px] text-icm-text-dim/70 mt-2">{fields}</p>
      {active && (
        <div className={cn(
          "mt-3 text-[11.5px] font-semibold flex items-center gap-1",
          color === "violet" ? "text-violet-600" : "text-blue-600"
        )}>
          <CheckCircle2 className="w-3 h-3" /> Selected
        </div>
      )}
    </button>
  );
}

function MappingRow({
  mapping, fields, sampleValue, onFieldChange
}: {
  mapping: ColumnMapping;
  fields: SystemField[];
  sampleValue: unknown;
  onFieldChange: (field: string | null) => void;
}) {
  const confidenceConfig = {
    auto:   { label: "Auto-matched", color: "text-emerald-600 bg-emerald-50", icon: <CheckCircle2 className="w-3 h-3" /> },
    review: { label: "Review",        color: "text-amber-600 bg-amber-50",    icon: <AlertTriangle className="w-3 h-3" /> },
    none:   { label: "No match",      color: "text-icm-text-dim bg-muted",    icon: <XCircle className="w-3 h-3" /> },
  };
  const cfg = confidenceConfig[mapping.systemField ? mapping.confidence : "none"];

  return (
    <div className="grid grid-cols-[1fr_40px_1fr_120px] items-center px-4 py-3 hover:bg-muted/20 transition-colors gap-2">
      {/* Excel column */}
      <div>
        <p className="text-[13px] font-medium text-icm-text">{mapping.excelCol}</p>
        {sampleValue !== undefined && sampleValue !== null && sampleValue !== "" && (
          <p className="text-[11px] text-icm-text-dim truncate max-w-[180px]">
            e.g. {formatDateValue(sampleValue)}
          </p>
        )}
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        <ArrowRight className="w-3.5 h-3.5 text-icm-text-dim" />
      </div>

      {/* System field dropdown */}
      <select
        value={mapping.systemField ?? ""}
        onChange={(e) => onFieldChange(e.target.value || null)}
        className="w-full text-[12.5px] rounded-lg border border-border bg-background px-2.5 py-1.5 text-icm-text focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">— Skip this column —</option>
        {fields.map(f => (
          <option key={f.key} value={f.key}>
            {f.label}{f.required ? " *" : ""}
          </option>
        ))}
      </select>

      {/* Confidence badge */}
      <div className={cn("text-[11px] font-medium px-2 py-1 rounded-lg flex items-center gap-1 justify-center", cfg.color)}>
        {cfg.icon} {cfg.label}
      </div>
    </div>
  );
}

function SummaryCard({ value, label, color }: { value: number; label: string; color: "green" | "red" | "gray" | "amber" }) {
  const colors = {
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
    red:   "bg-red-50 border-red-200 text-red-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    gray:  "bg-muted border-border text-icm-text-dim",
  };
  return (
    <div className={cn("rounded-xl border p-3 text-center", colors[color])}>
      <p className="text-2xl font-extrabold font-manrope">{value}</p>
      <p className="text-[11.5px] font-medium">{label}</p>
    </div>
  );
}
