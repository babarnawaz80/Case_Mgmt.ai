#!/usr/bin/env node
/**
 * QA Pass 2 — Targeted tests for the 7 warnings from Pass 1
 * - Extracts real personId from Firestore
 * - Tests all person-specific screens
 * - Tests Ambient button
 * - Tests 3-dots menu
 * - Tests Care Companion
 */

const WebSocket = require('ws');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CDP_URL = 'http://127.0.0.1:9222';
const BASE_URL = 'https://casemanagement-ai.web.app';
const SCREENSHOT_DIR = path.join(__dirname, 'qa_screenshots_pass2');
const RESULTS = [];

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

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
  await new Promise(r => setTimeout(r, 3500));
}

async function screenshot(cdp, name) {
  try {
    const { data } = await Promise.race([
      cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 85 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Screenshot capture timed out')), 5000))
    ]);
    const p = path.join(SCREENSHOT_DIR, `${name}.jpg`);
    fs.writeFileSync(p, Buffer.from(data, 'base64'));
    console.log(`  📸 Screenshot: ${name}.jpg`);
    return p;
  } catch (err) {
    console.warn(`  ⚠️  Screenshot skipped (${name}): ${err.message}`);
    return null;
  }
}

async function evalJs(cdp, expr) {
  const res = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  return res?.result?.value;
}

async function pageText(cdp) {
  return await evalJs(cdp, `document.body?.innerText?.substring(0, 5000)`);
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

async function clickText(cdp, text) {
  return await evalJs(cdp, `
    (function() {
      const all = [...document.querySelectorAll('button,a,[role="button"]')];
      const el = all.find(e => e.innerText?.trim().toLowerCase().includes(${JSON.stringify(text.toLowerCase())}));
      if (!el) return 'NOT_FOUND';
      el.scrollIntoView(); el.click(); return 'clicked:' + el.innerText.trim().substring(0,30);
    })()
  `);
}

async function waitForText(cdp, text, ms = 8000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const found = await evalJs(cdp, `document.body?.innerText?.toLowerCase().includes(${JSON.stringify(text.toLowerCase())})`);
    if (found) return true;
    await new Promise(r => setTimeout(r, 600));
  }
  return false;
}

async function getConsoleErrors(cdp) {
  return await evalJs(cdp, `window.__qaErrors?.join(' | ') || ''`);
}

async function injectErrorCapture(cdp) {
  await evalJs(cdp, `
    window.__qaErrors = [];
    window.addEventListener('error', e => window.__qaErrors.push(e.message));
    window.addEventListener('unhandledrejection', e => window.__qaErrors.push('Promise: ' + e.reason));
    const orig = console.error;
    console.error = (...a) => { window.__qaErrors.push(a.map(String).join(' ')); orig(...a); };
    'ok'
  `);
}

function pass(name, note = '') { RESULTS.push({ name, status: '✅ PASS', note }); console.log(`  ✅ PASS — ${name}${note ? '  ('+note+')' : ''}`); }
function fail(name, note = '') { RESULTS.push({ name, status: '❌ FAIL', note }); console.log(`  ❌ FAIL — ${name}: ${note}`); }
function warn(name, note = '') { RESULTS.push({ name, status: '⚠️  WARN', note }); console.log(`  ⚠️  WARN — ${name}: ${note}`); }

