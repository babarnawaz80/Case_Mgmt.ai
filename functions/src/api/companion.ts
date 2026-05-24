// Care Companion Bot API — Public endpoints (no auth token required)
// CaseManagement.AI — PRD v2.0
// Serves a standalone HTML page per individual. Uses Gemini Flash for warm chat.
// HIPAA: No PHI in URL params. Individual identified by companion_token only.

import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { generateCompletion } from "../services/ai";
import { consumeCredits } from "../services/credits";
import { COLLECTIONS } from "../config/collections";

const COMPANION_SYSTEM_PROMPT = (firstName: string, preferredName: string, county: string, caseManagerName: string) =>
  `You are a warm and supportive Care Companion for ${preferredName}, a person receiving case management services in ${county} County. Their case manager is ${caseManagerName}.

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

async function findIndividualByToken(token: string) {
  const db = admin.firestore();
  const snap = await db.collection(COLLECTIONS.INDIVIDUALS)
    .where("companion_token", "==", String(token))
    .where("companion_link_active", "==", true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Record<string, unknown> & { id: string };
}

// GET /care-assistant/:token — Serve standalone chat HTML
export async function companionGet(req: Request, res: Response): Promise<void> {
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
  await admin.firestore().collection(COLLECTIONS.INDIVIDUALS).doc(individual.id).update({
    companion_last_used: admin.firestore.FieldValue.serverTimestamp(),
  });

  const preferredName = (individual.preferred_name || individual.first_name) as string;

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
    html, body {
      height: 100%; height: 100dvh;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
      color: #e8eaf6;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── Header ── */
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.25rem;
      border-bottom: 1px solid rgba(108,99,255,0.2);
      background: rgba(15,15,26,0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      flex-shrink: 0;
    }
    .header-left { display: flex; align-items: center; gap: 0.65rem; }
    .h-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, #6c63ff, #a855f7);
      box-shadow: 0 0 16px rgba(108,99,255,0.4);
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; flex-shrink: 0; position: relative;
    }
    .h-avatar::after {
      content: '';
      position: absolute; bottom: -1px; right: -1px;
      width: 11px; height: 11px; border-radius: 50%;
      background: #4caf50;
      border: 2px solid #0f0f1a;
    }
    .h-title { font-size: 0.8125rem; font-weight: 600; color: #e8eaf6; line-height: 1.2; }
    .h-sub { font-size: 0.6875rem; color: #9fa8da; display: flex; align-items: center; gap: 0.3rem; margin-top: 0.1rem; }
    .h-dot { width: 6px; height: 6px; border-radius: 50%; background: #4caf50; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .logo-text { font-size: 0.8rem; font-weight: 700; color: #6c63ff; letter-spacing: -0.01em; }
    .end-btn {
      height: 30px; padding: 0 0.75rem; border-radius: 0.5rem;
      background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.2);
      color: #f87171; font-size: 0.6875rem; font-weight: 600;
      cursor: pointer; display: flex; align-items: center; gap: 0.35rem;
      font-family: inherit; transition: opacity 0.15s;
    }
    .end-btn:hover { opacity: 0.8; }

    /* ── Chat area ── */
    .chat-area {
      flex: 1; overflow-y: auto; padding: 1.25rem 1rem;
      display: flex; flex-direction: column; gap: 1rem;
      scroll-behavior: smooth;
    }
    .chat-area::-webkit-scrollbar { width: 4px; }
    .chat-area::-webkit-scrollbar-track { background: transparent; }
    .chat-area::-webkit-scrollbar-thumb { background: rgba(108,99,255,0.25); border-radius: 2px; }

    .msg-row { display: flex; align-items: flex-end; gap: 0.5rem; }
    .msg-row.user { flex-direction: row-reverse; }

    .msg-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(135deg, #6c63ff, #a855f7);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.85rem; flex-shrink: 0;
    }

    .bubble {
      padding: 0.75rem 1rem;
      font-size: 0.875rem; line-height: 1.55;
      max-width: 82%;
    }
    .bubble.bot {
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(108,99,255,0.2);
      border-radius: 1rem 1rem 1rem 0.25rem;
      color: #e8eaf6;
    }
    .bubble.user {
      background: linear-gradient(135deg, #6c63ff, #a855f7);
      border-radius: 1rem 1rem 0.25rem 1rem;
      color: #fff;
    }
    .bubble.urgent {
      border: 1.5px solid #f59e0b;
      background: rgba(245,158,11,0.1);
    }
    .urgent-banner {
      margin-left: 2.25rem;
      background: rgba(245,158,11,0.12);
      border: 1px solid rgba(245,158,11,0.35);
      padding: 0.6rem 0.9rem;
      border-radius: 0.6rem;
      font-size: 0.78rem;
      color: #fcd34d;
    }
    .ts {
      font-size: 0.65rem; color: #5c6bc0;
      text-align: center; margin-top: 0.1rem;
      padding: 0 0.5rem;
    }
    .msg-col { display: flex; flex-direction: column; max-width: 82%; }
    .msg-row.user .msg-col { align-items: flex-end; }

    /* ── Typing indicator ── */
    .typing-row { display: flex; align-items: flex-end; gap: 0.5rem; }
    .typing-bubble {
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(108,99,255,0.2);
      border-radius: 1rem 1rem 1rem 0.25rem;
      padding: 0.75rem 1rem;
      display: flex; gap: 5px; align-items: center;
    }
    .dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: rgba(108,99,255,0.65);
      animation: dotBounce 1.2s ease-in-out infinite;
    }
    .dot:nth-child(2) { animation-delay: 0.15s; }
    .dot:nth-child(3) { animation-delay: 0.3s; }
    @keyframes dotBounce { 0%,60%,100%{transform:translateY(0);opacity:0.5} 30%{transform:translateY(-5px);opacity:1} }

    /* ── Input bar ── */
    .input-bar {
      padding: 0.75rem 1rem 1rem;
      border-top: 1px solid rgba(108,99,255,0.15);
      background: rgba(15,15,26,0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      flex-shrink: 0;
    }
    .input-wrap {
      display: flex; align-items: flex-end; gap: 0.5rem;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(108,99,255,0.2);
      border-radius: 1rem;
      padding: 0.6rem 0.65rem 0.6rem 1rem;
      transition: border-color 0.15s;
    }
    .input-wrap:focus-within { border-color: rgba(108,99,255,0.5); }
    .input-wrap textarea {
      flex: 1; background: transparent; border: none; outline: none;
      font-size: 0.875rem; font-family: inherit; color: #e8eaf6;
      resize: none; max-height: 120px; line-height: 1.5;
      overflow-y: auto; padding: 0;
    }
    .input-wrap textarea::placeholder { color: rgba(159,168,218,0.35); }
    .mic-btn {
      width: 36px; height: 36px; border-radius: 0.65rem;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(108,99,255,0.18);
      color: #9fa8da; font-size: 1rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: all 0.15s; font-family: inherit;
    }
    .mic-btn.recording { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: #f87171; }
    .mic-btn:hover { background: rgba(108,99,255,0.12); }
    .send-btn {
      width: 36px; height: 36px; border-radius: 0.65rem;
      background: linear-gradient(135deg, #6c63ff, #a855f7);
      box-shadow: 0 2px 10px rgba(108,99,255,0.35);
      border: none; color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: all 0.15s; font-size: 0.9rem;
    }
    .send-btn:disabled { opacity: 0.3; cursor: not-allowed; box-shadow: none; }
    .send-btn:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(108,99,255,0.5); }
    .disclaimer {
      text-align: center; font-size: 0.6rem; color: #5c6bc0;
      margin-top: 0.5rem; letter-spacing: 0.01em;
    }
  </style>
</head>
<body>

<header>
  <div class="header-left">
    <div class="h-avatar">💜</div>
    <div>
      <div class="h-title">AI Care Companion</div>
      <div class="h-sub"><span class="h-dot"></span> Chatting with ${preferredName}</div>
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:0.75rem;">
    <span class="logo-text">🤝 CaseManagement.AI</span>
    <button class="end-btn" id="endBtn">📞 End</button>
  </div>
</header>

<div class="chat-area" id="chat"></div>

<div class="input-bar">
  <div class="input-wrap">
    <button class="mic-btn" id="micBtn" title="Voice input" aria-label="Start voice input">🎙</button>
    <textarea id="msgInput" rows="1" placeholder="Type your message… (Enter to send)" aria-label="Message input"></textarea>
    <button class="send-btn" id="sendBtn" aria-label="Send message">➤</button>
  </div>
  <p class="disclaimer">🔒 Private &amp; secure · For emergencies, call 911</p>
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
const endBtn = document.getElementById('endBtn');

function createAvatar() {
  const a = document.createElement('div');
  a.className = 'msg-avatar';
  a.textContent = '💜';
  return a;
}

function addMessage(role, text, isUrgent = false) {
  const row = document.createElement('div');
  row.className = 'msg-row ' + role;

  const col = document.createElement('div');
  col.className = 'msg-col';

  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + role + (isUrgent ? ' urgent' : '');
  bubble.textContent = text;

  const ts = document.createElement('div');
  ts.className = 'ts';
  ts.textContent = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

  col.appendChild(bubble);
  col.appendChild(ts);

  if (role === 'bot') {
    row.appendChild(createAvatar());
    row.appendChild(col);
  } else {
    row.appendChild(col);
  }

  chat.appendChild(row);

  if (isUrgent) {
    const banner = document.createElement('div');
    banner.className = 'urgent-banner';
    banner.textContent = '⚠️ Your case manager has been notified. Call 911 for emergencies · Text or call 988 for mental health support.';
    chat.appendChild(banner);
  }

  chat.scrollTop = chat.scrollHeight;
}

function showTyping() {
  if (isTyping) return;
  isTyping = true;
  const row = document.createElement('div');
  row.className = 'typing-row';
  row.id = 'typing-indicator';
  row.appendChild(createAvatar());
  const tb = document.createElement('div');
  tb.className = 'typing-bubble';
  tb.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
  row.appendChild(tb);
  chat.appendChild(row);
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
    addMessage('bot', "I'm having a little trouble connecting. Please try again in a moment.");
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
  } catch {}
}

// Auto-resize textarea
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
});
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
sendBtn.addEventListener('click', sendMessage);
endBtn.addEventListener('click', () => { endSession(); location.reload(); });

// Voice input
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = (e) => { input.value = e.results[0][0].transcript; input.dispatchEvent(new Event('input')); };
  recognition.onend = () => { isRecording = false; micBtn.classList.remove('recording'); };
  micBtn.addEventListener('click', () => {
    if (isRecording) { recognition.stop(); }
    else { recognition.start(); isRecording = true; micBtn.classList.add('recording'); }
  });
} else {
  micBtn.style.display = 'none';
}

window.addEventListener('beforeunload', endSession);

// Opening welcome message
addMessage('bot', 'Hi ' + PREFERRED_NAME + '! I\\'m your Care Companion. I\\'m here whenever you want to check in. How are you doing today?');
resetInactivityTimer();
input.focus();
</script>
</body>
</html>`);
}

