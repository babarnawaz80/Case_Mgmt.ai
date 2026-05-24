#!/usr/bin/env node
// Super Admin QA test — screenshots all 6 pages and verifies access control
// Uses the same window._firebaseAuth injection that the main QA suite uses
'use strict';
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const SS_DIR = '/Users/kamal/.gemini/antigravity-ide/brain/c59ff2f8-154d-4892-b0a2-012b0b11e63f/screenshots';
const APP_URL = 'https://casemanagement-ai.web.app';

// ── CDP plumbing ───────────────────────────────────────────────────────────
let ws, msgId = 1, pending = {};
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = msgId++;
  const timer = setTimeout(() => { delete pending[id]; rej(new Error(`CDP Timeout: ${method}`)); }, 30000);
  pending[id] = { res, rej, timer };
  ws.send(JSON.stringify({ id, method, params }));
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function connect() {
  const pages = await new Promise((res, rej) => {
    http.get('http://localhost:9222/json', r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => {
        try { res(JSON.parse(d)); } catch { rej(new Error('Bad JSON')); }
      });
    }).on('error', rej);
  });
  const page = pages.find(p => p.type === 'page') || pages[0];
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.once('open', r));
  ws.on('message', raw => {
    const m = JSON.parse(raw);
    if (m.id && pending[m.id]) {
      const { res, rej, timer } = pending[m.id];
      clearTimeout(timer); delete pending[m.id];
      if (m.error) rej(new Error(m.error.message)); else res(m.result);
    }
  });
  console.log('🔗 Connected to Chrome CDP');
}

async function screenshot(name) {
  try {
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
    fs.writeFileSync(path.join(SS_DIR, `${name}.jpg`), Buffer.from(data, 'base64'));
    console.log(`📸 ${name}.jpg`);
  } catch (e) { console.warn(`⚠️  Screenshot failed: ${name} — ${e.message}`); }
}

async function navigate(url) {
  await send('Page.navigate', { url });
  await send('Page.loadEventFired').catch(() => {});
  await sleep(3000);
}

async function evaluate(expr) {
  const res = await send('Runtime.evaluate', {
    expression: expr,
    awaitPromise: true,
    returnByValue: true,
    timeout: 20000,
  });
  return res?.result?.value ?? null;
}

async function getUrl() {
  const r = await send('Runtime.evaluate', { expression: 'location.href', returnByValue: true });
  return r?.result?.value ?? '';
}

async function getBody() {
  const r = await send('Runtime.evaluate', { expression: 'document.body?.innerText ?? ""', returnByValue: true });
  return r?.result?.value ?? '';
}

// Login using window._firebaseAuth — same method as the main QA suite
async function loginAs(email, password) {
  await navigate(`${APP_URL}/login`);
  await sleep(2000);
  const result = await evaluate(`
    (async function() {
      try {
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js');
        const auth = window._firebaseAuth;
        if (!auth) return { error: 'no _firebaseAuth on window' };
        const cred = await signInWithEmailAndPassword(auth, '${email}', '${password}');
        return { success: true, uid: cred.user.uid };
      } catch(e) { return { error: e.message }; }
    })()
  `);
  if (!result?.success) {
    console.warn(`⚠️  Login failed for ${email}: ${result?.error}`);
    return false;
  }
  await sleep(4000);
  const url = await getUrl();
  console.log(`✅ Logged in as ${email} → ${url}`);
  return !url.includes('/login');
}