async function runTests() {
  const cdp = await connect();
  console.log('\n🔬 QA Pass 2 — Targeted Re-Test of Warnings\n' + '='.repeat(55));

  // ── STEP 0: Get real personId from people list ─────────────────────────────
  console.log('\n🔐 Logging in as Kathy via demo tile...');
  await navigate(cdp, `${BASE_URL}/login`);
  await new Promise(r => setTimeout(r, 1500));
  await click(cdp, '[data-testid="demo-kathy"], .demo-user, button[class*="demo"]');
  await new Promise(r => setTimeout(r, 3000));

  console.log('\n🔍 Extracting personId from People list...');
  await navigate(cdp, `${BASE_URL}/people`);
  await injectErrorCapture(cdp);
  
  // Extract first person's ID by clicking their eChart button
  console.log('  Attempting to click first person eChart button...');
  const clicked = await clickText(cdp, 'eChart');
  console.log('  eChart button click status:', clicked);
  await new Promise(r => setTimeout(r, 3000));
  const url = await evalJs(cdp, 'location.href');
  let personId = url?.match(/\/people\/([\w-]+)/)?.[1];

  if (personId) {
    console.log(`  ✓ Got personId: ${personId}`);
  } else {
    console.log('  ✗ Click-based extraction failed.');
  }

  await screenshot(cdp, '00-people-list');

  // ── SECTION 5: CONTACT NOTES ────────────────────────────────────────────────
  console.log('\n📋 Section 5: Contact Notes');
  if (personId) {
    await navigate(cdp, `${BASE_URL}/people/${personId}/contact-note`);
    await screenshot(cdp, '05-contact-notes');
    const text = await pageText(cdp);
    const errors = await getConsoleErrors(cdp);
    
    if (errors) warn('Contact notes console errors', errors.substring(0, 200));
    if (text?.includes('Contact') || text?.includes('Note') || text?.includes('New')) {
      pass('Contact notes page loads');
      // Check for real data
      const hasData = text?.match(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|Face-to-face|Phone|Visit|PERMISSION_DENIED/);
      if (text?.includes('PERMISSION_DENIED')) fail('Contact notes Firestore read', 'PERMISSION_DENIED error');
      else if (hasData) pass('Contact notes shows Firestore data');
      else warn('Contact notes data', 'Page loads but no note entries visible');

      // Try adding new note
      const clicked = await clickText(cdp, 'new');
      await new Promise(r => setTimeout(r, 2000));
      await screenshot(cdp, '05b-new-contact-note');
      const newText = await pageText(cdp);
      if (newText?.includes('Contact') && (newText?.includes('Type') || newText?.includes('Date') || newText?.includes('Purpose') || newText?.includes('Note'))) {
        pass('New contact note form opens');
      } else { warn('New contact note form', 'Could not open or verify form'); }
    } else {
      fail('Contact notes page', text?.substring(0, 200));
    }
  }

  // ── SECTION 6: PROGRESS NOTES ───────────────────────────────────────────────
  console.log('\n📋 Section 6: Progress Notes');
  if (personId) {
    await navigate(cdp, `${BASE_URL}/people/${personId}/progress-note`);
    await screenshot(cdp, '06-progress-notes');
    const text = await pageText(cdp);
    
    if (text?.includes('PERMISSION_DENIED')) {
      fail('Progress notes Firestore read', 'PERMISSION_DENIED');
    } else if (text?.includes('Progress') || text?.includes('Note')) {
      pass('Progress notes page loads');
      
      const hasData = text?.match(/\d{4}-\d{2}-\d{2}|Signed|Draft|Face-to-face/);
      if (hasData) pass('Progress notes shows Firestore data');
      else warn('Progress notes data', 'Page loads but no notes visible');

      // Click New Progress Note
      const clicked = await clickText(cdp, 'new');
      await new Promise(r => setTimeout(r, 2500));
      await screenshot(cdp, '06b-new-progress-note');
      const newText = await pageText(cdp);
      
      if (newText?.includes('AI') || newText?.includes('suggested') || newText?.includes('prefill') || newText?.includes('assist')) {
        pass('Progress note AI prefill banner visible');
      } else { warn('Progress note AI prefill', 'No AI banner found on new note form'); }
      
      if (newText?.includes('Activity') || newText?.includes('Date') || newText?.includes('Contact Type')) {
        pass('Progress note form fields present');
      } else { warn('Progress note form', 'Fields not detected: ' + newText?.substring(0, 150)); }
    } else {
      fail('Progress notes page', text?.substring(0, 200));
    }
  }

  // ── SECTION 7: MONITORING FORMS ─────────────────────────────────────────────
  console.log('\n📋 Section 7: Monitoring Forms');
  if (personId) {
    await navigate(cdp, `${BASE_URL}/people/${personId}/monitoring-form`);
    await screenshot(cdp, '07-monitoring-forms');
    const text = await pageText(cdp);
    
    if (text?.includes('PERMISSION_DENIED')) {
      fail('Monitoring forms Firestore read', 'PERMISSION_DENIED');
    } else if (text?.includes('Monitoring') || text?.includes('Review') || text?.includes('Form')) {
      pass('Monitoring forms page loads');
      
      // Check for data
      if (text?.includes('Quarterly') || text?.includes('Annual') || text?.includes('Monthly') || text?.match(/\d{4}-\d{2}-\d{2}/)) {
        pass('Monitoring forms shows Firestore data');
      } else { warn('Monitoring forms data', 'No form entries visible'); }

      // Add Review button
      const addReview = await clickText(cdp, 'add review');
      await new Promise(r => setTimeout(r, 2000));
      await screenshot(cdp, '07b-add-review');
      const reviewText = await pageText(cdp);
      if (reviewText?.includes('Quarterly') || reviewText?.includes('Annual') || reviewText?.includes('Review Type')) {
        pass('Add Review modal opens with type options');
      } else { warn('Add Review', 'Modal not detected: ' + reviewText?.substring(0, 150)); }
    } else {
      fail('Monitoring forms page', text?.substring(0, 200));
    }
  }

  // ── SECTION 8: CARE PLAN ────────────────────────────────────────────────────
  console.log('\n📋 Section 8: Care Plan');
  if (personId) {
    await navigate(cdp, `${BASE_URL}/people/${personId}/care-plan`);
    await screenshot(cdp, '08-care-plan');
    const text = await pageText(cdp);
    
    if (text?.includes('PERMISSION_DENIED')) {
      fail('Care plan Firestore read', 'PERMISSION_DENIED');
    } else if (text?.includes('Care Plan') || text?.includes('Goal') || text?.includes('Plan')) {
      pass('Care plan page loads');
      
      // Try new plan
      const newPlan = await clickText(cdp, 'new plan');
      await new Promise(r => setTimeout(r, 2000));
      await screenshot(cdp, '08b-new-plan-modal');
      const planText = await pageText(cdp);
      if (planText?.includes('AI draft') || planText?.includes('Start with AI') || planText?.includes('AI')) {
        pass('Care plan "Start with AI draft" button visible');
        await clickText(cdp, 'ai draft');
        await new Promise(r => setTimeout(r, 6000)); // AI generation takes time
        await screenshot(cdp, '08c-ai-draft-result');
        const draftText = await pageText(cdp);
        if (draftText?.includes('Goal') || draftText?.includes('Objective') || draftText?.includes('Strength')) {
          pass('Care plan AI draft generates goals');
        } else { warn('Care plan AI draft', 'Draft content not detected: ' + draftText?.substring(0, 200)); }
      } else { warn('Care plan AI draft button', 'Not found in modal: ' + planText?.substring(0, 150)); }
    } else {
      fail('Care plan page', text?.substring(0, 200));
    }
  }

  // ── SECTION 20: CARE COMPANION ──────────────────────────────────────────────
  console.log('\n📋 Section 20: Care Companion');
  if (personId) {
    await navigate(cdp, `${BASE_URL}/people/${personId}/profile`);
    await new Promise(r => setTimeout(r, 3000));
    await screenshot(cdp, '20-person-profile');
    const profileText = await pageText(cdp);
    
    // Look for companion link
    const companionHref = await evalJs(cdp, `
      const links = [...document.querySelectorAll('a,button')];
      const link = links.find(l => l.href?.includes('care-assistant') || l.innerText?.toLowerCase().includes('companion') || l.innerText?.toLowerCase().includes('care assistant'));
      link?.href || link?.innerText || null
    `);
    
    if (companionHref) {
      pass('Care Companion link found on profile', companionHref.substring(0, 60));
      if (companionHref.startsWith('http')) {
        await navigate(cdp, companionHref);
        await screenshot(cdp, '20b-companion-chat');
        const chatText = await pageText(cdp);
        if (chatText?.includes('Hi') || chatText?.includes('Joseph') || chatText?.includes('Type') || chatText?.includes('companion')) {
          pass('Care Companion chat page loads');
        } else { fail('Companion chat content', chatText?.substring(0, 200)); }
      }
    } else {
      // Check if companion_token exists and the card is on the profile
      const hasCompanionCard = profileText?.includes('Companion') || profileText?.includes('companion') || profileText?.includes('Care Assistant');
      if (hasCompanionCard) warn('Companion link on profile', 'Companion section visible but link not clickable');
      else fail('Care Companion', 'No companion link or section found on profile page');
    }
  }

  // ── SECTION 21: AMBIENT SCRIBE ──────────────────────────────────────────────
  console.log('\n📋 Section 21: Ambient Scribe');
  await navigate(cdp, `${BASE_URL}/home`);
  await new Promise(r => setTimeout(r, 3000));
  await injectErrorCapture(cdp);
  await screenshot(cdp, '21-dashboard-for-ambient');
  
  // Comprehensive ambient button search
  const ambientInfo = await evalJs(cdp, `
    JSON.stringify({
      allButtons: [...document.querySelectorAll('button')].map(b => ({
        text: b.innerText?.trim().substring(0,40),
        class: b.className?.substring(0,60),
        title: b.title,
        ariaLabel: b.getAttribute('aria-label')
      })).filter(b => b.text || b.title || b.ariaLabel).slice(0,30)
    })
  `);
  
  const info = JSON.parse(ambientInfo || '{}');
  const ambientBtn = info.allButtons?.find(b => 
    b.text?.toLowerCase().includes('ambient') ||
    b.class?.toLowerCase().includes('ambient') ||
    b.title?.toLowerCase().includes('ambient') ||
    b.ariaLabel?.toLowerCase().includes('ambient') ||
    b.text?.includes('🎙') || b.text?.includes('🎤') ||
    b.text?.toLowerCase().includes('scribe') ||
    b.text?.toLowerCase().includes('listen')
  );
  
  if (ambientBtn) {
    pass('Ambient button found on dashboard', `Text: "${ambientBtn.text || ambientBtn.title || ambientBtn.ariaLabel}"`);
    // Click it
    const clicked = await evalJs(cdp, `
      const btns = [...document.querySelectorAll('button')];
      const btn = btns.find(b => 
        b.innerText?.toLowerCase().includes('ambient') || 
        b.className?.toLowerCase().includes('ambient') ||
        b.title?.toLowerCase().includes('ambient') ||
        b.getAttribute('aria-label')?.toLowerCase().includes('ambient') ||
        b.innerText?.includes('🎙') || b.innerText?.includes('🎤') ||
        b.innerText?.toLowerCase().includes('scribe')
      );
      if (btn) { btn.click(); return btn.innerText?.trim() || 'clicked'; }
      return 'NOT_FOUND';
    `);
    await new Promise(r => setTimeout(r, 2000));
    await screenshot(cdp, '21b-ambient-clicked');
    const afterClick = await pageText(cdp);
    if (afterClick?.includes('consent') || afterClick?.includes('Consent') || afterClick?.includes('Record') || afterClick?.includes('microphone') || afterClick?.includes('Start listening') || afterClick?.includes('Listening')) {
      pass('Ambient consent/recording screen appears');
    } else { warn('Ambient click result', 'No consent screen: ' + afterClick?.substring(0, 200)); }
  } else {
    // Print all buttons for debugging
    const btnList = info.allButtons?.map(b => `"${b.text||b.title||b.ariaLabel}"`).join(', ') || 'none';
    fail('Ambient button on dashboard', `Buttons found: ${btnList.substring(0, 300)}`);
  }

  // ── SECTION 14b: 3-DOTS MENU ────────────────────────────────────────────────
  console.log('\n📋 Section 14b: Users 3-dots menu');
  await navigate(cdp, `${BASE_URL}/settings/users`);
  await new Promise(r => setTimeout(r, 3000));
  await screenshot(cdp, '14-users-before-dots');
  
  // Find and click the 3-dots / ellipsis button
  const dotsResult = await evalJs(cdp, `
    const btns = [...document.querySelectorAll('button')];
    const dots = btns.find(b => 
      b.innerText?.includes('···') || b.innerText?.includes('...') || b.innerText?.includes('⋯') ||
      b.className?.includes('dots') || b.className?.includes('more') || b.className?.includes('ellipsis') ||
      b.getAttribute('aria-label')?.includes('more') || b.title?.includes('more') || b.title?.includes('actions') ||
      b.innerHTML?.includes('MoreHorizontal') || b.innerHTML?.includes('more-horizontal') || b.innerHTML?.includes('ellipsis') ||
      b.querySelector('svg') && b.innerText?.trim() === ''
    );
    if (dots) { dots.click(); return dots.outerHTML?.substring(0, 100); }
    return 'NOT_FOUND';
  `);
  
  await new Promise(r => setTimeout(r, 1500));
  await screenshot(cdp, '14b-dots-clicked');
  const dotsText = await pageText(cdp);
  
  if (dotsText?.includes('Suspend') || dotsText?.includes('Deactivate') || dotsText?.includes('Reactivate') || dotsText?.includes('Edit User')) {
    pass('3-dots menu opens with Suspend/Deactivate options');
  } else {
    // Try SVG-based button click
    const svgResult = await evalJs(cdp, `
      const svgBtns = [...document.querySelectorAll('button')].filter(b => {
        const svg = b.querySelector('svg');
        const rect = b.getBoundingClientRect();
        return svg && rect.width < 50; // small icon button
      });
      if (svgBtns.length > 0) {
        svgBtns[svgBtns.length-1].click();
        return 'clicked last icon btn: ' + svgBtns.length + ' found';
      }
      return 'no icon buttons';
    `);
    await new Promise(r => setTimeout(r, 1000));
    await screenshot(cdp, '14c-svg-btn-clicked');
    const svgText = await pageText(cdp);
    if (svgText?.includes('Suspend') || svgText?.includes('Deactivate')) {
      pass('3-dots menu works via icon button');
    } else { warn('3-dots menu', `dotsResult: ${dotsResult}, svgResult: ${svgResult}`); }
  }

  // ── CHECK CONSOLE ERRORS ON KEY PAGES ──────────────────────────────────────
  console.log('\n📋 Console Error Check — Key pages');
  const pagesToCheck = [
    { name: 'Home/Dashboard', url: `${BASE_URL}/home` },
    { name: 'People', url: `${BASE_URL}/people` },
    { name: 'Settings Users', url: `${BASE_URL}/settings/users` },
  ];
  if (personId) {
    pagesToCheck.push({ name: 'eChart', url: `${BASE_URL}/people/${personId}/echart` });
    pagesToCheck.push({ name: 'Progress Notes', url: `${BASE_URL}/people/${personId}/progress-note` });
  }

  for (const pg of pagesToCheck) {
    await navigate(cdp, pg.url);
    await injectErrorCapture(cdp);
    await new Promise(r => setTimeout(r, 2000));
    const errs = await getConsoleErrors(cdp);
    if (errs && errs.trim()) {
      fail(`Console errors on ${pg.name}`, errs.substring(0, 200));
    } else {
      pass(`No console errors on ${pg.name}`);
    }
  }

  // ── FINAL SCREENSHOT OF EACH KEY SCREEN ─────────────────────────────────────
  console.log('\n📸 Final screenshot sweep...');
  const finalScreenshots = [
    { name: 'final-home', url: `${BASE_URL}/home` },
    { name: 'final-my-work', url: `${BASE_URL}/my-work` },
    { name: 'final-messages', url: `${BASE_URL}/messages` },
    { name: 'final-referrals', url: `${BASE_URL}/referrals` },
    { name: 'final-incidents', url: `${BASE_URL}/incidents` },
  ];
  for (const s of finalScreenshots) {
    await navigate(cdp, s.url);
    await screenshot(cdp, s.name);
  }

  // ── RESULTS ─────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(55));
  console.log('📊 PASS 2 RESULTS\n');
  const passed = RESULTS.filter(r => r.status.includes('PASS')).length;
  const failed = RESULTS.filter(r => r.status.includes('FAIL')).length;
  const warned = RESULTS.filter(r => r.status.includes('WARN')).length;
  console.log(`Total: ${RESULTS.length} | ✅ Pass: ${passed} | ❌ Fail: ${failed} | ⚠️  Warn: ${warned}\n`);
  RESULTS.forEach(r => console.log(`${r.status} — ${r.name}${r.note ? '\n    → ' + r.note : ''}`));
  
  const combined = { pass1: { passed: 20, failed: 0, warned: 7 }, pass2: { passed, failed, warned, tests: RESULTS, personId } };
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'results.json'), JSON.stringify(combined, null, 2));
  console.log(`\n📁 Screenshots: ${SCREENSHOT_DIR}`);
  process.exit(0);
}

runTests().catch(err => { console.error('FATAL:', err.message, err.stack); process.exit(1); });
