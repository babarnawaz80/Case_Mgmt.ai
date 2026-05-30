// AI Chat API — Case Manager Assistant
// CaseManagement.AI — POST /api/chat
// Auth-protected (Firebase ID token). Context-aware chat with Gemini 2.0 Flash.
// Supports multi-turn history for the AI panel sidebar.

import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { generateCompletion } from "../services/ai";
import { consumeCredits } from "../services/credits";
import { COLLECTIONS } from "../config/collections";
import { PRODUCT_KNOWLEDGE } from "../config/productKnowledge";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface ChatContext {
  page?: string;
  personId?: string;
  personName?: string;
  personRisk?: string;
  personProgram?: string;
  personCounty?: string;
  module?: string;
}

const CHAT_SYSTEM_PROMPT = (
  userName: string,
  orgName: string,
  context: ChatContext
) => {
  const contextParts: string[] = [];

  if (context.personName) {
    contextParts.push(`The case manager is currently viewing: ${context.personName}`);
    if (context.personRisk) contextParts.push(`Risk level: ${context.personRisk}`);
    if (context.personProgram) contextParts.push(`Program: ${context.personProgram}`);
    if (context.personCounty) contextParts.push(`County: ${context.personCounty}`);
    if (context.module) contextParts.push(`Active module: ${context.module}`);
  } else if (context.page) {
    contextParts.push(`Current page: ${context.page}`);
  }

  return `${PRODUCT_KNOWLEDGE}

---

You are the CaseAI Assistant for ${orgName}, a Home and Community-Based Services (HCBS) case management platform.
You have authoritative knowledge of the platform features described above — answer how-to questions about them precisely and without hallucination. If a user asks how something works in the platform, consult the Product Knowledge section above before answering.

The case manager you are assisting is: ${userName}

${contextParts.length > 0 ? `Current context:\n${contextParts.join("\n")}` : ""}

Your role:
- Answer any how-to question about platform features accurately using the Product Knowledge above
- Help case managers with documentation, compliance, billing, and care coordination
- Answer questions about HCBS waiver programs, Indiana Medicaid (IHCP), billing codes
- Help draft progress notes, ISP goals, incident reports, and care plans
- Flag compliance risks and due dates
- Summarize participant information concisely

Communication style:
- Professional but warm and conversational
- Concise — prefer bullet points and short paragraphs over long blocks
- Use specific case management terminology (ISP, PCP, ADL, IADL, LOC, waiver, etc.)
- When asked to draft documentation, provide professional, compliant text

IMPORTANT LIMITS:
- Never reveal PHI about individuals you don't have context on
- Never make clinical diagnoses or medical recommendations
- Remind users that AI-generated documentation must be reviewed before signing
- If asked about something outside case management, politely redirect

Format guidelines:
- Use markdown for structured responses (bullets, bold, headers)
- Keep responses concise and actionable
- If providing a document draft, clearly label it as a draft`;
};

export async function chatMessage(req: Request, res: Response): Promise<void> {
  try {
    // ── Auth: verify Firebase ID token ─────────────────────────────────────
    const authHeader = req.headers.authorization ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const idToken = authHeader.slice(7);
    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const uid = decodedToken.uid;

    // ── Load user profile to get org ────────────────────────────────────────
    const db = admin.firestore();
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userSnap.exists) {
      res.status(403).json({ error: "User not found" });
      return;
    }

    const userProfile = userSnap.data()!;
    const organizationId = userProfile.organizationId as string;
    const userName = userProfile.displayName || userProfile.name || "Case Manager";

    if (!organizationId) {
      res.status(403).json({ error: "User has no organization" });
      return;
    }

    // ── Get org name ─────────────────────────────────────────────────────────
    const orgSnap = await db.collection(COLLECTIONS.ORGANIZATIONS).doc(organizationId).get();
    const orgName = orgSnap.exists ? (orgSnap.data()!.name ?? "your organization") : "your organization";

    // ── Extract request body ─────────────────────────────────────────────────
    const { message, context = {}, history = [] } = req.body as {
      message: string;
      context?: ChatContext;
      history?: ChatMessage[];
    };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    if (message.length > 4000) {
      res.status(400).json({ error: "message too long (max 4000 characters)" });
      return;
    }

    // ── Build conversation context for Gemini ────────────────────────────────
    // Include up to 10 recent history turns to keep tokens manageable
    const recentHistory = history.slice(-10);
    const historyText = recentHistory.length > 0
      ? recentHistory
          .map((h) => `${h.role === "user" ? "Case Manager" : "Assistant"}: ${h.text}`)
          .join("\n\n")
      : "";

    const userPrompt = historyText
      ? `Previous conversation:\n${historyText}\n\nCase Manager: ${message.trim()}`
      : message.trim();

    // ── Load person context if personId provided ─────────────────────────────
    let enrichedContext = { ...context };
    if (context.personId && !context.personName) {
      try {
        const personSnap = await db
          .collection(COLLECTIONS.INDIVIDUALS)
          .doc(context.personId)
          .get();
        if (personSnap.exists) {
          const p = personSnap.data()!;
          enrichedContext = {
            ...enrichedContext,
            personName: `${p.first_name} ${p.last_name}`,
            personRisk: p.risk_level,
            personProgram: p.program,
            personCounty: p.county,
          };
        }
      } catch {
        // Non-fatal — proceed without person context
      }
    }

    // ── Call Gemini via existing AI service ──────────────────────────────────
    const systemPrompt = CHAT_SYSTEM_PROMPT(userName, orgName, enrichedContext);

    const result = await generateCompletion(
      systemPrompt,
      userPrompt,
      "", // context already embedded in userPrompt
      "fast",
      organizationId,
      uid,
      "chat_panel"
    );

    // ── Consume credits ──────────────────────────────────────────────────────
    try {
      await consumeCredits({
        organizationId,
        userId: uid,
        userName,
        userRole: userProfile.role ?? "case_manager",
        feature: "chat_panel",
        model: "gemini-flash-latest",
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      });
    } catch {
      // Non-fatal — don't fail the request if credit tracking fails
    }

    // ── Return response ──────────────────────────────────────────────────────
    res.json({
      reply: result.text,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    if (message === "AI_PAUSED") {
      res.status(402).json({ error: "AI_PAUSED", message: "AI features are currently paused for your organization." });
      return;
    }
    if (message === "INSUFFICIENT_CREDITS") {
      res.status(402).json({ error: "INSUFFICIENT_CREDITS", message: "Your organization has run out of AI credits." });
      return;
    }
    if (message === "DAILY_LIMIT_REACHED") {
      res.status(429).json({ error: "DAILY_LIMIT_REACHED", message: "Daily AI credit limit reached." });
      return;
    }

    console.error("[chat] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
