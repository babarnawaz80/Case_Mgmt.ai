/**
 * RemittanceReconciliation
 *
 * Upload payer remittance (835 ERA / CSV / Excel) → auto-match against
 * submitted claims → review → apply.
 *
 * Matching priority:
 *   1. Exact ICN / claim_id
 *   2. Member name + date of service + service code
 *   3. Member name + date of service (fuzzy service code)
 *
 * After review the CM clicks "Apply Reconciliation" to bulk-update:
 *   billing_status, amount_paid, denial_reason, adjustment_amount,
 *   remittance_received, remittance_date
 */

import { useState, useRef, useCallback } from "react";
import { read, utils } from "xlsx";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle,
  ChevronRight, ChevronLeft, Download, Loader2, Info, RefreshCw,
  DollarSign, X, FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { updateBillingRecord, type BillingRecord } from "@/hooks/useBillingRecords";
import { useAuth } from "@/contexts/AuthContext";

// ─── Remittance field map ─────────────────────────────────────────────────────

const REMAP_FIELDS = [
  { key: "icn",            label: "ICN / Claim ID",       hint: "Internal control number from payer" },
  { key: "member_name",    label: "Member / Patient Name", hint: "Individual's full name" },
  { key: "member_id",      label: "Member ID / MA #",      hint: "Medicaid ID or member number" },
  { key: "date_of_service",label: "Date of Service",       hint: "YYYY-MM-DD or MM/DD/YYYY" },
  { key: "service_code",   label: "Service Code",          hint: "CPT / HCPCS / procedure code" },
  { key: "billed_amount",  label: "Billed Amount",         hint: "Amount billed" },
  { key: "paid_amount",    label: "Paid Amount",           hint: "Amount paid by payer" },
  { key: "adjustment_amount", label: "Adjustment Amount",  hint: "Contractual / other adjustment" },
  { key: "denial_code",    label: "Denial / Remark Code",  hint: "CO-45, PR-2, etc." },
  { key: "denial_reason",  label: "Denial Reason",         hint: "Description of denial" },
  { key: "check_number",   label: "Check / EFT Number",    hint: "Payment reference number" },
  { key: "payment_date",   label: "Payment Date",          hint: "Date payment was issued" },
];

const REMAP_ALIASES: Record<string, string[]> = {
  icn:             ["icn","claimid","claim_id","internalcontrolnumber","icnnumber","claimnumber","referencenumber"],
  member_name:     ["membername","patientname","individualname","clientname","recipientname","member","patient","name"],
  member_id:       ["memberid","medicaidid","maid","recipientid","clientid","patientid","membernum"],
  date_of_service: ["dateofservice","dos","servicedate","dos","servicefromdate","fromdate","dateservice"],
  service_code:    ["servicecode","procedurecode","hcpcs","cpt","code","billingcode","revenuecode"],
  billed_amount:   ["billedamount","chargeamount","billedcharges","totalcharged","submittedamount","chargeamt"],
  paid_amount:     ["paidamount","paymentamount","allowedamount","approvedamount","reimbursedamount","amt_paid","amountpaid"],
  adjustment_amount:["adjustmentamount","contractualadjustment","writeoff","coinsurance","adjustment","adj"],
  denial_code:     ["denialcode","remarkcode","carc","rarc","reasoncode","adjustmentcode","claimadjustmentreasoncode"],
  denial_reason:   ["denialreason","remarkdescription","denialreasontext","reasondescription","adjustmentreason"],
  check_number:    ["checknumber","checkno","eftnumber","paymentreference","tracenumber","checknum"],
  payment_date:    ["paymentdate","checkdate","eftdate","datepaid","dateofpayment","remitdate"],
};

function normalizeStr(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, ""); }

