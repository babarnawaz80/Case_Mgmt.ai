/**
 * IDD Billing.AI Integration Service
 * Handles: outbound claim submission, 837P export generation, 835 remittance parsing
 */

import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── Types ─────────────────────────────────────────────────────────────────

export interface ClaimPayload {
  claim_id: string;
  individual_id: string;
  individual_name: string;
  individual_medicaid_id?: string;
  date_of_service: string;
  service_code: string;
  service_description: string;
  billing_unit_type: "15_min" | "hourly" | "daily" | "monthly" | "milestone";
  units: number;
  rate_per_unit: number;
  total_amount: number;
  authorization_number: string;
  payer_id: string;
  payer_name: string;
  rendering_provider_npi?: string;
  billing_provider_npi?: string;
  place_of_service?: string;
  diagnosis_codes?: string[];
  case_manager_name: string;
  note_type: string;
  source_note_id: string;
  validation_status: string;
}

export interface BatchPayload {
  batch_id: string;
  submitted_by: string;
  submitted_at: string;
  org_id: string;
  org_name: string;
  claims: ClaimPayload[];
}

export interface SubmissionResult {
  success: boolean;
  batch_id?: string;
  iddbilling_batch_id?: string;
  claims?: Array<{ claim_id: string; id: string; status: string }>;
  error?: string;
}

export interface RemittanceMatchResult {
  matched: number;
  accepted: number;
  denied: number;
  adjusted: number;
  unmatched: number;
  totalPaid: number;
  records: Array<{
    claimId: string;
    status: "accepted" | "denied" | "adjusted" | "unmatched";
    amountPaid: number;
    denialReason?: string;
    adjustmentAmount?: number;
  }>;
}

// ── Batch Number Generator ─────────────────────────────────────────────────

export async function generateBatchNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  // Simple sequential: read last batch number from org doc or use timestamp
  const key = `BATCH-${year}-${String(Date.now()).slice(-4)}`;
  return key;
}

// ── IDD Billing.AI API Submission ─────────────────────────────────────────

export async function getIddApiKey(orgId: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, "organizations", orgId));
    if (!snap.exists()) return null;
    return snap.data()?.iddBillingApiKey || snap.data()?.billing?.iddBillingApiKey || null;
  } catch {
    return null;
  }
}

export async function submitToIddBilling(
  payload: BatchPayload,
  orgId: string,
): Promise<SubmissionResult> {
  const apiKey = await getIddApiKey(orgId);

  if (!apiKey) {
    return { success: false, error: "IDD Billing.AI API key not configured. Please configure it in Admin Settings → Billing Configuration." };
  }

  try {
    const response = await fetch("https://api.iddbilling.ai/v1/claims/batch", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Source": "CaseManagement.AI",
        "X-Org-ID": orgId,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { success: false, error: `IDD Billing.AI returned error ${response.status}: ${errText}` };
    }

    const data = await response.json();
    return {
      success: true,
      batch_id: payload.batch_id,
      iddbilling_batch_id: data.batch_id || data.id,
      claims: data.claims || [],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Network error connecting to IDD Billing.AI. Please try again.",
    };
  }
}

// ── Test Connection ────────────────────────────────────────────────────────

export async function testIddConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("https://api.iddbilling.ai/v1/ping", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "X-Source": "CaseManagement.AI",
      },
    });
    if (response.ok) {
      return { success: true, message: "Connected to IDD Billing.AI successfully" };
    }
    return { success: false, message: `Connection failed: HTTP ${response.status}` };
  } catch {
    return { success: false, message: "Cannot reach IDD Billing.AI. Check API key and network." };
  }
}

// ── 837P EDI File Generator ────────────────────────────────────────────────

export interface OrgBillingInfo {
  npi: string;
  taxId: string;
  billingProviderNpi?: string;
  name: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  submitterId?: string;
  isaSenderId?: string;
}

