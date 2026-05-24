const { chromium } = require('playwright');
const BASE_URL = 'https://casemanagement-ai.web.app';
const EXCEL_PATH = '/Users/kamal/Documents/CaseManagement.ai/test CaseManagementAI_Individual_Import.xlsx';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('Logging in as Kathy Adams...');
    await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', 'kathy@demo.casemanagement.ai');
    await page.fill('input[type="password"]', 'Demo1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/home');
    
    console.log('Navigating to /people...');
    await page.goto(BASE_URL + '/people', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    console.log('Opening import modal...');
    await page.click('button:has-text("Import")');
    await page.waitForTimeout(2000);
    
    console.log('Uploading file...');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(EXCEL_PATH);
    await page.waitForTimeout(5000);
    
    console.log('\n--- Step 2: Mapping Text ---');
    const mappingText = await page.locator('.backdrop-blur-sm').first().innerText();
    console.log(mappingText);
    
    console.log('\nClicking "Check for Duplicates"...');
    await page.click('button:has-text("Check for Duplicates")');
    
    // Wait and check if duplicate checking completes
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(2000);
      console.log(`\n--- Step 3: Duplicates Checking Status (Wait ${i * 2 + 2}s) ---`);
      const dupeText = await page.locator('.backdrop-blur-sm').first().innerText();
      console.log(dupeText.substring(0, 500));
      if (dupeText.includes("Duplicates found") || dupeText.includes("conflict") || dupeText.includes("Plan")) {
        console.log('Duplicate check complete!');
        break;
      }
    }
    
    console.log('\nClicking "Review Import Plan"...');
    await page.click('button:has-text("Review Import Plan")');
    await page.waitForTimeout(3000);
    
    console.log('\n--- Step 4: Review Text ---');
    const reviewText = await page.locator('.backdrop-blur-sm').first().innerText();
    console.log(reviewText);
    
    console.log('\nChecking footer buttons...');
    const footerButtons = await page.locator('button').allInnerTexts();
    console.log('All visible buttons on page:', footerButtons);
    
  } catch (err) {
    console.error('Error during modal text inspection:', err);
  } finally {
    await browser.close();
  }
})();
