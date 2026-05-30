/**
 * ProviderImportModal
 *
 * 4-step import wizard for bulk-loading providers into the org directory:
 *   Upload → Map Fields → Duplicate Review → Import
 *
 * Mirrors the exact UX pattern of ImportWizardModal (individuals / staff).
 * Every field on the Add Provider form appears as a mappable system field.
 *
 * Array fields (servicesOffered, languages, etc.) are parsed from
 * semicolon- or comma-separated cell values.
 */

import { useState, useCallback, useRef } from "react";
import { read, utils } from "xlsx";
import {
  X, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle,
  ChevronRight, ChevronLeft, Download, Loader2, Info, GitMerge,
  MinusCircle, CopyPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addProvider, updateProvider, useProviders } from "@/hooks/useProviders";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Field definitions ────────────────────────────────────────────────────────

export interface SystemField {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
  /** If true, split cell value by commas/semicolons → string[] */
  isArray?: boolean;
}

export const PROVIDER_FIELDS: SystemField[] = [
  // ── Section 1: Organization Info ──────────────────────────────────────────
  { key: "name",                   label: "Provider Name",             required: true },
  { key: "type",                   label: "Provider Type",             required: true,  hint: "e.g. Day Services / Day Habilitation, Employment & Vocational" },
  { key: "npiNumber",              label: "NPI Number",                hint: "10-digit NPI" },
  { key: "taxId",                  label: "Tax ID / EIN",              hint: "XX-XXXXXXX" },
  { key: "medicaidProviderNumber", label: "Medicaid Provider Number" },
  { key: "website",                label: "Website",                   hint: "https://..." },

  // ── Section 2: Contact Information ─────────────────────────────────────────
  { key: "street",                 label: "Street Address",            required: true },
  { key: "city",                   label: "City",                      required: true },
  { key: "state",                  label: "State",                     required: true,  hint: "2-letter state code" },
  { key: "zip",                    label: "ZIP Code" },
  { key: "county",                 label: "County" },
  { key: "primaryPhone",           label: "Primary Phone",             required: true,  hint: "(555) 555-5555" },
  { key: "secondaryPhone",         label: "Secondary Phone" },
  { key: "email",                  label: "Email" },
  { key: "contactPersonName",      label: "Contact Person Name" },
  { key: "contactPersonTitle",     label: "Contact Person Title / Role" },
  { key: "contactPersonPhone",     label: "Contact Person Phone" },
  { key: "contactPersonEmail",     label: "Contact Person Email" },

  // ── Section 3: Services & Coverage ─────────────────────────────────────────
  { key: "servicesOffered",        label: "Services Offered",          isArray: true,   hint: "Semicolon or comma separated" },
  { key: "geographicCoverage",     label: "Geographic Coverage",       isArray: true,   hint: "Counties, semicolon separated" },
  { key: "statesCovered",          label: "States Covered",            isArray: true,   hint: "e.g. IN; MD; OH" },
  { key: "populationsServed",      label: "Populations Served",        isArray: true,   hint: "e.g. IDD; Behavioral Health" },
  { key: "ageMin",                 label: "Minimum Age",               hint: "Number" },
  { key: "ageMax",                 label: "Maximum Age",               hint: "Number or 99 for no max" },
  { key: "languages",              label: "Languages Spoken",          isArray: true,   hint: "e.g. English; Spanish" },

  // ── Section 4: Capacity & Availability ──────────────────────────────────────
  { key: "isAcceptingClients",     label: "Accepting New Clients",     hint: "yes / no / waitlist" },
  { key: "currentOpenings",        label: "Current Openings",          hint: "Number" },
  { key: "typicalStartTime",       label: "Typical Start Time",        hint: "e.g. 2–4 weeks" },
  { key: "waitlistEstimate",       label: "Waitlist Estimate" },

  // ── Section 5: Contract & Billing ───────────────────────────────────────────
  { key: "medicaidContracted",     label: "Medicaid Contracted",       hint: "yes / no" },
  { key: "contractStatus",         label: "Contract Status",           hint: "active / expired / pending / none" },
  { key: "contractStartDate",      label: "Contract Start Date",       hint: "YYYY-MM-DD or MM/DD/YYYY" },
  { key: "contractEndDate",        label: "Contract End Date",         hint: "YYYY-MM-DD or MM/DD/YYYY" },
  { key: "acceptedFundingSources", label: "Accepted Funding Sources",  isArray: true,   hint: "Semicolon or comma separated" },
  { key: "rateNotes",              label: "Rate Notes" },

  // ── Section 6: Internal Notes ───────────────────────────────────────────────
  { key: "internalNotes",          label: "Internal Notes" },
];

