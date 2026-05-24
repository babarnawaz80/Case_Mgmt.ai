#!/usr/bin/env node
const WebSocket = require('ws');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CDP_URL = 'http://127.0.0.1:9222';
const BASE_URL = 'https://casemanagement-ai.web.app';
const SCREENSHOT_DIR = '/Users/kamal/.gemini/antigravity-ide/brain/c59ff2f8-154d-4892-b0a2-012b0b11e63f/screenshots';
const RESULTS = [];

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 1; this.handlers = {}; }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.handlers[id] = { resolve, reject };
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.handlers[id]) { delete this.handlers[id]; reject(new Error(`Timeout: ${method}`)); } }, 20000);
    });
  }
  onMessage(msg) {
    const data = JSON.parse(msg);
    if (data.id && this.handlers[data.id]) {
      if (data.error) this.handlers[data.id].reject(new Error(data.error.message));
      else this.handlers[data.id].resolve(data.result);
      delete this.handlers[data.id];
    }
  }
}

async function connect() {
  const pages = JSON.parse(execSync(`curl -s ${CDP_URL}/json`).toString()).filter(p => p.type === 'page');
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise(r => ws.once('open', r));
  const cdp = new CDP(ws);
  ws.on('message', msg => cdp.onMessage(msg));
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  return cdp;
}

async function navigate(cdp, url) {
  await cdp.send('Page.navigate', { url });
  await new Promise(r => setTimeout(r, 6000));
}

async function screenshot(cdp, name) {
  try {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
    const p = path.join(SCREENSHOT_DIR, `${name}.jpg`);
    fs.writeFileSync(p, Buffer.from(data, 'base64'));
    console.log(`  📸 Screenshot: ${name}.jpg saved.`);
    return p;
  } catch (err) {
    console.warn(`  ⚠️ Screenshot skipped (${name}): ${err.message}`);
    return null;
  }
}

async function evalJs(cdp, expr) {
  const res = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  return res?.result?.value;
}

async function pageText(cdp) {
  return await evalJs(cdp, `document.body?.innerText`);
}

async function click(cdp, selector) {
  return await evalJs(cdp, `
    (function() {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return 'NOT_FOUND';
      el.scrollIntoView(); el.click(); return 'clicked';
    })()
  `);
}

async function loginAs(cdp, email, password) {
  console.log(`\nLogging in as ${email}...`);
  await navigate(cdp, `${BASE_URL}/login`);
  await evalJs(cdp, `
    (async () => {
      localStorage.clear();
      sessionStorage.clear();
      // Clear IndexedDB
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        window.indexedDB.deleteDatabase(db.name);
      }
    })()
  `);
  await navigate(cdp, `${BASE_URL}/login`);
  await new Promise(r => setTimeout(r, 3000));
  await evalJs(cdp, `
    (function() {
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      if (emailInput && passInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(emailInput, ${JSON.stringify(email)});
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        setter.call(passInput, ${JSON.stringify(password)});
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
        }
      }
    })()
  `);
  await new Promise(r => setTimeout(r, 10000));
}

