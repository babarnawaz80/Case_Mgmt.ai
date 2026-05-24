const WebSocket = require('ws');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

async function evalJs(cdp, expr) {
  const res = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  return res?.result?.value;
}

async function run() {
  const cdp = await connect();
  console.log("Connected to browser");

  const url = await evalJs(cdp, `location.href`);
  console.log("Current URL in Chrome:", url);

  const localKeys = await evalJs(cdp, `JSON.stringify(Object.keys(localStorage))`);
  console.log("localStorage keys:", localKeys);

  const localProfile = await evalJs(cdp, `localStorage.getItem('user_profile') || localStorage.getItem('profile') || 'no profile in localStorage'`);
  console.log("localStorage Profile:", localProfile);

  const authUser = await evalJs(cdp, `
    (() => {
      // Find the auth user in our local app state if possible, or localStorage
      const k = Object.keys(localStorage).find(key => key.startsWith('firebase:authUser'));
      return k ? localStorage.getItem(k) : 'no firebase authUser key in localStorage';
    })()
  `);
  console.log("Auth User in localStorage:", authUser);
}

run().catch(console.error);
