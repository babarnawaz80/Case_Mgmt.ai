const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://casemanagement-ai.web.app';
const EXCEL_PATH = '/Users/kamal/Documents/CaseManagement.ai/test CaseManagementAI_Individual_Import.xlsx';

(async () => {
  console.log('='.repeat(60));
  console.log('  Excel Import Playwright E2E Test');
  console.log('  Testing import with admin@demo.casemanagement.ai');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('  [CONSOLE ERR] ' + msg.text());
    } else {
      console.log('  [CONSOLE] ' + msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('  [PAGE ERR] ' + err.message);
    if (err.stack) console.log(err.stack);
  });

  try {
    // 1. Log in as Admin
    console.log('\nLogging in...');
    await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', 'admin@demo.casemanagement.ai');
    await page.fill('input[type="password"]', 'Demo1234!');
    await page.click('button[type="submit"]');
    
    // Wait for auth redirect
    console.log('Waiting for authentication redirect...');
    await page.waitForURL('**/home', { timeout: 15000 });
    console.log('Login successful! Current URL:', page.url());
    
    // 2. Go to /settings/import
    console.log('\nNavigating to /settings/import...');
    await page.goto(BASE_URL + '/settings/import', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(3000);
    console.log('Arrived at settings import! URL:', page.url());
    
    // Take screenshot of step 1 (type selection)
    await page.screenshot({ path: 'import_step1_type.png', fullPage: true });
    
    // 3. Click "Continue" to go to upload step
    console.log('\nClicking "Continue" to go to upload...');
    const continueBtn = page.locator('button:has-text("Continue")');
    await continueBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'import_step2_upload.png', fullPage: true });
    
    // 4. Upload file
    console.log('\nUploading Excel file:', EXCEL_PATH);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(EXCEL_PATH);
    console.log('File uploaded. Waiting for auto-mapping step...');
    await page.waitForTimeout(5000);
    
    // Take screenshot of mapping
    await page.screenshot({ path: 'import_step3_mapping.png', fullPage: true });
    console.log('Current URL at mapping step:', page.url());
    
    // 5. Click "Review & Import"
    console.log('\nClicking "Review & Import"...');
    const reviewBtn = page.locator('button:has-text("Review & Import")');
    await reviewBtn.click();
    console.log('Waiting for duplicate checking & review page...');
    await page.waitForTimeout(6000);
    
    // Take screenshot of review page
    await page.screenshot({ path: 'import_step4_review.png', fullPage: true });
    
    // Let's print out what text is visible on the review screen
    const mainText = await page.locator('body').innerText();
    console.log('\n--- Review Screen Text (Excerpt) ---');
    console.log(mainText.substring(0, 1000));
    
    // 6. Click "Finalize Bulk Import"
    console.log('\nClicking "Finalize Bulk Import"...');
    const finalizeBtn = page.locator('button:has-text("Finalize Bulk Import")');
    if (await finalizeBtn.isVisible()) {
      await finalizeBtn.click();
      console.log('Waiting for import complete screen...');
      await page.waitForTimeout(8000);
      await page.screenshot({ path: 'import_step5_complete.png', fullPage: true });
      
      const postText = await page.locator('body').innerText();
      console.log('\n--- Complete Screen Text ---');
      console.log(postText.substring(0, 800));
    } else {
      console.error('Finalize Bulk Import button is not visible or disabled!');
    }
  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await browser.close();
    console.log('\nTest completed.');
  }
})();
