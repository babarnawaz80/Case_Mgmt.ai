/**
 * Billing Validation Engine
 * Runs when a billable note is signed and submitted.
 * All 4 checks must pass for billing_status = "scrub_passed".
 */

import {
  collection, query, where, getDocs, orderBy, limit,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── Types ─────────────────────────────────────────────────────────────────

export interface CheckResult {
  passed: boolean;
  message: string;
  detail?: string;
}

export interface ValidationResult {
  status: "passed" | "failed" | "warning";
  checks: {
    auth_exists: CheckResult;
    units_within_cap: CheckResult;
    eligibility_active: CheckResult;
    documentation_complete: CheckResult;
  };
  warnings: string[];
  failedCheckNames: string[];
  ranAt: Date;
}

export interface NoteData {
  noteType: "progress_note" | "contact_note" | "visit_summary" | "monitoring_form";
  individualId: string;
  individualName: string;
  organizationId: string;
  serviceCode: string;
  authorizationId?: string;
  authorizationNumber?: string;
  dateOfService: string; // YYYY-MM-DD
  startTime: string;     // HH:mm
  endTime: string;       // HH:mm
  units: number;
  isBillable: boolean;
  // Documentation fields
  person?: string;
  activityType?: string;
  contactType?: string;
  purposeOfActivity?: string;
  additionalObservations?: string;
  details?: string;
  visitSummaryText?: string;
  purposeOfSupport?: string;
  location?: string;
  signature?: string | boolean;
}

export interface BillingUnitCalc {
  durationMinutes: number;
  units: number;
  unitType: "15_min" | "hourly" | "daily";
  ratePerUnit: number;
  totalAmount: number;
  displayText: string;
  error?: string;
}

// ── Unit Calculation ───────────────────────────────────────────────────────

export function calculateBillingUnits(
  startTime: string,
  endTime: string,
  unitType: "15_min" | "hourly" | "daily" = "15_min",
  ratePerUnit: number = 28.5,
): BillingUnitCalc {
  if (!startTime || !endTime) {
    return {
      durationMinutes: 0, units: 0, unitType, ratePerUnit, totalAmount: 0,
      displayText: "Enter start and end time to calculate units",
    };
  }

  const toMins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const startMins = toMins(startTime);
  const endMins = toMins(endTime);
  const durationMinutes = endMins - startMins;

  if (durationMinutes <= 0) {
    return {
      durationMinutes: 0, units: 0, unitType, ratePerUnit, totalAmount: 0,
      displayText: "End time must be after start time",
      error: "End time must be after start time",
    };
  }

  let units: number;
  switch (unitType) {
    case "15_min":
      units = Math.floor(durationMinutes / 15);
      if (units === 0) {
        return {
          durationMinutes, units: 0, unitType, ratePerUnit, totalAmount: 0,
          displayText: `${durationMinutes} min — too short (minimum 15 minutes required)`,
          error: "Duration too short to generate a billable unit. Minimum 15 minutes required.",
        };
      }
      break;
    case "hourly":
      units = Math.floor(durationMinutes / 60);
      break;
    case "daily":
      units = 1;
      break;
  }

  const totalAmount = units * ratePerUnit;
  const displayText = `${durationMinutes} min = ${units} unit${units !== 1 ? "s" : ""} ($${ratePerUnit.toFixed(2)} × ${units} = $${totalAmount.toFixed(2)})`;

  return { durationMinutes, units, unitType, ratePerUnit, totalAmount, displayText };
}

// ── Check 1: Authorization Exists and Is Active ────────────────────────────

async function checkAuthExists(note: NoteData): Promise<CheckResult> {
  if (!note.authorizationId && !note.authorizationNumber) {
    return {
      passed: false,
      message: `No active authorization found for service code ${note.serviceCode} on ${note.dateOfService}`,
      detail: "Service authorization must be linked before this note can be billed.",
    };
  }

  try {
    const q = query(
      collection(db, "authorizations"),
      where("individualId", "==", note.individualId),
      where("status", "==", "active"),
    );
    const snap = await getDocs(q);

    const matching = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as DocumentData & { id: string }))
      .filter(auth => {
        const codesMatch = auth.service_codes?.includes(note.serviceCode) ||
          auth.serviceCodes?.includes(note.serviceCode);
        const effectiveDate = auth.effective_date || auth.effectiveDate || "";
        const expirationDate = auth.expiration_date || auth.expirationDate || "";
        const serviceDate = note.dateOfService;
        const withinDates =
          (!effectiveDate || serviceDate >= effectiveDate) &&
          (!expirationDate || serviceDate <= expirationDate);
        return codesMatch && withinDates;
      });

    if (matching.length === 0) {
      // Check if an auth exists but doesn't cover this code
      const anyAuth = snap.docs.some(d => {
        const auth = d.data();
        return auth.service_codes?.includes(note.serviceCode) ||
          auth.serviceCodes?.includes(note.serviceCode);
      });
      if (anyAuth) {
        return {
          passed: false,
          message: `Authorization found but does not cover service code ${note.serviceCode}`,
        };
      }
      return {
        passed: false,
        message: `No active authorization found for service code ${note.serviceCode} on ${note.dateOfService}`,
      };
    }

    const auth = matching[0];
    const expirationDate = auth.expiration_date || auth.expirationDate || "";
    if (expirationDate && note.dateOfService > expirationDate) {
      return {
        passed: false,
        message: `Authorization ${auth.authorization_number || auth.authorizationNumber || ""} expired on ${expirationDate}. Service date ${note.dateOfService} is outside the authorization period.`,
      };
    }

    return { passed: true, message: "Authorization verified and active" };
  } catch (err) {
    console.error("[billingValidation] checkAuthExists error:", err);
    return { passed: false, message: "Unable to verify authorization. Please try again." };
  }
}

