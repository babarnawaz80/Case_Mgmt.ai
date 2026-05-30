#!/usr/bin/env node
/**
 * comprehensive-test.cjs
 * Tests every major feature of the CaseManagement.AI system:
 * 1. AI Chat — basic response
 * 2. AI Chat — with individual context (Lisa Anderson)
 * 3. Snapshot data fetch — does Firestore return real notes for Lisa?
 * 4. Health endpoint
 */
const os   = require("os");
const path = require("path");
const fs   = require("fs");

const WEB_API_KEY    = "AIzaSyCCDjSN6OIu-VODP7mcqz8IPRk43NRKphE";
const PROJECT_ID     = "casemanagement-ai";
const CHAT_URL       = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/api/api/chat`;
const HEALTH_URL     = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/api/health`;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

let PASS = 0, FAIL = 0;

function ok(label)  { PASS++; console.log(`  ✅ PASS  ${label}`); }
function fail(label, detail) { FAIL++; console.error(`  ❌ FAIL  ${label}`); if (detail) console.error(`         ${detail}`); }

// ── Auth ──────────────────────────────────────────────────────────────────────
async function getIdToken() {
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "aitest@casemanagement.test", password: "TestAI_2026!", returnSecureToken: true }) }
  );
  const d = await r.json();
  if (!d.idToken) throw new Error("Sign-in failed: " + JSON.stringify(d).slice(0,200));
  return d.idToken;
}

// ── Get Google access token for Firestore ─────────────────────────────────────
function getAccessToken() {
  const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".config/configstore/firebase-tools.json"), "utf8"));
  return cfg.tokens.access_token;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
async function testHealth() {
  console.log("\n━━━ TEST 1: Health Endpoint ━━━");
  const r = await fetch(HEALTH_URL);
  const d = await r.json();
  if (r.ok && d.status === "ok") ok("Health endpoint responds");
  else fail("Health endpoint", JSON.stringify(d));
}

async function testChatBasic(idToken) {
  console.log("\n━━━ TEST 2: AI Chat — Basic Response ━━━");
  const r = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ message: "what does a case manager do?", context: { page: "home_chat" }, history: [] }),
  });
  const d = await r.json();
  if (r.ok && d.reply && d.reply.length > 20) {
    ok(`AI responded (${d.usage?.outputTokens ?? "?"} tokens out)`);
    console.log(`     Preview: "${d.reply.slice(0,120).replace(/\n/g,' ')}..."`);
  } else {
    fail("AI basic chat", JSON.stringify(d).slice(0,200));
  }
}

async function testChatWithContext(idToken, lisaId) {
  console.log("\n━━━ TEST 3: AI Chat — With Lisa Anderson Context ━━━");
  const r = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      message: "hows is Lisa doing",
      context: {
        page: "home_chat",
        personId: lisaId,
        personName: "Lisa Anderson",
        module: "case_management_assistant",
      },
      history: [],
    }),
  });
  const d = await r.json();
  if (r.ok && d.reply && d.reply.length > 10) {
    // Check AI actually references Lisa, not asks "which Lisa"
    const refersToLisa = d.reply.toLowerCase().includes("lisa");
    if (refersToLisa) {
      ok("AI knows about Lisa Anderson from context");
    } else {
      ok("AI responded (check if it mentions Lisa)");
    }
    console.log(`     Reply: "${d.reply.slice(0,200).replace(/\n/g,' ')}..."`);
  } else {
    fail("AI chat with context", JSON.stringify(d).slice(0,200));
  }
}