// POST /care-assistant/:token/message
export async function companionMessage(req: Request, res: Response): Promise<void> {
  try {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    const individual = await findIndividualByToken(token);
    if (!individual) { res.status(404).json({ error: "Invalid link" }); return; }

    const { message, session_id } = req.body as { message: string; session_id: string };
    if (!message) { res.status(400).json({ error: "Message required" }); return; }

    const db = admin.firestore();

    // Get or create session
    let sessionRef: admin.firestore.DocumentReference;
    let sessionData: admin.firestore.DocumentData;

    if (session_id && session_id !== "session_" + session_id.split("_")[1]) {
      // Try to load existing session
      const existingSnap = await db.collection(COLLECTIONS.AI_CHECKINS).doc(session_id).get();
      if (existingSnap.exists) {
        sessionRef = existingSnap.ref;
        sessionData = existingSnap.data()!;
      } else {
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
        sessionRef = db.collection(COLLECTIONS.AI_CHECKINS).doc();
        await sessionRef.set(newSession);
        sessionData = newSession;
      }
    } else {
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
      sessionRef = db.collection(COLLECTIONS.AI_CHECKINS).doc();
      await sessionRef.set(newSession);
      sessionData = newSession;
    }

    // Load case manager name
    const cmSnap = individual.assigned_case_manager
      ? await db.collection(COLLECTIONS.USERS).doc(individual.assigned_case_manager as string).get()
      : null;
    const cmName = cmSnap?.data()
      ? `${cmSnap.data()!.firstName} ${cmSnap.data()!.lastName}`
      : "your case manager";

    const preferredName = (individual.preferred_name || individual.first_name) as string;
    const county = (individual.county || "your") as string;
    const orgId = individual.organizationId as string;

    // Build conversation history from last 20 messages
    const transcript: Array<{role: string; content: string}> = sessionData.transcript || [];
    const recentHistory = transcript.slice(-20)
      .map((m) => `${m.role === "user" ? preferredName : "Companion"}: ${m.content}`)
      .join("\n");

    const systemPrompt = COMPANION_SYSTEM_PROMPT(
      individual.first_name as string,
      preferredName,
      county,
      cmName
    );
    const contextWithHistory = recentHistory ? `Previous conversation:\n${recentHistory}` : "";

    const result = await generateCompletion(
      systemPrompt,
      message,
      contextWithHistory,
      "companion",
      orgId,
      "companion_bot",
      "companion_message",
      { maxTokens: 256, temperature: 0.7 }
    );

    const responseText = result.text;
    const isUrgent = responseText.includes("[URGENT]");
    const now = new Date().toISOString();

    // Update transcript
    const updatedTranscript = [
      ...transcript,
      { role: "user", content: message, timestamp: now },
      { role: "assistant", content: responseText, timestamp: now },
    ];

    const sessionUpdates: Record<string, unknown> = {
      transcript: updatedTranscript,
      message_count: admin.firestore.FieldValue.increment(2),
    };

    if (isUrgent && !sessionData.urgency_flagged) {
      sessionUpdates.urgency_flagged = true;
      sessionUpdates.urgency_content = message;

      // Create urgent task for case manager
      if (individual.assigned_case_manager) {
        await db.collection(COLLECTIONS.WORKFLOW_TASKS).add({
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
        await db.collection(COLLECTIONS.NOTIFICATIONS).add({
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
    });
  } catch (error) {
    console.error("[companion-message]", error);
    res.status(500).json({
      response: "I'm having a little trouble right now. Please try again in a moment.",
      urgent: false,
    });
  }
}

// POST /care-assistant/:token/end-session
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
    const transcript: Array<{role: string; content: string}> = sessionData.transcript || [];
    const orgId = individual.organizationId as string;

    // Generate session summary
    if (transcript.length > 0) {
      const transcriptText = transcript
        .map((m) => `${m.role === "user" ? "Individual" : "Companion"}: ${m.content}`)
        .join("\n");

      const summaryResult = await generateCompletion(
        "You are a clinical documentation assistant. Summarize this Care Companion session in 2-3 sentences. Be professional, factual, and note any concerns raised.",
        "Please summarize this check-in session:",
        transcriptText,
        "fast",
        orgId,
        "companion_bot",
        "companion_summary",
        { maxTokens: 150 }
      );

      await sessionSnap.ref.update({
        session_summary: summaryResult.text,
        review_status: "pending_review",
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
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[end-session]", error);
    res.json({ success: true }); // Never error on session end
  }
}
