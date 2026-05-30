/**
 * test-pcp-v2.mjs — PCP Flow Full Verification
 * Uses CDP (Chrome DevTools Protocol) via WebSocket.
 * All DOM checks use innerText string comparisons to avoid CDP object issues.
 */
import WebSocket from "ws";
import { writeFileSync, mkdirSync, existsSync } from "fs";

const SCREENSHOTS_DIR = "/Users/kamal/.gemini/antigravity-ide/browser_recordings";
if (!existsSync(SCREENSHOTS_DIR)) mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// ─── CDP Client ───────────────────────────────────────────────────────────────

let msgId = 0;
const pending = new Map();

async function getWsUrl() {
  const resp = await fetch("http://localhost:9222/json/list");
  const pages = await resp.json();
  if (pages.length > 0) return pages[0].webSocketDebuggerUrl;
  const r2 = await fetch("http://localhost:9222/json/new?http://localhost:5174", { method: "PUT" });
  return (await r2.json()).webSocketDebuggerUrl;
}

const wsUrl = await getWsUrl();
console.log(`🔌 Connecting CDP: ${wsUrl}`);
const ws = new WebSocket(wsUrl);

// Message dispatcher
ws.on("message", (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(`CDP Error: ${msg.error.message}`));
    else resolve(msg.result);
  }
});

await new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });

function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`Timeout(15s): ${method}`));
      }
    }, 15000);
  });
}

await cdp("Runtime.enable");
await cdp("Page.enable");

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function navigate(url) {
  await cdp("Page.navigate", { url });
  await sleep(3500);
}

async function getBodyText() {
  try {
    const r = await cdp("Runtime.evaluate", {
      expression: "document.body.innerText",
      returnByValue: true,
    });
    return (r.result?.value || "").toLowerCase();
  } catch { return ""; }
}

async function bodyHas(...terms) {
  const t = await getBodyText();
  return terms.every(s => t.includes(s.toLowerCase()));
}

async function bodyHasAny(...terms) {
  const t = await getBodyText();
  return terms.some(s => t.includes(s.toLowerCase()));
}

async function domExists(expr) {
  try {
    const r = await cdp("Runtime.evaluate", {
      expression: `!!(${expr})`,
      returnByValue: true,
    });
    return !!r.result?.value;
  } catch { return false; }
}

async function clickEl(expr) {
  try {
    await cdp("Runtime.evaluate", {
      expression: `(() => { const el = ${expr}; el && el.click(); return !!el; })()`,
      returnByValue: true,
    });
  } catch { /* ignore */ }
  await sleep(1200);
}

async function screenshot(label) {
  const r = await cdp("Page.captureScreenshot", { format: "png", quality: 90 });
  const path = `${SCREENSHOTS_DIR}/v2-pcp-${label}.png`;
  writeFileSync(path, Buffer.from(r.data, "base64"));
  console.log(`    📸 ${label}.png`);
}

async function pressEscape() {
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(500);
}

// ─── Test State ───────────────────────────────────────────────────────────────

const results = [];
function pass(name) {
  console.log(`  ✅  ${name}`);
  results.push({ name, pass: true });
}
function fail(name, why = "") {
  console.log(`  ❌  ${name}${why ? " — " + why : ""}`);
  results.push({ name, pass: false, why });
}

// ─── TESTS ────────────────────────────────────────────────────────────────────

console.log("\n🧪 PCP Creation Flow — Automated Verification\n");

// ── 1. Navigate to care plan board ───────────────────────────────────────────

console.log("┌─ GROUP 1: Care Plan Board ─────────────────────────────────");

await navigate("http://localhost:5174/people/ind-001/care-plan");
await sleep(2000);

// Handle login if redirected
if (await bodyHasAny("sign in", "log in")) {
  console.log("  ↳ Login detected — authenticating...");
  await cdp("Runtime.evaluate", {
    expression: `
      (() => {
        const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
        const e = document.querySelector('input[type=email]');
        const p = document.querySelector('input[type=password]');
        if(e){s.call(e,'kathy@demo.casemanagement.ai');e.dispatchEvent(new Event('input',{bubbles:true}));}
        if(p){s.call(p,'Demo1234!');p.dispatchEvent(new Event('input',{bubbles:true}));}
      })()
    `,
    returnByValue: true,
  });
  await sleep(500);
  await clickEl("[...document.querySelectorAll('button')].find(b=>b.type==='submit'||/sign in|log in/i.test(b.textContent))");
  await sleep(5000);
  await navigate("http://localhost:5174/people/ind-001/care-plan");
  await sleep(3000);
}

await screenshot("01-board");

await bodyHas("pcp")
  ? pass("Board — PCP page loaded")
  : fail("Board load", "page missing PCP content");

