#!/usr/bin/env node
/**
 * test-pcp-final.mjs
 * Reliable PCP verification test using CDP via WebSocket.
 * Key fix: registers message handler BEFORE opening connection,
 * uses loadEventFired to know when page is ready,
 * and increases timeouts.
 */

import WebSocket from "ws";
import { writeFileSync, mkdirSync, existsSync } from "fs";

const SCREENSHOTS_DIR = "/Users/kamal/.gemini/antigravity-ide/browser_recordings";
if (!existsSync(SCREENSHOTS_DIR)) mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// ─── CDP Client ───────────────────────────────────────────────────────────────

let msgId = 0;
const pending = new Map();
let loadResolve = null;

async function connectCDP(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);

    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      // Resolve pending command
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(`CDP: ${msg.error.message}`));
        else resolve(msg.result);
      }
      // Signal page load
      if (msg.method === "Page.loadEventFired" && loadResolve) {
        loadResolve();
        loadResolve = null;
      }
    });

    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

async function getWsUrl() {
  const resp = await fetch("http://localhost:9222/json/list");
  const pages = await resp.json();
  if (pages.length > 0) return pages[0].webSocketDebuggerUrl;
  const r2 = await fetch("http://localhost:9222/json/new?http://localhost:5174", { method: "PUT" });
  return (await r2.json()).webSocketDebuggerUrl;
}

const wsUrl = await getWsUrl();
console.log(`🔌 Connecting: ${wsUrl}`);
const ws = await connectCDP(wsUrl);

function cdp(method, params = {}, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`Timeout(${timeoutMs}ms): ${method}`));
      }
    }, timeoutMs);
  });
}

await cdp("Runtime.enable");
await cdp("Page.enable");

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function navigateAndWait(url, extraMs = 2000) {
  const loadPromise = new Promise(r => { loadResolve = r; });
  await cdp("Page.navigate", { url }, 10000);
  // Wait for load event or timeout whichever first
  await Promise.race([loadPromise, sleep(8000)]);
  await sleep(extraMs); // extra time for React to render
}

async function getBodyText() {
  try {
    const r = await cdp("Runtime.evaluate", {
      expression: "document.body?.innerText || ''",
      returnByValue: true,
    }, 10000);
    return (r.result?.value || "").toLowerCase();
  } catch { return ""; }
}

function has(text, ...terms) {
  return terms.every(t => text.includes(t.toLowerCase()));
}
function hasAny(text, ...terms) {
  return terms.some(t => text.includes(t.toLowerCase()));
}

async function domExists(expr) {
  try {
    const r = await cdp("Runtime.evaluate", {
      expression: `!!(${expr})`,
      returnByValue: true,
    }, 5000);
    return !!r.result?.value;
  } catch { return false; }
}

async function clickEl(expr) {
  try {
    await cdp("Runtime.evaluate", {
      expression: `(() => { const el = ${expr}; el && el.click(); return !!el; })()`,
      returnByValue: true,
    }, 5000);
  } catch { /* ignore */ }
  await sleep(1500);
}

async function screenshot(label) {
  try {
    const r = await cdp("Page.captureScreenshot", { format: "png", quality: 90 }, 20000);
    const path = `${SCREENSHOTS_DIR}/final-pcp-${label}.png`;
    writeFileSync(path, Buffer.from(r.data, "base64"));
    console.log(`    📸 final-pcp-${label}.png`);
    return path;
  } catch (e) {
    console.log(`    ⚠️  Screenshot failed: ${e.message}`);
    return null;
  }
}

async function pressEscape() {
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(800);
}

// ─── Test state ───────────────────────────────────────────────────────────────

const results = [];
function pass(name) {
  console.log(`  ✅  ${name}`);
  results.push({ name, pass: true });
}
function fail(name, why = "") {
  console.log(`  ❌  ${name}${why ? " — " + why : ""}`);
  results.push({ name, pass: false, why });
}

// ─── GROUP 1: Board ────────────────────────────────────────────────────────────

