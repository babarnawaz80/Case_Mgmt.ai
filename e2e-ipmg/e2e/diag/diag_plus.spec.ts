import { test } from '@playwright/test';
import { injectAuth, ensureAuth } from '../../inject-auth';

test('diagnose + individual picker on home', async ({ page }) => {
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(e.message));
  await injectAuth(page, 'case-manager');
  await page.goto('/home');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(4000);
  await ensureAuth(page);
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
    const log: any = {};
    const plus = [...document.querySelectorAll('button')].find(b => b.className.startsWith('p-2 rounded-lg hover:bg-secondary') && b.querySelector('.lucide-plus'));
    log.plusFound = !!plus;
    plus?.click();
    await new Promise(r => setTimeout(r, 500));
    const menu = [...document.querySelectorAll('div.absolute')].find(d => /Pick an individual/i.test(d.textContent || ''));
    log.menuOpened = !!menu;
    const rows = menu ? [...menu.querySelectorAll('button')].filter(b => b.querySelector('.font-medium.truncate')) : [];
    log.individualRowCount = rows.length;
    log.firstNames = rows.slice(0, 3).map(b => b.querySelector('.font-medium.truncate')!.textContent!.trim());
    // Click first individual
    rows[0]?.click();
    await new Promise(r => setTimeout(r, 600));
    // Did selection register? look for the chip text near the + button
    const chipSpan = [...document.querySelectorAll('span')].find(s => /bg-primary\/10/.test(s.className) && s.querySelector('button[aria-label*="emove"], svg'));
    log.menuClosedAfterClick = !/Pick an individual/i.test(document.body.innerText);
    log.chipText = chipSpan?.textContent?.trim().replace(/\s+/g, ' ') || null;
    // also check Ambient/Scribe became enabled (they enable when selectedIndividualId set)
    const ambientBtn = [...document.querySelectorAll('button')].find(b => /Ambient/.test(b.textContent || ''));
    log.ambientDisabled = ambientBtn ? (ambientBtn as HTMLButtonElement).disabled : null;
    return log;
  });

  console.log('PLUS DIAG: ' + JSON.stringify(result, null, 2));
  console.log('PAGEERRORS: ' + (errs.join(' | ') || 'none'));
});