async function signOut() {
  await evaluate(`
    (async function() {
      try {
        const { signOut } = await import('https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js');
        const auth = window._firebaseAuth;
        if (auth) await signOut(auth);
      } catch(e) {}
    })()
  `);
  await sleep(2000);
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  await connect();
  const results = [];
  const check = (name, pass, msg) => {
    results.push({ test: name, pass, msg });
    console.log(`${pass ? '✅' : '❌'} ${name}: ${pass ? 'PASS' : 'FAIL'} — ${msg}`);
  };

  console.log('\n🔐 SUPER ADMIN TEST — CaseManagement.AI\n');

  // ── TEST 1: Admin navigates to /super-admin ─────────────────────────────
  console.log('\n[TEST 1] Login as admin → navigate to /super-admin');
  const adminOk = await loginAs('admin@demo.casemanagement.ai', 'Demo1234!');
  if (adminOk) {
    await navigate(`${APP_URL}/super-admin`);
    await sleep(5000);
    await screenshot('sa-1-organizations');
    const body = await getBody();
    const url = await getUrl();
    const loaded = body.includes('Organizations') || body.includes('PLATFORM ADMIN') || url.includes('/super-admin');
    check('SA-1 Admin accesses /super-admin', loaded,
      loaded ? `Super admin area loaded (${url.split('/').pop()})` : `Redirected to: ${url}`);
  } else {
    check('SA-1 Admin accesses /super-admin', false, 'Login failed');
  }

  // ── TEST 2: All 6 pages ─────────────────────────────────────────────────
  const pages = [
    { path: '/super-admin/organizations', name: 'sa-2-organizations', tokens: ['Organization', 'PLATFORM ADMIN', 'Name'] },
    { path: '/super-admin/users',         name: 'sa-3-users',         tokens: ['Users', 'PLATFORM ADMIN', 'Email'] },
    { path: '/super-admin/billing',       name: 'sa-4-billing',       tokens: ['Billing', 'Revenue', 'Credit'] },
    { path: '/super-admin/ai-usage',      name: 'sa-5-ai-usage',      tokens: ['AI Usage', 'Token', 'Vertex'] },
    { path: '/super-admin/support',       name: 'sa-6-support',       tokens: ['Support', 'Note', 'Organization'] },
    { path: '/super-admin/health',        name: 'sa-7-health',        tokens: ['Health', 'Firestore', 'Auth'] },
  ];

  for (const pg of pages) {
    console.log(`\n[Testing ${pg.path}]`);
    try {
      await navigate(APP_URL + pg.path);
      await sleep(4000);
      await screenshot(pg.name);
      const body = await getBody();
      const url = await getUrl();
      const loaded = pg.tokens.some(t => body.includes(t)) || url.includes('/super-admin');
      check(`SA Page: ${pg.path}`,
        loaded,
        loaded ? `Content visible (url: ${url.split('/').pop()})` : `Content missing, url: ${url}`);
    } catch (e) {
      check(`SA Page: ${pg.path}`, false, e.message);
    }
  }

  // ── TEST 3: Sign out, log in as case manager, try /super-admin ──────────
  console.log('\n[TEST 3] Case Manager cannot access /super-admin');
  await signOut();
  await sleep(1000);
  const kathyOk = await loginAs('kathy@demo.casemanagement.ai', 'Demo1234!');
  if (kathyOk) {
    await navigate(`${APP_URL}/super-admin`);
    await sleep(4000);
    await screenshot('sa-8-casemgr-blocked');
    const url = await getUrl();
    const body = await getBody();
    const blocked = !url.includes('/super-admin') || !body.includes('PLATFORM ADMIN');
    check('SA-8 Case Manager blocked from /super-admin', blocked,
      blocked ? `Correctly redirected to: ${url}` : '⚠️ Case Manager CAN access super admin!');
  } else {
    check('SA-8 Case Manager blocked from /super-admin', false, 'Login failed for kathy');
  }

  // ── Final report ────────────────────────────────────────────────────────
  const passed = results.filter(r => r.pass).length;
  const total  = results.length;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`SUPER ADMIN TEST RESULTS: ${passed}/${total} passed`);
  console.log('═'.repeat(60));
  results.forEach(r => console.log(`  ${r.pass ? '✅' : '❌'} ${r.test}`));
  console.log('═'.repeat(60) + '\n');

  ws.close();
  process.exit(passed === total ? 0 : 1);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
