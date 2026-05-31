import { test } from '@playwright/test';
import * as fs from 'fs';
import { injectAuth, ensureAuth } from '../../inject-auth';

const ROUTES = ['/login', '/home', '/dashboard', '/people', '/my-work', '/people/ind-001/echart'];

test('capture React-is-not-defined stack', async ({ page }) => {
  const hits: string[] = [];
  page.on('pageerror', (err) => hits.push(`PAGEERROR: ${err.message}\nSTACK:\n${err.stack}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') hits.push(`CONSOLE.ERROR: ${msg.text()}`);
  });

  await injectAuth(page, 'admin');
  for (const r of ROUTES) {
    await page.goto(r, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await ensureAuth(page).catch(() => {});
    const body = await page.evaluate(() => document.body.innerText).catch(() => '');
    const crashed = body.includes('Something went wrong') || body.includes('React is not defined');
    console.log(`ROUTE ${r}: ${crashed ? 'CRASHED' : 'ok'} | url=${page.url()}`);
    if (crashed) {
      hits.push(`CRASHED AT ROUTE ${r}`);
      break;
    }
  }

  const report = hits.length ? hits.join('\n---\n') : 'NONE CAPTURED';
  fs.writeFileSync('/tmp/react-diag.txt', report);
  console.log('\n===== CAPTURED =====\n' + report);
});
