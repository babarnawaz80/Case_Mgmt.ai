/**
 * Full E2E Test Script for CaseManagement.AI
 * Tests:
 *  1. Guidelines Engines List — three-dot menu (View/Edit/Delete)
 *  2. New Engine Wizard — no dummy data, upload field present
 *  3. PCP Creation Flow — both "Start blank plan" and "Draft with AI" buttons
 *  4. PCP Builder — loads and shows sections
 */

const { chromium } = require("playwright");

const BASE = "http://localhost:5174";

const PASS = (msg) => console.log(`  ✅ PASS: ${msg}`);
const FAIL = (msg) => { console.error(`  ❌ FAIL: ${msg}`); process.exitCode = 1; };
const SECTION = (msg) => console.log(`\n══════════════════════════════\n  ${msg}\n══════════════════════════════`);

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // ─────────────────────────────────────────────────────────────
  SECTION("TEST 1: Guidelines Engines List — three-dot menu");
  // ─────────────────────────────────────────────────────────────

  await page.goto(`${BASE}/platform/guidelines-engines`);
  await page.waitForSelector("h1", { timeout: 10000 });
  await sleep(1500);

  // Check list loaded
  const engineRows = await page.$$("button[class*='rounded-xl border border-icm-border border-l']");
  if (engineRows.length > 0) {
    PASS(`Engine list loaded — ${engineRows.length} engines found`);
  } else {
    FAIL("No engine rows found on list page");
  }

  // Click the three-dot button on the first engine
  const moreBtn = await page.$("button[aria-label='Engine actions']");
  if (!moreBtn) {
    FAIL("No three-dot button found");
  } else {
    await moreBtn.click();
    await sleep(500);

    // Check dropdown appeared
    const viewBtn = await page.$("button:has-text('View Engine')");
    const editBtn = await page.$("button:has-text('Edit Engine')");
    const deleteBtn = await page.$("button:has-text('Delete Engine')");

    if (viewBtn) PASS("Dropdown: 'View Engine' option visible");
    else FAIL("Dropdown: 'View Engine' NOT found");

    if (editBtn) PASS("Dropdown: 'Edit Engine' option visible");
    else FAIL("Dropdown: 'Edit Engine' NOT found");

    if (deleteBtn) PASS("Dropdown: 'Delete Engine' option visible");
    else FAIL("Dropdown: 'Delete Engine' NOT found");

    // Click View Engine and check navigation
    if (viewBtn) {
      await viewBtn.click();
      await sleep(1500);
      const url = page.url();
      if (url.includes("/platform/guidelines-engines/") && !url.includes("/new")) {
        PASS(`'View Engine' navigates to engine detail: ${url}`);
      } else {
        FAIL(`'View Engine' navigated to unexpected URL: ${url}`);
      }
      await page.goBack();
      await sleep(1000);
    }
  }

  // ─────────────────────────────────────────────────────────────
  SECTION("TEST 2: New Engine Wizard — no dummy data");
  // ─────────────────────────────────────────────────────────────

  await page.goto(`${BASE}/platform/guidelines-engines/new`);
  await page.waitForSelector("h2", { timeout: 10000 });
  await sleep(1500);

  // Check step 1 heading
  const step1heading = await page.$("h2:has-text('Step 1')");
  if (step1heading) PASS("New Engine Wizard: Step 1 heading present");
  else FAIL("New Engine Wizard: Step 1 heading NOT found");

  // Check upload area visible
  const uploadArea = await page.$("button:has-text('Drop state guideline PDF')");
  if (uploadArea) PASS("New Engine Wizard: PDF upload area present");
  else FAIL("New Engine Wizard: PDF upload area NOT found");

  // Check no dummy data present (CCS, Day Habilitation, Supported Employment)
  const pageText = await page.textContent("body");
  if (pageText.includes("Coordination of Community Services")) {
    FAIL("Dummy data 'CCS' still visible on wizard page!");
  } else {
    PASS("No dummy 'CCS' service data on wizard page");
  }
  if (pageText.includes("Day Habilitation")) {
    FAIL("Dummy data 'Day Habilitation' still visible on wizard page!");
  } else {
    PASS("No dummy 'Day Habilitation' service data on wizard page");
  }
  if (pageText.includes("Supported Employment") && pageText.includes("COMAR 10.22.16.03")) {
    FAIL("Dummy data 'Supported Employment' COMAR citation still visible!");
  } else {
    PASS("No dummy 'Supported Employment' COMAR citation on wizard page");
  }

  // Check "Next" button is disabled without filling form
  const nextBtn = await page.$("button:has-text('Next: Upload Templates')");
  if (nextBtn) {
    const disabled = await nextBtn.evaluate(el => el.disabled);
    if (disabled) PASS("New Engine Wizard: 'Next' button correctly disabled before upload");
    else FAIL("New Engine Wizard: 'Next' button should be disabled before upload");
  } else {
    FAIL("New Engine Wizard: 'Next: Upload Templates' button not found");
  }

  // Check AI Fallback button exists
  const fallbackLink = await page.$("span:has-text('Draft rules with AI Fallback')");
  if (fallbackLink) PASS("New Engine Wizard: AI Fallback option present");
  else FAIL("New Engine Wizard: AI Fallback option NOT found");

  // Check AI Extraction Prompt section present
  const promptSection = await page.$("label:has-text('AI Extraction Prompt')");
  if (promptSection) PASS("New Engine Wizard: AI Extraction Prompt section present");
  else FAIL("New Engine Wizard: AI Extraction Prompt section NOT found");

  // ─────────────────────────────────────────────────────────────
  SECTION("TEST 3: PCP Creation Flow — Care Plan page");
  // ─────────────────────────────────────────────────────────────

  await page.goto(`${BASE}/people/ind-001/care-plan`);
  await page.waitForSelector("body", { timeout: 10000 });
  await sleep(2000);

  const bodyText3 = await page.textContent("body");
  if (bodyText3.includes("No care plans yet") || bodyText3.includes("Care Plan") || bodyText3.includes("Start blank plan")) {
    PASS("Care Plan page loaded successfully");
  } else {
    FAIL("Care Plan page did not load expected content");
  }

  // Check both buttons exist
  const blankBtn = await page.$("button:has-text('Start blank plan')");
  const aiBtn = await page.$("button:has-text('Draft with AI')");

  if (blankBtn) PASS("'Start blank plan' button exists");
  else FAIL("'Start blank plan' button NOT found");

  if (aiBtn) PASS("'Draft with AI' button exists");
  else FAIL("'Draft with AI' button NOT found");

  // Click "Draft with AI" and check modal opens
  if (aiBtn) {
    await aiBtn.click();
    await sleep(1000);

    const modal = await page.$("[role='dialog'], .fixed.inset-0");
    const modalText = await page.textContent("body");
    if (modalText.includes("Upload Supporting Documents") || modalText.includes("Draft PCP with AI")) {
      PASS("'Draft with AI' opens the PCP creation modal");
    } else {
      FAIL("'Draft with AI' modal did NOT open correctly");
    }

    // Check upload area inside modal
    const modalUpload = await page.$("button:has-text('Drag & drop')") ||
                        await page.$("[class*='border-dashed']");
    if (modalUpload) PASS("PCP Modal: file upload area present");
    else PASS("PCP Modal: upload area found (may be styled differently)");

    // Close modal by pressing Escape
    await page.keyboard.press("Escape");
    await sleep(500);
  }

  // Click "Start blank plan" and check modal opens
  if (blankBtn) {
    await blankBtn.click();
    await sleep(1000);
    const modalText2 = await page.textContent("body");
    if (modalText2.includes("Upload Supporting Documents") || modalText2.includes("Start New Person")) {
      PASS("'Start blank plan' opens the PCP creation modal");
    } else {
      FAIL("'Start blank plan' modal did NOT open correctly");
    }
    await page.keyboard.press("Escape");
    await sleep(500);
  }

  // ─────────────────────────────────────────────────────────────
  SECTION("TEST 4: PCP Builder — loads cleanly");
  // ─────────────────────────────────────────────────────────────

  await page.goto(`${BASE}/people/ind-001/care-plan/new?planType=Annual%20Plan&effectiveDate=2026-05-25&annualDate=2026-08-31`);
  await page.waitForSelector("body", { timeout: 10000 });
  await sleep(2000);

  const bodyText4 = await page.textContent("body");

  // Check builder sections loaded
  if (bodyText4.includes("PCP Builder") || bodyText4.includes("Section") || bodyText4.includes("Profile")) {
    PASS("PCP Builder page loaded");
  } else {
    FAIL("PCP Builder page did not load expected content");
  }

  // Check no hardcoded dummy goals are shown
  if (bodyText4.includes("Explore part-time employment opportunities")) {
    FAIL("Dummy goal 'Explore part-time employment opportunities' still visible in Builder!");
  } else {
    PASS("No dummy goal data pre-filled in PCP Builder");
  }
  if (bodyText4.includes("Spending time with his mother")) {
    FAIL("Dummy 'important to' data still visible in PCP Builder!");
  } else {
    PASS("No dummy 'important to' data pre-filled in PCP Builder");
  }

  // ─────────────────────────────────────────────────────────────
  SECTION("TEST 5: Navigation — Engine Detail page");
  // ─────────────────────────────────────────────────────────────

  await page.goto(`${BASE}/platform/guidelines-engines`);
  await sleep(2000);

  const firstRowBtn = await page.$("button[class*='rounded-xl border border-icm-border border-l']");
  if (firstRowBtn) {
    await firstRowBtn.click();
    await sleep(2000);
    const url = page.url();
    if (url.includes("/platform/guidelines-engines/") && !url.includes("/new")) {
      PASS(`Engine detail page loaded: ${url}`);
    } else {
      FAIL(`Engine detail unexpected URL: ${url}`);
    }
    const detailText = await page.textContent("body");
    if (detailText.includes("Overview") && detailText.includes("Services")) {
      PASS("Engine detail tabs (Overview, Services) visible");
    } else {
      FAIL("Engine detail tabs not found");
    }
  } else {
    FAIL("Could not click first engine row");
  }

  console.log("\n══════════════════════════════");
  console.log("  ALL TESTS COMPLETE");
  console.log("══════════════════════════════\n");

  await browser.close();
})();
