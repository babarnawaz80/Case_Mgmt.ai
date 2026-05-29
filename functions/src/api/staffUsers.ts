// Staff User Management — Cloud Function
// CaseManagement.AI
//
// Uses Firebase Admin SDK so we can look up existing Auth accounts by email.
// This prevents the "EMAIL_EXISTS" error when re-adding staff who were
// previously deleted from Firestore but still have Firebase Auth accounts.
//
// POST /api/staff/create-or-update
// Body: { email, firstName, lastName, role, organizationId }
// Auth: Bearer <admin idToken> required

import * as admin from "firebase-admin";
import type { Request, Response } from "express";
import { FieldValue } from "firebase-admin/firestore";

const db = admin.firestore();

/** Verify the caller is an authenticated admin of the given org */
async function verifyAdminCaller(req: Request): Promise<{ uid: string; role: string } | null> {
  const authHeader = req.headers.authorization ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) return null;

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userDoc = await db.doc(`users/${decoded.uid}`).get();
    if (!userDoc.exists) return null;
    const data = userDoc.data()!;
    const role: string = data.role ?? "";
    if (role !== "admin" && role !== "platform_admin") return null;
    return { uid: decoded.uid, role };
  } catch {
    return null;
  }
}

/**
 * POST /api/staff/create-or-update
 *
 * Creates a new Firebase Auth + Firestore user, OR if the Firebase Auth account
 * already exists for that email, just creates/updates the Firestore profile.
 * Returns { uid, isNew, tempPassword? }
 */
export async function createOrUpdateStaffUser(req: Request, res: Response): Promise<void> {
  // CORS preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  // Auth check
  const caller = await verifyAdminCaller(req);
  if (!caller) { res.status(401).json({ error: "Unauthorized. Admin role required." }); return; }

  const { email, firstName, lastName, role, organizationId } = req.body ?? {};
  if (!email || !firstName || !lastName || !role || !organizationId) {
    res.status(400).json({ error: "Missing required fields: email, firstName, lastName, role, organizationId" });
    return;
  }

  const trimEmail = (email as string).trim().toLowerCase();
  const trimFirst = (firstName as string).trim();
  const trimLast = (lastName as string).trim();
  const displayName = `${trimFirst} ${trimLast}`;

  try {
    let uid: string;
    let isNew = false;
    let tempPassword: string | undefined;

    // Try to find existing Firebase Auth account
    try {
      const existing = await admin.auth().getUserByEmail(trimEmail);
      uid = existing.uid;
      // Account exists — just reconnect to this org (no new password)
    } catch (notFound: any) {
      if (notFound.code !== "auth/user-not-found") throw notFound;

      // Account doesn't exist — create it
      tempPassword = generateTempPassword();
      const created = await admin.auth().createUser({
        email: trimEmail,
        password: tempPassword,
        displayName,
      });
      uid = created.uid;
      isNew = true;
    }

    // Create or overwrite the Firestore users/{uid} document
    await db.doc(`users/${uid}`).set({
      uid,
      email: trimEmail,
      firstName: trimFirst,
      lastName: trimLast,
      displayName,
      role,
      organizationId,
      status: "active",
      isActive: true,
      mustChangePw: isNew,
      caseload: [],
      updatedAt: FieldValue.serverTimestamp(),
      ...(isNew ? { createdAt: FieldValue.serverTimestamp(), lastLogin: null } : {}),
    }, { merge: true });

    res.status(200).json({ uid, isNew, tempPassword });
  } catch (err: any) {
    console.error("[createOrUpdateStaffUser] Error:", err);
    res.status(500).json({ error: err.message ?? "Failed to create/update staff user" });
  }
}

/** Generate a strong temporary password */
function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "#@!";
  const all = upper + lower + digits + special;
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  const base = [
    rand(upper), rand(upper),
    rand(lower), rand(lower), rand(lower),
    rand(digits), rand(digits),
    rand(special),
    ...Array.from({ length: 4 }, () => rand(all)),
  ];
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base.join("");
}
