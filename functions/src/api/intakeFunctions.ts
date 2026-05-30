// Intake Form Cloud Functions
// CaseManagement.AI — External Referral Intake System
//
// Routes:
//   POST /api/intake/validate-token   — public, validate orgToken
//   POST /api/intake/submit           — public, submit intake form
//   POST /api/intake/generate-token   — admin auth required
//   GET  /api/intake/tokens           — admin auth required
//   PATCH /api/intake/tokens/:id/deactivate — admin auth required

import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { Router, Request, Response } from "express";
import { FieldValue } from "firebase-admin/firestore";

const db = admin.firestore();
const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function verifyAdminToken(req: Request): Promise<{ uid: string; organizationId: string } | null> {
  const authHeader = req.headers.authorization ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) return null;

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userDoc = await db.doc(`users/${decoded.uid}`).get();
    if (!userDoc.exists) return null;
    const data = userDoc.data()!;
    if (data.role !== "admin" && data.role !== "platform_admin") return null;
    return { uid: decoded.uid, organizationId: data.organizationId ?? "" };
  } catch {
    return null;
  }
}

// ─── POST /api/intake/validate-token ─────────────────────────────────────────

router.post("/validate-token", async (req: Request, res: Response): Promise<void> => {
  try {
    const { orgToken } = req.body ?? {};
    if (!orgToken || typeof orgToken !== "string") {
      res.json({ valid: false });
      return;
    }

    const tokenHash = sha256(orgToken);
    const snap = await db
      .collection("intake_tokens")
      .where("tokenHash", "==", tokenHash)
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (snap.empty) {
      res.json({ valid: false });
      return;
    }

    const tokenDoc = snap.docs[0];
    const tokenData = tokenDoc.data();
    const orgId: string = tokenData.orgId ?? "";

    let organizationName = "";
    let organizationLogo: string | null = null;
    let organizationPhone: string | null = null;
    let defaultState = "";

    if (orgId) {
      const orgDoc = await db.doc(`organizations/${orgId}`).get();
      if (orgDoc.exists) {
        const orgData = orgDoc.data()!;
        organizationName = orgData.name ?? orgData.organizationName ?? "";
        organizationLogo = orgData.logoUrl ?? null;
        organizationPhone = orgData.phone ?? null;
        defaultState = orgData.primaryState ?? "";
      }
    }

    res.json({
      valid: true,
      organizationName,
      organizationLogo,
      organizationPhone,
      defaultState,
      formLabel: tokenData.label || "Referral Intake Form",
    });
  } catch (err) {
    console.error("validate-token error:", err);
    res.status(500).json({ valid: false, error: "Server error" });
  }
});

// ─── POST /api/intake/submit ──────────────────────────────────────────────────

