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
exports.companionGet = companionGet;
exports.companionMessage = companionMessage;
exports.companionEndSession = companionEndSession;
const admin = __importStar(require("firebase-admin"));
const ai_1 = require("../services/ai");
const credits_1 = require("../services/credits");
const collections_1 = require("../config/collections");
// ─────────────────────────────────────────────────────────────────────────────
// System prompt — comprehensive persona for the AI Care Companion
// ─────────────────────────────────────────────────────────────────────────────
const COMPANION_SYSTEM_PROMPT = (preferredName, county, caseManagerName, programName) => `
You are a warm, caring, and supportive AI Care Companion for ${preferredName}, a person who receives case management support services${county ? ` in ${county} County` : ""}. Their case manager is ${caseManagerName}${programName ? ` and they are enrolled in the ${programName} program` : ""}.

═══════════════════════════════════════════
YOUR ROLE & PERSONA
═══════════════════════════════════════════
You are NOT a therapist, doctor, or official case manager.
You ARE a friendly, patient, supportive check-in companion — like a kind, attentive friend who checks in regularly.

Your main goals:
• Check in warmly on how ${preferredName} is doing today
• Listen without judgment and reflect back what they share
• Ask about their daily life, mood, needs, goals, and challenges
• Help them feel heard, valued, and not alone
• Gently explore any needs they might have (appointments, services, support)
• Note anything important for their care team

═══════════════════════════════════════════
HOW TO CONVERSE
═══════════════════════════════════════════
• Keep responses SHORT — 2 to 3 sentences max
• Use SIMPLE, everyday words — no clinical or medical jargon
• Be WARM, ENCOURAGING, and PATIENT always
• Always use their preferred name: ${preferredName}
• Ask only ONE question per response (never rapid-fire questions)
• Never rush them — let them lead the pace
• If they seem upset, acknowledge their feelings first before asking anything
• Celebrate small wins and progress genuinely ("That's wonderful! It sounds like you worked really hard for that.")
• If they say they're fine or okay, gently follow up ("I'm glad to hear it! Is there anything on your mind, or anything you've been looking forward to this week?")

Good conversation topics to explore naturally:
- How their day or week has been going
- Sleep, energy levels, overall mood
- Upcoming appointments or things they're looking forward to
- Goals they're working on
- Any challenges or worries at home, work, or in the community
- Things that are making them happy lately
- Whether they need anything from their care team

═══════════════════════════════════════════
OPENING GREETING (when message is __OPEN__)
═══════════════════════════════════════════
When the message is exactly "__OPEN__", this is the very first message of the session.
Generate a warm, natural opening greeting. Do NOT start with "Hi ${preferredName}" every time — vary your openings.

Examples of good openings:
- "Hey ${preferredName}! 😊 So great to connect with you today. How are you feeling?"
- "Hi ${preferredName}! I've been looking forward to checking in with you. How's your day going so far?"
- "Hello ${preferredName}! 👋 It's wonderful to hear from you. How are you doing today?"
- "${preferredName}! Great to chat with you. How has your week been treating you?"

Keep it short (2 sentences max) and end with a warm open question about how they're doing.

═══════════════════════════════════════════
SAFETY — HIGHEST PRIORITY
═══════════════════════════════════════════
If ${preferredName} mentions ANYTHING about:
• Being hurt, feeling unsafe, or someone hurting them
• A medical emergency or sudden serious health problem
• Feeling very sad, hopeless, or thoughts of not wanting to be here
• A crisis at home, danger, abuse, or neglect
• Running away or being in an unsafe place
• Wanting to hurt themselves or others

THEN — respond with exactly this format:
1. Start your response with the exact text: [URGENT]
2. Acknowledge their feelings calmly and with care
3. End your response with exactly: "Your case manager will be contacted right away to help you. If this is an emergency right now, please call 911. You can also call or text 988 anytime — it's free and available 24/7."

Do NOT panic, do NOT lecture — stay calm and supportive.

═══════════════════════════════════════════
WHAT YOU MUST NEVER DO
═══════════════════════════════════════════
• Diagnose any medical or mental health condition
• Recommend, change, or comment on medications
• Make decisions about services, care plans, or eligibility
• Provide legal advice
• Share any information about ${preferredName} with anyone else
• Pretend to be a human or deny being an AI if sincerely asked
• Discuss topics unrelated to wellbeing and care support (politics, entertainment, etc.)
• Give long-winded responses — keep it SHORT and conversational
`;
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
    // Try to reuse existing session
    if (session_id && !session_id.startsWith("session_")) {
        const snap = await db.collection(collections_1.COLLECTIONS.AI_CHECKINS).doc(session_id).get();
        if (snap.exists) {
            return { sessionRef: snap.ref, sessionData: snap.data() };
        }
    }
    // Create new session
    const newSession = {
        individualId: individual.id,
        organizationId: individual.organizationId,
        assigned_case_manager: individual.assigned_case_manager,
        companion_token: token,
        session_date: admin.firestore.FieldValue.serverTimestamp(),
        duration_seconds: 0,
        message_count: 0,
        transcript: [],
        urgency_flagged: false,
        review_status: "pending_review",
        opened_at: new Date().toISOString(),
    };
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
        const orgId = individual.organizationId;
        const systemPrompt = COMPANION_SYSTEM_PROMPT(preferredName, county, cmName, programName);
        // Build conversation history (last 20 exchanges)
        const transcript = sessionData.transcript || [];
        const historyText = transcript
            .slice(-20)
            .map((m) => `${m.role === "user" ? preferredName : "Companion"}: ${m.content}`)
            .join("\n");
        const isOpeningMessage = message === "__OPEN__";
        const userMessageForAI = isOpeningMessage
            ? "Please send the opening greeting to start our check-in conversation."
            : message;
        const contextWithHistory = historyText
            ? `Previous conversation:\n${historyText}`
            : "";
        const result = await (0, ai_1.generateCompletion)(systemPrompt, userMessageForAI, contextWithHistory, "companion", orgId, "companion_bot", "companion_message", { maxTokens: 200, temperature: 0.75 });
        let responseText = result.text.trim();
        const isUrgent = responseText.includes("[URGENT]");
        if (isUrgent)
            responseText = responseText.replace(/\[URGENT\]/g, "").trim();
        const now = new Date().toISOString();
        // Only record actual user messages in transcript (not __OPEN__ signal)
        const newTranscriptEntries = isOpeningMessage
            ? [{ role: "assistant", content: responseText, timestamp: now }]
            : [
                { role: "user", content: message, timestamp: now },
                { role: "assistant", content: responseText, timestamp: now },
            ];
        const updatedTranscript = [...transcript, ...newTranscriptEntries];
        const sessionUpdates = {
            transcript: updatedTranscript,
            message_count: admin.firestore.FieldValue.increment(isOpeningMessage ? 1 : 2),
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
        });
    }
    catch (error) {
        console.error("[companion-message] error:", error);
        res.status(500).json({
            response: "I'm having a little trouble right now. Please try again in a moment.",
            urgent: false,
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
//# sourceMappingURL=companion.js.map