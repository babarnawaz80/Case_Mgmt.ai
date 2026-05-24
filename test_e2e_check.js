import WebSocket from 'ws';
import { execSync } from 'child_process';

const CDP_URL = 'http://127.0.0.1:9222';
const BASE_URL = 'https://casemanagement-ai.web.app';

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
  console.log(`Navigating to ${url}...`);
  await cdp.send('Page.navigate', { url });
  await new Promise(r => setTimeout(r, 6000));
}

async function evalJs(cdp, expr) {
  const res = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  return res?.result?.value;
}

async function pageText(cdp) {
  return await evalJs(cdp, `document.body?.innerText`);
}

async function loginAs(cdp, email, password) {
  console.log(`Logging in as ${email}...`);
  await navigate(cdp, `${BASE_URL}/login`);
  await evalJs(cdp, `
    (async () => {
      localStorage.clear();
      sessionStorage.clear();
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
  console.log("Connected to Chrome DevTools!");

  await loginAs(cdp, "kathy@demo.casemanagement.ai", "Demo1234!");

  // URL 3: Contact Note
  await navigate(cdp, `${BASE_URL}/people/ind-001/contact-note`);
  const noteText = await pageText(cdp);
  console.log("\n--- Contact Note Page Text ---");
  console.log(noteText);
  const draftCountMatch = noteText.match(/DRAFT\s+(\d+)/i) || noteText.match(/Draft:\s*(\d+)/i);
  console.log("Matched draftCount:", draftCountMatch ? draftCountMatch[0] : "None");

  // URL 5: Care Plan
  await navigate(cdp, `${BASE_URL}/people/ind-001/care-plan`);
  const careplanText = await pageText(cdp);
  console.log("\n--- Care Plan Page Text ---");
  console.log(careplanText);

  // URL 6: Monitoring Form
  await navigate(cdp, `${BASE_URL}/people/ind-001/monitoring-form`);
  const monitoringText = await pageText(cdp);
  console.log("\n--- Monitoring Form Page Text ---");
  console.log(monitoringText);

  console.log("\nTest complete!");
}

run().catch(console.error);
