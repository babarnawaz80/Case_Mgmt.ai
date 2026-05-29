// Care Companion Bot API — Public endpoints (no Firebase Auth required)
// CaseManagement.AI — PRD v2.0
// HIPAA: No PHI in URLs. Individuals identified by companion_token only.
//
// Routes (registered in index.ts):
//   GET  /care-assistant/:token           → redirect to React SPA
//   POST /care-assistant/:token/message   → AI chat response
//   POST /care-assistant/:token/end-session → summarise + close session

import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { generateCompletion, getAiClient } from "../services/ai";
import { consumeCredits } from "../services/credits";
import { COLLECTIONS } from "../config/collections";

// ────────────────────────────────────────────────────────────────────────────────
// DEFAULT_COMPANION_PROMPT — used when no custom prompt is set for an individual.
// This is the authoritative default. Also exported as a string so the frontend
// can display it in the "Reset to Default" button in the Customize Prompt modal.
// ────────────────────────────────────────────────────────────────────────────────
export const DEFAULT_COMPANION_PROMPT = `You are a warm, patient, and supportive AI companion for someone who receives case management support services. Your job is to be a friendly presence they can talk to anytime — day or night.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHO YOU ARE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are their AI companion. You are not a doctor, not a nurse, and not their case manager. You are a friendly helper who listens, takes notes, and connects them to the right people when they need something.

Always introduce yourself the first time in a session:
"Hi! I'm your AI companion. I'm here to chat, help you get messages to the right people, and check in with you. What's on your mind today?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO SPEAK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Use short, simple sentences. No long paragraphs.
- Be warm, calm, and patient at all times.
- Never use clinical, medical, or legal language.
- Never talk down to them or treat them like a child.
- If they seem confused, gently repeat or rephrase.
- Always validate how they are feeling before moving forward.
- Use their first name naturally in conversation.
- Keep responses brief — 2 to 4 sentences maximum unless they ask for more.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IF THEY ARE UPSET, ANXIOUS, OR AGITATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is the most important part of your role. If someone is distressed, do not rush them or jump to solutions.

Step 1 — Acknowledge first:
"I can hear that you're having a really tough time right now. I'm here with you."

Step 2 — Give them space to talk:
"Do you want to tell me a little about what's going on?"

Step 3 — Stay calm and grounding:
"You're safe. I'm not going anywhere. Take your time."

Step 4 — Gently offer help:
"Would it help if I sent a message to your case manager to let them know you're having a hard time? I can do that right now if you'd like."

Never tell them to calm down directly.
Never minimize what they are feeling.
If they express that they want to hurt themselves or others, immediately respond:
"I hear you and I want to make sure you're safe. Please call 988 or 911 right now. I'm also going to flag this for your care team immediately."
Then log the conversation as urgent for the case manager.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEDICATION QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You NEVER reveal medication names, dosages, schedules, or any medical information from their file.

If they ask what their medication is:
"I'm not able to share that information — that's something your doctor or case manager can go over with you. But if you tell me the name of the medication you're thinking of, I can let you know if that sounds right."

If they tell you a medication name:
"Got it. I won't be able to confirm the details, but I can send a message to your case manager to follow up with you about your medications. Would that help?"

If they say they did not take their medication or are not sure:
"That's okay — thanks for telling me. Would you like me to send a message to your case manager so they know? They can follow up with you today."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TAKING MESSAGES AND ROUTING REQUESTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is one of your most important jobs. You can send messages on their behalf to people in their care team. You never make phone calls — you send messages only.

When they want to reach someone, ask:
"Would you like me to send them a message? I can do that for you right now."

People you can send messages to:
- Their case manager / service coordinator
- Their doctor or healthcare provider
- A family member (if on their contact list)
- Their supervisor at work (if applicable)
- Any support staff member in their care team

If they say "I want to talk to my case manager":
"Of course. I can send your case manager a message right now. What would you like me to say to them?"
[Wait for their message, then confirm and log as a message task for the case manager]

If they do not know who their case manager is:
[Pull the assigned case manager name from the individual's profile and tell them]
"Your case manager is [Name]. Would you like me to send them a message?"

If they ask you to call someone:
"I'm not able to make phone calls, but I can send a message right away. Would that work?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAILY CHECK-IN FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If they start a conversation and seem like they just want to check in, gently guide through these topics one at a time — never all at once:

1. How are you feeling today?
2. Did you go to your program or activity today?
3. Did you take your medication today? (Do not ask follow-up medication details — just note yes or no for the case manager)
4. Is there anything you need help with today?
5. Is there anything you want me to pass along to your case manager?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT YOU NEVER DO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Never share diagnosis, medical history, medications, or any information from their file
- Never make clinical recommendations or give medical advice
- Never tell them what services they receive or what their plan says
- Never confirm or deny appointments unless explicitly shared with you in this session
- Never make phone calls — messages only
- Never pretend to be a human
- Never say "I don't know" without offering an alternative — always say "I can't help with that directly, but I can send a message to your case manager who can"
- Never end a conversation abruptly — always close warmly:
  "Is there anything else I can help you with today? I'll make sure your case manager gets the notes from our conversation."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SAFETY — HIGHEST PRIORITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If they mention ANYTHING about being hurt, feeling unsafe, wanting to hurt themselves or others, or a crisis at home — respond with [URGENT] prefix and say:
"I hear you and I want to make sure you're safe. Please call 988 or 911 right now. I'm also going to flag this for your care team immediately."
Then log the conversation as urgent.`;

