// Ambient AI — Deepgram Token Endpoint
// CaseManagement.AI — POST /api/ambient/deepgram-token
// Auth-protected (Firebase ID token).
// Returns the Deepgram API key so the browser can open a WebSocket to
// Deepgram's real-time transcription service.
// The key NEVER ships in the frontend bundle — only authenticated staff
// can obtain it here.

import { Request, Response } from "express";
import * as admin from "firebase-admin";

export const deepgramToken = async (req: Request, res: Response): Promise<void> => {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const authHeader = req.headers.authorization ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const idToken = authHeader.slice(7);
  try {
    await admin.auth().verifyIdToken(idToken);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  // ── Return key ────────────────────────────────────────────────────────────
  const key = process.env.DEEPGRAM_API_KEY ?? "";

  if (!key || key === "PASTE_YOUR_KEY_HERE") {
    res.status(503).json({
      error: "Deepgram API key not configured. Add DEEPGRAM_API_KEY to functions/.env and redeploy.",
    });
    return;
  }

  res.json({ key });
};
