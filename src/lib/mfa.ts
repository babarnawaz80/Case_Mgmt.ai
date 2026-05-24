/**
 * Firebase SMS Multi-Factor Authentication utilities
 * CaseManagement.AI — Production MFA Implementation
 *
 * Firebase MFA flow:
 * 1. ENROLLMENT: user adds phone → receives SMS → verifies code → enrolled
 * 2. SIGN-IN CHALLENGE: after password auth → SMS sent → user enters code → session granted
 */

import {
  multiFactor,
  PhoneMultiFactorGenerator,
  PhoneAuthProvider,
  RecaptchaVerifier,
  MultiFactorError,
  getMultiFactorResolver,
  MultiFactorResolver,
  MultiFactorUser,
} from "firebase/auth";
import { auth } from "./firebase";

// ─── RecaptchaVerifier Management ────────────────────────────────────────────
// We keep a singleton so it doesn't get re-created on every render.
let recaptchaVerifier: RecaptchaVerifier | null = null;

export function getRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // ignore
    }
    recaptchaVerifier = null;
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {
      // reCAPTCHA solved — MFA will proceed
    },
  });
  return recaptchaVerifier;
}

export function clearRecaptcha() {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // ignore
    }
    recaptchaVerifier = null;
  }
}

// ─── Enrollment ───────────────────────────────────────────────────────────────

/**
 * Step 1 of enrollment: send verification SMS to the given phone number.
 * Returns a verificationId to use in enrollConfirm.
 */
export async function enrollSendSms(
  phoneNumber: string,
  containerId: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const verifier = getRecaptchaVerifier(containerId);
  const mfaUser: MultiFactorUser = multiFactor(user);
  const session = await mfaUser.getSession();

  const phoneInfoOptions = { phoneNumber, session };
  const phoneAuthProvider = new PhoneAuthProvider(auth);
  const verificationId = await phoneAuthProvider.verifyPhoneNumber(
    phoneInfoOptions,
    verifier
  );
  return verificationId;
}

/**
 * Step 2 of enrollment: confirm with the SMS code and finalize enrollment.
 */
export async function enrollConfirm(
  verificationId: string,
  verificationCode: string,
  displayName = "Phone"
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
  const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
  await multiFactor(user).enroll(multiFactorAssertion, displayName);
}

/**
 * Unenroll (remove) the first phone factor.
 */
export async function unenrollPhone(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const mfaUser = multiFactor(user);
  const enrolled = mfaUser.enrolledFactors;
  if (enrolled.length === 0) return;
  await mfaUser.unenroll(enrolled[0]);
}

/**
 * Returns whether the current user has MFA enrolled.
 */
export function isMFAEnrolled(): boolean {
  const user = auth.currentUser;
  if (!user) return false;
  return multiFactor(user).enrolledFactors.length > 0;
}

// ─── Sign-in Challenge ────────────────────────────────────────────────────────

/**
 * Check if an error is a Firebase MFA challenge error.
 */
export function isMFAError(error: unknown): error is MultiFactorError {
  return (error as any)?.code === "auth/multi-factor-auth-required";
}

/**
 * Get the MultiFactorResolver from an MFA challenge error.
 */
export function getMFAResolver(error: MultiFactorError): MultiFactorResolver {
  return getMultiFactorResolver(auth, error);
}

/**
 * Step 1 of sign-in challenge: send SMS to the enrolled phone.
 * Returns verificationId to pass to challengeConfirm.
 */
export async function challengeSendSms(
  resolver: MultiFactorResolver,
  containerId: string
): Promise<string> {
  const verifier = getRecaptchaVerifier(containerId);
  const phoneInfoOptions = {
    multiFactorHint: resolver.hints[0],
    session: resolver.session,
  };
  const phoneAuthProvider = new PhoneAuthProvider(auth);
  const verificationId = await phoneAuthProvider.verifyPhoneNumber(
    phoneInfoOptions,
    verifier
  );
  return verificationId;
}

/**
 * Step 2 of sign-in challenge: confirm SMS code and complete sign-in.
 */
export async function challengeConfirm(
  resolver: MultiFactorResolver,
  verificationId: string,
  verificationCode: string
): Promise<void> {
  const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
  const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
  await resolver.resolveSignIn(multiFactorAssertion);
}