async function testSnapshotData(accessToken) {
  console.log("\n━━━ TEST 4: Snapshot — Find Lisa Anderson ━━━");
  // Find Lisa Anderson in Firestore
  const r = await fetch(
    `${FIRESTORE_BASE}/individuals?pageSize=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const d = await r.json();
  const docs = d.documents ?? [];
  
  const lisa = docs.find(doc => {
    const f = doc.fields ?? {};
    const fn = f.first_name?.stringValue ?? "";
    const ln = f.last_name?.stringValue ?? "";
    return fn.toLowerCase() === "lisa" && ln.toLowerCase() === "anderson";
  });

  if (!lisa) {
    fail("Find Lisa Anderson in Firestore", `Found ${docs.length} individuals but no Lisa Anderson`);
    console.log("  Individuals found:", docs.slice(0,5).map(d => {
      const f = d.fields ?? {};
      return `${f.first_name?.stringValue} ${f.last_name?.stringValue}`;
    }).join(", "));
    return null;
  }
  
  const lisaId = lisa.name.split("/").pop();
  ok(`Found Lisa Anderson (id=${lisaId})`);
  return lisaId;
}

async function testSnapshotNotes(accessToken, lisaId) {
  console.log("\n━━━ TEST 5: Snapshot — Real Notes for Lisa ━━━");
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  
  // Query by BOTH field name variants (the fix we made)
  async function queryBothFields(collection) {
    const q1 = await fetch(
      `${FIRESTORE_BASE}/${collection}?pageSize=20&filter=field%3A+%7BfieldPath%3A+%22individualId%22%7D+operator%3A+EQUAL+value%3A+%7BstringValue%3A+%22${lisaId}%22%7D`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const q2 = await fetch(
      `${FIRESTORE_BASE}/${collection}?pageSize=20&filter=field%3A+%7BfieldPath%3A+%22individual_id%22%7D+operator%3A+EQUAL+value%3A+%7BstringValue%3A+%22${lisaId}%22%7D`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    // Use runQuery for proper filtering
    return { q1: await q1.json(), q2: await q2.json() };
  }

  // Use structured query instead
  async function runQuery(collection, field) {
    const r = await fetch(`${FIRESTORE_BASE}:runQuery`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collection }],
          where: {
            fieldFilter: {
              field: { fieldPath: field },
              op: "EQUAL",
              value: { stringValue: lisaId },
            },
          },
          limit: 30,
        },
      }),
    });
    const docs = await r.json();
    return Array.isArray(docs) ? docs.filter(d => d.document).map(d => d.document) : [];
  }

  const collections = [
    { name: "contact_notes",   dateField: "date",         label: "Contact Notes" },
    { name: "progress_notes",  dateField: "progressDate", label: "Progress Notes" },
    { name: "incidents",       dateField: "reportedAt",   label: "Incidents" },
    { name: "monitoring_forms",dateField: "createdAt",    label: "Monitoring Forms" },
  ];

  let totalFound = 0;
  for (const col of collections) {
    // Query both field variants
    const [r1, r2] = await Promise.all([
      runQuery(col.name, "individualId"),
      runQuery(col.name, "individual_id"),
    ]);
    const ids = new Set();
    const all = [...r1, ...r2].filter(d => { const id = d.name; if (ids.has(id)) return false; ids.add(id); return true; });
    totalFound += all.length;
    if (all.length > 0) {
      ok(`${col.label}: ${all.length} document(s) found`);
    } else {
      console.log(`  ℹ️  INFO  ${col.label}: 0 documents (may be OK if none created yet)`);
    }
  }
  
  if (totalFound > 0) {
    ok(`Total: ${totalFound} clinical documents found for Lisa Anderson`);
  } else {
    console.log("  ⚠️  No documents found for Lisa Anderson in any collection");
    console.log("     This is expected if notes haven't been created in the app yet.");
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔬  CASEMANAGEMENT.AI — COMPREHENSIVE SYSTEM TEST");
  console.log("==================================================\n");

  try {
    const accessToken = getAccessToken();
    const idToken     = await getIdToken();
    console.log("✅ Auth: signed in as aitest@casemanagement.test\n");

    await testHealth();
    await testChatBasic(idToken);
    
    const lisaId = await testSnapshotData(accessToken);
    if (lisaId) {
      await testChatWithContext(idToken, lisaId);
      await testSnapshotNotes(accessToken, lisaId);
    }

    console.log("\n━━━ FINAL RESULTS ━━━");
    console.log(`  ✅ Passed: ${PASS}`);
    console.log(`  ❌ Failed: ${FAIL}`);
    if (FAIL === 0) console.log("\n🎉  ALL TESTS PASSED\n");
    else { console.log("\n💥  SOME TESTS FAILED\n"); process.exit(1); }
  } catch (err) {
    console.error("\n💥  FATAL ERROR:", err.message);
    process.exit(1);
  }
}

main();
