const WebSocket = require('ws');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CDP_URL = 'http://127.0.0.1:9222';
const SCREENSHOT_DIR = '/Users/kamal/.gemini/antigravity-ide/brain/c59ff2f8-154d-4892-b0a2-012b0b11e63f';

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

async function evalJs(cdp, expr) {
  const res = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  return res?.result?.value;
}

async function screenshot(cdp, name) {
  try {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
    const p = path.join(SCREENSHOT_DIR, `${name}.jpg`);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, Buffer.from(data, 'base64'));
    console.log(`📸 Screenshot saved: ${p}`);
    return p;
  } catch (err) {
    console.error(`Failed to take screenshot (${name}):`, err);
    return null;
  }
}

async function run() {
  const cdp = await connect();
  console.log("Connected to Chrome via CDP!");

  // 1. Navigate to Messages page
  console.log("Navigating to Messages page...");
  await cdp.send('Page.navigate', { url: 'https://casemanagement-ai.web.app/messages' });
  await new Promise(r => setTimeout(r, 4000));

  // Force cache-ignoring reload to make sure the newly deployed build is active
  console.log("Forcing reload (ignoreCache)...");
  await cdp.send('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 4000));

  // 2. Click "New message"
  console.log("Clicking New message button...");
  const clickRes = await evalJs(cdp, `
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('New message'));
      if (btn) {
        btn.click();
        return "SUCCESS";
      }
      return "NOT_FOUND";
    })()
  `);
  console.log("New message button click status:", clickRes);
  await new Promise(r => setTimeout(r, 2000));

  // Capture modal open screenshot (showing list of all organization users)
  console.log("Capturing new message modal screenshot...");
  await screenshot(cdp, 'messages-new-modal-open');

  // 3. Search for "babar"
  console.log("Searching for 'babar' in staff input...");
  const searchRes = await evalJs(cdp, `
    (() => {
      const input = document.querySelector('input[placeholder="Search staff..."]');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(input, 'babar');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return "SUCCESS";
      }
      return "NOT_FOUND";
    })()
  `);
  console.log("Search input status:", searchRes);
  await new Promise(r => setTimeout(r, 2000));

  // Capture search result screenshot
  console.log("Capturing search results screenshot...");
  await screenshot(cdp, 'messages-search-jennie');

  // 4. Click on Babar Nawaz
  console.log("Selecting Babar Nawaz...");
  const selectRes = await evalJs(cdp, `
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Babar Nawaz') && !b.textContent.includes('Test'));
      if (btn) {
        btn.click();
        return "SUCCESS";
      }
      return "NOT_FOUND";
    })()
  `);
  console.log("Select user status:", selectRes);
  await new Promise(r => setTimeout(r, 1500));

  // 5. Click "Start conversation"
  console.log("Starting conversation...");
  const startRes = await evalJs(cdp, `
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Start conversation'));
      if (btn) {
        btn.click();
        return "SUCCESS";
      }
      return "NOT_FOUND";
    })()
  `);
  console.log("Start conversation status:", startRes);
  await new Promise(r => setTimeout(r, 3000));

  // Capture conversation active view screenshot
  console.log("Capturing conversation started screenshot...");
  await screenshot(cdp, 'messages-conversation-started');

  console.log("Done testing messages page!");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