function autoMapRemit(headers: string[]): Record<string, string | null> {
  const mapping: Record<string, string | null> = {};
  for (const h of headers) {
    const hn = normalizeStr(h);
    let found: string | null = null;
    for (const f of REMAP_FIELDS) {
      const aliases = REMAP_ALIASES[f.key] ?? [];
      if (hn === normalizeStr(f.key) || hn === normalizeStr(f.label) || aliases.includes(hn)) {
        found = f.key; break;
      }
      if (aliases.some((a) => hn.includes(a) || a.includes(hn))) { found = f.key; break; }
    }
    mapping[h] = found;
  }
  return mapping;
}

// ─── Remittance line (parsed from file) ───────────────────────────────────────

interface RemitLine {
  rowIdx: number;
  raw: Record<string, unknown>;
  // Normalized fields
  icn?: string;
  member_name?: string;
  member_id?: string;
  date_of_service?: string;
  service_code?: string;
  billed_amount?: number;
  paid_amount?: number;
  adjustment_amount?: number;
  denial_code?: string;
  denial_reason?: string;
  check_number?: string;
  payment_date?: string;
}

// ─── Match result ─────────────────────────────────────────────────────────────

type MatchStatus = "paid" | "denied" | "adjusted" | "partial" | "unmatched";

interface MatchResult {
  remitLine: RemitLine;
  claim: BillingRecord | null;
  matchConfidence: "exact" | "strong" | "weak" | "none";
  matchReason: string;
  proposedStatus: MatchStatus;
  discrepancy?: string; // e.g. "Paid $40 less than billed"
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseAmt(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = parseFloat(String(raw).replace(/[$,]/g, ""));
  return isNaN(n) ? undefined : n;
}

function normalizeDate(raw: string): string {
  // Try MM/DD/YYYY → YYYY-MM-DD
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return raw.slice(0, 10);
}

function nameNorm(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

function deriveStatus(line: RemitLine): MatchStatus {
  if (line.denial_code || line.denial_reason) return "denied";
  if (line.paid_amount === 0) return "denied";
  if (line.adjustment_amount && line.adjustment_amount > 0 && line.paid_amount != null && line.paid_amount > 0) return "adjusted";
  if (line.paid_amount != null && line.paid_amount > 0) return "paid";
  return "unmatched";
}

function matchRemitToClaims(lines: RemitLine[], claims: BillingRecord[]): MatchResult[] {
  const submittedClaims = claims.filter((c) => c.billing_status === "submitted" || c.billing_status === "accepted");

  return lines.map((line) => {
    let bestClaim: BillingRecord | null = null;
    let bestConf: MatchResult["matchConfidence"] = "none";
    let bestReason = "";

    for (const claim of submittedClaims) {
      // 1. Exact ICN match
      if (line.icn && claim.id === line.icn) {
        bestClaim = claim; bestConf = "exact"; bestReason = "ICN match"; break;
      }

      // 2. Name + DOS + service code
      const nameMatch  = line.member_name && nameNorm(claim.individual_name).includes(nameNorm(line.member_name).slice(0, 4));
      const dosMatch   = line.date_of_service && claim.date_of_service === normalizeDate(line.date_of_service);
      const codeMatch  = line.service_code && claim.service_code?.toUpperCase() === line.service_code.toUpperCase();

      if (nameMatch && dosMatch && codeMatch) {
        if (bestConf !== "exact") { bestClaim = claim; bestConf = "strong"; bestReason = "Name + DOS + service code"; }
        break;
      }

      // 3. Name + DOS
      if (nameMatch && dosMatch && bestConf === "none") {
        bestClaim = claim; bestConf = "weak"; bestReason = "Name + DOS (code unconfirmed)";
      }
    }

    const proposedStatus = deriveStatus(line);

    let discrepancy: string | undefined;
    if (bestClaim && line.paid_amount != null && line.billed_amount != null) {
      const diff = line.billed_amount - (line.paid_amount + (line.adjustment_amount ?? 0));
      if (Math.abs(diff) > 0.01) {
        discrepancy = diff > 0
          ? `Underpayment: $${diff.toFixed(2)} unbilled`
          : `Overpayment: $${Math.abs(diff).toFixed(2)} over billed`;
      }
    }

    return { remitLine: line, claim: bestClaim, matchConfidence: bestConf, matchReason: bestReason, proposedStatus, discrepancy };
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "upload" | "map" | "review" | "applying" | "done";

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepBar({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload",   label: "Upload" },
    { key: "map",      label: "Map Columns" },
    { key: "review",   label: "Review Matches" },
    { key: "applying", label: "Apply" },
  ];
  const active = steps.findIndex((s) => s.key === step || (step === "done" && s.key === "applying"));
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const done = i < active || step === "done";
        const isActive = i === active && step !== "done";
        return (
          <div key={s.key} className="flex items-center">
            <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-geist font-semibold",
              done ? "text-icm-green" : isActive ? "text-icm-accent" : "text-icm-text-faint")}>
              <span className={cn("w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center",
                done ? "bg-icm-green text-white" : isActive ? "bg-icm-accent text-white" : "bg-icm-border text-icm-text-faint")}>
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

const CONF_BADGE: Record<string, string> = {
  exact:    "bg-icm-green-soft text-icm-green ring-icm-green/20",
  strong:   "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
  weak:     "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
  none:     "bg-icm-red-soft text-icm-red ring-icm-red/20",
};

const STATUS_BADGE: Record<MatchStatus, string> = {
  paid:      "bg-icm-green-soft text-icm-green",
  denied:    "bg-icm-red-soft text-icm-red",
  adjusted:  "bg-icm-amber-soft text-icm-amber",
  partial:   "bg-icm-amber-soft text-icm-amber",
  unmatched: "bg-icm-bg text-icm-text-faint",
};

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  claims: BillingRecord[];
}

export function RemittanceReconciliation({ claims }: Props) {
  const { userProfile } = useAuth();

  const [step, setStep]           = useState<Step>("upload");
  const [dragOver, setDragOver]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName]   = useState("");
  const [headers, setHeaders]     = useState<string[]>([]);
  const [rawRows, setRawRows]     = useState<Record<string, unknown>[]>([]);
  const [colMap, setColMap]       = useState<Record<string, string | null>>({});
  const [matches, setMatches]     = useState<MatchResult[]>([]);
  const [applying, setApplying]   = useState(false);
  const [applyResult, setApplyResult] = useState<{ updated: number; skipped: number } | null>(null);
  const [checkNum, setCheckNum]   = useState("");
  const [payDate, setPayDate]     = useState("");
  const [overrides, setOverrides] = useState<Record<number, MatchStatus>>({});

  const fileRef = useRef<HTMLInputElement>(null);

  // ── File parsing ─────────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = read(data, { type: "array", cellDates: false });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        if (json.length === 0) { toast.error("File appears to be empty."); return; }
        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRawRows(json);
        setColMap(autoMapRemit(hdrs));
        setFileName(file.name);
        setStep("map");
        toast.info(`File loaded — ${json.length.toLocaleString()} rows detected.`);
      } catch {
        toast.error("Could not read file. Please use .xlsx, .xls, or .csv.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFile = useCallback((file: File) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (![".xlsx", ".xls", ".csv"].includes(ext)) {
      setUploadError("Unsupported file type. Use .xlsx, .xls, or .csv.");
      return;
    }
    setUploadError(null);
    processFile(file);
  }, [processFile]);

  // ── Build remit lines from mapped rows ────────────────────────────────────

  function buildLines(): RemitLine[] {
    return rawRows.map((row, i) => {
      const get = (key: string): string => {
        const col = Object.entries(colMap).find(([, v]) => v === key)?.[0];
        return col ? String(row[col] ?? "").trim() : "";
      };
      return {
        rowIdx: i,
        raw: row,
        icn:               get("icn") || undefined,
        member_name:       get("member_name") || undefined,
        member_id:         get("member_id") || undefined,
        date_of_service:   get("date_of_service") || undefined,
        service_code:      get("service_code") || undefined,
        billed_amount:     parseAmt(get("billed_amount")),
        paid_amount:       parseAmt(get("paid_amount")),
        adjustment_amount: parseAmt(get("adjustment_amount")),
        denial_code:       get("denial_code") || undefined,
        denial_reason:     get("denial_reason") || undefined,
        check_number:      get("check_number") || undefined,
        payment_date:      get("payment_date") || undefined,
      };
    }).filter((l) => l.member_name || l.icn || l.date_of_service);
  }

  function buildAndMatch() {
    const lines = buildLines();
    if (lines.length === 0) { toast.error("No valid remittance rows found. Check your column mapping."); return; }
    const results = matchRemitToClaims(lines, claims);
    setMatches(results);
    setOverrides({});
    setStep("review");
  }

  // ── Apply reconciliation ──────────────────────────────────────────────────

  async function applyReconciliation() {
    setStep("applying");
    setApplying(true);
    let updated = 0, skipped = 0;

    for (const m of matches) {
      const status = overrides[m.remitLine.rowIdx] ?? m.proposedStatus;
      if (!m.claim || status === "unmatched") { skipped++; continue; }

      const denialText = m.remitLine.denial_reason ?? m.remitLine.denial_code ?? null;
      const newBillingStatus =
        status === "paid"     ? "accepted" as const :
        status === "denied"   ? "denied"   as const :
        status === "adjusted" ? "adjusted" as const :
        "accepted" as const;

      try {
        await updateBillingRecord(m.claim.id, {
          billing_status:      newBillingStatus,
          remittance_received: true,
          remittance_date:     payDate || m.remitLine.payment_date || new Date().toISOString().slice(0, 10),
          amount_paid:         m.remitLine.paid_amount ?? null,
          adjustment_amount:   m.remitLine.adjustment_amount ?? null,
          denial_reason:       denialText,
        } as any);
        updated++;
      } catch {
        skipped++;
      }
    }

    setApplyResult({ updated, skipped });
    setApplying(false);
    setStep("done");
    toast.success(`Reconciliation applied — ${updated} claims updated.`);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const summaryStats = {
    total:     matches.length,
    matched:   matches.filter((m) => m.matchConfidence !== "none").length,
    paid:      matches.filter((m) => (overrides[m.remitLine.rowIdx] ?? m.proposedStatus) === "paid").length,
    denied:    matches.filter((m) => (overrides[m.remitLine.rowIdx] ?? m.proposedStatus) === "denied").length,
    adjusted:  matches.filter((m) => (overrides[m.remitLine.rowIdx] ?? m.proposedStatus) === "adjusted").length,
    unmatched: matches.filter((m) => m.matchConfidence === "none").length,
    totalPaid: matches.reduce((sum, m) => sum + (m.remitLine.paid_amount ?? 0), 0),
    discrepancies: matches.filter((m) => m.discrepancy).length,
  };

  // ── Submitted claims not in remittance ────────────────────────────────────
  const matchedClaimIds = new Set(matches.filter((m) => m.claim).map((m) => m.claim!.id));
  const outstandingClaims = claims.filter(
    (c) => (c.billing_status === "submitted" || c.billing_status === "accepted") && !matchedClaimIds.has(c.id)
  );

  // ── Template download ─────────────────────────────────────────────────────
  function downloadTemplate() {
    const hdrs = REMAP_FIELDS.map((f) => f.label).join(",");
    const ex   = ["ICN-001","John Smith","MA-12345","2026-05-15","T1017","100.00","95.00","5.00","","","1234","2026-05-28"].join(",");
    const blob = new Blob([`${hdrs}\n${ex}`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "remittance-template.csv";
    a.click();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header strip */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-manrope font-bold text-[15px] text-icm-text flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-icm-accent" />
            Remittance Reconciliation
          </h2>
          <p className="text-[12px] text-icm-text-dim font-geist mt-0.5">
            Upload payer remittance (835 ERA, CSV, or Excel) to match and update submitted claims automatically.
          </p>
        </div>
        {(step === "review" || step === "done") && (
          <button
            onClick={() => { setStep("upload"); setMatches([]); setFileName(""); }}
            className="h-8 px-3 rounded-lg border border-icm-border text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> New Upload
          </button>
        )}
      </div>

      {/* Step bar */}
      <div className="px-1">
        <StepBar step={step} />
      </div>

      {/* ── UPLOAD ─────────────────────────────────────────────────────────── */}
      {step === "upload" && (
        <div className="space-y-4 max-w-2xl">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
              uploadError ? "border-icm-red bg-icm-red-soft/30" :
              dragOver ? "border-icm-accent bg-icm-accent-soft scale-[1.01]" :
              "border-icm-border hover:border-icm-accent/40 hover:bg-icm-bg"
            )}
          >
            <div className={cn("mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-3", dragOver ? "bg-icm-accent/10" : "bg-icm-bg border border-icm-border")}>
              <FileSpreadsheet className={cn("w-7 h-7", dragOver ? "text-icm-accent" : "text-icm-text-dim")} />
            </div>
            <p className="font-semibold text-icm-text text-[14px]">{dragOver ? "Drop file here" : "Drag & drop your remittance file"}</p>
            <p className="text-[12.5px] text-icm-text-dim mt-1">or click to browse</p>
            <p className="text-[11px] text-icm-text-faint mt-2">
              Accepts 835 ERA · CSV · Excel (.xlsx / .xls) · Any payer format
            </p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {uploadError && (
            <div className="flex items-start gap-2 text-icm-red text-[12.5px] bg-icm-red-soft border border-icm-red/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {uploadError}
            </div>
          )}

          <div className="rounded-xl border border-icm-border bg-icm-bg/60 p-4 space-y-2">
            <p className="text-[12px] font-semibold text-icm-text flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-icm-accent" /> Supported formats
            </p>
            <ul className="text-[12px] text-icm-text-dim space-y-1 ml-5 list-disc">
              <li><strong>835 ERA</strong> — standard EDI remittance from Medicaid clearinghouses</li>
              <li><strong>Payer CSV / Excel</strong> — download from your payer portal and upload directly</li>
              <li>You'll map your column headers to our fields in the next step</li>
              <li>Matching uses ICN, member name, date of service, and service code</li>
            </ul>
            <button onClick={downloadTemplate} className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-icm-accent hover:underline">
              <Download className="w-3.5 h-3.5" /> Download remittance CSV template
            </button>
          </div>

          {/* Outstanding submitted claims summary */}
          {outstandingClaims.length > 0 && (
            <div className="rounded-xl border border-icm-amber/30 bg-icm-amber-soft p-4">
              <p className="text-[12.5px] font-semibold text-icm-text">
                {outstandingClaims.length} submitted claim{outstandingClaims.length !== 1 ? "s" : ""} awaiting remittance
              </p>
              <p className="text-[11.5px] text-icm-text-dim mt-0.5">
                Total outstanding: ${outstandingClaims.reduce((s, c) => s + c.total_amount, 0).toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── MAP COLUMNS ────────────────────────────────────────────────────── */}
      {step === "map" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-[13px] text-icm-text font-medium">
              <span className="text-icm-text-dim">File:</span> {fileName}{" "}
              <span className="ml-2 px-2 py-0.5 rounded-full bg-icm-accent/10 text-icm-accent text-[11px] font-semibold">
                {rawRows.length.toLocaleString()} rows
              </span>
            </p>
            <div className="flex items-center gap-3 text-[12px]">
              <span className="flex items-center gap-1 text-icm-green font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {Object.values(colMap).filter(Boolean).length} auto-matched
              </span>
              <span className="flex items-center gap-1 text-icm-text-dim font-medium">
                <XCircle className="w-3.5 h-3.5" />
                {Object.values(colMap).filter((v) => !v).length} unmapped
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-icm-border overflow-hidden">
            <div className="grid grid-cols-[1fr_28px_1fr_80px] bg-icm-bg/80 px-4 py-2.5 border-b border-icm-border text-[10.5px] font-mono font-bold text-icm-text-faint uppercase tracking-wide">
              <span>File Column → Sample</span><span /><span>Remittance Field</span><span className="text-right">Status</span>
            </div>
            <div className="divide-y divide-icm-border/50 max-h-[380px] overflow-y-auto">
              {headers.map((h) => {
                const mapped = colMap[h];
                const sample = String(rawRows[0]?.[h] ?? "").slice(0, 40);
                return (
                  <div key={h} className="grid grid-cols-[1fr_28px_1fr_80px] items-center px-4 py-2.5 hover:bg-icm-bg/40">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-geist font-medium text-icm-text truncate">{h}</p>
                      {sample && <p className="text-[11px] text-icm-text-faint font-mono truncate mt-0.5">e.g. {sample}</p>}
                    </div>
                    <div className="flex justify-center">
                      <ChevronRight className="w-3.5 h-3.5 text-icm-text-faint" />
                    </div>
                    <select
                      value={mapped ?? ""}
                      onChange={(e) => setColMap((m) => ({ ...m, [h]: e.target.value || null }))}
                      className="h-8 px-2 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-accent"
                    >
                      <option value="">— Skip —</option>
                      {REMAP_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                    <div className="flex justify-end">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1",
                        mapped ? "bg-icm-green-soft text-icm-green ring-icm-green/20" : "bg-icm-bg text-icm-text-faint ring-icm-border")}>
                        {mapped ? "Mapped" : "Skip"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Optional overrides */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1.5 block">
                Global Check / EFT Number (optional)
              </label>
              <input value={checkNum} onChange={(e) => setCheckNum(e.target.value)} placeholder="e.g. 00123456"
                className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] font-mono text-icm-text focus:outline-none focus:border-icm-accent" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-icm-text-faint mb-1.5 block">
                Payment Date (optional)
              </label>
              <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-icm-border bg-white text-[12.5px] font-geist text-icm-text focus:outline-none focus:border-icm-accent" />
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEW ─────────────────────────────────────────────────────────── */}
      {step === "review" && matches.length > 0 && (
        <div className="space-y-4">
          {/* Summary chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {[
              { label: "Total Lines",    value: summaryStats.total,                    cls: "text-icm-text" },
              { label: "Matched",        value: summaryStats.matched,                  cls: "text-icm-green" },
              { label: "Paid",           value: summaryStats.paid,                     cls: "text-icm-green" },
              { label: "Denied",         value: summaryStats.denied,                   cls: "text-icm-red" },
              { label: "Adjusted",       value: summaryStats.adjusted,                 cls: "text-icm-amber" },
              { label: "Unmatched",      value: summaryStats.unmatched,                cls: "text-icm-text-dim" },
            ].map((chip, i) => (
              <div key={i} className="rounded-lg border border-icm-border bg-icm-panel px-3 py-2.5">
                <p className={cn("text-[17px] font-manrope font-bold", chip.cls)}>{chip.value}</p>
                <p className="text-[10.5px] font-geist text-icm-text-faint mt-0.5">{chip.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-[12.5px] font-geist text-icm-text">
              Total paid:{" "}
              <span className="font-bold text-icm-green">
                ${summaryStats.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              {summaryStats.discrepancies > 0 && (
                <span className="ml-3 text-icm-amber font-semibold">
                  ⚠ {summaryStats.discrepancies} discrepanc{summaryStats.discrepancies > 1 ? "ies" : "y"} found
                </span>
              )}
            </p>
          </div>

          {/* Matches table */}
          <div className="rounded-xl border border-icm-border overflow-hidden">
            <div className="bg-icm-bg/80 grid grid-cols-[1.6fr_1fr_80px_80px_80px_100px_90px] px-4 py-2.5 border-b border-icm-border text-[10.5px] font-mono font-bold text-icm-text-faint uppercase tracking-wide gap-2">
              <span>Remittance Line</span>
              <span>Matched Claim</span>
              <span>Billed</span>
              <span>Paid</span>
              <span>Adj</span>
              <span>Confidence</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-icm-border/50 max-h-[480px] overflow-y-auto">
              {matches.map((m, idx) => {
                const status = overrides[m.remitLine.rowIdx] ?? m.proposedStatus;
                return (
                  <div key={idx} className={cn(
                    "grid grid-cols-[1.6fr_1fr_80px_80px_80px_100px_90px] px-4 py-3 gap-2 items-start text-[12px] font-geist hover:bg-icm-bg/40 transition-colors",
                    m.discrepancy && "bg-icm-amber-soft/20"
                  )}>
                    {/* Remittance line info */}
                    <div className="min-w-0">
                      <p className="font-semibold text-icm-text truncate">{m.remitLine.member_name ?? "—"}</p>
                      <p className="text-[10.5px] font-mono text-icm-text-faint mt-0.5">
                        {m.remitLine.date_of_service ?? "—"} · {m.remitLine.service_code ?? "—"}
                      </p>
                      {m.remitLine.denial_code && (
                        <p className="text-[10.5px] text-icm-red mt-0.5">{m.remitLine.denial_code}{m.remitLine.denial_reason ? ` — ${m.remitLine.denial_reason.slice(0, 30)}` : ""}</p>
                      )}
                      {m.discrepancy && (
                        <p className="text-[10.5px] text-icm-amber mt-0.5">⚠ {m.discrepancy}</p>
                      )}
                    </div>

                    {/* Matched claim */}
                    <div className="min-w-0">
                      {m.claim ? (
                        <>
                          <p className="text-icm-text truncate text-[11.5px]">{m.claim.individual_name}</p>
                          <p className="text-[10.5px] font-mono text-icm-text-faint mt-0.5">
                            {m.matchReason}
                          </p>
                        </>
                      ) : (
                        <p className="text-icm-text-faint italic text-[11.5px]">No match</p>
                      )}
                    </div>

                    {/* Amounts */}
                    <div className="text-[11.5px] font-mono text-icm-text-dim">
                      {m.remitLine.billed_amount != null ? `$${m.remitLine.billed_amount.toFixed(2)}` : "—"}
                    </div>
                    <div className="text-[11.5px] font-mono font-semibold text-icm-green">
                      {m.remitLine.paid_amount != null ? `$${m.remitLine.paid_amount.toFixed(2)}` : "—"}
                    </div>
                    <div className="text-[11.5px] font-mono text-icm-amber">
                      {m.remitLine.adjustment_amount != null ? `$${m.remitLine.adjustment_amount.toFixed(2)}` : "—"}
                    </div>

                    {/* Confidence badge */}
                    <div>
                      <span className={cn("px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold ring-1", CONF_BADGE[m.matchConfidence])}>
                        {m.matchConfidence === "none" ? "No match" : m.matchConfidence}
                      </span>
                    </div>

                    {/* Status override */}
                    <div>
                      {m.claim ? (
                        <select
                          value={status}
                          onChange={(e) => setOverrides((o) => ({ ...o, [m.remitLine.rowIdx]: e.target.value as MatchStatus }))}
                          className={cn(
                            "h-7 px-1.5 rounded-md border text-[11px] font-geist font-semibold appearance-none focus:outline-none",
                            STATUS_BADGE[status],
                            "border-current/30"
                          )}
                        >
                          <option value="paid">Paid</option>
                          <option value="denied">Denied</option>
                          <option value="adjusted">Adjusted</option>
                          <option value="partial">Partial</option>
                        </select>
                      ) : (
                        <span className={cn("px-1.5 py-0.5 rounded-md text-[11px] font-semibold", STATUS_BADGE.unmatched)}>
                          Unmatched
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Outstanding claims (submitted but not in remittance) */}
          {outstandingClaims.length > 0 && (
            <div className="rounded-xl border border-icm-border bg-icm-bg/40 p-4">
              <p className="text-[12.5px] font-semibold text-icm-text mb-2">
                {outstandingClaims.length} submitted claim{outstandingClaims.length !== 1 ? "s" : ""} not in this remittance
              </p>
              <p className="text-[11.5px] text-icm-text-dim mb-3">
                These claims were submitted but don't appear in this remittance file. They may be in a future payment or still processing.
              </p>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                {outstandingClaims.slice(0, 10).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 text-[11.5px] font-geist">
                    <span className="text-icm-text font-medium w-32 truncate">{c.individual_name}</span>
                    <span className="font-mono text-icm-text-dim">{c.date_of_service}</span>
                    <span className="font-mono text-icm-accent">{c.service_code}</span>
                    <span className="font-mono text-icm-text ml-auto">${c.total_amount.toFixed(2)}</span>
                  </div>
                ))}
                {outstandingClaims.length > 10 && (
                  <p className="text-[11px] text-icm-text-faint italic">+{outstandingClaims.length - 10} more</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── APPLYING ───────────────────────────────────────────────────────── */}
      {step === "applying" && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-10 h-10 text-icm-accent animate-spin" />
          <p className="font-semibold text-icm-text text-[15px]">Applying reconciliation…</p>
          <p className="text-[12px] text-icm-text-dim">Updating claim statuses and remittance data in Firestore</p>
        </div>
      )}

      {/* ── DONE ───────────────────────────────────────────────────────────── */}
      {step === "done" && applyResult && (
        <div className="flex flex-col items-center py-12 gap-5">
          <div className="w-16 h-16 bg-icm-green-soft rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-icm-green" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-[18px] font-manrope font-bold text-icm-text">Reconciliation Complete</h3>
            <p className="text-[13px] text-icm-text-dim">{applyResult.updated} claim{applyResult.updated !== 1 ? "s" : ""} updated with remittance data.</p>
            {applyResult.skipped > 0 && <p className="text-[12px] text-icm-amber">{applyResult.skipped} rows skipped (unmatched or errors).</p>}
            <p className="text-[12px] text-icm-text-dim mt-2">
              Claims are now visible in the <strong>Submitted</strong> and <strong>Denied</strong> tabs with updated statuses.
            </p>
          </div>
          <button onClick={() => { setStep("upload"); setMatches([]); setApplyResult(null); setFileName(""); }}
            className="h-9 px-5 rounded-xl border border-icm-border text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Upload Another File
          </button>
        </div>
      )}

      {/* Footer nav */}
      {step !== "applying" && step !== "done" && (
        <div className="flex items-center justify-between pt-2 border-t border-icm-border">
          <button
            onClick={() => {
              if (step === "upload") return;
              if (step === "map") setStep("upload");
              if (step === "review") setStep("map");
            }}
            className={cn(
              "h-9 px-4 rounded-xl border border-icm-border text-[12px] font-geist font-semibold text-icm-text-dim hover:text-icm-text flex items-center gap-1.5",
              step === "upload" && "invisible"
            )}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="flex items-center gap-2">
            {step === "upload" && (
              <button onClick={() => fileRef.current?.click()}
                className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Select File
              </button>
            )}
            {step === "map" && (
              <button onClick={buildAndMatch}
                className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 flex items-center gap-1.5">
                Match Against Claims <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            {step === "review" && (
              <button onClick={applyReconciliation}
                disabled={summaryStats.matched === 0}
                className="h-9 px-4 rounded-xl bg-icm-green text-white text-[12px] font-geist font-semibold hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Apply Reconciliation ({summaryStats.matched} claims) →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