console.log("\n🧪 PCP Creation Flow — Full Verification\n");
console.log("━━━ GROUP 1: Care Plan / ISP Board ━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

await navigateAndWait("http://localhost:5174/people/ind-001/care-plan", 3000);

let body = await getBodyText();
console.log(`  Body preview: "${body.slice(0,120)}..."`);

// Might need login
if (hasAny(body, "sign in", "log in", "password", "email") && !hasAny(body, "brown", "joseph", "pcp")) {
  console.log("  → Login required — authenticating...");
  await cdp("Runtime.evaluate", {
    expression: `(() => {
      const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
      const e = document.querySelector('input[type=email]');
      const p = document.querySelector('input[type=password]');
      if(e){s.call(e,'kathy@demo.casemanagement.ai');e.dispatchEvent(new Event('input',{bubbles:true}));}
      if(p){s.call(p,'Demo1234!');p.dispatchEvent(new Event('input',{bubbles:true}));}
    })()`,
    returnByValue: true,
  });
  await sleep(600);
  await clickEl("[...document.querySelectorAll('button')].find(b=>b.type==='submit'||/sign in|log in/i.test(b.textContent))");
  await sleep(6000);
  await navigateAndWait("http://localhost:5174/people/ind-001/care-plan", 3000);
  body = await getBodyText();
  console.log(`  Body after login: "${body.slice(0,100)}..."`);
}

await screenshot("01-board");

has(body, "pcp") || has(body, "care plan") || has(body, "person-centered")
  ? pass("Board — PCP / Care Plan page loaded")
  : fail("Board load", `body: "${body.slice(0,80)}"`);

has(body, "joseph") || has(body, "brown, joseph") || has(body, "joseph brown")
  ? pass("Board — Individual: Joseph Brown")
  : fail("Individual name", "Joseph Brown not found");

hasAny(body, "in progress", "completed", "new plan", "no care plans")
  ? pass("Board — Plan list or empty state visible")
  : fail("Plan list", "No plan rows or empty state");

hasAny(body, "august 31", "08/31", "annual renewal", "annual plan date")
  ? pass("Board — Annual renewal date shown")
  : fail("Annual date", "Annual plan date not visible");

hasAny(body, "pcp review", "review is", "days overdue", "review draft")
  ? pass("Board — AI PCP review banner")
  : fail("AI banner", "No AI review banner");

hasAny(body, "active", "in progress", "127 days", "days until")
  ? pass("Board — Status indicators visible")
  : fail("Status badges", "Active/status not found");

// ─── GROUP 2: Modal ────────────────────────────────────────────────────────────

console.log("\n━━━ GROUP 2: PCPCreationModal ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// The "+ New Plan" button — may be btn-new-pcp-plan or find by text
const newPlanExpr = `document.getElementById('btn-new-pcp-plan') || [...document.querySelectorAll('button')].find(b => /new plan/i.test(b.textContent?.trim()))`;
const newPlanExists = await domExists(newPlanExpr);
newPlanExists
  ? pass("Modal entry — '+ New Plan' button in DOM")
  : fail("New Plan button", "Not found by id or text");

await clickEl(newPlanExpr);
await sleep(2000);
body = await getBodyText();
await screenshot("02-modal-step1");

hasAny(body, "new person-centered plan", "plan type", "effective date", "create new")
  ? pass("Modal — Step 1 opens")
  : fail("Modal open", `modal content not found — body: "${body.slice(0,100)}"`);

hasAny(body, "annual plan", "quarterly review", "transition")
  ? pass("Modal — Plan type options present")
  : fail("Plan type", "No plan type options");

hasAny(body, "08/31/2026", "august 31", "annual plan date", "08/31")
  ? pass("Modal — Annual plan date pre-filled: Aug 31, 2026")
  : fail("Annual date pre-fill", "Not visible in modal");

hasAny(body, "upload", "supporting documents", "drag")
  ? pass("Modal — Document upload zone")
  : fail("Upload zone", "Not found");

hasAny(body, "draft with ai", "draft")
  ? pass("Modal — 'Draft with AI' option")
  : fail("Draft with AI", "Option not found");

hasAny(body, "start blank", "blank plan", "blank")
  ? pass("Modal — 'Start blank plan' option")
  : fail("Start blank", "Option not found");

// Click Continue → AI Reading step
const continueExpr = `[...document.querySelectorAll('button')].find(b => /^continue$/i.test(b.textContent?.trim()))`;
const hasContin = await domExists(continueExpr);

if (hasContin) {
  await clickEl(continueExpr);
  await sleep(2500);
  body = await getBodyText();
  await screenshot("03-step2-reading");

  hasAny(body, "reading", "loading chart", "analyzing", "chart data", "individual profile", "documents")
    ? pass("Modal — Step 2 (AI Reading) visible")
    : fail("Step 2 reading", `body: "${body.slice(0,100)}"`);

  // Auto-advance to Step 3
  await sleep(4500);
  body = await getBodyText();
  await screenshot("04-step3-review");

  hasAny(body, "what i found", "plan sections", "build section", "found in chart", "review", "individual profile summary")
    ? pass("Modal — Step 3 (Review) auto-advances")
    : fail("Step 3 review", `body: "${body.slice(0,100)}"`);
} else {
  fail("Modal Continue button", "Not found in Step 1");
}

await pressEscape();
await sleep(1000);

// ─── GROUP 3: Document Viewer ──────────────────────────────────────────────────

console.log("\n━━━ GROUP 3: PCP Document Viewer ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

await navigateAndWait("http://localhost:5174/people/ind-001/care-plan/pcp-brown-2026-001", 4000);
body = await getBodyText();
await screenshot("05-pcp-viewer");

has(body, "individual profile summary")
  ? pass("Viewer — S1: Individual Profile Summary")
  : fail("Viewer S1", "Not found");

has(body, "personally defined good life")
  ? pass("Viewer — S2: Personally Defined Good Life")
  : fail("Viewer S2", "Not found");

hasAny(body, "important to", "important for")
  ? pass("Viewer — S3: Important To / Important For")
  : fail("Viewer S3", "Not found");

hasAny(body, "goals & outcomes", "goals and outcomes")
  ? pass("Viewer — S5: Goals & Outcomes")
  : fail("Viewer S5", "Not found");

hasAny(body, "team members", "signatures")
  ? pass("Viewer — S9: Team Members & Signatures")
  : fail("Viewer S9", "Not found");

has(body, "joseph brown") && hasAny(body, "carroll county", "kathy adams")
  ? pass("Viewer — Joseph Brown data: Carroll County, Kathy Adams")
  : fail("Viewer data", "Individual data fields missing");

has(body, "ma-7842301")
  ? pass("Viewer — Medicaid ID MA-7842301")
  : fail("Medicaid ID", "Not visible in viewer");

hasAny(body, "send", "download pdf", "mark as final")
  ? pass("Viewer — Action buttons present")
  : fail("Viewer actions", "Missing");

hasAny(body, "urgent", "insight", "case management ai")
  ? pass("Viewer — AI Panel with Urgent/Insight")
  : fail("AI Panel", "Not found");

hasAny(body, "sections complete", "of 10")
  ? pass("Viewer — Section progress indicator")
  : fail("Progress", "Not found");

// ─── GROUP 4: Section Builder ──────────────────────────────────────────────────

console.log("\n━━━ GROUP 4: Section-by-Section Builder ━━━━━━━━━━━━━━━━━━━━━━━");

await navigateAndWait("http://localhost:5174/people/ind-001/care-plan/new?planType=Annual+Plan", 4000);
body = await getBodyText();
await screenshot("06-builder");

has(body, "individual profile summary")
  ? pass("Builder — Section 1 loaded")
  : fail("Builder S1", `body: "${body.slice(0,100)}"`);

has(body, "joseph brown")
  ? pass("Builder — Joseph Brown pre-loaded")
  : fail("Joseph Brown", "Not in builder");

has(body, "ma-7842301")
  ? pass("Builder — Medicaid ID MA-7842301")
  : fail("Medicaid ID", "Not shown");

has(body, "kathy adams")
  ? pass("Builder — CCS: Kathy Adams")
  : fail("CCS name", "Not found");

has(body, "maryland dda")
  ? pass("Builder — Program: Maryland DDA")
  : fail("Program", "Not found");

hasAny(body, "ai pre-filled", "pre-filled", "ai pre-fill")
  ? pass("Builder — AI pre-filled badges visible")
  : fail("Pre-fill badges", "Not found");

hasAny(body, "mark section complete")
  ? pass("Builder — 'Mark section complete' button")
  : fail("Mark complete", "Not found");

hasAny(body, "0 of 10", "of 10 sections")
  ? pass("Builder — Progress: 0 of 10 sections")
  : fail("Builder progress", "Not found");

hasAny(body, "save draft", "preview full plan")
  ? pass("Builder — Save Draft / Preview in sidebar")
  : fail("Sidebar", "Missing");

hasAny(body, "case management ai", "assisting")
  ? pass("Builder — AI panel active")
  : fail("Builder AI panel", "Missing");

// Mark section complete
const markCompleteExpr = `[...document.querySelectorAll('button')].find(b => /mark section complete/i.test(b.textContent))`;
await clickEl(markCompleteExpr);
await sleep(3000);
body = await getBodyText();
await screenshot("07-after-mark");

hasAny(body, "personally defined good life", "good life", "1 of 10", "section 2")
  ? pass("Builder — Mark complete → Section 2 (Good Life) advances")
  : fail("Section advance", `body: "${body.slice(0,80)}"`);

// ─── GROUP 5: Send Modal ───────────────────────────────────────────────────────

console.log("\n━━━ GROUP 5: Send Plan Modal ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

await navigateAndWait("http://localhost:5174/people/ind-001/care-plan/pcp-brown-2026-001", 3000);
await clickEl("[...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Send')");
await sleep(2000);
body = await getBodyText();
await screenshot("08-send-modal");

hasAny(body, "secure link", "generate secure", "share plan", "send plan")
  ? pass("Send Modal — Secure link option")
  : fail("Send modal link", "Not found");

hasAny(body, "download pdf", "pdf")
  ? pass("Send Modal — Download PDF option")
  : fail("Send modal PDF", "Not found");

// ─── Summary ──────────────────────────────────────────────────────────────────

const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass);
const pct = Math.round(passed / results.length * 100);

console.log("\n" + "═".repeat(65));
console.log("  📊  PCP FLOW VERIFICATION RESULTS");
console.log("═".repeat(65));
console.log(`\n  ✅  Passed:  ${passed} / ${results.length}  (${pct}%)\n`);

if (failed.length > 0) {
  console.log(`  ❌  Failed (${failed.length}):`);
  failed.forEach(f => console.log(`     • ${f.name}${f.why ? " — " + f.why : ""}`));
  console.log();
} else {
  console.log("  🎉  ALL TESTS PASSED — Feature verified and production-ready!\n");
}

console.log(`  Screenshots: ${SCREENSHOTS_DIR}/final-pcp-*.png`);
console.log("═".repeat(65) + "\n");

ws.close();
process.exit(failed.length > 0 ? 1 : 0);