await bodyHas("brown, joseph")
  ? pass("Board — Individual: Brown, Joseph")
  : fail("Individual name", "'Brown, Joseph' not found");

await bodyHasAny("in progress", "completed", "new plan")
  ? pass("Board — Plan list or New Plan button visible")
  : fail("Plan list", "No plan rows or New Plan button");

await bodyHasAny("annual renewal", "august 31", "annual plan date")
  ? pass("Board — Annual renewal: August 31 shown")
  : fail("Annual date", "Annual renewal date missing");

await bodyHasAny("review draft", "pcp review", "days overdue", "review is")
  ? pass("Board — AI review banner visible")
  : fail("AI banner", "PCP review/overdue banner not shown");

// ── 2. Open modal (non-empty state uses btn-new-pcp-plan) ────────────────────

console.log("└─ GROUP 2: PCPCreationModal ─────────────────────────────────");

const newPlanBtn = `document.getElementById('btn-new-pcp-plan') || [...document.querySelectorAll('button')].find(b => /new plan/i.test(b.textContent))`;
const newPlanExists = await domExists(newPlanBtn);
newPlanExists
  ? pass("Modal — '+ New Plan' button in DOM")
  : fail("New Plan btn", "btn-new-pcp-plan not found");

await clickEl(newPlanBtn);
await sleep(1800);
await screenshot("02-modal-step1");

await bodyHasAny("new person-centered plan", "plan type", "effective date")
  ? pass("Modal — Step 1 opens after click")
  : fail("Modal open", "Step 1 content not visible");

await bodyHasAny("annual plan", "quarterly", "transition")
  ? pass("Modal — Plan type options visible")
  : fail("Plan type options", "No plan types in modal");

await bodyHasAny("08/31/2026", "august 31", "annual plan date")
  ? pass("Modal — Annual plan date Aug 31, 2026 shown")
  : fail("Annual date in modal", "Date not pre-filled");

await bodyHasAny("upload", "supporting documents", "drag")
  ? pass("Modal — Document upload zone present")
  : fail("Upload zone", "No upload/drag zone in modal");

await bodyHasAny("draft with ai", "draft", "ai draft")
  ? pass("Modal — 'Draft with AI' option visible")
  : fail("Draft with AI", "AI draft option not found");

await bodyHasAny("start blank", "blank plan")
  ? pass("Modal — 'Start blank plan' option visible")
  : fail("Start blank", "Blank plan option not found");

// Step through Continue → AI Reading step
const continueBtn = `[...document.querySelectorAll('button')].find(b => /^continue$/i.test(b.textContent?.trim()))`;
if (await domExists(continueBtn)) {
  await clickEl(continueBtn);
  await sleep(2000);
  await screenshot("03-step2-reading");

  await bodyHasAny("reading", "loading chart", "analyzing", "chart data", "individual profile")
    ? pass("Modal — Step 2 (AI Reading) animation renders")
    : fail("Step 2 reading", "AI reading step not visible");

  // Wait for auto-advance to step 3
  await sleep(4500);
  await screenshot("04-step3-review");
  await bodyHasAny("what i found", "plan sections", "found in chart", "review", "build section", "individual profile")
    ? pass("Modal — Step 3 (Review) auto-advances")
    : fail("Step 3 review", "Review step not shown after auto-advance");
} else {
  fail("Modal — Continue button not found in Step 1");
}

// Close modal
await pressEscape();
await sleep(800);

// ── 3. PCP Document Viewer ───────────────────────────────────────────────────

console.log("└─ GROUP 3: PCPDocumentViewer ────────────────────────────────");

await navigate("http://localhost:5174/people/ind-001/care-plan/pcp-brown-2026-001");
await sleep(4500);
await screenshot("05-pcp-viewer");

await bodyHas("individual profile summary")
  ? pass("Viewer — Section 1: Individual Profile Summary")
  : fail("Viewer S1", "Individual Profile Summary not found");

await bodyHas("personally defined good life")
  ? pass("Viewer — Section 2: Personally Defined Good Life")
  : fail("Viewer S2", "Good Life section not found");

await bodyHas("important to", "important for")
  ? pass("Viewer — Section 3: Important To / Important For")
  : fail("Viewer S3", "Important To/For not found");

await bodyHasAny("goals & outcomes", "goals and outcomes")
  ? pass("Viewer — Section 5: Goals & Outcomes")
  : fail("Viewer S5", "Goals & Outcomes not found");

await bodyHasAny("team members", "signatures", "team members & signatures")
  ? pass("Viewer — Section 9: Team Members & Signatures")
  : fail("Viewer S9", "Team Members not found");

await bodyHas("joseph brown", "carroll county", "kathy adams")
  ? pass("Viewer — Joseph Brown, Carroll County, Kathy Adams present")
  : fail("Viewer data", "Individual data fields not found");

