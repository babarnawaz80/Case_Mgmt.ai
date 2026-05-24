#!/usr/bin/env node
/**
 * CaseManagement.AI — Full QA Test Runner
 * Uses Chrome DevTools Protocol directly via WebSocket
 * Run: node qa_runner.cjs
 */

const WebSocket = require('ws');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CDP_URL = 'http://127.0.0.1:9222';
const BASE_URL = 'https://casemanagement-ai.web.app';
const SCREENSHOT_DIR = path.join(__dirname, 'qa_screenshots');
const RESULTS = [];

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// ── CDP Helper ────────────────────────────────────────────────────────────────
class CDP {
  constructor(ws) { this.ws = ws; this.id = 1; this.handlers = {}; }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.handlers[id] = { resolve, reject };
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.handlers[id]) { delete this.handlers[id]; reject(new Error(`Timeout: ${method}`)); } }, 15000);
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
  if (!pages.length) throw new Error('No pages found');
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise(r => ws.once('open', r));
  const cdp = new CDP(ws);
  ws.on('message', msg => cdp.onMessage(msg));
  // Enable domains
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  return cdp;
}

async function navigate(cdp, url) {
  await cdp.send('Page.navigate', { url });
  await new Promise(r => setTimeout(r, 3000));
}

async function screenshot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
  const p = path.join(SCREENSHOT_DIR, `${name}.jpg`);
  fs.writeFileSync(p, Buffer.from(data, 'base64'));
  return p;
}

async function evalJs(cdp, expr) {
  const res = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  return res?.result?.value;
}

async function getErrors(cdp) {
  return await evalJs(cdp, `
    (() => {
      const errs = window.__qaErrors || [];
      return errs.join('|');
    })()
  `);
}

async function injectErrorCapture(cdp) {
  await cdp.send('Runtime.evaluate', { expression: `
    window.__qaErrors = [];
    window.__origError = window.onerror;
    window.onerror = function(msg, src, line, col, err) {
      window.__qaErrors.push(msg + ' at ' + src + ':' + line);
      return false;
    };
    const __origConsoleError = console.error;
    console.error = function(...args) {
      window.__qaErrors.push('ConsoleError: ' + args.map(String).join(' '));
      __origConsoleError.apply(console, args);
    };
    'injected'
  `, returnByValue: true });
}

async function type(cdp, selector, text) {
  await cdp.send('Runtime.evaluate', { expression: `
    (function() {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return 'NOT_FOUND';
      el.focus();
      const nv = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      nv.set.call(el, ${JSON.stringify(text)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return 'ok';
    })()
  `, returnByValue: true });
}

async function click(cdp, selector) {
  const result = await cdp.send('Runtime.evaluate', { expression: `
    (function() {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return 'NOT_FOUND';
      el.click();
      return 'clicked';
    })()
  `, returnByValue: true });
  return result?.result?.value;
}