// ─── Auto-mapping helpers ─────────────────────────────────────────────────────

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

const PROVIDER_ALIASES: Record<string, string[]> = {
  name:                   ["providername","organizationname","agencyname","providerorg","legalname","orgname"],
  type:                   ["providertype","servicetype","organizationtype","agencytype","typeofprovider","category"],
  npiNumber:              ["npi","npinumber","npiid","national provider","nationalprovider"],
  taxId:                  ["taxid","ein","federaltaxid","taxidnumber","employerid"],
  medicaidProviderNumber: ["medicaidprovider","medicaidprovidernum","medicaidid","providerid","providernumber","medicaidproviderid"],
  website:                ["website","url","webaddress","web","homepage","siteurl"],
  street:                 ["streetaddress","address","address1","street","streetaddr","addr"],
  city:                   ["city","town","municipality"],
  state:                  ["state","st","statecode"],
  zip:                    ["zip","zipcode","postalcode","postal"],
  county:                 ["county","countyname","localcounty"],
  primaryPhone:           ["phone","primaryphone","mainnumber","officephone","telephone","phonenumber","primaryphonenumber","mainphone"],
  secondaryPhone:         ["secondaryphone","phone2","alternatephone","altphone","secondphone","backupphone"],
  email:                  ["email","emailaddress","primaryemail","officemail","contactemail"],
  contactPersonName:      ["contactname","contactperson","primarycontact","contactfullname","keycontact","intakecontact"],
  contactPersonTitle:     ["contacttitle","contactrole","title","role","jobtitle","contactposition"],
  contactPersonPhone:     ["contactphone","contactphonenumber","directphone","intakephone"],
  contactPersonEmail:     ["contactemail","contactemailaddress","directemail","intakeemail"],
  servicesOffered:        ["services","servicesoffered","serviceofferings","programsoffered","typesofservices","servicearray"],
  geographicCoverage:     ["counties","countiesserved","geographiccoverage","coverage","servicearea","areasserved","countylist"],
  statesCovered:          ["states","statescovered","statesserved","operatingstates","geographicstates"],
  populationsServed:      ["populations","populationsserved","clientpopulations","targetpopulation","servedpopulations"],
  ageMin:                 ["minage","minimumage","agemin","agefrom","startage"],
  ageMax:                 ["maxage","maximumage","agemax","ageto","endage","upperage"],
  languages:              ["languages","languagesspoken","languagescapability","languagesserved","spokenlangs"],
  isAcceptingClients:     ["accepting","acceptingclients","acceptingnewclients","openforenrollment","open","availability"],
  currentOpenings:        ["openings","currentopenings","availableslots","openslots","slots","spotsavailable"],
  typicalStartTime:       ["starttime","typicalstarttime","startuptime","enrollmenttime","timetostart","onboardingtime"],
  waitlistEstimate:       ["waitlist","waitlistestimate","waittime","estimatedwait","waitperiod"],
  medicaidContracted:     ["medicaid","medicaidcontracted","medicaidcontract","medicaidbilling","medicaidprovider"],
  contractStatus:         ["contractstatus","contractstate","contracttype","agreementstatus"],
  contractStartDate:      ["contractstart","contractstartdate","agreementstart","contractbegin"],
  contractEndDate:        ["contractend","contractenddate","agreementend","contractexpiry","contractexpiration"],
  acceptedFundingSources: ["fundingsources","acceptedfunding","paymentsources","billingoptions","acceptedpayers"],
  rateNotes:              ["rates","ratenotes","billingrates","contractrates","pricinginfo","ratetable","rateinfo"],
  internalNotes:          ["notes","internalnotes","staffnotes","agencynotes","comments","internalcomments"],
};

type Confidence = "auto" | "review" | "none";
interface ColumnMapping {
  excelCol: string;
  systemField: string | null;
  confidence: Confidence;
}

