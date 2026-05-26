"use strict";
// Care Companion Bot API — Public endpoints (no Firebase Auth required)
// CaseManagement.AI — PRD v2.0
// HIPAA: No PHI in URLs. Individuals identified by companion_token only.
//
// Routes (registered in index.ts):
//   GET  /care-assistant/:token           → redirect to React SPA
//   POST /care-assistant/:token/message   → AI chat response
//   POST /care-assistant/:token/end-session → summarise + close session
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COMPANION_PROMPT = void 0;
exports.companionGet = companionGet;
exports.companionMessage = companionMessage;
exports.companionEndSession = companionEndSession;
exports.companionDeepgramToken = companionDeepgramToken;
const admin = __importStar(require("firebase-admin"));
const ai_1 = require("../services/ai");
const credits_1 = require("../services/credits");
const collections_1 = require("../config/collections");
// ────────────────────────────────────────────────────────────────────────────────
// DEFAULT_COMPANION_PROMPT — used when no custom prompt is set for an individual.
// This is the authoritative default. Also exported as a string so the frontend
// can display it in the "Reset to Default" button in the Customize Prompt modal.
// ────────────────────────────────────────────────────────────────────────────────
exports.DEFAULT_COMPANION_PROMPT = `You are a warm, patient, and supportive AI companion for someone who receives case management support services. Your job is to be a friendly presence they can talk to anytime — day or night.

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
// ── Build the final system prompt for a session ────────────────────────────
// Injects individual-specific context (name, case manager, program) and
// prepends any custom per-individual instructions when set.
function buildSystemPrompt(preferredName, county, caseManagerName, programName, customInstructions) {
    const contextBlock = [
        `Individual context for this session:`,
        `- Individual's preferred name: ${preferredName}`,
        `- Case manager / service coordinator: ${caseManagerName}`,
        county ? `- County: ${county}` : "",
        programName ? `- Program: ${programName}` : "",
    ].filter(Boolean).join("\n");
    const basePrompt = `${contextBlock}\n\n${exports.DEFAULT_COMPANION_PROMPT}`;
    if (customInstructions === null || customInstructions === void 0 ? void 0 : customInstructions.trim()) {
        return `COMPANION INSTRUCTIONS FOR THIS INDIVIDUAL (set by their care team — highest priority):\n${customInstructions.trim()}\n\nAlways follow the above instructions when interacting with this individual. They take priority over general guidelines.\n\n${basePrompt}`;
    }
    return basePrompt;
}
// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
async function findIndividualByToken(token) {
    const db = admin.firestore();
    const snap = await db
        .collection(collections_1.COLLECTIONS.INDIVIDUALS)
        .where("companion_token", "==", String(token))
        .where("companion_link_active", "==", true)
        .limit(1)
        .get();
    if (snap.empty)
        return null;
    return Object.assign({ id: snap.docs[0].id }, snap.docs[0].data());
}
async function getOrCreateSession(db, session_id, individual, token) {
    var _a, _b;
    // Try to reuse existing session
    if (session_id && !session_id.startsWith("session_")) {
        const snap = await db.collection(collections_1.COLLECTIONS.AI_CHECKINS).doc(session_id).get();
        if (snap.exists) {
            return { sessionRef: snap.ref, sessionData: snap.data() };
        }
    }
    // Build session — strip any undefined fields so Firestore doesn't reject them
    const newSession = {
        individualId: individual.id,
        organizationId: (_a = individual.organizationId) !== null && _a !== void 0 ? _a : null,
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
        newSession.assigned_case_manager = (_b = individual.assigned_case_manager) !== null && _b !== void 0 ? _b : null;
    }
    const ref = db.collection(collections_1.COLLECTIONS.AI_CHECKINS).doc();
    await ref.set(newSession);
    return { sessionRef: ref, sessionData: newSession };
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /care-assistant/:token
// Redirects to the React SPA — CareAssistant.tsx handles the full UI.
// Updates last-used timestamp as a side-effect.
// ─────────────────────────────────────────────────────────────────────────────
async function companionGet(req, res) {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    // Determine origin from headers (works on Cloud Run / Firebase Hosting)
    const host = req.headers["x-forwarded-host"] ||
        req.headers.host ||
        "casemanagement-ai.web.app";
    const proto = req.headers["x-forwarded-proto"] || "https";
    const origin = `${proto}://${host}`;
    // Update last-used (best-effort, don't block redirect)
    try {
        const individual = await findIndividualByToken(token);
        if (individual) {
            await admin.firestore().collection(collections_1.COLLECTIONS.INDIVIDUALS).doc(individual.id).update({
                companion_last_used: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }
    catch (_a) {
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
async function companionMessage(req, res) {
    var _a, _b, _c, _d;
    try {
        const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
        const individual = await findIndividualByToken(token);
        if (!individual) {
            res.status(404).json({ error: "Invalid or expired companion link" });
            return;
        }
        const { message, session_id } = req.body;
        if (!message) {
            res.status(400).json({ error: "message is required" });
            return;
        }
        const db = admin.firestore();
        const { sessionRef, sessionData } = await getOrCreateSession(db, session_id, individual, token);
        // Load case manager name
        const cmSnap = individual.assigned_case_manager
            ? await db.collection(collections_1.COLLECTIONS.USERS).doc(individual.assigned_case_manager).get()
            : null;
        const cmName = (cmSnap === null || cmSnap === void 0 ? void 0 : cmSnap.exists) && cmSnap.data()
            ? `${cmSnap.data().firstName} ${cmSnap.data().lastName}`
            : "your case manager";
        const preferredName = (individual.preferred_name || individual.first_name) || "Friend";
        const county = individual.county || "";
        const programName = individual.program || "";
        // Fall back to known org if missing — companion should always work
        const orgId = individual.organizationId || "demo-org-001";
        const console_log_line = `[companion] individual=${individual.id} orgId=${orgId} preferredName=${preferredName}`;
        console.log(console_log_line);
        // ── Build system prompt (uses DEFAULT_COMPANION_PROMPT; custom overrides applied first) ──
        const customPromptData = individual.companion_prompt;
        const customInstructions = (_a = customPromptData === null || customPromptData === void 0 ? void 0 : customPromptData.content) === null || _a === void 0 ? void 0 : _a.trim();
        const systemPrompt = buildSystemPrompt(preferredName, county, cmName, programName, customInstructions);
        // Build conversation history (last 20 exchanges)
        const transcript = sessionData.transcript || [];
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
            let greetingText;
            try {
                const greetingResult = await (0, ai_1.generateCompletion)(systemPrompt, "Please send the opening greeting to start our check-in conversation.", "", "companion", orgId, "companion_bot", "companion_message", { maxTokens: 120, temperature: 0.85 });
                greetingText = greetingResult.text.trim() ||
                    `Hi ${preferredName}! I'm your AI companion. I'm here to chat, check in with you, and help get messages to the right people. What's on your mind today?`;
            }
            catch (greetingErr) {
                console.error("[companion] greeting AI failed — using hardcoded greeting:", (_b = greetingErr === null || greetingErr === void 0 ? void 0 : greetingErr.message) !== null && _b !== void 0 ? _b : greetingErr);
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
        // ── Regular user message — call AI with history ───────────────────────────
        const result = await (0, ai_1.generateCompletion)(systemPrompt, message, contextWithHistory, "companion", orgId, "companion_bot", "companion_message", { maxTokens: 200, temperature: 0.75 });
        let responseText = result.text.trim();
        const isUrgent = responseText.includes("[URGENT]");
        if (isUrgent)
            responseText = responseText.replace(/\[URGENT\]/g, "").trim();
        const now = new Date().toISOString();
        // At this point message is always a real user message (__OPEN__ returns early above)
        const newTranscriptEntries = [
            { role: "user", content: message, timestamp: now },
            { role: "assistant", content: responseText, timestamp: now },
        ];
        const updatedTranscript = [...transcript, ...newTranscriptEntries];
        const sessionUpdates = {
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
                    db.collection(collections_1.COLLECTIONS.WORKFLOW_TASKS).add({
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
                    db.collection(collections_1.COLLECTIONS.NOTIFICATIONS).add({
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
        await (0, credits_1.consumeCredits)({
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
    }
    catch (error) {
        console.error("[companion-message] error (first attempt):", (_c = error === null || error === void 0 ? void 0 : error.message) !== null && _c !== void 0 ? _c : error);
        // Auto-retry once after a short delay — handles Gemini cold-start timeouts
        try {
            await new Promise((r) => setTimeout(r, 2500));
            const orgId = (await (async () => {
                const token2 = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
                const ind2 = await findIndividualByToken(token2);
                return (ind2 === null || ind2 === void 0 ? void 0 : ind2.organizationId) || "demo-org-001";
            })());
            const { message: msg2, session_id: sid2 } = req.body;
            const token2 = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
            const ind2 = await findIndividualByToken(token2);
            if (ind2) {
                const prefName2 = (ind2.preferred_name || ind2.first_name) || "Friend";
                const county2 = ind2.county || "";
                const programName2 = ind2.program || "";
                const db2 = admin.firestore();
                const cmSnap2 = ind2.assigned_case_manager
                    ? await db2.collection(collections_1.COLLECTIONS.USERS).doc(ind2.assigned_case_manager).get()
                    : null;
                const cmName2 = (cmSnap2 === null || cmSnap2 === void 0 ? void 0 : cmSnap2.exists) && cmSnap2.data()
                    ? `${cmSnap2.data().firstName} ${cmSnap2.data().lastName}`
                    : "your case manager";
                const retryResult = await (0, ai_1.generateCompletion)(buildSystemPrompt(prefName2, county2, cmName2, programName2), msg2 === "__OPEN__" ? "Please send the opening greeting to start our check-in conversation." : msg2, "", "companion", orgId, "companion_bot", "companion_message", { maxTokens: 200, temperature: 0.75 });
                let retryText = retryResult.text.trim();
                const retryUrgent = retryText.includes("[URGENT]");
                if (retryUrgent)
                    retryText = retryText.replace(/\[URGENT\]/g, "").trim();
                res.json({ response: retryText, sessionId: sid2, urgent: retryUrgent, firstName: prefName2 });
                return;
            }
        }
        catch (retryErr) {
            console.error("[companion-message] retry also failed:", (_d = retryErr === null || retryErr === void 0 ? void 0 : retryErr.message) !== null && _d !== void 0 ? _d : retryErr);
        }
        // Final fallback — still warm and friendly, never exposes an error to the individual
        // Attempt one last lightweight name lookup so the greeting uses their name
        let fallbackName = "Friend";
        try {
            const tkFb = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
            const indFb = await findIndividualByToken(tkFb);
            if (indFb)
                fallbackName = (indFb.preferred_name || indFb.first_name) || "Friend";
        }
        catch ( /* best-effort */_e) { /* best-effort */ }
        res.json({
            response: `Hi${fallbackName !== "Friend" ? ` ${fallbackName}` : ""}! I'm your AI companion. I'm here to chat and check in with you. How are you doing today?`,
            urgent: false,
            firstName: fallbackName,
        });
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// POST /care-assistant/:token/end-session
// Generates a clinical summary of the session for the case manager.
// ─────────────────────────────────────────────────────────────────────────────
async function companionEndSession(req, res) {
    try {
        const { session_id } = req.body;
        if (!session_id) {
            res.json({ success: true });
            return;
        }
        const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
        const individual = await findIndividualByToken(token);
        if (!individual) {
            res.json({ success: true });
            return;
        }
        const db = admin.firestore();
        const sessionSnap = await db.collection(collections_1.COLLECTIONS.AI_CHECKINS).doc(session_id).get();
        if (!sessionSnap.exists) {
            res.json({ success: true });
            return;
        }
        const sessionData = sessionSnap.data();
        const transcript = sessionData.transcript || [];
        const orgId = individual.organizationId;
        if (transcript.length > 1) {
            const transcriptText = transcript
                .map((m) => `${m.role === "user" ? "Individual" : "Companion"}: ${m.content}`)
                .join("\n");
            const summaryResult = await (0, ai_1.generateCompletion)(`You are a clinical documentation assistant for a case management organization.
Summarize this AI Care Companion check-in session in 3-4 sentences.
Be professional, factual, and concise.
Note: the person's mood and general wellbeing, any concerns or challenges mentioned, any positive progress or highlights, and whether any urgent issues arose.
Do NOT include any personally identifying information beyond first name.`, "Please summarize this check-in session:", transcriptText, "fast", orgId, "companion_bot", "companion_summary", { maxTokens: 200 });
            await sessionSnap.ref.update({
                session_summary: summaryResult.text,
                review_status: "pending_review",
                ended_at: admin.firestore.FieldValue.serverTimestamp(),
            });
            await (0, credits_1.consumeCredits)({
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
        }
        else {
            // Short session — just mark as ended
            await sessionSnap.ref.update({
                review_status: "no_content",
                ended_at: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error("[end-session] error:", error);
        res.json({ success: true }); // Never error on session end — it must always succeed
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// POST /care-assistant/:token/deepgram-token
// Public — authenticated by the companion_token (not Firebase auth).
// Returns the Deepgram API key so the browser can open a WebSocket to
// Deepgram STT and call the Deepgram TTS API directly.
// The key is never bundled in the frontend — it is fetched fresh each session.
async function companionDeepgramToken(req, res) {
    var _a;
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
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
                const docSnap = await db.collection(collections_1.COLLECTIONS.INDIVIDUALS).doc(individualId).get();
                if (docSnap.exists) {
                    individual = Object.assign({ id: docSnap.id }, docSnap.data());
                }
            }
        }
        catch (_) { /* ignore decode errors */ }
    }
    if (!individual) {
        res.status(403).json({ error: "Invalid companion link." });
        return;
    }
    const key = (_a = process.env.DEEPGRAM_API_KEY) !== null && _a !== void 0 ? _a : "";
    if (!key || key === "PASTE_YOUR_KEY_HERE") {
        res.status(503).json({ error: "Deepgram API key not configured on server." });
        return;
    }
    res.json({ key });
}
//# sourceMappingURL=companion.js.map