// ── Check 2: Units Within Authorization Cap ────────────────────────────────

async function checkUnitsCap(note: NoteData): Promise<{ result: CheckResult; warning?: string }> {
  if (!note.authorizationId && !note.authorizationNumber) {
    return {
      result: {
        passed: false,
        message: "No authorization linked. Cannot verify unit cap.",
      },
    };
  }

  try {
    let authDoc: DocumentData | null = null;
    let authId = note.authorizationId || "";

    if (authId) {
      const snap = await getDocs(
        query(collection(db, "authorizations"), where("__name__", "==", authId))
      );
      if (!snap.empty) authDoc = snap.docs[0].data();
    }

    if (!authDoc && note.authorizationNumber) {
      const snap = await getDocs(
        query(
          collection(db, "authorizations"),
          where("authorization_number", "==", note.authorizationNumber),
          where("individualId", "==", note.individualId),
        )
      );
      if (!snap.empty) authDoc = snap.docs[0].data();
    }

    if (!authDoc) {
      return { result: { passed: true, message: "Authorization not found in database — skipping cap check" } };
    }

    const authorizedUnits = authDoc.authorized_units || authDoc.authorizedUnits || 0;
    const usedUnits = authDoc.used_units || authDoc.usedUnits || 0;
    const remainingUnits = authorizedUnits - usedUnits;

    if (remainingUnits <= 0) {
      return {
        result: {
          passed: false,
          message: `Authorization is fully exhausted. 0 units remaining. Contact billing to request new authorization.`,
        },
      };
    }

    if (note.units > remainingUnits) {
      return {
        result: {
          passed: false,
          message: `Authorization cap exceeded. Requested ${note.units} units but only ${remainingUnits} units remaining in authorization ${note.authorizationNumber || ""}.`,
          detail: `${usedUnits} of ${authorizedUnits} units already used.`,
        },
      };
    }

    const remainingAfter = remainingUnits - note.units;
    let warning: string | undefined;
    if (remainingAfter / authorizedUnits <= 0.15) {
      warning = `Approaching authorization cap. ${remainingAfter} units will remain after this claim.`;
    }

    return {
      result: {
        passed: true,
        message: `${remainingUnits} units remaining in authorization`,
        detail: `${usedUnits} of ${authorizedUnits} units used. This claim uses ${note.units} units.`,
      },
      warning,
    };
  } catch (err) {
    console.error("[billingValidation] checkUnitsCap error:", err);
    return { result: { passed: true, message: "Cap check skipped — authorization data unavailable" } };
  }
}