// ── Rule-based fallback responses when AI is unavailable ──────────────────
// Used when Gemini quota is exceeded or the API is unreachable.
// Returns contextually appropriate replies based on the user's message.
function ruleFallback(message: string, name: string): string {
  const msg = message.toLowerCase().trim();

  // Safety — highest priority
  if (/\b(hurt|kill|suicide|die|harm|self.harm|end it|end my life|crisis)\b/.test(msg)) {
    return `[URGENT] ${name}, I hear you and your safety is the most important thing right now. Please call or text 988 right now — they're available 24/7. I'm also flagging this for your care team immediately. You are not alone.`;
  }

  // Greeting / opening
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|howdy|sup|yo)\b/.test(msg) ||
      msg.length < 20 && /\b(how are you|what's up|whats up)\b/.test(msg)) {
    const opts = [
      `Hi ${name}! I'm so glad you're here. How are you doing today?`,
      `Hey ${name}! It's great to hear from you. How are you feeling right now?`,
      `Hello ${name}! Good to see you. What's on your mind today?`,
      `Hi ${name}! I'm here for you. How are you doing?`,
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  }

  // Positive feeling
  if (/\b(good|great|well|fine|happy|wonderful|amazing|fantastic|awesome|okay|ok|alright|better|not bad)\b/.test(msg) && msg.length < 60) {
    const opts = [
      `That's really great to hear, ${name}! I'm so glad you're doing well. Is there anything on your mind, or anything I can help with today?`,
      `Wonderful! It makes me really happy to hear that, ${name}. Is there anything you'd like to talk about or any messages I can send for you?`,
      `That's great, ${name}! Keep that going. Is there anything your case manager should know about, or is there anything I can do for you today?`,
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  }

  // Negative / struggling
  if (/\b(bad|sad|terrible|awful|horrible|not good|not okay|not well|struggling|upset|anxious|worried|depressed|lonely|tired|exhausted|stressed|overwhelmed|scared|afraid|angry|frustrated)\b/.test(msg)) {
    const opts = [
      `I hear you, ${name}. I'm really sorry you're having a tough time right now. I'm here with you. Do you want to tell me a little more about what's going on?`,
      `Thank you for telling me that, ${name}. It sounds like things have been hard. I'm here and I'm listening — what's been going on?`,
      `I'm really glad you're talking to me, ${name}. I can hear that things aren't easy right now. Do you want to share a little more? I'm here.`,
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  }

  // Pain / health symptoms
  if (/\b(pain|hurt|sick|unwell|headache|stomach|nausea|dizzy|fever|doctor|hospital|nurse|medical)\b/.test(msg)) {
    return `I'm sorry to hear you're not feeling well, ${name}. Thank you for telling me. Would you like me to send a message to your case manager so they can check in on you or help arrange support?`;
  }

  // Medication
  if (/\b(medication|medicine|pill|pills|dose|prescription|pharmacy|refill|ran out|forgot)\b/.test(msg)) {
    return `Thanks for letting me know, ${name}. I'm not able to share medication details, but I can send a message to your case manager right away so they can follow up with you. Would that help?`;
  }

  // Case manager / want to talk to someone
  if (/\b(case manager|coordinator|talk to|speak to|call|reach|contact|message|need help|need someone)\b/.test(msg)) {
    return `Of course, ${name}. I can send a message to your case manager right now. What would you like me to say to them?`;
  }

  // Affirmations / yes / confirmations
  if (/^(yes|yeah|yep|sure|okay|ok|please|go ahead|sounds good|that works|definitely|absolutely)\b/.test(msg) && msg.length < 30) {
    const opts = [
      `Great, ${name}! I'll take care of that for you. Is there anything else I can do?`,
      `Perfect! Consider it done. Is there anything else on your mind?`,
      `Wonderful! I'll make sure that gets to the right person. Anything else I can help with today?`,
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  }

  // Negations / no
  if (/^(no|nope|not really|nothing|nah|I'm fine|I'm okay)\b/.test(msg) && msg.length < 30) {
    const opts = [
      `Okay, ${name}! I'm always here if you need me. Take care of yourself today.`,
      `No problem at all, ${name}. I'm here whenever you need me. Have a good day!`,
      `That's totally fine, ${name}. I'm always here if something comes up. Take care!`,
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  }

  // Thank you
  if (/\b(thank|thanks|thank you|appreciate)\b/.test(msg)) {
    const opts = [
      `You're so welcome, ${name}! That's what I'm here for. Is there anything else I can help you with?`,
      `Of course, ${name}! I'm always happy to help. Take care of yourself!`,
      `Anytime, ${name}! I'm always here for you. Is there anything else on your mind?`,
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  }

  // Bye / ending
  if (/\b(bye|goodbye|see you|talk later|take care|got to go|gotta go|ttyl|later)\b/.test(msg)) {
    const opts = [
      `Take care, ${name}! I'll make sure your care team gets a note from our conversation. Have a great day!`,
      `Goodbye for now, ${name}! Remember I'm always here whenever you need me. Take care of yourself!`,
      `Talk soon, ${name}! Don't hesitate to come back anytime. Take good care!`,
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  }

  // Default — acknowledge and invite more
  const defaults = [
    `Thank you for sharing that with me, ${name}. I'm here and I'm listening. Can you tell me a little more?`,
    `I hear you, ${name}. I'm here with you. Is there anything else you'd like to share, or anything I can help you with?`,
    `Thank you, ${name}. I'm glad you're talking with me today. Is there anything I can do for you, or any message I can pass along to your care team?`,
    `I appreciate you sharing that, ${name}. I'm here for you. Would you like me to pass anything along to your case manager?`,
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ── Build the final system prompt for a session ────────────────────────────
// Injects individual-specific context (name, case manager, program) and
// prepends any custom per-individual instructions when set.
function buildSystemPrompt(
  preferredName: string,
  county: string,
  caseManagerName: string,
  programName: string,
  customInstructions?: string,
): string {
  const contextBlock = [
    `Individual context for this session:`,
    `- Individual's preferred name: ${preferredName}`,
    `- Case manager / service coordinator: ${caseManagerName}`,
    county ? `- County: ${county}` : "",
    programName ? `- Program: ${programName}` : "",
  ].filter(Boolean).join("\n");

  const basePrompt = `${contextBlock}\n\n${DEFAULT_COMPANION_PROMPT}`;

  if (customInstructions?.trim()) {
    return `COMPANION INSTRUCTIONS FOR THIS INDIVIDUAL (set by their care team — highest priority):\n${customInstructions.trim()}\n\nAlways follow the above instructions when interacting with this individual. They take priority over general guidelines.\n\n${basePrompt}`;
  }

  return basePrompt;
}



// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
async function findIndividualByToken(token: string) {
  const db = admin.firestore();
  const snap = await db
    .collection(COLLECTIONS.INDIVIDUALS)
    .where("companion_token", "==", String(token))
    .where("companion_link_active", "==", true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Record<string, unknown> & { id: string };
}

async function getOrCreateSession(
  db: admin.firestore.Firestore,
  session_id: string,
  individual: Record<string, unknown> & { id: string },
  token: string,
): Promise<{ sessionRef: admin.firestore.DocumentReference; sessionData: admin.firestore.DocumentData }> {
  // Try to reuse existing session
  if (session_id && !session_id.startsWith("session_")) {
    const snap = await db.collection(COLLECTIONS.AI_CHECKINS).doc(session_id).get();
    if (snap.exists) {
      return { sessionRef: snap.ref, sessionData: snap.data()! };
    }
  }

  // Build session — strip any undefined fields so Firestore doesn't reject them
  const newSession: Record<string, unknown> = {
    individualId: individual.id,
    organizationId: individual.organizationId ?? null,
    companion_token: token,
    session_date: admin.firestore.FieldValue.serverTimestamp(),
    duration_seconds: 0,
    message_count: 0,
    transcript: [],
    urgency_flagged: false,
    review_status: "pending_review",
    opened_at: new Date().toISOString(),
  };
  // Only include assigned_case_manager if it is defined
  if (individual.assigned_case_manager !== undefined) {
    newSession.assigned_case_manager = individual.assigned_case_manager ?? null;
  }

  const ref = db.collection(COLLECTIONS.AI_CHECKINS).doc();
  await ref.set(newSession);
  return { sessionRef: ref, sessionData: newSession };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /care-assistant/:token
// Redirects to the React SPA — CareAssistant.tsx handles the full UI.
// Updates last-used timestamp as a side-effect.
// ─────────────────────────────────────────────────────────────────────────────
export async function companionGet(req: Request, res: Response): Promise<void> {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;

  // Determine origin from headers (works on Cloud Run / Firebase Hosting)
  const host =
    (req.headers["x-forwarded-host"] as string) ||
    (req.headers.host as string) ||
    "casemanagement-ai.web.app";
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";
  const origin = `${proto}://${host}`;

  // Update last-used (best-effort, don't block redirect)
  try {
    const individual = await findIndividualByToken(token);
    if (individual) {
      await admin.firestore().collection(COLLECTIONS.INDIVIDUALS).doc(individual.id).update({
        companion_last_used: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch {
    // Non-fatal
  }

  // Redirect to the React SPA route — CareAssistant.tsx renders the full chat UI
  res.redirect(302, `${origin}/care-assistant/${token}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /care-assistant/:token/message
// Main AI chat endpoint. Handles both the opening greeting (__OPEN__) and
// regular user messages.
// ─────────────────────────────────────────────────────────────────────────────
export async function companionMessage(req: Request, res: Response): Promise<void> {
  try {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    const individual = await findIndividualByToken(token);
    if (!individual) {
      res.status(404).json({ error: "Invalid or expired companion link" });
      return;
    }

    const { message, session_id } = req.body as { message: string; session_id: string };
    if (!message) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const db = admin.firestore();
    const { sessionRef, sessionData } = await getOrCreateSession(db, session_id, individual, token);

    // Load case manager name
    const cmSnap = individual.assigned_case_manager
      ? await db.collection(COLLECTIONS.USERS).doc(individual.assigned_case_manager as string).get()
      : null;
    const cmName =
      cmSnap?.exists && cmSnap.data()
        ? `${cmSnap.data()!.firstName} ${cmSnap.data()!.lastName}`
        : "your case manager";

    const preferredName = ((individual.preferred_name || individual.first_name) as string) || "Friend";
    const county = (individual.county as string) || "";
    const programName = (individual.program as string) || "";
    // Fall back to known org if missing — companion should always work
    const orgId = (individual.organizationId as string) || "demo-org-001";

    const console_log_line = `[companion] individual=${individual.id} orgId=${orgId} preferredName=${preferredName}`;
    console.log(console_log_line);

    // ── Build system prompt (uses DEFAULT_COMPANION_PROMPT; custom overrides applied first) ──
    const customPromptData = individual.companion_prompt as { content?: string } | null | undefined;
    const customInstructions = customPromptData?.content?.trim();
    const systemPrompt = buildSystemPrompt(preferredName, county, cmName, programName, customInstructions);


    // Build conversation history (last 20 exchanges)
    const transcript: Array<{ role: string; content: string }> = sessionData.transcript || [];
    const historyText = transcript
      .slice(-20)
      .map((m) => `${m.role === "user" ? preferredName : "Companion"}: ${m.content}`)
      .join("\n");


    // ── Regular user message — call AI with history ───────────────────────────
    const contextWithHistory = historyText
      ? `Previous conversation:\n${historyText}`
      : "";

    // ── Opening greeting — handled separately so it ALWAYS returns a real response ──
    // If AI succeeds we get a custom greeting; if it fails we fall back to a
    // warm hardcoded greeting using the person's name. Never "warming up".
    const isOpeningMessage = message === "__OPEN__";
    if (isOpeningMessage) {
      let greetingText: string;
      try {
        const greetingResult = await generateCompletion(
          systemPrompt,
          "Please send the opening greeting to start our check-in conversation.",
          "",
          "companion",
          orgId,
          "companion_bot",
          "companion_message",
          { maxTokens: 120, temperature: 0.85 },
        );
        greetingText = greetingResult.text.trim() ||
          `Hi ${preferredName}! I'm your AI companion. I'm here to chat, check in with you, and help get messages to the right people. What's on your mind today?`;
      } catch (greetingErr: any) {
        console.error("[companion] greeting AI failed — using hardcoded greeting:", greetingErr?.message ?? greetingErr);
        // Rotate through a few variations so it doesn't always sound identical
        const fallbackGreetings = [
          `Hi ${preferredName}! I'm your AI companion. I'm here to chat, check in with you, and help get messages to the right people. What's on your mind today?`,
          `Hello ${preferredName}! I'm your AI companion. I'm so glad you're here. How are you doing today?`,
          `Hey ${preferredName}! I'm your AI companion — here to listen, check in, and help. How are you feeling right now?`,
          `Hi there, ${preferredName}! I'm your AI companion. I'm here whenever you need me. What's going on today?`,
        ];
        greetingText = fallbackGreetings[Math.floor(Math.random() * fallbackGreetings.length)];
      }

      const now = new Date().toISOString();
      await sessionRef.update({
        transcript: [{ role: "assistant", content: greetingText, timestamp: now }],
        message_count: admin.firestore.FieldValue.increment(1),
        last_activity: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ response: greetingText, sessionId: sessionRef.id, firstName: preferredName, urgent: false });
      return;
    }

    // ── Regular user message — call AI with history, fall back to rule-based ──
    const result = await generateCompletion(
      systemPrompt,
      message,
      contextWithHistory,
      "companion",
      orgId,
      "companion_bot",
      "companion_message",
      { maxTokens: 200, temperature: 0.75 },
    );

    let responseText = result.text.trim();
    const isUrgent = responseText.includes("[URGENT]");
    if (isUrgent) responseText = responseText.replace(/\[URGENT\]/g, "").trim();

    const now = new Date().toISOString();

    // At this point message is always a real user message (__OPEN__ returns early above)
    const newTranscriptEntries = [
      { role: "user", content: message, timestamp: now },
      { role: "assistant", content: responseText, timestamp: now },
    ];

    const updatedTranscript = [...transcript, ...newTranscriptEntries];
    const sessionUpdates: Record<string, unknown> = {
      transcript: updatedTranscript,
      message_count: admin.firestore.FieldValue.increment(2),
      last_activity: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Handle urgent flag — create task + notification for case manager
    if (isUrgent && !sessionData.urgency_flagged) {
      sessionUpdates.urgency_flagged = true;
      sessionUpdates.urgency_content = message;
      sessionUpdates.urgency_at = now;

      if (individual.assigned_case_manager) {
        await Promise.all([
          db.collection(COLLECTIONS.WORKFLOW_TASKS).add({
            individualId: individual.id,
            organizationId: orgId,
            assigned_to: individual.assigned_case_manager,
            created_by: "system",
            title: `⚠️ URGENT: ${preferredName} flagged a concern during Care Companion check-in`,
            description: `${preferredName} said: "${message}"\n\nPlease follow up immediately. This was flagged by the AI Care Companion as a potential safety concern.`,
            task_type: "urgent_followup",
            due_date: new Date().toISOString(),
            status: "pending_start",
            priority: "critical",
            ai_generated: true,
            companion_session_id: sessionRef.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
          db.collection(COLLECTIONS.NOTIFICATIONS).add({
            organizationId: orgId,
            user_id: individual.assigned_case_manager,
            type: "urgent_checkin",
            title: `⚠️ URGENT: ${preferredName} needs immediate follow-up`,
            body: `Care Companion flagged an urgent concern during check-in. Please review and follow up immediately.`,
            linked_route: `/my-work`,
            read: false,
            priority: "critical",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
        ]);
      }
    }

    await sessionRef.update(sessionUpdates);

    // Track AI credit usage
    await consumeCredits({
      organizationId: orgId,
      userId: "companion_bot",
      userName: "Care Companion Bot",
      userRole: "system",
      feature: "companion_message",
      model: "gemini-flash-latest",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      individualId: individual.id,
      sessionId: sessionRef.id,
    });

    res.json({
      response: responseText,
      sessionId: sessionRef.id,
      urgent: isUrgent,
      firstName: preferredName,
    });
  } catch (error: any) {
    console.error("[companion-message] error (first attempt):", error?.message ?? error);

    // Skip retry for known permanent failures (quota/billing) — no point waiting 2.5s
    const isPermanentFailure = /quota|billing|RESOURCE_EXHAUSTED|INSUFFICIENT_CREDITS|AI_PAUSED|DAILY_LIMIT/i.test(error?.message ?? "");

    // Auto-retry once after a short delay — handles Gemini cold-start timeouts
    try {
      if (isPermanentFailure) throw new Error("permanent failure — skipping retry");
      await new Promise((r) => setTimeout(r, 2500));
      const orgId = (await (async () => {
        const token2 = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
        const ind2 = await findIndividualByToken(token2);
        return (ind2?.organizationId as string) || "demo-org-001";
      })());
      const { message: msg2, session_id: sid2 } = req.body as { message: string; session_id: string };
      const token2 = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
      const ind2 = await findIndividualByToken(token2);
      if (ind2) {
        const prefName2 = ((ind2.preferred_name || ind2.first_name) as string) || "Friend";
        const county2 = (ind2.county as string) || "";
        const programName2 = (ind2.program as string) || "";
        const db2 = admin.firestore();
        const cmSnap2 = ind2.assigned_case_manager
          ? await db2.collection(COLLECTIONS.USERS).doc(ind2.assigned_case_manager as string).get()
          : null;
        const cmName2 = cmSnap2?.exists && cmSnap2.data()
          ? `${cmSnap2.data()!.firstName} ${cmSnap2.data()!.lastName}`
          : "your case manager";
        const retryResult = await generateCompletion(
          buildSystemPrompt(prefName2, county2, cmName2, programName2),
          msg2 === "__OPEN__" ? "Please send the opening greeting to start our check-in conversation." : msg2,
          "",
          "companion",
          orgId,
          "companion_bot",
          "companion_message",
          { maxTokens: 200, temperature: 0.75 },
        );
        let retryText = retryResult.text.trim();
        const retryUrgent = retryText.includes("[URGENT]");
        if (retryUrgent) retryText = retryText.replace(/\[URGENT\]/g, "").trim();
        res.json({ response: retryText, sessionId: sid2, urgent: retryUrgent, firstName: prefName2 });
        return;
      }
    } catch (retryErr: any) {
      console.error("[companion-message] retry also failed:", retryErr?.message ?? retryErr);
    }

    // Final fallback — use rule-based contextual response; never expose an error to the individual
    // Look up name so the response is personalised
    let fallbackName = "Friend";
    let fallbackMsg = "";
    try {
      const tkFb = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
      const indFb = await findIndividualByToken(tkFb);
      if (indFb) fallbackName = ((indFb.preferred_name || indFb.first_name) as string) || "Friend";
      fallbackMsg = (req.body as any)?.message ?? "";
    } catch { /* best-effort */ }

    const isOpenFallback = fallbackMsg === "__OPEN__" || !fallbackMsg;
    const fallbackGreetings = [
      `Hi ${fallbackName}! I'm your AI companion. I'm here to chat, check in with you, and help get messages to the right people. What's on your mind today?`,
      `Hello ${fallbackName}! I'm your AI companion — here to listen and help. How are you doing today?`,
      `Hey ${fallbackName}! I'm so glad you're here. How are you feeling right now?`,
    ];
    const responseText = isOpenFallback
      ? fallbackGreetings[Math.floor(Math.random() * fallbackGreetings.length)]
      : ruleFallback(fallbackMsg, fallbackName);

    const isUrgentFallback = responseText.startsWith("[URGENT]");
    res.json({
      response: isUrgentFallback ? responseText.replace(/\[URGENT\]/g, "").trim() : responseText,
      urgent: isUrgentFallback,
      firstName: fallbackName,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /care-assistant/:token/end-session
// Generates a clinical summary of the session for the case manager.
// ─────────────────────────────────────────────────────────────────────────────
export async function companionEndSession(req: Request, res: Response): Promise<void> {
  try {
    const { session_id } = req.body as { session_id: string };
    if (!session_id) { res.json({ success: true }); return; }

    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    const individual = await findIndividualByToken(token);
    if (!individual) { res.json({ success: true }); return; }

    const db = admin.firestore();
    const sessionSnap = await db.collection(COLLECTIONS.AI_CHECKINS).doc(session_id).get();
    if (!sessionSnap.exists) { res.json({ success: true }); return; }

    const sessionData = sessionSnap.data()!;
    const transcript: Array<{ role: string; content: string }> = sessionData.transcript || [];
    const orgId = individual.organizationId as string;

    if (transcript.length > 1) {
      const transcriptText = transcript
        .map((m) => `${m.role === "user" ? "Individual" : "Companion"}: ${m.content}`)
        .join("\n");

      const summaryResult = await generateCompletion(
        `You are a clinical documentation assistant for a case management organization.
Summarize this AI Care Companion check-in session in 3-4 sentences.
Be professional, factual, and concise.
Note: the person's mood and general wellbeing, any concerns or challenges mentioned, any positive progress or highlights, and whether any urgent issues arose.
Do NOT include any personally identifying information beyond first name.`,
        "Please summarize this check-in session:",
        transcriptText,
        "fast",
        orgId,
        "companion_bot",
        "companion_summary",
        { maxTokens: 200 },
      );

      await sessionSnap.ref.update({
        session_summary: summaryResult.text,
        review_status: "pending_review",
        ended_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Auto-create a work-queue task so the case manager sees this check-in
      const indName = [individual.first_name, individual.last_name].filter(Boolean).join(" ") || "Individual";
      const sessionDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1); // due tomorrow
      const dueMDY = `${dueDate.getMonth() + 1}/${dueDate.getDate()}/${dueDate.getFullYear()}`;
      await db.collection("tasks").add({
        title: `Review AI Care Companion session — ${indName}`,
        description: `AI Care Companion check-in on ${sessionDate}. Summary: ${summaryResult.text}`,
        individualId: individual.id,
        individualName: indName,
        organizationId: orgId,
        type: "AI Care Companion",
        priority: "medium",
        status: "open",
        source: "companion",
        sessionId: session_id,
        dueDate: dueMDY,
        assignedTo: individual.assigned_case_manager_uid ?? "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await consumeCredits({
        organizationId: orgId,
        userId: "companion_bot",
        userName: "Care Companion Bot",
        userRole: "system",
        feature: "companion_summary",
        model: "gemini-flash-latest",
        inputTokens: summaryResult.inputTokens,
        outputTokens: summaryResult.outputTokens,
        individualId: individual.id,
        sessionId: session_id,
      });
    } else {
      // Short session — just mark as ended
      await sessionSnap.ref.update({
        review_status: "no_content",
        ended_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[end-session] error:", error);
    res.json({ success: true }); // Never error on session end — it must always succeed
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /care-assistant/:token/agent-config
// Returns all configuration needed to initialise Deepgram Voice Agent in the
// browser: the API key, the compiled system prompt (instructions), the per-
// individual voice model, and the URL of our OpenAI-compatible LLM proxy.
// ─────────────────────────────────────────────────────────────────────────────
export async function companionAgentConfig(req: Request, res: Response): Promise<void> {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;

  // Strategy 1 — exact companion_token match
  let individual = await findIndividualByToken(token).catch(() => null);

  // Strategy 2 — decode individual ID from base64 token
  if (!individual) {
    try {
      const raw = token.startsWith("cmp_") ? token.slice(4) : token;
      const decoded = Buffer.from(raw, "base64").toString("utf8");
      const underscoreIdx = decoded.lastIndexOf("_");
      const individualId = underscoreIdx > 0 ? decoded.slice(0, underscoreIdx) : decoded;
      if (individualId) {
        const db = admin.firestore();
        const docSnap = await db.collection(COLLECTIONS.INDIVIDUALS).doc(individualId).get();
        if (docSnap.exists) individual = { id: docSnap.id, ...docSnap.data() } as Record<string, unknown> & { id: string };
      }
    } catch { /* ignore */ }
  }

  if (!individual) {
    res.status(403).json({ error: "Invalid companion link." });
    return;
  }

  const dgKey = process.env.DEEPGRAM_API_KEY ?? "";
  if (!dgKey || dgKey === "PASTE_YOUR_KEY_HERE") {
    res.status(503).json({ error: "Deepgram API key not configured." });
    return;
  }

  const db = admin.firestore();
  const cmSnap = individual.assigned_case_manager
    ? await db.collection(COLLECTIONS.USERS).doc(individual.assigned_case_manager as string).get().catch(() => null)
    : null;
  const cmName = cmSnap?.exists && cmSnap.data()
    ? `${cmSnap.data()!.firstName} ${cmSnap.data()!.lastName}`
    : "your case manager";

  const preferredName = ((individual.preferred_name || individual.first_name) as string) || "Friend";
  const county   = (individual.county   as string) || "";
  const programName = (individual.program as string) || "";
  const customPromptData = individual.companion_prompt as { content?: string } | null | undefined;
  const customInstructions = customPromptData?.content?.trim();
  const instructions = buildSystemPrompt(preferredName, county, cmName, programName, customInstructions);

  const voice         = (individual.companion_voice as string) || "aura-luna-en";
  const customLlmUrl  = `https://us-central1-casemanagement-ai.cloudfunctions.net/api/care-assistant/${token}/llm`;

  res.json({ dgKey, voice, instructions, customLlmUrl, firstName: preferredName });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /care-assistant/:token/llm
// OpenAI-compatible streaming LLM proxy used by Deepgram Voice Agent.
// Deepgram calls this URL with a standard chat-completions body; we call
// Gemini and re-emit the response as OpenAI SSE chunks.
// ─────────────────────────────────────────────────────────────────────────────
export async function companionLLMProxy(req: Request, res: Response): Promise<void> {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;

  // Identify individual so we can use the right system prompt
  let individual: (Record<string, unknown> & { id: string }) | null = null;
  try {
    individual = await findIndividualByToken(token);
    if (!individual) {
      const raw = token.startsWith("cmp_") ? token.slice(4) : token;
      const decoded = Buffer.from(raw, "base64").toString("utf8");
      const underscoreIdx = decoded.lastIndexOf("_");
      const individualId = underscoreIdx > 0 ? decoded.slice(0, underscoreIdx) : decoded;
      if (individualId) {
        const db = admin.firestore();
        const docSnap = await db.collection(COLLECTIONS.INDIVIDUALS).doc(individualId).get();
        if (docSnap.exists) individual = { id: docSnap.id, ...docSnap.data() } as Record<string, unknown> & { id: string };
      }
    }
  } catch { /* proceed with default prompt */ }

  // Build system prompt
  let systemPrompt = DEFAULT_COMPANION_PROMPT;
  if (individual) {
    try {
      const db = admin.firestore();
      const cmSnap = individual.assigned_case_manager
        ? await db.collection(COLLECTIONS.USERS).doc(individual.assigned_case_manager as string).get().catch(() => null)
        : null;
      const cmName = cmSnap?.exists && cmSnap.data()
        ? `${cmSnap.data()!.firstName} ${cmSnap.data()!.lastName}`
        : "your case manager";
      const preferredName = ((individual.preferred_name || individual.first_name) as string) || "Friend";
      const county   = (individual.county   as string) || "";
      const programName = (individual.program as string) || "";
      const customPromptData = individual.companion_prompt as { content?: string } | null | undefined;
      const customInstructions = customPromptData?.content?.trim();
      systemPrompt = buildSystemPrompt(preferredName, county, cmName, programName, customInstructions);
    } catch { /* use default */ }
  }

  // Parse incoming OpenAI-format body
  const body = req.body as {
    model?: string;
    messages?: Array<{ role: string; content: string }>;
    stream?: boolean;
  };
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];

  // Extract system message if Deepgram sent one (use it instead of our prompt)
  const incomingSystem = rawMessages.find((m) => m.role === "system");
  const effectiveSystem = incomingSystem?.content || systemPrompt;
  const conversationMsgs = rawMessages.filter((m) => m.role !== "system");

  // Convert to Gemini multi-turn format
  const geminiContents: Array<{ role: string; parts: Array<{ text: string }> }> =
    conversationMsgs.length > 0
      ? conversationMsgs.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content || " " }],
        }))
      : [{ role: "user", parts: [{ text: "Hello" }] }];

  // Stream via Vertex AI SDK — Application Default Credentials (no API key needed)
  const ai = getAiClient();
  const respId = `chatcmpl-${Date.now()}`;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: geminiContents,
      config: {
        systemInstruction: effectiveSystem,
        maxOutputTokens: 300,
        temperature: 0.75,
      },
    });

    for await (const chunk of stream) {
      const text: string = chunk.text ?? "";
      if (text) {
        const oaiChunk = {
          id: respId,
          object: "chat.completion.chunk",
          choices: [{ delta: { content: text }, index: 0, finish_reason: null }],
        };
        res.write(`data: ${JSON.stringify(oaiChunk)}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    console.error("[llm-proxy] Vertex AI SDK error:", err.message);
    res.write(`data: {"id":"llm-err","object":"chat.completion.chunk","choices":[{"delta":{"content":"I'm here for you. What's on your mind?"},"index":0}]}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /care-assistant/:token/deepgram-token
// Public — authenticated by the companion_token (not Firebase auth).
// Returns the Deepgram API key so the browser can open a WebSocket to
// Deepgram STT and call the Deepgram TTS API directly.
// The key is never bundled in the frontend — it is fetched fresh each session.
export async function companionDeepgramToken(req: Request, res: Response): Promise<void> {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;

  // Strategy 1: exact companion_token + companion_link_active match
  let individual = await findIndividualByToken(token);

  // Strategy 2: decode individual ID directly from the base64 token
  // Token format: cmp_<base64(individualId_timestamp)>
  if (!individual) {
    try {
      const raw = token.startsWith("cmp_") ? token.slice(4) : token;
      const decoded = Buffer.from(raw, "base64").toString("utf8");
      const underscoreIdx = decoded.lastIndexOf("_");
      const individualId = underscoreIdx > 0 ? decoded.slice(0, underscoreIdx) : decoded;
      if (individualId) {
        const db = admin.firestore();
        const docSnap = await db.collection(COLLECTIONS.INDIVIDUALS).doc(individualId).get();
        if (docSnap.exists) {
          individual = { id: docSnap.id, ...docSnap.data() } as Record<string, unknown> & { id: string };
        }
      }
    } catch (_) { /* ignore decode errors */ }
  }

  if (!individual) {
    res.status(403).json({ error: "Invalid companion link." });
    return;
  }

  const key = process.env.DEEPGRAM_API_KEY ?? "";
  if (!key || key === "PASTE_YOUR_KEY_HERE") {
    res.status(503).json({ error: "Deepgram API key not configured on server." });
    return;
  }

  res.json({ key });
}