router.post("/submit", async (req: Request, res: Response): Promise<void> => {
  try {
    // Rate limiting by IP
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
    const rateLimitId = `ip_${sha256(ip).slice(0, 16)}`;
    const rateLimitRef = db.doc(`rate_limits/${rateLimitId}`);
    const rateLimitDoc = await rateLimitRef.get();

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data()!;
      const timestamps: number[] = (data.timestamps ?? []).filter((t: number) => t > oneHourAgo);
      if (timestamps.length >= 10) {
        res.status(429).json({ error: "Rate limit exceeded. Max 10 submissions per hour." });
        return;
      }
    }

    const { orgToken, formData, uploadedFileUrls } = req.body ?? {};
    if (!orgToken || typeof orgToken !== "string") {
      res.status(400).json({ error: "Missing orgToken" });
      return;
    }

    // Validate token
    const tokenHash = sha256(orgToken);
    const snap = await db
      .collection("intake_tokens")
      .where("tokenHash", "==", tokenHash)
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (snap.empty) {
      res.status(403).json({ error: "Invalid or inactive intake token" });
      return;
    }

    const tokenDoc = snap.docs[0];
    const tokenData = tokenDoc.data();

    // Validate required fields
    const fd = formData ?? {};
    const required = [
      "firstName", "lastName", "dateOfBirth", "primaryPhone",
      "primaryDiagnosis", "reasonForReferral",
      "referrerName", "referrerOrganization", "referrerPhone", "referrerEmail",
      "urgencyLevel", "confirmAuthorization",
    ];
    const missing = required.filter((f) => !fd[f]);
    if (missing.length > 0) {
      res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
      return;
    }

    // Generate reference number
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const referenceNumber = `REF-${year}-${randomHex}`;

    const orgId: string = tokenData.orgId ?? "";

    // Write to pending_leads
    const leadRef = await db.collection("pending_leads").add({
      ...fd,
      source: "external_intake_form",
      intakeTokenId: tokenDoc.id,
      intakeLinkLabel: tokenData.label ?? "",
      referenceNumber,
      orgId,
      status: "pending_review",
      submittedAt: FieldValue.serverTimestamp(),
      uploadedFileUrls: uploadedFileUrls ?? [],
    });

    // Update rate limit
    const existingTimestamps: number[] = rateLimitDoc.exists
      ? (rateLimitDoc.data()!.timestamps ?? []).filter((t: number) => t > oneHourAgo)
      : [];
    await rateLimitRef.set({ timestamps: [...existingTimestamps, now], ip: ip.slice(0, 64) });

    // Create notification
    const urgency = fd.urgencyLevel ?? "routine";
    await db.collection("notifications").add({
      type: "new_intake_submission",
      title: `New ${urgency.charAt(0).toUpperCase() + urgency.slice(1)} Referral`,
      message: `${fd.firstName} ${fd.lastName} referred by ${fd.referrerName} (${fd.referrerOrganization})`,
      referenceNumber,
      leadId: leadRef.id,
      orgId,
      urgencyLevel: urgency,
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    });

    // Update token stats
    await tokenDoc.ref.update({
      submissionCount: FieldValue.increment(1),
      lastSubmissionAt: FieldValue.serverTimestamp(),
    });

    res.json({ success: true, referenceNumber, leadId: leadRef.id });
  } catch (err) {
    console.error("submit error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /api/intake/generate-token ─────────────────────────────────────────

router.post("/generate-token", async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = await verifyAdminToken(req);
    if (!caller) {
      res.status(401).json({ error: "Unauthorized. Admin role required." });
      return;
    }

    const { label } = req.body ?? {};
    if (!label) {
      res.status(400).json({ error: "label is required" });
      return;
    }

    // Use the caller's org from their Firestore profile
    const orgId = caller.organizationId;
    if (!orgId) {
      res.status(400).json({ error: "Admin user has no organizationId" });
      return;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);

    const tokenRef = await db.collection("intake_tokens").add({
      label,
      orgId,
      tokenHash,
      isActive: true,
      submissionCount: 0,
      lastSubmissionAt: null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: caller.uid,
    });

    const intakeUrl = `https://app.casemanagement.ai/intake/${rawToken}`;
    res.json({ success: true, intakeUrl, tokenId: tokenRef.id });
  } catch (err) {
    console.error("generate-token error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /api/intake/tokens ───────────────────────────────────────────────────

router.get("/tokens", async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = await verifyAdminToken(req);
    if (!caller) {
      res.status(401).json({ error: "Unauthorized. Admin role required." });
      return;
    }

    const snap = await db
      .collection("intake_tokens")
      .where("orgId", "==", caller.organizationId)
      .orderBy("createdAt", "desc")
      .get();

    const tokens = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        label: d.label,
        isActive: d.isActive,
        submissionCount: d.submissionCount ?? 0,
        lastSubmissionAt: d.lastSubmissionAt,
        createdAt: d.createdAt,
        createdBy: d.createdBy,
        orgId: d.orgId,
      };
    });

    res.json({ tokens });
  } catch (err) {
    console.error("tokens list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── PATCH /api/intake/tokens/:id/deactivate ─────────────────────────────────

router.patch("/tokens/:id/deactivate", async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = await verifyAdminToken(req);
    if (!caller) {
      res.status(401).json({ error: "Unauthorized. Admin role required." });
      return;
    }

    const { id } = req.params;
    await db.doc(`intake_tokens/${id}`).update({ isActive: false });
    res.json({ success: true });
  } catch (err) {
    console.error("deactivate token error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export { router as intakeRoutes };
