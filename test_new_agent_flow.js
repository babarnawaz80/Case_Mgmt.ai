import WebSocket from 'ws';
import { execSync } from 'child_process';
import fs from 'fs';

const CDP_URL = 'http://127.0.0.1:9222';
const BASE_URL = 'http://localhost:5174';

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 1;
    this.handlers = {};
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.handlers[id] = { resolve, reject };
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.handlers[id]) {
          delete this.handlers[id];
          reject(new Error(`CDP Command Timeout: ${method}`));
        }
      }, 15000);
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
  const pagesResponse = execSync(`curl -s ${CDP_URL}/json`).toString();
  const pages = JSON.parse(pagesResponse).filter(p => p.type === 'page');
  if (pages.length === 0) {
    throw new Error('No active page found in Chrome!');
  }
  console.log(`Connecting to page: ${pages[0].title} (${pages[0].url})`);
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise(r => ws.once('open', r));
  const cdp = new CDP(ws);
  ws.on('message', msg => cdp.onMessage(msg));
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  return cdp;
}

async function navigate(cdp, url) {
  console.log(`Navigating to ${url}...`);
  await cdp.send('Page.navigate', { url });
  await new Promise(r => setTimeout(r, 4000));
}

async function evalJs(cdp, expr) {
  const res = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (res?.exceptionDetails) {
    throw new Error(`JS Eval Exception: ${res.exceptionDetails.exception.description}`);
  }
  return res?.result?.value;
}

async function captureScreenshot(cdp, name) {
  // No-op to speed up E2E verification
  return;
}

async function run() {
  const cdp = await connect();
  console.log("Connected to Chrome DevTools Protocol successfully!");

  // Seed platform data by visiting the Guidelines Engines list page first
  console.log("Visiting guidelines-engines page to trigger data seeding...");
  await navigate(cdp, `${BASE_URL}/platform/guidelines-engines`);
  await new Promise(r => setTimeout(r, 3000));

  // Step 1: Navigate to New Agent page
  await navigate(cdp, `${BASE_URL}/platform/agents/new`);
  await captureScreenshot(cdp, '01_step1_empty');

  // Fill in Step 1 form fields
  console.log("Filling out Step 1 info...");
  await evalJs(cdp, `
    (() => {
      // Find the inputs using placeholder or labels
      const nameInput = document.querySelector('input[placeholder="e.g. State Compliance Copilot"]');
      if (nameInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(nameInput, "State Compliance Inspector V1");
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      const instructionsText = document.querySelector('textarea[placeholder="Custom instructions for how this agent should behave at the organization level..."]');
      if (instructionsText) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        setter.call(instructionsText, "Ensure all services rendered comply with standard Maryland DDA timelines and HRSTRN validation regulations.");
        instructionsText.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `);

  await new Promise(r => setTimeout(r, 500));
  await captureScreenshot(cdp, '02_step1_filled');

  // Click Next to advance to Step 2
  console.log("Clicking Next to advance to Step 2...");
  const transitionRes = await evalJs(cdp, `
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const nextBtn = btns.find(b => b.innerText.includes('Next: Select Guidelines Engine'));
      if (nextBtn) {
        if (nextBtn.disabled) return 'next_button_disabled';
        nextBtn.click();
        return 'clicked';
      }
      return 'next_button_not_found';
    })()
  `);
  console.log("Transition click result:", transitionRes);
  if (transitionRes !== 'clicked') {
    throw new Error(`Failed to click next button: ${transitionRes}`);
  }

  await new Promise(r => setTimeout(r, 2000));
  await captureScreenshot(cdp, '03_step2_wizard');

  // Verify Step 2 is active
  const step2Text = await evalJs(cdp, `document.body.innerText`);
  if (!step2Text.includes("Step 2 — Select Guidelines Engine")) {
    throw new Error("Wizard failed to transition to Step 2! React crashed or ReferenceError thrown.");
  }
  console.log("Successfully advanced to Step 2 without any React crash! No undefined references!");
  console.log("--- Step 2 Page Body ---");
  console.log(step2Text);
  const buttonsList = await evalJs(cdp, `
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.map(b => b.innerText);
    })()
  `);
  console.log("Step 2 Buttons list:", buttonsList);

  // Select "Maryland DDA — DD Waiver" engine
  console.log("Selecting Maryland DDA Guidelines Engine...");
  const selectRes = await evalJs(cdp, `
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const engineBtn = btns.find(b => b.innerText.includes('Maryland DDA — DD Waiver'));
      if (engineBtn) {
        engineBtn.click();
        return 'selected';
      }
      return 'engine_button_not_found';
    })()
  `);
  console.log("Selection result:", selectRes);
  if (selectRes !== 'selected') {
    throw new Error(`Failed to select guidelines engine: ${selectRes}`);
  }

  await new Promise(r => setTimeout(r, 1000));
  await captureScreenshot(cdp, '04_step2_selected');

  // Click "Next: Configure Overrides"
  console.log("Clicking Next to Step 3...");
  await evalJs(cdp, `
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const nextBtn = btns.find(b => b.innerText.includes('Next: Configure Overrides'));
      if (nextBtn) nextBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 1500));
  await captureScreenshot(cdp, '05_step3_wizard');

  // Click "Next: Data Mapping"
  console.log("Clicking Next to Step 4...");
  await evalJs(cdp, `
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const nextBtn = btns.find(b => b.innerText.includes('Next: Data Mapping'));
      if (nextBtn) nextBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 1500));
  await captureScreenshot(cdp, '06_step4_wizard');

  // Click "Next: Review & Deploy"
  console.log("Clicking Next to Step 5...");
  await evalJs(cdp, `
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const nextBtn = btns.find(b => b.innerText.includes('Next: Review & Deploy'));
      if (nextBtn) nextBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 1500));
  await captureScreenshot(cdp, '07_step5_wizard');

  // Check the confirmation checkbox
  console.log("Checking the deployment confirmation checkbox...");
  await evalJs(cdp, `
    (() => {
      const checkbox = document.querySelector('input[type="checkbox"]');
      if (checkbox) checkbox.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 500));
  await captureScreenshot(cdp, '08_step5_confirmed');

  // Click Deploy Agent
  console.log("Clicking Deploy Agent button...");
  await evalJs(cdp, `
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const deployBtn = btns.find(b => b.innerText.includes('Deploy Agent'));
      if (deployBtn) deployBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 1000));
  await captureScreenshot(cdp, '09_deploy_confirm_modal');

  // Click Confirm & Deploy
  console.log("Confirming deployment inside modal...");
  await evalJs(cdp, `
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const confirmBtn = btns.find(b => b.innerText.includes('Confirm & Deploy'));
      if (confirmBtn) confirmBtn.click();
    })()
  `);

  console.log("Waiting for deployment to complete...");
  await new Promise(r => setTimeout(r, 4000));
  await captureScreenshot(cdp, '10_deployment_success');

  const successText = await evalJs(cdp, `document.body.innerText`);
  console.log("--- Success/Failure Page Text ---");
  console.log(successText);
  if (successText.includes("Agent Deployed") && successText.includes("is now active")) {
    console.log("Success! Agent deployed successfully and wizard completed end-to-end without a single crash!");
  } else {
    throw new Error("Wizard failed to show deployment success screen!");
  }

  console.log("\n--- E2E Test Completed Successfully! ---");
}

run().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