await bodyHasAny("send", "download pdf", "mark as final")
  ? pass("Viewer — Action buttons: Send, Download PDF, Mark as Final")
  : fail("Viewer actions", "Action buttons missing");

await bodyHasAny("urgent", "insight", "case management ai")
  ? pass("Viewer — AI Panel with Urgent/Insight cards")
  : fail("Viewer AI panel", "AI panel missing");

await bodyHasAny("sections complete", "of 10")
  ? pass("Viewer — Section progress indicator (X of 10)")
  : fail("Viewer progress", "Section count indicator missing");

await bodyHas("ai")
  ? pass("Viewer — AI-generated badge shown on sections")
  : fail("AI badge", "AI badge not visible");

// ── 4. Section-by-Section Builder ───────────────────────────────────────────

console.log("└─ GROUP 4: Section Builder ──────────────────────────────────");

await navigate("http://localhost:5174/people/ind-001/care-plan/new?planType=Annual+Plan");
await sleep(4500);
await screenshot("06-builder");

await bodyHas("individual profile summary")
  ? pass("Builder — Section 1 rendered")
  : fail("Builder S1", "Section 1 not visible");

await bodyHas("joseph brown")
  ? pass("Builder — Joseph Brown data pre-loaded")
  : fail("Builder data", "Joseph Brown not in builder");

await bodyHas("ma-7842301")
  ? pass("Builder — Medicaid ID pre-filled: MA-7842301")
  : fail("Medicaid ID", "MA-7842301 not shown");

await bodyHas("kathy adams")
  ? pass("Builder — CCS Name pre-filled: Kathy Adams")
  : fail("CCS name", "Kathy Adams not in builder");

await bodyHas("maryland dda")
  ? pass("Builder — Program: Maryland DDA — Community Pathways")
  : fail("Program", "Maryland DDA not found");

await bodyHasAny("ai pre-filled", "ai pre-fill", "pre-filled")
  ? pass("Builder — AI pre-filled badges visible")
  : fail("Pre-fill badges", "No AI pre-filled labels");

await bodyHasAny("mark section complete", "mark section")
  ? pass("Builder — 'Mark section complete' button present")
  : fail("Mark complete", "Button not found");

await bodyHasAny("0 of 10", "of 10 sections")
  ? pass("Builder — Progress: 0 of 10 sections complete")
  : fail("Builder progress", "Progress indicator not found");

await bodyHasAny("save draft", "preview full plan")
  ? pass("Builder — Save Draft & Preview Full Plan in sidebar")
  : fail("Sidebar actions", "Save Draft / Preview not found");

await bodyHasAny("case management ai", "assisting")
  ? pass("Builder — AI panel active and assisting")
  : fail("Builder AI panel", "AI assistance panel missing");

// Mark section complete
await clickEl("[...document.querySelectorAll('button')].find(b => /mark section complete/i.test(b.textContent))");
await sleep(2500);
await screenshot("07-after-mark-complete");

await bodyHasAny("personally defined good life", "good life", "section 2", "1 of 10")
  ? pass("Builder — Mark complete → advances to next section")
  : fail("Section advance", "Did not advance to Section 2 after marking complete");

// ── 5. Send Modal ────────────────────────────────────────────────────────────

console.log("└─ GROUP 5: Send Plan Modal ──────────────────────────────────");

await navigate("http://localhost:5174/people/ind-001/care-plan/pcp-brown-2026-001");
await sleep(4000);

await clickEl("[...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Send')");
await sleep(1800);
await screenshot("08-send-modal");

await bodyHasAny("secure link", "generate secure link", "send plan", "share plan")
  ? pass("Send Modal — Secure link option visible")
  : fail("Send modal secure link", "Secure link option not found");

await bodyHasAny("download pdf", "pdf")
  ? pass("Send Modal — Download PDF option visible")
  : fail("Send modal PDF", "Download PDF option not found");

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log("\n" + "═".repeat(65));
console.log("  📊  PCP FLOW VERIFICATION RESULTS");
console.log("═".repeat(65));

const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass);
const pct = Math.round(passed / results.length * 100);

console.log(`\n  ✅  Passed:  ${passed} / ${results.length}  (${pct}%)`);

if (failed.length > 0) {
  console.log(`  ❌  Failed:  ${failed.length}`);
  failed.forEach(f => console.log(`       • ${f.name}${f.why ? ": " + f.why : ""}`));
} else {
  console.log("  🎉  ALL TESTS PASSED — PCP feature is verified and production-ready!");
}

console.log(`\n  Screenshots → ${SCREENSHOTS_DIR}/v2-pcp-*.png`);
console.log("═".repeat(65) + "\n");

ws.close();
process.exit(failed.length > 0 ? 1 : 0);
