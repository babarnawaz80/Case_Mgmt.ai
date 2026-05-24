const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://casemanagement-ai.web.app';
const EXCEL_PATH = '/Users/kamal/Documents/CaseManagement.ai/test CaseManagementAI_Individual_Import.xlsx';

(async () => {
  console.log('='.repeat(60));
  console.log('  Excel Import Modal E2E Test (as Kathy Adams)');
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
    // 1. Log in as Kathy Adams
    console.log('\nLogging in as Kathy Adams...');
    await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"]', 'kathy@demo.casemanagement.ai');
    await page.fill('input[type="password"]', 'Demo1234!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to home
    console.log('Waiting for authentication redirect...');
    await page.waitForURL('**/home', { timeout: 15000 });
    console.log('Login successful! Current URL:', page.url());
    
    // 2. Go to /people
    console.log('\nNavigating to /people...');
    await page.goto(BASE_URL + '/people', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(3000);
    console.log('Arrived at /people. Current URL:', page.url());
    
    await page.screenshot({ path: 'people_page.png', fullPage: true });
    
    // 3. Click "Import" button
    console.log('\nClicking "Import" button...');
    const importBtn = page.locator('button:has-text("Import")').first();
    if (await importBtn.isVisible()) {
      await importBtn.click();
      console.log('Import button clicked! Waiting for modal...');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'import_modal_open.png', fullPage: true });
    } else {
      throw new Error('Import button is not visible on /people page!');
    }
    
    // 4. Upload file in Modal
    console.log('\nUploading Excel file in modal:', EXCEL_PATH);
    const fileInput = page.locator('div[role="dialog"] input[type="file"], input[type="file"]').first();
    await fileInput.setInputFiles(EXCEL_PATH);
    console.log('File uploaded. Waiting for auto-mapping step in modal...');
    await page.waitForTimeout(5000);
    
    // Take screenshot of mapping
    await page.screenshot({ path: 'modal_step2_mapping.png', fullPage: true });
    
    // 5. Click "Check for Duplicates" in footer
    console.log('\nClicking "Check for Duplicates" button...');
    const checkDupesBtn = page.locator('button:has-text("Check for Duplicates")');
    if (await checkDupesBtn.isVisible()) {
      await checkDupesBtn.click();
      console.log('Check for Duplicates clicked. Waiting for scanning step...');
      await page.waitForTimeout(6000);
      await page.screenshot({ path: 'modal_step3_duplicates.png', fullPage: true });
    } else {
      throw new Error('"Check for Duplicates" button is not visible!');
    }
    
    // 6. Click "Review Import Plan" in footer
    console.log('\nClicking "Review Import Plan" button...');
    const reviewBtn = page.locator('button:has-text("Review Import Plan")');
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      console.log('Review Import Plan clicked. Waiting for plan step...');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'modal_step4_review.png', fullPage: true });
    } else {
      throw new Error('"Review Import Plan" button is not visible!');
    }
    
    // Let's print out what text is visible inside the modal/body
    const mainText = await page.locator('body').innerText();
    console.log('\n--- Review Step Text (Excerpt) ---');
    console.log(mainText.substring(0, 1000));
    
    // 7. Click "Start Import" in footer
    console.log('\nClicking "Start Import" button...');
    const startImportBtn = page.locator('button:has-text("Start Import")');
    if (await startImportBtn.isVisible() && !(await startImportBtn.isDisabled())) {
      await startImportBtn.click();
      console.log('Waiting for import completion progress & success screen...');
      await page.waitForTimeout(10000);
      await page.screenshot({ path: 'modal_step5_complete.png', fullPage: true });
      
      const postText = await page.locator('body').innerText();
      console.log('\n--- Complete Step Text ---');
      console.log(postText.substring(0, 800));
    } else {
      console.error('Start Import button is not visible or disabled!');
    }
  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await browser.close();
    console.log('\nTest completed.');
  }
})();