function autoMap(headers: string[], fields: SystemField[]): ColumnMapping[] {
  return headers.map((header) => {
    const hn = normalize(header);
    let bestField: string | null = null;
    let bestScore = Infinity;
    let confidence: Confidence = "none";

    for (const f of fields) {
      const fk = normalize(f.key);
      const fl = normalize(f.label);
      const aliases = PROVIDER_ALIASES[f.key] ?? [];

      // Exact key / label match
      if (hn === fk || hn === fl || aliases.includes(hn)) {
        bestField = f.key; bestScore = 0; confidence = "auto"; break;
      }
      // Contains match
      if (hn.includes(fk) || fk.includes(hn) || hn.includes(fl) || fl.includes(hn)) {
        if (0.5 < bestScore) { bestField = f.key; bestScore = 0.5; confidence = "auto"; }
      }
      // Levenshtein fuzzy
      const distKey = levenshtein(hn, fk);
      const distLabel = levenshtein(hn, fl);
      const dist = Math.min(distKey, distLabel);
      const threshold = Math.max(3, Math.floor(fk.length * 0.35));
      if (dist <= threshold && dist < bestScore) {
        bestField = f.key; bestScore = dist; confidence = dist <= 2 ? "auto" : "review";
      }
    }

    return { excelCol: header, systemField: bestField, confidence };
  });
}

// ─── Array field parser ────────────────────────────────────────────────────────

function parseArrayField(raw: string): string[] {
  return raw.split(/[;,|]/).map((s) => s.trim()).filter(Boolean);
}

function parseBool(raw: string): boolean {
  const n = raw.trim().toLowerCase();
  return n === "yes" || n === "true" || n === "1";
}

// ─── Build provider record from mapped row ────────────────────────────────────

function buildProviderRecord(
  row: Record<string, unknown>,
  mappings: ColumnMapping[],
  orgId: string
): Record<string, unknown> {
  const out: Record<string, unknown> = { orgId, status: "active" as const };

  for (const m of mappings) {
    if (!m.systemField) continue;
    const raw = String(row[m.excelCol] ?? "").trim();
    if (!raw) continue;

    const field = PROVIDER_FIELDS.find((f) => f.key === m.systemField);
    if (!field) continue;

    if (field.isArray) {
      out[m.systemField] = parseArrayField(raw);
    } else if (m.systemField === "medicaidContracted") {
      out[m.systemField] = parseBool(raw);
    } else if (m.systemField === "ageMin" || m.systemField === "ageMax" || m.systemField === "currentOpenings") {
      const n = parseInt(raw, 10);
      out[m.systemField] = isNaN(n) ? null : n;
    } else if (m.systemField === "isAcceptingClients") {
      const lc = raw.toLowerCase();
      out[m.systemField] = lc === "waitlist" ? "waitlist" : (lc === "yes" || lc === "true") ? "yes" : "no";
    } else {
      out[m.systemField] = raw;
    }
  }

  return out;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "upload" | "map" | "duplicates" | "importing" | "done";
type DupeResolution = "merge" | "skip" | "keep_both";

interface ParsedData { headers: string[]; rows: Record<string, unknown>[]; fileName: string; }
interface ImportResult { success: number; errors: number; merged: number; skipped: number; }

interface DupeEntry {
  rowIndex: number;
  newName: string;
  existingId: string;
  existingName: string;
  resolution: DupeResolution;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepBar({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload",     label: "Upload" },
    { key: "map",        label: "Map Fields" },
    { key: "duplicates", label: "Duplicates" },
    { key: "importing",  label: "Import" },
  ];
  const activeIdx = steps.findIndex((s) => s.key === step || (step === "done" && s.key === "importing"));

  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const done = i < activeIdx || step === "done";
        const active = i === activeIdx && step !== "done";
        return (
          <div key={s.key} className="flex items-center">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-geist font-semibold transition-colors",
              done   ? "text-icm-green" :
              active ? "text-icm-accent" :
              "text-icm-text-faint"
            )}>
              <span className={cn(
                "w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center",
                done   ? "bg-icm-green text-white" :
                active ? "bg-icm-accent text-white" :
                "bg-icm-border text-icm-text-faint"
              )}>
                {done ? "✓" : i + 1}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-icm-border mx-0.5" />}
          </div>
        );
      })}
    </div>
  );
}