export function generate837P(
  claims: ClaimPayload[],
  org: OrgBillingInfo,
  batchId: string,
): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "");
  const isaControlNum = String(Date.now()).slice(-9).padStart(9, "0");
  const gsControlNum = String(Date.now()).slice(-4);

  const lines: string[] = [];

  // ISA — Interchange Control Header
  lines.push(`ISA*00*          *00*          *ZZ*${(org.submitterId || org.npi || "SENDER").padEnd(15)}*ZZ*IDDBILLING     *${dateStr.slice(2)}*${timeStr}*:*00501*${isaControlNum}*0*P*:`);

  // GS — Functional Group Header
  lines.push(`GS*HC*${org.submitterId || org.npi}*IDDBILLING*${dateStr}*${timeStr}*${gsControlNum}*X*005010X222A1`);

  // ST — Transaction Set Header
  lines.push(`ST*837*0001*005010X222A1`);

  // BPR — Financial Information (placeholder)
  lines.push(`BPR*I*${claims.reduce((s, c) => s + c.total_amount, 0).toFixed(2)}*C*ACH*CTX*01*9876543210*DA*123456789*1512345678**01*9876543210*DA*123456789*${dateStr}`);

  // NM1 — Submitter name
  lines.push(`NM1*41*2*${org.name.slice(0, 60).toUpperCase()}*****46*${org.submitterId || org.npi}`);

  // NM1 — Receiver
  lines.push(`NM1*40*2*IDD BILLING AI*****46*IDDBILLING`);

  let claimSeq = 1;
  for (const claim of claims) {
    // CLM — Claim Information
    lines.push(`CLM*${claim.claim_id}*${claim.total_amount.toFixed(2)}***11:B:1*Y*A*Y*I`);

    // DTP — Date of service
    const dosFormatted = claim.date_of_service.replace(/-/g, "");
    lines.push(`DTP*472*D8*${dosFormatted}`);

    // REF — Authorization number
    if (claim.authorization_number) {
      lines.push(`REF*G1*${claim.authorization_number}`);
    }

    // NM1 — Subscriber (patient)
    lines.push(`NM1*IL*1*${claim.individual_name.split(" ").pop() || "UNKNOWN"}*${claim.individual_name.split(" ").slice(0, -1).join(" ") || "PATIENT"}****MI*${claim.individual_medicaid_id || "UNKNOWN"}`);

    // NM1 — Rendering provider
    if (claim.rendering_provider_npi) {
      lines.push(`NM1*82*1*${claim.case_manager_name.split(" ").pop() || ""}*${claim.case_manager_name.split(" ")[0] || ""}****XX*${claim.rendering_provider_npi}`);
    }

    // SV1 — Professional Service
    const units = claim.billing_unit_type === "15_min" ? claim.units : claim.units;
    lines.push(`SV1*HC:${claim.service_code}*${claim.total_amount.toFixed(2)}*UN*${units}***1`);

    // Diagnosis codes
    if (claim.diagnosis_codes?.length) {
      lines.push(`HI*ABK:${claim.diagnosis_codes[0]}`);
    }

    claimSeq++;
  }

  // SE — Transaction Set Trailer
  const segCount = lines.length - 1; // approximate
  lines.push(`SE*${segCount}*0001`);

  // GE — Functional Group Trailer
  lines.push(`GE*1*${gsControlNum}`);

  // IEA — Interchange Control Trailer
  lines.push(`IEA*1*${isaControlNum}`);

  return lines.join("\n");
}

// ── 835 Remittance Parser ─────────────────────────────────────────────────

export interface RemittanceRecord {
  claimId?: string;
  authNumber?: string;
  individual?: string;
  dateOfService?: string;
  billedAmount?: number;
  paidAmount?: number;
  adjustmentAmount?: number;
  adjustmentCode?: string;
  denialReason?: string;
  status: "paid" | "denied" | "adjusted";
}

export function parse835File(content: string): RemittanceRecord[] {
  const records: RemittanceRecord[] = [];

  // Basic 835 parser — extract CLP (claim payment) segments
  const segments = content.split(/[~\n]/).map(s => s.trim()).filter(Boolean);

  let currentRecord: Partial<RemittanceRecord> | null = null;

  for (const seg of segments) {
    const parts = seg.split("*");
    const segId = parts[0];

    switch (segId) {
      case "CLP": // Claim payment
        if (currentRecord && (currentRecord.paidAmount !== undefined)) {
          records.push(currentRecord as RemittanceRecord);
        }
        currentRecord = {
          claimId: parts[1],
          status: "paid",
          billedAmount: parseFloat(parts[3]) || 0,
          paidAmount: parseFloat(parts[4]) || 0,
        };
        if (currentRecord.paidAmount === 0) currentRecord.status = "denied";
        else if (currentRecord.paidAmount < (currentRecord.billedAmount || 0)) currentRecord.status = "adjusted";
        break;

      case "CAS": // Adjustment
        if (currentRecord) {
          currentRecord.adjustmentCode = parts[2];
          const adjAmt = parseFloat(parts[3]) || 0;
          currentRecord.adjustmentAmount = adjAmt;
          if (adjAmt > 0 && parts[1] === "CO") {
            currentRecord.status = "adjusted";
          }
          if (parts[1] === "CO" && parseFloat(parts[4] || "0") === (currentRecord.billedAmount || 0)) {
            currentRecord.status = "denied";
            currentRecord.denialReason = `${parts[1]}-${parts[2]}: Claim denied`;
          }
        }
        break;

      case "NM1":
        if (currentRecord && parts[1] === "QC") {
          currentRecord.individual = `${parts[4] || ""} ${parts[3] || ""}`.trim();
        }
        break;

      case "DTM":
        if (currentRecord && parts[1] === "472") {
          const rawDate = parts[2];
          if (rawDate?.length === 8) {
            currentRecord.dateOfService = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
          }
        }
        break;

      case "REF":
        if (currentRecord && parts[1] === "G1") {
          currentRecord.authNumber = parts[2];
        }
        break;
    }
  }

  if (currentRecord && (currentRecord.paidAmount !== undefined)) {
    records.push(currentRecord as RemittanceRecord);
  }

  return records;
}

// ── Create Billing Batch in Firestore ─────────────────────────────────────

export async function createBillingBatch(
  orgId: string,
  userId: string,
  recordIds: string[],
  totalAmount: number,
  exportFileUrl: string = "",
  submittedToIdd: boolean = false,
  iddBatchId: string | null = null,
): Promise<string> {
  const batchNumber = await generateBatchNumber(orgId);
  const ref = await addDoc(collection(db, "billing_batches"), {
    org_id: orgId,
    batch_number: batchNumber,
    created_by: userId,
    created_at: serverTimestamp(),
    record_count: recordIds.length,
    total_amount: totalAmount,
    record_ids: recordIds,
    export_format: "837P",
    export_file_url: exportFileUrl,
    submitted_to_iddbilling: submittedToIdd,
    submitted_at: submittedToIdd ? serverTimestamp() : null,
    iddbilling_batch_id: iddBatchId,
    status: submittedToIdd ? "submitted" : "exported",
  });
  return ref.id;
}
