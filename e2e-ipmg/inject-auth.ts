/**
 * inject-auth.ts — Injects Firebase IDB auth state before page loads.
 *
 * Usage: await injectAuth(page, 'case-manager');
 * Call this BEFORE page.goto() on each test.
 */
import { type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function authStateFile(role: 'case-manager' | 'supervisor' | 'billing' | 'admin'): string {
  return path.join(__dirname, '.auth', `${role}.json`);
}

export async function injectAuth(page: Page, role: 'case-manager' | 'supervisor' | 'billing' | 'admin' = 'case-manager'): Promise<void> {
  const idbFile = path.join(__dirname, '.auth', `${role}-idb.json`);

  let idbRecords: any[] = [];
  try {
    if (fs.existsSync(idbFile)) {
      idbRecords = JSON.parse(fs.readFileSync(idbFile, 'utf8'));
    }
  } catch {
    // If file missing, proceed without injection
  }

  if (idbRecords.length === 0) return;

  // Inject auth into IndexedDB before any scripts run
  await page.addInitScript((records) => {
    // This runs in the browser BEFORE any page scripts
    function injectToIDB() {
      return new Promise<void>((resolve) => {
        const req = indexedDB.open('firebaseLocalStorageDb', 1);

        req.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
            db.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
          }
        };

        req.onsuccess = (e: any) => {
          const db = e.target.result;
          const storeNames = Array.from(db.objectStoreNames) as string[];
          if (storeNames.length === 0) { resolve(); return; }
          const storeName = storeNames[0];
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);

          for (const record of records) {
            try { store.put(record); } catch { /* ignore */ }
          }

          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        };

        req.onerror = () => resolve();
      });
    }

    // Run immediately
    injectToIDB().catch(() => {});
  }, idbRecords);
}

export async function ensureAuth(page: Page, email?: string, password?: string): Promise<void> {
  const caseManagerEmail = email || process.env.CASE_MANAGER_EMAIL || 'kathy@demo.casemanagement.ai';
  const caseManagerPw = password || process.env.CASE_MANAGER_PASSWORD || 'Demo1234!';
  const BASE = process.env.BASE_URL || 'https://app.casemanagement.ai';

  // Check if redirected to login
  await page.waitForTimeout(500);
  if (!page.url().includes('/login')) return;

  // Need fresh login
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const emailField = page.locator('input[type="email"], input[name="email"]').first();
  await emailField.waitFor({ state: 'visible', timeout: 10000 });
  await emailField.fill(caseManagerEmail);

  const pwField = page.locator('input[type="password"]').first();
  await pwField.fill(caseManagerPw);

  await page.locator('button[type="submit"]').first().click();

  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 30000 });
  await page.waitForTimeout(2500);
}
