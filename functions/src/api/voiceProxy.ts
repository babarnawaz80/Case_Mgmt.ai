import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";

const GEMINI_LIVE_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

// Concurrent session tracking per tenant
const activeSessions = new Map<string, number>(); // tenantId → count
const MAX_SESSIONS_PER_TENANT = 10;
const MAX_SESSION_MS = 10 * 60 * 1000; // 10 minutes

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", async (clientWs: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url ?? "/", "https://placeholder");
  const token = url.searchParams.get("token");

  // 1. Authenticate
  if (!token) {
    clientWs.close(4001, "Unauthorized — token required");
    return;
  }

  let uid: string;
  let organizationId: string;
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    uid = decoded.uid;
    // Load org from Firestore
    const userSnap = await admin.firestore().collection("users").doc(uid).get();
    organizationId = userSnap.data()?.organizationId ?? "unknown";
  } catch {
    clientWs.close(4001, "Unauthorized — invalid token");
    return;
  }

  // 2. Rate limit
  const currentCount = activeSessions.get(organizationId) ?? 0;
  if (currentCount >= MAX_SESSIONS_PER_TENANT) {
    clientWs.close(4029, "Too many active voice sessions for this organization");
    return;
  }
  activeSessions.set(organizationId, currentCount + 1);

  // 3. Log session start
  const sessionRef = await admin.firestore().collection("voice_sessions").add({
    user_id: uid,
    tenant_id: organizationId,
    session_start: admin.firestore.FieldValue.serverTimestamp(),
    session_end: null,
    turn_count: 0,
  });

  let turnCount = 0;

  // 4. Connect to Gemini Live API
  const geminiWs = new WebSocket(
    `${GEMINI_LIVE_URL}?key=${GEMINI_API_KEY}`,
    { headers: { "Content-Type": "application/json" } }
  );

  // Session timeout
  const sessionTimeout = setTimeout(() => {
    clientWs.close(1000, "Session timeout — 10 minute limit reached");
    geminiWs.close();
  }, MAX_SESSION_MS);

  geminiWs.on("open", () => {
    // Send Gemini setup message
    const setupMessage = {
      setup: {
        model: "models/gemini-2.0-flash-live-001",
        generation_config: {
          response_modalities: ["AUDIO", "TEXT"],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: { voice_name: "Aoede" }
            }
          }
        },
        system_instruction: {
          parts: [{
            text: `IDENTITY AND ROLE
You are the CaseManagement.AI built-in assistant. You serve as the complete support system for the platform. There is no help desk, no support team, no tickets. You are the only support resource. Your job is to help every user fully resolve their question or problem before the conversation ends.

You serve three user types:
- Case Managers: need help with documentation, caseload tasks, compliance, finding things
- Supervisors: need help with team oversight, approvals, compliance monitoring, reports
- Administrators and Billing staff: need help with configuration, billing, admin settings

SUPPORT BEHAVIOR RULES
1. When a user describes a problem or asks how to do something, ask ONE clarifying question if needed to understand exactly what they are seeing. Never ask multiple questions at once.
2. Give step-by-step instructions in plain English. Number the steps. Be specific about where to click, what to look for, and what the expected result is.
3. After giving instructions, always end with: "Did that solve it, or are you still seeing an issue?" This keeps the conversation open until the problem is resolved.
4. If the user says it is still not working, ask them to describe exactly what they see on the screen. Diagnose from there.
5. Never say "I cannot help with that" for a platform question. If uncertain, say: "Let me walk you through the most likely solution. If that does not work, describe what you see and we will figure it out together."
6. For voice responses, keep answers conversational and concise. Avoid reading long lists. Say "there are three steps" and walk through them naturally.

PLATFORM KNOWLEDGE
Navigation: Dashboard (home), People Supported (caseload), My Work (tasks), Messages, Documentation Hub, Incidents, Reports, Settings (admin only), Billing (admin/billing only).

My Work tabs: My Work (tasks grouped by individual, CRITICAL/OVERDUE/APPROACHING/ROUTINE), Alerts, Mentions, Completed.

Documentation Hub modules: Contact Notes, Progress Notes, Visit Summaries, Monitoring Forms (10 sections, AI pre-fills sections 1-4), Assessments, Care Plans/ISP, Referrals, Team Meeting Notes, Communications Log.

Billing: Claims Queue with 4 validation checks (authorization active, units within cap, Medicaid eligibility active, documentation complete). Status badges: Scrub Passed (ready), Needs Attention (check failed — click to see which), Pending Review, Denied.

Ambient Listening: eChart → Ambient tile → consent → Start Recording → Stop and Process → Review and Apply. Nothing writes automatically.

Care Plan: + New Plan → Start with AI draft OR blank → add goals → collect signatures. Renewal overdue banner when annual date passed.

Common issues:
- Note won't submit: check required fields (*), especially Contact Type, Purpose, service code for billable notes
- Billing Needs Attention: click claim to see which of 4 checks failed
- Task shows overdue but completed: must click Complete in My Work explicitly
- Can't find individual: check Status filter (defaults to Active)
- AI draft badge not showing: trigger manual Orchestrator Run or wait for nightly 2 AM run
- Can't access Settings: Admin role only — ask admin to update your role
- Ambient session didn't save: must click Review and Apply and apply at least one item`
          }]
        }
      }
    };
    geminiWs.send(JSON.stringify(setupMessage));
  });

  // Relay: Gemini → client
  geminiWs.on("message", (data: Buffer | string) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
      // Count turns (text responses indicate a complete turn)
      try {
        const msg = JSON.parse(data.toString());
        if (msg?.serverContent?.turnComplete) turnCount++;
      } catch { /* binary audio chunk */ }
    }
  });

  // Relay: client → Gemini
  clientWs.on("message", (data: Buffer | string) => {
    if (geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.send(data);
    }
  });

  // Cleanup
  const cleanup = async () => {
    clearTimeout(sessionTimeout);
    const count = activeSessions.get(organizationId) ?? 1;
    activeSessions.set(organizationId, Math.max(0, count - 1));
    try {
      await sessionRef.update({
        session_end: admin.firestore.FieldValue.serverTimestamp(),
        turn_count: turnCount,
      });
    } catch { /* non-fatal */ }
    if (geminiWs.readyState === WebSocket.OPEN) geminiWs.close();
  };

  clientWs.on("close", cleanup);
  geminiWs.on("close", () => {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.close(1000, "Gemini disconnected");
    cleanup();
  });

  geminiWs.on("error", (err: Error) => {
    console.error("[voiceProxy] Gemini error:", err.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1011, "Gemini API error");
    }
    cleanup();
  });
});

// Export as a Cloud Function that handles WebSocket upgrades
export const voiceProxy = onRequest(
  { cors: true, memory: "512MiB", timeoutSeconds: 630 },
  (req, res) => {
    // Check for WebSocket upgrade
    const upgradeHeader = req.headers["upgrade"];
    if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
      // @ts-ignore — access raw Node socket for WS upgrade
      wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws: WebSocket) => {
        wss.emit("connection", ws, req);
      });
    } else {
      res.status(200).json({ status: "voice proxy ready", version: "2.0" });
    }
  }
);
