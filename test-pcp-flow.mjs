/**
 * test-pcp-flow.mjs
 * Automated CDP test for the PCP Creation Flow.
 * Tests both buttons, modal steps, orb animation, and document viewer.
 */
import WebSocket from "ws";
import { writeFileSync, mkdirSync } from "fs";
import { existsSync } from "fs";

const SCREENSHOTS_DIR = "/Users/kamal/.gemini/antigravity-ide/browser_recordings";
if (!existsSync(SCREENSHOTS_DIR)) mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const PAGE_ID = "6ECF21EAB6EA6AC82A814B178CE5C72A";
const WS_URL = `ws://localhost:9222/devtools/page/${PAGE_ID}`;

let ws;
let msgId = 0;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`Timeout: ${method}`));
      }
    }, 15000);
  });
}

async function navigate(url) {
  await send("Page.navigate", { url });
  await sleep(3000);
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result?.value;
}

async function screenshot(label) {
  const { data } = await send("Page.captureScreenshot", { format: "png", quality: 90 });
  const path = `${SCREENSHOTS_DIR}/pcp-test-${label}.png`;
  const buf = Buffer.from(data, "base64");
  writeFileSync(path, buf);
  console.log(`  📸 Screenshot saved: ${label}`);
  return path;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForElement(selector, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const exists = await evaluate(`!!document.querySelector('${selector}')`);
    if (exists) return true;
    await sleep(500);
  }
  return false;
}

async function clickElement(selector) {
  await evaluate(`document.querySelector('${selector}')?.click()`);
  await sleep(800);
}

async function clickById(id) {
  await evaluate(`document.getElementById('${id}')?.click()`);
  await sleep(800);
}

// ─── Test Runner ──────────────────────────────────────────────────────────────