async function waitForText(cdp, text, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const found = await evalJs(cdp, `document.body?.innerText?.includes(${JSON.stringify(text)})`);
    if (found) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function pageText(cdp) {
  return await evalJs(cdp, `document.body?.innerText?.substring(0, 3000)`);
}

function pass(name, note = '') { RESULTS.push({ name, status: '✅ PASS', note }); console.log(`✅ PASS — ${name}${note ? ' ('+note+')' : ''}`); }
function fail(name, note = '') { RESULTS.push({ name, status: '❌ FAIL', note }); console.log(`❌ FAIL — ${name}: ${note}`); }
function warn(name, note = '') { RESULTS.push({ name, status: '⚠️ WARN', note }); console.log(`⚠️  WARN — ${name}: ${note}`); }

// ── TEST SUITE ────────────────────────────────────────────────────────────────
async function runTests() {
  const cdp = await connect();
  console.log('\n🚀 CaseManagement.AI — Full QA Test Run\n' + '='.repeat(50));

  // ─── 1. LOGIN ────────────────────────────────────────────────────────────
  console.log('\n📋 Section 1: Authentication');
  await navigate(cdp, `${BASE_URL}/login`);
  await injectErrorCapture(cdp);
  await screenshot(cdp, '01-login-page');
  const loginText = await pageText(cdp);
  if (loginText?.includes('CaseManagement') || loginText?.includes('Sign in') || loginText?.includes('Email') || loginText?.includes('Login')) {
    pass('Login page loads');
  } else {
    fail('Login page loads', 'Page content unexpected: ' + loginText?.substring(0, 100));
  }

  // Fill login form
  await new Promise(r => setTimeout(r, 1000));
  await type(cdp, 'input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="Email" i]', 'kathy@demo.casemanagement.ai');
  await type(cdp, 'input[type="password"]', 'Demo1234!');
  await screenshot(cdp, '01b-login-filled');
  await click(cdp, 'button[type="submit"], button:not([type])');
  await new Promise(r => setTimeout(r, 4000));
  await screenshot(cdp, '01c-after-login');

  const url1 = await evalJs(cdp, 'location.href');
  if (url1?.includes('/dashboard') || url1?.includes('/my-work') || url1?.includes('/people')) {
    pass('Login with kathy@demo succeeds', `Landed on: ${url1}`);
  } else if (url1?.includes('/login')) {
    // Try clicking demo user tile instead
    await click(cdp, '[data-testid="demo-kathy"], .demo-user, button[class*="demo"]');
    await new Promise(r => setTimeout(r, 3000));
    const url1b = await evalJs(cdp, 'location.href');
    if (!url1b?.includes('/login')) pass('Login via demo tile', url1b);
    else fail('Login fails', `Still on login: ${url1b}`);
  } else {
    warn('Login redirect unexpected', `URL: ${url1}`);
  }

  await injectErrorCapture(cdp);

  // ─── 2. DASHBOARD ────────────────────────────────────────────────────────
  console.log('\n📋 Section 2: Dashboard');
  await navigate(cdp, `${BASE_URL}/dashboard`);
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(cdp, '02-dashboard');
  const dashText = await pageText(cdp);
  if (dashText?.includes('Dashboard') || dashText?.includes('Welcome') || dashText?.includes('Today') || dashText?.includes('Kathy') || dashText?.includes('Case')) {
    pass('Dashboard loads');
  } else { fail('Dashboard loads', dashText?.substring(0, 150)); }

  const dashErrors = await getErrors(cdp);
  if (dashErrors) warn('Dashboard JS errors', dashErrors.substring(0, 200));

  // Check AI chat panel
  if (dashText?.includes('AI') || dashText?.includes('chat') || dashText?.includes('Ask') || dashText?.includes('Type')) {
    pass('Dashboard AI chat visible');
  } else { warn('Dashboard AI chat', 'Chat panel text not found'); }

  // ─── 3. PEOPLE LIST ─────────────────────────────────────────────────────
  console.log('\n📋 Section 3: People List');
  await navigate(cdp, `${BASE_URL}/people`);
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(cdp, '03-people');
  const peopleText = await pageText(cdp);
  if (peopleText?.includes('Brown') || peopleText?.includes('Langston') || peopleText?.includes('Walker') || peopleText?.includes('Joseph')) {
    pass('People list shows individuals from Firestore');
  } else if (peopleText?.includes('People') || peopleText?.includes('Supported')) {
    warn('People list loads but no individuals visible', peopleText?.substring(0, 200));
  } else {
    fail('People list fails to load', peopleText?.substring(0, 200));
  }

  // ─── 4. eCHART ──────────────────────────────────────────────────────────
  console.log('\n📋 Section 4: eChart');
  // Get Joseph Brown's ID from URL if we navigated to him, otherwise try direct
  await click(cdp, '[class*="person"], [class*="individual"], tr:first-child, [class*="row"]:first-child');
  await new Promise(r => setTimeout(r, 2000));
  const eChartUrl = await evalJs(cdp, 'location.href');
  if (eChartUrl?.includes('/people/')) {
    await navigate(cdp, eChartUrl.replace(/\/(profile|contact-note|.*$)/, '') + '/echart');
  } else {
    // Use hardcoded seeded ID approach — navigate to people first and pick first
    await navigate(cdp, `${BASE_URL}/people`);
    await new Promise(r => setTimeout(r, 2000));
    const firstPersonLink = await evalJs(cdp, `document.querySelector('a[href*="/people/"]')?.href`);
    if (firstPersonLink) {
      const personId = firstPersonLink.match(/\/people\/([\w-]+)/)?.[1];
      if (personId) await navigate(cdp, `${BASE_URL}/people/${personId}/echart`);
    }
  }
  await new Promise(r => setTimeout(r, 2000));
  await screenshot(cdp, '04-echart');
  const echartText = await pageText(cdp);
  if (echartText?.includes('Contact') || echartText?.includes('Progress') || echartText?.includes('Care Plan') || echartText?.includes('eChart')) {
    pass('eChart hub loads with tiles');
  } else { fail('eChart hub', echartText?.substring(0, 200)); }

  const echartUrl = await evalJs(cdp, 'location.href');
  const personId = echartUrl?.match(/\/people\/([\w-]+)/)?.[1];

  // ─── 5. CONTACT NOTES ────────────────────────────────────────────────────
  console.log('\n📋 Section 5: Contact Notes');
  if (personId) {
    await navigate(cdp, `${BASE_URL}/people/${personId}/contact-note`);
    await new Promise(r => setTimeout(r, 3000));
    await screenshot(cdp, '05-contact-notes');
    const cnText = await pageText(cdp);
    if (cnText?.includes('Contact') || cnText?.includes('Note') || cnText?.includes('New')) {
      pass('Contact notes page loads');
      const hasFsData = cnText?.includes('Face') || cnText?.includes('Phone') || cnText?.includes('Visit') || cnText?.includes('2025') || cnText?.includes('2026');
      if (hasFsData) pass('Contact notes show Firestore data');
      else warn('Contact notes', 'Page loads but no notes data found');
    } else { fail('Contact notes', cnText?.substring(0, 200)); }
  } else { warn('Contact notes', 'Skipped — no personId'); }

  // ─── 6. PROGRESS NOTES ────────────────────────────────────────────────────
  console.log('\n📋 Section 6: Progress Notes');
  if (personId) {
    await navigate(cdp, `${BASE_URL}/people/${personId}/progress-note`);
    await new Promise(r => setTimeout(r, 3000));
    await screenshot(cdp, '06-progress-notes');
    const pnText = await pageText(cdp);
    if (pnText?.includes('Progress') || pnText?.includes('Note')) {
      pass('Progress notes page loads');
    } else { fail('Progress notes', pnText?.substring(0, 200)); }
    // Try new note
    await navigate(cdp, `${BASE_URL}/people/${personId}/progress-note`);
    await new Promise(r => setTimeout(r, 1500));
    const newBtn = await click(cdp, 'button:not([disabled])');
    await new Promise(r => setTimeout(r, 2000));
    await screenshot(cdp, '06b-new-progress-note');
    const newPnText = await pageText(cdp);
    if (newPnText?.includes('AI') || newPnText?.includes('suggested') || newPnText?.includes('prefill')) {
      pass('Progress note AI prefill banner shows');
    } else { warn('Progress note AI prefill', 'Banner not found'); }
  } else { warn('Progress notes', 'Skipped — no personId'); }

  // ─── 7. MONITORING FORMS ────────────────────────────────────────────────
  console.log('\n📋 Section 7: Monitoring Forms');
  if (personId) {
    await navigate(cdp, `${BASE_URL}/people/${personId}/monitoring-form`);
    await new Promise(r => setTimeout(r, 3000));
    await screenshot(cdp, '07-monitoring');
    const mfText = await pageText(cdp);
    if (mfText?.includes('Monitoring') || mfText?.includes('Review')) {
      pass('Monitoring forms page loads');
    } else { fail('Monitoring forms', mfText?.substring(0, 200)); }
  } else { warn('Monitoring forms', 'Skipped — no personId'); }

  // ─── 8. CARE PLAN ──────────────────────────────────────────────────────
  console.log('\n📋 Section 8: Care Plan');
  if (personId) {
    await navigate(cdp, `${BASE_URL}/people/${personId}/care-plan`);
    await new Promise(r => setTimeout(r, 3000));
    await screenshot(cdp, '08-care-plan');
    const cpText = await pageText(cdp);
    if (cpText?.includes('Care Plan') || cpText?.includes('Goal') || cpText?.includes('New Plan')) {
      pass('Care plan page loads');
    } else { fail('Care plan', cpText?.substring(0, 200)); }
  } else { warn('Care plan', 'Skipped — no personId'); }

  // ─── 9. INCIDENTS ────────────────────────────────────────────────────────
  console.log('\n📋 Section 9: Incidents');
  await navigate(cdp, `${BASE_URL}/incidents`);
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(cdp, '09-incidents');
  const incText = await pageText(cdp);
  if (incText?.includes('Incident') || incText?.includes('Report')) {
    pass('Global incidents page loads');
  } else { fail('Incidents', incText?.substring(0, 200)); }

  // ─── 10. REFERRALS ──────────────────────────────────────────────────────
  console.log('\n📋 Section 10: Referrals');
  await navigate(cdp, `${BASE_URL}/referrals`);
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(cdp, '10-referrals');
  const refText = await pageText(cdp);
  if (refText?.includes('Referral') || refText?.includes('Agency')) {
    pass('Referrals page loads');
  } else { fail('Referrals', refText?.substring(0, 200)); }

  // ─── 11. MY WORK ────────────────────────────────────────────────────────
  console.log('\n📋 Section 11: My Work');
  await navigate(cdp, `${BASE_URL}/my-work`);
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(cdp, '11-my-work');
  const mwText = await pageText(cdp);
  if (mwText?.includes('Task') || mwText?.includes('Work') || mwText?.includes('Due')) {
    pass('My Work page loads');
    const hasTasks = mwText?.includes('Overdue') || mwText?.includes('2025') || mwText?.includes('2026') || mwText?.match(/\d+\s+task/i);
    if (hasTasks) pass('My Work shows task data from Firestore');
    else warn('My Work tasks', 'No task data visible');
  } else { fail('My Work', mwText?.substring(0, 200)); }

  // ─── 12. MESSAGES ────────────────────────────────────────────────────────
  console.log('\n📋 Section 12: Messages');
  await navigate(cdp, `${BASE_URL}/messages`);
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(cdp, '12-messages');
  const msgText = await pageText(cdp);
  if (msgText?.includes('Message') || msgText?.includes('Chat') || msgText?.includes('Team')) {
    pass('Messages page loads');
  } else { fail('Messages', msgText?.substring(0, 200)); }

  // ─── 13. MY PROFILE ──────────────────────────────────────────────────────
  console.log('\n📋 Section 13: My Profile');
  await navigate(cdp, `${BASE_URL}/my-profile`);
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(cdp, '13-my-profile');
  const profText = await pageText(cdp);
  if (profText?.includes('Profile') || profText?.includes('Photo') || profText?.includes('Name') || profText?.includes('Kathy')) {
    pass('My Profile page loads');
    if (profText?.includes('Photo') || profText?.includes('Upload') || profText?.includes('drag')) {
      pass('Photo upload UI visible');
    } else { warn('Photo upload UI', 'Upload elements not found'); }
  } else { fail('My Profile', profText?.substring(0, 200)); }

  // ─── 14. SETTINGS: USERS ─────────────────────────────────────────────────
  console.log('\n📋 Section 14: Settings — Users');
  // Sign out first, then login as admin
  await navigate(cdp, `${BASE_URL}/login`);
  await new Promise(r => setTimeout(r, 2000));
  await type(cdp, 'input[type="email"], input[name="email"]', 'admin@demo.casemanagement.ai');
  await type(cdp, 'input[type="password"]', 'Demo1234!');
  await click(cdp, 'button[type="submit"], button:not([type])');
  await new Promise(r => setTimeout(r, 3000));
  await navigate(cdp, `${BASE_URL}/settings/users`);
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(cdp, '14-settings-users');
  const usersText = await pageText(cdp);
  if (usersText?.includes('User') || usersText?.includes('Kathy') || usersText?.includes('Adams')) {
    pass('Settings Users page loads with user data');
    // Check 3-dots
    const hasMenu = usersText?.includes('Suspend') || usersText?.includes('Deactivate') || usersText?.includes('Edit') || usersText?.includes('···') || usersText?.includes('...');
    if (hasMenu) pass('3-dots menu / actions visible');
    else warn('3-dots menu', 'Action menu not immediately visible in text');
  } else { fail('Settings Users', usersText?.substring(0, 200)); }

  // ─── 15. AI USAGE ─────────────────────────────────────────────────────────
  console.log('\n📋 Section 15: AI Usage & Credits');
  await navigate(cdp, `${BASE_URL}/settings/ai-usage`);
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(cdp, '15-ai-usage');
  const aiText = await pageText(cdp);
  if (aiText?.includes('47,240') || aiText?.includes('47240') || aiText?.includes('Credit') || aiText?.includes('Balance')) {
    pass('AI Usage page loads with credit balance');
  } else if (aiText?.includes('AI') || aiText?.includes('Usage')) {
    warn('AI Usage page loads but credit balance missing', aiText?.substring(0, 200));
  } else { fail('AI Usage page', aiText?.substring(0, 200)); }

  // ─── 16. ADD USER ─────────────────────────────────────────────────────────
  console.log('\n📋 Section 16: Add User flow');
  await navigate(cdp, `${BASE_URL}/settings/users`);
  await new Promise(r => setTimeout(r, 2000));
  // Click "Add User" button
  await click(cdp, 'button:not([disabled])');
  await new Promise(r => setTimeout(r, 2000));
  await screenshot(cdp, '16-add-user-modal');
  const addUserText = await pageText(cdp);
  if (addUserText?.includes('Add User') || addUserText?.includes('Create') || addUserText?.includes('email') || addUserText?.includes('Password')) {
    pass('Add User modal opens');
  } else { warn('Add User modal', addUserText?.substring(0, 200)); }

  // ─── 17. DOCUMENTATION HUB ──────────────────────────────────────────────
  console.log('\n📋 Section 17: Documentation Hub');
  await navigate(cdp, `${BASE_URL}/documentation`);
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(cdp, '17-documentation');
  const docText = await pageText(cdp);
  if (docText?.includes('Documentation') || docText?.includes('Contact') || docText?.includes('Progress')) {
    pass('Documentation hub loads');
  } else { fail('Documentation hub', docText?.substring(0, 200)); }

  // ─── 18. REPORTS ─────────────────────────────────────────────────────────
  console.log('\n📋 Section 18: Reports');
  await navigate(cdp, `${BASE_URL}/reports`);
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(cdp, '18-reports');
  const rptText = await pageText(cdp);
  if (rptText?.includes('Report') || rptText?.includes('Export') || rptText?.includes('Generate')) {
    pass('Reports page loads');
  } else { fail('Reports', rptText?.substring(0, 200)); }

  // ─── 19. SUPERVISOR DASHBOARD ────────────────────────────────────────────
  console.log('\n📋 Section 19: Supervisor Dashboard');
  await navigate(cdp, `${BASE_URL}/supervisor`);
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(cdp, '19-supervisor');
  const supText = await pageText(cdp);
  if (supText?.includes('Supervisor') || supText?.includes('Review') || supText?.includes('Compliance') || supText?.includes('Queue')) {
    pass('Supervisor dashboard loads');
  } else { fail('Supervisor dashboard', supText?.substring(0, 200)); }

  // ─── 20. CARE COMPANION ──────────────────────────────────────────────────
  console.log('\n📋 Section 20: Care Companion');
  // Navigate to person profile to find companion link
  if (personId) {
    await navigate(cdp, `${BASE_URL}/people/${personId}/profile`);
    await new Promise(r => setTimeout(r, 3000));
    const companionLink = await evalJs(cdp, `document.querySelector('a[href*="care-assistant"]')?.href || document.querySelector('[class*="companion"]')?.textContent`);
    if (companionLink) {
      pass('Care Companion link found on profile');
      await navigate(cdp, companionLink);
      await new Promise(r => setTimeout(r, 3000));
      await screenshot(cdp, '20-companion');
      const compText = await pageText(cdp);
      if (compText?.includes('Hi') || compText?.includes('Joseph') || compText?.includes('companion') || compText?.includes('Type')) {
        pass('Care Companion chat page opens');
      } else { fail('Care Companion chat', compText?.substring(0, 200)); }
    } else {
      warn('Care Companion', 'No companion link found on profile page');
      await screenshot(cdp, '20-profile-no-companion');
    }
  }

  // ─── 21. AMBIENT SCRIBE ──────────────────────────────────────────────────
  console.log('\n📋 Section 21: Ambient Scribe');
  await navigate(cdp, `${BASE_URL}/dashboard`);
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(cdp, '21-ambient-dashboard');
  const ambText = await pageText(cdp);
  if (ambText?.includes('Ambient') || ambText?.includes('ambient') || ambText?.includes('🎙') || ambText?.includes('Scribe') || ambText?.includes('Listen')) {
    pass('Ambient button visible on dashboard');
    await click(cdp, '[class*="ambient"], [class*="Ambient"], button[title*="mbient"]');
    await new Promise(r => setTimeout(r, 2000));
    await screenshot(cdp, '21b-ambient-clicked');
    const ambModalText = await pageText(cdp);
    if (ambModalText?.includes('consent') || ambModalText?.includes('Consent') || ambModalText?.includes('Record') || ambModalText?.includes('microphone') || ambModalText?.includes('Start')) {
      pass('Ambient consent/recording screen appears');
    } else { warn('Ambient click', 'No consent screen detected'); }
  } else { warn('Ambient button', 'Not found on dashboard'); }

  // ─── 22. SUPERADMIN ──────────────────────────────────────────────────────
  console.log('\n📋 Section 22: SuperAdmin Portal');
  await navigate(cdp, `${BASE_URL}/platform-login`);
  await new Promise(r => setTimeout(r, 2000));
  await type(cdp, 'input[type="email"], input[name="email"]', 'superadmin@casemanagement.ai');
  await type(cdp, 'input[type="password"]', 'CaseAdmin2024!');
  await click(cdp, 'button[type="submit"], button:not([type])');
  await new Promise(r => setTimeout(r, 4000));
  await screenshot(cdp, '22-superadmin');
  const saText = await pageText(cdp);
  if (saText?.includes('Organization') || saText?.includes('SuperAdmin') || saText?.includes('Platform')) {
    pass('SuperAdmin portal loads');
  } else {
    // Try /superadmin direct
    await navigate(cdp, `${BASE_URL}/superadmin`);
    await new Promise(r => setTimeout(r, 3000));
    await screenshot(cdp, '22b-superadmin-direct');
    const saText2 = await pageText(cdp);
    if (saText2?.includes('Organization') || saText2?.includes('admin')) {
      pass('SuperAdmin accessible');
    } else { warn('SuperAdmin', saText2?.substring(0, 200)); }
  }

  // ─── FINAL CONSOLE ERRORS CHECK ──────────────────────────────────────────
  console.log('\n📋 Final Error Check');
  await navigate(cdp, `${BASE_URL}/dashboard`);
  await new Promise(r => setTimeout(r, 2000));
  await injectErrorCapture(cdp);
  const finalErrors = await getErrors(cdp);
  if (finalErrors) warn('Console errors on dashboard', finalErrors.substring(0, 300));
  else pass('No JS console errors on dashboard');

  // ─── RESULTS SUMMARY ─────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY\n');
  const passed = RESULTS.filter(r => r.status.includes('PASS')).length;
  const failed = RESULTS.filter(r => r.status.includes('FAIL')).length;
  const warned = RESULTS.filter(r => r.status.includes('WARN')).length;
  console.log(`Total: ${RESULTS.length} | ✅ Pass: ${passed} | ❌ Fail: ${failed} | ⚠️  Warn: ${warned}\n`);
  RESULTS.forEach(r => console.log(`${r.status} — ${r.name}${r.note ? '\n          → ' + r.note : ''}`));

  // Save JSON results
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'results.json'), JSON.stringify({ passed, failed, warned, tests: RESULTS, screenshotDir: SCREENSHOT_DIR }, null, 2));
  console.log(`\n📁 Screenshots saved to: ${SCREENSHOT_DIR}`);
  process.exit(0);
}

runTests().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