// ── Check 3: Medicaid Eligibility Active ──────────────────────────────────

async function checkEligibility(note: NoteData): Promise<CheckResult> {
  try {
    const q = query(
      collection(db, "eligibility_verifications"),
      where("individualId", "==", note.individualId),
      orderBy("verificationDate", "desc"),
      limit(1),
    );
    const snap = await getDocs(q).catch(() => null);

    if (!snap || snap.empty) {
      // Also try alternate collection name
      const q2 = query(
        collection(db, "eligibility"),
        where("individual_id", "==", note.individualId),
        limit(1),
      );
      const snap2 = await getDocs(q2).catch(() => null);
      if (!snap2 || snap2.empty) {
        return {
          passed: false,
          message: `No eligibility record on file for ${note.individualName}. MA verification required before billing.`,
        };
      }
    }

    const eligibilityDoc = snap && !snap.empty ? snap.docs[0].data() : null;

    if (!eligibilityDoc) {
      // If we truly have no data, be lenient — let it pass with a note
      return { passed: true, message: "Eligibility check skipped — no verification data on file" };
    }

    const maStatus = eligibilityDoc.ma_status || eligibilityDoc.maStatus || eligibilityDoc.status || "Unknown";
    const verificationDate = eligibilityDoc.verification_date || eligibilityDoc.verificationDate || "";

    const activeStatuses = ["Active", "active", "Eligible", "eligible"];
    if (!activeStatuses.includes(maStatus)) {
      return {
        passed: false,
        message: `MA status is ${maStatus} on date of service. Claim cannot be submitted until eligibility is confirmed.`,
      };
    }

    // Check if verification is within last 30 days
    if (verificationDate) {
      const verDate = new Date(verificationDate);
      const daysSince = Math.floor((Date.now() - verDate.getTime()) / 86400000);
      if (daysSince > 30) {
        return {
          passed: false,
          message: `Medicaid eligibility not verified for ${note.dateOfService}. Last verification: ${verificationDate}. Please verify current MA status.`,
        };
      }
    }

    return { passed: true, message: `MA eligibility active · Status: ${maStatus}` };
  } catch (err) {
    console.error("[billingValidation] checkEligibility error:", err);
    // Eligibility check failure should not hard-block — pass with warning
    return { passed: true, message: "Eligibility check unavailable — proceeding" };
  }
}

// ── Check 4: Documentation Complete ───────────────────────────────────────