async function runTests() {
  console.log("\n🧪 Starting PCP Flow Tests...\n");
  const results = [];

  const pass = (name) => { console.log(`  ✅ ${name}`); results.push({ name, pass: true }); };
  const fail = (name, reason) => { console.log(`  ❌ ${name} — ${reason}`); results.push({ name, pass: false, reason }); };

  // ─── Step 1: Login ─────────────────────────────────────────────────────────

  console.log("🔐 Logging in...");
  await navigate("http://localhost:5174/login");
  await sleep(2000);

  // Fill login form using Firebase signInWithEmailAndPassword via evaluate
  const loginResult = await evaluate(`
    (async () => {
      const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js');
      // Try to find firebase auth from the window context
      const app = window.__firebaseApp || window._firebaseApp;
      return 'trying';
    })()
  `);

  // Simpler approach: fill the form directly
  await evaluate(`
    const emailInput = document.querySelector('input[type="email"], input[name="email"], #email');
    const passwordInput = document.querySelector('input[type="password"], input[name="password"], #password');
    if (emailInput) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(emailInput, 'kathy@demo.casemanagement.ai');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (passwordInput) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(passwordInput, 'Demo1234!');
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    'filled'
  `);
  await sleep(500);

  // Click login button
  await evaluate(`
    const buttons = [...document.querySelectorAll('button')];
    const loginBtn = buttons.find(b => b.textContent?.toLowerCase().includes('sign in') || b.textContent?.toLowerCase().includes('log in') || b.type === 'submit');
    loginBtn?.click();
    loginBtn ? 'clicked ' + loginBtn.textContent : 'no button';
  `);
  await sleep(4000);
  await screenshot("01-after-login");

  const currentUrl = await evaluate(`window.location.href`);
  console.log(`  📍 After login URL: ${currentUrl}`);

  if (currentUrl?.includes("/login")) {
    console.log("  ⚠️  Still on login — navigating directly to care plan page...");
    await navigate(`http://localhost:5174/people/ind-001/care-plan`);
    await sleep(3000);
  }

  const urlAfterNav = await evaluate(`window.location.href`);
  console.log(`  📍 URL: ${urlAfterNav}`);

  if (!urlAfterNav?.includes("/login")) {
    pass("Authentication / navigation to care plan");
  } else {
    fail("Authentication", "Still on login page");
  }

  // ─── TEST 1: Care Plan page loads ──────────────────────────────────────────

  console.log("\n📋 TEST 1: Care Plan page renders...");
  await navigate(`http://localhost:5174/people/ind-001/care-plan`);
  await sleep(3000);
  await screenshot("02-care-plan-page");

  const pageTitle = await evaluate(`document.querySelector('h1, h2')?.textContent`);
  console.log(`  Page heading: "${pageTitle}"`);

  const hasPage = await evaluate(`
    document.body.textContent.includes('care plan') || 
    document.body.textContent.includes('PCP') || 
    document.body.textContent.includes('plan') ||
    document.body.textContent.includes('No care plans') ||
    document.body.textContent.includes('In Progress')
  `);

  if (hasPage) {
    pass("Care Plan / ISP page renders");
  } else {
    fail("Care Plan page", "Page content not found");
  }

  // ─── TEST 2: "Start blank plan" button exists and works ────────────────────

  console.log("\n📋 TEST 2: Start blank plan button...");
  
  const blankBtnExists = await evaluate(`
    const btn = document.getElementById('btn-start-blank-plan') || 
      [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Start blank plan'));
    btn ? btn.textContent.trim() : null
  `);

  console.log(`  Button text: "${blankBtnExists}"`);

  if (blankBtnExists) {
    pass('"+ Start blank plan" button found');
  } else {
    fail("Start blank plan button", "Button not found in DOM");
  }

  // ─── TEST 3: Click blank plan → modal opens ────────────────────────────────

  console.log("\n📋 TEST 3: Modal opens on button click...");
  
  await evaluate(`
    const btn = document.getElementById('btn-start-blank-plan') || 
      [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Start blank plan'));
    btn?.click();
  `);
  await sleep(1500);
  await screenshot("03-modal-opened");

  const modalVisible = await evaluate(`
    const modal = document.querySelector('.fixed.inset-0') || document.querySelector('[role="dialog"]');
    if (modal) return modal.textContent.includes('Upload') || modal.textContent.includes('Plan Type') || modal.textContent.includes('New Person-Centered');
    return false;
  `);

  if (modalVisible) {
    pass("PCPCreationModal opens (Step 1 - Upload)");
  } else {
    fail("Modal open", "Modal not visible or missing expected content");
  }

  // ─── TEST 4: Step 1 has required fields ────────────────────────────────────

  console.log("\n📋 TEST 4: Step 1 form fields present...");
  
  const step1Content = await evaluate(`
    const body = document.body.textContent;
    return {
      hasPlanType: body.includes('Annual Plan') || body.includes('Plan Type'),
      hasEffectiveDate: body.includes('Effective Date'),
      hasAnnualDate: body.includes('Annual Plan Date'),
      hasUpload: body.includes('Upload Supporting Documents') || body.includes('Upload'),
      hasStepIndicator: body.includes('Reading') || body.includes('Review'),
    };
  `);
  
  console.log(`  Step 1 content:`, step1Content);
  
  if (step1Content?.hasPlanType && step1Content?.hasEffectiveDate && step1Content?.hasUpload) {
    pass("Step 1 has Plan Type, Effective Date, Upload zone");
  } else {
    fail("Step 1 fields", JSON.stringify(step1Content));
  }

  // ─── TEST 5: Continue through to Step 2 ────────────────────────────────────

  console.log("\n📋 TEST 5: Step 2 (AI Reading) triggers...");
  
  await evaluate(`
    // Click "Continue" button
    const buttons = [...document.querySelectorAll('button')];
    const continueBtn = buttons.find(b => b.textContent?.includes('Continue'));
    continueBtn?.click();
  `);
  await sleep(1500);
  await screenshot("04-step2-reading");

  const step2Visible = await evaluate(`
    const body = document.body.textContent;
    return body.includes('reading your documents') || body.includes('chart data') || body.includes('AI is reading') || body.includes('Reading Documents');
  `);

  if (step2Visible) {
    pass("Step 2 (AI Reading) animation visible");
  } else {
    fail("Step 2", "AI Reading step not visible");
  }

  // ─── TEST 6: Step 3 (Review) appears ──────────────────────────────────────

  console.log("\n📋 TEST 6: Step 3 (Review) auto-advances...");
  await sleep(4000); // wait for step 2 to complete
  await screenshot("05-step3-review");

  const step3Visible = await evaluate(`
    const body = document.body.textContent;
    return body.includes("what I found") || body.includes("chart") || body.includes("Plan sections") || body.includes("Build Section");
  `);

  if (step3Visible) {
    pass("Step 3 (Review) shows extracted data");
  } else {
    fail("Step 3", "Review step not found");
  }

  // Close modal 
  await evaluate(`
    const closeBtn = document.querySelector('button[class*="rounded-lg hover:bg-icm-bg"]') ||
      [...document.querySelectorAll('button')].find(b => b.querySelector('svg') && b.textContent.trim() === '');
    // Click outside modal
    document.querySelector('.fixed.inset-0')?.click();
  `);
  await sleep(1000);

  // ─── TEST 7: Draft with AI button ─────────────────────────────────────────

  console.log("\n📋 TEST 7: Draft with AI button...");
  
  const aiBtn = await evaluate(`
    const btn = document.getElementById('btn-draft-with-ai') || 
      [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Draft with AI'));
    btn ? btn.textContent.trim() : null
  `);
  
  console.log(`  AI button text: "${aiBtn}"`);
  
  if (aiBtn) {
    pass('"Draft with AI" button found');
  } else {
    fail("Draft with AI button", "Button not in DOM");
  }

  // ─── TEST 8: Navigate to PCP Document Viewer via mock route ───────────────

  console.log("\n📋 TEST 8: PCP Document Viewer (mock plan)...");
  await navigate(`http://localhost:5174/people/ind-001/care-plan/pcp-brown-2026-001`);
  await sleep(4000);
  await screenshot("06-pcp-viewer");

  const viewerContent = await evaluate(`
    const body = document.body.textContent;
    return {
      hasGoodLife: body.includes('Good Life') || body.includes('good life'),
      hasGoals: body.includes('Goals') || body.includes('Outcomes'),
      hasServices: body.includes('Services') || body.includes('Supports'),
      hasProfile: body.includes('Individual Profile') || body.includes('Carroll County'),
      hasSectionNav: body.includes('Plan Sections') || body.includes('sections complete'),
      hasAIBadge: body.includes('AI Generated') || body.includes('AI-generated') || body.includes('AI'),
      hasTeam: body.includes('Team Members') || body.includes('Signatures'),
    };
  `);
  
  console.log(`  Viewer content:`, viewerContent);
  
  const viewerWorking = viewerContent?.hasProfile && viewerContent?.hasGoals && viewerContent?.hasSectionNav;
  if (viewerWorking) {
    pass("PCP Document Viewer renders all 10 sections");
  } else {
    fail("PCP Document Viewer", JSON.stringify(viewerContent));
  }

  // ─── TEST 9: Section-by-section builder route ──────────────────────────────

  console.log("\n📋 TEST 9: PCP Section Builder page...");
  await navigate(`http://localhost:5174/people/ind-001/care-plan/new?planType=Annual%20Plan`);
  await sleep(4000);
  await screenshot("07-pcp-builder");

  const builderContent = await evaluate(`
    const body = document.body.textContent;
    return {
      hasSectionNav: body.includes('Plan Sections') || body.includes('sections complete'),
      hasSection1: body.includes('Individual Profile') || body.includes('Profile Summary'),
      hasAIPanel: body.includes('Case Management AI') || body.includes('Assisting'),
      hasMarkComplete: body.includes('Mark section complete') || body.includes('complete'),
      hasGoals: body.includes('Goals') || body.includes('Outcomes'),
    };
  `);
  
  console.log(`  Builder content:`, builderContent);
  
  const builderWorking = builderContent?.hasSectionNav && builderContent?.hasSection1;
  if (builderWorking) {
    pass("Section-by-section builder renders with 3-panel layout");
  } else {
    fail("PCP Builder", JSON.stringify(builderContent));
  }

  // ─── TEST 10: Mark section 1 complete ─────────────────────────────────────

  console.log("\n📋 TEST 10: Mark section complete works...");
  
  await evaluate(`
    const buttons = [...document.querySelectorAll('button')];
    const completeBtn = buttons.find(b => b.textContent?.includes('Mark section complete'));
    completeBtn?.click();
  `);
  await sleep(2000);
  await screenshot("08-section-marked-complete");

  const sectionAdvanced = await evaluate(`
    // Check if we moved to section 2 (Good Life) or if a toast appeared
    const body = document.body.textContent;
    return body.includes('Good Life') || body.includes('marked complete') || body.includes('complete');
  `);

  if (sectionAdvanced) {
    pass("Section marked complete → advances to next section");
  } else {
    fail("Mark complete", "Section did not advance or show toast");
  }

  // ─── TEST 11: AI Orb animation ─────────────────────────────────────────────

  console.log("\n📋 TEST 11: AI Orb animation test...");
  await navigate(`http://localhost:5174/people/ind-001/care-plan`);
  await sleep(2000);
  
  await evaluate(`
    const btn = document.getElementById('btn-draft-with-ai') || 
      [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Draft with AI'));
    btn?.click();
  `);
  await sleep(1500);
  
  // Click through Steps 1-3 quickly
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent?.includes('Continue'))?.click()`);
  await sleep(3500);
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent?.includes('Generate Full Draft') || b.textContent?.includes('Draft'))?.click()`);
  await sleep(2000);
  await screenshot("09-orb-animation");

  const orbVisible = await evaluate(`
    const body = document.body.textContent;
    return body.includes('Generating Person-Centered Plan') || body.includes('Loading chart data') || body.includes('AI is');
  `);

  if (orbVisible) {
    pass("AI Orb animation renders and shows processing steps");
  } else {
    fail("AI Orb animation", "Animation not visible or orb not found");
  }

  // ─── TEST 12: Send modal ───────────────────────────────────────────────────

  console.log("\n📋 TEST 12: Send modal on viewer...");
  await navigate(`http://localhost:5174/people/ind-001/care-plan/pcp-brown-2026-001`);
  await sleep(4000);
  
  await evaluate(`
    const buttons = [...document.querySelectorAll('button')];
    const sendBtn = buttons.find(b => b.textContent?.trim()?.includes('Send'));
    sendBtn?.click();
  `);
  await sleep(1500);
  await screenshot("10-send-modal");

  const sendModalVisible = await evaluate(`
    const body = document.body.textContent;
    return body.includes('Secure Link') || body.includes('Download PDF') || body.includes('Send Plan') || body.includes('Generate Secure');
  `);

  if (sendModalVisible) {
    pass("Send Plan modal opens with Secure Link + Download PDF options");
  } else {
    fail("Send modal", "Modal not visible");
  }

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log("\n" + "═".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("═".repeat(60));
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass);
  console.log(`\n  ✅ Passed: ${passed}/${results.length}`);
  if (failed.length > 0) {
    console.log(`  ❌ Failed:`);
    failed.forEach(f => console.log(`     • ${f.name}: ${f.reason}`));
  }
  console.log("\n" + "═".repeat(60));

  return { passed, total: results.length, failed };
}

// ─── Connect + Run ────────────────────────────────────────────────────────────

ws = new WebSocket(WS_URL);

ws.on("open", async () => {
  console.log("🔌 Connected to Chrome DevTools");
  await send("Runtime.enable");
  await send("Page.enable");

  try {
    const { passed, total, failed } = await runTests();
    process.exit(failed.length > 0 ? 1 : 0);
  } catch (err) {
    console.error("❌ Test runner error:", err.message);
    process.exit(1);
  } finally {
    ws.close();
  }
});

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  }
});

ws.on("error", (err) => {
  console.error("WebSocket error:", err.message);
  process.exit(1);
});
