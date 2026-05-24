"use strict";
// Care Companion Bot API — Public endpoints (no auth token required)
// CaseManagement.AI — PRD v2.0
// Serves a standalone HTML page per individual. Uses Gemini Flash for warm chat.
// HIPAA: No PHI in URL params. Individual identified by companion_token only.
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
const COMPANION_SYSTEM_PROMPT = (firstName, preferredName, county, caseManagerName) => `You are a warm and supportive Care Companion for ${preferredName}, a person receiving case management services in ${county} County. Their case manager is ${caseManagerName}.

Your role:
- Check in on how they are doing
- Listen and respond warmly
- Help them feel heard and supported
- Note anything for their case manager

Communication rules:
- Keep responses SHORT — 2 to 3 sentences maximum
- Use SIMPLE words — no clinical language
- Be WARM, PATIENT, and ENCOURAGING always
- Use their preferred name: ${preferredName}
- Ask only ONE question per response if any
- Never rush them

SAFETY (highest priority):
If they say ANYTHING about:
- Being hurt, unsafe, someone hurting them
- A medical emergency or sudden health problem
- Feeling very sad, hopeless, or not wanting to be here
- A crisis at home, running away, danger

THEN: Start your response with exactly: [URGENT]
Stay very calm and supportive.
End with: "Your case manager will be contacted right away. If this is an emergency, please call 911. You can also call or text 988 for free 24/7 support."

NEVER:
- Diagnose anything
- Recommend medications or treatments
- Make decisions about care or services
- Share information about this person with anyone else`;
async function findIndividualByToken(token) {
    const db = admin.firestore();
    const snap = await db.collection(collections_1.COLLECTIONS.INDIVIDUALS)
        .where("companion_token", "==", String(token))
        .where("companion_link_active", "==", true)
        .limit(1)
        .get();
    if (snap.empty)
        return null;
    return Object.assign({ id: snap.docs[0].id }, snap.docs[0].data());
}
// GET /care-assistant/:token — Serve standalone chat HTML
async function companionGet(req, res) {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    const individual = await findIndividualByToken(token);
    if (!individual) {
        res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><title>Link Not Active</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f9fa;}
      .box{text-align:center;padding:2rem;max-width:400px;}</style></head>
      <body><div class="box"><h2>This link is not active</h2>
      <p>Please contact your case manager for a new link.</p></div></body></html>
    `);
        return;
    }
    // Update last used timestamp
    await admin.firestore().collection(collections_1.COLLECTIONS.INDIVIDUALS).doc(individual.id).update({
        companion_last_used: admin.firestore.FieldValue.serverTimestamp(),
    });
    const preferredName = (individual.preferred_name || individual.first_name);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Care Companion — ${preferredName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f4f8; height: 100dvh; display: flex; flex-direction: column; }
    header { background: #fff; padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }
    .logo { font-weight: 700; font-size: 0.9rem; color: #6366f1; }
    .user-name { font-size: 0.9rem; color: #64748b; font-weight: 500; }
    .chat-area { flex: 1; overflow-y: auto; padding: 1.5rem 1rem; display: flex; flex-direction: column; gap: 1rem; }
    .msg { display: flex; gap: 0.75rem; max-width: 85%; }
    .msg.bot { align-self: flex-start; }
    .msg.user { align-self: flex-end; flex-direction: row-reverse; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: #e0e7ff; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
    .bubble { padding: 0.75rem 1rem; border-radius: 1rem; font-size: 0.95rem; line-height: 1.5; }
    .bot .bubble { background: #fff; color: #1e293b; border-radius: 0.25rem 1rem 1rem 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .user .bubble { background: #0d9488; color: #fff; border-radius: 1rem 0.25rem 1rem 1rem; }
    .bubble.urgent { border: 2px solid #f59e0b; background: #fffbeb; }
    .urgent-banner { background: #fef3c7; border: 1px solid #f59e0b; padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; color: #92400e; }
    .ts { font-size: 0.7rem; color: #94a3b8; margin-top: 0.25rem; text-align: center; }
    .input-bar { background: #fff; border-top: 1px solid #e2e8f0; padding: 1rem; display: flex; gap: 0.5rem; align-items: flex-end; }
    .input-bar textarea { flex: 1; border: 1px solid #e2e8f0; border-radius: 1.5rem; padding: 0.75rem 1rem; font-size: 0.95rem; font-family: inherit; resize: none; max-height: 120px; outline: none; transition: border-color 0.15s; }
    .input-bar textarea:focus { border-color: #0d9488; }
    .send-btn { width: 44px; height: 44px; border-radius: 50%; background: #0d9488; border: none; color: #fff; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .mic-btn { width: 44px; height: 44px; border-radius: 50%; background: #f1f5f9; border: 1px solid #e2e8f0; color: #64748b; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .mic-btn.recording { background: #fee2e2; border-color: #f87171; color: #ef4444; }
    .typing { display: flex; gap: 4px; padding: 0.75rem 1rem; }
    .typing span { width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; animation: bounce 1.2s ease-in-out infinite; }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
  </style>
</head>
<body>
<header>
  <span class="logo">🤝 CaseManagement.AI</span>
  <span class="user-name">${preferredName}'s Care Companion</span>
</header>

<div class="chat-area" id="chat"></div>

<div class="input-bar">
  <button class="mic-btn" id="micBtn" title="Voice input" aria-label="Start voice input">🎙</button>
  <textarea id="msgInput" rows="1" placeholder="Type your message…" aria-label="Message input"></textarea>
  <button class="send-btn" id="sendBtn" aria-label="Send message">➤</button>
</div>

<script>
const TOKEN = ${JSON.stringify(req.params.token)};
const PREFERRED_NAME = ${JSON.stringify(preferredName)};
const BASE_URL = window.location.origin;
let sessionId = 'session_' + Date.now();
let isTyping = false;
let recognition = null;
let isRecording = false;
let inactivityTimer;

const chat = document.getElementById('chat');
const input = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');

function addMessage(role, text, isUrgent = false) {
  const wrapper = document.createElement('div');
  wrapper.className = 'msg ' + role;
  
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'bot' ? '🤝' : '👤';
  
  const bubble = document.createElement('div');
  bubble.className = 'bubble' + (isUrgent ? ' urgent' : '');
  bubble.textContent = text;
  
  const ts = document.createElement('div');
  ts.className = 'ts';
  ts.textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  
  wrapper.appendChild(avatar);
  const col = document.createElement('div');
  col.appendChild(bubble);
  col.appendChild(ts);
  wrapper.appendChild(col);
  
  if (isUrgent) {
    const banner = document.createElement('div');
    banner.className = 'urgent-banner';
    banner.textContent = 'Your case manager has been notified. Call 911 for emergencies · Text or call 988 for mental health support.';
    chat.appendChild(wrapper);
    chat.appendChild(banner);
  } else {
    chat.appendChild(wrapper);
  }
  chat.scrollTop = chat.scrollHeight;
}

function showTyping() {
  if (isTyping) return;
  isTyping = true;
  const wrapper = document.createElement('div');
  wrapper.className = 'msg bot';
  wrapper.id = 'typing-indicator';
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = '🤝';
  const typing = document.createElement('div');
  typing.className = 'typing';
  typing.innerHTML = '<span></span><span></span><span></span>';
  wrapper.appendChild(avatar);
  wrapper.appendChild(typing);
  chat.appendChild(wrapper);
  chat.scrollTop = chat.scrollHeight;
}

function hideTyping() {
  isTyping = false;
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text || sendBtn.disabled) return;
  
  input.value = '';
  input.style.height = 'auto';
  sendBtn.disabled = true;
  addMessage('user', text);
  resetInactivityTimer();
  
  showTyping();
  try {
    const resp = await fetch(BASE_URL + '/care-assistant/' + TOKEN + '/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, session_id: sessionId }),
    });
    const data = await resp.json();
    hideTyping();
    
    let display = data.response || 'I appreciate you sharing that with me.';
    const isUrgent = display.startsWith('[URGENT]');
    if (isUrgent) display = display.replace('[URGENT]', '').trim();
    
    addMessage('bot', display, isUrgent);
    if (data.sessionId) sessionId = data.sessionId;
  } catch {
    hideTyping();
    addMessage('bot', 'I\\'m having a little trouble connecting. Please try again in a moment.');
  }
  sendBtn.disabled = false;
  input.focus();
}

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(endSession, 30 * 60 * 1000);
}

async function endSession() {
  try {
    await fetch(BASE_URL + '/care-assistant/' + TOKEN + '/end-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
  } catch {}
}

// Input auto-resize
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
});
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
sendBtn.addEventListener('click', sendMessage);

// Voice input (Web Speech API)
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = (e) => { input.value = e.results[0][0].transcript; };
  recognition.onend = () => { isRecording = false; micBtn.classList.remove('recording'); };
  micBtn.addEventListener('click', () => {
    if (isRecording) { recognition.stop(); } 
    else { recognition.start(); isRecording = true; micBtn.classList.add('recording'); }
  });
} else {
  micBtn.style.display = 'none';
}

// End session on page close
window.addEventListener('beforeunload', endSession);

// Opening message
addMessage('bot', 'Hi ' + PREFERRED_NAME + '! I\\'m your Care Companion. I\\'m here whenever you want to check in. How are you doing today?');
resetInactivityTimer();
</script>
</body>
</html>`);
}
// POST /care-assistant/:token/message
async function companionMessage(req, res) {
    try {
        const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
        const individual = await findIndividualByToken(token);
        if (!individual) {
            res.status(404).json({ error: "Invalid link" });
            return;
        }
        const { message, session_id } = req.body;
        if (!message) {
            res.status(400).json({ error: "Message required" });
            return;
        }
        const db = admin.firestore();
        // Get or create session
        let sessionRef;
        let sessionData;
        if (session_id && session_id !== "session_" + session_id.split("_")[1]) {
            // Try to load existing session
            const existingSnap = await db.collection(collections_1.COLLECTIONS.AI_CHECKINS).doc(session_id).get();
            if (existingSnap.exists) {
                sessionRef = existingSnap.ref;
                sessionData = existingSnap.data();
            }
            else {
                // Create new session
                const newSession = {
                    individualId: individual.id,
                    organizationId: individual.organizationId,
                    assigned_case_manager: individual.assigned_case_manager,
                    companion_token: req.params.token,
                    session_date: admin.firestore.FieldValue.serverTimestamp(),
                    duration_seconds: 0,
                    message_count: 0,
                    transcript: [],
                    urgency_flagged: false,
                    review_status: "pending_review",
                };
                sessionRef = db.collection(collections_1.COLLECTIONS.AI_CHECKINS).doc();
                await sessionRef.set(newSession);
                sessionData = newSession;
            }
        }
        else {
            // Create new session
            const newSession = {
                individualId: individual.id,
                organizationId: individual.organizationId,
                assigned_case_manager: individual.assigned_case_manager,
                companion_token: req.params.token,
                session_date: admin.firestore.FieldValue.serverTimestamp(),
                duration_seconds: 0,
                message_count: 0,
                transcript: [],
                urgency_flagged: false,
                review_status: "pending_review",
            };
            sessionRef = db.collection(collections_1.COLLECTIONS.AI_CHECKINS).doc();
            await sessionRef.set(newSession);
            sessionData = newSession;
        }
        // Load case manager name
        const cmSnap = individual.assigned_case_manager
            ? await db.collection(collections_1.COLLECTIONS.USERS).doc(individual.assigned_case_manager).get()
            : null;
        const cmName = (cmSnap === null || cmSnap === void 0 ? void 0 : cmSnap.data())
            ? `${cmSnap.data().firstName} ${cmSnap.data().lastName}`
            : "your case manager";
        const preferredName = (individual.preferred_name || individual.first_name);
        const county = (individual.county || "your");
        const orgId = individual.organizationId;
        // Build conversation history from last 20 messages
        const transcript = sessionData.transcript || [];
        const recentHistory = transcript.slice(-20)
            .map((m) => `${m.role === "user" ? preferredName : "Companion"}: ${m.content}`)
            .join("\n");
        const systemPrompt = COMPANION_SYSTEM_PROMPT(individual.first_name, preferredName, county, cmName);
        const contextWithHistory = recentHistory ? `Previous conversation:\n${recentHistory}` : "";
        const result = await (0, ai_1.generateCompletion)(systemPrompt, message, contextWithHistory, "companion", orgId, "companion_bot", "companion_message", { maxTokens: 256, temperature: 0.7 });
        const responseText = result.text;
        const isUrgent = responseText.includes("[URGENT]");
        const now = new Date().toISOString();
        // Update transcript
        const updatedTranscript = [
            ...transcript,
            { role: "user", content: message, timestamp: now },
            { role: "assistant", content: responseText, timestamp: now },
        ];
        const sessionUpdates = {
            transcript: updatedTranscript,
            message_count: admin.firestore.FieldValue.increment(2),
        };
        if (isUrgent && !sessionData.urgency_flagged) {
            sessionUpdates.urgency_flagged = true;
            sessionUpdates.urgency_content = message;
            // Create urgent task for case manager
            if (individual.assigned_case_manager) {
                await db.collection(collections_1.COLLECTIONS.WORKFLOW_TASKS).add({
                    individualId: individual.id,
                    organizationId: orgId,
                    assigned_to: individual.assigned_case_manager,
                    created_by: "system",
                    title: `URGENT: ${preferredName} flagged a concern in Care Companion check-in`,
                    description: `Individual said: "${message}"\nPlease follow up immediately.`,
                    task_type: "urgent_followup",
                    due_date: new Date().toISOString(),
                    status: "pending_start",
                    priority: "critical",
                    ai_generated: true,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                // Notify case manager
                await db.collection(collections_1.COLLECTIONS.NOTIFICATIONS).add({
                    organizationId: orgId,
                    user_id: individual.assigned_case_manager,
                    type: "urgent_checkin",
                    title: `⚠️ URGENT: ${preferredName} needs immediate follow-up`,
                    body: `Care Companion flagged an urgent concern. Please review immediately.`,
                    linked_route: `/my-work`,
                    read: false,
                    priority: "critical",
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        await sessionRef.update(sessionUpdates);
        // Consume credits
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
        console.error("[companion-message]", error);
        res.status(500).json({
            response: "I'm having a little trouble right now. Please try again in a moment.",
            urgent: false,
        });
    }
}
// POST /care-assistant/:token/end-session
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
        // Generate session summary
        if (transcript.length > 0) {
            const transcriptText = transcript
                .map((m) => `${m.role === "user" ? "Individual" : "Companion"}: ${m.content}`)
                .join("\n");
            const summaryResult = await (0, ai_1.generateCompletion)("You are a clinical documentation assistant. Summarize this Care Companion session in 2-3 sentences. Be professional, factual, and note any concerns raised.", "Please summarize this check-in session:", transcriptText, "fast", orgId, "companion_bot", "companion_summary", { maxTokens: 150 });
            await sessionSnap.ref.update({
                session_summary: summaryResult.text,
                review_status: "pending_review",
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
        res.json({ success: true });
    }
    catch (error) {
        console.error("[end-session]", error);
        res.json({ success: true }); // Never error on session end
    }
}
//# sourceMappingURL=companion.js.map