function MappingRow({
  mapping,
  sampleValue,
  onFieldChange,
}: {
  mapping: ColumnMapping;
  sampleValue: unknown;
  onFieldChange: (field: string | null) => void;
}) {
  const conf = mapping.confidence;
  const badgeCls =
    conf === "auto"   ? "bg-icm-green-soft text-icm-green" :
    conf === "review" ? "bg-icm-amber-soft text-icm-amber" :
    "bg-icm-bg text-icm-text-faint";
  const badgeLabel =
    conf === "auto"   ? "Auto" :
    conf === "review" ? "Review" :
    "Unmapped";

  return (
    <div className="grid grid-cols-[1fr_32px_1fr_90px] items-center px-4 py-2.5 border-b border-icm-border/50 last:border-b-0 hover:bg-icm-bg/40">
      {/* CSV column */}
      <div className="min-w-0">
        <p className="text-[12.5px] font-geist font-medium text-icm-text truncate">{mapping.excelCol}</p>
        {sampleValue != null && String(sampleValue) !== "" && (
          <p className="text-[11px] text-icm-text-faint truncate font-mono mt-0.5">
            e.g. {String(sampleValue).slice(0, 50)}
          </p>
        )}
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        <ChevronRight className="w-3.5 h-3.5 text-icm-text-faint" />
      </div>

      {/* System field select */}
      <select
        value={mapping.systemField ?? ""}
        onChange={(e) => onFieldChange(e.target.value || null)}
        className="h-8 px-2 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-accent"
      >
        <option value="">— Skip this column —</option>
        <optgroup label="Organization Info">
          {PROVIDER_FIELDS.slice(0, 6).map((f) => (
            <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>
          ))}
        </optgroup>
        <optgroup label="Contact Information">
          {PROVIDER_FIELDS.slice(6, 18).map((f) => (
            <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>
          ))}
        </optgroup>
        <optgroup label="Services & Coverage">
          {PROVIDER_FIELDS.slice(18, 25).map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </optgroup>
        <optgroup label="Capacity & Availability">
          {PROVIDER_FIELDS.slice(25, 29).map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </optgroup>
        <optgroup label="Contract & Billing">
          {PROVIDER_FIELDS.slice(29, 35).map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </optgroup>
        <optgroup label="Internal Notes">
          {PROVIDER_FIELDS.slice(35).map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </optgroup>
      </select>

      {/* Badge */}
      <div className="flex justify-end">
        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold", badgeCls)}>
          {badgeLabel}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onComplete?: (count: number) => void;
}

export function ProviderImportModal({ onClose, onComplete }: Props) {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId ?? "";

  const [step, setStep]             = useState<Step>("upload");
  const [parsed, setParsed]         = useState<ParsedData | null>(null);
  const [mappings, setMappings]     = useState<ColumnMapping[]>([]);
  const [dupes, setDupes]           = useState<DupeEntry[]>([]);
  const [result, setResult]         = useState<ImportResult | null>(null);
  const [dragOver, setDragOver]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [checkingDupes, setCheckingDupes] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── File parsing ───────────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = read(data, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];

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
            const isMatch = PROVIDER_FIELDS.some((f) => {
              const fk = normalize(f.key);
              const fl = normalize(f.label);
              const aliases = PROVIDER_ALIASES[f.key] ?? [];
              return sc === fk || sc === fl || aliases.includes(sc) || sc.includes(fk) || sc.includes(fl);
            });
            if (isMatch) matches++;
          }
          if (matches > maxMatches && matches >= 2) { maxMatches = matches; bestHeaderIndex = i; }
        }

        const json = utils.sheet_to_json<Record<string, unknown>>(sheet, { range: bestHeaderIndex, defval: "" });
        if (json.length === 0) { toast.error("The spreadsheet appears to be empty."); return; }

        const headers = Object.keys(json[0]);
        const autoMappings = autoMap(headers, PROVIDER_FIELDS);

        setParsed({ headers, rows: json, fileName: file.name });
        setMappings(autoMappings);
        setStep("map");
        toast.info(`File loaded — header detected at row ${bestHeaderIndex + 1}. Review field mappings below.`);
      } catch {
        toast.error("Could not read this file. Please use .xlsx, .xls, or .csv format.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  function validateFile(file: File): string | null {
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    if (![".xlsx", ".xls", ".csv"].includes(ext)) return `Unsupported file type: "${file.name}". Use .xlsx, .xls, or .csv.`;
    if (file.size > 50 * 1024 * 1024) return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 50 MB.`;
    return null;
  }

  const handleFileSelect = useCallback((file: File) => {
    const err = validateFile(file);
    if (err) { setUploadError(err); return; }
    setUploadError(null);
    processFile(file);
  }, [processFile]);

  // ── Duplicate detection ────────────────────────────────────────────────────

  const runDuplicateCheck = useCallback(async () => {
    if (!parsed) return;
    setCheckingDupes(true);

    try {
      // Fetch existing provider names for this org
      const existingSnap = await getDocs(
        query(collection(db, "providers"), where("status", "in", ["active", "pending_review"]))
      );
      const existingNames = new Map<string, string>(); // normalized name → id
      existingSnap.docs.forEach((d) => {
        const name = String(d.data().name ?? "");
        existingNames.set(normalize(name), d.id);
      });

      // Find duplicates in uploaded rows
      const nameMapping = mappings.find((m) => m.systemField === "name");
      const detected: DupeEntry[] = [];

      parsed.rows.forEach((row, i) => {
        if (!nameMapping) return;
        const rawName = String(row[nameMapping.excelCol] ?? "").trim();
        const nn = normalize(rawName);
        const existId = existingNames.get(nn);
        if (existId) {
          detected.push({
            rowIndex: i,
            newName: rawName,
            existingId: existId,
            existingName: rawName,
            resolution: "merge",
          });
        }
      });

      setDupes(detected);
    } catch {
      toast.error("Could not check for duplicates. You can still proceed.");
      setDupes([]);
    }

    setCheckingDupes(false);
    setStep("duplicates");
  }, [parsed, mappings]);

  // ── Import ─────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!parsed) return;
    setStep("importing");
    setImportProgress({ done: 0, total: parsed.rows.length });

    const dupeMap = new Map(dupes.map((d) => [d.rowIndex, d]));
    let success = 0, errors = 0, merged = 0, skipped = 0;

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const dupe = dupeMap.get(i);

      if (dupe?.resolution === "skip") { skipped++; setImportProgress({ done: i + 1, total: parsed.rows.length }); continue; }

      const record = buildProviderRecord(row, mappings, orgId);
      if (!record.name) { errors++; setImportProgress({ done: i + 1, total: parsed.rows.length }); continue; }

      try {
        if (dupe?.resolution === "merge" && dupe.existingId) {
          await updateProvider(dupe.existingId, record as any);
          merged++;
        } else {
          await addProvider(record as any);
          success++;
        }
      } catch (err: any) {
        console.error("Provider import row error:", err);
        errors++;
      }

      setImportProgress({ done: i + 1, total: parsed.rows.length });

      // Yield every 10 rows to keep UI responsive
      if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    setResult({ success, errors, merged, skipped });
    setStep("done");
    onComplete?.(success + merged);
    toast.success(`Import complete — ${success + merged} providers added/updated.`);
  };

  // ── Template download ──────────────────────────────────────────────────────

  function downloadTemplate() {
    const required = PROVIDER_FIELDS.filter((f) => f.required).map((f) => f.label);
    const optional = PROVIDER_FIELDS.filter((f) => !f.required).map((f) => f.label);
    const headers = [...required, ...optional];
    const exampleRow = [
      "ABC Day Services",         // Provider Name
      "Day Services / Day Habilitation", // Provider Type
      "123 Main St",              // Street Address
      "Indianapolis",             // City
      "IN",                       // State
      "(317) 555-0001",           // Primary Phone
    ];
    const csv = [headers.join(","), exampleRow.join(",")].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "provider-import-template.csv";
    a.click();
  }

  // ── Computed ───────────────────────────────────────────────────────────────

  const autoMapped   = mappings.filter((m) => m.confidence === "auto").length;
  const reviewNeeded = mappings.filter((m) => m.confidence === "review").length;
  const unmapped     = mappings.filter((m) => !m.systemField).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-icm-panel border border-icm-border shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-icm-border shrink-0">
          <div>
            <h2 className="font-manrope font-bold text-[17px] text-icm-text">Import Providers</h2>
            <p className="text-[12px] text-icm-text-dim font-geist mt-0.5">
              Upload a spreadsheet · Map columns to provider fields · Detect duplicates · Bulk import
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step bar */}
        <div className="px-6 py-3 border-b border-icm-border bg-icm-bg/50 shrink-0">
          <StepBar step={step} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── UPLOAD ──────────────────────────────────────────────────────── */}
          {step === "upload" && (
            <div className="space-y-5 max-w-xl mx-auto">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
                  uploadError ? "border-red-400 bg-red-50" :
                  dragOver ? "border-icm-accent bg-icm-accent-soft scale-[1.01]" :
                  "border-icm-border hover:border-icm-accent/50 hover:bg-icm-bg"
                )}
              >
                <div className={cn("mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4", dragOver ? "bg-icm-accent/10" : "bg-icm-bg")}>
                  <FileSpreadsheet className={cn("w-7 h-7", dragOver ? "text-icm-accent" : "text-icm-text-dim")} />
                </div>
                <p className="font-semibold text-icm-text text-[15px]">{dragOver ? "Drop to upload" : "Drag & drop your spreadsheet here"}</p>
                <p className="text-[13px] text-icm-text-dim mt-1">or click to browse</p>
                <p className="text-[11.5px] text-icm-text-dim/70 mt-3">Supports .xlsx · .xls · .csv · Max 50 MB</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
              </div>

              {uploadError && (
                <div className="flex items-start gap-2 text-icm-red text-[12.5px] bg-icm-red-soft border border-icm-red/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {uploadError}
                </div>
              )}

              <div className="rounded-xl border border-icm-border bg-icm-bg/60 p-4 space-y-2">
                <p className="text-[12px] font-semibold text-icm-text flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-icm-accent" /> Tips for a smooth import
                </p>
                <ul className="text-[12px] text-icm-text-dim space-y-1 ml-5 list-disc">
                  <li>Column headers in the first row — standard names auto-match</li>
                  <li>Required: <strong>Provider Name</strong>, <strong>Provider Type</strong>, <strong>Street Address</strong>, <strong>City</strong>, <strong>State</strong>, <strong>Primary Phone</strong></li>
                  <li>Array fields (Services, Languages) — separate values with semicolons: <code className="bg-icm-bg px-1 rounded text-[11px]">English; Spanish</code></li>
                  <li>Accepting clients: use <code className="bg-icm-bg px-1 rounded text-[11px]">yes</code>, <code className="bg-icm-bg px-1 rounded text-[11px]">no</code>, or <code className="bg-icm-bg px-1 rounded text-[11px]">waitlist</code></li>
                  <li>Medicaid Contracted: use <code className="bg-icm-bg px-1 rounded text-[11px]">yes</code> or <code className="bg-icm-bg px-1 rounded text-[11px]">no</code></li>
                </ul>
                <button
                  onClick={downloadTemplate}
                  className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-icm-accent hover:underline"
                >
                  <Download className="w-3.5 h-3.5" /> Download CSV template
                </button>
              </div>
            </div>
          )}

          {/* ── MAP FIELDS ──────────────────────────────────────────────────── */}
          {step === "map" && parsed && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-[13px] text-icm-text font-medium">
                  <span className="text-icm-text-dim">File:</span>{" "}{parsed.fileName}{" "}
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-icm-accent/10 text-icm-accent text-[11px] font-semibold">
                    {parsed.rows.length.toLocaleString()} rows
                  </span>
                </p>
                <div className="flex items-center gap-3 text-[12px]">
                  <span className="flex items-center gap-1 text-icm-green font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> {autoMapped} auto-matched</span>
                  {reviewNeeded > 0 && <span className="flex items-center gap-1 text-icm-amber font-medium"><AlertTriangle className="w-3.5 h-3.5" /> {reviewNeeded} review</span>}
                  {unmapped > 0 && <span className="flex items-center gap-1 text-icm-text-dim font-medium"><XCircle className="w-3.5 h-3.5" /> {unmapped} unmapped</span>}
                </div>
              </div>

              {/* Mapping table */}
              <div className="rounded-xl border border-icm-border overflow-hidden">
                <div className="grid grid-cols-[1fr_32px_1fr_90px] bg-icm-bg/80 px-4 py-2 border-b border-icm-border text-[10.5px] font-mono font-bold text-icm-text-faint uppercase tracking-wide">
                  <span>CSV Column → Sample value</span>
                  <span />
                  <span>System Field</span>
                  <span className="text-right">Status</span>
                </div>
                <div className="divide-y divide-icm-border/50 max-h-[380px] overflow-y-auto">
                  {mappings.map((m, idx) => (
                    <MappingRow
                      key={m.excelCol}
                      mapping={m}
                      sampleValue={parsed.rows[0]?.[m.excelCol]}
                      onFieldChange={(sf) =>
                        setMappings((prev) =>
                          prev.map((pm, i) =>
                            i === idx ? { ...pm, systemField: sf, confidence: sf ? "auto" : "none" } : pm
                          )
                        )
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Preview table */}
              <div className="rounded-xl border border-icm-border overflow-hidden">
                <div className="bg-icm-bg/80 px-4 py-2 border-b border-icm-border text-[10.5px] font-mono font-bold text-icm-text-faint uppercase tracking-wide">
                  Preview — first 3 rows
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-icm-border">
                        {mappings.filter((m) => m.systemField).map((m) => (
                          <th key={m.excelCol} className="px-3 py-2 text-left font-medium text-icm-text-dim whitespace-nowrap">
                            {PROVIDER_FIELDS.find((f) => f.key === m.systemField)?.label ?? m.systemField}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-b border-icm-border/50 hover:bg-icm-bg/30">
                          {mappings.filter((m) => m.systemField).map((m) => (
                            <td key={m.excelCol} className="px-3 py-2 text-icm-text max-w-[160px] truncate">
                              {String(row[m.excelCol] ?? "—")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── CHECKING DUPES ──────────────────────────────────────────────── */}
          {checkingDupes && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-10 h-10 text-icm-accent animate-spin" />
              <p className="font-semibold text-icm-text text-[15px]">Scanning for duplicates…</p>
              <p className="text-[12px] text-icm-text-dim">Comparing against existing providers in your directory</p>
            </div>
          )}

          {/* ── DUPLICATES ──────────────────────────────────────────────────── */}
          {step === "duplicates" && !checkingDupes && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: parsed?.rows.length ?? 0, label: "Total rows",        color: "neutral" },
                  { value: dupes.length,              label: "Duplicates found",  color: dupes.length > 0 ? "amber" : "green" },
                  { value: parsed ? (parsed.rows.length - dupes.length) : 0, label: "New providers", color: "green" },
                  { value: dupes.filter((d) => d.resolution === "merge").length, label: "Will merge", color: "blue" },
                ].map((chip, i) => (
                  <div key={i} className={cn(
                    "rounded-xl border px-4 py-3",
                    chip.color === "green"   ? "bg-icm-green-soft border-icm-green/20" :
                    chip.color === "amber"   ? "bg-icm-amber-soft border-icm-amber/20" :
                    chip.color === "blue"    ? "bg-icm-accent-soft border-icm-accent/20" :
                    "bg-icm-panel border-icm-border"
                  )}>
                    <p className={cn("text-[20px] font-manrope font-extrabold", chip.color === "green" ? "text-icm-green" : chip.color === "amber" ? "text-icm-amber" : chip.color === "blue" ? "text-icm-accent" : "text-icm-text")}>{chip.value}</p>
                    <p className="text-[11px] font-geist text-icm-text-dim mt-0.5">{chip.label}</p>
                  </div>
                ))}
              </div>

              {dupes.length === 0 ? (
                <div className="rounded-xl border border-icm-green/30 bg-icm-green-soft p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-icm-green mx-auto mb-2" />
                  <p className="font-semibold text-icm-green text-[14px]">No duplicates detected</p>
                  <p className="text-[12px] text-icm-green/70 mt-1">All {parsed?.rows.length.toLocaleString()} providers are new. Ready to import.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-icm-text text-[13px]">
                      {dupes.length} provider{dupes.length !== 1 ? "s" : ""} already exist in your directory
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-icm-text-dim">Apply all:</span>
                      <button onClick={() => setDupes((d) => d.map((x) => ({ ...x, resolution: "merge" })))}
                        className="h-7 px-2.5 rounded-lg text-[11.5px] font-semibold border border-blue-200 bg-blue-50 text-blue-700 flex items-center gap-1 hover:bg-blue-100">
                        <GitMerge className="w-3 h-3" /> Merge all
                      </button>
                      <button onClick={() => setDupes((d) => d.map((x) => ({ ...x, resolution: "skip" })))}
                        className="h-7 px-2.5 rounded-lg text-[11.5px] font-semibold border border-icm-border bg-icm-bg text-icm-text-dim flex items-center gap-1 hover:bg-icm-bg">
                        <MinusCircle className="w-3 h-3" /> Skip all
                      </button>
                      <button onClick={() => setDupes((d) => d.map((x) => ({ ...x, resolution: "keep_both" })))}
                        className="h-7 px-2.5 rounded-lg text-[11.5px] font-semibold border border-violet-200 bg-violet-50 text-violet-700 flex items-center gap-1 hover:bg-violet-100">
                        <CopyPlus className="w-3 h-3" /> Keep both
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11.5px]">
                    <span className="flex items-center gap-1 text-blue-600"><GitMerge className="w-3 h-3" /> Merge — update existing</span>
                    <span className="flex items-center gap-1 text-icm-text-dim"><MinusCircle className="w-3 h-3" /> Skip — don't import</span>
                    <span className="flex items-center gap-1 text-violet-600"><CopyPlus className="w-3 h-3" /> Keep both — add as new</span>
                  </div>

                  <div className="space-y-2 max-h-[360px] overflow-y-auto">
                    {dupes.map((d, i) => (
                      <div key={d.rowIndex} className="rounded-lg border border-icm-border bg-icm-bg/40 p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-semibold text-icm-text truncate">{d.newName}</p>
                          <p className="text-[11px] text-icm-text-dim mt-0.5">Matches existing provider (row {d.rowIndex + 1})</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {(["merge", "skip", "keep_both"] as DupeResolution[]).map((r) => (
                            <button
                              key={r}
                              onClick={() => setDupes((prev) => prev.map((x, xi) => xi === i ? { ...x, resolution: r } : x))}
                              className={cn(
                                "h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-colors",
                                d.resolution === r
                                  ? r === "merge"     ? "bg-blue-600 text-white border-blue-600"
                                  : r === "skip"      ? "bg-icm-text text-icm-panel border-icm-text"
                                  : "bg-violet-600 text-white border-violet-600"
                                  : "bg-icm-panel text-icm-text-dim border-icm-border hover:border-icm-border-strong"
                              )}
                            >
                              {r === "keep_both" ? "Keep both" : r.charAt(0).toUpperCase() + r.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── IMPORTING ──────────────────────────────────────────────────── */}
          {step === "importing" && importProgress && (
            <div className="flex flex-col items-center justify-center py-16 gap-5">
              <Loader2 className="w-10 h-10 text-icm-accent animate-spin" />
              <div className="text-center">
                <p className="font-semibold text-icm-text text-[15px]">Importing providers…</p>
                <p className="text-[12px] text-icm-text-dim mt-1">
                  {importProgress.done.toLocaleString()} of {importProgress.total.toLocaleString()} rows written
                </p>
              </div>
              <div className="w-72 h-2 rounded-full bg-icm-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-icm-accent transition-all"
                  style={{ width: `${Math.round((importProgress.done / importProgress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* ── DONE ───────────────────────────────────────────────────────── */}
          {step === "done" && result && (
            <div className="flex flex-col items-center justify-center py-12 gap-5">
              <div className="w-16 h-16 bg-icm-green-soft rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-icm-green" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-[18px] font-manrope font-bold text-icm-text">Import Complete</h3>
                <p className="text-[13px] text-icm-text-dim">{result.success} provider{result.success !== 1 ? "s" : ""} successfully added.</p>
                {result.merged > 0 && <p className="text-[12px] text-blue-600">{result.merged} existing records updated (merged).</p>}
                {result.skipped > 0 && <p className="text-[12px] text-icm-amber">{result.skipped} rows skipped.</p>}
                {result.errors > 0 && <p className="text-[12px] text-icm-red">{result.errors} rows failed to write.</p>}
              </div>
              <button onClick={onClose} className="h-9 px-5 rounded-xl bg-icm-accent text-white text-[13px] font-geist font-semibold hover:opacity-90">
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== "importing" && step !== "done" && (
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-icm-border bg-icm-panel">
            <button
              onClick={() => {
                if (step === "upload") { onClose(); return; }
                if (step === "map") { setStep("upload"); return; }
                if (step === "duplicates") { setStep("map"); return; }
              }}
              className="h-9 px-4 rounded-xl border border-icm-border text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text flex items-center gap-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {step === "upload" ? "Cancel" : "Back"}
            </button>

            <div className="flex items-center gap-2">
              {step === "upload" && (
                <button onClick={() => fileRef.current?.click()} className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> Select file
                </button>
              )}
              {step === "map" && (
                <button
                  onClick={runDuplicateCheck}
                  disabled={mappings.filter((m) => m.systemField === "name").length === 0}
                  className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
                >
                  Next: Check Duplicates <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              {step === "duplicates" && (
                <button
                  onClick={handleImport}
                  className="h-9 px-4 rounded-xl bg-icm-green text-white text-[12px] font-geist font-semibold hover:opacity-90 flex items-center gap-1.5"
                >
                  Import {parsed?.rows.length.toLocaleString()} Providers →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