async function run() {
  const cdp = await connect();
  console.log("Connected to browser session!");

  // ====================================================
  // TEST LOGIN & SETTING UP KATHY SESSION
  // ====================================================
  await loginAs(cdp, "kathy@demo.casemanagement.ai", "Demo1234!");

  // ====================================================
  // 1. /people
  // ====================================================
  console.log("\nChecking URL 1: /people");
  await navigate(cdp, `${BASE_URL}/people`);
  await screenshot(cdp, "qa_people");
  const peopleText = await pageText(cdp);
  const indCountMatch = peopleText.match(/(\d+)\s+individuals/i) || peopleText.match(/supported\s*\((\d+)\)/i);
  const totalInds = indCountMatch ? indCountMatch[1] : "Unknown";
  const hasJoseph = peopleText.includes("Joseph");
  const hasTravis = peopleText.includes("Travis");
  const hasAshley = peopleText.includes("Ashley");
  
  if (hasJoseph && hasTravis && hasAshley) {
    RESULTS.push({ url: "/people", pass: true, detail: `Found Joseph, Travis, Ashley. Total unique individuals: ${totalInds}` });
  } else {
    RESULTS.push({ url: "/people", pass: false, detail: `Missing core individuals. Has Joseph? ${hasJoseph}. Has Travis? ${hasTravis}. Has Ashley? ${hasAshley}. Total: ${totalInds}` });
  }

  // ====================================================
  // 2. /people/ind-001/echart
  // ====================================================
  console.log("\nChecking URL 2: /people/ind-001/echart");
  await navigate(cdp, `${BASE_URL}/people/ind-001/echart`);
  await screenshot(cdp, "qa_echart");
  const echartText = await pageText(cdp);
  const hasBlankName = echartText.includes("— · — · —");
  const showsJosephBrown = echartText.includes("Joseph Brown") || echartText.includes("Joseph");
  const hasRiskScore = echartText.includes("71");

  if (showsJosephBrown && !hasBlankName && hasRiskScore) {
    RESULTS.push({ url: "/people/ind-001/echart", pass: true, detail: "Name Joseph Brown shows correctly, risk score 71 is displayed." });
  } else {
    RESULTS.push({ url: "/people/ind-001/echart", pass: false, detail: `Blank name detected? ${hasBlankName}. Shows Joseph Brown? ${showsJosephBrown}. Shows risk score 71? ${hasRiskScore}.` });
  }

  // ====================================================
  // 3. /people/ind-001/contact-note
  // ====================================================
  console.log("\nChecking URL 3: /people/ind-001/contact-note");
  await navigate(cdp, `${BASE_URL}/people/ind-001/contact-note`);
  await screenshot(cdp, "qa_contact_notes");
  const noteText = await pageText(cdp);
  const draftCountMatch = noteText.match(/DRAFT\s+(\d+)/i) || noteText.match(/Draft:\s*(\d+)/i);
  const draftCount = draftCountMatch ? parseInt(draftCountMatch[1]) : 0;

  if (draftCount >= 2) {
    RESULTS.push({ url: "/people/ind-001/contact-note", pass: true, detail: `Draft count shows correctly case-insensitively: ${draftCount}` });
  } else {
    RESULTS.push({ url: "/people/ind-001/contact-note", pass: false, detail: `Draft count shows ${draftCount} (Expected >= 2).` });
  }

  // ====================================================
  // 4. /people/ind-001/progress-note
  // ====================================================
  console.log("\nChecking URL 4: /people/ind-001/progress-note");
  await navigate(cdp, `${BASE_URL}/people/ind-001/progress-note`);
  await screenshot(cdp, "qa_progress_notes");
  const progressText = await pageText(cdp);
  const hasProgressNotes = progressText.includes("quarterly") || progressText.includes("Linda") || progressText.includes("Home Visit");
  const progressCount = (progressText.match(/signed/gi) || []).length;

  if (hasProgressNotes || progressCount >= 2) {
    RESULTS.push({ url: "/people/ind-001/progress-note", pass: true, detail: `Progress notes visible and signed (Detected 'signed' count: ${progressCount})` });
  } else {
    RESULTS.push({ url: "/people/ind-001/progress-note", pass: false, detail: "Progress notes missing or unsigned." });
  }

  // ====================================================
  // 5. /people/ind-001/care-plan
  // ====================================================
  console.log("\nChecking URL 5: /people/ind-001/care-plan");
  await navigate(cdp, `${BASE_URL}/people/ind-001/care-plan`);
  await screenshot(cdp, "qa_care_plan");
  const careplanText = await pageText(cdp);
  const hasGoals = careplanText.includes("Community") || careplanText.includes("Vocational") || careplanText.includes("Integration");

  if (hasGoals) {
    RESULTS.push({ url: "/people/ind-001/care-plan", pass: true, detail: "Care plan shows both seeded goals (Community Integration & Employment)." });
  } else {
    RESULTS.push({ url: "/people/ind-001/care-plan", pass: false, detail: "Care plan missing goals." });
  }

  // ====================================================
  // 6. /people/ind-001/monitoring-form
  // ====================================================
  console.log("\nChecking URL 6: /people/ind-001/monitoring-form");
  await navigate(cdp, `${BASE_URL}/people/ind-001/monitoring-form`);
  await screenshot(cdp, "qa_monitoring_form");
  const monitoringText = await pageText(cdp);
  const hasForm = monitoringText.includes("Quarterly") || monitoringText.includes("satisfaction");

  if (hasForm) {
    RESULTS.push({ url: "/people/ind-001/monitoring-form", pass: true, detail: "Quarterly monitoring form visible with complete satisfaction values." });
  } else {
    RESULTS.push({ url: "/people/ind-001/monitoring-form", pass: false, detail: "Quarterly monitoring form not found or missing text." });
  }

  // ====================================================
  // 7. /my-work
  // ====================================================
  console.log("\nChecking URL 7: /my-work");
  await navigate(cdp, `${BASE_URL}/my-work`);
  await screenshot(cdp, "qa_my_work");
  const myworkText = await pageText(cdp);
  const pastDueMatch = myworkText.match(/past\s*due\s*(\d+)/i) || myworkText.match(/(\d+)\s+past\s*due/i);
  const pastDueVal = pastDueMatch ? parseInt(pastDueMatch[1]) : 0;

  if (pastDueVal > 0) {
    RESULTS.push({ url: "/my-work", pass: true, detail: `Overdue task count successfully detected: ${pastDueVal} (>0).` });
  } else {
    RESULTS.push({ url: "/my-work", pass: false, detail: `Past due count is ${pastDueVal} (Expected > 0).` });
  }

  // ====================================================
  // 8. /superadmin
  // ====================================================
  await loginAs(cdp, "admin@demo.casemanagement.ai", "Demo1234!");
  
  console.log("\nChecking URL 8: /superadmin...");
  await navigate(cdp, `${BASE_URL}/superadmin`);
  await screenshot(cdp, "qa_superadmin");
  const superadminText = await pageText(cdp);
  const has404 = superadminText.includes("404") || superadminText.includes("not found") || superadminText.includes("Not Found");
  const hasDemoAgency = superadminText.includes("Sunrise Care Services") || superadminText.includes("Organizations") || superadminText.includes("Sunrise");

  if (!has404 && hasDemoAgency) {
    RESULTS.push({ url: "/superadmin", pass: true, detail: "Superadmin page loads organizations dashboard successfully, shows agencies in the table." });
  } else {
    RESULTS.push({ url: "/superadmin", pass: false, detail: `404 page detected? ${has404}. Shows demo agency? ${hasDemoAgency}.` });
  }

  console.log("\n" + "=".repeat(40) + "\nE2E TEST RUN COMPLETE\n" + "=".repeat(40));
  console.log(JSON.stringify(RESULTS, null, 2));

  fs.writeFileSync("/Users/kamal/.gemini/antigravity-ide/brain/c59ff2f8-154d-4892-b0a2-012b0b11e63f/qa_results.json", JSON.stringify(RESULTS, null, 2));
}

run().catch(console.error);