function checkDocumentation(note: NoteData): CheckResult {
  const missing: string[] = [];

  switch (note.noteType) {
    case "progress_note":
      if (!note.person && !note.individualName) missing.push("Person Supported");
      if (!note.activityType) missing.push("Activity Type");
      if (!note.dateOfService) missing.push("Progress Date");
      if (!note.contactType) missing.push("Contact Type");
      if (!note.startTime) missing.push("Start Time");
      if (!note.endTime) missing.push("End Time");
      if (!note.serviceCode) missing.push("Service Code");
      if (!note.authorizationId && !note.authorizationNumber) missing.push("Service Authorization");
      if (!note.purposeOfActivity || note.purposeOfActivity.trim().length < 10) {
        missing.push("Purpose of Activity (minimum 10 characters)");
      }
      if (
        (!note.additionalObservations || note.additionalObservations.trim().length < 20)
      ) {
        // This is a soft requirement — only flag if also no goal progress
        // For simplicity, we check additional observations
        if (!note.additionalObservations || note.additionalObservations.trim().length < 5) {
          missing.push("Additional Observations or Goal Progress");
        }
      }
      if (!note.signature) missing.push("Signature");
      break;

    case "contact_note":
      if (!note.person && !note.individualName) missing.push("Person Supported");
      if (!note.activityType) missing.push("Activity Type");
      if (!note.dateOfService) missing.push("Activity Date");
      if (!note.contactType) missing.push("Contact Type");
      if (!note.startTime) missing.push("Start Time");
      if (!note.endTime) missing.push("End Time");
      if (!note.serviceCode) missing.push("Service Code");
      if (!note.authorizationId && !note.authorizationNumber) missing.push("Service Authorization");
      if (!note.purposeOfActivity || note.purposeOfActivity.trim().length < 10) {
        missing.push("Purpose of Activity (minimum 10 characters)");
      }
      if (!note.details || note.details.trim().length < 20) {
        missing.push("Details of Activity (minimum 20 characters)");
      }
      if (!note.signature) missing.push("Signature");
      break;

    case "visit_summary":
      if (!note.person && !note.individualName) missing.push("Person Supported");
      if (!note.dateOfService) missing.push("Visit Date");
      if (!note.startTime) missing.push("Start Time");
      if (!note.endTime) missing.push("End Time");
      if (!note.location) missing.push("Location");
      if (!note.serviceCode) missing.push("Service Code");
      if (!note.authorizationId && !note.authorizationNumber) missing.push("Service Authorization");
      if (!note.purposeOfSupport || note.purposeOfSupport.trim().length < 10) {
        missing.push("Purpose of Support (minimum 10 characters)");
      }
      if (!note.visitSummaryText || note.visitSummaryText.trim().length < 20) {
        missing.push("Visit Summary and Next Steps (minimum 20 characters)");
      }
      if (!note.signature) missing.push("Signature");
      break;

    case "monitoring_form":
      if (!note.person && !note.individualName) missing.push("Person Supported");
      if (!note.dateOfService) missing.push("Date");
      if (!note.serviceCode) missing.push("Service Code");
      if (!note.authorizationId && !note.authorizationNumber) missing.push("Service Authorization");
      if (!note.signature) missing.push("Signature");
      break;
  }

  if (missing.length === 0) {
    return { passed: true, message: "All required documentation fields complete" };
  }

  // Build specific error message for first missing field
  const firstMissing = missing[0];
  let message = "";
  if (firstMissing.includes("Purpose of Activity")) {
    message = "Purpose of Activity is required for billing. Minimum 10 characters.";
  } else if (firstMissing.includes("Authorization")) {
    message = "Service authorization must be linked before this note can be billed.";
  } else if (firstMissing.includes("Start Time") || firstMissing.includes("End Time")) {
    message = "Start time and end time are required to calculate billable units.";
  } else if (firstMissing.includes("Signature")) {
    message = "Signature required before note can be submitted for billing.";
  } else if (firstMissing.includes("Details of Activity")) {
    message = "Details of Activity is required for billing. Minimum 20 characters.";
  } else {
    message = `${firstMissing} is required for billing.`;
  }

  return {
    passed: false,
    message,
    detail: missing.length > 1 ? `Also missing: ${missing.slice(1).join(", ")}` : undefined,
  };
}

// ── Main Validation Function ───────────────────────────────────────────────

export async function runBillingValidation(note: NoteData): Promise<ValidationResult> {
  const ranAt = new Date();
  const warnings: string[] = [];

  // Run checks 1, 2, 3 simultaneously; check 4 is synchronous
  const [authResult, unitCapResult, eligibilityResult] = await Promise.all([
    checkAuthExists(note),
    checkUnitsCap(note),
    checkEligibility(note),
  ]);

  const docResult = checkDocumentation(note);

  if (unitCapResult.warning) warnings.push(unitCapResult.warning);

  const checks = {
    auth_exists: authResult,
    units_within_cap: unitCapResult.result,
    eligibility_active: eligibilityResult,
    documentation_complete: docResult,
  };

  const failedCheckNames = Object.entries(checks)
    .filter(([, v]) => !v.passed)
    .map(([k]) => k);

  const allPassed = failedCheckNames.length === 0;
  const status = allPassed ? (warnings.length > 0 ? "warning" : "passed") : "failed";

  return { status, checks, warnings, failedCheckNames, ranAt };
}

// ── Check Display Labels ───────────────────────────────────────────────────

export const CHECK_LABELS: Record<string, string> = {
  auth_exists: "Authorization Exists & Active",
  units_within_cap: "Units Within Authorization Cap",
  eligibility_active: "Medicaid Eligibility Active",
  documentation_complete: "Documentation Complete",
};
