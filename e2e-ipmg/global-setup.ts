/**
 * global-setup.ts — Authenticates each role.
 *
 * Firebase Auth stores state in IndexedDB which Playwright storageState
 * cannot capture. After browser login, we extract the IndexedDB auth record
 * and save it to a JSON file. Tests then inject it back via addInitScript.
 */
import { test as setup } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = process.env.BASE_URL || 'https://app.casemanagement.ai';

const roles = [
  {
    email: process.env.CASE_MANAGER_EMAIL || 'kathy@demo.casemanagement.ai',
    password: process.env.CASE_MANAGER_PASSWORD || 'Demo1234!',
    stateFile: path.join(__dirname, '.auth', 'case-manager.json'),
    idbFile: path.join(__dirname, '.auth', 'case-manager-idb.json'),
    name: 'case-manager',
  },
  {
    email: process.env.SUPERVISOR_EMAIL || 'jennie@demo.casemanagement.ai',
    password: process.env.SUPERVISOR_PASSWORD || 'Demo1234!',
    stateFile: path.join(__dirname, '.auth', 'supervisor.json'),
    idbFile: path.join(__dirname, '.auth', 'supervisor-idb.json'),
    name: 'supervisor',
  },
  {
    email: process.env.BILLING_EMAIL || 'bailey@demo.casemanagement.ai',
    password: process.env.BILLING_PASSWORD || 'Demo1234!',
    stateFile: path.join(__dirname, '.auth', 'billing.json'),
    idbFile: path.join(__dirname, '.auth', 'billing-idb.json'),
    name: 'billing',
  },
  {
    email: process.env.ADMIN_EMAIL || 'admin@demo.casemanagement.ai',
    password: process.env.ADMIN_PASSWORD || 'Demo1234!',
    stateFile: path.join(__dirname, '.auth', 'admin.json'),
    idbFile: path.join(__dirname, '.auth', 'admin-idb.json'),
    name: 'admin',
  },
];

async function extractIDBAuthRecord(page: any): Promise<any> {
  return page.evaluate(() => {
    return new Promise((resolve) => {
      const req = indexedDB.open('firebaseLocalStorageDb', 1);
      req.onsuccess = (e: any) => {
        const db = e.target.result;
        const storeNames = Array.from(db.objectStoreNames);
        if (storeNames.length === 0) { resolve(null); return; }
        const storeName = storeNames[0] as string;
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const all = store.getAll();
        all.onsuccess = (e2: any) => resolve(e2.target.result);
        all.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  });
}

setup('authenticate all roles', async ({ browser }) => {
  fs.mkdirSync(path.join(__dirname, '.auth'), { recursive: true });

  for (const role of roles) {
    // Skip if both files are fresh (within 6 hours)
    if (fs.existsSync(role.idbFile) && fs.existsSync(role.stateFile)) {
      const stat = fs.statSync(role.idbFile);
      const ageHours = (Date.now() - stat.mtimeMs) / 3600000;
      if (ageHours < 6) {
        console.log(`[setup] Reusing cached auth for ${role.name}`);
        continue;
      }
    }

    console.log(`[setup] Authenticating ${role.name} (${role.email})...`);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(`${BASE}/login`);
      await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
      await page.waitForTimeout(1500);

      const emailField = page.locator('input[type="email"], input[name="email"]').first();
      await emailField.waitFor({ state: 'visible', timeout: 10000 });
      await emailField.fill(role.email);

      const pwField = page.locator('input[type="password"]').first();
      await pwField.fill(role.password);

      await page.locator('button[type="submit"]').first().click();

      await page.waitForURL(url => !url.href.includes('/login'), { timeout: 15000 });
      await page.waitForTimeout(4000); // Wait for Firebase to fully initialize

      // Extract IndexedDB auth state
      const idbRecords = await extractIDBAuthRecord(page);
      if (idbRecords && idbRecords.length > 0) {
        fs.writeFileSync(role.idbFile, JSON.stringify(idbRecords, null, 2));
        console.log(`[setup] ✓ ${role.name} IDB auth saved (${idbRecords.length} records)`);
      } else {
        console.warn(`[setup] ✗ No IDB records found for ${role.name}`);
      }

      // Also save storageState (has Firestore client state)
      await context.storageState({ path: role.stateFile });
      console.log(`[setup] ✓ ${role.name} storageState saved`);

    } catch (err) {
      console.warn(`[setup] ✗ ${role.name} auth failed: ${err}`);
      fs.writeFileSync(role.stateFile, JSON.stringify({ cookies: [], origins: [] }));
      fs.writeFileSync(role.idbFile, JSON.stringify([]));
    } finally {
      await context.close();
    }
  }
});
